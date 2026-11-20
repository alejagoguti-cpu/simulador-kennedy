/* ============ VIAJES DE ABASTECIMIENTO: ¿LOS QUE IBAN A CORABASTOS VAN A LOS MERCADOS Y A BAVARIA? ============
   La simulación NO supone que los carros y camiones dejan Corabastos: lo EVALÚA con un modelo explícito de viajes, semana a semana.

   1. DEMANDA (zonas). Kennedy se divide en celdas de 500 m (PAR.CEL) con los edificios del catastro de usos (data3d/usos_edif.json:
      lotes residenciales = hogares, lotes de comercio = tiendas). Cada zona genera viajes diarios de abastecimiento:
        · comerciantes de barrio que se surten (camiones, furgones y furgonetas): comercios × PAR.FR_COM_ALIM × PAR.TASA_COM; el 75 % en la madrugada (2:00-6:00)
        · hogares que compran frescos al por mayor (carros y motos): hogares × PAR.TASA_HOG; sobre todo de día
      La parte que ya cubren las huertas (sim_vida: personas que comen de las huertas / población; o el slider «Hogares con huerta») no viaja.
   2. ELECCIÓN DE DESTINO: cada viaje va al destino abierto MÁS CERCANO por la red vial (si está lleno, al siguiente); mercados abren a las 7:00. (Antes: logit multinomial por zona, segmento y franja; el detalle de abajo describe esa versión anterior.) Destinos: Corabastos, los mercados abiertos esa semana (de barrio y
      plazoletas en parques grandes: data3d/mercados_red.js; si no está, los 8 de data3d/carga.json con apertura escalonada) y el centro de
      acopio de Bavaria Común. Utilidad: V = −β·km por la red vial real (camino más corto sobre net.json) + constante del destino
      (Corabastos: precio mayorista y surtido − congestión; mercados y Bavaria: + surtido cuando las compras directas a la región de sim_vida
      están armadas) + α·ln(capacidad) + horas abiertas en la franja − precio sombra de capacidad (un mercado lleno deja de recibir).
   3. ASIGNACIÓN: árboles de camino más corto desde cada destino (Dijkstra, una vez por destino) → flujo por tramo (vehículos/día, ida y
      vuelta) y vehículos-km, por franja (madrugada 2-6 h y resto del día), HOY (solo Corabastos) y CON LA PROPUESTA (semana del modelo).
   4. RESULTADO: viajes a Corabastos hoy vs. propuesta, a cada mercado y a Bavaria, vehículos-km y la HIPÓTESIS evaluada.
   5. TRÁFICO DEL MAPA: data3d/alivio_cali.js toma de aquí (T3.viajesAbasto) la fracción que se quita cerca de Corabastos, por tipo de
      vehículo y franja horaria: quita = PAR.FR × (1 − viajes a Corabastos propuesta / hoy).
   6. EN EL MAPA (escala del día, reloj universal, determinista, hash()): furgonetas, furgones y camiones de estacas (y carros) que recorren
      las rutas calculadas hacia los mercados abiertos y Bavaria, 1 por PAR.ESC_VIS viajes reales; capa «Rutas de abastecimiento».
   Todos los parámetros marcados [SUP] son supuestos declarados para discutir con el grupo. Sin azar sin semilla ni relojes propios (todo sale del reloj universal). */
import { RELOJ, hashNum } from './reloj.js?v=5';
import { PAR as PARSIM, SIMST } from './sim_modelos.js?v=6';

export const CORA = [1132.1, 948.6], BAVC = [4136, 96];
export const PAR = {
  CEL: 500,                       // [SUP] zonas de demanda: celdas de 500 m
  POB: 1034000, PERS_HOG: 3.0,    // población de Kennedy (DANE 2024 aprox., la de sim_vida) · [SUP] personas por hogar
  TASA_HOG: 0.04,                 // [SUP] viajes/día por hogar en carro o moto a comprar frescos al por mayor (≈ 1 cada 25 días)
  FR_COM_ALIM: 0.35, TASA_COM: 0.45, // [SUP] 35 % de los comercios venden alimentos; cada uno se surte 0,45 veces/día (≈ 3 por semana)
  MADR: { hog: 0.12, com: 0.75 }, // [SUP] parte de los viajes entre 2:00 y 6:00 (la venta mayorista de Corabastos abre a las 2:00)
  BETA: { hog: 0.55, com: 0.25 }, // [SUP] desutilidad por km de red (el tendero va más lejos por precio que el hogar)
  ASC_CORA: { hog: 1.0, com: 2.0 },   // [SUP] Corabastos: precio mayorista y surtido completo
  PEN_CORA: { hog: 0.5, com: 0.7 },   // [SUP] Corabastos: congestión, parqueo y filas
  PEN_CORA_NAVES: 0.03,           // [SUP] por cada % de naves retiradas (slider «Corabastos reducido»)
  ASC: { barrio: { hog: -0.3, com: -0.9 }, plazoleta: { hog: 0.0, com: -0.6 }, bavaria: { hog: -0.6, com: 0.0 } }, // [SUP] sin surtido regional
  SURT_REG: { hog: 0.8, com: 1.4 }, // [SUP] + cuando las compras directas a la región (sim_vida: reg) están armadas: surtido y precio
  REG_REF: 0.45,                  // compras a la región de referencia (P1.regional por defecto)
  HORAS_MADR: { cora: 1, bavaria: 1, plazoleta: 1, barrio: 1 }, // horario: los mercados venden desde las 7:00, pero tienen BODEGA (cuarto frío y muelle de carga) y reciben mercancía a cualquier hora, también de 2:00 a 6:00; Corabastos y el acopio de Bavaria abren a las 2:00
  ALFA_CAP: 0.4, CAP_REF: 100,    // [SUP] atractivo por tamaño del mercado (capacidad en compras-equivalentes/día)
  EQ: { hog: 1, com: 4 },         // [SUP] un tendero carga lo de 4 compras de hogar (uso de la capacidad)
  KG_EQ: 25,                      // [SUP] kg de frutas y verduras de una compra de hogar en carro (un tendero: 4 × 25 = 100 kg)
  KG: { barrio: 2400, plazoleta: 9600 }, // kg/día si el mercado no trae capacidad (los de data3d/mercados_red.js)
  CAP_BAV: 80000 / 25,            // [SUP] acopio de Bavaria Común: 80 t/día para el barrio (completo; arranca con el 30 %) en compras-equivalentes
  HUERTA_SLIDER: 0.6, HUERTA_COM: 0.5, // [SUP] un hogar con huerta deja 60 % de sus compras de frescos; la tienda vende menos frescos (50 % del efecto)
  FR: { car: 0.5, cam: 0.8 },     // [SUP] de los vehículos de la grabación cerca de Corabastos, la parte que son viajes de abastecimiento del barrio
  COSTO_CLS: { major: 1.0, mid: 1.1, local: 1.35 }, // [SUP] las rutas prefieren las vías arterias
  ACCESO_KM: 0.3,                 // [SUP] del centro de la zona a la red
  ESC_VIS: { com: 2, hog: 10 },   // escala visual: 1 vehículo en el mapa por 2 viajes de tenderos y por 10 de hogares
  VEL: { com: 8.5, hog: 10 },     // m/s en la ruta
  ESPERA: [900, 2400],            // s en el mercado antes de volver
  HIP_MIN_BAJA: 0.15, HIP_MIN_REPARTO: 0.5 // hipótesis: Corabastos baja ≥ 15 % y ≥ 50 % de lo que deja de ir va a mercados y Bavaria
};
const SEG = [['hog', 'm'], ['hog', 'r'], ['com', 'm'], ['com', 'r']]; // segmentos: clase × franja (m = madrugada 2-6 h, r = resto)

