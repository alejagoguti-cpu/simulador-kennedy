/* ============ ESCENARIO A · EL TRÁFICO CRECE CON LOS AÑOS ============
   Lo usa data3d/escenarios_sim.js. En A (Kennedy hoy, sin la propuesta) los vehículos de la grabación SUMO que dibuja index.html se
   complementan con RÉPLICAS DESFASADAS de la misma grabación (mismas rutas reales, otro segundo del bucle: copias 4, 5 y 6, desfase de
   487 s como las copias de index.html), en la proporción que da la proyección del parque (data3d/sim_vida.js · TRAFICO, crecimiento):
   carros +1,5 %/año, motos 0 %/año, camiones 0 %/año. Año a año desde la semana del modelo (RELOJ.semana): año 1 = hoy.
   Determinista: qué réplica sale depende solo de su id (hash) y de la hora del reloj (demanda); sin azar ni relojes propios.
   Se respeta lo de index.html: demanda por hora (TRAF.demanda), ningún vehículo encima de otro (TRAF.ocup, 3,3 m) y el cupo de las mallas.
   B y C no se tocan (su tráfico lo calcula el modelo de viajes, data3d/viajes_mercados.js). */
import { RELOJ } from './reloj.js?v=5';
import { crecimiento, TRAFICO } from './sim_vida.js?v=6';

export function instalarCrecimiento({ T3, esA }) {
  const EXTRA = new Map(); // id de la réplica -> objeto del vehículo (variante y color fijos)
  const head = new Map();
  const st = T3.creceTrafico = { n: 0, car: 0, moto: 0, G: crecimiento(0), activo: false }; // lo leen el panel y las pruebas
  const h1 = (x) => (Math.imul(x ^ 0x5bd1e995, 0x85ebca6b) >>> 0) / 4294967296; // mismo sorteo de demanda que index.html
  const hTipo = (x) => ((x * 2654435761) >>> 0) / 4294967296;                    // mismo reparto de tipo que index.html (70 % carros, 22 % motos, 8 % camiones)
  const hAcepta = (x) => (Math.imul(x ^ 0x27d4eb2d, 0x165667b1) >>> 0) / 4294967296;
  function añadir() {
    st.n = 0; st.car = 0; st.moto = 0; st.activo = false;
    const TR = T3.TRAF, VS = T3.vehSUMO; if (!TR || !VS || !TR.steps) return;
    if (T3.escenario === 'proyecto' || !esA()) return;
    const G = st.G = crecimiento(RELOJ.semana); const gC = G.car - 1, gM = G.moto - 1; if (gC <= 1e-6 && gM <= 1e-6) return;
    st.activo = true;
    const NCOP = TR.copias || 1, K = Math.min(3, Math.max(1, Math.ceil(Math.max(gC, gM) * NCOP))), pC = gC * NCOP / K, pM = gM * NCOP / K;
    const pDem = TR.demanda != null ? TR.demanda : 1, k0 = Math.floor(TR.t) % TR.NS, f = TR.t - Math.floor(TR.t), LC = T3.LC, OC = TR.ocup;
    const yBase = (T3.viaY != null ? T3.viaY : 0.62) + 0.02;
    for (let c = 0; c < K; c++) { const cl = 3 + c, ka = (k0 + cl * 487) % TR.NS, A = TR.steps[ka]; if (!A) { if (TR.pedirTrozo) TR.pedirTrozo(Math.floor(ka / TR.chunk)); continue; }
      const B = TR.steps[(ka + 1) % TR.NS] || A, m = B._idx || (B._idx = (() => { const mm = new Map(); for (let i = 0; i < B.ids.length; i++) mm.set(B.ids[i], i); return mm; })());
      for (let i = 0; i < A.ids.length; i++) {
        const idc = A.ids[i] + cl * (TR.NV + 1);
        if (pDem < 0.999 && h1(idc) > pDem) continue;
        const r = hTipo(idc), tipo = r >= 0.92 ? 'camion' : r < 0.70 ? 'carro' : 'moto'; if (tipo === 'camion') continue;
        if (hAcepta(idc) >= (tipo === 'carro' ? pC : pM)) continue;
        const x0 = A.xs[i] - LC.x, z0 = LC.y - A.ys[i], j = m.get(A.ids[i]);
        const x1 = j !== undefined ? B.xs[j] - LC.x : x0, z1 = j !== undefined ? LC.y - B.ys[j] : z0, dx = x1 - x0, dz = z1 - z0, px = x0 + dx * f, pz = z0 + dz * f;
        if (OC) { const cx = Math.floor(px / 8), cz = Math.floor(pz / 8); let choca = false;
          for (let a = -1; a <= 1 && !choca; a++) for (let b = -1; b <= 1 && !choca; b++) { const L = OC.get((cx + a) * 100003 + cz + b); if (L) for (let q = 0; q < L.length; q += 2) { const ex = L[q] - px, ez = L[q + 1] - pz; if (ex * ex + ez * ez < 11) { choca = true; break; } } }
          if (choca) continue; const kk = cx * 100003 + cz; let L = OC.get(kk); if (!L) OC.set(kk, L = []); L.push(px, pz); }
        let hd = head.get(idc); const obj = dx * dx + dz * dz > 0.04 ? Math.atan2(dx, dz) : hd; if (obj != null) hd = hd == null ? obj : hd + Math.atan2(Math.sin(obj - hd), Math.cos(obj - hd)) * 0.25; else if (hd == null) hd = 0; head.set(idc, hd);
        let o = EXTRA.get(idc); if (!o) EXTRA.set(idc, o = {});
        VS.poner(o, tipo, px, yBase + (T3.alzaVia ? T3.alzaVia(px, pz) : 0), pz, hd);
        st.n++; if (tipo === 'carro') st.car++; else st.moto++;
      } }
  }
  // se engancha al cierre del cuadro de los vehículos SUMO (index.html llama VS.fin() al final de updateTraffic): las réplicas entran antes de subir a la GPU
  RELOJ.alDibujar(() => { const VS = T3.vehSUMO; if (!VS || VS._crece) return; VS._crece = true; const fin0 = VS.fin.bind(VS); VS.fin = () => { try { añadir(); } catch (e) { console.warn('tráfico que crece:', e); } fin0(); }; });
  return { st, TRAFICO, crecimiento };
}

/* prende el flujo de carros con los controles que ya existen (panel izquierdo de data3d/giro_sim.js): «Flujo de carros → Ver» y «Flujo de agentes → Vehículos» */
export function prenderFlujo() {
  const ver = document.querySelector('#gs-fc button[data-v="1"]'); if (ver && !ver.classList.contains('on')) ver.click();
  const veh = document.querySelector('#gs-flujo button[data-f="v"]'); if (veh && !veh.classList.contains('on')) veh.click();
  const ag = document.getElementById('gs-ag'); if (ag && !ag.classList.contains('on')) ag.click();
}

/* texto del panel: año, crecimiento frente a hoy y la fuente */
export const fmtPct = (x) => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + ' %';
export function textoCrece(t) { const G = crecimiento(t);
  return { G, linea: `Año ${G.años + 1}: <b>${fmtPct(G.car - 1)} carros</b>, <b>${fmtPct(G.moto - 1)} motos</b> frente a hoy`, fuente: 'SDH 2025 (parque de Bogotá +1,24 %/año 2020–24) · OAB-RDA (motos estables 2019–24)' }; }
