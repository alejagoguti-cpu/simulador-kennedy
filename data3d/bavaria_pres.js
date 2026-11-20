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
scene.background = new THREE.Color('#0d0e10');
// cámara de lente larga (casi axonométrica) para que la malla fotorrealista de Google cargue su detalle
const FOV = 30;
const cam = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 10, 60000);
scene.fog = new THREE.Fog('#0d0e10', 45000, 90000);
scene.add(new THREE.HemisphereLight(0xdfe9f2, 0x1a1f24, 1.1));
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
const addEt = (html, pos, grupos, cls = '', capa = null) => { const d = document.createElement('div'); d.className = 'et ' + cls; d.innerHTML = html; d.style.opacity = 0; capaEt.appendChild(d); etq.push({ d, pos: new THREE.Vector3(...pos), grupos: new Set(grupos), capa }); };
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
const xg = (k) => XG[k] || (XG[k] = (() => { const g = new THREE.Group(); g.visible = false; scene.add(g); return { g, mats: [], v: 0, o: 0, pul: [] }; })());
const xmat = (k, m, base = 1) => { m.transparent = true; m.opacity = 0; m.depthWrite = false; m.depthTest = false; xg(k).mats.push({ m, base }); return m; };
const V3 = (p, y) => new THREE.Vector3(p[0], y, p[1]);
const curva = (a, b, alt, y0 = 6, y1 = 6) => { const A = V3(a, y0), B = V3(b, y1); const M = A.clone().lerp(B, 0.5); M.y = Math.max(y0, y1) + (alt ?? A.distanceTo(B) * 0.2); return new THREE.QuadraticBezierCurve3(A, M, B); };
const tubo = (k, cur, r, col, op = 0.85) => { const m = new THREE.Mesh(new THREE.TubeGeometry(cur, 56, r, 6), xmat(k, new THREE.MeshBasicMaterial({ color: col }), op)); m.renderOrder = 8; xg(k).g.add(m); return m; };
const linea = (k, cur, col, op = 0.55) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cur.getPoints(36)), xmat(k, new THREE.LineBasicMaterial({ color: col }), op)); l.renderOrder = 8; xg(k).g.add(l); return l; };
const pulsos = (k, curvas, cols, n = 3, vel = 0.1, tam = 5) => {
  if (!curvas.length) return; const N = curvas.length * n; const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  curvas.forEach((c, i) => { const cc = new THREE.Color(Array.isArray(cols) ? cols[i % cols.length] : cols); for (let j = 0; j < n; j++) col.set([cc.r, cc.g, cc.b], (i * n + j) * 3); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, xmat(k, new THREE.PointsMaterial({ size: MOVIL ? tam * 0.8 : tam, sizeAttenuation: false, vertexColors: true }), 1)); p.renderOrder = 11; p.frustumCulled = false; xg(k).g.add(p);
  xg(k).pul.push({ curvas, n, vel, pos, g, fase: curvas.map((_, i) => (i * 0.618) % 1) });
};
const pin = (k, P, col, h, r) => {
  const g = new THREE.Group(); const mat = xmat(k, new THREE.MeshBasicMaterial({ color: col }), 0.95);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, h, 8), mat); c.position.y = h / 2;
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); s.position.y = h;
  const d = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2, 40), xmat(k, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }), 0.55)); d.rotation.x = -Math.PI / 2; d.position.y = 3;
  g.add(c, s, d); g.children.forEach(o => { o.renderOrder = 9; }); g.position.set(P[0], 0, P[1]); xg(k).g.add(g); return g;
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
const ENTR = [200, 165, 240, 300, 120].map((a, i) => { const r = a * Math.PI / 180, R = 4700; return [KEN_C[0] + Math.cos(r) * R, KEN_C[1] - Math.sin(r) * R]; });
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
addEt(`<i style="background:${COL.lila}"></i>Universidades`, sobre(5, 30), ['cluster']);
addEt(`<i style="background:${COL.ocre}"></i>Comerciantes`, sobre(3, 30), ['cluster']);
addEt(`<i style="background:#d98f5a"></i>Promotores barriales`, sobre(11, 30), ['cluster']);
addEt(`<i style="background:${COL.rojo}"></i>Organizaciones barriales`, sobre(4, 30), ['cluster']);
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
const TGT = { mid: [KEN_C[0] * 0.45, KEN_C[1] * 0.45], midc: [MERC[1].p[0] * 0.5, MERC[1].p[1] * 0.5], lab: centroEdif(5), comp: ZC, bosq: ZB,
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
});
if (MOVIL) for (const k of ['prog', 'sectores']) LEY[k] = LEY[k].replace(/<div class="f">.*$/s, '<div class="f">Ver etiquetas en el modelo</div>');

