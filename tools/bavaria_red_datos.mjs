/* ============ BAVARIA · ejes de ciclorruta y de biofiltros (SUDS) a partir de las calzadas y alamedas del plan parcial ============
   node tools/bavaria_red_datos.mjs   →  data3d/bavaria_red_urbana.json
   Método (papa por papa):
   1. Se rasterizan en una rejilla de 2 m las calzadas y las alamedas de data3d/plan_bavaria.json (Decreto Distrital 448 de 2023, calcado del plano),
      guardando el año de obra de cada celda (el menor).
   2. Se adelgaza la máscara a un esqueleto de 1 celda (Zhang–Suen) y se podan los ramales de < 16 m.
   3. Del esqueleto se sacan cadenas (tramos entre cruces); la mitad de ancho de la vía en cada punto es la distancia al borde de la máscara.
   4. SUDS: desde la entrada del humedal (la tubería de aguas lluvias llega por el norte, junto a CAUCE[0][0] de humedal_bavaria3d.js) se hace una
      búsqueda en anchura sobre el esqueleto; cada cadena queda orientada hacia la entrada (sentido del agua). Los tramos sin camino hasta la entrada
      no llevan biofiltro.
   5. Área impermeable por año: huellas de edificios + calzadas + andenes del plan (las alamedas y los parques cuentan como permeables) [SUP].
   Salida en el marco del modelo (x este, y norte), puntos [x, y, mitadAncho, año]. */
import fs from 'node:fs';
const P = JSON.parse(fs.readFileSync(new URL('../data3d/plan_bavaria.json', import.meta.url), 'utf8'));
const num = (s) => (typeof s === 'string' ? s.split(' ').map(Number) : s);
const anillo = (r) => r.map(num);
const area = (R) => { let a = 0; for (let i = 0; i < R.length; i++) { const p = R[i], q = R[(i + 1) % R.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
const areaP = (q) => area(anillo(q.o)) - (q.h || []).reduce((s, h) => s + area(anillo(h)), 0);

/* ---- área impermeable por año ---- */
const imp = new Array(11).fill(0), verde = new Array(11).fill(0);
for (const e of P.edificios) for (const q of e.p) imp[e.anio] += areaP(q);
for (const c of [...P.calzadas, ...P.andenes]) for (const q of c.p) imp[c.anio] += areaP(q);
for (const c of P.alamedas) for (const q of c.p) verde[c.anio] += areaP(q);
const impAcum = []; let ac = 0; for (let a = 1; a <= 10; a++) { ac += imp[a]; impAcum[a] = Math.round(ac); }

console.log('1/7 rejilla');/* ---- rejilla ---- */
const CEL = 2; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
for (const p of P.borde) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
x0 -= 20; y0 -= 20; x1 += 20; y1 += 20;
const NX = Math.ceil((x1 - x0) / CEL), NY = Math.ceil((y1 - y0) / CEL), N = NX * NY;
const M = new Uint8Array(N), AN = new Uint8Array(N).fill(99);
const dentro = (R, x, y) => { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) if ((R[i][1] > y) !== (R[j][1] > y) && x < (R[j][0] - R[i][0]) * (y - R[i][1]) / (R[j][1] - R[i][1]) + R[i][0]) c = !c; return c; };
for (const grp of [P.calzadas, P.alamedas]) for (const c of grp) for (const q of c.p) {
  const O = anillo(q.o), H = (q.h || []).map(anillo); let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9; for (const p of O) { a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]); b0 = Math.min(b0, p[1]); b1 = Math.max(b1, p[1]); }
  for (let j = Math.max(0, Math.floor((b0 - y0) / CEL)); j <= Math.min(NY - 1, Math.floor((b1 - y0) / CEL)); j++) for (let i = Math.max(0, Math.floor((a0 - x0) / CEL)); i <= Math.min(NX - 1, Math.floor((a1 - x0) / CEL)); i++) {
    const x = x0 + (i + 0.5) * CEL, y = y0 + (j + 0.5) * CEL; if (!dentro(O, x, y) || H.some((h) => dentro(h, x, y))) continue; const k = j * NX + i; M[k] = 1; AN[k] = Math.min(AN[k], c.anio); } }
/* cierre morfológico de 1 celda (huecos de calcado) */
const dil = (A) => { const B = new Uint8Array(N); for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) { const k = j * NX + i; if (A[k] || A[k - 1] || A[k + 1] || A[k - NX] || A[k + NX]) B[k] = 1; } return B; };
const ero = (A) => { const B = new Uint8Array(N); for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) { const k = j * NX + i; if (A[k] && A[k - 1] && A[k + 1] && A[k - NX] && A[k + NX]) B[k] = 1; } return B; };
const MC = ero(dil(M)); for (let k = 0; k < N; k++) if (MC[k] && AN[k] === 99) AN[k] = 5;
/* distancia al borde (chaflán 3-4) en celdas */
const D = new Float32Array(N); for (let k = 0; k < N; k++) D[k] = MC[k] ? 1e6 : 0;
for (let pasada = 0; pasada < 2; pasada++) { const rec = pasada === 0; for (let jj = 0; jj < NY; jj++) for (let ii = 0; ii < NX; ii++) { const j = rec ? jj : NY - 1 - jj, i = rec ? ii : NX - 1 - ii, k = j * NX + i; if (!MC[k]) continue; const v = rec ? [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]] : [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]];
  for (const [di, dj, w] of v) { const ni = i + di, nj = j + dj; const d = ni < 0 || nj < 0 || ni >= NX || nj >= NY ? 0.5 : D[nj * NX + ni]; D[k] = Math.min(D[k], d + w); } } }
