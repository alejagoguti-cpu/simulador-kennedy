/* ============ CAMINOS DEL INSTITUTO · Bavaria Común abre el predio al barrio ============
   window.KEN_CAMINOS = { poner({ fase }), ver(on) }      (crearCaminos({ T3, RELOJ }) lo arma; todo bajo el grupo 'caminos')
   · fase 0…1 = cuánto del instituto está abierto (la interfaz la sube en los primeros años de las simulaciones con el instituto).
   · DATOS (nada inventado):
       1. Los 20 PASAJES NUEVOS de Bavaria Común: data3d/sintaxis_proyecto.json → nuevos (marco del giro: + OX, OZ = mundo), los mismos
          20 segmentos del análisis angular antes/después (tools/sintaxis_proyecto_build.js, bavaria_distrito_sx.json).
       2. Las VÍAS INTERNAS de la fábrica que se abren al público: los tramos de la red de vías (T3.net, OpenStreetMap) que caen dentro del
          predio (polígono SITIO = bavaria_pres.json → sitio, marco del modelo).
       3. Las CONEXIONES con el barrio: cada punta suelta de esa red se une a la vía interna más cercana (≤ 35 m) o a la calle del barrio
          más cercana (≤ 80 m); donde toca la calle queda una ENTRADA nueva (anillo, haz de luz y cebra en la calle).
   · Los caminos CRECEN con la fase desde las entradas hacia adentro (distancia por la red desde la entrada más cercana): el predio se
     abre desde el barrio. Las calles del barrio que ganan conexión (a ≤ 300 m por la red de una entrada) se encienden suave.
   · Gente (puntos: peatones blanco cálido, bicis verde claro) que cruza el instituto de entrada a entrada y sigue un tramo por las
     calles del barrio; se mueve con el tiempo SIMULADO del reloj (RELOJ.tVis; tope ×9 por cuadro para que no parpadee a 3600×).
   · Costo: 9 llamadas de dibujo; por cuadro solo se mueven los puntos (arreglos tipados, sin asignar memoria). Se arma en el primer poner. */

const OX = 2095.67, OZ = -109.06; // marco del giro (sintaxis_proyecto.json) -> mundo (el mismo de data3d/giro_sim.js)
// predio de Bavaria (marco del modelo; bavaria_pres.json → sitio)
const SITIO = [[8831.5,2424.4],[8848.3,2541.7],[8862.6,2635.3],[8872.1,2703.4],[8883.6,2746.9],[8889.3,2769.9],[8907.4,2842.4],[8917.6,2867.9],[8934.0,2908.6],[8963.6,2987.1],[9006.6,3076.6],[9059.3,3176.5],[9066.9,3192.9],[9076.4,3207.3],[9144.4,3310.9],[9188.3,3377.7],[9287.4,3494.0],[9337.1,3549.0],[9343.4,3552.0],[9350.8,3553.4],[9359.2,3552.8],[9367.9,3550.6],[9478.1,3523.1],[9487.1,3521.5],[9495.2,3521.2],[9501.7,3522.3],[9510.2,3525.0],[9522.8,3526.1],[9534.8,3522.6],[9545.8,3516.1],[9552.6,3504.9],[9588.9,3446.1],[9621.9,3384.4],[9667.7,3303.8],[9674.8,3286.9],[9680.1,3271.0],[9691.2,3252.4],[9704.9,3235.7],[9717.8,3221.8],[9731.9,3200.4],[9785.1,3106.0],[9866.3,2972.1],[9615.0,2725.2],[9220.6,2406.4],[9205.6,2396.0],[9193.9,2391.8],[9181.7,2389.5],[8942.4,2413.0],[8831.5,2424.4]];
const R_GLOW = 300, TAIL = 170, PASO = 4; // radio de las calles que ganan conexión, tramo de calle que sigue la gente, subdivisión [m]
const COLSP = '\n#include <colorspace_fragment>\n';

