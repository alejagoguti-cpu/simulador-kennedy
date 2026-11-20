// Nodos reales de la red de abastecimiento de Kennedy para bavaria.html -> data3d/bavaria_red.json (marco «modelo»: x este, y norte)
// Fuentes: data3d/colegios.json (OSM amenity=school, marco mundo), data3d/plazas.json (IPES + OSM),
// red-de-problemas/tools/cache/servicios_osm.json (OSM: amenity=marketplace, social_facility). Solo lo que cae dentro de Kennedy.
const fs = require('fs'), path = require('path');
const R = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
const lim = R('data3d/bavaria_sx.json').limite;
const dentro = (x, y) => { let c = false; for (let i = 0, j = lim.length - 1; i < lim.length; j = i++) { const [xi, yi] = lim[i], [xj, yj] = lim[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const MX = 111320 * Math.cos(4.63 * Math.PI / 180), MY = 110540;
const ll = (lat, lon) => [(lon + 74.17) * MX + 5193.24, (lat - 4.63) * MY + 2090.06];
const r1 = (v) => Math.round(v * 10) / 10;
const out = { fuente: 'OpenStreetMap (© colaboradores, ODbL): amenity=school, marketplace, social_facility; IPES plazas de mercado 2024. tools/bavaria_red_build.js', colegios: [], plazas: [], comedores: [] };
for (const c of R('data3d/colegios.json').colegios) { const x = c.c[0] + 5341.33, y = 3161.9 - c.c[1]; if (dentro(x, y)) out.colegios.push({ n: c.n, p: [r1(x), r1(y)] }); }
const vistos = [];
const nuevo = (p) => !vistos.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 120);
for (const p of R('data3d/plazas.json').plazas) { if (dentro(...p.p) && nuevo(p.p)) { vistos.push(p.p); out.plazas.push({ n: p.n === 'Plaza de mercado (OSM)' ? 'Plaza de mercado' : p.n, p: p.p.map(r1) }); } }
const osm = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'red-de-problemas', 'tools', 'cache', 'servicios_osm.json'), 'utf8'));
for (const e of osm.elements) {
  const t = e.tags || {}; const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon); if (lat == null) continue;
  const p = ll(lat, lon); if (!dentro(...p)) continue;
  if (t.amenity === 'marketplace' && nuevo(p)) { vistos.push(p); out.plazas.push({ n: t.name || 'Plaza de mercado', p: p.map(r1) }); }
  if (t.amenity === 'social_facility') out.comedores.push({ n: t.name || 'Comedor comunitario', p: p.map(r1) });
}
fs.writeFileSync(path.join(__dirname, '..', 'data3d', 'bavaria_red.json'), JSON.stringify(out));
console.log('colegios', out.colegios.length, 'con nombre', out.colegios.filter(c => c.n !== 'Colegio').length, '| plazas', out.plazas.length, out.plazas.map(p => p.n).join('; '), '| comedores', out.comedores.length, out.comedores.map(p => p.n).join('; '));
