/* SIMULACIÓN 02 · PASAJES PERMEABLES POR EL PREDIO DE BAVARIA + SINTAXIS ESPACIAL (R800) → data3d/mov02_pasajes.json
   USO: node tools/mov02_pasajes.mjs
   1. PASAJES: 4 recorridos peatonales entre entradas reales del lote (data3d/bavaria_pres.json, «entradas») en lados opuestos:
      oeste (Av. Boyacá, hacia Castilla) ↔ este (hacia Marsella) y norte ↔ sur. Se trazan por una grilla de 2 m con Dijkstra:
      · celdas prohibidas: fuera del lote, dentro de un edificio, o a menos de (radio de copa + 1 m) de CUALQUIER árbol (0 % tala);
      · costo = largo × (1 + 6 × (30 − d)/30 si d < 30 m), d = distancia al borde de la copa más cercana del BOSQUE (árboles con
        marca 1 en bavaria_arboles.json; 1.758 árboles, 22 ha): el pasaje se aleja del bosque todo lo que se puede.
      El colchón de 30 m del pedido NO se puede cumplir en todo el recorrido: el bosque rodea el lote por sus bordes (con 30 m solo
      queda libre el claro central de la fábrica). Se reporta para cada pasaje cuántos metros pasan a menos de 30 m del bosque y la
      distancia mínima; árboles talados: 0 (se verifica).
   2. SINTAXIS ESPACIAL (análisis angular de segmentos, como tools/bavaria_pres_datos.py): red = data3d/bavaria_sx.json (segmentos de
      OpenStreetMap; ANTES = los que tienen «a», sin los pasajes del distrito). DESPUÉS = ANTES + estos 4 pasajes.
      · radio 800 m métrico (segmentos a 800 m o menos de recorrido desde el centro del segmento origen); profundidad angular = suma de
        giros / 90° por el camino de menor giro (grafo completo).
      · NAIN800 = NC^1,2 / TD (Hillier, Yang y Turner 2012, «Normalising least angle choice in Depthmap»); NACH800 = log(CH+1)/log(TD+3).
      Se valida contra los valores «a» de bavaria_sx.json (mismo método, otro programa): se imprime la correlación. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = (f) => JSON.parse(readFileSync(join(REPO, 'data3d', f), 'utf8'));
const PR = J('bavaria_pres.json'), SX = J('bavaria_sx.json');
const LOTE = PR.sitio, ARB = PR.arboles, EDIF = PR.edif.map(e => e.p || e);
const dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [a, b] = P[i], [e, f] = P[j]; if ((b > y) !== (f > y) && x < (e - a) * (y - b) / (f - b) + a) c = !c; } return c; };
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };

/* ---------- 1. pasajes ---------- */
const PARES = [ // [nombre, entrada A, entrada B] (índices de PR.entradas)
  ['Pasaje 1 · Boyacá (Castilla) → sur-oriente', 10, 2], ['Pasaje 2 · Boyacá (Castilla) → norte', 8, 0], ['Pasaje 3 · nor-occidente → sur', 13, 9], ['Pasaje 4 · norte → sur-oriente', 0, 2]];
const S = 2, xs = LOTE.map(p => p[0]), ys = LOTE.map(p => p[1]);
const X0 = Math.min(...xs) - 10, Y0 = Math.min(...ys) - 10, W = Math.ceil((Math.max(...xs) + 10 - X0) / S), H = Math.ceil((Math.max(...ys) + 10 - Y0) / S);
const bloq = new Uint8Array(W * H), dB = new Float32Array(W * H).fill(99);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = X0 + i * S, y = Y0 + j * S, k = j * W + i;
  if (!dentro(LOTE, x, y) || EDIF.some(P => dentro(P, x, y))) { bloq[k] = 1; continue; } }
