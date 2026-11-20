/* ============ Presentación «Bavaria Común» (bavaria.html) ============
   Presentación por diapositivas que sigue el guion: todo ocurre en la escena 3D (malla fotorrealista de Google + lo propuesto encima).
   Datos: data3d/bavaria_pres.json (tools/bavaria_pres_datos.py). Cifras externas: ver la lista FUENTES al final. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const MOVIL = matchMedia('(max-width:760px)').matches;
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });

const D = await fetch('data3d/bavaria_pres.json?v=1').then(r => r.json());
const [CX, CY] = D.centro;
const W = (x, y) => [x - CX, -(y - CY)]; // modelo (x este, y norte) -> three (X, Z)

/* ---------------- cifras del proyecto (todas derivadas de los datos o de supuestos declarados) ---------------- */
const poligonoArea = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
const perim = (p) => { let l = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; l += Math.hypot(b[0] - a[0], b[1] - a[1]); } return l; };
// programa: índice del edificio en bavaria.json -> uso propuesto
const PROG = {
  0: { n: 'Invernadero hidropónico', c: '#8fc46a', inv: true },
  2: { n: 'Módulos demostrativos e invernadero', c: '#8fc46a', inv: true },
  3: { n: 'Mercado y registro de pedidos', c: '#e3a64a' },
  4: { n: 'Casa de la federación: asambleas y talleres', c: '#e0664f' },
  5: { n: 'Laboratorio universitario', c: '#a98bd6' },
  6: { n: 'Silos: banco de semillas y mirador de aves', c: '#5fb3d9' },
  7: { n: 'Cocina y comedor comunitario', c: '#e58aa8' },
  8: { n: 'Cuidados: niñez y personas mayores', c: '#f0c6d6' },
  9: { n: 'Energía: biodigestor y paneles', c: '#e8d26a' },
  11: { n: 'Promotores barriales', c: '#d98f5a' },
  23: { n: 'Laboratorio de hongos', c: '#d9c7ef' },
  19: { n: 'Taller de bicicargas', c: '#7fb0c9' },
};
const invArea = Object.entries(PROG).filter(([, v]) => v.inv).reduce((s, [i]) => s + poligonoArea(D.edif[i].p), 0);
const S = D.suelo;
const C = {
  inv_m2: Math.round(invArea * 0.6 / 100) * 100,           // 60 % de la planta cultivable bajo cubierta [propuesta]
  rend: { banc: 5, inv: 10, techo: 4 },                      // kg/m²/año [est.]: 3-8 a cielo abierto; bajo cubierta más
  pob: 40320, hogares: Math.round(40320 / 2.9),              // UPZ 113 Bavaria (SDS 2021); 2,9 personas por hogar
  porcion: 0.2 * 365,                                        // 200 g/día de hortalizas por persona
  kgHab: 0.8, organico: 0.51, separa: 0.6, cora: 5, rendCompost: 0.4,
};
C.prod_banc = S.bancales_m2 * C.rend.banc / 1000; C.prod_inv = C.inv_m2 * C.rend.inv / 1000; C.prod_techo = S.techos_m2 * C.rend.techo / 1000;
C.prod = C.prod_banc + C.prod_inv + C.prod_techo;
C.personas = C.prod * 1000 / C.porcion;
C.area_cult = S.bancales_m2 + C.inv_m2 + S.techos_m2;
C.res = C.pob * C.kgHab / 1000; C.org = C.res * C.organico; C.sep = C.org * C.separa; C.comp_in = C.sep + C.cora; C.comp_out = C.comp_in * C.rendCompost;
C.nucleos = Math.round(C.area_cult / 1000);
const V = {
  area_ha: fmt(D.area_ha, 1), edif_n: fmt(D.edif.length), edif_m2: fmt(S.edif_m2), arboles: fmt(S.arboles), arboles_bosque: fmt(S.arboles_bosque),
  perimetro: fmt(perim(D.sitio) / 1000, 1), pasajes_km: fmt(D.pasajes_m / 1000, 1), entradas: fmt(D.entradas.length), bancales: fmt(D.bancales.length), bloques: fmt((D.bloques || []).length),
  bancales_m2: fmt(S.bancales_m2), libre_ha: fmt(S.libre_ha, 1), inv_m2: fmt(C.inv_m2), techos_m2: fmt(S.techos_m2), techos_n: fmt(D.techos.length),
};

/* ---------------- sintaxis: estadísticas locales ---------------- */
const SXD = await fetch('data3d/bavaria_sx.json?v=2').then(r => r.json()); // red de TODA Kennedy (+500 m), antes y después
const SEG = SXD.seg;
const KEN_C = (() => { const p = SXD.limite; let x = 0, y = 0; p.forEach(q => { x += q[0]; y += q[1]; }); return W(x / p.length, y / p.length); })();
const distLote = (() => { // distancia de un punto al borde del lote (0 si está adentro)
  const P = D.sitio;
  const dentro = (x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  return (x, y) => { if (dentro(x, y)) return 0; let m = 1e9; for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length]; const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); m = Math.min(m, Math.hypot(ax + t * dx - x, ay + t * dy - y)); } return m; };
})();
for (const s of SEG) { let l = 0; for (let i = 1; i < s.p.length; i++) l += Math.hypot(s.p[i][0] - s.p[i - 1][0], s.p[i][1] - s.p[i - 1][1]); s.L = l; const m = s.p[Math.floor(s.p.length / 2)]; s.d = distLote(m[0], m[1]); }
const ordenA = [0, 1, 2].map(k => SEG.filter(s => s.a).map(s => s.a[k]).sort((a, b) => a - b));
const pct = (v, k) => { const A = ordenA[k]; let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] <= v) lo = m + 1; else hi = m; } return lo / A.length; };
const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const nuevos = SEG.filter(s => s.n);
const SX = {
  nuevoNain: Math.round(100 * pct(med(nuevos.map(s => s.b[0])), 0)), nuevoNain8: Math.round(100 * pct(med(nuevos.map(s => s.b[1])), 1)),
  nuevoNach: Math.round(100 * pct(med(nuevos.map(s => s.b[2])), 2)), nuevoNachMax: Math.round(100 * pct(Math.max(...nuevos.map(s => s.b[2])), 2)),
};
const cambio = (R, k) => { const sel = SEG.filter(s => s.a && s.d < R); const w = sel.reduce((t, s) => t + s.L, 0); const a = sel.reduce((t, s) => t + s.a[k] * s.L, 0) / w, b = sel.reduce((t, s) => t + s.b[k] * s.L, 0) / w; return { a, b, p: 100 * (b - a) / a, n: sel.length }; };
SX.c300 = [0, 1, 2].map(k => cambio(300, k));
const deltas = SEG.filter(s => s.a).map(s => Math.abs((s.b[1] - s.a[1]) / s.a[1]));
SX.dmax = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length * 0.99)] || 0.01;
// dónde sube más: distancia media al lote del 5 % de tramos que más suben
{ const top = SEG.filter(s => s.a).map(s => ({ s, d: (s.b[1] - s.a[1]) / s.a[1] })).sort((a, b) => b.d - a.d).slice(0, Math.round(SEG.length * 0.02));
  SX.bajan = 100 * SEG.filter(s => s.a && s.b[1] < s.a[1] * 0.995).length / SEG.length; SX.suben = 100 * SEG.filter(s => s.a && s.b[1] > s.a[1] * 1.005).length / SEG.length;
  SX.topDist = med(top.map(t => t.s.d)); SX.topMax = 100 * top[0].d; }
V.sx_nuevo = SX.nuevoNain; V.sx_nuevo8 = SX.nuevoNain8; V.sx_nach = SX.nuevoNach; V.sx_nachmax = SX.nuevoNachMax;
V.sx_c300 = fmt(SX.c300[0].p, 1); V.sx_c300_8 = fmt(SX.c300[1].p, 1); V.sx_top = fmt(SX.topDist); V.sx_topmax = fmt(SX.topMax, 1); V.sx_suben = fmt(SX.suben, 0); V.sx_bajan = fmt(SX.bajan, 0);
document.querySelectorAll('[data-v]').forEach(e => { const v = V[e.dataset.v]; if (v !== undefined) e.textContent = v; });

/* =============================== ESCENA 3D =============================== */
const host = $('#lienzo');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#0b0d10'); gr.addColorStop(0.55, '#1a2129'); gr.addColorStop(0.8, '#3a4048'); gr.addColorStop(1, '#4a4a45'); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
// cámara de lente larga (casi axonométrica) para que la malla fotorrealista de Google cargue su detalle
const FOV = 42;
const cam = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 10, 60000);
scene.fog = new THREE.Fog('#3a4048', 30000, 90000);
scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x1a1f24, 1.1));
// brillo (bloom) solo para lo más luminoso: redes, pulsos e íconos
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), MOVIL ? 0.45 : 0.6, 0.45, 0.88); composer.addPass(bloom); composer.addPass(new OutputPass());
const sol = new THREE.DirectionalLight(0xfff1dc, 2.1); sol.position.set(-600, 900, 400); scene.add(sol);
const sol2 = new THREE.DirectionalLight(0x9fb7d0, 0.6); sol2.position.set(700, 500, -300); scene.add(sol2);

