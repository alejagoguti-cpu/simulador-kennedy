/* ============ SIMULACIÓN 03 · CAPA DEL TERRITORIO (interrupción de la recolección) ============
   window.KEN_RES03 = { poner(r), riesgo(on), quitar() } · r = I.res03 de simulaciones12.js (data3d/res03_modelo.js). Mallas armadas una vez; con cada
   semana y cada deslizador solo cambian escalas, colores y vehículos.
   · MONTONES en cada nodo real (María Paz y El Amparo, Corabastos, los 5 barrios de las Estaciones): 7 conos irregulares por nodo; tamaño ∝ √toneladas en la
     calle [escala visual declarada]; color por horas sin tratar: ámbar #f59e0b → naranja → marrón #7c2d12 → púrpura #581c87 (48 h).
   · RIESGO SANITARIO Y LIXIVIADOS (botón): disco rojo translúcido alrededor de cada montón; radio = 60 m + 540 m × (horas sin tratar ÷ 48) [escala visual
     declarada, no un modelo de dispersión]; desaparece con 0 h.
   · CON PROPUESTA: columnas de luz cian (#06b6d4) en las 5 Estaciones y esmeralda (#10b981) en Bavaria Común, más brillantes cuanto más tratan; camiones
     reales (vehiculos.js, los de la 01) que van por las vías de cada nodo a su Estación y de las Estaciones a Bavaria; cuántos ∝ t/h movidas.
   · RÓTULOS: nombre del nodo con toneladas en la calle y horas sin tratar (o «tratado» con la propuesta). */
import { NODOS03 } from './res03_modelo.js?v=1';
const POS = { cora: [1054.7, 995.9], bavaria: [3977.7, 219.3] };
const pos = (n) => n.p ? n.p[0] : POS[n.k];

