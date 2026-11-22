/* ============ CARROS DEL PLAN PARCIAL FÁBRICA BAVARIA (escenario D) ============
   Cuántos: los autos nuevos que calcula el modelo semanal (data3d/sim_vida.js, o.plan.autos = viviendas terminadas × 0,31 autos/hogar,
   Encuesta de Movilidad 2023). En el mapa se dibuja 1 carro por cada 20 autos nuevos (escala declarada), la mitad saliendo del predio y la
   mitad llegando. Por dónde: el camino más corto por la red vial del simulador (data3d/net.json, construirRed/arbol de viajes_mercados.js)
   entre el predio y 16 destinos repartidos por Kennedy (centros de las zonas de 500 m más pobladas de cada sector). Movimiento cosmético
   (reloj universal, RELOJ.tAnim); color ámbar-rojizo para distinguirlos del tráfico SUMO grabado. Solo en el escenario D. */
import { RELOJ } from './reloj.js?v=5';
import { construirRed, arbol } from './viajes_mercados.js?v=8';
import { ZONAS } from './sim_red_datos.js?v=2';

const POR_CARRO = 20, VEL = 14, MAXC = 400; // autos por carro dibujado · m/s en pantalla · tope de carros dibujados
function ruta(R, T, u) { // nodo u -> raíz del árbol (el predio), con largo acumulado
  if (!isFinite(T.dist[u])) return null; const out = [[R.X[u], R.Z[u]]];
  while (u !== T.fuente) { const e = T.prevE[u]; if (e < 0) return null; const v = R.ea[e] === u ? R.eb[e] : R.ea[e]; out.push([R.X[v], R.Z[v]]); u = v; }
  const S = new Float64Array(out.length); for (let k = 1; k < out.length; k++) S[k] = S[k - 1] + Math.hypot(out[k][0] - out[k - 1][0], out[k][1] - out[k - 1][1]);
  return { P: out, S, L: S[S.length - 1] };
}

export async function iniciarTraficoPlan({ T3 }) {
  const THREE = T3.THREE;
  const net = T3.net || await (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/net.json');
  const R = construirRed(net, T3.lw), c0 = T3.lw(9319, 2942.6), nb = R.cercano(c0[0], c0[1]); if (nb.i < 0) return null;
  const T = arbol(R, nb.i);
  // 16 destinos: la zona más poblada de cada sector angular alrededor del predio (a más de 1,5 km)
  const sect = new Array(16).fill(null);
  ZONAS.forEach(([x, z, p]) => { const d = Math.hypot(x - c0[0], z - c0[1]); if (d < 1500) return; const k = Math.floor(((Math.atan2(z - c0[1], x - c0[0]) + Math.PI) / (2 * Math.PI)) * 16) % 16; if (!sect[k] || p > sect[k][2]) sect[k] = [x, z, p]; });
  const rutas = sect.filter(Boolean).map(([x, z, p]) => { const n = R.cercano(x, z); const r = n.i >= 0 ? ruta(R, T, n.i) : null; return r && r.L > 500 ? { ...r, p } : null; }).filter(Boolean);
  const pesoT = rutas.reduce((s, r) => s + r.p, 0);
  const geo = new THREE.SphereGeometry(1, 8, 6), mat = new THREE.MeshBasicMaterial({ color: 0xff7a3d, toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
  const im = new THREE.InstancedMesh(geo, mat, MAXC); im.count = 0; im.frustumCulled = false; im.renderOrder = 16; im.visible = false; T3.scene.add(im);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(16, 8, 16), V = new THREE.Vector3();
  // cada carro: ruta (por peso de población del destino), desfase y sentido (sale / llega), fijos por índice (determinista)
  const h = (i) => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; return (x >>> 0) / 4294967296; };
  const carros = Array.from({ length: MAXC }, (_, i) => { let u = h(i) * pesoT, k = 0; while (k < rutas.length - 1 && u > rutas[k].p) { u -= rutas[k].p; k++; } return { r: rutas[k], fase: h(i + 7919), sale: i % 2 === 0 }; });
  const enRuta = (r, s) => { let a = 0, b = r.S.length - 1; while (b - a > 1) { const m = (a + b) >> 1; if (r.S[m] < s) a = m; else b = m; } const f = (s - r.S[a]) / Math.max(1e-6, r.S[b] - r.S[a]); return [r.P[a][0] + (r.P[b][0] - r.P[a][0]) * f, r.P[a][1] + (r.P[b][1] - r.P[a][1]) * f]; };
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3) + 4;
  RELOJ.alDibujar(() => {
    const E = window.KEN_ESIM, esc = E && E.esc, o = E && E.vida && E.vida.S && E.vida.S.D ? E.vida.S.D.o : null;
    const on = esc === 'D' && o && o.plan; im.visible = !!on; if (!on) return;
    const n = Math.min(MAXC, Math.round(o.plan.autos / POR_CARRO)), tA = RELOJ.tAnim || 0;
    for (let i = 0; i < n; i++) { const c = carros[i], L = c.r.L, s0 = ((tA * VEL / L) + c.fase) % 1, s = (c.sale ? s0 : 1 - s0) * L; // la ruta va del destino (0) al predio (L)
      const [x, z] = enRuta(c.r, s); V.set(x, y0(), z); M.compose(V, Q, S3); im.setMatrixAt(i, M); }
    im.count = n; im.instanceMatrix.needsUpdate = true;
  });
  window.KEN_TRPLAN = { get dibujados() { return im.count; }, get visible() { return im.visible; }, rutas: rutas.length };
  return window.KEN_TRPLAN;
}
