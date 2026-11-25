/* ============ FEED DE EVENTOS (columna derecha) ============
   Reemplaza las tarjetas que salían arriba al centro (data3d/sim_ui.js: avisar → mostrarAviso). Cada evento del modelo entra como una
   fila compacta arriba de la lista: sello Año/Semana en mono, ícono de línea por tipo (SVG, sin emojis), título, una línea de detalle y
   el lugar. Se ven las 6 más recientes; las anteriores quedan en «N eventos anteriores» (desplegable). «Ver» vuela al lugar.
   Escritorio: columna de vidrio a la derecha (top 66 px, 320 px). Celular (< 700 px): una cinta delgada abajo, sobre la barra de años,
   que muestra solo el último y se despliega hacia arriba.
   crearFeed({ alVer(ev, fila), alSeguir(ev, fila) }) → { agregar(ev) → fila, viendo(fila, on), limpiar(), get auto() } */

const VISIBLES = 6, GUARDADAS = 60;
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

const CSS = `
#su-feed{position:fixed;top:66px;right:14px;z-index:44;box-sizing:border-box;width:320px;max-height:calc(100dvh - 160px);display:flex;flex-direction:column;
  border-radius:16px;color:var(--ui-tx,#eef0ea);font:400 12px/1.4 var(--ui-sans,'Inter','Geist',system-ui,-apple-system,'Segoe UI',sans-serif);
  background:var(--ui-glass,linear-gradient(135deg,rgba(74,80,72,.6),rgba(31,38,36,.76)));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  box-shadow:var(--ui-glass-sh,0 14px 38px rgba(0,0,0,.24));-webkit-backdrop-filter:var(--ui-glass-fx,blur(18px));backdrop-filter:var(--ui-glass-fx,blur(18px));overflow:hidden}
#su-feed[hidden]{display:none}
#su-feed .fe-h{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:1px solid var(--ui-bd,rgba(255,255,255,.1))}
#su-feed .fe-h h2{all:unset;font:500 10.5px/1 var(--ui-sans,'Inter',system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-tx2,#c2c8bb)}
#su-feed .fe-n{font:500 10.5px/1 'JetBrains Mono',ui-monospace,monospace;color:var(--ui-tx3,#a3ad9a);font-variant-numeric:tabular-nums}
#su-feed .fe-sp{flex:1}
#su-feed .fe-auto{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10.5px;color:var(--ui-tx3,#a3ad9a);user-select:none}
#su-feed .fe-auto input{appearance:none;-webkit-appearance:none;margin:0;width:24px;height:14px;border-radius:7px;background:rgba(255,255,255,.14);position:relative;cursor:pointer;transition:background-color .2s}
#su-feed .fe-auto input::after{content:'';position:absolute;top:2px;left:2px;width:10px;height:10px;border-radius:50%;background:#e8ebe4;transition:translate .2s}
#su-feed .fe-auto input:checked{background:var(--ui-acc,#b9d89a)}#su-feed .fe-auto input:checked::after{translate:10px 0;background:#1b2118}
#su-feed .fe-tg{display:none}
#su-feed ol{list-style:none;margin:0;padding:0}
#su-feed .fe-cuerpo{overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent;min-height:0}
#su-feed .fe-vacio{padding:12px;color:var(--ui-tx3,#a3ad9a);font-size:11.5px}
#su-feed li.fe{position:relative;display:grid;grid-template-columns:16px minmax(0,1fr) auto;gap:2px 9px;align-items:start;padding:9px 12px 9px 13px;border-bottom:1px solid var(--ui-bd,rgba(255,255,255,.07))}
#su-feed li.fe::before{content:'';position:absolute;left:0;top:9px;bottom:9px;width:2px;border-radius:0 2px 2px 0;background:var(--fe-c,rgba(255,255,255,.25))}
#su-feed li.fe.mal{--fe-c:#e48a7f}#su-feed li.fe.bien{--fe-c:var(--ui-acc,#b9d89a)}
#su-feed li.fe>svg{margin-top:15px;color:var(--fe-c,var(--ui-tx2,#c2c8bb))}
#su-feed .fe-m{min-width:0}
#su-feed .fe-s{display:flex;gap:7px;align-items:baseline;font:500 10px/1.2 'JetBrains Mono',ui-monospace,monospace;color:var(--ui-tx3,#a3ad9a);letter-spacing:.02em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden}
#su-feed .fe-s span{overflow:hidden;text-overflow:ellipsis;font-family:var(--ui-sans,'Inter',system-ui,sans-serif);letter-spacing:0}
#su-feed .fe-t{display:block;margin:2px 0 1px;font-weight:600;font-size:12.5px;line-height:1.25;color:var(--ui-tx,#eef0ea)}
#su-feed .fe-x{margin:0;color:var(--ui-tx2,#c2c8bb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#su-feed li.fe.viendo{background:rgba(255,255,255,.06)}
#su-feed li.fe.viendo .fe-x{white-space:normal}
#su-feed .fe-v{all:unset;box-sizing:border-box;cursor:pointer;margin-top:12px;height:24px;padding:0 9px;border-radius:7px;border:1px solid var(--ui-bd,rgba(255,255,255,.18));font:500 11px/22px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#eef0ea);transition:background-color .15s,border-color .15s}
#su-feed .fe-v:hover{background:rgba(255,255,255,.1)}
#su-feed li.fe.viendo .fe-v{background:var(--ui-acc,#b9d89a);border-color:transparent;color:var(--ui-acc-ink,#162012)}
#su-feed .fe-v:focus-visible,#su-feed summary:focus-visible,#su-feed .fe-tg:focus-visible{outline:2px solid var(--ui-acc,#b9d89a);outline-offset:2px}
#su-feed details{border-top:1px solid var(--ui-bd,rgba(255,255,255,.07))}
#su-feed summary{cursor:pointer;list-style:none;padding:8px 13px;font-size:11px;color:var(--ui-tx3,#a3ad9a)}
#su-feed summary::-webkit-details-marker{display:none}
#su-feed summary::before{content:'';display:inline-block;width:5px;height:5px;margin:0 8px 2px 0;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;rotate:-45deg;transition:rotate .2s}
#su-feed details[open] summary::before{rotate:45deg}
#su-feed details li.fe{padding-top:7px;padding-bottom:7px}
#su-feed details li.fe .fe-x{display:none}
#su-feed details li.fe>svg{margin-top:13px}#su-feed details li.fe .fe-v{margin-top:9px}
.fe-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion:no-preference){
  #su-feed li.fe.nuevo{animation:fe-in .42s cubic-bezier(.2,.7,.2,1) both}
  @keyframes fe-in{from{opacity:0;translate:14px 0}to{opacity:1;translate:0 0}}
}
@media (min-width:701px) and (max-width:1099px){#su-feed{width:290px}}
@media (max-width:700px){
  #su-feed{top:auto;bottom:84px;left:12px;right:12px;width:auto;max-height:46dvh;border-radius:13px}
  #su-feed .fe-h{padding:0 6px 0 10px;min-height:38px;border-bottom:0}
  #su-feed .fe-h h2,#su-feed .fe-auto span{display:none}
  #su-feed .fe-tg{all:unset;display:grid;place-items:center;width:32px;height:32px;cursor:pointer;color:var(--ui-tx2,#c2c8bb)}
  #su-feed .fe-tg svg{transition:rotate .2s}#su-feed.abierto .fe-tg svg{rotate:180deg}
  #su-feed .fe-ult{flex:1;min-width:0;display:flex;gap:7px;align-items:baseline;white-space:nowrap;overflow:hidden;font-size:12px}
  #su-feed .fe-ult i{font:normal 500 10px 'JetBrains Mono',ui-monospace,monospace;color:var(--ui-tx3,#a3ad9a)}
  #su-feed .fe-ult b{font-weight:600;overflow:hidden;text-overflow:ellipsis}
  #su-feed .fe-n,#su-feed .fe-sp{display:none}
  #su-feed:not(.abierto) .fe-cuerpo{display:none}
  #su-feed.abierto{flex-direction:column-reverse}
  #su-feed.abierto .fe-h{border-top:1px solid var(--ui-bd,rgba(255,255,255,.1))}
}
@media (min-width:701px){#su-feed .fe-ult{display:none}}
`;