export function crearCaminos({ T3, RELOJ }) {
  const THREE = T3.THREE, MOV = innerWidth < 760;
  const G = new THREE.Group(); G.name = 'caminos'; G.visible = false; T3.scene.add(G);
  const U = { uFase: { value: 0 }, uT: { value: 0 } };
  let armado = null, listo = false, fase = 0, verOn = true, tPrev = null, reloj = 0;
  let PTS = null, AG = null, RT = [], NAG = 0;

  /* ---------- utilidades de geometría (solo al armar) ---------- */
  const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const largo = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
  // punto más cercano de una polilínea: { d, k (segmento), f, x, z, s (distancia a lo largo) }
  const cercano = (P, x, z) => { let m = { d: 1e9 }, acc = 0;
    for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, l = Math.sqrt(l2), f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), px = a[0] + dx * f, pz = a[1] + dz * f, d = Math.hypot(x - px, z - pz);
      if (d < m.d) m = { d, k, f, x: px, z: pz, s: acc + l * f }; acc += l; } return m; };
  const subdividir = (P) => { const Q = [P[0]]; for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PASO)); for (let j = 1; j <= n; j++) Q.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return Q; };
  const yVia = () => (T3.viaY != null ? T3.viaY : 0.62), alza = (x, z) => (T3.alzaVia ? T3.alzaVia(x, z) || 0 : 0);

  /* ---------- cintas (franjas planas con ancho real) ---------- */
  // L: [{ P: [[x,z]...], r: [..] reveal por vértice, i: [..] intensidad por vértice (opcional), w, y }]
  function cintas(L, conS) {
    const P = [], R = [], S = [], V = [], I = [], X = [];
    for (const c of L) { const n = c.P.length; if (n < 2) continue; const b = P.length / 3; let s = 0;
      for (let k = 0; k < n; k++) { const a = c.P[Math.max(0, k - 1)], q = c.P[Math.min(n - 1, k + 1)]; let dx = q[0] - a[0], dz = q[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        if (k) s += Math.hypot(c.P[k][0] - c.P[k - 1][0], c.P[k][1] - c.P[k - 1][1]);
        const x = c.P[k][0], z = c.P[k][1], y = c.y + (c.alza ? alza(x, z) : 0), h = c.w / 2;
        P.push(x - dz * h, y, z + dx * h, x + dz * h, y, z - dx * h); R.push(c.r[k], c.r[k]); S.push(s, s); V.push(-1, 1); I.push(c.i ? c.i[k] : 1, c.i ? c.i[k] : 1);
        if (k < n - 1) { const v = b + k * 2; X.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aR', new THREE.Float32BufferAttribute(R, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('aV', new THREE.Float32BufferAttribute(V, 1)); g.setAttribute('aI', new THREE.Float32BufferAttribute(I, 1)); g.setIndex(X); return g;
  }
  // material de camino: crece con uFase (descarta aR > fase), borde suave, frente de avance más claro y un pulso lento a lo largo
  const matCamino = (col, op, fantasma, pulso) => new THREE.ShaderMaterial({ uniforms: { ...U, uC: { value: new THREE.Color(col) }, uO: { value: op } },
    vertexShader: 'attribute float aR,aS,aV,aI; varying float vR,vS,vV,vI; void main(){ vR=aR; vS=aS; vV=aV; vI=aI; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uC; uniform float uFase,uT,uO; varying float vR,vS,vV,vI;\nvoid main(){ float f=uFase*1.02; if(vR>f) discard; float borde=1.-smoothstep(.55,1.,abs(vV)); float frente=smoothstep(.06,0.,f-vR)*step(uFase,.995);' +
      (pulso ? ' float p=pow(fract(vS/46.-uT*.035),14.)*.5;' : ' float p=0.;') + ' vec3 c=mix(uC,vec3(1.),frente*.6+p); gl_FragColor=vec4(c,(.55+.45*borde)*uO*vI*(1.+frente*.8));' + COLSP + '}',
    transparent: true, depthWrite: false, depthTest: !fantasma, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 });

  /* ---------- armar (primer poner) ---------- */
  async function armar() {
    const cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
    const SP = await cargar('data3d/sintaxis_proyecto.json?v=2');
    const lw = T3.lw, SW = SITIO.map(q => lw(q[0], q[1]));
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of SW) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
    const M = R_GLOW + TAIL + 60, enCaja = (q) => q[0] > x0 - M && q[0] < x1 + M && q[1] > z0 - M && q[1] < z1 + M;

    /* red interna: pasajes nuevos + vías internas de la fábrica */
    const ED = []; // { P, t: 'p' pasaje | 'i' interna | 'c' conector }
    for (const s of SP.nuevos) ED.push({ P: s.p.map(q => [q[0] + OX, q[1] + OZ]), t: 'p' });
    const CALLES = [], visto = new Set();
    for (const e of (T3.net && T3.net.edges) || []) { const Pm = e[1]; if (!Pm || Pm.length < 2) continue; const P = Pm.map(q => lw(q[0], q[1])); if (!enCaja(P[0]) && !enCaja(P[P.length - 1])) continue;
      const a = P[0], b = P[P.length - 1], key = [a, b].map(q => Math.round(q[0]) + ',' + Math.round(q[1])).sort().join('|') + '|' + Math.round(largo(P)); if (visto.has(key)) continue; visto.add(key);
      const m = P[P.length >> 1], mm = P.length === 2 ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : m;
      if (dentro(SW, mm[0], mm[1])) ED.push({ P, t: 'i' }); else CALLES.push({ P, c: e[0] }); }

    /* nodos (fusión a 8 m) y puntas sueltas */
    const ND = []; const nodo = (q, tol = 8) => { for (let i = 0; i < ND.length; i++) if (Math.hypot(ND[i][0] - q[0], ND[i][1] - q[1]) < tol) return i; ND.push([q[0], q[1]]); return ND.length - 1; };
    const indexar = () => { for (const e of ED) { e.a = nodo(e.P[0]); e.b = nodo(e.P[e.P.length - 1]); } };
    indexar();
    const grado = () => { const g = new Int32Array(ND.length); for (const e of ED) { g[e.a]++; g[e.b]++; } return g; };
    const partir = (e, c) => { // corta la arista e en el punto c (de cercano) y devuelve el nodo nuevo
      const A = e.P.slice(0, c.k).concat([[c.x, c.z]]), B = [[c.x, c.z]].concat(e.P.slice(c.k)); const n = nodo([c.x, c.z], 0.5);
      e.P = A; e.b = n; const e2 = { P: B, t: e.t, a: n, b: nodo(B[B.length - 1]) }; ED.push(e2); return n; };
    const masCercanaCalle = (q) => { let m = { d: 1e9 }; for (const c of CALLES) { const r = cercano(c.P, q[0], q[1]); if (r.d < m.d) { m = r; m.calle = c; } } return m; };
    const ENT = []; // entradas: { x, z, dx, dz (dirección de la calle), nodo }
    const nuevaEntrada = (m, n) => { const P = m.calle.P, a = P[m.k - 1], b = P[m.k], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      for (const e of ENT) if (Math.hypot(e.x - m.x, e.z - m.z) < 18) return e; const e = { x: m.x, z: m.z, dx: (b[0] - a[0]) / l, dz: (b[1] - a[1]) / l, nodo: n, m }; ENT.push(e); return e; };
    const g0 = grado(), puntas = []; for (let i = 0; i < ND.length; i++) if (g0[i] === 1) puntas.push(i);
    for (const n of puntas) { const q = ND[n];
      const mc = masCercanaCalle(q);
      if (mc.d < 14) { const s = nodo([mc.x, mc.z], 0.5); if (mc.d > 1) ED.push({ P: [q, [mc.x, mc.z]], t: 'c', a: n, b: s }); nuevaEntrada(mc, mc.d > 1 ? s : n); continue; }
      let mi = { d: 1e9 }; for (const e of ED) { if (e.a === n || e.b === n || e.t === 'c') continue; const r = cercano(e.P, q[0], q[1]); if (r.d < mi.d) { mi = r; mi.e = e; } }
      if (mi.d < 35) { const s = (mi.f < 0.02 && mi.k === 1) ? mi.e.a : (mi.f > 0.98 && mi.k === mi.e.P.length - 1) ? mi.e.b : partir(mi.e, mi); if (s !== n) ED.push({ P: [q, ND[s]], t: 'c', a: n, b: s }); continue; }
      if (mc.d < 80) { const s = nodo([mc.x, mc.z], 0.5); ED.push({ P: [q, [mc.x, mc.z]], t: 'c', a: n, b: s }); nuevaEntrada(mc, s); } }
    // vías internas que ya tocan una calle del barrio (no son puntas: siguen afuera)
    for (const e of ED) if (e.t === 'i') for (const n of [e.a, e.b]) { const q = ND[n]; if (dentro(SW, q[0], q[1])) continue; const mc = masCercanaCalle(q); if (mc.d < 6) nuevaEntrada(mc, n); }

    /* distancia por la red desde la entrada más cercana (Dijkstra; pocos cientos de nodos) -> revelado */
    const nN = ND.length, ADJ = Array.from({ length: nN }, () => []);
    ED.forEach((e, i) => { e.L = largo(e.P); ADJ[e.a].push([e.b, e.L, i]); ADJ[e.b].push([e.a, e.L, i]); });
    const dijkstra = (fuentes) => { const d = new Float64Array(nN).fill(Infinity), pv = new Int32Array(nN).fill(-1), pe = new Int32Array(nN).fill(-1), hecho = new Uint8Array(nN);
      for (const f of fuentes) d[f] = 0;
      for (;;) { let u = -1, m = Infinity; for (let i = 0; i < nN; i++) if (!hecho[i] && d[i] < m) { m = d[i]; u = i; } if (u < 0) break; hecho[u] = 1;
        for (const [v, l, ei] of ADJ[u]) if (d[u] + l < d[v]) { d[v] = d[u] + l; pv[v] = u; pe[v] = ei; } } return { d, pv, pe }; };
    const D0 = dijkstra(ENT.map(e => e.nodo)).d; let dMax = 1; for (const v of D0) if (isFinite(v)) dMax = Math.max(dMax, v);
    const rDe = (e, s) => { const da = D0[e.a], db = D0[e.b], v = Math.min(da + s, db + (e.L - s)); return isFinite(v) ? Math.min(1, v / dMax) * 0.97 : 0.98; };

    /* cintas de la red interna */
    const lista = { p: [], i: [], c: [] };
    for (const e of ED) { const Q = subdividir(e.P), r = []; let s = 0; for (let k = 0; k < Q.length; k++) { if (k) s += Math.hypot(Q[k][0] - Q[k - 1][0], Q[k][1] - Q[k - 1][1]); r.push(rDe(e, s * e.L / (largo(Q) || 1))); }
      e.Q = Q; e.r = r; lista[e.t].push({ P: Q, r, w: e.t === 'i' ? 2.4 : 3.4, y: yVia() + (e.t === 'i' ? 0.30 : 0.36) }); }
    const gP = cintas(lista.p.concat(lista.c)), gI = cintas(lista.i);
    const caminos = [[gI, '#bfe8b0', 0.62, false], [gP, '#fff1d6', 0.95, true]];
    for (const [g, c, o, pul] of caminos) { const m = new THREE.Mesh(g, matCamino(c, o, false, pul)); m.renderOrder = 14; m.frustumCulled = false; G.add(m);
      const f = new THREE.Mesh(g, matCamino(c, o * 0.2, true, false)); f.renderOrder = 13; f.frustumCulled = false; G.add(f); } // «fantasma» tenue: se lee bajo los árboles y techos de la malla

    /* calles del barrio: red, distancia desde las entradas (multifuente con el punto de la entrada dentro de su calle) */
    const NC = []; const nodoC = (q) => { const k = Math.round(q[0] * 2) + ',' + Math.round(q[1] * 2); let i = NC.idx.get(k); if (i === undefined) { i = NC.length; NC.push(q); NC.idx.set(k, i); } return i; }; NC.idx = new Map();
    for (const c of CALLES) { c.a = nodoC(c.P[0]); c.b = nodoC(c.P[c.P.length - 1]); c.L = largo(c.P); }
    const AC = Array.from({ length: NC.length }, () => []); CALLES.forEach((c, i) => { AC[c.a].push([c.b, c.L, i]); AC[c.b].push([c.a, c.L, i]); });
    const dC = new Float64Array(NC.length).fill(Infinity);
    for (const e of ENT) { const c = e.m.calle; dC[c.a] = Math.min(dC[c.a], e.m.s); dC[c.b] = Math.min(dC[c.b], c.L - e.m.s); }
    { const hecho = new Uint8Array(NC.length), cola = []; for (let i = 0; i < NC.length; i++) if (isFinite(dC[i])) cola.push(i);
      while (cola.length) { let bi = 0; for (let j = 1; j < cola.length; j++) if (dC[cola[j]] < dC[cola[bi]]) bi = j; const u = cola[bi]; cola[bi] = cola[cola.length - 1]; cola.pop(); if (hecho[u]) continue; hecho[u] = 1; if (dC[u] > R_GLOW) continue;
        for (const [v, l] of AC[u]) if (dC[u] + l < dC[v]) { dC[v] = dC[u] + l; cola.push(v); } } }
    const glow = [];
    for (const c of CALLES) { const Q = subdividir(c.P), Lq = largo(Q); let s = 0, alguno = false; const I = [], r = [];
      const propias = ENT.filter(e => e.m.calle === c);
      for (let k = 0; k < Q.length; k++) { if (k) s += Math.hypot(Q[k][0] - Q[k - 1][0], Q[k][1] - Q[k - 1][1]); const sl = s * c.L / (Lq || 1); let d = Math.min(dC[c.a] + sl, dC[c.b] + c.L - sl); for (const e of propias) d = Math.min(d, Math.abs(sl - e.m.s));
        const v = Math.max(0, 1 - d / R_GLOW); I.push(v * v * (3 - 2 * v)); r.push(0); if (v > 0) alguno = true; }
      if (alguno) glow.push({ P: Q, r, w: c.c === 'major' ? 12 : c.c === 'mid' ? 11 : 9, i: c.c === 'major' ? I.map(v => v * 0.55) : I, y: yVia() + 0.1, alza: true }); }
    const mG = new THREE.Mesh(cintas(glow), new THREE.ShaderMaterial({ uniforms: { ...U, uC: { value: new THREE.Color('#b9f5c8') } },
      vertexShader: 'attribute float aI,aV,aS; varying float vI,vV,vS; void main(){ vI=aI; vV=aV; vS=aS; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 uC; uniform float uFase,uT; varying float vI,vV,vS;\nvoid main(){ float b=1.-smoothstep(.15,1.,abs(vV)); float a=vI*b*.4*smoothstep(0.,.6,uFase); if(a<.004) discard; gl_FragColor=vec4(uC,a);' + COLSP + '}',
      transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -20 }));
    mG.renderOrder = 12; mG.frustumCulled = false; G.add(mG);

    /* entradas: anillo en el suelo, haz de luz y cebra sobre la calle */
    const nE = ENT.length, o = new THREE.Object3D();
    const anillo = new THREE.InstancedMesh(new THREE.RingGeometry(5.6, 6.6, 56).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uFase,uT; void main(){ float a=smoothstep(0.,.08,uFase)*(.7+.3*sin(uT*.9)); gl_FragColor=vec4(vec3(1.,.9,.68),a);' + COLSP + '}',
      transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide }), Math.max(1, nE));
    const haz = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.35, 24, 8, 1, true).translate(0, 12, 0), new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: 'varying float vY; void main(){ vY=position.y/24.; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uFase; varying float vY; void main(){ float a=(1.-vY)*(1.-vY)*.75*smoothstep(0.,.08,uFase); gl_FragColor=vec4(vec3(1.,.93,.78),a);' + COLSP + '}',
      transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }), Math.max(1, nE));
    const NB = 7, cebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.55, 3.2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: U,
      vertexShader: 'void main(){ gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uFase; void main(){ gl_FragColor=vec4(vec3(.96,.95,.9),.85*smoothstep(0.,.08,uFase));' + COLSP + '}',
      transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 }), Math.max(1, nE * NB));
    ENT.forEach((e, i) => { const y = yVia() + 0.14 + alza(e.x, e.z);
      o.position.set(e.x, y + 0.3, e.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); anillo.setMatrixAt(i, o.matrix);
      o.position.set(e.x, y, e.z); o.updateMatrix(); haz.setMatrixAt(i, o.matrix);
      const ang = Math.atan2(-e.dz, e.dx) + Math.PI / 2; // franjas paralelas a la calle, repartidas a lo ancho
      for (let b = 0; b < NB; b++) { const u = (b - (NB - 1) / 2) * 1.15; o.position.set(e.x - e.dz * u, y + 0.05, e.z + e.dx * u); o.rotation.set(0, ang, 0); o.updateMatrix(); cebra.setMatrixAt(i * NB + b, o.matrix); } });
    for (const im of [anillo, haz, cebra]) { im.count = im === cebra ? nE * NB : nE; im.frustumCulled = false; im.instanceMatrix.needsUpdate = true; G.add(im); }
    anillo.renderOrder = 16; haz.renderOrder = 15; cebra.renderOrder = 13;

    /* recorridos de la gente: de entrada a entrada por la red interna, con un tramo de calle a cada lado */
    const cola = (e, lado) => { // sigue la calle desde la entrada «derecho» (menor giro) hasta TAIL m
      let c = e.m.calle, P = c.P, Q = [[e.m.x, e.m.z]], hacia = lado > 0 ? c.b : c.a; let s = 0;
      const pts = lado > 0 ? P.slice(e.m.k) : P.slice(0, e.m.k).reverse();
      for (const q of pts) { const u = Q[Q.length - 1]; s += Math.hypot(q[0] - u[0], q[1] - u[1]); Q.push(q); if (s > TAIL) return Q; }
      let prev = c; for (let paso = 0; paso < 8 && s < TAIL; paso++) { const u = Q[Q.length - 1], w = Q[Q.length - 2] || u, dx0 = u[0] - w[0], dz0 = u[1] - w[1], l0 = Math.hypot(dx0, dz0) || 1;
        let mejor = null, mc = -2; for (const [, , ci] of AC[hacia]) { const c2 = CALLES[ci]; if (c2 === prev) continue; const ida = c2.a === hacia, R = ida ? c2.P : c2.P.slice().reverse(), q = R[Math.min(1, R.length - 1)], dx = q[0] - u[0], dz = q[1] - u[1], l = Math.hypot(dx, dz) || 1, cs = (dx * dx0 + dz * dz0) / (l * l0); if (cs > mc) { mc = cs; mejor = [c2, R, ida]; } }
        if (!mejor || mc < 0.2) break; const [c2, R, ida] = mejor; for (let k = 1; k < R.length; k++) { const v = Q[Q.length - 1]; s += Math.hypot(R[k][0] - v[0], R[k][1] - v[1]); Q.push(R[k]); if (s > TAIL) break; } prev = c2; hacia = ida ? c2.b : c2.a; }
      return Q; };
    const rutas = [];
    for (let i = 0; i < ENT.length; i++) { const { d, pv, pe } = dijkstra([ENT[i].nodo]);
      for (let j = 0; j < ENT.length; j++) { if (j === i || !isFinite(d[ENT[j].nodo]) || d[ENT[j].nodo] < 120) continue;
        const camino = [], rc = []; let v = ENT[j].nodo; // de j hacia i (e.Q ya viene subdividido, con su revelado e.r)
        while (v !== ENT[i].nodo) { const e = ED[pe[v]], u = pv[v], ida = e.a === v, Q = ida ? e.Q : e.Q.slice().reverse(), rr = ida ? e.r : e.r.slice().reverse();
          for (let k = camino.length ? 1 : 0; k < Q.length; k++) { camino.push(Q[k]); rc.push(rr[k]); } v = u; }
        camino.reverse(); rc.reverse(); // de i a j
        const ci = subdividir(cola(ENT[i], (i + j) % 2 ? 1 : -1)).reverse(), cj = subdividir(cola(ENT[j], (i * 3 + j) % 2 ? 1 : -1));
        rutas.push({ P: ci.concat(camino.slice(1), cj.slice(1)), R: ci.map(() => 0).concat(rc.slice(1), cj.slice(1).map(() => 0)), h: ((i * 7919 + j * 104729) % 1000) / 1000 }); } }
    rutas.sort((a, b) => a.h - b.h); RT = rutas.slice(0, MOV ? 40 : 90);
    // recorridos a arreglos tipados: x, y, z, distancia acumulada, normal y revelado por vértice
    for (const r of RT) { const Q = r.P, n = Q.length; r.x = new Float32Array(n); r.y = new Float32Array(n); r.z = new Float32Array(n); r.c = new Float32Array(n); r.nx = new Float32Array(n); r.nz = new Float32Array(n); r.rv = Float32Array.from(r.R); r.sA = 0;
      for (let k = 0; k < n; k++) { r.x[k] = Q[k][0]; r.z[k] = Q[k][1]; r.y[k] = yVia() + 1.1 + (dentro(SW, Q[k][0], Q[k][1]) ? 0 : alza(Q[k][0], Q[k][1])); if (k) r.c[k] = r.c[k - 1] + Math.hypot(Q[k][0] - Q[k - 1][0], Q[k][1] - Q[k - 1][1]);
        const a = Q[Math.max(0, k - 1)], b = Q[Math.min(n - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; r.nx[k] = -(b[1] - a[1]) / l; r.nz[k] = (b[0] - a[0]) / l; }
      r.n = n; r.L = r.c[n - 1]; }

    /* gente: puntos (peatones y bicis), posición en el CPU sobre arreglos fijos */
    NAG = RT.length ? (MOV ? 260 : 620) : 0;
    const pos = new Float32Array(Math.max(1, NAG) * 3), alf = new Float32Array(Math.max(1, NAG)), col = new Float32Array(Math.max(1, NAG) * 3);
    AG = { r: new Int16Array(NAG), s: new Float32Array(NAG), v: new Float32Array(NAG), k: new Int32Array(NAG), lat: new Float32Array(NAG), u: new Float32Array(NAG), pos, alf };
    const az = RELOJ && RELOJ.azar ? RELOJ.azar('caminos_instituto') : Math.random;
    for (let i = 0; i < NAG; i++) { const bici = az() < 0.22, r = Math.floor(az() * RT.length), dir = az() < 0.5 ? -1 : 1;
      AG.r[i] = r; AG.s[i] = az() * RT[r].L; AG.v[i] = dir * (bici ? 3.6 + az() * 1.4 : 1.15 + az() * 0.4); AG.lat[i] = dir * (bici ? 0.5 : 0.7 + az() * 0.6); AG.u[i] = az();
      const c = bici ? [0.74, 0.96, 0.62] : [1, 0.93, 0.8]; col.set(c, i * 3); }
    const gq = new THREE.BufferGeometry(); gq.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); gq.setAttribute('aA', new THREE.BufferAttribute(alf, 1).setUsage(THREE.DynamicDrawUsage)); gq.setAttribute('aC', new THREE.BufferAttribute(col, 3));
    const px = Math.min(2, devicePixelRatio || 1);
    const matP = (fantasma) => new THREE.ShaderMaterial({ uniforms: { uPx: { value: px }, uK: { value: fantasma ? 0.28 : 1 } },
      vertexShader: 'attribute float aA; attribute vec3 aC; uniform float uPx; varying float vA; varying vec3 vC; void main(){ vA=aA; vC=aC; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aA>0.?clamp(3000.*uPx/-mv.z,3.4*uPx,7.*uPx):0.; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform float uK; varying float vA; varying vec3 vC; void main(){ float r=length(gl_PointCoord-.5); if(r>.5) discard; float a=smoothstep(.5,.28,r); gl_FragColor=vec4(mix(vC,vec3(1.),smoothstep(.2,0.,r)*.5),a*vA*uK);' + COLSP + '}',
      transparent: true, depthWrite: false, depthTest: !fantasma, toneMapped: false });
    PTS = new THREE.Points(gq, matP(false)); PTS.frustumCulled = false; PTS.renderOrder = 17; G.add(PTS);
    const ptsF = new THREE.Points(gq, matP(true)); ptsF.frustumCulled = false; ptsF.renderOrder = 16; G.add(ptsF);

    KEN_CAMINOS.datos = { pasajes: SP.nuevos.length, internas: lista.i.length, conectores: lista.c.length, entradas: ENT.length, rutas: RT.length, gente: NAG, callesConGlow: glow.length,
      pasajes_m: Math.round(ED.filter(e => e.t === 'p').reduce((a, e) => a + e.L, 0)), internas_m: Math.round(ED.filter(e => e.t === 'i').reduce((a, e) => a + e.L, 0)), entradasXZ: ENT.map(e => [Math.round(e.x), Math.round(e.z)]) };
    listo = true; aplicar(); mover(0);
  }

  /* ---------- por cuadro: mover la gente (sin asignar memoria) ---------- */
  function mover(dt) {
    if (!AG) return; const { r: R, s: S, v: V, k: K, lat: LA, u: UU, pos, alf } = AG;
    for (let i = 0; i < NAG; i++) { const ru = RT[R[i]];
      if (ru.sA < 20 || UU[i] > 0.3 + 0.7 * fase) { if (alf[i] !== 0) alf[i] = 0; continue; }
      let s = S[i] + V[i] * dt; const L = ru.L;
      if (ru.sA >= L) { if (s > L) s -= L; else if (s < 0) s += L; } // recorrido abierto entero: de entrada a entrada, en bucle
      else { const A = ru.sA; if (s > A) { s = 2 * A - s; V[i] = -V[i]; } if (s < 0) { s = -s; V[i] = -V[i]; } if (s > A) s = A; } // abierto hasta el frente: entra y se devuelve
      S[i] = s;
      let k = K[i]; if (k >= ru.n - 1) k = ru.n - 2; while (k < ru.n - 2 && ru.c[k + 1] < s) k++; while (k > 0 && ru.c[k] > s) k--; K[i] = k;
      const c0 = ru.c[k], f = (s - c0) / ((ru.c[k + 1] - c0) || 1), j = i * 3, la = LA[i];
      pos[j] = ru.x[k] + (ru.x[k + 1] - ru.x[k]) * f + ru.nx[k] * la; pos[j + 1] = ru.y[k] + (ru.y[k + 1] - ru.y[k]) * f; pos[j + 2] = ru.z[k] + (ru.z[k + 1] - ru.z[k]) * f + ru.nz[k] * la;
      const ext = ru.sA >= L ? Math.min(s, L - s) : s; alf[i] = ext < 25 ? ext / 25 : 1; }
    PTS.geometry.attributes.position.needsUpdate = true; PTS.geometry.attributes.aA.needsUpdate = true;
  }
  const quitar = RELOJ.alDibujar(() => {
    if (!listo || !G.visible) { tPrev = null; return; }
    const t0 = performance.now(), tv = RELOJ.tVis != null ? RELOJ.tVis : RELOJ.t; let dt = tPrev == null ? 0 : tv - tPrev; tPrev = tv;
    if (!(dt > 0)) dt = 0; else if (dt > 0.15) dt = 0.15; // tiempo simulado; tope por cuadro (a 60×-3600× no parpadea)
    reloj += dt; U.uT.value = reloj; if (dt > 0) mover(dt);
    KEN_CAMINOS.ms = KEN_CAMINOS.ms * 0.95 + (performance.now() - t0) * 0.05; // costo de CPU por cuadro (promedio móvil)
  });

  function aplicar() { U.uFase.value = fase; G.visible = verOn && fase > 0.001;
    const f = fase * 1.02; for (const r of RT) { let k = 0; while (k < r.n && r.rv[k] <= f) k++; r.sA = k >= r.n ? r.L : k > 0 ? r.c[k - 1] : 0; } } // hasta dónde está abierto cada recorrido
  const KEN_CAMINOS = window.KEN_CAMINOS = {
    poner({ fase: f = 1 } = {}) { fase = Math.max(0, Math.min(1, +f || 0)); if (!armado) armado = armar().catch(e => { console.warn('caminos del instituto:', e); }); if (listo) { aplicar(); mover(0); } return armado; },
    ver(on) { verOn = !!on; if (listo) aplicar(); },
    get fase() { return fase; }, grupo: G, ms: 0,
    quitar() { quitar(); T3.scene.remove(G); }
  };
  return KEN_CAMINOS;
}
