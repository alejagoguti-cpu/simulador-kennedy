/* ============ VISTA LIMPIA (por defecto) ============
   Al entrar solo se ve el territorio y el panel de la izquierda reducido a: el reloj (esfera y hora), Sintaxis espacial
   (Integración · Elección · Apagar), Flujo de carros (Ver · Apagar), la foto (prender/apagar) y los ESCENARIOS (por ahora el 1).
   Todo lo demás (paneles de escenarios A·B·C, agentes, red biótica, barra de abajo, años/día, textos) se esconde.
   ?modo=completo vuelve a la interfaz de antes.

   ESCENARIO 1 · METRO LÍNEA 1: corre del año 1 al 10. El metro está en obra desde ya (data3d/metro_l1.js: viaducto levantado,
   estaciones terminadas en 2027) y opera desde marzo de 2028 = semana 114 del modelo (año 3; fecha de la Empresa Metro de Bogotá).
   Desde que opera, parte de los carros pasa al metro: el tráfico que se dibuja baja de forma gradual durante un año hasta METRO_MENOS_CARROS.
   [SUP] METRO_MENOS_CARROS = 0,10 (10 % menos carros en Kennedy): no hay cifra oficial de cuánto tráfico quita la Línea 1 (la Empresa
   Metro solo publica 171.000 t de CO2 evitadas al año en toda la ciudad, sumando carro, moto, SITP y TransMilenio). Cambiar aquí cuando
   haya una fuente. */
import { RELOJ } from './reloj.js?v=5';

export const METRO_SEM_OP = 114;          // operación comercial: 15 de marzo de 2028 (metro_l1.js)
export const METRO_MENOS_CARROS = 0.10;   // [SUP] ver arriba
const VEL_ESC = 8;                        // semanas por segundo: los 10 años en ~65 s

const OCULTAR = ['#esc', '#dock', '#esim', '#trafficHud', '#hud-c', '#c50-pill', '#ms-volver', '#ms', '#ms-intro', '#ms-cmp', '#cvMarca', '#pz-panel', '#cvAyuda', '#cvMini', '#c50-nuevo', '#c50-pan', '#c50-cmp', '#toast', '.es-et'];

