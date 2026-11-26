/* ============ SIMULACIÓN 01 CON PROPUESTA EN 3D (docs/sim01_abastecimiento_v3.md y v4, correcciones de la autora 2026-11-26) ============
   window.KEN_PROP01 = { poner(I), apagar(), info() } — lo llama sim_ui.js una vez por semana simulada (ponerCapaPar) solo en la 01 con propuesta.
   · CORABASTOS AL 50 %: se esconde el modelo 'corabastos' y quedan las 19 naves más lejanas a La Vaca (las 18 más cercanas, quitadas01 de
     abasto_capas.js, se quitan). Con la capa Bodegas prendida las que quedan se ven de vidrio (abasto_capas.js); apagada, volúmenes grises de 9 m.
   · HUMEDAL LA VACA AMPLIADO CON ECOTONO (v4: «quedó horrible»): el terreno liberado (dentro del predio de Corabastos y fuera de la
     envolvente de las naves que quedan) se vuelve un humedal de orilla irregular. Un campo de distancias decide cada franja:
       D = distancia (m) a lo que sigue construido (envolvente de las naves que quedan + 8 m) o al borde del predio hacia la ciudad; hacia La Vaca
       el borde es blando (D = distancia al borde + 85 m: allí la orilla es de juncos y el agua se une con el humedal existente).
       A D se le suma ruido de dos escalas (±12 m y ±5 m) para que la orilla sea natural, con penínsulas, bahías e islotes.
     Franjas (año 5): 0–5 m sendero · 5–42 m BARRERA DE ÁRBOLES nativos (dosel junto a Corabastos, medianos al centro, arbustos de flor hacia el
     humedal) · 42–78 m pradera húmeda · 78–100 m juncos y eneas (3D) · > 100 m espejo de agua (somero en la orilla, más hondo al centro).
     [SUP: anchos de franja y calendario] Año 0–1: obra (tierra). Años 1–5: el agua crece desde el centro (D > 170 m → D > 100 m), la pradera y los
     juncos verdean; los árboles se siembran entre los años 1 y 2,5 y llegan a adultos en 3,5 años más (la primera fila, junto a Corabastos, 25 % más alta). Nunca hay árboles en el agua ni en los juncos.
     La malla de Google se recorta en todo el terreno liberado (uHoyo* en index.html), así no asoman sus bodegas.
   · HUERTAS DE PARQUE (las «efímeras» de data3d/huertas_barrio.js, window.KEN_HBAR) se abren de a poco entre los años 0,5 y 6, cada una con su
     pulso de luz verde (data3d/resaltes.js); y los PARCHES DE ÁRBOLES NATIVOS de los parques (window.KEN_PARCHES) se siembran entre los años 1 y 4.
   · BLANCO Y NEGRO: data3d/gris01.js (lo llama sim_ui.js en los dos escenarios de la 01). */
import { quitadas01 } from './abasto_capas.js?v=2';
import { crearParches3D, ESPECIES } from './parches_arboles.js?v=10';
import { hoyo01 } from './gris01.js?v=1';

