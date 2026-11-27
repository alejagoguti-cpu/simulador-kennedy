/* ============ HUMEDAL ARTIFICIAL DE FITODEPURACIÓN · BAVARIA COMÚN (con la propuesta) ============
   crearHumedalBavaria({ T3 }) → api (singleton window.KEN_HUMEDAL_BAV):
     preparar() → Promise   construye TODO en trozos de ≤ 8 ms (requestIdleCallback, o setTimeout si no existe), ESCONDIDO; idempotente
     poner(sem)             lo muestra en el estado de la semana simulada sem (si aún no está listo, lo recuerda y lo pone al terminar)
     apagar()               lo esconde y detiene la animación
     area()                 { ha, agua, vegetacion, celdas, ... } (ha = celdas de tratamiento: agua libre + celdas vegetadas)
     obra()                 { id: 'humedal_bavaria', n, x, z, radio } en el mundo (lista de zoom)
     info()                 { listo, visible, años, aves, polinizadores, libelulas, plantas, ... }
   DÓNDE (y por qué): en el parque central del plan parcial (CP-01, «parque central de 5,6 ha», data3d/plan_bavaria.json), su mitad
     occidental, junto a la nave grande de la fábrica (Bavaria Común, ~ (9319, 2942.6) del modelo). Se escogió con una búsqueda sobre los
     datos (rejilla de 4 m): dentro de CP-01, a ≥ 8 m de los edificios de bavaria.json, a ≥ 6 m de los pasajes nuevos de
     bavaria_distrito_sx.json, a ≥ 4 m de las manzanas y vías del plan (calzadas, andenes, alamedas) y lejos de los módulos de fauna
     de bavaria_distrito.js (nidos, perchas, hoteles, charca); apertura morfológica de 6 m y el componente más grande: un claro de 2,04 ha
     en «U» entre la nave y los pasajes. El borde del humedal (POLI_HUMEDAL_BAV) está calcado sobre él (Douglas-Peucker de 2,5 m). Las aguas grises de la nave y la cocina entran por el norte y salen por el occidente.
     NO SE TALA NINGÚN ÁRBOL: cada árbol del censo del predio (bavaria_arboles.json) que cae dentro queda en una isla de pradera.
   TREN DE TRATAMIENTO (6 celdas: 5 en serie y una laguna de hábitat en ramal, unidas por un cauce que serpentea y corta los diques):
     1 sedimentador (agua libre más honda) → 2 humedal de eneas (Typha latifolia) → 3 humedal de juncos (Schoenoplectus californicus)
     → 4 celda de flotantes (buchón cucharita Limnobium laevigatum y lenteja de agua Lemna minor, nativos de los humedales de Bogotá)
     → 5 laguna de pulimento (agua libre con islas); de la 3 sale un ramal a la 6, laguna de hábitat (espejo de agua con orla ancha de
     eneas y juncos, donde se posan las aves). Orillas de pradera húmeda con botoncillo (Bidens laevis,
     flor amarilla) y sendero de grava alrededor; diques de tierra con sendero entre celdas.
   CALENDARIO [SUP]: años 0–2 nada (el parque como está); años 2–3 obra (se excavan las celdas en orden y aparece el sendero); años 3–4 se
     llena el agua (de lo más hondo a la orilla); años 3–6 crecen la pradera, los juncos, las eneas y los flotantes.
   FAUNA [SUP: cantidades ilustrativas, no conteos]: llega con el agua y las plantas, de 0 en el año 3 al máximo hacia el año 7:
     garza blanca (Ardea alba) vadeando la orilla, tingua moteada (Porphyriops melanops), tingua de pico rojo (Gallinula galeata) y pato
     turrio (Oxyura jamaicensis andina) nadando, monjitas (Chrysomus icterocephalus bogotensis) posadas en las eneas, garzas y patos que
     vuelan en círculos bajos y se posan en las celdas; enjambres de polinizadores (abejas, abejorros, sírfidos, mariposas) sobre las
     flores de las orillas y libélulas sobre el agua. Escala de maqueta (×2,5 aves, ×3 insectos), como data3d/propuesta_fauna.js.
     Las aves se hacen aquí con el mismo método de data3d/aves3d.js (elipsoides con color por vértice y alas que se doblan) porque ese
     módulo no exporta sus modelos.
   MALLA DE GOOGLE: index.html tiene UN solo recorte (uHoyo*, ocupado por La Vaca en propuesta01_3d.js). El humedal es un plano OPACO a
     1,0 m (encima de lo que la foto deja en el suelo, < 0,9 m, como el humedal de La Vaca) con polygonOffset y renderOrder 2. La textura
     del campo ya trae en G la máscara para un segundo recorte (G > 0,5 = celdas de agua), por si index.html lo agrega (uHoyo2*).
   AGUA: siempre color de agua normal y OPACA (alfa 1, sin transparencia ni huecos dentro del agua); solo el borde de tierra se deshace en puntos.
   RENDIMIENTO: todo se arma escondido en preparar(); poner() solo cambia visibilidad, uniformes y (si cambió el crecimiento) las matrices
   de las plantas. Una sola actualización por cuadro mientras se ve (aves: ≤ 70 matrices; insectos y agua en la tarjeta de video). */

/* ---------- datos fijos (marco del modelo: x este, y norte) ---------- */
// borde del humedal (incluye sendero y orillas), calcado sobre el claro libre de la mitad occidental de CP-01
export const POLI_HUMEDAL_BAV = [[9444, 2890], [9468, 2890], [9490, 2912], [9522, 2976], [9522, 2992], [9508, 3014], [9494, 3026], [9474, 3028], [9472, 3010], [9480, 3006], [9480, 2994], [9476, 2990],
  [9456, 2990], [9448, 2976], [9446, 2960], [9430, 2960], [9428, 2972], [9436, 2978], [9464, 3034], [9464, 3048], [9440, 3064], [9416, 3066], [9406, 3062], [9358, 2962], [9352, 2956], [9346, 2956],
  [9324, 2968], [9306, 2968], [9300, 2954], [9300, 2940], [9326, 2930], [9328, 2916], [9348, 2916], [9364, 2908], [9366, 2902], [9380, 2902], [9386, 2918], [9390, 2922], [9398, 2922], [9440, 2900]];
const SEM = [[9440, 3045], [9425, 3005], [9395, 2950], [9368, 2930], [9322, 2945], [9490, 2972]]; // semillas de las 6 celdas, en el orden del flujo
const CAUCE = [[[9430, 3066], [9440, 3045], [9425, 3005], [9405, 2975], [9395, 2950], [9368, 2930], [9322, 2945], [9298, 2948]], // entrada (nave) → 1 → 2 → 3 → 4 → 5 → salida
  [[9395, 2950], [9420, 2920], [9458, 2912], [9490, 2972], [9500, 3005]]]; // ramal de la celda 3 a la 6 (rebose hacia el humedal de hábitat)
const TIPOS = ['Sedimentador', 'Humedal de eneas', 'Humedal de juncos', 'Celda de plantas flotantes', 'Laguna de pulimento', 'Laguna de hábitat (espejo de agua con orla de eneas y juncos)'];
const NS = SEM.length, BANCO = 5, BERMA = 4, YP = 1.0; // orilla desde el borde (sendero ~3 m + pradera), ancho de los diques, altura del plano
const sat = (v) => Math.max(0, Math.min(1, v));

