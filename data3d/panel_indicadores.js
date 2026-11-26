/* ============ TABLERO DE INDICADORES (columna derecha, aside#lp-tablero) ============
   Caja con tres vistas: «Indicadores» (los tres macromodelos de la tabla de la autora, docs/indicadores_macromodelos.md) · «Estrategias» (las 9 de la
   propuesta) · «Variables» (los deslizadores de sim_ui.js, #su-der, que limpio.js mueve aquí).
   Datos: R.hist (corrida actual, un I por semana) y R.ecoBase (la otra mitad del par, misma semilla). Los valores salen de indicadores_macro.js
   (funciones puras, verificadas en node). Rendimiento: solo se dibujan las tarjetas visibles (IntersectionObserver) de la vista abierta, una vez
   por semana simulada como mucho cada 300 ms, en tiempo ocioso y por partes; las gráficas reutilizan sus nodos SVG.
   Paleta (2026-11-25, colores URBIA + morados de la portada, validada en graficas_arte.js): con propuesta #7d6bff continua o llena / sin propuesta #f2694a
   punteada o hueca; límites #ffd27a rotulados.
   2026-11-26 (comentario de la autora: «los diagramas no se entienden»): cada tarjeta responde UNA pregunta (QA), dice en grande si el indicador
   sube o baja desde el año 1 y si eso mejora o empeora (flecha + palabra + color, nunca color solo), y cuánto más/menos tiene la propuesta.
   Formas simples (graficas_vivas.js): escala con bandas rotuladas, línea de 15 años con etiquetas al final, filas año 1 → hoy por especie,
   barras segmentadas, columnas por año. El diagrama de cuerdas de las interacciones no cambia. */
import { esc, num, año, tip, Linea, Escala, segBarras, flecha, columnasAño, barrasH, marcas, nodo, clave } from './graficas_vivas.js?v=3';
import { ARTE, leyenda, llave, contar, ponerTip } from './graficas_arte.js?v=1';
import { T, IND, INDK, MACROS, CLAVE, valor, clavePct, claveArea, acceso, ACCESO_SUP, ACCESO_R, hayEstaciones, SEM_REF } from './indicadores_macro.js?v=2';

const PASO = 2; // series de 15 años muestreadas cada 2 semanas
const ICO_FX = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M8.6 4.2c-1.4 0-2 .9-2.3 2.4L5 15.1c-.3 1.4-.9 2-2 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.2 8.4h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="m11.4 9 5 6.4M16.4 9l-5 6.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICO_MAPA_NO = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M1.5 3.5 5.5 2l5 1.5 4-1.5v10.5l-4 1.5-5-1.5-4 1.5z M5.5 2v10.5M10.5 3.5V14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/* ---------- ESTRATEGIAS (nombres y colores de estrategias.json / estrategias.js; qué hacen en el modelo: simulaciones12.js) ---------- */
const ESTR = [
  { id: 'E1', n: 'Bavaria Común', c: '#ef4444', hace: 'En el predio de Bavaria, en lugar del plan parcial: acopio de alimentos, formación de promotores y pasajes. Sin las torres del plan no hay fachadas de vidrio nuevas ni la tala de su bosque, y el suelo queda protegido.', ind: ['presion', 'verde', 'conect'] },
  { id: 'E2', n: 'Tiendas Barriales', c: '#38bdf8', hace: '460 tiendas, fruterías, panaderías y carnicerías existentes (OSM). En el modelo semanal no tienen parámetro propio: reparten lo que llega a la red local.', ind: ['cobertura'] },
  { id: 'E3', n: 'Corabastos reducido', c: '#fb923c', hace: 'Desmonte de bodegas por fases: cada borde liberado junto a La Vaca se restaura y madura en 3 años (parches «liberados»). A Corabastos se le pide menos porque la red de mercados toma parte de la carga.', ind: ['verde', 'conect', 'cobertura'] },
  { id: 'E4', n: 'Orgánicos y hongos', c: '#a78bfa', hace: 'Estaciones Circulares y distrito biotecnológico: los orgánicos separados se tratan como compost y sustrato que vuelve a las huertas en vez de ir a Doña Juana.', ind: ['aprov', 'saturacion'] },
  { id: 'E5', n: 'Corredor biótico', c: '#34d399', hace: 'Une El Burro, La Vaca y Techo: más árboles en los parques (+0,2 de densidad en 5 años), pasos de fauna con cerramiento en las vías principales (−54 % de atropellos al cruzar, años 2–5) y calles verdes pacificadas (30 % de las calles, −3 dB, años 2–8).', ind: ['conect', 'atrop', 'ruido', 'bienestar', 'shannon', 'clave', 'inter'] },
  { id: 'E6', n: 'Vivienda y actividad', c: '#e879f9', hace: '379 negocios en vivienda (OSM). En el modelo cuenta dentro de los instrumentos de gestión del suelo que frenan parte del alza de arriendos.', ind: ['presion'] },
  { id: 'E7', n: 'Plazas y conjuntos', c: '#facc15', hace: 'Plazas de mercado y conjuntos: los 35 mercados de barrio de la propuesta abren por fases (uno cada pocas semanas) y acercan la compra a pie.', ind: ['acceso', 'cobertura', 'autonomia'] },
  { id: 'E8', n: 'Red distribuida de producción alimentaria', c: '#84cc16', hace: 'Huertas en lotes baldíos, cubiertas y viviendas: módulos de huerta que se vuelven hábitat (parches nuevos) y producen comida local.', ind: ['autonomia', 'verde', 'clave', 'inter', 'conect'] },
  { id: 'E9', n: 'Manzanas del Cuidado', c: '#fb7185', hace: 'Jardines, salones comunales y centros de cuidado: asambleas que reparten recursos por necesidad y calles de la manzana pacificadas (parte del 30 % de calles verdes).', ind: ['ruido', 'bienestar'] }
];

