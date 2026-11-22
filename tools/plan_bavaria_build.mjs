// PLAN PARCIAL FÁBRICA BAVARIA (Decreto 364 de 2017, modificado en 2023; imágenes de Metrovivienda 2017) → data3d/plan_bavaria.json
//   node tools/plan_bavaria_build.mjs
// Geometría ESQUEMÁTICA a partir del predio real (data3d/bavaria.json «sitio») y de los árboles detectados (data3d/bavaria_arboles.json):
//  · retícula de manzanas alineada con el lado largo del predio (la Av. Boyacá), calles de 14 m, retiro de 25 m al borde
//  · manzanas cerradas con patio (anillo de 14 m de fondo), alternando ladrillo y blanco, y torres sobre el borde de la Av. Boyacá (como en las imágenes)
//  · se dejan libres: el parque central (lago y cancha) y las celdas con bosque denso (la modificación de 2023 conserva el bosque)
//  · los árboles que caen dentro de una manzana construida se quitan (se cuentan por etapa)
//  · etapas: de la Av. Boyacá (y el metro) hacia adentro, repartidas en 10 años
//  · viviendas: 14.300 (El Espectador; Distrito: «más de 14.000») repartidas según el área construida
import { readFileSync, writeFileSync } from 'node:fs';
const D = (f) => JSON.parse(readFileSync(new URL('../data3d/' + f, import.meta.url), 'utf8'));
const B = D('bavaria.json'), TA = D('bavaria_arboles.json').arboles;
const S = B.sitio; // polígono del predio en coordenadas del MODELO (x este, y norte)
const enPoli = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const distBorde = (P, x, y) => { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); d = Math.min(d, Math.hypot(ax + t * dx - x, ay + t * dy - y)); } return d; };
// orientación: arista más larga del predio (lado de la Av. Boyacá)
let L = 0, ang = 0, ladoA = null; for (let i = 0, j = S.length - 1; i < S.length; j = i++) { const dx = S[i][0] - S[j][0], dy = S[i][1] - S[j][1], l = Math.hypot(dx, dy); if (l > L) { L = l; ang = Math.atan2(dy, dx); ladoA = [S[j], S[i]]; } }
// la arista más larga puede ser corta si el polígono está muy subdividido: usar el eje principal (PCA)
let cx = 0, cy = 0; for (const [x, y] of S) { cx += x; cy += y; } cx /= S.length; cy /= S.length;
let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of S) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); }
ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
const ca = Math.cos(ang), sa = Math.sin(ang), aUV = (x, y) => [(x - cx) * ca + (y - cy) * sa, -(x - cx) * sa + (y - cy) * ca], deUV = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const p of S) { const [u, v] = aUV(...p); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
// densidad de bosque denso por celda
const denso = TA.filter(t => t[4] === 1).map(t => [t[0], t[1]]);
const BW = 92, BD = 74, CALLE = 14, RETIRO = 25, ANILLO = 14;
// parque central: elipse en el centroide (lago y cancha), ~ 280 x 170 m
const PQ = { u: 0, v: 0, a: 150, b: 95 };
const manzanas = [];
for (let u = u0 + RETIRO; u + BW <= u1 - RETIRO + 1; u += BW + CALLE) for (let v = v0 + RETIRO; v + BD <= v1 - RETIRO + 1; v += BD + CALLE) {
  const esq = [[u, v], [u + BW, v], [u + BW, v + BD], [u, v + BD]].map(([a, b]) => deUV(a, b));
  if (!esq.every(([x, y]) => enPoli(S, x, y) && distBorde(S, x, y) > RETIRO * 0.6)) continue;
  const mc = [u + BW / 2, v + BD / 2];
  if (((mc[0] - PQ.u) / PQ.a) ** 2 + ((mc[1] - PQ.v) / PQ.b) ** 2 < 1.15) continue; // parque central
  const [mx, my] = deUV(...mc); const nD = denso.filter(([x, y]) => Math.abs(x - mx) < BW / 2 && Math.abs(y - my) < BW / 2).length;
  if (nD > 35) continue; // bosque denso: se conserva (modificación 2023)
  manzanas.push({ esq, mc, centro: [mx, my], nD });
}
// lado de la Av. Boyacá = lado con v más bajo o más alto: el de la arista más larga del predio
const [lx, ly] = [(ladoA[0][0] + ladoA[1][0]) / 2, (ladoA[0][1] + ladoA[1][1]) / 2], vBoy = aUV(lx, ly)[1];
manzanas.forEach(m => { m.dBoy = Math.abs(m.mc[1] - vBoy); });
manzanas.sort((a, b) => a.dBoy - b.dBoy || a.mc[0] - b.mc[0]);
const N = manzanas.length, ETAPAS = 10;
let areaTot = 0;
manzanas.forEach((m, i) => {
  m.etapa = 1 + Math.floor(i / N * ETAPAS); // año en que se construye (1 a 10)
  m.torre = m.dBoy < Math.min(...manzanas.map(q => q.dBoy)) + BD + CALLE + 1 && (i % 2 === 0); // torres sobre la Av. Boyacá
  m.pisos = m.torre ? 20 : 6 + ((i * 7) % 5); // 6–10 pisos en manzana, 20 en torre
  m.material = i % 3 === 0 ? 'blanco' : 'ladrillo';
  const area = m.torre ? 30 * 30 : (BW * BD - (BW - 2 * ANILLO) * (BD - 2 * ANILLO)); m.areaPiso = area; areaTot += area * m.pisos;
});
const VIV = 14300; manzanas.forEach(m => { m.viviendas = Math.round(VIV * m.areaPiso * m.pisos / areaTot); });
// árboles que se quitan: los que caen dentro de una manzana construida
const quita = new Array(TA.length).fill(0);
TA.forEach((t, k) => { const [u, v] = aUV(t[0], t[1]); for (const m of manzanas) if (Math.abs(u - m.mc[0]) <= BW / 2 && Math.abs(v - m.mc[1]) <= BD / 2) { quita[k] = m.etapa; break; } });
const porEtapa = Array.from({ length: ETAPAS }, (_, e) => quita.filter(q => q === e + 1).length);
const out = { fuente: 'Plan Parcial Fábrica Bavaria (Decreto 364 de 2017, modificación 2023; Metrovivienda 2017). Geometría esquemática generada por tools/plan_bavaria_build.mjs sobre el predio real; 14.300 viviendas (El Espectador; el Distrito dice «más de 14.000»).',
  angulo: ang, centro: [cx, cy], dims: { BW, BD, ANILLO }, parque: { centro: deUV(PQ.u, PQ.v), a: PQ.a, b: PQ.b },
  manzanas: manzanas.map(m => ({ c: m.centro.map(v => +v.toFixed(1)), etapa: m.etapa, torre: m.torre, pisos: m.pisos, material: m.material, viviendas: m.viviendas })),
  arboles_quitados: quita, arboles_quitados_por_etapa: porEtapa, total_viviendas: manzanas.reduce((s, m) => s + m.viviendas, 0) };
writeFileSync(new URL('../data3d/plan_bavaria.json', import.meta.url), JSON.stringify(out));
console.log('manzanas', N, 'torres', manzanas.filter(m => m.torre).length, 'viviendas', out.total_viviendas, 'árboles quitados', porEtapa.reduce((a, b) => a + b, 0), 'de', TA.length, 'por etapa', porEtapa.join(','));
