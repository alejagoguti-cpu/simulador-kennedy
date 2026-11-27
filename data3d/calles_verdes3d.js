/* ============ CALLES VERDES (arborización vial de «Kennedy con propuesta») ============
   Filas de árboles nativos en los andenes de las vías principales ('major') y secundarias ('mid') de la red (data3d/net.json, T3.net) y,
   donde la avenida es de doble calzada, en el separador. Se ven SOLO en «Kennedy con propuesta» y crecen con la semana simulada.

   RELACIÓN CON EL MODELO: data3d/simulaciones12.js:372-379 (mecanismo CALLES VERDES Y PACIFICADAS, PROP_SUP.MIT = 0,30, MIT_T0 = 52,
   MIT_T1 = 416): el 30 % de las calles se vuelve calle verde de la semana 52 a la 416, mit = 0,30 · fase con fase lineal. El modelo NO dice
   qué calles (es un agregado), así que aquí se fija un ORDEN determinista y la longitud sembrada sigue la misma fase:
     longitud sembrada / longitud total = 0,30 · (sem − 52) / (416 − 52)   (fase 1, igual a PROP_SUP.MIT · faseObra del modelo)
   Orden: calles más cerca de un humedal (El Burro, La Vaca, Techo…) o de un parque grande (> 4.000 m², los mismos que usa
   data3d/parches_arboles.js) primero — el mecanismo es parte de E5 «Corredor biótico» (data3d/panel_indicadores.js:31), que une los parches.

   SUPUESTOS [SUP]
   · [SUP] solo vías 'major' y 'mid' dentro del límite de Kennedy (data3d/kennedy.json; si no carga, toda la red). Las locales no se arborizan aquí.
   · [SUP] fase 1 (30 % de la longitud, la del modelo): semanas 52–416 (años 2–8). Fase 2 («extensión»): el resto de las vías principales y
     secundarias de la semana 416 a la 676 (años 8–13). El modelo no tiene fase 2: es solo visual (no cambia el ruido del modelo).
   · [SUP] cada árbol se siembra joven (20 % de su altura adulta) y es adulto 3,5 años después (factor 0,2 → 1, lineal).
   · [SUP] anchos de calzada de index.html (buildRoads): major 15 m, mid 10 m; andén 2,4 m. Árbol a ANCHO/2 + 1,4 m del eje (mitad del andén).
   · [SUP] separador: no hay datos de separadores; donde OSM dibuja la avenida como dos calzadas paralelas, la fila de andén interior queda entre
     las dos y se marca como separador (especies grandes). No se pone fila sobre el eje de una vía (sería sobre la calzada).
   · [SUP] espaciado: 12 m en andenes de vías principales, 13,5 m en secundarias, 9 m en separadores (± 15 % determinista); mínimo 4,5 m entre árboles.
   · [SUP] se omiten: 14 m alrededor de cada cruce (vértice con 3+ tramos), todo punto a menos de (media calzada + 1 m) del eje de CUALQUIER vía
     (major/mid/local), glorietas (lazos cerrados de < 500 m), tramos de < 20 m, puentes y rampas (T3.alzaVia), dentro del agua o a menos de
     4 m de su borde (canales: media lámina 3,5/2,5 m + 4 m), con data3d/water_bodies.json (o T3.aguaW si no carga).
   · [SUP] edificios: no hay una prueba barata de huellas (están en un PNG de máscara en la GPU y en bloques fusionados); se confía en el andén:
     por construcción queda fuera de las fachadas.
   · [SUP] especies (data3d/parches_arboles.js ESPECIES): andén de principal = chicalá 30 %, arrayán 30 %, aliso 25 %, sauco 15 %; andén de
     secundaria = arrayán 40 %, chicalá 35 %, sauco 25 %; separador = caucho sabanero 50 %, aliso 50 %.
   · [SUP] calidad: window.KEN_CALIDAD = 'liviano' (40 % de los árboles) | 'medio' (70 %) | 'completo' (100 %); sin la variable: 'liviano' en
     celular o GPU integrada (T3.gpuDebil), si no 'completo'. Se quitan primero los lejanos a El Burro y los de vías secundarias.
   RENDIMIENTO: todo se calcula en trozos de ≤ 8 ms en requestIdleCallback y se arma OCULTO; poner() solo prende y, si el año cambió > 0,07,
   recalcula las edades.
   API: crearCallesVerdes({ T3 }) → window.KEN_CALLES_VERDES = { preparar(), poner(sem), apagar(), info(), obra() } */

