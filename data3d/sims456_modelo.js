/* ============ SIMULACIONES 04, 05 y 06 · modelos puros (pedidos de la autora, 2026-11-27) ============
   Los llama simulaciones12.js cada semana (x.s04, x.s05, x.s06) y sim_ui.js al deslizar (vista instantánea). Sin DOM ni 3D.

   04 BIODIVERSIDAD Y ATROPELLAMIENTOS
   · Oleada migratoria desde la semana t0 durante 8 semanas (pico enero–febrero, Secretaría de Ambiente). Las aves vuelan entre La Vaca, El Burro,
     Techo y el bosque de Bavaria (parches reales de sim_red_datos.js) y cruzan las arterias.
   · Probabilidad de choque al cruzar a ras = f_bajo × (1 − e^(−Q·t)): llegada de vehículos de Poisson (huecos del tráfico) con Q = flujo de la
     arteria (Av. de las Américas, 4.264 veh/h × tráfico del modelo: datos SUMO/Waze de la autora) y t = ancho de calzada 40 m ÷ 10 m/s de vuelo
     = 4 s [SUP]; f_bajo = 25 % de las aves cruzan a ras [SUP: no hay dato público de Bogotá; la Secretaría solo reporta rescates].
     Con propuesta: el paso elevado y los corredores sacan del tráfico la fracción «implementación» de los cruces; las barreras acústicas y jardines
     bajan 30 % los cruces rasantes [SUP].
   · Población de la especie que cruza: cada semana cruza 30 % × (1 + flujo extra) [SUP] y muere la fracción p de los que cruzan; se recupera 2 %
     por semana [SUP]. GAME OVER (autora): más de 20 % de los cruces terminan en choque, o la especie pierde más de 30 % cuatro semanas seguidas.
   · Shannon H' y conectividad: del modelo de fauna del simulador (ocupación real por especie y parches conectados), no inventados.

   05 POBLACIÓN Y ESPECULACIÓN (predio Bavaria)
   · Plan parcial (Alcaldía 2023): 14.000 viviendas por etapas anuales y 1.622 de los 3.250 árboles del predio que caen en manzanas, vías y
     alamedas (PLAN_BAV); presión = % del plan que se ejecuta. Con blindaje del bosque solo caen los árboles sueltos (46 % de los del predio,
     bavaria_arboles.json). Con propuesta: 0 árboles (invariante) y la densidad va a los bordes.
   · Suelo ecológico remanente = árboles que quedan ÷ 3.250. Suelo para huertas: lo libre del predio (27,85 ha, bavaria_pres.json) menos lo que
     ocupa el plan (25 ha de torres, El Espectador) en proporción a lo construido; con propuesta, los 27,85 ha protegidos.
   · Patrimonio reutilizado = 121.436 m² de naves (bavaria_pres.json) × tasa de reutilización.
   · Isla de calor = +2 °C × fracción impermeabilizada del predio [SUP: orden de magnitud de islas de calor de barrio].
   · GAME OVER (autora): pérdida > 20 % del bosque y rondas; suelo productivo < 80 % de 15 ha (< 12 ha).

   06 GOBERNANZA POLICÉNTRICA
   · El reparto lo hace el modelo semanal (gobernanzaPaso: 8 sectores reales con su Junta de Acción Comunal, IDPAC). Aquí: urgencia = sector con
     menos de 50 % de su necesidad cubierta [SUP]; semanas seguidas así; índice de sostenibilidad = índice ecológico del modelo.
   · GAME OVER (autora): un sector sin atender más de 4 semanas seguidas; índice de sostenibilidad < 40 %. */

