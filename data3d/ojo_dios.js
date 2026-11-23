/* ============ OJO DE DIOS · cámara que vuela a un punto (para la vista limpia: data3d/limpio.js / data3d/simulaciones.js) ============
   window.KEN_OJO = { ir({ x, z, titulo, texto, color }) → Promise, cerrar() → Promise }
   · x, z en coordenadas del MUNDO (T3). Vuela en arco SIN atravesar edificios: la altura del vuelo sale de un mapa de alturas reales
     (celdas de 40 m) armado con la geometría de los edificios del modelo (T3.edificios: la misma de data3d/edif/*.bin = buildings.json)
     y las cajas de los modelos propios (INEM, Bavaria, Corabastos, torres, metro…), más un margen para la malla de Google.
   · Baja a una vista oblicua (~32°) y orbita lento alrededor del punto; muestra una tarjeta de vidrio con el título y el texto.
     ir() se resuelve al llegar. Arrastrar o hacer zoom detiene la órbita (la cámara queda libre).
   · cerrar() quita la tarjeta y la marca y devuelve la cámara, también en arco, a donde estaba antes del primer ir(); se resuelve al volver.
   Si otro módulo mueve la cámara con T3.anim (p. ej. al escoger una simulación), el vuelo se cancela y le cede el paso. */
import { RELOJ } from './reloj.js?v=5';

const CEL = 40, X0 = -8000, Z0 = -8000, NX = 400, NZ = 400;  // mapa de alturas: 16 × 16 km en celdas de 40 m
const MARGEN = 45;          // m libres por encima de lo más alto de la ruta
const MARGEN_GOOGLE = 35;   // m extra: la malla de Google tiene construcciones que el modelo no trae
const R_FIN = 430, ELEV = 0.56; // distancia a la que queda la cámara y elevación (rad, ~32°)
const GRUPOS = ['inem-kennedy', 'bavaria', 'bavaria_distrito', 'corabastos', 'parque_corabastos', 'torresBalcones', 'conjuntos', 'biblioteca-tintal', 'metro_l1_catenaria', 'metro_l1_estaciones', 'metro_l1_obra', 'humedal_la_vaca'];

let T3 = null, THREE = null, armado = false, alturas = null, pAlturas = null, hMax = 0;
let vuelo = null, orbita = null, casa = null, tarjeta = null, marca = null, tPrev = 0, orbitaOn = null;

function armar() {
  if (armado) return true;
  T3 = window.KEN_T3; if (!T3 || !T3.scene || !T3.camera) return false; THREE = T3.THREE; armado = true;
  const css = document.createElement('style'); css.id = 'ojo-css';
  css.textContent = `#ojo-t{position:fixed;top:16px;right:16px;z-index:45;box-sizing:border-box;width:min(340px,calc(100vw - 32px));padding:13px 15px 13px 17px;border-radius:16px;
  font:400 12.5px/1.45 var(--ui-sans,'Geist','Inter',system-ui,-apple-system,'Segoe UI',sans-serif);color:var(--ui-tx,#eceff1);
  background:var(--ui-glass,linear-gradient(160deg,rgba(38,42,50,.45),rgba(8,10,14,.58)));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  box-shadow:var(--ui-glass-sh,0 18px 44px rgba(0,0,0,.38));-webkit-backdrop-filter:var(--ui-glass-fx,blur(24px) saturate(1.5));backdrop-filter:var(--ui-glass-fx,blur(24px) saturate(1.5));
  opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .35s;overflow:hidden}
#ojo-t.on{opacity:1;transform:none}
#ojo-t::before{content:'';position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--ojo-c,#ffb347)}
#ojo-t .oj-h{font:600 10px/1.2 var(--ui-sans,'Geist',system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;opacity:.55;margin-bottom:4px}
#ojo-t .oj-t{font:500 19px/1.12 'Barlow Condensed',var(--ui-sans,system-ui),sans-serif;letter-spacing:.015em;margin:0 0 6px}
#ojo-t .oj-x{margin:0 0 11px;color:var(--ui-tx2,#c6cdd1)}
#ojo-t button{all:unset;box-sizing:border-box;cursor:pointer;height:32px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);font:500 12.5px/32px var(--ui-sans,'Geist',system-ui,sans-serif)}
#ojo-t button:hover{background:rgba(255,255,255,.16)}#ojo-t button:focus-visible{outline:2px solid var(--ojo-c,#ffb347);outline-offset:2px}
@media(max-width:700px){#ojo-t{top:auto;bottom:78px;right:8px;left:8px;width:auto}}`;
  document.head.appendChild(css);
  RELOJ.alDibujar(paso);
  const parar = () => { if (orbita && !vuelo) orbita.on = false; };
  T3.renderer.domElement.addEventListener('pointerdown', parar);
  T3.renderer.domElement.addEventListener('wheel', parar, { passive: true });
  return true;
}