/* ---------- FÓRMULAS (MathML) ---------- */
const mi = (x) => `<mi>${x}</mi>`, mn = (x) => `<mn>${x}</mn>`, mo = (x) => `<mo>${x}</mo>`;
const frac = (a, b) => `<mfrac><mrow>${a}</mrow><mrow>${b}</mrow></mfrac>`, sub = (a, b) => `<msub>${a}${b}</msub>`, sup = (a, b) => `<msup>${a}${b}</msup>`;
const mtxt = (t) => `<mtext>${t}</mtext>`, math = (x) => `<math display="block"><mrow>${x}</mrow></math>`;
const sum = `<munder><mo>∑</mo><mi>i</mi></munder>`;
const F = {
  shannon: { f: math(`${mi("H'")}${mo('=')}${mo('−')}${sum}${sub(mi('p'), mi('i'))}${mo('⁢')}${mi('ln')}${mo('⁡')}${sub(mi('p'), mi('i'))}${mo(',')}${mspace()}${sub(mi('p'), mi('i'))}${mo('=')}${frac(sub(mi('A'), mi('i')), `${sum}${sub(mi('A'), mi('i'))}`)}`),
    t: [['H′', 'diversidad de Shannon (nats)'], ['pᵢ', 'proporción de la especie i'], ['Aᵢ', 'hectáreas de hábitat que ocupa la especie i (proxy de sus individuos)']],
    como: 'De la ocupación especie × parche de la red trófica (23 especies de fauna × 71 parches): para cada especie se suman las hectáreas de los parches donde está. El modelo no cuenta individuos; con igual densidad por especie, los individuos son proporcionales al área ocupada (simulaciones12.js, biodiversidad.shannonArea).',
    fuente: 'Índice de Shannon (NIST, Dictionary of Algorithms and Data Structures). Cambio de fórmula documentado: antes pᵢ = parches ocupados, que iguala una cubierta de 0,1 ha con un humedal de 18 ha.' },
  clave: { f: math(`${mi('E')}${mo('=')}${frac(sub(mi('N'), mtxt('actual')), sub(mi('N'), mtxt('inicial')))}${mo('×')}${mn(100)}`),
    t: [['N actual', 'hectáreas ocupadas por la especie esta semana'], ['N inicial', `las del fin del año 1 (semana ${SEM_REF}), cuando el modelo ya se asentó`]],
    como: 'Una por grupo: abeja de miel, colibrí chillón y tingua moteada, con el área de los parches que ocupan (biodiversidad.areaEsp). El valor grande es el promedio de los tres.',
    fuente: 'Variación porcentual, adaptación del proyecto.' },
  inter: { f: math(`${mi('I')}${mo('=')}${sum}${sub(mi('interacciones'), mi('i'))}`),
    t: [['I', 'interacciones locales de la red biótica que ocurren esta semana'], ['interacciones', 'enlaces de la red (visita floral, depredación, dispersión…) cuyos dos extremos están en el mismo parche o a su alcance de dispersión']],
    como: 'Modelo semanal: territorio.red (simulaciones12.js, interLocal). El diagrama de cuerdas muestra en vivo los encuentros que ocurren en el 3D ahora (biotica.js): quién interactúa con quién y de qué tipo.',
    fuente: 'Conteo de eventos, definición operativa del proyecto.' },
  verde: { f: math(`${sub(mi('A'), mi('v'))}${mo('=')}${sub(mi('A'), mn(1))}${mo('+')}${sub(mi('A'), mn(2))}${mo('+')}${mo('⋯')}${mo('+')}${sub(mi('A'), mi('n'))}`),
    t: [['A_v', 'área verde total'], ['Aᵢ', 'superficie de cada zona verde: parques, humedales, bosque, módulos de huerta, bordes liberados y huertas de los hogares']],
    como: 'territorio.verde = Σ π·r² de los parches verdes (ind(s).verde) + las huertas de los hogares (50 m² cada una). 1 ha = 10.000 m².',
    fuente: 'Cálculo geométrico de superficies.' },
  conect: { f: math(`${mi('C')}${mo('=')}${frac(mtxt('parches conectados'), mtxt('parches totales'))}${mo('×')}${mn(100)}`),
    t: [['parches conectados', 'los del componente más grande de la red con enlaces de supervivencia ≥ 0,5 (no rotos por las vías)'], ['parches totales', 'todos los parches verdes con área']],
    como: 'ind(s).verde.resumen: nConectados / nParches. Un enlace vale la supervivencia al cruzar las vías entre los dos parches × la calidad del menor × su madurez. Los pasos de fauna (E5) suben esa supervivencia.',
    fuente: 'Indicador simplificado propio, inspirado en métricas de conectividad del paisaje (Saura y Pascual-Hortal 2007, Landscape and Urban Planning 83: 91–103).' },
  atrop: { f: math(`${mi('A')}${mo('=')}${sum}${sub(mi('atropellamientos'), mi('i'))}`),
    t: [['A', 'animales atropellados acumulados desde el año 1']],
    como: 'Cada parche ocupado por fauna terrestre emite un dispersante por semana; muere al cruzar con probabilidad 1 − e^(−c·Q), Q = vehículos/día de las vías que corta (Hels y Buchwald 2001). Cada vez que la suma llega a 1 se registra un atropello (ind(s).atropellos).',
    fuente: 'Conteo de eventos del simulador. Pasos de fauna: Rytwinski et al. 2016, PLoS ONE 11: e0166941 (−54 %).' },
  ruido: { f: math(`${sub(mi('L'), mtxt('Aeq'))}${mo('=')}${mn(10)}${mo('⁢')}${sub(mi('log'), mn(10))}${mo('⁡')}<mrow>${mo('(')}${frac(`${sum}${sup(mn(10), `<mrow>${sub(mi('L'), mi('i'))}${mo('/')}${mn(10)}</mrow>`)}`, mi('n'))}${mo(')')}</mrow>`),
    t: [['Lᵢ', 'nivel en dB(A) de cada celda de vía de 16 m'], ['n', 'número de celdas']],
    como: 'Promedio ENERGÉTICO de las mismas celdas del mapa de ruido (simulaciones12.js, ruidoLAeq): cada grupo de celdas se corre 10·log10(tráfico) dB y −3 dB en las calles pacificadas. Antes el tablero usaba el promedio aritmético (ruidoDb), que subestima las vías fuertes.',
    fuente: 'Nivel sonoro equivalente, FHWA e ISO 1996-1.' },
  bienestar: { f: math(`${mi('B')}${mo('=')}${frac(`${sum}${sub(mi('a'), mi('p'))}${mo('⁢')}${mi('b')}<mrow>${mo('(')}${sub(mi('L'), mi('p'))}${mo(')')}</mrow>`, `${sum}${sub(mi('a'), mi('p'))}`)}${mo('×')}${mn(100)}`) + math(`<mi>b</mi><mrow>${mo('(')}${mi('L')}${mo(')')}</mrow>${mo('=')}${mi('clip')}<mrow>${mo('(')}${mn(1)}${mo('−')}${frac(`${mi('L')}${mo('−')}${mn(50)}`, mn(25))}${mo(')')}</mrow>`),
    t: [['aₚ', 'aves presentes en el parche p (especie × parche)'], ['Lₚ', 'ruido en el parche p (dB(A)), el de su vía principal más cercana'], ['b(L)', '1 hasta 50 dB(A), baja en línea recta y llega a 0 en 75 dB(A)']],
    como: 'ind(s).avesRuido.bienestarFauna: pondera por la exposición real (cuántas aves hay en cada parche y cuánto ruido le llega). El modelo solo tiene efecto del ruido en las aves (no en abejas ni anfibios).',
    fuente: 'Shannon et al. 2016, «A synthesis of two decades of research documenting the effects of noise on wildlife», Biological Reviews 91: 982–1005: efectos desde ~40 dB(A), 20 % de los estudios bajo 50 dB(A). 75 dB(A) como pérdida total: supuesto (borde de vía principal; Reijnen et al. 1996).' },
  saturacion: { f: math(`${mi('S')}${mo('=')}${frac(mtxt('kg acumulados'), mtxt('capacidad máxima (kg)'))}${mo('×')}${mn(100)}`),
    t: [['kg acumulados', 'orgánicos pendientes de tratar en las Estaciones Circulares'], ['capacidad máxima', 'almacenamiento de las estaciones']],
    como: 'territorio.saturacion = pendientes / capacidadAlmacen; por estación: territorio.estaciones (par 03). Sin propuesta no hay Estaciones Circulares: lo recogido va al relleno Doña Juana y el indicador no aplica.',
    fuente: 'Porcentaje de ocupación de capacidad, adaptado al proyecto.' },
  aprov: { f: math(`${mi('R')}${mo('=')}${frac(mtxt('kg aprovechados'), mtxt('kg generados'))}${mo('×')}${mn(100)}`),
    t: [['kg aprovechados', 'orgánicos tratados en Estaciones Circulares (compost y sustrato)'], ['kg generados', 'orgánicos que produce Kennedy en la misma semana']],
    como: 'territorio.aprovechamiento = tratados / generados (sim_vida.js: o.desv / o.gen).',
    fuente: 'Tasa de desvío o aprovechamiento, metodología de la EPA (Facts and Figures about Materials, Waste and Recycling).' },
  llega: { f: math(`${mi('L')}${mo('=')}${frac(`${sub(mi('F'), mtxt('recibidos'))}${mo('+')}${sub(mi('O'), mtxt('otros'))}`, `${sub(mi('F'), mtxt('demandados'))}${mo('+')}${sub(mi('O'), mtxt('otros'))}`)}${mo('×')}${mn(100)}`),
    t: [['F', 'alimentos frescos que recibe / necesita Kennedy (0,65 kg/hab/día; Corabastos, mercados y autoconsumo)'], ['O', 'el resto de la comida y los otros canales: 1.100 − 702 t/día hoy, crece igual que los frescos; se supone que llega lo que se pide'], ['1.100 t/día', '1.080.742 hab × 1,02 kg/hab/día: toda la comida que llega hoy a Kennedy']],
    como: 'simulaciones12.js, rcPaso: comidaK.dem y comidaK.llega en todas las corridas. En la simulación 01 lo que no cabe en las bodegas de Corabastos no entra y baja lo que llega.',
    fuente: 'RAPE 2020 (1,02 kg/hab/día) y SED 2024 (1.080.742 hab.); DANE-SIPSA 2025 (frescos). No existe una medición oficial de toneladas que entran a la localidad: es demanda estimada (docs/fuentes_bodegas_residuos.md, §2).' },
  resK: { f: math(`${mi('R')}${mo('=')}${mn('922')}${mo('×')}${sup(mn('1,027'), mi('t'))}${mo('+')}${mn('0,19')}${mo('×')}<mrow>${mo('(')}${mi('C')}${mo('−')}${mn('1.100')}${mo(')')}</mrow>`) + math(`${mtxt('sin recoger')}${mo('=')}${mi('máx')}<mrow>${mo('(')}${mn(0)}${mo(',')}${mi('R')}${mo('−')}${mn('774')}${mo('−')}${mi('T')}${mo(')')}</mrow>`),
    t: [['R', 'residuos que genera Kennedy (t/día)'], ['t', 'años desde el inicio; 2,7 %/año (UAESP 2024–2026)'], ['C', 'comida que llega a Kennedy (t/día): más comida, más residuos'], ['0,19', 'parte de cada tonelada extra de comida que se desperdicia (UNEP 2024)'], ['774', 'recolección ordinaria fija (t/día)'], ['T', 'orgánicos que tratan las Estaciones Circulares (con propuesta)']],
    como: 'simulaciones12.js, rcPaso: residuosK.gen y residuosK.noRec. Lo que no se recoge va a puntos críticos (hoy 148 t/día). Game over de la simulación 01: 296 t/día sin recoger (generar 1.070 t/día sin propuesta) cuatro semanas seguidas. Con eso se degrada La Vaca: árboles e interacciones × (1 − 0,5·D). Con propuesta (simulación 01): 20 Estaciones Circulares de 20 t/día, una en cada sitio de mercado de la propuesta, que abren una cada 36 semanas desde el año 2 (400 t/día en el año 15); T no pasa del 51,3 % orgánico de R.',
    fuente: 'UAESP 2026 (6.769 t/día en Bogotá, 1.089 en puntos críticos), repartido por población: 922 t/día en Kennedy (derivado). UNEP Food Waste Index 2024. Umbral 2× los puntos críticos de hoy: criterio de diseño [supuesto]. Capacidad por estación: hasta 20 t/día, Centros Integrados de Recuperación de Recursos descentralizados (UNESCAP y Waste Concern; el primero trataba 3 t/día). Calendario y separación en la fuente suficiente: supuestos.' },
  cobertura: { f: math(`${mi('C')}${mo('=')}${mi('mín')}<mrow>${mo('(')}${mn(100)}${mo(',')}${frac(mtxt('kg recibidos'), mtxt('kg demandados'))}${mo('×')}${mn(100)}${mo(')')}</mrow>`),
    t: [['kg recibidos', 'alimentos que llegan a cada sector (Corabastos, mercados, huertas)'], ['kg demandados', 'lo que necesita su población']],
    como: 'Por sector: territorio.sectores[].valor (134 sectores de 500 m); Kennedy: territorio.cobertura, con tope de 100 %.',
    fuente: 'Porcentaje de satisfacción de demanda, adaptado al proyecto.' },
  autonomia: { f: math(`${mi('Au')}${mo('=')}${frac(mtxt('kg locales consumidos'), mtxt('kg demandados'))}${mo('×')}${mn(100)}`),
    t: [['kg locales', 'comida de las huertas de Kennedy que se consume en Kennedy'], ['kg demandados', 'demanda total de alimentos frescos']],
    como: 'territorio.autonomia (sim_vida.js: o.localConsumido / o.need).',
    fuente: 'Adaptación del concepto de autosuficiencia alimentaria de la FAO.' },
  acceso: { f: math(`${mi('Ac')}${mo('=')}${frac(mtxt('habitantes a ≤ 15 min de un mercado'), mtxt('habitantes totales'))}${mo('×')}${mn(100)}`),
    t: [['15 min', `a pie a 4,5 km/h = 1.125 m por la red; en línea recta 1.125 / 1,3 (circuidad) ≈ ${num(ACCESO_R)} m`], ['mercados', 'Corabastos, la Plaza Distrital de Kennedy y los mercados de barrio de la propuesta que ya abrieron'], ['habitantes', 'peso de cada sector = su demanda de alimentos (∝ población); Kennedy 1.080.742 hab.']],
    como: 'Nuevo en el tablero (indicadores_macro.js, acceso): distancia de cada sector al mercado abierto más cercano. Con propuesta los mercados abren por fases y el indicador sube.',
    fuente: 'Indicador de cobertura poblacional, adaptado al proyecto. Circuidad: Levinson y El-Geneidy 2009, Regional Science and Urban Economics 39: 732–738.' },
  presion: { f: math(`${mi('P')}${mo('=')}${frac(`${sub(mi('P'), mi('f'))}${mo('−')}${sub(mi('P'), mi('i'))}`, sub(mi('P'), mi('i')))}${mo('×')}${mn(100)}`),
    t: [['Pᵢ', 'índice de precio del suelo en la semana 1 (1 = hoy)'], ['P_f', 'índice de precio esta semana']],
    como: 'especulacion.indice (promedio de las zonas; sube junto al metro y a Bavaria, lo frena la protección del suelo de la propuesta).',
    fuente: 'Variación porcentual, no un índice específico de especulación.' }
};
function mspace() { return '<mspace width="0.8em"></mspace>'; }
/* mecanismos de la propuesta que mueven cada indicador (para el «Ver fórmula») */
const PROPM = {
  shannon: 'E5 + E8: los corredores y las huertas suman hábitat; las especies de humedal conservan su área y las generalistas no dominan tanto el área total.',
  clave: 'E8 huertas (flores para abejas y colibríes) y E5 corredor biótico (humedales conectados para la tingua).',
  inter: 'E8 y E5: más parches con flores y fauna, y conectados, son más relaciones locales.',
  verde: 'E8 módulos de huerta, E3 bordes liberados de Corabastos y E1 sin tala del bosque de Bavaria.',
  conect: 'E5: pasos de fauna (años 2–5) y conexiones vegetales; E8: módulos nuevos que sirven de escalones.',
  atrop: 'E5 pasos de fauna con cerramiento: −54 % de mortalidad al cruzar las vías principales, construidos de la semana 52 a la 260.',
  ruido: 'E5 + E9 calles verdes y pacificadas: 30 % de las calles con −3 dB, construidas de la semana 52 a la 416.',
  bienestar: 'E5 + E9 calles verdes y pacificadas (−3 dB en el 30 % de las calles, años 2–8); E3 menos camiones hacia Corabastos.',
  saturacion: 'E4: capacidad de tratamiento y almacenamiento de las Estaciones Circulares.',
  aprov: 'E4: las Estaciones Circulares tratan lo que se separa en la fuente.',
  cobertura: 'E7 mercados de barrio y E8 huertas reparten la demanda; Corabastos deja de ser el único camino.',
  llega: 'E7 mercados de barrio y E8 huertas: parte de la comida ya no pasa por las bodegas de Corabastos, que se llenan más despacio.',
  resK: 'E4: 20 Estaciones Circulares de barrio de 20 t/día (una cada 36 semanas desde el año 2) tratan orgánicos que ya no ocupan la recolección ordinaria; así lo sin recoger se queda cerca de los 148 t/día de hoy aunque la generación siga la tendencia de la ciudad.',
  autonomia: 'E8 red distribuida de producción alimentaria.',
  acceso: 'E7: 35 mercados de barrio que abren por fases cerca de los sectores peor servidos.',
  presion: 'E1 Bavaria Común y E6: suelo protegido e instrumentos de gestión del suelo.'
};

