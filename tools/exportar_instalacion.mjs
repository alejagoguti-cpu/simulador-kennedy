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
