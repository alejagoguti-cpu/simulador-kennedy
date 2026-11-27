/* ============ CIERRE GRADUAL DE UNA VÍA (obra) + DESVÍOS + RUIDO DE LOS DESVÍOS ============
   window.KEN_CIERRE = { poner({ via, fase, ruidoExtraDb, traficoDesvio }), quitar() }
   · via: 'americas' | 'boyaca' | 'cali' | 'agoberto' | 'mayo' (los mismos ids de CIERRES en data3d/sim_red_datos.js y de
     SUP_SIMS.CIERRE_VIA en simulaciones12.js; también acepta el nombre con tildes, «Av. de las Américas», etc.), 'critica1'…'critica6'
     (VIAS_CRITICAS de data3d/ruido_cierre.js), un índice de arista de T3.net o una lista de índices.
   · fase 0 → 1: la obra avanza a lo largo de la vía. 0 → 0,5: aparecen los conos que cierran el primer carril (franja ámbar);
     0,5 → 1: barricadas y cierre total (franja roja). Al pasar 0,5 se llama T3.rc.cerrar(arista) para que los carros grabados (SUMO)
     tomen el desvío (data3d/ruido_cierre.js: Dijkstra por las calles vecinas); al volver por debajo de 0,45 o con quitar(), cerrar(null).
   · traficoDesvio: fracción del tránsito de la vía que se va por los desvíos (0…1, se admite hasta 1,5): intensidad de las cintas
     naranja/rojas de los desvíos = fase × traficoDesvio (con un flujo animado que corre por la cinta).
   · ruidoExtraDb: dB(A) de más en las calles del desvío: halo rojo suave alrededor de ellas, intensidad = fase × ruidoExtraDb / 8.
   CORRESPONDENCIA vía → aristas de T3.net (data3d/net.json, sin nombres): calculada con tools/cache/kennedy_osm.json (nombre OSM
   name/alt_name, la misma regla de tools/sim_red_datos_build.mjs): aristas 'major'/'mid' con más del 60 % de su largo a menos de 18 m
   de una vía OSM con ese nombre y con dirección a menos de 30° de ella. Américas: 130 aristas (~10,5 km de calzadas), Boyacá 191,
   Ciudad de Cali 135, Agoberto Mejía 113, Primero de Mayo 18 (casi toda fuera de la red del modelo).
   DESVÍOS: grafo no dirigido de toda la red (extremos de arista unidos a menos de 8 m; costo = largo × 1 arteria, 1,15 intermedia,
   1,6 local) sin las aristas cerradas. La vía se divide en tramos de ~900 m a lo largo de su eje; para cada tramo se busca la ruta más
   corta entre sus extremos (Dijkstra) y una alternativa (las aristas de la primera ruta cuestan ×2,5): peso 1 y 0,55. Todo se arma en
   el primer poner de cada vía (decenas de ms); por cuadro solo cambian uniformes.
   Grupo de la escena 'cierre' (KEN_FOCO.on('cierre') lo deja en color). */

