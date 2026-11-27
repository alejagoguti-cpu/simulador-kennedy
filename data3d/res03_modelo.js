/* ============ SIMULACIÓN 03 · INTERRUPCIÓN DE LA RECOLECCIÓN (modelo por horas, puro) ============
   Pedido de la autora (2026-11-27): se interrumpe la recolección de orgánicos hasta 168 h (7 días). Se corre hora por hora en la semana de la
   interrupción (simulaciones12.js, E.res). DATOS:
   · Barrios: orgánicos de Kennedy del modelo semanal (sim_vida.js: población × kg/persona; ≈ 486 t/día) repartidos por la población de cada zona
     (ZONAS de sim_red_datos.js) y llevados al nodo más cercano.
   · Corabastos: ≈ 100 t/día de residuos, 65 % orgánicos = 65 t/día (Unión Temporal Residuos Verdes, en CONtexto ganadero:
     https://www.contextoganadero.com/cronica/3-historias-del-buen-uso-del-compost-en-lugar-de-fertilizantes).
   · Nodos: Juntas de Acción Comunal (asambleas.json): María Paz y El Amparo; Estaciones Circulares en Castilla, Timiza, Mandalay, Tintal y Marsella;
     Bavaria Común (Centro de compostaje); Corabastos (centro de sus bodegas).
   · Capacidades de la propuesta (dato de la autora): 250 t/día por Estación, 1.500 t/día el Centro de Bavaria, × «capacidad de la red».
   SIN PROPUESTA: nada se recoge; todo queda en la calle y su edad = horas desde el inicio.
   CON PROPUESTA: cada nodo manda a su Estación más cercana; lo que no cabe va a Bavaria; lo que no cabe en Bavaria queda en la calle. Edad de lo
   que espera = lo que hay en la calle ÷ lo que se trata por hora (cola: primero en llegar, primero en tratarse).
   CIERRE DE CORABASTOS: sus 65 t/día ya no se quedan en sus bodegas: van a la calle de María Paz (sin propuesta) o directo a Bavaria (con propuesta).
   GAME OVER (pedido de la autora): (1) Corabastos + María Paz acumulan más de 4.500 t; (2) algún nodo tiene orgánicos sin tratar más de 48 h.
   Compost: 40 % de la masa tratada [SUP: rango usual del compostaje, se pierde agua y carbono]. */
export const RES03 = { CORA_T_DIA: 65, EST_T_DIA: 250, BAV_T_DIA: 1500, TOPE_T: 4500, EDAD_MAX: 48, EDAD_PROP: 12, COMPOST: 0.4,
  /* CRECE: aumento anual de los orgánicos que entran a la red en la simulación 03 («aumenta la generación de residuos orgánicos»); calibrado (2026-11-27) para que
     con propuesta las Estaciones lleguen a 22 % de saturación en el año 15, la cifra del guion de la autora [SUP]. Saturación = (orgánicos + Corabastos) ÷ capacidad de la red. */
  CRECE: 0.0079 };
export const NODOS03 = [ // mundo (x, z): puntos de asambleas.json; tipo: 'barrio' | 'estacion' | 'cora' | 'bavaria'
  { k: 'cora', n: 'Corabastos', t: 'cora' }, { k: 'mpaz', n: 'María Paz y El Amparo', t: 'barrio', p: [[1148.3, 266], [527.8, 1188.4]] },
  { k: 'castilla', n: 'Castilla', t: 'estacion', p: [[3063.8, 275.2]] }, { k: 'timiza', n: 'Timiza', t: 'estacion', p: [[743.3, 3054.3]] },
  { k: 'mandalay', n: 'Mandalay', t: 'estacion', p: [[2936.6, 1098.1]] }, { k: 'tintal', n: 'Tintal', t: 'estacion', p: [[-237.1, 1033.6]] },
  { k: 'marsella', n: 'Marsella', t: 'estacion', p: [[4620.7, 742.9]] }, { k: 'bavaria', n: 'Bavaria Común · Centro de compostaje', t: 'bavaria' }];
export const REGLAS_RES03 = [
  { k: 'acum03', n: 'Residuos acumulados en Corabastos y María Paz', txt: 'Corabastos y María Paz acumulan más de 4.500 t de orgánicos sin recoger', umbral: 4500, unidad: 't', semanas: 1,
    fuente: 'Tope de almacenamiento temporal: dato de la autora (2026-11-27). Generación: modelo de Kennedy por población (sim_vida.js) y Corabastos 65 t/día (CONtexto ganadero).' },
  { k: 'edad03', n: 'Orgánicos sin tratar', txt: 'algún sector tiene orgánicos expuestos más de 48 horas sin tratar', umbral: 48, unidad: 'horas', semanas: 1,
    fuente: 'Pedido de la autora (2026-11-27): 48 h de putrefacción sin gestión.' }];

/* asigna cada zona (x, z, población) a su nodo de barrio más cercano; devuelve fracción de los orgánicos de barrio por nodo */
export function repartoZonas(ZONAS) { const B = NODOS03.filter(n => n.p), w = new Map(B.map(n => [n.k, 0])); let tot = 0;
  for (const [x, z, p] of ZONAS) { let b = null, bd = Infinity; for (const n of B) for (const q of n.p) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; b = n.k; } } w.set(b, w.get(b) + p); tot += p; }
  const f = {}; for (const [k, v] of w) f[k] = tot ? v / tot : 0; return f; }

