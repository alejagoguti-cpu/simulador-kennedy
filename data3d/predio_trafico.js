/* ============ PREDIO BAVARIA CON EL PLAN PARCIAL: carros en las vías nuevas y ruido dentro del predio (simulación 4) ============
   Consecuencias del Plan Parcial Bavaria Fábrica (Decreto 448/2023) dentro del predio:
   · CARROS: entran desde la Av. Boyacá (costado oeste, tres accesos con giro a la derecha), la vía del costado sur y la avenida del
     costado noreste, recorren las vías internas del plan y llegan a los sótanos de las manzanas (bajan por la rampa y desaparecen); los que
     salen suben del sótano y vuelven a la avenida. Red calcada sobre las calzadas de data3d/plan_bavaria.json (ejes a mano, ±10 m como
     el plano) con el año en que abre cada tramo; los accesos se apoyan en los carriles de net.json.
     Modelo de seguimiento (cada carro mantiene distancia al de adelante, sin adelantar: cola FIFO por carril) y cupo en los accesos: en
     cada salida a la avenida pasa un carro cada hOut segundos (y cada hIn en las entradas). Con más tráfico (trafico / trafico0) y en
     hora pico el cupo baja y se forma la cola en los accesos (lenta y apretada).
   · RUIDO: capa translúcida sobre el suelo del predio y a lo largo de las vías nuevas, con la rampa del mapa de ruido
     (data3d/ruido_cierre.js: amarillo pálido → naranja → rojo); su intensidad sigue ruidoDb − ruidoDb0 (0 dB invisible, +10 dB rojo fuerte).
     Animada: respira a lo largo de las vías y desde cada acceso salen anillos que se alejan (más fuertes donde hay cola). Siempre se ve
     con ver(true); más fuerte con ruido(true) o con la capa «Ruido de carros» (T3.rc.ruido) encendida.
   · FLUJO DE LEJOS: un punto de luz por carro con estela (cálido si avanza, rojo si está detenido): legible desde la cámara alta.
   · RÓTULO flotante (vidrio) sobre el predio: vehículos/día, ruido +X dB, habitantes, árboles talados; poner() acepta además
     vehiculosDia, habitantes y tala (ind().predio del modelo); si faltan se estiman (tráfico del módulo, KEN_PLANBAV.avance).
   RELOJ: los carros avanzan con RELOJ.dtAnim (tiempo simulado de animación del reloj universal: 0 en pausa, el día a 1× va a 1×, y a
   120×/240×/480× se topa en ×8 como el resto de las animaciones, para que no salten), nunca con performance.now. La demanda por hora
   sale de RELOJ.minutoDia con el mismo perfil de index.html (demandaHora).
   Rendimiento: un InstancedMesh (una llamada de dibujo) para todos los carros, una malla para el ruido, arreglos fijos (sin crear objetos
   por cuadro); la red se arma al primer ver(true)/poner, no al importar. Todo cuelga de un THREE.Group llamado 'predio' (foco.js). */

const DEMANDA_H = [0.06, 0.04, 0.03, 0.03, 0.08, 0.32, 0.78, 0.95, 0.82, 0.62, 0.58, 0.62, 0.72, 0.7, 0.62, 0.66, 0.82, 1.0, 0.97, 0.78, 0.52, 0.36, 0.22, 0.12]; // = index.html
const demandaEn = (min) => { const h = (min / 60) % 24, a = Math.floor(h), f = h - a; return DEMANDA_H[a] + (DEMANDA_H[(a + 1) % 24] - DEMANDA_H[a]) * f; };
const PINTURA = [0xeeeeec, 0xeeeeec, 0xe9e9e6, 0xb9bcc0, 0xb4b7bb, 0xa7abb0, 0x6d7177, 0x5b5f64, 0x141517, 0x101113, 0x8e1416, 0x1d2f5c, 0xc8b89a, 0x4a1219, 0x1f3a2c, 0x2b4a7a, 0xf2c300]; // = vehiculos.js (+ taxi)
const STOPS = [[0, [255, 247, 179]], [0.2, [255, 224, 76]], [0.4, [255, 179, 77]], [0.6, [245, 124, 0]], [0.8, [230, 74, 25]], [1, [211, 47, 47]]]; // = ruido_cierre.js

/* ---------- red: nodos (modelo: x este, y norte) y tramos [a, b, puntos intermedios, tipo, año] ----------
   av: carril de avenida (un sentido) · i: vía interna del plan (doble sentido, año en que abre) · in / out: acceso desde / hacia la avenida */
const NODOS = { B0: [8812, 2380], B1: [8818, 2449], B2: [8833, 2560], B3: [8841, 2645], B4: [8856, 2703], B5: [8872, 2805], B6: [8888, 2856], B7: [8912, 2940], B8: [8967, 3066], B9: [9019, 3148], B10: [9050, 3203], B11: [9099, 3282], B12: [9154, 3366],
  S0: [8950, 2412], S1: [9040, 2402], S2: [9082, 2398], S3: [9178, 2388], S4: [9220, 2404], T0: [9220, 2404], T1: [9178, 2388], T2: [9082, 2398], T3: [9040, 2402], T4: [8950, 2412],
  N0: [9565, 3515], N1: [9608, 3442], N2: [9690, 3305], N3: [9745, 3215], N4: [9801, 3122], N5: [9852, 3040], N6: [9878, 2995], N7: [9893, 2970], N8: [9946, 2910], N9: [9987, 2878],
  a1: [8848, 2450], a2: [8852, 2625], a3: [8866, 2742], a4: [8886, 2834], a5: [8935, 2945], a6: [9000, 3080], a7: [9040, 3150], a8: [9118, 3262], a9: [9190, 3335],
  b1: [8960, 2622], b2: [9070, 2615], s1: [9075, 2432], b3: [9060, 2722], c1: [8990, 2745], c4: [8960, 2836], c2: [9015, 2842], c3: [9020, 2885], c6: [9150, 2885], c7: [9250, 2805],
  e1: [9175, 2714], e2: [9290, 2740], f1: [9400, 2810], f2: [9505, 2905], f3: [9568, 2972], g1: [9180, 3008], g2: [9285, 2966], h1: [9245, 3160], h2: [9285, 3232], h3: [9325, 3295],
  i2: [9470, 3310], n1: [9462, 3455], n2: [9596, 3290], n3: [9668, 3200], n4: [9745, 3100], n5: [9830, 2995], j1: [9360, 3222], j2: [9420, 3172], j3: [9500, 3125] };