export const VIAS = {
  americas: { n: 'Av. de las Américas', e: [6590,6591,6592,8346,8372,8407,8454,9738,9866,9981,10291,10292,10293,10294,10295,10296,10297,10323,10394,10396,10399,10400,10401,10404,10435,10436,10476,10477,10478,10479,10480,10481,10482,10483,10484,10485,10486,10487,10530,10531,10532,10533,10563,10588,10589,10591,10592,10600,10601,10628,10629,10630,10631,10632,10633,10634,10635,10699,10701,11081,11121,11122,11353,12402,12403,12404,12405,12406,12407,12408,12409,12410,12411,12412,12413,12414,12415,12416,12424,12433,12449,12450,12452,12454,12455,12456,12457,12738,13930,13931,14506,14515,14516,14521,14631,14651,15148,15766,15768,16341,16342,16343,16344,16345,16346,16347,16348,16349,16350,16351,16352,16353,16418,16419,16879,16880,16881,16882,16883,16884,17112,17113,17114,17152,18089,18932,18937,18944,18945,18946] },
  boyaca: { n: 'Av. Boyacá', e: [8258,8259,8260,8261,8262,8263,8264,8265,8270,8271,8272,8273,8274,8275,8276,8277,8278,8279,8280,8281,8282,8283,8284,8285,8286,8287,8371,8458,8460,8489,8490,8491,8492,8493,9437,9438,9439,9441,9442,9443,9444,9445,9887,9889,10466,10496,10548,10551,10552,10553,10582,10583,10608,10660,10661,10813,11060,11082,11083,11084,11155,11167,11168,11169,11170,11171,11241,11242,11340,11341,11344,11345,12390,12391,12395,12420,12423,12429,12461,12462,12463,12464,13791,13792,13793,14511,14621,14625,14626,14627,14628,14629,14715,14804,14805,14806,14807,14840,15144,15145,15149,15150,15151,15152,15153,15154,15155,15156,15338,15412,15413,15414,15415,15416,15417,15418,15419,15420,15421,15422,15423,15424,15425,15426,15427,16926,16927,16995,16996,16997,16998,16999,17000,17001,17002,17210,17211,17212,17213,17648,17649,17650,17651,17652,17653,17654,18090,18091,18092,18093,18094,18095,18096,18097,18098,18099,18100,18101,18138,18139,18143,18144,18849,18850,18899,18938,18939,18940,18941,18942,18943,18951,18952,18953,18954,18955,18962,18963,18964,18965,18966,18977,19004,19006,19007,19008,19009,19010,19011,19015,19016] },
  cali: { n: 'Av. Ciudad de Cali', e: [1625,8450,8451,8452,9447,9448,9449,9695,9734,9735,9736,9737,9739,9740,9741,9769,9770,9771,9772,9773,9774,9775,9833,9834,9835,9836,9837,9838,9839,9840,9841,9842,9843,9844,9845,9846,9847,9856,9859,9860,9862,9870,9871,9872,9912,9913,9914,9915,9916,9917,9918,9919,9920,9921,9922,9923,9926,9930,9932,9942,10238,10239,10241,10315,10316,10323,10342,10343,10550,10560,10561,10562,10584,10605,10617,10678,10797,10798,10799,10800,10801,10802,10803,10804,10805,10806,10807,10808,10809,10810,10835,10836,10858,10973,11065,11073,11261,11265,11267,11268,11269,11322,11332,11333,11334,11335,11336,11337,15399,15400,15401,15402,15403,15404,15405,15406,15407,15408,15409,15410,15411,15654,15655,15656,15657,15774,16648,18860,18861,18862,18863,18864,18865,18866,18867] },
  mayo: { n: 'Av. Primero de Mayo', e: [1530,1531,1532,1533,1629,5631,5632,5633,5634,10366,10367,10368,10369,10623,15796,15797,15798,15799] },
  agoberto: { n: 'Av. Agoberto Mejía', e: [885,1175,1176,1731,1732,1781,1782,1783,1784,1785,1786,1787,1788,2877,2878,2879,2880,2881,2882,6398,6399,6718,6719,6720,6721,6722,6723,6858,6859,6860,6861,6862,6863,6864,6865,8403,8404,8405,8406,8412,8433,9461,9875,9876,10295,10297,10394,10811,10884,10885,10886,10887,10888,10889,10890,10891,12303,12304,12305,12306,12307,12308,13807,13808,13809,13810,13811,15395,15396,15428,15429,15430,15431,15434,15435,15436,15437,15769,15770,15771,16792,16796,16797,16890,17267,17268,17269,17270,17271,17413,17414,17415,17416,17417,17418,17419,17420,17772,18858,18859,18879,18880,18881,18882,18890,18891,18892,18893,18894,18895,18896,18897,18914] }
};
const CRITICAS = [9847, 11268, 8260, 9919, 10240, 9449]; // = VIAS_CRITICAS de data3d/ruido_cierre.js (no se importa: se carga solo si hace falta)
const CORA = [6396, 2166];                             // centro de Corabastos (modelo): el cierre avanza desde el extremo más cercano
const D0 = 150, KMAX = 4, TRAMO = 900, COSTO = { major: 1, mid: 1.15, local: 1.6 };

