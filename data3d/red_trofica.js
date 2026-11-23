/* ============ RED TRÓFICA (compartida) · 23 especies de fauna × 71 nodos de flora × parches del modelo semanal data3d/sim_vida.js ============
   Módulo ES sin DOM ni fs: lo usan tools/escenarios_instalacion.mjs (node, instalación) y data3d/simulaciones12.js (navegador y node).
   Se movió tal cual desde tools/escenarios_instalacion.mjs (2026-11-22); la salida de ese script no cambia (verificado con hash de escenarios12.json).

   FAUNA: las 23 especies de data3d/biotica.js (ESP): las 19 de sim_vida.js con sus grupos, + rata y caracol (están en la red de humedalburro,
   data3d/biotica.json) + abeja y lombriz (ya estaban en el simulador; biotica.js les agrega relaciones a partir de las de la red).
   FLORA: los 71 nodos de flora de biotica.json, anclados a los árboles reales del censo SIGAU (data3d/trees.json, especie por árbol; cada nodo
   lista sus especies del censo en «sp»). Un nodo de flora está en un parche si hay al menos un árbol de esa especie a menos del radio del parche
   (círculo con el área del parche) de su centro. Bosque de Bavaria: los 3.250 árboles de data3d/bavaria_arboles.json con la mezcla de especies
   de biotica.js (eucalipto 50 %, urapán 25 %, ciprés 15 %, acacia negra 10 %, el mismo sorteo determinista por árbol). Plan parcial (D): cada
   árbol del predio sale en su etapa (data3d/plan_bavaria.json arboles_quitados = etapa de tala por árbol, 0 = se queda), con el mismo avance
   lineal dentro del año de sim_vida.js. Módulos de huertas activos (C, e11, techos): llevan los parches de árboles nativos de data3d/parches_arboles.js
   (caucho sabanero, aliso, sauco, chicalá, arrayán, chilco, tíbar, raque, mortiño: los 9 coinciden con nodos de la red, «fl»).
   DEPENDENCIAS (recursos de cada especie en la red): flora con la que tiene herbivoría, dispersión de semillas, nidificación/refugio, visita
   floral/polinización o anidamiento de dosel; fauna que depreda o cuyo nido parasita; mutualismo en los dos sentidos. La competencia no es recurso.
   REGLA [SUP]: R = fracción de los recursos de la especie presentes en el parche o en un parche a su alcance (distancia ≤ D de su grupo).
   La colonización (incluida la llegada de fuera) se multiplica por R; si R = 0 la extinción local se multiplica por EXT_SIN_REC.
   Especies sin recursos en la red (focha, lombriz) no dependen de ella (R = 1). Así una extinción se propaga a quien depende de ella.

   Dos pasos:
   · datosRed({ BIO, BIO_TXT, TREES, BAVA, PLANQ, PA_TXT, PARCHES, mundo }) → objeto compacto (JSON) con todo lo que la red necesita de los
     archivos pesados (trees.json pesa 2,7 MB: aquí queda reducido a conteos por flora × parche). Corre en node (tools/) o donde se tengan los datos.
   · crearRed(D, V, PARCHES) → { iniciar(s), paso(s, ...), FAUNA, FLORA, ENL, ... }: el gancho mod.red de sim_vida.js.
   Además de lo que ya hacía, paso() anota POR QUÉ se extingue localmente cada especie (s.red.mot, código MOTIVOS) y guarda la matriz de cruce
   de esta semana (s.red.XQ): no consume azar, así que la dinámica es idéntica. */