/* ---------------- red vial como grafo (mundo) ---------------- */
export function construirRed(net, lw) {
  /* net.json trae los carriles de SUMO sin los cruces: sus extremos casi nunca coinciden (la componente conectada más grande tendría ~7 %
     de los nodos). Se unen TODOS los vértices a menos de 14 m (dos sentidos de una vía, carriles y cruces) y cada par de vértices
     consecutivos es un tramo: así el 96 % de los nodos queda en una sola red conectada. */
  const TOL = 14, G = new Map(), MX = [], MY = [];
  const nodo = (p) => { const cx = Math.floor(p[0] / TOL), cy = Math.floor(p[1] / TOL); let best = -1, bd = TOL * TOL;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = G.get((cx + a) * 100003 + cy + b); if (l) for (const i of l) { const d = (MX[i] - p[0]) ** 2 + (MY[i] - p[1]) ** 2; if (d < bd) { bd = d; best = i; } } }
    if (best >= 0) return best; const i = MX.length; MX.push(p[0]); MY.push(p[1]); const k = cx * 100003 + cy; let l = G.get(k); if (!l) G.set(k, l = []); l.push(i); return i; };
  const ea = [], eb = [], eL = [], eC = [], par = new Map(), segs = [];
  for (const [cls, pts0] of net.edges) { if (!pts0 || pts0.length < 2) continue; let a = nodo(pts0[0]); for (let i = 1; i < pts0.length; i++) { const b = nodo(pts0[i]); if (b !== a) segs.push([a, b, cls]); a = b; } }
  const X = [], Z = []; for (let i = 0; i < MX.length; i++) { const w = lw(MX[i], MY[i]); X.push(w[0]); Z.push(w[1]); }
  for (const [a, b, cls] of segs) {
    const L = Math.hypot(X[b] - X[a], Z[b] - Z[a]), k = Math.min(a, b) * 1048576 + Math.max(a, b), c = L * (PAR.COSTO_CLS[cls] || 1.2), j = par.get(k);
    if (j !== undefined) { if (c < eC[j]) eC[j] = c; continue; } // el mismo tramo en los dos sentidos: uno solo
    par.set(k, ea.length); ea.push(a); eb.push(b); eL.push(L); eC.push(c);
  }
  const eP = ea.map((a, e) => [[X[a], Z[a]], [X[eb[e]], Z[eb[e]]]]);
  const N = X.length, M = ea.length, deg = new Int32Array(N + 1);
  for (let e = 0; e < M; e++) { deg[ea[e] + 1]++; deg[eb[e] + 1]++; }
  for (let i = 0; i < N; i++) deg[i + 1] += deg[i];
  const adj = new Int32Array(2 * M), fill = deg.slice(0, N);
  for (let e = 0; e < M; e++) { adj[fill[ea[e]]++] = e; adj[fill[eb[e]]++] = e; }
  // componente más grande (los rutas solo por la red conectada)
  const comp = new Int32Array(N).fill(-1); let best = -1, bestN = 0;
  for (let s = 0; s < N; s++) { if (comp[s] >= 0) continue; const pila = [s]; comp[s] = s; let n = 0;
    while (pila.length) { const u = pila.pop(); n++; for (let q = deg[u]; q < deg[u + 1]; q++) { const e = adj[q], v = ea[e] === u ? eb[e] : ea[e]; if (comp[v] < 0) { comp[v] = s; pila.push(v); } } }
    if (n > bestN) { bestN = n; best = s; } }
  // índice de nodos de la componente en celdas de 150 m (para ubicar zonas y destinos en la red)
  const CG = 150, grid = new Map();
  for (let i = 0; i < N; i++) { if (comp[i] !== best) continue; const k = Math.floor(X[i] / CG) * 100003 + Math.floor(Z[i] / CG); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); }
  function cercano(x, z) {
    const cx = Math.floor(x / CG), cz = Math.floor(z / CG);
    for (let r = 0; r < 40; r++) { let bi = -1, bd = Infinity;
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue; const l = grid.get((cx + a) * 100003 + cz + b); if (!l) continue;
        for (const i of l) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } }
      if (bi >= 0) return { i: bi, d: Math.sqrt(bd) }; }
    return { i: -1, d: Infinity };
  }
  return { N, M, X, Z, ea, eb, eL, eC, eP, deg, adj, cercano };
}

// árbol de caminos más cortos desde un nodo (Dijkstra con montículo binario en arreglos)
export function arbol(R, fuente) {
  const N = R.N, dist = new Float64Array(N).fill(Infinity), lenR = new Float64Array(N), prevE = new Int32Array(N).fill(-1), orden = new Int32Array(N);
  let hk = new Float64Array(1024), hv = new Int32Array(1024), hn = 0, no = 0;
  const push = (k, v) => { if (hn >= hk.length) { const k2 = new Float64Array(hk.length * 2), v2 = new Int32Array(hk.length * 2); k2.set(hk); v2.set(hv); hk = k2; hv = v2; }
    let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  const pop = () => { const v = hv[0], k = hk[--hn], vv = hv[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hk[c + 1] < hk[c]) c++; if (hk[c] >= k) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = k; hv[i] = vv; return v; };
  const hecho = new Uint8Array(N); dist[fuente] = 0; push(0, fuente);
  while (hn) { const u = pop(); if (hecho[u]) continue; hecho[u] = 1; orden[no++] = u; const du = dist[u];
    for (let q = R.deg[u]; q < R.deg[u + 1]; q++) { const e = R.adj[q], v = R.ea[e] === u ? R.eb[e] : R.ea[e], nd = du + R.eC[e];
      if (nd < dist[v]) { dist[v] = nd; lenR[v] = lenR[u] + R.eL[e]; prevE[v] = e; push(nd, v); } } }
  return { fuente, dist, lenR, prevE, orden: orden.subarray(0, no) };
}
// puntos desde un nodo hasta la raíz del árbol (el destino), con largo acumulado
function rutaA(R, T, u) {
  if (!isFinite(T.dist[u])) return null;
  const out = [[R.X[u], R.Z[u]]];
  while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) return null; const v = R.ea[e] === u ? R.eb[e] : R.ea[e], P = R.eP[e], fw = R.ea[e] === u;
    for (let k = 1; k < P.length; k++) { const p = fw ? P[k] : P[P.length - 1 - k], q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) out.push(p); }
    u = v; }
  const S = new Float64Array(out.length); for (let k = 1; k < out.length; k++) S[k] = S[k - 1] + Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]);
  return { P: out, S, L: S[S.length - 1] };
}

