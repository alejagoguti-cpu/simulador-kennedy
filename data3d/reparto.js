/* ============ REPARTO DE CORABASTOS (par 01 y 02, con propuesta) ============
   window.KEN_REPARTO = { poner(abasto), ver(on) }   ·  abasto = ind().abasto de data3d/simulaciones12.js
   La carga que hoy pasa toda por Corabastos se REPARTE entre los mercados de barrio: cada lugar es un volumen sólido de color (como una
   maqueta de masas sobre la ciudad real) cuyo VOLUMEN es proporcional a las toneladas al día que mueve para Kennedy:
   · Corabastos: su misma planta (copia de las mallas del grupo 'corabastos') extruida; baja a medida que los mercados toman la carga.
   · Cada mercado activo: un bloque de 60 × 60 m que sube con lo que vende.
   Misma escala para todos: altura = Kv · t_día / área de la planta, con Kv tal que Corabastos mide 60 m en el año 1. Sin rótulos. */
import { RELOJ } from './reloj.js?v=5';

export function crearReparto({ T3 }) {
  if (window.KEN_REPARTO) return window.KEN_REPARTO;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'reparto'; G.visible = false; T3.scene.add(G);
  const LADO = 60, H0 = 60, HMAX = 140;
  const mCora = new THREE.MeshLambertMaterial({ color: 0xd9534f, transparent: true, opacity: 0.9 });
  const mMerc = new THREE.MeshLambertMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.95 });
  const mMercOff = new THREE.MeshLambertMaterial({ color: 0xbfc5cc, transparent: true, opacity: 0.35 });
  let tope = null, hT = 0, hTm = 0, cora = null, areaC = 1, y0 = 0, Kv = null, hC = 0, hCm = 0; const M = new Map();
  const geoBloque = new THREE.BoxGeometry(LADO, 1, LADO).translate(0, 0.5, 0);
  function armarCora() {
    const g = T3.scene.getObjectByName('corabastos'); if (!g) return false; g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g); if (box.isEmpty()) return false; y0 = box.min.y;
    const s = box.getSize(new THREE.Vector3()); areaC = Math.max(1, s.x * s.z * 0.55); // las bodegas ocupan ~55 % de la caja [SUP visual]
    const hB = Math.max(6, s.y); cora = new THREE.Group(); G.add(cora);
    g.traverse(o => { if (!o.isMesh || !o.geometry) return; const m = new THREE.Mesh(o.geometry, mCora); m.matrixAutoUpdate = false; m.userData.M = o.matrixWorld.clone(); cora.add(m); });
    cora.userData.hB = hB;
    /* LÍNEA DEL TOPE: contorno rojo de la planta de Corabastos a la altura de lo que puede mover (tope_t_dia); si el volumen pasa la línea, no alcanza */
    const c = box.getCenter(new THREE.Vector3()), pl = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([a, b]) => new THREE.Vector3(c.x + a * s.x * 0.92, 0, c.z + b * s.z * 0.92));
    tope = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pl), new THREE.LineBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.95, depthTest: false })); tope.renderOrder = 30; G.add(tope); return true;
  }
  function ponerAltoCora(h) { if (!cora) return; const k = Math.max(0.05, h / cora.userData.hB);
    const S = new THREE.Matrix4().makeTranslation(0, y0, 0).multiply(new THREE.Matrix4().makeScale(1, k, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -y0, 0));
    for (const m of cora.children) m.matrix.multiplyMatrices(S, m.userData.M); }
  function poner(A) {
    if (!A) return; if (!cora && !armarCora()) return;
    const nc = (A.nodos || []).find(n => n.tipo === 'corabastos'), tC = nc ? nc.t_dia : 0;
    if (Kv == null && tC > 0) Kv = H0 * areaC / tC;
    if (Kv == null) return;
    hCm = Math.min(HMAX, Kv * tC / areaC);
    const K = A.cora; hTm = K && K.pedido_t_dia > 0 ? Math.min(HMAX * 1.3, hCm * K.tope_t_dia / K.pedido_t_dia) : 0; /* misma escala: la línea queda a la altura que tendría Corabastos si moviera su tope */
    for (const m of A.mercados || []) { const k = m.n; let e = M.get(k);
      if (!e) { const b = new THREE.Mesh(geoBloque, mMercOff); b.position.set(m.x, y0, m.z); b.scale.y = 0.01; G.add(b); e = { b, h: 0 }; M.set(k, e); }
      e.hm = m.activo ? Math.min(HMAX, Kv * (m.t_dia || 0) / (LADO * LADO)) : 2; e.b.material = m.activo ? mMerc : mMercOff; }
  }
  let tPrev = 0;
  RELOJ.alDibujar(() => {
    if (!G.visible || !cora) return; const now = performance.now(), dt = tPrev ? Math.min(0.1, (now - tPrev) / 1000) : 0; tPrev = now; const a = 1 - Math.exp(-dt * 1.5);
    hC += (hCm - hC) * a; ponerAltoCora(hC); if (tope) { hT += (hTm - hT) * a; tope.position.y = y0 + Math.max(2, hT); tope.visible = hTm > 0; tope.material.opacity = hC > hT ? 0.6 + 0.4 * Math.abs(Math.sin(now / 220)) : 0.95; }
    for (const e of M.values()) { e.h += ((e.hm || 0) - e.h) * a; e.b.scale.y = Math.max(0.01, e.h); }
  });
  const api = window.KEN_REPARTO = { poner, ver(on) { G.visible = !!on; if (!on) { Kv = null; hC = 0; for (const e of M.values()) { e.h = 0; e.b.scale.y = 0.01; } } }, grupo: G };
  return api;
}
