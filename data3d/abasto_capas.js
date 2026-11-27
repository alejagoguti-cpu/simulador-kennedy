/* ============ SIMULACIÓN 01 · CAPAS «BODEGAS», «RESIDUOS» Y «TRÁFICO» (pedido de la autora, docs/sim01_abastecimiento_v2.md) ============
   v4 (docs/sim01_abastecimiento_v4.md): barra de carga horizontal con pin sobre Corabastos, residuos en cuadraditos que se mueven,
   vías tipo Waze (cintas con sombreador) en lugar de las partículas, y vehículos morados de Bavaria Común (con propuesta).
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
import { crearViasDensidad, nivelLOS } from './vias_densidad.js?v=3';

const ALTO = 16;                       // m: altura de la caja de cada nave (las reales tienen 8,5–10,5 m; un poco más para leerse desde lejos)
const CORA_C = [6150, 2250];           // centro aproximado de Corabastos en el modelo (corabastos.json)
const R_TRAF = 2200;                   // m alrededor de Corabastos para la capa de tráfico
export const RAMPA = [[0, '#4ade80'], [0.75, '#4ade80'], [0.9, '#fbbf24'], [1, '#ef4444']];
/* color del flujo según el nivel de congestión (TomTom): 0,62 (2024, inicio) verde · 0,85 ámbar · 1,10 rojo (año ~15 de la trayectoria) */
export const CONG_RAMPA = [[0.6, '#4ade80'], [0.85, '#fbbf24'], [1.1, '#ef4444']];
/* v3 con propuesta: Corabastos se reduce 50 % → se quitan las 18 naves más cercanas a La Vaca (campo dh de corabastos.json), de 37 */
export const quitadas01 = (naves) => naves.map((n, i) => [i, n.dh]).sort((a, b) => a[1] - b[1]).slice(0, Math.floor(naves.length / 2)).map(a => a[0]);
/* v5.2: DESMONTE GRADUAL (mismo calendario que AB01_DESMONTE / DES01 de simulaciones12.js): la k-ésima de quitadas01 (en orden, la más cercana a
   La Vaca primero) se quita en la semana 52 + k × 364 ÷ (n − 1) (años 1 a 8). Quitada en la semana del modelo t (0 = primera) si t ≥ semQuita01(k). */
