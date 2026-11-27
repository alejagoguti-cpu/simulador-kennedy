/* ============ FLUJOS CON LA PROPUESTA (simulaciones 02–06 con propuesta; pedido de la autora 2026-11-27) ============
   «Con propuesta no todos van a Corabastos: las vías y las rutas tienen que cambiar».
   · MENOS VIAJES A CORABASTOS: T3.alivioProp(x, z, id) → true = ese vehículo de la grabación SUMO ya no va (index.html, updateTraffic, lo salta).
     Fracción que deja de ir = 45 % (dato de la autora: la demanda de viajes largos a Corabastos cae 45 % con los mercados y huertas de la propuesta)
     × peso por distancia a Corabastos: 1 hasta 600 m y 0 a 2,6 km (el mismo radio de data3d/alivio_cali.js y capas_escenario.js). Como la capa de
     vías (vias_densidad.js) cuenta los vehículos que se ven, las vías alrededor de Corabastos bajan de color solas.
   · RUTAS NUEVAS: carros morados (como la 01, abasto_capas.js) que van por las calles a los mercados de barrio (MERCADOS de sim_red_datos.js);
     cuántos = 11.465 veh/día a Corabastos × 10 % en hora pico × 45 % ÷ 20 [escala visual declarada], máx. 30. La 02 ya los dibuja (mov02_capa.js).
   · Chip en Corabastos con el cambio. */
import { MERCADOS } from './sim_red_datos.js?v=2';
import { crearChips } from './chips.js?v=2';
const CORA = [1054.7, 995.9], R0 = 600, R1 = 2600, BAJA = 0.45;
export function crearFlujosPropuesta({ T3, RELOJ }) {
  if (window.KEN_FLUJOS) return window.KEN_FLUJOS;
  let on = false, morados = false; const MOR = { R: null, arbol: null, arb: new Map(), rutas: new Map(), VEH: null, objs: [], pos: null };
  const h = (id) => (Math.imul(id ^ 0x27d4eb2d, 0x165667b1) >>> 0) / 4294967296;
  let fAb = 0; /* fracción de mercados de barrio abiertos (MERCADOS[k].desde, semana): todo crece con el tiempo */
  T3.alivioProp = (x, z, id) => { if (!on || fAb <= 0) return false; const d = Math.hypot(x - CORA[0], z - CORA[1]); if (d > R1) return false; const w = d <= R0 ? 1 : 1 - (d - R0) / (R1 - R0); return h(id) < BAJA * w * fAb; };
  Promise.all([import('./viajes_mercados.js?v=11'), import('./vehiculos.js?v=10')]).then(([vm, mv]) => { MOR.R = vm.construirRed(T3.net, T3.lw); MOR.arbol = vm.arbol;
    MOR.VEH = mv.crearVehiculos({ T3, movil: !!(T3.movil || T3.liviano), maxDist: 5000, cuantos: { carro: 30, camion: 1 } }); MOR.VEH.grupo.visible = false;
    MOR.objs = Array.from({ length: 30 }, (_, i) => ({ _vv: ['suv', 'sedan', 'hatch'][i % 3], _vc: 0xa21cff, _pc: 0xa21cff, _vl: 0 })); MOR.pos = { n: 0, x: new Float32Array(30), z: new Float32Array(30) };
    import('./vias_densidad.js?v=3').then(m => m.crearViasDensidad({ T3 }).extra('flujos_prop', () => (morados && MOR.VEH.grupo.visible ? MOR.pos : null))).catch(() => {}); }).catch(e => console.warn('flujos de la propuesta:', e));
  function ruta(i) { if (MOR.rutas.has(i)) return MOR.rutas.get(i); const R = MOR.R; if (!R) return null; const m = MERCADOS[i % MERCADOS.length], a = i * 2.39996, d = 700 + (i % 3) * 150, nd = R.cercano(m.x, m.z), no = R.cercano(m.x + Math.cos(a) * d, m.z + Math.sin(a) * d);
    if (nd.i < 0 || no.i < 0) { MOR.rutas.set(i, null); return null; } let T = MOR.arb.get(nd.i); if (!T) { if (MOR.pend) return null; MOR.pend = 1; T = MOR.arbol(R, nd.i); MOR.arb.set(nd.i, T); }
    if (!isFinite(T.dist[no.i])) { MOR.rutas.set(i, null); return null; } const P = [[R.X[no.i], R.Z[no.i]]]; let u = no.i; while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) break; u = R.ea[e] === u ? R.eb[e] : R.ea[e]; P.push([R.X[u], R.Z[u]]); }
    const S = [0]; for (let k = 1; k < P.length; k++) S.push(S[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); const r = S[S.length - 1] > 150 ? { P, S, L: S[S.length - 1] } : null; MOR.rutas.set(i, r); return r; }
  RELOJ.alDibujar(() => { if (!MOR.VEH) return; MOR.VEH.grupo.visible = morados; if (!morados) return; MOR.pend = 0; { const sem = RELOJ.sem || 1; fAb = MERCADOS.filter(m => sem >= m.desde).length / MERCADOS.length; } const n = Math.min(30, Math.round(11465 * 0.1 * BAJA * fAb / 20)), tA = RELOJ.tAnim || performance.now() / 1000, Y = (T3.sueloY || 0.3) + 0.02;
    MOR.VEH.inicio(); MOR.pos.n = 0; let k = 0;
    for (let i = 0; i < n; i++) { if (RELOJ.sem < MERCADOS[i % MERCADOS.length].desde) continue; const r = ruta(i); if (!r) continue; const s0 = ((tA * 11 / r.L) + i * 0.137) % 2, ida = s0 < 1, s = (ida ? s0 : 2 - s0) * r.L; let a = 0, b = r.S.length - 1; while (b - a > 1) { const mm = (a + b) >> 1; if (r.S[mm] < s) a = mm; else b = mm; }
      const fr = (s - r.S[a]) / Math.max(1e-6, r.S[b] - r.S[a]); let fx = r.P[b][0] - r.P[a][0], fz = r.P[b][1] - r.P[a][1]; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l; if (!ida) { fx = -fx; fz = -fz; }
      const x = r.P[a][0] + (r.P[b][0] - r.P[a][0]) * fr - fz * 1.8, z = r.P[a][1] + (r.P[b][1] - r.P[a][1]) * fr + fx * 1.8; MOR.VEH.poner(MOR.objs[i], 'carro', x, Y + (T3.alzaVia ? T3.alzaVia(x, z) : 0), z, Math.atan2(fx, fz)); MOR.pos.x[k] = x; MOR.pos.z[k] = z; MOR.pos.n = ++k; }
    MOR.VEH.fin(); });
  const api = { poner(par, prop) { on = !!prop && par >= 2 && par <= 6; morados = on && par !== 2; const CH = crearChips({ T3, RELOJ });
      if (on) CH.poner('flujos', [{ x: CORA[0], z: CORA[1], y: (T3.sueloY || 0.3) + 70, ico: 'via', txt: '−45 % viajes', col: '#9be8b0', title: 'Corabastos con la propuesta: 45 % menos viajes largos (mercados y huertas de barrio)' }]); else CH.quitar('flujos'); } };
  window.KEN_FLUJOS = api; return api;
}
