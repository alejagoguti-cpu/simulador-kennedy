/* ============ INTERFAZ DE LAS 12 SIMULACIONES (vista limpia) ============
   Corre el modelo semanal de data3d/simulaciones12.js al mismo paso que la barra de años (RELOJ.sem) y muestra:
   · panel de la derecha (vidrio): variables (sliders) de la simulación, indicadores en vivo con su gráfica, picos en el piso y foco;
   · GAME OVER: la pantalla se pone roja y titila con la regla que se cumplió, y luego sale el informe;
   · informe final (al año 10 o en el game over): veredicto, tabla inicio → final, gráficas, especies que desaparecieron y por qué,
     comparación con «Hoy» (simulación 1, misma semilla) e imprimir/guardar en PDF.
   Todo lo que se muestra sale del modelo (simulaciones.js); aquí no se calcula ningún dato. (ind().sem va de 1 a 520) */
import { RELOJ } from './reloj.js?v=5';

const SEMILLA = 1, FIN = 520;
const IND = [ // resultados en vivo: clave en ind(), nombre, formato, mejor si sube (true) o baja (false)
  { k: 'fauna', n: 'Especies de fauna', f: (v, I) => `${v} de ${I.fauna0}`, sube: true },
  { k: 'red', n: 'Interacciones entre especies', f: (v) => fmt(v), sube: true, ayuda: 'relaciones de la red biótica que ocurren en cada lugar' },
  { k: 'poliniz', n: 'Polinizadores', f: (v) => fmt(v), sube: true, ayuda: 'lugares con abejas, colibríes y otros polinizadores' },
  { k: 'huertas', n: 'Huertas activas', f: (v) => fmt(v), sube: true },
  { k: 'pares', n: 'Territorio con fauna', f: (v) => fmt(v), sube: true, ayuda: 'pares especie × lugar ocupados' },
  { k: 'trafico', n: 'Tráfico', f: (v) => (v * 100).toFixed(0) + ' %', sube: false, ayuda: '100 % = hoy' },
  { k: 'ruidoDb', n: 'Ruido promedio', f: (v) => v == null ? '—' : v.toFixed(1) + ' dB', sube: false },
  { k: 'atropellos', n: 'Fauna atropellada', f: (v) => v == null ? '—' : fmt(v), sube: false, ayuda: 'índice por semana' },
  { k: 'comidaMin', n: 'Comida en la zona peor', f: (v) => (v * 100).toFixed(0) + ' %', sube: true },
  { k: 'residuos', n: 'Residuos sin tratar', f: (v) => (v * 100).toFixed(0) + ' %', sube: false, ayuda: '% del almacenamiento' }
];
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('es-CO');

