/* ============ METRO DE BOGOTA · LINEA 1 A SU PASO POR KENNEDY (proyecto real, se ve en todos los escenarios) ============
   TRAZADO: eje real de la Linea 1 en OpenStreetMap (way 1015822270 "Linea 1", railway=construction, bridge=viaduct, capa 2), descargado con
   Overpass el 2026-11-22 y recortado a la maqueta (de la Av. Villavicencio, entra por el oeste, hasta pasar la Av. Boyacá). Coordenadas ya en el
   marco MODELO (x = (lng+74,17)*110957+5193,24; y = (lat-4,63)*110540+2090,06); T3.lw las pasa al mundo. Se suaviza (Chaikin) y se remuestrea cada 3 m.
   ESTACIONES (nombres y direcciones oficiales, bogota.gov.co): 2 Portal Americas (Av. Carrera 86 con el eje), 3 Ciudad Kennedy (Av. Villavicencio con
   Cra 80), 4 Timiza (Av. Primero de Mayo con Calle 42 Sur), 5 Hospital de Kennedy, 6 Avenida Boyaca (Av. Carrera 72). Posicion de 3, 4 y 6 sale de
   las direcciones oficiales sobre el eje; la 5 va a media distancia entre 4 y 6 [SUP]; 2 por la Av. Carrera 86 [SUP].
   OBRA: avance 77,5 % en abril de 2026 (bogota.gov.co/en/node/297691) y 83,73 % a septiembre de 2026; el viaducto ya esta levantado, las estaciones
   se terminan [SUP: aparecen con cubierta y edificio de acceso desde el ano 2027]. OPERACION COMERCIAL: marzo de 2028 (bogota.gov.co/mi-ciudad/movilidad/
   alcalde-galan-pone-en-marcha-las-pruebas-del-metro-de-bogota; el cronograma cita el 14/15 de marzo de 2028, sin dia confirmado: se usa el 15 de
   marzo de 2028 [SUP]). Ano del modelo: ano 1 = 2026 (2026 + floor(sem/52)), operacion desde la semana 114.
   MEDIDAS [SUP, de proyecto tipico de viaducto de doble via]: riel a 11 m del piso, viga cajon de 2,2 m, ancho 9,8 m, pilas de 1,7 x 2,2 m en el separador cada
   32-38 m (25 m en estaciones), estaciones de 150 m con andenes laterales, trenes de 6 coches (145 m), 40 km/h comerciales, paradas de 30 s,
   frecuencia 3,5 min en hora pico y 7 min fuera de pico; sin servicio de 23:00 a 05:00.
   ANIMACION: reloj universal (RELOJ.tAnim para el movimiento, RELOJ.t para la hora del dia y RELOJ.sem para el ano). Todo determinista (sin azar). */
import { RELOJ } from './reloj.js?v=5';

const PTS = [[4080.9,3792.0],[4126.9,3705.4],[4300.4,3379.6],[4419.8,3155.4],[4475.3,3051.2],[4615.5,2787.2],[4646.1,2730.6],[4951.5,2158.8],[5022.7,2026.0],[5037.6,1998.1],[5078.4,1921.8],[5102.2,1888.7],[5129.3,1858.4],[5171.7,1815.9],[5193.1,1791.3],[5210.7,1765.3],[5222.2,1744.9],[5230.5,1725.5],[5232.5,1719.0],[5241.5,1689.3],[5258.1,1646.5],[5284.3,1585.5],[5296.2,1557.1],[5302.5,1543.8],[5314.2,1526.8],[5329.0,1512.7],[5351.4,1496.6],[5406.2,1454.1],[5429.5,1436.6],[5444.7,1420.5],[5594.3,1169.5],[5599.1,1161.4],[5659.5,1060.2],[5838.1,754.7],[5858.5,720.5],[5945.0,574.9],[5953.7,562.5],[5962.1,553.8],[5970.4,545.4],[5981.9,534.9],[5998.1,522.6],[6010.3,515.6],[6019.7,510.6],[6032.2,504.5],[6049.3,498.5],[6064.5,494.5],[6080.5,491.9],[6093.4,490.6],[6109.5,490.0],[6126.3,491.2],[6145.5,493.7],[6182.6,500.2],[6322.6,524.5],[6440.3,545.4],[6505.9,557.1],[7041.8,652.4],[7136.2,669.4],[7157.1,673.2],[7296.4,696.7],[7447.5,723.2],[7542.7,741.8],[7758.9,798.3],[7843.6,823.5],[8095.5,890.3],[8119.3,896.0],[8138.8,899.8],[8162.1,902.1],[8187.3,901.2],[8231.5,896.0],[8253.4,892.7],[8311.9,871.4],[8618.6,748.2],[8650.8,734.1],[8679.9,718.5],[8694.3,707.7],[8712.3,694.4],[8739.9,667.4],[8877.2,504.7],[9147.0,184.9],[9166.0,165.5],[9179.4,153.7],[9202.2,133.8],[9226.2,114.8],[9255.6,95.5],[9449.4,-18.0]];
const SEM_OBRA_ACAB = 52, SEM_OP = 114, DIA = 86400;       // estaciones terminadas (2027) y operacion (15 mar 2028)
const RIEL = 11.0, ALTO_VIGA = 2.2, ANDEN = 1.05;            // altura del riel sobre el piso, canto de la viga, anden sobre el riel
const EST = [ // s (m sobre el eje recortado) se calcula en el codigo desde `ref`; lado del edificio de acceso: +1 sur, -1 norte
  { n: 2, nombre: 'PORTAL AMÉRICAS', ref: ['car', 5105, 1897], lado: 1 },
  { n: 3, nombre: 'CIUDAD KENNEDY', ref: ['car', 5647, 1097], lado: -1 },
  { n: 4, nombre: 'TIMIZA', ref: ['car', 6325, 518], lado: 1 },
  { n: 5, nombre: 'HOSPITAL DE KENNEDY', ref: ['frac', 0.5, 4, 6], lado: -1 },
  { n: 6, nombre: 'AVENIDA BOYACÁ', ref: ['car', 8573, 733], lado: 1 },
];

