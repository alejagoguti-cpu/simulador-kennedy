/* ============ MOMENTO DE LA MUERTE · marca en pantalla + zoom con la reconstrucción ============
   Lo usa data3d/ojo_dios.js cuando la cámara llega a un animal muerto (aviso «Murió…», atropello o choque contra un edificio):
   · MARCA: corchetes en las cuatro esquinas, proyectados cada cuadro desde la posición del animal en el mundo, con una etiqueta
     (especie, causa, año y semana).
   · ZOOM DEL MOMENTO: un recuadro de vidrio unido a la marca por una línea fina, con una escena 3D pequeña (un WebGLRenderer aparte,
     ~360×240, a 30 cuadros/s y solo mientras está abierto) que RECONSTRUYE cómo pasó:
       atropello  → un carro por la vía golpea al animal que cruza; el animal sale despedido y queda en la calzada.
       colision   → un ave vuela contra la fachada (altura en pisos del detalle del modelo; vidrio en torres y estaciones) y cae a la acera.
       ruido / hambre_habitat / desaparición → el parche se vuelve inhabitable (ruido de la vía o pérdida de árboles) y el ave se va.
     Es ilustrativa: el modelo es semanal y estadístico, no registra el vehículo ni el instante exactos (se dice en el recuadro).
   abrirMomento({ T3, x, y, z, causa, detalle, nombre, sem, lugar, alCerrar }) · cerrarMomento() · alasAve(L, colorHex) */

let T3 = null, THREE = null, capa = null, svg = null, brk = null, lin = null, pto = null, etq = null, zoom = null, cv = null, faseEl = null, barEl = null, btnP = null;
let ren = null, escena = null, cam = null, dio = null, abierto = null, raf = 0, tRen = 0, tPrev = 0, tA = 0, pausado = false, lado = null;
const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const sm = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const CAUSA_TXT = { atropello: 'Atropello', colision: 'Colisión', ruido: 'Ruido', hambre_habitat: 'Pérdida de hábitat', desaparicion: 'Desaparición' };

const CSS = `
#mm-capa{position:fixed;inset:0;z-index:43;pointer-events:none}
#mm-capa svg.mm-s{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#mm-capa .mm-b{fill:none;stroke:var(--ui-acc,#c6e2a6);stroke-width:1.5;stroke-linecap:square;filter:drop-shadow(0 0 2px rgba(0,0,0,.65))}
#mm-capa .mm-l{stroke:var(--ui-acc,#c6e2a6);stroke-width:1;opacity:.85;filter:drop-shadow(0 0 1.5px rgba(0,0,0,.7))}
#mm-capa .mm-p{fill:var(--ui-acc,#c6e2a6)}
#mm-capa .mm-et{position:absolute;left:0;top:0;padding:5px 8px 6px;border-radius:8px;white-space:nowrap;color:var(--ui-tx,#eef0ea);
  background:var(--ui-glass,rgba(32,37,35,.78));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));-webkit-backdrop-filter:var(--ui-glass-fx,blur(14px));backdrop-filter:var(--ui-glass-fx,blur(14px))}
#mm-capa .mm-et small{display:block;font:500 9.5px/1.3 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--ui-tx3,#a3ad9a)}
#mm-capa .mm-et b{display:block;font:600 13px/1.25 var(--ui-sans,'Inter',system-ui,sans-serif)}
#mm-capa .mm-z{position:absolute;left:0;top:0;pointer-events:auto;box-sizing:border-box;width:376px;padding:8px;border-radius:14px;color:var(--ui-tx,#eef0ea);
  font:400 11.5px/1.4 var(--ui-sans,'Inter',system-ui,sans-serif);background:var(--ui-glass,rgba(32,37,35,.82));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  box-shadow:var(--ui-glass-sh,0 14px 38px rgba(0,0,0,.3));-webkit-backdrop-filter:var(--ui-glass-fx,blur(18px));backdrop-filter:var(--ui-glass-fx,blur(18px))}
#mm-capa .mm-zh{display:flex;align-items:flex-start;gap:8px;padding:2px 2px 7px}
#mm-capa .mm-zh div{flex:1;min-width:0}
#mm-capa .mm-zh small{display:block;font:500 9.5px/1.3 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--ui-tx3,#a3ad9a)}
#mm-capa .mm-zh b{display:block;font-weight:600;font-size:12.5px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mm-capa button{all:unset;box-sizing:border-box;cursor:pointer;height:26px;padding:0 10px;border-radius:7px;border:1px solid var(--ui-bd,rgba(255,255,255,.18));font:500 11px/24px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#eef0ea);transition:background-color .15s}
#mm-capa button:hover{background:rgba(255,255,255,.1)}
#mm-capa button:focus-visible{outline:2px solid var(--ui-acc,#c6e2a6);outline-offset:2px}
#mm-capa button.mm-x{background:var(--ui-acc,#c6e2a6);color:var(--ui-acc-ink,#162012);border-color:transparent}
#mm-capa .mm-v{position:relative;border-radius:9px;overflow:hidden;background:#1d2326;line-height:0}
#mm-capa .mm-v canvas{display:block;width:100%;height:auto}
#mm-capa .mm-f{position:absolute;left:8px;bottom:8px;padding:3px 7px;border-radius:6px;background:rgba(10,13,12,.62);font:500 10.5px/1.3 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.02em;color:#e8ece4}
#mm-capa .mm-r{position:absolute;right:8px;top:8px;padding:2px 6px;border-radius:5px;border:1px solid rgba(255,255,255,.28);font:500 9px/1.3 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(240,242,235,.8)}
#mm-capa .mm-zf{display:flex;align-items:center;gap:9px;padding:8px 2px 1px}
#mm-capa .mm-bar{flex:1;height:2px;border-radius:1px;background:rgba(255,255,255,.14);overflow:hidden}
#mm-capa .mm-bar i{display:block;height:100%;width:100%;transform-origin:0 50%;background:var(--ui-acc,#c6e2a6)}
#mm-capa .mm-n{margin:5px 2px 0;font-size:10px;line-height:1.3;color:var(--ui-tx3,#a3ad9a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:no-preference){#mm-capa.on .mm-z,#mm-capa.on .mm-et,#mm-capa.on svg{animation:mm-in .35s ease-out both}@keyframes mm-in{from{opacity:0}to{opacity:1}}}
@media (max-width:700px){#mm-capa .mm-z{width:auto}#mm-capa .mm-n{display:none}}
`;

