/* ============ BASURA ACUMULADA Y RATAS (Corabastos, Plaza de las Flores, barrios y bordes de humedal) ============
   window.KEN_BASURA = { poner(datos), ver(on), puntosBase(totalTDia) }
   poner({ puntos: [{ x, z, t_dia, fuente, acumulada, acumulada0, sinRecoger_t_dia, nombre }], total_t_dia, acumulada, ratas, ratas0 })
   · puntos en coordenadas de MUNDO. fuente: 'corabastos' | 'flores' | 'vivienda' | 'humedal' (u otra). acumulada = toneladas sin recoger
     en ese punto (si falta: la acumulada total repartida según t_dia, o t_dia × 7).
   · CADA PUNTO ES UN MONTÓN cuyo tamaño sale de sus toneladas acumuladas A: radio = 1,1·A^0,6 m, alto = 1,2 + 0,22·√A m (tope 14 m; exagerado
     para que se lea desde la vista alta de 2 km: 180 t → 49 m de ancho y 4 m de alto; 1.000 t → 138 m y 8 m), con una mancha café oscura de lixiviado (2× el radio) que
     se extiende con él, bolsas encima (1,5 bolsas por tonelada; tope 8000: pasado el tope las bolsas crecen) y ratas que corretean
     alrededor (ratas × 150, tope 1500). Corabastos se reparte en 5 montones en sus patios abiertos; los puntos de barrio y la Plaza de
     las Flores se corren a la calle más cercana de la red (los puntos críticos están en las esquinas, no sobre los techos).
   · ETIQUETAS de vidrio (HTML, sans) sobre Corabastos, la Plaza de las Flores y cada borde de humedal, con las cifras de la semana
     («Corabastos · 100 t/día · 8.560 t sin recoger», «Borde Humedal El Burro · 5,8 t/día arrojadas»); se achican y se desvanecen con la
     distancia y quedan por debajo de los paneles (z-index bajo).
   · transiciones suaves (1,2 s de tiempo real) de semana a semana: radios, alturas, manchas, cantidad de bolsas y ratas y cifras.
   RENDIMIENTO: una tabla de montones (textura 128×3) que el sombreador de vértices lee: bolsas, montones, manchas y ratas se ubican en la
   GPU. poner() solo escribe la tabla (aunque llegue 30 veces en un cuadro); por cuadro: 4 uniformes + la posición de ≤ 8 etiquetas.
   Las ratas se mueven con el tiempo de animación del reloj universal (RELOJ.tAnim: se detienen en pausa).
   Grupo de la escena 'basura' (las ratas en el hijo 'ratas'): KEN_FOCO.on('basura') lo deja en color.
   Plaza de las Flores (puntosBase): polígono OSM «Las Flores» (way 319611996, amenity=marketplace, 4,6340 N −74,1566 O), centro en el
   modelo (6714, 2552), al nororiente del predio de Corabastos. */

export const PLAZA_FLORES = [6714, 2552];          // coordenadas del MODELO (T3.lw las pasa al mundo)
// patios, calles internas y muelles de carga de Corabastos, fuera de las naves (data3d/corabastos.json; coordenadas del modelo)
const CORA = [[6620, 2420], [5900, 2240], [6220, 2510], [6700, 2050], [6110, 1990]];
const VIV = [[5790, 2620], [6150, 2700], [5720, 2080], [6920, 1880], [7020, 2640], [6480, 2700]]; // manzanas alrededor (puntosBase)
const MAXB = 8000, MAXR = 1500, MAXS = 128, POR_T = 1.5, RATAS_BASE = 150, DUR = 1.2, D0 = 160;
const COLORES = [0x7a776f, 0x8a7458, 0x6a5a48, 0x6f7c58, 0x5f6b4c, 0x2e2f31, 0xa9a598, 0x847b62, 0x55504a, 0xa8b2b6, 0xcfc8b6, 0x6d8a9a, 0x9b9a6a];
const radio = (A) => Math.min(170, 1.1 * Math.pow(Math.max(0, A), 0.6)), alto = (A) => A > 0 ? Math.min(14, 1.2 + 0.22 * Math.sqrt(A)) : 0;
const fmt = (v) => (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)).toLocaleString('es-CO');

