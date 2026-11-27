/* ============ MODO SIMPLE (por defecto) ============
   Los profesores dijeron «no se entiende nada»: no es el lenguaje sino la MANERA de mostrarlo. El modo simple deja en pantalla:
   · el mapa 3D,
   · ARRIBA: la opción (A Hoy · B Bavaria central · C Red de mercados) y la línea de tiempo «Año X de 50» con play/pausa, velocidad e
     ÍCONOS de hitos sobre la barra (mercado que abre, bodega de Corabastos que se desmonta, game over). Cada ícono se puede tocar:
     la cámara va al lugar y se enciende un anillo de luz en el mapa.
   · A LA DERECHA: UN solo bloque de lectura: un número grande, los 3 semáforos de las reglas, el último suceso con «Ver dónde» y el
     botón «Comparar A · B · C». Lo secundario (frases, leyenda del mapa) queda plegado en «Más detalles».
   · «Comparar»: corre A, B y C en segundo plano (mismo modelo, misma semilla, ajustes de ahora) hasta el año 50 y dibuja, por indicador,
     un gráfico pequeño igual para los tres (curva de 50 años, colores fijos por escenario, punto de game over, línea de «ahora»).
   · Bienvenida de 3 pasos la primera vez (localStorage; ?intro=0 la omite).
   Colores fijos por escenario en TODO: A azul grisáceo, B malva, C ámbar (botones, línea de tiempo, gráficos, anillos del mapa).
   El resto de los paneles se esconde (clase html.ms-simple, estilos en data3d/modo_simple.css); «Ver todo» vuelve al modo completo.
   Este módulo solo LEE el modelo (no cambia reglas ni supuestos). El tope de 50 años vive en data3d/tope_anos.js. */
import { RELOJ as R0 } from './reloj.js?v=5';
import { ESCENARIOS, REGLAS, MERCADOS, BODEGAS, MOTIVO, diagnostico, crear, paso } from './sim_vida.js?v=9';
import { ZONAS } from './sim_red_datos.js?v=2';
import { PAR, SIMST } from './sim_modelos.js?v=7';
import { TOPE_AÑOS, TOPE_SEM, terminado, añoActual, armarTope } from './tope_anos.js?v=3';

const COL = { A: '#8fb0c9', B: '#b07aa1', C: '#e2a55b', D: '#c9706a' };
const LARGO = { A: 'Hoy', B: 'Bavaria central', C: 'Red de mercados', D: 'Plan parcial' };
const FRASE = { A: 'Kennedy sigue como hoy: toda la comida pasa por Corabastos.', B: 'Bavaria Común concentra el reparto, el compost y las decisiones.', C: 'Una red de mercados de barrio reparte la comida y el compost.', D: 'Se construye el Plan Parcial Fábrica Bavaria: 14.300 viviendas en 10 años.' };
const LUZ = { habitat: 'Hábitat', abasto: 'Abastecimiento', residuos: 'Residuos' };
const VELS = [['Lento', 4, 'Un año cada 13 segundos'], ['Normal', 13, 'Un año cada 4 segundos'], ['Rápido', 26, 'Un año cada 2 segundos'], ['Muy rápido', 52, 'Un año por segundo']];
const MERC = MERCADOS.slice().sort((a, b) => a.desde - b.desde);
const BURRO = [2095.67, -109.06];
const motivo = (c) => c.causas.map(k => MOTIVO[k]).join('; ');
const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const añoDeSem = (w) => Math.min(TOPE_AÑOS, Math.floor(w / 52) + 1);
const pct = (w) => (Math.max(0, Math.min(TOPE_SEM, w)) / TOPE_SEM * 100).toFixed(2) + '%';
const LS = 'ken-ms-bienvenida-v1';
const lsGet = () => { try { return localStorage.getItem(LS); } catch (e) { return null; } };
const lsSet = () => { try { localStorage.setItem(LS, '1'); } catch (e) {} };
const IC = { // íconos de los hitos (mismo trazo en la línea de tiempo y en el bloque de lectura)
  mer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l1.5-5h13L20 9M4 9v10.5h16V9M4 9h16M10 19.5V14h4v5.5"/></svg>',
  bod: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l9-5 9 5v11M8 20v-6h8v6"/></svg>',
  go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>'
};
const tsem = (v) => v >= 104 ? fmt(v / 52, 1) + ' años' : fmt(v, 1) + ' sem.';
/* ---------- indicadores de «Comparar» (todos salen del estado del modelo, o.*) ---------- */
const IND = [
  { k: 'act', t: 'Hogares con huerta', get: (o) => o.act, mejor: 1, f: (v) => fmt(v) },
  { k: 'dep', t: 'Comida que llega por Corabastos', get: (o) => o.dep * 100, mejor: -1, f: (v) => fmt(v) + ' %', max: 100 },
  { k: 'pct2', t: 'Orgánicos que se aprovechan', get: (o) => o.pct2, mejor: 1, f: (v) => fmt(v) + ' %', max: 100 },
  { k: 'esp', t: 'Especies presentes', get: (o) => o.esp, mejor: 1, f: (v) => fmt(v) },
  { k: 'resol', t: 'Tiempo para resolver solicitudes', get: (o) => (o.resol && o.resol.m != null ? o.resol.m : null), mejor: -1, f: (v) => tsem(v) }
];
const snap = (o) => Object.fromEntries(IND.map(I => [I.k, I.get(o)]));

