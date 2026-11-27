/* ============ PANEL DE LAS SIMULACIONES 02–06 (mismo formato que la 01 de data3d/ab01_panel.js) ============
   docs/todas_las_simulaciones.md, «Implementación» (2026-11-26). Va en #su-der (acordeón de limpio.js), debajo de los deslizadores de sim_ui.js:
   · ALERTA arriba del todo (degradé URBIA), con el estrés de la simulación; no tapa la franja de eventos (#su-feed baja).
   · EN VIVO: lo que se mueve solo con las semanas (barra turquesa), con su número.
   · GAME OVER · LÍMITES: las reglas del modelo que mueve esta prueba (REGLAS de simulaciones12.js), con su valor de la semana y las semanas
     seguidas fuera del límite (n/4). Mismos límites con y sin propuesta.
   · ƒx FÓRMULAS con los valores de la semana.
   · GRÁFICAS (4 + con frente a sin), paleta URBIA, esta corrida y la otra mitad del par punteada.
   Datos: I de simulaciones12.js (I.reglasV, I.rachas, I.rachaSector son de solo lectura). Aquí no se calcula ningún dato del modelo.
   La 01 sigue con data3d/ab01_panel.js (sin cambios). conclusion_par.js usa LIM y PAR_LIM de aquí. */
const ICO_ALERTA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18.5 17h-17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1.05" fill="currentColor"/></svg>';
const ICO_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICO_FX = '<svg viewBox="0 0 22 16" aria-hidden="true"><path d="M7.6 2.2c-1.6-.3-2.6.5-2.9 2.1L3.1 13.2c-.3 1.4-1.1 1.9-2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.6 6h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 6l7 7M18 6l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
export const COL = { vio: '#7d6bff', vio2: '#304ffe', cor: '#f2694a', tur: '#4fd1c5', oro: '#f5c451', lim: '#c9f27a', ok: '#c9f27a', amb: '#f5c451', mal: '#f2694a' };
export const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const año = (sem) => Math.min(15, Math.floor((Math.max(1, sem) - 1) / 52) + 1);

/* ---------- LÍMITES = reglas de game over de simulaciones12.js (REGLAS, MALO, CERCA). S = escala de la barra ---------- */
export const LIM = {
  abasto: { n: 'Comida en el sector peor', u: '% de su demanda', v: (I) => I.comidaMin * 100, lim: 80, min: true, cerca: 87, S: 100, f: (v) => nf(v, 1) + ' %', r: (I) => Math.max(I.rachaSector || 0, (I.rachas || {}).abasto || 0), txt: 'un sector recibe menos del 80 % de la comida que necesita' },
  trafico: { n: 'Tráfico', u: '100 % = hoy', v: (I) => I.trafico * 100, lim: 130, cerca: 120, S: 150, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).trafico || 0, txt: 'circulan 30 % más vehículos que hoy' },
  ruido: { n: 'Ruido de las calles', u: 'dB sobre hoy', v: (I) => I.ruidoDb - I.ruidoDb0, lim: 3, cerca: 2, S: 4, f: (v) => (v < 0 ? '−' : '+') + nf(Math.abs(v), 1) + ' dB', r: (I) => (I.rachas || {}).ruido || 0, txt: 'el ruido promedio sube 3 dB' },
  fauna: { n: 'Especies de fauna', u: '% de las del inicio', v: (I) => I.fauna / Math.max(1, I.fauna0) * 100, lim: 90, min: true, cerca: 94, S: 100, f: (v, I) => I ? `${I.fauna} de ${I.fauna0}` : nf(v) + ' %', r: (I) => (I.rachas || {}).fauna || 0, txt: 'quedan menos del 90 % de las especies' },
  habitat: { n: 'Territorio con fauna', u: '% del inicio', v: (I) => I.pares / Math.max(1, I.pares0) * 100, lim: 70, min: true, cerca: 80, S: 130, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).habitat || 0, txt: 'la ocupación de los corredores verdes cae 30 %' },
  humedal: { n: 'Humedales que funcionan', u: '% del área de hoy', v: (I) => I.humedalFuncional, lim: 70, min: true, cerca: 80, S: 110, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).humedal || 0, txt: 'los humedales pierden 30 % de su área funcional' },
  tasa04: { n: 'Cruces que chocan', u: '% de los cruces', v: (I) => I.s04 && I.s04.fase ? I.s04.p * 100 : 0, lim: 20, cerca: 12, S: 40, f: (v) => nf(v, 1) + ' %', r: () => 0, txt: 'más del 20 % de los cruces de fauna chocan', sem: 1 },
  pob04: { n: 'Aves que quedan', u: '% de la población', v: (I) => I.s04 ? I.s04.pob * 100 : 100, lim: 70, min: true, cerca: 80, S: 100, f: (v) => nf(v) + ' %', r: (I) => I.s04 ? I.s04.racha : 0, txt: 'la especie pierde más del 30 % de su población' },
  bosque05: { n: 'Suelo ecológico (bosque y rondas)', u: '% de los árboles', v: (I) => I.s05 ? I.s05.ecoRest * 100 : 100, lim: 80, min: true, cerca: 88, S: 100, f: (v) => nf(v, 1) + ' %', r: () => 0, txt: 'se pierde más del 20 % del suelo ecológico (bosque y rondas)', sem: 1 },
  suelo05: { n: 'Suelo productivo', u: 'ha', v: (I) => I.s05 ? I.s05.sueloProd : 27.85, lim: 12, min: true, cerca: 15, S: 30, f: (v) => nf(v, 1) + ' ha', r: () => 0, txt: 'el suelo para huertas baja de 12 ha', sem: 1 },
  traf05: { n: 'Tráfico alrededor de Bavaria', u: '% de hoy', v: (I) => I.s05 && I.s05.traf ? I.s05.traf * 100 : 100, lim: 130, cerca: 120, S: 140, f: (v) => nf(v, 1) + ' %', r: (I) => I.s05 ? I.s05.rTraf || 0 : 0, txt: 'el tráfico alrededor de Bavaria pasa el 130 % de hoy' },
  urg06: { n: 'Semanas sin recursos', u: 'semanas', v: (I) => I.s06 ? I.s06.urgMax : 0, lim: 5, cerca: 3, S: 8, f: (v) => nf(v) + ' sem', r: () => 0, txt: 'un sector crítico pasa más de 4 semanas sin recursos', sem: 1 },
  sost06: { n: 'Sostenibilidad', u: '%', v: (I) => I.s06 && I.s06.sost != null ? I.s06.sost * 100 : 100, lim: 40, min: true, cerca: 50, S: 100, f: (v) => nf(v) + ' %', r: () => 0, txt: 'el índice de sostenibilidad baja de 40 %', sem: 1 },
  acum03: { n: 'Corabastos + María Paz', u: 't sin recoger', v: (I) => I.res03 && I.res03.fase > 0 ? I.res03.acum : 0, lim: 4500, cerca: 3000, S: 5000, f: (v) => nf(v) + ' t', r: () => 0, txt: 'Corabastos y María Paz acumulan más de 4.500 t', sem: 1 },
  edad03: { n: 'Horas sin tratar', u: 'horas', v: (I) => I.res03 && I.res03.fase > 0 ? I.res03.eMax : 0, lim: 48, cerca: 24, S: 72, f: (v) => nf(v) + ' h', r: () => 0, txt: 'algún sector pasa 48 h con orgánicos sin tratar', sem: 1 },
  arterias: { n: 'Arterias sobre 140 %', u: 'de 3 alternas', v: (I) => I.mov02 ? I.mov02.sobre : null, lim: 3, cerca: 2, S: 3, f: (v) => nf(v) + ' de 3', r: (I) => I.mov02 ? I.mov02.rachas.arterias : 0, txt: 'más de 2 arterias pasan el 140 % de su capacidad', sem: 1 },
  tiempo: { n: 'Tiempo de viaje', u: 'veces el normal', v: (I) => I.mov02 ? I.mov02.tt : null, lim: 2, cerca: 1.6, S: 2.4, f: (v) => '×' + nf(v, 2), r: (I) => I.mov02 ? I.mov02.rachas.tiempo : 0, txt: 'el tiempo medio de viaje pasa el doble del normal', sem: 1 },
  abastoMov: { n: 'Abastecimiento zona peor', u: '% de lo que necesita', v: (I) => I.mov02 ? I.mov02.abMin * 100 : null, lim: 80, min: true, cerca: 87, S: 100, f: (v) => nf(v, 1) + ' %', r: (I) => I.mov02 ? I.mov02.rachas.abasto : 0, txt: 'una zona recibe menos del 80 % de su abastecimiento' },
  residuos: { n: 'Orgánicos en las Estaciones', u: '% del almacenamiento', v: (I) => I.residuos * 100, lim: 100, cerca: 85, S: 130, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).residuos || 0, txt: 'los orgánicos pendientes pasan el almacenamiento' } };