/* ---------- ruido determinista ---------- */
const hs = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hs(ix, iz), b = hs(ix + 1, iz), c = hs(ix, iz + 1), d = hs(ix + 1, iz + 1); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; };
const fbm = (x, z) => 0.55 * vn(x, z) + 0.3 * vn(x * 2.03 + 17, z * 2.03 + 5) + 0.15 * vn(x * 4.1 + 3, z * 4.1 + 31);
const dseg = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };

/* ---------- CAMPO (puro, sin THREE: se puede correr en node). Generador: cede una vez por fila (trozos cortos) ----------
   Rejilla de CEL m en el mundo. Por celda de la rejilla:
     D  = distancia (m) al borde del humedal, con ruido (orilla natural)
     W  = «profundidad» con signo: min(D − BANCO, distancia al dique − BERMA/2, distancia a la copa de un árbol − 1,5 m); > 0 = celda de agua.
          El cauce (serpenteante) corta diques y orillas: allí W ≥ 1 − dc.
     dc = distancia al eje del cauce; k = celda (semilla más cercana, sin ruido: el sombreador la recalcula igual)
   Textura RGBA8: R = D + 1 (0 fuera) · G = 255 si W > −1 (máscara para un posible recorte de la malla) · B = dc × 8 · A = W × 4 + 128 */
export function* generarCampo({ lw, arboles = [], CEL = 1 }) {
  const PW = POLI_HUMEDAL_BAV.map(p => lw(p[0], p[1])), SW = SEM.map(p => lw(p[0], p[1]));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of PW) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const M = 3; x0 -= M; z0 -= M; x1 += M; z1 += M;
  const NX = Math.ceil((x1 - x0) / CEL), NZ = Math.ceil((z1 - z0) / CEL);
  // cauce serpenteante: pasa por las semillas y entre ellas se mece ±3,5 m (onda de ~24 m)
  const CP = [];
  for (const linea of CAUCE) { const CW = linea.map(p => lw(p[0], p[1]));
    for (let s = 0; s < CW.length - 1; s++) { const [ax, az] = CW[s], [bx, bz] = CW[s + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(L / 1.5)), nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let i = 0; i < n; i++) { const t = i / n, o = 3.5 * Math.sin(Math.PI * t) * Math.sin(t * L / 24 * 6.283 + s); CP.push(ax + (bx - ax) * t + nx * o, az + (bz - az) * t + nz * o); } }
    CP.push(...CW[CW.length - 1], NaN, NaN); } // NaN: corte entre polilíneas
  const NC = CP.length / 2;
  // árboles del censo dentro (o cerca) de la huella: islas
  const ARB = []; for (const a of arboles) { const [x, z] = lw(a[0], a[1]); if (x > x0 - 8 && x < x1 + 8 && z > z0 - 8 && z < z1 + 8) ARB.push(x, z, Math.max(2, a[3] || 3)); }
  const NA = ARB.length / 3;
  const dat = new Uint8Array(NX * NZ * 4), Wv = new Float32Array(NX * NZ).fill(-99), Dv = new Float32Array(NX * NZ).fill(-1), Kv = new Uint8Array(NX * NZ), Cv = new Float32Array(NX * NZ).fill(99);
  const sup = new Array(NS).fill(0), A2 = CEL * CEL; let huella = 0, cauceFuera = 0;
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) { const x = x0 + (i + 0.5) * CEL, z = z0 + (j + 0.5) * CEL, q = j * NX + i;
      if ((i & 63) === 63) yield j; // trozos cortos (≤ 64 celdas de rejilla)
      if (!dentro(PW, x, z)) continue;
      let dp = 1e9; for (let a = 0, b = PW.length - 1; a < PW.length; b = a++) dp = Math.min(dp, dseg(x, z, PW[b][0], PW[b][1], PW[a][0], PW[a][1]));
      const D = Math.max(0, dp + (fbm(x / 40, z / 40) - 0.5) * 7 + (fbm(x / 13 + 40, z / 13) - 0.5) * 3);
      let k1 = 0, d1 = 1e9, d2 = 1e9, k2 = 0; for (let k = 0; k < NS; k++) { const d = Math.hypot(x - SW[k][0], z - SW[k][1]); if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; } }
      const sx = SW[k2][0] - SW[k1][0], sz = SW[k2][1] - SW[k1][1], dBis = (d2 * d2 - d1 * d1) / (2 * Math.hypot(sx, sz)) + (fbm(x / 9, z / 9 + 70) - 0.5) * 2.4;
      let dt = 1e9; for (let a = 0; a < NA; a++) dt = Math.min(dt, Math.hypot(x - ARB[a * 3], z - ARB[a * 3 + 1]) - ARB[a * 3 + 2] - 1.5 - (vn(x * 0.4 + a, z * 0.4) - 0.5) * 1.6);
      let dc = 1e9; for (let c = 0; c < NC - 1; c++) { const ax = CP[c * 2], az = CP[c * 2 + 1]; if (Math.abs(x - ax) > 6 || Math.abs(z - az) > 6) continue; const d = dseg(x, z, ax, az, CP[c * 2 + 2], CP[c * 2 + 3]); if (d < dc) dc = d; }
      let W = Math.min(D - BANCO, dBis - BERMA / 2, dt);
      if (dc < 1.6 && dt > 0.5) W = Math.max(W, 1.0 - dc * 0.8);
      Dv[q] = D; Wv[q] = W; Kv[q] = k1; Cv[q] = dc; huella += A2;
      if (W > 0) { if (D - BANCO > 0 && dBis - BERMA / 2 > 0) sup[k1] += A2; else cauceFuera += A2; }
      dat[q * 4] = Math.min(255, Math.round(D + 1)); dat[q * 4 + 1] = W > -1 ? 255 : 0; dat[q * 4 + 2] = Math.min(255, Math.round(dc * 8)); dat[q * 4 + 3] = Math.max(0, Math.min(255, Math.round(W * 4 + 128)));
    }
    yield j;
  }
  const ha = (m2) => Math.round(m2 / 100) / 100;
  const AREA = { ha: ha(sup.reduce((a, b) => a + b, 0) + cauceFuera), agua: ha(sup[0] + sup[4] + sup[5] + cauceFuera), vegetacion: ha(sup[1] + sup[2] + sup[3]), celdas: NS,
    porCelda: TIPOS.map((n, k) => ({ n, ha: ha(sup[k]) })), huella: ha(huella), orillas: ha(huella - sup.reduce((a, b) => a + b, 0) - cauceFuera), arbolesIsla: NA };
  return { dat, NX, NZ, CEL, x0, z0, W: NX * CEL, H: NZ * CEL, Wv, Dv, Kv, Cv, SW, PW, CP, AREA,
    en: (x, z) => { const i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; } };
}

