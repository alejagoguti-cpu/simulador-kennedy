/* ============ RELOJ UNIVERSAL DE LA SIMULACIÓN (SimClock) ============
   Una sola fuente de verdad del tiempo para toda la maqueta de Kennedy. El dibujo solo LEE el estado; nunca lleva su propio tiempo.

   · Tiempo entero en pasos de DT fijo (1 s simulado). t = número de segundos simulados desde el origen:
       t = 0  ->  año 1 · semana 1 · lunes 00:00. La simulación arranca en T0 = lunes 06:30 (como antes el reloj del giro).
     Derivados: segundos, minuto del día, día, día de la semana, semana (7 días), año (52 semanas, el mismo año de data3d/sim_vida.js).
   · Por qué DT = 1 s: la grabación SUMO del tráfico tiene 1 posición por segundo (un paso más largo la saltaría); a 1 s el vehículo más rápido
     de los agentes (~11 m/s) avanza ~11 m por paso, el peatón ~1,3 m y la fauna menos de 8 m: ninguno atraviesa a otro ni a un borde de
     polígono entre dos pasos (los agentes se mueven hacia un objetivo con tope min(distancia, v·dt)). Un DT menor (0,1 s) costaría 10× más
     por cada segundo simulado sin cambiar lo que se ve; uno mayor (≥ 5 s) haría saltar los carros de la grabación y el cruce de ventanas
     de horario (jornadas de 5 min).
   · PASO FIJO: a más velocidad corren MÁS pasos por segundo real, nunca pasos más grandes. Velocidades 1×, 60×, 600×, 3600× y «máx»
     (todos los pasos que quepan en el presupuesto del cuadro) y pausa.
   · TOPE POR CUADRO (sin espiral de la muerte): en un cuadro corren como mucho TOPE_PASOS pasos y PRESUPUESTO_MS ms de lógica.
     Si no alcanza, NO se acumula deuda: la velocidad efectiva baja y queda registrado (recortes, velEfectiva).
   · DETERMINISMO: cada sistema registra step(dt, t) y su propio azar (azar(nombre): mulberry32 con semilla derivada de la semilla global
     y del nombre del sistema). Misma semilla + mismo t = mismo estado, se haya dibujado o no: los pasos no dependen de los cuadros
     por segundo ni de la cámara (los sistemas que sí dependen de la cámara se declaran con dependeCamara: true).
   · Un sistema que se registra tarde se pone al día solo (corre sus pasos desde T0 hasta el t actual) para no depender del orden de carga.
   · Sin DOM: este módulo corre igual en un Web Worker o en Node (la interfaz está en data3d/reloj_ui.js).
   Fase 2 (salto en segundo plano por lotes, con progreso y cancelar, y pruebas de hash): usar avanzar(n), hash() y entradas. */

export const DT = 1;                                   // segundos simulados por paso
export const DIA = 86400, SEMANA = 7 * DIA, AÑO = 52 * SEMANA; // en pasos (DT = 1 s)
export const T0 = 6 * 3600 + 30 * 60;                  // arranque: año 1 · semana 1 · lunes 06:30
export const VELOCIDADES = [1, 60, 600, 3600];
export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const ANIM_MAX = 8;                                    // las animaciones decorativas aceleran hasta ×8 (más rápido solo producía parpadeo)

