/* ============ SIMULACIÓN 01 CON PROPUESTA EN 3D (pedido de la autora, docs/sim01_abastecimiento_v3.md, 2026-11-26) ============
   window.KEN_PROP01 = { poner(I), apagar() }  — lo llama sim_ui.js una vez por semana simulada (ponerCapaPar) solo en la 01 con propuesta.
   · CORABASTOS AL 50 %: se esconde el modelo 'corabastos' y quedan las 19 naves más lejanas a La Vaca (las 18 más cercanas, quitadas01 de
     abasto_capas.js, se quitan). Con la capa Bodegas prendida las naves que quedan se ven de vidrio (abasto_capas.js); con la capa apagada,
     como volúmenes grises de 9 m.
   · HUMEDAL LA VACA MÁS GRANDE: las naves quitadas a menos de 120 m de La Vaca (dh) se vuelven espejo de agua con borde de juncos, que crece del
     30 % al 100 % de su huella entre los años 1 y 5 [SUP: ritmo]. Las demás se vuelven pradera.
   · ÁRBOLES QUE CRECEN: árboles nativos con los modelos escaneados (parches_arboles.js: caucho, aliso, sauco, chicalá, arrayán y arbustos de
     flor) en la pradera liberada; cada uno se siembra entre los años 1 y 5 y crece en 5 años (edad 0 → 1) [SUP: calendario].
   · BLANCO Y NEGRO: edificios, vías y la foto satelital de Google pasan a blanco y negro; lo demás (árboles, agua, huertas, mercados, fauna,
     medidores, carros) sigue en color. Sin recompilar la malla de Google: su saturación (T3.maskU.uGrade.x) baja a 0 en toda la zona. Edificios y
     vías: una uniforme propia (uGris01) que se agrega al final del sombreador de SUS materiales (T3.matEdif, T3.matTecho, T3.suelo, T3.viasMallas),
     no de toda la escena. Al salir se devuelve todo como estaba. */
import { quitadas01 } from './abasto_capas.js?v=2';
import { crearParches3D, ESPECIES } from './parches_arboles.js?v=9';

