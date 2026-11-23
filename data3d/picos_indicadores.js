/* ============ PICOS DE INDICADORES EN EL PISO (para la vista limpia: data3d/limpio.js / data3d/simulaciones.js) ============
   window.KEN_PICOS_IND = { poner(nombre, valores, centros, color, titulo, opc?), ver(on), quitar() }
   · valores: Float32Array (o lista) 0..1 por zona, ya normalizados por quien llama (aquí no se inventa ni se reescala nada).
   · centros: [[x, z], ...] en coordenadas del MUNDO (T3), uno por zona.
   · color: '#hex' · titulo: texto de la leyenda · opc (opcional): { min: '0 %', max: '100 %', nota: 'altura = …' } para la escala.
   Misma estética que data3d/picos_zonas.js: agujas luminosas en capas (halo ancho y bajo, cuerpo, núcleo fino y alto) que suben
   donde el valor es mayor, dibujadas en el piso (sueloY): los edificios propios las tapan (prueba de profundidad, sin escribirla).
   Rendimiento: UNA sola malla instanciada (3 agujas por zona); al llamar poner() las alturas se animan suave (~1 s) y, cuando ya
   llegaron, no se vuelve a subir nada a la tarjeta gráfica. */
import { RELOJ } from './reloj.js?v=5';

const ALTO = 230, RADIO = 8;             // m: altura de un pico con valor 1; radio de la base del cuerpo
const CAPAS = [                          // [altura relativa, radio relativo, brillo] · halo, cuerpo, núcleo
  [0.42, 2.1, 0.2],
  [0.78, 1.0, 0.48],
  [1.0, 0.42, 0.8]
];
const K = CAPAS.length;

let T3 = null, THREE = null, mesh = null, cap = 0, n = 0, on = true, ley = null, armado = false;
let h = new Float32Array(0), meta = new Float32Array(0), cx = new Float32Array(0), cz = new Float32Array(0);
let nombreAct = '', tPrev = 0, quieto = true;
const col = { r: 1, g: 1, b: 1 };

function armar() {
  if (armado) return true;
  T3 = window.KEN_T3; if (!T3 || !T3.scene) return false; THREE = T3.THREE;
  armado = true;
  const css = document.createElement('style'); css.id = 'pi-css';
  css.textContent = `#pi-ley{position:fixed;right:16px;bottom:16px;z-index:38;box-sizing:border-box;width:min(232px,calc(100vw - 32px));padding:10px 12px 11px;border-radius:14px;
  font:400 11.5px/1.35 var(--ui-sans,'Geist','Inter',system-ui,-apple-system,'Segoe UI',sans-serif);color:var(--ui-tx,#e9ecee);font-variant-numeric:tabular-nums;pointer-events:none;
  background:var(--ui-glass,linear-gradient(160deg,rgba(38,42,50,.42),rgba(8,10,14,.55)));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  box-shadow:var(--ui-glass-sh,0 14px 34px rgba(0,0,0,.34));-webkit-backdrop-filter:var(--ui-glass-fx,blur(22px) saturate(1.5));backdrop-filter:var(--ui-glass-fx,blur(22px) saturate(1.5));transition:opacity .35s}
#pi-ley .pi-h{font:600 10px/1.2 var(--ui-sans,'Geist',system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin-bottom:5px}
#pi-ley .pi-t{font:500 15px/1.15 'Barlow Condensed',var(--ui-sans,system-ui),sans-serif;letter-spacing:.02em;margin-bottom:8px}
#pi-ley .pi-e{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:end}
#pi-ley .pi-ag{display:flex;align-items:flex-end;gap:5px;height:38px}
#pi-ley .pi-ag i{display:block;width:3px;border-radius:2px 2px 0 0;background:linear-gradient(0deg,var(--pi-c) 0%,rgba(255,255,255,.85) 100%)}
#pi-ley .pi-sc{display:flex;flex-direction:column;gap:3px}
#pi-ley .pi-b{height:4px;border-radius:3px;background:linear-gradient(90deg,rgba(255,255,255,.08),var(--pi-c))}
#pi-ley .pi-l{display:flex;justify-content:space-between;opacity:.7;font-size:10.5px}
#pi-ley .pi-n{margin-top:6px;opacity:.6;font-size:10.5px}
@media(max-width:700px){#pi-ley{right:8px;bottom:78px;width:min(210px,calc(100vw - 16px))}}`;
  document.head.appendChild(css);
  ley = document.createElement('div'); ley.id = 'pi-ley'; ley.setAttribute('role', 'note'); ley.style.display = 'none';
  document.body.appendChild(ley);
  RELOJ.alDibujar(dibujar);
  return true;
}

