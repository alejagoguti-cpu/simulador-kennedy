/* ============ SIMULACIÓN 01 · CAPAS «BODEGAS», «RESIDUOS» Y «TRÁFICO» (pedido de la autora, docs/sim01_abastecimiento_v2.md) ============
   window.KEN_AB01C = { poner(I), ver(on), capa(k, on), estado: { bodegas, residuos, trafico }, info() }
   Datos: el I semanal de data3d/simulaciones12.js (I.abasto.bodegas, I.residuosK, I.congestion01). poner() se llama una vez por semana
   simulada; por cuadro solo se suavizan niveles y se mueven las partículas del tráfico (sin crear objetos).
   · BODEGAS: las 37 naves de data3d/corabastos.json como cajas de vidrio sobre la malla de Google (la malla se dibuja primero y se borra la
     profundidad: lo propio queda encima, no hace falta máscara). Dentro de cada nave un «líquido» cuya altura es su ocupación
     (recibo × días / tope, BOD01 de simulaciones12.js): verde hasta 75 %, ámbar hacia 90 %, rojo en 100 %; sobre 100 % una lámina roja que
     titila encima del techo (no cabe más). Las naves de servicios (sin comida) quedan solo en vidrio. Etiqueta sobre la más llena.
   · RESIDUOS: humedal La Vaca (polígonos de data3d/water_bodies.json) con un velo que pasa de verde agua a café con la degradación D, los
     árboles del inventario de arbolado que están dentro (data3d/trees.json, 354 árboles) y que se pierden en la fracción 0,5·D (RES01),
     primero los más cercanos a las bodegas [SUP: orden], y montones de residuos en el borde del humedal frente a Corabastos cuyo tamaño
     sigue el aporte de residuos al humedal (0,45 t/día × sin recoger / 148) [SUP: ubicación sobre el borde].
   · TRÁFICO: las vías principales («major» de data3d/net.json) a 2,2 km o menos del centro de Corabastos. Partículas que fluyen por ellas:
     cuántas = (1 + nivel), velocidad = 1 / (1 + nivel) (factor de tiempo de viaje de TomTom), color verde → ámbar → rojo con el nivel
     (0,62 + 0,033 × años; I.congestion01). Se actualiza cada semana simulada; se anima en cada cuadro. */
import { RELOJ } from './reloj.js?v=5';