/* ---------- LA PREGUNTA de cada tarjeta (subtítulo en lenguaje llano) y qué mide exactamente ---------- */
const QA = {
  inter: { q: '¿Cuántas relaciones entre especies ocurren?', e: 'Polinizar, comer, dispersar semillas… entre especies que comparten parche. Más relaciones = ecosistema más vivo.' },
  shannon: { q: '¿Qué tan variada y equilibrada es la fauna?', e: 'Junta cuántas especies de fauna hay y qué tan parejo se reparten el hábitat. Más alto = más especies y mejor repartidas; 0 = una sola especie.' },
  clave: { q: '¿Abejas, colibríes y tinguas ganan o pierden hábitat?', e: 'Hectáreas que ocupa cada especie frente al fin del año 1 (= 100 %). La cifra grande es el promedio de las tres.' },
  verde: { q: '¿Cuántas hectáreas verdes tiene Kennedy?', e: 'Parques, humedales, bosque, módulos de huerta, bordes liberados y huertas de los hogares.' },
  conect: { q: '¿Qué parte de las zonas verdes forma una sola red para la fauna?', e: '% de parches verdes unidos al grupo conectado más grande, sin vías que corten el paso.' },
  atrop: { q: '¿Cuántos animales mueren atropellados?', e: 'La cifra grande es el total desde el año 1; las columnas, cuántos murieron cada año.' },
  ruido: { q: '¿Cuánto ruido hay en las vías?', e: 'Nivel promedio en dB(A). Las bandas dicen qué le hace ese ruido a la fauna.' },
  bienestar: { q: '¿Qué tan a salvo del ruido están las aves?', e: '100 % = todas viven bajo 50 dB(A); 0 % = todas sobre 75 dB(A). Pesa más el parche con más aves.' },
  saturacion: { q: '¿Qué tan llenas están las Estaciones Circulares?', e: 'Orgánicos acumulados sin tratar frente a lo que caben. Sobre 85 % = alerta.' },
  aprov: { q: '¿Qué parte de los orgánicos se vuelve compost?', e: 'Del total de orgánicos que genera Kennedy cada día: cuánto se aprovecha, cuánto va al relleno y cuánto queda sin recoger.' },
  llega: { q: '¿Llega toda la comida que Kennedy necesita?', e: 'Toda la comida de Kennedy (≈1.100 t/día hoy): la que llega frente a la demanda, que sube cada año.' },
  resK: { q: '¿Cuántos residuos genera Kennedy y cuánto falta para el game over?', e: 'Toneladas al día. Lo que pasa de 774 t/día no se recoge y va a puntos críticos; en 1.070 t/día (296 sin recoger) es game over en la simulación 01.' },
  cobertura: { q: '¿Qué parte de la comida que necesita Kennedy le llega?', e: 'Kg de alimentos recibidos frente a kg necesitados, con tope de 100 %.' },
  autonomia: { q: '¿Qué parte de la comida fresca se cultiva en Kennedy?', e: 'Comida de huertas de Kennedy consumida en Kennedy frente a toda la demanda.' },
  acceso: { q: '¿Cuántos habitantes tienen un mercado a 15 min a pie?', e: '15 min a pie ≈ 865 m en línea recta. Cuenta Corabastos, la Plaza de Kennedy y los mercados de barrio abiertos.' },
  presion: { q: '¿Cuánto ha subido el precio del suelo?', e: 'Cambio del índice de precio desde la semana 1. Subir = más riesgo de desplazar hogares.' }
};
const UD = { 'anim.': 'animales' };

const CSS = `
#lp-tablero.pi-montado{padding:0!important}
.pi{--pi-pad:12px;--pi-sur:#1e2422;--tb-sur:#1b1f24;--tb-grid:rgba(255,255,255,.06);--tb-axis:rgba(255,255,255,.2);--pi-v:#7d6bff;--pi-v2:#a99cff;--pi-v3:#d4ceff;--pi-ink:#f4f3ef;--pi-num:'Barlow Condensed','Arial Narrow',system-ui,sans-serif;font:400 12px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#f1f3ee);font-variant-numeric:tabular-nums;text-shadow:none;min-width:0}
.pi *{box-sizing:border-box}
.pi-hd{position:sticky;top:0;z-index:4;padding:12px var(--pi-pad) 0;background:linear-gradient(180deg,rgba(26,30,34,.74),rgba(22,26,30,.62));border-bottom:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(24px) saturate(1.8);backdrop-filter:blur(24px) saturate(1.8)}
.pi-l1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.pi-tit{font:500 15px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.14em;text-transform:uppercase}
.pi-sem{font:400 10.5px/1.2 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
.pi-sem b{font-weight:500;color:var(--pi-ink)}
.pi-esc{margin:4px 0 0;font-size:11px;color:var(--ui-tx2,#c9cfc4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-esc b{font-weight:600;color:var(--pi-ink)}
.pi-go{margin:6px 0 0;padding:5px 8px;border-radius:8px;border:1px solid rgba(255,79,123,.5);background:rgba(255,79,123,.1);font-size:11px;line-height:1.35}
.pi-tabs{display:flex;margin:10px calc(-1 * var(--pi-pad)) 0;padding:0 var(--pi-pad);border-top:1px solid rgba(255,255,255,.07)}
.pi-tab{all:unset;box-sizing:border-box;position:relative;flex:1;text-align:center;padding:10px 4px 9px;cursor:pointer;font:500 13px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
.pi-tab:hover,.pi-tab[aria-selected=true]{color:var(--pi-ink)}
.pi-tab[aria-selected=true]::after{content:'';position:absolute;left:12%;right:12%;bottom:0;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--pi-v),var(--pi-v3))}
.pi-tab:focus-visible{outline:1px solid var(--pi-v2);outline-offset:-3px;border-radius:6px}
.pi-nav{display:flex;gap:4px;margin:0 calc(-1 * var(--pi-pad));padding:8px var(--pi-pad);overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,.06)}
.pi-nav[hidden]{display:none}
.pi-nav button{all:unset;box-sizing:border-box;flex:none;display:inline-flex;align-items:baseline;gap:6px;padding:5px 11px 5px 6px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:500 11px/1 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-nav button i{font:400 9.5px/1 var(--ui-mono,'JetBrains Mono',monospace);font-style:normal;color:var(--pi-v2);padding:2px 5px;border-radius:99px;background:rgba(125,107,255,.14)}
.pi-nav button:hover,.pi-nav button.on{border-color:rgba(169,156,255,.6);color:var(--pi-ink);background:rgba(125,107,255,.1)}
.pi-nav button:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-ley{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:10px;color:var(--ui-tx2,#c9cfc4);padding:8px var(--pi-pad) 0}
.pi-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-ley b{font-weight:600;color:var(--pi-ink)}
.pi-v{padding:4px var(--pi-pad) 18px}
.pi-v[hidden]{display:none}
.pi-vacio{font-size:11.5px;color:var(--ui-tx2,#c9cfc4);padding:16px var(--pi-pad)}
.pi-mac{scroll-margin-top:var(--pi-hd,120px)}
.pi-mac>h2{margin:18px 0 8px;display:grid;grid-template-columns:auto 1fr;align-items:end;column-gap:9px;font:500 13px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--pi-ink)}
.pi-mac>h2 i{grid-row:span 2;font:300 30px/.85 var(--pi-num);font-style:normal;color:var(--pi-v3)}
.pi-mac>h2 small{font:400 10px/1.3 var(--ui-sans,'Inter',sans-serif);letter-spacing:.02em;text-transform:none;color:var(--ui-tx3,#a5ae9f)}
.pi-card{position:relative;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.12);padding:10px 11px 9px;margin:0 0 8px;scroll-margin-top:var(--pi-hd,120px);container-type:inline-size}
.pi-card.pi-flash{animation:pi-flash 1.2s ease}@keyframes pi-flash{0%{border-color:var(--pi-v2)}100%{border-color:rgba(255,255,255,.13)}}
.pi-q{margin:6px 0 0;font:600 12.5px/1.3 var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink)}
.pi-pol{display:inline-flex;align-items:center;gap:3px;margin-left:4px;padding:1px 6px 1px 4px;border-radius:99px;border:1px solid rgba(255,255,255,.16);font:500 9.5px/1.4 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);white-space:nowrap;vertical-align:1px}
.pi-pol .tb-fl{width:10px;height:10px}
.pi-e{margin:2px 0 0;font-size:10.5px;line-height:1.4;color:var(--ui-tx3,#a5ae9f)}
.pi-top{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;margin:8px 0 4px}
.pi-top>.pi-val{flex:0 1 auto}.pi-top>.pi-dir{flex:1 1 190px}
.pi-dir,.pi-vs{display:flex;align-items:flex-start;gap:7px;min-width:0}
.pi-dir>i,.pi-vs>i{flex:none;display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;border:1px solid rgba(255,255,255,.16);color:var(--ui-tx2,#c9cfc4);background:rgba(255,255,255,.04)}
.pi-dir>i.ok,.pi-vs>i.ok{color:#5be08f;border-color:rgba(91,224,143,.5);background:rgba(91,224,143,.12)}
.pi-dir>i.mal,.pi-vs>i.mal{color:#ff6b6b;border-color:rgba(255,107,107,.5);background:rgba(255,107,107,.12)}
.pi-dir>span,.pi-vs>span{min-width:0;font-size:11px;line-height:1.3;color:var(--ui-tx2,#c9cfc4)}
.pi-dir b{font:600 15px/1.15 var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink)}
.pi-vs b{font-weight:600;color:var(--pi-ink)}
.pi-dir em,.pi-vs em{font-style:normal;font-weight:600;color:var(--pi-ink);white-space:nowrap}
.pi-dir small,.pi-vs small{display:block;font:400 10px/1.35 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f)}
.pi-vs{margin:2px 0 6px;padding:6px 0 0;border-top:1px solid rgba(255,255,255,.08)}
.pi-vs>i{width:20px;height:20px;border-radius:6px}
.pi-hecho{margin:4px 0 0;font-size:10.5px;line-height:1.45;color:var(--ui-tx2,#c9cfc4)}
.pi-hecho b{font-weight:600;color:var(--pi-ink)}
.pi-sp{margin:0 0 7px}
.pi-sph{display:flex;flex-wrap:wrap;align-items:center;gap:3px 6px;font-size:10.5px;color:var(--ui-tx2,#c9cfc4)}
.pi-sph>b{flex-basis:100%;font:600 12px var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink)}.pi-c2{display:inline-flex;align-items:center;gap:4px;padding:1px 7px 1px 3px;border-radius:99px;border:1px solid rgba(255,255,255,.14);white-space:nowrap}
.pi-c2 .tb-fl{width:12px;height:12px}
.pi-c2.ok .tb-fl{color:#5be08f}.pi-c2.mal .tb-fl{color:#ff6b6b}
.pi-c2 svg:first-child:not(.tb-fl){flex:none}
.pi-c2 b{font:500 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi svg.tb-svg text.tb-bnd{font-size:8.5px;fill:rgba(244,243,239,.78);letter-spacing:.02em}
.pi svg.tb-svg text.tb-seg{font:500 9px var(--ui-mono,'JetBrains Mono',monospace)}
.pi-ch{display:flex;align-items:center;gap:8px}
.pi-n{flex:none;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;border:1px solid rgba(169,156,255,.45);font:500 9.5px/1 var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-v3)}
.pi-ch h3{flex:1;min-width:0;margin:0;font:500 12.5px/1.15 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
.pi-fx{all:unset;box-sizing:border-box;flex:none;display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px 0 6px;border-radius:99px;border:1px solid rgba(255,255,255,.13);font:500 10px/1 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer;white-space:nowrap}
.pi-fx:hover,.pi-fx[aria-expanded=true]{color:var(--pi-ink);border-color:rgba(169,156,255,.7);background:rgba(125,107,255,.14)}
.pi-fx:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
@container (max-width:300px){.pi-fx span{display:none}}
.pi-val{display:flex;align-items:baseline;flex-wrap:wrap;gap:0 6px;margin:0;min-width:0}
.pi-val .v{font:400 36px/.9 var(--pi-num);letter-spacing:.005em;color:var(--pi-ink);font-variant-numeric:proportional-nums}
.pi-val .rn{flex-basis:100%;font:400 9.5px/1.3 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f);margin-top:3px}
.pi-val small{font:400 13px var(--pi-num);letter-spacing:.06em;color:var(--ui-tx3,#a5ae9f);margin-left:-3px;text-transform:uppercase}
.pi-viz{min-width:0;overflow:hidden}
.pi-art{margin:2px 0 0}
.pi-art[hidden]{display:none}
.pi svg.tb-svg{display:block;overflow:visible;touch-action:pan-y;max-width:100%;height:auto}
.pi svg.tb-svg text{font:9px var(--ui-sans,'Inter',system-ui,sans-serif);fill:var(--ui-tx3,#a5ae9f)}
.pi svg.tb-svg text.tb-tn{fill:var(--ui-tx2,#c9cfc4);font-size:9.5px}
.pi svg.tb-svg text.tb-tv,.pi svg.tb-svg text.ar-tv{fill:var(--pi-ink);font:500 9.5px var(--ui-mono,'JetBrains Mono',monospace)}
.pi svg.tb-svg text.ar-tk{font-size:8.5px;fill:rgba(244,243,239,.5)}
.pi svg.tb-svg text.ar-tk.b{fill:rgba(244,243,239,.8);font-weight:500}
.pi svg.tb-svg text.ar-ln{font-size:10.5px;fill:var(--ui-tx2,#c9cfc4)}
.pi svg.tb-svg text.ar-halo{paint-order:stroke;stroke:#1b1f24;stroke-width:3px;stroke-linejoin:round}
.pi svg.tb-svg text.ar-c1{font:300 21px var(--pi-num);fill:var(--pi-ink);letter-spacing:.02em}
.pi svg.tb-svg text.ar-c2{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;fill:rgba(244,243,239,.55)}
.pi svg.tb-svg:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px;border-radius:3px}
.pi .tb-fin{transition:cx .3s ease,cy .3s ease}
.pi .ar-an{transition:r .6s cubic-bezier(.2,.7,.2,1),cx .6s cubic-bezier(.2,.7,.2,1),cy .6s cubic-bezier(.2,.7,.2,1),d .5s ease}
.pi .ar-rot{transition:transform .7s cubic-bezier(.3,1.25,.4,1)}
.pi .ar-liq{transition:transform .8s cubic-bezier(.2,.7,.2,1)}
@media (prefers-reduced-motion:reduce){.pi .ar-an,.pi .ar-rot,.pi .ar-liq,.pi .tb-fin{transition:none}}
.pi [data-tt]{cursor:crosshair}
.ar-ley{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:10px;color:var(--ui-tx2,#c9cfc4);margin:5px 0 0}
.ar-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.ar-ley b{font-weight:500;color:var(--pi-ink)}
.pi-sub{font-size:10px;line-height:1.4;color:var(--ui-tx3,#a5ae9f);margin:4px 0 0}
.pi-sub b{font-weight:600;color:var(--pi-ink)}
.pi-tira{margin:10px 0 0;padding-top:6px;border-top:1px dashed rgba(255,255,255,.08)}
.pi-tl{display:block;font:400 8.5px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(244,243,239,.42);margin:0 0 2px}
.pi-cuerda{position:relative;margin:4px 0 0}
.pi-cuerda canvas{display:block;width:100%!important;max-width:430px;margin:2px auto 0}
.pi-hero{background:radial-gradient(90% 50% at 50% 55%,rgba(125,107,255,.12),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025));border-color:rgba(169,156,255,.3)}
.pi-hero .pi-ch h3{font-size:14px;color:var(--pi-ink)}
.pi-cuerda .pie{font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#c9cfc4);margin:4px 0 0;min-height:2.8em}
.pi-tipos{display:flex;flex-wrap:wrap;gap:3px 10px;margin:6px 0 4px;font-size:10px;color:var(--ui-tx2,#c9cfc4)}
.pi-tipos span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-tipos i{width:9px;height:9px;border-radius:50%;flex:none}
.pi-tipos b{font:500 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi-enc{display:flex;align-items:baseline;gap:8px;font:400 10.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.pi-enc b{font:300 30px/1 var(--pi-num);color:var(--pi-v3)}
.pi-dos{display:grid;grid-template-columns:150px minmax(0,1fr);gap:6px;align-items:center}
@container (max-width:330px){.pi-dos{grid-template-columns:1fr}.pi-dos>div:first-child svg{margin:0 auto}}
.pi-form{margin:8px 0 2px;padding:11px 11px 9px;border-radius:12px;background:linear-gradient(180deg,rgba(125,107,255,.1),rgba(255,255,255,.03));border:1px solid rgba(169,156,255,.22)}
.pi-form[hidden]{display:none}
.pi-form math{font-size:13.5px;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink);margin:2px 0 8px;max-width:100%}
.pi-form math :is(mi,mn,mo,mtext){font-family:var(--ui-sans,'Inter',sans-serif);text-transform:none;font-style:normal}
.pi-form math mi{color:var(--pi-v3)}
.pi-form h4{margin:9px 0 3px;font:500 10px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--pi-v2)}
.pi-form dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:11px}
.pi-form dt{font:500 11px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-v3);white-space:nowrap}
.pi-form dd{margin:0;color:var(--ui-tx2,#c9cfc4)}
.pi-form table{width:100%;border-collapse:collapse;font-size:10.5px}
.pi-form td,.pi-form th{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.07);text-align:right;font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi-form th{font:500 9.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f)}
.pi-form td:first-child,.pi-form th:first-child{text-align:left;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.pi-form p{margin:0;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
/* estrategias */
.pi-est{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.pi-est li{border:1px solid rgba(255,255,255,.13);border-radius:14px;padding:10px 11px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))}
.pi-est li.on{border-color:var(--c)}
.pi-est .h{display:flex;align-items:center;gap:8px}
.pi-est .h i{flex:none;width:10px;height:10px;border-radius:50%;background:var(--c)}
.pi-est .h b{flex:1;min-width:0;font:500 12.5px/1.25 var(--ui-sans,'Inter',sans-serif)}
.pi-est .h small{font:400 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f)}
.pi-est p{margin:5px 0 6px;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
.pi-est .ch{display:flex;flex-wrap:wrap;gap:4px}
.pi-est .ch button,.pi-est .mapa{all:unset;box-sizing:border-box;padding:3px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:400 10.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-est .ch button:hover,.pi-est .mapa:hover{color:var(--pi-ink);border-color:var(--pi-v2)}
.pi-est .mapa{display:inline-flex;align-items:center;gap:5px;flex:none}
.pi-est .mapa[aria-pressed=true]{color:var(--pi-ink);border-color:var(--c);background:rgba(255,255,255,.06)}
.pi-est :is(button,.mapa):focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-int{font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4);margin:10px 0 0}
/* variables (sim_ui.js #su-der dentro del tablero) */
html.limpio body #lp-tablero #su-der{position:static!important;display:block!important;width:auto!important;max-height:none!important;overflow:visible!important;margin:8px 0 0!important;padding:0!important;background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;font-family:var(--ui-sans)!important;z-index:auto!important}
html.limpio body #lp-tablero #su-der > h4{margin:12px 0 8px!important;font:500 13px/1 var(--ui-tit)!important;letter-spacing:.1em!important;text-transform:uppercase;color:var(--ui-tx2)!important;opacity:1}
html.limpio body #lp-tablero #su-der > h4.lp-par{color:var(--ui-tx)!important;margin-top:4px!important}
html.limpio body #lp-tablero #su-der .pre{font:400 11.5px/1.45 var(--ui-sans)!important;color:var(--ui-tx2)!important;opacity:1!important}
html.limpio body #lp-tablero #su-der .lp-det>summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}
html.limpio body #lp-tablero #su-der .lp-det>summary::-webkit-details-marker{display:none}
html.limpio body #lp-tablero #su-der .lp-dt{font:500 13px/1 var(--ui-tit);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx)}
html.limpio body #lp-tablero #su-der .lp-ds{flex:1;min-width:0;text-align:right;font:400 10.5px/1.2 var(--ui-mono);color:var(--ui-tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tb-tip{position:fixed;z-index:10050;pointer-events:none;display:none;min-width:140px;max-width:270px;padding:8px 10px;border-radius:11px;background:linear-gradient(180deg,rgba(28,26,48,.97),rgba(16,17,24,.97));border:1px solid rgba(169,156,255,.35);box-shadow:0 12px 30px rgba(0,0,0,.5);color:#f4f3ef;font:11px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);font-variant-numeric:tabular-nums}
#tb-tip .t{color:#d4ceff;font-size:10px;letter-spacing:.02em;margin-bottom:3px}
#tb-tip .r{display:flex;align-items:center;gap:6px;white-space:nowrap}
#tb-tip .r b{font:500 11px var(--ui-mono,'JetBrains Mono',monospace)}
#tb-tip .r span{color:#b9bccb}
`;

