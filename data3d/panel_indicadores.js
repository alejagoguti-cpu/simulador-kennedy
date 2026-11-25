/* ============ TABLERO DE INDICADORES (columna derecha, aside#lp-tablero) ============
   Caja con tres vistas: «Indicadores» (los tres macromodelos de la tabla de la autora, docs/indicadores_macromodelos.md) · «Estrategias» (las 9 de la
   propuesta) · «Variables» (los deslizadores de sim_ui.js, #su-der, que limpio.js mueve aquí).
   Datos: R.hist (corrida actual, un I por semana) y R.ecoBase (la otra mitad del par, misma semilla). Los valores salen de indicadores_macro.js
   (funciones puras, verificadas en node). Rendimiento: solo se dibujan las tarjetas visibles (IntersectionObserver) de la vista abierta, una vez
   por semana simulada como mucho cada 300 ms, en tiempo ocioso y por partes; las gráficas reutilizan sus nodos SVG.
   Paleta: con propuesta #338ced continua / sin propuesta #e76624 punteada; especies clave #d28e05 #00a888 #9887ef (graficas_vivas.js, validadas). */
import { COL, CAT, SEQ, esc, num, año, clave, tip, Linea, nodo, marcas, fmtEje, barraV, columnasAño } from './graficas_vivas.js?v=1';
import { T, IND, INDK, MACROS, CLAVE, valor, clavePct, claveArea, acceso, ACCESO_SUP, ACCESO_R, hayEstaciones, SEM_REF } from './indicadores_macro.js?v=1';

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
  autonomia: 'E8 red distribuida de producción alimentaria.',
  acceso: 'E7: 35 mercados de barrio que abren por fases cerca de los sectores peor servidos.',
  presion: 'E1 Bavaria Común y E6: suelo protegido e instrumentos de gestión del suelo.'
};

