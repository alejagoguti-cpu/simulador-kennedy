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

/* ---------- METRO L1: eje (data3d/metro_l1.js, marco MODELO) ---------- */
const METRO_TXT = leer('data3d/metro_l1.js');
const METRO_PTS = JSON.parse(METRO_TXT.match(/const PTS = (\[\[.*?\]\]);/)[1]).map(([x, y]) => mundo(x, y));
const METRO_EST = [...METRO_TXT.matchAll(/\{ n: (\d), nombre: '([^']+)', ref: \['(car|frac)', ([\d.]+), (\d+)(?:, (\d+))?\]/g)].map(m => ({ n: +m[1], nombre: m[2], ref: m[3], a: +m[4], b: +m[5], c: m[6] ? +m[6] : null }));
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return { d: Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz), t }; };
const largoAcum = (P) => { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; };
const ML = largoAcum(METRO_PTS);
const sSobre = (p) => { let b = Infinity, bs = 0; for (let i = 1; i < METRO_PTS.length; i++) { const r = dSeg(p, METRO_PTS[i - 1], METRO_PTS[i]); if (r.d < b) { b = r.d; bs = ML[i - 1] + r.t * (ML[i] - ML[i - 1]); } } return bs; };
const enS = (s) => { let i = 1; while (i < ML.length - 1 && ML[i] < s) i++; const f = (s - ML[i - 1]) / Math.max(1e-9, ML[i] - ML[i - 1]); return [METRO_PTS[i - 1][0] + f * (METRO_PTS[i][0] - METRO_PTS[i - 1][0]), METRO_PTS[i - 1][1] + f * (METRO_PTS[i][1] - METRO_PTS[i - 1][1])]; };
METRO_EST.filter(e => e.ref === 'car').forEach(e => { e.s = sSobre(mundo(e.a, e.b)); });
METRO_EST.filter(e => e.ref === 'frac').forEach(e => { const A = METRO_EST.find(q => q.n === e.b).s, B = METRO_EST.find(q => q.n === e.c).s; e.s = A + (B - A) * e.a; }); // la 5 a media distancia entre 4 y 6 (como metro_l1.js) [SUP de metro_l1.js]
const distMetro = (x, z) => { let b = Infinity; for (let i = 1; i < METRO_PTS.length; i++) b = Math.min(b, dSeg([x, z], METRO_PTS[i - 1], METRO_PTS[i]).d); return b; };

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
   FAUNA: las 23 especies de data3d/biotica.js (ESP): las 19 de sim_vida.js con sus grupos, + rata y caracol (están en la red de humedalburro,
   data3d/biotica.json) + abeja y lombriz (ya estaban en el simulador; biotica.js les agrega relaciones a partir de las de la red).
   FLORA: los 71 nodos de flora de biotica.json, anclados a los árboles reales del censo SIGAU (data3d/trees.json, especie por árbol; cada nodo
   lista sus especies del censo en «sp»). Un nodo de flora está en un parche si hay al menos un árbol de esa especie a menos del radio del parche
   (círculo con el área del parche) de su centro. Bosque de Bavaria: los 3.250 árboles de data3d/bavaria_arboles.json con la mezcla de especies
   de biotica.js (eucalipto 50 %, urapán 25 %, ciprés 15 %, acacia negra 10 %, el mismo sorteo determinista por árbol). Plan parcial (D): cada
   árbol del predio sale en su etapa (data3d/plan_bavaria.json arboles_quitados = etapa de tala por árbol, 0 = se queda), con el mismo avance
   lineal dentro del año de sim_vida.js. Módulos de huertas activos (C, e11): llevan los parches de árboles nativos de data3d/parches_arboles.js
   (caucho sabanero, aliso, sauco, chicalá, arrayán, chilco, tíbar, raque, mortiño: los 9 coinciden con nodos de la red, «fl»).
   DEPENDENCIAS (recursos de cada especie en la red): flora con la que tiene herbivoría, dispersión de semillas, nidificación/refugio, visita
   floral/polinización o anidamiento de dosel; fauna que depreda o cuyo nido parasita; mutualismo en los dos sentidos. La competencia no es recurso.
   REGLA [SUP]: R = fracción de los recursos de la especie presentes en el parche o en un parche a su alcance (distancia ≤ D de su grupo).
   La colonización (incluida la llegada de fuera) se multiplica por R; si R = 0 la extinción local se multiplica por EXT_SIN_REC.
   Especies sin recursos en la red (focha, lombriz) no dependen de ella (R = 1). Así una extinción se propaga a quien depende de ella. */
