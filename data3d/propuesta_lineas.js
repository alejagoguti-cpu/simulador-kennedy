/* ============ LÍNEAS DE INTERACCIÓN DE LA FAUNA QUE TRAE LA PROPUESTA (búhos, abejas y aves del humedal de Bavaria) ============
   crearLineas({ T3, eco, fauna, hb }) → { poner(sem), apagar(), info() } — lo maneja data3d/propuesta01_3d.js.
   La fauna de la propuesta (data3d/propuesta_fauna.js y data3d/humedal_bavaria3d.js) son mallas de ambiente, no agentes de la red biótica
   (data3d/biotica.js). Para que muestren lo mismo que el resto de la fauna, aquí se dibujan líneas en arco con los MISMOS colores de los tipos
   de interacción de la red (T3.bio.TIPOS, de biotica.json) y las MISMAS relaciones (REL de biotica.js; no se inventa ninguna):
     · Búho sabanero → cuis, rata, serpiente y lagartija más cercanos: Depredación (0)  ·  búho → árboles de borde cercanos: Anidamiento de dosel (6)
     · Abejas (enjambre de una cubierta con huerta) → colibrí: Competencia por el néctar (8) · cucarachero → abeja: Depredación (0) · abejas → árboles
       de flor cercanos (sauco, chicalá, arrayán…): Visita floral y polinización (5)
     · Tingua y pato (humedal artificial) → enea o junco: Nidificación y refugio (4) · garza → rana: Depredación (0) · garza → enea: Anidamiento de dosel (6)
       · monjita → enea: Nidificación y refugio (4)
   Las aves y los animales reales que la propuesta también agrega al humedal (hábitat «Humedal de fitodepuración · Bavaria» en biotica.js) ya traen sus líneas.
   Rendimiento: una sola capa de segmentos gruesos (≤ 240 líneas) y un solo Points para los pulsos; la elección del objetivo más cercano se rehace cada 0,6 s;
   solo fuentes a < 900 m de la cámara. */
