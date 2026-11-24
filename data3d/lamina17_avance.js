/* ============ lamina17.html · relato en scroll sobre el SIMULADOR de Kennedy (index.html en un iframe del mismo origen) ============
   Una escena por frase del guion (texto exacto). Encima de la foto: módulos en sitios reales, las dos fuentes de orgánicos,
   el esquema de la red (B frente a C y la comparación de la vocería) y la red distribuida por sectores.
   Datos (todos del simulador): kennedy.json (límite), colegios.json, parques.json, residuos.json (UAESP), asambleas.json (IDPAC),
   sim_red_datos.js (zonas, mercados y costos de ruta del escenario C) y sim_vida.js (supuestos y las tres reglas). */
import { ZONAS, MERCADOS, COSTO } from './sim_red_datos.js?v=2';
import { SUP, REGLAS } from './sim_vida.js?v=l17';

const MOVIL = matchMedia('(max-width:760px)').matches;
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s) => document.querySelector(s);
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };

/* ---------------- datos y georreferencia (mismo marco «mundo» que index.html: [x - LC.x, LC.y - y]) ---------------- */
const cj = (u) => fetch(u).then(r => r.json());
const [KEN, COLE, PARQ, RES, ASA] = await Promise.all([cj('data3d/kennedy.json'), cj('data3d/colegios.json?v=2'), cj('data3d/parques.json'),
  cj('data3d/residuos.json'), cj('data3d/asambleas.json')]);
const LC = { x: 5341.33, y: 3161.9 };
const MX = 111320 * Math.cos(4.63 * Math.PI / 180), MY = 110540;
const llW = (lng, lat) => [(lng + 74.17) * MX + 5193.24 - LC.x, LC.y - ((lat - 4.63) * MY + 2090.06)];
const wLL = (x, z) => [-74.17 + (x + LC.x - 5193.24) / MX, 4.63 + (LC.y - z - 2090.06) / MY];
const LIM = KEN.limite.map(([g, a]) => llW(g, a));
const bx = LIM.map(p => p[0]), bz = LIM.map(p => p[1]);
const O = [(Math.min(...bx) + Math.max(...bx)) / 2, (Math.min(...bz) + Math.max(...bz)) / 2];
const ANCHO = Math.max(...bx) - Math.min(...bx), ALTO = Math.max(...bz) - Math.min(...bz);
const S = (w) => [w[0] - O[0], w[1] - O[1]]; // mundo -> escena (X este, Z sur)
const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const cercano = (lista, p, f = (q) => q) => { let b = null, bd = Infinity; for (const q of lista) { const d = d2(f(q), p); if (d < bd) { bd = d; b = q; } } return b; };
const lugar = (n) => { const l = KEN.lugares.find(q => q.n === n); return llW(l.lng, l.lat); };

const BAV = [4136, 96];                 // Bavaria Común (mismo punto del simulador)
const CORA = lugar('Corabastos');
const ZON = ZONAS.map(z => ({ w: [z[0], z[1]], pob: z[2] }));
const MERC = MERCADOS.map(m => ({ n: m.n, tipo: m.tipo, w: [m.x, m.z] }));
const COLEG = COLE.colegios.map(c => ({ n: c.n, w: c.c })).filter(c => dentro(LIM, c.w[0], c.w[1]));
const PARQS = PARQ.filter(p => /ZONAL|METROPOLITANO/.test(p.tipo)).map(p => { let x = 0, z = 0; p.pts.forEach(q => { x += q[0]; z += q[1]; }); return { n: p.nombre, w: [x / p.pts.length, z / p.pts.length] }; }).filter(p => dentro(LIM, p.w[0], p.w[1]));
const ORGS = ASA.p.map(q => ({ n: q[2], w: [q[0], q[1]] })).filter(q => dentro(LIM, q.w[0], q.w[1]));
const CONT = RES.p.map(q => [q[0], q[1]]);
const CONT_U = [...new Map(CONT.map(q => [q[0] + ',' + q[1], q])).values()].filter(q => dentro(LIM, q[0], q[1]));
const NODO_Z = ZON.map((_, z) => { let b = 0, bc = Infinity; for (let k = 0; k < MERC.length; k++) { const c = COSTO[z][3 + k]; if (c < bc) { bc = c; b = k; } } return b; }); // C: mercado que surte cada zona

/* ---------------- el SIMULADOR real (index.html) en un iframe del mismo origen: su escena, su luz, sus edificios, árboles, agua y carros ---------------- */
const ifr = $('#sim'); const W = ifr.contentWindow;
const avisoCarga = (t) => { const e = $('#carga-t'); if (e) e.textContent = t; };
const espera = (ms) => new Promise(r => setTimeout(r, ms));
let cssPuesto = false;
const ponerCSS = () => { // se oculta TODA la interfaz del simulador: solo queda la escena 3D
  try { const d = W.document; if (cssPuesto || !d || !d.head || d.URL === 'about:blank') return;
    const s = d.createElement('style'); s.id = 'l17-css';
    s.textContent = 'body>*:not(#todo3d){display:none!important}#todo3d>*:not(canvas){display:none!important}#todo3d{display:block!important}body{background:#0b0e11!important;cursor:default!important}';
    d.head.appendChild(s); cssPuesto = true; } catch (e) { /* aún cargando */ } };
{ const t0 = performance.now(); let n = 0;
  const base = () => { try { return !!(W.KEN3D && W.KEN3D.THREE && W.KEN3D.scene && W.KEN3D.camera); } catch (e) { return false; } };
  const todo = () => { try { return base() && !!(W.KEN3D.orbit && W.KEN_ESC && W.KEN_RELOJ); } catch (e) { return false; } };
  while (!todo()) { // tope: 150 s para lo esencial; con la escena lista, 12 s más para el resto (si falta, se sigue con lo que haya)
    const s0 = (performance.now() - t0) / 1000; if (s0 > 150 || (base() && (W.__l17b = W.__l17b || performance.now()) && performance.now() - W.__l17b > 12000)) break;
    ponerCSS(); await espera(250); n++;
    const s = Math.round((performance.now() - t0) / 1000); avisoCarga(s < 6 ? 'Abriendo el simulador de Kennedy…' : s < 18 ? `Cargando edificios, árboles y agua… ${s} s` : `Ya casi: preparando la escena… ${s} s`);
  }
  ponerCSS(); }
if (!(W.KEN3D && W.KEN3D.THREE && W.KEN3D.scene)) { avisoCarga('El simulador no terminó de cargar. Recarga la página (Ctrl + F5).'); throw new Error('simulador no disponible'); }
const T3 = W.KEN3D, THREE = T3.THREE, scene = T3.scene, cam = T3.camera;
const imp = (u) => Promise.race([W.eval(`import('${u}')`), new Promise((_, no) => setTimeout(() => no(new Error('tiempo agotado: ' + u)), 30000))]); // los complementos de three se cargan DENTRO del iframe: mismo THREE que el simulador
const [{ LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }] = await Promise.all([imp('three/addons/lines/LineSegments2.js'), imp('three/addons/lines/LineSegmentsGeometry.js'), imp('three/addons/lines/LineMaterial.js')]);
const F32 = W.Float32Array; const lienzo = () => W.document.createElement('canvas');
// guía de inicio: «Saltar»; sin límites de zoom para las vistas de toda Kennedy; luz cálida de la tarde
const saltarGuia = () => { try { [...W.document.querySelectorAll('button')].filter(b => /^(Saltar|Cerrar|Empezar)$/i.test(b.textContent.trim())).forEach(b => b.click()); } catch (e) { } };
saltarGuia(); setTimeout(saltarGuia, 1500); setTimeout(saltarGuia, 5000);
if (T3.orbit) { T3.orbit.maxDistance = 60000; T3.orbit.enabled = false; }
if (cam.far < 60000) { cam.far = 60000; cam.updateProjectionMatrix(); }
const HORA = (m) => { try { W.KEN_RELOJ.irAMinuto(m, 'presentación'); } catch (e) { } };
HORA(16 * 60 + 40);
const FOV = cam.fov;
const raiz = new THREE.Group(); raiz.name = 'lamina17'; raiz.position.set(O[0], 0, O[1]); scene.add(raiz);
const OFF = new THREE.Vector3(O[0], 0, O[1]);

/* ---------------- utilidades de dibujo ---------------- */
const CAPAS = {};
const capa = (k) => CAPAS[k] || (CAPAS[k] = (() => { const g = new THREE.Group(); raiz.add(g); return { g, mats: [], v: 0, o: 0, t0: 0 }; })());
const encima = (m) => { m.transparent = true; m.depthTest = false; m.depthWrite = false; m.toneMapped = false; m.fog = false; return m; };
const reg = (k, m, base = 1) => { encima(m); capa(k).mats.push({ m, base }); return m; };
const lineMats = [];
const lineas = (n, ancho, aditivo = true) => { // n segmentos actualizables (posición y color por vértice)
  const g = new LineSegmentsGeometry(); g.setPositions(new F32(n * 6)); g.setColors(new F32(n * 6));
  const m = new LineMaterial({ linewidth: ancho, vertexColors: true, transparent: true, worldUnits: false, depthTest: false, depthWrite: false });
  if (aditivo) m.blending = THREE.AdditiveBlending; m.toneMapped = false; m.fog = false;
  m.resolution.set(innerWidth, innerHeight); lineMats.push(m);
  const l = new LineSegments2(g, m); l.frustumCulled = false; l.renderOrder = 6;
  l.userData = { pos: g.attributes.instanceStart.data, col: g.attributes.instanceColorStart.data, n };
  return l;
};
const listoL = (l) => { l.userData.pos.needsUpdate = true; l.userData.col.needsUpdate = true; };
const texPunto = (() => { const c = lienzo(); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
const puntos = (n, tam) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new F32(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new F32(n * 3), 3));
  const m = new THREE.PointsMaterial({ size: tam * (MOVIL ? 0.8 : 1), sizeAttenuation: false, map: texPunto, vertexColors: true, blending: THREE.AdditiveBlending });
  encima(m); const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 8; return p; };
