/* ============ SIMULACIONES 04, 05 y 06 · CAPAS DEL TERRITORIO (mallas, sin nubes de puntos) ============
   window.KEN_S456 = { poner(par, d), quitar() } · d = x.s04 / x.s05 / x.s06 de simulaciones12.js (sims456_modelo.js). Las mallas se arman una vez por
   simulación; con cada semana y cada deslizador cambian escalas, colores, opacidades y cuántos objetos se ven.
   04 · rutas de vuelo entre La Vaca, El Burro, Techo y el bosque de Bavaria (parches reales): sin propuesta a ras (5 m) cruzando las vías, con propuesta
        elevadas (45 m) por el paso de fauna; aves 3D que vuelan por ellas (cuántas ∝ flujo); marcas rojas que laten donde cruzan las vías (tamaño ∝ %
        de choques); paso elevado verde (opacidad = implementación); corredores verde lima en el suelo; anillos de jardines y barreras en los humedales.
   05 · torres grises del plan parcial (≈ 110 viviendas por torre de 18–24 pisos [escala declarada]) sobre el predio real; discos de concreto donde
        cae el arbolado; con propuesta, vivienda baja en los bordes, naves reales (bavaria_pres.json) reactivadas en ámbar y azul, huertas en los
        bancales reales y el bosque con su anillo esmeralda; mancha naranja de isla de calor ∝ °C.
   06 · nodos: Alcaldía Local (aprox.), Bavaria Común y las 8 Juntas de Acción Comunal del modelo de gobernanza; arcos curvos elevados (tubos): sin
        propuesta estrella desde la Alcaldía; con propuesta red entre Juntas y Bavaria (cian y esmeralda), con pulsos que viajan (cuántos ∝ recursos ×
        participación); balizas por sector: rojo que crece con las semanas sin recursos, amarillo y verde cuando se atiende. */
