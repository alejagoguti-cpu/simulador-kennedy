/* METRO L1: eje y estaciones leídos de data3d/metro_l1.js (marco MODELO → MUNDO). Compartido por tools/escenarios_instalacion.mjs y
   tools/simulaciones_datos.mjs (antes vivía dentro de escenarios_instalacion.mjs; mismo código). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LC = [5341.33, 3161.9], mundo = (x, y) => [x - LC[0], LC[1] - y]; // MODELO → MUNDO (x este, z sur), igual que lw() de index.html
const METRO_TXT = readFileSync(join(REPO, 'data3d/metro_l1.js'), 'utf8');
export const METRO_PTS = JSON.parse(METRO_TXT.match(/const PTS = (\[\[.*?\]\]);/)[1]).map(([x, y]) => mundo(x, y));
export const METRO_EST = [...METRO_TXT.matchAll(/\{ n: (\d), nombre: '([^']+)', ref: \['(car|frac)', ([\d.]+), (\d+)(?:, (\d+))?\]/g)].map(m => ({ n: +m[1], nombre: m[2], ref: m[3], a: +m[4], b: +m[5], c: m[6] ? +m[6] : null }));
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return { d: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz), t }; };
const largoAcum = (P) => { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; };
const ML = largoAcum(METRO_PTS);
const sSobre = (p) => { let b = Infinity, bs = 0; for (let i = 1; i < METRO_PTS.length; i++) { const r = dSeg(p, METRO_PTS[i - 1], METRO_PTS[i]); if (r.d < b) { b = r.d; bs = ML[i - 1] + r.t * (ML[i] - ML[i - 1]); } } return bs; };
export const enS = (s) => { let i = 1; while (i < ML.length - 1 && ML[i] < s) i++; const f = (s - ML[i - 1]) / Math.max(1e-9, ML[i] - ML[i - 1]); return [METRO_PTS[i - 1][0] + f * (METRO_PTS[i][0] - METRO_PTS[i - 1][0]), METRO_PTS[i - 1][1] + f * (METRO_PTS[i][1] - METRO_PTS[i - 1][1])]; };
METRO_EST.filter(e => e.ref === 'car').forEach(e => { e.s = sSobre(mundo(e.a, e.b)); });
METRO_EST.filter(e => e.ref === 'frac').forEach(e => { const A = METRO_EST.find(q => q.n === e.b).s, B = METRO_EST.find(q => q.n === e.c).s; e.s = A + (B - A) * e.a; }); // la 5 a media distancia entre 4 y 6 (como metro_l1.js) [SUP de metro_l1.js]
export const distMetro = (x, z) => { let b = Infinity; for (let i = 1; i < METRO_PTS.length; i++) b = Math.min(b, dSeg([x, z], METRO_PTS[i - 1], METRO_PTS[i]).d); return b; };
