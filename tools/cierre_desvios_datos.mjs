/* VÍAS DE DESVÍO de un cierre (data3d/simulaciones12.js, sims. 8 y 9): tabla DESVIOS, copiada a mano en ese archivo.
   USO: node tools/cierre_desvios_datos.mjs   → imprime la tabla.
   De tools/cache/kennedy_osm.json (OpenStreetMap, name / alt_name), con el mismo marco geo → mundo de tools/sim_red_datos_build.mjs:
   · para cada vía principal: dirección media (rumbo de sus tramos, ponderado por largo) y distancia (m) de cada parche del modelo a la vía.
   · desvíos de la vía cerrada = las otras vías principales casi PARALELAS (menos de 35° de diferencia de rumbo) a 2,5 km o menos de ella;
     [SUP] el tráfico de la vía cerrada se reparte entre esas paralelas. */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PARCHES } = await import(pathToFileURL(join(REPO, 'data3d/sim_red_datos.js')).href);
const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y];
const geo = (lat, lng) => lw((lng + 74.17) * 111320 * Math.cos(4.63 * Math.PI / 180) + 5193.24, (lat - 4.63) * 110540 + 2090.06);
const VIAS = [['americas', 'Av. de las Américas', /Am[eé]ricas/i], ['boyaca', 'Av. Boyacá', /Boyac[aá]/i], ['cali', 'Av. Ciudad de Cali', /Ciudad de Cali/i],
  ['mayo', 'Av. Primero de Mayo', /Primero de Mayo/i], ['agoberto', 'Av. Agoberto Mejía', /Agoberto/i], ['centenario', 'Av. Centenario (Calle 13)', /Centenario/i],
  ['av68', 'Av. Carrera 68', /Carrera 68|Congreso Eucar/i], ['villavicencio', 'Av. Villavicencio', /Villavicencio/i], ['calle6', 'Av. Calle 6', /Calle 6\b/i]];
const OSM = JSON.parse(readFileSync(join(REPO, 'tools', 'cache', 'kennedy_osm.json'), 'utf8')).elements.filter(e => e.type === 'way' && e.tags && e.tags.highway && e.geometry);
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
const out = {};
for (const [id, n, re] of VIAS) { const L = []; for (const w of OSM) { const t = w.tags; if (!/^(primary|secondary|trunk|motorway)/.test(t.highway)) continue;
    const nm = [t.name, t.alt_name, t.local_name, t.official_name, t.old_name].filter(Boolean).join(' / '); if (!re.test(nm)) continue;
    const P = w.geometry.map(g => geo(g.lat, g.lon)); for (let i = 1; i < P.length; i++) L.push([P[i - 1], P[i]]); }
  if (!L.length) continue;
  let cx = 0, cz = 0, W = 0; for (const [a, b] of L) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 2; cx += Math.cos(ang) * l; cz += Math.sin(ang) * l; W += l; }
  const rumbo = Math.atan2(cz, cx) / 2 * 180 / Math.PI;
  const dist = PARCHES.map(p => { let d = Infinity; for (const [a, b] of L) d = Math.min(d, dSeg([p.x, p.z], a, b)); return Math.round(Math.min(d, 9999)); });
  out[id] = { n, rumbo: Math.round(rumbo), km: Math.round(W / 100) / 10, L, dist }; }
const ids = Object.keys(out), res = {};
for (const id of ids) { const A = out[id], des = [];
  for (const j of ids) { if (j === id) continue; const B = out[j]; let da = Math.abs(A.rumbo - B.rumbo) % 180; if (da > 90) da = 180 - da; if (da >= 35) continue;
    let dm = Infinity; for (const [a] of A.L.filter((_, i) => i % 5 === 0)) for (const [c, d] of B.L) dm = Math.min(dm, dSeg(a, c, d)); if (dm <= 2500) des.push(j); }
  res[id] = { n: A.n, rumbo: A.rumbo, km: A.km, desvio: des, dist: A.dist }; }
console.log(JSON.stringify(res));
