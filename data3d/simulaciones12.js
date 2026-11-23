/* ============ LAS 12 SIMULACIONES · módulo ES para el navegador y para node ============
   Reúne el modelo semanal data3d/sim_vida.js (abastecimiento por zona, residuos orgánicos, hábitat de Levins) con la red trófica compartida
   data3d/red_trofica.js (23 especies de fauna × 71 de flora × enlaces de la red) y los modificadores de la instalación
   (tools/escenarios_instalacion.mjs), y añade ruido, tráfico, atropellos, eventos de extinción y SEIS reglas de game over iguales para las 12.
   Sin DOM ni fs: los datos pesados vienen precalculados en data3d/simulaciones_datos.json (tools/simulaciones_datos.mjs) y se cargan con
   cargarDatos(cargar). Todo es determinista con la semilla. HORIZONTE: SEMANAS_FIN = 1040 semanas = 20 años de 52 semanas (antes 520 = 10 años),
   en tres FASES (corto plazo años 1–5, mediano 6–10, largo 11–20). Semana 0 = hoy (nov-2026).
   Regla del proyecto: nada inventado; todo supuesto va marcado [SUP] con su porqué; cifras con su fuente.

   USO:
     import * as S from './data3d/simulaciones12.js';
     await S.cargarDatos(url => fetch(url).then(r => r.json()));       // en node: url => JSON.parse(readFileSync(fileURLToPath(url)))
     const e = S.crear(7, 1, { metroRed: 10 }); for (let i = 0; i < S.SEMANAS_FIN; i++) { S.paso(e); const x = S.ind(e); const go = S.gameOver(e); }

   20 AÑOS · qué pasa después de la semana 520 (revisado): el tráfico sigue creciendo año a año (carros +1,5 %/año compuesto, sim_vida.js: V = 1,23
   en el año 20); el metro (semana 114), el cierre de Corabastos (52), el cierre de vía (104–129), los techos (3 años), el montaje de B y C
   (calendario de mercados_red.js, 3 años de superficies) y el desmonte de bodegas (una fase cada 13 semanas como mucho) ocurren dentro de
   los primeros años y después el modelo sigue con su dinámica; el plan parcial (D) termina su obra en el año 10 (las 10 etapas del decreto)
   y del año 11 al 20 el predio queda construido y habitado. Los deslizadores de semana llegan hasta la 1040.

   NUEVO (2026-11-23):
   · congestion (%) y tiempo10km (min): CALIBRADOS CON EL TOMTOM TRAFFIC INDEX (ver TOMTOM abajo). congestion = tiempo extra de viaje frente a flujo libre,
     como lo define TomTom. Semana 0 = la cifra publicada de Bogotá (2025: 69,9 %, 31 min 45 s por 10 km). Crece con la curva BPR:
     congestion = C₀·trafico⁴ (Bureau of Public Roads 1964, exponente 4, el estándar de asignación de tráfico).
   · predio: el predio del Plan Parcial Fábrica Bavaria (sim. 4) o el instituto en Bavaria (sims. 2, 9, 10, 11); null en las demás. Ver PREDIO abajo.
   · eventos: avisos NUEVOS de la semana para la interfaz (casi siempre vacío). Ver AVISOS abajo.
   · basura {total_t_dia, puntos[{x,z,t_dia,fuente}], acumulada, acumulada0, sinRecoger_t_dia}, ratas / ratas0, humedalHa / humedalHa0: ver BASURA abajo.
   · cierre (sims. 8 y 9) {via, sem, dur, on, fase 0–1, vias_desvio[{id,n}], traficoDesvio, ruidoExtraDb}: ver CIERRE GRADUAL abajo.
   · presion y recuperacion (0–1) para las láminas 3D; comidaLocal (% de la gente que comería de las huertas); ref (referencia del año 1, ver REF).
   · humedalFuncional (% del área funcional de hoy), humedales [{id, nombre, x, z, ha, ha0, calidad}], arboles / arbolesPerdidos, basura.puntos con fuente 'humedal'
     (bordes de El Burro, La Vaca y Techo) y acumulada por punto, basura.fraccionSinRecoger, basura.captura; regla de game over nueva «humedal»; la regla «habitat»
     se compara con el año 1 (ver REGLAS y ESTADO ACTUAL QUE SE DEGRADA).
   · SIMS[i].grupo ('actual' | 'propuesta') y preguntas «¿Qué pasaría si …?»; 5 a 7 deslizadores por simulación (EXTRA_SL).

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
import { crearRed, MOTIVOS } from './red_trofica.js?v=2';
import { ZONAS, PARCHES, CIERRES, BODEGAS, MERCADOS } from './sim_red_datos.js?v=2';
import { EXPO } from './exposicion_trafico.js?v=1';
import { PLAN_BAV } from './plan_bavaria_datos.js?v=2'; // la misma instancia que usa sim_vida.js

const NZ = ZONAS.length, NP = PARCHES.length;
export const ZONAS_XZ = ZONAS.map(z => [z[0], z[1]]); // centro de cada zona de 500 m, marco MUNDO del simulador (x este, z sur)
export const SEMANAS_FIN = 1040; // 20 años de 52 semanas
export const SEMANAS = SEMANAS_FIN; // nombre anterior (compatibilidad)
export const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];

/* ---------- TOMTOM: calibración de la congestión ----------
   TomTom Traffic Index, Bogotá, año 2025 (publicado el 30-ene-2026): nivel de congestión 69,9 %, 31 min 45 s para recorrer 10 km, séptima ciudad
   más congestionada del mundo, 153 horas perdidas en hora pico; +7,7 puntos frente a 2024 (≈ 62,2 %) y casi dos minutos más por 10 km
   (2024: 29 min 23 s según Portafolio; 2023: 25 min 30 s, puesto 19 de 387).
     https://www.tomtom.com/traffic-index/bogota-traffic/
     https://www.portafolio.co/economia/regiones/bogota-cada-ano-con-un-trafico-que-sigue-empeorando-nivel-de-congestion-en-la-ciudad-crecio-7-7-en-487350
     https://www.elcarrocolombiano.com/movilidad/bogotanos-pierden-cinco-dias-al-ano-en-el-trafico-segun-indice-tomtom-2023/
   No se usa la API de TomTom (no hay llave): solo las cifras publicadas.
   · congestión de TomTom = tiempo de viaje / tiempo en flujo libre − 1  →  flujo libre = 31,75 / 1,699 = 18,7 min por 10 km.
   · curva BPR: tiempo / flujo libre = 1 + α·(v/c)^β, β = 4 (Bureau of Public Roads 1964, Traffic Assignment Manual). La congestión es entonces
     proporcional a (v/c)^4 y, con la capacidad vial fija, a trafico^4: congestion = 69,9 %·trafico⁴. [SUP] la capacidad vial no cambia en 20 años
     (ninguna vía nueva en el modelo salvo las internas del plan parcial) y el índice de tráfico del modelo representa la demanda vehicular de Bogotá.
   · tendencia: con el crecimiento del parque de sim_vida.js (+1,5 %/año los carros) el modelo da +3 puntos de congestión el primer año; TomTom midió
     +7,7 puntos en 2025 y +6 %/año en tiempo por 10 km entre 2023 y 2025, años con las obras del metro y de las troncales (Av. 68, Calle 13) que
     quitan capacidad. [SUP] el modelo no suma ese efecto de obra: es la proyección CONSERVADORA (sin obras); se reporta la diferencia. */
export const TOMTOM = { anio: 2025, congestion: 69.9, min10km: 31.75, libre: 31.75 / 1.699, beta: 4, prevAnio: 2024, prevCongestion: 62.2,
  fuentes: ['https://www.tomtom.com/traffic-index/bogota-traffic/',
    'https://www.portafolio.co/economia/regiones/bogota-cada-ano-con-un-trafico-que-sigue-empeorando-nivel-de-congestion-en-la-ciudad-crecio-7-7-en-487350'] };

/* ---------- PREDIO del Plan Parcial Fábrica Bavaria (sim. 4) e instituto en Bavaria (sims. 2, 9, 10, 11) ----------
   Datos del plan (Decreto Distrital 448 de 2023): data3d/plan_bavaria_datos.js (viviendas por año 1–10, 14.002 en total; 2,76 personas por hogar;
   0,31 autos por hogar) y data3d/plan_bavaria.json, resumido por tools/predio_bavaria_datos.mjs en PREDIO_PLAN (tramos de calzada que se abren
   cada año, m² de comercio que abren cada año, distancia de cada parche cercano a la calzada abierta más cercana).
   VIAJES (vehículos que entran o salen del predio por día, por las vías nuevas):
   · vivienda: viviendas terminadas × 0,31 autos × VIAJES_AUTO viajes por día × (1 + EXTRA_VIV).
   · comercio: m² de comercio abiertos × VIAJES_COM.
   · obra: viviendas de la etapa en curso × CAMIONES_VIV camiones por día (solo mientras se construye; años 1–10).
   TRÁFICO alrededor del predio: Q₀ = flujo de la vía principal más cercana al bosque de Bavaria en la grabación SUMO (data3d/exposicion_trafico.js:
     10.291 veh/día) × índice de tráfico de Kennedy; en la ENTRADA más cargada predio.trafico = (Q₀·trafico + viajes nuevos / accesos) / Q₀ (deslizador
     planAccesos, 2 por defecto); trafico0 = 1. vehiculosDia = todos los viajes nuevos del predio.
   RUIDO en las entradas del predio: la fórmula del simulador (data3d/capas_escenario.js) para una vía principal, L = 74 dB + 10·log10(Q / 14.049),
     14.049 veh/día = mediana de las vías principales de la grabación (EXPO.medianaVia); un camión = 4 carros (capas_escenario.js). ruidoDb0 = hoy.
     Subir el flujo × k sube el ruido 10·log10(k) dB (regla de energía). Mientras hay obra, el frente de obra (OBRA_DB) también cuenta para la fauna.
   FAUNA (sale de las reglas del modelo, sin forzar):
   · NIDOS: la tala del plan (árboles del bosque de Bavaria que caen por etapa, data3d/plan_bavaria.json) ya baja la calidad del bosque en sim_vida.js
     y quita los nodos de flora talados de la red trófica (red_trofica.js): menos lugares de anidación y refugio.
   · RUIDO: cada vía nueva crea su zona de efecto con la misma regla de las vías de hoy (sim_vida.js, Reijnen y Foppen 1997: distancia de efecto
     ∝ Q^0,4, 300 m con el flujo mediano de hoy; 25 % menos densidad de aves dentro). Flujo de la vía nueva más cargada = S_VIA × viajes nuevos.
     Fracción de cada parche cercano dentro de esa zona (círculo del área del parche, distancia a la calzada abierta más cercana); el factor extra
     (1 − 0,25·máx(f_nueva, f_hoy)) / (1 − 0,25·f_hoy) multiplica la calidad del parche para las aves (s.red.xAve, red_trofica.js).
   · especiesFuera: especies cuya ocupación de los parches del predio (a PREDIO_RADIO m o menos del centro) es menor que al inicio; causa = 'ruido'
     si es ave y el factor de ruido de alguno de sus parches iniciales bajó 10 % o más, 'nidos' si estaba en el bosque de Bavaria y ya se taló 10 %
     o más de sus árboles, 'ambas' si las dos. Las salidas sin ninguna de esas causas (azar demográfico) no se listan.
   INSTITUTO (B): no hay viviendas ni vías nuevas; los camiones del acopio: lo que reparte Bavaria (kg/semana) / 7 / CARGA_CAMION × 4 (la carga
     entra y sale, y cada camión va y vuelve). La huerta central de B es hábitat desde que monta 20 % de sus superficies (sim_vida.js). */
export const PREDIO_SUP = {
  VIAJES_AUTO: 2,      // [SUP] cada auto sale y vuelve una vez al día (ida y vuelta = 2 movimientos en las entradas)
  EXTRA_VIV: 0.3,      // [SUP] +30 % por taxis, domicilios, visitas y motos de los hogares nuevos (sin cifra por hogar en la Encuesta de Movilidad 2023)
  VIAJES_COM: 0.06,    // [SUP] viajes en vehículo por m² de comercio y día: ITE Trip Generation (centro comercial, ~0,4 viajes/m²·día en EE. UU.) × 15 %
                       //       (participación del auto en Bogotá, Encuesta de Movilidad 2023, ~13–15 %)
  CAMIONES_VIV: 0.07,  // [SUP] movimientos de camión por vivienda en obra y día: ~70 m² por vivienda × ~1 m³ de concreto y material por m², 8 m³ por viaje,
                       //       250 días hábiles al año = 0,035 viajes, ida y vuelta = 0,07
  CAMION_EQ: 4,        // un camión suena como 4 carros (la regla de data3d/capas_escenario.js)
  S_VIA: 0.5,          // [SUP] la vía nueva más cargada lleva la mitad de los viajes (dos accesos principales en el plano del decreto)
  L_PRINCIPAL: 74,     // dB de una vía principal con el flujo mediano (LREF de capas_escenario.js)
  CARGA_CAMION: 8000,  // [SUP] kg por camión del acopio de Bavaria
  PREDIO_RADIO: 1000,  // m: parches «del predio o junto a él» (centro del predio, data3d/plan_bavaria_datos.js)
  OBRA_DB: 80,         // dB(A) a 15 m de un frente de obra: FHWA Roadway Construction Noise Model (2006), excavadora 81, mezcladora 79, volqueta 76 dB(A) a 50 ft
                       //   (https://www.fhwa.dot.gov/environment/noise/construction_noise/rcnm/). Para la zona de efecto se pasa a flujo equivalente de vía
                       //   principal: 14.049·10^((80 − 74)/10) ≈ 56.000 veh/día, mientras haya obra.
  OBRA_VIV: 1000       // [SUP] el frente de obra completo corresponde a 1.000 viviendas en obra o más en el año (menos viviendas, frente proporcional)
};
// generado por tools/predio_bavaria_datos.mjs (índice = año del plan − 1)
const PREDIO_PLAN = { vias: [9, 8, 14, 15, 8, 7, 7, 7, 1, 4], com: [0, 0, 49456, 0, 0, 42208, 0, 0, 0, 0],
  dist: { bosqueBav: [11, 11, 11, 11, 11, 11, 11, 11, 11, 11], pq6: [747, 709, 709, 709, 709, 709, 709, 709, 709, 709], pq17: [634, 634, 546, 533, 439, 359, 359, 359, 359, 359],
    cu8: [250, 185, 184, 184, 184, 184, 184, 184, 184, 184], hp1: [479, 414, 336, 336, 213, 128, 128, 128, 128, 128], hp14: [622, 596, 584, 584, 368, 368, 368, 368, 368, 368],
    huertaBav: [61, 41, 14, 14, 14, 14, 14, 14, 14, 14] }, haPredio: 69.3 };
