/* ============ FOCO · modo «maqueta de análisis» (vista limpia: data3d/limpio.js, data3d/sim_ui.js) ============
   window.KEN_FOCO = { on(capa | [capas], opc), off(), activo, nivel }
   · capa: 'ruido' | 'especies' | 'trafico' | 'picos' | 'metro' | nombre de un grupo de la escena (p. ej. 'predio', 'basura') |
     un objeto de three.js | una lista de cualquiera de los anteriores (los alias de siempre siguen valiendo).
   Lo que se ve (como un render de análisis urbano tipo «ZTV»): una MAQUETA BLANCA a la luz del día —edificios propios mate blancos con sombras
   suaves, árboles verdes, suelo y vías gris claro, parques verde pálido, agua gris verdosa, cielo pálido con bruma— y encima, en colores vivos,
   los datos: mapa de ruido con su escala de siempre (amarillo → naranja → rojo, más transparente), flujo de carros por vía (morado → magenta → naranja → amarillo), lo resaltado en
   sus colores y la infraestructura de la propuesta que existe en esta simulación y en esta semana (huertas en verde, mercados en azul, instituto
   Bavaria Común en naranja, compostaje en café, plan parcial en arena…). Tarjeta de leyenda de vidrio abajo a la derecha.
   CÓMO (sin tocar el estado de los otros módulos): todo lo de la maqueta se pone SOLO durante el dibujo del cuadro (envoltorio de
   T3.composer.render o de renderer.render) y se devuelve justo después: materiales blancos prestados, malla de Google oculta, luces, niebla,
   cielo, exposición. Fuera del dibujo la escena es la de siempre (los módulos que cambian materiales o luces no se pisan con el foco).
   Transición de 0,6 s: la imagen se funde a blanco, se cambia y vuelve (pase final del compositor; sin compositor, un velo).
   Rendimiento: materiales y programas creados y compilados una vez en reposo (compileAsync), sin asignar memoria por cuadro; el cambio por
   cuadro son dos recorridos de una lista (~3.000 asignaciones, < 0,1 ms). La lista se rehace una vez por segundo. Apagado: no cuesta nada. */
import { RELOJ } from './reloj.js?v=5';

const DUR = 0.6;
/* realce opcional de la vista NORMAL (malla de Google) hacia la luz de la maqueta: 0 = apagado (como siempre). Propuesta: 0.08
   (exposición +8 % y relleno del cielo +15 %). Si se pone > 0 el envoltorio del dibujo queda puesto siempre (cuesta ~0,01 ms). */
const REALCE_VISTA_NORMAL = 0;

const ALIAS = {
  ruido: ['ruido-carros', 'via-cerrada'],
  especies: ['biotica'], fauna: ['biotica'], biotica: ['biotica'], aves: ['biotica'],
  trafico: ['vehiculos', 'trafico_escenario'], carros: ['vehiculos', 'trafico_escenario'],
  picos: ['picos_zonas', 'picos_ind'],
  metro: ['metro_l1']
};
const SIEMPRE = ['picos_ind', 'ojo_marca'];
const NOMBRE_CAPA = { ruido: 'Ruido de los carros', especies: 'Fauna y red biótica', fauna: 'Fauna y red biótica', biotica: 'Fauna y red biótica', aves: 'Fauna y red biótica',
  trafico: 'Tráfico', carros: 'Tráfico', picos: 'Picos de indicadores', metro: 'Metro Línea 1', predio: 'Predio del plan parcial', cierre: 'Cierre de vía',
  basura: 'Basura y ratas', degradacion: 'Humedales que se encogen', caminos: 'Caminos del instituto', corabastos: 'Corabastos' };

/* ---------- paleta de la maqueta (sRGB) ---------- */
const LUZ = { exp: 0.9, hemiCielo: 0xffffff, hemiSuelo: 0xd2d5d0, hemi: 0.8, sol: 0xfff1de, solI: 3.3,
  niebla: 0xe8edf1, densK: 0.8, top: 0xb9d0e8, mid: 0xdbe6ef, bot: 0xeef1f3 };
/* FOTO (2026-11-23, referencia de la autora): la ciudad sigue siendo la foto 3D de Google con luz de día; solo la infraestructura de la
   propuesta y del plan parcial se pinta como volúmenes de color sólido (huertas verde, mercados azul, plan parcial…). Sin maqueta blanca. */
