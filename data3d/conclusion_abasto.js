/* ============ CONCLUSIÓN GENERAL DEL PAR 01 · ABASTECIMIENTO (informe.js) ============
   conclusionAbasto({ H, B, go, def, parametros, completo }) → { estado, big, eye, frase, veredicto, html, pintar(root) }
   Todo sale de la corrida (I.abasto.ab01 de data3d/simulaciones12.js, una semana por elemento de H; B = la otra mitad del par).
   v3 (docs/sim01_abastecimiento_v3.md, 2026-11-26). VEREDICTO (reglas fijas, las mismas con y sin propuesta):
     · NO SOSTENIBLE (game over): se cumplió 4 semanas seguidas una regla: déficit (un sector bajo 80 % de su demanda), saturación (inventario de
       Corabastos sobre 14.000 t) o residuos de Kennedy (296 t/día sin recoger). También cualquiera de las reglas generales del simulador.
     · SOSTENIBLE: sin game over, ningún sector bajó de 87 %, el inventario no pasó de 90 % de 14.000 t y lo sin recoger quedó bajo 2/3 del
       camino al game over (247 t/día).
     · v5: veredicto BINARIO (pedido de la autora): Sostenible = sin game over en los 15 años; No sostenible = game over. Ya no hay «con condiciones».
   PLANTILLA FIJA de las dos tarjetas: (1) qué se cambió, (2) demanda frente a lo que llega, (3) Corabastos e inventario, (4) cuándo y dónde
   falló o por qué aguantó, (5) conclusión y una recomendación: la palanca que más mueve el resultado en la semana crítica, con las mismas
   ecuaciones de una semana del modelo (ab01Paso) moviendo cada palanca un cuarto de su rango. */
const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const añoDe = (sem) => Math.min(15, Math.floor((Math.max(1, sem) - 1) / 52) + 1);
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ING = 6460, MERC_T = 28, CAP = 14000, PERD = 0.0155, KG = 0.951, HUERTA_T = 50 * 6 / 365 / 1000;
const FUENTE = { pobK: '1.034.838 hab (autora)', demT: '984 t/día = población × 0,951 kg (autora)', demanda: '0,951 kg/hab/día (autora)', volumen: '6.460 t/día, DANE-SIPSA 2025', coraTope: 'ocupación 90 %, SDDE-FAO 2018 (inferencia)', autoconsumo: 'comida que producen los hogares: supuesto, sin dato para Kennedy', pobCrece: 'DANE 2017–2022', mercados: 'hasta 28 t/día cada uno (215 puestos), Contraloría 2025 (derivado)', huertasH: '50 m² × 6 kg/m²·año por huerta (supuesto)' };
/* palancas de política (población, consumo y crecimiento son la prueba de estrés, no palancas) */
const PAL = [
  { k: 'autoconsumo', n: 'Comida que producen los hogares', paso: 7.5, max: 30, u: ' %' },
  { k: 'mercados', n: 'Mercados', paso: 5, max: 50, u: '' },
  { k: 'huertasH', n: 'Huertas hidropónicas', paso: 500, max: 2000, u: '', soloProp: true },
  { k: 'coraTope', n: 'Tope de ingreso diario', paso: 5, max: 25, u: ' %' },
  { k: 'volumen', n: 'Ingreso a Corabastos', paso: 15, max: 120, u: ' %' }];

