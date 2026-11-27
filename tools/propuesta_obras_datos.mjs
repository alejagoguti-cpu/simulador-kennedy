/* node tools/propuesta_obras_datos.mjs → data3d/propuesta_obras.json
   Resume las OBRAS de «Kennedy con propuesta» que dibuja el 3D (ecoducto.js, propuesta_bordes.json, calles_verdes3d.js, parches_arboles.js,
   propuesta01_3d.js, humedal_bavaria3d.js) en cifras que usa el modelo (data3d/simulaciones12.js, «MECANISMOS DE LA PROPUESTA · OBRAS»):
   áreas (ha), copas (ha), árboles, posición en el MUNDO del simulador (x este, z sur; el marco de sim_red_datos.js PARCHES), corredores entre
   zonas verdes y calendario. Mismos datos y mismas reglas que el 3D; donde el 3D sortea algo al azar se usa el valor esperado (se dice abajo).
   Supuestos [SUP] de este resumen (además de los de cada archivo 3D):
   · copa de un árbol adulto = disco con el radio del punto lejano de parches_arboles.js (dosel 6,5 m, medianos 5 m, arbustos 3,6 m); las copas se
     unen en una rejilla de 2 m (lo que se solapa no se cuenta dos veces).
   · corredor de calle verde: una fila de árboles une dos zonas verdes cuando sus árboles quedan a G = 50 m o menos del borde de las dos (círculo
     con el área del parche) y entre filas de calles distintas hay 50 m o menos; solo pares de zonas a DMAX = 2.000 m o menos (alcance de
     dispersión del grupo «árbol» de sim_vida.js). */
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const RAIZ = fileURLToPath(new URL('../data3d/', import.meta.url));
const J = (f) => JSON.parse(fs.readFileSync(RAIZ + f, 'utf8'));
const imp = (f) => import(pathToFileURL(RAIZ + f).href);
const { PARCHES } = await imp('sim_red_datos.js');
const { calcularCallesVerdes, CV_SUP } = await imp('calles_verdes3d.js');
const { calcularParches, ESPECIES } = await imp('parches_arboles.js');
const { anchoMedio } = await imp('ecoducto.js');
const HBV = await imp('humedal_bavaria3d.js');
const S12 = await imp('simulaciones12.js');

const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y]; // modelo → mundo (index.html)
const GEO = { LAT0: 4.63, LNG0: -74.17, EX: -5193.24, EY: -2090.06 }, MXg = 111320 * Math.cos(GEO.LAT0 * Math.PI / 180), MYg = 110540;
const ll = (lng, lat) => lw((lng - GEO.LNG0) * MXg - GEO.EX, (lat - GEO.LAT0) * MYg - GEO.EY);
const R1 = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const RCOPA = [6.5, 5, 3.6]; // m, por estrato (parches_arboles.js, punto lejano)
const copaSp = (sp) => RCOPA[(ESPECIES[sp] || { estrato: 1 }).estrato];
const G = 50, DMAX = 2000, CEL = 2;
const HAB = PARCHES.map((p, i) => (!/^mod/.test(p.t) && !p.dyn ? i : -1)).filter(i => i >= 0);
const RP = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI));
const idx = (id) => PARCHES.findIndex(p => p.id === id);

/* unión de copas en rejilla de 2 m */
function union(arb) { const S = new Set(); for (const [x, z, r] of arb) { const r2 = r * r;
  for (let i = Math.floor((x - r) / CEL); i <= Math.floor((x + r) / CEL); i++) for (let j = Math.floor((z - r) / CEL); j <= Math.floor((z + r) / CEL); j++) {
    const cx = (i + 0.5) * CEL - x, cz = (j + 0.5) * CEL - z; if (cx * cx + cz * cz <= r2) S.add(i * 100003 + j); } }
  return S.size * CEL * CEL / 1e4; }
const suma = (arb) => arb.reduce((a, t) => a + Math.PI * t[2] * t[2], 0) / 1e4;

