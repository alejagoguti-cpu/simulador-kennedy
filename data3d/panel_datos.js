/* ============ TABLERO EN TIEMPO REAL (columna derecha, aside#lp-tablero) ============
   Las gráficas en vivo de los tres sistemas de la simulación (balance_final.js: Ecocentrismo · Circularidad de recursos · Comercio
   ecológico) más Movilidad y Sociedad. Todo sale de R.hist (corrida actual, un I por semana) y R.ecoBase / R.base (la otra mitad del
   par, misma semilla): aquí no se calcula nada del modelo.
   · Encabezado fijo: semana y año, escenario, veredicto y la franja «Límites»: las 7 REGLAS de game over de simulaciones12.js como
     gráficas de bala (valor ahora, umbral, zona «cerca» con los MISMOS umbrales CERCA del modelo y las semanas seguidas fuera, 0–4).
   · Pestañas (una por sistema). Cada una: indicadores clave con chispa, gráficas propias del sistema y una tabla en tiempo real ordenable.
   · Rendimiento: solo se dibuja la pestaña visible, solo cuando avanzan las semanas, como mucho 4 veces por segundo y en tiempo ocioso;
     las gráficas de línea y el mapa de calor reutilizan sus nodos SVG (solo cambian atributos). Primitivas: graficas_vivas.js. */
import { COL, CAT, ESTADO, icono, esc, fin, num, año, clave, tip, Linea, Apilada, Chispa, MapaCalor, barrasH, columnasAño, sankey, nodo, marcas, fmtEje, barraV } from './graficas_vivas.js?v=1';

const T = (I) => (I && I.evaluacion && I.evaluacion.territorio) || {};
const ev = (f, I) => { if (!I) return null; try { return fin(f(I)); } catch (e) { return null; } };
const minSector = (I) => { const s = (T(I).sectores || []).filter((x) => isFinite(x.valor)); return s.length ? Math.min(...s.map((x) => x.valor)) : null; };
const relleno = (I) => { const r = (I.estaciones || []).find((e) => e.tipo === 'relleno'); return r ? r.tratado_t_dia : null; };
const PASO = 2; // las series de 15 años se muestrean cada 2 semanas (390 puntos)

/* ---------- LÍMITES: las 7 REGLAS de simulaciones12.js (VALOR, MALO y CERCA copiados de allí; abasto como el game over real: por sector) ---------- */
const LIMITES = [
  { k: 'habitat', n: 'Hábitat', larga: 'Presencia especie × corredor verde', v: (I) => I.pares / Math.max(1, I.pares0) * 100, u: 70, c: 80, abajo: true, un: '%', d: 0, go: true, txt: '% de la ocupación especie × corredor verde del inicio' },
  { k: 'residuos', n: 'Residuos', larga: 'Orgánicos pendientes / almacenamiento', v: (I) => I.residuos * 100, u: 100, c: 85, abajo: false, un: '%', d: 0, go: true, txt: '% de la capacidad de almacenamiento' },
  { k: 'abasto', n: 'Abasto', larga: 'Sector peor abastecido', v: minSector, u: 80, c: 87, abajo: true, un: '%', d: 0, go: true, txt: '% de su demanda de alimentos' },
  { k: 'fauna', n: 'Fauna', larga: 'Especies de fauna presentes', v: (I) => I.fauna / Math.max(1, I.fauna0) * 100, u: 90, c: 94, abajo: true, un: '%', d: 0, go: false, txt: '% de las especies del inicio' },
  { k: 'humedal', n: 'Humedales', larga: 'Área funcional de humedales', v: (I) => I.humedalFuncional, u: 70, c: 80, abajo: true, un: '%', d: 0, go: false, txt: '% del área funcional de hoy' },
  { k: 'ruido', n: 'Ruido', larga: 'Ruido de las calles sobre el inicio', v: (I) => I.ruidoDb - I.ruidoDb0, u: 3, c: 2, abajo: false, un: 'dB', d: 1, go: false, txt: 'dB sobre el ruido del inicio' },
  { k: 'trafico', n: 'Tráfico', larga: 'Vehículos frente a hoy', v: (I) => I.trafico * 100, u: 130, c: 120, abajo: false, un: '%', d: 0, go: false, txt: '% de los vehículos de hoy' }
];
const LIM = Object.fromEntries(LIMITES.map((L) => [L.k, L]));
const malo = (L, v) => (L.abajo ? (L.k === 'abasto' || L.k === 'fauna' ? v < L.u : v <= L.u) : (L.k === 'residuos' ? v > L.u : v >= L.u));
const cerca = (L, v) => (L.abajo ? (L.k === 'abasto' || L.k === 'fauna' ? v < L.c : v <= L.c) : (L.k === 'residuos' ? v > L.c : v >= L.c));
const estadoDe = (L, v) => (v == null ? null : malo(L, v) ? 'critico' : cerca(L, v) ? 'riesgo' : 'sano');

/* ---------- INDICADORES (claves verificadas en R.hist con la sonda del modelo) ---------- */
const IND = {
  eco: { n: 'Índice ecocéntrico', c: 'Índice ecocéntrico', u: '/100', f: (I) => I.eco.indice * 100, sube: true },
  presencia: { n: 'Presencia especie × corredor verde', u: '%', f: (I) => T(I).presencia, sube: true, regla: 'habitat', ay: 'Ocupación de los corredores verdes por todas las especies; inicio = 100 %.' },
  fauna: { n: 'Especies de fauna', u: 'esp.', f: (I) => I.fauna, sube: true, regla: 'fauna' },
  red: { n: 'Interacciones activas', c: 'Interacciones', u: '', f: (I) => T(I).red, sube: true, ay: 'Relaciones de la red biótica que ocurren dentro de cada corredor verde.' },
  conectados: { n: 'Hábitat conectado', u: '%', f: (I) => T(I).conectados, sube: true, ay: 'Zonas verdes de hábitat con vecino a 500 m o corredor.' },
  verde: { n: 'Superficie verde', u: 'ha', f: (I) => T(I).verde, sube: true },
  shannon: { n: 'Diversidad de Shannon H′', c: 'Shannon H′', u: '', d: 2, f: (I) => I.biodiversidad.shannon, sube: true },
  humedal: { n: 'Humedales que funcionan', c: 'Humedales funcionales', u: '%', f: (I) => I.humedalFuncional, sube: true, regla: 'humedal' },
  atrSem: { n: 'Atropellos esta semana', u: 'anim.', f: (I) => T(I).atropellos, sube: false },
  muertes: { n: 'Muertes acumuladas', u: 'anim.', f: (I) => I.muertes.total, sube: false },
  saturacion: { n: 'Saturación del almacenamiento', u: '%', f: (I) => T(I).saturacion, sube: false, regla: 'residuos', ay: 'Orgánicos pendientes / capacidad de almacenamiento.' },
  organicos: { n: 'Orgánicos generados', c: 'Generados', u: 't/día', f: (I) => T(I).organicos, sube: false },
  tratados: { n: 'Tratados en Estaciones Circulares', u: 't/día', d: 1, f: (I) => T(I).tratados, sube: true },
  aprovechamiento: { n: 'Aprovechamiento', c: 'Aprovechamiento', u: '%', d: 1, f: (I) => T(I).aprovechamiento, sube: true, ay: 'Tratados / generados.' },
  compost: { n: 'Compost producido', u: 't/día', d: 1, f: (I) => T(I).compost, sube: true },
  retorno: { n: 'Retorno a huertas', u: 't/día', d: 1, f: (I) => T(I).retorno, sube: true },
  pendientes: { n: 'Orgánicos pendientes', c: 'Pendientes', u: 't', f: (I) => T(I).pendientes, sube: false },
  sinRecoger: { n: 'Basura sin recoger', u: '%', f: (I) => I.sinRecoger * 100, sube: false },
  minSector: { n: 'Sector peor abastecido', u: '%', f: minSector, sube: true, regla: 'abasto' },
  cobertura: { n: 'Alimentos que recibe Kennedy', u: '%', f: (I) => T(I).cobertura, sube: true },
  demanda: { n: 'Demanda de alimentos', u: 't/día', f: (I) => T(I).demanda, sube: false },
  autonomia: { n: 'Autonomía alimentaria', c: 'Autonomía', u: '%', d: 1, f: (I) => T(I).autonomia, sube: true, ay: 'Comida de las huertas locales / demanda.' },
  concentracion: { n: 'Participación de Corabastos', c: 'Corabastos', u: '%', f: (I) => T(I).concentracion, sube: false },
  produccion: { n: 'Producción de las huertas', c: 'Producción local', u: 't/día', d: 1, f: (I) => T(I).produccion, sube: true },
  acopio: { n: 'Excedente acopiado', c: 'Acopio', u: 't/día', d: 1, f: (I) => T(I).acopio, sube: true },
  trafico: { n: 'Tráfico (100 = hoy)', u: '%', f: (I) => I.trafico * 100, sube: false, regla: 'trafico' },
  ruidoDb: { n: 'Ruido promedio de las calles', u: 'dB', d: 1, f: (I) => I.ruidoDb, sube: false, regla: 'ruido' },
  dRuido: { n: 'Ruido sobre el inicio', c: 'Δ ruido', u: 'dB', d: 1, f: (I) => I.ruidoDb - I.ruidoDb0, sube: false, regla: 'ruido' },
  congestion: { n: 'Congestión', u: '%', f: (I) => I.congestion, sube: false, ay: 'Tiempo extra de viaje frente a vía libre.' },
  callesR: { n: 'Calles con más de 65 dB', c: 'Calles > 65 dB', u: '%', f: (I) => I.callesRuidosas, sube: false },
  t10: { n: 'Tiempo para recorrer 10 km', c: 'Tiempo 10 km', u: 'min', d: 1, f: (I) => I.tiempo10km, sube: false },
  suelo: { n: 'Precio del suelo (1 = hoy)', c: 'Precio del suelo', u: '×', d: 2, f: (I) => I.sueloIdx, sube: false },
  hogares: { n: 'Hogares en riesgo de desplazamiento', c: 'Hogares en riesgo', u: 'hog.', f: (I) => I.hogaresRiesgo, sube: false },
  gob: { n: 'Gobernanza', u: '/100', f: (I) => I.eco.gobernanza * 100, sube: true, ay: 'Asambleas, protección del suelo y equidad del reparto.' },
  equidad: { n: 'Equidad del reparto de comida', c: 'Equidad del reparto', u: '/100', f: (I) => I.eco.sub.gobernanza.equidad.valor * 100, sube: true },
  huertas: { n: 'Huertas activas', u: '', f: (I) => I.huertas, sube: true }
};
for (const k in IND) IND[k].k = k;
const CAUSAS = [['colision', 'Choque contra vidrio o fachada'], ['atropello', 'Atropello'], ['ruido', 'Ruido'], ['hambre_habitat', 'Pérdida de hábitat o alimento']];

