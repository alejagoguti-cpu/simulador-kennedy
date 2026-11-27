/* ============ SECTOR CON DÉFICIT EN EL MAPA (pedido de la autora, 2026-11-26) — todas las simulaciones ============
   window.KEN_SECDEF = { poner(I), ir(), ver(on) }
   Cuando la cobertura de un sector baja de 80 % (el mismo límite del game over «déficit»; con 4 semanas seguidas termina la simulación), ese sector se
   resalta en el mapa: contorno coral, relleno coral suave y una etiqueta con su nombre y su %. La geometría es la del modelo: cada sector es un conjunto
   de zonas de 500 m (ZONAS_XZ de simulaciones12.js: centro de cada zona); el contorno es el borde exterior de esas zonas.
   FUENTES POR SIMULACIÓN (lo que ya calcula el modelo, sin datos nuevos):
     · 01 Abastecimiento: I.abasto.ab01.sectores (los 8 sectores de GOB_BARRIOS, con sus zonas; cob = recibido ÷ demanda).
     · 06 Gobernanza: I.gobernanza.barrios (los mismos 8 sectores; cobertura = asignado ÷ necesidad).
     · 02–05: I.sectores (una zona de 500 m es un «sector», valor = cobertura de comida en %); se resaltan las zonas bajo 80 %.
   El clic en la fila «Déficit alimentario» / «Comida en el sector peor» del panel de game over lleva la cámara al sector. */
import { RELOJ } from './reloj.js?v=5';

const LIM = 0.8, MITAD = 250, COR = 0xff6b57;