/* simulación por horas: orgDia (t/día de Kennedy), frac (repartoZonas), horas (duración), prop, cap (0–1), cierreCora (bool) */
export function interrupcion({ orgDia, frac, horas = 168, prop = false, cap = 1, cierreCora = false }) {
  const H = Math.max(0, Math.min(168, Math.round(horas))), N = NODOS03, gen = {}, est = N.filter(n => n.t === 'estacion');
  for (const n of N) gen[n.k] = 0; for (const k in frac) gen[k] += orgDia * frac[k] / 24; // t/h
  if (cierreCora) { if (prop) gen.bavaria = (gen.bavaria || 0) + RES03.CORA_T_DIA / 24; else gen.mpaz += RES03.CORA_T_DIA / 24; } else gen.cora += RES03.CORA_T_DIA / 24;
  const Ke = prop ? RES03.EST_T_DIA / 24 * cap : 0, Kb = prop ? RES03.BAV_T_DIA / 24 * cap : 0;
  // estación más cercana de cada nodo que genera (María Paz y Corabastos: la más cercana a su punto)
  const P = (n) => n.p ? n.p[0] : n.k === 'cora' ? [1054.7, 995.9] : [3977.7, 219.3]; // Corabastos (lw(6396, 2166)) y Bavaria (lw(9319, 2942.6)) en el mundo
  const destino = {}; for (const n of N) if (n.t !== 'bavaria') { if (n.t === 'estacion') { destino[n.k] = n.k; continue; } let b = null, bd = Infinity; for (const s of est) { const d = Math.hypot(P(s)[0] - P(n)[0], P(s)[1] - P(n)[1]); if (d < bd) { bd = d; b = s.k; } } destino[n.k] = b; }
  const calle = {}, tratado = {}, edad = {}; for (const n of N) { calle[n.k] = 0; tratado[n.k] = 0; edad[n.k] = 0; }
  let trat = 0, tratBav = 0, hGo = null, reglaGo = null; const curva = [];
  for (let h = 1; h <= H; h++) {
    // llega a la calle lo generado; las estaciones toman de sus nodos hasta su capacidad; el resto (y lo de Bavaria) a Bavaria
    for (const n of N) calle[n.k] += gen[n.k];
    const usoE = {}; for (const s of est) usoE[s.k] = 0; let aBav = calle.bavaria; calle.bavaria = 0; const proc = {};
    for (const n of N) { if (n.t === 'bavaria' || !calle[n.k]) { proc[n.k] = 0; continue; } const s = destino[n.k], libre = Math.max(0, Ke - usoE[s]), t = Math.min(calle[n.k], libre); usoE[s] += t; calle[n.k] -= t; proc[n.k] = t; trat += t; }
    let libreB = Math.max(0, Kb - aBav); trat += Math.min(aBav, Kb); tratBav += Math.min(aBav, Kb); calle.bavaria = Math.max(0, aBav - Kb);
    for (const n of N) { if (n.t === 'bavaria' || !calle[n.k] || libreB <= 0) continue; const t = Math.min(calle[n.k], libreB); calle[n.k] -= t; libreB -= t; proc[n.k] += t; trat += t; tratBav += t; }
    // edad de lo que espera (cola): sin tratamiento = horas desde el inicio; con tratamiento = lo que espera ÷ lo que se trata por hora
    for (const n of N) { tratado[n.k] += proc[n.k] || 0; edad[n.k] = calle[n.k] < 0.05 ? 0 : (proc[n.k] > 0.01 ? Math.min(h, calle[n.k] / proc[n.k]) : Math.min(h, edad[n.k] + 1)); }
    const acum = calle.cora + calle.mpaz, eMax = Math.max(...N.map(n => edad[n.k])), tot = N.reduce((a, n) => a + calle[n.k], 0);
    curva.push([Math.round(tot), Math.round(eMax * 10) / 10]);
    if (hGo == null && acum > RES03.TOPE_T) { hGo = h; reglaGo = 'acum03'; }
    if (hGo == null && eMax > RES03.EDAD_MAX) { hGo = h; reglaGo = 'edad03'; }
  }
  const nodos = N.map(n => ({ k: n.k, n: n.n, t: n.t, calle: Math.round(calle[n.k] * 10) / 10, edad: Math.round(edad[n.k] * 10) / 10, tratado: Math.round(tratado[n.k] * 10) / 10, gen: Math.round(gen[n.k] * 24 * 10) / 10 }));
  const totCalle = nodos.reduce((a, n) => a + n.calle, 0), eMax = Math.max(...nodos.map(n => n.edad)), genTot = N.reduce((a, n) => a + gen[n.k], 0) * H;
  const compostDia = H ? trat * RES03.COMPOST / (H / 24) : 0;
  /* índice de resiliencia sanitaria [SUP, definición declarada]: 100 × (1 − mayor fracción usada de los dos límites) */
  const resil = Math.max(0, Math.round(100 * (1 - Math.min(1, Math.max((calle.cora + calle.mpaz) / RES03.TOPE_T, eMax / RES03.EDAD_MAX)))));
  return { horas: H, prop, cap, cierreCora, nodos, totCalle, acum: calle.cora + calle.mpaz, eMax, trat, tratBav, genTot, valoriza: genTot ? trat / genTot : 0, compostDia, resil, hGo, reglaGo, curva };
}
