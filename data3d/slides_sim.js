/* ============ DIAPOSITIVAS DE CADA SIMULACIÓN (vista limpia, data3d/limpio.js) ============
   Al tocar una de las 6 simulaciones del panel izquierdo se abre un mazo de diapositivas de vidrio con lo que el código dice de ese par:
   la pregunta y la prueba de estrés (simulaciones12.js PARES/SIMS), el modelo (comentarios de cabecera de simulaciones12.js), la cadena
   causa → efecto (sim_ui.js CADENA) y las capas que se prenden (sim_ui.js HISTORIA), los deslizadores con sus rangos y unidades (SIMS[].sliders),
   las reglas de game over con su umbral y su fuente (REGLAS) y lo que cambia con la propuesta. Nada inventado: solo textos del código.
   Navegación: anterior/siguiente, puntos, flechas del teclado, Esc cierra. Pista con scroll-snap nativo (se desliza con el dedo). */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => (Math.round(v * 1000) / 1000).toLocaleString('es-CO');

/* El modelo de cada par: cabecera de simulaciones12.js («LAS 12 SIMULACIONES = 6 PARES») y, para el 01, los deslizadores actuales del par
   (el comentario de cabecera del 01 todavía describe el corte de suministro anterior). */
const COMUN = 'Las dos corridas del par arrancan iguales, con la misma semilla, la misma prueba y los mismos deslizadores; la única diferencia es la infraestructura propuesta. El metro Línea 1 (contexto real) está en todas. Horizonte: 15 años (780 semanas), en tres plazos.';
const MODELO = {
  1: 'La demanda de alimentos crece con la población (deslizador «Crecimiento de la demanda de alimentos») y Corabastos solo puede recibir y despachar hasta su tope («Tope de Corabastos», % sobre la demanda de hoy). Sin propuesta todo pasa por Corabastos; con propuesta los mercados de barrio y los puntos de acopio compran directo a productores de la región hasta su capacidad.',
  2: 'Cierre temporal de la Av. de las Américas (cierre forzado de sim_vida.js + cierre gradual y desvíos). Con propuesta, los pasajes y conexiones de Bavaria Común y los mercados distribuidos suman una tercera ruta de desvío: el tráfico desviado se reparte en tres y no en dos [SUP].',
  3: 'Aumento de los residuos orgánicos: los kg/persona·día suben el porcentaje elegido, en un año desde la semana de inicio. Sin propuesta: relleno Doña Juana (capacidad de referencia). Con propuesta: Estaciones Circulares en los mercados nodo (compost de proximidad).',
  4: 'Pérdida de una parte de un parche ecológico: la calidad del parche para todas sus especies baja como la raíz del área que queda. Con propuesta: conexiones vegetales (+0,2 de árboles en parques en 5 años), refugios (los módulos de huertas son hábitat) y restauración (recuperación del humedal × 1,5) [SUP: acciones de la propuesta].',
  5: 'Presión inmobiliaria extra sobre los sectores que crecen (a 800 m de las estaciones y a 1 km del predio de Bavaria) y crecimiento de la población. Con propuesta: espacios productivos y comunitarios protegidos (mercados nodo, Bavaria Común) e instrumentos de gestión del suelo (solo actúan en la corrida con propuesta).',
  6: 'Recursos insuficientes para las necesidades de varios sectores (presupuesto en % de la necesidad). Sin propuesta: una coordinación central reparte por población, con la información de hace medio año. Con propuesta: las asambleas locales (una Junta de Acción Comunal por sector, IDPAC) presentan prioridades y una federación con vocerías rotativas reparte según la necesidad reportada.'
};
/* sim_ui.js CADENA: los pasos de la historia de cada par (las cifras en vivo están en el panel de datos) */
const CADENA = {
  1: ['Lo que se le pide a Corabastos', 'Corabastos frente a su tope', 'Basura sin recoger', 'Humedales que funcionan', 'Interacciones entre especies'],
  2: ['Vía cerrada', 'Tráfico en las calles del desvío', 'Comida en la zona peor servida', 'Ruido promedio', 'Interacciones entre especies'],
  3: ['Orgánicos generados', 'Tratados en estaciones / relleno', 'Economía circular', 'Basura sin recoger', 'Humedales que funcionan'],
  4: ['Parche perdido', 'Corredores y refugios', 'Territorio con fauna', 'Especies de fauna', 'Interacciones entre especies'],
  5: ['Precio del suelo', 'Zonas desplazadas / que cambian de uso', 'Hogares en riesgo de desplazamiento', 'Tráfico'],
  6: ['Recursos que alcanzan', 'Equidad entre barrios', 'Decisiones tomadas', 'Equipamientos habilitados']
};
/* sim_ui.js HISTORIA: capas que quedan visibles mientras corre el par */
const HISTORIA = { 1: ['abasto_cont', 'basura', 'degradacion', 'predio', 'caminos'], 2: ['cierre', 'biotica', 'predio', 'caminos'], 3: ['residuos', 'basura', 'degradacion', 'predio', 'caminos'],
  4: ['biodiversidad', 'biotica', 'degradacion', 'predio', 'caminos'], 5: ['suelo', 'predio', 'caminos'], 6: ['gobernanza', 'caminos'] };