/* ---------------- estado animado ---------------- */
const est = { lim: 0, ctx: 1, edif: 1, prog: 0, muro: 1, arb: 1, red: 0, pas: 0, banc: 0, inv: 0, techos: 0, flu: 0, expl: 0, corr: 0, borde: 0 };
const obj = { ...est };
let escena = 'portada', camObj = null, giroAz = 0, HL = null;
const GRIS_HL = new THREE.Color('#30363d');
const camAct = { s: 2300, az: -38, el: 34, x: 0, z: 0, y: 0 };
const setEscena = (k) => {
  const e = E[k]; if (!e) return; escena = k;
  obj.ctx = typeof e.ctx === 'number' ? e.ctx : 1; pintarCtx(e.ctx === 'sector' ? 'sector' : 'gris');
  obj.edif = e.edif === 'ghost' ? 0.25 : 1; obj.prog = e.edif === 'prog' ? 1 : 0; obj.muro = e.muro ? 1 : 0;
  obj.arb = e.arb === 1 ? 1 : e.arb === 'g' ? 0.3 : 0; obj.red = e.red ? 1 : 0; obj.pas = e.pas ? 1 : 0;
  obj.banc = e.banc === 1 ? 1 : e.banc === 'g' ? 0.35 : 0; obj.inv = e.inv ? 1 : 0; obj.techos = e.techos ? 1 : 0; obj.flu = e.flu ? 1 : 0; obj.expl = e.expl ? 1 : 0; obj.corr = e.corr ? 1 : 0; obj.borde = e.borde ? 1 : 0;
  if (REAL()) { // la foto ya muestra la fábrica, el bosque, el muro y los barrios: de lo propio queda solo lo nuevo
    obj.ctx = e.ctx === 'sector' ? 0.6 : 0; obj.edif = e.edif === 'prog' ? 1 : 0; obj.prog = 1; obj.muro = 0; obj.arb = 0; // los árboles son los de la foto
    G.luzObj = e.luz ?? (e.red ? 0.38 : e.ctx === 'sector' ? 0.75 : 1);
  }
  if (e.red) pintarRed(e.red); else pintarRed(e.pas ? 'gris' : modoRed);
  for (const k in XG) XG[k].o = (e.x || []).includes(k) ? 1 : 0;
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
const distCam = (s) => { const asp = innerWidth / innerHeight; const vh = asp >= 1 ? s : s / asp; return vh / 2 / Math.tan(FOV / 2 * Math.PI / 180); };
const ajustarCam = () => {
  const w = innerWidth, h = innerHeight;
  // dónde cae el objetivo en pantalla: a la derecha en escritorio (hay texto a la izquierda), arriba en celular
  const fx = explorar ? 0.5 : MOVIL ? 0.5 : (w > 1000 ? 0.64 : 0.56), fy = explorar ? 0.5 : MOVIL ? 0.34 : 0.5;
  cam.aspect = w / h; cam.setViewOffset(w, h, w / 2 - fx * w, h / 2 - fy * h, w, h);
  const R = cam.position.distanceTo(controles.target); cam.near = Math.max(5, R * 0.08); cam.far = R * 4 + 4000; cam.updateProjectionMatrix();
};
const ponerCam = () => {
  const az = (camAct.az + giroAz) * Math.PI / 180, el = camAct.el * Math.PI / 180, R = distCam(camAct.s);
  const t = new THREE.Vector3(camAct.x, camAct.y, camAct.z);
  cam.position.set(t.x + R * Math.cos(el) * Math.sin(az), t.y + R * Math.sin(el), t.z + R * Math.cos(el) * Math.cos(az)); cam.lookAt(t); controles.target.copy(t);
  ajustarCam();
};
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); lineMats.forEach(m => m.resolution.set(innerWidth, innerHeight)); if (!explorar) ajustarCam(); });

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
  if (!explorar && camObj) { for (const k of ['s', 'el', 'x', 'z', 'y']) camAct[k] = lerp(camAct[k], camObj[k], f); let d = camObj.az - camAct.az; camAct.az += d * f; if (giro && E[escena].giro) giroAz += dt * 2.2; else giroAz = lerp(giroAz, 0, f); ponerCam(); }
  if (explorar) controles.update();
  // opacidades
  opac(ctxMat, est.ctx * 0.95); ctxG.visible = est.ctx > 0.01 || est.techos > 0.01;
  opac(techosMat, est.techos);
  edifMeshes.forEach(m => { const h = HL && HL.get(String(m.userData.i)); m.material.color.set(m.userData.hoy).lerp(HL ? (h ? new THREE.Color(h) : GRIS_HL) : new THREE.Color(m.userData.prog), est.prog); opac(m.material, est.edif * (HL && !h ? 0.18 : 1)); });
  // capas del guion
  for (const k in XG) { const X = XG[k]; X.v = lerp(X.v, X.o, f); const on = X.v > 0.01; X.g.visible = on; if (!on) continue; for (const { m, base } of X.mats) m.opacity = base * X.v;
    for (const P of X.pul) { P.curvas.forEach((c, i) => { for (let j = 0; j < P.n; j++) { const u = (t * P.vel + j / P.n + P.fase[i]) % 1; c.getPoint(u, tmp); P.pos.set([tmp.x, tmp.y, tmp.z], (i * P.n + j) * 3); } }); P.g.attributes.position.needsUpdate = true; } }
  if (XG.rapaces && XG.rapaces.g.visible) rapaces.forEach((b, i) => { const a = t * 0.35 + i * 2.1, r = 70 + i * 22; b.position.set(ZC[0] + Math.cos(a) * r, 70 + i * 14 + Math.sin(t * 1.3 + i) * 4, ZC[1] + Math.sin(a) * r); b.rotation.set(0, -a, Math.sin(t * 6 + i) * 0.25); });
  if (XG.fed && XG.fed.g.visible) { const per = E[escena].voz ? 1.1 : 2.6; const ciclo = Math.floor(t / per); const o = FED.orgs[ciclo % 3]; FED.tok.position.copy(o.cur.getPoint((t % per) / per));
    FED.orgs.forEach((q, i) => { const lit = Math.floor(t / (per * 3)) % q.per.length; q.per.forEach((s, j) => { const on = j === lit; s.scale.setScalar(on ? 1.9 : 1); s.material.color.set(on ? COL.crema : q.c); }); }); }
  reticula.children.forEach(m => opac(m.material, REAL() ? est.inv * est.edif : est.edif));
  if (REAL()) { opac(loteMat, 0); lote.visible = false; piso.position.y = -120; } else { lote.visible = true; piso.position.y = -0.3; }
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
    const on = grupo && e.grupos.has(grupo);
    if (!on) { if (e.d.style.opacity !== '0') e.d.style.opacity = 0; continue; }
    tmp.copy(e.pos); if (e.capa) tmp.y += capas[e.capa].position.y + (e.d.classList.contains('capa') ? 0 : 0);
    tmp.project(cam); let x = (tmp.x + 1) / 2 * w; const y = (1 - tmp.y) / 2 * h;
    if (e.d.classList.contains('capa')) x += MOVIL ? 90 : 230; e.sx = x; e.sy = y; e.vis = x > 0 && x < w && y > 0 && y < h; vis.push(e);
  }
  vis.sort((a, b) => a.sy - b.sy); const puestos = [];
  for (const e of vis) { const ww = e.d.offsetWidth || 120; let y = e.sy; for (const p of puestos) if (Math.abs(p.x - e.sx) < (p.w + ww) / 2 + 4 && Math.abs(p.y - y) < 21) y = p.y + 21; puestos.push({ x: e.sx, y, w: ww }); const cx = Math.max(ww / 2 + 6, Math.min(w - ww / 2 - 6, e.sx)); e.d.style.left = (e.d.classList.contains('capa') ? e.sx : cx) + 'px'; e.d.style.top = y + 'px'; e.d.style.opacity = e.vis ? 1 : 0; }
  if (!window.__sin3d) renderer.render(scene, cam);
  requestAnimationFrame(cuadro);
}

