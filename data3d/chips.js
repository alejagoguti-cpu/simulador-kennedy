/* ============ CHIPS DEL MAPA (mismo estilo de la 01: data3d/abasto_contenedor.js) ============
   window.KEN_CHIPS = { poner(grupo, lista), quitar(grupo) } · lista = [{ x, y, z, ico, txt, col, title }]
   Vidrio oscuro, ícono plano de línea (SVG, no emoji) y poco texto (el número); se proyectan cada cuadro sobre su lugar en el mundo.
   Pedido de la autora (2026-11-27): «que aparezcan como en la simulación 1, el ícono flat», en todas las simulaciones. */
const P = (d) => `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" style="display:inline-block;vertical-align:-2px;margin-right:5px;flex:none" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICO = {
  via: P('<path d="M5 1.5 3 14.5M11 1.5l2 13M8 3v2M8 7.5v2M8 12v2"/>'),
  cierre: P('<path d="M2 6h12v4H2zM4 6l2 4M8 6l2 4M12 6l2 4M3.5 10v4M12.5 10v4"/>'),
  barrio: P('<path d="M2 14V7l4-3 4 3v7M10 14V9h4v5M5 14v-3h2v3"/>'),
  pasaje: P('<circle cx="8" cy="3" r="1.4"/><path d="M8 5v4l-2 5M8 9l2 5M5 7h6"/>'),
  basura: P('<path d="M2.5 4.5h11M6 4.5V2.5h4v2M4 4.5l.8 9.5h6.4l.8-9.5M6.5 7v5M9.5 7v5"/>'),
  estacion: P('<path d="M8 2.2 10 5.5H6zM12.6 10.5l-1.9 3.3-1.9-3.3zM3.4 10.5h3.8L5.3 13.8z"/><path d="M9 5.2c2 .8 3.2 2.6 3.3 4.6M10 13.5c-1.4.6-3 .6-4.3 0M3.7 9.8c.1-2 1.3-3.8 3.2-4.6"/>'),
  fabrica: P('<path d="M1.5 14V8l4-2.5V8l4-2.5V8l4-2.5V14zM4 11h1.5M7.5 11H9M11 11h1.5"/>'),
  brote: P('<path d="M8 14V8M8 8c0-3 2-5 5.5-5 0 3-2 5-5.5 5zM8 10C8 8 6.3 6.3 2.8 6.3 2.8 8.3 4.5 10 8 10z"/>'),
  ave: P('<path d="M1.5 8.5c2-2.5 4.5-3 6.5-1.5 2-1.5 4.5-1 6.5 1.5M8 7v5"/>'),
  agua: P('<path d="M8 2s4.5 4.6 4.5 7.6A4.5 4.5 0 0 1 3.5 9.6C3.5 6.6 8 2 8 2z"/>'),
  arbol: P('<path d="M8 14v-4M8 10c-3 0-4.5-1.6-4.5-3.8C3.5 4 5.5 2 8 2s4.5 2 4.5 4.2C12.5 8.4 11 10 8 10z"/>'),
  alerta: P('<path d="M8 2 14.5 13.5h-13zM8 6.5v3.2M8 11.6v.1"/>'),
  torre: P('<path d="M4 14.5V2.5h8v12M6.5 5h1M8.5 5h1M6.5 8h1M8.5 8h1M6.5 11h1M8.5 11h1"/>'),
  gente: P('<circle cx="5.5" cy="5" r="1.8"/><circle cx="11" cy="5.5" r="1.5"/><path d="M2 13c.4-2.6 1.8-4 3.5-4s3.1 1.4 3.5 4M9 9.2c.6-.4 1.2-.6 2-.6 1.6 0 2.7 1.2 3 3.4"/>'),
  alcaldia: P('<path d="M2 14h12M3 14V7h10v7M2 7l6-4.5L14 7M5.5 14V9.5M8 14V9.5M10.5 14V9.5"/>'),
  red: P('<circle cx="8" cy="3" r="1.6"/><circle cx="3" cy="12.5" r="1.6"/><circle cx="13" cy="12.5" r="1.6"/><path d="M7.2 4.4 3.8 11M8.8 4.4l3.4 6.6M4.6 12.5h6.8"/>')
};
const CSS = 'position:fixed;z-index:6;pointer-events:auto;transform:translate(-50%,-100%);display:none;align-items:center;padding:4px 9px;border-radius:10px;background:linear-gradient(180deg,rgba(40,44,52,.78),rgba(20,22,28,.88));border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f2f3f5;font:600 11px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35)';
export function crearChips({ T3, RELOJ }) {
  if (window.KEN_CHIPS) return window.KEN_CHIPS;
  const G = new Map(), v = new (T3.THREE.Vector3)(), pool = []; let usados = 0;
  const el = (i) => { if (!pool[i]) { const d = document.createElement('div'); d.className = 'ken-chip'; d.style.cssText = CSS; document.body.appendChild(d); pool[i] = d; } return pool[i]; };
  RELOJ.alDibujar(() => { const C = T3.camera, cv = T3.renderer && T3.renderer.domElement; if (!C || !cv) return; const R = cv.getBoundingClientRect(); let i = 0;
    for (const L of G.values()) for (const c of L) { v.set(c.x, c.y != null ? c.y : (T3.sueloY || 0.3) + 40, c.z).project(C); if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      const d = el(i++), h = (ICO[c.ico] || '') + '<span>' + c.txt + '</span>', k = h + (c.col || ''); if (d._k !== k) { d.innerHTML = h; d.style.color = c.col || '#f2f3f5'; d.style.borderColor = c.col ? c.col + '88' : 'rgba(255,255,255,.16)'; d._k = k; } if (c.title) d.title = c.title;
      d.style.left = (R.left + (v.x + 1) / 2 * R.width) + 'px'; d.style.top = (R.top + (1 - v.y) / 2 * R.height) + 'px'; d.style.display = 'flex'; }
    for (let j = i; j < usados; j++) pool[j].style.display = 'none'; usados = i; });
  const api = { poner(g, lista) { if (lista && lista.length) G.set(g, lista); else G.delete(g); }, quitar(g) { G.delete(g); } };
  window.KEN_CHIPS = api; return api;
}