const TRAMOS = [['B0', 'B1', [], 'av', 0], ['B1', 'B2', [], 'av', 0], ['B2', 'B3', [], 'av', 0], ['B3', 'B4', [], 'av', 0], ['B4', 'B5', [], 'av', 0], ['B5', 'B6', [], 'av', 0], ['B6', 'B7', [], 'av', 0], ['B7', 'B8', [], 'av', 0], ['B8', 'B9', [], 'av', 0], ['B9', 'B10', [], 'av', 0], ['B10', 'B11', [], 'av', 0], ['B11', 'B12', [], 'av', 0],
  ['S0', 'S1', [], 'av', 0], ['S1', 'S2', [], 'av', 0], ['S2', 'S3', [], 'av', 0], ['S3', 'S4', [], 'av', 0], ['T0', 'T1', [], 'av', 0], ['T1', 'T2', [], 'av', 0], ['T2', 'T3', [], 'av', 0], ['T3', 'T4', [], 'av', 0],
  ['N0', 'N1', [], 'av', 0], ['N1', 'N2', [], 'av', 0], ['N2', 'N3', [], 'av', 0], ['N3', 'N4', [], 'av', 0], ['N4', 'N5', [], 'av', 0], ['N5', 'N6', [], 'av', 0], ['N6', 'N7', [], 'av', 0], ['N7', 'N8', [], 'av', 0], ['N8', 'N9', [], 'av', 0],
  ['a1', 'a2', [], 'i', 10], ['a2', 'a3', [], 'i', 9], ['a3', 'a4', [], 'i', 9], ['a4', 'a5', [[8905, 2888]], 'i', 8], ['a5', 'a6', [[8968, 3012]], 'i', 7], ['a6', 'a7', [], 'i', 7], ['a7', 'a8', [[9075, 3205]], 'i', 7], ['a8', 'a9', [[9155, 3300]], 'i', 6],
  ['a2', 'b1', [], 'i', 9], ['b1', 'b2', [], 'i', 9], ['s1', 'b2', [[9078, 2520]], 'i', 9], ['b2', 'b3', [], 'i', 9], ['a3', 'c1', [], 'i', 9], ['c1', 'b3', [], 'i', 9], ['a4', 'c4', [], 'i', 8], ['c4', 'c2', [], 'i', 8], ['b3', 'c2', [], 'i', 4], ['c2', 'c3', [], 'i', 8],
  ['c3', 'c6', [], 'i', 4], ['c6', 'c7', [[9200, 2845]], 'i', 1], ['b3', 'e1', [], 'i', 3], ['e1', 'e2', [], 'i', 3], ['e2', 'f1', [], 'i', 1], ['f1', 'f2', [], 'i', 1], ['f2', 'f3', [], 'i', 3], ['c6', 'g1', [[9165, 2950]], 'i', 4], ['a6', 'g1', [[9100, 3045]], 'i', 4],
  ['g1', 'g2', [], 'i', 1], ['g1', 'h1', [[9205, 3070]], 'i', 4], ['h1', 'h2', [], 'i', 4], ['h2', 'h3', [], 'i', 5], ['a9', 'h3', [[9260, 3318]], 'i', 5], ['h3', 'i2', [[9345, 3308]], 'i', 5], ['i2', 'n2', [[9540, 3302]], 'i', 5], ['n1', 'n2', [[9530, 3370]], 'i', 6],
  ['n2', 'n3', [], 'i', 5], ['n3', 'n4', [], 'i', 5], ['n4', 'n5', [], 'i', 5], ['h2', 'j1', [], 'i', 3], ['j1', 'j2', [], 'i', 3], ['j2', 'j3', [], 'i', 3],
  ['B2', 'a2', [[8846, 2610]], 'in', 0], ['a2', 'B3', [[8846, 2636]], 'out', 0], ['B5', 'a4', [], 'in', 0], ['a4', 'B6', [], 'out', 0], ['B9', 'a7', [], 'in', 0], ['a7', 'B10', [], 'out', 0],
  ['S1', 's1', [[9056, 2418]], 'in', 0], ['T2', 's1', [[9068, 2416]], 'in', 0], ['s1', 'S2', [[9070, 2414]], 'out', 0], ['s1', 'T3', [[9054, 2414]], 'out', 0],
  ['N2', 'n3', [[9672, 3248]], 'in', 0], ['n3', 'N3', [[9705, 3228]], 'out', 0], ['N5', 'n5', [[9846, 3012]], 'in', 0], ['n5', 'N7', [[9872, 2980]], 'out', 0]];
const FUENTES = [['B0', 0.42], ['S0', 0.12], ['T0', 0.12], ['N0', 0.34]];   // de dónde llegan (peso)
const SUMIDEROS = [['B12', 0.42], ['S4', 0.12], ['T4', 0.12], ['N9', 0.34]]; // a dónde se van
const SOTANOS = ['a1', 'c7', 'f3', 'g2', 'j3', 'n1'];                        // fondos de vía: rampas a los sótanos de las manzanas

const GATES = ['a2', 'a4', 'a7', 's1', 'n3', 'n5'];                         // nodos internos de los accesos (anillos de ruido)
const LARGO = 4.6, CARRIL = 1.75, NMAX = 420, V_AV = 11, V_INT = 8, V_ACC = 5;
const CSS_ROT = `.predio-rot{position:fixed;left:0;top:0;z-index:30;pointer-events:none;transform:translate(-9999px,0);will-change:transform;
  min-width:186px;padding:10px 13px 11px;border-radius:12px;background:rgba(16,20,26,.58);-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);
  border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 30px rgba(0,0,0,.32);color:#eef1f3;font:400 12px/1.35 Geist,Inter,system-ui,sans-serif}
.predio-rot h6{margin:0 0 7px;font:600 9.5px/1.2 Geist,Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#aab3b9}
.predio-rot .f{display:flex;justify-content:space-between;gap:14px;align-items:baseline;padding:2px 0}
.predio-rot .f span{color:#b9c1c6;font-size:11.5px}.predio-rot .f b{font-weight:600;font-variant-numeric:tabular-nums;font-size:14px;color:#fff;letter-spacing:-.01em}
.predio-rot .f b.r{color:#ffb15c}.predio-rot::after{content:'';position:absolute;left:50%;bottom:-7px;width:1px;height:7px;background:rgba(255,255,255,.4)}
@media (max-width:640px){.predio-rot{min-width:150px;padding:8px 10px;font-size:11px}.predio-rot .f b{font-size:12.5px}}`;

