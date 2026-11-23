/* ============ LAS 12 SIMULACIONES · módulo ES para el navegador y para node ============
   Reúne el modelo semanal data3d/sim_vida.js (abastecimiento por zona, residuos orgánicos, hábitat de Levins) con la red trófica compartida
   data3d/red_trofica.js (23 especies de fauna × 71 de flora × enlaces de la red) y los modificadores de la instalación
   (tools/escenarios_instalacion.mjs), y añade ruido, tráfico, atropellos, eventos de extinción y SEIS reglas de game over iguales para las 12.
   Sin DOM ni fs: los datos pesados vienen precalculados en data3d/simulaciones_datos.json (tools/simulaciones_datos.mjs) y se cargan con
   cargarDatos(cargar). Todo es determinista con la semilla. 520 semanas = 10 años. Semana 0 = hoy (nov-2026).
   Regla del proyecto: nada inventado; todo supuesto va marcado [SUP] con su porqué; cifras con su fuente.

   USO:
     import * as S from './data3d/simulaciones12.js';
     await S.cargarDatos(url => fetch(url).then(r => r.json()));       // en node: url => JSON.parse(readFileSync(fileURLToPath(url)))
     const e = S.crear(7, 1, { metroRed: 10 }); for (let i = 0; i < 520; i++) { S.paso(e); const x = S.ind(e); const go = S.gameOver(e); }

   ÍNDICES QUE NO ESTÁN EN sim_vida.js (cómo se calculan aquí):
   · trafico: índice de vehículos V de sim_vida.js (carros +1,5 %/año, motos y camiones 0 %; 1 = hoy; en D suma los carros del plan parcial),
     × (1 − reducción del metro × fracción del flujo vial que pasa a 800 m o menos del eje) desde que opera. El flujo sale de la grabación SUMO.
   · ruidoDb: promedio de los niveles de todas las celdas de vía de 16 m (como el panel de ruido del simulador, data3d/capas_escenario.js:
     «Ruido promedio» = promedio de los niveles de todas las celdas de vía). Nivel de hoy por celda = fórmula del simulador (tools/simulaciones_datos.mjs);
     cada semana se le suma 10·log10(factor de tráfico de la celda) (regla de energía del simulador: dB = 10·log10(propuesta/hoy)).
     [SUP] un cierre de vía no cambia el ruido ni el índice de tráfico (los mismos vehículos se desvían; el modelo semanal no reparte el desvío).
   · callesRuidosas: % de celdas de vía con 65 dB o más (banda «naranja · ruidoso» del simulador, que cuenta 65 como ruidoso). callesOMS: % con 53 dB o más
     (la OMS 2018 recomienda menos de 53 dB Lden). Ojo: la fórmula del simulador limita el desvío a +5 dB, así que muchas calles locales quedan justo
     en 65,0 dB: un cambio pequeño de tráfico mueve muchas celdas de banda.
   · atropellos: ÍNDICE [SUP], no un conteo observado. Probabilidad de morir al cruzar = 1 − e^(−c·Q) (Hels y Buchwald 2001, c = 1,3·10⁻⁴ por veh/día,
     el mismo de sim_vida.js), Q = flujo de las vías principales que corta la línea entre dos parches (data3d/exposicion_trafico.js) × tráfico de la semana.
     [SUP] cada parche ocupado por una especie terrestre (rana, serpiente, curí, lagartija, comadreja, rata, caracol) emite UN dispersante por semana,
     que va a otro parche con el mismo núcleo de dispersión de sim_vida.js (e^(−d/D)·√ha). atropellos = dispersantes que se espera mueran esa semana.
   · zonas.soporteEco: 1 − Π_parches (1 − r_p·e^(−d/300 m)), r_p = fracción de las 23 especies de fauna presentes en el parche. 300 m: distancia
     lineal de acceso a un espacio verde que recomienda la OMS (WHO Europe 2016, Urban green spaces and health; indicador «espacio verde de
     0,5–1 ha a 300 m»: https://www.who.int/europe/publications/i/item/WHO-EURO-2016-3352-43111-60341). [SUP] usar ese radio como alcance del soporte.
   · zonas.comercio: de lo que la zona COMPRA (todo lo que recibe menos lo de sus huertas), fracción que vende la red local (mercados de barrio,
     plazoletas o Bavaria) en vez de Corabastos; 0 si no compra nada. zonas.cora: fracción de lo que necesita que llega de Corabastos.
   · red: INTERACCIONES LOCALES = suma sobre parches de los enlaces de la red cuyos dos extremos están en ese parche (o el otro extremo al alcance
     de dispersión del grupo de la especie de fauna, la regla de recursos de red_trofica.js); red0 = la de la semana 0. redTipos / redTipos0 = el
     conteo anterior (enlaces distintos realizados en algún parche, máximo 249). poliniz = pares especie × parche ocupados por polinizadores
     (especies con enlace de visita floral/polinización, tipo 5 de biotica.json: abeja, colibrí, ...); poliniz0 = semana 0; polinizEsp = especies.
   · extinciones: una especie desaparece de TODA Kennedy esa semana; parche = su último parche (si eran varios a la vez, el de más área);
     motivo = el que anotó data3d/red_trofica.js al extinguirse en ese parche (sin recursos de la red, tráfico y ruido, tala, humedal degradado o
     azar demográfico). */