/* ---------------- zonas de demanda (celdas de 500 m con lotes del catastro de usos) ---------------- */
export function construirZonas(usos, lw, R) {
  const cel = new Map(), C = PAR.CEL; let nRes = 0, nCom = 0;
  for (const [cod, t] of [['1', 'res'], ['2', 'com']]) { const a = usos[cod] || [];
    for (let i = 0; i < a.length; i += 2) { const w = lw(a[i] * 2 + 1, a[i + 1] * 2 + 1), k = Math.floor(w[0] / C) * 1000 + Math.floor(w[1] / C);
      let z = cel.get(k); if (!z) cel.set(k, z = { res: 0, com: 0, sx: 0, sz: 0, n: 0 }); z[t]++; z.sx += w[0]; z.sz += w[1]; z.n++; if (t === 'res') nRes++; else nCom++; } }
  const hogT = PAR.POB / PAR.PERS_HOG, Z = [];
  for (const [k, z] of [...cel.entries()].sort((a, b) => a[0] - b[0])) {
    if (z.n < 8) continue; const x = z.sx / z.n, zz = z.sz / z.n, c = R.cercano(x, zz); if (c.i < 0 || c.d > 900) continue;
    Z.push({ id: Z.length, k, x, z: zz, nodo: c.i, acc: c.d / 1000 + PAR.ACCESO_KM, hog: hogT * z.res / nRes, com: z.com,
      T: { hog: hogT * z.res / nRes * PAR.TASA_HOG, com: z.com * PAR.FR_COM_ALIM * PAR.TASA_COM } });
  }
  return Z;
}

/* ---------------- evaluación: demanda → elección → asignación ----------------
   E = { destinos: [{id, n, tipo:'cora'|'bavaria'|'barrio'|'plazoleta', cap (compras-eq/día), arbol}], cubreHog, cubreCom, reg (sim_vida), naves (%) }
   Devuelve por destino y segmento los viajes/día, vehículos-km y el flujo por tramo. */
export function evaluar(R, Z, E) {
  const D = E.destinos, nD = D.length, regN = Math.max(0, (E.reg || 0) / PAR.REG_REF);
  const V = SEG.map(() => new Float64Array(Z.length * nD)), KM = new Float64Array(Z.length * nD);
  for (let i = 0; i < Z.length; i++) for (let j = 0; j < nD; j++) { const T = D[j].arbol, d = T.lenR[Z[i].nodo]; KM[i * nD + j] = isFinite(T.dist[Z[i].nodo]) ? d / 1000 + Z[i].acc : Infinity; }
  // utilidad sin precio sombra
  SEG.forEach(([c, f], s) => { for (let j = 0; j < nD; j++) { const t = D[j].tipo;
    let asc = t === 'cora' ? PAR.ASC_CORA[c] - PAR.PEN_CORA[c] - PAR.PEN_CORA_NAVES * (E.naves || 0) : PAR.ASC[t][c] + PAR.SURT_REG[c] * Math.min(1.5, regN) + PAR.ALFA_CAP * Math.log(Math.max(1, D[j].cap) / PAR.CAP_REF);
    if (f === 'm') asc += Math.log(Math.max(0.01, PAR.HORAS_MADR[t]));
    for (let i = 0; i < Z.length; i++) V[s][i * nD + j] = isFinite(KM[i * nD + j]) ? asc - PAR.BETA[c] * KM[i * nD + j] : -Infinity; } });
  // viajes que salen de cada zona por segmento (descontando lo que cubren las huertas)
  const TS = SEG.map(([c, f]) => Z.map(z => z.T[c] * (f === 'm' ? PAR.MADR[c] : 1 - PAR.MADR[c]) * (1 - (c === 'hog' ? E.cubreHog : E.cubreCom))));
  /* ELECCIÓN (regla de la usuaria): cada viaje va al destino ABIERTO MÁS CERCANO por la red vial; si ese mercado ya está lleno, al siguiente más
     cercano; Corabastos no tiene tope. En la madrugada (2-6 h) los mercados están cerrados (abren a las 7:00): solo Corabastos y Bavaria.
     Las zonas más cercanas a cada destino llenan primero (orden determinista). La capacidad de cada mercado sigue siendo un supuesto [SUP]. */
  const lam = new Float64Array(nD), P = SEG.map(() => new Float64Array(Z.length * nD)), carga = new Float64Array(nD);
  const abierto = (t, f) => !(f === 'm' && PAR.HORAS_MADR[t] === 0);
  const ORDEN = Z.map((z, i) => [...Array(nD).keys()].filter(j => isFinite(KM[i * nD + j])).sort((a, b) => KM[i * nD + a] - KM[i * nD + b] || a - b));
  const dMin = (i) => ORDEN[i].length ? KM[i * nD + ORDEN[i][0]] : 1e9, zOrd = [...Array(Z.length).keys()].sort((a, b) => dMin(a) - dMin(b) || a - b);
  const jCora = D.findIndex(d => d.tipo === 'cora');
  SEG.forEach(([c, f], s) => { for (const i of zOrd) { const tot = TS[s][i]; let resto = tot; if (!(tot > 0)) continue;
    for (const j of ORDEN[i]) { const t = D[j].tipo; if (!abierto(t, f)) continue;
      const toma = t === 'cora' ? resto : Math.min(resto, Math.max(0, D[j].cap - carga[j]) / PAR.EQ[c]); if (!(toma > 0)) continue;
      P[s][i * nD + j] += toma / tot; carga[j] += toma * PAR.EQ[c]; resto -= toma; if (resto <= 1e-9) break; }
    if (resto > 1e-9 && jCora >= 0) { P[s][i * nD + jCora] += resto / tot; carga[jCora] += resto * PAR.EQ[c]; } } });
  for (let j = 0; j < nD; j++) if (D[j].tipo !== 'cora' && carga[j] >= D[j].cap * 0.999) lam[j] = 1; // «lleno»
  // resultados por destino
  const out = { dest: D.map((d, j) => ({ id: d.id, n: d.n, tipo: d.tipo, cap: d.cap, lam: lam[j], carga: carga[j], hog: { m: 0, r: 0 }, com: { m: 0, r: 0 }, vkm: 0 })), vkm: { hog: 0, com: 0 },
    viajes: SEG.map(() => new Float64Array(Z.length * nD)), nD, flujo: new Float32Array(R.M), flujoCom: new Float32Array(R.M) };
  SEG.forEach(([c, f], s) => { for (let i = 0; i < Z.length; i++) for (let j = 0; j < nD; j++) { const v = TS[s][i] * P[s][i * nD + j]; if (!v) continue;
    out.viajes[s][i * nD + j] = v; out.dest[j][c][f] += v; const km = 2 * v * KM[i * nD + j]; out.dest[j].vkm += km; out.vkm[c] += km; } });
  // flujo por tramo (ida y vuelta): acumulando en cada árbol desde las hojas
  const acc = new Float64Array(R.N), accC = new Float64Array(R.N);
  for (let j = 0; j < nD; j++) { const T = D[j].arbol; acc.fill(0); accC.fill(0); let hay = false;
    for (let i = 0; i < Z.length; i++) { let v = 0, vc = 0; SEG.forEach(([c], s) => { const x = out.viajes[s][i * nD + j]; v += x; if (c === 'com') vc += x; }); if (v > 0) { acc[Z[i].nodo] += 2 * v; accC[Z[i].nodo] += 2 * vc; hay = true; } }
    if (!hay) continue;
    for (let q = T.orden.length - 1; q > 0; q--) { const u = T.orden[q], e = T.prevE[u]; if (e < 0 || !acc[u]) continue; const p = R.ea[e] === u ? R.eb[e] : R.ea[e]; out.flujo[e] += acc[u]; out.flujoCom[e] += accC[u]; acc[p] += acc[u]; accC[p] += accC[u]; } }
  const tot = (k, f) => out.dest.reduce((s, d) => s + d[k][f], 0);
  out.total = { hog: tot('hog', 'm') + tot('hog', 'r'), com: tot('com', 'm') + tot('com', 'r') };
  return out;
}

