/* ============ BASURA ACUMULADA Y RATAS (Corabastos, Plaza de las Flores y manzanas de vivienda) ============
   window.KEN_BASURA = { poner(datos), ver(on), puntosBase(totalTDia) }
   poner({ puntos: [{ x, z, t_dia, fuente }], total_t_dia, ratas, ratas0, acumulada })
   · puntos: focos de basura en coordenadas de MUNDO (x, z) con su producción en toneladas/día (t_dia) y su fuente (texto libre:
     'corabastos', 'flores', 'vivienda'…). Sin puntos se usan los de puntosBase(total_t_dia).
   · cantidad de bolsas = 10 por tonelada (1 punto ≈ 0,1 t) de «acumulada» si viene (toneladas sin recoger), si no de total_t_dia,
     si no de la suma de t_dia; tope 8000. Se reparten entre los puntos según su t_dia: más toneladas = más bolsas y montones más
     anchos y más altos.
   · ratas: índice (1 = base). Ratas dibujadas = ratas × 60 (tope 1500), repartidas entre los montones según su t_dia. ratas0 se
     guarda (estado.ratas0) para quien quiera comparar con la base.
   · transiciones suaves (1,4 s de tiempo real): cada bolsa y cada rata se mueven/crecen desde donde estaban hasta su nuevo sitio.
   DIBUJO: todo en la GPU. Las bolsas (InstancedMesh de icosaedros aplastados, colores apagados gris/café/verde) y las ratas
   (InstancedMesh de un cuadrúpedo gris oscuro) se ubican en el sombreador de vértices: el CPU solo cambia 3 uniformes por cuadro.
   Las ratas corretean alrededor de su montón con el tiempo de animación del reloj universal (RELOJ.tAnim: se detienen en pausa).
   Como en data3d/biotica.js, de lejos todo se agranda un poco con la distancia a la cámara (con tope) para leerse desde la vista general.
   Grupo de la escena 'basura' (las ratas en el hijo 'ratas'): KEN_FOCO.on('basura') lo deja en color.
   Plaza de las Flores: polígono OSM «Las Flores» (way 319611996, amenity=marketplace, 4,6340 N −74,1566 O), centro en el modelo
   (6714, 2552): al nororiente del predio de Corabastos. */

export const PLAZA_FLORES = [6714, 2552];          // coordenadas del MODELO (T3.lw las pasa al mundo)
// patios, calles internas y muelles de carga del predio de Corabastos (fuera de las naves de data3d/corabastos.json; coordenadas del modelo)
const CORA = [[6330, 2170], [6120, 2250], [6540, 2220], [6500, 2030], [6400, 2380], [6380, 1840], [6110, 1990], [6780, 2250], [6700, 2050], [6220, 2510]];
// naves de Corabastos [cx, cy, ángulo, medio largo, medio ancho] (data3d/corabastos.json): las bolsas que caen dentro se empujan al borde (no quedan bajo los techos)
const NAVES = [[6224.6,2347.8,-0.092,49.7,22.4],[6314.3,2426.1,1.449,40.7,37.3],[6310.4,1954.9,-0.084,46.0,11.0],[6438.7,1943.7,-0.089,46.0,11.2],[6326.4,2139.6,-0.088,45.9,10.9],[6670.2,2140.1,1.487,25.3,12.0],[6090.3,2097.8,-0.088,46.2,10.7],[6444.1,2005.3,-0.097,46.1,11.2],[6321.1,2078.1,-0.091,46.1,10.8],[6727.4,2230.0,-0.092,20.0,9.6],[6100.1,2221.3,-0.09,47.8,10.9],[6216.0,2211.2,-0.086,45.5,10.9],[6331.9,2201.1,-0.09,45.8,11.1],[6730.6,2170.2,1.479,41.4,8.8],[6200.5,2026.6,-0.095,46.1,11.3],[6315.8,2016.5,-0.084,46.0,10.9],[6106.6,2282.6,-0.084,46.4,11.1],[6221.6,2273.1,-0.08,45.9,11.1],[6336.9,2262.7,-0.085,46.1,10.9],[6677.3,2218.9,1.487,43.8,11.6],[6343.8,2333.5,-0.094,45.8,22.5],[6454.5,2128.8,-0.089,46.7,10.9],[6460.2,2190.2,-0.087,46.2,11.0],[6206.1,2088.1,-0.087,45.8,10.8],[6023.6,2168.8,1.471,30.7,6.6],[6096.1,2159.2,-0.087,46.3,10.9],[6211.2,2149.3,-0.079,45.8,10.9],[6449.7,2067.3,-0.092,46.1,11.0],[6560.2,1995.2,-0.083,46.4,11.5],[6434.0,1882.3,-0.088,46.0,10.8],[6305.6,1893.3,-0.082,45.8,11.4],[6445.5,2417.2,1.482,43.1,9.7],[6119.3,2357.4,-0.092,41.5,22.6],[6268.9,2430.7,1.445,40.2,8.5],[6565.4,2057.3,-0.084,46.2,10.8],[6576.1,2180.6,-0.084,46.4,11.4],[6570.7,2118.7,-0.091,46.2,11.0]];
// manzanas de vivienda alrededor (María Paz, El Amparo, Patio Bonito, Britalia: aproximado)
const VIV = [[5790, 2620], [6150, 2700], [5720, 2080], [6920, 1880], [7020, 2640], [6480, 2700]];
const MAX = 8000, MAXR = 1500, POR_T = 10, RATAS_BASE = 60, DUR = 1.4, D0 = 160, KMAX = 4.5;
const COLORES = [0x5f5d58, 0x6e5b45, 0x5a4a3a, 0x5d6a48, 0x4f5b3f, 0x2b2c2e, 0x8f8b80, 0x6b6450, 0x46423c, 0x75705f];

