/* ============ PROPUESTA COMÚN · PUENTE DE FAUNA (ECODUCTO) Y ÁRBOLES DE BORDE DE LOS HUMEDALES (docs/todas_las_simulaciones.md) ============
   crearEcoducto({ T3 }) → { poner(sem), apagar(), info(), puente: { x, z, radio } } — lo maneja data3d/propuesta01_3d.js (activar).
   · DÓNDE: la Av. Ciudad de Cali parte en dos el Humedal El Burro (net.json: las dos calzadas «major» de (7038, 3559) a (7317, 3812); el
     polígono del humedal, water_bodies.json, sigue a ambos lados entre t = 160 y 290 m de ese tramo). El puente va en t = 225 m:
     coordenadas del modelo (7204,9, 3710,5) → mundo lw() = (1863,6, −548,6). Es el único punto donde una vía arterial corta un humedal de
     Kennedy con humedal a ambos lados (La Vaca norte y sur están separados por barrio, no por una vía; Techo solo tiene vías locales).
   · FORMA (referentes: pasos de fauna verdes sobre autopistas): la vía queda igual y los carros pasan por debajo (luz libre 6–6,9 m, intradós
     en arco); encima un tablero de 52 m de ancho en el centro que se abre a 80 m en los extremos (planta en reloj de arena, bordes curvos),
     con rampas de tierra de 48 m a cada lado que bajan al humedal. Borde del tablero en concreto claro (labio delgado y arco, lo que se ve
     desde la vía); muros de contención curvos en las cuatro esquinas; sobre todo, bosque nativo continuo (modelos escaneados de
     data3d/parches_arboles.js): arbustos de flor en los bordes (pantalla contra luces y ruido), dosel en el centro y en las rampas.
     [SUP: dimensiones de diseño, sin estudio estructural]
   · BORDES DE LOS HUMEDALES: ~3.900 árboles nativos en la franja de 7 m dentro a 26 m fuera del borde de El Burro, La Vaca (norte y sur) y
     Techo, precalculados en data3d/propuesta_bordes.json (sin vías: net.json con su ancho; sin edificios: buildings.json + 2,5 m; sin otros
     cuerpos de agua; sin encima de los árboles existentes de trees.json). Arbustos de humedal hacia el agua, dosel hacia afuera.
   · CALENDARIO [SUP]: obra del puente en el año 1 (aparece con tierra), cubierta verde en los años 1,3–3, árboles del puente sembrados en los
     años 1,5–2,5; árboles de borde sembrados entre los años 0,5 y 4; todos llegan a adultos 3,5 años después de sembrados.
   · La malla de Google se recorta bajo el puente (uPuenteOn/uPuenteC en index.html) para que sus árboles no atraviesen el tablero. */
import { crearParches3D, ESPECIES } from './parches_arboles.js?v=11';

const CL = [7204.9, 3710.5], UL = [0.73952, 0.67314]; // centro y eje de la vía (coordenadas del modelo)
const AB = 22, RAMPA = 70, H = 8.6; // media luz del vano (m), fin de las rampas (m), altura del tablero sobre el suelo
const sat = (v) => Math.max(0, Math.min(1, v)), sm = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/* perfil (s: a través de la vía; w: a lo largo de la vía) — el mismo que usa el recorte de index.html */
export const anchoMedio = (s) => 26 + 14 * sm(10, RAMPA, Math.abs(s));
const alto = (s) => { const a = Math.abs(s); return a <= AB + 2 ? H : H * (0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (a - AB - 2) / (RAMPA - AB - 2)))); };
const intrados = (s) => 6.0 + 0.9 * (1 - (s / AB) ** 2); // arco del intradós sobre la vía

