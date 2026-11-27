/* ============ ZOOM DEL MOMENTO (columna derecha, siempre activo; pedido de la autora 2026-11-27) ============
   Recuadro arriba a la derecha que AMPLÍA la escena real alrededor del lugar de lo que está pasando ahora; cada 12 s pasa al siguiente momento.
   «Seguir» lleva la cámara principal a ese lugar.
   · Momentos: los publica la capa de cada simulación en window.KEN_MOM = [{ t, s, x, z }] (mov02_capa.js, res03_capa.js, capas456.js); si no hay,
     lugares fijos de Kennedy. Si el lugar queda fuera del cuadro de la cámara, se pasa al siguiente que sí se vea.
   · Dibujo LIVIANO (QA 2026-11-27: volver a dibujar la escena para el zoom dejaba el mapa en blanco o ahogaba la carga): justo después del render
     principal (T3.trasRender, index.html) se copia y se amplía ×3 el pedazo del lienzo alrededor del lugar a un lienzo 2D del recuadro, 5 veces por
     segundo. No se dibuja la escena otra vez ni se lee la tarjeta de video. Arranca cuando la interfaz de simulaciones está lista. */
import { crearPanelMomento } from './momento_muerte.js?v=4';
export function crearZoom({ T3 }) {
  if (window.KEN_ZOOM) return window.KEN_ZOOM;
  const THREE = T3.THREE, v = new THREE.Vector3();
  const FIJOS = [{ t: 'Corabastos', s: 'central de abastos', x: 1054.7, z: 995.9 }, { t: 'Bavaria', s: 'predio y bosque', x: 3977.7, z: 219.3 },
    { t: 'Humedal El Burro', s: 'humedal', x: 2096, z: -109 }, { t: 'Humedal La Vaca', s: 'humedal', x: 760, z: 1160 }, { t: 'Av. de las Américas', s: 'arteria', x: 2300, z: 700 }];
  const box = document.createElement('section'); box.id = 'lp-zoom'; box.setAttribute('aria-label', 'Zoom del momento');
  box.innerHTML = '<header><div><small>Zoom del momento</small><b data-z="t">—</b></div><button type="button" data-z="seguir">Seguir</button></header><div class="lz-vista" data-z="v"><video muted playsinline autoplay></video><canvas></canvas><span data-z="s"></span><i data-z="n"></i></div>';
  document.body.appendChild(box);
  const vista = box.querySelector('[data-z="v"]'), cv = vista.querySelector('canvas'), ctx = cv.getContext('2d'), vid = vista.querySelector('video'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; vid.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none';
  /* el mapa en vivo: transmisión del lienzo 3D (captureStream, la copia la hace la tarjeta de video) ampliada ×3 con CSS sobre el lugar */
  try { vid.srcObject = T3.renderer.domElement.captureStream(12); vid.play().catch(() => {}); } catch (e) { console.warn('zoom: sin transmisión', e); }
  let k = 0, actual = FIJOS[0], tCambio = performance.now(), tDib = 0;
  /* orden: avisos del feed (muertes con su reconstrucción y demás momentos), luego los de la capa de la simulación, luego lugares fijos */
  const lista = () => { const F = (window.KEN_MOM_FEED || []).slice(0, 6), Cp = Array.isArray(window.KEN_MOM) ? window.KEN_MOM : []; const L = F.length || Cp.length ? [...F, ...Cp] : FIJOS; return L.filter(m => isFinite(m.x) && isFinite(m.z)); };
  let PM = null;
  const enPantalla = (m) => { v.set(m.x, (T3.sueloY || 0.3) + 5, m.z).project(T3.camera); return v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92 ? { x: (v.x + 1) / 2, y: (1 - v.y) / 2 } : null; };
  function pintar() { const L = lista(); box.querySelector('[data-z="t"]').textContent = actual.t; box.querySelector('[data-z="s"]').textContent = actual.s || ''; box.querySelector('[data-z="n"]').textContent = (k % Math.max(1, L.length) + 1) + ' / ' + L.length; }
  function siguiente() { const L = lista(); let j = -1; for (let i = 1; i <= L.length; i++) { const q = (k + i) % L.length; if (L[q].muerte || enPantalla(L[q])) { j = q; break; } } k = j >= 0 ? j : (k + 1) % L.length; actual = L[k]; pintar();
    if (actual.muerte) { if (!PM) PM = crearPanelMomento(T3, vista); PM.mostrar(actual.muerte); vid.style.visibility = 'hidden'; } else if (PM) PM.ocultar(); }
  box.querySelector('[data-z="seguir"]').onclick = () => { if (!T3.camera || !T3.orbit) return; const P0 = T3.camera.position.clone(), C0 = T3.orbit.target.clone(), C1 = new THREE.Vector3(actual.x, 0, actual.z), P1 = actual.muerte ? new THREE.Vector3(actual.x + 45, (T3.sueloY || 0.3) + 110, actual.z + 150) : new THREE.Vector3(actual.x + 120, 380, actual.z + 430), t0 = performance.now(); tCambio = performance.now() + 25000; /* encuadra de cerca y se queda en este momento 30 s */
    T3.anim = null; (function paso() { const u = Math.min(1, (performance.now() - t0) / 1100), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.camera.position.lerpVectors(P0, P1, e); T3.orbit.target.lerpVectors(C0, C1, e); T3.orbit.update(); if (u < 1) requestAnimationFrame(paso); })(); };
  siguiente();
  T3.trasRender = () => {
    const now = performance.now(); if (now - tCambio > 12000) { tCambio = now; siguiente(); } /* 12 s por momento: la reconstrucción se ve completa */
    if (now - tDib < 200 || box.offsetParent === null) return; tDib = now;
    const src = T3.renderer && T3.renderer.domElement; if (!src) return; const R = vista.getBoundingClientRect(); if (R.width < 20) return;
    const w = Math.round(R.width), h = Math.round(R.height); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } ctx.clearRect(0, 0, w, h);
    if (actual.muerte) { ctx.clearRect(0, 0, w, h); return; } /* la reconstrucción la dibuja su propio renderer */
    const p = enPantalla(actual); if (!p) { vid.style.visibility = 'hidden'; ctx.fillStyle = 'rgba(10,12,16,.85)'; ctx.fillRect(0, 0, w, h); return; } vid.style.visibility = 'visible';
    const Z = 3, VW = w * Z, VH = VW * (src.clientHeight / Math.max(1, src.clientWidth)); vid.style.width = VW + 'px'; vid.style.height = VH + 'px';
    const tx = Math.max(w - VW, Math.min(0, w / 2 - p.x * VW)), ty = Math.max(h - VH, Math.min(0, h / 2 - p.y * VH)); vid.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    const cx = tx + p.x * VW, cy = ty + p.y * VH; ctx.strokeStyle = '#c9f27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke(); };
  return window.KEN_ZOOM = { siguiente, get actual() { return actual; } };
}
