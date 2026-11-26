/* ============ SIMULACIÓN 01 EN EL PANEL IZQUIERDO (acordeón de limpio.js, dentro de #su-der de sim_ui.js) ============
   Pedido de la autora (docs/sim01_abastecimiento_v2.md):
   · ALERTA tipo videojuego al abrir la 01: «Está subiendo la demanda alimentaria en Kennedy», con una causa ficticia marcada como tal.
   · Diagrama en vivo de 15 años: demanda de Kennedy, comida que llega y el límite de las bodegas (t/día), con el valor de esta semana.
   · Interruptores de las capas Bodegas · Residuos · Tráfico (data3d/abasto_capas.js, window.KEN_AB01C).
   Datos: R.hist de sim_ui.js (I.comidaK, I.abasto.bodegas de simulaciones12.js). Se repinta como mucho una vez por semana simulada y 4 veces
   por segundo; los nodos SVG se reutilizan (solo cambian atributos). */
const ICO_ALERTA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18.5 17h-17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1.05" fill="currentColor"/></svg>';
const ICO_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const CAPAS = [
  { k: 'bodegas', n: 'Bodegas', d: 'Naves de vidrio; el líquido es lo que ocupan frente a su tope', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><rect x="2" y="1" width="14" height="10" rx="1.5" fill="none" stroke="rgba(220,240,255,.75)"/><rect x="3" y="6" width="12" height="4.2" rx="1" fill="#fbbf24"/></svg>' },
  { k: 'residuos', n: 'Residuos', d: 'La Vaca se degrada: árboles e interacciones bajan con los residuos sin recoger', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 8c3-2 5 1 8-1s5 1 8-1v4H1z" fill="#6b4f2e"/><circle cx="5" cy="4.5" r="2.6" fill="#2f7d4a"/><path d="M12 6V3.5" stroke="#8d7a63" stroke-width="1.6" stroke-linecap="round"/></svg>' },
  { k: 'trafico', n: 'Tráfico', d: 'Flujo en las vías principales cerca de Corabastos; se frena y enrojece con la congestión', sw: '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6h16" stroke="rgba(255,255,255,.25)" stroke-width="4"/><rect x="2" y="4.6" width="4" height="2.8" rx="1.2" fill="#4ade80"/><rect x="8" y="4.6" width="4" height="2.8" rx="1.2" fill="#fbbf24"/><rect x="13.5" y="4.6" width="3" height="2.8" rx="1.2" fill="#ef4444"/></svg>' }];
const COL = { dem: '#f4f3ef', con: '#7d6bff', sin: '#f2694a', lim: '#ffd27a' };
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const CSS = `
#ab-alerta{position:relative;display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:8px;align-items:start;margin:4px 0 8px;padding:8px 8px 8px 10px;border-radius:10px;
  background:linear-gradient(90deg,rgba(255,120,60,.16),rgba(255,190,80,.06));border:1px solid rgba(255,170,90,.38);color:#ffe6c7;overflow:hidden;font:400 11.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif)}
#ab-alerta::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#ff8a3d;animation:abPulso 1.1s ease-in-out infinite}
#ab-alerta>svg{width:20px;height:20px;color:#ffb057;margin-top:1px;animation:abIco 1.1s ease-in-out infinite}
#ab-alerta b{display:block;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:#ffb057;margin-bottom:2px}
#ab-alerta strong{display:block;font:600 12.5px/1.25 var(--ui-sans,Inter,system-ui,sans-serif);color:#fff3e3}
#ab-alerta small{display:block;margin-top:3px;font:400 10.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif);color:#ffd9b0;opacity:.9}
#ab-alerta small i{font-style:normal;font:600 9px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;border-radius:4px;border:1px solid rgba(255,217,176,.45);margin-right:4px}
#ab-alerta button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;color:#ffd9b0}
#ab-alerta button:hover{background:rgba(255,255,255,.1)} #ab-alerta button svg{width:12px;height:12px}
@keyframes abPulso{0%,100%{opacity:1;box-shadow:0 0 0 rgba(255,90,60,0)}50%{opacity:.45;box-shadow:0 0 10px rgba(255,90,60,.9)}}
@keyframes abIco{0%,100%{opacity:1}50%{opacity:.55}}
@media(prefers-reduced-motion:reduce){#ab-alerta::before,#ab-alerta>svg{animation:none}}
#ab-graf{margin:10px 0 6px;padding:8px 9px 7px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#ab-graf h6{margin:0 0 2px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#ab-graf p{margin:0 0 4px;font:400 10.5px/1.35 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#ab-graf svg{display:block;width:100%;height:auto;overflow:visible}
#ab-graf svg text{font:500 9px var(--ui-sans,Inter,sans-serif);fill:rgba(241,243,238,.6);font-variant-numeric:tabular-nums}
#ab-graf ul{list-style:none;margin:5px 0 0;padding:0;display:grid;gap:3px}
#su-der #ab-graf li{display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:6px;align-items:center;font:400 10.5px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);background:none;border:0;border-radius:0;padding:0;min-height:0}
#su-der #ab-graf li:hover{background:none} #su-der #ab-graf li::before{display:none}
#su-der #ab-graf li i{display:block;width:16px;height:0;border-top:2px solid}
#su-der #ab-graf li i.d{border-top-style:dashed}
#su-der #ab-graf li b{font:600 14px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff;letter-spacing:.02em}
#ab-graf .ab-bod{margin-top:6px;display:grid;gap:3px;font:400 10.5px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4)}
#ab-graf .ab-bod div{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.1)} #ab-graf .ab-bod div u{position:absolute;left:0;top:0;bottom:0;border-radius:3px}
#ab-graf .ab-bod div s{position:absolute;right:0;top:-3px;bottom:-3px;width:2px;background:#ef4444}
#ab-capas{margin:8px 0 4px} #ab-capas h6{margin:0 0 4px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#ab-capas div{display:flex;flex-wrap:wrap;gap:4px}
#ab-capas button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:4px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);font:500 10.5px/1.1 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);flex:1 1 auto;justify-content:center}
#ab-capas button svg{flex:none;width:15px;height:10px} #ab-capas button span{white-space:nowrap}
@media (pointer:coarse){#ab-capas button{padding:8px 8px}}
#ab-capas button[aria-pressed="true"]{background:var(--ui-acc-bg,rgba(212,236,176,.14));border-color:rgba(212,236,176,.45);color:var(--ui-tx,#f1f3ee)}
#ab-capas button:focus-visible{outline:2px solid var(--ui-acc,#d4ecb0);outline-offset:1px}`;
export function htmlArriba() { /* sale cada vez que se abre la 01 (pintarPanel de sim_ui.js) */
  return `<div id="ab-alerta" role="alert">${ICO_ALERTA}<div><b>Alerta</b><strong>Está subiendo la demanda alimentaria en Kennedy</strong><small><i>Escenario ficticio</i>llegan familias nuevas a Kennedy y a la región que compra en Corabastos: cada año se pide más comida. Súbelo o bájalo con «Crecimiento de la demanda».</small></div><button type="button" aria-label="Cerrar la alerta" title="Cerrar">${ICO_X}</button></div>`;
}
export function htmlAbajo(prop) {
  return `<div id="ab-graf"><h6>Demanda frente a lo que llega · t/día</h6><p>Toda la comida de Kennedy, 15 años; líneas = promedio del último año (los meses de SIPSA mueven ±6 %), punto = esta semana. Límite: la demanda con la que la bodega más llena de Corabastos llega al 100 % (si todo lo que le llega crece al mismo ritmo).</p>
    <svg viewBox="0 0 260 118" role="img" aria-label="Demanda de Kennedy, comida que llega y límite de las bodegas en 15 años"><g class="ej"></g><path class="lim" fill="none" stroke="${COL.lim}" stroke-width="1.6" stroke-dasharray="5 3"/><path class="lle" fill="none" stroke="${prop ? COL.con : COL.sin}" stroke-width="3.2" stroke-opacity=".85"/><path class="dem" fill="none" stroke="${COL.dem}" stroke-width="1.3"/><line class="hoy" y1="6" y2="100" stroke="rgba(255,255,255,.25)" stroke-dasharray="2 2"/><circle class="pd" r="3" fill="${COL.dem}"/><circle class="pl" r="3" fill="${prop ? COL.con : COL.sin}"/><circle class="pm" r="3" fill="${COL.lim}"/></svg>
    <ul><li><i style="border-color:${COL.dem}"></i><span>Demanda de Kennedy</span><b data-ab="dem">—</b></li><li><i style="border-color:${prop ? COL.con : COL.sin}"></i><span>Comida que llega</span><b data-ab="lle">—</b></li><li><i class="d" style="border-color:${COL.lim}"></i><span>Límite de las bodegas</span><b data-ab="lim">—</b></li></ul>
    <div class="ab-bod"><span data-ab="bod">Bodega más llena: —</span><div><u data-ab="bar"></u><s title="100 % = tope"></s></div></div></div>
    <div id="ab-capas"><h6>Capas de la simulación 01</h6><div>${CAPAS.map(c => `<button type="button" data-capa="${c.k}" aria-pressed="true" title="${c.d}">${c.sw}<span>${c.n}</span></button>`).join('')}</div></div>`;
}
export function montar(der) {
  if (!document.getElementById('ab01-css')) { const st = document.createElement('style'); st.id = 'ab01-css'; st.textContent = CSS; document.head.appendChild(st); }
  const al = der.querySelector('#ab-alerta'); if (al) al.querySelector('button').onclick = () => al.remove();
  der.querySelectorAll('#ab-capas [data-capa]').forEach(b => { const C = window.KEN_AB01C, k = b.dataset.capa; if (C) b.setAttribute('aria-pressed', !!C.estado[k]);
    b.onclick = () => { const A = window.KEN_AB01C, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); if (k === 'bodegas' && window.KEN_CONT && window.KEN_CONT.verCora) window.KEN_CONT.verCora(!on); if (A) A.capa(k, on); else (window.KEN_AB01_PEND || (window.KEN_AB01_PEND = {}))[k] = on; }; });
}
/* H = historial de la corrida (un I por semana); FIN = semanas de la barra (780) */
export function actualizar(der, H, FIN = 780) {
  const g = der && der.querySelector('#ab-graf svg'); if (!g) return;
  if (!H || !H.length) { for (const c of ['.dem', '.lle', '.lim']) g.querySelector(c).setAttribute('d', ''); for (const c of ['.pd', '.pl', '.pm']) g.querySelector(c).setAttribute('r', 0); return; }
  const v = (h, k) => { const c = h.comidaK; if (!c) return null; if (k === 'dem') return c.dem; if (k === 'lle') return c.llega; const b = h.abasto && h.abasto.bodegas; return b && b.max > 0 ? c.dem / b.max : null; };
  /* las líneas son el promedio de las últimas 13 semanas (los meses de SIPSA mueven ±6 % la demanda semana a semana); el punto es esta semana */
  const PROM = 52, K = ['dem', 'lle', 'lim'], acc = [0, 0, 0], cnt = [0, 0, 0], pts = [];
  for (let i = 0; i < H.length; i++) { for (let j = 0; j < 3; j++) { const x = v(H[i], K[j]); if (x != null) { acc[j] += x; cnt[j]++; } if (i >= PROM) { const y = v(H[i - PROM], K[j]); if (y != null) { acc[j] -= y; cnt[j]--; } } }
    if (i % 2 === 0 || i === H.length - 1) pts.push({ sem: H[i].sem, m: [0, 1, 2].map(j => (cnt[j] ? acc[j] / cnt[j] : null)) }); }
  const vm = (p, k) => p.m[K.indexOf(k)];
  let mn = Infinity, mx = -Infinity; for (const p of pts) for (const k of K) { const x = vm(p, k); if (x != null) { if (x < mn) mn = x; if (x > mx) mx = x; } }
  { const L0 = H[H.length - 1]; for (const k of K) { const x = v(L0, k); if (x != null) { if (x < mn) mn = x; if (x > mx) mx = x; } } }
  if (!isFinite(mn)) return; const pad = Math.max(20, (mx - mn) * 0.12); mn = Math.max(0, Math.floor((mn - pad) / 50) * 50); mx = Math.ceil((mx + pad) / 50) * 50;
  const pl = 34, pr = 8, pt = 6, pb = 18, W = 260, Hh = 118, iw = W - pl - pr, ih = Hh - pt - pb, X = (s) => pl + (s - 1) / (FIN - 1) * iw, Y = (y) => pt + ih - (y - mn) / (mx - mn || 1) * ih;
  const path = (k) => { let d = '', n = 0; for (const p of pts) { const x = vm(p, k); if (x == null) { n = 0; continue; } d += (n++ ? 'L' : 'M') + X(p.sem).toFixed(1) + ' ' + Y(x).toFixed(1); } return d; };
  g.querySelector('.dem').setAttribute('d', path('dem')); g.querySelector('.lle').setAttribute('d', path('lle')); g.querySelector('.lim').setAttribute('d', path('lim'));
  const k0 = mn + '|' + mx; const ej = g.querySelector('.ej');
  if (ej._k !== k0) { ej._k = k0; const paso = (mx - mn) / 3; let s = '';
    for (let i = 0; i <= 3; i++) { const yv = mn + paso * i; s += `<line x1="${pl}" x2="${W - pr}" y1="${Y(yv).toFixed(1)}" y2="${Y(yv).toFixed(1)}" stroke="rgba(255,255,255,.07)"/><text x="${pl - 4}" y="${(Y(yv) + 3).toFixed(1)}" text-anchor="end">${nf(yv)}</text>`; }
    for (const a of [1, 5, 10, 15]) s += `<text x="${X((a - 1) * 52 + 1).toFixed(1)}" y="${Hh - 4}" text-anchor="middle">año ${a}</text>`; ej.innerHTML = s; }
  const L = H[H.length - 1], xh = X(L.sem).toFixed(1); const hoy = g.querySelector('.hoy'); hoy.setAttribute('x1', xh); hoy.setAttribute('x2', xh);
  for (const [k, c] of [['dem', '.pd'], ['lle', '.pl'], ['lim', '.pm']]) { const x = v(L, k), el = g.querySelector(c); if (x == null) { el.setAttribute('r', 0); continue; } el.setAttribute('r', 3); el.setAttribute('cx', xh); el.setAttribute('cy', Y(x).toFixed(1)); }
  const put = (k, t) => { const e = der.querySelector(`[data-ab="${k}"]`); if (e && e.textContent !== t) e.textContent = t; };
  put('dem', nf(v(L, 'dem'))); put('lle', nf(v(L, 'lle'))); put('lim', nf(v(L, 'lim')));
  const b = L.abasto && L.abasto.bodegas;
  if (b) { const pc = b.max * 100; put('bod', `Bodega más llena: ${b.nombre} (${b.grupo}) · ${nf(b.max < 1 ? Math.floor(pc) : pc)} % de su tope`); const u = der.querySelector('[data-ab="bar"]');
    if (u) { u.style.width = Math.min(100, pc).toFixed(1) + '%'; u.style.background = pc >= 100 ? '#ef4444' : pc >= 90 ? '#fbbf24' : '#4ade80'; } }
}
export { CAPAS };