const PI_BOSQUE = PARCHES.findIndex(p => p.id === 'bosqueBav');
const PRED_P = PARCHES.map((p, i) => [i, Math.hypot(p.x - PLAN_BAV.CENTRO[0], p.z - PLAN_BAV.CENTRO[1])]).filter(a => a[1] <= PREDIO_SUP.PREDIO_RADIO).map(a => a[0]);
const RP_M = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI)); // radio del círculo con el área del parche (como sim_vida.js)
const Q0_PREDIO = EXPO.parches[PI_BOSQUE] ? EXPO.parches[PI_BOSQUE][1] : EXPO.medianaVia;
const dBvia = (Q) => PREDIO_SUP.L_PRINCIPAL + 10 * Math.log10(Math.max(1, Q) / EXPO.medianaVia);
const cl01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const fZonaP = (d, r, D) => cl01((D - (d - r)) / (2 * r));

/* ---------- BASURA: Corabastos, mercado de flores y vivienda alrededor ----------
   Generación (t/día):
   · Corabastos: CORA_T = 100 t/día (contextoganadero.com: «diariamente salen 100 toneladas de residuos», 65 % orgánico; el Observatorio Ambiental
     de Bogotá da 50,9 t/día solo de residuos vegetales: https://oab2.ambientebogota.gov.co/documents/10184/506375/Gesti%C3%B3n+de+los+residuos+org%C3%A1nicos+en+las+plazas+de+mercado+de+Bogot%C3%A1.pdf).
     Se escala con lo que mueve Corabastos (dependencia de Corabastos de sim_vida.js frente a la semana 1): si la red o el instituto le quitan
     carga, o Corabastos cierra (sim. 5), genera menos.
   · mercado de flores junto a Corabastos: FLORES_T = 5 t/día [SUP: no se encontró cifra; flores y follaje que no se venden]. Posición aproximada [SUP].
   · vivienda: KG_HAB = 0,72 kg/persona·día = 5.680 t/día del servicio ordinario de Bogotá (UAESP, abril 2026: https://bogota.gov.co/mi-ciudad/habitat/aumenta-la-produccion-de-residuos-solidos-en-bogota-segun-uaesp)
     / 7,9 millones de habitantes. Puntos = zonas de 500 m con centro a RADIO m o menos de Corabastos; total_t_dia suma toda Kennedy.
   · crecimiento: 2,7 %/año (UAESP: +5,5 % en el relleno Doña Juana entre 2024 y 2026). Deslizador basuraCrece.
   SIN RECOGER: 1 − recolección; recolección por defecto 84 % = 5.680 / (5.680 + 1.089 t/día en puntos críticos y arrojo clandestino, UAESP 2026).
     En B y C la fracción orgánica que separa la red (sep / gen de sim_vida.js × 55 % orgánico [SUP, caracterización típica de Bogotá]) ya no queda en la calle.
   ACUMULADA (t): cada punto acumula lo que no se recoge y la limpieza de puntos críticos retira LIMPIEZA = 1/8 por semana [SUP: un punto crítico dura
     unas 5–6 semanas]. Arranca en equilibrio con la generación de hoy (acumulada0).
   EFECTOS (salen del modelo, parámetros [SUP]):
   · ratas = acumulada / acumulada0 (índice, 1 = hoy) y el hábitat de la rata en la red trófica se multiplica por ese índice (s.red.fRata).
   · aves cerca de Corabastos: la calidad para las aves de los parches a 1.000 m o menos se divide por 1 + AVE_RATA·(ratas − 1)·e^(−d/500)
     [SUP AVE_RATA = 0,5: las ratas depredan nidos y la basura espanta aves; no se encontró una relación dosis-efecto].
   · humedales: cada humedal pierde área por relleno con basura al ritmo HA_T × Σ (t/día sin recoger de cada punto × e^(−d/500)) por semana
     [SUP HA_T = 3,3·10⁻⁵ ha por semana por t/día: con el estado actual el humedal La Vaca pierde ~1 ha en 20 años; no hay tasa medida]. El área perdida
     baja el hábitat de todas las especies del humedal como √(área / área inicial) (s.red.xH; la misma dependencia con √área de sim_vida.js).
     humedalHa suma el borde restaurado de La Vaca (desmonte de bodegas) cuando existe. */
export const BASURA_SUP = { CORA_T: 100, FLORES_T: 5, KG_HAB: 0.72, CRECE: 0.027, RECOLECCION: 0.84, LIMPIEZA: 1 / 8, RADIO: 1500, ORGANICO: 0.55, AVE_RATA: 0.5, HA_T: 3.3e-5, D_EXP: 500,
  ARROJO_EXTRA: 0.032, HUM_T: 7, K_CONT: 0.35, TALA_URB: 0.005 };
/* ESTADO ACTUAL QUE SE DEGRADA (2026-11-23):
   · arrojo clandestino que crece más rápido que la basura: 968 t/día arrojadas a la calle (UAESP citada por El Tiempo,
     https://www.eltiempo.com/bogota/en-bogota-tiran-968-toneladas-de-basura-a-las-calles-todos-los-dias-uaesp-reporta-un-aumento-del-19-en-el-arrojo-clandestino-de-desechos-3521912 ,
     con +19 % de arrojo clandestino) → 1.089 t/día en puntos críticos y arrojo (UAESP, abril 2026): ≈ +6 %/año frente a +2,7 %/año de la basura →
     la fracción sin recoger crece ARROJO_EXTRA = 1,06 / 1,027 − 1 ≈ 3,2 %/año [SUP: dos años entre las dos cifras].
   · basura en los bordes de los humedales (puntos fuente 'humedal'): HUM_T = 7 t/día hoy repartidas entre El Burro, La Vaca y Techo según √área
     [SUP: ~5 % de lo que Kennedy arroja en puntos críticos, 1.089 t/día × 13 % (población de Kennedy en Bogotá)]; crece con el arrojo clandestino.
     La basura acumulada en el borde baja la calidad del humedal para toda su fauna como 1 / (1 + K_CONT·(acumulada / acumulada de hoy − 1))
     [SUP K_CONT = 0,35: no hay relación dosis-efecto publicada; con él el estado actual pierde ~30 % del área funcional hacia los años 12–14].
     Área funcional = Σ área × calidad / Σ área de hoy (+ el borde restaurado de La Vaca cuando existe): regla de game over «humedal».
   · la red de la propuesta (B y C: mercados y Bavaria Común con compost) recoge la fracción orgánica (55 %) de lo que antes se arrojaba, en
     proporción a los nodos abiertos (calendario de mercados_red.js) [SUP]; los techos (sim. 12) compostan en casa solo los orgánicos de los hogares con huerta (≈ 0,3 % de Kennedy: casi no cambia el arrojo).
   · árboles: TALA_URB = 0,5 %/año menos árboles en los parques del estado actual [SUP: en 2024 se autorizaron 4.390 intervenciones de árboles por
     riesgo y se cayeron 609 (https://bogota.gov.co/mi-ciudad/ambiente/emergencias-por-arboles-atendidas-en-bogota-balance-durante-de-2024), ~0,2–0,3 % de
     ~1,5 millones; las compensaciones se siembran sobre todo fuera de la localidad, en Usme y Sumapaz (U. Nacional, vía Radio Nacional 2025:
     https://radionacional.co/actualidad/medio-ambiente/preocupante-deficit-de-arboles-en-la-capital-del-pais), y Kennedy tiene obras del metro, Av. 68 y
     Primero de Mayo]. En las simulaciones de la propuesta (B, C, techos) la tala se compensa dentro de Kennedy (módulos con árboles nativos) [SUP]. */

/* ---------- CIERRE GRADUAL Y DESVÍOS (sims. 8 y 9) ----------
   El cierre de sim_vida.js corta la vía de una vez para el abastecimiento. Aquí se agrega la OBRA por fases: [SUP] los carriles se cierran en 3 fases
   iguales durante el primer 30 % del cierre (fase 1/3, 2/3, 1) y se reabren en 3 fases durante el último 20 %. El tráfico de la vía cerrada se
   reparte entre las vías principales paralelas a 2,5 km o menos (tools/cierre_desvios_datos.mjs, OpenStreetMap): para la Av. de las Américas,
   Av. Primero de Mayo y Av. Calle 6. traficoDesvio = 1 + DESV·fase [SUP DESV = 0,5: dos paralelas de capacidad parecida reciben la mitad del flujo
   cada una]; ruidoExtraDb = 10·log10(traficoDesvio). Fauna: cada parche a 600 m o menos de una vía de desvío recibe la zona de efecto de su tráfico
   (la regla de sim_vida.js, distancia ∝ Q^0,4, 25 % menos aves dentro). */
export const DESVIO_SUP = { DESV: 0.5, SUBE: 0.3, BAJA: 0.2, RADIO: 600 };
// generado por tools/cierre_desvios_datos.mjs: distancia (m) de cada parche (orden de sim_red_datos.js) a cada vía
const DESVIOS = { americas: { n: 'Av. de las Américas', desvio: ['mayo', 'calle6'] },
  vias: { mayo: { n: 'Av. Primero de Mayo', dist: [2458, 1484, 2857, 2413, 3075, 4699, 618, 1008, 1003, 1976, 3261, 1556, 2914, 4812, 2829, 1666, 2771, 894, 413, 3335, 2860, 3907, 1913, 2397, 271, 342, 204, 947, 2201, 2900, 2422, 1660, 2869, 2016, 3614, 2472, 3499, 940, 2174, 299, 924, 3119, 3712, 1189, 2968, 113, 395, 558, 593, 3182, 2835, 4283, 1052, 3707, 4073, 372, 1492, 283, 3789, 643, 2408, 3323, 4086, 3012, 1471, 1046, 126, 370, 675, 2467, 1474] },
    calle6: { n: 'Av. Calle 6', dist: [1026, 1572, 1543, 988, 3839, 3293, 823, 1686, 3113, 223, 4647, 293, 1558, 3417, 1515, 338, 4344, 1379, 1901, 3347, 1536, 2412, 526, 1077, 2931, 3484, 1073, 2478, 665, 1464, 693, 135, 1556, 685, 2289, 1138, 2186, 889, 764, 955, 433, 1687, 2294, 642, 1606, 1876, 1848, 1149, 1961, 2123, 1945, 2884, 1535, 2582, 2817, 2244, 2082, 2483, 3228, 2530, 2919, 3340, 3615, 3295, 3232, 3199, 3234, 3597, 3876, 1025, 1435] } } };
