/* ============ BORDE RESTAURADO DEL HUMEDAL LA VACA EN CORABASTOS (con la propuesta, por fases) ============
   Corabastos reducido desmonta, una por una, las bodegas que están a menos de 120 m del humedal La Vaca (campo dh de data3d/corabastos.json),
   de la más cercana al humedal a la más lejana. CUÁNDO lo decide el modelo semanal (data3d/sim_vida.js, regla DESMONTE: la carga que ya no
   pasa por Corabastos libera espacio de bodega; 26 semanas de obra; luego el borde madura en 3 años): escenarios_sim.js llama fase(...)
   con el estado de la semana del modelo, así que el 3D va sincronizado con el reloj.
   Cada bodega desmontada: durante la obra queda la tierra; restaurada, es borde de humedal: pasto, orilla de tierra húmeda, agua somera,
   juncos (más a medida que madura) y árboles nativos de borde de agua (aliso, sauco, chicalá, arrayán, caucho sabanero y arbustos de flor),
   con los mismos modelos escaneados de los parches (data3d/parches_arboles.js), que se cargan cuando esa bodega se restaura.
   Hipótesis de diseño para discutir con el grupo. */
import { RELOJ } from './reloj.js?v=5';
export async function crearParqueCorabastos({ T3, lw, cj }) {
  const THREE = T3.THREE;
  const C = await cj('data3d/corabastos.json?v=3'); if (!C || !C.naves) return null;
  const W = (p) => lw(p[0], p[1]);
  const rect = (n, m = 0) => { const [cx, cz] = W(n.c), e = W([n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)]), ux = e[0] - cx, uz = e[1] - cz, vx = -uz, vz = ux, L2 = n.L / 2 + m, W2 = n.W / 2 + m; return [[-L2, -W2], [L2, -W2], [L2, W2], [-L2, W2]].map(([u, v]) => [cx + u * ux + v * vx, cz + u * uz + v * vz]); };
  const Q = C.naves.map((n, i) => ({ n, i })).filter(o => o.n.dh < 120).sort((a, b) => a.n.dh - b.n.dh || a.i - b.i); if (!Q.length) return null; // mismo orden que sim_vida.js
  const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const Y = (T3.viaY != null ? T3.viaY : 0.62) + 0.35; // por encima del asfalto: las calles y patios alrededor de la bodega también se vuelven borde
  const grupo = new THREE.Group(); grupo.name = 'parque_corabastos'; grupo.visible = false; T3.scene.add(grupo);
  const forma = (P, y, esc) => { const sh = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh, 2); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    const pos = g.attributes.position, uv = new Float32Array(pos.count * 2); for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / esc; uv[i * 2 + 1] = pos.getZ(i) / esc; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  let sem = 2026; const rnd = () => ((sem = Math.imul(sem ^ (sem >>> 15), 2246822519) + 0x9e3779b9 | 0) >>> 0) / 4294967296;
  /* pradera húmeda de borde de humedal: textura propia (pastos, juncos bajos y paja, manchas de suelo húmedo), con azar de semilla fija */
  const texPradera = (() => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); g.fillStyle = '#4f6b2c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) { const x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < 0.5 ? 'rgba(52,66,30,.55)' : 'rgba(104,122,52,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const C = ['#5d7c33', '#6e8a3a', '#3f5a24', '#7f9447', '#8b8a55', '#a59a62', '#4a6a2a', '#5a7430'];
    for (let i = 0; i < 9000; i++) { const x = rnd() * S, y = rnd() * S, l = 1 + rnd() * 3.5, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9; g.strokeStyle = C[Math.floor(rnd() * C.length)]; g.globalAlpha = 0.55 + rnd() * 0.45; g.lineWidth = 0.6 + rnd() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.globalAlpha = 1; const tx = new THREE.CanvasTexture(cv); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; })();
  const mPasto = new THREE.MeshStandardMaterial({ map: texPradera, roughness: 1, metalness: 0 });
  const mOrilla = new THREE.MeshStandardMaterial({ color: 0x4a3f2e, roughness: 1, metalness: 0 });
  const mObra = new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1, metalness: 0 }); // tierra removida durante la obra
  // agua somera propia y opaca (verde-azulada, refleja el cielo, oleaje suave)
  const nrm = new THREE.TextureLoader().load('data3d/waternormals.jpg'); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;
  const mAgua = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.08, metalness: 0, envMap: T3.env || null, envMapIntensity: 0.6, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: nrm, normalScale: new THREE.Vector2(0.35, 0.35) });
  RELOJ.alDibujar((info) => { if (!grupo.visible) return; const s = info.tAnim; nrm.offset.set(s * 0.012, s * 0.007); }); // tiempo de animación del reloj universal
  const mJunco = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  let PM = null; try { PM = await import('./parches_arboles.js?v=12'); } catch (e) { console.warn('borde de Corabastos (especies):', e); }
  const NJ = 900, NM = 420, PARQUES = [], ARB = [];
  for (const { n } of Q) {
    const poly = rect(n, 10), cen = poly.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
    // contorno orgánico: el rectángulo se recorre por ángulo desde el centro y se suaviza
    const radial = (k, ruido, s0) => { const N = 64, R = [];
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a); let lo = 0, hi = 400; for (let it = 0; it < 20; it++) { const m = (lo + hi) / 2; if (dentro(poly, cen[0] + dx * m, cen[1] + dz * m)) lo = m; else hi = m; } R.push(lo); }
      const S = R.map((r, i) => (R[(i + N - 2) % N] + R[(i + N - 1) % N] * 2 + r * 3 + R[(i + 1) % N] * 2 + R[(i + 2) % N]) / 9);
      return S.map((r, i) => { const a = i / N * Math.PI * 2, f = k * (1 + ruido * (Math.sin(a * 3 + s0) * 0.6 + Math.sin(a * 5 + s0 * 2.1) * 0.4)); return [cen[0] + Math.cos(a) * r * f, cen[1] + Math.sin(a) * r * f]; }); };
    const s0 = rnd() * 6, borde = radial(1, 0.03, s0), orilla = radial(0.52, 0.09, s0 + 0.4), laguna = radial(0.42, 0.09, s0 + 0.4); // agua somera en el centro, orilla fangosa y pradera húmeda
    const g = new THREE.Group(); g.visible = false; grupo.add(g);
    const obra = new THREE.Mesh(forma(borde, Y, 5), mObra); obra.receiveShadow = true; obra.renderOrder = 1; g.add(obra);
    const rest = new THREE.Group(); g.add(rest);
    const pasto = new THREE.Mesh(forma(borde, Y + 0.02, 6), mPasto); pasto.receiveShadow = true; pasto.renderOrder = 1; rest.add(pasto);
    const orillaM = new THREE.Mesh(forma(orilla, Y + 0.3, 4), mOrilla); orillaM.receiveShadow = true; orillaM.renderOrder = 2; rest.add(orillaM);
    const gA = forma(laguna, Y + 0.6, 30), nA = gA.attributes.position.count, col = new Float32Array(nA * 3); for (let i = 0; i < nA; i++) { col[i * 3] = 0.12; col[i * 3 + 1] = 0.19; col[i * 3 + 2] = 0.15; }
    gA.setAttribute('color', new THREE.BufferAttribute(col, 3)); gA.computeVertexNormals();
    const agua = new THREE.Mesh(gA, mAgua); agua.renderOrder = 3; rest.add(agua);
    // juncos en la orilla (manojos finos verdes y pajizos): se ven más a medida que el borde madura
    // juncos (Schoenoplectus) y eneas en manojos: en la orilla y dentro del agua somera, y matas de pasto alto en la pradera; más a medida que madura
    const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 1, 4, 1, true).translate(0, 0.5, 0), mJunco, NJ), O = new THREE.Object3D(), cc = new THREE.Color();
    for (let i = 0; i < NJ; i++) { const k = Math.floor(rnd() * laguna.length), a = cen, b = orilla[k], f = rnd() < 0.3 ? 0.7 + rnd() * 0.3 : 0.86 + rnd() * 0.22, cx = a[0] + (b[0] - a[0]) * f, cz = a[1] + (b[1] - a[1]) * f;
      const x = cx + (rnd() - 0.5) * 1.6, z = cz + (rnd() - 0.5) * 1.6; O.position.set(x, Y + 0.25, z); O.rotation.set((rnd() - 0.5) * 0.4, rnd() * 6.28, (rnd() - 0.5) * 0.4); O.scale.set(1, 1.1 + rnd() * 1.4, 1); O.updateMatrix(); im.setMatrixAt(i, O.matrix);
      im.setColorAt(i, cc.set([0x56752f, 0x6a8a36, 0x4c6a2a, 0xa39258, 0x7c8f3e][Math.floor(rnd() * 5)])); }
    im.receiveShadow = true; im.castShadow = true; im.count = 0; rest.add(im);
    const mm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0).scale(1, 0.6, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), NM);
    for (let i = 0, n = 0; i < 4000 && n < NM; i++) { const k = Math.floor(rnd() * borde.length), f = 0.55 + rnd() * 0.45, x = cen[0] + (borde[k][0] - cen[0]) * f + (rnd() - 0.5) * 3, z = cen[1] + (borde[k][1] - cen[1]) * f + (rnd() - 0.5) * 3;
      if (!dentro(borde, x, z) || dentro(orilla, x, z)) continue; const s = 0.6 + rnd() * 1.1; O.position.set(x, Y + 0.05, z); O.rotation.set(0, rnd() * 6.28, 0); O.scale.set(s, s * (0.8 + rnd() * 0.8), s); O.updateMatrix(); mm.setMatrixAt(n, O.matrix);
      mm.setColorAt(n, cc.set([0x5b7a32, 0x6f8b3c, 0x4e6b2b, 0x8c8a52][Math.floor(rnd() * 4)])); n++; }
    mm.receiveShadow = true; mm.castShadow = true; mm.count = 0; rest.add(mm);
    // árboles nativos de borde de agua: alisos cerca del agua, medianos y arbustos de flor en la orilla, cauchos hacia el borde
    const A = [];
    if (PM) { const libre = (x, z, d) => A.every(t => Math.hypot(t.x - x, t.z - z) > d);
      const elegir = (f) => f < 0.35 ? (rnd() < 0.75 ? 'aliso' : 'sauco') : f < 0.7 ? ['sauco', 'chicala', 'arrayan', 'aliso'][Math.floor(rnd() * 4)] : ['caucho', 'aliso', 'arrayan'][Math.floor(rnd() * 3)];
      for (let i = 0; i < 1500 && A.length < 18; i++) {
        const k = Math.floor(rnd() * borde.length), f = rnd(), a = orilla[k], b = borde[k], x = a[0] + (b[0] - a[0]) * (0.1 + f * 0.82) + (rnd() - 0.5) * 4, z = a[1] + (b[1] - a[1]) * (0.1 + f * 0.82) + (rnd() - 0.5) * 4;
        if (!dentro(borde, x, z) || dentro(orilla, x, z)) continue;
        const arb = rnd() < 0.3 && f < 0.5, sp = arb ? ['chilco', 'tibar', 'raque', 'mortino'][Math.floor(rnd() * 4)] : elegir(f), E = PM.ESPECIES[sp];
        if (!E || !libre(x, z, arb ? 2.6 : 4.5)) continue;
        A.push({ x, z, sp, h: E.alto * (0.8 + rnd() * 0.35), rot: rnd() * 6.283 }); }
      ARB.push(...A); }
    const area = Math.abs(borde.reduce((s, p, i) => { const q = borde[(i + 1) % borde.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    PARQUES.push({ borde, laguna, centro: cen, area, bodegas: 1, g, obra, rest, juncos: im, matas: mm, arboles: A, parches: null, pidiendo: false });
  }
  grupo.userData.arboles = ARB.length;
  const corab = () => T3.scene.getObjectByName('corabastos');
  let on = false, nDesm = Q.length, nRest = Q.length, mad = 1; // sin llamada del modelo: todas (comportamiento anterior con la propuesta)
  const planAbierto = () => { const p = document.getElementById('cp-pan'); return !!(p && p.classList.contains('on')); };
  /* 2026-11-27 (la autora: «en Corabastos no se entiende cuándo se abre el humedal»): en las simulaciones con propuesta el humedal La Vaca ampliado
     lo dibuja SOLO data3d/propuesta01_3d.js (naves que se quitan una a una y la malla de Google recortada). Este borde por bodegas iba con otro
     calendario (sim_vida.js) y se encimaba: mientras esa propuesta está prendida, este se apaga. */
  const prop01 = () => !!(window.KEN_PROP01 && window.KEN_PROP01.grupo && window.KEN_PROP01.grupo.visible);
  function aplicarVis() {
    if (on && prop01()) { grupo.visible = false; PARQUES.forEach(P => { if (P.parches) P.parches.ver(false); }); return; } grupo.visible = on;
    const co = corab(), bq = co && co.userData.bodegasQ;
    if (co && co.userData.quitadas) co.userData.quitadas.visible = !planAbierto(); // el plan de E3 muestra sus propias formas
    PARQUES.forEach((P, i) => { const desm = on && i < nDesm, res = on && i < nRest; if (bq && bq[i]) bq[i].visible = !desm;
      P.g.visible = desm; P.obra.visible = desm && !res; P.rest.visible = res; P.juncos.count = res ? Math.round(NJ * (0.25 + 0.75 * mad)) : 0; P.matas.count = res ? Math.round(NM * (0.3 + 0.7 * mad)) : 0;
      if (res && mad >= 0.3 && PM && P.arboles.length && !P.parches && !P.pidiendo) { P.pidiendo = true; // los árboles se plantan cuando el borde ya tiene 30 % de madurez
        PM.crearParches3D({ T3, P: [{ n: 'Borde restaurado de La Vaca', c: P.centro, arboles: P.arboles }] }).then(pa => { P.parches = pa; aplicarVis(); }).catch(e => console.warn('borde de Corabastos (árboles):', e)); }
      if (P.parches) P.parches.ver(res && mad >= 0.3); }); }
  const mayor = PARQUES.slice().sort((a, b) => b.area - a.area)[0];
  const api = {
    grupo, parques: PARQUES, laguna: mayor.laguna, centro: mayor.centro, area: Math.round(PARQUES.reduce((s, p) => s + p.area, 0)), arboles: ARB.length,
    listaArboles: ARB, // posición de cada árbol {x, z, sp, h} (data3d/indicadores.js)
    ver(v) { on = !!v; grupo.visible = on; aplicarVis(); },
    // fase del modelo semanal: bodegas desmontadas (en obra o restauradas), restauradas y madurez media del borde (0-1)
    fase(desm, rest, m) { desm = Math.max(0, Math.min(Q.length, desm | 0)); rest = Math.max(0, Math.min(desm, rest | 0)); m = Math.max(0, Math.min(1, +m || 0));
      if (desm === nDesm && rest === nRest && Math.abs(m - mad) < 0.02) return; nDesm = desm; nRest = rest; mad = m; aplicarVis(); },
    aplicarVis, get on() { return on; }, get desmontadas() { return on ? nDesm : 0; }, get restauradas() { return on ? nRest : 0; }
  };
  // la malla de Corabastos puede cargar después, y el plan E3 y el selector de escenario tocan su visibilidad: se vuelve a aplicar
  setInterval(aplicarVis, 1500);
  return api;
}
