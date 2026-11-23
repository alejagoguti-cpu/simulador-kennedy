/* ============ ABASTECIMIENTO COMO CONTENEDORES (par 01 · data3d/simulaciones12.js ind().abasto) ============
   window.KEN_CONT = { poner(abasto), ver(on) }
   · Corabastos: una caja de vidrio sobre todo el complejo (tope de lo que puede recibir y despachar) con un «líquido» adentro que sube
     con lo que se le pide (cora.carga = pedido / tope): verde → ámbar → rojo; al llegar arriba la comida ya no alcanza (game over).
   · Mercados de la propuesta: un cilindro de vidrio por mercado activo (aparecen a medida que abren), el volumen según su capacidad y el
     líquido azul según cuánto venden frente a esa capacidad. Sin rutas ni palos: solo los contenedores y un rótulo en Corabastos.
   Todo bajo el grupo 'abasto_cont' (KEN_FOCO lo deja en color). Sin asignaciones por cuadro: solo se interpola hacia el valor de la semana. */
import { RELOJ } from './reloj.js?v=5';

export function crearContenedores({ T3 }) {
  if (window.KEN_CONT) return window.KEN_CONT;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'abasto_cont'; G.visible = false; T3.scene.add(G);
  const Y0 = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.5;
  const vidrio = new THREE.MeshStandardMaterial({ color: 0xdfeef5, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const borde = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const liq = new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.82, roughness: 0.35, emissive: 0x16351f, emissiveIntensity: 0.4 });
  const liqM = new THREE.MeshStandardMaterial({ color: 0x3b82f6, transparent: false, roughness: 0.3, emissive: 0x1d4ed8, emissiveIntensity: 0.55 });
  const vidM = vidrio.clone(); vidM.opacity = 0.12;

  /* Corabastos: la caja cubre el grupo 'corabastos' de la escena (si no está, 900 × 700 m alrededor del punto) */
  let cx = 0, cz = 0, W = 900, D = 700, H = 140; const cora = new THREE.Group(); G.add(cora);
  const caja = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), vidrio), aristas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), borde);
  const nivel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), liq), tapa = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: 0xff5a4f }));
  cora.add(caja, aristas, nivel, tapa); caja.renderOrder = 12; nivel.renderOrder = 11;
  function encajar(x, z) {
    const g = T3.scene.getObjectByName('corabastos'); const b = g ? new THREE.Box3().setFromObject(g) : null;
    if (b && !b.isEmpty()) { const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); if (s.x > 200 && s.x < 2500) { W = s.x * 1.04; D = s.z * 1.04; cx = c.x; cz = c.z; } else { cx = x; cz = z; } } else { cx = x; cz = z; }
    H = Math.max(110, Math.min(220, Math.sqrt(W * D) * 0.18));
    cora.position.set(cx, Y0, cz); caja.scale.set(W, H, D); caja.position.y = H / 2; aristas.scale.copy(caja.scale); aristas.position.y = H / 2;
    nivel.scale.set(W * 0.985, 1, D * 0.985); tapa.scale.set(W, 1, D); tapa.position.y = H; // la línea roja arriba = el tope
  }
  /* rótulo de Corabastos (vidrio del simulador) */
  const et = document.createElement('div'); et.id = 'cont-et';
  et.style.cssText = 'position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);padding:7px 11px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.78),rgba(20,22,28,.88));border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f2f3f5;font:500 11.5px/1.35 system-ui,sans-serif;white-space:nowrap;display:none';
  document.body.appendChild(et);

  /* mercados: un cilindro por mercado (hasta 48), se crean al primer poner */
  const merc = []; const cilV = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), cilL = new THREE.CylinderGeometry(1, 1, 1, 28), anillo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(1, 1, 1, 28));
  function mercado(m) {
    const g = new THREE.Group(), v = new THREE.Mesh(cilV, vidM), l = new THREE.Mesh(cilL, liqM), e = new THREE.LineSegments(anillo, borde);
    g.add(v, l, e); v.renderOrder = 12; G.add(g); return { g, v, l, e, k: 0, kM: 0, s: 0, sM: 0, n: m.n };
  }

  let A = null, kCora = 0, kCoraM = 0, armado = false, col = new THREE.Color(), tPrev = 0;
  const VERDE = new THREE.Color(0x4ade80), AMBAR = new THREE.Color(0xfbbf24), ROJO = new THREE.Color(0xef4444), v3 = new THREE.Vector3();
  const fmt = (v) => Math.round(v).toLocaleString('es-CO');
  function poner(ab) {
    if (!ab) return; A = ab;
    if (!armado && ab.cora) { encajar(ab.cora.x, ab.cora.z); armado = true; }
    cora.visible = !!ab.cora; kCoraM = ab.cora ? Math.min(1.08, ab.cora.carga) : 0;
    const L = ab.mercados || [];
    for (let i = 0; i < L.length && i < 48; i++) { const m = L[i]; if (!merc[i]) merc[i] = mercado(m); const M = merc[i];
      const r = Math.max(28, Math.min(80, Math.sqrt(Math.max(0.05, m.cap_t_dia)) * 16)), h = r * 1.8; // volumen según la capacidad (t/día)
      M.g.position.set(m.x, Y0, m.z); M.r = r; M.h = h; M.sM = m.activo ? 1 : 0; M.kM = m.activo ? Math.min(1, m.carga || 0) : 0; }
    for (let i = L.length; i < merc.length; i++) merc[i].sM = 0;
  }
  RELOJ.alDibujar(() => {
    if (!G.visible || !A) return;
    const now = performance.now(), dt = tPrev ? Math.min(0.1, (now - tPrev) / 1000) : 0; tPrev = now; const f = 1 - Math.exp(-dt * 3);
    if (cora.visible) { kCora += (kCoraM - kCora) * f; const h = Math.max(0.5, Math.min(1, kCora) * H); nivel.scale.y = h; nivel.position.y = h / 2;
      const c = kCora; if (c < 0.8) col.copy(VERDE).lerp(AMBAR, Math.max(0, (c - 0.55) / 0.25)); else col.copy(AMBAR).lerp(ROJO, Math.min(1, (c - 0.8) / 0.2)); liq.color.copy(col);
      tapa.material.opacity = c > 0.9 ? 0.6 + 0.4 * Math.abs(Math.sin(now / 250)) : 0.9; tapa.material.transparent = true;
      // rótulo
      v3.set(cx, Y0 + H + 25, cz).project(T3.camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      if (vis && A.cora) { et.style.display = 'block'; et.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; et.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
        const pc = Math.round(Math.min(1.5, A.cora.carga) * 100), txt = `<b style="font-size:13px">Corabastos · ${pc} % de su tope</b><br>Le piden ${fmt(A.cora.pedido_t_dia)} t/día · puede ${fmt(A.cora.tope_t_dia)} t/día${pc >= 100 ? '<br><span style="color:#ff8a80">Lleno: la comida ya no alcanza</span>' : ''}`;
        if (et._t !== txt) { et.innerHTML = txt; et._t = txt; } } else et.style.display = 'none';
    } else et.style.display = 'none';
    for (const M of merc) { M.s += (M.sM - M.s) * f; M.k += (M.kM - M.k) * f; const vis = M.s > 0.02; M.g.visible = vis; if (!vis) continue;
      const r = M.r * M.s, h = M.h * M.s; M.v.scale.set(r, h, r); M.v.position.y = h / 2; M.e.scale.set(r, h, r); M.e.position.y = h / 2;
      const hl = Math.max(0.3, h * M.k); M.l.scale.set(r * 0.96, hl, r * 0.96); M.l.position.y = hl / 2; }
  });
  const api = window.KEN_CONT = { poner, ver(on) { G.visible = !!on; if (!on) et.style.display = 'none'; }, grupo: G };
  return api;
}