export const S04 = { F_BAJO: 0.25, T_CRUCE: 4, Q_BASE: 4264, CRUZA: 0.30, RECUP: 0.02, BARRERA: 0.3, TASA_MAX: 0.2, PERDIDA_MAX: 0.3, OLEADA: 8 };
export function aves04({ flujo = 0.6, impl = 0, barreras = false, prop = false, trafico = 1 }) {
  const Q = S04.Q_BASE * trafico / 3600, pCruce = 1 - Math.exp(-Q * S04.T_CRUCE);
  const fuera = prop ? impl : 0, bajo = S04.F_BAJO * (prop && barreras ? 1 - S04.BARRERA : 1);
  const p = bajo * pCruce * (1 - fuera); // de cada cruce
  const cruza = Math.min(1, S04.CRUZA * (1 + flujo)), muerteSem = cruza * p;
  return { pCruce, p, cruza, muerteSem, fuera, bajo, Q: Q * 3600 };
}
export const S05 = { VIV_TOT: 14000, ARB_TOT: 3250, SUELTOS: 1492 / 3250, LIBRE_HA: 27.85, TORRES_HA: 25, NAVES_M2: 121436, SUELO_MIN: 15, CALOR: 2, BOSQUE_MAX: 0.2, SUELO_FR: 0.8 };
export function suelo05({ años = 0, presion = 1, reuso = 0, blindaje = false, prop = false, VIV_ETAPA, ARB_ETAPA }) {
  const k = Math.max(0, Math.min(10, años)), ent = Math.floor(k), fr = k - ent; let viv = 0, arb = 0;
  for (let i = 0; i < ent; i++) { viv += VIV_ETAPA[i]; arb += ARB_ETAPA[i]; } if (ent < 10) { viv += VIV_ETAPA[ent] * fr; arb += ARB_ETAPA[ent] * fr; }
  viv *= presion; arb *= presion; if (prop) arb = 0; else if (blindaje) arb *= S05.SUELTOS;
  const avance = viv / S05.VIV_TOT, ecoRest = 1 - arb / S05.ARB_TOT;
  const sueloProd = prop ? S05.LIBRE_HA : Math.max(0, S05.LIBRE_HA - S05.TORRES_HA * avance);
  const imperm = prop ? 0.1 + 0.1 * presion * avance : Math.min(1, 0.15 + 0.6 * avance); /* crece con lo construido */
  return { viv: Math.round(viv), avance, arbPerdidos: Math.round(arb), ecoRest, sueloProd, sueloFr: sueloProd / S05.SUELO_MIN, naves: Math.round(S05.NAVES_M2 * (prop ? reuso * Math.min(1, k / 5) : 0)) /* las naves se reactivan en 5 años */, calor: S05.CALOR * imperm, imperm };
}
export const S06 = { COB_MIN: 0.5, SEM_MAX: 4, SOST_MIN: 0.4 };

export const REGLAS_456 = {
  4: [{ k: 'tasa04', n: 'Cruces que terminan en choque', txt: 'más del 20 % de los cruces de fauna terminan en choque', umbral: 20, unidad: '% de los cruces', semanas: 1, fuente: 'Pedido de la autora. Probabilidad por llegadas de Poisson (huecos del tráfico) con los flujos SUMO/Waze de la autora; 25 % de cruces a ras [SUP].' },
      { k: 'pob04', n: 'Población de aves que cruza', txt: 'la especie pierde más del 30 % de su población cuatro semanas seguidas', umbral: 70, unidad: '% de la población', semanas: 4, fuente: 'Pedido de la autora. 30 % cruza por semana × (1 + flujo extra) [SUP]; recuperación 2 %/semana [SUP].' }],
  5: [{ k: 'bosque05', n: 'Bosque y rondas que quedan', txt: 'se pierde más del 20 % del bosque y las rondas verdes del predio', umbral: 80, unidad: '% de los árboles', semanas: 1, fuente: 'Plan parcial Bavaria (Alcaldía 2023): árboles que caen por etapa (PLAN_BAV); bavaria_arboles.json (Esri World Imagery).' },
      { k: 'suelo05', n: 'Suelo productivo', txt: 'el suelo para huertas y centros circulares baja de 12 ha (80 % de 15 ha)', umbral: 12, unidad: 'ha', semanas: 1, fuente: 'Pedido de la autora (15 ha mínimas). Suelo libre del predio 27,85 ha (bavaria_pres.json); torres del plan 25 ha (El Espectador).' }],
  6: [{ k: 'urg06', n: 'Urgencia desatendida', txt: 'un sector con necesidad crítica (menos del 50 % cubierto) pasa más de 4 semanas sin recibir recursos', umbral: 4, unidad: 'semanas', semanas: 1, fuente: 'Pedido de la autora (4 semanas). Necesidad y reparto: modelo de gobernanza (8 sectores con su Junta, IDPAC); 50 % [SUP].' },
      { k: 'sost06', n: 'Índice de sostenibilidad', txt: 'el índice de sostenibilidad territorial baja de 40 %', umbral: 40, unidad: '%', semanas: 1, fuente: 'Pedido de la autora (40 %). Índice ecológico del modelo (evaluacion_ecologica.js).' }]
};
