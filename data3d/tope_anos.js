/* ============ TOPE DE 50 AÑOS del modelo semanal ============
   La simulación (data3d/sim_vida.js, llevada por el reloj de data3d/reloj.js) se detiene sola al llegar al año 50 (semana 2600).
   No cambia las reglas del modelo: solo usa RELOJ.detenerSemEn (el mismo freno que usan las pruebas) y vuelve a armarlo cada vez que
   se gasta, así también frena al reiniciar. Si alguien pide correr más allá (botón de play al final), se vuelve a pausar.
   Para volver a empezar: RELOJ.reiniciarModelo() (lo hace el botón «Volver a empezar»). */
export const TOPE_AÑOS = 50, TOPE_SEM = TOPE_AÑOS * 52;
export const terminado = (R) => R.sem >= TOPE_SEM;
// «Año 12 de 50» (nunca pasa de 50): el año que se está viviendo, 1 a 50
export const añoActual = (R) => Math.min(TOPE_AÑOS, Math.floor(R.sem / 52) + 1);
export function armarTope(R) {
  if (!R || R.__topeAños) return; R.__topeAños = true;
  const armar = () => { if (R.detenerSemEn == null) R.detenerSemEn = TOPE_SEM; };
  armar();
  R.alCambiar(() => { if (terminado(R) && !R.pausaSem) R.pausarAños(true); armar(); });
}