export const RED_SUP = {
  EXT_SIN_REC: 10, // [SUP] sin ningún recurso de la red al alcance, la extinción local es 10 veces la normal (no se sostiene)
  F_RATA: 1        // [SUP] rata: su hábitat se multiplica por 1 + F_RATA·min(1, pendientes/almacenamiento) (más residuos sin tratar, más ratas)
};
// [SUP] grupos de las 4 especies nuevas (afinidad por tipo de parche, alcance D en m, colonización c y extinción e por semana), coherentes con
// biotica.js: POR_PARQUE / POR_HUERTA / POR_BOSQUE (abeja 14 por huerta y 1,2 por parque; lombriz 6 por huerta; rata en parques, bosque, Corabastos y
// bordes con basura; caracol en parques y bosque, «casi inmóvil»)
export const GRUPOS_N = {
  urbana: { hab: { parque: 0.7, humedal: 0.7, bosque: 0.6, mod: 0.3, cub: 0.2 }, D: 800, c: 0.04, e: 0.004 },  // rata: parques y bordes de humedal con basura
  molusco: { hab: { humedal: 1, parque: 0.8, bosque: 0.7, mod: 0.5, cub: 0.3 }, D: 150, c: 0.02, e: 0.004 },   // caracol: suelo húmedo, casi inmóvil
  poliniz: { hab: { mod: 1, cub: 1, parque: 0.8, bosque: 0.6, humedal: 0.4 }, D: 1500, c: 0.05, e: 0.004 },   // abeja: huertas y módulos (14 por huerta), parques con flor
  lombriz: { hab: { mod: 1, cub: 0.6, parque: 0.8, bosque: 0.8, humedal: 0.4 }, D: 300, c: 0.03, e: 0.003 }    // lombriz: suelo de huertas y compost (llega con la tierra), parques
};
// motivo de cada extinción local (s.red.mot): 0 = sigue o nunca estuvo
export const MOTIVOS = ['', 'sin recursos de la red', 'tráfico y ruido', 'tala', 'humedal degradado', 'azar demográfico (parche pequeño o de baja calidad)', 'el parche dejó de ser hábitat'];
const NUEVAS = [['rata', 'urbana'], ['caracol', 'molusco'], ['abeja', 'poliniz'], ['lombriz', 'lombriz']];

/* ---------- 1 · datos compactos (desde los archivos pesados) ---------- */
export function datosRed({ BIO, BIO_TXT, TREES, BAVA, PLANQ, PA_TXT, PARCHES, mundo }) {
  const nombreBio = (k) => { const m = BIO_TXT.match(new RegExp('\\n  ' + k + ": \\{ n: '([^']+)'")); return m ? m[1] : k; };
  const catBio = (k) => BIO.especies[k] ? BIO.especies[k].cat : (+((BIO_TXT.match(new RegExp('\\n  ' + k + ": \\{[^\\n]*cat: (\\d)")) || [])[1]) || null);
  const nuevas = Object.fromEntries(NUEVAS.map(([id]) => [id, { n: nombreBio(id), cat: catBio(id) }]));
  const cat = {}; // categoría de cada especie de fauna de biotica.json (1 = ave, ...)
  for (const [k, e] of Object.entries(BIO.especies)) cat[k] = e.cat;
  const FLORA = Object.entries(BIO.flora).map(([id, f]) => ({ id, n: f.n, sp: f.sp })), NFL = FLORA.length, NP = PARCHES.length;
  const RPM = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI));
  const SP2FL = new Map(); FLORA.forEach((f, i) => f.sp.forEach(s => { if (!SP2FL.has(s)) SP2FL.set(s, []); SP2FL.get(s).push(i); }));
  const FLC0 = new Array(NFL * NP).fill(0); // árboles por (flora, parche) hoy
  for (const t of TREES.t) { const fl = SP2FL.get(t[3]); if (!fl) continue; const [x, z] = mundo(t[0], t[1]);
    for (let p = 0; p < NP; p++) { const P = PARCHES[p], r = RPM[p]; if (Math.abs(P.x - x) > r || Math.abs(P.z - z) > r) continue; if (Math.hypot(P.x - x, P.z - z) <= r) for (const f of fl) FLC0[f * NP + p]++; } }
  const BOSQ = []; { const spI = (re) => TREES.sp.findIndex(s => re.test(s)), MEZ = [[spI(/^Eucalipto común/i), 0.5], [spI(/^Urapán/i), 0.25], [spI(/^Ciprés, Pino ciprés/i), 0.15], [spI(/^Acacia negra/i), 0.1]].filter(m => m[0] >= 0);
    BAVA.arboles.forEach((t, i) => { let r = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1, s = MEZ[MEZ.length - 1][0]; for (const [k, p] of MEZ) { if (r < p) { s = k; break; } r -= p; } // mismo sorteo de biotica.js
      for (const f of SP2FL.get(s) || []) BOSQ.push([f, PLANQ[i] || 0]); }); }
  const NATIVA = [...new Set([...PA_TXT.matchAll(/fl: \['(f\d+)'\]/g)].map(m => m[1]))];
  return { flora: FLORA.map(f => ({ id: f.id, n: f.n })), cat, nuevas, enlaces: BIO.enlaces.map(([a, b, t]) => [a, b, t]), tipos: BIO.tipos.map(t => t.n), FLC0, BOSQ, NATIVA, np: NP };
}