const BIO = json('data3d/biotica.json'), TREES = json('data3d/trees.json'), BAVA = json('data3d/bavaria_arboles.json'), BIO_TXT = leer('data3d/biotica.js');
const PA_TXT = leer('data3d/parches_arboles.js');
const RED_SUP = {
  EXT_SIN_REC: 10, // [SUP] sin ningún recurso de la red al alcance, la extinción local es 10 veces la normal (no se sostiene)
  F_RATA: 1        // [SUP] rata: su hábitat se multiplica por 1 + F_RATA·min(1, pendientes/almacenamiento) (más residuos sin tratar, más ratas)
};
// [SUP] grupos de las 4 especies nuevas (afinidad por tipo de parche, alcance D en m, colonización c y extinción e por semana), coherentes con
// biotica.js: POR_PARQUE / POR_HUERTA / POR_BOSQUE (abeja 14 por huerta y 1,2 por parque; lombriz 6 por huerta; rata en parques, bosque, Corabastos y
// bordes con basura; caracol en parques y bosque, «casi inmóvil»)
const GRUPOS_N = {
  urbana: { hab: { parque: 0.7, humedal: 0.7, bosque: 0.6, mod: 0.3, cub: 0.2 }, D: 800, c: 0.04, e: 0.004 },  // rata: parques y bordes de humedal con basura
  molusco: { hab: { humedal: 1, parque: 0.8, bosque: 0.7, mod: 0.5, cub: 0.3 }, D: 150, c: 0.02, e: 0.004 },   // caracol: suelo húmedo, casi inmóvil
  poliniz: { hab: { mod: 1, cub: 1, parque: 0.8, bosque: 0.6, humedal: 0.4 }, D: 1500, c: 0.05, e: 0.004 },   // abeja: huertas y módulos (14 por huerta), parques con flor
  lombriz: { hab: { mod: 1, cub: 0.6, parque: 0.8, bosque: 0.8, humedal: 0.4 }, D: 300, c: 0.03, e: 0.003 }    // lombriz: suelo de huertas y compost (llega con la tierra), parques
};
const GR = { ...V.GRUPOS, ...GRUPOS_N };
const nombreBio = (k) => { const m = BIO_TXT.match(new RegExp('\\n  ' + k + ": \\{ n: '([^']+)'")); return m ? m[1] : k; };
const catBio = (k) => BIO.especies[k] ? BIO.especies[k].cat : (+((BIO_TXT.match(new RegExp('\\n  ' + k + ": \\{[^\\n]*cat: (\\d)")) || [])[1]) || null);
const FAUNA = [...V.ESPECIES.map(([id, n, g]) => ({ id, n, grupo: g })), { id: 'rata', grupo: 'urbana' }, { id: 'caracol', grupo: 'molusco' }, { id: 'abeja', grupo: 'poliniz' }, { id: 'lombriz', grupo: 'lombriz' }]
  .map(f => ({ ...f, n: f.n || nombreBio(f.id), cat: catBio(f.id) }));
const NFA = FAUNA.length, FI = Object.fromEntries(FAUNA.map((f, i) => [f.id, i]));
const FLORA = Object.entries(BIO.flora).map(([id, f]) => ({ id, n: f.n, sp: f.sp })), NFL = FLORA.length, FLI = Object.fromEntries(FLORA.map((f, i) => [f.id, i]));
// enlaces de la red: los 216 de biotica.json + los agregados en biotica.js (abeja visita las flores que visita el colibrí; 4 pares)
const ENL = BIO.enlaces.map(([a, b, t]) => [a, b, t]);
for (const [a, b, t] of BIO.enlaces) if (a === 'colibri' && b[0] === 'f' && t === 5) ENL.push(['abeja', b, 5]);
ENL.push(['abeja', 'colibri', 8], ['mirla', 'lombriz', 0], ['cucarachero', 'abeja', 0], ['tingua', 'lombriz', 0]);
const esFa = (k) => FI[k] != null, esFl = (k) => FLI[k] != null;
const REC_F = FAUNA.map(() => new Set()), REC_A = FAUNA.map(() => new Set());
for (const [a, b, t] of ENL) {
  if (esFa(a) && esFl(b) && [1, 2, 4, 5, 6].includes(t)) REC_F[FI[a]].add(FLI[b]);
  if (esFa(a) && esFa(b) && (t === 0 || t === 7)) REC_A[FI[a]].add(FI[b]);
  if (esFa(a) && esFa(b) && t === 3) { REC_A[FI[a]].add(FI[b]); REC_A[FI[b]].add(FI[a]); } }
