/* ============ RED VERDE: parches que se liberan, se refuerzan, se crean, crecen y se conectan ============
   window.KEN_VERDE = { poner(verde), ver(on), limpiar() }   ·  verde = ind().verde de data3d/simulaciones12.js
   · Cada parche es una MANCHA verde suave en el piso (borde difuso) de radio r (m), que crece o se encoge poco a poco hacia el valor
     del modelo. Color por tipo: existente (verde oscuro), reforzado (verde), nuevo (verde lima), liberado (empieza color tierra y se
     vuelve verde a medida que madura: calidad).
   · Cada conexión es una franja verde que se DIBUJA de un parche al otro según f (0 = nada, 1 = completa); las rotas (tipo 'roto')
     quedan como una franja roja delgada y cortada.
   · Un parche que aparece late unos segundos. Todo se interpola en el tiempo: el modelo da el valor cada 4 semanas, la vista lo
     alcanza suave. Grupo 'verde_red'. Dos InstancedMesh (manchas y franjas): una llamada de dibujo cada una. */
import { RELOJ } from './reloj.js?v=5';

const MAXP = 220, MAXC = 320;
const COL = { existente: [0.20, 0.55, 0.30], reforzado: [0.22, 0.72, 0.36], nuevo: [0.45, 0.82, 0.20], liberado: [0.62, 0.50, 0.32], liberadoV: [0.45, 0.85, 0.40], roto: [0.95, 0.30, 0.25], corredor: [0.16, 0.62, 0.30] };

export function crearVerde({ T3 }) {
  if (window.KEN_VERDE) return window.KEN_VERDE;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'verde_red'; G.visible = false; T3.scene.add(G);
  const Y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.8;
  // textura de mancha: disco con borde difuso
  const tex = (() => { const s = 128, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.62, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mMan = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.62, depthWrite: false, depthTest: false, toneMapped: false, vertexColors: false });
  const man = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), mMan, MAXP);
  man.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 3), 3); man.count = 0; man.renderOrder = 8; man.frustumCulled = false; G.add(man);
  // franja: plano de 1 × 1 con el origen en un extremo (se escala a largo × ancho y se rota hacia el otro parche)
  const mFra = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false, depthTest: false, toneMapped: false });
  const fra = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), mFra, MAXC);
  fra.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXC * 3), 3); fra.count = 0; fra.renderOrder = 9; fra.frustumCulled = false; G.add(fra);

  const P = new Map(), C = new Map(); // estado visual interpolado
  let meta = null;
  function poner(V) {
    if (!V || !V.parches) return; meta = V; const ahora = performance.now();
    const vivos = new Set();
    for (const p of V.parches) { if (p == null || !isFinite(p.x)) continue; const k = String(p.id); vivos.add(k); let e = P.get(k);
      if (!e) { e = { r: p.desde != null ? 0 : (p.r0 != null ? p.r0 : p.r), t0: p.desde != null ? ahora : -1e9, col: [0, 0, 0] }; P.set(k, e); }
      e.p = p; }
    for (const k of [...P.keys()]) if (!vivos.has(k)) { const e = P.get(k); e.p = Object.assign({}, e.p, { r: 0 }); e.muere = true; }
    const vc = new Set();
    for (const c of V.conexiones || []) { if (c == null || !isFinite(c.x1)) continue; const k = c.a + '>' + c.b; vc.add(k); let e = C.get(k); if (!e) { e = { f: 0 }; C.set(k, e); } e.c = c; }
    for (const k of [...C.keys()]) if (!vc.has(k)) C.delete(k);
  }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  let tPrev = 0;
  RELOJ.alDibujar(() => {
    if (!G.visible || (!P.size && !C.size)) return;
    const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora; const a = 1 - Math.exp(-dt * 1.2);
    let i = 0;
    for (const [k, e] of P) { const p = e.p, r0 = Math.max(0, p.r || 0), rm = (p.tipo === 'nuevo' || p.tipo === 'liberado') && r0 > 0 ? Math.max(r0, 45 * Math.min(1, r0 / 15)) : r0; /* escala visual: los módulos chicos se ven desde la vista alta (mínimo 45 m cuando ya maduraron) */ e.r += (rm - e.r) * a;
      if (e.muere && e.r < 1) { P.delete(k); continue; } if (i >= MAXP || e.r < 2) continue;
      const late = (ahora - e.t0) / 1000, s = late < 4 ? 1 + 0.25 * Math.sin(late * 6) * (1 - late / 4) : 1;
      let c = COL[p.tipo] || COL.existente; if (p.tipo === 'liberado') { const q = Math.max(0, Math.min(1, p.calidad || 0)); c = COL.liberado.map((v, j) => v + (COL.liberadoV[j] - v) * q); }
      const mz = 0.75 + 0.25 * Math.max(0, Math.min(1, p.calidad != null ? p.calidad : 1)); // lo de menos calidad, más apagado
      e.col[0] += (c[0] * mz - e.col[0]) * Math.max(a, 0.05); e.col[1] += (c[1] * mz - e.col[1]) * Math.max(a, 0.05); e.col[2] += (c[2] * mz - e.col[2]) * Math.max(a, 0.05);
      M4.compose(T.set(p.x, Y, p.z), Q.identity(), S.set(e.r * s, 1, e.r * s)); man.setMatrixAt(i, M4); man.instanceColor.setXYZ(i, e.col[0], e.col[1], e.col[2]); i++; }
    man.count = i; man.instanceMatrix.needsUpdate = true; man.instanceColor.needsUpdate = true;
    let j = 0;
    for (const e of C.values()) { const c = e.c, roto = c.tipo === 'roto', fm = roto ? 1 : Math.max(0, Math.min(1, c.f || 0)); e.f += (fm - e.f) * a;
      if (j >= MAXC || e.f < 0.02) continue;
      const dx = c.x2 - c.x1, dz = c.z2 - c.z1, L = Math.hypot(dx, dz); if (L < 1) continue;
      const w = roto ? 4 : 4 + 7 * e.f, largo = roto ? L * 0.42 : L * e.f; // la rota: un tramo cortado a la mitad
      Q.setFromAxisAngle(UP, -Math.atan2(dz, dx));
      M4.compose(T.set(c.x1, Y + 0.3, c.z1), Q, S.set(largo, 1, w)); fra.setMatrixAt(j, M4);
      const cc = roto ? COL.roto : COL.corredor; col.setRGB(cc[0], cc[1], cc[2]); fra.instanceColor.setXYZ(j, col.r, col.g, col.b); j++;
      if (roto && j < MAXC) { M4.compose(T.set(c.x2, Y + 0.3, c.z2), Q, S.set(-L * 0.42, 1, w)); fra.setMatrixAt(j, M4); fra.instanceColor.setXYZ(j, col.r, col.g, col.b); j++; } }
    fra.count = j; fra.instanceMatrix.needsUpdate = true; fra.instanceColor.needsUpdate = true;
  });
  function limpiar() { P.clear(); C.clear(); man.count = 0; fra.count = 0; meta = null; }
  const api = window.KEN_VERDE = { poner, limpiar, ver(on) { G.visible = !!on; }, get resumen() { return meta && meta.resumen; }, grupo: G };
  return api;
}
