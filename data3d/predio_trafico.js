/* ============ PREDIO BAVARIA CON EL PLAN PARCIAL: carros en las vías nuevas y ruido dentro del predio (simulación 4) ============
   Consecuencias del Plan Parcial Bavaria Fábrica (Decreto 448/2023) dentro del predio:
   · CARROS: entran desde la Av. Boyacá (costado oeste, tres accesos con giro a la derecha), la vía del costado sur y la avenida del
     costado noreste, recorren las vías internas del plan y llegan a los sótanos de las manzanas (bajan por la rampa y desaparecen); los que
     salen suben del sótano y vuelven a la avenida. Red calcada sobre las calzadas de data3d/plan_bavaria.json (ejes a mano, ±10 m como
     el plano) con el año en que abre cada tramo; los accesos se apoyan en los carriles de net.json.
     Modelo de seguimiento (cada carro mantiene distancia al de adelante, sin adelantar: cola FIFO por carril) y cupo en los accesos: en
     cada salida a la avenida pasa un carro cada hOut segundos (y cada hIn en las entradas). Con más tráfico (trafico / trafico0) y en
     hora pico el cupo baja y se forma la cola en los accesos (lenta y apretada).
   · LOS VIAJES NUEVOS VAN A LAS CAPAS QUE YA TIENE EL SIMULADOR (nada de capas propias):
     – FLUJO DE CARROS («Flujo de carros · Ver», index.html crearFlujoCarros / T3.flujoCarros): los vehiculosDia del plan se reparten por
       hora (mismo perfil de demanda) y por ruta; en las avenidas de alrededor (Av. Boyacá, vía sur, avenida del noreste) se suman al conteo
       de la capa como carros adicionales sobre esos carriles (T3.flujoCarros.contar envuelto mientras la sim. 4 está activa), y las vías
       internas del plan se dibujan con la misma cinta y la misma escala de colores (carros/km) para que también se pongan rojas.
     – RUIDO DE CARROS (#rc-btn, T3.ruidoMod + ruido_cierre.js): a las celdas de vía de la rejilla de 16 m alrededor del predio se les suma la
       energía de los viajes nuevos que pasan por cada celda, con la fórmula de ruido de una vía del modelo (simulaciones12, la misma escala
       del mapa: L = 74 dB + 10·log10(Q / 14.049), Q en veh/día): L' = 10·log10(10^(L/10) + 10^(Lx/10)); las vías internas abiertas se agregan
       como celdas de vía intermedias con su Lx. Con ver(false) todo vuelve a como estaba (las demás simulaciones no cambian).
   RELOJ: los carros avanzan con RELOJ.dtAnim (tiempo simulado de animación del reloj universal: 0 en pausa, el día a 1× va a 1×, y a
   120×/240×/480× se topa en ×8 como el resto de las animaciones, para que no salten), nunca con performance.now. La demanda por hora
   sale de RELOJ.minutoDia con el mismo perfil de index.html (demandaHora).
   Rendimiento: un InstancedMesh (una llamada de dibujo) para todos los carros, una cinta para las vías internas, arreglos fijos (sin crear objetos
   por cuadro); la red se arma al primer ver(true)/poner, no al importar. Todo cuelga de un THREE.Group llamado 'predio' (foco.js). */