const AN = { sendero: 5, barrera: 42, pradera: 78, agua: 100, agua1: 170 }; // franjas en metros de D (año 5) y agua del año 1
const YP = 1.0; // altura del humedal: por encima del recorte de la malla de Google (0,9 m)
export function crearPropuesta01({ T3 }) {
  if (window.KEN_PROP01) return window.KEN_PROP01;
  const THREE = T3.THREE, lw = T3.lw, cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const G = new THREE.Group(); G.name = 'prop01'; G.visible = false; T3.scene.add(G);
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const O = new THREE.Object3D(); let listo = false, activo = false, sem = 0, arb = null, arbP = null, campo = null, hum = null, junc = null;
  const S = { quedan: [], quitadas: [] }, AREA = {};
  const mNave = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xbfc2c4 }), 40);
  mNave.frustumCulled = false; mNave.count = 0; G.add(mNave);

  /* ---------- ruido determinista (el mismo en el campo y al poner árboles) ---------- */
  const hs = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const a = hs(ix, iz), b = hs(ix + 1, iz), c = hs(ix, iz + 1), d = hs(ix + 1, iz + 1); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; };
  const fbm = (x, z) => 0.55 * vn(x, z) + 0.3 * vn(x * 2.03 + 17, z * 2.03 + 5) + 0.15 * vn(x * 4.1 + 3, z * 4.1 + 31);

  /* ---------- geometría: naves, envolvente de las que quedan, borde del predio ---------- */
  const rect = (n, m) => { const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)), ux = e[0] - cx, uz = e[1] - cz, vx = -uz, vz = ux, L2 = n.L / 2 + m, W2 = n.W / 2 + m;
    return [[-L2, -W2], [L2, -W2], [L2, W2], [-L2, W2]].map(([u, v]) => [cx + u * ux + v * vx, cz + u * uz + v * vz]); };
  const envolvente = (P) => { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of P.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const dseg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
  const dpoly = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length; i++) d = Math.min(d, dseg(x, z, P[i], P[(i + 1) % P.length])); return d; };

  /* campo D (m, con ruido) en una rejilla de 2 m en coordenadas del mundo; textura R = D, G = dentro del terreno liberado */
  function armarCampo(C, vaca) {
    const naves = C.naves || [], q = new Set(quitadas01(naves)), PO = C.poly.map(p => lw(p[0], p[1])), V = vaca ? vaca.map(p => lw(p[0], p[1])) : [];
    naves.forEach((n, i) => { const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)), ux = e[0] - cx, uz = e[1] - cz;
      (q.has(i) ? S.quitadas : S.quedan).push({ i, cx, cz, th: Math.atan2(-uz, ux), L: n.L, W: n.W }); });
    const H = envolvente(naves.filter((n, i) => !q.has(i)).flatMap(n => rect(n, 8)));
    const segs = PO.map((a, i) => ({ a, b: PO[(i + 1) % PO.length] })).map(s => ({ ...s, vaca: V.length > 2 && dpoly(V, s.a[0], s.a[1]) < 80 && dpoly(V, s.b[0], s.b[1]) < 80 }));
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of PO) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const CEL = 2, M = 6; x0 -= M; z0 -= M; const NX = Math.ceil((x1 + M - x0) / CEL), NZ = Math.ceil((z1 + M - z0) / CEL), dat = new Uint8Array(NX * NZ * 4), Dv = new Float32Array(NX * NZ).fill(-1);
    const Dcalc = (x, z) => { const dr = dpoly(H, x, z); let dc = 1e9, dv = 1e9; for (const s of segs) { const d = dseg(x, z, s.a, s.b); if (s.vaca) dv = Math.min(dv, d); else dc = Math.min(dc, d); }
      return Math.min(dr, dc, dv + 85) + (fbm(x / 70, z / 70) - 0.5) * 24 + (fbm(x / 22 + 40, z / 22) - 0.5) * 10; };
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = x0 + (i + 0.5) * CEL, z = z0 + (j + 0.5) * CEL, k = j * NX + i;
      const ins = dentro(PO, x, z) && !dentro(H, x, z); const D = ins ? Math.max(0, Dcalc(x, z)) : 0; if (ins) Dv[k] = D;
      dat[k * 4] = Math.min(255, Math.round(D)); dat[k * 4 + 1] = ins ? 255 : 0; dat[k * 4 + 2] = 0; dat[k * 4 + 3] = 255; }
    const tex = new THREE.DataTexture(dat, NX, NZ, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const Dat = (x, z) => { const i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : Dv[j * NX + i]; };
    // áreas de cada franja en el año 5 (ha) para los indicadores
    let a = { sendero: 0, barrera: 0, pradera: 0, juncos: 0, agua: 0 }; for (const D of Dv) { if (D < 0) continue; const c = CEL * CEL / 1e4; if (D < AN.sendero) a.sendero += c; else if (D < AN.barrera) a.barrera += c; else if (D < AN.pradera) a.pradera += c; else if (D < AN.agua) a.juncos += c; else a.agua += c; }
    Object.assign(AREA, a); AREA.total = a.sendero + a.barrera + a.pradera + a.juncos + a.agua;
    return { tex, PO, H, box: [x0, z0, NX * CEL, NZ * CEL], D: Dat, x0, z0, x1: x0 + NX * CEL, z1: z0 + NZ * CEL };
  }

  /* ---------- texturas pintadas (pradera húmeda y juncos) ---------- */
  let sd = 2026; const rnd = () => ((sd = Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const lienzo = (f) => { const S2 = 256, cv = document.createElement('canvas'); cv.width = cv.height = S2; f(cv.getContext('2d'), S2); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const texPra = lienzo((g, S2) => { g.fillStyle = '#5b7a34'; g.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 40; i++) { const x = rnd() * S2, y = rnd() * S2, r = 10 + rnd() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < 0.5 ? 'rgba(58,78,32,.5)' : 'rgba(126,140,64,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const C = ['#5d7c33', '#6e8a3a', '#47632a', '#7f9447', '#8f9158', '#6a8a3c', '#53722e'];
    for (let i = 0; i < 9000; i++) { const x = rnd() * S2, y = rnd() * S2, l = 1 + rnd() * 3.5, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9; g.strokeStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.5 + rnd() * 0.5; g.lineWidth = 0.6 + rnd() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.8; g.fillStyle = ['#e9e2b8', '#f2d24a', '#d9d3e8'][i % 3]; g.beginPath(); g.arc(rnd() * S2, rnd() * S2, 0.9, 0, 7); g.fill(); } g.globalAlpha = 1; });
  const texJun = lienzo((g, S2) => { g.fillStyle = '#5d6a34'; g.fillRect(0, 0, S2, S2);
    const C = ['#7d8a3e', '#8f8a4a', '#a39a5a', '#5f7a2e', '#6d7f35', '#b5a76a', '#4e6328'];
    for (let i = 0; i < 4200; i++) { const x = rnd() * S2, y = rnd() * S2, l = 3 + rnd() * 7, a = -Math.PI / 2 + (rnd() - 0.5) * 0.5; g.strokeStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.6 + rnd() * 0.4; g.lineWidth = 0.8 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.globalAlpha = 1; });
  const nrm = new THREE.TextureLoader().load('data3d/waternormals.jpg'); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;

  /* ---------- el humedal: un plano con un sombreador que pinta las franjas a partir del campo ---------- */
  const U = { uF: { value: null }, uBox: { value: new THREE.Vector4() }, uT: { value: 0 }, uWt: { value: 999 }, uJt: { value: 999 }, uG: { value: 0 }, uNrm: { value: nrm }, uPra: { value: texPra }, uJun: { value: texJun }, uSol: { value: new THREE.Vector3(0.55, 0.7, 0.45).normalize() } };
  const matH = new THREE.ShaderMaterial({ uniforms: U, toneMapped: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D uF, uNrm, uPra, uJun; uniform vec4 uBox; uniform float uT, uWt, uJt, uG; uniform vec3 uSol; varying vec3 vW;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
      vec3 L(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec2 uv = (vW.xz - uBox.xy) * uBox.zw; vec4 f = texture2D(uF, uv);
        if (f.g < 0.3 + 0.4 * h2(floor(vW.xz * 1.5))) discard; // borde del terreno liberado: se deshace en puntos (sin raya recta)
        float d = f.r * 255.0 + (vn(vW.xz * 0.35) - 0.5) * 3.0;
        vec3 pra = mix(texture2D(uPra, vW.xz / 7.0).rgb, texture2D(uPra, vW.xz / 29.0 + 0.3).rgb, 0.45);
        vec3 jun = mix(texture2D(uJun, vW.xz / 5.0).rgb, texture2D(uJun, vW.xz / 17.0).rgb, 0.4);
        float nz = vn(vW.xz * 0.08);
        vec3 tierra = L(vec3(0.40, 0.33, 0.24)) * (0.8 + 0.4 * vn(vW.xz * 0.5));
        vec3 sendero = L(vec3(0.70, 0.65, 0.55)) * (0.9 + 0.2 * vn(vW.xz * 1.3));
        vec3 hoja = pra * vec3(0.42, 0.5, 0.38) * (0.8 + 0.35 * nz); // bajo la barrera de árboles: sombra y hojarasca
        vec3 c = mix(sendero, mix(tierra, hoja, uG), smoothstep(${(AN.sendero - 1.5).toFixed(1)}, ${(AN.sendero + 1.5).toFixed(1)}, d));
        float mata = smoothstep(0.55, 0.8, vn(vW.xz * 0.21)); // matas de pasto alto (más oscuras) y claros secos en la pradera
        c = mix(c, mix(tierra, pra * (0.92 + 0.2 * nz) * mix(vec3(1.0), vec3(0.72, 0.8, 0.62), mata) * mix(vec3(1.0), vec3(1.12, 1.08, 0.86), smoothstep(0.6, 0.85, vn(vW.xz * 0.05 + 7.0))), uG), smoothstep(${(AN.barrera - 6).toFixed(1)}, ${(AN.barrera + 4).toFixed(1)}, d));
        c = mix(c, mix(tierra * 0.85, jun, uG), smoothstep(uJt - 4.0, uJt + 3.0, d));
        c *= 1.0 - 0.35 * smoothstep(uWt - 7.0, uWt, d); // suelo mojado junto al agua
        float a = smoothstep(uWt - 1.0, uWt + 1.5, d);
        if (a > 0.0) {
          float hondo = smoothstep(0.0, 45.0, d - uWt);
          vec2 q1 = vW.xz / 21.0 + vec2(uT * 0.011, uT * 0.006), q2 = vW.xz / 8.0 - vec2(uT * 0.017, -uT * 0.012);
          vec3 n1 = texture2D(uNrm, q1).rgb * 2.0 - 1.0, n2 = texture2D(uNrm, q2).rgb * 2.0 - 1.0;
          vec3 N = normalize(vec3((n1.x + n2.x) * 0.09, 1.0, (n1.y + n2.y) * 0.09));
          vec3 V = normalize(cameraPosition - vW);
          float fr = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 base = mix(L(vec3(0.27, 0.36, 0.25)), L(vec3(0.10, 0.27, 0.25)), hondo); // somero (fondo con limo) → hondo (verde azulado)
          vec3 cielo = L(vec3(0.66, 0.76, 0.82));
          float sp = pow(max(dot(reflect(-V, N), uSol), 0.0), 180.0);
          vec3 w = mix(base, cielo, clamp(fr * 0.85, 0.0, 0.6)) + vec3(1.0, 0.97, 0.9) * sp * 1.4;
          w = mix(w, L(vec3(0.24, 0.32, 0.18)), (1.0 - smoothstep(0.0, 3.5, d - uWt)) * 0.55); // orilla verde con algas
          c = mix(c, w, a);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` });

  /* ---------- juncos y eneas en 3D (franja de juncos del año 5 y orilla hacia La Vaca) ---------- */
  function geoJunco() { const P = [], Cc = [], NB = 9;
    for (let b = 0; b < NB; b++) { const a = b / NB * 6.283 + (b % 3) * 0.7, r = 0.12 + (b % 4) * 0.06, h = 1.1 + ((b * 37) % 10) / 10 * 0.9, inc = 0.12 + ((b * 13) % 7) / 7 * 0.22, w = 0.035;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, tx = bx + Math.cos(a) * h * inc, tz = bz + Math.sin(a) * h * inc, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      P.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz); const c0 = [0.25, 0.33, 0.12], c1 = b % 3 === 0 ? [0.62, 0.56, 0.32] : [0.45, 0.52, 0.22]; Cc.push(...c0, ...c0, ...c1);
      if (b % 4 === 1) { const hx = bx + Math.cos(a) * h * inc * 0.8, hz = bz + Math.sin(a) * h * inc * 0.8, y1 = h * 0.72, y2 = h * 0.88, e = 0.05; // espiga de enea
        P.push(hx - e, y1, hz, hx + e, y1, hz, hx, y2, hz, hx, y1, hz - e, hx, y1, hz + e, hx, y2, hz); for (let k = 0; k < 6; k++) Cc.push(0.3, 0.18, 0.09); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.computeVertexNormals(); return g; }
  function armarJuncos() { const L = [], R = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let x = campo.x0; x < campo.x1; x += 2.3) for (let z = campo.z0; z < campo.z1; z += 2.3) { const px = x + (R() - 0.5) * 2, pz = z + (R() - 0.5) * 2, D = campo.D(px, pz);
      if (D < AN.pradera - 3 || D > AN.agua + 4) continue; if (R() < 0.25) continue; L.push([px, pz, D]); }
    const m = new THREE.InstancedMesh(geoJunco(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }), L.length);
    m.frustumCulled = false; m.castShadow = false; G.add(m); m.userData.L = L; m.count = 0; return m; }
  function crecerJuncos(g) { if (!junc) return; const L = junc.userData.L; let n = 0;
    for (const [x, z, D] of L) { const k = hs(x * 0.37, z * 0.71); if (k > g * 1.15) continue; const e = Math.min(1, (g * 1.15 - k) * 3) * (0.75 + 0.5 * hs(z, x)) * (D > AN.agua ? 0.8 : 1);
      O.position.set(x, YP, z); O.rotation.set(0, k * 6.283, 0); O.scale.set(e * 1.4, e, e * 1.4); O.updateMatrix(); junc.setMatrixAt(n++, O.matrix); }
    junc.count = n; junc.instanceMatrix.needsUpdate = true; }

  /* ---------- árboles: barrera densa entre Corabastos y el humedal + algunos sueltos en la pradera ---------- */
  function arbolesHumedal() { const R = (() => { let s = 2611; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), A = [];
    const can = ['caucho', 'aliso', 'aliso', 'caucho', 'sauco'], med = ['sauco', 'chicala', 'arrayan', 'aliso'], arb2 = ['chilco', 'tibar', 'raque', 'mortino', 'chilco'];
    for (let x = campo.x0; x < campo.x1; x += 4.3) for (let z = campo.z0; z < campo.z1; z += 4.3) { const px = x + (R() - 0.5) * 3.2, pz = z + (R() - 0.5) * 3.2, D = campo.D(px, pz);
      let L = null; if (D >= AN.sendero + 1.5 && D < AN.barrera - 3) { if (R() < 0.08) continue; L = D < 17 ? can : D < 31 ? (R() < 0.3 ? can : med) : arb2; }
      else if (D >= AN.barrera && D < AN.pradera - 10 && R() < 0.06) L = med; // sueltos en la pradera húmeda
      if (!L) continue; const sp = L[Math.floor(R() * L.length)]; A.push({ x: px, z: pz, sp, h: ESPECIES[sp].alto * (0.8 + R() * 0.35) * (D < 17 ? 1.25 : 1), rot: R() * 6.283 }); } // la primera fila (junto a Corabastos), más alta
    // en parches de ~60 m (nombre y centro para la red; marcas de lejos apagadas)
    const P = {}; for (const t of A) { const k = Math.floor(t.x / 60) + ',' + Math.floor(t.z / 60); (P[k] = P[k] || { n: 'Barrera del humedal La Vaca', c: [t.x, t.z], arboles: [] }).arboles.push(t); }
    return Object.values(P); }

  Promise.all([cargar('data3d/corabastos.json'), cargar('data3d/water_bodies.json').catch(() => [])]).then(([D, WB]) => {
    const vaca = (WB || []).filter(w => /vaca/i.test(w.nombre || '')).sort((a, b) => b.pts.length - a.pts.length)[0];
    campo = armarCampo(D, vaca ? vaca.pts : null);
    U.uF.value = campo.tex; U.uBox.value.set(campo.box[0], campo.box[1], 1 / campo.box[2], 1 / campo.box[3]);
    hum = new THREE.Mesh(new THREE.PlaneGeometry(campo.box[2], campo.box[3]).rotateX(-Math.PI / 2).translate(campo.box[0] + campo.box[2] / 2, YP, campo.box[1] + campo.box[3] / 2), matH);
    hum.frustumCulled = false; hum.renderOrder = 2; G.add(hum);
    junc = armarJuncos(); arbP = arbolesHumedal(); AREA.arboles = arbP.reduce((a, p) => a + p.arboles.length, 0); AREA.juncos3d = junc.userData.L.length;
    listo = true; if (activo) armar();
  }).catch(e => console.warn('propuesta 01:', e));

  const T0 = performance.now(); let raf = 0;
  const animar = () => { raf = activo ? requestAnimationFrame(animar) : 0; U.uT.value = (performance.now() - T0) / 1000; };
  function armar() {
    const y = y0(); let k = 0;
    for (const N of S.quedan) { O.position.set(N.cx, y, N.cz); O.rotation.set(0, N.th, 0); O.scale.set(N.L, 9, N.W); O.updateMatrix(); mNave.setMatrixAt(k++, O.matrix); } mNave.count = k; mNave.instanceMatrix.needsUpdate = true;
    if (!arb && arbP && arbP.length) { arb = 'cargando'; crearParches3D({ T3, P: arbP, fijo: true }).then(A => { arb = A; A.grupo.name = 'prop01_arboles'; A.grupo.position.y = YP - y0() - 0.05; A.grupo.traverse(o => { if (o.isPoints) o.visible = false; }); A.ver(activo); crecer(true); }).catch(e => { arb = null; console.warn('árboles propuesta 01:', e); }); }
    hoyo(true); crecer(true);
  }
  /* malla de Google recortada en el terreno liberado (index.html: uHoyoOn/uHoyoTex/uHoyoBox); edificios y vías del modelo: data3d/gris01.js */
  function hoyo(on) { const M = T3.maskU; if (!M || !M.uHoyoTex) return; if (on && campo) { M.uHoyoTex.value = campo.tex; M.uHoyoBox.value.set(campo.box[0], campo.box[1], 1 / campo.box[2], 1 / campo.box[3]); M.uHoyoOn.value = 1; } else M.uHoyoOn.value = 0;
    hoyo01(T3, on && campo ? campo.PO : null, campo ? campo.H : null); /* y los edificios y vías del modelo (data3d/gris01.js) */ }
  /* calendario [SUP]: año 0–1 obra; agua D > 170 → 100 m entre los años 1 y 5; pradera y juncos verdean en los años 0,8–4; árboles sembrados en
     los años 1–2,5 (según su clave k), 3,5 años hasta adultos; huertas de parque abren entre los años 0,5 y 6; parches de parques sembrados en los años 1–4 */
  let ultArb = -1, ultHB = -1, hbAntes = null, parAntes = null;
  const sat = (v) => Math.max(0, Math.min(1, v));
  function crecer(forzar) {
    const años = sem / 52, ga = sat((años - 1) / 4), gv = sat((años - 0.8) / 3.2);
    U.uWt.value = años < 1 ? 999 : AN.agua1 + (AN.agua - AN.agua1) * (ga * (2 - ga)); // el agua sube rápido al principio y se asienta
    U.uJt.value = AN.pradera; U.uG.value = gv; crecerJuncos(gv);
    const edadArb = (kk) => { const t = años - (1 + kk * 1.5); return t <= 0 ? 0 : Math.min(1, 0.35 + 0.65 * t / 3.5); };
    if (arb && arb !== 'cargando' && (forzar || Math.abs(años - ultArb) > 0.07)) { ultArb = años; arb.edad(edadArb); }
    // huertas de parque (efímeras) que se abren con un pulso verde
    const HB = window.KEN_HBAR; if (HB && HB.fraccion) { if (!hbAntes) hbAntes = { vis: HB.grupo.visible }; HB.ver(true); const f = sat((años - 0.5) / 5.5); if (forzar || Math.abs(f - ultHB) > 0.004) { ultHB = f; HB.fraccion(f); } }
    // parches de árboles nativos de los parques (los de la propuesta base)
    const KP = window.KEN_PARCHES; if (KP && KP.edad) { if (!parAntes) parAntes = { vis: KP.grupo.visible }; KP.ver(true); if (forzar || Math.abs(años - (KP._p01 || -9)) > 0.07) { KP._p01 = años; KP.edad((kk) => { const t = años - (1 + kk * 3); return t <= 0 ? 0 : Math.min(1, 0.2 + 0.8 * t / 5); }); } }
  }
  const api = window.KEN_PROP01 = {
    grupo: G,
    poner(I) { if (!I) return api.apagar(); sem = I.sem || 0; const nuevo = !activo; activo = true; G.visible = true; if (!raf) animar();
      const og = T3.scene.getObjectByName('corabastos'); if (og) og.visible = false; if (window.KEN_PCORA && window.KEN_PCORA.ver) window.KEN_PCORA.ver(false);
      mNave.visible = !(window.KEN_AB01C && window.KEN_AB01C.estado && window.KEN_AB01C.estado.bodegas);
      if (arb && arb !== 'cargando') arb.ver(true);
      if (listo) { if (nuevo) armar(); else crecer(false); } },
    apagar() { if (!activo) return; activo = false; G.visible = false; hoyo(false); if (arb && arb !== 'cargando') arb.ver(false);
      const og = T3.scene.getObjectByName('corabastos'); if (og) og.visible = true;
      const HB = window.KEN_HBAR; if (HB && hbAntes) { HB.fraccion(1); HB.ver(hbAntes.vis); hbAntes = null; ultHB = -1; }
      const KP = window.KEN_PARCHES; if (KP && parAntes) { KP.edad(null); KP._p01 = null; KP.ver(parAntes.vis); parAntes = null; } },
    /* áreas del humedal ampliado (ha, franjas del año 5) y árboles: para los indicadores del modelo (verde, conectividad) */
    areas() { const años = sem / 52, ga = sat((años - 1) / 4); return { ...AREA, aguaHoy: años < 1 ? 0 : null, crecimiento: ga }; },
    info() { return { activo, listo, quedan: S.quedan.length, quitadas: S.quitadas.length, areas: { ...AREA }, arbolesBarrera: arbP ? arbP.reduce((a, p) => a + p.arboles.length, 0) : 0, juncos: junc ? junc.count : 0, uWt: U.uWt.value, uG: U.uG.value,
      huertas: window.KEN_HBAR ? !!window.KEN_HBAR.grupo.visible : null, parches: window.KEN_PARCHES ? { vis: window.KEN_PARCHES.grupo.visible, n: window.KEN_PARCHES.n } : null, hoyo: T3.maskU && T3.maskU.uHoyoOn ? T3.maskU.uHoyoOn.value : null }; }
  };
  return api;
}