const FOTO = true;
const C = { edif: 0xefeeea, acera: 0xd2d1cc, via: 0xb1b0ac, suelo: 0xc4c3bf, parque: 0xc8dcb0, agua: 0x9fb6ad };
/* infraestructura de la propuesta: grupo de la escena -> categoría (solo se pinta si está visible: es la que existe en esta simulación y semana) */
const CAT = {
  huerta: { col: '#3faa4c', t: 'Huerta en techo o en parque', g: ['huertas-hidroponicas', 'huertasTecho', 'huertas-barrio', 'huerta-circular', 'huerta-tintal', 'bavaria_huertas', 'huerta_circular'] },
  mercado: { col: '#2f6bdc', t: 'Mercado de barrio · plazoleta en parque', g: ['mercados-barrio', 'mercados-mallas'] },
  instituto: { col: '#f2c63a', t: 'Bavaria Común · instituto', g: ['bavaria_distrito'] },
  compost: { col: '#9a6a34', t: 'Compostaje y acopio', g: ['residuos', 'red_produccion'] },
  plan: { col: '#e23b3b', t: 'Plan parcial · edificios nuevos', g: [] },
  parqueCora: { col: '#7fc47c', t: 'Parque Corabastos', g: ['parque_corabastos'] }
};
const GRUPO_CAT = new Map(); for (const k in CAT) for (const n of CAT[k].g) GRUPO_CAT.set(n, k);
const BLANCOS = new Set(['bavaria', 'corabastos', 'biblioteca-tintal', 'conjuntos', 'torresBalcones', 'inem-kennedy', 'canchas']);
/* rampas de datos (sRGB) */
const RAMPA_RUIDO = ['#fff7b3', '#ffd646', '#f57c00', '#d32f2f']; // 55 · 60 · 65 · 70+ dB: la escala de siempre del simulador (data3d/ruido_cierre.js), solo más transparente
const RUIDO_OPAC = 1; const ARB_OPAC = 0.55; // ruido tal cual (pedido de la autora); árboles semitransparentes en la maqueta // fracción de la opacidad del mapa de ruido en la maqueta (se leen los edificios y el suelo debajo)
const ESC_TRAF = [[0, [0.43, 0.20, 0.78]], [2.5, [0.76, 0.12, 0.62]], [6, [0.95, 0.22, 0.45]], [11, [1.0, 0.48, 0.13]], [18, [1.0, 0.74, 0.10]], [30, [1.0, 0.95, 0.26]]];

let T3 = null, THREE = null, listo = false, prep = null, k = 0, meta = 0, tPrev = 0, aplicado = false, tRes = 0;
let pedido = [], pase = null, origComp = null, origRend = null, dentro = false, velo = null, camVelo = null, gradePase = null;
const lista = { o: [], m: [], prev: [], n: 0 }; // mallas a las que se presta material en el cuadro
const vis = { o: [], v: [], n: 0 };             // objetos que se prenden/apagan solo en el cuadro
const ord = { o: [], v: [], n: 0 };             // orden de dibujo prestado en el cuadro
const arb = { m: new Array(48).fill(null), c: [], k: [], n: 0 }; // materiales de las copas (siluetas lejanas y hojas): se aclaran en el cuadro
const ARB_K = [1.5, 1.7, 1.3], HOJA_K = [1.35, 1.6, 1.15];
/* SOL DE LA MAQUETA: alto (≈52°) y siempre por detrás e a la izquierda de la cámara, para que las caras que se ven estén al sol y las sombras
   caigan hacia adelante (se leen). Se reorienta solo con la cámara quieta y si cambió más de 35°, girando suave en ~1 s. */
const sol = { az: 0, meta: 0, ch: Math.cos(52 * Math.PI / 180), sh: Math.sin(52 * Math.PI / 180), listo: false };
function azDeseado() { const c = T3.camera.position, t = T3.orbit ? T3.orbit.target : T3.sun.target.position; return Math.atan2(c.z - t.z, c.x - t.x) - 0.9; } // 0,9 rad ≈ 52° a la izquierda
function moverSol(dt) {
  const quieta = performance.now() - (T3._movT || 0) > 600 && !T3.anim;
  if (!sol.listo) { sol.az = sol.meta = azDeseado(); sol.listo = true; return; }
  if (quieta) { const d = azDeseado(), df = Math.atan2(Math.sin(d - sol.meta), Math.cos(d - sol.meta)); if (Math.abs(df) > 0.61) sol.meta = d; }
  const df = Math.atan2(Math.sin(sol.meta - sol.az), Math.cos(sol.meta - sol.az)); if (Math.abs(df) > 0.002) sol.az += df * Math.min(1, dt * 3.2);
}
let MAT = null, parques = null, cajasMerc = null, nMerc = -1, ruidoPlano = null, ley = null, leySig = '';
let flujoOrig = null, flujoVisPrev = null, arbolesPrev = null, presentes = new Set(), resaltados = [];
const sv = {}; // valores guardados durante el cuadro

function armar() {
  if (listo) return true;
  T3 = window.KEN_T3; if (!T3 || !T3.scene || !T3.renderer) return false; THREE = T3.THREE; listo = true;
  RELOJ.alDibujar(paso);
  return true;
}

/* ---------- materiales (una vez) ---------- */
const lin = (hex) => new THREE.Color(hex);
function material(hex, inst, po) { // MeshStandard mate, doble cara, sombreado plano: todos comparten UN programa (el color es un uniforme)
  const key = hex + '|' + (inst ? 1 : 0) + '|' + (po ? po.join(',') : '');
  let m = MAT.cache.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color: lin(hex), roughness: 0.9, metalness: 0, flatShading: true, side: THREE.DoubleSide, shadowSide: THREE.BackSide }); // sombra por la cara de atrás: sin acné en los muros
  if (po) { m.polygonOffset = true; m.polygonOffsetFactor = po[0]; m.polygonOffsetUnits = po[1]; }
  MAT.cache.set(key, m); return m;
}
function crearMateriales() {
  MAT = { cache: new Map(), catHex: {} };
  for (const k in CAT) MAT.catHex[k] = parseInt(CAT[k].col.slice(1), 16);
  material(C.edif, false); material(C.edif, true);
  for (const k in CAT) { material(MAT.catHex[k], false); material(MAT.catHex[k], true); }
}