export function crearFeed({ alVer, alSeguir } = {}) {
  if (!document.getElementById('su-feed-css')) { const st = document.createElement('style'); st.id = 'su-feed-css'; st.textContent = CSS; document.head.appendChild(st); }
  const raiz = document.createElement('aside'); raiz.id = 'su-feed'; raiz.setAttribute('role', 'region'); raiz.setAttribute('aria-label', 'Eventos de la simulación'); raiz.hidden = true;
  let auto = true; try { auto = localStorage.getItem('ken-feed-auto') !== '0'; } catch (e) { /* sin almacenamiento */ }
  raiz.innerHTML = `<div class="fe-h"><h2>Eventos</h2><span class="fe-n">0</span><span class="fe-ult" aria-hidden="true"></span><span class="fe-sp"></span>
    <label class="fe-auto" title="Cuando muere un animal la cámara va sola al lugar (como mucho una vez por año simulado)"><span>Ir a cada muerte</span><input type="checkbox" role="switch" ${auto ? 'checked' : ''} aria-label="Ir automáticamente a cada muerte"></label>
    <button type="button" class="fe-tg" aria-expanded="false" aria-label="Mostrar eventos"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 10l4-4 4 4"/></svg></button></div>
    <div class="fe-cuerpo"><ol class="fe-l"></ol><details hidden><summary></summary><ol class="fe-a"></ol></details></div>
    <p class="fe-sr" aria-live="polite"></p>`;
  document.body.appendChild(raiz);
  const L = raiz.querySelector('.fe-l'), A = raiz.querySelector('.fe-a'), D = raiz.querySelector('details'), S = raiz.querySelector('summary'), N = raiz.querySelector('.fe-n'), U = raiz.querySelector('.fe-ult'), vivo = raiz.querySelector('.fe-sr');
  raiz.querySelector('.fe-auto input').onchange = (e) => { auto = e.target.checked; try { localStorage.setItem('ken-feed-auto', auto ? '1' : '0'); } catch (er) { /* nada */ } };
  const tg = raiz.querySelector('.fe-tg'); tg.onclick = () => { const on = raiz.classList.toggle('abierto'); tg.setAttribute('aria-expanded', on); tg.setAttribute('aria-label', on ? 'Ocultar eventos' : 'Mostrar eventos'); };
  let total = 0;

  const sello = (ev) => { if (ev.sem == null) return ''; const a = Math.floor(ev.sem / 52) + 1, s = (ev.sem % 52) + 1; return `A${String(a).padStart(2, '0')}&#8239;·&#8239;S${String(s).padStart(2, '0')}`; };
  function contar() {
    N.textContent = total; const n = A.children.length; D.hidden = !n; S.textContent = `${n} evento${n === 1 ? '' : 's'} anterior${n === 1 ? '' : 'es'}`;
    const f = L.firstElementChild; U.innerHTML = f ? `<i>${f._sello}</i><b>${esc(f._ev.titulo)}</b>` : '';
  }
  function anunciar(ev) {
    const t = `${ev.titulo}. ${ev.lugar || ''}`; try { if (document.ariaNotify) { document.ariaNotify(t); return; } } catch (e) { /* nada */ } vivo.textContent = t;
  }
  function agregar(ev) {
    const li = document.createElement('li'); li.className = 'fe nuevo ' + (ev.signo > 0 ? 'bien' : ev.signo < 0 ? 'mal' : ''); li._ev = ev; li._sello = sello(ev);
    const puede = ev.x != null || ev.capa;
    li.innerHTML = `${icono(ev)}<div class="fe-m"><div class="fe-s">${li._sello ? `<b>${li._sello}</b>` : ''}${ev.lugar ? `<span>${esc(ev.lugar)}</span>` : ''}</div><b class="fe-t">${esc(ev.titulo)}</b>${ev.texto ? `<p class="fe-x" title="${esc(ev.texto)}">${esc(ev.texto)}</p>` : ''}</div>${puede ? '<button type="button" class="fe-v">Ver</button>' : '<span></span>'}`;
    const b = li.querySelector('.fe-v'); if (b) b.onclick = () => li.classList.contains('viendo') ? alSeguir && alSeguir(ev, li) : alVer && alVer(ev, li);
    li.addEventListener('animationend', () => li.classList.remove('nuevo'), { once: true });
    L.prepend(li); total++; raiz.hidden = false;
    while (L.children.length > VISIBLES) { const v = L.lastElementChild; v.classList.remove('nuevo'); A.prepend(v); }
    while (A.children.length > GUARDADAS - VISIBLES) A.lastElementChild.remove();
    contar(); anunciar(ev);
    return li;
  }
  function viendo(li, on) {
    if (!li) return; li.classList.toggle('viendo', !!on); const b = li.querySelector('.fe-v'); if (b) b.textContent = on ? 'Seguir' : 'Ver';
    if (on && li.parentElement === A) { D.open = true; }
    if (on) li.scrollIntoView({ block: 'nearest' });
  }
  function limpiar() { L.innerHTML = ''; A.innerHTML = ''; total = 0; contar(); raiz.hidden = true; raiz.classList.remove('abierto'); }
  return { agregar, viendo, limpiar, raiz, get auto() { return auto; } };
}