export function crearS456({ T3, RELOJ }) {
  if (window.KEN_S456) return window.KEN_S456;
  const THREE = T3.THREE, lw = T3.lw, Y = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const G = new THREE.Group(); G.name = 'sims456'; T3.scene.add(G); const SUB = { 4: null, 5: null, 6: null }; let par = 0, D = null, tPrev = 0;
  const basic = (c, o = 1, ex = {}) => new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: o >= 1, toneMapped: false, ...ex });
  function rotulo(g, x, z, alto) { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 136; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }));
    sp.position.set(x, Y() + alto, z); sp.scale.set(0.2, 0.0266, 1); sp.renderOrder = 31; sp.frustumCulled = false; g.add(sp); return { sp, cv, tx, txt: '' }; }
  function pintar(R, txt, fondo, letra = '#fff') { R.sp.visible = !!txt; if (!txt || R.txt === txt + fondo) return; R.txt = txt + fondo; const c = R.cv.getContext('2d');
    c.clearRect(0, 0, 1024, 136); c.font = '700 58px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; const w = Math.min(1000, c.measureText(txt).width + 70);
    c.fillStyle = fondo; c.beginPath(); c.roundRect((1024 - w) / 2, 20, w, 96, 48); c.fill(); c.fillStyle = letra; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 512, 70); R.tx.needsUpdate = true; }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);

  /* ---------- 04 ---------- */
  async function armar04() { const g = new THREE.Group(); G.add(g);
    /* humedales delimitados (polígonos reales de data3d/water_bodies.json): borde cian y relleno suave; el borde se engrosa con el estrés de la oleada */
    const bordes = []; try { const W = await fetch('data3d/water_bodies.json').then(r => r.json()); for (const w of W.filter(x => /El Burro|La Vaca|de Techo/.test(x.nombre))) { const P = w.pts.map(p => lw(p[0], p[1]));
      const c = new THREE.CatmullRomCurve3(P.filter((_, i) => i % 3 === 0).map(p => new THREE.Vector3(p[0], Y() + 2, p[1])), true); const b = new THREE.Mesh(new THREE.TubeGeometry(c, Math.min(600, P.length), 2.5, 5, true), basic(0x22d3ee, 0.95, { depthWrite: false, depthTest: false })); b.renderOrder = 10; g.add(b);
      const sh = new THREE.Shape(P.map(p => new THREE.Vector2(p[0], -p[1]))), r = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), basic(0x06b6d4, 0.18, { depthWrite: false, depthTest: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); r.position.y = Y() + 0.9; r.renderOrder = 5; g.add(r); bordes.push({ b, r }); } } catch (e) { console.warn('humedales:', e); }
    const H = { vaca: [760, 1160], burro: [2096, -109], techo: [2997, -606], bav: [4100, 60] }, N = { vaca: 'Humedal La Vaca', burro: 'Humedal El Burro', techo: 'Humedal de Techo', bav: 'Bosque de Bavaria' };
    const pares = [['vaca', 'burro'], ['burro', 'techo'], ['techo', 'bav'], ['burro', 'bav']];
    const curvas = (alto) => pares.map(([a, b]) => { const A = H[a], B = H[b], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; return new THREE.QuadraticBezierCurve3(new THREE.Vector3(A[0], Y() + 8, A[1]), new THREE.Vector3(M[0], Y() + alto, M[1]), new THREE.Vector3(B[0], Y() + 8, B[1])); });
    const bajas = curvas(6), altas = curvas(110);
    const tubo = (c, col, r) => new THREE.Mesh(new THREE.TubeGeometry(c, 48, r, 6, false), basic(col, 0.55, { depthWrite: false }));
    const tb = bajas.map(c => tubo(c, 0xf87171, 1.6)), ta = altas.map(c => tubo(c, 0x34d399, 2.2)); [...tb, ...ta].forEach(m => { m.renderOrder = 9; g.add(m); });
    // corredores en el suelo
    const cor = pares.map(([a, b]) => { const A = H[a], B = H[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]), m = new THREE.Mesh(new THREE.PlaneGeometry(L, 1).rotateX(-Math.PI / 2), basic(0x84cc16, 0.35, { depthWrite: false, depthTest: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      m.position.set((A[0] + B[0]) / 2, Y() + 0.8, (A[1] + B[1]) / 2); m.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]); m.renderOrder = 3; g.add(m); return m; });
    // paso elevado (sobre la vía entre La Vaca y El Burro): tablero verde con árboles
    const Mp = [(H.vaca[0] + H.burro[0]) / 2, (H.vaca[1] + H.burro[1]) / 2], ang = -Math.atan2(H.burro[1] - H.vaca[1], H.burro[0] - H.vaca[0]);
    const paso = new THREE.Group(); paso.position.set(Mp[0], Y(), Mp[1]); paso.rotation.y = ang; g.add(paso);
    const mPaso = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.9, transparent: true, opacity: 1 }), mPila = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8, transparent: true });
    const tab = new THREE.Mesh(new THREE.BoxGeometry(90, 3, 50), mPaso); tab.position.y = 9; paso.add(tab);
    for (const sx of [-38, 38]) for (const sz of [-18, 18]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 3), mPila); p.position.set(sx, 4.5, sz); paso.add(p); }
    const mArb = new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 1, transparent: true, flatShading: true }), mTr = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 1, transparent: true });
    const gCopa = new THREE.IcosahedronGeometry(1, 1), gTr = new THREE.CylinderGeometry(0.5, 0.8, 1, 6).translate(0, 0.5, 0);
    for (let i = 0; i < 22; i++) { const tx = -40 + (i * 17.3) % 80, tz = -20 + (i * 11.7) % 40, h = 5 + (i % 4), r = 3.5 + (i % 3) * 1.2; const tr = new THREE.Mesh(gTr, mTr); tr.position.set(tx, 10.5, tz); tr.scale.set(1, h, 1); paso.add(tr);
      const c = new THREE.Mesh(gCopa, mArb); c.position.set(tx, 10.5 + h + r * 0.6, tz); c.scale.set(r, r * 0.85, r); paso.add(c); } /* árboles con tronco y copa (no conos) */
    // anillos de jardines y barreras
    const anillos = Object.values(H).map(([x, z]) => { const m = new THREE.Mesh(new THREE.RingGeometry(150, 175, 64).rotateX(-Math.PI / 2), basic(0x10b981, 0.45, { depthWrite: false, depthTest: false })); m.position.set(x, Y() + 0.9, z); m.renderOrder = 4; g.add(m); return m; });
    // aves: dos alas (malla instanciada)
    const gAve = new THREE.BufferGeometry(); gAve.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.2, -2.2, 0.5, -0.4, 0, 0, -0.6, 0, 0, 1.2, 0, 0, -0.6, 2.2, 0.5, -0.4], 3)); gAve.computeVertexNormals();
    const aves = new THREE.InstancedMesh(gAve, basic(0x1e3a8a, 1, { side: THREE.DoubleSide }), 160); aves.count = 0; aves.frustumCulled = false; aves.renderOrder = 11; g.add(aves);
    const marcas = pares.map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), basic(0xef4444, 0.5, { depthWrite: false, depthTest: false })); m.renderOrder = 6; g.add(m); return m; });
    marcas.forEach((m, i) => { const p = bajas[i].getPoint(0.5); m.position.set(p.x, Y() + 1.2, p.z); });
    const rot = Object.entries(H).map(([k, [x, z]]) => ({ k, R: rotulo(g, x, z, 140) }));
    return { g, bordes, tb, ta, cor, paso, mPaso, mPila, mArb, mTr, anillos, aves, marcas, rot, bajas, altas, N, pares };
  }
  function poner04(d) { const S = SUB[4]; const prop = d.prop, imp = d.impl || 0, act = d.fase > 0;
    S.tb.forEach(m => { m.visible = act || !prop; m.material.opacity = prop ? 0.2 * (1 - imp) + 0.05 : 0.6; });
    S.ta.forEach(m => { m.visible = prop && imp > 0.01; m.material.opacity = 0.25 + 0.5 * imp; });
    S.cor.forEach(m => { m.visible = prop && imp > 0.01; m.scale.z = 10 + 60 * imp; m.material.opacity = 0.2 + 0.3 * imp; });
    S.paso.visible = prop && imp > 0.01; for (const m of [S.mPaso, S.mPila, S.mArb, S.mTr]) { if (!m) continue; m.opacity = imp; m.depthWrite = imp > 0.95; }
    S.paso.scale.set(1, 0.3 + 0.7 * imp, 1);
    S.anillos.forEach(m => { m.visible = prop && d.barreras; });
    S.bordes.forEach(({ b, r }) => { const estres = act && !prop ? Math.min(1, d.p / 0.2) : 0; b.material.color.set(estres > 0.99 ? 0xef4444 : estres > 0.5 ? 0xf59e0b : 0x22d3ee); b.scale.y = 1; r.material.opacity = 0.12 + 0.18 * (prop ? imp : 1 - estres); });
    S.marcas.forEach(m => { m.visible = d.p > 0.005; m.userData.r = 40 + 600 * d.p; });
    S.nAves = Math.round(30 + 110 * (d.flujo || 0)) * (act ? 1 : 0.4) | 0; S.d = d;
    S.rot.forEach(({ k, R }) => pintar(R, `${S.N[k].toUpperCase()}${k === 'vaca' ? ` · CHOQUES ${Math.round(d.p * 100)} %` : k === 'burro' ? ` · H' ${(d.shannon || 0).toFixed(2)}` : k === 'techo' ? ` · AVES ${Math.round((d.pob || 1) * 100)} %` : ''}`, k === 'vaca' ? (d.p > 0.2 ? '#b91c1c' : d.p > 0.1 ? '#d97706' : '#059669') : '#065f46')); }
  function cuadro04(t) { const S = SUB[4], d = S.d; if (!d) return; const prop = d.prop, imp = d.impl || 0, n = S.nAves; S.aves.count = n;
    for (let i = 0; i < n; i++) { const k = i % S.pares.length, alta = prop && (i / n) < imp, C = alta ? S.altas[k] : S.bajas[k], u = ((t * 0.035 + i * 0.6180339) % 1), dir = i % 2 ? u : 1 - u;
      const p = C.getPoint(dir), p2 = C.getPoint(Math.min(1, Math.max(0, dir + (i % 2 ? 0.01 : -0.01)))); v3.set(p.x + ((i * 7) % 11 - 5) * 3, p.y + Math.sin(t * 6 + i) * 1.2, p.z + ((i * 13) % 11 - 5) * 3);
      q.setFromAxisAngle(up, Math.atan2(p2.x - p.x, p2.z - p.z)); m4.compose(v3, q, v3.clone().set(3, 3, 3)); S.aves.setMatrixAt(i, m4); }
    S.aves.instanceMatrix.needsUpdate = true; const pul = 0.75 + 0.25 * Math.sin(t * 5); S.marcas.forEach(m => { const r = (m.userData.r || 40) * pul; m.scale.set(r, 1, r); }); }

  /* ---------- 05 ---------- */
  async function armar05() { const g = new THREE.Group(); G.add(g); const PR = await fetch('data3d/bavaria_pres.json').then(r => r.json());
    const lote = PR.sitio, dentro = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [a, b] = P[i], [e, f] = P[j]; if ((b > y) !== (f > y) && x < (e - a) * (y - b) / (f - b) + a) c = !c; } return c; };
    const edif = PR.edif.map(e => e.p || e), arb = PR.arboles, cand = [], borde = [];
    const xs = lote.map(p => p[0]), ys = lote.map(p => p[1]);
    for (let x = Math.min(...xs); x < Math.max(...xs); x += 55) for (let y = Math.min(...ys); y < Math.max(...ys); y += 55) { if (!dentro(lote, x, y) || edif.some(P => dentro(P, x, y))) continue;
      let dB = 1e9; for (const t of arb) if (t[4]) { const dd = Math.hypot(t[0] - x, t[1] - y); if (dd < dB) dB = dd; } let dE = 1e9; for (let i = 0; i < lote.length; i++) { const a = lote[i], b = lote[(i + 1) % lote.length]; const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, tt = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)); dE = Math.min(dE, Math.hypot(x - a[0] - tt * dx, y - a[1] - tt * dy)); }
      cand.push({ x, y, bosque: dB < 20 }); if (dE < 70 && dB > 25) borde.push({ x, y }); }
    cand.sort((a, b) => (a.bosque - b.bosque) || (a.x - b.x)); /* primero donde no hay bosque; luego el bosque (lo que tala el plan sin blindaje) */
    const gT = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), torres = new THREE.InstancedMesh(gT, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 }), cand.length + borde.length); torres.count = 0; torres.castShadow = true; g.add(torres);
    const gD = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), tala = new THREE.InstancedMesh(gD, basic(0x6b7280, 0.85, { depthWrite: false, depthTest: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), arb.length); tala.count = 0; tala.renderOrder = 3; g.add(tala);
    const bos = arb.filter(t => t[4]), halo = new THREE.InstancedMesh(gD, basic(0x10b981, 0.22, { depthWrite: false, depthTest: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), bos.length);
    bos.forEach((t, i) => { const [x, z] = lw(t[0], t[1]); m4.makeScale(t[3] + 6, 1, t[3] + 6).setPosition(x, Y() + 0.5, z); halo.setMatrixAt(i, m4); }); halo.renderOrder = 2; g.add(halo);
    const mNave = new THREE.MeshStandardMaterial({ color: 0xe2a55b, roughness: 0.5, transparent: true, opacity: 0.85, emissive: 0x38bdf8, emissiveIntensity: 0.15 }), mRuina = basic(0x4b5563, 0.7, { depthWrite: false });
    const naves = edif.map(P => { const sh = new THREE.Shape(P.map(p => { const [x, z] = lw(p[0], p[1]); return new THREE.Vector2(x, -z); })); const ge = new THREE.ExtrudeGeometry(sh, { depth: 14, bevelEnabled: false }).rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(ge, mNave); m.position.y = Y() + 0.2; g.add(m); const h = new THREE.Mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), mRuina); h.position.y = Y() + 0.7; h.renderOrder = 3; g.add(h);
      let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } return { m, h, A: Math.abs(A / 2) }; }).sort((a, b) => b.A - a.A);
    const gB = new THREE.BoxGeometry(2.4, 0.6, 1.2), banc = new THREE.InstancedMesh(gB, new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 1 }), PR.bancales.length); PR.bancales.forEach((b, i) => { const [x, z] = lw(b[0], b[1]); m4.makeRotationY(-0.47).setPosition(x, Y() + 0.3, z); banc.setMatrixAt(i, m4); }); g.add(banc);
    const [cx, cz] = lw(PR.centro[0], PR.centro[1]); const calor = new THREE.Mesh(new THREE.CircleGeometry(620, 64).rotateX(-Math.PI / 2), basic(0xf97316, 0.2, { depthWrite: false, depthTest: false })); calor.position.set(cx, Y() + 1, cz); calor.renderOrder = 4; g.add(calor);
    const R1 = rotulo(g, cx, cz, 230), R2 = rotulo(g, cx + 1, cz + 1, 170);
    return { g, cand: cand.map(c => ({ ...c, w: lw(c.x, c.y) })), borde: borde.map(c => lw(c.x, c.y)), torres, tala, halo, naves, banc, calor, arb: arb.map(t => ({ w: lw(t[0], t[1]), bos: !!t[4] })), R1, R2 }; }
  function poner05(d) { const S = SUB[5]; const prop = d.prop; let n = 0;
    if (!prop) { const nt = Math.round(d.viv / 110), lista = S.cand.filter(c => d.blindaje ? !c.bosque : true); for (let i = 0; i < Math.min(nt, lista.length); i++) { const c = lista[i], h = 54 + 18 * ((i * 7) % 3); m4.makeScale(22, h, 22).setPosition(c.w[0], Y(), c.w[1]); S.torres.setMatrixAt(n++, m4); } }
    else { const nt = Math.round(d.viv / 30); for (let i = 0; i < Math.min(nt, S.borde.length); i++) { const c = S.borde[i]; m4.makeScale(26, 15, 18).setPosition(c[0], Y(), c[1]); S.torres.setMatrixAt(n++, m4); } }
    S.torres.count = n; S.torres.instanceMatrix.needsUpdate = true;
    // tala: los árboles más cercanos a las torres hasta el número del modelo
    let k = 0; if (!prop && d.arbPerdidos > 0) { const lista = S.arb.filter(a => d.blindaje ? !a.bos : true); const step = Math.max(1, Math.floor(lista.length / Math.max(1, d.arbPerdidos))); for (let i = 0; i < lista.length && k < d.arbPerdidos; i += step) { const a = lista[i]; m4.makeScale(5, 1, 5).setPosition(a.w[0], Y() + 0.6, a.w[1]); S.tala.setMatrixAt(k++, m4); } }
    S.tala.count = k; S.tala.instanceMatrix.needsUpdate = true;
    S.halo.visible = prop || d.blindaje; const nn = Math.round(S.naves.length * (prop ? d.reuso : 0)); S.naves.forEach((o, i) => { o.m.visible = i < nn; o.h.visible = !o.m.visible && !prop ? true : !o.m.visible; });
    S.banc.visible = prop; S.calor.material.opacity = Math.min(0.55, 0.08 + 0.22 * d.calor); S.calor.material.color.set(d.calor > 1 ? 0xef4444 : 0xf97316);
    pintar(S.R1, `BOSQUE ${Math.round(d.ecoRest * 100)} % · SUELO PRODUCTIVO ${d.sueloProd.toFixed(1)} ha`, d.ecoRest < 0.8 || d.sueloProd < 12 ? '#b91c1c' : '#047857');
    pintar(S.R2, prop ? `NAVES REUTILIZADAS ${Math.round(d.naves).toLocaleString('es-CO')} m² · +${d.calor.toFixed(1)} °C` : `${d.viv.toLocaleString('es-CO')} VIVIENDAS · +${d.calor.toFixed(1)} °C`, prop ? '#0e7490' : '#475569'); }

  /* ---------- 06 ---------- */
  function armar06(d) { const g = new THREE.Group(); G.add(g);
    const ALC = [1461, 1238], BAV = [3977.7, 219.3], J = d.barrios.map(b => [b.jx, b.jz]);
    const arco = (A, B, h) => { const M = new THREE.Vector3((A[0] + B[0]) / 2, Y() + h, (A[1] + B[1]) / 2); return new THREE.QuadraticBezierCurve3(new THREE.Vector3(A[0], Y() + 30, A[1]), M, new THREE.Vector3(B[0], Y() + 30, B[1])); };
    const estrella = J.map(p => arco(ALC, p, 180)), red = []; for (let i = 0; i < J.length; i++) { red.push(arco(J[i], BAV, 220)); red.push(arco(J[i], J[(i + 1) % J.length], 120)); }
    const tubos = (L, col, r) => L.map(c => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 6, false), basic(col, 0.7, { depthWrite: false })); m.renderOrder = 9; g.add(m); return m; });
    const tE = tubos(estrella, 0x64748b, 7), tR = tubos(red, 0x38bdf8, 8); tR.forEach((m, i) => { if (i % 2) m.material.color.set(0x34d399); });
    const nodo = (p, col, r, h) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 })); m.position.set(p[0], Y() + h / 2, p[1]); g.add(m); return m; };
    const nA = nodo(ALC, 0x94a3b8, 40, 30), nB = nodo(BAV, 0x10b981, 50, 30);
    const gBal = new THREE.CylinderGeometry(1, 1, 1, 20).translate(0, 0.5, 0), bal = J.map(p => { const m = new THREE.Mesh(gBal, new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })); m.position.set(p[0], Y(), p[1]); g.add(m); return m; });
    const pul = new THREE.InstancedMesh(new THREE.SphereGeometry(16, 12, 8), basic(0xe0f2fe), 200); pul.count = 0; pul.frustumCulled = false; pul.renderOrder = 12; g.add(pul);
    const rot = d.barrios.map((b, i) => rotulo(g, J[i][0], J[i][1], 260)), rA = rotulo(g, ALC[0], ALC[1], 120), rB = rotulo(g, BAV[0], BAV[1], 120);
    pintar(rA, 'ALCALDÍA LOCAL DE KENNEDY', '#334155'); pintar(rB, 'BAVARIA COMÚN · PARLAMENTO CÍVICO', '#047857');
    return { g, tE, tR, estrella, red, bal, pul, rot, nA, nB }; }
  function poner06(d) { const S = SUB[6]; const prop = d.prop, part = d.part || 0, pres = d.pres || 0.5;
    S.tE.forEach(m => { m.visible = !prop || part < 0.99; m.material.opacity = (prop ? 0.25 * (1 - part) : 0.75) * (0.4 + 0.6 * pres); m.material.color.set(prop ? 0x64748b : 0x475569); });
    S.tR.forEach((m, i) => { m.visible = prop && part > 0.01; m.material.opacity = (0.25 + 0.65 * part) * (0.35 + 0.65 * pres) * (d.prio && i % 2 === 0 && d.prio === 1 ? 1.3 : 1); });
    d.barrios.forEach((b, i) => { const m = S.bal[i], urg = b.urg || 0, c = b.cov; m.scale.set(30 + 6 * urg, 40 + 70 * urg + (c < 0.5 ? 60 : 0), 30 + 6 * urg); m.material.color.set(urg > 0 || c < 0.5 ? (urg >= 4 ? 0xdc2626 : 0xf59e0b) : 0x22c55e); m.material.emissive.copy(m.material.color);
      pintar(S.rot[i], `${b.n.replace('Sector ', '').toUpperCase()} · ${Math.round(c * 100)} %${urg ? ` · ${urg} SEM SIN RECURSOS` : ''}`, urg >= 4 ? '#b91c1c' : urg > 0 || c < 0.5 ? '#b45309' : '#15803d'); });
    S.nPul = Math.round((prop ? 120 * part : 24) * pres); S.curvas = prop && part > 0.01 ? S.red : S.estrella; S.vel = prop ? 0.12 + 0.2 * part : 0.03; }
  function cuadro06(t) { const S = SUB[6]; if (!S.curvas) return; const n = Math.min(200, S.nPul || 0), C = S.curvas; S.pul.count = n;
    for (let i = 0; i < n; i++) { const c = C[i % C.length], u = (t * S.vel + i * 0.37) % 1, p = c.getPoint(u); m4.makeTranslation(p.x, p.y, p.z); S.pul.setMatrixAt(i, m4); } S.pul.instanceMatrix.needsUpdate = true; }

  RELOJ.alDibujar(() => { if (!G.visible || !par) return; const t = performance.now() / 1000; if (par === 4 && SUB[4]) cuadro04(t); if (par === 6 && SUB[6]) cuadro06(t); });
  let armando = {};
  const api = {
    async poner(p, d) { par = p; if (!d) { G.visible = false; return; } G.visible = true;
      for (const k of [4, 5, 6]) if (SUB[k]) SUB[k].g.visible = k === p;
      if (!SUB[p]) { if (!armando[p]) armando[p] = (async () => { SUB[p] = p === 4 ? await armar04() : p === 5 ? await armar05() : armar06(d); })(); await armando[p]; for (const k of [4, 5, 6]) if (SUB[k]) SUB[k].g.visible = k === par; }
      if (par !== p) return; if (p === 4) poner04(d); else if (p === 5) poner05(d); else poner06(d); },
    quitar() { par = 0; G.visible = false; }
  };
  window.KEN_S456 = api; return api;
}