/* ---------------- resumen hoy vs. propuesta (lo que la simulación evalúa) ---------------- */
export function resumir(H, P, E) {
  const cH = H.dest.find(d => d.tipo === 'cora'), cP = P.dest.find(d => d.tipo === 'cora');
  const s = (o) => ({ car: o.hog.m + o.hog.r, cam: o.com.m + o.com.r, carM: o.hog.m, camM: o.com.m, carR: o.hog.r, camR: o.com.r });
  const coraHoy = s(cH), coraPro = s(cP), merc = P.dest.filter(d => d.tipo === 'barrio' || d.tipo === 'plazoleta'), bav = P.dest.find(d => d.tipo === 'bavaria');
  const tot = (o) => o.car + o.cam, sum = (L) => L.reduce((a, d) => { const x = s(d); return { car: a.car + x.car, cam: a.cam + x.cam, carM: a.carM + x.carM, camM: a.camM + x.camM }; }, { car: 0, cam: 0, carM: 0, camM: 0 });
  const mercT = sum(merc), bavT = bav ? s(bav) : { car: 0, cam: 0, carM: 0, camM: 0 }, bavLleno = !!bav && bav.lam > 0.05;
  const huertas = (H.total.hog + H.total.com) - (P.total.hog + P.total.com); // viajes que ya no se hacen (los cubren las huertas)
  const baja = tot(coraHoy) - tot(coraPro), absorbe = tot(mercT) + tot(bavT);
  const fBaja = tot(coraHoy) ? baja / tot(coraHoy) : 0, fRep = baja > 1 ? absorbe / baja : 0;
  const vkmH = H.vkm.hog + H.vkm.com, vkmP = P.vkm.hog + P.vkm.com;
  const k = (a, b) => (b > 0 ? a / b : 1);
  return {
    coraHoy, coraPro, merc: merc.map(d => ({ id: d.id, n: d.n, tipo: d.tipo, ...s(d), cap: d.cap, lleno: d.lam > 0.05 })), mercT, bav: bavT, bavLleno, huertas: Math.max(0, huertas),
    vkm: { hoy: vkmH, pro: vkmP, cambio: k(vkmP, vkmH) - 1, camHoy: H.vkm.com, camPro: P.vkm.com },
    keep: { car: k(coraPro.car, coraHoy.car), cam: k(coraPro.cam, coraHoy.cam), carM: k(coraPro.carM, coraHoy.carM), camM: k(coraPro.camM, coraHoy.camM), carR: k(coraPro.carR, coraHoy.carR), camR: k(coraPro.camR, coraHoy.camR) },
    hip: { baja: fBaja, reparto: fRep, cumple: fBaja >= PAR.HIP_MIN_BAJA && fRep >= PAR.HIP_MIN_REPARTO, enParte: fBaja >= PAR.HIP_MIN_BAJA * 0.33 && fRep >= 0.25 },
    entradas: { cubreHog: E.cubreHog, cubreCom: E.cubreCom, reg: E.reg, naves: E.naves, abiertos: merc.length }
  };
}

