/* ============ PICOS POR ZONA EN EL PISO (cambios del territorio, no solo de los agentes) ============
   Agujas luminosas que salen del piso en cada una de las 134 zonas de 500 m del modelo (data3d/sim_red_datos.js, las mismas de
   data3d/viajes_mercados.js) y crecen o bajan con la semana del modelo (data3d/sim_vida.js, escenario A / B / C). Nada se inventa:
   · Comida      = lo que recibe la zona / lo que necesita (o.zRec). Escala fija 0–120 %. Rojo bajo 80 % (regla de game over de abastecimiento),
                   ámbar 80–95 %, cian 95 % o más.
   · Huertas     = parte de lo que necesita la zona que sale de las huertas (o.zLoc). Escala fija 0–20 %. Verde.
   · Red         = parte que llega por la red (mercados de barrio en C, Bavaria en B) (o.zRed). Escala fija 0–60 %. Ámbar (C) / malva (B).
   Escala FIJA (no se reescala cada año) para que el cambio se vea. Las alturas se interpolan cada cuadro (animación cosmética con el
   reloj universal) y la zona late cuando cruza el umbral de 80 %. Responde al instante a play / pausa / velocidad (lee la semana actual). */
import { RELOJ } from './reloj.js?v=5';
import { ZONAS } from './sim_red_datos.js?v=2';
import { SIMST } from './sim_modelos.js?v=7';

const IND = {
  comida: { t: 'Comida que recibe cada zona', max: 1.2, val: (o, z) => o.zRec ? o.zRec[z] : null, ley: 'altura = % de lo que necesita · rojo < 80 % (game over) · ámbar 80–95 % · cian ≥ 95 %' },
  huertas: { t: 'Comida que sale de las huertas', max: 0.2, val: (o, z) => o.zLoc ? o.zLoc[z] : null, ley: 'altura = % de lo que necesita la zona que sale de las huertas (0–20 %)' },
  red: { t: 'Comida que llega por la red', max: 0.6, val: (o, z) => o.zRed ? o.zRed[z] : null, ley: 'altura = % que llega por mercados de barrio (C) o Bavaria (B) (0–60 %)' }
};
const ALTO = 200, RADIO = 7; // m: altura de un pico a escala llena; radio de la base

