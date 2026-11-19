/* ============ CONTROL DE TIEMPO (interfaz del reloj universal, data3d/reloj.js) ============
   Un solo control en pantalla para las dos escalas del mismo reloj:
   · AÑOS (modelo semanal): ▶/pausa y semanas por segundo (1, 4, 13, 26, 52) · «Año N · semana S».
   · DÍA (segundos: carros, fauna, aves, cielo): ▶/pausa, 1×, 60×, 600×, 3600×, +2 h · «día de la semana · HH:MM».
   Si el equipo no alcanza la velocidad del día pedida, muestra la velocidad efectiva (sin acumular deuda).
   Las demás interfaces de tiempo (dial del día, botones de hora, gráfica del tablero, botones 22:00/02:00) mandan al MISMO reloj:
   piden «avanzar hasta esa hora» (RELOJ.irAMinuto) y aquí se ve el avance con un botón para cancelarlo.
   «+2 h»: salto sin dibujo (RELOJ.saltar): la lógica de todos los sistemas corre paso a paso sin dibujar la escena; mientras tanto una
   capa bloquea la interfaz (nada cambia la corrida a mitad del salto) y muestra el progreso, la fecha simulada y Cancelar (también Esc). */
import { RELOJ as R0, VELOCIDADES, VEL_AÑOS } from './reloj.js?v=5';
export const SALTO_PASOS = 2 * 3600; // +2 horas simuladas (pasos de 1 s)