const RF = REC_F.map(s => [...s]), RA = REC_A.map(s => [...s]), NREC = FAUNA.map((_, i) => RF[i].length + RA[i].length);
// parches: distancias, núcleos de dispersión (misma fórmula de sim_vida.js) y máscaras de alcance (71 parches → 3 palabras de 32 bits)
const NP = PARCHES.length, W3 = 3, { TIPO, SQA, IB, RESCATE } = V.INTERNO;
const DIST = new Float64Array(NP * NP); for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) DIST[p * NP + q] = Math.hypot(PARCHES[p].x - PARCHES[q].x, PARCHES[p].z - PARCHES[q].z);
const KERN = {}, ALC = {};
for (const g of Object.keys(GR)) { const D = GR[g].D, K = new Float32Array(NP * NP), A = new Uint32Array(NP * W3);
  for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) { if (p !== q) K[p * NP + q] = Math.exp(-DIST[p * NP + q] / D) * Math.sqrt(PARCHES[q].ha); if (DIST[p * NP + q] <= D) A[p * W3 + (q >> 5)] |= 1 << (q & 31); }
  KERN[g] = K; ALC[g] = A; }
const AVE = FAUNA.map(f => f.cat === 1), TER = FAUNA.map((f, i) => i < V.ESPECIES.length ? V.INTERNO.ES_TERR[i] : (f.id === 'rata' || f.id === 'caracol')); // [SUP] rata y caracol también pagan el costo de cruzar vías (atropellos)
const HABM = FAUNA.map(f => new Float32Array(NP).map((_, p) => GR[f.grupo].hab[TIPO[p]] || 0));
// flora por parche: árboles del censo a menos del radio del parche
const RPM = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI));
const SP2FL = new Map(); FLORA.forEach((f, i) => f.sp.forEach(s => { if (!SP2FL.has(s)) SP2FL.set(s, []); SP2FL.get(s).push(i); }));
const FLC0 = new Float32Array(NFL * NP); // árboles por (flora, parche) hoy
for (const t of TREES.t) { const fl = SP2FL.get(t[3]); if (!fl) continue; const [x, z] = mundo(t[0], t[1]);
  for (let p = 0; p < NP; p++) { const P = PARCHES[p], r = RPM[p]; if (Math.abs(P.x - x) > r || Math.abs(P.z - z) > r) continue; if (Math.hypot(P.x - x, P.z - z) <= r) for (const f of fl) FLC0[f * NP + p]++; } }
const IBQ = PARCHES.findIndex(p => p.id === 'bosqueBav'), PLANQ = json('data3d/plan_bavaria.json').arboles_quitados;
const BOSQ = []; { const spI = (re) => TREES.sp.findIndex(s => re.test(s)), MEZ = [[spI(/^Eucalipto común/i), 0.5], [spI(/^Urapán/i), 0.25], [spI(/^Ciprés, Pino ciprés/i), 0.15], [spI(/^Acacia negra/i), 0.1]].filter(m => m[0] >= 0);
  BAVA.arboles.forEach((t, i) => { let r = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1, s = MEZ[MEZ.length - 1][0]; for (const [k, p] of MEZ) { if (r < p) { s = k; break; } r -= p; } // mismo sorteo de biotica.js
    for (const f of SP2FL.get(s) || []) BOSQ.push([f, PLANQ[i] || 0]); }); }