/* ---------------- módulo para la maqueta ---------------- */
export async function crearViajesMercados({ T3, cj }) {
  const THREE = T3.THREE, lw = T3.lw;
  const cargar = cj || window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const net = T3.net || await cargar('data3d/net.json');
  const [usos, carga] = await Promise.all([cargar('data3d/usos_edif.json?v=1'), cargar('data3d/carga.json?v=2').catch(() => ({ mercados: [] }))]);
  const R = construirRed(net, lw), Z = construirZonas(usos, lw, R);
  // red de mercados (otro módulo); si no está, respaldo: los 8 de carga.json, uno cada 26 semanas desde la semana 26 [SUP]
  let RED = null; try { RED = await import('./mercados_red.js?v=6'); } catch (e) { RED = null; }
  const RESPALDO = (carga.mercados || []).map((m, k) => { const w = lw(m.p[0], m.p[1]); return { id: 'm' + (k + 1), n: m.n || 'Mercado de barrio ' + (k + 1), tipo: 'barrio', x: w[0], z: w[1], cap: PAR.KG.barrio, desde: 26 + 26 * k }; });
  const fuenteMerc = () => RED ? 'data3d/mercados_red.js' : 'respaldo: 8 mercados de data3d/carga.json';
  /* mercados abiertos en la semana: con la propuesta a la vista, los mismos que dibuja mercados_red.js (mercadosAbiertos(): semana y avance
     de la propuesta); mirando «hoy», los que tendría la propuesta en esa semana (MERCADOS con desde ≤ semana) para poder comparar */
  function abiertosEn(sem) {
    let L = null;
    if (RED) { try { if (T3.escenario === 'proyecto' && typeof RED.mercadosAbiertos === 'function') L = RED.mercadosAbiertos(sem); else if (Array.isArray(RED.MERCADOS)) L = RED.MERCADOS.filter(m => (m.desde || 0) <= sem); } catch (e) { L = null; } }
    if (!Array.isArray(L)) L = RESPALDO.filter(m => m.desde <= sem);
    return L.filter(m => m && isFinite(m.x) && isFinite(m.z));
  }
  // capacidad: cap en kg de frutas y verduras por día (la de mercados_red.js) / PAR.KG_EQ kg por compra-equivalente [SUP]
  const capDe = (m) => { const t = m.tipo === 'plazoleta' ? 'plazoleta' : 'barrio', c = +m.cap; return (isFinite(c) && c > 0 ? c : PAR.KG[t]) / PAR.KG_EQ; };
  // árboles de rutas: uno por nodo de destino, una sola vez
  const ARB = new Map(), arbolDe = (x, z) => { const c = R.cercano(x, z); let T = ARB.get(c.i); if (!T) { T = arbol(R, c.i); ARB.set(c.i, T); } return T; };
  const dCora = { id: 'cora', n: 'Corabastos', tipo: 'cora', x: CORA[0], z: CORA[1], cap: Infinity, arbol: arbolDe(CORA[0], CORA[1]) };
  const dBav = { id: 'bav', n: 'Acopio Bavaria Común', tipo: 'bavaria', x: BAVC[0], z: BAVC[1], cap: PAR.CAP_BAV, arbol: arbolDe(BAVC[0], BAVC[1]) };

  /* ---------- entradas del modelo (semana, escenario de sim_vida, sliders) ---------- */
  function entradas() {
    const sem = RELOJ.sem, e = SIMST.esc || 'C', V = window.KEN_ESIM && window.KEN_ESIM.vida, o = V && V.S && V.S[e] && V.S[e].o, oA = V && V.S && V.S.A && V.S.A.o;
    const CS = T3.coraCS || { cora: 19, merc: 26, huer: 10 };
    const pers = o && isFinite(o.pct) ? o.pct / 100 : 0, persA = oA && isFinite(oA.pct) ? oA.pct / 100 : 0;
    const cubre = Math.min(0.9, Math.max(pers, (CS.huer || 0) / 100 * PAR.HUERTA_SLIDER));
    let ab = abiertosEn(sem); const barrio = ab.filter(m => m.tipo !== 'plazoleta'); // slider «Mercados de barrio»: tope de mercados de barrio abiertos
    if (isFinite(CS.merc) && barrio.length > CS.merc) { const quitar = new Set(barrio.slice(CS.merc)); ab = ab.filter(m => !quitar.has(m)); }
    return { sem, e, ab, cubreHog: cubre, cubreCom: cubre * PAR.HUERTA_COM, cubreHogA: Math.min(0.9, persA), reg: o && isFinite(o.reg) ? o.reg : 0, naves: CS.cora || 0,
      firma: [sem, e, T3.escenario, ab.map(m => m.id).join(','), cubre.toFixed(4), (o && o.reg || 0).toFixed(4), CS.cora, CS.merc, CS.huer, (persA).toFixed(4)].join('|') };
  }
  let EST = null; // { firma, H, P, res, destinos, viajes }
  /* llave rápida (alivio_cali.js llama quita() por cada vehículo en cada cuadro): solo se arma la firma completa si cambió la semana,
     el escenario, los sliders de Corabastos, la semana de sim_vida o hubo un aviso de cambio (sliders de SIM-01, «cora-cambio») */
  let gen = 0; addEventListener('cora-cambio', () => gen++); addEventListener('sim-cambio', () => gen++);
  const Kq = []; const llave = () => { const CS = T3.coraCS || {}, V = window.KEN_ESIM && window.KEN_ESIM.vida, S = V && V.S, e = SIMST.esc;
    const B = T3.bio && T3.bio.ESTADO;
    return [RELOJ.sem, gen, e, CS.cora, CS.merc, CS.huer, S && S[e] ? S[e].t : -1, S && S.A ? S.A.t : -1, PARSIM.P1 && PARSIM.P1.regional, T3.escenario, B ? B.proFrac : -1]; };
  function asegurar() {
    const q = llave(); if (EST && q.every((v, i) => v === Kq[i])) return EST; q.forEach((v, i) => { Kq[i] = v; });
    const I = entradas(); if (EST && EST.firma === I.firma) return EST;
    // [SUP] el acopio de Bavaria arranca con el 30 % de su capacidad y crece con las compras directas a la región (sim_vida: reg)
    const destinos = [dCora, Object.assign({}, dBav, { cap: PAR.CAP_BAV * (0.3 + 0.7 * Math.min(1, I.reg / PAR.REG_REF)) })].concat(I.ab.map(m => ({ id: m.id, n: m.n, tipo: m.tipo === 'plazoleta' ? 'plazoleta' : 'barrio', x: m.x, z: m.z, cap: capDe(m), arbol: arbolDe(m.x, m.z) })));
    const H = evaluar(R, Z, { destinos: [dCora], cubreHog: I.cubreHogA, cubreCom: I.cubreHogA * PAR.HUERTA_COM, reg: 0, naves: 0 });
    const P = evaluar(R, Z, { destinos, cubreHog: I.cubreHog, cubreCom: I.cubreCom, reg: I.reg, naves: I.naves });
    const res = resumir(H, P, { cubreHog: I.cubreHog, cubreCom: I.cubreCom, reg: I.reg, naves: I.naves });
    res.semana = I.sem; res.año = Math.floor(I.sem / 52) + 1; res.escenario = I.e; res.fuenteMercados = fuenteMerc();
    EST = { firma: I.firma, H, P, res, destinos, viajes: programar(P, destinos), ver: (EST ? EST.ver : 0) + 1 };
    T3.viajesAbasto.res = res;
    return EST;
  }

  /* ---------- viajes que se ven en el mapa (escala del día): programa determinista por día típico ---------- */
  const RUTAS = new Map();
  const rutaDe = (i, j, destinos) => { const k = destinos[j].arbol.fuente * 100000 + i; let r = RUTAS.get(k); if (r === undefined) { r = rutaA(R, destinos[j].arbol, Z[i].nodo); RUTAS.set(k, r); } return r; };
  function programar(P, destinos) {
    const L = [], nD = destinos.length;
    SEG.forEach(([c, f], s) => { for (let i = 0; i < Z.length; i++) for (let j = 0; j < nD; j++) {
      if (destinos[j].tipo === 'cora') continue; const v = P.viajes[s][i * nD + j]; if (!v) continue;
      const nE = v / PAR.ESC_VIS[c], id = ((i * 97 + j) * 4 + s) >>> 0, n = Math.floor(nE) + (RELOJ.azarDe('viajes_mercados', id, 0) < nE - Math.floor(nE) ? 1 : 0);
      if (!n) continue; const r = rutaDe(i, j, destinos); if (!r || r.L < 30) continue;
      for (let k = 0; k < n; k++) { const a = RELOJ.azarDe('viajes_mercados', id, 1 + k * 3), b = RELOJ.azarDe('viajes_mercados', id, 2 + k * 3), g = RELOJ.azarDe('viajes_mercados', id, 3 + k * 3);
        const vel = PAR.VEL[c] * (f === 'm' ? 1.15 : 1), dur = r.L / vel, esp = PAR.ESPERA[0] + (PAR.ESPERA[1] - PAR.ESPERA[0]) * b;
        // salida: madrugada entre 2:00 y 6:00 (llega antes de las 6); resto del día 6:00-18:00 (tenderos sobre todo hasta el mediodía)
        const t0 = f === 'm' ? 2 * 3600 + a * Math.max(60, 4 * 3600 - dur) : c === 'com' ? 6 * 3600 + Math.pow(a, 1.6) * 12 * 3600 : 7 * 3600 + a * 12 * 3600;
        const tipo = c === 'hog' ? 'carro' : g < 0.45 ? 'van' : g < 0.75 ? 'furgon' : 'estacas';
        L.push({ t0, dur, esp, r, c, tipo, j, col: c === 'hog' ? [0xd9d9d6, 0x7a7f86, 0x2f3540, 0x9c1f24, 0x1f3f6e, 0xb8bcc2][Math.floor(g * 6) % 6] : tipo === 'van' ? 0xeeeeec : tipo === 'furgon' ? [0xf3f3f0, 0x2c5aa0, 0xc0392b][Math.floor(g * 9) % 3] : [0x2f6b3a, 0x1f4e8c, 0xb03a2e][Math.floor(g * 7) % 3], vl: (g - 0.5) * 0.5 });
      } } });
    L.sort((p, q) => p.t0 - q.t0); return L;
  }
  // posición de un viaje a la hora s (segundos del día): ida, espera en el mercado, vuelta
  const pos = (v, s, o) => { let u = s - v.t0; if (u < 0) return false; let d;
    if (u < v.dur) d = u / v.dur * v.r.L; else if (u < v.dur + v.esp) return false; else if (u < 2 * v.dur + v.esp) d = (1 - (u - v.dur - v.esp) / v.dur) * v.r.L; else return false;
    const ida = u < v.dur, S = v.r.S, P = v.r.P; let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= d) lo = m; else hi = m; }
    const a = P[lo], b = P[hi], f = (d - S[lo]) / Math.max(1e-6, S[hi] - S[lo]); let dx = b[0] - a[0], dz = b[1] - a[1]; if (!ida) { dx = -dx; dz = -dz; }
    const l = Math.hypot(dx, dz) || 1; o.x = a[0] + (b[0] - a[0]) * f; o.z = a[1] + (b[1] - a[1]) * f; o.fx = dx / l; o.fz = dz / l; return true; };
  const activo = () => T3.escenario === 'proyecto';

  /* ---------- reloj universal: escala del día ---------- */
  let tEst = RELOJ.t; const Q = { x: 0, z: 0, fx: 0, fz: 1 };
  RELOJ.registrar({ nombre: 'viajes_mercados', orden: 34, step: (dt, t) => { tEst = t + dt; },
    hash: () => { if (!activo()) return hashNum(0x811c9dc5, 0); const E = asegurar(), s = tEst % RELOJ.DIA; let h = hashNum(0x811c9dc5, E.res.coraPro.car + E.res.coraPro.cam), n = 0;
      for (const v of E.viajes) { if (v.t0 > s) break; if (pos(v, s, Q)) { n++; h = hashNum(hashNum(h, Q.x), Q.z); } } return hashNum(h, n); } });

  /* ---------- acople con el tráfico del mapa (data3d/alivio_cali.js) ---------- */
  T3.viajesAbasto = {
    listo: true, PAR, res: null,
    // fracción de los vehículos cerca de Corabastos que se quita: FR × (1 − viajes a Corabastos propuesta / hoy) en la franja de la hora h
    quita(cam, h) { const E = asegurar(), K = E.res.keep, m = h >= 2 && h < 6; return (cam ? PAR.FR.cam : PAR.FR.car) * (1 - Math.min(1, cam ? (m ? K.camM : K.camR) : (m ? K.carM : K.carR))); },
    // lo que sigue en todo el día (para los indicadores que usan KEEP): 1 − FR × (1 − keep diario)
    keepDia(cam) { const E = asegurar(), K = E.res.keep; return 1 - (cam ? PAR.FR.cam : PAR.FR.car) * (1 - Math.min(1, cam ? K.cam : K.car)); },
    resultados: () => asegurar().res
  };
  asegurar();

  /* ---------- vehículos en ruta (modelos de data3d/vehiculos.js) ---------- */
  const grupo = new THREE.Group(); grupo.name = 'viajes_mercados'; grupo.visible = false; T3.scene.add(grupo);
  let VEH = null, verVeh = false, verRutas = false, modoRutas = 'pro', verPanel = false;
  import('./vehiculos.js?v=8').then(mv => { VEH = mv.crearVehiculos({ T3, movil: !!(T3.movil || T3.liviano), maxDist: 4000, cuantos: { carro: 160, camion: 200 } }); VEH.grupo.visible = false; }).catch(e => console.warn('viajes · vehículos:', e));
  const objs = [];

  /* ---------- capa «Rutas de abastecimiento»: flujo por tramo ---------- */
  const YV = () => (T3.viaY != null ? T3.viaY : 0.62);
  const cintaMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, fog: false, toneMapped: false });
  const cintas = new THREE.Mesh(new THREE.BufferGeometry(), cintaMat); cintas.renderOrder = 6; cintas.frustumCulled = false; grupo.add(cintas);
  const marcas = new THREE.Group(); grupo.add(marcas);
  const C_HOY = new THREE.Color('#e15759'), C_PRO = new THREE.Color('#e2a55b'), C_MAS = new THREE.Color('#e0603a'), C_MENOS = new THREE.Color('#4fb3a6'), C_CORA = new THREE.Color('#e15759');
  let verCintas = -1, modoCintas = '';
  function rehacerCintas() {
    const E = asegurar(); if (verCintas === E.ver && modoCintas === modoRutas) return; verCintas = E.ver; modoCintas = modoRutas;
    const Pp = [], Cc = [], Ii = [], FMIN = 25;
    for (let e = 0; e < R.M; e++) {
      const h = E.H.flujo[e], p = E.P.flujo[e]; let f, col;
      if (modoRutas === 'hoy') { f = h; col = C_HOY; } else if (modoRutas === 'pro') { f = p; col = C_PRO; } else { f = p - h; col = f > 0 ? C_MAS : C_MENOS; f = Math.abs(f); }
      if (f < FMIN) continue;
      const pts = R.eP[e], n = pts.length, w = Math.min(34, 3 + Math.sqrt(f) * 0.32), base = Pp.length / 3;
      for (let k = 0; k < n; k++) { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const [x, z] = pts[k], y = YV() + 0.5 + (T3.alzaVia ? T3.alzaVia(x, z) : 0); Pp.push(x - dz * w / 2, y, z + dx * w / 2, x + dz * w / 2, y, z - dx * w / 2); for (let r = 0; r < 2; r++) Cc.push(col.r, col.g, col.b);
        if (k) { const o = base + (k - 1) * 2; Ii.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setIndex(Ii);
    cintas.geometry.dispose(); cintas.geometry = g;
    // marcas: Corabastos, Bavaria y cada mercado abierto con sus viajes/día
    for (const m of marcas.children.slice()) { marcas.remove(m); if (m.material) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); } if (m.geometry) m.geometry.dispose(); }
    const r = E.res, fmt = (v) => Math.round(v).toLocaleString('es-CO');
    const lista = [[CORA, 'Corabastos', modoRutas === 'hoy' ? `${fmt(r.coraHoy.car + r.coraHoy.cam)} viajes/día hoy` : `${fmt(r.coraPro.car + r.coraPro.cam)} viajes/día (hoy ${fmt(r.coraHoy.car + r.coraHoy.cam)})`, '#e15759', 70]];
    if (modoRutas !== 'hoy') { lista.push([BAVC, 'Acopio Bavaria Común', `${fmt(r.bav.car + r.bav.cam)} viajes/día`, '#6ee7b7', 60]);
      E.destinos.forEach(d => { if (d.tipo !== 'barrio' && d.tipo !== 'plazoleta') return; const x = r.merc.find(q => q.id === d.id); if (x) lista.push([[d.x, d.z], d.n, `${fmt(x.car + x.cam)} viajes/día${x.lleno ? ' · lleno' : ''}`, '#e2a55b', 45]); }); }
    for (const [p, t, sub, col, alto] of lista) { const y = YV() + (T3.alzaVia ? T3.alzaVia(p[0], p[1]) : 0);
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([p[0], y, p[1], p[0], y + alto, p[1]], 3));
      const l = new THREE.Line(gg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthTest: false })); l.renderOrder = 20; marcas.add(l);
      const s = letrero(t, sub, col); s.position.set(p[0], y + alto, p[1]); marcas.add(s); }
  }
  function letrero(txt, sub, col) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), dpr = 2; x.font = `600 ${14 * dpr}px Inter,system-ui,sans-serif`; const w1 = x.measureText(txt).width; x.font = `400 ${12 * dpr}px Inter,system-ui,sans-serif`;
    const w = Math.ceil(Math.max(w1, x.measureText(sub).width) + 32 * dpr), h = 44 * dpr; c.width = w; c.height = h;
    x.fillStyle = 'rgba(13,15,18,.88)'; x.beginPath(); x.roundRect(0, 0, w, h, 8 * dpr); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(13 * dpr, 14 * dpr, 4.5 * dpr, 0, 6.283); x.fill();
    x.textBaseline = 'middle'; x.font = `600 ${14 * dpr}px Inter,system-ui,sans-serif`; x.fillStyle = '#e9ebec'; x.fillText(txt, 24 * dpr, 14 * dpr);
    x.font = `400 ${12 * dpr}px Inter,system-ui,sans-serif`; x.fillStyle = '#9aa2a7'; x.fillText(sub, 24 * dpr, 31 * dpr);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false })); s.scale.set(w / h * 0.032, 0.032, 1); s.center.set(0, 0); s.renderOrder = 21; return s;
  }

  /* ---------- panel ---------- */
  const css = document.createElement('style'); css.textContent = `
#vm-panel{position:fixed;z-index:41;right:16px;top:84px;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 190px);overflow:auto;display:none;
  background:rgba(13,16,19,.94);border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:12px 14px 12px;color:#e5e7eb;
  font:400 12px/1.4 var(--ui-sans,Inter,system-ui,sans-serif);box-shadow:0 10px 30px rgba(0,0,0,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-variant-numeric:tabular-nums}
#vm-panel h3{margin:0;font-weight:600;font-size:13px;letter-spacing:.01em}#vm-panel .vm-sub{color:#94a3b8;font-size:10.5px;margin:2px 0 8px}
#vm-panel .vm-x{position:absolute;right:8px;top:6px;background:none;border:0;color:#94a3b8;font-size:16px;cursor:pointer;padding:4px 8px}
#vm-panel .vm-hip{border-radius:8px;padding:8px 10px;margin:0 0 10px;font-size:11.5px;border:1px solid}
#vm-panel .vm-hip b{font-weight:600}#vm-panel .vm-hip.si{background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.35)}#vm-panel .vm-hip.si b{color:#6ee7b7}
#vm-panel .vm-hip.parte{background:rgba(226,165,91,.08);border-color:rgba(226,165,91,.35)}#vm-panel .vm-hip.parte b{color:#f3c47d}
#vm-panel .vm-hip.no{background:rgba(225,87,89,.08);border-color:rgba(225,87,89,.35)}#vm-panel .vm-hip.no b{color:#fca5a5}
#vm-panel table{width:100%;border-collapse:collapse;font-size:11px}#vm-panel th{font-weight:500;color:#94a3b8;text-align:right;font-size:10px;padding:2px 0 4px}
#vm-panel th:first-child,#vm-panel td:first-child{text-align:left}#vm-panel th:not(:first-child),#vm-panel td:not(:first-child){width:19%;padding-left:6px;white-space:nowrap}#vm-panel td{text-align:right;padding:3px 0;border-top:1px solid rgba(148,163,184,.1)}
#vm-panel td em{font-style:normal;font-size:10px;color:#94a3b8}#vm-panel .bj{color:#6ee7b7}#vm-panel .sb{color:#fca5a5}
#vm-panel .vm-sec{margin:10px 0 4px;font-size:10px;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase}
#vm-panel .vm-fila{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px}#vm-panel .vm-fila.v2{grid-template-columns:1fr 1fr}
#vm-panel .vm-fila button{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.22);color:#cbd5e1;border-radius:6px;padding:6px 4px;font:inherit;font-size:11px;cursor:pointer}
#vm-panel .vm-fila button.on{background:rgba(226,165,91,.16);border-color:rgba(226,165,91,.5);color:#f8e1bd}
#vm-panel .vm-ley{display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:#94a3b8;margin-top:6px}#vm-panel .vm-ley i{display:inline-block;width:14px;height:4px;border-radius:2px;margin-right:4px;vertical-align:middle}
#vm-panel details{margin-top:8px}#vm-panel summary{cursor:pointer;color:#cbd5e1;font-size:11px}#vm-panel .vm-nota{color:#8b95a1;font-size:10.5px;margin:6px 0 0}
#vm-panel .vm-merc{max-height:150px;overflow:auto}
@media(max-width:760px){#vm-panel{top:auto;bottom:12px;right:12px;left:12px;width:auto;max-height:55vh;padding:10px 12px}}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'vm-panel'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Viajes de abastecimiento'); document.body.appendChild(el);
  el.innerHTML = `<button class="vm-x" type="button" aria-label="Cerrar">×</button><h3>Viajes de abastecimiento</h3><div class="vm-sub" data-sub></div>