console.log('2/7 esqueleto');/* Zhang–Suen */
let S = Uint8Array.from(MC);
const vec = (A, i, j) => [A[(j - 1) * NX + i], A[(j - 1) * NX + i + 1], A[j * NX + i + 1], A[(j + 1) * NX + i + 1], A[(j + 1) * NX + i], A[(j + 1) * NX + i - 1], A[j * NX + i - 1], A[(j - 1) * NX + i - 1]];
for (let cambio = true; cambio;) { cambio = false; for (let fase = 0; fase < 2; fase++) { const B = []; for (let j = 1; j < NY - 1; j++) for (let i = 1; i < NX - 1; i++) { if (!S[j * NX + i]) continue; const p = vec(S, i, j), n = p.reduce((a, b) => a + b, 0); if (n < 2 || n > 6) continue;
    let t = 0; for (let m = 0; m < 8; m++) if (!p[m] && p[(m + 1) % 8]) t++; if (t !== 1) continue;
    const c = fase === 0 ? p[0] * p[2] * p[4] === 0 && p[2] * p[4] * p[6] === 0 : p[0] * p[2] * p[6] === 0 && p[0] * p[4] * p[6] === 0; if (c) B.push(j * NX + i); }
    for (const k of B) S[k] = 0; if (B.length) cambio = true; } }
/* poda de ramales cortos (< 8 celdas) */
const vecinos = (k) => { const i = k % NX, j = (k - i) / NX, L = []; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const q = (j + dj) * NX + i + di; if (S[q]) L.push(q); } return L; };
for (let it = 0; it < 4; it++) { const fin = []; for (let k = 0; k < N; k++) if (S[k] && vecinos(k).length === 1) fin.push(k);
  for (const f of fin) { const ruta = [f]; let prev = -1, cur = f; for (;;) { const v = vecinos(cur).filter((q) => q !== prev && !ruta.includes(q)); if (v.length !== 1) break; prev = cur; cur = v[0]; ruta.push(cur); if (ruta.length > 8) break; }
    if (ruta.length <= 8 && vecinos(cur).length > 2) for (const q of ruta.slice(0, -1)) S[q] = 0; } }
console.log('3/7 desde la entrada');/* BFS desde la entrada del humedal */
const INLET = [9430, 3066]; // modelo; punto de entrada de las aguas lluvias (norte del humedal)
let ent = -1, de = 1e9; for (let k = 0; k < N; k++) if (S[k]) { const i = k % NX, j = (k - i) / NX, d = Math.hypot(x0 + (i + 0.5) * CEL - INLET[0], y0 + (j + 0.5) * CEL - INLET[1]); if (d < de) { de = d; ent = k; } }
const par = new Int32Array(N).fill(-2); par[ent] = -1; const cola = [ent]; for (let h = 0; h < cola.length; h++) for (const q of vecinos(cola[h])) if (par[q] === -2) { par[q] = cola[h]; cola.push(q); }
const dist = new Float32Array(N).fill(-1); { dist[ent] = 0; for (const k of cola.slice(1)) { const i = k % NX, j = (k - i) / NX, pi = par[k] % NX, pj = (par[k] - pi) / NX; dist[k] = dist[par[k]] + Math.hypot(i - pi, j - pj) * CEL; } }
/* cadenas: sobre el árbol de la entrada (orientadas hacia ella) y sobre los demás componentes (sin sentido) */
const xy = (k) => { const i = k % NX, j = (k - i) / NX; return [x0 + (i + 0.5) * CEL, y0 + (j + 0.5) * CEL, Math.round(Math.max(0, D[k] - 0.5) * CEL * 10) / 10, AN[k] === 99 ? 5 : AN[k]]; };
const hijos = new Map(); for (const k of cola) if (par[k] >= 0) { if (!hijos.has(par[k])) hijos.set(par[k], []); hijos.get(par[k]).push(k); }
const cadenasSUDS = []; const visto = new Set();
for (const k of cola) { if (visto.has(k)) continue; const nh = (hijos.get(k) || []).length; const esInicio = nh !== 1 || par[k] < 0; if (!esInicio) continue; /* hojas o cruces: empieza una cadena que sube por el padre hasta otro cruce */
  const ch = [k]; visto.add(k); let c = k; while (par[c] >= 0) { const p = par[c]; ch.push(p); if ((hijos.get(p) || []).length !== 1 || par[p] < 0) break; visto.add(p); c = p; } if (ch.length >= 2) cadenasSUDS.push(ch); }