const CSS = `
#lp-tablero.pi-montado{padding:0!important}
.pi{--pi-pad:14px;--pi-sur:#1e2422;--tb-sur:#1e2422;--tb-grid:rgba(255,255,255,.07);--tb-axis:rgba(255,255,255,.22);font:400 12px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#f1f3ee);font-variant-numeric:tabular-nums;text-shadow:none;min-width:0}
.pi *{box-sizing:border-box}
.pi-hd{position:sticky;top:0;z-index:4;padding:12px var(--pi-pad) 0;background:linear-gradient(180deg,rgba(24,29,27,.97),rgba(22,27,25,.93));border-bottom:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.pi-l1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.pi-tit{font:500 15px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase}
.pi-sem{font:400 10.5px/1.2 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
.pi-sem b{font-weight:500;color:var(--ui-tx,#f1f3ee)}
.pi-esc{margin:4px 0 0;font-size:11px;color:var(--ui-tx2,#c9cfc4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-esc b{font-weight:600;color:var(--ui-tx,#f1f3ee)}
.pi-go{margin:6px 0 0;padding:5px 8px;border-radius:8px;border:1px solid rgba(220,60,61,.5);background:rgba(220,60,61,.12);font-size:11px;line-height:1.35}
.pi-tabs{display:flex;margin:10px calc(-1 * var(--pi-pad)) 0;padding:0 var(--pi-pad);border-top:1px solid rgba(255,255,255,.07)}
.pi-tab{all:unset;box-sizing:border-box;position:relative;flex:1;text-align:center;padding:10px 4px 9px;cursor:pointer;font:500 13px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
.pi-tab:hover,.pi-tab[aria-selected=true]{color:var(--ui-tx,#f1f3ee)}
.pi-tab[aria-selected=true]::after{content:'';position:absolute;left:10%;right:10%;bottom:0;border-bottom:2px solid var(--ui-acc,#d4ecb0)}
.pi-tab:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:-3px;border-radius:6px}
.pi-nav{display:flex;gap:4px;margin:0 calc(-1 * var(--pi-pad));padding:8px var(--pi-pad);overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,.06)}
.pi-nav[hidden]{display:none}
.pi-nav button{all:unset;box-sizing:border-box;flex:none;padding:5px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:500 11px/1 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-nav button:hover,.pi-nav button.on{border-color:var(--ui-acc,#d4ecb0);color:var(--ui-tx,#f1f3ee);background:rgba(212,236,176,.08)}
.pi-nav button:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px}
.pi-ley{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:10px;color:var(--ui-tx2,#c9cfc4);padding:8px var(--pi-pad) 0}
.pi-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-ley b{font-weight:600;color:var(--ui-tx,#f1f3ee)}
.pi-v{padding:4px var(--pi-pad) 18px}
.pi-v[hidden]{display:none}
.pi-vacio{font-size:11.5px;color:var(--ui-tx2,#c9cfc4);padding:16px var(--pi-pad)}
.pi-mac{scroll-margin-top:var(--pi-hd,120px)}
.pi-mac>h2{margin:16px 0 8px;display:flex;align-items:baseline;gap:8px;font:500 14.5px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx,#f1f3ee)}
.pi-mac>h2 i{font:400 10px var(--ui-mono,'JetBrains Mono',monospace);font-style:normal;color:var(--ui-acc,#d4ecb0);letter-spacing:.04em}
.pi-card{border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.025);padding:10px 11px 9px;margin:0 0 8px;scroll-margin-top:var(--pi-hd,120px)}
.pi-card.pi-flash{animation:pi-flash 1.2s ease}@keyframes pi-flash{0%{border-color:var(--ui-acc,#d4ecb0)}100%{border-color:rgba(255,255,255,.09)}}
.pi-ch{display:flex;align-items:center;gap:8px}
.pi-ch h3{flex:1;min-width:0;margin:0;font:500 11.5px/1.25 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);letter-spacing:.01em}
.pi-fx{all:unset;box-sizing:border-box;flex:none;display:inline-grid;place-items:center;width:28px;height:24px;border-radius:7px;border:1px solid rgba(255,255,255,.12);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-fx:hover,.pi-fx[aria-expanded=true]{color:var(--ui-tx,#f1f3ee);border-color:var(--ui-acc,#d4ecb0);background:rgba(212,236,176,.08)}
.pi-fx:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px}
.pi-val{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;margin:4px 0 2px}
.pi-val .v{font:400 26px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:-.03em;color:var(--ui-tx,#f1f3ee)}
.pi-val small{font:400 11px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f);margin-left:-4px}
.pi-val .dl{font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);margin-left:auto;white-space:nowrap}
.pi-val .dl b{font-weight:500}
.pi-val .dl b.up{color:#7fd49a}.pi-val .dl b.dn{color:#f08a7a}
.pi-cmp{display:flex;flex-wrap:wrap;gap:2px 12px;font-size:10.5px;color:var(--ui-tx3,#a5ae9f);margin:0 0 4px}
.pi-cmp span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-cmp b{font:500 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx,#f1f3ee)}
.pi-cmp .me{color:var(--ui-tx2,#c9cfc4)}
.pi-viz{min-width:0}
.pi svg.tb-svg{display:block;overflow:visible;touch-action:pan-y;max-width:100%;height:auto}
.pi-viz{overflow:hidden}
.pi svg.tb-svg text{font:9px var(--ui-sans,'Inter',system-ui,sans-serif);fill:var(--ui-tx3,#a5ae9f)}
.pi svg.tb-svg text.tb-tn{fill:var(--ui-tx2,#c9cfc4);font-size:9.5px}
.pi svg.tb-svg text.tb-tv{fill:var(--ui-tx,#f1f3ee);font:500 9.5px var(--ui-mono,'JetBrains Mono',monospace)}
.pi svg.tb-svg:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px;border-radius:3px}
.pi .tb-fin{transition:cx .3s ease,cy .3s ease}
.pi .pi-anim{transition:stroke-dashoffset .5s ease,d .5s ease,width .5s ease,height .5s ease,y .5s ease,transform .5s ease,cx .5s ease,cy .5s ease}
@media (prefers-reduced-motion:reduce){.pi .pi-anim,.pi .tb-fin{transition:none}}
.pi-sub{font-size:10px;line-height:1.4;color:var(--ui-tx3,#a5ae9f);margin:4px 0 0}
.pi-rings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:4px 0 2px}
.pi-ring{text-align:center;min-width:0}
.pi-ring svg{display:block;margin:0 auto;width:100%;max-width:96px;height:auto}
.pi-ring b{display:block;font:500 11px/1.2 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx,#f1f3ee)}
.pi-ring small{display:block;font:400 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f)}
.pi-cuerda{position:relative;margin:4px 0 0}
.pi-cuerda canvas{display:block;width:100%!important;max-width:430px;margin:2px auto 0}
.pi-hero{background:radial-gradient(120% 80% at 50% 40%,rgba(255,255,255,.05),rgba(255,255,255,.015));border-color:rgba(212,236,176,.22)}
.pi-hero .pi-ch h3{font:500 13px/1.2 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx,#f1f3ee)}
.pi-cuerda .pie{font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#c9cfc4);margin:4px 0 0;min-height:2.8em}
.pi-tipos{display:flex;flex-wrap:wrap;gap:3px 10px;margin:6px 0 4px;font-size:10px;color:var(--ui-tx2,#c9cfc4)}
.pi-tipos span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-tipos i{width:9px;height:9px;border-radius:2px;flex:none}
.pi-tipos b{font:500 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx,#f1f3ee)}
.pi-enc{font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4)}
.pi-enc b{font-weight:500;color:var(--ui-tx,#f1f3ee);font-size:13px}
.pi-dos{display:grid;grid-template-columns:118px minmax(0,1fr);gap:8px;align-items:center}
@container (max-width:330px){.pi-dos{grid-template-columns:1fr}}
.pi-form{margin:8px 0 2px;padding:10px 10px 8px;border-radius:10px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08)}
.pi-form[hidden]{display:none}
.pi-form math{font-size:13.5px;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx,#f1f3ee);margin:2px 0 8px;max-width:100%}
.pi-form math :is(mi,mn,mo,mtext){font-family:var(--ui-sans,'Inter',sans-serif);text-transform:none;font-style:normal}
.pi-form math mi{color:var(--ui-acc-tx,#e3f1cd)}
.pi-form h4{margin:8px 0 3px;font:500 10px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
.pi-form dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:11px}
.pi-form dt{font:500 11px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-acc,#d4ecb0);white-space:nowrap}
.pi-form dd{margin:0;color:var(--ui-tx2,#c9cfc4)}
.pi-form table{width:100%;border-collapse:collapse;font-size:10.5px}
.pi-form td,.pi-form th{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.07);text-align:right;font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx,#f1f3ee)}
.pi-form th{font:500 9.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f)}
.pi-form td:first-child,.pi-form th:first-child{text-align:left;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.pi-form p{margin:0;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
/* estrategias */
.pi-est{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.pi-est li{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px 11px;background:rgba(255,255,255,.025)}
.pi-est li.on{border-color:var(--c)}
.pi-est .h{display:flex;align-items:center;gap:8px}
.pi-est .h i{flex:none;width:10px;height:10px;border-radius:3px;background:var(--c)}
.pi-est .h b{flex:1;min-width:0;font:500 12.5px/1.25 var(--ui-sans,'Inter',sans-serif)}
.pi-est .h small{font:400 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f)}
.pi-est p{margin:5px 0 6px;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
.pi-est .ch{display:flex;flex-wrap:wrap;gap:4px}
.pi-est .ch button,.pi-est .mapa{all:unset;box-sizing:border-box;padding:3px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:400 10.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-est .ch button:hover,.pi-est .mapa:hover{color:var(--ui-tx,#f1f3ee);border-color:var(--ui-acc,#d4ecb0)}
.pi-est .mapa{display:inline-flex;align-items:center;gap:5px;flex:none}
.pi-est .mapa[aria-pressed=true]{color:var(--ui-tx,#f1f3ee);border-color:var(--c);background:rgba(255,255,255,.06)}
.pi-est :is(button,.mapa):focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px}
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
#tb-tip{position:fixed;z-index:10050;pointer-events:none;display:none;min-width:140px;max-width:270px;padding:7px 9px;border-radius:9px;background:rgba(18,22,21,.97);border:1px solid rgba(255,255,255,.15);box-shadow:0 10px 26px rgba(0,0,0,.45);color:#f1f3ee;font:11px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);font-variant-numeric:tabular-nums}
#tb-tip .t{color:#a9b2a6;font-size:10px;margin-bottom:3px}
#tb-tip .r{display:flex;align-items:center;gap:6px;white-space:nowrap}
#tb-tip .r b{font:500 11px var(--ui-mono,'JetBrains Mono',monospace)}
#tb-tip .r span{color:#b9c1b5}
`;

