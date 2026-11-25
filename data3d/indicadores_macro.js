/* ============ INDICADORES DE LOS TRES MACROMODELOS (tabla de la autora, docs/indicadores_macromodelos.md) ============
   Funciones puras sobre un I semanal de simulaciones12.js (R.hist[k]): sin DOM, se usan en el tablero (panel_indicadores.js) y en node
   para verificar con / sin propuesta. Cada indicador: {k, macro, n, u, d, sube, v(I, C)} con C = {H (historial), M (módulo del modelo)}.
   Nada se inventa: si el dato no existe en la corrida, el valor es null (la tarjeta lo dice). */

export const T = (I) => (I && I.evaluacion && I.evaluacion.territorio) || {};
const fin = (v) => (v != null && isFinite(v) ? +v : null);

/* ---------- ESPECIES CLAVE: abeja de miel, colibrí chillón y tingua moteada (ids de red_trofica.js) ---------- */
export const CLAVE = [{ id: 'abeja', n: 'Abejas', larga: 'Abeja de miel', c: '#d28e05' }, { id: 'colibri', n: 'Colibríes', larga: 'Colibrí chillón', c: '#00a888' }, { id: 'tingua', n: 'Tinguas', larga: 'Tingua moteada', c: '#9887ef' }];
/* colores: los mismos categóricos validados de graficas_vivas.js (dataviz/validate_palette.js sobre #1e2422, modo oscuro: PASA) */
export const SEM_REF = 52; // N_inicial = fin del año 1: el modelo tarda ~40 semanas en asentarse (simulaciones12.js REF)
const refDe = (C) => { const H = (C && C.H) || []; return H.length ? H[Math.min(SEM_REF, H.length) - 1] : null; };
export const claveArea = (I, id) => fin(I && I.biodiversidad && I.biodiversidad.areaEsp && I.biodiversidad.areaEsp[id]);
export function clavePct(I, id, C) { const a = claveArea(I, id), R = refDe(C), a0 = claveArea(R, id); return a != null && a0 ? a / a0 * 100 : null; }

/* ---------- ACCESIBILIDAD A MERCADOS ---------- */
export const ACCESO_SUP = { MIN: 15, VEL_M_MIN: 75, CIRC: 1.3, POB: 1080742 };
/* 15 min a pie a 4,5 km/h (75 m/min) = 1.125 m por la red; en línea recta 1.125 / 1,3 = 865 m. [SUP] circuidad 1,3: Levinson y El-Geneidy 2009
   (Regional Science and Urban Economics 39: 732–738) miden 1,2–1,3 en redes urbanas. Población de Kennedy: 1.080.742 (DANE, la misma del par 01). */
export const ACCESO_R = ACCESO_SUP.MIN * ACCESO_SUP.VEL_M_MIN / ACCESO_SUP.CIRC;
export function mercadosDe(I, M) {
  const A = (I && I.abasto) || {}, out = [], vistos = new Set();
  const push = (n, x, z, tipo) => { if (x == null || z == null) return; const k = n + '|' + Math.round(x) + '|' + Math.round(z); if (vistos.has(k)) return; vistos.add(k); out.push({ n, x, z, tipo }); };
  const nc = (A.nodos || []).find((q) => q.tipo === 'corabastos'); if (nc) push('Corabastos', nc.x, nc.z, 'corabastos'); else if (A.cora && A.cora.x != null) push('Corabastos', A.cora.x, A.cora.z, 'corabastos');
  const P = M && M.AB01 && M.AB01.PLAZA_KEN; if (P) push(P.n, P.x, P.z, 'plaza');
  for (const m of A.mercados || []) if (m.activo) push(m.n, m.x, m.z, m.real ? 'plaza' : 'propuesta');
  return out;
}
export function acceso(I, M) {
  const S = (T(I).sectores || []).filter((s) => s.x != null && s.demanda > 0), mk = mercadosDe(I, M); if (!S.length) return null;
  let tot = 0, cub = 0; const sec = S.map((s) => { let d = Infinity; for (const m of mk) d = Math.min(d, Math.hypot(s.x - m.x, s.z - m.z)); const ok = d <= ACCESO_R; tot += s.demanda; if (ok) cub += s.demanda; return { x: s.x, z: s.z, w: s.demanda, d, ok }; });
  const pct = tot ? cub / tot * 100 : null;
  return { pct, cubiertos: pct == null ? null : Math.round(pct / 100 * ACCESO_SUP.POB), total: ACCESO_SUP.POB, sectores: sec, mercados: mk, nProp: mk.filter((m) => m.tipo === 'propuesta').length };
}

