/* ============ FEED DE EVENTOS (cinta arriba, en el centro del mapa) ============
   Reemplaza las tarjetas que salían arriba al centro (data3d/sim_ui.js: avisar → mostrarAviso). Una cinta de vidrio de una línea, bajo el
   selector «Kennedy sin / con propuesta», centrada en el espacio libre del mapa (entre el panel izquierdo y el tablero de la derecha):
   ícono de línea del tipo (SVG, sin emojis) · sello Año/Semana en mono · título del último evento · «Ver» · contador · desplegar.
   Al desplegar sale la lista completa (máx. ~50 vh, con scroll). Cada evento nuevo ilumina la cinta. La cámara NUNCA va sola a una muerte:
   solo al tocar «Ver» (vuelo, animal sobre la X, marca y zoom del momento).
   «Ver» vuela al lugar (y pasa a «Seguir»). Las posiciones salen de las variables de data3d/urbia.css (--lp-izq-w, --lp-tab-sp, --lp-gap).
   crearFeed({ alVer(ev, fila), alSeguir(ev, fila) }) → { agregar(ev) → fila, viendo(fila, on), limpiar(), raiz, get auto() } */

const GUARDADAS = 60;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* íconos de línea 16×16 (trazo 1.5, currentColor) */
const P = {
  muerte: '<path d="M4 4l8 8M12 4l-8 8"/>',
  especies: '<path d="M2.5 9.5c2-.2 3.4-1.4 4.2-3.3.6-1.4 1.8-2.2 3.2-2.2 1.2 0 2 .6 2.6 1.3l1.5.4-1.4.9c0 3-2.3 5.4-5.6 5.4H4.5"/><path d="M6.5 11.8l-.8 2M9 11.6l.4 2"/>',
  ruido: '<path d="M3 6.3h2.2L8.2 3.8v8.4L5.2 9.7H3z"/><path d="M10.6 5.6a3.4 3.4 0 010 4.8M12.6 3.8a6 6 0 010 8.4"/>',
  trafico: '<path d="M2.5 10.5V8.3l1.6-3.4c.2-.5.7-.8 1.2-.8h5.4c.5 0 1 .3 1.2.8l1.6 3.4v2.2z"/><path d="M2.5 10.5v1.8M13.5 10.5v1.8"/><circle cx="5" cy="8.8" r=".6"/><circle cx="11" cy="8.8" r=".6"/>',
  residuos: '<path d="M3.5 4.5h9M6.3 4.5V3h3.4v1.5M4.6 4.5l.7 8.6h5.4l.7-8.6"/><path d="M7 6.8v4.3M9 6.8v4.3"/>',
  huertas: '<path d="M8 13.5V7.5"/><path d="M8 8.5C8 5.8 6.2 4 3.5 4c0 2.7 1.8 4.5 4.5 4.5zM8 7.2c0-2.4 1.6-4 4.5-4 0 2.4-1.6 4-4.5 4z"/><path d="M4 13.5h8"/>',
  comida: '<path d="M2.5 6.5h11l-1.3 6.2c-.1.5-.5.8-1 .8H4.8c-.5 0-.9-.3-1-.8z"/><path d="M5.5 6.5l2-3.5M10.5 6.5l-2-3.5"/>',
  metro: '<rect x="4" y="2.5" width="8" height="9" rx="2"/><path d="M4 7.5h8M6 13.5l-1-2M10 13.5l1-2"/><circle cx="6.2" cy="9.6" r=".5"/><circle cx="9.8" cy="9.6" r=".5"/>',
  edificio: '<path d="M3 13.5V5l5-2.5V13.5M8 6.5h5v7M2 13.5h12"/><path d="M5 7v.01M5 9.5v.01M10.5 9v.01M10.5 11.3v.01"/>',
  alerta: '<path d="M8 2.8l5.8 10.2H2.2z"/><path d="M8 7v2.6M8 11.2v.01"/>',
  punto: '<circle cx="8" cy="8" r="2.4"/>'
};
const ICONO = { especies: 'especies', polinizadores: 'especies', ruido: 'ruido', trafico: 'trafico', residuos: 'residuos', huertas: 'huertas', comida: 'comida', metro: 'metro', corabastos: 'edificio', obra: 'edificio', gameover: 'alerta' };
const esMuerteEv = (ev) => /muri[oó]|atropell|se estrell/i.test(ev.titulo || '');
const icono = (ev) => `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${P[esMuerteEv(ev) ? 'muerte' : ICONO[ev.tipo] || 'punto']}</svg>`;
const CHEV = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';