export const semQuita01 = (k, n) => 52 + Math.round(k * 364 / Math.max(1, n - 1));
export const nQuitadas01 = (t, n) => { let c = 0; for (let k = 0; k < n; k++) if (t >= semQuita01(k, n)) c++; return c; };
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
  /* v5.2: nQ = naves quitadas hasta esta semana (U.nQuit del modelo: de a poco entre los años 1 y 8), en el orden de quitadas01 */
  function quitarNaves(nQ) { if (!B.listo || B.prop === nQ) return; B.prop = nQ; const q = new Set(B.quitadas.slice(0, nQ)); B.qSet = q; B._y = null;    for (let i = 0; i < B.n; i++) { const m = q.has(i) ? CERO : B.mVid[i]; B.vid.setMatrixAt(i, m); B.int.setMatrixAt(i, m); }
    for (const i of q) { B.liq.setMatrixAt(i, CERO); B.reb.setMatrixAt(i, CERO); } B.liq.instanceMatrix.needsUpdate = true; /* v4: el líquido de las naves quitadas tampoco se dibuja */
    B.vid.instanceMatrix.needsUpdate = true; B.int.instanceMatrix.needsUpdate = true;
    const L = []; B.linN.forEach(([a, b], i) => { if (!q.has(i)) for (let k = a; k < b; k++) L.push(B.lin[k]); });
    B.bordes.geometry.setAttribute('position', new THREE.Float32BufferAttribute(L, 3)); B.bordes.geometry.computeBoundingSphere(); }
  function ponerBodegas() { const b = I && I.abasto && I.abasto.bodegas; if (!B.listo) return; if (!b) { gB.visible = false; return; } gB.visible = estado.bodegas;
    const U0 = I.abasto && I.abasto.ab01; quitarNaves(I.propuesta ? (U0 && U0.nQuit != null ? U0.nQuit : nQuitadas01((I.sem || 1) - 1, B.quitadas.length)) : 0); const q = B.prop ? B.qSet : null;
    for (let i = 0; i < B.n; i++) B.meta[i] = q && q.has(i) ? 0 : b.occ[i] || 0; }
  function moverBodegas(dt, ahora) {
    if (!B.listo || !gB.visible) return; const y = y0(), k = 1 - Math.exp(-dt * 3); let nReb = 0, cambio = false;
    for (let i = 0; i < B.n; i++) { const m = B.meta[i]; if (Math.abs(m - B.niv[i]) > 1e-4) { B.niv[i] += (m - B.niv[i]) * k; cambio = true; } }
    if (cambio || B._y !== y) { B._y = y;
      for (let i = 0; i < B.n; i++) { if (B.qSet && B.qSet.has(i)) { B.liq.setMatrixAt(i, CERO); continue; } const N = B.nav[i], o = B.niv[i], h = Math.max(0.01, Math.min(1, o)) * ALTO * 0.97;
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
    /* v5.2 (regla de la autora: el agua siempre de color de agua y OPACA, nunca translúcida): ya no es un velo transparente; es el agua misma
       de La Vaca, opaca, con ondas y reflejo del cielo, y su color pasa de agua limpia a agua café con la degradación D */
    const velo = new THREE.Mesh(gv, new THREE.ShaderMaterial({ side: THREE.DoubleSide, toneMapped: false, transparent: false, depthWrite: true,
      uniforms: { uD: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uD, uT; varying vec3 vW;
        void main(){ vec2 p = vW.xz;
          float nx = sin(p.x * 0.21 + uT * 1.3) + sin((p.x + p.y) * 0.13 - uT * 0.9), ny = cos(p.y * 0.19 - uT * 1.1) + cos((p.x - p.y) * 0.15 + uT * 0.8);
          vec3 N = normalize(vec3(nx * 0.06, 1.0, ny * 0.06)), V = normalize(cameraPosition - vW);
          float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0), sp = pow(max(dot(reflect(-V, N), normalize(vec3(0.5, 0.75, 0.4))), 0.0), 120.0);
          vec3 limpia = mix(vec3(0.10, 0.26, 0.25), vec3(0.20, 0.36, 0.33), 0.5 + 0.5 * sin((p.x + p.y) * 0.02)), cafe = vec3(0.30, 0.24, 0.14);
          vec3 c = mix(limpia, cafe, clamp(uD, 0.0, 1.0)); c = mix(c, vec3(0.62, 0.72, 0.78), fr * 0.45) + vec3(1.0, 0.96, 0.88) * sp * 0.8;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }` })); velo.renderOrder = 11; velo.position.y = y0() + 0.6;
    velo.onBeforeRender = () => { velo.material.uniforms.uT.value = (RELOJ.tAnim || performance.now() / 1000); };
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
      M4.compose(V3.set(x, y, z), Q.identity(), muerto ? S3.set(2.4, h * 0.75, 2.4) : S3.set(1.4, h * 0.55, 1.4)); R_.tro.setMatrixAt(i, M4); R_.tro.setColorAt(i, CC.set(muerto ? '#3b2a1e' : '#6b5a48')); } /* v5: el árbol perdido queda como tronco seco oscuro (se ve que falta la copa) */
    R_.arb.instanceMatrix.needsUpdate = true; if (R_.arb.instanceColor) R_.arb.instanceColor.needsUpdate = true; R_.tro.instanceMatrix.needsUpdate = true; if (R_.tro.instanceColor) R_.tro.instanceColor.needsUpdate = true;
    R_.velo.material.uniforms.uD.value = D; R_.velo.position.y = y + 0.6; /* v5.2: agua opaca que se vuelve café con D */
    // montones: uno por cada 0,1 t/día de aporte por encima de hoy (0,45), radio con el aporte
    const n = Math.max(0, Math.min(R_.borde.length, Math.round((ap - 0.45) / 0.1) + (ap > 0.45 ? 1 : 0))), rad = 6 + 5 * Math.min(2, ap);
    for (let k = 0; k < n; k++) { const [x, z] = R_.borde[k]; M4.compose(V3.set(x, y, z), Q.identity(), S3.set(rad, rad * 0.45, rad)); R_.mont.setMatrixAt(k, M4); }
    R_.mont.count = n; R_.mont.instanceMatrix.needsUpdate = true; }

  /* ---------- v4: MEDIDOR DE CORABASTOS = BARRA DE CARGA horizontal sobre un pin clavado en Corabastos (inventario ÷ 14.000 t) ----------
     La barra mira siempre a la cámara; se llena de izquierda a derecha (verde → ámbar desde 90 % → rojo); el tope (100 % = 14.000 t) es
     un remate rojo; sobre 100 % el exceso sigue en rojo hasta 120 %. */
  const GA = { H: 140, L: 260, A: 30, ESC: 1.2 }; /* v5: más pequeños (pedido de la autora) */
  const gG = new THREE.Group(); gG.name = 'ab01_medidor'; raiz.add(gG);
  { const [gx, gz] = lw(CORA_C[0], CORA_C[1]); gG.position.set(gx, 0, gz); }
  const mB = (c, o, dt = true) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: false, depthTest: dt, toneMapped: false, fog: false });
  const geoU = new THREE.BoxGeometry(1, 1, 1), geoIzq = new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0);
  const gPin = new THREE.Mesh(geoU, mB(0xffffff, 0.7)); gPin.scale.set(2, GA.H, 2); gPin.position.y = GA.H / 2; gPin.renderOrder = 14;
  const gPie = new THREE.Mesh(new THREE.ConeGeometry(10, 22, 4).rotateX(Math.PI), mB(0xffffff, 0.9)); gPie.position.y = 11; gPie.renderOrder = 14;
  const gBar = new THREE.Group(); gBar.position.y = GA.H; gG.add(gPin, gPie, gBar);
  const gMarco = new THREE.Mesh(geoU, mB(0x0d1116, 0.7, false)); gMarco.scale.set(GA.L + 14, GA.A + 14, 4); gMarco.renderOrder = 17;
  const gRiel = new THREE.Mesh(geoU, mB(0xffffff, 0.12, false)); gRiel.scale.set(GA.L, GA.A, 4.5); gRiel.renderOrder = 18;
  const gLleno = new THREE.Mesh(geoIzq, mB(0x4ade80, 1, false)); gLleno.scale.set(1, GA.A, 5); gLleno.position.x = -GA.L / 2; gLleno.renderOrder = 19;
  const gTope = new THREE.Mesh(geoU, mB(0xff3b30, 1, false)); gTope.scale.set(7, GA.A + 30, 6); gTope.position.x = -GA.L / 2 + GA.L / GA.ESC; gTope.renderOrder = 20;
  const gMarcas = []; for (const f of [0.25, 0.5, 0.75]) { const m = new THREE.Mesh(geoU, mB(0xffffff, 0.35, false)); m.scale.set(1.6, GA.A * 0.3, 5.5); m.position.set(-GA.L / 2 + GA.L * f / GA.ESC, -GA.A * 0.35, 0); m.renderOrder = 20; gMarcas.push(m); }
  gBar.add(gMarco, gRiel, gLleno, gTope, ...gMarcas); let gNiv = 0, gMeta = 0;
  const etG = etq('ab01-et-cora');
  function moverMedidor(dt) { const y = y0(); gG.position.y = y; gNiv += (gMeta - gNiv) * (1 - Math.exp(-dt * 3)); gLleno.scale.x = Math.max(1, Math.min(GA.ESC, gNiv) / GA.ESC * GA.L);
    gLleno.material.color.copy(rampa(Math.min(1, gNiv), CC)); gBar.quaternion.copy(T3.camera.quaternion); // de frente a la cámara (cartel)
    { const c = T3.camera.position, d = Math.hypot(c.x - gG.position.x, c.y - GA.H, c.z - gG.position.z), k = Math.max(0.6, Math.min(1.6, d / 2000)); gBar.scale.setScalar(k); } // tamaño parejo en pantalla
    gTope.material.opacity = gNiv > 0.97 ? 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 220)) : 1; gTope.material.transparent = gNiv > 0.97; }

  /* ---------- v3: RESIDUOS SIN RECOGER COMO PUNTOS (pedido de la autora: «que se vean») ----------
     Un punto por cada 2 t/día sin recoger (hoy 148 t/día → 74 puntos; game over 296 → 148), en los puntos críticos de basura del modelo (I.basura.puntos)
     y en el borde de La Vaca. Tamaño fijo en pantalla: se leen desde la cámara de inicio. Color café → rojo con la degradación D. */
  /* v4: cuadraditos más pequeños (4 px) que se mueven (vaivén corto alrededor de su sitio, al ritmo del reloj) y aumentan con los años:
     uno por cada t/día sin recoger (hoy 148; game over 296). Un solo objeto Points (una llamada de dibujo). */
  const RP = { max: 600, pts: null, n: 0, fase: null };
  const geoRP = new THREE.BufferGeometry(); geoRP.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(RP.max * 3), 3)); geoRP.setDrawRange(0, 0);
  const matRP = new THREE.PointsMaterial({ color: 0xc8823a, size: 4.5, sizeAttenuation: false, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, toneMapped: false });
  const puntosRP = new THREE.Points(geoRP, matRP); puntosRP.renderOrder = 18; puntosRP.frustumCulled = false; gR.add(puntosRP);
  const azar = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  function candidatosRP() { if (RP.pts || !R_.listo) return; const r = azar(20261126), out = [], y = y0() + 1.5;
    const B0 = (I && I.basura && I.basura.puntos || []).filter(p => p.fuente !== 'humedal');
    for (let k = 0; k < RP.max; k++) { let x, z;
      if (k % 5 < 3 && R_.borde.length) { const b = R_.borde[k % R_.borde.length], a = r() * 6.283, d = 8 + r() * 70; x = b[0] + Math.cos(a) * d; z = b[1] + Math.sin(a) * d; }
      else if (B0.length) { const b = B0[k % B0.length], a = r() * 6.283, d = 10 + r() * 140; x = b.x + Math.cos(a) * d; z = b.z + Math.sin(a) * d; }
      else { const a = r() * 6.283, d = 60 + r() * 260; x = R_.cx + Math.cos(a) * d; z = R_.cz + Math.sin(a) * d; }
      out.push(x, y, z); }
    RP.pts = out; RP.fase = Float32Array.from({ length: RP.max * 2 }, () => r() * 6.283); geoRP.attributes.position.array.set(out); geoRP.attributes.position.needsUpdate = true; }
  function moverPuntosRes() { if (!RP.pts || !RP.n || !gR.visible) return; const a = geoRP.attributes.position.array, t = (RELOJ.tAnim || performance.now() / 1000), P = RP.pts, F = RP.fase;
    for (let k = 0; k < RP.n; k++) { const o = k * 3; a[o] = P[o] + 6 * Math.sin(t * 1.3 + F[2 * k]); a[o + 2] = P[o + 2] + 6 * Math.cos(t * 1.1 + F[2 * k + 1]); }
    geoRP.attributes.position.needsUpdate = true; }
  function ponerPuntosRes() { const r = I && I.residuosK; candidatosRP(); if (!r || !RP.pts) return; const n = Math.max(0, Math.min(RP.max, Math.round(r.noRec)));
    if (n !== RP.n) { RP.n = n; geoRP.setDrawRange(0, n); } matRP.color.copy(COL_CAFE2).lerp(COL_ROJO, Math.min(1, r.D || 0)); }
  const COL_CAFE2 = new THREE.Color('#d08a3c'), COL_ROJO = new THREE.Color('#ff4d3d');

  /* ---------- v4: TRÁFICO «TIPO WAZE» ----------
     Las VÍAS mismas se pintan por congestión (verde → ámbar → rojo) con rayas que corren por cada carril en su sentido, al ritmo del reloj
     de la simulación (RELOJ.tAnim: se detienen en pausa). Vías: «major» y «mid» de data3d/net.json. Una sola malla (cintas) y un
     sombreador: la congestión de cada vía = nivel de la ciudad (0,62 + 0,033 × años, TomTom, I.congestion01) × factor de la vía
     [SUP: 0,8 lejos de Corabastos → 1,25 junto a ella, e^(−d/900 m), por los camiones de abasto] × hora [SUP: +35 % × cercanía en la franja
     con más camiones de Corabastos (franjas de ingreso × SIPSA), −17 % fuera de franja]. Rapidez de las rayas = 1 / (1 + congestión). */
  const TR = { listo: false, mesh: null, nivel: -1, nAr: 0 };
  const VS_W = `attribute float aS; attribute float aK; attribute float aN; uniform float uT; uniform float uNiv; uniform float uNivC; uniform float uH;
    varying float vS; varying float vC; varying float vY;
    void main(){ float c = mix(uNiv, uNivC, aN) * aK * (1.0 + uH * aN); vC = c; vS = aS - uT * 26.0 / (1.0 + c) ; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const FS_W = `uniform float uOp; varying float vS; varying float vC; varying float vY;
    void main(){ vec3 g = vec3(0.10,0.85,0.30), a = vec3(1.0,0.86,0.08), r = vec3(0.62,0.0,0.14); /* verde fluido · amarillo · carmesí de trancón (distinto del rosado de los camiones) */
      /* bandas definidas (pedido de la autora: que se distinga bien el amarillo del verde): verde puro hasta 0,52, paso corto a amarillo puro (0,52-0,6), amarillo hasta 0,8, paso a carmesí en 1,0 */
      vec3 col = vC < 0.6 ? mix(g, a, smoothstep(0.52, 0.6, vC)) : mix(a, r, smoothstep(0.8, 1.0, vC)); /* TomTom 0,7 = viajes 70 % más largos */
      float per = 40.0 + 30.0 / (1.0 + vC); float f = fract(vS / per); float raya = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.5, 0.6, f));
      gl_FragColor = vec4(col * (0.82 + 0.18 * raya), uOp); }`; /* v5: la superficie de la vía pintada, sin puntos ni rayas blancas; un pulso apenas más oscuro se mueve con el tráfico */
  const iniTrafico = () => { const N = T3.net; if (!N || !N.edges) return false;
    const [cx, cz] = lw(CORA_C[0], CORA_C[1]), P = [], S = [], K = [], NN = [], ix = []; let nv = 0, nAr = 0;
    for (const [tipo, p] of N.edges) { if ((tipo !== 'major' && tipo !== 'mid') || p.length < 2) continue;
      const w = p.map(([x, z]) => lw(x, z)), m = w[Math.floor(w.length / 2)], d = Math.hypot(m[0] - cx, m[1] - cz), en = Math.exp(-d / 900), k = (0.8 + 0.45 * en) * (tipo === 'major' ? 1.12 : 0.92), ancho = tipo === 'major' ? 9 : 6; /* v5 [SUP visual]: las arterias más cargadas que las intermedias */
      let L = 0; for (let i = 1; i < w.length; i++) L += Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]); if (L < 30) continue; nAr++;
      for (const lado of [1, -1]) { let s = 0;
        for (let i = 1; i < w.length; i++) { const [x0, z0] = w[i - 1], [x1, z1] = w[i], l = Math.hypot(x1 - x0, z1 - z0); if (l < 0.5) continue; const ux = (x1 - x0) / l, uz = (z1 - z0) / l, nx = -uz * lado, nz = ux * lado;
          const o0 = ancho * 0.15, o1 = ancho * 1.15; // carril a cada lado del eje
          const sa = lado > 0 ? s : L - s, sb = lado > 0 ? s + l : L - s - l;
          P.push(x0 + nx * o0, 0, z0 + nz * o0, x0 + nx * o1, 0, z0 + nz * o1, x1 + nx * o0, 0, z1 + nz * o0, x1 + nx * o1, 0, z1 + nz * o1);
          S.push(sa, sa, sb, sb); K.push(k, k, k, k); NN.push(en, en, en, en); ix.push(nv, nv + 1, nv + 2, nv + 1, nv + 3, nv + 2); nv += 4; s += l; } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(K, 1)); g.setAttribute('aN', new THREE.Float32BufferAttribute(NN, 1)); g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(ix, 1) : new THREE.Uint16BufferAttribute(ix, 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: VS_W, fragmentShader: FS_W, uniforms: { uT: { value: 0 }, uNiv: { value: 0.62 }, uNivC: { value: 0.62 }, uH: { value: 0 }, uOp: { value: 0.65 } }, transparent: true, depthWrite: false, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4, side: THREE.DoubleSide, toneMapped: false }); /* color de la vía más suave (opacidad 0,65) y desplazamiento de profundidad mínimo: queda sobre el asfalto pero DEBAJO de los carros (antes −400 unidades lo ponía encima de todo) */
    const mesh = new THREE.Mesh(g, mat); mesh.position.y = 0.12; mesh.renderOrder = 2; mesh.frustumCulled = false; gT.add(mesh);
    Object.assign(TR, { listo: true, mesh, nAr }); return true; };
  /* v5.2: las vías ya no se pintan con un nivel general: data3d/vias_densidad.js mide la densidad de vehículos de cada tramo (los carros de la
     grabación SUMO + los camiones y morados de esta capa) y la compara con 28 veh/km/carril (HCM). Esta capa solo la prende/apaga. */
  const VIAS = crearViasDensidad({ T3 });
  VIAS.extra('ab01', () => (MO.listo && MO.VEH && MO.VEH.grupo.visible ? MO.pos : null));
  function ponerTrafico() { const c = I && I.congestion01; VIAS.ver(!!(c && estado.trafico && raiz.visible)); return;
    // (v5: nivel general por vía; se deja abajo como referencia, ya no se usa)
    if (!TR.listo && !iniTrafico()) return; if (!c) { gT.visible = false; return; } gT.visible = estado.trafico;
    const U = I.abasto && I.abasto.ab01; /* v5: con propuesta el tráfico de la ciudad baja hasta −25 % a medida que abren los mercados (supuesto declarado en factorTraf, simulaciones12.js) */
    /* con propuesta [SUP, el mismo de la permanencia en ab01Paso y de factorTraf]: a medida que abren los mercados la subida de la ciudad
       desde 2025 deja de sumarse (× (1 − fracción abierta)) y el tráfico baja hasta −25 % */
    const fM = I.propuesta && U ? (U.fMerc || 0) : 0, nv = I.propuesta ? (0.62 + (c.nivel - 0.62) * (1 - fM)) * (1 - 0.25 * fM) : c.nivel;
    TR.nivel = Math.round(nv * 1000) / 1000; TR.mesh.material.uniforms.uNiv.value = TR.nivel;
    TR.nivelC = U && U.cC != null ? Math.round(U.cC * 1000) / 1000 : TR.nivel; TR.mesh.material.uniforms.uNivC.value = TR.nivelC; } /* v5: junto a Corabastos manda su propio nivel (U.cC de ab01Paso: con propuesta baja con los camiones que se van a los mercados) */
  function moverTrafico() {
    if (!TR.listo || !gT.visible) return; const u = TR.mesh.material.uniforms, U = I && I.abasto && I.abasto.ab01;
    TR.mesh.position.y = (T3.viaY != null ? T3.viaY : y0() + 0.3) + 1.2; u.uT.value = RELOJ.tAnim || 0;
    // hora del reloj: franja de ingreso de carga a Corabastos (más camiones/h → más congestión cerca)
    const h = ((RELOJ.minutoDia != null ? RELOJ.minutoDia : 0) / 60) % 24, F = U && U.franjas ? U.franjas.find(f => h >= f.h0 && h < f.h1) : null, mx = U && U.franjas ? Math.max(...U.franjas.map(f => f.veh_h)) : 1;
    const meta = F ? 0.35 * F.veh_h / mx * (U && U.ing ? Math.min(1.3, U.ing / 6460) : 1) : -0.17; /* v5: la franja pesa según los camiones que llegan */ u.uH.value += (meta - u.uH.value) * 0.03; }

  /* ---------- v5: VEHÍCULOS (capa «Tráfico») ----------
     · MORADOS (solo con propuesta, pedido de la autora 2026-11-26): los carros NUEVOS que crean los cambios de la propuesta: viajes a los
       mercados abiertos (cada uno sale de un barrio a ~800 m del mercado) y a Bavaria Común. Pocos: uno por cada 2,5 mercados abiertos,
       máx. 12, más 2 a Bavaria Común [escala visual declarada, no un aforo].
     · CAMIONES A CORABASTOS (los dos escenarios): llegan por la red vial desde ~2,6 km. Cuántos = 20 × ingreso ÷ 6.460 × cola (U.cola de
       ab01Paso, máx. 3) [escala visual]; con cola > 1 una parte (1 − 1 ÷ cola) espera en fila a la entrada: sin propuesta, cuando
       Corabastos se llena, se ven muchos camiones represados. Un árbol de caminos más cortos por destino, uno por cuadro como mucho. */
  const MO = { listo: false, cargando: false, VEH: null, R: null, T: null, rutas: new Map(), objs: [], cam: [], n: 0, nCam: 0, col: 0xa21cff, MAX: 14, MAXC: 90 };
  function iniMorados() { if (MO.cargando) return; MO.cargando = true;
    Promise.all([import('./viajes_mercados.js?v=11'), import('./vehiculos.js?v=10')]).then(([vm, mv]) => {
      MO.arbol = vm.arbol; MO.R = vm.construirRed(T3.net, lw); const [bx, bz] = lw(9319, 2942.6), nb = MO.R.cercano(bx, bz); if (nb.i < 0) return; MO.T = vm.arbol(MO.R, nb.i); MO.bav = [MO.R.X[nb.i], MO.R.Z[nb.i]];
      MO.VEH = mv.crearVehiculos({ T3, movil: !!(T3.movil || T3.liviano), maxDist: 5000, cuantos: { carro: MO.MAX, camion: MO.MAXC } }); MO.VEH.grupo.visible = false;
      MO.objs = Array.from({ length: MO.MAX }, (_, i) => ({ _vv: ['suv', 'sedan', 'hatch'][i % 3], _vc: MO.col, _pc: MO.col, _vl: 0 }));
      MO.cam = Array.from({ length: MO.MAXC }, () => ({})); MO.listo = true;
    }).catch(e => console.warn('vehículos de la 01:', e)); }
  MO.ARB = new Map(); MO.pend = 0; MO.pos = { n: 0, x: new Float32Array(MO.MAX + MO.MAXC), z: new Float32Array(MO.MAX + MO.MAXC) };
  function arbolMo(x, z) { const n = MO.R.cercano(x, z); if (n.i < 0) return null; let T = MO.ARB.get(n.i);
    if (!T) { if (MO.pend === MO.cuadro) return null; MO.pend = MO.cuadro; T = MO.arbol(MO.R, n.i); MO.ARB.set(n.i, T); } return T; }
  function rutaDe(T, x, z) { const R = MO.R, n = R.cercano(x, z); if (!T || n.i < 0 || !isFinite(T.dist[n.i])) return null; const out = [[R.X[n.i], R.Z[n.i]]]; let u = n.i;
    while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) return null; const v = R.ea[e] === u ? R.eb[e] : R.ea[e]; out.push([R.X[v], R.Z[v]]); u = v; }
    if (out.length < 2) return null; const S = new Float64Array(out.length); for (let k = 1; k < out.length; k++) S[k] = S[k - 1] + Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]);
    return S[S.length - 1] > 200 ? { P: out, S, L: S[S.length - 1] } : null; }
  function rutaV(key, dx, dz, ox, oz) { if (MO.rutas.has(key)) return MO.rutas.get(key); const T = arbolMo(dx, dz); if (!T) return null;
    const r = rutaDe(T, ox, oz); MO.rutas.set(key, r); return r; }
  const enRutaMo = (r, s) => { let a = 0, b = r.S.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (r.S[m] < s) a = m; else b = m; } const f = (s - r.S[a]) / Math.max(1e-6, r.S[b] - r.S[a]);
    const ex = r.P[b][0] - r.P[a][0], ez = r.P[b][1] - r.P[a][1], l = Math.hypot(ex, ez) || 1; return [r.P[a][0] + ex * f, r.P[a][1] + ez * f, ex / l, ez / l]; };
  const ponerV = (o, tipo, r, s, ida) => { let [x, z, fx, fz] = enRutaMo(r, s); if (!ida) { fx = -fx; fz = -fz; } x -= fz * 1.8; z += fx * 1.8;
    MO.VEH.poner(o, tipo, x, y0() + 0.02 + (T3.alzaVia ? T3.alzaVia(x, z) : 0), z, Math.atan2(fx, fz));
    const P = MO.pos; if (P.n < P.x.length) { P.x[P.n] = x; P.z[P.n] = z; P.n++; } /* v5.2: para medir la densidad de las vías (vias_densidad.js) */ return [x, z]; };
  function moverMorados() {
    const U = I && I.abasto && I.abasto.ab01, C = I && I.abasto && I.abasto.cora, prop = !!(I && I.propuesta);
    const on = !!(U && estado.trafico && raiz.visible); if (on && !MO.listo) iniMorados(); if (!MO.listo) return; MO.VEH.grupo.visible = on; if (!on) { MO.n = 0; MO.nCam = 0; return; }
    MO.cuadro = (MO.cuadro || 0) + 1; const tA = RELOJ.tAnim || 0; MO.VEH.inicio(); let k = 0, kc = 0; MO.pos.n = 0;
    // morados: carros nuevos de la propuesta (mercados y Bavaria Común)
    const ms = prop && I.abasto.mercados ? I.abasto.mercados.filter(m => m.activo) : [];
    if (prop && ms.length) { const nM = Math.min(MO.MAX - 2, Math.max(2, Math.ceil(ms.length / 2.5))), n = nM + 2;
      for (let i = 0; i < n; i++) { let r;
        if (i < nM) { const m = ms[Math.floor(i * ms.length / nM)], a = i * 2.39996, d = 700 + (i % 3) * 150; r = rutaV('m' + i + ':' + m.x + ',' + m.z, m.x, m.z, m.x + Math.cos(a) * d, m.z + Math.sin(a) * d); }
        else if (MO.bav) { const a = (i - nM) * 2.6 + 0.9; r = rutaV('b' + i, MO.bav[0], MO.bav[1], MO.bav[0] + Math.cos(a) * 1800, MO.bav[1] + Math.sin(a) * 1800); }
        if (!r) continue; const s0 = ((tA * 14 / r.L) + i * 0.137) % 2, ida = s0 < 1, p = ponerV(MO.objs[i], 'carro', r, (ida ? s0 : 2 - s0) * r.L, ida); if (!k) MO.p0 = [Math.round(p[0]), Math.round(p[1])]; k++; } }
    // camiones que llegan a Corabastos
    /* v5.3 (pedido de la autora: ver el trancón junto a Corabastos sin propuesta): la fila ya no depende solo de la cola de inventario sino de cuánto
       más tarda en salir la mercancía = la permanencia del modelo (U.Tp ÷ 0,76 d de 2025: congestión junto a Corabastos × cola); a más permanencia,
       más camiones esperando (ley de Little). Sin propuesta la congestión de base sube cada año; con propuesta baja con los mercados. Los camiones
       en fila esperan a 8 m uno de otro en los 6 accesos más cargados [escala visual declarada, no un aforo]. */
    if (C) { const cola = Math.max(1, Math.min(3.5, U.Tp ? U.Tp / 0.76 : (U.cola || 1))), nC = Math.min(MO.MAXC, Math.round(24 * (U.ing || 6460) / 6460 * cola)), nEsp = Math.round(nC * (1 - 1 / cola)), vel = 12 / (1 + (U.cC || 0.62));
      for (let i = 0; i < nC; i++) { const esp = i < nEsp, a = (esp ? (i % 6) * 1.0472 : (i % 12) * 0.5236) + 0.2, d = 2400 + (i % 4) * 250, r = rutaV('c' + (esp ? 'q' + (i % 6) : i % 24), C.x, C.z, C.x + Math.cos(a) * d, C.z + Math.sin(a) * d); if (!r) continue;
        const s = esp ? Math.max(0, r.L - 30 - 8 * Math.floor(i / 6)) : (((tA * vel / r.L) + i * 0.173) % 1) * r.L; // en fila a la entrada o llegando
        ponerV(MO.cam[i], 'camion', r, s, true); kc++; } }
    MO.VEH.fin(); MO.n = k; MO.nCam = kc; }
  /* ---------- por cuadro (etiquetas mínimas: solo el porcentaje, pedido de la autora) ---------- */
  let tPrev = 0, tTxt = 0;
  const ETS = [etB, etR, etT, etG];
  const chip = (n, pc, col) => `<span style="opacity:.75">${n}</span> <b style="font-size:13px;color:${col}">${pc}</b>`;
  const colPc = (v) => (v >= 1 ? '#ff8a80' : v >= 0.9 ? '#ffd27a' : '#9be8b0');
  RELOJ.alDibujar(() => {
    if (!raiz.visible || !I) { if (MO.listo && MO.VEH.grupo.visible) MO.VEH.grupo.visible = false; if (etG.style.display !== 'none' || etB.style.display !== 'none') ETS.forEach(e => { e.style.display = 'none'; }); return; }
    const ahora = performance.now(), dt = tPrev ? Math.min(0.1, (ahora - tPrev) / 1000) : 0; tPrev = ahora;
    moverBodegas(dt, ahora); moverTrafico(dt); moverMedidor(dt); moverPuntosRes(); moverMorados();
    const leer = ahora - tTxt > 200; if (leer) tTxt = ahora;
    etB.style.display = 'none'; // la nave más llena ya no lleva tarjeta: el medidor de Corabastos dice el porcentaje
    const U = I.abasto && I.abasto.ab01;
    if (U && enPantalla(gG.position.x, y0() + GA.H + (GA.A / 2 + 16) * gBar.scale.x, gG.position.z, etG) && leer) txt(etG, chip('Corabastos', nf(U.sat * 100) + ' %', colPc(U.sat)) + ` <span style="opacity:.6;font-size:10.5px">de su límite de ${nf(U.cap || 14000)} t${U.nQuit ? ` · ${U.nQuit} naves quitadas` : ''}</span>`);
    const r = I.residuosK;
    if (r && gR.visible && R_.listo) { if (enPantalla(R_.cx, y0() + 30, R_.cz, etR) && leer) txt(etR, chip('Residuos', nf(r.noRec / r.umbral * 100) + ' %', colPc(r.noRec / r.umbral))); }
    else etR.style.display = 'none';
    const c = I.congestion01;
    if (c && estado.trafico) { const [x, z] = lw(CORA_C[0] + 900, CORA_C[1] + 900); const k = leer ? VIAS.medir(...lw(CORA_C[0], CORA_C[1]), 900) : null; /* v5.2: densidad medida en las vías a ≤ 900 m de Corabastos */
      if (enPantalla(x, y0() + 40, z, etT) && leer && k != null) txt(etT, chip('Arterias junto a Corabastos', VIAS.zona ? nf(VIAS.zona.carmesi * 100) + ' % en rojo' : nf(k, 1) + ' veh/km/carril', VIAS.zona && VIAS.zona.carmesi >= 0.25 ? '#ff6b8a' : VIAS.zona && VIAS.zona.carmesi + VIAS.zona.amarillo >= 0.15 ? '#ffd27a' : '#9be8b0') + ` <span style="opacity:.6;font-size:10.5px">${VIAS.zona ? nf(VIAS.zona.amarillo * 100) + ' % en amarillo · ' : ''}${nf(k, 1)} veh/km/carril en promedio</span>`); }
    else etT.style.display = 'none';
  });

  /* v5: «Huertas hidropónicas activas» (con propuesta) se ve en el mapa: se instalan tantas cubiertas como diga el deslizador (U.nH, en el
     orden de huertas_hidro.js: primero las de 15 pisos o más), de una vez al moverlo. KEN_HIDRO_FIJA le dice a escenarios_sim.js que no
     las cambie mientras corre la 01. */
  let hidroUlt = -1, hidroPedida = false, hidroPrendida = false;
  function ponerHidro() { const H = window.KEN_HIDRO, U = I && I.propuesta && I.abasto && I.abasto.ab01;
    if (!U || U.nH == null) { if (window.KEN_HIDRO_FIJA != null) { window.KEN_HIDRO_FIJA = null; hidroUlt = -1; if (H && hidroPrendida && H.ver) H.ver(false); hidroPrendida = false; } return; }
    if (!H && !hidroPedida && T3.EST && T3.EST.hidroponia) { hidroPedida = true; try { T3.EST.hidroponia(true); } catch (e) { console.warn('huertas 01:', e); } } /* la 01 las arma si no estaban */
    if (!H || !H.fraccion || !(H.techos > 0)) return; if (!hidroPrendida) { hidroPrendida = true; if (H.ver) H.ver(true); }
    const elegibles = Math.max(1, H.cubiertasElegibles ? H.cubiertasElegibles() : H.techos);
    const meta = U.nHMeta ?? U.nH, progreso = Math.max(0, Math.min(1, (U.sem || 0) / 520));
    const f = Math.max(0, Math.min(1, meta / elegibles)) * progreso; window.KEN_HIDRO_FIJA = f;
    if (Math.abs(f - hidroUlt) > 1e-6) { hidroUlt = f; if (H.ver && !(H.grupo?.visible || T3.roof2Group?.visible)) H.ver(true); H.fraccion(f); } }
  const api = window.KEN_AB01C = {
    estado, grupo: raiz,
    poner(x) { I = x || null; raiz.visible = !!I; ponerHidro(); if (!I) return; raiz.traverse(o => { o.castShadow = false; o.receiveShadow = false; }); /* v4: nada de esta capa proyecta sombras (cuadros oscuros sobre el agua) */
      for (const n of ['degradacion_basura', 'degradacion_monticulos']) { const o = T3.scene.getObjectByName(n); if (o) o.castShadow = false; } /* las bolsas de degradacion.js tampoco, mientras corre la 01 */ const U = I.abasto && I.abasto.ab01; gMeta = U ? U.sat : 0; ponerBodegas(); ponerResiduos(); ponerPuntosRes(); ponerTrafico(); },
    ver(on) { raiz.visible = !!on && !!I; if (!raiz.visible) { ETS.forEach(e => { e.style.display = 'none'; }); if (!window.KEN_VIAS_PAR) VIAS.ver(false); } },
    capa(k, on) { if (!(k in estado)) return; estado[k] = !!on; const g = { bodegas: gB, residuos: gR, trafico: gT }[k]; g.visible = !!on; if (on && I) { R_.D = -1; TR.nivel = -1; api.poner(I); } },
    morados() { return MO.n; },
    visible(k) { const g = { bodegas: gB, residuos: gR, trafico: gT }[k]; return !!(raiz.visible && g && g.visible); },
    info() { return { estaciones: estM.count, bodegas: B.listo ? B.n : 0, arboles: R_.n, montones: R_.mont ? R_.mont.count : 0, trafico: TR.listo ? { vias: TR.nAr, hora: +TR.mesh.material.uniforms.uH.value.toFixed(3) } : null, nivel: TR.nivel, morados: MO.n, camiones: MO.nCam, morado0: MO.p0 || null, moradosG: MO.listo ? { vis: MO.VEH.grupo.visible, padre: !!MO.VEH.grupo.parent, mallas: MO.VEH.grupo.children.filter(o => o.visible && o.count > 0).map(o => o.count) } : null, residuos: RP.n, barra: +gNiv.toFixed(3) }; }
  };
  return api;
}