export const malo = (k, v) => (LIM[k].min ? v < LIM[k].lim : v >= LIM[k].lim);
const cercaDe = (k, v) => (LIM[k].min ? v < LIM[k].cerca : v >= LIM[k].cerca);
/* límites que mueve cada prueba (las 7 reglas siguen activas en todas: si cae otra, se agrega su fila) */
export const PAR_LIM = { 2: ['humedal'], 3: ['humedal'], /* 02 y 03 (guion de la autora 2026-11-27): el game over llega por los humedales; abastecimiento, tiempo de viaje, toneladas y horas se muestran sin game over */ 4: ['tasa04', 'pob04', 'humedal'], 5: ['bosque05', 'traf05', 'humedal'], 6: ['urg06', 'sost06', 'humedal'] };

/* ---------- lo propio de cada simulación ---------- */
const OPC_VIA = { 1: 'Av. de las Américas', 2: 'Av. Boyacá', 3: 'Calle 38 Sur' };
const desvio = (I) => (I.cierre && I.cierre.fase ? I.cierre.traficoDesvio : 1);
const equip = (I) => (I.gobernanza ? I.gobernanza.barrios.reduce((a, b) => a + b.equipamientos, 0) : 0);
const conect = (I) => (I.verde && I.verde.resumen && I.verde.resumen.nParches ? I.verde.resumen.nConectados / I.verde.resumen.nParches * 100 : null);
export const PAR_CFG = {
  2: { titulo: 'Movilidad y cierre vial',
    alerta(I, val) { const m = I && I.mov02, via = m && m.vias[m.via] ? m.vias[m.via].n : OPC_VIA[val.viaCierre] || 'la vía', t0 = val.cierreT0 != null ? val.cierreT0 : 105, d = val.cierreDur != null ? val.cierreDur : 260, s = I ? I.sem : 0;
      if (s < t0) return ['Se cerrará la ' + via, 'en ' + nf(t0 - s) + ' sem · ' + nf(val.cierrePct) + ' %'];
      if (s < t0 + d) return ['Cerrada la ' + via + ' al ' + nf((m ? m.c : 0) * 100) + ' %', m ? '+' + nf(m.D) + ' veh/h desviados' : ''];
      return ['Vía reabierta', 'cerró ' + nf(d) + ' sem']; },
    vivo: [['Tiempo de viaje relativo', (I) => I.mov02 ? I.mov02.tt : null, 2.4, (v) => '×' + nf(v, 2)],
      ['Saturación de la red', (I) => I.mov02 ? I.mov02.sat * 100 : null, 150, (v) => nf(v) + ' %'],
      ['Abastecimiento del sector más afectado', (I) => I.mov02 ? I.mov02.abMin * 100 : null, 100, (v) => nf(v, 1) + ' %'], /* guion: 68,6 % sin propuesta, 96,1 % con propuesta */
      ['Ruido en zonas residenciales', (I) => I.mov02 ? I.mov02.dbRes : null, 90, (v) => nf(v, 1) + ' dB(A)']],
    graf: [{ t: '¿Cuánto más se tarda un viaje?', s: [{ f: (I) => I.mov02 && I.mov02.tt, n: 'tiempo' }], lim: 2, limTxt: 'doble del normal', fmt: (v) => '×' + nf(v, 2), sub: (I) => `1 = sin cierre. Hoy ×${nf(I.mov02 && I.mov02.tt, 2)}: las alternas se llenan y hacen fila (Akçelik) y los desviados dan un rodeo de ×${nf(I.mov02 && I.mov02.rodeo, 2)}.` },
      { t: '¿Qué tan llena está la red?', s: [{ f: (I) => I.mov02 && I.mov02.sat * 100, n: 'saturación' }], lim: 100, limTxt: 'capacidad', fmt: (v) => nf(v) + ' %', sub: (I) => I.mov02 ? 'Flujo ÷ capacidad abierta. ' + Object.values(I.mov02.vias).filter(v => v.art).map(v => v.n.replace('Av. ', '') + ' ' + nf(v.x * 100) + ' %').join(' · ') : '' },
      { t: '¿Llega la comida a los barrios?', s: [{ f: (I) => I.mov02 && I.mov02.abMin * 100, n: 'zona peor' }, { f: (I) => I.mov02 && I.mov02.abMedia * 100, n: 'promedio', c: COL.tur }], lim: 80, limTxt: 'referencia 80 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Sector más afectado: ${nf(I.mov02 && I.mov02.abMin * 100, 1)} % de lo que necesita. Los camiones de Corabastos hacen ${nf(I.mov02 && I.mov02.g * 100)} % de sus viajes por la congestión${I.propuesta ? '; con la propuesta se necesitan ' + nf((1 - (I.mov02 ? I.mov02.kProp : 1)) * 100) + ' % menos viajes largos' : ''}.` },
      { t: '¿Cuánto ruido hay?', s: [{ f: (I) => I.mov02 && I.mov02.dbRes, n: 'residencial' }], fmt: (v) => nf(v, 1) + ' dB', sub: (I) => I.mov02 ? Object.values(I.mov02.vias).map(v => v.n.replace('Av. ', '').split(' (')[0] + ' ' + nf(v.db, 1)).join(' · ') + (I.mov02.bosqueDb ? ' · bosque de Bavaria ' + I.mov02.bosqueDb + ' dB(A)' : '') : '' }],
    fx: [['Flujo desviado', (I) => nf(I.mov02 && I.mov02.D) + ' veh/h', (I, v) => `flujo de la vía × tráfico (${nf(I.trafico, 2)}) × cierre (${nf(v.cierrePct)} % × obra ${nf(I.mov02 && I.mov02.fase, 2)}); flujo = capacidad × jam factor ÷ 10 (supuesto); se reparte por la capacidad libre de las alternas (supuesto)`],
      ['Tiempo de viaje relativo', (I) => '×' + nf(I.mov02 && I.mov02.tt, 2), () => 'Σ flujo × t ÷ Σ flujo × t sin cierre · t = t libre + demora con fila de Akçelik (1991), T = 3 h de pico · + km de rodeo de los desviados (sim_red_datos.js)'],
      ['Saturación de la red', (I) => nf(I.mov02 && I.mov02.sat * 100) + ' %', () => 'Σ flujo ÷ Σ capacidad abierta (capacidades de la autora, SUMO/Waze)'],
      ['Abastecimiento', (I) => nf(I.mov02 && I.mov02.abMin * 100, 1) + ' % zona peor', () => 'local + mercados + Corabastos × g · g = mín(1, 1,708 / (r × k)), r = tiempo por km, k = 1 − 0,45 × permeabilidad con propuesta (dato de la autora) · 1,708 = holgura de la flota (supuesto calibrado) · con propuesta, la mitad del déficit × permeabilidad se cubre a pie en el mercado vecino (supuesto calibrado)'],
      ['Ruido residencial', (I) => nf(I.mov02 && I.mov02.dbRes, 1) + ' dB(A)', () => 'L = L de la autora + 10·log10(flujo ÷ flujo base) por vía; promedio energético de las 5 vías (pesos iguales, supuesto)']] },
  3: { titulo: 'Interrupción de la recolección',
    alerta(I, val) { const s = I ? I.sem : 0, r = I && I.res03; if (s < (val.resT0 || 4)) return ['Se interrumpirá la recolección', 'en ' + nf((val.resT0 || 4) - s) + ' sem · ' + nf(val.resHoras) + ' h'];
      if (r && r.fase > 0) return ['Sin recolección ' + nf(r.horas) + ' h', nf(r.totCalle) + ' t en la calle']; return ['Recolección normal', 'se interrumpió ' + nf(val.resHoras) + ' h']; },
    vivo: [['Residuos acumulados en la calle', (I) => I.res03 && I.res03.nodos ? I.res03.totCalle : 0, 4500, (v) => nf(v) + ' t'], /* la última interrupción (una por año) */
      ['Tiempo máximo sin tratar', (I) => I.res03 && I.res03.nodos ? I.res03.eMax : 0, 72, (v) => nf(v) + ' h'],
      ['Compost entregado a las huertas', (I) => I.res03 && I.res03.prop ? I.res03.compAcum / 1000 : 0, 1000, (v) => nf(v, 1) + ' mil t'], /* acumulado: la red trata todo el año */
      ['Saturación de las Estaciones', (I) => I.res03 && I.res03.prop && I.res03.sat != null ? I.res03.sat * 100 : 0, 100, (v) => nf(v) + ' % de 100 %'], /* guion de la autora: con propuesta llegan solo a 22 % */
      ['Resiliencia sanitaria', (I) => I.res03 && I.res03.nodos ? I.res03.resil : 100, 100, (v) => nf(v) + ' %']],
    graf: [{ t: '¿Cuánta basura queda en la calle?', s: [{ f: (I) => I.res03 && I.res03.fase > 0 ? I.res03.totCalle : 0, n: 'en la calle' }, { f: (I) => I.res03 && I.res03.fase > 0 ? I.res03.acum : 0, n: 'Corabastos + María Paz', c: COL.tur }], lim: 4500, limTxt: 'tope 4.500 t', fmt: (v) => nf(v) + ' t', sub: (I) => I.res03 && I.res03.nodos ? I.res03.nodos.filter(n => n.calle > 0.5).map(n => n.n.split(' ')[0] + ' ' + nf(n.calle) + ' t').join(' · ') || 'Todo se trata: nada queda en la calle.' : '' },
      { t: '¿Cuánto tiempo sin tratar?', s: [{ f: (I) => I.res03 && I.res03.fase > 0 ? I.res03.eMax : 0, n: 'horas' }], lim: 48, limTxt: '48 h', fmt: (v) => nf(v) + ' h', sub: (I) => I.res03 && I.res03.prop ? 'Con la red cada nodo lleva sus orgánicos a su Estación y lo que no cabe a Bavaria; la meta de la propuesta es menos de 12 h.' : 'Sin recolección todo se queda en la calle desde la primera hora.' },
      { t: '¿Cuánto se vuelve compost?', s: [{ f: (I) => I.res03 && I.res03.fase > 0 ? I.res03.compostDia : 0, n: 'compost' }], fmt: (v) => nf(v) + ' t/día', sub: (I) => `Se valoriza ${nf((I.res03 && I.res03.valoriza || 0) * 100)} % de lo generado; compost = 40 % de la masa tratada (supuesto).` },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Área sin rellenar × calidad frente a la basura de sus bordes: ${nf(I.humedalFuncional)} % de hoy.` }],
    fx: [['Orgánicos generados', (I) => nf(I.res03 && I.res03.orgDia) + ' t/día + 65 Corabastos', () => 'barrios: población × kg/persona (sim_vida.js), repartidos por zona al nodo más cercano · Corabastos: 100 t/día × 65 % orgánicos (CONtexto ganadero)'],
      ['Capacidad de la red', (I, v) => I.propuesta ? nf(v.capRed) + ' %' : 'no hay red', () => '5 Estaciones × 250 t/día + Bavaria 1.500 t/día (datos de la autora) × capacidad · cada nodo a su Estación más cercana, el resto a Bavaria'],
      ['Tiempo sin tratar', (I) => nf(I.res03 && I.res03.eMax) + ' h', () => 'sin tratamiento: horas desde el inicio · con tratamiento: lo que espera ÷ lo que se trata por hora (cola)'],
      ['Resiliencia sanitaria', (I) => nf(I.res03 && I.res03.resil) + ' %', () => '100 × (1 − la mayor fracción usada de los dos límites: 4.500 t y 48 h) (definición declarada)']] },
  4: { titulo: 'Biodiversidad y atropellamientos',
    alerta(I) { const d = I && I.s04; if (!d || !d.fase) return d && I.sem >= d.t0 ? ['Pasó la oleada migratoria', 'aves ' + nf(d.pob * 100) + ' %'] : ['Llegará la oleada migratoria', d ? 'en ' + nf(d.t0 - (I ? I.sem : 0)) + ' sem' : '']; return ['Oleada migratoria · +' + nf(d.flujo * 100) + ' % aves', nf(d.p * 100, 1) + ' % de los cruces chocan']; },
    vivo: [['Cruces que terminan en choque', (I) => I.s04 ? I.s04.p * 100 : null, 40, (v) => nf(v, 1) + ' %'], ['Aves que mueren por semana', (I) => I.s04 ? I.s04.muerteSem * 100 : null, 25, (v) => nf(v, 1) + ' % de la población'],
      ['Población de aves que cruza', (I) => I.s04 ? I.s04.pob * 100 : null, 100, (v) => nf(v) + ' %'], ['Diversidad de aves (Shannon H\')', (I) => I.s04 ? I.s04.shannon : null, 3.5, (v) => nf(v, 2)]],
    graf: [{ t: '¿Cuántos cruces chocan?', s: [{ f: (I) => I.s04 && I.s04.fase ? I.s04.p * 100 : 0, n: 'choques' }], lim: 20, limTxt: 'game over 20 %', fmt: (v) => nf(v, 1) + ' %', sub: (I) => I.s04 ? `Vuelo a ras ${nf(I.s04.bajo * 100)} % × llega un carro en 4 s ${nf(I.s04.pCruce * 100)} % × fuera del paso ${nf((1 - I.s04.fuera) * 100)} %.` : '' },
      { t: '¿Cuántas aves quedan?', s: [{ f: (I) => I.s04 ? I.s04.pob * 100 : null, n: 'población' }], lim: 70, limTxt: 'game over < 70 % · 4 sem', fmt: (v) => nf(v) + ' %', sub: () => 'Población de la especie que cruza entre los humedales frente a su inicio.' },
      { t: '¿Qué tan diversa es la fauna?', s: [{ f: (I) => I.s04 ? I.s04.shannon : null, n: "H'" }], fmt: (v) => nf(v, 2), sub: () => "Índice de Shannon de las aves del modelo (ocupación real por especie)." },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Área funcional de los humedales: ${nf(I.humedalFuncional)} % de hoy.` }],
    fx: [['Choque por cruce', (I) => nf(I.s04 && I.s04.p * 100, 1) + ' %', () => '25 % a ras (supuesto) × (1 − e^(−Q·4 s)), Q = 4.264 veh/h × tráfico (SUMO/Waze de la autora) × (1 − implementación del paso)'],
      ['Población', (I) => nf(I.s04 && I.s04.pob * 100) + ' %', () => 'cada semana de oleada cruza 30 % × (1 + flujo) y muere la fracción que choca; recupera 2 %/semana (supuestos)'],
      ["Shannon H'", (I) => nf(I.s04 && I.s04.shannon, 2), () => '−Σ p·ln p sobre los lugares que ocupa cada especie de ave en el modelo']] },
  5: { titulo: 'Población y especulación en Bavaria',
    alerta(I) { const d = I && I.s05; if (!d) return ['Plan parcial Bavaria', '']; return [d.prop ? 'Bavaria Común · bosque intacto' : 'Avanza el plan parcial', nf(d.viv) + ' viviendas']; },
    vivo: [['Superficie ecológica que queda', (I) => I.s05 ? I.s05.ecoRest * 100 : null, 100, (v) => nf(v, 1) + ' %'], ['Suelo productivo activo', (I) => I.s05 ? I.s05.sueloProd : null, 30, (v) => nf(v, 1) + ' ha'],
      ['Patrimonio industrial reutilizado', (I) => I.s05 ? I.s05.naves : null, 121436, (v) => nf(v) + ' m²'], ['Isla de calor', (I) => I.s05 ? I.s05.calor : null, 2, (v) => '+' + nf(v, 1) + ' °C']],
    graf: [{ t: '¿Cuánto bosque queda?', s: [{ f: (I) => I.s05 ? I.s05.ecoRest * 100 : null, n: 'bosque y rondas' }], lim: 80, limTxt: 'game over < 80 %', fmt: (v) => nf(v) + ' %', sub: (I) => I.s05 ? `Árboles talados: ${nf(I.s05.arbPerdidos)} de 3.250 (plan parcial, Alcaldía 2023).` : '' },
      { t: '¿Hay suelo para huertas?', s: [{ f: (I) => I.s05 ? I.s05.sueloProd : null, n: 'ha' }], lim: 12, limTxt: 'game over < 12 ha', fmt: (v) => nf(v, 1) + ' ha', sub: () => 'Suelo libre del predio (27,85 ha) menos las torres del plan (25 ha) según lo construido.' },
      { t: '¿Cuánto se construye?', s: [{ f: (I) => I.s05 ? I.s05.viv : null, n: 'viviendas' }], fmt: (v) => nf(v), sub: () => '14.000 viviendas por etapas (Alcaldía 2023) × presión.' },
      { t: '¿Cuánto calor?', s: [{ f: (I) => I.s05 ? I.s05.calor : null, n: '°C' }], fmt: (v) => '+' + nf(v, 1) + ' °C', sub: () => '+2 °C × fracción impermeable del predio (supuesto declarado).' }],
    fx: [['Viviendas', (I) => nf(I.s05 && I.s05.viv), (I, v) => '14.000 × etapas del plan hasta el año × presión ' + nf(v.presionPlan) + ' %'],
      ['Bosque que queda', (I) => nf(I.s05 && I.s05.ecoRest * 100, 1) + ' %', () => '1 − árboles talados ÷ 3.250 (sin blindaje, todos los del plan; con blindaje, solo los sueltos; con propuesta, 0)'],
      ['Suelo productivo', (I) => nf(I.s05 && I.s05.sueloProd, 1) + ' ha', () => '27,85 ha libres − 25 ha de torres × avance (con propuesta, protegido)']] },
  6: { titulo: 'Gobernanza policéntrica',
    alerta(I) { const d = I && I.s06; if (!d) return ['Gobernanza', '']; return [d.prop ? 'Federación de Juntas · decide cada ' + nf(Math.round(13 - 11 * d.part)) + ' sem' : 'Reparto central cada 13 semanas', d.urgMax ? d.urgMax + ' sem sin recursos' : 'sin urgencias']; },
    vivo: [['Tiempo máximo sin atender', (I) => I.s06 ? I.s06.urgMax : null, 8, (v) => nf(v) + ' sem'], ['Equidad del reparto (1 − Gini)', (I) => I.s06 ? I.s06.equidad * 100 : null, 100, (v) => nf(v) + ' %'],
      ['Índice de sostenibilidad', (I) => I.s06 && I.s06.sost != null ? I.s06.sost * 100 : null, 100, (v) => nf(v) + ' %'], ['Recursos frente a la necesidad', (I) => I.s06 ? I.s06.pres * 100 : null, 100, (v) => nf(v) + ' %']],
    graf: [{ t: '¿Cuánto esperan los sectores?', s: [{ f: (I) => I.s06 ? I.s06.urgMax : null, n: 'semanas' }], lim: 4, limTxt: 'game over > 4 sem', fmt: (v) => nf(v) + ' sem', sub: (I) => I.s06 ? I.s06.barrios.map(b => b.n.replace('Sector ', '') + ' ' + nf(b.cov * 100) + ' %').join(' · ') : '' },
      { t: '¿Es justo el reparto?', s: [{ f: (I) => I.s06 ? I.s06.equidad * 100 : null, n: 'equidad' }], fmt: (v) => nf(v) + ' %', sub: () => '1 − Gini de la cobertura de los 8 sectores.' },
      { t: '¿Es sostenible el territorio?', s: [{ f: (I) => I.s06 && I.s06.sost != null ? I.s06.sost * 100 : null, n: 'índice' }], lim: 40, limTxt: 'game over < 40 %', fmt: (v) => nf(v) + ' %', sub: () => 'Índice ecológico del modelo (evaluacion_ecologica.js).' }],
    fx: [['Semanas sin recursos', (I) => nf(I.s06 && I.s06.urgMax), () => 'semanas que un sector con menos del 50 % cubierto pasa sin asignación; central cada 13 semanas, Federación cada 13 − 11 × participación'],
      ['Reparto', (I, v) => nf(v.participacion) + ' % asambleas', () => 'participación × reparto por la necesidad de hoy + (1 − participación) × reparto central (población + necesidad de hace medio año)']] }
};