if (DESVIOS.vias.mayo.dist.length !== NP) throw new Error('DESVIOS no corresponde a los parches de sim_red_datos.js (correr tools/cierre_desvios_datos.mjs)');

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
const sT0 = { k: 'cierreT0', n: 'Semana en que se cierra la vía', min: 1, max: 1000, paso: 1, val: SUP_SIMS.CIERRE_T0, unidad: 'semana', ayuda: 'Cierre forzado de la Av. de las Américas.' };
const sDur = { k: 'cierreDur', n: 'Duración del cierre', min: 1, max: 104, paso: 1, val: SUP_SIMS.CIERRE_DUR, unidad: 'semanas', ayuda: 'Las rutas que pasan por la vía se alargan: llega menos comida y se recogen menos orgánicos.' };
export const SIMS = [
  { id: 1, n: 'Estado actual', corto: 'Estado actual', base: 'A', pregunta: '¿Aguanta Kennedy veinte años si todo sigue como hoy?',
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
    sliders: [{ k: 'sinCora', n: 'Semana en que cierra Corabastos', min: 1, max: 1040, paso: 1, val: SUP_SIMS.SIN_CORA, unidad: 'semana', ayuda: 'Desde esa semana la capacidad de Corabastos es 0, sin reemplazo.' }, sArb] },
  { id: 6, n: 'Corabastos se reduce y se restaura el borde de La Vaca', corto: 'Borde La Vaca', base: 'A', pregunta: '¿Desmontar las bodegas junto al humedal La Vaca devuelve fauna?',
    desc: 'Hoy, pero las bodegas de Corabastos junto al humedal La Vaca se desmontan con el calendario de B y C y el borde se restaura y madura en tres años. El abastecimiento no cambia.',
    sliders: [{ k: 'desmLib', n: 'Carga liberada de Corabastos', min: 0, max: 1, paso: 0.05, val: SUP_SIMS.DESM_LIB, unidad: '0–1', ayuda: 'Fracción del espacio de bodega que deja de usarse; decide cuántas bodegas se desmontan.' }, sRec, sArb] },
  { id: 7, n: 'Metro Línea 1', corto: 'Metro', base: 'A', pregunta: '¿Menos carros cerca del metro alivian el ruido y la fauna?',
    desc: 'Hoy más la Línea 1 del metro en operación desde la semana 114. Cerca del corredor (800 m) circulan menos vehículos [SUP 10 %, sin cifra oficial].',
    sliders: [{ k: 'metroRed', n: 'Menos vehículos cerca del metro', min: 0, max: 50, paso: 1, val: SUP_SIMS.METRO_RED * 100, unidad: '%', ayuda: '[SUP] No hay cifra oficial; por defecto 10 %, como en el simulador.' },
      { k: 'metroSem', n: 'Semana en que empieza a operar', min: 1, max: 1040, paso: 1, val: SUP_SIMS.METRO_SEM, unidad: 'semana', ayuda: 'Semana 114 en data3d/metro_l1.js; la Empresa Metro anuncia 2028.' }, sArb] },
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
  { id: 12, n: 'Huertas en techos y balcones', corto: 'Techos', base: 'A', pregunta: '¿Qué pasaría si los hogares montan huertas en sus techos y balcones, con Bavaria Común enseñando compostaje y gestión de residuos?',
    desc: 'Huertas hidropónicas en cubiertas y balcones (estrategia E8) que se montan poco a poco (3 años) y se vuelven hábitat para polinizadores y aves, con Bavaria Común como instituto de tecnologías convergentes: enseña compostaje y abre puntos de compostaje y gestión de residuos que recogen los orgánicos.',
    sliders: [{ k: 'techosM2', n: 'Techos y balcones con huerta', min: 0, max: 150000, paso: 1000, val: SUP_SIMS.TECHOS_M2, unidad: 'm²', ayuda: '4,9 ha de techos y balcones en el modelo (P1.sup).' },
      { k: 'techosAnios', n: 'Años para montarlas', min: 1, max: 20, paso: 0.5, val: SUP_SIMS.TECHOS_SEM / 52, unidad: 'años', ayuda: 'Las cubiertas se abren de a poco; cada una es hábitat cuando le llega su turno (cuota).' },
      { k: 'P1.rend', n: 'Rendimiento de las huertas', min: 1, max: 20, paso: 0.5, val: 6, unidad: 'kg/m²·año', ayuda: 'Producción por metro cuadrado.' }] }
];

/* ---------- deslizadores agregados (2026-11-23): cada simulación queda con 5 o 6. Por defecto = el comportamiento de antes. ----------
   · trafCrece: crecimiento anual de los carros (V = 0,70·carros + 0,22·motos + 0,08·camiones, sim_vida.js). Por defecto 1,5 %/año (Registro Distrital
     Automotor 2020–2024, sim_vida.js); con él la congestión calibrada con TomTom (69,9 % en 2025) sube ~3 puntos el primer año. Mueve el índice de
     tráfico, la congestión, el ruido y la fauna (zona de efecto de las vías y atropellos, por el gancho por parche de sim_vida.js).
   · pobCrece: crecimiento anual de la población de Kennedy (expansión y densificación): más comida necesaria, más orgánicos y, [SUP] más carros en la
     misma proporción. Por defecto 0 %/año (P1.crece = false en sim_modelos.js, como antes).
   · mitiga: % de calles con pacificación (30 km/h) y barreras verdes. [SUP] −3 dB en esas calles (bajar de 50 a 30 km/h baja 2–3 dB el ruido de
     rodadura: EEA, Good practice guide on noise exposure and potential health effects, 2010; https://www.eea.europa.eu/publications/eea_technical_report_2010_11);
     para la fauna equivale a la mitad de energía sonora (−3 dB) en la zona de efecto. Por defecto 0 %.
   · P1.sup: superficie de huertas de la red (m², sim_modelos.js, 9,8 ha). · planViv, planAutos, planAccesos: viviendas del plan parcial (14.002 en el
     decreto; las etapas se escalan), autos (cupos de parqueo) por vivienda (0,31 = autos por hogar, Encuesta de Movilidad 2023) y accesos viales nuevos
     al predio (la vía más cargada lleva 1/accesos de los viajes). */
const sTraf = { k: 'trafCrece', n: 'Crecimiento anual del tráfico', min: 0, max: 3, paso: 0.1, val: 1.5, unidad: '%/año', ayuda: 'Carros nuevos cada año. 1,5 % = el parque automotor de Bogotá 2020–2024; la congestión parte del TomTom Traffic Index 2025 (69,9 %).' };
const sPob = { k: 'pobCrece', n: 'Crecimiento de la población', min: -1, max: 3, paso: 0.1, val: 0, unidad: '%/año', ayuda: 'Expansión y densificación de Kennedy: más comida necesaria, más orgánicos y más carros.' };
const sRuido = { k: 'mitiga', n: 'Calles pacificadas y con barreras verdes', min: 0, max: 100, paso: 5, val: 0, unidad: '%', ayuda: 'Calles a 30 km/h y con franjas verdes: unos 3 dB menos en ellas; menos ruido para las aves.' };
const sSup = { k: 'P1.sup', n: 'Superficie de huertas de la red', min: 0, max: 300000, paso: 2000, val: 98000, unidad: 'm²', ayuda: 'Cubiertas, colegios, parques y Bavaria que se vuelven huerta (9,8 ha en el modelo).' };
const EXTRA_SL = {
  1: [sTraf, sPob, sRuido], 2: [sSup, sTraf], 3: [sSup, sTraf],
  4: [{ k: 'planViv', n: 'Viviendas del plan parcial', min: 0, max: 21000, paso: 500, val: PLAN_BAV.VIV_ETAPA.reduce((a, v) => a + v, 0), unidad: 'viviendas', ayuda: 'Decreto 448 de 2023: 14.002 viviendas en 10 etapas (se escalan todas las etapas).' },
    { k: 'planAutos', n: 'Parqueaderos por vivienda', min: 0, max: 1.5, paso: 0.05, val: PLAN_BAV.AUTOS_HOG, unidad: 'autos/vivienda', ayuda: 'Cupos de parqueo = autos de los hogares nuevos (0,31 autos por hogar en Bogotá, Encuesta de Movilidad 2023).' },
    { k: 'planAccesos', n: 'Accesos viales nuevos al predio', min: 1, max: 6, paso: 1, val: 2, unidad: 'accesos', ayuda: 'Más accesos reparten los carros: la vía más cargada junto al bosque lleva menos tráfico y menos ruido.' }, sTraf],
  5: [sPob, sTraf, sRuido], 6: [sTraf, sRuido], 7: [sTraf, sRuido], 8: [sTraf, sPob, sArb], 9: [sTraf, sSup], 10: [sSup, sTraf], 11: [sSup, sTraf], 12: [sArb, sRuido] };
/* basura (ver BASURA abajo): crecimiento anual de los residuos y eficiencia de la recolección */
const sBas = { k: 'basuraCrece', n: 'Crecimiento anual de la basura', min: 0, max: 6, paso: 0.1, val: 2.7, unidad: '%/año', ayuda: 'UAESP: los residuos de Bogotá subieron 5,5 % entre 2024 y 2026 (≈ 2,7 %/año). Más basura sin recoger: más ratas, menos aves y humedales más pequeños.' };
const sRecol = { k: 'recoleccion', n: 'Recolección de la basura', min: 50, max: 100, paso: 1, val: 84, unidad: '%', ayuda: 'UAESP 2026: 5.680 t/día recogidas por el servicio y 1.089 t/día en puntos críticos y arrojo clandestino (16 % sin recoger).' };
for (const id of [1, 5, 6]) EXTRA_SL[id].push(sBas, sRecol);
for (const id of [2, 3, 7, 8, 9, 10, 11, 12]) EXTRA_SL[id].push(sRecol);
for (const S of SIMS) S.sliders.push(...(EXTRA_SL[S.id] || []));
/* grupo: 'actual' = Kennedy sin la propuesta de la tesis (incluye el plan parcial, que no es la propuesta); 'propuesta' = instituto / Bavaria Común,
   red de mercados, borde de La Vaca, huertas y techos. Preguntas en forma «¿Qué pasaría si …?». */
const GRUPO_PREG = {
  1: ['actual', '¿Qué pasaría si Kennedy sigue como está, sin ningún cambio, durante 20 años?'],
  2: ['propuesta', '¿Qué pasaría si un solo instituto en Bavaria (Bavaria Común) concentra el abasto, el compost y la formación de promotores?'],
  3: ['propuesta', '¿Qué pasaría si los mercados de barrio y las plazoletas forman una red que reparte la comida y el hábitat?'],
  4: ['actual', '¿Qué pasaría si se construye el Plan Parcial Fábrica Bavaria con sus 14.000 viviendas?'],
  5: ['actual', '¿Qué pasaría si Corabastos deja de abastecer y no hay una red que lo reemplace?'],
  6: ['propuesta', '¿Qué pasaría si se desmontan las bodegas de Corabastos junto al humedal La Vaca y se restaura su borde?'],
  7: ['actual', '¿Qué pasaría si la Línea 1 del metro saca carros de las calles cercanas?'],
  8: ['actual', '¿Qué pasaría si la Av. de las Américas se cierra medio año por obras, como está hoy Kennedy?'],
  9: ['propuesta', '¿Qué pasaría si la Av. de las Américas se cierra medio año pero ya funciona el instituto en Bavaria?'],
  10: ['propuesta', '¿Qué pasaría si, además del instituto, las plazoletas de mercado en los parques también reparten comida?'],
  11: ['propuesta', '¿Qué pasaría si el instituto se suma a los módulos de huertas en cubiertas, colegios y parques?'],
  12: ['propuesta', '¿Qué pasaría si los hogares montan huertas hidropónicas en sus techos y balcones?'] };
for (const S of SIMS) { S.grupo = GRUPO_PREG[S.id][0]; S.pregunta = GRUPO_PREG[S.id][1]; }
SIMS.find(S => S.id === 4).desc = 'Kennedy como hoy más las 14.000 viviendas del Plan Parcial Fábrica Bavaria (Decreto 448 de 2023) por etapas en 10 años: más gente, más carros por las vías nuevas, más ruido y se talan árboles del bosque de Bavaria.';
SIMS.find(S => S.id === 8).desc = 'Hoy, con la Av. de las Américas cerrándose por obra en fases desde la semana 104 durante 26 semanas: las rutas desde Corabastos se alargan y el tráfico se desvía por la Av. Primero de Mayo y la Av. Calle 6.';
export const MITIGA_DB = 3; // dB menos en las calles pacificadas (ver mitiga arriba) [SUP]

