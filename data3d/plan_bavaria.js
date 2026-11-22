/* ============ PLAN PARCIAL FÁBRICA BAVARIA en 3D, construido por etapas (escenario «Plan parcial») ============
   Datos: data3d/plan_bavaria.json (tools/plan_bavaria_build.mjs): 37 manzanas cerradas con patio (ladrillo / blanco) y torres sobre la
   Av. Boyacá, 14.300 viviendas, parque central y bosque denso conservados (Decreto 364 de 2017, modificación 2023; imágenes de Metrovivienda 2017).
   Cada manzana se construye en su año (etapa 1–10): aparece la obra (gris), sube piso a piso durante el año y al terminar toma su material.
   Geometría ESQUEMÁTICA: la forma exacta de cada edificio no está publicada; la retícula, las alturas (6–10 pisos y torres de 20) y el
   reparto siguen las imágenes del plan. Se ve solo cuando el escenario activo es el del plan parcial (window.KEN_PLANBAV.ver). */
import { RELOJ } from './reloj.js?v=5';

export async function iniciarPlanBavaria({ T3 }) {
  const THREE = T3.THREE, P = await (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/plan_bavaria.json?v=1');
  const { BW, BD, ANILLO } = P.dims, ang = P.angulo, PISO = 3.0;
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const mats = {
    ladrillo: new THREE.MeshStandardMaterial({ color: 0xb4643f, roughness: 0.85 }),
    blanco: new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.7 }),
    obra: new THREE.MeshStandardMaterial({ color: 0x8f949a, roughness: 0.9, transparent: true, opacity: 0.85 })
  };
  // piezas: cada manzana = 4 barras del anillo (o 1 torre de 30 x 30 m)
  const piezas = [];
  for (const m of P.manzanas) {
    const [x, z] = T3.lw(m.c[0], m.c[1]), a = -ang; // el modelo tiene y al norte; el mundo z al sur: el ángulo cambia de signo
    const alto = m.pisos * PISO;
    const partes = m.torre ? [[0, 0, 30, 30]] : [[0, -(BD - ANILLO) / 2, BW, ANILLO], [0, (BD - ANILLO) / 2, BW, ANILLO], [-(BW - ANILLO) / 2, 0, ANILLO, BD - 2 * ANILLO], [(BW - ANILLO) / 2, 0, ANILLO, BD - 2 * ANILLO]];
    for (const [du, dv, w, d] of partes) {
      const px = x + du * Math.cos(a) - dv * Math.sin(a), pz = z + du * Math.sin(a) + dv * Math.cos(a);
      piezas.push({ x: px, z: pz, w, d, a, alto, etapa: m.etapa, mat: m.material });
    }
  }
  const mk = (mat) => { const im = new THREE.InstancedMesh(box, mat, piezas.length); im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; T3.scene.add(im); return im; };
  const IM = { ladrillo: mk(mats.ladrillo), blanco: mk(mats.blanco), obra: mk(mats.obra) };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let visible = false, ultimo = '';
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const pintar = () => {
    const años = RELOJ.sem / 52; // años transcurridos del modelo
    const clave = visible + '|' + Math.round(años * 52); if (clave === ultimo) return; ultimo = clave;
    const n = { ladrillo: 0, blanco: 0, obra: 0 };
    if (visible) for (const p of piezas) {
      const prog = Math.max(0, Math.min(1, años - (p.etapa - 1))); // 0 antes de su año, sube durante su año, 1 al terminar
      if (prog <= 0) continue;
      const k = prog < 1 ? 'obra' : p.mat, alto = Math.max(PISO, Math.ceil(prog * p.alto / PISO) * PISO);
      Q.setFromAxisAngle(Y, -p.a); V.set(p.x, y0(), p.z); S.set(p.w, alto, p.d); M.compose(V, Q, S); IM[k].setMatrixAt(n[k]++, M);
    }
    for (const k in IM) { IM[k].count = n[k]; IM[k].instanceMatrix.needsUpdate = true; IM[k].visible = visible; }
  };
  RELOJ.alDibujar(pintar);

  /* ---------- demolición y tala por etapa (solo escenario D) ----------
     Al empezar el año de una manzana (años > etapa - 1) se bajan los árboles del predio que caen dentro de ella (data3d/real3d.js: T3.trees.plan),
     las bodegas y edificios viejos que ocupa (data3d/bavaria.js: userData.demol) y las pilastras y columnas de las naves en esqueleto.
     Al escoger D (o al cambiar de escenario) el estado se pone de una vez; solo las etapas que se cruzan con el reloj corriendo se animan:
     los árboles caen y se encogen uno tras otro, los edificios bajan hasta el suelo con una nube de polvo. La animación va con RELOJ.tAnim. */
  const ETAPAS = 10, DUR_ARB = 1.8, DUR_EDIF = 2.6, RETRASO_EDIF = 0.5, VIDA_POLVO = 3.4;
  const arbPorEtapa = []; // etapa -> índices (de data3d/bavaria_arboles.json) de los árboles que se talan
  (P.arboles_quitados || []).forEach((k, i) => { if (k > 0) (arbPorEtapa[k] = arbPorEtapa[k] || []).push(i); });
  const fase = new Array(ETAPAS + 1).fill(0), t0 = new Array(ETAPAS + 1).fill(0), polvoHecho = new Array(ETAPAS + 1).fill(false), okA = new Array(ETAPAS + 1).fill(false), okE = new Array(ETAPAS + 1).fill(false); // okA/okE: árboles y edificios ya puestos (pueden cargarse después del escenario); fase: 0 en pie · 1 cayendo · 2 demolido
  let sincro = false, sucio = false, ultRep = 0, cuadro = 0;
  const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; // azar determinista
  const suave = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  // nube de polvo: puntos suaves que suben, se abren y se desvanecen (cola circular de partículas)
  const NP = 1400, pP = new Float32Array(NP * 3), pA = new Float32Array(NP), pS = new Float32Array(NP), pV = new Float32Array(NP * 3), pN = new Float32Array(NP), pT = new Float32Array(NP).fill(-1e9), pS0 = new Float32Array(NP);
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pP, 3)); gP.setAttribute('aA', new THREE.BufferAttribute(pA, 1)); gP.setAttribute('aS', new THREE.BufferAttribute(pS, 1));
  const mP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uEsc: { value: 800 } },
    vertexShader: 'attribute float aA; attribute float aS; varying float vA; uniform float uEsc; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aS * uEsc / -mv.z, 0.0, 160.0); }',
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r2 = dot(d, d) * 4.0; if (r2 > 1.0 || vA <= 0.003) discard; gl_FragColor = vec4(0.52, 0.47, 0.41, vA * exp(-r2 * 2.2)); }' });
  const polvo = new THREE.Points(gP, mP); polvo.frustumCulled = false; polvo.renderOrder = 6; polvo.visible = false; T3.scene.add(polvo);
  let kP = 0, pAct = 0;
  const soltar = (x, z, alto, n, e, rad = 0) => { for (let j = 0; j < n; j++) { const k = kP, s = hh(e * 977 + x * 0.37 + z * 0.91 + j * 13.3); kP = (kP + 1) % NP; const a = hh(s * 91 + j) * 6.283;
    const ro = Math.sqrt(hh(s * 61 + j)) * rad, ao = hh(s * 67 + j) * 6.283; // nace repartida sobre la huella del edificio
    pP[k * 3] = x + Math.cos(ao) * ro; pP[k * 3 + 1] = y0() + 1 + hh(s * 71 + j) * alto; pP[k * 3 + 2] = z + Math.sin(ao) * ro; pV[k * 3] = Math.cos(a) * (1.2 + hh(s * 17 + j) * 2.6); pV[k * 3 + 1] = 1.5 + hh(s * 29 + j) * 3.2; pV[k * 3 + 2] = Math.sin(a) * (1.2 + hh(s * 31 + j) * 2.6); pS0[k] = 6 + hh(s * 43 + j) * 8; pT[k] = 0; pN[k] = 1; } pAct = 1; };
  const moverPolvo = (dt) => {
    if (!pAct) return; let vivo = 0;
    for (let k = 0; k < NP; k++) { if (pT[k] < 0) continue; pT[k] += dt; const u = pT[k] / VIDA_POLVO; if (u >= 1) { pT[k] = -1e9; pA[k] = 0; pS[k] = 0; continue; } vivo++;
      pP[k * 3] += pV[k * 3] * dt; pP[k * 3 + 1] += pV[k * 3 + 1] * dt; pP[k * 3 + 2] += pV[k * 3 + 2] * dt; const fr = Math.exp(-0.9 * dt); pV[k * 3] *= fr; pV[k * 3 + 1] *= fr; pV[k * 3 + 2] *= fr;
      pS[k] = pS0[k] * (0.5 + 1.1 * Math.sqrt(u)); pA[k] = 0.5 * (1 - u) * Math.min(1, u * 8); }
    for (const a of ['position', 'aA', 'aS']) gP.attributes[a].needsUpdate = true; if (!vivo) { pAct = 0; polvo.visible = false; }
  };
  const ponerEscalaArb = (e, dt) => { // árboles de la etapa e: cada uno cae en su turno dentro de DUR_ARB (dt < 0: todos en pie, dt = Infinity: todos talados)
    const tr = T3.trees && T3.trees.plan; if (!tr) return false; const L = arbPorEtapa[e] || [];
    for (const i of L) tr.poner(i, dt === Infinity ? 0 : dt < 0 ? 1 : 1 - suave((dt - 0.6 * DUR_ARB * hh(i * 7.7 + e)) / (0.4 * DUR_ARB)));
    sucio = true; return true;
  };
  const ponerEscalaEdif = (e, f) => { // edificios y esqueletos de la etapa e: f = 1 en pie · 0 en el suelo
    const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; if (!dm) return false;
    for (const q of dm.edificios) if (q.etapa === e) { q.g.scale.y = Math.max(1e-3, f); q.g.visible = f > 0.004; }
    dm.ponerEsq(e, f); return true;
  };
  const emitirPolvo = (e) => {
    const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; if (!dm) return;
    for (const q of dm.edificios) if (q.etapa === e) soltar(q.cx, q.cz, Math.min(q.h, 18), Math.max(10, Math.min(60, Math.round(q.r * 1.2))), e + q.ie, q.r * 0.8);
    for (const [x, z] of (dm.puntosEsq[e] || []).slice(0, 40)) soltar(x, z, 6, 3, e, 4);
    polvo.visible = true;
  };
  const demoler = () => {
    const años = RELOJ.sem / 52, tA = RELOJ.tAnim, anima = sincro && RELOJ.corriendo && visible, ms = ++cuadro; // ms: contador de cuadros (repintar los árboles cada 6 cuadros)
    let fin = false;
    for (let e = 1; e <= ETAPAS; e++) {
      const on = visible && años > e - 1;
      if (!on) { if (fase[e] !== 0) { ponerEscalaArb(e, -1); ponerEscalaEdif(e, 1); fase[e] = 0; polvoHecho[e] = false; okA[e] = okE[e] = false; fin = true; } continue; }
      if (fase[e] === 0) { if (anima) { fase[e] = 1; t0[e] = tA; polvoHecho[e] = false; fin = true; } else { okA[e] = ponerEscalaArb(e, Infinity); okE[e] = ponerEscalaEdif(e, 0); fase[e] = 2; fin = true; } }
      if (fase[e] === 2) { if (!okA[e]) { okA[e] = ponerEscalaArb(e, Infinity); fin = fin || okA[e]; } if (!okE[e]) okE[e] = ponerEscalaEdif(e, 0); }
      if (fase[e] === 1) {
        const dt = tA - t0[e];
        ponerEscalaArb(e, dt); ponerEscalaEdif(e, 1 - suave((dt - RETRASO_EDIF) / DUR_EDIF));
        if (!polvoHecho[e] && dt >= RETRASO_EDIF) { polvoHecho[e] = true; emitirPolvo(e); }
        if (dt >= RETRASO_EDIF + DUR_EDIF && dt >= DUR_ARB || !RELOJ.corriendo) { okA[e] = ponerEscalaArb(e, Infinity); okE[e] = ponerEscalaEdif(e, 0); fase[e] = 2; fin = true; }
      }
    }
    if (pAct) { mP.uniforms.uEsc.value = T3.renderer.domElement.height / (2 * Math.tan(T3.camera.fov * Math.PI / 360)); moverPolvo(Math.min(0.1, RELOJ.dtAnim || 0)); }
    if (sucio && (fin || ms - ultRep >= 6)) { sucio = false; ultRep = ms; const tr = T3.trees && T3.trees.plan; if (tr) tr.repintar(); if (fin && T3.arbolesSplat && T3.arbolesSplat.invalidar) T3.arbolesSplat.invalidar(); }
  };
  RELOJ.alDibujar(demoler);
  const api = {
    ver(on) { visible = !!on; ultimo = ''; pintar(); sincro = false; demoler(); sincro = true; if (!visible) { polvo.visible = false; pAct = 0; pT.fill(-1e9); } }, // al escoger D (o salir) el estado se pone de golpe, sin animación
    get visible() { return visible; },
    // resumen del avance para paneles y para el modelo: viviendas terminadas, árboles quitados, personas (viviendas × personas por hogar)
    avance(años) { let viv = 0, man = 0; for (const m of P.manzanas) if (años >= m.etapa) { viv += m.viviendas; man++; }
      let arb = 0; for (let e = 0; e < P.arboles_quitados_por_etapa.length; e++) if (años >= e + 1) arb += P.arboles_quitados_por_etapa[e];
      return { viviendas: viv, manzanas: man, totalManzanas: P.manzanas.length, arboles: arb, totalViviendas: P.total_viviendas }; },
    datos: P,
    // etapas ya demolidas / talas aplicadas (pruebas): { arboles: [por etapa], edificios: [por etapa] }
    demolicion() { const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; const edif = {}, arb = {}; if (dm) for (const q of dm.edificios) (edif[q.etapa] = edif[q.etapa] || []).push(q.ie); for (const e in arbPorEtapa) arb[e] = arbPorEtapa[e].length; return { edificiosPorEtapa: edif, etapasEsqueleto: dm ? dm.etapasEsq : [], arbolesPorEtapa: arb, fase: fase.slice() }; }
  };
  window.KEN_PLANBAV = api;
  return api;
}