/* ---------- estilos (mismo vidrio y paleta que la 01) ---------- */
const CSS = `
#sp-alerta.ant{background:linear-gradient(90deg,#7f1d1d,#b91c1c)!important}#sp-alerta{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:46;display:flex;gap:9px;align-items:center;max-width:calc(100vw - 32px);white-space:nowrap;padding:6px 6px 6px 12px;border-radius:12px;
  background:linear-gradient(100deg,#304ffe 0%,#3d8fe6 55%,#4fd1c5 100%);border:1px solid rgba(255,255,255,.28);box-shadow:0 6px 22px rgba(20,40,110,.35);text-shadow:0 1px 2px rgba(10,20,60,.45);color:#fff;overflow:hidden;font:400 11.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif)}
#sp-alerta[hidden]{display:none}#sp-alerta>svg{width:16px;height:16px;flex:none;animation:spIco 1.1s ease-in-out infinite}
#sp-alerta span{font:500 12px var(--ui-sans,Inter,sans-serif);overflow:hidden;text-overflow:ellipsis}
#sp-alerta b{font:600 10px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85)}
#sp-alerta strong{font:600 17px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif}
#sp-alerta button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px} #sp-alerta button:hover{background:rgba(255,255,255,.18)} #sp-alerta button svg{width:12px;height:12px}
#sp-alerta.go{background:linear-gradient(100deg,#7d1f3a 0%,#c63a3a 55%,#f2694a 100%);padding-right:12px} #sp-alerta .go4{font:400 10.5px var(--ui-sans,Inter,sans-serif);opacity:.85}
@media (max-width:760px){#sp-alerta{top:6px;max-width:calc(100vw - 16px)}#sp-alerta span{max-width:38vw}}
@keyframes spIco{0%,100%{opacity:1}50%{opacity:.55}} @media(prefers-reduced-motion:reduce){#sp-alerta>svg{animation:none}}
#sp-mov{margin:8px 0 6px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}#sp-mov h6{margin:0 0 6px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}#sp-mov .r{display:flex;justify-content:space-between;gap:8px;font:400 10.5px/1.5 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4)}#sp-mov .r b{color:#eef1f4;font-weight:600}#sp-mov .sxn{margin:4px 0 0;font:400 9.5px/1.35 var(--ui-sans,Inter,sans-serif);opacity:.6}#sp-ruido{width:100%;margin:0 0 6px;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#eef1f4;font:500 11px var(--ui-sans,Inter,sans-serif);cursor:pointer}#sp-riesgo{width:100%;margin:0 0 6px;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#eef1f4;font:500 11px var(--ui-sans,Inter,sans-serif);cursor:pointer}#sp-riesgo.on{background:rgba(124,45,18,.45);border-color:#c2410c}#sp-ruido.on{background:rgba(239,68,68,.25);border-color:#ef4444}
#sp-vivo,#sp-go,#sp-graf{margin:8px 0 6px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#sp-vivo h6,#sp-go h6,#sp-graf h6{margin:0 0 6px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#sp-vivo .r,#sp-go .r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;align-items:center;font:400 10.5px/1.25 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);padding:3px 0}
#sp-vivo .r i,#sp-go .r i{grid-column:1 / -1;position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.1)}
#sp-vivo .r i u,#sp-go .r i u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:${COL.ok}} #sp-vivo .r i u{background:${COL.tur}}
#sp-go .r i s{position:absolute;top:-3px;bottom:-3px;width:2px;background:${COL.mal}}
#sp-vivo .r b,#sp-go .r b{font:600 13px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff;white-space:nowrap} #sp-go .r b em{font-style:normal;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.65;margin-left:3px}
#sp-vivo .r{position:relative;padding-left:9px} #sp-vivo .r::before{content:"";position:absolute;left:0;top:4px;bottom:2px;width:2px;border-radius:2px;background:${COL.tur};opacity:.8}
#sp-go .r.mal b{color:#ff9b85} #sp-go .r.mal span{color:#ffb8a8}
#sp-go .r.go{outline:1.5px solid ${COL.mal};outline-offset:2px;border-radius:4px;animation:spGo 1s ease-in-out infinite}#sp-go .r.go span{color:#ff9b85;font-weight:600}
@keyframes spGo{0%,100%{background:rgba(242,105,74,.22)}50%{background:rgba(242,105,74,.04)}}
#sp-fx{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin:8px 0 2px;padding:5px 10px;border-radius:9px;border:1px solid rgba(125,107,255,.55);background:rgba(125,107,255,.14);font:600 11px/1 var(--ui-sans,Inter,sans-serif);color:#e8e5ff}
#sp-fx svg{width:18px;height:13px} #sp-fx:hover{background:rgba(125,107,255,.26)} #sp-fx:focus-visible{outline:2px solid ${COL.vio};outline-offset:2px} @media (pointer:coarse){#sp-fx{padding:9px 12px}}
#sp-fxp{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 32px));max-height:min(80dvh,720px);overflow:auto;padding:16px 18px 14px;border-radius:16px;
  background:rgba(14,16,30,.86);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid rgba(169,156,255,.28);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#eef0ff;font:400 12px/1.45 var(--ui-sans,Inter,sans-serif)}
#sp-fxp[hidden]{display:none} #sp-fxp h3{margin:0 0 2px;font:500 20px/1.1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;letter-spacing:.04em;text-transform:uppercase}
#sp-fxp>p{margin:0 0 10px;color:rgba(238,240,255,.65);font-size:11px} #sp-fxp .x{all:unset;cursor:pointer;position:absolute;top:10px;right:10px;width:28px;height:28px;display:grid;place-items:center;border-radius:8px} #sp-fxp .x:hover{background:rgba(255,255,255,.1)} #sp-fxp .x svg{width:13px;height:13px}
#sp-fxp h4{margin:12px 0 4px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:${COL.tur}}
#sp-fxp dl{margin:0;display:grid;gap:6px} #sp-fxp dl>div{padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
#sp-fxp dt{font:600 11.5px/1.3 var(--ui-sans,Inter,sans-serif);display:flex;justify-content:space-between;gap:8px} #sp-fxp dt b{font:600 15px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:${COL.lim};white-space:nowrap}
#sp-fxp dd{margin:2px 0 0;font:400 11px/1.45 var(--ui-mono,'JetBrains Mono',monospace);color:rgba(238,240,255,.72)}
#sp-graf .tabs{display:flex;gap:3px;margin:0 0 6px} #sp-graf .tabs button{all:unset;box-sizing:border-box;cursor:pointer;flex:1;text-align:center;padding:4px 0;border-radius:7px;border:1px solid rgba(255,255,255,.12);font:600 11px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:var(--ui-tx2,#c9cfc4)}
#sp-graf .tabs button[aria-selected="true"]{background:rgba(125,107,255,.22);border-color:rgba(125,107,255,.7);color:#fff} #sp-graf .tabs button:focus-visible{outline:2px solid ${COL.vio};outline-offset:1px} @media (pointer:coarse){#sp-graf .tabs button{padding:8px 0}}
#sp-graf h5{margin:0 0 1px;font:600 12.5px/1.25 var(--ui-sans,Inter,sans-serif);color:#f4f3ff} #sp-graf p{margin:0 0 4px;font:400 10px/1.35 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#sp-graf svg{display:block;width:100%;height:auto;overflow:visible}
#sp-graf svg text{font:500 8px var(--ui-sans,Inter,sans-serif);fill:rgba(238,240,255,.55);font-variant-numeric:tabular-nums} #sp-graf svg text.v{font:600 10.5px 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;fill:#fff}
#sp-graf ul{list-style:none;margin:5px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:2px 10px}
#su-der #sp-graf li{display:inline-flex;gap:5px;align-items:center;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);background:none;border:0;padding:0;min-height:0} #su-der #sp-graf li::before{display:none}
#su-der #sp-graf li i{display:block;width:14px;height:0;border-top:2px solid} #su-der #sp-graf li i.d{border-top-style:dashed} #su-der #sp-graf li i.b{height:8px;border:0;border-radius:2px}`;