import * as V from './sim_vida.js?v=sims1';
import { crearRed, MOTIVOS } from './red_trofica.js?v=1';
import { ZONAS, PARCHES, CIERRES } from './sim_red_datos.js?v=2';
import { EXPO } from './exposicion_trafico.js?v=1';

const NZ = ZONAS.length, NP = PARCHES.length;
export const ZONAS_XZ = ZONAS.map(z => [z[0], z[1]]); // centro de cada zona de 500 m, marco MUNDO del simulador (x este, z sur)
export const SEMANAS = 520;

/* ---------- supuestos de este módulo ---------- */
export const SUP_SIMS = {
  METRO_SEM: 114,      // [SUP] la Línea 1 opera desde la semana 114 (la que usa data3d/metro_l1.js y el Escenario 1 de index.html)
  METRO_RED: 0.10,     // [SUP] 10 % menos vehículos cerca del corredor desde que opera (el mismo de index.html, commit bb69d22). No hay cifra oficial.
  METRO_RADIO: 800,    // [SUP] «cerca del corredor» = 800 m o menos del eje (caminata típica a una estación; el de tools/escenarios_instalacion.mjs)
  SIN_CORA: 52,        // [SUP] e5: Corabastos deja de abastecer en la semana 52 (hipotético; no hay plan oficial de cierre)
  DESM_LIB: 1,         // [SUP] e6: la carga liberada de Corabastos tiende a 1 (el desmonte sigue el calendario de B y C)
  CIERRE_VIA: 'americas', CIERRE_T0: 104, CIERRE_DUR: 26, // [SUP] e8, e9: cierre forzado de la Av. de las Américas 26 semanas desde la 104
  TECHOS_M2: 49000,    // e12: 4,9 ha de techos y balcones (desglose de P1.sup = 9,8 ha en data3d/sim_modelos.js: parques y lotes ~2 ha, techos y balcones ~4,9 ha, Bavaria ~2,9 ha)
  TECHOS_SEM: 156,     // e12: las superficies se montan en 3 años (la misma regla [SUP] de sim_vida.js para supF)
  M2_HUERTA: 50,       // m² por huerta (documento, sim_modelos.js area0): para contar los techos como huertas equivalentes
  RADIO_ECO: 300,      // m, ver zonas.soporteEco arriba (OMS 2016)
  CIERRES_AL_AZAR: false // [SUP] como en tools/escenarios_instalacion.mjs: cierres al azar sorteados pero sin efecto, para que las 12 se distingan
};