/* ---------- REGLAS DE GAME OVER: siete, iguales para las 12; cualquiera cumplida 4 semanas seguidas = game over ---------- */
export const REGLAS = [
  { k: 'fauna', n: 'Fauna', txt: 'quedan menos del 90 % de las especies de fauna presentes al inicio', umbral: 90, unidad: '% de las especies del inicio', semanas: 4,
    fuente: 'Steffen et al. 2015, Planetary boundaries (Science 347, doi 10.1126/science.1259855): límite de integridad de la biosfera = mantener el Biodiversity Intactness Index en 90 % o más (https://www.stockholmresilience.org/research/planetary-boundaries/quantitative-evolution-of-boundaries.html). [SUP] se aplica a la riqueza local de las 23 especies de la red: perder 3 = salir del límite.' },
  { k: 'habitat', n: 'Hábitat', txt: 'los parches ocupados (especie × parche) caen 30 % o más frente al año 1', umbral: 70, unidad: '% de la ocupación del año 1', semanas: 4,
    fuente: 'La regla de hábitat de data3d/sim_vida.js (caída de 30 %), aplicada a la ocupación de la metapoblación de Levins en vez de a la riqueza (que ya mide la regla de fauna). Se compara con la referencia del año 1 (semanas 40–52, REF) porque el estado inicial está por debajo del equilibrio del modelo; antes de la semana 52, con la semana 0. [SUP heredado de sim_vida.js]' },
  { k: 'humedal', n: 'Humedales', txt: 'el área funcional de los humedales (área que queda sin rellenar × calidad frente a la basura acumulada en su borde) cae 30 % o más frente a hoy', umbral: 70, unidad: '% del área funcional de hoy', semanas: 4,
    fuente: 'Convención de Ramsar (Colombia la adoptó por la Ley 357 de 1997): mantener las características ecológicas de los humedales y su uso racional, sin pérdida neta (https://www.ramsar.org/about/wise-use-wetlands). Política de Humedales del Distrito Capital (Decreto 624 de 2007, https://www.ambientebogota.gov.co/politica-de-humedales-del-distrito-capital): conservar y recuperar los humedales de Bogotá, incluidos El Burro, La Vaca y Techo. [SUP] umbral 30 %, el mismo de la regla de hábitat; la pérdida sale de la basura arrojada en los bordes (ver BASURA_SUP).' },
  { k: 'abasto', n: 'Abastecimiento', txt: 'alguna zona recibe menos del 80 % de los alimentos que necesita', umbral: 80, unidad: '% de lo que necesita la zona peor servida', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js (0,4 kg/día de frescos por persona, OMS).' },
  { k: 'residuos', n: 'Residuos', txt: 'los orgánicos pendientes de tratamiento superan la capacidad de almacenamiento', umbral: 100, unidad: '% del almacenamiento', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js (3 días de contenedores y calle + 2 semanas de planta).' },
  { k: 'ruido', n: 'Ruido', txt: 'el ruido promedio de las calles sube 3 dB o más frente al inicio (el doble de energía sonora: el doble de tráfico)', umbral: 3, unidad: 'dB sobre el inicio', semanas: 4,
    fuente: 'OMS 2018, Environmental Noise Guidelines for the European Region: tráfico vial < 53 dB Lden (https://www.who.int/europe/publications/i/item/9789289053563). En el modelo HOY ya el 76 % de las celdas de vía supera 53 dB, así que ese nivel absoluto no puede ser game over (se reporta en callesOMS). Se usa el cambio: +3 dB = el doble de energía, el menor cambio perceptible en ruido ambiental (FHWA, Highway Traffic Noise: Analysis and Abatement Guidance 2011, https://www.fhwa.dot.gov/environment/noise/regulations_and_guidance/analysis_and_abatement_guidance/). [SUP] umbral de cambio y no de nivel.' },
  { k: 'trafico', n: 'Tráfico', txt: 'circulan 30 % más vehículos que hoy (índice de tráfico 1,30 o más)', umbral: 1.3, unidad: 'índice (1 = hoy)', semanas: 4,
    fuente: 'Plan de Movilidad Sostenible y Segura de Bogotá (2023): 77 % de los viajes en modos sostenibles en 2035; hoy ~70 % (Encuesta de Movilidad 2023, https://bogota.gov.co/mi-ciudad/movilidad/movilidad-en-bogota-asi-se-movilizan-los-capitalinos-segun-encuesta ; https://www.larepublica.co/economia/claudia-lopez-presento-el-nuevo-plan-de-movilidad-para-bogota-con-metas-a-2035-3741556). Los viajes no sostenibles deben pasar de 30 % a 23 % (× 0,77). [SUP] game over cuando el tráfico se aleja de hoy tanto como la meta pide bajar, en sentido contrario: 1 / 0,77 ≈ 1,30.' }
];
const VALOR = { fauna: (x) => x.fauna / Math.max(1, x.fauna0) * 100, habitat: (x) => x.pares / Math.max(1, x.ref ? x.ref.pares : x.pares0) * 100, abasto: (x) => x.comidaMin * 100,
  residuos: (x) => x.residuos * 100, ruido: (x) => x.ruidoDb - x.ruidoDb0, trafico: (x) => x.trafico, humedal: (x) => x.humedalFuncional };
const MALO = { fauna: (v) => v < 90, habitat: (v) => v <= 70, abasto: (v) => v < 80, residuos: (v) => v > 100, ruido: (v) => v >= 3, trafico: (v) => v >= 1.3, humedal: (v) => v <= 70 };
// cerca del game over (aviso previo): 2/3 del camino desde el valor de hoy hasta el umbral
const CERCA = { fauna: (v) => v < 94, habitat: (v) => v <= 80, abasto: (v) => v < 87, residuos: (v) => v > 85, ruido: (v) => v >= 2, trafico: (v) => v >= 1.2, humedal: (v) => v <= 80 };
const MOTIVO_GO = { fauna: 'se perdió más del 10 % de las especies de fauna', habitat: 'la ocupación de los parches cayó 30 % o más', abasto: 'una zona recibió menos del 80 % de los alimentos',
  residuos: 'los orgánicos pendientes superaron el almacenamiento', ruido: 'el ruido de las calles subió 3 dB o más', trafico: 'el tráfico subió 30 % o más sobre hoy',
  humedal: 'los humedales perdieron 30 % o más de su área funcional por la basura y los rellenos en sus bordes' };

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
const PRED_SIMS = new Set([2, 4, 9, 10, 11]); // 4: plan parcial · 2, 9, 10, 11: instituto en Bavaria
const KEN_XZ = (() => { let x = 0, z = 0, w = 0; for (const Z of ZONAS) { x += Z[0] * Z[2]; z += Z[1] * Z[2]; w += Z[2]; } return [x / w, z / w]; })(); // centro poblado de Kennedy
const CORA_XZ = [BODEGAS.reduce((a, b) => a + b.x, 0) / BODEGAS.length, BODEGAS.reduce((a, b) => a + b.z, 0) / BODEGAS.length];
const BORDE_TOT = BODEGAS.reduce((a, b) => a + (b.borde || 0), 0);
export function crear(id, semilla = 1, valores = {}) {
  listo(); const S = SIMS.find(x => x.id === id); if (!S) throw new Error('simulación ' + id + ' no existe');
  const val = {}; for (const sl of S.sliders) val[sl.k] = valores[sl.k] != null ? +valores[sl.k] : sl.val;
  const PAR = clonar(PRE.PAR); PAR.P1.cierres = SUP_SIMS.CIERRES_AL_AZAR; PAR.P1.crece = false; // la población crece con pobCrece (abajo)
  for (const [k, v] of Object.entries(val)) { const m = k.match(/^(P[123])\.(\w+)$/); if (m) PAR[m[1]][m[2]] = v; }
  const mod = { red: RED }; let metro = null;
  if (id === 5) mod.sinCora = Math.round(val.sinCora);
  if (id === 6) mod.desmonte = { lib: val.desmLib };
  if (id === 7) { const r = val.metroRed / 100; metro = { red: r, desde: Math.round(val.metroSem), F: PRE.metroF(r) }; }
  if (id === 8 || id === 9) mod.cierre = { via: SUP_SIMS.CIERRE_VIA, t0: Math.round(val.cierreT0), dur: Math.round(val.cierreDur) };
  if (id === 10) mod.plazasNodo = true;
  if (id === 11) mod.huertasC = true;
  if (id === 12) mod.techos = { m2: val.techosM2, sem: Math.max(1, Math.round(val.techosAnios * V.AÑO)) };
  const s = V.crear(S.base, semilla, mod);
  const vivTot = PLAN_BAV.VIV_ETAPA.reduce((a, v) => a + v, 0);
  const plan = id === 4 ? { esc: (val.planViv != null ? val.planViv : vivTot) / vivTot, autos: val.planAutos != null ? val.planAutos : PLAN_BAV.AUTOS_HOG, accesos: Math.max(1, Math.round(val.planAccesos || 2)) } : null;
  if (plan) plan.viv = PLAN_BAV.VIV_ETAPA.map(v => v * plan.esc);
  const E = { id, semilla, val, PAR, s, mod, metro, plan, o: null, racha: Object.fromEntries(REGLAS.map(R => [R.k, 0])), go: null, ev: [], ind: null,
    prev: new Uint8Array(s.occ.length), ruido0: null, techos: mod.techos || null,
    traf: { r: (val.trafCrece != null ? val.trafCrece : 100 * V.TRAFICO.carros) / 100, pob: (val.pobCrece || 0) / 100, mit: (val.mitiga || 0) / 100 },
    occ0: Uint8Array.from(s.occ), emaO: Float32Array.from(s.occ),
    ref: { listo: false, pares: 0, red: 0, poli: 0, huertas: 0, occ: new Float32Array(s.occ.length), pred: new Float32Array(RED.NFA), predOcc: 0 }, emaP: null, pred: null, evs: { fired: new Set(), lvl: {}, cd: {}, pend: [], h0: null, short: false } };
  E.red0 = interLocal(s); E.poli0 = paresPoli(s);
  if (PRED_SIMS.has(id)) { let n0 = 0; const porEsp = new Float32Array(RED.NFA); for (let i = 0; i < RED.NFA; i++) for (const p of PRED_P) { porEsp[i] += s.occ[i * NP + p]; }
    for (let i = 0; i < RED.NFA; i++) n0 += porEsp[i]; E.pred = { esp0: porEsp, ema: Float32Array.from(porEsp), occ0: n0, emaOcc: n0, xAve: new Float32Array(NP).fill(1), xMin: new Float32Array(NP).fill(1) };
  }
  // factores por parche que se pasan a la red trófica: aves (predio × basura × desvíos) y hábitat de todas las especies (área de humedal)
  E.xAve = new Float32Array(NP).fill(1); E.xH = new Float32Array(NP).fill(1); E.xBas = new Float32Array(NP).fill(1); E.xDes = new Float32Array(NP).fill(1);
  s.red.xAve = E.xAve; s.red.xH = E.xH; s.red.fRata = 1;
  E.bas = basuraIni(E); E.cie = mod.cierre ? { t0: mod.cierre.t0, dur: mod.cierre.dur, via: mod.cierre.via, fase: 0, faseMax: 0 } : null;
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

/* ---------- tráfico de los deslizadores: factor sobre el índice V de sim_vida.js ----------
   fTraf(t) = V(trafCrece) / V(1,5 %) del mismo año × población / población de hoy [SUP carros ∝ población]. Para la fauna además × 10^(−0,3·mitiga)
   (−3 dB en las calles pacificadas = la mitad de energía en la zona de efecto) y, en la sim. 7, el factor del metro por parche. Se pasa a sim_vida.js por
   su gancho por parche (mod.metro {k, f, desde}); si todo vale 1 no se pasa nada (la dinámica es la de siempre). Se actualiza una vez por año. */
const vAño = (r, a) => 0.70 * Math.pow(1 + r, a) + 0.22 + 0.08;
function factorTraf(E, t) { const a = Math.max(0, Math.floor(t / V.AÑO)), T = E.traf;
  return vAño(T.r, a) / vAño(V.TRAFICO.carros, a) * (E.s.pob / V.POB_K); }
function ganchoTraf(E, t) {
  const T = E.traf, mOn = E.metro && t >= E.metro.desde;
  const gE = Math.round(factorTraf(E, t) * Math.pow(10, -MITIGA_DB / 10 * T.mit) * 1000) / 1000;
  const k = gE + '|' + (mOn ? E.metro.F.k : '');
  if (E.mod._gk === k) return; E.mod._gk = k;
  if (gE === 1 && !mOn) { E.mod.metro = null; return; }
  const f = mOn ? (gE === 1 ? E.metro.F.f : E.metro.F.f.map(v => v * gE)) : new Float32Array(NP).fill(gE);
  E.mod.metro = { k: 'g' + k, f, desde: 0 }; }

/* ---------- predio: viajes, ruido y zona de efecto de las vías nuevas ---------- */
function planEn(E, t) { const a = t / V.AÑO, VE = E.plan.viv; let viv = 0, com = 0, vias = 0;
  for (let k = 0; k < VE.length; k++) { viv += VE[k] * cl01(a - k); if (a >= k) { vias += PREDIO_PLAN.vias[k]; if (a >= k + 1) com += PREDIO_PLAN.com[k] * Math.min(1, E.plan.esc); } }
  const k = Math.floor(a), obra = k >= 0 && k < VE.length ? VE[k] : 0;
  return { viv, obra, com, vias, k: Math.min(VE.length - 1, Math.max(0, k)), etapa: k + 1 }; }
function viajes(E, P) { const S = PREDIO_SUP; return { car: P.viv * E.plan.autos * S.VIAJES_AUTO * (1 + S.EXTRA_VIV) + P.com * S.VIAJES_COM, cam: P.obra * S.CAMIONES_VIV }; }
function zonaPredio(E, t) { // factor extra de ruido de las vías nuevas para las aves (s.red.xAve), antes de V.paso
  const P = planEn(E, t), Vj = viajes(E, P), X = E.pred.xAve, Vg = V.crecimiento(t).V * factorTraf(E, t), mit = Math.pow(10, -MITIGA_DB / 10 * E.traf.mit);
  const Qob = P.obra > 0 ? EXPO.medianaVia * Math.pow(10, (PREDIO_SUP.OBRA_DB - PREDIO_SUP.L_PRINCIPAL) / 10) * Math.min(1, P.obra / PREDIO_SUP.OBRA_VIV) : 0;
  const Qv = ((Vj.car + Vj.cam * PREDIO_SUP.CAMION_EQ) / E.plan.accesos + Qob) * mit, Dn = V.TRAFICO.ZONA_HOY * Math.pow(Qv / EXPO.medianaVia, V.TRAFICO.B_DIST);
  const Dh = V.TRAFICO.ZONA_HOY * Math.pow(Vg * mit, V.TRAFICO.B_DIST), RZ = V.TRAFICO.RED_ZONA;
  for (const p of PRED_P) { const dd = PREDIO_PLAN.dist[PARCHES[p].id]; if (!dd || Qv <= 0) { X[p] = 1; continue; }
    const r = RP_M[p], fn = fZonaP(dd[P.k], r, Dn), fh = EXPO.parches[p] ? fZonaP(EXPO.parches[p][0], r, Dh) : 0;
    X[p] = (1 - RZ * Math.max(fn, fh)) / (1 - RZ * fh); if (X[p] < E.pred.xMin[p]) E.pred.xMin[p] = X[p]; } }

/* ---------- basura (ver BASURA_SUP) ---------- */
const HUM_P = PARCHES.map((p, i) => p.t === 'humedal' && !p.dyn ? i : -1).filter(i => i >= 0);
const POB_Z = ZONAS.reduce((a, z) => a + z[2], 0);
function basuraIni(E) {
  const B = BASURA_SUP, v = E.val, flores = [CORA_XZ[0] + 250, CORA_XZ[1] - 200];
  const pts = [{ fuente: 'corabastos', x: CORA_XZ[0], z: CORA_XZ[1], g0: B.CORA_T }, { fuente: 'flores', x: flores[0], z: flores[1], g0: B.FLORES_T }];
  for (const Z of ZONAS) if (Math.hypot(Z[0] - CORA_XZ[0], Z[1] - CORA_XZ[1]) <= B.RADIO && Z[2] > 0) pts.push({ fuente: 'vivienda', x: Z[0], z: Z[1], g0: Z[2] / POB_Z * V.POB_K * B.KG_HAB / 1000 });
  for (const P of pts) P.acum = P.g0 * (1 - B.RECOLECCION) * 7 / B.LIMPIEZA;
  // bordes de humedal: un punto por humedal, en el borde que mira al centro poblado de Kennedy; lo que llega ahí es arrojo (no se recoge)
  const sq = HUM_P.reduce((a, h) => a + Math.sqrt(PARCHES[h].ha), 0);
  HUM_P.forEach((h, k) => { const P = PARCHES[h], dx = KEN_XZ[0] - P.x, dz = KEN_XZ[1] - P.z, d = Math.hypot(dx, dz) || 1, r = RP_M[h];
    const g0 = B.HUM_T * Math.sqrt(P.ha) / sq; pts.push({ fuente: 'humedal', hum: k, nombre: P.n, x: P.x + dx / d * r, z: P.z + dz / d * r, g0, acum: g0 * 7 / B.LIMPIEZA }); });
  for (const P of pts) { P.t = P.g0; P.u = 0; P.acum0 = P.acum; P.w = HUM_P.map((h, k) => P.fuente === 'humedal' ? (P.hum === k ? 1 : 0) : Math.exp(-Math.hypot(PARCHES[h].x - P.x, PARCHES[h].z - P.z) / B.D_EXP)); }
  const acum0 = pts.reduce((a, P) => a + P.acum, 0);
  const cerca = PARCHES.map((p, i) => [i, Math.hypot(p.x - CORA_XZ[0], p.z - CORA_XZ[1])]).filter(a => a[1] <= 1000);
  return { r: (v.basuraCrece != null ? v.basuraCrece : 100 * B.CRECE) / 100, rec: (v.recoleccion != null ? v.recoleccion : 100 * B.RECOLECCION) / 100, pts, acum0, acum: acum0, ratas: 1, dep0: null, total: 0,
    ha: HUM_P.map(h => PARCHES[h].ha), ha0: HUM_P.map(h => PARCHES[h].ha), cal: HUM_P.map(() => 1), func: 1, cerca, ha0Tot: HUM_P.reduce((a, h) => a + PARCHES[h].ha, 0), captura: 0 }; }
function basuraPaso(E, t) {
  const B = BASURA_SUP, b = E.bas, o = E.o, s = E.s, a = t / V.AÑO, g = Math.pow(1 + b.r, a);
  if (b.dep0 == null) b.dep0 = Math.max(1e-3, o.dep);
  const fCora = o.dep / b.dep0, fPob = s.pob / V.POB_K, org = o.gen > 0 ? Math.min(1, (o.desv || 0) / o.gen) * B.ORGANICO : 0; // orgánicos que la red alcanza a tratar (sube con la capacidad de compost)
  // la fracción sin recoger crece con el arrojo clandestino; la red de la propuesta recoge la parte orgánica según sus nodos abiertos; los techos compostan en casa
  const prop = s.e === 'B' || s.e === 'C', fSin = Math.pow(1 + B.ARROJO_EXTRA, a) * (1 - b.rec) / (1 - B.RECOLECCION);
  const capt = prop ? B.ORGANICO * Math.min(1, (o.nodos || 0) / MERCADOS.length) : E.techos ? B.ORGANICO * Math.max(Math.min(1, E.techos.m2 * s.supF / SUP_SIMS.M2_HUERTA * PLAN_BAV.PERS_HOG / s.pob), Math.min(1, a / (SUP_SIMS.TECHOS_SEM / 52))) : 0; // techos (sim. 12): los hogares con huerta compostan en casa y, además, Bavaria Común (instituto de tecnologías convergentes) enseña compostaje y abre puntos de compostaje y gestión de residuos al mismo ritmo que se montan los techos [SUP]: recoge la parte orgánica como la red
  b.captura = capt; let acum = 0;
  for (const P of b.pts) {
    if (P.fuente === 'humedal') { P.t = P.g0 * g * fPob * fSin * (1 - capt); P.u = P.t; }
    else { P.t = P.g0 * g * (P.fuente === 'corabastos' || P.fuente === 'flores' ? fCora : fPob); P.u = Math.min(P.t, P.t * (1 - B.RECOLECCION) * fSin * (P.fuente === 'vivienda' ? 1 - Math.max(org, capt) : 1 - capt)); }
    P.acum += P.u * 7 - P.acum * B.LIMPIEZA; acum += P.acum; }
  b.acum = acum; b.ratas = acum / b.acum0; s.red.fRata = Math.max(0.2, b.ratas);
  b.total = (V.POB_K * fPob + (o.plan ? o.plan.personas : 0)) * B.KG_HAB / 1000 * g + (B.CORA_T + B.FLORES_T) * g * fCora + b.pts.reduce((x, P) => x + (P.fuente === 'humedal' ? P.t : 0), 0);
  let fun = 0;
  for (let k = 0; k < HUM_P.length; k++) { let e = 0; for (const P of b.pts) e += P.u * P.w[k]; b.ha[k] = Math.max(0.2 * b.ha0[k], b.ha[k] - B.HA_T * e);
    const H = b.pts.find(P => P.fuente === 'humedal' && P.hum === k); b.cal[k] = 1 / (1 + B.K_CONT * Math.max(0, H.acum / H.acum0 - 1));
    E.xH[HUM_P[k]] = Math.sqrt(b.ha[k] / b.ha0[k]) * b.cal[k]; fun += b.ha[k] * b.cal[k]; }
  b.func = (fun + (o.cora.borde || 0) / 1e4 * (o.cora.mad || 0)) / b.ha0Tot;
  const ex = Math.max(0, b.ratas - 1); for (const [p, d] of b.cerca) E.xBas[p] = 1 / (1 + B.AVE_RATA * ex * Math.exp(-d / B.D_EXP));
  // árboles de los parques: tala neta del estado actual (A y D); la propuesta la compensa dentro de Kennedy
  if (!prop && !E.techos) { const a0 = E.arb0 != null ? E.arb0 : (E.arb0 = E.PAR.P3.arboles); E.PAR.P3.arboles = a0 * Math.pow(1 - B.TALA_URB, a); } }
/* ---------- cierre gradual y desvíos (ver DESVIO_SUP) ---------- */
function faseCierre(C, t) { if (t < C.t0 || t >= C.t0 + C.dur) return 0; const S = DESVIO_SUP, u = (t - C.t0) / C.dur;
  if (u < S.SUBE) return Math.min(3, Math.floor(u / S.SUBE * 3) + 1) / 3; if (u > 1 - S.BAJA) return Math.max(1, Math.ceil((1 - u) / S.BAJA * 3)) / 3; return 1; }
function desvios(E, t) {
  const C = E.cie, D = DESVIOS[C.via]; C.fase = faseCierre(C, t); if (C.fase > C.faseMax) C.faseMax = C.fase; C.traf = 1 + DESVIO_SUP.DESV * C.fase; E.xDes.fill(1); if (!D || !C.fase) return;
  const Vg = V.crecimiento(t).V * factorTraf(E, t), Dh = V.TRAFICO.ZONA_HOY * Math.pow(Vg, V.TRAFICO.B_DIST), Dn = V.TRAFICO.ZONA_HOY * Math.pow(Vg * C.traf, V.TRAFICO.B_DIST), RZ = V.TRAFICO.RED_ZONA;
  for (const id of D.desvio) { const dd = DESVIOS.vias[id].dist; for (let p = 0; p < NP; p++) { if (dd[p] > DESVIO_SUP.RADIO) continue; const r = RP_M[p], fh = fZonaP(dd[p], r, Dh), fn = fZonaP(dd[p], r, Dn);
    E.xDes[p] *= (1 - RZ * fn) / (1 - RZ * fh); } } }

/* ---------- una semana ---------- */
export function paso(E) {
  const s = E.s, t = s.t + 1; E.prev.set(s.occ);
  if (E.traf.pob) s.pob *= Math.pow(1 + E.traf.pob, 1 / V.AÑO); // expansión poblacional (en vez de P1.crece, con la tasa del deslizador)
  ganchoTraf(E, t);
  let sv = null;
  if (E.cie) desvios(E, t);
  if (E.plan) zonaPredio(E, t);
  if (E.pred || E.cie || E.bas) { const X = E.xAve, PX = E.pred ? E.pred.xAve : null; for (let p = 0; p < NP; p++) X[p] = (PX ? PX[p] : 1) * E.xBas[p] * E.xDes[p]; }
  if (E.plan) { if (E.plan.esc !== 1 || E.plan.autos !== PLAN_BAV.AUTOS_HOG) { sv = [PLAN_BAV.VIV_ETAPA, PLAN_BAV.AUTOS_HOG]; PLAN_BAV.VIV_ETAPA = E.plan.viv; PLAN_BAV.AUTOS_HOG = E.plan.autos; } }
  try { E.o = V.paso(s, E.PAR); } finally { if (sv) { PLAN_BAV.VIV_ETAPA = sv[0]; PLAN_BAV.AUTOS_HOG = sv[1]; } } // las viviendas y autos del deslizador solo para esta simulación
  E.ind = null;
  basuraPaso(E, t);
  // extinciones en toda Kennedy esta semana
  const NFA = RED.NFA, occ = s.occ, P = E.prev, ev = []; E.ev = ev;
  for (let i = 0; i < NFA; i++) { let antes = 0, ahora = 0; const b = i * NP; for (let p = 0; p < NP; p++) { antes |= P[b + p]; ahora |= occ[b + p]; }
    if (antes && !ahora) { let best = -1; for (let p = 0; p < NP; p++) if (P[b + p] && (best < 0 || PARCHES[p].ha > PARCHES[best].ha)) best = p;
      const F = RED.FAUNA[i], m = s.red.mot[b + best] || 5;
      ev.push({ sem: s.t + 1, especie: F.id, nombre: F.n, motivo: MOTIVOS[m], parche: PARCHES[best].id, x: PARCHES[best].x, z: PARCHES[best].z }); } }
  // promedios móviles (13 semanas) de la ocupación por especie × parche: los avisos no parpadean con el azar de una semana
  const A = 1 / 13, EO = E.emaO; for (let k = 0; k < EO.length; k++) EO[k] += (occ[k] - EO[k]) * A;
  const x = ind(E);
  referencia(E, x);
  E.vals = {}; for (const R of REGLAS) { const v = VALOR[R.k](x); E.vals[R.k] = v; E.racha[R.k] = MALO[R.k](v) ? E.racha[R.k] + 1 : 0;
    if (!E.go && E.racha[R.k] >= R.semanas) E.go = { regla: R.k, sem: s.t + 1, motivo: MOTIVO_GO[R.k], valor: Math.round(v * 1000) / 1000 }; }
  x.eventos = avisos(E, x);
  return E;
}
export function gameOver(E) { return E.go; }
/* REFERENCIA del año 1 (semanas REF[0]–REF[1]): el estado inicial de la red trófica (regla de hábitat ≥ 0,45 de sim_vida.js) está por debajo del
   equilibrio del modelo: la ocupación se duplica en las primeras ~40 semanas en TODAS las simulaciones y luego se estabiliza. Los avisos de fauna,
   presion, recuperacion y la ocupación de referencia del predio se comparan con el promedio de las semanas 40–52 (ya asentado), no con la semana 0.
   pares0, red0 y poliniz0 siguen siendo los de la semana 0 (contrato y reglas de game over sin cambios). Antes de la semana 52 la referencia es el
   valor actual (sin avisos de fauna). */
export const REF = [40, 52];
function referencia(E, x) {
  const R = E.ref; if (R.listo || x.sem < REF[0]) return; const n = REF[1] - REF[0] + 1;
  R.pares += x.pares / n; R.red += x.red / n; R.poli += x.poliniz / n; R.huertas += x.huertas / n;
  const occ = E.s.occ; for (let k = 0; k < occ.length; k++) R.occ[k] += occ[k] / n;
  if (E.pred) { for (let i = 0; i < RED.NFA; i++) { let k = 0; for (const p of PRED_P) k += occ[i * NP + p]; R.pred[i] += k / n; R.predOcc += k / n; } }
  if (x.sem >= REF[1]) R.listo = true; }
const refV = (E, k, actual) => E.ref.listo ? E.ref[k] : actual;

/* ---------- indicadores de la semana ---------- */
const sobre = (A, u) => { u -= 1e-4; let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] >= u) hi = m; else lo = m + 1; } return A.length - lo; }; // cuántos ≥ u (A ordenado; como las bandas del simulador: v < 65 es «moderado», 65 o más «ruidoso»)
export function ind(E) {
  if (E.ind) return E.ind; const s = E.s, o = E.o; if (!o) throw new Error('simulaciones.js: llamar paso() antes de ind()');
  const c = s.red.c, c0 = s.red.inicio, NFA = RED.NFA, occ = s.occ;
  // presencia por especie
  let aves = 0, poli = 0; const pres = new Uint8Array(NFA); for (let i = 0; i < NFA; i++) { let a = 0; for (let p = 0; p < NP; p++) a |= occ[i * NP + p]; pres[i] = a; if (a && RED.AVE[i]) aves++; }
  for (const i of PRE.POLI) if (pres[i]) poli++;
  // tráfico y ruido (V de sim_vida.js × factor de los deslizadores; metro cerca del corredor; calles pacificadas)
  const V0 = o.trafico.V * factorTraf(E, s.t), mOn = E.metro && s.t >= E.metro.desde, fCer = mOn ? 1 - E.metro.red : 1;
  const trafico = V0 * (1 - (1 - fCer) * PRE.fC);
  const mitDb = MITIGA_DB * E.traf.mit;
  const dL = 10 * Math.log10(V0) - mitDb, dC = 10 * Math.log10(V0 * fCer) - mitDb, n = PRE.nC + PRE.nL;
  const ruidoDb = ((PRE.mLc + dC) * PRE.nC + (PRE.mLl + dL) * PRE.nL) / n;
  if (E.ruido0 == null) E.ruido0 = PRE.mLc * PRE.nC / n + PRE.mLl * PRE.nL / n; // inicio = HOY (sin crecimiento ni metro)
  const callesRuidosas = (sobre(PRE.Lc, 65 - dC) + sobre(PRE.Ll, 65 - dL)) / n * 100, callesOMS = (sobre(PRE.Lc, 53 - dC) + sobre(PRE.Ll, 53 - dL)) / n * 100;
  const congestion = TOMTOM.congestion * Math.pow(trafico, TOMTOM.beta), tiempo10km = TOMTOM.libre * (1 + congestion / 100);
  // atropellos (índice [SUP], ver encabezado)
  let atrop = 0; const XQ = s.red.XQ;
  if (XQ) for (let i = 0; i < NFA; i++) { if (!RED.TER[i]) continue; const W = PRE.DEST[RED.FAUNA[i].grupo], b = i * NP;
    for (let q = 0; q < NP; q++) { if (!occ[b + q]) continue; for (let p = 0; p < NP; p++) { const w = W[q * NP + p]; if (w) atrop += w * (1 - XQ[p * NP + q] * PRE.S0[p * NP + q]); } } }
  // zonas
  const soporteEco = new Float32Array(NZ), comercio = new Float32Array(NZ), cora = new Float32Array(NZ), rP = new Float32Array(NP);
  for (let p = 0; p < NP; p++) { let k = 0; for (let i = 0; i < NFA; i++) k += occ[i * NP + p]; rP[p] = k / NFA; }
  for (let z = 0; z < NZ; z++) { let pr = 1; for (let p = 0; p < NP; p++) if (rP[p]) pr *= 1 - rP[p] * PRE.WZ[z * NP + p]; soporteEco[z] = 1 - pr;
    const compra = o.zRec[z] - o.zLoc[z], co = Math.max(0, compra - o.zRed[z]); comercio[z] = compra > 1e-6 ? Math.min(1, o.zRed[z] / compra) : 0; cora[z] = co; }
  /* huertas = hogares que siembran + superficies de la red (B y C: P1.sup montada; B sin módulos de C usa 60 %) y techos, en huertas equivalentes de 50 m² */
  const prop = s.e === 'B' || s.e === 'C', supRed = prop ? E.PAR.P1.sup * s.supF * (s.e === 'B' && !E.mod.huertasC ? 0.6 : 1) : 0;
  const huertas = o.act + (supRed + (E.techos ? E.techos.m2 * s.supF : 0)) / SUP_SIMS.M2_HUERTA;
  const comidaLocal = Math.min(100, o.pct || 0); // % de la gente de Kennedy que comería solo de las huertas (sim_vida.js: pers / pob)
  const sem = s.t + 1, red = interLocal(s), poliniz = paresPoli(s);
  if (E.emaP == null) E.emaP = c.pares; else E.emaP += (c.pares - E.emaP) / 13;
  const predio = E.pred ? indPredio(E, trafico, mitDb) : null;
  /* PRESIÓN y RECUPERACIÓN (0–1), para que las láminas de indicadores 3D se degraden o se recuperen en todas las simulaciones.
     presion = 0,2·población + 0,2·tráfico + 0,15·ruido + 0,2·pérdida de verde + 0,25·basura, cada parte normalizada a su umbral:
       población (gente nueva de Kennedy y del plan parcial) / 30 % · (trafico − 1) / 0,30 (la regla de tráfico) · (ruido − inicio) / 3 dB (la regla de ruido) ·
       pérdida de verde = árboles talados del bosque de Bavaria (fracción) + caída de la calidad del humedal frente a 0,55 + caída de la ocupación de
       los parches / 30 % (la regla de hábitat) + área de humedal perdida / 10 % · basura = (ratas − 1), el doble de basura acumulada = 1.
       [SUP] pesos; cada parte se limita a 0–1.
     recuperacion = 0,25·huertas + 0,15·árboles + 0,15·borde restaurado + 0,15·humedal + 0,3·interacciones de la red:
       huertas nuevas / 3 veces las del inicio · árboles en parques sobre 0,4 (deslizador), creciendo en 5 años · borde de La Vaca restaurado × madurez ·
       calidad del humedal sobre 0,55 / 0,45 · (red / red₀ − 1) / 0,5. [SUP] pesos. */
  const h0 = E.evs.h0 != null ? E.evs.h0 : (E.evs.h0 = Math.max(1, huertas));
  const pobNueva = (s.pob + (o.plan ? o.plan.personas : 0)) / V.POB_K - 1;
  const tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0;
  const Bs = E.bas, humHa = Bs.ha.reduce((a, v) => a + v, 0), humedalHa = humHa + (o.cora.borde || 0) / 1e4 * (o.cora.mad || 0);
  const arbPerdida = E.arb0 ? 1 - E.PAR.P3.arboles / E.arb0 : 0, humedalFuncional = Bs.func * 100;
  const verde = cl01(tala + arbPerdida / 0.2 + Math.max(0, (0.55 - s.W) / 0.55) + Math.max(0, 1 - E.emaP / Math.max(1, refV(E, 'pares', E.emaP))) / 0.3 + Math.max(0, 1 - Bs.func) / 0.3);
  const presion = cl01(0.2 * cl01(pobNueva / 0.3) + 0.2 * cl01((trafico - 1) / 0.3) + 0.15 * cl01((ruidoDb - E.ruido0) / 3) + 0.2 * verde + 0.25 * cl01(Bs.ratas - 1));
  const arb = cl01((E.PAR.P3.arboles - 0.4) / 0.6) * Math.min(1, sem / (5 * V.AÑO));
  const borde = BORDE_TOT > 0 ? cl01(o.cora.borde / BORDE_TOT) * (o.cora.mad || 0) : 0;
  const recuperacion = cl01(0.25 * Math.max(cl01((huertas - h0) / (3 * h0)), cl01(comidaLocal / 10)) + 0.15 * arb + 0.15 * borde + 0.15 * cl01((s.W - 0.55) / 0.45) + 0.3 * cl01((red / Math.max(1, refV(E, 'red', red)) - 1) / 0.5));
  return E.ind = { sem, año: sem / V.AÑO, fauna: c.esp, fauna0: c0.esp, flora: c.flora, flora0: c0.flora, red, red0: E.red0, redTipos: c.red, redTipos0: c0.red, pares: c.pares, pares0: c0.pares,
    aves, poliniz, poliniz0: E.poli0, polinizEsp: poli, trafico, congestion, tiempo10km, ruidoDb, ruidoDb0: E.ruido0, callesRuidosas, callesOMS, atropellos: atrop, comidaMin: o.zMin, residuos: o.pend / Math.max(1, o.alm),
    huertas, bodegas: s.cora.ap.length, cierre: indCierre(E, o), zonas: { soporteEco, comercio, cora }, extinciones: E.ev, presion, recuperacion, predio, eventos: [],
    ref: E.ref.listo ? { pares: E.ref.pares, red: E.ref.red, poliniz: E.ref.poli, semanas: REF } : null,
    basura: { total_t_dia: Bs.total, puntos: Bs.pts.map(P => ({ x: Math.round(P.x), z: Math.round(P.z), t_dia: P.t, fuente: P.fuente, acumulada: P.acum, acumulada0: P.acum0, sinRecoger_t_dia: P.u, nombre: P.nombre || null })), captura: Bs.captura, fraccionSinRecoger: (() => { let u = 0, g = 0; for (const P of Bs.pts) if (P.fuente !== 'humedal') { u += P.u; g += P.t; } return g > 0 ? u / g : 0; })(), acumulada: Bs.acum, acumulada0: Bs.acum0, sinRecoger_t_dia: Bs.pts.reduce((a, P) => a + P.u, 0) },
    ratas: Bs.ratas, ratas0: 1, humedalHa, humedalHa0: Bs.ha0Tot, humedalFuncional, humedales: HUM_P.map((h, k) => ({ id: PARCHES[h].id, nombre: PARCHES[h].n, x: PARCHES[h].x, z: PARCHES[h].z, ha: Bs.ha[k], ha0: Bs.ha0[k], calidad: Bs.cal[k] })),
    arboles: E.PAR.P3.arboles, arbolesPerdidos: arbPerdida, comidaLocal };
}
function indCierre(E, o) { const C = E.cie, f = C ? C.fase : 0; if (!o.cierre && !f) return null;
  const D = C ? DESVIOS[C.via] : null, base = o.cierre || { via: D ? D.n : '', sem: null, dur: C ? C.dur : null, on: true };
  return { ...base, fase: f, vias_desvio: D && f ? D.desvio.map(id => ({ id, n: DESVIOS.vias[id].n })) : [], traficoDesvio: C ? C.traf || 1 : 1, ruidoExtraDb: C ? 10 * Math.log10(C.traf || 1) : 0 }; }