/* alas planas (un ave vista desde arriba se reconoce por las alas): forma afilada en el plano xz, hacia ±z; adelante = +x */
export function alasAve(L, color) {
  if (!THREE) THREE = window.KEN_T3.THREE;
  const mk = (s) => { const g = new THREE.BufferGeometry(), v = [0.2 * L, 0, 0, -0.14 * L, 0, 0, -0.34 * L, 0, s * 0.86 * L, -0.02 * L, 0, s * 0.74 * L];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]); g.computeVertexNormals(); return g; };
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
  return [new THREE.Mesh(mk(1), m), new THREE.Mesh(mk(-1), m)];
}
const colorMedio = (geo) => { const C = geo.attributes.color; if (!C) return 0x6b5a48; let r = 0, g = 0, b = 0; const n = C.count, p = Math.max(1, Math.floor(n / 400)); let k = 0; for (let i = 0; i < n; i += p) { r += C.getX(i); g += C.getY(i); b += C.getZ(i); k++; } return new THREE.Color(r / k * 0.85, g / k * 0.85, b / k * 0.85); };

/* animal para la escena: grupo con origen abajo al centro, adelante = +x; alas con bisagra (rotation.x) si es ave */
function animal(nombre, largo) {
  const B = window.KEN_BIO_MODELO ? window.KEN_BIO_MODELO(nombre) : null, g = new THREE.Group(); let ave = !!(B && B.ave), alas = null, alto = 0.4;
  if (B && B.geo) {
    const geo = B.geo; if (!geo.boundingBox) geo.computeBoundingBox(); const bb = geo.boundingBox, L = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z, 1e-3), k = largo / L;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: !!geo.attributes.color, roughness: 0.8, side: THREE.DoubleSide }));
    m.scale.setScalar(k); m.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k); g.add(m); alto = (bb.max.y - bb.min.y) * k;
    if (ave) { alas = alasAve(largo, colorMedio(geo)).map(a => { const p = new THREE.Group(); p.position.y = alto * 0.6; p.add(a); g.add(p); return p; }); }
  } else { // sin modelo: cuerpo simple
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8).scale(largo, largo * 0.45, largo * 0.42), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.8 }));
    m.position.y = largo * 0.22; g.add(m); alto = largo * 0.45; ave = true; alas = alasAve(largo, 0x5a4a3c).map(a => { const p = new THREE.Group(); p.position.y = alto * 0.6; p.add(a); g.add(p); return p; });
  }
  return { g, ave, alas, alto };
}
const aletear = (A, t, f = 9, amp = 0.75) => { if (!A.alas) return; const a = Math.sin(t * f * Math.PI * 2 / 3) * amp; A.alas[0].rotation.x = -a; A.alas[1].rotation.x = a; };
const plegar = (A, a = 0) => { if (!A.alas) return; A.alas[0].rotation.x = -a; A.alas[1].rotation.x = a; };

