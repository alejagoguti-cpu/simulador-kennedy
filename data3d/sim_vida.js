/* ============ SIMULACIÓN SIN FIN · escenarios A, B y C con tres reglas de game over ============
   Regla de paso: el estado de la semana siguiente sale SOLO del estado de esta semana, de los parámetros (PAR) y del azar con semilla.
   Sin año final; la historia se guarda submuestreada (memoria acotada). No toca el DOM: lo usan el panel del mapa (escenarios_sim.js),
   el trabajador del modo «Evaluar» (sim_vida_worker.js) y se puede correr en node.

   ESCENARIOS (documento de tesis). Los tres parten de las MISMAS condiciones (semana 0 igual en todo) y se evalúan el mismo periodo.
   · A · continuidad: Corabastos abastece todo; los orgánicos van al relleno Doña Juana; ~300 huerteros sin apoyo (120 activos).
   · B · coordinación concentrada en Bavaria Común: un solo nodo de acopio y reparto, una sola planta de compost y la producción en Bavaria;
         los mercados de barrio no son nodos (puntos de venta que dependen de Bavaria); una sola cola de decisiones.
   · C · red: los mercados de barrio y plazoletas (data3d/mercados_red.js) son nodos de abastecimiento con su bodega y su estación de compost;
         módulos de producción que se incorporan poco a poco en cubiertas compartidas, colegios y parques; Bavaria es clúster de conocimiento
         (forma promotores, no concentra la logística); asambleas locales con vocería rotativa que llevan a la federación lo que no resuelven.
   · B y C tienen la MISMA capacidad total (acopio, compost, almacenamiento) y el mismo calendario de montaje: cambia solo cómo se organiza.

   AZAR: un solo evento al azar, «Cierre de una vía principal» (CIERRE), con su propio generador: A, B y C viven los mismos cierres
   (mismo número de sorteos por semana en los tres). Lo demás es azar demográfico (adopción, promotores, colonización y extinción de
   especies), con generadores propios; el de las especies es igual para A, B y C (mismo número de sorteos).
   REGLAS DE GAME OVER (REGLAS): tres, una por subsistema, fijas antes de correr e iguales para A, B y C; cada una cierra la simulación si se
   cumple 4 semanas seguidas; se registra el motivo y la semana. Todo supuesto que no viene del documento ni de los datos está marcado [SUP].
   Datos fijos (red vial, zonas, mercados, parches): data3d/sim_red_datos.js (tools/sim_red_datos_build.mjs). */
import { ZONAS, FUENTES, COSTO, LARGO, CIERRES, MERCADOS as MERC_D, PARCHES, BODEGAS, AREA_NAVES } from './sim_red_datos.js?v=2';
import { EXPO } from './exposicion_trafico.js?v=1'; // tráfico cerca de cada parche y entre parches (tools/exposicion_trafico_build.mjs)
export const AÑO = 52, POB_K = 1034000;
export const ARRANQUE = 0; // las reglas cuentan desde la semana 1: los tres escenarios se evalúan el mismo periodo, montaje incluido
export const MERCADOS = MERC_D;

/* ---------- generador con semilla ---------- */
export function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mezcla = (s, k) => (Math.imul(s >>> 0, 2654435761) ^ Math.imul(k + 1, 40503) ^ 0x9E3779B9) >>> 0;
const normal = (r) => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const ruido = (r, sd) => Math.max(0, 1 + sd * normal(r));
const poisson = (r, m) => { if (m <= 0) return 0; if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * normal(r))); let L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
const binom = (r, n, p) => { n = Math.round(n); if (n <= 0 || p <= 0) return 0; if (n < 60) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; } const m = n * p; return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(m * (1 - p)) * normal(r)))); };
const haz = (pAño) => 1 - Math.pow(1 - pAño, 1 / AÑO);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

export const ESCENARIOS = {
  A: { n: 'Hoy · continuidad', corto: 'Hoy', txt: 'Todo llega por Corabastos y los orgánicos van al relleno. Es el punto de comparación.' },
  B: { n: 'Bavaria central', corto: 'Bavaria', txt: 'Bavaria Común concentra acopio, reparto, compost, producción y decisiones.' },
  C: { n: 'Red de mercados', corto: 'Red', txt: 'Mercados de barrio como nodos, módulos en cubiertas, colegios y parques; Bavaria forma; asambleas con vocería rotativa.' }
};

/* ---------- EL ÚNICO EVENTO AL AZAR: cierre de una vía principal ---------- */
export const CIERRE = { pAño: 0.3, dur: [1, 6] }; // [SUP] un cierre total de una vía principal cada ~3 años, de 1 a 6 semanas (obras, hundimientos, bloqueos)
export const VIAS = CIERRES.map(c => ({ id: c.id, n: c.n }));     // Américas, Boyacá, Ciudad de Cali, Primero de Mayo, Agoberto Mejía (la Autopista Sur no está en la red del modelo)
export const EVENTOS = [{ k: 'cierre', n: 'Cierre de una vía principal', pAño: CIERRE.pAño, dur: CIERRE.dur, ef: `se sortea cuál (${VIAS.map(v => v.n).join(', ')}); las rutas que pasan por ella se alargan y llega menos comida y se recogen menos orgánicos donde la ruta se alarga` }];
export const NOMBRE_EV = { cierre: 'Cierre de vía' };

