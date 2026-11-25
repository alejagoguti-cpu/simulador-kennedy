import {adjuntarBalance} from './balance_final.js?v=1';
/* ============ INFORME FINAL DE UNA SIMULACIÓN (versión 3: una sola historia) ============
   export function abrirInforme2({ cont, sim, def, hist, base, reglas, go, eventos, extinciones, ind, semilla, onCerrar })
   Pinta en `cont` (la caja de vidrio #su-inf .caja) un informe para no expertos (y para proyectar ante un jurado):
     1 · HÉROE: par, pregunta, veredicto grande «¿Fue sostenible?» Sí / No / En parte con una frase, y las 3–4 cifras que más importan
         (con propuesta: lado a lado con su pareja sin propuesta, misma semana y mismos valores; sin propuesta: año 1 → final);
     2 · «Cómo cambió en 15 años»: hasta 4 curvas grandes (2 × 2), primero la métrica clave del par; con = línea ámbar, sin = gris punteada,
         límite de game over en rojo suave y etiquetas al final de cada línea;
     3 · la red de interacciones en una sola «bola» (perdidas en rojo, nuevas en verde) y lo que pasó por plazo (corto / mediano / largo);
     4 · tabla compacta con todos los indicadores y «Notas y fuentes» (reglas, fuentes, supuestos y cómo se decide el veredicto), plegadas.
   Criterios del veredicto (sin cambios desde la versión 2):
     No = se cumplió una regla de game over · Sí = sin game over, ningún indicador de las reglas a 2/3 o más del camino a su límite y mejoran más
     indicadores clave de los que empeoran · En parte = el resto. Con pareja se compara en la misma semana; sin pareja, año 1 → final.
   Nada se inventa aquí: todo sale de `hist` (ind() de cada semana), `base`, `go`, `eventos`, `reglas` y de data3d/simulaciones_datos.json (red biótica).
   Solo SVG en línea, sin librerías. Las curvas se promedian cada 4 semanas. Estilos con prefijo i2- dentro de .inf2. */

const FIN = 780, AÑO = 52, CADA = 4;
const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];

/* ---------- utilidades ---------- */
const NFC = [];
const nf = (v, d = 0) => v == null || !isFinite(v) ? '—' : (NFC[d] || (NFC[d] = new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }))).format(+v);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (h, k) => { if (!h) return null; let o = h; for (const p of k.split('.')) { if (o == null) return null; o = o[p]; } return typeof o === 'number' && isFinite(o) ? o : null; };
const añoDe = (w) => Math.max(1, Math.ceil(w / AÑO));
const min1 = (s) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const may1 = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const lista = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const SG = (d) => d > 0 ? '+' : d < 0 ? '−' : '';
const num = (v) => typeof v === 'number' && isFinite(v) ? v : null;

/* ---------- indicadores por tema (veredicto y tabla completa; se muestra un indicador solo si existe) ----------
   dif: rel = % relativo · pts = puntos (valor × esc) · db = decibeles · abs = diferencia absoluta (u = unidad) · clave: cuenta para el veredicto. */
const TEMAS = [
  { k: 'eco', n: 'Ecología', items: [
    { k: 'fauna', n: 'Especies de fauna', f: (v, h) => `${nf(v)} de ${nf(h.fauna0)}`, sube: true, dif: 'abs', u: ['especie', 'especies'], clave: true, m: 'fauna' },
    { k: 'red', n: 'Interacciones entre especies', f: (v) => nf(v), sube: true, dif: 'rel', clave: true, m: 'red' },
    { k: 'poliniz', n: 'Polinizadores', f: (v) => nf(v), sube: true, dif: 'rel', clave: true },
    { k: 'pares', n: 'Territorio con fauna', f: (v) => nf(v), sube: true, dif: 'rel', m: 'territorio' },
    { k: 'humedalFuncional', n: 'Humedales que funcionan', f: (v) => nf(v) + ' %', sube: true, dif: 'pts', esc: 1, clave: true, m: 'humedal' },
    { k: 'humedalHa', n: 'Área de humedales', f: (v) => nf(v, 1) + ' ha', sube: true, dif: 'rel' },
    { k: 'arbolesPerdidos', n: 'Árboles perdidos en parques', f: (v) => nf(v * 100, 1) + ' %', sube: false, dif: 'pts', esc: 100, clave: true }] },
  { k: 'urb', n: 'Ambiente urbano', items: [
    { k: 'ruidoDb', n: 'Ruido promedio de las calles', f: (v) => nf(v, 1) + ' dB', sube: false, dif: 'db', clave: true, m: 'ruido' },
    { k: 'trafico', n: 'Tráfico', f: (v) => nf(v * 100) + ' % de hoy', sube: false, dif: 'rel', clave: true, m: 'trafico' },
    { k: 'congestion', n: 'Congestión', f: (v) => nf(v) + ' %', sube: false, dif: 'pts', esc: 1 },
    { k: 'basuraT', n: 'Basura generada', f: (v) => nf(v) + ' t/día', sube: false, dif: 'rel' },
    { k: 'sinRecoger', n: 'Basura sin recoger', f: (v) => nf(v * 100) + ' %', sube: false, dif: 'pts', esc: 100, clave: true, m: 'basura' },
    { k: 'ratas', n: 'Ratas', f: (v, h) => '×' + nf(v / (h.ratas0 || 1), 1), sube: false, dif: 'rel', clave: true },
    { k: 'atropellos', n: 'Fauna atropellada', f: (v) => nf(v, v < 10 ? 1 : 0), sube: false, dif: 'rel' }] },
  { k: 'com', n: 'Comida y economía circular', items: [
    { k: 'comidaMin', n: 'Comida en la zona peor servida', f: (v) => nf(v * 100) + ' %', sube: true, dif: 'pts', esc: 100, clave: true, m: 'comida' },
    { k: 'huertas', n: 'Huertas activas', f: (v) => nf(v), sube: true, dif: 'rel', clave: true },
    { k: 'comidaLocal', n: 'Gente que comería de las huertas', f: (v) => nf(v, v < 10 ? 1 : 0) + ' %', sube: true, dif: 'pts', esc: 1 },
    { k: 'residuos', n: 'Orgánicos sin tratar', f: (v) => nf(v * 100) + ' %', sube: false, dif: 'pts', esc: 100, soloSi: (H) => H.some(h => h.residuos > 0.005), m: 'residuos' },
    { k: 'circular.indice', n: 'Índice de circularidad', f: (v) => v <= 1 ? nf(v * 100, 1) + ' %' : nf(v, 2), sube: true, dif: 'pts', esc: 100, clave: true, m: 'circular' },
    { k: 'circular.compostado_t_dia', n: 'Orgánicos compostados', f: (v) => nf(v, v < 10 ? 1 : 0) + ' t/día', sube: true, dif: 'rel' }] },
  { k: 'suelo', n: 'Suelo y sociedad', items: [
    { k: 'especulacion.indice', n: 'Especulación con el suelo', f: (v) => v <= 1 ? nf(v * 100) + ' %' : '×' + nf(v, 2), sube: false, dif: 'rel', clave: true, m: 'suelo' },
    { k: 'especulacion.hogaresRiesgo', n: 'Hogares en riesgo de desplazamiento', f: (v) => nf(v), sube: false, dif: 'rel', clave: true, m: 'hogares' }] }
];

/* ---------- reglas de game over: valor y «hoy» (los mismos VALOR de simulaciones12.js) ---------- */
const VAL = { fauna: (h) => h.fauna / Math.max(1, h.fauna0) * 100, habitat: (h) => h.pares / Math.max(1, h.pares0) * 100, abasto: (h) => h.evaluacion?.territorio?.cobertura,
  residuos: (h) => h.residuos * 100, ruido: (h) => h.ruidoDb - h.ruidoDb0, trafico: (h) => h.trafico, humedal: (h) => h.humedalFuncional };
const HOY = { fauna: 100, habitat: 100, abasto: 100, residuos: 0, ruido: 0, trafico: 1, humedal: 100 };
const UMB = { fauna: 90, habitat: 70, abasto: 80, residuos: 100, ruido: 3, trafico: 1.3, humedal: 70 };
const FMT_R = { ruido: (v) => SG(v) + nf(Math.abs(v), 1) + ' dB', trafico: (v) => nf(v, 2) };
const fmtR = (k, v) => (FMT_R[k] || ((x) => nf(x) + ' %'))(v);
const ART = { fauna: 'la fauna', habitat: 'el territorio con fauna', humedal: 'el área funcional de los humedales', abasto: 'la cobertura distrital', residuos: 'el almacenamiento de orgánicos', ruido: 'el ruido', trafico: 'el tráfico' };
const CORTO_R = { fauna: 'pérdida de especies', habitat: 'pérdida de territorio con fauna', humedal: 'humedales degradados', abasto: 'déficit distrital', residuos: 'orgánicos sin tratar', ruido: 'ruido', trafico: 'tráfico' };
const prox = (k, v, umbral) => { const h = HOY[k], u = umbral != null ? umbral : UMB[k]; if (v == null || u === h) return 0; return Math.max(0, Math.min(1.2, (v - h) / (u - h))); };
const cruzó = (k, v, umbral) => { const u = umbral != null ? umbral : UMB[k]; return v != null && (HOY[k] < u ? v >= u : v <= u); };

