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
     permeabilidad, peatones que los cruzan (cuántos ∝ permeabilidad) y el halo verde del bosque (árboles con marca 1 de bavaria_arboles.json). */
import { VIAS } from './cierre_gradual.js?v=8';
const ART = ['americas', 'boyaca', 'mayo', 'calle38'];
const BARRIOS = [[3063.8, 275.2], [4620.7, 742.9], [2936.6, 1098.1], [1148.3, 266]]; // Castilla, Marsella, Mandalay, María Paz (mundo; asambleas.json)
const R_BARRIO = 450, WMAX = 26, WRUIDO = 320;

export function crearMov02({ T3, RELOJ }) {
  if (window.KEN_MOV02) return window.KEN_MOV02;
  const THREE = T3.THREE; let G = null, armado = null, M = null, ruidoOn = false, ult = null;
  const U = { uT: { value: 0 } }, mallas = {}, peat = { pts: null, P: null, n: 0, L: [] };
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
    vertexShader: VS, fragmentShader: FS[fs], transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });

  async function armar() {
    G = new THREE.Group(); G.name = 'cierre-mov02'; T3.scene.add(G);
    const E = T3.net.edges, lw = T3.lw, poli = (e) => E[e][1].map(q => lw(q[0], q[1]));
    // arterias
    for (const k of ART) { const L = (VIAS[k] ? VIAS[k].e : []).filter(e => E[e]).map(e => ({ p: poli(e) })); if (!L.length) continue;
      const mv = new THREE.Mesh(cinta(L, WMAX, Yv() + 1.1), mat('via')); mv.renderOrder = 8; mv.frustumCulled = false; G.add(mv);
      const mr = new THREE.Mesh(cinta(L, WRUIDO, Yv() + 0.9), mat('ruido')); mr.renderOrder = 4; mr.visible = false; mr.frustumCulled = false; G.add(mr);
      mallas[k] = { v: mv, r: mr }; }
    // calles locales de Castilla, Marsella, Mandalay y María Paz
    const loc = []; for (let e = 0; e < E.length; e++) { if (E[e][0] !== 'local') continue; const P = poli(e), m = P[P.length >> 1]; if (BARRIOS.some(b => Math.hypot(m[0] - b[0], m[1] - b[1]) < R_BARRIO)) loc.push({ p: P }); }
    if (loc.length) { const mv = new THREE.Mesh(cinta(loc, 12, Yv() + 1.05), mat('via')); mv.renderOrder = 7; mv.frustumCulled = false; G.add(mv);
      const mr = new THREE.Mesh(cinta(loc, 90, Yv() + 0.85), mat('ruido')); mr.renderOrder = 3; mr.visible = false; mr.frustumCulled = false; G.add(mr); mallas.locales = { v: mv, r: mr, n: loc.length }; }
    // pasajes y bosque (con propuesta)
    try { const [PJ, AR] = await Promise.all([fetch('data3d/mov02_pasajes.json').then(r => r.json()), fetch('data3d/bavaria_arboles.json').then(r => r.json())]);
      const L = PJ.pasajes.map(p => ({ p: p.p.map(q => lw(q[0], q[1])) }));
      const mp = new THREE.Mesh(cinta(L, 9, Yv() + 1.3), mat('pasaje')); mp.renderOrder = 9; mp.frustumCulled = false; G.add(mp); mallas.pasajes = mp;
      // peatones: puntos que recorren los pasajes (ida y vuelta)
      peat.L = L.map(c => { let s = 0; const cum = [0]; for (let i = 1; i < c.p.length; i++) { s += Math.hypot(c.p[i][0] - c.p[i - 1][0], c.p[i][1] - c.p[i - 1][1]); cum.push(s); } return { p: c.p, cum, len: s }; });
      const NMAX = 240; peat.P = new Float32Array(NMAX * 3); const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.BufferAttribute(peat.P, 3)); gp.setDrawRange(0, 0);
      peat.pts = new THREE.Points(gp, new THREE.PointsMaterial({ color: 0xfef3c7, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
      peat.pts.renderOrder = 10; peat.pts.frustumCulled = false; peat.NMAX = NMAX; peat.sem = Array.from({ length: NMAX }, (_, i) => [i % L.length, ((i * 0.6180339) % 1), i % 2 ? 1 : -1, 0.9 + (i * 0.37 % 0.6)]); G.add(peat.pts);
      // halo del bosque: un disco suave por árbol del bosque (Points con textura radial)
      const B = AR.arboles.filter(t => t[4] === 1), PB = new Float32Array(B.length * 3); B.forEach((t, i) => { const w = lw(t[0], t[1]); PB[i * 3] = w[0]; PB[i * 3 + 1] = Yv() + 0.7; PB[i * 3 + 2] = w[1]; });
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
      const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.BufferAttribute(PB, 3));
      const mb = new THREE.Points(gb, new THREE.PointsMaterial({ color: 0x4ade80, size: 60, sizeAttenuation: true, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      mb.renderOrder = 2; mb.frustumCulled = false; G.add(mb); mallas.bosque = mb;
    } catch (e) { console.warn('mov02 pasajes/bosque:', e); }
    RELOJ.alDibujar(cuadro);
  }
  const COLS = [[0.0, '#22c55e'], [0.7, '#22c55e'], [0.85, '#eab308'], [1.0, '#f97316'], [1.2, '#ef4444']].map(([x, c]) => [x, new THREE.Color(c)]);
  const colorSat = (x, out) => { if (x >= COLS[COLS.length - 1][0]) return out.copy(COLS[COLS.length - 1][1]); for (let i = 1; i < COLS.length; i++) if (x < COLS[i][0]) return out.copy(COLS[i - 1][1]).lerp(COLS[i][1], (x - COLS[i - 1][0]) / (COLS[i][0] - COLS[i - 1][0])); return out; };
  const colorDb = (db, out) => out.set(db > 75 ? '#ef4444' : db > 65 ? '#f97316' : db >= 50 ? '#eab308' : '#22c55e');
  let tPrev = 0;
  function cuadro() { if (!G || !G.visible) return; const t = (RELOJ.tVis != null ? RELOJ.tVis : performance.now() / 1000); U.uT.value = t % 10000;
    // peatones
    if (peat.pts && M && M.prop && peat.L.length) { const n = Math.round(peat.NMAX * (M.perm || 0)); peat.pts.geometry.setDrawRange(0, n); const now = performance.now() / 1000, dt = Math.min(0.1, now - (tPrev || now)); tPrev = now;
      for (let i = 0; i < n; i++) { const s = peat.sem[i], c = peat.L[s[0]]; s[1] += s[2] * s[3] * 1.4 * dt * 30 / c.len; if (s[1] > 1) { s[1] = 1; s[2] = -1; } if (s[1] < 0) { s[1] = 0; s[2] = 1; }
        const d = s[1] * c.len; let k = 1; while (k < c.cum.length - 1 && c.cum[k] < d) k++; const a = c.p[k - 1], b = c.p[k], f = (d - c.cum[k - 1]) / Math.max(1e-6, c.cum[k] - c.cum[k - 1]);
        peat.P[i * 3] = a[0] + (b[0] - a[0]) * f + ((i % 3) - 1) * 1.6; peat.P[i * 3 + 1] = Yv() + 2.2; peat.P[i * 3 + 2] = a[1] + (b[1] - a[1]) * f + (((i >> 2) % 3) - 1) * 1.6; }
      peat.pts.geometry.attributes.position.needsUpdate = true; } }

  function aplicar() { const m = M; if (!G || !m) return; G.visible = true;
    for (const k of [...ART, 'locales']) { const ms = mallas[k], v = m.vias[k]; if (!ms || !v) continue; const u = ms.v.material.uniforms, ur = ms.r.material.uniforms;
      const cerrada = k === m.via && m.c > 0.02;
      if (cerrada) { u.uC.value.set('#7f1d1d'); u.uW.value = 0.35; u.uA.value = 0.75; u.uVel.value = 0; }
      else { colorSat(v.x, u.uC.value); u.uW.value = Math.max(0.18, Math.min(1, v.V / (k === 'locales' ? 4400 : 6500))); u.uA.value = 0.92; u.uVel.value = Math.max(0.6, v.v * 0.6); /* km/h → m/s de dibujo (× 0,6) */ }
      colorDb(v.db, ur.uC.value); ur.uA.value = Math.max(0.15, Math.min(1, (v.db - 45) / 35)); ms.r.visible = ruidoOn; }
    const prop = !!m.prop, pm = m.perm || 0;
    if (mallas.pasajes) { mallas.pasajes.visible = prop && pm > 0.001; mallas.pasajes.material.uniforms.uA.value = 0.15 + 0.85 * pm; }
    if (peat.pts) peat.pts.visible = prop && pm > 0.001;
    if (mallas.bosque) { mallas.bosque.visible = prop; mallas.bosque.material.opacity = 0.1 + 0.12 * pm + (ruidoOn ? 0.08 : 0); }
  }
  const api = {
    async poner(m) { M = m || null; if (!M) { if (G) G.visible = false; return; } if (!armado) armado = armar(); await armado; aplicar(); },
    ruido(on) { ruidoOn = !!on; aplicar(); return ruidoOn; },
    get ruidoOn() { return ruidoOn; },
    quitar() { M = null; if (G) G.visible = false; }
  };
  window.KEN_MOV02 = api; return api;
}
