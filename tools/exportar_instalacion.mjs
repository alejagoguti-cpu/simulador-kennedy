// KENNEDY REACCIONA · exportador de datos del simulador para TouchDesigner y la maqueta.
//   node tools/exportar_instalacion.mjs
// Lee los MISMOS datos del simulador (data3d/net.json, data3d/traf/*.bin formato RTF1) y el encuadre de instalacion/config.json,
// y escribe en instalacion/datos/:
//   vehiculos.npy   float16 (NS, M, 6): por segundo de la grabación SUMO y por vehículo dentro del encuadre:
//                   u, v (0..1 del encuadre, v hacia abajo), du, dv (desplazamiento al segundo siguiente, para interpolar),
//                   velocidad (m/s), sorteo (0..1: el vehículo se muestra si sorteo <= demanda de la hora; misma regla del simulador).
//                   Filas vacías: u = v = -1.  Es una REPRODUCCIÓN de la simulación SUMO grabada (no se re-simula).
//   red_vial.csv    tramos de la red vial dentro del encuadre: tipo (0 avenida, 1 intermedia, 2 local), u0, v0, u1, v1
//   red_vial.svg    la misma red a la escala de la maqueta (mm), para fabricarla
//   meta.json       NS, M, duración, encuadre, escala y origen de cada archivo
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(await readFile(join(RAIZ, 'instalacion/config.json'), 'utf8'));
const LC = cfg.coordenadas.LC, R = cfg.rectangulo;
const rot = (R.rotacion_grados || 0) * Math.PI / 180, cR = Math.cos(rot), sR = Math.sin(rot);
// mismo mapeo que instalacion/proyeccion.html (aPx), normalizado a 0..1
const aUV = (x, z) => { const dx = x - R.centro_m[0], dz = z - R.centro_m[1]; return [(dx * cR + dz * sR) / R.ancho_m + 0.5, (-dx * sR + dz * cR) / R.alto_m + 0.5]; };
const MARG = 0.03; // margen fuera del encuadre (para que entren sin cortarse)
const dentro = (u, v) => u > -MARG && u < 1 + MARG && v > -MARG && v < 1 + MARG;

// ---------- red vial ----------
const NET = JSON.parse(await readFile(join(RAIZ, 'data3d/net.json'), 'utf8'));
const TIPOS = ['major', 'mid', 'local'], tramos = [];
for (const [tipo, pts] of NET.edges) {
  const q = pts.map(p => aUV(p[0] - LC[0], LC[1] - p[1]));
  for (let i = 0; i < q.length - 1; i++) if (dentro(...q[i]) || dentro(...q[i + 1])) tramos.push([TIPOS.indexOf(tipo), ...q[i], ...q[i + 1]]);
}
const OUT = join(RAIZ, 'instalacion/datos'); await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'red_vial.csv'), 'tipo,u0,v0,u1,v1\n' + tramos.map(t => [t[0], ...t.slice(1).map(x => x.toFixed(5))].join(',')).join('\n') + '\n');
const mmW = R.ancho_m / cfg.maqueta.escala * 1000, mmH = R.alto_m / cfg.maqueta.escala * 1000, ANCHO = [1.4, 0.9, 0.5];
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${mmW}mm" height="${mmH}mm" viewBox="0 0 ${mmW} ${mmH}">`,
  `<title>Kennedy Reacciona · red vial · escala 1:${cfg.maqueta.escala}</title>`,
  `<rect x="0" y="0" width="${mmW}" height="${mmH}" fill="none" stroke="#000" stroke-width="0.5"/>`,
  ...[0, 1, 2].map(k => `<g stroke="#000" stroke-linecap="round" fill="none" stroke-width="${ANCHO[k]}">` + tramos.filter(t => t[0] === k).map(t => `<line x1="${(t[1] * mmW).toFixed(2)}" y1="${(t[2] * mmH).toFixed(2)}" x2="${(t[3] * mmW).toFixed(2)}" y2="${(t[4] * mmH).toFixed(2)}"/>`).join('') + '</g>'),
  '</svg>'].join('\n');
await writeFile(join(OUT, 'red_vial.svg'), svg);