/* ---------- 1 · ECODUCTO (ecoducto.js): área verde del tablero y de los taludes de las rampas ---------- */
const eco = (() => { const AB = 22, RAMPA = 70, H = 8.6, sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const alto = (s) => { const a = Math.abs(s); return a <= AB + 2 ? H : H * (0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (a - AB - 2) / (RAMPA - AB - 2)))); };
  const talud = (s) => Math.abs(s) > AB ? 1.5 * alto(s) * sm(AB, AB + 6, Math.abs(s)) : 0;
  let tab = 0, tal = 0; const N = 2800, ds = 2 * RAMPA / N; for (let k = 0; k < N; k++) { const s = -RAMPA + (k + 0.5) * ds; tab += 2 * anchoMedio(s) * ds; tal += 2 * talud(s) * ds; }
  const [x, z] = lw(7204.9, 3710.5);
  return { x: R1(x, 1), z: R1(z, 1), ha: R1((tab + tal) / 1e4, 3), haTablero: R1(tab / 1e4, 3), haTaludes: R1(tal / 1e4, 3), parche: 'burro', via: 'Av. Ciudad de Cali',
    obra: 1, cubierta: [1.3, 3], arboles: [1.5, 2.5], adulto: 3.5, fuente: 'data3d/ecoducto.js (perfil anchoMedio, rampas de 70 m, taludes 1,5 × altura)' }; })();

/* ---------- 2 · ÁRBOLES DE BORDE DE LOS HUMEDALES (propuesta_bordes.json, como los siembra ecoducto.js) ---------- */
const bordes = (() => { const B = J('propuesta_bordes.json'), L = { borde: ['chilco', 'tibar', 'arrayan', 'raque', 'mortino', 'arrayan'], medio: ['sauco', 'chicala', 'arrayan', 'aliso'], dosel: ['caucho', 'aliso', 'aliso', 'caucho', 'sauco'] };
  const rMed = (l) => l.reduce((a, sp) => a + copaSp(sp), 0) / l.length; // especie al azar en el 3D: radio medio de su lista
  const por = {}; const hum = ['burro', 'vaca', 'techo'].map(idx);
  for (const [x0, y0, d] of B.a) { const [x, z] = lw(x0, y0), r = rMed(d < 3 ? L.borde : d < 11 ? L.medio : L.dosel);
    let b = hum[0], bd = Infinity; for (const h of hum) { const e = Math.hypot(PARCHES[h].x - x, PARCHES[h].z - z) - RP[h]; if (e < bd) { bd = e; b = h; } }
    (por[PARCHES[b].id] = por[PARCHES[b].id] || []).push([x, z, r]); }
  const out = { n: Math.round(B.a.length * 0.96), nArchivo: B.a.length, siembra: [0.5, 4], adulto: 3.5, e0: 0.3, porParche: {}, fuente: 'data3d/propuesta_bordes.json; calendario y 4 % que el 3D omite al azar: data3d/ecoducto.js' };
  for (const [id, A] of Object.entries(por)) out.porParche[id] = { n: Math.round(A.length * 0.96), copaHa: R1(union(A) * 0.96, 2) };
  return out; })();

