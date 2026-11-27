/* ============ ZOOM DEL MOMENTO (columna derecha, siempre activo; pedido de la autora 2026-11-27) ============
   Un recuadro arriba a la derecha que muestra, con una segunda cámara, la escena REAL del simulador (la misma escena 3D, no una ilustración) en el
   lugar de lo que está pasando ahora. Cada 5 s pasa al siguiente momento. «Seguir» lleva la cámara principal a ese lugar.
   · Momentos: los publica la capa de cada simulación en window.KEN_MOM = [{ t: 'título', s: 'detalle', x, z }] (mov02_capa.js, res03_capa.js,
     capas456.js); si no hay, lugares fijos de Kennedy (Corabastos, Bavaria, humedales El Burro y La Vaca, Av. de las Américas).
   · Dibujo: después del render principal (T3.trasRender, index.html) se vuelve a dibujar la escena con la cámara del zoom solo en el rectángulo
     del recuadro (setViewport + setScissor). La cámara orbita despacio alrededor del lugar. */
export function crearZoom({ T3, RELOJ }) {
  if (window.KEN_ZOOM) return window.KEN_ZOOM;
  const THREE = T3.THREE, cam = new THREE.PerspectiveCamera(38, 16 / 9, 4, 6000);
  const FIJOS = [{ t: 'Corabastos', s: 'central de abastos', x: 1054.7, z: 995.9 }, { t: 'Bavaria', s: 'predio y bosque', x: 3977.7, z: 219.3 },
    { t: 'Humedal El Burro', s: 'humedal', x: 2096, z: -109 }, { t: 'Humedal La Vaca', s: 'humedal', x: 760, z: 1160 }, { t: 'Av. de las Américas', s: 'arteria', x: 2300, z: 700 }];
  const box = document.createElement('section'); box.id = 'lp-zoom'; box.setAttribute('aria-label', 'Zoom del momento');
  box.innerHTML = '<header><div><small>Zoom del momento</small><b data-z="t">—</b></div><button type="button" data-z="seguir">Seguir</button></header><div class="lz-vista" data-z="v"><span data-z="s"></span><i data-z="n"></i></div>';
  document.body.appendChild(box);
  const vista = box.querySelector('[data-z="v"]'); let k = 0, actual = FIJOS[0], tCambio = 0, ang = 0;
  const lista = () => { const L = Array.isArray(window.KEN_MOM) && window.KEN_MOM.length ? window.KEN_MOM : FIJOS; return L.filter(m => isFinite(m.x) && isFinite(m.z)); };
  function siguiente() { const L = lista(); k = (k + 1) % L.length; actual = L[k]; ang = 0; pintar(); }
  function pintar() { const L = lista(); box.querySelector('[data-z="t"]').textContent = actual.t; box.querySelector('[data-z="s"]').textContent = actual.s || ''; box.querySelector('[data-z="n"]').textContent = (k % L.length + 1) + ' / ' + L.length; }
  box.querySelector('[data-z="seguir"]').onclick = () => { if (!T3.camera || !T3.orbit) return; const P0 = T3.camera.position.clone(), C0 = T3.orbit.target.clone(), C1 = new THREE.Vector3(actual.x, 0, actual.z), P1 = new THREE.Vector3(actual.x + 160, 520, actual.z + 620), t0 = performance.now();
    T3.anim = null; (function paso() { const u = Math.min(1, (performance.now() - t0) / 1100), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.camera.position.lerpVectors(P0, P1, e); T3.orbit.target.lerpVectors(C0, C1, e); T3.orbit.update(); if (u < 1) requestAnimationFrame(paso); })(); };
  pintar();
  /* 2026-11-27 (QA): dibujar con tijera sobre el lienzo principal lo dejaba en blanco. Ahora se dibuja en una textura propia (WebGLRenderTarget) cada
     120 ms y se copia a un lienzo 2D dentro del recuadro: el lienzo principal no se toca. */
  const W = 384, H = 200, rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const buf = new Uint8Array(W * H * 4), cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'; vista.prepend(cv);
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H); let tDib = 0;
  T3.trasRender = () => {
    const r = T3.renderer; if (!r || box.offsetParent === null) return; const now = performance.now();
    if (now - tCambio > 5000) { tCambio = now; siguiente(); }
    if (now - tDib < 120) return; tDib = now;
    ang += 0.01; const Y = (T3.sueloY || 0.3), d = actual.d || 260; cam.position.set(actual.x + Math.cos(ang) * d, Y + d * 0.75, actual.z + Math.sin(ang) * d); cam.lookAt(actual.x, Y + 8, actual.z);
    cam.aspect = W / H; cam.updateProjectionMatrix(); cam.layers.mask = T3.camera.layers.mask;
    const prev = r.getRenderTarget(), ac = r.autoClear; r.autoClear = true;
    try { r.setRenderTarget(rt); r.clear(); r.render(T3.scene, cam); r.readRenderTargetPixels(rt, 0, 0, W, H, buf); } catch (e) { /* un cuadro sin zoom */ }
    r.setRenderTarget(prev); r.autoClear = ac;
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); ctx.putImageData(img, 0, 0); };
  return window.KEN_ZOOM = { siguiente, get actual() { return actual; } };
}
