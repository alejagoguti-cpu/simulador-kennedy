/* Genera data3d/exposicion_trafico.js: cuánto tráfico tiene cerca cada parche de hábitat del modelo semanal (data3d/sim_vida.js) y cuánto
   tráfico hay que cruzar entre dos parches. Sin azar: sale de la grabación SUMO (data3d/traf/cNN.bin, la misma que dibuja index.html).
   USO: node tools/exposicion_trafico_build.mjs
   · FLUJO POR CELDA (20 m): vehículos distintos que pasan por la celda en la grabación (1.499 s de hora pico) × 3.600/1.499 (por hora)
     × 3 (index.html superpone hasta 3 copias desfasadas de la grabación en hora pico) × Σ demanda horaria (DEMANDA_H de index.html,
     perfil del día respecto a la hora pico) = vehículos/día.
   · VÍA PRINCIPAL: celda con 10.000 vehículos/día o más (el umbral más bajo de Reijnen y Foppen 1997 para la zona de efecto en aves).
   · Por parche: distancia del centro a la celda de vía principal más cercana (m) y su flujo.
   · Por par de parches: suma del flujo de las vías principales que corta la línea recta entre ellos (cada tramo seguido de celdas = un cruce;
     dos calzadas separadas cuentan como dos cruces). */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LC = { x: 5341.33, y: 3161.9 };
const DEMANDA_H = [0.06, 0.04, 0.03, 0.03, 0.08, 0.32, 0.78, 0.95, 0.82, 0.62, 0.58, 0.62, 0.72, 0.7, 0.62, 0.66, 0.82, 1.0, 0.97, 0.78, 0.52, 0.36, 0.22, 0.12];
const SUMDEM = DEMANDA_H.reduce((a, v) => a + v, 0), COPIAS = 3, CEL = 20, UMBRAL = 10000;
const I = JSON.parse(readFileSync(join(REPO, 'data3d/traf/index.json'), 'utf8'));
const vistos = new Map(); // celda -> Set de ids
for (let k = 0; k < I.n; k++) {
  const b = readFileSync(join(REPO, 'data3d/traf/c' + String(k).padStart(2, '0') + '.bin')), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x31465452) throw new Error('formato');
  let o = 4; const ns = dv.getUint16(o, true); o += 2; o += 4; let prev = new Map();
  for (let s = 0; s < ns; s++) { const n = dv.getUint16(o, true); o += 2; const pid = o, pdx = o + 2 * n, pdy = o + 4 * n; o += 6 * n; const cur = new Map(); let id = 0;
    for (let i = 0; i < n; i++) { id += dv.getUint16(pid + 2 * i, true); const p = prev.get(id);
      const xi = p ? p[0] + dv.getInt16(pdx + 2 * i, true) : dv.getUint16(pdx + 2 * i, true), yi = p ? p[1] + dv.getInt16(pdy + 2 * i, true) : dv.getUint16(pdy + 2 * i, true);
      cur.set(id, [xi, yi]); const x = xi / I.scale - LC.x, z = LC.y - yi / I.scale, key = Math.floor(x / CEL) + ',' + Math.floor(z / CEL);
      let S = vistos.get(key); if (!S) vistos.set(key, S = new Set()); S.add(id); }
    prev = cur; }
}
const fDia = 3600 / I.dur * COPIAS * SUMDEM, Q = new Map(); for (const [k, S] of vistos) Q.set(k, S.size * fDia);
const viaQ = (x, z) => { const q = Q.get(Math.floor(x / CEL) + ',' + Math.floor(z / CEL)) || 0; return q >= UMBRAL ? q : 0; };
const vias = []; for (const [k, q] of Q) if (q >= UMBRAL) { const [i, j] = k.split(',').map(Number); vias.push([(i + 0.5) * CEL, (j + 0.5) * CEL, q]); }
const { PARCHES } = await import(pathToFileURL(join(REPO, 'data3d/sim_red_datos.js')).href);
const parches = PARCHES.map(p => { let bd = Infinity, bq = 0; for (const [x, z, q] of vias) { const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; bq = q; } } return [Math.round(bd), Math.round(bq)]; });
const NP = PARCHES.length, cruce = new Array(NP * NP).fill(0);
for (let a = 0; a < NP; a++) for (let b = a + 1; b < NP; b++) { const A = PARCHES[a], B = PARCHES[b], L = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(1, Math.ceil(L / 10));
  let suma = 0, enVia = false, maxQ = 0;
  for (let s = 0; s <= n; s++) { const x = A.x + (B.x - A.x) * s / n, z = A.z + (B.z - A.z) * s / n, q = viaQ(x, z);
    if (q > 0) { enVia = true; if (q > maxQ) maxQ = q; } else if (enVia) { suma += maxQ; enVia = false; maxQ = 0; } }
  if (enVia) suma += maxQ; cruce[a * NP + b] = cruce[b * NP + a] = Math.round(suma); }
const qs = vias.map(v => v[2]).sort((a, b) => a - b), med = qs[Math.floor(qs.length / 2)] || 0;
const txt = `/* GENERADO por tools/exposicion_trafico_build.mjs (no editar a mano). Tráfico cerca de cada parche del modelo semanal (data3d/sim_vida.js)
   y tráfico que se cruza entre parches, sacado de la grabación SUMO (data3d/traf). Celdas de ${CEL} m; vía principal = ${UMBRAL} vehículos/día o más
   (${vias.length} celdas; mediana ${Math.round(med)} veh/día). Flujo diario = vehículos distintos en la grabación × 3.600/${I.dur} × ${COPIAS} copias × ${SUMDEM.toFixed(2)} (perfil horario). */
export const EXPO = { cel: ${CEL}, umbral: ${UMBRAL}, celdasVia: ${vias.length}, medianaVia: ${Math.round(med)},
  parches: ${JSON.stringify(parches)}, // por parche (orden de PARCHES): [distancia del centro a la vía principal más cercana en m, su flujo en veh/día]
  cruce: ${JSON.stringify(cruce)} }; // por par de parches (fila × NP): suma del flujo (veh/día) de las vías principales que corta la línea recta
`;
writeFileSync(join(REPO, 'data3d/exposicion_trafico.js'), txt);
console.log('vías', vias.length, 'mediana', Math.round(med), 'max', Math.round(qs[qs.length - 1]));
console.log(PARCHES.slice(0, 30).map((p, i) => p.id + ':' + parches[i].join('/')).join(' '));
