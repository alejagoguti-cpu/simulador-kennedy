/* ============ SIMULACIÓN 02 · RED VIAL CON CIERRE (modelo puro, sin DOM ni 3D) ============
   Lo llama data3d/simulaciones12.js cada semana del par 2 (E.mov) y lo leen la capa 3D (mov02_capa.js) y el panel (sim_panel.js).
   DATOS DE LA AUTORA (pedido del 2026-11-27, «SUMO / Waze»): capacidad, velocidad, jam factor y ruido de cada vía (VIAS02).
   MÉTODO:
   · flujo base V0 = capacidad × jam factor / 10 [SUP: el jam factor 0–10 se lee como ocupación v/c; no hay aforo de cada vía].
     Vías locales de Castilla, Marsella, Mandalay y María Paz: 4 × 1.100 veh/h; ocupación base 0,5 [SUP: el pedido no la trae].
   · cierre c (0–1 = % de cierre × avance de la obra): la vía cerrada queda con capacidad C·(1−c) y flujo V0·(1−c)·dem; el resto (D) se
     reparte entre sus vías alternas en proporción a su capacidad libre (mín. 10 % de su capacidad) [SUP: asignación por capacidad].
     Alternas de la Av. de las Américas: Av. Boyacá, Av. Primero de Mayo y las calles locales (pedido de la autora); de las otras dos: todas.
   · tiempo de viaje por vía: función BPR, t = t_libre·(1 + 0,15·(v/c)^4) (Bureau of Public Roads 1964, Traffic Assignment Manual);
     la velocidad libre sale de la velocidad base de la autora en la ocupación base. Los desviados además recorren más: factor de rodeo =
     costo con la vía cerrada ÷ costo normal de las rutas a Corabastos (CIERRES de data3d/sim_red_datos.js, ponderado por población;
     la Calle 38 Sur no está en esa tabla: rodeo 1, solo congestión).
   · tiempo de viaje relativo = minutos·vehículo de la red ÷ los de la red sin cierre (mismo número de viajes).
   · saturación de la red = Σ flujo ÷ Σ capacidad abierta.
   · ruido de cada vía: L = L_autora + 10·log10(V/V0) (el ruido del tráfico sube 3 dB al doblar el flujo; Cnossos-EU / RLS-90), sin
     bajar más de 15 dB en la vía cerrada. Ruido en las zonas residenciales = promedio energético de las 5 vías [SUP: pesos iguales].
   · abastecimiento de cada zona = lo local + mercados/Bavaria + lo que llega de Corabastos × g, con g = mín(1, 1/(r·k)): los camiones
     hacen 1/r de sus viajes por turno si el tiempo por km sube r veces [SUP: flota sin holgura]. k = 1 − 0,45 × permeabilidad con la
     propuesta (dato de la autora: la demanda de viajes largos a Corabastos cae 45 % con los mercados y huertas del tejido permeable).
     Las partes de cada zona vienen de data3d/sim_vida.js (zLoc, zRed, zRec), que ya alarga las rutas por el rodeo.
   GAME OVER (pedido de la autora): más de 2 arterias por encima de 140 % de su capacidad; tiempo de viaje > 2,0 veces el normal;
   una zona con menos de 80 % de su abastecimiento 4 semanas seguidas. */