/* ---------- PRESIÓN INMOBILIARIA ---------- */
const precio = (I) => fin(I && I.especulacion && I.especulacion.indice);
export function presion(I, C) { const H = (C && C.H) || [], P0 = precio(H[0]), Pf = precio(I); return P0 && Pf != null ? (Pf - P0) / P0 * 100 : null; }

/* ---------- SATURACIÓN: solo hay Estaciones Circulares con propuesta ---------- */
export const hayEstaciones = (I) => { const t = T(I); return (t.capTratamiento || 0) > 0 || (t.estaciones || []).length > 0; };

/* ---------- LA TABLA ---------- */
export const MACROS = [
  { id: 'eco', n: 'Macromodelo ecocéntrico', c: 'Ecocéntrico' },
  { id: 'circ', n: 'Macromodelo de circularidad de residuos', c: 'Residuos' },
  { id: 'com', n: 'Macromodelo de comercio ecológico', c: 'Comercio' }
];
export const IND = [
  { k: 'inter', macro: 'eco', n: 'Interacciones bióticas', c: 'Interacciones', u: '', d: 0, sube: true, v: (I) => fin(T(I).red) },
  { k: 'shannon', macro: 'eco', n: 'Biodiversidad de Shannon', c: 'Shannon H′', u: '', d: 2, sube: true, v: (I) => fin(I.biodiversidad && I.biodiversidad.shannonArea) },
  { k: 'clave', macro: 'eco', n: 'Especies clave', c: 'Especies clave', u: '%', d: 0, sube: true, v: (I, C) => { const a = CLAVE.map((e) => clavePct(I, e.id, C)).filter((x) => x != null); return a.length ? a.reduce((p, q) => p + q, 0) / a.length : null; } },
  { k: 'verde', macro: 'eco', n: 'Área verde', c: 'Área verde', u: 'ha', d: 1, sube: true, v: (I) => fin(T(I).verde) },
  { k: 'conect', macro: 'eco', n: 'Conectividad ecológica', c: 'Conectividad', u: '%', d: 0, sube: true, v: (I) => fin(T(I).conectados) },
  { k: 'atrop', macro: 'eco', n: 'Fauna atropellada', c: 'Atropellos', u: 'anim.', d: 0, sube: false, acum: true, v: (I) => fin(I.atropellos && I.atropellos.total) },
  { k: 'ruido', macro: 'eco', n: 'Ruido promedio', c: 'Ruido L_Aeq', u: 'dB(A)', d: 1, sube: false, v: (I) => fin(I.ruidoLAeq) },
  { k: 'bienestar', macro: 'eco', n: 'Bienestar de la fauna', c: 'Bienestar', u: '%', d: 0, sube: true, v: (I) => { const b = I.avesRuido && I.avesRuido.bienestarFauna; return b == null ? null : b * 100; } },
  { k: 'saturacion', macro: 'circ', n: 'Saturación de residuos', c: 'Saturación', u: '%', d: 1, sube: false, v: (I) => hayEstaciones(I) ? fin(T(I).saturacion) : null },
  { k: 'aprov', macro: 'circ', n: 'Aprovechamiento de residuos', c: 'Aprovechamiento', u: '%', d: 1, sube: true, v: (I) => fin(T(I).aprovechamiento) },
  { k: 'cobertura', macro: 'com', n: 'Cobertura alimentaria', c: 'Cobertura', u: '%', d: 1, sube: true, v: (I) => { const c = fin(T(I).cobertura); return c == null ? null : Math.min(100, c); } },
  { k: 'autonomia', macro: 'com', n: 'Autonomía alimentaria', c: 'Autonomía', u: '%', d: 2, sube: true, v: (I) => fin(T(I).autonomia) },
  { k: 'acceso', macro: 'com', n: 'Accesibilidad a mercados', c: 'Accesibilidad', u: '%', d: 0, sube: true, v: (I, C) => { const a = acceso(I, C && C.M); return a ? a.pct : null; } },
  { k: 'presion', macro: 'com', n: 'Presión inmobiliaria', c: 'Presión', u: '%', d: 1, sube: false, v: (I, C) => presion(I, C) }
];
export const INDK = Object.fromEntries(IND.map((x) => [x.k, x]));
export const valor = (k, I, C) => { if (!I) return null; try { return fin(INDK[k].v(I, C)); } catch (e) { return null; } };