export async function iniciarMetro({ T3 }) {
  const THREE = T3.THREE, G = T3.sueloY != null ? T3.sueloY : 0.3, Y0 = G + RIEL;
  const hash = (i) => { let x = Math.imul(i + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return ((x ^ (x >>> 13)) >>> 0) / 4294967296; };

  /* ---------- eje: modelo -> mundo, Chaikin, remuestreo cada DS m ---------- */
  let P = PTS.map(([x, y]) => T3.lw(x, y));
  for (let it = 0; it < 2; it++) { const Q = [P[0]]; for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1]; Q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } Q.push(P[P.length - 1]); P = Q; }
  const acum = [0]; for (let i = 1; i < P.length; i++) acum.push(acum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const DS = 3, N = Math.floor(acum[acum.length - 1] / DS) + 1, LT = (N - 1) * DS;
  const X = new Float64Array(N), Z = new Float64Array(N);
  for (let i = 0, k = 0; i < N; i++) { const s = i * DS; while (k < acum.length - 2 && acum[k + 1] < s) k++; const f = (s - acum[k]) / Math.max(1e-9, acum[k + 1] - acum[k]); X[i] = P[k][0] + (P[k + 1][0] - P[k][0]) * f; Z[i] = P[k][1] + (P[k + 1][1] - P[k][1]) * f; }
  const TX = new Float64Array(N), TZ = new Float64Array(N);
  for (let i = 0; i < N; i++) { const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2), dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1; TX[i] = dx / l; TZ[i] = dz / l; }
  const muestra = (s) => { s = Math.max(0, Math.min(LT, s)); const i = Math.min(N - 2, Math.floor(s / DS)), f = s / DS - i; let tx = TX[i] + (TX[i + 1] - TX[i]) * f, tz = TZ[i] + (TZ[i + 1] - TZ[i]) * f; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; return { x: X[i] + (X[i + 1] - X[i]) * f, z: Z[i] + (Z[i + 1] - Z[i]) * f, tx, tz }; };
  const sDe = (x, y) => { const w = T3.lw(x, y); let b = 1e18, bs = 0; for (let i = 0; i < N; i++) { const d = (X[i] - w[0]) ** 2 + (Z[i] - w[1]) ** 2; if (d < b) { b = d; bs = i * DS; } } return bs; };
  EST.forEach((e) => { if (e.ref[0] === 'car') e.s = sDe(e.ref[1], e.ref[2]); });
  EST.forEach((e) => { if (e.ref[0] === 'frac') { const a = EST.find(q => q.n === e.ref[2]).s, b = EST.find(q => q.n === e.ref[3]).s; e.s = a + (b - a) * e.ref[1]; } });
  EST.sort((a, b) => a.s - b.s);
  const LEST = 150, FL = 14, MED = LEST / 2 + FL; // anden de 150 m y 14 m de ensanche a cada lado

  /* ---------- constructor de geometria fundida ---------- */
  const nuevo = () => ({ p: [], n: [], u: [], c: [], i: [] });
  const empuja = (b, V, N3, UV, col) => { const o = b.p.length / 3; for (let k = 0; k < 4; k++) { b.p.push(V[k][0], V[k][1], V[k][2]); b.n.push(N3[k][0], N3[k][1], N3[k][2]); b.u.push(UV[k][0], UV[k][1]); b.c.push(col[0], col[1], col[2]); } b.i.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  const BL = [1, 1, 1];
  const cuadro = (b, A, Bv, C, D, ref, col = BL, uv = 6) => { // cara plana con normal hacia afuera de `ref`
    const ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (nx * (A[0] - ref[0]) + ny * (A[1] - ref[1]) + nz * (A[2] - ref[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; [Bv, D] = [D, Bv]; }
    const w = Math.hypot(Bv[0] - A[0], Bv[1] - A[1], Bv[2] - A[2]) / uv, h = Math.hypot(D[0] - A[0], D[1] - A[1], D[2] - A[2]) / uv, nn = [nx, ny, nz];
    empuja(b, [A, Bv, C, D], [nn, nn, nn, nn], [[0, 0], [w, 0], [w, h], [0, h]], col);
  };
  const CARAS = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
  const hexa = (b, V, cols) => { const r = [0, 0, 0]; V.forEach(v => { r[0] += v[0] / 8; r[1] += v[1] / 8; r[2] += v[2] / 8; }); CARAS.forEach((f, k) => cuadro(b, V[f[0]], V[f[1]], V[f[2]], V[f[3]], r, cols ? cols[k] || BL : BL)); };
  // caja orientada: centro, medidas (a lo largo, alto, a lo ancho), giro sobre Y (th)
  const caja = (b, cx, cy, cz, sx, sy, sz, th = 0, col) => {
    const c = Math.cos(th), s = Math.sin(th), V = [];
    for (const [lx, ly, lz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) { const x = lx * sx / 2, z = lz * sz / 2; V.push([cx + x * c + z * s, cy + ly * sy / 2, cz - x * s + z * c]); }
    hexa(b, V, col ? [col, col, col, col, col, col] : null);
  };
  // caja en el marco del eje: s (a lo largo), u (a lo ancho, + = lado n), y absoluto
  const cajaL = (b, s, u, y, ss, sy, su, col) => { const m = muestra(s), nx = -m.tz, nz = m.tx; caja(b, m.x + nx * u, y, m.z + nz * u, ss, sy, su, Math.atan2(-m.tz, m.tx), col); };
  // extrusion de un perfil cerrado u abierto (horario: u a la derecha, v arriba) a lo largo del eje; perfil = array o f(t) -> array
  const extruir = (b, perfil, sA, sB, y0, { paso = 6, caps = true, uv = 6, liso = false } = {}) => {
    if (sB - sA < 0.5) return;
    const ss = []; for (let s = sA; s < sB - 0.01; s += paso) ss.push(s); ss.push(sB);
    const marco = (s, t) => { const m = muestra(s), nx = -m.tz, nz = m.tx, R = typeof perfil === 'function' ? perfil(t) : perfil; return { m, nx, nz, R }; };
    const pt = (F, k) => [F.m.x + F.nx * F.R[k][0], y0 + F.R[k][1], F.m.z + F.nz * F.R[k][0]];
    const nor2 = (R, k) => { const a = R[k], c = R[(k + 1) % R.length], du = c[0] - a[0], dv = c[1] - a[1], l = Math.hypot(du, dv) || 1; return [-dv / l, du / l]; };
    const n3 = (F, n2) => { const v = [F.nx * n2[0], n2[1], F.nz * n2[0]]; return v; };
    let per = [0]; const R0 = marco(sA, 0).R; for (let k = 1; k <= R0.length; k++) per.push(per[k - 1] + Math.hypot(R0[k % R0.length][0] - R0[k - 1][0], R0[k % R0.length][1] - R0[k - 1][1]));
    const cerrado = true, ne = R0.length;
    for (let i = 0; i < ss.length - 1; i++) {
      const F0 = marco(ss[i], (ss[i] - sA) / (sB - sA)), F1 = marco(ss[i + 1], (ss[i + 1] - sA) / (sB - sA));
      for (let k = 0; k < ne; k++) {
        const k1 = (k + 1) % ne; if (!cerrado && k === ne - 1) break;
        const A = pt(F0, k), Bq = pt(F0, k1), C = pt(F1, k1), D = pt(F1, k);
        let nA, nB; const e0 = nor2(F0.R, k);
        if (liso) { const pr = nor2(F0.R, (k + ne - 1) % ne), nx = e0[0] + pr[0], ny = e0[1] + pr[1], l = Math.hypot(nx, ny) || 1; nA = [nx / l, ny / l]; const sg = nor2(F0.R, k1), mx = e0[0] + sg[0], my = e0[1] + sg[1], l2 = Math.hypot(mx, my) || 1; nB = [mx / l2, my / l2]; } else { nA = nB = e0; }
        const NA = n3(F0, nA), NB = n3(F0, nB);
        // orientacion: la normal geometrica debe coincidir con la de perfil
        const g = [(Bq[1] - A[1]) * (D[2] - A[2]) - (Bq[2] - A[2]) * (D[1] - A[1]), (Bq[2] - A[2]) * (D[0] - A[0]) - (Bq[0] - A[0]) * (D[2] - A[2]), (Bq[0] - A[0]) * (D[1] - A[1]) - (Bq[1] - A[1]) * (D[0] - A[0])];
        const sgn = g[0] * NA[0] + g[1] * NA[1] + g[2] * NA[2], o = b.p.length / 3;
        const V = [A, Bq, C, D], NN = [NA, NB, NB, NA], UVv = [[per[k] / uv, ss[i] / uv], [per[k + 1] / uv, ss[i] / uv], [per[k + 1] / uv, ss[i + 1] / uv], [per[k] / uv, ss[i + 1] / uv]];
        for (let q = 0; q < 4; q++) { b.p.push(V[q][0], V[q][1], V[q][2]); b.n.push(NN[q][0], NN[q][1], NN[q][2]); b.u.push(UVv[q][0], UVv[q][1]); b.c.push(1, 1, 1); }
        if (sgn >= 0) b.i.push(o, o + 1, o + 2, o, o + 2, o + 3); else b.i.push(o, o + 2, o + 1, o, o + 3, o + 2);
      }
    }
    if (caps) for (const [idx, dir] of [[0, -1], [ss.length - 1, 1]]) { // tapas: abanico desde el centro del perfil
      const F = marco(ss[idx], idx ? 1 : 0), R = F.R; let cu = 0, cv = 0; R.forEach(r => { cu += r[0] / R.length; cv += r[1] / R.length; });
      const C = [F.m.x + F.nx * cu, y0 + cv, F.m.z + F.nz * cu], Nn = [F.m.tx * dir, 0, F.m.tz * dir];
      for (let k = 0; k < R.length; k++) { const A = pt(F, k), Bq = pt(F, (k + 1) % R.length), o = b.p.length / 3; [C, A, Bq].forEach(v => { b.p.push(v[0], v[1], v[2]); b.n.push(Nn[0], Nn[1], Nn[2]); b.u.push(0, 0); b.c.push(1, 1, 1); });
        const g = [(A[1] - C[1]) * (Bq[2] - C[2]) - (A[2] - C[2]) * (Bq[1] - C[1]), (A[2] - C[2]) * (Bq[0] - C[0]) - (A[0] - C[0]) * (Bq[2] - C[2]), (A[0] - C[0]) * (Bq[1] - C[1]) - (A[1] - C[1]) * (Bq[0] - C[0])];
        if (g[0] * Nn[0] + g[1] * Nn[1] + g[2] * Nn[2] >= 0) b.i.push(o, o + 1, o + 2); else b.i.push(o, o + 2, o + 1); }
    }
  };
  const aGeo = (b) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setIndex(b.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.i, 1) : new THREE.Uint16BufferAttribute(b.i, 1)); g.computeBoundingSphere(); return g; };

  /* ---------- texturas (canvas, deterministas) ---------- */
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const texConcreto = () => { const c = canvas(256, 256), g = c.getContext('2d'); g.fillStyle = '#b8b6af'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const v = 150 + Math.floor(hash(i * 3) * 80); g.fillStyle = `rgba(${v},${v - 2},${v - 8},${0.12 + hash(i * 3 + 1) * 0.2})`; g.fillRect(hash(i * 3 + 2) * 256, hash(i * 7 + 5) * 256, 1 + hash(i) * 2, 1 + hash(i + 9) * 2); }
    for (let i = 0; i < 26; i++) { const x = hash(i + 400) * 256, w = 6 + hash(i + 500) * 22; const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(60,56,48,0)'); gr.addColorStop(0.5, `rgba(60,56,48,${0.03 + hash(i + 600) * 0.05})`); gr.addColorStop(1, 'rgba(60,56,48,0)'); g.fillStyle = gr; g.fillRect(x, 0, w, 256); } // chorreados
    g.strokeStyle = 'rgba(70,66,58,0.45)'; g.lineWidth = 1.2; [0, 128].forEach(y => { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(256, y + 0.5); g.stroke(); }); [0, 128].forEach(x => { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 256); g.stroke(); }); // juntas de formaleta
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const texVia = () => { const c = canvas(256, 128), g = c.getContext('2d'); g.fillStyle = '#3b3f44'; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 1400; i++) { const v = 55 + Math.floor(hash(i) * 30); g.fillStyle = `rgb(${v},${v + 1},${v + 4})`; g.fillRect(hash(i + 3) * 256, hash(i + 7) * 128, 2, 2); }
    g.fillStyle = '#4a4d52'; for (let k = 0; k < 8; k++) g.fillRect(0, k * 16 + 6, 256, 3); // durmientes de placa
    g.fillStyle = '#9aa0a6'; for (const u of [-2.1 - 0.72, -2.1 + 0.72, 2.1 - 0.72, 2.1 + 0.72]) { const x = (u + 3.6) / 7.2 * 256; g.fillRect(x - 2, 0, 4, 128); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const texConc = texConcreto();
  const mConc = new THREE.MeshStandardMaterial({ color: 0xdfe5ea, map: texConc, roughness: 0.93, metalness: 0 });
  const mEdif = new THREE.MeshStandardMaterial({ color: 0xf1f4f6, map: texConc, roughness: 0.88, metalness: 0 });
  const mAcero = new THREE.MeshStandardMaterial({ color: 0xe2e6e9, roughness: 0.55, metalness: 0.08, side: THREE.DoubleSide });
  const mOscuro = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.3 });
  const mRojo = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.55, metalness: 0.05 });
  const mAmar = new THREE.MeshStandardMaterial({ color: 0xe8c21a, roughness: 0.7 });
  const mAnden = new THREE.MeshStandardMaterial({ color: 0x9d9f9f, roughness: 0.85 });
  const mVidrio = new THREE.MeshStandardMaterial({ color: 0xa9c7d6, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const mFach = new THREE.MeshStandardMaterial({ color: 0x8fb4c8, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.55, emissive: 0x24384a, side: THREE.DoubleSide, depthWrite: false });
  const mLuz = new THREE.MeshBasicMaterial({ color: 0xfff4d6, toneMapped: false });

  /* ---------- viaducto y estaciones ---------- */
  const bC = nuevo(), bA = nuevo(), bAc = nuevo(), bV = nuevo(), bF = nuevo(), bR = nuevo(), bY = nuevo(), bAn = nuevo(), bE = nuevo(), bLz = nuevo(), bOs = nuevo();
  const ANI = ALTO_VIGA, VIG = [[-4.9, 0], [4.9, 0], [4.9, -0.5], [2.6, -ANI], [-2.6, -ANI], [-4.9, -0.5]];
  const VIG_E = [[-9, 0], [9, 0], [9, -0.9], [5.5, -ANI], [-5.5, -ANI], [-9, -0.9]];
  const PAR_L = [[-4.9, 0], [-4.9, 1.05], [-4.55, 1.05], [-4.55, 0]], PAR_R = [[4.55, 0], [4.55, 1.05], [4.9, 1.05], [4.9, 0]];
  const PAR_LE = [[-8.9, 0], [-8.9, 2.1], [-8.55, 2.1], [-8.55, 0]], PAR_RE = [[8.55, 0], [8.55, 2.1], [8.9, 2.1], [8.9, 0]];
  const hor = (A, sg) => (sg < 0 ? A.slice().reverse() : A); // perfil siempre horario (u a la derecha, v arriba)
  const lerpP = (A, B, t) => A.map((a, k) => [a[0] + (B[k][0] - a[0]) * t, a[1] + (B[k][1] - a[1]) * t]);
  const zonas = EST.map(e => ({ a: Math.max(0, e.s - MED), b: Math.min(LT, e.s + MED), e }));
  // tramos corrientes entre estaciones
  { let s0 = 0; const cortes = []; zonas.forEach(z => { cortes.push([s0, z.a]); s0 = z.b; }); cortes.push([s0, LT]);
    cortes.forEach(([a, b]) => { extruir(bC, VIG, a, b, Y0); extruir(bC, PAR_L, a, b, Y0, { caps: true }); extruir(bC, PAR_R, a, b, Y0, { caps: true }); }); }
  // estaciones: ensanche, losa de 18 m, parapetos altos, andenes, borde amarillo, mamparas, cubierta curva, columnas, luces, edificio de acceso y pasarela
  const etiquetas = [];
  zonas.forEach(({ a, b, e }) => {
    const fa = a + FL, fb = b - FL;
    extruir(bC, (t) => lerpP(VIG, VIG_E, t), a, fa, Y0, { paso: 3.5 }); extruir(bC, VIG_E, fa, fb, Y0); extruir(bC, (t) => lerpP(VIG_E, VIG, t), fb, b, Y0, { paso: 3.5 });
    extruir(bC, (t) => lerpP(PAR_L, PAR_LE, t), a, fa, Y0, { paso: 3.5 }); extruir(bC, PAR_LE, fa, fb, Y0); extruir(bC, (t) => lerpP(PAR_LE, PAR_L, t), fb, b, Y0, { paso: 3.5 });
    extruir(bC, (t) => lerpP(PAR_R, PAR_RE, t), a, fa, Y0, { paso: 3.5 }); extruir(bC, PAR_RE, fa, fb, Y0); extruir(bC, (t) => lerpP(PAR_RE, PAR_R, t), fb, b, Y0, { paso: 3.5 });
    const sc = e.s, lo = fa, L = fb - fa;
    for (const sg of [-1, 1]) {
      extruir(bAn, hor([[sg * 3.7, 0], [sg * 3.7, ANDEN], [sg * 8.55, ANDEN], [sg * 8.55, 0]], sg), lo, fb, Y0, { caps: true, paso: 6 }); // anden (perfil horario segun el lado)
      extruir(bY, hor([[sg * 3.9, ANDEN], [sg * 3.9, ANDEN + 0.03], [sg * 4.4, ANDEN + 0.03], [sg * 4.4, ANDEN]], sg), lo, fb, Y0, { caps: false, paso: 6 }); // franja amarilla de seguridad
      cajaL(bV, sc, sg * 3.85, Y0 + ANDEN + 1.05, L, 2.1, 0.05); // mampara de vidrio
      for (let s = lo + 3; s <= fb - 2; s += 6.25) cajaL(bA, s, sg * 3.85, Y0 + ANDEN + 1.05, 0.12, 2.1, 0.14); // marcos de la mampara
      for (let s = lo + 4; s <= fb - 3; s += 12.5) cajaL(bA, s, sg * 8.1, Y0 + ANDEN + 2.7, 0.38, 5.4, 0.38); // columnas de la cubierta
    }
    // cubierta curva (arco de 20,8 m de ancho, 0,4 m de espesor)
    const arco = []; const U = 10.4, H0 = 4.9 + ANDEN, HC = 2.3, esp = 0.4;
    for (let k = 0; k <= 10; k++) { const u = -U + (2 * U) * k / 10; arco.push([u, H0 + HC * (1 - (u / U) ** 2)]); }
    const anillo = arco.concat(arco.slice().reverse().map(([u, v]) => [u, v - esp]));
    extruir(bA, anillo, lo, fb, Y0, { caps: false, paso: 6, liso: false });
    for (const sg of [-1, 1]) extruir(bR, [[sg * U - 0.18, H0 - esp - 0.05], [sg * U - 0.18, H0 + 0.1], [sg * U + 0.18, H0 + 0.1], [sg * U + 0.18, H0 - esp - 0.05]].map(p => p), lo, fb, Y0, { caps: false, paso: 6 });
    extruir(bLz, [[-0.15, H0 + HC - esp - 0.08], [-0.15, H0 + HC - esp - 0.02], [0.15, H0 + HC - esp - 0.02], [0.15, H0 + HC - esp - 0.08]], lo, fb, Y0, { caps: false, paso: 6 }); // tira de luz bajo la cubierta
    // edificio de acceso lateral + pasarela
    const sd = e.lado, ub = sd * 25.5, yb = G + (RIEL + ANDEN) / 2;
    cajaL(bE, sc, ub, yb, 40, RIEL + ANDEN, 14);
    cajaL(bF, sc, ub, G + 5.0, 36, 7.4, 14.12);
    cajaL(bF, sc, ub, G + 1.0, 36, 1.7, 14.12);
    cajaL(bR, sc, ub, G + RIEL + ANDEN + 0.16, 40.4, 0.32, 14.4);
    cajaL(bE, sc, sd * 12.9, Y0 + ANDEN + 1.6, 3.6, 3.2, 9.6);
    cajaL(bF, sc, sd * 12.9, Y0 + ANDEN + 1.7, 3.68, 1.4, 9.6);
    cajaL(bE, sc, sd * 17.9, G + 6.0, 5, 12, 3.2); // nucleo de escaleras
    etiquetas.push({ e, m: muestra(sc), ub, y: G + RIEL + ANDEN + 3.2 });
  });
  const mallas = (lista, grupo) => lista.forEach(([b, m, extra]) => { if (!b.p.length) return; const me = new THREE.Mesh(aGeo(b), m); me.frustumCulled = false; if (extra) Object.assign(me, extra); grupo.add(me); });
  const gOb = new THREE.Group(), gAcab = new THREE.Group(); gOb.name = 'metro_l1_obra'; gAcab.name = 'metro_l1_estaciones';
  mallas([[bC, mConc], [bAn, mConc]], gOb);
  mallas([[bA, mAcero], [bV, mVidrio, { renderOrder: 6 }], [bF, mFach, { renderOrder: 6 }], [bR, mRojo], [bY, mAmar], [bE, mEdif], [bLz, mLuz]], gAcab);
  T3.scene.add(gOb, gAcab);

  // via (cinta con rieles) y sombra de piso
  { const tx = texVia(), n2 = N, pos = [], uv = [], idx = []; for (let i = 0; i < n2; i++) { const nx = -TZ[i], nz = TX[i]; pos.push(X[i] - nx * 3.6, Y0 + 0.04, Z[i] - nz * 3.6, X[i] + nx * 3.6, Y0 + 0.04, Z[i] + nz * 3.6); uv.push(0, i * DS / 12, 1, i * DS / 12); if (i) { const o = (i - 1) * 2; idx.push(o, o + 1, o + 3, o, o + 3, o + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const ya = (() => { const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = g.attributes.position; a.fromBufferAttribute(p, 0); b.fromBufferAttribute(p, 1); c.fromBufferAttribute(p, 2); return b.sub(a).cross(c.sub(a)).y; })();
    const mv = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide }); const via = new THREE.Mesh(g, mv); via.frustumCulled = false; gOb.add(via);
    const ps = [], is = [], hw = 6.5; for (let i = 0; i < n2; i++) { const nx = -TZ[i], nz = TX[i]; ps.push(X[i] - nx * hw, G + 0.12, Z[i] - nz * hw, X[i] + nx * hw, G + 0.12, Z[i] + nz * hw); if (i) { const o = (i - 1) * 2; is.push(o, o + 1, o + 3, o, o + 3, o + 2); } }
    const gs = new THREE.BufferGeometry(); gs.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); gs.setIndex(is); gs.computeBoundingSphere();
    const ms = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const som = new THREE.Mesh(gs, ms); som.frustumCulled = false; som.renderOrder = 2; gOb.add(som); void ya; }

  // pilas (instanciadas): fuste elipsoidal y capitel trapezoidal bajo la viga
  const pilas = []; { let s = 4, k = 0; while (s < LT - 3) { pilas.push(s); const enEst = zonas.some(z => s > z.a - 18 && s < z.b + 18); s += enEst ? 25 : 33 + 5 * hash(k); k++; } }
  { const shaftG = new THREE.CylinderGeometry(0.46, 0.54, 1, 20, 1, false), bcap = nuevo(), V = []; for (const [lx, ly, lz] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) V.push([lx * 1.4, ly < 0 ? -1.6 : 0, lz * (ly < 0 ? 1.2 : 2.6)]);
    hexa(bcap, V); const capG = aGeo(bcap);
    const n = pilas.length, sh = new THREE.InstancedMesh(shaftG, mConc, n), cp = new THREE.InstancedMesh(capG, mConc, n), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), V3 = new THREE.Vector3(), Yv = new THREE.Vector3(0, 1, 0);
    const Hf = RIEL - ALTO_VIGA - 1.6; // alto del fuste (de piso a capitel)
    pilas.forEach((s, i) => { const m = muestra(s), th = Math.atan2(-m.tz, m.tx), enEst = zonas.some(z => s > z.a && s < z.b); Q.setFromAxisAngle(Yv, th);
      S3.set(1.7, Hf, enEst ? 3.0 : 2.2); V3.set(m.x, G + Hf / 2, m.z); M4.compose(V3, Q, S3); sh.setMatrixAt(i, M4);
      S3.set(1, 1, enEst ? 1.85 : 1); V3.set(m.x, Y0 - ALTO_VIGA, m.z); M4.compose(V3, Q, S3); cp.setMatrixAt(i, M4); });
    sh.instanceMatrix.needsUpdate = cp.instanceMatrix.needsUpdate = true; sh.frustumCulled = cp.frustumCulled = false; gOb.add(sh, cp); }

  // catenaria: postes centrales cada 36 m y dos hilos de contacto (lineas), solo cuando hay servicio
  const gOp = new THREE.Group(); gOp.name = 'metro_l1_catenaria';
  { const bP = nuevo(); for (let s = 18; s < LT - 10; s += 36) { if (zonas.some(z => s > z.a && s < z.b)) continue; cajaL(bP, s, 0, Y0 + 3.1, 0.3, 6.2, 0.3); cajaL(bP, s, 0, Y0 + 5.9, 0.2, 0.2, 5.4); }
    const pm = new THREE.Mesh(aGeo(bP), mOscuro); pm.frustumCulled = false; gOp.add(pm);
    const pos = []; for (const u of [-2.1, 2.1]) for (let i = 0; i < N - 1; i++) { const a = [X[i] - TZ[i] * u, Y0 + 5.2, Z[i] + TX[i] * u], c = [X[i + 1] - TZ[i + 1] * u, Y0 + 5.2, Z[i + 1] + TX[i + 1] * u]; pos.push(...a, ...c); }
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const ln = new THREE.LineSegments(gl, new THREE.LineBasicMaterial({ color: 0x20262c, transparent: true, opacity: 0.75 })); ln.frustumCulled = false; gOp.add(ln); }
  T3.scene.add(gOp);

  // letreros de estacion (sprites, discretos)
  const gEt = new THREE.Group(); gEt.name = 'metro_l1_letreros';
  etiquetas.forEach(({ e, m, ub, y }) => { const c = canvas(768, 144), g = c.getContext('2d'); g.fillStyle = 'rgba(14,18,22,0.82)'; g.fillRect(0, 0, 768, 144); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 14, 144);
    g.fillStyle = '#ffffff'; g.font = '600 30px system-ui, "Segoe UI", Arial, sans-serif'; g.textBaseline = 'alphabetic'; g.fillText('METRO DE BOGOTÁ · LÍNEA 1 · ESTACIÓN ' + e.n, 40, 52);
    g.font = '700 60px system-ui, "Segoe UI", Arial, sans-serif'; g.fillText(e.nombre, 40, 117);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(15, 2.8, 1); sp.position.set(m.x - m.tz * ub, y + 2.2, m.z + m.tx * ub); sp.renderOrder = 8; gEt.add(sp); });
  T3.scene.add(gEt);

  /* ---------- trenes: 6 coches de 24 m (145 m), instanciados en dos mallas (coche extremo y coche medio) ---------- */
  const coche = (extremo) => { const b = nuevo(), LC = 24, BLANCO = [0.91, 0.92, 0.93], ROJO = [0.78, 0.06, 0.18], VENT = [0.09, 0.13, 0.16], PUERTA = [0.8, 0.83, 0.85], GRIS = [0.15, 0.16, 0.19], TECHO = [0.82, 0.84, 0.86], AC = [0.7, 0.73, 0.76], FARO = [1, 0.95, 0.78];
    const xf = extremo ? 8.8 : 12, lc = extremo ? 12 + xf : 24, cx = extremo ? (-12 + xf) / 2 : 0;
    caja(b, cx, 2.25, 0, lc, 2.7, 2.9, 0, BLANCO);
    if (extremo) { const V = [[xf, 0.9, -1.45], [xf, 0.9, 1.45], [xf, 3.6, 1.45], [xf, 3.6, -1.45], [12.0, 1.0, -1.1], [12.0, 1.0, 1.1], [12.0, 3.15, 1.1], [12.0, 3.15, -1.1]]; hexa(b, [V[0], V[1], V[2], V[3], V[4], V[5], V[6], V[7]], [BLANCO, VENT, BLANCO, BLANCO, BLANCO, BLANCO]);
      caja(b, 12.03, 1.45, -0.8, 0.06, 0.2, 0.34, 0, FARO); caja(b, 12.03, 1.45, 0.8, 0.06, 0.2, 0.34, 0, FARO); }
    const x0 = -11.6, x1 = extremo ? 8.6 : 11.6;
    caja(b, 0, 0.62, 0, 22, 0.5, 2.4, 0, GRIS);
    for (const bx of [-8, 8]) caja(b, bx, 0.36, 0, 3.4, 0.62, 2.7, 0, GRIS);
    for (const sg of [-1, 1]) { caja(b, (x0 + x1) / 2, 1.3, sg * 1.455, x1 - x0, 0.42, 0.02, 0, ROJO); caja(b, (x0 + x1) / 2, 2.55, sg * 1.462, x1 - x0, 1.1, 0.02, 0, VENT);
      for (const dx of [-8.4, -2.8, 2.8, 8.4]) if (dx + 0.7 < x1 && dx - 0.7 > x0) caja(b, dx, 2.2, sg * 1.482, 1.35, 2.15, 0.02, 0, PUERTA); }
    caja(b, cx, 3.72, 0, lc - 0.4, 0.22, 2.5, 0, TECHO);
    for (const ax of [-6, 6]) if (ax < x1 - 3) caja(b, ax, 3.95, 0, 5.6, 0.3, 1.7, 0, AC);
    return aGeo(b); };
  const mTren = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.2 });
  const MAXC = 6 * 2 * 8; // 6 coches x 2 sentidos x 8 trenes en pantalla (tope)
  const imE = new THREE.InstancedMesh(coche(true), mTren, MAXC), imM = new THREE.InstancedMesh(coche(false), mTren, MAXC);
  [imE, imM].forEach(im => { im.count = 0; im.frustumCulled = false; gOp.add(im); });
  // perfil de marcha: tabla s(tau) para cada sentido (paradas de 30 s, 1,0 m/s2 y 1,1 m/s2, 18 m/s maximo)
  const DT = 0.25, VMAX = 18, ACE = 1.0, FRE = 1.1, PARO = 30, LTREN = 145;
  const marcha = (paradas) => { const arr = []; let s = -LTREN - 10, v = VMAX, k = 0, esp = 0; while (s < LT + LTREN + 10 && arr.length < 20000) { arr.push(s);
      if (esp > 0) { esp -= DT; v = 0; continue; }
      const nx = k < paradas.length ? paradas[k] : null; let vd = VMAX; if (nx != null) { const d = nx - s; vd = Math.min(VMAX, Math.sqrt(2 * FRE * Math.max(0, d)) * 0.95 + 0.4); if (d < 0.35) { s = nx; v = 0; esp = PARO; k++; continue; } }
      v += Math.max(-FRE * DT, Math.min(ACE * DT, vd - v)); if (v < 0.3 && nx != null) v = 0.3; s += v * DT; }
    return Float32Array.from(arr); };
  const pIda = EST.map(e => e.s), pVuelta = EST.map(e => LT - e.s).reverse();
  const tabla = [marcha(pIda), marcha(pVuelta)], TVIAJE = tabla.map(t => (t.length - 1) * DT);
  const HP = 210, NSLOT = Math.ceil((Math.max(...TVIAJE) + 30) / HP) + 1, TC = NSLOT * HP; // un tren cada 3,5 min en hora pico
  const cyc = new Int32Array(2 * NSLOT).fill(-1), act = new Uint8Array(2 * NSLOT);
  const servicio = (j, tod, dia) => { const h = tod / 3600, fin = dia >= 5; if (h < 5 || h >= 23) return false; if (!fin && ((h >= 6 && h < 9) || (h >= 16.5 && h < 19.5))) return true; return j % 2 === 0; };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), Yv = new THREE.Vector3(0, 1, 0);
  let nTrenes = 0, cabeza = null, estado = { sem: -1 };
  const poner = (im, k, x, z, th) => { Q.setFromAxisAngle(Yv, th); V3.set(x, Y0 + 0.04, z); M4.compose(V3, Q, S1); im.setMatrixAt(k, M4); };
  const anim = () => {
    const sem = RELOJ.sem || 0, ac = sem >= SEM_OBRA_ACAB, op = sem >= SEM_OP;
    if (gAcab.visible !== ac) gAcab.visible = ac; if (gEt.visible !== ac) gEt.visible = ac; if (gOp.visible !== op) gOp.visible = op; estado = { sem, ac, op };
    if (!op) { imE.count = imM.count = 0; nTrenes = 0; return; }
    const tA = RELOJ.tAnim || 0, t = RELOJ.t || 0, tod = ((t % DIA) + DIA) % DIA, dia = Math.floor(t / DIA) % 7;
    let ne = 0, nm = 0, cab = null; nTrenes = 0;
    for (let d = 0; d < 2; d++) for (let j = 0; j < NSLOT; j++) {
      const q = d * NSLOT + j, ph = tA + j * HP + d * HP / 2, c = Math.floor(ph / TC); if (cyc[q] !== c) { cyc[q] = c; act[q] = servicio(j, tod, dia) ? 1 : 0; }
      const tau = ph - c * TC; if (!act[q] || tau >= TVIAJE[d]) continue;
      const T = tabla[d], f = tau / DT, i0 = Math.min(T.length - 2, Math.floor(f)), sh = T[i0] + (T[i0 + 1] - T[i0]) * (f - i0); let vis = 0;
      for (let k = 0; k < 6; k++) { const sc = d === 0 ? sh - 12.1 - k * 24.2 : LT - sh + 12.1 + k * 24.2; if (sc < 0 || sc > LT) continue; vis++;
        const m = muestra(sc), nx = -m.tz, nz = m.tx, u = d === 0 ? 2.1 : -2.1; let th = Math.atan2(-m.tz, m.tx); if (d === 1) th += Math.PI; if (k === 5) th += Math.PI; // el coche de cola mira hacia atras
        const x = m.x + nx * u, z = m.z + nz * u;
        if ((k === 0 || k === 5) && ne < MAXC) poner(imE, ne++, x, z, th); else if (nm < MAXC) poner(imM, nm++, x, z, th); }
      if (vis) { nTrenes++; if (!cab) { const mm = muestra(Math.max(0, Math.min(LT, d === 0 ? sh - 12 : LT - sh + 12))); cab = { x: mm.x, z: mm.z, tx: mm.tx, tz: mm.tz, d }; } }
    }
    cabeza = cab; imE.count = ne; imM.count = nm; imE.instanceMatrix.needsUpdate = imM.instanceMatrix.needsUpdate = true;
  };
  RELOJ.alDibujar(anim); anim();
  window.KEN_METRO = { punto: (s) => muestra(s), estaciones: EST.map(e => ({ n: e.n, nombre: e.nombre, s: Math.round(e.s) })), largo: Math.round(LT), semOp: SEM_OP, pilas: pilas.length, get trenes() { return nTrenes; }, get cabeza() { return cabeza; }, get coches() { return imE.count + imM.count; }, get estado() { return estado; }, viaje: TVIAJE.map(Math.round) };
  return window.KEN_METRO;
}