const CSS = `
#trafficHud{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:84px!important;transform:translateX(-50%);width:max-content!important;max-width:calc(100vw - 24px);box-sizing:border-box;padding:7px 10px!important;border-radius:14px!important;z-index:18}
#trafficHud .rt-fila{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center}
#trafficHud .rt-fecha{font-variant-numeric:tabular-nums;font-weight:600;font-size:13px;letter-spacing:.01em;white-space:nowrap}
#trafficHud .rt-play{padding:0;font-size:13px;line-height:1;border-radius:9px;cursor:pointer;width:34px;height:30px}
#trafficHud .rt-vel{display:flex;gap:4px}
#trafficHud .rt-vel button{padding:0 9px;height:30px;min-width:46px;font-size:12px;font-weight:600;border-radius:9px;cursor:pointer;font-variant-numeric:tabular-nums;background:rgba(148,163,184,.12);color:#cbd5e1;border:1px solid rgba(148,163,184,.25)}
#trafficHud .rt-vel button.on{background:linear-gradient(100deg,#bae6fd,#7dd3fc);color:#04121c;border-color:transparent}
#trafficHud .rt-info{margin-top:5px;font-size:11px;line-height:1.35;color:#94a3b8;display:flex;gap:8px;align-items:center;justify-content:center}
#trafficHud .rt-info.vacio{display:none}
#trafficHud .rt-info button{font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer}
#trafficHud .rt-info .rt-alerta{color:#fbbf24}
#trafficHud .rt-salto{padding:0 10px;height:30px;font-size:12px;font-weight:600;border-radius:9px;cursor:pointer;font-variant-numeric:tabular-nums;background:transparent;color:#e2e8f0;border:1px solid rgba(186,230,253,.45);white-space:nowrap}
#trafficHud .rt-salto:hover{background:rgba(186,230,253,.1)}#trafficHud .rt-salto:disabled{opacity:.4;cursor:default}
#trafficHud .rt-info .rt-ok{color:#a7f3d0}
#trafficHud .rt-fila+.rt-fila{margin-top:6px}
#trafficHud .rt-et{width:34px;font:600 9.5px var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;text-align:left}
#trafficHud .rt-años .rt-fecha{min-width:128px}#trafficHud .rt-dia .rt-fecha{min-width:112px}
#trafficHud .rt-años .rt-vel button{min-width:36px;padding:0 6px}
#trafficHud .rt-años .rt-vel button.on{background:linear-gradient(100deg,#d9f99d,#bef264);color:#132004}
#trafficHud .rt-u{font-size:11px;color:#94a3b8;margin-left:-4px}
#trafficHud .rt-exp{margin:6px 0 0;font-size:11px;line-height:1.35;color:#94a3b8;text-align:center}
#rt-velo{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;padding:0 16px 150px;box-sizing:border-box;background:rgba(5,8,12,.42);cursor:progress}
#rt-velo.on{display:flex}
#rt-velo .rs-c{width:min(380px,100%);box-sizing:border-box;padding:16px 18px 14px;border-radius:14px;background:rgba(13,16,20,.94);border:1px solid rgba(255,255,255,.09);box-shadow:0 16px 40px rgba(0,0,0,.4);color:#e5e7eb;font:400 12px/1.45 var(--ui-sans,Inter,system-ui,sans-serif);font-variant-numeric:tabular-nums;cursor:default}
#rt-velo .rs-h{font:500 9.5px var(--ui-mono,'JetBrains Mono',ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;color:#7b858b}
#rt-velo .rs-t{margin:3px 0 10px;font-size:15px;font-weight:500;letter-spacing:.005em}
#rt-velo .rs-f{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:600}#rt-velo .rs-f span:last-child{color:#94a3b8;font-weight:500}
#rt-velo .rs-b{position:relative;height:4px;margin:8px 0 7px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
#rt-velo .rs-b i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:2px;background:#7dd3fc}
#rt-velo .rs-b.ind i{width:30%;animation:rs-ind 1.1s ease-in-out infinite alternate}
@keyframes rs-ind{from{left:0}to{left:70%}}
#rt-velo .rs-m{display:flex;justify-content:space-between;gap:10px;color:#94a3b8;font-size:11px}
#rt-velo .rs-n{margin-top:9px;color:#7b858b;font-size:10.5px}
#rt-velo .rs-a{display:flex;justify-content:flex-end;margin-top:12px}
#rt-velo .rs-a button{font:600 12px var(--ui-sans,Inter,system-ui,sans-serif);padding:7px 14px;border-radius:9px;cursor:pointer;background:rgba(148,163,184,.12);color:#e2e8f0;border:1px solid rgba(148,163,184,.3)}
#rt-velo .rs-a button:hover{background:rgba(148,163,184,.22)}#rt-velo .rs-a button:disabled{opacity:.5;cursor:default}
@media (prefers-reduced-motion:reduce){#rt-velo .rs-b.ind i{animation:none;width:100%;opacity:.35}}
@media (max-width:760px){#trafficHud{top:58px!important;bottom:auto!important;width:calc(100vw - 16px)!important;max-width:none;padding:6px 8px!important}#toast{top:196px!important}
  #trafficHud .rt-fila{gap:6px 8px;justify-content:space-between}#trafficHud .rt-fecha{flex:1 1 auto;text-align:left;font-size:12px}#trafficHud .rt-vel{flex:1 1 auto}#trafficHud .rt-vel button{flex:1;min-width:0;padding:0 4px}#trafficHud .rt-salto{flex:none}
  #trafficHud .rt-info{margin-top:4px;flex-wrap:wrap}
  #trafficHud .rt-et{width:auto;font-size:9px;letter-spacing:.08em}#trafficHud .rt-u{display:none}#trafficHud .rt-fila+.rt-fila{margin-top:4px}
  #trafficHud .rt-años .rt-fecha,#trafficHud .rt-dia .rt-fecha{min-width:0;flex:1 1 auto}#trafficHud .rt-años .rt-vel button{min-width:0;padding:0 2px}
  #trafficHud .rt-exp{margin-top:4px;font-size:10px}
  /* el salto sin dibujo: la tarjeta va abajo (sobre el selector de escenarios, que queda bloqueado), nunca sobre la fila de velocidades ni sobre el panel de escenarios */
  #rt-velo{align-items:flex-end;padding:0 8px 78px}#rt-velo .rs-c{padding:12px 14px 10px}#rt-velo .rs-n{display:none}#rt-velo .rs-t{margin:2px 0 6px}#rt-velo .rs-a{margin-top:8px}}
`;
const pad = (n) => String(n).padStart(2, '0');
const durTxt = (seg) => { seg = Math.max(0, Math.round(seg)); const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60); return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m ? m + ' min' : seg + ' s'; };
const realTxt = (ms) => { const s = ms / 1000; return s < 60 ? (s < 10 ? s.toFixed(1).replace('.', ',') : Math.round(s)) + ' s' : Math.floor(s / 60) + ' min ' + pad(Math.round(s % 60)) + ' s'; };