<div class="vm-hip" data-hip></div><div data-tab></div>
<div class="vm-sec">Rutas de abastecimiento en el mapa</div>
<div class="vm-fila" data-rutas><button type="button" data-m="hoy">Hoy</button><button type="button" data-m="pro">Propuesta</button><button type="button" data-m="cambio">Cambio</button><button type="button" data-m="">Apagar</button></div>
<div class="vm-ley" data-ley></div>
<div class="vm-sec">Vehículos de reparto en ruta</div>
<div class="vm-fila v2" data-veh><button type="button" data-v="1">Ver</button><button type="button" data-v="">Apagar</button></div>
<div class="vm-nota" data-vnota></div>
<details><summary>Cada mercado abierto</summary><div class="vm-merc" data-merc></div></details>
<details><summary>Cómo se evalúa (supuestos)</summary><p class="vm-nota">Zonas de 500 m con los lotes residenciales y comerciales del catastro de usos. Hogares: ${PAR.TASA_HOG} viajes/día en carro o moto [SUP]. Tenderos: ${Math.round(PAR.FR_COM_ALIM * 100)} % de los comercios, ${PAR.TASA_COM} viajes/día, ${Math.round(PAR.MADR.com * 100)} % entre 2 y 6 a. m. [SUP]. Cada viaje va al destino abierto más cercano por la red vial real (camino más corto en net.json); si ese mercado está lleno, al siguiente más cercano; Corabastos no tiene tope. Los mercados venden desde las 7:00, pero tienen bodega con cuarto frío y reciben mercancía a cualquier hora, también en la madrugada. Capacidad de cada mercado limitada [SUP]. Lo que cubren las huertas no viaja. Hipótesis cumplida si Corabastos baja ${Math.round(PAR.HIP_MIN_BAJA * 100)} % o más y ${Math.round(PAR.HIP_MIN_REPARTO * 100)} % o más de esa baja llega a los mercados y a Bavaria. El tráfico del mapa cerca de Corabastos quita ${Math.round(PAR.FR.car * 100)} % (carros) y ${Math.round(PAR.FR.cam * 100)} % (camiones) × la baja de viajes de cada franja [SUP]. Mercados: <span data-fuente></span>.</p></details>`;
  el.querySelector('.vm-x').onclick = () => panel(false);
  el.querySelectorAll('[data-rutas] button').forEach(b => b.onclick = () => { modoRutas = b.dataset.m || modoRutas; verRutas = !!b.dataset.m; aplicarVis(); pintar(true); });
  el.querySelectorAll('[data-veh] button').forEach(b => b.onclick = () => { verVeh = !!b.dataset.v; aplicarVis(); pintar(true); });
  const fmt = (v) => Math.round(v).toLocaleString('es-CO'), pc = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v * 100)) + ' %';
  let firmaPan = '';
  function pintar(forzar) {
    if (!verPanel) return; const E = asegurar(), r = E.res, f = E.firma + '|' + modoRutas + verRutas + verVeh + T3.escenario; if (!forzar && f === firmaPan) return; firmaPan = f;
    el.querySelector('[data-sub]').textContent = `Año ${r.año} · semana ${(r.semana % 52) + 1} · escenario ${r.escenario} · ${r.entradas.abiertos} mercados abiertos`;
    const H = r.hip, cls = H.cumple ? 'si' : H.enParte ? 'parte' : 'no';
    el.querySelector('[data-hip]').className = 'vm-hip ' + cls;
    el.querySelector('[data-hip]').innerHTML = `Hipótesis «los viajes que iban a Corabastos se reparten en los mercados y Bavaria»: <b>${H.cumple ? 'sí' : H.enParte ? 'en parte' : 'no'}</b>. Corabastos ${pc(-H.baja)} de viajes; de los que dejan de ir, <b>${Math.round(H.reparto * 100)} %</b> llegan a los mercados y a Bavaria${r.huertas > 1 ? ` y ${fmt(r.huertas)} ya no se hacen (huertas)` : ''}.${r.merc.length ? ` ${r.merc.filter(m => m.lleno).length} de ${r.merc.length} mercados llenos (capacidad ${(r.merc.reduce((s, m) => s + m.cap, 0) * PAR.KG_EQ / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} t/día)${r.bavLleno ? ' · acopio de Bavaria lleno' : ''}.` : ''}`;
    const d = (a, b) => `<span class="${b < a ? 'bj' : b > a ? 'sb' : ''}">${pc(a > 0 ? b / a - 1 : 0)}</span>`;
    el.querySelector('[data-tab]').innerHTML = `<table><tr><th>viajes/día</th><th>hoy</th><th>propuesta</th><th>cambio</th></tr>