/* ---------- alerta arriba ---------- */
function alertaArriba() { let a = document.getElementById('sp-alerta');
  if (!a) { a = document.createElement('div'); a.id = 'sp-alerta'; a.setAttribute('role', 'status'); a.title = 'Prueba de estrés de esta simulación';
    a.innerHTML = `${ICO_ALERTA}<b>Alerta</b><span data-sp="t"></span><strong data-sp="v"></strong><button type="button" aria-label="Cerrar la alerta">${ICO_X}</button>`; document.body.appendChild(a);
    a.querySelector('button').onclick = () => { a.hidden = true; feedBajo(); }; }
  feedBajo(); return a; }
function feedBajo() { const f = document.getElementById('su-feed'), a = document.getElementById('sp-alerta'), e = document.getElementById('lp-esc'), on = !!(a && !a.hidden);
  if (!a) return;
  if (on) { const r = e && e.getClientRects().length ? e.getBoundingClientRect() : null, top = r && r.bottom > 0 && r.bottom < 140 ? Math.round(r.bottom + 6) : 8, left = r ? Math.round(r.left + r.width / 2) : null;
    if (a.style.top !== top + 'px') a.style.top = top + 'px'; const L = left != null && innerWidth > 760 ? left + 'px' : '50%'; if (a.style.left !== L) a.style.left = L; }
  if (f) { const t = on ? Math.round(a.getBoundingClientRect().bottom + 8) + 'px' : ''; if (f.style.top !== t) f.style.top = t; } }