// árboles: bloqueo (copa + 1 m) y distancia al borde de copa del bosque (rasterizada en un radio de 32 m alrededor de cada árbol)
for (const t of ARB) { const [tx, ty, , r, bos] = t, R = bos ? r + 32 : r + 1.5;
  const i0 = Math.max(0, Math.floor((tx - R - X0) / S)), i1 = Math.min(W - 1, Math.ceil((tx + R - X0) / S)), j0 = Math.max(0, Math.floor((ty - R - Y0) / S)), j1 = Math.min(H - 1, Math.ceil((ty + R - Y0) / S));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(X0 + i * S - tx, Y0 + j * S - ty) - r, k = j * W + i;
    if (d < 1) bloq[k] = 1; if (bos && d < dB[k]) dB[k] = Math.max(0, d); } }
const celda = (x, y) => [Math.round((x - X0) / S), Math.round((y - Y0) / S)];
function libreCerca(x, y) { const [ci, cj] = celda(x, y); let b = -1, bd = 1e9; for (let j = cj - 20; j <= cj + 20; j++) for (let i = ci - 20; i <= ci + 20; i++) { if (i < 0 || j < 0 || i >= W || j >= H) continue; const k = j * W + i; if (bloq[k]) continue; const d = (i - ci) ** 2 + (j - cj) ** 2; if (d < bd) { bd = d; b = k; } } return b; }
function ruta(a, b) {
  const s = libreCerca(...a), t = libreCerca(...b), N = W * H, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), hv = [], hn = [];
  const push = (d, n) => { hv.push(d); hn.push(n); let i = hv.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; [hv[p], hv[i]] = [hv[i], hv[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; } };
  const pop = () => { const n = hn[0], lv = hv.pop(), ln = hn.pop(); if (hv.length) { hv[0] = lv; hn[0] = ln; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hv.length && hv[l] < hv[m]) m = l; if (r < hv.length && hv[r] < hv[m]) m = r; if (m === i) break; [hv[m], hv[i]] = [hv[i], hv[m]]; [hn[m], hn[i]] = [hn[i], hn[m]]; i = m; } } return n; };
  const pen = (k) => 1 + (dB[k] < 30 ? 6 * (30 - dB[k]) / 30 : 0);
  dist[s] = 0; push(0, s);
  while (hv.length) { const d = hv[0], u = pop(); if (d > dist[u]) continue; if (u === t) break; const ui = u % W, uj = (u / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const vi = ui + di, vj = uj + dj; if (vi < 0 || vj < 0 || vi >= W || vj >= H) continue; const v = vj * W + vi; if (bloq[v]) continue;
      const nd = d + S * Math.hypot(di, dj) * (pen(u) + pen(v)) / 2; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; push(nd, v); } } }
  if (!isFinite(dist[t])) return null;
  const L = []; for (let u = t; u >= 0; u = prev[u]) L.push(u); L.reverse();
  return L.map(k => [X0 + (k % W) * S, Y0 + ((k / W) | 0) * S]);
}
// simplificar sin pasar por celdas bloqueadas (Douglas–Peucker con chequeo de la grilla)
const rectaLibre = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n, [i, j] = celda(x, y); if (bloq[j * W + i]) return false; } return true; };
function simplificar(P, tol) { if (P.length < 3) return P; let im = 0, dm = 0; for (let i = 1; i < P.length - 1; i++) { const d = dSeg(P[i], P[0], P[P.length - 1]); if (d > dm) { dm = d; im = i; } }
  if (dm <= tol && rectaLibre(P[0], P[P.length - 1])) return [P[0], P[P.length - 1]]; if (!im) im = P.length >> 1; return [...simplificar(P.slice(0, im + 1), tol).slice(0, -1), ...simplificar(P.slice(im), tol)]; }