const ANCHO = { major: 15, mid: 10, local: 6 }, ACERA = 2.4, DENTRO_ACERA = 1.4;
export const CV_SUP = { T0: 52, T1: 416, FRAC: 0.30, T2: 676, ADULTO: 3.5, E0: 0.2, SEP: { major: 12, mid: 13.5, sep: 9 }, MIN: 4.5, CRUCE: 14, AGUA: 4,
  CALIDAD: { liviano: 0.4, medio: 0.7, completo: 1 } };
const MEZCLA = { major: [['chicala', 0.30], ['arrayan', 0.30], ['aliso', 0.25], ['sauco', 0.15]], mid: [['arrayan', 0.40], ['chicala', 0.35], ['sauco', 0.25]], sep: [['caucho', 0.5], ['aliso', 0.5]] };
const ALTO = { caucho: 10, aliso: 11, sauco: 5.5, chicala: 6, arrayan: 5 }; // = ESPECIES[sp].alto de parches_arboles.js (copia para no cargar ese módulo al calcular)
const ZONA = [7437, 3271]; // centro de El Burro en coordenadas del modelo (index.html ZONA)

const azar = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const dentro = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const dseg2 = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))), ex = x - ax - t * dx, ez = z - az - t * dz; return ex * ex + ez * ez; };
const elegir = (L, r) => { let a = 0; for (const [sp, p] of L) { a += p; if (r < a) return sp; } return L[L.length - 1][0]; };

// rejilla espacial (clave numérica)
function rejilla(C) { const M = new Map(), K = (i, j) => (i + 50000) * 100003 + (j + 50000);
  return { C, add(x0, z0, x1, z1, v) { for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) { const k = K(i, j); let a = M.get(k); if (!a) M.set(k, a = []); a.push(v); } },
    cerca(x, z, r, fn) { for (let i = Math.floor((x - r) / C); i <= Math.floor((x + r) / C); i++) for (let j = Math.floor((z - r) / C); j <= Math.floor((z + r) / C); j++) { const a = M.get(K(i, j)); if (a) for (const v of a) if (fn(v) === false) return false; } return true; } }; }

/* Cálculo puro (sin THREE): generador que cede el control a menudo; el navegador lo corre en trozos ociosos, Node de un tirón (pruebas).
   D = { edges: [[tipo, [[x,z]...]]] (modelo), lw, agua: [{tipo, pts}] (modelo), parques: [{pts}] (modelo), limite: [[wx,wz]] (mundo) | null,
         alza: fn(x,z) | null, calidad: 'liviano'|'medio'|'completo' } */
