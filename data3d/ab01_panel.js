/* ============ SIMULACIÓN 01 EN EL PANEL IZQUIERDO (acordeón de limpio.js, dentro de #su-der de sim_ui.js) ============
   v5 (docs/sim01_abastecimiento_v5.md, 2026-11-26):
   · ALERTA arriba del todo, con degradé (paleta URBIA), sin tapar la franja de eventos (feed_eventos.js va debajo).
   · «Población de Kennedy» y «Demanda alimentaria» LIGADAS y se mueven solas con los años (crecimiento por defecto 0,5 %/año).
   · «Ingreso a Corabastos» se mueve solo (U.ing de ab01Paso: sube con lo pedido, baja con lo que compran directo los mercados) y muestra
     sus t/día; si se arrastra, la región manda esa proporción de lo pedido desde esa semana. Debajo, el límite fijo de Corabastos: 14.000 t.
   · GAME OVER: Déficit alimentario · Límite de abastecimiento de Corabastos · Residuos sin recoger (valor frente a su límite, n/4 semanas).
   · Botón ƒx «Fórmulas»: todas las fórmulas del bloque y de las gráficas con los valores de la semana.
   · CINCO GRÁFICAS, una pregunta cada una, paleta URBIA (violeta, coral, turquesa, dorado, lima suave) y valores rotulados al final.
   Datos: R.hist de sim_ui.js (I.abasto.ab01, I.residuosK de simulaciones12.js) y la otra mitad del par (R.ecoBase). Nada se calcula aquí
   salvo el enlace población ↔ demanda y la conversión del deslizador de ingreso (las mismas fórmulas del modelo). */