/* los demás componentes: se trazan como cadenas simples para la ciclorruta */
const otros = []; { const usado = new Uint8Array(N); for (const k of cola) usado[k] = 1; for (let k = 0; k < N; k++) { if (!S[k] || usado[k]) continue; const comp = [k]; usado[k] = 1; for (let h = 0; h < comp.length; h++) for (const q of vecinos(comp[h])) if (!usado[q]) { usado[q] = 1; comp.push(q); }
  if (comp.length < 8) continue; const raiz = comp[0]; const pr = new Map([[raiz, -1]]); const cl = [raiz]; for (let h = 0; h < cl.length; h++) for (const q of vecinos(cl[h])) if (!pr.has(q)) { pr.set(q, cl[h]); cl.push(q); }
    const hj = new Map(); for (const q of cl) { const p = pr.get(q); if (p >= 0) { if (!hj.has(p)) hj.set(p, []); hj.get(p).push(q); } } const vs = new Set();
    for (const q of cl) { if (vs.has(q)) continue; const nh = (hj.get(q) || []).length; if (nh === 1 && pr.get(q) >= 0) continue; const ch = [q]; vs.add(q); let c = q; while (pr.get(c) >= 0) { const p = pr.get(c); ch.push(p); if ((hj.get(p) || []).length !== 1 || pr.get(p) < 0) break; vs.add(p); c = p; } if (ch.length >= 2) otros.push(ch); } } }
console.log('4/7 cadenas');/* simplificación (Douglas–Peucker 2,5 m) + Chaikin */
const rdp = (L, e) => { if (L.length < 3) return L; let dm = 0, im = 0; const a = L[0], b = L[L.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  for (let i = 1; i < L.length - 1; i++) { const t = Math.max(0, Math.min(1, ((L[i][0] - a[0]) * dx + (L[i][1] - a[1]) * dy) / l2)), d = Math.hypot(L[i][0] - a[0] - t * dx, L[i][1] - a[1] - t * dy); if (d > dm) { dm = d; im = i; } }
  return dm > e ? rdp(L.slice(0, im + 1), e).slice(0, -1).concat(rdp(L.slice(im), e)) : [a, b]; };
const chaikin = (L) => { if (L.length < 3) return L; const o = [L[0]]; for (let i = 0; i < L.length - 1; i++) { const p = L[i], q = L[i + 1], f = (u, v, t) => u + (v - u) * t; o.push(p.map((_, m) => (m < 3 ? f(p[m], q[m], 0.25) : p[m])), q.map((_, m) => (m < 3 ? f(p[m], q[m], 0.75) : q[m]))); } o.push(L[L.length - 1]); return o; };
const pulir = (ch) => chaikin(chaikin(rdp(ch.map(xy), 2.5))).map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, p[2], p[3]]);
const largo = (L) => { let s = 0; for (let i = 1; i < L.length; i++) s += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); return s; };
const suds = cadenasSUDS.map(pulir).filter((L) => largo(L) > 8), ciclo = cadenasSUDS.map(pulir).concat(otros.map(pulir)).filter((L) => largo(L) > 8);
/* km por año de obra (el año de cada tramo es el menor de sus puntos; se parte el tramo por año) */
const kmA = new Array(11).fill(0), kmS = new Array(11).fill(0);
const porAnio = (Ls, acc) => { for (const L of Ls) for (let i = 1; i < L.length; i++) acc[Math.min(L[i][3], L[i - 1][3])] += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); };
porAnio(ciclo, kmA); porAnio(suds, kmS);
const km = (v) => Math.round(v / 10) / 100;
const acum = (a) => { let s = 0; return a.map((v, i) => (i === 0 ? 0 : (s += v, km(s)))); };
const out = { _: { generado: 'node tools/bavaria_red_datos.mjs', fecha: '2026-11-26', marco: 'modelo (x este, y norte); puntos [x, y, mitadAncho m, año de obra]', fuente: 'data3d/plan_bavaria.json (calzadas y alamedas)', celda: CEL },
  entrada: INLET, entradaEsqueleto: xy(ent).slice(0, 2), distEntrada: Math.round(de),
  suds, ciclo, kmCicloAcum: acum(kmA), kmSudsAcum: acum(kmS), kmCiclo: km(kmA.reduce((a, b) => a + b, 0)), kmSuds: km(kmS.reduce((a, b) => a + b, 0)),
  impPorAnio: imp.map(Math.round), impAcum, alamedasPorAnio: verde.map(Math.round) };
fs.writeFileSync(new URL('../data3d/bavaria_red_urbana.json', import.meta.url), JSON.stringify(out));
console.log('esqueleto', S.reduce((a, b) => a + b, 0), 'celdas · cadenas SUDS', suds.length, '· ciclo', ciclo.length, '· km ciclo', out.kmCiclo, '· km suds', out.kmSuds, '· distancia entrada→esqueleto', Math.round(de), 'm');
console.log('km ciclo acum', out.kmCicloAcum.join(' '), '\nimp acum (ha)', impAcum.slice(1).map((v) => (v / 1e4).toFixed(1)).join(' '));