const ALTO = 16;                       // m: altura de la caja de cada nave (las reales tienen 8,5–10,5 m; un poco más para leerse desde lejos)
const CORA_C = [6150, 2250];           // centro aproximado de Corabastos en el modelo (corabastos.json)
const R_TRAF = 2200;                   // m alrededor de Corabastos para la capa de tráfico
export const RAMPA = [[0, '#4ade80'], [0.75, '#4ade80'], [0.9, '#fbbf24'], [1, '#ef4444']];
/* color del flujo según el nivel de congestión (TomTom): 0,62 (2024, inicio) verde · 0,85 ámbar · 1,10 rojo (año ~15 de la trayectoria) */
export const CONG_RAMPA = [[0.6, '#4ade80'], [0.85, '#fbbf24'], [1.1, '#ef4444']];
/* v3 con propuesta: Corabastos se reduce 50 % → se quitan las 18 naves más cercanas a La Vaca (campo dh de corabastos.json), de 37 */
export const quitadas01 = (naves) => naves.map((n, i) => [i, n.dh]).sort((a, b) => a[1] - b[1]).slice(0, Math.floor(naves.length / 2)).map(a => a[0]);
export function crearCapas01({ T3 }) {
  if (window.KEN_AB01C) return window.KEN_AB01C;
  const THREE = T3.THREE, lw = T3.lw, cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const raiz = new THREE.Group(); raiz.name = 'ab01_capas'; raiz.visible = false; T3.scene.add(raiz);
  const gB = new THREE.Group(); gB.name = 'ab01_bodegas'; const gR = new THREE.Group(); gR.name = 'ab01_residuos'; const gT = new THREE.Group(); gT.name = 'ab01_trafico';
  raiz.add(gB, gR, gT);
  const estado = { bodegas: true, residuos: true, trafico: true };
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), EJE = new THREE.Vector3(0, 1, 0), CC = new THREE.Color(), pv = new THREE.Vector3();
  const RAMPA_C = RAMPA.map(([k, c]) => [k, new THREE.Color(c)]);
  const rampa = (k, out) => { if (k <= RAMPA_C[0][0]) return out.copy(RAMPA_C[0][1]); for (let i = 1; i < RAMPA_C.length; i++) { const [k1, c1] = RAMPA_C[i]; if (k <= k1) { const [k0, c0] = RAMPA_C[i - 1]; return out.copy(c0).lerp(c1, (k - k0) / Math.max(1e-6, k1 - k0)); } } return out.copy(RAMPA_C[RAMPA_C.length - 1][1]); };
  const RAMPA_T = CONG_RAMPA.map(([k, c]) => [k, new THREE.Color(c)]);
  const colorCong = (n, out) => { if (n <= RAMPA_T[0][0]) return out.copy(RAMPA_T[0][1]); for (let i = 1; i < RAMPA_T.length; i++) if (n <= RAMPA_T[i][0]) return out.copy(RAMPA_T[i - 1][1]).lerp(RAMPA_T[i][1], (n - RAMPA_T[i - 1][0]) / (RAMPA_T[i][0] - RAMPA_T[i - 1][0])); return out.copy(RAMPA_T[RAMPA_T.length - 1][1]); };
  let I = null;

  /* ---------- etiquetas (vidrio, sans) ---------- */
  const css = 'position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);padding:6px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.74),rgba(20,22,28,.86));border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f2f3f5;font:500 11.5px/1.35 Inter,system-ui,sans-serif;white-space:nowrap;display:none;font-variant-numeric:tabular-nums';
  const etq = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'ab01-et'; d.style.cssText = css; document.body.appendChild(d); return d; };
  const etB = etq('ab01-et-bod'), etR = etq('ab01-et-res'), etT = etq('ab01-et-tra');
  const enPantalla = (x, y, z, el) => { pv.set(x, y, z).project(T3.camera); if (pv.z < 1 && Math.abs(pv.x) < 1.05 && Math.abs(pv.y) < 1.05) { el.style.display = 'block'; el.style.left = ((pv.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - pv.y) / 2 * innerHeight) + 'px'; return true; } el.style.display = 'none'; return false; };
  const txt = (el, h) => { if (el._t !== h) { el._t = h; el.innerHTML = h; } };
  const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));

  /* ---------- BODEGAS ---------- */
  const B = { listo: false, n: 0, nav: [], niv: null, meta: null, vid: null, liq: null, reb: null, bordes: null };
  cargar('data3d/corabastos.json').then((D) => {
    const naves = D.naves || []; B.n = naves.length; B.niv = new Float32Array(B.n); B.meta = new Float32Array(B.n);
    const caja = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    /* caras sombreadas con color por vértice (techo claro, lados más oscuros): con material básico (sin luces) el volumen se lee igual */
    const sombra = (g, top, xs, zs, bot) => { const n = g.attributes.normal, c = new Float32Array(n.count * 3); for (let i = 0; i < n.count; i++) { const k = n.getY(i) > 0.5 ? top : n.getY(i) < -0.5 ? bot : Math.abs(n.getX(i)) > 0.5 ? xs : zs; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
    const cajaL = sombra(caja.clone(), 1, 0.74, 0.62, 0.5), cajaI = sombra(caja.clone(), 0.55, 0.8, 0.68, 0.45);
    /* interior oscuro (solo caras de atrás: piso y muros del fondo) que tapa el techo de la foto de Google dentro de la nave: así se ve «adentro» */
    const int = new THREE.InstancedMesh(cajaI, new THREE.MeshBasicMaterial({ color: 0x2a3136, vertexColors: true, side: THREE.BackSide, toneMapped: false }), B.n);
    const vid = new THREE.InstancedMesh(caja, new THREE.MeshBasicMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.FrontSide, toneMapped: false }), B.n);
    const liq = new THREE.InstancedMesh(cajaL, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false }), B.n);
    const reb = new THREE.InstancedMesh(caja, new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }), B.n);
    int.renderOrder = 11; liq.renderOrder = 12; vid.renderOrder = 13; reb.renderOrder = 14; [int, vid, liq, reb].forEach(m => { m.frustumCulled = false; });
    const lin = []; const y = y0();
    B.linN = []; B.quitadas = quitadas01(naves);
    naves.forEach((n, i) => {
      const l0 = lin.length;
      const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)), ux = e[0] - cx, uz = e[1] - cz, th = Math.atan2(-uz, ux);
      B.nav.push({ cx, cz, th, L: n.L, W: n.W, ux, uz });
      Q.setFromAxisAngle(EJE, th); M4.compose(V3.set(cx, y, cz), Q, S3.set(n.L, ALTO, n.W)); vid.setMatrixAt(i, M4); int.setMatrixAt(i, M4);
      M4.compose(V3.set(cx, y + 0.3, cz), Q, S3.set(n.L * 0.92, 0.01, n.W * 0.86)); liq.setMatrixAt(i, M4); liq.setColorAt(i, CC.set('#4ade80'));
      M4.compose(V3.set(cx, y + ALTO, cz), Q, S3.set(n.L * 0.92, 0.01, n.W * 0.86)); reb.setMatrixAt(i, M4);
      // aristas de la caja (una sola malla de líneas para las 37)
      const vx = -uz, vz = ux, p = (u, v) => [cx + u * ux + v * vx, cz + u * uz + v * vz], L2 = n.L / 2, W2 = n.W / 2;
      const c4 = [p(-L2, -W2), p(L2, -W2), p(L2, W2), p(-L2, W2)];
      for (let k = 0; k < 4; k++) { const a = c4[k], b = c4[(k + 1) % 4]; for (const yy of [y, y + ALTO]) lin.push(a[0], yy, a[1], b[0], yy, b[1]); lin.push(a[0], y, a[1], a[0], y + ALTO, a[1]); }
      B.linN.push([l0, lin.length]);
    });
    reb.count = 0; liq.instanceColor.needsUpdate = true; B.lin = lin;
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lin, 3));
    const bordes = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })); bordes.renderOrder = 15; bordes.frustumCulled = false;
    gB.add(int, liq, vid, reb, bordes); Object.assign(B, { vid, int, liq, reb, bordes, listo: true, mVid: [], prop: false });
    for (let i = 0; i < B.n; i++) { const m = new THREE.Matrix4(); vid.getMatrixAt(i, m); B.mVid.push(m); }
    if (I) ponerBodegas();
  }).catch(e => console.warn('capa bodegas:', e));
  /* con propuesta: Corabastos se reduce a la mitad; las naves quitadas (las más cercanas a La Vaca, quitadas01) no se dibujan */
  const CERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function quitarNaves(prop) { if (!B.listo || B.prop === prop) return; B.prop = prop; const q = new Set(prop ? B.quitadas : []); B.qSet = q; B._y = null;
    for (let i = 0; i < B.n; i++) { const m = q.has(i) ? CERO : B.mVid[i]; B.vid.setMatrixAt(i, m); B.int.setMatrixAt(i, m); }
    B.vid.instanceMatrix.needsUpdate = true; B.int.instanceMatrix.needsUpdate = true;
    const L = []; B.linN.forEach(([a, b], i) => { if (!q.has(i)) for (let k = a; k < b; k++) L.push(B.lin[k]); });
    B.bordes.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3)); B.bordes.geometry.computeBoundingSphere(); }
  function ponerBodegas() { const b = I && I.abasto && I.abasto.bodegas; if (!B.listo) return; if (!b) { gB.visible = false; return; } gB.visible = estado.bodegas;
    quitarNaves(!!I.propuesta); const q = B.prop ? new Set(B.quitadas) : null;
    for (let i = 0; i < B.n; i++) B.meta[i] = q && q.has(i) ? 0 : b.occ[i] || 0; }
  function moverBodegas(dt, ahora) {
    if (!B.listo || !gB.visible) return; const y = y0(), k = 1 - Math.exp(-dt * 3); let nReb = 0, cambio = false;
    for (let i = 0; i < B.n; i++) { const m = B.meta[i]; if (Math.abs(m - B.niv[i]) > 1e-4) { B.niv[i] += (m - B.niv[i]) * k; cambio = true; } }
    if (cambio || B._y !== y) { B._y = y;
      for (let i = 0; i < B.n; i++) { const N = B.nav[i], o = B.niv[i], h = Math.max(0.01, Math.min(1, o)) * ALTO * 0.97;
        Q.setFromAxisAngle(EJE, N.th); M4.compose(V3.set(N.cx, y + 0.3, N.cz), Q, S3.set(N.L * 0.92, B.meta[i] > 0 ? h : 0.01, N.W * 0.86)); B.liq.setMatrixAt(i, B.qSet && B.qSet.has(i) ? CERO : M4); B.liq.setColorAt(i, rampa(o, CC));
        if (o >= 1) { M4.compose(V3.set(N.cx, y + ALTO, N.cz), Q, S3.set(N.L * 1.02, Math.max(0.6, Math.min(1.2, o - 1) * ALTO), N.W * 1.02)); B.reb.setMatrixAt(nReb++, M4); } }
      B.liq.instanceMatrix.needsUpdate = true; B.liq.instanceColor.needsUpdate = true; B.reb.count = nReb; B.reb.instanceMatrix.needsUpdate = true; }
    if (B.reb.count) B.reb.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(ahora / 260));
  }

  /* ---------- RESIDUOS: La Vaca ---------- */
  const R_ = { listo: false, velo: null, arb: null, n: 0, orden: null, mont: null, D: -1, aporte: -1, borde: [] };
  Promise.all([cargar('data3d/water_bodies.json'), cargar('data3d/trees.json'), cargar('data3d/corabastos.json')]).then(([W, T, C]) => {
    const polis = (W || []).filter(w => /la vaca/i.test(w.nombre || '')).map(w => w.pts); if (!polis.length) return;
    // velo del humedal
    const formas = polis.map(pts => { const s = new THREE.Shape(); pts.forEach(([x, z], k) => { const [wx, wz] = lw(x, z); if (k) s.lineTo(wx, -wz); else s.moveTo(wx, -wz); }); return s; });
    const gv = new THREE.ShapeGeometry(formas).rotateX(-Math.PI / 2);
    const velo = new THREE.Mesh(gv, new THREE.MeshBasicMaterial({ color: 0x5fb8a6, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); velo.renderOrder = 11; velo.position.y = y0() + 0.6;
    // árboles del inventario dentro de La Vaca (punto en polígono, con caja previa)
    const bb = polis.map(p => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const [x, z] of p) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, z); d = Math.max(d, z); } return [a, b, c, d]; });
    const dentro = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const arb = []; for (const t of (T && T.t) || []) { const x = t[0], z = t[1]; for (let k = 0; k < polis.length; k++) { const q = bb[k]; if (x < q[0] || x > q[1] || z < q[2] || z > q[3]) continue; if (dentro(x, z, polis[k])) { arb.push([x, z, t[2] || 3]); break; } } }
    // orden de pérdida: primero los más cercanos a una nave de Corabastos [SUP]
    const naves = (C && C.naves) || [], dN = (x, z) => { let m = Infinity; for (const n of naves) m = Math.min(m, Math.hypot(x - n.c[0], z - n.c[1])); return m; };
    arb.forEach(a => { a[3] = dN(a[0], a[1]); }); arb.sort((a, b) => a[3] - b[3]);
    const copa = new THREE.SphereGeometry(1, 10, 7).translate(0, 1, 0), tronco = new THREE.CylinderGeometry(0.18, 0.25, 1, 6).translate(0, 0.5, 0);
    const mC = new THREE.InstancedMesh(copa, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, toneMapped: false }), arb.length);
    const mT = new THREE.InstancedMesh(tronco, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), arb.length);
    mC.renderOrder = 12; mT.renderOrder = 12; mC.frustumCulled = false; mT.frustumCulled = false;
    R_.arbP = arb.map(([x, z, h]) => { const [wx, wz] = lw(x, z); return [wx, wz, Math.max(4, Math.min(14, h * 1.4))]; });
    // bordes del humedal frente a Corabastos: puntos del polígono más cercanos a las naves (donde caerían los montones)
    const cand = []; polis.forEach(p => p.forEach(([x, z], k) => { if (k % 3 === 0) cand.push([x, z, dN(x, z)]); })); cand.sort((a, b) => a[2] - b[2]);
    const sel = []; for (const c of cand) { if (sel.every(s => Math.hypot(s[0] - c[0], s[1] - c[1]) > 35)) sel.push(c); if (sel.length >= 12) break; }
    R_.borde = sel.map(([x, z]) => lw(x, z));
    const mont = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5a4632, transparent: true, opacity: 0.95, toneMapped: false }), R_.borde.length);
    mont.renderOrder = 13; mont.frustumCulled = false; mont.count = 0;
    gR.add(velo, mT, mC, mont); Object.assign(R_, { listo: true, velo, arb: mC, tro: mT, n: arb.length, mont, cx: 0, cz: 0 });
    { let sx = 0, sz = 0; for (const [x, z] of R_.arbP) { sx += x; sz += z; } R_.cx = R_.arbP.length ? sx / R_.arbP.length : 0; R_.cz = R_.arbP.length ? sz / R_.arbP.length : 0; }
    R_.D = -1; if (I) ponerResiduos();
  }).catch(e => console.warn('capa residuos:', e));
  const COL_SANO = new THREE.Color('#2f7d4a'), COL_SECO = new THREE.Color('#8d7a63'), COL_AGUA = new THREE.Color('#5fb8a6'), COL_CAFE = new THREE.Color('#6b4f2e');
  /* Estaciones Circulares de la 01 con propuesta (EST01 de simulaciones12.js): un cilindro verde azulado por estación abierta, en su sitio de mercado */
  const estM = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 20).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0x22a89d, transparent: true, opacity: 0.85, toneMapped: false }), 20);
  estM.renderOrder = 13; estM.frustumCulled = false; estM.count = 0; gR.add(estM);
  function ponerEstaciones() { const L = (I && I.residuosK && I.residuosK.estaciones) || [], y = y0(), n = Math.min(20, L.length); if (n === estM.count && estM._y === y) return; estM._y = y;
    for (let k = 0; k < n; k++) { M4.compose(V3.set(L[k].x, y, L[k].z), Q.identity(), S3.set(16, 14, 16)); estM.setMatrixAt(k, M4); } estM.count = n; estM.instanceMatrix.needsUpdate = true; }
  function ponerResiduos() { const r = I && I.residuosK; ponerEstaciones(); if (!R_.listo) return; if (!r) { gR.visible = false; return; } gR.visible = estado.residuos;
    const D = Math.round(r.D * 200) / 200, ap = Math.round((r.aporte || 0) * 20) / 20; if (D === R_.D && ap === R_.aporte) return; R_.D = D; R_.aporte = ap;
    const perdidos = Math.round((1 - r.arboles) * R_.n), y = y0();
    for (let i = 0; i < R_.n; i++) { const [x, z, h] = R_.arbP[i], muerto = i < perdidos;
      const rc = Math.max(4.5, h * 0.45);
      M4.compose(V3.set(x, y + h * 0.35, z), Q.identity(), muerto ? S3.set(0.01, 0.01, 0.01) : S3.set(rc, rc * 0.85, rc)); R_.arb.setMatrixAt(i, M4); R_.arb.setColorAt(i, CC.copy(COL_SANO).lerp(COL_SECO, Math.min(1, D * 0.6)));
      M4.compose(V3.set(x, y, z), Q.identity(), muerto ? S3.set(2.6, 4, 2.6) : S3.set(1.4, h * 0.55, 1.4)); R_.tro.setMatrixAt(i, M4); R_.tro.setColorAt(i, CC.set(muerto ? '#b9a48a' : '#6b5a48')); }
    R_.arb.instanceMatrix.needsUpdate = true; if (R_.arb.instanceColor) R_.arb.instanceColor.needsUpdate = true; R_.tro.instanceMatrix.needsUpdate = true; if (R_.tro.instanceColor) R_.tro.instanceColor.needsUpdate = true;
    R_.velo.material.color.copy(COL_AGUA).lerp(COL_CAFE, D); R_.velo.material.opacity = 0.22 + 0.33 * D; R_.velo.position.y = y + 0.6;
    // montones: uno por cada 0,1 t/día de aporte por encima de hoy (0,45), radio con el aporte
    const n = Math.max(0, Math.min(R_.borde.length, Math.round((ap - 0.45) / 0.1) + (ap > 0.45 ? 1 : 0))), rad = 6 + 5 * Math.min(2, ap);
    for (let k = 0; k < n; k++) { const [x, z] = R_.borde[k]; M4.compose(V3.set(x, y, z), Q.identity(), S3.set(rad, rad * 0.45, rad)); R_.mont.setMatrixAt(k, M4); }
    R_.mont.count = n; R_.mont.instanceMatrix.needsUpdate = true; }

  /* ---------- v3: MEDIDOR DE CORABASTOS (barra vertical: inventario ÷ 14.000 t) ---------- */
  const GA = { H: 260, W: 34, ESC: 1.3 }; // la barra muestra hasta 130 %; la raya roja es 100 % (14.000 t)
  const gG = new THREE.Group(); gG.name = 'ab01_medidor'; raiz.add(gG);
  { const [gx, gz] = lw(CORA_C[0] + 520, CORA_C[1] - 120); gG.position.set(gx, 0, gz); }
  const gMarco = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false }));
  gMarco.scale.set(GA.W, GA.H, GA.W); gMarco.renderOrder = 14;
  const gLleno = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.9, toneMapped: false }));
  gLleno.scale.set(GA.W * 0.8, 1, GA.W * 0.8); gLleno.renderOrder = 15;
  const gTope = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xef4444, toneMapped: false })); gTope.scale.set(GA.W * 1.5, 2.2, GA.W * 1.5); gTope.position.y = GA.H / GA.ESC; gTope.renderOrder = 16;
  gG.add(gMarco, gLleno, gTope); let gNiv = 0, gMeta = 0;
  const etG = etq('ab01-et-cora');
  function moverMedidor(dt) { const y = y0(); gG.position.y = y; gNiv += (gMeta - gNiv) * (1 - Math.exp(-dt * 3)); gLleno.scale.y = Math.max(0.5, Math.min(GA.ESC, gNiv) / GA.ESC * GA.H);
    gLleno.material.color.copy(rampa(Math.min(1, gNiv), CC)); }

  /* ---------- v3: RESIDUOS SIN RECOGER COMO PUNTOS (pedido de la autora: «que se vean») ----------
     Un punto por cada 2 t/día sin recoger (hoy 148 t/día → 74 puntos; game over 296 → 148), en los puntos críticos de basura del modelo (I.basura.puntos)
     y en el borde de La Vaca. Tamaño fijo en pantalla: se leen desde la cámara de inicio. Color café → rojo con la degradación D. */
  const RP = { max: 400, pts: null, n: 0 };
  const geoRP = new THREE.BufferGeometry(); geoRP.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RP.max * 3), 3)); geoRP.setDrawRange(0, 0);
  const matRP = new THREE.PointsMaterial({ color: 0xc8823a, size: 7, sizeAttenuation: false, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, toneMapped: false });
  const puntosRP = new THREE.Points(geoRP, matRP); puntosRP.renderOrder = 18; puntosRP.frustumCulled = false; gR.add(puntosRP);
  const azar = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  function candidatosRP() { if (RP.pts || !R_.listo) return; const r = azar(20261126), out = [], y = y0() + 1.5;
    const B0 = (I && I.basura && I.basura.puntos || []).filter(p => p.fuente !== 'humedal');
    for (let k = 0; k < RP.max; k++) { let x, z;
      if (k % 5 < 3 && R_.borde.length) { const b = R_.borde[k % R_.borde.length], a = r() * 6.283, d = 8 + r() * 70; x = b[0] + Math.cos(a) * d; z = b[1] + Math.sin(a) * d; }
      else if (B0.length) { const b = B0[k % B0.length], a = r() * 6.283, d = 10 + r() * 140; x = b.x + Math.cos(a) * d; z = b.z + Math.sin(a) * d; }
      else { const a = r() * 6.283, d = 60 + r() * 260; x = R_.cx + Math.cos(a) * d; z = R_.cz + Math.sin(a) * d; }
      out.push(x, y, z); }
    RP.pts = out; geoRP.attributes.position.array.set(out); geoRP.attributes.position.needsUpdate = true; }
  function ponerPuntosRes() { const r = I && I.residuosK; candidatosRP(); if (!r || !RP.pts) return; const n = Math.max(0, Math.min(RP.max, Math.round(r.noRec / 2)));
    if (n !== RP.n) { RP.n = n; geoRP.setDrawRange(0, n); } matRP.color.copy(COL_CAFE2).lerp(COL_ROJO, Math.min(1, r.D || 0)); }
  const COL_CAFE2 = new THREE.Color('#d08a3c'), COL_ROJO = new THREE.Color('#ff4d3d');

  /* ---------- TRÁFICO ---------- */
  const TR = { listo: false, ed: [], pts: null, n: 0, max: 0, mesh: null, s: null, e: null, seg: null, nivel: -1, vel: 0, nVis: 0 };
  const iniTrafico = () => { const N = T3.net; if (!N || !N.edges) return false;
    const ed = []; for (const [tipo, p] of N.edges) { if (tipo !== 'major' || p.length < 2) continue; const m = p[Math.floor(p.length / 2)]; if (Math.hypot(m[0] - CORA_C[0], m[1] - CORA_C[1]) > R_TRAF) continue;
      const w = p.map(([x, z]) => lw(x, z)), cum = [0]; for (let i = 1; i < w.length; i++) cum.push(cum[i - 1] + Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1])); if (cum[cum.length - 1] < 40) continue; ed.push({ w, cum, L: cum[cum.length - 1] }); }
    const Ltot = ed.reduce((a, e) => a + e.L, 0), max = Math.min(2600, Math.round(Ltot / 18));
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(14, 2.2, 3.6).translate(0, 1.1, 0), new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.95, toneMapped: false }), max);
    mesh.renderOrder = 16; mesh.frustumCulled = false; mesh.count = 0; gT.add(mesh);
    // reparto de partículas por longitud; cada una con su arista, posición a lo largo y sentido (la mitad en cada sentido)
    const pe = new Uint16Array(max), ps = new Float32Array(max), pd = new Int8Array(max), pg = new Uint16Array(max); let k = 0, acc = 0;
    ed.forEach((e, j) => { acc += e.L / Ltot * max; while (k < Math.round(acc) && k < max) { pe[k] = j; ps[k] = ((k * 0.6180339) % 1) * e.L; pd[k] = (k & 1) ? 1 : -1; pg[k] = 1; k++; } });
    Object.assign(TR, { listo: true, ed, mesh, n: k, max, pe, ps, pd, pg }); return true; };
  function ponerTrafico() { const c = I && I.congestion01; if (!TR.listo && !iniTrafico()) return; if (!c) { gT.visible = false; return; } gT.visible = estado.trafico;
    const nv = Math.round(c.nivel * 1000) / 1000; if (nv === TR.nivel) return; TR.nivel = nv;
    TR.vel = 22 / (1 + nv);                                               // m/s en pantalla: flujo libre 22 m/s, se frena con el factor 1 + nivel
    TR.nVis = Math.min(TR.n, Math.round(TR.n * (1 + nv) / 2.2));           // más vehículos con más congestión (2,2 = 1 + nivel máximo dibujado)
    TR.mesh.material.color.copy(colorCong(nv, CC)); }
  function moverTrafico(dt) {
    if (!TR.listo || !gT.visible || !TR.nVis) return; const y = (T3.viaY != null ? T3.viaY : y0() + 0.3) + 0.8, a = TR.mesh.instanceMatrix.array, d = TR.vel * dt;
    // cada partícula se reparte en las nVis primeras (orden fijo): la densidad cambia sin saltos de posición
    for (let k = 0; k < TR.nVis; k++) { const e = TR.ed[TR.pe[k]]; let s = TR.ps[k] + d * TR.pd[k]; if (s > e.L) s -= e.L; else if (s < 0) s += e.L; TR.ps[k] = s;
      let g = TR.pg[k]; const cum = e.cum; while (g < cum.length - 1 && cum[g] < s) g++; while (g > 1 && cum[g - 1] > s) g--; TR.pg[k] = g;
      const p0 = e.w[g - 1], p1 = e.w[g], l = cum[g] - cum[g - 1] || 1, t = (s - cum[g - 1]) / l, x = p0[0] + (p1[0] - p0[0]) * t, z = p0[1] + (p1[1] - p0[1]) * t;
      const dx = (p1[0] - p0[0]) / l, dz = (p1[1] - p0[1]) / l, off = TR.pd[k] * 3.2, o = k * 16; // carril a cada lado del eje
      a[o] = dx; a[o + 1] = 0; a[o + 2] = dz; a[o + 3] = 0; a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0; a[o + 8] = -dz; a[o + 9] = 0; a[o + 10] = dx; a[o + 11] = 0;
      a[o + 12] = x - dz * off; a[o + 13] = y; a[o + 14] = z + dx * off; a[o + 15] = 1; }
    TR.mesh.count = TR.nVis; TR.mesh.instanceMatrix.needsUpdate = true; }

  /* ---------- por cuadro (etiquetas mínimas: solo el porcentaje, pedido de la autora) ---------- */
  let tPrev = 0, tTxt = 0;
  const ETS = [etB, etR, etT, etG];
  const chip = (n, pc, col) => `<span style="opacity:.75">${n}</span> <b style="font-size:13px;color:${col}">${pc}</b>`;
  const colPc = (v) => (v >= 1 ? '#ff8a80' : v >= 0.9 ? '#ffd27a' : '#9be8b0');
  RELOJ.alDibujar(() => {
    if (!raiz.visible || !I) { if (etG.style.display !== 'none' || etB.style.display !== 'none') ETS.forEach(e => { e.style.display = 'none'; }); return; }
    const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
    moverBodegas(dt, ahora); moverTrafico(dt); moverMedidor(dt);
    const leer = ahora - tTxt > 200; if (leer) tTxt = ahora;
    etB.style.display = 'none'; // la nave más llena ya no lleva tarjeta: el medidor de Corabastos dice el porcentaje
    const U = I.abasto && I.abasto.ab01;
    if (U && enPantalla(gG.position.x, y0() + GA.H + 14, gG.position.z, etG) && leer) txt(etG, chip('Corabastos', nf(U.sat * 100) + ' %', colPc(U.sat)));
    const r = I.residuosK;
    if (r && gR.visible && R_.listo) { if (enPantalla(R_.cx, y0() + 30, R_.cz, etR) && leer) txt(etR, chip('Residuos', nf(r.noRec / r.umbral * 100) + ' %', colPc(r.noRec / r.umbral))); }
    else etR.style.display = 'none';
    const c = I.congestion01;
    if (c && gT.visible && TR.listo) { const [x, z] = lw(CORA_C[0] + 900, CORA_C[1] + 900); if (enPantalla(x, y0() + 40, z, etT) && leer) txt(etT, chip('Congestión', nf(c.nivel * 100) + ' %', c.nivel >= 0.85 ? '#ff8a80' : c.nivel >= 0.7 ? '#ffd27a' : '#9be8b0')); }
    else etT.style.display = 'none';
  });

  const api = window.KEN_AB01C = {
    estado, grupo: raiz,
    poner(x) { I = x || null; raiz.visible = !!I; if (!I) return; const U = I.abasto && I.abasto.ab01; gMeta = U ? U.sat : 0; ponerBodegas(); ponerResiduos(); ponerPuntosRes(); ponerTrafico(); },
    ver(on) { raiz.visible = !!on && !!I; if (!raiz.visible) ETS.forEach(e => { e.style.display = 'none'; }); },
    capa(k, on) { if (!(k in estado)) return; estado[k] = !!on; const g = { bodegas: gB, residuos: gR, trafico: gT }[k]; g.visible = !!on; if (on && I) { R_.D = -1; TR.nivel = -1; api.poner(I); } },
    visible(k) { const g = { bodegas: gB, residuos: gR, trafico: gT }[k]; return !!(raiz.visible && g && g.visible); },
    info() { return { estaciones: estM.count, bodegas: B.listo ? B.n : 0, arboles: R_.n, montones: R_.mont ? R_.mont.count : 0, trafico: TR.listo ? { aristas: TR.ed.length, particulas: TR.n, visibles: TR.nVis, vel: TR.vel } : null, nivel: TR.nivel }; }
  };
  return api;
}
