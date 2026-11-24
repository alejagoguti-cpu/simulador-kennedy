/* ============ ESCENARIOS DE LA INSTALACIÓN (11 «proyectos de infraestructura») con el modelo semanal data3d/sim_vida.js ============
   USO: node tools/escenarios_instalacion.mjs   →   instalacion/datos/escenarios12.json (para la proyección en TouchDesigner)
   Corre cada escenario 520 semanas (10 años) con la semilla 1 (la corrida que se muestra) y con las semillas 1..30 (cuántas terminan en game over).
   Reusa el modelo tal cual: los escenarios nuevos son A, B o D de sim_vida.js con modificadores (crear(e, semilla, mod); sin mod la web no cambia).
   Semanas: t = semana del modelo, 0 = la primera (hoy, nov-2026); el game over se reporta como lo reporta el modelo (s.colapso.semana = t + 1).
   Parámetros: los mismos por defecto de la web (data3d/sim_modelos.js → PAR, y P1.cierres = true como en data3d/escenarios_sim.js).
   Todo supuesto nuevo va marcado [SUP] con su porqué. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(join(REPO, f)).href + '?v=7');
const V = await imp('data3d/sim_vida.js');
const { PARCHES, MERCADOS, BODEGAS, CIERRES } = await import(pathToFileURL(join(REPO, 'data3d/sim_red_datos.js')).href + '?v=2');
const leer = (f) => readFileSync(join(REPO, f), 'utf8'), json = (f) => JSON.parse(leer(f));

/* ---------- parámetros por defecto de la web ---------- */
const PAR = (() => { const t = leer('data3d/sim_modelos.js'), i0 = t.indexOf('export const PAR = {'), i1 = t.indexOf('\n};', i0);
  return Function('return ' + t.slice(i0 + 'export const PAR = '.length, i1 + 2))(); })();
/* [SUP] cierres de vía AL AZAR APAGADOS (el mismo interruptor P1.cierres de escenarios_sim.js / vida_evaluar.js: se sortean igual pero no tienen efecto),
   para que los proyectos se distingan: con ellos encendidos un cierre al azar hace colapsar los 11 en la misma semana. El cierre FORZADO de e8 y e9
   sí tiene efecto (sim_vida.js lo crea con on: true). El resto del azar (adopción, promotores, especies) sigue igual. */
const CIERRES_AL_AZAR = false;
PAR.P1.cierres = CIERRES_AL_AZAR;