/* ---------- piezas de la maqueta ---------- */
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, o));
const caja = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); return m; };
const sombra = (w, d, op = 0.35) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).scale(w, d, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: op, depthWrite: false })); m.position.y = 0.03; m.renderOrder = 2; return m; };
function arbol(x, z, h = 5) { const g = new THREE.Group(); g.add(caja(0.28, h * 0.45, 0.28, M(0x5b4636), 0, 0, 0)); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.3, 1), M(0x4d6b3c, { flatShading: true })); c.position.y = h * 0.62; g.add(c); g.position.set(x, 0, z); g.userData.copa = c; return g; }
function carroSimple() { // carro de pocos polígonos (largo sobre z, frente +z, ruedas en y = 0)
  const g = new THREE.Group(), p = M(0x34414f, { roughness: 0.45, metalness: 0.3 }), v = M(0x1a2228, { roughness: 0.15, metalness: 0.4 }), n = M(0x141414);
  g.add(caja(1.8, 0.62, 4.3, p, 0, 0.3, 0)); g.add(caja(1.58, 0.52, 2.1, v, 0, 0.92, -0.25));
  for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.3], [0.86, -1.3]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(Math.PI / 2), n); r.position.set(x, 0.33, z); g.add(r); }
  return g;
}
let pCarro = null;
function carroReal() { // el Ferrari del tráfico (data3d/vehiculos.js), si ya está bajado; si no, el simple
  if (!pCarro) pCarro = (window.KEN_PROMESA_CARRO ? Promise.race([window.KEN_PROMESA_CARRO, new Promise(r => setTimeout(() => r(null), 1500))]) : Promise.resolve(null)).catch(() => null);
  return pCarro.then(K => {
    if (!K || !K.pintura) return null;
    const g = new THREE.Group(), mats = { pintura: M(0x3a4756, { vertexColors: true, roughness: 0.35, metalness: 0.4 }), vidrio: M(0x1b2229, { roughness: 0.08, metalness: 0.5 }), partes: M(0xffffff, { vertexColors: true, roughness: 0.8 }), metal: M(0xd4d7db, { metalness: 0.9, roughness: 0.3 }), luces: M(0xffffff, { vertexColors: true, roughness: 0.2 }) };
    const bb = new THREE.Box3(); for (const k in K) if (K[k] && mats[k]) { const m = new THREE.Mesh(K[k], mats[k]); g.add(m); if (!K[k].boundingBox) K[k].computeBoundingBox(); bb.union(K[k].boundingBox); }
    const L = bb.max.z - bb.min.z; if (L > 0.1) g.scale.setScalar(4.5 / L); return g;
  });
}
function anillo(color = 0xf1f4ec) { const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 3; return m; }
function texVentanas(cols, filas, vidrio) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = vidrio ? '#5d7584' : '#bdb6a8'; x.fillRect(0, 0, 256, 256);
  const w = 256 / cols, h = 256 / filas;
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
    if (vidrio) { x.fillStyle = (i + j) % 3 ? '#6f8b9b' : '#7d99a8'; x.fillRect(i * w + 1, j * h + 1, w - 2, h - 2); }
    else { x.fillStyle = (i * 7 + j * 3) % 5 ? '#3c4a54' : '#56646c'; x.fillRect(i * w + w * 0.18, j * h + h * 0.22, w * 0.64, h * 0.56); }
  }
  if (vidrio) { x.strokeStyle = '#2b3338'; x.lineWidth = 2; for (let i = 0; i <= cols; i++) { x.beginPath(); x.moveTo(i * w, 0); x.lineTo(i * w, 256); x.stroke(); } for (let j = 0; j <= filas; j++) { x.beginPath(); x.moveTo(0, j * h); x.lineTo(256, j * h); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function texGrieta() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = 'rgba(245,248,250,.9)'; x.lineWidth = 1.4;
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + (k % 2) * 0.3; let px = 64, py = 64; x.beginPath(); x.moveTo(px, py); for (let s = 1; s <= 3; s++) { const r = 16 * s + (k % 3) * 4, d = a + (s % 2 ? 0.15 : -0.12); px = 64 + Math.cos(d) * r; py = 64 + Math.sin(d) * r; x.lineTo(px, py); } x.stroke(); }
  x.beginPath(); x.arc(64, 64, 15, 0, Math.PI * 2); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- las tres reconstrucciones: { g, dur, tClave, cam:{p,t}, paso(t) → texto de la fase } ---------- */
function escenaAtropello(nombre, via) {
  const g = new THREE.Group();
  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2), M(0x4a5c3e)); pasto.position.y = -0.02; g.add(pasto);
  g.add(caja(120, 0.04, 7, M(0x3a3d41), 0, 0, 0));
  const bl = M(0xe9ebe6, { roughness: 0.6 }); for (let x = -60; x < 60; x += 6) g.add(caja(2.6, 0.012, 0.14, bl, x, 0.04, 0));
  for (const s of [-1, 1]) { g.add(caja(120, 0.012, 0.12, bl, 0, 0.04, s * 3.3)); g.add(caja(120, 0.16, 2.6, M(0x9b9c95), 0, 0, s * 4.8)); }
  for (const [x, z] of [[-14, -8.5], [-3, -9], [9, -8.2], [20, -9], [-8, 8.6], [14, 8.4]]) g.add(arbol(x, z, 5 + (x % 3)));
  const A = animal(nombre, 1.5); g.add(A.g); const sA = sombra(1.3, 0.8, 0.3); g.add(sA);
  const ca = new THREE.Group(); ca.add(carroSimple()); const sC = sombra(2.6, 5.2, 0.4); ca.add(sC); g.add(ca);
  carroReal().then(R => { if (R) { ca.remove(ca.children[0]); ca.add(R); } });
  ca.rotation.y = Math.PI / 2; // frente del carro (+z) → +x
  const an = anillo(); an.position.set(0.3, 0.06, -1.75); g.add(an);
  const H = 3.2, LANE = -1.75, ZS = A.ave ? 3.0 : 1.5;
  return { g, dur: 7.2, tClave: H + 0.12, cam: { p: [-7, 4.6, 9.5], t: [1.2, 0.5, -0.8] },
    paso(t, camara) {
      camara.position.x = -7 + Math.sin(t * 0.35) * 0.5;
      ca.position.set((t - H) * 13 - 2.4, 0, LANE); ca.visible = ca.position.x < 40;
      if (t < H) { const z = LANE + (H - t) * ZS; A.g.position.set(0.3, A.ave ? 0.75 + Math.sin(t * 9) * 0.06 : 0, z); A.g.rotation.set(0, Math.PI / 2, 0); A.ave ? aletear(A, t) : (A.g.position.y = Math.abs(Math.sin(t * 8)) * 0.04); }
      else { const d = t - H, k = 1.7, vx = 9.5, y0 = A.ave ? 0.75 : 0.1, vy = 2.6, tf = (vy + Math.sqrt(vy * vy + 2 * 9.8 * y0)) / 9.8, en = d >= tf;
        A.g.position.set(0.3 + vx * (1 - Math.exp(-k * d)) / k, en ? 0 : Math.max(0, y0 + vy * d - 4.9 * d * d), LANE - Math.min(d, 1) * 0.6);
        const giro = en ? 0 : (1 - d / tf) * Math.PI * 3; A.g.rotation.set(Math.PI / 2 * sm(0, tf, d), Math.PI / 2 + 0.5, giro); plegar(A, en ? 0.1 : 0.9); }
      sA.position.set(A.g.position.x, 0.05, A.g.position.z); sA.material.opacity = 0.3 * (1 - cl(A.g.position.y / 2, 0, 0.8));
      const r = t - H; an.visible = r > 0 && r < 0.9; if (an.visible) { an.scale.setScalar(0.4 + r * 3); an.material.opacity = 0.7 * (1 - r / 0.9); }
      return t < H - 0.5 ? `1 · Cruza la ${via || 'vía'}` : t < H + 0.7 ? '2 · El carro no alcanza a frenar' : '3 · Queda sobre la calzada';
    } };
}
function escenaColision(nombre, detalle) {
  const g = new THREE.Group(), d = String(detalle || ''), pis = +(d.match(/(\d+)\s*pisos/) || [])[1] || 0, est = /estaci/i.test(d), torre = /torre/i.test(d), vidrio = est || torre || /vidrio/i.test(d);
  const H = est ? 9 : torre ? 48 : cl(pis * 3 || 15, 9, 60), filas = Math.max(3, Math.round(H / 3)), hI = cl(H * 0.4, 3.6, 8.5);
  const pasto = new THREE.Mesh(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2), M(0x4a5c3e)); pasto.position.y = -0.02; g.add(pasto);
  g.add(caja(60, 0.16, 3.4, M(0x9b9c95), 0, 0, 1.7)); g.add(caja(60, 0.04, 8, M(0x3a3d41), 0, 0, 7.4));
  g.add(caja(26, H, 14, M(vidrio ? 0x4f626d : 0xb4ad9f), 0, 0, -7));
  const tx = texVentanas(est ? 10 : 8, filas, vidrio); tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  const fach = new THREE.Mesh(new THREE.PlaneGeometry(26, H), M(0xffffff, { map: tx, roughness: vidrio ? 0.18 : 0.85, metalness: vidrio ? 0.35 : 0 })); fach.position.set(0, H / 2, 0.01); g.add(fach);
  g.add(arbol(-12, 4.5, 6.5)); g.add(arbol(13, 4.2, 5.5));
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: texGrieta(), transparent: true, opacity: 0, depthWrite: false })); gr.position.set(0.5, hI, 0.03); gr.renderOrder = 3; g.add(gr);
  const A = animal(nombre, 1.5); g.add(A.g); const sA = sombra(1.2, 0.8, 0.3); g.add(sA);
  const T = 2.8, P0 = new THREE.Vector3(-15, hI + 2.6, 13), P1 = new THREE.Vector3(0.5, hI, 0.45), dir = P1.clone().sub(P0), rotY = Math.atan2(-dir.z, dir.x), tf = Math.sqrt(2 * hI / 9.8);
  return { g, dur: 3 + tf + 2.2, tClave: T + 0.1, cam: { p: [8, hI * 0.55 + 2.5, 11.5], t: [-1.5, hI * 0.5, 0] },
    paso(t, camara) {
      camara.position.x = 8 + Math.sin(t * 0.3) * 0.5;
      if (t < T) { const u = t / T; A.g.position.lerpVectors(P0, P1, u); A.g.position.y += Math.sin(u * Math.PI) * 0.8; A.g.rotation.set(0, rotY, 0); aletear(A, t); }
      else { const e = t - T, en = e >= tf; A.g.position.set(0.5 + Math.min(e, tf) * 0.4, en ? 0.16 : Math.max(0.16, hI - 4.9 * e * e), 0.45 + Math.min(e, tf) * 0.7);
        A.g.rotation.set(Math.PI / 2 * sm(0, tf, e), rotY + 1.2, en ? 0 : e * 7); plegar(A, en ? 0.05 : 0.9); }
      sA.position.set(A.g.position.x, 0.2, A.g.position.z); sA.material.opacity = A.g.position.y < 1 ? 0.3 : 0.08;
      gr.material.opacity = t > T ? 0.85 * sm(T, T + 0.25, t) : 0;
      return t < T - 0.4 ? `1 · Vuela hacia ${vidrio ? 'el vidrio' : 'la fachada'}${pis && !est && !torre ? ' (' + pis + ' pisos)' : ''}` : t < T + 0.5 ? (vidrio ? '2 · No ve el vidrio y choca' : '2 · Choca contra la fachada') : '3 · Cae a la acera';
    } };
}
function escenaAbandono(nombre, causa) {
  const g = new THREE.Group(), ruido = causa === 'ruido';
  const mP = M(0x4f6440), pasto = new THREE.Mesh(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2), mP); pasto.position.y = -0.02; g.add(pasto);
  g.add(caja(120, 0.04, 7, M(0x3a3d41), 0, 0, -10));
  const ar = [arbol(-3, 0, 6), arbol(2.5, -1.5, 5), arbol(5.5, 2, 4.6), arbol(-6.5, 3, 4.8)]; ar.forEach(a => g.add(a));
  const A = animal(nombre, 1.4); g.add(A.g);
  const cs = [0, 1, 2].map(i => { const c = carroSimple(); c.rotation.y = Math.PI / 2; g.add(c); return c; });
  const an = [0, 1, 2].map(() => { const a = anillo(0xe9d8a6); g.add(a); return a; });
  const pos0 = new THREE.Vector3(-3, 6 * 0.62 + 6 * 0.3 - 0.2, 0), pos1 = new THREE.Vector3(22, 13, 9), TS = 3.6;
  const verde = new THREE.Color(0x4f6440), seco = new THREE.Color(0x7a6e52);
  return { g, dur: 7, tClave: 2.6, cam: { p: [-1, 7.5, 15], t: [0.5, 2.6, -2] },
    paso(t) {
      cs.forEach((c, i) => { c.position.set(((t * 11 + i * 27) % 80) - 40, 0, -10 + (i % 2 ? 1.7 : -1.7)); c.visible = ruido || true; });
      an.forEach((a, i) => { const r = ((t + i * 1.4) % 4.2) / 4.2; a.visible = ruido; a.position.set(-2, 0.08, -10); a.scale.setScalar(2 + r * 16); a.material.opacity = 0.35 * (1 - r); });
      if (!ruido) { const f = sm(0.4, 3.4, t); ar.forEach((a, i) => { if (i) { a.scale.setScalar(1 - f * 0.85); } a.userData.copa.material.color.setHex(0x4d6b3c).lerp(seco, f); }); mP.color.copy(verde).lerp(seco, f); }
      if (t < TS) { A.g.position.copy(pos0); A.g.rotation.set(0, 0.4 + Math.sin(t * 1.3) * 0.25, 0); plegar(A, 0); }
      else { const u = sm(TS, TS + 2.4, t); A.g.position.lerpVectors(pos0, pos1, u); A.g.position.y += Math.sin(u * Math.PI) * 1.5; A.g.rotation.set(0, Math.atan2(-(pos1.z - pos0.z), pos1.x - pos0.x), 0); aletear(A, t); A.g.visible = u < 0.98; }
      if (t < TS) A.g.visible = true;
      return t < TS - 0.6 ? (ruido ? '1 · El ruido de la vía no la deja oír ni cantar' : '1 · El parche pierde árboles y alimento') : t < TS + 1.2 ? '2 · Se va del lugar' : '3 · Población local perdida';
    } };
}