export function iniciarPicosZonas({ T3 }) {
  const THREE = T3.THREE, NZ = ZONAS.length;
  const geo = new THREE.CylinderGeometry(0.12, 1, 1, 6, 1, true); geo.translate(0, 0.5, 0); // aguja: base ancha, punta fina
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, NZ); mesh.frustumCulled = false; mesh.renderOrder = 14; mesh.name = 'picos_zonas';
  const gB = new THREE.CircleGeometry(1, 20); gB.rotateX(-Math.PI / 2);
  const mB = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const base = new THREE.InstancedMesh(gB, mB, NZ); base.frustumCulled = false; base.renderOrder = 13;
  T3.scene.add(mesh); T3.scene.add(base);
  const h = new Float32Array(NZ), meta = new Float32Array(NZ), pulso = new Float32Array(NZ), antes = new Int8Array(NZ).fill(-1);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color();
  let cual = 'red', on = true, tPrev = null;
  try { const g = localStorage.getItem('kr-picos2'); if (g && (g in IND || g === 'apagado')) { cual = g === 'apagado' ? 'red' : g; on = g !== 'apagado'; } } catch (e) { }

  const escAct = () => (window.KEN_ESIM && window.KEN_ESIM.esc) || (T3.escenario === 'proyecto' ? (SIMST.esc || 'C') : 'A');
  const estado = () => { const E = window.KEN_ESIM; const V = E && E.vida; return V && V.S && V.S[escAct()] ? V.S[escAct()].o : null; };
  const colorDe = (v, e) => {
    if (cual === 'comida') return v < 0.8 ? C.setRGB(1.0, 0.22, 0.18) : v < 0.95 ? C.setRGB(1.0, 0.66, 0.18) : C.setRGB(0.3, 0.9, 1.0);
    if (cual === 'huertas') return C.setRGB(0.35, 1.0, 0.45);
    return e === 'B' ? C.setRGB(0.85, 0.5, 0.8) : C.setRGB(1.0, 0.68, 0.3);
  };

  // panel pequeño (vidrio, sans): selector + leyenda
  const css = document.createElement('style'); css.textContent = `#pz{position:fixed;left:16px;bottom:16px;z-index:30;padding:10px 12px;border-radius:16px;font:400 12px/1.35 var(--ui-sans,Inter,system-ui,sans-serif);color:#e9ecee;max-width:min(380px,calc(100vw - 32px));
background:var(--ui-glass,rgba(14,16,20,.6));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:var(--ui-glass-sh,none);-webkit-backdrop-filter:var(--ui-glass-fx,blur(20px));backdrop-filter:var(--ui-glass-fx,blur(20px))}
#pz b{display:block;font-weight:600;font-size:12.5px;margin-bottom:6px}#pz .seg{display:flex;gap:4px;flex-wrap:wrap}#pz button{all:unset;cursor:pointer;padding:5px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.14);font-size:11.5px;color:#d7dde0}
#pz button.on{background:rgba(242,201,149,.18);border-color:rgba(242,201,149,.6);color:#ffe2b8}#pz p{margin:7px 0 0;color:#aab3b8;font-size:11px}
@media(max-width:700px){#pz{left:8px;right:8px;bottom:8px;max-width:none}}`;
  document.head.appendChild(css);
  const pan = document.createElement('div'); pan.id = 'pz'; pan.setAttribute('role', 'group'); pan.setAttribute('aria-label', 'Picos por zona en el mapa');
  document.body.appendChild(pan);
  // vista oblicua alta de toda Kennedy (centro de la localidad, marco mundo) para ver todos los picos
  const verTodo = () => { const cam = T3.camera, o = T3.orbit; if (!cam || !o) return; o.target.set(1846, 0, 1115); cam.position.set(1846, 4200, 7600); if (cam.far < 60000) { cam.far = 60000; cam.updateProjectionMatrix(); } o.update && o.update(); };
  const pintarPanel = () => {
    pan.innerHTML = `<b>Picos en el mapa · ${on ? IND[cual].t : 'apagados'}</b><div class="seg">${Object.keys(IND).map(k => `<button type="button" data-k="${k}" class="${on && k === cual ? 'on' : ''}">${{ comida: 'Comida', huertas: 'Huertas', red: 'Red de mercados' }[k]}</button>`).join('')}<button type="button" data-k="apagado" class="${on ? '' : 'on'}">Apagar</button><button type="button" data-vista>Ver toda Kennedy</button></div>${on ? `<p>${IND[cual].ley}</p>` : ''}`;
    pan.querySelectorAll('button').forEach(b => b.onclick = () => { if (b.hasAttribute('data-vista')) { verTodo(); return; } const k = b.dataset.k; on = k !== 'apagado'; if (on) cual = k; try { localStorage.setItem('kr-picos2', k); } catch (e) { } antes.fill(-1); pintarPanel(); });
  };
  pintarPanel();

  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  RELOJ.alDibujar(() => {
    const vis = on && T3.escenario != null; mesh.visible = base.visible = vis; pan.style.display = document.documentElement.classList.contains('ms-simple') || window.KEN_PZ_SIEMPRE ? '' : 'none';
    if (!vis) return;
    const o = estado(), e = escAct(), I = IND[cual], tA = RELOJ.tAnim != null ? RELOJ.tAnim : 0, dt = tPrev == null ? 0 : Math.max(0, Math.min(0.2, tA - tPrev)); tPrev = tA;
    for (let z = 0; z < NZ; z++) {
      const v = o ? I.val(o, z) : null; meta[z] = v == null || !isFinite(v) ? 0 : Math.max(0, Math.min(1.25, v / I.max));
      if (cual === 'comida' && v != null) { const b = v < 0.8 ? 1 : 0; if (antes[z] !== -1 && b !== antes[z]) pulso[z] = 1; antes[z] = b; }
      h[z] += (meta[z] - h[z]) * Math.min(1, dt * 4); pulso[z] = Math.max(0, pulso[z] - dt * 0.8);
      const [x, zz] = ZONAS[z], alto = Math.max(1, h[z] * ALTO), r = RADIO * (1 + pulso[z] * 1.5);
      P.set(x, y0(), zz); S.set(r, alto, r); M.compose(P, Q, S); mesh.setMatrixAt(z, M);
      colorDe(v == null ? 1 : v, e); mesh.setColorAt(z, C.multiplyScalar(0.5 + pulso[z] * 0.8));
      S.set(r * 2.6, 1, r * 2.6); M.compose(P, Q, S); base.setMatrixAt(z, M); base.setColorAt(z, C);
    }
    mesh.instanceMatrix.needsUpdate = true; base.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; if (base.instanceColor) base.instanceColor.needsUpdate = true;
  });
  window.KEN_PICOS = { poner: (k) => { if (k === 'apagado') on = false; else if (IND[k]) { on = true; cual = k; } pintarPanel(); }, get cual() { return on ? cual : 'apagado'; } };
  return window.KEN_PICOS;
}