export function iniciarLimpio({ T3 }) {
  const html = document.documentElement;
  html.classList.add('limpio');
  const css = document.createElement('style'); css.id = 'limpio-css';
  css.textContent = `html.limpio ${OCULTAR.join(', html.limpio ')} { display: none !important; }
    html.limpio .lp-off, html.limpio #gs-izq .lp-off, html.limpio #gs-izq button.lp-off, html.limpio #gs-izq > .lp-off { display: none !important; }
    html.limpio #gs-izq { max-height: calc(100vh - 28px); }
    #lp-esc { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
    #lp-esc button { flex: 1; }
    #lp-esc b { font: 600 15px/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .04em; min-width: 54px; text-align: right; opacity: .9; }`;
  document.head.appendChild(css);

  // el panel de la izquierda: se quitan las partes y textos que no van
  const limpiarPanel = () => {
    const g = document.getElementById('gs-izq'); if (!g) return false;
    const off = (el) => el && el.classList.add('lp-off');
    const subs = [...g.querySelectorAll(':scope > .gs-sub')];
    const tituloDe = (el) => (el.textContent || '').trim().toUpperCase();
    for (const s of subs) {
      const t = tituloDe(s);
      if (t.startsWith('ÁNGULO') || t.startsWith('FLUJO DE AGENTES')) off(s);
      else s.querySelectorAll('span').forEach(off); // subtítulos (DepthmapX, simulación SUMO…)
    }
    off(document.getElementById('gs-ang')); const rot = document.getElementById('gs-ang') && document.getElementById('gs-ang').nextElementSibling; if (rot && /⟲|＋/.test(rot.textContent)) off(rot);
    // reloj: solo la esfera y la hora
    g.querySelectorAll(':scope > h3, :scope > p').forEach(off); off(document.getElementById('gs-dia')); off(document.getElementById('gs-jor'));
    g.querySelectorAll('.gs-reloj em, .gs-reloj small').forEach(off);
    // sintaxis: solo los botones
    off(document.getElementById('gs-ley-sx')); g.querySelectorAll('.ci-sx').forEach(off);
    // flujo de agentes, ¿de dónde vienen?, agentes
    off(document.getElementById('gs-flujo')); off(document.getElementById('gs-og'));
    const ag = document.getElementById('gs-ag'); if (ag) off(ag.closest('.gs-fila'));
    // flujo de carros: solo Ver / Apagar
    off(document.getElementById('gs-dem')); const fc = document.getElementById('gs-fc'); if (fc && fc.nextElementSibling && fc.nextElementSibling.classList.contains('gs-ley')) off(fc.nextElementSibling);
    // capas: solo las fotos
    g.querySelectorAll('.ui-capas-h').forEach(off);
    g.querySelectorAll('button[id$="-btn"], #ci-open').forEach(b => { if (b.id !== 'fb-btn' && b.id !== 'fr-btn') off(b); });
    // párrafos sueltos de ayuda dentro del panel
    g.querySelectorAll(':scope > div:not([id]):not([class])').forEach(d => { if (!d.querySelector('button') && (d.textContent || '').trim().length > 30) off(d); });
    // ESCENARIOS
    if (!document.getElementById('lp-esc')) {
      const h = document.createElement('div'); h.className = 'gs-sub'; h.innerHTML = 'ESCENARIOS';
      const f = document.createElement('div'); f.id = 'lp-esc'; f.className = 'gs-fila';
      f.innerHTML = '<button type="button" data-e="1">Escenario 1</button><b id="lp-ano"></b>';
      const ancla = g.querySelector('.gs-reloj'); (ancla ? ancla.parentNode : g).insertBefore(h, ancla ? ancla.nextSibling : g.firstChild); h.after(f);
      f.querySelector('[data-e="1"]').onclick = (ev) => correrEscenario(1, ev.currentTarget);
    }
    return true;
  };
  const intentar = () => { if (!limpiarPanel()) setTimeout(intentar, 300); };
  intentar();
  // los módulos que se cargan después pueden volver a meter elementos al panel: se repasa unos segundos
  let n = 0; const rep = setInterval(() => { limpiarPanel(); if (++n > 30) clearInterval(rep); }, 1000);
  // red biótica: sin las líneas curvas de interacciones (los animales siguen)
  setInterval(() => { const bio = T3.scene.getObjectByName('biotica'); if (bio) bio.traverse(x => { if ((x.isLine || x.isLineSegments || x.type === 'LineSegments2') && x.visible) x.visible = false; }); }, 1000);

  /* ---------- escenarios ---------- */
  const ESC = window.KEN_LIMPIO = { activo: 0, factorCarros: () => factorCarros() };
  function factorCarros() { // multiplica la demanda de tráfico que se dibuja (index.html, updateTraffic)
    if (ESC.activo !== 1) return 1;
    const d = RELOJ.sem - METRO_SEM_OP; if (d < 0) return 1;
    return 1 - METRO_MENOS_CARROS * Math.min(1, d / 52);
  }
  function correrEscenario(k, btn) {
    ESC.activo = k;
    document.querySelectorAll('#lp-esc button').forEach(b => b.classList.toggle('on', b === btn));
    if (RELOJ.saltando) return;
    RELOJ.reiniciarModelo(); RELOJ.detenerSemEn = 520; RELOJ.ponerVelAños(VEL_ESC); RELOJ.pausarAños(false);
    // la cámara va a la Línea 1 del metro y la encuadra entera desde lo alto (de cerca, esa franja del sur no tiene edificios
    // propios en el modelo y la foto se ve pixelada: desde arriba se ve nítida y se lee todo el trazado)
    if (k === 1 && T3.camera && T3.orbit) {
      const M = window.KEN_METRO, V = T3.THREE.Vector3;
      let cx, cz;
      if (M && M.punto) { let sx = 0, sz = 0, n = 0; for (let f = 0.2; f <= 0.8; f += 0.1) { const q = M.punto(f * M.largo); const x = q.x != null ? q.x : q[0], z = q.z != null ? q.z : q[1]; sx += x; sz += z; n++; } cx = sx / n; cz = sz / n; }
      else { [cx, cz] = T3.lw(6325, 560); }
      T3.anim = { t: 0, dur: 3.2, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1: new V(cx - 700, 1500, cz + 1500), c1: new V(cx, 0, cz) };
    }  }
  /* trazo de la Línea 1 (solo en el escenario 1): naranja tenue mientras está en obra, amarillo encendido desde que opera */
  let trazo = null;
  const armarTrazo = () => {
    const M = window.KEN_METRO; if (trazo || !M || !M.punto) return;
    const THREE = T3.THREE, pts = [], G = (T3.sueloY != null ? T3.sueloY : 0.3) + 13;
    for (let s = 0; s <= M.largo; s += 25) { const q = M.punto(s); const x = q.x != null ? q.x : q[0], z = q.z != null ? q.z : q[1]; pts.push(new THREE.Vector3(x, G, z)); }
    if (pts.length < 2) return;
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 7, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
    trazo = new THREE.Mesh(geo, mat); trazo.renderOrder = 9; trazo.frustumCulled = false; trazo.visible = false; T3.scene.add(trazo);
  };
  const pintarTrazo = () => {
    if (!trazo) { armarTrazo(); if (!trazo) return; }
    trazo.visible = ESC.activo === 1;
    if (!trazo.visible) return;
    const opera = RELOJ.sem >= METRO_SEM_OP, m = trazo.material;
    if (opera) { m.color.setHex(0xfff04a); m.opacity = 0.95; }
    else { m.color.setHex(0xff8a1e); m.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(RELOJ.tAnim * 3)); }
  };
  RELOJ.alDibujar(pintarTrazo);
  const ano = () => { const b = document.getElementById('lp-ano'); if (b) b.textContent = ESC.activo ? 'Año ' + Math.min(10, RELOJ.año) : ''; };
  RELOJ.alDibujar(ano);
  return ESC;
}