const DEMANDA_H = [0.06, 0.04, 0.03, 0.03, 0.08, 0.32, 0.78, 0.95, 0.82, 0.62, 0.58, 0.62, 0.72, 0.7, 0.62, 0.66, 0.82, 1.0, 0.97, 0.78, 0.52, 0.36, 0.22, 0.12]; // = index.html
const demandaEn = (min) => { const h = (min / 60) % 24, a = Math.floor(h), f = h - a; return DEMANDA_H[a] + (DEMANDA_H[(a + 1) % 24] - DEMANDA_H[a]) * f; };
const PINTURA = [0xeeeeec, 0xeeeeec, 0xe9e9e6, 0xb9bcc0, 0xb4b7bb, 0xa7abb0, 0x6d7177, 0x5b5f64, 0x141517, 0x101113, 0x8e1416, 0x1d2f5c, 0xc8b89a, 0x4a1219, 0x1f3a2c, 0x2b4a7a, 0xf2c300]; // = vehiculos.js (+ taxi)
const SUMA_DEM = DEMANDA_H.reduce((a, b) => a + b, 0); // ≈ 12,4: el día equivale a 12,4 h de hora pico
// escala de la capa «Flujo de carros» (index.html crearFlujoCarros): carros por km de vía
const ESC = [[0, [0.10, 0.72, 0.29]], [2.5, [0.55, 0.85, 0.20]], [6, [0.98, 0.84, 0.10]], [11, [0.98, 0.50, 0.08]], [18, [0.90, 0.12, 0.10]], [30, [0.55, 0.03, 0.08]]];
const colorDe = (d, o) => { let c = ESC[ESC.length - 1][1]; if (d <= ESC[0][0]) c = ESC[0][1]; else for (let i = 1; i < ESC.length; i++) if (d <= ESC[i][0]) { const [a, ca] = ESC[i - 1], [b, cb] = ESC[i], t = (d - a) / (b - a); o[0] = ca[0] + (cb[0] - ca[0]) * t; o[1] = ca[1] + (cb[1] - ca[1]) * t; o[2] = ca[2] + (cb[2] - ca[2]) * t; return o; } o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; return o; };
const LREF = [0, 60, 68, 74], TAU_FLUJO = 10; // = capas_escenario.js (dB por clase de vía) e index.html (olvido de la capa de flujo, s)

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

const GATES = ['a2', 'a4', 'a7', 's1', 'n3', 'n5'];                         // nodos internos de los accesos
const LARGO = 4.6, CARRIL = 1.75, NMAX = 420, V_AV = 11, V_INT = 8, V_ACC = 5, NVIRT = 6000;

