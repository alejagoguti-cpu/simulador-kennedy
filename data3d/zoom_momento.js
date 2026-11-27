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
  const PIL = [], ASY = { gl: undefined, pbo: null, sync: null }; let k = -1, actual = FIJOS[0], tCambio = performance.now(), tDib = 0, espera = 350, ang = 0;
  /* solo momentos del escenario activo (window.KEN_ESC_PROP: con propuesta o actual); cada momento lleva su marca prop (o KEN_MOM_TAG para la lista de la capa) */
  /* 2026-11-27 (la autora: «en todas, en algún momento, debes mostrar cuando se estrella un animal»): avisos de la simulación que corre (KEN_PAR, sim_ui.js);
     en 01 y 04 hasta 4, en las demás solo las muertes (hasta 2) para que siga mandando lo de esa simulación. Orden: los dos primeros momentos de la simulación
     (en la 04 el 2.º es el paso de fauna en obra), luego las muertes, luego el resto. */
  const lista = () => { const E = !!window.KEN_ESC_PROP, par = window.KEN_PAR, fauna = par == null || par === 1 || par === 4, tagC = (q) => (q.prop != null ? q.prop : !!window.KEN_MOM_TAG) === E;
    const F = (window.KEN_MOM_FEED || []).filter(q => q.prop === E && (q.par == null || par == null || q.par === par) && (fauna || q.muerte)).slice(0, fauna ? 4 : 2), C = Array.isArray(window.KEN_MOM) ? window.KEN_MOM.filter(tagC) : [], P = E && Array.isArray(window.KEN_MOM_PROP) ? window.KEN_MOM_PROP : [];
    const L = [...C.slice(0, 2), ...F, ...C.slice(2), ...P].filter(m => m && isFinite(m.x) && isFinite(m.z)); return L.length ? L : FIJOS; };
  /* ANIMAL QUE SE ESTRELLA, en la escena real (pedido de la autora: «muestra los animales que se estrellan»): cuando el momento es una muerte por colisión o
     atropello, en su lugar un ave vuela contra la fachada (colisión, a ~10 m) o cruza la vía a ras (atropello), choca (destello), cae y queda marcada en el piso.
     Ciclo de 4,5 s. Es ilustrativo: el modelo semanal no registra el instante (lo dice el aviso). Tamaño exagerado ×3,6 para que se lea en el recuadro. */
  const CH = (() => { const g = new THREE.Group(); g.name = 'zoom-choque'; g.visible = false; T3.scene.add(g);
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.2, -2.2, 0.5, -0.4, 0, 0, -0.6, 0, 0, 1.2, 0, 0, -0.6, 2.2, 0.5, -0.4], 3)); ge.computeVertexNormals();
    const ave = new THREE.Mesh(ge, new THREE.MeshBasicMaterial({ color: 0x2a2018, side: THREE.DoubleSide, toneMapped: false, depthTest: false, depthWrite: false })); ave.renderOrder = 14; g.add(ave); /* siempre encima: las torres no lo tapan */
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8).scale(1, 0.8, 2.2), ave.material); ave.add(cuerpo);
    const flash = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); flash.renderOrder = 13; g.add(flash);
    const marca = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false })); marca.renderOrder = 13; g.add(marca);
    let m = null, t0 = 0;
    return { poner(mom) { m = mom && mom.muerte && /colision|atropello/.test(mom.muerte.causa || '') ? mom : null; g.visible = !!m; t0 = performance.now(); },
      get activo() { return !!m; },
      paso(camara) { if (!m) return; const Y = T3.sueloY || 0.3, col = m.muerte.causa === 'colision', h = col ? 18 : 1.2, t = ((performance.now() - t0) / 1000) % 4.5, fi = (Math.abs(m.x * 7.3 + m.z * 3.1) % 6.28), S = 3.6;
        const dx = Math.cos(fi), dz = Math.sin(fi), T = 2.4, tf = 0.9; let x, y, z, cae = 0;
        if (t < T) { const u = t / T; x = m.x - dx * 48 * (1 - u); z = m.z - dz * 48 * (1 - u); y = Y + h + (col ? 3 * (1 - u) : 0) + Math.sin(u * Math.PI) * 1.5; }
        else { const e = Math.min(t - T, tf); cae = e / tf; x = m.x - dx * 2 * cae; z = m.z - dz * 2 * cae; y = Y + 0.4 + (h - 0.4) * (1 - cae * cae); }
        ave.position.set(x, y, z); ave.scale.setScalar(S); ave.rotation.set(cae * 1.4, Math.atan2(dx, dz), cae * 5);
        const fl = Math.sin(t * 22) * 0.9 * (1 - cae); ave.geometry.attributes.position.setY(1, 0.5 + fl); ave.geometry.attributes.position.setY(5, 0.5 + fl); ave.geometry.attributes.position.needsUpdate = true;
        const r = t - T; flash.visible = r > 0 && r < 0.6; if (flash.visible) { flash.position.set(m.x, Y + h, m.z); flash.quaternion.copy(camara.quaternion); flash.scale.setScalar(2 + r * 18); flash.material.opacity = 0.9 * (1 - r / 0.6); }
        marca.position.set(m.x - dx * 2, Y + 0.3, m.z - dz * 2); marca.material.opacity = t > T + tf ? 0.85 : 0; } }; })();
  function pintar() { const L = lista(); box.querySelector('[data-z="t"]').textContent = actual.t; box.querySelector('[data-z="s"]').textContent = actual.s || ''; box.querySelector('[data-z="n"]').textContent = (k % Math.max(1, L.length) + 1) + ' / ' + L.length; }
  function siguiente() { const L = lista(), ck = (m) => m && m.t + '|' + Math.round(m.x) + '|' + Math.round(m.z), i = L.findIndex(m => ck(m) === ck(actual)); k = ((i >= 0 ? i : k) + 1) % L.length; if (L[k] === actual || (L[k] && L[k].t === actual.t && L[k].s === actual.s && L.length > 1)) k = (k + 1) % L.length; /* nunca repite el mismo momento */ actual = L[k]; ang = (k * 1.7) % (Math.PI * 2); CH.poner(actual); pintar(); tDib = 0; }
  box.querySelector('[data-z="seguir"]').onclick = () => { if (!T3.camera || !T3.orbit) return; const d = actual.d || 260, P0 = T3.camera.position.clone(), C0 = T3.orbit.target.clone(), C1 = new THREE.Vector3(actual.x, 0, actual.z),
      P1 = new THREE.Vector3(actual.x + Math.cos(ang) * d * 1.2, (T3.sueloY || 0.3) + d * 0.8, actual.z + Math.sin(ang) * d * 1.2), t0 = performance.now(); tCambio = performance.now() + 25000; /* se queda 30 s en este momento */
    T3.anim = null; (function paso() { const u = Math.min(1, (performance.now() - t0) / 1100), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.camera.position.lerpVectors(P0, P1, e); T3.orbit.target.lerpVectors(C0, C1, e); T3.orbit.update(); if (u < 1) requestAnimationFrame(paso); })(); };
  siguiente();
  T3.trasRender = () => {
    const now = performance.now(); if (now - tCambio > 8000) { tCambio = now; siguiente(); }
    else if (now - (T3._zChk || 0) > 800) { T3._zChk = now; const L = lista(), cl = (m) => m.t + '|' + Math.round(m.x) + '|' + Math.round(m.z), i = L.findIndex(m => cl(m) === cl(actual));
      const sigue = i < 0 && actual.muerte && actual.prop === !!window.KEN_ESC_PROP && (actual.par == null || actual.par === window.KEN_PAR); /* un choque en pantalla termina sus 8 s aunque lleguen avisos nuevos */
      if (i < 0 && !sigue) { tCambio = now; k = -1; siguiente(); } else if (L[i] !== actual) { actual = L[i]; k = i; pintar(); } } /* el escenario cambió: fuera lo que ya no corresponde. Las listas se rehacen cada semana con objetos nuevos: se compara por título y lugar (antes saltaba de momento sin razón) y se toma el texto nuevo (p. ej. el avance de la obra) */
    if (CH.activo) CH.paso(cam); /* el animal que se estrella se mueve cada cuadro (también se ve en la vista principal) */
    /* RENDIMIENTO (2026-11-27): la imagen del recuadro se lee de la GPU sin bloquear (WebGL2: buffer de píxeles + fence); se copia cuando la GPU avisa que terminó.
       Antes readRenderTargetPixels esperaba a la GPU en cada dibujo (13 % del tiempo de JavaScript en el perfil). */
    if (ASY.gl === undefined) { const gl = T3.renderer && T3.renderer.getContext(); ASY.gl = gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl : null; if (ASY.gl) { ASY.pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ASY.pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, W * H * 4, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); } }
    if (ASY.sync) { const gl = ASY.gl, st = gl.clientWaitSync(ASY.sync, 0, 0);
      if (st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED) { gl.deleteSync(ASY.sync); ASY.sync = null; gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ASY.pbo); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, buf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); copiar(); }
      else return; /* la GPU aún no termina el dibujo anterior: no se pide otro */ }
    if (now - tDib < (CH.activo ? 110 : espera) || !box.getClientRects().length || document.getElementById('urbia-intro')) return; tDib = now; /* (offsetParent es null en elementos fijos: no sirve para saber si se ve) · en un choque, más seguido para que se lea el movimiento */
    const r = T3.renderer; if (!r) return; ang += CH.activo ? 0.006 : 0.04;
    const Y = (T3.sueloY || 0.3), d = CH.activo ? 100 : (actual.d || 230); cam.position.set(actual.x + Math.cos(ang) * d, Y + d * (CH.activo ? 0.95 : 0.62), actual.z + Math.sin(ang) * d); cam.lookAt(actual.x, Y + (CH.activo ? 10 : 6), actual.z); /* en un choque, desde arriba: las torres no tapan el lugar */ cam.updateMatrixWorld(); cam.layers.mask = T3.camera.layers.mask;
    const prev = r.getRenderTarget(), ac = r.autoClear, t0 = performance.now(); r.autoClear = true;
    /* sin las píldoras de los carros lejanos (vehiculos.js): su tamaño se calcula para la cámara principal y de cerca salen como manchas enormes */
    if (now - (T3._zPil || 0) > 2000) { T3._zPil = now; PIL.length = 0; T3.scene.traverse(o => { if (o.name === 'vehiculos-lejos' || o.name === 'vehiculos-lejos-borde') PIL.push(o); }); }
    const pv = PIL.map(o => o.visible); PIL.forEach(o => { o.visible = false; });
    let leido = false;
    try { r.setRenderTarget(rt); r.clear(); r.render(T3.scene, cam);
      if (ASY.gl) { const gl = ASY.gl; gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ASY.pbo); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, 0); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); ASY.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); }
      else { r.readRenderTargetPixels(rt, 0, 0, W, H, buf); leido = true; } } catch (e) { /* un cuadro sin zoom */ }
    PIL.forEach((o, i) => { o.visible = pv[i]; });
    r.setRenderTarget(prev); r.autoClear = ac; const ms = performance.now() - t0; espera = ms > 60 ? Math.min(1500, espera * 1.5) : Math.max(350, espera * 0.9); /* si pesa, dibuja menos seguido */
    if (leido) copiar(); };
  function copiar() { for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); ctx.putImageData(img, 0, 0); }
  /* ir(f): salta al primer momento que cumpla f (pruebas y enlaces); devuelve si lo encontró */
  const ir = (f) => { const L = lista(), i = L.findIndex(f); if (i < 0) return false; k = i; actual = L[i]; ang = (k * 1.7) % (Math.PI * 2); CH.poner(actual); pintar(); tDib = 0; tCambio = performance.now(); return true; };
  return window.KEN_ZOOM = { siguiente, ir, lista, get actual() { return actual; } };
}