const C3 = (h) => new THREE.Color(h);

// íconos de trazo (los mismos de la presentación de Bavaria Común)
const ICO = {
  colegio: ['M22 10v6', 'M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5'],
  mercado: ['m15 11-1 9', 'm19 11-4-7', 'M2 11h20', 'm3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4', 'M4.5 15.5h15', 'm5 11 4-7', 'm9 11 1 9'],
  corabastos: ['M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z', 'M6 18h12', 'M6 14h12', 'M6 10h12'],
  cluster: ['circle 12 5 2.6', 'circle 5 18.5 2.6', 'circle 19 18.5 2.6', 'M10.6 7.3 6.4 16.2', 'M13.4 7.3l4.2 8.9', 'M7.6 18.5h8.8'],
  asamblea: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'circle 9 7 4', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  huerta: ['M7 20h10', 'M10 20c5.5-2.5.8-6.4 3-10', 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z', 'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z'],
  casa: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
};
const icoSVG = (k, col = '#111', px = 12) => `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${col}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${ICO[k].map(d => d.startsWith('circle') ? (([, x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)(d.split(' ')) : `<path d="${d}"/>`).join('')}</svg>`;
const pin = (k, col) => `<span class="pin" style="background:${col}">${icoSVG(k)}</span>`;
const texIco = (() => { const cache = new Map(); return (k, col) => { const key = k + col; if (cache.has(key)) return cache.get(key);
  const Z = 128, c = lienzo(); c.width = c.height = Z; const g = c.getContext('2d');
  g.beginPath(); g.arc(Z / 2, Z / 2, Z / 2 - 5, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 7; g.strokeStyle = 'rgba(10,12,15,.9)'; g.stroke();
  g.save(); g.translate(Z * 0.22, Z * 0.22); g.scale(Z * 0.56 / 24, Z * 0.56 / 24); g.strokeStyle = '#111'; g.lineWidth = 2.3; g.lineCap = g.lineJoin = 'round';
  for (const d of ICO[k]) { if (d.startsWith('circle')) { const [, x, y, r] = d.split(' ').map(Number); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); } else g.stroke(new W.Path2D(d)); }
  g.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; cache.set(key, t); return t; }; })();
const sprite = (ico, col) => { const m = encima(new THREE.SpriteMaterial({ map: texIco(ico, col), sizeAttenuation: false })); const s = new THREE.Sprite(m); s.renderOrder = 15; return s; };
const COL = { merc: '#4FB98C', cora: '#5FB3D9', bav: '#B79BE8', mod: '#C9E86A', asa: '#E58A6B', voz: '#F4C95D', abasto: '#7fe3b4', conoc: '#B79BE8', decis: '#E58A6B', alerta: '#ff5a3c' };
const SECT = ['#7FD1AE', '#E3B55B', '#6FB7E0', '#E58A6B', '#B49BE6', '#D7E26A', '#E88FB4', '#5FC7C0'];
const arco = (A, B, h, u, out) => { const v = 1 - u; out.set(v * v * A.x + 2 * u * v * (A.x + B.x) / 2 + u * u * B.x, v * v * A.y + 2 * u * v * ((A.y + B.y) / 2 + 2 * h) + u * u * B.y, v * v * A.z + 2 * u * v * (A.z + B.z) / 2 + u * u * B.z); return out; };

/* ---------------- etiquetas HTML proyectadas ---------------- */
const ETS = [];
const addEt = (html, pos, on, cls = '') => { const d = document.createElement('div'); d.className = 'et ' + cls; d.innerHTML = html; $('#etiquetas').appendChild(d); const e = { d, pos, on, html }; ETS.push(e); return e; };
const setEt = (e, html) => { if (e.html !== html) { e.html = html; e.d.innerHTML = html; } };

/* ---------------- límite de Kennedy (siempre) ---------------- */
const limL = lineas(LIM.length, MOVIL ? 1.6 : 2.2);
{ const P = limL.userData.pos.array, Cc = limL.userData.col.array; const c = C3('#e2a55b');
  LIM.forEach((p, i) => { const q = LIM[(i + 1) % LIM.length]; const [ax, az] = S(p), [bx2, bz2] = S(q); P.set([ax, 8, az, bx2, 8, bz2], i * 6); Cc.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6); }); listoL(limL); }
capa('lim').g.add(limL); capa('lim').mats.push({ m: limL.material, base: 0.85 });
addEt('Kennedy', () => { const p = S(lugar('Kennedy Central')); return new THREE.Vector3(p[0], 60, p[1]); }, () => escena === 'portada', 'titulo');

/* =============================== 1 y 2 · MÓDULOS en sitios reales =============================== */
const SITIOS = [
  ...COLEG.map(c => ({ w: c.w, t: 'colegio', col: '#F4C95D', tam: 80 })),
  ...PARQS.map(c => ({ w: c.w, t: 'parque', col: '#3FCB6B', tam: 100 })),
  ...ZON.filter(z => z.pob > 2000).map(z => ({ w: z.w, t: 'cubierta', col: '#B8F04A', tam: 70 })),
].sort((a, b) => d2(a.w, BAV) - d2(b.w, BAV)); // de Bavaria hacia afuera, como el calendario del simulador
const NS = SITIOS.length;
const modGeo = new THREE.PlaneGeometry(1, 1); modGeo.rotateX(-Math.PI / 2);
const modMat = reg('mod', new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 0.92);
const modMesh = new THREE.InstancedMesh(modGeo, modMat, NS); modMesh.renderOrder = 5; modMesh.frustumCulled = false;
SITIOS.forEach((s, i) => modMesh.setColorAt(i, C3(s.col)));
capa('mod').g.add(modMesh);
// marco tenue de todos los sitios posibles (la «superficie disponible»)
const sitioPts = puntos(NS, 5); { const P = sitioPts.geometry.attributes.position.array; SITIOS.forEach((s, i) => { const [x, z] = S(s.w); P.set([x, 10, z], i * 3); }); }
capa('mod').g.add(sitioPts); capa('mod').mats.push({ m: sitioPts.material, base: 1 });
const bavMod = sprite('cluster', COL.bav); bavMod.scale.setScalar(MOVIL ? 0.03 : 0.032); bavMod.position.set(...(() => { const p = S(BAV); return [p[0], 160, p[1]]; })()); capa('mod').g.add(bavMod); capa('mod').mats.push({ m: bavMod.material, base: 1 });
addEt(pin('cluster', COL.bav) + 'Bavaria Común · los módulos se suman desde aquí', () => bavMod.position.clone().setY(260), () => escena === 'f1');
const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
// modelo ilustrativo: rendimiento (r), superficie disponible (s) y ritmo (k), todos en 0..1
const PROY = { r: 0.5, s: 0.6, k: 0.5, lo: { r: 0.2, s: 0.3, k: 0.25 }, hi: { r: 0.8, s: 0.85, k: 0.85 }, manual: 0 };
const rend = (r) => 3 + 7 * r, dispo = (s) => 0.3 + 0.7 * s, ritmo = (k) => (0.3 + 1.1 * k) / 10; // fracción de los sitios por año
const frac = (p, t) => Math.min(dispo(p.s), ritmo(p.k) * t);
const prod = (p, t) => rend(p.r) / 10 * frac(p, t);
function pintarModulos(t, X) {
  const ciclo = 9, ta = ((t - X.t0) % ciclo) / ciclo * 10; PROY.anio = ta;
  let nSol, nHi;
  if (escena === 'f2') { nSol = Math.round(NS * frac(PROY.lo, ta)); nHi = Math.round(NS * frac(PROY.hi, ta)); }
  else { nSol = Math.round(NS * frac(PROY, ta)); nHi = nSol; }
  PROY.n = nSol; PROY.nHi = nHi;
  const rat = escena === 'f2' ? null : ritmo(PROY.k);
  for (let i = 0; i < NS; i++) {
    const s = SITIOS[i]; const [x, z] = S(s.w); let e = 0, c = 1;
    if (i < nSol) { const ap = rat ? i / NS / rat : 0; const age = rat ? ta - ap : 2; e = age < 0.35 ? 1 + 0.6 * Math.sin(cl(age / 0.35, 0, 1) * Math.PI) : 1; c = 1; }
    else if (i < nHi) { const ph = 0.5 + 0.5 * Math.sin(t * 3.2 + i * 0.7); e = 0.75 + 0.25 * ph; c = 0.18 + 0.4 * ph; }
    const tam = s.tam * e * (MOVIL ? 1.25 : 1);
    M4.compose(V1.set(x, 6, z), Q0, V2.set(tam || 0.001, 1, tam || 0.001)); modMesh.setMatrixAt(i, M4);
    modMesh.setColorAt(i, C3(s.col).multiplyScalar(c * (e > 0 ? 1 : 0)));
  }
  modMesh.instanceMatrix.needsUpdate = true; modMesh.instanceColor.needsUpdate = true;
  // puntos de la superficie disponible: los que no entran en la superficie se apagan
  const lim = Math.round(NS * dispo(escena === 'f2' ? PROY.hi.s : PROY.s)); const Cc = sitioPts.geometry.attributes.color.array;
  for (let i = 0; i < NS; i++) { const v = i < lim ? 0.55 : 0.08; Cc.set([v, v, v * 0.9], i * 3); } sitioPts.geometry.attributes.color.needsUpdate = true;
}