export function crearControlTiempo({ RELOJ = R0, host } = {}) {
  host = host || document.getElementById('trafficHud'); if (!host) return null;
  if (!document.getElementById('rt-css')) { const s = document.createElement('style'); s.id = 'rt-css'; s.textContent = CSS; document.head.appendChild(s); }
  host.setAttribute('aria-label', 'Control de tiempo de la simulación');
  // dos filas, un solo reloj: AÑOS (escala del modelo semanal) y DÍA (escala de segundos: carros, fauna, aves, cielo)
  host.innerHTML = `<div class="rt-fila rt-años"><span class="rt-et">Años</span><button type="button" class="rt-play" id="rt-playA" aria-label="Pausar los años">❚❚</button>
      <span class="rt-fecha" id="rt-fechaA" role="timer" aria-live="off">Año 1 · semana 1</span>
      <div class="rt-vel" id="rt-velA" role="group" aria-label="Semanas por segundo">${VEL_AÑOS.map(v => `<button type="button" data-v="${v}" aria-label="${v} semanas por segundo" title="${v} ${v === 1 ? 'semana' : 'semanas'} por segundo${v === 52 ? ' (un año por segundo)' : ''}">${v}</button>`).join('')}</div><span class="rt-u">sem/s</span></div>
    <div class="rt-fila rt-dia"><span class="rt-et">Día</span><button type="button" class="rt-play" id="rt-play" aria-label="Pausar el día">❚❚</button>
      <span class="rt-fecha" id="rt-fecha" role="timer" aria-live="off">lunes · 06:30</span>
      <div class="rt-vel" id="rt-vel" role="group" aria-label="Velocidad del día">${VELOCIDADES.map(v => `<button type="button" data-v="${v}" aria-label="Velocidad ${v} veces">${v}×</button>`).join('')}</div>
      <button type="button" class="rt-salto" id="rt-salto" title="Calcula las próximas 2 horas del día sin dibujar la escena" aria-label="Avanzar 2 horas del día sin dibujar">+2 h</button>
      <button type="button" class="rt-salto" id="rt-salto6" title="Calcula las próximas 6 horas del día sin dibujar la escena. Tarda unos 5 minutos (más a mediodía); se puede cancelar" aria-label="Avanzar 6 horas del día sin dibujar (tarda unos 5 minutos)">+6 h</button></div>
    <p class="rt-exp">Los años los mueve el modelo semanal; los carros y animales muestran un día de esa semana.</p>
    <div class="rt-info vacio" id="rt-info"><span id="rt-msg"></span></div>`;
  const $ = (id) => host.querySelector('#' + id), fecha = $('rt-fecha'), play = $('rt-play'), vel = $('rt-vel'), msg = $('rt-msg'), info = $('rt-info'), bSalto = $('rt-salto'), bSalto6 = $('rt-salto6');
  const fechaA = $('rt-fechaA'), playA = $('rt-playA'), velA = $('rt-velA');
  play.onclick = () => { if (!RELOJ.arrancado) { RELOJ.arrancar(); return; } if (RELOJ.destino) RELOJ.cancelarDestino(); RELOJ.alternar(); };
  vel.querySelectorAll('button').forEach(b => b.onclick = () => { RELOJ.ponerVel(+b.dataset.v); });
  playA.onclick = () => { if (RELOJ.saltando) return; RELOJ.pausarAños(!RELOJ.pausaSem); };
  velA.querySelectorAll('button').forEach(b => b.onclick = () => { if (!RELOJ.saltando) RELOJ.ponerVelAños(+b.dataset.v); });
  const pintar = () => {
    play.textContent = RELOJ.pausa || !RELOJ.arrancado ? '▶' : '❚❚';
    play.setAttribute('aria-label', RELOJ.pausa ? 'Reanudar el día' : 'Pausar el día');
    vel.querySelectorAll('button').forEach(b => b.classList.toggle('on', !RELOJ.pausa && +b.dataset.v === RELOJ.vel));
    bSalto.disabled = bSalto6.disabled = !RELOJ.arrancado || RELOJ.saltando;
    playA.textContent = RELOJ.pausaSem ? '▶' : '❚❚';
    playA.setAttribute('aria-label', RELOJ.pausaSem ? 'Correr los años' : 'Pausar los años');
    velA.querySelectorAll('button').forEach(b => b.classList.toggle('on', !RELOJ.pausaSem && +b.dataset.v === RELOJ.velSem));
    fechaA.textContent = RELOJ.textoAños();
  };
  RELOJ.alCambiar(pintar); pintar();

  /* ---------- salto «+2 h» sin dibujo: capa que bloquea la interfaz, progreso y cancelar ---------- */
  const velo = document.createElement('div'); velo.id = 'rt-velo';
  velo.innerHTML = `<div class="rs-c" role="dialog" aria-modal="true" aria-labelledby="rs-t" aria-describedby="rs-n">
      <div class="rs-h">Salto sin dibujo</div><div class="rs-t" id="rs-t">Avanzando 2 horas</div>
      <div class="rs-f"><span id="rs-fecha" role="timer" aria-live="off"></span><span id="rs-meta"></span></div>
      <div class="rs-b" id="rs-b" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Avance del salto"><i id="rs-i"></i></div>
      <div class="rs-m"><span id="rs-p"></span><span id="rs-q"></span></div>
      <div class="rs-n" id="rs-n">Cada segundo simulado corre con el mismo modelo que a velocidad normal; la escena se vuelve a dibujar al terminar.</div>
      <div class="rs-a"><button type="button" id="rs-x">Cancelar</button></div></div>`;
  document.body.appendChild(velo);
  const q = (id) => velo.querySelector('#' + id), rsF = q('rs-fecha'), rsM = q('rs-meta'), rsB = q('rs-b'), rsI = q('rs-i'), rsP = q('rs-p'), rsQ = q('rs-q'), rsX = q('rs-x'), rsT = q('rs-t');
  let focoAntes = null, aviso = null; // aviso: { txt, ok, hasta } (mensaje después del salto)
  rsX.onclick = () => { RELOJ.cancelarSalto(); rsX.disabled = true; rsX.textContent = 'Cancelando…'; };
  // mientras salta nada de la interfaz cambia la corrida: la capa tapa todo y el teclado queda bloqueado (Esc cancela)
  const teclas = (e) => { if (!RELOJ.saltando) return; if (e.key === 'Escape') { e.preventDefault(); rsX.click(); } else if (e.key !== 'Tab' && e.target !== rsX) { e.preventDefault(); } e.stopImmediatePropagation(); };
  addEventListener('keydown', teclas, true); addEventListener('keyup', (e) => { if (RELOJ.saltando) e.stopImmediatePropagation(); }, true);
  const pintarSalto = () => {
    const J = RELOJ.salto; if (!J) return;
    const hecho = J.t - J.desde, frac = J.n ? hecho / J.n : 0;
    rsF.textContent = RELOJ.texto(); fecha.textContent = RELOJ.textoDia(); rsM.textContent = '→ ' + RELOJ.hhmm(J.hasta);
    if (J.fase === 'preparando') { rsB.classList.add('ind'); rsI.style.width = ''; rsP.textContent = 'Descargando la grabación de tráfico…'; rsQ.textContent = ''; }
    else { rsB.classList.remove('ind'); rsI.style.width = (frac * 100).toFixed(1) + '%'; rsB.setAttribute('aria-valuenow', Math.round(frac * 100));
      rsP.textContent = Math.floor(frac * 100) + ' % · ' + durTxt(hecho) + ' de ' + durTxt(J.n) + ' simuladas';
      const resta = hecho > 30 && J.ms > 500 ? J.ms / hecho * (J.n - hecho) : NaN; rsQ.textContent = isFinite(resta) ? 'faltan ~' + realTxt(resta) : ''; }
    if (J.cancelado) { rsT.textContent = 'Cancelando…'; }
  };
  RELOJ.alCambiar((que) => {
    if (que === 'salto') { focoAntes = document.activeElement; aviso = null; msg.textContent = ''; info.classList.add('vacio'); rsT.textContent = 'Avanzando ' + durTxt(RELOJ.salto.n); rsX.disabled = false; rsX.textContent = 'Cancelar'; velo.classList.add('on'); pintarSalto(); setTimeout(() => { try { rsX.focus(); } catch (e) {} }, 0); }
    else if (que === 'salto-progreso') pintarSalto();
    else if (que === 'salto-fin') {
      velo.classList.remove('on'); const J = RELOJ.ultimoSalto, hecho = J ? J.t - J.desde : 0;
      if (J) aviso = J.cancelado ? { txt: 'Salto cancelado en ' + RELOJ.hhmm() + ' · ' + durTxt(hecho) + ' simuladas en ' + realTxt(J.msTotal), ok: false, hasta: 7 }
        : { txt: 'Avanzó ' + durTxt(hecho) + ' simuladas en ' + realTxt(J.msTotal) + (J.avisos.length ? ' · ' + J.avisos[0] : ''), ok: true, hasta: 7 };
      fecha.textContent = RELOJ.textoDia(); tUi = 0;
      try { if (focoAntes && focoAntes.focus) focoAntes.focus(); } catch (e) {}
    }
  });
  bSalto.onclick = () => { if (!RELOJ.saltando && RELOJ.arrancado) RELOJ.saltar(SALTO_PASOS); };
  bSalto6.onclick = () => { if (!RELOJ.saltando && RELOJ.arrancado) RELOJ.saltar(3 * SALTO_PASOS); }; // +6 h: el mismo salto paso a paso, tres veces más largo (medido: ~4 min 40 s de 06:30 a 12:30)
  RELOJ.alCambiar((que) => { if (que === 'salto' && RELOJ.salto && RELOJ.salto.n > SALTO_PASOS) q('rs-n').textContent = 'Este salto de 6 horas tarda unos 5 minutos (más a mediodía, cuando hay más carros, personas y animales). Puedes cancelarlo cuando quieras.'; else if (que === 'salto') q('rs-n').textContent = 'Cada segundo simulado corre con el mismo modelo que a velocidad normal; la escena se vuelve a dibujar al terminar.'; });

  let tUi = 0, cancelar = null;
  // se actualiza ~4 veces por segundo (leer el reloj no cuesta; escribir texto en el DOM sí)
  RELOJ.alDibujar((i) => {
    if (aviso) aviso.hasta -= i.dtReal;
    if ((tUi -= i.dtReal) > 0) return; tUi = 0.25;
    fecha.textContent = RELOJ.textoDia(); fechaA.textContent = RELOJ.textoAños();
    const st = RELOJ.stats, d = RELOJ.destino; let txt = '', alerta = false;
    if (aviso && aviso.hasta > 0 && !d) { msg.textContent = aviso.txt; msg.className = aviso.ok ? 'rt-ok' : 'rt-alerta'; info.classList.remove('vacio'); if (cancelar) { cancelar.remove(); cancelar = null; } return; }
    aviso = null;
    if (d) {
      const falta = Math.max(0, d.t - RELOJ.t), h = Math.floor(falta / 3600), m = Math.ceil((falta % 3600) / 60);
      txt = 'Avanzando hasta ' + (d.motivo || 'la hora elegida') + ' · faltan ' + (h ? h + ' h ' : '') + m + ' min';
      if (!cancelar) { cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.textContent = 'Cancelar'; cancelar.onclick = () => RELOJ.cancelarDestino(); info.appendChild(cancelar); }
    } else {
      if (cancelar) { cancelar.remove(); cancelar = null; }
      const pedida = RELOJ.vel, ef = st.velEfectiva;
      if (RELOJ.corriendo && isFinite(pedida) && pedida > 1 && ef < pedida * 0.85 && st.motivo) { txt = 'El equipo no alcanza ' + pedida + '×: corre a ~' + Math.max(1, Math.round(ef)) + '×'; alerta = true; }
      else if (RELOJ.pausa) txt = 'Día en pausa';
      else if (!RELOJ.arrancado) txt = 'Cargando…';
    }
    msg.textContent = txt; msg.className = alerta ? 'rt-alerta' : ''; info.classList.toggle('vacio', !txt);
  });
  return { pintar };
}