const E = PR.entradas, PAS = [];
for (const [n, ia, ib] of PARES) { const r = ruta(E[ia], E[ib]); if (!r) { console.log('sin ruta', n); continue; }
  const p = simplificar([E[ia], ...r, E[ib]].map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]), 1.5);
  // verificación: árboles cuya copa toca el eje (0 % tala), metros a menos de 30 m del bosque y distancia mínima
  let tala = 0; for (const t of ARB) for (let i = 1; i < p.length; i++) if (dSeg(t, p[i - 1], p[i]) < t[3]) { tala++; break; }
  let L = 0, L30 = 0, dmin = 99; for (let i = 1; i < p.length; i++) { const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]), n2 = Math.ceil(l / 2);
    for (let k = 0; k < n2; k++) { const x = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * (k + 0.5) / n2, y = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * (k + 0.5) / n2; let d = 99;
      for (const t of ARB) if (t[4]) { const dd = Math.hypot(x - t[0], y - t[1]) - t[3]; if (dd < d) d = dd; } if (d < 30) L30 += l / n2; if (d < dmin) dmin = d; } L += l; }
  PAS.push({ n, p, m: Math.round(L), m30: Math.round(L30), dmin: Math.round(Math.max(0, dmin) * 10) / 10, tala });
  console.log(n, Math.round(L), 'm · a <30 m del bosque', Math.round(L30), 'm · distancia mínima', dmin.toFixed(1), 'm · árboles tocados', tala); }

/* ---------- 2. sintaxis espacial ---------- */
function red(segs) { // segs: [{p}] → grafo de segmentos (nodos = extremos redondeados a 1 m)
  const key = (q) => Math.round(q[0]) + ',' + Math.round(q[1]), nodos = new Map(), N = segs.length, L = new Float32Array(N), cx = new Float32Array(N), cy = new Float32Array(N);
  segs.forEach((s, i) => { const p = s.p; let l = 0; for (let k = 1; k < p.length; k++) l += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); L[i] = Math.max(0.5, l);
    const m = p[p.length >> 1], m0 = p[(p.length - 1) >> 1]; cx[i] = (m[0] + m0[0]) / 2; cy[i] = (m[1] + m0[1]) / 2;
    for (const [e, q] of [[0, p[0]], [1, p[p.length - 1]]]) { const k = key(q); (nodos.get(k) || nodos.set(k, []).get(k)).push([i, e]); } });
  const dir = (s, e) => { const p = s.p, n = p.length; const [a, b] = e ? [p[n - 2], p[n - 1]] : [p[1], p[0]]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }; // dirección al LLEGAR al extremo e
  const adj = Array.from({ length: N }, () => []);
  for (const L2 of nodos.values()) for (const [i, ei] of L2) for (const [j, ej] of L2) { if (i === j) continue; const a = dir(segs[i], ei), b = dir(segs[j], ej); // salir por j = opuesto a llegar por j
      const c = Math.max(-1, Math.min(1, -(a[0] * b[0] + a[1] * b[1]))), ang = Math.acos(c) * 180 / Math.PI; adj[i].push([j, ang / 90]); }
  return { N, L, cx, cy, adj };
}
class Heap { constructor() { this.v = []; this.n = []; } get size() { return this.v.length; }
  push(d, n) { const v = this.v, h = this.n; v.push(d); h.push(n); let i = v.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (v[p] <= v[i]) break; [v[p], v[i]] = [v[i], v[p]]; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
  pop() { const v = this.v, h = this.n, n = h[0], lv = v.pop(), ln = h.pop(); if (v.length) { v[0] = lv; h[0] = ln; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < v.length && v[l] < v[m]) m = l; if (r < v.length && v[r] < v[m]) m = r; if (m === i) break; [v[m], v[i]] = [v[i], v[m]]; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return n; } }
function r800(G, fuentes, R = 800) { // NAIN800 y NACH800 de las fuentes; la elección se acumula en todos
  const { N, L, adj } = G, nain = new Float32Array(N).fill(NaN), td = new Float32Array(N), CH = new Float64Array(N);
  const dm = new Float64Array(N).fill(Infinity), da = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), toc = [];
  for (const s of fuentes) {
    // conjunto métrico: distancia por la red entre centros (mitad de cada segmento)
    const H1 = new Heap(); dm[s] = 0; H1.push(0, s); const set = []; while (H1.size) { const d = H1.v[0], u = H1.pop(); if (d > dm[u]) continue; set.push(u); toc.push(u);
      for (const [v] of adj[u]) { const nd = d + (L[u] + L[v]) / 2; if (nd <= R && nd < dm[v]) { dm[v] = nd; H1.push(nd, v); toc.push(v); } } }
    // profundidad angular (grafo completo) hasta asentar todo el conjunto
    const en = new Uint8Array(0); let falta = set.length; const H2 = new Heap(); da[s] = 0; H2.push(0, s); toc.push(s); const ord = [];
    while (H2.size && falta) { const d = H2.v[0], u = H2.pop(); if (d > da[u]) continue; ord.push(u); if (dm[u] <= R) falta--;
      for (const [v, c] of adj[u]) { const nd = d + c; if (nd < da[v]) { da[v] = nd; prev[v] = u; H2.push(nd, v); toc.push(v); } } }
    let T = 0, nc = 0; for (const u of set) { if (u === s || !isFinite(da[u])) continue; T += da[u]; nc++; }
    td[s] = T; nain[s] = T > 0 ? Math.pow(nc + 1, 1.2) / T : NaN;
    // elección: cada destino del conjunto suma 1 a los segmentos intermedios de su camino de menor giro
    for (const u of set) { if (u === s) continue; let w = prev[u]; while (w >= 0 && w !== s) { CH[w] += 1; w = prev[w]; } }
    for (const u of toc) { dm[u] = Infinity; da[u] = Infinity; prev[u] = -1; } toc.length = 0;
  }
  const nach = new Float32Array(N).fill(NaN); for (const s of fuentes) nach[s] = Math.log(CH[s] / 2 + 1) / Math.log(td[s] + 3); // /2: cada par se cuenta en los dos sentidos
  return { nain, nach };
}
const C0 = [9319, 2942.6], antes = SX.seg.filter(s => s.a), cerca = (s, r) => s.p.some(q => Math.hypot(q[0] - C0[0], q[1] - C0[1]) < r);
// pasajes: se parten en los cruces entre ellos y se unen a la red existente por su extremo (conector recto al nodo más cercano a ≤ 40 m)
const nodosRed = []; for (const s of antes) if (cerca(s, 1300)) for (const q of [s.p[0], s.p[s.p.length - 1]]) nodosRed.push(q);
const nuevos = [];
for (const P of PAS) { const p = P.p.slice();
  for (const k of [0, p.length - 1]) { let b = null, bd = 40; for (const q of nodosRed) { const d = Math.hypot(q[0] - p[k][0], q[1] - p[k][1]); if (d < bd) { bd = d; b = q; } } if (b && bd > 0.5) { if (k) p.push([...b]); else p.unshift([...b]); } else if (b) p[k] = [...b]; }
  P.eje = p; }