/* ---------- métricas para el héroe y las curvas (v devuelve el valor ya en la unidad que se muestra) ---------- */
const pct = (x) => x == null ? null : x * 100;
const MET = {
  cora: { n: 'Corabastos', u: 'de su tope', t: 'Corabastos: carga frente a su tope', v: (h) => h.abasto && h.abasto.cora ? pct(num(h.abasto.cora.carga)) : null, f: (v) => nf(v) + ' %', sube: false, dif: 'pts', lim: 100, limTxt: 'tope',
    ay: 'Lo que recibe y despacha Corabastos frente a lo máximo que puede mover.' },
  comida: { n: 'Comida en la zona peor servida', u: 'de lo que necesita', t: 'Comida en la zona peor servida', v: (h) => pct(num(h.comidaMin)), f: (v) => nf(v) + ' %', sube: true, dif: 'pts', lim: 80, limTxt: 'game over < 80 %',
    ay: 'Alimentos que llegan al barrio peor servido frente a lo que necesita.' },
  trafico: { n: 'Tráfico', u: 'del de hoy', t: 'Tráfico (100 % = hoy)', v: (h) => pct(num(h.trafico)), f: (v) => nf(v) + ' %', sube: false, dif: 'pts', lim: 130, limTxt: 'game over 130 %',
    ay: 'Vehículos que circulan frente a los de hoy.' },
  basura: { n: 'Basura sin recoger', u: 'de la basura', t: 'Basura sin recoger', v: (h) => pct(num(h.sinRecoger != null ? h.sinRecoger : h.basura && h.basura.fraccionSinRecoger)), f: (v) => nf(v) + ' %', sube: false, dif: 'pts',
    ay: 'Parte de la basura que termina en calles y bordes de humedales.' },
  circular: { n: 'Economía circular', u: 'de los orgánicos vuelve como abono', t: 'Economía circular', v: (h) => pct(num(h.circular && h.circular.indice)), f: (v) => nf(v, 1) + ' %', sube: true, dif: 'pts',
    ay: 'Orgánicos que vuelven como compost a las huertas.' },
  territorio: { n: 'Territorio con fauna', u: 'lugares ocupados por especies', t: 'Territorio con fauna', v: (h) => num(h.pares), f: (v) => nf(v), sube: true, dif: 'rel',
    ay: 'Pares especie × lugar ocupados en toda Kennedy.' },
  red: { n: 'Interacciones entre especies', u: 'relaciones activas', t: 'Interacciones entre especies', v: (h) => num(h.red), f: (v) => nf(v), sube: true, dif: 'rel',
    ay: 'Quién come, poliniza o anida en quién, contado en cada lugar.' },
  hogares: { n: 'Hogares en riesgo', u: 'de desplazamiento', t: 'Hogares en riesgo de desplazamiento', v: (h) => num(h.especulacion && h.especulacion.hogaresRiesgo), f: (v) => nf(v), sube: false, dif: 'rel',
    ay: 'Hogares que podrían tener que irse por el alza del suelo.' },
  suelo: { n: 'Precio del suelo', u: '1 = hoy', t: 'Precio del suelo (1 = hoy)', v: (h) => num(h.especulacion && h.especulacion.indice), f: (v) => '×' + nf(v, 2), sube: false, dif: 'rel',
    ay: 'Presión de precios junto al metro y a los proyectos.' },
  equidad: { n: 'Equidad del reparto', u: 'entre barrios', t: 'Equidad del reparto de recursos', v: (h) => pct(num(h.gobernanza && h.gobernanza.equidad)), f: (v) => nf(v) + ' %', sube: true, dif: 'pts',
    ay: '100 % = cada barrio recibe según lo que necesita.' },
  cobertura: { n: 'Necesidades cubiertas', u: 'en promedio por barrio', t: 'Necesidades cubiertas por barrio', v: (h) => pct(num(h.gobernanza && h.gobernanza.coberturaMedia)), f: (v) => nf(v) + ' %', sube: true, dif: 'pts',
    ay: 'Parte de lo que pide cada barrio que se alcanza a atender.' },
  humedal: { n: 'Humedales que funcionan', u: 'de hoy', t: 'Humedales que funcionan (% de hoy)', v: (h) => num(h.humedalFuncional), f: (v) => nf(v) + ' %', sube: true, dif: 'pts', lim: 70, limTxt: 'game over 70 %',
    ay: 'Área sin rellenar × calidad frente a la basura del borde.' },
  ruido: { n: 'Ruido de las calles', u: 'sobre el de hoy', t: 'Ruido de las calles (dB sobre hoy)', v: (h) => h.ruidoDb != null ? h.ruidoDb - h.ruidoDb0 : null, f: (v) => SG(Math.round(v * 10) / 10) + nf(Math.abs(v), 1) + ' dB', sube: false, dif: 'db', lim: 3, limTxt: 'game over +3 dB',
    ay: '+3 dB es el doble de energía sonora.' },
  fauna: { n: 'Especies de fauna', u: 'de las del inicio', t: 'Especies de fauna (% del inicio)', v: (h) => h.fauna != null ? VAL.fauna(h) : null, f: (v) => nf(v) + ' %', sube: true, dif: 'pts', lim: 90, limTxt: 'game over < 90 %',
    ay: 'Especies de la red biótica que siguen en Kennedy.' },
  habitat: { n: 'Territorio con fauna', u: 'del año 1', t: 'Territorio con fauna (% del año 1)', v: (h) => h.pares != null ? VAL.habitat(h) : null, f: (v) => nf(v) + ' %', sube: true, dif: 'pts', lim: 70, limTxt: 'game over 70 %',
    ay: 'Lugares ocupados por fauna frente al año 1.' },
  residuos: { n: 'Orgánicos sin tratar', u: 'del almacenamiento', t: 'Orgánicos sin tratar (% del almacenamiento)', v: (h) => pct(num(h.residuos)), f: (v) => nf(v) + ' %', sube: false, dif: 'pts', lim: 100, limTxt: 'game over 100 %',
    ay: 'Orgánicos que esperan tratamiento frente a la capacidad.' }
};
const REGLA_MET = { fauna: 'fauna', habitat: 'habitat', humedal: 'humedal', abasto: 'comida', residuos: 'residuos', ruido: 'ruido', trafico: 'trafico' };
const PAR_MET = { 1: ['cora', 'comida'], 2: ['comida', 'trafico'], 3: ['basura', 'circular'], 4: ['territorio', 'red'], 5: ['hogares', 'suelo'], 6: ['equidad', 'cobertura'] };
const RELLENO = ['red', 'humedal', 'trafico', 'comida', 'basura'];

/* ---------- red biótica (para la «bola») ---------- */
const FAUNA = [['tingua', 'Tingua moteada', 'Tingua'], ['pato', 'Pato andino', 'Pato'], ['focha', 'Focha común', 'Focha'], ['garza', 'Garza blanca', 'Garza'], ['garzaNoc', 'Garza nocturna', 'Garza noct.'],
  ['monjita', 'Monjita bogotana', 'Monjita'], ['rana', 'Rana sabanera', 'Rana'], ['culebra', 'Serpiente sabanera', 'Serpiente'], ['curi', 'Curí', 'Curí'], ['copeton', 'Copetón', 'Copetón'],
  ['mirla', 'Mirla patiamarilla', 'Mirla'], ['colibri', 'Colibrí chillón', 'Colibrí'], ['torcaza', 'Torcaza', 'Torcaza'], ['cucarachero', 'Cucarachero', 'Cucarachero'], ['chamon', 'Chamón', 'Chamón'],
  ['cernicalo', 'Cernícalo', 'Cernícalo'], ['buho', 'Búho sabanero', 'Búho'], ['lagartija', 'Lagartija bogotana', 'Lagartija'], ['comadreja', 'Comadreja', 'Comadreja'],
  ['rata', 'Rata parda', 'Rata'], ['caracol', 'Caracol de jardín', 'Caracol'], ['abeja', 'Abeja de miel', 'Abeja'], ['lombriz', 'Lombriz roja', 'Lombriz']]; // = ESPECIES de sim_vida.js + las 4 de red_trofica.js (mismo orden)
const GRUPOS = [{ k: 'ave', n: 'Aves' }, { k: 'poli', n: 'Polinizadores' }, { k: 'mam', n: 'Mamíferos' }, { k: 'herp', n: 'Anfibios y reptiles' }, { k: 'inv', n: 'Otros invertebrados' }, { k: 'pla', n: 'Plantas' }];
let RED_P = null;
function cargarRed() {
  if (RED_P) return RED_P;
  RED_P = fetch(new URL('./simulaciones_datos.json', import.meta.url)).then(r => { if (!r.ok) throw new Error('simulaciones_datos.json ' + r.status); return r.json(); }).then(J => {
    const R = J.red, NP = R.np, NFL = R.flora.length, fl = new Map(R.flora.map((f, i) => [f.id, i]));
    const cat = (id) => R.cat[id] != null ? R.cat[id] : (R.nuevas[id] ? R.nuevas[id].cat : null);
    // enlaces: los de biotica.json + los que agrega red_trofica.js (abeja visita las flores del colibrí; 4 pares)
    const ENL = R.enlaces.map(e => e.slice(0, 3)); for (const [a, b, t] of R.enlaces) if (a === 'colibri' && b[0] === 'f' && t === 5) ENL.push(['abeja', b, 5]);
    ENL.push(['abeja', 'colibri', 8], ['mirla', 'lombriz', 0], ['cucarachero', 'abeja', 0], ['tingua', 'lombriz', 0]);
    const FI = new Map(FAUNA.map((f, i) => [f[0], i]));
    const poli = new Set(ENL.filter(([a, b, t]) => t === 5 && FI.has(a) && fl.has(b)).map(e => e[0]));
    const grupo = (id) => { if (poli.has(id)) return 'poli'; const c = cat(id); return c === 1 ? 'ave' : c === 2 ? 'mam' : (c === 4 || c === 5) ? 'herp' : 'inv'; };
    // plantas presentes hoy: censo SIGAU (FLC0 ≥ 0,5 en algún parche) o bosque de Bavaria (BOSQ) · NATIVA = nativas de los módulos de huertas
    const bos = new Set(R.BOSQ.map(b => b[0])), hoy = new Uint8Array(NFL);
    for (let f = 0; f < NFL; f++) { let a = bos.has(f); for (let p = 0; p < NP && !a; p++) if (R.FLC0[f * NP + p] >= 0.5) a = true; hoy[f] = a ? 1 : 0; }
    const nuevas = R.NATIVA.map(id => fl.get(id)).filter(i => i != null && !hoy[i]);
    const soloBosque = [...bos].filter(f => { for (let p = 0; p < NP; p++) if (R.FLC0[f * NP + p] >= 0.5) return false; return true; });
    const nodos = FAUNA.map(([id, n, c]) => ({ id, n, c, g: grupo(id), fa: true }));
    R.flora.forEach((f, i) => { if (hoy[i] || nuevas.includes(i)) nodos.push({ id: f.id, n: f.n.split(',')[0], c: '', g: 'pla', fa: false, fi: i }); });
    const NI = new Map(nodos.map((x, i) => [x.id, i]));
    const enl = []; const visto = new Set();
    for (const [a, b, t] of ENL) { if (!NI.has(a) || !NI.has(b) || a === b) continue; const key = a < b ? a + '|' + b : b + '|' + a; if (visto.has(key)) continue; visto.add(key); enl.push([NI.get(a), NI.get(b), t]); }
    return { nodos, enl, floraHoy: nodos.filter(x => !x.fa && hoy[x.fi]).map(x => x.id), floraNuevas: nuevas.map(i => R.flora[i].id), soloBosque: soloBosque.map(i => R.flora[i].id), tipos: R.tipos };
  });
  RED_P.catch(() => { RED_P = null; });
  return RED_P;
}

/* ---------- iconos (trazos de 16 px) ---------- */
const IC = {
  especies: 'M3 13c0-6 4-10 10-10 0 6-4 10-10 10zM3 13l6-6', polinizadores: 'M6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3',
  huertas: 'M8 14V7M8 9C5 9 3 7 3 4c3 0 5 2 5 5zM8 7c0-3 2-5 5-5 0 3-2 5-5 5z', residuos: 'M2.5 4h11M6 4V2h4v2M4 4l1 10h6l1-10',
  corabastos: 'M2 14V6l6-4 6 4v8M5 14V9h6v5', ruido: 'M2 6h3l4-3v10l-4-3H2zM11 5.5c1.3 1.4 1.3 3.6 0 5M13 3.5c2.6 2.6 2.6 6.4 0 9',
  obra: 'M3 14V3h9M3 6l9-3M10 3v5M1.5 14h6', trafico: 'M2 11V8l2-4h8l2 4v3zM4.5 13v-2M11.5 13v-2M2 8h12', metro: 'M4 2h8v9H4zM4 7h8M5.5 14l1-3M10.5 14l-1-3',
  comida: 'M2 6h12l-2 8H4zM5 6l3-4 3 4', gameover: 'M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M5.5 5.5l5 5M10.5 5.5l-5 5', otro: 'M8 5v4M8 11v.5M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13',
  si: 'M3.5 8.5l3 3 6-7', no: 'M4.5 4.5l7 7M11.5 4.5l-7 7', parte: 'M3.5 8h9', sube: 'M8 13V3M4 7l4-4 4 4', baja: 'M8 3v10M4 9l4 4 4-4', igual: 'M3.5 6h9M3.5 10h9'
};
const icono = (t, cls = '') => `<svg class="i2-ic ${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${IC[t] || IC.otro}"/></svg>`;