// ---------- capas fijas del 3D del simulador como imágenes (PNG RGBA, mismo encuadre) ----------
// edificios (data3d/buildings.json), parques (parques.json), agua (water_bodies.json), árboles (trees.json), colegios, huertas
import { deflateSync } from 'node:zlib';
const PW = 2560, PH = Math.round(2560 * R.alto_m / R.ancho_m);
const crc32 = (() => { const T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } return (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
function png(px, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ch = (tipo, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tipo), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; ih[10] = ih[11] = ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(raw, { level: 6 })), ch('IEND', Buffer.alloc(0))]);
}
const aPxM = (p) => { const [u, v] = aUV(p[0] - LC[0], LC[1] - p[1]); return [u * PW, v * PH]; }; // coordenadas del MODELO -> píxel
function relleno(px, pts, [r, g, b, a]) { // polígono par-impar por barrido
  const q = pts.map(aPxM); let y0 = Infinity, y1 = -Infinity; for (const [, y] of q) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  y0 = Math.max(0, Math.ceil(y0 - 0.5)); y1 = Math.min(PH - 1, Math.floor(y1 - 0.5));
  for (let y = y0; y <= y1; y++) { const yc = y + 0.5, xs = [];
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) { const [xi, yi] = q[i], [xj, yj] = q[j]; if ((yi > yc) !== (yj > yc)) xs.push(xi + (yc - yi) / (yj - yi) * (xj - xi)); }
    xs.sort((p, s) => p - s);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(PW - 1, Math.floor(xs[k + 1] - 0.5)); for (let x = xa; x <= xb; x++) { const o = (y * PW + x) * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = Math.max(px[o + 3], a); } } }
}
function punto(px, p, rad, [r, g, b, a]) { const [cx, cy] = aPxM(p); for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
  if (x < 0 || y < 0 || x >= PW || y >= PH || (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > rad * rad) continue; const o = (y * PW + x) * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a; } }
const capa = async (nombre, dibujar) => { const px = new Uint8Array(PW * PH * 4); await dibujar(px); await writeFile(join(OUT, nombre + '.png'), png(px, PW, PH)); };
const leer = async (f) => JSON.parse(await readFile(join(RAIZ, 'data3d', f), 'utf8'));
const conteo = {};
await capa('capa_edificios', async (px) => { const B = await leer('buildings.json'); conteo.edificios = B.length; for (const e of B) relleno(px, e.pts, [255, 255, 255, 255]); });
await capa('capa_parques', async (px) => { const P = await leer('parques.json'); conteo.parques = P.length; for (const e of P) relleno(px, e.pts, [255, 255, 255, 255]); });
await capa('capa_agua', async (px) => { const W = await leer('water_bodies.json'); conteo.agua = W.length; for (const e of W) if (e.pts && e.pts.length > 2) relleno(px, e.pts, [255, 255, 255, 255]); });
await capa('capa_arboles', async (px) => { const T = await leer('trees.json'); conteo.arboles = T.t.length; for (const t of T.t) punto(px, t, 1.2, [255, 255, 255, 255]); });
await capa('capa_colegios_huertas', async (px) => { const C = await leer('colegios.json'); conteo.colegios = C.colegios.length; for (const c of C.colegios) if (c.poly) relleno(px, c.poly, [255, 255, 255, 255]);
  const H = await leer('huertas_barrio.json'); conteo.huertas = H.huertas.length; });

// límite de la localidad de Kennedy (data3d/kennedy.json, OpenStreetMap) -> máscara PNG y contorno CSV (mismo lat/lng -> modelo que data3d/lamina17.js)
{
  const K = await leer('kennedy.json'), MXk = 111320 * Math.cos(4.63 * Math.PI / 180), MYk = 110540;
  const lim = K.limite.map(([g, a]) => [(g + 74.17) * MXk + 5193.24, (a - 4.63) * MYk + 2090.06]);
  await capa('capa_kennedy_mascara', async (px) => relleno(px, lim, [255, 255, 255, 255]));
  const uv = lim.map(p => aUV(p[0] - LC[0], LC[1] - p[1]));
  await writeFile(join(OUT, 'limite_kennedy.csv'), 'u,v\n' + uv.map(([u, v]) => u.toFixed(5) + ',' + v.toFixed(5)).join('\n') + '\n');
  conteo.limite_vertices = lim.length;
}