// cruces entre pasajes: se inserta el punto de cruce en ambos
const cruce = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]; if (Math.abs(den) < 1e-9) return null; const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den; return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999 ? [Math.round((a[0] + t * r[0]) * 10) / 10, Math.round((a[1] + t * r[1]) * 10) / 10] : null; };
for (let i = 0; i < PAS.length; i++) for (let j = i + 1; j < PAS.length; j++) { const A = PAS[i].eje, B = PAS[j].eje;
  for (let a = 1; a < A.length; a++) for (let b = 1; b < B.length; b++) { const x = cruce(A[a - 1], A[a], B[b - 1], B[b]); if (x) { A.splice(a, 0, x); B.splice(b, 0, x); a++; b++; } } }
// partir cada pasaje en sus cruces (puntos compartidos)
const comp = new Map(); for (const P of PAS) for (const q of P.eje) { const k = Math.round(q[0]) + ',' + Math.round(q[1]); comp.set(k, (comp.get(k) || 0) + 1); }
PAS.forEach((P, ip) => { let ini = 0; for (let i = 1; i < P.eje.length; i++) { const k = Math.round(P.eje[i][0]) + ',' + Math.round(P.eje[i][1]); if (i === P.eje.length - 1 || comp.get(k) > 1) { nuevos.push({ p: P.eje.slice(ini, i + 1), pas: ip }); ini = i; } } });
const despues = [...antes, ...nuevos];
const GA = red(antes), GD = red(despues);
const idxCerca = (segs, r) => segs.map((s, i) => cerca(s, r) ? i : -1).filter(i => i >= 0);
const FA = idxCerca(antes, 1700), FD = idxCerca(despues, 1700);
console.time('R800 antes'); const RA = r800(GA, FA); console.timeEnd('R800 antes');
console.time('R800 después'); const RD = r800(GD, FD); console.timeEnd('R800 después');
// validación contra bavaria_sx (a[1] = NAIN800 del mismo método en Python)
{ const xs2 = [], ys2 = []; for (const i of idxCerca(antes, 1000)) if (isFinite(RA.nain[i]) && antes[i].a[1] > 0) { xs2.push(RA.nain[i]); ys2.push(antes[i].a[1]); }
  const m = (v) => v.reduce((a, b) => a + b, 0) / v.length, mx = m(xs2), my = m(ys2); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < xs2.length; i++) { sxy += (xs2[i] - mx) * (ys2[i] - my); sxx += (xs2[i] - mx) ** 2; syy += (ys2[i] - my) ** 2; }
  console.log('validación NAIN800 contra bavaria_sx.json: n', xs2.length, 'r =', (sxy / Math.sqrt(sxx * syy)).toFixed(3), '· media aquí', mx.toFixed(3), '· media Python', my.toFixed(3)); }