const CSS = `
:is(#lp-tablero,#lp-datos){container-type:inline-size;--tb-sur:#1e2422;--tb-grid:rgba(255,255,255,.07);--tb-axis:rgba(255,255,255,.22);--tb-hd-h:0px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent}
html body #lp-tablero.tb-montado.tb-montado{padding:0}
#lp-tablero.tb-propio{position:fixed;top:66px;bottom:14px;right:14px;width:clamp(400px,30vw,480px);z-index:40;overflow-y:auto;overscroll-behavior:contain;border-radius:16px;
 background:var(--ui-glass,rgba(22,27,25,.9));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:var(--ui-glass-sh,0 18px 44px rgba(0,0,0,.3));-webkit-backdrop-filter:var(--ui-glass-fx,blur(20px));backdrop-filter:var(--ui-glass-fx,blur(20px))}
@media (max-width:760px){#lp-tablero.tb-propio{left:8px;right:8px;width:auto;top:auto;height:62dvh;bottom:8px}}
:is(#lp-tablero,#lp-datos) .tb{text-shadow:none;font:400 11.5px/1.4 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#f1f3ee);min-width:0;font-variant-numeric:tabular-nums;--tb-pad:14px}
:is(#lp-tablero,#lp-datos) .tb *{box-sizing:border-box}
:is(#lp-tablero,#lp-datos) .tb-hd{position:sticky;top:0;z-index:3;padding:12px var(--tb-pad) 0;background:linear-gradient(180deg,rgba(24,29,27,.97),rgba(22,27,25,.94));border-bottom:1px solid var(--ui-bd,rgba(255,255,255,.1));-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
:is(#lp-tablero,#lp-datos) .tb-l1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
:is(#lp-tablero,#lp-datos) .tb-tit{font:500 15px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-sem{font:400 10.5px/1.2 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-sem b{font-weight:500;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-l2{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0 2px}
:is(#lp-tablero,#lp-datos) .tb-esc{font-size:11.5px;color:var(--ui-tx2,#c9cfc4);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-esc b{font-weight:600;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;padding:2px 9px 2px 7px;border-radius:99px;border:1px solid var(--ui-bd,rgba(255,255,255,.14));background:rgba(255,255,255,.05);white-space:nowrap;color:var(--ui-tx,#f1f3ee);flex:none}
:is(#lp-tablero,#lp-datos) .tb-ico{flex:none}
:is(#lp-tablero,#lp-datos) .tb-verd{font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#c9cfc4);margin:2px 0 6px;min-height:1.4em}
:is(#lp-tablero,#lp-datos) .tb-limh{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer;padding:5px 0 4px;border-top:1px solid var(--tb-grid)}
:is(#lp-tablero,#lp-datos) .tb-limh span{font:500 12px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase}
:is(#lp-tablero,#lp-datos) .tb-limh small{margin-left:auto;font-size:10px;color:var(--ui-tx3,#a5ae9f);display:inline-flex;align-items:center;gap:5px}
:is(#lp-tablero,#lp-datos) .tb-limh::after{content:'';width:5px;height:5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;rotate:45deg;margin:-3px 2px 0 0;opacity:.7}
:is(#lp-tablero,#lp-datos) .tb-limh[aria-expanded=false]::after{rotate:-45deg;margin-top:0}
:is(#lp-tablero,#lp-datos) .tb-limh:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px;border-radius:4px}
:is(#lp-tablero,#lp-datos) .tb-lims{padding:0 0 6px}
:is(#lp-tablero,#lp-datos) .tb-lims[hidden]{display:none}
:is(#lp-tablero,#lp-datos) .tb-lg{font:400 9px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f);margin:5px 0 2px}
:is(#lp-tablero,#lp-datos) .tb-lr{display:grid;grid-template-columns:10px minmax(58px,.9fr) minmax(80px,1.5fr) 50px 26px;align-items:center;gap:0 7px;height:16px;border-radius:4px}
:is(#lp-tablero,#lp-datos) .tb-lr:hover,:is(#lp-tablero,#lp-datos) .tb-lr:focus-visible{background:rgba(255,255,255,.05);outline:none}
:is(#lp-tablero,#lp-datos) .tb-lr .n{font-size:10.5px;color:var(--ui-tx,#f1f3ee);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(#lp-tablero,#lp-datos) .tb-lr .v{font:400 10px/1 var(--ui-mono,'JetBrains Mono',monospace);text-align:right;white-space:nowrap;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-bul{position:relative;height:12px}
:is(#lp-tablero,#lp-datos) .tb-bul i{position:absolute;display:block;top:0;height:100%}
:is(#lp-tablero,#lp-datos) .tb-bul .trk{top:5.5px;height:1px;left:0;right:0;background:var(--tb-axis)}
:is(#lp-tablero,#lp-datos) .tb-bul .zm{top:3px;height:6px;background:rgba(220,60,61,.26);border-radius:1px}
:is(#lp-tablero,#lp-datos) .tb-bul .zc{top:3px;height:6px;background:rgba(251,179,21,.22);border-radius:1px}
:is(#lp-tablero,#lp-datos) .tb-bul .u{width:2px;margin-left:-1px;background:#dc3c3d}
:is(#lp-tablero,#lp-datos) .tb-bul .v0{top:3px;height:6px;width:1px;background:var(--ui-tx3,#a5ae9f)}
:is(#lp-tablero,#lp-datos) .tb-bul .mk{top:2px;width:8px;height:8px;margin-left:-4px;border-radius:50%;box-shadow:0 0 0 2px var(--tb-sur)}
@media (prefers-reduced-motion:no-preference){:is(#lp-tablero,#lp-datos) .tb-bul .mk{transition:left .35s ease}}
:is(#lp-tablero,#lp-datos) .tb-pips{display:flex;gap:2px}
:is(#lp-tablero,#lp-datos) .tb-pips i{width:5px;height:5px;border-radius:1px;border:1px solid rgba(255,255,255,.28)}
:is(#lp-tablero,#lp-datos) .tb-pips i.on{background:#dc3c3d;border-color:#dc3c3d}
:is(#lp-tablero,#lp-datos) .tb-tabs{display:flex;gap:2px;margin:0 calc(-1 * var(--tb-pad));padding:0 var(--tb-pad);overflow-x:auto;scrollbar-width:none;border-top:1px solid var(--tb-grid)}
:is(#lp-tablero,#lp-datos) .tb-tabs::-webkit-scrollbar{display:none}
:is(#lp-tablero,#lp-datos) .tb-tab{all:unset;box-sizing:border-box;position:relative;flex:none;padding:9px 8px 8px;cursor:pointer;font:500 12.5px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.08em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
:is(#lp-tablero,#lp-datos) .tb-tab:hover{color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-tab[aria-selected=true]{color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-tab[aria-selected=true]::after{content:'';position:absolute;left:8px;right:8px;bottom:0;border-bottom:2px solid var(--ui-acc,#d4ecb0)}
:is(#lp-tablero,#lp-datos) .tb-tab:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:-3px;border-radius:5px}
:is(#lp-tablero,#lp-datos) .tb-pan{padding:10px var(--tb-pad) 16px}
@media (prefers-reduced-motion:no-preference){:is(#lp-tablero,#lp-datos) .tb-pan>div{animation:tb-entra .22s ease}@keyframes tb-entra{from{opacity:0;transform:translateY(4px)}}}
:is(#lp-tablero,#lp-datos) .tb-ley{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:10px;color:var(--ui-tx2,#c9cfc4);margin:0 0 10px}
:is(#lp-tablero,#lp-datos) .tb-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-ley b{font-weight:600;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 4px}
:is(#lp-tablero,#lp-datos) .tb-kpi{border:1px solid var(--ui-bd,rgba(255,255,255,.1));border-radius:10px;padding:7px 8px 6px;min-width:0;background:rgba(255,255,255,.025)}
:is(#lp-tablero,#lp-datos) .tb-kpi .l{font-size:10px;line-height:1.25;color:var(--ui-tx2,#c9cfc4);height:2.5em;overflow:hidden}
:is(#lp-tablero,#lp-datos) .tb-kpi .v{font:400 19px/1.1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:-.02em;margin:3px 0 1px;white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-kpi .v small{font:400 10px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f);margin-left:2px;letter-spacing:0}
:is(#lp-tablero,#lp-datos) .tb-kpi .d{font-size:9.5px;line-height:1.35;color:var(--ui-tx3,#a5ae9f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
:is(#lp-tablero,#lp-datos) .tb-kpi .d b{font-weight:500;color:var(--ui-tx2,#c9cfc4)}
:is(#lp-tablero,#lp-datos) .tb-kpi svg{display:block;margin-top:3px;width:100%}
:is(#lp-tablero,#lp-datos) .tb-sec{padding:12px 0 2px;border-top:1px solid var(--tb-grid);margin-top:10px}
:is(#lp-tablero,#lp-datos) .tb-sec h3{margin:0;font:500 13.5px/1.15 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.09em;text-transform:uppercase;color:var(--ui-tx,#f1f3ee);display:flex;justify-content:space-between;align-items:baseline;gap:8px}
:is(#lp-tablero,#lp-datos) .tb-sec h3 small{font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:0;text-transform:none;color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-sub{font-size:10px;line-height:1.4;color:var(--ui-tx3,#a5ae9f);margin:2px 0 6px}
:is(#lp-tablero,#lp-datos) .tb-nota{font-size:10px;line-height:1.45;color:var(--ui-tx2,#c9cfc4);margin:4px 0 0}
:is(#lp-tablero,#lp-datos) .tb-mult{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}
:is(#lp-tablero,#lp-datos) .tb-mult.uno{grid-template-columns:1fr}:is(#lp-tablero,#lp-datos) .tb-mult h4{margin:6px 0 0;font-size:10.5px;font-weight:500;color:var(--ui-tx,#f1f3ee);display:flex;justify-content:space-between;gap:6px;white-space:nowrap;min-width:0}:is(#lp-tablero,#lp-datos) .tb-mult h4 b{font-weight:500;overflow:hidden;text-overflow:ellipsis}
:is(#lp-tablero,#lp-datos) .tb-mult h4 span{font:400 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
:is(#lp-tablero,#lp-datos) svg.tb-svg{display:block;overflow:visible;touch-action:pan-y}
:is(#lp-tablero,#lp-datos) svg.tb-svg text{font:9px var(--ui-sans,'Inter',system-ui,sans-serif);fill:var(--ui-tx3,#a5ae9f);font-variant-numeric:tabular-nums}
:is(#lp-tablero,#lp-datos) svg.tb-svg text.tb-tn{fill:var(--ui-tx2,#c9cfc4);font-size:9.5px}
:is(#lp-tablero,#lp-datos) svg.tb-svg text.tb-tv{fill:var(--ui-tx,#f1f3ee);font:500 9.5px var(--ui-mono,'JetBrains Mono',monospace)}
:is(#lp-tablero,#lp-datos) svg.tb-svg:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:2px;border-radius:3px}
@media (prefers-reduced-motion:no-preference){:is(#lp-tablero,#lp-datos) .tb-fin{transition:cx .3s ease,cy .3s ease}}
:is(#lp-tablero,#lp-datos) [data-tt]{cursor:default}
:is(#lp-tablero,#lp-datos) g[data-tt]:hover>.tb-m,:is(#lp-tablero,#lp-datos) rect[data-tt]:hover{filter:brightness(1.3)}
:is(#lp-tablero,#lp-datos) .tb-meter{display:grid;grid-template-columns:1fr auto;align-items:end;gap:2px 10px;margin:4px 0 2px}
:is(#lp-tablero,#lp-datos) .tb-meter .tb-bul{grid-column:1 / -1;height:14px}
:is(#lp-tablero,#lp-datos) .tb-meter .tb-bul .trk{top:3px;height:8px;border-radius:4px;background:rgba(255,255,255,.07)}
:is(#lp-tablero,#lp-datos) .tb-meter .tb-bul .fil{top:3px;height:8px;left:0;border-radius:0 4px 4px 0}
:is(#lp-tablero,#lp-datos) .tb-meter .tb-bul .u{top:0;height:14px}
:is(#lp-tablero,#lp-datos) .tb-meter .tb-bul .c{top:1px;height:12px;width:1px;background:#fbb315}
:is(#lp-tablero,#lp-datos) .tb-meter .a{font-size:10.5px;color:var(--ui-tx2,#c9cfc4)}
:is(#lp-tablero,#lp-datos) .tb-meter .b{font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx,#f1f3ee);white-space:nowrap}
:is(#lp-tablero,#lp-datos) .tb-meter .e{grid-column:1 / -1;display:flex;justify-content:space-between;font-size:9.5px;color:var(--ui-tx3,#a5ae9f)}
:is(#lp-tablero,#lp-datos) .tb-vacio{font-size:11.5px;line-height:1.5;color:var(--ui-tx2,#c9cfc4);padding:14px var(--tb-pad)}
/* tabla en tiempo real */
:is(#lp-tablero,#lp-datos) .tb-tabla{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px;margin-top:4px}
:is(#lp-tablero,#lp-datos) .tb-tabla caption{text-align:left;font:500 13.5px/1.15 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.09em;text-transform:uppercase;color:var(--ui-tx,#f1f3ee);padding:0 0 6px}
:is(#lp-tablero,#lp-datos) .tb-tabla caption small{display:block;font:400 10px/1.4 var(--ui-sans,'Inter',sans-serif);letter-spacing:0;text-transform:none;color:var(--ui-tx3,#a5ae9f);margin-top:2px}
:is(#lp-tablero,#lp-datos) .tb-tabla th{position:sticky;top:var(--tb-hd-h);z-index:1;background:rgb(26,31,29);font-weight:500;font-size:9.5px;color:var(--ui-tx3,#a5ae9f);text-align:right;padding:0;border-bottom:1px solid var(--tb-axis)}
:is(#lp-tablero,#lp-datos) .tb-tabla th:first-child{text-align:left}
:is(#lp-tablero,#lp-datos) .tb-tabla th button{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:flex-end;gap:3px;width:100%;min-height:26px;padding:4px 3px;cursor:pointer;line-height:1.15}
:is(#lp-tablero,#lp-datos) .tb-tabla th:first-child button{justify-content:flex-start}
:is(#lp-tablero,#lp-datos) .tb-tabla th button:hover{color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-tabla th button:focus-visible{outline:1px solid var(--ui-acc,#d4ecb0);outline-offset:-2px;border-radius:3px}
:is(#lp-tablero,#lp-datos) .tb-tabla th button svg{flex:none;opacity:0}
:is(#lp-tablero,#lp-datos) .tb-tabla th[aria-sort] button svg{opacity:1}
:is(#lp-tablero,#lp-datos) .tb-tabla th[aria-sort=descending] button svg{rotate:180deg}
:is(#lp-tablero,#lp-datos) .tb-tabla td{padding:5px 3px;border-bottom:1px solid var(--tb-grid);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--ui-mono,'JetBrains Mono',monospace);font-size:10px}
:is(#lp-tablero,#lp-datos) .tb-tabla td:first-child{text-align:left;font-family:var(--ui-sans,'Inter',sans-serif);font-size:10.5px;white-space:normal;line-height:1.25;color:var(--ui-tx,#f1f3ee)}
:is(#lp-tablero,#lp-datos) .tb-tabla td small{font-family:var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f);font-size:9px;margin-left:2px}
:is(#lp-tablero,#lp-datos) .tb-tabla td.tb-t svg{display:inline-block;vertical-align:middle}
:is(#lp-tablero,#lp-datos) .tb-tabla td.tb-e{font-family:var(--ui-sans,'Inter',sans-serif);font-size:9.5px;color:var(--ui-tx2,#c9cfc4)}
:is(#lp-tablero,#lp-datos) .tb-tabla td.tb-e span{display:inline-flex;align-items:center;gap:4px}
:is(#lp-tablero,#lp-datos) .tb-tabla tr:hover td{background:rgba(255,255,255,.035)}
:is(#lp-tablero,#lp-datos) .tb-oculto{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@container (max-width:400px){:is(#lp-tablero,#lp-datos) .tb{--tb-pad:12px}:is(#lp-tablero,#lp-datos) .tb-kpi .v{font-size:17px}:is(#lp-tablero,#lp-datos) .tb-tab{padding:9px 6px 8px;font-size:12px;letter-spacing:.06em}:is(#lp-tablero,#lp-datos) .tb-lr{grid-template-columns:10px minmax(52px,.8fr) minmax(70px,1.4fr) 46px 26px}}
@container (max-width:340px){:is(#lp-tablero,#lp-datos) .tb-kpis{grid-template-columns:1fr 1fr}:is(#lp-tablero,#lp-datos) .tb-tabla .tb-cd{display:none}}
#tb-tip{position:fixed;z-index:10050;pointer-events:none;display:none;min-width:140px;max-width:270px;padding:7px 9px;border-radius:9px;background:rgba(18,22,21,.97);border:1px solid rgba(255,255,255,.15);box-shadow:0 10px 26px rgba(0,0,0,.45);color:#f1f3ee;font:11px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);font-variant-numeric:tabular-nums}
#tb-tip .t{color:#a9b2a6;font-size:10px;margin-bottom:3px}
#tb-tip .r{display:flex;align-items:center;gap:6px;white-space:nowrap}
#tb-tip .r b{font:500 11px var(--ui-mono,'JetBrains Mono',monospace)}
#tb-tip .r span{color:#b9c1b5}
`;