const GR = { value: 0 };
function parchar(m) {
  if (!m || m.userData._gris01 || m.isRawShaderMaterial || m.glslVersion === '300 es') return;
  m.userData._gris01 = true; const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); sh.uniforms.uGris01 = GR; const fs = sh.fragmentShader, k = fs.lastIndexOf('}'); if (k < 0) return;
    sh.fragmentShader = 'uniform float uGris01;\n' + fs.slice(0, k) + '\n  { float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(l), uGris01); }\n' + fs.slice(k); };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + '|gris01'; };
  m.needsUpdate = true;
}
export function crearPropuesta01({ T3 }) {
  if (window.KEN_PROP01) return window.KEN_PROP01;
  const THREE = T3.THREE, lw = T3.lw, cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  const G = new THREE.Group(); G.name = 'prop01'; G.visible = false; T3.scene.add(G);
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const O = new THREE.Object3D(); let listo = false, activo = false, sem = 0, arb = null, arbP = null;
  const S = { agua: [], prado: [], quedan: [] };
  const plano = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mPrado = new THREE.InstancedMesh(plano, new THREE.MeshBasicMaterial({ color: 0x6f9a4a, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }), 40);
  const mJunco = new THREE.InstancedMesh(plano, new THREE.MeshBasicMaterial({ color: 0x5e8f3e, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }), 20);
  const mAgua = new THREE.InstancedMesh(plano, new THREE.MeshBasicMaterial({ color: 0x3f93a6, transparent: true, opacity: 0.92, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }), 20);
  const mNave = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xbfc2c4 }), 40);
  [mPrado, mJunco, mAgua].forEach((m, k) => { m.renderOrder = 3 + k; m.frustumCulled = false; m.count = 0; });
  mNave.frustumCulled = false; mNave.count = 0; G.add(mPrado, mJunco, mAgua, mNave);
  const azar = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  cargar('data3d/corabastos.json').then((D) => {
    const naves = D.naves || [], q = new Set(quitadas01(naves));
    naves.forEach((n, i) => { const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)), ux = e[0] - cx, uz = e[1] - cz, th = Math.atan2(-uz, ux);
      const N = { i, cx, cz, th, L: n.L, W: n.W, ux, uz, dh: n.dh };
      if (!q.has(i)) S.quedan.push(N); else if (n.dh < 120) S.agua.push(N); else S.prado.push(N); });
    // árboles en la pradera liberada (y alrededor del agua): rejilla con jitter, estratos al azar, determinista
    const R = azar(2611), est = [['caucho', 'aliso'], ['sauco', 'chicala', 'arrayan'], ['chilco', 'tibar', 'raque', 'mortino']], P = [];
    for (const N of [...S.prado, ...S.agua]) { const A = [], agua = S.agua.includes(N), vx = -N.uz, vz = N.ux, L2 = N.L / 2 + 8, W2 = N.W / 2 + 8;
      for (let u = -L2; u <= L2; u += 11) for (let v = -W2; v <= W2; v += 11) { if (agua && Math.abs(v) < N.W / 2 + 2 && Math.abs(u) < N.L / 2 + 2) continue; if (R() < 0.25) continue;
        const uu = u + (R() - 0.5) * 6, vv = v + (R() - 0.5) * 6, x = N.cx + uu * N.ux + vv * vx, z = N.cz + uu * N.uz + vv * vz, e2 = est[R() < 0.35 ? 0 : R() < 0.6 ? 1 : 2], sp = e2[Math.floor(R() * e2.length)];
        A.push({ x, z, sp, h: ESPECIES[sp].alto * (0.8 + R() * 0.35), rot: R() * 6.283 }); }
      if (A.length) P.push({ n: 'Corabastos liberado ' + N.i, c: [N.cx, N.cz], arboles: A }); }
    arbP = P; listo = true; if (activo) armar();
  }).catch(e => console.warn('propuesta 01:', e));
  /* una sola mancha continua (envolvente convexa de las huellas + d m), no estanques sueltos */
  const esquinas = (N, d) => { const vx = -N.uz, vz = N.ux, L2 = N.L / 2 + d, W2 = N.W / 2 + d; return [[-L2, -W2], [L2, -W2], [L2, W2], [-L2, W2]].map(([u, v]) => [N.cx + u * N.ux + v * vx, N.cz + u * N.uz + v * vz]); };
  const envolvente = (P) => { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of P.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const forma = (H, color, op, of) => { const s = new THREE.Shape(); H.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, toneMapped: false, polygonOffset: true, polygonOffsetFactor: of, side: THREE.DoubleSide })); m.renderOrder = 3 - of; m.frustumCulled = false; G.add(m); return m; };
  let fPrado = null, fAgua = null, fJunco = null, ancla = [0, 0];
  function armar() {
    const y = y0(); let k = 0;
    if (!fPrado) { fPrado = forma(envolvente([...S.prado, ...S.agua].flatMap(N => esquinas(N, 12))), 0x5f8a45, 1, -2);
      // el agua parte del borde de La Vaca (la nave más cercana al humedal) y crece hacia las naves liberadas
      const A = S.agua.slice().sort((a, b) => a.dh - b.dh); ancla = A.length ? [A[0].cx, A[0].cz] : [0, 0];
      const H = envolvente(S.agua.flatMap(N => esquinas(N, 8))).map(([x, z]) => [x - ancla[0], z - ancla[1]]);
      fJunco = forma(H.map(([x, z]) => [x * 1.06, z * 1.06]), 0x4a7a3a, 1, -3); fAgua = forma(H, 0x2f6c78, 0.82, -4); }
    mPrado.count = 0; mPrado.visible = false;
    k = 0; for (const N of S.quedan) { O.position.set(N.cx, y, N.cz); O.rotation.set(0, N.th, 0); O.scale.set(N.L, 9, N.W); O.updateMatrix(); mNave.setMatrixAt(k++, O.matrix); } mNave.count = k; mNave.instanceMatrix.needsUpdate = true;
    if (!arb && arbP && arbP.length) { arb = 'cargando'; crearParches3D({ T3, P: arbP }).then(A => { arb = A; A.grupo.name = 'prop01_arboles'; A.grupo.traverse(o => { if (o.isPoints) o.visible = false; }); /* sin las marcas redondas de parche: menos ruido */ A.ver(activo); crecer(); }).catch(e => { arb = null; console.warn('árboles propuesta 01:', e); }); }
    crecer();
  }
  /* agua: 30 % → 100 % de la huella entre los años 1 y 5; árboles: siembra entre los años 1 y 5 según su clave k, 5 años hasta adultos */
  function crecer() {
    const años = sem / 52, f = 0.3 + 0.7 * Math.max(0, Math.min(1, (años - 1) / 4)), y = y0();
    if (fPrado) { fPrado.position.y = y + 0.25; for (const m of [fJunco, fAgua]) { m.position.set(ancla[0], y + (m === fAgua ? 0.4 : 0.32), ancla[1]); m.scale.set(f, 1, f); } }
    mAgua.count = 0; mJunco.count = 0;
    if (arb && arb !== 'cargando') arb.edad((kk) => { const t = años - (1 + kk * 4); return t <= 0 ? 0 : Math.min(1, 0.15 + 0.85 * t / 5); });
  }
  /* blanco y negro de edificios, vías y foto satelital (ver encabezado) */
  let antes = null;
  function materiales() { const L = []; if (T3.matEdif) L.push(T3.matEdif); if (T3.matTecho) L.push(...Object.values(T3.matTecho)); if (T3.suelo) for (const k of ['via', 'acera', 'piso']) if (T3.suelo[k]) L.push(T3.suelo[k]);
    for (const m of T3.viasMallas || []) if (m && m.material) L.push(...(Array.isArray(m.material) ? m.material : [m.material])); L.push(mNave.material); return L.filter(m => m && m.isMaterial); }
  function gris(on) { const U = T3.maskU;
    if (on) { materiales().forEach(parchar); GR.value = 1;
      if (U && !antes) { antes = { x: U.uGrade.value.x, z: U.uGradZ ? U.uGradZ.value : null, m: U.uMonte ? U.uMonte.value : null }; U.uGrade.value.x = 0; if (U.uGradZ) U.uGradZ.value = 1e9; if (U.uMonte) U.uMonte.value = 0; } }
    else { GR.value = 0; if (U && antes) { U.uGrade.value.x = antes.x; if (U.uGradZ && antes.z != null) U.uGradZ.value = antes.z; if (U.uMonte && antes.m != null) U.uMonte.value = antes.m; antes = null; } } }
  const api = window.KEN_PROP01 = {
    grupo: G,
    poner(I) { if (!I) return api.apagar(); sem = I.sem || 0; const nuevo = !activo; activo = true; G.visible = true;
      const og = T3.scene.getObjectByName('corabastos'); if (og) og.visible = false; if (window.KEN_PCORA && window.KEN_PCORA.ver) window.KEN_PCORA.ver(false);
      mNave.visible = !(window.KEN_AB01C && window.KEN_AB01C.estado && window.KEN_AB01C.estado.bodegas);
      gris(true); if (arb && arb !== 'cargando') arb.ver(true);
      if (listo) { if (nuevo || !mPrado.count) armar(); else if (I.sem % 4 === 0) crecer(); } },
    apagar() { if (!activo) return; activo = false; G.visible = false; gris(false); if (arb && arb !== 'cargando') arb.ver(false);
      const og = T3.scene.getObjectByName('corabastos'); if (og) og.visible = true; },
    info() { return { activo, quedan: S.quedan.length, agua: S.agua.length, prado: S.prado.length, arboles: arbP ? arbP.reduce((a, p) => a + p.arboles.length, 0) : 0, gris: GR.value, tiles: T3.maskU ? T3.maskU.uGrade.value.x : null }; }
  };
  return api;
}