/* ---------------- malla fotorrealista de Google (la misma del simulador) ---------------- */
// Google Photorealistic 3D Tiles: la fábrica, el bosque y los barrios tal como están, con su foto. Encima va solo lo de la propuesta.
const GKEY = 'AIzaSyCF2MXjc0DYRFrHk7j_BCyxVpWOdYqDIC4'; // la misma llave del simulador (index.html)
const MXg = 111320 * Math.cos(4.63 * Math.PI / 180), MYg = 110540;
const aLL = (x, y) => [-74.17 + (x - 5193.24) / MXg, 4.63 + (y - 2090.06) / MYg]; // modelo -> [lng, lat]
const G = { tiles: null, dy: 0, M: null, luz: 1, luzObj: 1, mats: new Set(), ok: null, calib: 0, t: 0, atrib: 0 };
const SIN_G = new URLSearchParams(location.search).get('google') === '0';
const REAL = () => !SIN_G && G.ok !== false; // con la malla: la foto es el mundo y lo propio va encima
const gradoU = { uSat: { value: 1.18 }, uCon: { value: 0.92 }, uBri: { value: 1.18 } };
async function crearGoogle() {
  const [TR, PL] = await Promise.all([import('3d-tiles-renderer'), import('3d-tiles-renderer/plugins')]);
  const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
  const draco = new DRACOLoader().setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/gltf/');
  const tiles = new TR.TilesRenderer();
  tiles.registerPlugin(new PL.GoogleCloudAuthPlugin({ apiToken: GKEY, autoRefreshToken: true }));
  tiles.registerPlugin(new PL.GLTFExtensionsPlugin({ dracoLoader: draco }));
  tiles.setCamera(cam); tiles.setResolutionFromRenderer(cam, renderer);
  tiles.errorTarget = 40; G.meta = MOVIL ? 14 : 5;
  const q = aLL(CX, CY), D2R = Math.PI / 180, frame = new THREE.Matrix4();
  TR.WGS84_ELLIPSOID.getEastNorthUpFrame(q[1] * D2R, q[0] * D2R, frame);
  frame.multiply(new THREE.Matrix4().makeTranslation(0, 0, 2564)); // altura elipsoidal del suelo de Kennedy (medida en el simulador); luego se calibra
  G.M = new THREE.Matrix4().makeRotationX(-Math.PI / 2).multiply(frame.invert());
  tiles.group.matrixAutoUpdate = false; aplicarG(tiles);
  tiles.addEventListener('load-model', ({ scene: s }) => s.traverse(c => {
    const m = c.isMesh && c.material; if (!m || !m.map) return;
    m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (!m.isMeshBasicMaterial) { m.emissiveMap = m.map; m.emissive.setScalar(G.luz); m.color.setScalar(0); m.roughness = 1; m.metalness = 0; }
    else m.color.setScalar(G.luz);
    m.toneMapped = false;
    m.onBeforeCompile = (sh) => { // gradación tipo maqueta: menos bruma, más saturación (como el simulador)
      Object.assign(sh.uniforms, gradoU);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSat, uCon, uBri;')
        .replace('#include <opaque_fragment>', `{ vec3 c = max(outgoingLight - vec3(0.030, 0.036, 0.048), 0.0) / 0.96; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, uSat), 0.0); c += vec3(0.026, 0.032, 0.046) * (1.0 - smoothstep(0.0, 0.16, l)); outgoingLight = pow(c / 0.18, vec3(uCon)) * 0.18 * uBri; }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'gradoBavaria'; m.needsUpdate = true;
    G.mats.add(m); c.renderOrder = -10;
  }));
  tiles.addEventListener('dispose-model', ({ scene: s }) => s.traverse(c => { if (c.isMesh) G.mats.delete(c.material); }));
  tiles.addEventListener('load-error', (e) => console.warn('tesela', e && e.error && e.error.message, e && e.url));
  scene.add(tiles.group); G.tiles = tiles; G.ok = true;
}
const aplicarG = (tl = G.tiles) => { tl.group.matrix.makeTranslation(0, G.dy, 0).multiply(G.M); tl.group.matrixWorldNeedsUpdate = true; tl.group.updateMatrixWorld(true); };
// el suelo de la foto se pone en y = 0 midiendo la malla sobre las puertas del predio (cruces de calle): percentil bajo para no medir techos ni copas
function calibrarG() {
  const st = G.tiles.stats; if (st.downloading + st.parsing > 4 || G.tiles.errorTarget > 12) return false;
  const rc = new THREE.Raycaster(), ab = new THREE.Vector3(0, -1, 0), hits = [];
  for (const [x, y] of D.entradas) for (const d of [[0, 0], [12, 0], [-12, 0], [0, 12], [0, -12]]) { const [X, Z] = W(x + d[0], y + d[1]); rc.set(new THREE.Vector3(X, 400, Z), ab); const h = rc.intersectObject(G.tiles.group, true)[0]; if (h && Math.abs(h.point.y) < 60) hits.push(h.point.y); }
  if (hits.length < 12) return false;
  hits.sort((a, b) => a - b); G.dy -= hits[Math.floor(hits.length * 0.25)]; aplicarG(); return true;
}
function actualizarG(dt) {
  const tl = G.tiles; if (!tl) return;
  try {
    tl.setResolutionFromRenderer(cam, renderer); cam.updateMatrixWorld(); tl.update();
    const st = tl.stats; if (tl.errorTarget > G.meta && st.downloading === 0 && st.parsing === 0 && st.visible > 3) tl.errorTarget = Math.max(G.meta, Math.round(tl.errorTarget * 0.62));
    G.t += dt; if (G.calib < 2 && G.t > [3, 12][G.calib]) { if (calibrarG()) G.calib++; else G.t = 0; }
    if (Math.abs(G.luz - G.luzObj) > 0.005) { G.luz += (G.luzObj - G.luz) * Math.min(1, dt * 4); for (const m of G.mats) { if (m.isMeshBasicMaterial) m.color.setScalar(G.luz); else m.emissive.setScalar(G.luz); } }
    if ((G.atrib -= dt) <= 0) { G.atrib = 2; if (location.search.includes('debug')) console.log('malla', JSON.stringify(tl.stats), tl.errorTarget, G.dy.toFixed(1), G.mats.size); const t = tl.getAttributions().filter(a => a.type === 'string').map(a => a.value).join(' · '); const el = document.getElementById('atrib'); if (el) el.textContent = /^google/i.test(t) ? t : 'Google' + (t ? ' · ' + t : ''); }
  } catch (err) { if (!G.fallo) { G.fallo = true; console.warn('malla', err); } }
}
if (!SIN_G) crearGoogle().catch(err => { console.warn('sin malla de Google', err); G.ok = false; setEscena(escena); });

const raiz = new THREE.Group(); scene.add(raiz);
const capas = {}; // grupos que se separan en la axonometría explotada
for (const k of ['suelo', 'red', 'edif', 'bosque', 'flujos']) { capas[k] = new THREE.Group(); capas[k].userData.y = 0; raiz.add(capas[k]); }
const ctxG = new THREE.Group(); raiz.add(ctxG);

// suelo general y lote
const piso = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshBasicMaterial({ color: '#0e141a' }));
piso.rotation.x = -Math.PI / 2; piso.position.y = -0.3; scene.add(piso);
const forma = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => { const X = x - CX, Y = y - CY; i ? s.lineTo(X, Y) : s.moveTo(X, Y); }); return s; };
const loteMat = new THREE.MeshLambertMaterial({ color: '#1d2a22', transparent: true });
const lote = new THREE.Mesh(new THREE.ShapeGeometry(forma(D.sitio)), loteMat); lote.rotation.x = -Math.PI / 2; lote.position.y = 0.05; capas.suelo.add(lote);
// borde del lote (línea) y muro
const bordePts = D.sitio.concat([D.sitio[0]]).map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 0.4, Z); });
const bordeMat = new THREE.LineBasicMaterial({ color: '#e3a64a', transparent: true, depthTest: false });
const borde = new THREE.Line(new THREE.BufferGeometry().setFromPoints(bordePts), bordeMat); capas.suelo.add(borde);
const muroGeo = (() => { const g = []; for (let i = 0; i < D.sitio.length; i++) { const a = D.sitio[i], b = D.sitio[(i + 1) % D.sitio.length]; const [ax, az] = W(...a), [bx, bz] = W(...b); const L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue; const m = new THREE.BoxGeometry(L, 3.2, 0.5); m.rotateY(-Math.atan2(bz - az, bx - ax)); m.translate((ax + bx) / 2, 1.6, (az + bz) / 2); g.push(m); } return mergeGeometries(g); })();
const muroMat = new THREE.MeshLambertMaterial({ color: '#8c7d6c', transparent: true });
const muro = new THREE.Mesh(muroGeo, muroMat); capas.edif.add(muro);

// contexto: huellas extruidas fusionadas, con color por vértice (gris o por sector)
const ENT = D.entradas.map(([x, y]) => [x, y]);
const angC = (x, y) => Math.atan2(y - CY, x - CX);
// sectores: las puertas se agrupan de a dos por ángulo alrededor del predio
const entOrden = ENT.map((p, i) => ({ i, a: angC(...p) })).sort((a, b) => a.a - b.a);
const NSECT = 8; const sectorDeEnt = new Array(ENT.length);
entOrden.forEach((e, k) => { sectorDeEnt[e.i] = Math.floor(k * NSECT / ENT.length); });
const sectAng = Array.from({ length: NSECT }, (_, s) => { const es = entOrden.filter((e, k) => Math.floor(k * NSECT / ENT.length) === s); const x = es.reduce((t, e) => t + Math.cos(e.a), 0), y = es.reduce((t, e) => t + Math.sin(e.a), 0); return Math.atan2(y, x); });
const sectorDe = (x, y) => { const a = angC(x, y); let b = 0, m = 9; sectAng.forEach((s, k) => { const d = Math.abs(Math.atan2(Math.sin(a - s), Math.cos(a - s))); if (d < m) { m = d; b = k; } }); return b; };
const COL_SECT = ['#e3a64a', '#8fc46a', '#5fb3d9', '#e0664f', '#a98bd6', '#e58aa8', '#d9c06a', '#6fc7b4'];
const altCtx = new Map();
const ctxGeo = (() => {
  const gs = []; const gris = new THREE.Color('#5a6670');
  for (const b of D.contexto) {
    const g = new THREE.ExtrudeGeometry(forma(b.p), { depth: Math.max(3, b.h), bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const n = g.attributes.position.count; const col = new Float32Array(n * 3); const sc = new Float32Array(n * 3);
    const cx = b.p.reduce((t, p) => t + p[0], 0) / b.p.length, cy = b.p.reduce((t, p) => t + p[1], 0) / b.p.length;
    const sc0 = new THREE.Color(COL_SECT[sectorDe(cx, cy)]).lerp(new THREE.Color('#0b1015'), Math.min(0.75, Math.max(0, (Math.hypot(cx - CX, cy - CY) - 500) / 1100)));
    for (let i = 0; i < n; i++) { col.set([gris.r, gris.g, gris.b], i * 3); sc.set([sc0.r, sc0.g, sc0.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('csect', new THREE.BufferAttribute(sc, 3)); g.deleteAttribute('uv');
    gs.push(g); altCtx.set(b.p[0][0] + ',' + b.p[0][1], Math.max(3, b.h));
  }
  return mergeGeometries(gs);
})();
const colGris = ctxGeo.attributes.color.array.slice();
const ctxMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true });
const ctxMesh = new THREE.Mesh(ctxGeo, ctxMat); ctxG.add(ctxMesh);
let modoCtx = 'gris';
const pintarCtx = (m) => { if (m === modoCtx) return; modoCtx = m; ctxGeo.attributes.color.array.set(m === 'sector' ? ctxGeo.attributes.csect.array : colGris); ctxGeo.attributes.color.needsUpdate = true; };

// edificios del predio: masas (hoy) y retícula de los esqueletos
const HOY = { esqueleto: '#9b9387', ladrillo: '#8a5a44', blanco: '#b9b3a7', oficina: '#7b8287', silos: '#a3a8ab' };
const edifMeshes = [];
const reticula = new THREE.Group(); capas.edif.add(reticula);
const cubiertas = new THREE.Group(); capas.edif.add(cubiertas);
const dentroPol = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
D.edif.forEach((e, i) => {
  const pr = PROG[i];
  if (e.s === 'esqueleto') { // columnas y vigas cada 8 m, alineadas al lado más largo
    let best = 0, ang = 0; for (let k = 0; k < e.p.length; k++) { const a = e.p[k], b = e.p[(k + 1) % e.p.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > best) { best = L; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); } }
    const ux = Math.cos(ang), uy = Math.sin(ang); const cx = e.p.reduce((t, p) => t + p[0], 0) / e.p.length, cy = e.p.reduce((t, p) => t + p[1], 0) / e.p.length;
    const cols = []; const vigas = [];
    for (let u = -260; u <= 260; u += 8) for (let v = -260; v <= 260; v += 8) {
      const x = cx + ux * u - uy * v, y = cy + uy * u + ux * v; if (!dentroPol(e.p, x, y)) continue; cols.push([x, y]);
      const x2 = cx + ux * (u + 8) - uy * v, y2 = cy + uy * (u + 8) + ux * v; if (dentroPol(e.p, x2, y2)) vigas.push([x, y, x2, y2]);
    }
    const gc = new THREE.BoxGeometry(0.6, e.h, 0.6); gc.translate(0, e.h / 2, 0);
    const mc = new THREE.InstancedMesh(gc, new THREE.MeshLambertMaterial({ color: '#a59d90', transparent: true }), cols.length);
    const M = new THREE.Matrix4(); cols.forEach(([x, y], k) => { const [X, Z] = W(x, y); M.makeTranslation(X, 0, Z); mc.setMatrixAt(k, M); }); reticula.add(mc);
    const gv = new THREE.BoxGeometry(8, 0.7, 0.45); const mv = new THREE.InstancedMesh(gv, mc.material, vigas.length);
    vigas.forEach(([x, y, x2, y2], k) => { const [X, Z] = W((x + x2) / 2, (y + y2) / 2); M.makeRotationY(-ang); M.setPosition(X, e.h - 0.35, Z); mv.setMatrixAt(k, M); }); reticula.add(mv);
    if (pr && pr.inv) { // cubierta liviana de invernadero
      const g = new THREE.ShapeGeometry(forma(e.p)); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: '#d8efe9', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = e.h + 0.4; m.userData.base = 0.28; cubiertas.add(m);
      e.ang = ang; e.cx = cx; e.cy = cy;
    }
    e.cols = cols;
    // las naves de esqueleto sin programa de invernadero llevan también una masa liviana (para color de programa)
    if (!(pr && pr.inv)) { const g = new THREE.ExtrudeGeometry(forma(e.p), { depth: e.h * 0.25, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: HOY.esqueleto, transparent: true })); m.userData = { i, hoy: HOY.esqueleto, prog: pr ? pr.c : '#5a6168' }; capas.edif.add(m); edifMeshes.push(m); }
    return;
  }
  const g = new THREE.ExtrudeGeometry(forma(e.p), { depth: e.h + 1.5, bevelEnabled: false }); g.rotateX(-Math.PI / 2); // 1,5 m más: cubre la versión de la foto
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: HOY[e.s] || '#8a5a44', transparent: true }));
  m.userData = { i, hoy: HOY[e.s] || '#8a5a44', prog: pr ? pr.c : '#6b7076' };
  const ed = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), new THREE.LineBasicMaterial({ color: '#0b1015', transparent: true, opacity: 0.55 })); m.add(ed);
  capas.edif.add(m); edifMeshes.push(m);
});
// tanques elevados
for (const t of D.tanques) { const [X, Z] = W(...t); const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8, 20), new THREE.MeshLambertMaterial({ color: '#d4d6d5', transparent: true })); c.position.y = 30; g.add(c); for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 26, 0.6), c.material); p.position.set(Math.cos(k * Math.PI / 2 + 0.78) * 4, 13, Math.sin(k * Math.PI / 2 + 0.78) * 4); g.add(p); } g.position.set(X, 0, Z); capas.edif.add(g); }

// bancales (suelo libre) y camas dentro de los invernaderos
const angL = D.angulo; const nx = -Math.sin(angL), ny = Math.cos(angL);
const rotBancal = Math.atan2(nx, -ny);
const CULT = ['#7fb85a', '#9ccc65', '#5f9a48', '#b5c95a', '#6fae6b', '#c4a35a', '#8c6bb0', '#d27a5a'];
const bancalGeo = new THREE.BoxGeometry(1.2, 0.45, 10); bancalGeo.translate(0, 1.2, 0); // levantado: el suelo de la foto tiene escombro y relieve
const camas = D.bancales.slice();
const camasInv = [];
D.edif.forEach((e, i) => { if (!(PROG[i] && PROG[i].inv)) return; const ux = Math.cos(e.ang), uy = Math.sin(e.ang); for (let u = -260; u <= 260; u += 2) for (let v = -260; v <= 260; v += 9.5) { const x = e.cx + ux * u - uy * v, y = e.cy + uy * u + ux * v; const ok = [[-0.6, -4], [0.6, -4], [-0.6, 4], [0.6, 4]].every(([a, b]) => dentroPol(e.p, x + ux * a - uy * b, y + uy * a + ux * b)); if (ok && (Math.round(u / 2) % 6 !== 0)) camasInv.push([x, y, e.ang]); } });
const bancales = new THREE.InstancedMesh(bancalGeo, new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true }), camas.length + camasInv.length);
{ const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  camas.forEach(([x, y, cu], k) => { const [X, Z] = W(x, y); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotBancal); M.compose(new THREE.Vector3(X, 0, Z), q, s); bancales.setMatrixAt(k, M); bancales.setColorAt(k, c.set(CULT[(cu || 0) % 8])); });
  camasInv.forEach(([x, y, a], k) => { const [X, Z] = W(x, y); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-Math.sin(a), -Math.cos(a))); M.compose(new THREE.Vector3(X, 0, Z), q, s); bancales.setMatrixAt(camas.length + k, M); bancales.setColorAt(camas.length + k, c.set(k % 5 ? '#c86a4a' : '#8fc46a')); });
}
capas.suelo.add(bancales);
// piso de las manzanas de huerta (tierra trabajada) con su borde: se lee la retícula ordenada de bloques y calles
const bloquesMat = new THREE.MeshBasicMaterial({ color: '#6e5b40', transparent: true, depthTest: false });
const bloques = new THREE.Mesh(mergeGeometries((D.bloques || []).map(p => { const g = new THREE.ShapeGeometry(forma(p)); g.rotateX(-Math.PI / 2); g.translate(0, 1.0, 0); g.deleteAttribute('uv'); return g; })), bloquesMat); bloques.renderOrder = 1; capas.suelo.add(bloques);
const bordesBloq = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints((D.bloques || []).flatMap(p => p.flatMap((a, i) => { const b = p[(i + 1) % p.length]; const [ax, az] = W(...a), [bx, bz] = W(...b); return [new THREE.Vector3(ax, 1.3, az), new THREE.Vector3(bx, 1.3, bz)]; }))), new THREE.LineBasicMaterial({ color: '#d9c49a', transparent: true, depthTest: false })); bordesBloq.renderOrder = 2; capas.suelo.add(bordesBloq);
// zonas: compostaje (antiguo parqueadero) y patio de carga
const rectZ = (x0, y0, x1, y1, col, y = 0.2) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(forma([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])), new THREE.MeshLambertMaterial({ color: col, transparent: true })); m.rotation.x = -Math.PI / 2; m.position.y = y + 1.2; m.renderOrder = 2; return m; };
const COMPOST = [9485, 3005, 9555, 3060];
const compost = new THREE.Group(); compost.add(rectZ(...COMPOST, '#6b4f33'));
{ const g = new THREE.CylinderGeometry(1.4, 2.2, 1.6, 6); g.rotateZ(Math.PI / 2); g.scale(1, 1, 1); for (let r = 0; r < 6; r++) { const m = new THREE.Mesh(new THREE.BoxGeometry(60, 1.6, 2.6), new THREE.MeshLambertMaterial({ color: '#8a6440', transparent: true })); const [X, Z] = W(9520, 3011 + r * 8.5); m.position.set(X, 1, Z); compost.add(m); } }
capas.suelo.add(compost);
const patio = rectZ(9115, 3127.5, 9185, 3172.5, '#3a4a58'); capas.suelo.add(patio);
const ZC = W((COMPOST[0] + COMPOST[2]) / 2, (COMPOST[1] + COMPOST[3]) / 2);

// huertas en cubiertas del barrio
const techosGeo = mergeGeometries(D.techos.map(p => { const g = new THREE.ShapeGeometry(forma(p)); g.rotateX(-Math.PI / 2); g.translate(0, (altCtx.get(p[0][0] + ',' + p[0][1]) || 6) + 0.35, 0); g.deleteAttribute('uv'); return g; }));
const techosMat = new THREE.MeshLambertMaterial({ color: '#8fc46a', transparent: true, opacity: 0 });
const techos = new THREE.Mesh(techosGeo, techosMat); ctxG.add(techos);

// red: sintaxis (tramos existentes) y pasajes nuevos, con líneas de grosor real
const lineMats = [];
const mkLineas = (segs, ancho, y) => {
  const pos = [], idx = [];
  segs.forEach((s, k) => { for (let i = 1; i < s.p.length; i++) { const [ax, az] = W(...s.p[i - 1]), [bx, bz] = W(...s.p[i]); pos.push(ax, y, az, bx, y, bz); idx.push(k); } });
  const g = new LineSegmentsGeometry(); g.setPositions(pos);
  const mat = new LineMaterial({ linewidth: ancho, vertexColors: true, transparent: true, worldUnits: false, depthTest: false }); mat.resolution.set(innerWidth, innerHeight); lineMats.push(mat);
  const l = new LineSegments2(g, mat); l.renderOrder = 6; l.userData = { idx, segs, n: idx.length }; return l;
};
const existentes = SEG.filter(s => s.a);
const red = mkLineas(existentes, MOVIL ? 1.2 : 1.6, 0.9); capas.red.add(red);
// límite de la localidad de Kennedy
const limMat = new THREE.LineDashedMaterial({ color: '#e3a64a', dashSize: 40, gapSize: 25, transparent: true, opacity: 0, depthTest: false });
const limite = new THREE.Line(new THREE.BufferGeometry().setFromPoints(SXD.limite.map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 3, Z); })), limMat); limite.computeLineDistances(); limite.renderOrder = 7; scene.add(limite);
// solo para dibujar: los pasajes se suavizan (Chaikin, 2 pasadas) para que no se vean escalonados por la grilla de 3 m
const chaikin = (p, n = 2) => { for (let r = 0; r < n; r++) { if (p.length < 3) break; const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1]; q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } q.push(p[p.length - 1]); p = q; } return p; };
const pasajes = mkLineas(nuevos.map(s => ({ ...s, p: chaikin(s.p) })), MOVIL ? 2.6 : 3.4, 1.2); capas.red.add(pasajes);
const RAMPA = ['#2a3fb8', '#2c8fd6', '#38c0b0', '#7fd15a', '#f0d540', '#f08a2e', '#d8262c'];
const rampa = (t) => { t = Math.max(0, Math.min(1, t)) * (RAMPA.length - 1); const i = Math.min(RAMPA.length - 2, Math.floor(t)); return new THREE.Color(RAMPA[i]).lerp(new THREE.Color(RAMPA[i + 1]), t - i); };
const colorear = (l, f) => { const { idx, segs } = l.userData; const c = new Float32Array(idx.length * 6); idx.forEach((k, j) => { const col = f(segs[k]); c.set([col.r, col.g, col.b, col.r, col.g, col.b], j * 6); }); l.geometry.setColors(c); };
let modoRed = null;
const pintarRed = (m) => {
  if (m === modoRed) return; modoRed = m;
  const gris = new THREE.Color('#56636e');
  if (m === 'gris') colorear(red, () => gris);
  else if (m === 'd') { const base = new THREE.Color('#2e3842'); colorear(red, s => { const d = (s.b[1] - s.a[1]) / s.a[1]; if (Math.abs(d) < 0.002) return base; return d > 0 ? new THREE.Color('#6a5228').lerp(new THREE.Color('#ffb340'), Math.min(1, d / SX.dmax)) : new THREE.Color('#2b4a66').lerp(new THREE.Color('#5fb3d9'), Math.min(1, -d / SX.dmax)); }); }
  else { const k = +m[1], de = m[0]; colorear(red, s => rampa(pct(s[de][k], k))); }
  if (m && m[0] === 'b') { const k = +m[1]; colorear(pasajes, s => rampa(pct(s.b[k], k))); } else colorear(pasajes, () => new THREE.Color('#f2efe6'));
};
pintarRed('gris');

// árboles reales (posición y altura de cada copa detectada) con el modelo escaneado island_tree_01 (Poly Haven, CC0)
const arboles = new THREE.Group(); capas.bosque.add(arboles);
const arbMats = [];
(async () => {
  if (new URLSearchParams(location.search).get('arb') === '0') return;
  try {
    const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
    const partes = await Promise.all((MOVIL ? ['island_tree_01_L1_hojas'] : ['island_tree_01_L1_madera', 'island_tree_01_L1_hojas']).map(n => gl.loadAsync(`data3d/models/${n}.glb`)));
    let alto = 0, radio = 0; const geos = [];
    partes.forEach(gf => { gf.scene.updateMatrixWorld(true); gf.scene.traverse(o => { if (o.isMesh) { const g = o.geometry.clone().applyMatrix4(o.matrixWorld); g.computeBoundingBox(); alto = Math.max(alto, g.boundingBox.max.y); radio = Math.max(radio, (g.boundingBox.max.x - g.boundingBox.min.x) / 2, (g.boundingBox.max.z - g.boundingBox.min.z) / 2); geos.push([g, o.material]); } }); });
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [g, mat0] of geos) {
      const mat = mat0.clone(); mat.transparent = true; if (mat.map) mat.alphaTest = 0.4; arbMats.push(mat);
      const im = new THREE.InstancedMesh(g, mat, D.arboles.length);
      D.arboles.forEach(([x, y, h, r, densa], k) => { const [X, Z] = W(x, y); const e = h / alto; p.set(X, 0, Z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (k * 2.399) % 6.283); const hr = r / radio; s.set(hr, e, hr); M.compose(p, q, s); im.setMatrixAt(k, M); });
      arboles.add(im);
    }
  } catch (err) { console.warn('árboles', err); }
})();

// flujos: residuos hacia el compostaje, cosecha hacia el mercado y del mercado a las puertas, y Corabastos
const centroEdif = (i) => { const p = D.edif[i].p; return W(p.reduce((t, q) => t + q[0], 0) / p.length, p.reduce((t, q) => t + q[1], 0) / p.length); };
const ZM = centroEdif(3); const ZI = centroEdif(2), ZI2 = centroEdif(0);
const rutas = [];
ENT.forEach(([x, y]) => { const [X, Z] = W(x, y); rutas.push({ a: [X, Z], b: ZC, c: '#b98a57' }); rutas.push({ a: ZM, b: [X, Z], c: '#e3a64a' }); });
rutas.push({ a: ZI, b: ZM, c: '#8fc46a' }, { a: ZI2, b: ZM, c: '#8fc46a' }, { a: ZC, b: ZI, c: '#6b4f33' }, { a: ZC, b: ZI2, c: '#6b4f33' });
const CORA = W(6310, 2150); // Corabastos (centro de corabastos.json)
const corDir = new THREE.Vector2(CORA[0], CORA[1]).normalize().multiplyScalar(1050);
rutas.push({ a: [corDir.x, corDir.y], b: ZC, c: '#b98a57', cora: true });
const NP = MOVIL ? 4 : 6;
const flujoGeo = new THREE.BufferGeometry(); const fpos = new Float32Array(rutas.length * NP * 3), fcol = new Float32Array(rutas.length * NP * 3);
rutas.forEach((r, i) => { const c = new THREE.Color(r.c); for (let k = 0; k < NP; k++) fcol.set([c.r, c.g, c.b], (i * NP + k) * 3); });
flujoGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); flujoGeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
const flujoMat = new THREE.PointsMaterial({ size: MOVIL ? 3.5 : 4.5, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthTest: false });
const flujos = new THREE.Points(flujoGeo, flujoMat); flujos.renderOrder = 10; capas.flujos.add(flujos);
const guiaFlujos = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rutas.flatMap(r => [new THREE.Vector3(r.a[0], 4, r.a[1]), new THREE.Vector3(r.b[0], 4, r.b[1])])), new THREE.LineBasicMaterial({ color: '#e3a64a', transparent: true, opacity: 0 }));
capas.flujos.add(guiaFlujos);

// corredor ecológico: arcos hacia los humedales de Techo y El Burro
const geoLL = (lat, lng) => W((lng + 74.17) * 111320 * Math.cos(4.63 * Math.PI / 180) + 5193.24, (lat - 4.63) * 110540 + 2090.06);
const HUM = [{ n: 'Humedal de Techo', p: geoLL(4.645179, -74.141652) }, { n: 'Humedal El Burro', p: geoLL(4.641417, -74.149576) }, { n: 'Humedal La Vaca', p: geoLL(4.628701, -74.161978) }, { n: 'Corabastos', p: CORA, cora: true }];
const corredor = new THREE.Group(); scene.add(corredor);
fetch('data3d/corabastos.json').then(r => r.json()).then(cb => { const m = new THREE.Mesh(new THREE.ShapeGeometry(forma(cb.poly)), new THREE.MeshBasicMaterial({ color: '#e0664f', transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.5; corrMats.push(m.material); corredor.add(m); }).catch(() => {});
const corrMats = [];
HUM.forEach(h => { const a = new THREE.Vector3(0, 10, 0), b = new THREE.Vector3(h.p[0], 10, h.p[1]); const m = a.clone().lerp(b, 0.5); m.y = a.distanceTo(b) * 0.22; const cur = new THREE.QuadraticBezierCurve3(a, m, b); const mat = new THREE.MeshBasicMaterial({ color: h.cora ? '#e0664f' : '#5fb3d9', transparent: true, opacity: 0 }); corrMats.push(mat); corredor.add(new THREE.Mesh(new THREE.TubeGeometry(cur, 60, MOVIL ? 6 : 4, 6), mat)); const d = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 2, 40), mat); d.position.set(b.x, 1, b.z); corredor.add(d); h.v = b; });

// guías de la axonometría explotada (verticales en las esquinas del rectángulo del lote)
const esquinas = (() => { const c = Math.cos(angL), s = Math.sin(angL); let mnu = 1e9, mxu = -1e9, mnv = 1e9, mxv = -1e9; D.sitio.forEach(([x, y]) => { const u = (x - CX) * c + (y - CY) * s, v = -(x - CX) * s + (y - CY) * c; mnu = Math.min(mnu, u); mxu = Math.max(mxu, u); mnv = Math.min(mnv, v); mxv = Math.max(mxv, v); }); return [[mnu, mnv], [mxu, mnv], [mxu, mxv], [mnu, mxv]].map(([u, v]) => W(CX + u * c - v * s, CY + u * s + v * c)); })();
const OFF = !SIN_G ? { suelo: 130, red: 260, edif: 390, bosque: 0, flujos: 540 } : { suelo: 0, red: 260, edif: 520, bosque: 800, flujos: 1060 }; // con la malla: la base es el territorio real (suelo y bosque de la foto)
const guiasMat = new THREE.LineDashedMaterial({ color: '#8b9aa7', dashSize: 6, gapSize: 5, transparent: true, opacity: 0 });
const guias = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(esquinas.flatMap(([X, Z]) => [new THREE.Vector3(X, 0, Z), new THREE.Vector3(X, OFF.flujos, Z)])), guiasMat); guias.computeLineDistances(); raiz.add(guias);

/* ---------------- etiquetas HTML proyectadas ---------------- */
const etq = [];
const capaEt = $('#etiquetas');
const addEt = (html, pos, grupos, cls = '', capa = null, dy = 0) => { const d = document.createElement('div'); d.className = 'et ' + cls; d.innerHTML = html; d.style.opacity = 0; capaEt.appendChild(d); const ob = pos && pos.isObject3D; etq.push({ d, pos: ob ? new THREE.Vector3() : new THREE.Vector3(...pos), obj: ob ? pos : null, dy, grupos: new Set(grupos), capa }); };
Object.entries(PROG).forEach(([i, p]) => { const [X, Z] = centroEdif(+i); if (MOVIL && ![2, 3, 4, 5, 7, 23].includes(+i)) return; addEt(`<i style="background:${p.c}"></i>${p.n}`, [X, D.edif[i].h + 6, Z], ['prog', 'plan'], '', 'edif'); });
addEt('<i style="background:#6b4f33"></i>Compostaje', [ZC[0], 6, ZC[1]], ['prog', 'flujos', 'suelo'], '', 'suelo');
{ const p = W(9150, 3150); addEt('<i style="background:#3a4a58"></i>Patio de carga', [p[0], 4, p[1]], ['prog'], '', 'suelo'); }
(!SIN_G ? ['Territorio real y bosque (malla de Google)', 'Suelo productivo', 'Pasajes', 'Edificios recuperados', 'Flujos'] : ['Suelo productivo', 'Pasajes', 'Edificios recuperados', 'Bosque', 'Flujos']).forEach((n, k) => { const key = (!SIN_G ? ['bosque', 'suelo', 'red', 'edif', 'flujos'] : ['suelo', 'red', 'edif', 'bosque', 'flujos'])[k]; addEt(`${String(k + 1).padStart(2, '0')} · ${n}`, [0, 0, 0], ['capas'], 'capa', key); });
HUM.forEach(h => addEt(h.n + (h.cora ? '' : ''), [h.v.x, 30, h.v.z], ['corredor', 'kennedy']));
addEt('Predio Bavaria', [0, 40, 0], ['kennedy', 'corredor']);
ENT.forEach(([x, y], k) => { if (k % 2 && MOVIL) return; const [X, Z] = W(x, y); addEt(`P${k + 1}`, [X, 8, Z], ['puertas']); });
sectAng.forEach((a, k) => addEt(`<i style="background:${COL_SECT[k]}"></i>Sector ${k + 1}`, [Math.cos(a) * 820, 30, -Math.sin(a) * 820], ['sectores']));
addEt('Av. Boyacá', (() => { const p = W(8840, 2700); return [p[0] - 40, 10, p[1]]; })(), ['sx']);

/* =============================== CAPAS DEL GUION (todo en 3D) =============================== */
// Cada grupo se enciende por escena (propiedad x de la escena) y se desvanece solo.
const XG = {};
const xg = (k) => XG[k] || (XG[k] = (() => { const g = new THREE.Group(); g.visible = false; scene.add(g); return { g, mats: [], v: 0, o: 0, pul: [], cre: [], ondas: [], upd: [], t0: -99, rot: 0, tgt: null, foc: null }; })());
const xmat = (k, m, base = 1, tags = null, prof = false) => { m.transparent = true; m.opacity = 0; m.depthWrite = prof; m.depthTest = prof; xg(k).mats.push({ m, base, tags }); return m; };
// crecimiento al aparecer: esc (escala), sy (altura), draw (se dibuja de a poco)
const crece = (k, o, d = 0, dur = 0.9, tipo = 'esc') => { const n = tipo === 'draw' ? (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) : 0; xg(k).cre.push({ o, d, dur, tipo, n, s0: o.scale.x }); return o; };
const texGlow = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.22, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const halo = (k, col, s, base = 0.85, tags = null) => { const sp = new THREE.Sprite(xmat(k, new THREE.SpriteMaterial({ map: texGlow, color: col, blending: THREE.AdditiveBlending }), base, tags)); sp.scale.setScalar(s); sp.renderOrder = 10; return sp; };
// ondas: anillos que se expanden y se desvanecen (para señalar un punto)
const onda = (k, P, col, R, y = 3, n = 2) => { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64), xmat(k, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }), 0.9)); m.rotation.x = -Math.PI / 2; m.position.set(P[0], y, P[1]); m.renderOrder = 9; xg(k).g.add(m); xg(k).ondas.push({ m, R, ph: i / n }); } };
const V3 = (p, y) => new THREE.Vector3(p[0], y, p[1]);
const curva = (a, b, alt, y0 = 6, y1 = 6) => { const A = V3(a, y0), B = V3(b, y1); const M = A.clone().lerp(B, 0.5); M.y = Math.max(y0, y1) + (alt ?? A.distanceTo(B) * 0.2); return new THREE.QuadraticBezierCurve3(A, M, B); };
const tubo = (k, cur, r, col, op = 0.85, d = null, tags = null, padre = null) => { const m = new THREE.Mesh(new THREE.TubeGeometry(cur, 56, r, 6), xmat(k, new THREE.MeshBasicMaterial({ color: col }), op, tags)); m.renderOrder = 8; (padre || xg(k).g).add(m); crece(k, m, d ?? Math.random() * 0.5, 1.4, 'draw'); return m; };
const linea = (k, cur, col, op = 0.55) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cur.getPoints(36)), xmat(k, new THREE.LineBasicMaterial({ color: col }), op)); l.renderOrder = 8; xg(k).g.add(l); return l; };
const pulsos = (k, curvas, cols, n = 3, vel = 0.1, tam = 5, padre = null) => {
  if (!curvas.length) return; const N = curvas.length * n; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  curvas.forEach((c, i) => { const cc = new THREE.Color(Array.isArray(cols) ? cols[i % cols.length] : cols); for (let j = 0; j < n; j++) col.set([cc.r, cc.g, cc.b], (i * n + j) * 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, xmat(k, new THREE.PointsMaterial({ size: MOVIL ? tam * 0.8 : tam, sizeAttenuation: false, vertexColors: true }), 1)); p.renderOrder = 11; p.frustumCulled = false; (padre || xg(k).g).add(p);
  xg(k).pul.push({ curvas, n, vel, pos, g, fase: curvas.map((_, i) => (i * 0.618) % 1) });
};
const pin = (k, P, col, h, r, dl = null) => {
  const g = new THREE.Group(); const mat = xmat(k, new THREE.MeshBasicMaterial({ color: col }), 0.95);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, h, 8), mat); c.position.y = h / 2;
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); s.position.y = h;
  const d = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2, 40), xmat(k, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }), 0.55)); d.rotation.x = -Math.PI / 2; d.position.y = 3;
  g.add(c, s, d, halo(k, col, r * 5, 0.5)); g.children[3].position.y = h; g.children.forEach(o => { o.renderOrder = 9; }); g.position.set(P[0], 0, P[1]); xg(k).g.add(g); crece(k, g, dl ?? 0.2 + Math.random() * 0.6, 1.1, 'sy'); return g;
};
const corto = (s) => s.replace(/\s*\(.*$/, '').replace(/\s*-.*$/, '');
const COL = { ocre: '#F2B53A', rojo: '#E0623F', verde: '#4FB98C', azul: '#4EAECF', lila: '#B48AD6', crema: '#F2EFE8', gris: '#77736b' };

// ---- 1. red de abastecimiento de Kennedy
// mercados barriales de la propuesta: los 8 sitios en parques del simulador (data3d/mercados_barrio.js, carga.json)
const SITIOS = [[6946.4, 3553.6, 'Biblioteca El Tintal'], [8573.8, 3166, 'Castilla'], [8370.2, 3858.9, 'Ciudad Urbisa'], [7789.6, 2316.6, 'Rincón de los Ángeles'], [6541.4, 4941.2, 'La Magdalena'], [6325, 3270, 'Patio Bonito II'], [8266.2, 3700.9, 'Castilla Real'], [7266.3, 4006.7, 'Otero de Francisco']];
const MERC = SITIOS.map(([x, y, n]) => ({ n, p: W(x, y) }));
const PLZ = await fetch('data3d/plazas.json').then(r => r.json()).then(j => j.plazas.map(p => ({ n: p.n, p: W(...p.p) }))).catch(() => []);
const NODOS = [...MERC.map(m => ({ ...m, t: 'm' })), ...PLZ.map(p => ({ ...p, t: 'p' })), { n: 'Bavaria Común', p: [0, 0], t: 'b' }];
// productores de otros territorios: llegan desde fuera de la localidad (cinco direcciones de entrada)
// entradas de productores: sobre el borde de Kennedy (todo ocurre dentro de la localidad)
const LIMW = SXD.limite.map(([x, y]) => W(x, y));
const ENTR = [200, 165, 240, 300, 120].map((a) => { const r = a * Math.PI / 180; let best = LIMW[0], m = 9; for (const v of LIMW) { const b = Math.atan2(-(v[1] - KEN_C[1]), v[0] - KEN_C[0]); const d = Math.abs(Math.atan2(Math.sin(b - r), Math.cos(b - r))); if (d < m) { m = d; best = v; } } return [KEN_C[0] + (best[0] - KEN_C[0]) * 0.96, KEN_C[1] + (best[1] - KEN_C[1]) * 0.96]; });
const masCerca = (p, L) => L.reduce((b, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? q : b), L[0]);
ENTR.forEach((e, i) => pin('prod', e, COL.crema, 200, 70));
addEt('Productores de otros territorios', [ENTR[0][0], 140, ENTR[0][1]], ['abHoy', 'abRed']);
{ // hoy: todo entra a Corabastos y de ahí se reparte
  const cIn = ENTR.map(e => curva(e, CORA, null, 10, 10)); cIn.forEach(c => tubo('abHoy', c, MOVIL ? 34 : 26, COL.rojo, 0.85)); pulsos('abHoy', cIn, COL.crema, 4, 0.08, 8);
  const dest = NODOS.filter(n => n.t !== 'p').map(n => n.p); const cOut = dest.map(d => curva(CORA, d, null, 10, 6)); cOut.forEach(c => tubo('abHoy', c, 7, '#a9a39a', 0.55)); pulsos('abHoy', cOut, COL.rojo, 2, 0.06, 6);
  pin('abHoy', CORA, COL.rojo, 560, 130); dest.forEach(d => pin('abHoy', d, '#a9a39a', 120, 40));
}
{ // propuesta: los productores llegan a varios mercados; Corabastos es uno de ellos
  const cs = []; NODOS.forEach(n => { const e = masCerca(n.p, ENTR); cs.push(curva(e, n.p, null, 10, 6)); });
  ENTR.forEach(e => cs.push(curva(e, CORA, null, 10, 10)));
  cs.forEach(c => tubo('abRed', c, MOVIL ? 20 : 15, COL.verde, 0.7)); pulsos('abRed', cs, COL.crema, 3, 0.09, 7);
  MERC.forEach(m => pin('nodos', m.p, COL.verde, 320, 70)); PLZ.forEach(m => pin('nodos', m.p, '#9bd3b8', 200, 45));
  pin('nodos', CORA, COL.rojo, 320, 70); pin('nodos', [0, 0], COL.ocre, 460, 95);
}
addEt(`<i style="background:${COL.rojo}"></i>Corabastos`, [CORA[0], 720, CORA[1]], ['abHoy']);
addEt(`<i style="background:${COL.rojo}"></i>Corabastos`, [CORA[0], 420, CORA[1]], ['abRed', 'abBav', 'sxm', 'info']);
addEt(`<i style="background:${COL.ocre}"></i>Bavaria Común`, [0, 580, 0], ['abRed', 'abBav', 'sxm', 'info']);
MERC.forEach((m, i) => { if (MOVIL && i % 2) return; addEt(`<i style="background:${COL.verde}"></i>${m.n}`, [m.p[0], 420, m.p[1]], ['abRed', 'abBav', 'sxm']); });
addEt('<i style="background:#9bd3b8"></i>Plazas existentes', [PLZ[0] ? PLZ[0].p[0] : 0, 180, PLZ[0] ? PLZ[0].p[1] : 0], ['abRed']);

// ---- 2. NBIC
// Info: el mercado de Bavaria registra pedidos (ida) y entregas (vuelta) con los mercados barriales y Corabastos
{ const dest = [...MERC.map(m => m.p), CORA]; const ida = dest.map(d => curva(ZM, d, null, 30, 8)), vuelta = dest.map(d => curva(d, ZM, null, 8, 30));
  ida.forEach(c => tubo('info', c, MOVIL ? 16 : 12, COL.azul, 0.6)); pulsos('info', ida, COL.azul, 3, 0.11, 8); pulsos('info', vuelta, COL.crema, 3, 0.09, 7);
  pin('info', ZM, COL.azul, 260, 50); }
addEt(`<i style="background:${COL.azul}"></i>Pedidos`, (() => { const c = curva(ZM, MERC[1].p, null, 30, 8).getPoint(0.5); return [c.x, c.y + 20, c.z]; })(), ['info']);
addEt(`<i style="background:${COL.crema}"></i>Entregas y excedentes`, (() => { const c = curva(ZM, MERC[3].p, null, 30, 8).getPoint(0.5); return [c.x, c.y + 20, c.z]; })(), ['info']);
// techos productivos (viviendas): centroides y alturas
const TECH = D.techos.map(p => { const x = p.reduce((t, q) => t + q[0], 0) / p.length, y = p.reduce((t, q) => t + q[1], 0) / p.length; return { p: W(x, y), h: (altCtx.get(p[0][0] + ',' + p[0][1]) || 6) + 1 }; });
const TECHS = TECH.filter((_, i) => i % Math.max(1, Math.ceil(TECH.length / (MOVIL ? 40 : 90))) === 0);
// Cogno: herramientas para que familias (viviendas) y comerciantes (mercado) decidan con esa información
{ const ZF = centroEdif(4); const cs = TECHS.filter((_, i) => i % 2 === 0).map(t => curva(ZF, t.p, null, 25, t.h)); cs.forEach(c => linea('cogno', c, COL.lila, 0.45)); pulsos('cogno', cs, COL.lila, 2, 0.12, 5);
  const cm = curva(ZF, ZM, 60, 25, 25); tubo('cogno', cm, 3, COL.lila, 0.8); pulsos('cogno', [cm], COL.crema, 4, 0.2, 6); }
{ const t = TECHS[Math.floor(TECHS.length / 3)] || { p: [300, 300], h: 10 }; addEt(`<i style="background:${COL.lila}"></i>Familias`, [t.p[0], t.h + 30, t.p[1]], ['nb_c']); }
addEt(`<i style="background:${COL.ocre}"></i>Comerciantes`, [ZM[0], 70, ZM[1]], ['nb_c']);
// Formación en Bavaria -> producción en las viviendas (promotores barriales acompañan los primeros ciclos)
{ const ZF = centroEdif(2); const cs = TECHS.filter((_, i) => i % 2).map(t => curva(ZF, t.p, null, 12, t.h)); cs.forEach(c => linea('viv', c, COL.ocre, 0.5)); pulsos('viv', cs, COL.ocre, 2, 0.1, 5); }
// excedentes de las viviendas -> mercados barriales (el más cercano, incluido el de Bavaria)
{ const dest = [ZM, ...MERC.map(m => m.p)]; const cs = TECHS.map(t => curva(t.p, masCerca(t.p, dest), null, t.h, 8)); cs.forEach(c => linea('exc', c, COL.verde, 0.5)); pulsos('exc', cs, COL.verde, 2, 0.08, 5); }
// etiquetas del clúster y del NBIC sobre los edificios
const sobre = (i, dy = 14) => { const [X, Z] = centroEdif(i); return [X, D.edif[i].h + dy, Z]; };
addEt(`<i style="background:${COL.lila}"></i>Universidades`, sobre(5, 30), ['clusterOld']);
addEt(`<i style="background:${COL.ocre}"></i>Comerciantes`, sobre(3, 30), ['clusterOld']);
addEt(`<i style="background:#d98f5a"></i>Promotores barriales`, sobre(11, 30), ['clusterOld']);
addEt(`<i style="background:${COL.rojo}"></i>Organizaciones barriales`, sobre(4, 30), ['clusterOld']);
addEt(`<i style="background:${COL.verde}"></i>Hidroponía`, sobre(0, 10), ['nb_b']);
addEt(`<i style="background:${COL.verde}"></i>Hidroponía y módulos`, sobre(2, 10), ['nb_b']);
addEt('<i style="background:#d9c7ef"></i>Hongos con materiales vegetales', sobre(23, 10), ['nb_b']);
addEt('<i style="background:#6b4f33"></i>Compostaje', [ZC[0], 10, ZC[1]], ['nb_b']);
addEt(`<i style="background:${COL.azul}"></i>Registro de pedidos, entregas y excedentes`, [ZM[0], 330, ZM[1]], ['info']);
addEt(`<i style="background:${COL.lila}"></i>Herramientas para decidir`, sobre(4, 40), ['nb_c']);
addEt(`<i style="background:${COL.lila}"></i>Empaques para conservar alimentos`, sobre(5, 30), ['nb_n']);
addEt('Línea de investigación universitaria', sobre(5, 8), ['nb_n']);
// módulos demostrativos
{ const B = D.bloques || []; if (B.length) { const b = B[Math.floor(B.length / 2)]; const p = W(b.reduce((t, q) => t + q[0], 0) / b.length, b.reduce((t, q) => t + q[1], 0) / b.length); addEt(`<i style="background:${COL.verde}"></i>Módulos demostrativos`, [p[0], 12, p[1]], ['form']); } }
addEt(`<i style="background:${COL.ocre}"></i>Talleres y formación`, sobre(4, 20), ['form']);
addEt(`<i style="background:${COL.ocre}"></i>Promotores barriales acompañan`, (() => { const t = TECHS[2] || { p: [400, 0], h: 10 }; return [t.p[0], t.h + 40, t.p[1]]; })(), ['viv']);
addEt(`<i style="background:#8fc46a"></i>Huertas en las viviendas`, (() => { const t = TECHS[Math.floor(TECHS.length * 0.7)] || { p: [-400, 0], h: 10 }; return [t.p[0], t.h + 20, t.p[1]]; })(), ['viv']);
addEt(`<i style="background:${COL.verde}"></i>Excedentes a los mercados`, (() => { const t = TECHS[5] || { p: [400, 0], h: 10 }; return [t.p[0], t.h + 60, t.p[1]]; })(), ['exc']);
addEt(`<i style="background:${COL.ocre}"></i>Mercado de Bavaria`, [ZM[0], 60, ZM[1]], ['exc']);

// ---- 3. red de relaciones bióticas
const densas = D.arboles.filter(a => a[4]); const ZB = densas.length ? W(densas.reduce((t, a) => t + a[0], 0) / densas.length, densas.reduce((t, a) => t + a[1], 0) / densas.length) : [0, 0];
const PQ = await fetch('data3d/parques.json').then(r => r.json()).catch(() => []);
{ const cerca = PQ.map(q => { const x = q.pts.reduce((t, p) => t + p[0], 0) / q.pts.length, y = q.pts.reduce((t, p) => t + p[1], 0) / q.pts.length; const c = W(x, y); return { q, c, d: Math.hypot(c[0], c[1]), a: poligonoArea(q.pts) }; }).filter(o => o.d < 2700 && o.a > 1500);
  if (cerca.length) { const g = mergeGeometries(cerca.map(o => { const s = new THREE.ShapeGeometry(forma(o.q.pts)); s.rotateX(-Math.PI / 2); s.translate(0, 2, 0); s.deleteAttribute('uv'); return s; })); const m = new THREE.Mesh(g, xmat('parques', new THREE.MeshBasicMaterial({ color: COL.verde }), 0.42)); m.renderOrder = 7; xg('parques').g.add(m); }
  // nodos: los parches más grandes, el bosque de Bavaria y los humedales; cada uno se une con sus dos vecinos más cercanos
  const nod = [{ c: ZB, n: 'Bosque de Bavaria' }, ...HUM.filter(h => !h.cora).map(h => ({ c: [h.v.x, h.v.z], n: h.n })), ...cerca.sort((a, b) => b.a - a.a).slice(0, MOVIL ? 14 : 22).map(o => ({ c: o.c }))];
  const pares = new Set(); const cs = [];
  nod.forEach((a, i) => nod.map((b, j) => [j, Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1])]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2).forEach(([j]) => { const k = Math.min(i, j) + '-' + Math.max(i, j); if (pares.has(k)) return; pares.add(k); cs.push(curva(a.c, nod[j].c, null, 4, 4)); }));
  cs.forEach(c => tubo('bioLinks', c, MOVIL ? 5 : 3.5, COL.verde, 0.7)); pulsos('bioLinks', cs, ['#f2c230', COL.crema, '#d0517a'], 3, 0.07, 5);
  nod.slice(0, 1 + HUM.filter(h => !h.cora).length).forEach(o => addEt(`<i style="background:${COL.verde}"></i>${o.n}`, [o.c[0], 60, o.c[1]], ['bio']));
  addEt('<i style="background:#f2c230"></i>Polinizadores y aves entre parches', (() => { const c = cs[Math.floor(cs.length / 2)]; const p = c ? c.getPoint(0.5) : new THREE.Vector3(); return [p.x, p.y + 30, p.z]; })(), ['bio', 'parches']); }
// plantas en flor alrededor de los espacios de producción (borde de las manzanas de huerta)
{ const F = ['#f2c230', '#d0517a', '#f4f0da', '#d9534f', '#b48ad6']; const pts = [], cols = []; let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (const b of (D.bloques || [])) for (let i = 0; i < b.length; i++) { const [ax, ay] = b[i], [bx, by] = b[(i + 1) % b.length]; const L = Math.hypot(bx - ax, by - ay); for (let u = 0; u < L; u += 2.2) { const t = u / L; const [X, Z] = W(ax + (bx - ax) * t + (rnd() - 0.5) * 1.6, ay + (by - ay) * t + (rnd() - 0.5) * 1.6); pts.push(X, 1.8, Z); const c = new THREE.Color(F[Math.floor(rnd() * F.length)]); cols.push(c.r, c.g, c.b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const p = new THREE.Points(g, xmat('flores', new THREE.PointsMaterial({ size: MOVIL ? 3 : 4, sizeAttenuation: false, vertexColors: true }), 1)); p.renderOrder = 9; xg('flores').g.add(p); }
addEt('<i style="background:#d0517a"></i>Plantas en flor junto a las huertas', (() => { const b = (D.bloques || [])[0]; if (!b) return [0, 10, 0]; const p = W(...b[0]); return [p[0], 14, p[1]]; })(), ['parches']);
addEt(`<i style="background:${COL.verde}"></i>Parche de árboles conectado`, [ZB[0], 40, ZB[1]], ['parches']);
// control de ratas: almacenamiento cerrado en el compostaje y aves rapaces que patrullan
{ const m = xmat('ratas', new THREE.MeshLambertMaterial({ color: '#5b6b62' }), 1), tapa = xmat('ratas', new THREE.MeshLambertMaterial({ color: COL.verde }), 1);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 3.4), m), t = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.5, 3.7), tapa); const [X, Z] = W(9492 + i * 7, 3054); b.position.set(X, 2.8, Z); t.position.set(X, 4.6, Z); b.renderOrder = t.renderOrder = 9; xg('ratas').g.add(b, t); } }
const rapaces = []; { const ala = new THREE.BufferGeometry(); ala.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -3, 0, 0, 3, -9, 1, 0, 0, 0, -3, 0, 0, 3, 9, 1, 0, 0, 0, -3, 0, 0, 3, 0, 0.3, 7], 3)); ala.computeVertexNormals();
  const m = xmat('rapaces', new THREE.MeshBasicMaterial({ color: COL.crema, side: THREE.DoubleSide }), 1);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(ala, m); b.renderOrder = 12; b.scale.setScalar(1.6); xg('rapaces').g.add(b); rapaces.push(b); } }
addEt('<i style="background:#5b6b62"></i>Almacenamiento cerrado y retiro oportuno', [ZC[0], 14, ZC[1]], ['ratas']);
addEt(`<i style="background:${COL.crema}"></i>Aves rapaces`, [ZC[0] + 60, 110, ZC[1]], ['ratas']);

// ---- 4. gobernanza: el bosque y la federación de asambleas
{ const pts = [], g = new THREE.BufferGeometry(); densas.forEach(([x, y, h]) => { const [X, Z] = W(x, y); pts.push(X, h + 2, Z); }); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const p = new THREE.Points(g, xmat('bosqueZona', new THREE.PointsMaterial({ color: COL.verde, size: MOVIL ? 3 : 4, sizeAttenuation: false }), 0.6)); p.renderOrder = 9; xg('bosqueZona').g.add(p); }
addEt(`<i style="background:${COL.verde}"></i>Bosque de la antigua cervecería`, [ZB[0], 60, ZB[1]], ['gobB', 'colectivo']);
addEt('¿Hasta dónde llegan los pasajes?', [ZB[0] + 140, 30, ZB[1] - 60], ['gobB']);
addEt(`<i style="background:${COL.verde}"></i>Salvemos el Bosque de Bavaria`, [ZB[0] - 80, 110, ZB[1] + 40], ['colectivo']);
const FED = { orgs: [], tok: null, yc: 240 };
{ const k = 'fed', Y = FED.yc, R = MOVIL ? 240 : 300, cen = new THREE.Vector3(0, Y, 0);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(80, 3.5, 8, 64), xmat(k, new THREE.MeshBasicMaterial({ color: COL.ocre }), 1)); anillo.rotation.x = Math.PI / 2; anillo.position.copy(cen);
  const disco = new THREE.Mesh(new THREE.CircleGeometry(78, 48), xmat(k, new THREE.MeshBasicMaterial({ color: COL.ocre, side: THREE.DoubleSide }), 0.16)); disco.rotation.x = -Math.PI / 2; disco.position.copy(cen);
  xg(k).g.add(anillo, disco);
  const ORG = [['Salvemos el Bosque de Bavaria', COL.verde], ['Organizaciones barriales', COL.ocre], ['Comerciantes', COL.azul]];
  ORG.forEach(([n, c], i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 3 + 0.4, P = new THREE.Vector3(Math.cos(a) * R, Y + 40, Math.sin(a) * R);
    const ar = new THREE.Mesh(new THREE.TorusGeometry(44, 2, 6, 48), xmat(k, new THREE.MeshBasicMaterial({ color: c }), 0.9)); ar.rotation.x = Math.PI / 2; ar.position.copy(P); xg(k).g.add(ar);
    const per = []; for (let j = 0; j < 8; j++) { const b = j / 8 * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), xmat(k, new THREE.MeshBasicMaterial({ color: c }), 1)); s.position.set(P.x + Math.cos(b) * 44, P.y + 6, P.z + Math.sin(b) * 44); s.renderOrder = 12; xg(k).g.add(s); per.push(s); }
    const cur = new THREE.QuadraticBezierCurve3(P.clone(), P.clone().lerp(cen, 0.5).add(new THREE.Vector3(0, 70, 0)), cen.clone()); tubo(k, cur, 2.4, c, 0.8);
    FED.orgs.push({ P, per, cur, c }); addEt(`<i style="background:${c}"></i>${n}`, [P.x, P.y + 70, P.z], ['fed', 'voz']); });
  const DEC = [['Uso de los espacios', centroEdif(7)], ['Cuidado del bosque', ZB], ['Abastecimiento de alimentos', ZM]];
  DEC.forEach(([n, a]) => { const cur = new THREE.QuadraticBezierCurve3(cen.clone(), new THREE.Vector3(a[0] * 0.5, Y * 0.75, a[1] * 0.5), new THREE.Vector3(a[0], 10, a[1])); linea(k, cur, COL.crema, 0.6); pulsos(k, [cur], COL.crema, 3, 0.18, 5); pin(k, a, COL.crema, 14, 9); addEt(n, [a[0], 50, a[1]], ['fed']); });
  addEt(`<i style="background:${COL.ocre}"></i>Asamblea de la federación`, [0, Y + 40, 0], ['fed', 'voz']);
  FED.tok = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), xmat(k, new THREE.MeshBasicMaterial({ color: COL.crema }), 1)); FED.tok.renderOrder = 13; xg(k).g.add(FED.tok);
  addEt('La vocería rota: cada persona lleva la voz en algún momento', [FED.orgs[1].P.x, FED.orgs[1].P.y - 50, FED.orgs[1].P.z], ['voz']); }


/* =============================== REDES 3D DEL GUION =============================== */
// red3d: nodos (esferas con halo) y vínculos (tubos que se dibujan, con pulsos), flotando sobre el territorio y girando.
// N: [{ id, n, c, r, p? }], L: [[a, b, color, grosor]], o: { c:[X,Z], y, R, fijo, rot, flat, et }
const red3d = (k, N, L, o) => {
  const X = xg(k); X.g.position.set(o.c[0], o.y, o.c[1]); X.rot = o.rot ?? 0.12;
  const G = new THREE.Group(); G.userData.gira = true; X.g.add(G);
  const idx = new Map(N.map((n, i) => [n.id, i]));
  let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const P = N.map(n => n.p ? new THREE.Vector3(...n.p) : new THREE.Vector3(rnd() - 0.5, (rnd() - 0.5) * (o.flat ?? 0.7), rnd() - 0.5).multiplyScalar(o.R));
  if (!o.fijo) { // Fruchterman-Reingold en 3D
    const E2 = L.map(l => [idx.get(l[0]), idx.get(l[1])]).filter(e => e[0] != null && e[1] != null);
    const kk = o.R * (o.rep ?? 1.6) / Math.cbrt(N.length); let temp = o.R * 0.2; const d = new THREE.Vector3();
    for (let it = 0; it < 220; it++) {
      const F = P.map(() => new THREE.Vector3());
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { d.subVectors(P[i], P[j]); const l = Math.max(1, d.length()); d.multiplyScalar(kk * kk / l / l); F[i].add(d); F[j].sub(d); }
      for (const [a, b] of E2) { d.subVectors(P[a], P[b]); const l = Math.max(1, d.length()); d.multiplyScalar(l / kk); F[a].sub(d); F[b].add(d); }
      P.forEach((p, i) => { F[i].sub(p.clone().multiplyScalar(0.06 * kk / o.R * 4)); const l = F[i].length(); if (l > 0) p.add(F[i].multiplyScalar(Math.min(l, temp) / l)); p.y *= o.flat ?? 0.7; });
      temp *= 0.985;
    }
    const Ls = P.map(p => p.length()).sort((a, b) => a - b); const m = Ls[Math.floor(Ls.length * 0.9)] || 1; P.forEach(p => { p.multiplyScalar(o.R / m); if (p.length() > o.R * 1.15) p.setLength(o.R * 1.15); });
  }
  const nodos = {};
  N.forEach((n, i) => {
    const mat = xmat(k, new THREE.MeshBasicMaterial({ color: n.c }), 1, [n.id]);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat); m.position.copy(P[i]); m.scale.setScalar(n.r); m.renderOrder = 12; G.add(m);
    const h = halo(k, n.c, n.r * 4.5, 0.55, [n.id]); h.position.copy(P[i]); G.add(h);
    const c = crece(k, m, Math.min(1.2, i * (o.dn ?? 0.06)), 0.8); c.lat = true; crece(k, h, c.d, 0.8);
    nodos[n.id] = m;
    if (n.et) addEt(n.et === true ? `<i style="background:${n.c}"></i>${n.n}` : n.et, m, [k], n.cls || '', null, n.r * 1.6);
  });
  const cs = [], cols = [];
  L.forEach(([a, b, col, w], j) => {
    const A = P[idx.get(a)], B = P[idx.get(b)]; if (!A || !B) return;
    const M = A.clone().lerp(B, 0.5); M.y += A.distanceTo(B) * 0.12; const cur = new THREE.QuadraticBezierCurve3(A.clone(), M, B.clone());
    tubo(k, cur, w ?? o.R * 0.008, col, 0.7, 0.35 + Math.min(1.4, j * (o.dl ?? 0.03)), [a, b, 'l' + j], G); cs.push(cur); cols.push(col);
  });
  pulsos(k, cs, cols.map(c => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.55)), o.np ?? 2, o.vp ?? 0.22, o.tp ?? 6, G);
  return { G, nodos, P };
};
const enMundo = (k, local) => { const X = xg(k); X.g.updateMatrixWorld(true); return local.clone().applyMatrix4(X.g.matrixWorld); };

// ---- 08.1 la red de problemas de Kennedy (red-de-problemas: 6 problemas, 11 relaciones)
const PROB = { A: ['Dependencia de alimentos externos', '#a3b845'], B: ['Crecimiento poblacional', '#d9bf6e'], C: ['Valorización del suelo', '#dba73a'], D: ['Especulación', '#d4553f'], E: ['Gestión de residuos sólidos', '#a77b5a'], F: ['Centralización de servicios', '#ee8a45'] };
const PROB_E = [['B', 'C'], ['B', 'A'], ['B', 'E'], ['F', 'B'], ['C', 'D'], ['F', 'C'], ['F', 'A'], ['F', 'E'], ['D', 'A'], ['A', 'E'], ['D', 'F']];
const gradoP = {}; PROB_E.forEach(([a, b]) => { gradoP[a] = (gradoP[a] || 0) + 1; gradoP[b] = (gradoP[b] || 0) + 1; });
const CPROB = [KEN_C[0] * 0.45, KEN_C[1] * 0.45], YPROB = 760, RPROB = MOVIL ? 380 : 470;
{ const otros = ['B', 'C', 'D', 'A', 'E'];
  const N = Object.entries(PROB).map(([id, [n, c]]) => { const i = otros.indexOf(id); const a = i * Math.PI * 2 / 5; return { id, n, c, r: 16 + gradoP[id] * 9, p: id === 'F' ? [0, 0, 0] : [Math.cos(a) * RPROB, Math.sin(i * 2.1) * RPROB * 0.25, Math.sin(a) * RPROB], et: `<i style="background:${c}"></i>${n} <b class="g">${gradoP[id]}</b>`, cls: id === 'F' ? 'fuerte' : '' }; });
  red3d('problemas', N, PROB_E.map(([a, b]) => [a, b, a === 'F' || b === 'F' ? PROB.F[1] : '#cfd6dd', a === 'F' || b === 'F' ? 7 : 3.5]), { c: CPROB, y: YPROB, R: RPROB, fijo: true, rot: 0.1, dn: 0.15, dl: 0.08, tp: 8 });
  // la centralización late
  const X = xg('problemas'); const f = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 64), xmat('problemas', new THREE.MeshBasicMaterial({ color: PROB.F[1] }), 0.9)); X.g.add(f);
  X.upd.push((t) => { const u = (t * 0.6) % 1; f.scale.setScalar(70 + 160 * u); f.material.opacity *= 1 - u; f.rotation.x = Math.PI / 2; });
}
// 08.2 de la centralización al abastecimiento: un haz baja de la red a Corabastos
{ const A = new THREE.Vector3(CPROB[0], YPROB - 60, CPROB[1]), B = V3(CORA, 10); const cur = new THREE.QuadraticBezierCurve3(A, A.clone().lerp(B, 0.5).add(new THREE.Vector3(0, 120, 0)), B);
  tubo('foco', cur, 14, PROB.F[1], 0.9, 0.2); pulsos('foco', [cur], '#ffffff', 6, 0.35, 10); onda('foco', CORA, PROB.F[1], 900, 6, 3); pin('foco', CORA, PROB.F[1], 520, 110, 0.6);
  addEt(`<i style="background:${PROB.F[1]}"></i>Abastecimiento de alimentos · Corabastos`, [CORA[0], 680, CORA[1]], ['foco']); }

// ---- 08.5 la antigua cervecería entre la Boyacá y las Américas
{ const k = 'avs'; const pts = D.sitio.concat([D.sitio[0]]).map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 3, Z); });
  const cur = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0); tubo(k, cur, 4, COL.ocre, 1, 0);
  const gs = []; for (let i = 0; i < D.sitio.length; i++) { const a = D.sitio[i], b = D.sitio[(i + 1) % D.sitio.length]; const [ax, az] = W(...a), [bx, bz] = W(...b); const L = Math.hypot(bx - ax, bz - az); if (L < 0.5) continue; const m = new THREE.PlaneGeometry(L, 60); m.translate(0, 30, 0); m.rotateY(-Math.atan2(bz - az, bx - ax)); m.translate((ax + bx) / 2, 0, (az + bz) / 2); gs.push(m); }
  const muroLuz = new THREE.Mesh(mergeGeometries(gs), xmat(k, new THREE.MeshBasicMaterial({ color: COL.ocre, side: THREE.DoubleSide }), 0.22)); muroLuz.renderOrder = 7; xg(k).g.add(muroLuz); crece(k, muroLuz, 0.3, 1.4, 'sy');
  const xs = D.sitio.map(p => p[0]), ys = D.sitio.map(p => p[1]); const mnx = Math.min(...xs), mxy = Math.max(...ys);
  addEt('<i style="background:#F2EFE8"></i>Av. Boyacá', (() => { const p = W(mnx - 70, CY); return [p[0], 20, p[1]]; })(), ['avs'], 'fuerte');
  addEt('<i style="background:#F2EFE8"></i>Av. de las Américas', (() => { const p = W(CX, mxy + 70); return [p[0], 20, p[1]]; })(), ['avs'], 'fuerte');
  addEt(`<i style="background:${COL.ocre}"></i>Antigua cervecería de Bavaria`, [0, 140, 0], ['avs']);
  onda(k, [0, 0], COL.ocre, 900, 4, 2); }
addEt('Bavaria Común · Distrito de Tecnologías Convergentes', [0, 700, 0], ['capas'], 'titulo3d');

// ---- 08.7 clúster de conocimiento: actores ↔ actividades, con haces a sus naves
{ const ACT = [['uni', 'Universidades', COL.lila, 5], ['com', 'Comerciantes', COL.ocre, 3], ['pro', 'Promotores', '#d98f5a', 11], ['org', 'Organizaciones barriales', COL.rojo, 4]];
  const VER = [['exp', 'Experimentar', '#F2EFE8'], ['apr', 'Aprender', '#F2EFE8'], ['ini', 'Organizar iniciativas propias', '#F2EFE8']];
  const R = 260, Y = 260;
  const N = [...ACT.map(([id, n, c], i) => { const a = i * Math.PI / 2 + 0.4; return { id, n, c, r: 20, p: [Math.cos(a) * R, 0, Math.sin(a) * R], et: true }; }),
    ...VER.map(([id, n, c], i) => { const a = i * Math.PI * 2 / 3; return { id, n, c, r: 12, p: [Math.cos(a) * 90, 90, Math.sin(a) * 90], et: `<b>${n}</b>`, cls: 'verbo' }; })];
  const L = []; ACT.forEach(([a, , c]) => VER.forEach(([v]) => L.push([a, v, c, 3]))); ACT.forEach(([a, , c], i) => L.push([a, ACT[(i + 1) % 4][0], '#77736b', 2]));
  red3d('actores', N, L, { c: [0, 0], y: Y, R, fijo: true, rot: 0, dn: 0.2, dl: 0.04, tp: 6 });
  ACT.forEach(([id, , c, ed], i) => { const a = i * Math.PI / 2 + 0.4; const A = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R); const [bx, bz] = centroEdif(ed); const B = new THREE.Vector3(bx, D.edif[ed].h + 2 - Y, bz);
    const cur = new THREE.LineCurve3(A, B); tubo('actores', cur, 2.5, c, 0.8, 1.2); pulsos('actores', [cur], c, 3, 0.3, 7); }); }

// ---- 08.8 NBIC: tetraedro de la convergencia (Roco y Bainbridge)
const NB = { N: ['Nanotecnología', COL.ocre], B: ['Biotecnología', COL.verde], I: ['Información', COL.azul], C: ['Cognición', COL.lila] };
const ZNB = [(ZI[0] + ZI2[0]) / 2, (ZI[1] + ZI2[1]) / 2], YNB = 330;
{ const v = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], R = 110; const ids = ['N', 'B', 'I', 'C'];
  const N = ids.map((id, i) => ({ id, n: NB[id][0], c: NB[id][1], r: 22, p: v[i].map(q => q * R / Math.sqrt(3)), et: `<b class="letra" style="color:${NB[id][1]}">${id}</b> ${NB[id][0]}` }));
  const L = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) L.push([ids[i], ids[j], '#F2EFE8', 2.5]);
  red3d('nbic', N, L, { c: ZNB, y: YNB, R, fijo: true, rot: 0.35, dn: 0.18, dl: 0.1, tp: 7, np: 3 });
  addEt('Enfoque NBIC · Roco y Bainbridge (2003)', (() => { const o = new THREE.Object3D(); o.position.set(0, 150, 0); xg('nbic').g.add(o); return o; })(), ['nbic'], 'titulo3d'); }
// haces desde el centro del tetraedro hacia donde se aplica cada línea
const hazNB = (k, destinos, col) => { const A = new THREE.Vector3(ZNB[0], YNB - 40, ZNB[1]); const cs = destinos.map(([x, y, z]) => { const B = new THREE.Vector3(x, y, z); return new THREE.QuadraticBezierCurve3(A, A.clone().lerp(B, 0.5).add(new THREE.Vector3(0, A.distanceTo(B) * 0.15, 0)), B); });
  cs.forEach((c, i) => tubo(k, c, 4, col, 0.85, 0.2 + i * 0.15)); pulsos(k, cs, '#ffffff', 4, 0.3, 8); destinos.forEach(([x, , z]) => onda(k, [x, z], col, 70, 4, 2)); };
hazNB('nbB', [[centroEdif(0)[0], D.edif[0].h, centroEdif(0)[1]], [ZC[0], 4, ZC[1]], [centroEdif(23)[0], D.edif[23].h, centroEdif(23)[1]]], COL.verde);
hazNB('nbI', [...MERC.map(m => [m.p[0], 300, m.p[1]]), [CORA[0], 300, CORA[1]]], COL.azul);
hazNB('nbC', [[ZM[0], 30, ZM[1]], ...TECHS.filter((_, i) => i % 6 === 0).map(t => [t.p[0], t.h, t.p[1]])], COL.lila);
hazNB('nbN', [[centroEdif(5)[0], D.edif[5].h, centroEdif(5)[1]]], COL.ocre);
// biotecnología: el ciclo residuo → compost → huerta → mercado gira en el predio
{ const pts = [V3(ZC, 6), V3(ZI, 14), V3(ZM, 14), V3(ZC, 6)]; const c1 = new THREE.CatmullRomCurve3(pts, true); tubo('nbB', c1, 3, '#b98a57', 0.8, 0.8); pulsos('nbB', [c1], ['#8fc46a'], 10, 0.12, 8); }

// ---- 09.2 formación en Bavaria -> producción en las viviendas: ciclos de acompañamiento
const TCASA = TECHS[Math.floor(TECHS.length * 0.35)] || { p: [400, 300], h: 10 };
onda('ciclos', TCASA.p, COL.ocre, 90, TCASA.h + 2, 3); pin('ciclos', TCASA.p, '#8fc46a', 40, 10);
{ const ZF = centroEdif(2); const cur = curva(ZF, TCASA.p, 80, 12, TCASA.h + 4); tubo('ciclos', cur, 3, COL.ocre, 0.9, 0.2); pulsos('ciclos', [cur], '#ffffff', 5, 0.25, 9);
  addEt(`<i style="background:${COL.ocre}"></i>Promotor barrial · primeros ciclos`, (() => { const p = cur.getPoint(0.5); return [p.x, p.y + 20, p.z]; })(), ['ciclos']);
  addEt(`<i style="background:#8fc46a"></i>Vivienda con huerta`, [TCASA.p[0], TCASA.h + 60, TCASA.p[1]], ['ciclos']); }
addEt(`<i style="background:${COL.verde}"></i>Módulos demostrativos en Bavaria`, (() => { const B = D.bloques || []; if (!B.length) return [0, 12, 0]; const b = B[Math.floor(B.length / 2)]; const p = W(b.reduce((t, q) => t + q[0], 0) / b.length, b.reduce((t, q) => t + q[1], 0) / b.length); return [p[0], 14, p[1]]; })(), ['ciclos']);
// 09.3 el incentivo: una red sobre la vivienda
{ const N = [{ id: 'h', n: 'Huerta en casa', c: '#8fc46a', r: 16, p: [0, 0, 0], et: true }, { id: 'a', n: 'Hortalizas frescas', c: COL.verde, r: 11, p: [70, 40, 0], et: true }, { id: 'b', n: 'Insumos conocidos', c: COL.ocre, r: 11, p: [-35, 40, 60], et: true }, { id: 'c', n: 'Menos compras del hogar', c: COL.azul, r: 11, p: [-35, 40, -60], et: true }];
  red3d('incentivo', N, [['h', 'a', COL.verde, 2.5], ['h', 'b', COL.ocre, 2.5], ['h', 'c', COL.azul, 2.5]], { c: TCASA.p, y: TCASA.h + 50, R: 80, fijo: true, rot: 0.25, dn: 0.3, dl: 0.25, tp: 7, np: 3 });
  onda('incentivo', TCASA.p, '#8fc46a', 60, TCASA.h + 2, 2); }
// 09.4 excedentes = ingreso complementario
addEt(`<i style="background:${COL.ocre}"></i>Ingreso complementario`, (() => { const m = MERC[1].p; return [m[0], 380, m[1]]; })(), ['exc'], 'fuerte');
// 09.5 Jardín Botánico de Bogotá, referente local
const JB = geoLL(4.6683, -74.0995);
{ const cur = curva(JB, [0, 0], null, 20, 20); tubo('jb', cur, 16, COL.verde, 0.85, 0.1); pulsos('jb', [cur], '#ffffff', 6, 0.18, 10); pin('jb', JB, COL.verde, 520, 110, 0.2); pin('jb', [0, 0], COL.ocre, 380, 80, 0.8); onda('jb', JB, COL.verde, 900, 6, 3);
  addEt(`<i style="background:${COL.verde}"></i>Jardín Botánico de Bogotá`, [JB[0], 720, JB[1]], ['jb'], 'fuerte');
  addEt('Formación y asistencia técnica en producción urbana', (() => { const p = cur.getPoint(0.5); return [p.x, p.y + 60, p.z]; })(), ['jb']);
  addEt(`<i style="background:${COL.ocre}"></i>Bavaria Común`, [0, 520, 0], ['jb']); }

// ---- 10.1 la red de relaciones bióticas de Kennedy (data3d/biotica.json: especies, flora e interacciones)
let LEY_BIO = '';
const BIO = await fetch('data3d/biotica.json').then(r => r.json()).catch(() => null);
if (BIO) { const TIP = BIO.tipos; const deg = {}; BIO.enlaces.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; });
  const esp = Object.entries(BIO.especies).map(([id, e]) => ({ id, n: e.n, c: '#F2EFE8', r: 7 + Math.sqrt(deg[id] || 1) * 3.2 }));
  const fl = Object.entries(BIO.flora).filter(([id]) => deg[id]).map(([id, f]) => ({ id, n: f.n.split(',')[0], c: '#7fc48f', r: 4 + Math.sqrt(deg[id] || 1) * 1.8 }));
  const top = [...esp].sort((a, b) => (deg[b.id] || 0) - (deg[a.id] || 0)).slice(0, MOVIL ? 6 : 10); top.forEach(n => { n.et = true; });
  const L = BIO.enlaces.map(([a, b, t]) => [a, b, (TIP[t] || TIP[0]).c, 1.8]);
  red3d('bioRed', [...esp, ...fl], L, { c: [ZB[0], ZB[1]], y: 470, R: MOVIL ? 380 : 560, rep: 3.2, rot: 0.06, flat: 0.85, dn: 0.012, dl: 0.006, tp: 4, np: 1, vp: 0.15 });
  LEY_BIO = '<div class="t">Red de relaciones bióticas</div>' + TIP.slice(0, 6).map(q => `<div class="f"><i style="background:${q.c}"></i>${q.n}</div>`).join('') + '<div class="f"><i style="background:#F2EFE8"></i>Fauna</div><div class="f"><i style="background:#7fc48f"></i>Flora</div>'; }
// 10.2 polinizadores alrededor de las huertas: enjambres que giran sobre las manzanas de huerta
{ const B = D.bloques || []; const n = MOVIL ? 500 : 1100; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cen = [], par = []; let s = 13; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const PAL = ['#f2c230', '#f2c230', '#ffffff', '#d0517a', '#b48ad6'];
  for (let i = 0; i < n; i++) { const b = B[Math.floor(rnd() * B.length)] || [[CX, CY]]; const c = W(b.reduce((t, q) => t + q[0], 0) / b.length, b.reduce((t, q) => t + q[1], 0) / b.length); cen.push(c); par.push([8 + rnd() * 22, rnd() * 6.28, 0.6 + rnd() * 1.6, 2 + rnd() * 9]); const cc = new THREE.Color(PAL[i % PAL.length]); col.set([cc.r, cc.g, cc.b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, xmat('abejas', new THREE.PointsMaterial({ size: MOVIL ? 3 : 3.6, sizeAttenuation: false, vertexColors: true }), 1)); p.frustumCulled = false; p.renderOrder = 12; xg('abejas').g.add(p);
  xg('abejas').upd.push((t) => { for (let i = 0; i < n; i++) { const [r, ph, w, h] = par[i], c = cen[i]; const a = ph + t * w; pos.set([c[0] + Math.cos(a) * r, h + Math.sin(t * 3 + ph) * 1.5, c[1] + Math.sin(a * 1.3) * r], i * 3); } g.attributes.position.needsUpdate = true; }); }
// 10.3 los parches dejan de ser islas: domos de vegetación unidos, con aves que viajan entre ellos
const PARCHES = [];
{ const cerca = PQ.map(q => { const x = q.pts.reduce((t, p) => t + p[0], 0) / q.pts.length, y = q.pts.reduce((t, p) => t + p[1], 0) / q.pts.length; const c = W(x, y); return { c, d: Math.hypot(c[0], c[1]), a: poligonoArea(q.pts) }; }).filter(o => o.d < 2400 && o.a > 2500).sort((a, b) => b.a - a.a).slice(0, MOVIL ? 12 : 20);
  PARCHES.push({ c: ZB, a: 120000 }, ...cerca);
  PARCHES.forEach((o, i) => { const r = Math.min(150, 30 + Math.sqrt(o.a) * 0.5); const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), xmat('islas', new THREE.MeshLambertMaterial({ color: '#4FB98C' }), 0.55, null, false)); m.position.set(o.c[0], 0, o.c[1]); m.renderOrder = 8; xg('islas').g.add(m); crece('islas', m, i * 0.05, 0.9); onda('islas', o.c, COL.verde, r * 2.2, 3, 1); });
  const cs = []; const pares = new Set(); PARCHES.forEach((a, i) => PARCHES.map((b, j) => [j, Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1])]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2).forEach(([j]) => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (pares.has(key)) return; pares.add(key); cs.push(curva(a.c, PARCHES[j].c, null, 20, 20)); }));
  cs.forEach((c, i) => tubo('puentes', c, 4, COL.verde, 0.75, 0.3 + i * 0.06)); pulsos('puentes', cs, ['#f2c230', '#ffffff', '#d0517a'], 3, 0.09, 7);
  // aves que vuelan por los puentes
  const ala = new THREE.BufferGeometry(); ala.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -2, 0, 0, 2, -7, 0.8, 0, 0, 0, -2, 0, 0, 2, 7, 0.8, 0, 0, 0, -2, 0, 0, 2, 0, 0.2, 5], 3));
  const am = xmat('puentes', new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 1); const aves = cs.slice(0, 16).map((c, i) => { const b = new THREE.Mesh(ala, am); b.scale.setScalar(2.4); b.renderOrder = 13; xg('puentes').g.add(b); return { b, c, ph: i * 0.37 }; });
  xg('puentes').upd.push((t) => aves.forEach(({ b, c, ph }) => { const u = (t * 0.07 + ph) % 1; c.getPoint(u, tmp); b.position.copy(tmp); c.getTangent(u, tmp2); b.rotation.set(0, Math.atan2(tmp2.x, tmp2.z), Math.sin(t * 9 + ph * 7) * 0.4); }));
  addEt(`<i style="background:${COL.verde}"></i>Parches que eran islas`, [PARCHES[3] ? PARCHES[3].c[0] : 300, 120, PARCHES[3] ? PARCHES[3].c[1] : 300], ['islas']);
  addEt('<i style="background:#ffffff"></i>Aves y polinizadores entre parches', (() => { const c = cs[2] || cs[0]; const p = c ? c.getPoint(0.5) : new THREE.Vector3(); return [p.x, p.y + 30, p.z]; })(), ['puentes']);
  addEt(`<i style="background:${COL.verde}"></i>Alimento y refugio`, [ZB[0], 160, ZB[1]], ['islas']); }
// 10.4 control de ratas: la cadena residuos → ratas, cortada por almacenamiento y retiro, y la depredación de las rapaces
{ const N = [{ id: 'res', n: 'Residuos', c: '#a77b5a', r: 9, p: [-60, 0, 0], et: true }, { id: 'rat', n: 'Ratas', c: '#9aa0a6', r: 9, p: [60, 0, 0], et: true }, { id: 'alm', n: 'Almacenamiento cerrado', c: COL.verde, r: 8, p: [-30, 60, 40], et: true }, { id: 'ret', n: 'Retiro oportuno', c: COL.verde, r: 8, p: [-30, 60, -40], et: true }, { id: 'rap', n: 'Aves rapaces', c: '#F2EFE8', r: 9, p: [80, 90, 0], et: true }];
  red3d('cadena', N, [['res', 'rat', COL.rojo, 2.5], ['alm', 'res', COL.verde, 2.5], ['ret', 'res', COL.verde, 2.5], ['rap', 'rat', '#F2EFE8', 2.5]], { c: ZC, y: 70, R: 90, fijo: true, rot: 0.15, dn: 0.25, dl: 0.25, tp: 6, np: 3 }); }
{ const e = masCerca(ZC, ENT.map(p => W(...p))); const cur = curva(ZC, e, 30, 4, 4); tubo('retiro', cur, 2.5, COL.ocre, 0.9, 0.2); pulsos('retiro', [cur], COL.ocre, 4, 0.2, 10); addEt(`<i style="background:${COL.ocre}"></i>Retiro de residuos`, (() => { const p = cur.getPoint(0.5); return [p.x, p.y + 12, p.z]; })(), ['retiro']); }

// ---- 10.5 sintaxis en 3D: cada tramo de calle es una barra cuya altura es su valor
const SXC = [];
const barras = (k, ix) => {
  const S = existentes; const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const m = new THREE.InstancedMesh(geo, xmat(k, new THREE.MeshLambertMaterial({ color: '#ffffff' }), 1, null, true), S.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  S.forEach((s, i) => { const a = s.p[0], b = s.p[s.p.length - 1]; const [ax, az] = W(...a), [bx, bz] = W(...b); const L = Math.max(2, Math.hypot(bx - ax, bz - az)); const v = pct(s.a[ix], ix);
    const h = 4 + 480 * Math.pow(v, 6); p.set((ax + bx) / 2, 0, (az + bz) / 2); q.setFromAxisAngle(Y, -Math.atan2(bz - az, bx - ax)); sc.set(L, h, MOVIL ? 14 : 10); M.compose(p, q, sc); m.setMatrixAt(i, M); m.setColorAt(i, rampa(v)); });
  m.renderOrder = 5; xg(k).g.add(m); crece(k, m, 0.1, 2.2, 'sy'); return m; };

{ const top = existentes.map(s => ({ s, v: s.a[2] })).sort((a, b) => b.v - a.v).slice(0, MOVIL ? 160 : 360);
  const cs = top.map(({ s }) => { const pts = s.p.map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 8, Z); }); return pts.length > 1 ? new THREE.CatmullRomCurve3(pts) : null; }).filter(Boolean);
  pulsos('recorridos', cs, '#ffffff', 2, 0.35, 5); }
// 10.6 pasajes: peatones que entran por las puertas hasta las naves
{ const cs = nuevos.map(s => { const pts = chaikin(s.p).map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 3, Z); }); return new THREE.CatmullRomCurve3(pts); });
  cs.forEach((c, i) => tubo('pasos', c, 2.2, '#F2EFE8', 0.95, i * 0.08)); pulsos('pasos', cs, [COL.ocre, '#ffffff'], 5, 0.07, 7);
  ENT.forEach(([x, y], i) => onda('pasos', W(x, y), COL.ocre, 40, 3, 1)); }
// 10.7 áreas ya ocupadas: la huella existente se ilumina; el bosque queda sin intervenir
{ const g = mergeGeometries(D.edif.map(e => { const s = new THREE.ShapeGeometry(forma(e.p)); s.rotateX(-Math.PI / 2); s.translate(0, 2, 0); s.deleteAttribute('uv'); return s; })); const m = new THREE.Mesh(g, xmat('ocupado', new THREE.MeshBasicMaterial({ color: COL.ocre }), 0.75)); m.renderOrder = 8; xg('ocupado').g.add(m);
  D.edif.forEach((e, i) => { if (i % 3) return; const c = centroEdif(i); onda('ocupado', c, COL.ocre, 50, 3, 1); });
  addEt(`<i style="background:${COL.ocre}"></i>Intervención en áreas ya ocupadas`, [0, 80, 0], ['ocupado'], 'fuerte');
  addEt(`<i style="background:${COL.verde}"></i>Bosque sin intervenir`, [ZB[0], 70, ZB[1]], ['ocupado']); }

// ---- 11.1 ¿hasta dónde llegan los pasajes? frentes que se acercan al bosque y se detienen
{ const cs = nuevos.map(s => { const pts = chaikin(s.p).map(([x, y]) => { const [X, Z] = W(x, y); return new THREE.Vector3(X, 4, Z); }); return { c: new THREE.CatmullRomCurve3(pts), d: Math.min(...pts.map(p => Math.hypot(p.x - ZB[0], p.z - ZB[1]))) }; }).sort((a, b) => a.d - b.d).slice(0, 8);
  cs.forEach(({ c }, i) => { tubo('limite', c, 3.2, '#F2EFE8', 0.9, i * 0.1); }); pulsos('limite', cs.map(o => o.c), [COL.rojo, '#ffffff'], 3, 0.12, 8);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), xmat('limite', new THREE.MeshBasicMaterial({ color: COL.verde }), 0.9)); anillo.rotation.x = Math.PI / 2; anillo.position.set(ZB[0], 6, ZB[1]); anillo.scale.setScalar(230); xg('limite').g.add(anillo);
  xg('limite').upd.push((t) => { anillo.scale.setScalar(230 + Math.sin(t * 2) * 12); });
  addEt('¿Hasta dónde llegan los pasajes?', [ZB[0], 120, ZB[1]], ['limite'], 'fuerte'); addEt('¿Qué actividades cerca del bosque?', [ZB[0] + 160, 60, ZB[1] - 120], ['limite']); }
// 11.2 Salvemos el Bosque de Bavaria: el colectivo rodea el bosque
{ const G = new THREE.Group(); G.position.set(ZB[0], 0, ZB[1]); G.userData.gira = true; xg('colectivo').g.add(G); xg('colectivo').rot = 0.08; const n = 64;
  const pm = xmat('colectivo', new THREE.MeshBasicMaterial({ color: COL.verde }), 1);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const c = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 5, 3, 8), pm); c.position.set(Math.cos(a) * 250, 5, Math.sin(a) * 250); c.renderOrder = 12; G.add(c); crece('colectivo', c, i * 0.015, 0.5); }
  new THREE.TextureLoader().load('data3d/logo_bosque_bavaria.png', (tx) => { tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(xmat('colectivo', new THREE.SpriteMaterial({ map: tx }), 1)); const asp = tx.image.width / tx.image.height; sp.scale.set(160 * asp, 160, 1); sp.position.set(ZB[0], 210, ZB[1]); sp.renderOrder = 14; xg('colectivo').g.add(sp); crece('colectivo', sp, 0.4, 0.9); });
  addEt(`<i style="background:${COL.verde}"></i>Salvemos el Bosque de Bavaria · colectivo ciudadano`, [ZB[0], 320, ZB[1]], ['colectivo'], 'fuerte');
  addEt('Conservación del bosque frente a la tala', [ZB[0] + 250, 30, ZB[1]], ['colectivo']); }


/* =============================== RED DE ABASTECIMIENTO CON ÍCONOS (hoy centralizada · propuesta distribuida) =============================== */
// Íconos de trazo (estilo Lucide, 24 × 24). 'circle cx cy r' se dibuja como círculo.
const ICO = {
  colegio: ['M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5'],
  plaza: ['m2 7 3-4h14l3 4', 'M4 11v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9', 'M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5', 'M2 7h20'],
  mercado: ['m15 11-1 9', 'm19 11-4-7', 'M2 11h20', 'm3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4', 'M4.5 15.5h15', 'm5 11 4-7', 'm9 11 1 9'],
  corabastos: ['M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z', 'M6 18h12', 'M6 14h12', 'M6 10h12'],
  camion: ['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14', 'circle 17 18 2', 'circle 7 18 2'],
  cluster: ['circle 12 5 2.6', 'circle 5 18.5 2.6', 'circle 19 18.5 2.6', 'M10.6 7.3 6.4 16.2', 'M13.4 7.3l4.2 8.9', 'M7.6 18.5h8.8'],
  lab: ['M9 3h6', 'M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3', 'M7 15h10'],
  asamblea: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'circle 9 7 4', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  huerta: ['M7 20h10', 'M10 20c5.5-2.5.8-6.4 3-10', 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z', 'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z'],
  hongo: ['M12 21v-8', 'M3.5 13a8.5 8.5 0 0 1 17 0z', 'M9 21h6'],
  compost: ['M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L7.2 9.5', 'M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2.1', 'm14 16-3 3 3 3', 'M8.3 13.6 7.2 9.5 3.1 10.6', 'm9.3 5.8 1.1-1.9a1.8 1.8 0 0 1 3.1 0l3.9 6.8', 'm13.4 9.6 4.1 1.1 1.1-4.1'],
  cocina: ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'],
  persona: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'circle 12 7 4'],
  casa: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
};
const icoSVG = (k, col = 'currentColor', px = 14) => `<svg class="ico" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICO[k].map(d => d.startsWith('circle') ? (([, x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)(d.split(' ')) : `<path d="${d}"/>`).join('')}</svg>`;
const etI = (k, col, txt) => `<span class="pin" style="background:${col}">${icoSVG(k, '#111', 12)}</span>${txt}`;
const texIco = (() => { const cache = new Map(); return (k, col, anillo = '#0d0e10') => { const key = k + col + anillo; if (cache.has(key)) return cache.get(key);
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = anillo; g.stroke();
  g.save(); g.translate(S * 0.22, S * 0.22); g.scale(S * 0.56 / 24, S * 0.56 / 24); g.strokeStyle = '#111'; g.lineWidth = 2.3; g.lineCap = g.lineJoin = 'round';
  for (const d of ICO[k]) { if (d.startsWith('circle')) { const [, x, y, r] = d.split(' ').map(Number); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); } else g.stroke(new Path2D(d)); }
  g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cache.set(key, t); return t; }; })();
// ícono que siempre se ve del mismo tamaño en pantalla
// ícono sobre una columna de luz que sube desde el suelo (lee como torre en 3D)
const icono = (k, tipo, col, P, y, tam, d = 0, haz = y > 50) => { const sp = new THREE.Sprite(xmat(k, new THREE.SpriteMaterial({ map: texIco(tipo, col), sizeAttenuation: false }), 1)); sp.scale.setScalar(tam * (MOVIL ? 0.8 : 1)); sp.position.set(P[0], y, P[1]); sp.renderOrder = 15; xg(k).g.add(sp); crece(k, sp, d + 0.3, 0.6);
  if (haz) { const r = Math.max(3, y * 0.018); const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r, y, 10, 1, true), xmat(k, new THREE.MeshBasicMaterial({ color: col, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0.55)); c.geometry.translate(0, y / 2, 0); c.position.set(P[0], 0, P[1]); c.renderOrder = 9; xg(k).g.add(c); crece(k, c, d, 0.9, 'sy');
    const b = new THREE.Mesh(new THREE.CircleGeometry(r * 4, 24), xmat(k, new THREE.MeshBasicMaterial({ color: col, blending: THREE.AdditiveBlending }), 0.35)); b.rotation.x = -Math.PI / 2; b.position.set(P[0], 2, P[1]); xg(k).g.add(b); }
  return sp; };

const RD = await fetch('data3d/bavaria_red.json').then(r => r.json()).catch(() => ({ colegios: [], plazas: [] }));
const COLEG = RD.colegios.map(c => ({ n: c.n, p: W(...c.p) }));
const PLZK = RD.plazas.map(c => ({ n: c.n, p: W(...c.p) }));
const CC = { cora: '#E0623F', plaza: '#4EAECF', merc: '#4FB98C', cole: '#F2EFE8', bav: '#F2B53A', prod: '#cfc6b4' };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const TAM = { cora: 0.05, hub: 0.03, cole: 0.017, bav: 0.042, prod: 0.028 };
// --- HOY: todo pasa por Corabastos
{ const k = 'redHoy'; const todos = [...PLZK.map(q => q.p), ...COLEG.map(q => q.p)];
  const cs = todos.map(p => curva(CORA, p, dist(CORA, p) * 0.32, 560, 70)); cs.forEach((c, i) => tubo(k, c, MOVIL ? 13 : 10, '#e0623f', 0.75, 0.3 + i * 0.012));
  pulsos(k, cs, '#ffd2c4', 2, 0.12, 6);
  icono(k, 'corabastos', CC.cora, CORA, 600, TAM.cora, 0); onda(k, CORA, CC.cora, 1300, 8, 3);
  PLZK.forEach((q, i) => icono(k, 'plaza', CC.plaza, q.p, 160, TAM.hub, 0.2 + i * 0.03)); COLEG.forEach((q, i) => icono(k, 'colegio', CC.cole, q.p, 70, TAM.cole, 0.4 + i * 0.012));
  addEt(etI('corabastos', CC.cora, '<b>Corabastos</b> · hoy, el centro de todo'), [CORA[0], 680, CORA[1]], [k], 'fuerte'); }
// productores de otros territorios: camiones que entran (hoy a Corabastos; con la propuesta a varios mercados)
const camiones = (k, cs) => { const sps = cs.map((c, i) => { const sp = icono(k, 'camion', CC.prod, [0, 0], 0, TAM.prod, 0.2); return { sp, c, ph: i * 0.29 }; }); xg(k).upd.push((t) => sps.forEach(({ sp, c, ph }) => { c.getPoint((t * 0.09 + ph) % 1, sp.position); })); };
{ const k = 'llegan'; const cs = ENTR.map(e => curva(e, CORA, null, 10, 40)); cs.forEach((c, i) => tubo(k, c, MOVIL ? 22 : 16, CC.prod, 0.75, i * 0.1)); camiones(k, cs); pulsos(k, cs, '#ffffff', 3, 0.09, 6);
  ENTR.forEach((e, i) => icono(k, 'huerta', '#a3b845', e, 40, TAM.hub, i * 0.08));
  addEt(etI('huerta', '#a3b845', 'Entrada de productores de otros territorios'), [ENTR[0][0], 260, ENTR[0][1]], [k], 'fuerte');
  addEt(etI('huerta', '#a3b845', 'Productores de otros territorios'), [ENTR[3][0], 260, ENTR[3][1]], [k]); }
// --- PROPUESTA: red distribuida. Nodos que reciben: mercados barriales nuevos, plazas existentes, Corabastos (uno más) y Bavaria Común (clúster)
const HUBS = [...MERC.map(m => ({ n: 'Mercado ' + m.n, p: m.p, t: 'merc' })), ...PLZK.map(q => ({ n: q.n, p: q.p, t: 'plaza' })), { n: 'Corabastos', p: CORA, t: 'cora' }, { n: 'Bavaria Común', p: [0, 0], t: 'bav' }];
{ const k = 'redProp';
  // malla entre nodos: cada uno con sus 3 vecinos más cercanos
  const pares = new Set(), mal = []; HUBS.forEach((a, i) => HUBS.map((b, j) => [j, dist(a.p, b.p)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3).forEach(([j]) => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (pares.has(key)) return; pares.add(key); mal.push(curva(a.p, HUBS[j].p, dist(a.p, HUBS[j].p) * 0.3, 260, 260)); }));
  mal.forEach((c, i) => tubo(k, c, MOVIL ? 17 : 13, CC.merc, 0.9, 0.2 + i * 0.03)); pulsos(k, mal, ['#ffffff', '#a3e8c7'], 3, 0.1, 7);
  // cada colegio se abastece del nodo más cercano
  const cc = COLEG.map(q => { const h = HUBS.reduce((b, x) => dist(x.p, q.p) < dist(b.p, q.p) ? x : b, HUBS[0]); return curva(h.p, q.p, dist(h.p, q.p) * 0.25, 260, 70); });
  cc.forEach((c, i) => tubo(k, c, MOVIL ? 8 : 6, '#bfe8d3', 0.75, 0.8 + i * 0.01)); pulsos(k, cc, '#ffffff', 1, 0.16, 5);
  HUBS.forEach((h, i) => icono(k, h.t === 'merc' ? 'mercado' : h.t === 'plaza' ? 'plaza' : h.t === 'cora' ? 'corabastos' : 'cluster', CC[h.t], h.p, h.t === 'bav' ? 380 : 260, h.t === 'bav' ? TAM.bav : TAM.hub, 0.1 + i * 0.04));
  COLEG.forEach((q, i) => icono(k, 'colegio', CC.cole, q.p, 70, TAM.cole, 0.6 + i * 0.01));
  onda(k, [0, 0], CC.bav, 700, 8, 2);
  MERC.forEach((m, i) => { if (MOVIL && i % 2) return; addEt(etI('mercado', CC.merc, m.n), [m.p[0], 320, m.p[1]], [k]); });
  addEt(etI('corabastos', CC.cora, '<b>Corabastos</b> · un nodo más'), [CORA[0], 320, CORA[1]], [k], 'fuerte');
  addEt(etI('cluster', CC.bav, '<b>Bavaria Común</b> · clúster'), [0, 450, 0], [k], 'fuerte'); }
// nombres de colegios (los que tienen nombre propio, repartidos) y plazas
{ const sel = COLEG.filter(q => !/^Colegio$/.test(q.n)).filter((_, i) => i % (MOVIL ? 30 : 17) === 0);
  sel.forEach(q => addEt(etI('colegio', CC.cole, q.n), [q.p[0], 110, q.p[1]], ['redHoyN']));
  PLZK.filter(q => q.n !== 'Plaza de mercado').forEach(q => addEt(etI('plaza', CC.plaza, q.n), [q.p[0], 220, q.p[1]], ['redHoyN', 'redPropN'])); }
// miniatura animada del esquema (va en la leyenda)
const mini = (tipo) => { const C = [60, 50], R = 38, n = 10; const P = Array.from({ length: n }, (_, i) => [C[0] + Math.cos(i / n * 6.283) * R * (i % 2 ? 0.75 : 1), C[1] + Math.sin(i / n * 6.283) * R * (i % 2 ? 0.75 : 1) * 0.85]);
  let L = ''; if (tipo === 'hoy') L = P.map(p => `<line x1="${C[0]}" y1="${C[1]}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" class="fl r"/>`).join('');
  else { P.forEach((p, i) => { const q = P[(i + 1) % n], r = P[(i + 3) % n]; L += `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" class="fl v"/>` + (i % 2 ? '' : `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${r[0].toFixed(1)}" y2="${r[1].toFixed(1)}" class="fl v"/>`); }); }
  const nodos = P.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${tipo === 'hoy' ? 3.5 : i === 3 ? 5 : 4}" fill="${tipo === 'hoy' ? '#4EAECF' : i === 3 ? '#E0623F' : i === 7 ? '#F2B53A' : '#4FB98C'}"/>`).join('');
  const centro = tipo === 'hoy' ? `<circle cx="${C[0]}" cy="${C[1]}" r="9" fill="#E0623F"/>` : '';
  return `<svg class="mini" viewBox="0 0 120 100">${L}${centro}${nodos}</svg>`; };
const comparar = (a) => `<div class="cmp"><div class="${a === 'hoy' ? 'on' : ''}">${mini('hoy')}<span>Hoy · centralizada</span></div><div class="${a === 'prop' ? 'on' : ''}">${mini('prop')}<span>Propuesta · distribuida</span></div></div>`;
// ---- el clúster de Bavaria Común: las naves con nombre, unidas entre sí y con la red
const CLU = [[3, 'mercado', 'Mercado y registro de pedidos', COL.ocre], [5, 'lab', 'Laboratorio universitario', COL.lila], [4, 'asamblea', 'Casa de la federación', COL.rojo], [0, 'huerta', 'Invernadero hidropónico', COL.verde], [2, 'huerta', 'Módulos demostrativos', COL.verde], [23, 'hongo', 'Laboratorio de hongos', '#d9c7ef'], [7, 'cocina', 'Cocina comunitaria', '#e58aa8'], [11, 'persona', 'Promotores barriales', '#d98f5a'], [-1, 'compost', 'Compostaje', '#b98a57']];
{ const k = 'cluster'; const P = CLU.map(([i]) => i < 0 ? ZC : centroEdif(i)); const Y = (i) => i < 0 ? 12 : D.edif[i].h + 10;
  const pares = new Set(), cs = []; P.forEach((a, i) => P.map((b, j) => [j, dist(a, b)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3).forEach(([j]) => { const key = Math.min(i, j) + '-' + Math.max(i, j); if (pares.has(key)) return; pares.add(key); cs.push(curva(a, P[j], dist(a, P[j]) * 0.3, Y(CLU[i][0]), Y(CLU[j][0]))); }));
  cs.forEach((c, i) => tubo(k, c, 2.6, COL.ocre, 0.9, 0.3 + i * 0.05)); pulsos(k, cs, '#ffffff', 3, 0.2, 7);
  CLU.forEach(([i, ic, n, c], q) => { icono(k, ic, c, P[q], Y(i) + 6, 0.034, 0.1 + q * 0.08); addEt(etI(ic, c, n), [P[q][0], Y(i) + 6, P[q][1]], [k]); });
  // hacia la red: los mercados barriales más cercanos
  const fuera = [...MERC].sort((a, b) => dist(a.p, ZM) - dist(b.p, ZM)).slice(0, 3); const co = fuera.map(m => curva(ZM, m.p, 140, 20, 20)); co.forEach((c, i) => tubo(k, c, 4, CC.merc, 0.8, 1 + i * 0.1)); pulsos(k, co, '#ffffff', 4, 0.12, 7);
  addEt(etI('mercado', CC.merc, 'Hacia los mercados barriales'), (() => { const p = co[0].getPoint(0.45); return [p.x, p.y + 10, p.z]; })(), [k]);
}

{ const k = 'lleganProp'; const cs = []; ENTR.forEach(e => [...HUBS].sort((a, b) => dist(a.p, e) - dist(b.p, e)).slice(0, 3).forEach(h => cs.push(curva(e, h.p, null, 10, 40)))); cs.forEach((c, i) => tubo(k, c, MOVIL ? 9 : 7, CC.prod, 0.7, i * 0.05)); camiones(k, cs.filter((_, i) => i % 2 === 0)); ENTR.forEach((e, i) => icono(k, 'huerta', '#a3b845', e, 40, TAM.hub, i * 0.08)); addEt(etI('huerta', '#a3b845', 'Productores de otros territorios'), [ENTR[0][0], 260, ENTR[0][1]], [k]); }
// el Jardín Botánico como referente, sin salir de Kennedy: sobre los módulos de formación de Bavaria
{ const k = 'jbRef'; const B = D.bloques || []; const P = B.length ? (() => { const b = B[Math.floor(B.length / 2)]; return W(b.reduce((t, q) => t + q[0], 0) / b.length, b.reduce((t, q) => t + q[1], 0) / b.length); })() : [0, 0];
  icono(k, 'huerta', COL.verde, P, 60, 0.05, 0.2); onda(k, P, COL.verde, 160, 3, 3);
  const pas = [[ZI[0], ZI[1], 'Formación'], [ZM[0], ZM[1], 'Asistencia técnica']].map(([x, z, n], i) => { const c = curva(P, [x, z], 60, 60, 20); tubo(k, c, 3, COL.verde, 0.85, 0.6 + i * 0.2); return c; }); pulsos(k, pas, '#ffffff', 4, 0.25, 7);
  addEt(etI('huerta', COL.verde, '<b>Referente: Jardín Botánico de Bogotá</b>'), [P[0], 90, P[1]], [k], 'fuerte');
  addEt('Formación en producción urbana', [ZI[0], 40, ZI[1]], [k]); addEt('Asistencia técnica', [ZM[0], 40, ZM[1]], [k]); }
{ HUBS.forEach((h, i) => icono('hubIco', h.t === 'merc' ? 'mercado' : h.t === 'plaza' ? 'plaza' : h.t === 'cora' ? 'corabastos' : 'cluster', CC[h.t], h.p, h.t === 'bav' ? 380 : 260, h.t === 'bav' ? TAM.bav : TAM.hub, 0.1 + i * 0.04)); }
/* ---------------- maqueta 3D de Kennedy: todos los edificios como volúmenes (red-de-problemas/edif.bin) ---------------- */
// Cajas orientadas por edificio (buildings.json + Microsoft), oscuras con aristas de luz; se levantan al aparecer.
const MAQ = { u: { uA: { value: 0 }, uRise: { value: 0.001 } }, mesh: null };
fetch('data3d/kennedy_edif.bin').then(r => { if (!r.ok) throw new Error('edif'); return r.arrayBuffer(); }).then(buf => {
  const dv = new DataView(buf), n = dv.getUint32(4, true); const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0);
  const mat = new THREE.ShaderMaterial({ uniforms: MAQ.u, transparent: true,
    vertexShader: `uniform float uRise; varying vec2 vUv; varying float vY, vH, vTop;
      void main(){ vUv = uv; vec4 p = instanceMatrix * vec4(position, 1.); float h = length(instanceMatrix[1].xyz); p.y *= uRise * 2.6; vY = position.y; vH = h; vTop = normal.y;
        gl_Position = projectionMatrix * modelViewMatrix * p; }`,
    fragmentShader: `uniform float uA; varying vec2 vUv; varying float vY, vH, vTop;
      void main(){ vec2 e = min(vUv, 1. - vUv); vec2 f = fwidth(vUv) * 1.3; float edge = 1. - min(smoothstep(0., f.x, e.x), smoothstep(0., f.y, e.y));
        float alto = clamp(vH / 40., 0., 1.);
        vec3 cara = mix(vec3(.085, .095, .11), vec3(.16, .175, .2), vY) + vec3(.07) * step(.5, vTop);
        vec3 linea = vec3(.6, .65, .72) * (.45 + .55 * alto);
        gl_FragColor = vec4(mix(cara, linea, edge * .85), uA * (.95 + .05 * edge)); }` });
  const m = new THREE.InstancedMesh(g, mat, n), o = new THREE.Object3D(); const dx = 7188 - CX, dz = CY - 2045.46;
  for (let i = 0; i < n; i++) { const b = 8 + i * 12; o.position.set(dv.getInt16(b, true) / 2 + dx, 0, dv.getInt16(b + 2, true) / 2 + dz); o.rotation.set(0, dv.getInt16(b + 8, true) / 10000, 0);
    o.scale.set(dv.getInt16(b + 4, true) / 2, dv.getInt16(b + 10, true) / 2, dv.getInt16(b + 6, true) / 2); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
  m.frustumCulled = false; m.visible = false; m.renderOrder = 1; scene.add(m); MAQ.mesh = m;
}).catch(e => console.warn('maqueta:', e));
// parques de Kennedy como manchas verdes de la maqueta
{ const L = SXD.limite; const sel = PQ.filter(q => q.pts.length > 2 && dentroPol(L, q.pts[0][0], q.pts[0][1]));
  if (sel.length) { const g = mergeGeometries(sel.map(q => { const s = new THREE.ShapeGeometry(forma(q.pts)); s.rotateX(-Math.PI / 2); s.translate(0, 0.4, 0); s.deleteAttribute('uv'); return s; }));
    const m = new THREE.Mesh(g, xmat('verdeK', new THREE.MeshBasicMaterial({ color: '#1f4a35' }), 0.95, null, true)); m.renderOrder = 0; xg('verdeK').g.add(m); } }

/* =============================== ESQUEMA 3D SIMPLE DE LA RED DE ABASTECIMIENTO =============================== */
// Pocos nodos grandes que flotan sobre Kennedy y se reacomodan: hoy (estrella en Corabastos) -> llegan productores -> propuesta (malla distribuida).
const ESQ = { estado: 'hoy', tCambio: 0, nodos: [], aristas: [] }; const EJE_Y = new THREE.Vector3(0, 1, 0);
{ const k = 'esquema', X = xg(k); X.g.position.set(KEN_C[0], 0, KEN_C[1]);
  const R = MOVIL ? 1250 : 1500, Y = { per: 380, ani: 620, prod: 260, c: 760 };
  const pol = (a, r, y) => new THREE.Vector3(Math.cos(a * Math.PI / 180) * r, y, -Math.sin(a * Math.PI / 180) * r);
  const geoS = new THREE.SphereGeometry(1, 28, 18), geoC = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  const nodo = (id, ico, col, hoy, prop, rH, rP, d = 0) => {
    const g = new THREE.Group(); X.g.add(g);
    const esf = new THREE.Mesh(geoS, xmat(k, new THREE.MeshBasicMaterial({ color: col }), 0.22)); esf.renderOrder = 12; g.add(esf);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), xmat(k, new THREE.MeshBasicMaterial({ color: col }), 0.9)); anillo.rotation.x = Math.PI / 2; g.add(anillo);
    const sp = new THREE.Sprite(xmat(k, new THREE.SpriteMaterial({ map: texIco(ico, col), sizeAttenuation: false }), 1)); sp.renderOrder = 16; g.add(sp);
    const tallo = new THREE.Mesh(geoC, xmat(k, new THREE.MeshBasicMaterial({ color: col, blending: THREE.AdditiveBlending }), 0.35)); X.g.add(tallo);
    const base = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 40), xmat(k, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0.5)); base.rotation.x = -Math.PI / 2; X.g.add(base);
    const n = { id, g, esf, anillo, sp, tallo, base, hoy, prop, rH, rP, d, r: 0, p: hoy.clone() }; ESQ.nodos.push(n); return n; };
  const C = nodo('C', 'corabastos', CC.cora, new THREE.Vector3(0, Y.c, 0), pol(210, R * 0.72, Y.ani), 230, 120);
  const PER = [['plaza', CC.plaza], ['colegio', CC.cole], ['casa', '#d9c06a'], ['colegio', CC.cole], ['plaza', CC.plaza], ['colegio', CC.cole], ['casa', '#d9c06a'], ['plaza', CC.plaza]]
    .map(([ic, col], i) => { const v = pol(i * 45 + 22.5, R, Y.per); return nodo('p' + i, ic, col, v, v, 95, 95, 0.1 + i * 0.06); });
  const PROD = ENTR.slice(0, 3).map((e, i) => { const v = new THREE.Vector3(e[0] - KEN_C[0], Y.prod, e[1] - KEN_C[1]); const n = nodo('q' + i, 'camion', CC.prod, v, v, 0, 95, i * 0.1); n.rD = 95; return n; });
  const ANI = [[30, 'cluster', CC.bav, 'B'], [90, 'mercado', CC.merc, 'M1'], [150, 'mercado', CC.merc, 'M2'], [270, 'mercado', CC.merc, 'M3'], [330, 'mercado', CC.merc, 'M4']]
    .map(([a, ic, col, id], i) => nodo(id, ic, col, new THREE.Vector3(0, Y.c, 0), pol(a, R * 0.72, Y.ani + (id === 'B' ? 80 : 0)), 0, id === 'B' ? 160 : 120, 0.5 + i * 0.18));
  // aristas: cilindros que se estiran entre dos nodos; set = en qué estados se ven
  const arista = (a, b, col, grosor, sets, d = 0) => { const m = new THREE.Mesh(geoC, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, depthTest: false })); m.renderOrder = 10; X.g.add(m);
    const pul = []; for (let j = 0; j < 2; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGlow, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false })); s.renderOrder = 14; X.g.add(s); pul.push(s); }
    ESQ.aristas.push({ a, b, m, pul, grosor, sets: new Set(sets), d, al: 0, ph: Math.random() }); };
  PER.forEach((p, i) => arista(C, p, '#e0623f', 16, ['hoy', 'prod'], i * 0.08));
  PROD.forEach((q, i) => arista(q, C, CC.prod, 20, ['prod'], 0.2 + i * 0.12));
  const anillo = [ANI[0], ANI[1], ANI[2], C, ANI[3], ANI[4]]; // en orden angular: 30, 90, 150, 210, 270, 330
  anillo.forEach((n, i) => arista(n, anillo[(i + 1) % 6], CC.merc, 18, ['prop'], 1.3 + i * 0.1));
  [[0, 3], [1, 4], [2, 5]].forEach(([a, b], i) => arista(anillo[a], anillo[b], CC.merc, 10, ['prop'], 1.9 + i * 0.1));
  PER.forEach((p, i) => { const h = anillo.reduce((b, n) => n.prop.distanceTo(p.prop) < b.prop.distanceTo(p.prop) ? n : b, anillo[0]); arista(h, p, '#9fe3c3', 9, ['prop'], 2.3 + i * 0.06); });
  PROD.forEach((q, i) => [...anillo].sort((a, b) => a.prop.distanceTo(q.prop) - b.prop.distanceTo(q.prop)).slice(0, 2).forEach((h, j) => arista(q, h, CC.prod, 11, ['prop'], 2.6 + i * 0.1 + j * 0.05)));
  // etiquetas (pocas y grandes)
  addEt(etI('corabastos', CC.cora, '<b>Corabastos</b> · todo llega aquí'), C.sp, ['esqHoy'], 'fuerte', null, 170);
  addEt(etI('corabastos', CC.cora, '<b>Corabastos</b> · un mercado más'), C.sp, ['esqProp'], 'fuerte', null, 170);
  addEt(etI('plaza', CC.plaza, 'Plazas de mercado'), PER[0].sp, ['esqHoy', 'esqProp'], '', null, 170); addEt(etI('colegio', CC.cole, 'Colegios'), PER[1].sp, ['esqHoy', 'esqProp'], '', null, 170); addEt(etI('casa', '#d9c06a', 'Tiendas de barrio'), PER[2].sp, ['esqHoy', 'esqProp'], '', null, 170);
  addEt(etI('camion', CC.prod, 'Productores de otros territorios'), PROD[0].sp, ['esqProd', 'esqProp'], '', null, 170);
  addEt(etI('cluster', CC.bav, '<b>Bavaria Común</b> · clúster'), ANI[0].sp, ['esqProp'], 'fuerte', null, 170); addEt(etI('mercado', CC.merc, '<b>Mercados barriales</b>'), ANI[2].sp, ['esqProp'], 'fuerte', null, 170);
  X.upd.push((t, dt, XX) => {
    const ts = t - ESQ.tCambio, prop = ESQ.estado === 'prop', f = Math.min(1, dt * 2.4);
    for (const n of ESQ.nodos) { const vis = prop ? n.rP : ESQ.estado === 'prod' ? (n.rD ?? n.rH) : n.rH; const listo = ts > (prop ? n.d : 0) ? 1 : 0; const rObj = vis * listo;
      n.r += (rObj - n.r) * f; const tgt = prop ? n.prop : n.hoy; if (ts > (prop ? 0.3 : 0)) n.p.lerp(tgt, f * 0.8);
      const s = Math.max(0.001, n.r) * (1 + 0.05 * Math.sin(t * 2 + n.d * 7)); n.g.position.copy(n.p); n.esf.scale.setScalar(s); n.anillo.scale.setScalar(s * 1.25); n.anillo.rotation.z = t * 0.6;
      n.sp.scale.setScalar(0.032 * Math.min(1, n.r / 60) * (MOVIL ? 0.85 : 1)); n.sp.position.y = 0; n.sp.visible = n.r > 8;
      n.tallo.position.set(n.p.x, n.p.y / 2, n.p.z); n.tallo.scale.set(Math.max(0.01, n.r * 0.06), n.p.y, Math.max(0.01, n.r * 0.06)); n.tallo.visible = n.r > 8;
      n.base.position.set(n.p.x, 3, n.p.z); n.base.scale.setScalar(Math.max(0.01, n.r * 1.4 * (1 + 0.25 * ((t * 0.6 + n.d) % 1)))); n.base.visible = n.r > 8; }
    for (const e of ESQ.aristas) { const on = e.sets.has(ESQ.estado) && ts > (prop ? e.d : e.d * 0.6) && e.a.r > 8 && e.b.r > 8; e.al += ((on ? 1 : 0) - e.al) * Math.min(1, dt * (on ? 2.2 : 5));
      const A = e.a.p, B = e.b.p; const L = A.distanceTo(B), Lg = Math.max(0.01, L * Math.min(1, e.al * 1.4)); tmp2.copy(B).sub(A).normalize(); e.m.position.copy(A).addScaledVector(tmp2, Lg / 2); e.m.scale.set(e.grosor, Lg, e.grosor);
      e.m.quaternion.setFromUnitVectors(EJE_Y, tmp2); e.m.material.opacity = 0.85 * e.al * XX.v; e.m.visible = e.al > 0.02;
      e.pul.forEach((s, j) => { const u = (t * 0.35 + e.ph + j * 0.5) % 1; s.position.copy(A).lerp(B, u); s.scale.setScalar(e.grosor * 9); s.material.opacity = e.al * XX.v * Math.sin(u * Math.PI); s.visible = e.al > 0.3; }); }
  }); }