/* ---------- utilidades SVG ---------- */
const fija = (e, at) => { for (const k in at) { const v = String(at[k]); if (e.getAttribute(k) !== v) e.setAttribute(k, v); } };
const arco = (cx, cy, r, a0, a1) => { const p = (a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)], [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
const sig = (x, d) => { const r = +Math.abs(x).toFixed(d); return (r === 0 ? '±' : x > 0 ? '+' : '−') + num(Math.abs(x), d); };

/* anillo radial (0–max) con su pista; anima stroke-dashoffset */
function anillo(host, op) {
  const R = op.r || 34, S = 2 * R + 20, L = 2 * Math.PI * R, L2 = 2 * Math.PI * (R + 6);
  const s = nodo('svg', { viewBox: `0 0 ${S} ${S}`, width: S, height: S, role: 'img', 'aria-label': op.n }, host);
  nodo('circle', { cx: S / 2, cy: S / 2, r: R, fill: 'none', stroke: 'rgba(255,255,255,.09)', 'stroke-width': 7 }, s);
  const o = nodo('circle', { cx: S / 2, cy: S / 2, r: R + 6, fill: 'none', stroke: op.cOtro || COL.sin, 'stroke-width': 1.5, 'stroke-dasharray': '3 2', transform: `rotate(-90 ${S / 2} ${S / 2})`, class: 'pi-anim', opacity: 0.9 }, s);
  const a = nodo('circle', { cx: S / 2, cy: S / 2, r: R, fill: 'none', stroke: op.c, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': `${L} ${L}`, 'stroke-dashoffset': L, transform: `rotate(-90 ${S / 2} ${S / 2})`, class: 'pi-anim' }, s);
  const ref = op.ref != null ? nodo('line', {}, s) : null;
  if (ref) { const an = -Math.PI / 2 + 2 * Math.PI * Math.min(1, op.ref / op.max); fija(ref, { x1: S / 2 + (R - 7) * Math.cos(an), y1: S / 2 + (R - 7) * Math.sin(an), x2: S / 2 + (R + 7) * Math.cos(an), y2: S / 2 + (R + 7) * Math.sin(an), stroke: 'var(--ui-tx,#f1f3ee)', 'stroke-width': 1.5 }); }
  const t = nodo('text', { x: S / 2, y: S / 2 + 5, 'text-anchor': 'middle', style: 'font:500 14px var(--ui-mono,monospace);fill:var(--ui-tx,#f1f3ee)' }, s);
  return (v, vo) => { const f = (x) => Math.max(0, Math.min(1, (x || 0) / op.max));
    fija(a, { 'stroke-dashoffset': (L * (1 - f(v))).toFixed(1) }); fija(o, { 'stroke-dasharray': vo == null ? '0 999' : `${(L2 * f(vo)).toFixed(1)} ${L2}` });
    t.textContent = v == null ? '—' : num(v, op.d || 0) + (op.u || ''); };
}
/* medidor semicircular */
function semi(host, op) {
  const W = 118, H = 70, cx = W / 2, cy = 62, R = 50, a0 = Math.PI, a1 = 2 * Math.PI;
  const s = nodo('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': op.n, class: 'tb-svg' }, host);
  const A = (v) => a0 + (a1 - a0) * Math.max(0, Math.min(1, (v - op.min) / (op.max - op.min)));
  for (const b of op.bandas || []) nodo('path', { d: arco(cx, cy, R, A(b[0]), A(b[1])), fill: 'none', stroke: b[2], 'stroke-width': 9, 'stroke-opacity': 0.55 }, s);
  if (!op.bandas) nodo('path', { d: arco(cx, cy, R, a0, a1 - 1e-4), fill: 'none', stroke: 'rgba(255,255,255,.09)', 'stroke-width': 9 }, s);
  const val = op.bandas ? null : nodo('path', { fill: 'none', stroke: COL.con, 'stroke-width': 9, 'stroke-linecap': 'butt' }, s);
  const ag = nodo('line', { stroke: 'var(--ui-tx,#f1f3ee)', 'stroke-width': 2.2, 'stroke-linecap': 'round', class: 'pi-anim' }, s), agO = nodo('line', { stroke: COL.sin, 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, s);
  nodo('circle', { cx, cy, r: 3.5, fill: 'var(--ui-tx,#f1f3ee)' }, s);
  nodo('text', { x: cx - R, y: H, 'text-anchor': 'middle' }, s).textContent = op.min; nodo('text', { x: cx + R, y: H, 'text-anchor': 'middle' }, s).textContent = op.max;
  return (v, vo, colV) => { if (val) fija(val, { d: v == null ? '' : arco(cx, cy, R, a0, Math.max(a0 + 1e-3, A(v))), stroke: colV || COL.con });
    const p = (x, r) => [cx + r * Math.cos(A(x)), cy + r * Math.sin(A(x))];
    if (v != null) { const [x, y] = p(v, R + 4); fija(ag, { x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1) }); }
    if (vo != null) { const [x0, y0] = p(vo, R - 8), [x, y] = p(vo, R + 7); fija(agO, { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: x.toFixed(1), y2: y.toFixed(1), visibility: 'visible' }); } else fija(agO, { visibility: 'hidden' }); };
}

export function iniciarPanelIndicadores({ R, getM, getFIN }) {
  if (!document.getElementById('pi-css')) { const st = document.createElement('style'); st.id = 'pi-css'; st.textContent = CSS; document.head.appendChild(st); }
  let root = null, wrap = null, hd = null, vista = 'ind', simHecho, H0 = null, nHecho = -1, nBase = -1, ultimo = 0, sucio = true, pendiente = false, espera0 = performance.now(), goHecho = null;
  const CACHE = new Map(), cards = new Map(); let io = null;

  function montar() {
    let s = document.getElementById('lp-tablero');
    if (!s && performance.now() - espera0 > 6000) { s = document.createElement('aside'); s.id = 'lp-tablero'; s.setAttribute('aria-label', 'Tablero'); s.style.cssText = 'position:fixed;top:66px;right:14px;bottom:14px;width:min(440px,92vw);overflow-y:auto;z-index:40;background:var(--ui-glass,rgba(22,27,25,.9));border-radius:16px'; document.body.appendChild(s); }
    if (!s) return false;
    if (s !== root || !wrap || !s.contains(wrap)) { root = s; s.classList.add('pi-montado'); s.querySelectorAll(':scope > .tb, :scope > .pi').forEach((e) => e.remove()); wrap = document.createElement('div'); wrap.className = 'pi'; root.appendChild(wrap); esqueleto();
      root.addEventListener('pointermove', (e) => { const g = e.target.closest && e.target.closest('[data-tt]'); if (g && !e.target.closest('svg.tb-lin')) { const [t0, ...rs] = g.getAttribute('data-tt').split('|'); tip().mostrar(`<div class="t">${esc(t0)}</div>${rs.map((x) => `<div class="r">${esc(x)}</div>`).join('')}`, e.clientX, e.clientY); } else if (!e.target.closest || !e.target.closest('svg.tb-lin')) tip().ocultar(); });
      root.addEventListener('pointerleave', () => tip().ocultar());
      if ('ResizeObserver' in window) new ResizeObserver(() => { sucio = true; if (hd) wrap.style.setProperty('--pi-hd', hd.offsetHeight + 8 + 'px'); }).observe(wrap); }
    return true;
  }

  /* ---------- esqueleto ---------- */
  const VISTAS = [['ind', 'Indicadores'], ['est', 'Estrategias']]; /* las variables van en el acordeón de cada simulación (panel izquierdo, limpio.js) */
  function esqueleto() {
    wrap.innerHTML = `<header class="pi-hd"><div class="pi-l1"><span class="pi-tit">Tablero en vivo</span><span class="pi-sem"></span></div><p class="pi-esc"></p><p class="pi-go" hidden></p>`
      + `<div class="pi-tabs" role="tablist" aria-label="Contenido del tablero">${VISTAS.map(([id, n]) => `<button type="button" role="tab" class="pi-tab" id="pi-t-${id}" data-v="${id}" aria-selected="${id === vista}" tabindex="${id === vista ? 0 : -1}">${n}</button>`).join('')}</div>`
      + `<nav class="pi-nav" aria-label="Macromodelos">${MACROS.map((m, i) => `<button type="button" data-m="${m.id}">${i + 1} · ${m.c}</button>`).join('')}</nav></header>`
      + `<div class="pi-v" role="tabpanel" id="pi-v-ind" aria-labelledby="pi-t-ind"${vista === 'ind' ? '' : ' hidden'}><div class="pi-ley" style="padding:8px 0 0">${clave(COL.con)}<span>Con propuesta</span>${clave(COL.sin, 'pun')}<span>Sin propuesta</span><span class="pi-run"></span></div><p class="pi-vacio" hidden></p><div class="pi-macs"></div></div>`
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
    a.innerHTML = `<div class="pi-ch"><h3>${k === 'inter' ? 'Interacciones bióticas · quién interactúa con quién' : esc(d.n)}</h3><button type="button" class="pi-fx" aria-expanded="false" aria-controls="pi-f-${k}" aria-label="Ver fórmula de ${esc(d.n)}" title="Ver fórmula">${ICO_FX}</button></div>`
      + `<div class="pi-val"><b class="v">—</b><small>${esc(d.u === '%' ? '%' : d.u)}</small><span class="dl"></span></div><div class="pi-cmp"></div><div class="pi-viz"></div><div class="pi-form" id="pi-f-${k}" hidden></div>`;
    sec.appendChild(a);
    if (k === 'inter') a.classList.add('pi-hero');
    const C = { k, el: a, vis: false, abierta: false, up: viz ? viz(a.querySelector('.pi-viz'), a) : null };
    a.querySelector('.pi-fx').addEventListener('click', (e) => { C.abierta = !C.abierta; e.currentTarget.setAttribute('aria-expanded', C.abierta); a.querySelector('.pi-form').hidden = !C.abierta; if (C.abierta && R.hist.length) { try { formula(C, ctxDe()); } catch (er) { console.warn('tablero:', er); } } });
    cards.set(k, C); if (io) io.observe(a); return C;
  }
  function cabecera(C, c) {
    const d = INDK[C.k], v = valor(C.k, c.I, c.CA), v1 = c.n > SEM_REF ? valor(C.k, c.I1, c.CA) : null, vo = c.Bk ? valor(C.k, c.Bk, c.CB) : null, el = C.el;
    el.querySelector('.v').textContent = v == null ? '—' : num(v, d.d);
    const dl = el.querySelector('.dl');
    if (v != null && v1 != null) { const dx = v - v1, mejor = d.acum || Math.abs(dx) < Math.pow(10, -d.d) / 2 ? null : d.sube ? dx > 0 : dx < 0; dl.innerHTML = `vs año 1 <b class="${mejor == null ? '' : mejor ? 'up' : 'dn'}">${sig(dx, d.d)}${d.u === '%' ? ' pts' : d.u ? ' ' + esc(d.u) : ''}</b>`; }
    else dl.textContent = c.n <= SEM_REF ? 'año 1 en curso' : '';
    const vc = c.prop ? v : vo, vs = c.prop ? vo : v, u = d.u === '%' ? ' %' : d.u ? ' ' + d.u : '';
    el.querySelector('.pi-cmp').innerHTML = `<span class="${c.prop ? 'me' : ''}">${clave(COL.con)}Con <b>${vc == null ? '—' : num(vc, d.d) + esc(u)}</b></span><span class="${c.prop ? '' : 'me'}">${clave(COL.sin, 'pun')}Sin <b>${vs == null ? '—' : num(vs, d.d) + esc(u)}</b></span>`;
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
      case 'cobertura': return [dos('kg recibidos/día', (I) => Math.min(1, t(I).cobertura / 100) * t(I).demanda * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Sectores bajo 80 %', (I) => (t(I).sectores || []).filter((s) => s.valor < 80).length), dos('C', (I) => valor('cobertura', I), 1, ' %')];
      case 'autonomia': return [dos('kg locales consumidos/día', (I) => t(I).autonomia / 100 * t(I).demanda * 1000), dos('kg producidos/día', (I) => t(I).produccion * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Au', (I) => t(I).autonomia, 2, ' %')];
      case 'acceso': { const aA = acceso(A, c.M), aB = B ? acceso(B, c.M) : null, q = (o, f, d = 0, u = '') => (o ? n(f(o), d, u) : '—');
        return [['Habitantes cubiertos', q(aA, (o) => o.cubiertos), q(aB, (o) => o.cubiertos)], ['Habitantes totales', q(aA, (o) => o.total), q(aB, (o) => o.total)], ['Mercados abiertos', q(aA, (o) => o.mercados.length), q(aB, (o) => o.mercados.length)], ['Radio en línea recta', n(ACCESO_R, 0, ' m'), n(ACCESO_R, 0, ' m')], ['Ac', q(aA, (o) => o.pct, 1, ' %'), q(aB, (o) => o.pct, 1, ' %')]]; }
      case 'presion': return [dos('Pᵢ (semana 1)', (I, C) => C.H[0] && C.H[0].especulacion.indice, 3), dos('P_f (esta semana)', (I) => I.especulacion.indice, 3), dos('Hogares en riesgo', (I) => I.especulacion.hogaresRiesgo), dos('P', (I, C) => valor('presion', I, C), 2, ' %')];
    }
    return [];
  }

  /* ---------- visualizaciones por indicador ---------- */
  const linea = (host, k, op = {}) => { const d = INDK[k], L = new Linea(host, { n: d.n, u: d.u, d: d.d, alto: op.alto || 74, cero: op.cero, pl: 32 }); return (c) => { const S = serie(c, k, vK(k)); L.update({ W: c.W, FIN: c.FIN, xs: S.xs, con: S.con, sin: S.sin, run: c.prop ? 'con' : 'sin' }); }; };
  const VIZ = {
    shannon: (h) => linea(h, 'shannon', { alto: 84 }),
    clave: (h) => { const g = document.createElement('div'); g.className = 'pi-rings'; h.appendChild(g);
      const R2 = CLAVE.map((e) => { const d = document.createElement('div'); d.className = 'pi-ring'; g.appendChild(d); const up = anillo(d, { n: e.larga, c: e.c, max: 150, ref: 100, u: '%' }); d.insertAdjacentHTML('beforeend', `<b>${esc(e.n)}</b><small></small>`); return { e, up, sm: d.querySelector('small'), d }; });
      h.insertAdjacentHTML('beforeend', `<div class="pi-ley" style="padding:4px 0 0">${clave('var(--ui-tx,#f1f3ee)', 'tick')}<span>año 1 = 100 %</span>${clave(COL.sin, 'pun')}<span>otra corrida</span></div>`);
      return (c) => { for (const r of R2) { const v = clavePct(c.I, r.e.id, c.CA), vo = c.Bk ? clavePct(c.Bk, r.e.id, c.CB) : null; r.up(v, vo); r.sm.textContent = `${c.prop ? 'sin' : 'con'} ${vo == null ? '—' : num(vo) + ' %'}`; r.d.setAttribute('data-tt', `${r.e.larga}|Ahora: ${num(v)} % del año 1|${num(claveArea(c.I, r.e.id), 1)} ha ocupadas|${c.prop ? 'Sin' : 'Con'} propuesta: ${vo == null ? '—' : num(vo) + ' %'}`); } }; },
    inter: (h, el) => { const box = document.createElement('div'); box.className = 'pi-cuerda'; h.appendChild(box);
      box.innerHTML = '<div class="pi-enc"><b>0</b> encuentros ocurriendo ahora en el 3D</div><div class="pi-cv"></div><p class="pie">Pasa sobre una especie para ver con quién se relaciona.</p><div class="pi-tipos"></div>';
      const L = linea(h, 'inter', { alto: 64 }); let tiposN = 0;
      const vivo = () => { const cv = document.getElementById('tb-cuerda'), slot = box.querySelector('.pi-cv'); if (cv && cv.parentNode !== slot) slot.appendChild(cv);
        const on = !!cv && vista === 'ind' && cards.get('inter').vis && !!root && root.getClientRects().length > 0 && !document.hidden; window.KEN_CUERDA_VIVA = on;
        if (!on) return; box.querySelector('.pi-enc b').textContent = num(window.KEN_ENC || 0);
        const p1 = document.getElementById('tb-pie1'); if (p1 && p1.textContent) box.querySelector('.pie').innerHTML = p1.innerHTML;
        const bio = window.KEN_T3 && window.KEN_T3.bio; if (bio && bio.TIPOS) { const E = bio.ENCL || bio.ENC || [];
          if (tiposN !== bio.TIPOS.length) { tiposN = bio.TIPOS.length; box.querySelector('.pi-tipos').innerHTML = bio.TIPOS.map((t, i) => `<span><i style="background:${t.c}"></i>${esc(t.n)} <b data-i="${i}">0</b></span>`).join(''); }
          box.querySelectorAll('.pi-tipos b').forEach((b) => { const v = E[+b.dataset.i] || 0, tx = num(v); if (b.textContent !== tx) b.textContent = tx; }); } };
      const iv = setInterval(() => { if (!box.isConnected) { clearInterval(iv); return; } vivo(); }, 400);
      return (c) => { vivo(); L(c); }; },
    verde: (h) => { return linea(h, 'verde', { alto: 74 }); },
    conect: (h) => { const g = document.createElement('div'); g.className = 'pi-dos'; h.appendChild(g); const a = document.createElement('div'), b = document.createElement('div'); g.append(a, b);
      const G = semi(a, { n: 'Conectividad ecológica', min: 0, max: 100 }); const svg = nodo('svg', { class: 'tb-svg', role: 'img', 'aria-label': 'Red de parches verdes y sus conexiones' }, b), gl = nodo('g', {}, svg), gp = nodo('g', {}, svg);
      h.insertAdjacentHTML('beforeend', `<div class="pi-ley" style="padding:4px 0 0">${clave('#7fd49a')}<span>conexión (≥ 0,5)</span>${clave('rgba(255,255,255,.35)', 'pun')}<span>débil</span>${clave(COL.lim, 'pun')}<span>rota</span></div>`);
      const L = linea(h, 'conect', { alto: 58, cero: true }); let kk = '';
      return (c) => { const v = valor('conect', c.I), vo = c.Bk ? valor('conect', c.Bk) : null; G(v, vo, c.prop ? COL.con : COL.sin); L(c);
        const V = c.I.verde; if (!V) return; const k = c.I.sem >> 2; if (k === kk) return; kk = k; const P = V.parches.filter((p) => p.r > 0); if (!P.length) return;
        const w = Math.max(120, b.clientWidth || 200), ht = Math.round(w * 0.72), xs = P.map((p) => p.x), zs = P.map((p) => p.z), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), sc = Math.min((w - 8) / (x1 - x0 || 1), (ht - 8) / (z1 - z0 || 1));
        const X = (x) => 4 + (x - x0) * sc, Y = (z) => 4 + (z - z0) * sc; fija(svg, { width: w, height: ht, viewBox: `0 0 ${w} ${ht}` });
        gl.innerHTML = V.conexiones.map((L2) => `<line x1="${X(L2.x1).toFixed(1)}" y1="${Y(L2.z1).toFixed(1)}" x2="${X(L2.x2).toFixed(1)}" y2="${Y(L2.z2).toFixed(1)}" stroke="${L2.tipo === 'roto' ? COL.lim : L2.f >= 0.5 ? '#7fd49a' : 'rgba(255,255,255,.35)'}" stroke-width="${L2.f >= 0.5 ? 1.4 : 1}" ${L2.f >= 0.5 && L2.tipo !== 'roto' ? '' : 'stroke-dasharray="2 2"'} opacity=".85"/>`).join('');
        gp.innerHTML = P.map((p) => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.z).toFixed(1)}" r="${Math.max(1.6, Math.min(7, p.r * sc * 0.9)).toFixed(1)}" fill="${p.tipo === 'nuevo' ? '#84cc16' : p.tipo === 'liberado' ? '#fb923c' : '#34d399'}" fill-opacity=".8" stroke="var(--tb-sur)" stroke-width="1" data-tt="${esc(`${p.n}|${p.tipo}|calidad ${num(p.calidad * 100)} %`)}"/>`).join(''); }; },
    atrop: (h) => { const B1 = document.createElement('div'); h.appendChild(B1); let k0 = '';
      h.insertAdjacentHTML('beforeend', `<div class="pi-ley" style="padding:4px 0 0">${clave(COL.con, 'barra')}<span>Con propuesta</span>${clave(COL.sin, 'hueca')}<span>Sin propuesta</span><span>por año</span></div>`);
      return (c) => { const A = c.I.atropellos.porAño || [], Ab = c.Bk ? c.Bk.atropellos.porAño || [] : [], nA = Math.min(15, Math.ceil(c.n / 52)), conA = c.prop ? A : Ab, sinA = c.prop ? Ab : A, años = [];
        for (let y = 0; y < 15; y++) años.push(y < nA ? [[conA[y] || 0], [sinA[y] || 0]] : null);
        const k = JSON.stringify(años) + c.W; if (k === k0) return; k0 = k;
        B1.innerHTML = columnasAño(años, [[{ c: COL.con }], [{ c: COL.sin, op: 0.35 }]], c.W, { alto: 92, aria: 'Atropellos de fauna por año, con y sin propuesta', tt: (y, r) => `Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}|Con propuesta: ${num(r[0][0])}|Sin propuesta: ${num(r[1][0])}` }); }; },
    ruido: (h) => { const g = document.createElement('div'); g.className = 'pi-dos'; h.appendChild(g); const a = document.createElement('div'), b = document.createElement('div'); g.append(a, b);
      const G = semi(a, { n: 'Ruido promedio en dB(A)', min: 40, max: 80, bandas: [[40, 50, '#3f8f5e'], [50, 65, '#b9a23a'], [65, 75, '#c56a2e'], [75, 80, '#b83a3a']] });
      b.innerHTML = `<div class="pi-ley" style="padding:0;flex-direction:column;gap:3px">${[['#3f8f5e', '≤ 50 sin efecto'], ['#b9a23a', '50–65 molestia'], ['#c56a2e', '65–75 fuerte'], ['#b83a3a', '> 75 pérdida']].map(([c2, n2]) => `<span>${clave(c2, 'barra')}${n2}</span>`).join('')}</div>`;
      const L = linea(h, 'ruido', { alto: 70 }); return (c) => { G(valor('ruido', c.I), c.Bk ? valor('ruido', c.Bk) : null); L(c); }; },
    bienestar: (h) => { const W0 = 300, H0 = 104, pl = 30, pr = 6, pt = 8, pb = 16; const s = nodo('svg', { class: 'tb-svg', height: H0, role: 'img', 'aria-label': 'Curva dosis-respuesta del bienestar de la fauna frente al ruido' }, h);
      const g0 = nodo('g', {}, s), pc = nodo('circle', { r: 5, fill: COL.con, stroke: 'var(--tb-sur)', 'stroke-width': 2, class: 'pi-anim' }, s), ps = nodo('circle', { r: 4.5, fill: 'none', stroke: COL.sin, 'stroke-width': 2, 'stroke-dasharray': '2 1.5', class: 'pi-anim' }, s);
      h.insertAdjacentHTML('beforeend', `<div class="pi-ley" style="padding:3px 0 0">${clave('var(--ui-tx2,#c9cfc4)')}<span>dosis-respuesta</span><span><svg width="9" height="9" aria-hidden="true"><circle cx="4.5" cy="4.5" r="4" fill="${COL.con}"/></svg>con</span><span><svg width="9" height="9" aria-hidden="true"><circle cx="4.5" cy="4.5" r="3.5" fill="none" stroke="${COL.sin}" stroke-width="1.5"/></svg>sin</span><span>(ruido medio de las aves)</span></div>`);
      const L = linea(h, 'bienestar', { alto: 62 }); let w0 = 0;
      return (c) => { const W = c.W, iw = W - pl - pr, ih = H0 - pt - pb, X = (db) => pl + (db - 40) / 40 * iw, Y = (b) => pt + ih - b * ih;
        if (W !== w0) { w0 = W; fija(s, { width: W, viewBox: `0 0 ${W} ${H0}` }); let t = '';
          for (const b of [0, 0.5, 1]) t += `<line x1="${pl}" x2="${W - pr}" y1="${Y(b).toFixed(1)}" y2="${Y(b).toFixed(1)}" stroke="var(--tb-grid)"/><text x="${pl - 4}" y="${(Y(b) + 3).toFixed(1)}" text-anchor="end">${b * 100}%</text>`;
          for (const db of [40, 50, 60, 70, 80]) t += `<text x="${X(db).toFixed(1)}" y="${H0 - 3}" text-anchor="middle">${db}${db === 80 ? ' dB(A)' : ''}</text>`;
          t += `<rect x="${X(50).toFixed(1)}" y="${pt}" width="${(X(75) - X(50)).toFixed(1)}" height="${ih}" fill="#fbb315" fill-opacity=".05"/><path d="M${X(40)} ${Y(1)}L${X(50)} ${Y(1)}L${X(75)} ${Y(0)}L${X(80)} ${Y(0)}" fill="none" stroke="var(--ui-tx2,#c9cfc4)" stroke-width="1.6"/>`; g0.innerHTML = t; }
        const pto = (I, e, col) => { const A = I && I.avesRuido; if (!A || A.dbAves == null) { fija(e, { visibility: 'hidden' }); return; } fija(e, { cx: X(Math.max(40, Math.min(80, A.dbAves))).toFixed(1), cy: Y(A.bienestarFauna).toFixed(1), visibility: 'visible' }); e.setAttribute('data-tt', `${col}|${num(A.dbAves, 1)} dB(A) de exposición media|bienestar ${num(A.bienestarFauna * 100, 1)} %`); };
        const Ic = c.prop ? c.I : c.Bk, Is = c.prop ? c.Bk : c.I; pto(Ic, pc, 'Con propuesta'); pto(Is, ps, 'Sin propuesta'); L(c); }; },
    saturacion: (h) => { const B1 = document.createElement('div'); h.appendChild(B1); const L = linea(h, 'saturacion', { alto: 62, cero: true }); let k0 = '';
      return (c) => { const I = c.prop ? c.I : c.Bk, t = T(I); L(c);
        if (!I || !hayEstaciones(I)) { const tx = '<p class="pi-sub">Sin Estaciones Circulares en ninguna de las dos corridas.</p>'; if (k0 !== tx) { k0 = tx; B1.innerHTML = tx; } return; }
        const est = (t.estaciones || []).filter((e) => isFinite(e.valor)).sort((a, b) => b.valor - a.valor).slice(0, 16);
        const filas = est.length ? est.map((e) => ({ n: e.n.replace(/^Estación Circular · /, ''), v: e.valor, tt: `${e.n}|Llena: ${num(e.valor)} %|Acumulado: ${num(e.acumulado_t * 1000)} kg|Trata ${num(e.tratado_t_dia * 1000)} de ${num(e.cap_t_dia * 1000)} kg/día` })) : [{ n: 'Todas las estaciones', v: t.saturacion, tt: `Estaciones Circulares|${num(t.pendientes * 1000)} kg de ${num(t.capacidadAlmacen * 1000)} kg` }];
        const W = c.W, n = filas.length, gw = Math.min(26, (W - 30) / n - 4), Hh = 64, k = JSON.stringify(filas.map((f) => Math.round(f.v))) + W; if (k === k0) return; k0 = k;
        let s = `<svg class="tb-svg" width="${W}" height="${Hh + 14}" viewBox="0 0 ${W} ${Hh + 14}" role="img" aria-label="Llenado de cada Estación Circular">`;
        filas.forEach((f, i) => { const x = 26 + i * (gw + 4), hv = Math.min(1.2, f.v / 100) / 1.2 * Hh, col = f.v >= 100 ? '#dc3c3d' : f.v >= 85 ? '#fbb315' : COL.con;
          s += `<g data-tt="${esc(f.tt)}"><rect x="${x}" y="0" width="${gw}" height="${Hh}" rx="3" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)"/><path class="tb-m" d="${barraV(x, Hh - hv, gw, hv, 3)}" fill="${col}"/></g>`; });
        const y100 = Hh - Hh / 1.2; s += `<line x1="22" x2="${26 + n * (gw + 4)}" y1="${y100.toFixed(1)}" y2="${y100.toFixed(1)}" stroke="${COL.lim}" stroke-dasharray="3 2"/><text x="20" y="${(y100 + 3).toFixed(1)}" text-anchor="end">100%</text><text x="20" y="${Hh}" text-anchor="end">0</text><text x="26" y="${Hh + 12}">${est.length ? n + (n === 1 ? ' estación' : ' estaciones (las más llenas)') : 'Estaciones Circulares, total'}</text></svg>`;
        B1.innerHTML = s; }; },
    aprov: (h) => { const B1 = document.createElement('div'); h.appendChild(B1); const L = linea(h, 'aprov', { alto: 62, cero: true }); let k0 = '';
      return (c) => { L(c); const fila = (I, lab, hueca) => { if (!I) return null; const t = T(I), G = t.organicos || 0, Tt = Math.min(G, t.tratados || 0), sr = (I.basura && I.basura.fraccionSinRecoger || 0) * Math.max(0, G - Tt); return { lab, G, seg: [[Tt, '#00a888', 'Aprovechado'], [Math.max(0, G - Tt - sr), '#8b938a', 'Relleno Doña Juana'], [sr, '#d28e05', 'Sin recoger']], hueca }; };
        const F2 = [fila(c.prop ? c.I : c.Bk, 'Con', false), fila(c.prop ? c.Bk : c.I, 'Sin', true)].filter(Boolean), W = c.W, x0 = 34, bw = W - x0 - 44, k = JSON.stringify(F2.map((f) => f.seg.map((s2) => Math.round(s2[0])))) + W; if (k === k0) return; k0 = k;
        let s = `<svg class="tb-svg" width="${W}" height="${F2.length * 20 + 4}" viewBox="0 0 ${W} ${F2.length * 20 + 4}" role="img" aria-label="Destino de los orgánicos generados">`;
        F2.forEach((f, i) => { let x = x0; const y = i * 20 + 3; s += `<text class="tb-tn" x="${x0 - 4}" y="${y + 9}" text-anchor="end">${f.lab}</text>`;
          for (const [v, col, n] of f.seg) { const w = f.G ? v / f.G * bw : 0; if (w < 0.4) continue; s += `<rect data-tt="${esc(`${n}|${num(v * 1000)} kg/día|${num(v / f.G * 100, 1)} % de lo generado|${f.lab} propuesta`)}" x="${x.toFixed(1)}" y="${y}" width="${Math.max(0.5, w - 1.5).toFixed(1)}" height="12" rx="2" fill="${col}"${f.hueca ? ' fill-opacity=".45"' : ''}/>`; x += w; }
          s += `<text class="tb-tv" x="${x0 + bw + 5}" y="${y + 9}">${num(f.seg[0][0] / (f.G || 1) * 100, 1)} %</text>`; });
        B1.innerHTML = s + `</svg><div class="pi-ley" style="padding:3px 0 0">${clave('#00a888', 'barra')}<span>Aprovechado</span>${clave('#8b938a', 'barra')}<span>Relleno</span>${clave('#d28e05', 'barra')}<span>Sin recoger</span></div>`; }; },
    cobertura: (h) => { const B1 = document.createElement('div'); h.appendChild(B1); let k0 = '';
      return (c) => { const fila = (I, lab) => { const S = (T(I).sectores || []).filter((s) => isFinite(s.valor)).map((s) => ({ n: s.n, v: Math.min(100, s.valor) })).sort((a, b) => a.v - b.v); return { lab, S }; };
        const F2 = [c.prop ? c.I : c.Bk, c.prop ? c.Bk : c.I].map((I, i) => (I ? fila(I, i ? 'Sin' : 'Con') : null)).filter((f) => f && f.S.length);
        if (!F2.length) { if (k0 !== 'x') { k0 = 'x'; B1.innerHTML = '<p class="pi-sub">Esta corrida no reparte la comida por sector.</p>'; } return; }
        const W = c.W, x0 = 34, bw = W - x0 - 4, k = F2.map((f) => f.S.map((s) => Math.round(s.v)).join(',')).join('|') + W; if (k === k0) return; k0 = k; const col = (v) => SEQ[Math.max(0, Math.min(SEQ.length - 1, Math.floor((v - 60) / 40 * SEQ.length)))];
        let s = `<svg class="tb-svg" width="${W}" height="${F2.length * 22 + 12}" viewBox="0 0 ${W} ${F2.length * 22 + 12}" role="img" aria-label="Cobertura alimentaria de cada sector, del peor al mejor">`;
        F2.forEach((f, i) => { const y = i * 22 + 2, cw = bw / f.S.length; s += `<text class="tb-tn" x="${x0 - 4}" y="${y + 11}" text-anchor="end">${f.lab}</text>`;
          f.S.forEach((q, j) => { s += `<rect data-tt="${esc(`${q.n}|${num(q.v, 1)} % de su demanda|${f.lab} propuesta`)}" x="${(x0 + j * cw).toFixed(2)}" y="${y}" width="${Math.max(0.6, cw - 0.6).toFixed(2)}" height="16" fill="${q.v < 80 ? '#dc3c3d' : col(q.v)}"/>`; }); });
        s += `<text x="${x0}" y="${F2.length * 22 + 10}">peor sector</text><text x="${W - 4}" y="${F2.length * 22 + 10}" text-anchor="end">mejor · ${F2[0].S.length} sectores</text></svg>`;
        B1.innerHTML = s + `<div class="pi-ley" style="padding:3px 0 0"><span>60 %</span>${SEQ.map((x) => `<svg width="12" height="8" aria-hidden="true"><rect width="12" height="8" rx="1.5" fill="${x}"/></svg>`).join('')}<span>100 %</span>${clave('#dc3c3d', 'barra')}<span>bajo 80 %</span></div>`; }; },
    autonomia: (h) => { const g = document.createElement('div'); g.className = 'pi-dos'; h.appendChild(g); const a = document.createElement('div'), b = document.createElement('div'); g.append(a, b);
      const up = anillo(a, { n: 'Autonomía alimentaria sobre 100 %', c: COL.con, max: 100, d: 2, u: '%', r: 38 }); b.innerHTML = '<div class="pi-ley" style="padding:0"><span>anillo = 0–100 % de la demanda</span></div>';
      const L = linea(h, 'autonomia', { alto: 62, cero: true }); return (c) => { up(valor('autonomia', c.I), c.Bk ? valor('autonomia', c.Bk) : null); L(c); }; },
    acceso: (h) => { const svg = nodo('svg', { class: 'tb-svg', style: 'overflow:hidden', role: 'img', 'aria-label': 'Sectores a 15 minutos a pie de un mercado' }, h), gs = nodo('g', {}, svg), gm = nodo('g', {}, svg);
      h.insertAdjacentHTML('beforeend', `<div class="pi-ley" style="padding:3px 0 0"><span><svg width="9" height="9" aria-hidden="true"><circle cx="4.5" cy="4.5" r="4" fill="#7fd49a"/></svg>a ≤ 15 min</span><span><svg width="9" height="9" aria-hidden="true"><circle cx="4.5" cy="4.5" r="3.5" fill="none" stroke="rgba(255,255,255,.4)"/></svg>más lejos</span><span><svg width="9" height="9" aria-hidden="true"><rect x="1" y="1" width="7" height="7" fill="#facc15"/></svg>mercado</span><span>(esta corrida)</span></div>`);
      const L = linea(h, 'acceso', { alto: 62, cero: true }); let k0 = '';
      return (c) => { L(c); const a = acceso(c.I, c.M); if (!a) return; const k = a.mercados.length + '|' + c.W; if (k === k0) return; k0 = k;
        const W = c.W, ht = Math.round(W * 0.8), P2 = a.sectores.concat(a.mercados), xs = P2.map((s) => s.x), zs = P2.map((s) => s.z), x0 = Math.min(...xs) - 300, x1 = Math.max(...xs) + 300, z0 = Math.min(...zs) - 300, z1 = Math.max(...zs) + 300, sc = Math.min(W / (x1 - x0), ht / (z1 - z0));
        const X = (x) => (x - x0) * sc + (W - (x1 - x0) * sc) / 2, Y = (z) => (z - z0) * sc; fija(svg, { width: W, height: Math.round((z1 - z0) * sc), viewBox: `0 0 ${W} ${Math.round((z1 - z0) * sc)}` });
        gs.innerHTML = a.sectores.map((s) => `<circle cx="${X(s.x).toFixed(1)}" cy="${Y(s.z).toFixed(1)}" r="${Math.max(2, Math.min(5, Math.sqrt(s.w) * 6)).toFixed(1)}" ${s.ok ? 'fill="#7fd49a" fill-opacity=".85"' : 'fill="none" stroke="rgba(255,255,255,.35)"'} data-tt="${esc(`Sector|${num(s.d)} m al mercado más cercano|${s.ok ? 'a 15 min o menos a pie' : 'a más de 15 min a pie'}`)}"/>`).join('');
        gm.innerHTML = a.mercados.map((m) => `<g data-tt="${esc(`${m.n}|${m.tipo === 'propuesta' ? 'mercado de la propuesta' : m.tipo === 'plaza' ? 'plaza existente' : 'central mayorista'}`)}"><circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.z).toFixed(1)}" r="${(ACCESO_R * sc).toFixed(1)}" fill="#facc15" fill-opacity=".035"/><rect x="${(X(m.x) - 3).toFixed(1)}" y="${(Y(m.z) - 3).toFixed(1)}" width="6" height="6" fill="#facc15" stroke="var(--tb-sur)"/></g>`).join(''); }; },
    presion: (h) => linea(h, 'presion', { alto: 84, cero: true })
  };

  function construirIndicadores() {
    const box = wrap.querySelector('.pi-macs'); cards.clear();
    if (io) io.disconnect();
    io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { for (const e of es) { const C = cards.get(e.target.dataset.k); if (!C) continue; const ant = C.vis; C.vis = e.isIntersecting; if (C.vis && !ant) { sucio = true; programar(); } } }, { root: root, rootMargin: '200px 0px' }) : null;
    MACROS.forEach((m, i) => { const s = document.createElement('section'); s.className = 'pi-mac'; s.id = 'pi-m-' + m.id; s.setAttribute('aria-labelledby', 'pi-h-' + m.id);
      s.innerHTML = `<h2 id="pi-h-${m.id}"><i>${String(i + 1).padStart(2, '0')}</i>${esc(m.n)}</h2>`; box.appendChild(s);
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