export function crearPredio({ T3, RELOJ }) {
  const THREE = T3.THREE;
  RELOJ = RELOJ || window.KEN_RELOJ;
  const grupo = new THREE.Group(); grupo.name = 'predio'; grupo.visible = false; T3.scene.add(grupo);
  let listo = false, visible = false, ruidoOn = false;
  const est = { trafico: 1, trafico0: 1, ruidoDb: 0, ruidoDb0: 0, vias: undefined, sem: 0 };
  let ratio = 1, firmaRed = '', puesto = false, calentado = false;

  // ---------- estructuras (se llenan en armar) ----------
  let NL = 0, lnX, lnZ, lnCum, lnOff, lnN, lnLen, lnTipo, lnV, lnY0, lnY1, lnHIni, lnHFin, lnTramo, lnAbierto;
  let qBuf, qIni, qCap, qHead, qLen, lnUlt; // colas FIFO por carril (ids de carro)
  const rutas = [], rutaTasa = [], rutaAcc = [], rutaIni = [], rutaFin = []; // ruta: Int16Array de carriles
  const cAct = new Uint8Array(NMAX), cRuta = new Int16Array(NMAX), cLeg = new Int16Array(NMAX), cSeg = new Int16Array(NMAX), cS = new Float32Array(NMAX), cV = new Float32Array(NMAX);
  const cEx = new Float32Array(NMAX), cEz = new Float32Array(NMAX), cEd = new Float32Array(NMAX), cH = new Float32Array(NMAX);
  let nAct = 0, alto = 0, malla = null, tAnim = 0;
  // flujo de los viajes nuevos: por carril (veh/s y carros/km), carros «virtuales» para la capa de flujo y cinta de las vías internas
  let qDia = 0, lnWA = null, lnWD = null, lnQ = null, lnDens = null, qTotal = 0, cinta = null, cintaCol = null, cintaRango = null, cintaTramos = null;
  const VX = new Float32Array(NVIRT), VZ = new Float32Array(NVIRT), VIRT = { n: 0, x: VX, z: VZ }, c3 = [0, 0, 0];
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

    lnWA = new Float32Array(NL); lnWD = new Float32Array(NL); lnQ = new Float32Array(NL); lnDens = new Float32Array(NL);

    /* vías internas del plan en la capa «Flujo de carros»: la misma cinta de index.html (crearFlujoCarros: ancho ≈ 0,55 × calzada, color por
       carros/km con su escala, transparente, sobre el asfalto); se ve solo cuando esa capa está encendida y el tramo ya abrió */
    const P = [], I = []; cintaRango = []; cintaTramos = [];
    TRAMOS.forEach((t, ti) => { if (t[3] !== 'i') return; const q = [NODOS[t[0]], ...t[2], NODOS[t[1]]].map(W), wd = 7 * 0.55, base = P.length / 3;
      for (let i = 0; i < q.length; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        P.push(q[i][0] - dz * wd / 2, 0, q[i][1] + dx * wd / 2, q[i][0] + dz * wd / 2, 0, q[i][1] - dx * wd / 2);
        if (i < q.length - 1) { const v = base + i * 2; I.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); } }
      cintaRango.push([base, q.length * 2]); cintaTramos.push(ti); });
    cintaCol = new Float32Array(P.length / 3 * 4);
    const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gC.setAttribute('color', new THREE.BufferAttribute(cintaCol, 4)); gC.setIndex(I);
    cinta = new THREE.Mesh(gC, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }));
    cinta.renderOrder = 4; cinta.frustumCulled = false; cinta.visible = false; cinta.name = 'predio-flujo-vias'; grupo.add(cinta);
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
    // parte de los viajes que pasa por cada carril (llegadas y salidas por separado: cada grupo suma 1)
    lnWA.fill(0); lnWD.fill(0);
    for (let r = 0; r < rutas.length; r++) { const w = rutaTasa[r]; if (w === 0) continue; const ru = rutas[r]; for (let k = 0; k < ru.length; k++) { if (w > 0) lnWA[ru[k]] += w; else lnWD[ru[k]] -= w; } }
    sucioRuido = true;
  }
  const rutaClave = new Map(); let rutasActivas = 0;

  /* ---------- carros ---------- */
  function quitar(i) { cAct[i] = 0; nAct--; const A = malla.instanceMatrix.array; for (let k = 0; k < 16; k++) A[i * 16 + k] = 0; }
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
    // viajes nuevos del plan (veh/s a esta hora): vehiculosDia del modelo repartido con el perfil de demanda del día
    // si no llega vehiculosDia, se despeja de la fórmula del modelo (simulaciones12: trafico = (Q₀·índice + viajes/accesos) / Q₀, Q₀ = 10.291 veh/día, 2 accesos)
    const Q = est.vehiculosDia != null && isFinite(est.vehiculosDia) ? Math.max(0, +est.vehiculosDia) : Math.max(0, ratio - 1) * 10291 * 2;
    qTotal = Q * dem / SUMA_DEM / 3600; qDia = Q;
    factorTasa = Math.min(1.2, qTotal); // carros reales que salen/entran (tope visual: la cola los limita)
    partLlega = h >= 5 && h < 10 ? 0.32 : h >= 16 && h < 21 ? 0.68 : 0.5; // mañana salen, tarde llegan
    ajustar.j = j; ajustar.dem = dem;
    if (!lnWA) return;
    // flujo y densidad por carril (carros/km: flujo / velocidad, más lenta con la congestión)
    for (let l = 0; l < NL; l++) { if (!lnAbierto[l]) { lnQ[l] = lnDens[l] = 0; continue; }
      const q = qTotal * (lnWA[l] * partLlega + lnWD[l] * (1 - partLlega)); lnQ[l] = q; lnDens[l] = q / (lnV[l] * (1 - 0.7 * j)) * 1000; }
    // carros «virtuales» sobre los carriles de avenida: en la capa de flujo cuentan como carros presentes (densidad × largo × carriles)
    let n = 0;
    for (let l = 0; l < NL && n < NVIRT; l++) { if (lnTipo[l] !== 0 || lnDens[l] <= 0) continue;
      const L = lnLen[l], m = Math.min(NVIRT - n, Math.round(lnDens[l] * L / 1000 * 2.5)), o = lnOff[l], nn = lnN[l]; let sg = 0;
      for (let k = 0; k < m; k++) { const s = (k + 0.5) / m * L; while (sg < nn - 2 && lnCum[o + sg + 1] < s) sg++; const a = o + sg, f = Math.min(1, (s - lnCum[a]) / (lnCum[a + 1] - lnCum[a] || 1));
        VX[n] = lnX[a] + (lnX[a + 1] - lnX[a]) * f; VZ[n] = lnZ[a] + (lnZ[a + 1] - lnZ[a]) * f; n++; } }
    VIRT.n = n;
    pintarCinta();
  }
  // color de las vías internas con la escala de la capa de flujo (los dos sentidos comparten la cinta, como en index.html)
  function pintarCinta() {
    if (!cinta) return;
    for (let k = 0; k < cintaTramos.length; k++) { const ti = cintaTramos[k]; let d = 0, ab = 0;
      for (let l = 0; l < NL; l++) if (lnTramo[l] === ti) { d += lnDens[l]; ab = lnAbierto[l]; }
      colorDe(d, c3); const al = ab ? Math.min(0.92, 0.35 + d * 0.12) : 0, [b0, nv] = cintaRango[k];
      for (let v = b0; v < b0 + nv; v++) { const o = v * 4; cintaCol[o] = c3[0]; cintaCol[o + 1] = c3[1]; cintaCol[o + 2] = c3[2]; cintaCol[o + 3] = al; } }
    cinta.geometry.attributes.color.needsUpdate = true;
  }

  /* ---------- enganche con la capa «Flujo de carros» (index.html): mientras la sim. 4 está activa, cada conteo suma los carros virtuales ----------
     contar(V, dt) primero olvida (× e^(−dt/TAU)) y luego suma; para no olvidar dos veces se compensa el olvido antes del segundo conteo. */
  let fcOrig = null, fcObj = null;
  const fcEnv = function (V, dt) { fcOrig.call(this, V, dt); if (VIRT.n && dt > 0 && fcObj && fcObj.acum) { const A = fcObj.acum, k = Math.exp(dt / TAU_FLUJO); for (let i = 0; i < A.length; i++) A[i] *= k; fcOrig.call(this, VIRT, dt); } };
  function engancharFlujo(on) {
    const FC = T3.flujoCarros;
    if (on && FC && FC.contar && FC.contar !== fcEnv) { fcOrig = FC.contar; fcObj = FC; FC.contar = fcEnv; }
    else if (!on && fcObj && fcObj.contar === fcEnv) { fcObj.contar = fcOrig; fcObj = null; }
  }

  /* ---------- enganche con el mapa de ruido (T3.ruidoMod, capas_escenario.js; lo pinta ruido_cierre.js) ----------
     Se guardan las celdas originales y se ponen unas con el aporte del plan; ver(false) las devuelve. */
  let rmOrig = null, rmMio = null, sucioRuido = true, ruidoUlt = -1e9, ruidoFirma = '';
  function ruidoPlan(on) {
    const RM = T3.ruidoMod, G = RM && RM.G;
    if (!on) { if (rmOrig && G) { if (G.L0R === rmMio) { Object.assign(G, rmOrig); } else { Object.assign(G, { roads: rmOrig.roads, clsR: rmOrig.clsR, pwR: rmOrig.pwR, vegR: rmOrig.vegR }); RM.fl = null; } G.sig = ''; RM.ver++; } rmOrig = rmMio = null; ruidoFirma = ''; return; }
    if (!G || !G.L0R || !lnQ) return;
    if (rmOrig && G.L0R !== rmMio) { rmOrig = null; ruidoFirma = ''; } // el modelo rehizo su rejilla: se vuelve a tomar
    if (!rmOrig) rmOrig = { roads: G.roads, clsR: G.clsR, pwR: G.pwR, vegR: G.vegR, L0R: G.L0R };
    const firma = firmaRed + '|' + Math.round(qDia / 50); if (firma === ruidoFirma) return; ruidoFirma = firma;
    // celdas afectadas: se calculan solo cuando cambia la red abierta o la rejilla del modelo (lo caro); el nivel, cuando cambian los viajes
    if (!rmCel || rmCel.red !== firmaRed || rmCel.base !== rmOrig.L0R) {
      const cs = G.cs, nx = G.nx, nz = G.nz, celda = (x, z) => { const i = Math.floor((x - G.x0) / cs), j = Math.floor((z - G.z0) / cs); return i >= 0 && j >= 0 && i < nx && j < nz ? j * nx + i : -1; };
      // flujo de los viajes nuevos por celda (el máximo de los carriles que la cruzan; promedio del día: el mapa es diario)
      const qc = new Map(); let qMax = 0;
      for (let l = 0; l < NL; l++) { if (!lnAbierto[l]) continue; const q = lnWA[l] * 0.5 + lnWD[l] * 0.5; if (q <= 0) continue; qMax = Math.max(qMax, q);
        const o = lnOff[l]; for (let s = 0; s <= lnLen[l]; s += cs * 0.6) { let a = o; while (a < o + lnN[l] - 2 && lnCum[a + 1] < s) a++; const f = Math.min(1, (s - lnCum[a]) / (lnCum[a + 1] - lnCum[a] || 1));
          const k = celda(lnX[a] + (lnX[a + 1] - lnX[a]) * f, lnZ[a] + (lnZ[a + 1] - lnZ[a]) * f); if (k < 0) continue; const ent = qc.get(k); if (!ent || q > ent[0]) qc.set(k, [q, lnTipo[l]]); } }
      const esVia = new Map(); for (let k = 0; k < rmOrig.roads.length; k++) esVia.set(rmOrig.roads[k], k);
      const exI = [], exR = [], nuK = [], nuR = [];
      qc.forEach((v, k) => { const i = esVia.get(k); if (i != null) { exI.push(i); exR.push(v[0]); } else if (v[1] === 1) { nuK.push(k); nuR.push(v[0]); } }); // parte de los viajes del día que pasa por la celda
      const n0 = rmOrig.roads.length, n = n0 + nuK.length, roads = new Int32Array(n), clsR = new Uint8Array(n), pwR = new Float32Array(n), vegR = new Float32Array(n);
      roads.set(rmOrig.roads); clsR.set(rmOrig.clsR); pwR.set(rmOrig.pwR); vegR.set(rmOrig.vegR);
      nuK.forEach((k, m) => { roads[n0 + m] = k; clsR[n0 + m] = 2; pwR[n0 + m] = G.pw[k]; vegR[n0 + m] = G.veg[k]; });
      rmCel = { red: firmaRed, base: rmOrig.L0R, ok: qMax > 0, exI, exR, nuR, n0, roads, clsR, pwR, vegR };
    }
    if (!rmCel.ok) { ruidoPlan(false); return; }
    const C = rmCel, L = new Float32Array(C.roads.length); L.set(rmOrig.L0R);
    // nivel de los viajes nuevos que pasan por la celda con la fórmula del modelo para una vía (simulaciones12): L = 74 + 10·log10(Q / 14.049), Q en veh/día
    const Lx = (parte) => 74 + 10 * Math.log10(Math.max(1, qDia * parte) / 14049);
    // vías existentes alrededor: la energía de hoy más la de los viajes nuevos, L' = 10·log10(10^(L/10) + 10^(Lx/10)); tope +10 dB sobre la referencia de su clase
    for (let m = 0; m < C.exI.length; m++) { const i = C.exI[m], c = rmOrig.clsR[i];
      L[i] = Math.min(LREF[c] + 10, 10 * Math.log10(Math.pow(10, rmOrig.L0R[i] / 10) + Math.pow(10, Lx(C.exR[m]) / 10))); }
    // vías internas del plan (celdas nuevas, clase intermedia): solo los viajes nuevos (hoy no hay vía)
    for (let m = 0; m < C.nuR.length; m++) L[C.n0 + m] = Math.max(LREF[2] - 8, Math.min(LREF[3] + 10, Lx(C.nuR[m])));
    Object.assign(G, { roads: C.roads, clsR: C.clsR, pwR: C.pwR, vegR: C.vegR, L0R: L }); rmMio = L; RM.ver++;
  }
  let rmCel = null;  function paso(dt) {
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
    }
    while (alto > 0 && !cAct[alto - 1]) alto--;
    malla.count = alto; malla.instanceMatrix.needsUpdate = true;
  }

  let cuadroAjuste = 0, msCuadro = 0, msMax = 0;
  function cuadro() {
    if (!visible) return;
    const m0 = performance.now(); // solo para medir el costo (el movimiento va con el reloj)
    // cinta de las vías internas: visible con la capa «Flujo de carros»; enganches con las capas existentes
    const FC = T3.flujoCarros, fv = !!(FC && FC.visible); if (cinta && cinta.visible !== fv) cinta.visible = fv;
    if (cinta && fv) cinta.position.y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.47; // sobre el suelo del plan (capas hasta +0,40)
    if (fcObj !== FC || !FC || FC.contar !== fcEnv) engancharFlujo(true);
    let dt = RELOJ.dtAnim || 0;
    if (++cuadroAjuste >= 30) { cuadroAjuste = 0; ajustar();
      // el mapa de ruido se rehace como mucho cada 1,5 s (repintarlo cuesta) y solo si cambió algo o el modelo rehizo su rejilla
      const G = T3.ruidoMod && T3.ruidoMod.G; if (G && G.L0R && (sucioRuido || G.L0R !== rmMio) && m0 - ruidoUlt > 1500) { sucioRuido = false; ruidoUlt = m0; ruidoPlan(true); } }
    if (dt > 0) { dt = Math.min(dt, 1); const nSub = Math.ceil(dt / 0.25), h = dt / nSub; for (let k = 0; k < nSub; k++) paso(h); dibujar(); }
    const ms = performance.now() - m0; msCuadro += (ms - msCuadro) * 0.05; if (ms > msMax) msMax = ms;
  }
  RELOJ.alDibujar(cuadro);

  const api = {
    // trafico/trafico0, ruidoDb/ruidoDb0 (acceso más cargado), vias (tramos del modelo), sem (semanas), vehiculosDia (viajes nuevos del plan)
    poner(o = {}) {
      Object.assign(est, o); armar();
      const t0 = +est.trafico0 > 0 ? +est.trafico0 : 1; ratio = Math.max(0, Math.min(4, (+est.trafico || t0) / t0));
      puesto = true; rehacerRed(); ajustar(); sucioRuido = true;
      if (visible) { if (nAct === 0 && rutasActivas > 0 && !calentado) { calentado = true; calentar(240); } dibujar(); }
    },
    // ver(false): se esconden los carros y la cinta, se suelta la capa de flujo y el mapa de ruido vuelve a como estaba
    ver(on) {
      on = !!on; if (on === visible) return; visible = on; grupo.visible = on;
      if (on) { armar(); if (puesto) { rehacerRed(); if (nAct === 0) calentar(240); } ajustar(); dibujar(); engancharFlujo(true); sucioRuido = true; ruidoUlt = -1e9; }
      else { engancharFlujo(false); ruidoPlan(false); VIRT.n = 0; }
    },
    ruido() {}, // compatibilidad: el ruido del plan va en el mapa de ruido existente (#rc-btn)
    get visible() { return visible; },
    // carriles con carros detenidos (cola): [{ de, a, carros, parados }] (pruebas y paneles)
    colas() { const o = []; if (!armar.car) return o; armar.car.forEach((c, l) => { let p = 0; for (let k = 0; k < qLen[l]; k++) if (cV[qBuf[qIni[l] + (qHead[l] + k) % qCap[l]]] < 0.6) p++; if (p) o.push({ de: c.a, a: c.b, carros: qLen[l], parados: p }); }); return o.sort((x, y) => y.parados - x.parados); },
    get nVias() { return VIAS_MODELO.reduce((a, b) => a + b, 0); }, // vias = tramos de calzada abiertos como los cuenta el modelo (80 al final); se pasa a etapas del plan
    estado() { return { ms: +msCuadro.toFixed(3), msMax: +msMax.toFixed(3), carros: nAct, rutas: rutasActivas, ratio, congestion: ajustar.j || 0, demanda: ajustar.dem || 0, hSalida: hOut, vehS: +qTotal.toFixed(3), virtuales: VIRT.n, ruidoActivo: !!rmMio, parados: (() => { let n = 0; for (let i = 0; i < alto; i++) if (cAct[i] && cV[i] < 0.6) n++; return n; })(), colas:armar.car ? armar.car.map((c, l) => lnTipo[l] >= 2 ? qLen[l] : 0).reduce((a, b) => a + b, 0) : 0 }; },
    grupo
  };
  window.KEN_PREDIO = api;
  return api;
}