const KG = 0.951, P0 = 1034838, CAP = 14000, RES_GO = 296, ING0 = 6460;
const ICO_ALERTA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18.5 17h-17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1.05" fill="currentColor"/></svg>';
const ICO_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICO_FX = '<svg viewBox="0 0 22 16" aria-hidden="true"><path d="M7.6 2.2c-1.6-.3-2.6.5-2.9 2.1L3.1 13.2c-.3 1.4-1.1 1.9-2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.6 6h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 6l7 7M18 6l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CAPAS = [
  { k: 'bodegas', n: 'Bodegas', d: 'Naves de vidrio; el líquido es la parte del inventario de Corabastos que guarda cada una frente a su tope', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><rect x="2" y="1" width="14" height="10" rx="1.5" fill="none" stroke="rgba(220,240,255,.75)"/><rect x="3" y="6" width="12" height="4.2" rx="1" fill="#fbbf24"/></svg>' },
  { k: 'residuos', n: 'Residuos', d: 'La Vaca se degrada: árboles e interacciones bajan con los residuos sin recoger', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 8c3-2 5 1 8-1s5 1 8-1v4H1z" fill="#6b4f2e"/><circle cx="5" cy="4.5" r="2.6" fill="#2f7d4a"/><path d="M12 6V3.5" stroke="#8d7a63" stroke-width="1.6" stroke-linecap="round"/></svg>' },
  { k: 'trafico', n: 'Tráfico', d: 'Vías por congestión (verde → rojo) y vehículos de surtido que ahora van a los mercados (morados)', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6h16" stroke="rgba(255,255,255,.25)" stroke-width="4"/><rect x="2" y="4.6" width="4" height="2.8" rx="1.2" fill="#4ade80"/><rect x="8" y="4.6" width="4" height="2.8" rx="1.2" fill="#fbbf24"/><rect x="13.5" y="4.6" width="3" height="2.8" rx="1.2" fill="#ef4444"/></svg>' }];
/* paleta URBIA: violeta (#304ffe / #7d6bff), coral #f2694a, turquesa #4fd1c5, dorado, lima suave */
const COL = { vio: '#7d6bff', vio2: '#304ffe', cor: '#f2694a', tur: '#4fd1c5', oro: '#f5c451', lim: '#c9f27a', ok: '#c9f27a', amb: '#f5c451', mal: '#f2694a', txt: '#eef0ff' };
const GRAF = [['pob', '¿Cuánta gente hay que alimentar?'], ['dis', '¿Alcanza la comida?'], ['cap', '¿Se acerca Corabastos a su límite?'], ['sec', '¿Qué sector recibe menos?'], ['cmp', '¿Qué cambia con la propuesta?']];
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const CSS = `
#ab-alerta{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:46;display:flex;gap:9px;align-items:center;max-width:calc(100vw - 32px);white-space:nowrap;padding:6px 6px 6px 12px;border-radius:12px;
  background:linear-gradient(100deg,#304ffe 0%,#3d8fe6 55%,#4fd1c5 100%);border:1px solid rgba(255,255,255,.28);box-shadow:0 6px 22px rgba(20,40,110,.35);text-shadow:0 1px 2px rgba(10,20,60,.45);color:#fff;overflow:hidden;font:400 11.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif)}
#ab-alerta[hidden]{display:none}#ab-alerta>svg{width:16px;height:16px;flex:none;color:#fff;animation:abIco 1.1s ease-in-out infinite}
#ab-alerta span{font:500 12px var(--ui-sans,Inter,sans-serif);color:#fff;overflow:hidden;text-overflow:ellipsis}
#ab-alerta b{font:600 10px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85)}
#ab-alerta strong{font:600 17px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff}
#ab-alerta button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;color:#fff}
#ab-alerta button:hover{background:rgba(255,255,255,.18)} #ab-alerta button svg{width:12px;height:12px}
#ab-alerta.go{background:linear-gradient(100deg,#7d1f3a 0%,#c63a3a 55%,#f2694a 100%);padding-right:12px}
#ab-alerta .go4{font:400 10.5px var(--ui-sans,Inter,sans-serif);opacity:.85}
@media (max-width:760px){#ab-alerta{top:6px;max-width:calc(100vw - 16px)}#ab-alerta span{max-width:38vw}}
@keyframes abIco{0%,100%{opacity:1}50%{opacity:.55}}
@media(prefers-reduced-motion:reduce){#ab-alerta>svg{animation:none}}
#su-der .su-sl.ab-lig label{flex-wrap:wrap}#su-der .su-sl.ab-lig label small{order:3;flex-basis:100%;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.55;margin:1px 0 0}
#su-der .su-sl.ab-lig{position:relative;padding-left:9px} #su-der .su-sl.ab-lig::before{content:"";position:absolute;left:0;top:4px;bottom:2px;width:2px;border-radius:2px;background:${COL.vio};opacity:.8}
#su-der .su-sl.ab-auto{position:relative;padding-left:9px} #su-der .su-sl.ab-auto::before{content:"";position:absolute;left:0;top:4px;bottom:2px;width:2px;border-radius:2px;background:${COL.tur};opacity:.8}
#su-der .ab-lim{margin:3px 0 0;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)} #su-der .ab-lim b{font:600 12px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:${COL.oro}}
#su-der .ab-autob{all:unset;cursor:pointer;margin-left:4px;padding:1px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.22);font:500 10px/1.4 var(--ui-sans,Inter,sans-serif);color:#fff} #su-der .ab-autob[hidden]{display:none} #su-der .ab-autob:focus-visible{outline:2px solid ${COL.tur}}
#ab-fx{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin:8px 0 2px;padding:5px 10px;border-radius:9px;border:1px solid rgba(125,107,255,.55);background:rgba(125,107,255,.14);font:600 11px/1 var(--ui-sans,Inter,sans-serif);color:#e8e5ff}
#ab-fx svg{width:18px;height:13px} #ab-fx:hover{background:rgba(125,107,255,.26)} #ab-fx:focus-visible{outline:2px solid ${COL.vio};outline-offset:2px}
@media (pointer:coarse){#ab-fx{padding:9px 12px}}
#ab-fxp{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 32px));max-height:min(80dvh,720px);overflow:auto;padding:16px 18px 14px;border-radius:16px;
  background:rgba(14,16,30,.86);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid rgba(169,156,255,.28);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#eef0ff;font:400 12px/1.45 var(--ui-sans,Inter,sans-serif)}
#ab-fxp[hidden]{display:none} #ab-fxp h3{margin:0 0 2px;font:500 20px/1.1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;letter-spacing:.04em;text-transform:uppercase}
#ab-fxp>p{margin:0 0 10px;color:rgba(238,240,255,.65);font-size:11px} #ab-fxp .x{all:unset;cursor:pointer;position:absolute;top:10px;right:10px;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:#fff} #ab-fxp .x:hover{background:rgba(255,255,255,.1)} #ab-fxp .x svg{width:13px;height:13px}
#ab-fxp h4{margin:12px 0 4px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:${COL.tur}}
#ab-fxp dl{margin:0;display:grid;gap:6px} #ab-fxp dl>div{padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
#ab-fxp dt{font:600 11.5px/1.3 var(--ui-sans,Inter,sans-serif);color:#fff;display:flex;justify-content:space-between;gap:8px} #ab-fxp dt b{font:600 15px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:${COL.lim};white-space:nowrap}
#ab-fxp dd{margin:2px 0 0;font:400 11px/1.45 var(--ui-mono,'JetBrains Mono',monospace);color:rgba(238,240,255,.72)} #ab-fxp dd i{font-style:normal;color:${COL.oro}}
#ab-go{margin:8px 0 6px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#ab-go h6,#ab-graf h6,#ab-capas h6{margin:0 0 6px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#ab-go .r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;align-items:center;font:400 10.5px/1.25 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);padding:3px 0}
#ab-go .r i{grid-column:1 / -1;position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.1)} #ab-go .r i u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:${COL.ok}}
#ab-go .r i s{position:absolute;top:-3px;bottom:-3px;width:2px;background:${COL.mal}} #ab-go .r b{font:600 13px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff;white-space:nowrap}
#ab-go .r b em{font-style:normal;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.65;margin-left:3px}
#ab-go .r.mal b{color:#ff9b85} #ab-go .r.mal span{color:#ffb8a8}
#ab-go .r.go{outline:1.5px solid ${COL.mal};outline-offset:2px;border-radius:4px;animation:abGo 1s ease-in-out infinite}#ab-go .r.go span{color:#ff9b85;font-weight:600}
@keyframes abGo{0%,100%{background:rgba(242,105,74,.22)}50%{background:rgba(242,105,74,.04)}}
#ab-graf{margin:8px 0 6px;padding:9px 10px 8px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#ab-graf .tabs{display:flex;gap:3px;margin:0 0 6px} #ab-graf .tabs button{all:unset;box-sizing:border-box;cursor:pointer;flex:1;text-align:center;padding:4px 0;border-radius:7px;border:1px solid rgba(255,255,255,.12);font:600 11px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:var(--ui-tx2,#c9cfc4)}
#ab-graf .tabs button[aria-selected="true"]{background:rgba(125,107,255,.22);border-color:rgba(125,107,255,.7);color:#fff} #ab-graf .tabs button:focus-visible{outline:2px solid ${COL.vio};outline-offset:1px}
@media (pointer:coarse){#ab-graf .tabs button{padding:8px 0}}
#ab-graf h5{margin:0 0 1px;font:600 12.5px/1.25 var(--ui-sans,Inter,sans-serif);color:#f4f3ff} #ab-graf p{margin:0 0 4px;font:400 10px/1.35 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#ab-graf svg{display:block;width:100%;height:auto;overflow:visible}
#ab-graf svg text{font:500 8px var(--ui-sans,Inter,sans-serif);fill:rgba(238,240,255,.55);font-variant-numeric:tabular-nums}
#ab-graf svg text.v{font:600 10.5px 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;fill:#fff} #ab-graf svg text.n{font:500 8px var(--ui-sans,Inter,sans-serif)}
#ab-graf ul{list-style:none;margin:5px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:2px 10px}
#su-der #ab-graf li{display:inline-flex;gap:5px;align-items:center;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);background:none;border:0;border-radius:0;padding:0;min-height:0}
#su-der #ab-graf li:hover{background:none} #su-der #ab-graf li::before{display:none}
#su-der #ab-graf li i{display:block;width:14px;height:0;border-top:2px solid} #su-der #ab-graf li i.d{border-top-style:dashed} #su-der #ab-graf li i.b{height:8px;border:0;border-radius:2px}
#su-der #ab-graf li b{font:600 13px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff}
#ab-capas{margin:8px 0 4px} #ab-capas div{display:flex;flex-wrap:wrap;gap:4px}
#ab-capas button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);font:500 10.5px/1.1 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);flex:1 1 auto;justify-content:center}
#ab-capas button svg{flex:none;width:15px;height:10px} #ab-capas button span{white-space:nowrap}
@media (pointer:coarse){#ab-capas button{padding:8px 8px}}
#ab-capas button[aria-pressed="true"]{background:var(--ui-acc-bg,rgba(212,236,176,.14));border-color:rgba(212,236,176,.45);color:var(--ui-tx,#f1f3ee)}
#ab-capas button:focus-visible{outline:2px solid var(--ui-acc,#d4ecb0);outline-offset:1px}`;
export function htmlArriba() { return ''; }
/* ALERTA arriba del todo (escenario ficticio): la franja de eventos (#su-feed) se corre para quedar debajo */
function alertaArriba() { let a = document.getElementById('ab-alerta');
  if (!a) { a = document.createElement('div'); a.id = 'ab-alerta'; a.setAttribute('role', 'status'); a.title = 'Escenario ficticio: llegan familias nuevas a Kennedy y a la región';
    a.innerHTML = `${ICO_ALERTA}<b>Alerta</b><span>Sube la demanda alimentaria</span><strong data-ab="alerta">+0 %</strong><button type="button" aria-label="Cerrar la alerta">${ICO_X}</button>`; document.body.appendChild(a);
    a.querySelector('button').onclick = () => { a.hidden = true; feedBajo(); }; }
  feedBajo(); return a; }
/* la alerta va arriba, justo debajo del selector de escenario (#lp-esc), y la franja de eventos (#su-feed) baja para quedar debajo de la alerta: las dos se ven */
function feedBajo() { const f = document.getElementById('su-feed'), a = document.getElementById('ab-alerta'), e = document.getElementById('lp-esc'), on = !!(a && !a.hidden);
  if (a && on) { const r = e && e.getClientRects().length ? e.getBoundingClientRect() : null; const top = r && r.bottom > 0 && r.bottom < 140 ? Math.round(r.bottom + 6) : 8, left = r ? Math.round(r.left + r.width / 2) : null;
    if (a.style.top !== top + 'px') a.style.top = top + 'px'; const L = left != null && innerWidth > 760 ? left + 'px' : '50%'; if (a.style.left !== L) a.style.left = L; }
  if (f) { const t = on ? Math.round(a.getBoundingClientRect().bottom + 8) + 'px' : ''; if (f.style.top !== t) f.style.top = t; } }
addEventListener('resize', () => feedBajo());
export function quitar() { const a = document.getElementById('ab-alerta'); if (a) a.remove(); feedBajo(); const p = document.getElementById('ab-fxp'); if (p) p.remove(); GO = null; }
/* GAME OVER con su causa: la franja de arriba cambia de color con la regla y su valor; en el panel la fila de esa regla titila */
let GO = null;
const GO_FILA = { deficit: 'def', saturacion: 'sat', residuosK: 'res' };
const GO_N = { deficit: 'Déficit alimentario', saturacion: 'Límite de abastecimiento de Corabastos', residuosK: 'Residuos sin recoger', trafico: 'Tráfico', ruido: 'Ruido', habitat: 'Hábitat', fauna: 'Fauna', humedal: 'Humedales', residuos: 'Basura', abasto: 'Abasto' };
function goValor(g) { if (g.regla === 'deficit') return `${g.lugar.replace(/^Sector /, '')} · ${nf(g.valor, 1)} % (mín. 80 %)`; if (g.regla === 'saturacion') return `${nf(g.valor)} % de su límite`;
  if (g.regla === 'residuosK') return `${nf(g.valor)} t/día (máx. ${RES_GO})`; return ''; }
export function gameOver(g) { GO = g || null; const a = alertaArriba(); a.hidden = false; a.classList.toggle('go', !!GO); feedBajo();
  if (GO) a.innerHTML = `${ICO_ALERTA}<b>Game over · año ${Math.floor((GO.sem - 1) / 52) + 1}</b><span>${GO_N[GO.regla] || GO.regla}</span><strong>${goValor(GO)}</strong><span class="go4">4 semanas seguidas</span>`;
  const der = document.getElementById('su-der'); if (der) marcarGo(der); }
function marcarGo(der) { const k = GO && GO_FILA[GO.regla]; der.querySelectorAll('#ab-go .r').forEach(e => e.classList.toggle('go', !!k && e.dataset.go === k));
  const h = der.querySelector('#ab-go h6'); if (h) h.textContent = GO ? `Game over: ${GO_N[GO.regla] || GO.regla}` : 'Game over · límites'; }
export function htmlAbajo(prop) {
  return `<button type="button" id="ab-fx" aria-haspopup="dialog" title="Cómo se calcula cada variable y cada gráfica, con los valores de esta semana">${ICO_FX}<span>Fórmulas</span></button>
    <div id="ab-go" aria-live="polite"><h6 title="4 semanas seguidas pasando un límite = game over. Mismos límites con y sin propuesta.">Game over · límites</h6>
      <div class="r" data-go="def" title="Sector de Kennedy peor servido: recibido ÷ demanda. Límite: 80 %"><span>Déficit alimentario</span><b>—</b><i><u></u><s style="left:80%"></s></i></div>
      <div class="r" data-go="sat" title="Inventario de Corabastos ÷ su capacidad: 14.000 t de referencia; con propuesta, la de las naves que quedan. Límite: 100 %"><span>Límite de abastecimiento de Corabastos</span><b>—</b><i><u></u><s style="left:${(100 / 1.3).toFixed(1)}%"></s></i></div>
      <div class="r" data-go="res" title="Residuos de Kennedy sin recoger. Límite: 296 t/día (el doble de hoy)"><span>Residuos sin recoger</span><b>—</b><i><u></u><s style="left:${(100 / 1.3).toFixed(1)}%"></s></i></div></div>
    <div id="ab-graf"><h6>Gráficas</h6><div class="tabs" role="tablist">${GRAF.map(([k, n], i) => `<button type="button" role="tab" data-g="${k}" aria-selected="${i ? 'false' : 'true'}" title="${n}">${i + 1}</button>`).join('')}</div>
      <h5 data-ab="t"></h5><p data-ab="s"></p><svg viewBox="0 0 260 132" role="img" aria-label="Gráfica de la simulación 01"></svg><ul data-ab="ley"></ul></div>
    <div id="ab-capas"><h6>Capas de la simulación 01</h6><div>${CAPAS.map(c => `<button type="button" data-capa="${c.k}" aria-pressed="true" title="${c.d}">${c.sw}<span>${c.n}</span></button>`).join('')}</div></div>`;
}
let VISTA = 'pob';
/* opc = { R, recalcular }: el estado de sim_ui.js y su función que vuelve a correr el modelo hasta la semana actual */
export function montar(der, opc = {}) {
  if (!document.getElementById('ab01-css')) { const st = document.createElement('style'); st.id = 'ab01-css'; st.textContent = CSS; document.head.appendChild(st); }
  else document.getElementById('ab01-css').textContent = CSS;
  alertaArriba();
  der.querySelectorAll('#ab-capas [data-capa]').forEach(b => { const C = window.KEN_AB01C, k = b.dataset.capa; if (C) b.setAttribute('aria-pressed', !!C.estado[k]);
    b.onclick = () => { const A = window.KEN_AB01C, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); if (A) A.capa(k, on); else (window.KEN_AB01_PEND || (window.KEN_AB01_PEND = {}))[k] = on; }; });
  der.querySelectorAll('#ab-graf [data-g]').forEach(b => b.onclick = () => { VISTA = b.dataset.g; der.querySelectorAll('#ab-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x === b)); if (der._abRepinta) der._abRepinta(); });
  der.querySelectorAll('#ab-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x.dataset.g === VISTA));
  const fx = der.querySelector('#ab-fx'); if (fx) fx.onclick = () => abrirFx(der);
  enlazar(der, opc);
}
/* ---------- población ↔ demanda, ingreso a Corabastos ---------- */
function enlazar(der, { R, recalcular }) {
  if (!R) return; der._abR = R;
  const iP = der.querySelector('input[data-k="pobK"]'), iD = der.querySelector('input[data-k="demT"]'), iC = der.querySelector('input[data-k="demanda"]'), iV = der.querySelector('input[data-k="volumen"]');
  const arr = (on) => { der._abArrastra = on; };
  if (iV) { const box = iV.closest('.su-sl'); box.classList.add('ab-auto');
    if (!box.querySelector('.ab-lim')) box.insertAdjacentHTML('beforeend', '<p class="ab-lim">Se mueve solo con la comida que se pide. Límite de Corabastos: <b>14.000 t</b> de inventario (capacidad de referencia, no cambia con las huertas ni con los mercados). Con propuesta baja con las naves que se quitan (años 1 a 8): al final 7.103 t.</p>');
    const etqV = (pos) => { const b = der.querySelector('[data-v="volumen"]'); if (b) b.textContent = nf(pos * ING0 / 100) + ' t/día'; iV.style.setProperty('--p', Math.max(0, Math.min(100, (pos - iV.min) / (iV.max - iV.min) * 100)) + '%'); };
    der._abEtqV = etqV;
    iV.addEventListener('pointerdown', () => { der._abArrV = true; }); iV.addEventListener('blur', () => { der._abArrV = false; });
    iV.oninput = () => { der._abArrV = true; etqV(+iV.value); };
    /* posición = ingreso de la semana ÷ 6.460; el modelo usa el factor «Ingreso» sobre lo pedido: factor nuevo = factor × posición elegida ÷ posición actual */
    iV.onchange = () => { const L = R.hist[R.hist.length - 1], U = X(L), vol = U ? U.vol * 100 : (R.valores.volumen || 100), pos0 = U ? U.ing / ING0 * 100 : 100;
      R.valores.volumen = Math.max(30, Math.min(200, Math.round(vol * (+iV.value) / Math.max(1, pos0) * 10) / 10)); der._abArrV = false; recalcular && recalcular(); };
    etqV(+iV.value); }
  /* v5.2: «Huertas hidropónicas activas» en auto por defecto (se instalan con los años, como en el mapa); al moverlo queda fijo; «Auto» lo devuelve */
  const iH = der.querySelector('input[data-k="huertasH"]');
  if (iH) { const box = iH.closest('.su-sl'); box.classList.add('ab-auto'); if (+iH.value < 0) iH.value = 0;
    if (!box.querySelector('.ab-lim')) box.insertAdjacentHTML('beforeend', '<p class="ab-lim">Se instalan solas con los años (≈147 en el año 1, ≈1.470 en el 10, las 2.132 cubiertas aptas en el 15, primero las más altas). Muévelo para fijar un número. <button type="button" class="ab-autob">Auto</button></p>');
    const b = box.querySelector('.ab-autob'); if (b) b.onclick = () => { R.valores.huertasH = -1; recalcular && recalcular(); };
    iH.addEventListener('pointerdown', () => { der._abArrH = true; }); iH.addEventListener('change', () => { der._abArrH = false; }); }
  if (!iP || !iD) return;
  iP.closest('.su-sl').classList.add('ab-lig'); iD.closest('.su-sl').classList.add('ab-lig');
  const cons = () => (iC ? +iC.value : (R.valores.demanda || 100)) / 100;
  const lim = () => { iD.min = Math.floor(P0 * KG / 1000 * cons()); iD.max = Math.ceil(+iP.max * KG / 1000 * cons()); };
  const etq = (inp, txt) => { const b = der.querySelector(`[data-v="${inp.dataset.k}"]`); if (b) b.textContent = txt; const p = (inp.value - inp.min) / (inp.max - inp.min) * 100; inp.style.setProperty('--p', Math.max(0, Math.min(100, p)) + '%'); };
  const ponP = (v) => { iP.value = v; etq(iP, nf(v) + ' hab'); }, ponD = (v) => { iD.value = v; etq(iD, nf(v) + ' t/día'); };
  { const lab = iP.closest('.su-sl').querySelector('label'); if (lab && !lab.querySelector('small')) lab.firstChild.after(Object.assign(document.createElement('small'), { textContent: 'crece sola con los años · mín. ' + nf(P0) })); }
  { const lab = iD.closest('.su-sl').querySelector('label'); if (lab && !lab.querySelector('small')) lab.firstChild.after(Object.assign(document.createElement('small'), { textContent: 'población × 0,951 kg · mín. ' + nf(P0 * KG / 1000) })); }
  lim();
  for (const i of [iP, iD]) { i.addEventListener('pointerdown', () => arr(true)); i.addEventListener('pointerup', () => arr(false)); i.addEventListener('blur', () => arr(false)); }
  iP.oninput = () => { arr(true); ponP(+iP.value); ponD(Math.round(+iP.value * KG / 1000 * cons())); };
  iD.oninput = () => { arr(true); ponD(+iD.value); ponP(Math.round(+iD.value * 1000 / (KG * cons()))); };
  const fija = (pob) => { R.valores.pobK = Math.max(P0, Math.round(pob)); R.valores.demT = Math.round(R.valores.pobK * KG / 1000 * cons()); R.valores.pobDesde = R.hist.length; arr(false); recalcular && recalcular(); };
  iP.onchange = () => fija(+iP.value);
  iD.onchange = () => fija(+iD.value * 1000 / (KG * cons()));
  if (iC) iC.addEventListener('change', () => { lim(); ponD(Math.round(+iP.value * KG / 1000 * cons())); });
  ponP(+iP.value); ponD(Math.round(+iP.value * KG / 1000 * cons()));
}
/* ---------- fórmulas con los valores de la semana ---------- */
function abrirFx(der) { let p = document.getElementById('ab-fxp');
  if (!p) { p = document.createElement('div'); p.id = 'ab-fxp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'false'); p.setAttribute('aria-label', 'Fórmulas de la simulación 01'); document.body.appendChild(p);
    p.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarFx(); }); }
  p.hidden = false; der._abFx = true; pintarFx(der); const x = p.querySelector('.x'); if (x) x.focus(); }
function cerrarFx() { const p = document.getElementById('ab-fxp'); if (p) p.hidden = true; const d = document.getElementById('su-der'); if (d) { d._abFx = false; const b = d.querySelector('#ab-fx'); if (b) b.focus(); } }
addEventListener('keydown', (e) => { if (e.key === 'Escape') { const p = document.getElementById('ab-fxp'); if (p && !p.hidden) cerrarFx(); } });
function pintarFx(der) { const p = document.getElementById('ab-fxp'); if (!p || p.hidden) return;
  const H = der._abH || [], L = H[H.length - 1], U = X(L), r = L && L.residuosK, prop = !!der._abProp;
  const f = (n, v, txt) => `<div><dt>${n}<b>${v}</b></dt><dd>${txt}</dd></div>`, i = (v) => `<i>${v}</i>`;
  let h = `<button type="button" class="x" aria-label="Cerrar las fórmulas">${ICO_X}</button><h3>Fórmulas · simulación 01</h3><p>${U ? `Valores de la semana ${nf(U.sem)} (año ${Math.floor((U.sem - 1) / 52) + 1}), ${prop ? 'con' : 'sin'} propuesta. Flujos en t/día.` : 'Dale play: los valores aparecen semana a semana.'} Fuentes y supuestos: docs/sim01_abastecimiento_v3.md, v4 y v5.</p>`;
  if (U) { const años = U.sem / 52, resto0 = U.resto0 != null ? U.resto0 : U.resto;
    h += `<h4>Variables</h4><dl>`
      + f('Población de Kennedy', nf(U.pob) + ' hab', `1.034.838 × (1 + ${i(nf(U.crece * 100, 1) + ' %')})^(semana ÷ 52)`)
      + f('Demanda alimentaria', nf(U.demK) + ' t/día', `población × 0,951 kg × consumo ${i(nf(U.dem * 100) + ' %')} ÷ 1.000`)
      + f('Comida que producen los hogares', nf(U.autoT, 1) + ' t/día', `demanda × ${i(nf(U.auto * 100) + ' %')} (supuesto, 0 % por defecto)`)
      + (prop ? f('Mercados de barrio', nf(U.mercT) + ' t/día', `${i(nf(U.nAct))} abiertos de ${nf(U.nM)} · cada uno hasta 70 % de 28 t/día (215 puestos × 0,13 t), también cuando falta comida en Corabastos · compran a pie los hogares a 1 km o menos (hasta 60 % de lo fresco)`)
        + f('Acopio regional de los mercados', nf(U.regT || 0) + ' t/día', `Σ (55 % de 28 t/día − lo que compra Kennedy) en cada mercado abierto · supuesto de la propuesta (la barra de cada mercado = Kennedy + acopio, máx. 70 %)`)
        + f('Huertas hidropónicas', nf(U.huertaT, 2) + ' t/día', `${i(nf(U.nH))} huertas × 50 m² × 6 kg/m²·año ÷ 365 · en auto se instalan solas: 2.132 cubiertas × semana ÷ 754 (las mismas que se ven en el mapa)`) : '')
      + f('Pedido a Corabastos', nf(U.L) + ' t/día', `resto de la región ${i(nf(resto0))}${prop ? ' − acopio regional ' + i(nf(U.regT || 0)) : ''} + lo que Kennedy le pide ${i(nf(U.coraPedK))}`)
      + f('Ingreso a Corabastos', nf(U.ing) + ' t/día', `«Ingreso» ${i(nf(U.vol * 100) + ' %')} × pedido ÷ (1 − 0,0155), máx. 6.460 × (1 + ${nf(U.topeF * 100)} %) = ${nf(U.tope)}`)
      + f('Congestión junto a Corabastos', nf(U.cC * 100) + ' %', `${prop ? `nivel de 2025 0,62 × (1 − 0,25 ×  de mercados abiertos) (supuesto de la propuesta, el mismo de las vías)` : `nivel de la ciudad 0,62 + 0,033 × ${nf(años, 1)} años = ${i(nf(U.cCiudad, 3))}`} × ingreso ÷ 6.460`)
      + f('Permanencia de la mercancía', nf(U.Tp, 2) + ' días', `0,76 días × (1 + congestión) ÷ 1,62 × cola ${i(nf(U.cola || 1, 2))}`)
      + f('Regla del modelo (decisión de la autora): cuando no hay dónde poner la comida, la mercancía sale más lento y Corabastos se llena', 'cola ' + nf(U.cola || 1, 2), `cola = 1 + 0,5 × [(1 − 0,35) ÷ (1 − ρ) − 1], ρ = inventario ÷ 14.000 = ${i(nf(U.sat, 2))}: cuanto más llena está la central, más tarda en salir lo que entra (con ρ = 0,35, el nivel de 2025, la cola vale 1)`)
      + f('Inventario de Corabastos', nf(U.inv) + ' t', `inventario anterior + ingresos − despachos − pérdidas (0,0155 de lo que sale) · tiende a ingreso × permanencia = ${nf(U.ing * U.Tp)}`)
      + f('Límite de abastecimiento de Corabastos', nf(U.sat * 100) + ' %', `inventario ÷ ${i(nf(U.cap || 14000) + ' t')} (14.000 t de referencia${U.nQuit ? ' × tope de las naves que quedan: ' + U.nQuit + ' de 18 naves quitadas' : ''}) · game over sobre 100 % 4 semanas`)
      + f('Déficit alimentario', nf(U.secMin * 100, 1) + ' %', `sector peor servido: recibido ÷ demanda (${(U.sectores[U.secArg] || {}).n || '—'}) · game over bajo 80 % 4 semanas`)
      + (r ? f('Residuos sin recoger', nf(r.noRec) + ' t/día', `922 × 1,027^años + 0,19 × (comida que llega − 984) − 774 recogidas − ${i(nf(r.trat))} tratadas · game over sobre 296 4 semanas`) : '')
      + `</dl><h4>Gráficas</h4><dl>`
      + f('1 · Población y demanda', nf(U.pob / 1e6, 3) + ' M', 'población de la semana; la demanda es población × 0,951 kg')
      + f('2 · Demanda frente a alimentos disponibles', nf(U.rec) + ' t/día', `disponibles = hogares + mercados + huertas + lo que despacha Corabastos a Kennedy; la franja coral es el déficit (demanda − disponibles)`)
      + f('3 · Corabastos frente a su límite', nf(U.sat * 100) + ' %', 'inventario ÷ 14.000 t, esta corrida y la otra mitad del par (punteada)')
      + f('4 · Sectores', nf(U.secMin * 100, 1) + ' %', 'cobertura de cada uno de los 8 sectores = recibido ÷ demanda; raya = 80 %')
      + f('5 · Con frente a sin', '', 'los mismos indicadores en la misma semana de las dos corridas (mismos valores de las variables)') + '</dl>'; }
  if (p._h !== h) { const foco = document.activeElement && p.contains(document.activeElement); p.innerHTML = h; p._h = h; p.querySelector('.x').onclick = cerrarFx; if (foco) p.querySelector('.x').focus(); } }
/* ---------- repintar ---------- */
const X = (h) => h && h.abasto && h.abasto.ab01;
/* H = historial de la corrida (un I por semana); FIN = semanas de la barra (780); B = la otra mitad del par (puede ir a medias); prop = esta corrida es con propuesta */
export function actualizar(der, H, FIN = 780, B = null, prop = false) {
  const g = der && der.querySelector('#ab-graf svg'); if (!g) return;
  der._abRepinta = () => actualizar(der, H, FIN, B, prop); der._abH = H; der._abProp = prop;
  const L = H && H.length ? H[H.length - 1] : null, U = X(L);
  // deslizadores que se mueven solos con la semana del modelo (no mientras se arrastran)
  if (U && !der._abArrastra) { const iP = der.querySelector('input[data-k="pobK"]'), iD = der.querySelector('input[data-k="demT"]');
    if (iP && iD) { iP.value = U.pob; iD.value = U.demK; const b1 = der.querySelector('[data-v="pobK"]'), b2 = der.querySelector('[data-v="demT"]'); if (b1) b1.textContent = nf(U.pob) + ' hab'; if (b2) b2.textContent = nf(U.demK) + ' t/día';
      for (const i of [iP, iD]) i.style.setProperty('--p', Math.max(0, Math.min(100, (i.value - i.min) / (i.max - i.min) * 100)) + '%'); } }
  { const iH = der.querySelector('input[data-k="huertasH"]'), R0 = der._abR, auto = !R0 || R0.valores.huertasH == null || R0.valores.huertasH < 0;
    if (iH && !der._abArrH) { const n = U && U.nH != null ? U.nH : 0, b = der.querySelector('[data-v="huertasH"]'), t = (auto ? 'auto · ' : 'fijo · ') + nf(auto ? n : R0.valores.huertasH) + ' huertas';
      if (auto) iH.value = n; if (b && b.textContent !== t) b.textContent = t; iH.style.setProperty('--p', Math.max(0, Math.min(100, (iH.value - iH.min) / (iH.max - iH.min) * 100)) + '%');
      const ab = der.querySelector('.ab-autob'); if (ab) ab.hidden = auto; } }
  if (U && !der._abArrV) { const iV = der.querySelector('input[data-k="volumen"]'); if (iV) { const pos = U.ing / ING0 * 100; iV.value = pos; if (der._abEtqV) der._abEtqV(pos); } }
  reglas(der, L, U);
  if (GO && (!H || H.length < GO.sem)) { GO = null; const a = document.getElementById('ab-alerta'); if (a) a.remove(); alertaArriba(); }
  marcarGo(der);
  { const a = document.getElementById('ab-alerta'), U0 = X(H && H[0]); if (a) { const e = a.querySelector('[data-ab="alerta"]'), v = U && U0 ? (U.demK / U0.demK - 1) * 100 : 0, t = (v >= 0 ? '+' : '−') + nf(Math.abs(v), 1) + ' %'; if (e && e.textContent !== t) e.textContent = t; } feedBajo(); }
  if (der._abFx) pintarFx(der);
  const t = GRAF.find(x => x[0] === VISTA); const put = (k, s) => { const e = der.querySelector(`#ab-graf [data-ab="${k}"]`); if (e && e.innerHTML !== s) e.innerHTML = s; };
  put('t', `${GRAF.indexOf(t) + 1} · ${t[1]}`);
  if (!U) { g.innerHTML = '<text x="130" y="66" text-anchor="middle">Dale play: la gráfica se arma semana a semana</text>'; put('s', ''); put('ley', ''); return; }
  const r = DIB[VISTA](H, FIN, B, prop, L, U); g.innerHTML = r.svg; put('s', r.sub); put('ley', r.ley.map(([c, n, v, cl]) => `<li><i class="${cl || ''}" style="${cl === 'b' ? 'background' : 'border-color'}:${c}"></i>${n}${v != null ? ` <b>${v}</b>` : ''}</li>`).join(''));
}
function reglas(der, L, U) {
  const fila = (k, w, txt, mal, racha) => { const e = der.querySelector(`#ab-go [data-go="${k}"]`); if (!e) return; e.classList.toggle('mal', !!mal); const u = e.querySelector('u'); u.style.width = Math.max(0, Math.min(100, w)).toFixed(1) + '%'; u.style.background = mal ? COL.mal : (k === 'def' ? w < 87 : w > 66) ? COL.amb : COL.ok;
    if (GO && GO_FILA[GO.regla] === k) racha = 4;
    const b = e.querySelector('b'), h = `${txt}${racha ? `<em>${racha}/4 sem</em>` : ''}`; if (b.innerHTML !== h) b.innerHTML = h; };
  if (!U) { for (const k of ['def', 'sat', 'res']) fila(k, 0, '—', false, 0); return; }
  const r = L.residuosK, S = U.sectores[U.secArg] || {};
  fila('def', U.secMin * 100, `${nf(U.secMin * 100, 1)} %`, U.secMin < 0.8, U.rachaDef);
  fila('sat', U.sat * 100 / 1.3, `${nf(U.sat * 100)} % de ${nf(U.cap || 14000)} t`, U.sat > 1, U.rachaSat);
  fila('res', r ? r.noRec / RES_GO * 100 / 1.3 : 0, r ? `${nf(r.noRec)} de ${RES_GO} t/día` : '—', r && r.noRec >= RES_GO, U.rachaRes);
  const d = der.querySelector('#ab-go [data-go="def"] span'); if (d) d.textContent = 'Déficit alimentario' + (S.n ? ' · ' + S.n.replace(/^Sector /, '') : '');
}
/* ---------- las cinco gráficas (viewBox 260 × 132): una pregunta, pocas líneas, valor rotulado al final ---------- */
const W = 260, HH = 132, PL = 30, PR = 52, PT = 8, PB = 16, IW = W - PL - PR, IH = HH - PT - PB;
const muestra = (H) => { const r = []; const p = Math.max(1, Math.floor(H.length / 160)); for (let i = 0; i < H.length; i += p) r.push(H[i]); if (r[r.length - 1] !== H[H.length - 1]) r.push(H[H.length - 1]); return r; };
const ejeX = (x) => { let s = ''; for (const a of [1, 5, 10, 15]) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${HH - 3}" text-anchor="middle">año ${a}</text>`; return s; };
function serie(M, f, x, y) { let d = '', n = 0; for (const h of M) { const v = f(h); if (v == null || !isFinite(v)) { n = 0; continue; } d += (n++ ? 'L' : 'M') + x(h.sem).toFixed(1) + ' ' + y(v).toFixed(1); } return d; }
function rejilla(mn, mx, y, fmt, n = 3) { let s = ''; for (let i = 0; i <= n; i++) { const v = mn + (mx - mn) * i / n; s += `<line x1="${PL}" x2="${W - PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/><text x="${PL - 3}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`; } return s; }
/* rótulos al final de la línea sin encimarse */
function rotulos(items) { items.sort((a, b) => a.y - b.y); for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 23) items[i].y = items[i - 1].y + 23;
  return items.map(o => `<circle cx="${o.x.toFixed(1)}" cy="${o.y0.toFixed(1)}" r="2.6" fill="${o.c}"/><text class="v" x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 1).toFixed(1)}" style="fill:${o.c}">${o.v}</text><text class="n" x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 9).toFixed(1)}">${o.n}</text>`).join(''); }
const fin = (FIN) => (s) => PL + (s - 1) / (FIN - 1) * IW;
const DIB = {
  pob(H, FIN, B, prop, L, U) { const M = muestra(H), x = fin(FIN);
    const v = M.map(h => X(h).pob), mn0 = Math.min(P0, ...v), mx0 = Math.max(...v), pad = Math.max(5000, (mx0 - mn0) * 0.15), mn = mn0 - pad, mx = mx0 + pad, y = (q) => PT + IH - (q - mn) / (mx - mn) * IH;
    const d = serie(M, h => X(h).pob, x, y), x0 = x(M[0].sem).toFixed(1), x1 = x(L.sem).toFixed(1);
    const svg = `<defs><linearGradient id="abgP" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${COL.vio}" stop-opacity=".45"/><stop offset="1" stop-color="${COL.vio2}" stop-opacity="0"/></linearGradient></defs>`
      + rejilla(mn, mx, y, (q) => nf(q / 1e6, 2) + ' M') + ejeX(x)
      + `<path d="${d}L${x1} ${PT + IH}L${x0} ${PT + IH}Z" fill="url(#abgP)"/><path d="${d}" fill="none" stroke="${COL.vio}" stroke-width="2.4" stroke-linecap="round"/>`
      + rotulos([{ x: +x1, y0: y(U.pob), y: y(U.pob), c: COL.vio, v: nf(U.pob / 1e6, 3) + ' M', n: nf(U.demK) + ' t/día' }]);
    return { svg, sub: `Crece sola ${nf(U.crece * 100, 1)} %/año. Cada habitante pide 0,951 kg al día: hoy ${nf(U.demK)} t/día.`, ley: [[COL.vio, 'Habitantes', nf(U.pob)]] }; },
  dis(H, FIN, B, prop, L, U) { const M = muestra(H), x = fin(FIN);
    const v = M.flatMap(h => [X(h).demK, X(h).rec]); const mn0 = Math.min(...v), mx0 = Math.max(...v), pad = Math.max(10, (mx0 - mn0) * 0.25), mn = Math.max(0, mn0 - pad), mx = mx0 + pad, y = (q) => PT + IH - (q - mn) / (mx - mn) * IH;
    /* franja de déficit: entre la demanda (arriba) y lo disponible cuando falta */
    const arriba = M.map(h => `${x(h.sem).toFixed(1)},${y(X(h).demK).toFixed(1)}`), abajo = M.slice().reverse().map(h => `${x(h.sem).toFixed(1)},${y(Math.min(X(h).demK, X(h).rec)).toFixed(1)}`);
    const falta = Math.max(0, U.demK - U.rec), x1 = x(L.sem);
    const svg = rejilla(mn, mx, y, (q) => nf(q)) + ejeX(x)
      + `<polygon points="${arriba.concat(abajo).join(' ')}" fill="${COL.cor}" fill-opacity=".38"/>`
      + `<path d="${serie(M, h => X(h).rec, x, y)}" fill="none" stroke="${COL.tur}" stroke-width="2.6" stroke-linecap="round"/><path d="${serie(M, h => X(h).demK, x, y)}" fill="none" stroke="${COL.cor}" stroke-width="1.6" stroke-dasharray="4 3"/>`
      + rotulos([{ x: x1, y0: y(U.demK), y: y(U.demK) - (falta < 1 ? 10 : 0), c: COL.cor, v: nf(U.demK), n: 'demanda' }, { x: x1, y0: y(U.rec), y: y(U.rec), c: COL.tur, v: nf(U.rec), n: 'disponible' }]);
    return { svg, sub: falta >= 1 ? `Faltan ${nf(falta)} t/día (franja coral): cobertura ${nf(U.cobK * 100, 1)} %.` : `La comida disponible cubre toda la demanda (${nf(U.cobK * 100, 1)} %). Si faltara, la franja coral mostraría el déficit.`,
      ley: [[COL.cor, 'Demanda', null, 'd'], [COL.tur, 'Alimentos disponibles'], [COL.cor, 'Déficit', null, 'b']] }; },
  cap(H, FIN, B, prop, L, U) { const M = muestra(H), x = fin(FIN), MB = B && B.length ? muestra(B.slice(0, Math.min(B.length, L.sem))) : null;
    const v = M.map(h => X(h).sat * 100).concat(MB ? MB.map(h => X(h) ? X(h).sat * 100 : 0) : []), mx = Math.max(110, ...v) * 1.04, y = (q) => PT + IH - q / mx * IH;
    const c = U.sat > 1 ? COL.mal : prop ? COL.vio : COL.cor, cB = prop ? COL.cor : COL.vio, x1 = x(L.sem), area = serie(M, h => X(h).sat * 100, x, y);
    const UB = MB && MB.length ? X(MB[MB.length - 1]) : null;
    const svg = rejilla(0, mx, y, (q) => nf(q) + ' %', 4) + ejeX(x)
      + `<rect x="${PL}" y="${PT}" width="${IW}" height="${Math.max(0, y(100) - PT).toFixed(1)}" fill="${COL.oro}" fill-opacity=".07"/><line x1="${PL}" x2="${W - PR}" y1="${y(100).toFixed(1)}" y2="${y(100).toFixed(1)}" stroke="${COL.oro}" stroke-width="1.5" stroke-dasharray="5 3"/><text x="${PL + 3}" y="${(y(100) - 3).toFixed(1)}" style="fill:${COL.oro}">límite 14.000 t</text>`
      + (MB ? `<path d="${serie(MB, h => X(h) ? X(h).sat * 100 : null, x, y)}" fill="none" stroke="${cB}" stroke-width="1.4" stroke-dasharray="3 3" stroke-opacity=".8"/>` : '')
      + `<path d="${area}L${x1.toFixed(1)} ${y(0).toFixed(1)}L${x(M[0].sem).toFixed(1)} ${y(0).toFixed(1)}Z" fill="${c}" fill-opacity=".16"/><path d="${area}" fill="none" stroke="${c}" stroke-width="2.4"/>`
      + rotulos([{ x: x1, y0: y(U.sat * 100), y: y(U.sat * 100), c, v: nf(U.sat * 100) + ' %', n: prop ? 'con propuesta' : 'sin propuesta' }].concat(UB ? [{ x: x1, y0: y(UB.sat * 100), y: y(UB.sat * 100), c: cB, v: nf(UB.sat * 100) + ' %', n: prop ? 'sin propuesta' : 'con propuesta' }] : []));
    return { svg, sub: `Inventario ${nf(U.inv)} t de 14.000 (límite fijo). Entran ${nf(U.ing)} t/día.`, ley: [[c, prop ? 'Con propuesta' : 'Sin propuesta'], [cB, prop ? 'Sin propuesta' : 'Con propuesta', null, 'd'], [COL.oro, 'Límite', null, 'd']] }; },
  sec(H, FIN, B, prop, L, U) { const S = U.sectores.slice().sort((a, b) => a.cob - b.cob), n = S.length, bh = (HH - 10) / n, x0 = 86, x1 = W - 44, xs = (c) => x0 + Math.min(1.05, c) / 1.05 * (x1 - x0);
    let svg = '';
    S.forEach((s, i) => { const yy = 3 + i * bh, c = s.cob < 0.8 ? COL.mal : s.cob < 0.87 ? COL.amb : i === 0 ? COL.tur : COL.vio;
      svg += `<text x="${x0 - 4}" y="${(yy + bh * 0.62).toFixed(1)}" text-anchor="end">${s.n.replace(/^Sector /, '').slice(0, 19)}</text><rect x="${x0}" y="${(yy + 2).toFixed(1)}" width="${Math.max(1, xs(s.cob) - x0).toFixed(1)}" height="${(bh - 5).toFixed(1)}" rx="3" fill="${c}" fill-opacity="${i === 0 ? 1 : .7}"/><text class="v" x="${(xs(s.cob) + 4).toFixed(1)}" y="${(yy + bh * 0.66).toFixed(1)}" style="font-size:9.5px">${nf(s.cob * 100, 1)} %</text>`; });
    svg += `<line x1="${xs(0.8).toFixed(1)}" x2="${xs(0.8).toFixed(1)}" y1="2" y2="${(n * bh + 2).toFixed(1)}" stroke="${COL.mal}" stroke-width="1.4" stroke-dasharray="3 2"/><text x="${xs(0.8).toFixed(1)}" y="${(n * bh + 9).toFixed(1)}" text-anchor="middle" style="fill:${COL.mal}">80 %</text>`;
    const p = S[0]; return { svg, sub: `El que menos recibe: ${p.n.replace(/^Sector /, '')}, ${nf(p.cob * 100, 1)} % de su demanda${p.def > 0.05 ? ` (faltan ${nf(p.def, 1)} t/día)` : ''}.`, ley: [[COL.tur, 'Sector que menos recibe', null, 'b'], [COL.mal, 'Límite 80 %', null, 'd']] }; },
  cmp(H, FIN, B, prop, L, U) { const sem = L.sem, Bh = B && B.length ? B[Math.min(B.length, sem) - 1] : null, UB = X(Bh);
    const S = prop ? UB : U, C = prop ? U : UB, Rs = prop ? Bh : L, Rc = prop ? L : Bh;
    const met = [['Sector que menos recibe', (u) => u.secMin * 100, '%', 80, 'mín. 80 %'], ['Corabastos frente a su límite', (u) => u.sat * 100, '%', 100, 'máx. 100 %'], ['Residuos sin recoger', (u, h) => h && h.residuosK ? h.residuosK.noRec / RES_GO * 100 : null, '% de 296 t/día', 100, 'máx. 100 %']];
    const fila = 42, x0 = 4, x1 = W - 52, xs = (v) => x0 + Math.max(0, Math.min(130, v)) / 130 * (x1 - x0); let svg = '';
    met.forEach(([n, f, u, lim, ln], i) => { const y0 = 4 + i * fila, vs = S ? f(S, Rs) : null, vc = C ? f(C, Rc) : null;
      svg += `<text x="${x0}" y="${y0 + 7}" style="fill:#eef0ff">${n}</text><line x1="${xs(lim).toFixed(1)}" x2="${xs(lim).toFixed(1)}" y1="${y0 + 10}" y2="${y0 + 34}" stroke="${COL.oro}" stroke-dasharray="2 2"/>`;
      [[vs, COL.cor, 11, 'sin'], [vc, COL.vio, 23, 'con']].forEach(([v, c, dy, k]) => { if (v == null) { svg += `<text x="${x0}" y="${y0 + dy + 8}" style="opacity:.5">${k}: calculando…</text>`; return; }
        svg += `<rect x="${x0}" y="${y0 + dy}" width="${Math.max(1, xs(v) - x0).toFixed(1)}" height="9" rx="3" fill="${c}"/><text class="v" x="${(Math.min(xs(v), x1) + 4).toFixed(1)}" y="${y0 + dy + 8.5}" style="font-size:10px;fill:${c}">${nf(v, 1)} % · ${k}</text>`; }); });
    return { svg, sub: `Semana ${nf(sem)} de las dos corridas, con los mismos valores. Raya dorada = límite.`, ley: [[COL.cor, 'Sin propuesta', null, 'b'], [COL.vio, 'Con propuesta', null, 'b']] }; }
};
export { CAPAS };
