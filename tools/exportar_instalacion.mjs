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
  reloj: { T0_RELOJ: 6 * 3600 + 30 * 60, T0_GRAB: 1000, nota: 'segundo de la grabación = (1000 + (hora_del_día − 06:30)) mod (dur+1), igual que el simulador' },
  demanda_h: [0.06, 0.04, 0.03, 0.03, 0.08, 0.32, 0.78, 0.95, 0.82, 0.62, 0.58, 0.62, 0.72, 0.7, 0.62, 0.66, 0.82, 1.0, 0.97, 0.78, 0.52, 0.36, 0.22, 0.12],
  origen: 'data3d/traf (grabación SUMO, reproducida), data3d/net.json (red vial), instalacion/config.json (encuadre)' }, null, 2));
console.log(`tramos ${tramos.length} · NS ${NS} · M ${M} · ${(datos.byteLength / 1e6).toFixed(1)} MB`);
