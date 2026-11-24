/* ============ DATOS PRECALCULADOS de data3d/simulaciones12.js (las 12 simulaciones) ============
   USO: node tools/simulaciones_datos.mjs   →   data3d/simulaciones_datos.json (< 2 MB; lo carga cargarDatos() en el navegador y en node)
   Contiene:
   · red: la red trófica compacta (data3d/red_trofica.js → datosRed): conteos de árboles del censo SIGAU por flora × parche (trees.json pesa 2,7 MB),
     árboles del bosque de Bavaria con su etapa de tala, enlaces de biotica.json, nombres y categorías.
   · PAR: los parámetros por defecto de la web (data3d/sim_modelos.js → PAR), leídos del texto como en tools/escenarios_instalacion.mjs.
   · metro: parches a METRO_RADIO m o menos del eje de la Línea 1 (tools/metro_eje.mjs).
   · ruido: nivel de HOY en dB(A) de cada celda de vía de 16 m, con la MISMA fórmula del simulador (data3d/capas_escenario.js, RM.refrescar + RM.flujo):
       celdas de 16 m sobre data3d/net.json con su clase (1 local, 2 intermedia, 3 principal); vehículos de la grabación SUMO (data3d/traf) que pasan
       por cada celda en todos los cuadros (un camión = 4 carros; camión = hash del id ≥ 0,92, como en capas_escenario.js), suavizado 3 × 3;
       nivel = LREF[clase] + 10·log10(flujo / flujo mediano de su clase), limitado a −8 / +5 dB; LREF = 60 / 68 / 74 dB [SUP del simulador].
     Se guarda ordenado en dos grupos (cerca y lejos del metro) y el flujo de cada grupo (para el índice de tráfico). */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (f) => readFileSync(join(REPO, f), 'utf8'), json = (f) => JSON.parse(leer(f));
const imp = (f) => import(pathToFileURL(join(REPO, f)).href);
const V = await imp('data3d/sim_vida.js'), RT = await imp('data3d/red_trofica.js'), { PARCHES } = await imp('data3d/sim_red_datos.js');
const { distMetro } = await imp('tools/metro_eje.mjs');
const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y], mundo = (x, y) => [x - LC.x, LC.y - y];
export const METRO_RADIO = 800; // [SUP] el mismo de tools/escenarios_instalacion.mjs (INST.METRO_RADIO): 800 m, distancia típica de caminata a una estación

/* ---------- red trófica ---------- */
const red = RT.datosRed({ BIO: json('data3d/biotica.json'), BIO_TXT: leer('data3d/biotica.js'), TREES: json('data3d/trees.json'), BAVA: json('data3d/bavaria_arboles.json'),
  PLANQ: json('data3d/plan_bavaria.json').arboles_quitados, PA_TXT: leer('data3d/parches_arboles.js'), PARCHES, mundo });

/* ---------- PAR ---------- */
const PAR = (() => { const t = leer('data3d/sim_modelos.js'), i0 = t.indexOf('export const PAR = {'), i1 = t.indexOf('\n};', i0);
  return Function('return ' + t.slice(i0 + 'export const PAR = '.length, i1 + 2))(); })();

/* ---------- ruido de hoy por celda de vía (fórmula de data3d/capas_escenario.js) ---------- */
const CEL = 16, LREF = [0, 60, 68, 74];
const N = json('data3d/net.json');
const E = N.edges.map(e => e[1].map(p => lw(p[0], p[1]))), CL = N.edges.map(e => e[0] === 'major' ? 3 : e[0] === 'mid' ? 2 : 1);
let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const P of E) for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
const x0 = a - CEL, z0 = b - CEL, nx = Math.ceil((c - a) / CEL) + 3, nz = Math.ceil((d - b) / CEL) + 3, via = new Uint8Array(nx * nz);
E.forEach((P, ie) => { const cl = CL[ie]; for (let k = 1; k < P.length; k++) { const A = P[k - 1], B = P[k], n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / (CEL * 0.7)));
  for (let q = 0; q <= n; q++) { const x = A[0] + (B[0] - A[0]) * q / n, z = A[1] + (B[1] - A[1]) * q / n, i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); if (i >= 0 && j >= 0 && i < nx && j < nz && cl > via[j * nx + i]) via[j * nx + i] = cl; } } });