/* ---------- 3 · CALLES VERDES (calles_verdes3d.js, calidad «completo» = todos los árboles) ---------- */
const calles = (() => { const N = J('net.json'), W = J('water_bodies.json'), P = J('parques.json'), K = J('kennedy.json');
  const it = calcularCallesVerdes({ edges: N.edges, lw, agua: W, parques: P, limite: K.limite.map(([a, b]) => ll(a, b)), alza: null, calidad: 'completo' }); let r; while (!(r = it.next()).done); const R = r.value;
  const porC = new Map(); for (const t of R.arboles) { let c = porC.get(t.cal); if (!c) porC.set(t.cal, c = { arb: [], sem: Infinity, fase: t.fase }); c.arb.push([t.x, t.z, copaSp(t.sp)]); c.sem = Math.min(c.sem, t.ap * 52); }
  const C = [...porC.entries()].map(([id, c]) => ({ id, ...c, sem: Math.round(c.sem), copa: suma(c.arb) })).sort((a, b) => a.sem - b.sem);
  const U = union(C.flatMap(c => c.arb)), S = C.reduce((a, c) => a + c.copa, 0), fU = U / S;
  // rejilla de árboles por calle
  const GR = new Map(), key = (i, j) => i * 100003 + j; C.forEach((c, k) => { for (const [x, z] of c.arb) { const kk = key(Math.floor(x / G), Math.floor(z / G)); let a = GR.get(kk); if (!a) GR.set(kk, a = new Set()); a.add(k); } });
  const vecinos = (k) => { const V = new Set(); for (const [x, z] of C[k].arb) { const i = Math.floor(x / G), j = Math.floor(z / G); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const s = GR.get(key(i + a, j + b)); if (s) for (const o of s) if (o !== k) V.add(o); } }
    return [...V].filter(o => C[o].arb.some(([x, z]) => C[k].arb.some(([u, v]) => Math.abs(u - x) <= G && Math.abs(v - z) <= G && Math.hypot(u - x, v - z) <= G))); };
  const toca = C.map(c => HAB.filter(p => c.arb.some(([x, z]) => Math.hypot(x - PARCHES[p].x, z - PARCHES[p].z) <= RP[p] + G)));
  // unión-búsqueda en el orden de siembra: semana en que dos zonas verdes quedan unidas por filas de árboles (la calle más tardía del camino)
  const NPp = PARCHES.length, par = Array.from({ length: NPp + C.length }, (_, i) => i), raiz = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  const pares = new Map(), puesta = new Uint8Array(C.length);
  C.forEach((c, k) => { puesta[k] = 1; const nk = NPp + k; for (const p of toca[k]) par[raiz(p)] = raiz(nk); for (const o of vecinos(k)) if (puesta[o]) par[raiz(NPp + o)] = raiz(nk);
    for (let a = 0; a < HAB.length; a++) for (let b = a + 1; b < HAB.length; b++) { const p = HAB[a], q = HAB[b], kk = p * NPp + q; if (pares.has(kk)) continue;
      if (Math.hypot(PARCHES[p].x - PARCHES[q].x, PARCHES[p].z - PARCHES[q].z) > DMAX) continue; if (raiz(p) === raiz(q)) pares.set(kk, [PARCHES[p].id, PARCHES[q].id, c.sem]); } });
  // ruido: por zona verde, árboles de fase 2 a 100 m o menos de su borde / todos los de calle verde a 100 m (la fase 1 ya está en PROP_SUP.MIT)
  const ruido = {}; for (const p of HAB) { const L = new Map(); let tot = 0; C.forEach(c => { const n = c.arb.filter(([x, z]) => Math.hypot(x - PARCHES[p].x, z - PARCHES[p].z) <= RP[p] + 100).length; if (!n) return; tot += n; if (c.fase === 2) L.set(c.sem, (L.get(c.sem) || 0) + n); });
    if (tot && L.size) ruido[PARCHES[p].id] = [...L.entries()].map(([s, n]) => [s, R1(n / tot, 4)]); }
  return { n: R.arboles.length, km: R1(R.LT / 1000, 1), copaHa: R1(U, 2), fUnion: R1(fU, 4), adulto: CV_SUP.ADULTO, e0: CV_SUP.E0, T0: CV_SUP.T0, T1: CV_SUP.T1, T2: CV_SUP.T2, G, DMAX,
    fase1: { n: C.filter(c => c.fase === 1).reduce((a, c) => a + c.arb.length, 0) }, fase2: { n: C.filter(c => c.fase === 2).reduce((a, c) => a + c.arb.length, 0) },
    calles: C.map(c => [c.sem, c.fase, R1(c.copa * fU, 4), c.arb.length]), pares: [...pares.values()], ruido, fuente: 'data3d/calles_verdes3d.js calcularCallesVerdes (net.json, water_bodies.json, parques.json, kennedy.json)' }; })();

/* ---------- 4 · ÁRBOLES NUEVOS DE PARQUES (parches_arboles.js calcularParches + anillo del Parque Cayetano Cañizares de propuesta01_3d.js) ---------- */
const parques = (() => { const HB = J('huertas_barrio.json'), PQ = J('parques.json'); const P = calcularParches(HB, PQ, lw, false);
  const A = P.flatMap(p => p.arboles.map(t => [t.x, t.z, copaSp(t.sp)]));
  const med = ['sauco', 'chicala', 'arrayan', 'aliso'], arb2 = ['chilco', 'tibar', 'raque', 'mortino', 'chilco'], L9 = med.concat(arb2), rA = L9.reduce((a, sp) => a + copaSp(sp), 0) / L9.length;
  let pq = 0; for (const p of PARCHES) if (p.t === 'parque') pq += p.ha;
  return { n: A.length, grupos: P.length, copaHa: R1(union(A), 2), siembra: [1, 4], adulto: 5, e0: 0.2, haParquesModelo: R1(pq, 1),
    anillo: { n: 70, x: 783, z: 1637, parche: 'pq4', copaHa: R1(70 * Math.PI * rA * rA / 1e4, 3), siembra: [1, 2.5], adulto: 3.5, e0: 0.35 },
    fuente: 'data3d/parches_arboles.js calcularParches(huertas_barrio.json, parques.json); anillo: data3d/propuesta01_3d.js arbolesHumedal (70 árboles a 45–95 m del mercado)' }; })();