export function* calcularCallesVerdes(D) {
  const lw = D.lw, S = CV_SUP;
  // 1) vías en el mundo
  const V = []; let n = 0;
  for (const e of D.edges) { if (++n % 100 === 0) yield;
    if (!e[1] || e[1].length < 2) continue; const q = [lw(e[1][0][0], e[1][0][1])];
    for (let i = 1; i < e[1].length; i++) { const p = lw(e[1][i][0], e[1][i][1]), a = q[q.length - 1]; if (Math.hypot(p[0] - a[0], p[1] - a[1]) > 0.3) q.push(p); }
    if (q.length < 2) continue; let L = 0; for (let i = 1; i < q.length; i++) L += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    V.push({ tipo: e[0], q, L, hw: (ANCHO[e[0]] || 6) / 2, id: V.length }); }
  // 2) cruces (vértices con 3+ tramos: un extremo cuenta 1, un vértice interior 2) y rejilla de segmentos (para «no sobre la calzada»)
  const grado = new Map(), kN = (p) => Math.round(p[0]) * 100003 + Math.round(p[1]);
  n = 0; for (const v of V) { if (++n % 1500 === 0) yield; v.q.forEach((p, i) => { const k = kN(p); grado.set(k, (grado.get(k) || 0) + (i === 0 || i === v.q.length - 1 ? 1 : 2)); }); }
  const GC = rejilla(32); n = 0; for (const v of V) { if (++n % 1500 === 0) yield; for (const p of v.q) if (grado.get(kN(p)) >= 3) GC.add(p[0], p[1], p[0], p[1], p); }
  yield;
  const GS = rejilla(32); n = 0;
  for (const v of V) { if (++n % 60 === 0) yield;
    for (let i = 1; i < v.q.length; i++) { const a = v.q[i - 1], b = v.q[i]; GS.add(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), [a[0], a[1], b[0], b[1], v.hw, v.id, v.tipo]); } }
  // 3) agua: polígonos cerrados (dentro = no) y bordes / canales con su margen
  const AP = [], GA = rejilla(32);
  for (const w of D.agua || []) { yield; if (!w.pts || w.pts.length < 2) continue; const q = w.pts.map(p => lw(p[0], p[1])), tipo = (w.tipo || '').toLowerCase();
    const cerrado = q.length > 3 && Math.hypot(w.pts[0][0] - w.pts[w.pts.length - 1][0], w.pts[0][1] - w.pts[w.pts.length - 1][1]) < 1.0, r = S.AGUA + (cerrado ? 0 : (/quebrada/.test(tipo) ? 2.5 : 3.5));
    if (cerrado) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of q) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } AP.push({ q, x0, x1, z0, z1 }); }
    for (let i = 1; i < q.length; i++) { const a = q[i - 1], b = q[i]; GA.add(Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, [a[0], a[1], b[0], b[1], r * r]); } }
  const enAgua = (x, z) => { for (const P of AP) if (x > P.x0 && x < P.x1 && z > P.z0 && z < P.z1 && dentro(x, z, P.q)) return true;
    return !GA.cerca(x, z, 0, (s) => dseg2(x, z, s[0], s[1], s[2], s[3]) >= s[4]); };
  yield;
  // 4) atractores del orden: humedales y lagunas + parques de más de 4.000 m² (vértices)
  const GP = rejilla(100); let nAt = 0;
  for (const w of D.agua || []) if (/humedal|laguna/i.test(w.tipo || '') && w.pts) for (const p of w.pts) { const m = lw(p[0], p[1]); GP.add(m[0], m[1], m[0], m[1], m); nAt++; }
  yield; n = 0;
  for (const pq of D.parques || []) { if (++n % 80 === 0) yield; if (!pq.pts || pq.pts.length < 3) continue; let a = 0; for (let i = 0; i < pq.pts.length; i++) { const u = pq.pts[i], w = pq.pts[(i + 1) % pq.pts.length]; a += u[0] * w[1] - w[0] * u[1]; }
    if (Math.abs(a) / 2 > 4000) for (const p of pq.pts) { const m = lw(p[0], p[1]); GP.add(m[0], m[1], m[0], m[1], m); nAt++; } }
  yield;
  // 5) calles candidatas (major/mid en Kennedy, sin glorietas ni tramos cortos) y su distancia al atractor más cercano
  const CAL = []; n = 0;
  for (const v of V) { if (v.tipo !== 'major' && v.tipo !== 'mid') continue; if (++n % 30 === 0) yield;
    if (v.L < 20) continue; const a = v.q[0], b = v.q[v.q.length - 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 2 && v.L < 500) continue; // glorieta
    let mx = 0, mz = 0, acc = 0; for (let i = 1; i < v.q.length && acc < v.L / 2; i++) { const l = Math.hypot(v.q[i][0] - v.q[i - 1][0], v.q[i][1] - v.q[i - 1][1]), t = Math.min(1, (v.L / 2 - acc) / (l || 1)); mx = v.q[i - 1][0] + (v.q[i][0] - v.q[i - 1][0]) * t; mz = v.q[i - 1][1] + (v.q[i][1] - v.q[i - 1][1]) * t; acc += l; }
    if (D.limite && !dentro(mx, mz, D.limite)) continue;
    let d = 1e9; for (let r = 100; r <= 2000 && d > r - 100; r += 100) GP.cerca(mx, mz, r, (p) => { const dd = Math.hypot(p[0] - mx, p[1] - mz); if (dd < d) d = dd; });
    CAL.push({ v, mx, mz, d }); }
  // 6) orden y calendario: fase 1 = primer 30 % de la longitud (semanas 52–416), fase 2 = el resto (416–676)
  CAL.sort((a, b) => a.d - b.d || a.v.id - b.v.id);
  const LT = CAL.reduce((s, c) => s + c.v.L, 0) || 1; let cum = 0;
  for (const c of CAL) { const f = (cum + c.v.L / 2) / LT; cum += c.v.L; c.fase = f <= S.FRAC ? 1 : 2;
    c.sem = c.fase === 1 ? S.T0 + (f / S.FRAC) * (S.T1 - S.T0) : S.T1 + ((f - S.FRAC) / (1 - S.FRAC)) * (S.T2 - S.T1); }
  yield;
  // 7) árboles a lo largo de cada calle, a lado y lado
  const GT = rejilla(16), A = [], libreT = (x, z) => GT.cerca(x, z, S.MIN, (t) => (t.x - x) ** 2 + (t.z - z) ** 2 >= S.MIN * S.MIN);
  for (const c of CAL) { yield; const v = c.v, R = azar(9173 + v.id * 31), off = v.hw + DENTRO_ACERA;
    for (const lado of [1, -1]) { let sig = R() * S.SEP[v.tipo], acc = 0;
      for (let i = 1; i < v.q.length; i++) { const a = v.q[i - 1], b = v.q[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1e-3) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, nx = -uz * lado, nz = ux * lado;
        while (sig < acc + l) { const s = sig - acc, cx = a[0] + ux * s, cz = a[1] + uz * s, x = cx + nx * off, z = cz + nz * off;
          // separador: otra calzada principal paralela a 12–30 m hacia este lado
          let sep = false; if (v.tipo === 'major') GS.cerca(x, z, 22, (g) => { if (g[5] === v.id || g[6] !== 'major') return; const dx = g[2] - g[0], dz = g[3] - g[1], L = Math.hypot(dx, dz) || 1; if (Math.abs((dx * ux + dz * uz) / L) < 0.85) return;
            const t = Math.max(0, Math.min(1, ((cx - g[0]) * dx + (cz - g[1]) * dz) / (L * L))), fx = g[0] + dx * t - cx, fz = g[1] + dz * t - cz, lat = fx * nx + fz * nz; if (lat > 12 && lat < 30 && Math.abs(fx * ux + fz * uz) < 6) { sep = true; return false; } });
          sig += S.SEP[sep ? 'sep' : v.tipo] * (0.85 + 0.3 * R());
          if (!GC.cerca(x, z, S.CRUCE, (p) => (p[0] - x) ** 2 + (p[1] - z) ** 2 >= S.CRUCE * S.CRUCE)) continue; // cruce
          if (!GS.cerca(x, z, 8.6, (g) => dseg2(x, z, g[0], g[1], g[2], g[3]) >= (g[4] + 1) ** 2)) continue; // sobre una calzada
          if (D.alza) { const al = D.alza(x, z); if (al > 0.05) continue; } // puente o rampa
          if (enAgua(x, z) || !libreT(x, z)) continue;
          const sp = elegir(MEZCLA[sep ? 'sep' : v.tipo], R()), t = { x, z, sp, h: ALTO[sp] * (0.85 + 0.25 * R()), rot: R() * 6.283, ap: (c.sem + R() * 4) / 52, fase: c.fase, tipo: sep ? 'sep' : v.tipo, cal: v.id };
          A.push(t); GT.add(x, z, x, z, t); }
        acc += l; } } }
  // 8) calidad: se quedan los más cercanos a El Burro y los de vías principales (y la fase 1)
  const frac = S.CALIDAD[D.calidad] != null ? S.CALIDAD[D.calidad] : 1, Z = lw(ZONA[0], ZONA[1]);
  let OUT = A; if (frac < 1) { let dm = 1; for (const t of A) dm = Math.max(dm, Math.hypot(t.x - Z[0], t.z - Z[1]));
    const pr = (t) => Math.hypot(t.x - Z[0], t.z - Z[1]) / dm * 0.6 + (t.tipo === 'mid' ? 0.25 : 0) - (t.fase === 1 ? 0.15 : 0) + 0.4 * (((Math.sin(t.x * 12.9898 + t.z * 78.233) * 43758.5453) % 1 + 1) % 1);
    OUT = A.map(t => [pr(t), t]).sort((a, b) => a[0] - b[0]).slice(0, Math.round(A.length * frac)).map(p => p[1]); }
  yield;
  // 9) parches de ~80 m para crearParches3D
  const PC = new Map(); for (const t of OUT) { const k = Math.floor(t.x / 80) * 100003 + Math.floor(t.z / 80); let p = PC.get(k); if (!p) PC.set(k, p = { n: 'Calle verde', c: [0, 0], arboles: [] }); p.arboles.push(t); }
  for (const p of PC.values()) { let x = 0, z = 0; for (const t of p.arboles) { x += t.x; z += t.z; } p.c = [x / p.arboles.length, z / p.arboles.length]; }
  const calles = CAL.map(c => ({ id: c.v.id, tipo: c.v.tipo, L: c.v.L, sem: c.sem, fase: c.fase, d: c.d }));
  return { arboles: OUT, todos: A.length, parches: [...PC.values()], calles, LT, atractores: nAt, calidad: D.calidad || 'completo' };
}

