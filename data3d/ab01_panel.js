/* ============ SIMULACIÓN 01 EN EL PANEL IZQUIERDO (acordeón de limpio.js, dentro de #su-der de sim_ui.js) ============
   v3 (docs/sim01_abastecimiento_v3.md, 2026-11-26):
   · ALERTA tipo videojuego al abrir la 01 (causa ficticia marcada como tal).
   · «Población de Kennedy» y «Demanda alimentaria» LIGADAS (demanda = población × 0,951 kg × consumo): mover una mueve la otra; las dos se
     mueven solas con los años (valor de la semana del modelo) y se pueden arrastrar (desde esa semana el modelo parte del valor elegido).
   · REGLAS DE GAME OVER en vivo (déficit, saturación, residuos): valor frente a su límite y semanas seguidas en falla.
   · CINCO GRÁFICAS (una a la vez, pestañas 1–5): población y demanda · demanda frente a alimentos disponibles · capacidad ocupada de
     Corabastos (inventario frente a 14.000 t) · déficit por sector (barras ordenadas con la raya de 80 %) · con frente a sin propuesta.
   · Interruptores de las capas Bodegas · Residuos · Tráfico (data3d/abasto_capas.js, window.KEN_AB01C).
   Datos: R.hist de sim_ui.js (I.abasto.ab01, I.residuosK de simulaciones12.js) y la otra mitad del par (R.ecoBase). Nada se calcula aquí
   salvo el enlace población ↔ demanda (la misma fórmula del modelo). Se repinta como mucho 4 veces por segundo. */
