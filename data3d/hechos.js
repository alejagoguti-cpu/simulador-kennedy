/* ============ HECHOS EN EL TERRITORIO: qué pasó, dónde y por qué ============
   window.KEN_HECHOS = { poner(lista, sem), limpiar(), ver(on), alClic(fn) }
   · lista: eventos del modelo con x, z (mundo), sem, titulo, texto, signo (−1 malo, +1 bueno) y, si los trae, causa y lugar.
   · Cada hecho queda CLAVADO en el mapa donde ocurrió: un aro en el piso que late al aparecer y una aguja fina; arriba una etiqueta de
     vidrio con el año, qué pasó y la causa («Por qué: …»). Los 4 más recientes muestran la etiqueta completa; los anteriores quedan
     como un punto con el año (al pasar el mouse se abre la etiqueta). Clic en la etiqueta → la cámara vuela al lugar (alClic).
   · Rojo = empeora, verde = mejora. Grupo 'hechos'. */
import { RELOJ } from './reloj.js?v=5';

const COL = { mal: 0xff5a4f, bien: 0x5fe08f };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* la causa: el campo causa del modelo o, si no viene, lo que dice el texto después de «causa:» / «por» */
function causaDe(ev) {
  if (ev.causa) return ev.causa;
  const t = String(ev.texto || ''), m = t.match(/causa(?: principal)?:\s*([^.;)]+)/i) || t.match(/\bpor (?:el|la|los|las)\s+([^.;]+)/i);
  if (m && m[1].trim().length > 2 && !/^\d/.test(m[1].trim())) return m[1].trim().slice(0, 90);
  return t.split(/[.;:]/)[0].slice(0, 90);
}