const CAPA_N = { abasto_cont: 'Contenedor de Corabastos', basura: 'Basura', degradacion: 'Degradación', predio: 'Predio de Bavaria', caminos: 'Caminos', cierre: 'Cierre de vía',
  biotica: 'Red biótica', residuos: 'Residuos', biodiversidad: 'Biodiversidad', suelo: 'Suelo', gobernanza: 'Gobernanza' };
/* reglas cuyo indicador aparece en la cadena del par */
const REGLA_PAR = { 1: ['abasto', 'humedal'], 2: ['trafico', 'ruido', 'abasto'], 3: ['residuos', 'humedal'], 4: ['fauna', 'habitat'], 5: ['trafico'], 6: [] };

const ICO = {
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>'
};

let M = null;
const cargar = () => M ? Promise.resolve(M) : import('./simulaciones12.js?v=27').then(m => (M = m));

function slidesDe(par, con) {
  const P = M.PARES.find(p => p.par === par), S = M.SIMS.find(s => s.par === par && s.propuesta === con);
  if (!P || !S) return null;
  const nn = String(par).padStart(2, '0'), nombre = P.n.slice(3), sl = S.sliders || [];
  const lado = con ? 'con propuesta' : 'sin propuesta';
  const cad = CADENA[par] || [];
  const flujo = `<ol class="sl-flujo">
      <li class="ori"><small>Prueba de estrés</small><b>${esc(P.prueba)}</b></li>
      ${cad.map((t, i) => `<li><small>${String(i + 1).padStart(2, '0')}</small><b>${esc(t)}</b></li>`).join('')}
    </ol>`;
  const capas = (HISTORIA[par] || []).map(k => `<span class="sl-chip">${esc(CAPA_N[k] || k)}</span>`).join('');
  const vars = sl.map(s => { const f = Math.max(0, Math.min(1, (s.val - s.min) / ((s.max - s.min) || 1)));
    return `<li><div class="sl-vh"><b>${esc(s.n)}</b><span>${num(s.val)} <small>${esc(s.unidad || '')}</small></span></div>
      <div class="sl-rango" style="--f:${(f * 100).toFixed(1)}%"><i></i></div>
      <div class="sl-vr"><span>${num(s.min)}</span><span>${num(s.max)}</span></div>
      ${s.ayuda ? `<p>${esc(s.ayuda)}</p>` : ''}</li>`; }).join('');
  const rel = REGLA_PAR[par] || [];
  const reglas = M.REGLAS.slice().sort((a, b) => (rel.includes(b.k) ? 1 : 0) - (rel.includes(a.k) ? 1 : 0)).map(r => `<li class="${rel.includes(r.k) ? 'rel' : ''}">
      <div class="sl-rh"><b>${esc(r.n)}</b><span>${num(r.umbral)} <small>${esc(r.unidad)}</small></span></div>
      <p>Game over si ${esc(r.txt)} durante ${r.semanas} semanas seguidas.</p>
      <details><summary>Fuente</summary><p>${esc(r.fuente)}</p></details></li>`).join('');
  return { titulo: `${nn} · ${nombre}`, kicker: `Simulación ${nn} · ${lado}`, slides: [
    { t: 'Pregunta', h: `<p class="sl-kick">Prueba de estrés</p><h3 class="sl-big">${esc(P.prueba)}</h3>
        <p class="sl-preg">${esc(S.pregunta)}</p>
        <dl class="sl-dl"><dt>Qué se ve en el mapa</dt><dd>${esc(P.visible)}</dd></dl>` },
    { t: 'Modelo', h: `<p class="sl-kick">Cómo se simula</p><p class="sl-txt">${esc(MODELO[par] || '')}</p>
        <p class="sl-txt sl-tenue">${esc(COMUN)}</p>
        <dl class="sl-dl"><dt>Escenario de esta corrida</dt><dd>${esc(S.desc)}</dd></dl>` },
    { t: 'Cadena causa y efecto', h: `<p class="sl-kick">Cadena causa → efecto</p>${flujo}
        <p class="sl-kick">Capas que se prenden en el mapa</p><div class="sl-chips">${capas}</div>` },
    { t: 'Variables', h: `<p class="sl-kick">Variables · ${sl.length} deslizadores (valor inicial, rango)</p><ul class="sl-vars">${vars}</ul>
        <p class="sl-txt sl-tenue">Se ajustan en el bloque Variables del panel izquierdo; al moverlas el modelo se recalcula hasta la semana en curso.</p>` },
    { t: 'Reglas de game over', h: `<p class="sl-kick">Reglas de game over · iguales para las 12 simulaciones</p><ul class="sl-reglas">${reglas}</ul>
        ${rel.length ? '<p class="sl-txt sl-tenue">Marcadas: reglas cuyo indicador aparece en la cadena de este par.</p>' : ''}` },
    { t: 'Sin y con propuesta', h: `<p class="sl-kick">Qué cambia con la propuesta</p>
        <div class="sl-comp"><section class="${con ? '' : 'act'}"><h4>Kennedy sin propuesta</h4><p>${esc(P.sin)}</p><p class="sl-tenue">${esc(P.pregSin)}</p></section>
        <section class="con ${con ? 'act' : ''}"><h4>Kennedy con propuesta</h4><p>${esc(P.con)}</p><p class="sl-tenue">${esc(P.pregCon)}</p></section></div>
        <button type="button" class="sl-correr">${ICO.play}<span>Correr esta simulación</span></button>` }
  ] };
}