/* parques en verde pálido (data3d/parques.json; polígonos en coordenadas del modelo) — una malla, se arma en reposo */
async function crearParques() {
  try {
    const P = await window.cargarJSON('data3d/parques.json'), lw = T3.lw, formas = [];
    for (const p of P) { const q = p.pts; if (!q || q.length < 4) continue; const s = new THREE.Shape(); q.forEach((v, i) => { const w = lw(v[0], v[1]); i ? s.lineTo(w[0], -w[1]) : s.moveTo(w[0], -w[1]); }); formas.push(s); }
    const g = new THREE.ShapeGeometry(formas, 1); g.rotateX(-Math.PI / 2); g.computeBoundingSphere();
    parques = new THREE.Mesh(g, material(C.parque, false, [-1, -2])); parques.position.y = 0.22; parques.visible = false; parques.receiveShadow = false; parques.name = 'foco-parques';
    T3.scene.add(parques);
  } catch (e) { console.warn('foco · parques:', e); }
}

/* compilación en reposo: un escenario de prueba con cada variante de material, dibujado como lo hace el compositor (en su búfer) y en pantalla */
async function precompilar() {
  const r = T3.renderer, g = new THREE.BoxGeometry(1, 1, 1), sc = new THREE.Scene(), ms = [material(C.edif, false), material(C.edif, true)];
  const a = new THREE.Mesh(g, ms[0]), b = new THREE.InstancedMesh(g, ms[1], 1), c = new THREE.InstancedMesh(g, ms[1], 1);
  b.setMatrixAt(0, new THREE.Matrix4()); c.setMatrixAt(0, new THREE.Matrix4()); c.setColorAt(0, new THREE.Color(1, 1, 1));
  sc.add(a, b, c); for (const o of sc.children) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
  if (pase) { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pase.material); q.frustumCulled = false; sc.add(q); }
  if (velo) sc.add(velo);
  const cam = T3.camera, prev = r.getRenderTarget();
  try {
    if (T3.composer) { r.setRenderTarget(T3.composer.readBuffer); await r.compileAsync(sc, cam, T3.scene); }
    r.setRenderTarget(null); await r.compileAsync(sc, cam, T3.scene);
  } catch (e) { console.warn('foco · precompilar:', e); }
  r.setRenderTarget(prev);
  if (velo) sc.remove(velo); g.dispose();
}