export function crearEcoducto({ T3 }) {
  const THREE = T3.THREE, lw = T3.lw, Y0 = T3.sueloY != null ? T3.sueloY : 0.3;
  const [cx, cz] = lw(CL[0], CL[1]), ux = UL[0], uz = -UL[1], nx = -uz, nz = ux; // mundo: u a lo largo de la vía, n a través
  const P = (s, w, y) => [cx + nx * s + ux * w, y, cz + nz * s + uz * w];
  const G = new THREE.Group(); G.name = 'ecoducto'; G.visible = false; T3.scene.add(G);
  const hs = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ond = (s, l) => 1.1 * Math.sin(s * 0.11 + l * 2.1) + 0.6 * Math.sin(s * 0.31 + l * 5.3); // borde ondulado (orgánico)
  const hw = (s, l) => anchoMedio(s) + ond(s, l);
  const talud = (s) => Math.abs(s) > AB ? 1.5 * alto(s) * sm(AB, AB + 6, Math.abs(s)) : 0; // pie del talud de las rampas, hacia afuera
  const cima = (s, t) => alto(s) + 0.5 * Math.sin(s * 0.17) * Math.cos(t * 2.4) * sm(0, 20, Math.abs(s)) - 0.9 * Math.pow(Math.abs(t), 8); // lomas suaves y borde redondeado

  /* ---------- texturas: suelo de bosque (hojarasca, pasto y musgo) y concreto claro ---------- */
  let sd = 77; const rnd = () => ((sd = Math.imul(sd ^ (sd >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  const lienzo = (f) => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; f(cv.getContext('2d'), S); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const texSuelo = lienzo((g, S) => { g.fillStyle = '#4f6a2c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) { const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ['rgba(92,70,40,.45)', 'rgba(60,88,34,.5)', 'rgba(120,132,60,.4)'][i % 3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const C = ['#5d7c33', '#6e8a3a', '#3f5a24', '#7f9447', '#806a3e', '#55722e', '#93a050'];
    for (let i = 0; i < 9000; i++) { const x = rnd() * S, y = rnd() * S, l = 1 + rnd() * 3.5, a = rnd() * 6.283; g.strokeStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.45 + rnd() * 0.5; g.lineWidth = 0.7 + rnd() * 0.9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 120; i++) { g.globalAlpha = 0.85; g.fillStyle = ['#efe9c9', '#f2c230', '#d9534f', '#d0517a'][i % 4]; g.beginPath(); g.arc(rnd() * S, rnd() * S, 0.9, 0, 7); g.fill(); } g.globalAlpha = 1; });
  const texConc = lienzo((g, S) => { g.fillStyle = '#d9d5cc'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(120,115,105,.10)' : 'rgba(255,255,255,.12)'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2); }
    g.fillStyle = 'rgba(90,85,78,.18)'; for (let x = 0; x < S; x += 64) g.fillRect(x, 0, 1, S); }); // juntas de las piezas prefabricadas

  /* ---------- malla: cubierta (cima), taludes y bordes de concreto ---------- */
  const NS = 140, NT = 30, S0 = -RAMPA, DS = (2 * RAMPA) / NS;
  const malla = (pos, uv, idx, mat, nombre) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.name = nombre; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; G.add(m); return m; };
  const uGrow = { value: 0 }; // 0 = tierra de obra · 1 = cubierta verde
  const matSuelo = new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 1, metalness: 0, color: 0xffffff, side: THREE.DoubleSide });
  matSuelo.onBeforeCompile = (sh) => { sh.uniforms.uGrow = uGrow; sh.fragmentShader = 'uniform float uGrow;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = mix(vec3(0.20, 0.15, 0.10), diffuseColor.rgb, uGrow);'); };
  matSuelo.customProgramCacheKey = () => 'ecoductoSuelo';
  const matConc = new THREE.MeshStandardMaterial({ map: texConc, roughness: 0.85, metalness: 0, color: 0xf2efe8, side: THREE.DoubleSide });
  const matIntra = new THREE.MeshStandardMaterial({ map: texConc, roughness: 0.95, metalness: 0, color: 0x8f8c86, side: THREE.DoubleSide }); // intradós a la sombra
  { // cima: rejilla (s, t), w = t · ancho(s)
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= NS; i++) { const s = S0 + i * DS; for (let j = 0; j <= NT; j++) { const t = -1 + 2 * j / NT, w = t * hw(s, t < 0 ? 0 : 1); const p = P(s, w, Y0 + cima(s, t)); pos.push(...p); uv.push(p[0] / 9, p[2] / 9); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    malla(pos, uv, idx, matSuelo, 'ecoducto-cima'); }
  { // taludes de las rampas (|s| > AB): del borde de la cima al pie, hacia afuera, verdes
    const pos = [], uv = [], idx = []; let k = 0;
    for (const l of [0, 1]) { const sg = l ? 1 : -1;
      for (let i = 0; i <= NS; i++) { const s = S0 + i * DS, w0 = sg * hw(s, l), y0 = Y0 + cima(s, sg), w1 = sg * (hw(s, l) + talud(s)), y1 = Math.abs(s) > AB ? Y0 - 0.4 : y0;
        pos.push(...P(s, w0, y0), ...P(s, w1, y1)); uv.push(s / 9, 0, s / 9, (w1 - w0) / 9); }
      for (let i = 0; i < NS; i++) { const a = k + i * 2, b = a + 2; if (Math.abs(S0 + (i + 0.5) * DS) <= AB) continue; if (l) idx.push(a, b, a + 1, a + 1, b, b + 1); else idx.push(a, a + 1, b, a + 1, b + 1, b); }
      k += (NS + 1) * 2; }
    malla(pos, uv, idx, matSuelo, 'ecoducto-taludes'); }
  { // concreto: labio y arco del borde del tablero sobre la vía (w = ±ancho), intradós, estribos y muros curvos de contención
    const pos = [], uv = [], idx = []; const quad = (a, b, c, d) => { const n = pos.length / 3; pos.push(...a, ...b, ...c, ...d); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
    const SV = 44; // tramos del vano
    for (const l of [0, 1]) { const sg = l ? 1 : -1;
      for (let i = 0; i < SV; i++) { const s0 = -AB - 1 + (2 * AB + 2) * i / SV, s1 = -AB - 1 + (2 * AB + 2) * (i + 1) / SV, e = sg * 0.35; // el labio sobresale 35 cm
        const w0 = sg * hw(s0, l) + e, w1 = sg * hw(s1, l) + e, yt0 = Y0 + cima(s0, sg) + 0.35, yt1 = Y0 + cima(s1, sg) + 0.35, yb0 = Y0 + intrados(Math.max(-AB, Math.min(AB, s0))) - 0.25, yb1 = Y0 + intrados(Math.max(-AB, Math.min(AB, s1))) - 0.25;
        const A = P(s0, w0, yb0), B = P(s1, w1, yb1), C = P(s1, w1, yt1), D = P(s0, w0, yt0); if (l) quad(A, B, C, D); else quad(B, A, D, C);
        // canto superior del labio (cara horizontal de 0,5 m hacia adentro)
        const Ci = P(s1, w1 - sg * 0.6, yt1), Di = P(s0, w0 - sg * 0.6, yt0); if (l) quad(D, C, Ci, Di); else quad(C, D, Di, Ci); } }
    const N2 = 30; // intradós en arco (malla s × w)
    { const base = pos.length / 3; for (let i = 0; i <= SV; i++) { const s = -AB + 2 * AB * i / SV; for (let j = 0; j <= N2; j++) { const t = -1 + 2 * j / N2, w = t * (anchoMedio(s) + 0.3); pos.push(...P(s, w, Y0 + intrados(s))); uv.push(s / 6, w / 6); } }
      for (let i = 0; i < SV; i++) for (let j = 0; j < N2; j++) { const a = base + i * (N2 + 1) + j, b = a + N2 + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
    // estribos (paredes del paso inferior) en s = ±AB, y muros de contención curvos que abren hacia la vía siguiendo el talud
    for (const sg of [-1, 1]) { const M = 26;
      for (let j = 0; j < M; j++) { const ta = -1.35 + 2.7 * j / M, tb = -1.35 + 2.7 * (j + 1) / M;
        const f = (t) => { const a = Math.abs(t), wM = anchoMedio(AB); if (a <= 1) return [sg * AB, t * wM, Y0 + intrados(AB)]; const k = (a - 1) / 0.35; return [sg * (AB + 9 * k * k), Math.sign(t) * (wM + talud(AB + 8) * k), Y0 + intrados(AB) * (1 - k) + (Y0 - 0.3) * k]; };
        const [sa, wa, ya] = f(ta), [sb, wb, yb] = f(tb), A = P(sa, wa, Y0 - 0.3), B = P(sb, wb, Y0 - 0.3), C = P(sb, wb, yb + 0.2), D = P(sa, wa, ya + 0.2);
        if (sg < 0) quad(A, B, C, D); else quad(B, A, D, C); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    g.addGroup(0, SV * 2 * 2 * 6, 0); g.addGroup(SV * 2 * 2 * 6, SV * N2 * 6, 1); g.addGroup(SV * 2 * 2 * 6 + SV * N2 * 6, idx.length - (SV * 2 * 2 * 6 + SV * N2 * 6), 0);
    const m = new THREE.Mesh(g, [matConc, matIntra]); m.name = 'ecoducto-concreto'; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; G.add(m); }
  { // penumbra del paso inferior: el suelo bajo el tablero (los carros pasan por un túnel corto, no bajo una lámina)
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.18, 'rgba(0,0,0,.55)'); gr.addColorStop(0.82, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c), L = 2 * (anchoMedio(0) + 6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 2 * AB).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
    m.position.set(cx, Y0 + 0.12, cz); m.rotation.y = Math.atan2(-uz, ux); m.renderOrder = 3; m.name = 'ecoducto-penumbra'; G.add(m); }

  /* ---------- árboles: los del puente (sobre el relieve, t.y) y los de borde de los tres humedales ---------- */
  const A = []; const R = (() => { let s = 4242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const borde = ['chilco', 'tibar', 'arrayan', 'raque', 'mortino', 'arrayan'], seto = ['arrayan', 'arrayan', 'aliso', 'tibar', 'arrayan', 'chilco', 'sauco'], medio = ['sauco', 'chicala', 'arrayan', 'aliso'], dosel = ['caucho', 'aliso', 'aliso', 'caucho', 'sauco'];
  const puente = [];
  for (let s = -RAMPA + 6; s < RAMPA - 4; s += 3.1) for (let t = -0.95; t <= 0.95; t += 3.1 / 40) {
    const ss = s + (R() - 0.5) * 2.4, tt = t + (R() - 0.5) * 0.05, a = Math.abs(tt), w = tt * hw(ss, tt < 0 ? 0 : 1), y = cima(ss, tt);
    if (y < 0.6) continue; let L;
    if (a > 0.8) L = seto; else if (Math.abs(ss) <= AB + 2) L = R() < 0.55 ? medio : (R() < 0.6 ? seto : dosel); else L = R() < 0.6 ? dosel : medio;
    if (R() < 0.07) continue; const sp = L[Math.floor(R() * L.length)], [x, , z] = P(ss, w, 0);
    puente.push({ x, z, y: y - 0.15, sp, h: ESPECIES[sp].alto * (0.75 + R() * 0.35) * (Math.abs(ss) <= AB + 2 && ESPECIES[sp].estrato === 0 ? 0.7 : 1), rot: R() * 6.283, pu: 1 }); }
  // taludes de las rampas: también con bosque (sin franjas de pasto pelado)
  for (const l of [0, 1]) { const sg = l ? 1 : -1; for (let s = -RAMPA + 8; s < RAMPA - 6; s += 3.6) { if (Math.abs(s) < AB + 3) continue; const T = talud(s); if (T < 2) continue;
    for (let f = 0.12; f < 0.95; f += 3.4 / T) { const ss = s + (R() - 0.5) * 2.2, ff = f + (R() - 0.5) * 0.06, w = sg * (hw(ss, l) + ff * T), y = cima(ss, sg) * (1 - ff) - 0.4 * ff; if (R() < 0.1) continue;
      const L = ff < 0.4 ? medio : dosel, sp = L[Math.floor(R() * L.length)], [x, , z] = P(ss, w, 0); puente.push({ x, z, y: y - 0.2, sp, h: ESPECIES[sp].alto * (0.75 + R() * 0.35), rot: R() * 6.283, pu: 1 }); } } }
  // al pie de las rampas el bosque sigue a ambos lados (continúa en el humedal)
  for (let i = 0; i < 140; i++) { const sg = i % 2 ? 1 : -1, s = sg * (RAMPA - 6 + R() * 26), w = (R() - 0.5) * 2 * (anchoMedio(s) + 14), [x, , z] = P(s, w, 0), L = R() < 0.6 ? dosel : medio, sp = L[Math.floor(R() * L.length)];
    puente.push({ x, z, y: 0, sp, h: ESPECIES[sp].alto * (0.8 + R() * 0.35), rot: R() * 6.283, pu: 1 }); }
  let bordes = [], nombres = [], arb = null, listo = false, activo = false, sem = 0;
  const PB = (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/propuesta_bordes.json?v=1').then(D => {
    nombres = D.humedales || [];
    for (const [x0, y0, d, hi] of D.a) { const [x, z] = lw(x0, y0), L = d < 3 ? borde : d < 11 ? medio : dosel; if (R() < 0.04) continue; const sp = L[Math.floor(R() * L.length)];
      bordes.push({ x, z, sp, h: ESPECIES[sp].alto * (0.78 + R() * 0.37), rot: R() * 6.283, hum: hi }); }
  }).catch(e => console.warn('bordes de humedal:', e));
  // en parches de ~80 m (la red y el reparto cerca/lejos de parches_arboles.js trabajan por parche)
  const parches = () => { const M = {}; const meter = (t, n) => { const k = n + '|' + Math.floor(t.x / 80) + ',' + Math.floor(t.z / 80); (M[k] = M[k] || { n, c: [t.x, t.z], arboles: [] }).arboles.push(t); };
    for (const t of puente) meter(t, 'Puente de fauna · Humedal El Burro'); for (const t of bordes) meter(t, 'Borde · ' + (nombres[t.hum] || 'humedal')); return Object.values(M); };

  /* calendario de siembra: puente años 1,5–2,5; bordes 0,5–4 (según una clave fija por árbol) */
  let ultA = -9;
  function crecer(forzar) {
    const años = sem / 52, obra = años >= 1;
    G.visible = activo && obra; uGrow.value = sm(1.3, 3, años);
    hoyo(activo && obra);
    if (arb && arb !== 'cargando' && (forzar || Math.abs(años - ultA) > 0.07)) { ultA = años; arb.ver(activo && años > 0.5);
      arb.edad((k, t) => { const t0 = t && t.pu ? 1.5 + k : 0.5 + k * 3.5; const dt = años - t0; return dt <= 0 ? 0 : Math.min(1, 0.3 + 0.7 * dt / 3.5); }); } // edad(k, t): parches_arboles.js pasa la clave fija k y el árbol
  }
  function cargarArboles() {
    if (arb) return; arb = 'cargando';
    PB.then(() => crearParches3D({ T3, P: parches(), fijo: true })).then(Aa => { arb = Aa; Aa.grupo.name = 'ecoducto_arboles'; Aa.grupo.position.y = -0.05; Aa.grupo.traverse(o => { if (o.isPoints) o.visible = false; }); listo = true; crecer(true); })
      .catch(e => { arb = null; console.warn('árboles del ecoducto:', e); });
  }
  /* recorte de la malla de Google bajo el puente (index.html: uPuenteOn, uPuenteC = (cx, cz, ux, uz)) */
  function hoyo(on) { const M = T3.maskU; if (!M || !M.uPuenteOn) return; M.uPuenteOn.value = on ? 1 : 0; M.uPuenteC.value.set(cx, cz, ux, uz); }
  const radio = Math.round(Math.hypot(RAMPA, anchoMedio(RAMPA) + talud(AB + 8)));
  const api = {
    grupo: G, puente: { x: cx, z: cz, radio, ancho: Math.round(2 * anchoMedio(0)), largo: 2 * RAMPA, luz: 6, via: 'Av. Ciudad de Cali', humedal: 'Humedal El Burro', modelo: CL.slice(), eje: [ux, uz] },
    poner(s) { sem = s || 0; activo = true; cargarArboles(); crecer(false); },
    apagar() { if (!activo) return; activo = false; G.visible = false; hoyo(false); if (arb && arb !== 'cargando') arb.ver(false); },
    /* alturas para que la fauna (búhos) se pose en las copas: [{ x, y, z, h, sp, puente }] */
    arboles() { return { puente, bordes }; },
    info() { return { activo, listo, visible: G.visible, puente: api.puente, arbolesPuente: puente.length, arbolesBorde: bordes.length, verde: uGrow.value, hoyo: T3.maskU && T3.maskU.uPuenteOn ? T3.maskU.uPuenteOn.value : null }; }
  };
  return api;
}
