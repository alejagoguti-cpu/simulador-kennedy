/* ============ PANEL DE DATOS (izquierda, section#lp-datos) ============
   Tablero estadístico de TODA la simulación, en vivo. Reemplaza el diagrama de cuerdas y las pestañas de «Indicadores» del panel derecho.
   · Encabezado: índice ecocéntrico ahora frente al año 1 y frente a la otra mitad del par, veredicto (sano / en riesgo / crítico) y la
     distancia a cada límite de game over (REGLAS de simulaciones12.js, con los mismos umbrales MALO y CERCA del modelo).
   · Grupos plegables (details/summary): cada indicador con valor, unidad, cambio frente al año 1, la otra mitad del par y una serie de 15 años
     (con propuesta = línea continua, sin propuesta = punteada, límite = línea de referencia con su valor). Tooltip y teclado (flechas).
   · Barras medibles: especies por parches ocupados, relaciones de la red activas por tipo, muertes por causa y año, atropellos por año,
     cobertura por sector.
   Nada se calcula del modelo aquí: todo sale de R.hist (corrida actual, un I por semana) y R.ecoBase (la otra mitad del par, misma semilla).
   Se redibuja como mucho cada 0,5 s y solo cuando avanzan 4 semanas; los grupos cerrados no se dibujan. SVG a mano, sin librerías.
   Paleta validada con dataviz/validate_palette.js sobre la superficie de vidrio oscuro #1e2422 (modo oscuro):
   series #338ced (con propuesta) / #e76624 (sin propuesta): todo PASA (CVD ΔE 27,5; normal 33,3; contraste ≥ 3:1);
   causas de muerte #00a888, #d28e05, #9887ef, #e24d8b en ese orden: todo PASA (CVD ΔE 11,1; normal 20,1). */

const COL = { con: '#338ced', sin: '#e76624', lim: '#dc3c3d' };
const CAUSAS = [['colision', 'Choque contra vidrio o fachada', '#00a888'], ['atropello', 'Atropello', '#d28e05'], ['ruido', 'Ruido', '#9887ef'], ['hambre_habitat', 'Pérdida de hábitat o alimento', '#e24d8b']];
const ESTADO = { sano: { n: 'Sano', c: '#0aac23' }, riesgo: { n: 'En riesgo', c: '#fbb315' }, critico: { n: 'Crítico', c: '#dc3c3d' } };
const ICONO = { sano: '<circle cx="5" cy="5" r="4"/>', riesgo: '<path d="M5 .8 9.4 9H.6z"/>', critico: '<path d="M5 .4 9.6 5 5 9.6.4 5z"/>' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fin = (v) => (v != null && isFinite(v) ? +v : null);
const num = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }));
const T = (I) => (I && I.evaluacion && I.evaluacion.territorio) || {};
const ev = (f, I) => { try { return fin(f(I)); } catch (e) { return null; } };
const minSector = (I) => { const s = (T(I).sectores || []).filter((x) => isFinite(x.valor)); return s.length ? Math.min(...s.map((x) => x.valor)) : null; };
const icono = (k) => `<svg class="pd-ico" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" fill="${ESTADO[k].c}">${ICONO[k]}</svg>`;
const chip = (k) => `<span class="pd-chip">${icono(k)}${ESTADO[k].n}</span>`;

/* ---------- límites (REGLAS de simulaciones12.js: VALOR, MALO y CERCA copiados de allí) ---------- */
const LIMITES = [
  { k: 'habitat', n: 'Presencia de fauna en el territorio', v: (I) => I.pares / Math.max(1, I.pares0) * 100, u: 70, abajo: true, malo: (v) => v <= 70, cerca: (v) => v <= 80, un: '%', d: 0, go: true, txt: '% de la ocupación especie × parche del inicio' },
  { k: 'residuos', n: 'Orgánicos pendientes de tratamiento', v: (I) => I.residuos * 100, u: 100, abajo: false, malo: (v) => v > 100, cerca: (v) => v > 85, un: '%', d: 0, go: true, txt: '% de la capacidad de almacenamiento' },
  { k: 'abasto', n: 'Sector peor abastecido', v: minSector, u: 80, abajo: true, malo: (v) => v < 80, cerca: (v) => v < 87, un: '%', d: 0, go: true, txt: '% de su demanda de alimentos' },
  { k: 'fauna', n: 'Especies de fauna', v: (I) => I.fauna / Math.max(1, I.fauna0) * 100, u: 90, abajo: true, malo: (v) => v < 90, cerca: (v) => v < 94, un: '%', d: 0, go: false, txt: '% de las especies del inicio' },
  { k: 'humedal', n: 'Área funcional de humedales', v: (I) => I.humedalFuncional, u: 70, abajo: true, malo: (v) => v <= 70, cerca: (v) => v <= 80, un: '%', d: 0, go: false, txt: '% del área funcional de hoy' },
  { k: 'ruido', n: 'Ruido sobre el inicio', v: (I) => I.ruidoDb - I.ruidoDb0, u: 3, abajo: false, malo: (v) => v >= 3, cerca: (v) => v >= 2, un: 'dB', d: 1, go: false, txt: 'dB sobre el ruido del inicio' },
  { k: 'trafico', n: 'Tráfico frente a hoy', v: (I) => I.trafico * 100, u: 130, abajo: false, malo: (v) => v >= 130, cerca: (v) => v >= 120, un: '%', d: 0, go: false, txt: '% de los vehículos de hoy' }
];
const estadoDe = (L, v) => (v == null ? null : L.malo(v) ? 'critico' : L.cerca(v) ? 'riesgo' : 'sano');