/* ---------- estilos ---------- */
const CSS = `
#su-inf .caja:has(> .inf2) { width: min(1160px, calc(100vw - 24px)); background: rgba(20,22,28,.92); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 0 32px 32px; }
.inf2 { --ink: #eef1f4; --ink2: rgba(238,241,244,.72); --mut: rgba(238,241,244,.5); --line: rgba(255,255,255,.12); --line2: rgba(255,255,255,.07);
  --card: rgba(255,255,255,.035); --bg: #16181d; --bien: #8ee6a8; --mal: #ff8a80; --amb: #ffcf7a; --gris: rgba(238,241,244,.5); --grid: rgba(255,255,255,.06);
  --bienbg: rgba(142,230,168,.12); --malbg: rgba(255,138,128,.13); --ambbg: rgba(255,207,122,.12); --track: rgba(255,255,255,.07);
  --g-ave: #3987e5; --g-poli: #d95926; --g-mam: #199e70; --g-herp: #c98500; --g-inv: #d55181; --g-pla: #0ca30c;
  --num: 'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif;
  color: var(--ink); font: 400 15px/1.5 Geist, system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
.inf2 * { box-sizing: border-box; }
.inf2 p { margin: 0; }
/* barra superior */
.inf2 .i2-top { position: sticky; top: 0; z-index: 4; margin: 0 -32px; padding: 14px 32px; display: flex; align-items: center; gap: 8px; background: rgba(20,22,28,.96); border-bottom: 1px solid var(--line2); border-radius: 16px 16px 0 0; }
.inf2 .i2-k { flex: 1; min-width: 0; font: 600 11px/1.2 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.inf2 .i2-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.06); color: inherit; font: 600 13px Geist, system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
.inf2 .i2-btn:hover { background: rgba(255,255,255,.12); } .inf2 .i2-btn.pri { background: var(--amb); color: #1c1406; border-color: transparent; }
.inf2 .i2-btn:focus-visible, .inf2 summary:focus-visible { outline: 2px solid var(--amb); outline-offset: 2px; }
/* héroe */
.inf2 .i2-hero { padding: 32px 0 8px; }
.inf2 .i2-kick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font: 600 12px/1.2 Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-pill { padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); letter-spacing: .08em; color: var(--ink2); }
.inf2 .i2-pill.con { border-color: rgba(255,207,122,.45); color: var(--amb); }
.inf2 .i2-tit { margin-top: 12px; font: 600 clamp(36px, 5.4vw, 60px)/.98 var(--num); letter-spacing: .005em; text-wrap: balance; }
.inf2 .i2-preg { margin-top: 12px; max-width: 64ch; font-size: clamp(16px, 1.7vw, 19px); line-height: 1.45; color: var(--ink2); text-wrap: pretty; }
.inf2 .i2-ver { margin-top: 24px; display: grid; grid-template-columns: auto 1fr; gap: 8px 32px; align-items: center; padding: 24px 28px; border-radius: 16px; border: 1px solid var(--line); background: var(--card); position: relative; overflow: hidden; }
.inf2 .i2-ver::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--gris); }
.inf2 .i2-ver.bien::before { background: var(--bien); } .inf2 .i2-ver.mal::before { background: var(--mal); } .inf2 .i2-ver.parte::before { background: var(--amb); }
.inf2 .i2-ver.bien { background: linear-gradient(100deg, rgba(142,230,168,.10), var(--card) 55%); }
.inf2 .i2-ver.mal { background: linear-gradient(100deg, rgba(255,138,128,.11), var(--card) 55%); }
.inf2 .i2-ver.parte { background: linear-gradient(100deg, rgba(255,207,122,.10), var(--card) 55%); }
.inf2 .i2-vbig small { display: block; font: 600 11px/1 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); margin-bottom: 8px; }
.inf2 .i2-vw { display: flex; align-items: center; gap: 12px; font: 700 clamp(64px, 9vw, 104px)/.82 var(--num); text-transform: uppercase; letter-spacing: .01em; white-space: nowrap; }
.inf2 .i2-vw .i2-ic { width: .5em; height: .5em; stroke-width: 2; }
.inf2 .i2-ver.bien .i2-vw { color: var(--bien); } .inf2 .i2-ver.mal .i2-vw { color: var(--mal); } .inf2 .i2-ver.parte .i2-vw { color: var(--amb); }
.inf2 .i2-vf { font: 500 clamp(17px, 1.9vw, 22px)/1.4 Geist, system-ui, sans-serif; text-wrap: pretty; }
.inf2 .i2-vs { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.inf2 .i2-cnt { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,.05); font: 500 13px/1.3 Geist, system-ui, sans-serif; color: var(--ink2); }
.inf2 .i2-cnt b { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.inf2 .i2-cntt { align-self: center; font-size: 13px; color: var(--mut); }
.inf2 .i2-cnt.bien .i2-ic { color: var(--bien); } .inf2 .i2-cnt.mal .i2-ic { color: var(--mal); }
.inf2 .i2-alerta { grid-column: 1 / -1; margin-top: 8px; padding: 12px 16px; border-radius: 12px; background: var(--ambbg); border: 1px solid rgba(255,207,122,.3); font-size: 15px; line-height: 1.45; display: flex; gap: 12px; align-items: flex-start; }
.inf2 .i2-alerta .i2-ic { flex: none; width: 18px; height: 18px; margin-top: 2px; color: var(--amb); }
.inf2 .i2-alerta b { font-weight: 600; }
/* cifras clave */
.inf2 .i2-cmp { margin-top: 16px; }
.inf2 .i2-cmph { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 16px; margin-bottom: 12px; }
.inf2 .i2-lab { font: 600 11px/1.2 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-cmph span:last-child { font-size: 13px; color: var(--mut); }
.inf2 .i2-kpis { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 12px; }
.inf2 .i2-kpi { padding: 16px 18px 18px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); display: flex; flex-direction: column; min-width: 0; }
.inf2 .i2-kn { font: 600 14px/1.3 Geist, system-ui, sans-serif; }
.inf2 .i2-ku { font-size: 12.5px; color: var(--mut); margin-top: 2px; }
.inf2 .i2-kv { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 10px; margin-top: 12px; }
.inf2 .i2-kv b { font: 600 clamp(40px, 4.6vw, 54px)/.9 var(--num); letter-spacing: .005em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.inf2 .i2-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px 3px 6px; border-radius: 6px; font: 600 12px/1.2 Geist, system-ui, sans-serif; white-space: nowrap; background: rgba(255,255,255,.06); color: var(--ink2); }
.inf2 .i2-tag .i2-ic { width: 13px; height: 13px; stroke-width: 2; }
.inf2 .i2-tag.bien { background: var(--bienbg); color: var(--bien); } .inf2 .i2-tag.mal { background: var(--malbg); color: var(--mal); }
.inf2 .i2-bars { margin-top: auto; padding-top: 14px; display: grid; gap: 7px; }
.inf2 .i2-bar { display: grid; grid-template-columns: 1fr auto; gap: 3px 10px; align-items: center; font-size: 12.5px; color: var(--ink2); }
.inf2 .i2-bar span:nth-child(2) { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.inf2 .i2-bar.ref span:nth-child(2) { color: var(--ink2); font-weight: 500; }
.inf2 .i2-tr { grid-column: 1 / -1; height: 8px; border-radius: 4px; background: var(--track); overflow: hidden; }
.inf2 .i2-tr i { display: block; height: 100%; border-radius: 4px; background: var(--amb); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inf2 .i2-tr i.bien { background: var(--bien); } .inf2 .i2-tr i.mal { background: var(--mal); }
.inf2 .i2-tr i.ref { background: rgba(238,241,244,.34); } .inf2 .i2-tr i.igual { background: rgba(238,241,244,.7); }
/* secciones */
.inf2 .i2-sec { margin-top: 48px; }
.inf2 .i2-sh { margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 24px; }
.inf2 .i2-st { margin: 4px 0 0; font: 600 clamp(26px, 3vw, 34px)/1.05 var(--num); letter-spacing: .01em; }
.inf2 .i2-sd { font-size: 14px; color: var(--ink2); max-width: 70ch; }
.inf2 .i2-leg { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 13px; color: var(--ink2); }
.inf2 .i2-leg span { display: inline-flex; align-items: center; gap: 8px; }
.inf2 .i2-leg i { display: inline-block; width: 24px; height: 0; border-top: 2.5px solid var(--amb); }
.inf2 .i2-leg i.ref { border-top: 2px dashed var(--gris); } .inf2 .i2-leg i.lim { border-top: 1.5px solid var(--mal); opacity: .75; }
/* curvas */
.inf2 .i2-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.inf2 .i2-ch { position: relative; padding: 18px 18px 10px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); min-width: 0; break-inside: avoid; }
.inf2 .i2-cht { font: 600 16px/1.25 Geist, system-ui, sans-serif; } .inf2 .i2-chs { font-size: 13px; color: var(--mut); margin-top: 2px; }
.inf2 .i2-ch svg { display: block; width: 100%; height: auto; margin-top: 10px; touch-action: pan-y; overflow: visible; }
.inf2 .i2-tip { position: absolute; pointer-events: none; z-index: 3; padding: 8px 10px; border-radius: 8px; background: rgba(12,14,18,.96); border: 1px solid var(--line); font-size: 12.5px; line-height: 1.45; white-space: nowrap; display: none; }
.inf2 .i2-tip b { font-weight: 600; } .inf2 .i2-tip i { display: inline-block; width: 14px; height: 0; border-top: 2.5px solid var(--amb); vertical-align: middle; margin-right: 6px; } .inf2 .i2-tip i.ref { border-top: 2px dashed var(--gris); }
.inf2 svg .ax { font: 500 12px Geist, system-ui, sans-serif; fill: var(--mut); font-variant-numeric: tabular-nums; }
.inf2 svg .gr { stroke: var(--grid); stroke-width: 1; } .inf2 svg .bl { stroke: rgba(255,255,255,.2); stroke-width: 1; }
.inf2 svg .ln { fill: none; stroke: var(--amb); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.inf2 svg .lr { fill: none; stroke: var(--gris); stroke-width: 2; stroke-dasharray: 5 5; stroke-linecap: round; }
.inf2 svg .lim { stroke: var(--mal); stroke-width: 1.25; opacity: .6; }
.inf2 svg .limt { font: 500 11.5px Geist, system-ui, sans-serif; fill: var(--mal); opacity: .9; }
.inf2 svg .halo { paint-order: stroke; stroke: var(--bg); stroke-width: 4px; stroke-linejoin: round; }
.inf2 svg .dot { fill: var(--amb); stroke: var(--bg); stroke-width: 2; } .inf2 svg .dotr { fill: #b9bcc2; stroke: var(--bg); stroke-width: 2; }
.inf2 svg .gox { stroke: var(--mal); stroke-width: 2.2; stroke-linecap: round; }
.inf2 svg .gol { stroke: var(--mal); stroke-width: 1.5; stroke-dasharray: 2 3; }
.inf2 svg .val { font: 600 14px Geist, system-ui, sans-serif; fill: var(--ink); font-variant-numeric: tabular-nums; }
.inf2 svg .valr { font: 500 12.5px Geist, system-ui, sans-serif; fill: var(--ink2); font-variant-numeric: tabular-nums; }
.inf2 svg .sn { font: 500 11px Geist, system-ui, sans-serif; fill: var(--mut); }
.inf2 svg .got { font: 600 11.5px Geist, system-ui, sans-serif; fill: var(--mal); }
.inf2 svg .cr { stroke: rgba(255,255,255,.4); stroke-width: 1; }
/* red + plazos */
.inf2 .i2-duo { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 16px; align-items: start; }
.inf2 .i2-box { padding: 20px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); min-width: 0; break-inside: avoid; }
.inf2 .i2-bh { font: 600 16px/1.25 Geist, system-ui, sans-serif; } .inf2 .i2-bs { font-size: 13px; color: var(--mut); margin-top: 2px; }
.inf2 .i2-ball svg { display: block; width: 100%; max-width: 440px; height: auto; margin: 8px auto 0; overflow: visible; }
.inf2 svg .nl { font: 500 11px Geist, system-ui, sans-serif; fill: var(--ink2); } .inf2 svg .nl.fuera { fill: var(--mal); text-decoration: line-through; } .inf2 svg .nl.vuelve { fill: var(--bien); }
.inf2 svg .gl { font: 600 10px Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; fill: var(--mut); }
.inf2 svg .ch0 { fill: none; stroke: rgba(238,241,244,.13); stroke-width: .7; } .inf2 svg .chp { fill: none; stroke: var(--mal); stroke-width: 1.6; } .inf2 svg .chn { fill: none; stroke: var(--bien); stroke-width: 1.6; }
.inf2 svg .nd { stroke: var(--bg); stroke-width: 1.2; } .inf2 svg .nd.fuera { fill: none !important; stroke: var(--mal); stroke-width: 1.8; } .inf2 svg .nd.aun { fill: none !important; stroke: var(--mut); stroke-width: 1; }
.inf2 svg .ga { fill: none; stroke-width: 3; stroke-linecap: round; }
.inf2 .i2-gleg { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; margin-top: 12px; font-size: 12px; color: var(--ink2); }
.inf2 .i2-gleg span { display: inline-flex; align-items: center; gap: 6px; } .inf2 .i2-gleg i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.inf2 .i2-gleg i.l { width: 20px; height: 0; border-radius: 0; border-top: 2px solid; }
.inf2 .i2-rs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
.inf2 .i2-rs > div { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 12.5px; line-height: 1.35; color: var(--ink2); }
.inf2 .i2-rs b { display: block; font: 600 30px/1 var(--num); color: var(--ink); margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.inf2 .i2-rs b.bien { color: var(--bien); } .inf2 .i2-rs b.mal { color: var(--mal); }
.inf2 .i2-nota { margin-top: 12px; font-size: 12.5px; color: var(--mut); line-height: 1.5; }
.inf2 .i2-nota b { color: var(--ink2); font-weight: 600; }
.inf2 .i2-redg { display: grid; grid-template-columns: minmax(0, 440px) minmax(0, 1fr); gap: 16px 40px; align-items: center; }
.inf2 .i2-redg .i2-gleg { justify-content: flex-start; }
.inf2 .i2-fases { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.inf2 .i2-fases .i2-box { padding: 16px 18px 8px; }
.inf2 .i2-leg .i2-eb { width: 18px; height: 18px; border-radius: 5px; display: inline-grid; place-items: center; }
.inf2 .i2-leg .i2-eb.bien { background: var(--bienbg); color: var(--bien); } .inf2 .i2-leg .i2-eb.mal { background: var(--malbg); color: var(--mal); }
.inf2 .i2-fh { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.inf2 .i2-fh b { font: 600 11px/1.2 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--ink2); } .inf2 .i2-fh span { font-size: 12px; color: var(--mut); }
.inf2 .i2-ev { display: grid; grid-template-columns: 52px 22px 1fr; gap: 10px; align-items: start; padding: 8px 0; border-bottom: 1px solid var(--line2); break-inside: avoid; }
.inf2 .i2-ev:last-child { border-bottom: 0; }
.inf2 .i2-ea { font: 600 15px/1.25 var(--num); letter-spacing: .02em; color: var(--ink2); white-space: nowrap; }
.inf2 .i2-eb { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; background: rgba(255,255,255,.06); color: var(--ink2); }
.inf2 .i2-ev.bien .i2-eb { background: var(--bienbg); color: var(--bien); } .inf2 .i2-ev.mal .i2-eb { background: var(--malbg); color: var(--mal); }
.inf2 .i2-ic { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.inf2 .i2-et { font: 500 13.5px/1.35 Geist, system-ui, sans-serif; } .inf2 .i2-ex { margin-top: 2px; font-size: 12.5px; line-height: 1.4; color: var(--mut); }
.inf2 details.i2-mas > summary { cursor: pointer; padding: 10px 0 8px; font: 500 13px Geist, system-ui, sans-serif; color: var(--amb); }
.inf2 .i2-vacio { font-size: 13px; color: var(--mut); padding: 8px 0; }
/* plegables */
.inf2 details.i2-fold { margin-top: 16px; border-radius: 14px; border: 1px solid var(--line); background: var(--card); }
.inf2 details.i2-fold > summary { list-style: none; cursor: pointer; padding: 16px 20px; display: flex; align-items: center; gap: 12px; font: 600 15px/1.3 Geist, system-ui, sans-serif; }
.inf2 details.i2-fold > summary::-webkit-details-marker { display: none; }
.inf2 details.i2-fold > summary span { font: 400 13px Geist, system-ui, sans-serif; color: var(--mut); margin-left: auto; text-align: right; }
.inf2 details.i2-fold > summary::before { content: ''; width: 8px; height: 8px; border-right: 2px solid var(--mut); border-bottom: 2px solid var(--mut); transform: rotate(-45deg); transition: transform .15s; flex: none; }
.inf2 details.i2-fold[open] > summary::before { transform: rotate(45deg); }
.inf2 .i2-fb { padding: 0 20px 20px; }
.inf2 table.i2-tab { width: 100%; border-collapse: collapse; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.inf2 .i2-tab th { font: 600 10.5px/1.2 Geist, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); text-align: right; padding: 8px 10px; border-bottom: 1px solid var(--line); }
.inf2 .i2-tab td { padding: 8px 10px; border-bottom: 1px solid var(--line2); text-align: right; white-space: nowrap; }
.inf2 .i2-tab th:first-child, .inf2 .i2-tab td:first-child { text-align: left; white-space: normal; padding-left: 0; }
.inf2 .i2-tab tr.tema td { padding-top: 16px; font: 600 11px/1.2 Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--ink2); border-bottom: 1px solid var(--line); }
.inf2 .i2-tab td.bien { color: var(--bien); } .inf2 .i2-tab td.mal { color: var(--mal); } .inf2 .i2-tab td.igual { color: var(--mut); }
.inf2 .i2-tab .k { display: inline-block; margin-left: 6px; font-size: 10px; letter-spacing: .08em; color: var(--amb); text-transform: uppercase; }
.inf2 .i2-notas h4 { margin: 20px 0 8px; font: 600 11px/1.2 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-notas h4:first-child { margin-top: 0; }
.inf2 .i2-reg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.inf2 .i2-reg > div { padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,.035); font-size: 13px; line-height: 1.45; break-inside: avoid; }
.inf2 .i2-reg > div.go { box-shadow: inset 3px 0 0 var(--mal); }
.inf2 .i2-reg b { font-weight: 600; } .inf2 .i2-reg p { margin-top: 4px; font-size: 11.5px; color: var(--mut); overflow-wrap: anywhere; } .inf2 .i2-reg a { color: var(--ink2); }
.inf2 .i2-reg .fin { color: var(--ink2); } .inf2 .i2-reg .fin.mal { color: var(--mal); }
.inf2 .i2-notas ul, .inf2 .i2-notas ol { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; color: var(--ink2); } .inf2 .i2-notas li { margin: 4px 0; }
.inf2 .i2-pie { margin-top: 24px; font-size: 11.5px; color: var(--mut); }
@media (max-width: 900px) {
  .inf2 .i2-kpis { --n: 2 !important; }
  .inf2 .i2-redg, .inf2 .i2-fases { grid-template-columns: 1fr; }
  .inf2 .i2-redg .i2-gleg { justify-content: center; }
}
@media (max-width: 680px) {
  #su-inf .caja:has(> .inf2) { padding: 0 16px 20px; }
  .inf2 { font-size: 14px; }
  .inf2 .i2-top { margin: 0 -16px; padding: 10px 16px; }
  .inf2 .i2-btn { padding: 7px 10px; font-size: 12.5px; }
  .inf2 .i2-hero { padding-top: 20px; }
  .inf2 .i2-ver { grid-template-columns: 1fr; padding: 18px 18px 18px 22px; gap: 12px; }
  .inf2 .i2-kpis { gap: 8px; }
  .inf2 .i2-kpi { padding: 12px 12px 14px; }
  .inf2 .i2-kn { font-size: 13px; } .inf2 .i2-ku { font-size: 11.5px; }
  .inf2 .i2-kv b { font-size: 36px; }
  .inf2 .i2-charts { grid-template-columns: 1fr; gap: 12px; }
  .inf2 .i2-ch { padding: 14px 12px 8px; }
  .inf2 .i2-sec { margin-top: 36px; }
  .inf2 .i2-box { padding: 14px; }
  .inf2 .i2-rs { grid-template-columns: 1fr; }
  .inf2 .i2-reg { grid-template-columns: 1fr; }
  .inf2 .i2-tab { font-size: 12.5px; } .inf2 .i2-tab th, .inf2 .i2-tab td { padding: 7px 6px; }
  .inf2 details.i2-fold > summary { padding: 14px; flex-wrap: wrap; } .inf2 details.i2-fold > summary span { margin-left: 20px; text-align: left; width: 100%; }
  .inf2 .i2-fb { padding: 0 14px 14px; }
}
@media print {
  #su-inf .caja:has(> .inf2) { width: auto; background: #fff !important; border: 0; padding: 0; }
  .inf2 { --ink: #111; --ink2: #333; --mut: #6b6b6b; --line: #d4d4d4; --line2: #e8e8e8; --card: #fff; --bg: #fff; --bien: #12813a; --mal: #c0392b; --amb: #b86e00; --gris: #8a8a8a; --grid: #ececec;
    --bienbg: #e6f4ea; --malbg: #fbe9e7; --ambbg: #fff4e0; --track: #eee; color: #111; }
  .inf2 .i2-top { display: none; } .inf2 .i2-ver { background: #fff !important; }
  .inf2 .i2-tr i.ref { background: #bdbdbd; } .inf2 svg .ch0 { stroke: rgba(0,0,0,.14); } .inf2 svg .bl { stroke: #bbb; } .inf2 svg .cr, .inf2 .i2-tip { display: none !important; }
  .inf2 .i2-ch, .inf2 .i2-kpi, .inf2 .i2-box, .inf2 .i2-ev, .inf2 .i2-ver { break-inside: avoid; }
  .inf2 details.i2-fold > summary::before { display: none; }
}`;
function ponerCss() {
  if (document.getElementById('inf2-css')) return;
  if (!document.querySelector('link[data-inf2-fuentes]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.inf2Fuentes = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Geist:wght@400;500;600&display=swap'; document.head.appendChild(l); }
  const s = document.createElement('style'); s.id = 'inf2-css'; s.textContent = CSS; document.head.appendChild(s);
  // al imprimir se abren los plegables (tabla y notas) para que salgan en el PDF
  window.addEventListener('beforeprint', () => document.querySelectorAll('.inf2 details').forEach(d => { if (!d.open) { d.open = true; d.dataset.i2Cerrar = '1'; } }));
  window.addEventListener('afterprint', () => document.querySelectorAll('.inf2 details[data-i2-cerrar]').forEach(d => { d.open = false; delete d.dataset.i2Cerrar; }));
}

/* ---------- cambio entre dos valores ---------- */
function cambio(it, a, b) {
  if (a == null || b == null) return null;
  let d, txt, igual, dd;
  if (it.dif === 'pts') { d = (b - a) * (it.esc || 1); dd = Math.abs(d); igual = dd < 0.5; txt = `${SG(d)}${nf(dd, dd < 10 ? 1 : 0)} pts`; }
  else if (it.dif === 'db') { d = b - a; dd = Math.abs(d); igual = dd < 0.2; txt = `${SG(d)}${nf(dd, 1)} dB`; }
  else if (it.dif === 'abs') { d = Math.round(b - a); dd = Math.abs(d); igual = d === 0; txt = `${SG(d)}${nf(dd)} ${dd === 1 ? it.u[0] : it.u[1]}`; }
  else { if (Math.abs(a) < 1e-9) { d = b - a; dd = Math.abs(d); igual = dd < 1e-6; txt = `${SG(d)}${nf(dd)}`; } else { d = (b - a) / Math.abs(a); dd = Math.abs(d) * 100; igual = dd < 2; txt = `${SG(d)}${nf(dd, dd < 10 ? 1 : 0)} %`; } }
  const cls = igual ? 'igual' : ((d > 0) === it.sube ? 'bien' : 'mal');
  return { d, dd, txt, cls, igual };
}
const PALABRA = { bien: 'mejor', mal: 'peor', igual: 'casi igual' };
const tag = (c) => c ? `<span class="i2-tag ${c.cls}">${icono(c.igual ? 'igual' : c.d > 0 ? 'sube' : 'baja')}${esc(c.igual ? 'casi igual' : c.txt + ' · ' + PALABRA[c.cls])}</span>` : '';

/* ---------- series: promedio cada CADA semanas ---------- */
function serie(H, fn, n = H.length) {
  const out = []; n = Math.min(n, H.length);
  for (let i = 0; i < n; i += CADA) { let s = 0, k = 0; const j1 = Math.min(n, i + CADA); for (let j = i; j < j1; j++) { const v = fn(H[j]); if (v != null && isFinite(v)) { s += v; k++; } } if (k) out.push([H[j1 - 1].sem || j1, s / k]); }
  if (n && out.length && out[out.length - 1][0] !== (H[n - 1].sem || n)) { const v = fn(H[n - 1]); if (v != null && isFinite(v)) out.push([H[n - 1].sem || n, v]); }
  return out;
}
function paso(lo, hi, n) { const r = (hi - lo) / n || 1, p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }

/* ---------- gráfica en años: con (ámbar) y sin (gris punteada) en la misma escala ---------- */
function grafica(G, W) {
  const H = W < 480 ? 200 : 236, L = 46, R = W < 480 ? 66 : 78, T = 14, B = 28, pw = W - L - R, ph = H - T - B;
  const x = (w) => L + Math.max(0, Math.min(FIN, w)) / FIN * pw;
  const vs = G.s.map(p => p[1]).concat(G.r ? G.r.map(p => p[1]) : []); if (G.lim != null) vs.push(G.lim);
  let lo = Math.min(...vs), hi = Math.max(...vs); const pos = lo >= 0; if (hi - lo < 1e-9) { lo -= Math.abs(lo) * 0.1 || 1; hi += Math.abs(hi) * 0.1 || 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad; if (pos && lo < 0) lo = 0;
  const st = paso(lo, hi, 3); lo = Math.floor(lo / st) * st; if (pos && lo < 0) lo = 0; hi = Math.ceil(hi / st) * st;
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * ph, dec = st < 0.1 ? 2 : st < 1 ? 1 : 0;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(G.t)}: años 1 a 20">`;
  for (let v = lo; v <= hi + st * 1e-6; v += st) s += `<line class="gr" x1="${L}" x2="${L + pw}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="ax" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(G.fa ? G.fa(v) : nf(v, dec))}</text>`;
  s += `<line class="bl" x1="${L}" x2="${L + pw}" y1="${T + ph}" y2="${T + ph}"/>`;
  for (const a of [1, 5, 10, 15, 20]) { const xa = x((a - 0.5) * AÑO); s += `<text class="ax" x="${xa.toFixed(1)}" y="${T + ph + 18}" text-anchor="middle">${a === 1 ? 'año 1' : a}</text>`; }
  let yl = null, limArriba = true;
  if (G.lim != null) { yl = y(G.lim); limArriba = yl > T + 16; s += `<line class="lim" x1="${L}" x2="${L + pw}" y1="${yl.toFixed(1)}" y2="${yl.toFixed(1)}"/><text class="limt halo" x="${L + 6}" y="${(limArriba ? yl - 6 : yl + 14).toFixed(1)}">${esc(G.limTxt || 'límite')}</text>`; }
  const path = (P) => P.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('');
  const labs = []; // etiquetas finales: [y deseada, html]
  if (G.r && G.r.length) { s += `<path class="lr" d="${path(G.r)}"/>`; const e = G.r[G.r.length - 1], xe = x(e[0]), ye = y(e[1]);
    if (G.goB) { s += `<path class="gox" d="M${xe - 5},${ye - 5}L${xe + 5},${ye + 5}M${xe + 5},${ye - 5}L${xe - 5},${ye + 5}"/>`;
      // la etiqueta va donde menos choca: con la línea «con», su etiqueta final, la del límite y la del game over propio
      const txt = `${W < 480 || G.go ? 'sin: ' : 'sin propuesta: '}game over año ${añoDe(G.goB)}`, tw = txt.length * 6.3;
      const eC = G.s[G.s.length - 1], xC = x(eC[0]), yC = Math.max(T + 6, Math.min(T + ph - 4, y(eC[1])));
      const obs = [{ x0: xC - 6, x1: xC + 92, y0: yC - 14, y1: yC + 17 }];
      if (yl != null) { const b = limArriba ? yl - 6 : yl + 14; obs.push({ x0: L + 4, x1: L + 8 + (G.limTxt || 'límite').length * 6, y0: b - 11, y1: b + 3 }); }
      if (G.go) { const xg = x(G.go); obs.push({ x0: xg - 6 - 120, x1: xg, y0: T, y1: T + 16 }, { x0: xg - 2, x1: xg + 2, y0: T, y1: T + ph }); }
      const solapa = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
      let mejor = null;
      for (const [izq, dy] of [[false, -12], [false, 20], [true, -12], [true, 20]]) {
        const yy = ye + dy, r = { x0: izq ? xe - 9 - tw : xe + 9, x1: izq ? xe - 9 : xe + 9 + tw, y0: yy - 11, y1: yy + 3 };
        let c = obs.reduce((t, o) => t + solapa(r, o), 0); if (r.x0 < L - 30 || r.x1 > W - 2 || r.y0 < 0 || r.y1 > T + ph) c += 5000;
        for (const p of G.s) { const px = x(p[0]), py = y(p[1]); if (px >= r.x0 && px <= r.x1 && py >= r.y0 - 2 && py <= r.y1 + 2) c += 60; }
        if (!mejor || c < mejor.c) mejor = { c, izq, yy, xx: izq ? xe - 9 : xe + 9 }; }
      s += `<text class="got halo" x="${mejor.xx.toFixed(1)}" y="${mejor.yy.toFixed(1)}" text-anchor="${mejor.izq ? 'end' : 'start'}">${esc(txt)}</text>`; }
    else { s += `<circle class="dotr" cx="${xe.toFixed(1)}" cy="${ye.toFixed(1)}" r="4"/>`; labs.push({ y: ye, x: xe, cls: 'valr', t: G.fy(e[1]), sn: 'sin' }); } }
  s += `<path class="ln" d="${path(G.s)}"/>`;
  const e = G.s[G.s.length - 1], xe = x(e[0]), ye = y(e[1]);
  if (G.go) { const xg = x(G.go); s += `<line class="gol" x1="${xg.toFixed(1)}" x2="${xg.toFixed(1)}" y1="${T}" y2="${T + ph}"/>`;
    s += `<text class="got halo" x="${(xg - 6).toFixed(1)}" y="${T + 12}" text-anchor="end">game over · año ${añoDe(G.go)}</text>`; }
  s += `<circle class="dot" cx="${xe.toFixed(1)}" cy="${ye.toFixed(1)}" r="5"/>`;
  labs.push({ y: ye, x: xe, cls: 'val', t: G.fy(e[1]), sn: G.r ? 'con' : '' });
  // separa las etiquetas que se montan (mínimo 30 px: valor + nombre debajo)
  labs.sort((a, b) => a.y - b.y); for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 30) { const m = (labs[i].y + labs[i - 1].y) / 2; labs[i - 1].y = m - 15; labs[i].y = m + 15; }
  for (const l of labs) { const yy = Math.max(T + 6, Math.min(T + ph - 4, l.y)), xx = Math.min(W - R + 10, l.x + 10);
    s += `<text class="${l.cls} halo" x="${xx.toFixed(1)}" y="${(yy + (l.sn ? 0 : 5)).toFixed(1)}">${esc(l.t)}</text>`;
    if (l.sn) s += `<text class="sn halo" x="${xx.toFixed(1)}" y="${(yy + 13).toFixed(1)}">${W < 480 ? l.sn : l.sn === 'con' ? 'con propuesta' : 'sin propuesta'}</text>`; }
  s += `<g class="i2-x" style="display:none"><line class="cr" y1="${T}" y2="${T + ph}"/><circle class="dot" r="4.5"/></g>`;
  return { svg: s + '</svg>', x, y, L, pw, T, ph, H };
}

