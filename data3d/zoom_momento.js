/* ============ ZOOM DEL MOMENTO (columna derecha, siempre activo; pedido de la autora 2026-11-27) ============
   Recuadro arriba a la derecha que AMPLÍA la escena real alrededor del lugar de lo que está pasando ahora; cada 5 s pasa al siguiente momento.
   «Seguir» lleva la cámara principal a ese lugar.
   · Momentos: los publica la capa de cada simulación en window.KEN_MOM = [{ t, s, x, z }] (mov02_capa.js, res03_capa.js, capas456.js); si no hay,
     lugares fijos de Kennedy. Si el lugar queda fuera del cuadro de la cámara, se pasa al siguiente que sí se vea.
   · Dibujo LIVIANO (QA 2026-11-27: volver a dibujar la escena para el zoom dejaba el mapa en blanco o ahogaba la carga): justo después del render
     principal (T3.trasRender, index.html) se copia y se amplía ×3 el pedazo del lienzo alrededor del lugar a un lienzo 2D del recuadro, 5 veces por
     segundo. No se dibuja la escena otra vez ni se lee la tarjeta de video. Arranca cuando la interfaz de simulaciones está lista. */
export function crearZoom({ T3 }) {
  if (window.KEN_ZOOM) return window.KEN_ZOOM;
  const THREE = T3.THREE, v = new THREE.Vector3();
  const FIJOS = [{ t: 'Corabastos', s: 'central de abastos', x: 1054.7, z: 995.9 }, { t: 'Bavaria', s: 'predio y bosque', x: 3977.7, z: 219.3 },
    { t: 'Humedal El Burro', s: 'humedal', x: 2096, z: -109 }, { t: 'Humedal La Vaca', s: 'humedal', x: 760, z: 1160 }, { t: 'Av. de las Américas', s: 'arteria', x: 2300, z: 700 }];
  const box = document.createElement('section'); box.id = 'lp-zoom'; box.setAttribute('aria-label', 'Zoom del momento');
  box.innerHTML = '<header><div><small>Zoom del momento</small><b data-z="t">—</b></div><button type="button" data-z="seguir">Seguir</button></header><div class="lz-vista" data-z="v"><canvas></canvas><span data-z="s"></span><i data-z="n"></i></div>';
  document.body.appendChild(box);
  const vista = box.querySelector('[data-z="v"]'), cv = vista.querySelector('canvas'), ctx = cv.getContext('2d'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  let k = 0, actual = FIJOS[0], tCambio = performance.now(), tDib = 0;
  const lista = () => { const L = Array.isArray(window.KEN_MOM) && window.KEN_MOM.length ? window.KEN_MOM : FIJOS; return L.filter(m => isFinite(m.x) && isFinite(m.z)); };
  const enPantalla = (m) => { v.set(m.x, (T3.sueloY || 0.3) + 5, m.z).project(T3.camera); return v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92 ? { x: (v.x + 1) / 2, y: (1 - v.y) / 2 } : null; };
  function pintar() { const L = lista(); box.querySelector('[data-z="t"]').textContent = actual.t; box.querySelector('[data-z="s"]').textContent = actual.s || ''; box.querySelector('[data-z="n"]').textContent = (k % Math.max(1, L.length) + 1) + ' / ' + L.length; }
  function siguiente() { const L = lista(); for (let i = 1; i <= L.length; i++) { const j = (k + i) % L.length; if (enPantalla(L[j])) { k = j; actual = L[j]; pintar(); return; } } k = (k + 1) % L.length; actual = L[k]; pintar(); }
  box.querySelector('[data-z="seguir"]').onclick = () => { if (!T3.camera || !T3.orbit) return; const P0 = T3.camera.position.clone(), C0 = T3.orbit.target.clone(), C1 = new THREE.Vector3(actual.x, 0, actual.z), P1 = new THREE.Vector3(actual.x + 160, 520, actual.z + 620), t0 = performance.now();
    T3.anim = null; (function paso() { const u = Math.min(1, (performance.now() - t0) / 1100), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.camera.position.lerpVectors(P0, P1, e); T3.orbit.target.lerpVectors(C0, C1, e); T3.orbit.update(); if (u < 1) requestAnimationFrame(paso); })(); };
  siguiente();
  T3.trasRender = () => {
    const now = performance.now(); if (now - tCambio > 5000) { tCambio = now; siguiente(); }
    if (now - tDib < 200 || box.offsetParent === null) return; tDib = now;
    const src = T3.renderer && T3.renderer.domElement; if (!src) return; const R = vista.getBoundingClientRect(); if (R.width < 20) return;
    const w = Math.round(R.width), h = Math.round(R.height); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const p = enPantalla(actual); if (!p) { ctx.fillStyle = 'rgba(10,12,16,.85)'; ctx.fillRect(0, 0, w, h); return; }
    const sw = src.width / 3, sh = sw * h / w, sx = Math.max(0, Math.min(src.width - sw, p.x * src.width - sw / 2)), sy = Math.max(0, Math.min(src.height - sh, p.y * src.height - sh / 2));
    try { ctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h); } catch (e) { /* un cuadro sin zoom */ }
    const cx = (p.x * src.width - sx) / sw * w, cy = (p.y * src.height - sy) / sh * h; ctx.strokeStyle = '#c9f27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke(); };
  return window.KEN_ZOOM = { siguiente, get actual() { return actual; } };
}