// ---------- grabación SUMO (RTF1, igual que index.html cargarTrozoTrafico) ----------
const TI = JSON.parse(await readFile(join(RAIZ, 'data3d/traf/index.json'), 'utf8'));
const NS = TI.NS, S = TI.scale, steps = new Array(NS);
for (let k = 0; k < TI.n; k++) {
  const b = await readFile(join(RAIZ, 'data3d/traf/c' + String(k).padStart(2, '0') + '.bin'));
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); if (dv.getUint32(0, true) !== 0x31465452) throw new Error('formato');
  let o = 4; const ns = dv.getUint16(o, true); o += 2; const t0 = Math.round(dv.getFloat32(o, true)); o += 4; let prev = new Map();
  for (let s = 0; s < ns; s++) {
    const n = dv.getUint16(o, true); o += 2; const pid = o, pdx = o + 2 * n, pdy = o + 4 * n; o += 6 * n;
    const m = new Map(), cur = new Map(); let id = 0;
    for (let i = 0; i < n; i++) {
      id += dv.getUint16(pid + 2 * i, true); const p = prev.get(id);
      const xi = p ? p[0] + dv.getInt16(pdx + 2 * i, true) : dv.getUint16(pdx + 2 * i, true), yi = p ? p[1] + dv.getInt16(pdy + 2 * i, true) : dv.getUint16(pdy + 2 * i, true);
      cur.set(id, [xi, yi]); m.set(id, [xi / S - LC[0], LC[1] - yi / S]);
    }
    steps[t0 + s] = m; prev = cur;
  }
}
const sorteo = (id) => (Math.imul(id ^ 0x5bd1e995, 0x85ebca6b) >>> 0) / 4294967296; // misma selección por id que el simulador
const filas = []; let M = 0;
for (let t = 0; t < NS; t++) {
  const a = steps[t], b = steps[(t + 1) % NS], f = [];
  if (a) for (const [id, [x, z]] of a) {
    const [u, v] = aUV(x, z); if (!dentro(u, v)) continue;
    let du = 0, dvv = 0, vel = 0; const q = b && b.get(id);
    if (q) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < 60) { const [u1, v1] = aUV(q[0], q[1]); du = u1 - u; dvv = v1 - v; vel = d; } }
    f.push([u, v, du, dvv, vel, sorteo(id)]);
  }
  filas.push(f); M = Math.max(M, f.length);
}
// ---------- FLUJO DE CARROS y RUIDO (mismo modelo que data3d/capas_escenario.js RM.refrescar / RM.flujo) ----------
// Rejilla de 16 m sobre la red vial (clase por tipo de vía), conteo de TODOS los vehículos de todos los segundos de la grabación SUMO
// (un camión = 4 carros para el ruido, mismo sorteo por id que el simulador), suavizado 3×3, mediana por clase.
// Ruido de HOY [SUP del simulador]: L = referencia por clase (local 60, intermedia 68, principal 74 dB) + 10·log10(flujo / mediana de su clase), limitado a −8/+5 dB.
// Bandas del simulador: < 55 amarillo claro, 55–65 amarillo, 65–70 naranja, > 70 rojo. (El ruido «con la propuesta» depende de los controles del simulador: pendiente.)
{
  const CEL = 16, CL = { major: 3, mid: 2, local: 1 }, E = NET.edges.map(([t, p]) => [CL[t], p.map(q => [q[0] - LC[0], LC[1] - q[1]])]);
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [, P] of E) for (const [x, z] of P) { a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, z); d = Math.max(d, z); }
  const x0 = a - CEL, z0 = b - CEL, nx = Math.ceil((c - a) / CEL) + 3, nz = Math.ceil((d - b) / CEL) + 3, via = new Uint8Array(nx * nz);
  for (const [cl, P] of E) for (let k = 1; k < P.length; k++) { const A = P[k - 1], B = P[k], n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / (CEL * 0.7)));
    for (let q = 0; q <= n; q++) { const x = A[0] + (B[0] - A[0]) * q / n, z = A[1] + (B[1] - A[1]) * q / n, i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); if (i >= 0 && j >= 0 && i < nx && j < nz && cl > via[j * nx + i]) via[j * nx + i] = cl; } }
  const cntR = new Float32Array(nx * nz), cntV = new Float32Array(nx * nz);
  for (let t = 0; t < NS; t++) { const s = steps[t]; if (!s) continue; for (const [id, [x, z]] of s) { const i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
    cntR[j * nx + i] += (((id * 2654435761) >>> 0) / 4294967296 >= 0.92) ? 4 : 1; cntV[j * nx + i] += 1; } }
  const caja = (A, r) => { const t = new Float32Array(A.length), o = new Float32Array(A.length), w = 1 / (2 * r + 1);
    for (let j = 0; j < nz; j++) { let s = 0; const bb = j * nx; for (let i = 0; i <= Math.min(r, nx - 1); i++) s += A[bb + i]; for (let i = 0; i < nx; i++) { t[bb + i] = s * w; const ad = i + r + 1, su = i - r; if (ad < nx) s += A[bb + ad]; if (su >= 0) s -= A[bb + su]; } }
    for (let i = 0; i < nx; i++) { let s = 0; for (let j = 0; j <= Math.min(r, nz - 1); j++) s += t[j * nx + i]; for (let j = 0; j < nz; j++) { o[j * nx + i] = s * w; const ad = j + r + 1, su = j - r; if (ad < nz) s += t[ad * nx + i]; if (su >= 0) s -= t[su * nx + i]; } }
    return o; };
  const smR = caja(cntR, 1), smV = caja(cntV, 1), LREF = [0, 60, 68, 74], por = [[], [], [], []];
  for (let k = 0; k < via.length; k++) if (via[k] && smR[k] > 0) por[via[k]].push(smR[k]);
  const med = por.map(A => { if (!A.length) return 1; A.sort((p, q) => p - q); return A[A.length >> 1]; });
  const BANDA_C = [[255, 247, 179], [255, 214, 70], [245, 124, 0], [211, 47, 47]];
  const pxR = new Uint8Array(PW * PH * 4), pxF = new Uint8Array(PW * PH * 4), est = { celdas: 0, banda: [0, 0, 0, 0], media_db: 0 };
  const vs = []; for (let k = 0; k < via.length; k++) if (via[k] && smV[k] > 0) vs.push(smV[k] / NS); vs.sort((p, q) => p - q); const q95 = vs[Math.floor(vs.length * 0.95)] || 1;
  const kpx = PW / R.ancho_m; // píxeles por metro
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, cl = via[k]; if (!cl) continue;
    const L = LREF[cl] + (smR[k] > 0 ? Math.max(-8, Math.min(5, 10 * Math.log10(smR[k] / med[cl]))) : -8), bnd = L < 55 ? 0 : L < 65 ? 1 : L < 70 ? 2 : 3;
    est.celdas++; est.banda[bnd]++; est.media_db += L;
    const xc = x0 + (i + 0.5) * CEL, zc = z0 + (j + 0.5) * CEL, [u, v] = aUV(xc, zc), cx = u * PW, cy = v * PH, hf = CEL / 2 * kpx;
    const fv = Math.min(1, smV[k] / NS / q95), fcol = [Math.round(40 + 140 * fv), Math.round(110 + 135 * fv), 255];
    for (let y = Math.floor(cy - hf); y <= Math.ceil(cy + hf); y++) for (let x = Math.floor(cx - hf); x <= Math.ceil(cx + hf); x++) { if (x < 0 || y < 0 || x >= PW || y >= PH) continue; const o = (y * PW + x) * 4;
      pxR[o] = BANDA_C[bnd][0]; pxR[o + 1] = BANDA_C[bnd][1]; pxR[o + 2] = BANDA_C[bnd][2]; pxR[o + 3] = 255;
      if (smV[k] > 0) { pxF[o] = fcol[0]; pxF[o + 1] = fcol[1]; pxF[o + 2] = fcol[2]; pxF[o + 3] = Math.round(60 + 195 * fv); } } }
  est.media_db = +(est.media_db / est.celdas).toFixed(1); est.banda = est.banda.map(n => +(n / est.celdas * 100).toFixed(1));
  await writeFile(join(OUT, 'capa_ruido_hoy.png'), png(pxR, PW, PH)); await writeFile(join(OUT, 'capa_flujo_carros.png'), png(pxF, PW, PH));
  conteo.ruido_hoy = { ...est, nota: 'celdas de 16 m sobre vías; banda % de celdas <55, 55–65, 65–70, >70 dB; media de las celdas (mismo cálculo del simulador)' };
  conteo.flujo = { q95_veh_por_celda: +q95.toFixed(3), nota: 'intensidad = vehículos presentes en promedio en la celda de 16 m durante la grabación (hora pico), escalada al percentil 95' };
}