/* ---------- utilidades ---------- */
const fija = (e, at) => { for (const k in at) { const v = String(at[k]); if (e.getAttribute(k) !== v) e.setAttribute(k, v); } };
const sig = (x, d) => { const r = +Math.abs(x).toFixed(d); return (r === 0 ? '±' : x > 0 ? '+' : '−') + num(Math.abs(x), d); };

export function iniciarPanelIndicadores({ R, getM, getFIN }) {
  if (!document.getElementById('pi-css')) { const st = document.createElement('style'); st.id = 'pi-css'; st.textContent = CSS; document.head.appendChild(st); }
  ponerTip((html, x, y) => (html == null ? tip().ocultar() : tip().mostrar(html, x, y)));
  let root = null, wrap = null, hd = null, vista = 'ind', simHecho, H0 = null, nHecho = -1, nBase = -1, ultimo = 0, sucio = true, pendiente = false, espera0 = performance.now(), goHecho = null;
  const CACHE = new Map(), cards = new Map(); let io = null;

  function montar() {
    let s = document.getElementById('lp-tablero');
    if (!s && performance.now() - espera0 > 6000) { s = document.createElement('aside'); s.id = 'lp-tablero'; s.setAttribute('aria-label', 'Tablero'); s.style.cssText = 'position:fixed;top:66px;right:14px;bottom:14px;width:min(440px,92vw);overflow-y:auto;z-index:40;background:var(--ui-glass,rgba(22,27,25,.9));border-radius:16px'; document.body.appendChild(s); }
    if (!s) return false;
    if (s !== root || !wrap || !s.contains(wrap)) { root = s; s.classList.add('pi-montado'); s.querySelectorAll(':scope > .tb, :scope > .pi').forEach((e) => e.remove()); wrap = document.createElement('div'); wrap.className = 'pi'; root.appendChild(wrap); esqueleto();
      root.addEventListener('pointermove', (e) => { const g = e.target.closest && e.target.closest('[data-tt]'); if (g && !e.target.closest('svg.tb-lin, svg.ar-rad')) { const [t0, ...rs] = g.getAttribute('data-tt').split('|'); tip().mostrar(`<div class="t">${esc(t0)}</div>${rs.map((x) => `<div class="r">${esc(x)}</div>`).join('')}`, e.clientX, e.clientY); } else if (!e.target.closest || !e.target.closest('svg.tb-lin, svg.ar-rad')) tip().ocultar(); });
      root.addEventListener('pointerleave', () => tip().ocultar());
      if ('ResizeObserver' in window) new ResizeObserver(() => { sucio = true; if (hd) wrap.style.setProperty('--pi-hd', hd.offsetHeight + 8 + 'px'); }).observe(wrap); }
    return true;
  }

  /* ---------- esqueleto ---------- */
  const VISTAS = [['ind', 'Indicadores'], ['est', 'Estrategias']]; /* las variables van en el acordeón de cada simulación (panel izquierdo, limpio.js) */
  function esqueleto() {
    wrap.innerHTML = `<header class="pi-hd"><div class="pi-l1"><span class="pi-tit">Tablero en vivo</span><span class="pi-sem"></span></div><p class="pi-esc"></p><p class="pi-go" hidden></p>`
      + `<div class="pi-tabs" role="tablist" aria-label="Contenido del tablero">${VISTAS.map(([id, n]) => `<button type="button" role="tab" class="pi-tab" id="pi-t-${id}" data-v="${id}" aria-selected="${id === vista}" tabindex="${id === vista ? 0 : -1}">${n}</button>`).join('')}</div>`
      + `<nav class="pi-nav" aria-label="Macromodelos">${MACROS.map((m, i) => `<button type="button" data-m="${m.id}"><i>0${i + 1}</i>${m.c}</button>`).join('')}</nav></header>`
      + `<div class="pi-v" role="tabpanel" id="pi-v-ind" aria-labelledby="pi-t-ind"${vista === 'ind' ? '' : ' hidden'}><div class="pi-ley" style="padding:8px 0 0"><span>${llave('lin', ARTE.con)}Con propuesta</span><span>${llave('pun', ARTE.sin)}Sin propuesta</span><span class="pi-run"></span></div><p class="pi-vacio" hidden></p><div class="pi-macs"></div></div>`
      + `<div class="pi-v" role="tabpanel" id="pi-v-est" aria-labelledby="pi-t-est"${vista === 'est' ? '' : ' hidden'}></div>`
      ;
    hd = wrap.querySelector('.pi-hd');
    const tl = wrap.querySelector('.pi-tabs');
    tl.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) elegir(b.dataset.v); });
    tl.addEventListener('keydown', (e) => { const ids = VISTAS.map((v) => v[0]), i = ids.indexOf(vista), k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key]; if (k == null) return; e.preventDefault();
      const j = Math.max(0, Math.min(ids.length - 1, k === -99 ? 0 : k === 99 ? ids.length - 1 : i + k)); elegir(ids[j]); wrap.querySelector(`#pi-t-${ids[j]}`).focus(); });
    wrap.querySelector('.pi-nav').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const m = wrap.querySelector(`#pi-m-${b.dataset.m}`); if (m) m.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
    construirIndicadores(); construirEstrategias();
    if (vista !== 'ind') wrap.querySelector('.pi-nav').hidden = true;
    dispatchEvent(new Event('pi-listo'));
  }
  function elegir(id) {
    if (id === vista) return; vista = id;
    wrap.querySelectorAll('[role=tab]').forEach((b) => { const on = b.dataset.v === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    wrap.querySelectorAll('.pi-v').forEach((p) => { p.hidden = p.id !== 'pi-v-' + id; });
    wrap.querySelector('.pi-nav').hidden = id !== 'ind'; tip().ocultar(); root.scrollTop = 0; sucio = true; ultimo = 0; programar();
  }

  /* ---------- contexto de un dibujo ---------- */
  const ctxDe = () => {
    const H = R.hist, n = H.length, I = H[n - 1], B = R.ecoBase || R.base || null, prop = !!(R.def && R.def.propuesta), M = getM();
    const W = Math.max(220, Math.floor((wrap.querySelector('.pi-macs').clientWidth || 360) - 24));
    const Bk = B && B.length ? B[Math.min(n, B.length) - 1] : null;
    return { H, n, I, B, Bk: Bk && Bk.sem === I.sem ? Bk : null, prop, M, FIN: getFIN(), W, CA: { H, M }, CB: { H: B || [], M }, I1: H[Math.min(SEM_REF, n) - 1] };
  };
  function serie(c, k, f) {
    let S = CACHE.get(k); if (!S || S.H !== c.H) { S = { H: c.H, a: [], B: null, b: [] }; CACHE.set(k, S); }
    for (let i = S.a.length * PASO; i < c.n; i += PASO) S.a.push(f(c.H[i], c.CA));
    if (S.B !== c.B) { S.B = c.B; S.b = []; }
    if (c.B) for (let i = S.b.length * PASO; i < Math.min(c.B.length, c.n); i += PASO) S.b.push(f(c.B[i], c.CB));
    const xs = S.a.map((_, j) => j * PASO + 1), a = S.a.slice(), b = S.a.map((_, j) => (j < S.b.length ? S.b[j] : null)), u = c.n - 1;
    if (u % PASO !== 0) { xs.push(u + 1); a.push(f(c.H[u], c.CA)); b.push(c.B && c.B[u] ? f(c.B[u], c.CB) : null); }
    return { xs, a, b, con: c.prop ? a : b, sin: c.prop ? b : a };
  }
  const vK = (k) => (I, C) => valor(k, I, C);

  /* ---------- tarjetas ---------- */
  function tarjeta(sec, k, viz) {
    const d = INDK[k], a = document.createElement('article'); a.className = 'pi-card'; a.id = 'pi-c-' + k; a.dataset.k = k;
    const nro = String(IND.findIndex((x) => x.k === k) + 1).padStart(2, '0');
    const qa = QA[k] || {};
    a.innerHTML = `<div class="pi-ch"><span class="pi-n" aria-hidden="true">${nro}</span><h3>${k === 'inter' ? 'Interacciones bióticas' : esc(d.n)}</h3><button type="button" class="pi-fx" aria-expanded="false" aria-controls="pi-f-${k}" aria-label="Ver fórmula de ${esc(d.n)}" title="Ver fórmula">${ICO_FX}<span>Ver fórmula</span></button></div>`
      + `<p class="pi-q">${esc(qa.q || '')} <span class="pi-pol">${flecha(d.sube ? 1 : -1)}más ${d.sube ? 'alto' : 'bajo'} = mejor</span></p><p class="pi-e">${esc(qa.e || '')}</p>`
      + `<div class="pi-top"><div class="pi-val"><b class="v">—</b><small>${esc(UD[d.u] || d.u)}</small><span class="rn"></span></div><div class="pi-dir" aria-live="off"></div></div><div class="pi-vs"></div><div class="pi-viz"></div><div class="pi-form" id="pi-f-${k}" hidden></div>`;
    sec.appendChild(a);
    if (k === 'inter') a.classList.add('pi-hero');
    const C = { k, el: a, vis: false, abierta: false, up: viz ? viz(a.querySelector('.pi-viz'), a) : null };
    a.querySelector('.pi-fx').addEventListener('click', (e) => { C.abierta = !C.abierta; e.currentTarget.setAttribute('aria-expanded', C.abierta); a.querySelector('.pi-form').hidden = !C.abierta; if (C.abierta && R.hist.length) { try { formula(C, ctxDe()); } catch (er) { console.warn('tablero:', er); } } });
    cards.set(k, C); if (io) io.observe(a); return C;
  }
  /* dirección del cambio: palabra + flecha + color (nunca color solo) y si eso es bueno o malo para ESTE indicador */
  const pon = (e, t) => { if (e._k !== t) { e._k = t; e.innerHTML = t; } };
  const uTxt = (d) => (d.u === '%' ? ' pts' : d.u ? ' ' + (UD[d.u] || d.u) : '');
  const uVal = (d) => (d.u === '%' ? ' %' : d.u ? ' ' + (UD[d.u] || d.u) : '');
  const cero = (dx, dd) => Math.abs(dx) < Math.pow(10, -dd) / 2;
  function dirTxt(d, a, b, desde, det) {
    const dx = b - a, z = cero(dx, d.d), s = z ? 0 : Math.sign(dx), bien = z ? null : d.sube ? dx > 0 : dx < 0;
    return `<i class="${bien == null ? '' : bien ? 'ok' : 'mal'}">${flecha(s, 15)}</i><span><b>${z ? 'Igual' : s > 0 ? 'Sube' : 'Baja'}${z ? '' : ' ' + num(Math.abs(dx), d.d) + esc(uTxt(d))}</b> ${desde}${bien == null ? '' : ` · <em>${bien ? 'mejora' : 'empeora'}</em>`}<small>${det}</small></span>`;
  }
  function cabecera(C, c) {
    const d = INDK[C.k], v = valor(C.k, c.I, c.CA), v1 = c.n > SEM_REF ? valor(C.k, c.I1, c.CA) : null, vo = c.Bk ? valor(C.k, c.Bk, c.CB) : null, el = C.el;
    const f = (x) => (x == null ? '—' : (d.k === 'presion' && x > 0 ? '+' : '') + num(x, d.d) + uVal(d));
    contar(el.querySelector('.v'), v, (x) => (d.k === 'presion' && x > 0 ? '+' : '') + num(x, d.d));
    pon(el.querySelector('.rn'), `${c.prop ? 'con' : 'sin'} propuesta, hoy`);
    /* 1 · dirección desde el año 1 (esta corrida) */
    let dt;
    if (d.acum) { /* atropellos: el total solo crece; la tendencia es por año (último año completo frente al año 1) */
      const P = c.I.atropellos && c.I.atropellos.porAño || [], y = Math.floor((c.I.sem - 1) / 52);
      dt = y >= 2 ? dirTxt({ ...d, u: 'animales/año' }, P[0] || 0, P[y - 1] || 0, `frente al año 1`, `año 1: ${num(P[0] || 0)} → año ${y}: ${num(P[y - 1] || 0)} animales`) : '';
      if (!dt) dt = `<i>${flecha(0, 15)}</i><span><b>Año ${y + 1} en curso</b><small>la tendencia por año aparece desde el año 3</small></span>`; }
    else if (v != null && v1 != null) dt = dirTxt(d, v1, v, 'desde el año 1', `año 1: ${f(v1)} → hoy: ${f(v)}`);
    else if (v == null && d.k === 'saturacion') dt = `<i>${flecha(0, 15)}</i><span><b>No aplica</b> en esta corrida<small>sin propuesta no hay Estaciones Circulares; abajo, la corrida con propuesta</small></span>`;
    else dt = `<i>${flecha(0, 15)}</i><span><b>${c.n <= SEM_REF ? 'Año 1 en curso' : 'Sin dato'}</b><small>${c.n <= SEM_REF ? `la tendencia se mide desde la semana ${SEM_REF}` : 'esta corrida no lo calcula'}</small></span>`;
    pon(el.querySelector('.pi-dir'), dt);
    /* 2 · con frente a sin propuesta, misma semana y misma semilla */
    const vc = c.prop ? v : vo, vs = c.prop ? vo : v; let tx;
    if (vc == null || vs == null) tx = `<i>${flecha(0, 13)}</i><span>${d.k === 'saturacion' ? 'Sin propuesta no hay Estaciones Circulares: no aplica.' : c.B && c.B.length && c.B.length < c.n ? `La corrida ${c.prop ? 'sin' : 'con'} propuesta va hasta la semana ${c.B[c.B.length - 1].sem}: no hay con qué comparar esta semana.` : 'Falta la otra corrida para comparar.'}</span>`;
    else { const dx = vc - vs, z = cero(dx, d.d), bien = z ? null : d.sube ? dx > 0 : dx < 0;
      tx = z ? `<i>${flecha(0, 13)}</i><span>Con y sin propuesta: <b>iguales</b><small>con ${f(vc)} · sin ${f(vs)}</small></span>`
        : `<i class="${bien ? 'ok' : 'mal'}">${flecha(Math.sign(dx), 13)}</i><span>Con propuesta: <b>${num(Math.abs(dx), d.d)}${esc(uTxt(d))} ${dx > 0 ? 'más' : 'menos'}</b> que sin ella · <em>${bien ? 'mejor' : 'peor'}</em><small>con ${f(vc)} · sin ${f(vs)}</small></span>`; }
    pon(el.querySelector('.pi-vs'), tx);
    return { v, vo, v1 };
  }
  /* ---------- «Ver fórmula»: fórmula, términos, valores de esta semana, cómo se calcula, fuente ---------- */
  function formula(C, c) {
    const f = F[C.k], d = INDK[C.k], box = C.el.querySelector('.pi-form'); if (!f) return;
    const filas = vivos(C.k, c);
    const html = f.f + `<h4>Términos</h4><dl>${f.t.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`
      + `<h4>Valores de esta semana · semana ${c.I.sem}</h4><table><thead><tr><th></th><th>${c.prop ? 'Con (esta)' : 'Sin (esta)'}</th><th>${c.prop ? 'Sin' : 'Con'}</th></tr></thead><tbody>${filas.map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>`
      + `<h4>Cómo se calcula en el simulador</h4><p>${esc(f.como)}</p><h4>Qué hace la propuesta</h4><p>${esc(PROPM[C.k] || '')}</p><h4>Fuente</h4><p>${esc(f.fuente)}</p>`;
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
  }
  function vivos(k, c) {
    const A = c.I, B = c.Bk, CA = c.CA, CB = c.CB, n = (x, d = 0, u = '') => (x == null || !isFinite(x) ? '—' : num(x, d) + u), dos = (lab, f, d, u) => [lab, n(f(A, CA), d, u), B ? n(f(B, CB), d, u) : '—'];
    const t = (I) => T(I);
    switch (k) {
      case 'shannon': return [dos('Especies presentes (riqueza)', (I) => I.biodiversidad.riqueza), dos('Σ Aᵢ (ha ocupadas, todas)', (I) => Object.values(I.biodiversidad.areaEsp || {}).reduce((p, q) => p + q, 0), 1), dos('Equitatividad H′/ln S', (I) => { const s = I.biodiversidad.riqueza; return s > 1 ? I.biodiversidad.shannonArea / Math.log(s) : null; }, 3), dos("H′", (I) => I.biodiversidad.shannonArea, 3)];
      case 'clave': return CLAVE.flatMap((e) => [dos(`${e.larga}: N actual (ha)`, (I) => claveArea(I, e.id), 1), dos(`${e.larga}: N inicial (ha)`, (I, C) => claveArea(C.H[Math.min(SEM_REF, C.H.length) - 1], e.id), 1), dos(`${e.larga}: %`, (I, C) => clavePct(I, e.id, C), 0, ' %')]);
      case 'inter': return [dos('I (interacciones locales)', (I) => t(I).red), dos('Interacciones en la semana 0', (I) => I.red0), ['Encuentros en el 3D ahora', n(window.KEN_ENC), '—']];
      case 'verde': return [dos('A_v (ha)', (I) => t(I).verde, 1), dos('A_v (m²)', (I) => t(I).verde * 1e4), dos('Parches verdes', (I) => I.verde && I.verde.resumen.nParches), dos('Módulos nuevos', (I) => I.verde && I.verde.resumen.nNuevos)];
      case 'conect': return [dos('Parches conectados', (I) => I.verde && I.verde.resumen.nConectados), dos('Parches totales', (I) => I.verde && I.verde.resumen.nParches), dos('Enlaces rotos', (I) => I.verde && I.verde.resumen.nRotas), dos('C', (I) => t(I).conectados, 1, ' %')];
      case 'atrop': return [dos('A (acumulados)', (I) => I.atropellos.total), dos('Este año', (I) => I.atropellos.porAño[Math.min(14, Math.floor((I.sem - 1) / 52))]), dos('Esta semana', (I) => I.atropellos.semana), dos('Índice (dispersantes muertos/sem.)', (I) => I.atropellosIndice, 1)];
      case 'ruido': return [dos('L_Aeq (energético)', (I) => I.ruidoLAeq, 1, ' dB(A)'), dos('Promedio aritmético (antes)', (I) => I.ruidoDb, 1, ' dB'), dos('L_Aeq del inicio', (I) => I.ruidoLAeq0, 1, ' dB(A)'), dos('Calles pacificadas', (I) => (I.mitiga || 0) * 100, 0, ' %'), dos('Tráfico (1 = hoy)', (I) => I.trafico, 3)];
      case 'bienestar': return [dos('Σ aₚ (aves × parche)', (I) => (I.avesRuido.porParche || []).reduce((p, q) => p + q.aves, 0) || null), dos('Ruido al que están expuestas', (I) => I.avesRuido.dbAves, 1, ' dB(A)'), dos('Aves en parches > 60 dB', (I) => I.avesRuido.expuestas * 100, 0, ' %'), dos('B', (I) => I.avesRuido.bienestarFauna * 100, 1, ' %')];
      case 'saturacion': return [dos('kg acumulados', (I) => hayEstaciones(I) ? t(I).pendientes * 1000 : null), dos('Capacidad máxima (kg)', (I) => hayEstaciones(I) ? t(I).capacidadAlmacen * 1000 : null), dos('Estaciones', (I) => (t(I).estaciones || []).length || null), dos('S', (I) => valor('saturacion', I, null), 1, ' %')];
      case 'aprov': return [dos('kg aprovechados/día', (I) => t(I).tratados * 1000), dos('kg generados/día', (I) => t(I).organicos * 1000), dos('Compost (kg/día)', (I) => t(I).compost * 1000), dos('R', (I) => t(I).aprovechamiento, 2, ' %')];
      case 'llega': return [dos('Demanda de Kennedy (t/día)', (I) => I.comidaK && I.comidaK.dem), dos('Frescos recibidos (t/día)', (I) => I.comidaK && I.comidaK.frescosRec), dos('Otros canales (t/día)', (I) => I.comidaK && I.comidaK.otros), dos('Llega (t/día)', (I) => I.comidaK && I.comidaK.llega), dos('L', (I) => valor('llega', I), 1, ' %')];
      case 'resK': return [dos('R generados (t/día)', (I) => I.residuosK && I.residuosK.gen), dos('T tratados en Estaciones (t/día)', (I) => I.residuosK && I.residuosK.trat, 1), dos('Estaciones Circulares abiertas (20 t/día c/u)', (I) => I.residuosK && I.residuosK.nEst),dos('Sin recoger (t/día)', (I) => I.residuosK && I.residuosK.noRec), dos('Degradación de La Vaca D', (I) => I.residuosK && I.residuosK.D * 100, 0, ' %'), ['Umbral de game over (sin recoger)', '296 t/día', '296 t/día']];
      case 'cobertura': return [dos('kg recibidos/día', (I) => Math.min(1, t(I).cobertura / 100) * t(I).demanda * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Sectores bajo 80 %', (I) => (t(I).sectores || []).filter((s) => s.valor < 80).length), dos('C', (I) => valor('cobertura', I), 1, ' %')];
      case 'autonomia': return [dos('kg locales consumidos/día', (I) => t(I).autonomia / 100 * t(I).demanda * 1000), dos('kg producidos/día', (I) => t(I).produccion * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Au', (I) => t(I).autonomia, 2, ' %')];
      case 'acceso': { const aA = acceso(A, c.M), aB = B ? acceso(B, c.M) : null, q = (o, f, d = 0, u = '') => (o ? n(f(o), d, u) : '—');
        return [['Habitantes cubiertos', q(aA, (o) => o.cubiertos), q(aB, (o) => o.cubiertos)], ['Habitantes totales', q(aA, (o) => o.total), q(aB, (o) => o.total)], ['Mercados abiertos', q(aA, (o) => o.mercados.length), q(aB, (o) => o.mercados.length)], ['Radio en línea recta', n(ACCESO_R, 0, ' m'), n(ACCESO_R, 0, ' m')], ['Ac', q(aA, (o) => o.pct, 1, ' %'), q(aB, (o) => o.pct, 1, ' %')]]; }
      case 'presion': return [dos('Pᵢ (semana 1)', (I, C) => C.H[0] && C.H[0].especulacion.indice, 3), dos('P_f (esta semana)', (I) => I.especulacion.indice, 3), dos('Hogares en riesgo', (I) => I.especulacion.hogaresRiesgo), dos('P', (I, C) => valor('presion', I, C), 2, ' %')];
    }
    return [];
  }

  /* ---------- visualizaciones por indicador: UNA pregunta, la forma más simple que la responde (dataviz: choosing-a-form) ----------
     · escala (bala) con bandas rotuladas: «¿dónde está el valor en su escala y cuánto le falta?» (con = punto lleno, sin = aro hueco)
     · línea de 15 años con etiquetas al final: «¿sube o baja con el tiempo?»
     · filas antes→después por especie, barras segmentadas por corrida, columnas por año, lista de medidores por estación */
  const linea = (host, k, op = {}) => { const d = INDK[k], L = new Linea(host, { n: d.n, u: d.u, d: d.d, alto: op.alto || 74, cero: op.cero, pl: op.pl || 30, etq: true }); return (c) => { const S = serie(c, k, vK(k)); L.update({ W: c.W, FIN: c.FIN, xs: S.xs, con: S.con, sin: S.sin, run: c.prop ? 'con' : 'sin' }); }; };
  const div = (h, cls) => { const e = document.createElement('div'); if (cls) e.className = cls; h.appendChild(e); return e; };
  const tira = (h, k, op = {}) => { const t = div(h, 'pi-tira'); t.insertAdjacentHTML('beforeend', `<span class="pi-tl">${op.t || 'Evolución en 15 años · eje: años'}</span>`); return linea(t, k, { alto: op.alto || 64, cero: op.cero, pl: op.pl }); };
  const Ic = (c) => (c.prop ? c.I : c.Bk), Is = (c) => (c.prop ? c.Bk : c.I), Cc = (c) => (c.prop ? c.CA : c.CB), Cs = (c) => (c.prop ? c.CB : c.CA);
  const vC = (c, k) => valor(k, Ic(c), Cc(c)), vS = (c, k) => valor(k, Is(c), Cs(c));
  /* escala + línea: la base de casi todas las tarjetas */
  const escala = (h, k, op) => { const d = INDK[k], E = new Escala(div(h, 'pi-art'), { n: d.n, u: d.u, d: d.d, min: 0, max: 100, ...op }); return (c, max) => E.update({ W: c.W, con: vC(c, k), sin: vS(c, k), max }); };
  const hecho = (h) => div(h, 'pi-hecho');
  const COL_V = { existente: ARTE.cat[2], reforzado: ARTE.pur[4], nuevo: ARTE.cat[0], liberado: ARTE.cat[1], hogares: ARTE.durazno };
  const INK_V = { existente: '#fff', reforzado: '#14161b', nuevo: '#fff', liberado: '#14161b', hogares: '#14161b' };
  const TXT_V = { existente: 'existente', reforzado: 'reforzada', nuevo: 'módulo nuevo', liberado: 'borde liberado', hogares: 'huertas de hogares' };
  const palabra = (p) => (Math.abs(p) < 0.5 ? 'estable' : p > 0 ? 'aumenta' : 'disminuye');
  const VIZ = {
    shannon: (h) => { const a = div(h, 'pi-art'), f = hecho(h), L = tira(h, 'shannon'); let E = null, m0 = 0;
      return (c) => { const B = (I) => I && I.biodiversidad, nfa = Object.keys((B(c.I) || {}).areaEsp || {}).length || 23, m = Math.log(nfa);
        if (!E || m0 !== m) { m0 = m; a.innerHTML = ''; E = new Escala(a, { n: 'Biodiversidad de Shannon', d: 2, dt: 2, min: 0, max: m, ticks: [0, m], bandas: [[0, m / 3, 'baja'], [m / 3, 2 * m / 3, 'media'], [2 * m / 3, m, 'alta']], aria: `Shannon de 0 a ${num(m, 2)} con bandas baja, media y alta` }); }
        E.update({ W: c.W, con: vC(c, 'shannon'), sin: vS(c, 'shannon') });
        const r = (I) => (B(I) ? B(I).riqueza : null), j = (I) => { const s = r(I); return s > 1 ? B(I).shannonArea / Math.log(s) * 100 : null; };
        pon(f, `Especies presentes: <b>con ${num(r(Ic(c)))}</b> · sin ${num(r(Is(c)))} de ${nfa}<br>Reparto parejo del hábitat: <b>con ${num(j(Ic(c)))} %</b> · sin ${num(j(Is(c)))} %<br>Tope ${num(m, 2)} = las ${nfa} especies con la misma área; bandas = tercios del tope.`);
        L(c); }; },
    /* por especie: año 1 (= 100 %) → hoy, con y sin, en una escala común */
    clave: (h) => { const a = div(h, 'pi-art'); let k0 = '';
      return (c) => { const R = CLAVE.map((e) => ({ e, a: clavePct(Ic(c), e.id, Cc(c)), b: clavePct(Is(c), e.id, Cs(c)) })), vs = R.flatMap((r) => [r.a, r.b]).filter((x) => x != null);
        const k = R.map((r) => [r.a, r.b].map((x) => (x == null ? '' : x.toFixed(0))).join(',')).join('|') + c.W; if (k === k0) return; k0 = k;
        if (c.n <= SEM_REF) { a.innerHTML = `<p class="pi-hecho">Año 1 en curso: el punto de partida de cada especie es la semana ${SEM_REF}.</p>`; return; }
        const lo = Math.min(50, Math.floor(Math.min(...vs, 100) / 25) * 25), hi = Math.max(150, Math.ceil(Math.max(...vs, 100) / 25) * 25), W = c.W, x0 = 6, x1 = W - 6, X = (v) => x0 + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (x1 - x0);
        const chip = (n, v) => { if (v == null) return `<span class="pi-c2">${n}: —</span>`; const p = v - 100, s = Math.abs(p) < 0.5 ? 0 : Math.sign(p);
          return `<span class="pi-c2 ${s > 0 ? 'ok' : s < 0 ? 'mal' : ''}">${flecha(s, 12)}${n}: <b>${s ? (p > 0 ? '+' : '−') + num(Math.abs(p)) + ' %' : '±0 %'}</b> ${palabra(p)}</span>`; };
        a.innerHTML = R.map((r, i) => { const ult = i === R.length - 1, H = ult ? 32 : 20, y = 10, xr = X(100);
          let s = `<svg class="tb-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${r.e.n}: con propuesta ${num(r.a)} %, sin propuesta ${num(r.b)} % del año 1`)}">`;
          s += `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="var(--tb-axis)"/><line x1="${xr.toFixed(1)}" x2="${xr.toFixed(1)}" y1="2" y2="18" stroke="rgba(244,243,239,.7)" stroke-width="1.5"/>`;
          if (r.b != null) s += `<circle cx="${X(r.b).toFixed(1)}" cy="${y}" r="4.6" fill="var(--tb-sur)" fill-opacity=".6" stroke="${ARTE.sin}" stroke-width="2" data-tt="${esc(`${r.e.larga} · sin propuesta|${num(r.b)} % del año 1`)}"/>`;
          if (r.a != null) s += `<line x1="${xr.toFixed(1)}" x2="${X(r.a).toFixed(1)}" y1="${y}" y2="${y}" stroke="${ARTE.con}" stroke-width="3" stroke-linecap="round"/><circle cx="${X(r.a).toFixed(1)}" cy="${y}" r="5.5" fill="${ARTE.con}" stroke="var(--tb-sur)" stroke-width="2" data-tt="${esc(`${r.e.larga} · con propuesta|${num(r.a)} % del año 1|${num(claveArea(Ic(c), r.e.id), 1)} ha ocupadas`)}"/>`;
          if (ult) s += [lo, 100, hi].map((v) => `<text class="ar-tk${v === 100 ? ' b' : ''}" x="${X(v).toFixed(1)}" y="${H - 1}" text-anchor="${v === lo ? 'start' : v === hi ? 'end' : 'middle'}">${v === 100 ? 'año 1 = 100 %' : num(v) + ' %'}</text>`).join('');
          return `<div class="pi-sp"><div class="pi-sph"><b>${esc(r.e.n)}</b>${chip('Con', r.a)}${chip('Sin', r.b)}</div>${s}</svg></div>`; }).join(''); }; },
    inter: (h, el) => { const box = document.createElement('div'); box.className = 'pi-cuerda'; h.appendChild(box);
      box.innerHTML = '<div class="pi-enc"><b>0</b><span>encuentros ocurriendo ahora en el 3D</span></div><div class="pi-cv"></div><p class="pie">Pasa sobre una especie para ver con quién se relaciona.</p><div class="pi-tipos"></div>';
      const L = tira(h, 'inter', { alto: 60 }); let tiposN = 0;
      const vivo = () => { const cv = document.getElementById('tb-cuerda'), slot = box.querySelector('.pi-cv'); if (cv && cv.parentNode !== slot) slot.appendChild(cv);
        const on = !!cv && vista === 'ind' && cards.get('inter').vis && !!root && root.getClientRects().length > 0 && !document.hidden; window.KEN_CUERDA_VIVA = on;
        if (!on) return; box.querySelector('.pi-enc b').textContent = num(window.KEN_ENC || 0);
        const p1 = document.getElementById('tb-pie1'); if (p1 && p1.textContent) box.querySelector('.pie').innerHTML = p1.innerHTML;
        const bio = window.KEN_T3 && window.KEN_T3.bio; if (bio && bio.TIPOS) { const E = bio.ENCL || bio.ENC || [];
          if (tiposN !== bio.TIPOS.length) { tiposN = bio.TIPOS.length; box.querySelector('.pi-tipos').innerHTML = bio.TIPOS.map((t, i) => `<span><i style="background:${t.c}"></i>${esc(t.n)} <b data-i="${i}">0</b></span>`).join(''); }
          box.querySelectorAll('.pi-tipos b').forEach((b) => { const v = E[+b.dataset.i] || 0, tx = num(v); if (b.textContent !== tx) b.textContent = tx; }); } };
      const iv = setInterval(() => { if (!box.isConnected) { clearInterval(iv); return; } vivo(); }, 400);
      return (c) => { vivo(); L(c); }; },
    /* de qué está hecha el área verde: una barra por corrida, misma escala en hectáreas */
    verde: (h) => { const a = div(h, 'pi-art'), lg = div(h), L = tira(h, 'verde'); let k0 = '';
      lg.innerHTML = leyenda(Object.keys(COL_V).map((t) => ['bar', COL_V[t], TXT_V[t]]));
      return (c) => { L(c); const comp = (I) => { if (!I || !I.verde) return null; const o = {}; for (const p of I.verde.parches) if (p.r > 0) { const t = COL_V[p.tipo] ? p.tipo : 'existente'; o[t] = (o[t] || 0) + Math.PI * p.r * p.r / 1e4; }
          const suma = Object.values(o).reduce((x, y) => x + y, 0), resto = (T(I).verde || 0) - suma; if (resto > 0.05) o.hogares = resto; return o; };
        const A = comp(Ic(c)), B = comp(Is(c)), k = JSON.stringify([A, B].map((o) => o && Object.values(o).map((v) => Math.round(v)))) + c.W; if (k === k0) return; k0 = k;
        const fila = (n, o, hueca) => ({ n, hueca, segs: Object.keys(COL_V).map((t) => ({ v: (o && o[t]) || 0, c: COL_V[t], ink: INK_V[t], n: TXT_V[t], txt: num((o && o[t]) || 0, 1) + ' ha' })), txt: o ? num(Object.values(o).reduce((x, y) => x + y, 0), 0) + ' ha' : '—' });
        a.innerHTML = segBarras([fila('Con', A), fila('Sin', B, true)], c.W, { aria: 'Área verde por tipo, con y sin propuesta, en hectáreas' }); }; },
    conect: (h) => { const E = escala(h, 'conect', { ticks: [0, 50, 100] }), f = hecho(h), L = tira(h, 'conect', { cero: true });
      return (c) => { E(c); const r = (I) => I && I.verde && I.verde.resumen; const a = r(Ic(c)), b = r(Is(c));
        pon(f, `Parches unidos a la red: <b>con ${a ? `${num(a.nConectados)} de ${num(a.nParches)}` : '—'}</b> · sin ${b ? `${num(b.nConectados)} de ${num(b.nParches)}` : '—'}`); L(c); }; },
    /* animales atropellados cada año: columnas pareadas con (llena) y sin (hueca) */
    atrop: (h) => { const a = div(h, 'pi-art'), lg = div(h); let k0 = '';
      lg.innerHTML = `<div class="ar-ley"><span>${clave(ARTE.con, 'barra')}con propuesta</span><span>${clave(ARTE.sin, 'hueca')}sin propuesta</span><span>animales por año · eje: años</span></div>`;
      return (c) => { const A = c.I.atropellos.porAño || [], Ab = c.Bk ? c.Bk.atropellos.porAño || [] : [], nA = Math.min(15, Math.ceil(c.n / 52)), conA = c.prop ? A : Ab, sinA = c.prop ? Ab : A, años = [];
        for (let y = 0; y < 15; y++) años.push(y < nA ? [[conA[y] || 0], [sinA[y] || 0]] : null);
        const k = JSON.stringify(años) + c.W; if (k === k0) return; k0 = k;
        a.innerHTML = columnasAño(años, [[{ c: ARTE.con }], [{ c: ARTE.sin, op: 0.3 }]], c.W, { alto: 96, aria: 'Animales atropellados por año, con y sin propuesta', tt: (y, r) => `Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}|Con propuesta: ${num(r[0][0])} animales|Sin propuesta: ${num(r[1][0])} animales` }); }; },
    ruido: (h) => { const E = escala(h, 'ruido', { min: 40, max: 80, dt: 0, ticks: [40, 50, 65, 75], bandas: [[40, 50, 'sin efecto'], [50, 65, 'molestia'], [65, 75, 'efecto fuerte'], [75, 80, 'pérdida']] }), L = tira(h, 'ruido');
      return (c) => { E(c); L(c); }; },
    bienestar: (h) => { const E = escala(h, 'bienestar', { ticks: [0, 50, 100] }), L = tira(h, 'bienestar');
      return (c) => { E(c); L(c); }; },
    /* qué tan llenas: escala con la banda de alerta + una barra por estación (las más llenas primero) */
    saturacion: (h) => { const box = div(h), msg = div(h), a = div(h, 'pi-art'), L = tira(h, 'saturacion', { cero: true }); const E = escala(box, 'saturacion', { ticks: [0, 85, 100], bandas: [[0, 85, 'normal'], [85, 100, 'alerta']] }); let k0 = '';
      return (c) => { L(c); const I = Ic(c);
        if (!I || !hayEstaciones(I)) { box.hidden = true; a.hidden = true; pon(msg, '<p class="pi-hecho">Sin Estaciones Circulares en ninguna corrida: lo recogido va al relleno Doña Juana y el indicador no aplica.</p>'); return; }
        box.hidden = false; a.hidden = false; pon(msg, ''); E(c);
        const est = (T(I).estaciones || []).filter((e) => isFinite(e.valor)).sort((x, y) => y.valor - x.valor), top = est.slice(0, 6), k = top.map((e) => Math.round(e.valor)).join(',') + c.W + est.length; if (k === k0) return; k0 = k;
        a.innerHTML = top.length ? `<span class="pi-tl" style="margin-top:6px">Las ${top.length} estaciones más llenas de ${est.length} (con propuesta)</span>` + barrasH(top.map((e) => ({ n: e.n, v: Math.min(100, e.valor), col: e.valor >= 100 ? ARTE.crit : e.valor >= 85 ? ARTE.lim : ARTE.con, txt: num(e.valor) + ' %', tt: `${e.n}|Llena: ${num(e.valor)} %|Acumulado: ${num(e.acumulado_t * 1000)} kg|Trata ${num(e.tratado_t_dia * 1000)} de ${num(e.cap_t_dia * 1000)} kg/día` })), c.W, { max: 100, lim: 85, limU: ' %', lw: 110, vw: 38, aria: 'Llenado de cada Estación Circular' }) : ''; }; },
    /* a dónde van los orgánicos: una barra por corrida, partes del mismo todo */
    aprov: (h) => { const a = div(h, 'pi-art'), lg = div(h), L = tira(h, 'aprov', { cero: true }); let k0 = ''; const D3 = [{ n: 'aprovechado (compost)', c: ARTE.cat[2], ink: '#fff' }, { n: 'relleno Doña Juana', c: ARTE.neutro, ink: '#14161b' }, { n: 'sin recoger', c: ARTE.cat[1], ink: '#14161b' }];
      lg.innerHTML = leyenda(D3.map((x) => ['bar', x.c, x.n]));
      return (c) => { L(c); const f = (I) => { if (!I) return null; const t = T(I), G = t.organicos || 0, Tt = Math.min(G, t.tratados || 0), sr = (I.basura && I.basura.fraccionSinRecoger || 0) * Math.max(0, G - Tt); return { G, seg: [Tt, Math.max(0, G - Tt - sr), sr] }; };
        const A = f(Ic(c)), B = f(Is(c)), k = JSON.stringify([A, B].map((x) => x && x.seg.map((v) => Math.round(v * 400)))) + c.W; if (k === k0) return; k0 = k;
        const fila = (n, o, hueca) => ({ n, hueca, segs: D3.map((x, i) => ({ v: o ? o.seg[i] : 0, c: x.c, ink: x.ink, n: x.n, txt: num(o ? o.seg[i] * 1000 : 0) + ' kg/día' })), txt: o ? num(o.G, 0) + ' t/día' : '—' });
        a.innerHTML = segBarras([fila('Con', A), fila('Sin', B, true)], c.W, { rw: 54, aria: 'Destino de los orgánicos generados cada día, con y sin propuesta' }); }; },
    /* comida que llega frente a la demanda (t/día, 15 años): demanda de esta corrida, lo que llega con y sin propuesta */
    llega: (h) => { const box = div(h, 'pi-art'), lg = div(h), f = hecho(h); const svg = nodo('svg', { class: 'tb-svg', role: 'img', 'aria-label': 'Comida que llega a Kennedy frente a su demanda, toneladas por día en 15 años' }, box);
      const gE = nodo('g', { class: 'tb-ejey' }, svg), pD = nodo('path', { fill: 'none', stroke: ARTE.ink, 'stroke-width': 1.6, 'stroke-opacity': 0.85 }, svg), pS = nodo('path', { fill: 'none', stroke: ARTE.sin, 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg), pC = nodo('path', { fill: 'none', stroke: ARTE.con, 'stroke-width': 2 }, svg);
      lg.innerHTML = leyenda([['lin', ARTE.ink, 'demanda de Kennedy'], ['lin', ARTE.con, 'llega · con propuesta'], ['pun', ARTE.sin, 'llega · sin propuesta']]);
      const camino2 = (xs, ys, X, Y) => { let d = '', n = 0; for (let i = 0; i < xs.length; i++) { const y = ys[i]; if (y == null) { n = 0; continue; } d += (n++ ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(y).toFixed(1); } return d; };
      return (c) => { const D = serie(c, 'llegaDem', (I) => (I && I.comidaK ? I.comidaK.dem : null)), S = serie(c, 'llegaT', (I) => (I && I.comidaK ? I.comidaK.llega : null));
        const run = c.prop ? D.con : D.sin, vals = [...run, ...S.con, ...S.sin].filter((v) => v != null); if (!vals.length) return;
        const m = marcas(Math.min(...vals) * 0.97, Math.max(...vals) * 1.02, 3), W = c.W, H = 96, pl = 36, pr = 8, pt = 8, pb = 15, iw = W - pl - pr, ih = H - pt - pb;
        const X = (s) => pl + (s - 1) / Math.max(1, c.FIN - 1) * iw, Y = (v) => pt + ih - (v - m.a) / (m.b - m.a || 1) * ih;
        fija(svg, { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
        const k = m.t.join(',') + W; if (gE._k !== k) { gE._k = k; gE.innerHTML = m.t.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--tb-grid)"/><text x="${pl - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${num(t)}</text>`).join('') + [1, 5, 10, 15].map((a) => `<text x="${X((a - 1) * 52 + 1).toFixed(1)}" y="${H - 3}" text-anchor="middle">${a}</text>`).join(''); }
        fija(pD, { d: camino2(D.xs, run, X, Y) }); fija(pC, { d: camino2(S.xs, S.con, X, Y) }); fija(pS, { d: camino2(S.xs, S.sin, X, Y) });
        const I = c.I.comidaK; if (I) pon(f, `Esta semana: demanda <b>${num(I.dem)} t/día</b> · llegan <b>${num(I.llega)}</b> (${num(I.frescosRec)} de frescos + ${num(I.otros)} de otros canales)${I.llega < I.dem - 0.5 ? ` · <b>faltan ${num(I.dem - I.llega)} t/día</b>` : ''}.`); }; },
    /* residuos que genera Kennedy frente a la generación con la que lo sin recoger llega al game over */
    resK: (h) => { const t = div(h, 'pi-tira'); t.insertAdjacentHTML('beforeend', '<span class="pi-tl">Generación en 15 años · t/día · raya = game over de la simulación 01</span>');
      const L = new Linea(t, { n: 'Residuos de Kennedy', u: 't/día', d: 0, alto: 80, pl: 36, etq: true }), f = hecho(h);
      return (c) => { const S = serie(c, 'resK', vK('resK')), r = c.I.residuosK, trat = r ? r.trat || 0 : 0;
        L.update({ W: c.W, FIN: c.FIN, xs: S.xs, con: S.con, sin: S.sin, run: c.prop ? 'con' : 'sin', lim: 774 + 296 + trat, cerca: 774 + 148 + 2 / 3 * 148 + trat, limTxt: `game over ${num(774 + 296 + trat)}` });
        if (r) pon(f, `Sin recoger: <b>${num(r.noRec)} t/día</b> de 296 (hoy 148, puntos críticos)${trat > 0.5 ? ` · las Estaciones Circulares tratan ${num(trat, 1)} t/día${r.nEst ? ` (${num(r.nEst)} de 20 abiertas)` : ''}` : ''}<br>Humedal La Vaca: degradación <b>${num(r.D * 100)} %</b> · árboles e interacciones −${num((1 - r.arboles) * 100)} %`); }; },
    cobertura: (h) => { const E = escala(h, 'cobertura', { ticks: [0, 80, 100], bandas: [[0, 80, 'bajo 80 %'], [80, 100, '80 % o más']] }), f = hecho(h), L = tira(h, 'cobertura', { cero: true });
      return (c) => { E(c); const b = (I) => (I ? (T(I).sectores || []).filter((s) => s.valor < 80).length : null), n = (T(c.I).sectores || []).length;
        pon(f, `Sectores de 500 m que reciben menos del 80 % de lo que necesitan: <b>con ${num(b(Ic(c)))}</b> · sin ${num(b(Is(c)))} de ${num(n)}`); L(c); }; },
    autonomia: (h) => { const E = escala(h, 'autonomia', {}), f = hecho(h), L = tira(h, 'autonomia', { cero: true });
      return (c) => { const a = vC(c, 'autonomia'), b = vS(c, 'autonomia'), mx = marcas(0, Math.max(1, a || 0, b || 0) * 1.15, 3).b; E(c, mx);
        const n1 = a > 0 ? Math.round(100 / a) : null; pon(f, n1 ? `Con propuesta, cerca de <b>1 de cada ${num(n1)} kg</b> de alimentos frescos se cultiva en Kennedy. Escala de 0 a ${num(mx)} % para que se vea la diferencia.` : 'Con propuesta aún no se consume comida cultivada en Kennedy.'); L(c); }; },
    /* escala + mapa de sectores con el radio de 15 minutos de cada mercado */
    acceso: (h) => { const E = escala(h, 'acceso', { ticks: [0, 50, 100] }), svg = nodo('svg', { class: 'tb-svg', style: 'overflow:hidden;margin-top:6px', role: 'img', 'aria-label': 'Sectores a 15 minutos a pie de un mercado' }, div(h, 'pi-art')), gm = nodo('g', {}, svg), gs = nodo('g', {}, svg);
      const lg = div(h), L = tira(h, 'acceso', { cero: true }); let k0 = '';
      return (c) => { E(c); L(c); const a = acceso(c.I, c.M); if (!a) return; const colR = c.prop ? ARTE.con : ARTE.sin;
        pon(lg, leyenda([['pto', colR, `a ≤ 15 min (${c.prop ? 'con' : 'sin'} propuesta)`], ['hue', 'rgba(244,243,239,.45)', 'más lejos'], ['bar', ARTE.lim, 'mercado y su radio']]));
        const k = a.mercados.length + '|' + c.W + '|' + a.sectores.filter((s) => s.ok).length + c.prop; if (k === k0) return; k0 = k;
        const W = c.W, ht = Math.round(W * 0.44), P2 = a.sectores.concat(a.mercados), xs = P2.map((s) => s.x), zs = P2.map((s) => s.z), x0 = Math.min(...xs) - 300, x1 = Math.max(...xs) + 300, z0 = Math.min(...zs) - 300, z1 = Math.max(...zs) + 300, sc = Math.min(W / (x1 - x0), ht / (z1 - z0));
        const X = (x) => (x - x0) * sc + (W - (x1 - x0) * sc) / 2, Y = (z) => (z - z0) * sc; fija(svg, { width: W, height: Math.round((z1 - z0) * sc), viewBox: `0 0 ${W} ${Math.round((z1 - z0) * sc)}` });
        gm.innerHTML = a.mercados.map((m) => `<circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.z).toFixed(1)}" r="${(ACCESO_R * sc).toFixed(1)}" fill="${ARTE.lim}" fill-opacity=".045" stroke="${ARTE.lim}" stroke-opacity=".22" stroke-dasharray="2 3"/>`).join('');
        gs.innerHTML = a.sectores.map((s) => `<circle cx="${X(s.x).toFixed(1)}" cy="${Y(s.z).toFixed(1)}" r="${Math.max(2, Math.min(5, Math.sqrt(s.w) * 6)).toFixed(1)}" ${s.ok ? `fill="${colR}" fill-opacity=".9"` : 'fill="none" stroke="rgba(244,243,239,.38)"'} data-tt="${esc(`Sector|${num(s.d)} m al mercado más cercano|${s.ok ? 'a 15 min o menos a pie' : 'a más de 15 min a pie'}`)}"/>`).join('')
          + a.mercados.map((m) => `<rect x="${(X(m.x) - 3.5).toFixed(1)}" y="${(Y(m.z) - 3.5).toFixed(1)}" width="7" height="7" transform="rotate(45 ${X(m.x).toFixed(1)} ${Y(m.z).toFixed(1)})" fill="${ARTE.lim}" stroke="var(--tb-sur)" data-tt="${esc(`${m.n}|${m.tipo === 'propuesta' ? 'mercado de la propuesta' : m.tipo === 'plaza' ? 'plaza existente' : 'central mayorista'}`)}"/>`).join(''); }; },
    /* línea de 15 años desde 0 %: la cifra grande ya es el cambio */
    presion: (h) => tira(h, 'presion', { alto: 104, cero: true })
  };

  function construirIndicadores() {
    const box = wrap.querySelector('.pi-macs'); cards.clear();
    if (io) io.disconnect();
    io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { for (const e of es) { const C = cards.get(e.target.dataset.k); if (!C) continue; const ant = C.vis; C.vis = e.isIntersecting; if (C.vis && !ant) { sucio = true; programar(); } } }, { root: root, rootMargin: '200px 0px' }) : null;
    MACROS.forEach((m, i) => { const s = document.createElement('section'); s.className = 'pi-mac'; s.id = 'pi-m-' + m.id; s.setAttribute('aria-labelledby', 'pi-h-' + m.id);
      const nI = IND.filter((x) => x.macro === m.id).length;
      s.innerHTML = `<h2 id="pi-h-${m.id}"><i>${String(i + 1).padStart(2, '0')}</i><span>${esc(m.n.replace(/^Macromodelo (de )?/, ''))}</span><small>Macromodelo · ${nI} indicadores</small></h2>`; box.appendChild(s);
      for (const d of IND.filter((x) => x.macro === m.id)) { const C = tarjeta(s, d.k, VIZ[d.k]); if (!io) C.vis = true; } });
  }

  /* ---------- ESTRATEGIAS ---------- */
  function construirEstrategias() {
    const v = wrap.querySelector('#pi-v-est');
    v.innerHTML = '<p class="pi-int">Qué hace cada estrategia en el modelo «con propuesta» y qué indicadores mueve (toca uno para verlo).</p><ul class="pi-est">'
      + ESTR.map((e) => `<li data-e="${e.id}" style="--c:${e.c}"><div class="h"><i></i><b>${esc(e.n)}</b><small>${e.id}</small></div><p>${esc(e.hace)}</p><div class="ch">${e.ind.map((k) => `<button type="button" data-k="${k}">${esc(INDK[k].c)}</button>`).join('')}</div></li>`).join('') + '</ul>';
    v.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const li = b.closest('li');
      if (b.dataset.k) { elegir('ind'); const C = cards.get(b.dataset.k); if (C) { C.el.scrollIntoView({ block: 'start' }); C.el.classList.remove('pi-flash'); void C.el.offsetWidth; C.el.classList.add('pi-flash'); } } });
  }

  /* ---------- encabezado ---------- */
  function encabezado(c) {
    const d = R.def || {}, I = c.I;
    wrap.querySelector('.pi-sem').innerHTML = `Semana <b>${I.sem}</b> · año <b>${año(I.sem)}</b> de 15`;
    wrap.querySelector('.pi-esc').innerHTML = d.par ? `<b>${esc((d.parN || '').replace(/^\d+\s*/, ''))}</b> · ${c.prop ? 'con propuesta' : 'sin propuesta'}` : `<b>${esc(d.n || 'Kennedy')}</b> · sin prueba de estrés`;
    const g = T(I).gameOver || R.go, pg = wrap.querySelector('.pi-go'); pg.hidden = !g; if (g) pg.textContent = `Game over en la semana ${g.sem}: ${g.motivo || g.regla}.`;
    wrap.querySelector('.pi-run').innerHTML = `· esta corrida: <b>${c.prop ? 'con' : 'sin'}</b>`;
  }

  /* ---------- ciclo ---------- */
  function pintar() {
    if (simHecho !== R.sim) { simHecho = R.sim; CACHE.clear(); }
    const H = R.hist, vac = wrap.querySelector('.pi-vacio'), macs = wrap.querySelector('.pi-macs');
    if (!R.sim || !H || !H.length) { vac.hidden = false; vac.textContent = R.sim ? 'Calculando la primera semana…' : 'Dale play: aquí aparecen, semana a semana, los indicadores de los tres macromodelos.'; macs.style.display = 'none'; nHecho = 0; return null; }
    vac.hidden = true; macs.style.display = '';
    if (H !== H0) CACHE.clear();
    const c = ctxDe(); encabezado(c); nHecho = H.length; H0 = H; nBase = (R.ecoBase || R.base || []).length; goHecho = R.go;
    if (vista !== 'ind') return null;
    return { c, cola: [...cards.values()].filter((C) => C.vis), i: 0 };
  }
  let tarea = null;
  function trabajar(dl) {
    while (tarea && tarea.i < tarea.cola.length) { const C = tarea.cola[tarea.i++]; try { cabecera(C, tarea.c); if (C.up) C.up(tarea.c); if (C.abierta) formula(C, tarea.c); } catch (e) { console.warn('tablero:', C.k, e); } if (dl && !dl.didTimeout && dl.timeRemaining() < 3) break; }
    if (tarea && tarea.i >= tarea.cola.length) tarea = null;
  }
  const ocio = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 500 }) : (f) => setTimeout(() => f(null), 16);
  function programar() { if (pendiente) return; pendiente = true;
    const paso = (dl) => { if (!tarea) { ultimo = performance.now(); try { tarea = pintar(); } catch (e) { console.warn('tablero:', e); tarea = null; } } trabajar(dl); if (tarea) ocio(paso); else pendiente = false; }; ocio(paso); }
  function tick() {
    if (document.hidden || !getM() || !montar()) return;
    if (!root.isConnected || !root.getClientRects().length) { window.KEN_CUERDA_VIVA = false; return; } // cajón cerrado (celular): no se dibuja
    const H = R.hist || [], nb = (R.ecoBase || R.base || []).length, ahora = performance.now();
    const cambio = simHecho !== R.sim || H !== H0 || sucio || R.go !== goHecho || H.length !== nHecho || (nb !== nBase && ahora - ultimo > 2000);
    if (!cambio || ahora - ultimo < 300) return; sucio = false; programar();
  }
  setInterval(tick, 250);
  const api = { pintar: () => { sucio = true; ultimo = 0; tarea = null; if (montar()) programar(); }, vista: (id) => { if (wrap) elegir(id); }, cards };
  window.KEN_PI = api;
  return api;
}
