/* ============ SIMULACIÓN 02 · CAPA DEL TERRITORIO (red vial con cierre, ruido, pasajes por Bavaria) ============
   window.KEN_MOV02 = { poner(m), ruido(on), quitar() } · m = I.mov02 de simulaciones12.js (data3d/mov02_modelo.js). Se redibuja con cada
   semana y con cada deslizador: solo cambian uniformes (las mallas se arman una vez).
   · ARTERIAS (Av. de las Américas, Av. Boyacá, Av. Primero de Mayo, Calle 38 Sur: aristas de T3.net de data3d/cierre_gradual.js) y CALLES
     LOCALES (aristas 'local' a 450 m o menos del punto de la Junta de Acción Comunal de Castilla, Marsella, Mandalay y María Paz,
     data3d/asambleas.json [SUP: el barrio se aproxima por ese punto]). Color = flujo ÷ capacidad: verde < 70 %, amarillo 85 %, naranja 100 %,
     rojo (#ef4444) desde 120 %; ancho del trazo ∝ flujo; pulsos que corren por la vía a la velocidad del modelo (BPR): con congestión van lento.
     La vía cerrada: rojo oscuro; las franjas, barreras y el desvío de los carros grabados los dibuja data3d/cierre_gradual.js.
     La Primero de Mayo solo tiene 18 aristas en la red del modelo (net.json): se ve un tramo corto.
   · RUIDO (botón «Mapa de ruido»): halo de 160 m a cada lado de cada vía, color por dB(A) del modelo: > 75 rojo, 65–75 naranja, 50–65 amarillo,
     < 50 verde.
   · CON PROPUESTA: los 4 pasajes de data3d/mov02_pasajes.json (tools/mov02_pasajes.mjs: sin tocar copas; esmeralda con borde ámbar), opacidad =
     permeabilidad, personas 3D que los cruzan (cuántas ∝ permeabilidad) y un manto verde bajo cada copa del bosque (árboles con marca 1 de bavaria_arboles.json). Sin nubes de puntos. */
import { VIAS } from './cierre_gradual.js?v=9';
import { MERCADOS } from './sim_red_datos.js?v=2';
import { crearChips } from './chips.js?v=3'; /* chips con ícono plano, como la 01 (2026-11-27) */
/* CON PROPUESTA (como la 01): carros MORADOS que van por las vías reales a los mercados de barrio de la propuesta (MERCADOS de sim_red_datos.js): son
   los viajes a Corabastos que se cambian por viajes cortos. Cuántos = 11.465 veh/día a Corabastos × 10 % en la hora pico × 45 % × permeabilidad
   (los mismos datos de mov02_modelo.js) ÷ 20 [escala visual declarada], máx. 30. Cada uno sale de un punto a ~800 m de su mercado. */
const ART = ['americas', 'boyaca', 'mayo', 'calle38'];
const BARRIOS = [[3063.8, 275.2], [4620.7, 742.9], [2936.6, 1098.1], [1148.3, 266]]; // Castilla, Marsella, Mandalay, María Paz (mundo; asambleas.json)
const N_BARRIO = ['Castilla', 'Marsella', 'Mandalay', 'María Paz'];
/* RÓTULOS (pedido de la autora: «ponías el nombre de la vía»): cada vía alterna lleva su nombre y su ocupación (flujo ÷ capacidad del modelo) con el
   color de vias_densidad.js (verde < 85 %, amarillo hasta 100 %, carmesí desde 100 %); las calles locales, uno por barrio. La vía cerrada lleva el suyo
   («… · CERRADA», data3d/cierre_gradual.js). Tamaño fijo en pantalla, como ese. */
const R_BARRIO = 450, WMAX = 26, WRUIDO = 320;