/* ---------- indicadores por grupo ---------- */
const PETALOS = [['integridad', 'Integridad ecológica'], ['biodiversidad', 'Biodiversidad'], ['abioticos', 'Agua, suelo y ruido'], ['limites', 'No regresión'], ['gobernanza', 'Gobernanza']];
const ECO = { k: 'eco', n: 'Índice ecocéntrico', u: '/100', d: 0, v: (I) => I.eco.indice * 100, sube: true };
const GRUPOS = [
  { id: 'eco', n: 'Ecosistema y fauna', extra: ['especies', 'tipos'], ind: [
    { k: 'fauna', n: 'Especies de fauna presentes', u: 'especies', v: (I) => I.fauna, sube: true, lim: { v: (I) => 0.9 * I.fauna0, r: 'fauna' } },
    { k: 'pares', n: 'Presencia especie × parche', u: '%', v: (I) => I.pares / Math.max(1, I.pares0) * 100, sube: true, lim: { v: () => 70, r: 'habitat' }, ay: 'Parches ocupados por todas las especies; semana 1 = 100 %.' },
    { k: 'red', n: 'Interacciones locales activas', u: '', v: (I) => I.red, sube: true, ay: 'Relaciones de la red biótica que ocurren dentro de cada parche.' },
    { k: 'poliniz', n: 'Polinizadores en el territorio', u: 'especie × parche', v: (I) => I.poliniz, sube: true },
    { k: 'shannon', n: 'Diversidad de Shannon H′', u: '', d: 2, v: (I) => I.biodiversidad.shannon, sube: true, ay: 'H′ = −Σ pᵢ ln pᵢ con pᵢ = parches de la especie i / total.' },
    { k: 'conect', n: 'Hábitat conectado', u: '%', v: (I) => T(I).conectados, sube: true },
    { k: 'humF', n: 'Humedales que funcionan', u: '%', v: (I) => I.humedalFuncional, sube: true, lim: { v: () => 70, r: 'humedal' } },
    { k: 'humHa', n: 'Área de humedal', u: 'ha', d: 1, v: (I) => I.humedalHa, sube: true },
    { k: 'arb', n: 'Árboles perdidos en parques', u: '%', d: 1, v: (I) => I.arbolesPerdidos * 100, sube: false },
    { k: 'avesR', n: 'Bienestar de las aves frente al ruido', u: '%', v: (I) => I.avesRuido.bienestar * 100, sube: true, ay: '100 % bajo 50 dB, 0 % a 70 dB, en los parches con aves.' },
    { k: 'ratas', n: 'Ratas (1 = hoy)', u: '×', d: 2, v: (I) => I.ratas, sube: false }] },
  { id: 'muertes', n: 'Mortalidad de fauna', pre: ['causas', 'atropAño'], ind: [
    { k: 'mTot', n: 'Muertes acumuladas', u: 'animales', v: (I) => I.muertes.total, sube: false },
    { k: 'aTot', n: 'Atropellos acumulados', u: 'animales', v: (I) => I.atropellos.total, sube: false }] },
  { id: 'circ', n: 'Circularidad de recursos', ind: [
    { k: 'circ', n: 'Economía circular', u: '%', d: 1, v: (I) => I.circularIdx * 100, sube: true, ay: 'Orgánicos que vuelven como abono / orgánicos generados.' },
    { k: 'aprov', n: 'Orgánicos tratados en planta', u: '%', v: (I) => T(I).aprovechamiento, sube: true },
    { k: 'resid', n: 'Orgánicos pendientes', u: '%', v: (I) => I.residuos * 100, sube: false, lim: { v: () => 100, r: 'residuos' }, ay: '% de la capacidad de almacenamiento.' },
    { k: 'compost', n: 'Compost producido', u: 't/día', d: 1, v: (I) => T(I).compost, sube: true },
    { k: 'basT', n: 'Basura generada', u: 't/día', v: (I) => I.basuraT, sube: false },
    { k: 'sinR', n: 'Basura sin recoger', u: '%', v: (I) => I.sinRecoger * 100, sube: false }] },
  { id: 'abasto', n: 'Abastecimiento y comercio', extra: ['sectores'], ind: [
    { k: 'cobMin', n: 'Sector peor abastecido', u: '%', v: minSector, sube: true, lim: { v: () => 80, r: 'abasto' }, ay: '% de la demanda que recibe el sector con menos comida.' },
    { k: 'recib', n: 'Alimentos que recibe Kennedy', u: '%', v: (I) => 100 * (1 - I.abasto.deficit), sube: true },
    { k: 'comMin', n: 'Comida en la zona peor', u: '%', v: (I) => I.comidaMin * 100, sube: true },
    { k: 'auton', n: 'Autonomía alimentaria (huertas)', u: '%', d: 1, v: (I) => T(I).autonomia, sube: true },
    { k: 'conc', n: 'Dependencia de Corabastos', u: '%', v: (I) => T(I).concentracion, sube: false },
    { k: 'prod', n: 'Producción de las huertas', u: 't/día', d: 1, v: (I) => T(I).produccion, sube: true },
    { k: 'huertas', n: 'Huertas activas', u: '', v: (I) => I.huertas, sube: true }] },
  { id: 'mov', n: 'Movilidad y ruido', ind: [
    { k: 'traf', n: 'Tráfico (100 = hoy)', u: '%', v: (I) => I.trafico * 100, sube: false, lim: { v: () => 130, r: 'trafico' } },
    { k: 'ruido', n: 'Ruido promedio de las calles', u: 'dB', d: 1, v: (I) => I.ruidoDb, sube: false, lim: { v: (I) => I.ruidoDb0 + 3, r: 'ruido' } },
    { k: 'cong', n: 'Congestión', u: '%', v: (I) => I.congestion, sube: false, ay: 'Tiempo extra de viaje frente a vía libre.' },
    { k: 'callesR', n: 'Calles con más de 65 dB', u: '%', v: (I) => I.callesRuidosas, sube: false },
    { k: 't10', n: 'Tiempo para recorrer 10 km', u: 'min', d: 1, v: (I) => I.tiempo10km, sube: false }] },
  { id: 'pob', n: 'Población, suelo y gobernanza', ind: [
    { k: 'suelo', n: 'Precio del suelo (1 = hoy)', u: '×', d: 2, v: (I) => I.sueloIdx, sube: false },
    { k: 'hog', n: 'Hogares en riesgo de desplazamiento', u: 'hogares', v: (I) => I.hogaresRiesgo, sube: false },
    { k: 'gob', n: 'Gobernanza', u: '/100', v: (I) => I.eco.gobernanza * 100, sube: true, ay: 'Asambleas, protección del suelo y equidad del reparto.' },
    { k: 'equi', n: 'Equidad del reparto de comida', u: '/100', v: (I) => I.eco.sub.gobernanza.equidad.valor * 100, sube: true }] }
];