/* ---------- 5 · LA VACA AMPLIADA EN EL PREDIO DE CORABASTOS (propuesta01_3d.js armarCampo, mismas fórmulas) ---------- */
const vaca = (() => { const C = J('corabastos.json'), WB = J('water_bodies.json'); const V = WB.filter(w => /vaca/i.test(w.nombre || '')).sort((a, b) => b.pts.length - a.pts.length)[0].pts.map(p => lw(p[0], p[1]));
  const AN = { sendero: 5, barrera: 42, pradera: 78, agua: 100 };
  const hs = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
  const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz); const a = hs(ix, iz), b = hs(ix + 1, iz), c = hs(ix, iz + 1), d = hs(ix + 1, iz + 1); return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; };
  const fbm = (x, z) => 0.55 * vn(x, z) + 0.3 * vn(x * 2.03 + 17, z * 2.03 + 5) + 0.15 * vn(x * 4.1 + 3, z * 4.1 + 31);
  const rect = (n, m) => { const [cx, cz] = lw(n.c[0], n.c[1]), e = lw(n.c[0] + Math.cos(n.a), n.c[1] + Math.sin(n.a)), ux = e[0] - cx, uz = e[1] - cz, vx = -uz, vz = ux, L2 = n.L / 2 + m, W2 = n.W / 2 + m; return [[-L2, -W2], [L2, -W2], [L2, W2], [-L2, W2]].map(([u, v]) => [cx + u * ux + v * vx, cz + u * uz + v * vz]); };
  const envolvente = (P) => { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of P.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
  const dentro = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  const dseg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
  const dpoly = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length; i++) d = Math.min(d, dseg(x, z, P[i], P[(i + 1) % P.length])); return d; };
  const DES = S12.AB01_DESMONTE, q = new Set(DES.map(D => D.i)); // = quitadas01 / semQuita01 de abasto_capas.js (comprobado: mismo orden y semanas)
  const quit = DES.map((D, k) => ({ k, sem: D.sem, R: rect(C.naves[D.i], 0) }));
  const H = envolvente(C.naves.filter((n, i) => !q.has(i)).flatMap(n => rect(n, 8))), PO = C.poly.map(p => lw(p[0], p[1]));
  const segs = PO.map((a, i) => ({ a, b: PO[(i + 1) % PO.length] })).map(s => ({ ...s, vaca: dpoly(V, s.a[0], s.a[1]) < 80 && dpoly(V, s.b[0], s.b[1]) < 80 }));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of PO) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const M = 6; x0 -= M; z0 -= M; const NX = Math.ceil((x1 + M - x0) / CEL), NZ = Math.ceil((z1 + M - z0) / CEL);
  const Dcalc = (x, z) => { const dr = dpoly(H, x, z); let dc = 1e9, dv = 1e9; for (const s of segs) { const d = dseg(x, z, s.a, s.b); if (s.vaca) dv = Math.min(dv, d); else dc = Math.min(dc, d); } return Math.min(dr, dc, dv + 85) + (fbm(x / 70, z / 70) - 0.5) * 24 + (fbm(x / 22 + 40, z / 22) - 0.5) * 10; };
  const semCel = (x, z) => { let md = 1e9, s = 0; for (const Q of quit) { const d = dentro(Q.R, x, z) ? 0 : dpoly(Q.R, x, z); if (d < md) { md = d; s = Q.sem; } } return s; };
  const bandas = { sendero: {}, barrera: {}, pradera: {}, juncos: {}, agua: {} }, c = CEL * CEL / 1e4; let sx = 0, sz = 0, n = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = x0 + (i + 0.5) * CEL, z = z0 + (j + 0.5) * CEL; if (!(dentro(PO, x, z) && !dentro(H, x, z))) continue;
    const D = Math.max(0, Dcalc(x, z)), T = semCel(x + (fbm(x / 30, z / 30) - 0.5) * 40, z + (fbm(z / 30 + 9, x / 30) - 0.5) * 40);
    const b = D < AN.sendero ? 'sendero' : D < AN.barrera ? 'barrera' : D < AN.pradera ? 'pradera' : D < AN.agua ? 'juncos' : 'agua'; bandas[b][T] = (bandas[b][T] || 0) + c; sx += x; sz += z; n++; }
  const sem = DES.map(D => D.sem), arr = (o) => sem.map(s => R1(o[s] || 0, 3)), tot = (o) => R1(Object.values(o).reduce((a, v) => a + v, 0), 2);
  return { x: Math.round(sx / n), z: Math.round(sz / n), parche: 'vaca', semanas: sem, bandas: Object.fromEntries(Object.entries(bandas).map(([k, o]) => [k, arr(o)])), totales: Object.fromEntries(Object.entries(bandas).map(([k, o]) => [k, tot(o)])),
    obra: 0.6, crece: 4, arboles: { siembra: 0.75, adulto: 3.5, e0: 0.35 }, fuente: 'data3d/propuesta01_3d.js armarCampo (corabastos.json, water_bodies.json, AB01_DESMONTE); franjas del año 5' }; })();