// ---------- SINTAXIS ESPACIAL (precalculada: data3d/bavaria_sx.json, análisis angular reimplementado en tools/bavaria_pres_datos.py) ----------
// a = antes (hoy), b = después (con los pasajes de Bavaria); [NAIN n (integración global), NAIN 800 m, NACH (elección)]. n = 1 pasaje nuevo.
// Color: espectro clásico de sintaxis (azul bajo → rojo alto), MISMA escala para hoy y propuesta (percentiles 2–98 de «hoy»).
{
  const SX = await leer('bavaria_sx.json'), pal = [[30, 60, 200], [40, 170, 230], [60, 210, 120], [240, 220, 60], [245, 130, 30], [220, 40, 40]];
  const col = (f) => { f = Math.max(0, Math.min(0.9999, f)) * (pal.length - 1); const a = Math.floor(f), t = f - a; return pal[a].map((c, i) => Math.round(c + (pal[a + 1][i] - c) * t)); };
  const rango = (k) => { const v = SX.seg.filter(s => s.a).map(s => s.a[k]).sort((p, q) => p - q); return [v[Math.floor(v.length * 0.02)], v[Math.floor(v.length * 0.98)]]; };
  const linea = (px, P, rgb, ancho) => { for (let k = 1; k < P.length; k++) { const A = aPxM(P[k - 1]), B = aPxM(P[k]), n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])));
    for (let q = 0; q <= n; q++) { const cx = A[0] + (B[0] - A[0]) * q / n, cy = A[1] + (B[1] - A[1]) * q / n;
      for (let y = Math.floor(cy - ancho); y <= Math.ceil(cy + ancho); y++) for (let x = Math.floor(cx - ancho); x <= Math.ceil(cx + ancho); x++) { if (x < 0 || y < 0 || x >= PW || y >= PH || (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 > ancho * ancho) continue;
        const o = (y * PW + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = 255; } } } };
  const sx = {};
  for (const [k, nombre] of [[0, 'integracion'], [2, 'eleccion']]) { const [lo, hi] = rango(k); sx[nombre] = { p2: lo, p98: hi };
    for (const [lado, cual] of [['a', 'hoy'], ['b', 'propuesta']]) { const px = new Uint8Array(PW * PH * 4);
      const orden = SX.seg.filter(s => s[lado] && (cual === 'propuesta' || !s.n)).sort((s, t) => s[lado][k] - t[lado][k]); // los altos encima
      for (const s of orden) linea(px, s.p, col((s[lado][k] - lo) / (hi - lo)), s.n ? 1.6 : 1.0);
      await writeFile(join(OUT, `capa_sintaxis_${nombre}_${cual}.png`), png(px, PW, PH)); } }
  conteo.sintaxis = { segmentos: SX.seg.length, pasajes_nuevos: SX.seg.filter(s => s.n).length, ...sx, nota: 'NAIN n (integración) y NACH (elección), hoy (a) vs con la propuesta (b); misma escala de color' };
}