/* ---------- supuestos de los tres subsistemas ---------- */
export const SUP = {
  KG_PERS: 0.4,      // kg/día de alimentos frescos por persona (OMS, el mismo de G2): lo que «necesita» cada zona
  HOLGURA: 0.10,     // [SUP] el mayorista y las flotas trabajan con 10 % de holgura sobre lo que les piden
  TAU_A: 6,          // [SUP] semanas en que la logística se reacomoda sola (A, sin coordinación)
  TAU_BC: 3,         // [SUP] B y C: 3 semanas + el tiempo de resolución de las solicitudes (la respuesta llega cuando se decide)
  RADIO_MERC: 2.0,   // [SUP] un mercado nodo surte zonas a 2 km generalizados o menos por la red
  TOPE_MERC: 0.6,    // [SUP] hasta 60 % de lo fresco de una zona puede salir de sus mercados; el resto, tiendas surtidas en Corabastos
  KM_REPARTO: 6,     // [SUP] B: reparto desde un solo nodo; cada 6 km de ruta duplican lo que cuesta llevar un kg (eficiencia 1/(1+km/6))
  INCL: 3,           // [SUP] cuando falta, lo que hay se reparte con ventaja para las zonas cercanas al nodo (cae a 1/e cada 3 km)
  KG_ORG: 0.45,      // [SUP] kg/día de orgánicos por persona
  COB: 0.13,         // [SUP] B y C: al final del montaje 13 % de los hogares de Kennedy separan para compost
  DIAS_CALLE: 3,     // [SUP] los contenedores y la calle guardan 3 días de orgánicos
  SEM_PLANTA: 2,     // [SUP] las plantas (B: una; C: una por nodo) guardan 2 semanas de su capacidad
  MU_LOCAL: 0.5,     // [SUP] C: una asamblea local decide la mitad de lo que decide la oficina central de B por semana
  LOCAL: 0.7,        // [SUP] C: 70 % de las solicitudes se resuelve en la asamblea local; 30 % sube a la federación
  FED_CADA: 2        // [SUP] C: la federación se reúne cada 2 semanas
};
const NZ = ZONAS.length, NF = FUENTES.length, NM = MERC_D.length, JC = 0, JB = 1, JD = 2;
const POBZ = ZONAS.map(z => z[2]), POBT = POBZ.reduce((s, v) => s + v, 0), SHARE = POBZ.map(p => p / POBT);
const CAPT = MERC_D.reduce((s, m) => s + m.cap, 0), CAPM = CAPT / NM;
// cierre k: factor f (costo normal / costo con la vía cerrada) por zona y fuente
const FCI = CIERRES.map(c => { const a = new Float32Array(NZ * NF).fill(1); for (const [i, j, f] of c.f) a[i * NF + j] = f; return a; });
// mercados: zonas a las que surte (radio) y su peso
const CATCH = MERC_D.map((m, k) => { const L = []; for (let z = 0; z < NZ; z++) { const c = COSTO[z][3 + k]; if (c <= SUP.RADIO_MERC) L.push([z, Math.exp(-c / 1.0)]); } return L; });
const EFB = ZONAS.map((_, z) => 1 / (1 + LARGO[z][JB] / SUP.KM_REPARTO));
const GC = ZONAS.map((_, z) => Math.exp(-COSTO[z][JC] / SUP.INCL)), GB = ZONAS.map((_, z) => Math.exp(-COSTO[z][JB] / SUP.INCL));
const NODO_Z = ZONAS.map((_, z) => { let b = 0, bc = Infinity; for (let k = 0; k < NM; k++) if (COSTO[z][3 + k] < bc) { bc = COSTO[z][3 + k]; b = k; } return b; }); // C: estación de compost más cercana
export const CAP_RED_TDIA = CAPT / 1000; // t/día de frutas y verduras de los 35 mercados de mercados_red.js (= capacidad de Bavaria en B)
export const PRECIO_REF = 2600;           // $/kg: precio de referencia de los alimentos frescos (valor por defecto de P1.precio)
/* ---------- CORABASTOS LIBERA ESPACIO (solo B y C) ----------
   Regla [SUP], declarada antes de correr: la carga liberada es la fracción de la comida de Kennedy que ya NO pasa por Corabastos (1 − dependencia),
   promediada en 26 semanas. El espacio de bodega que sobra es proporcional a la carga liberada: cuando carga liberada × huella de todas las
   bodegas alcanza la huella acumulada de la siguiente bodega (en orden de cercanía al humedal La Vaca), se aprueba su desmonte; como mucho una
   fase cada 13 semanas. Obra: 26 semanas sin bodega ni borde; luego el borde restaurado madura en 156 semanas. El desmonte no se revierte. */
export const DESMONTE = { EMA: 26, CADA: 13, OBRA: 26, MADURA: 156, Q_BORDE: 0.85, MEJORA_VACA: 0.25 };
export { BODEGAS, AREA_NAVES };
const BORDE_TOT = BODEGAS.reduce((a, b) => a + b.borde, 0), CUM = []; { let c = 0; for (const b of BODEGAS) { c += b.area; CUM.push(c); } }
function corabastos(s, e, dep, t) {
  const D = s.cora; if (e === 'A') return D;
  D.lib += ((1 - dep) - D.lib) / DESMONTE.EMA;
  const k = D.ap.length; if (k < BODEGAS.length && D.lib * AREA_NAVES >= CUM[k] && t - D.ult >= DESMONTE.CADA) { D.ap.push(t); D.ult = t; }
  let m2 = 0, ha = 0, mad = 0, rest = 0; for (let i = 0; i < D.ap.length; i++) { m2 += BODEGAS[i].area; const w = t - D.ap[i] - DESMONTE.OBRA; if (w >= 0) { rest++; const mz = Math.min(1, w / DESMONTE.MADURA); ha += BODEGAS[i].borde / 1e4; mad += mz * BODEGAS[i].borde; } }
  D.m2 = m2; D.ha = ha; D.rest = rest; D.mad = ha > 0 ? mad / (ha * 1e4) : 0; return D; }
const rampa = (t) => { let s = 0; for (const m of MERC_D) if (t >= m.desde) s += m.cap; return s / CAPT; }; // mismo calendario de montaje para B y C

/* ---------- HÁBITAT: especies (data3d/biotica.js) × parches, metapoblación de Levins ---------- */
export const ESPECIES = [['tingua', 'Tingua moteada', 'agua'], ['pato', 'Pato andino', 'agua'], ['focha', 'Focha común', 'agua'], ['garza', 'Garza blanca', 'agua'], ['garzaNoc', 'Garza nocturna', 'agua'],
  ['monjita', 'Monjita bogotana', 'junco'], ['rana', 'Rana sabanera', 'junco'], ['culebra', 'Serpiente sabanera', 'junco'], ['curi', 'Curí', 'junco'],
  ['copeton', 'Copetón', 'arbol'], ['mirla', 'Mirla patiamarilla', 'arbol'], ['colibri', 'Colibrí chillón', 'arbol'], ['torcaza', 'Torcaza', 'arbol'], ['cucarachero', 'Cucarachero', 'arbol'], ['chamon', 'Chamón', 'arbol'],
  ['cernicalo', 'Cernícalo', 'rapaz'], ['buho', 'Búho sabanero', 'rapaz'], ['lagartija', 'Lagartija bogotana', 'suelo'], ['comadreja', 'Comadreja', 'suelo']];
// [SUP] por grupo: afinidad por tipo de parche, alcance de dispersión D (m), colonización c y extinción e por semana
export const GRUPOS = {
  agua: { hab: { humedal: 1 }, D: 3000, c: 0.05, e: 0.004 },
  junco: { hab: { humedal: 1, parque: 0.15 }, D: 600, c: 0.03, e: 0.006 },
  arbol: { hab: { humedal: 0.6, parque: 0.8, bosque: 1, mod: 0.7, cub: 0.7 }, D: 2000, c: 0.05, e: 0.003 },
  rapaz: { hab: { humedal: 0.8, parque: 0.6, bosque: 0.8, mod: 0.3, cub: 0.3 }, D: 4000, c: 0.02, e: 0.01 },
  suelo: { hab: { humedal: 0.7, parque: 0.5, bosque: 0.8, mod: 0.4 }, D: 500, c: 0.03, e: 0.006 }
};
const RESCATE = 0.0005; // [SUP] llegada desde fuera de Kennedy (otros humedales y parques de Bogotá), por semana y por parque apto