/* ---------- mapa de alturas (una vez, por partes para no trabar un cuadro) ---------- */
function armarAlturas() {
  if (pAlturas) return pAlturas;
  alturas = new Float32Array(NX * NZ);
  const y0 = T3.sueloY != null ? T3.sueloY : 0;
  const poner = (x, z, y) => { const i = Math.floor((x - X0) / CEL), j = Math.floor((z - Z0) / CEL); if (i < 0 || j < 0 || i >= NX || j >= NZ) return; const k = j * NX + i; if (y > alturas[k]) alturas[k] = y; };
  const caja = (b) => { if (!isFinite(b.min.x) || b.max.y - y0 < 1) return; const i0 = Math.max(0, Math.floor((b.min.x - X0) / CEL)), i1 = Math.min(NX - 1, Math.floor((b.max.x - X0) / CEL)), j0 = Math.max(0, Math.floor((b.min.z - Z0) / CEL)), j1 = Math.min(NZ - 1, Math.floor((b.max.z - Z0) / CEL));
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > 4000) return; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * NX + i; if (b.max.y > alturas[k]) alturas[k] = b.max.y; } };
  const tareas = [];
  for (const e of T3.edificios || []) tareas.push(() => { const m = e.mesh, P = m.geometry && m.geometry.attributes.position; if (!P) return; m.updateMatrixWorld(); const w = m.matrixWorld.elements, A = P.array;
    for (let v = 0; v < A.length; v += 3) poner(A[v] + w[12], A[v + 2] + w[14], A[v + 1] + w[13]); }); // edificios del modelo: posiciones ya en el mundo
  tareas.push(() => { const B = new THREE.Box3(); T3.scene.traverse(o => { if (!GRUPOS.includes(o.name)) return; o.updateMatrixWorld(true); o.traverse(c => { if (c.isMesh && c.geometry) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); B.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld); caja(B); } }); }); });
  pAlturas = new Promise(res => {
    let t = 0; const lote = () => { const t0 = performance.now(); while (t < tareas.length && performance.now() - t0 < 8) tareas[t++](); if (t < tareas.length) setTimeout(lote, 0); else { hMax = 0; for (const v of alturas) if (v > hMax) hMax = v; res(alturas); } };
    lote();
  });
  return pAlturas;
}
const alturaEn = (x, z, rad = 1) => { // lo más alto alrededor de (x, z) en ±rad celdas
  if (!alturas) return hMax; const i = Math.floor((x - X0) / CEL), j = Math.floor((z - Z0) / CEL); let h = 0;
  for (let b = j - rad; b <= j + rad; b++) for (let a = i - rad; a <= i + rad; a++) { if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const v = alturas[b * NX + a]; if (v > h) h = v; }
  return h;
};