export function iniciarModoSimple({ RELOJ = R0, leer, elegir } = {}) {
  armarTope(RELOJ);
  const raiz = document.documentElement;
  if (!document.getElementById('ms-css')) { const l = document.createElement('link'); l.id = 'ms-css'; l.rel = 'stylesheet'; l.href = 'data3d/modo_simple.css?v=8'; document.head.appendChild(l); }
  const root = document.createElement('div'); root.id = 'ms';
  root.innerHTML = `<section id="ms-main" aria-label="Escenario y años">
      <div class="ms-top"><div class="ms-esc" role="group" aria-label="Escenario">${['A', 'B', 'C', 'D'].map(k => `<button type="button" data-e="${k}" aria-pressed="false" style="--c:${COL[k]}" title="${FRASE[k]}"><b>${k}</b><span class="ms-nl">${LARGO[k]}</span><span class="ms-nc">${ESCENARIOS[k].corto}</span></button>`).join('')}</div>
        <button type="button" class="ms-todo" id="ms-todo" title="Mostrar todos los paneles y controles">Ver todo</button></div>
      <div class="ms-tl"><button type="button" class="ms-play" data-play aria-label="Correr los años">▶</button>
        <div class="ms-año" role="timer" aria-live="off"><span class="ms-n" data-n>Año 1</span><span class="ms-de">de ${TOPE_AÑOS}</span></div>
        <div class="ms-vel" role="group" aria-label="Velocidad de los años">${VELS.map(([n, v, t]) => `<button type="button" data-v="${v}" title="${t}">${n}</button>`).join('')}</div></div>
      <div class="ms-pista" data-pista><span class="ms-banda" data-banda hidden></span><span class="ms-rel" data-rel></span><i class="ms-pto" data-pto></i><span data-hitos></span></div>
      <div class="ms-eje" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map(i => i * TOPE_AÑOS / 5).map(a => `<span style="left:${a / TOPE_AÑOS * 100}%">${a === 0 ? 'año 0' : a === TOPE_AÑOS ? 'año ' + a : a}</span>`).join('')}</div>
      <p class="ms-ley" data-ley></p>
      <div class="ms-fin" data-fin hidden role="status"><h3>Fin: ${TOPE_AÑOS} años</h3><p data-fin-txt></p><button type="button" data-reiniciar>Volver a empezar</button></div>
    </section>
    <section id="ms-pasa" aria-label="¿Qué está pasando?">
      <h2>¿Qué está pasando?<small data-sub></small></h2>
      <div class="ms-kpi"><strong data-kv>0</strong><span data-kl>hogares con huerta</span></div>
      <ul class="ms-luces" data-luces></ul>
      <div class="ms-evento" data-evento></div>
      <button type="button" class="ms-comp" data-comp>Comparar A · B · C</button>
      <details class="ms-mas"><summary>Más detalles</summary><ul class="ms-frases" data-frases></ul>
        <p class="ms-h">Qué es cada cosa en el mapa</p><ul class="ms-mapa">
        <li><i class="p" style="background:#6fcf6a"></i>Puntos verdes: huertas que ya abrieron.</li>
        <li><i class="p" style="background:#1f6b38"></i>Puntos verde oscuro: corredores verdes de árboles nativos.</li>
        <li><i class="p" style="background:#b8875a"></i>Círculos café: compost de los orgánicos.</li>
        <li><i class="p" style="background:#e2a55b"></i>Ícono de tienda: un mercado de barrio (C).</li>
        <li><i class="a" style="border-color:#e15759"></i>Anillo en Corabastos: rojo = casi toda la comida pasa por ahí; verde = ya casi nada.</li>
        <li><i class="a" style="border-color:#59a14f"></i>Anillo en el humedal El Burro: verde = sano; rojo = en peligro.</li>
        <li><i class="b"></i>Franja en la Av. Ciudad de Cali: más roja = más carros.</li></ul></details>
    </section>`;
  document.body.appendChild(root);
  const volver = document.createElement('button'); volver.type = 'button'; volver.id = 'ms-volver'; volver.textContent = 'Modo simple'; volver.title = 'Dejar solo lo principal';
  document.body.appendChild(volver);
  const $ = (s) => root.querySelector(s);
  const q = { n: $('[data-n]'), play: $('[data-play]'), rel: $('[data-rel]'), pto: $('[data-pto]'), hitos: $('[data-hitos]'), banda: $('[data-banda]'), ley: $('[data-ley]'),
    fin: $('[data-fin]'), finTxt: $('[data-fin-txt]'), sub: $('[data-sub]'), luces: $('[data-luces]'), frases: $('[data-frases]'), kv: $('[data-kv]'), kl: $('[data-kl]'), ev: $('[data-evento]') };
  const esSimple = () => raiz.classList.contains('ms-simple');
  const poner = (on) => { raiz.classList.toggle('ms-simple', on); if (!on) { cerrarCmp(); cerrarIntro(); } dispatchEvent(new Event('resize')); if (on) pintar(true); };
  $('#ms-todo').onclick = () => poner(false); volver.onclick = () => poner(true);

  /* ---------- el mapa explica: anillo de luz + cámara al lugar ---------- */
  const T = () => window.KEN3D && window.KEN3D.scene ? window.KEN3D : null;
  const pulsos = []; let grupo = null;
  const pulso = (x, z, col) => { const t3 = T(); if (!t3) return; const THREE = t3.THREE;
    if (!grupo) { grupo = new THREE.Group(); grupo.name = 'modo_simple'; t3.scene.add(grupo); }
    const y = (t3.sueloY != null ? t3.sueloY : 0.35) + 3;
    for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.16, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide }));
      m.renderOrder = 30; m.position.set(x, y, z); grupo.add(m); pulsos.push({ m, t: -k * 1.1 }); } };
  const volar = (c, alto, atras = 0.55) => { const t3 = T(); if (!t3 || !t3.orbit) return; const THREE = t3.THREE, o = t3.orbit, p0 = t3.camera.position.clone(), t0 = o.target.clone(), p1 = new THREE.Vector3(c[0] + alto * 0.2, alto, c[1] + alto * atras), t1 = new THREE.Vector3(c[0], 0, c[1]), ini = performance.now();
    const f = () => { const k = Math.min(1, (performance.now() - ini) / 1500), e2 = k * k * (3 - 2 * k); t3.camera.position.lerpVectors(p0, p1, e2); o.target.lerpVectors(t0, t1, e2); o.update(); if (k < 1) requestAnimationFrame(f); }; f(); };
  const irA = (ev) => { if (!ev) return; volar([ev.x, ev.z], ev.alto || 520, 0.6); setTimeout(() => pulso(ev.x, ev.z, COL[ev.e]), 900); };
  /* sucesos reales del modelo en la corrida que se mira: mercado que abre (C), bodega desmontada (B y C), game over */
  const sucesos = (e, sv, o) => {
    const S = [];
    if (e === 'C') MERC.forEach((m, i) => { if (m.desde <= RELOJ.sem) S.push({ w: m.desde, k: 'mer', e, x: m.x, z: m.z, alto: 450, txt: `Abrió el mercado ${m.n} (${i + 1} de ${MERC.length})`, anio: añoDeSem(m.desde) }); });
    if (e !== 'A') sv.cora.ap.forEach((w, i) => { const b = BODEGAS[i]; if (b) S.push({ w, k: 'bod', e, x: b.x, z: b.z, alto: 420, txt: `Se desmontó la bodega ${i + 1} de ${BODEGAS.length} de Corabastos`, anio: añoDeSem(w) }); });
    if (sv.colapso) { const c = sv.colapso, causa = c.causas[0], zn = causa === 'abasto' && o.zArg >= 0 ? ZONAS[o.zArg] : null;
      const p = causa === 'habitat' ? BURRO : causa === 'residuos' ? ((window.KEN_BAV && window.KEN_BAV.compost) || [4185.7, 28.9]) : zn ? [zn[0], zn[1]] : null;
      S.push({ w: c.t, k: 'go', e, x: p ? p[0] : null, z: p ? p[1] : null, alto: causa === 'abasto' ? 1100 : 750, txt: `Game over en el año ${añoDeSem(c.t)}: ${motivo(c)}`, anio: añoDeSem(c.t), donde: causa === 'abasto' ? 'zona peor abastecida' : '' }); }
    return S.sort((a, b) => a.w - b.w);
  };
  let SUC = [], ultKey = null;

  /* ---------- controles ---------- */
  root.querySelectorAll('.ms-esc button').forEach(b => b.onclick = () => { if (!RELOJ.saltando && elegir) elegir(b.dataset.e); setTimeout(() => pintar(true), 120); });
  const reiniciar = () => { if (RELOJ.saltando) return; RELOJ.reiniciarModelo(); if (RELOJ.detenerSemEn == null) RELOJ.detenerSemEn = TOPE_SEM; RELOJ.pausarAños(false); };
  q.play.onclick = () => { if (RELOJ.saltando) return; if (terminado(RELOJ)) reiniciar(); else RELOJ.pausarAños(!RELOJ.pausaSem); };
  $('[data-reiniciar]').onclick = reiniciar;
  root.querySelectorAll('.ms-vel button').forEach(b => b.onclick = () => { if (!RELOJ.saltando && !terminado(RELOJ)) RELOJ.ponerVelAños(+b.dataset.v); });
  q.hitos.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-i]'); if (b) irA(SUC[+b.dataset.i]); });
  q.ev.addEventListener('click', (ev) => { if (ev.target.closest('button[data-ver]')) irA(SUC[SUC.length - 1]); });

  /* ---------- lo que se dibuja ---------- */
  let firma = '', tUi = 0;
  const hitos = () => { // íconos sobre la barra: un mercado por año con aperturas (los de ese año juntos), cada bodega, el game over
    const h = [], yaMer = new Set();
    SUC.forEach((s, i) => { if (s.k === 'mer') { const a = s.anio; if (yaMer.has(a)) return; yaMer.add(a); const n = SUC.filter(x => x.k === 'mer' && x.anio === a).length; h.push(`<button type="button" class="ms-ico mer" data-i="${i}" style="left:${pct(s.w)}" title="Año ${a}: ${n === 1 ? 'abre un mercado' : 'abren ' + n + ' mercados'}. Toca para verlo en el mapa" aria-label="Año ${a}: mercados que abren">${IC.mer}</button>`); }
      else h.push(`<button type="button" class="ms-ico ${s.k}" data-i="${i}" style="left:${pct(s.w)}" title="${s.txt}. Toca para verlo en el mapa" aria-label="${s.txt}">${IC[s.k]}</button>`); });
    return h.join('');
  };
  const leyenda = (e) => { const L = []; if (e === 'A') L.push('Sin obras nuevas: el tráfico crece cada año.'); if (e === 'C') L.push(`<i class="ms-k mer">${IC.mer}</i>mercado que abre`); if (e !== 'A') L.push(`<i class="ms-k bod">${IC.bod}</i>bodega que se desmonta`); L.push(`<i class="ms-k go">${IC.go}</i>game over`); return L.join(''); };
  const frases = (e, sv, o, a) => {
    const dep = o.dep, menos = Math.round(90 * (1 - dep)), L = [];
    if (e === 'D' && o.plan) L.push(`<b>Año ${a}:</b> el Plan Parcial Fábrica Bavaria lleva <b>${fmt(o.plan.viviendas)} de 14.300 viviendas</b>: ${fmt(o.plan.personas)} personas más y ${fmt(o.plan.autos)} carros más; ${fmt(o.plan.arboles)} árboles talados en el predio.`);
    if (e === 'A') L.push(`<b>Año ${a}:</b> toda la comida sigue llegando por Corabastos.`);
    else if (e === 'B') L.push(`<b>Año ${a}:</b> Bavaria reparte ${fmt(o.bavKg / 1000)} t de comida por semana; ${fmt(o.act)} hogares con huerta.`);
    else if (e === 'C') L.push(`<b>Año ${a}:</b> ${fmt(o.nodos)} de ${MERC.length} mercados abiertos y ${fmt(o.act)} hogares con huerta.`);
    if (e === 'A' || e === 'D') L.push(o.trafico && o.trafico.V > 1.0005 ? `El tráfico en Kennedy es <b>${fmt((o.trafico.V - 1) * 100)} % mayor</b> que hoy.` : 'El tráfico en Kennedy es como el de hoy.');
    else if (e !== 'D') L.push(`${menos >= 1 ? `Corabastos recibe <b>${menos} % menos camiones</b>` : 'Corabastos sigue recibiendo todos sus camiones'}; ${sv.cora.ap.length} de ${BODEGAS.length} bodegas desmontadas.`);
    L.push(`<b>${fmt(o.esp)} de ${fmt(o.esp0)}</b> especies presentes en los corredores verdes.`);
    L.push(e === 'A' || e === 'D' ? `Los orgánicos van al relleno: ${fmt(o.relleno / 1000, 1)} t por semana.` : `${fmt(o.pct2)} % de los orgánicos se composta; el resto va al relleno.`);
    if (o.cierre && o.cierre.on) L.splice(1, 0, `Vía <b>${o.cierre.via}</b> cerrada (semana ${o.cierre.sem} de ${o.cierre.dur}).`);
    return L.slice(0, 5);
  };
  function pintar(forzar) {
    if (!esSimple()) return;
    const L = leer && leer(); if (!L || !L.S) return;
    const e = L.e, sv = L.S[e], o = sv.o; if (!o || o.t == null) return;
    const fin = terminado(RELOJ), a = añoActual(RELOJ);
    root.querySelectorAll('.ms-esc button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === e)));
    q.n.textContent = 'Año ' + a;
    q.play.textContent = fin ? '↻' : RELOJ.pausaSem ? '▶' : '❚❚';
    q.play.setAttribute('aria-label', fin ? 'Volver a empezar' : RELOJ.pausaSem ? 'Correr los años' : 'Pausar los años');
    root.querySelectorAll('.ms-vel button').forEach(b => { b.classList.toggle('on', +b.dataset.v === RELOJ.velSem); b.disabled = fin; });
    root.style.setProperty('--c', COL[e]); $('#ms-main').style.setProperty('--c', COL[e]); $('#ms-pasa').style.setProperty('--c', COL[e]);
    const w = Math.min(TOPE_SEM, RELOJ.semanas), x = pct(w); q.rel.style.width = x; q.pto.style.left = x;
    SUC = sucesos(e, sv, o);
    const f2 = `${e}|${SUC.length}|${Math.floor(RELOJ.sem / 13)}`;
    if (forzar || f2 !== firma) { firma = f2; q.hitos.innerHTML = hitos(); q.ley.innerHTML = leyenda(e);
      q.banda.hidden = e !== 'B'; if (e === 'B') { q.banda.style.left = pct(MERC[0].desde); q.banda.style.width = (MERC[MERC.length - 1].desde / TOPE_SEM * 100 - MERC[0].desde / TOPE_SEM * 100).toFixed(2) + '%'; } }
    q.fin.hidden = !fin;
    if (fin) { const D = ['A', 'B', 'C', 'D'].filter(k => L.S[k]).map(k => { const s = L.S[k]; return `<b style="color:${COL[k]}">${k}</b> ${s.colapso ? 'game over en el año ' + añoDeSem(s.colapso.t) : 'sigue'}`; }); q.finTxt.innerHTML = D.join(' · ') + '.'; }
    // lo grande: un número y su etiqueta
    if (e === 'D' && o.plan) { q.kv.textContent = fmt(o.plan.viviendas); q.kl.textContent = 'viviendas nuevas · ' + fmt(o.plan.personas) + ' personas'; } else { q.kv.textContent = fmt(o.act); q.kl.textContent = 'hogares con huerta'; }
    const dg = diagnostico(sv);
    q.luces.innerHTML = ['abasto', 'residuos', 'habitat'].map(k => { const r = dg.reglas.find(z => z.R.k === k), est = !r ? 'ok' : r.estado === 'cerrada' ? 'cerro' : (r.estado === 'riesgo' || r.estado === 'cumple') ? 'riesgo' : 'ok';
      return `<li data-s="${est}" title="${est === 'ok' ? 'bien' : est === 'riesgo' ? 'en riesgo' : 'game over'}"><span>${LUZ[k]}</span><em>${est === 'ok' ? 'bien' : est === 'riesgo' ? 'en riesgo' : 'game over'}</em></li>`; }).join('');
    // último suceso, conectado con el mapa
    const u = SUC[SUC.length - 1];
    q.ev.innerHTML = u ? `<i class="ms-k ${u.k}">${IC[u.k]}</i><span>${u.txt}</span>${u.x != null ? '<button type="button" data-ver>Ver dónde</button>' : ''}` : `<span class="vacio">${RELOJ.pausaSem && a === 1 ? 'Pulsa ▶ para ver pasar los años.' : 'Todavía no ha pasado nada nuevo.'}</span>`;
    q.ev.dataset.k = u ? u.k : '';
    const key = u ? u.k + u.w : ''; if (ultKey != null && key && key !== ultKey && !RELOJ.pausaSem && u.x != null) pulso(u.x, u.z, COL[e]); ultKey = key;
    q.frases.innerHTML = frases(e, sv, o, a).map(t => `<li>${t}</li>`).join('');
    q.sub.textContent = LARGO[e];
  }
  RELOJ.alCambiar(() => pintar());
  RELOJ.alDibujar((i) => {
    for (let k = pulsos.length - 1; k >= 0; k--) { const p = pulsos[k]; p.t += i.dtReal; if (p.t < 0) { p.m.material.opacity = 0; continue; } const c = p.t / 2.2;
      if (c >= 3) { grupo.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); pulsos.splice(k, 1); continue; }
      const f = c % 1; p.m.scale.setScalar(25 + f * 240); p.m.material.opacity = 0.95 * (1 - f); }
    if ((tUi -= i.dtReal) > 0) return; tUi = 0.25; pintar(); });

  /* ---------- COMPARAR A · B · C: gráficos pequeños iguales, uno por indicador ---------- */
  const cmp = document.createElement('div'); cmp.id = 'ms-cmp'; cmp.hidden = true; cmp.setAttribute('role', 'dialog'); cmp.setAttribute('aria-modal', 'true'); cmp.setAttribute('aria-labelledby', 'ms-cmp-t');
  cmp.innerHTML = `<div class="ms-glass ms-cmp-caja"><header><h2 id="ms-cmp-t">Comparar A · B · C</h2><button type="button" class="ms-i" data-info aria-expanded="false" aria-label="Cómo se calcula" title="Cómo se calcula">ℹ</button><button type="button" class="ms-x" data-x aria-label="Cerrar">✕</button></header>
    <p class="ms-info" data-cinfo hidden></p>
    <div class="ms-clave" aria-hidden="true">${['A', 'B', 'C', 'D'].map(k => `<span><i style="background:${COL[k]}"></i>${k} ${LARGO[k]}</span>`).join('')}<span><i class="go"></i>game over</span><span><i class="ya"></i>ahora</span></div>
    <p class="ms-calc" data-calc hidden></p><div class="ms-grid" data-cuerpo></div><div class="ms-pie" data-pie></div></div>`;
  document.body.appendChild(cmp);
  const cq = (s) => cmp.querySelector(s);
  let RES = null, foco = null;
  const claveRes = () => (SIMST.semilla || 1) + '|' + JSON.stringify(PAR);
  const calcular = () => {
    if (RES && RES.clave === claveRes()) return Promise.resolve(RES);
    return new Promise((fin) => {
      const seed = SIMST.semilla || 1, S = { A: crear('A', seed), B: crear('B', seed), C: crear('C', seed), D: crear('D', seed) }, sn = { A: [], B: [], C: [], D: [] }; let w = 0; const clave = claveRes();
      const tira = () => { const hasta = w === 0 ? 1 : Math.min(TOPE_SEM, (Math.floor(w / 52) + 1) * 52);
        for (; w < hasta; w++) for (const k of 'ABCD') paso(S[k], PAR);
        for (const k of 'ABCD') sn[k].push(snap(S[k].o));
        cq('[data-calc]').textContent = `Calculando los ${TOPE_AÑOS} años… ${Math.round(w / TOPE_SEM * 100)} %`;
        if (w < TOPE_SEM) setTimeout(tira, 0); else { RES = { clave, seed, sn, S }; fin(RES); } };
      tira(); });
  };
  const grafico = (I) => {
    const W = 330, H = 138, ml = 4, mr = 58, mt = 14, mb = 22, px = (y) => ml + (W - ml - mr) * y / TOPE_AÑOS;
    const ser = {}; let mx = 0; for (const k of 'ABCD') { ser[k] = RES.sn[k].map(s => s[I.k]); ser[k].forEach(v => { if (v != null && isFinite(v)) mx = Math.max(mx, v); }); }
    const max = (I.max || mx || 1) * 1.04, py = (v) => mt + (H - mt - mb) * (1 - v / max), yNow = Math.min(TOPE_AÑOS, RELOJ.sem / 52);
    let s = `<line x1="${ml}" y1="${py(0)}" x2="${W - mr}" y2="${py(0)}" class="base"/><line x1="${ml}" y1="${py(max / 1.04)}" x2="${W - mr}" y2="${py(max / 1.04)}" class="malla"/>`;
    s += `<text x="${ml}" y="${mt - 4}" class="eje">${I.f(max / 1.04)}</text>`;
    [0, TOPE_AÑOS / 2, TOPE_AÑOS].forEach(a => { s += `<text x="${px(a)}" y="${H - 6}" class="eje" text-anchor="${a === 0 ? 'start' : a === TOPE_AÑOS ? 'end' : 'middle'}">${a === 0 ? 'año 0' : a === TOPE_AÑOS ? 'año ' + a : a}</text>`; });
    s += `<line x1="${px(yNow)}" y1="${mt}" x2="${px(yNow)}" y2="${py(0)}" class="ahora"/>`;
    const fin = []; for (const k of ['A', 'B', 'C', 'D']) { const pts = ser[k].map((v, y) => v != null && isFinite(v) ? `${px(y).toFixed(1)},${py(v).toFixed(1)}` : null).filter(Boolean); if (!pts.length) continue;
      s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${COL[k]}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`; fin.push({ k, y: py(ser[k][TOPE_AÑOS]), v: ser[k][TOPE_AÑOS] }); }
    for (const k of 'ABCD') { const c = RES.S[k].colapso, v = c && ser[k][Math.min(TOPE_AÑOS, Math.floor(c.t / 52))]; if (c && v != null && isFinite(v)) s += `<circle cx="${px(c.t / 52).toFixed(1)}" cy="${py(v).toFixed(1)}" r="4.6" class="go"/>`; }
    fin.sort((a, b) => a.y - b.y); for (let i = 1; i < fin.length; i++) if (fin[i].y - fin[i - 1].y < 12) fin[i].y = fin[i - 1].y + 12;
    fin.forEach(f => { s += `<text x="${W - mr + 6}" y="${(f.y + 4).toFixed(1)}" class="fin" fill="${COL[f.k]}">${I.f(f.v)}</text>`; });
    const vals = fin.filter(f => f.v != null), ord = vals.slice().sort((a, b) => (b.v - a.v) * I.mejor), rel = ord.length > 1 ? Math.abs(ord[0].v - ord[ord.length - 1].v) / Math.max(Math.abs(ord[0].v), Math.abs(ord[ord.length - 1].v), 1e-9) : 0;
    const gana = ord.length < 2 || rel < 0.03 ? '<span class="gana">casi igual</span>' : `<span class="gana">${ord.filter(f => Math.abs(f.v - ord[0].v) / Math.max(Math.abs(ord[0].v), 1e-9) < 0.03).map(f => `<b style="background:${COL[f.k]}">${f.k}</b>`).join('')} ${I.mejor > 0 ? 'más' : 'menos'}</span>`;
    return `<figure class="ms-g"><figcaption><span>${I.t}</span>${gana}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${I.t} en ${TOPE_AÑOS} años: ${fin.map(f => f.k + ' termina en ' + I.f(f.v)).join(', ')}">${s}</svg></figure>`;
  };
  const dibujar = () => { cq('[data-cuerpo]').innerHTML = IND.map(grafico).join('');
    cq('[data-pie]').innerHTML = ['A', 'B', 'C', 'D'].map(k => { const c = RES.S[k].colapso; return `<span class="${c ? 'mal' : ''}"><b style="background:${COL[k]}">${k}</b>${c ? `<i class="go">${IC.go}</i>game over año ${añoDeSem(c.t)}` : 'sin game over'}</span>`; }).join(''); };
  const abrirCmp = async () => {
    foco = document.activeElement; cmp.hidden = false; cq('[data-x]').focus();
    cq('[data-cinfo]').innerHTML = `Se corre el mismo modelo semanal tres veces (A, B y C), con los ajustes de ahora y el mismo azar (semilla ${SIMST.semilla || 1}), hasta el año ${TOPE_AÑOS}. Cada curva es un indicador del modelo año por año; el punto rojo marca el game over (una regla incumplida 4 semanas seguidas: ${REGLAS.map(R => R.n.toLowerCase()).join(', ')}); la línea punteada es el año en que va la simulación. A la derecha, el valor al año ${TOPE_AÑOS}. La letra dice cuál sale mejor al final (si la diferencia es menor al 3 %, «casi igual»).`;
    if (!RES || RES.clave !== claveRes()) { cq('[data-cuerpo]').innerHTML = ''; cq('[data-pie]').innerHTML = ''; cq('[data-calc]').hidden = false; cq('[data-calc]').textContent = `Calculando los ${TOPE_AÑOS} años… 0 %`; }
    await calcular(); cq('[data-calc]').hidden = true; dibujar();
  };
  function cerrarCmp() { if (cmp.hidden) return; cmp.hidden = true; try { foco && foco.focus(); } catch (e) {} }
  cq('[data-x]').onclick = cerrarCmp; cmp.addEventListener('click', (ev) => { if (ev.target === cmp) cerrarCmp(); });
  cq('[data-info]').onclick = (ev) => { const p = cq('[data-cinfo]'); p.hidden = !p.hidden; ev.currentTarget.setAttribute('aria-expanded', String(!p.hidden)); };
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !cmp.hidden) cerrarCmp(); });
  $('[data-comp]').onclick = abrirCmp;

  /* ---------- BIENVENIDA (3 pasos, solo la primera vez) ---------- */
  let intro = null;
  function cerrarIntro() { if (!intro) return; intro.remove(); intro = null; lsSet(); }
  const mostrarIntro = () => {
    if (lsGet() || /[?&]intro=0/.test(location.search) || !esSimple()) return;
    const ok = () => { const L = document.getElementById('loader'); return !L || L.classList.contains('hidden') || getComputedStyle(L).display === 'none'; };
    const t = setInterval(() => { if (!ok()) return; clearInterval(t); if (lsGet() || !esSimple()) return;
      intro = document.createElement('section'); intro.id = 'ms-intro'; intro.className = 'ms-glass'; intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-labelledby', 'ms-intro-t');
      intro.innerHTML = `<h2 id="ms-intro-t">Así se usa</h2><ol><li><b>Elige</b> cómo se organiza Kennedy: A, B o C.</li><li>Dale <b>play</b> y mira ${TOPE_AÑOS} años.</li><li><b>Compara</b> los resultados.</li></ol><div><button type="button" data-ok>Entendido</button><button type="button" data-omitir>Omitir</button></div>`;
      intro.querySelector('[data-ok]').onclick = cerrarIntro; intro.querySelector('[data-omitir]').onclick = cerrarIntro; document.body.appendChild(intro); intro.querySelector('[data-ok]').focus(); }, 500);
  };
  pintar(true); mostrarIntro();
  window.KEN_MSIMPLE = { poner, pintar, esSimple, abrirComparar: abrirCmp, irA: (i) => irA(SUC[i < 0 ? SUC.length + i : i]) };
  return window.KEN_MSIMPLE;
}