function indPredio(E, trafico, mitDb) {
  const s = E.s, o = E.o, PD = E.pred, NFA = RED.NFA, occ = s.occ, S = PREDIO_SUP;
  let car = 0, cam = 0, hab = 0, vias = 0;
  if (E.plan) { const P = planEn(E, s.t), Vj = viajes(E, P); car = Vj.car; cam = Vj.cam; hab = P.viv * PLAN_BAV.PERS_HOG; vias = P.vias; }
  else cam = 4 * (o.bavKg || 0) / 7 / S.CARGA_CAMION; // instituto: camiones del acopio
  // en la ENTRADA más cargada: cada acceso nuevo lleva 1/accesos de los viajes (instituto: un acceso)
  const sh = E.plan ? 1 / E.plan.accesos : 1, Qb = Q0_PREDIO * trafico, traf = (Qb + (car + cam) * sh) / Q0_PREDIO;
  const ruidoDb = dBvia(Qb + (car + cam * S.CAMION_EQ) * sh) - mitDb, ruidoDb0 = dBvia(Q0_PREDIO);
  let ocup = 0; const fuera = [], tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0;
  for (let i = 0; i < NFA; i++) { let k = 0; for (const p of PRED_P) k += occ[i * NP + p]; ocup += k; PD.ema[i] += (k - PD.ema[i]) / 13;
    if (!E.ref.listo) continue; const antes = Math.round(E.ref.pred[i]), ahora = Math.round(PD.ema[i]); if (!(antes > 0 && ahora < antes)) continue;
    let ruido = false; if (RED.AVE[i]) for (const p of PRED_P) if (E.ref.occ[i * NP + p] > 0.5 && PD.xMin[p] <= 0.9) ruido = true;
    const nidos = PI_BOSQUE >= 0 && E.ref.occ[i * NP + PI_BOSQUE] > 0.5 && tala >= 0.1;
    if (ruido || nidos) fuera.push({ especie: RED.FAUNA[i].id, nombre: RED.FAUNA[i].n, antes, ahora, causa: ruido && nidos ? 'ambas' : ruido ? 'ruido' : 'nidos' }); }
  PD.emaOcc += (ocup - PD.emaOcc) / 13;
  return { x: PLAN_BAV.CENTRO[0], z: PLAN_BAV.CENTRO[1], nombre: E.plan ? 'Plan parcial Bavaria' : 'Instituto en Bavaria', trafico: traf, trafico0: 1, ruidoDb, ruidoDb0, ocupacion: ocup, ocupacion0: E.ref.listo ? E.ref.predOcc : PD.emaOcc, ocupacionInicial: PD.occ0,
    habitantes: Math.round(hab), vias, vehiculosDia: Math.round(car + cam), camionesDia: Math.round(cam), tala, especiesFuera: fuera };
}