addEventListener('resize', () => feedBajo());
let GO = null, PAR = null, VAL = {}, VISTA = 0;
/* ANTICIPO (2026-11-27): al escoger un escenario, la alerta dice lo que dará el modelo con estos valores (vista previa de sim_ui.js): «Game over en la semana N» o «Aguanta 15 años»; se va al llegar a esa semana o con el game over */
let ANT = null; export function anticipo(g) { ANT = g || { sem: 0 }; }
/* CAMBIO DE AÑO (2026-11-27, la autora: «cada 12 segundos debe cambiar»): al empezar cada año, un aviso grande con lo que cambió frente al año anterior,
   sin números (sube / baja), sacado de los indicadores «En vivo» de la simulación. Los íconos del mapa laten (chips.js, clase ken-latir). */
export function cambioAno(par, Iant, I) { const C = PAR_CFG[par]; if (!C || !I) return;
  const L = []; for (const [n, f] of C.vivo) { let a = null, b = null; try { a = Iant ? f(Iant) : null; b = f(I); } catch (e) { /* */ } if (a == null || b == null || !isFinite(a) || !isFinite(b)) continue;
    const d = b - a, rel = Math.abs(d) / Math.max(1e-6, Math.abs(a)); if (rel < 0.01 && Math.abs(d) < 0.5) continue; L.push({ n: n.toLowerCase(), sube: d > 0, rel }); }
  L.sort((x, y) => y.rel - x.rel); const ano = Math.floor((I.sem - 1) / 52) + 1;
  let el = document.getElementById('sp-ano'); if (!el) { el = document.createElement('div'); el.id = 'sp-ano'; el.setAttribute('role', 'status'); document.body.appendChild(el);
    const st = document.createElement('style'); st.textContent = '#sp-ano{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.96);z-index:47;min-width:300px;max-width:min(560px,86vw);padding:18px 24px;border-radius:18px;background:linear-gradient(180deg,rgba(28,32,38,.86),rgba(14,16,20,.92));border:1px solid rgba(255,255,255,.18);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#f2f3f5;text-align:center;opacity:0;pointer-events:none;transition:opacity .35s,transform .35s;box-shadow:0 18px 40px rgba(0,0,0,.45)}#sp-ano.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#sp-ano b{display:block;font:700 30px/1.1 "Barlow Condensed",Inter,system-ui;letter-spacing:.04em;color:#c9f27a}#sp-ano small{display:block;margin-top:2px;font:500 11px var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;opacity:.7}#sp-ano ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px;font:500 13.5px/1.3 Inter,system-ui}#sp-ano li span{display:inline-block;width:18px;font-weight:700}#sp-ano li.s span{color:#ff8a80}#sp-ano li.b span{color:#9be8b0}@keyframes ken-latir{0%,100%{transform:translate(-50%,-100%) scale(1)}50%{transform:translate(-50%,-100%) scale(1.35)}}.ken-chip.ken-latir{animation:ken-latir .6s ease-in-out 3}'; document.head.appendChild(st); }
  el.innerHTML = '<b>Año ' + ano + '</b><small>' + (C.titulo || '') + ' · ' + (I.propuesta ? 'con propuesta' : 'sin propuesta') + '</small><ul>' + (L.length ? L.slice(0, 3).map(x => '<li class="' + (x.sube ? 's' : 'b') + '"><span>' + (x.sube ? '↑' : '↓') + '</span>' + (x.sube ? 'Sube ' : 'Baja ') + x.n + '</li>').join('') : '<li>Se mantiene estable</li>') + '</ul>';
  el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 4000);
  document.querySelectorAll('.ken-chip').forEach(c => { c.classList.remove('ken-latir'); void c.offsetWidth; c.classList.add('ken-latir'); });
  if (window.KEN_ZOOM) try { window.KEN_ZOOM.siguiente(); } catch (e) { /* */ } }
