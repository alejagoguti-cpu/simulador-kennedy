/* ============ CORABASTOS COMO CONTENEDOR (par 01 · data3d/simulaciones12.js ind().abasto) ============
   window.KEN_CONT = { poner(abasto), ver(on) }
   · Usa LA FORMA REAL de Corabastos: copia las mallas del grupo 'corabastos' (sus bodegas) como un «vaso» de vidrio más alto y, adentro,
     las mismas formas como un líquido que sube. Arranca vacío en el año 1 y se llena a medida que crece lo que se le pide; arriba (línea
     roja = su tope) la comida ya no alcanza. Color verde → ámbar → rojo.
   · Nada más: sin cilindros, sin rutas, sin puntos (los mercados de la propuesta se ven como sus edificios).
   Grupo 'abasto_cont' (KEN_FOCO lo deja en color). */
import { RELOJ } from './reloj.js?v=5';

export function crearContenedores({ T3 }) {
  if (window.KEN_CONT) return window.KEN_CONT;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'abasto_cont'; G.visible = false; T3.scene.add(G);
  const ALTO = 6;          // el vaso es 5 veces más alto que las bodegas (14 m -> 70 m): se lee desde la vista alta
  const plano = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // corta el líquido a la altura del nivel
  const vidrio = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const liq = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.55, depthWrite: false, clippingPlanes: [plano], side: THREE.DoubleSide, toneMapped: false }); // color plano y brillante: se lee desde lejos
  const bordeTope = new THREE.LineBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.95 });
  let armado = false, y0 = 0, hVaso = 70, cx = 0, cz = 0;
  function armar() {
    const cora = T3.scene.getObjectByName('corabastos'); if (!cora) return false;
    if (T3.renderer) T3.renderer.localClippingEnabled = true;
    cora.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(cora); if (box.isEmpty()) return false;
    y0 = box.min.y; const hB = Math.max(6, box.max.y - box.min.y); hVaso = hB * ALTO; const c = box.getCenter(new THREE.Vector3()); cx = c.x; cz = c.z;
    cora.traverse(o => { if (!o.isMesh || !o.geometry) return;
      const g = o.geometry, M = o.matrixWorld.clone();
      // escala vertical alrededor del piso de Corabastos: el vaso y el líquido tienen la planta exacta de las bodegas
      const S = new THREE.Matrix4().makeTranslation(0, y0, 0).multiply(new THREE.Matrix4().makeScale(1, ALTO, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -y0, 0)).multiply(M);
      const v = new THREE.Mesh(g, vidrio); v.matrixAutoUpdate = false; v.matrix.copy(S); v.renderOrder = 13; G.add(v);
      const l = new THREE.Mesh(g, liq); l.matrixAutoUpdate = false; l.matrix.copy(S); l.renderOrder = 12; G.add(l); });
    // línea roja del tope: el contorno de la planta (caja) arriba del vaso
    const s = box.getSize(new THREE.Vector3()), r = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(s.x, s.z).rotateX(-Math.PI / 2)), bordeTope);
    r.position.set(cx, y0 + hVaso + 0.5, cz); r.renderOrder = 30; G.add(r); G.userData.tope = r; /* línea del tope: arriba del vaso = lo máximo que Corabastos puede mover */
    // contorno blanco del vaso completo (las 12 aristas de la caja) para leer el tope desde la vista alta
    const caja = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s.x, hVaso, s.z)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); caja.position.set(cx, y0 + hVaso / 2, cz); /* sin caja blanca */
    armado = true; return true;
  }
  const et = document.createElement('div'); et.id = 'cont-et';
  et.style.cssText = 'position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);padding:7px 11px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.78),rgba(20,22,28,.88));border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f2f3f5;font:500 11.5px/1.35 system-ui,sans-serif;white-space:nowrap;display:none';
  document.body.appendChild(et);
  let A = null, c0 = null, nivel = 0, meta = 0, tPrev = 0; const col = new THREE.Color(), V = new THREE.Color(0x4ade80), Am = new THREE.Color(0xfbbf24), Ro = new THREE.Color(0xef4444), p = new THREE.Vector3();
  const fmt = (v) => Math.round(v).toLocaleString('es-CO');
  function poner(ab) {
    if (!ab || !ab.cora) { G.visible = false; et.style.display = 'none'; return; }
    if (!armado && !armar()) return; A = ab;
    if (c0 == null) c0 = ab.cora.carga; // la carga del año 1 = vaso vacío; el tope (carga 1) = vaso lleno
    meta = Math.max(0, Math.min(1, (ab.cora.carga - c0) / Math.max(0.02, 1 - c0)));
  }
  RELOJ.alDibujar(() => {
    if (!G.visible || !A) return;
    const now = performance.now(), dt = tPrev ? Math.min(0.1, (now - tPrev) / 1000) : 0; tPrev = now;
    nivel += (meta - nivel) * (1 - Math.exp(-dt * 2.5));
    plano.constant = y0 + 0.3 + Math.max(0.04, nivel) * hVaso; // siempre se ve un fondo de líquido // el líquido se ve hasta esta altura
    if (nivel < 0.6) col.copy(V).lerp(Am, nivel / 0.6); else col.copy(Am).lerp(Ro, Math.min(1, (nivel - 0.6) / 0.4)); liq.color.copy(col);
    const r = G.userData.tope; if (r) r.material.opacity = nivel > 0.85 ? 0.55 + 0.45 * Math.abs(Math.sin(now / 220)) : 0.95;
    p.set(cx, y0 + hVaso + 30, cz).project(T3.camera);
    if (p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1) { et.style.display = 'block'; et.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; et.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
      const pc = Math.round(Math.min(1.2, A.cora.carga) * 100), txt = `<b style="font-size:13px">Corabastos · ${pc} % de su tope</b><br>Le piden ${fmt(A.cora.pedido_t_dia)} de ${fmt(A.cora.tope_t_dia)} t/día que puede mover${pc >= 100 ? '<br><span style="color:#ff8a80">Lleno: la comida ya no alcanza</span>' : ''}`;
      if (et._t !== txt) { et.innerHTML = txt; et._t = txt; } } else et.style.display = 'none';
  });
  const api = window.KEN_CONT = { poner, ver(on) { G.visible = !!on; if (!on) { et.style.display = 'none'; c0 = null; nivel = 0; } }, grupo: G };
  return api;
}