async function crearPase() {
  if (!T3.composer) return;
  const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
  pase = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uFlash: { value: 0 }, uM: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uFlash, uM; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec3 g = mix(c, c * c * (3.0 - 2.0 * c), 0.12);                 // maqueta: contraste muy suave, sin viñeta ni tinte
        g = pow(max(g, 0.0), vec3(0.96));
        c = mix(c, g, uM);
        c = mix(c, vec3(0.965, 0.97, 0.975), uFlash);                   // transición: fundido a blanco y vuelta
        gl_FragColor = vec4(c, 1.0); }`
  });
  pase.material.toneMapped = false; pase.enabled = false; pase.foco = true;
  T3.composer.addPass(pase);
  const ps = T3.composer.passes; for (let i = ps.length - 2; i >= 0; i--) if (ps[i].isShaderPass !== false && ps[i].uniforms && ps[i].uniforms.uNoche) { gradePase = ps[i]; break; }
}
function crearVelo() {
  velo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false, uniforms: { uA: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: 'uniform float uA; void main(){ gl_FragColor = vec4(0.965, 0.97, 0.975, uA); }' }));
  velo.frustumCulled = false; camVelo = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}

function preparar() {
  if (prep) return prep;
  prep = (async () => {
    sv.hemiC = new THREE.Color(); sv.hemiS = new THREE.Color(); sv.solC = new THREE.Color(); sv.solP = new THREE.Vector3(); sv.niebla = new THREE.Color();
    sv.top = new THREE.Color(); sv.mid = new THREE.Color(); sv.bot = new THREE.Color(); sv.fondo = new THREE.Color(); sv.suelo = new THREE.Color(); sv.shM = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    sv.L = { hemiC: lin(LUZ.hemiCielo), hemiS: lin(LUZ.hemiSuelo), sol: lin(LUZ.sol), niebla: lin(LUZ.niebla), top: lin(LUZ.top), mid: lin(LUZ.mid), bot: lin(LUZ.bot), suelo: lin(C.suelo),
      dir: new THREE.Vector3() };
    crearMateriales(); for (let i = 0; i < arb.m.length; i++) arb.c[i] = new THREE.Color();
    await crearPase(); if (!T3.composer) crearVelo();
    await crearParques();
    await precompilar();
  })().catch(e => console.warn('foco · preparar:', e));
  return prep;
}

/* ---------- qué se presta en el cuadro (se rehace cada segundo mientras está la maqueta) ---------- */
const verde = (m) => { const c = m.color; return c && c.g > c.r * 1.12 && c.g > c.b * 1.04; };
const conLuz = (m) => m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && !(m.transparent && m.opacity < 0.98);
const esPlan = new WeakMap();
function planDe(o) { // raíz de data3d/plan_bavaria.js: grupo sin nombre con materiales de fachada «fachadaPlanBav»
  let r = esPlan.get(o); if (r !== undefined) return r; r = false;
  if (o.isGroup && !o.name) for (const c of o.children) { const m = c.material; if (m && m.customProgramCacheKey && /fachadaPlanBav/.test(String(m.customProgramCacheKey()))) { r = true; break; } }
  esPlan.set(o, r); return r;
}
function prestar(o, hex) {
  const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
  const po = m0 && m0.polygonOffset ? [m0.polygonOffsetFactor, m0.polygonOffsetUnits] : null;
  lista.o[lista.n] = o; lista.m[lista.n] = material(hex, o.isInstancedMesh, po); lista.n++;
}
function recorrer(o, cat) { // cat: categoría de la propuesta o null (blanco)
  if (!o.visible) return;
  const c2 = GRUPO_CAT.get(o.name); if (c2) cat = c2;
  if (o.isMesh && !o.isSkinnedMesh) {
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (conLuz(m)) {
      if (cat === 'plan' && !o.castShadow) prestar(o, C.acera); // suelo del plan parcial en concreto (no verde) // suelo del plan parcial (calzadas, andenes, lotes, patios): suelo de la maqueta
      else if (cat) { prestar(o, MAT.catHex[cat]); presentes.add(cat); }
      else if (!verde(m) && !FOTO) prestar(o, C.edif);
    }
  }
  for (const ch of o.children) recorrer(ch, cat);
}
function ponerVis(o, v) { vis.o[vis.n] = o; vis.v[vis.n] = v; vis.n++; }
function resolver() {
  lista.n = 0; vis.n = 0; presentes = new Set();
  const sc = T3.scene, tiles = T3.tiles && T3.tiles.group, edif = new Set((T3.edificios || []).map(e => e.mesh));
  for (const c of sc.children) {
    if (c === tiles || c === parques || c === cajasMerc) continue;
    if (edif.has(c)) recorrer(c, null);
    else if (BLANCOS.has(c.name)) recorrer(c, null);
    else if (GRUPO_CAT.has(c.name)) recorrer(c, null);
    else if (planDe(c)) { recorrer(c, 'plan'); }
  }
  // vías propias (aceras y calzada) en gris claro, visibles aunque la vista de Google las apague
  const V = FOTO ? [] : (T3.viasMallas || []);
  for (let i = 0; i < V.length; i++) { const m = V[i]; if (!m) continue; ponerVis(m, true); if (i < 3) { const po = m.material.polygonOffset ? [m.material.polygonOffsetFactor, m.material.polygonOffsetUnits] : null; lista.o[lista.n] = m; lista.m[lista.n] = material(i === 2 ? C.via : C.acera, false, po); lista.n++; } }
  if (T3.waterMesh && !FOTO) { const m = T3.waterMesh.material; lista.o[lista.n] = T3.waterMesh; lista.m[lista.n] = material(C.agua, false, m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : [-2, -8]); lista.n++; }
  if (tiles && !FOTO) ponerVis(tiles, false);
  if (parques && !FOTO) ponerVis(parques, true);
  // siluetas lejanas de los árboles (material básico, sin luz): se aclaran en el cuadro para que lean verdes junto al blanco
  arb.n = 0; if (!FOTO) for (const c of sc.children) { const m = c.material; if (!c.isInstancedMesh || !c.instanceColor || !m || arb.n >= arb.m.length) continue;
    const sil = m.isMeshBasicMaterial && m.alphaTest > 0, hoja = !sil && /leaves|hoja|copa/i.test(m.name || ''); if (!sil && !hoja) continue;
    let ya = false; for (let j = 0; j < arb.n; j++) if (arb.m[j] === m) ya = true; if (!ya) { arb.k[arb.n] = sil ? ARB_K : HOJA_K; arb.m[arb.n++] = m; } }
  // mercados abiertos: si sus modelos no están en la escena, un volumen azul simple en cada parque
  const gm = sc.getObjectByName('mercados-barrio'), M = window.KEN_MERCADOS;
  const ab = (!gm || !gm.visible) && M && M.abiertos ? M.abiertos() : [];
  if (ab.length !== nMerc) armarMercados(ab);
  if (cajasMerc && ab.length) { ponerVis(cajasMerc, true); presentes.add('mercado'); }
  // mapa de ruido: la escala de color de siempre (amarillo → naranja → rojo), más transparente en el cuadro
  ruidoPlano = sc.getObjectByName('ruido-carros');
  // orden de dibujo: el flujo de carros encima del mapa de ruido (si no, el índigo del ruido tapa las cintas)
  ord.n = 0; if (T3.flujoCarros && T3.flujoCarros.mesh) { ord.o[ord.n] = T3.flujoCarros.mesh; ord.v[ord.n++] = 7; } if (ruidoPlano) { ord.o[ord.n] = ruidoPlano; ord.v[ord.n++] = 3; }
  // lo pedido que existe y se ve (para la leyenda)
  resaltados = [];
  for (const p of pedido) { if (!p || p.isObject3D) continue; const s = String(p).toLowerCase(), ns = ALIAS[s] || [s];
    if (ns.some(n => { const g = sc.getObjectByName(n); return g && g.visible; }) || (s === 'trafico' && T3.flujoCarros && T3.flujoCarros.visible)) { const t = NOMBRE_CAPA[s] || s; if (!resaltados.includes(t)) resaltados.push(t); } }
  leyenda();
}
function armarMercados(ab) {
  nMerc = ab.length;
  if (!cajasMerc) {
    const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
    cajasMerc = new THREE.InstancedMesh(g, material(MAT.catHex.mercado, true), 40); cajasMerc.castShadow = true; cajasMerc.receiveShadow = true; cajasMerc.visible = false; cajasMerc.name = 'foco-mercados'; cajasMerc.frustumCulled = false;
    T3.scene.add(cajasMerc);
  }
  const M = window.KEN_MERCADOS, POR = new Map(((M && M.todos) || []).map(m => [m.id, m])), o = new THREE.Object3D(); let n = 0;
  for (const m of ab) { if (n >= 40) break; const d = POR.get(m.id) || {}, s = 0.6 + 0.4 * (d.s != null ? d.s : 1), pl = m.tipo === 'plazoleta';
    o.position.set(m.x, 0.3, m.z); o.rotation.set(0, d.a || 0, 0); o.scale.set((pl ? 62 : 34) * s, pl ? 9 : 7, (pl ? 26 : 16) * s); o.updateMatrix(); cajasMerc.setMatrixAt(n++, o.matrix); }
  cajasMerc.count = n; cajasMerc.instanceMatrix.needsUpdate = true;
}

/* ---------- flujo de carros con la rampa de la maqueta (colores de crearFlujoCarros: se cambian en su lugar y se devuelven) ---------- */
function flujoMaqueta(on) {
  const FC = T3.flujoCarros; if (!FC || !FC.escala) return;
  if (on && !flujoOrig) {
    flujoOrig = { col: FC.escala.map(e => e[1].slice()), pintar: FC.pintar };
    FC.escala.forEach((e, i) => { const c = ESC_TRAF[Math.min(i, ESC_TRAF.length - 1)][1]; e[1][0] = c[0]; e[1][1] = c[1]; e[1][2] = c[2]; });
    const p0 = flujoOrig.pintar, col = FC.mesh.geometry.attributes.color;
    FC.pintar = () => { p0(); const a = col.array; for (let i = 3; i < a.length; i += 4) if (a[i] > 0) a[i] = Math.min(0.95, 0.5 + a[i] * 0.6); col.needsUpdate = true; }; // más opaco sobre el gris claro
    flujoVisPrev = FC.visible;
    if (pedido.some(p => /^(trafico|carros)$/i.test(String(p))) && !FC.visible) FC.visible = true; else if (FC.visible) FC.pintar();
  } else if (!on && flujoOrig) {
    FC.escala.forEach((e, i) => { const c = flujoOrig.col[i]; e[1][0] = c[0]; e[1][1] = c[1]; e[1][2] = c[2]; });
    FC.pintar = flujoOrig.pintar; flujoOrig = null;
    if (flujoVisPrev === false && FC.visible) FC.visible = false; else if (FC.visible) FC.pintar();
    flujoVisPrev = null;
  }
}

/* ---------- entrar / salir de la maqueta (al cruzar la mitad de la transición, con la imagen en blanco) ---------- */
function aplicar(on) {
  if (aplicado === on) return; aplicado = on;
  if (on) {
    sol.listo = false; moverSol(0);
    resolver(); tRes = performance.now();
    const tr = T3.trees; arbolesPrev = null; if (tr && tr.ver && tr.visible === false) { arbolesPrev = false; tr.ver(true); }
    flujoMaqueta(true);
  } else {
    lista.n = 0; vis.n = 0; arb.n = 0; ord.n = 0;
    if (arbolesPrev === false && T3.trees && T3.trees.ver) T3.trees.ver(false); arbolesPrev = null;
    flujoMaqueta(false);
    if (ley) ley.classList.remove('on');
  }
  if (T3.renderer.shadowMap) T3.renderer.shadowMap.needsUpdate = true;
}

/* ---------- lo que se pone y se devuelve en cada cuadro ---------- */
function antes() {
  const r = T3.renderer, sc = T3.scene, L = sv.L;
  if (!aplicado) { if (REALCE_VISTA_NORMAL > 0 && k === 0) { sv.exp = r.toneMappingExposure; sv.hemiI = T3.hemi.intensity; r.toneMappingExposure *= 1 + REALCE_VISTA_NORMAL; T3.hemi.intensity *= 1 + REALCE_VISTA_NORMAL * 1.9; sv.realce = true; } return; }
  sv.realce = false;
  for (let i = 0; i < lista.n; i++) { const o = lista.o[i]; lista.prev[i] = o.material; o.material = lista.m[i]; }
  for (let i = 0; i < vis.n; i++) { const o = vis.o[i], v = vis.v[i]; vis.v[i] = o.visible; o.visible = v; } // vis.v guarda el valor previo durante el cuadro
  for (let i = 0; i < ord.n; i++) { const o = ord.o[i], v = ord.v[i]; ord.v[i] = o.renderOrder; o.renderOrder = v; }
  sv.bias = T3.sun.shadow.bias; T3.sun.shadow.bias = -0.0007;
  sv.rop = -1; if (ruidoPlano && ruidoPlano.visible && ruidoPlano.material) { sv.rop = ruidoPlano.material.opacity; ruidoPlano.material.opacity = sv.rop * RUIDO_OPAC; }
  for (let i = 0; i < arb.n; i++) { const m = arb.m[i], c = m.color, K = arb.k[i]; arb.c[i].copy(c); c.r *= K[0]; c.g *= K[1]; c.b *= K[2]; m._op = m.opacity; m._tr = m.transparent; m._dw = m.depthWrite; m.transparent = true; m.opacity = (m._op == null ? 1 : m._op) * ARB_OPAC; m.depthWrite = false; }
  const h = T3.hemi, s = T3.sun;
  sv.hemiC.copy(h.color); sv.hemiS.copy(h.groundColor); sv.hemiI = h.intensity; h.color.copy(L.hemiC); h.groundColor.copy(L.hemiS); h.intensity = LUZ.hemi;
  sv.solC.copy(s.color); sv.solI = s.intensity; sv.solP.copy(s.position); s.color.copy(L.sol); s.intensity = LUZ.solI; L.dir.set(Math.cos(sol.az) * sol.ch, sol.sh, Math.sin(sol.az) * sol.ch).multiplyScalar(2600); s.position.copy(s.target.position).add(L.dir); s.updateMatrixWorld();
  /* la sombra tiene que ser la de ESTE sol: si otro dibujo fuera del cuadro (vista cenital de cubiertas, miniaturas…) la rehízo con el sol de la
     hora, su matriz ya no es la que dejó la maqueta y se rehace aquí (si no, todo queda en la sombra larga del amanecer) */
  if (r.shadowMap.enabled && s.castShadow && !s.shadow.matrix.equals(sv.shM)) r.shadowMap.needsUpdate = true;
  sv.exp = r.toneMappingExposure; r.toneMappingExposure = LUZ.exp;
  if (sc.fog) { sv.niebla.copy(sc.fog.color); sv.dens = sc.fog.density; sc.fog.color.copy(L.niebla); sc.fog.density = 4.6e-5 * LUZ.densK; }
  if (sc.background && sc.background.isColor) { sv.fondo.copy(sc.background); sc.background.copy(L.bot); }
  const U = T3.skyU; if (U) { sv.top.copy(U.top.value); sv.mid.copy(U.mid.value); sv.bot.copy(U.bot.value); U.top.value.copy(L.top); U.mid.value.copy(L.mid); U.bot.value.copy(L.bot);
    sv.cl = U.uCloud.value; U.uCloud.value = 0.12; if (U.uGlow) { sv.gl = U.uGlow.value; U.uGlow.value = 0.25; } if (U.uStars) { sv.st = U.uStars.value; U.uStars.value = 0; } if (U.uMoon) { sv.mo = U.uMoon.value; U.uMoon.value = 0; } if (U.uHorA) { sv.ha = U.uHorA.value; U.uHorA.value = 0; } }
  const sb = T3.sueloBase; if (sb) { sv.suelo.copy(sb.material.color); sb.material.color.copy(L.suelo); }
  if (gradePase) { sv.grade = gradePase.enabled; gradePase.enabled = false; }
}
function despues() {
  const r = T3.renderer, sc = T3.scene;
  if (!aplicado) { if (sv.realce) { r.toneMappingExposure = sv.exp; T3.hemi.intensity = sv.hemiI; sv.realce = false; } return; }
  for (let i = 0; i < lista.n; i++) lista.o[i].material = lista.prev[i];
  for (let i = 0; i < vis.n; i++) { const o = vis.o[i], v = vis.v[i]; vis.v[i] = o.visible; o.visible = v; }
  for (let i = 0; i < arb.n; i++) { const m = arb.m[i]; m.color.copy(arb.c[i]); if (m._op != null) { m.opacity = m._op; m.transparent = m._tr; m.depthWrite = m._dw; } }
  for (let i = 0; i < ord.n; i++) { const o = ord.o[i], v = ord.v[i]; ord.v[i] = o.renderOrder; o.renderOrder = v; }
  T3.sun.shadow.bias = sv.bias;
  if (sv.rop >= 0 && ruidoPlano && ruidoPlano.material) ruidoPlano.material.opacity = sv.rop;
  const h = T3.hemi, s = T3.sun;
  h.color.copy(sv.hemiC); h.groundColor.copy(sv.hemiS); h.intensity = sv.hemiI;
  sv.shM.copy(s.shadow.matrix);
  s.color.copy(sv.solC); s.intensity = sv.solI; s.position.copy(sv.solP); s.updateMatrixWorld();
  r.toneMappingExposure = sv.exp;
  if (sc.fog) { sc.fog.color.copy(sv.niebla); sc.fog.density = sv.dens; }
  if (sc.background && sc.background.isColor) sc.background.copy(sv.fondo);
  const U = T3.skyU; if (U) { U.top.value.copy(sv.top); U.mid.value.copy(sv.mid); U.bot.value.copy(sv.bot); U.uCloud.value = sv.cl; if (U.uGlow) U.uGlow.value = sv.gl; if (U.uStars) U.uStars.value = sv.st; if (U.uMoon) U.uMoon.value = sv.mo; if (U.uHorA) U.uHorA.value = sv.ha; }
  const sb = T3.sueloBase; if (sb) sb.material.color.copy(sv.suelo);
  if (gradePase) gradePase.enabled = sv.grade;
}
function dibujarVelo() {
  if (!velo || velo.material.uniforms.uA.value <= 0.002) return;
  const r = T3.renderer, ac = r.autoClear; r.autoClear = false; (origRend || r.render).call(r, velo, camVelo); r.autoClear = ac;
}
function enganchar() {
  const comp = T3.composer;
  if (comp) { if (!origComp) { origComp = comp.render; comp.render = function (d) { if (dentro) return origComp.call(this, d); dentro = true; antes(); try { origComp.call(this, d); } finally { despues(); dentro = false; } }; } }
  else if (!origRend) {
    const r = T3.renderer; origRend = r.render;
    r.render = function (s, c) { if (s !== T3.scene || dentro) return origRend.call(this, s, c); dentro = true; antes(); try { origRend.call(this, s, c); } finally { despues(); dentro = false; } dibujarVelo(); };
  }
}
function soltar() {
  if (REALCE_VISTA_NORMAL > 0) return; // con el realce de la vista normal el envoltorio queda puesto
  if (origComp && T3.composer) T3.composer.render = origComp; origComp = null;
  if (origRend) { T3.renderer.render = origRend; origRend = null; }
}

function paso() {
  if (!listo || (k === 0 && meta === 0)) return;
  const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
  k = meta > k ? Math.min(meta, k + dt / DUR) : Math.max(meta, k - dt / DUR);
  const e = k * k * (3 - 2 * k), flash = Math.pow(Math.max(0, 1 - Math.abs(2 * e - 1)), 1.3) * 0.94;
  if (meta > 0 && e >= 0.5) aplicar(true); else if (meta === 0 && e < 0.5) aplicar(false);
  if (pase) { pase.uniforms.uFlash.value = flash; pase.uniforms.uM.value = aplicado ? 1 : 0; pase.enabled = k > 0; }
  if (velo) velo.material.uniforms.uA.value = flash;
  if (aplicado) moverSol(dt);
  if (aplicado && ahora - tRes > 1000) { tRes = ahora; resolver(); } // capas que se prenden después (ruido, huertas que abren, mercados…)
  if (k === 0 && meta === 0) { if (pase) pase.enabled = false; soltar(); }
}

/* ---------- leyenda (tarjeta de vidrio) ---------- */
function estilos() {
  if (document.getElementById('foco-ley-css')) return;
  const st = document.createElement('style'); st.id = 'foco-ley-css';
  st.textContent = `#foco-ley{position:fixed;right:16px;bottom:16px;z-index:38;width:252px;max-height:calc(100vh - 120px);overflow:auto;padding:12px 14px 11px;box-sizing:border-box;
  font:400 11px/1.35 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#e9ebec);background:var(--ui-bg,rgba(13,15,18,.74));border:1px solid var(--ui-bd,rgba(255,255,255,.075));
  border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);
  opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s;pointer-events:none;scrollbar-width:thin}