export function quitar() { ANT = null; const a = document.getElementById('sp-alerta'); if (a) { a.remove(); const f = document.getElementById('su-feed'); if (f && !document.getElementById('ab-alerta')) f.style.top = ''; }
  const p = document.getElementById('sp-fxp'); if (p) p.remove(); GO = null; PAR = null; }
const GO_N = { tasa04: 'Atropellamientos', pob04: 'Población de aves', bosque05: 'Bosque talado', suelo05: 'Suelo productivo', urg06: 'Urgencia desatendida', sost06: 'Sostenibilidad', acum03: 'Residuos acumulados', edad03: 'Orgánicos sin tratar', arterias: 'Arterias saturadas', tiempo: 'Tiempo de viaje', abastoMov: 'Abastecimiento', abasto: 'Abastecimiento', trafico: 'Tráfico', ruido: 'Ruido', fauna: 'Fauna', habitat: 'Hábitat', humedal: 'Humedales', residuos: 'Residuos' };
export function gameOver(g) { GO = g || null; ANT = null; const a = alertaArriba(); a.hidden = false; a.classList.toggle('go', !!GO);
  if (GO) { const L = LIM[GO.regla], v = GO.valor != null ? (GO.regla === 'trafico' ? GO.valor * 100 : GO.valor) : null;
    a.innerHTML = `${ICO_ALERTA}<b>Game over · año ${año(GO.sem)}</b><span>${GO_N[GO.regla] || GO.regla}${GO.lugar && GO.lugar !== 'Kennedy' ? ' · ' + GO.lugar : ''}</span><strong>${L && v != null ? L.f(v) : ''}</strong><span class="go4">${L && L.sem === 1 ? 'en una semana' : '4 semanas seguidas'}</span>`; }
  feedBajo(); const der = document.getElementById('su-der'); if (der) marcarGo(der); }
function marcarGo(der) { der.querySelectorAll('#sp-go .r').forEach(e => e.classList.toggle('go', !!GO && e.dataset.go === GO.regla));
  const h = der.querySelector('#sp-go h6'); if (h) h.textContent = GO ? `Game over: ${GO_N[GO.regla] || GO.regla}` : 'Game over · límites'; }

/* ---------- HTML y montaje ---------- */
const filaLim = (k) => { const L = LIM[k]; return `<div class="r" data-go="${k}" title="Game over si ${L.txt} ${L.sem === 1 ? 'en una semana' : '4 semanas seguidas'}"><span>${L.n}</span><b>—</b><i><u></u><s style="left:${(L.lim / L.S * 100).toFixed(1)}%"></s></i></div>`; };
export function htmlAbajo(def) { const C = PAR_CFG[def && def.par]; if (!C) return '';
  return `<div id="sp-vivo"><h6>En vivo · se mueve solo</h6>${C.vivo.map(([n], i) => `<div class="r" data-vi="${i}"><span>${n}</span><b>—</b><i><u></u></i></div>`).join('')}</div>
    <button type="button" id="sp-fx" aria-haspopup="dialog" title="Cómo se calcula cada variable y cada gráfica">${ICO_FX}<span>Fórmulas</span></button>
    ${def.par === 2 ? HTML_MOV : def.par === 3 ? HTML_RES : ''}
    <div id="sp-go" aria-live="polite"><h6 title="4 semanas seguidas pasando un límite = game over. Mismos límites con y sin propuesta.">Game over · límites</h6>${PAR_LIM[def.par].map(filaLim).join('')}</div>
    <div id="sp-graf"><h6>Gráficas</h6><div class="tabs" role="tablist">${[...C.graf, { t: '¿Qué cambia con la propuesta?' }].map((g, i) => `<button type="button" role="tab" data-g="${i}" aria-selected="${i === VISTA}" title="${g.t}">${i + 1}</button>`).join('')}</div>
      <h5 data-sp="gt"></h5><p data-sp="gs"></p><svg viewBox="0 0 260 132" role="img" aria-label="Gráfica de la simulación"></svg><ul data-sp="gl"></ul></div>`; }
const HTML_MOV = '<div id="sp-mov"><h6>Territorio</h6><button type="button" id="sp-ruido" aria-pressed="false">Mapa de ruido (dB)</button>' +
  '<div class="r" data-sx="i"><span>Integración R800 · barrio</span><b>—</b></div><div class="r" data-sx="c"><span>Elección NACH · barrio</span><b>—</b></div><div class="r" data-sx="p"><span>Pasajes (4)</span><b>—</b></div><p class="sxn"></p></div>';
let SXR = null; fetch('data3d/mov02_pasajes.json').then(r => r.json()).then(j => { SXR = { ...j.resumen, pas: j.pasajes.map(p => ({ m: p.m, m30: p.m30, tala: p.tala })) }; }).catch(() => {});
function pintarMov(der, I) { const box = der.querySelector('#sp-mov'); if (!box) return; const m = I && I.mov02, set = (k, t) => { const e = box.querySelector('[data-sx="' + k + '"] b'); if (e && e.textContent !== t) e.textContent = t; };
  const b = box.querySelector('#sp-ruido'), on = !!(window.KEN_MOV02 && window.KEN_MOV02.ruidoOn); if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); } /* el botón puede no estar (otro módulo lo quita) */
  if (!SXR) return; const A = SXR.barrio800.antes, D = SXR.barrio800.despues, p = m && m.prop ? m.perm : 0, lerp = (a, c) => a + (c - a) * p;
  set('i', nf(lerp(A.nain, D.nain), 3)); set('c', nf(lerp(A.nach, D.nach), 3)); set('p', m && m.prop && p > 0 ? 'NAIN ' + nf(SXR.pasajes.nain, 2) + ' · NACH ' + nf(SXR.pasajes.nach, 2) : 'cerrados (sin propuesta)');
  const n = box.querySelector('.sxn'), m30 = SXR.pas.reduce((a, q) => a + q.m30, 0), L = SXR.pas.reduce((a, q) => a + q.m, 0), t = 'Sintaxis angular R800 calculada (tools/mov02_pasajes.mjs; entre antes y después según la permeabilidad). Los pasajes no tocan ningún árbol, pero ' + nf(m30) + ' de sus ' + nf(L) + ' m pasan a menos de 30 m del bosque: el anillo de bosque no deja cruzar el lote con 30 m de retiro.'; if (n.textContent !== t) n.textContent = t; }