/* ---------- DOM ---------- */
function armarDom() {
  if (capa) return;
  if (!document.getElementById('mm-css')) { const s = document.createElement('style'); s.id = 'mm-css'; s.textContent = CSS; document.head.appendChild(s); }
  capa = document.createElement('div'); capa.id = 'mm-capa'; capa.hidden = true;
  capa.innerHTML = `<svg class="mm-s" aria-hidden="true"><line class="mm-l"/><circle class="mm-p" r="2.5"/><path class="mm-b"/></svg>
    <div class="mm-et"><small></small><b></b></div>
    <section class="mm-z" role="dialog" aria-label="Reconstrucción del momento">
      <div class="mm-zh"><div><small>Zoom del momento</small><b></b></div><button type="button" class="mm-x" title="Cerrar y seguir la simulación">Seguir</button></div>
      <div class="mm-v"><canvas></canvas><span class="mm-r" title="Ilustrativa: el modelo es semanal y no registra el vehículo ni el instante exactos">Reconstrucción</span><span class="mm-f"></span></div>
      <div class="mm-zf"><button type="button" class="mm-pp">Pausar</button><div class="mm-bar"><i></i></div></div>
      <p class="mm-n">Reconstrucción ilustrativa: el modelo es semanal y no registra cada vehículo ni el instante.</p>
    </section>`;
  document.body.appendChild(capa);
  svg = capa.querySelector('svg'); brk = capa.querySelector('.mm-b'); lin = capa.querySelector('.mm-l'); pto = capa.querySelector('.mm-p'); etq = capa.querySelector('.mm-et');
  zoom = capa.querySelector('.mm-z'); cv = capa.querySelector('canvas'); faseEl = capa.querySelector('.mm-f'); barEl = capa.querySelector('.mm-bar i'); btnP = capa.querySelector('.mm-pp');
  capa.querySelector('.mm-x').onclick = () => { const a = abierto; cerrarMomento(); a && a.alCerrar && a.alCerrar(); };
  btnP.onclick = () => { pausado = !pausado; if (!pausado && dio && tA >= dio.dur - 0.05) tA = 0; btnP.textContent = pausado ? 'Reproducir' : 'Pausar'; };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierto && !e.defaultPrevented) { const a = abierto; cerrarMomento(); a.alCerrar && a.alCerrar(); } });
}
function armarRender() {
  if (ren) return;
  ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' });
  ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.outputColorSpace = THREE.SRGBColorSpace;
  cam = new THREE.PerspectiveCamera(38, 1.5, 0.1, 200);
}
function medidas() { const mov = innerWidth <= 700, W = mov ? Math.min(innerWidth - 24, 440) - 16 : 360, H = mov ? Math.round(W * 0.5) : 204; return { W, H, mov }; }