/* ---------- TRÁFICO QUE CRECE Y FAUNA (iguales para A, B y C; fijados antes de correr) ----------
   Crecimiento del parque (por año desde la semana 0 = hoy, año a año):
   · carros +1,5 %/año: el parque de Bogotá creció 1,5 · 1,4 · 1,3 · 0,9 · 1,1 % en 2020–2024 (media 1,24 %/año; Secretaría Distrital de
     Hacienda, «Notas de Hacienda: diagnóstico del impuesto de vehículos», dic. 2025, gráfico 1, con el Registro Distrital Automotor) y las
     motos (18 % del parque) no crecieron, así que automóviles, camperos y camionetas crecen ≈ 1,24 / 0,82 = 1,5 %/año.
     [SUP] esa tasa se mantiene igual los próximos años (venía bajando: 4,1 % en 2016).
   · motos 0 %/año: motocicletas particulares inscritas en Bogotá 469.088 (2019) → 468.209 (2024) (Observatorio Ambiental de Bogotá,
     indicador NMtP con el RDA de la SDM, consulta 17/01/2025). Las motos matriculadas fuera de Bogotá no están en ese registro: su
     crecimiento es incierto y no se suma.
   · camiones 0 %/año [SUP]: sin serie encontrada.
   · índice de vehículos V = 0,70·carros + 0,22·motos + 0,08·camiones (el reparto de la grabación SUMO de index.html), 1 = hoy.
   MECANISMOS (solo estos dos; la contaminación no se modela porque no se encontró una relación dosis-efecto para estas especies):
   1 · RUIDO / ZONA DE EFECTO DE LA VÍA (aves): la distancia a la que bajan las aves crece con el tráfico como Q^0,4 (Reijnen y Foppen 1997:
       de 10.000 a 50.000 veh/día las distancias de las aves de bosque pasan de 30→60 m y de 1.500→2.800 m: exponente 0,39–0,43);
       dentro de esa zona la densidad de aves es 25 % menor (estudio holandés de autopistas, J. Avian Biol. 2025, doi 10.1002/jav.03572).
       Cada parche: fracción de su área dentro de la zona (círculo del área del parche, distancia a la vía principal más cercana de
       data3d/exposicion_trafico.js). La calidad del parche para las aves se multiplica por (1 − 0,25·f(hoy·V)) / (1 − 0,25·f(hoy)):
       con el tráfico de hoy no cambia nada (el modelo ya está calibrado con el tráfico de hoy).
       [SUP] distancia de efecto con el tráfico de hoy: ZONA_HOY m.
   2 · ATROPELLOS AL CRUZAR (barrera; anfibios, reptiles y mamíferos: rana, culebra, curí, lagartija, comadreja): probabilidad de morir al
       cruzar = 1 − e^(−c·Q) (Hels y Buchwald 2001: 0,34–0,61 en una vía de 3.207 veh/día → c = 1,3·10⁻⁴ a 2,9·10⁻⁴ por veh/día; se usa el
       menor). La colonización de un parche desde otro se multiplica por e^(−c·ΣQ·(V − 1)), ΣQ = flujo de las vías principales que corta
       la línea entre los dos (exposicion_trafico.js): con el tráfico de hoy no cambia; con más tráfico cruzar cuesta más. */
export const TRAFICO = { carros: 0.015, motos: 0, camiones: 0, ZONA_HOY: 300, B_DIST: 0.4, RED_ZONA: 0.25, C_ATROP: 1.3e-4, on: true,
  fuentes: [
    { n: 'Secretaría Distrital de Hacienda · Notas de Hacienda, diagnóstico del impuesto de vehículos (dic. 2025)', url: 'https://observatoriofiscal.shd.gov.co/sites/default/files/documentos_informacion_destacada/Primera%20Nota%20de%20Hacienda%20Distrital.pdf' },
    { n: 'Observatorio Ambiental de Bogotá · Motocicletas particulares NMtP (RDA-SDM, 2007–2024)', url: 'https://oab.ambientebogota.gov.co/descargar/34020' },
    { n: 'Reijnen y Foppen 1997 · Disturbance by traffic of breeding birds', url: 'https://the-eis.com/elibrary/sites/default/files/downloads/literature/Disturbance%20by%20traffic%20of%20breeding%20birds_1997.pdf' },
    { n: 'J. Avian Biology 2025 · aves y tráfico en autopistas de Países Bajos', url: 'https://doi.org/10.1002/jav.03572' },
    { n: 'Hels y Buchwald 2001 · The effect of road kills on amphibian populations (ICOET 2001)', url: 'https://escholarship.org/uc/item/0mf9859v' }] };
export function crecimiento(t) { // t = semana del modelo (0 = hoy); crece año a año
  const a = Math.max(0, Math.floor(t / AÑO)), car = Math.pow(1 + TRAFICO.carros, a), moto = Math.pow(1 + TRAFICO.motos, a), cam = Math.pow(1 + TRAFICO.camiones, a);
  return { años: a, car, moto, cam, V: 0.70 * car + 0.22 * moto + 0.08 * cam }; }
const TERRESTRE = new Set(['rana', 'culebra', 'curi', 'lagartija', 'comadreja']);
const NP = PARCHES.length, NS = ESPECIES.length, GK = Object.keys(GRUPOS);
const TIPO = PARCHES.map(p => p.t === 'modCubierta' ? 'cub' : p.t.startsWith('mod') ? 'mod' : p.t);
const KER = Object.fromEntries(GK.map(g => { const D = GRUPOS[g].D, a = new Float32Array(NP * NP); for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) if (p !== q) a[p * NP + q] = Math.exp(-Math.hypot(PARCHES[p].x - PARCHES[q].x, PARCHES[p].z - PARCHES[q].z) / D) * Math.sqrt(PARCHES[q].ha); return [g, a]; }));
const SQA = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha)));
const IB = PARCHES.findIndex(p => p.dyn), IV = PARCHES.findIndex(p => p.id === 'vaca'); // borde restaurado de La Vaca (área variable: KER usa 1 ha y se escala en cada semana) y La Vaca
const ES_TERR = ESPECIES.map(e => TERRESTRE.has(e[0])), ES_AVE = ESPECIES.map(e => !TERRESTRE.has(e[0]));
const RP = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI)); // radio del círculo con el área del parche (m)
const fZona = (p, D) => { const d = EXPO.parches[p] ? EXPO.parches[p][0] : Infinity, r = RP[p]; return cl((D - (d - r)) / (2 * r), 0, 1); }; // fracción del parche dentro de la zona de efecto
const EFT = new Map(); // efecto del tráfico por año (determinista; se calcula una vez por año de crecimiento)
function efectoTrafico(t) {
  const G = crecimiento(t), k = TRAFICO.on ? G.años : 0; let E = EFT.get(k); if (E) return E;
  const V = TRAFICO.on ? G.V : 1, D0 = TRAFICO.ZONA_HOY, D = D0 * Math.pow(V, TRAFICO.B_DIST), mq = new Float32Array(NP), xq = new Float32Array(NP * NP);
  let sq = 0; for (let p = 0; p < NP; p++) { mq[p] = (1 - TRAFICO.RED_ZONA * fZona(p, D)) / (1 - TRAFICO.RED_ZONA * fZona(p, D0)); sq += mq[p]; }
  let sx = 0, nx = 0; for (let i = 0; i < NP * NP; i++) { const c = EXPO.cruce[i] || 0; xq[i] = Math.exp(-TRAFICO.C_ATROP * c * (V - 1)); if (c > 0) { sx += xq[i]; nx++; } }
  E = { G, V, D, mq, xq, mqMedio: sq / NP, xqMedio: nx ? sx / nx : 1, pares: nx }; EFT.set(k, E); return E; }