export const VIAS02 = {
  americas: { n: 'Av. de las Américas', C: 5200, v: 24, jf: 8.2, db: 80, tl: 49000, art: true },
  boyaca:   { n: 'Av. Boyacá',          C: 4800, v: 20, jf: 8.8, db: 82, tl: 58000, art: true },
  mayo:     { n: 'Av. Primero de Mayo', C: 3600, v: 18, jf: 7.9, db: 78, art: true },
  calle38:  { n: 'Calle 38 Sur',        C: 3100, v: 19, jf: 8.0, db: 77, art: true },
  locales:  { n: 'Calles locales (Castilla, Marsella, Mandalay, María Paz)', C: 4 * 1100, v: 30, x0: 0.5, db: 57.5, art: false }
};
export const ALTERNAS = { americas: ['boyaca', 'mayo', 'locales'], boyaca: ['americas', 'mayo', 'calle38', 'locales'], calle38: ['americas', 'boyaca', 'mayo', 'locales'] };
export const OPCIONES_VIA = [[1, 'Av. de las Américas'], [2, 'Av. Boyacá'], [3, 'Calle 38 Sur']];
export const VIA_DE = { 1: 'americas', 2: 'boyaca', 3: 'calle38' };
export const MOV02 = { BPR_A: 0.15, BPR_B: 4, SAT_ART: 1.4, N_ART: 2, TT_MAX: 2.0, ABASTO_MIN: 0.8, SEMANAS: 4, BAJA_PROP: 0.45, LIBRE_MIN: 0.1, CAIDA_MAX: 15, BOSQUE_DB: 46 };
const bpr = (x) => 1 + MOV02.BPR_A * Math.pow(Math.max(0, x), MOV02.BPR_B);

/* rodeo medio de las rutas a Corabastos (fuente 0) al cerrar cada vía: Σ pob·(1/f) / Σ pob sobre las zonas que la usan */
export function rodeos(CIERRES, ZONAS) {
  const R = {};
  for (const c of CIERRES || []) { let w = 0, s = 0; for (const [z, fu, f] of c.f) { if (fu !== 0 || !(f > 0) || f >= 1) continue; const p = ZONAS[z] ? ZONAS[z][2] : 0; w += p; s += p / f; } R[c.id] = w ? s / w : 1; }
  return R;
}

