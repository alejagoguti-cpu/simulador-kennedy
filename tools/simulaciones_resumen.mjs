/* RESUMEN de las 12 simulaciones de data3d/simulaciones12.js: 520 semanas, semilla 1 (detalle) y semillas 1..30 (cuántas terminan en game over).
   USO: node tools/simulaciones_resumen.mjs   →   instalacion/datos/simulaciones12_resumen.json */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(pathToFileURL(join(REPO, 'data3d/simulaciones12.js')).href);
await S.cargarDatos((u) => JSON.parse(readFileSync(fileURLToPath(u), 'utf8')));
const N = S.SEMANAS, SEMS = 30;
const CLAVES = ['fauna', 'flora', 'red', 'redTipos', 'pares', 'aves', 'poliniz', 'polinizEsp', 'trafico', 'ruidoDb', 'callesRuidosas', 'callesOMS', 'atropellos', 'comidaMin', 'residuos', 'huertas', 'bodegas'];
const r3 = (v) => v == null ? null : Math.round(v * 1000) / 1000;
const out = { generado: new Date().toISOString().slice(0, 10), fuente: 'data3d/simulaciones12.js (tools/simulaciones_resumen.mjs)', semanas: N,
  reglas: S.REGLAS, supuestos: S.SUP_SIMS, simulaciones: [] };
let msTot = 0, pasos = 0;
for (const sim of S.SIMS) {
  const E = S.crear(sim.id, 1), st = Object.fromEntries(CLAVES.map(k => [k, { min: Infinity, max: -Infinity, final: null }])), ext = [];
  let x0 = null; const t0 = performance.now();
  for (let w = 0; w < N; w++) { S.paso(E); const x = S.ind(E); if (!x0) x0 = { fauna0: x.fauna0, flora0: x.flora0, red0: x.red0, redTipos0: x.redTipos0, poliniz0: x.poliniz0, pares0: x.pares0, ruidoDb0: x.ruidoDb0 };
    for (const k of CLAVES) { const v = x[k]; if (v < st[k].min) st[k].min = v; if (v > st[k].max) st[k].max = v; st[k].final = v; }
    if (x.extinciones.length) ext.push(...x.extinciones); }
  msTot += performance.now() - t0; pasos += N;
  for (const k of CLAVES) for (const q of ['min', 'max', 'final']) st[k][q] = r3(st[k][q]);
  const go1 = S.gameOver(E), g30 = [], por = {};
  for (let sd = 1; sd <= SEMS; sd++) { const g = sd === 1 ? go1 : (() => { const e = S.crear(sim.id, sd); for (let w = 0; w < N; w++) S.paso(e); return S.gameOver(e); })();
    if (g) { g30.push(g.sem); por[g.regla] = (por[g.regla] || 0) + 1; } }
  g30.sort((a, b) => a - b); const med = g30.length ? g30[(g30.length - 1) >> 1] : null;
  out.simulaciones.push({ id: sim.id, n: sim.n, base: sim.base, sliders: Object.fromEntries(sim.sliders.map(s => [s.k, s.val])),
    gameover: go1, semillas30: { gameover: g30.length, de: SEMS, mediana_sem: med, por_regla: por }, inicio: x0, indicadores: st, extinciones: ext });
  console.log(String(sim.id).padStart(2), sim.base, sim.corto.padEnd(20), go1 ? `GO sem ${go1.sem} ${go1.regla} (${go1.valor})` : 'sin game over', `| ${g30.length}/${SEMS}`, JSON.stringify(por),
    `| red ${x0.red0}->${st.red.final} poli ${x0.poliniz0}->${st.poliniz.final} (esp ${st.polinizEsp.final}) | fauna ${st.fauna.min}-${st.fauna.final}/${x0.fauna0} pares ${x0.pares0}->${st.pares.final} traf ${st.trafico.final} ruido ${x0.ruidoDb0.toFixed(2)}->${st.ruidoDb.final} calles65 ${st.callesRuidosas.final}% atrop ${st.atropellos.final} comidaMin ${st.comidaMin.min} res ${st.residuos.max} huertas ${st.huertas.final} bod ${st.bodegas.final} ext ${ext.length}`);
}
out.ms_por_paso_node = r3(msTot / pasos);
mkdirSync(join(REPO, 'instalacion', 'datos'), { recursive: true });
writeFileSync(join(REPO, 'instalacion', 'datos', 'simulaciones12_resumen.json'), JSON.stringify(out, null, 1));
console.log('ms por paso (node, semilla 1):', out.ms_por_paso_node);