/* =============================== 3 · RESIDUOS: dos fuentes que no coinciden =============================== */
const zonaDe = CONT_U.map(p => { let b = 0, bd = Infinity; ZON.forEach((z, i) => { const d = d2(z.w, p); if (d < bd) { bd = d; b = i; } }); return b; });
const resPts = puntos(CONT_U.length, 6); capa('res').g.add(resPts); capa('res').mats.push({ m: resPts.material, base: 1 });
const zonPob = ZON.reduce((s, z) => s + z.pob, 0) / ZON.length;
const resGeo = new THREE.RingGeometry(0.78, 1, 40); resGeo.rotateX(-Math.PI / 2);
const resMat = reg('res', new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
const resZon = new THREE.InstancedMesh(resGeo, resMat, ZON.length); resZon.renderOrder = 5; resZon.frustumCulled = false; capa('res').g.add(resZon);
const resDisco = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), reg('res', new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0.12), ZON.length);
resDisco.renderOrder = 4; resDisco.frustumCulled = false; capa('res').g.add(resDisco);
ZON.forEach((z, i) => { resZon.setColorAt(i, C3('#5FC7C0')); resDisco.setColorAt(i, C3('#5FC7C0')); });
const RESF = { u: 0 };
addEt('<span class="pin" style="background:#E89A4F"></span>Fuente 1 · contenedores (UAESP)', () => { const p = S(CONT_U[Math.floor(CONT_U.length * 0.37)]); return new THREE.Vector3(p[0], 30, p[1]); }, () => escena === 'f3' && RESF.u < 0.35);
addEt('<span class="pin" style="background:#5FC7C0"></span>Fuente 2 · estimación por persona en cada zona', () => { const z = ZON.reduce((b, q) => q.pob > b.pob ? q : b, ZON[0]); const p = S(z.w); return new THREE.Vector3(p[0], 30, p[1]); }, () => escena === 'f3' && RESF.u < 0.35);
const etArm = addEt('Misma unidad · misma zona · mismo periodo', () => new THREE.Vector3(0, 80, -ALTO * 0.3), () => escena === 'f3' && RESF.u > 0.6, 'regla');
function pintarResiduos(t, X) {
  const T = 10, f = ((t - X.t0) % T) / T; // 0-.28 separadas · .28-.6 se alinean · .6-.9 armonizadas · .9-1 vuelven
  const u = f < 0.28 ? 0 : f < 0.6 ? suave((f - 0.28) / 0.32) : f < 0.9 ? 1 : 1 - suave((f - 0.9) / 0.1); RESF.u = u;
  const P = resPts.geometry.attributes.position.array, Cc = resPts.geometry.attributes.color.array;
  const c1 = C3('#E89A4F'), c2 = C3('#5FC7C0'), cw = C3('#e8fff8');
  CONT_U.forEach((p, i) => { const z = ZON[zonaDe[i]].w; const k = cl(u * 1.3 - (i % 7) * 0.04, 0, 1); const e = suave(k);
    const [x, zz] = S([lerp(p[0], z[0], e), lerp(p[1], z[1], e)]); P.set([x, 14 + Math.sin(e * Math.PI) * 120, zz], i * 3);
    const c = c1.clone().lerp(cw, e); const a = 1 - 0.8 * e; Cc.set([c.r * a, c.g * a, c.b * a], i * 3); });
  resPts.geometry.attributes.position.needsUpdate = true; resPts.geometry.attributes.color.needsUpdate = true;
  ZON.forEach((z, i) => { const [x, zz] = S(z.w); const r = 45 + 85 * Math.sqrt(z.pob / zonPob) * (MOVIL ? 1.2 : 1);
    const desf = (1 - u) * (0.75 + 0.5 * Math.sin(i * 2.3)); // sin armonizar, el círculo de la estimación no calza
    M4.compose(V1.set(x, 5, zz), Q0, V2.set(r * desf + r * u * 0.9 || 0.01, 1, r * desf + r * u * 0.9 || 0.01)); resZon.setMatrixAt(i, M4); resDisco.setMatrixAt(i, M4);
    const c = c2.clone().lerp(cw, u * 0.5).multiplyScalar(0.5 + 0.15 * u); resZon.setColorAt(i, c); resDisco.setColorAt(i, c.clone().multiplyScalar(0.6 + 0.4 * u)); });
  resZon.instanceMatrix.needsUpdate = true; resZon.instanceColor.needsUpdate = true; resDisco.instanceMatrix.needsUpdate = true; resDisco.instanceColor.needsUpdate = true;
}

