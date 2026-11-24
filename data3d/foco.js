/* ============ FOCO · modo «blanco y negro» (para la vista limpia: data3d/limpio.js / data3d/simulaciones.js) ============
   window.KEN_FOCO = { on(capa), off() }
   · capa: 'ruido' | 'especies' | 'trafico' | 'picos' | 'metro' | nombre de un grupo de la escena (p. ej. 'biotica', 'ruido-carros') |
     un objeto de three.js | una lista de cualquiera de los anteriores.
   El territorio (foto de Google, edificios, árboles, cielo) se desatura y se oscurece con un pase de post-proceso al final de T3.composer;
   lo resaltado se vuelve a dibujar EN COLOR encima (capa 6 de three.js: se habilita en esos objetos y en las luces, no se toca .visible).
   Siempre quedan en color, además, los picos de indicadores (data3d/picos_indicadores.js) y la marca del ojo (data3d/ojo_dios.js).
   Transición suave de 0,6 s. Apagado no cuesta nada: el pase se desactiva, el render vuelve a ser el de siempre y las capas se restauran.
   Sin compositor (?ao=0): en vez de desaturar se oscurece con un velo negro y lo resaltado se dibuja encima igual. */
import { RELOJ } from './reloj.js?v=5';

const CAPA = 6, DUR = 0.6, OSCURO = 0.6; let durAct = DUR; // durAct: duración de la transición en curso (opc.dur)
const ALIAS = {
  ruido: ['ruido-carros', 'via-cerrada'],
  especies: ['biotica'], fauna: ['biotica'], biotica: ['biotica'], aves: ['biotica'],
  trafico: ['vehiculos', 'trafico_escenario'], carros: ['vehiculos', 'trafico_escenario'],
  picos: ['picos_zonas', 'picos_ind'],
  metro: ['metro_l1']
};
const SIEMPRE = ['picos_ind', 'ojo_marca'];

let T3 = null, THREE = null, armado = false, k = 0, meta = 0, tPrev = 0, pase = null, origComp = null, origRend = null, dentro = false;
let pedido = [], marcados = new Set(), luces = new Set(), tRes = 0, velo = null, camVelo = null;

function armar() {
  if (armado) return true;
  T3 = window.KEN_T3; if (!T3 || !T3.scene) return false; THREE = T3.THREE; armado = true;
  RELOJ.alDibujar(paso);
  return true;
}

/* ---------- qué se resalta ---------- */
function resolver() {
  const nombres = new Set(SIEMPRE), objs = new Set();
  for (const p of pedido) {
    if (!p) continue;
    if (p.isObject3D) { objs.add(p); continue; }
    const s = String(p); (ALIAS[s.toLowerCase()] || [s]).forEach(n => nombres.add(n));
  }
  const tiles = T3.tiles && T3.tiles.group;
  const recorrer = (o) => { // no se baja dentro de la malla de Google ni dentro de lo que ya coincidió
    for (const c of o.children) {
      if (c === tiles) continue;
      const nm = c.name || ''; let si = false;
      if (nm) for (const n of nombres) if (nm === n || (nm.startsWith(n) && /[_\-]/.test(nm.charAt(n.length)))) { si = true; break; }
      if (si) objs.add(c); else if (c.children.length && c.children.length < 400) recorrer(c);
    }
  };
  recorrer(T3.scene);
  // marcar los nuevos, desmarcar los que ya no van
  for (const o of marcados) if (!objs.has(o)) { o.traverse(x => x.layers.disable(CAPA)); marcados.delete(o); }
  for (const o of objs) if (!marcados.has(o)) { o.traverse(x => x.layers.enable(CAPA)); marcados.add(o); }
  T3.scene.traverse(o => { if (o.isLight && !luces.has(o)) { o.layers.enable(CAPA); luces.add(o); } });
}
function limpiar() {
  for (const o of marcados) o.traverse(x => x.layers.disable(CAPA)); marcados.clear();
  for (const l of luces) l.layers.disable(CAPA); luces.clear();
}