const CSS = `
#lp-datos{container-type:inline-size;--pd-sur:#1e2422;--pd-grid:rgba(255,255,255,.07);--pd-axis:rgba(255,255,255,.2);
 font-family:var(--ui-sans,'Inter',system-ui,-apple-system,'Segoe UI',sans-serif);color:var(--ui-tx,#eef0ea);margin-top:12px;border-top:1px solid var(--ui-bd,rgba(255,255,255,.12));padding-top:10px;min-width:0}
#lp-datos .pd{display:block;min-width:0}
#lp-datos .pd-hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}
#lp-datos .pd-tit{font:500 9.5px/1.3 var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-tx3,#a3ad9a)}
#lp-datos .pd-sem{font-size:10.5px;font-weight:400;line-height:1.3;white-space:nowrap;color:var(--ui-tx2,#c2c8bb);font-variant-numeric:tabular-nums}
#lp-datos .pd-ley{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10px;color:var(--ui-tx2,#c2c8bb);margin:0 0 8px}
#lp-datos .pd-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
#lp-datos .pd-ley b{font-weight:600;color:var(--ui-tx,#eef0ea)}
#lp-datos .pd-hero{padding:8px 0 4px}
#lp-datos .pd-hero-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
#lp-datos .pd-lbl{font-size:11px;font-weight:500;color:var(--ui-tx2,#c2c8bb)}
#lp-datos .pd-big{font-size:38px;font-weight:300;line-height:1.05;letter-spacing:-.01em;margin:2px 0 2px}
#lp-datos .pd-big small{font-size:13px;font-weight:400;color:var(--ui-tx3,#a3ad9a);margin-left:3px}
#lp-datos .pd-cmp{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
#lp-datos .pd-cmp>div{border:1px solid var(--ui-bd,rgba(255,255,255,.12));border-radius:8px;padding:5px 7px;min-width:0}
#lp-datos .pd-cmp small{display:block;font-size:9.5px;color:var(--ui-tx3,#a3ad9a)}
#lp-datos .pd-cmp b{font-size:13px;font-weight:600}
#lp-datos .pd-cmp em{font-style:normal;font-size:10.5px;color:var(--ui-tx2,#c2c8bb);margin-left:4px}
#lp-datos .pd-verd{font-size:11px;line-height:1.4;color:var(--ui-tx2,#c2c8bb);margin:4px 0 6px}
#lp-datos .pd-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;padding:2px 8px 2px 6px;border-radius:99px;border:1px solid var(--ui-bd,rgba(255,255,255,.14));background:rgba(255,255,255,.04);white-space:nowrap;color:var(--ui-tx,#eef0ea)}
#lp-datos .pd-ico{flex:none}
#lp-datos details.pd-g{border-top:1px solid var(--ui-bd,rgba(255,255,255,.12))}
#lp-datos details.pd-g>summary{list-style:none;display:flex;align-items:center;gap:8px;padding:10px 0;cursor:pointer;font-size:12px;font-weight:600;color:var(--ui-tx,#eef0ea);user-select:none}
#lp-datos details.pd-g>summary::-webkit-details-marker{display:none}
#lp-datos details.pd-g>summary::before{content:'';flex:none;width:5px;height:5px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;rotate:-45deg;margin:0 2px 0 1px;opacity:.75}
#lp-datos details.pd-g[open]>summary::before{rotate:45deg;margin-top:-3px}
@media (prefers-reduced-motion:no-preference){#lp-datos details.pd-g>summary::before{transition:rotate .15s}}
#lp-datos details.pd-g>summary:hover{color:var(--ui-acc-tx,#e0f7a0)}
#lp-datos details.pd-g>summary:focus-visible{outline:1px solid var(--ui-acc,#bfe3b4);outline-offset:2px;border-radius:4px}
#lp-datos .pd-cnt{margin-left:auto;font-size:10px;font-weight:400;color:var(--ui-tx3,#a3ad9a);display:inline-flex;align-items:center;gap:5px}
#lp-datos .pd-b{padding:0 0 8px}
#lp-datos .pd-ind{padding:8px 0 4px;border-top:1px solid var(--pd-grid)}
#lp-datos .pd-ind:first-child{border-top:0;padding-top:0}
#lp-datos .pd-ih{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#lp-datos .pd-n{font-size:11px;font-weight:500;color:var(--ui-tx,#eef0ea);min-width:0}
#lp-datos .pd-v{font-size:13px;font-weight:600;white-space:nowrap}
#lp-datos .pd-v small{font-size:10px;font-weight:400;color:var(--ui-tx2,#c2c8bb);margin-left:2px}
#lp-datos .pd-d{display:flex;flex-wrap:wrap;gap:1px 10px;font-size:10px;line-height:1.45;color:var(--ui-tx2,#c2c8bb);margin:1px 0 3px;font-variant-numeric:tabular-nums}
#lp-datos .pd-d i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px;vertical-align:1px;background:var(--ui-tx3,#a3ad9a)}
#lp-datos .pd-ay{font-size:9.5px;line-height:1.4;color:var(--ui-tx3,#a3ad9a);margin:0 0 3px}
#lp-datos .pd-sub{font-size:10.5px;font-weight:600;color:var(--ui-tx2,#c2c8bb);margin:8px 0 2px;letter-spacing:.01em}
#lp-datos svg.pd-svg{display:block;overflow:visible;touch-action:pan-y}
#lp-datos svg.pd-svg text{font:9px var(--ui-sans,'Inter',system-ui,sans-serif);fill:var(--ui-tx3,#a3ad9a);font-variant-numeric:tabular-nums}
#lp-datos svg.pd-svg text.pd-tn{fill:var(--ui-tx2,#c2c8bb);font-size:9.5px}
#lp-datos svg.pd-svg text.pd-tv{fill:var(--ui-tx,#eef0ea);font-size:9.5px;font-weight:600}
#lp-datos svg.pd-svg:focus-visible{outline:1px solid var(--ui-acc,#bfe3b4);outline-offset:2px;border-radius:3px}
#lp-datos [data-tt]{cursor:default}
#lp-datos [data-tt]:hover>.pd-m{filter:brightness(1.25)}
#lp-datos .pd-lim{padding:7px 0 3px;border-top:1px solid var(--pd-grid)}
#lp-datos .pd-lim:first-child{border-top:0;padding-top:0}
#lp-datos .pd-tag{font-size:9px;color:var(--ui-tx3,#a3ad9a);border:1px solid var(--ui-bd,rgba(255,255,255,.12));border-radius:4px;padding:0 4px}
#lp-datos .pd-vacio{font-size:11px;color:var(--ui-tx2,#c2c8bb);line-height:1.45;padding:6px 0 10px}
#lp-datos .pd-nota{font-size:9.5px;line-height:1.4;color:var(--ui-tx3,#a3ad9a);margin:8px 0 2px}
@container (max-width:260px){#lp-datos .pd-cmp{grid-template-columns:1fr}#lp-datos .pd-big{font-size:32px}}
#pd-tip{position:fixed;z-index:10050;pointer-events:none;display:none;min-width:130px;max-width:260px;padding:7px 9px;border-radius:8px;
 background:rgba(20,24,23,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 26px rgba(0,0,0,.4);color:#eef0ea;
 font:11px/1.4 var(--ui-sans,'Inter',system-ui,sans-serif);font-variant-numeric:tabular-nums}
#pd-tip .t{color:#a9b2a6;font-size:10px;margin-bottom:3px}
#pd-tip .r{display:flex;align-items:center;gap:6px;white-space:nowrap}
#pd-tip .r b{font-weight:600}
#pd-tip .r span{color:#b9c1b5}
`;

/* clave de línea (leyenda y tooltip): continua, punteada o barra */
const clave = (c, tipo) => tipo === 'barra' ? `<svg width="10" height="8" aria-hidden="true"><rect y="1" width="10" height="6" rx="1.5" fill="${c}"/></svg>`
  : tipo === 'tick' ? `<svg width="6" height="10" aria-hidden="true"><rect x="2" width="2" height="10" fill="${c}"/></svg>`
  : `<svg width="16" height="6" aria-hidden="true"><line x1="0" x2="16" y1="3" y2="3" stroke="${c}" stroke-width="2"${tipo === 'pun' ? ' stroke-dasharray="4 3"' : ''}/></svg>`;