/* una semana: via ('americas'|'boyaca'|'calle38'), c (0–1), dem (tráfico frente a hoy), prop, perm (0–1), rodeo (factor), Z (partes de sim_vida.js) */
export function red02({ via, c = 0, dem = 1, prop = false, perm = 0, rodeo = 1, Z = null }) {
  const ids = Object.keys(VIAS02), alt = ALTERNAS[via] || [], out = {};
  for (const k of ids) { const R = VIAS02[k], x0 = R.x0 != null ? R.x0 : R.jf / 10, V0 = R.C * x0; out[k] = { k, n: R.n, art: R.art, C: R.C, V0, x0, Vh: V0 * dem, vLibre: R.v * bpr(x0), cerrada: 0 }; }
  const cv = out[via]; let D = 0;
  if (cv) { cv.cerrada = c; D = cv.Vh * c; cv.Cab = cv.C * (1 - c); cv.V = cv.Vh * (1 - c); }
  for (const k of ids) { const o = out[k]; if (k !== via) { o.Cab = o.C; o.V = o.Vh; } }
  // reparto del flujo desviado por capacidad libre
  let wT = 0; const w = {}; for (const k of alt) { const o = out[k]; w[k] = Math.max(o.Cab - o.V, MOV02.LIBRE_MIN * o.Cab); wT += w[k]; }
  for (const k of alt) { const o = out[k]; o.extra = wT ? D * w[k] / wT : 0; o.V += o.extra; }
  // tiempo, velocidad, ruido
  let T0 = 0, T1 = 0, Vt = 0, Ct = 0, tAlt = 0, wAlt = 0, kmT0 = 0, kmT1 = 0, eRes = 0;
  for (const k of ids) { const o = out[k], R = VIAS02[k];
    o.x = o.Cab > 0.5 ? o.V / o.Cab : (o.V > 0.5 ? 9 : 0); o.v = o.vLibre / bpr(o.x); o.vBase = R.v;
    const tau0 = 1 / R.v * (bpr(o.x0 * dem) / bpr(o.x0)), tau1 = 1 / o.v; // horas por km (base = mismo tráfico sin cierre)
    T0 += o.Vh * tau0; T1 += o.V * tau1; Vt += o.V; Ct += o.Cab;
    if (o.extra) { tAlt += o.extra * tau1; wAlt += o.extra; }
    kmT0 += o.Vh * tau0; kmT1 += o.V * tau1;
    o.db = R.db + Math.max(-MOV02.CAIDA_MAX, 10 * Math.log10(Math.max(1e-6, o.V) / o.V0)); o.dDb = o.db - R.db;
    eRes += Math.pow(10, o.db / 10);
    o.sat = o.x; o.tl = R.tl != null ? R.tl * (bpr(o.x) / bpr(o.x0)) : null; /* time loss de la autora escalado por BPR (s/día) */ }
  if (wAlt) T1 += (tAlt / wAlt) * D * (rodeo - 1); // km de más de los desviados, a la velocidad media de sus alternas
  const tt = T0 > 0 ? T1 / T0 : 1, rKm = kmT0 > 0 ? (kmT1 / Math.max(1e-6, Vt)) / (kmT0 / Math.max(1e-6, ids.reduce((a, k) => a + out[k].Vh, 0))) : 1;
  const sat = Ct > 0 ? Vt / Ct : 0, dbRes = 10 * Math.log10(eRes / ids.length);
  const arts = ids.filter(k => out[k].art && k !== via), sobre = arts.filter(k => out[k].x > MOV02.SAT_ART).length;
  // abastecimiento
  const kProp = prop ? 1 - MOV02.BAJA_PROP * perm : 1, g = Math.min(1, 1 / (Math.max(1, rKm) * kProp));
  let ab = null;
  if (Z && Z.zRec) { const n = Z.zRec.length; let min = 1, iMin = -1, sum = 0, nn = 0; const zona = new Float32Array(n);
    for (let i = 0; i < n; i++) { const loc = Z.zLoc ? Z.zLoc[i] : 0, red = Z.zRed ? Z.zRed[i] : 0, co = Math.max(0, Z.zRec[i] - loc - red), v = Math.min(1, loc + red + co * g); zona[i] = v;
      if (Z.need && !(Z.need[i] > 0)) continue; sum += v; nn++; if (v < min) { min = v; iMin = i; } }
    ab = { min, iMin, media: nn ? sum / nn : 1, zona, g };
  } else ab = { min: g, iMin: -1, media: g, zona: null, g };
  return { via, c, dem, prop, perm, rodeo, vias: out, D, tt, rKm, sat, dbRes, sobre, nArt: arts.length, kProp, ab, bosqueDb: prop ? MOV02.BOSQUE_DB : null };
}

/* reglas de game over de la 02 (además de las 7 de REGLAS): el panel y el informe las leen */
export const REGLAS_MOV02 = [
  { k: 'arterias', n: 'Arterias saturadas', txt: 'más de 2 arterias pasan el 140 % de su capacidad a la vez', umbral: 140, unidad: '% de capacidad', semanas: 1,
    fuente: 'Pedido de la autora (2026-11-27). Capacidad de cada arteria: datos SUMO/Waze de la autora. Flujo: el de la vía cerrada se reparte por capacidad libre [SUP].' },
  { k: 'tiempo', n: 'Tiempo de viaje', txt: 'el tiempo medio de viaje pasa el doble del normal', umbral: 2, unidad: 'veces el normal', semanas: 1,
    fuente: 'Pedido de la autora (2026-11-27). Tiempo por vía con la función BPR (Bureau of Public Roads 1964) y el rodeo de las rutas por la red vial (sim_red_datos.js).' },
  { k: 'abastoMov', n: 'Abastecimiento de un sector', txt: 'una zona recibe menos del 80 % de su abastecimiento cuatro semanas seguidas', umbral: 80, unidad: '% de lo que necesita', semanas: 4,
    fuente: 'Pedido de la autora (2026-11-27). Lo que llega de Corabastos se reduce con el tiempo de viaje de los camiones (1/r viajes por turno [SUP]); zonas y partes de sim_vida.js.' }
];