const roads = []; for (let k = 0; k < via.length; k++) if (via[k]) roads.push(k);
const caja = (arr, r, media) => { const t = new Float32Array(arr.length), o = new Float32Array(arr.length), w = media ? 1 / (2 * r + 1) : 1;
  for (let j = 0; j < nz; j++) { let s = 0; const bb = j * nx; for (let i = 0; i <= Math.min(r, nx - 1); i++) s += arr[bb + i];
    for (let i = 0; i < nx; i++) { t[bb + i] = s * w; const ad = i + r + 1, su = i - r; if (ad < nx) s += arr[bb + ad]; if (su >= 0) s -= arr[bb + su]; } }
  for (let i = 0; i < nx; i++) { let s = 0; for (let j = 0; j <= Math.min(r, nz - 1); j++) s += t[j * nx + i];
    for (let j = 0; j < nz; j++) { o[j * nx + i] = s * w; const ad = j + r + 1, su = j - r; if (ad < nz) s += t[ad * nx + i]; if (su >= 0) s -= t[su * nx + i]; } }
  return o; };
const I = json('data3d/traf/index.json'), cnt = new Float32Array(nx * nz);
for (let k = 0; k < I.n; k++) {
  const bf = readFileSync(join(REPO, 'data3d/traf/c' + String(k).padStart(2, '0') + '.bin')), dv = new DataView(bf.buffer, bf.byteOffset, bf.byteLength);
  if (dv.getUint32(0, true) !== 0x31465452) throw new Error('formato');
  let o = 4; const ns = dv.getUint16(o, true); o += 2; o += 4; let prev = new Map();
  for (let s = 0; s < ns; s++) { const n = dv.getUint16(o, true); o += 2; const pid = o, pdx = o + 2 * n, pdy = o + 4 * n; o += 6 * n; const cur = new Map(); let id = 0;
    for (let i = 0; i < n; i++) { id += dv.getUint16(pid + 2 * i, true); const p = prev.get(id);
      const xi = p ? p[0] + dv.getInt16(pdx + 2 * i, true) : dv.getUint16(pdx + 2 * i, true), yi = p ? p[1] + dv.getInt16(pdy + 2 * i, true) : dv.getUint16(pdy + 2 * i, true);
      cur.set(id, [xi, yi]); const x = xi / I.scale - LC.x, z = LC.y - yi / I.scale, ci = Math.floor((x - x0) / CEL), cj = Math.floor((z - z0) / CEL);
      if (ci >= 0 && cj >= 0 && ci < nx && cj < nz) cnt[cj * nx + ci] += (((id * 2654435761) >>> 0) / 4294967296 >= 0.92) ? 4 : 1; }
    prev = cur; } }
const sm = caja(cnt, 1, true), por = [[], [], [], []]; for (const k of roads) { const v = sm[k]; if (v > 0) por[via[k]].push(v); }
const med = por.map(x => { if (!x.length) return 1; x.sort((p, q) => p - q); return x[x.length >> 1]; });
const cerca = [], lejos = []; let fCerca = 0, fLejos = 0;
for (const k of roads) { const cl = via[k], v = sm[k], dd = v > 0 ? Math.max(-8, Math.min(5, 10 * Math.log10(v / med[cl]))) : -8, L = LREF[cl] + dd;
  const i = k % nx, j = (k / nx) | 0, x = x0 + (i + 0.5) * CEL, z = z0 + (j + 0.5) * CEL, Lq = Math.round(L * 10);
  if (distMetro(x, z) <= METRO_RADIO) { cerca.push(Lq); fCerca += v; } else { lejos.push(Lq); fLejos += v; } }
cerca.sort((p, q) => p - q); lejos.sort((p, q) => p - q);
const todos = cerca.concat(lejos), media = todos.reduce((s, v) => s + v, 0) / todos.length / 10;
const sobre = (u) => todos.filter(v => v > u * 10).length / todos.length * 100;
console.log('celdas', todos.length, 'cerca metro', cerca.length, 'media dB', media.toFixed(2), '% >53', sobre(53).toFixed(1), '% >55', sobre(55).toFixed(1), '% >65', sobre(65).toFixed(1), '% >70', sobre(70).toFixed(1), 'flujo cerca', (fCerca / (fCerca + fLejos) * 100).toFixed(1) + '%');

const metroCerca = PARCHES.map((p, i) => distMetro(p.x, p.z) <= METRO_RADIO ? i : -1).filter(i => i >= 0);
const out = { generado: new Date().toISOString().slice(0, 10), fuente: 'tools/simulaciones_datos.mjs', red, PAR,
  metro: { radio: METRO_RADIO, cerca: metroCerca },
  ruido: { cel: CEL, LREF, nota: 'dB(A) ×10, nivel de hoy por celda de vía de 16 m (fórmula de data3d/capas_escenario.js)', cerca, lejos, flujoCerca: Math.round(fCerca), flujoLejos: Math.round(fLejos) } };
const txt = JSON.stringify(out); writeFileSync(join(REPO, 'data3d/simulaciones_datos.json'), txt);
console.log('simulaciones_datos.json', (txt.length / 1e6).toFixed(2), 'MB · metro cerca', metroCerca.length, 'parches');
