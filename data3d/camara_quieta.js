/* ============ LA CÁMARA NUNCA SE MUEVE SOLA (vista limpia del simulador) ============
   Pedido de la autora: «que nunca se mueva solo». Varios módulos movían la cámara por su cuenta (vuelos de escenarios y estrategias,
   vuelo de llegada, órbitas…). Regla: la cámara solo puede EMPEZAR a moverse si la persona acaba de tocar algo (clic, arrastre, rueda,
   toque o tecla en los últimos VENTANA ms); un movimiento que empezó así puede terminar.
   · T3.anim (vuelos de index.html y de otros módulos): si se pide sin una acción reciente, se ignora.
   · KEN_OJO.ir (Ojo de Dios): igual; cerrar() siempre se permite (vuelve a donde estaba).
   · Cualquier otro cambio directo de la cámara sin acción reciente, sin vuelo en curso y sin «Seguir» activo se deshace en el mismo cuadro. */
import { RELOJ } from './reloj.js?v=5';

const VENTANA = 2500; // ms: incluye la inercia de los controles después de soltar el mouse

export function iniciarCamaraQuieta({ T3 }) {
  // se arma 3 s después de que se va la pantalla de carga: antes la cámara toma su vista inicial
  let armado = false;
  (function esperar() { const L = document.getElementById('loader'); if (L && !L.classList.contains('hidden')) return void setTimeout(esperar, 500); setTimeout(() => { armado = true; }, 3000); })();
  let ultimaAccion = -1e9;
  const marcar = () => { ultimaAccion = performance.now(); };
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'touchmove', 'keydown']) addEventListener(ev, (e) => { if (ev === 'pointermove' && !e.buttons) return; marcar(); }, { capture: true, passive: true });
  const reciente = () => !armado || performance.now() - ultimaAccion < VENTANA;

  // T3.anim solo si la persona acaba de hacer algo
  let anim = T3.anim || null;
  Object.defineProperty(T3, 'anim', { configurable: true, get: () => anim, set: (v) => { if (v && !reciente()) return; anim = v; } });

  // Ojo de Dios: ir() solo con una acción reciente
  const envolverOjo = () => { const O = window.KEN_OJO; if (!O || O._quieta) return; const ir0 = O.ir; O.ir = (o) => reciente() ? ir0(o) : Promise.resolve(false); O._quieta = true; };
  envolverOjo(); setInterval(envolverOjo, 1000);

  // cualquier otro movimiento sin acción: se deshace
  const cam = T3.camera, tg = T3.orbit && T3.orbit.target, P = cam.position.clone(), C = tg ? tg.clone() : null, Q = cam.quaternion.clone();
  RELOJ.alDibujar(() => {
    const libre = reciente() || anim || T3.siguiendo || (window.KEN_OJO && window.KEN_OJO.volando);
    if (libre) { P.copy(cam.position); Q.copy(cam.quaternion); if (C) C.copy(tg); return; }
    const movio = cam.position.distanceToSquared(P) > 1e-4 || (C && tg.distanceToSquared(C) > 1e-4);
    if (movio) { cam.position.copy(P); cam.quaternion.copy(Q); if (C) tg.copy(C); cam.updateMatrixWorld(); }
  });
}
