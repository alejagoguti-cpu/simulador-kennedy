/* DATOS DEL PREDIO del Plan Parcial Fábrica Bavaria para data3d/simulaciones12.js (tabla PREDIO_PLAN, copiada a mano en ese archivo).
   USO: node tools/predio_bavaria_datos.mjs   → imprime la tabla.
   De data3d/plan_bavaria.json (Decreto Distrital 448 de 2023, calcado del plano oficial; tools/plan_bavaria_real.py):
   · vias[k]: polígonos de calzada que se abren en el año k+1 (plano 2/2 «Etapas»), y su área en m².
   · com[k]: m² construidos de comercio que abren en el año k+1 = área de lote × pisos de las manzanas «com» (pisos [SUP] de plan_bavaria.js).
   · dist[parche][k]: distancia (m) del centro de cada parche del modelo a 1000 m o menos del predio a la calzada abierta más cercana
     al final del año k+1 (vértices de los polígonos). Los parches se nombran por id (data3d/sim_red_datos.js). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = JSON.parse(readFileSync(join(REPO, 'data3d/plan_bavaria.json'), 'utf8'));
const { PARCHES } = await import(pathToFileURL(join(REPO, 'data3d/sim_red_datos.js')).href);
const { PLAN_BAV } = await import(pathToFileURL(join(REPO, 'data3d/plan_bavaria_datos.js')).href);
const lw = (x, y) => [x - 5341.33, 3161.9 - y], C = PLAN_BAV.CENTRO;
const area = (o) => { let s = 0; for (let i = 0; i < o.length; i++) { const a = o[i], b = o[(i + 1) % o.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
const vias = Array(10).fill(0), m2 = Array(10).fill(0), com = Array(10).fill(0), pts = Array.from({ length: 10 }, () => []);
for (const c of J.calzadas) { const k = c.anio - 1; vias[k] += c.p.length; for (const q of c.p) { m2[k] += area(q.o); for (const p of q.o) pts[k].push(lw(p[0], p[1])); } }
for (const e of J.edificios) if (e.tipo === 'com') com[e.anio - 1] += e.area_lote * e.pisos;
const cerca = PARCHES.filter(p => Math.hypot(p.x - C[0], p.z - C[1]) <= 1000);
const dist = {}; for (const P of cerca) { let d = Infinity; dist[P.id] = pts.map(L => { for (const [x, z] of L) d = Math.min(d, Math.hypot(x - P.x, z - P.z)); return Math.round(d); }); }
const borde = J.borde.map(p => lw(p[0], p[1]).map(v => Math.round(v)));
console.log(JSON.stringify({ vias, m2: m2.map(Math.round), com, dist, borde, haPredio: Math.round(area(J.borde) / 1e3) / 10 }));
