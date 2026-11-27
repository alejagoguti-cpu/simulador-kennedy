/* ============ ZOOM DEL MOMENTO (columna derecha, siempre activo; pedidos de la autora 2026-11-27) ============
   «Ultra realista, no poly»: el recuadro muestra la ESCENA REAL del simulador (terreno fotográfico de Google, edificios, carros, árboles, montones,
   aves) vista con una segunda cámara de cerca y en ángulo sobre el lugar de cada momento. Pasa al siguiente cada 8 s; «Seguir» lleva allá la cámara principal.
   · Momentos (mínimo 6 por escenario, distintos sin y con propuesta): avisos de la franja (muertes en su lugar real) + window.KEN_MOM (capa de la
     simulación) + window.KEN_MOM_PROP (mercados que abren, Corabastos con la propuesta: propuesta_flujos.js).
   · Dibujo: como mucho cada 350 ms se dibuja la escena en una textura propia (WebGLRenderTarget 448×240) y se copia a un lienzo 2D.
     No toca el lienzo principal. Si un dibujo tarda más de 60 ms, espera más entre dibujos. Arranca cuando la interfaz está lista (limpio.js). */
export function crearZoom({ T3 }) {
  if (window.KEN_ZOOM) return window.KEN_ZOOM;
  const THREE = T3.THREE, cam = new THREE.PerspectiveCamera(42, 448 / 240, 2, 9000);
  const FIJOS = [{ t: 'Corabastos', s: 'central de abastos', x: 1054.7, z: 995.9 }, { t: 'Bavaria', s: 'predio y bosque', x: 3977.7, z: 219.3 },
    { t: 'Humedal El Burro', s: 'humedal', x: 2096, z: -109 }, { t: 'Humedal La Vaca', s: 'humedal', x: 760, z: 1160 }, { t: 'Av. de las Américas', s: 'arteria', x: 2300, z: 700 }, { t: 'Humedal de Techo', s: 'humedal', x: 2997, z: -606 }];
  const box = document.createElement('section'); box.id = 'lp-zoom'; box.setAttribute('aria-label', 'Zoom del momento');
  box.innerHTML = '<header><div><small>Zoom del momento</small><b data-z="t">—</b></div><button type="button" data-z="seguir">Seguir</button></header><div class="lz-vista" data-z="v"><canvas></canvas><span data-z="s"></span><i data-z="n"></i></div>';
  document.body.appendChild(box);
  const vista = box.querySelector('[data-z="v"]'), cv = vista.querySelector('canvas'), ctx = cv.getContext('2d'); cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
  const W = 448, H = 240; cv.width = W; cv.height = H; const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const buf = new Uint8Array(W * H * 4), img = ctx.createImageData(W, H);
  let k = -1, actual = FIJOS[0], tCambio = performance.now(), tDib = 0, espera = 350, ang = 0;
  const lista = () => { const F = (window.KEN_MOM_FEED || []).slice(0, 4), C = Array.isArray(window.KEN_MOM) ? window.KEN_MOM : [], P = Array.isArray(window.KEN_MOM_PROP) ? window.KEN_MOM_PROP : [];
    const L = [...F, ...C, ...P].filter(m => m && isFinite(m.x) && isFinite(m.z)); return L.length ? L : FIJOS; };
  function pintar() { const L = lista(); box.querySelector('[data-z="t"]').textContent = actual.t; box.querySelector('[data-z="s"]').textContent = actual.s || ''; box.querySelector('[data-z="n"]').textContent = (k % Math.max(1, L.length) + 1) + ' / ' + L.length; }
  function siguiente() { const L = lista(); k = (k + 1) % L.length; actual = L[k]; ang = (k * 1.7) % (Math.PI * 2); pintar(); tDib = 0; }
  box.querySelector('[data-z="seguir"]').onclick = () => { if (!T3.camera || !T3.orbit) return; const d = actual.d || 260, P0 = T3.camera.position.clone(), C0 = T3.orbit.target.clone(), C1 = new THREE.Vector3(actual.x, 0, actual.z),
      P1 = new THREE.Vector3(actual.x + Math.cos(ang) * d * 1.2, (T3.sueloY || 0.3) + d * 0.8, actual.z + Math.sin(ang) * d * 1.2), t0 = performance.now(); tCambio = performance.now() + 25000; /* se queda 30 s en este momento */
    T3.anim = null; (function paso() { const u = Math.min(1, (performance.now() - t0) / 1100), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.camera.position.lerpVectors(P0, P1, e); T3.orbit.target.lerpVectors(C0, C1, e); T3.orbit.update(); if (u < 1) requestAnimationFrame(paso); })(); };
  siguiente();
  T3.trasRender = () => {
    const now = performance.now(); if (now - tCambio > 8000) { tCambio = now; siguiente(); }
    if (now - tDib < espera || box.offsetParent === null || document.getElementById('urbia-intro')) return; tDib = now;
    const r = T3.renderer; if (!r) return; ang += 0.04;
    const Y = (T3.sueloY || 0.3), d = actual.d || 230; cam.position.set(actual.x + Math.cos(ang) * d, Y + d * 0.62, actual.z + Math.sin(ang) * d); cam.lookAt(actual.x, Y + 6, actual.z); cam.updateMatrixWorld(); cam.layers.mask = T3.camera.layers.mask;
    const prev = r.getRenderTarget(), ac = r.autoClear, t0 = performance.now(); r.autoClear = true;
    try { r.setRenderTarget(rt); r.clear(); r.render(T3.scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); } catch (e) { /* un cuadro sin zoom */ }
    r.setRenderTarget(prev); r.autoClear = ac; const ms = performance.now() - t0; espera = ms > 60 ? Math.min(1500, espera * 1.5) : Math.max(350, espera * 0.9); /* si pesa, dibuja menos seguido */
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); ctx.putImageData(img, 0, 0); };
  return window.KEN_ZOOM = { siguiente, get actual() { return actual; } };
}