<tr><td>Corabastos · carros y motos</td><td>${fmt(r.coraHoy.car)}</td><td>${fmt(r.coraPro.car)}</td><td>${d(r.coraHoy.car, r.coraPro.car)}</td></tr>
<tr><td>Corabastos · camiones</td><td>${fmt(r.coraHoy.cam)}</td><td>${fmt(r.coraPro.cam)}</td><td>${d(r.coraHoy.cam, r.coraPro.cam)}</td></tr>
<tr><td>&nbsp;&nbsp;<em>madrugada 2-6 h · camiones</em></td><td>${fmt(r.coraHoy.camM)}</td><td>${fmt(r.coraPro.camM)}</td><td>${d(r.coraHoy.camM, r.coraPro.camM)}</td></tr>
<tr><td>&nbsp;&nbsp;<em>madrugada 2-6 h · carros</em></td><td>${fmt(r.coraHoy.carM)}</td><td>${fmt(r.coraPro.carM)}</td><td>${d(r.coraHoy.carM, r.coraPro.carM)}</td></tr>
<tr><td>Mercados (${r.entradas.abiertos}) · carros / camiones</td><td>0</td><td>${fmt(r.mercT.car)} / ${fmt(r.mercT.cam)}</td><td></td></tr>
<tr><td>Acopio Bavaria · carros / camiones</td><td>0</td><td>${fmt(r.bav.car)} / ${fmt(r.bav.cam)}</td><td></td></tr>
<tr><td>Vehículos-km/día</td><td>${fmt(r.vkm.hoy)}</td><td>${fmt(r.vkm.pro)}</td><td>${d(r.vkm.hoy, r.vkm.pro)}</td></tr></table>`;
    el.querySelector('[data-merc]').innerHTML = r.merc.length ? `<table><tr><th>mercado</th><th>carros</th><th>camiones</th><th>madrug.</th></tr>${r.merc.slice().sort((a, b) => (b.car + b.cam) - (a.car + a.cam)).map(m => `<tr><td>${m.n}${m.lleno ? ' <em>· lleno</em>' : ''}</td><td>${fmt(m.car)}</td><td>${fmt(m.cam)}</td><td>${fmt(m.camM + m.carM)}</td></tr>`).join('')}</table>` : '<p class="vm-nota">Aún no hay mercados abiertos en esta semana.</p>';
    el.querySelectorAll('[data-rutas] button').forEach(b => b.classList.toggle('on', verRutas ? b.dataset.m === modoRutas : !b.dataset.m));
    el.querySelectorAll('[data-veh] button').forEach(b => b.classList.toggle('on', !!b.dataset.v === verVeh));
    el.querySelector('[data-ley]').innerHTML = !verRutas ? '' : modoRutas === 'cambio' ? '<span><i style="background:#e0603a"></i>gana vehículos</span><span><i style="background:#4fb3a6"></i>pierde vehículos</span><span>ancho = vehículos/día (ida y vuelta)</span>'
      : `<span><i style="background:${modoRutas === 'hoy' ? '#e15759' : '#e2a55b'}"></i>${modoRutas === 'hoy' ? 'hoy: todo va a Corabastos' : 'con la propuesta: Corabastos, mercados y Bavaria'}</span><span>ancho = vehículos/día</span>`;
    el.querySelector('[data-vnota]').textContent = `1 vehículo en el mapa = ${PAR.ESC_VIS.com} viajes de tenderos o ${PAR.ESC_VIS.hog} de hogares. Solo con la propuesta; la mayoría en la madrugada (2-6 h).${T3.escenario === 'proyecto' ? '' : ' Pasa a «Con la propuesta» para verlos.'}`;
    el.querySelector('[data-fuente]').textContent = r.fuenteMercados;
  }
  function aplicarVis() { grupo.visible = verRutas; if (verRutas) rehacerCintas(); if (VEH) VEH.grupo.visible = verVeh && activo(); }
  function panel(on) { verPanel = !!on; el.style.display = verPanel ? 'block' : 'none'; if (verPanel) pintar(true); }
  function ver(on) { verRutas = !!on; verVeh = !!on; if (on && !modoRutas) modoRutas = 'pro'; aplicarVis(); pintar(true); }

  /* ---------- dibujo (bucle maestro): vehículos a la hora tVis; cintas y panel cuando cambia el resultado ---------- */
  let cuadros = 0;
  RELOJ.alDibujar(() => {
    cuadros++;
    if (verRutas && (cuadros % 15 === 0)) rehacerCintas();
    if (verPanel && cuadros % 20 === 0) pintar(false);
    if (!VEH) return;
    const on = verVeh && activo(); VEH.grupo.visible = on; if (!on) return;
    const E = asegurar(), s = RELOJ.tVis % RELOJ.DIA; VEH.inicio(); let n = 0;
    for (let k = 0; k < E.viajes.length; k++) { const v = E.viajes[k]; if (v.t0 > s) break; if (!pos(v, s, Q)) continue;
      let o = objs[n]; if (!o) objs[n] = o = {}; o._vv = v.tipo; o._vc = v.col; o._vl = v.vl;
      const tp = v.tipo === 'furgon' || v.tipo === 'estacas' ? 'camion' : 'carro', lat = (tp === 'camion' ? 2.0 : 1.8) + v.vl; // carril de la derecha
      const x = Q.x - Q.fz * lat, z = Q.z + Q.fx * lat, y = YV() + 0.02 + (T3.alzaVia ? T3.alzaVia(x, z) : 0);
      VEH.poner(o, tp, x, y, z, Math.atan2(Q.fx, Q.fz)); n++; }
    VEH.fin(); T3.viajesAbasto.enRuta = n;
  });
  addEventListener('escenario', () => { aplicarVis(); pintar(true); });

  // vehículos en ruta a la hora del reloj (para seguir uno con la cámara o revisar): [{x, z, tipo, destino}]
  const enRutaAhora = () => { const E = asegurar(), s = RELOJ.tVis % RELOJ.DIA, L = []; if (!activo()) return L;
    for (const v of E.viajes) { if (v.t0 > s) break; if (pos(v, s, Q)) L.push({ x: Q.x, z: Q.z, tipo: v.tipo, destino: E.destinos[v.j].n }); } return L; };
  return { ver, panel, resultados: () => asegurar().res, grupo, vehiculos: enRutaAhora, get enRuta() { return T3.viajesAbasto.enRuta || 0; }, red: R, zonas: Z, asegurar };
}