/* una semana de ab01Paso (simulaciones12.js) con las palancas cambiadas, desde el inventario inicial de esa semana: cobertura de Kennedy y saturación */
function evaluar(U, x) {
  const demK = U.demK * x.dem / U.dem, autoT = x.auto * demK, resto = demK * (1 - x.auto);
  const porM = U.nAct > 0 ? U.mercT / U.nAct : MERC_T * 0.7, escala = U.demK * (1 - U.auto) > 0 ? resto / (U.demK * (1 - U.auto)) : 1;
  const mercT = Math.min(x.nM * MERC_T, Math.max(0, U.mercT * escala + (x.nM - U.nAct) * Math.min(MERC_T, porM * escala)), resto);
  const huT = Math.min(Math.max(0, resto - mercT), x.nH * HUERTA_T);
  /* v4 (docs/sim01_abastecimiento_v4.md): la región manda lo que se pide × «Ingreso»; sale inventario ÷ permanencia (Little); lo que nadie pide se queda */
  const RK = Math.max(0, resto - mercT - huT), L = U.resto + RK, tope = ING * (1 + x.topeF), ing = Math.max(0, Math.min(x.vol * L / (1 - PERD), tope));
  const Tp = U.Tp || U.invIni / ING, eq = ing * Tp, invL = eq + (U.invIni - eq) * Math.exp(-7 / Tp);
  let desp = Math.max(0, U.invIni + 7 * ing - invL) * (1 - PERD), inv = invL;
  if (desp > 7 * L) { desp = 7 * L; inv = Math.max(0, U.invIni + 7 * ing - desp / (1 - PERD)); }
  const f = L > 0 ? desp / (7 * L) : 1;
  return { cob: demK > 0 ? (autoT + mercT + huT + f * RK) / demK : 1, sat: inv / CAP };
}
const CERCA_RES = 148 + 2 / 3 * 148; // 2/3 del camino de hoy (148 t/día sin recoger) al game over (296)
export function conclusionAbasto({ H, B = null, go = null, def = {}, parametros = {}, completo = true }) {
  const X = (h) => h && h.abasto && h.abasto.ab01; const W = H.filter(X); if (!W.length) return null;
  const L = W[W.length - 1], prop = !!def.propuesta, sl = def.sliders || [];
  // --- estadísticas de la corrida ---
  let sCor = 0, sMer = 0, sAut = 0, sHu = 0, sDem = 0, maxSat = 0, wMaxSat = null, minCob = 9, wMinCob = null, usoS = 0, usoN = 0, usoMax = 0, llenos = 0, minSec = 999, wMinSec = null, secMin = '', corto = 0;
  const peor = new Map();
  W.forEach((h, i) => { const U = X(h); sCor += U.coraK; sMer += U.mercT; sAut += U.autoT; sHu += U.huertaT || 0; sDem += U.demK;
    if (U.sat > maxSat) { maxSat = U.sat; wMaxSat = h; } if (U.f < 0.9999) corto++;
    if (U.cobK < minCob) { minCob = U.cobK; wMinCob = h; }
    if (U.mercCap > 0) { const u = U.mercT / U.mercCap; usoS += u; usoN++; if (u > usoMax) usoMax = u; if (u > 0.995) llenos++; }
    const cm = U.secMin * 100; if (cm < minSec) { minSec = cm; wMinSec = h; secMin = (U.sectores[U.secArg] || {}).n || ''; }
    if (i % 2 === 0 || i === W.length - 1) for (const s of U.sectores) { const p = peor.get(s.n); if (!p || s.cob * 100 < p.v) peor.set(s.n, { v: s.cob * 100, sem: h.sem }); } });
  const peores = [...peor.entries()].sort((a, b) => a[1].v - b[1].v).slice(0, 3).map(([n, p]) => ({ n, ...p }));
  const usoM = usoN ? usoS / usoN : 0, a1 = W.slice(0, Math.min(52, W.length)), aN = W.slice(-Math.min(52, W.length));
  const prom = (A, k) => A.reduce((a, h) => a + X(h)[k], 0) / A.length, dem1 = prom(a1, 'demK'), demN = prom(aN, 'demK');
  const Bo = (h) => h && h.abasto && h.abasto.bodegas, Rk = (h) => h && h.residuosK;
  let maxB = 0, wMaxB = null, maxR = 0, wMaxR = null, maxD = 0;
  W.forEach(h => { const b = Bo(h), r = Rk(h); if (b) { if (b.max > maxB) { maxB = b.max; wMaxB = h; } } if (r) { if (r.noRec > maxR) { maxR = r.noRec; wMaxR = h; } if (r.D > maxD) maxD = r.D; } });
  const sobre = W.filter(h => X(h).sat > 1).length;
  const estado = go ? 'go' : 'sostenible'; /* v5: veredicto binario (pedido de la autora): No sostenible = game over; Sostenible = 15 años sin game over */
  // --- semana crítica y sensibilidad ---
  const crit = go ? (W.find(h => h.sem === go.sem) || L) : minSec < 87 ? wMinSec : maxSat > 0.9 && wMaxSat ? wMaxSat : maxR >= CERCA_RES && wMaxR ? wMaxR : wMinSec || L, UC = X(crit);
  const base = { dem: UC.dem, vol: UC.vol, topeF: UC.topeF, auto: UC.auto, nM: prop ? UC.nM : 0, nH: prop ? UC.nH || 0 : 0 }, r0 = evaluar(UC, base);
  const problema = go ? (go.regla === 'saturacion' ? 'sat' : go.regla === 'residuosK' ? 'res' : 'cob') : minSec < 87 ? 'cob' : maxSat > 0.9 ? 'sat' : maxR >= CERCA_RES ? 'res' : 'margen';
  const sens = PAL.filter(P => !P.soloProp || prop).map(P => { const x = { ...base }; let de, a;
    if (P.k === 'autoconsumo') { de = base.auto * 100; a = Math.min(P.max, de + P.paso); x.auto = a / 100; }
    else if (P.k === 'mercados') { de = base.nM; a = Math.min(P.max, de + P.paso); x.nM = a; }
    else if (P.k === 'huertasH') { de = base.nH; a = Math.min(P.max, de + P.paso); x.nH = a; }
    else if (P.k === 'coraTope') { de = base.topeF * 100; a = Math.min(P.max, de + P.paso); x.topeF = a / 100; }
    else { de = base.vol * 100; a = Math.min(P.max, de + P.paso); x.vol = a / 100; }
    const r = evaluar(UC, x), dCob = (r.cob - r0.cob) * 100, dCar = (r.sat - r0.sat) * 100;
    return { ...P, de, a, dCob, dCar, dOcc: 0, score: problema === 'sat' ? -dCar + 0.05 * dCob : dCob + 0.05 * -dCar, agotada: a <= de + 1e-9 }; });
  const mejor = problema === 'res' ? null : sens.filter(s => !s.agotada && s.score > 0.05).sort((a, b) => b.score - a.score)[0] || null; // los residuos no los mueve ninguna de estas palancas (ver t5)
  // --- textos (plantilla fija) ---
  const cambios = sl.filter(s => s.k !== 'demT' && parametros[s.k] != null && Math.abs(+parametros[s.k] - s.val) > 1e-9).map(s => `${s.n} ${nf(parametros[s.k], s.paso < 1 ? 1 : 0)} ${s.unidad}${parametros.pobDesde != null && s.k === 'pobK' ? ` desde la semana ${nf(parametros.pobDesde)}` : ''} (por defecto ${nf(s.val, s.paso < 1 ? 1 : 0)}: ${FUENTE[s.k] || 'ver fuentes'})`);
  const t1 = cambios.length ? `Se cambió: ${cambios.join('; ')}. Lo demás quedó en los valores por defecto.` : `Valores por defecto: 1.034.838 habitantes × 0,951 kg = 984 t/día, 6.460 t/día que entran a Corabastos (DANE-SIPSA 2025), capacidad de referencia 14.000 t, crecimiento 0,5 %/año (DANE)${prop ? ', ${nf(X(L).nM)} mercados de hasta 28 t/día (Contraloría 2025) que abren hasta el año 13,5 y ${nf(X(L).nH)} huertas hidropónicas (supuesto)' : ''} y comida producida en casa 0 % (supuesto).`;
  const pc = (v) => nf(v / sDem * 100, 1);
  const t2 = `La demanda de Kennedy pasó de ${nf(dem1)} t/día en el año 1 a ${nf(demN)} t/día en el año ${añoDe(L.sem)} (población ${nf(X(W[0]).pob)} → ${nf(X(L).pob)}). La cubrieron Corabastos ${pc(sCor)} %, los mercados ${pc(sMer)} %, las huertas ${pc(sHu)} % y lo que producen los hogares ${pc(sAut)} %; en su peor semana Kennedy recibió ${nf(minCob * 100, 1)} % de lo que necesitaba (año ${añoDe(wMinCob.sem)}).`;
  const t2b = '';
  const U0 = X(W[0]), mS = X(wMaxSat || L);
  const t3b = '';
  const t3 = `El inventario de Corabastos empezó en ${nf(U0.invIni)} t (${nf(U0.invIni / CAP * 100)} % de 14.000) y llegó como máximo a ${nf(mS.inv)} t (${nf(maxSat * 100)} %, año ${añoDe((wMaxSat || L).sem)}); al final tenía ${nf(X(L).inv)} t. ${sobre ? `Pasó las 14.000 t ${nf(sobre)} semanas.` : 'Nunca pasó las 14.000 t.'} ${corto ? `En ${nf(corto)} semanas no alcanzó para todo lo pedido (entran ${nf(X(L).ing)} t/día y se piden ${nf(X(L).L)}): la población no llena Corabastos, lo vacía.` : 'Siempre alcanzó para todo lo pedido.'} ${prop ? (usoN ? `Los mercados usaron en promedio ${nf(usoM * 100)} % de su capacidad (máximo ${nf(usoMax * 100)} %).` : 'No hubo mercados abiertos.') : 'Sin propuesta no hay mercados que repartan la carga.'}`;
  let t4;
  const rN = Rk(L), rM = Rk(wMaxR);
  const est = rN && rN.nEst ? ` Las ${nf(rN.nEst)} Estaciones Circulares abiertas (20 t/día cada una) trataban ${nf(rN.trat)} t/día de orgánicos al final.` : '';
  const t4r = rM ? ` Residuos: lo que no se recoge llegó a ${nf(maxR)} t/día (hoy 148, game over 296) en el año ${añoDe(wMaxR.sem)}; La Vaca se degradó hasta ${nf(maxD * 100)} % y perdió ${nf(maxD * 50)} % de sus árboles e interacciones.${est}` : '';
  if (go && go.regla === 'saturacion') { const U = X(crit) || UC;
    t4 = `Game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}): ${esc(go.motivo)}. Causa: entran más alimentos (${nf(U.ing)} t/día) de los que se despachan (${nf(U.desp)}) y se pierden (${nf(U.perd)}): el inventario se acumula.${t4r}`; }
  else if (go && go.regla === 'residuosK') { const r = Rk(crit) || rN;
    t4 = `Game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}): ${esc(go.motivo)}. Causa: Kennedy generaba ${nf(r ? r.gen : null)} t/día (hoy 922, +2,7 %/año y 0,19 t por cada tonelada extra de comida) y la recolección ordinaria se queda en 774${r && r.trat > 0.5 ? `; las Estaciones Circulares trataban ${nf(r.trat, 1)} t/día` : ''}.${t4r}`; }
  else if (go && go.regla === 'deficit') { const U = X(crit) || UC;
    t4 = `Game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}): ${esc(go.motivo)}. Causa: se pedían ${nf(U.L)} t/día a Corabastos y solo podía despachar ${nf(U.desp)}: todos reciben la misma fracción (${nf(U.f * 100, 1)} %) y el faltante pesa más en los sectores lejos de Corabastos.${t4r}`; }
  else if (go) t4 = `Game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}) por una regla general del simulador: ${esc(go.motivo)}.${t4r}`;
  else t4 = `No llegó a game over${completo ? ' en los 15 años' : ' hasta ahora'}: el sector peor servido fue ${esc(secMin)} con ${nf(minSec, 1)} % (año ${añoDe(wMinSec.sem)}) y el inventario llegó como máximo a ${nf(maxSat * 100)} % de 14.000 t.${t4r}`;
  const accion = (s) => s.k === 'autoconsumo' ? `subir la comida que producen los hogares de ${nf(s.de)} % a ${nf(s.a)} %`
    : s.k === 'mercados' ? (prop ? `abrir más mercados de 28 t/día: de ${nf(s.de)} a ${nf(s.a)}` : `pasar a la red de la propuesta con ${nf(s.a)} mercados de 28 t/día`)
    : s.k === 'huertasH' ? `activar más huertas hidropónicas: de ${nf(s.de)} a ${nf(s.a)}`
    : s.k === 'coraTope' ? `cambiar el tope de ingreso diario de +${nf(s.de)} % a +${nf(s.a)} %`
    : `asegurar más oferta de la región (acuerdos con productores y circuitos cortos): ingreso de ${nf(s.de)} % a ${nf(s.a)} %`;
  const efecto = (s) => `${s.dCob >= 0 ? '+' : '−'}${nf(Math.abs(s.dCob), 1)} pts de cobertura y ${s.dCar <= 0 ? '−' : '+'}${nf(Math.abs(s.dCar), 1)} pts del límite de Corabastos`;
  const VERD = { go: 'Game over', sostenible: 'Sostenible' };
  const rC = Rk(crit) || rN, falta = rC ? Math.max(0, rC.noRec - CERCA_RES) : 0;
  const recRes = `Recomendación: separar y tratar cerca de la fuente al menos ${nf(Math.ceil(falta))} t/día más de orgánicos (Estaciones Circulares, E4) para que lo sin recoger quede bajo ${nf(CERCA_RES)} t/día en la semana crítica (año ${añoDe(crit.sem)})${rC && rC.trat > 0.5 ? `; hoy tratan ${nf(rC.trat, 1)} t/día${rC.nEst ? ` en ${nf(rC.nEst)} estaciones de 20 t/día` : ''}` : '; sin propuesta no hay Estaciones: la propuesta tiene 20 de 20 t/día que abren por fases'}. Ninguna palanca del abasto los baja: más comida que llega es más residuo.`;
  const t5 = `${VERD[estado]}${completo || go ? '' : ' (hasta ahora)'}. ${problema === 'res' ? recRes : mejor && (Math.abs(mejor.dCob) > 0.05 || Math.abs(mejor.dCar) > 0.05) ? `Recomendación: ${accion(mejor)}. En la semana crítica (año ${añoDe(crit.sem)}) es la palanca que más mueve el resultado: ${efecto(mejor)}.` : (problema === 'margen' ? 'Recomendación: mantener estas condiciones.' : 'Ninguna palanca de la lista mejora el resultado en la semana crítica: hay que cambiar lo que se probó (' + (problema === 'sat' ? 'lo que entra a Corabastos' : 'la demanda') + ').')}`;
  // --- tarjetas ---
  const pasos = (arr) => `<ol class="c01-ol">${arr.map(([k, t]) => `<li><b>${k}</b><span>${t}</span></li>`).join('')}</ol>`;
  const tabla = `<table class="c01-sens"><thead><tr><th>Palanca · un cuarto de su rango</th><th>Cobertura</th><th>Límite Corabastos</th></tr></thead><tbody>${sens.map(s => `<tr class="${mejor && s.k === mejor.k ? 'mx' : ''}"><td>${esc(s.n)} ${s.agotada ? '(al máximo)' : `${nf(s.de, s.k === 'autoconsumo' ? 1 : 0)} → ${nf(s.a, s.k === 'autoconsumo' ? 1 : 0)}${s.u}`}</td><td>${s.dCob >= 0 ? '+' : '−'}${nf(Math.abs(s.dCob), 1)} pts</td><td>${s.dCar <= 0 ? '−' : '+'}${nf(Math.abs(s.dCar), 1)} pts</td></tr>`).join('')}</tbody></table>`;
  const html = `<section class="c01" data-a style="--d:1300" aria-labelledby="c01-t"><div class="c01-h"><span class="i2-lab">Conclusión general</span><h3 id="c01-t" class="c01-v ${estado}">${VERD[estado]}${completo || go ? '' : ' · hasta el año ' + añoDe(L.sem)}</h3></div>
    <div class="c01-g">
      <article class="c01-c i2-panel"><h4>¿Alcanza la comida y aguanta Corabastos?</h4><p class="c01-s">Lo que recibe Kennedy (t/día) frente a la demanda y al 80 %; abajo, el inventario de Corabastos frente a 14.000 t.</p><div class="c01-fig" data-c01="1"></div>
        ${pasos([['1 · Qué se cambió', esc(t1)], ['2 · Oferta y demanda', esc(t2 + t2b)], ['3 · Corabastos y mercados', esc(t3)]])}</article>
      <article class="c01-c i2-panel"><h4>¿Aguantan los residuos y La Vaca?</h4><p class="c01-s">Residuos sin recoger (t/día) frente al game over de 296.</p><div class="c01-fig" data-c01="2"></div>
        ${pasos([['4 · Cuándo y dónde', esc(t4)], ['5 · Conclusión', esc(t5)]])}${tabla}</article>
    </div></section>`;
  // --- diagramas (se dibujan al ancho real) ---
  const muestra = []; for (let i = 0; i < W.length; i += 4) muestra.push(W[i]); if (muestra[muestra.length - 1] !== L) muestra.push(L);
  const BB = B && B.length ? B.filter(X) : null, muestraB = BB ? (() => { const r = []; for (let i = 0; i < BB.length && BB[i].sem <= L.sem; i += 4) r.push(BB[i]); return r; })() : null; // la otra mitad solo hasta la semana de esta corrida
  const FIN = Math.max(52, Math.ceil(L.sem / 52) * 52), nA = FIN / 52; // eje: los años corridos (un game over temprano no queda aplastado)
  const ejeX = (x, w, h) => { let s = ""; if (nA === 1) { for (const k of [1, 13, 26, 39, 52]) s += `<text x="${x(k).toFixed(1)}" y="${h - 6}" text-anchor="middle">sem ${k}</text>`; return s; } for (let a = 1; a <= nA; a += (w < 420 || nA > 10 ? 2 : 1)) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${h - 6}" text-anchor="middle">${a}</text>`; return s; };
  function fig1(w) {
    const h = 200, pl = 42, pr = 10, pt = 10, pb = 22, iw = w - pl - pr, ih = h - pt - pb, mx = Math.max(...muestra.map(q => Math.max(X(q).demK, X(q).coraK + X(q).mercT + X(q).autoT + (X(q).huertaT || 0)))) * 1.08;
    const x = (s) => pl + (s - 1) / (FIN - 1) * iw, y = (v) => pt + ih - v / mx * ih;
    const capa = (f0, f1) => { const a = muestra.map(q => `${x(q.sem).toFixed(1)},${y(f1(X(q))).toFixed(1)}`), b = muestra.slice().reverse().map(q => `${x(q.sem).toFixed(1)},${y(f0(X(q))).toFixed(1)}`); return a.concat(b).join(' '); };
    const lin = (f) => muestra.map((q, i) => `${i ? 'L' : 'M'}${x(q.sem).toFixed(1)} ${y(f(X(q))).toFixed(1)}`).join('');
    let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Oferta frente a demanda de Kennedy en 15 años">`;
    const pasoY = mx > 600 ? 200 : 100; for (let v = 0; v <= mx; v += pasoY) s += `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${nf(v)}</text>`;
    s += ejeX(x, w, h);
    s += `<defs><linearGradient id="c01-g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7d6bff" stop-opacity=".75"/><stop offset="1" stop-color="#304ffe" stop-opacity=".3"/></linearGradient></defs>`;
    s += `<polygon points="${capa(() => 0, U => U.coraK)}" fill="url(#c01-g1)"/><polygon points="${capa(U => U.coraK, U => U.coraK + U.mercT)}" fill="#c08f1c" fill-opacity=".8"/><polygon points="${capa(U => U.coraK + U.mercT, U => U.coraK + U.mercT + U.autoT + (U.huertaT || 0))}" fill="#22a89d" fill-opacity=".85"/>`;
    s += `<path d="${lin(U => U.demK)}" fill="none" stroke="var(--ink)" stroke-width="1.8"/><path d="${lin(U => 0.8 * U.demK)}" fill="none" stroke="var(--s-lim)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    if (go) s += `<line x1="${x(go.sem).toFixed(1)}" x2="${x(go.sem).toFixed(1)}" y1="${pt}" y2="${pt + ih}" stroke="var(--s-crit)" stroke-dasharray="2 3"/><text x="${(x(go.sem) + (x(go.sem) < pl + 90 ? 4 : -4)).toFixed(1)}" y="${pt + 10}" text-anchor="${x(go.sem) < pl + 90 ? 'start' : 'end'}" fill="var(--mal)">game over</text>`;
    const tot = sCor + sMer + sAut + sHu || 1, seg = [[sCor, '#7d6bff', 'Corabastos'], [sMer, '#c08f1c', 'Mercados'], [sAut + sHu, '#22a89d', 'Hogares y huertas']];
    let a0 = -Math.PI / 2, dona = '<svg viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="Quién cubrió la demanda en toda la corrida">';
    const Pp = (r, a) => `${(48 + r * Math.cos(a)).toFixed(2)} ${(48 + r * Math.sin(a)).toFixed(2)}`;
    for (const [v, c, n] of seg) { if (!(v > 0)) continue; const a1 = a0 + v / tot * Math.PI * 2 - (v >= tot ? 1e-3 : 0), L = a1 - a0 > Math.PI ? 1 : 0; dona += `<path d="M${Pp(44, a0)}A44 44 0 ${L} 1 ${Pp(44, a1)}L${Pp(29, a1)}A29 29 0 ${L} 0 ${Pp(29, a0)}Z" fill="${c}" stroke="var(--bg)" stroke-width="1.5"><title>${n}: ${nf(v / tot * 100, 1)} %</title></path>`; a0 = a1; }
    dona += `<text x="48" y="47" text-anchor="middle" class="c01-dn">${nf(sCor / tot * 100)}%</text><text x="48" y="59" text-anchor="middle" class="c01-dl">Corabastos</text></svg>`;
    const parte = `<div class="c01-part">${dona}<ul>${seg.map(([v, c, n]) => `<li><i style="background:${c}"></i>${n}<b>${nf(v / tot * 100, 1)} %</b></li>`).join('')}</ul></div>`;
    // inventario de Corabastos (t) frente a la capacidad de referencia de 14.000 t (saturación = inventario ÷ 14.000)
    const sat = (q) => X(q).sat * 100, mS = Math.max(110, ...muestra.map(sat)), bar = (n, v) => `<div class="c01-b"><span>${n}</span><i><b style="width:${Math.max(2, Math.min(100, v / mS * 100)).toFixed(1)}%;background:${v > 100 ? 'var(--s-crit)' : v > 90 ? 'var(--amb)' : 'var(--s-con)'}"></b><em style="left:${(100 / mS * 100).toFixed(1)}%"></em></i><span>${nf(v)} %</span></div>`;
    const bods = `<div class="c01-bs"><small>Límite de abastecimiento de Corabastos (inventario ÷ 14.000 t; raya = 100 %)</small>${bar('Inicio', sat(W[0]))}${bar('Máximo · año ' + añoDe((wMaxSat || L).sem), maxSat * 100)}${bar('Final', sat(L))}</div>`;
    return s + '</svg>' + parte + `<div class="c01-ley"><span><i style="background:#7d6bff"></i>Corabastos</span><span><i style="background:#c08f1c"></i>Mercados</span><span><i style="background:#22a89d"></i>Hogares y huertas</span><span><i class="l"></i>Demanda</span><span><i class="l r"></i>80 % de la demanda</span></div>` + bods;
  }
  /* residuos sin recoger (t/día) de esta corrida y de la otra mitad, con hoy (148) y el game over (296); La Vaca y los sectores peor servidos */
  function fig2(w) {
    const h = 200, pl = 42, pr = 10, pt = 10, pb = 22, iw = w - pl - pr, ih = h - pt - pb, R = (q) => (Rk(q) ? Rk(q).noRec : null);
    const vals = muestra.map(R).concat(muestraB ? muestraB.map(R) : []).filter(v => v != null), mn = 0, mx = Math.max(340, Math.ceil(Math.max(0, ...vals) / 50) * 50 + 20);
    const x = (s) => pl + (s - 1) / (FIN - 1) * iw, y = (v) => pt + ih - (v - mn) / (mx - mn) * ih;
    const lin = (A) => { let d = '', n = 0; for (const q of A) { const v = R(q); if (v == null) { n = 0; continue; } d += `${n++ ? 'L' : 'M'}${x(q.sem).toFixed(1)} ${y(v).toFixed(1)}`; } return d; };
    let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Residuos sin recoger de Kennedy frente al game over">`;
    for (let v = 0; v <= mx; v += 100) s += `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${nf(v)}</text>`;
    s += ejeX(x, w, h);
    s += `<rect x="${pl}" y="${pt}" width="${iw}" height="${Math.max(0, y(296) - pt).toFixed(1)}" fill="var(--s-lim)" fill-opacity=".08"/><line x1="${pl}" x2="${w - pr}" y1="${y(296).toFixed(1)}" y2="${y(296).toFixed(1)}" stroke="var(--s-lim)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${w - pr}" y="${(y(296) - 4).toFixed(1)}" text-anchor="end" fill="var(--mal)">game over 296</text>`;
    s += `<line x1="${pl}" x2="${w - pr}" y1="${y(148).toFixed(1)}" y2="${y(148).toFixed(1)}" stroke="var(--mut)" stroke-width="1" stroke-dasharray="2 3"/><text x="${pl + 4}" y="${(y(148) - 4).toFixed(1)}">hoy 148</text>`;
    if (muestraB) s += `<path d="${lin(muestraB)}" fill="none" stroke="${prop ? '#f2694a' : '#7d6bff'}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    s += `<path d="${lin(muestra)}" fill="none" stroke="${prop ? '#7d6bff' : '#f2694a'}" stroke-width="2"/>`;
    if (go) s += `<line x1="${x(go.sem).toFixed(1)}" x2="${x(go.sem).toFixed(1)}" y1="${pt}" y2="${pt + ih}" stroke="var(--s-crit)" stroke-dasharray="2 3"/>`;
    s += '</svg>';
    const rF = Rk(L), vaca = rF ? [['Árboles de La Vaca', rF.arboles * 100], ['Interacciones bióticas en La Vaca', rF.inter * 100]] : [];
    const bVaca = vaca.length ? `<div class="c01-bs"><small>Humedal La Vaca al final (100 % = hoy; × (1 − 0,5·D), supuesto)</small>${vaca.map(([n, v]) => `<div class="c01-b"><span>${n}</span><i><b style="width:${Math.max(2, Math.min(100, v)).toFixed(1)}%;background:${v < 75 ? 'var(--s-crit)' : v < 90 ? 'var(--amb)' : 'var(--s-con)'}"></b></i><span>${nf(v)} %</span></div>`).join('')}</div>` : '';
    const barras = peores.map(p => `<div class="c01-b"><span>${esc(p.n)}</span><i><b style="width:${Math.max(2, Math.min(100, p.v)).toFixed(1)}%;background:${p.v < 80 ? 'var(--s-crit)' : p.v < 87 ? 'var(--amb)' : 'var(--s-con)'}"></b><em style="left:80%"></em></i><span>${nf(p.v, 1)} % · año ${añoDe(p.sem)}</span></div>`).join('');
    return s + `<div class="c01-ley"><span><i class="l" style="border-color:${prop ? '#7d6bff' : '#f2694a'}"></i>Sin recoger (${prop ? 'con' : 'sin'} propuesta)</span>${muestraB ? `<span><i class="l d" style="border-color:${prop ? '#f2694a' : '#7d6bff'}"></i>${prop ? 'Sin' : 'Con'} propuesta</span>` : ''}<span><i class="l r"></i>Game over</span></div>${bVaca}<div class="c01-bs"><small>Sectores peor servidos de comida (mínimo de la corrida; raya = 80 %)</small>${barras}</div>`;
  }
  function pintar(root) { if (!document.getElementById('c01-css')) { const st = document.createElement('style'); st.id = 'c01-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.querySelectorAll('[data-c01]').forEach(el => { const w = Math.max(260, Math.floor(el.clientWidth || 320)); el.innerHTML = el.dataset.c01 === '1' ? fig1(w) : fig2(w); }); }
  const frase = estado === 'go' ? null : `Sin game over${completo ? ' en los 15 años' : ''}: el sector que menos recibió tuvo ${nf(minSec, 1)} % de su demanda (límite 80 %), Corabastos llegó como máximo a ${nf(maxSat * 100)} % de su límite de 14.000 t y lo sin recoger quedó en ${nf(maxR)} t/día o menos (límite 296).`;
  return { estado, big: VERD[estado], eye: estado === 'go' ? 'Game over · condición crítica sostenida' : `Resultado · ${VERD[estado]}`, frase, veredicto: VERD[estado], html, pintar, textos: [t1, t2, t3, t4, t5], sens, mejor };
}
const CSS = `
.inf2 .c01 { margin-top: 18px; grid-column: 1 / -1; min-width: 0; }
.inf2 .c01-h { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 10px; }
.inf2 .c01-v { margin: 0; font: 300 clamp(26px, 3vw, 40px)/1 var(--num); letter-spacing: .04em; text-transform: uppercase; }
.inf2 .c01-v.go { color: #ff7a59; } .inf2 .c01-v.sostenible { color: #d5ff3f; } .inf2 .c01-v.cond { color: #ffd27a; }
.inf2 .c01-part { display: flex; align-items: center; gap: 16px; margin: 10px 0 2px; padding: 10px 12px; border-radius: 14px; background: rgba(125,107,255,.07); border: 1px solid rgba(169,156,255,.14); }
.inf2 .c01-part svg { flex: none; }
.inf2 .c01-part ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 12.5px; color: var(--ink2); flex: 1; min-width: 0; }
.inf2 .c01-part li { display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center; }
.inf2 .c01-part li i { width: 10px; height: 10px; border-radius: 50%; } .inf2 .c01-part li b { font: 300 20px/1 var(--num); color: var(--ink); }
.inf2 .c01-fig text.c01-dn { font: 200 22px var(--num); fill: var(--ink); } .inf2 .c01-fig text.c01-dl { font: 600 6.6px Geist, Inter, sans-serif; letter-spacing: .04em; text-transform: uppercase; fill: var(--mut); }
.inf2 .c01-g { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 900px) { .inf2 .c01-g { grid-template-columns: 1fr; } }
.inf2 .c01-c { padding: 16px 18px 14px; border-radius: 18px; min-width: 0; border-top: 2px solid rgba(125,107,255,.55); }
.inf2 .c01-c h4 { margin: 0; font: 300 26px/1.1 var(--num); letter-spacing: .06em; text-transform: uppercase; color: var(--ink); }
.inf2 .c01-s { font-size: 12.5px; color: var(--mut); margin: 4px 0 10px; }
.inf2 .c01-fig svg { display: block; max-width: 100%; height: auto; overflow: visible; }
.inf2 .c01-fig text { font: 11px Geist, Inter, system-ui, sans-serif; fill: var(--mut); font-variant-numeric: tabular-nums; }
.inf2 .c01-ley { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11.5px; color: var(--ink2); margin: 6px 0 4px; }
.inf2 .c01-ley span { display: inline-flex; align-items: center; gap: 6px; }
.inf2 .c01-ley i { width: 12px; height: 8px; border-radius: 2px; display: inline-block; }
.inf2 .c01-ley i.l { width: 16px; height: 0; border-top: 2px solid var(--ink); border-radius: 0; }
.inf2 .c01-ley i.l.r { border-top: 2px dashed var(--s-lim); } .inf2 .c01-ley i.l.d { border-top-style: dashed; }
.inf2 .c01-ol { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 9px; }
.inf2 .c01-ol li { display: grid; gap: 2px; padding-top: 9px; border-top: 1px solid var(--line2); }
.inf2 .c01-ol b { font: 600 11px/1.2 Geist, Inter, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--tone); }
.inf2 .c01-ol span { font-size: 13.5px; line-height: 1.5; color: var(--ink2); }
.inf2 .c01-bs { display: grid; gap: 5px; margin-top: 8px; }
.inf2 .c01-bs small { font-size: 11px; color: var(--mut); }
.inf2 .c01-b { display: grid; grid-template-columns: minmax(80px, 1fr) minmax(90px, 2fr) auto; gap: 8px; align-items: center; font-size: 12px; color: var(--ink2); }
.inf2 .c01-b i { position: relative; height: 8px; border-radius: 4px; background: var(--track); }
.inf2 .c01-b i b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
.inf2 .c01-b i em { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--s-lim); }
.inf2 .c01-b span:last-child { font-variant-numeric: tabular-nums; white-space: nowrap; }
.inf2 .c01-sens { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; font-variant-numeric: tabular-nums; }
.inf2 .c01-sens th { text-align: right; font-weight: 500; color: var(--mut); padding: 4px 6px; border-bottom: 1px solid var(--line); }
.inf2 .c01-sens th:first-child, .inf2 .c01-sens td:first-child { text-align: left; }
.inf2 .c01-sens td { text-align: right; padding: 5px 6px; border-bottom: 1px solid var(--line2); color: var(--ink2); }
.inf2 .c01-sens tr.mx td { color: var(--ink); background: var(--tone-bg); font-weight: 600; }
@media (max-width: 480px) { .inf2 .c01-c { padding: 14px 12px; } .inf2 .c01-ol span { font-size: 13px; } }
`;