function calidad(e, s, P3, out) { // calidad de cada parche esta semana (0 = no existe)
  for (let p = 0; p < NP; p++) { const P = PARCHES[p];
    out[p] = P.dyn ? (s.cora.ha > 0 ? DESMONTE.Q_BORDE * s.cora.mad : 0)
      : P.t === 'humedal' ? Math.min(1, P.k * s.W / 0.55 * (p === IV ? 1 + DESMONTE.MEJORA_VACA * (s.cora.ha * 1e4 / BORDE_TOT) * s.cora.mad : 1)) : P.t === 'bosque' ? 0.6 : P.t === 'parque' ? 0.3 + 0.3 * Math.min(1, P.ha / 10) + 0.2 * P3.arboles
      : P.t === 'modBavaria' ? (e === 'B' && s.supF > 0.2 ? 0.5 : 0) : (e === 'C' && s.supF >= P.cuota ? 0.4 : 0); } }
function apto(i, p, q) { const g = ESPECIES[i][2]; return (GRUPOS[g].hab[TIPO[p]] || 0) * q[p]; }

/* ---------- REGLAS DE GAME OVER (fijas, iguales para A, B y C; 4 semanas seguidas) ---------- */
export const REGLAS = [
  { k: 'habitat', n: 'Hábitat', txt: 'las especies con presencia en los parches caen 30 % o más frente al inicio', sem: 4,
    malo: (o) => o.esp <= o.esp0 * 0.7, riesgo: (o) => o.esp <= o.esp0 * 0.85, val: (o) => o.esp },
  { k: 'abasto', n: 'Abastecimiento', txt: 'alguna zona recibe menos del 80 % de los alimentos que necesita', sem: 4,
    malo: (o) => o.zMin < 0.8, riesgo: (o) => o.zMin < 0.9, val: (o) => o.zMin * 100 },
  { k: 'residuos', n: 'Residuos', txt: 'los orgánicos pendientes de tratamiento superan la capacidad de almacenamiento', sem: 4,
    malo: (o) => o.pend > o.alm, riesgo: (o) => o.pend > o.alm * 0.7, val: (o) => o.pend / Math.max(1, o.alm) * 100 }
];
export const MOTIVO = { habitat: 'se perdió 30 % o más de las especies en los parches', abasto: 'una zona recibió menos del 80 % de los alimentos', residuos: 'los orgánicos pendientes superaron el almacenamiento' };

const BASE = { A: { N: 300, q: 0.0025 }, B: { N: 2506, q: 0.0073 }, C: { N: 5400, q: 0.0073 } };
const A0 = 120, W0 = 0.55; // mismas condiciones iniciales para A, B y C

export function crear(e, seed) {
  const s = { e, seed, t: -1, mundo: prng(mezcla(seed, 1)), loc: prng(mezcla(seed, 11 + 'ABC'.indexOf(e))), hab: prng(mezcla(seed, 7)),
    A: A0, prom: 0, pipe: [], pob: POB_K, Nef: BASE[e].N, supF: 0, adopc: 0.15, buf: new Float64Array(64), W: W0, B: 900, muertes: 0,
    cierre: null, Kc: (1 + SUP.HOLGURA) * POB_K * SUP.KG_PERS * 7, Kr: (1 + SUP.HOLGURA) * POB_K * SUP.KG_ORG * 7, Kcs: 0, pr: 0, pcs: 0, pcp: 0,
    colaB: 0, colaC: [], colaF: 0, bajo90: 0, log: [], o: {}, racha: Object.fromEntries(REGLAS.map(R => [R.k, 0])), colapso: null,
    cora: { lib: 0, ap: [], ult: -999, m2: 0, ha: 0, mad: 0, rest: 0 }, rec: { pend: null, n: 0, suma: 0, ult: null, fallidas: 0 }, occ: new Uint8Array(NS * NP), q: new Float32Array(NP),
    H: { paso: 13, t: [], act: [], dep: [], zmin: [], esp: [], pend: [], res: [] } };
  calidad(e, s, { arboles: 0.4 }, s.q); // estado inicial igual para todos (sin módulos; árboles por defecto)
  for (let i = 0; i < NS; i++) for (let p = 0; p < NP; p++) s.occ[i * NP + p] = apto(i, p, s.q) >= 0.45 ? 1 : 0;
  s.esp0 = 0; for (let i = 0; i < NS; i++) { let a = 0; for (let p = 0; p < NP; p++) a |= s.occ[i * NP + p]; s.esp0 += a; }
  return s;
}
const anotar = (s, k, extra) => { s.log.push({ t: s.t, k, extra }); if (s.log.length > 12) s.log.shift(); };

// reparto con escasez: r_z·min(1, κ·g_z), con costo u_z por kg, tal que Σ = C (bisección)
function racionar(r, g, u, C, out) { let tot = 0; for (let z = 0; z < NZ; z++) tot += r[z] * u[z];
  if (tot <= C) { for (let z = 0; z < NZ; z++) out[z] = r[z]; return; }
  let lo = 0, hi = 1; const f = (k) => { let x = 0; for (let z = 0; z < NZ; z++) x += r[z] * Math.min(1, k * g[z]) * u[z]; return x; };
  while (f(hi) < C) hi *= 2; for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (f(m) < C) lo = m; else hi = m; }
  for (let z = 0; z < NZ; z++) out[z] = r[z] * Math.min(1, lo * g[z]); }
const UNO = new Float64Array(NZ).fill(1), UB = Float64Array.from(EFB, e => 1 / e);
const PUR = new Float64Array(NZ), NEED = new Float64Array(NZ), LOCZ = new Float64Array(NZ), MK = new Float64Array(NZ), BV = new Float64Array(NZ), RQ = new Float64Array(NZ), CO = new Float64Array(NZ), TMP = new Float64Array(NZ), DES = new Float64Array(NZ);
// cuantil de una mezcla de uniformes [lo, hi] con peso w
function mezclaU(seg) { let W = 0, m = 0; for (const [lo, hi, w] of seg) { W += w; m += w * (lo + hi) / 2; } if (!W) return { m: null, p90: null };
  const cdf = (x) => { let c = 0; for (const [lo, hi, w] of seg) c += w * (x <= lo ? 0 : x >= hi ? 1 : (x - lo) / Math.max(1e-9, hi - lo)); return c / W; };
  let a = 0, b = 1; for (const [, hi] of seg) b = Math.max(b, hi); for (let i = 0; i < 40; i++) { const x = (a + b) / 2; if (cdf(x) < 0.9) a = x; else b = x; } return { m: m / W, p90: b }; }