export function crearSlides({ alCorrer } = {}) {
  const box = document.createElement('section');
  box.id = 'lp-slides'; box.hidden = true; box.tabIndex = -1;
  box.setAttribute('aria-roledescription', 'carrusel'); box.setAttribute('aria-labelledby', 'sl-tit');
  document.body.appendChild(box);
  let n = 0, actual = 0, pendiente = null, volverA = null, clave = '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s) => box.querySelector(s);

  function pintar(d) {
    n = d.slides.length;
    box.innerHTML = `<header class="sl-cab"><div><p class="sl-kicker">${esc(d.kicker)}</p><h2 id="sl-tit">${esc(d.titulo)}</h2></div>
        <button type="button" class="sl-x" aria-label="Cerrar diapositivas">${ICO.x}</button></header>
      <div class="sl-track" role="group" aria-label="Diapositivas">${d.slides.map((s, i) => `<article class="sl" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${n}: ${esc(s.t)}"><div class="sl-in">${s.h}</div></article>`).join('')}</div>
      <footer class="sl-pie"><button type="button" class="sl-prev" aria-label="Diapositiva anterior">${ICO.prev}</button>
        <nav class="sl-puntos" aria-label="Escoger diapositiva">${d.slides.map((s, i) => `<button type="button" aria-label="Ir a ${i + 1}: ${esc(s.t)}"${i ? '' : ' aria-current="true"'}></button>`).join('')}</nav>
        <span class="sl-cont"><b>1</b> / ${n}</span>
        <button type="button" class="sl-next" aria-label="Diapositiva siguiente">${ICO.next}</button></footer>
      <p class="sl-oculto" role="status" aria-live="polite"></p>`;
    const tr = $('.sl-track');
    $('.sl-x').onclick = cerrar;
    $('.sl-prev').onclick = () => ir((pendiente ?? actual) - 1);
    $('.sl-next').onclick = () => ir((pendiente ?? actual) + 1);
    box.querySelectorAll('.sl-puntos button').forEach((b, i) => { b.onclick = () => ir(i); });
    const c = $('.sl-correr'); if (c) c.onclick = () => { cerrar(); if (alCorrer) alCorrer(); };
    let raf = 0;
    tr.addEventListener('scroll', () => { if (pendiente != null || raf) return; raf = requestAnimationFrame(() => { raf = 0; marcar(idx()); }); }, { passive: true });
    const asentar = () => { const i = idx(); pendiente = null; const antes = actual; actual = i; marcar(i); botones(); if (i !== antes) $('.sl-oculto').textContent = `Diapositiva ${i + 1} de ${n}`; };
    if ('onscrollend' in window) tr.addEventListener('scrollend', asentar);
    else { let t = 0; tr.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(asentar, 120); }, { passive: true }); }
    actual = 0; pendiente = null; botones();
  }
  const idx = () => { const tr = $('.sl-track'); return tr ? Math.max(0, Math.min(n - 1, Math.round(tr.scrollLeft / (tr.clientWidth || 1)))) : 0; };
  function marcar(i) { box.querySelectorAll('.sl-puntos button').forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); const c = $('.sl-cont b'); if (c) c.textContent = i + 1; }
  function botones() { const p = $('.sl-prev'), x = $('.sl-next'), i = pendiente ?? actual; if (!p) return;
    const fp = document.activeElement === p, fx = document.activeElement === x;
    p.disabled = i <= 0; x.disabled = i >= n - 1;
    if (fp && p.disabled) x.focus(); if (fx && x.disabled) p.focus(); }
  function ir(i) { const tr = $('.sl-track'); if (!tr) return; i = Math.max(0, Math.min(n - 1, i)); if (i === (pendiente ?? actual)) return;
    pendiente = i; marcar(i); botones();
    tr.scrollTo({ left: i * tr.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth' });
    if (reduce.matches) setTimeout(() => { if (pendiente === i) { pendiente = null; actual = i; botones(); } }, 50); }

  async function abrir(par, con, desde) {
    await cargar(); const d = slidesDe(par, !!con); if (!d) return;
    const k = par + '|' + !!con, mismo = !box.hidden && clave.split('|')[0] === String(par), pos = mismo ? actual : 0; /* mismo par (otro lado): se queda en la misma diapositiva */
    clave = k; pintar(d); if (desde || !mismo) volverA = desde || document.activeElement;
    box.hidden = false; document.documentElement.classList.add('lp-slides-on');
    if (pos) requestAnimationFrame(() => { const tr = $('.sl-track'); tr.scrollLeft = pos * tr.clientWidth; actual = pos; marcar(pos); botones(); });
    box.focus({ preventScroll: true });
  }
  function cerrar() { if (box.hidden) return; box.hidden = true; clave = ''; document.documentElement.classList.remove('lp-slides-on');
    if (volverA && volverA.isConnected && volverA.focus) volverA.focus({ preventScroll: true }); volverA = null; }

  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    const t = e.target, tag = t && t.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (t && t.isContentEditable)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); ir((pendiente ?? actual) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir((pendiente ?? actual) - 1); }
  });
  addEventListener('resize', () => { const tr = $('.sl-track'); if (tr && !box.hidden) tr.scrollLeft = actual * tr.clientWidth; });
  return { abrir, cerrar, get abierto() { return !box.hidden; } };
}