/* ---------- marcos de coordenadas ---------- */
const LC = [5341.33, 3161.9], mundo = (x, y) => [x - LC[0], LC[1] - y]; // MODELO → MUNDO (x este, z sur), igual que lw() de index.html
const CFG = json('instalacion/config.json').rectangulo, [CX, CZ] = CFG.centro_m, AW = CFG.ancho_m, AH = CFG.alto_m; // encuadre de la maqueta (config.json)
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const uv = (x, z) => [r4((x - (CX - AW / 2)) / AW), r4((z - (CZ - AH / 2)) / AH)];
const dentro = ([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1;
{ const b = PARCHES.find(p => p.id === 'burro'), q = uv(b.x, b.z); if (!dentro(q)) throw new Error('Humedal El Burro fuera del encuadre: ' + q); }

/* ---------- METRO L1: eje (data3d/metro_l1.js, marco MODELO → MUNDO), en tools/metro_eje.mjs (compartido con tools/simulaciones_datos.mjs) ---------- */
const { METRO_PTS, METRO_EST, enS, distMetro } = await import(pathToFileURL(join(REPO, 'tools/metro_eje.mjs')).href);

/* ---------- supuestos nuevos de la instalación ---------- */
export const INST = {
  SIN_CORA: 52,      // [SUP] e5: Corabastos deja de abastecer en la semana 52 (empieza el año 2). Escenario hipotético: no hay plan oficial vigente de cierre.
  DESM_LIB: 1,       // [SUP] e6: la carga liberada de Corabastos tiende a 1 en DESMONTE.EMA semanas (como si la dependencia cayera a 0); el resto del calendario
                     //       (aprobación cada DESMONTE.CADA, obra DESMONTE.OBRA, maduración DESMONTE.MADURA) es el de B y C sin cambios
  METRO_REDUCCION_V: 0, // [SUP] PENDIENTE_FUENTE e7: fracción en que baja el índice de vehículos V en los parches cercanos al metro. No hay cifra oficial de cuánto
                     //       reduce el tráfico de carros y motos (solo 171.000 t CO2/año evitadas en toda la ciudad, mezclando carro, moto, SITP y TM): 0 % hasta tenerla.
  METRO_SEM_OP: 70,  // [SUP] PENDIENTE_FUENTE e7: la Empresa Metro dice que opera desde 2028 (metrodebogota.gov.co, notificación PQRSD E26-01183, 2026-05);
                     //       semana 0 = nov-2026 → 2028 ≈ semana 70. (data3d/metro_l1.js usa la semana 114 con otro origen: año 1 = 2026.)
  METRO_RADIO: 800,  // [SUP] PENDIENTE_FUENTE e7: parches a 800 m o menos del eje del metro cuentan como «cercanos al corredor» (distancia típica de caminata a una estación)
  CIERRE_VIA: 'americas', CIERRE_T0: 104, CIERRE_DUR: 26 // [SUP] e8, e9: cierre forzado de la Av. de las Américas de 26 semanas (medio año de obra: más largo que los 1–6 de CIERRE)
};
const metroF = (() => { const f = new Float32Array(PARCHES.length).fill(1), cerca = [];
  PARCHES.forEach((p, i) => { if (distMetro(p.x, p.z) <= INST.METRO_RADIO) { f[i] = 1 - INST.METRO_REDUCCION_V; cerca.push(p.id); } });
  return { k: 'metro' + INST.METRO_REDUCCION_V + '_' + INST.METRO_RADIO, f, desde: INST.METRO_SEM_OP, cerca }; })();

/* ---------- geometrías para dibujar sobre la maqueta ---------- */
const poligono = (n, P) => ({ tipo: 'poligono', n, uv: P.map(([x, z]) => uv(x, z)) });
const linea = (n, P) => ({ tipo: 'linea', n, uv: P.map(([x, z]) => uv(x, z)) });
const punto = (n, x, z, extra) => ({ tipo: 'punto', n, uv: [uv(x, z)], ...(extra || {}) });
const BAV = json('data3d/bavaria.json'), PLAN = json('data3d/plan_bavaria.json'), CORA = json('data3d/corabastos.json');
const D_BAV = poligono('Predio de Bavaria (Bavaria Común)', BAV.sitio.map(([x, y]) => mundo(x, y)));
const MZ = new Map(PLAN.manzanas.map(m => [m.id, m]));
const D_PLAN = PLAN.zonas.filter(z => MZ.has(z.id)).flatMap(z => z.p.map(pp => ({ ...poligono(`Plan parcial · ${z.id} (${z.tipo})`, pp.o.map(([x, y]) => mundo(x, y))), etapa: MZ.get(z.id).etapa, anio: z.anio })));
const rect = (n) => { const c = Math.cos(n.a), s = Math.sin(n.a), L = n.L / 2, W = n.W / 2; return [[L, W], [-L, W], [-L, -W], [L, -W]].map(([u, v]) => mundo(n.c[0] + u * c - v * s, n.c[1] + u * s + v * c)); };
const D_CORA = poligono('Central de abastos Corabastos', CORA.poly.map(([x, y]) => mundo(x, y)));
const D_BOD = BODEGAS.map((b, k) => ({ ...poligono(`Bodega de Corabastos junto a La Vaca (fase ${k + 1})`, rect(CORA.naves[b.i])), fase: k + 1 }));
const D_METRO = [linea('Metro de Bogotá · Línea 1', METRO_PTS), ...METRO_EST.map(e => { const [x, z] = enS(e.s); return punto('Estación ' + e.nombre, x, z); })];
const D_VIA = (() => { // eje de la Av. de las Américas en OpenStreetMap (tools/cache/kennedy_osm.json, el mismo filtro de tools/sim_red_datos_build.mjs)
  const geo = (lat, lng) => mundo((lng + 74.17) * 111320 * Math.cos(4.63 * Math.PI / 180) + 5193.24, (lat - 4.63) * 110540 + 2090.06);
  try { const O = json('tools/cache/kennedy_osm.json').elements.filter(e => e.type === 'way' && e.tags && e.tags.highway && e.geometry);
    const vs = O.filter(w => /Am[eé]ricas/i.test([w.tags.name, w.tags.alt_name, w.tags.local_name, w.tags.official_name, w.tags.old_name].filter(Boolean).join(' / ')) && !/link/.test(w.tags.highway) && /trunk|primary|secondary/.test(w.tags.highway));
    return vs.map(w => linea('Av. de las Américas (cerrada)', w.geometry.map(g => geo(g.lat, g.lon)))).filter(l => l.uv.some(dentro)); }
  catch { return [punto('Av. de las Américas (cerrada) · sin geometría en caché', 0, 0)]; } })();
const D_MERC = (f) => MERCADOS.filter(f).map(m => punto(`${m.tipo === 'plazoleta' ? 'Plazoleta de mercado' : 'Mercado de barrio'} · ${m.n}`, m.x, m.z, { desde: m.desde }));
const D_MOD = PARCHES.filter(p => p.t.startsWith('mod') && p.t !== 'modBavaria').map(p => punto(p.n, p.x, p.z, { cuota: p.cuota }));

/* ================= RED TRÓFICA DE LA INSTALACIÓN (reemplaza el paso de hábitat de sim_vida.js SOLO en estos escenarios) =================
   La lógica vive en data3d/red_trofica.js (compartida con data3d/simulaciones12.js): 23 especies de fauna de data3d/biotica.js, 71 nodos de
   flora de data3d/biotica.json anclados al censo SIGAU (data3d/trees.json), enlaces de la red como dependencias. Aquí solo se leen los archivos. */
const RT = await import(pathToFileURL(join(REPO, 'data3d/red_trofica.js')).href);
const BIO = json('data3d/biotica.json');
const DRED = RT.datosRed({ BIO, BIO_TXT: leer('data3d/biotica.js'), TREES: json('data3d/trees.json'), BAVA: json('data3d/bavaria_arboles.json'),
  PLANQ: json('data3d/plan_bavaria.json').arboles_quitados, PA_TXT: leer('data3d/parches_arboles.js'), PARCHES, mundo });
const RED_SUP = RT.RED_SUP;
const RED = RT.crearRed(DRED, V, PARCHES);
const { FAUNA, FLORA, NFA, NFL, NP, W3, RF, RA, FI, FLI, esFa, esFl, ENL, NAT_I, NAT_NUEVA } = RED;

/* ---------- los 11 escenarios ---------- */
const VIA_N = CIERRES.find(c => c.id === INST.CIERRE_VIA).n, CIERRE_MOD = { via: INST.CIERRE_VIA, t0: INST.CIERRE_T0, dur: INST.CIERRE_DUR };
const SUP_CIERRE = `[SUP] cierre forzado de la ${VIA_N} desde la semana ${INST.CIERRE_T0} durante ${INST.CIERRE_DUR} semanas (medio año de obra, más largo que los 1–6 de un cierre al azar), además de los cierres al azar; si coincide con uno al azar, lo reemplaza.`;
const ESC = [
  { k: 'e1', n: 'Hoy, sin proyecto', base: 'A', desc: V.ESCENARIOS.A.txt, supuestos: [], dibujo: [] },
  { k: 'e2', n: 'Instituto en Bavaria', base: 'B', desc: 'Bavaria Común: acopio, compost, formación y decisiones en Bavaria. ' + V.ESCENARIOS.B.txt, supuestos: [], dibujo: [D_BAV] },
  { k: 'e3', n: 'Red de mercados de barrio', base: 'C', desc: V.ESCENARIOS.C.txt, supuestos: [], dibujo: [D_BAV, ...D_MERC(() => true), ...D_MOD] },
  { k: 'e4', n: 'Plan parcial Bavaria', base: 'D', desc: V.ESCENARIOS.D.txt, supuestos: [], dibujo: [D_BAV, ...D_PLAN] },
  { k: 'e5', n: 'Corabastos cierra', base: 'A', mod: { sinCora: INST.SIN_CORA },
    desc: 'Hoy, pero Corabastos deja de abastecer desde la semana 52 y no hay red alternativa (más del 94 % de los alimentos que se venden en Bogotá entra por Corabastos, SIPSA 2025).',
    supuestos: [`[SUP] desde la semana ${INST.SIN_CORA} la capacidad de Corabastos (Kc) es 0, sin reemplazo: solo queda lo que producen las huertas de la zona. Escenario hipotético (no hay plan oficial vigente de cierre). Fuente del peso de Corabastos: «más del 94 % de los alimentos comercializados en Bogotá ingresa por Corabastos» (SIPSA 2025, bogota.gov.co).`],
    dibujo: [D_CORA] },
  { k: 'e6', n: 'Corabastos se reduce y se restaura el borde de La Vaca', base: 'A', mod: { desmonte: { lib: INST.DESM_LIB } },
    desc: 'Hoy, pero las bodegas de Corabastos junto al humedal La Vaca se desmontan con el calendario de B y C y el borde se restaura.',
    supuestos: [`[SUP] la carga liberada de Corabastos tiende a ${INST.DESM_LIB} en ${V.DESMONTE.EMA} semanas (como si la dependencia de Corabastos bajara), con el mismo mecanismo y calendario de B y C (una fase cada ${V.DESMONTE.CADA} semanas, ${V.DESMONTE.OBRA} de obra, ${V.DESMONTE.MADURA} de maduración).`,
      '[SUP] el abastecimiento de Corabastos no cambia: en el modelo el desmonte solo usa espacio liberado (las 8 bodegas suman 19 % de la huella de la central).'],
    dibujo: [D_CORA, ...D_BOD] },
  { k: 'e7', n: 'Metro Línea 1', base: 'A', mod: { metro: metroF },
    desc: 'Hoy + la Línea 1 del metro en operación; menos vehículos en los parches cercanos al corredor.',
    supuestos: [`[SUP] PENDIENTE_FUENTE: el índice de vehículos V baja ${INST.METRO_REDUCCION_V * 100} % en los parches a ${INST.METRO_RADIO} m o menos del eje (${metroF.cerca.length} parches) desde la semana ${INST.METRO_SEM_OP} (operación en 2028 según la Empresa Metro). No hay cifra oficial de cuánto reduce el tráfico de carros y motos: el metro aparece dibujado pero su efecto sobre el tráfico es 0 hasta tener la cifra (constante INST.METRO_REDUCCION_V en tools/escenarios_instalacion.mjs).`],
    dibujo: D_METRO },
  { k: 'e8', n: 'Se cierra una vía, hoy', base: 'A', mod: { cierre: CIERRE_MOD }, desc: `Hoy, con la ${VIA_N} cerrada medio año desde la semana ${INST.CIERRE_T0}.`, supuestos: [SUP_CIERRE], dibujo: D_VIA },
  { k: 'e9', n: 'Se cierra una vía, con instituto', base: 'B', mod: { cierre: CIERRE_MOD }, desc: `Instituto en Bavaria, con la ${VIA_N} cerrada medio año desde la semana ${INST.CIERRE_T0}.`, supuestos: [SUP_CIERRE], dibujo: [D_BAV, ...D_VIA] },
  { k: 'e10', n: 'Instituto + plazas de mercado en parques', base: 'B', mod: { plazasNodo: true },
    desc: 'Instituto en Bavaria y, además, las plazoletas de mercado en parques grandes funcionan como nodos de abastecimiento (como en la red C).',
    supuestos: ['[SUP] las 9 plazoletas de data3d/mercados_red.js abren con su calendario y su capacidad, que se SUMA a la de Bavaria (B ya tiene la capacidad de toda la red); Bavaria cubre lo que falta hasta el mismo tope del 60 % de lo que se compra.',
      '[SUP] las plazoletas solo abastecen: el compost y las decisiones siguen concentrados en Bavaria (como en B).'],
    dibujo: [D_BAV, ...D_MERC(m => m.tipo === 'plazoleta')] },
  { k: 'e11', n: 'Instituto + huertas', base: 'B', mod: { huertasC: true },
    desc: 'Instituto en Bavaria con más producción local: los módulos de huertas de C (cubiertas, colegios, parques) también se incorporan con su calendario.',
    supuestos: ['[SUP] los módulos de C (cubiertas, colegios y parques) se vuelven hábitat en B con el mismo calendario (cuota de cada módulo frente a la superficie montada).',
      '[SUP] la superficie de producción de B pasa del 60 % (solo Bavaria) a la completa de C, y las huertas de parque junto al humedal pesan sobre él como en C.'],
    dibujo: [D_BAV, ...D_MOD] }
];

/* ---------- correr ---------- */
const N = 520, SEMS = 30;
function correr(E, seed, detalle) {
  const s = V.crear(E.base, seed, { ...(E.mod || {}), red: RED }), NS = NFA;
  const esp = [], zmin = [], res = [], flora = [], pares = [], red = [], abierto = new Int32Array(NS * NP).fill(-1), occ = {};
  const flAb = new Int32Array(NFL * NP).fill(-1), flp = {};
  const flOn = (f, p) => (s.red.flM[f * W3 + (p >> 5)] >>> (p & 31)) & 1;
  const verFlora = (t) => { for (let f = 0; f < NFL; f++) for (let p = 0; p < NP; p++) { const k = f * NP + p, on = flOn(f, p);
    if (on && flAb[k] < 0) flAb[k] = t; else if (!on && flAb[k] >= 0) { ((flp[PARCHES[p].id] ||= [])).push([FLORA[f].id, flAb[k], t - 1]); flAb[k] = -1; } } };
  for (let t = 0; t < N; t++) { const o = V.paso(s, PAR);
    if (!detalle) continue;
    const c = s.red.c; esp.push(o.esp); zmin.push(Math.round(o.zMin * 1000) / 1000); res.push(Math.round(o.pend / o.alm * 1000) / 1000); flora.push(c.flora); pares.push(c.pares); red.push(c.red);
    if (t === 0 || s.red.cambio) verFlora(t);
    for (let i = 0; i < NS * NP; i++) { const on = s.occ[i];
      if (on && abierto[i] < 0) abierto[i] = t;
      else if (!on && abierto[i] >= 0) { guardar(i, abierto[i], t - 1); abierto[i] = -1; } } }
  function guardar(i, a, b) { const e = FAUNA[(i / NP) | 0].id, p = PARCHES[i % NP].id; ((occ[e] ||= {})[p] ||= []).push([a, b]); }
  if (detalle) { for (let i = 0; i < NS * NP; i++) if (abierto[i] >= 0) guardar(i, abierto[i], N - 1);
    for (let k = 0; k < NFL * NP; k++) if (flAb[k] >= 0) ((flp[PARCHES[k % NP].id] ||= [])).push([FLORA[(k / NP) | 0].id, flAb[k], N - 1]); }
  return { s, esp, zmin, res, flora, pares, red, occ, flp };
}
const out = { fuente: 'Modelo semanal data3d/sim_vida.js (abastecimiento por zona; residuos orgánicos; hábitat = metapoblación de Levins) con la RED TRÓFICA de la instalación (23 especies de fauna de data3d/biotica.js × 71 parches, 71 nodos de flora de data3d/biotica.json anclados al censo de árboles SIGAU, enlaces de la red como dependencias) y los modificadores de tools/escenarios_instalacion.mjs; parámetros por defecto de la web (data3d/sim_modelos.js), cierres de vía al azar apagados (solo el cierre forzado de e8 y e9). Semana t = 0 es hoy (nov-2026). Semilla 1 = la corrida que se muestra; semillas 1..30 = cuántas terminan en game over. Coordenadas uv en el encuadre de instalacion/config.json (rectangulo).',
  generado: new Date().toISOString().slice(0, 10), semanas: N, encuadre: { centro_m: CFG.centro_m, ancho_m: AW, alto_m: AH },
  reglas: V.REGLAS.map(R => ({ k: R.k, n: R.n, txt: R.txt })),
  especies: FAUNA.map(f => ({ id: f.id, n: f.n, grupo: f.grupo, cat: f.cat, recursos_flora: RF[FI[f.id]].map(i => FLORA[i].id), recursos_fauna: RA[FI[f.id]].map(i => FAUNA[i].id) })),
  flora: FLORA.map(f => ({ id: f.id, n: f.n, ...(NAT_I.includes(FLI[f.id]) ? { nativa_parches: true } : {}) })), flora_nueva: NAT_NUEVA,
  categorias: ['Flora y arbolado', 'Aves', 'Mamíferos', 'Moluscos', 'Anfibios', 'Reptiles', 'Insectos', 'Lombrices (suelo)'],
  red: { enlaces: ENL.filter(([a, b]) => (esFa(a) || esFl(a)) && (esFa(b) || esFl(b))).map(([a, b, t]) => [a, b, t]), tipos: BIO.tipos.map(t => t.n), sup: RED_SUP },
  parches: PARCHES.map(p => { const q = uv(p.x, p.z); return { id: p.id, n: p.n, t: p.t, x: p.x, z: p.z, ha: p.ha, u: q[0], v: q[1], dentro: dentro(q) }; }),
  cierres_al_azar: CIERRES_AL_AZAR,
  supuestos_generales: [`cierres_al_azar = ${CIERRES_AL_AZAR} [SUP] cierres de vía al azar apagados (P1.cierres = false) en los 11 escenarios; solo e8 y e9 tienen el cierre forzado`, ...Object.entries(INST).map(([k, v]) => `${k} = ${v}`)], escenarios: [] };
for (const E of ESC) {
  const r = correr(E, 1, true), c = r.s.colapso;
  const g30 = []; for (let sd = 1; sd <= SEMS; sd++) { const x = sd === 1 ? r.s : correr(E, sd, false).s; if (x.colapso) g30.push(x.colapso); }
  const semsGO = g30.map(c => c.semana).sort((a, b) => a - b), por = {}; g30.forEach(c => c.causas.forEach(k => { por[k] = (por[k] || 0) + 1; }));
  const med = semsGO.length ? (semsGO.length % 2 ? semsGO[(semsGO.length - 1) / 2] : (semsGO[semsGO.length / 2 - 1] + semsGO[semsGO.length / 2]) / 2) : null;
  out.escenarios.push({ k: E.k, n: E.n, base: E.base, desc: E.desc, supuestos: E.supuestos,
    gameover: c ? { sem: c.semana, regla: c.causas[0], reglas: c.causas, motivo: c.motivo } : null,
    semillas30: { gameover: g30.length, de: SEMS, mediana_sem: med, por_regla: por },
    serie: { esp: r.esp, esp0: r.s.esp0, zmin: r.zmin, res: r.res, flora: r.flora, flora0: r.s.red.inicio.flora, pares: r.pares, pares0: r.s.red.inicio.pares, red: r.red, red0: r.s.red.inicio.red },
    flora_por_parche: r.flp,
    cierres: r.s.log.filter(x => x.k === 'cierre').map(x => ({ t: x.t, via: x.extra.via, dur: x.extra.dur, forzado: !!x.extra.forzado })),
    corabastos: { desmontadas: r.s.cora.ap.length, aprobadas_sem: r.s.cora.ap.slice(), borde_m2: Math.round(r.s.cora.ha * 1e4) },
    ocupacion: r.occ, dibujo: E.dibujo });
  console.log(E.k.padEnd(4), E.base, c ? `GO sem ${c.semana} ${c.causas.join('+')}` : 'sin game over', `| ${g30.length}/${SEMS} med ${med}`, JSON.stringify(por),
    `| esp0 ${r.s.esp0} espMin ${Math.min(...r.esp)} flMin ${Math.min(...r.flora)}/${r.s.red.inicio.flora} red ${r.s.red.inicio.red}->${r.red[N - 1]} (min ${Math.min(...r.red)}) pares ${r.s.red.inicio.pares}->${r.pares[N - 1]} Rmedio ${(r.s.red.diag.sR / r.s.red.diag.n).toFixed(3)} R0 ${(r.s.red.diag.r0 / r.s.red.diag.n * 100).toFixed(1)}% zMin ${Math.min(...r.zmin)} resMax ${Math.max(...r.res)} sem<0.8 ${r.zmin.filter(v => v < 0.8).length} bod ${r.s.cora.ap.length}`);
}
mkdirSync(join(REPO, 'instalacion', 'datos'), { recursive: true });
const txt = JSON.stringify(out); writeFileSync(join(REPO, 'instalacion', 'datos', 'escenarios12.json'), txt);
console.log('escenarios12.json', (txt.length / 1e6).toFixed(2), 'MB · parches dentro', out.parches.filter(p => p.dentro).length, '/', out.parches.length, '· metro cerca', metroF.cerca.join(','));
