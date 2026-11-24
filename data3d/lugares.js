/* ============ LUGARES: dónde está cada cosa (pines de mapa con ícono y nombre) ============
   window.KEN_LUGARES = { poner({ propuesta, sem, estaciones }), ver(on) }
   · Siempre (el comercio de hoy, OpenStreetMap, data3d/tiendas.json): tiendas de barrio, supermercados y plazas de mercado; Corabastos.
   · Con la propuesta: los mercados de barrio y plazoletas de la red (sim_red_datos.js MERCADOS) aparecen cuando abren (semana «desde»),
     Bavaria Común y las Estaciones Circulares (si el modelo las da en ind().estaciones).
   Íconos de tamaño fijo en pantalla (Points con textura de ícono, una llamada por tipo); rótulo con el nombre solo para los lugares
   grandes (Corabastos, plazas, mercados de la red, Bavaria Común) y una leyenda con los conteos. Grupo 'lugares'. */
import { MERCADOS } from './sim_red_datos.js?v=2';

const TIPOS = {
  tienda: { c: '#f2c14e', i: '🛒', n: 'Tienda de barrio', px: 15 },
  super: { c: '#e8894a', i: '🏬', n: 'Supermercado', px: 17 },
  plaza: { c: '#d9534f', i: '🧺', n: 'Plaza de mercado', px: 24 },
  cora: { c: '#b02a37', i: '🏭', n: 'Corabastos', px: 34 },
  mercado: { c: '#2f7be5', i: '🥬', n: 'Mercado de la propuesta', px: 26 },
  bav: { c: '#f2c63a', i: '🏛', n: 'Bavaria Común', px: 32 },
  estacion: { c: '#2fae6b', i: '♻', n: 'Estación Circular', px: 22 }
};

function textura(THREE, t) { // círculo de color con borde blanco y el ícono adentro
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2); g.fillStyle = t.c; g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.stroke();
  g.font = '34px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.i, s / 2, s / 2 + 2);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