function normalizar(v) {
  const s = String(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\bav(enida)?\.?\s*/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (/americas/.test(s)) return 'americas'; if (/boyaca/.test(s)) return 'boyaca'; if (/cali/.test(s)) return 'cali';
  if (/agoberto|mejia/.test(s)) return 'agoberto'; if (/mayo/.test(s)) return 'mayo';
  const c = s.match(/^critica\s*(\d)$/); if (c) return 'critica' + c[1];
  return s;
}

export function crearCierre({ T3, RELOJ }) {
  if (window.KEN_CIERRE) return window.KEN_CIERRE; // una sola obra en la escena: sim_ui.js y el recorrido de la sim. 02 (recorrido_movilidad.js) la comparten
  const THREE = T3.THREE;
  let G = null, U = null, RED = null, actual = null, viaKey = null, rcEdge = null, mallas = [], rotulos = [];
  const meta = { fase: 0, db: 0, tr: 0 }, cur = { fase: 0, db: 0, tr: 0 };
  let rcEstado = 'abierta', rcCola = Promise.resolve(), rcPend = 0, rcEspera = 0;
  const camP = new THREE.Vector3(), camT = new THREE.Vector3();
  const est = { via: null, nombre: '', aristas: 0, desvios: 0, rcArista: null, rc: 'abierta', ms: 0 };

  /* ---------- red como grafo (una vez) ---------- */
  function grafo() {
    if (RED) return RED;
    const E = T3.net.edges, M = E.length, ea = new Int32Array(M), eb = new Int32Array(M), eL = new Float32Array(M), eC = new Float32Array(M);
    const X = [], Y = [], celda = new Map(), R = 8, key = (i, j) => i * 100003 + j;
    const nodo = (x, y) => { const ci = Math.floor(x / R), cj = Math.floor(y / R);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const L = celda.get(key(ci + di, cj + dj)); if (L) for (const n of L) if ((X[n] - x) ** 2 + (Y[n] - y) ** 2 < R * R) return n; }
      const n = X.length; X.push(x); Y.push(y); const k = key(ci, cj); (celda.get(k) || celda.set(k, []).get(k)).push(n); return n; };
    for (let e = 0; e < M; e++) { const P = E[e][1]; let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      ea[e] = nodo(P[0][0], P[0][1]); eb[e] = nodo(P[P.length - 1][0], P[P.length - 1][1]); eL[e] = L; eC[e] = L * (COSTO[E[e][0]] || 1.3); }
    const NN = X.length, deg = new Int32Array(NN + 1); for (let e = 0; e < M; e++) { deg[ea[e]]++; deg[eb[e]]++; }
    const off = new Int32Array(NN + 1); for (let i = 0; i < NN; i++) off[i + 1] = off[i] + deg[i];
    const adj = new Int32Array(off[NN]), fill = off.slice(0, NN); for (let e = 0; e < M; e++) { adj[fill[ea[e]]++] = e; adj[fill[eb[e]]++] = e; }
    RED = { M, NN, X: Float64Array.from(X), Y: Float64Array.from(Y), ea, eb, eL, eC, off, adj };
    return RED;
  }
  function dijkstra(s, t, costo, bloq) {
    const { NN, ea, eb, off, adj } = RED, dist = new Float64Array(NN).fill(Infinity), prev = new Int32Array(NN).fill(-1), hv = [], hn = [];
    const push = (d, n) => { hv.push(d); hn.push(n); let i = hv.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= hv[i]) break; [hv[p], hv[i]] = [hv[i], hv[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; } };
    const pop = () => { const n = hn[0], lv = hv.pop(), ln = hn.pop(); if (hv.length) { hv[0] = lv; hn[0] = ln; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hv.length && hv[l] < hv[m]) m = l; if (r < hv.length && hv[r] < hv[m]) m = r; if (m === i) break; [hv[m], hv[i]] = [hv[i], hv[m]]; [hn[m], hn[i]] = [hn[i], hn[m]]; i = m; } } return n; };
    dist[s] = 0; push(0, s);
    while (hv.length) { const d = hv[0], u = pop(); if (d > dist[u]) continue; if (u === t) break;
      for (let k = off[u]; k < off[u + 1]; k++) { const e = adj[k]; if (bloq[e]) continue; const v = ea[e] === u ? eb[e] : ea[e], nd = d + costo[e]; if (nd < dist[v]) { dist[v] = nd; prev[v] = e; push(nd, v); } } }
    if (!isFinite(dist[t])) return null;
    const L = []; for (let u = t; u !== s;) { const e = prev[u]; if (e < 0) break; L.push(e); u = ea[e] === u ? eb[e] : ea[e]; } return L;
  }

  /* ---------- geometría de cintas sobre las calles ---------- */
  // tiras de ancho w siguiendo cada polilínea (mundo); atributos: aV (−1…1 a lo ancho), aS (m a lo largo), aW (peso), aU (avance a lo largo de la vía)
  function cinta(lista, w, Y) {
    let nv = 0, ni = 0; for (const c of lista) { nv += c.p.length * 2; ni += (c.p.length - 1) * 6; }
    const P = new Float32Array(nv * 3), V = new Float32Array(nv), S = new Float32Array(nv), W = new Float32Array(nv), Uu = new Float32Array(nv), I = new Uint32Array(ni);
    let o = 0, q = 0;
    for (const c of lista) { const p = c.p, n = p.length; let s = 0;
      for (let i = 0; i < n; i++) {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        if (i) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
        const nx = -dz * w / 2, nz = dx * w / 2, u = c.u ? c.u[i] : 0;
        for (const sg of [-1, 1]) { P[o * 3] = p[i][0] + nx * sg; P[o * 3 + 1] = Y; P[o * 3 + 2] = p[i][1] + nz * sg; V[o] = sg; S[o] = s; W[o] = c.w; Uu[o] = u; o++; }
        if (i < n - 1) { const b0 = o - 2; I[q++] = b0; I[q++] = b0 + 2; I[q++] = b0 + 1; I[q++] = b0 + 1; I[q++] = b0 + 2; I[q++] = b0 + 3; }
      } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aV', new THREE.BufferAttribute(V, 1));
    g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setAttribute('aW', new THREE.BufferAttribute(W, 1)); g.setAttribute('aU', new THREE.BufferAttribute(Uu, 1));
    g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeBoundingSphere(); return g;
  }
  const VS = 'attribute float aV, aS, aW, aU; varying float vV, vS, vW, vU; void main(){ vV = aV; vS = aS; vW = aW; vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const FS = {
    // vía cerrada: ámbar mientras se cierran carriles, rojo con el cierre total; avanza a lo largo de la vía con la fase
    cerrada: 'uniform float uFase, uT; varying float vV, vS, vW, vU; void main(){ float rev = smoothstep(vU * 0.96, vU * 0.96 + 0.03, uFase * 2.0); float full = smoothstep(0.5, 1.0, uFase);' +
      ' vec3 c = mix(vec3(1.0, 0.66, 0.16), vec3(0.98, 0.16, 0.13), full); c = mix(c, vec3(0.07, 0.06, 0.08), step(0.5, fract((vS + vV * 6.0) / 8.0)) * (0.55 + 0.4 * full)); float e = 1.0 - smoothstep(0.55, 1.0, abs(vV));' + /* franjas diagonales oscuras / rojas: «obra, vía cerrada» */
      ' float a = rev * e * (0.5 + 0.3 * full + 0.1 * sin(uT * 3.0)); if (a < 0.004) discard; gl_FragColor = vec4(c, a); }',
    cerradaHalo: 'uniform float uFase, uT; varying float vV, vS, vW, vU; void main(){ float rev = smoothstep(vU * 0.96, vU * 0.96 + 0.03, uFase * 2.0); float full = smoothstep(0.5, 1.0, uFase);' +
      ' float f = 1.0 - abs(vV); float a = rev * f * f * (0.14 + 0.16 * full); if (a < 0.004) discard; gl_FragColor = vec4(mix(vec3(1.0, 0.55, 0.1), vec3(0.95, 0.12, 0.1), full), a); }',
    // desvíos: cinta naranja → roja según el peso, con pulsos que corren por la calle (flujo de carros desviados)
    desvio: 'uniform float uI, uT; varying float vV, vS, vW, vU; void main(){ float d = fract(vS / 28.0 - uT * 0.9); float pul = 0.62 + 0.38 * smoothstep(0.0, 0.12, d) * (1.0 - smoothstep(0.45, 0.6, d));' +
      ' float e = 1.0 - smoothstep(0.5, 1.0, abs(vV)); float a = uI * (0.35 + 0.65 * vW) * pul * e * 0.9; if (a < 0.004) discard;' +
      ' gl_FragColor = vec4(mix(vec3(1.0, 0.6, 0.14), vec3(0.97, 0.2, 0.12), vW), a); }',
    ruido: 'uniform float uH; varying float vV, vS, vW, vU; void main(){ float f = 1.0 - vV * vV; float a = uH * f * f * 0.26 * (0.35 + 0.65 * vW); if (a < 0.003) discard; gl_FragColor = vec4(0.86, 0.1, 0.09, a); }'
  };
  const matCinta = (fs, orden) => { const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS[fs], transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 - orden, polygonOffsetUnits: -4 - orden }); return m; };

  /* ---------- conos, barricadas y luces (instancias; aparecen en el sombreador según la fase) ---------- */
  function geoPartes(lista) { // lista de [geometría, color]
    let n = 0; const gs = lista.map(([g, c]) => { g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('uv'); const C = new THREE.Color(c), k = g.attributes.position.count, a = new Float32Array(k * 3); for (let i = 0; i < k; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); n += k; return g; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of gs) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.BufferAttribute(P, 3)); r.setAttribute('normal', new THREE.BufferAttribute(N, 3)); r.setAttribute('color', new THREE.BufferAttribute(C, 3)); return r;
  }
  const tr = (g, x, y, z, ry = 0) => g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
  function geoCono() {
    return geoPartes([[tr(new THREE.ConeGeometry(0.2, 0.72, 10, 1, true), 0, 0.4, 0), '#f26a1b'], [tr(new THREE.CylinderGeometry(0.115, 0.15, 0.13, 10, 1, true), 0, 0.42, 0), '#f1f1ec'],
      [tr(new THREE.BoxGeometry(0.46, 0.05, 0.46), 0, 0.025, 0), '#26272a']]);
  }
  function geoBarricada() { // barrera plástica de franjas rojas y blancas (adelante = +x a lo ancho)
    const L = []; for (const yy of [0.82, 0.5]) for (let k = 0; k < 6; k++) L.push([tr(new THREE.BoxGeometry(0.34, 0.22, 0.07), -0.85 + k * 0.34, yy, 0), k % 2 ? '#f3f3ee' : '#d4231e']);
    for (const s of [-1, 1]) { L.push([tr(new THREE.BoxGeometry(0.08, 1.0, 0.08), s * 0.95, 0.5, 0), '#3a3b3e']); L.push([tr(new THREE.BoxGeometry(0.1, 0.06, 0.6), s * 0.95, 0.03, 0), '#3a3b3e']); }
    return geoPartes(L);
  }
  function matObra(fila, basica) { // fila 0: conos (fase 0 → 0,5) · fila 1: barricadas y luces (0,5 → 1)
    const m = basica ? new THREE.MeshBasicMaterial({ color: 0xffb21e, toneMapped: false }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aU; uniform float uFase, uD0, uKmax, uT;\n')
        .replace('#include <begin_vertex>', `vec3 Wp = vec3(instanceMatrix[3].xyz); float kd = clamp(distance(cameraPosition, Wp) / uD0, 1.0, uKmax);
          float rv = clamp((uFase * 2.0 - ${fila.toFixed(1)} - aU * 0.96) / 0.04, 0.0, 1.0); rv = rv * rv * (3.0 - 2.0 * rv);
          ${basica ? 'rv *= step(0.0, sin(uT * 5.0 + aU * 40.0));' : ''}
          vec3 transformed = position * (1.5 * kd * rv);\n#ifdef USE_ALPHAHASH\nvPosition = vec3( position );\n#endif`); };
    m.customProgramCacheKey = () => 'cierre-obra-' + fila + (basica ? 'b' : '');
    return m;
  }
  function instancias(geo, mat, L, nombre) { // L: [x, y, z, giro, u]
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, L.length)); im.name = nombre; im.frustumCulled = false; im.count = L.length;
    const m4 = new THREE.Matrix4(), au = new Float32Array(Math.max(1, L.length));
    L.forEach((p, i) => { m4.makeRotationY(p[3]).setPosition(p[0], p[1], p[2]); im.setMatrixAt(i, m4); au[i] = p[4]; });
    geo.setAttribute('aU', new THREE.InstancedBufferAttribute(au, 1)); im.instanceMatrix.needsUpdate = true; return im;
  }

  /* ---------- armar la obra y los desvíos de una vía ---------- */
  function aristasDe(via) {
    if (Array.isArray(via)) return { k: 'aristas:' + via.join(','), n: 'Vía', e: via.map(Number).filter(Number.isFinite) };
    if (typeof via === 'number') return { k: 'arista:' + via, n: 'Vía', e: [via] };
    const k = normalizar(via); if (VIAS[k]) return { k, n: VIAS[k].n, e: VIAS[k].e };
    const c = k.match(/^critica(\d)$/); if (c && CRITICAS[+c[1] - 1] != null) return { k, n: 'Vía crítica ' + c[1], e: [CRITICAS[+c[1] - 1]] };
    return null;
  }
  function limpiarMallas() { for (const m of mallas) { G.remove(m); m.geometry.dispose(); if (m.material.dispose) m.material.dispose(); } mallas = []; }
  function armarVia(def) {
    const t0 = performance.now(), E = T3.net.edges, lw = T3.lw, R = grafo();
    const cerr = def.e.filter(e => e >= 0 && e < R.M), bloq = new Uint8Array(R.M); for (const e of cerr) bloq[e] = 1;
    // eje principal de la vía (componente principal de sus puntos) y avance u ∈ [0, 1] desde el extremo más cercano a Corabastos
    let mx = 0, my = 0, n = 0; for (const e of cerr) for (const p of E[e][1]) { mx += p[0]; my += p[1]; n++; } mx /= n || 1; my /= n || 1;
    let sxx = 0, sxy = 0, syy = 0; for (const e of cerr) for (const p of E[e][1]) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); let ax = Math.cos(ang), ay = Math.sin(ang);
    let s0 = Infinity, s1 = -Infinity; for (const e of cerr) for (const p of E[e][1]) { const s = (p[0] - mx) * ax + (p[1] - my) * ay; if (s < s0) s0 = s; if (s > s1) s1 = s; }
    if ((CORA[0] - mx) * ax + (CORA[1] - my) * ay > (s0 + s1) / 2) { ax = -ax; ay = -ay; const t = s0; s0 = -s1; s1 = -t; }
    const Ls = Math.max(1, s1 - s0), uDe = (x, y) => Math.max(0, Math.min(1, ((x - mx) * ax + (y - my) * ay - s0) / Ls));
    const Yv = (T3.viaY != null ? T3.viaY : 0.62), Ys = (T3.sueloY != null ? T3.sueloY : 0.3);
    // cintas de la vía cerrada
    const lc = cerr.map(e => { const P = E[e][1]; return { p: P.map(q => lw(q[0], q[1])), u: P.map(q => uDe(q[0], q[1])), w: 1 }; });
    const mC = new THREE.Mesh(cinta(lc, 8, Yv + 0.85), matCinta('cerrada', 2)); mC.name = 'cierre-via'; mC.renderOrder = 6;
    const mH = new THREE.Mesh(cinta(lc, 34, Yv + 0.8), matCinta('cerradaHalo', 1)); mH.name = 'cierre-halo'; mH.renderOrder = 5;
    // conos cada 8 m sobre la raya del carril derecho; barricadas cada 32 m en el izquierdo y 3 de través al empezar cada calzada
    const conos = [], barr = [];
    for (const e of cerr) { const P = E[e][1].map(q => lw(q[0], q[1])), Pm = E[e][1];
      let resto = 0;
      for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
        const ux = dx / l, uz = dz / l, nx = -uz, nz = ux, giro = Math.atan2(-uz, ux);
        for (let s = resto; s < l; s += 8) { const x = a[0] + ux * s, z = a[1] + uz * s, f = s / l, u = uDe(Pm[i - 1][0] + (Pm[i][0] - Pm[i - 1][0]) * f, Pm[i - 1][1] + (Pm[i][1] - Pm[i - 1][1]) * f);
          conos.push([x + nx * 1.8, Ys, z + nz * 1.8, giro, u]);
          if (Math.round(s / 8) % 4 === 0) barr.push([x - nx * 1.6, Ys, z - nz * 1.6, giro, u]); }
        resto = (resto - l) % 8; if (resto < 0) resto += 8;
        if (i === 1) { const u = uDe(Pm[0][0], Pm[0][1]); for (const o of [-3.4, 0, 3.4]) barr.push([a[0] + ux * 3 + nx * o, Ys, a[1] + uz * 3 + nz * o, giro + Math.PI / 2, u]); }
      } }
    const geoL = new THREE.SphereGeometry(0.11, 8, 6).translate(0.95, 1.08, 0);
    const iC = instancias(geoCono(), matObra(0, false), conos, 'cierre-conos'), iB = instancias(geoBarricada(), matObra(1, false), barr, 'cierre-barricadas'), iL = instancias(geoL, matObra(1, true), barr, 'cierre-luces');
    // desvíos: Dijkstra entre los extremos de cada tramo de ~900 m a lo largo de la vía, más una alternativa
    const peso = new Float32Array(R.M), costo = Float32Array.from(R.eC), libre = new Uint8Array(R.NN);
    for (let i = 0; i < R.NN; i++) for (let k = R.off[i]; k < R.off[i + 1]; k++) if (!bloq[R.adj[k]]) { libre[i] = 1; break; }
    // puntos de la vía a lo largo del eje (extremos de las aristas cerradas)
    const marcas = []; for (const e of cerr) for (const nd of [R.ea[e], R.eb[e]]) marcas.push([nd, ((R.X[nd] - mx) * ax + (R.Y[nd] - my) * ay - s0) / Ls]);
    const nTr = Math.max(1, Math.round(Ls / TRAMO)), cercaDe = (uq) => { let b = null, bd = 1e9; for (const [nd, u] of marcas) { const d = Math.abs(u - uq); if (d < bd) { bd = d; b = nd; } } return b; };
    const nodoLibre = (nd) => { if (libre[nd]) return nd; let b = -1, bd = 150 * 150; const x = R.X[nd], y = R.Y[nd]; for (let i = 0; i < R.NN; i++) { if (!libre[i]) continue; const d = (R.X[i] - x) ** 2 + (R.Y[i] - y) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
    let rutas = 0;
    for (let k = 0; k < nTr; k++) {
      const a = nodoLibre(cercaDe(k / nTr)), b = nodoLibre(cercaDe((k + 1) / nTr)); if (a < 0 || b < 0 || a === b) continue;
      const r1 = dijkstra(a, b, costo, bloq); if (!r1) continue; rutas++;
      for (const e of r1) { peso[e] += 1; costo[e] *= 2.5; }
      const r2 = dijkstra(a, b, costo, bloq); if (r2) for (const e of r2) peso[e] += 0.55;
      for (const e of r1) costo[e] = R.eC[e]; // costo normal para el siguiente tramo
    }
    let pm = 0; for (let e = 0; e < R.M; e++) if (peso[e] > pm) pm = peso[e];
    const ld = []; for (let e = 0; e < R.M; e++) if (peso[e] > 0 && !bloq[e]) { const P = E[e][1]; ld.push({ p: P.map(q => lw(q[0], q[1])), w: Math.min(1, peso[e] / Math.max(1, pm * 0.6)) }); }
    const mD = new THREE.Mesh(cinta(ld, 6, Yv + 0.9), matCinta('desvio', 3)); mD.name = 'cierre-desvios'; mD.renderOrder = 7;
    const mR = new THREE.Mesh(cinta(ld, 70, Yv + 0.75), matCinta('ruido', 0)); mR.name = 'cierre-ruido'; mR.renderOrder = 4;
    // rótulo «AV. DE LAS AMÉRICAS · CERRADA» (tamaño fijo en pantalla) en 4 puntos de la vía
    rotulos = [];
    { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const cx = cv.getContext('2d');
      cx.fillStyle = 'rgba(14,16,20,0.92)'; cx.fillRect(0, 0, 1024, 128); cx.fillStyle = '#e8262a'; cx.fillRect(0, 0, 18, 128); cx.fillRect(1006, 0, 18, 128);
      cx.fillStyle = '#ffffff'; cx.font = '700 62px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText((def.n + ' · CERRADA').toUpperCase(), 512, 68);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      const medios = cerr.map(e => { const P = E[e][1], q = P[Math.floor(P.length / 2)]; return { e, q, u: uDe(q[0], q[1]) }; });
      for (const ut of [0.12, 0.37, 0.63, 0.88]) { let b = null; for (const m of medios) if (!b || Math.abs(m.u - ut) < Math.abs(b.u - ut)) b = m; if (!b) continue;
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false, opacity: 0 }));
        const [wx, wz] = lw(b.q[0], b.q[1]); sp.position.set(wx, Ys + 30, wz); sp.scale.set(0.24, 0.03, 1); sp.renderOrder = 30; sp.name = 'cierre-rotulo'; sp.frustumCulled = false; rotulos.push(sp); } }
    mallas = [mR, mH, mC, mD, iC, iB, iL, ...rotulos]; for (const m of mallas) G.add(m);
    // arista para T3.rc.cerrar (los carros grabados se desvían): la cerrada más cercana a Corabastos con al menos 30 m
    let be = cerr[0], bd = Infinity; for (const e of cerr) { if (R.eL[e] < 30 && cerr.length > 1) continue; const P = E[e][1], q = P[Math.floor(P.length / 2)], d = (q[0] - CORA[0]) ** 2 + (q[1] - CORA[1]) ** 2; if (d < bd) { bd = d; be = e; } }
    rcEdge = cerr.length > 1 ? cerr.slice() : be; /* 2026-11-26: toda la vía (la lista) para que los carros grabados que la usan tomen el desvío */
    Object.assign(est, { aristas: cerr.length, desvios: ld.length, rutas, conos: conos.length, barricadas: barr.length, rcArista: be, ms: Math.round(performance.now() - t0) });
  }

  function armar() {
    if (G) return;
    U = { uFase: { value: 0 }, uT: { value: 0 }, uI: { value: 0 }, uH: { value: 0 }, uD0: { value: D0 }, uKmax: { value: KMAX } };
    G = new THREE.Group(); G.name = 'cierre'; G.visible = false; T3.scene.add(G);
    RELOJ.alDibujar(cuadro);
  }

  /* ---------- carros grabados (data3d/ruido_cierre.js, como rcApi() de index.html) ---------- */
  async function rcApi() {
    if (T3.rc) return T3.rc;
    const m = await import('./ruido_cierre.js?v=16');
    if (!T3.rc) { T3.rcMod = m; T3.rc = m.crearRuidoCierre({ THREE, T3, LC: T3.LC }); }
    return T3.rc;
  }
  function rcHacer(edge) {
    rcCola = rcCola.then(async () => {
      try {
        if (edge == null && !T3.rc) { rcEstado = 'abierta'; return; }
        if (!T3.TRAF && edge != null) { rcEstado = 'abierta'; rcEspera = performance.now() + 4000; return; } // el tráfico aún carga: se reintenta
        const rc = await rcApi(); if (!rc) return;
        if (edge == null && rc.cerrada == null) { rcEstado = 'abierta'; return; }
        if (T3.orbit) { camP.copy(T3.camera.position); camT.copy(T3.orbit.target); } rcPend++;
        await rc.cerrar(edge, () => {});
        rcPend--;
        if (T3.orbit) { T3.camera.position.copy(camP); T3.orbit.target.copy(camT); T3.orbit.update(); } // ruido_cierre mueve la cámara: se deja donde estaba
        const mk = T3.scene.getObjectByName('via-cerrada'); if (mk) mk.visible = false; // la obra de este módulo ya marca la vía
        rcEstado = rc.cerrada == null ? 'abierta' : 'cerrada';
        if (edge != null && rc.cerrada == null) rcEspera = performance.now() + 4000;
      } catch (e) { rcPend = Math.max(0, rcPend - 1); console.warn('cierre · carros:', e); }
      est.rc = rcEstado;
    });
  }

  /* ---------- un cuadro: suavizado y uniformes ---------- */
  function cuadro(info) {
    if (!G || (!G.visible && meta.fase === 0)) return;
    const dt = info ? info.dtReal || 0 : 0.016, a = Math.min(1, dt * 1.6);
    cur.fase += (meta.fase - cur.fase) * a; if (Math.abs(meta.fase - cur.fase) < 0.002) cur.fase = meta.fase;
    cur.db += (meta.db - cur.db) * a; cur.tr += (meta.tr - cur.tr) * a;
    U.uFase.value = cur.fase; U.uT.value = RELOJ.tAnim || 0;
    U.uI.value = cur.fase * Math.max(0, Math.min(1.5, cur.tr));
    U.uH.value = cur.fase * Math.max(0, Math.min(1.25, cur.db / 8));
    G.visible = cur.fase > 0.001; for (const r of rotulos) r.material.opacity = Math.max(0, Math.min(1, (cur.fase - 0.2) / 0.3));
    if (rcPend > 0 && T3.orbit) { camP.copy(T3.camera.position); camT.copy(T3.orbit.target); } // lo último que se vio antes de que ruido_cierre mueva la cámara
    if (rcEdge != null && rcEstado === 'abierta' && meta.fase >= 0.5 && cur.fase >= 0.5 && performance.now() > rcEspera) { rcEstado = 'cerrando'; rcHacer(rcEdge); }
    else if (rcEstado === 'cerrada' && meta.fase < 0.45) { rcEstado = 'abriendo'; rcHacer(null); }
  }

  function poner({ via = 'americas', fase = 0, ruidoExtraDb = 0, traficoDesvio = 0 } = {}) {
    if (!T3.net || !T3.lw) { console.warn('KEN_CIERRE: la red vial aún no cargó'); return null; }
    armar();
    const def = aristasDe(via); if (!def || !def.e.length) { console.warn('KEN_CIERRE: vía desconocida', via); return null; }
    if (def.k !== viaKey) {
      if (rcEstado === 'cerrada' || rcEstado === 'cerrando') { rcEstado = 'abriendo'; rcHacer(null); }
      limpiarMallas(); viaKey = def.k; actual = def; cur.fase = 0; armarVia(def);
      Object.assign(est, { via: def.k, nombre: def.n });
    }
    meta.fase = Math.max(0, Math.min(1, +fase || 0)); meta.db = Math.max(0, +ruidoExtraDb || 0); meta.tr = Math.max(0, +traficoDesvio || 0);
    if (meta.fase > 0) G.visible = true;
    return est;
  }
  function quitar() {
    meta.fase = 0; meta.db = 0; meta.tr = 0;
    if (rcEstado === 'cerrada' || rcEstado === 'cerrando') { rcEstado = 'abriendo'; rcHacer(null); }
  }

  const API = { poner, quitar, VIAS: Object.fromEntries(Object.entries(VIAS).map(([k, v]) => [k, { n: v.n, aristas: v.e.length }])), get estado() { return { ...est, fase: cur.fase, rc: rcEstado }; }, get grupo() { return G; } };
  window.KEN_CIERRE = API;
  return API;
}