export function crearCallesVerdes({ T3 }) {
  if (window.KEN_CALLES_VERDES) return window.KEN_CALLES_VERDES;
  const cargar = window.cargarJSON || ((u) => fetch(u).then(r => r.json()));
  let R = null, A = null, prom = null, activo = false, sem = 0, ultAño = -9, error = null;
  const idle = (fn) => window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 250 }) : setTimeout(() => fn(null), 16);
  const correr = (it) => new Promise((ok, mal) => { const paso = (dl) => { const t0 = performance.now(), pres = dl && !dl.didTimeout ? Math.max(1, Math.min(8, dl.timeRemaining())) : 6;
    try { do { const r = it.next(); if (r.done) return ok(r.value); } while (performance.now() - t0 < pres); } catch (e) { return mal(e); } idle(paso); }; idle(paso); });
  const esperarRed = () => new Promise(ok => { const mira = () => (T3.net && T3.net.edges && T3.lw) ? ok() : setTimeout(mira, 400); mira(); });
  const calidad = () => { const c = window.KEN_CALIDAD; if (c && CV_SUP.CALIDAD[c] != null) return c;
    const mov = innerWidth < 760 || matchMedia('(pointer:coarse)').matches; return (mov || T3.gpuDebil) ? 'liviano' : 'completo'; };
  const edadFn = (años) => (k, t) => { const d = años - t.ap; return d <= 0 ? 0 : Math.min(1, CV_SUP.E0 + (1 - CV_SUP.E0) * d / CV_SUP.ADULTO); };
  const aplicar = (forzar) => { if (!A) return; A.ver(activo); if (!activo) return; const años = sem / 52;
    if (forzar || Math.abs(años - ultAño) > 0.07) { ultAño = años; A.edad(edadFn(años)); } };

  const api = window.KEN_CALLES_VERDES = {
    preparar() {
      if (prom) return prom;
      prom = (async () => {
        await esperarRed();
        // agua completa (T3.aguaW solo trae la de la zona de detalle de El Burro); si no carga, la de T3
        const [agua, parques, ken] = await Promise.all([cargar('data3d/water_bodies.json').catch(() => T3.aguaW || []),
          cargar('data3d/parques.json').catch(() => []), cargar('data3d/kennedy.json').catch(() => null)]);
        const limite = ken && ken.limite && T3.llAMundo ? ken.limite.map(([lng, lat]) => T3.llAMundo(lng, lat)) : null;
        R = await correr(calcularCallesVerdes({ edges: T3.net.edges, lw: T3.lw, agua, parques, limite, alza: (x, z) => (T3.alzaVia ? T3.alzaVia(x, z) || 0 : 0), calidad: calidad() }));
        if (!R.arboles.length) return api;
        const { crearParches3D } = await import('./parches_arboles.js?v=12');
        await new Promise(ok => idle(ok)); // los modelos y las instancias se arman en un momento ocioso
        const P = await crearParches3D({ T3, P: R.parches, fijo: true });
        P.grupo.name = 'calles_verdes';
        const ys = T3.sueloY != null ? T3.sueloY : 0.3, yAnden = (T3.viaY != null ? T3.viaY : 0.62) - 0.07; // pie del árbol sobre el andén (index.html: Y_ACERA 0,55)
        P.grupo.position.y = yAnden - ys;
        // sin las marcas de lejos ni la «pradera» verde del parche (sobre la calle se vería como una mancha encima del asfalto)
        P.grupo.traverse(o => { if (o.isPoints) o.visible = false; if (o.isInstancedMesh && o.geometry && o.geometry.type === 'CircleGeometry') o.visible = false; });
        P.ver(false); A = P; aplicar(true); return api;
      })().catch(e => { error = e; console.warn('calles verdes:', e); return api; });
      return prom;
    },
    poner(s) { sem = +s || 0; const nuevo = !activo; activo = true; if (!prom) api.preparar(); aplicar(nuevo); },
    apagar() { if (!activo) return; activo = false; if (A) A.ver(false); },
    info() { const años = sem / 52; let pl = 0, km = 0;
      if (R) { for (const t of R.arboles) if (t.ap < años) pl++; for (const c of R.calles) if (c.sem <= sem) km += c.L; }
      const LT = R ? R.LT : 0, L1 = LT * CV_SUP.FRAC, f1 = Math.max(0, Math.min(1, (sem - CV_SUP.T0) / (CV_SUP.T1 - CV_SUP.T0))), f2 = Math.max(0, Math.min(1, (sem - CV_SUP.T1) / (CV_SUP.T2 - CV_SUP.T1)));
      return { listo: !!A, error: error ? String(error) : null, arboles: R ? R.arboles.length : 0, plantados: pl, km: Math.round(km / 100) / 10, kmTotal: Math.round(LT / 100) / 10, calidad: R ? R.calidad : calidad(),
        fase: { calles30: f1, extension: f2, fraccionCalles: LT ? km / LT : 0, modelo: CV_SUP.FRAC * f1, sem0: CV_SUP.T0, sem1: CV_SUP.T1, sem2: CV_SUP.T2, km30: Math.round(L1 / 100) / 10 } }; },
    obra() { let x = 0, z = 0, k = 0; const años = sem / 52, L = R ? R.arboles : [], pl = L.filter(t => t.ap < años), U = pl.length ? pl : L;
      for (const t of U) { x += t.x; z += t.z; k++; } if (!k) return { id: 'calles_verdes', n: 'Calles verdes (árboles en andenes y separadores)', x: 0, z: 0, radio: 1500 };
      x /= k; z /= k; const ds = U.map(t => Math.hypot(t.x - x, t.z - z)).sort((a, b) => a - b);
      return { id: 'calles_verdes', n: 'Calles verdes (árboles en andenes y separadores)', x: Math.round(x), z: Math.round(z), radio: Math.round(Math.max(150, ds[Math.floor(ds.length * 0.9)] || 0)) }; }
  };
  return api;
}