export function crearRes03({ T3, RELOJ }) {
  if (window.KEN_RES03) return window.KEN_RES03;
  const THREE = T3.THREE; let G = null, armado = null, R = null, riesgoOn = true;
  const Y = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const N = {}, VE = { VEH: null, objs: [], R: null, arbol: null, rutas: new Map(), arb: new Map(), pos: null, MAX: 90, pend: 0 };
  const C_AMB = new THREE.Color('#f59e0b'), C_NAR = new THREE.Color('#c2410c'), C_MAR = new THREE.Color('#7c2d12'), C_PUR = new THREE.Color('#581c87');
  const colorEdad = (h, out) => h < 24 ? out.copy(C_AMB).lerp(C_NAR, h / 24) : h < 36 ? out.copy(C_NAR).lerp(C_MAR, (h - 24) / 12) : out.copy(C_MAR).lerp(C_PUR, Math.min(1, (h - 36) / 12));

  function rotulo(x, z, alto) { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 136; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false }));
    sp.position.set(x, Y() + alto, z); sp.scale.set(0.22, 0.029, 1); sp.renderOrder = 31; sp.frustumCulled = false; G.add(sp); return { sp, cv, tx, txt: '' }; }
  function pintar(Rt, txt, fondo, letra = '#fff') { Rt.sp.visible = !!txt; if (!txt || Rt.txt === txt + fondo) return; Rt.txt = txt + fondo; const c = Rt.cv.getContext('2d');
    c.clearRect(0, 0, 1024, 136); c.font = '700 58px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; const w = Math.min(1000, c.measureText(txt).width + 70);
    c.fillStyle = fondo; c.beginPath(); c.roundRect((1024 - w) / 2, 20, w, 96, 48); c.fill(); c.fillStyle = letra; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 512, 70); Rt.tx.needsUpdate = true; }

  async function armar() {
    G = new THREE.Group(); G.name = 'residuos03'; T3.scene.add(G);
    const gCono = new THREE.ConeGeometry(1, 1, 9, 2).translate(0, 0.5, 0); { const p = gCono.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.02 && y < 0.98) { const k = 1 + 0.18 * Math.sin(i * 12.9898) ; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } } gCono.computeVertexNormals(); }
    const gDisco = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), gCol = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0);
    for (const n of NODOS03) { const [x, z] = pos(n), o = { n, x, z };
      if (n.t !== 'bavaria') { o.mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.95, metalness: 0 }); o.montones = [];
        for (let j = 0; j < 7; j++) { const a = j * 2.39996, d = j ? 14 + 9 * (j % 3) : 0, m = new THREE.Mesh(gCono, o.mat); m.position.set(x + Math.cos(a) * d, Y(), z + Math.sin(a) * d); m.userData.k = j ? 0.55 + 0.1 * (j % 4) : 1; m.castShadow = true; m.visible = false; G.add(m); o.montones.push(m); }
        o.halo = new THREE.Mesh(gDisco, new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
        o.halo.position.set(x, Y() + 0.6, z); o.halo.renderOrder = 3; o.halo.visible = false; G.add(o.halo); }
      if (n.t === 'estacion' || n.t === 'bavaria') { const col = n.t === 'bavaria' ? 0x10b981 : 0x06b6d4;
        o.col = new THREE.Mesh(gCol, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        o.col.position.set(x, Y(), z); o.col.scale.set(n.t === 'bavaria' ? 14 : 8, n.t === 'bavaria' ? 220 : 140, n.t === 'bavaria' ? 14 : 8); o.col.renderOrder = 12; o.col.visible = false; G.add(o.col);
        o.anillo = new THREE.Mesh(gDisco, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthWrite: false, depthTest: false, toneMapped: false }));
        o.anillo.position.set(x, Y() + 0.7, z); o.anillo.scale.setScalar(n.t === 'bavaria' ? 70 : 40); o.anillo.renderOrder = 4; o.anillo.visible = false; G.add(o.anillo); }
      o.rot = rotulo(x, z, n.t === 'bavaria' ? 250 : 170); N[n.k] = o; }
    // camiones de la propuesta: rutas reales por la red vial (las mismas herramientas de la 01)
    try { const [vm, mv] = await Promise.all([import('./viajes_mercados.js?v=11'), import('./vehiculos.js?v=10')]);
      VE.R = vm.construirRed(T3.net, T3.lw); VE.arbol = vm.arbol; VE.VEH = mv.crearVehiculos({ T3, movil: !!(T3.movil || T3.liviano), maxDist: 5000, cuantos: { carro: 2, camion: VE.MAX } }); VE.VEH.grupo.visible = false;
      VE.objs = Array.from({ length: VE.MAX }, () => ({})); VE.pos = { n: 0, x: new Float32Array(VE.MAX), z: new Float32Array(VE.MAX) };
      import('./vias_densidad.js?v=3').then(m => m.crearViasDensidad({ T3 }).extra('res03', () => (VE.VEH && VE.VEH.grupo.visible ? VE.pos : null))).catch(() => {});
    } catch (e) { console.warn('res03 camiones:', e); }
    RELOJ.alDibujar(cuadro);
  }
  function ruta(dx, dz, ox, oz) { const key = Math.round(dx) + ',' + Math.round(dz) + '>' + Math.round(ox) + ',' + Math.round(oz); if (VE.rutas.has(key)) return VE.rutas.get(key);
    const R = VE.R, nd = R.cercano(dx, dz), no = R.cercano(ox, oz); if (nd.i < 0 || no.i < 0) return null; let T = VE.arb.get(nd.i); if (!T) { if (VE.pend > 1) return null; VE.pend++; T = VE.arbol(R, nd.i); VE.arb.set(nd.i, T); }
    if (!isFinite(T.dist[no.i])) { VE.rutas.set(key, null); return null; } const P = [[R.X[no.i], R.Z[no.i]]]; let u = no.i; while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) break; u = R.ea[e] === u ? R.eb[e] : R.ea[e]; P.push([R.X[u], R.Z[u]]); }
    const S = [0]; for (let k = 1; k < P.length; k++) S.push(S[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); const r = S[S.length - 1] > 100 ? { P, S, L: S[S.length - 1] } : null; VE.rutas.set(key, r); return r; }
  const enRuta = (r, s) => { let a = 0, b = r.S.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (r.S[m] < s) a = m; else b = m; } const f = (s - r.S[a]) / Math.max(1e-6, r.S[b] - r.S[a]), ex = r.P[b][0] - r.P[a][0], ez = r.P[b][1] - r.P[a][1], l = Math.hypot(ex, ez) || 1; return [r.P[a][0] + ex * f, r.P[a][1] + ez * f, ex / l, ez / l]; };
  let viajes = [];
  function cuadro() { VE.pend = 0; if (!VE.VEH) return; const on = !!(G && G.visible && R && R.prop && viajes.length); VE.VEH.grupo.visible = on; if (!on) return;
    const t = RELOJ.tAnim || performance.now() / 1000; VE.VEH.inicio(); VE.pos.n = 0; let k = 0;
    for (const v of viajes) { const r = ruta(v.d[0], v.d[1], v.o[0], v.o[1]); if (!r) continue; for (let j = 0; j < v.n && k < VE.MAX; j++) { const s0 = ((t * 9 / r.L) + j / v.n + v.f) % 1, [x, z, fx, fz] = enRuta(r, s0 * r.L);
        VE.VEH.poner(VE.objs[k], 'camion', x - fz * 1.8, Y() + 0.02 + (T3.alzaVia ? T3.alzaVia(x, z) : 0), z + fx * 1.8, Math.atan2(fx, fz)); VE.pos.x[k] = x; VE.pos.z[k] = z; VE.pos.n++; k++; } }
    VE.VEH.fin(); }
  function aplicar() { if (!G) return; const r = R, vis = !!(r && r.fase > 0 && r.nodos); G.visible = vis; if (!vis) { viajes = []; return; }
    const dec = r.fase; // la semana siguiente lo acumulado va bajando (se recoge)
    const porK = Object.fromEntries(r.nodos.map(q => [q.k, q]));
    for (const n of NODOS03) { const o = N[n.k], q = porK[n.k]; if (!o || !q) continue; const t = q.calle * dec, h = q.edad;
      if (o.montones) { colorEdad(h, o.mat.color); const s = t > 0.5 ? Math.sqrt(t) : 0; o.montones.forEach(m => { m.visible = s > 0; const k = m.userData.k; m.scale.set((10 + 2.6 * s) * k, (6 + 1.3 * s) * k, (10 + 2.6 * s) * k); /* escala visual declarada: se lee desde la vista de pájaro */ });
        o.halo.visible = riesgoOn && h > 0.5 && t > 0.5; o.halo.scale.setScalar(60 + 540 * Math.min(1, h / 48)); o.halo.material.opacity = 0.12 + 0.18 * Math.min(1, h / 48); }
      const usado = n.t === 'estacion' ? Math.min(1, q.tratado / Math.max(1, 250 * r.cap * r.horas / 24)) : n.t === 'bavaria' ? Math.min(1, (r.nodos.reduce((a, z) => a, 0) + 0.5)) : 0;
      if (o.col) { o.col.visible = !!r.prop && r.cap > 0; o.anillo.visible = o.col.visible; o.col.material.opacity = 0.18 + 0.4 * usado; }
      const tt = Math.round(t).toLocaleString('es-CO');
      if (n.t === 'bavaria') pintar(o.rot, r.prop && r.cap > 0 ? `BAVARIA COMÚN · COMPOST ${Math.round(r.compostDia).toLocaleString('es-CO')} t/día` : '', '#047857');
      else if (t > 0.5) pintar(o.rot, `${n.n.toUpperCase()} · ${tt} t · ${Math.round(h)} h`, h >= 48 ? '#581c87' : h >= 24 ? '#c2410c' : '#b45309');
      else pintar(o.rot, r.prop && n.t === 'estacion' && r.cap > 0 ? `ESTACIÓN ${n.n.toUpperCase()} · trata ${Math.round(q.tratado / Math.max(1, r.horas / 24)).toLocaleString('es-CO')} t/día` : '', '#0e7490'); }
    // viajes: cada nodo a su estación y de las estaciones a Bavaria; camiones ∝ t/h tratadas [escala: 1 camión por 1,5 t/h, máx. 8 por viaje]
    viajes = []; if (r.prop && r.cap > 0) { const est = NODOS03.filter(n => n.t === 'estacion'), bav = pos(NODOS03.find(n => n.t === 'bavaria'));
      for (const q of r.nodos) { const n = NODOS03.find(z => z.k === q.k); if (!n || n.t === 'bavaria') continue; const th = q.tratado / Math.max(1, r.horas), o = pos(n);
        if (n.t === 'estacion') viajes.push({ o, d: bav, n: Math.max(1, Math.min(6, Math.round(th / 3))), f: 0.31 });
        else { let b = null, bd = Infinity; for (const s of est) { const d = Math.hypot(pos(s)[0] - o[0], pos(s)[1] - o[1]); if (d < bd) { bd = d; b = s; } } viajes.push({ o, d: pos(b), n: Math.max(1, Math.min(8, Math.round(th / 1.5))), f: 0.07 }); } } }
  }
  const api = {
    async poner(r) { R = r || null; if (!R || !(R.fase > 0)) { if (G) G.visible = false; viajes = []; return; } if (!armado) armado = armar(); await armado; aplicar(); },
    riesgo(on) { riesgoOn = !!on; aplicar(); return riesgoOn; },
    get riesgoOn() { return riesgoOn; },
    quitar() { R = null; if (G) G.visible = false; viajes = []; }
  };
  window.KEN_RES03 = api; return api;
}