const NATIVA = [...new Set([...PA_TXT.matchAll(/fl: \['(f\d+)'\]/g)].map(m => m[1]))], NAT_I = NATIVA.filter(esFl).map(f => FLI[f]), NAT_NUEVA = NATIVA.filter(f => !esFl(f));
const ES_MOD = PARCHES.map(p => p.t.startsWith('mod') && p.t !== 'modBavaria');
const anyAnd = (M, a, A, b) => (M[a] & A[b]) | (M[a + 1] & A[b + 1]) | (M[a + 2] & A[b + 2]);
function crearRed() {
  function floraEstado(s) { // máscara de presencia de cada flora (cambia solo con la tala del plan parcial y con los módulos activos)
    let firma = ''; for (let p = 0; p < NP; p++) if (ES_MOD[p] && s.q[p] > 0) firma += p + ',';
    const tala = s.e === 'D' ? s.t / V.AÑO : 0; firma += '|' + (s.e === 'D' ? Math.floor(Math.max(0, s.t) / V.AÑO * 52) : 0);
    if (s.red.firma === firma) return false; s.red.firma = firma;
    const C = Float32Array.from(FLC0); if (IBQ >= 0) for (const [f, e] of BOSQ) C[f * NP + IBQ] += e === 0 ? 1 : 1 - Math.max(0, Math.min(1, tala - (e - 1)));
    for (let p = 0; p < NP; p++) if (ES_MOD[p] && s.q[p] > 0) for (const f of NAT_I) C[f * NP + p] = Math.max(C[f * NP + p], 1);
    const M = s.red.flM.fill(0); for (let f = 0; f < NFL; f++) for (let p = 0; p < NP; p++) if (C[f * NP + p] >= 0.5) M[f * W3 + (p >> 5)] |= 1 << (p & 31);
    const FA = s.red.flA; for (let i = 0; i < NFA; i++) { const A = ALC[FAUNA[i].grupo]; for (let p = 0; p < NP; p++) { let n = 0; for (const f of RF[i]) if (anyAnd(M, f * W3, A, p * W3)) n++; FA[i * NP + p] = n; } }
    return true; }
  const contar = (s) => { const O = s.red.ocM.fill(0), occ = s.occ; let pares = 0;
    for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) if (occ[i * NP + p]) { O[i * W3 + (p >> 5)] |= 1 << (p & 31); pares++; }
    const M = s.red.flM, mk = (k) => esFa(k) ? [O, FI[k] * W3] : [M, FLI[k] * W3]; let red = 0;
    for (const [a, b] of ENL) { if (!(esFa(a) || esFl(a)) || !(esFa(b) || esFl(b))) continue; const [X, xa] = mk(a), [Y, yb] = mk(b); if ((X[xa] & Y[yb]) | (X[xa + 1] & Y[yb + 1]) | (X[xa + 2] & Y[yb + 2])) red++; }
    let flora = 0; for (let f = 0; f < NFL; f++) if (M[f * W3] | M[f * W3 + 1] | M[f * W3 + 2]) flora++;
    let esp = 0; for (let i = 0; i < NFA; i++) if (O[i * W3] | O[i * W3 + 1] | O[i * W3 + 2]) esp++;
    return { pares, red, flora, esp }; };
  return {
    iniciar(s) {
      s.red = { diag: { n: 0, sR: 0, r0: 0 }, firma: null, flM: new Uint32Array(NFL * W3), flA: new Uint16Array(NFA * NP), ocM: new Uint32Array(NFA * W3), R: new Float32Array(NFA * NP) };
      s.occ = new Uint8Array(NFA * NP); floraEstado(s);
      for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) s.occ[i * NP + p] = HABM[i][p] * s.q[p] >= 0.45 ? 1 : 0; // misma regla inicial de sim_vida.js
      const c = contar(s); s.esp0 = c.esp; s.red.inicio = c; s.red.c = c;
    },
    paso(s, { t, q, MQ, XQ, raizB, trampa, pend, alm }) {
      const cambio = floraEstado(s), H_ = s.hab, occ = s.occ, O = s.red.ocM, FA = s.red.flA;
      O.fill(0); for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) if (occ[i * NP + p]) O[i * W3 + (p >> 5)] |= 1 << (p & 31);
      const fR = 1 + RED_SUP.F_RATA * Math.min(1, pend / Math.max(1, alm)); let ocAve = 0, ocTer = 0;
      for (let i = 0; i < NFA; i++) { const F = FAUNA[i], g = F.grupo, G = GR[g], K = KERN[g], A = ALC[g], base = i * NP, nuevo = new Uint8Array(NP), ave = AVE[i], ter = TER[i], hm = HABM[i], rata = F.id === 'rata';
        const hab = (p) => hm[p] * q[p] * (ave ? MQ[p] : 1) * (rata ? fR : 1);
        for (let pp = 0; pp < NP; pp++) { const u = H_(), h = hab(pp); if (h <= 0) { nuevo[pp] = 0; continue; }
          let R = 1; if (NREC[i]) { let n = FA[base + pp]; for (const j of RA[i]) if (anyAnd(O, j * W3, A, pp * W3)) n++; R = n / NREC[i]; }
          const DG = s.red.diag; DG.n++; DG.sR += R; if (R === 0) DG.r0++;
          if (occ[base + pp]) { let ext = Math.min(1, G.e / (h * (pp === IB ? raizB : SQA[pp])) * (g === 'arbol' && TIPO[pp] !== 'parque' && TIPO[pp] !== 'humedal' && TIPO[pp] !== 'bosque' ? trampa : 1));
            if (R === 0) ext = Math.min(1, ext * RED_SUP.EXT_SIN_REC); nuevo[pp] = u < ext ? 0 : 1; }
          else { let S = 0; for (let qq = 0; qq < NP; qq++) if (occ[base + qq]) S += K[pp * NP + qq] * hab(qq) * (ter ? XQ[pp * NP + qq] : 1) * (qq === IB ? raizB : 1);
            const col = (1 - Math.exp(-G.c * h * S) + RESCATE * h) * R; nuevo[pp] = u < col ? 1 : 0; }
          if (nuevo[pp]) { if (ave) ocAve++; else ocTer++; } }
        occ.set(nuevo, base); }
      const c = contar(s); s.red.c = c; s.red.cambio = cambio; return { esp: c.esp, ocAve, ocTer };
    } };
}

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
const RED = crearRed();
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