export async function abrirMomento(o) {
  T3 = o.T3 || window.KEN_T3; THREE = T3.THREE; armarDom(); armarRender(); cerrarMomento(true);
  const causa = o.causa || 'desaparicion', ap = o.sem != null ? `A${String(Math.floor(o.sem / 52) + 1).padStart(2, '0')} · S${String(o.sem % 52 + 1).padStart(2, '0')}` : '';
  const via = (String(o.detalle || '').match(/en la ([^,]+)/) || String(o.titulo || '').match(/en la ([^:]+):/) || [])[1] || '';
  dio = causa === 'atropello' ? escenaAtropello(o.nombre, via) : causa === 'colision' ? escenaColision(o.nombre, o.detalle) : escenaAbandono(o.nombre, causa);
  escena = new THREE.Scene(); escena.background = new THREE.Color(0x232a2d); escena.fog = new THREE.Fog(0x232a2d, 34, 80);
  escena.add(new THREE.HemisphereLight(0xdfe8ef, 0x45473c, 1.25)); const sol = new THREE.DirectionalLight(0xfff3e2, 2.1); sol.position.set(8, 16, 9); escena.add(sol);
  escena.add(dio.g); cam.position.set(...dio.cam.p); cam.lookAt(...dio.cam.t); cam.userData.t = new THREE.Vector3(...dio.cam.t);
  const { W, H } = medidas(); ren.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
  etq.querySelector('small').textContent = [ap, CAUSA_TXT[causa] || ''].filter(Boolean).join(' · ');
  etq.querySelector('b').textContent = o.nombre || 'Animal';
  zoom.querySelector('.mm-zh b').textContent = (CAUSA_TXT[causa] || 'Muerte') + (causa === 'atropello' && via ? ' en la ' + via : o.lugar ? ' · ' + o.lugar : '');
  pausado = RM(); tA = pausado ? dio.tClave : 0; btnP.textContent = pausado ? 'Reproducir' : 'Pausar'; lado = null;
  abierto = o; capa.hidden = false; capa.classList.remove('on'); void capa.offsetWidth; capa.classList.add('on');
  /* la primera vez los shaders de la maqueta se compilan en paralelo (sin trabar el cuadro del mapa) antes de empezar a dibujar */
  if (ren.compileAsync) { const yo = o; try { await ren.compileAsync(escena, cam); } catch (e) { /* se compilan al dibujar */ } if (abierto !== yo) return; }
  tPrev = performance.now(); tRen = 0; raf = requestAnimationFrame(cuadro);
}
export function cerrarMomento() {
  if (raf) cancelAnimationFrame(raf); raf = 0; abierto = null; if (capa) capa.hidden = true;
  if (escena) { escena.traverse(m => { if (m.isMesh) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); if (!m.geometry.userData.compartida && m.geometry.type !== 'BufferGeometry') m.geometry.dispose(); } }); escena = null; dio = null; }
}