const FALLA = ['#C96349', '#84A48B', '#E69888', '#E7C878', '#F79E70', '#A386A9', '#D1A996', '#C6B3CA', '#6B9080'];
const PRESA = ['curi', 'rata', 'culebra', 'lagartija'];
export function crearLineas({ T3, eco, fauna, hb }) {
  const THREE = T3.THREE, MAXL = innerWidth < 760 ? 120 : 240, SEG = 10, R2 = 900 * 900;
  const G = new THREE.Group(); G.name = 'propuesta_lineas'; G.visible = false; T3.scene.add(G);
  let activo = false, listo = false, raf = 0, S = [], ultSel = -9, n = 0, FU = null, TE = null, PU = null, pp = null, pc = null, pt = null, col = null;
  const COLT = () => { const T = T3.bio && T3.bio.TIPOS; return (T ? T.map(t => t.c) : FALLA).map(c => new THREE.Color(c)); };
  let CT = COLT();
  const hsh = (a) => { const h = Math.sin(a * 12.9898) * 43758.5453; return h - Math.floor(h); };
  Promise.all([import('three/addons/lines/LineSegments2.js'), import('three/addons/lines/LineSegmentsGeometry.js'), import('three/addons/lines/LineMaterial.js')]).then(([{ LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }]) => {
    const g = new LineSegmentsGeometry(); g.setPositions(new Float32Array(MAXL * SEG * 6)); g.setColors(new Float32Array(MAXL * SEG * 6));
    const m = new LineMaterial({ vertexColors: true, linewidth: innerWidth < 760 ? 3 : 3.6, transparent: true, opacity: 0.55, depthWrite: false, fog: false, worldUnits: false, toneMapped: false });
    FU = new LineSegments2(g, m); FU.frustumCulled = false; FU.renderOrder = 8; G.add(FU); TE = { g, m, p: g.attributes.instanceStart.data, c: g.attributes.instanceColorStart.data };
    const resol = () => { const v = new THREE.Vector2(); T3.renderer.getSize ? T3.renderer.getSize(v) : v.set(innerWidth, innerHeight); m.resolution.copy(v); }; resol(); addEventListener('resize', resol);
    const MP = MAXL; pp = new Float32Array(MP * 3); pc = new Float32Array(MP * 4); pt = new Float32Array(MP);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3).setUsage(THREE.DynamicDrawUsage)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 4).setUsage(THREE.DynamicDrawUsage)); pg.setAttribute('tam', new THREE.BufferAttribute(pt, 1).setUsage(THREE.DynamicDrawUsage)); pg.setDrawRange(0, 0);
    PU = new THREE.Points(pg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, uniforms: { uPx: { value: Math.min(2, devicePixelRatio || 1) } },
      vertexShader: 'attribute vec4 color; attribute float tam; uniform float uPx; varying vec4 vC; void main(){ vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = tam * uPx; }',
      fragmentShader: 'varying vec4 vC; void main(){ float d = length(gl_PointCoord * 2.0 - 1.0); if (d > 1.0) discard; float a = (1.0 - smoothstep(0.82, 1.0, d)) * vC.a; vec3 c = d > 0.62 ? vec3(0.03, 0.05, 0.08) : mix(vC.rgb, vec3(1.0), smoothstep(0.35, 0.0, d) * 0.7); gl_FragColor = vec4(c * a, a); }' }));
    PU.frustumCulled = false; PU.renderOrder = 9; G.add(PU); listo = true; if (activo) arrancar();
  }).catch(e => console.warn('líneas de la propuesta (LineSegments2):', e));

  /* ---------- elección de pares (cada 0,6 s) ---------- */
  const agentes = (esps) => { const B = T3.bio; if (!B || !B.AG) return []; const out = []; for (const a of B.AG) if (a.vis && esps.includes(a.e)) out.push(a); return out; };
  const cerca = (x, z, L, rmax, get = (o) => o) => { let m = null, dm = rmax * rmax; for (const o of L) { const p = get(o), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < dm) { dm = d; m = o; } } return m; };
  function elegir() { S = []; CT = COLT(); const cp = T3.camera.position, cerca0 = (x, z) => (x - cp.x) ** 2 + (z - cp.z) ** 2 < R2;
    const A = eco && eco.arboles ? eco.arboles() : null, ARB = A ? A.bordes.concat(A.puente) : [], act = T3.bio && T3.bio.AG ? 1 : 0;
    const presas = agentes(PRESA), colib = agentes(['colibri']), cuc = agentes(['cucarachero']), ranas = agentes(['rana']);
    const arbP = (o) => ({ x: o.x, z: o.z }), pos = (o) => ({ x: o.x, z: o.z });
    const meter = (a, b, t) => { if (S.length < MAXL) S.push({ a, b, t }); };
    /* búhos */
    if (fauna && fauna.buhos) { const B = fauna.buhos(); for (const p of B) { if (!cerca0(p[0], p[2])) continue;
      const pr = cerca(p[0], p[2], presas, 260, pos); if (pr) meter(p, pr, 0);
      const ts = ARB.filter(t => (t.x - p[0]) ** 2 + (t.z - p[2]) ** 2 < 70 * 70 && Math.hypot(t.x - p[0], t.z - p[2]) > 3).sort((u, v) => Math.hypot(u.x - p[0], u.z - p[2]) - Math.hypot(v.x - p[0], v.z - p[2])).slice(0, 2);
      for (const t of ts) meter(p, [t.x, (t.y || 0) + 0.3 + t.h * 0.85, t.z], 6); } }
    /* abejas (un enjambre por cubierta con huerta y sobre el puente) */
    if (fauna && fauna.enjambres) { const C = fauna.enjambres().filter(c => cerca0(c[0], c[2])).sort((u, v) => ((u[0] - cp.x) ** 2 + (u[2] - cp.z) ** 2) - ((v[0] - cp.x) ** 2 + (v[2] - cp.z) ** 2)).slice(0, 40);
      for (const c of C) { const co = cerca(c[0], c[2], colib, 220, pos); if (co) meter(c, co, 8); const cu = cerca(c[0], c[2], cuc, 220, pos); if (cu) meter(cu, c, 0);
        const fl = cerca(c[0], c[2], ARB, 180, arbP); if (fl) meter(c, [fl.x, (fl.y || 0) + 0.3 + fl.h * 0.85, fl.z], 5); } }
    /* aves del humedal artificial de Bavaria */
    const H = hb && hb(); if (H && H.posiciones) { const P = H.posiciones(), PL = H.plantasAltas(70); if (P.length && PL.length) { const pl = PL.map(q => ({ x: q[0], y: q[1], z: q[2] }));
      P.forEach((b, i) => { if (!cerca0(b.x, b.z)) return; const sp = b.sp, ref = (x) => ({ i, sp: x });
        if (sp === 'garza' || sp === 'garzaV') { const r = cerca(b.x, b.z, ranas, 130, pos); if (r) meter({ hb: ref('g') }, r, 0); const q = cerca(b.x, b.z, pl, 45); if (q) meter({ hb: ref('g') }, [q.x, q.y, q.z], 6); }
        else if (sp === 'turrio' || sp === 'patoV' || sp === 'roja' || sp === 'moteada' || sp === 'monjita') { const q = cerca(b.x, b.z, pl, 40); if (q) meter({ hb: ref(sp) }, [q.x, q.y, q.z], 4); } }); } }
    ultSel = performance.now();
  }
  /* una fuente puede ser [x, y, z] fijo, un agente vivo ({ x, y, z }) o un ave del humedal ({ hb: { i, sp } }, se relee la posición cada cuadro) */
  const alto = (o) => (o.id !== undefined ? o.y + 0.4 : o.y);
  const XYZ = (o, P, out) => { if (Array.isArray(o)) { out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; return true; } if (o.hb) { const b = P && P[o.hb.i]; if (!b) return false; out[0] = b.x; out[1] = b.y + 0.5; out[2] = b.z; return true; } out[0] = o.x; out[1] = alto(o); out[2] = o.z; return true; };
  const A0 = [0, 0, 0], B0 = [0, 0, 0], Q = [0, 0, 0], Rr = [0, 0, 0];
  function cuadro(t) { raf = activo ? requestAnimationFrame(cuadro) : 0; if (!activo || !listo) return; const ahora = performance.now(); if (ahora - ultSel > 600) elegir();
    const H = hb && hb(), P = H && H.posiciones ? H.posiciones() : null; let k = 0, kp = 0; const Pp = TE.p.array, Cc = TE.c.array, tt = t / 1000;
    for (const s of S) { if (k >= MAXL) break; if (!XYZ(s.a, P, A0) || !XYZ(s.b, P, B0)) continue; const d = Math.hypot(B0[0] - A0[0], B0[2] - A0[2]), h = Math.min(14, 1.5 + d * 0.2), c = CT[s.t] || CT[0];
      const pa = (u, o) => { o[0] = A0[0] + (B0[0] - A0[0]) * u; o[1] = A0[1] + (B0[1] - A0[1]) * u + Math.sin(Math.PI * u) * h; o[2] = A0[2] + (B0[2] - A0[2]) * u; return o; };
      for (let g = 0; g < SEG; g++) { pa(g / SEG, Q); pa((g + 1) / SEG, Rr); const o = (k * SEG + g) * 6; Pp[o] = Q[0]; Pp[o + 1] = Q[1]; Pp[o + 2] = Q[2]; Pp[o + 3] = Rr[0]; Pp[o + 4] = Rr[1]; Pp[o + 5] = Rr[2];
        Cc[o] = Cc[o + 3] = c.r * 1.05; Cc[o + 1] = Cc[o + 4] = c.g * 1.05; Cc[o + 2] = Cc[o + 5] = c.b * 1.05; }
      const u = (tt * (0.5 + 30 / (d + 30)) * 0.5 + k * 0.137) % 1; pa(u, Q); pp[kp * 3] = Q[0]; pp[kp * 3 + 1] = Q[1]; pp[kp * 3 + 2] = Q[2]; pc[kp * 4] = c.r * 1.15; pc[kp * 4 + 1] = c.g * 1.15; pc[kp * 4 + 2] = c.b * 1.15; pc[kp * 4 + 3] = 1; pt[kp] = innerWidth < 760 ? 7 : 9; kp++; k++; }
    n = k; TE.g.instanceCount = k * SEG; TE.p.needsUpdate = true; TE.c.needsUpdate = true; const g = PU.geometry; g.setDrawRange(0, kp); g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.tam.needsUpdate = true; }
  function arrancar() { G.visible = true; if (!raf) raf = requestAnimationFrame(cuadro); }
  return {
    grupo: G,
    poner() { activo = true; ultSel = -9; if (listo) arrancar(); },
    apagar() { activo = false; G.visible = false; },
    info() { const por = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (const s of S) por[s.t]++; return { activo, listo, lineas: n, pares: S.length, porTipo: por }; }
  };
}