/* ---------------- escenas ---------------- */
// cam: s = tamaño visible (m), az = rumbo de la cámara (grados), el = elevación, t = objetivo [X, Z]
const E = {
  portada: { cam: { s: 1600, az: -38, el: 28 }, ctx: 1, edif: 'hoy', muro: 1, arb: 1, giro: 1, red: 0 },
  kennedy: { lim: 1, cam: { s: 8000, az: -20, el: 50, t: 'ken' }, ctx: 1, edif: 'hoy', muro: 1, arb: 1, borde: 1, corr: 1, et: 'kennedy', ley: 'kennedy' },
  predio: { cam: { s: 1100, az: -32, el: 30 }, ctx: 1, edif: 'hoy', muro: 1, arb: 1, borde: 1, ley: 'hoy' },
  bosque: { cam: { s: 950, az: 18, el: 30 }, ctx: 0.6, edif: 'ghost', muro: 1, arb: 1, ley: 'bosque' },
  cerrado: { cam: { s: 1100, az: -60, el: 26 }, ctx: 1, edif: 'hoy', muro: 1, arb: 1, borde: 1, ley: 'cerrado' },
  sx_base: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.25, edif: 'ghost', muro: 1, red: 'gris', borde: 1, ley: 'sxgris' },
  sx_nain: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', muro: 1, red: 'a0', borde: 1, ley: 'nain', et: 'sx' },
  sx_r800: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', muro: 1, red: 'a1', borde: 1, ley: 'nain8', et: 'sx' },
  sx_nach: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', muro: 1, red: 'a2', borde: 1, ley: 'nach', et: 'sx' },
  sx_desp: { cam: { s: 1700, az: -24, el: 52 }, ctx: 0.25, edif: 'ghost', red: 'gris', pas: 1, borde: 1, ley: 'pasajes', et: 'puertas' },
  sx_desp_nain: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', red: 'b0', pas: 1, borde: 1, ley: 'nain' },
  sx_desp_nach: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', red: 'b2', pas: 1, borde: 1, ley: 'nach' },
  sx_delta: { lim: 1, cam: { s: 3200, az: -18, el: 55 }, ctx: 0.18, edif: 'ghost', red: 'd', pas: 1, borde: 1, ley: 'delta' },
  capas: { luz: 0.5, cam: { s: !SIN_G ? 1350 : 2300, az: -40, el: 30, y: !SIN_G ? 280 : 540 }, ctx: 0, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, expl: 1, flu: 1, et: 'capas', ley: 'capas' },
  capa_suelo: { cam: { s: 1000, az: -40, el: 36 }, ctx: 0.35, edif: 'ghost', arb: 'g', pas: 1, banc: 1, inv: 1, et: 'suelo', ley: 'suelo' },
  capa_inv: { cam: { s: 620, az: -70, el: 34, t: 'inv' }, ctx: 0.35, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, ley: 'inv' },
  capa_techos: { cam: { s: 1700, az: -35, el: 34 }, ctx: 1, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, techos: 1, ley: 'techos' },
  capa_prog: { cam: { s: 950, az: -32, el: 32 }, ctx: 0.35, edif: 'prog', arb: 'g', pas: 1, banc: 1, inv: 1, et: 'prog', ley: 'prog' },
  capa_bosque: { cam: { s: 1000, az: 25, el: 30 }, ctx: 0.35, edif: 'ghost', arb: 1, pas: 1, banc: 'g', inv: 1, ley: 'bosque' },
  capa_flujos: { cam: { s: 1200, az: -32, el: 36 }, ctx: 0.35, edif: 'prog', arb: 'g', pas: 1, banc: 1, inv: 1, flu: 1, et: 'flujos', ley: 'flujos' },
  plan: { cam: { s: 1300, az: -38, el: 30 }, ctx: 1, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, techos: 1, flu: 1, giro: 1, et: 'plan', ley: 'prog' },
  sectores: { cam: { s: 3000, az: -20, el: 55 }, ctx: 'sector', edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, et: 'sectores', ley: 'sectores' },
  corredor: { cam: { s: 5200, az: -30, el: 48, t: [-900, 150] }, ctx: 0.6, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, corr: 1, et: 'corredor', ley: 'corredor' },
  final: { cam: { s: 1400, az: -38, el: 28 }, ctx: 1, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, techos: 1, giro: 1, ley: 'prog', x: ['flores'] },
  // ---- escenas del guion
  abasto_hoy: { lim: 1, luz: 0.5, cam: { s: 10800, az: -12, el: 56, t: 'ken' }, ctx: 0, edif: 'ghost', x: ['abHoy', 'prod'], et: 'abHoy', ley: 'abHoy' },
  abasto_red: { lim: 1, luz: 0.5, cam: { s: 10800, az: -12, el: 56, t: 'ken' }, ctx: 0, edif: 'ghost', x: ['abRed', 'nodos', 'prod'], et: 'abRed', ley: 'abRed' },
  abasto_bav: { lim: 1, luz: 0.6, cam: { s: 5200, az: -28, el: 44, t: 'mid' }, ctx: 0, edif: 'prog', borde: 1, x: ['abRed', 'nodos'], et: 'abBav', ley: 'abRed' },
  dtc: { luz: 0.55, cam: { s: !SIN_G ? 1350 : 2300, az: -40, el: 30, y: !SIN_G ? 280 : 540 }, ctx: 0, edif: 'prog', arb: 1, pas: 1, banc: 1, inv: 1, expl: 1, flu: 1, et: 'capas', ley: 'capas' },
  cluster: { cam: { s: 900, az: -32, el: 34 }, ctx: 0.35, edif: 'prog', arb: 'g', pas: 1, banc: 1, inv: 1, et: 'cluster', ley: 'cluster', hl: { 5: COL.lila, 3: COL.ocre, 11: '#d98f5a', 4: COL.rojo } },
  nb_b: { cam: { s: 820, az: -62, el: 38, t: 'inv' }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, flu: 1, et: 'nb_b', ley: 'nb_b', hl: { 23: '#d9c7ef', 0: COL.verde, 2: COL.verde } },
  nb_i: { luz: 0.6, cam: { s: 5600, az: -20, el: 50, t: 'mid' }, ctx: 0, edif: 'prog', borde: 1, x: ['info', 'nodos'], et: 'info', ley: 'info', hl: { 3: COL.azul } },
  nb_c: { luz: 0.75, cam: { s: 1900, az: -30, el: 44 }, ctx: 1, edif: 'prog', techos: 1, x: ['cogno'], et: 'nb_c', ley: 'nb_c', hl: { 4: COL.lila, 3: COL.ocre } },
  nb_n: { cam: { s: 480, az: -20, el: 34, t: 'lab' }, ctx: 0.3, edif: 'prog', arb: 'g', banc: 'g', inv: 1, et: 'nb_n', ley: 'nb_n', hl: { 5: COL.lila } },
  form: { cam: { s: 820, az: -40, el: 40 }, ctx: 0.3, edif: 'prog', arb: 'g', pas: 1, banc: 1, inv: 1, et: 'form', ley: 'form', hl: { 2: COL.verde, 4: COL.ocre } },
  viv: { luz: 0.8, cam: { s: 2000, az: -35, el: 40 }, ctx: 1, edif: 'prog', banc: 1, inv: 1, techos: 1, x: ['viv'], et: 'viv', ley: 'viv', hl: { 2: COL.verde, 11: '#d98f5a' } },
  exc: { luz: 0.6, cam: { s: 4000, az: -25, el: 48, t: 'midc' }, ctx: 0.6, edif: 'prog', techos: 1, x: ['exc', 'nodos'], et: 'exc', ley: 'exc', hl: { 3: COL.ocre } },
  bio: { luz: 0.65, cam: { s: 4300, az: -25, el: 48, t: 'bio' }, ctx: 0, edif: 'prog', x: ['parques', 'bioLinks'], et: 'bio', ley: 'bio' },
  parches: { luz: 0.8, cam: { s: 1700, az: 10, el: 40 }, ctx: 0.4, edif: 'prog', banc: 1, inv: 1, x: ['flores', 'bioLinks', 'parques'], et: 'parches', ley: 'parches' },
  ratas: { cam: { s: 420, az: -50, el: 38, t: 'comp' }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['ratas', 'rapaces', 'flores'], et: 'ratas', ley: 'ratas' },
  sx_merc: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', red: 'a1', borde: 1, ley: 'nain8m', x: ['nodos'], et: 'sxm' },
  sx_rec: { lim: 1, cam: { s: 8200, az: -10, el: 62, t: 'ken' }, ctx: 0.18, edif: 'ghost', red: 'a2', borde: 1, ley: 'nachm', x: ['nodos'], et: 'sxm' },
  sx_pas: { cam: { s: 1500, az: -24, el: 50 }, ctx: 0.25, edif: 'prog', red: 'gris', pas: 1, borde: 1, ley: 'pasajes', et: 'puertas' },
  gob_bosque: { cam: { s: 1150, az: 20, el: 36 }, ctx: 0.3, edif: 'prog', pas: 1, borde: 1, x: ['bosqueZona'], et: 'gobB', ley: 'gobB' },
  colectivo: { cam: { s: 950, az: 30, el: 32, t: 'bosq' }, ctx: 0.3, edif: 'ghost', pas: 1, x: ['bosqueZona'], et: 'colectivo', ley: 'gobB' },
  federacion: { luz: 0.6, cam: { s: 1050, az: -35, el: 22, y: 170 }, ctx: 0.3, edif: 'prog', pas: 1, banc: 1, inv: 1, x: ['fed'], et: 'fed', ley: 'fed' },
  voceria: { luz: 0.55, cam: { s: 820, az: -55, el: 20, y: 220 }, ctx: 0.3, edif: 'prog', pas: 1, banc: 1, inv: 1, x: ['fed'], et: 'voz', ley: 'voz', voz: 1 },
};
const ZI2c = centroEdif(2);
Object.assign(E, {
  g01: { luz: 0.5, cam: { s: 1900, az: -20, el: 12, t: 'mid', y: 640 }, ctx: 0, edif: 'ghost', x: ['problemas'], et: 'problemas', ley: 'prob' },
  g02: { maqueta: 1, lim: 1, luz: 0.6, cam: { s: 5200, az: -18, el: 32, t: 'ken', y: 480 }, ctx: 0, edif: 'ghost', x: ['esquema'], esq: 'hoy', et: ['esqHoy'], ley: 'redHoy' },
  g03: { maqueta: 1, lim: 1, luz: 0.55, cam: { s: 6800, az: -30, el: 32, t: 'ken', y: 420 }, ctx: 0, edif: 'ghost', x: ['esquema'], esq: 'prod', et: ['esqHoy', 'esqProd'], ley: 'llegan' },
  g04: { maqueta: 1, lim: 1, luz: 0.6, cam: { s: 5400, az: -18, el: 34, t: 'ken', y: 480 }, ctx: 0, edif: 'ghost', x: ['esquema'], esq: 'prop', et: ['esqProp', 'esqProd'], ley: 'redProp' },
  g05: { luz: 0.85, cam: { s: 1350, az: -35, el: 22 }, ctx: 0, edif: 'ghost', borde: 1, x: ['avs'], et: 'avs', ley: 'avs' },
  g06: { luz: 0.8, cam: { s: 1000, az: -35, el: 36, y: 20 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['cluster'], et: 'cluster', ley: 'cluster2' },
  g07: { luz: 0.7, cam: { s: 1000, az: -30, el: 18, y: 150 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['actores'], et: 'actores', ley: 'cluster', hl: { 5: COL.lila, 3: COL.ocre, 11: '#d98f5a', 4: COL.rojo } },
  g08: { luz: 0.7, cam: { s: 620, az: -50, el: 16, t: 'nb', y: 260 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['nbic'], et: 'nbic', ley: 'nbic', giro: 1 },
  g09: { luz: 0.8, cam: { s: 950, az: -62, el: 24, t: 'nb', y: 130 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, flu: 1, x: ['nbic', 'nbB'], nf: { nbic: 'B' }, et: ['nbic', 'nb_b'], ley: 'nb_b', hl: { 23: '#d9c7ef', 0: COL.verde, 2: COL.verde } },
  g10: { maqueta: 1, luz: 0.55, cam: { s: 4600, az: -20, el: 20, t: 'mid', y: 300 }, ctx: 0, edif: 'prog', x: ['nbic', 'nbI', 'hubIco'], xt: { nbic: { s: 4, y: 900 } }, nf: { nbic: 'I' }, et: ['nbic', 'info', 'abBav'], ley: 'info', hl: { 3: COL.azul } },
  g11: { luz: 0.75, cam: { s: 2000, az: -30, el: 22, y: 160 }, ctx: 1, edif: 'prog', techos: 1, x: ['nbic', 'nbC', 'cogno'], xt: { nbic: { s: 1.8, y: 480 } }, nf: { nbic: 'C' }, et: ['nbic', 'nb_c'], ley: 'nb_c', hl: { 4: COL.lila, 3: COL.ocre } },
  g12: { luz: 0.75, cam: { s: 650, az: -15, el: 18, t: 'nb', y: 190 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['nbic', 'nbN'], nf: { nbic: 'N' }, et: ['nbic', 'nb_n'], ley: 'nb_n', hl: { 5: COL.lila } },
  g13: { luz: 0.8, cam: { s: 2000, az: -35, el: 24, y: 70 }, ctx: 1, edif: 'prog', banc: 1, inv: 1, techos: 1, x: ['viv'], et: 'viv', ley: 'viv', hl: { 2: COL.verde, 11: '#d98f5a' } },
  g14: { luz: 0.85, cam: { s: 950, az: -20, el: 22, t: 'casaMid', y: 30 }, ctx: 1, edif: 'prog', banc: 1, inv: 1, techos: 1, x: ['ciclos'], et: 'ciclos', ley: 'form', hl: { 2: COL.verde, 11: '#d98f5a' } },
  g15: { luz: 0.9, cam: { s: 420, az: -30, el: 18, t: 'casa', y: 50 }, ctx: 1, edif: 'prog', techos: 1, x: ['incentivo'], et: 'incentivo', ley: 'viv' },
  g16: { maqueta: 1, luz: 0.6, cam: { s: 3600, az: -25, el: 26, t: 'midc', y: 90 }, ctx: 0.6, edif: 'prog', techos: 1, x: ['exc', 'hubIco'], et: ['exc', 'abBav'], ley: 'exc', hl: { 3: COL.ocre } },
  g17: { luz: 0.85, cam: { s: 950, az: -30, el: 30, y: 30 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['jbRef'], et: 'jbRef', ley: 'jb' },
  g18: { luz: 0.45, cam: { s: 950, az: 20, el: 10, t: 'bosq', y: 470 }, ctx: 0, edif: 'prog', x: ['bioRed'], et: 'bioRed', ley: 'bioRed', giro: 1 },
  g19: { luz: 0.85, cam: { s: 950, az: 10, el: 24, y: 20 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['flores', 'abejas', 'puentes'], et: ['parches', 'puentes'], ley: 'parches' },
  g20: { maqueta: 1, luz: 0.6, cam: { s: 3400, az: -20, el: 26, t: 'bio', y: 40 }, ctx: 0, edif: 'prog', x: ['islas', 'puentes'], et: ['islas', 'puentes'], ley: 'islas' },
  g21: { luz: 0.85, cam: { s: 380, az: -50, el: 20, t: 'comp', y: 45 }, ctx: 0.3, edif: 'prog', banc: 1, x: ['cadena', 'ratas', 'retiro'], nf: { cadena: ['res', 'alm', 'ret'] }, et: ['cadena', 'retiro'], ley: 'ratas' },
  g22: { luz: 0.85, cam: { s: 420, az: -15, el: 20, t: 'comp', y: 60 }, ctx: 0.3, edif: 'prog', banc: 1, x: ['cadena', 'rapaces', 'ratas'], nf: { cadena: ['rap', 'rat'] }, et: ['cadena'], ley: 'ratas' },
  g23: { maqueta: 1, lim: 1, luz: 0.4, cam: { s: 6000, az: -12, el: 26, t: 'ken', y: 100 }, ctx: 0, edif: 'ghost', red: 'a1', borde: 1, x: ['hubIco'], et: 'sxm', ley: 'nain8m' },
  g24: { maqueta: 1, lim: 1, luz: 0.4, cam: { s: 6000, az: 30, el: 26, t: 'ken', y: 100 }, ctx: 0, edif: 'ghost', red: 'a2', borde: 1, x: ['recorridos'], ley: 'nach' },
  g25: { luz: 0.8, cam: { s: 1300, az: -24, el: 26 }, ctx: 0.3, edif: 'prog', x: ['pasos'], et: 'puertas', ley: 'pasajes' },
  g26: { luz: 0.8, cam: { s: 1250, az: 15, el: 28 }, ctx: 0.3, edif: 'prog', x: ['ocupado', 'bosqueZona'], et: 'ocupado', ley: 'ocupado' },
  g27: { luz: 0.8, cam: { s: 1000, az: 25, el: 24, t: 'bosq', y: 30 }, ctx: 0.3, edif: 'prog', x: ['limite', 'bosqueZona'], et: 'limite', ley: 'gobB' },
  g28: { luz: 0.8, cam: { s: 1150, az: 30, el: 16, t: 'bosq', y: 140 }, ctx: 0.3, edif: 'ghost', x: ['colectivo', 'bosqueZona'], et: 'colectivo', ley: 'colectivo' },
  g29: { luz: 0.6, cam: { s: 1050, az: -35, el: 16, y: 200 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['fed'], et: 'fed', ley: 'fed' },
  g30: { luz: 0.6, cam: { s: 1150, az: -10, el: 20, y: 160 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['fed'], et: 'fed', ley: 'fed' },
  g31: { luz: 0.55, cam: { s: 780, az: -55, el: 16, y: 230 }, ctx: 0.3, edif: 'prog', banc: 1, inv: 1, x: ['fed'], et: 'voz', ley: 'voz', voz: 1 },
});
const TGT = { nb: ZNB, casa: TCASA.p, casaMid: [(ZI2c[0] + TCASA.p[0]) / 2, (ZI2c[1] + TCASA.p[1]) / 2], jbMid: [JB[0] * 0.5, JB[1] * 0.5], mid: [KEN_C[0] * 0.45, KEN_C[1] * 0.45], midc: [MERC[1].p[0] * 0.5, MERC[1].p[1] * 0.5], lab: centroEdif(5), comp: ZC, bosq: ZB,
  bio: (() => { const h = HUM.filter(q => !q.cora); return [h.reduce((t, q) => t + q.v.x, 0) / (h.length + 1), h.reduce((t, q) => t + q.v.z, 0) / (h.length + 1)]; })() };
const KT = 'ken';
const invT = (() => { const a = centroEdif(2), b = centroEdif(0); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; })();

/* ---------------- leyendas ---------------- */
const rampaCSS = `linear-gradient(90deg,${RAMPA.join(',')})`;
const LEY = {
  kennedy: '<div class="t">Kennedy</div><div class="f"><i style="background:#e3a64a"></i>Predio de la antigua fábrica</div><div class="f"><i style="background:#5fb3d9"></i>Humedales cercanos</div><div class="f"><i style="background:#e0664f"></i>Corabastos</div>',
  hoy: '<div class="t">El predio hoy</div><div class="f"><i style="background:#e3a64a"></i>Límite del predio</div><div class="f">Malla fotorrealista de Google: naves, silos, bosque y muro tal como están</div>',
  bosque: `<div class="t">Arbolado</div><div class="f"><i style="background:#4f7a46"></i>${V.arboles} copas detectadas (Esri, z19)</div><div class="f"><i style="background:#2f5a2a"></i>${fmt(S.bosque_ha, 1)} ha de bosque denso</div>`,
  cerrado: '<div class="t">Acceso</div><div class="f"><i style="background:#8c7d6c"></i>Muro: el predio no se puede cruzar</div>',
  sxgris: `<div class="t">Red analizada</div><div class="f"><i style="background:#56636e"></i>${fmt(SEG.filter(s => s.a).length)} tramos OSM de toda Kennedy (+500 m)</div><div class="f"><i style="background:#e3a64a"></i>Límite de la localidad</div>`,
  nain: `<div class="t">Integración angular (NAIN)</div><div class="rampa" style="background:${rampaCSS}"></div><div class="ext"><span>segregado</span><span>integrado</span></div>`,
  nain8: `<div class="t">Integración R800 (NAIN)</div><div class="rampa" style="background:${rampaCSS}"></div><div class="ext"><span>segregado</span><span>integrado</span></div>`,
  nach: `<div class="t">Elección angular (NACH)</div><div class="rampa" style="background:${rampaCSS}"></div><div class="ext"><span>poco paso</span><span>mucho paso</span></div>`,
  delta: `<div class="t">Cambio de integración R800</div><div class="rampa" style="background:linear-gradient(90deg,#5fb3d9,#2b4a66,#2e3842,#6a5228,#ffb340)"></div><div class="ext"><span>−${fmt(SX.dmax * 100, 1)} %</span><span>sin cambio</span><span>+${fmt(SX.dmax * 100, 1)} %</span></div>`,
  pasajes: `<div class="t">Pasajes nuevos</div><div class="f"><i style="background:#f2efe6"></i>${V.pasajes_km} km peatonales y en bici</div><div class="f"><i style="background:#e3a64a"></i>${V.entradas} puertas en cruces existentes</div>`,
  capas: !SIN_G ? '<div class="t">Axonometría explotada</div><div class="f">01 territorio real · 02 suelo productivo · 03 pasajes · 04 edificios · 05 flujos</div>' : '<div class="t">Axonometría explotada</div><div class="f">01 suelo · 02 pasajes · 03 edificios · 04 bosque · 05 flujos</div>',
  suelo: `<div class="t">Suelo productivo</div><div class="f"><i style="background:#6e5b40"></i>${V.bloques} manzanas de huerta de 30 × 26 m</div><div class="f"><i style="background:#8fc46a"></i>${V.bancales} bancales de 1,2 × 10 m</div><div class="f"><i style="background:#6b4f33"></i>Compostaje (antiguo parqueadero)</div><div class="f"><i style="background:#3a4a58"></i>Patio de carga</div>`,
  inv: '<div class="t">Invernaderos</div><div class="f"><i style="background:#d8efe9"></i>Cubierta liviana sobre la retícula</div><div class="f"><i style="background:#c86a4a"></i>Camas de tomate y pimentón</div><div class="f"><i style="background:#8fc46a"></i>Vivero de nativas</div>',
  techos: `<div class="t">Red de huertas</div><div class="f"><i style="background:#8fc46a"></i>${V.techos_n} cubiertas productivas</div><div class="f"><i style="background:#7fb85a"></i>Bancales del predio</div>`,
  prog: '<div class="t">Programa</div>' + [...new Map(Object.values(PROG).map(p => [p.n, p.c]))].map(([n, c]) => `<div class="f"><i style="background:${c}"></i>${n}</div>`).join(''),
  flujos: '<div class="t">Flujos</div><div class="f"><i style="background:#b98a57"></i>Residuos orgánicos al compostaje</div><div class="f"><i style="background:#8fc46a"></i>Cosecha al mercado</div><div class="f"><i style="background:#e3a64a"></i>Del mercado a las puertas</div>',
  sectores: '<div class="t">Federación</div>' + COL_SECT.map((c, k) => `<div class="f"><i style="background:${c}"></i>Sector ${k + 1} · puertas ${ENT.map((_, i) => i).filter(i => sectorDeEnt[i] === k).map(i => 'P' + (i + 1)).join(', ')}</div>`).join(''),
  corredor: '<div class="t">Conexiones</div><div class="f"><i style="background:#5fb3d9"></i>Corredor hacia los humedales</div><div class="f"><i style="background:#e0664f"></i>Corabastos (residuos y trabajo)</div>',
};
const f_ = (c, n) => `<div class="f"><i style="background:${c}"></i>${n}</div>`;
Object.assign(LEY, {
  abHoy: '<div class="t">Hoy</div>' + f_(COL.crema, 'Productores de otros territorios') + f_(COL.rojo, 'Corabastos: un solo punto de llegada') + f_(COL.gris, 'Reparto a los barrios'),
  abRed: '<div class="t">Red de abastecimiento</div>' + f_(COL.verde, `${MERC.length} mercados barriales (en parques)`) + f_('#9bd3b8', `${PLZ.length} plazas y puntos existentes`) + f_(COL.rojo, 'Corabastos, uno más de la red') + f_(COL.ocre, 'Bavaria Común'),
  cluster: '<div class="t">Clúster de conocimiento</div>' + f_(COL.lila, 'Universidades') + f_(COL.ocre, 'Comerciantes') + f_('#d98f5a', 'Promotores barriales') + f_(COL.rojo, 'Organizaciones barriales'),
  nb_b: '<div class="t">B · Biotecnología</div>' + f_(COL.verde, 'Producción hidropónica') + f_('#6b4f33', 'Compostaje') + f_('#d9c7ef', 'Cultivo experimental de hongos'),
  info: '<div class="t">I · Información</div>' + f_(COL.azul, 'Pedidos') + f_(COL.crema, 'Entregas y excedentes') + f_(COL.verde, 'Mercados barriales'),
  nb_c: '<div class="t">C · Ciencias cognitivas</div>' + f_(COL.lila, 'Herramientas para decidir') + f_('#8fc46a', 'Familias (huertas en vivienda)') + f_(COL.ocre, 'Comerciantes'),
  nb_n: '<div class="t">N · Nanotecnología</div>' + f_(COL.lila, 'Investigación sobre empaques'),
  form: '<div class="t">Formación en Bavaria</div>' + f_(COL.verde, 'Módulos demostrativos') + f_(COL.ocre, 'Talleres'),
  viv: '<div class="t">Producción en las viviendas</div>' + f_(COL.ocre, 'Acompañamiento de promotores') + f_('#8fc46a', `${V.techos_n} cubiertas con huerta`),
  exc: '<div class="t">Excedentes</div>' + f_(COL.verde, 'De las viviendas al mercado barrial más cercano'),
  bio: '<div class="t">Red biótica</div>' + f_(COL.verde, 'Parches de árboles y parques') + f_('#5fb3d9', 'Humedales') + f_('#f2c230', 'Polinizadores y aves en movimiento'),
  parches: '<div class="t">Parches conectados</div>' + f_('#d0517a', 'Plantas en flor junto a las huertas') + f_(COL.verde, 'Vínculos entre parches'),
  ratas: '<div class="t">Control de ratas</div>' + f_('#5b6b62', 'Almacenamiento cerrado') + f_(COL.crema, 'Aves rapaces'),
  nain8m: `<div class="t">Integración R800 + mercados</div><div class="rampa" style="background:${rampaCSS}"></div><div class="ext"><span>segregado</span><span>integrado</span></div>` + f_(COL.verde, 'Mercados barriales'),
  nachm: `<div class="t">Elección + mercados</div><div class="rampa" style="background:${rampaCSS}"></div><div class="ext"><span>pocos recorridos</span><span>muchos</span></div>` + f_(COL.verde, 'Mercados barriales'),
  gobB: '<div class="t">El bosque</div>' + f_(COL.verde, 'Copas del bosque denso') + f_('#f2efe6', 'Pasajes propuestos'),
  fed: '<div class="t">Federación de asambleas</div>' + f_(COL.verde, 'Salvemos el Bosque de Bavaria') + f_(COL.ocre, 'Organizaciones barriales') + f_(COL.azul, 'Comerciantes') + f_(COL.crema, 'Decisiones comunes'),
  voz: '<div class="t">Vocería rotativa</div>' + f_(COL.crema, 'Quien lleva los acuerdos cambia cada cierto tiempo'),
  prob: '<div class="t">Red de problemas de Kennedy</div>' + Object.entries(PROB).map(([id, [n, c]]) => f_(c, `${n} · ${gradoP[id]} conexiones`)).join(''),
  prob2: '<div class="t">De la red a la propuesta</div>' + f_(PROB.F[1], 'Centralización de servicios') + f_(PROB.A[1], 'Dependencia de alimentos externos') + f_('#ffffff', 'Abastecimiento de alimentos'),
  avs: '<div class="t">El predio</div>' + f_(COL.ocre, `Antigua cervecería · ${V.area_ha} ha`) + f_('#F2EFE8', 'Av. Boyacá y Av. de las Américas'),
  nbic: '<div class="t">Enfoque NBIC</div>' + Object.entries(NB).map(([id, [n, c]]) => f_(c, `${id} · ${n}`)).join(''),
  form: '<div class="t">Formación</div>' + f_(COL.verde, 'Módulos demostrativos') + f_(COL.ocre, 'Promotores barriales, primeros ciclos'),
  jb: '<div class="t">Referente local</div>' + f_(COL.verde, 'Jardín Botánico de Bogotá') + f_(COL.ocre, 'Bavaria Común'),
  bioRed: LEY_BIO,
  islas: '<div class="t">De islas a red</div>' + f_(COL.verde, 'Parches de árboles y parques') + f_('#ffffff', 'Aves que se desplazan') + f_('#f2c230', 'Polinizadores'),
  ocupado: '<div class="t">Dónde se interviene</div>' + f_(COL.ocre, 'Huellas ya ocupadas') + f_(COL.verde, 'Bosque sin intervenir'),
  colectivo: '<div class="t">Salvemos el Bosque de Bavaria</div>' + f_(COL.verde, 'Colectivo ciudadano'),
});
Object.assign(LEY, {
  redHoy: '<div class="t">Cómo se reparten los alimentos</div>' + comparar('hoy') + `<div class="f">${etI('corabastos', CC.cora, 'Corabastos: todo pasa por aquí')}</div><div class="f">${etI('plaza', CC.plaza, `Plazas de mercado y tiendas`)}</div><div class="f">${etI('colegio', CC.cole, `Colegios`)}</div>`,
  llegan: '<div class="t">Llegan de otros territorios</div>' + `<div class="f">${etI('camion', CC.prod, 'Camiones de productores')}</div><div class="f">${etI('corabastos', CC.cora, 'Hoy descargan en Corabastos')}</div>`,
  redProp: '<div class="t">Cómo se reparten los alimentos</div>' + comparar('prop') + `<div class="f">${etI('mercado', CC.merc, `Mercados barriales nuevos`)}</div><div class="f">${etI('plaza', CC.plaza, 'Plazas y fruvers existentes')}</div><div class="f">${etI('corabastos', CC.cora, 'Corabastos: un nodo más')}</div><div class="f">${etI('cluster', CC.bav, 'Bavaria Común: clúster')}</div><div class="f">${etI('colegio', CC.cole, 'Colegios: del nodo más cercano')}</div>`,
  cluster2: '<div class="t">Bavaria Común · clúster</div>' + CLU.map(([, ic, n, c]) => `<div class="f">${etI(ic, c, n)}</div>`).join(''),
});
LEY.nach = LEY.nach.replace('poco paso', 'pocos recorridos').replace('mucho paso', 'muchos recorridos') + f_('#ffffff', 'Recorridos potenciales');
if (MOVIL) for (const k of ['prog', 'sectores']) LEY[k] = LEY[k].replace(/<div class="f">.*$/s, '<div class="f">Ver etiquetas en el modelo</div>');

/* ---------------- estado animado ---------------- */
const est = { lim: 0, ctx: 1, edif: 1, prog: 0, muro: 1, arb: 1, red: 0, pas: 0, banc: 0, inv: 0, techos: 0, flu: 0, expl: 0, corr: 0, borde: 0, maq: 0 };
const obj = { ...est };
let escena = 'portada', camObj = null, giroAz = 0, HL = null, tEsc = 0; const tmp2 = new THREE.Vector3();
const GRIS_HL = new THREE.Color('#30363d');
const camAct = { s: 2300, az: -38, el: 34, x: 0, z: 0, y: 0 };
const setEscena = (k) => {
  const e = E[k]; if (!e) return; escena = k;
  if (e.esq) { if (e.esq !== ESQ.estado || !XG.esquema.o) ESQ.tCambio = reloj.elapsedTime; ESQ.estado = e.esq; }
  obj.ctx = typeof e.ctx === 'number' ? e.ctx : 1; pintarCtx(e.ctx === 'sector' ? 'sector' : 'gris');
  obj.edif = e.edif === 'ghost' ? 0.25 : 1; obj.prog = e.edif === 'prog' ? 1 : 0; obj.muro = e.muro ? 1 : 0;
  obj.arb = e.arb === 1 ? 1 : e.arb === 'g' ? 0.3 : 0; obj.red = e.red ? 1 : 0; obj.pas = e.pas ? 1 : 0;
  obj.banc = e.banc === 1 ? 1 : e.banc === 'g' ? 0.35 : 0; obj.inv = e.inv ? 1 : 0; obj.techos = e.techos ? 1 : 0; obj.flu = e.flu ? 1 : 0; obj.expl = e.expl ? 1 : 0; obj.corr = e.corr ? 1 : 0; obj.borde = e.borde ? 1 : 0; obj.maq = e.maqueta ? 1 : 0;
  if (REAL()) { // la foto ya muestra la fábrica, el bosque, el muro y los barrios: de lo propio queda solo lo nuevo
    obj.ctx = e.ctx === 'sector' ? 0.6 : 0; obj.edif = e.edif === 'prog' ? 1 : 0; obj.prog = 1; obj.muro = 0; obj.arb = 0; // los árboles son los de la foto
    G.luzObj = e.maqueta ? 0 : e.luz ?? (e.red ? 0.38 : e.ctx === 'sector' ? 0.75 : 1);
  }
  if (e.red) pintarRed(e.red); else pintarRed(e.pas ? 'gris' : modoRed);
  for (const k in XG) { const X = XG[k], on = (e.x || []).includes(k) || (k === 'verdeK' && !!e.maqueta); const tr = reloj.elapsedTime; const ret = (e.xIn && e.xIn[k]) || 0; if (on && (!X.o || ret)) X.t0 = tr + ret; X.o = on ? 1 : 0; X.offAt = on && e.xOut && e.xOut[k] ? tr + e.xOut[k] : 0; const xt = e.xt && e.xt[k]; X.tgt = xt || null; const fc = e.nf && e.nf[k]; X.foc = fc ? new Set([].concat(fc)) : null; }
  tEsc = reloj.elapsedTime;
  HL = e.hl ? new Map(Object.entries(e.hl)) : null;
  const t = e.cam.t === 'inv' ? invT : e.cam.t === 'ken' ? KEN_C : TGT[e.cam.t] || (Array.isArray(e.cam.t) ? e.cam.t : [0, 0]); obj.lim = e.lim ? 1 : 0;
  camObj = { s: e.cam.s * (MOVIL ? 1.15 : 1), az: e.cam.az, el: e.cam.el, x: t[0], z: t[1], y: e.cam.y || 0 };
  giroAz = 0;
  $('#leyenda').innerHTML = LEY[e.ley] || '';
};
const lerp = (a, b, f) => a + (b - a) * f;

/* ---------------- cámara ---------------- */
const controles = new OrbitControls(cam, renderer.domElement); controles.enabled = false; controles.enableDamping = true; controles.zoomToCursor = true;
let explorar = false, giro = !QUIETO;
const distCam = (s) => { const asp = innerWidth / innerHeight; const vh = asp >= 1 ? s : s / Math.max(asp, 0.82); return vh / 2 / Math.tan(FOV / 2 * Math.PI / 180); };
const ajustarCam = () => {
  const w = innerWidth, h = innerHeight;
  // dónde cae el objetivo en pantalla: a la derecha en escritorio (hay texto a la izquierda), arriba en celular
  const fx = explorar ? 0.5 : MOVIL ? 0.5 : (w > 1000 ? 0.62 : 0.56), fy = explorar ? 0.5 : MOVIL ? 0.34 : 0.5;
  cam.aspect = w / h; cam.setViewOffset(w, h, w / 2 - fx * w, h / 2 - fy * h, w, h);
  const R = cam.position.distanceTo(controles.target); cam.near = Math.max(5, R * 0.08); cam.far = R * 4 + 4000; cam.updateProjectionMatrix(); scene.fog.near = R * 1.15; scene.fog.far = R * 3.2;
};
const ponerCam = () => {
  const az = (camAct.az + giroAz) * Math.PI / 180, el = camAct.el * Math.PI / 180, R = distCam(camAct.s);
  const t = new THREE.Vector3(camAct.x, camAct.y, camAct.z);
  cam.position.set(t.x + R * Math.cos(el) * Math.sin(az), t.y + R * Math.sin(el), t.z + R * Math.cos(el) * Math.cos(az)); cam.lookAt(t); controles.target.copy(t);
  ajustarCam();
};
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); bloom.resolution.set(innerWidth / 2, innerHeight / 2); lineMats.forEach(m => m.resolution.set(innerWidth, innerHeight)); if (!explorar) ajustarCam(); });

$('#b-giro').setAttribute('aria-pressed', String(giro));
$('#b-giro').onclick = (ev) => { giro = !giro; ev.currentTarget.setAttribute('aria-pressed', String(giro)); };
$('#b-explorar').onclick = (ev) => {
  explorar = !explorar; ev.currentTarget.setAttribute('aria-pressed', String(explorar)); document.body.classList.toggle('explorar', explorar);
  controles.enabled = explorar; ev.currentTarget.textContent = explorar ? 'Volver' : 'Explorar';
};

/* ---------------- bucle ---------------- */
const reloj = new THREE.Clock(); const tmp = new THREE.Vector3();
const opac = (mat, v) => { mat.opacity = v; mat.visible = v > 0.01; mat.depthWrite = v > 0.95; };
function cuadro() {
  const dt = Math.min(0.05, reloj.getDelta()), t = reloj.elapsedTime; const f = 1 - Math.pow(0.0025, dt);
  for (const k in est) est[k] = lerp(est[k], obj[k], f);
  if (!explorar && camObj) { for (const k of ['s', 'el', 'x', 'z', 'y']) camAct[k] = lerp(camAct[k], camObj[k], f); let d = camObj.az - camAct.az; camAct.az += d * f; if (giro && E[escena].giro) giroAz += dt * 2.2; else giroAz = lerp(giroAz, giro && !QUIETO ? Math.sin(t * 0.12) * 7 : 0, f * 0.3); if (giro && !QUIETO) camAct.el = lerp(camAct.el, camObj.el + Math.sin(t * 0.09) * 2.5, f * 0.2); ponerCam(); }
  if (explorar) controles.update();
  // opacidades
  opac(ctxMat, est.ctx * 0.95); ctxG.visible = est.ctx > 0.01 || est.techos > 0.01;
  opac(techosMat, est.techos);
  edifMeshes.forEach(m => { const h = HL && HL.get(String(m.userData.i)); m.material.color.set(m.userData.hoy).lerp(HL ? (h ? new THREE.Color(h) : GRIS_HL) : new THREE.Color(m.userData.prog), est.prog); opac(m.material, est.edif * (HL && !h ? 0.18 : 1)); });
  // capas del guion
  for (const k in XG) { const X = XG[k]; X.v = lerp(X.v, X.o, f); const on = X.v > 0.01; X.g.visible = on; if (!on) continue;
    X.fv = lerp(X.fv ?? 1, X.foc ? 0 : 1, f);
    for (const { m, base, tags } of X.mats) m.opacity = base * X.v * (X.foc && tags ? (tags.some(q => X.foc.has(q)) ? 1 : 0.12 + 0.88 * X.fv) : 1);
    if (X.tgt) { if (!X.base) X.base = { y: X.g.position.y, s: X.g.scale.x }; X.g.position.y = lerp(X.g.position.y, X.tgt.y ?? X.base.y, f); X.g.scale.setScalar(lerp(X.g.scale.x, X.tgt.s ?? X.base.s, f)); }
    if (X.rot) X.g.children.forEach(c => { if (c.userData.gira) c.rotation.y += dt * X.rot; });
    for (const c of X.cre) { const q = Math.max(0, Math.min(1, (t - X.t0 - c.d) / c.dur)), e2 = 1 - Math.pow(1 - q, 3); if (c.tipo === 'draw') c.o.geometry.setDrawRange(0, Math.max(0, Math.floor(c.n * e2 / 3) * 3)); else if (c.tipo === 'sy') c.o.scale.y = Math.max(0.001, e2); else c.o.scale.setScalar(Math.max(0.001, e2) * c.s0 * (c.lat ? 1 + 0.07 * Math.sin(t * 2.2 + c.d * 9) : 1)); }
    for (const w of X.ondas) { const u = (t * 0.45 + w.ph) % 1; w.m.scale.setScalar(w.R * (0.15 + 0.85 * u)); w.m.material.opacity *= (1 - u); }
    for (const fn of X.upd) fn(t, dt, X);
    const pulOn = t > X.t0 + 0.9; for (const P of X.pul) { P.g.visible = pulOn; if (!pulOn) continue; P.curvas.forEach((c, i) => { for (let j = 0; j < P.n; j++) { const u = (t * P.vel + j / P.n + P.fase[i]) % 1; c.getPoint(u, tmp); P.pos.set([tmp.x, tmp.y, tmp.z], (i * P.n + j) * 3); } }); P.g.attributes.position.needsUpdate = true; } }
  if (XG.rapaces && XG.rapaces.g.visible) rapaces.forEach((b, i) => { const a = t * 0.35 + i * 2.1, r = 70 + i * 22; b.position.set(ZC[0] + Math.cos(a) * r, 70 + i * 14 + Math.sin(t * 1.3 + i) * 4, ZC[1] + Math.sin(a) * r); b.rotation.set(0, -a, Math.sin(t * 6 + i) * 0.25); });
  if (XG.fed && XG.fed.g.visible) { const per = E[escena].voz ? 1.1 : 2.6; const ciclo = Math.floor(t / per); const o = FED.orgs[ciclo % 3]; FED.tok.position.copy(o.cur.getPoint((t % per) / per));
    FED.orgs.forEach((q, i) => { const lit = Math.floor(t / (per * 3)) % q.per.length; q.per.forEach((s, j) => { const on = j === lit; s.scale.setScalar(on ? 1.9 : 1); s.material.color.set(on ? COL.crema : q.c); }); }); }
  reticula.children.forEach(m => opac(m.material, REAL() ? est.inv * est.edif : est.edif));
  if (REAL()) { opac(loteMat, 0); lote.visible = false; piso.position.y = est.maq > 0.3 ? -0.5 : -120; if (G.tiles) G.tiles.group.visible = G.luz > 0.03; } else { lote.visible = true; piso.position.y = -0.3; }
  if (MAQ.mesh) { MAQ.u.uA.value = est.maq; MAQ.mesh.visible = est.maq > 0.01; MAQ.u.uRise.value = obj.maq ? Math.min(1, MAQ.u.uRise.value + dt * 0.7) : (est.maq < 0.05 ? 0.001 : MAQ.u.uRise.value); }
  actualizarG(dt); if (explorar) ajustarCam();
  cubiertas.children.forEach(m => { m.material.opacity = m.userData.base * est.inv; m.visible = est.inv > 0.02; });
  opac(muroMat, est.muro * est.edif);
  arbMats.forEach(m => opac(m, est.arb)); arboles.visible = est.arb > 0.02;
  red.material.opacity = est.red; red.visible = est.red > 0.02; pasajes.material.opacity = est.pas; pasajes.visible = est.pas > 0.02;
  opac(bancales.material, est.banc); bloquesMat.opacity = est.banc * 0.85; bloques.visible = est.banc > 0.02; bordesBloq.material.opacity = est.banc * 0.7; bordesBloq.visible = est.banc > 0.02; compost.children.forEach(m => opac(m.material, est.banc)); opac(patio.material, est.banc);
  bordeMat.opacity = 0.35 + 0.65 * est.borde * (0.6 + 0.4 * Math.sin(t * 2.5));
  loteMat.color.set('#1d2a22').lerp(new THREE.Color('#22301f'), est.banc);
  if (REAL()) { techosMat.depthTest = false; techos.renderOrder = 3; bancales.material.depthTest = false; bancales.renderOrder = 2; compost.children.forEach(m => { m.material.depthTest = false; m.renderOrder = 2; }); patio.material.depthTest = false; }
  flujoMat.opacity = est.flu; guiaFlujos.material.opacity = est.flu * 0.18;
  if (est.flu > 0.02) { rutas.forEach((r, i) => { for (let k = 0; k < NP; k++) { const u = ((t * (r.cora ? 0.05 : 0.11) + k / NP + i * 0.37) % 1); fpos.set([lerp(r.a[0], r.b[0], u), 5 + Math.sin(u * Math.PI) * 18, lerp(r.a[1], r.b[1], u)], (i * NP + k) * 3); } }); flujoGeo.attributes.position.needsUpdate = true; }
  limMat.opacity = est.lim * 0.9; limite.visible = est.lim > 0.02;
  corrMats.forEach(m => { m.opacity = est.corr * 0.75; m.visible = est.corr > 0.02; });
  guiasMat.opacity = est.expl * 0.5; guias.visible = est.expl > 0.02;
  for (const k in capas) capas[k].position.y = OFF[k] * est.expl;
  // etiquetas
  const w = innerWidth, h = innerHeight; const grupo = E[escena].et; const vis = [];
  for (const e of etq) {
    let on = grupo && (Array.isArray(grupo) ? grupo.some(g => e.grupos.has(g)) : e.grupos.has(grupo)); if (on) { const gx = [...e.grupos].map(g => XG[g]).find(Boolean); if (gx && (reloj.elapsedTime < gx.t0 + 0.7 || !gx.o)) on = false; }
    if (!on) { if (e.d.style.opacity !== '0') e.d.style.opacity = 0; continue; }
    if (e.obj) { e.obj.getWorldPosition(tmp); tmp.y += e.dy * (e.obj.parent ? e.obj.parent.getWorldScale(tmp2).x : 1); } else tmp.copy(e.pos); if (e.capa) tmp.y += capas[e.capa].position.y + (e.d.classList.contains('capa') ? 0 : 0);
    tmp.project(cam); let x = (tmp.x + 1) / 2 * w; const y = (1 - tmp.y) / 2 * h;
    if (e.d.classList.contains('capa')) x += MOVIL ? 90 : 230; e.sx = x; e.sy = y; e.vis = x > 0 && x < w && y > 0 && y < h; vis.push(e);
  }
  vis.sort((a, b) => a.sy - b.sy); const puestos = [];
  for (const e of vis) { const ww = e.d.offsetWidth || 120; let y = e.sy; for (const p of puestos) if (Math.abs(p.x - e.sx) < (p.w + ww) / 2 + 4 && Math.abs(p.y - y) < 21) y = p.y + 21; puestos.push({ x: e.sx, y, w: ww }); const cx = Math.max(ww / 2 + 6, Math.min(w - ww / 2 - 6, e.sx)); e.d.style.left = (e.d.classList.contains('capa') ? e.sx : cx) + 'px'; e.d.style.top = y + 'px'; e.d.style.opacity = e.vis ? 1 : 0; }
  // escenas que se transforman: un grupo se apaga a los N segundos (la red de hoy cede su lugar a la propuesta)
  for (const k in XG) { const X = XG[k]; if (X.offAt && t > X.offAt) { X.o = 0; X.offAt = 0; } }
  if (!window.__sin3d) composer.render();
  requestAnimationFrame(cuadro);
}

/* =============================== DIAPOSITIVAS (siguen el guion) =============================== */
// Una diapositiva por frase del guion; el texto es el del guion, sin cambios. b: bloque (lámina del guion) · e: escena 3D
const SL = [
  { b: 'Inicio', e: 'portada', g: 'Bavaria Común', ini: true },
  // la red de problemas (anasoficasca-code.github.io/red-de-problemas) entra después de Kennedy y luego explota en los datos
  { b: '07', e: 'portada', r: 1, l: 'Cada esfera es un problema; su tamaño, cuántas conexiones tiene. Las partículas son los puntos de la ciudad de Kennedy.', g: 'En Kennedy, seis problemas se alimentan entre sí.' },
  { b: '07', e: 'portada', r: 2, l: 'La red explota: cada burbuja es una causa, ubicada en su lugar de Kennedy y con el color del problema al que pertenece.', g: 'Al abrir la red aparecen los datos: las causas de cada problema sobre el territorio.' },
  { b: '08', e: 'g02', l: 'HOY · Los alimentos llegan a Corabastos y de ahí se reparten a plazas y colegios de toda Kennedy.', g: 'Por eso, la propuesta empieza por reorganizar el abastecimiento de alimentos en Kennedy.' },
  { b: '08', e: 'g03', l: 'Los productores de otros territorios siguen llegando, pero hoy todos descargan en un solo punto.', g: 'Los alimentos que solo pueden abastecerse desde fuera de la localidad seguirían llegando de otros territorios.' },
  { b: '08', e: 'g04', l: 'PROPUESTA · Los productores llegan a varios mercados barriales. Corabastos es un nodo más y cada colegio se abastece del mercado más cercano.', g: 'Lo que cambia es dónde se reciben y se distribuyen: los productores llegarían a distintos mercados barriales y puntos de abastecimiento, con Corabastos como uno de los mercados de la red.' },
  { b: '08', e: 'g05', l: 'El predio de la antigua cervecería, entre la Av. Boyacá y la Av. de las Américas.', g: 'Como parte de esta red, proponemos recuperar parte de la antigua cervecería, entre las avenidas Boyacá y Américas.' },
  { b: '08', e: 'g06', l: 'Bavaria Común es un clúster: varias naves con funciones distintas, conectadas entre sí y con los mercados barriales.', g: 'A esta intervención la llamamos Bavaria Común, un Distrito de Tecnologías Convergentes que funciona como clúster de conocimiento.' },
  { b: '08', e: 'g07', l: 'Cuatro grupos de actores usan las naves para experimentar, aprender y organizar iniciativas.', g: 'Allí, universidades, comerciantes, promotores y organizaciones barriales disponen de espacios para experimentar, aprender y organizar iniciativas propias.' },
  { b: '08', e: 'g08', l: 'Cuatro tecnologías que convergen en el programa: Nano, Bio, Info y Cogno.', g: 'El enfoque NBIC, de Roco y Bainbridge, orienta el programa.' },
  { b: '09', e: 'g09', l: 'B · En el predio: invernaderos hidropónicos, compostaje y laboratorio de hongos.', g: 'La biotecnología se aplica a la producción hidropónica, el compostaje y el cultivo experimental de hongos con materiales vegetales adecuados.' },
  { b: '09', e: 'g10', l: 'I · Cada mercado registra lo que pide, lo que recibe y lo que le sobra.', g: 'Las tecnologías de la información ayudan a registrar pedidos, entregas y excedentes.' },
  { b: '09', e: 'g11', l: 'C · Esa información llega a familias y comerciantes para decidir qué sembrar, comprar o vender.', g: 'Las ciencias cognitivas orientan el diseño de herramientas para que familias y comerciantes usen esa información al tomar decisiones.' },
  { b: '09', e: 'g12', l: 'N · El laboratorio universitario investiga empaques que conservan los alimentos.', g: 'La nanotecnología se plantea como una línea de investigación universitaria sobre materiales de empaque para conservar alimentos.' },
  { b: '09', e: 'g13', l: 'Se aprende en Bavaria y se cultiva en las cubiertas de las viviendas cercanas.', g: 'La formación se realiza en Bavaria y la producción se lleva a las viviendas.' },
  { b: '09', e: 'g14', l: 'Un promotor barrial acompaña a cada familia en sus primeros ciclos de cultivo.', g: 'Las familias practican en módulos demostrativos y reciben acompañamiento de promotores barriales durante los primeros ciclos.' },
  { b: '09', e: 'g15', l: 'Lo que gana la familia: hortalizas frescas, saber qué insumos usa y comprar menos.', g: 'El incentivo es cosechar hortalizas frescas, conocer los insumos utilizados y sustituir parte de las compras del hogar.' },
  { b: '09', e: 'g16', l: 'Lo que sobra en las viviendas se vende en el mercado barrial más cercano.', g: 'Cuando hay excedentes, su venta en los mercados barriales ofrece una posibilidad de ingreso complementario.' },
  { b: '09', e: 'g17', l: 'El Jardín Botánico ya forma y asesora huertas urbanas en Bogotá.', g: 'El Jardín Botánico de Bogotá es un referente local por su trabajo en formación y asistencia técnica para la producción urbana.' },
  { b: '10', e: 'g18', l: 'Especies y plantas de Kennedy unidas por quién come, poliniza o anida en quién.', g: 'La red de relaciones bióticas de Kennedy nos ayuda a definir qué vínculos queremos fortalecer.' },
  { b: '10', e: 'g19', l: 'Flores junto a las huertas atraen abejas y colibríes.', g: 'Alrededor de los espacios de producción incorporamos plantas en flor para atraer polinizadores y conectamos parches de árboles con la vegetación existente.' },
  { b: '10', e: 'g20', l: 'Los parches de árboles se unen y las aves pasan de uno a otro.', g: 'Así, los parches dejan de funcionar como islas aisladas y ofrecen alimento y refugio en distintos puntos, lo que facilita que las aves y los polinizadores se desplacen entre ellos.' },
  { b: '10', e: 'g21', l: 'Con residuos cerrados y recogidos a tiempo, las ratas no encuentran comida.', g: 'El control de ratas empieza con el almacenamiento cerrado y el retiro oportuno de residuos.' },
  { b: '10', e: 'g22', l: 'Las aves rapaces cazan ratas: un control natural.', g: 'Las aves rapaces pueden contribuir a ese control mediante la depredación.' },
  { b: '10', e: 'g23', l: 'Rojo = calles más accesibles. Los mercados se ubican sobre ellas.', g: 'Con la sintaxis espacial, usamos la integración para identificar tramos accesibles donde ubicar mercados' },
  { b: '10', e: 'g24', l: 'Rojo = calles por donde pasan más recorridos: ahí hay más compradores.', g: 'y la elección para reconocer por dónde pasan más recorridos potenciales.' },
  { b: '10', e: 'g25', l: 'Los pasajes nuevos unen las calles del barrio con las naves recuperadas.', g: 'En Bavaria, los nuevos pasajes conectan las naves recuperadas con las calles del entorno.' },
  { b: '10', e: 'g26', l: 'Solo se interviene donde ya hay construcción; el bosque no se toca.', g: 'Concentramos las intervenciones en áreas ya ocupadas.' },
  { b: '11', e: 'g27', l: 'La comunidad decide hasta dónde entran los pasajes cerca del bosque.', g: 'Definir hasta dónde llegan esos pasajes y qué actividades se ubican cerca del bosque también es una decisión de la comunidad.' },
  { b: '11', e: 'g28', l: 'El colectivo que defiende el bosque hace parte de las decisiones.', g: 'Por eso participa Salvemos el Bosque de Bavaria, un colectivo ciudadano que defiende la conservación del bosque de la antigua cervecería frente a la tala de árboles.' },
  { b: '11', e: 'g29', l: 'Tres organizaciones forman la federación.', g: 'El colectivo, las organizaciones barriales y los comerciantes participan en una federación de asambleas.' },
  { b: '11', e: 'g30', l: 'Cada organización envía a una persona con sus acuerdos; en la asamblea se decide en común.', g: 'Cada organización discute sus propuestas y una persona lleva sus acuerdos a la asamblea de la federación, donde se toman las decisiones comunes sobre el uso de los espacios, el cuidado del bosque y el abastecimiento de alimentos.' },
  { b: '11', e: 'g31', l: 'La persona que lleva la voz cambia cada cierto tiempo.', g: 'La vocería rota cada cierto tiempo, de modo que todas las personas de cada asamblea puedan representar a su organización en algún momento.' },
];
const BLOQ = [...new Set(SL.map(s => s.b))];
const TIT = { '07': 'La red de problemas de Kennedy', '08': 'Una red de abastecimiento con Bavaria como clúster', '09': 'Tecnologías convergentes y huertas en las viviendas', '10': 'Red biótica, sintaxis y pasajes', '11': 'Una federación de asambleas' };
// relato con scroll: portada, una apertura por lámina y un paso por frase del guion
{ const esc = (w) => w.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let h = `<section class="paso portada activo" data-i="0" data-escena="portada"><div class="tarjeta">
    <p class="kicker">Kennedy · Bogotá · Tesis de Arquitectura y Urbanismo</p>
    <h1>Bavaria <span>Común</span></h1>
    <p>Un Distrito de Tecnologías Convergentes en la antigua cervecería, dentro de una red de abastecimiento de alimentos para Kennedy.</p>
    <p class="autores">Ana Sofía Casas · Alejandra Gómez · Juan José Trujillo · 2026</p>
    <span class="bajar"><i></i>Desplázate</span></div></section>`;
  let prev = 'Inicio';
  SL.forEach((s, i) => { if (s.ini) return;
    if (s.b !== prev) { prev = s.b; h += `<section class="paso apertura" id="lamina-${s.b}" data-escena="${s.e}" data-red="${s.r || 0}"><div class="tarjeta"><span class="num" aria-hidden="true">${s.b}</span><p class="kicker">Lámina ${s.b}</p><h2>${TIT[s.b] || ''}</h2></div></section>`; }
    h += `<section class="paso" data-i="${i}" data-escena="${s.e}" data-red="${s.r || 0}"><div class="tarjeta vidrio"><p class="kicker">Lámina ${s.b} · ${String(i).padStart(2, '0')}</p><p class="frase" aria-label="${esc(s.g)}">${s.g.split(' ').map((w, k) => `<span class="w" aria-hidden="true" style="--i:${k}">${esc(w)}</span>`).join(' ')}</p>${s.l ? `<p class="lectura">${esc(s.l)}</p>` : ''}</div></section>`; });
  h += `<section class="paso fin" data-escena="g31"><div class="tarjeta vidrio"><p class="kicker">Bavaria Común</p><p class="frase">Para recorrer el modelo con el mouse o el dedo, usa «Explorar».</p></div></section>`;
  $('#relato').innerHTML = h; }
$('#bloques').innerHTML = BLOQ.filter(b => b !== 'Inicio').map(b => `<button type="button" data-b="${b}">Lámina ${b}</button>`).join('');
$('#bloques').onclick = (ev) => { const b = ev.target.closest('button'); if (b) document.getElementById('lamina-' + b.dataset.b).scrollIntoView({ behavior: 'smooth' }); };
const pasos = [...document.querySelectorAll('#relato .paso')];
let activo = null;
// red de problemas incrustada: 1 = la red, 2 = explota en la conectografía; mientras la tapa, el 3D de Bavaria no se dibuja
const REDP = 'https://anasoficasca-code.github.io/red-de-problemas/?incrustado=1&v=1';
const redF = $('#redp'); let redT = 0;
const cargarRed = () => { if (!redF.getAttribute('src')) redF.src = REDP; };
const redModo = (r) => {
  if (r) cargarRed();
  document.body.classList.toggle('red', r > 0); clearTimeout(redT);
  if (r) redT = setTimeout(() => { window.__sin3d = true; }, 1200); else window.__sin3d = false;
  try { redF.contentWindow && redF.contentWindow.postMessage(r === 2 ? 'red:explota' : 'red:volver', '*'); } catch (e) {}
};
let redR = 0; setInterval(() => { if (redR) redModo(redR); }, 1500); // por si el iframe aún cargaba cuando llegó el mensaje
const activar = (p) => { if (p === activo) return; if (activo) activo.classList.remove('activo'); activo = p; p.classList.add('activo'); setEscena(p.dataset.escena);
  const r = +(p.dataset.red || 0); if (r !== redR) { redR = r; redModo(r); }
  const s = SL[+p.dataset.i]; const b = s ? s.b : (p.id || '').replace('lamina-', '');
  document.querySelectorAll('#bloques button').forEach(x => x.classList.toggle('on', x.dataset.b === b));
  if (s && !s.ini) $('#count').textContent = `${p.dataset.i} / ${SL.length - 1}`; };
const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) activar(en.target); }, { rootMargin: '-46% 0px -46% 0px' });
pasos.forEach(p => io.observe(p));
addEventListener('scroll', () => { const m = document.documentElement.scrollHeight - innerHeight; $('#pbar').style.width = (m > 0 ? 100 * scrollY / m : 0) + '%'; }, { passive: true });
addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input,textarea,dialog')) return;
  const k = pasos.indexOf(activo);
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(ev.key)) { ev.preventDefault(); (pasos[k + 1] || pasos[k]).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) { ev.preventDefault(); (pasos[k - 1] || pasos[0]).scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  else if (ev.key === 'e' || ev.key === 'E') $('#b-explorar').click();
});

const forzada = new URLSearchParams(location.search).get('escena'); // ?escena=clave: vista fija para capturas
if (forzada && E[forzada]) { setEscena(forzada); document.body.classList.add('fija'); } else { activo = pasos[0]; setEscena('portada'); }
Object.assign(camAct, camObj); for (const k in est) est[k] = obj[k]; for (const k in XG) XG[k].v = XG[k].o; ponerCam();
requestAnimationFrame(cuadro);
setTimeout(() => $('#carga').classList.add('fuera'), 300);
if (!forzada) setTimeout(cargarRed, 800); // la red se precarga mientras se ve la portada
addEventListener('message', (ev) => { if (ev.data === 'red:lista') { document.body.classList.add('redlista'); if (redR) redModo(redR); } });


// ---- fuentes
const FUENTES = [
  ['Roco y Bainbridge (eds.) (2003), Converging Technologies for Improving Human Performance (NBIC), NSF', 'https://www.wtec.org/ConvergingTechnologies/Report/NBIC_report.pdf'],
  ['IPES, plazas de mercado 2024 (datos abiertos Bogotá) y OpenStreetMap', 'https://datosabiertos.bogota.gov.co/'],
  ['Parques: IDRD, inventario de parques de Bogotá', 'https://datosabiertos.bogota.gov.co/'],
  ['ASIS Kennedy 2024, Subred Sur Occidente / SDS', 'https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2026/01/8.-ASIS_Kennedy_2024.pdf'],
  ['ACCVSyE Kennedy 2021, SDS', 'https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2026/01/ACCVSYE_KENNEDY.pdf'],
  ['Decreto 364 de 2017 (plan parcial Bavaria Fábrica)', 'https://www.habitatbogota.gov.co/sites/default/files/marco-legal/Decreto364de2017.pdf'],
  ['Alcaldía de Bogotá, modificación del plan parcial (Decreto 448 de 2023)', 'https://bogota.gov.co/mi-ciudad/habitat/con-modificacion-de-plan-p-bavaria-bogota-tendra-bosque-toda-la-vida'],
  ['El Espectador, plan parcial y movilizaciones (2019-2022)', 'https://www.elespectador.com/bogota/plan-parcial-bavaria-ejemplo-de-concertacion-para-proyectos-urbanisticos/'],
  ['El Espectador, marcha del 5 de octubre de 2020', 'https://www.elespectador.com/bogota/ambientalistas-marchan-en-defensa-de-los-arboles-y-humedales-en-el-suroccidente-de-bogota-article/'],
  ['El Tiempo, la fábrica de Bavaria (2023)', 'https://www.eltiempo.com/bogota/fabrica-de-bavaria-en-bogota-asi-se-ven-las-ruinas-y-esto-pasara-con-el-predio-790658'],
  ['Las2orillas, «Bosque sí, cemento no» (2018)', 'https://www.las2orillas.co/bosque-si-cemento-no/'],
  ['Torres-Ariza y Gil-T, Aves en Madre de Agua, Intropica 18(2), 2023', 'https://dialnet.unirioja.es/descarga/articulo/9297483.pdf'],
  ['Corabastos: Alcaldía de Bogotá 2024', 'https://bogota.gov.co/en/node/227158'],
  ['Corabastos: La República 2026 (toneladas 2025)', 'https://www.larepublica.co/economia/quien-es-quien-entre-las-centrales-de-abasto-que-mas-mueven-toneladas-de-alimentos-4514194'],
  ['Residuos: El Espectador con datos UAESP (2026)', 'https://www.elespectador.com/bogota/generacion-de-basura-en-bogota-crecio-55-entre-2024-y-2026-segun-reporte-de-la-uaesp/'],
  ['Fracción orgánica: Boletín PIGA 39, SDA (UAESP 2018)', 'https://gysae.ambientebogota.gov.co/documents/10184/818975/Boleti%C2%B4n+PIGA+39.pdf/ce96dcb7-2d25-4711-a50a-61de92c412cd'],
  ['Inseguridad alimentaria: El Tiempo con datos DANE (2025)', 'https://www.eltiempo.com/bogota/segun-el-dane-la-capital-logro-reducir-de-forma-significativa-la-inseguridad-alimentaria-moderada-y-grave-en-2024-3456602'],
  ['Veeduría Distrital, encuesta de percepción (Infobae 2024)', 'https://www.infobae.com/colombia/2024/09/12/hambre-oculta-en-bogota-5-de-cada-10-hogares-han-tenido-que-reducir-la-cantidad-de-alimentos-por-los-precios/'],
  ['Jardín Botánico: huertas urbanas (2025)', 'https://bogota.gov.co/mi-ciudad/ambiente/se-graduan-las-primeras-huerteras-y-huerteros-urbanos-de-bogota'],
  ['Jardín Botánico: qué sembrar en Bogotá', 'https://bogota.gov.co/mi-ciudad/ambiente/que-plantas-se-pueden-sembrar-en-una-huerta-casera-en-bogota'],
  ['FAO, microhuertos (rendimientos)', 'https://fao.org/fileadmin/templates/agphome/documents/microgardens/manuals/Concept_Note_Integrated_Microgardens.pdf'],
  ['Arroz: La República con datos de Fedearroz', 'https://www.larepublica.co/especiales/retos-detras-de-la-industria-del-arroz/colombianos-consumen-en-promedio-45-2-kilos-del-cereal-4310593'],
  ['IDPAC, infografía de participación Kennedy (2023)', 'https://www.participacionbogota.gov.co/sites/idpac/files/2023-12/infografia_digital_kennedy.pdf'],
  ['Humedal de Techo, restauración (Alcaldía 2026)', 'https://bogota.gov.co/mi-ciudad/ambiente/bogota-avanza-en-proceso-de-restauracion-ecologica-humedal-de-techo'],
  ['Hillier, Yang y Turner (2012), Normalising least angle choice in Depthmap, JOSS 3(2)', 'https://joss.bartlett.ucl.ac.uk/'],
  ['OpenStreetMap (© colaboradores, ODbL) y Esri World Imagery', 'https://www.openstreetmap.org/copyright'],
];
$('#fuentes').innerHTML = FUENTES.map(([n, u]) => `<li>${n} · <a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '').slice(0, 70)}${u.length > 78 ? '…' : ''}</a></li>`).join('');