const CSS = `
#su-feed{--fe-gap:var(--lp-gap,14px);position:fixed;z-index:44;top:66px;left:calc(var(--fe-gap) + var(--lp-izq-w,288px) + 24px);right:calc(var(--fe-gap) + var(--lp-tab-sp,0px) + 24px);
  width:auto;max-width:600px;margin-inline:auto;box-sizing:border-box;display:flex;flex-direction:column;border-radius:12px;color:var(--ui-tx,#eef0ea);
  font:400 12px/1.4 var(--ui-sans,'Inter',system-ui,-apple-system,'Segoe UI',sans-serif);
  background:var(--ui-glass,rgba(22,27,25,.86));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:var(--ui-glass-sh,0 14px 38px rgba(0,0,0,.24));
  -webkit-backdrop-filter:var(--ui-glass-fx,none);backdrop-filter:var(--ui-glass-fx,none);overflow:hidden}
#su-feed[hidden]{display:none}
/* cinta: una línea */
#su-feed .fe-h{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 4px 0 12px;cursor:pointer;border-radius:12px}
#su-feed .fe-h>svg{flex:none;color:var(--fe-c,var(--ui-tx2,#c2c8bb))}
#su-feed .fe-h.mal{--fe-c:#e8968b}#su-feed .fe-h.bien{--fe-c:var(--ui-acc,#d4ecb0)}
#su-feed .fe-st{flex:none;font:500 10.5px/1 var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);color:var(--ui-tx3,#a5ae9f);font-variant-numeric:tabular-nums;letter-spacing:.02em}
#su-feed .fe-tt{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;font-size:12.5px;color:var(--ui-tx,#f1f3ee)}
#su-feed .fe-tt small{font-weight:400;font-size:11.5px;color:var(--ui-tx3,#a5ae9f);margin-left:8px}
#su-feed .fe-n{flex:none;min-width:22px;height:20px;padding:0 6px;box-sizing:border-box;display:grid;place-items:center;border-radius:6px;background:rgba(255,255,255,.08);
  font:500 10.5px/1 var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);color:var(--ui-tx2,#c9cfc4);font-variant-numeric:tabular-nums}
#su-feed .fe-tg{all:unset;flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:8px;cursor:pointer;color:var(--ui-tx2,#c9cfc4)}
#su-feed .fe-tg:hover{background:rgba(255,255,255,.08)}
#su-feed .fe-tg svg{transition:rotate .2s}#su-feed.abierto .fe-tg svg{rotate:180deg}
#su-feed .fe-v{all:unset;flex:none;box-sizing:border-box;cursor:pointer;height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--ui-bd2,rgba(255,255,255,.2));
  font:500 11px/24px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#f1f3ee);transition:background-color .15s,border-color .15s}
#su-feed .fe-v:hover{background:rgba(255,255,255,.1)}
#su-feed .fe-v.on{background:var(--ui-acc,#d4ecb0);border-color:transparent;color:var(--ui-acc-ink,#1e2918)}
#su-feed .fe-v[hidden]{display:none}
#su-feed :is(.fe-v,.fe-tg):focus-visible{outline:2px solid var(--ui-acc,#d4ecb0);outline-offset:2px}
/* desplegable con todo el historial */
#su-feed .fe-cuerpo{display:flex;flex-direction:column;min-height:0;max-height:min(50dvh,460px);border-top:1px solid var(--ui-bd,rgba(255,255,255,.1))}
#su-feed .fe-cuerpo[hidden]{display:none}
#su-feed .fe-bar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px}
#su-feed .fe-bar b{font:500 12px/1 var(--ui-tit,'Barlow Condensed',system-ui,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#su-feed .fe-nota{font-size:10.5px;color:var(--ui-tx3,#a5ae9f)}
#su-feed .fe-auto{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:11px;color:var(--ui-tx2,#c9cfc4);user-select:none}
#su-feed .fe-auto input{appearance:none;-webkit-appearance:none;margin:0;width:26px;height:15px;border-radius:8px;background:rgba(255,255,255,.16);position:relative;cursor:pointer;transition:background-color .2s}
#su-feed .fe-auto input::after{content:'';position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:#e8ebe4;transition:translate .2s}
#su-feed .fe-auto input:checked{background:var(--ui-acc,#d4ecb0)}#su-feed .fe-auto input:checked::after{translate:11px 0;background:#1b2118}
#su-feed .fe-auto input:focus-visible{outline:2px solid var(--ui-acc,#d4ecb0);outline-offset:2px}
#su-feed ol{list-style:none;margin:0;padding:0;overflow:auto;overscroll-behavior:contain;min-height:0;--sb-thumb:rgba(212,236,176,.42);scrollbar-width:thin;scrollbar-color:var(--sb-thumb) transparent}
#su-feed li.fe{position:relative;display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:2px 10px;align-items:start;padding:8px 12px;border-top:1px solid var(--ui-bd,rgba(255,255,255,.07))}
#su-feed li.fe::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:2px;border-radius:0 2px 2px 0;background:var(--fe-c,rgba(255,255,255,.22))}
#su-feed li.fe.mal{--fe-c:#e8968b}#su-feed li.fe.bien{--fe-c:var(--ui-acc,#d4ecb0)}
#su-feed li.fe>svg{margin-top:14px;color:var(--fe-c,var(--ui-tx2,#c9cfc4))}
#su-feed .fe-m{min-width:0}
#su-feed .fe-s{display:flex;gap:8px;align-items:baseline;font:500 10px/1.2 var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);color:var(--ui-tx3,#a5ae9f);letter-spacing:.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden}
#su-feed .fe-s span{overflow:hidden;text-overflow:ellipsis;font-family:var(--ui-sans,'Inter',system-ui,sans-serif);letter-spacing:0}
#su-feed .fe-t{display:block;margin:2px 0 1px;font-weight:600;font-size:12.5px;line-height:1.3;color:var(--ui-tx,#f1f3ee)}
#su-feed .fe-x{margin:0;color:var(--ui-tx2,#c9cfc4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#su-feed li.fe.viendo{background:rgba(255,255,255,.06)}#su-feed li.fe.viendo .fe-x{white-space:normal}
#su-feed li.fe .fe-v{margin-top:10px;height:24px;line-height:22px}
#su-feed li.fe.viendo .fe-v{background:var(--ui-acc,#d4ecb0);border-color:transparent;color:var(--ui-acc-ink,#1e2918)}
.fe-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion:no-preference){
  #su-feed.flash .fe-h{animation:fe-flash 1.6s ease-out}
  @keyframes fe-flash{0%,18%{background:rgba(212,236,176,.22)}100%{background:transparent}}
  #su-feed .fe-cuerpo{animation:fe-baja .18s ease-out}
  @keyframes fe-baja{from{opacity:0;translate:0 -4px}to{opacity:1;translate:0 0}}
}
@media (prefers-reduced-motion:reduce){#su-feed.flash .fe-h{background:rgba(212,236,176,.16)}}
@media (max-width:699px){
  #su-feed{top:108px;left:8px;right:8px;max-width:none;margin:0;border-radius:12px}
  #su-feed .fe-tt small{display:none}
  #su-feed .fe-cuerpo{max-height:50dvh}
}
`;