/* ---------- 2 · la red (gancho mod.red de sim_vida.js) ---------- */
export function crearRed(D, V, PARCHES) {
  const GR = { ...V.GRUPOS, ...GRUPOS_N };
  const FAUNA = [...V.ESPECIES.map(([id, n, g]) => ({ id, n, grupo: g })), ...NUEVAS.map(([id, grupo]) => ({ id, grupo }))]
    .map(f => ({ ...f, n: f.n || D.nuevas[f.id].n, cat: D.cat[f.id] != null ? D.cat[f.id] : (D.nuevas[f.id] ? D.nuevas[f.id].cat : null) }));
  const NFA = FAUNA.length, FI = Object.fromEntries(FAUNA.map((f, i) => [f.id, i]));
  const FLORA = D.flora, NFL = FLORA.length, FLI = Object.fromEntries(FLORA.map((f, i) => [f.id, i]));
  // enlaces de la red: los 216 de biotica.json + los agregados en biotica.js (abeja visita las flores que visita el colibrí; 4 pares)
  const ENL = D.enlaces.map(([a, b, t]) => [a, b, t]);
  for (const [a, b, t] of D.enlaces) if (a === 'colibri' && b[0] === 'f' && t === 5) ENL.push(['abeja', b, 5]);
  ENL.push(['abeja', 'colibri', 8], ['mirla', 'lombriz', 0], ['cucarachero', 'abeja', 0], ['tingua', 'lombriz', 0]);
  const esFa = (k) => FI[k] != null, esFl = (k) => FLI[k] != null;
  const REC_F = FAUNA.map(() => new Set()), REC_A = FAUNA.map(() => new Set());
  for (const [a, b, t] of ENL) {
    if (esFa(a) && esFl(b) && [1, 2, 4, 5, 6].includes(t)) REC_F[FI[a]].add(FLI[b]);
    if (esFa(a) && esFa(b) && (t === 0 || t === 7)) REC_A[FI[a]].add(FI[b]);
    if (esFa(a) && esFa(b) && t === 3) { REC_A[FI[a]].add(FI[b]); REC_A[FI[b]].add(FI[a]); } }
  const RF = REC_F.map(s => [...s]), RA = REC_A.map(s => [...s]), NREC = FAUNA.map((_, i) => RF[i].length + RA[i].length);
  // parches: distancias, núcleos de dispersión (misma fórmula de sim_vida.js) y máscaras de alcance (71 parches → 3 palabras de 32 bits)
  const NP = PARCHES.length, W3 = 3, { TIPO, SQA, IB, RESCATE } = V.INTERNO;
  const DIST = new Float64Array(NP * NP); for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) DIST[p * NP + q] = Math.hypot(PARCHES[p].x - PARCHES[q].x, PARCHES[p].z - PARCHES[q].z);
  const KERN = {}, ALC = {};
  for (const g of Object.keys(GR)) { const Dg = GR[g].D, K = new Float32Array(NP * NP), A = new Uint32Array(NP * W3);
    for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) { if (p !== q) K[p * NP + q] = Math.exp(-DIST[p * NP + q] / Dg) * Math.sqrt(PARCHES[q].ha); if (DIST[p * NP + q] <= Dg) A[p * W3 + (q >> 5)] |= 1 << (q & 31); }
    KERN[g] = K; ALC[g] = A; }
  const AVE = FAUNA.map(f => f.cat === 1), TER = FAUNA.map((f, i) => i < V.ESPECIES.length ? V.INTERNO.ES_TERR[i] : (f.id === 'rata' || f.id === 'caracol')); // [SUP] rata y caracol también pagan el costo de cruzar vías (atropellos)
  const HABM = FAUNA.map(f => new Float32Array(NP).map((_, p) => GR[f.grupo].hab[TIPO[p]] || 0));
  const FLC0 = Float32Array.from(D.FLC0), BOSQ = D.BOSQ;
  const IBQ = PARCHES.findIndex(p => p.id === 'bosqueBav');
  const NATIVA = D.NATIVA, NAT_I = NATIVA.filter(esFl).map(f => FLI[f]), NAT_NUEVA = NATIVA.filter(f => !esFl(f));
  const ES_MOD = PARCHES.map(p => p.t.startsWith('mod') && p.t !== 'modBavaria');
  const anyAnd = (M, a, A, b) => (M[a] & A[b]) | (M[a + 1] & A[b + 1]) | (M[a + 2] & A[b + 2]);
  function floraEstado(s) { // máscara de presencia de cada flora (cambia solo con la tala del plan parcial y con los módulos activos)
    let firma = ''; for (let p = 0; p < NP; p++) if (ES_MOD[p] && s.q[p] > 0) firma += p + ',';
    const tala = s.e === 'D' ? s.t / V.AÑO : 0; firma += '|' + (s.e === 'D' ? Math.floor(Math.max(0, s.t) / V.AÑO * 52) : 0);
    if (s.red.firma === firma) return false; s.red.firma = firma;
    const C = Float32Array.from(FLC0); if (IBQ >= 0) for (const [f, e] of BOSQ) C[f * NP + IBQ] += e === 0 ? 1 : 1 - Math.max(0, Math.min(1, tala - (e - 1)));
    for (let p = 0; p < NP; p++) if (ES_MOD[p] && s.q[p] > 0) for (const f of NAT_I) C[f * NP + p] = Math.max(C[f * NP + p], 1);
    const M = s.red.flM.fill(0); for (let f = 0; f < NFL; f++) for (let p = 0; p < NP; p++) if (C[f * NP + p] >= 0.5) M[f * W3 + (p >> 5)] |= 1 << (p & 31);
    const FA = s.red.flA; for (let i = 0; i < NFA; i++) { const A = ALC[FAUNA[i].grupo]; for (let p = 0; p < NP; p++) { let n = 0; for (const f of RF[i]) if (anyAnd(M, f * W3, A, p * W3)) n++; FA[i * NP + p] = n; } }
    return true; }
  // enlaces que unen dos nodos de la red (para contar los vivos sin volver a filtrar cada semana)
  const ENL_IDX = []; for (const [a, b] of ENL) { if (!(esFa(a) || esFl(a)) || !(esFa(b) || esFl(b))) continue; ENL_IDX.push([esFa(a) ? 0 : 1, esFa(a) ? FI[a] * W3 : FLI[a] * W3, esFa(b) ? 0 : 1, esFa(b) ? FI[b] * W3 : FLI[b] * W3]); }
  const contar = (s) => { const O = s.red.ocM.fill(0), occ = s.occ; let pares = 0;
    for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) if (occ[i * NP + p]) { O[i * W3 + (p >> 5)] |= 1 << (p & 31); pares++; }
    const M = s.red.flM; let red = 0;
    for (const [ta, xa, tb, yb] of ENL_IDX) { const X = ta ? M : O, Y = tb ? M : O; if ((X[xa] & Y[yb]) | (X[xa + 1] & Y[yb + 1]) | (X[xa + 2] & Y[yb + 2])) red++; }
    let flora = 0; for (let f = 0; f < NFL; f++) if (M[f * W3] | M[f * W3 + 1] | M[f * W3 + 2]) flora++;
    let esp = 0; for (let i = 0; i < NFA; i++) if (O[i * W3] | O[i * W3 + 1] | O[i * W3 + 2]) esp++;
    return { pares, red, flora, esp }; };
  /* ATRIBUCIÓN DEL MOTIVO (solo descriptiva, no cambia la dinámica). W0 = calidad inicial del humedal en sim_vida.js. [SUP] un factor se nombra como
     motivo solo si, por sí solo, sube la probabilidad de extinción (o baja el éxito de recolonizar al cruzar vías) en ATRIB veces o más frente a hoy:
     humedal W0/W (la extinción va como 1/calidad), ruido para aves 1/MQ, atropellos para terrestres 1/(éxito medio de cruzar hacia el parche, XQ promediado con el núcleo de dispersión). Si ninguno llega, «azar demográfico». */
  const W0 = 0.55, ATRIB = 1.25;
  return {
    FAUNA, FLORA, ENL, RF, RA, NFA, NFL, NP, W3, FI, FLI, esFa, esFl, NAT_I, NAT_NUEVA, AVE, TER, KERN, GR,
    iniciar(s) {
      s.red = { diag: { n: 0, sR: 0, r0: 0 }, firma: null, flM: new Uint32Array(NFL * W3), flA: new Uint16Array(NFA * NP), ocM: new Uint32Array(NFA * W3), R: new Float32Array(NFA * NP), mot: new Uint8Array(NFA * NP), XQ: null };
      s.occ = new Uint8Array(NFA * NP); floraEstado(s);
      for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) s.occ[i * NP + p] = HABM[i][p] * s.q[p] >= 0.45 ? 1 : 0; // misma regla inicial de sim_vida.js
      const c = contar(s); s.esp0 = c.esp; s.red.inicio = c; s.red.c = c;
    },
    paso(s, { t, q, MQ, XQ, raizB, trampa, pend, alm }) {
      const cambio = floraEstado(s), H_ = s.hab, occ = s.occ, O = s.red.ocM, FA = s.red.flA, MOT = s.red.mot; s.red.XQ = XQ;
      O.fill(0); for (let i = 0; i < NFA; i++) for (let p = 0; p < NP; p++) if (occ[i * NP + p]) O[i * W3 + (p >> 5)] |= 1 << (p & 31);
      const fR = 1 + RED_SUP.F_RATA * Math.min(1, pend / Math.max(1, alm)); let ocAve = 0, ocTer = 0;
      for (let i = 0; i < NFA; i++) { const F = FAUNA[i], g = F.grupo, G = GR[g], K = KERN[g], base = i * NP, nuevo = new Uint8Array(NP), ave = AVE[i], ter = TER[i], hm = HABM[i], rata = F.id === 'rata';
        const hab = (p) => hm[p] * q[p] * (ave ? MQ[p] : 1) * (rata ? fR : 1);
        for (let pp = 0; pp < NP; pp++) { const u = H_(), h = hab(pp); if (h <= 0) { nuevo[pp] = 0; if (occ[base + pp]) MOT[base + pp] = pp === IBQ && s.planArb > 0 ? 3 : 6; continue; }
          let R = 1; if (NREC[i]) { let n = FA[base + pp]; for (const j of RA[i]) if (anyAnd(O, j * W3, ALC[g], pp * W3)) n++; R = n / NREC[i]; }
          const DG = s.red.diag; DG.n++; DG.sR += R; if (R === 0) DG.r0++;
          if (occ[base + pp]) { let ext = Math.min(1, G.e / (h * (pp === IB ? raizB : SQA[pp])) * (g === 'arbol' && TIPO[pp] !== 'parque' && TIPO[pp] !== 'humedal' && TIPO[pp] !== 'bosque' ? trampa : 1));
            if (R === 0) ext = Math.min(1, ext * RED_SUP.EXT_SIN_REC); nuevo[pp] = u < ext ? 0 : 1;
            if (!nuevo[pp]) { // por qué se fue (sin azar): el factor que más subió la probabilidad de extinción frente a las condiciones de hoy
              let m = 5; if (R === 0) m = 1; else if (pp === IBQ && s.planArb > 0) m = 3; else if (TIPO[pp] === 'humedal' && W0 / s.W >= ATRIB) m = 4;
              else if ((ave && 1 / MQ[pp] >= ATRIB) || (ter && XQ && 1 / cruceMedio(XQ, K, pp, NP) >= ATRIB)) m = 2;
              MOT[base + pp] = m; } }
          else { let S = 0; for (let qq = 0; qq < NP; qq++) if (occ[base + qq]) S += K[pp * NP + qq] * hab(qq) * (ter ? XQ[pp * NP + qq] : 1) * (qq === IB ? raizB : 1);
            const col = (1 - Math.exp(-G.c * h * S) + RESCATE * h) * R; nuevo[pp] = u < col ? 1 : 0; }
          if (nuevo[pp]) { if (ave) ocAve++; else ocTer++; } }
        occ.set(nuevo, base); }
      const c = contar(s); s.red.c = c; s.red.cambio = cambio; return { esp: c.esp, ocAve, ocTer };
    } };
}
const cruceMedio = (XQ, K, p, NP) => { let s = 0, w = 0; for (let q = 0; q < NP; q++) { const k = K[p * NP + q]; s += k * XQ[p * NP + q]; w += k; } return w > 0 ? s / w : 1; }; // éxito relativo de llegar a p cruzando vías, promedio con el núcleo de dispersión