// azar con semilla: mulberry32 y un hash de texto (FNV-1a) para derivar la semilla de cada sistema
export function mulberry32(semilla) { let a = semilla >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hashTexto(s, h = 0x811c9dc5) { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
// hash de números (estado de los agentes redondeado a mm): hashNum(h, v) encadenado, empezando en 0x811c9dc5
export function hashNum(h, v) { return Math.imul((h ^ (Math.round((+v || 0) * 1000) | 0)) >>> 0, 0x01000193) >>> 0; }
const mezclar = (a, b) => { let h = Math.imul((a ^ (b + 0x9e3779b9 + (a << 6) + (a >>> 2))) >>> 0, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
const pad = (n) => String(n).padStart(2, '0');

export function crearReloj({ semilla = 1, t0 = T0, vel = 60, topePasos = 3600, presupuestoMs = 14 } = {}) {
  const ahoraMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const S = [], DIB = [], OYE = [];
  const R = {
    DT, DIA, SEMANA, AÑO, T0: t0, VELOCIDADES,
    semilla, t: t0, vel, pausa: false, arrancado: false,
    acum: 0, alfa: 0, tAnim: 0, dtAnim: 0, dtReal: 0, dtSim: 0,
    topePasos, presupuestoMs,
    // registro de lo que pasa en cada cuadro (para la interfaz y la medición)
    stats: { pasosCuadro: 0, msCuadro: 0, velEfectiva: 0, recortes: 0, ultimoRecorte: -1, motivo: '' },
    destino: null,       // «ir a»: corre a la máxima velocidad sostenible hasta este t y vuelve a la velocidad anterior
    entradas: [],        // bitácora de entradas del usuario que cambian la corrida (t, tipo, datos): para reproducirla en la fase 2
    sistemas: S,

    /* ---------- derivados del tiempo ---------- */
    get seg() { return R.t * DT; },
    get tVis() { return Math.max(0, R.t - 1 + R.alfa) * DT; },      // tiempo que se dibuja (interpolado: un paso detrás del estado)
    get minutoDia() { return (R.tVis % DIA) / 60; },                    // 0 … 1439,99 (con fracción, para el cielo)
    get hora() { return R.minutoDia / 60; },
    get diaN() { return Math.floor(R.t / DIA); },                       // días enteros desde el origen (0 = primer lunes)
    get dia() { return R.diaN + 1; },                                   // día 1, 2, 3…
    get diaSemana() { return R.diaN % 7; },                             // 0 = lunes
    get semana() { return Math.floor(R.t / SEMANA); },                  // semanas enteras desde el origen (0 = semana 1 del año 1)
    get semanas() { return R.t / SEMANA; },                             // semanas con fracción (SIMST.t)
    get semanaDelAño() { return (R.semana % 52) + 1; },
    get año() { return Math.floor(R.semana / 52) + 1; },
    get corriendo() { return R.arrancado && !R.pausa; },
    hhmm(seg = R.t) { const m = Math.floor((seg % DIA) / 60); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); },
    texto() { return `Año ${R.año} · semana ${R.semanaDelAño} · ${DIAS[R.diaSemana]} · ${R.hhmm()}`; },

    /* ---------- azar con semilla ---------- */
    azar(nombre) { return mulberry32(mezclar(R.semilla >>> 0, hashTexto(nombre))); },
    // azar sin estado, indexado (sistema, id, k): siempre el mismo número para la misma terna
    azarDe(nombre, id, k = 0) { return mezclar(mezclar(mezclar(R.semilla >>> 0, hashTexto(nombre)), id >>> 0), k >>> 0) / 4294967296; },

    /* ---------- sistemas ----------
       registrar({ nombre, step(dt, t), onDia(dia), onSemana(semana), orden, hash(), dependeCamara, sinDibujo })
       · step: lógica de un paso (t = segundo al EMPEZAR el paso). onDia/onSemana: al cruzar la medianoche del lunes / del día.
       · hash(): número que resume su estado (pruebas de determinismo). dependeCamara: su lógica usa la cámara (no es determinista).
       · ponerAlDia (por defecto true): si se registra tarde corre sus pasos desde T0 hasta ahora. */
    registrar(sis, { ponerAlDia = true, desde = t0 } = {}) {
      const s = Object.assign({ orden: 50, ms: 0, n: 0 }, sis);
      if (ponerAlDia && R.t > desde) {
        const m0 = ahoraMs();
        for (let tt = desde; tt < R.t; tt++) { if (s.step) s.step(DT, tt); const t1 = tt + 1; if (t1 % DIA === 0) { if (s.onDia) s.onDia(t1 / DIA); if (t1 % SEMANA === 0 && s.onSemana) s.onSemana(t1 / SEMANA); } }
        s.puestoAlDia = { pasos: R.t - desde, ms: ahoraMs() - m0 };
      }
      S.push(s); S.sort((a, b) => a.orden - b.orden || (a.nombre < b.nombre ? -1 : a.nombre > b.nombre ? 1 : 0)); // orden fijo: no depende de cuál cargó primero
      avisar('sistemas'); return () => { const i = S.indexOf(s); if (i >= 0) S.splice(i, 1); };
    },
    alDibujar(fn) { DIB.push(fn); return () => { const i = DIB.indexOf(fn); if (i >= 0) DIB.splice(i, 1); }; },
    alCambiar(fn) { OYE.push(fn); return () => { const i = OYE.indexOf(fn); if (i >= 0) OYE.splice(i, 1); }; },

    /* ---------- un paso y N pasos (sin dibujar) ---------- */
    paso() {
      const t = R.t;
      for (let i = 0; i < S.length; i++) { const s = S[i]; if (s.step) { s.step(DT, t); } }
      R.t = t + 1;
      if (R.t % DIA === 0) { const d = R.t / DIA; for (const s of S) if (s.onDia) s.onDia(d); if (R.t % SEMANA === 0) { const w = R.t / SEMANA; for (const s of S) if (s.onSemana) s.onSemana(w); } }
    },
    // avanzar(n): corre n pasos seguidos sin dibujar (base del salto en segundo plano de la fase 2). Devuelve ms por sistema.
    avanzar(n, { medir = false } = {}) {
      const m0 = ahoraMs(); let porSis = null;
      if (medir) { porSis = {}; for (const s of S) porSis[s.nombre] = 0; }
      for (let k = 0; k < n; k++) {
        if (!medir) { R.paso(); continue; }
        const t = R.t;
        for (const s of S) if (s.step) { const a = ahoraMs(); s.step(DT, t); porSis[s.nombre] += ahoraMs() - a; }
        R.t = t + 1;
        if (R.t % DIA === 0) { const d = R.t / DIA; for (const s of S) if (s.onDia) { const a = ahoraMs(); s.onDia(d); porSis[s.nombre] += ahoraMs() - a; } if (R.t % SEMANA === 0) { const w = R.t / SEMANA; for (const s of S) if (s.onSemana) { const a = ahoraMs(); s.onSemana(w); porSis[s.nombre] += ahoraMs() - a; } } }
      }
      R.alfa = 1; avisar('avance');
      return { pasos: n, ms: ahoraMs() - m0, porSistema: porSis };
    },
    // hash del estado de todos los sistemas que lo saben dar (pruebas de determinismo)
    hash() { let h = mezclar(R.t >>> 0, R.semilla >>> 0); const det = {}; for (const s of S) if (s.hash) { const v = s.hash() >>> 0; det[s.nombre] = v; h = mezclar(h, v); } return { t: R.t, h, sistemas: det }; },

    /* ---------- control ---------- */
    arrancar() { if (R.arrancado) return; R.arrancado = true; R._ult = null; avisar('arranque'); },
    ponerVel(v) { R.vel = v === 'max' ? Infinity : Math.max(0, +v || 0); R.pausa = false; R.acum = Math.min(R.acum, 1); R.entrada('vel', R.vel); avisar('vel'); },
    pausar(on = true) { R.pausa = !!on; R.acum = Math.min(R.acum, 1); avisar('pausa'); },
    alternar() { R.pausar(!R.pausa); },
    // ir hasta un t (solo hacia adelante: el tiempo no se devuelve). Corre a la máxima velocidad sostenible y vuelve a la anterior.
    irA(tDestino, motivo = '') { tDestino = Math.floor(tDestino); if (tDestino <= R.t) return false; R.destino = { t: tDestino, desde: R.t, motivo, pausa: R.pausa }; R.pausa = false; R.entrada('irA', { t: tDestino, motivo }); avisar('destino'); return true; },
    // la próxima vez que el reloj marque este minuto del día (0 … 1439); si ya pasó hoy, mañana
    irAMinuto(min, motivo = '') { min = ((Math.round(min) % 1440) + 1440) % 1440; const hoy = R.diaN * DIA + min * 60; return R.irA(hoy > R.t ? hoy : hoy + DIA, motivo || ('las ' + R.hhmm(min * 60))); },
    cancelarDestino() { if (!R.destino) return; const d = R.destino; R.destino = null; R.pausa = d.pausa; avisar('destino'); },
    entrada(tipo, datos) { R.entradas.push({ t: R.t, tipo, datos }); if (R.entradas.length > 5000) R.entradas.shift(); },

    /* ---------- un cuadro: lo llama el ÚNICO requestAnimationFrame maestro (flight, en index.html) ----------
       cuadro(ms) = avanzarCuadro(ms) (lógica: los pasos que tocan) + dibujar() (los dibujos registrados). El bucle maestro puede
       llamarlos por separado para dibujar después de mover la cámara. */
    cuadro(ms) { R.avanzarCuadro(ms); return R.dibujar(); },
    dibujar() {
      const info = R._info;
      for (let i = 0; i < DIB.length; i++) { try { DIB[i](info); } catch (e) { if (!DIB[i]._avisado) { DIB[i]._avisado = true; console.warn('reloj · dibujo:', e); } } }
      return info;
    },
    avanzarCuadro(ms) {
      const ahora = ms != null ? ms : ahoraMs();
      const dtReal = R._ult == null ? 1 / 60 : Math.min(0.25, Math.max(0, (ahora - R._ult) / 1000)); R._ult = ahora; R.dtReal = dtReal;
      const st = R.stats, t0c = R.t, m0 = ahoraMs();
      let pasos = 0, recorte = '';
      if (R.arrancado && !R.pausa) {
        const maxModo = !!R.destino || R.vel === Infinity;
        if (!maxModo) R.acum += dtReal * R.vel / DT;
        const quiere = maxModo ? Infinity : Math.floor(R.acum);
        while (pasos < quiere) {
          if (R.destino && R.t >= R.destino.t) break;
          if (pasos >= R.topePasos) { recorte = 'pasos'; break; }
          if (pasos && ahoraMs() - m0 > R.presupuestoMs) { recorte = 'tiempo'; break; } // el reloj se mira en cada paso: un paso puede costar varios ms
          R.paso(); pasos++;
        }
        if (maxModo) { R.acum = 0; R.alfa = 1; }
        else { R.acum -= pasos; if (recorte && R.acum >= 1) { R.acum = Math.min(R.acum, 1); st.recortes++; st.ultimoRecorte = R.t; } R.alfa = Math.max(0, Math.min(1, R.acum)); }
        if (R.destino && R.t >= R.destino.t) { const d = R.destino; R.destino = null; R.pausa = d.pausa; R.acum = 0; R.alfa = 1; avisar('destino'); }
      }
      st.pasosCuadro = pasos; st.msCuadro = ahoraMs() - m0; st.motivo = recorte;
      R.dtSim = (R.t - t0c) * DT;
      const ve = dtReal > 0 ? R.dtSim / dtReal : 0; st.velEfectiva += (ve - st.velEfectiva) * Math.min(1, dtReal * 3);
      R.dtAnim = R.corriendo ? dtReal * Math.min(R.destino ? ANIM_MAX : R.vel, ANIM_MAX) : 0; R.tAnim += R.dtAnim;
      R._info = { alfa: R.alfa, tVis: R.tVis, tAnim: R.tAnim, dtAnim: R.dtAnim, dtReal, dtSim: R.dtSim, pasos };
      return R._info;
    },
    // medición: cuántos ms toma simular «seg» segundos con todos los sistemas, sin dibujar (el estado sí avanza)
    medir(seg) { const n = Math.round(seg / DT), r = R.avanzar(n, { medir: true }); return { segundos: seg, pasos: n, ms: Math.round(r.ms), msPorPaso: +(r.ms / n).toFixed(4), porSistema: Object.fromEntries(Object.entries(r.porSistema).map(([k, v]) => [k, Math.round(v)])) }; }
  };
  function avisar(que) { for (const f of OYE) { try { f(que, R); } catch (e) { console.warn('reloj:', e); } } }
  return R;
}

// el reloj de la página (uno solo: todos los módulos lo importan con la MISMA url, ./reloj.js?v=2)
export const RELOJ = crearReloj();
if (typeof window !== 'undefined') window.KEN_RELOJ = RELOJ;

// vista compatible con el antiguo T3.reloj (minutos del día, día, play, vel): la leen cielo, biótica, tablero, orígenes e index.html
export function vistaT3(R = RELOJ) {
  return {
    get t() { return R.minutoDia; }, set t(v) { R.irAMinuto(v); },
    get dia() { return R.dia; }, set dia(v) { /* el día lo da el reloj: escribirlo no hace nada */ },
    get play() { return R.corriendo; }, set play(v) { R.pausar(!v); },
    get vel() { return R.vel; }, set vel(v) { R.ponerVel(v); },
    reloj: R
  };
}