export function crearFeed({ alVer, alSeguir } = {}) {
  if (!document.getElementById('su-feed-css')) { const st = document.createElement('style'); st.id = 'su-feed-css'; st.textContent = CSS; document.head.appendChild(st); }
  const raiz = document.createElement('aside'); raiz.id = 'su-feed'; raiz.setAttribute('role', 'region'); raiz.setAttribute('aria-label', 'Eventos de la simulación'); raiz.hidden = true;
  /* sin vuelo automático a las muertes (pedido de la autora): no hay interruptor y un valor viejo guardado no lo puede prender */
  try { localStorage.removeItem('ken-feed-auto'); } catch (e) { /* sin almacenamiento */ }
  raiz.innerHTML = `<div class="fe-h"><span class="fe-ico"></span><span class="fe-st"></span><b class="fe-tt"></b>
      <button type="button" class="fe-v fe-hv" hidden>Ver</button>
      <span class="fe-n" title="Eventos de esta corrida">0</span>
      <button type="button" class="fe-tg" aria-expanded="false" aria-controls="fe-cuerpo" aria-label="Mostrar todos los eventos">${CHEV}</button></div>
    <div class="fe-cuerpo" id="fe-cuerpo" hidden>
      <div class="fe-bar"><b>Historial</b><span class="fe-nota">«Ver» lleva la cámara al lugar</span></div>
      <ol class="fe-l"></ol></div>
    <p class="fe-sr" aria-live="polite"></p>`;
  document.body.appendChild(raiz);
  const $ = (s) => raiz.querySelector(s);
  const H = $('.fe-h'), L = $('.fe-l'), C = $('.fe-cuerpo'), N = $('.fe-n'), TG = $('.fe-tg'), HV = $('.fe-hv'), vivo = $('.fe-sr');

  function abrir(on) { raiz.classList.toggle('abierto', on); C.hidden = !on; TG.setAttribute('aria-expanded', on); TG.setAttribute('aria-label', on ? 'Ocultar el historial de eventos' : 'Mostrar todos los eventos'); }
  TG.onclick = (e) => { e.stopPropagation(); abrir(C.hidden); };
  H.onclick = (e) => { if (e.target.closest('button')) return; abrir(C.hidden); };
  /* el botón de la cinta actúa sobre el evento que se está viendo («Seguir») o, si no hay, sobre el último («Ver») */
  HV.onclick = (e) => { e.stopPropagation(); const f = L.querySelector('li.viendo') || L.firstElementChild, b = f && f.querySelector('.fe-v'); if (b) b.click(); };
  /* se cierra al tocar fuera o con Esc */
  document.addEventListener('pointerdown', (e) => { if (!C.hidden && !raiz.contains(e.target)) abrir(false); });
  raiz.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !C.hidden) { abrir(false); TG.focus(); } });
  let total = 0;

  const sello = (ev) => { if (ev.sem == null) return ''; const a = Math.floor(ev.sem / 52) + 1, s = (ev.sem % 52) + 1; return `A${String(a).padStart(2, '0')}&#8239;·&#8239;S${String(s).padStart(2, '0')}`; };
  /* la cinta muestra la primera fila (el último evento) */
  function sincr() {
    N.textContent = total; const f = L.querySelector('li.viendo') || L.firstElementChild;
    if (!f) { $('.fe-ico').outerHTML = '<span class="fe-ico"></span>'; $('.fe-st').innerHTML = ''; $('.fe-tt').textContent = ''; HV.hidden = true; return; }
    const ev = f._ev; H.classList.toggle('mal', ev.signo < 0); H.classList.toggle('bien', ev.signo > 0);
    $('.fe-ico').outerHTML = icono(ev).replace('<svg ', '<svg class="fe-ico" ');
    $('.fe-st').innerHTML = f._sello || '';
    $('.fe-tt').innerHTML = `${esc(ev.titulo)}${ev.lugar ? `<small>${esc(ev.lugar)}</small>` : ''}`; $('.fe-tt').title = [ev.titulo, ev.texto].filter(Boolean).join('. ');
    const b = f.querySelector('.fe-v'); HV.hidden = !b; const on = f.classList.contains('viendo'); HV.textContent = on ? 'Seguir' : 'Ver'; HV.classList.toggle('on', on);
  }
  function anunciar(ev) {
    const t = `${ev.titulo}. ${ev.lugar || ''}`; try { if (document.ariaNotify) { document.ariaNotify(t); return; } } catch (e) { /* nada */ } vivo.textContent = t;
  }
  function destello() { raiz.classList.remove('flash'); void raiz.offsetWidth; raiz.classList.add('flash'); clearTimeout(destello.t); destello.t = setTimeout(() => raiz.classList.remove('flash'), 1700); }
  function agregar(ev) {
    const li = document.createElement('li'); li.className = 'fe ' + (ev.signo > 0 ? 'bien' : ev.signo < 0 ? 'mal' : ''); li._ev = ev; li._sello = sello(ev);
    const puede = ev.x != null || ev.capa;
    li.innerHTML = `${icono(ev)}<div class="fe-m"><div class="fe-s">${li._sello ? `<b>${li._sello}</b>` : ''}${ev.lugar ? `<span>${esc(ev.lugar)}</span>` : ''}</div><b class="fe-t">${esc(ev.titulo)}</b>${ev.texto ? `<p class="fe-x" title="${esc(ev.texto)}">${esc(ev.texto)}</p>` : ''}</div>${puede ? '<button type="button" class="fe-v">Ver</button>' : '<span></span>'}`;
    const b = li.querySelector('.fe-v'); if (b) b.onclick = () => li.classList.contains('viendo') ? alSeguir && alSeguir(ev, li) : alVer && alVer(ev, li);
    L.prepend(li); total++; raiz.hidden = false;
    while (L.children.length > GUARDADAS) L.lastElementChild.remove();
    sincr(); destello(); anunciar(ev);
    return li;
  }
  function viendo(li, on) {
    if (!li) return; li.classList.toggle('viendo', !!on); const b = li.querySelector('.fe-v'); if (b) b.textContent = on ? 'Seguir' : 'Ver';
    if (on) abrir(false); /* el historial se cierra para dejar ver el lugar; la cinta muestra el evento que se está viendo, con «Seguir» */
    sincr();
  }
  function limpiar() { L.innerHTML = ''; total = 0; sincr(); raiz.hidden = true; abrir(false); }
  return { agregar, viendo, limpiar, raiz, get auto() { return false; } }; /* compatibilidad: nunca hay vuelo automático */
}