/* ---------- trayectoria en arco por encima de lo más alto de la ruta ---------- */
function planear(p0, c0, p1, c1) {
  const N = 180, xs = new Float32Array(N + 1), zs = new Float32Array(N + 1), req = new Float32Array(N + 1), ys = new Float32Array(N + 1);
  const g = T3.fotoReal ? MARGEN + MARGEN_GOOGLE : MARGEN;
  let crucero = 0;
  for (let s = 0; s <= N; s++) { const u = s / N; xs[s] = p0.x + (p1.x - p0.x) * u; zs[s] = p0.z + (p1.z - p0.z) * u; req[s] = alturaEn(xs[s], zs[s], 1) + g; if (req[s] > crucero) crucero = req[s]; }
  const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z), sube = Math.min(1, dist / 1800); // vuelo corto: arco bajo
  crucero = Math.max(crucero, Math.min(Math.max(p0.y, p1.y) + 120 + dist * 0.12, 900) * sube + crucero * (1 - sube));
  for (let s = 0; s <= N; s++) { const u = s / N, base = p0.y + (p1.y - p0.y) * u, plat = smooth(0, 0.28, u) * (1 - smooth(0.72, 1, u)); ys[s] = Math.max(base, base + (crucero - base) * plat, req[s]); }
  // dilatar y suavizar: la curva queda lisa y NUNCA por debajo de lo requerido
  const W = 8, D = new Float32Array(N + 1); for (let s = 0; s <= N; s++) { let m = 0; for (let t = Math.max(0, s - W); t <= Math.min(N, s + W); t++) m = Math.max(m, ys[t]); D[s] = m; }
  for (let s = 0; s <= N; s++) { let a = 0, c = 0; for (let t = Math.max(0, s - W); t <= Math.min(N, s + W); t++) { a += D[t]; c++; } ys[s] = a / c; }
  // los extremos son exactamente la cámara de salida y la de llegada (sin bajar de lo requerido cerca del destino)
  for (let s = 0; s <= N; s++) { const u = s / N, a = smooth(0, 0.1, u), b = 1 - smooth(0.9, 1, u); let y = p0.y + (ys[s] - p0.y) * a; y = p1.y + (y - p1.y) * b; if (u > 0.9) y = Math.max(y, req[s] - g * 0.6); ys[s] = y; }
  ys[0] = p0.y; ys[N] = p1.y;
  return { N, xs, zs, ys, c0: c0.clone(), c1: c1.clone(), dur: Math.max(2.8, Math.min(6.5, 2.4 + dist / 1400 + Math.max(0, crucero - Math.max(p0.y, p1.y)) / 500)) };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const suave = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

function volar(plan, fin) {
  vuelo = { plan, t: 0, fin };
  if (T3.orbit) { if (orbitaOn == null) orbitaOn = T3.orbit.enabled; T3.orbit.enabled = false; }
  const cam = T3.camera, alto = Math.max(...plan.ys); if (cam.far < alto * 30 && cam.far < 60000) { cam.far = Math.min(60000, Math.max(cam.far, alto * 30)); cam.updateProjectionMatrix(); }
}
function soltarControl() { if (T3.orbit && orbitaOn != null) { T3.orbit.enabled = orbitaOn; orbitaOn = null; } }

