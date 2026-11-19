/* ============ CONTROL DE TIEMPO (interfaz del reloj universal, data3d/reloj.js) ============
   Un solo control en pantalla para toda la simulación: pausa/reanudar, velocidad (1×, 60×, 600×, 3600×) y la fecha de la simulación
   «Año N · semana S · día de la semana · HH:MM». Si el equipo no alcanza la velocidad pedida, muestra la velocidad efectiva (sin acumular deuda).
   Las demás interfaces de tiempo (dial del día, botones de hora, gráfica del tablero, botones 22:00/02:00) mandan al MISMO reloj:
   piden «avanzar hasta esa hora» (RELOJ.irAMinuto) y aquí se ve el avance con un botón para cancelarlo. */
import { RELOJ as R0, VELOCIDADES } from './reloj.js?v=2';

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
@media (max-width:760px){#trafficHud{top:64px!important;bottom:auto!important;width:calc(100vw - 24px)!important}#toast{top:150px!important}#trafficHud .rt-vel{flex:1 1 100%}#trafficHud .rt-vel button{flex:1}#trafficHud .rt-fecha{font-size:12px}}
`;

export function crearControlTiempo({ RELOJ = R0, host } = {}) {
  host = host || document.getElementById('trafficHud'); if (!host) return null;
  if (!document.getElementById('rt-css')) { const s = document.createElement('style'); s.id = 'rt-css'; s.textContent = CSS; document.head.appendChild(s); }
  host.setAttribute('aria-label', 'Control de tiempo de la simulación');
  host.innerHTML = `<div class="rt-fila"><span class="rt-fecha" id="rt-fecha" role="timer" aria-live="off">Año 1 · semana 1 · lunes · 06:30</span>
      <button type="button" class="rt-play" id="rt-play" aria-label="Pausar simulación">❚❚</button>
      <div class="rt-vel" id="rt-vel" role="group" aria-label="Velocidad de la simulación">${VELOCIDADES.map(v => `<button type="button" data-v="${v}" aria-label="Velocidad ${v} veces">${v}×</button>`).join('')}</div></div>
    <div class="rt-info vacio" id="rt-info"><span id="rt-msg"></span></div>`;
  const $ = (id) => host.querySelector('#' + id), fecha = $('rt-fecha'), play = $('rt-play'), vel = $('rt-vel'), msg = $('rt-msg'), info = $('rt-info');
  play.onclick = () => { if (!RELOJ.arrancado) { RELOJ.arrancar(); return; } if (RELOJ.destino) RELOJ.cancelarDestino(); RELOJ.alternar(); };
  vel.querySelectorAll('button').forEach(b => b.onclick = () => { RELOJ.ponerVel(+b.dataset.v); });
  const pintar = () => {
    play.textContent = RELOJ.pausa || !RELOJ.arrancado ? '▶' : '❚❚';
    play.setAttribute('aria-label', RELOJ.pausa ? 'Reanudar simulación' : 'Pausar simulación');
    vel.querySelectorAll('button').forEach(b => b.classList.toggle('on', !RELOJ.pausa && +b.dataset.v === RELOJ.vel));
  };
  RELOJ.alCambiar(pintar); pintar();
  let tUi = 0, cancelar = null;
  // se actualiza ~4 veces por segundo (leer el reloj no cuesta; escribir texto en el DOM sí)
  RELOJ.alDibujar((i) => {
    if ((tUi -= i.dtReal) > 0) return; tUi = 0.25;
    fecha.textContent = RELOJ.texto();
    const st = RELOJ.stats, d = RELOJ.destino; let txt = '', alerta = false;
    if (d) {
      const falta = Math.max(0, d.t - RELOJ.t), h = Math.floor(falta / 3600), m = Math.ceil((falta % 3600) / 60);
      txt = 'Avanzando hasta ' + (d.motivo || 'la hora elegida') + ' · faltan ' + (h ? h + ' h ' : '') + m + ' min';
      if (!cancelar) { cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.textContent = 'Cancelar'; cancelar.onclick = () => RELOJ.cancelarDestino(); info.appendChild(cancelar); }
    } else {
      if (cancelar) { cancelar.remove(); cancelar = null; }
      const pedida = RELOJ.vel, ef = st.velEfectiva;
      if (RELOJ.corriendo && isFinite(pedida) && pedida > 1 && ef < pedida * 0.85 && st.motivo) { txt = 'El equipo no alcanza ' + pedida + '×: corre a ~' + Math.max(1, Math.round(ef)) + '×'; alerta = true; }
      else if (RELOJ.pausa) txt = 'En pausa';
      else if (!RELOJ.arrancado) txt = 'Cargando…';
    }
    msg.textContent = txt; msg.className = alerta ? 'rt-alerta' : ''; info.classList.toggle('vacio', !txt);
  });
  return { pintar };
}