/* ---------- UNA SEMANA: estado -> estado ---------- */
export function paso(s, PAR) {
  const { P1, P2, P3 } = PAR, e = s.e, t = ++s.t, prop = e !== 'A', b = BASE[e], o = s.o, M = s.mundo, L = s.loc;
  // 1 · el mundo: 3 sorteos por semana en los tres escenarios (los mismos cierres para A, B y C)
  { const u = M(), v = M(), w = M();
    if (s.cierre && t > s.cierre.fin) { if (s.rec.pend && !s.rec.pend.cerrado) s.rec.pend.cerrado = t; s.cierre = null; }
    if (!s.cierre && u < haz(CIERRE.pAño) && FCI.length) { const k = Math.min(FCI.length - 1, Math.floor(v * FCI.length)), d = Math.round(CIERRE.dur[0] + w * (CIERRE.dur[1] - CIERRE.dur[0]));
      s.cierre = { k, t0: t, fin: t + d - 1, dur: d, on: P1.cierres !== false }; anotar(s, 'cierre', { via: VIAS[k].n, dur: d }); if (s.cierre.on && !s.rec.pend) s.rec.pend = { t0: t, k: 'cierre' }; } }
  const CI = s.cierre && s.cierre.on ? s.cierre : null, Fk = CI ? FCI[CI.k] : null, semCi = CI ? t - CI.t0 : 0;
  if (P1.crece) s.pob *= Math.pow(1.015, 1 / AÑO);
  const popF = s.pob / POB_K;
  const tau = !prop ? SUP.TAU_A : SUP.TAU_BC + Math.min(20, s.resolPrev || 1);
  const fe = (z, j) => { if (!Fk) return 1; const f = Fk[z * NF + j]; return f >= 1 ? 1 : f + (1 - f) * (1 - Math.exp(-semCi / tau)); }; // la ruta larga se va compensando (más viajes) en ~τ semanas

  /* ---- huertas, promotores y producción (SIM-01 sin eventos: solo azar demográfico) ---- */
  if (prop) { if (t % 13 === 0) s.pipe.push([t + P1.retardo, P1.cupos]); while (s.pipe.length && s.pipe[0][0] <= t) s.prom += s.pipe.shift()[1]; } // Bavaria forma una cohorte por trimestre (en B y en C)
  let m2p = s.prom >= 1 ? s.A * 50 / s.prom : Infinity;
  const cal = !prop ? 0.55 : isFinite(m2p) ? Math.max(0.45, Math.min(1, P1.c / m2p)) : 0.45;
  const carga = !prop ? 1.2 : isFinite(m2p) ? Math.min(3, m2p / P1.c) : 3;
  const alivio = e === 'C' ? Math.max(0.35, 1 - 6 / P1.rotacion * 0.6) : 1;
  if (prop) { const nuevos = poisson(L, s.A * (e === 'C' ? (P1.pares != null ? P1.pares : 3) : 0.8) / 1e4 * cal * (s.prom >= 1 ? 1 : 0.5)); // [SUP] en C los hogares forman promotores (vocería rotativa)
    const h = (1 / 260) * (1 + 1.5 * Math.max(0, carga - 1)) * (e === 'C' ? (0.6 + 0.4 * alivio) : 1);
    s.prom = Math.max(0, s.prom + nuevos - binom(L, s.prom, Math.min(1, h))); m2p = s.prom >= 1 ? s.A * 50 / s.prom : Infinity; }
  const Nef = Math.max(1, s.Nef);
  const p = !prop ? 0.0002 : s.prom >= 1 ? Math.max(0.00058, (P1.cupos / 13) * P1.alcance / Nef) : 0.0002;
  const fPrecio = Math.min(1, Math.pow(PRECIO_REF / Math.max(500, P1.precio || PRECIO_REF), 0.3)); // [SUP] precio alto: los hogares compran menos (elasticidad −0,3)
  const adop = Math.max(0, (p + b.q * s.A / Nef) * (Nef - s.A)) * Math.sqrt(Math.max(500, P1.precio || PRECIO_REF) / PRECIO_REF) * ruido(L, 0.3); // [SUP] precio alto: más hogares quieren sembrar (elasticidad 0,5)
  const espPrev = s.resolPrev || 0, fEsp = prop && espPrev > 12 ? 1 + Math.min(1, (espPrev - 12) / 24) : 1;
  const retiro = s.A * 0.0018 * (1 + 3 * Math.max(0, carga - 1)) * alivio * fEsp * ruido(L, 0.3);
  s.A = cl(s.A + adop - retiro, 0, Nef);
  if (prop) s.supF = s.prom >= 1 ? Math.min(1, s.supF + 1 / 156) : Math.max(0, s.supF - 1 / 104); // [SUP] superficies en 3 años; sin promotores se abandonan en 2
  const sup = prop ? P1.sup * s.supF * (e === 'B' ? 0.6 : 1) : 0;
  const prod = (s.A * 50 + sup) * P1.rend / AÑO * cal, auto = prod * P1.auto, merma = prod * P1.merma, exc = prod - auto - merma;
  const pers = prod * AÑO * 0.9 / (0.4 * 365);

  /* ---- ABASTECIMIENTO por zona ---- */
  const r0 = rampa(t);
  let needT = 0; for (let z = 0; z < NZ; z++) { NEED[z] = POBZ[z] * popF * SUP.KG_PERS * 7; needT += NEED[z]; LOCZ[z] = 0; MK[z] = 0; BV[z] = 0; }
  /* producción de las huertas: el autoconsumo (P1.auto) se queda en la zona; el excedente entra a la red hasta la capacidad de acopio de
     excedentes (P1.acopio, kg/semana): A sin acopio vende la mitad en la cuadra y pierde la otra mitad; B lo lleva a Bavaria; C lo vende en los mercados */
  const acop = !prop ? 0 : Math.min(Math.max(0, exc), P1.acopio), perdido = !prop ? Math.max(0, exc) * 0.5 : Math.max(0, exc - acop);
  const alimLocal = auto + (!prop ? Math.max(0, exc) * 0.5 : e === 'C' ? acop : 0); let bavKg = 0; const merc = e === 'C' ? new Float32Array(NM) : null;
  const fCap = (P1.capAcopio != null ? P1.capAcopio : CAP_RED_TDIA) / CAP_RED_TDIA; // «Capacidad de acopio de la red» (B: Bavaria; C: los mercados), relativa a la de mercados_red.js
  for (let z = 0; z < NZ; z++) LOCZ[z] = Math.min(NEED[z], alimLocal * SHARE[z]);
  for (let z = 0; z < NZ; z++) PUR[z] = fPrecio * Math.max(0, NEED[z] - LOCZ[z]); // lo que los hogares de la zona compran
  if (e === 'C') { /* mercados nodo, por rondas: cada mercado ofrece lo que le queda a sus zonas que aún tienen falta (en proporción a la falta
       y la cercanía); llega oferta × factor de ruta; lo que no hace falta o no llega por una ruta cortada queda en el mercado para la ronda
       siguiente, y otro mercado cercano puede suplir a la zona (4 rondas) */
    for (let z = 0; z < NZ; z++) DES[z] = Math.min(PUR[z], Math.max(0, NEED[z] * SUP.TOPE_MERC - LOCZ[z]));
    const resto = new Float64Array(NM); for (let k = 0; k < NM; k++) resto[k] = t >= MERC_D[k].desde ? MERC_D[k].cap * 7 * fCap : 0;
    for (let ronda = 0; ronda < 4; ronda++) for (let k = 0; k < NM; k++) { const S = resto[k]; if (S <= 1) continue; let wt = 0;
      for (const [z, w] of CATCH[k]) wt += Math.max(0, DES[z] - MK[z]) * w; if (!wt) continue;
      for (const [z, w] of CATCH[k]) { const falta = Math.max(0, DES[z] - MK[z]); if (!falta) continue; const ff = fe(z, 3 + k);
        const x = Math.min(S * falta * w / wt, falta / Math.max(0.05, ff)), lleg = Math.min(falta, x * ff); MK[z] += lleg; merc[k] += lleg; resto[k] -= x; } }
  }
  if (e === 'B') { // un solo nodo: misma capacidad total que la red de C y mismo calendario; reparto con costo por distancia
    const KB = CAPT * 7 * r0 * fCap + acop; let dem = 0; for (let z = 0; z < NZ; z++) dem += PUR[z] * UB[z];
    const sB = dem > 0 ? Math.min(SUP.TOPE_MERC, KB / dem) : 0;
    for (let z = 0; z < NZ; z++) TMP[z] = PUR[z] * sB;
    racionar(TMP, GB, UB, KB, BV); let perd = 0; for (let z = 0; z < NZ; z++) { const f = fe(z, JB); perd += BV[z] * (1 - f) * UB[z]; BV[z] *= f; }
    // lo que no llega por una ruta cortada queda en Bavaria y se manda a las zonas que aún tienen cupo (igual que los mercados de C en su segunda vuelta)
    if (perd > 0) { let room = 0; for (let z = 0; z < NZ; z++) { DES[z] = Math.max(0, Math.min(PUR[z], NEED[z] * SUP.TOPE_MERC) - BV[z]); room += DES[z] * UB[z]; }
      if (room > 0) for (let z = 0; z < NZ; z++) { const capU = perd * DES[z] * UB[z] / room, f = fe(z, JB); BV[z] += Math.min(DES[z], capU / UB[z] * f); } }
    for (let z = 0; z < NZ; z++) bavKg += BV[z]; }
  let R = 0; for (let z = 0; z < NZ; z++) { RQ[z] = Math.max(0, PUR[z] - MK[z] - BV[z]); R += RQ[z]; }
  racionar(RQ, GC, UNO, s.Kc, CO);
  let zMin = Infinity, zArg = -1, rec = 0, coraT = 0, nBajo = 0, b90 = 0;
  for (let z = 0; z < NZ; z++) { CO[z] *= fe(z, JC); coraT += CO[z]; const got = LOCZ[z] + MK[z] + BV[z] + CO[z], r = got / NEED[z]; rec += got; if (r < zMin) { zMin = r; zArg = z; } if (r < 0.8) nBajo++; if (r < 0.9) b90++; }
  s.Kc += ((1 + SUP.HOLGURA) * R - s.Kc) / tau; // el mayorista se acomoda a lo que le piden
  const dep = rec > 0 ? coraT / rec : 1;
  const DC = corabastos(s, e, dep, t); // Corabastos libera espacio y desmonta bodegas junto a La Vaca (B y C)

  /* ---- RESIDUOS orgánicos: pendientes de tratamiento vs. capacidad de almacenamiento ---- */
  const gen = POB_K * popF * SUP.KG_ORG * 7, cob = prop ? SUP.COB * r0 : 0;
  const sep = prop ? gen * cob * P2.frac * s.adopc : 0, casa = !prop ? gen * 0.02 * s.adopc : 0; // A: 2 % se composta en casa (no queda pendiente)
  const capComp = prop ? NM * P2.cap * r0 : 0; // B: una planta en Bavaria · C: una estación por nodo abierto (la misma suma)
  let fr = 0, fc = 0; for (let z = 0; z < NZ; z++) { fr += SHARE[z] * fe(z, JD); fc += SHARE[z] * (e === 'B' ? fe(z, JB) : e === 'C' ? fe(z, 3 + NODO_Z[z]) : 1); } // ruta media al relleno y al compost
  const inR = gen - sep - casa; s.pr += inR; const colR = Math.min(s.pr, s.Kr * fr); s.pr -= colR;
  s.pcs += sep; const colC = Math.min(s.pcs, s.Kcs * fc); s.pcs -= colC; s.pcp += colC;
  const trat = Math.min(s.pcp, capComp); s.pcp -= trat; const Sp = SUP.SEM_PLANTA * capComp; let rechazo = 0;
  if (s.pcp > Sp) { rechazo = s.pcp - Sp; s.pcp = Sp; s.pr += rechazo; } // la planta llena devuelve lo que no cabe: se va al relleno
  s.Kr += ((1 + SUP.HOLGURA) * inR + 0.25 * s.pr - s.Kr) / tau; s.Kcs += ((1 + SUP.HOLGURA) * sep + 0.25 * s.pcs - s.Kcs) / tau; // las flotas se acomodan (y vacían lo atrasado en ~4 semanas)
  const rech = sep > 0 ? rechazo / sep : 0;
  if (prop) s.adopc = rech < 0.05 ? Math.min(1, s.adopc + 1 / 156) : Math.max(0.05, s.adopc - rech / 52); else s.adopc = Math.min(1, s.adopc + 1 / 156);
  const pend = s.pr + s.pcs + s.pcp, alm = gen * SUP.DIAS_CALLE / 7 + Sp;
  const mad = cl(Math.round(P2.mad), 1, 60), madura = t >= mad ? s.buf[(t - mad) & 63] : 0; s.buf[t & 63] = trat;
  let pila = 0; for (let i = 0; i < mad && i <= t; i++) pila += s.buf[(t - i) & 63];
  const sust = e === 'C' ? madura * P2.sust : e === 'B' ? madura * P2.sust * 0.3 : 0, comp = Math.max(0, madura * 0.5 - sust * 0.5), hongos = sust * 0.15;
  const dist = !prop ? 28 : e === 'B' ? 4.5 : P2.dist;

  /* ---- humedal, aves y HÁBITAT (metapoblación) ---- */
  const huertas = e === 'C' ? P3.borde * s.supF : 0; // [SUP] B produce en Bavaria (lejos del borde); C tiene módulos en parques junto al humedal
  const presion = 0.004 + huertas * 0.00012 * 0.7;
  s.W = cl(s.W + P3.rec * (1 - s.W) * 0.2 - presion * s.W, 0.05, 1);
  calidad(e, s, P3, s.q);
  const trampa = 1 + 3 * P3.luz * (P3.anti ? 0.3 : 1); // [SUP] luz y vidrio de los módulos: más extinción de aves de árbol en ellos
  const H_ = s.hab, q = s.q, occ = s.occ, raizB = Math.sqrt(Math.max(0.05, s.cora.ha)); let esp = 0; // el borde restaurado pesa según su área de esta semana
  const ET = efectoTrafico(t), MQ = ET.mq, XQ = ET.xq; // tráfico que crece: ruido para las aves (MQ por parche) y atropellos al cruzar para la fauna terrestre (XQ por par)
  let ocAve = 0, ocTer = 0;
  for (let i = 0; i < NS; i++) { const g = ESPECIES[i][2], G = GRUPOS[g], K = KER[g], base = i * NP, nuevo = new Uint8Array(NP), ave = ES_AVE[i], ter = ES_TERR[i]; let hay = 0;
    for (let pp = 0; pp < NP; pp++) { const u = H_(), h = apto(i, pp, q) * (ave ? MQ[pp] : 1); if (h <= 0) { nuevo[pp] = 0; continue; }
      if (occ[base + pp]) { const ext = Math.min(1, G.e / (h * (pp === IB ? raizB : SQA[pp])) * (g === 'arbol' && TIPO[pp] !== 'parque' && TIPO[pp] !== 'humedal' && TIPO[pp] !== 'bosque' ? trampa : 1)); nuevo[pp] = u < ext ? 0 : 1; }
      else { let S = 0; for (let qq = 0; qq < NP; qq++) if (occ[base + qq]) S += K[pp * NP + qq] * apto(i, qq, q) * (ave ? MQ[qq] : 1) * (ter ? XQ[pp * NP + qq] : 1) * (qq === IB ? raizB : 1); const col = 1 - Math.exp(-G.c * h * S) + RESCATE * h; nuevo[pp] = u < col ? 1 : 0; }
      hay |= nuevo[pp]; if (nuevo[pp]) { if (ave) ocAve++; else ocTer++; } }
    occ.set(nuevo, base); esp += hay; }
  if (s.oc0 == null) s.oc0 = { ave: Math.max(1, ocAve), ter: Math.max(1, ocTer) }; // ocupación de la primera semana: referencia para el panel
  const espOc = new Float32Array(NS); for (let i = 0; i < NS; i++) { let n = 0; for (let pp = 0; pp < NP; pp++) n += occ[i * NP + pp]; espOc[i] = n; }
  if (!s.espOc0) s.espOc0 = Float32Array.from(espOc, v => Math.max(1, v));
  const conect = !prop ? 0.2 : e === 'B' ? 1 - Math.exp(-P3.disp / 600) : (1 - Math.exp(-P3.disp / 250)) * (0.4 + 0.6 * s.supF);
  const Kav = 900 * (0.6 + 0.6 * s.W + 0.5 * P3.arboles + (prop ? 0.4 * conect + huertas * 0.006 : 0));
  const mm = (e === 'C' ? huertas / 40 * 0.004 * P3.luz * 0.6 : e === 'B' ? 0.0004 * P3.luz : 0.0004) * (P3.anti ? 0.3 : 1);
  const muere = s.B * mm; s.muertes += muere; s.B = Math.max(20, s.B + 0.012 * s.B * (1 - s.B / Kav) - muere + conect * 1.5);

  /* ---- SOLICITUDES y tiempo de resolución (B: una cola; C: asambleas en paralelo + federación) ---- */
  const nodos = MERC_D.reduce((n, m) => n + (t >= m.desde ? 1 : 0), 0);
  let resol = { m: null, p90: null };
  if (prop) { const lam = 0.002 * s.A + 0.3 * adop + 0.5 * nodos + s.bajo90 + (CI ? 2 : 0); // [SUP] hogares, adopciones, cada nodo/punto, cada zona con falta y el cierre
    if (e === 'B') { s.colaB += poisson(L, lam); const mu = P1.mu, bk = s.colaB; resol = { m: 1 + bk / (2 * mu), p90: 1 + 0.9 * bk / mu }; s.colaB = Math.max(0, s.colaB - mu); }
    else { const K = Math.max(4, nodos), seg = []; while (s.colaC.length < K) s.colaC.push(0); let mLoc = 0, nLoc = 0;
      for (let i = 0; i < K; i++) { const a = poisson(L, SUP.LOCAL * lam / K); s.colaC[i] += a; const mu = P1.mu * SUP.MU_LOCAL * ((t + i) % Math.max(1, Math.round(P1.rotacion)) === 0 ? 0.5 : 1); // [SUP] la semana del relevo de vocería decide la mitad
        const bk = s.colaC[i]; seg.push([1, 1 + bk / mu, Math.max(a, 1e-3)]); mLoc += (1 + bk / (2 * mu)) * a; nLoc += a; s.colaC[i] = Math.max(0, bk - mu); }
      const aF = poisson(L, (1 - SUP.LOCAL) * lam); s.colaF += aF; const muF = P1.mu / SUP.FED_CADA, l0 = (nLoc ? mLoc / nLoc : 1) + SUP.FED_CADA / 2;
      seg.push([l0, l0 + s.colaF / muF, Math.max(aF, 1e-3)]); if (t % SUP.FED_CADA === 0) s.colaF = Math.max(0, s.colaF - P1.mu);
      resol = mezclaU(seg); } }
  s.resolPrev = resol.m || 0; s.bajo90 = b90;

  Object.assign(o, { t, act: s.A, N: b.N, prom: s.prom, prod, auto, merma, exc, pers, pct: pers / s.pob * 100, dep, reg: e === 'A' ? 0 : (bavKg + (merc ? merc.reduce((a, v) => a + v, 0) : 0)) / needT, m2p: isFinite(m2p) ? m2p : null, cal,
    espera: resol.m, resol, pc: 3000 * (1 - P1.reac * Math.min(1, pers / P1.zona) * 0.25), carga, retiro, prog: prop,
    gen, relleno: colR, desv: trat, rech, compost: comp, vuelve: comp, hongos, pct2: trat / gen * 100, pila, km: colR / 8000 * 28 * 2 + colC / 1500 * dist * 2, ocup: capComp ? Math.min(1.5, s.pcp / Math.max(1, Sp)) : 0,
    aves: s.B, riq: Math.round(42 * (0.45 + 0.35 * conect + 0.3 * s.W)), hum: s.W * 100, trampa: s.muertes, conect,
    need: needT, recib: rec / needT, zMin, zArg, nBajo, coraKg: coraT, bavKg, merc, nodos, pend, alm, sep, capComp, esp, esp0: s.esp0,
    trafico: { años: ET.G.años, car: ET.G.car, moto: ET.G.moto, V: ET.V, D: ET.D, mq: ET.mqMedio, xq: ET.xqMedio, ocAve, ocTer, ocAve0: s.oc0.ave, ocTer0: s.oc0.ter },
    espOc, espOc0: s.espOc0,
    cora: { lib: DC.lib, desm: DC.ap.length, rest: DC.rest, m2: DC.m2, borde: Math.round(DC.ha * 1e4), mad: DC.mad, total: BODEGAS.length }, perdido,
    cierre: s.cierre ? { via: VIAS[s.cierre.k].n, sem: t - s.cierre.t0 + 1, dur: s.cierre.dur, on: s.cierre.on } : null });
  /* ---- reglas de game over ---- */
  if (t >= ARRANQUE) { for (const Q of REGLAS) s.racha[Q.k] = Q.malo(o) ? s.racha[Q.k] + 1 : 0;
    if (!s.colapso) { const c = REGLAS.filter(Q => s.racha[Q.k] >= Q.sem).map(Q => Q.k); if (c.length) s.colapso = { t, semana: t + 1, causas: c, motivo: c.map(k => MOTIVO[k]).join('; ') }; } }
  /* ---- recuperación tras un cierre: semanas hasta que todas las zonas vuelven a recibir 95 % o más ---- */
  const pd = s.rec.pend; if (pd && pd.cerrado != null) { const sem = t - pd.t0; if (zMin >= 0.95) { s.rec.n++; s.rec.suma += sem; s.rec.ult = { k: pd.k, t0: pd.t0, sem }; s.rec.pend = null; } else if (sem > 104) { s.rec.fallidas++; s.rec.ult = { k: pd.k, t0: pd.t0, sem: null }; s.rec.pend = null; } }
  /* ---- historia submuestreada ---- */
  const H = s.H; if (t % H.paso === 0) { H.t.push(t); H.act.push(s.A); H.dep.push(dep); H.zmin.push(zMin); H.esp.push(esp); H.pend.push(pend / alm); H.res.push(resol.m);
    if (H.t.length > 600) { for (const k of ['t', 'act', 'dep', 'zmin', 'esp', 'pend', 'res']) H[k] = H[k].filter((_, i) => i % 2 === 0); H.paso *= 2; } }
  return o;
}