export function crearHechos({ T3 }) {
  if (window.KEN_HECHOS) return window.KEN_HECHOS;
  const THREE = T3.THREE, G = new THREE.Group(); G.name = 'hechos'; T3.scene.add(G);
  const Y = (T3.sueloY != null ? T3.sueloY : 0.3) + 1.5, ALTO = 150;
  const geoAro = new THREE.RingGeometry(26, 34, 48).rotateX(-Math.PI / 2), geoDisco = new THREE.CircleGeometry(26, 40).rotateX(-Math.PI / 2);
  const geoAguja = new THREE.CylinderGeometry(1.6, 1.6, ALTO, 6).translate(0, ALTO / 2, 0);
  const css = document.createElement('style'); css.textContent = `
  .hc-et{position:fixed;z-index:7;transform:translate(-50%,calc(-100% - 6px));max-width:250px;padding:7px 10px 8px;border-radius:12px;background:linear-gradient(180deg,rgba(40,44,52,.86),rgba(18,20,26,.92));border:1px solid rgba(255,255,255,.16);border-left:3px solid var(--c);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f2f3f5;font:500 11px/1.35 system-ui,sans-serif;cursor:pointer;display:none;box-shadow:0 6px 18px rgba(0,0,0,.35);transition:opacity .3s}
  .hc-et small{display:block;font:600 9.5px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--c);margin-bottom:2px}
  .hc-et b{display:block;font:600 12px/1.25 system-ui,sans-serif}
  .hc-et span{display:block;margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1);opacity:.85}
  .hc-et span em{font-style:normal;font-weight:600;color:var(--c)}
  .hc-et.min{padding:2px 7px;border-radius:9px;max-width:none;font:600 10px system-ui,sans-serif;border-left-width:2px}
  .hc-et.min b,.hc-et.min span{display:none} .hc-et.min small{margin:0}
  .hc-et.min:hover{padding:7px 10px 8px;max-width:250px;z-index:9} .hc-et.min:hover b,.hc-et.min:hover span{display:block}
  .hc-et.nuevo{animation:hcIn .6s ease-out} @keyframes hcIn{from{opacity:0;transform:translate(-50%,calc(-100% + 10px))}to{opacity:1}}
  @media (max-width:760px){.hc-et{max-width:170px;font-size:10px}.hc-et:not(.min) span{display:none}}`;
  document.head.appendChild(css);
  const H = new Map(); let alClic = null, visible = true, etiquetas = false; /* etiquetas apagadas: la autora no quiere burbujas */
  function crear(ev) {
    const c = ev.signo > 0 ? COL.bien : COL.mal, hex = '#' + c.toString(16).padStart(6, '0');
    const mA = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false });
    const mD = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, toneMapped: false });
    const mL = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
    const g = new THREE.Group(); g.position.set(ev.x, Y, ev.z);
    const aro = new THREE.Mesh(geoAro, mA), disco = new THREE.Mesh(geoDisco, mD), aguja = new THREE.Mesh(geoAguja, mL);
    aro.renderOrder = disco.renderOrder = 40; g.add(disco, aro, aguja); G.add(g);
    const d = document.createElement('div'); d.className = 'hc-et nuevo'; d.style.setProperty('--c', hex);
    const año = ev.sem != null ? Math.floor(ev.sem / 52) + 1 : '';
    d.innerHTML = `<small>Año ${año}${ev.lugar ? ' · ' + esc(ev.lugar) : ''}</small><b>${esc(ev.titulo)}</b><span><em>Por qué:</em> ${esc(causaDe(ev))}</span>`;
    d.onclick = () => { if (alClic) alClic(ev); };
    document.body.appendChild(d);
    return { ev, g, aro, mA, d, t0: performance.now() };
  }
  function clave(ev) { return ev.sem + '|' + ev.titulo; } /* el mismo hecho llega como aviso y en ind().hechos */
  function poner(lista) {
    for (const ev of lista || []) { if (ev == null || ev.x == null || ev.z == null || !isFinite(ev.x)) continue; const k = clave(ev); if (!H.has(k)) H.set(k, crear(ev)); }
    // los 4 más recientes con etiqueta completa; el resto en mínimo; más de 40 → se quitan los más viejos
    const arr = [...H.values()].sort((a, b) => (b.ev.sem || 0) - (a.ev.sem || 0));
    arr.forEach((h, i) => h.d.classList.toggle('min', i >= 4));
    for (const h of arr.slice(40)) quitar(h);
  }
  function quitar(h) { G.remove(h.g); h.mA.dispose(); h.d.remove(); H.delete(clave(h.ev)); }
  function limpiar() { for (const h of [...H.values()]) quitar(h); if (atr) { G.remove(atr.v); G.remove(atr.n); atr = null; } atrN = -1; }
  const v = new THREE.Vector3(); let tR = 0;
  RELOJ.alDibujar(() => {
    if (!H.size) return; const ahora = performance.now();
    for (const h of H.values()) { const e = (ahora - h.t0) / 1000, s = e < 3 ? 1 + 2.2 * (1 - e / 3) * Math.abs(Math.sin(e * 4)) : 1 + 0.12 * Math.sin(ahora / 500);
      h.aro.scale.set(s, 1, s); }
    if (ahora - tR < 60) return; tR = ahora;
    for (const h of H.values()) {
      if (!visible || !G.visible || !etiquetas) { h.d.style.display = 'none'; continue; }
      v.set(h.ev.x, Y + ALTO, h.ev.z).project(T3.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { h.d.style.display = 'none'; continue; }
      h.d.style.display = 'block'; h.d.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; h.d.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
    }
  });
  /* ATROPELLOS: cada atropello de ind().atropellos.lista es una marca roja con ✕ en el punto exacto donde la vía corta el paso de la
     fauna (tamaño fijo en pantalla); los de las últimas 26 semanas más grandes */
  let atr = null, atrN = -1; const texAtr = (() => { const s = 48, cv = document.createElement('canvas'); cv.width = cv.height = s; const g = cv.getContext('2d');
    g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, 7); g.fillStyle = '#e5383b'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(15, 15); g.lineTo(33, 33); g.moveTo(33, 15); g.lineTo(15, 33); g.stroke();
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
  function atropellos(A, sem) {
    const L = A && A.lista ? A.lista.filter(a => a.x != null) : []; const k = L.length + '|' + (L.length ? L[L.length - 1].sem : 0); if (k === atrN) return; atrN = k;
    if (atr) { G.remove(atr.v); G.remove(atr.n); atr.v.geometry.dispose(); atr.n.geometry.dispose(); atr = null; } if (!L.length) return;
    const mk = (arr, px) => { const pos = new Float32Array(arr.length * 3); arr.forEach((a, i) => { pos[i * 3] = a.x; pos[i * 3 + 1] = Y + 4; pos[i * 3 + 2] = a.z; });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const o = new THREE.Points(geo, new THREE.PointsMaterial({ size: px * Math.min(2, devicePixelRatio || 1), sizeAttenuation: false, map: texAtr, transparent: true, alphaTest: 0.3, depthTest: false, toneMapped: false })); o.renderOrder = 41; o.frustumCulled = false; G.add(o); return o; };
    const s0 = (sem || 0) - 26; atr = { v: mk(L.filter(a => a.sem < s0), 9), n: mk(L.filter(a => a.sem >= s0), 15) };
  }
  /* sin burbujas: las etiquetas no se muestran; un clic sobre un aro (a menos de 30 px en pantalla) abre su información (alClic) */
  const cvs = T3.renderer && T3.renderer.domElement; let pd = null;
  if (cvs) { cvs.addEventListener('pointerdown', e => { pd = [e.clientX, e.clientY]; });
    cvs.addEventListener('pointerup', e => { if (!pd || Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) > 5 || !G.visible || !alClic) return; let best = null, bd = 30;
      for (const h of H.values()) { v.set(h.ev.x, Y, h.ev.z).project(T3.camera); if (v.z > 1) continue; const d = Math.hypot((v.x + 1) / 2 * innerWidth - e.clientX, (1 - v.y) / 2 * innerHeight - e.clientY); if (d < bd) { bd = d; best = h; } }
      if (best) alClic(best.ev); }); }
  const api = window.KEN_HECHOS = { poner, atropellos, limpiar, ver(on) { visible = !!on; G.visible = !!on; }, alClic(fn) { alClic = fn; }, get n() { return H.size; } };
  return api;
}
