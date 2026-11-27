/* ============ BAVARIA · SUDS (tren de captación de aguas lluvias hacia el humedal de fitodepuración) Y CICLORRUTAS (con la propuesta) ============
   crearBavariaRed({ T3 }) → api (singleton window.KEN_BAV_RED):
     preparar() → Promise  carga data3d/bavaria_red_urbana.json (tools/bavaria_red_datos.mjs) y arma todo ESCONDIDO; idempotente
     poner(sem) / apagar()  muestra o esconde en la semana simulada
     info()                 { listo, años, ciclo: { km, kmTotal, ciclistas }, suds: { km, kmTotal, aImpHa, captadoM3Anio, captadoAcumM3, … }, supuestos }
     obras()                [{ id, n, x, z, radio }] para el zoom de la pestaña Estrategias (SUDS y ciclorrutas)
   QUÉ ES (decisión de la autora, 2026-11-26: SIN jardines de lluvia):
   · SUDS de Bavaria = biofiltros y zanjas de infiltración (franja vegetal hundida con cauce al centro) a lo largo de las calles y alamedas del
     plan parcial (Decreto Distrital 448 de 2023; ejes sacados de data3d/plan_bavaria.json), que conducen el agua por gravedad, en el sentido de las
     flechas, hasta la entrada del humedal artificial de fitodepuración de 6 celdas (data3d/humedal_bavaria3d.js). En el fondo: juncos (Juncus effusus)
     y cipéreas (Cyperus); a un lado, árboles nativos jóvenes que crecen con los años. Nada de buchón; adentro del humedal: eneas, juncos y lenteja de agua.
   · CICLORRUTAS = carril bidireccional segregado (verde azulado, borde blanco, eje discontinuo) al lado opuesto del biofiltro, sobre los mismos ejes,
     con ciclistas animados (escala de maqueta ×3). No hay datos de ciclorrutas existentes en el repositorio: el empalme con la red de la ciudad queda por definir.
   · CALENDARIO: cada tramo aparece al empezar el año de obra de su calle en el plan (años 1–10); los árboles y las plantas crecen desde entonces.
   · VOLUMEN (todo [SUP] salvo la geometría): V = C · P · A_imp(t) · η · fase; C = 0,85 (superficie dura), P = 800 mm/año, η = 80 % (primer lavado captado),
     A_imp = huellas de edificios + calzadas + andenes del plan construidos hasta el año t (alamedas y parques permeables); fase = humedal con agua (años 3–4).
     Tope: capacidad del humedal (0,51 ha de agua libre × 0,5 m + 0,51 ha de lecho × 0,6 m × 0,4 = 3.800 m³ con TRH de 4 d → 347.000 m³/año). */