function marcas(mn, mx, n = 3) {
  if (!(mx > mn)) { const d = Math.abs(mn) * 0.1 || 1; mn -= d; mx += d; }
  const p0 = (mx - mn) / (n - 1), p = Math.pow(10, Math.floor(Math.log10(p0))), m = p0 / p, paso = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  const a = Math.floor(mn / paso + 1e-9) * paso, b = Math.ceil(mx / paso - 1e-9) * paso, t = [];
  for (let v = a; v <= b + paso * 1e-6; v += paso) t.push(+v.toFixed(10));
  return { t, a, b, paso };
}
const fmtEje = (v, paso) => Math.abs(v) >= 10000 ? num(v / 1000, 0) + ' K' : num(v, paso < 0.1 ? 2 : paso < 1 ? 1 : 0);
const camino = (xs, ys, X, Y) => { let d = '', on = false; for (let i = 0; i < xs.length; i++) { const v = ys[i]; if (v == null) { on = false; continue; } d += (on ? 'L' : 'M') + X(xs[i]).toFixed(1) + ' ' + Y(v).toFixed(1); on = true; } return d; };
/* barra horizontal: esquina redondeada (4 px) solo en el extremo del dato, cuadrada en la línea base */
const barraH = (x, y, w, h) => { if (w <= 0.5) return ''; const r = Math.min(4, w, h / 2); return `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`; };
const barraV = (x, y, w, h, r = 4) => { if (h <= 0.5) return ''; r = Math.min(r, w / 2, h); return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`; };

export function iniciarPanelDatos({ R, getM, getFIN }) {
  if (!document.getElementById('pd-css')) { const st = document.createElement('style'); st.id = 'pd-css'; st.textContent = CSS; document.head.appendChild(st); }
  const tip = document.createElement('div'); tip.id = 'pd-tip'; tip.setAttribute('role', 'status'); document.body.appendChild(tip);
  let generacion = 0, root = null, wrap = null, simHecho = undefined, H0 = null, nHecho = -1, nBase = -1, ultimo = 0, sucio = true, ancho = 0, espera = 0, goHecho = null;
  const abiertos = new Set(['lim']);
  const CH = new Map(); let nCh = 0, enfoque = null; // series de cada gráfica (para el tooltip)
  let RED_I = null, pRed = null;

  /* red biótica por tipo de relación: los enlaces de simulaciones_datos.json + los que agrega red_trofica.js (crearRed) */
  function cargarRed() {
    const M = getM(); if (pRed || !M || !M.URL_DATOS) return; pRed = true;
    Promise.all([import('./sim_vida.js?v=sostenibilidad1'), fetch(M.URL_DATOS).then((r) => r.json())]).then(([V, J]) => {
      const enl = J.red.enlaces.map(([a, b, t]) => [a, b, t]);
      for (const [a, b, t] of J.red.enlaces) if (a === 'colibri' && b[0] === 'f' && t === 5) enl.push(['abeja', b, 5]);
      enl.push(['abeja', 'colibri', 8], ['mirla', 'lombriz', 0], ['cucarachero', 'abeja', 0], ['tingua', 'lombriz', 0]);
      RED_I = { ids: V.ESPECIES.map((e) => e[0]).concat(['rata', 'caracol', 'abeja', 'lombriz']), enl, tipos: J.red.tipos, total: J.red.tipos.map((_, t) => enl.filter((e) => e[2] === t).length) };
      sucio = true;
    }).catch((e) => console.warn('panel de datos (red):', e));
  }
  function tiposActivos(I) {
    const esp = T(I).especies; if (!RED_I || !esp || esp.length !== RED_I.ids.length) return null;
    const pres = {}; RED_I.ids.forEach((id, i) => { pres[id] = esp[i].valor > 0; });
    const c = RED_I.tipos.map(() => 0); for (const [a, b, t] of RED_I.enl) if ((pres[a] ?? true) && (pres[b] ?? true)) c[t]++;
    return c;
  }

  /* ---------- montaje ---------- */
  function montar() {
    let s = document.getElementById('lp-datos');
    if (!s) { const izq = document.getElementById('gs-izq'); if (!izq || ++espera < 8) return false; s = document.createElement('section'); s.id = 'lp-datos'; izq.appendChild(s); }
    if (s !== root || !wrap || !s.contains(wrap)) {
      root = s; root.setAttribute('aria-label', 'Datos de la simulación'); wrap = document.createElement('div'); wrap.className = 'pd'; root.replaceChildren(wrap); simHecho = undefined;
      root.addEventListener('pointermove', mover); root.addEventListener('pointerleave', ocultar); root.addEventListener('focusin', enfocar); root.addEventListener('focusout', ocultar); root.addEventListener('keydown', teclas);
      if ('ResizeObserver' in window) new ResizeObserver(() => { const w = wrap.clientWidth; if (Math.abs(w - ancho) > 4) sucio = true; }).observe(wrap);
    }
    return true;
  }
  const ctxDe = () => {
    const H = R.hist, I = H[H.length - 1], B = R.ecoBase || R.base || null, prop = !!(R.def && R.def.propuesta);
    return { H, I, B, prop, I1: H[Math.min(51, H.length - 1)], Bk: B && B[H.length - 1] && B[H.length - 1].sem === I.sem ? B[H.length - 1] : null, FIN: getFIN(), W: Math.max(220, Math.floor(wrap.clientWidth)), go: !!(R.def && R.def.par) };
  };
  const nombreCorrida = (prop) => (prop ? 'Con propuesta' : 'Sin propuesta');

  function esqueleto() {
    CH.clear();
    const prop = !!(R.def && R.def.propuesta);
    const ley = `<div class="pd-ley" aria-label="Leyenda"><span>${clave(COL.con)}Con propuesta${prop ? ' <b>(esta corrida)</b>' : ''}</span><span>${clave(COL.sin, 'pun')}Sin propuesta${prop ? '' : ' <b>(esta corrida)</b>'}</span><span>${clave(COL.lim, 'pun')}Límite</span><span>${clave('var(--ui-tx,#eef0ea)', 'tick')}Año 1</span></div>`;
    wrap.innerHTML = `<div class="pd-hd"><span class="pd-tit">Datos de la simulación</span><span class="pd-sem"></span></div>${ley}<div class="pd-hero"></div>`
      + `<details class="pd-g" data-g="lim"><summary>Distancia a los límites<span class="pd-cnt"></span></summary><div class="pd-b"></div></details>`
      + GRUPOS.map((g) => `<details class="pd-g" data-g="${g.id}"><summary>${esc(g.n)}<span class="pd-cnt"></span></summary><div class="pd-b"></div></details>`).join('')
      + `<p class="pd-nota">Modelo semanal de 15 años (simulaciones12.js). Cada curva va de la semana 1 a la 780; la punteada es la otra mitad del par con la misma semilla y las mismas variables. Pasa el puntero o usa las flechas sobre una gráfica para leer cada semana.</p>`;
    wrap.querySelectorAll('details.pd-g').forEach((d) => {
      d.open = abiertos.has(d.dataset.g);
      d.addEventListener('toggle', () => { if (d.open) { abiertos.add(d.dataset.g); if (R.hist.length) pintarGrupo(d, ctxDe()); } else abiertos.delete(d.dataset.g); });
    });
  }

  /* ---------- gráfica de línea de 15 años ---------- */
  function linea(def, c, alto = 76) {
    const { H, B, prop, I, FIN, W } = c, idx = [];
    for (let i = 3; i < H.length; i += 4) idx.push(i); if (!idx.length || idx[idx.length - 1] !== H.length - 1) idx.push(H.length - 1);
    if (H.length > 1 && idx[0] !== 0) idx.unshift(0);
    const xs = [], a = [], b = [];
    for (const i of idx) { xs.push(H[i].sem); a.push(ev(def.v, H[i])); const bi = B && B[i]; b.push(bi && bi.sem <= I.sem ? ev(def.v, bi) : null); }
    if (a.every((v) => v == null)) return '';
    const lim = def.lim ? ev(def.lim.v, I) : null, vals = a.concat(b).filter((v) => v != null);
    let mn = Math.min(...vals), mx = Math.max(...vals);
    if (lim != null) { mn = Math.min(mn, lim); mx = Math.max(mx, lim); }
    const m = marcas(mn, mx, 3), pl = 32, pr = 6, pt = 7, pb = 15, iw = W - pl - pr, ih = alto - pt - pb;
    const X = (s) => pl + (s - 1) / Math.max(1, FIN - 1) * iw, Y = (v) => pt + ih - (v - m.a) / (m.b - m.a || 1) * ih;
    const conA = prop ? a : b, sinA = prop ? b : a, colAct = prop ? COL.con : COL.sin;
    let s = `<svg class="pd-svg" width="${W}" height="${alto}" viewBox="0 0 ${W} ${alto}" tabindex="0" role="img" data-c="${++nCh}" aria-label="${esc(def.n)}: ${num(a[a.length - 1], def.d || 0)} ${esc(def.u || '')} en la semana ${I.sem}. Flechas para recorrer las semanas.">`;
    for (const t of m.t) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--pd-grid)"/><text x="${pl - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${fmtEje(t, m.paso)}</text>`;
    s += `<line x1="${pl}" x2="${W - pr}" y1="${pt + ih}" y2="${pt + ih}" stroke="var(--pd-axis)"/>`;
    for (const [an, tx] of [[1, 'año 1'], [5, '5'], [10, '10'], [15, '15']]) { const x = X((an - 1) * 52 + 1); s += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${pt + ih}" y2="${pt + ih + 3}" stroke="var(--pd-axis)"/><text x="${x.toFixed(1)}" y="${alto - 2}" text-anchor="${an === 1 ? 'start' : an === 15 ? 'end' : 'middle'}">${tx}</text>`; }
    if (lim != null) { const y = Y(lim).toFixed(1); s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${COL.lim}" stroke-width="1.5" stroke-dasharray="4 3"/><text class="pd-tn" x="${W - pr}" y="${(Y(lim) - 3).toFixed(1)}" text-anchor="end">límite ${num(lim, def.d || 0)}</text>`; }
    // lavado del área de esta corrida (10 %), sin propuesta punteada, con propuesta continua, punto final con anillo del color de la superficie
    const pts = xs.map((x, i) => [x, a[i]]).filter((p) => p[1] != null);
    if (pts.length > 1) s += `<path d="M${X(pts[0][0]).toFixed(1)} ${pt + ih}${pts.map((p) => 'L' + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('')}L${X(pts[pts.length - 1][0]).toFixed(1)} ${pt + ih}Z" fill="${colAct}" opacity=".1"/>`;
    const dS = camino(xs, sinA, X, Y), dC = camino(xs, conA, X, Y);
    if (dS) s += `<path d="${dS}" fill="none" stroke="${COL.sin}" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (dC) s += `<path d="${dC}" fill="none" stroke="${COL.con}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const u = pts[pts.length - 1]; if (u) s += `<circle cx="${X(u[0]).toFixed(1)}" cy="${Y(u[1]).toFixed(1)}" r="4" fill="${colAct}" stroke="var(--pd-sur)" stroke-width="2"/>`;
    s += `<line class="pd-x" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" stroke="var(--ui-tx2,#c2c8bb)" stroke-width="1" visibility="hidden"/><circle class="pd-xa" r="3.5" fill="${COL.con}" stroke="var(--pd-sur)" stroke-width="2" visibility="hidden"/><circle class="pd-xb" r="3.5" fill="${COL.sin}" stroke="var(--pd-sur)" stroke-width="2" visibility="hidden"/>`;
    s += `<rect x="${pl}" y="0" width="${iw}" height="${alto}" fill="transparent"/></svg>`;
    CH.set(String(nCh), { def, xs, con: conA, sin: sinA, lim, X, Y, pl, iw, i: xs.length - 1 });
    return s;
  }

  /* fila de un indicador: nombre, valor, cambio frente al año 1, la otra mitad del par y la serie */
  function fila(def, c) {
    const { I, I1, Bk, prop, H } = c, v = ev(def.v, I); if (v == null) return '';
    const d = def.d || 0, u = def.u || '', v1 = ev(def.v, I1), vb = Bk ? ev(def.v, Bk) : null;
    const pts = u === '%' || u === '/100', difTxt = (x) => (x > 0 ? '+' : x < 0 ? '−' : '±') + num(Math.abs(x), d) + (pts ? ' pts' : u && u !== '×' ? ' ' + u : '');
    let cambio = '';
    if (H.length < 52) cambio = '<span>Año 1 en curso</span>';
    else if (v1 != null) { const x = v - v1, igual = Math.abs(x) < Math.pow(10, -d) / 2, mejor = def.sube ? x > 0 : x < 0; cambio = `<span><i style="background:${igual ? 'var(--ui-tx3,#a3ad9a)' : mejor ? ESTADO.sano.c : ESTADO.critico.c}"></i>vs año 1: ${difTxt(x)} · ${igual ? 'igual' : mejor ? 'mejora' : 'empeora'}</span>`; }
    const otro = vb != null ? `<span>${prop ? 'Sin' : 'Con'} propuesta: ${num(vb, d)}${u === '%' ? ' %' : ''}</span>` : '';
    return `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">${esc(def.n)}</span><span class="pd-v">${num(v, d)}<small>${esc(u)}</small></span></div>`
      + `<div class="pd-d">${cambio}${otro}</div>${def.ay ? `<p class="pd-ay">${esc(def.ay)}</p>` : ''}${linea(def, c)}</div>`;
  }

  /* barras horizontales: filas {n, v, ref (año 1, raya), cmp (otra mitad del par, punto), max?, txt, tt} */
  function barras(filas, c, op = {}) {
    if (!filas.length) return '';
    filas = filas.map((f) => ({ ...f, v: fin(f.v) ?? 0, ref: fin(f.ref), cmp: fin(f.cmp), max: fin(f.max) }));
    const { W, prop } = c, h = op.alto || 15, Lw = Math.min(op.lw || 124, Math.floor(W * 0.42)), x0 = Lw + 6, x1 = W - (op.vw || 40), bw = x1 - x0;
    const max = op.max || Math.max(1e-9, ...filas.flatMap((f) => [f.v, f.ref, f.cmp, f.max]).filter((v) => v != null && isFinite(v)));
    const X = (v) => x0 + Math.max(0, Math.min(1, v / max)) * bw, colAct = prop ? COL.con : COL.sin, colOtro = prop ? COL.sin : COL.con, H = filas.length * h + (op.lim != null ? 12 : 4);
    let s = `<svg class="pd-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(op.aria || '')}">`;
    s += `<line x1="${x0}" x2="${x0}" y1="0" y2="${filas.length * h}" stroke="var(--pd-axis)"/>`;
    filas.forEach((f, i) => {
      const y = i * h, by = y + (h - 8) / 2, nom = f.n.length > 26 ? f.n.slice(0, 25) + '…' : f.n;
      s += `<g data-tt="${esc(f.tt || f.n)}"><rect x="0" y="${y}" width="${W}" height="${h}" fill="transparent"/><text class="pd-tn" x="${Lw}" y="${y + h / 2 + 3}" text-anchor="end">${esc(nom)}</text>`;
      if (f.max != null) s += `<rect x="${x0}" y="${by}" width="${(X(f.max) - x0).toFixed(1)}" height="8" fill="rgba(255,255,255,.06)"/>`;
      s += `<path class="pd-m" d="${barraH(x0, by, X(f.v || 0) - x0, 8)}" fill="${f.col || colAct}"/>`;
      if (f.ref != null) s += `<rect x="${(X(f.ref) - 1).toFixed(1)}" y="${by - 2}" width="2" height="12" fill="var(--ui-tx,#eef0ea)"/>`;
      if (f.cmp != null) s += `<circle cx="${X(f.cmp).toFixed(1)}" cy="${by + 4}" r="3" fill="${colOtro}" stroke="var(--pd-sur)" stroke-width="1.5"/>`;
      s += `<text class="pd-tv" x="${x1 + 5}" y="${y + h / 2 + 3}">${esc(f.txt != null ? f.txt : num(f.v))}</text></g>`;
    });
    if (op.lim != null) { const x = X(op.lim).toFixed(1); s += `<line x1="${x}" x2="${x}" y1="0" y2="${filas.length * h}" stroke="${COL.lim}" stroke-dasharray="3 3"/><text class="pd-tn" x="${x}" y="${H - 1}" text-anchor="middle">límite ${num(op.lim)}${op.limU || ''}</text>`; }
    return s + '</svg>';
  }

  /* columnas por año (15): segmentos apilados con 2 px de separación */
  function columnas(años, series, c, op = {}) {
    const { W } = c, alto = op.alto || 96, pl = 30, pr = 4, pt = 6, pb = 15, iw = W - pl - pr, ih = alto - pt - pb, slot = iw / 15;
    const tot = años.map((r) => (r ? r.reduce((a, x) => a + x.reduce((p, q) => p + q, 0), 0) : 0));
    const maxS = Math.max(1, ...años.flatMap((r) => (r ? r.map((x) => x.reduce((p, q) => p + q, 0)) : [0])));
    const m = marcas(0, maxS, 3), Y = (v) => pt + ih - v / (m.b || 1) * ih;
    let s = `<svg class="pd-svg" width="${W}" height="${alto}" viewBox="0 0 ${W} ${alto}" role="img" aria-label="${esc(op.aria || '')}">`;
    for (const t of m.t) s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="${t === 0 ? 'var(--pd-axis)' : 'var(--pd-grid)'}"/><text x="${pl - 4}" y="${(Y(t) + 3).toFixed(1)}" text-anchor="end">${fmtEje(t, m.paso)}</text>`;
    años.forEach((r, y) => {
      const xs = pl + y * slot; s += `<text x="${(xs + slot / 2).toFixed(1)}" y="${alto - 2}" text-anchor="middle">${y + 1}</text>`; if (!r) return;
      const nG = r.length, gw = Math.min(14, (slot - 4 - (nG - 1) * 2) / nG);
      s += `<g data-tt="${esc(op.tt(y, r))}"><rect x="${xs.toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${alto}" fill="transparent"/>`;
      r.forEach((seg, gi) => {
        const x = xs + (slot - (nG * gw + (nG - 1) * 2)) / 2 + gi * (gw + 2); let base = 0; const vis = seg.map((v, k) => [v, k]).filter(([v]) => v > 0);
        vis.forEach(([v, k], j) => { const yTop = Y(base + v), yBot = Y(base), alto2 = Math.max(0, yBot - yTop - (j > 0 ? 2 : 0)), st = series[gi][k];
          const d = j === vis.length - 1 ? barraV(x, yTop, gw, alto2, 3) : `M${x} ${yTop}h${gw}v${alto2}h${-gw}Z`;
          if (d) s += `<path class="pd-m" d="${d}" fill="${st.c}"${st.op ? ` fill-opacity="${st.op}" stroke="${st.c}" stroke-width="1" stroke-dasharray="3 2"` : ''}/>`; base += v; });
      });
      s += '</g>';
    });
    return s + '</svg>';
  }

  /* ---------- encabezado ---------- */
  function estadoGeneral(c) {
    const filas = LIMITES.map((L) => { const v = ev(L.v, c.I); return { L, v, e: estadoDe(L, v), v0: ev(L.v, c.H[0]) }; }).filter((f) => f.v != null);
    const crit = filas.filter((f) => f.e === 'critico'), ries = filas.filter((f) => f.e === 'riesgo');
    const g = T(c.I).gameOver || R.go;
    const e = g || crit.length ? 'critico' : ries.length ? 'riesgo' : 'sano';
    let txt = e === 'sano' ? 'Ningún indicador está cerca de su límite.'
      : e === 'riesgo' ? `${ries.length === 1 ? 'Cerca del límite' : ries.length + ' indicadores cerca del límite'}: ${ries.map((f) => f.L.n.toLowerCase()).join(', ')}.`
      : `${crit.length === 1 ? 'Límite superado' : crit.length + ' límites superados'}: ${crit.map((f) => f.L.n.toLowerCase()).join(', ')}.`;
    if (g && g.motivo) txt = `Game over en la semana ${g.sem}: ${g.motivo}. ` + (crit.length ? txt : '');
    return { e, txt, filas };
  }
  function pintarHero(c) {
    const box = wrap.querySelector('.pd-hero'), { I, I1, Bk, prop, H } = c, eco = ev(ECO.v, I), e1 = ev(ECO.v, I1), eb = Bk ? ev(ECO.v, Bk) : null, G = estadoGeneral(c);
    const dif = (x) => (x > 0 ? '+' : x < 0 ? '−' : '±') + num(Math.abs(x)) + ' pts';
    let h = `<div class="pd-hero-top"><span class="pd-lbl">Índice ecocéntrico · ${esc(nombreCorrida(prop).toLowerCase())}</span>${chip(G.e)}</div>`
      + `<div class="pd-big">${num(eco)}<small>/100</small></div>`
      + `<div class="pd-cmp"><div><small>Año 1${H.length < 52 ? ' (en curso)' : ' (semana 52)'}</small><b>${num(e1)}</b>${eco != null && e1 != null && H.length >= 52 ? `<em>${dif(eco - e1)}</em>` : ''}</div>`
      + `<div><small>${prop ? 'Sin' : 'Con'} propuesta, misma semana</small><b>${num(eb)}</b>${eco != null && eb != null ? `<em>${dif(eco - eb)}</em>` : ''}</div></div>`
      + `<p class="pd-verd">${esc(G.txt)}</p>` + linea(ECO, c, 84);
    if (I.eco) {
      h += `<div class="pd-sub">Las cinco partes del índice (0–100)</div>` + barras(PETALOS.map(([k, n]) => {
        const v = fin(I.eco[k]), r = I1 && I1.eco ? fin(I1.eco[k]) : null, b = Bk && Bk.eco ? fin(Bk.eco[k]) : null;
        return { n, v: v != null ? v * 100 : 0, ref: r != null && H.length >= 52 ? r * 100 : null, cmp: b != null ? b * 100 : null, txt: num(v != null ? v * 100 : null), tt: `${n}|Ahora: ${num(v * 100)} / 100|Año 1: ${num(r != null ? r * 100 : null)}|${prop ? 'Sin' : 'Con'} propuesta: ${num(b != null ? b * 100 : null)}` };
      }), c, { max: 100, aria: 'Partes del índice ecocéntrico, de 0 a 100', vw: 30 });
    }
    box.innerHTML = h;
    return G;
  }

  /* ---------- grupos ---------- */
  function pintarLimites(c, G) {
    return G.filas.map(({ L, v, e, v0 }) => {
      const W = c.W, lado = L.abajo ? 1 : -1, ini = v0 == null ? v : v0;
      let p = (ini - v) * lado / Math.max(1e-9, (ini - L.u) * lado); if (!isFinite(p)) p = e === 'critico' ? 1 : 0; p = Math.max(0, Math.min(1, e === 'critico' ? 1 : p));
      const marg = (v - L.u) * lado, col = ESTADO[e].c;
      return `<div class="pd-lim" data-tt="${esc(`${L.n}|Ahora: ${num(v, L.d)} ${L.un}|Inicio: ${num(ini, L.d)} ${L.un}|Límite: ${num(L.u, L.d)} ${L.un} (${L.txt})|Recorrido hacia el límite: ${num(p * 100)} %`)}"><div class="pd-ih"><span class="pd-n">${esc(L.n)}</span>${chip(e)}</div>`
        + `<svg class="pd-svg" width="${W}" height="10" viewBox="0 0 ${W} 10" aria-hidden="true"><rect x="0" y="2" width="${W}" height="6" rx="3" fill="${col}" fill-opacity=".18"/><path class="pd-m" d="${barraH(0, 2, Math.max(4, p * W), 6)}" fill="${col}"/><rect x="${W - 2}" y="0" width="2" height="10" fill="${COL.lim}"/></svg>`
        + `<div class="pd-d"><span>Ahora ${num(v, L.d)} ${L.un}</span><span>límite ${num(L.u, L.d)} ${L.un}</span><span>margen ${marg >= 0 ? num(marg, L.d) : '−' + num(-marg, L.d)} ${L.un === '%' ? 'pts' : L.un}</span>${L.go && c.go ? '<span class="pd-tag">detiene la simulación</span>' : '<span class="pd-tag">límite de referencia</span>'}</div></div>`;
    }).join('') + `<p class="pd-ay">La barra mide cuánto del camino entre el valor inicial y el límite ya se recorrió. Crítico = límite superado; en riesgo = a dos tercios del camino (los mismos umbrales del modelo). Game over: 4 semanas seguidas fuera del límite.</p>`;
  }
  function extra(k, c) {
    const { I, I1, Bk, prop, H, B } = c, otro = prop ? 'Sin' : 'Con';
    if (k === 'especies') {
      const esp = T(I).especies || [], e1 = T(I1).especies || [], eb = Bk ? T(Bk).especies || [] : [];
      const filas = esp.map((s, i) => ({ n: s.n, v: s.valor, ref: H.length >= 52 && e1[i] ? e1[i].valor : null, cmp: eb[i] ? eb[i].valor : null, txt: num(s.valor),
        tt: `${s.n}|Ahora: ${num(s.valor)} parches|Año 1: ${num(e1[i] && e1[i].valor)}|${otro} propuesta: ${num(eb[i] && eb[i].valor)}` })).sort((a, b) => b.v - a.v);
      return filas.length ? `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">Especies por parches ocupados</span><span class="pd-v">${filas.filter((f) => f.v > 0).length}<small>de ${filas.length}</small></span></div><p class="pd-ay">Barra = parches ocupados ahora; raya = año 1; punto = ${otro.toLowerCase()} propuesta.</p>${barras(filas, c, { aria: 'Parches ocupados por especie', alto: 14 })}</div>` : '';
    }
    if (k === 'tipos') {
      cargarRed(); const a = tiposActivos(I), r = H.length >= 52 ? tiposActivos(I1) : null, b = Bk ? tiposActivos(Bk) : null; if (!a) return '';
      const filas = RED_I.tipos.map((n, t) => ({ n, v: a[t], ref: r ? r[t] : null, cmp: b ? b[t] : null, max: RED_I.total[t], txt: `${a[t]}/${RED_I.total[t]}`,
        tt: `${n}|Activas ahora: ${a[t]} de ${RED_I.total[t]}|Año 1: ${r ? r[t] : '—'}|${otro} propuesta: ${b ? b[t] : '—'}` })).sort((x, y) => y.v - x.v);
      return `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">Relaciones de la red por tipo</span><span class="pd-v">${a.reduce((p, q) => p + q, 0)}<small>de ${RED_I.enl.length}</small></span></div><p class="pd-ay">Relaciones de la red biótica cuyas especies de fauna siguen presentes en Kennedy (la flora se cuenta presente). Fondo = todas las del inventario.</p>${barras(filas, c, { aria: 'Relaciones activas por tipo', vw: 46 })}</div>`;
    }
    if (k === 'causas') {
      const nA = Math.min(15, Math.ceil(H.length / 52)), años = []; let prev = { colision: 0, atropello: 0, ruido: 0, hambre_habitat: 0 };
      for (let y = 0; y < 15; y++) { if (y >= nA) { años.push(null); continue; } const J = H[Math.min(H.length - 1, (y + 1) * 52 - 1)], pc = J.muertes && J.muertes.porCausa; if (!pc) { años.push(null); continue; }
        años.push([CAUSAS.map(([k2]) => Math.max(0, (pc[k2] || 0) - (prev[k2] || 0)))]); prev = { ...pc }; }
      const tot = I.muertes ? I.muertes.porCausa : {}, totB = Bk && Bk.muertes ? Bk.muertes.total : null;
      return `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">Muertes por causa y año</span><span class="pd-v">${num(I.muertes && I.muertes.total)}<small>animales</small></span></div>`
        + `<div class="pd-ley">${CAUSAS.map(([k2, n, col]) => `<span>${clave(col, 'barra')}${esc(n)} <b>${num(tot[k2])}</b></span>`).join('')}</div>`
        + columnas(años, [CAUSAS.map(([, , col]) => ({ c: col }))], c, { aria: 'Muertes de fauna por causa en cada año', tt: (y, r) => [`Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}`, ...CAUSAS.map(([, n], i) => `${n}: ${num(r[0][i])}`), `Total: ${num(r[0].reduce((p, q) => p + q, 0))}`].join('|') })
        + (totB != null ? `<div class="pd-d"><span>${otro} propuesta, misma semana: ${num(totB)} muertes acumuladas</span></div>` : '') + '</div>';
    }
    if (k === 'atropAño') {
      const A = (I.atropellos && I.atropellos.porAño) || [], Ab = Bk && Bk.atropellos ? Bk.atropellos.porAño || [] : [], nA = Math.min(15, Math.ceil(H.length / 52));
      const conA = prop ? A : Ab, sinA = prop ? Ab : A, años = []; for (let y = 0; y < 15; y++) años.push(y < nA ? [[conA[y] || 0], [sinA[y] || 0]] : null);
      return `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">Atropellos por año</span><span class="pd-v">${num(I.atropellos && I.atropellos.total)}<small>en total</small></span></div>`
        + `<div class="pd-ley"><span>${clave(COL.con, 'barra')}Con propuesta</span><span><svg width="10" height="8" aria-hidden="true"><rect x=".5" y="1.5" width="9" height="5" rx="1.5" fill="${COL.sin}" fill-opacity=".35" stroke="${COL.sin}" stroke-dasharray="2 1.5"/></svg>Sin propuesta</span></div>`
        + columnas(años, [[{ c: COL.con }], [{ c: COL.sin, op: 0.35 }]], c, { aria: 'Atropellos de fauna por año, con y sin propuesta', tt: (y, r) => `Año ${y + 1}${y === nA - 1 ? ' (en curso)' : ''}|Con propuesta: ${num(r[0][0])}|Sin propuesta: ${num(r[1][0])}` }) + '</div>';
    }
    if (k === 'sectores') {
      const s = T(I).sectores || [], sb = Bk ? T(Bk).sectores || [] : [], s1 = T(I1).sectores || [];
      const filas = s.map((x, i) => ({ n: x.n, v: x.valor, ref: H.length >= 52 && s1[i] ? s1[i].valor : null, cmp: sb[i] ? sb[i].valor : null, txt: num(x.valor) + ' %',
        tt: `${x.n}|Recibe: ${num(x.valor)} % de su demanda|Demanda: ${num(x.demanda, 1)} t/día|Año 1: ${num(s1[i] && s1[i].valor)} %|${otro} propuesta: ${num(sb[i] && sb[i].valor)} %` }));
      const todos = filas.filter((f) => isFinite(f.v)).sort((a, b) => a.v - b.v), peores = todos.slice(0, 10);
      return peores.length ? `<div class="pd-ind"><div class="pd-ih"><span class="pd-n">Sectores con menos cobertura</span><span class="pd-v">${todos.filter((f) => f.v < 80).length}<small>de ${todos.length} bajo 80 %</small></span></div><p class="pd-ay">Los ${peores.length} sectores (de ${todos.length}) que reciben el menor % de su demanda de alimentos. Raya = año 1; punto = ${otro.toLowerCase()} propuesta.</p>${barras(peores, c, { aria: 'Sectores con menor cobertura de alimentos', lim: 80, limU: ' %', max: Math.max(100, ...peores.map((f) => Math.max(f.v, isFinite(f.cmp) ? f.cmp : 0))), vw: 40 })}</div>` : '';
    }
    return '';
  }
  function pintarGrupo(d, c, G) {
    const id = d.dataset.g, b = d.querySelector('.pd-b'), cnt = d.querySelector('.pd-cnt');
    if (id === 'lim') {
      G = G || estadoGeneral(c); const n = G.filas.filter((f) => f.e !== 'sano').length;
      cnt.innerHTML = n ? `${icono(G.filas.some((f) => f.e === 'critico') ? 'critico' : 'riesgo')}${n} de ${G.filas.length} fuera de rango` : `${icono('sano')}${G.filas.length} en rango`;
      if (d.open) b.innerHTML = pintarLimites(c, G); return;
    }
    const g = GRUPOS.find((x) => x.id === id), vis = g.ind.filter((x) => ev(x.v, c.I) != null);
    cnt.textContent = `${vis.length + (g.extra || []).length + (g.pre || []).length} gráficas`;
    if (!d.open) return;
    b.innerHTML = (g.pre || []).map((k) => extra(k, c)).join('') + vis.map((x) => fila(x, c)).join('') + (g.extra || []).map((k) => extra(k, c)).join('');
  }

  /* ---------- ciclo: ≤ 2 veces por segundo, solo si avanzaron 4 semanas ---------- */
  function pintar() {
    if (simHecho !== R.sim) { esqueleto(); simHecho = R.sim; nHecho = -1; }
    const H = R.hist;
    if (!R.sim || !H || !H.length) {
      wrap.querySelector('.pd-hero').innerHTML = `<p class="pd-vacio">${R.sim ? 'Calculando la primera semana…' : 'Escoge un escenario o dale play: aquí aparecen todas las mediciones de la simulación, semana a semana.'}</p>`;
      wrap.querySelectorAll('details.pd-g').forEach((d) => { d.querySelector('.pd-b').innerHTML = ''; d.querySelector('.pd-cnt').textContent = ''; });
      wrap.querySelector('.pd-sem').textContent = ''; nHecho = 0; return;
    }
    nCh = 0; CH.clear(); const c = ctxDe(); ancho = c.W; api.n++;
    wrap.querySelector('.pd-sem').textContent = `Semana ${c.I.sem} · año ${Math.min(15, Math.floor((c.I.sem - 1) / 52) + 1)} de 15`;
    const G = pintarHero(c), gen = ++generacion;
    /* un grupo por tarea ociosa: con todo abierto el dibujo (~80 ms) se reparte en trozos cortos y no traba el 3D */
    const cola = [...wrap.querySelectorAll('details.pd-g')], ocio = window.requestIdleCallback || ((f) => setTimeout(f, 16));
    const sig = () => { if (gen !== generacion) return; const d = cola.shift(); if (!d) return; if (d.isConnected) { try { pintarGrupo(d, c, G); } catch (e) { console.warn('panel de datos:', e); } } ocio(sig, { timeout: 300 }); };
    pintarGrupo(cola.shift(), c, G); ocio(sig, { timeout: 300 });
    nHecho = H.length; H0 = H; nBase = (R.ecoBase || R.base || []).length; goHecho = R.go;
    if (enfoque) { const s = wrap.querySelector(`svg[data-c="${enfoque.id}"]`); if (s) mostrarLinea(s, enfoque.i); else ocultar(); }
  }
  function tick() {
    if (document.hidden) return;
    const M = getM(); if (!M) return;
    if (!montar()) return;
    if (!root.isConnected || root.getClientRects().length === 0) return; // panel cerrado (cajón en celular): no se dibuja
    const H = R.hist || [], nb = (R.ecoBase || R.base || []).length, ahora = performance.now();
    const cambio = simHecho !== R.sim || H !== H0 || sucio || R.go !== goHecho || H.length - nHecho >= 4 || (H.length !== nHecho && ahora - ultimo > 2000)
      || (nb !== nBase && (nb >= H.length) !== (nBase >= H.length));
    if (!cambio) return;
    sucio = false; ultimo = ahora;
    try { pintar(); } catch (e) { console.warn('panel de datos:', e); }
  }
  setInterval(tick, 500);

  /* ---------- tooltip ---------- */
  function ponerTip(html, x, y) {
    tip.innerHTML = html; tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    let l = x + 14, t = y - h - 10; if (l + w > vw - 8) l = x - w - 14; if (l < 8) l = 8; if (t < 8) t = y + 16; if (t + h > vh - 8) t = vh - h - 8;
    tip.style.left = l + 'px'; tip.style.top = t + 'px';
  }
  function ocultar() { tip.style.display = 'none'; enfoque = null; wrap && wrap.querySelectorAll('.pd-x,.pd-xa,.pd-xb').forEach((e) => e.setAttribute('visibility', 'hidden')); }
  function mostrarLinea(svg, i, cx, cy) {
    const D = CH.get(svg.dataset.c); if (!D) return; i = Math.max(0, Math.min(D.xs.length - 1, i)); D.i = i; enfoque = { id: svg.dataset.c, i };
    const s = D.xs[i], x = D.X(s), d = D.def.d || 0, u = D.def.u || '', f = (v) => (v == null ? '—' : num(v, d) + (u ? ' ' + u : ''));
    const cr = svg.querySelector('.pd-x'); cr.setAttribute('x1', x); cr.setAttribute('x2', x); cr.setAttribute('visibility', 'visible');
    for (const [cl, v] of [['.pd-xa', D.con[i]], ['.pd-xb', D.sin[i]]]) { const e = svg.querySelector(cl); if (v == null) e.setAttribute('visibility', 'hidden'); else { e.setAttribute('cx', x); e.setAttribute('cy', D.Y(v)); e.setAttribute('visibility', 'visible'); } }
    const r = svg.getBoundingClientRect();
    ponerTip(`<div class="t">${esc(D.def.n)} · semana ${s} · año ${Math.floor((s - 1) / 52) + 1}</div>`
      + `<div class="r">${clave(COL.con)}<b>${f(D.con[i])}</b><span>con propuesta</span></div><div class="r">${clave(COL.sin, 'pun')}<b>${f(D.sin[i])}</b><span>sin propuesta</span></div>`
      + (D.lim != null ? `<div class="r">${clave(COL.lim, 'pun')}<b>${f(D.lim)}</b><span>límite</span></div>` : ''), cx != null ? cx : r.left + x, cy != null ? cy : r.top + 10);
  }
  function mover(e) {
    const svg = e.target.closest && e.target.closest('svg[data-c]');
    if (svg) { const D = CH.get(svg.dataset.c); if (!D) return; const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
      if (px < D.pl - 6) { ocultar(); return; }
      let best = 0, bd = 1e9; for (let i = 0; i < D.xs.length; i++) { const dd = Math.abs(D.X(D.xs[i]) - px); if (dd < bd) { bd = dd; best = i; } }
      mostrarLinea(svg, best, e.clientX, e.clientY); return; }
    const g = e.target.closest && e.target.closest('[data-tt]');
    if (g) { enfoque = null; const [t0, ...rs] = g.getAttribute('data-tt').split('|'); ponerTip(`<div class="t">${esc(t0)}</div>${rs.map((x) => `<div class="r">${esc(x)}</div>`).join('')}`, e.clientX, e.clientY); return; }
    ocultar();
  }
  function enfocar(e) { const svg = e.target.closest && e.target.closest('svg[data-c]'); if (svg) { const D = CH.get(svg.dataset.c); if (D) mostrarLinea(svg, D.xs.length - 1); } }
  function teclas(e) {
    const svg = e.target.closest && e.target.closest('svg[data-c]'); if (!svg) return; const D = CH.get(svg.dataset.c); if (!D) return;
    const k = { ArrowLeft: -1, ArrowRight: 1, PageDown: -13, PageUp: 13, Home: -1e4, End: 1e4 }[e.key]; if (!k) { if (e.key === 'Escape') ocultar(); return; }
    e.preventDefault(); mostrarLinea(svg, D.i + k);
  }
  const api = { n: 0, pintar: () => { sucio = true; ultimo = 0; nHecho = -1; tick(); } }; // n = redibujos hechos (diagnóstico)
  window.KEN_PD = api;
  return api;
}