/* ---------- pase de desaturación (al final del compositor) ---------- */
async function crearPase() {
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  pase = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uK: { value: 0 }, uOsc: { value: OSCURO } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uK, uOsc; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        vec3 g = mix(c, vec3(l), 0.4) * 0.42; gl_FragColor = vec4(mix(c, g, uK), 1.0); } /* se baja el brillo de a poco y se apaga un poco el color (no blanco y negro) */`
  });
  pase.enabled = false; pase.foco = true;
}

/* lo resaltado, en color, encima de la imagen final (sin el cielo ni lo demás: solo la capa 6) */
function superponer() {
  if (k <= 0.001 || dentro) return;
  dentro = true;
  const r = T3.renderer, sc = T3.scene, cam = T3.camera, ac = r.autoClear, bg = sc.background, mask = cam.layers.mask, rt = r.getRenderTarget();
  try {
    r.setRenderTarget(null); r.autoClear = false; sc.background = null;
    if (!T3.composer && velo) { velo.material.opacity = OSCURO * 0.9 * k; (origRend || r.render).call(r, velo, camVelo); }
    r.clearDepth(); cam.layers.set(CAPA);
    (origRend || r.render).call(r, sc, cam);
  } catch (e) { console.warn('foco:', e); }
  cam.layers.mask = mask; sc.background = bg; r.autoClear = ac; r.setRenderTarget(rt);
  dentro = false;
}

function enganchar() {
  const comp = T3.composer;
  if (comp) {
    if (pase && !comp.passes.includes(pase)) comp.addPass(pase);
    if (pase) pase.enabled = true;
    if (!origComp) { origComp = comp.render; comp.render = function (d) { origComp.call(this, d); superponer(); }; }
  } else if (!origRend) {
    if (!velo) {
      velo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { opacity: { value: 0 } },
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform float opacity; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, opacity); }' }));
      Object.defineProperty(velo.material, 'opacity', { get() { return this.uniforms.opacity.value; }, set(v) { if (this.uniforms) this.uniforms.opacity.value = v; } });
      velo.frustumCulled = false; camVelo = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    const r = T3.renderer; origRend = r.render;
    r.render = function (s, c) { origRend.call(this, s, c); if (s === T3.scene && !dentro) superponer(); };
  }
}
function soltar() {
  const comp = T3.composer;
  if (pase) { pase.enabled = false; if (comp) { const i = comp.passes.indexOf(pase); if (i >= 0) comp.passes.splice(i, 1); } }
  if (origComp && comp) { comp.render = origComp; } origComp = null;
  if (origRend) { T3.renderer.render = origRend; origRend = null; }
  limpiar();
}

function paso() {
  if (!armado || (k === 0 && meta === 0)) return;
  const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
  k = meta > k ? Math.min(meta, k + dt / durAct) : Math.max(meta, k - dt / durAct);
  const e = k * k * (3 - 2 * k);
  if (pase) pase.uniforms.uK.value = e;
  if (meta > 0 && ahora - tRes > 1000) { tRes = ahora; resolver(); } // capas que se crean después (p. ej. el mapa de ruido)
  if (k === 0 && meta === 0) soltar();
}

async function on(capa, opc) {
  if (!armar()) { console.warn('KEN_FOCO: el 3D aún no está listo'); return false; }
  pedido = Array.isArray(capa) ? capa.slice() : capa == null ? [] : [capa];
  if (opc && opc.oscuro != null && pase) pase.uniforms.uOsc.value = opc.oscuro;
  if (T3.composer && !pase) await crearPase();
  if (opc && opc.oscuro != null) pase && (pase.uniforms.uOsc.value = opc.oscuro);
  durAct = opc && opc.dur ? opc.dur : DUR; resolver(); tRes = performance.now();
  enganchar();
  meta = 1; tPrev = 0;
  return true;
}
function off(opc) { durAct = opc && opc.dur ? opc.dur : DUR; meta = 0; tPrev = 0; }

window.KEN_FOCO = { on, off, get activo() { return meta > 0; }, get nivel() { return k; } };
export default window.KEN_FOCO;
