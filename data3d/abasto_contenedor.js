/* ============ MEDIDORES DE CAPACIDAD DEL ABASTECIMIENTO (par 01 · data3d/simulaciones12.js ind().abasto.ab01) ============
   window.KEN_CONT = { poner(abasto), ver(on), grupo }
   · Corabastos: un tubo de vidrio vertical anclado en el centro de sus bodegas. El llenado sube y baja EN TIEMPO REAL con la hora del
     reloj: en cada franja de ingreso de carga (12–20 h, 20–24 h, 4–6 h; horarios de Corabastos × grupos DANE-SIPSA 2025) llega una parte de
     las toneladas del día y el nivel es lo que llega frente a lo máximo que la central puede recibir en esa franja (tope × parte de la
     franja). Fuera de las franjas no entra carga y el tubo se vacía hasta un fondo. El anillo rojo es el tope (6.460 t/día × (1 + tope)).
     Si a Corabastos le piden más que su tope, el exceso se dibuja como una columna roja translúcida por encima del anillo.
     Verde < 90 % del tope · ámbar 90–100 % · rojo ≥ 100 %.
   · Con propuesta: un tubo más pequeño por mercado abierto (Plaza Distrital de Kennedy y sitios de la propuesta), lleno según las
     t/día que mueve frente a sus 17 t/día.
   · Etiquetas HTML (vidrio) con t/día y %. Solo materiales básicos y unas 50 mallas: no pesa en los cuadros por segundo.
   Grupo 'abasto_cont' (sim_ui.js lo deja visible en la historia del par 01 y KEN_FOCO lo deja en color). */
import { RELOJ } from './reloj.js?v=5';