/* =============================== 4 y 6 · ESQUEMA de la red (pocos nodos grandes, con íconos) =============================== */
// nodos con posición real: 7 mercados del simulador, Corabastos, Bavaria Común, 4 sitios de módulos y 4 asambleas (organizaciones del IDPAC)
const qc = (dx, dz) => [O[0] + dx * ANCHO, O[1] + dz * ALTO];
const NOD = [];
const addN = (t, ico, col, w, n) => { NOD.push({ t, ico, col, w, n }); return NOD.length - 1; };
const iCora = addN('cora', 'corabastos', COL.cora, CORA, 'Corabastos');
const iBav = addN('bav', 'cluster', COL.bav, BAV, 'Bavaria Común');
const iMer = ['Biblioteca El Tintal', 'Patio Bonito II', 'Timiza', 'Castilla', 'Marsella', 'Carvajal', 'Las Margaritas'].map(n => { const m = MERC.find(q => q.n === n) || MERC[0]; return addN('merc', 'mercado', COL.merc, m.w, 'Mercado ' + n); });
const iMod = [
  addN('mod', 'huerta', COL.mod, cercano(PARQS, qc(-0.28, -0.22), q => q.w).w, 'Parque con módulos'),
  addN('mod', 'colegio', COL.mod, cercano(COLEG, qc(-0.12, 0.26), q => q.w).w, 'Colegio con módulos'),
  addN('mod', 'casa', COL.mod, cercano(ZON.filter(z => z.pob > 2000), qc(0.22, 0.2), q => q.w).w, 'Cubierta compartida'),
  addN('mod', 'colegio', COL.mod, cercano(COLEG, qc(0.06, -0.05), q => q.w).w, 'Colegio con módulos'),
];
const iAsa = [qc(-0.24, 0.02), qc(0.02, 0.3), qc(0.2, -0.1), qc(-0.05, -0.3)].map(p => addN('asa', 'asamblea', COL.asa, cercano(ORGS, p, q => q.w).w, 'Asamblea barrial'));
const NODOS_MOV = new Set(iMod);
// aristas: B (todo pasa por Bavaria) y C (red distribuida)
const ARI = [];
const addA = (a, b, tipo, esc) => { if (!ARI.some(e => e.esc === esc && ((e.a === a && e.b === b) || (e.a === b && e.b === a)))) ARI.push({ a, b, tipo, esc }); };
const masCerca = (i, lista, n) => lista.filter(j => j !== i).sort((x, y) => d2(NOD[x].w, NOD[i].w) - d2(NOD[y].w, NOD[i].w)).slice(0, n);
// C
masCerca(iCora, iMer, 2).forEach(j => addA(iCora, j, 'abasto', 'C'));
iMer.forEach(i => masCerca(i, iMer, 1).forEach(j => addA(i, j, 'abasto', 'C')));
iMod.forEach(i => masCerca(i, iMer, 1).forEach(j => addA(i, j, 'abasto', 'C')));
masCerca(iBav, iMer, 1).forEach(j => addA(iBav, j, 'abasto', 'C'));
iMod.forEach(j => addA(iBav, j, 'conoc', 'C'));
iAsa.forEach(i => masCerca(i, [...iMer, ...iMod], 2).forEach(j => addA(i, j, 'decis', 'C')));
// B
addA(iCora, iBav, 'abasto', 'B');
iMer.forEach(j => addA(iBav, j, 'abasto', 'B'));
iAsa.forEach(i => addA(i, iBav, 'decis', 'B'));
const NARC = 18, NPAR = 3, NINT = 5;
const CENTRO_ASA = (() => { let x = 0, z = 0; iAsa.forEach(i => { x += NOD[i].w[0]; z += NOD[i].w[1]; }); return [x / iAsa.length, z / iAsa.length]; })();
function crearCopia() {
  const g = new THREE.Group(); capa('esq').g.add(g);
  const cp = { g, cx: 0, cy: 420, cz: 0, s: 0.46, m: 1, a: 0, rot: 1, anc: 0, pl: 0, obj: { cx: 0, cy: 420, cz: 0, s: 0.46, m: 1, a: 0, rot: 1, anc: 0, pl: 0 }, P: NOD.map(() => new THREE.Vector3()), voz: iAsa.map(() => new THREE.Vector3()), vozIdx: iAsa.map(() => 0) };
  // placa: la silueta de Kennedy reducida, para leer que es el mismo territorio
  const sh = new THREE.Shape(LIM.map(p => { const q = S(p); return new THREE.Vector2(q[0], -q[1]); }));
  cp.placa = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), encima(new THREE.MeshBasicMaterial({ color: '#0a0d11', opacity: 0 }))); cp.placa.renderOrder = 3; g.add(cp.placa);
  cp.borde = lineas(LIM.length, 1.4); g.add(cp.borde);
  cp.lin = lineas(ARI.length * NARC + iAsa.length * NARC + NOD.length, MOVIL ? 2 : 2.6); g.add(cp.lin);
  cp.anillo = lineas(64, 2); g.add(cp.anillo);
  cp.par = puntos(ARI.length * NPAR + iAsa.length * 2, 9); g.add(cp.par);
  cp.int = puntos(iAsa.length * NINT, 8); g.add(cp.int);
  cp.spr = NOD.map(n => { const s = sprite(n.ico, n.col); g.add(s); return s; });
  cp.vozS = iAsa.map(() => { const s = new THREE.Sprite(encima(new THREE.SpriteMaterial({ map: texPunto, color: COL.voz, sizeAttenuation: false, blending: THREE.AdditiveBlending }))); s.renderOrder = 16; g.add(s); return s; });
  return cp;
}
const COP = [crearCopia(), crearCopia()];
const ESQ = { evento: 0, evAri: [], sig: 6 };
const cA = C3(COL.abasto), cC = C3(COL.conoc), cD = C3(COL.decis), cV = C3(COL.voz), cAl = C3(COL.alerta), cBorde = C3('#e2a55b');
const TV = new THREE.Vector3(), TV2 = new THREE.Vector3();
function lugarN(cp, i, out) { // posición del nodo i en la copia
  let w = NOD[i].w; if (NODOS_MOV.has(i)) { const b = NOD[iBav].w; w = [lerp(b[0], w[0], cp.m), lerp(b[1], w[1], cp.m)]; } // en B la producción está en Bavaria
  return out.set(cp.cx + (w[0] - O[0]) * cp.s, cp.cy, cp.cz + (w[1] - O[1]) * cp.s);
}
function pintarCopia(cp, t, dt, vCapa) {
  const f = 1 - Math.pow(0.02, dt); for (const k in cp.obj) cp[k] = lerp(cp[k], cp.obj[k], f);
  const A = cp.a * vCapa; cp.g.visible = A > 0.01; if (!cp.g.visible) return;
  NOD.forEach((_, i) => lugarN(cp, i, cp.P[i]));
  // placa y borde
  cp.placa.position.set(cp.cx, cp.cy - 6, cp.cz); cp.placa.scale.setScalar(cp.s); cp.placa.material.opacity = 0.42 * cp.pl * A;
  { const P = cp.borde.userData.pos.array, Cc = cp.borde.userData.col.array; const k = 0.7 * cp.pl * A;
    LIM.forEach((p, i) => { const q = LIM[(i + 1) % LIM.length]; P.set([cp.cx + (p[0] - O[0]) * cp.s, cp.cy - 4, cp.cz + (p[1] - O[1]) * cp.s, cp.cx + (q[0] - O[0]) * cp.s, cp.cy - 4, cp.cz + (q[1] - O[1]) * cp.s], i * 6); Cc.set([cBorde.r * k, cBorde.g * k, cBorde.b * k, cBorde.r * k, cBorde.g * k, cBorde.b * k], i * 6); }); listoL(cp.borde); }
  // íconos
  const tamBase = (MOVIL ? 0.024 : 0.03) * (0.55 + 0.45 * cp.s / 0.46 * 0.75);
  NOD.forEach((n, i) => { const s = cp.spr[i]; s.position.copy(cp.P[i]); let k = 1, v = 1;
    if (n.t === 'bav') k = lerp(1.7, 1.05, cp.m); else if (n.t === 'merc') k = lerp(0.72, 1, cp.m); else if (n.t === 'mod') { k = 0.85; v = cp.m; } else if (n.t === 'asa') k = 0.95; else if (n.t === 'cora') k = 1.15;
    s.scale.setScalar(tamBase * k * Math.max(0.05, v)); s.material.opacity = A * v; });
  // integrantes de cada asamblea y vocero resaltado (fijo o rotativo)
  const ri = 230 * cp.s / 0.46 * 0.6 + 40, IP = cp.int.geometry.attributes.position.array, IC = cp.int.geometry.attributes.color.array;
  iAsa.forEach((ia, a) => { const c = cp.P[ia];
    const per = 1.7, idx = cp.rot > 0.5 ? (Math.floor(t / per) + a * 2) % NINT : 0; cp.vozIdx[a] = idx;
    for (let j = 0; j < NINT; j++) { const ang = j / NINT * Math.PI * 2 - Math.PI / 2; const x = c.x + Math.cos(ang) * ri, z = c.z + Math.sin(ang) * ri;
      IP.set([x, c.y - 20, z], (a * NINT + j) * 3); const v = 0.75 * A; IC.set([cD.r * v, cD.g * v, cD.b * v], (a * NINT + j) * 3);
      if (j === idx) { TV.set(x, c.y - 20, z); cp.voz[a].lerp(TV, cp.voz[a].lengthSq() ? Math.min(1, dt * 7) : 1); } }
    const vs = cp.vozS[a]; vs.position.copy(cp.voz[a]); vs.scale.setScalar((MOVIL ? 0.018 : 0.022) * (1 + 0.12 * Math.sin(t * 5))); vs.material.opacity = A * cp.m; });
  cp.int.geometry.attributes.position.needsUpdate = true; cp.int.geometry.attributes.color.needsUpdate = true; cp.int.material.opacity = 1;
  // federación de asambleas (solo en C): un anillo, no un centro
  const fc = TV2.set(cp.cx + (CENTRO_ASA[0] - O[0]) * cp.s, cp.cy + 380 * cp.s / 0.46 * 0.7, cp.cz + (CENTRO_ASA[1] - O[1]) * cp.s), fr = 700 * cp.s;
  cp.fc = fc.clone(); cp.fr = fr;
  { const P = cp.anillo.userData.pos.array, Cc = cp.anillo.userData.col.array; const k = cp.m * A * (0.65 + 0.2 * Math.sin(t * 2));
    for (let i = 0; i < 64; i++) { const a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2; P.set([fc.x + Math.cos(a0) * fr, fc.y, fc.z + Math.sin(a0) * fr, fc.x + Math.cos(a1) * fr, fc.y, fc.z + Math.sin(a1) * fr], i * 6);
      const b = k * (0.6 + 0.4 * Math.cos(a0 * 2 - t * 1.4)); Cc.set([cD.r * b, cD.g * b, cD.b * b, cD.r * b, cD.g * b, cD.b * b], i * 6); } listoL(cp.anillo); }
  // aristas en arco + partículas
  const P = cp.lin.userData.pos.array, Cc = cp.lin.userData.col.array, PP = cp.par.geometry.attributes.position.array, PC = cp.par.geometry.attributes.color.array;
  let s = 0, p = 0;
  ARI.forEach((e, ei) => { const w = (e.esc === 'B' ? 1 - cp.m : cp.m) * A; const Aa = cp.P[e.a], Bb = cp.P[e.b]; const dd = Aa.distanceTo(Bb); const h = Math.min(320, dd * 0.16);
    const alerta = ESQ.evento > 0 && ESQ.evAri.includes(ei) && e.esc === 'C';
    const col = alerta ? cAl : e.tipo === 'abasto' ? cA : e.tipo === 'conoc' ? cC : cD; const k = w * (e.tipo === 'conoc' ? 0.55 : 0.8) * (alerta ? 0.6 + 0.4 * Math.sin(t * 12) : 1);
    for (let i = 0; i < NARC; i++) { arco(Aa, Bb, h, i / NARC, TV); arco(Aa, Bb, h, (i + 1) / NARC, TV2); P.set([TV.x, TV.y, TV.z, TV2.x, TV2.y, TV2.z], s * 6); Cc.set([col.r * k, col.g * k, col.b * k, col.r * k, col.g * k, col.b * k], s * 6); s++; }
    const vel = (e.tipo === 'abasto' ? 0.32 : 0.22) * (alerta ? 0.25 : 1) * 1800 / Math.max(600, dd / cp.s * 0.6);
    for (let j = 0; j < NPAR; j++) { const u = (t * vel * 0.12 + j / NPAR + ei * 0.137) % 1; arco(Aa, Bb, h, u, TV); PP.set([TV.x, TV.y, TV.z], p * 3); const b = w * 1.1; const pc = alerta ? cAl : col.clone().lerp(C3('#ffffff'), 0.5); PC.set([pc.r * b, pc.g * b, pc.b * b], p * 3); p++; } });
  // vocero -> federación (acuerdos que suben)
  iAsa.forEach((ia, a) => { const Aa = cp.voz[a]; const dx = Aa.x - fc.x, dz = Aa.z - fc.z, n = Math.hypot(dx, dz) || 1; TV2.set(fc.x + dx / n * fr, fc.y, fc.z + dz / n * fr); const Bb = TV2.clone();
    const k = cp.m * A * 0.95;
    for (let i = 0; i < NARC; i++) { arco(Aa, Bb, 30, i / NARC, TV); arco(Aa, Bb, 30, (i + 1) / NARC, TV2); P.set([TV.x, TV.y, TV.z, TV2.x, TV2.y, TV2.z], s * 6); Cc.set([cV.r * k, cV.g * k, cV.b * k, cV.r * k, cV.g * k, cV.b * k], s * 6); s++; }
    for (let j = 0; j < 2; j++) { const u = (t * 0.35 + j / 2 + a * 0.21) % 1; arco(Aa, Bb, 30, u, TV); PP.set([TV.x, TV.y, TV.z], p * 3); const b = cp.m * A * 1.2; PC.set([cV.r * b, cV.g * b, cV.b * b], p * 3); p++; } });
  // anclas al suelo (solo con la red a escala real)
  NOD.forEach((n, i) => { const q = cp.P[i]; const k = cp.anc * A * (n.t === 'mod' ? cp.m : 1) * 0.45; const c = C3(n.col); P.set([q.x, q.y - 30, q.z, q.x, 4, q.z], s * 6); Cc.set([c.r * k, c.g * k, c.b * k, 0, 0, 0], s * 6); s++; });
  listoL(cp.lin); cp.par.geometry.attributes.position.needsUpdate = true; cp.par.geometry.attributes.color.needsUpdate = true;
}
// títulos de las copias
const tituloPos = (cp) => () => new THREE.Vector3(cp.cx, cp.cy + 60, cp.cz - ALTO * 0.52 * cp.s);
const etL = addEt('', tituloPos(COP[0]), () => escena === 'f4', 'titulo');
const etR = addEt('', tituloPos(COP[1]), () => escena === 'f4', 'titulo');
const etRegla = addEt('Solo cambia esta regla', () => MOVIL ? new THREE.Vector3(250, 380, -900) : new THREE.Vector3(250, 420, -900 - ALTO * 0.2), () => escena === 'f4' && sub === 1, 'regla');
const etB = addEt(pin('cluster', COL.bav) + 'Bavaria: acopio, reparto y decisiones', () => COP[0].P[iBav].clone().setY(COP[0].cy + 90), () => escena === 'f4' && sub === 0);
const etCB = addEt(pin('cluster', COL.bav) + 'Bavaria: clúster de conocimiento', () => COP[1].P[iBav].clone().setY(COP[1].cy + 90), () => escena === 'f4' && sub === 0 && !MOVIL);
const etFed = addEt('Federación de asambleas', () => COP[1].fc ? COP[1].fc.clone().add(new THREE.Vector3(0, 40, -COP[1].fr)) : new THREE.Vector3(), () => false);
// escena 6: nombres sobre la red a escala real
const et6 = [
  [iBav, pin('cluster', COL.bav) + 'Bavaria Común · clúster de conocimiento'], [iCora, pin('corabastos', COL.cora) + 'Corabastos · un nodo más'],
  [iMer[0], pin('mercado', COL.merc) + 'Mercado barrial'], [iMod[1], pin('colegio', COL.mod) + 'Colegio con módulos'], [iAsa[2], pin('asamblea', COL.asa) + 'Asamblea barrial'],
].map(([i, h]) => addEt(h, () => COP[0].P[i].clone().setY(COP[0].cy + 110), () => escena === 'f6'));
const etFed6 = addEt('Federación · la vocería rota', () => COP[0].fc ? COP[0].fc.clone().add(new THREE.Vector3(0, 50, -COP[0].fr)) : new THREE.Vector3(), () => escena === 'f6');
const etEv = addEt('Cierre de una vía principal · evento al azar del modelo', () => { const e = ARI[ESQ.evAri[0]]; return e ? COP[0].P[e.a].clone().lerp(COP[0].P[e.b], 0.5).setY(COP[0].cy + 260) : new THREE.Vector3(); }, () => escena === 'f6' && ESQ.evento > 0, 'alerta');