#foco-ley.on{opacity:1;transform:none;pointer-events:auto}
#foco-ley h4{margin:0 0 9px;font:500 9.5px var(--ui-mono,ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--ui-tx2,#9aa2a7)}
#foco-ley .r{margin:0 0 9px}#foco-ley .r b{display:block;font-weight:500;font-size:11px;margin-bottom:4px}#foco-ley .r b small{font-weight:400;color:var(--ui-tx3,#646c71);margin-left:4px}
#foco-ley .r i{display:block;height:7px;border-radius:4px}#foco-ley .r .l{display:flex;justify-content:space-between;font:400 9.5px var(--ui-mono,monospace);color:var(--ui-tx3,#646c71);margin-top:3px;font-variant-numeric:tabular-nums}
#foco-ley ul{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:4px}#foco-ley li{display:flex;align-items:center;gap:7px}
#foco-ley li em{flex:none;width:11px;height:11px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}#foco-ley li em.p{border-radius:50%;background:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.18)}
#foco-ley .s{border-top:1px solid var(--ui-bd,rgba(255,255,255,.075));padding-top:8px;margin-top:2px;display:flex;flex-wrap:wrap;gap:4px 10px;color:var(--ui-tx2,#9aa2a7);font-size:10px}
#foco-ley .s span{display:inline-flex;align-items:center;gap:5px}#foco-ley .s em{width:9px;height:9px;border-radius:2px}
@media (max-width:700px){#foco-ley{right:auto;left:50%;transform:translate(-50%,6px);bottom:86px;width:min(320px,calc(100vw - 32px));max-height:34vh;padding:10px 12px}#foco-ley.on{transform:translate(-50%,0)}}`;
  document.head.appendChild(st);
}
const hx = (n) => '#' + n.toString(16).padStart(6, '0');
function leyenda() {
  const ruido = !!(ruidoPlano && ruidoPlano.visible), FC = T3.flujoCarros, traf = !!(FC && FC.visible), cats = Object.keys(CAT).filter(c => presentes.has(c));
  const sig = [ruido, traf, cats.join(','), resaltados.join(',')].join('|');
  if (!ley) { estilos(); ley = document.createElement('div'); ley.id = 'foco-ley'; ley.setAttribute('role', 'note'); ley.setAttribute('aria-label', 'Leyenda de la maqueta'); document.body.appendChild(ley); }
  if (sig !== leySig) {
    leySig = sig; let h = '<h4>Lo que cambia</h4>';
    if (ruido) h += `<div class="r"><b>Ruido de los carros<small>dB</small></b><i style="background:linear-gradient(90deg,${RAMPA_RUIDO.join(',')})"></i><div class="l"><span>55</span><span>60</span><span>65</span><span>70+</span></div></div>`;
    if (traf) h += `<div class="r"><b>Flujo de carros<small>carros/km por carril</small></b><i style="background:linear-gradient(90deg,${ESC_TRAF.map(([d, c]) => `rgb(${c.map(x => Math.round(x * 255)).join(',')}) ${Math.round(d / 30 * 100)}%`).join(',')})"></i><div class="l"><span>pocos</span><span>muchos</span></div></div>`;
    if (cats.length) h += '<ul>' + cats.map(c => `<li><em style="background:${CAT[c].col}"></em>${CAT[c].t}</li>`).join('') + '</ul>';
    const otros = resaltados.filter(t => !(ruido && t === NOMBRE_CAPA.ruido) && !(traf && t === NOMBRE_CAPA.trafico));
    if (otros.length) h += '<ul>' + otros.map(t => `<li><em class="p"></em>${t}<span style="color:var(--ui-tx3,#646c71);margin-left:auto;font-size:9.5px">en color</span></li>`).join('') + '</ul>';
    if (!FOTO) h += `<div class="s"><span><em style="background:${hx(C.edif)}"></em>Edificios</span><span><em style="background:#5f9a4a"></em>Árboles</span><span><em style="background:${hx(C.parque)}"></em>Parques</span><span><em style="background:${hx(C.agua)}"></em>Agua</span></div>`;
    ley.innerHTML = h;
  }
  if (aplicado) { colocarLeyenda(); ley.classList.add('on'); }
}
/* a la izquierda del panel derecho de la simulación (#su-der) y encima de la barra de años (#lp-anos), sin taparlos; en celular, la hoja de estilos */
function colocarLeyenda() {
  if (innerWidth <= 700) { ley.style.right = ley.style.bottom = ''; return; }
  const der = document.getElementById('su-der'), an = document.getElementById('lp-anos');
  const seVe = (e) => e && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const rd = seVe(der) ? der.getBoundingClientRect() : null, ra = seVe(an) ? an.getBoundingClientRect() : null;
  let right = 16, bottom = 16;
  if (rd && rd.width > 0 && rd.bottom > innerHeight - 260) right = Math.round(innerWidth - rd.left + 12); // el panel derecho llega hasta abajo: a su izquierda
  if (ra && ra.width > 0 && innerWidth - right - 252 < ra.right) bottom = Math.round(innerHeight - ra.top + 12); // se cruzaría con la barra de años: encima
  ley.style.right = right + 'px'; ley.style.bottom = bottom + 'px';
}