export function crearBasura({ T3, RELOJ }) {
  const THREE = T3.THREE;
  let G = null, GR = null, bolsas = null, ratas = null, manchas = null, U = null, mix = 1, vis = 1, visMeta = 1;
  let A0 = null, A1 = null, R0 = null, R1 = null, M0 = null, M1 = null; // atributos (desde / hasta)
  const est = { puntos: [], total_t_dia: 0, ratas: 0, ratas0: 0, acumulada: null, bolsas: 0, nRatas: 0 };
  const rnd = (RELOJ && RELOJ.azar) ? RELOJ.azar('basura') : Math.random;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  // azar fijo por bolsa / rata (se sortea una vez): el mismo reparto en cada poner
  let RB = null, RRt = null;
  const MAXP = 64; // focos
  let O = null; const tmp = [0, 0];
  // empuja (x, z) del mundo fuera de las naves de Corabastos (al borde más cercano + margen mg); devuelve true si lo movió
  const fuera = (wx, wz, mg, out) => {
    if (!O) O = T3.lw(0, 0); const x = wx - O[0], y = O[1] - wz; out[0] = wx; out[1] = wz;
    for (let k = 0; k < NAVES.length; k++) { const n = NAVES[k], dx = x - n[0], dy = y - n[1], R = n[3] + n[4] + mg; if (dx * dx + dy * dy > R * R) continue;
      const ca = Math.cos(n[2]), sa = Math.sin(n[2]); let u = dx * ca + dy * sa, v = -dx * sa + dy * ca; const pu = n[3] + mg - Math.abs(u), pv = n[4] + mg - Math.abs(v);
      if (pu <= 0 || pv <= 0) continue;
      if (pu < pv) u = (u < 0 ? -1 : 1) * (n[3] + mg); else v = (v < 0 ? -1 : 1) * (n[4] + mg);
      out[0] = n[0] + u * ca - v * sa + O[0]; out[1] = O[1] - (n[1] + u * sa + v * ca); return true; }
    return false; };

  function puntosBase(total = 300) {
    const L = [], lw = T3.lw;
    const pc = 0.72, pf = 0.1, pv = 0.18; // reparto [SUP]: 72 % Corabastos, 10 % Plaza de las Flores, 18 % vivienda
    CORA.forEach(([x, y], i) => { const [wx, wz] = lw(x, y); L.push({ x: wx, z: wz, t_dia: total * pc / CORA.length * (0.7 + 0.6 * ((i * 37) % 10) / 10), fuente: 'corabastos' }); });
    { const [wx, wz] = lw(PLAZA_FLORES[0], PLAZA_FLORES[1]); L.push({ x: wx, z: wz, t_dia: total * pf, fuente: 'flores' }); }
    VIV.forEach(([x, y]) => { const [wx, wz] = lw(x, y); L.push({ x: wx, z: wz, t_dia: total * pv / VIV.length, fuente: 'vivienda' }); });
    return L;
  }

  /* ---------- geometrías ---------- */
  function geoRata() {
    const partes = [], col = (g, c) => { g = g.index ? g.toNonIndexed() : g; const C = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); partes.push(g); };
    const m = (g, p, r, s) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
    const CU = '#3b3936', VI = '#4a4743', RO = '#8a6f6a';
    col(m(new THREE.SphereGeometry(1, 7, 5), [0, 0.055, 0], [0, 0, 0.05], [0.12, 0.05, 0.058]), CU);           // cuerpo (adelante = +x)
    col(m(new THREE.SphereGeometry(1, 6, 4), [-0.05, 0.06, 0], [0, 0, 0], [0.07, 0.052, 0.062]), VI);           // anca
    col(m(new THREE.ConeGeometry(0.036, 0.09, 6), [0.15, 0.055, 0], [0, 0, -Math.PI / 2], [1, 1, 1]), CU);       // cabeza
    for (const s of [-1, 1]) col(m(new THREE.SphereGeometry(1, 4, 3), [0.115, 0.09, s * 0.026], [0, 0, 0], [0.012, 0.016, 0.006]), RO); // orejas
    col(m(new THREE.CylinderGeometry(0.006, 0.0025, 0.2, 3), [-0.21, 0.035, 0], [0, 0, Math.PI / 2 - 0.12], [1, 1, 1]), RO); // cola
    for (const a of [0.07, -0.07]) for (const s of [-1, 1]) col(m(new THREE.BoxGeometry(0.018, 0.035, 0.014), [a, 0.017, s * 0.035], [0, 0, 0], [1, 1, 1]), CU); // patas
    let n = 0; for (const g of partes) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of partes) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('color', new THREE.BufferAttribute(C, 3)); r.computeVertexNormals(); return r;
  }

  const GLSL_ROT = 'vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }\n';
  function parchar(mat, decl, normal, vert) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + decl)
        .replace('#include <beginnormal_vertex>', normal).replace('#include <begin_vertex>', vert);
    };
    mat.customProgramCacheKey = () => 'basura-' + decl.length;
  }

  function armar() {
    if (G) return;
    U = { uMix: { value: 1 }, uK: { value: 1 }, uT: { value: 0 }, uD0: { value: D0 }, uKmax: { value: KMAX } };
    G = new THREE.Group(); G.name = 'basura'; GR = new THREE.Group(); GR.name = 'ratas'; G.add(GR);
    // azar fijo por instancia
    RB = new Float32Array(MAX * 6); for (let i = 0; i < MAX; i++) { RB[i * 6] = rnd(); RB[i * 6 + 1] = gauss(); RB[i * 6 + 2] = gauss(); RB[i * 6 + 3] = rnd(); RB[i * 6 + 4] = rnd(); RB[i * 6 + 5] = rnd(); }
    RRt = new Float32Array(MAXR * 4); for (let i = 0; i < MAXR; i++) { RRt[i * 4] = rnd(); RRt[i * 4 + 1] = gauss(); RRt[i * 4 + 2] = gauss(); RRt[i * 4 + 3] = rnd(); }

    /* bolsas y desechos */
    const gB = new THREE.IcosahedronGeometry(0.5, 0);
    A0 = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4); A1 = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    const aE = new Float32Array(MAX * 4); // aspecto (x, y, z) y giro
    for (let i = 0; i < MAX; i++) { const r = RB[i * 6 + 4], q = RB[i * 6 + 5]; aE[i * 4] = 0.9 + 0.7 * r; aE[i * 4 + 1] = 0.45 + 0.35 * q; aE[i * 4 + 2] = 0.8 + 0.5 * (1 - r); aE[i * 4 + 3] = RB[i * 6 + 3] * 6.2832; }
    gB.setAttribute('aP0', A0); gB.setAttribute('aP1', A1); gB.setAttribute('aE', new THREE.InstancedBufferAttribute(aE, 4));
    const mB = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, flatShading: true });
    parchar(mB, 'attribute vec4 aP0; attribute vec4 aP1; attribute vec4 aE; uniform float uMix, uK, uD0, uKmax;\n' + GLSL_ROT,
      'vec3 objectNormal = rotY(normal, aE.w);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif',
      'vec4 P = mix(aP0, aP1, uMix); float kd = clamp(distance(cameraPosition, P.xyz) / uD0, 1.0, uKmax);\n' +
      'vec3 transformed = rotY(position * aE.xyz, aE.w) * (P.w * kd * uK) + P.xyz;\n#ifdef USE_ALPHAHASH\nvPosition = vec3( position );\n#endif');
    bolsas = new THREE.InstancedMesh(gB, mB, MAX); bolsas.name = 'basura-bolsas'; bolsas.frustumCulled = false; bolsas.count = 0; bolsas.receiveShadow = true;
    const c = new THREE.Color(); for (let i = 0; i < MAX; i++) { c.setHex(COLORES[Math.floor(RB[i * 6 + 4] * 7919 % COLORES.length)]); c.multiplyScalar(0.8 + 0.4 * RB[i * 6 + 5]); bolsas.setColorAt(i, c); }
    G.add(bolsas);

    /* manchas de lixiviado bajo cada montón (aterrizan el montón en la foto y se leen de lejos) */
    const gM = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    M0 = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); M1 = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4);
    gM.setAttribute('aP0', M0); gM.setAttribute('aP1', M1);
    const mM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, uniforms: U,
      vertexShader: 'attribute vec4 aP0; attribute vec4 aP1; uniform float uMix; varying vec2 vU; varying float vA;\n' +
        'void main(){ vec4 P = mix(aP0, aP1, uMix); vU = position.xz * 2.0; vA = clamp(P.w / 60.0, 0.0, 1.0); vec3 p = position * P.w * 2.6 + P.xyz; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform float uK; varying vec2 vU; varying float vA; void main(){ float r = length(vU); float a = (1.0 - smoothstep(0.25, 1.0, r)) * 0.42 * vA * uK; if (a < 0.004) discard; gl_FragColor = vec4(0.13, 0.11, 0.08, a); }' });
    manchas = new THREE.InstancedMesh(gM, mM, MAXP); manchas.name = 'basura-manchas'; manchas.frustumCulled = false; manchas.count = 0; manchas.renderOrder = 3;
    G.add(manchas);

    /* ratas */
    const gR = geoRata();
    R0 = new THREE.InstancedBufferAttribute(new Float32Array(MAXR * 4), 4); R1 = new THREE.InstancedBufferAttribute(new Float32Array(MAXR * 4), 4);
    const aR = new Float32Array(MAXR * 4); for (let i = 0; i < MAXR; i++) { aR[i * 4] = rnd() * 97.3; aR[i * 4 + 1] = 0.22 + 0.3 * rnd(); aR[i * 4 + 2] = rnd() * 50; aR[i * 4 + 3] = 2.0 + 0.6 * rnd(); }
    gR.setAttribute('aC0', R0); gR.setAttribute('aC1', R1); gR.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4));
    const mR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
    const DECL_R = 'attribute vec4 aC0; attribute vec4 aC1; attribute vec4 aR; uniform float uMix, uK, uT, uD0, uKmax;\n' + GLSL_ROT +
      'float hR(float n){ return fract(sin(n) * 43758.5453); }\n' +
      'vec2 ptR(float sd, float s){ float a = hR(sd * 12.9898 + s * 78.233) * 6.2832; float r = sqrt(hR(sd * 39.346 + s * 11.135)); return vec2(cos(a), sin(a)) * r; }\n';
    // correteo: tramos de 1/velocidad s; en el primer 40 % del tramo corre al siguiente punto de su ámbito, el resto se queda (husmea)
    const PRE = 'vec4 C = mix(aC0, aC1, uMix); float tt = uT * aR.y + aR.z; float sg = floor(tt), fr = fract(tt);\n' +
      'vec2 pa = ptR(aR.x, sg), pb = ptR(aR.x, sg + 1.0); float mv = smoothstep(0.0, 0.4, fr); vec2 d = pb - pa; float yaw = -atan(d.y, d.x + 1e-5);\n';
    parchar(mR, DECL_R, PRE + 'vec3 objectNormal = rotY(normal, yaw);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif',
      'vec2 q = C.xy + mix(pa, pb, mv) * C.z; float run = (fr < 0.4) ? 1.0 : 0.0;\n' +
      'vec3 W = vec3(q.x, C.w + run * abs(sin(fr * 60.0)) * 0.05, q.y); float kd = clamp(distance(cameraPosition, W) / uD0, 1.0, uKmax);\n' +
      'float sc = aR.w * kd * uK * step(0.001, C.z);\n' +
      'vec3 transformed = rotY(position, yaw) * sc + W;\n#ifdef USE_ALPHAHASH\nvPosition = vec3( position );\n#endif');
    ratas = new THREE.InstancedMesh(gR, mR, MAXR); ratas.name = 'ratas-inst'; ratas.frustumCulled = false; ratas.count = 0;
    GR.add(ratas);

    T3.scene.add(G);
    RELOJ.alDibujar(cuadro);
  }

  /* ---------- un cuadro: solo uniformes ---------- */
  function cuadro(info) {
    if (!G) return;
    const dt = info ? info.dtReal || 0 : 0.016;
    if (mix < 1) { mix = Math.min(1, mix + dt / DUR); U.uMix.value = mix * mix * (3 - 2 * mix); if (mix === 1) { bolsas.count = est.bolsas; ratas.count = est.nRatas; } }
    if (vis !== visMeta) { vis = visMeta > vis ? Math.min(visMeta, vis + dt / 0.6) : Math.max(visMeta, vis - dt / 0.6); U.uK.value = vis; G.visible = vis > 0.001; }
    if (G.visible) U.uT.value = RELOJ.tAnim || 0;
  }

  // congela la mezcla actual en «desde» (para que una nueva orden parta de lo que se ve)
  function congelar(a0, a1) { const m = U.uMix.value, p = a0.array, q = a1.array; for (let i = 0; i < p.length; i++) p[i] = p[i] + (q[i] - p[i]) * m; a0.needsUpdate = true; }

  function poner(d = {}) {
    armar();
    const pts0 = Array.isArray(d.puntos) && d.puntos.length ? d.puntos : puntosBase(d.total_t_dia != null ? d.total_t_dia : 300);
    const P = pts0.slice(0, MAXP).map(p => ({ x: +p.x, z: +p.z, t: Math.max(0, +p.t_dia || 0), f: p.fuente || '' })).filter(p => isFinite(p.x) && isFinite(p.z));
    const sumT = P.reduce((s, p) => s + p.t, 0);
    const T = d.acumulada != null && isFinite(+d.acumulada) ? +d.acumulada : d.total_t_dia != null ? +d.total_t_dia : sumT;
    const NB = Math.max(0, Math.min(MAX, Math.round(T * POR_T))), NR = Math.max(0, Math.min(MAXR, Math.round((+d.ratas || 0) * RATAS_BASE)));
    Object.assign(est, { puntos: pts0, total_t_dia: d.total_t_dia != null ? +d.total_t_dia : sumT, ratas: +d.ratas || 0, ratas0: d.ratas0 != null ? +d.ratas0 : est.ratas0, acumulada: d.acumulada != null ? +d.acumulada : null, bolsas: NB, nRatas: NR });
    const Y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.05;
    // reparto acumulado por t_dia; radio y altura del montón crecen con la raíz de las toneladas (más toneladas = montón más denso y alto)
    const cum = new Float32Array(P.length), sig = new Float32Array(P.length), alt = new Float32Array(P.length);
    let acc = 0; P.forEach((p, j) => { acc += sumT > 0 ? p.t / sumT : 1 / P.length; cum[j] = acc; sig[j] = 4 + 3.2 * Math.sqrt(p.t); alt[j] = 0.5 + 0.32 * Math.sqrt(p.t); });
    const cual = (u) => { let j = 0; while (j < P.length - 1 && u > cum[j]) j++; return j; };
    congelar(A0, A1); congelar(R0, R1); congelar(M0, M1);
    const a = A1.array;
    for (let i = 0; i < MAX; i++) {
      const o = i * 4; if (i >= NB || !P.length) { a[o + 3] = 0; if (A0.array[o + 3] === 0) { a[o] = A0.array[o]; a[o + 1] = A0.array[o + 1]; a[o + 2] = A0.array[o + 2]; } continue; }
      const j = cual(RB[i * 6]), p = P[j], gx = RB[i * 6 + 1], gz = RB[i * 6 + 2], r2 = gx * gx + gz * gz;
      const mv = fuera(p.x + gx * sig[j], p.z + gz * sig[j], 0.6 + 2.2 * RB[i * 6 + 4], tmp); a[o] = tmp[0]; a[o + 2] = tmp[1];
      a[o + 1] = Y + (mv ? 0.5 * alt[j] * RB[i * 6 + 3] * RB[i * 6 + 5] : alt[j] * Math.exp(-r2 * 0.5) * (0.35 + 0.65 * RB[i * 6 + 3])) + 0.12;
      a[o + 3] = 0.55 + 0.6 * RB[i * 6 + 5];
      if (A0.array[o + 3] === 0) { A0.array[o] = a[o]; A0.array[o + 1] = Y - 0.3; A0.array[o + 2] = a[o + 2]; } // las nuevas brotan del suelo en su sitio
    }
    A1.needsUpdate = true; A0.needsUpdate = true;
    const prevB = bolsas.count; bolsas.count = Math.max(NB, Math.min(prevB, MAX));
    // manchas
    const m = M1.array; for (let j = 0; j < MAXP; j++) { const o = j * 4; if (j < P.length) { m[o] = P[j].x; m[o + 1] = Y + 0.02; m[o + 2] = P[j].z; m[o + 3] = NB ? sig[j] * Math.min(1, NB / 400 + 0.3) : 0; if (M0.array[o + 3] === 0) { M0.array[o] = m[o]; M0.array[o + 1] = m[o + 1]; M0.array[o + 2] = m[o + 2]; } } else m[o + 3] = 0; }
    M1.needsUpdate = true; M0.needsUpdate = true; manchas.count = Math.max(P.length, manchas.count);
    // ratas: ámbito de 5-11 m alrededor de un punto del montón
    const r = R1.array;
    for (let i = 0; i < MAXR; i++) {
      const o = i * 4; if (i >= NR || !P.length) { r[o + 2] = 0; if (R0.array[o + 2] === 0) { r[o] = R0.array[o]; r[o + 1] = R0.array[o + 1]; } r[o + 3] = Y; continue; }
      const j = cual(RRt[i * 4]), p = P[j];
      fuera(p.x + RRt[i * 4 + 1] * sig[j] * 1.1, p.z + RRt[i * 4 + 2] * sig[j] * 1.1, 6, tmp); r[o] = tmp[0]; r[o + 1] = tmp[1]; r[o + 2] = 5 + 6 * RRt[i * 4 + 3]; r[o + 3] = Y;
      if (R0.array[o + 2] === 0) { R0.array[o] = r[o]; R0.array[o + 1] = r[o + 1]; R0.array[o + 3] = Y; }
    }
    R1.needsUpdate = true; R0.needsUpdate = true; ratas.count = Math.max(NR, Math.min(ratas.count, MAXR));
    mix = 0; U.uMix.value = 0;
    if (visMeta === 0) ver(true);
    return est;
  }

  function ver(on = true) { if (!G) { if (!on) return; armar(); } visMeta = on ? 1 : 0; if (on) G.visible = true; }

  const API = { poner, ver, puntosBase, PLAZA_FLORES, get estado() { return est; }, get grupo() { return G; } };
  window.KEN_BASURA = API;
  return API;
}