/* estado de cada regla: ok / en riesgo / cumpliendo X de 4 / cerrada */
export function diagnostico(s) {
  const o = s.o, reglas = [];
  if (s.t >= 0) for (const Q of REGLAS) { const r = s.racha[Q.k], cerrada = !!(s.colapso && s.colapso.causas.includes(Q.k));
    reglas.push({ R: Q, v: Q.val(o), racha: r, cerrada, estado: cerrada ? 'cerrada' : r > 0 ? 'cumple' : Q.riesgo(o) ? 'riesgo' : 'ok' }); }
  const riesgos = reglas.filter(x => x.estado === 'cumple' || x.estado === 'riesgo').map(x => ({ ...x, faltan: Math.max(0, x.R.sem - x.racha), cumple: x.racha > 0 }));
  return { estado: s.colapso ? 'colapso' : riesgos.length ? 'riesgo' : 'ok', reglas, riesgos, colapso: s.colapso, antes: s.t < ARRANQUE };
}
export function tendencia(s) { const H = s.H, n = H.t.length; if (n < 3) return null; const t1 = H.t[n - 1]; let i = n - 1; while (i > 0 && t1 - H.t[i] < 5 * AÑO) i--;
  const a0 = H.act[i], a1 = H.act[n - 1], años = (t1 - H.t[i]) / AÑO; if (años < 1) return null; return { pctAño: a0 > 1 ? ((a1 / a0) ** (1 / años) - 1) * 100 : (a1 > 1 ? 100 : 0), años }; }