/* ---------- la «bola» de interacciones (estado final; perdidas en rojo, nuevas en verde) ---------- */
function bola(RD, W, presF, presFl, cambiosF) {
  const N = RD.nodos.length, full = W >= 420, lab = full ? 96 : 66, Rr = Math.max(64, (W - 2 * lab) / 2 - 4), cx = W / 2, cy = Rr + lab + 2, H = Math.round(cy + Rr + 34); // abajo solo hay plantas (sin nombres): menos margen
  // orden: por grupo; las plantas, según el ángulo medio de la fauna con la que se relacionan (menos cruces)
  const ord = []; for (const G of GRUPOS) if (G.k !== 'pla') RD.nodos.forEach((n, i) => { if (n.g === G.k) ord.push(i); });
  const posF = new Map(ord.map((i, k) => [i, k])); const pla = RD.nodos.map((n, i) => i).filter(i => RD.nodos[i].g === 'pla');
  const m = new Map(pla.map(i => [i, []])); for (const [a, b] of RD.enl) { if (m.has(a) && posF.has(b)) m.get(a).push(posF.get(b)); if (m.has(b) && posF.has(a)) m.get(b).push(posF.get(a)); }
  pla.sort((a, b) => { const ma = m.get(a), mb = m.get(b); const va = ma.length ? ma.reduce((s, v) => s + v, 0) / ma.length : 99, vb = mb.length ? mb.reduce((s, v) => s + v, 0) / mb.length : 99; return vb - va; });
  ord.push(...pla);
  const WF = 2.6, gap = 2.6, ngr = GRUPOS.filter(G => ord.some(i => RD.nodos[i].g === G.k)).length, nFa = ord.length - pla.length, paso1 = 2 * Math.PI / (nFa * WF + pla.length + ngr * gap);
  const ang = new Float64Array(N); let a = -Math.PI / 2 - paso1 * nFa * WF * 0.5, prev = null; const arcos = [];
  for (const i of ord) { const n = RD.nodos[i], g = n.g, w = n.fa ? WF : 1; if (prev !== null && g !== prev) a += paso1 * gap; a += paso1 * w / 2; if (g !== prev) arcos.push({ g, a0: a }); ang[i] = a; arcos[arcos.length - 1].a1 = a; a += paso1 * w / 2; prev = g; }
  const P = (i, r = Rr) => [cx + r * Math.cos(ang[i]), cy + r * Math.sin(ang[i])];
  const vivo = (i) => RD.nodos[i].fa ? presF.has(RD.nodos[i].id) : presFl.has(RD.nodos[i].id);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Red de interacciones al final">`;
  for (const A of arcos) { const r = Rr + 8, p0 = [cx + r * Math.cos(A.a0 - paso1 * .4), cy + r * Math.sin(A.a0 - paso1 * .4)], p1 = [cx + r * Math.cos(A.a1 + paso1 * .4), cy + r * Math.sin(A.a1 + paso1 * .4)], big = A.a1 - A.a0 > Math.PI ? 1 : 0;
    s += `<path class="ga" style="stroke:var(--g-${A.g})" d="M${p0[0].toFixed(1)},${p0[1].toFixed(1)}A${r},${r} 0 ${big} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)}"/>`;
    if (A.g === 'pla') { const am = (A.a0 + A.a1) / 2, rr = Rr + 20; s += `<text class="gl" x="${(cx + rr * Math.cos(am)).toFixed(1)}" y="${(cy + rr * Math.sin(am) + 4).toFixed(1)}" text-anchor="${Math.cos(am) < -0.2 ? 'end' : Math.cos(am) > 0.2 ? 'start' : 'middle'}">Plantas (${pla.length})</text>`; } }
  const cuerda = (i, j) => { const [x1, y1] = P(i, Rr - 5), [x2, y2] = P(j, Rr - 5), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, qx = cx + (mx - cx) * 0.18, qy = cy + (my - cy) * 0.18; return `M${x1.toFixed(1)},${y1.toFixed(1)}Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; };
  let c0 = '', cp = '', cn = '';
  for (const [i, j] of RD.enl) { const st = cambiosF.get(i + '|' + j); if (st === 'perdida') cp += cuerda(i, j); else if (st === 'nueva') cn += cuerda(i, j); else if (vivo(i) && vivo(j)) c0 += cuerda(i, j); }
  s += `<path class="ch0" d="${c0}"/>` + (cp ? `<path class="chp" d="${cp}"/>` : '') + (cn ? `<path class="chn" d="${cn}"/>` : '');
  for (const i of ord) { const n = RD.nodos[i], [x, y] = P(i), fuera = !vivo(i), cl = fuera ? ((n.fa || !RD.floraNuevas.includes(n.id)) ? ' fuera' : ' aun') : '';
    const r = n.fa ? 4.4 : 2.6; s += `<circle class="nd${cl}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" style="fill:var(--g-${n.g})"><title>${esc(n.n)} · ${GRUPOS.find(G => G.k === n.g).n}${fuera ? ' · ya no está en Kennedy' : ''}</title></circle>`;
    if (n.fa) { const c = Math.cos(ang[i]), izq = c < 0, [lx, ly] = P(i, Rr + 15), rot = ang[i] * 180 / Math.PI + (izq ? 180 : 0);
      const cls = !vivo(i) ? ' fuera' : (cambiosF.get('v:' + n.id) ? ' vuelve' : '');
      s += `<text class="nl${cls}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" dy="3.5" text-anchor="${izq ? 'end' : 'start'}" transform="rotate(${rot.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${esc(full ? n.n : n.c)}</text>`; } }
  return s + '</svg>';
}

/* presencia de la fauna en el tiempo: si ind() trae `presentes` (ids) se usa; si no, se reconstruye con las extinciones semanales
   (todas presentes al inicio cuando fauna0 = 23; una extinción la quita; si el conteo `fauna` del modelo sube, vuelve la última que desapareció) */
function presenciaFauna(H, ext) {
  const ids = FAUNA.map(f => f[0]), L = H[H.length - 1];
  if (Array.isArray(H[0].presentes) && Array.isArray(L.presentes)) return { ini: new Set(H[0].presentes), fin: new Set(L.presentes), volvieron: [], fuera: [], exacto: true };
  const set = new Set(ids), pila = [], volvieron = [], porSem = new Map();
  const E = []; for (const h of H) if (h.extinciones && h.extinciones.length) E.push(...h.extinciones); const XS = E.length ? E : (ext || []);
  for (const x of XS) { if (!porSem.has(x.sem)) porSem.set(x.sem, []); porSem.get(x.sem).push(x); }
  const fuera = [];
  for (const h of H) { for (const x of porSem.get(h.sem) || []) { if (set.delete(x.especie)) { pila.push(x); fuera.push(x); } }
    while (h.fauna != null && h.fauna > set.size && pila.length) { const x = pila.pop(); set.add(x.especie); volvieron.push({ ...x, semVuelve: h.sem }); } }
  return { ini: new Set(ids), fin: set, volvieron, fuera, exacto: H[0].fauna0 === ids.length };
}

/* ======================================================================= */
let OBS = null;
export function abrirInforme2({ parametros={}, definiciones=[], cont, sim, def = {}, hist, base = null, reglas = [], go = null, eventos = [], extinciones = [], ind = [], semilla = 1, onCerrar = null }) {
  const t0 = performance.now();
  if (!cont || !hist || !hist.length) return null;
  ponerCss();
  const H = hist, nH = H.length, L = H[nH - 1], wFin = L.sem || nH;
  const i1 = Math.min(nH - 1, AÑO - 1), A1 = H[i1]; // año 1 = semana 52 (el modelo ya se asentó; arranca por debajo de su equilibrio)
  const B = base && base.length && sim !== 1 ? base : null;
  const nC = B ? Math.min(nH, B.length) : 0, HC = B ? H[nC - 1] : null, BC = B ? B[nC - 1] : null, wC = HC ? (HC.sem || nC) : 0;
  const baseCorta = B && B.length < nH, añoC = añoDe(wC);
  const indMap = new Map((ind || []).map(x => [x.k, x]));
  const IT = (it) => { const o = indMap.get(it.k); return o ? { ...it, n: o.n || it.n, sube: o.sube != null ? o.sube : it.sube, f: it.f } : it; };
  const conProp = def.propuesta != null ? !!def.propuesta : (def.grupo === 'propuesta');
  const RG = (reglas && reglas.length ? reglas : Object.keys(VAL).map(k => ({ k, n: k, umbral: UMB[k] }))).filter(r => ['abasto','habitat','residuos'].includes(r.k));
  const umb = (k) => { const r = RG.find(x => x.k === k); return r && r.umbral != null ? r.umbral : UMB[k]; };

  /* --- game over de la pareja sin propuesta (si se detuvo antes de los 15 años): la regla que estaba cruzada en su última semana --- */
  const goB = B?.at(-1)?.evaluacion?.territorio?.gameOver;
  /* --- comparaciones de los indicadores clave (veredicto) y tabla completa --- */
  const temas = TEMAS.map(T => ({ ...T, items: T.items.map(IT).filter(it => get(L, it.k) != null && (!it.soloSi || it.soloSi(H)) && !(H.every(h => !get(h, it.k)) && (!B || B.every(h => !get(h, it.k))))) })).filter(T => T.items.length);
  const comps = [], filas = [];
  for (const T of temas) { filas.push(`<tr class="tema"><td colspan="4">${esc(T.n)}</td></tr>`);
    for (const it of T.items) {
      const ha = B ? BC : A1, hb = B ? HC : L, a = get(ha, it.k), b = get(hb, it.k), c = cambio(it, a, b);
      if (it.clave && c) comps.push({ it, c });
      filas.push(`<tr><td>${esc(it.n)}${it.clave ? '<span class="k">clave</span>' : ''}</td><td>${a == null ? '—' : esc(it.f(a, ha))}</td><td>${b == null ? '—' : esc(it.f(b, hb))}</td><td class="${c ? c.cls : ''}">${c ? (c.igual ? 'casi igual' : esc(c.txt) + ' · ' + PALABRA[c.cls]) : '—'}</td></tr>`); } }

  /* --- reglas: valor final, máximo acercamiento --- */
  const estR = RG.map(r => { let mx = 0, wmx = 0; for (let i = 0; i < nH; i += 2) { const p = prox(r.k, VAL[r.k](H[i]), r.umbral); if (p > mx) { mx = p; wmx = H[i].sem; } }
    const vF = VAL[r.k](L); return { r, vF, pF: prox(r.k, vF, r.umbral), mx, wmx }; });
  const cerca = estR.filter(e => !go && e.pF >= 2 / 3).sort((a, b) => b.pF - a.pF);

  /* --- veredicto (mismos criterios de la versión 2) --- */
  const frente = B ? 'frente a la misma prueba sin propuesta' : 'frente al año 1';
  const mejor = comps.filter(x => x.c.cls === 'bien').sort((a, b) => b.c.dd - a.c.dd), peor = comps.filter(x => x.c.cls === 'mal').sort((a, b) => b.c.dd - a.c.dd), igual = comps.filter(x => x.c.cls === 'igual');
  const nom = (arr, k = 3) => lista(arr.slice(0, k).map(x => min1(x.it.n)));
  let V, razon, frase;
  if (go) { const R = RG.find(r => r.k === go.regla) || {};
    V = { t: 'No', cls: 'mal', ic: 'no' }; razon = `Kennedy llegó a game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}): ${go.motivo || R.n}.`;
    frase = `Kennedy llega a game over en el año ${añoDe(go.sem)}: ${go.motivo || CORTO_R[go.regla] || R.n}.`; }
  else {V={t:nH>=FIN?'Horizonte completo':'En curso',cls:'parte',ic:'parte'};razon='La evaluación por sistema considera pérdidas locales, tendencias y datos disponibles.';frase=razon;}

  /* alerta: la pareja sin propuesta llegó a game over y esta no (o más tarde) */
  let alerta = '';
  if (goB && conProp) { const qué = goB.regla ? ` por ${CORTO_R[goB.regla] || min1(goB.n || goB.regla)}` : '';
    alerta = `<div class="i2-alerta">${icono('gameover')}<p><b>Sin propuesta, Kennedy llega a game over en el año ${añoDe(goB.sem)}</b>${esc(qué)}. ${go ? `Con propuesta llega en el año ${añoDe(go.sem)}.` : nH >= FIN ? 'Con propuesta llega a los 15 años sin game over.' : ''} Las cifras se comparan en el año ${añoC}, la última semana que tienen las dos.</p></div>`; }

  /* --- métricas: las del par primero; luego la regla del game over (o la más cercana) y relleno --- */
  const tiene = (k) => MET[k] && H.some(h => MET[k].v(h) != null);
  const reglaFoco = go ? go.regla : goB && goB.regla ? goB.regla : (estR.slice().sort((a, b) => b.mx - a.mx)[0] || {}).r ? estR.slice().sort((a, b) => b.mx - a.mx)[0].r.k : null;
  const llaves = []; const pon = (k) => { if (k && !llaves.includes(k) && tiene(k)) llaves.push(k); };
  (PAR_MET[def.par] || []).forEach(pon); pon(REGLA_MET[reglaFoco]);
  const limDe = (k) => { const rk = Object.keys(REGLA_MET).find(r => REGLA_MET[r] === k); if (rk) { const u = umb(rk); return rk === 'trafico' ? u * 100 : u; } return MET[k].lim; };

  /* --- héroe: cifras clave --- */
  const kpiK = llaves.slice(); // relleno del héroe: los indicadores clave que más cambiaron (como métrica genérica si no hay una propia)
  const extra = [...mejor, ...peor].sort((a, b) => b.c.dd - a.c.dd);
  const kpis = kpiK.map(k => ({ k, M: MET[k] }));
  for (const x of extra) { if (kpis.length >= 4) break; const mk = x.it.m; if (mk && kpis.some(q => q.k === mk)) continue; if (mk && tiene(mk)) { kpis.push({ k: mk, M: MET[mk] }); continue; }
    kpis.push({ k: x.it.k, M: { n: x.it.n, u: '', v: (h) => get(h, x.it.k), f: (v) => x.it.f(v, L), fh: x.it.f, sube: x.it.sube, dif: x.it.dif, esc: x.it.esc, u2: x.it.u } }); }
  for (const k of RELLENO) { if (kpis.length >= 3) break; if (!kpis.some(q => q.k === k) && tiene(k)) kpis.push({ k, M: MET[k] }); }
  const kpi = ({ M }) => {
    const ha = B ? BC : A1, hb = B ? HC : L, a = M.v(ha), b = M.v(hb), it = { ...M, u: M.u2 || ['', ''] }, c = cambio(it, a, b);
    const fa = (v, h) => v == null ? '—' : (M.fh ? M.fh(v, h) : M.f(v)), lim = M.lim != null && M.dif === 'pts' ? limDe(Object.keys(MET).find(k => MET[k] === M)) : null;
    const mx = Math.max(Math.abs(a || 0), Math.abs(b || 0), lim || 0, M.dif === 'pts' && Math.max(a || 0, b || 0) <= 100 && Math.max(a || 0, b || 0) > 40 ? 100 : 0) || 1;
    const w = (v) => (Math.abs(v || 0) / mx * 100).toFixed(1);
    return `<div class="i2-kpi"><div class="i2-kn">${esc(M.n)}</div>${M.u ? `<div class="i2-ku">${esc(M.u)}</div>` : ''}
      <div class="i2-kv"><b>${esc(fa(b, hb))}</b>${tag(c)}</div>
      <div class="i2-bars"><div class="i2-bar"><span>${B ? 'Con propuesta' : `Año ${añoDe(wFin)}`}</span><span>${esc(fa(b, hb))}</span><div class="i2-tr"><i class="${c ? c.cls : ''}" style="width:${w(b)}%"></i></div></div>
        <div class="i2-bar ref"><span>${B ? 'Sin propuesta' : 'Año 1'}</span><span>${esc(fa(a, ha))}</span><div class="i2-tr"><i class="ref" style="width:${w(a)}%"></i></div></div></div></div>`; };
  const htmlKpis = kpis.length ? `<div class="i2-cmp"><div class="i2-cmph"><span class="i2-lab">${B ? 'Con propuesta frente a sin propuesta' : 'Del año 1 al final'}</span><span>${B ? `Misma prueba, mismos valores · año ${añoC}` : `Año 1 → año ${añoDe(wFin)}`}</span></div>
    <div class="i2-kpis" style="--n:${kpis.length}">${kpis.map(kpi).join('')}</div></div>` : '';

  const años = wFin / AÑO, parN = def.parN || '', escenario = def.par != null ? (conProp ? 'Con propuesta' : 'Sin propuesta') : '';
  const titulo = def.parN ? def.parN.replace(/^\d+\s*/, '') : (def.n || `Simulación ${sim}`);
  const numPar = def.parN ? (def.parN.match(/^\d+/) || [''])[0] : '';
  const htmlHero = `<div class="i2-top"><span class="i2-k">Informe final · ${esc(parN || 'simulación ' + sim)}${escenario ? ' · ' + esc(min1(escenario)) : ''}</span><button class="i2-btn" data-i2-imp>Imprimir / PDF</button><button class="i2-btn pri" data-i2-x>Cerrar</button></div>
    <header class="i2-hero"><div class="i2-kick">${numPar ? `<span>Par ${esc(numPar)} de 06</span>` : `<span>Simulación ${esc(sim)}</span>`}${escenario ? `<span class="i2-pill ${conProp ? 'con' : ''}">${esc(escenario)}</span>` : ''}<span>${nf(años, años % 1 ? 1 : 0)} de 15 años${go ? ' · se detuvo por game over' : ''}</span></div>
      <h2 class="i2-tit" style="margin-bottom:0">${esc(titulo)}</h2>${def.pregunta ? `<p class="i2-preg">${esc(def.pregunta)}</p>` : ''}
      <div class="i2-ver ${V.cls}"><div class="i2-vbig"><small>¿Fue sostenible?</small><div class="i2-vw">${icono(V.ic)}${V.t}</div></div>
        <div><p class="i2-vf">${esc(frase)}</p><div class="i2-vs"><span class="i2-cnt bien">${icono('sube')}<b>${mejor.length}</b> mejoran</span><span class="i2-cnt mal">${icono('baja')}<b>${peor.length}</b> empeoran</span><span class="i2-cnt">${icono('igual')}<b>${igual.length}</b> casi iguales</span><span class="i2-cntt">de ${comps.length} indicadores clave, ${esc(frente)}</span></div></div>
        ${alerta}</div>
      ${htmlKpis}</header>`;

  /* --- curvas: máximo 4 (métricas del par primero) --- */
  const grK = llaves.slice(); for (const k of RELLENO) { if (grK.length >= 4) break; if (!grK.includes(k) && tiene(k)) grK.push(k); }
  const GR = grK.slice(0, 4).map(k => { const M = MET[k], lim = limDe(k);
    return { k, t: M.t, sub: M.ay, fn: M.v, fy: M.f, fa: k === 'suelo' ? (v) => '×' + nf(v, 2) : null, lim: lim != null ? lim : null, limTxt: M.limTxt ? (k === 'cora' ? 'tope de Corabastos' : M.limTxt) : null }; });
  GR.forEach(g => { g.s = serie(H, g.fn); g.r = B ? serie(B, g.fn) : null; if (g.r && !g.r.length) g.r = null; g.go = go ? go.sem : null; g.goB = goB && g.r ? goB.sem : null; });
  const GRv = GR.filter(g => g.s.length > 1);
  const htmlGr = GRv.length ? `<section class="i2-sec"><div class="i2-sh"><div><span class="i2-lab">Cómo cambió en 15 años</span><h3 class="i2-st">${esc(may1(lista(GRv.slice(0, 2).map((g, i) => i ? min1(MET[g.k].n) : MET[g.k].n))))}</h3></div>
      <div class="i2-leg"><span><i></i>${B ? 'Con propuesta' : 'Esta simulación'}</span>${B ? '<span><i class="ref"></i>Sin propuesta</span>' : ''}${GRv.some(g => g.lim != null) ? '<span><i class="lim"></i>Límite</span>' : ''}</div></div>
    <div class="i2-charts">${GRv.map((g, i) => `<figure class="i2-ch" data-i2-g="${i}" style="margin:0"><div class="i2-cht">${esc(g.t)}</div><div class="i2-chs">${esc(g.sub)}</div><div data-i2-svg></div><div class="i2-tip"></div></figure>`).join('')}</div></section>` : '';

  /* --- red + lo que pasó --- */
  const PF = presenciaFauna(H, extinciones);
  // avisos: sin repetir la misma especie que desaparece dos veces en la misma semana (aviso de la interfaz + aviso del modelo)
  const EV = []; for (const e of (eventos || []).filter(e => e && e.titulo).slice().sort((a, b) => a.sem - b.sem)) {
    const m = /^Desapareci[oó] (.+)$/.exec(e.titulo); if (m && EV.some(o => o.sem === e.sem && o.titulo.includes(m[1]))) continue;
    const dup = EV.findIndex(o => o.sem === e.sem && /^Desapareci[oó] /.test(o.titulo) && e.titulo.includes(o.titulo.replace(/^Desapareci[oó] /, ''))); if (dup >= 0) { EV[dup] = e; continue; }
    if (EV.some(o => o.sem === e.sem && o.titulo === e.titulo)) continue; EV.push(e); }
  const evRow = (e) => { const g = /^game over/i.test(e.titulo), cls = g || e.signo < 0 ? 'mal' : e.signo > 0 ? 'bien' : '';
    return `<div class="i2-ev ${cls}"${e.texto ? ` title="${esc(e.texto)}"` : ''}><div class="i2-ea">Año ${añoDe(e.sem)}</div><div class="i2-eb" aria-label="${e.signo > 0 ? 'bueno' : e.signo < 0 ? 'malo' : 'neutro'}">${icono(g ? 'gameover' : e.tipo)}</div><div class="i2-et">${esc(e.titulo)}</div></div>`; };
  const nBue = EV.filter(e => e.signo > 0).length, nMal = EV.filter(e => e.signo < 0 || /^game over/i.test(e.titulo)).length;
  const htmlEv = `<section class="i2-sec"><div class="i2-sh"><div><span class="i2-lab">Línea de tiempo</span><h3 class="i2-st">Lo que pasó, por plazo</h3></div>
      <div class="i2-leg"><span><span class="i2-eb bien">${icono('sube')}</span>${nBue} buenos</span><span><span class="i2-eb mal">${icono('baja')}</span>${nMal} malos</span><span>${EV.length} avisos del modelo</span></div></div>
    <div class="i2-fases">${FASES.map(F => { const es = EV.filter(e => { const a = añoDe(e.sem); return a >= F.a0 && a <= F.a1; });
      return `<div class="i2-box"><div class="i2-fh"><b>${F.n}</b><span>años ${F.a0}–${F.a1}</span></div>${es.length ? es.slice(0, 8).map(evRow).join('') + (es.length > 8 ? `<details class="i2-mas"><summary>Ver ${es.length - 8} avisos más</summary>${es.slice(8).map(evRow).join('')}</details>` : '') : `<p class="i2-vacio">${añoDe(wFin) < F.a0 ? 'La corrida terminó antes de este plazo.' : 'Sin avisos en estos años.'}</p>`}</div>`; }).join('')}</div></section>`;
  const htmlRed = `<section class="i2-sec"><div class="i2-sh"><div><span class="i2-lab">Red de la vida</span><h3 class="i2-st">Relaciones entre especies al final</h3></div>
      <p class="i2-sd">Cada punto es una especie y cada curva una relación: comer, polinizar, dispersar semillas o anidar.</p></div>
    <div class="i2-box" data-i2-red><p class="i2-nota">Cargando la red…</p></div></section>`;

  /* --- tabla completa + notas y fuentes --- */
  const htmlTab = `<details class="i2-fold"><summary>Todos los indicadores<span>${B ? `Sin propuesta frente a con propuesta · año ${añoC}` : `Año 1 frente al año ${añoDe(wFin)}`}</span></summary><div class="i2-fb">
    <table class="i2-tab"><thead><tr><th>Indicador</th><th>${B ? 'Sin propuesta' : 'Año 1'}</th><th>${B ? 'Con propuesta' : 'Final'}</th><th>Diferencia</th></tr></thead><tbody>${filas.join('')}</tbody></table></div></details>`;
  const link = (t) => esc(t).replace(/https?:\/\/[^\s)<]+/g, (u) => { const m = u.match(/[.,;]+$/), uu = m ? u.slice(0, -m[0].length) : u; return `<a href="${uu}" target="_blank" rel="noopener">${uu}</a>${m ? m[0] : ''}`; });
  const htmlNotas = `<details class="i2-fold"><summary>Notas y fuentes<span>Reglas de game over, cómo se decide el veredicto y supuestos</span></summary><div class="i2-fb i2-notas">
    <h4>Evaluación</h4><p>Umbrales experimentales de Bavaria Común. Cuatro semanas consecutivas en un sector, estación o parche confirman un colapso local. La ejecución completa termina cuando el indicador agregado de Kennedy incumple durante cuatro semanas.</p>
    <h4>Reglas de game over · iguales para las 12 simulaciones</h4>
    <div class="i2-reg">${RG.map(r => { const e = estR.find(x => x.r.k === r.k), es = go && go.regla === r.k; return `<div class="${es ? 'go' : ''}"><b>${esc(r.n)}</b>: game over si ${esc(r.txt || '')}.${e ? ` <span class="fin ${es || e.pF >= 2 / 3 ? 'mal' : ''}">Al final: ${esc(fmtR(r.k, e.vF))}${es ? ' · se cumplió' : ''}.</span>` : ''}${r.fuente ? `<p>Fuente: ${link(r.fuente)}</p>` : ''}</div>`; }).join('')}</div>
    <h4>Supuestos de este informe</h4><ul>
      <li>Todo sale del modelo semanal (data3d/simulaciones12.js) con la semilla ${esc(semilla)}: la misma semilla da siempre el mismo resultado.</li>
      <li>«Año 1» es la semana 52: el modelo arranca por debajo de su equilibrio (la ocupación de la fauna se duplica en las primeras ~40 semanas), así que la semana 1 exageraría los cambios.</li>
      ${B ? `<li>La comparación es con la misma prueba sin propuesta, con los mismos valores de las variables y la misma semilla, en la misma semana (año ${añoC})${baseCorta ? ', porque la versión sin propuesta se detuvo por game over' : ''}.</li>` : ''}
      <li>Las curvas promedian cada ${CADA} semanas; el punto final es el último valor.</li>
      <li>Red: ${PF.exacto ? '' : 'el modelo no informa qué especies faltaban al inicio; '}la presencia de la fauna se ${PF.volvieron.length || !Array.isArray(L.presentes) ? 'reconstruye con las extinciones de cada semana (si una especie vuelve, se toma la última que desapareció)' : 'toma del modelo'}. Plantas: censo de árboles SIGAU y bosque de Bavaria; las nativas de los módulos de huertas se suman cuando sube el conteo de flora del modelo. Una relación está activa si sus dos especies viven en Kennedy.</li>
    </ul><p class="i2-pie">Informe generado en el navegador a partir de ${nf(nH)} semanas simuladas${B ? ` y ${nf(B.length)} de la pareja sin propuesta` : ''}.</p></div></details>`;

  cont.scrollTop = 0;
  cont.innerHTML = `<div class="inf2">${htmlHero}${htmlGr}${htmlRed}${htmlEv}<section class="i2-sec" style="margin-top:40px">${htmlTab}${htmlNotas}</section></div>`;
  const root = cont.firstElementChild;
  adjuntarBalance(root,{sim,def,H,go,semilla,parametros,definiciones});
  root.querySelector('[data-i2-imp]').onclick = () => window.print();
  root.querySelector('[data-i2-x]').onclick = () => { if (onCerrar) onCerrar(); else { const s = cont.closest('#su-inf'); if (s) s.classList.remove('on'); } };

  /* --- partes que dependen del ancho (se rehacen al cambiar de tamaño) --- */
  function pintarGraficas() {
    const figs = [...root.querySelectorAll('[data-i2-g]')], anchos = figs.map(f => f.querySelector('[data-i2-svg]').clientWidth); // un solo cálculo de layout
    figs.forEach((fig, k) => { const g = GRv[+fig.dataset.i2G], box = fig.querySelector('[data-i2-svg]'), W = Math.max(260, Math.floor(anchos[k] || 320));
      const R = grafica(g, W); box.innerHTML = R.svg; const svg = box.firstElementChild, cr = svg.querySelector('.i2-x'), ln = cr.firstElementChild, dt = cr.lastElementChild, tip = fig.querySelector('.i2-tip');
      const mover = (ev) => { const bb = svg.getBoundingClientRect(), px = (ev.clientX - bb.left) * (W / bb.width); const w = (px - R.L) / R.pw * FIN; if (w < 0 || w > FIN) { salir(); return; }
        let best = g.s[0]; for (const p of g.s) if (Math.abs(p[0] - w) < Math.abs(best[0] - w)) best = p;
        let rb = null; if (g.r) for (const p of g.r) if (!rb || Math.abs(p[0] - best[0]) < Math.abs(rb[0] - best[0])) rb = p; if (rb && Math.abs(rb[0] - best[0]) > 8) rb = null;
        const xx = R.x(best[0]); ln.setAttribute('x1', xx); ln.setAttribute('x2', xx); dt.setAttribute('cx', xx); dt.setAttribute('cy', R.y(best[1])); cr.style.display = '';
        tip.innerHTML = `<b>Año ${añoDe(best[0])}</b><br><i></i>${g.r ? 'Con propuesta' : 'Valor'}: <b>${esc(g.fy(best[1]))}</b>${rb ? `<br><i class="ref"></i>Sin propuesta: <b>${esc(g.fy(rb[1]))}</b>` : ''}`;
        tip.style.display = 'block'; const fx = svg.offsetLeft + xx * (bb.width / W), tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(fig.clientWidth - tw - 4, fx + 14 > fig.clientWidth - tw ? fx - tw - 14 : fx + 14)) + 'px'; tip.style.top = (svg.offsetTop + 6) + 'px'; };
      const salir = () => { cr.style.display = 'none'; tip.style.display = 'none'; };
      svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover); svg.addEventListener('pointerleave', salir); });
  }
  let RD = null;
  function pintarRed() {
    const box = root.querySelector('[data-i2-red]'); if (!box || !RD) return;
    const fl0 = new Set(RD.floraHoy), dF = (L.flora != null && H[0].flora != null) ? L.flora - H[0].flora : 0, flF = new Set(fl0);
    if (dF > 0) RD.floraNuevas.slice(0, dF).forEach(id => flF.add(id)); // nativas de los módulos de huertas
    if (dF < 0) RD.soloBosque.slice(0, -dF).forEach(id => flF.delete(id)); // tala del bosque de Bavaria
    const vivo0 = (n) => n.fa ? PF.ini.has(n.id) : fl0.has(n.id), vivoF = (n) => n.fa ? PF.fin.has(n.id) : flF.has(n.id);
    const camb = new Map(); let nP = 0, nN = 0;
    for (const [i, j] of RD.enl) { const A = RD.nodos[i], Bn = RD.nodos[j], e0 = vivo0(A) && vivo0(Bn), eF = vivoF(A) && vivoF(Bn);
      if (e0 && !eF) { camb.set(i + '|' + j, 'perdida'); nP++; } else if (!e0 && eF) { camb.set(i + '|' + j, 'nueva'); nN++; } }
    for (const v of PF.volvieron) if (PF.fin.has(v.especie)) camb.set('v:' + v.especie, true);
    const bw = box.clientWidth || 400, W = Math.min(440, Math.max(270, Math.floor(bw >= 760 ? 440 : bw - 32)));
    const fuera = FAUNA.filter(f => !PF.fin.has(f[0])), ultimaExt = (id) => PF.fuera.filter(e => e.especie === id).pop();
    const volv = [...new Map(PF.volvieron.filter(v => PF.fin.has(v.especie)).map(v => [v.especie, v])).values()];
    const nueF = RD.floraNuevas.filter(id => flF.has(id) && !fl0.has(id)).map(id => RD.nodos.find(n => n.id === id).n);
    const r1 = get(A1, 'red'), rF = get(L, 'red');
    box.innerHTML = `<div class="i2-redg"><div class="i2-ball">${bola(RD, W, PF.fin, flF, camb)}</div><div>
      <div class="i2-gleg">${GRUPOS.map(G => `<span><i style="background:var(--g-${G.k})"></i>${G.n}</span>`).join('')}</div>
      <div class="i2-gleg"><span><i class="l" style="border-color:var(--mal)"></i>Relación perdida</span><span><i class="l" style="border-color:var(--bien)"></i>Relación nueva</span><span><i class="l" style="border-color:rgba(238,241,244,.35)"></i>Sigue igual</span></div>
      <div class="i2-rs"><div><b class="${nP ? 'mal' : ''}">${nf(nP)}</b>relaciones perdidas${fuera.length ? ' (se fue ' + esc(lista(fuera.map(f => f[1]))) + ')' : ''}</div>
        <div><b class="${nN ? 'bien' : ''}">${nf(nN)}</b>relaciones nuevas${nueF.length ? ' con plantas nativas de las huertas' : ''}</div>
        <div><b>${r1 != null && rF != null && r1 ? SG(rF - r1) + nf(Math.abs(rF - r1) / r1 * 100) + ' %' : '—'}</b>interacciones en todos los lugares, año 1 → final</div></div>
      ${fuera.length || volv.length ? `<p class="i2-nota">${fuera.map(f => { const x = ultimaExt(f[0]); return `<b>${esc(f[1])}</b> desapareció${x ? ` en el año ${añoDe(x.sem)}${x.motivo ? ': ' + esc(min1(x.motivo)) : ''}` : ''}.`; }).join(' ')} ${volv.map(v => `<b>${esc(v.nombre || v.especie)}</b> desapareció en el año ${añoDe(v.sem)} y volvió en el año ${añoDe(v.semVuelve)}.`).join(' ')}</p>` : '<p class="i2-nota">Ninguna especie desapareció de Kennedy en esta corrida.</p>'}
      <p class="i2-nota">El diagrama marca las relaciones que se pierden o aparecen cuando una especie sale o entra a Kennedy; el indicador de interacciones cuenta además cada relación en cada lugar donde ocurre.</p></div></div>`;
  }
  pintarGraficas();
  cargarRed().then(R => { RD = R; if (root.isConnected) pintarRed(); }).catch(e => { const b = root.querySelector('[data-i2-red]'); if (b) b.innerHTML = `<p class="i2-nota">No se pudo cargar la red biótica (${esc(e.message)}).</p>`; });

  if (OBS) OBS.disconnect();
  if (window.ResizeObserver) { let w0 = cont.clientWidth, tm = 0;
    OBS = new ResizeObserver(() => { const w = cont.clientWidth; if (!root.isConnected) { OBS.disconnect(); return; } if (Math.abs(w - w0) < 24 || !w) return; w0 = w; clearTimeout(tm); tm = setTimeout(() => { pintarGraficas(); pintarRed(); }, 120); });
    OBS.observe(cont); }
  const ms = performance.now() - t0;
  return { ms, veredicto: V.t, razon, mejoran: mejor.length, empeoran: peor.length };
}
