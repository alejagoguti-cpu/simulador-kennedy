/* BARRIOS DE GOBERNANZA para data3d/simulaciones12.js (par 06 · Gobernanza): tabla GOB_BARRIOS, copiada a mano en ese archivo.
   USO: node tools/gobernanza_datos.mjs   → imprime la tabla.
   Agrupa las zonas de 500 m del modelo (data3d/sim_red_datos.js, ZONAS con población) en K sectores con k-medias ponderadas por población
   (semillas deterministas: las K zonas más pobladas separadas al menos 1,2 km). Cada sector toma el nombre de la Junta de Acción Comunal
   (data3d/asambleas.json, IDPAC) más cercana a su centro, que hace de asamblea local del sector. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ZONAS } = await import(pathToFileURL(join(REPO, 'data3d/sim_red_datos.js')).href);
const JAC = JSON.parse(readFileSync(join(REPO, 'data3d/asambleas.json'), 'utf8')).p;
const K = 8, Z = ZONAS.map((z, i) => ({ i, x: z[0], z: z[1], p: z[2] })).filter(z => z.p > 0);
const sem = []; for (const z of [...Z].sort((a, b) => b.p - a.p)) { if (sem.every(c => Math.hypot(c.x - z.x, c.z - z.z) >= 1200)) sem.push({ x: z.x, z: z.z }); if (sem.length === K) break; }
let asig = [];
for (let it = 0; it < 50; it++) {
  asig = Z.map(z => { let b = 0, d = Infinity; sem.forEach((c, k) => { const e = Math.hypot(c.x - z.x, c.z - z.z); if (e < d) { d = e; b = k; } }); return b; });
  sem.forEach((c, k) => { let sx = 0, sz = 0, w = 0; Z.forEach((z, j) => { if (asig[j] === k) { sx += z.x * z.p; sz += z.z * z.p; w += z.p; } }); if (w) { c.x = sx / w; c.z = sz / w; } }); }
const out = sem.map((c, k) => { let jb = null, d = Infinity; for (const j of JAC) { const e = Math.hypot(j[0] - c.x, j[1] - c.z); if (e < d) { d = e; jb = j; } }
  return { n: 'Sector ' + jb[2], x: Math.round(c.x), z: Math.round(c.z), jac: { n: 'JAC ' + jb[2], x: Math.round(jb[0]), z: Math.round(jb[1]) }, zonas: Z.filter((z, j) => asig[j] === k).map(z => z.i) }; });
console.log(JSON.stringify(out));