export function crearHumedalBavaria({ T3 }) {
  if (window.KEN_HUMEDAL_BAV) return window.KEN_HUMEDAL_BAV;
  const THREE = T3.THREE, LC = T3.LC || { x: 5341.33, y: 3161.9 }, lw = T3.lw || ((x, y) => [x - LC.x, LC.y - y]);
  const MOV = innerWidth < 760, cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const G = new THREE.Group(); G.name = 'humedal_bavaria'; G.visible = false; T3.scene.add(G);
  const O = new THREE.Object3D(), UT = { value: 0 };
  let campo = null, listo = false, visible = false, pendiente = null, prom = null, sem = 0, años = 0, raf = 0;
  // centro y radio (mundo) para el zoom, sin esperar a preparar()
  const PW0 = POLI_HUMEDAL_BAV.map(p => lw(p[0], p[1])); let CX = 0, CZ = 0; for (const p of PW0) { CX += p[0]; CZ += p[1]; } CX /= PW0.length; CZ /= PW0.length;
  const RADIO = Math.round(Math.max(...PW0.map(p => Math.hypot(p[0] - CX, p[1] - CZ))) + 10);
  /* áreas precalculadas con el mismo campo (node, rejilla de 1 m): se reemplazan por las de la corrida al terminar preparar() */
  let AREA = { ha: 1.03, agua: 0.51, vegetacion: 0.51, celdas: 6, huella: 2.04, orillas: 1.02, estimada: true };

  /* ---------- trabajo en ratos libres (≤ 8 ms por trozo) ---------- */
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 500 }) : setTimeout(() => f({ didTimeout: true, timeRemaining: () => 8 }), 16));
  const correr = (gen) => new Promise((res, rej) => { const paso = (dl) => { const t0 = performance.now();
    try { while (performance.now() - t0 < 8 && (dl.didTimeout || dl.timeRemaining() > 1)) { const r = gen.next(); if (r.done) return res(r.value); } } catch (e) { return rej(e); } idle(paso); }; idle(paso); });

  /* ---------- texturas pintadas ---------- */
  let sd = 4711; const rnd = () => ((sd = Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const lienzo = (f) => { const S2 = 256, cv = document.createElement('canvas'); cv.width = cv.height = S2; f(cv.getContext('2d'), S2); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const pintarPradera = (g, S2) => { g.fillStyle = '#5b7a34'; g.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 40; i++) { const x = rnd() * S2, y = rnd() * S2, r = 10 + rnd() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < 0.5 ? 'rgba(58,78,32,.5)' : 'rgba(126,140,64,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const C = ['#5d7c33', '#6e8a3a', '#47632a', '#7f9447', '#8f9158', '#6a8a3c', '#53722e'];
    for (let i = 0; i < 9000; i++) { const x = rnd() * S2, y = rnd() * S2, l = 1 + rnd() * 3.5, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9; g.strokeStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.5 + rnd() * 0.5; g.lineWidth = 0.6 + rnd() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.globalAlpha = 1; };
  const pintarGrava = (g, S2) => { g.fillStyle = '#a59c8a'; g.fillRect(0, 0, S2, S2); const C = ['#bdb4a2', '#8d8474', '#c9c1b0', '#9a907d', '#776f61', '#d6cfbf'];
    for (let i = 0; i < 7000; i++) { g.fillStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.6 + rnd() * 0.4; const r = 0.5 + rnd() * 1.6; g.beginPath(); g.ellipse(rnd() * S2, rnd() * S2, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; };

  /* ---------- el plano del humedal: un sombreador pinta celdas, diques, orillas, senderos, agua y flotantes ---------- */
  const U = { uF: { value: null }, uBox: { value: new THREE.Vector4() }, uT: UT, uObra: { value: 0 }, uAgua: { value: 0 }, uVeg: { value: 0 }, uNrm: { value: null }, uPra: { value: null }, uGra: { value: null },
    uSem: { value: SEM.map(() => new THREE.Vector2()) }, uSol: { value: new THREE.Vector3(0.55, 0.7, 0.45).normalize() } };
  const FS = `uniform sampler2D uF, uNrm, uPra, uGra; uniform vec4 uBox; uniform float uT, uObra, uAgua, uVeg; uniform vec2 uSem[NS_]; uniform vec3 uSol; varying vec3 vW;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
    vec3 L(vec3 c){ return pow(c, vec3(2.2)); }
    void main(){
      vec2 uv = (vW.xz - uBox.xy) * uBox.zw; vec4 f = texture2D(uF, uv);
      float D = f.r * 255.0 - 1.0, dc = f.b * 255.0 / 8.0, W = (f.a * 255.0 - 128.0) / 4.0;
      if (D < -0.6 + 0.9 * h2(floor(vW.xz * 1.5))) discard; // solo el borde de TIERRA (sendero) se deshace en puntos; el agua nunca llega al borde
      // celda (semilla más cercana) y distancia al dique (bisectriz con la segunda más cercana)
      float d1 = 1e9, d2 = 1e9, k = 0.0; vec2 s1 = vec2(0.0), s2 = vec2(0.0);
      for (int i = 0; i < NS_; i++) { float d = distance(vW.xz, uSem[i]); if (d < d1) { d2 = d1; s2 = s1; d1 = d; s1 = uSem[i]; k = float(i); } else if (d < d2) { d2 = d; s2 = uSem[i]; } }
      float dBis = (d2 * d2 - d1 * d1) / (2.0 * max(distance(s1, s2), 0.01));
      float nz = vn(vW.xz * 0.08), cav = step(k + 0.35 + 0.3 * vn(vW.xz * 0.05), uObra * (float(NS_) + 0.4)); // ¿ya se excavó esta celda?
      vec3 pra = mix(texture2D(uPra, vW.xz / 7.0).rgb, texture2D(uPra, vW.xz / 29.0 + 0.3).rgb, 0.45) * (0.92 + 0.18 * nz);
      vec3 tierra = L(vec3(0.42, 0.34, 0.25)) * (0.82 + 0.36 * vn(vW.xz * 0.5));
      vec3 barro = L(vec3(0.27, 0.22, 0.17)) * (0.85 + 0.3 * vn(vW.xz * 0.7));
      vec3 grava = texture2D(uGra, vW.xz / 3.0).rgb;
      // antes de la obra: el prado del parque; en obra: tierra y barro; con el año la orilla verdea
      vec3 orilla = mix(tierra, pra * mix(vec3(1.0), vec3(1.1, 1.06, 0.84), smoothstep(0.6, 0.85, vn(vW.xz * 0.05 + 7.0))), uVeg);
      float fl = smoothstep(0.35, 0.9, uVeg) * smoothstep(-9.0, -1.2, W) * (1.0 - smoothstep(-0.2, 0.4, W));
      float pf = step(0.982 - 0.03 * fl, h2(floor(vW.xz * 3.1))) * step(0.01, fl); // botoncillo (amarillo) y algunas blancas junto al agua
      orilla = mix(orilla, h2(floor(vW.xz * 3.1) + 7.0) < 0.78 ? L(vec3(0.96, 0.8, 0.12)) : L(vec3(0.94, 0.93, 0.86)), pf);
      vec3 c = mix(pra, orilla, step(0.01, uObra));
      if (W > -0.3) c = mix(c, mix(barro, mix(barro, pra * vec3(0.7, 0.8, 0.55), 0.5 * uVeg), step(W, 0.8)), cav);
      // senderos: grava en el anillo de afuera; tierra apisonada sobre los diques
      float obraOk = smoothstep(0.3, 0.7, uObra);
      c = mix(c, grava, obraOk * (1.0 - smoothstep(2.6, 3.3, D)));
      float dique = obraOk * step(W, -0.4) * (1.0 - smoothstep(0.55, 0.95, abs(dBis))) * step(BANCO_, D);
      c = mix(c, L(vec3(0.55, 0.47, 0.36)) * (0.9 + 0.2 * vn(vW.xz * 2.0)), dique);
      // suelo mojado junto al agua
      float umbral = mix(7.0, 0.0, uAgua);
      c *= 1.0 - 0.3 * step(0.001, uAgua) * smoothstep(umbral - 2.5, umbral, W);
      float a = step(0.001, uAgua) * smoothstep(umbral - 0.15, umbral + 0.35, W);
      if (a > 0.0) {
        float hondo = smoothstep(0.0, k < 0.5 ? 7.0 : 11.0, W - umbral);
        vec2 q1 = vW.xz / 19.0 + vec2(uT * 0.011, uT * 0.006), q2 = vW.xz / 7.0 - vec2(uT * 0.017, -uT * 0.012);
        float flujo = 1.0 - smoothstep(0.8, 2.2, dc); // en el cauce el agua corre: ondas más vivas y rápidas
        vec2 q3 = vW.xz / 3.5 + vec2(uT * 0.09, uT * 0.05);
        vec3 n1 = texture2D(uNrm, q1).rgb * 2.0 - 1.0, n2 = texture2D(uNrm, q2).rgb * 2.0 - 1.0, n3 = texture2D(uNrm, q3).rgb * 2.0 - 1.0;
        vec3 N = normalize(vec3((n1.x + n2.x + n3.x * flujo) * 0.09, 1.0, (n1.y + n2.y + n3.y * flujo) * 0.09));
        vec3 V = normalize(cameraPosition - vW);
        float fr = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 base = mix(L(vec3(0.27, 0.35, 0.25)), L(vec3(0.10, 0.26, 0.25)), hondo);
        vec3 cielo = L(vec3(0.66, 0.76, 0.82));
        float sp = pow(max(dot(reflect(-V, N), uSol), 0.0), 180.0);
        vec3 w = mix(base, cielo, clamp(fr * 0.85, 0.0, 0.6)) + vec3(1.0, 0.97, 0.9) * sp * 1.4;
        w = mix(w, L(vec3(0.24, 0.32, 0.18)), (1.0 - smoothstep(0.0, 1.6, W - umbral)) * 0.5); // orilla con algas
        // flotantes: lenteja de agua (verde lima, fina) y buchón cucharita (rosetas brillantes); el cauce queda despejado
        float cov = uVeg * (k > 2.5 && k < 3.5 ? 0.8 : k > 3.5 && k < 4.5 ? 0.14 : k > 0.5 ? 0.3 * (1.0 - smoothstep(0.5, 3.0, W)) : 0.0) * smoothstep(1.4, 2.6, dc);
        float len = step(1.0 - cov, vn(vW.xz * 0.32 + 3.0) * 0.75 + vn(vW.xz * 1.7) * 0.25);
        vec3 lent = L(vec3(0.55, 0.68, 0.18)) * (0.8 + 0.4 * h2(floor(vW.xz * 9.0)));
        vec2 g = vW.xz / 0.75, id = floor(g), fr2 = fract(g) - 0.5 - (vec2(h2(id), h2(id + 3.1)) - 0.5) * 0.5;
        float ros = (1.0 - smoothstep(0.16, 0.3, length(fr2))) * step(1.0 - cov * 0.9, vn(vW.xz * 0.21 + 9.0)) * step(2.5, k) * step(k, 3.5);
        vec3 buch = L(vec3(0.20, 0.42, 0.16)) * (0.75 + 0.5 * h2(id)) + vec3(0.9) * pow(max(dot(reflect(-V, vec3(0.0, 1.0, 0.0)), uSol), 0.0), 40.0) * 0.25;
        w = mix(w, lent, len * 0.92); w = mix(w, buch, ros);
        c = mix(c, w, a);
      }
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`.replace('BANCO_', BANCO.toFixed(1));
  const matH = new THREE.ShaderMaterial({ uniforms: U, defines: { NS_: NS }, toneMapped: false, transparent: false, depthWrite: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: FS });

  /* ---------- plantas en 3D: eneas (Typha) y juncos (Schoenoplectus), como geoJunco de propuesta01_3d.js ---------- */
  function geoEnea() { const P = [], C = [];
    for (let b = 0; b < 11; b++) { const a = b / 11 * 6.283 + (b % 3) * 0.6, r = 0.1 + (b % 4) * 0.05, h = 1.6 + ((b * 37) % 10) / 10 * 0.9, inc = 0.1 + ((b * 13) % 7) / 7 * 0.25, w = 0.05;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, tx = bx + Math.cos(a) * h * inc, tz = bz + Math.sin(a) * h * inc, px = -Math.sin(a) * w, pz = Math.cos(a) * w, mx = (bx + tx) / 2, mz = (bz + tz) / 2;
      P.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, mx + px * 0.8, h * 0.5, mz + pz * 0.8, bx - px, 0, bz - pz, mx + px * 0.8, h * 0.5, mz + pz * 0.8, mx - px * 0.8, h * 0.5, mz - pz * 0.8,
        mx - px * 0.8, h * 0.5, mz - pz * 0.8, mx + px * 0.8, h * 0.5, mz + pz * 0.8, tx, h, tz);
      const c0 = [0.22, 0.3, 0.12], c1 = [0.4, 0.5, 0.2], c2 = b % 4 === 0 ? [0.66, 0.6, 0.36] : [0.5, 0.58, 0.26]; C.push(...c0, ...c0, ...c1, ...c0, ...c1, ...c1, ...c1, ...c1, ...c2); }
    for (let s = 0; s < 3; s++) { const a = s * 2.1 + 0.4, x = Math.cos(a) * 0.08, z = Math.sin(a) * 0.08, y1 = 1.55 + s * 0.18, y2 = y1 + 0.32, e = 0.045; // espigas cafés de la enea
      P.push(x - e, y1, z, x + e, y1, z, x + e, y2, z, x - e, y1, z, x + e, y2, z, x - e, y2, z, x, y1, z - e, x, y1, z + e, x, y2, z + e, x, y1, z - e, x, y2, z + e, x, y2, z - e, x - 0.01, y2, z, x + 0.01, y2, z, x, y2 + 0.2, z);
      for (let k = 0; k < 12; k++) C.push(0.33, 0.19, 0.09); C.push(0.5, 0.45, 0.3, 0.5, 0.45, 0.3, 0.5, 0.45, 0.3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }
  function geoJunco() { const P = [], C = [];
    for (let b = 0; b < 14; b++) { const a = b / 14 * 6.283 + (b % 3) * 0.7, r = 0.05 + (b % 5) * 0.04, h = 1.3 + ((b * 29) % 10) / 10 * 1.0, inc = 0.04 + ((b * 11) % 7) / 7 * 0.12, w = 0.018;
      const bx = Math.cos(a) * r, bz = Math.sin(a) * r, tx = bx + Math.cos(a) * h * inc, tz = bz + Math.sin(a) * h * inc, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      P.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz); C.push(0.2, 0.28, 0.13, 0.2, 0.28, 0.13, ...(b % 3 ? [0.36, 0.48, 0.28] : [0.42, 0.52, 0.34]));
      if (b % 3 === 1) { const hx = bx + (tx - bx) * 0.9, hz = bz + (tz - bz) * 0.9, y = h * 0.9, e = 0.05; P.push(hx - e, y, hz, hx + e, y + 0.02, hz, hx, y + 0.12, hz + e * 0.5); C.push(0.42, 0.28, 0.14, 0.42, 0.28, 0.14, 0.5, 0.36, 0.2); } } // panículas
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals(); return g; }
  const matPl = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  let imEnea = null, imJunco = null, LE = null, LJ = null, ultG = -1;
  function* armarPlantas() { // listas [x, z, clave, escala] en rejilla de 1,7 m con jitter, según la celda y W
    const E = [], J = [], R = (() => { let s = 91; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), paso = MOV ? 2.2 : 1.7;
    for (let x = campo.x0; x < campo.x0 + campo.W; x += paso) { for (let z = campo.z0; z < campo.z0 + campo.H; z += paso) {
      const px = x + (R() - 0.5) * paso, pz = z + (R() - 0.5) * paso, q = campo.en(px, pz); if (q < 0) continue; const W = campo.Wv[q], k = campo.Kv[q], dc = campo.Cv[q]; if (W < -1.2) continue;
      const r = R(); let L = null;
      if (k === 1 && W > 0.2 && dc > 2.4 && r < 0.82) L = E;                         // celda de eneas: densa, con el cauce despejado
      else if (k === 2 && W > 0.2 && dc > 2.4 && r < 0.82) L = J;                    // celda de juncos
      else if (k === 5 && W > -1.2 && W < 4.5 && dc > 2.2 && r < 0.6) L = r < 0.3 ? E : J;  // hábitat: orla ancha mixta, espejo de agua al centro
      else if (W > -1.2 && W < 2.2 && dc > 2.0 && r < (k === 0 ? 0.22 : k === 3 ? 0.3 : 0.5)) L = r < 0.25 ? E : J; // orlas de las demás
      if (L) L.push(px, pz, hs(px * 0.37, pz * 0.71), 0.75 + 0.5 * hs(pz, px)); }
      yield; }
    LE = new Float32Array(E); LJ = new Float32Array(J);
    imEnea = new THREE.InstancedMesh(geoEnea(), matPl, LE.length / 4); imJunco = new THREE.InstancedMesh(geoJunco(), matPl, LJ.length / 4);
    for (const m of [imEnea, imJunco]) { m.count = 0; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; G.add(m); } }
  function crecerPlantas(g) { if (!imEnea || Math.abs(g - ultG) < 0.01) return; ultG = g;
    for (const [m, L] of [[imEnea, LE], [imJunco, LJ]]) { let n = 0;
      for (let i = 0; i < L.length; i += 4) { const k = L[i + 2]; if (k > g * 1.15) continue; const e = Math.min(1, (g * 1.15 - k) * 3) * L[i + 3];
        O.position.set(L[i], YP - 0.05, L[i + 1]); O.rotation.set(0, k * 6.283, 0); O.scale.set(e * 1.3, e, e * 1.3); O.updateMatrix(); m.setMatrixAt(n++, O.matrix); }
      m.count = n; m.instanceMatrix.needsUpdate = true; } }

  /* ---------- aves (mismo método que data3d/aves3d.js: elipsoides con color por vértice; alas que se doblan en el sombreador) ---------- */
  const lin = (c) => c.map(v => Math.pow(v, 2.2)), mez = (a, b, t) => a.map((v, i) => v + (b[i] - v) * sat(t)), pasoS = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const elip = (cx, cy, cz, rx, ry, rz, col, o = {}) => { const g = new THREE.SphereGeometry(1, o.w || 9, o.h || 6).toNonIndexed(), p = g.attributes.position, c = new Float32Array(p.count * 3);
    const cp = Math.cos(o.pitch || 0), sp = Math.sin(o.pitch || 0);
    for (let i = 0; i < p.count; i++) { const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i), k = lin(typeof col === 'function' ? col(ux, uy, uz) : col); c.set(k, i * 3);
      let y = uy * ry, z = uz * rz; const y2 = y * cp - z * sp, z2 = y * sp + z * cp; p.setXYZ(i, ux * rx + cx, y2 + cy, z2 + cz); }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aW', new THREE.BufferAttribute(new Float32Array(p.count), 1)); g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g; };
  const ala = (lado, env, r0, cuerda, colF, amp) => { const P = [], C = [], A = [];
    for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6, seg = (t) => { const x = lado * (r0 + (env - r0) * t), ch = cuerda * (1 - 0.6 * t * t), sw = 0.2 * t * t * env; return [[x, 0, ch * 0.4 - sw], [x, 0, -ch * 0.6 - sw]]; };
      const [a0, b0] = seg(t0), [a1, b1] = seg(t1); P.push(...a0, ...b0, ...a1, ...b0, ...b1, ...a1); const c0 = lin(colF(t0)), c1 = lin(colF(t1)); C.push(...c0, ...c0, ...c1, ...c0, ...c1, ...c1); A.push(amp, amp, amp, amp, amp, amp); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aW', new THREE.Float32BufferAttribute(A, 1)); return g; };
  const unir = (gs) => { let n = 0; for (const g of gs) n += g.attributes.position.count; const P = new Float32Array(n * 3), C = new Float32Array(n * 3), A = new Float32Array(n); let o = 0;
    for (const g of gs) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); A.set(g.attributes.aW.array, o); o += g.attributes.position.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aW', new THREE.BufferAttribute(A, 1)); g.computeVertexNormals(); return g; };
  const NEG = [0.03, 0.03, 0.035], BLA = [0.93, 0.93, 0.9];
  const garzaPie = () => { const o = [0.12, 0.11, 0.1], Y = [0.9, 0.74, 0.14]; return unir([elip(0, 0.62, 0, 0.065, 0.085, 0.2, BLA, { pitch: -0.15 }), elip(0, 0.6, -0.24, 0.025, 0.03, 0.08, BLA),
    elip(0.03, 0.3, 0.02, 0.009, 0.3, 0.009, o, { w: 5, h: 4 }), elip(-0.03, 0.3, 0.02, 0.009, 0.3, 0.009, o, { w: 5, h: 4 }), elip(0, 0.72, 0.17, 0.03, 0.07, 0.03, BLA, { pitch: 0.5 }),
    elip(0, 0.83, 0.21, 0.026, 0.06, 0.026, BLA, { pitch: -0.2 }), elip(0, 0.95, 0.19, 0.024, 0.07, 0.024, BLA, { pitch: 0.3 }), elip(0, 1.075, 0.265, 0.022, 0.024, 0.05, BLA),
    elip(0, 1.065, 0.37, 0.011, 0.011, 0.1, Y), elip(0.075, 0.63, -0.02, 0.025, 0.07, 0.2, BLA), elip(-0.075, 0.63, -0.02, 0.025, 0.07, 0.2, BLA)]); };
  const garzaVuelo = () => { const aC = (t) => mez(BLA, [0.8, 0.8, 0.78], t * 0.5); return unir([elip(0, 0, 0, 0.06, 0.07, 0.2, BLA), elip(0, 0.03, 0.2, 0.03, 0.045, 0.07, BLA, { pitch: 0.9 }),
    elip(0, 0.045, 0.27, 0.022, 0.022, 0.045, BLA), elip(0, 0.04, 0.36, 0.01, 0.01, 0.09, [0.9, 0.74, 0.14]), elip(0.02, -0.01, -0.42, 0.008, 0.008, 0.2, [0.12, 0.11, 0.1], { w: 5, h: 4 }),
    elip(-0.02, -0.01, -0.42, 0.008, 0.008, 0.2, [0.12, 0.11, 0.1], { w: 5, h: 4 }), ala(1, 0.82, 0.06, 0.36, aC, 0.9), ala(-1, 0.82, 0.06, 0.36, aC, 0.9)]); };
  const patoVuelo = () => { const aC = (t) => mez([0.4, 0.33, 0.25], [0.14, 0.27, 0.66], pasoS(0.15, 0.3, t) * pasoS(0.6, 0.45, t)); return unir([
    elip(0, 0, 0, 0.09, 0.08, 0.23, (ux, uy) => mez([0.45, 0.22, 0.12], [0.6, 0.4, 0.3], pasoS(0, -0.8, uy))), elip(0, 0.015, 0.3, 0.05, 0.05, 0.065, [0.05, 0.05, 0.06]),
    elip(0, 0.005, 0.37, 0.025, 0.01, 0.045, [0.3, 0.5, 0.78]), ala(1, 0.46, 0.07, 0.2, aC, 0.8), ala(-1, 0.46, 0.07, 0.2, aC, 0.8)]); };
  const nadador = (sp) => { // 'turrio' · 'roja' (tingua de pico rojo) · 'moteada' (tingua moteada, Porphyriops melanops)
    const tu = sp === 'turrio', ro = sp === 'roja';
    const cuerpo = (ux, uy, uz) => tu ? mez([0.42, 0.15, 0.08], [0.58, 0.26, 0.12], 0.3 + pasoS(-0.5, 0.6, uy) * 0.35)
      : ro ? mez(mez([0.13, 0.15, 0.22], [0.22, 0.25, 0.3], pasoS(-0.2, 0.9, uy) * 0.6), [0.9, 0.9, 0.86], pasoS(-0.55, -0.85, uz) * pasoS(0.1, -0.5, uy))
      : mez(mez([0.34, 0.3, 0.2], [0.42, 0.36, 0.24], pasoS(-0.2, 0.9, uy)), [0.95, 0.94, 0.9], Math.abs(ux) > 0.7 && Math.sin(uz * 40) > 0.6 && uy > -0.3 ? 1 : 0); // flancos con motas blancas
    const cab = tu ? [0.04, 0.04, 0.05] : ro ? [0.1, 0.11, 0.16] : [0.2, 0.2, 0.22], pico = tu ? [0.3, 0.5, 0.78] : ro ? [0.82, 0.1, 0.07] : [0.75, 0.8, 0.2];
    const P = [elip(0, 0.075, 0, 0.11, 0.09, 0.24, cuerpo), tu ? elip(0, 0.18, -0.27, 0.025, 0.03, 0.11, [0.1, 0.05, 0.04], { pitch: -0.9 }) : elip(0, 0.12, -0.26, 0.035, 0.03, 0.08, ro ? [0.9, 0.9, 0.86] : [0.3, 0.26, 0.18], { pitch: 0.5 }),
      elip(0, 0.19, 0.19, 0.042, 0.07, 0.045, cab, { pitch: 0.25 }), elip(0, 0.27, 0.22, 0.052, 0.052, 0.064, cab), elip(0, 0.26, 0.29, 0.024, 0.011, 0.05, pico, { pitch: 0.12 }),
      elip(0.035, 0.285, 0.24, 0.008, 0.008, 0.008, NEG, { w: 5, h: 4 }), elip(-0.035, 0.285, 0.24, 0.008, 0.008, 0.008, NEG, { w: 5, h: 4 })];
    if (tu) P.push(elip(0.04, 0.265, 0.235, 0.012, 0.028, 0.036, BLA), elip(-0.04, 0.265, 0.235, 0.012, 0.028, 0.036, BLA)); // mejillas blancas del turrio
    if (ro) P.push(elip(0, 0.3, 0.27, 0.011, 0.024, 0.016, [0.85, 0.1, 0.07])); // escudo rojo
    return unir(P); };
  const monjita = () => unir([elip(0, 0.07, 0, 0.035, 0.04, 0.08, NEG), elip(0, 0.13, 0.05, 0.032, 0.032, 0.035, [0.98, 0.82, 0.1]), elip(0, 0.125, 0.09, 0.008, 0.008, 0.022, NEG),
    elip(0, 0.05, -0.1, 0.012, 0.01, 0.06, NEG, { pitch: 0.4 }), elip(0, 0.0, 0.0, 0.006, 0.04, 0.006, [0.2, 0.18, 0.15], { w: 4, h: 3 })]);
  const matAv = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, side: THREE.DoubleSide });
  matAv.onBeforeCompile = (sh) => { sh.uniforms.uT = UT;
    sh.vertexShader = 'attribute float aW; attribute float aPh; attribute float aAmp; attribute float aFr; uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      if (aW > 0.0) { float ax = abs(position.x), fl = sin(uT * aFr + aPh) * aAmp; transformed.y += fl * aW * (0.5 * ax + 0.7 * ax * ax); transformed.x *= 1.0 - 0.07 * abs(fl); }`); };
  matAv.customProgramCacheKey = () => 'humbav-aves-v1';
  const ESC = 2.5;
  // tipos: [nombre, geometría, máximo de instancias, frecuencia de aleteo]; garza y turrio llevan cupos extra para las que se posan desde el vuelo
  const AV = {}; const NMAX = { garza: 6, garzaV: 4, turrio: 10, patoV: 6, roja: 8, moteada: 6, monjita: 12 };
  const nAv = { garza: 0, garzaV: 0, turrio: 0, patoV: 0, roja: 0, moteada: 0, monjita: 0 };
  let anclaN = null, anclaO = null, perchas = null; // agua honda (nadan), orilla (vadean), eneas (posan)
  function* armarAves() {
    const R = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), N = [], Ov = [];
    for (let t = 0; t < 9000 && (N.length < 160 || Ov.length < 80); t++) { const x = campo.x0 + R() * campo.W, z = campo.z0 + R() * campo.H, q = campo.en(x, z); if (q < 0) continue; const W = campo.Wv[q], k = campo.Kv[q];
      if (W > 3.2 && N.length < 160 && k !== 1 && k !== 2) N.push(x, z, k); else if (W > 0.3 && W < 1.3 && Ov.length < 80 && k !== 1) Ov.push(x, z, k); if (t % 500 === 0) yield; }
    anclaN = new Float32Array(N); anclaO = new Float32Array(Ov);
    const P = []; for (let i = 0; i < LE.length && P.length < 3 * 24; i += 4 * 17) P.push(LE[i], LE[i + 1], i); perchas = new Float32Array(P);
    const defs = [['garza', garzaPie(), NMAX.garza + NMAX.garzaV, 1], ['garzaV', garzaVuelo(), NMAX.garzaV, 5.5], ['turrio', nadador('turrio'), NMAX.turrio + NMAX.patoV, 1], ['patoV', patoVuelo(), NMAX.patoV, 9],
      ['roja', nadador('roja'), NMAX.roja, 1], ['moteada', nadador('moteada'), NMAX.moteada, 1], ['monjita', monjita(), NMAX.monjita, 1]];
    for (const [k, geo, n, fr] of defs) { const ph = new Float32Array(n), am = new Float32Array(n).fill(1), f = new Float32Array(n).fill(fr); for (let i = 0; i < n; i++) ph[i] = i * 2.39;
      geo.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1)); const aA = new THREE.InstancedBufferAttribute(am, 1); aA.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aAmp', aA); geo.setAttribute('aFr', new THREE.InstancedBufferAttribute(f, 1));
      const m = new THREE.InstancedMesh(geo, matAv, n); m.count = 0; m.frustumCulled = false; m.castShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.name = 'humbav_' + k; G.add(m); AV[k] = m; yield; } }
  // vuelo: círculo bajo sobre el humedal (60 %), planeo hasta una celda (15 %), posada en el agua (15 %), despegue (10 %) — todo función del tiempo
  const TV = 46, VA = new THREE.Vector3(), VB = new THREE.Vector3();
  const circulo = (i, t, out) => { const r = 38 + (i % 4) * 9, h = 11 + (i % 3) * 4, w = (9 + (i % 2) * 2) / r * (i % 2 ? 1 : -1), a = i * 1.7 + t * w; return out.set(CX + Math.cos(a) * r, YP + h + Math.sin(t * 0.3 + i) * 1.5, CZ + Math.sin(a) * r); };
  const vuelo = (i, t, ax, az, out) => { const u = ((t / TV + i * 0.137) % 1 + 1) % 1;
    if (u < 0.6) return circulo(i, t, out), 0;
    if (u < 0.75) { circulo(i, t - (u - 0.6) * TV, out); const e = pasoS(0, 1, (u - 0.6) / 0.15); out.x += (ax - out.x) * e; out.z += (az - out.z) * e; out.y += (YP + 0.05 - out.y) * Math.pow(e, 0.7); return e > 0.98 ? 1 : 0.5; }
    if (u < 0.9) return out.set(ax, YP, az), 2;
    circulo(i, t + (1 - u) * TV, out); const e = pasoS(0, 1, (u - 0.9) / 0.1); out.x = ax + (out.x - ax) * e; out.z = az + (out.z - az) * e; out.y = YP + (out.y - YP) * e; return 0.5; };
  const ponerM = (m, j, x, y, z, ry, s) => { O.position.set(x, y, z); O.rotation.set(0, ry, 0); O.scale.setScalar(s); O.updateMatrix(); m.setMatrixAt(j, O.matrix); };
  function moverAves(t) { if (!anclaN || !AV.garza) return; const NN = anclaN.length / 3, NO = anclaO.length / 3; if (!NN || !NO) return;
    // nadadores: bucles lentos alrededor de su ancla en agua honda
    for (const [k, off] of [['turrio', 0], ['roja', 31], ['moteada', 67]]) { const m = AV[k], n = nAv[k];
      for (let j = 0; j < n; j++) { const q = ((j * 7 + off) % NN) * 3, r = 1.2 + (j % 3) * 0.5, w = 0.12 + (j % 4) * 0.03, a = t * w + j * 2.1;
        ponerM(m, j, anclaN[q] + Math.cos(a) * r, YP - 0.02, anclaN[q + 1] + Math.sin(a) * r * 0.8, Math.atan2(-Math.sin(a), Math.cos(a) * 0.8) + (w > 0 ? 0 : Math.PI), ESC); } }
    // garzas vadeando la orilla: caminan despacio, se detienen a pescar
    { const m = AV.garza; for (let j = 0; j < nAv.garza; j++) { const q = ((j * 11) % NO) * 3, s = Math.sin(t * 0.13 + j * 1.9), a = j * 1.3;
      ponerM(m, j, anclaO[q] + Math.cos(a) * s * 2.2, YP - 0.15, anclaO[q + 1] + Math.sin(a) * s * 2.2, Math.cos(t * 0.13 + j * 1.9) > 0 ? Math.atan2(Math.cos(a), Math.sin(a)) : Math.atan2(-Math.cos(a), -Math.sin(a)), ESC); } }
    // voladores (garzas y patos): al posarse aparecen en el agua como garza parada o pato nadando (cupos extra)
    for (const [kv, kp, base] of [['garzaV', 'garza', NMAX.garza], ['patoV', 'turrio', NMAX.turrio]]) { const m = AV[kv], mp = AV[kp], amp = m.geometry.attributes.aAmp, n = nAv[kv];
      for (let j = 0; j < n; j++) { const i = j + (kv === 'patoV' ? 10 : 0), q = kv === 'garzaV' ? ((j * 13 + 5) % NO) * 3 : ((j * 17 + 3) % NN) * 3, ax = kv === 'garzaV' ? anclaO[q] : anclaN[q], az = kv === 'garzaV' ? anclaO[q + 1] : anclaN[q + 1];
        const st = vuelo(i, t, ax, az, VA); vuelo(i, t + 0.08, ax, az, VB);
        const ry = Math.atan2(VB.x - VA.x, VB.z - VA.z);
        if (st === 2) { ponerM(m, j, VA.x, VA.y, VA.z, 0, 0.0001); ponerM(mp, base + j, ax, kv === 'garzaV' ? YP - 0.15 : YP - 0.02, az, i * 1.1 + t * 0.05, ESC); amp.array[j] = 0; }
        else { ponerM(m, j, VA.x, VA.y, VA.z, ry, ESC); ponerM(mp, base + j, ax, YP, az, 0, 0.0001); amp.array[j] = st === 0 ? 1 : 0.35; } }
      for (let j = n; j < NMAX[kv]; j++) ponerM(mp, base + j, CX, YP, CZ, 0, 0.0001);
      amp.needsUpdate = true; m.count = n; mp.count = base + NMAX[kv]; }
    AV.turrio.count = NMAX.turrio + NMAX.patoV; AV.garza.count = NMAX.garza + NMAX.garzaV;
    // nadadores y garzas que aún no llegan: escondidos (los cupos de vuelo van al final)
    for (const [k, b] of [['turrio', NMAX.turrio], ['garza', NMAX.garza]]) for (let j = nAv[k]; j < b; j++) ponerM(AV[k], j, CX, YP, CZ, 0, 0.0001);
    // monjitas en la punta de las eneas (se giran de vez en cuando)
    if (perchas.length) { const m = AV.monjita; for (let j = 0; j < nAv.monjita; j++) { const q = (j % (perchas.length / 3)) * 3, i = perchas[q + 2], e = Math.min(1, (ultG * 1.15 - LE[i + 2]) * 3) * LE[i + 3], h = e * 1.9;
      ponerM(m, j, perchas[q] + 0.08, YP + h, perchas[q + 1], j + (Math.sin(t * 0.7 + j) > 0.7 ? 1.4 : 0), e > 0.4 ? ESC * 0.9 : 0.0001); } m.count = nAv.monjita; }
    AV.roja.count = nAv.roja; AV.moteada.count = nAv.moteada;
    for (const k in AV) AV[k].instanceMatrix.needsUpdate = true; }

  /* ---------- polinizadores sobre las flores de la orilla y libélulas sobre el agua (puntos animados en la tarjeta de video) ---------- */
  const MAXP = MOV ? 360 : 900, MAXL = MOV ? 60 : 140;
  const UI = { uT: UT, uPx: { value: 800 }, uEsc: { value: 3.0 } };
  const matI = new THREE.ShaderMaterial({ uniforms: UI,
    vertexShader: `attribute vec4 aF; uniform float uT, uPx, uEsc; varying vec3 vC;
      void main(){ float fase = aF.x, r = aF.y, v = aF.z, tipo = aF.w, t = uT * v + fase;
        vec3 p = position;
        if (tipo > 3.5) { p += vec3(cos(t) * r + sin(t * 3.1 + fase) * 1.2, 0.5 + 0.35 * sin(t * 2.0), sin(t * 0.8) * r * 0.7 + cos(t * 2.7) * 1.0); vC = fract(fase * 3.7) < 0.5 ? vec3(0.1, 0.45, 0.75) : vec3(0.25, 0.6, 0.2); } // libélula
        else { float posa = smoothstep(0.2, -0.4, sin(t * 0.37 + fase)); // a ratos se posa en una flor
          p += vec3(cos(t) * r + sin(t * 2.3 + fase) * r * 0.45, mix(0.5 + 0.5 * sin(t * 1.7 + fase) + 0.15 * sin(t * 4.1), 0.12, posa), sin(t * 1.3) * r + cos(t * 2.9 + fase) * r * 0.35) * vec3(1.0 - 0.8 * posa, 1.0, 1.0 - 0.8 * posa);
          vC = tipo < 0.5 ? vec3(0.85, 0.58, 0.12) : tipo < 1.5 ? vec3(0.12, 0.1, 0.06) : tipo < 2.5 ? (fract(fase * 7.1) < 0.5 ? vec3(0.9, 0.42, 0.08) : vec3(0.93, 0.92, 0.85)) : vec3(0.75, 0.65, 0.2); }
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float s = tipo < 0.5 ? 0.04 : tipo < 1.5 ? 0.07 : tipo < 2.5 ? 0.1 : tipo < 3.5 ? 0.035 : 0.09;
        gl_PointSize = clamp(s * uEsc * uPx / -mv.z, 1.5, 22.0); }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; if (dot(d, d) > 0.25) discard; gl_FragColor = vec4(vC, 1.0);
      #include <colorspace_fragment>
    }` });
  let ptsP = null, ptsL = null, nPol = 0, nLib = 0;
  function* armarInsectos() { const R = (() => { let s = 17; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const flores = []; for (let t = 0; t < 6000 && flores.length < 2 * 70; t++) { const x = campo.x0 + R() * campo.W, z = campo.z0 + R() * campo.H, q = campo.en(x, z); if (q < 0) continue; const W = campo.Wv[q], D = campo.Dv[q]; if (W < -7 || W > -1.2 || D < 3.8) continue; flores.push(x, z); }
    yield;
    const mk = (n, f) => { const P = new Float32Array(n * 3), F = new Float32Array(n * 4); for (let i = 0; i < n; i++) f(i, P, F); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aF', new THREE.BufferAttribute(F, 4)); g.setDrawRange(0, 0); const p = new THREE.Points(g, matI); p.frustumCulled = false; G.add(p); return p; };
    const NF = flores.length / 2;
    ptsP = mk(MAXP, (i, P, F) => { const k = (i * 7) % NF, h = hs(i * 0.37, i * 1.13); P[i * 3] = flores[k * 2] + (h - 0.5) * 4; P[i * 3 + 1] = YP + 0.2; P[i * 3 + 2] = flores[k * 2 + 1] + (hs(i, h) - 0.5) * 4;
      const ti = h < 0.55 ? 0 : h < 0.7 ? 1 : h < 0.82 ? 2 : 3; F.set([h * 60, ti === 2 ? 2.2 + h : 0.8 + h * 1.5, ti === 2 ? 0.25 + h * 0.2 : 0.5 + h * 0.5, ti], i * 4); });
    yield;
    const NN = anclaN.length / 3;
    ptsL = mk(MAXL, (i, P, F) => { const q = ((i * 5) % NN) * 3, h = hs(i * 1.7, 3.3); P[i * 3] = anclaN[q]; P[i * 3 + 1] = YP + 0.3; P[i * 3 + 2] = anclaN[q + 1]; F.set([h * 50, 3 + h * 4, 0.6 + h * 0.6, 4], i * 4); }); }

  /* ---------- construcción (escondida) ---------- */
  function preparar() {
    if (prom) return prom;
    prom = (async () => {
      const AJ = await cargar('data3d/bavaria_arboles.json?v=3').then(j => j.arboles || []).catch(() => []);
      const nrm = new THREE.TextureLoader().load('data3d/waternormals.jpg'); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; U.uNrm.value = nrm;
      campo = await correr(generarCampo({ lw, arboles: AJ, CEL: 1 }));
      await correr((function* () {
        U.uPra.value = lienzo(pintarPradera); yield; U.uGra.value = lienzo(pintarGrava); yield;
        const tex = new THREE.DataTexture(campo.dat, campo.NX, campo.NZ, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true; campo.tex = tex;
        U.uF.value = tex; U.uBox.value.set(campo.x0, campo.z0, 1 / campo.W, 1 / campo.H); campo.SW.forEach((s, i) => U.uSem.value[i].set(s[0], s[1]));
        const hum = new THREE.Mesh(new THREE.PlaneGeometry(campo.W, campo.H).rotateX(-Math.PI / 2).translate(campo.x0 + campo.W / 2, YP, campo.z0 + campo.H / 2), matH);
        hum.frustumCulled = false; hum.renderOrder = 2; hum.name = 'humbav_plano'; G.add(hum); yield;
        yield* armarPlantas(); yield* armarAves(); yield* armarInsectos();
      })());
      AREA = { ...campo.AREA }; listo = true;
      if (pendiente != null) { const s = pendiente; pendiente = null; api.poner(s); }
      return api;
    })().catch(e => { console.warn('humedal Bavaria:', e); prom = null; throw e; });
    return prom;
  }

  /* ---------- estado por semana ---------- */
  function aplicar() {
    años = sem / 52; const ver = años >= 2;
    G.visible = visible && ver;
    U.uObra.value = sat(años - 2); U.uAgua.value = sat(años - 3); const gv = sat((años - 3) / 3); U.uVeg.value = gv;
    crecerPlantas(gv);
    const f = sat((años - 3) / 4), f2 = sat((años - 3.5) / 3.5), fm = sat((años - 4) / 3); // llegada de la fauna [SUP]
    nAv.garza = Math.round(NMAX.garza * f); nAv.garzaV = Math.round(NMAX.garzaV * f); nAv.turrio = Math.round(NMAX.turrio * f); nAv.patoV = Math.round(NMAX.patoV * f);
    nAv.roja = Math.round(NMAX.roja * f2); nAv.moteada = Math.round(NMAX.moteada * f2); nAv.monjita = Math.round(NMAX.monjita * fm);
    nPol = Math.round(MAXP * sat((años - 3.3) / 2.7)); nLib = Math.round(MAXL * sat((años - 3.2) / 2.5));
    if (ptsP) { ptsP.geometry.setDrawRange(0, nPol); ptsL.geometry.setDrawRange(0, nLib); }
    UI.uPx.value = T3.renderer.domElement.height / (2 * Math.tan(T3.camera.fov * Math.PI / 360));
    if (G.visible && !raf) raf = requestAnimationFrame(cuadro);
  }
  const T0 = performance.now();
  function cuadro() { raf = 0; if (!visible || !G.visible) return; raf = requestAnimationFrame(cuadro);
    const t = (performance.now() - T0) / 1000; UT.value = t; const cp = T3.camera.position, cerca = (cp.x - CX) ** 2 + (cp.z - CZ) ** 2 < 2200 * 2200 && cp.y < 1600;
    for (const k in AV) AV[k].visible = cerca; if (ptsP) ptsP.visible = ptsL.visible = cerca && cp.y < 900;
    if (cerca) moverAves(t); }

  const api = window.KEN_HUMEDAL_BAV = {
    grupo: G,
    preparar,
    poner(s) { sem = s || 0; visible = true; if (!listo) { pendiente = sem; preparar().catch(() => {}); return; } aplicar(); },
    apagar() { visible = false; pendiente = null; G.visible = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    area() { return { ...AREA }; },
    obra() { return { id: 'humedal_bavaria', n: 'Humedal artificial de fitodepuración · Bavaria', x: CX, z: CZ, radio: RADIO }; },
    /* ¿el punto (mundo) cae en la huella del humedal? (para que otras capas, p. ej. las huertas del distrito, no se monten encima) */
    ocupa(x, z) { return dentro(PW0, x, z); },
    info() { let aves = 0; for (const k in nAv) aves += nAv[k];
      return { listo, visible: visible && G.visible, años: Math.round(años * 100) / 100, aves, porEspecie: { ...nAv }, polinizadores: nPol, libelulas: nLib,
        plantas: { eneas: imEnea ? imEnea.count : 0, juncos: imJunco ? imJunco.count : 0, eneasMax: LE ? LE.length / 4 : 0, juncosMax: LJ ? LJ.length / 4 : 0 },
        uObra: U.uObra.value, uAgua: U.uAgua.value, uVeg: U.uVeg.value, area: { ...AREA }, obra: api.obra(), mascaraG: campo && campo.tex ? 'campo.tex: G > 0,5 = celdas de agua' : null,
        tex: campo ? campo.tex : null, box: campo ? [campo.x0, campo.z0, campo.W, campo.H] : null }; }
  };
  return api;
}