/* ---------- 6 · HUMEDAL ARTIFICIAL DE BAVARIA (humedal_bavaria3d.js generarCampo, con los árboles del censo como islas) ---------- */
const bavaria = (() => { const AJ = (() => { try { return J('bavaria_arboles.json').arboles || []; } catch (e) { return []; } })(); const it = HBV.generarCampo({ lw, arboles: AJ, CEL: 1 }); let r; while (!(r = it.next()).done); const A = r.value.AREA;
  let x = 0, z = 0; for (const [a, b] of HBV.POLI_HUMEDAL_BAV) { const [u, v] = lw(a, b); x += u; z += v; } const n = HBV.POLI_HUMEDAL_BAV.length;
  return { x: Math.round(x / n), z: Math.round(z / n), ha: A.ha, agua: A.agua, vegetacion: A.vegetacion, huella: A.huella, celdas: A.celdas, parche: 'bosqueBav', obra: [2, 3], llena: [3, 4], plantas: [3, 6], fuente: 'data3d/humedal_bavaria3d.js generarCampo (bavaria_arboles.json), POLI_HUMEDAL_BAV' }; })();

/* ---------- 7 · HUERTAS DE PARQUE (huertas_barrio.json): ya están en el modelo como módulos «Huertas de parque (n)» ---------- */
const hbar = (() => { const HB = J('huertas_barrio.json'); const n = HB.huertas.filter(h => h.tipo === 'parque').length; let m = 0; for (const p of PARCHES) { const k = /^Huertas de parque \((\d+)\)/.exec(p.n); if (k) m += +k[1]; } return { n, enModelo: m }; })();

const OUT = { _: { generado: 'node tools/propuesta_obras_datos.mjs', fecha: new Date().toISOString().slice(0, 10), marco: 'mundo del simulador (x este, z sur) = lw(modelo) = (x − 5341,33, 3161,9 − y); el de sim_red_datos.js PARCHES',
  sup: ['copa adulta = disco de 6,5 / 5 / 3,6 m de radio según el estrato (parches_arboles.js, punto lejano); unión en rejilla de 2 m',
    'corredor de calle verde: árboles a 50 m o menos del borde de las dos zonas verdes y entre filas; pares a 2.000 m o menos',
    'especie al azar en el 3D → radio medio de su lista; 4 % de árboles de borde que el 3D omite → × 0,96'] },
  ecoducto: eco, bordes, calles, parques, vaca, bavaria, huertasParque: hbar };
fs.writeFileSync(RAIZ + 'propuesta_obras.json', JSON.stringify(OUT));
console.log(JSON.stringify({ eco, bordes, calles: { n: calles.n, km: calles.km, copaHa: calles.copaHa, fU: calles.fUnion, f1: calles.fase1, f2: calles.fase2, nCalles: calles.calles.length, pares: calles.pares.length, ruido: Object.keys(calles.ruido).length }, parques: { ...parques }, vaca: { ...vaca, bandas: undefined }, bavaria, hbar }, null, 1));