export function crearPredio({ T3, RELOJ }) {
  const THREE = T3.THREE;
  RELOJ = RELOJ || window.KEN_RELOJ;
  const grupo = new THREE.Group(); grupo.name = 'predio'; grupo.visible = false; T3.scene.add(grupo);
  let listo = false, visible = false, ruidoOn = false;
  const est = { trafico: 1, trafico0: 1, ruidoDb: 0, ruidoDb0: 0, vias: undefined, sem: 0 };
  let ratio = 1, uRuido = 0, firmaRed = '', puesto = false, calentado = false;

  // ---------- estructuras (se llenan en armar) ----------
  let NL = 0, lnX, lnZ, lnCum, lnOff, lnN, lnLen, lnTipo, lnV, lnY0, lnY1, lnHIni, lnHFin, lnTramo, lnAbierto;
  let qBuf, qIni, qCap, qHead, qLen, lnUlt; // colas FIFO por carril (ids de carro)
  const rutas = [], rutaTasa = [], rutaAcc = [], rutaIni = [], rutaFin = []; // ruta: Int16Array de carriles
  const cAct = new Uint8Array(NMAX), cRuta = new Int16Array(NMAX), cLeg = new Int16Array(NMAX), cSeg = new Int16Array(NMAX), cS = new Float32Array(NMAX), cV = new Float32Array(NMAX);
  const cEx = new Float32Array(NMAX), cEz = new Float32Array(NMAX), cEd = new Float32Array(NMAX), cH = new Float32Array(NMAX);
  let nAct = 0, alto = 0, malla = null, ruidoM = null, uI = null, tAnim = 0, puntos = null, lnGate = null, rotulo = null, tRuido = 0;
  const uT = { value: 0 }, uJ = { value: 0 }, uLejos = { value: 0 }, uEsc = { value: 800 }, uGate = { value: GATES.map(() => new THREE.Vector3()) };
  const pPos = new Float32Array(NMAX * 9), pV = new Float32Array(NMAX * 3), pA = new Float32Array(NMAX * 3);
  const ancla = new THREE.Vector3(), proy = new THREE.Vector3(), paradosG = new Float32Array(GATES.length);
  const yInt = () => (T3.sueloY != null ? T3.sueloY : 0.3) + 0.24, yAv = () => (T3.viaY != null ? T3.viaY : 0.62) + 0.02;

  /* ---------- geometría del carro: sedán de pocos polígonos con la silueta de vehiculos.js (4,5 m, frente hacia +z) ---------- */
  function geoCarro() {
    const partes = [];
    const extr = (pts, ancho, col) => { const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
      const g = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -ancho / 2); g.rotateY(-Math.PI / 2); partes.push([g, col]); };
    const b = [[-2.22, 0.30], [2.18, 0.30], [2.25, 0.42], [2.27, 0.58], [2.21, 0.70], [1.98, 0.78], [1.42, 0.86], [0.86, 0.92], [-1.48, 0.96], [-2.04, 0.93], [-2.21, 0.84], [-2.26, 0.62], [-2.25, 0.42]];
    extr(b, 1.78, (x, y) => { const k = 0.62 + 0.38 * Math.min(1, Math.max(0, (y - 0.3) / 0.45)); return [k, k, k]; });
    extr([[0.95, 0.90], [0.18, 1.39], [-0.86, 1.43], [-1.62, 0.95]], 1.56, () => [0.055, 0.062, 0.07]);
    extr([[0.16, 1.37], [-0.84, 1.41], [-0.84, 1.45], [0.16, 1.41]], 1.5, () => [0.9, 0.9, 0.9]); // techo del color del carro
    for (const z of [1.36, -1.34]) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 10); g.rotateZ(Math.PI / 2); g.translate(s * 0.78, 0.31, z); partes.push([g, () => [0.045, 0.045, 0.05]]); }
    partes.push([new THREE.BoxGeometry(1.5, 0.12, 0.05).translate(0, 0.55, 2.27), () => [0.06, 0.06, 0.06]]); // parrilla
    let n = 0; const gs = partes.map(([g, col]) => { const q = g.index ? g.toNonIndexed() : g; if (q !== g) g.dispose(); if (!q.attributes.normal) q.computeVertexNormals(); n += q.attributes.position.count; return [q, col]; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const [g, col] of gs) { const p = g.attributes.position, nn = g.attributes.normal;
      for (let i = 0; i < p.count; i++, o++) { P.set([p.getX(i), p.getY(i), p.getZ(i)], o * 3); N.set([nn.getX(i), nn.getY(i), nn.getZ(i)], o * 3); C.set(col(p.getZ(i), p.getY(i)), o * 3); } g.dispose(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return geo;
  }

  /* ---------- armar la red (una vez) ---------- */
  function armar() {
    if (listo) return; listo = true;
    const W = (p) => T3.lw(p[0], p[1]);
    const esAv = (k) => /^[BSTN]\d/.test(k);
    const car = []; // carriles: { pts:[[x,z]], tipo, tramo, a, b }
    TRAMOS.forEach((t, ti) => {
      const pts = [NODOS[t[0]], ...t[2], NODOS[t[1]]].map(W);
      car.push({ pts, tipo: t[3], tramo: ti, a: t[0], b: t[1] });
      if (t[3] === 'i') car.push({ pts: pts.slice().reverse(), tipo: 'i', tramo: ti, a: t[1], b: t[0] });
    });
    NL = car.length; let nv = 0; for (const c of car) nv += c.pts.length;
    lnX = new Float32Array(nv); lnZ = new Float32Array(nv); lnCum = new Float32Array(nv); lnOff = new Int32Array(NL); lnN = new Int16Array(NL); lnLen = new Float32Array(NL);
    lnTipo = new Uint8Array(NL); lnV = new Float32Array(NL); lnY0 = new Uint8Array(NL); lnY1 = new Uint8Array(NL); lnHIni = new Float32Array(NL); lnHFin = new Float32Array(NL); lnTramo = new Int16Array(NL); lnAbierto = new Uint8Array(NL);
    let o = 0;
    car.forEach((c, l) => {
      const P = c.pts, n = P.length; lnOff[l] = o; lnN[l] = n; lnTramo[l] = c.tramo;
      lnTipo[l] = { av: 0, i: 1, in: 2, out: 3 }[c.tipo]; lnV[l] = c.tipo === 'av' ? V_AV : c.tipo === 'i' ? V_INT : V_ACC;
      lnY0[l] = esAv(c.a) ? 1 : 0; lnY1[l] = esAv(c.b) ? 1 : 0;
      for (let i = 0; i < n; i++) { // desplazado al carril de la derecha (normal promedio en los vértices)
        let dx = 0, dz = 0;
        if (i > 0) { const ax = P[i][0] - P[i - 1][0], az = P[i][1] - P[i - 1][1], L = Math.hypot(ax, az) || 1; dx += ax / L; dz += az / L; }
        if (i < n - 1) { const ax = P[i + 1][0] - P[i][0], az = P[i + 1][1] - P[i][1], L = Math.hypot(ax, az) || 1; dx += ax / L; dz += az / L; }
        const L = Math.hypot(dx, dz) || 1; lnX[o + i] = P[i][0] - dz / L * CARRIL; lnZ[o + i] = P[i][1] + dx / L * CARRIL;
        lnCum[o + i] = i ? lnCum[o + i - 1] + Math.hypot(lnX[o + i] - lnX[o + i - 1], lnZ[o + i] - lnZ[o + i - 1]) : 0;
      }
      lnLen[l] = lnCum[o + n - 1];
      lnHIni[l] = Math.atan2(lnX[o + 1] - lnX[o], lnZ[o + 1] - lnZ[o]); lnHFin[l] = Math.atan2(lnX[o + n - 1] - lnX[o + n - 2], lnZ[o + n - 1] - lnZ[o + n - 2]);
      o += n;
    });
    let tot = 0; qIni = new Int32Array(NL); qCap = new Int32Array(NL); for (let l = 0; l < NL; l++) { qIni[l] = tot; qCap[l] = Math.ceil(lnLen[l] / 5.5) + 3; tot += qCap[l]; }
    qBuf = new Int16Array(tot); qHead = new Int32Array(NL); qLen = new Int32Array(NL); lnUlt = new Float32Array(NL).fill(-1e9);
    armar.car = car;

    // malla de carros: una sola InstancedMesh
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.3 });
    if (T3.env) { mat.envMap = T3.env; mat.envMapIntensity = 0.7; }
    malla = new THREE.InstancedMesh(geoCarro(), mat, NMAX); malla.count = 0; malla.frustumCulled = false; malla.castShadow = !T3.liviano; malla.receiveShadow = false;
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage); malla.name = 'predio-carros';
    const col = new THREE.Color(); for (let i = 0; i < NMAX; i++) { const h = ((i * 2654435761) >>> 0) / 4294967296; col.setHex(PINTURA[Math.floor(h * PINTURA.length)]); malla.setColorAt(i, col); }
    malla.instanceColor.needsUpdate = true; const A = malla.instanceMatrix.array; A.fill(0);
    grupo.add(malla);

    // capa de ruido: un plano con un campo (vías y predio) pintado en un lienzo; el color sale de la rampa en el sombreador
    const PL = window.KEN_PLANBAV && window.KEN_PLANBAV.datos;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const k in NODOS) { const w = W(NODOS[k]); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[1]); z1 = Math.max(z1, w[1]); }
    x0 -= 60; x1 += 60; z0 -= 60; z1 += 60;
    const cv = document.createElement('canvas'), RES = 2.5; cv.width = Math.ceil((x1 - x0) / RES); cv.height = Math.ceil((z1 - z0) / RES);
    armar.lienzo = { cv, x0, z0, RES, borde: PL ? PL.borde.map(W) : null };
    const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; armar.tex = tex;
    const ramp = STOPS.map(s => `vec3(${(s[1][0] / 255).toFixed(3)},${(s[1][1] / 255).toFixed(3)},${(s[1][2] / 255).toFixed(3)})`);
    uI = { value: 0 };
    /* ruido animado: el campo (vías R, predio G) respira con una ondulación que corre por las vías, y desde cada acceso salen anillos
       que se alejan (más fuertes y rápidos donde hay cola). uGate: x, z, fuerza de cada acceso; uT: tiempo de la animación. */
    for (let k = 0; k < GATES.length; k++) { const w = W(NODOS[GATES[k]]); uGate.value[k].set(w[0], w[1], 0); }
    const mR = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
      uniforms: { uTex: { value: tex }, uI, uT, uGate, uJ, uLejos, uBox: { value: new THREE.Vector4(x0, z0, x1 - x0, z1 - z0) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D uTex; uniform float uI, uT, uJ, uLejos; uniform vec3 uGate[${GATES.length}]; uniform vec4 uBox; varying vec2 vUv;
        vec3 rampa(float t){ t = clamp(t, 0.0, 1.0);
          if (t < 0.2) return mix(${ramp[0]}, ${ramp[1]}, t / 0.2); if (t < 0.4) return mix(${ramp[1]}, ${ramp[2]}, (t - 0.2) / 0.2);
          if (t < 0.6) return mix(${ramp[2]}, ${ramp[3]}, (t - 0.4) / 0.2); if (t < 0.8) return mix(${ramp[3]}, ${ramp[4]}, (t - 0.6) / 0.2); return mix(${ramp[4]}, ${ramp[5]}, (t - 0.8) / 0.2); }
        void main(){ vec4 f = texture2D(uTex, vUv); float m = max(f.r, f.g * 0.12);
          if (m * uI < 0.004) discard;
          vec2 p = vec2(uBox.x + vUv.x * uBox.z, uBox.y + (1.0 - vUv.y) * uBox.w);
          float ond = 0.5 + 0.5 * sin(p.x * 0.045 + uT * 1.4) * sin(p.y * 0.04 - uT * 1.1); // respiración a lo largo de las vías
          float an = 0.0;
          for (int k = 0; k < ${GATES.length}; k++) { float d = distance(p, uGate[k].xy); float fz = uGate[k].z;
            float ph = d / 46.0 - uT * (0.55 + 0.6 * fz); float w = pow(0.5 + 0.5 * cos(6.2832 * ph), 10.0);
            an += w * fz * exp(-d / 300.0); }
          float base = m * (0.72 + 0.28 * ond);
          float anM = an * max(f.r, f.g * 0.5) * (0.8 + 0.7 * uJ);
          float v = uI * (base + 1.6 * anM);
          if (v < 0.004) discard;
          float a = smoothstep(0.0, 0.45, v) * (0.16 + 0.55 * max(f.r, min(1.0, anM * 1.5))) * (1.0 + 0.8 * uLejos);
          gl_FragColor = vec4(rampa(0.25 + 0.75 * min(1.0, v * 1.3) + 0.1 * uLejos * f.r), min(0.85, a)); }` });
    ruidoM = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mR);
    ruidoM.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); ruidoM.renderOrder = 5; ruidoM.visible = false; ruidoM.name = 'predio-ruido'; ruidoM.frustumCulled = false;
    grupo.add(ruidoM);

    /* flujo legible de lejos: cada carro es un punto de luz con dos más detrás (estela que se alarga con la velocidad); cálido si
       avanza, rojo si está detenido (la cola en los accesos se ve como un racimo rojo). De cerca se apaga y quedan los carros. */
    const gP = new THREE.BufferGeometry();
    gP.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
    gP.setAttribute('aV', new THREE.BufferAttribute(pV, 1).setUsage(THREE.DynamicDrawUsage));
    gP.setAttribute('aA', new THREE.BufferAttribute(pA, 1).setUsage(THREE.DynamicDrawUsage));
    gP.setDrawRange(0, 0);
    const mP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, uniforms: { uEsc },
      vertexShader: `attribute float aV; attribute float aA; uniform float uEsc; varying float vV; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z; gl_Position = projectionMatrix * mv;
          vA = aA * smoothstep(90.0, 300.0, d); vV = aV;
          gl_PointSize = vA < 0.01 ? 0.0 : clamp(13.0 * uEsc / d, 4.5, 15.0) * (0.55 + 0.45 * aA); }`,
      fragmentShader: `varying float vV; varying float vA;
        void main(){ vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0; if (r2 > 1.0) discard;
          vec3 c = mix(vec3(0.95, 0.12, 0.08), vec3(1.0, 0.92, 0.72), vV);
          float nucleo = exp(-r2 * 3.0); gl_FragColor = vec4(mix(c * 0.55, c, nucleo), vA * min(1.0, 0.25 + nucleo)); }` });
    puntos = new THREE.Points(gP, mP); puntos.frustumCulled = false; puntos.renderOrder = 8; puntos.name = 'predio-flujo'; grupo.add(puntos);

    // índice de acceso de cada carril (para la fuerza de los anillos): los que llegan al nodo del acceso y los de entrada/salida
    lnGate = new Int8Array(NL).fill(-1);
    car.forEach((c, l) => { let k = GATES.indexOf(c.b); if (k < 0 && c.tipo === 'out') k = GATES.indexOf(c.a); if (k < 0 && c.tipo === 'in') k = GATES.indexOf(c.b); lnGate[l] = k; });

    // rótulo flotante sobre el predio (vidrio, sans-serif)
    rotulo = document.createElement('div'); rotulo.className = 'predio-rot'; rotulo.setAttribute('aria-live', 'polite');
    if (!document.getElementById('predio-rot-css')) { const st = document.createElement('style'); st.id = 'predio-rot-css'; st.textContent = CSS_ROT; document.head.appendChild(st); }
    rotulo.style.display = 'none'; document.body.appendChild(rotulo);
    if (window.KEN_PLANBAV && window.KEN_PLANBAV.centro) { ancla.set(window.KEN_PLANBAV.centro[0], 70, window.KEN_PLANBAV.centro[1]); }
    else { const w = W([9330, 3000]); ancla.set(w[0], 70, w[1]); }
  }

  /* ---------- tramos abiertos y rutas (cuando cambia vias / sem) ---------- */
  /* año en que abre cada tramo: el de su calzada en el plano, o antes si es el camino de una etapa temprana hasta un acceso (cada etapa
     se construye con su vía de acceso; si no, las primeras manzanas quedarían sin salida) */
  let efAnio = null;
  function aniosEfectivos() {
    efAnio = TRAMOS.map(t => t[4]); const ady = {};
    TRAMOS.forEach((t, i) => { if (t[3] !== 'i') return; const L = Math.hypot(NODOS[t[1]][0] - NODOS[t[0]][0], NODOS[t[1]][1] - NODOS[t[0]][1]); (ady[t[0]] = ady[t[0]] || []).push([t[1], i, L]); (ady[t[1]] = ady[t[1]] || []).push([t[0], i, L]); });
    const aAcceso = (n0) => { const dist = { [n0]: 0 }, prev = {}, cola = [n0], hecho = new Set();
      while (cola.length) { let bi = 0; for (let k = 1; k < cola.length; k++) if (dist[cola[k]] < dist[cola[bi]]) bi = k; const u = cola.splice(bi, 1)[0];
        if (hecho.has(u)) continue; hecho.add(u); if (GATES.includes(u)) { const r = []; let v = u; while (v !== n0) { r.push(prev[v][1]); v = prev[v][0]; } return r; }
        for (const [v, i, L] of ady[u] || []) { const d = dist[u] + L; if (dist[v] == null || d < dist[v]) { dist[v] = d; prev[v] = [u, i]; cola.push(v); } } }
      return []; };
    TRAMOS.forEach((t, i) => { if (t[3] !== 'i') return; for (const j of aAcceso(t[0])) efAnio[j] = Math.min(efAnio[j], t[4]); });
  }
  const VIAS_MODELO = [9, 8, 14, 15, 8, 7, 7, 7, 1, 4]; // tramos de calzada que abre cada etapa en el modelo (simulaciones12: PREDIO_PLAN.vias)
  function rehacerRed() {
    if (!efAnio) aniosEfectivos();
    const ti = TRAMOS.map((t, i) => i).filter(i => TRAMOS[i][3] === 'i');
    const abiertoT = new Uint8Array(TRAMOS.length).fill(1);
    let etapas = 10; // etapas del plan con vías abiertas
    if (est.vias != null && isFinite(est.vias)) { let c = 0; etapas = 0; for (const v of VIAS_MODELO) { c += v; if (+est.vias >= c) etapas++; } }
    else if (est.sem != null && est.sem > 0) etapas = Math.min(10, Math.floor(est.sem / 52) + 1);
    for (const i of ti) abiertoT[i] = efAnio[i] <= etapas ? 1 : 0;
    const firma = Array.prototype.join.call(abiertoT, '');
    if (firma === firmaRed) return; firmaRed = firma; calentado = false;
    for (let l = 0; l < NL; l++) lnAbierto[l] = abiertoT[lnTramo[l]];
    // grafo por nodos
    const car = armar.car, sale = {}; car.forEach((c, l) => { if (lnAbierto[l]) (sale[c.a] = sale[c.a] || []).push(l); });
    const camino = (desde, hasta) => { // Dijkstra (pocos nodos): costo = tiempo de viaje
      const dist = { [desde]: 0 }, prev = {}, hecho = new Set(); const abiertos = [desde];
      while (abiertos.length) { let bi = 0; for (let k = 1; k < abiertos.length; k++) if (dist[abiertos[k]] < dist[abiertos[bi]]) bi = k;
        const u = abiertos.splice(bi, 1)[0]; if (u === hasta) break; if (hecho.has(u)) continue; hecho.add(u);
        for (const l of sale[u] || []) { const v = car[l].b, d = dist[u] + lnLen[l] / lnV[l] + (lnTipo[l] === 0 ? 4 : lnTipo[l] >= 2 ? 60 : 0); if (dist[v] == null || d < dist[v]) { dist[v] = d; prev[v] = l; abiertos.push(v); } } }
      if (dist[hasta] == null) return null; const r = []; let v = hasta; while (v !== desde) { const l = prev[v]; r.push(l); v = car[l].a; } return r.reverse(); };
    // sótanos alcanzables
    const sot = SOTANOS.filter(s => (sale[s] || []).length);
    // las rutas solo se agregan (los carros guardan el índice de la suya); las que ya no sirven quedan con tasa 0
    for (let r = 0; r < rutas.length; r++) rutaTasa[r] = 0;
    const poner = (lista, w, llega) => { if (!lista) return; const k = lista.join(','); let r = rutaClave.get(k);
      if (r == null) { r = rutas.length; rutaClave.set(k, r); rutas.push(Int16Array.from(lista)); rutaTasa.push(0); rutaAcc.push(0); rutaIni.push(llega ? 0 : 1); rutaFin.push(llega ? 1 : 0); }
      rutaTasa[r] += llega ? w : -w; };
    /* cada viaje se reparte entre los accesos (no solo el más corto): peso ∝ exp(−tiempo / 90 s), así todos los accesos se usan y el más
       cercano lleva más. Llega: fuente de la avenida → carril de entrada → sótano. Sale: sótano → carril de salida → sumidero de la avenida. */
    const ent = [], sal = []; car.forEach((c, l) => { if (!lnAbierto[l]) return; if (c.tipo === 'in') ent.push(l); else if (c.tipo === 'out') sal.push(l); });
    const costo = (r) => { let t = 0; for (const l of r) t += lnLen[l] / lnV[l]; return t; };
    const pegar = (a, l, b) => (a && b ? [...a, l, ...b] : null);
    for (const s of sot) {
      const op = [];
      for (const l of ent) for (const [f, w] of FUENTES) { const r = pegar(camino(f, car[l].a), l, camino(car[l].b, s)); if (r) op.push([r, w, costo(r)]); }
      let sw = 0; const m0 = Math.min(...op.map(o => o[2])); for (const o of op) { o[3] = o[1] * Math.exp(-(o[2] - m0) / 90); sw += o[3]; }
      for (const o of op) poner(o[0], o[3] / sw / sot.length, true);
      const os = [];
      for (const l of sal) for (const [k, w] of SUMIDEROS) { const r = pegar(camino(s, car[l].a), l, camino(car[l].b, k)); if (r) os.push([r, w, costo(r)]); }
      sw = 0; const m1 = Math.min(...os.map(o => o[2])); for (const o of os) { o[3] = o[1] * Math.exp(-(o[2] - m1) / 90); sw += o[3]; }
      for (const o of os) poner(o[0], o[3] / sw / sot.length, false);
    }
    // carros cuya ruta pasa por un tramo que se cerró (vias bajó): se quitan de su cola
    let quitados = 0;
    for (let i = 0; i < NMAX; i++) { if (!cAct[i]) continue; const ru = rutas[cRuta[i]]; let ok = true; for (let k = cLeg[i]; k < ru.length; k++) if (!lnAbierto[ru[k]]) { ok = false; break; } if (!ok) { quitar(i); quitados++; } }
    if (quitados) { // rehacer las colas sin los quitados (en orden)
      for (let l = 0; l < NL; l++) { let w = 0; const n = qLen[l]; for (let k = 0; k < n; k++) { const i = qBuf[qIni[l] + (qHead[l] + k) % qCap[l]]; if (cAct[i]) { qBuf[qIni[l] + (qHead[l] + w) % qCap[l]] = i; w++; } } qLen[l] = w; }
    }
    rutasActivas = 0; for (let r = 0; r < rutas.length; r++) if (rutaTasa[r] !== 0) rutasActivas++;
    pintarRuido();
  }
  const rutaClave = new Map(); let rutasActivas = 0;

  function pintarRuido() {
    const Lz = armar.lienzo; if (!Lz) return; const { cv, x0, z0, RES } = Lz, g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height); const P = (x, z) => [(x - x0) / RES, (z - z0) / RES];
    if (Lz.borde) { g.save(); g.filter = 'blur(10px)'; g.fillStyle = 'rgb(0,255,0)'; g.beginPath(); Lz.borde.forEach((w, i) => { const p = P(w[0], w[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fill(); g.restore(); }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    const trazo = (anchoM, blur, alfa) => { g.filter = `blur(${blur}px)`; g.strokeStyle = `rgba(255,0,0,${alfa})`; g.lineWidth = anchoM / RES;
      armar.car.forEach((c, l) => { if (!lnAbierto[l] || (c.tipo === 'i' && c.a > c.b)) return; if (c.tipo === 'av') return; g.beginPath(); c.pts.forEach((w, i) => { const p = P(w[0], w[1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke(); }); };
    trazo(46, 9, 0.3); trazo(22, 4, 0.45); trazo(11, 1.5, 0.4);
    g.restore(); armar.tex.needsUpdate = true;
  }

  /* ---------- carros ---------- */
  function quitar(i) { cAct[i] = 0; nAct--; const A = malla.instanceMatrix.array; for (let k = 0; k < 16; k++) A[i * 16 + k] = 0; pA[i * 3] = pA[i * 3 + 1] = pA[i * 3 + 2] = 0; }
  const qTail = (l) => qLen[l] ? qBuf[qIni[l] + (qHead[l] + qLen[l] - 1) % qCap[l]] : -1;
  const qFront = (l) => qLen[l] ? qBuf[qIni[l] + qHead[l]] : -1;
  function meter(l, i) { if (qLen[l] >= qCap[l]) return false; qBuf[qIni[l] + (qHead[l] + qLen[l]) % qCap[l]] = i; qLen[l]++; return true; }
  function sacar(l) { qHead[l] = (qHead[l] + 1) % qCap[l]; qLen[l]--; }
  function nuevo(r) {
    const l = rutas[r][0], t = qTail(l); if (t >= 0 && cS[t] < LARGO + 4) return false;
    let i = 0; while (i < NMAX && cAct[i]) i++; if (i >= NMAX) return false;
    if (!meter(l, i)) return false;
    cAct[i] = 1; nAct++; if (i >= alto) alto = i + 1; cRuta[i] = r; cLeg[i] = 0; cSeg[i] = 0; cS[i] = 0; cV[i] = rutaIni[r] ? 0 : lnV[l] * 0.8; cEd[i] = 99; cH[i] = lnHIni[l];
    if (t >= 0) cV[i] = Math.min(cV[i], cV[t]);
    return true;
  }
  let hOut = 2.5, hIn = 1.6, factorTasa = 0, partLlega = 0.5;
  function ajustar() { // demanda de la hora y congestión
    const min = RELOJ.minutoDia, dem = demandaEn(min), h = (min / 60) % 24;
    const j = Math.max(0, Math.min(1, (ratio - 1) / 1.1)) * Math.max(0, Math.min(1, (dem - 0.25) / 0.55)); // congestión 0…1
    hOut = 2.4 + 9 * j; hIn = 1.6 + 4 * j;
    factorTasa = 0.5 * dem * ratio; // veh/s en total (≈ 1.200 veh/h en hora pico con el tráfico de referencia)
    partLlega = h >= 5 && h < 10 ? 0.32 : h >= 16 && h < 21 ? 0.68 : 0.5; // mañana salen, tarde llegan
    ajustar.j = j; ajustar.dem = dem; uJ.value = j;
    // fuerza de los anillos por acceso: base por la demanda y el tráfico + carros detenidos que esperan en ese acceso
    if (lnGate) { paradosG.fill(0);
      for (let l = 0; l < NL; l++) { const g = lnGate[l]; if (g < 0) continue; const n = qLen[l]; for (let k = 0; k < n; k++) if (cV[qBuf[qIni[l] + (qHead[l] + k) % qCap[l]]] < 0.8) paradosG[g]++; }
      for (let g = 0; g < GATES.length; g++) uGate.value[g].z = Math.min(1.3, (0.25 + 0.35 * dem * Math.min(2, ratio)) + paradosG[g] / 10); }
  }
  function paso(dt) {
    tAnim += dt;
    // nacimientos
    for (let r = 0; r < rutas.length; r++) { const w = rutaTasa[r]; if (w === 0) continue; const q = w > 0 ? partLlega : 1 - partLlega; rutaAcc[r] = Math.min(2, rutaAcc[r] + Math.abs(w) * q * 2 * factorTasa * dt);
      if (rutaAcc[r] >= 1 && nuevo(r)) rutaAcc[r] -= 1; }
    // seguimiento por carril (del de adelante hacia atrás)
    for (let l = 0; l < NL; l++) {
      const n = qLen[l]; if (!n) continue; const L = lnLen[l], vl = lnV[l];
      let prevS = 0;
      for (let k = 0; k < n; k++) {
        const i = qBuf[qIni[l] + (qHead[l] + k) % qCap[l]]; let gap, vMax = vl;
        if (k === 0) {
          const ru = rutas[cRuta[i]], sig = cLeg[i] + 1 < ru.length ? ru[cLeg[i] + 1] : -1;
          if (sig < 0) gap = 1e9; // fin de ruta: sótano o sale del cuadro
          else {
            const t = qTail(sig), libre = t < 0 ? 1e9 : cS[t] - LARGO, cupo = (lnTipo[sig] === 3 ? hOut : lnTipo[sig] === 2 ? hIn : 0);
            const puede = libre > 2.5 && tAnim - lnUlt[sig] >= cupo;
            gap = puede ? (L - cS[i]) + Math.min(libre, 60) : L - cS[i] - 0.3;
            let dh = Math.abs(lnHIni[sig] - lnHFin[l]); if (dh > Math.PI) dh = 2 * Math.PI - dh;
            if (dh > 0.5 && L - cS[i] < 18) vMax = Math.min(vMax, 3 + 4 * (1 - Math.min(1, dh / 1.6)));
          }
          if (rutaFin[cRuta[i]] && sig < 0) vMax = Math.min(vMax, 2 + (L - cS[i]) * 0.4); // baja despacio a la rampa
        } else gap = prevS - LARGO - cS[i];
        const vt = Math.max(0, Math.min(vMax, (gap - 2.2) / 1.15));
        let v = cV[i]; v += Math.max(-7 * dt, Math.min(2.2 * dt, vt - v)); if (v < 0) v = 0;
        let s = cS[i] + v * dt; if (k > 0 && s > prevS - LARGO - 0.8) { s = Math.max(cS[i], prevS - LARGO - 0.8); v = Math.min(v, cV[i]); }
        cV[i] = v; cS[i] = s; prevS = s;
      }
      // el primero pasa al carril siguiente o termina
      const i = qFront(l); if (i < 0 || cS[i] < L) continue;
      const ru = rutas[cRuta[i]], sig = cLeg[i] + 1 < ru.length ? ru[cLeg[i] + 1] : -1;
      if (sig < 0) { if (cS[i] >= L) { sacar(l); quitar(i); } continue; }
      const t = qTail(sig);
      if ((t >= 0 && cS[t] - LARGO < 1.5) || !meter(sig, i)) { cS[i] = L; cV[i] = 0; continue; }
      // posición vieja (para suavizar el salto de un carril al otro)
      const o = lnOff[l] + lnN[l] - 1, ox = lnX[o], oz = lnZ[o];
      sacar(l); lnUlt[sig] = tAnim; cLeg[i]++; cSeg[i] = 0; cS[i] = Math.min(cS[i] - L, 2);
      const o2 = lnOff[sig]; cEx[i] = ox - lnX[o2]; cEz[i] = oz - lnZ[o2]; cEd[i] = 0;
    }
  }
  function calentar(seg) { ajustar(); const n = Math.ceil(seg / 0.5); for (let k = 0; k < n; k++) paso(0.5); }

  // matrices: solo de los carros activos (rotación en y + traslación, escritas a mano)
  function dibujar() {
    const A = malla.instanceMatrix.array, yI = yInt(), yA = yAv();
    for (let i = 0; i < alto; i++) {
      if (!cAct[i]) continue;
      const r = cRuta[i], l = rutas[r][cLeg[i]], o = lnOff[l], n = lnN[l]; let sg = cSeg[i]; const s = cS[i];
      while (sg < n - 2 && lnCum[o + sg + 1] < s) sg++; cSeg[i] = sg;
      const a = o + sg, segL = lnCum[a + 1] - lnCum[a] || 1, f = Math.min(1, Math.max(0, (s - lnCum[a]) / segL));
      let x = lnX[a] + (lnX[a + 1] - lnX[a]) * f, z = lnZ[a] + (lnZ[a + 1] - lnZ[a]) * f;
      let h = Math.atan2(lnX[a + 1] - lnX[a], lnZ[a + 1] - lnZ[a]);
      // giro suave en los vértices y al cambiar de carril
      const resta = lnCum[a + 1] - s; let hn = h;
      if (sg < n - 2) hn = Math.atan2(lnX[a + 2] - lnX[a + 1], lnZ[a + 2] - lnZ[a + 1]);
      else { const ru = rutas[r]; if (cLeg[i] + 1 < ru.length) hn = lnHIni[ru[cLeg[i] + 1]]; }
      if (resta < 3) { let d = hn - h; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; h += d * 0.5 * (1 - resta / 3); }
      if (cEd[i] < 6) { const e = 1 - cEd[i] / 6, k = e * e; x += cEx[i] * k; z += cEz[i] * k; cEd[i] = s; }
      let dh = h - cH[i]; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
      h = cH[i] + dh * Math.min(1, 0.25 + Math.abs(dh) * 0.4); cH[i] = h;
      const L = lnLen[l], u = Math.min(1, s / Math.max(1, L)), y0 = lnY0[l] ? yA : yI, y1 = lnY1[l] ? yA : yI;
      let y = y0 + (y1 - y0) * u;
      // rampa del sótano: baja (o sube) 2,4 m en los últimos (primeros) 8 m
      if (rutaFin[r] && cLeg[i] === rutas[r].length - 1 && L - s < 8) y -= 2.4 * (1 - (L - s) / 8);
      if (rutaIni[r] && cLeg[i] === 0 && s < 8) y -= 2.4 * (1 - s / 8);
      const c = Math.cos(h), sn = Math.sin(h), b = i * 16;
      A[b] = c; A[b + 1] = 0; A[b + 2] = -sn; A[b + 3] = 0; A[b + 4] = 0; A[b + 5] = 1; A[b + 6] = 0; A[b + 7] = 0;
      A[b + 8] = sn; A[b + 9] = 0; A[b + 10] = c; A[b + 11] = 0; A[b + 12] = x; A[b + 13] = y; A[b + 14] = z; A[b + 15] = 1;
      // puntos de luz: el carro y dos detrás (más separados cuanto más rápido)
      const vn = Math.min(1, cV[i] / 7), paso3 = 2 + 6 * vn;
      for (let k = 0; k < 3; k++) { const p = i * 3 + k, q = p * 3; pPos[q] = x - sn * paso3 * k; pPos[q + 1] = y + 1.6; pPos[q + 2] = z - c * paso3 * k; pV[p] = vn; pA[p] = k === 0 ? 1 : (k === 1 ? 0.55 : 0.28) * (0.25 + 0.75 * vn); }
    }
    while (alto > 0 && !cAct[alto - 1]) alto--;
    malla.count = alto; malla.instanceMatrix.needsUpdate = true;
    const gP = puntos.geometry; gP.setDrawRange(0, alto * 3); gP.attributes.position.needsUpdate = gP.attributes.aV.needsUpdate = gP.attributes.aA.needsUpdate = true;
  }

  let cuadroAjuste = 0;
  function cuadro(info) {
    if (!visible) return;
    // ruido: siempre en la simulación 4; más fuerte con ruido(true) o con la capa «Ruido de carros» encendida
    const rc = T3.rc && T3.rc.ruido, fuerte = ruidoOn || (rc && rc.visible);
    const iR = Math.max(uRuido > 0 ? 0.32 : 0, uRuido) * (fuerte ? 1 : 0.75); ruidoM.visible = iR > 0.004;
    // de lejos (cámara alta, ~2 km) la capa se refuerza para que se lea
    const cp = T3.camera.position, dC = Math.hypot(cp.x - ancla.x, cp.y, cp.z - ancla.z); uLejos.value = Math.min(1, Math.max(0, (dC - 500) / 1500));
    if (ruidoM.visible) { uI.value = iR; ruidoM.position.y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.43; } // justo sobre el suelo del plan (capas a +0,22…+0,40), a la altura de las llantas
    // la onda del ruido corre siempre (más rápido con el reloj andando): es decorativa, no mueve carros
    const dtR = Math.min(0.1, (info && info.dtReal) || 0.016); tRuido += dtR * (RELOJ.corriendo ? 1 + Math.min(1, (RELOJ.vel || 1) / 240) : 0.7); uT.value = tRuido;
    uEsc.value = T3.renderer.domElement.height / (2 * Math.tan(T3.camera.fov * Math.PI / 360));
    ponerRotulo();
    let dt = RELOJ.dtAnim || 0; if (!(dt > 0)) return;
    const m0 = performance.now(); // solo para medir el costo (el movimiento va con el reloj)
    if (++cuadroAjuste >= 30) { cuadroAjuste = 0; ajustar(); }
    dt = Math.min(dt, 1);
    const nSub = Math.ceil(dt / 0.25), h = dt / nSub; for (let k = 0; k < nSub; k++) paso(h);
    dibujar();
    const ms = performance.now() - m0; msCuadro += (ms - msCuadro) * 0.05; if (ms > msMax) msMax = ms;
  }
  let msCuadro = 0, msMax = 0, rotX = -1, rotY = -1, rotOn = false, rotW = 0, rotH = 0;
  function ponerRotulo() {
    if (!rotulo) return;
    proy.copy(ancla).project(T3.camera);
    const W = innerWidth, H = innerHeight, on = proy.z < 1 && proy.x > -1.1 && proy.x < 1.1 && proy.y > -1.1 && proy.y < 1.1 && rotulo.firstChild;
    if (!!on !== rotOn) { rotOn = !!on; rotulo.style.display = on ? '' : 'none'; }
    if (!on) return;
    if (!rotW) { rotW = rotulo.offsetWidth; rotH = rotulo.offsetHeight; } // se mide solo cuando cambia el texto
    const rw = rotW || 200, rh = rotH || 120; // siempre dentro de la pantalla
    const mI = W > 1000 ? 300 : 12, mD = W > 1000 ? 330 : 12; // en pantalla ancha, fuera de los paneles laterales
    const x = Math.round(Math.min(W - rw / 2 - mD, Math.max(rw / 2 + mI, (proy.x * 0.5 + 0.5) * W))), y = Math.round(Math.min(H - 12, Math.max(rh + 20, (-proy.y * 0.5 + 0.5) * H)));
    if (x !== rotX || y !== rotY) { rotX = x; rotY = y; rotulo.style.transform = `translate(${x}px,${y}px) translate(-50%,calc(-100% - 8px))`; }
  }
  const fmt = (n) => Math.round(n).toLocaleString('es-CO');
  let textoRot = '';
  function textoRotulo() {
    if (!rotulo) return;
    const PB = window.KEN_PLANBAV, años = (est.sem || 0) / 52, av = PB && PB.avance ? PB.avance(años) : null;
    const veh = est.vehiculosDia != null ? +est.vehiculosDia : 0.5 * 12.6 * 3600 * ratio; // Σ demanda horaria del día ≈ 12,6 h equivalentes de pico
    const hab = est.habitantes != null ? +est.habitantes : av ? av.viviendas * 3.1 : 0;     // 3,1 personas por hogar (Bogotá)
    const tala = est.tala != null ? +est.tala : av ? av.arboles : 0;
    const d = (+est.ruidoDb || 0) - (+est.ruidoDb0 || 0);
    const t = `<h6>Predio Bavaria · plan parcial</h6><div class="f"><span>Vehículos/día</span><b>${fmt(veh)}</b></div>`
      + `<div class="f"><span>Ruido</span><b class="${d > 0.05 ? 'r' : ''}">${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')} dB</b></div>`
      + `<div class="f"><span>Habitantes</span><b>${fmt(hab)}</b></div><div class="f"><span>Árboles talados</span><b>${fmt(tala)}</b></div>`;
    if (t !== textoRot) { textoRot = t; rotulo.innerHTML = t; rotW = 0; }
  }
  RELOJ.alDibujar(cuadro);

  const api = {
    poner(o = {}) {
      Object.assign(est, o); armar();
      const t0 = +est.trafico0 > 0 ? +est.trafico0 : 1; ratio = Math.max(0, Math.min(4, (+est.trafico || t0) / t0));
      const d = (+est.ruidoDb || 0) - (+est.ruidoDb0 || 0); uRuido = Math.max(ratio > 0 ? 0.22 : 0, Math.min(1, d / 10)); // +10 dB = rojo fuerte; un mínimo tenue mientras haya tráfico
      puesto = true; rehacerRed(); ajustar(); textoRotulo();
      if (visible) { if (nAct === 0 && rutasActivas > 0 && !calentado) { calentado = true; calentar(240); } dibujar(); }
    },
    ver(on) {
      on = !!on; if (on === visible) return; visible = on; grupo.visible = on;
      if (on) { armar(); if (puesto) { rehacerRed(); if (nAct === 0) calentar(240); } textoRotulo(); dibujar(); rotOn = false; rotulo.style.display = 'none'; ponerRotulo(); }
      else { if (ruidoM) ruidoM.visible = false; if (rotulo) { rotulo.style.display = 'none'; rotOn = false; } }
    },
    ruido(on) { ruidoOn = !!on; },
    get visible() { return visible; },
    // carriles con carros detenidos (cola): [{ de, a, carros, parados }] (pruebas y paneles)
    colas() { const o = []; if (!armar.car) return o; armar.car.forEach((c, l) => { let p = 0; for (let k = 0; k < qLen[l]; k++) if (cV[qBuf[qIni[l] + (qHead[l] + k) % qCap[l]]] < 0.6) p++; if (p) o.push({ de: c.a, a: c.b, carros: qLen[l], parados: p }); }); return o.sort((x, y) => y.parados - x.parados); },
    get nVias() { return VIAS_MODELO.reduce((a, b) => a + b, 0); }, // vias = tramos de calzada abiertos como los cuenta el modelo (80 al final); se pasa a etapas del plan
    estado() { return { ms: +msCuadro.toFixed(3), msMax: +msMax.toFixed(3), carros: nAct, rutas: rutasActivas, ratio, congestion: ajustar.j || 0, demanda: ajustar.dem || 0, hSalida: hOut, ruido: uRuido, parados: (() => { let n = 0; for (let i = 0; i < alto; i++) if (cAct[i] && cV[i] < 0.6) n++; return n; })(), colas:armar.car ? armar.car.map((c, l) => lnTipo[l] >= 2 ? qLen[l] : 0).reduce((a, b) => a + b, 0) : 0 }; },
    grupo
  };
  window.KEN_PREDIO = api;
  return api;
}