const ESCALA = 1.25; // el tubo muestra hasta 125 % del tope (el anillo rojo queda al 80 % de la altura)
export function crearContenedores({ T3 }) {
  if (window.KEN_CONT) return window.KEN_CONT;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'abasto_cont'; G.visible = false; T3.scene.add(G);
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3) + 0.5;
  const COL = { v: new THREE.Color(0x4ade80), a: new THREE.Color(0xfbbf24), r: new THREE.Color(0xef4444) };
  const colorDe = (k, c) => c.copy(k < 0.9 ? COL.v : k < 1 ? COL.a : COL.r);
  const geoTubo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, 0.5, 0);
  const geoLleno = new THREE.CylinderGeometry(1, 1, 1, 40, 1, false).translate(0, 0.5, 0);
  const geoAnillo = new THREE.TorusGeometry(1, 0.035, 6, 48).rotateX(Math.PI / 2);
  const geoBase = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
  function tubo(R, H, op = {}) {
    const g = new THREE.Group(); G.add(g);
    const vid = new THREE.Mesh(geoTubo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    vid.scale.set(R, H, R); vid.renderOrder = 14;
    const base = new THREE.Mesh(geoBase, new THREE.MeshBasicMaterial({ color: 0x101418, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); base.scale.set(R * 1.25, 1, R * 1.25); base.position.y = 0.2; base.renderOrder = 11;
    const lle = new THREE.Mesh(geoLleno, new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false })); lle.scale.set(R * 0.86, 0.01, R * 0.86); lle.renderOrder = 12;
    const exc = new THREE.Mesh(geoLleno, new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false })); exc.scale.set(R * 0.86, 0.01, R * 0.86); exc.visible = false; exc.renderOrder = 12;
    const tope = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false })); tope.scale.set(R * 1.12, R * 1.12, R * 1.12); tope.position.y = H / ESCALA; tope.renderOrder = 15;
    const borde = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false })); borde.scale.set(R, R * 0.6, R); borde.position.y = H; borde.renderOrder = 15;
    g.add(base, vid, lle, exc, tope, borde);
    return { g, lle, exc, tope, R, H, nivel: 0, meta: 0, excMeta: 0, excNivel: 0, col: new THREE.Color(0x4ade80), ...op };
  }
  const C = tubo(70, 230); // Corabastos
  const MK = []; // mercados (se crean cuando aparecen)
  const css = 'position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);padding:6px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.74),rgba(20,22,28,.86));border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f2f3f5;font:500 11.5px/1.35 Inter,system-ui,sans-serif;white-space:nowrap;display:none;font-variant-numeric:tabular-nums';
  const et = document.createElement('div'); et.id = 'cont-et'; et.style.cssText = css; document.body.appendChild(et);
  const etM = []; const etq = (i) => { if (!etM[i]) { const d = document.createElement('div'); d.className = 'cont-etm'; d.style.cssText = css + ';padding:3px 7px;border-radius:8px;font-size:10px;font-weight:500'; document.body.appendChild(d); etM[i] = d; } return etM[i]; };
  let A = null, tPrev = 0, tTxt = 0; const p = new THREE.Vector3();
  const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
  function franjaDe(U, h) { return (U.franjas || []).find(F => h >= F.h0 && h < F.h1) || null; }
  function poner(ab) {
    if (!ab || !ab.cora || !ab.ab01) { A = null; G.visible = false; et.style.display = 'none'; etM.forEach(d => { d.style.display = 'none'; }); return; }
    A = ab; C.g.position.set(ab.cora.x, y0(), ab.cora.z);
    const ms = (ab.mercados || []).filter(m => m.activo);
    while (MK.length < ms.length) MK.push(tubo(22, 95));
    MK.forEach((M, i) => { const m = ms[i]; M.g.visible = !!m; if (!m) return; M.g.position.set(m.x, y0(), m.z); M.m = m; M.meta = Math.min(ESCALA, m.carga || 0); });
  }
  function mover(T, dt, kc) { T.nivel += (T.meta - T.nivel) * (1 - Math.exp(-dt * 3)); T.excNivel += (T.excMeta - T.excNivel) * (1 - Math.exp(-dt * 3));
    const h = Math.max(0.01, Math.min(ESCALA, T.nivel)) / ESCALA * T.H; T.lle.scale.y = h;
    T.exc.visible = T.excNivel > 0.005; if (T.exc.visible) { const hT = T.H / ESCALA, he = Math.min(ESCALA - 1, T.excNivel) / ESCALA * T.H; T.exc.position.y = hT; T.exc.scale.y = Math.max(0.01, he); }
    colorDe(kc != null ? kc : T.nivel + T.excNivel, T.col); T.lle.material.color.lerp(T.col, Math.min(1, dt * 4)); }
  function enPantalla(x, y, z, el) { p.set(x, y, z).project(T3.camera); if (p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05) { el.style.display = 'block'; el.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - p.y) / 2 * innerHeight) + 'px'; return true; } el.style.display = 'none'; return false; }
  RELOJ.alDibujar(() => {
    if (!G.visible || !A) return;
    const now = performance.now(), dt = tPrev ? Math.min(0.1, (now - tPrev) / 1000) : 0; tPrev = now;
    const U = A.ab01, hora = ((RELOJ.minutoDia != null ? RELOJ.minutoDia : 0) / 60) % 24, F = franjaDe(U, hora), k = U.L / U.tope;
    // Corabastos: dentro de una franja, lo que llega frente a lo máximo de la franja (= llegadas / tope) y el exceso pedido; fuera, el fondo
    C.meta = F ? U.lleg / U.tope : 0.04; C.excMeta = F && k > 1 ? Math.min(ESCALA - 1, k - 1) : 0; mover(C, dt, k);
    C.tope.material.opacity = k > 0.97 ? 0.55 + 0.45 * Math.abs(Math.sin(now / 220)) : 0.95;
    for (const M of MK) if (M.g.visible) { M.excMeta = 0; mover(M, dt); }
    const cam = T3.camera.position, dist = Math.hypot(cam.x - A.cora.x, cam.z - A.cora.z, cam.y);
    if (enPantalla(A.cora.x, y0() + C.H + 24, A.cora.z, et) && now - tTxt > 200) { tTxt = now;
      const pc = Math.round(k * 100), est = pc >= 100 ? '#ff8a80' : pc >= 90 ? '#ffd27a' : '#9be8b0';
      const lin2 = F ? `Franja ${F.n}: ${fmt(F.t_h)} t/h de ${fmt(F.tope_h)} posibles · ${fmt(F.veh_h)} vehículos/h` : `Ahora no entra carga (ingreso 12–24 h y 4–6 h)`;
      const txt = `<b style="font-size:12.5px">Corabastos · <span style="color:${est}">${pc} % de su tope</span></b><br>${lin2}<br><span style="opacity:.8">Le piden ${fmt(U.L)} t/día · tope ${fmt(U.tope)} · llegan ${fmt(U.lleg)}</span>${pc >= 100 ? '<br><span style="color:#ff8a80">Sobre el tope: no todo lo pedido entra</span>' : ''}`;
      if (et._t !== txt) { et.innerHTML = txt; et._t = txt; } }
    let j = 0; for (const M of MK) { if (!M.g.visible || !M.m) continue; const el = etq(j++);
      if (dist > 9000 || !enPantalla(M.m.x, y0() + M.H + 10, M.m.z, el)) { el.style.display = 'none'; continue; }
      const txt = `${M.m.real ? 'Plaza Kennedy' : M.m.n.length > 18 ? M.m.n.slice(0, 17) + '…' : M.m.n} · ${fmt(M.m.t_dia, 1)} t/día · ${Math.round((M.m.carga || 0) * 100)} %`; if (el._t !== txt) { el.textContent = txt; el._t = txt; } }
    for (; j < etM.length; j++) etM[j].style.display = 'none';
  });
  const api = window.KEN_CONT = { poner, ver(on) { G.visible = !!on; if (!on) { et.style.display = 'none'; etM.forEach(d => { d.style.display = 'none'; }); C.nivel = 0; MK.forEach(M => { M.nivel = 0; }); } }, grupo: G };
  return api;
}