/* ---------- las 12 simulaciones ---------- */
const capAc = Math.round(V.CAP_RED_TDIA * 10) / 10;
const sArb = { k: 'P3.arboles', n: 'Densidad de árboles en parques', min: 0, max: 1, paso: 0.05, val: 0.4, unidad: '0–1', ayuda: 'Sube la calidad de los parques como hábitat (sim_vida.js: 0,3 + 0,3·tamaño + 0,2·árboles).' };
const sRec = { k: 'P3.rec', n: 'Recuperación del humedal', min: 0, max: 0.1, paso: 0.005, val: 0.02, unidad: '/semana', ayuda: 'Qué tan rápido se recupera la calidad de los humedales frente a la presión urbana.' };
const sCap = { k: 'P1.capAcopio', n: 'Capacidad de acopio de la red', min: 20, max: 300, paso: 5, val: capAc, unidad: 't/día', ayuda: 'Frutas y verduras que mueve la red (B: Bavaria; C: los mercados). Por defecto, la de los 35 mercados de mercados_red.js.' };
const sComp = { k: 'P2.cap', n: 'Capacidad de compost por nodo', min: 1000, max: 15000, paso: 500, val: 6000, unidad: 'kg/semana', ayuda: 'Orgánicos que trata cada estación (B: la suma en una sola planta).' };
const sCupos = { k: 'P1.cupos', n: 'Promotores por cohorte', min: 0, max: 40, paso: 1, val: 12, unidad: 'por trimestre', ayuda: 'Promotores que forma Bavaria cada 13 semanas.' };
const sT0 = { k: 'cierreT0', n: 'Semana en que se cierra la vía', min: 1, max: 500, paso: 1, val: SUP_SIMS.CIERRE_T0, unidad: 'semana', ayuda: 'Cierre forzado de la Av. de las Américas.' };
const sDur = { k: 'cierreDur', n: 'Duración del cierre', min: 1, max: 104, paso: 1, val: SUP_SIMS.CIERRE_DUR, unidad: 'semanas', ayuda: 'Las rutas que pasan por la vía se alargan: llega menos comida y se recogen menos orgánicos.' };
export const SIMS = [
  { id: 1, n: 'Hoy, sin proyecto', corto: 'Hoy', base: 'A', pregunta: '¿Aguanta Kennedy diez años si todo sigue como hoy?',
    desc: 'Todo llega por Corabastos y los orgánicos van al relleno Doña Juana. El tráfico crece como viene creciendo. Es el punto de comparación de las demás.', sliders: [sArb, sRec] },
  { id: 2, n: 'Instituto en Bavaria', corto: 'Instituto', base: 'B', pregunta: '¿Un solo nodo en Bavaria sostiene el abasto, el compost y la fauna?',
    desc: 'Bavaria Común concentra acopio, reparto, compost, formación de promotores y decisiones. Los mercados de barrio solo venden lo que sale de Bavaria.', sliders: [sCap, sComp, sCupos, sArb] },
  { id: 3, n: 'Red de mercados de barrio', corto: 'Red', base: 'C', pregunta: '¿Una red de mercados de barrio reparte mejor la comida y el hábitat que un solo nodo?',
    desc: 'Los 35 mercados y plazoletas son nodos con bodega y compost; módulos de huertas en cubiertas, colegios y parques; Bavaria forma promotores. Misma capacidad total que el instituto.',
    sliders: [sCap, sComp, { k: 'P1.rotacion', n: 'Rotación de vocerías', min: 2, max: 52, paso: 1, val: 12, unidad: 'semanas', ayuda: 'Cada cuánto rota la vocería de las asambleas (alivia la carga de los promotores).' }, sArb] },
  { id: 4, n: 'Plan parcial Bavaria', corto: 'Plan parcial', base: 'D', pregunta: '¿Qué le pasa a Kennedy si se construye el Plan Parcial Fábrica Bavaria?',
    desc: 'Kennedy como hoy más 14.300 viviendas por etapas en el predio de Bavaria: más gente, más carros y se talan árboles del bosque de Bavaria.', sliders: [sArb, sRec] },
  { id: 5, n: 'Corabastos cierra', corto: 'Sin Corabastos', base: 'A', pregunta: '¿Qué pasa con la comida de Kennedy si Corabastos deja de abastecer y no hay red?',
    desc: 'Hoy, pero Corabastos deja de abastecer y no hay red alternativa: solo queda lo que producen las huertas. Más del 94 % de lo que se vende en Bogotá entra por Corabastos (SIPSA 2025).',
    sliders: [{ k: 'sinCora', n: 'Semana en que cierra Corabastos', min: 1, max: 520, paso: 1, val: SUP_SIMS.SIN_CORA, unidad: 'semana', ayuda: 'Desde esa semana la capacidad de Corabastos es 0, sin reemplazo.' }, sArb] },
  { id: 6, n: 'Corabastos se reduce y se restaura el borde de La Vaca', corto: 'Borde La Vaca', base: 'A', pregunta: '¿Desmontar las bodegas junto al humedal La Vaca devuelve fauna?',
    desc: 'Hoy, pero las bodegas de Corabastos junto al humedal La Vaca se desmontan con el calendario de B y C y el borde se restaura y madura en tres años. El abastecimiento no cambia.',
    sliders: [{ k: 'desmLib', n: 'Carga liberada de Corabastos', min: 0, max: 1, paso: 0.05, val: SUP_SIMS.DESM_LIB, unidad: '0–1', ayuda: 'Fracción del espacio de bodega que deja de usarse; decide cuántas bodegas se desmontan.' }, sRec, sArb] },
  { id: 7, n: 'Metro Línea 1', corto: 'Metro', base: 'A', pregunta: '¿Menos carros cerca del metro alivian el ruido y la fauna?',
    desc: 'Hoy más la Línea 1 del metro en operación desde la semana 114. Cerca del corredor (800 m) circulan menos vehículos [SUP 10 %, sin cifra oficial].',
    sliders: [{ k: 'metroRed', n: 'Menos vehículos cerca del metro', min: 0, max: 50, paso: 1, val: SUP_SIMS.METRO_RED * 100, unidad: '%', ayuda: '[SUP] No hay cifra oficial; por defecto 10 %, como en el simulador.' },
      { k: 'metroSem', n: 'Semana en que empieza a operar', min: 1, max: 520, paso: 1, val: SUP_SIMS.METRO_SEM, unidad: 'semana', ayuda: 'Semana 114 en data3d/metro_l1.js; la Empresa Metro anuncia 2028.' }, sArb] },
  { id: 8, n: 'Cierre de vía, hoy', corto: 'Cierre', base: 'A', pregunta: '¿Aguanta el abastecimiento de hoy medio año sin la Av. de las Américas?',
    desc: 'Hoy, con la Av. de las Américas cerrada 26 semanas desde la semana 104: las rutas desde Corabastos se alargan.', sliders: [sT0, sDur] },
  { id: 9, n: 'Cierre de vía con instituto', corto: 'Cierre + instituto', base: 'B', pregunta: '¿El instituto en Bavaria amortigua el cierre de la Av. de las Américas?',
    desc: 'Instituto en Bavaria, con la Av. de las Américas cerrada 26 semanas desde la semana 104.', sliders: [sT0, sDur, sCap] },
  { id: 10, n: 'Instituto + plazas de mercado en parques', corto: 'Instituto + plazas', base: 'B', pregunta: '¿Sumar plazoletas de mercado en parques al instituto reparte mejor la comida?',
    desc: 'Instituto en Bavaria y, además, las 9 plazoletas de mercado en parques grandes funcionan como nodos de abastecimiento, con su calendario y su capacidad.', sliders: [sCap, sComp, sArb] },
  { id: 11, n: 'Instituto + huertas', corto: 'Instituto + huertas', base: 'B', pregunta: '¿Más huertas con el instituto sostienen más fauna y más comida local?',
    desc: 'Instituto en Bavaria con los módulos de huertas de la red (cubiertas, colegios y parques) que se incorporan con su calendario y son hábitat.',
    sliders: [{ k: 'P1.rend', n: 'Rendimiento de las huertas', min: 1, max: 20, paso: 0.5, val: 6, unidad: 'kg/m²·año', ayuda: 'Producción por metro cuadrado de huerta.' },
      { k: 'P3.borde', n: 'Huertas junto al humedal', min: 0, max: 60, paso: 1, val: 20, unidad: 'huertas', ayuda: 'Presión de las huertas de parque sobre el humedal.' }, sArb] },
  { id: 12, n: 'Huertas en techos y balcones', corto: 'Techos', base: 'A', pregunta: '¿Los hogares que montan huertas hidropónicas en sus techos cambian la comida y la fauna?',
    desc: 'Hoy, más las huertas hidropónicas en cubiertas y balcones de la estrategia E8: se montan poco a poco (3 años) y las cubiertas se vuelven hábitat para polinizadores y aves.',
    sliders: [{ k: 'techosM2', n: 'Techos y balcones con huerta', min: 0, max: 150000, paso: 1000, val: SUP_SIMS.TECHOS_M2, unidad: 'm²', ayuda: '4,9 ha de techos y balcones en el modelo (P1.sup).' },
      { k: 'techosAnios', n: 'Años para montarlas', min: 1, max: 10, paso: 0.5, val: SUP_SIMS.TECHOS_SEM / 52, unidad: 'años', ayuda: 'Las cubiertas se abren de a poco; cada una es hábitat cuando le llega su turno (cuota).' },
      { k: 'P1.rend', n: 'Rendimiento de las huertas', min: 1, max: 20, paso: 0.5, val: 6, unidad: 'kg/m²·año', ayuda: 'Producción por metro cuadrado.' }] }
];