const sat = (v) => Math.max(0, Math.min(1, v));
const SUP = { C: 0.85, P: 0.8, eta: 0.8, capacidad: 347000, ancho: { ciclo: 5.2, bio: 4.4 }, escCiclista: 3 };
const hs = (a) => { const h = Math.sin(a * 91.345 + 7.1) * 43758.5453; return h - Math.floor(h); };
const YR = 1.12;
export function crearBavariaRed({ T3 }) {
  if (window.KEN_BAV_RED) return window.KEN_BAV_RED;
  const THREE = T3.THREE, lw = T3.lw, cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const G = new THREE.Group(); G.name = 'bavaria_red'; G.visible = false; T3.scene.add(G);
  let D = null, listo = false, visible = false, pendiente = null, prom = null, sem = 0, años = 0, raf = 0, ultCre = -9;
  const UT = { value: 0 }, UA = { value: 0 }, UF = { value: 1 };
  const O = new THREE.Object3D();
  const L = (c) => c.map(v => Math.pow(v, 2.2));
  let TR = { plantas: [], arboles: [], bio: [], ciclo: [], total: { ciclo: 0, bio: 0 } }, ciclistas = [], mP1 = null, mP2 = null, imTr = null, imCo = null, imBici = null, kmA = null;

  /* ---------- trazos: del eje (modelo) al mundo, con desplazamiento lateral ---------- */
  const aMundo = (P, off) => { const W = P.map(p => lw(p[0], p[1]));
    return P.map((p, i) => { const a = W[Math.max(0, i - 1)], b = W[Math.min(W.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const o = off(p); return [W[i][0] - tz * o, W[i][1] + tx * o, p[3], p[2]]; }); }; // izquierda del sentido de la polilínea; [x, z, año, mitadAncho]
  const largoDe = (Q) => { let s = 0; for (let i = 1; i < Q.length; i++) s += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); return s; };
  function cinta(trazos, ancho) { // trazos: [[x, z, año]]; atributos aD = (distancia a lo largo, lado −1..1, año)
    let nv = 0; for (const Q of trazos) nv += Q.length * 2;
    const P = new Float32Array(nv * 3), A = new Float32Array(nv * 3), I = []; let o = 0;
    for (const Q of trazos) { let s = 0; const b = o;
      for (let i = 0; i < Q.length; i++) { const a = Q[Math.max(0, i - 1)], c = Q[Math.min(Q.length - 1, i + 1)]; let tx = c[0] - a[0], tz = c[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        if (i) s += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
        for (const lado of [-1, 1]) { P.set([Q[i][0] - tz * lado * ancho / 2, YR, Q[i][1] + tx * lado * ancho / 2], o * 3); A.set([s, lado, Q[i][2]], o * 3); o++; }
        if (i) { const k = b + (i - 1) * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aD', new THREE.BufferAttribute(A, 3)); g.setIndex(I); return g; }
  const VS = 'attribute vec3 aD; varying vec3 vD; varying vec3 vW; void main(){ vD = aD; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const PRE = 'uniform float uA, uT, uF; varying vec3 vD; varying vec3 vW; vec3 L(vec3 c){ return pow(c, vec3(2.2)); } float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }';
  const mat = (fs) => new THREE.ShaderMaterial({ uniforms: { uA: UA, uT: UT, uF: UF }, vertexShader: VS, fragmentShader: PRE + fs, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -16 });
  const matCiclo = mat(`void main(){ if (vD.z - 1.0 > uA) discard; float v = abs(vD.y);
    vec3 base = L(vec3(0.10, 0.62, 0.54)) * (0.92 + 0.12 * h2(floor(vW.xz * 2.0)));
    float borde = smoothstep(0.80, 0.86, v) * (1.0 - smoothstep(0.96, 1.0, v));
    float eje = step(0.5, fract(vD.x / 4.0)) * (1.0 - smoothstep(0.05, 0.1, v));
    vec3 c = mix(base, L(vec3(0.97, 0.98, 0.95)), clamp(borde + eje * 0.85, 0.0, 1.0));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`);
  const matBio = mat(`void main(){ if (vD.z - 1.0 > uA) discard; float v = abs(vD.y);
    vec3 pasto = L(vec3(0.27, 0.46, 0.2)) * (0.9 + 0.2 * h2(floor(vW.xz * 2.5))), tierra = L(vec3(0.23, 0.18, 0.12)), agua = L(vec3(0.14, 0.45, 0.62));
    vec3 c = mix(pasto, tierra, smoothstep(0.86, 0.66, v));
    float cauce = 1.0 - smoothstep(0.22, 0.34, v);
    float brillo = 0.5 + 0.5 * sin(vD.x * 0.9 - uT * 2.6);
    c = mix(c, mix(agua, L(vec3(0.62, 0.88, 0.96)), brillo * 0.55), cauce * uF);
    float p = fract(vD.x / 7.0 - uT * 0.22 + v * 0.22); float chev = (1.0 - smoothstep(0.0, 0.05, abs(p - 0.5))) * smoothstep(0.9, 0.55, v) * uF;
    c = mix(c, L(vec3(0.82, 0.96, 0.98)), chev * 0.75);
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`);

  /* ---------- plantas del biofiltro (juncos y cipéreas) y árboles ---------- */
  function geoJuncus() { const P = [], C = []; for (let b = 0; b < 16; b++) { const a = b / 16 * 6.283 + (b % 3) * 0.5, r = 0.04 + (b % 4) * 0.035, h = 0.7 + ((b * 29) % 10) / 10 * 0.6, inc = 0.18 + ((b * 7) % 5) / 5 * 0.25, w = 0.02;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, tx = bx + Math.cos(a) * h * inc, tz = bz + Math.sin(a) * h * inc, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      P.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz); C.push(0.16, 0.3, 0.14, 0.16, 0.3, 0.14, 0.3 + (b % 3) * 0.04, 0.5, 0.26); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }
  function geoCyperus() { const P = [], C = []; for (let s = 0; s < 6; s++) { const a0 = s * 1.05, bx = Math.cos(a0) * 0.1, bz = Math.sin(a0) * 0.1, h = 1.0 + (s % 3) * 0.25, w = 0.018; // tallos con sombrilla de hojas
      const tx = bx, tz = bz; P.push(bx - w, 0, bz, bx + w, 0, bz, tx, h, tz); C.push(0.2, 0.36, 0.16, 0.2, 0.36, 0.16, 0.34, 0.54, 0.22);
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + s, lx = tx + Math.cos(a) * 0.5, lz = tz + Math.sin(a) * 0.5, px = -Math.sin(a) * 0.012, pz = Math.cos(a) * 0.012; P.push(tx - px, h, tz - pz, tx + px, h, tz + pz, lx, h - 0.28, lz); C.push(0.3, 0.5, 0.2, 0.3, 0.5, 0.2, 0.42, 0.6, 0.26); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }
  const gTr = new THREE.CylinderGeometry(0.1, 0.16, 1, 5).translate(0, 0.5, 0), gCo = new THREE.IcosahedronGeometry(1, 1);

  /* ---------- ciclista (bici + persona) en escala de maqueta ---------- */
  function geoBici() { const parts = [];
    const add = (g, c) => { const gg = g.index ? g.toNonIndexed() : g, n = gg.attributes.position.count, col = new Float32Array(n * 3); const cc = new THREE.Color(c).convertSRGBToLinear(); for (let i = 0; i < n; i++) col.set([cc.r, cc.g, cc.b], i * 3); gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.deleteAttribute('uv'); parts.push(gg); };
    add(new THREE.TorusGeometry(0.33, 0.035, 5, 14).translate(0.62, 0.35, 0), '#1c1c1f'); add(new THREE.TorusGeometry(0.33, 0.035, 5, 14).translate(-0.62, 0.35, 0), '#1c1c1f');
    add(new THREE.BoxGeometry(1.1, 0.05, 0.05).rotateZ(0.12).translate(0.0, 0.6, 0), '#8892a0'); add(new THREE.BoxGeometry(0.05, 0.5, 0.05).translate(0.45, 0.62, 0).rotateZ(0), '#8892a0');
    add(new THREE.BoxGeometry(0.3, 0.05, 0.05).translate(0.52, 0.9, 0), '#222'); add(new THREE.BoxGeometry(0.25, 0.04, 0.12).translate(-0.4, 0.92, 0), '#222');
    add(new THREE.CapsuleGeometry(0.15, 0.42, 3, 6).rotateZ(-1.0).translate(0.0, 1.22, 0), '#ffffff'); add(new THREE.SphereGeometry(0.14, 7, 6).translate(0.34, 1.5, 0), '#e9c9a6'); add(new THREE.SphereGeometry(0.155, 7, 5, 0, 6.283, 0, 1.4).translate(0.34, 1.55, 0), '#f2f2ee');
    add(new THREE.CapsuleGeometry(0.06, 0.4, 2, 5).rotateZ(-0.5).translate(0.12, 0.78, 0.1), '#2b3a55'); add(new THREE.CapsuleGeometry(0.06, 0.4, 2, 5).rotateZ(0.5).translate(0.05, 0.78, -0.1), '#2b3a55');
    let n = 0; for (const g of parts) n += g.attributes.position.count; const P = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of parts) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }

  /* ---------- construcción ---------- */
  function construir() {
    const bio = [], ciclo = [], tubo = [];
    for (const l of D.suds) bio.push(aMundo(l, (p) => -Math.min(16, Math.max(0, p[2] - 1.0))));
    for (const l of D.ciclo) ciclo.push(aMundo(l, (p) => Math.min(16, Math.max(0, p[2] - 2.0))));
    { const e = D.entradaEsqueleto, a = lw(e[0], e[1]), b = lw(D.entrada[0], D.entrada[1]); const raiz = D.suds.map(l => l[l.length - 1]).sort((p, q) => Math.hypot(p[0] - e[0], p[1] - e[1]) - Math.hypot(q[0] - e[0], q[1] - e[1]))[0] || [e[0], e[1], 0, 3];
      tubo.push([[a[0], a[1], raiz[3]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, raiz[3]], [b[0], b[1], raiz[3]]]); } // tramo final hacia la entrada del humedal
    TR.bio = bio; TR.ciclo = ciclo; TR.total.bio = bio.reduce((s, q) => s + largoDe(q), 0) / 1000 + largoDe(tubo[0]) / 1000; TR.total.ciclo = ciclo.reduce((s, q) => s + largoDe(q), 0) / 1000;
    const mC = new THREE.Mesh(cinta(ciclo.map(q => q.map(p => [p[0], p[1], p[2]])), SUP.ancho.ciclo), matCiclo), mB = new THREE.Mesh(cinta(bio.concat(tubo).map(q => q.map(p => [p[0], p[1], p[2]])), SUP.ancho.bio), matBio);
    for (const m of [mC, mB]) { m.frustumCulled = false; m.renderOrder = 3; G.add(m); } mC.name = 'bav_ciclorruta'; mB.name = 'bav_biofiltro';
    /* plantas y árboles a lo largo de los biofiltros: se camina cada polilínea a paso fijo */
    const J = [], C = [], A = []; let k = 0;
    const caminar = (Q, paso, ini, fn) => { let dist = ini, acc = 0; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
        while (dist <= acc + l) { const f = (dist - acc) / l; fn(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, tx, tz, Math.min(a[2], b[2])); dist += paso(); } acc += l; } };
    for (const Q of bio) {
      caminar(Q, () => 2.3, 0.5, (px, pz, tx, tz, an) => { for (const lado of [-0.75, 0.75]) { if (hs(k++) < 0.22) continue; const j = (hs(k * 1.7) - 0.5) * 0.5; (hs(k * 0.31) < 0.55 ? J : C).push(px - tz * (lado + j), pz + tx * (lado + j), an, 0.8 + 0.6 * hs(k * 2.9), hs(k * 5.3) * 6.283); } });
      caminar(Q, () => 15 + hs(k++ * 1.3) * 6, 8 + hs(k) * 6, (px, pz, tx, tz, an) => { const o = -(SUP.ancho.bio / 2 + 2.2 + hs(k++) * 1.4); A.push(px - tz * o, pz + tx * o, an, 5.5 + hs(k * 3.3) * 3.5, hs(k * 7.1)); }); }
    TR.plantas = { J: new Float32Array(J), C: new Float32Array(C) }; TR.arboles = new Float32Array(A);
    const matP = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
    mP1 = new THREE.InstancedMesh(geoJuncus(), matP, TR.plantas.J.length / 5); mP2 = new THREE.InstancedMesh(geoCyperus(), matP, TR.plantas.C.length / 5);
    imTr = new THREE.InstancedMesh(gTr, new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.9 }), TR.arboles.length / 5);
    imCo = new THREE.InstancedMesh(gCo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }), TR.arboles.length / 5);
    const VERDES = ['#4f7a35', '#5d8a3c', '#43702f', '#6a9440', '#7da04a'], cc = new THREE.Color();
    for (let i = 0; i < TR.arboles.length / 5; i++) imCo.setColorAt(i, cc.set(VERDES[Math.floor(TR.arboles[i * 5 + 4] * 5) % 5]));
    for (const m of [mP1, mP2, imTr, imCo]) { m.count = 0; m.frustumCulled = false; G.add(m); }
    /* ciclistas: sobre los tramos más largos del carril (ida y vuelta), la cantidad crece con los km construidos */
    imBici = new THREE.InstancedMesh(geoBici(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 }), 18); imBici.count = 0; imBici.frustumCulled = false; G.add(imBici);
    const TINTES = ['#ffffff', '#ffd27a', '#c9f27a', '#a69bff', '#ffb199', '#8fe3d8'];
    const largos = ciclo.map((q, i) => [i, largoDe(q)]).filter(x => x[1] > 70).sort((p, q) => q[1] - p[1]).slice(0, 18);
    ciclistas = largos.map(([i, l], n) => { const Q = ciclo[i], cum = [0]; for (let j = 1; j < Q.length; j++) cum.push(cum[j - 1] + Math.hypot(Q[j][0] - Q[j - 1][0], Q[j][1] - Q[j - 1][1]));
      imBici.setColorAt(n, cc.set(TINTES[n % TINTES.length])); return { Q, cum, l, v: 4.2 + hs(n * 3.1) * 2.6, ph: hs(n * 1.7) * 2 * l, an: Math.min(...Q.map(p => p[2])) }; });
    // km acumulados por año (del JSON) para la lista de «cuántos ciclistas»
    kmA = D.kmCicloAcum;
  }
  const puntoEn = (c, s) => { const Q = c.Q, cum = c.cum; let j = 1; while (j < cum.length - 1 && cum[j] < s) j++; const f = (s - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1), a = Q[j - 1], b = Q[j]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(-(b[1] - a[1]), b[0] - a[0])]; };
  function moverBicis(t) { if (!imBici) return; let n = 0; const vis = ciclistas.filter(c => años >= c.an - 0.5);
    const cuantos = Math.min(vis.length, Math.round(vis.length * sat(((kmA ? kmA[Math.min(10, Math.ceil(años))] || 0 : 0)) / Math.max(1, D.kmCiclo) * 1.3)));
    for (const c of vis) { if (n >= cuantos) break; const per = 2 * c.l, s0 = (t * c.v + c.ph) % per, s = s0 < c.l ? s0 : per - s0, [x, z, ang] = puntoEn(c, s); const rev = s0 >= c.l;
      O.position.set(x, YR + 0.02, z); O.rotation.set(0, ang + (rev ? Math.PI : 0), 0); O.scale.setScalar(SUP.escCiclista); O.updateMatrix(); imBici.setMatrixAt(n, O.matrix); n++; }
    imBici.count = n; imBici.instanceMatrix.needsUpdate = true; }
  function crecer(forzar) { if (!forzar && Math.abs(años - ultCre) < 0.04) return; ultCre = años;
    const llenar = (m, Lst, f) => { let n = 0; for (let i = 0; i < Lst.length; i += 5) { const g = sat((años - (Lst[i + 2] - 1) - 0.2) / 1.2); if (g <= 0.02) continue; f(Lst, i, g, n++); } m.count = n; m.instanceMatrix.needsUpdate = true; return n; };
    for (const [m, Lst] of [[mP1, TR.plantas.J], [mP2, TR.plantas.C]]) llenar(m, Lst, (a, i, g, n) => { O.position.set(a[i], YR, a[i + 1]); O.rotation.set(0, a[i + 4], 0); O.scale.setScalar(a[i + 3] * g * 1.2); O.updateMatrix(); m.setMatrixAt(n, O.matrix); });
    let nt = 0; const A = TR.arboles; for (let i = 0; i < A.length; i += 5) { const g = sat((años - (A[i + 2] - 1) - 0.5) / 4.5); if (g <= 0.02) continue; const h = A[i + 3] * (0.25 + 0.75 * g);
      O.position.set(A[i], YR, A[i + 1]); O.rotation.set(0, A[i + 4] * 6.283, 0); O.scale.set(1, h * 0.55, 1); O.updateMatrix(); imTr.setMatrixAt(nt, O.matrix);
      O.position.set(A[i], YR + h * 0.62, A[i + 1]); O.scale.set(h * 0.38, h * 0.34, h * 0.38); O.updateMatrix(); imCo.setMatrixAt(nt, O.matrix); nt++; }
    imTr.count = imCo.count = nt; imTr.instanceMatrix.needsUpdate = imCo.instanceMatrix.needsUpdate = true; if (imCo.instanceColor) imCo.instanceColor.needsUpdate = true; }

  function preparar() { if (prom) return prom;
    prom = cargar('data3d/bavaria_red_urbana.json?v=1').then(j => { D = j; construir(); listo = true; if (pendiente != null) { const s = pendiente; pendiente = null; api.poner(s); } return api; }).catch(e => { console.warn('SUDS y ciclorrutas de Bavaria:', e); prom = null; throw e; });
    return prom; }
  function aplicar() { años = sem / 52; G.visible = visible && años >= 0.5; UA.value = años; UF.value = 1; crecer(false); if (G.visible && !raf) raf = requestAnimationFrame(cuadro); }
  const T0 = performance.now();
  function cuadro() { raf = 0; if (!visible || !G.visible) return; raf = requestAnimationFrame(cuadro); const t = (performance.now() - T0) / 1000; UT.value = t; const cp = T3.camera.position; if (cp.y < 900) moverBicis(t); else if (imBici) imBici.count = 0; }

  /* ---------- cifras ---------- */
  const aImp = (t) => { const I = D.impAcum, a = Math.floor(t); return t <= 0 ? 0 : t >= 10 ? (I[10] || 0) : (I[a] || 0) + ((I[a + 1] || 0) - (I[a] || 0)) * (t - a); };
  const tasa = (t) => Math.min(SUP.capacidad, SUP.C * SUP.P * aImp(t) * SUP.eta * sat(t - 3)); // m³/año
  function cifras() { if (!D) return null; const t = años; let acum = 0; for (let u = 0; u < t; u += 0.05) acum += tasa(u) * Math.min(0.05, t - u);
    const km = (kmAcum) => kmAcum[Math.min(10, Math.max(0, Math.ceil(t)))] || 0;
    return { aImpHa: Math.round(aImp(t) / 100) / 100, aImpTotalHa: Math.round(D.impAcum[10] / 100) / 100, escorrentiaM3Anio: Math.round(SUP.C * SUP.P * aImp(t)), captadoM3Anio: Math.round(tasa(t)), captadoAcumM3: Math.round(acum), capacidadM3Anio: SUP.capacidad,
      captadoM3AnioFinal: Math.round(tasa(10)), kmSuds: km(D.kmSudsAcum), kmSudsTotal: D.kmSuds, kmCiclo: km(D.kmCicloAcum), kmCicloTotal: D.kmCiclo, supuestos: { ...SUP } }; }
  const centro = (Ls) => { let x = 0, z = 0, n = 0; for (const Q of Ls) for (const p of Q) { x += p[0]; z += p[1]; n++; } return n ? [x / n, z / n] : [0, 0]; };
  const api = window.KEN_BAV_RED = {
    grupo: G, preparar, SUP,
    poner(s) { sem = s || 0; visible = true; if (!listo) { pendiente = sem; preparar().catch(() => {}); return; } aplicar(); },
    apagar() { visible = false; pendiente = null; G.visible = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    años: () => años,
    muestra: () => { const q = TR.ciclo.slice().sort((a, b) => largoDe(b) - largoDe(a))[0]; const p = q[Math.floor(q.length / 2)]; return { x: p[0], z: p[1] }; },
    tasaEn: (t) => (D ? tasa(t) : 0), kmAcum: (y) => (D ? D.kmCicloAcum[Math.min(10, y)] : 0),
    obras() { if (!listo) return []; const c = centro(TR.ciclo), r = Math.round(Math.max(...TR.ciclo.flat().map(p => Math.hypot(p[0] - c[0], p[1] - c[1]))));
      return [{ id: 'ciclo_bavaria', n: 'Ciclorrutas de Bavaria', x: c[0], z: c[1], radio: Math.min(900, r + 20) }, { id: 'suds_bavaria', n: 'SUDS de Bavaria: biofiltros hacia el humedal', x: c[0], z: c[1], radio: Math.min(900, r + 20) }]; },
    info() { const c = cifras(); return { listo, visible: visible && G.visible, años: Math.round(años * 100) / 100, ciclistas: imBici ? imBici.count : 0, plantas: (mP1 ? mP1.count : 0) + (mP2 ? mP2.count : 0), arboles: imTr ? imTr.count : 0, ...(c || {}) }; },
    cifras
  };
  return api;
}