export function crearMov02({ T3, RELOJ }) {
  if (window.KEN_MOV02) return window.KEN_MOV02;
  const THREE = T3.THREE; let G = null, armado = null, M = null, ruidoOn = false, ult = null;
  const U = { uT: { value: 0 } }, mallas = {}, peat = { pts: null, P: null, n: 0, L: [] }, tramos = {};
  /* FILA: vehículos detenidos en las vías alternas. Cuántos por vía = vehículos por km en fila del modelo (flujo × demora de Akçelik, ley de Little)
     × km de la vía ÷ 4 [escala visual declarada, como la fila de camiones de la 01], máx. 140 por vía; 1 de cada 5 es camión (abastecimiento
     atrapado). Se ponen desde el punto de la vía más cercano a la vía cerrada hacia afuera, cada 7 m en dos carriles. */
  const ROT = {};
  function rotulo(clave, x, z) { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 136; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }));
    sp.position.set(x, (T3.sueloY != null ? T3.sueloY : 0.3) + 30, z); sp.scale.set(0.22, 0.029, 1); sp.renderOrder = 31; sp.frustumCulled = false; sp.visible = false; G.add(sp); ROT[clave] = { sp, cv, tx, txt: '' }; }
  function pintarRot(clave, txt, x) { const R = ROT[clave]; if (!R) return; R.sp.visible = false; return; /* reemplazado por los chips (chips.js) */ R.sp.visible = !!txt; if (!txt || R.txt === txt + x.toFixed(2)) return; R.txt = txt + x.toFixed(2);
    const c = R.cv.getContext('2d'), fondo = x >= 1 ? '#9e0024' : x >= 0.85 ? '#ffdb14' : '#1ad94d', letra = x >= 0.85 && x < 1 ? '#111' : '#fff';
    const ico = /^(AV|CALLE)/.test(txt) ? '🚗' : '🏘️'; c.clearRect(0, 0, 1024, 136); c.font = '700 56px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; const tw = c.measureText(txt).width, w = Math.min(1010, tw + 70 + (ico ? 96 : 0)), x0 = (1024 - w) / 2;
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.fillStyle = fondo; c.beginPath(); c.roundRect(x0, 22, w, 92, 46); c.fill(); c.shadowBlur = 0; c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
    if (ico) { c.beginPath(); c.arc(x0 + 50, 68, 38, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill(); c.font = '44px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ico, x0 + 50, 71); c.font = '700 56px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; }
    c.fillStyle = letra; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x0 + (ico ? 96 : 0) + (w - (ico ? 96 : 0)) / 2, 70); R.tx.needsUpdate = true; }
  const MOR = { R: null, arbol: null, arb: new Map(), rutas: new Map(), pend: 0, objs: Array.from({ length: 30 }, (_, i) => ({ _vv: ['suv', 'sedan', 'hatch'][i % 3], _vc: 0xa21cff, _pc: 0xa21cff, _vl: 0 })) };
  function rutaMor(i) { if (MOR.rutas.has(i)) return MOR.rutas.get(i); if (!MOR.R || MOR.pend) return null; const m = MERCADOS[i % MERCADOS.length], a = i * 2.39996, d = 700 + (i % 3) * 150, Rr = MOR.R;
    const nd = Rr.cercano(m.x, m.z), no = Rr.cercano(m.x + Math.cos(a) * d, m.z + Math.sin(a) * d); if (nd.i < 0 || no.i < 0) { MOR.rutas.set(i, null); return null; }
    let T = MOR.arb.get(nd.i); if (!T) { MOR.pend = 1; T = MOR.arbol(Rr, nd.i); MOR.arb.set(nd.i, T); } if (!isFinite(T.dist[no.i])) { MOR.rutas.set(i, null); return null; }
    const P = [[Rr.X[no.i], Rr.Z[no.i]]]; let u = no.i; while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) break; u = Rr.ea[e] === u ? Rr.eb[e] : Rr.ea[e]; P.push([Rr.X[u], Rr.Z[u]]); }
    const S = [0]; for (let k = 1; k < P.length; k++) S.push(S[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); const r = S[S.length - 1] > 150 ? { P, S, L: S[S.length - 1] } : null; MOR.rutas.set(i, r); return r; }
  /* los carros morados NO usan la vía cerrada: mientras esté cerrada, sus tramos de la red de rutas cuestan infinito y las rutas se recalculan */
  function bloquearCierre() { const R = MOR.R; if (!R) return; if (!MOR.eC0) MOR.eC0 = Float64Array.from(R.eC);
    const st = window.KEN_CIERRE && window.KEN_CIERRE.estado, cerrada = !!(T3.enCierre && st && st.via && st.fase >= 0.5), clave = cerrada ? st.via : '';
    if (clave === MOR.bloq) return; MOR.bloq = clave; MOR.arb.clear(); MOR.rutas.clear();
    for (let e = 0; e < R.eC.length; e++) R.eC[e] = cerrada && T3.enCierre((R.X[R.ea[e]] + R.X[R.eb[e]]) / 2, (R.Z[R.ea[e]] + R.Z[R.eb[e]]) / 2) ? Infinity : MOR.eC0[e]; }
  const FILA = { VEH: null, objs: [], pos: null, MAX: 600, plan: [], clave: '' };
  const Yv = () => (T3.viaY != null ? T3.viaY : 0.62);

  function cinta(lista, w, Y) { // lista: [{ p: [[x,z]…] }] en el mundo → tira de ancho w; aV (−1…1 a lo ancho), aS (m a lo largo)
    let nv = 0, ni = 0; for (const c of lista) { nv += c.p.length * 2; ni += (c.p.length - 1) * 6; }
    const P = new Float32Array(nv * 3), V = new Float32Array(nv), S = new Float32Array(nv), I = new Uint32Array(ni); let o = 0, q = 0;
    for (const c of lista) { const p = c.p, n = p.length; let s = 0;
      for (let i = 0; i < n; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        if (i) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        for (const sg of [-1, 1]) { P[o * 3] = p[i][0] - dz * w / 2 * sg; P[o * 3 + 1] = Y; P[o * 3 + 2] = p[i][1] + dx * w / 2 * sg; V[o] = sg; S[o] = s; o++; }
        if (i < n - 1) { const b0 = o - 2; I[q++] = b0; I[q++] = b0 + 2; I[q++] = b0 + 1; I[q++] = b0 + 1; I[q++] = b0 + 2; I[q++] = b0 + 3; } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aV', new THREE.BufferAttribute(V, 1)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1));
    g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingSphere(); return g;
  }
  const VS = 'attribute float aV, aS; varying float vV, vS; void main(){ vV = aV; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const FS = {
    // vía: núcleo de ancho uW (fracción del ancho máximo) con pulsos que avanzan a uVel (m/s de dibujo)
    via: 'uniform vec3 uC; uniform float uW, uA, uVel, uT; varying float vV, vS; void main(){ float e = 1.0 - smoothstep(uW * 0.8, uW, abs(vV)); if (e < 0.01) discard;' +
      ' float d = fract(vS / 46.0 - uT * uVel / 46.0); float pul = 0.55 + 0.45 * smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.35, 0.5, d));' +
      ' gl_FragColor = vec4(uC * (0.75 + 0.35 * pul), uA * e * (0.55 + 0.45 * pul)); }',
    ruido: 'uniform vec3 uC; uniform float uA; varying float vV, vS; void main(){ float f = 1.0 - vV * vV; float a = uA * f * f * 0.32; if (a < 0.004) discard; gl_FragColor = vec4(uC, a); }',
    pasaje: 'uniform float uA, uT; varying float vV, vS; void main(){ float r = abs(vV); vec3 c = mix(vec3(0.133, 0.773, 0.369), vec3(0.961, 0.62, 0.043), smoothstep(0.55, 0.8, r));' +
      ' float a = uA * (1.0 - smoothstep(0.85, 1.0, r)) * (0.8 + 0.2 * sin(vS * 0.15 - uT * 2.0)); if (a < 0.004) discard; gl_FragColor = vec4(c, a); }'
  };
  const mat = (fs, ex = {}) => new THREE.ShaderMaterial({ uniforms: { ...U, uC: { value: new THREE.Color('#22c55e') }, uW: { value: 0.4 }, uA: { value: 0.9 }, uVel: { value: 8 }, ...ex },
    vertexShader: VS, fragmentShader: FS[fs], transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });

  async function armar() {
    G = new THREE.Group(); G.name = 'cierre-mov02'; T3.scene.add(G);
    const E = T3.net.edges, lw = T3.lw, poli = (e) => E[e][1].map(q => lw(q[0], q[1]));
    // arterias
    /* 2026-11-27 (la autora: «que se vea como la 01»): las vías ya no llevan cintas de color propias; el color lo da vias_densidad.js, que cuenta
       los carros de SUMO y los de la fila de abajo, igual que en la 01. Se guardan los tramos de cada vía para poner la fila. */
    for (const k of ART) { const L = (VIAS[k] ? VIAS[k].e : []).filter(e => E[e]).map(e => ({ p: poli(e) })); if (!L.length) continue;
      const mv = null; tramos[k] = L;
      const mr = new THREE.Mesh(cinta(L, WRUIDO, Yv() + 0.9), mat('ruido')); mr.renderOrder = 4; mr.visible = false; mr.frustumCulled = false; G.add(mr);
      mallas[k] = { r: mr }; }
    // calles locales de Castilla, Marsella, Mandalay y María Paz
    const loc = []; for (let e = 0; e < E.length; e++) { if (E[e][0] !== 'local') continue; const P = poli(e), m = P[P.length >> 1]; if (BARRIOS.some(b => Math.hypot(m[0] - b[0], m[1] - b[1]) < R_BARRIO)) loc.push({ p: P }); }
    for (const k of ART) if (tramos[k]) { const L = tramos[k], c = L[L.length >> 1].p, q = c[c.length >> 1]; rotulo(k, q[0], q[1]); }
    BARRIOS.forEach((b, i) => rotulo('b' + i, b[0], b[1]));
    if (loc.length) { tramos.locales = loc;
      const mr = new THREE.Mesh(cinta(loc, 90, Yv() + 0.85), mat('ruido')); mr.renderOrder = 3; mr.visible = false; mr.frustumCulled = false; G.add(mr); mallas.locales = { r: mr, n: loc.length }; }
    // vehículos de la fila: los mismos modelos de la 01 (vehiculos.js); vias_densidad.js los cuenta
    try { const mv = await import('./vehiculos.js?v=11'); FILA.VEH = mv.crearVehiculos({ T3, movil: !!(T3.movil || T3.liviano), maxDist: 5000, cuantos: { carro: FILA.MAX, camion: Math.ceil(FILA.MAX / 5) } }); FILA.VEH.grupo.visible = false;
      FILA.objs = Array.from({ length: FILA.MAX }, () => ({})); FILA.pos = { n: 0, x: new Float32Array(FILA.MAX), z: new Float32Array(FILA.MAX) };
      import('./viajes_mercados.js?v=12').then(vm => { MOR.R = vm.construirRed(T3.net, T3.lw); MOR.arbol = vm.arbol; }).catch(() => {});
      import('./morados_marca.js?v=2').then(mm => { MOR.MK = mm.crearMarcasMorados({ T3, max: 30 }); }).catch(() => {});
      import('./vias_densidad.js?v=4').then(m => m.crearViasDensidad({ T3 }).extra('mov02', () => (FILA.VEH && FILA.VEH.grupo.visible ? FILA.pos : null))).catch(() => {}); } catch (e) { console.warn('mov02 vehículos:', e); }
    // pasajes y bosque (con propuesta)
    try { const [PJ, AR] = await Promise.all([fetch('data3d/mov02_pasajes.json').then(r => r.json()), fetch('data3d/bavaria_arboles.json').then(r => r.json())]);
      const L = PJ.pasajes.map(p => ({ p: p.p.map(q => lw(q[0], q[1])) }));
      const mp = new THREE.Mesh(cinta(L, 9, Yv() + 1.3), mat('pasaje')); mp.renderOrder = 9; mp.frustumCulled = false; G.add(mp); mallas.pasajes = mp;
      // peatones: puntos que recorren los pasajes (ida y vuelta)
      peat.L = L.map(c => { let s = 0; const cum = [0]; for (let i = 1; i < c.p.length; i++) { s += Math.hypot(c.p[i][0] - c.p[i - 1][0], c.p[i][1] - c.p[i - 1][1]); cum.push(s); } return { p: c.p, cum, len: s }; });
      // peatones: personas 3D (cápsula de 1,7 m) que recorren los pasajes de ida y vuelta; cuántas ∝ permeabilidad
      const NMAX = 240, gPer = new THREE.CapsuleGeometry(0.28, 1.15, 3, 8).translate(0, 0.86, 0);
      peat.im = new THREE.InstancedMesh(gPer, new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }), NMAX); peat.im.count = 0; peat.im.frustumCulled = false; peat.im.renderOrder = 10;
      const PAL = ['#f8fafc', '#fbbf24', '#38bdf8', '#f472b6', '#a3e635', '#fb923c'].map(c => new THREE.Color(c)); for (let i = 0; i < NMAX; i++) peat.im.setColorAt(i, PAL[i % PAL.length]);
      peat.NMAX = NMAX; peat.m4 = new THREE.Matrix4(); peat.q = new THREE.Quaternion(); peat.up = new THREE.Vector3(0, 1, 0); peat.one = new THREE.Vector3(1, 1, 1); peat.pos = new THREE.Vector3();
      peat.sem = Array.from({ length: NMAX }, (_, i) => [i % L.length, ((i * 0.6180339) % 1), i % 2 ? 1 : -1, 0.85 + (i * 0.37 % 0.4), ((i * 7) % 5 - 2) * 0.7]); G.add(peat.im);
      // bosque protegido: manto verde translúcido bajo cada copa del bosque (copa + 6 m), una malla instanciada sobre el suelo
      const B = AR.arboles.filter(t => t[4] === 1), gc = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
      const mb = new THREE.InstancedMesh(gc, new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.2, depthWrite: false, depthTest: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), B.length);
      { const m4 = new THREE.Matrix4(); B.forEach((t, i) => { const w = lw(t[0], t[1]), r = t[3] + 6; m4.makeScale(r, 1, r).setPosition(w[0], Yv() + 0.5, w[1]); mb.setMatrixAt(i, m4); }); mb.instanceMatrix.needsUpdate = true; }
      mb.renderOrder = 2; mb.frustumCulled = false; G.add(mb); mallas.bosque = mb;
    } catch (e) { console.warn('mov02 pasajes/bosque:', e); }
    RELOJ.alDibujar(cuadro);
  }
  const COLS = [[0.0, '#22c55e'], [0.7, '#22c55e'], [0.85, '#eab308'], [1.0, '#f97316'], [1.2, '#ef4444']].map(([x, c]) => [x, new THREE.Color(c)]);
  const colorSat = (x, out) => { if (x >= COLS[COLS.length - 1][0]) return out.copy(COLS[COLS.length - 1][1]); for (let i = 1; i < COLS.length; i++) if (x < COLS[i][0]) return out.copy(COLS[i - 1][1]).lerp(COLS[i][1], (x - COLS[i - 1][0]) / (COLS[i][0] - COLS[i - 1][0])); return out; };
  const colorDb = (db, out) => out.set(db > 75 ? '#ef4444' : db > 65 ? '#f97316' : db >= 50 ? '#eab308' : '#22c55e');
  let tPrev = 0;
  function cuadro() { if (!G || !G.visible) { if (FILA.VEH) FILA.VEH.grupo.visible = false; if (MOR.MK) MOR.MK.ver(false); return; } const t = (RELOJ.tVis != null ? RELOJ.tVis : performance.now() / 1000); U.uT.value = t % 10000;
    if (FILA.VEH) { const P = FILA.plan; FILA.VEH.grupo.visible = P.length > 0; FILA.VEH.inicio(); FILA.pos.n = 0; const y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.02;
      for (let i = 0; i < P.length; i++) { const q = P[i]; if (FILA.VEH.poner(FILA.objs[i], q[3], q[0], y + (T3.alzaVia ? T3.alzaVia(q[0], q[1]) : 0), q[1], q[2]) === false) continue; FILA.pos.x[FILA.pos.n] = q[0]; FILA.pos.z[FILA.pos.n] = q[1]; FILA.pos.n++; }
      if (MOR.MK) MOR.MK.inicio();
      if (M && M.prop && MOR.R) { bloquearCierre(); MOR.pend = 0; const n = Math.min(30, Math.round(11465 * 0.1 * 0.45 * (M.perm || 0) / 20)), tA = RELOJ.tAnim || performance.now() / 1000;
        /* SOLO DE IDA (2026-11-27: «que se vea que van hacia los mercados»): del barrio al mercado, y vuelve a salir del barrio */
        for (let i = 0, k = P.length; i < n && k < FILA.MAX; i++) { const r = rutaMor(i); if (!r) continue; const s = (((tA * 11 / r.L) + i * 0.137) % 1) * r.L;
          let a = 0, b = r.S.length - 1; while (b - a > 1) { const mm = (a + b) >> 1; if (r.S[mm] < s) a = mm; else b = mm; } const fr = (s - r.S[a]) / Math.max(1e-6, r.S[b] - r.S[a]); let fx = r.P[b][0] - r.P[a][0], fz = r.P[b][1] - r.P[a][1]; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
          const x = r.P[a][0] + (r.P[b][0] - r.P[a][0]) * fr - fz * 1.8, z = r.P[a][1] + (r.P[b][1] - r.P[a][1]) * fr + fx * 1.8, yv = y + (T3.alzaVia ? T3.alzaVia(x, z) : 0);
          if (FILA.VEH.poner(MOR.objs[i], 'carro', x, yv, z, Math.atan2(fx, fz)) === false) continue; if (MOR.MK) MOR.MK.poner(x, yv, z, r, s); FILA.pos.x[k] = x; FILA.pos.z[k] = z; FILA.pos.n++; k++; } FILA.VEH.grupo.visible = true; }
      FILA.VEH.fin(); if (MOR.MK) MOR.MK.fin(); }
    // peatones
    if (peat.im && M && M.prop && peat.L.length) { const n = Math.round(peat.NMAX * (M.perm || 0)); peat.im.count = n; const now = performance.now() / 1000, dt = Math.min(0.1, now - (tPrev || now)); tPrev = now;
      for (let i = 0; i < n; i++) { const s = peat.sem[i], c = peat.L[s[0]]; s[1] += s[2] * s[3] * 1.4 * 4 * dt / c.len; /* 1,4 m/s × 4 (acelerado para que se vea) */ if (s[1] > 1) { s[1] = 1; s[2] = -1; } if (s[1] < 0) { s[1] = 0; s[2] = 1; }
        const d = s[1] * c.len; let k = 1; while (k < c.cum.length - 1 && c.cum[k] < d) k++; const a = c.p[k - 1], b = c.p[k], f = (d - c.cum[k - 1]) / Math.max(1e-6, c.cum[k] - c.cum[k - 1]);
        const dx = (b[0] - a[0]) * s[2], dz = (b[1] - a[1]) * s[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
        peat.pos.set(a[0] + (b[0] - a[0]) * f + nx * s[4], Yv() + 1.3, a[1] + (b[1] - a[1]) * f + nz * s[4]); peat.q.setFromAxisAngle(peat.up, Math.atan2(dx, dz));
        peat.m4.compose(peat.pos, peat.q, peat.one); peat.im.setMatrixAt(i, peat.m4); }
      peat.im.instanceMatrix.needsUpdate = true; } }

  function aplicar() { const m = M; if (!G || !m) return; G.visible = true;
    planFila(m);
    { const M2 = []; const cv = m.vias[m.via]; if (tramos[m.via] && cv && m.c > 0.02) { const L = tramos[m.via], q = L[L.length >> 1].p; M2.push({ t: cv.n + ' cerrada', s: Math.round(m.c * 100) + ' % de cierre', x: q[q.length >> 1][0], z: q[q.length >> 1][1] }); }
      for (const k of ART) { const v = m.vias[k], p = puntoFila[k]; if (v && p && k !== m.via) M2.push({ t: 'Fila en ' + v.n, s: Math.round(v.x * 100) + ' % de su capacidad', x: p[0], z: p[1] }); }
      if (tramos[m.via] && cv && m.c > 0.02) { const L2 = tramos[m.via], q2 = L2[0].p, q3 = L2[L2.length - 1].p; M2.push({ t: 'Obra del cierre', s: m.prop ? 'los desvíos fluyen mejor' : 'barreras y conos', x: q2[0][0], z: q2[0][1], d: 180 }, { t: 'Otro frente del cierre', s: 'desvío de los carros', x: q3[0][0], z: q3[0][1], d: 180 }); }
      BARRIOS.forEach((b, i) => M2.push({ t: 'Calles de ' + N_BARRIO[i], s: m.prop ? 'menos carros de paso: se compra en el barrio' : 'el desvío entra al barrio', x: b[0], z: b[1], d: 200 }));
      if (m.prop) M2.push({ t: 'Pasajes de Bavaria', s: 'peatones cruzando el predio', x: 3977.7, z: 219.3, d: 320 }); window.KEN_MOM = M2; }
    for (const k of ART) { const v = m.vias[k]; pintarRot(k, v && k !== m.via && tramos[k] ? `${v.n.toUpperCase()} · ${Math.round(v.x * 100)} %` : '', v ? v.x : 0); if (ROT[k] && v && k !== m.via) { const p = puntoFila[k]; if (p) ROT[k].sp.position.set(p[0], ROT[k].sp.position.y, p[1]); } }
    { const CH = crearChips({ T3, RELOJ }), cc = (q) => q >= 1 ? '#ff8a80' : q >= 0.85 ? '#ffd27a' : '#9be8b0', L = [];
      for (const k of ART) { const v = m.vias[k], R = ROT[k]; if (!v || !R || !tramos[k]) continue; const p = R.sp.position; if (k === m.via && m.c > 0.02) L.push({ x: p.x, z: p.z, ico: 'cierre', txt: 'Cerrada ' + Math.round(m.c * 100) + ' %', col: '#ff8a80', title: v.n }); else L.push({ x: p.x, z: p.z, ico: 'via', txt: Math.round(v.x * 100) + ' %', q: (v.x - 0.7) / 0.5, title: v.n + ' · flujo ÷ capacidad' }); }
      const vl = m.vias.locales; if (vl) BARRIOS.forEach((b, i) => L.push({ x: b[0], z: b[1], ico: 'barrio', txt: Math.round(vl.x * 100) + ' %', q: (vl.x - 0.5) / 0.7, title: N_BARRIO[i] + ' · calles locales' }));
      if (m.prop) L.push({ x: 3977.7, z: 219.3, ico: 'pasaje', txt: Math.round((m.perm || 0) * 100) + ' %', col: '#86efac', title: 'Pasajes de Bavaria · permeabilidad' });
      CH.poner('mov02', L); window.KEN_ESCENA = { escena: 'fila', prop: !!m.prop }; }
    BARRIOS.forEach((b, i) => { const v = m.vias.locales; pintarRot('b' + i, v && m.via ? `${N_BARRIO[i].toUpperCase()} · ${Math.round(v.x * 100)} %` : '', v ? v.x : 0); });
    for (const k of [...ART, 'locales']) { const ms = mallas[k], v = m.vias[k]; if (!ms || !v) continue; const ur = ms.r.material.uniforms;
      colorDb(v.db, ur.uC.value); ur.uA.value = Math.max(0.15, Math.min(1, (v.db - 45) / 35)); ms.r.visible = ruidoOn; }
    const prop = !!m.prop, pm = (m.perm || 0) * Math.min(1, Math.max(0.08, (RELOJ.sem || 1) / 156)); /* 2026-11-27: los pasajes se construyen en 3 años (cambia con el tiempo) */
    if (mallas.pasajes) { mallas.pasajes.visible = prop && pm > 0.001; mallas.pasajes.material.uniforms.uA.value = 0.15 + 0.85 * pm; }
    if (peat.im) peat.im.visible = prop && pm > 0.001;
    if (mallas.bosque) { mallas.bosque.visible = prop; mallas.bosque.material.opacity = 0.14 + 0.14 * pm + (ruidoOn ? 0.08 : 0); }
  }
  const puntoFila = {}; /* donde arranca la fila de cada vía (el rótulo va ahí) */
  function planFila(m) {
    const clave = m.via + '|' + Object.keys(m.vias).map(k => Math.round((m.vias[k].cola || 0) * 2)).join(','); if (clave === FILA.clave) return; FILA.clave = clave;
    const P = []; const Lc = tramos[m.via] || []; let cx = 0, cz = 0, nc = 0; for (const c of Lc) for (const q of c.p) { cx += q[0]; cz += q[1]; nc++; } cx /= nc || 1; cz /= nc || 1;
    for (const k of [...ART, 'locales']) { const v = m.vias[k], L = tramos[k]; if (!v || !L || k === m.via || !(v.cola >= 3)) continue;
      let km = 0; for (const c of L) for (let i = 1; i < c.p.length; i++) km += Math.hypot(c.p[i][0] - c.p[i - 1][0], c.p[i][1] - c.p[i - 1][1]); km /= 2000; /* dos calzadas */
      let n = Math.min(140, Math.round(v.cola * km / 4)); if (n < 1) continue;
      const orden = L.map(c => ({ c, d: Math.min(...c.p.map(q => Math.hypot(q[0] - cx, q[1] - cz))) })).sort((a, b) => a.d - b.d); puntoFila[k] = orden[0].c.p[orden[0].c.p.length >> 1];
      for (const { c } of orden) { if (n <= 0 || P.length >= FILA.MAX) break; const p = c.p;
        for (let i = 1; i < p.length && n > 0; i++) { const a = p[i - 1], b = p[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 1) continue; const ux = dx / l, uz = dz / l;
          for (let s = 3.5; s < l && n > 0 && P.length < FILA.MAX; s += 7) for (const lado of [1.8, 5.2]) { if (n <= 0) break; P.push([a[0] + ux * s - uz * lado, a[1] + uz * s + ux * lado, Math.atan2(ux, uz), P.length % 5 === 4 ? 'camion' : 'carro']); n--; } } } }
    FILA.plan = P; }
  const api = {
    async poner(m) { M = m || null; if (!M) { if (G) G.visible = false; return; } if (!armado) armado = armar(); await armado; aplicar(); },
    ruido(on) { ruidoOn = !!on; aplicar(); return ruidoOn; },
    get ruidoOn() { return ruidoOn; },
    quitar() { M = null; if (G) G.visible = false; window.KEN_MOM = null; if (window.KEN_CHIPS) window.KEN_CHIPS.quitar('mov02'); window.KEN_ESCENA = null; }
  };
  window.KEN_MOV02 = api; return api;
}