/* =============================== DIAPOSITIVAS (siguen el guion) =============================== */
// b: bloque · e: escena 3D · k: antetítulo · t: título · s: lo que se ve · g: texto del guion · c: cifras
const SL = [
  { b: 'Inicio', e: 'portada', k: 'Kennedy · Bogotá · Tesis de Arquitectura y Urbanismo', t: 'Bavaria Común', s: 'Un Distrito de Tecnologías Convergentes en la antigua cervecería, entre las avenidas Boyacá y Américas.', g: 'Ana Sofía Casas · Alejandra Gómez · Juan José Trujillo · 2026' },
  { b: 'Abastecimiento', e: 'abasto_hoy', k: 'El problema con más conexiones', t: 'La centralización de servicios', s: 'Hoy los alimentos que llegan de otros territorios entran por un solo punto, Corabastos, y desde allí se reparten a los barrios.', g: 'Esta red nos ayudó a identificar la centralización de servicios como el problema con más conexiones. Por eso, la propuesta empieza por reorganizar el abastecimiento de alimentos en Kennedy.' },
  { b: 'Abastecimiento', e: 'abasto_red', k: 'Red de abastecimiento', t: 'Cambia dónde se reciben y se distribuyen', s: `Los productores llegan a ${MERC.length} mercados barriales y a los puntos de abastecimiento existentes. Corabastos es uno de los mercados de la red.`, g: 'Los alimentos que solo pueden abastecerse desde fuera de la localidad seguirían llegando de otros territorios. Lo que cambia es dónde se reciben y se distribuyen: los productores llegarían a distintos mercados barriales y puntos de abastecimiento, con Corabastos como uno de los mercados de la red.' },
  { b: 'Abastecimiento', e: 'abasto_bav', k: 'Un nodo de la red', t: 'La antigua cervecería', s: `Entre las avenidas Boyacá y Américas: ${V.area_ha} ha cerradas desde 2010, con las naves de la fábrica todavía en pie.`, g: 'Como parte de esta red, proponemos recuperar parte de la antigua cervecería, entre las avenidas Boyacá y Américas.', c: [[V.area_ha + ' ha', 'del predio'], [V.edif_n, 'edificios en pie']] },
  { b: 'Bavaria Común', e: 'dtc', k: 'Bavaria Común', t: 'Distrito de Tecnologías Convergentes', s: 'El predio por capas: territorio real, suelo productivo, pasajes, naves recuperadas y flujos.', g: 'A esta intervención la llamamos Bavaria Común, un Distrito de Tecnologías Convergentes que funciona como clúster de conocimiento.' },
  { b: 'Bavaria Común', e: 'cluster', k: 'Clúster de conocimiento', t: 'Espacios para experimentar, aprender y organizarse', s: 'Universidades, comerciantes, promotores y organizaciones barriales ocupan las naves recuperadas.', g: 'Allí, universidades, comerciantes, promotores y organizaciones barriales disponen de espacios para experimentar, aprender y organizar iniciativas propias. El enfoque NBIC, de Roco y Bainbridge, orienta el programa.' },
  { b: 'NBIC', e: 'nb_b', k: 'B · Biotecnología', t: 'Hidroponía, compostaje y hongos', s: `Bajo la cubierta liviana de las naves: ${V.inv_m2} m² cultivables.`, g: 'La biotecnología se aplica a la producción hidropónica, el compostaje y el cultivo experimental de hongos con materiales vegetales adecuados.', c: [[V.inv_m2 + ' m²', 'bajo cubierta']] },
  { b: 'NBIC', e: 'nb_i', k: 'I · Tecnologías de la información', t: 'Pedidos, entregas y excedentes', s: 'El mercado de Bavaria registra lo que se pide y lo que se entrega en cada mercado de la red.', g: 'Las tecnologías de la información ayudan a registrar pedidos, entregas y excedentes.' },
  { b: 'NBIC', e: 'nb_c', k: 'C · Ciencias cognitivas', t: 'Información útil para decidir', s: 'Herramientas pensadas para que familias y comerciantes usen esa información.', g: 'Las ciencias cognitivas orientan el diseño de herramientas para que familias y comerciantes usen esa información al tomar decisiones.' },
  { b: 'NBIC', e: 'nb_n', k: 'N · Nanotecnología', t: 'Empaques para conservar alimentos', s: 'Una línea de investigación universitaria en el laboratorio del distrito.', g: 'La nanotecnología se plantea como una línea de investigación universitaria sobre materiales de empaque para conservar alimentos.' },
  { b: 'Vivienda', e: 'form', k: 'Formación', t: 'Se aprende en Bavaria', s: 'Las familias practican en módulos demostrativos.', g: 'La formación se realiza en Bavaria y la producción se lleva a las viviendas. Las familias practican en módulos demostrativos y reciben acompañamiento de promotores barriales durante los primeros ciclos.' },
  { b: 'Vivienda', e: 'viv', k: 'Producción en las viviendas', t: 'Se cosecha en casa', s: `Promotores barriales acompañan las huertas de ${V.techos_n} cubiertas cercanas.`, g: 'El incentivo es cosechar hortalizas frescas, conocer los insumos utilizados y sustituir parte de las compras del hogar.', c: [[V.techos_n, 'cubiertas con huerta'], [V.techos_m2 + ' m²', 'en techos']] },
  { b: 'Vivienda', e: 'exc', k: 'Excedentes', t: 'Lo que sobra va al mercado barrial', s: 'Cada vivienda vende sus excedentes en el mercado más cercano. Referente local: el Jardín Botánico de Bogotá.', g: 'Cuando hay excedentes, su venta en los mercados barriales ofrece una posibilidad de ingreso complementario. El Jardín Botánico de Bogotá es un referente local por su trabajo en formación y asistencia técnica para la producción urbana.' },
  { b: 'Red biótica', e: 'bio', k: 'Red de relaciones bióticas', t: 'Qué vínculos fortalecer', s: 'El bosque de Bavaria, los parques y los humedales como una sola red.', g: 'La red de relaciones bióticas de Kennedy nos ayuda a definir qué vínculos queremos fortalecer.' },
  { b: 'Red biótica', e: 'parches', k: 'Parches conectados', t: 'Que los parches dejen de ser islas', s: 'Plantas en flor junto a las huertas y parches de árboles unidos a la vegetación existente.', g: 'Alrededor de los espacios de producción incorporamos plantas en flor para atraer polinizadores y conectamos parches de árboles con la vegetación existente. Así, los parches dejan de funcionar como islas aisladas y ofrecen alimento y refugio en distintos puntos, lo que facilita que las aves y los polinizadores se desplacen entre ellos.' },
  { b: 'Red biótica', e: 'ratas', k: 'Control de ratas', t: 'Almacenamiento cerrado y rapaces', s: 'Los residuos se guardan cerrados y se retiran a tiempo; las aves rapaces ayudan.', g: 'El control de ratas empieza con el almacenamiento cerrado y el retiro oportuno de residuos. Las aves rapaces pueden contribuir a ese control mediante la depredación.' },
  { b: 'Sintaxis', e: 'sx_merc', k: 'Sintaxis espacial · integración', t: 'Tramos accesibles para los mercados', s: 'Integración angular a 800 m (unos diez minutos a pie): rojo, muy integrado. Los mercados barriales se ubican en tramos accesibles.', g: 'Con la sintaxis espacial, usamos la integración para identificar tramos accesibles donde ubicar mercados' },
  { b: 'Sintaxis', e: 'sx_rec', k: 'Sintaxis espacial · elección', t: 'Por dónde pasan más recorridos', s: 'Elección angular: cuántos de los recorridos más directos atraviesan cada tramo.', g: 'y la elección para reconocer por dónde pasan más recorridos potenciales.' },
  { b: 'Sintaxis', e: 'sx_pas', k: 'Pasajes', t: 'Las naves se conectan con las calles', s: `${V.pasajes_km} km de pasajes y ${V.entradas} puertas. Las intervenciones se concentran en áreas ya ocupadas.`, g: 'En Bavaria, los nuevos pasajes conectan las naves recuperadas con las calles del entorno. Concentramos las intervenciones en áreas ya ocupadas.', c: [[V.pasajes_km + ' km', 'de pasajes'], [V.entradas, 'puertas']] },
  { b: 'Gobernanza', e: 'gob_bosque', k: 'Una decisión de la comunidad', t: 'Hasta dónde llegan los pasajes', s: 'Qué actividades se ubican cerca del bosque también se decide en común.', g: 'Definir hasta dónde llegan esos pasajes y qué actividades se ubican cerca del bosque también es una decisión de la comunidad.' },
  { b: 'Gobernanza', e: 'colectivo', k: 'Salvemos el Bosque de Bavaria', t: 'Quienes ya defienden el bosque', s: 'Colectivo ciudadano que defiende la conservación del bosque frente a la tala.', g: 'Por eso participa Salvemos el Bosque de Bavaria, un colectivo ciudadano que defiende la conservación del bosque de la antigua cervecería frente a la tala de árboles.' },
  { b: 'Gobernanza', e: 'federacion', k: 'Federación de asambleas', t: 'Cada organización lleva sus acuerdos', s: 'Se decide en común sobre el uso de los espacios, el cuidado del bosque y el abastecimiento de alimentos.', g: 'El colectivo, las organizaciones barriales y los comerciantes participan en una federación de asambleas. Cada organización discute sus propuestas y una persona lleva sus acuerdos a la asamblea de la federación, donde se toman las decisiones comunes sobre el uso de los espacios, el cuidado del bosque y el abastecimiento de alimentos.' },
  { b: 'Gobernanza', e: 'voceria', k: 'Vocería rotativa', t: 'Todas las personas llevan la voz', s: 'Quien representa a cada organización cambia cada cierto tiempo.', g: 'La vocería rota cada cierto tiempo, de modo que todas las personas de cada asamblea puedan representar a su organización en algún momento.' },
  { b: 'Cierre', e: 'final', k: 'Bavaria Común', t: 'Un nodo de la red de Kennedy', s: 'Abastecimiento cercano, formación, huertas en las viviendas, parches conectados y una federación de asambleas.', g: 'Usa «Explorar» para recorrer el modelo.' },
];
const BLOQ = [...new Set(SL.map(s => s.b))];
let iSl = 0; const guionOn = () => document.body.classList.contains('con-guion');
const pintarSl = (i, anim = true) => {
  iSl = Math.max(0, Math.min(SL.length - 1, i)); const s = SL[iSl];
  setEscena(s.e);
  $('#kicker').textContent = s.k; $('#titulo').textContent = s.t; $('#sub').textContent = s.s; $('#guionTxt').textContent = s.g || '';
  $('#guion').hidden = !s.g;
  $('#cifras').innerHTML = (s.c || []).map(([b, l]) => `<div><b>${b}</b><span>${l}</span></div>`).join('');
  if (anim) for (const id of ['#kicker', '#titulo', '#sub', '#guion', '#cifras']) { const e = $(id); e.classList.remove('rise'); void e.offsetWidth; e.classList.add('rise'); }
  $('#count').textContent = `${iSl + 1} / ${SL.length}`; $('#pbar').style.width = (100 * (iSl + 1) / SL.length) + '%';
  document.querySelectorAll('#bloques button').forEach(b => b.classList.toggle('on', b.dataset.b === s.b));
  const on = document.querySelector('#bloques button.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  document.querySelectorAll('#prog span').forEach((p, k) => { p.className = (k < iSl ? 'done' : k === iSl ? 'on' : '') + (k && SL[k].b !== SL[k - 1].b ? ' gap' : ''); });
  $('#prev').disabled = iSl === 0; $('#next').textContent = iSl === SL.length - 1 ? 'Inicio' : 'Siguiente';
  history.replaceState(null, '', '#' + (iSl + 1));
};
$('#bloques').innerHTML = BLOQ.map(b => `<button type="button" data-b="${b}">${b}</button>`).join('');
$('#bloques').onclick = (ev) => { const b = ev.target.closest('button'); if (b) pintarSl(SL.findIndex(s => s.b === b.dataset.b)); };
$('#prog').innerHTML = SL.map((s, k) => `<span title="${s.t}"></span>`).join('');
$('#prog').onclick = (ev) => { const k = [...$('#prog').children].indexOf(ev.target); if (k >= 0) pintarSl(k); };
$('#prev').onclick = () => pintarSl(iSl - 1);
$('#next').onclick = () => pintarSl(iSl === SL.length - 1 ? 0 : iSl + 1);
const ponerGuion = (v) => { document.body.classList.toggle('con-guion', v); $('#gbtn').setAttribute('aria-pressed', String(v)); try { localStorage.setItem('bav-guion', v ? '1' : '0'); } catch (e) {} };
$('#gbtn').onclick = () => ponerGuion(!guionOn());
{ let g = '1'; try { g = localStorage.getItem('bav-guion') ?? '1'; } catch (e) {} ponerGuion(g === '1'); }
addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input,textarea,dialog')) return;
  if (['ArrowRight', 'PageDown', ' '].includes(ev.key)) { ev.preventDefault(); $('#next').click(); }
  else if (['ArrowLeft', 'PageUp'].includes(ev.key)) { ev.preventDefault(); pintarSl(iSl - 1); }
  else if (ev.key === 'n' || ev.key === 'N') ponerGuion(!guionOn());
  else if (ev.key === 'e' || ev.key === 'E') $('#b-explorar').click();
});
// deslizar en el celular (fuera del modo explorar)
{ let x0 = null, y0 = 0; host.addEventListener('touchstart', (e) => { if (explorar) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  host.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) pintarSl(iSl + (dx < 0 ? 1 : -1)); }); }

const forzada = new URLSearchParams(location.search).get('escena'); // ?escena=clave: vista fija para capturas
const ini = Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1);
if (forzada && E[forzada]) { setEscena(forzada); document.body.classList.add('fija'); } else pintarSl(ini, false);
Object.assign(camAct, camObj); for (const k in est) est[k] = obj[k]; for (const k in XG) XG[k].v = XG[k].o; ponerCam();
requestAnimationFrame(cuadro);
setTimeout(() => $('#carga').classList.add('fuera'), 300);


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