/* ---------- API ---------- */
async function on(capa, opc) {
  if (!armar()) { console.warn('KEN_FOCO: el 3D aún no está listo'); return false; }
  pedido = Array.isArray(capa) ? capa.slice() : capa == null ? [] : [capa];
  enganchar();
  meta = 1; tPrev = 0;
  await preparar(); // normalmente ya está (se prepara en reposo al cargar)
  if (aplicado) { resolver(); tRes = performance.now(); if (pedido.some(p => /^(trafico|carros)$/i.test(String(p))) && T3.flujoCarros && !T3.flujoCarros.visible) T3.flujoCarros.visible = true; }
  return true;
}
function off() { meta = 0; tPrev = 0; }

/* preparación en reposo: materiales, parques y compilación de programas apenas el 3D está listo (así el primer «Ver» no se traba) */
(function esperar(n) {
  const T = window.KEN_T3, ld = document.getElementById('loader');
  if (T && T.scene && ld && ld.classList.contains('hidden') && (T.composer || n > 40)) {
    armar(); const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
    idle(() => { preparar().then(() => { if (REALCE_VISTA_NORMAL > 0) enganchar(); }); }, { timeout: 4000 }); return;
  }
  setTimeout(() => esperar(n + 1), 1000);
})(0);

window.KEN_FOCO = { on, off, get activo() { return meta > 0; }, get nivel() { return k; }, ajustes: { LUZ, ARB_K, HOJA_K, sol } /* para afinar la luz desde la consola */ };
export default window.KEN_FOCO;