export function crearBasura({ T3, RELOJ }) {
  const THREE = T3.THREE;
  let G = null, GR = null, U = null, tex = null, TX = null, bolsas = null, ratas = null, montones = null, manchas = null;
  let mix = 1, vis = 1, visMeta = 1, claveLay = '', nS = 0, sitios = [], etq = [], caja = null, VG = null;
  const est = { puntos: [], total_t_dia: 0, acumulada: 0, ratas: 0, ratas0: 0, bolsas: 0, nRatas: 0, montones: 0 };
  const rnd = (RELOJ && RELOJ.azar) ? RELOJ.azar('basura') : Math.random;
  const v3 = { x: 0, y: 0, z: 0 };

  function puntosBase(total = 300) {
    const L = [], lw = T3.lw, f = total / 300;
    L.push({ x: lw(6380, 2170)[0], z: lw(6380, 2170)[1], t_dia: 100 * f, acumulada: 900 * f, fuente: 'corabastos' });
    { const [x, z] = lw(PLAZA_FLORES[0], PLAZA_FLORES[1]); L.push({ x, z, t_dia: 5 * f, acumulada: 45 * f, fuente: 'flores' }); }
    VIV.forEach(([x, y]) => { const [wx, wz] = lw(x, y); L.push({ x: wx, z: wz, t_dia: 30 * f, acumulada: 250 * f, fuente: 'vivienda' }); });
    return L;
  }

  /* ---------- calles para correr los puntos de barrio a la esquina más cercana ---------- */
  function rejillaVias() {
    if (VG || !T3.net) return VG; const C = 50, M = new Map(), lw = T3.lw;
    for (const e of T3.net.edges) { if (e[0] === 'major') continue; for (const p of e[1]) { const [x, z] = lw(p[0], p[1]), k = Math.floor(x / C) * 100003 + Math.floor(z / C); let L = M.get(k); if (!L) M.set(k, L = []); L.push(x, z); } }
    return (VG = { C, M });
  }
  function aCalle(x, z, out) {
    const R = rejillaVias(); out[0] = x; out[1] = z; if (!R) return;
    const i0 = Math.floor(x / R.C), j0 = Math.floor(z / R.C); let bd = 220 * 220;
    for (let i = i0 - 4; i <= i0 + 4; i++) for (let j = j0 - 4; j <= j0 + 4; j++) { const L = R.M.get(i * 100003 + j); if (!L) continue;
      for (let k = 0; k < L.length; k += 2) { const d = (L[k] - x) ** 2 + (L[k + 1] - z) ** 2; if (d < bd) { bd = d; out[0] = L[k]; out[1] = L[k + 1]; } } }
  }

  /* ---------- geometrías ---------- */
  function unirColor(partes) {
    let n = 0; for (const g of partes) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of partes) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('color', new THREE.BufferAttribute(C, 3)); r.computeVertexNormals(); return r;
  }
  function geoRata() {
    const partes = [], col = (g, c) => { g = g.index ? g.toNonIndexed() : g; const C = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal'); partes.push(g); };
    const m = (g, p, r, s) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
    const CU = '#2f2d2b', VI = '#3b3835', RO = '#7a625d';
    col(m(new THREE.SphereGeometry(1, 7, 5), [0, 0.055, 0], [0, 0, 0.05], [0.12, 0.05, 0.058]), CU);
    col(m(new THREE.SphereGeometry(1, 6, 4), [-0.05, 0.06, 0], [0, 0, 0], [0.07, 0.052, 0.062]), VI);
    col(m(new THREE.ConeGeometry(0.036, 0.09, 6), [0.15, 0.055, 0], [0, 0, -Math.PI / 2], [1, 1, 1]), CU);
    for (const s of [-1, 1]) col(m(new THREE.SphereGeometry(1, 4, 3), [0.115, 0.09, s * 0.026], [0, 0, 0], [0.012, 0.016, 0.006]), RO);
    col(m(new THREE.CylinderGeometry(0.006, 0.0025, 0.2, 3), [-0.21, 0.035, 0], [0, 0, Math.PI / 2 - 0.12], [1, 1, 1]), RO);
    for (const a of [0.07, -0.07]) for (const s of [-1, 1]) col(m(new THREE.BoxGeometry(0.018, 0.035, 0.014), [a, 0.017, s * 0.035], [0, 0, 0], [1, 1, 1]), CU);
    return unirColor(partes);
  }
  function geoMonton() { // domo irregular de radio 1 y alto 1, con manchas de color (basura revuelta, no tierra)
    const g = new THREE.SphereGeometry(1, 22, 7, 0, Math.PI * 2, 0, Math.PI / 2), P = g.attributes.position, C = new Float32Array(P.count * 3), c = new THREE.Color();
    const pal = [0x6f675a, 0x7d776b, 0x5c5a50, 0x8c8576, 0x58604a, 0xb9b4a6, 0x665846];
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = Math.sin(x * 7.3 + z * 3.1) * Math.cos(z * 5.7 - x * 2.3), n2 = Math.sin(x * 13.1 - z * 11.7);
      const f = 1 + 0.16 * n + 0.06 * n2; P.setXYZ(i, x * f, y > 0.02 ? y * (0.82 + 0.3 * (0.5 + 0.5 * n2)) - 0.04 : -0.04, z * f);
      c.setHex(pal[Math.floor((0.5 + 0.5 * Math.sin(x * 23.7 + z * 17.3 + y * 9.1)) * 6.99)]); C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.deleteAttribute('uv'); g.computeVertexNormals(); return g;
  }

  /* ---------- sombreadores: la tabla de montones (fila 0 = desde, 1 = hasta: x, z, radio, alto; fila 2 = llenado y escala desde/hasta) ---------- */
  const SIT = 'uniform sampler2D uSit; uniform float uMix, uK, uT, uY, uD0, uRat;\n' +
    'vec4 sitio(float s){ int i = int(s + 0.5); return mix(texelFetch(uSit, ivec2(i, 0), 0), texelFetch(uSit, ivec2(i, 1), 0), uMix); }\n' +
    'vec2 lleno(float s){ vec4 f = texelFetch(uSit, ivec2(int(s + 0.5), 2), 0); return vec2(mix(f.x, f.y, uMix), mix(f.z, f.w, uMix)); }\n' +
    'float domo(vec4 S, vec2 p){ if (S.z <= 0.0) return 0.0; float d = length(p - S.xy) / S.z; return S.w * sqrt(max(0.0, 1.0 - d * d)); }\n' +
    'vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }\n';
  function parchar(mat, nombre, decl, normal, vert) {
    mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + SIT + decl)
        .replace('#include <beginnormal_vertex>', normal + '\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
        .replace('#include <begin_vertex>', vert + '\n#ifdef USE_ALPHAHASH\nvPosition = vec3( position );\n#endif'); };
    mat.customProgramCacheKey = () => 'basura2-' + nombre;
  }

  function armar() {
    if (G) return;
    TX = new Float32Array(MAXS * 3 * 4);
    tex = new THREE.DataTexture(TX, MAXS, 3, THREE.RGBAFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
    U = { uSit: { value: tex }, uMix: { value: 1 }, uK: { value: 1 }, uT: { value: 0 }, uY: { value: (T3.sueloY != null ? T3.sueloY : 0.3) + 0.04 }, uD0: { value: D0 }, uRat: { value: 0 } };
    G = new THREE.Group(); G.name = 'basura'; GR = new THREE.Group(); GR.name = 'ratas'; G.add(GR);

    // bolsas: aB = (montón, ρ, ángulo, rango en el montón) · aE = aspecto (x, y, z) y giro
    const gB = new THREE.IcosahedronGeometry(0.5, 0), aB = new Float32Array(MAXB * 4), aE = new Float32Array(MAXB * 4);
    for (let i = 0; i < MAXB; i++) { const r = rnd(), q = rnd(); aE[i * 4] = 0.9 + 0.7 * r; aE[i * 4 + 1] = 0.45 + 0.35 * q; aE[i * 4 + 2] = 0.8 + 0.5 * (1 - r); aE[i * 4 + 3] = rnd() * 6.2832;
      const sp = rnd(); aB[i * 4 + 1] = sp < 0.82 ? Math.sqrt(rnd()) * 0.97 : 1 + 0.65 * rnd() * rnd(); aB[i * 4 + 2] = rnd() * 6.2832; }
    const atB = new THREE.InstancedBufferAttribute(aB, 4); gB.setAttribute('aB', atB); gB.setAttribute('aE', new THREE.InstancedBufferAttribute(aE, 4));
    const mB = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: true, emissive: 0x2a251e, emissiveIntensity: 0.8 }); // un poco de luz propia: de madrugada y a la sombra de las naves no se vuelven negras
    parchar(mB, 'b', 'attribute vec4 aB; attribute vec4 aE;\n', 'vec3 objectNormal = rotY(normal, aE.w);',
      'vec4 S = sitio(aB.x); vec2 F = lleno(aB.x); float on = smoothstep(aB.w, aB.w + 0.04, F.x);\n' +
      'vec2 p = S.xy + vec2(cos(aB.z), sin(aB.z)) * aB.y * S.z; float hy = aB.y < 1.0 ? domo(S, p) * (0.9 + 0.1 * fract(aB.z * 7.0)) : 0.0;\n' +
      'vec3 W = vec3(p.x, uY + hy + 0.15, p.y); float kd = clamp(distance(cameraPosition, W) / uD0, 1.0, 4.5);\n' +
      'vec3 transformed = rotY(position * aE.xyz, aE.w) * ((0.6 + 0.55 * fract(aB.z * 3.7)) * F.y * kd * uK * on) + W;');
    bolsas = new THREE.InstancedMesh(gB, mB, MAXB); bolsas.name = 'basura-bolsas'; bolsas.frustumCulled = false; bolsas.count = 0; bolsas.receiveShadow = true;
    const c = new THREE.Color(); for (let i = 0; i < MAXB; i++) { c.setHex(COLORES[Math.floor(rnd() * COLORES.length)]); c.multiplyScalar(0.8 + 0.4 * rnd()); bolsas.setColorAt(i, c); }
    G.add(bolsas);

    // montones (un domo por montón) y manchas de lixiviado
    const aM = new Float32Array(MAXS * 2); for (let i = 0; i < MAXS; i++) { aM[i * 2] = i; aM[i * 2 + 1] = rnd() * 6.2832; }
    const gMo = geoMonton(); gMo.setAttribute('aM', new THREE.InstancedBufferAttribute(aM, 2));
    const mMo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true, emissive: 0x3b3329, emissiveIntensity: 0.9 });
    parchar(mMo, 'm', 'attribute vec2 aM;\n', 'vec3 objectNormal = rotY(normal, aM.y);',
      'vec4 S = sitio(aM.x); vec3 transformed = rotY(position, aM.y) * vec3(S.z, S.w, S.z) * uK + vec3(S.x, uY, S.y);');
    montones = new THREE.InstancedMesh(gMo, mMo, MAXS); montones.name = 'basura-montones'; montones.frustumCulled = false; montones.count = 0; montones.receiveShadow = true;
    G.add(montones);
    const gMa = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); gMa.setAttribute('aM', new THREE.InstancedBufferAttribute(aM, 2));
    const mMa = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, uniforms: U,
      vertexShader: SIT + 'attribute vec2 aM; varying vec2 vU; varying float vA;\n' +
        'void main(){ vec4 S = sitio(aM.x); vU = position.xz * 2.0; vA = clamp(S.z / 30.0, 0.35, 1.0); float r = S.z * 2.1 + 6.0 * step(0.01, S.z);\n' +
        ' vec3 p = rotY(position, aM.y) * r + vec3(S.x, uY + 0.05, S.y); gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform float uK; varying vec2 vU; varying float vA; void main(){ float r = length(vU); float w = sin(atan(vU.y, vU.x) * 5.0 + r * 9.0) * 0.06;' +
        ' float a = (1.0 - smoothstep(0.3 + w, 1.0 + w, r)) * 0.55 * vA * uK; if (a < 0.004) discard; gl_FragColor = vec4(0.16, 0.12, 0.08, a); }' });
    manchas = new THREE.InstancedMesh(gMa, mMa, MAXS); manchas.name = 'basura-manchas'; manchas.frustumCulled = false; manchas.count = 0; manchas.renderOrder = 3;
    G.add(manchas);

    // ratas: aR = (semilla, velocidad, fase, tamaño) · aS = (montón, ángulo de su sitio, distancia / radio, rango global)
    const gR = geoRata(), aR = new Float32Array(MAXR * 4), aS = new Float32Array(MAXR * 4);
    for (let i = 0; i < MAXR; i++) { aR[i * 4] = rnd() * 97.3; aR[i * 4 + 1] = 0.22 + 0.3 * rnd(); aR[i * 4 + 2] = rnd() * 50; aR[i * 4 + 3] = 2.0 + 0.6 * rnd();
      aS[i * 4 + 1] = rnd() * 6.2832; aS[i * 4 + 2] = 0.75 + 0.7 * rnd(); aS[i * 4 + 3] = (i + 0.5) / MAXR; }
    const atS = new THREE.InstancedBufferAttribute(aS, 4); gR.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4)); gR.setAttribute('aS', atS);
    const mR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
    const PRE = 'vec4 S = sitio(aS.x); float tt = uT * aR.y + aR.z; float sg = floor(tt), fr = fract(tt);\n' +
      'vec2 pa = ptR(aR.x, sg), pb = ptR(aR.x, sg + 1.0); float mv = smoothstep(0.0, 0.4, fr); vec2 dd = pb - pa; float yaw = -atan(dd.y, dd.x + 1e-5);\n';
    parchar(mR, 'r', 'attribute vec4 aR; attribute vec4 aS;\nfloat hR(float n){ return fract(sin(n) * 43758.5453); }\n' +
      'vec2 ptR(float sd, float s){ float a = hR(sd * 12.9898 + s * 78.233) * 6.2832; float r = sqrt(hR(sd * 39.346 + s * 11.135)); return vec2(cos(a), sin(a)) * r; }\n',
      PRE + 'vec3 objectNormal = rotY(normal, yaw);',
      'vec2 home = S.xy + vec2(cos(aS.y), sin(aS.y)) * aS.z * S.z; vec2 q = home + mix(pa, pb, mv) * (3.0 + 0.15 * S.z); float run = fr < 0.4 ? 1.0 : 0.0;\n' +
      'vec3 W = vec3(q.x, uY + domo(S, q) + run * abs(sin(fr * 60.0)) * 0.05, q.y); float kd = clamp(distance(cameraPosition, W) / uD0, 1.0, 7.0);\n' +
      'float on = step(aS.w, uRat) * step(0.01, S.z);\n' +
      'vec3 transformed = rotY(position, yaw) * (aR.w * kd * uK * on) + W;');
    ratas = new THREE.InstancedMesh(gR, mR, MAXR); ratas.name = 'ratas-inst'; ratas.frustumCulled = false; ratas.count = 0;
    GR.add(ratas);
    bolsas.userData.aB = atB; ratas.userData.aS = atS;

    T3.scene.add(G);
    RELOJ.alDibujar(cuadro);
  }

  /* ---------- etiquetas de vidrio ---------- */
  function cajaEtq() {
    if (caja) return caja;
    if (!document.getElementById('bas-css')) { const s = document.createElement('style'); s.id = 'bas-css'; s.textContent = `
#bas-etq{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
#bas-etq .be{position:absolute;left:0;top:0;transform-origin:50% 100%;will-change:transform,opacity;white-space:nowrap;padding:5px 10px 6px;border-radius:10px;
  background:var(--ui-glass,linear-gradient(160deg,rgba(38,42,50,.55),rgba(8,10,14,.66)));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  -webkit-backdrop-filter:var(--ui-glass-fx,blur(14px));backdrop-filter:var(--ui-glass-fx,blur(14px));box-shadow:0 8px 22px rgba(0,0,0,.3);color:#eef1f2;
  font:400 11px/1.3 var(--ui-sans,Inter,system-ui,sans-serif)}
#bas-etq .be b{display:block;font-weight:600;font-size:11.5px;letter-spacing:.01em;color:#fff}
#bas-etq .be span{display:block;font-variant-numeric:tabular-nums;color:#d9c7ad}
#bas-etq .be::after{content:'';position:absolute;left:50%;top:100%;width:1px;height:14px;background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,0))}
@media(max-width:760px){#bas-etq .be{font-size:10px;padding:4px 8px}#bas-etq .be b{font-size:10.5px}}`; document.head.appendChild(s); }
    caja = document.createElement('div'); caja.id = 'bas-etq'; caja.setAttribute('aria-hidden', 'true'); document.body.appendChild(caja); return caja;
  }
  function etiquetas(lista) { // lista: [{ id, titulo, x, z, s (montón), n: [t/día, t sin recoger], tipo }]
    cajaEtq();
    const prev = new Map(etq.map(e => [e.id, e]));
    const nuevas = lista.map(L => { let e = prev.get(L.id); prev.delete(L.id);
      if (!e) { const el = document.createElement('div'); el.className = 'be'; el.innerHTML = '<b></b><span></span>'; el.style.opacity = '0'; caja.appendChild(el);
        e = { id: L.id, el, b: el.firstChild, sp: el.lastChild, n0: L.n.slice(), n1: L.n.slice(), txt: '', sx: -1, sy: -1, sc: -1, op: -1 }; }
      else { const m = U.uMix.value; e.n0 = e.n0.map((v, i) => v + (e.n1[i] - v) * m); e.n1 = L.n.slice(); }
      if (e.b.textContent !== L.titulo) e.b.textContent = L.titulo;
      Object.assign(e, { x: L.x, z: L.z, s: L.s, tipo: L.tipo }); return e; });
    for (const e of prev.values()) e.el.remove();
    etq = nuevas; textos(true);
  }
  function textos(forzar) {
    const m = U.uMix.value;
    for (const e of etq) { const a = e.n0[0] + (e.n1[0] - e.n0[0]) * m, b = e.n0[1] + (e.n1[1] - e.n0[1]) * m;
      const t = e.tipo === 'humedal' ? `${fmt(a)} t/día arrojadas · ${fmt(b)} t acumuladas` : `${fmt(a)} t/día · ${fmt(b)} t sin recoger`;
      if (forzar || t !== e.txt) { e.txt = t; e.sp.textContent = t; } }
  }
  function moverEtq() {
    if (!caja) return;
    const cam = T3.camera, W = innerWidth, H = innerHeight, cp = cam.position, mi = cam.matrixWorldInverse.elements, pm = cam.projectionMatrix.elements, mx = U.uMix.value;
    for (const e of etq) {
      const r = Math.max(0, e.s) * 4, h = TX[r + 3] + (TX[MAXS * 4 + r + 3] - TX[r + 3]) * mx;
      const x = e.x, y = U.uY.value + h + 22, z = e.z;
      // vista y proyección (sin objetos nuevos)
      const vx = mi[0] * x + mi[4] * y + mi[8] * z + mi[12], vy = mi[1] * x + mi[5] * y + mi[9] * z + mi[13], vz = mi[2] * x + mi[6] * y + mi[10] * z + mi[14];
      const cw = pm[3] * vx + pm[7] * vy + pm[11] * vz + pm[15], cx = (pm[0] * vx + pm[4] * vy + pm[8] * vz + pm[12]) / cw, cy = (pm[1] * vx + pm[5] * vy + pm[9] * vz + pm[13]) / cw;
      const d = Math.hypot(x - cp.x, y - cp.y, z - cp.z);
      let op = vz < 0 && Math.abs(cx) < 1.05 && Math.abs(cy) < 1.05 ? Math.max(0, Math.min(1, (7000 - d) / 2000)) * vis : 0;
      op *= Math.min(1, (1.05 - Math.abs(cx)) * 6) * Math.min(1, (1.05 - Math.abs(cy)) * 6); // se desvanece al llegar al borde de la pantalla
      if (e.tipo === 'humedal') op *= 0.92;
      const sx = Math.round((cx * 0.5 + 0.5) * W), sy = Math.round((0.5 - cy * 0.5) * H - 14), sc = Math.round(Math.max(0.62, Math.min(1, 1600 / d)) * 100) / 100, o = Math.round(op * 50) / 50;
      if (o !== e.op) { e.op = o; e.el.style.opacity = String(o); e.el.style.visibility = o > 0 ? 'visible' : 'hidden'; }
      if (o > 0 && (sx !== e.sx || sy !== e.sy || sc !== e.sc)) { e.sx = sx; e.sy = sy; e.sc = sc; e.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%) scale(${sc})`; }
    }
  }

  /* ---------- un cuadro: uniformes y etiquetas ---------- */
  function cuadro(info) {
    if (!G) return;
    const dt = info ? info.dtReal || 0 : 0.016;
    if (mix < 1) { mix = Math.min(1, mix + dt / DUR); U.uMix.value = mix * mix * (3 - 2 * mix); textos(false); }
    if (vis !== visMeta) { vis = visMeta > vis ? Math.min(visMeta, vis + dt / 0.6) : Math.max(visMeta, vis - dt / 0.6); U.uK.value = vis; G.visible = vis > 0.001; if (caja) caja.style.display = G.visible ? '' : 'none'; }
    if (!G.visible) return;
    U.uT.value = RELOJ.tAnim || 0;
    U.uRat.value = U.uRat.value + ((est.nRatas / MAXR) - U.uRat.value) * Math.min(1, dt * 2.5);
    moverEtq();
  }

  /* ---------- la tabla de montones ---------- */
  function sitiosDe(P) {
    const S = [], tmp = [0, 0], lw = T3.lw;
    for (let j = 0; j < P.length && S.length < MAXS; j++) { const p = P[j];
      if (p.f === 'corabastos') { CORA.forEach(([x, y]) => { const [wx, wz] = lw(x, y); S.push({ j, x: wx, z: wz, w: 1 / CORA.length }); }); continue; }
      if (p.f === 'vivienda' || p.f === 'flores') { aCalle(p.x, p.z, tmp); S.push({ j, x: tmp[0], z: tmp[1], w: 1 }); continue; }
      S.push({ j, x: p.x, z: p.z, w: 1 });
    }
    return S.slice(0, MAXS);
  }
  function repartir(A) { // asigna bolsas y ratas a los montones según sus toneladas (solo cuando cambian los montones)
    const sum = A.reduce((s, v) => s + Math.max(v, 1), 0), cum = new Float32Array(nS); let acc = 0; for (let s = 0; s < nS; s++) { acc += Math.max(A[s], 1) / sum; cum[s] = acc; }
    const cual = (u) => { let s = 0; while (s < nS - 1 && u > cum[s]) s++; return s; };
    const aB = bolsas.userData.aB, b = aB.array, cnt = new Int32Array(nS), rk = new Int32Array(MAXB);
    for (let i = 0; i < MAXB; i++) { const s = cual(rnd()); b[i * 4] = s; rk[i] = cnt[s]++; }
    for (let i = 0; i < MAXB; i++) b[i * 4 + 3] = (rk[i] + 0.5) / Math.max(1, cnt[b[i * 4]]);
    aB.needsUpdate = true;
    const aS = ratas.userData.aS, r = aS.array; for (let i = 0; i < MAXR; i++) r[i * 4] = cual(rnd()); aS.needsUpdate = true;
    return cnt;
  }
  let capS = null;

  function poner(d = {}) {
    armar();
    const pts0 = Array.isArray(d.puntos) && d.puntos.length ? d.puntos : puntosBase(d.total_t_dia != null ? d.total_t_dia : 300);
    const P = pts0.map(p => ({ x: +p.x, z: +p.z, t: Math.max(0, +p.t_dia || 0), f: p.fuente || '', a: p.acumulada != null && isFinite(+p.acumulada) ? Math.max(0, +p.acumulada) : null,
      u: p.sinRecoger_t_dia != null ? +p.sinRecoger_t_dia : null, n: p.nombre || '' })).filter(p => isFinite(p.x) && isFinite(p.z));
    const sumT = P.reduce((s, p) => s + p.t, 0), sinA = P.every(p => p.a == null);
    const totA = d.acumulada != null && isFinite(+d.acumulada) ? +d.acumulada : null;
    for (const p of P) if (p.a == null) p.a = sinA && totA != null && sumT > 0 ? totA * p.t / sumT : p.t * 7;
    const clave = P.map(p => p.f + Math.round(p.x / 10) + ',' + Math.round(p.z / 10)).join('|');
    const nuevo = clave !== claveLay;
    if (nuevo) { claveLay = clave; sitios = sitiosDe(P); nS = sitios.length; }
    const A = sitios.map(s => P[s.j].a * s.w), sumA = A.reduce((s, v) => s + v, 0);
    if (nuevo) capS = repartir(A);
    // congelar lo que se ve como «desde» y escribir «hasta»
    const m = U.uMix.value, F0 = 0, F1 = MAXS * 4, F2 = MAXS * 8;
    if (nuevo) { for (let s = 0; s < MAXS; s++) { const o = s * 4; TX[F0 + o] = s < nS ? sitios[s].x : 0; TX[F0 + o + 1] = s < nS ? sitios[s].z : 0; TX[F0 + o + 2] = 0; TX[F0 + o + 3] = 0; TX[F2 + o] = 0; TX[F2 + o + 2] = 1; } }
    else for (let s = 0; s < MAXS; s++) { const o = s * 4; for (let k = 0; k < 4; k++) TX[F0 + o + k] += (TX[F1 + o + k] - TX[F0 + o + k]) * m; TX[F2 + o] += (TX[F2 + o + 1] - TX[F2 + o]) * m; TX[F2 + o + 2] += (TX[F2 + o + 3] - TX[F2 + o + 2]) * m; }
    let nb = 0;
    for (let s = 0; s < MAXS; s++) { const o = s * 4;
      if (s >= nS) { TX[F1 + o + 2] = 0; TX[F1 + o + 3] = 0; TX[F2 + o + 1] = 0; TX[F2 + o + 3] = 1; continue; }
      TX[F1 + o] = sitios[s].x; TX[F1 + o + 1] = sitios[s].z; TX[F1 + o + 2] = radio(A[s]); TX[F1 + o + 3] = alto(A[s]);
      const want = A[s] * POR_T, cap = Math.max(1, capS[s]); TX[F2 + o + 1] = Math.min(1, want / cap); TX[F2 + o + 3] = Math.max(1, Math.min(2.2, Math.sqrt(want / cap)));
      nb += Math.min(want, cap); }
    tex.needsUpdate = true;
    const NB = Math.min(MAXB, Math.round(nb)), NR = Math.max(0, Math.min(MAXR, Math.round((+d.ratas || 0) * RATAS_BASE)));
    bolsas.count = MAXB; montones.count = nS; manchas.count = nS; ratas.count = MAXR;
    Object.assign(est, { puntos: pts0, total_t_dia: d.total_t_dia != null ? +d.total_t_dia : sumT, acumulada: totA != null ? totA : sumA, ratas: +d.ratas || 0, ratas0: d.ratas0 != null ? +d.ratas0 : est.ratas0, bolsas: NB, nRatas: NR, montones: nS });
    mix = 0; U.uMix.value = 0;
    // etiquetas: Corabastos, Plaza de las Flores y cada borde de humedal (el montón más alto de cada punto)
    const L = [], cora = new Map();
    sitios.forEach((st, s) => { const p = P[st.j]; if (p.f === 'corabastos') { if (!cora.has(st.j) || A[s] > A[cora.get(st.j)]) cora.set(st.j, s); } });
    P.forEach((p, j) => {
      if (p.f === 'corabastos') L.push({ id: 'cora' + j, titulo: 'Corabastos', x: p.x, z: p.z, s: cora.get(j) || 0, n: [p.t, p.a], tipo: 'cora' });
      else if (p.f === 'flores') { const s = sitios.findIndex(st => st.j === j); if (s >= 0) L.push({ id: 'flores' + j, titulo: 'Plaza de las Flores', x: sitios[s].x, z: sitios[s].z, s, n: [p.t, p.a], tipo: 'flores' }); }
      else if (p.f === 'humedal') { const s = sitios.findIndex(st => st.j === j); if (s >= 0) L.push({ id: 'hum' + j, titulo: 'Borde ' + (p.n || 'del humedal'), x: p.x, z: p.z, s, n: [p.u != null ? p.u : p.t, p.a], tipo: 'humedal' }); }
    });
    etiquetas(L);
    if (visMeta === 0) ver(true);
    return est;
  }

  function ver(on = true) { if (!G) { if (!on) return; armar(); } visMeta = on ? 1 : 0; if (on) { G.visible = true; if (caja) caja.style.display = ''; } }

  const API = { poner, ver, puntosBase, PLAZA_FLORES, get estado() { return est; }, get grupo() { return G; }, get _tabla() { return TX; }, get _mezcla() { return U && U.uMix.value; } };
  window.KEN_BASURA = API;
  return API;
}