export function crearSectorDeficit({ T3, ZONAS_XZ }) {
  if (window.KEN_SECDEF) return window.KEN_SECDEF;
  const THREE = T3.THREE;
  const grupo = new THREE.Group(); grupo.name = 'sector_deficit'; grupo.visible = false; grupo.renderOrder = 3; T3.scene.add(grupo);
  const css = 'position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);padding:6px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.74),rgba(20,22,28,.86));border:1px solid rgba(255,107,87,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#f2f3f5;font:500 11.5px/1.35 Inter,system-ui,sans-serif;white-space:nowrap;display:none;font-variant-numeric:tabular-nums';
  const et = document.createElement('div'); et.id = 'secdef-et'; et.style.cssText = css; document.body.appendChild(et);
  { const st = document.createElement('style'); st.textContent = '#ab-go [data-go="def"],#sp-go [data-go="abasto"]{cursor:pointer}#ab-go [data-go="def"]:hover span,#sp-go [data-go="abasto"]:hover span{text-decoration:underline}'; document.head.appendChild(st); }
  const S = { clave: '', lista: [], mFill: null, mBorde: null, uOp: { value: 1 }, pv: new THREE.Vector3(), peor: null };
  const matF = new THREE.MeshBasicMaterial({ color: COR, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, toneMapped: false });
  const matB = new THREE.MeshBasicMaterial({ color: COR, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, toneMapped: false });
  const liberar = () => { for (const m of [S.mFill, S.mBorde]) if (m) { grupo.remove(m); m.geometry.dispose(); } S.mFill = S.mBorde = null; };
  /* arma el relleno y el contorno (cinta de 12 m) de los sectores en lista: [{ n, cob, zonas: [índices], racha }] */
  function armar(lista) {
    liberar(); const P = [], Q = [], w = 6;
    /* ZONAS_XZ y los sectores ya están en el marco de la escena (como los puntos de los indicadores de sim_ui.js): no llevan T3.lw */
    const lw = (x, z) => [x, z];
    for (const it of lista) { const aristas = new Map(), cz = it.zonas.map(z => ZONAS_XZ[z]).filter(Boolean);
      for (const [x, z] of cz) { const a = x - MITAD, b = x + MITAD, c = z - MITAD, d = z + MITAD, [ax, ac] = lw(a, c), [bx, bc] = lw(b, c), [ay, ad] = lw(a, d), [by, bd] = lw(b, d);
        P.push(ax, 0, ac, bx, 0, bc, ay, 0, ad, bx, 0, bc, by, 0, bd, ay, 0, ad);
        for (const e of [[a, c, b, c], [b, c, b, d], [a, d, b, d], [a, c, a, d]]) { const k = e.join(','); aristas.set(k, aristas.has(k) ? 0 : e); } }
      for (const e of aristas.values()) { if (!e) continue; const [p0, q0] = lw(e[0], e[1]), [p1, q1] = lw(e[2], e[3]), l = Math.hypot(p1 - p0, q1 - q0) || 1, nx = -(q1 - q0) / l * w, nz = (p1 - p0) / l * w;
        Q.push(p0 - nx, 0, q0 - nz, p1 - nx, 0, q1 - nz, p0 + nx, 0, q0 + nz, p1 - nx, 0, q1 - nz, p1 + nx, 0, q1 + nz, p0 + nx, 0, q0 + nz); } }
    const mk = (A, m, ro) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A, 3)); const mesh = new THREE.Mesh(g, m); mesh.renderOrder = ro; mesh.frustumCulled = false; grupo.add(mesh); return mesh; };
    S.mFill = mk(P, matF, 3); S.mBorde = mk(Q, matB, 4); }
  const centro = (it) => { let x = 0, z = 0, n = 0; for (const q of it.zonas) { const p = ZONAS_XZ[q]; if (p) { x += p[0]; z += p[1]; n++; } } return n ? [x / n, z / n] : [it.x || 0, it.z || 0]; };
  /* I = indicadores de la semana (un I del historial); la simulación sin sectores o sin déficit apaga el resalte */
  function poner(I) {
    let L = [];
    const a = I && I.abasto && I.abasto.ab01, g = I && I.gobernanza && I.gobernanza.barrios;
    if (a && a.sectores) { L = a.sectores.filter(s => s.cob < LIM && s.zonas).map(s => ({ n: s.n, cob: s.cob, zonas: s.zonas, racha: s === a.sectores[a.secArg] ? a.rachaDef : 0 })); }
    else if (g && I.par === 6) { L = g.filter(b => b.cobertura < LIM && b.zonas).map(b => ({ n: b.n, cob: b.cobertura, zonas: b.zonas, racha: 0 })); }
    else if (I && I.sectores && I.par >= 2 && I.par <= 5) { const rs = I.rachaSector || 0; L = I.sectores.map((s, i) => ({ n: s.n, cob: s.valor / 100, zonas: [i], racha: rs })).filter(s => s.cob < LIM && isFinite(s.cob)); }
    L.sort((p, q) => p.cob - q.cob);
    const clave = L.map(s => s.n + ':' + s.zonas.length).join('|');
    if (clave !== S.clave) { S.clave = clave; if (L.length) armar(L); else liberar(); }
    S.lista = L; S.peor = L[0] || null; S.c = S.peor ? centro(S.peor) : null; grupo.visible = L.length > 0; if (!L.length) et.style.display = 'none';
    S.txt = L.length ? (() => { const p = L[0], zs = L.length > 1 && p.zonas.length === 1 ? ` <span style="opacity:.6">(+${L.length - 1} zonas)</span>` : ''; return `<b style="color:#ff9a8a">${p.n}</b> · ${(p.cob * 100).toFixed(1).replace('.', ',')} % de su demanda${p.racha ? ` <span style="opacity:.7">· ${Math.min(4, p.racha)}/4 sem</span>` : ''}${zs}`; })() : ''; }
  RELOJ.alDibujar(() => { if (!grupo.visible || !S.peor) return;
    const y = (T3.viaY != null ? T3.viaY : (T3.sueloY != null ? T3.sueloY : 0.3) + 0.3) + 1.4; grupo.position.y = y;
    const pulso = 0.5 + 0.5 * Math.sin(performance.now() / 420); matF.opacity = 0.14 + 0.1 * pulso; matB.opacity = 0.7 + 0.25 * pulso;
    const [x, z] = S.c; S.pv.set(x, y + 60, z).project(T3.camera);
    if (S.pv.z < 1 && Math.abs(S.pv.x) < 1.05 && Math.abs(S.pv.y) < 1.05) { if (et._t !== S.txt) { et._t = S.txt; et.innerHTML = S.txt; } et.style.display = 'block'; et.style.left = ((S.pv.x + 1) / 2 * innerWidth) + 'px'; et.style.top = ((1 - S.pv.y) / 2 * innerHeight) + 'px'; } else et.style.display = 'none'; });
  function ir() { if (!S.peor) return; const [x, z] = S.c, O = window.KEN_OJO, f = O && (O.irAuto || O.ir);
    if (f) f.call(O, { x, z, titulo: '', rapido: true }); else if (T3.orbit && T3.camera) { const o = T3.orbit.target, dx = x - o.x, dz = z - o.z; o.x = x; o.z = z; T3.camera.position.x += dx; T3.camera.position.z += dz; T3.orbit.update(); } }
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#ab-go [data-go="def"], #sp-go [data-go="abasto"]')) ir(); });
  return window.KEN_SECDEF = { grupo, poner, ir, ver(on) { grupo.visible = !!on && !!S.peor; if (!on) et.style.display = 'none'; }, get activo() { return S.lista.slice(); } };
}