function crearMalla(c) {
  if (mesh) { T3.scene.remove(mesh); mesh.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); }
  const geo = new THREE.CylinderGeometry(0.1, 1, 1, 6, 1, true); geo.translate(0, 0.5, 0); // aguja: base ancha, punta fina
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  mesh = new THREE.InstancedMesh(geo, mat, c * K); mesh.name = 'picos_ind'; mesh.frustumCulled = false; mesh.renderOrder = 14; mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color(0, 0, 0));
  T3.scene.add(mesh); cap = c;
  const H = new Float32Array(c), M = new Float32Array(c), X = new Float32Array(c), Z = new Float32Array(c);
  H.set(h.subarray(0, Math.min(h.length, c))); h = H; meta = M; cx = X; cz = Z;
}

const _M = { m: null, q: null, s: null, p: null, c: null };
function dibujar() {
  if (!mesh) return;
  mesh.visible = on && n > 0; if (!mesh.visible) return;
  const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
  if (quieto) return;
  if (!_M.m) { _M.m = new THREE.Matrix4(); _M.q = new THREE.Quaternion(); _M.s = new THREE.Vector3(); _M.p = new THREE.Vector3(); _M.c = new THREE.Color(); }
  const { m: M, q: Q, s: S, p: P, c: C } = _M, y0 = T3.sueloY != null ? T3.sueloY : 0.3, k = Math.min(1, dt * 3.2);
  let mov = false;
  for (let z = 0; z < n; z++) {
    const d = meta[z] - h[z]; if (Math.abs(d) > 0.0015) { h[z] += d * k; mov = true; } else h[z] = meta[z];
    const v = h[z], alto = Math.max(0.6, v * ALTO);
    P.set(cx[z], y0, cz[z]);
    for (let j = 0; j < K; j++) {
      const [fa, fr, br] = CAPAS[j], r = RADIO * fr * (0.55 + 0.45 * Math.sqrt(Math.max(0, v)));
      S.set(r, Math.max(0.4, alto * fa), r); M.compose(P, Q, S); mesh.setMatrixAt(z * K + j, M);
      const b = br * (0.35 + 0.65 * v); C.setRGB(col.r * b, col.g * b, col.b * b); mesh.setColorAt(z * K + j, C);
    }
  }
  mesh.count = n * K;
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (!mov) quieto = true;
}

function leyenda(titulo, color, opc) {
  if (!ley) return;
  const o = opc || {}, esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ley.style.setProperty('--pi-c', color);
  ley.innerHTML = `<div class="pi-h">Picos en el piso</div><div class="pi-t">${esc(titulo || nombreAct)}</div>
    <div class="pi-e"><div class="pi-ag" aria-hidden="true"><i style="height:22%"></i><i style="height:55%"></i><i style="height:100%"></i></div>
    <div class="pi-sc"><div class="pi-b"></div><div class="pi-l"><span>${esc(o.min != null ? o.min : '0')}</span><span>${esc(o.max != null ? o.max : 'máx.')}</span></div></div></div>
    <div class="pi-n">${esc(o.nota || 'altura y brillo = valor de la zona')}</div>`;
}

function poner(nombre, valores, centros, color = '#ffb347', titulo = '', opc = null) {
  if (!armar()) { console.warn('KEN_PICOS_IND: el 3D aún no está listo'); return false; }
  if (!valores || !centros) return false;
  const N = Math.min(valores.length, centros.length);
  if (N > cap || !mesh) crearMalla(Math.max(N, 16));
  if (nombre !== nombreAct) { // otro indicador: arranca desde el piso
    for (let i = 0; i < cap; i++) h[i] = 0;
    nombreAct = nombre;
  } else if (N > n) for (let i = n; i < N; i++) h[i] = 0;
  for (let i = 0; i < N; i++) {
    const v = +valores[i]; meta[i] = isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    const c = centros[i]; cx[i] = c[0] != null ? c[0] : c.x; cz[i] = c[1] != null ? c[1] : c.z;
  }
  n = N;
  const c3 = new THREE.Color(color); /* three 0.160: el '#hex' ya llega pasado a lineal */ col.r = c3.r; col.g = c3.g; col.b = c3.b;
  leyenda(titulo, color, opc);
  quieto = false; tPrev = 0;
  ver(on);
  return true;
}

function ver(v = true) {
  on = !!v;
  if (mesh) mesh.visible = on && n > 0;
  if (ley) ley.style.display = on && n > 0 ? '' : 'none';
  if (on) quieto = false;
}

function quitar() {
  n = 0; nombreAct = '';
  if (mesh) { T3.scene.remove(mesh); mesh.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); mesh = null; cap = 0; h = new Float32Array(0); }
  if (ley) ley.style.display = 'none';
}

window.KEN_PICOS_IND = { poner, ver, quitar, get malla() { return mesh; }, get nombre() { return nombreAct; } };
export default window.KEN_PICOS_IND;