const KG = 0.951, P0 = 1034838, CAP = 14000, RES_GO = 296;
const ICO_ALERTA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18.5 17h-17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1.05" fill="currentColor"/></svg>';
const ICO_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CAPAS = [
  { k: 'bodegas', n: 'Bodegas', d: 'Naves de vidrio; el líquido es la parte del inventario de Corabastos que guarda cada una frente a su tope', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><rect x="2" y="1" width="14" height="10" rx="1.5" fill="none" stroke="rgba(220,240,255,.75)"/><rect x="3" y="6" width="12" height="4.2" rx="1" fill="#fbbf24"/></svg>' },
  { k: 'residuos', n: 'Residuos', d: 'La Vaca se degrada: árboles e interacciones bajan con los residuos sin recoger', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 8c3-2 5 1 8-1s5 1 8-1v4H1z" fill="#6b4f2e"/><circle cx="5" cy="4.5" r="2.6" fill="#2f7d4a"/><path d="M12 6V3.5" stroke="#8d7a63" stroke-width="1.6" stroke-linecap="round"/></svg>' },
  { k: 'trafico', n: 'Tráfico', d: 'Flujo en las vías principales cerca de Corabastos; se frena y enrojece con la congestión', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6h16" stroke="rgba(255,255,255,.25)" stroke-width="4"/><rect x="2" y="4.6" width="4" height="2.8" rx="1.2" fill="#4ade80"/><rect x="8" y="4.6" width="4" height="2.8" rx="1.2" fill="#fbbf24"/><rect x="13.5" y="4.6" width="3" height="2.8" rx="1.2" fill="#ef4444"/></svg>' }];
const COL = { dem: '#f4f3ef', con: '#7d6bff', sin: '#f2694a', lim: '#ffd27a', pob: '#9ecbff', ok: '#4ade80', amb: '#fbbf24', mal: '#ef4444' };
const GRAF = [['pob', 'Población y demanda'], ['dis', 'Demanda y alimentos disponibles'], ['cap', 'Capacidad ocupada de Corabastos'], ['sec', 'Déficit por sector'], ['cmp', 'Con frente a sin propuesta']];
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const CSS = `
#ab-alerta{position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:45;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 32px);white-space:nowrap;padding:6px 6px 6px 12px;border-radius:10px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  background:linear-gradient(90deg,rgba(60,28,16,.82),rgba(40,30,20,.78));border:1px solid rgba(255,170,90,.45);color:#ffe6c7;overflow:hidden;font:400 11.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif)}
#ab-alerta::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#ff8a3d;animation:abPulso 1.1s ease-in-out infinite}
#ab-alerta[hidden]{display:none}@media (max-width:760px){#ab-alerta{top:118px}}#ab-alerta>svg{width:16px;height:16px;flex:none;color:#ffb057;animation:abIco 1.1s ease-in-out infinite}#ab-alerta span{font:500 12px var(--ui-sans,Inter,sans-serif);color:#fff3e3;overflow:hidden;text-overflow:ellipsis}
#ab-alerta b{font:600 10px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:#ffb057}
#ab-alerta strong{font:600 16px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#ffb057}
#ab-alerta small{display:block;margin-top:3px;font:400 10.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif);color:#ffd9b0;opacity:.9}
#ab-alerta small i{font-style:normal;font:600 9px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;border-radius:4px;border:1px solid rgba(255,217,176,.45);margin-right:4px}
#ab-alerta button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;color:#ffd9b0}
#ab-alerta button:hover{background:rgba(255,255,255,.1)} #ab-alerta button svg{width:12px;height:12px}
@keyframes abPulso{0%,100%{opacity:1;box-shadow:0 0 0 rgba(255,90,60,0)}50%{opacity:.45;box-shadow:0 0 10px rgba(255,90,60,.9)}}
@keyframes abIco{0%,100%{opacity:1}50%{opacity:.55}}
@media(prefers-reduced-motion:reduce){#ab-alerta::before,#ab-alerta>svg{animation:none}}
#su-der .su-sl.ab-lig label{flex-wrap:wrap}#su-der .su-sl.ab-lig label small{order:3;flex-basis:100%;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.55;margin:1px 0 0}
#su-der .su-sl.ab-lig{position:relative;padding-left:9px} #su-der .su-sl.ab-lig::before{content:"";position:absolute;left:0;top:4px;bottom:2px;width:2px;border-radius:2px;background:${COL.pob};opacity:.7}
#ab-go{margin:10px 0 6px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#ab-go h6,#ab-graf h6,#ab-capas h6{margin:0 0 5px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#ab-go .r{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:6px;align-items:center;font:400 10.5px/1.25 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);padding:2px 0}
#ab-go .r i{position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.1)} #ab-go .r i u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:${COL.ok}}
#ab-go .r i s{position:absolute;top:-3px;bottom:-3px;width:2px;background:${COL.mal}} #ab-go .r b{font:600 13px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff;white-space:nowrap}
#ab-go .r b em{font-style:normal;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.65;margin-left:3px}
#ab-go .r.mal b{color:#ff8a80} #ab-go .r.mal span{color:#ffb3ab} #ab-go p{margin:4px 0 0;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#ab-graf{margin:8px 0 6px;padding:8px 9px 7px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#ab-graf .tabs{display:flex;gap:3px;margin:0 0 5px} #ab-graf .tabs button{all:unset;box-sizing:border-box;cursor:pointer;flex:1;text-align:center;padding:4px 0;border-radius:6px;border:1px solid rgba(255,255,255,.12);font:600 11px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:var(--ui-tx2,#c9cfc4)}
#ab-graf .tabs button[aria-selected="true"]{background:rgba(158,203,255,.16);border-color:rgba(158,203,255,.5);color:#fff} #ab-graf .tabs button:focus-visible{outline:2px solid #9ecbff;outline-offset:1px}
@media (pointer:coarse){#ab-graf .tabs button{padding:8px 0}}
#ab-graf h5{margin:0 0 1px;font:600 11.5px/1.25 var(--ui-sans,Inter,sans-serif);color:#f1f3ee} #ab-graf p{margin:0 0 3px;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#ab-graf svg{display:block;width:100%;height:auto;overflow:visible}
#ab-graf svg text{font:500 8.5px var(--ui-sans,Inter,sans-serif);fill:rgba(241,243,238,.62);font-variant-numeric:tabular-nums}
#ab-graf ul{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:2px 10px}
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
export function htmlArriba() { return ''; } /* v3: la alerta va arriba al centro (alertaArriba), no en el panel */
/* ALERTA arriba de la pantalla, bajo el selector de escenario: una línea y el porcentaje que subió la demanda (escenario ficticio) */
function alertaArriba() { let a = document.getElementById('ab-alerta');
  if (!a) { a = document.createElement('div'); a.id = 'ab-alerta'; a.setAttribute('role', 'status'); a.title = 'Escenario ficticio: llegan familias nuevas a Kennedy y a la región';
    a.innerHTML = `${ICO_ALERTA}<b>Alerta</b><span>Sube la demanda alimentaria</span><strong data-ab="alerta">+0 %</strong><button type="button" aria-label="Cerrar la alerta">${ICO_X}</button>`; document.body.appendChild(a);
    a.querySelector('button').onclick = () => { a.hidden = true; }; }
  return a; }
export function quitar() { const a = document.getElementById('ab-alerta'); if (a) a.remove(); }
export function htmlAbajo(prop) {
  return `<div id="ab-go" aria-live="polite"><h6 title="Déficit: sector peor servido (límite 80 %). Saturación: inventario ÷ 14.000 t. Residuos: t/día sin recoger (límite 296). 4 semanas seguidas = game over. Mismos límites con y sin propuesta.">Game over</h6>
      <div class="r" data-go="def"><span>Déficit</span><i><u></u><s style="left:80%"></s></i><b>—</b></div>
      <div class="r" data-go="sat"><span>Saturación</span><i><u></u><s style="left:${(100 / 1.3).toFixed(1)}%"></s></i><b>—</b></div>
      <div class="r" data-go="res"><span>Residuos</span><i><u></u><s style="left:${(100 / 1.3).toFixed(1)}%"></s></i><b>—</b></div></div>
    <div id="ab-graf"><h6>Gráficas</h6><div class="tabs" role="tablist">${GRAF.map(([k, n], i) => `<button type="button" role="tab" data-g="${k}" aria-selected="${i ? 'false' : 'true'}" title="${n}">${i + 1}</button>`).join('')}</div>
      <h5 data-ab="t"></h5><p data-ab="s"></p><svg viewBox="0 0 260 128" role="img" aria-label="Gráfica de la simulación 01"></svg><ul data-ab="ley"></ul></div>
    <div id="ab-capas"><h6>Capas de la simulación 01</h6><div>${CAPAS.map(c => `<button type="button" data-capa="${c.k}" aria-pressed="true" title="${c.d}">${c.sw}<span>${c.n}</span></button>`).join('')}</div></div>`;
}
let VISTA = 'pob';
/* opc = { R, recalcular }: el estado de sim_ui.js y su función que vuelve a correr el modelo hasta la semana actual */
export function montar(der, opc = {}) {
  if (!document.getElementById('ab01-css')) { const st = document.createElement('style'); st.id = 'ab01-css'; st.textContent = CSS; document.head.appendChild(st); }
  alertaArriba();
  der.querySelectorAll('#ab-capas [data-capa]').forEach(b => { const C = window.KEN_AB01C, k = b.dataset.capa; if (C) b.setAttribute('aria-pressed', !!C.estado[k]);
    b.onclick = () => { const A = window.KEN_AB01C, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); if (A) A.capa(k, on); else (window.KEN_AB01_PEND || (window.KEN_AB01_PEND = {}))[k] = on; }; });
  der.querySelectorAll('#ab-graf [data-g]').forEach(b => b.onclick = () => { VISTA = b.dataset.g; der.querySelectorAll('#ab-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x === b)); der._abUlt = null; if (der._abRepinta) der._abRepinta(); });
  der.querySelectorAll('#ab-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x.dataset.g === VISTA));
  enlazar(der, opc);
}
/* ---------- población ↔ demanda ---------- */
function enlazar(der, { R, recalcular }) {
  if (!R) return;
  const iP = der.querySelector('input[data-k="pobK"]'), iD = der.querySelector('input[data-k="demT"]'), iC = der.querySelector('input[data-k="demanda"]'); if (!iP || !iD) return;
  iP.closest('.su-sl').classList.add('ab-lig'); iD.closest('.su-sl').classList.add('ab-lig');
  const cons = () => (iC ? +iC.value : (R.valores.demanda || 100)) / 100;
  const lim = () => { iD.min = Math.floor(P0 * KG / 1000 * cons()); iD.max = Math.ceil(+iP.max * KG / 1000 * cons()); };
  const etq = (inp, txt) => { const b = der.querySelector(`[data-v="${inp.dataset.k}"]`); if (b) b.textContent = txt; const p = (inp.value - inp.min) / (inp.max - inp.min) * 100; inp.style.setProperty('--p', Math.max(0, Math.min(100, p)) + '%'); };
  const ponP = (v) => { iP.value = v; etq(iP, nf(v) + ' hab'); }, ponD = (v) => { iD.value = v; etq(iD, nf(v) + ' t/día'); };
  { const lab = iP.closest('.su-sl').querySelector('label'); if (lab && !lab.querySelector('small')) lab.firstChild.after(Object.assign(document.createElement('small'), { textContent: 'mín. ' + nf(P0) })); }
  { const lab = iD.closest('.su-sl').querySelector('label'); if (lab && !lab.querySelector('small')) lab.firstChild.after(Object.assign(document.createElement('small'), { textContent: 'mín. ' + nf(P0 * KG / 1000) })); }
  lim();
  const arr = (on) => { der._abArrastra = on; };
  for (const i of [iP, iD]) { i.addEventListener('pointerdown', () => arr(true)); i.addEventListener('pointerup', () => arr(false)); i.addEventListener('blur', () => arr(false)); }
  iP.oninput = () => { arr(true); ponP(+iP.value); ponD(Math.round(+iP.value * KG / 1000 * cons())); };
  iD.oninput = () => { arr(true); ponD(+iD.value); ponP(Math.round(+iD.value * 1000 / (KG * cons()))); };
  const fija = (pob) => { R.valores.pobK = Math.max(P0, Math.round(pob)); R.valores.demT = Math.round(R.valores.pobK * KG / 1000 * cons()); R.valores.pobDesde = R.hist.length; arr(false); recalcular && recalcular(); };
  iP.onchange = () => fija(+iP.value);
  iD.onchange = () => fija(+iD.value * 1000 / (KG * cons()));
  if (iC) iC.addEventListener('change', () => { lim(); ponD(Math.round(+iP.value * KG / 1000 * cons())); });
  ponP(+iP.value); ponD(Math.round(+iP.value * KG / 1000 * cons()));
}
/* ---------- repintar ---------- */
const X = (h) => h && h.abasto && h.abasto.ab01;
/* H = historial de la corrida (un I por semana); FIN = semanas de la barra (780); B = la otra mitad del par (puede ir a medias); prop = esta corrida es con propuesta */
export function actualizar(der, H, FIN = 780, B = null, prop = false) {
  const g = der && der.querySelector('#ab-graf svg'); if (!g) return;
  der._abRepinta = () => actualizar(der, H, FIN, B, prop);
  const L = H && H.length ? H[H.length - 1] : null, U = X(L);
  // deslizadores ligados: se mueven solos con la semana del modelo (no mientras se arrastran)
  if (U && !der._abArrastra) { const iP = der.querySelector('input[data-k="pobK"]'), iD = der.querySelector('input[data-k="demT"]');
    if (iP && iD) { iP.value = U.pob; iD.value = U.demK; const b1 = der.querySelector('[data-v="pobK"]'), b2 = der.querySelector('[data-v="demT"]'); if (b1) b1.textContent = nf(U.pob) + ' hab'; if (b2) b2.textContent = nf(U.demK) + ' t/día';
      for (const i of [iP, iD]) i.style.setProperty('--p', Math.max(0, Math.min(100, (i.value - i.min) / (i.max - i.min) * 100)) + '%'); } }
  reglas(der, L, U);
  { const a = document.getElementById('ab-alerta'), U0 = X(H && H[0]); if (a) { const e = a.querySelector('[data-ab="alerta"]'), v = U && U0 ? (U.demK / U0.demK - 1) * 100 : 0, t = (v >= 0 ? '+' : '−') + nf(Math.abs(v), 1) + ' %'; if (e && e.textContent !== t) e.textContent = t; } }
  const t = GRAF.find(x => x[0] === VISTA); const put = (k, s) => { const e = der.querySelector(`#ab-graf [data-ab="${k}"]`); if (e && e.innerHTML !== s) e.innerHTML = s; };
  put('t', `${GRAF.indexOf(t) + 1} · ${t[1]}`);
  if (!U) { g.innerHTML = '<text x="130" y="64" text-anchor="middle">Dale play: la gráfica se arma semana a semana</text>'; put('s', ''); put('ley', ''); return; }
  const r = DIB[VISTA](H, FIN, B, prop, L, U); g.innerHTML = r.svg; put('s', r.sub); put('ley', r.ley.map(([c, n, v, cl]) => `<li><i class="${cl || ''}" style="${cl === 'b' ? 'background' : 'border-color'}:${c}"></i>${n}${v != null ? ` <b>${v}</b>` : ''}</li>`).join(''));
}
function reglas(der, L, U) {
  const fila = (k, w, txt, mal, racha) => { const e = der.querySelector(`#ab-go [data-go="${k}"]`); if (!e) return; e.classList.toggle('mal', !!mal); const u = e.querySelector('u'); u.style.width = Math.max(0, Math.min(100, w)).toFixed(1) + '%'; u.style.background = mal ? COL.mal : (k === 'def' ? w < 87 : w > 66) ? COL.amb : COL.ok;
    const b = e.querySelector('b'), h = `${txt}${racha ? `<em>${racha}/4 sem</em>` : ''}`; if (b.innerHTML !== h) b.innerHTML = h; };
  if (!U) { for (const k of ['def', 'sat', 'res']) fila(k, 0, '—', false, 0); return; }
  const r = L.residuosK, S = U.sectores[U.secArg] || {};
  fila('def', U.secMin * 100, `${nf(U.secMin * 100, 1)} %`, U.secMin < 0.8, U.rachaDef);
  fila('sat', U.sat * 100 / 1.3, `${nf(U.sat * 100)} %`, U.sat > 1, U.rachaSat);
  fila('res', r ? r.noRec / RES_GO * 100 / 1.3 : 0, r ? `${nf(r.noRec)} t/día` : '—', r && r.noRec >= RES_GO, U.rachaRes);
  const d = der.querySelector('#ab-go [data-go="def"] span'); if (d) d.title = S.n || '';
}
/* ---------- las cinco gráficas (viewBox 260 × 128) ---------- */
const W = 260, HH = 128, PL = 36, PR = 34, PT = 6, PB = 16, IW = W - PL - PR, IH = HH - PT - PB;
const muestra = (H) => { const r = []; for (let i = 0; i < H.length; i += 2) r.push(H[i]); if (r[r.length - 1] !== H[H.length - 1]) r.push(H[H.length - 1]); return r; };
const ejeX = (FIN, x) => { let s = ''; for (const a of [1, 5, 10, 15]) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${HH - 3}" text-anchor="middle">año ${a}</text>`; return s; };
function escala(mn, mx) { const pad = (mx - mn) * 0.1 || Math.abs(mx) * 0.05 || 1; return [mn - pad, mx + pad]; }
function serie(M, f, x, y) { let d = '', n = 0; for (const h of M) { const v = f(h); if (v == null || !isFinite(v)) { n = 0; continue; } d += (n++ ? 'L' : 'M') + x(h.sem).toFixed(1) + ' ' + y(v).toFixed(1); } return d; }
function rejilla(mn, mx, y, fmt, lado = 'izq', n = 3) { let s = ''; for (let i = 0; i <= n; i++) { const v = mn + (mx - mn) * i / n; s += (lado === 'izq' ? `<line x1="${PL}" x2="${W - PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/><text x="${PL - 3}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${fmt(v)}</text>` : `<text x="${W - PR + 3}" y="${(y(v) + 3).toFixed(1)}">${fmt(v)}</text>`); } return s; }
const DIB = {
  pob(H, FIN, B, prop, L, U) { const M = muestra(H), x = (s) => PL + (s - 1) / (FIN - 1) * IW;
    let [mn, mx] = escala(Math.min(...M.map(h => X(h).pob)), Math.max(...M.map(h => X(h).pob))); const y = (v) => PT + IH - (v - mn) / (mx - mn) * IH;
    const k = U.demK / U.pob, yD = (d) => y(d / k); // la demanda en la misma escala (es proporcional a la población)
    const svg = rejilla(mn, mx, y, (v) => nf(v / 1e6, 2) + ' M') + rejilla(mn * k, mx * k, yD, (v) => nf(v), 'der') + ejeX(FIN, x)
      + `<path d="${serie(M, h => X(h).pob, x, y)}" fill="none" stroke="${COL.pob}" stroke-width="2.6" stroke-opacity=".8"/><path d="${serie(M, h => X(h).demK, x, yD)}" fill="none" stroke="${COL.dem}" stroke-width="1.2" stroke-dasharray="4 3"/>`
      + `<circle cx="${x(L.sem).toFixed(1)}" cy="${y(U.pob).toFixed(1)}" r="3" fill="${COL.pob}"/>`;
    return { svg, sub: 'hab (izq.) · t/día (der.)', ley: [[COL.pob, 'Población', nf(U.pob)], [COL.dem, 'Demanda', nf(U.demK) + ' t/día', 'd']] }; },
  dis(H, FIN, B, prop, L, U) { const M = muestra(H), x = (s) => PL + (s - 1) / (FIN - 1) * IW;
    const v = M.flatMap(h => [X(h).demK, X(h).rec, 0.8 * X(h).demK]); let [mn, mx] = escala(Math.min(...v), Math.max(...v)); const y = (q) => PT + IH - (q - mn) / (mx - mn) * IH;
    const svg = rejilla(mn, mx, y, (q) => nf(q)) + ejeX(FIN, x)
      + `<path d="${serie(M, h => 0.8 * X(h).demK, x, y)}" fill="none" stroke="${COL.lim}" stroke-width="1.2" stroke-dasharray="5 3"/><path d="${serie(M, h => X(h).rec, x, y)}" fill="none" stroke="${prop ? COL.con : COL.sin}" stroke-width="3" stroke-opacity=".85"/><path d="${serie(M, h => X(h).demK, x, y)}" fill="none" stroke="${COL.dem}" stroke-width="1.3"/>`;
    return { svg, sub: `t/día · cobertura ${nf(U.cobK * 100, 1)} %`, ley: [[COL.dem, 'Demanda', nf(U.demK)], [prop ? COL.con : COL.sin, 'Disponibles', nf(U.rec)], [COL.lim, '80 % de la demanda', null, 'd']] }; },
  cap(H, FIN, B, prop, L, U) { const M = muestra(H), x = (s) => PL + (s - 1) / (FIN - 1) * IW, mx = Math.max(16000, ...M.map(h => X(h).inv)) * 1.05, y = (q) => PT + IH - q / mx * IH;
    const area = serie(M, h => X(h).inv, x, y), x0 = x(M[0].sem).toFixed(1), x1 = x(M[M.length - 1].sem).toFixed(1);
    const svg = rejilla(0, mx, y, (q) => nf(q / 1000, 0) + ' mil', 'izq', 4) + ejeX(FIN, x)
      + `<path d="${area}L${x1} ${y(0).toFixed(1)}L${x0} ${y(0).toFixed(1)}Z" fill="${U.sat > 1 ? COL.mal : prop ? COL.con : COL.sin}" fill-opacity=".28"/><path d="${area}" fill="none" stroke="${U.sat > 1 ? COL.mal : prop ? COL.con : COL.sin}" stroke-width="2"/>`
      + `<line x1="${PL}" x2="${W - PR}" y1="${y(CAP).toFixed(1)}" y2="${y(CAP).toFixed(1)}" stroke="${COL.mal}" stroke-width="1.4" stroke-dasharray="5 3"/><text x="${W - PR + 3}" y="${(y(CAP) + 3).toFixed(1)}" fill="#ff8a80">14.000</text>`;
    return { svg, sub: `t · saturación ${nf(U.sat * 100)} %`, ley: [[U.sat > 1 ? COL.mal : prop ? COL.con : COL.sin, 'Inventario', nf(U.inv) + ' t'], [COL.mal, 'Capacidad de referencia', '14.000 t', 'd']] }; },
  sec(H, FIN, B, prop, L, U) { const S = U.sectores.slice().sort((a, b) => a.cob - b.cob), n = S.length, bh = (IH + PB - 6) / n, x0 = 92, x1 = W - 40, xs = (c) => x0 + Math.min(1.05, c) / 1.05 * (x1 - x0);
    let svg = '';
    S.forEach((s, i) => { const yy = 3 + i * bh, c = s.cob < 0.8 ? COL.mal : s.cob < 0.87 ? COL.amb : COL.ok;
      svg += `<text x="${x0 - 3}" y="${(yy + bh * 0.62).toFixed(1)}" text-anchor="end">${s.n.replace(/^Sector /, '').slice(0, 20)}</text><rect x="${x0}" y="${(yy + 1).toFixed(1)}" width="${Math.max(1, xs(s.cob) - x0).toFixed(1)}" height="${(bh - 3).toFixed(1)}" rx="2" fill="${c}" fill-opacity=".85"/><text x="${(xs(s.cob) + 3).toFixed(1)}" y="${(yy + bh * 0.62).toFixed(1)}">${nf(s.cob * 100, 1)} %${s.def > 0.05 ? ' · −' + nf(s.def, s.def < 10 ? 1 : 0) + ' t' : ''}</text>`; });
    svg += `<line x1="${xs(0.8).toFixed(1)}" x2="${xs(0.8).toFixed(1)}" y1="2" y2="${(n * bh + 2).toFixed(1)}" stroke="#ff6b6b" stroke-width="1.6" stroke-dasharray="3 2"/>`;
    return { svg, sub: 'recibido ÷ demanda · raya 80 %', ley: [[COL.ok, '≥ 87 %', null, 'b'], [COL.amb, '80–87 %', null, 'b'], [COL.mal, '< 80 %', null, 'b']] }; },
  cmp(H, FIN, B, prop, L, U) { const sem = L.sem, Bh = B && B.length ? B[Math.min(B.length, sem) - 1] : null, UB = X(Bh);
    const S = prop ? UB : U, C = prop ? U : UB, Rs = prop ? Bh : L, Rc = prop ? L : Bh;
    const met = [['Cobertura de Kennedy', (u) => u.cobK * 100, '%', 80], ['Sector peor servido', (u) => u.secMin * 100, '%', 80], ['Saturación de Corabastos', (u) => u.sat * 100, '%', 100], ['Residuos (% de 296 t/día)', (u, h) => h && h.residuosK ? h.residuosK.noRec / RES_GO * 100 : null, '% de 296', 100]];
    const fila = 26, x0 = 4, x1 = W - 46, xs = (v) => x0 + Math.max(0, Math.min(130, v)) / 130 * (x1 - x0); let svg = '';
    met.forEach(([n, f, u, lim], i) => { const y0 = 4 + i * fila, vs = S ? f(S, Rs) : null, vc = C ? f(C, Rc) : null;
      svg += `<text x="${x0}" y="${y0 + 6}">${n}</text><line x1="${xs(lim).toFixed(1)}" x2="${xs(lim).toFixed(1)}" y1="${y0 + 8}" y2="${y0 + 24}" stroke="${COL.mal}" stroke-dasharray="2 2"/>`;
      [[vs, COL.sin, 9], [vc, COL.con, 17]].forEach(([v, c, dy]) => { if (v == null) { svg += `<text x="${x0}" y="${y0 + dy + 6}" style="opacity:.5">calculando…</text>`; return; }
        svg += `<rect x="${x0}" y="${y0 + dy}" width="${Math.max(1, xs(v) - x0).toFixed(1)}" height="6" rx="2" fill="${c}" fill-opacity=".9"/><text x="${(Math.min(xs(v), x1) + 3).toFixed(1)}" y="${y0 + dy + 6}">${nf(v, 1)} ${u === '%' ? '%' : ''}</text>`; }); });
    return { svg, sub: `semana ${sem} · raya = límite`, ley: [[COL.sin, 'Sin propuesta', null, 'b'], [COL.con, 'Con propuesta', null, 'b']] }; }
};
export { CAPAS };
