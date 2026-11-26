/* CORTE DE LA SIMULACIÓN 02 MOVILIDAD (data3d/recorrido_movilidad.js): sección de la Av. de las Américas en el punto más cercano a Corabastos.
   USO: node tools/movilidad_corte_datos.mjs [overpass.json]  → escribe data3d/movilidad_corte.json
   Fuente: OpenStreetMap (instalacion/maqueta/fuentes/osm_calles_kennedy.json, Overpass, base 2026-06-01; ODbL) y, si se da, un segundo extracto de
   Overpass con andenes, ciclorrutas y TransMilenio alrededor del punto. Mismo marco geo → mundo que tools/cierre_desvios_datos.mjs.
   Solo se guardan ETIQUETAS de OSM (carriles, sentido, velocidad, gálibo) y distancias MEDIDAS sobre la geometría de OSM entre ejes de calzada.
   OSM no trae el ancho de las calzadas en este tramo: no se inventa. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y];
const geo = (lat, lng) => lw((lng + 74.17) * 111320 * Math.cos(4.63 * Math.PI / 180) + 5193.24, (lat - 4.63) * 110540 + 2090.06);
const CORA = lw(6396, 2166); // centro de Corabastos (data3d/cierre_gradual.js, marco del modelo)
const OSM = JSON.parse(readFileSync(join(REPO, 'instalacion/maqueta/fuentes/osm_calles_kennedy.json'), 'utf8'));
const extra = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')).elements : [];
const ways = [...OSM.elements, ...extra].filter(e => e.type === 'way' && e.tags && e.geometry);
const vistos = new Set(), W = ways.filter(w => !vistos.has(w.id) && vistos.add(w.id));
const nom = t => [t.name, t.alt_name, t.official_name].filter(Boolean).join(' / ');
const esAm = w => /^(trunk|primary)$/.test(w.tags.highway) && /Am[eé]ricas/i.test(nom(w.tags));
const pts = w => w.geometry.map(g => geo(g.lat, g.lon));
// 1 · cortes candidatos cada 40 m sobre las calzadas troncales (highway=trunk) de la Av. de las Américas; para cada uno, las vías que cruza una
//     perpendicular de ±R m. Se queda el corte «típico» más cercano a Corabastos: SOLO calzadas de la Av. de las Américas (nada de enlaces,
//     intercambiadores ni calles locales), al menos una por sentido y todas con su número de carriles etiquetado en OSM.
const R = 120;
function cortar(px, pz, ux, uz) { const nx = -uz, nz = ux, L = [];
  for (const w of W) { const P = pts(w); for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i];
    const ex = b[0] - a[0], ez = b[1] - a[1], den = ex * nz - ez * nx; if (Math.abs(den) < 1e-6) continue;
    const qx = a[0] - px, qz = a[1] - pz, s = (ex * qz - ez * qx) / den, u = (nx * qz - nz * qx) / den;
    if (u < 0 || u > 1 || Math.abs(s) > R) continue;
    const cos = (ex * ux + ez * uz) / Math.hypot(ex, ez); if (Math.abs(cos) < 0.8 && /^(trunk|primary|secondary)/.test(w.tags.highway)) return null; // una vía principal cruza: es una intersección
    if (Math.abs(cos) < 0.8) continue;
    const t = w.tags; L.push({ s: Math.round(s * 10) / 10, sentido: w.tags.oneway === 'yes' ? (cos > 0 ? 1 : -1) : 0, osm: w.id, highway: t.highway || null, name: t.name || null, alt_name: t.alt_name || null, lanes: t.lanes ? +t.lanes : null,
      oneway: t.oneway || null, maxspeed: t.maxspeed ? +t.maxspeed : null, maxheight: t.maxheight ? +t.maxheight : null, bridge: t.bridge || null, sidewalk: t.sidewalk || null,
      footway: t.footway || null, cycleway: t.cycleway || null, busway: t.busway || null, width: t.width ? +t.width : null, surface: t.surface || null }); break; } }
  return L; }
let best = null, cruces = null, nCand = 0;
for (const w of W.filter(w => esAm(w) && w.tags.highway === 'trunk')) { const P = pts(w);
  for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 20) continue;
    for (let s = 10; s < l - 10; s += 40) { const x = a[0] + dx * s / l, z = a[1] + dz * s / l, ux = dx / l, uz = dz / l, L = cortar(x, z, ux, uz); if (!L) continue; nCand++;
      const cal = L.filter(c => /^(trunk|primary)$/.test(c.highway));
      if (L.length !== cal.length || !cal.every(c => esAm({ tags: { highway: c.highway, name: c.name, alt_name: c.alt_name } }) && c.lanes) || !cal.some(c => c.sentido > 0) || !cal.some(c => c.sentido < 0)) continue;
      const d = Math.hypot(CORA[0] - x, CORA[1] - z); if (!best || d < best.d) { best = { d, x, z, ux, uz }; cruces = L; } } } }
console.error('cortes probados', nCand);
cruces.sort((a, b) => a.s - b.s);
// 3 · largo del eje de la Av. de las Américas dentro del extracto (proyección sobre su eje principal, como cierre_gradual.js)
const P = W.filter(esAm).flatMap(pts); let mx = 0, mz = 0; for (const p of P) { mx += p[0]; mz += p[1]; } mx /= P.length; mz /= P.length;
let sxx = 0, sxz = 0, szz = 0; for (const p of P) { const dx = p[0] - mx, dz = p[1] - mz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ax = Math.cos(ang), az = Math.sin(ang); let s0 = 1e9, s1 = -1e9; for (const p of P) { const s = (p[0] - mx) * ax + (p[1] - mz) * az; s0 = Math.min(s0, s); s1 = Math.max(s1, s); }
const out = { fuente: 'OpenStreetMap (Overpass, base ' + OSM.osm3s.timestamp_osm_base.slice(0, 10) + '; © colaboradores de OpenStreetMap, ODbL)' + (extra.length ? ' + extracto Overpass de andenes y TransMilenio' : ''),
  herramienta: 'tools/movilidad_corte_datos.mjs', punto: { x: Math.round(best.x), z: Math.round(best.z), ux: +best.ux.toFixed(4), uz: +best.uz.toFixed(4), aCorabastos_m: Math.round(best.d) },
  ejeAmericas_km: Math.round((s1 - s0) / 100) / 10, cruces, mayo: mayo() };
/* 4 · trazado de la Av. Primero de Mayo (la vía del desvío) para dibujarla en el 3D: data3d/net.json solo la reconoce en 18 tramos sueltos.
   Vías principales de OSM con «Primero de Mayo» en el nombre, el tramo que corre a lo largo de la Av. de las Américas (misma franja del eje
   ± 1 km en sus extremos); polilíneas en el marco mundo, redondeadas a 1 m. */
function mayo() { const out = []; const sMin = s0 - 1000, sMax = s1 + 1000;
  for (const w of W) { const t = w.tags; if (!/^(trunk|primary|secondary)$/.test(t.highway) || !/Primero de Mayo/i.test(nom(t))) continue;
    const L = pts(w).filter(p => { const s = (p[0] - mx) * ax + (p[1] - mz) * az; return s >= sMin && s <= sMax; }); if (L.length > 1) out.push(L.map(p => [Math.round(p[0]), Math.round(p[1])])); }
  return out; }
writeFileSync(join(REPO, 'data3d/movilidad_corte.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