const V3 = () => new THREE.Vector3();
let _v = null, _r = null;
function cuadro(ahora) {
  raf = requestAnimationFrame(cuadro); if (!abierto) return;
  const dt = Math.min(0.1, (ahora - tPrev) / 1000); tPrev = ahora;
  marca();
  if (ahora - tRen < 32) return; tRen = ahora; // la reconstrucción va a ~30 cuadros/s
  if (!pausado) { tA += dt * 1; if (tA > dio.dur + 0.8) tA = 0; } // pausa corta al final y repite
  const fase = dio.paso(Math.min(tA, dio.dur), cam); cam.lookAt(cam.userData.t);
  faseEl.textContent = fase; barEl.style.transform = `scaleX(${Math.min(1, tA / dio.dur)})`;
  const r0 = performance.now(); ren.render(escena, cam); window.KEN_MOMENTO = { ms: +(performance.now() - r0).toFixed(2), fase };
}
function marca() {
  const C = T3.camera, el = T3.renderer.domElement.getBoundingClientRect(), o = abierto;
  _v = _v || V3(); _r = _r || V3();
  _v.set(o.x, o.y, o.z).project(C); const vis = _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2;
  const sx = el.left + (_v.x + 1) / 2 * el.width, sy = el.top + (1 - _v.y) / 2 * el.height;
  _r.setFromMatrixColumn(C.matrixWorld, 0).multiplyScalar(3).add(new THREE.Vector3(o.x, o.y, o.z)).project(C);
  const h = cl(Math.hypot((_r.x - _v.x) / 2 * el.width, (_r.y - _v.y) / 2 * el.height), 30, 110), c = Math.max(8, h * 0.34);
  svg.style.visibility = etq.style.visibility = vis ? '' : 'hidden';
  brk.setAttribute('d', `M${sx - h},${sy - h + c}V${sy - h}H${sx - h + c}M${sx + h - c},${sy - h}H${sx + h}V${sy - h + c}M${sx + h},${sy + h - c}V${sy + h}H${sx + h - c}M${sx - h + c},${sy + h}H${sx - h}V${sy + h - c}`);
  // etiqueta a la derecha de la marca (a la izquierda si no cabe)
  const ew = etq.offsetWidth, eh = etq.offsetHeight; let ex = sx + h + 10, ey = sy - h; if (ex + ew > innerWidth - 8) ex = sx - h - 10 - ew;
  if (ex < 8) { ex = cl(sx - ew / 2, 8, innerWidth - ew - 8); ey = sy + h + 8; } // no cabe a los lados (celular): debajo de la marca
  etq.style.transform = `translate(${Math.round(ex)}px,${Math.round(ey)}px)`;
  // zoom: escoge un lado libre (izquierda arriba, derecha arriba, izquierda abajo, derecha abajo) entre el panel izquierdo y el feed
  const { W, mov } = medidas(); zoom.style.width = (W + 16) + 'px'; const zw = zoom.offsetWidth, zh = zoom.offsetHeight;
  let zx, zy;
  if (mov) { zx = 12; zy = 108; /* debajo del botón del panel */ }
  else {
    const r = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return b.width && b.height ? b : null; };
    const iz = r('gs-izq'), fe = r('su-feed'), an = r('lp-anos');
    const L = (iz ? iz.right : 0) + 14, R = (fe ? fe.left : innerWidth) - 14, T = 66, B = (an ? an.top : innerHeight) - 12, g = 96;
    const cand = { io: [sx - h - g - zw, sy - h - g - zh + 40], do: [sx + h + g, sy - h - g - zh + 40], ia: [sx - h - g - zw, sy + h + g - 40], da: [sx + h + g, sy + h + g - 40] };
    const cabe = (p) => p[0] >= L && p[0] + zw <= R && p[1] >= T && p[1] + zh <= B;
    if (!lado || !cabe(cand[lado])) lado = Object.keys(cand).find(k => cabe(cand[k])) || 'io';
    [zx, zy] = cand[lado]; zx = cl(zx, L, Math.max(L, R - zw)); zy = cl(zy, T, Math.max(T, B - zh));
  }
  zoom.style.transform = `translate(${Math.round(zx)}px,${Math.round(zy)}px)`;
  // línea guía: del borde del zoom más cercano a la marca hasta el corchete
  const px = cl(sx, zx, zx + zw), py = cl(sy, zy, zy + zh), dx = sx - px, dy = sy - py, d = Math.hypot(dx, dy) || 1, f = Math.max(0, d - h * 1.05) / d;
  lin.setAttribute('x1', px); lin.setAttribute('y1', py); lin.setAttribute('x2', px + dx * f); lin.setAttribute('y2', py + dy * f); pto.setAttribute('cx', px); pto.setAttribute('cy', py);
  lin.style.visibility = pto.style.visibility = vis && d > h * 1.4 ? '' : 'hidden';
}