// float32 -> float16
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
const h = (x) => { f32[0] = x; const b = u32[0], s = (b >>> 16) & 0x8000; let e = ((b >>> 23) & 0xff) - 127 + 15, m = b & 0x7fffff;
  if (e <= 0) return s; if (e >= 31) return s | 0x7c00; return s | (e << 10) | (m >>> 13); };
const datos = new Uint16Array(NS * M * 6), vacio = h(-1);
for (let t = 0; t < NS; t++) for (let i = 0; i < M; i++) { const r = filas[t][i], o = (t * M + i) * 6; for (let c = 0; c < 6; c++) datos[o + c] = r ? h(r[c]) : (c < 2 ? vacio : 0); }
let cab = `{'descr': '<f2', 'fortran_order': False, 'shape': (${NS}, ${M}, 6), }`; const pad = 64 - ((10 + cab.length + 1) % 64); cab += ' '.repeat(pad) + '\n';
const hdr = Buffer.alloc(10); hdr.write('\x93NUMPY', 0, 'latin1'); hdr[6] = 1; hdr[7] = 0; hdr.writeUInt16LE(cab.length, 8);
await writeFile(join(OUT, 'vehiculos.npy'), Buffer.concat([hdr, Buffer.from(cab, 'latin1'), Buffer.from(datos.buffer)]));
await writeFile(join(OUT, 'meta.json'), JSON.stringify({ NS, M, dur: TI.dur, tramos: tramos.length, encuadre: R, maqueta_mm: [mmW, mmH], escala: cfg.maqueta.escala,
  capas_png: { ancho: PW, alto: PH, conteo, nota: 'máscaras blancas con alfa; el color lo pone TouchDesigner. Fuentes: data3d/buildings.json, parques.json, water_bodies.json, trees.json, colegios.json' },
  reloj: { T0_RELOJ: 6 * 3600 + 30 * 60, T0_GRAB: 1000, nota: 'segundo de la grabación = (1000 + (hora_del_día − 06:30)) mod (dur+1), igual que el simulador' },
  demanda_h: [0.06, 0.04, 0.03, 0.03, 0.08, 0.32, 0.78, 0.95, 0.82, 0.62, 0.58, 0.62, 0.72, 0.7, 0.62, 0.66, 0.82, 1.0, 0.97, 0.78, 0.52, 0.36, 0.22, 0.12],
  origen: 'data3d/traf (grabación SUMO, reproducida), data3d/net.json (red vial), instalacion/config.json (encuadre)' }, null, 2));
console.log(`tramos ${tramos.length} · NS ${NS} · M ${M} · ${(datos.byteLength / 1e6).toFixed(1)} MB`);