/* =============================== 5 · RED DISTRIBUIDA POR SECTORES (datos reales del escenario C) =============================== */
function kmedias(pts, k) {
  let C = [pts[0].slice()]; while (C.length < k) { let b = null, bd = -1; for (const p of pts) { const d = Math.min(...C.map(c => d2(c, p))); if (d > bd) { bd = d; b = p; } } C.push(b.slice()); }
  let as = []; for (let it = 0; it < 40; it++) { as = pts.map(p => { let bi = 0, bd = Infinity; C.forEach((c, i) => { const d = d2(c, p); if (d < bd) { bd = d; bi = i; } }); return bi; });
    C = C.map((c, i) => { const q = pts.filter((_, j) => as[j] === i); return q.length ? [q.reduce((s, p) => s + p[0], 0) / q.length, q.reduce((s, p) => s + p[1], 0) / q.length] : c; }); }
  return { C, as };
}
const KM = kmedias(MERC.map(m => m.w), 8);
const sectMerc = KM.as, NSEC = 8;
const ASA_S = KM.C.map(c => cercano(ORGS, c, q => q.w)); // una asamblea por sector: la organización comunal más cercana al centro del sector
const FED5 = { c: S(KM.C.reduce((s, c) => [s[0] + c[0] / NSEC, s[1] + c[1] / NSEC], [0, 0])), y: 900, r: Math.min(ANCHO, ALTO) * 0.16 };
{
  const k = 'sect', g = capa(k).g;
  // zonas coloreadas por el sector de su mercado
  const zGeo = new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2);
  const zMat = reg(k, new THREE.MeshBasicMaterial({ color: '#ffffff', blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0.26);
  const zm = new THREE.InstancedMesh(zGeo, zMat, ZON.length); zm.renderOrder = 4; zm.frustumCulled = false;
  ZON.forEach((z, i) => { const [x, zz] = S(z.w); const r = 60 + 120 * Math.sqrt(z.pob / zonPob); M4.compose(V1.set(x, 5, zz), Q0, V2.set(r, 1, r)); zm.setMatrixAt(i, M4); zm.setColorAt(i, C3(SECT[sectMerc[NODO_Z[i]]])); });
  g.add(zm);
  // flujos mercado -> zona (abastecimiento por sector), Corabastos -> 3 mercados, Bavaria -> asambleas (formación)
  const fl = []; ZON.forEach((z, i) => { if (z.pob > 0) fl.push({ a: MERC[NODO_Z[i]].w, b: z.w, col: C3(SECT[sectMerc[NODO_Z[i]]]), h: 30, v: 0.5, w: 0.55 }); });
  MERC.map((m, j) => j).sort((a, b) => d2(MERC[a].w, CORA) - d2(MERC[b].w, CORA)).slice(0, 3).forEach(j => fl.push({ a: CORA, b: MERC[j].w, col: C3(COL.cora), h: 120, v: 0.25, w: 0.9 }));
  ASA_S.forEach(o => fl.push({ a: BAV, b: o.w, col: C3(COL.bav), h: 260, v: 0.18, w: 0.5, y1: 260 }));
  // asambleas de sector -> sus mercados (decisiones locales)
  ASA_S.forEach((o, s) => MERC.forEach((m, j) => { if (sectMerc[j] === s) fl.push({ a: o.w, b: m.w, col: C3(COL.decis), h: 40, v: 0.2, w: 0.6, y0: 260 }); }));
  const L = lineas(fl.length * 10, MOVIL ? 1.3 : 1.6); g.add(L); capa(k).mats.push({ m: L.material, base: 1 });
  const NPF = 2, par = puntos(fl.length * NPF, 7); g.add(par); capa(k).mats.push({ m: par.material, base: 1 });
  const VV = fl.map(f => { const [ax, az] = S(f.a), [bx2, bz2] = S(f.b); return [new THREE.Vector3(ax, f.y0 || 8, az), new THREE.Vector3(bx2, f.y1 || 8, bz2)]; });
  { const P = L.userData.pos.array, Cc = L.userData.col.array; let s = 0; fl.forEach((f, i) => { const [A, B] = VV[i]; for (let j = 0; j < 10; j++) { arco(A, B, f.h, j / 10, TV); arco(A, B, f.h, (j + 1) / 10, TV2); P.set([TV.x, TV.y, TV.z, TV2.x, TV2.y, TV2.z], s * 6); const c = f.col, w = f.w * 0.55; Cc.set([c.r * w, c.g * w, c.b * w, c.r * w, c.g * w, c.b * w], s * 6); s++; } }); listoL(L); }
  { const PC = par.geometry.attributes.color.array; fl.forEach((f, i) => { for (let j = 0; j < NPF; j++) { const c = f.col.clone().lerp(C3('#fff'), 0.4); PC.set([c.r, c.g, c.b], (i * NPF + j) * 3); } }); }
  // organizaciones comunales (IDPAC) por sector
  const og = puntos(ORGS.length, 5); g.add(og); capa(k).mats.push({ m: og.material, base: 1 });
  { const P = og.geometry.attributes.position.array, Cc = og.geometry.attributes.color.array; ORGS.forEach((o, i) => { const [x, z] = S(o.w); P.set([x, 12, z], i * 3); let b = 0, bd = Infinity; MERC.forEach((m, j) => { const d = d2(m.w, o.w); if (d < bd) { bd = d; b = j; } }); const c = C3(SECT[sectMerc[b]]); Cc.set([c.r, c.g, c.b], i * 3); }); }
  // íconos: mercados (color del sector), Corabastos, Bavaria y asambleas de sector (elevadas) con su ancla
  const sp = (ico, col, w, y, tam) => { const s = sprite(ico, col); const [x, z] = S(w); s.position.set(x, y, z); s.scale.setScalar(tam * (MOVIL ? 1.1 : 1)); g.add(s); capa(k).mats.push({ m: s.material, base: 1 }); return s; };
  MERC.forEach((m, j) => sp('mercado', SECT[sectMerc[j]], m.w, 40, 0.017));
  sp('corabastos', COL.cora, CORA, 120, 0.03);
  const sb = sp('cluster', COL.bav, BAV, 260, 0.03);
  const sa = ASA_S.map((o, s) => sp('asamblea', SECT[s], o.w, 260, 0.024));
  const anc = lineas(ASA_S.length + 1, 1.2); g.add(anc); capa(k).mats.push({ m: anc.material, base: 1 });
  { const P = anc.userData.pos.array, Cc = anc.userData.col.array; [...ASA_S.map(o => o.w), BAV].forEach((w, i) => { const [x, z] = S(w); P.set([x, 240, z, x, 6, z], i * 6); Cc.set([0.5, 0.5, 0.5, 0, 0, 0], i * 6); }); listoL(anc); }
  // federación: anillo sobre Kennedy con un enlace por asamblea; un pulso recorre el anillo (la vocería rota)
  const fed = lineas(64 + ASA_S.length * 10, 1.8); g.add(fed); capa(k).mats.push({ m: fed.material, base: 1 });
  const tok = new THREE.Sprite(encima(new THREE.SpriteMaterial({ map: texPunto, color: COL.voz, sizeAttenuation: false, blending: THREE.AdditiveBlending }))); tok.scale.setScalar(MOVIL ? 0.026 : 0.018); tok.renderOrder = 16; g.add(tok); capa(k).mats.push({ m: tok.material, base: 1 });
  const FC = new THREE.Vector3(FED5.c[0], FED5.y, FED5.c[1]);
  capa(k).upd = (t) => {
    const PP = par.geometry.attributes.position.array; fl.forEach((f, i) => { const [A, B] = VV[i]; for (let j = 0; j < NPF; j++) { const u = (t * f.v + j / NPF + i * 0.173) % 1; arco(A, B, f.h, u, TV); PP.set([TV.x, TV.y, TV.z], (i * NPF + j) * 3); } }); par.geometry.attributes.position.needsUpdate = true;
    const P = fed.userData.pos.array, Cc = fed.userData.col.array; const c = C3(COL.decis), cv = C3(COL.voz); const turno = Math.floor(t / 1.4) % NSEC;
    for (let i = 0; i < 64; i++) { const a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2; P.set([FC.x + Math.cos(a0) * FED5.r, FC.y, FC.z + Math.sin(a0) * FED5.r, FC.x + Math.cos(a1) * FED5.r, FC.y, FC.z + Math.sin(a1) * FED5.r], i * 6); const b = 0.55; Cc.set([c.r * b, c.g * b, c.b * b, c.r * b, c.g * b, c.b * b], i * 6); }
    ASA_S.forEach((o, s) => { const A = sa[s].position; const dx = A.x - FC.x, dz = A.z - FC.z, n = Math.hypot(dx, dz) || 1; const B = TV2.set(FC.x + dx / n * FED5.r, FC.y, FC.z + dz / n * FED5.r).clone(); const on = s === turno; const col = on ? cv : c; const b = on ? 1 : 0.35;
      for (let j = 0; j < 10; j++) { arco(A, B, 20, j / 10, TV); const ax = TV.x, ay = TV.y, az = TV.z; arco(A, B, 20, (j + 1) / 10, TV); P.set([ax, ay, az, TV.x, TV.y, TV.z], (64 + s * 10 + j) * 6); Cc.set([col.r * b, col.g * b, col.b * b, col.r * b, col.g * b, col.b * b], (64 + s * 10 + j) * 6); }
      sa[s].scale.setScalar((on ? 0.031 : 0.024) * (MOVIL ? 1.1 : 1)); });
    listoL(fed);
    const A = sa[turno].position; const u = (t % 1.4) / 1.4; const dx = A.x - FC.x, dz = A.z - FC.z, n = Math.hypot(dx, dz) || 1; arco(A, TV2.set(FC.x + dx / n * FED5.r, FC.y, FC.z + dz / n * FED5.r).clone(), 20, suave(u), tok.position);
  };
  addEt(pin('cluster', COL.bav) + 'Bavaria Común · forma promotores en cada sector', () => sb.position.clone().setY(380), () => escena === 'f5');
  addEt(pin('corabastos', COL.cora) + 'Corabastos · un nodo más', () => { const p = S(CORA); return new THREE.Vector3(p[0], 200, p[1]); }, () => escena === 'f5');
  addEt('Federación de asambleas', () => FC.clone().add(new THREE.Vector3(0, 40, -FED5.r)), () => escena === 'f5', 'titulo');
  addEt(pin('asamblea', SECT[1]) + 'Asamblea del sector', () => sa[1].position.clone().setY(360), () => escena === 'f5' && !MOVIL);
  { const j = MERC.findIndex(m => m.n === 'Patio Bonito II'); addEt(pin('mercado', SECT[sectMerc[j]]) + 'Mercado barrial: surte las zonas de su sector', () => { const p = S(MERC[j].w); return new THREE.Vector3(p[0], 80, p[1]); }, () => escena === 'f5'); }
}

/* =============================== ESCENAS (una por frase) =============================== */
const FR = [ // rótulos cortos (no el guion completo): la escena del simulador es lo principal
  { e: 'f1', a: 'Rendimiento · Superficie · Ritmo de módulos', b: '' },
  { e: 'f2', a: 'Parámetros · Calibración', b: '' },
  { e: 'f3', a: 'Residuos · Datos', b: '' },
  { e: 'f4', a: 'Escenario B · Escenario C', b: '', a2: 'Vocería fija · Vocería rotativa', b2: '', largo: true },
  { e: 'f5', a: 'Abastecimiento distribuido · Organizaciones barriales', b: '' },
  { e: 'f6', a: 'Red en el tiempo · Sostenibilidad', b: '' },
];
const E = { // vistas cercanas al área detallada del simulador (centro local ≈ 250, -1000): edificios, árboles y agua se ven en 3D
  portada: { cam: { x: 250, y: 0, z: -900, s: 0.7, el: 36, az: -22 }, capas: { lim: 1 }, giro: true },
  f1: { cam: { x: 1100, y: 0, z: -800, s: 0.6, el: 44, az: 12 }, capas: { lim: 0.8, mod: 1 }, pan: 'proy' },
  f2: { cam: { x: 900, y: 0, z: -600, s: 0.58, el: 38, az: 28 }, capas: { lim: 0.8, mod: 1 }, pan: 'proy' },
  f3: { cam: { x: 0, y: 0, z: -600, s: 0.68, el: 52, az: -10 }, capas: { lim: 0.8, res: 1 }, pan: 'res' },
  f4: { cam: { x: 250, y: 300, z: -800, s: 0.78, el: 34, az: 0 }, capas: { lim: 0.5, esq: 1 }, pan: 'esq', fx: 0.68, fy: 0.42 },
  f5: { cam: { x: 0, y: 150, z: -200, s: 0.92, el: 50, az: -16 }, capas: { lim: 0.9, sect: 1 }, pan: 'sect', fx: 0.655, fy: 0.45 },
  f6: { cam: { x: 250, y: 380, z: -700, s: 0.78, el: 32, az: 0 }, capas: { lim: 0.7, esq: 1 }, pan: 'vida', giro: true, fx: 0.655, fy: 0.4 },
};
let escena = 'portada', sub = 0;
const camAct = { ...E.portada.cam }, camObj = { ...E.portada.cam }; let giroAz = 0;
function copias() {
  const [L, R] = COP; const BX = 250, BZ = -900;
  if (escena === 'f4') {
    const sc = MOVIL ? 0.3 : 0.34, d = MOVIL ? ALTO * 0.19 : ANCHO * 0.19;
    Object.assign(L.obj, MOVIL ? { cx: BX, cz: BZ - d, cy: 300 } : { cx: BX - d, cz: BZ, cy: 300 }, { s: sc, a: 1, pl: 1, anc: 0 });
    Object.assign(R.obj, MOVIL ? { cx: BX, cz: BZ + d, cy: 300 } : { cx: BX + d, cz: BZ, cy: 300 }, { s: sc, a: 1, pl: 1, anc: 0 });
    if (sub === 0) { L.obj.m = 0; L.obj.rot = 0; R.obj.m = 1; R.obj.rot = 1; } else { L.obj.m = 1; L.obj.rot = 0; R.obj.m = 1; R.obj.rot = 1; }
  } else if (escena === 'f6') {
    Object.assign(L.obj, { cx: BX, cz: BZ, cy: 420, s: 0.62, a: 1, pl: 0.5, anc: 0, m: 1, rot: 1 });
    Object.assign(R.obj, { cx: BX, cz: BZ, cy: 420, s: 0.62, a: 0, pl: 0, anc: 0, m: 1, rot: 1 });
  } else { L.obj.a = 0; R.obj.a = 0; }
  setEt(etL, sub === 0 ? '<small>Escenario B</small>Coordinación concentrada' : '<small>Comparación adicional</small>Vocería fija');
  setEt(etR, sub === 0 ? '<small>Escenario C</small>Red distribuida' : '<small>Comparación adicional</small>Vocería rotativa');
  $('#esq-h').textContent = sub === 0 ? 'B frente a C' : 'solo cambia la vocería';
}
const ESC_SIM = { portada: 'hoy', f1: 'hoy', f2: 'hoy', f3: 'hoy', f4: 'hoy', f5: 'proyecto', f6: 'hoy' };
const HORA_SIM = { portada: 16 * 60 + 50, f1: 16 * 60 + 30, f2: 16 * 60 + 30, f3: 16 * 60 + 30, f4: 17 * 60 + 35, f5: 17 * 60 + 35, f6: 17 * 60 + 35 };
let horaAct = 0;
function simEscena(k) { // escenario del simulador (hoy / con la propuesta) y hora del día por frase
  try { const e = ESC_SIM[k]; if (e && W.KEN_ESC.e !== e) W.KEN_ESC.poner(e); } catch (er) { console.warn('escenario', er); }
  if (HORA_SIM[k] && HORA_SIM[k] !== horaAct) { horaAct = HORA_SIM[k]; HORA(horaAct); }
}
function setEscena(k, s = 0) {
  const cambio = k !== escena; escena = k; sub = s; const X = E[k];
  Object.assign(camObj, X.cam);
  for (const c in CAPAS) { const o = X.capas[c] || 0; if (o && !CAPAS[c].o) CAPAS[c].t0 = reloj.elapsedTime; CAPAS[c].o = o; }
  copias();
  if (cambio) { panel(X.pan); simEscena(k); }
  const tb = $('#tablero'); tb.classList.toggle('fuera', !X.pan); tb.classList.toggle('solo-escritorio', X.pan === 'esq' || X.pan === 'sect'); tb.classList.toggle('abajo', X.pan === 'esq' || X.pan === 'sect' || X.pan === 'vida');
  $('#tag-cal').hidden = k !== 'f2'; $('#c-lab').setAttribute('opacity', k === 'f2' ? 1 : 0);
  document.querySelectorAll('.ctrl').forEach(c => c.classList.remove('act'));
  if (k === 'f6') { ESQ.t0 = reloj.elapsedTime; ESQ.sig = reloj.elapsedTime + 4; }
}

/* ---------------- tablero lateral ---------------- */
let panAct = null;
function panel(p) { if (p === panAct) return; panAct = p; document.querySelectorAll('.pan').forEach(e => e.classList.toggle('on', e.id === 'pan-' + p)); }
const CTRL = [...document.querySelectorAll('.ctrl')].map(el => ({ el, k: el.dataset.k, inp: el.querySelector('input'), v: el.querySelector('b') }));
CTRL.forEach(c => c.inp.addEventListener('input', () => { PROY[c.k] = c.inp.value / 1000; PROY.manual = reloj.elapsedTime + 8; }));
const X0 = 36, X1 = 306, Y0 = 112, Y1 = 14;
const px = (t) => X0 + (X1 - X0) * t / 10, py = (v) => Y0 - (Y0 - Y1) * v;
const camino = (p) => { let d = ''; for (let i = 0; i <= 40; i++) { const t = i / 4; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ' ' + py(prod(p, t)).toFixed(1); } return d; };
function tableroProy(t) {
  const f2 = escena === 'f2';
  if (!f2 && reloj.elapsedTime > PROY.manual) { // los controles se mueven solos, uno a la vez
    const T = 15, tt = ((t - (CAPAS.mod.t0 || 0)) % T + T) % T, j = Math.floor(tt / 5), u = (tt % 5) / 5;
    const base = { r: 0.5, s: 0.62, k: 0.5 };
    CTRL.forEach((c, i) => { PROY[c.k] = i === j ? cl(base[c.k] + 0.42 * Math.sin(u * Math.PI * 2), 0.04, 0.98) : base[c.k]; c.el.classList.toggle('act', i === j); });
  }
  if (f2) { CTRL.forEach((c, i) => { const lo = PROY.lo[c.k], hi = PROY.hi[c.k]; PROY[c.k] = lerp(lo, hi, 0.5 + 0.5 * Math.sin(t * (0.9 + i * 0.37) + i * 2)); c.inp.style.setProperty('--a', lo * 100 + '%'); c.inp.style.setProperty('--b', hi * 100 + '%'); c.el.classList.add('act'); }); }
  else CTRL.forEach(c => { c.inp.style.setProperty('--a', '0%'); c.inp.style.setProperty('--b', '0%'); });
  CTRL.forEach(c => { if (document.activeElement !== c.inp) c.inp.value = Math.round(PROY[c.k] * 1000); });
  const nSit = Math.round(NS * dispo(PROY.s));
  CTRL[0].v.textContent = f2 ? `${fmt(rend(PROY.lo.r), 0)}–${fmt(rend(PROY.hi.r), 0)} kg/m²·año` : `${fmt(rend(PROY.r), 1)} kg/m²·año`;
  CTRL[1].v.textContent = f2 ? `${Math.round(NS * dispo(PROY.lo.s))}–${Math.round(NS * dispo(PROY.hi.s))} sitios` : `${nSit} de ${NS} sitios`;
  CTRL[2].v.textContent = f2 ? `${Math.round(NS * ritmo(PROY.lo.k))}–${Math.round(NS * ritmo(PROY.hi.k))} módulos/año` : `${Math.round(NS * ritmo(PROY.k))} módulos/año`;
  $('#c-main').setAttribute('d', camino(PROY));
  $('#c-ref').setAttribute('d', f2 ? '' : camino({ r: 0.5, s: 0.62, k: 0.5 }));
  if (f2) { const lo = camino(PROY.lo), hi = camino(PROY.hi); $('#c-lo').setAttribute('d', lo); $('#c-hi').setAttribute('d', hi);
    let d = hi; for (let i = 40; i >= 0; i--) { const tt = i / 4; d += 'L' + px(tt).toFixed(1) + ' ' + py(prod(PROY.lo, tt)).toFixed(1); } $('#c-banda').setAttribute('d', d + 'Z'); }
  else { $('#c-lo').setAttribute('d', ''); $('#c-hi').setAttribute('d', ''); $('#c-banda').setAttribute('d', ''); }
  const a = PROY.anio || 0; $('#c-cur').setAttribute('x1', px(a)); $('#c-cur').setAttribute('x2', px(a)); $('#c-pt').setAttribute('cx', px(a)); $('#c-pt').setAttribute('cy', py(prod(PROY, a)));
  $('#anio-p').textContent = fmt(a, 1); $('#nmod').textContent = f2 ? `${PROY.n}–${PROY.nHi}` : PROY.n;
}
// residuos
$('#u1').textContent = `${fmt(RES.p.length)} contenedores en ${fmt(CONT_U.length)} puntos de Kennedy · se mide en litros de capacidad`;
$('#u2').textContent = `${fmt(SUP.KG_ORG, 2)} kg/persona·día × población de cada zona (supuesto del modelo) · ${ZON.length} zonas`;
const pasos3 = [...document.querySelectorAll('#pasos3 span')];
function tableroRes() {
  const u = RESF.u; const b1 = $('#b1'), b2 = $('#b2');
  b1.style.left = lerp(4, 8, u) + '%'; b1.style.width = lerp(38, 74, u) + '%';
  b2.style.left = lerp(22, 8, u) + '%'; b2.style.width = lerp(76, 70, u) + '%';
  pasos3.forEach((s, i) => s.classList.toggle('on', u > 0.15 + i * 0.3));
}
// leyendas
$('#ley-esq').innerHTML = [['mercado', COL.merc, 'Mercado barrial'], ['asamblea', COL.asa, 'Asamblea barrial (integrantes alrededor)'], ['colegio', COL.mod, 'Módulos: colegio, parque, cubierta'], ['corabastos', COL.cora, 'Corabastos'], ['cluster', COL.bav, 'Bavaria Común']].map(([k, c, t]) => `<span>${pin(k, c)}${t}</span>`).join('')
  + `<span><i style="background:${COL.abasto}"></i>abastecimiento</span><span><i style="background:${COL.conoc}"></i>formación (conocimiento)</span><span><i style="background:${COL.decis}"></i>decisiones</span><span><i style="background:${COL.voz};border-radius:50%"></i>vocero que lleva los acuerdos</span>`;
$('#ley-sect').innerHTML = `<span>${pin('mercado', SECT[0])}${MERC.length} mercados barriales (color del sector)</span><span><i style="background:${SECT[2]};clip-path:polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)"></i>${ZON.length} zonas surtidas por su mercado</span><span><i style="background:${SECT[4]};border-radius:50%"></i>${ORGS.length} organizaciones comunales (IDPAC)</span><span>${pin('asamblea', SECT[1])}Asamblea del sector → federación</span><span>${pin('corabastos', COL.cora)}Corabastos, un nodo más</span><span>${pin('cluster', COL.bav)}Bavaria Común: forma promotores</span>`;
// medidores (las tres reglas del simulador)
const MED = [
  { k: 'habitat', n: 'Hábitat', r: 'Se cae si las especies en los parches bajan 30 % o más.', umbral: 0.7, riesgo: 0.85, inv: false },
  { k: 'abasto', n: 'Abastecimiento', r: 'Se cae si una zona recibe menos del 80 % de lo que necesita.', umbral: 0.8, riesgo: 0.9, inv: false },
  { k: 'residuos', n: 'Residuos', r: 'Se cae si los orgánicos pendientes superan el almacenamiento.', umbral: 1, riesgo: 0.7, inv: true },
];
$('#medidores').innerHTML = MED.map((m, i) => `<div class="medidor"><div class="t"><span>${m.n}</span><em id="m-e${i}"></em></div><div class="barra"><i id="m-b${i}"></i><u style="left:${(m.inv ? m.umbral / 1.4 : m.umbral) * 100}%"></u></div><div class="r oculta-movil">${(REGLAS.find(r => r.k === m.k) || {}).txt ? m.r : m.r}</div></div>`).join('');
function tableroVida(t) {
  const a = (t - (ESQ.t0 || 0)) * 0.55; $('#anio-v').textContent = 'Año ' + fmt(a, 1);
  const ev = ESQ.evento > 0 ? 1 : 0;
  const val = [0.93 + 0.04 * Math.sin(t * 0.7) - 0.06 * Math.sin(a * 0.4) ** 2, 0.97 + 0.02 * Math.sin(t * 1.3) - ev * 0.1, 0.45 + 0.12 * Math.sin(t * 0.5 + 1) + ev * 0.22];
  MED.forEach((m, i) => { const v = val[i]; const pct = m.inv ? v / 1.4 : v; const malo = m.inv ? v > m.umbral : v < m.umbral, ries = m.inv ? v > m.riesgo : v < m.riesgo;
    const col = malo ? '#ff5a3c' : ries ? '#F4C95D' : '#7fe3b4'; const b = $('#m-b' + i); b.style.width = (cl(pct, 0, 1) * 100).toFixed(1) + '%'; b.style.background = col;
    const e = $('#m-e' + i); e.textContent = malo ? 'fuera' : ries ? 'en riesgo' : 'se sostiene'; e.style.color = col; e.style.background = col + '22'; });
}

/* ---------------- cámara ---------------- */
const distCam = (c) => { const asp = innerWidth / innerHeight; const w = ANCHO * c.s * (MOVIL ? 0.62 : 1), h = ALTO * c.s * 0.78; const vh = Math.max(h, w / asp); return vh / 2 / Math.tan(FOV / 2 * Math.PI / 180); };
const TG = new THREE.Vector3(); const RMAX = +(new URLSearchParams(location.search).get('rmax') || 0);
const ponerCam = () => { // mueve la cámara DEL SIMULADOR (y su objetivo de órbita); el contenido se corre a la derecha de la tarjeta corriendo el objetivo
  const X = E[escena]; const az = (camAct.az + giroAz) * Math.PI / 180, el = camAct.el * Math.PI / 180, R = RMAX ? Math.min(RMAX, distCam(camAct)) : distCam(camAct);
  const w = innerWidth, asp = w / innerHeight; const fx = MOVIL ? 0.5 : (w > 1000 ? (X.fx || (X.pan ? 0.51 : 0.6)) : 0.55), fy = MOVIL ? 0.47 : (X.fy || 0.52);
  const Wv = 2 * R * Math.tan(FOV / 2 * Math.PI / 180) * asp, Hv = Wv / asp;
  const rx = Math.cos(az), rz = -Math.sin(az); const fwx = -Math.sin(az), fwz = -Math.cos(az); // derecha y adelante en el suelo
  const dx = -(fx - 0.5) * Wv, dv = (fy - 0.5) * Hv / Math.max(0.35, Math.sin(el)) * 0.6;
  TG.set(O[0] + camAct.x + rx * dx + fwx * dv, camAct.y, O[1] + camAct.z + rz * dx + fwz * dv);
  T3.anim = null; T3.llegada = null;
  if (T3.orbit) T3.orbit.target.copy(TG); cam.position.set(TG.x + R * Math.cos(el) * Math.sin(az), TG.y + R * Math.sin(el), TG.z + R * Math.cos(el) * Math.cos(az)); cam.lookAt(TG);
  cam.updateMatrixWorld();
};
addEventListener('resize', () => { lineMats.forEach(m => m.resolution.set(innerWidth, innerHeight)); });

/* ---------------- bucle ---------------- */
const reloj = new THREE.Clock(); const tmp = new THREE.Vector3();
function cuadro() {
  const dt = Math.min(0.05, reloj.getDelta()), t = reloj.elapsedTime, f = 1 - Math.pow(0.004, dt);
  for (const k of ['s', 'el', 'x', 'z', 'y', 'az']) camAct[k] = lerp(camAct[k], camObj[k], f * 0.8);
  if (E[escena].giro && !QUIETO) giroAz += dt * 1.6; else giroAz = lerp(giroAz, QUIETO ? 0 : Math.sin(t * 0.11) * 6, f * 0.25);
  ponerCam();
  for (const k in CAPAS) { const X = CAPAS[k]; X.v = lerp(X.v, X.o, f); const on = X.v > 0.01; X.g.visible = on; if (!on) continue;
    for (const { m, base } of X.mats) m.opacity = base * X.v; if (X.upd) X.upd(t, dt, X); }
  if (CAPAS.mod.g.visible) pintarModulos(t, CAPAS.mod);
  if (CAPAS.res.g.visible) pintarResiduos(t, CAPAS.res);
  if (CAPAS.esq.g.visible) {
    if (escena === 'f6') { if (ESQ.evento > 0) ESQ.evento -= dt; else if (t > ESQ.sig) { ESQ.evento = 3; ESQ.sig = t + 8; const ab = ARI.map((e, i) => i).filter(i => ARI[i].esc === 'C' && ARI[i].tipo === 'abasto'); const k0 = Math.floor(Math.random() * ab.length); ESQ.evAri = [ab[k0], ab[(k0 + 3) % ab.length]]; } }
    else ESQ.evento = 0;
    COP.forEach(cp => pintarCopia(cp, t, dt, CAPAS.esq.v));
  }
  if (panAct === 'proy') tableroProy(t); else if (panAct === 'res') tableroRes(); else if (panAct === 'vida') tableroVida(t);
  // etiquetas
  const w = innerWidth, h = innerHeight; const vis = [];
  for (const e of ETS) { let on = false; try { on = e.on(); } catch { on = false; }
    if (!on) { if (e.d.style.opacity !== '0') e.d.style.opacity = 0; continue; }
    tmp.copy(e.pos()).add(OFF); tmp.project(cam); const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h; e.sx = x; e.sy = y; e.vis = tmp.z < 1 && x > -50 && x < w + 50 && y > 0 && y < h; vis.push(e); }
  vis.sort((a, b) => a.sy - b.sy); const puestos = [];
  for (const e of vis) { const ww = e.d.offsetWidth || 120, hh = e.d.offsetHeight || 22; let y = e.sy; for (const p of puestos) if (Math.abs(p.x - e.sx) < (p.w + ww) / 2 + 4 && Math.abs(p.y - y) < (p.h + hh) / 2 + 2) y = p.y + (p.h + hh) / 2 + 3; puestos.push({ x: e.sx, y, w: ww, h: hh });
    const cx = Math.max(ww / 2 + 6, Math.min(w - ww / 2 - 6, e.sx)); e.d.style.left = cx + 'px'; e.d.style.top = y + 'px'; e.d.style.opacity = e.vis ? 1 : 0; }
  requestAnimationFrame(cuadro);
}

/* =============================== RELATO EN SCROLL =============================== */
{ const esc = (w) => w.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let h = `<section class="paso portada activo" data-escena="portada"><div class="tarjeta">
    <p class="kicker">Kennedy · Bogotá</p>
    <h1>Bavaria <b>Común</b></h1>
    <p>Calibrar · Comparar · Distribuir</p>
    <span class="bajar"><i></i>Desplázate</span></div></section>`;
  const pal = (txt, d = 0) => txt.split(' ').map((w, k) => `<span class="w" style="--i:${k + d}">${esc(w)}</span>`).join(' ');
  FR.forEach((s, i) => {
    h += `<section class="paso${s.largo ? ' largo' : ''}" data-i="${i + 1}" data-escena="${s.e}"><div class="tarjeta vidrio corta"><p class="kicker">${i + 1} / ${FR.length}</p>
      <div class="uno"><p class="rot">${pal(s.a)}</p>${s.b ? `<p class="frase">${pal(s.b, 3)}</p>` : ''}</div>
      ${s.a2 ? `<div class="alt"><p class="rot">${pal(s.a2)}</p>${s.b2 ? `<p class="frase">${pal(s.b2, 3)}</p>` : ''}</div>` : ''}</div></section>`; });
  h += '<section class="paso fin" data-escena="f6"></section>';
  $('#relato').innerHTML = h; }
$('#puntos').innerHTML = FR.map((_, i) => `<button type="button" data-i="${i + 1}" aria-label="Frase ${i + 1}">${i + 1}</button>`).join('');
const pasos = [...document.querySelectorAll('#relato .paso')];
const ir = (i, s = 0) => { const p = pasos.find(q => q.dataset.i === String(i)) || pasos[0]; const r = p.getBoundingClientRect(); const y = scrollY + r.top + (p.classList.contains('largo') ? r.height * (s ? 0.78 : 0.22) : Math.min(r.height * 0.3, innerHeight * 0.6)) - innerHeight / 2; scrollTo({ top: Math.max(0, y), behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }); leerScroll(); };
$('#puntos').onclick = (ev) => { const b = ev.target.closest('button'); if (b) ir(+b.dataset.i); };
let activo = null;
function leerScroll() {
  const c = innerHeight / 2; let p = pasos[0], prog = 0;
  for (const q of pasos) { const r = q.getBoundingClientRect(); if (r.top <= c && r.bottom > c) { p = q; prog = (c - r.top) / r.height; break; } }
  const s = p.classList.contains('largo') && prog > 0.5 ? 1 : 0;
  if (p !== activo || s !== sub) {
    if (p !== activo) { if (activo) activo.classList.remove('activo'); activo = p; p.classList.add('activo'); }
    p.classList.toggle('sub1', s === 1); p.querySelectorAll('.fase span').forEach((x, i) => x.classList.toggle('on', i === s));
    const e = p.dataset.escena; setEscena(e, s);
    document.querySelectorAll('#puntos button').forEach(b => b.classList.toggle('on', b.dataset.i === p.dataset.i || (p.classList.contains('fin') && b.dataset.i === '6')));
  }
  const m = document.documentElement.scrollHeight - innerHeight; $('#pbar').style.width = (m > 0 ? 100 * scrollY / m : 0) + '%';
}
addEventListener('scroll', leerScroll, { passive: true });
addEventListener('keydown', (ev) => {
  if (ev.target.closest && ev.target.closest('input')) return;
  const i = activo && activo.dataset.i ? +activo.dataset.i : 0;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(ev.key)) { ev.preventDefault(); if (escena === 'f4' && sub === 0) ir(4, 1); else ir(Math.min(FR.length, i + 1)); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) { ev.preventDefault(); if (escena === 'f4' && sub === 1) ir(4, 0); else if (i > 1) ir(i - 1); else scrollTo({ top: 0 }); }
});
window.L17 = { ir, estado: () => ({ escena, sub, esc: W.KEN_ESC && W.KEN_ESC.e }) };

setEscena('portada'); escena = 'portada'; simEscena('portada');
Object.assign(camAct, camObj); for (const k in CAPAS) CAPAS[k].v = CAPAS[k].o; ponerCam();
leerScroll();
requestAnimationFrame(cuadro);
setTimeout(() => { $('#loader').classList.add('hidden'); window.KEN3D = true; }, 2500);