/* ---------- REGLAS DE GAME OVER: seis, iguales para las 12; cualquiera cumplida 4 semanas seguidas = game over ---------- */
export const REGLAS = [
  { k: 'fauna', n: 'Fauna', txt: 'quedan menos del 90 % de las especies de fauna presentes al inicio', umbral: 90, unidad: '% de las especies del inicio', semanas: 4,
    fuente: 'Steffen et al. 2015, Planetary boundaries (Science 347, doi 10.1126/science.1259855): límite de integridad de la biosfera = mantener el Biodiversity Intactness Index en 90 % o más (https://www.stockholmresilience.org/research/planetary-boundaries/quantitative-evolution-of-boundaries.html). [SUP] se aplica a la riqueza local de las 23 especies de la red: perder 3 = salir del límite.' },
  { k: 'habitat', n: 'Hábitat', txt: 'los parches ocupados (especie × parche) caen 30 % o más frente al inicio', umbral: 70, unidad: '% de la ocupación del inicio', semanas: 4,
    fuente: 'La regla de hábitat de data3d/sim_vida.js (caída de 30 %), aplicada a la ocupación de la metapoblación de Levins en vez de a la riqueza (que ya mide la regla de fauna). [SUP heredado de sim_vida.js]' },
  { k: 'abasto', n: 'Abastecimiento', txt: 'alguna zona recibe menos del 80 % de los alimentos que necesita', umbral: 80, unidad: '% de lo que necesita la zona peor servida', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js (0,4 kg/día de frescos por persona, OMS).' },
  { k: 'residuos', n: 'Residuos', txt: 'los orgánicos pendientes de tratamiento superan la capacidad de almacenamiento', umbral: 100, unidad: '% del almacenamiento', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js (3 días de contenedores y calle + 2 semanas de planta).' },
  { k: 'ruido', n: 'Ruido', txt: 'el ruido promedio de las calles sube 3 dB o más frente al inicio (el doble de energía sonora: el doble de tráfico)', umbral: 3, unidad: 'dB sobre el inicio', semanas: 4,
    fuente: 'OMS 2018, Environmental Noise Guidelines for the European Region: tráfico vial < 53 dB Lden (https://www.who.int/europe/publications/i/item/9789289053563). En el modelo HOY ya el 76 % de las celdas de vía supera 53 dB, así que ese nivel absoluto no puede ser game over (se reporta en callesOMS). Se usa el cambio: +3 dB = el doble de energía, el menor cambio perceptible en ruido ambiental (FHWA, Highway Traffic Noise: Analysis and Abatement Guidance 2011, https://www.fhwa.dot.gov/environment/noise/regulations_and_guidance/analysis_and_abatement_guidance/). [SUP] umbral de cambio y no de nivel.' },
  { k: 'trafico', n: 'Tráfico', txt: 'circulan 30 % más vehículos que hoy (índice de tráfico 1,30 o más)', umbral: 1.3, unidad: 'índice (1 = hoy)', semanas: 4,
    fuente: 'Plan de Movilidad Sostenible y Segura de Bogotá (2023): 77 % de los viajes en modos sostenibles en 2035; hoy ~70 % (Encuesta de Movilidad 2023, https://bogota.gov.co/mi-ciudad/movilidad/movilidad-en-bogota-asi-se-movilizan-los-capitalinos-segun-encuesta ; https://www.larepublica.co/economia/claudia-lopez-presento-el-nuevo-plan-de-movilidad-para-bogota-con-metas-a-2035-3741556). Los viajes no sostenibles deben pasar de 30 % a 23 % (× 0,77). [SUP] game over cuando el tráfico se aleja de hoy tanto como la meta pide bajar, en sentido contrario: 1 / 0,77 ≈ 1,30.' }
];
const VALOR = { fauna: (x) => x.fauna / Math.max(1, x.fauna0) * 100, habitat: (x) => x.pares / Math.max(1, x.pares0) * 100, abasto: (x) => x.comidaMin * 100,
  residuos: (x) => x.residuos * 100, ruido: (x) => x.ruidoDb - x.ruidoDb0, trafico: (x) => x.trafico };
const MALO = { fauna: (v) => v < 90, habitat: (v) => v <= 70, abasto: (v) => v < 80, residuos: (v) => v > 100, ruido: (v) => v >= 3, trafico: (v) => v >= 1.3 };
const MOTIVO_GO = { fauna: 'se perdió más del 10 % de las especies de fauna', habitat: 'la ocupación de los parches cayó 30 % o más', abasto: 'una zona recibió menos del 80 % de los alimentos',
  residuos: 'los orgánicos pendientes superaron el almacenamiento', ruido: 'el ruido de las calles subió 3 dB o más', trafico: 'el tráfico subió 30 % o más sobre hoy' };

/* ---------- datos ---------- */
let D = null, RED = null, PRE = null;
export const URL_DATOS = new URL('./simulaciones_datos.json', import.meta.url).href;
export async function cargarDatos(cargar) {
  if (D) return D;
  const get = cargar || ((u) => fetch(u).then(r => { if (!r.ok) throw new Error('simulaciones_datos.json ' + r.status); return r.json(); }));
  const J = await get(URL_DATOS);
  if (J.red.np !== NP) throw new Error('simulaciones_datos.json no corresponde a los parches de sim_red_datos.js (correr tools/simulaciones_datos.mjs)');
  RED = crearRed(J.red, V, PARCHES);
  // ruido: niveles de hoy (dB) por grupo, ordenados; flujo por grupo
  const Lc = Float32Array.from(J.ruido.cerca, v => v / 10), Ll = Float32Array.from(J.ruido.lejos, v => v / 10), media = (a) => { let s = 0; for (const v of a) s += v; return s / Math.max(1, a.length); };
  const fC = J.ruido.flujoCerca / (J.ruido.flujoCerca + J.ruido.flujoLejos);
  // atropellos: destino de un dispersante desde cada parche (núcleo normalizado) y supervivencia absoluta al cruzar con el tráfico de hoy
  const C = V.TRAFICO.C_ATROP, S0 = new Float32Array(NP * NP); for (let i = 0; i < NP * NP; i++) S0[i] = Math.exp(-C * (EXPO.cruce[i] || 0));
  const DEST = {}; for (const [g, K] of Object.entries(RED.KERN)) { const W = new Float32Array(NP * NP);
    for (let q = 0; q < NP; q++) { let s = 0; for (let p = 0; p < NP; p++) if (p !== q) s += K[q * NP + p]; for (let p = 0; p < NP; p++) W[q * NP + p] = p !== q && s > 0 ? K[q * NP + p] / s : 0; } DEST[g] = W; }
  // soporte ecológico por zona: peso e^(−d/300) de cada parche
  const WZ = new Float32Array(NZ * NP); for (let z = 0; z < NZ; z++) for (let p = 0; p < NP; p++) WZ[z * NP + p] = Math.exp(-Math.hypot(ZONAS[z][0] - PARCHES[p].x, ZONAS[z][1] - PARCHES[p].z) / SUP_SIMS.RADIO_ECO);
  const POLI = new Set(); for (const [a, b, t] of RED.ENL) if (t === 5 && RED.esFa(a) && RED.esFl(b)) POLI.add(RED.FI[a]); // polinizadores: visita floral / polinización (tipo 5 de biotica.json)
  /* interacciones locales: cada enlace de la red con al menos un extremo de fauna se «ancla» en la especie de fauna (si los dos son fauna, en el
     primero); cuenta 1 por cada parche donde el ancla está presente y el otro extremo está en el mismo parche o a su alcance de dispersión
     (ALC del grupo del ancla, la misma regla de los recursos de red_trofica.js). Enlaces flora–flora: parches donde están los dos. */
  const LOC = []; for (const [a, b] of RED.ENL) { const fa = RED.esFa(a), fb = RED.esFa(b), la = fa || RED.esFl(a), lb = fb || RED.esFl(b); if (!la || !lb) continue;
    if (fa) LOC.push([RED.FI[a], fb ? 0 : 1, (fb ? RED.FI[b] : RED.FLI[b]) * RED.W3, RED.ALC[RED.FAUNA[RED.FI[a]].grupo]]);
    else if (fb) LOC.push([RED.FI[b], 1, RED.FLI[a] * RED.W3, RED.ALC[RED.FAUNA[RED.FI[b]].grupo]]);
    else LOC.push([-1, RED.FLI[a] * RED.W3, RED.FLI[b] * RED.W3, null]); }
  const metroF = (red) => { const f = new Float32Array(NP).fill(1); for (const i of J.metro.cerca) f[i] = 1 - red; return { k: 'metro' + red + '_' + J.metro.radio, f }; };
  PRE = { LOC, Lc, Ll, mLc: media(Lc), mLl: media(Ll), nC: Lc.length, nL: Ll.length, fC, S0, DEST, WZ, POLI: [...POLI], metroF, PAR: J.PAR, metro: J.metro };
  D = J; return D;
}
const listo = () => { if (!D) throw new Error('simulaciones.js: falta await cargarDatos()'); };

/* ---------- crear ---------- */
const clonar = (o) => JSON.parse(JSON.stringify(o));
export function crear(id, semilla = 1, valores = {}) {
  listo(); const S = SIMS.find(x => x.id === id); if (!S) throw new Error('simulación ' + id + ' no existe');
  const val = {}; for (const sl of S.sliders) val[sl.k] = valores[sl.k] != null ? +valores[sl.k] : sl.val;
  const PAR = clonar(PRE.PAR); PAR.P1.cierres = SUP_SIMS.CIERRES_AL_AZAR;
  for (const [k, v] of Object.entries(val)) { const m = k.match(/^(P[123])\.(\w+)$/); if (m) PAR[m[1]][m[2]] = v; }
  const mod = { red: RED }; let metro = null;
  if (id === 5) mod.sinCora = Math.round(val.sinCora);
  if (id === 6) mod.desmonte = { lib: val.desmLib };
  if (id === 7) { const r = val.metroRed / 100; metro = { red: r, desde: Math.round(val.metroSem) }; mod.metro = { ...PRE.metroF(r), desde: metro.desde }; }
  if (id === 8 || id === 9) mod.cierre = { via: SUP_SIMS.CIERRE_VIA, t0: Math.round(val.cierreT0), dur: Math.round(val.cierreDur) };
  if (id === 10) mod.plazasNodo = true;
  if (id === 11) mod.huertasC = true;
  if (id === 12) mod.techos = { m2: val.techosM2, sem: Math.max(1, Math.round(val.techosAnios * V.AÑO)) };
  const s = V.crear(S.base, semilla, mod);
  const E = { id, semilla, val, PAR, s, metro, o: null, racha: Object.fromEntries(REGLAS.map(R => [R.k, 0])), go: null, ev: [], ind: null,
    prev: new Uint8Array(s.occ.length), ruido0: null, techos: mod.techos || null };
  E.red0 = interLocal(s); E.poli0 = paresPoli(s);
  return E;
}
const bits = (v) => { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; };
function interLocal(s) { // suma sobre parches de los enlaces cuyos dos extremos están ahí (o al alcance), ver PRE.LOC
  const O = s.red.ocM, M = s.red.flM, W3 = RED.W3; let n = 0;
  for (const [i, tb, yb, A] of PRE.LOC) {
    if (i < 0) { for (let w = 0; w < W3; w++) n += bits(M[tb + w] & M[yb + w]); continue; }
    const Y = tb ? M : O, xa = i * W3;
    for (let w = 0; w < W3; w++) { let m = O[xa + w]; while (m) { const bit = m & -m, p = (w << 5) + 31 - Math.clz32(bit); m ^= bit;
      if ((Y[yb] & A[p * W3]) | (Y[yb + 1] & A[p * W3 + 1]) | (Y[yb + 2] & A[p * W3 + 2])) n++; } } }
  return n; }
function paresPoli(s) { let n = 0; for (const i of PRE.POLI) for (let p = 0; p < NP; p++) n += s.occ[i * NP + p]; return n; }

/* ---------- una semana ---------- */
export function paso(E) {
  const s = E.s; E.prev.set(s.occ);
  E.o = V.paso(s, E.PAR); E.ind = null;
  // extinciones en toda Kennedy esta semana
  const NFA = RED.NFA, occ = s.occ, P = E.prev, ev = []; E.ev = ev;
  for (let i = 0; i < NFA; i++) { let antes = 0, ahora = 0; const b = i * NP; for (let p = 0; p < NP; p++) { antes |= P[b + p]; ahora |= occ[b + p]; }
    if (antes && !ahora) { let best = -1; for (let p = 0; p < NP; p++) if (P[b + p] && (best < 0 || PARCHES[p].ha > PARCHES[best].ha)) best = p;
      const F = RED.FAUNA[i], m = s.red.mot[b + best] || 5;
      ev.push({ sem: s.t + 1, especie: F.id, nombre: F.n, motivo: MOTIVOS[m], parche: PARCHES[best].id, x: PARCHES[best].x, z: PARCHES[best].z }); } }
  const x = ind(E);
  for (const R of REGLAS) { const v = VALOR[R.k](x); E.racha[R.k] = MALO[R.k](v) ? E.racha[R.k] + 1 : 0;
    if (!E.go && E.racha[R.k] >= R.semanas) E.go = { regla: R.k, sem: s.t + 1, motivo: MOTIVO_GO[R.k], valor: Math.round(v * 1000) / 1000 }; }
  return E;
}
export function gameOver(E) { return E.go; }

/* ---------- indicadores de la semana ---------- */
const sobre = (A, u) => { u -= 1e-4; let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] >= u) hi = m; else lo = m + 1; } return A.length - lo; }; // cuántos ≥ u (A ordenado; como las bandas del simulador: v < 65 es «moderado», 65 o más «ruidoso»)
export function ind(E) {
  if (E.ind) return E.ind; const s = E.s, o = E.o; if (!o) throw new Error('simulaciones.js: llamar paso() antes de ind()');
  const c = s.red.c, c0 = s.red.inicio, NFA = RED.NFA, occ = s.occ;
  // presencia por especie
  let aves = 0, poli = 0; const pres = new Uint8Array(NFA); for (let i = 0; i < NFA; i++) { let a = 0; for (let p = 0; p < NP; p++) a |= occ[i * NP + p]; pres[i] = a; if (a && RED.AVE[i]) aves++; }
  for (const i of PRE.POLI) if (pres[i]) poli++;
  // tráfico y ruido
  const V0 = o.trafico.V, mOn = E.metro && s.t >= E.metro.desde, fCer = mOn ? 1 - E.metro.red : 1;
  const trafico = V0 * (1 - (1 - fCer) * PRE.fC);
  const dL = 10 * Math.log10(V0), dC = 10 * Math.log10(V0 * fCer), n = PRE.nC + PRE.nL;
  const ruidoDb = ((PRE.mLc + dC) * PRE.nC + (PRE.mLl + dL) * PRE.nL) / n;
  if (E.ruido0 == null) E.ruido0 = PRE.mLc * PRE.nC / n + PRE.mLl * PRE.nL / n; // inicio = HOY (sin crecimiento ni metro)
  const callesRuidosas = (sobre(PRE.Lc, 65 - dC) + sobre(PRE.Ll, 65 - dL)) / n * 100, callesOMS = (sobre(PRE.Lc, 53 - dC) + sobre(PRE.Ll, 53 - dL)) / n * 100;
  // atropellos (índice [SUP], ver encabezado)
  let atrop = 0; const XQ = s.red.XQ;
  if (XQ) for (let i = 0; i < NFA; i++) { if (!RED.TER[i]) continue; const W = PRE.DEST[RED.FAUNA[i].grupo], b = i * NP;
    for (let q = 0; q < NP; q++) { if (!occ[b + q]) continue; for (let p = 0; p < NP; p++) { const w = W[q * NP + p]; if (w) atrop += w * (1 - XQ[p * NP + q] * PRE.S0[p * NP + q]); } } }
  // zonas
  const soporteEco = new Float32Array(NZ), comercio = new Float32Array(NZ), cora = new Float32Array(NZ), rP = new Float32Array(NP);
  for (let p = 0; p < NP; p++) { let k = 0; for (let i = 0; i < NFA; i++) k += occ[i * NP + p]; rP[p] = k / NFA; }
  for (let z = 0; z < NZ; z++) { let pr = 1; for (let p = 0; p < NP; p++) if (rP[p]) pr *= 1 - rP[p] * PRE.WZ[z * NP + p]; soporteEco[z] = 1 - pr;
    const compra = o.zRec[z] - o.zLoc[z], co = Math.max(0, compra - o.zRed[z]); comercio[z] = compra > 1e-6 ? Math.min(1, o.zRed[z] / compra) : 0; cora[z] = co; }
  const huertas = o.act + (E.techos ? E.techos.m2 * s.supF / SUP_SIMS.M2_HUERTA : 0);
  const sem = s.t + 1;
  return E.ind = { sem, año: sem / V.AÑO, fauna: c.esp, fauna0: c0.esp, flora: c.flora, flora0: c0.flora, red: interLocal(s), red0: E.red0, redTipos: c.red, redTipos0: c0.red, pares: c.pares, pares0: c0.pares,
    aves, poliniz: paresPoli(s), poliniz0: E.poli0, polinizEsp: poli, trafico, ruidoDb, ruidoDb0: E.ruido0, callesRuidosas, callesOMS, atropellos: atrop, comidaMin: o.zMin, residuos: o.pend / Math.max(1, o.alm),
    huertas, bodegas: s.cora.ap.length, cierre: o.cierre, zonas: { soporteEco, comercio, cora }, extinciones: E.ev };
}
export { MOTIVOS };