export async function iniciarSimUI({ T3, SIMS_UI }) {
  let M = null; // módulo del modelo
  try { M = await import('./simulaciones12.js?v=2'); if (M.cargarDatos) await M.cargarDatos(); }
  catch (e) { console.warn('simulaciones (modelo):', e); M = null; }

  /* ---------- estilos (vidrio, como los paneles del simulador) ---------- */
  const st = document.createElement('style'); st.id = 'simui-css';
  st.textContent = `
  .su-glass { background: linear-gradient(180deg, rgba(40,44,52,.62), rgba(20,22,28,.74)); border: 1px solid rgba(255,255,255,.14); border-radius: 16px;
    backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 10px 30px rgba(0,0,0,.35); color: #eef1f4; font-family: Geist, system-ui, sans-serif; }
  #su-der { position: fixed; right: 16px; top: 16px; width: 300px; max-height: calc(100vh - 200px); overflow-y: auto; z-index: 39; padding: 12px 14px; display: none; }
  #su-der.on { display: block; }
  #su-der h4 { margin: 10px 0 6px; font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; opacity: .6; }
  #su-der .pre { margin: 0 0 4px; font: 500 12px/1.35 system-ui, sans-serif; opacity: .8; }
  .su-sl { margin: 8px 0 10px; }
  .su-sl label { display: flex; justify-content: space-between; font: 500 12px system-ui, sans-serif; margin-bottom: 4px; }
  .su-sl label b { font-weight: 600; color: #ffcf7a; }
  .su-sl input[type=range] { width: 100%; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 3px; background: linear-gradient(90deg, #ffb347 var(--p,50%), rgba(255,255,255,.18) var(--p,50%)); outline: none; }
  .su-sl input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 3px solid #ffb347; box-shadow: 0 2px 6px rgba(0,0,0,.4); cursor: pointer; }
  .su-sl input[type=range]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 3px solid #ffb347; cursor: pointer; }
  .su-ind { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.07); }
  .su-ind span { font: 500 12px system-ui, sans-serif; opacity: .85; }
  .su-ind b { font: 600 15px 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .02em; text-align: right; }
  .su-ind b.bien { color: #8ee6a8; } .su-ind b.mal { color: #ff8a80; }
  .su-ind svg { grid-column: 1 / 3; width: 100%; height: 22px; }
  .su-picos { display: grid; gap: 4px; } .su-picos button { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 6px 8px 6px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.04); color: inherit; font: 500 12px system-ui, sans-serif; cursor: pointer; overflow: hidden; }
  .su-picos button.on { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.55); } .su-picos i { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; } .su-picos b { font: 600 11px 'JetBrains Mono', ui-monospace, monospace; min-width: 30px; }
  .su-que { margin: 9px 0 2px; font: 400 12px/1.4 system-ui, sans-serif; opacity: .9; } .su-que b { font-weight: 600; } .su-que span { opacity: .6; font-size: 11px; }
  .su-alto { display: flex; align-items: center; gap: 10px; margin-top: 8px; font: 500 11px system-ui, sans-serif; opacity: .85; } .su-alto input { flex: 1; accent-color: #ffcf7a; }
  .su-rampa { height: 8px; border-radius: 3px; margin-top: 8px; } .su-rampa-t { display: flex; justify-content: space-between; font: 500 10px system-ui, sans-serif; opacity: .6; margin-top: 2px; }
  .su-seg { display: flex; gap: 6px; flex-wrap: wrap; } .su-seg button { flex: 1; min-width: 70px; padding: 6px 4px; border-radius: 9px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.07); color: inherit; font: 500 12px system-ui, sans-serif; cursor: pointer; }
  .su-seg button.on { background: rgba(255,176,70,.88); color: #1b1206; border-color: transparent; }
  /* GAME OVER */
  #su-go { position: fixed; inset: 0; z-index: 70; pointer-events: none; display: none; align-items: center; justify-content: center; flex-direction: column; text-align: center; }
  #su-go.on { display: flex; animation: suRojo 0.9s ease-in-out infinite alternate; }
  @keyframes suRojo { from { background: rgba(200,20,20,.18); } to { background: rgba(200,20,20,.42); } }
  #su-go h1 { margin: 0; font: 800 clamp(54px, 10vw, 132px)/0.95 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .04em; color: #fff; text-shadow: 0 0 30px rgba(255,40,40,.9), 0 4px 0 rgba(0,0,0,.25); animation: suTit 0.5s steps(2) infinite; }
  @keyframes suTit { 50% { opacity: .55; } }
  #su-go p { margin: 14px 0 0; padding: 10px 18px; border-radius: 12px; background: rgba(20,10,10,.6); font: 600 clamp(14px, 1.6vw, 19px)/1.35 system-ui, sans-serif; color: #ffe2df; max-width: 80vw; }
  /* INFORME */
  #su-inf { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center; background: rgba(6,8,12,.55); }
  #su-inf.on { display: flex; }
  #su-inf .caja { width: min(980px, calc(100vw - 24px)); max-height: calc(100vh - 32px); overflow-y: auto; padding: 22px 26px 26px; }
  #su-inf header { display: flex; align-items: flex-start; gap: 12px; }
  #su-inf header div { flex: 1; } #su-inf h2 { margin: 0; font: 600 26px/1.1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .02em; }
  #su-inf .sub { margin: 4px 0 0; font: 500 13px system-ui, sans-serif; opacity: .7; }
  #su-inf .ver { margin: 16px 0; padding: 12px 16px; border-radius: 12px; font: 600 16px/1.4 system-ui, sans-serif; }
  #su-inf .ver.go { background: rgba(220,40,40,.22); border: 1px solid rgba(255,90,90,.5); } #su-inf .ver.ok { background: rgba(60,180,110,.18); border: 1px solid rgba(110,220,150,.45); }
  #su-inf table { width: 100%; border-collapse: collapse; font: 500 13px system-ui, sans-serif; margin: 8px 0 4px; }
  #su-inf th, #su-inf td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: right; } #su-inf th:first-child, #su-inf td:first-child { text-align: left; }
  #su-inf th { font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
  #su-inf td.bien { color: #8ee6a8; } #su-inf td.mal { color: #ff8a80; }
  #su-inf .graf { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 14px 0; }
  #su-inf .graf figure { margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); }
  #su-inf .graf figcaption { font: 600 11px Geist, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; opacity: .65; margin-bottom: 6px; }
  #su-inf .graf svg { width: 100%; height: 90px; }
  #su-inf ul { margin: 6px 0; padding-left: 18px; font: 500 13px/1.5 system-ui, sans-serif; }
  #su-inf h3 { margin: 18px 0 4px; font: 600 11px Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; opacity: .6; }
  #su-inf .bot { display: flex; gap: 8px; } #su-inf .bot button { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: inherit; font: 600 13px system-ui, sans-serif; cursor: pointer; }
  #su-inf .bot button.pri { background: rgba(255,176,70,.9); color: #1b1206; border-color: transparent; }
  @media (max-width: 760px) { #su-der { width: calc(100vw - 32px); top: auto; bottom: 86px; max-height: 40vh; } #su-inf .caja { padding: 16px; } }
  @media print { body > *:not(#su-inf) { display: none !important; } #su-inf { position: static; background: none; } #su-inf .caja { max-height: none; color: #111; background: #fff; box-shadow: none; } #su-inf .bot { display: none; } }`;
  document.head.appendChild(st);

  /* ---------- elementos ---------- */
  const der = document.createElement('div'); der.id = 'su-der'; der.className = 'su-glass'; document.body.appendChild(der);
  const go = document.createElement('div'); go.id = 'su-go'; go.innerHTML = '<h1>GAME OVER</h1><p></p>'; document.body.appendChild(go);
  const inf = document.createElement('div'); inf.id = 'su-inf'; inf.innerHTML = '<div class="caja su-glass"></div>'; document.body.appendChild(inf);
  inf.addEventListener('click', (e) => { if (e.target === inf) cerrarInforme(); });

  /* ---------- estado de la corrida ---------- */
  const R = { sim: null, def: null, valores: {}, s: null, hist: [], go: null, fin: false, base: null, picos: 'soporte', foco: null, extinciones: [] };
  const defDe = (id) => (M && M.SIMS ? M.SIMS.find(x => x.id === id) : null);
  function preparar(id) {
    setTimeout(() => mostrarInd(), 400);
    R.sim = id; R.def = defDe(id); R.valores = {}; (R.def && R.def.sliders || []).forEach(s => { R.valores[s.k] = s.val; });
    reiniciarModelo(); pintarPanel(); der.classList.add('on');
    if (M && !R.base) setTimeout(calcularBase, 300); // «Hoy» completo para comparar en el informe
  }
  function reiniciarModelo() {
    R.hist = []; R.go = null; R.fin = false; R.extinciones = []; go.classList.remove('on'); cerrarInforme();
    R.s = M && R.sim ? M.crear(R.sim, SEMILLA, R.valores) : null;
    refrescarPicos(); // año 1: los picos vuelven a como está hoy
  }
  function calcularBase() { // simulación 1 (Hoy) con sus valores por defecto, 10 años, para comparar
    try { const d = defDe(1), v = {}; (d && d.sliders || []).forEach(s => { v[s.k] = s.val; }); const s = M.crear(1, SEMILLA, v); const H = []; for (let k = 0; k < FIN; k++) { M.paso(s); H.push(M.ind(s)); if (M.gameOver(s)) break; } R.base = H; }
    catch (e) { console.warn('base Hoy:', e); }
  }

  /* avanzar el modelo al paso de la barra de años */
  RELOJ.alDibujar(() => {
    if (!R.s || R.go || R.fin) return;
    let n = 0;
    while (R.s && R.hist.length < Math.max(1, Math.min(FIN, RELOJ.sem)) && n++ < 30) {
      M.paso(R.s); const I = M.ind(R.s); R.hist.push(I);
      for (const x of I.extinciones || []) { R.extinciones.push(x); avisarExtincion(x); }
      const g = M.gameOver(R.s); if (g) { gameOver(g); return; }
      if (I.sem % 52 === 0) refrescarPicos(); // cada año: los picos se recalculan con lo que ya se construyó
    }
    if (R.hist.length >= FIN && !R.fin) { R.fin = true; RELOJ.pausarAños(true); setTimeout(() => abrirInforme(), 700); }
    if (n) pintarIndicadores();
  });
  addEventListener('lp-reinicio', () => { reiniciarModelo(); pintarIndicadores(); });

  /* ---------- panel de la derecha ---------- */
  function pintarPanel() {
    const d = R.def;
    if (!M) { der.innerHTML = '<h4>Simulación</h4><p class="pre">El modelo de las simulaciones todavía no está disponible.</p>'; return; }
    der.innerHTML = `<h4>Qué se prueba</h4><p class="pre">${d ? d.pregunta || d.desc || '' : ''}</p>
      ${(d && d.sliders && d.sliders.length) ? '<h4>Variables</h4>' + d.sliders.map(s => `<div class="su-sl"><label>${s.n}<b data-v="${s.k}">${vfmt(s, R.valores[s.k])}</b></label><input type="range" min="${s.min}" max="${s.max}" step="${s.paso}" value="${R.valores[s.k]}" data-k="${s.k}" title="${s.ayuda || ''}"></div>`).join('') : ''}
      <h4>Indicadores · picos sobre Kennedy</h4><div id="su-picos"></div>
      <h4>Resultados en vivo</h4><div id="su-inds"></div>
      <h4>Resaltar</h4><div class="su-seg" data-g="foco"><button data-v="especies">Especies</button><button data-v="ruido">Ruido</button><button data-v="trafico">Tráfico</button><button data-v="" class="on">Normal</button></div>
      <h4>Informe</h4><div class="su-seg"><button data-inf>Ver informe ahora</button></div>`;
    der.querySelectorAll('input[type=range]').forEach(inp => {
      const pinta = () => { const s = d.sliders.find(x => x.k === inp.dataset.k); inp.style.setProperty('--p', ((inp.value - s.min) / (s.max - s.min) * 100) + '%'); der.querySelector(`[data-v="${s.k}"]`).textContent = vfmt(s, +inp.value); };
      pinta();
      inp.oninput = pinta;
      inp.onchange = () => { R.valores[inp.dataset.k] = +inp.value; RELOJ.pausarAños(true); if (!RELOJ.saltando) RELOJ.reiniciarModelo(); reiniciarModelo(); pintarIndicadores(); }; // cambiar una variable reinicia la simulación al año 1
    });
    der.querySelectorAll('.su-seg[data-g] button').forEach(b => b.onclick = () => {
      const g = b.parentNode.dataset.g; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (g === 'picos') { R.picos = b.dataset.v || null; const I = R.hist[R.hist.length - 1]; if (R.picos && I) ponerPicos(I); else if (window.KEN_PICOS_IND) window.KEN_PICOS_IND.ver(false); }
      if (g === 'foco' && window.KEN_FOCO) { if (b.dataset.v === 'ruido') { const rc = document.getElementById('rc-btn'); if (rc && !rc.classList.contains('on')) rc.click(); } if (b.dataset.v) window.KEN_FOCO.on(b.dataset.v); else window.KEN_FOCO.off(); }
    });
    const bi = der.querySelector('[data-inf]'); if (bi) bi.onclick = () => abrirInforme();
    pintarIndicadores(); pintarPicos();
  }
  const vfmt = (s, v) => (s.unidad === '%' ? Math.round(v * (s.max <= 1 ? 100 : 1)) + ' %' : (Math.round(v * 100) / 100).toLocaleString('es-CO') + (s.unidad ? ' ' + s.unidad : ''));
  function pintarIndicadores() {
    const box = document.getElementById('su-inds'); if (!box) return;
    const H = R.hist; if (!H.length) { box.innerHTML = ''; return; }
    const I = H[H.length - 1], I0 = H[0];
    box.innerHTML = IND.filter(x => I[x.k] != null).map(x => {
      const v = I[x.k], v0 = I0[x.k], cambio = v - v0, clase = Math.abs(cambio) < 1e-9 ? '' : ((cambio > 0) === x.sube ? 'bien' : 'mal');
      return `<div class="su-ind" title="${x.ayuda || ''}"><span>${x.n}</span><b class="${clase}">${x.f(v, I)}</b>${chispa(H.map(h => h[x.k]), clase)}</div>`;
    }).join('');
  }
  const chispa = (vals, clase) => { // gráfica mínima de la serie
    const v = vals.filter(x => x != null && isFinite(x)); if (v.length < 2) return '<svg></svg>';
    const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1, W = 260, Hh = 22, n = Math.min(v.length, 130), paso = (v.length - 1) / (n - 1);
    const pts = Array.from({ length: n }, (_, i) => v[Math.round(i * paso)]).map((y, i) => `${(i / (n - 1) * W).toFixed(1)},${(Hh - 2 - (y - mn) / r * (Hh - 4)).toFixed(1)}`).join(' ');
    const col = clase === 'bien' ? '#8ee6a8' : clase === 'mal' ? '#ff8a80' : '#ffcf7a';
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  };

  /* ---------- INDICADORES como en la versión anterior: los picos 3D de las láminas (data3d/indicadores.js) ----------
     Soporte ecológico, islas de calor, presión sobre el aire, exposición, comercio y logística, organización, conocimiento…
     Con una simulación de la propuesta (B, C) cada indicador se recalcula donde actúa lo que se va construyendo (huertas, árboles,
     mercados, Corabastos): cada año se vuelve a calcular y los picos se mueven. */
  const QUE_IND = { // qué mide cada lámina y si alto es bueno, en una línea, para leer los picos sin explicación
    SE: ['Dónde la fauna encuentra hábitat: árboles, humedales, huertas.', true], EPO: ['Cuánta gente vive expuesta a tráfico, ruido y carga.', false],
    IC: ['Dónde se acumula calor: asfalto y techos sin sombra.', false], PA: ['Presión sobre el aire por tráfico y falta de árboles.', false],
    OC: ['Juntas, colectivos y organizaciones que cuidan el barrio.', true], CO: ['Colegios, bibliotecas y lugares donde se aprende.', true],
    CCL: ['Dónde se concentra el comercio y la logística (Corabastos).', null], PM: ['Presión de carros y camiones sobre las vías.', false], CV: ['Choque entre vivienda y bodegas o carga.', false] };
  let pInd = null; R.ind = 'SE'; R.alto = 0.12; // altura más baja que en la vista completa: se lee la ciudad debajo
  const indApi = async () => { if (window.KEN_IND) return window.KEN_IND; if (!pInd) pInd = import('./indicadores.js?v=8').then(m => m.crearIndicadores({ THREE: T3.THREE, T3 })); return pInd; };
  async function pintarPicos() {
    const box = document.getElementById('su-picos'); if (!box) return;
    let A; try { A = await indApi(); } catch (e) { box.innerHTML = '<p class="pre">No se pudieron cargar los indicadores.</p>'; return; }
    const grad = (r, d) => `linear-gradient(${d},${r.join(',')})`;
    box.innerHTML = `<div class="su-picos">${A.lista.map(x => `<button data-c="${x.code}" class="${x.code === R.ind ? 'on' : ''}"><i style="background:${grad(x.ramp, 'to top')}"></i><b>${x.code}</b><span>${x.name.replace(/\s*\([A-Z]+\)\s*$/, '')}</span></button>`).join('')}
      <button data-c="" class="${!R.ind ? 'on' : ''}"><i style="background:rgba(255,255,255,.15)"></i><b>—</b><span>Apagar picos</span></button></div>
      ${R.ind ? (() => { const it = A.lista.find(x => x.code === R.ind); const q = QUE_IND[it && it.code] || ['', null]; return it ? `<p class="su-que">${q[0]} <b>${q[1] === true ? 'Más alto = mejor.' : q[1] === false ? 'Más alto = peor.' : 'Lo sano es repartido, sin un solo pico.'}</b><br><span>Los picos cambian año a año con lo que la simulación va construyendo.</span></p><div class="su-rampa" style="background:${grad(it.ramp, '90deg')}"></div><div class="su-rampa-t"><span>bajo</span><span>alto</span></div><label class="su-alto"><span>Altura de los picos</span><input type="range" min="0.03" max="0.4" step="0.01" value="${R.alto}"></label>` : ''; })() : ''}`;
    const ra = box.querySelector('.su-alto input'); if (ra) ra.oninput = () => { R.alto = +ra.value; A.altura(R.alto); };
    box.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => { R.ind = b.dataset.c || null; mostrarInd(); pintarPicos(); });
  }
  async function mostrarInd() { const A = await indApi(); if (!R.altoIni) { R.altoIni = 1; A.altura(R.alto); } A.ver(!!R.ind); await A.mostrar(R.ind || null, false); }
  const prom = (A) => { if (!A || !A.length) return 0; let s = 0, n = 0; for (const v of A) if (isFinite(v)) { s += v; n++; } return n ? s / n : 0; };
  const c01 = (v) => Math.max(0, Math.min(1, v || 0));
  function factoresSim(I) { // cuánto de cada intervención existe en esta semana del modelo (0–1) -> T3.simInd para indicadores.js
    const d = R.def || {}, b = d.base || 'A', id = R.sim, sem = I ? I.sem : 0, I0 = R.hist[0];
    const h = I ? I.huertas : 120, HA = 120;                                                 // ~120 huertas que ya existen hoy en el modelo
    const huerta = id === 12 ? 0 : c01((h - HA) / 1500);                                   // 1500: sim 11 llega a ~0,7 y la red de mercados (sim 3) se llena hacia el año 5
    const techo = id === 12 ? c01((h - HA) / 950) : 0.4 * huerta;                          // sim 12: ~1070 huertas equivalentes en techos al tercer año
    const merc = c01(I && I.zonas ? prom(I.zonas.comercio) / 0.3 : 0);                     // fracción que vende la red local (0,3 = lo máximo de sim 3 y 10)
    const cora = id === 5 ? (sem >= (R.valores.sinCora || 52) ? 1 : 0) : id === 6 ? 0.5 * c01(sem / 156) * (R.valores.desmLib != null ? R.valores.desmLib : 1) : 0.8 * merc;    const bav = b === 'B' ? c01(sem / 104) : b === 'D' ? 0.6 * c01(sem / 260) : 0;
    const verde = b === 'B' || b === 'C' ? c01(sem / 156) : id === 6 ? 0.5 * c01(sem / 156) : 0; // parches nativos que maduran en ~3 años
    return { huerta, techo, merc, cora, bav, verde };
  }
  function refrescarPicos() { T3.simInd = factoresSim(R.hist[R.hist.length - 1]); if (!R.ind || !pInd && !window.KEN_IND) return; indApi().then(A => A.recalcular && A.recalcular(true)); } // indicadores.js recalcula y anima con lo construido hasta ahora
  /* ---------- picos en el piso (data3d/picos_indicadores.js) ---------- */
  function ponerPicos(I) {
    const P = window.KEN_PICOS_IND; if (!P || !R.picos || !I.zonas || !M.ZONAS_XZ) return;
    if (R.picos === 'soporte' && I.zonas.soporteEco) P.poner('soporte', I.zonas.soporteEco, M.ZONAS_XZ, '#5fd38a', 'Soporte ecológico');
    if (R.picos === 'comercio' && I.zonas.comercio) P.poner('comercio', I.zonas.comercio, M.ZONAS_XZ, '#ffb347', 'Comercio de alimentos');
    P.ver(true);
  }

  /* ---------- especie que desaparece: cámara tipo God's Eye (data3d/ojo_dios.js) ---------- */
  let colaOjo = Promise.resolve();
  function avisarExtincion(x) {
    if (!window.KEN_OJO || x.x == null) return;
    colaOjo = colaOjo.then(() => { const corria = !RELOJ.pausaSem; RELOJ.pausarAños(true);
      return Promise.resolve(window.KEN_OJO.ir({ x: x.x, z: x.z, color: '#ff8a80', titulo: `Desapareció: ${x.nombre || x.especie}`, texto: `Año ${(x.sem / 52 + 1).toFixed(1)} · motivo: ${x.motivo}${x.parche ? ' · ' + x.parche : ''}` }))
        .then(() => { if (corria && !R.go) RELOJ.pausarAños(false); }); });
  }

  /* ---------- GAME OVER ---------- */
  function gameOver(g) {
    R.go = g; RELOJ.pausarAños(true);
    go.querySelector('p').textContent = `Año ${(g.sem / 52 + 1).toFixed(1)} · ${g.motivo || g.regla}`;
    go.classList.add('on'); if (window.KEN_FOCO) window.KEN_FOCO.on(g.regla === 'ruido' ? 'ruido' : g.regla === 'trafico' ? 'trafico' : 'especies');
    setTimeout(() => { go.classList.remove('on'); abrirInforme(); }, 4200);
  }

  /* ---------- INFORME ---------- */
  function abrirInforme() {
    const H = R.hist; if (!H.length) return;
    const I0 = H[0], I = H[H.length - 1], d = R.def || {}, nombre = (SIMS_UI.find(s => s.id === R.sim) || {}).n || d.n || '';
    const B = R.base && R.base[Math.min(R.base.length - 1, H.length - 1)];
    const filas = IND.filter(x => I[x.k] != null).map(x => {
      const c = I[x.k] - I0[x.k], cl = Math.abs(c) < 1e-9 ? '' : ((c > 0) === x.sube ? 'bien' : 'mal');
      const cb = B && B[x.k] != null && R.sim !== 1 ? I[x.k] - B[x.k] : null, clb = cb == null || Math.abs(cb) < 1e-9 ? '' : ((cb > 0) === x.sube ? 'bien' : 'mal');
      return `<tr><td>${x.n}</td><td>${x.f(I0[x.k], I0)}</td><td>${x.f(I[x.k], I)}</td><td class="${cl}">${signo(c, x)}</td><td class="${clb}">${cb == null ? '—' : signo(cb, x)}</td></tr>`;
    }).join('');
    const graf = ['fauna', 'red', 'trafico', 'ruidoDb', 'comidaMin', 'poliniz'].filter(k => I[k] != null).map(k => { const x = IND.find(z => z.k === k); return `<figure><figcaption>${x.n}</figcaption>${grafica(H.map(h => h[k]), R.base && R.sim !== 1 ? R.base.slice(0, H.length).map(h => h[k]) : null, x)}</figure>`; }).join('');
    const ext = R.extinciones.length ? `<ul>${R.extinciones.map(x => `<li><b>${x.nombre || x.especie}</b> · año ${(x.sem / 52 + 1).toFixed(1)} · ${x.motivo}${x.parche ? ' · ' + x.parche : ''}</li>`).join('')}</ul>` : '<p class="sub">Ninguna especie desapareció de Kennedy en esta corrida.</p>';
    const reglas = M && M.REGLAS ? `<ul>${M.REGLAS.map(r => `<li><b>${r.n}:</b> ${r.txt}${r.fuente ? ` <span class="sub">(${r.fuente})</span>` : ''}</li>`).join('')}</ul>` : '';
    const ver = R.go ? `<div class="ver go">GAME OVER en el año ${(R.go.sem / 52 + 1).toFixed(1)}: ${R.go.motivo || R.go.regla}.</div>`
      : `<div class="ver ok">Kennedy aguanta los 10 años en esta simulación: no se cumplió ninguna regla de game over.</div>`;
    inf.querySelector('.caja').innerHTML = `<header><div><h2>Simulación ${R.sim} · ${nombre}</h2><p class="sub">${d.pregunta || d.desc || ''} · ${(H.length - 1)} semanas (${((H.length - 1) / 52).toFixed(1)} años) · semilla ${SEMILLA}</p></div>
      <div class="bot"><button data-imp>Imprimir / PDF</button><button class="pri" data-x>Cerrar</button></div></header>${ver}
      <h3>Indicadores · inicio → final${R.sim !== 1 && B ? ' · comparado con «Hoy»' : ''}</h3>
      <table><thead><tr><th>Indicador</th><th>Inicio</th><th>Final</th><th>Cambio</th><th>vs. Hoy</th></tr></thead><tbody>${filas}</tbody></table>
      <h3>Cómo cambió${R.sim !== 1 && B ? ' (línea punteada: Hoy)' : ''}</h3><div class="graf">${graf}</div>
      <h3>Especies que desaparecieron</h3>${ext}
      <h3>Reglas de game over (iguales para las 12)</h3>${reglas}`;
    inf.querySelector('[data-x]').onclick = cerrarInforme; inf.querySelector('[data-imp]').onclick = () => window.print();
    inf.classList.add('on');
  }
  function cerrarInforme() { inf.classList.remove('on'); }
  const signo = (c, x) => { if (c == null || isNaN(c)) return '—'; const s = c > 0 ? '+' : c < 0 ? '−' : ''; const a = Math.abs(c);
    if (x.k === 'trafico' || x.k === 'comidaMin' || x.k === 'residuos') return s + (a * 100).toFixed(0) + ' pts'; if (x.k === 'ruidoDb') return s + a.toFixed(1) + ' dB'; if (x.k === 'callesRuidosas') return s + a.toFixed(0) + ' pts'; return s + fmt(a); };
  function grafica(v, vb, x) {
    const W = 300, Hh = 90, todos = v.concat(vb || []).filter(z => z != null && isFinite(z)); if (todos.length < 2) return '<svg></svg>';
    const mn = Math.min(...todos), mx = Math.max(...todos), r = mx - mn || 1, n = v.length;
    const linea = (arr) => arr.map((y, i) => y == null ? '' : `${(i / Math.max(1, FIN) * W).toFixed(1)},${(Hh - 6 - (y - mn) / r * (Hh - 14)).toFixed(1)}`).filter(Boolean).join(' ');
    const ejes = Array.from({ length: 11 }, (_, k) => `<line x1="${k / 10 * W}" y1="${Hh - 4}" x2="${k / 10 * W}" y2="${Hh - 1}" stroke="rgba(255,255,255,.25)"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${ejes}${vb ? `<polyline points="${linea(vb)}" fill="none" stroke="rgba(255,255,255,.45)" stroke-dasharray="4 3" stroke-width="1.4" vector-effect="non-scaling-stroke"/>` : ''}<polyline points="${linea(v)}" fill="none" stroke="#ffcf7a" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  return { preparar, reiniciarModelo, abrirInforme, get disponible() { return !!M; } };
}
