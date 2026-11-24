/* ============ BLANCO Y NEGRO DEL 3D (para «Solo relaciones bióticas») ============
   crearGris({ T3, excluir }) → { on(), off(), activo }
   Todo lo que hay en la escena (malla de Google, edificios, Bavaria, árboles, carros…) se sigue viendo en 3D pero se va a blanco y
   negro en 0,4 s; lo que está en `excluir` (la red biótica: animales e interacciones) queda en color.
   Cómo: a cada material se le agrega al final del sombreador una mezcla hacia su luminancia controlada por UNA uniforme compartida
   (uGris, 0 = color, 1 = gris). Los materiales con el mismo programa siguen compartiéndolo (customProgramCacheKey + 'gris'), así que
   prenderlo solo recompila unos pocos programas la primera vez. Cada 0,6 s se revisan materiales nuevos (la malla de Google carga teselas). */
const GRIS = { value: 0 };
const LUMA = 'vec3(0.299, 0.587, 0.114)';

function parchar(m) {
  if (!m || m.userData._gris || m.isRawShaderMaterial || m.glslVersion === '300 es') return; // sombreadores propios en GLSL3 (sin gl_FragColor): se dejan como están
  m.userData._gris = true;
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    sh.uniforms.uGris = GRIS;
    const fs = sh.fragmentShader, k = fs.lastIndexOf('}'); if (k < 0) return;
    sh.fragmentShader = 'uniform float uGris;\n' + fs.slice(0, k) +
      `\n  { float l = dot(gl_FragColor.rgb, ${LUMA}); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(l) * 1.04, uGris); }\n` + fs.slice(k);
  };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|gris'; };
  m.needsUpdate = true;
}

export function crearGris({ T3, excluir = [] }) {
  let on = false, meta = 0, tRev = 0;
  const fuera = new Set();
  const marcarFuera = () => { fuera.clear(); for (const g of excluir) if (g) g.traverse(o => fuera.add(o)); };
  const revisar = () => {
    marcarFuera();
    T3.scene.traverse(o => { if (fuera.has(o) || !o.material) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) parchar(m); });
  };
  let tPrev = 0;
  const paso = () => {
    const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
    if (on && ahora - tRev > 600) { tRev = ahora; revisar(); }
    if (GRIS.value !== meta) GRIS.value = meta > GRIS.value ? Math.min(meta, GRIS.value + dt / 0.4) : Math.max(meta, GRIS.value - dt / 0.4);
    if (on || GRIS.value > 0) requestAnimationFrame(paso); else tPrev = 0;
  };
  const api = {
    on() { if (on) return; on = true; meta = 1; tRev = 0; revisar(); tPrev = 0; requestAnimationFrame(paso); },
    off() { if (!on) return; on = false; meta = 0; tPrev = 0; requestAnimationFrame(paso); },
    get activo() { return on; }
  };
  return api;
}