const HTML_RES = '<div id="sp-mov"><h6>Territorio</h6><button type="button" id="sp-riesgo" class="on" aria-pressed="true">Riesgo sanitario y lixiviados</button></div>';
export function montar(der, { def, R } = {}) {
  { const b = der.querySelector('#sp-riesgo'); if (b) b.onclick = () => { const on = window.KEN_RES03 ? window.KEN_RES03.riesgo(!window.KEN_RES03.riesgoOn) : !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }; }
  { const b = der.querySelector('#sp-ruido'); if (b) b.onclick = () => { if (window.KEN_MOV02) window.KEN_MOV02.ruido(!window.KEN_MOV02.ruidoOn); pintarMov(der, (der._spH || [])[(der._spH || []).length - 1]); }; }
  if (!document.getElementById('sp-css')) { const st = document.createElement('style'); st.id = 'sp-css'; st.textContent = CSS; document.head.appendChild(st); }
  if (PAR !== def.par) VISTA = 0; PAR = def.par; VAL = R ? R.valores : {}; GO = null; ANT = null; alertaArriba().classList.remove('go');
  der.querySelectorAll('#sp-graf [data-g]').forEach(b => { b.setAttribute('aria-selected', +b.dataset.g === VISTA); b.onclick = () => { VISTA = +b.dataset.g; der.querySelectorAll('#sp-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x === b)); if (der._spRepinta) der._spRepinta(); }; });
  const fx = der.querySelector('#sp-fx'); if (fx) fx.onclick = () => abrirFx(der);
}
/* ---------- fórmulas ---------- */
function abrirFx(der) { let p = document.getElementById('sp-fxp');
  if (!p) { p = document.createElement('div'); p.id = 'sp-fxp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Fórmulas de la simulación'); document.body.appendChild(p); }
  p.hidden = false; der._spFx = true; pintarFx(der); const x = p.querySelector('.x'); if (x) x.focus(); }
function cerrarFx() { const p = document.getElementById('sp-fxp'); if (p) p.hidden = true; const d = document.getElementById('su-der'); if (d) { d._spFx = false; const b = d.querySelector('#sp-fx'); if (b) b.focus(); } }
addEventListener('keydown', (e) => { if (e.key === 'Escape') { const p = document.getElementById('sp-fxp'); if (p && !p.hidden) cerrarFx(); } });
function pintarFx(der) { const p = document.getElementById('sp-fxp'); if (!p || p.hidden) return;
  const H = der._spH || [], I = H[H.length - 1], C = PAR_CFG[PAR]; if (!C) return;
  const f = (n, v, t) => `<div><dt>${n}<b>${v}</b></dt><dd>${t}</dd></div>`;
  let h = `<button type="button" class="x" aria-label="Cerrar las fórmulas">${ICO_X}</button><h3>Fórmulas · ${C.titulo}</h3><p>${I ? `Semana ${nf(I.sem)} (año ${año(I.sem)}), ${I.propuesta ? 'con' : 'sin'} propuesta.` : 'Dale play: los valores aparecen semana a semana.'} Fuentes y supuestos: docs/todas_las_simulaciones.md.</p>`;
  if (I) { h += `<h4>Variables</h4><dl>${C.fx.map(([n, v, t]) => { let a = '—', b = ''; try { a = v(I, VAL); b = t(I, VAL); } catch (e) { /* dato que falta */ } return f(n, a, b); }).join('')}</dl>`;
    h += `<h4>Límites · game over</h4><dl>${PAR_LIM[PAR].map(k => { const L = LIM[k]; return f(L.n, L.f(L.v(I), k === 'fauna' ? I : null), `game over si ${L.txt} ${L.sem === 1 ? 'en una semana' : '4 semanas seguidas'} · límite ${L.f(L.lim)}`); }).join('')}</dl>`;
    h += `<h4>Gráficas</h4><dl>${C.graf.map((g, i) => f(`${i + 1} · ${g.t}`, '', g.sub(I))).join('')}${f(`${C.graf.length + 1} · Con frente a sin`, '', 'los mismos límites en la misma semana de las dos corridas (mismos valores de las variables)')}</dl>`; }
  if (p._h !== h) { p.innerHTML = h; p._h = h; p.querySelector('.x').onclick = cerrarFx; } }

/* ---------- repintar (sim_ui.js, como mucho 4 veces por segundo) ---------- */
export function actualizar(der, H, FIN = 780, B = null, def = {}) {
  const C = PAR_CFG[def.par], g = der && der.querySelector('#sp-graf svg'); if (!C || !g) return;
  der._spRepinta = () => actualizar(der, H, FIN, B, def); der._spH = H; PAR = def.par;
  const I = H && H.length ? H[H.length - 1] : null, prop = !!def.propuesta;
  if (GO && (!H || H.length < GO.sem)) { GO = null; const a = document.getElementById('sp-alerta'); if (a) a.remove(); }
  const a = alertaArriba(); a.classList.toggle('ant', !GO && !!ANT && !!ANT.sem && (!H || H.length <= ANT.sem)); if (!GO) { const [t, v] = ANT && (!H || !ANT.sem || H.length <= ANT.sem) ? (ANT.sem ? ['Game over en la semana ' + nf(ANT.sem) + ' · año ' + año(ANT.sem), GO_N[ANT.regla] || ANT.regla] : ['Aguanta 15 años', 'sin game over']) : C.alerta(I, VAL); const pt = a.querySelector('[data-sp="t"]'), pv = a.querySelector('[data-sp="v"]'); if (pt && pt.textContent !== t) pt.textContent = t; if (pv && pv.textContent !== v) pv.textContent = v; } feedBajo();
  // en vivo
  C.vivo.forEach(([n, f, mx, fmt], i) => { const e = der.querySelector(`#sp-vivo [data-vi="${i}"]`); if (!e) return; let v = null; try { v = I ? f(I) : null; } catch (x) { v = null; }
    const b = e.querySelector('b'), t = v == null ? '—' : fmt(v); if (b.textContent !== t) b.textContent = t; e.querySelector('u').style.width = (v == null ? 0 : Math.max(0, Math.min(100, v / mx * 100))).toFixed(1) + '%'; });
  // límites (y la regla de un game over que no esté en la lista)
  const ks = PAR_LIM[def.par].slice(); if (GO && LIM[GO.regla] && !ks.includes(GO.regla)) { ks.push(GO.regla); if (!der.querySelector(`#sp-go [data-go="${GO.regla}"]`)) der.querySelector('#sp-go').insertAdjacentHTML('beforeend', filaLim(GO.regla)); }
  for (const k of ks) { const e = der.querySelector(`#sp-go [data-go="${k}"]`); if (!e) continue; const L = LIM[k];
    const v = I ? L.v(I) : null, m = v != null && malo(k, v), c = v != null && cercaDe(k, v), r = GO && GO.regla === k ? (L.sem || 4) : I ? Math.min(L.sem || 4, L.r(I)) : 0;
    e.classList.toggle('mal', !!m); const u = e.querySelector('u'); u.style.width = (v == null ? 0 : Math.max(0, Math.min(100, v / L.S * 100))).toFixed(1) + '%'; u.style.background = m ? COL.mal : c ? COL.amb : COL.ok;
    const b = e.querySelector('b'), h = v == null ? '—' : `${L.f(v, k === 'fauna' ? I : null)}${r ? `<em>${r}/${L.sem || 4} sem</em>` : ''}`; if (b.innerHTML !== h) b.innerHTML = h; }
  marcarGo(der); if (def.par === 2) pintarMov(der, I);
  if (der._spFx) pintarFx(der);
  // gráfica
  const put = (k, s) => { const e = der.querySelector(`#sp-graf [data-sp="${k}"]`); if (e && e.innerHTML !== s) e.innerHTML = s; };
  const G = C.graf[VISTA]; put('gt', `${VISTA + 1} · ${G ? G.t : '¿Qué cambia con la propuesta?'}`);
  if (!I) { g.innerHTML = '<text x="130" y="66" text-anchor="middle">Dale play: la gráfica se arma semana a semana</text>'; put('gs', ''); put('gl', ''); return; }
  const r = G ? lineas(H, FIN, B, prop, I, G) : cmp(H, B, I, def.par);
  g.innerHTML = r.svg; put('gs', r.sub); put('gl', r.ley.map(([c, n, cl]) => `<li><i class="${cl || ''}" style="${cl === 'b' ? 'background' : 'border-color'}:${c}"></i>${n}</li>`).join(''));
}
/* ---------- gráficas (viewBox 260 × 132), mismas reglas que la 01: una pregunta, valor rotulado al final ---------- */
const W = 260, HH = 132, PL = 30, PR = 52, PT = 8, PB = 16, IW = W - PL - PR, IH = HH - PT - PB;
const muestra = (H) => { const r = [], p = Math.max(1, Math.floor(H.length / 160)); for (let i = 0; i < H.length; i += p) r.push(H[i]); if (r[r.length - 1] !== H[H.length - 1]) r.push(H[H.length - 1]); return r; };
const ejeX = (x) => { let s = ''; for (const a of [1, 5, 10, 15]) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${HH - 3}" text-anchor="middle">año ${a}</text>`; return s; };
const val = (f, h) => { try { const v = f(h); return v != null && isFinite(v) ? v : null; } catch (e) { return null; } };
function serie(M, f, x, y) { let d = '', n = 0; for (const h of M) { const v = val(f, h); if (v == null) { n = 0; continue; } d += (n++ ? 'L' : 'M') + x(h.sem).toFixed(1) + ' ' + y(v).toFixed(1); } return d; }
function rotulos(items) { items.sort((a, b) => a.y - b.y); for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 23) items[i].y = items[i - 1].y + 23;
  return items.map(o => `<circle cx="${o.x.toFixed(1)}" cy="${o.y0.toFixed(1)}" r="2.6" fill="${o.c}"/><text class="v" x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 1).toFixed(1)}" style="fill:${o.c}">${o.v}</text><text x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 9).toFixed(1)}">${o.n}</text>`).join(''); }
function lineas(H, FIN, B, prop, I, G) {
  const M = muestra(H), MB = B && B.length ? muestra(B.slice(0, Math.min(B.length, I.sem))) : null, x = (s) => PL + (s - 1) / (FIN - 1) * IW;
  const cA = prop ? COL.vio : COL.cor, cB = prop ? COL.cor : COL.vio, S = G.s.map((q, i) => ({ ...q, c: q.c || (i ? COL.tur : cA) }));
  const vs = []; for (const q of S) for (const h of M) { const v = val(q.f, h); if (v != null) vs.push(v); } if (MB) for (const h of MB) { const v = val(S[0].f, h); if (v != null) vs.push(v); } if (G.lim != null) vs.push(G.lim);
  let mn = Math.min(...vs), mx = Math.max(...vs); const pad = Math.max(1e-6, (mx - mn) * 0.15) || 1; mn = Math.max(0, mn - pad); mx = mx + pad; if (mx - mn < 1e-6) mx = mn + 1;
  const y = (v) => PT + IH - (v - mn) / (mx - mn) * IH; let svg = '';
  for (let i = 0; i <= 3; i++) { const v = mn + (mx - mn) * i / 3; svg += `<line x1="${PL}" x2="${W - PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/><text x="${PL - 3}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${G.fmt(v).replace(/ %$/, '')}</text>`; }
  svg += ejeX(x);
  if (G.lim != null) svg += `<line x1="${PL}" x2="${W - PR}" y1="${y(G.lim).toFixed(1)}" y2="${y(G.lim).toFixed(1)}" stroke="${COL.oro}" stroke-width="1.5" stroke-dasharray="5 3"/><text x="${PL + 3}" y="${(y(G.lim) - 3).toFixed(1)}" style="fill:${COL.oro}">${G.limTxt}</text>`;
  if (MB) svg += `<path d="${serie(MB, S[0].f, x, y)}" fill="none" stroke="${cB}" stroke-width="1.4" stroke-dasharray="3 3" stroke-opacity=".8"/>`;
  const d0 = serie(M, S[0].f, x, y), x1 = x(I.sem); if (d0) svg += `<path d="${d0}L${x1.toFixed(1)} ${PT + IH}L${x(M[0].sem).toFixed(1)} ${PT + IH}Z" fill="${S[0].c}" fill-opacity=".14"/>`;
  S.forEach((q, i) => { svg += `<path d="${serie(M, q.f, x, y)}" fill="none" stroke="${q.c}" stroke-width="${i ? 2 : 2.4}" stroke-linecap="round"/>`; });
  const rot = S.map(q => { const v = val(q.f, I); return v == null ? null : { x: x1, y0: y(v), y: y(v), c: q.c, v: G.fmt(v), n: q.n }; }).filter(Boolean);
  const vb = MB && MB.length ? val(S[0].f, MB[MB.length - 1]) : null; if (vb != null) rot.push({ x: x1, y0: y(vb), y: y(vb), c: cB, v: G.fmt(vb), n: prop ? 'sin propuesta' : 'con propuesta' });
  svg += rotulos(rot);
  const ley = [[S[0].c, (prop ? 'Con propuesta' : 'Sin propuesta') + (S.length > 1 ? ' · ' + S[0].n : '')], ...S.slice(1).map(q => [q.c, q.n]), ...(MB ? [[cB, prop ? 'Sin propuesta' : 'Con propuesta', 'd']] : []), ...(G.lim != null ? [[COL.oro, 'Límite', 'd']] : [])];
  return { svg, sub: G.sub(I), ley }; }
/* con frente a sin: cada límite del par en la misma semana, en la escala de su barra */
function cmp(H, B, I, par) { const sem = I.sem, Bh = B && B.length ? B[Math.min(B.length, sem) - 1] : null, prop = !!I.propuesta, S = prop ? Bh : I, C = prop ? I : Bh;
  const ks = PAR_LIM[par], fila = Math.min(42, (HH - 6) / ks.length), x0 = 4, x1 = W - 60, xs = (k, v) => x0 + Math.max(0, Math.min(1.05, v / LIM[k].S)) / 1.05 * (x1 - x0); let svg = '';
  ks.forEach((k, i) => { const L = LIM[k], y0 = 2 + i * fila, vs = S ? L.v(S) : null, vc = C ? L.v(C) : null;
    svg += `<text x="${x0}" y="${(y0 + 7).toFixed(1)}" style="fill:#eef0ff">${L.n}</text><line x1="${xs(k, L.lim).toFixed(1)}" x2="${xs(k, L.lim).toFixed(1)}" y1="${(y0 + 9).toFixed(1)}" y2="${(y0 + fila - 4).toFixed(1)}" stroke="${COL.oro}" stroke-dasharray="2 2"/>`;
    const bh = Math.max(5, (fila - 14) / 2 - 1);
    [[vs, COL.cor, 'sin'], [vc, COL.vio, 'con']].forEach(([v, c, n], j) => { const yy = y0 + 10 + j * (bh + 2); if (v == null) { svg += `<text x="${x0}" y="${(yy + bh - 1).toFixed(1)}" style="opacity:.5">${n}: calculando…</text>`; return; }
      svg += `<rect x="${x0}" y="${yy.toFixed(1)}" width="${Math.max(1, xs(k, v) - x0).toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${c}"/><text class="v" x="${(Math.min(xs(k, v), x1) + 4).toFixed(1)}" y="${(yy + bh - 0.5).toFixed(1)}" style="font-size:9.5px;fill:${c}">${L.f(v)} · ${n}</text>`; }); });
  return { svg, sub: `Semana ${nf(sem)} de las dos corridas, mismos valores. Raya dorada = límite.`, ley: [[COL.cor, 'Sin propuesta', 'b'], [COL.vio, 'Con propuesta', 'b']] }; }