/* ---------- MODO «EVALUAR»: R corridas con semillas FIJAS 1..R, mismas reglas, mismo horizonte ---------- */
export function corrida(e, seed, años, PAR) {
  const s = crear(e, seed), n = años * AÑO, act = new Float32Array(años), zmin = new Float32Array(años).fill(9), esp = new Float32Array(años).fill(99), pend = new Float32Array(años);
  const resM = new Float32Array(años), resP = new Float32Array(años), merc = new Float64Array(NM); let nRes = 0, nMerc = 0, bav = 0;
  for (let w = 0; w < n; w++) { const o = paso(s, PAR), y = (w / AÑO) | 0;
    if (o.zMin < zmin[y]) zmin[y] = o.zMin; if (o.esp < esp[y]) esp[y] = o.esp; const pr = o.pend / o.alm; if (pr > pend[y]) pend[y] = pr;
    if (o.resol.m != null) { resM[y] += o.resol.m / AÑO; resP[y] += o.resol.p90 / AÑO; nRes++; }
    if (w >= n - AÑO) { if (o.merc) for (let k = 0; k < NM; k++) merc[k] += o.merc[k] / AÑO; bav += o.bavKg / AÑO; nMerc++; }
    if (w % AÑO === AÑO - 1) act[y] = o.act; }
  return { seed, colapso: s.colapso ? { año: s.colapso.t / AÑO, semana: s.colapso.semana, causas: s.colapso.causas } : null, act, zmin, esp, pend, resM: nRes ? resM : null, resP: nRes ? resP : null,
    merc: e === 'C' ? Array.from(merc) : null, bav: e === 'B' ? bav : null, cora: { desm: s.cora.ap.length, rest: s.cora.rest, borde: Math.round(s.cora.ha * 1e4), m2: s.cora.m2, primera: s.cora.ap.length ? s.cora.ap[0] + 1 : null, lib: s.cora.lib }, rec: s.rec.n ? s.rec.suma / s.rec.n : null, recN: s.rec.n, recF: s.rec.fallidas, cierres: s.log.filter(x => x.k === 'cierre').length };
}
export function resumen(corridas, años) {
  const R = corridas.length, sup = []; for (let y = 0; y <= años; y++) sup.push(corridas.filter(c => !c.colapso || c.colapso.año > y).length / R * 100);
  const col = corridas.filter(c => c.colapso).map(c => c.colapso.año).sort((a, b) => a - b), causas = {};
  corridas.forEach(c => c.colapso && c.colapso.causas.forEach(k => { causas[k] = (causas[k] || 0) + 1; }));
  const tAll = corridas.map(c => c.colapso ? c.colapso.año : Infinity).sort((a, b) => a - b), med = tAll[Math.floor((R - 1) / 2)];
  const mediana = (arr) => { const v = arr.slice().sort((a, b) => a - b), n = v.length; if (!n) return null; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  const semCierre = mediana(corridas.filter(c => c.colapso).map(c => c.colapso.semana));
  const medAct = [], medZ = []; for (let y = 0; y < años; y++) { medAct.push(mediana(corridas.map(c => c.act[y]))); medZ.push(mediana(corridas.map(c => c.zmin[y]))); }
  const conR = corridas.filter(c => c.resM); const resM = conR.length ? mediana(conR.map(c => c.resM.reduce((a, v) => a + v, 0) / años)) : null, resP = conR.length ? mediana(conR.map(c => c.resP.reduce((a, v) => a + v, 0) / años)) : null;
  const merc = corridas[0] && corridas[0].merc ? corridas[0].merc.map((_, k) => corridas.reduce((a, c) => a + c.merc[k], 0) / R) : null;
  const cora = corridas[0] && corridas[0].cora ? { desm: mediana(corridas.map(c => c.cora.desm)), borde: mediana(corridas.map(c => c.cora.borde)), m2: mediana(corridas.map(c => c.cora.m2)), primera: mediana(corridas.filter(c => c.cora.primera).map(c => c.cora.primera)) } : null;
  return { R, cora, sup, colapsan: col.length, mediana: med, semCierre, min: col.length ? col[0] : null, max: col.length ? col[col.length - 1] : null, causas, medAct, medZ, resM, resP, merc,
    porRegla: Object.fromEntries(REGLAS.map(Q => [Q.k, (causas[Q.k] || 0) / R * 100])) };
}