export function iniciarPanelDatos({ R, getM, getFIN }) {
  if (!document.getElementById('tb-css')) { const st = document.createElement('style'); st.id = 'tb-css'; st.textContent = CSS; document.head.appendChild(st); }
  let root = null, wrap = null, hd = null, pan = null, espera0 = performance.now(), simHecho = undefined, H0 = null, nHecho = -1, nBase = -1, goHecho = null, ultimo = 0, sucio = true, ancho = 0, pendiente = false;
  let pestaña = 'eco', limAbierto = true, limUsuario = false;
  const TABS = [['eco', 'Ecocentrismo'], ['circ', 'Circularidad'], ['com', 'Comercio'], ['mov', 'Movilidad'], ['soc', 'Sociedad']];
  const hechas = {}; // pestañas construidas: id → {div, upd(c)}
  const CACHE = new Map();

  /* ---------- montaje: en :is(#lp-tablero,#lp-datos) (lo crea limpio.js); si no está, en #lp-datos; si nada aparece en ~6 s, se crea la columna ---------- */
  function montar() {
    let s = document.getElementById('lp-tablero');
    if (!s) { const v = document.getElementById('lp-datos'); if (v && v.getClientRects().length) s = v; }
    if (!s && performance.now() - espera0 > 6000) { s = document.createElement('aside'); s.id = 'lp-tablero'; s.className = 'tb-propio'; s.setAttribute('aria-label', 'Tablero en tiempo real'); document.body.appendChild(s); }
    if (!s) return false;
    if (s !== root || !wrap || !s.contains(wrap)) {
      root = s; if (s.id === 'lp-tablero') s.classList.add('tb-montado'); wrap = document.createElement('div'); wrap.className = 'tb'; root.appendChild(wrap); simHecho = undefined;
      root.addEventListener('pointermove', moverTT); root.addEventListener('pointerleave', () => tip().ocultar());
      if ('ResizeObserver' in window) new ResizeObserver(() => { const w = wrap.clientWidth; if (Math.abs(w - ancho) > 4) { sucio = true; programar(); } if (hd) root.style.setProperty('--tb-hd-h', hd.offsetHeight + 'px'); }).observe(wrap);
      esqueleto();
    }
    return true;
  }
  function moverTT(e) {
    const g = e.target.closest && e.target.closest('[data-tt]');
    if (g && !e.target.closest('svg.tb-lin')) { const [t0, ...rs] = g.getAttribute('data-tt').split('|'); tip().mostrar(`<div class="t">${esc(t0)}</div>${rs.map((x) => `<div class="r">${esc(x)}</div>`).join('')}`, e.clientX, e.clientY); return; }
    if (!e.target.closest || !e.target.closest('svg.tb-lin, svg[tabindex]')) tip().ocultar();
  }

  /* ---------- contexto de un dibujo ---------- */
  const ctxDe = () => {
    const H = R.hist, I = H[H.length - 1], B = R.ecoBase || R.base || null, prop = !!(R.def && R.def.propuesta), n = H.length;
    const W = Math.max(240, Math.floor(pan.clientWidth - 2 * parseFloat(getComputedStyle(wrap).getPropertyValue('--tb-pad') || 14)));
    return { H, I, B, prop, n, I1: H[Math.min(51, n - 1)], Bk: B && B[n - 1] && B[n - 1].sem === I.sem ? B[n - 1] : null, FIN: getFIN(), W, W2: W >= 330 ? Math.floor((W - 12) / 2) : W, otro: prop ? 'Sin' : 'Con' };
  };
  /* serie muestreada cada PASO semanas (+ la última), con caché incremental: la corrida (a) y la otra mitad del par (b) hasta la semana actual */
  function serie(c, k, f) {
    let S = CACHE.get(k); if (!S || S.H !== c.H) { S = { H: c.H, a: [], B: null, b: [] }; CACHE.set(k, S); }
    for (let i = S.a.length * PASO; i < c.n; i += PASO) S.a.push(ev(f, c.H[i]));
    if (S.B !== c.B) { S.B = c.B; S.b = []; }
    if (c.B) for (let i = S.b.length * PASO; i < Math.min(c.B.length, c.n); i += PASO) S.b.push(ev(f, c.B[i]));
    const xs = S.a.map((_, j) => j * PASO + 1), a = S.a.slice(), b = S.a.map((_, j) => (j < S.b.length ? S.b[j] : null));
    const u = c.n - 1; if (u % PASO !== 0) { xs.push(u + 1); a.push(ev(f, c.H[u])); b.push(c.B && c.B[u] ? ev(f, c.B[u]) : null); }
    return { xs, a, b, con: c.prop ? a : b, sin: c.prop ? b : a };
  }
  const limDe = (def, I) => { const L = def.regla && LIM[def.regla]; if (!L) return {}; if (def.k === 'ruidoDb') return { lim: I.ruidoDb0 + 3, cerca: I.ruidoDb0 + 2, abajo: false, limTxt: `límite ${num(I.ruidoDb0 + 3, 1)} dB (+3)` };
    if (def.k === 'fauna') return { lim: 0.9 * I.fauna0, cerca: 0.94 * I.fauna0, abajo: true, limTxt: `límite ${num(0.9 * I.fauna0, 1)}` };
    return { lim: L.u, cerca: L.c, abajo: L.abajo, limTxt: `límite ${num(L.u, L.d)}${L.un === '%' ? ' %' : ' ' + L.un}` }; };

  /* ---------- esqueleto: encabezado fijo + paneles ---------- */
  function esqueleto() {
    wrap.innerHTML = `<header class="tb-hd"><div class="tb-l1"><span class="tb-tit">Tablero en vivo</span><span class="tb-sem"></span></div>`
      + `<div class="tb-l2"><span class="tb-esc"></span><span class="tb-chip"></span></div><p class="tb-verd"></p>`
      + `<button type="button" class="tb-limh" aria-expanded="${limAbierto}" aria-controls="tb-lims"><span>Límites</span><small></small></button>`
      + `<div class="tb-lims" id="tb-lims"${limAbierto ? '' : ' hidden'}>`
      + `<div class="tb-lg">Detienen la simulación tras 4 semanas</div>` + LIMITES.filter((L) => L.go).map(filaLim).join('')
      + `<div class="tb-lg">Límites de referencia</div>` + LIMITES.filter((L) => !L.go).map(filaLim).join('') + `</div>`
      + `<div class="tb-tabs" role="tablist" aria-label="Sistemas de la simulación">${TABS.map(([id, n]) => `<button type="button" role="tab" class="tb-tab" id="tb-t-${id}" data-t="${id}" aria-selected="${id === pestaña}" tabindex="${id === pestaña ? 0 : -1}">${n}</button>`).join('')}</div></header>`
      + TABS.map(([id]) => `<div class="tb-pan" role="tabpanel" id="tb-p-${id}" aria-labelledby="tb-t-${id}"${id === pestaña ? '' : ' hidden'}></div>`).join('')
      + `<p class="tb-vacio" hidden></p>`;
    hd = wrap.querySelector('.tb-hd'); pan = wrap.querySelector(`#tb-p-${pestaña}`);
    const bt = wrap.querySelector('.tb-limh'); bt.addEventListener('click', () => { limUsuario = true; ponerLim(!limAbierto); });
    const tl = wrap.querySelector('.tb-tabs');
    tl.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) elegir(b.dataset.t); });
    tl.addEventListener('keydown', (e) => { const ids = TABS.map((t) => t[0]), i = ids.indexOf(pestaña); const k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key]; if (k == null) return; e.preventDefault();
      const j = Math.max(0, Math.min(ids.length - 1, k === -99 ? 0 : k === 99 ? ids.length - 1 : i + k)); elegir(ids[j]); wrap.querySelector(`#tb-t-${ids[j]}`).focus(); });
    for (const k in hechas) delete hechas[k];
    root.style.setProperty('--tb-hd-h', hd.offsetHeight + 'px');
  }
  /* franja de límites plegable; en un tablero bajo (cajón del celular) empieza plegada para no tapar las gráficas */
  function ponerLim(on) { limAbierto = on; const bt = wrap.querySelector('.tb-limh'); bt.setAttribute('aria-expanded', on); wrap.querySelector('.tb-lims').hidden = !on; root.style.setProperty('--tb-hd-h', hd.offsetHeight + 'px'); }
  function filaLim(L) {
    return `<div class="tb-lr" data-l="${L.k}" tabindex="0" role="group"><span class="i"></span><span class="n">${esc(L.n)}</span>`
      + `<span class="tb-bul"><i class="trk"></i><i class="zm"></i><i class="zc"></i><i class="v0"></i><i class="u"></i><i class="mk"></i></span><span class="v"></span><span class="tb-pips" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`;
  }
  function elegir(id) {
    if (id === pestaña) return; pestaña = id;
    wrap.querySelectorAll('[role=tab]').forEach((b) => { const on = b.dataset.t === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    wrap.querySelectorAll('[role=tabpanel]').forEach((p) => { p.hidden = p.id !== 'tb-p-' + id; });
    pan = wrap.querySelector(`#tb-p-${id}`); tip().ocultar(); cola = null;
    const top = hd.offsetTop; if (root.scrollTop > top) root.scrollTop = top; // al cambiar de pestaña se vuelve al comienzo del panel
    sucio = true; ultimo = 0; programar();
  }

  /* ---------- encabezado: semana, escenario, veredicto y franja de límites ---------- */
  function rachaDe(L, c) { // semanas seguidas fuera del límite (0–4); abasto: el sector con la racha más larga, como el game over del modelo
    const H = c.H; let r = 0;
    if (L.k === 'abasto') { const s = T(c.I).sectores || []; for (let i = 0; i < s.length; i++) { let k = 0; while (k < 4 && k < H.length) { const x = (T(H[H.length - 1 - k]).sectores || [])[i]; if (x && x.valor < 80) k++; else break; } r = Math.max(r, k); } return r; }
    while (r < 4 && r < H.length) { const v = ev(L.v, H[H.length - 1 - r]); if (v != null && malo(L, v)) r++; else break; }
    return r;
  }
  function pintarEncabezado(c) {
    const { I, H, prop } = c, d = R.def || {};
    wrap.querySelector('.tb-sem').innerHTML = `Semana <b>${I.sem}</b> · año <b>${año(I.sem)}</b> de 15`;
    wrap.querySelector('.tb-esc').innerHTML = d.par ? `<b>${esc((d.parN || '').replace(/^\d+\s*/, ''))}</b> · ${prop ? 'con propuesta' : 'sin propuesta'}` : `<b>${esc(d.n || 'Kennedy')}</b> · sin prueba de estrés`;
    const filas = LIMITES.map((L) => { const v = ev(L.v, I); return { L, v, e: estadoDe(L, v), v0: ev(L.v, H[0]), r: rachaDe(L, c) }; });
    const crit = filas.filter((f) => f.e === 'critico'), ries = filas.filter((f) => f.e === 'riesgo'), g = T(I).gameOver || R.go;
    const e = g || crit.length ? 'critico' : ries.length ? 'riesgo' : 'sano';
    wrap.querySelector('.tb-chip').innerHTML = icono(e) + (g ? 'Game over' : ESTADO[e].n);
    let txt = e === 'sano' ? 'Ningún indicador está cerca de su límite.' : e === 'riesgo' ? `Cerca del límite: ${ries.map((f) => f.L.larga.toLowerCase()).join(', ')}.` : `Límite superado: ${crit.map((f) => f.L.larga.toLowerCase()).join(', ')}.`;
    const racha = filas.filter((f) => f.L.go && f.r > 0 && f.r < 4).sort((a, b) => b.r - a.r)[0];
    if (racha && !g) txt += ` ${racha.L.larga}: ${racha.r} de 4 semanas seguidas fuera; game over si sigue ${4 - racha.r === 1 ? 'una semana más' : (4 - racha.r) + ' semanas más'}.`;
    if (g && g.motivo) txt = `Game over en la semana ${g.sem}: ${g.motivo}.`;
    wrap.querySelector('.tb-verd').textContent = txt;
    const fuera = filas.filter((f) => f.e && f.e !== 'sano').length;
    wrap.querySelector('.tb-limh small').innerHTML = fuera ? `${icono(crit.length ? 'critico' : 'riesgo')}${fuera} de 7 fuera de rango` : `${icono('sano')}7 en rango`;
    for (const f of filas) {
      const row = wrap.querySelector(`.tb-lr[data-l="${f.L.k}"]`); if (!row) continue; const L = f.L;
      if (f.v == null) { row.querySelector('.v').textContent = '—'; continue; }
      const xs = [f.v, f.v0, L.u, L.c].filter((x) => x != null); let lo = Math.min(...xs), hi = Math.max(...xs); const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1; lo -= pad; hi += pad;
      if (L.un === '%') lo = Math.max(0, lo);
      const P = (x) => Math.max(0, Math.min(100, (x - lo) / (hi - lo) * 100));
      const b = row.querySelector('.tb-bul'), zm = b.querySelector('.zm'), zc = b.querySelector('.zc');
      if (L.abajo) { zm.style.left = '0%'; zm.style.width = P(L.u) + '%'; zc.style.left = P(L.u) + '%'; zc.style.width = (P(L.c) - P(L.u)) + '%'; }
      else { zm.style.left = P(L.u) + '%'; zm.style.width = (100 - P(L.u)) + '%'; zc.style.left = P(L.c) + '%'; zc.style.width = (P(L.u) - P(L.c)) + '%'; }
      b.querySelector('.u').style.left = P(L.u) + '%'; const v0 = b.querySelector('.v0'); v0.style.left = P(f.v0 ?? f.v) + '%';
      const mk = b.querySelector('.mk'); mk.style.left = P(f.v) + '%'; mk.style.background = ESTADO[f.e].c;
      row.querySelector('.i').innerHTML = icono(f.e);
      row.querySelector('.v').textContent = num(f.v, L.d) + (L.un === '%' ? ' %' : ' ' + L.un);
      row.querySelectorAll('.tb-pips i').forEach((p, k) => p.classList.toggle('on', k < f.r));
      const marg = (f.v - L.u) * (L.abajo ? 1 : -1), tt = `${L.larga}|Ahora: ${num(f.v, L.d)} ${L.un}|Inicio: ${num(f.v0, L.d)} ${L.un}|Límite: ${num(L.u, L.d)} ${L.un} (${L.txt})|Cerca desde: ${num(L.c, L.d)} ${L.un}|Margen: ${marg >= 0 ? '' : '−'}${num(Math.abs(marg), L.d)} ${L.un === '%' ? 'pts' : L.un}|${f.r} de 4 semanas seguidas fuera${L.go && R.def && R.def.par ? ' · detiene la simulación' : ' · de referencia'}`;
      row.setAttribute('data-tt', tt); row.setAttribute('aria-label', `${L.larga}: ${num(f.v, L.d)} ${L.un}, ${ESTADO[f.e].n.toLowerCase()}, límite ${num(L.u, L.d)} ${L.un}, ${f.r} de 4 semanas seguidas fuera`);
    }
  }

  /* ---------- piezas de las pestañas ---------- */
  const leyenda = (c) => `<div class="tb-ley" aria-label="Leyenda"><span>${clave(COL.con)}Con propuesta${c.prop ? ' <b>(esta corrida)</b>' : ''}</span><span>${clave(COL.sin, 'pun')}Sin propuesta${c.prop ? '' : ' <b>(esta corrida)</b>'}</span><span>${clave(COL.lim, 'pun')}Límite</span></div>`;
  function seccion(div, titulo, sub) { const s = document.createElement('section'); s.className = 'tb-sec'; s.innerHTML = `<h3><span>${esc(titulo)}</span><small></small></h3>${sub ? `<p class="tb-sub">${esc(sub)}</p>` : ''}<div class="tb-cu"></div>`; div.appendChild(s); return { sec: s, cu: s.querySelector('.tb-cu'), der: s.querySelector('h3 small') }; }
  const fmtV = (def, v) => num(v, def.d || 0);
  const uni = (def) => (def.u === '%' ? ' %' : def.u ? ' ' + def.u : '');
  const sig = (x, d) => { const r = +Math.abs(x).toFixed(d); return (r === 0 ? '±' : x > 0 ? '+' : '−') + num(Math.abs(x), d); };
  const dif = (def, x) => { const pts = def.u === '%' || def.u === '/100'; return sig(x, def.d || 0) + (pts ? ' pts' : def.u && def.u !== '×' ? ' ' + def.u : ''); };

  /* indicadores clave: valor, cambio frente al año 1, la otra mitad del par y una chispa */
  function kpis(div, keys) {
    const box = document.createElement('div'); box.className = 'tb-kpis'; div.appendChild(box);
    const T2 = keys.map((k) => { const e = document.createElement('div'); e.className = 'tb-kpi'; e.innerHTML = `<div class="l">${esc(IND[k].n)}</div><div class="v"></div><div class="d d1"></div><div class="d d2"></div>`; box.appendChild(e); return { k, e, ch: new Chispa(e, 100, 18) }; });
    return (c) => { for (const t of T2) { const def = IND[t.k], v = ev(def.f, c.I), v1 = ev(def.f, c.I1), vb = c.Bk ? ev(def.f, c.Bk) : null, S = serie(c, t.k, def.f);
      t.e.querySelector('.v').innerHTML = `${fmtV(def, v)}<small>${esc(def.u || '')}</small>`;
      t.e.querySelector('.d1').innerHTML = c.n < 52 ? 'Año 1 en curso' : v != null && v1 != null ? `vs año 1 <b>${sig(v - v1, def.d || 0)}${def.u === '%' || def.u === '/100' ? ' pts' : ''}</b>` : '';
      t.e.querySelector('.d2').innerHTML = vb != null ? `${c.otro} prop. <b>${fmtV(def, vb)}</b>` : '';
      t.ch.update(S.a, c.prop ? COL.con : COL.sin, c.FIN, S.xs); } };
  }
  /* línea de 15 años de un indicador */
  function lineaDe(cu, k, op = {}) {
    const def = IND[k], L = new Linea(cu, { n: def.n, u: def.u === '%' ? '%' : def.u, d: def.d || 0, alto: op.alto || 92, cero: op.cero, pl: op.pl });
    return (c, W) => { const S = serie(c, k, def.f); L.update({ W: W || c.W, FIN: c.FIN, xs: S.xs, con: S.con, sin: S.sin, run: c.prop ? 'con' : 'sin', ...(op.sinLim ? {} : limDe(def, c.I)) }); };
  }
  /* pequeños múltiplos: 2 columnas de líneas con su valor actual */
  function multiples(div, keys, titulo, sub) {
    const { cu } = seccion(div, titulo, sub), g = document.createElement('div'); g.className = 'tb-mult'; cu.appendChild(g);
    const P = keys.map((k) => { const c0 = document.createElement('div'); c0.innerHTML = `<h4 title="${esc(IND[k].n)}"><b>${esc(IND[k].c || IND[k].n)}</b><span></span></h4>`; g.appendChild(c0); return { k, h: c0.querySelector('h4 span'), up: lineaDe(c0, k, { alto: 78, pl: 30 }) }; });
    return (c) => { g.classList.toggle('uno', c.W2 === c.W); for (const p of P) { const def = IND[p.k], v = ev(def.f, c.I); p.h.textContent = fmtV(def, v) + uni(def); p.up(c, c.W2); } };
  }
  function graficaLinea(div, k, titulo, sub, op) {
    const { cu, der } = seccion(div, titulo || IND[k].n, sub || IND[k].ay), up = lineaDe(cu, k, op);
    return (c) => { const def = IND[k], v = ev(def.f, c.I); der.textContent = fmtV(def, v) + uni(def); up(c); };
  }

  /* tabla en tiempo real: indicador | ahora | Δ año 1 | otra mitad | tendencia | estado; ordenable por columna */
  function tabla(div, keys) {
    const id = 'tb-cap-' + Math.random().toString(36).slice(2, 7), flecha = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 1 7 6H1z" fill="currentColor"/></svg>';
    const s = document.createElement('section'); s.className = 'tb-sec';
    s.innerHTML = `<table class="tb-tabla"><caption id="${id}">Tabla en tiempo real<small>Valores de esta semana. Ordena con los encabezados.</small></caption><colgroup><col style="width:30%"><col style="width:15%"><col class="tb-cd" style="width:12%"><col style="width:12%"><col style="width:14%"><col style="width:17%"></colgroup>`
      + `<thead><tr>${[['Indicador', 't'], ['Ahora', 'n'], ['Δ año 1', 'n', 'tb-cd'], ['<span class="tb-otro">Otra</span>', 'n'], ['Tendencia', ''], ['Estado', 't']].map(([n, t, cl], i) => `<th scope="col"${cl ? ` class="${cl}"` : ''} data-type="${t}">${t ? `<button type="button" data-i="${i}">${n}${flecha}</button>` : `<span style="display:block;padding:4px 3px">${n}</span>`}</th>`).join('')}</tr></thead><tbody></tbody></table><p class="tb-oculto" role="status"></p>`;
    div.appendChild(s);
    const tb = s.querySelector('tbody'), est = s.querySelector('[role=status]'), col = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
    const filas = keys.map((k) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${esc(IND[k].n)}</td><td></td><td class="tb-cd"></td><td></td><td class="tb-t"></td><td class="tb-e"></td>`; tb.appendChild(tr); return { k, tr, ch: new Chispa(tr.children[4], 46, 14) }; });
    let orden = null;
    const ordenar = () => { if (!orden) return; const { i, dir, tipo } = orden, f = dir === 'ascending' ? 1 : -1, val = (tr) => tr.cells[i].dataset.value ?? tr.cells[i].textContent.trim();
      const rows = [...tb.rows].sort((a, b) => f * (tipo === 'n' ? (+val(a) || 0) - (+val(b) || 0) : col.compare(val(a), val(b))));
      if (rows.some((r, k) => tb.rows[k] !== r)) for (const r of rows) tb.appendChild(r); };
    s.querySelector('thead').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const th = b.closest('th'), i = +b.dataset.i, dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      s.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort')); th.setAttribute('aria-sort', dir); orden = { i, dir, tipo: th.dataset.type }; ordenar();
      est.textContent = `Ordenada por ${b.textContent.trim()}, ${dir === 'ascending' ? 'ascendente' : 'descendente'}`; });
    return (c) => {
      s.querySelector('.tb-otro').textContent = c.otro + ' prop.';
      for (const F of filas) { const def = IND[F.k], v = ev(def.f, c.I), v1 = ev(def.f, c.I1), vb = c.Bk ? ev(def.f, c.Bk) : null, td = F.tr.cells, S = serie(c, F.k, def.f);
        td[1].dataset.value = v ?? ''; td[1].innerHTML = `${fmtV(def, v)}<small>${esc(def.u || '')}</small>`;
        const dx = v != null && v1 != null && c.n >= 52 ? v - v1 : null; td[2].dataset.value = dx ?? ''; td[2].textContent = dx == null ? '—' : sig(dx, def.d || 0);
        td[3].dataset.value = vb ?? ''; td[3].textContent = vb == null ? '—' : fmtV(def, vb);
        F.ch.update(S.a, c.prop ? COL.con : COL.sin, c.FIN, S.xs);
        let e = '', ev2 = '';
        if (def.regla) { const L = LIM[def.regla], st = estadoDe(L, ev(L.v, c.I)); if (st) { e = `<span>${icono(st, 9)}${ESTADO[st].n}</span>`; ev2 = st === 'critico' ? '0' : st === 'riesgo' ? '1' : '2'; } }
        if (!e) { if (dx == null || Math.abs(dx) <= Math.max(Math.abs(v1 || 0) * 0.01, Math.pow(10, -(def.d || 0)) / 2)) { e = '<span>— estable</span>'; ev2 = '4'; }
          else { const mejor = def.sube ? dx > 0 : dx < 0; e = `<span><svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="${dx > 0 ? 'M4 1 7 6H1z' : 'M4 7 7 2H1z'}" fill="currentColor"/></svg>${mejor ? 'mejora' : 'empeora'}</span>`; ev2 = mejor ? '5' : '3'; } }
        td[5].dataset.value = ev2; if (td[5].innerHTML !== e) td[5].innerHTML = e; }
      ordenar();
    };
  }
  /* medidor (barra contra su límite, con la marca «cerca») */
  function medidor(cu) {
    const m = document.createElement('div'); m.className = 'tb-meter'; m.innerHTML = `<span class="a"></span><span class="b"></span><span class="tb-bul"><i class="trk" style="left:0;right:0"></i><i class="fil"></i><i class="c"></i><i class="u"></i></span><span class="e"><span class="e0"></span><span class="e1"></span></span>`; cu.appendChild(m);
    return ({ v, max, u, cer, a, b, e0, e1, estado }) => { const P = (x) => Math.max(0, Math.min(100, x / max * 100)) + '%';
      m.querySelector('.a').innerHTML = a; m.querySelector('.b').textContent = b; const f = m.querySelector('.fil'); f.style.width = P(v); f.style.background = ESTADO[estado].c;
      m.querySelector('.u').style.left = P(u); const c = m.querySelector('.c'); c.style.display = cer == null ? 'none' : ''; if (cer != null) c.style.left = P(cer);
      m.querySelector('.e0').textContent = e0 || ''; m.querySelector('.e1').textContent = e1 || ''; };
  }
  /* bloque SVG que se rehace solo cuando cambia su contenido */
  function bloque(cu) { const d = document.createElement('div'); cu.appendChild(d); let h0 = ''; return (html) => { if (html !== h0) { h0 = html; d.innerHTML = html; } }; }
  const finAño = (c, y) => c.H[Math.min(c.n - 1, (y + 1) * 52 - 1)];

  /* =================== ECOCENTRISMO =================== */
  function tabEco(div, c0) {
    div.insertAdjacentHTML('beforeend', leyenda(c0));
    const U = [kpis(div, ['presencia', 'fauna', 'conectados'])];
    U.push(graficaLinea(div, 'presencia', 'Presencia de fauna en el territorio', 'Ocupación especie × corredor verde (inicio = 100 %). Bajo 70 % durante 4 semanas: game over.'));
    // mapa de calor de especies × años
    { const { cu, der } = seccion(div, 'Especies por año', 'Corredores verdes ocupados al cierre de cada año (el año en curso se llena semana a semana). Color relativo al máximo de cada especie; vacío = ausente.');
      const M = new MapaCalor(cu, { n: 'Corredores verdes ocupados por especie y año' });
      cu.insertAdjacentHTML('beforeend', `<div class="tb-ley" style="margin:6px 0 0"><span>menos</span>${['#1757ac', '#2370cd', '#338ced', '#6aabf1', '#9dc8f7', '#cce3fd'].map((x) => `<svg width="14" height="8" aria-hidden="true"><rect width="14" height="8" rx="1.5" fill="${x}"/></svg>`).join('')}<span>más</span><span><svg width="10" height="8" aria-hidden="true"><rect x=".5" y=".5" width="9" height="7" rx="1.5" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.2)"/></svg>ausente</span><span>${clave('var(--ui-tx,#f1f3ee)', 'tick')}año en curso</span></div>`);
      U.push((c) => { const esp = T(c.I).especies || []; if (!esp.length) return; const nA = Math.min(15, Math.ceil(c.n / 52)), actual = nA - 1;
        const filasV = esp.map((e, r) => { const a = []; for (let y = 0; y < 15; y++) { if (y >= nA) { a.push(null); continue; } const J = y === actual ? c.I : finAño(c, y), x = (T(J).especies || [])[r]; a.push(x ? x.valor : null); } return a; });
        const celdas = filasV.map((a, r) => { const mx = Math.max(1, ...a.filter((v) => v != null)); return a.map((v, y) => { if (v == null) return null; const Bj = c.B && c.B[Math.min(c.n - 1, (y + 1) * 52 - 1)], vb = Bj ? ((T(Bj).especies || [])[r] || {}).valor : null;
          return { v, max: mx, tt: `${esp[r].n}|Año ${y + 1}${y === actual ? ' (en curso)' : ''}: ${num(v)} corredores verdes|${c.otro} propuesta: ${num(vb)}` }; }); });
        M.update({ W: c.W, nombres: esp.map((e) => e.n), celdas, actual, valores: esp.map((e) => num(e.valor)) });
        der.textContent = `${esp.filter((e) => e.valor > 0).length} de ${esp.length} presentes`; }); }
    // muertes por causa y año (columnas apiladas)
    { const { cu, der } = seccion(div, 'Muertes de fauna por causa', 'Muertes en cada año, apiladas por causa.'), B1 = bloque(cu), B2 = bloque(cu);
      U.push((c) => { const nA = Math.min(15, Math.ceil(c.n / 52)), años = []; let prev = {};
        for (let y = 0; y < 15; y++) { if (y >= nA) { años.push(null); continue; } const J = y === nA - 1 ? c.I : finAño(c, y), pc = J.muertes && J.muertes.porCausa; if (!pc) { años.push(null); continue; }
          años.push([CAUSAS.map(([k]) => Math.max(0, (pc[k] || 0) - (prev[k] || 0)))]); prev = { ...pc }; }
        const tot = (c.I.muertes && c.I.muertes.porCausa) || {}, tb = c.Bk && c.Bk.muertes ? c.Bk.muertes.total : null;
        der.textContent = num(c.I.muertes && c.I.muertes.total) + ' en total';
        B1(`<div class="tb-ley">${CAUSAS.map(([k, n], i) => `<span>${clave(CAT[i], 'barra')}${esc(n)} <b>${num(tot[k])}</b></span>`).join('')}</div>`);
        B2(columnasAño(años, [CAUSAS.map((_, i) => ({ c: CAT[i] }))], c.W, { aria: 'Muertes de fauna por causa en cada año', tt: (y, r) => [`Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}`, ...CAUSAS.map(([, n], i) => `${n}: ${num(r[0][i])}`), `Total: ${num(r[0].reduce((p, q) => p + q, 0))}`].join('|') })
          + (tb != null ? `<p class="tb-nota">${c.otro} propuesta, misma semana: ${num(tb)} muertes acumuladas.</p>` : '')); }); }
    // atropellos por año con vs sin (barras pareadas)
    { const { cu, der } = seccion(div, 'Atropellos por año', 'Con y sin propuesta, misma semilla.'), B1 = bloque(cu);
      U.push((c) => { const A = (c.I.atropellos && c.I.atropellos.porAño) || [], Ab = c.Bk && c.Bk.atropellos ? c.Bk.atropellos.porAño || [] : [], nA = Math.min(15, Math.ceil(c.n / 52));
        const conA = c.prop ? A : Ab, sinA = c.prop ? Ab : A, años = []; for (let y = 0; y < 15; y++) años.push(y < nA ? [[conA[y] || 0], [sinA[y] || 0]] : null);
        der.textContent = num(c.I.atropellos && c.I.atropellos.total) + ' en total';
        B1(`<div class="tb-ley"><span>${clave(COL.con, 'barra')}Con propuesta</span><span>${clave(COL.sin, 'hueca')}Sin propuesta</span></div>`
          + columnasAño(años, [[{ c: COL.con }], [{ c: COL.sin, op: 0.35 }]], c.W, { aria: 'Atropellos de fauna por año, con y sin propuesta', tt: (y, r) => `Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}|Con propuesta: ${num(r[0][0])}|Sin propuesta: ${num(r[1][0])}` })); }); }
    U.push(multiples(div, ['red', 'eco', 'humedal', 'shannon'], 'Red, índice y humedales', 'Con propuesta continua, sin propuesta punteada.'));
    U.push(tabla(div, ['presencia', 'fauna', 'red', 'conectados', 'verde', 'shannon', 'humedal', 'atrSem', 'muertes', 'eco']));
    return U;
  }

  /* =================== CIRCULARIDAD =================== */
  function tabCirc(div, c0) {
    div.insertAdjacentHTML('beforeend', leyenda(c0));
    const U = [kpis(div, ['saturacion', 'aprovechamiento', 'compost'])];
    { const { cu } = seccion(div, 'Almacenamiento de orgánicos', 'Pendientes de tratamiento frente a la capacidad. Sobre 100 % durante 4 semanas: game over.'), med = medidor(cu);
      U.push((c) => { const t = T(c.I), v = fin(t.saturacion), L = LIM.residuos; if (v == null) return;
        med({ v, max: Math.max(120, v * 1.05), u: 100, cer: 85, a: `${num(t.pendientes)} t de ${num(t.capacidadAlmacen)} t`, b: num(v) + ' %', e0: '0 %', e1: `cerca 85 % · límite 100 %`, estado: estadoDe(L, v) }); }); }
    { const { cu, der } = seccion(div, '¿A dónde van los orgánicos?', 'Flujo de esta semana en t/día, anchos a escala.'), B1 = bloque(cu), B2 = bloque(cu);
      U.push((c) => { const t = T(c.I), G = fin(t.organicos) || 0, Tt = fin(t.tratados) || 0, Rl = fin(relleno(c.I)), Rr = Math.max(0, G - (Rl || 0) - Tt), W = c.W;
        der.textContent = num(G) + ' t/día';
        const dest = [{ id: 'rel', n: 'Relleno Doña Juana', v: Rl || 0, c: '#8b938a', tt: `Relleno Doña Juana|${num(Rl, 1)} t/día|${num(G ? (Rl || 0) / G * 100 : 0, 1)} % de lo generado` },
          { id: 'est', n: 'Estaciones Circulares', v: Tt, c: COL.con, tt: `Estaciones Circulares|${num(Tt, 1)} t/día|${num(t.aprovechamiento, 1)} % de lo generado` },
          { id: 'res', n: 'Sin destino esta semana', v: Rr, c: '#fbb315', tt: `Diferencia sin destino esta semana|${num(Rr, 1)} t/día|se acumula como pendiente o queda sin recoger` }].filter((x) => x.v > 0.005);
        B1(sankey([[{ id: 'gen', n: 'Generados', v: G, txt: num(G) + ' t/día', tt: `Orgánicos generados|${num(G, 1)} t/día|Recolectados: ${num(t.recolectados, 1)} t/día` }], dest],
          dest.map((x) => ({ de: 'gen', a: x.id, v: x.v, c: x.c, tt: x.tt })), W, { alto: 128, lw: 64, rw: 132, gapN: 26, aria: 'Destino de los orgánicos generados' }));
        if (Tt <= 0.005) { B2(`<p class="tb-nota">Esta corrida no tiene Estaciones Circulares: lo recogido va al relleno.</p>`); return; }
        const C = fin(t.compost) || 0, Rt = fin(t.retorno) || 0;
        B2(`<p class="tb-sub" style="margin-top:8px">Ruta circular (escala propia, ampliada): lo que entra a las estaciones, el compost que sale y lo que vuelve a las huertas.</p>`
          + sankey([[{ id: 'e', n: 'Estaciones', v: Tt, c: COL.con, txt: num(Tt, 1) + ' t/día', tt: `Recibido en Estaciones Circulares|${num(Tt, 1)} t/día|Capacidad: ${num(t.capTratamiento, 1)} t/día` }],
            [{ id: 'c', n: 'Compost', v: C, c: '#00a888', txt: num(C, 1) + ' t/día', tt: `Compost producido|${num(C, 1)} t/día` }], [{ id: 'r', n: 'Huertas', v: Rt, c: '#9887ef', txt: num(Rt, 1) + ' t/día', tt: `Retorno a huertas|${num(Rt, 1)} t/día` }]],
          [{ de: 'e', a: 'c', v: C, c: '#00a888', tt: `Estaciones → compost|${num(C, 1)} t/día|${num(Tt - C, 1)} t/día no salen como compost esta semana` }, { de: 'c', a: 'r', v: Rt, c: '#9887ef', tt: `Compost → huertas|${num(Rt, 1)} t/día` }], W, { alto: 70, lw: 0, rw: 70, gapN: 8, aria: 'Ruta circular del compost' })); }); }
    U.push(graficaLinea(div, 'saturacion', 'Saturación del almacenamiento', 'Pendientes / capacidad. Zona ámbar: cerca del límite (85 %).', { cero: true }));
    U.push(multiples(div, ['aprovechamiento', 'compost', 'organicos', 'pendientes'], 'Tratamiento y compost'));
    { const { cu, der } = seccion(div, 'Estaciones Circulares', 'Almacenamiento usado por estación (las 8 más llenas).'), B1 = bloque(cu);
      U.push((c) => { const e = (T(c.I).estaciones || []).filter((x) => isFinite(x.valor)); if (!e.length) { der.textContent = ''; B1('<p class="tb-nota">Sin Estaciones Circulares en esta corrida.</p>'); return; }
        const f = e.map((x) => ({ n: x.n.replace(/^Estación Circular · /, ''), v: x.valor, txt: num(x.valor) + ' %', col: x.valor > 100 ? ESTADO.critico.c : x.valor > 85 ? ESTADO.riesgo.c : COL.con,
          tt: `${x.n}|Almacenamiento: ${num(x.valor)} %|Acumulado: ${num(x.acumulado_t, 1)} t|Trata: ${num(x.tratado_t_dia, 2)} t/día de ${num(x.cap_t_dia, 2)}` })).sort((a, b) => b.v - a.v);
        der.textContent = `${e.filter((x) => x.valor > 100).length} de ${e.length} sobre 100 %`;
        B1(barrasH(f.slice(0, 8), c.W, { max: Math.max(110, ...f.map((x) => x.v)), lim: 100, limU: ' %', aria: 'Almacenamiento por Estación Circular', vw: 40, lw: 150 })); }); }
    U.push(tabla(div, ['saturacion', 'pendientes', 'organicos', 'tratados', 'aprovechamiento', 'compost', 'retorno', 'sinRecoger']));
    return U;
  }

  /* =================== 01 ABASTECIMIENTO: llegadas a Corabastos por hora y por tipo de vehículo (simulaciones12.js AB01) ===================
     Solo se ven cuando la corrida trae I.abasto.ab01 (par 01). Con propuesta continua (relleno); la otra mitad del par, hueca y punteada. */
  const corrida = (c, I) => (I && I.abasto && I.abasto.ab01) || null;
  function abasto01(div) {
    const U = [];
    { const { sec, cu, der } = seccion(div, 'Llegadas a Corabastos por hora', 'Toneladas que entran en cada hora del día esta semana. Franjas de ingreso de Corabastos (12–20 h hortalizas, 20–24 h papa, 4–6 h frutas y granos) × grupos DANE-SIPSA 2025: confianza baja. Raya roja: lo máximo que la central recibe en la franja (tope). Línea blanca: la hora del reloj.');
      const B1 = bloque(cu), B2 = bloque(cu); let geo = null;
      U.push((c) => { const X = corrida(c, c.I); sec.hidden = !X; if (!X) return; const Xb = corrida(c, c.Bk), M = getM() || {}, FR = (M.AB01 && M.AB01.FRANJAS) || [];
        const W = c.W, alto = 118, pl = 34, pr = 4, pt = 8, pb = 15, iw = W - pl - pr, ih = alto - pt - pb, sw = iw / 24;
        const por = (Y, h) => (Y.franjas || []).find((F) => h >= F.h0 && h < F.h1) || null, mx = Math.max(...X.franjas.map((F) => Math.max(F.t_h, F.tope_h)), ...(Xb ? Xb.franjas.map((F) => F.t_h) : [0]));
        const m = marcas(0, mx, 3), Y = (v) => pt + ih - v / (m.b || 1) * ih, col = c.prop ? COL.con : COL.sin, colO = c.prop ? COL.sin : COL.con; geo = { pl, sw, pt, ih };
        let s = `<svg class="tb-svg" width="${W}" height="${alto}" viewBox="0 0 ${W} ${alto}" role="img" aria-label="Toneladas por hora que llegan a Corabastos: ${X.franjas.map((F) => `franja ${F.n} ${num(F.t_h)} t/h`).join(', ')}">`;
        for (const t of m.t) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === 0 ? 'var(--tb-axis)' : 'var(--tb-grid)'}"/><text x="${pl - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${fmtEje(t, m.paso)}</text>`;
        for (let h = 0; h < 24; h++) { const F = por(X, h), Fb = Xb ? por(Xb, h) : null, x = pl + h * sw, v = F ? F.t_h : 0, vb = Fb ? Fb.t_h : null, q = FR.find((f) => f.n === (F && F.n));
          s += `<g data-tt="${esc(`${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00|${F ? `Llegan ${num(v)} t/h · ${num(F.veh_h)} vehículos/h|Franja ${F.n}${q ? ': ' + q.que : ''}|Máximo en la franja: ${num(F.tope_h)} t/h` : 'Sin ingreso de carga en esta hora'}${vb != null ? `|${c.otro} propuesta: ${num(vb)} t/h` : ''}`)}"><rect x="${x.toFixed(1)}" y="0" width="${sw.toFixed(1)}" height="${alto}" fill="transparent"/>`;
          if (v > 0) s += `<path class="tb-m" d="${barraV(x + 1.5, Y(v), Math.max(1, sw - 3), pt + ih - Y(v), 2)}" fill="${col}"/>`;
          if (vb) s += `<rect x="${(x + 2).toFixed(1)}" y="${Y(vb).toFixed(1)}" width="${Math.max(1, sw - 4).toFixed(1)}" height="${(pt + ih - Y(vb)).toFixed(1)}" fill="${colO}" fill-opacity=".12" stroke="${colO}" stroke-dasharray="3 2"/>`;
          s += '</g>'; if (h % 3 === 0) s += `<text x="${(x + sw / 2).toFixed(1)}" y="${alto - 2}" text-anchor="middle">${h}</text>`; }
        for (const F of X.franjas) s += `<line x1="${(pl + F.h0 * sw).toFixed(1)}" x2="${(pl + F.h1 * sw).toFixed(1)}" y1="${Y(F.tope_h).toFixed(1)}" y2="${Y(F.tope_h).toFixed(1)}" stroke="${COL.lim}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
        s += `<line data-hora x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--ui-tx,#f1f3ee)" stroke-width="1.5" visibility="hidden"/></svg>`;
        B1(s); der.textContent = `${num(X.lleg)} t/día · ${num(X.vehDia)} veh/día`;
        B2(`<div class="tb-ley"><span>${clave(col, 'barra')}${c.prop ? 'Con' : 'Sin'} propuesta (esta corrida)</span>${Xb ? `<span>${clave(colO, 'hueca')}${c.otro} propuesta</span>` : ''}<span>${clave(COL.lim, 'pun')}Máximo de la franja</span><span>${clave('var(--ui-tx,#f1f3ee)', 'tick')}Hora del reloj</span></div>`); });
      const hora = () => { const ln = cu.querySelector('line[data-hora]'), RL = window.KEN_RELOJ; if (!ln || !geo || sec.hidden) return; const md = RL && RL.minutoDia != null ? RL.minutoDia : null; if (md == null) return;
        const x = (geo.pl + (md / 60) * geo.sw).toFixed(1); ln.setAttribute('x1', x); ln.setAttribute('x2', x); ln.setAttribute('visibility', 'visible'); };
      const iv = setInterval(() => { if (!cu.isConnected) { clearInterval(iv); return; } hora(); }, 1000); U.push(hora); }
    { const { sec, cu, der } = seccion(div, 'Vehículos de carga por tipo', 'Vehículos que traen comida a Corabastos por día: llegadas / 6,21 t por vehículo (DANE-SIPSA 2025). Mezcla: aforo SDM 2020 en la Av. Agoberto Mejía × parte pesada SIPSA (91,3 %); la carga útil por tipo es un supuesto.');
      const B1 = bloque(cu);
      U.push((c) => { const X = corrida(c, c.I); sec.hidden = !X; if (!X) return; const Xb = corrida(c, c.Bk), M = getM() || {}, TP = (M.AB01 && M.AB01.TIPOS) || [];
        const filas = [[c.prop ? 'Con propuesta' : 'Sin propuesta', X, false], ...(Xb ? [[c.prop ? 'Sin propuesta' : 'Con propuesta', Xb, true]] : [])];
        const W = c.W, Lw = 86, x0 = Lw + 6, x1 = W - 52, bw = x1 - x0, h = 22, mx = Math.max(...filas.map((f) => f[1].vehDia)), H = filas.length * h + 2;
        let s = `<svg class="tb-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vehículos de carga por día y tipo: ${X.tipos.map((t) => `${t.n} ${num(t.veh_dia)}`).join(', ')}">`;
        filas.forEach(([n, Z, hueca], i) => { const y = i * h + 5; let x = x0;
          s += `<text class="tb-tn" x="${Lw}" y="${y + 9}" text-anchor="end">${esc(n)}</text>`;
          Z.tipos.forEach((t, k) => { const w = t.veh_dia / mx * bw, T = TP[k] || {}; if (w < 0.3) return;
            s += `<rect data-tt="${esc(`${t.n}|${num(t.veh_dia)} vehículos/día · ${num(t.t_dia)} t/día|Carga útil supuesta: ${num(T.c, 1)} t|${n}`)}" x="${x.toFixed(1)}" y="${y}" width="${Math.max(0.5, w - 1).toFixed(1)}" height="12" rx="1.5" fill="${T.col || CAT[k % 4]}"${hueca ? ' fill-opacity=".35" stroke="' + (T.col || CAT[k % 4]) + '" stroke-dasharray="2 1.5"' : ''}/>`; x += w; });
          s += `<text class="tb-tv" x="${x1 + 5}" y="${y + 9}">${num(Z.vehDia)}</text>`; });
        B1(s + '</svg>' + `<div class="tb-ley" style="margin-top:6px">${X.tipos.map((t, k) => `<span>${clave((TP[k] || {}).col || CAT[k % 4], 'barra')}${esc(t.n.replace(/ \(.*\)$/, ''))} <b>${num(t.veh_dia)}</b></span>`).join('')}</div>`
          + `<p class="tb-nota">Hoy (2025) entran 1.040 vehículos de carga al día, 6,21 t cada uno (DANE-SIPSA). En la franja más cargada (4–6 h) llegan ${num(X.franjas[2] ? X.franjas[2].veh_h : 0)} por hora.</p>`);
        der.textContent = `${num(X.vehDia)} veh/día`; }); }
    { const { sec, cu, der } = seccion(div, 'Corabastos frente a su tope', 'Lo que se le pide a Corabastos (toda la ciudad y la región) frente a su tope; tope = 6.460 t/día × (1 + tope elegido), inferencia SDDE-FAO 2018.'), med = medidor(cu), med2 = medidor(cu);
      U.push((c) => { const X = corrida(c, c.I); sec.hidden = !X; if (!X) return; const v = X.L / X.tope * 100;
        med({ v, max: Math.max(115, v * 1.05), u: 100, cer: 90, a: `Pedido ${num(X.L)} t/día · tope ${num(X.tope)} · llegan ${num(X.lleg)}`, b: num(v) + ' %', e0: '0 %', e1: 'cerca 90 % · tope 100 %', estado: v >= 100 ? 'critico' : v >= 90 ? 'riesgo' : 'sano' });
        const vk = X.coraK / Math.max(1e-9, X.coraPedK) * 100;
        med2({ v: vk, max: 100, u: 80, a: `Kennedy pide ${num(X.coraPedK)} t/día a Corabastos y recibe ${num(X.coraK)} (${num(X.coraK / Math.max(1e-9, X.lleg) * 100, 1)} % de lo que llega)`, b: num(vk) + ' %', e0: '0 %', e1: 'game over por sector bajo 80 %', estado: vk < 80 ? 'critico' : vk < 87 ? 'riesgo' : 'sano' });
        der.textContent = `oferta ${num(X.S)} t/día`; }); }
    { const { sec, cu, der } = seccion(div, 'Oferta frente a demanda de Kennedy', 'Componentes de la comida fresca que recibe Kennedy esta semana (t/día) frente a su demanda. Autoconsumo: supuesto; mercados: 17 t/día cada uno (Contraloría 2025, derivado).'), B1 = bloque(cu);
      U.push((c) => { const X = corrida(c, c.I); sec.hidden = !X; if (!X) return; const Xb = corrida(c, c.Bk);
        const fila = (n, Z) => ({ n, v: Z.coraK + Z.mercT + Z.autoT, segs: [[Z.coraK, CAT[0], 'Corabastos'], [Z.mercT, CAT[1], 'Mercados'], [Z.autoT, CAT[2], 'Autoconsumo']], dem: Z.demK });
        const filas = [fila(c.prop ? 'Con propuesta' : 'Sin propuesta', X), ...(Xb ? [fila(c.prop ? 'Sin propuesta' : 'Con propuesta', Xb)] : [])];
        const W = c.W, Lw = 86, x0 = Lw + 6, x1 = W - 52, bw = x1 - x0, h = 24, mx = Math.max(...filas.map((f) => Math.max(f.v, f.dem))) * 1.04, H = filas.length * h + 4;
        let s = `<svg class="tb-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Oferta frente a demanda de Kennedy">`;
        filas.forEach((f, i) => { const y = i * h + 6; let x = x0; s += `<text class="tb-tn" x="${Lw}" y="${y + 9}" text-anchor="end">${esc(f.n)}</text>`;
          for (const [v, col, n] of f.segs) { const w = v / mx * bw; if (w < 0.3) continue; s += `<rect data-tt="${esc(`${n}|${num(v, 1)} t/día|${num(v / Math.max(1e-9, f.dem) * 100, 1)} % de la demanda|${f.n}`)}" x="${x.toFixed(1)}" y="${y}" width="${Math.max(0.5, w - 1).toFixed(1)}" height="12" rx="1.5" fill="${col}"${i ? ' fill-opacity=".4"' : ''}/>`; x += w; }
          const xd = x0 + f.dem / mx * bw, x80 = x0 + 0.8 * f.dem / mx * bw;
          s += `<line x1="${xd.toFixed(1)}" x2="${xd.toFixed(1)}" y1="${y - 3}" y2="${y + 15}" stroke="var(--ui-tx,#f1f3ee)" stroke-width="2"/><line x1="${x80.toFixed(1)}" x2="${x80.toFixed(1)}" y1="${y - 3}" y2="${y + 15}" stroke="${COL.lim}" stroke-dasharray="3 2"/>`
            + `<text class="tb-tv" x="${x1 + 5}" y="${y + 9}">${num(f.v / Math.max(1e-9, f.dem) * 100)} %</text>`; });
        B1(s + `</svg><div class="tb-ley" style="margin-top:6px"><span>${clave(CAT[0], 'barra')}Corabastos <b>${num(X.coraK)}</b></span><span>${clave(CAT[1], 'barra')}Mercados <b>${num(X.mercT, 1)}</b></span><span>${clave(CAT[2], 'barra')}Autoconsumo <b>${num(X.autoT, 1)}</b></span><span>${clave('var(--ui-tx,#f1f3ee)', 'tick')}Demanda ${num(X.demK)}</span><span>${clave(COL.lim, 'tick')}80 %</span></div>`);
        der.textContent = `${num(X.cobK * 100, 1)} % cubierto`; }); }
    return U;
  }

  /* =================== COMERCIO =================== */
  function tabCom(div, c0) {
    div.insertAdjacentHTML('beforeend', leyenda(c0));
    const U = [kpis(div, ['minSector', 'cobertura', 'autonomia'])];
    U.push(...abasto01(div));
    // cobertura por sector: distribución ordenada (cada punto un sector, del peor al mejor) + la otra mitad como escalón punteado
    { const { cu, der } = seccion(div, 'Cobertura por sector', 'Los sectores de Kennedy ordenados del peor al mejor según el % de su demanda de alimentos que reciben. Bajo 80 % durante 4 semanas: game over.');
      const alto = 104, pl = 34, pr = 6, pt = 8, pb = 15, svg = nodo('svg', { class: 'tb-svg', height: alto, tabindex: 0, role: 'img' }, cu), lista = document.createElement('p'); lista.className = 'tb-nota'; cu.appendChild(lista);
      const gE = nodo('g', {}, svg), otro = nodo('path', { fill: 'none', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg),
        lin = nodo('path', { fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg), gP = nodo('g', {}, svg), xL = nodo('line', { stroke: 'var(--ui-tx2,#c9cfc4)', visibility: 'hidden' }, svg),
        xC = nodo('circle', { r: 4, stroke: 'var(--tb-sur)', 'stroke-width': 2, visibility: 'hidden' }, svg), hit = nodo('rect', { fill: 'transparent', y: 0, height: alto }, svg);
      let S = null, k0 = '', geo = null;
      const ver = (i, cx, cy) => { if (!S || i < 0) return; const x = S[i], X = geo.X(i), Y = geo.Y(x.valor); xL.setAttribute('x1', X); xL.setAttribute('x2', X); xL.setAttribute('y1', pt); xL.setAttribute('y2', alto - pb); xL.setAttribute('visibility', 'visible');
        xC.setAttribute('cx', X); xC.setAttribute('cy', Y); xC.setAttribute('fill', x.valor < 80 ? ESTADO.critico.c : x.valor < 87 ? ESTADO.riesgo.c : geo.col); xC.setAttribute('visibility', 'visible'); geo.i = i;
        const r = svg.getBoundingClientRect(); tip().mostrar(`<div class="t">${esc(x.n)} · puesto ${i + 1} de ${S.length}</div><div class="r"><b>${num(x.valor)} %</b><span>de su demanda</span></div><div class="r"><b>${num(x.demanda, 2)}</b><span>t/día de demanda</span></div><div class="r"><span>${x.valor < 80 ? 'Bajo el límite' : x.valor < 87 ? 'Cerca del límite' : 'En rango'}</span></div>`, cx ?? r.left + X, cy ?? r.top + 12); };
      const quitar = () => { xL.setAttribute('visibility', 'hidden'); xC.setAttribute('visibility', 'hidden'); tip().ocultar(); if (geo) geo.i = -1; };
      svg.addEventListener('pointermove', (e) => { if (!geo) return; const r = svg.getBoundingClientRect(); ver(Math.max(0, Math.min(S.length - 1, Math.round((e.clientX - r.left - pl) / geo.paso))), e.clientX, e.clientY); });
      svg.addEventListener('pointerleave', quitar); svg.addEventListener('blur', quitar); svg.addEventListener('focus', () => S && ver(0));
      svg.addEventListener('keydown', (e) => { if (!geo) return; const k = { ArrowLeft: -1, ArrowRight: 1, Home: -1e4, End: 1e4, PageUp: 10, PageDown: -10 }[e.key]; if (!k) { if (e.key === 'Escape') quitar(); return; } e.preventDefault(); ver(Math.max(0, Math.min(S.length - 1, (geo.i >= 0 ? geo.i : 0) + k))); });
      U.push((c) => { S = (T(c.I).sectores || []).filter((x) => isFinite(x.valor)).sort((a, b) => a.valor - b.valor); if (!S.length) return;
        const sb = c.Bk ? (T(c.Bk).sectores || []).map((x) => x.valor).filter(isFinite).sort((a, b) => a - b) : [];
        const W = c.W, iw = W - pl - pr, ih = alto - pt - pb, mx = Math.max(100, ...S.map((x) => x.valor), ...sb), mn = Math.min(60, ...S.map((x) => x.valor), ...sb), n = S.length, paso = iw / Math.max(1, n - 1);
        const Y = (v) => pt + ih - (v - mn) / (mx - mn || 1) * ih, X = (i) => pl + i * paso, col = c.prop ? COL.con : COL.sin; geo = { X, Y, paso, col, i: geo ? geo.i : -1 };
        svg.setAttribute('width', W); svg.setAttribute('viewBox', `0 0 ${W} ${alto}`); hit.setAttribute('x', pl); hit.setAttribute('width', iw);
        const k = W + '|' + mn + '|' + mx + '|' + n; if (k !== k0) { k0 = k; const m = [mn, 80, 100].filter((v, j, a) => a.indexOf(v) === j); let s = '';
          for (const t of m) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === mn ? 'var(--tb-axis)' : 'var(--tb-grid)'}"/><text x="${pl - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${num(t)} %</text>`;
          s += `<rect x="${pl}" y="${Y(80).toFixed(1)}" width="${iw}" height="${Math.max(0, pt + ih - Y(80)).toFixed(1)}" fill="${COL.lim}" fill-opacity=".07"/><rect x="${pl}" y="${Y(87).toFixed(1)}" width="${iw}" height="${Math.max(0, Y(80) - Y(87)).toFixed(1)}" fill="#fbb315" fill-opacity=".08"/>`
            + `<line x1="${pl}" x2="${W - pr}" y1="${Y(80).toFixed(1)}" y2="${Y(80).toFixed(1)}" stroke="${COL.lim}" stroke-width="1.5" stroke-dasharray="4 3"/><text class="tb-tn" x="${W - pr}" y="${(Y(80) + 11).toFixed(1)}" text-anchor="end">límite 80 %</text>`
            + `<text x="${pl}" y="${alto - 2}">peor</text><text x="${W - pr}" y="${alto - 2}" text-anchor="end">mejor · ${n} sectores</text>`; gE.innerHTML = s; }
        let d = ''; S.forEach((x, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x.valor).toFixed(1); }); lin.setAttribute('d', d); lin.setAttribute('stroke', col);
        let d2 = ''; const pb2 = iw / Math.max(1, sb.length - 1); sb.forEach((v, i) => { d2 += (i ? 'L' : 'M') + (pl + i * pb2).toFixed(1) + ' ' + Y(v).toFixed(1); }); otro.setAttribute('d', d2); otro.setAttribute('stroke', c.prop ? COL.sin : COL.con);
        gP.innerHTML = S.map((x, i) => (x.valor < 87 ? `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.valor).toFixed(1)}" r="3" fill="${x.valor < 80 ? ESTADO.critico.c : ESTADO.riesgo.c}" stroke="var(--tb-sur)" stroke-width="1.5"/>` : '')).join('');
        const bajo = S.filter((x) => x.valor < 80).length, cer = S.filter((x) => x.valor >= 80 && x.valor < 87).length; der.textContent = `${bajo} de ${n} bajo 80 %`;
        svg.setAttribute('aria-label', `Cobertura de alimentos por sector: ${bajo} de ${n} bajo 80 %, el peor ${S[0].n} con ${num(S[0].valor)} %. Flechas para recorrer los sectores.`);
        lista.innerHTML = (bajo || cer ? `${icono(bajo ? 'critico' : 'riesgo', 9)} Peores: ${S.slice(0, 3).map((x) => `<b>${esc(x.n)}</b> ${num(x.valor)} %`).join(' · ')}` : `${icono('sano', 9)} Todos los sectores reciben al menos ${num(S[0].valor)} % de su demanda`)
          + (sb.length ? ` · punteada: ${c.otro.toLowerCase()} propuesta` : '');
        if (geo.i >= 0 && svg.matches(':hover,:focus')) ver(Math.min(geo.i, n - 1)); }); }    // oferta frente a demanda (área apilada)
    { const { cu, der } = seccion(div, 'Oferta frente a demanda', 'De dónde llega la comida de Kennedy (esta corrida), t/día. Punteada: la demanda.');
      const ser = [{ n: 'Corabastos', c: CAT[0] }, { n: 'Mercados de barrio y acopio', c: CAT[1] }, { n: 'Huertas locales', c: CAT[2] }];
      cu.insertAdjacentHTML('beforeend', `<div class="tb-ley">${ser.map((s) => `<span>${clave(s.c, 'barra')}${esc(s.n)}</span>`).join('')}<span>${clave('var(--ui-tx,#f1f3ee)', 'pun')}Demanda</span></div>`);
      const A = new Apilada(cu, { n: 'Oferta de alimentos', u: 't/día', d: 1, series: ser, refN: 'demanda', alto: 112 });
      const fC = (I) => { const t = T(I), rec = t.cobertura / 100 * t.demanda; return t.concentracion / 100 * rec; }, fL = (I) => T(I).autonomia / 100 * T(I).demanda,
        fR = (I) => { const t = T(I), rec = t.cobertura / 100 * t.demanda; return Math.max(0, rec - t.concentracion / 100 * rec - t.autonomia / 100 * t.demanda); };
      U.push((c) => { const a = serie(c, '_cora', fC), b = serie(c, '_red', fR), l = serie(c, '_loc', fL), d = serie(c, 'demanda', IND.demanda.f);
        A.update({ W: c.W, FIN: c.FIN, xs: a.xs, ys: [a.a, b.a, l.a], ref: d.a }); const t = T(c.I); der.textContent = `${num(t.cobertura / 100 * t.demanda)} de ${num(t.demanda)} t/día`; }); }
    U.push(multiples(div, ['concentracion', 'autonomia', 'produccion', 'acopio'], 'Dependencia y producción local'));
    { const { cu, der } = seccion(div, 'Corabastos y mercados', 'Carga de Corabastos frente a su tope y los mercados de barrio que más mueven.'), med = medidor(cu), B1 = bloque(cu);
      U.push((c) => { const A = c.I.abasto || {}, k = A.cora; med.el = med.el || cu.querySelector('.tb-meter'); if (med.el) med.el.hidden = !!A.ab01; if (k && k.tope_t_dia && !A.ab01) { const v = k.carga * 100; med({ v, max: Math.max(110, v * 1.05), u: 100, a: `Corabastos: ${num(k.pedido_t_dia)} t/día pedidas de ${num(k.tope_t_dia)} de tope${k.aplica ? '' : ' (el tope no aplica en este escenario)'}`, b: num(v) + ' %', e0: '0 %', e1: 'tope 100 %', estado: v >= 100 ? 'critico' : v >= 90 ? 'riesgo' : 'sano' }); }
        const m = (A.mercados || []).filter((x) => x.activo && x.t_dia > 0).sort((a, b) => (A.ab01 ? b.carga - a.carga : b.t_dia - a.t_dia)); der.textContent = m.length ? `${m.length} mercados activos` : '';
        if (A.ab01) { B1(m.length ? barrasH(m.slice(0, 10).map((x) => ({ n: x.real ? x.n.replace('Plaza Distrital de Mercado', 'Plaza Distrital') : x.n, v: x.carga * 100, txt: num(x.carga * 100) + ' %', col: x.carga >= 1 - 1e-6 ? ESTADO.critico.c : x.carga >= 0.9 ? ESTADO.riesgo.c : c.prop ? COL.con : COL.sin, tt: `${x.n}${x.real ? ' (plaza existente)' : ' (sitio de la propuesta)'}|Mueve ${num(x.t_dia, 1)} de ${num(x.cap_t_dia)} t/día|Uso: ${num(x.carga * 100)} %|Abre en la semana ${num(x.desde)}` })), c.W, { aria: 'Uso de los mercados frente a su capacidad', vw: 40, max: 110, lim: 100, limU: ' %' })
            + `<p class="tb-nota">Uso de cada mercado frente a sus 17 t/día (los 10 más usados). ${A.mercados.length - m.length > 0 ? `${A.mercados.length - m.length} por abrir.` : ''}</p>` : '<p class="tb-nota">Sin mercados en esta corrida: todo lo que Kennedy compra pasa por Corabastos.</p>'); return; }
        B1(m.length ? barrasH(m.slice(0, 8).map((x) => ({ n: x.n, v: x.t_dia, max: x.cap_t_dia, txt: num(x.t_dia, 1), col: c.prop ? COL.con : COL.sin, tt: `${x.n}|Mueve ${num(x.t_dia, 2)} t/día|Capacidad: ${num(x.cap_t_dia, 2)} t/día|Carga: ${num(x.carga * 100)} %` })), c.W, { aria: 'Mercados de barrio que más mueven', vw: 36 })
          + '<p class="tb-nota">Barra: t/día movidas; fondo: capacidad del mercado.</p>' : '<p class="tb-nota">Sin red de mercados de barrio en esta corrida: todo pasa por Corabastos.</p>'); }); }
    U.push(tabla(div, ['minSector', 'cobertura', 'demanda', 'concentracion', 'autonomia', 'produccion', 'acopio', 'huertas']));
    return U;
  }

  /* =================== MOVILIDAD =================== */
  function tabMov(div, c0) {
    div.insertAdjacentHTML('beforeend', leyenda(c0));
    const U = [kpis(div, ['trafico', 'dRuido', 'congestion'])];
    U.push(graficaLinea(div, 'trafico', 'Tráfico frente a hoy', 'Vehículos en circulación; 100 % = hoy. Límite de referencia: 130 %.'));
    U.push(graficaLinea(div, 'ruidoDb', 'Ruido promedio de las calles', 'Límite de referencia: 3 dB sobre el ruido del inicio (el doble de energía sonora).'));
    { const { cu } = seccion(div, 'Cierre de vía'), B1 = bloque(cu);
      U.push((c) => { const k = c.I.cierre; cu.closest('.tb-sec').hidden = !k; if (!k) return;
        B1(`<p class="tb-nota"><b>${esc(k.via || 'Vía')}</b>${k.on ? ' cerrada' : ''}${k.dur ? ` · ${num(k.dur)} semanas` : ''} · tráfico en los desvíos ×${num(k.traficoDesvio, 2)} · +${num(k.ruidoExtraDb, 1)} dB${(k.vias_desvio || []).length ? `<br>Desvíos: ${k.vias_desvio.map((v) => esc(v.n)).join(', ')}` : ''}</p>`); }); }
    U.push(multiples(div, ['congestion', 'callesR', 't10', 'dRuido'], 'Congestión y exposición'));
    U.push(tabla(div, ['trafico', 'ruidoDb', 'dRuido', 'congestion', 'callesR', 't10']));
    return U;
  }

  /* =================== SOCIEDAD =================== */
  function tabSoc(div, c0) {
    div.insertAdjacentHTML('beforeend', leyenda(c0));
    const U = [kpis(div, ['hogares', 'suelo', 'gob'])];
    U.push(multiples(div, ['suelo', 'hogares', 'gob', 'equidad'], 'Suelo, población y gobernanza', 'Con propuesta continua, sin propuesta punteada.'));
    { const { cu, der } = seccion(div, 'Reparto de recursos por sector', 'Recursos asignados / necesidad de cada sector en la última ronda.'), B1 = bloque(cu);
      U.push((c) => { const g = c.I.gobernanza; cu.closest('.tb-sec').hidden = !(g && g.barrios); if (!g || !g.barrios) return;
        const gb = c.Bk && c.Bk.gobernanza && c.Bk.gobernanza.barrios || [];
        const f = g.barrios.map((b) => { const o = gb.find((x) => x.n === b.n); return { n: b.n.replace(/^Sector /, ''), v: b.cobertura * 100, cmp: o ? o.cobertura * 100 : null, txt: num(b.cobertura * 100) + ' %', col: c.prop ? COL.con : COL.sin,
          tt: `${b.n}|Asignado: ${num(b.asignado, 1)} de ${num(b.necesidad, 1)}|Cobertura: ${num(b.cobertura * 100)} %|${c.otro} propuesta: ${o ? num(o.cobertura * 100) + ' %' : '—'}|Equipamientos: ${num(b.equipamientos)}` }; }).sort((a, b) => a.v - b.v);
        der.textContent = `equidad ${num(g.equidad * 100)} / 100 · ${num(g.rondas)} rondas`;
        B1(barrasH(f, c.W, { max: 100, aria: 'Cobertura de recursos por sector', colCmp: c.prop ? COL.sin : COL.con, vw: 36 }) + `<p class="tb-nota">Barra: esta corrida; punto: ${c.otro.toLowerCase()} propuesta.</p>`); }); }
    U.push(tabla(div, ['hogares', 'suelo', 'gob', 'equidad', 'huertas']));
    return U;
  }
  const CONSTR = { eco: tabEco, circ: tabCirc, com: tabCom, mov: tabMov, soc: tabSoc };

  /* ---------- ciclo: solo la pestaña visible, ≤ 4 veces por segundo, en tiempo ocioso ---------- */
  function pintar(sync) {
    if (simHecho !== R.sim) { simHecho = R.sim; CACHE.clear(); for (const k in hechas) delete hechas[k]; wrap.querySelectorAll('[role=tabpanel]').forEach((p) => { p.innerHTML = ''; }); }
    const H = R.hist, vacio = wrap.querySelector('.tb-vacio');
    if (!R.sim || !H || !H.length) {
      vacio.hidden = false; vacio.textContent = R.sim ? 'Calculando la primera semana…' : 'Escoge un escenario o dale play: aquí aparecen, semana a semana, las gráficas de los tres sistemas de la simulación.';
      wrap.querySelectorAll('[role=tabpanel]').forEach((p) => { p.style.display = 'none'; }); wrap.querySelector('.tb-sem').textContent = ''; wrap.querySelector('.tb-esc').textContent = ''; nHecho = 0; return;
    }
    vacio.hidden = true; wrap.querySelectorAll('[role=tabpanel]').forEach((p) => { p.style.display = ''; });
    if (H !== H0) CACHE.clear();
    const c = ctxDe(); ancho = wrap.clientWidth; api.n++;
    pintarEncabezado(c);
    let P = hechas[pestaña]; if (!P) { const div = document.createElement('div'); pan.replaceChildren(div); P = hechas[pestaña] = { div, U: CONSTR[pestaña](div, c) }; }
    nHecho = H.length; H0 = H; nBase = (R.ecoBase || R.base || []).length; goHecho = R.go;
    cola = { c, U: P.U, i: 0 }; if (sync) trabajar(null);
  }
  /* las gráficas de la pestaña se actualizan por partes, cediendo cuando se acaba el tiempo ocioso del cuadro (no traba el 3D) */
  let cola = null;
  function trabajar(dl) {
    while (cola && cola.i < cola.U.length) { const u = cola.U[cola.i++]; try { u(cola.c); } catch (e) { console.warn('tablero:', e); } if (dl && !dl.didTimeout && dl.timeRemaining() < 4) break; }
    if (cola && cola.i >= cola.U.length) cola = null;
  }
  const ocio = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(() => f(null), 16);
  function programar() {
    if (pendiente) return; pendiente = true;
    const paso = (dl) => { if (!cola) { ultimo = performance.now(); try { pintar(false); } catch (e) { console.warn('tablero:', e); } } trabajar(dl); if (cola) ocio(paso); else pendiente = false; };
    ocio(paso);
  }  function tick() {
    if (document.hidden) return; if (!getM()) return; if (!montar()) return;
    if (!root.isConnected || root.getClientRects().length === 0 || !wrap.getClientRects().length) return; // cajón cerrado (celular): no se dibuja
    if (!limUsuario && hd) { const q = root.clientHeight >= 700; if (q !== limAbierto) ponerLim(q); }
    const H = R.hist || [], nb = (R.ecoBase || R.base || []).length, ahora = performance.now();
    const cambio = simHecho !== R.sim || H !== H0 || sucio || R.go !== goHecho || H.length !== nHecho || (nb !== nBase && ahora - ultimo > 2000);
    if (!cambio || ahora - ultimo < 250) return;
    sucio = false; programar();
  }
  setInterval(tick, 250);
  const api = { n: 0, pintar: () => { sucio = true; ultimo = 0; cola = null; if (montar()) pintar(true); }, pestaña: (id) => { if (wrap) elegir(id); } }; // n = redibujos (diagnóstico)
  window.KEN_PD = api;
  return api;
}