const media = (v, I) => { let s = 0, n = 0; for (const i of I) if (isFinite(v[i])) { s += v[i]; n++; } return n ? s / n : null; };
const r3 = (v) => v == null ? null : Math.round(v * 1000) / 1000;
const barrioA = idxCerca(antes, 800), barrioD = idxCerca(despues, 800).filter(i => i < antes.length), pasI = antes.length ? nuevos.map((_, k) => antes.length + k) : [];
const res = {
  barrio800: { antes: { nain: r3(media(RA.nain, barrioA)), nach: r3(media(RA.nach, barrioA)) }, despues: { nain: r3(media(RD.nain, barrioD)), nach: r3(media(RD.nach, barrioD)) }, n: barrioA.length },
  pasajes: { nain: r3(media(RD.nain, pasI)), nach: r3(media(RD.nach, pasI)) },
  kennedyNain800: r3(media(Float32Array.from(SX.seg.filter(s => s.a).map(s => s.a[1])), [...Array(antes.length).keys()]))
};
console.log(JSON.stringify(res));
// segmentos a ≤ 900 m del lote (para pintar en el mapa): p, NAIN800 antes/después, NACH800 antes/después
const seg = []; for (const i of idxCerca(antes, 900)) seg.push({ p: antes[i].p, a: [r3(RA.nain[i]), r3(RA.nach[i])], b: [r3(RD.nain[i]), r3(RD.nach[i])] });
const segP = nuevos.map((s, k) => ({ p: s.p, pas: s.pas, b: [r3(RD.nain[antes.length + k]), r3(RD.nach[antes.length + k])] }));
PAS.forEach((P, ip) => { const I = nuevos.map((s, k) => s.pas === ip ? antes.length + k : -1).filter(i => i >= 0); P.nain = r3(media(RD.nain, I)); P.nach = r3(media(RD.nach, I)); delete P.eje; });
writeFileSync(join(REPO, 'data3d', 'mov02_pasajes.json'), JSON.stringify({
  fuente: 'tools/mov02_pasajes.mjs: pasajes trazados entre entradas reales del lote (bavaria_pres.json) sin tocar copas de árboles (bavaria_arboles.json, Esri World Imagery); sintaxis espacial angular R800 (método DepthmapX, Hillier et al. 2012) sobre la red OSM de bavaria_sx.json',
  pasajes: PAS, resumen: res, seg, segP }));
console.log('→ data3d/mov02_pasajes.json');