function paso() {
  const ahora = performance.now(), dt = tPrev ? Math.min(1 / 30, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
  if (marca && marca.visible) { const f = (ahora / 1000) % 1.6 / 1.6; marca.userData.anillo.scale.setScalar(10 + f * 46); marca.userData.anillo.material.opacity = 0.75 * (1 - f); }
  if (!vuelo && !(orbita && orbita.on)) return;
  if (T3.anim) { // otro módulo tomó la cámara: se cancela el vuelo y la órbita
    if (vuelo) { const f = vuelo.fin; vuelo = null; soltarControl(); f && f(false); } if (orbita) orbita.on = false; return; }
  const cam = T3.camera, tg = T3.orbit.target;
  if (vuelo) {
    const v = vuelo, P = v.plan; v.t += dt; const u = Math.min(1, v.t / P.dur), e = suave(u), f = e * P.N, s = Math.min(P.N - 1, Math.floor(f)), r = f - s;
    cam.position.set(P.xs[s] + (P.xs[s + 1] - P.xs[s]) * r, P.ys[s] + (P.ys[s + 1] - P.ys[s]) * r, P.zs[s] + (P.zs[s + 1] - P.zs[s]) * r);
    tg.lerpVectors(P.c0, P.c1, suave(Math.min(1, u * 1.08)));
    cam.lookAt(tg);
    if (u >= 1) { const fin = v.fin; vuelo = null; soltarControl(); T3.orbit.update && T3.orbit.update(); fin && fin(true); }
    return;
  }
  // órbita lenta alrededor del punto
  const o = orbita; o.th += dt * 0.07;
  cam.position.set(o.c.x + Math.cos(o.th) * o.rh, o.y, o.c.z + Math.sin(o.th) * o.rh); tg.copy(o.c); cam.lookAt(tg);
}

/* ---------- marca en el piso y tarjeta ---------- */
function ponerMarca(x, z, color) {
  const y0 = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.6, c = new THREE.Color(color);
  if (!marca) {
    marca = new THREE.Group(); marca.name = 'ojo_marca';
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.2, 1, 8, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    haz.scale.set(1, 140, 1); haz.renderOrder = 15;
    const an = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    an.renderOrder = 15; marca.add(haz, an); marca.userData = { haz, anillo: an }; marca.traverse(m => { m.frustumCulled = false; });
    T3.scene.add(marca);
  }
  marca.position.set(x, y0, z); marca.userData.haz.material.color.copy(c); marca.userData.anillo.material.color.copy(c); marca.visible = true;
}
function mostrarTarjeta(titulo, texto, color) {
  if (!tarjeta) {
    tarjeta = document.createElement('section'); tarjeta.id = 'ojo-t'; tarjeta.setAttribute('role', 'dialog'); tarjeta.setAttribute('aria-live', 'polite');
    document.body.appendChild(tarjeta);
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  tarjeta.style.setProperty('--ojo-c', color);
  tarjeta.innerHTML = `<div class="oj-h">Ojo de Dios</div><h3 class="oj-t">${esc(titulo)}</h3>${texto ? `<p class="oj-x">${esc(texto)}</p>` : ''}<button type="button">Cerrar</button>`;
  tarjeta.querySelector('button').onclick = () => cerrar();
  tarjeta.style.display = ''; requestAnimationFrame(() => tarjeta.classList.add('on'));
}
function quitarTarjeta() { if (tarjeta) { tarjeta.classList.remove('on'); const t = tarjeta; setTimeout(() => { if (!t.classList.contains('on')) t.style.display = 'none'; }, 380); } }

/* ---------- API ---------- */
async function ir({ x, z, titulo = '', texto = '', color = '#ffb347' } = {}) {
  if (!armar()) throw new Error('KEN_OJO: el 3D aún no está listo');
  if (!isFinite(x) || !isFinite(z)) throw new Error('KEN_OJO.ir: x, z inválidos');
  await armarAlturas();
  const V = THREE.Vector3, cam = T3.camera, y0 = T3.sueloY != null ? T3.sueloY : 0;
  if (!casa) casa = { p: cam.position.clone(), c: T3.orbit.target.clone() };
  orbita = null; quitarTarjeta();
  // llega desde el lado por donde viene (si está casi encima, desde el sur)
  let dx = cam.position.x - x, dz = cam.position.z - z; const dh = Math.hypot(dx, dz); if (dh < 50) { dx = 0; dz = 1; } else { dx /= dh; dz /= dh; }
  const rh = R_FIN * Math.cos(ELEV); let yF = y0 + R_FIN * Math.sin(ELEV);
  const pF = new V(x + dx * rh, yF, z + dz * rh); pF.y = Math.max(yF, alturaEn(pF.x, pF.z, 1) + MARGEN);
  const c1 = new V(x, y0, z);
  ponerMarca(x, z, color);
  const ok = await new Promise(res => volar(planear(cam.position.clone(), T3.orbit.target.clone(), pF, c1), res));
  if (!ok) return false;
  orbita = { on: true, c: c1, rh, y: pF.y, th: Math.atan2(dz, dx) };
  mostrarTarjeta(titulo, texto, color);
  return true;
}
async function cerrar() {
  if (!armado) return false;
  quitarTarjeta(); orbita = null; if (marca) marca.visible = false;
  if (!casa) return true;
  const destino = casa; casa = null;
  await armarAlturas();
  return new Promise(res => volar(planear(T3.camera.position.clone(), T3.orbit.target.clone(), destino.p.clone(), destino.c.clone()), res));
}

window.KEN_OJO = { ir, cerrar, alturaEn: (x, z) => alturaEn(x, z, 0), get volando() { return !!vuelo; } };
export default window.KEN_OJO;