export async function crearLugares({ T3 }) {
  if (window.KEN_LUGARES) return window.KEN_LUGARES;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'lugares'; G.visible = false; T3.scene.add(G);
  const Y = (T3.sueloY != null ? T3.sueloY : 0.3) + 9, lw = T3.lw;
  let tiendas = []; try { tiendas = await (await fetch('data3d/tiendas.json?v=1')).json(); } catch (e) { /* sin tiendas */ }
  const capas = {};
  function capa(k, pts) { // Points de un tipo, tamaño fijo en pantalla
    const t = TIPOS[k], pos = new Float32Array(pts.length * 3); pts.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = Y + (k === 'cora' || k === 'bav' ? 30 : k === 'tienda' ? 0 : 6); pos[i * 3 + 2] = p[1]; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: t.px * Math.min(2, devicePixelRatio || 1), sizeAttenuation: false, map: textura(THREE, t), transparent: true, alphaTest: 0.2, depthTest: false, toneMapped: false });
    const o = new THREE.Points(geo, m); o.renderOrder = 30 + Object.keys(capas).length; o.frustumCulled = false; G.add(o); capas[k] = { o, n: pts.length }; return o;
  }
  const W = (x, y) => lw(x, y);
  capa('tienda', tiendas.filter(t => t.tipo === 'tienda').map(t => W(t.x, t.y)));
  capa('super', tiendas.filter(t => t.tipo === 'super').map(t => W(t.x, t.y)));
  const plazas = tiendas.filter(t => t.tipo === 'plaza'); capa('plaza', plazas.map(t => W(t.x, t.y)));
  const coraXZ = (() => { const g = T3.scene.getObjectByName('corabastos'); if (g) { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); return [c.x, c.z]; } return W(6330, 2170); })();
  capa('cora', [coraXZ]);
  capa('bav', [[3950, 180]]);
  // mercados de la propuesta: se crean todos y se muestran los abiertos (drawRange sobre la lista ordenada por «desde»)
  const merc = MERCADOS.slice().sort((a, b) => a.desde - b.desde); const om = capa('mercado', merc.map(m => [m.x, m.z]));
  let oe = null, nEst = -1;
  // rótulos (vidrio, sans-serif) de los lugares grandes
  const css = document.createElement('style'); css.textContent = `.lug-et{position:fixed;z-index:5;pointer-events:none;transform:translate(-50%,-150%);padding:3px 8px;border-radius:9px;background:rgba(20,22,28,.82);border:1px solid rgba(255,255,255,.18);color:#f2f3f5;font:600 11px/1.2 system-ui,sans-serif;white-space:nowrap;display:none}
  #lug-ley{position:fixed;left:648px;bottom:262px;z-index:41;padding:8px 10px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.78),rgba(20,22,28,.88));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);color:#eef1f4;font:500 11px/1.5 system-ui,sans-serif;display:none}
  #lug-ley b{display:block;font:600 10px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:3px} #lug-ley span{display:flex;align-items:center;gap:6px} #lug-ley i{font-style:normal;width:16px;height:16px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;border:1.5px solid #fff}
  @media (max-width:1100px){#lug-ley{display:none!important}}`; document.head.appendChild(css);
  const ets = [];
  const etq = (n, x, z, k) => { const d = document.createElement('div'); d.className = 'lug-et'; d.textContent = n; d.style.borderColor = TIPOS[k].c; document.body.appendChild(d); ets.push({ d, x, z, k }); };
  etq('Corabastos', coraXZ[0], coraXZ[1], 'cora'); etq('Bavaria Común', 3950, 180, 'bav'); plazas.forEach(p => { const [x, z] = W(p.x, p.y); etq(p.n, x, z, 'plaza'); });
  merc.forEach(m => etq(m.n, m.x, m.z, 'mercado'));
  const ley = document.createElement('div'); ley.id = 'lug-ley'; document.body.appendChild(ley);
  let est = { propuesta: false, sem: 0 }, nMerc = 0; const v = new THREE.Vector3();
  function poner(s) {
    est = s || est; const P = !!est.propuesta;
    nMerc = P ? merc.filter(m => (est.sem || 0) >= m.desde).length : 0; om.geometry.setDrawRange(0, nMerc); om.visible = nMerc > 0;
    capas.bav.o.visible = P;
    const E = P && est.estaciones ? est.estaciones.filter(e => e.tipo !== 'relleno') : [];
    if (E.length !== nEst) { nEst = E.length; if (oe) { G.remove(oe); oe.geometry.dispose(); } oe = E.length ? capa('estacion', E.map(e => [e.x, e.z])) : null; if (!E.length) delete capas.estacion; }
    const fila = (k, n) => `<span><i style="background:${TIPOS[k].c}">${TIPOS[k].i}</i>${TIPOS[k].n}${n != null ? ` · <b style="display:inline;font:600 11px system-ui;opacity:1;letter-spacing:0;text-transform:none">${n}</b>` : ''}</span>`;
    ley.innerHTML = `<b>Dónde está cada cosa</b>${fila('cora')}${fila('plaza', plazas.length)}${fila('super', capas.super.n)}${fila('tienda', capas.tienda.n)}${P ? fila('mercado', nMerc) + fila('bav') + (E.length ? fila('estacion', E.length) : '') : ''}`;
  }
  // rótulos: solo los visibles en pantalla, máximo 14, los más cercanos a la cámara
  let tR = 0; const L = [];
  function rotular() { const ahora = performance.now(); if (ahora - tR < 120) return; tR = ahora; L.length = 0;
    for (const e of ets) { e.d.style.display = 'none'; if (!G.visible) continue; if (e.k === 'mercado' && !merc.slice(0, nMerc).some(m => m.x === e.x && m.z === e.z)) continue; if (e.k === 'bav' && !est.propuesta) continue;
      v.set(e.x, Y + 40, e.z).project(T3.camera); if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) continue; const dd = T3.camera.position.distanceTo(new THREE.Vector3(e.x, 0, e.z)); L.push([dd, e, v.x, v.y]); }
    L.sort((a, b) => (a[1].k === 'cora' ? -1 : 0) - (b[1].k === 'cora' ? -1 : 0) || a[0] - b[0]);
    for (const [, e, x, y] of L.slice(0, 14)) { e.d.style.display = 'block'; e.d.style.left = ((x + 1) / 2 * innerWidth) + 'px'; e.d.style.top = ((1 - y) / 2 * innerHeight) + 'px'; } }
  (function bucle() { requestAnimationFrame(bucle); if (G.visible) rotular(); })();
  const api = window.KEN_LUGARES = { poner, ver(on) { G.visible = !!on; ley.style.display = on ? 'block' : 'none'; if (!on) ets.forEach(e => { e.d.style.display = 'none'; }); }, grupo: G };
  return api;
}