/* ---------- AVISOS (ind(s).eventos) ----------
   Cada semana se revisan umbrales del modelo; un aviso sale UNA vez por umbral (clave familia:nivel). Mismo tipo: espera de ENFRIA semanas, salvo que
   sea un nivel más alto de la misma familia (se agrava). Como mucho POR_SEM avisos por semana; los avisos de calendario (metro, cierre de Corabastos,
   cierre de vía, etapas del plan) esperan su turno hasta 26 semanas. Todo sale del estado del modelo: es determinista con la semilla.
   capa = lo que la interfaz resalta: 'especies' | 'ruido' | 'trafico'. signo +1 bueno, −1 malo. */
export const AVISOS_SUP = { ENFRIA: 52, ENFRIA_ESP: 520, ENFRIA_EXT: 104, POR_SEM: 2 };
const CAPA = { especies: 'especies', polinizadores: 'especies', huertas: 'especies', residuos: 'especies', corabastos: 'especies', ruido: 'ruido', obra: 'ruido', trafico: 'trafico', metro: 'trafico', comida: 'trafico' };
const nf = (v, d = 0) => { const a = Math.abs(v).toFixed(d).split('.'); return (v < 0 ? '−' : '') + a[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (a[1] ? ',' + a[1] : ''); };
const yLista = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const min1 = (n) => n.charAt(0).toLowerCase() + n.slice(1);
const PROPIOS = /^(Humedal|Parque|Bosque|Huerta|Instituto)/;
function avisos(E, x) {
  const st = E.evs, sem = x.sem, s = E.s, o = E.o, NFA = RED.NFA, cand = [];
  const add = (fam, nivel, tipo, titulo, texto, xz, signo, especies, once) => cand.push({ fam, nivel, tipo, titulo, texto, x: xz[0], z: xz[1], signo, especies: especies || [], once: !!once });
  const umbral = (v, niveles) => { let k = 0; for (let j = 0; j < niveles.length; j++) if (v >= niveles[j]) k = j + 1; return k; };
  const nombre = (i) => RED.FAUNA[i].n, RL = E.ref.listo, RO = E.ref.occ;
  // parche con más pérdida (o ganancia) de especies frente al inicio, con promedio móvil
  const parcheCambio = (signo) => { let best = -1, bv = 0; for (let p = 0; p < NP; p++) { let d = 0; for (let i = 0; i < NFA; i++) d += (E.emaO[i * NP + p] - RO[i * NP + p]); d *= signo; if (d > bv) { bv = d; best = p; } } return best; };
  const espParche = (p, signo) => { const r = []; for (let i = 0; i < NFA; i++) { const k = i * NP + p; if (signo < 0 ? (RO[k] > 0.7 && E.emaO[k] < 0.3) : (RO[k] < 0.3 && E.emaO[k] > 0.7)) r.push(i); } return r; };
  const motivo = (p, sp) => { const c = {}; let m = 5, mv = 0; for (const i of sp) { const k = s.red.mot[i * NP + p] || 5; c[k] = (c[k] || 0) + 1; if (c[k] > mv) { mv = c[k]; m = k; } } return MOTIVOS[m]; };

  // 1 · FAUNA en toda Kennedy: ocupación de los parches frente al inicio (promedio móvil de 13 semanas)
  const dP = RL ? (E.emaP / Math.max(1, E.ref.pares) - 1) * 100 : 0;
  if (dP < 0) { const k = umbral(-dP, [10, 25, 50]); if (k) { const p = parcheCambio(-1), sp = p >= 0 ? espParche(p, -1) : [], nm = ['10', '25', '50'][k - 1];
    add('fauna-', k, 'especies', `La fauna ocupa ${nm} % menos lugares que en el año 1`, `Las especies ocupan ${nf(E.emaP)} pares especie–parche frente a ${nf(E.ref.pares)} en el año 1.` + (p >= 0 ? ` Donde más se nota es en ${PARCHES[p].n}${sp.length ? ' (se fueron ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) + '; causa principal: ' + motivo(p, sp) + ')' : ''}.` : ''),
      p >= 0 ? [PARCHES[p].x, PARCHES[p].z] : KEN_XZ, -1, sp.slice(0, 6).map(nombre)); } }
  else { const k = umbral(dP, [10, 25, 50]); if (k) { const p = parcheCambio(1), sp = p >= 0 ? espParche(p, 1) : [], nm = ['10', '25', '50'][k - 1];
    add('fauna+', k, 'especies', `La fauna ocupa ${nm} % más lugares que en el año 1`, `Las especies ocupan ${nf(E.emaP)} pares especie–parche frente a ${nf(E.ref.pares)} en el año 1.` + (p >= 0 ? ` Donde más llegan es a ${PARCHES[p].n}${sp.length ? ': ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) : ''}.` : ''),
      p >= 0 ? [PARCHES[p].x, PARCHES[p].z] : KEN_XZ, 1, sp.slice(0, 6).map(nombre)); } }
  // 2 · una especie desaparece de toda Kennedy (calendario: espera turno)
  if (E.ev.length) { const e0 = E.ev[0], ns = E.ev.map(e => min1(e.nombre));
    add('ext-' + E.ev.map(e => e.especie).join('-'), 1, 'especies', E.ev.length > 1 ? `${ns.length} especies desaparecen de Kennedy` : `${e0.nombre} desaparece de Kennedy`,
      `${yLista(ns).replace(/^./, c => c.toUpperCase())} ya no ${E.ev.length > 1 ? 'están' : 'está'} en ningún parche de Kennedy. El último lugar fue ${(PARCHES.find(p => p.id === e0.parche) || {}).n || e0.parche}; causa: ${e0.motivo}.`,
      [e0.x, e0.z], -1, E.ev.map(e => e.nombre), true); }
  // 3 · una especie deja un humedal o parque grande (≥ 5 ha) que ocupaba, o llega a un parque donde no estaba (persistente: promedio > 0,9)
  if (RL) for (let p = 0; p < NP; p++) { const P = PARCHES[p]; if (P.ha < 2 && !/^mod/.test(P.t)) continue; for (let i = 0; i < NFA; i++) { const k = i * NP + p;
    if (P.ha >= 5 && RO[k] > 0.8 && E.emaO[k] < 0.1 && (s.red.mot[k] || 5) !== 5) add('salida-' + i + '-' + p, 1, 'especies', `${nombre(i)} deja ${P.n}`, `Vivía ahí en el año 1 y lleva varios meses sin aparecer; causa: ${MOTIVOS[s.red.mot[k] || 5]}.`, [P.x, P.z], -1, [nombre(i)]);
    else if (/^mod/.test(P.t) && RO[k] < 0.1 && E.emaO[k] > 0.9 && (RED.AVE[i] || PRE.POLI.includes(i))) add('llegada-' + i + '-' + p, 1, 'especies', `${nombre(i)} llega a ${P.n}`, `No estaba en el año 1 y ya vive ahí de forma estable${s.q[p] > 0 && /^mod/.test(P.t) ? ': el módulo de huertas se volvió hábitat' : ''}.`, [P.x, P.z], 1, [nombre(i)]); } }
  // 4 · polinizadores
  if (RL && E.ref.poli > 0) { const r = x.poliniz / E.ref.poli, k = umbral(r, [1.5, 2]);
    if (k) add('poli+', k, 'polinizadores', ['Los polinizadores aumentan a la mitad', 'Los polinizadores se duplican'][k - 1],
      `Abejas, colibríes y cucaracheros ocupan ${nf(x.poliniz)} pares especie–parche (en el año 1 ${nf(E.ref.poli)}), gracias a las huertas y parques con flor.`, KEN_XZ, 1, PRE.POLI.map(nombre));
    const kb = umbral(1 / Math.max(0.01, r), [1 / 0.75, 2]); if (kb) add('poli-', kb, 'polinizadores', kb === 1 ? 'Los polinizadores caen una cuarta parte' : 'Los polinizadores caen a la mitad',
      `Ocupan ${nf(x.poliniz)} pares especie–parche (en el año 1 ${nf(E.ref.poli)}).`, KEN_XZ, -1, PRE.POLI.map(nombre)); }
  // 5 · huertas (hitos) y techos montados
  { const h0 = st.h0 || 1, k = umbral(x.huertas / h0, [2, 10]);
    if (k) add('huertas', k, 'huertas', `Kennedy ya tiene ${nf(x.huertas)} huertas`, `Son ${['el doble', 'diez veces'][k - 1]} de las de hoy (${nf(h0)}); producen ${nf(o.prod * V.AÑO / 1000)} t de comida al año.`, KEN_XZ, 1, []);
    if (E.techos && s.supF >= 1) add('techos', 1, 'huertas', 'Todos los techos con huerta ya están montados', `${nf(E.techos.m2)} m² de cubiertas y balcones producen y son hábitat para polinizadores y aves.`, KEN_XZ, 1, [], true); }
  // 6 · comida
  { const z = o.zArg >= 0 ? ZONAS_XZ[o.zArg] : KEN_XZ, k = umbral(1 - x.comidaMin, [0.1, 0.2]);
    if (k) { st.short = true; add('comida', k, 'comida', k === 1 ? 'Empieza a faltar comida en un barrio' : 'Falta comida en Kennedy', `La zona peor servida recibe ${nf(x.comidaMin * 100)} % de lo que necesita${o.cierre ? ' (' + o.cierre.via + ' cerrada)' : ''}; ${nf(o.nBajo)} zonas reciben menos del 80 %.`, z, -1, []); }
    else if (st.short && x.comidaMin >= 0.97) { st.short = false; st.fired.delete('comida:1'); st.fired.delete('comida:2'); delete st.lvl.comida;
      add('comida-ok-' + sem, 1, 'comida', 'Vuelve a llegar la comida', `Todas las zonas reciben otra vez 97 % o más de lo que necesitan.`, z, 1, []); } }
  // 7 · residuos
  { const k = umbral(x.residuos, [0.7, 1]); if (k) add('residuos', k, 'residuos', k === 1 ? 'Se acumulan los orgánicos' : 'Los orgánicos desbordan el almacenamiento', `Los orgánicos sin tratar llegan al ${nf(x.residuos * 100)} % de la capacidad; con más basura aumentan las ratas.`, KEN_XZ, -1, ['Rata']); }
  // 8 · ruido y congestión de toda Kennedy
  { const d = x.ruidoDb - x.ruidoDb0, k = umbral(d, [1, 2, 3]);
    if (k) add('ruido+', k, 'ruido', `El ruido de las calles sube ${k} dB`, `El promedio de las calles pasa de ${nf(x.ruidoDb0, 1)} a ${nf(x.ruidoDb, 1)} dB; ${nf(x.callesRuidosas)} % de las calles son ruidosas (65 dB o más).${k === 3 ? ' +3 dB es el doble de energía sonora.' : ''}`, KEN_XZ, -1, []);
    const kb = umbral(-d, [1, 2]); if (kb) add('ruido-', kb, 'ruido', `El ruido de las calles baja ${kb} dB`, `El promedio de las calles pasa de ${nf(x.ruidoDb0, 1)} a ${nf(x.ruidoDb, 1)} dB.`, KEN_XZ, 1, []);
    const rc = x.congestion / TOMTOM.congestion, kc = umbral(rc, [1.25, 1.5, 2]);
    if (kc) add('cong+', kc, 'trafico', ['La congestión sube 25 %', 'La congestión sube 50 %', 'La congestión se duplica'][kc - 1],
      `Recorrer 10 km toma ${nf(x.tiempo10km, 1)} min (hoy ${nf(TOMTOM.min10km, 1)} min, TomTom 2025); congestión ${nf(x.congestion)} %. Circulan ${nf((x.trafico - 1) * 100)} % más vehículos que hoy.`, KEN_XZ, -1, []);
    const kd = umbral(1 / rc, [1 / 0.9]); if (kd) add('cong-', kd, 'trafico', 'La congestión baja 10 %', `Recorrer 10 km toma ${nf(x.tiempo10km, 1)} min (hoy ${nf(TOMTOM.min10km, 1)} min).`, KEN_XZ, 1, []); }
  // 9 · calendario: metro, Corabastos, cierre de vía, desmonte de bodegas
  if (E.metro && s.t === E.metro.desde) { const m = PRE.metro.cerca, xz = m.length ? [m.reduce((a, i) => a + PARCHES[i].x, 0) / m.length, m.reduce((a, i) => a + PARCHES[i].z, 0) / m.length] : KEN_XZ;
    add('metro', 1, 'metro', 'Empieza a operar el metro', `A 800 m del eje circulan ${nf(E.metro.red * 100)} % menos vehículos; el índice de tráfico queda en ${nf(x.trafico, 2)}.`, xz, 1, [], true); }
  if (E.mod.sinCora != null && s.t === E.mod.sinCora) add('cora-cierra', 1, 'corabastos', 'Corabastos deja de abastecer', 'Más del 94 % de lo que se vende en Bogotá entra por Corabastos; desde esta semana solo queda lo que producen las huertas.', CORA_XZ, -1, [], true);
  if (o.cierre && o.cierre.sem === 1 && o.cierre.on) add('cierre-' + sem, 1, 'trafico', `Se cierra la ${o.cierre.via}`, `Cierre de ${o.cierre.dur} semanas: las rutas desde Corabastos se alargan y llega menos comida.`, KEN_XZ, -1, [], true);
  if (o.cora && o.cora.desm > 0) { const nd = o.cora.desm, tot = o.cora.total || BODEGAS.length, k = nd >= tot ? 2 : 1, b = BODEGAS[nd - 1] || {};
    add('desm', k, 'corabastos', k === 1 ? 'Se desmonta la primera bodega junto a La Vaca' : 'Se desmontaron todas las bodegas junto a La Vaca',
      `${nf(nd)} de ${nf(tot)} bodegas desmontadas: ${nf(o.cora.m2)} m² liberados; ${nf(o.cora.borde)} m² de borde del humedal en restauración (madura en 3 años).`, [b.x || CORA_XZ[0], b.z || CORA_XZ[1]], 1, []); }
  // 9b · basura: ratas, humedales que pierden área, aves del borde de Corabastos
  { const Bs = E.bas, kr = umbral(Bs.ratas, [2, 3]);
    if (kr) add('ratas+', kr, 'residuos', ['Las ratas se duplican cerca de Corabastos', 'Las ratas se triplican cerca de Corabastos'][kr - 1],
      `Hay ${nf(x.basura.acumulada)} t de basura sin recoger alrededor de Corabastos (hoy ${nf(Bs.acum0)} t): se generan ${nf(x.basura.total_t_dia)} t/día en Kennedy y ${nf(x.basura.fraccionSinRecoger * 100)} % no se recoge.`, CORA_XZ, -1, ['Rata']);
    const kb = umbral(1 / Math.max(0.01, Bs.ratas), [1 / 0.75, 2]); if (kb) add('ratas-', kb, 'residuos', kb === 1 ? 'Bajan las ratas cerca de Corabastos' : 'Las ratas caen a la mitad cerca de Corabastos',
      `La basura acumulada alrededor de Corabastos baja a ${nf(x.basura.acumulada)} t (hoy ${nf(Bs.acum0)} t).`, CORA_XZ, 1, ['Rata']);
    for (let k = 0; k < HUM_P.length; k++) { const P = PARCHES[HUM_P[k]], perd = Bs.ha0[k] - Bs.ha[k], kh = umbral(perd, [1, 2]);
      if (kh) add('hum-' + P.id, kh, 'residuos', `${P.n} pierde ${[1, 2][kh - 1]} ha`, `La basura arrojada en su borde rellenó ${nf(perd, 1)} ha: quedan ${nf(Bs.ha[k], 1)} de ${nf(Bs.ha0[k], 1)} ha y su fauna tiene menos hábitat.`, [P.x, P.z], -1, []); }
    if (RL) { let a0 = 0, a1 = 0; const sp = []; for (const [p] of Bs.cerca) for (let i = 0; i < NFA; i++) { if (!RED.AVE[i]) continue; const kk = i * NP + p; a0 += RO[kk]; a1 += E.emaO[kk]; if (RO[kk] > 0.7 && E.emaO[kk] < 0.3) sp.push(i); }
      const da = a0 > 0 ? (1 - a1 / a0) * 100 : 0, ka = umbral(da, [10, 25]);
      if (ka && Bs.ratas > 1.1) add('avesCora', ka, 'especies', 'Las aves dejan el borde de Corabastos', `Las aves ocupan ${nf(da)} % menos lugares a 1 km de Corabastos${sp.length ? ' (se fueron ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) + ')' : ''}: las ratas, ${nf((Bs.ratas - 1) * 100)} % más que hoy, depredan nidos y la basura las espanta.`, CORA_XZ, -1, sp.map(nombre)); } }
  // 9d · estado actual que se degrada: árboles, bordes de humedal invadidos por basura, área funcional
  { const ap = x.arbolesPerdidos || 0, ka = umbral(ap, [0.05, 0.1]);
    if (ka) add('arboles', ka, 'especies', `Kennedy pierde ${ka === 1 ? 5 : 10} % de los árboles de sus parques`, `Talas por riesgo y por obras (metro, Av. 68, Primero de Mayo) que se compensan fuera de la localidad: la densidad de árboles de los parques baja de ${nf(E.arb0, 2)} a ${nf(x.arboles, 2)} y los parques pierden calidad como hábitat.`, KEN_XZ, -1, []);
    { let P = null; for (const Q of E.bas.pts) if (Q.fuente === 'humedal' && (!P || Q.acum / Q.acum0 > P.acum / P.acum0)) P = Q;
      const r = P ? P.acum / P.acum0 : 1, kh = umbral(r, [1.5, 2]), tot = E.bas.pts.filter(Q => Q.fuente === 'humedal').reduce((a, Q) => a + Q.acum, 0);
      if (kh) add('humbas', kh, 'residuos', kh === 1 ? `La basura invade el borde del ${P.nombre}` : 'La basura en los bordes de los humedales se duplica', `Hay ${nf(tot)} t de basura arrojada en los bordes de El Burro, La Vaca y Techo; en el ${P.nombre} llegan ${nf(P.t, 1)} t/día y el humedal queda con ${nf(E.bas.cal[P.hum] * 100)} % de su calidad y ${nf(E.bas.ha[P.hum], 1)} ha.`, [P.x, P.z], -1, []); }
    const kf = umbral(100 - x.humedalFuncional, [10]); if (kf) add('humfun', kf, 'especies', 'Los humedales pierden 10 % de su área funcional', `Entre rellenos y basura en los bordes, El Burro, La Vaca y Techo funcionan como ${nf(x.humedalFuncional)} % de lo que funcionan hoy; sus aves y anfibios tienen menos hábitat.`, KEN_XZ, -1, []); }
  // 9e · aviso previo y game over
  { const TIPO_R = { fauna: 'especies', habitat: 'especies', humedal: 'especies', abasto: 'comida', residuos: 'residuos', ruido: 'ruido', trafico: 'trafico' };
    const XZ_R = { humedal: (() => { const h = HUM_P[1] != null ? HUM_P[1] : HUM_P[0]; return h != null ? [PARCHES[h].x, PARCHES[h].z] : KEN_XZ; })() };
    const val = (k, v) => k === 'ruido' ? nf(v, 1) + ' dB más que hoy' : k === 'trafico' ? 'índice ' + nf(v, 2) : nf(v) + ' %';
    for (const R of REGLAS) { const v = E.vals[R.k]; if (v == null || E.go) continue;
      if (CERCA[R.k](v) && !MALO[R.k](v) && (R.k !== 'habitat' || E.ref.listo)) add('cerca-' + R.k, 1, TIPO_R[R.k], `Kennedy se acerca al game over: ${R.n.toLowerCase()}`, `${R.n}: ${val(R.k, v)} (game over si ${R.txt}).`, XZ_R[R.k] || KEN_XZ, -1, [], true); }
    if (E.go && E.go.sem === sem) add('gameover', 1, TIPO_R[E.go.regla], `Game over: ${E.go.motivo}`, `Regla «${(REGLAS.find(R => R.k === E.go.regla) || {}).n}» cumplida 4 semanas seguidas (valor ${val(E.go.regla, E.go.valor)}).`, XZ_R[E.go.regla] || KEN_XZ, -1, [], true); }
  // 9c · cierre gradual: desvíos
  if (E.cie && E.cie.fase >= 1 && x.cierre) { const D = DESVIOS[E.cie.via], nombres = D.desvio.map(id => DESVIOS.vias[id].n);
    let a0 = 0, a1 = 0; const sp = new Set(); for (const id of D.desvio) { const dd = DESVIOS.vias[id].dist; for (let p = 0; p < NP; p++) if (dd[p] <= DESVIO_SUP.RADIO && E.xDes[p] < 0.999) for (let i = 0; i < NFA; i++) if (RED.AVE[i] && s.occ[i * NP + p]) sp.add(nombre(i)); }
    add('desvio-' + E.cie.t0, 1, 'trafico', `El tráfico se desvía por la ${yLista(nombres)}`, `Con la ${D.n} cerrada del todo, por las vías de desvío pasan ${nf((E.cie.traf - 1) * 100)} % más vehículos (+${nf(x.cierre.ruidoExtraDb, 1)} dB); ${sp.size ? 'las aves de los parches junto a ellas (' + yLista([...sp].slice(0, 4).map(min1)) + ') pierden hasta ' + nf((1 - Math.min(...E.xDes)) * 100) + ' % de la calidad de su hábitat por el ruido.' : 'no hay parches con fauna junto a ellas.'}`,
      KEN_XZ, -1, [...sp].slice(0, 6), true); void a0; void a1; }
  // 10 · predio (plan parcial o instituto)
  const PR = x.predio; if (PR) { const PD = E.pred, xz = [PR.x, PR.z];
    if (E.plan) { const P = planEn(E, s.t), a = s.t / V.AÑO;
      if (Number.isInteger(a) && P.etapa <= E.plan.viv.length && (P.etapa === 1 || E.plan.viv[P.etapa - 1] >= 2000)) {
        add('etapa-' + P.etapa, 1, 'obra', `Plan parcial: empieza la etapa ${P.etapa}`, `Se abren ${PREDIO_PLAN.vias[P.etapa - 1]} tramos de vía nueva y empiezan ${nf(E.plan.viv[P.etapa - 1])} viviendas; ${nf(viajes(E, P).cam)} viajes de camión de obra al día.`, xz, -1, [], true); }
      if (s.t === E.plan.viv.length * V.AÑO) add('plan-fin', 1, 'obra', 'Termina la obra del plan parcial', `${nf(P.viv)} viviendas y ${nf(PR.habitantes)} habitantes nuevos; ${nf(PR.vias)} tramos de vía; ${nf(PR.vehiculosDia)} vehículos entran y salen al día.`, xz, -1, [], true); }
    const kt = umbral(PR.trafico, [1.5, 2]);
    if (kt) add('ptraf', kt, 'trafico', `Trancón en las entradas de ${E.plan ? 'Bavaria' : 'el instituto'}`, `Por la entrada más cargada del predio pasan ${nf((PR.trafico - 1) * 100)} % más vehículos que hoy; ${nf(PR.vehiculosDia)} al día salen o entran ${E.plan ? 'por las vías nuevas del plan' : 'con la carga del acopio'}.`, xz, -1, []);
    const dr = PR.ruidoDb - PR.ruidoDb0, kr = umbral(dr, [1, 3, 6]);
    if (kr) add('pruido', kr, 'ruido', `Sube el ruido en ${E.plan ? 'el predio de Bavaria' : 'el instituto'}`, `En las entradas del predio el ruido pasa de ${nf(PR.ruidoDb0, 1)} a ${nf(PR.ruidoDb, 1)} dB (+${nf(dr, 1)} dB) por los ${nf(PR.vehiculosDia)} vehículos diarios${PR.camionesDia ? ', ' + nf(PR.camionesDia) + ' de ellos camiones' : ''}.`, xz, -1, []);
    const dO = RL && E.ref.predOcc > 0 ? (PD.emaOcc / E.ref.predOcc - 1) * 100 : 0;
    if (dO < 0) { const k = umbral(-dO, [10, 25, 50]); if (k) { const F = PR.especiesFuera, av = F.filter(f => RED.AVE[RED.FI[f.especie]]), nr = F.filter(f => f.causa !== 'nidos').length, nn = F.filter(f => f.causa !== 'ruido').length;
      const tit = av.length && av.length >= F.length / 2 ? 'Las aves dejan el predio de Bavaria' : 'La fauna deja el predio de Bavaria';
      add('pfauna-', k, 'especies', k > 1 ? tit.replace('dejan', 'siguen dejando').replace('deja', 'sigue dejando') : tit,
        `La ocupación de los parches del predio y junto a él cae ${nf(-dO)} %. ` + (F.length ? `Se van ${yLista(F.slice(0, 4).map(f => min1(f.nombre)))}: ` + [nr ? `el ruido subió ${nf(dr, 1)} dB por los ${nf(PR.vehiculosDia)} vehículos diarios${E.plan && planEn(E, s.t).obra > 0 ? ' y el frente de obra' : ''}` : '', nn ? `se taló ${nf(PR.tala * 100)} % de los árboles del bosque (lugares de anidación)` : ''].filter(Boolean).join(' y ') + '.' : ''),
        xz, -1, F.map(f => f.nombre)); } }
    else { const k = umbral(dO, [25, 50]); if (k) { const sp = []; for (let i = 0; i < NFA; i++) if (PD.ema[i] > E.ref.pred[i] + 0.5) sp.push(i);
      add('pfauna+', k, 'especies', `Llegan especies a ${E.plan ? 'el predio' : 'la huerta del instituto'}`, `La ocupación de los parches del predio y junto a él sube ${nf(dO)} %${sp.length ? ': ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) : ''}.`, xz, 1, sp.map(nombre)); } } }

  // selección: pendientes de calendario + candidatos de umbral; uno por familia (el nivel más alto); enfriamiento por tipo
  const vivos = new Map();
  for (const c of st.pend) if (sem - c.sem0 <= 26) vivos.set(c.fam, c);
  for (const c of cand) { if (st.fired.has(c.fam + ':' + c.nivel)) continue; if (c.once) { c.sem0 = sem; if (!vivos.has(c.fam)) vivos.set(c.fam, c); continue; }
    const v = vivos.get(c.fam); if (!v || c.nivel > v.nivel) vivos.set(c.fam, c); }
  const pri = (c) => c.fam === 'gameover' ? 2 : /^cerca-/.test(c.fam) ? 1 : 0;
  const lista = [...vivos.values()].sort((a, b) => (pri(b) - pri(a)) || (b.once - a.once) || (b.nivel - a.nivel) || (a.fam < b.fam ? -1 : 1)), out = [];
  for (const c of lista) { if (out.length >= AVISOS_SUP.POR_SEM) break;
    const ck = /^(salida|llegada)-/.test(c.fam) ? 'local' : /^ext-/.test(c.fam) ? 'ext' : c.tipo, enf = ck === 'local' ? AVISOS_SUP.ENFRIA_ESP : AVISOS_SUP.ENFRIA;
    const sube = st.lvl[c.fam] != null && c.nivel > st.lvl[c.fam];
    if (!c.once && !sube && st.cd[ck] != null && sem - st.cd[ck] < enf) continue;
    if (!c.once && E.go && E.go.sem < sem && E.go.sem > 5 * V.AÑO) continue; // después de un game over tardío (año 5 en adelante) solo avisos de calendario y extinciones
    if (c.once && /^ext-/.test(c.fam) && st.cd[ck] != null && sem - st.cd[ck] < AVISOS_SUP.ENFRIA_EXT) continue; // extinciones: al menos dos años entre avisos
    for (let l = 1; l <= c.nivel; l++) st.fired.add(c.fam + ':' + l); st.lvl[c.fam] = c.nivel; st.cd[ck] = sem;
    out.push({ id: `s${E.id}-${sem}-${c.fam}-${c.nivel}`, sem, tipo: c.tipo, titulo: c.titulo, texto: c.texto, capa: CAPA[c.tipo], x: Math.round(c.x), z: Math.round(c.z), signo: c.signo, especies: c.especies }); }
  st.pend = [...vivos.values()].filter(c => c.once && !st.fired.has(c.fam + ':' + c.nivel) && sem - c.sem0 < 26);
  return out;
}
export { MOTIVOS };
