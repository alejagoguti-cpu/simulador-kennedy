/* ============ INFORME FINAL DE UNA SIMULACIÓN (versión 2) ============
   export function abrirInforme2({ cont, sim, def, hist, base, reglas, go, eventos, extinciones, ind, semilla, onCerrar })
   Pinta en `cont` (la caja de vidrio #su-inf .caja) un informe para no expertos, con datos del modelo semanal (data3d/simulaciones12.js):
     1 · encabezado: nombre, pregunta «¿Qué pasaría si…?», grupo (propuesta / Kennedy sin la propuesta), años corridos, semilla;
     2 · VEREDICTO «¿Fue sostenible?» Sí / No / En parte, con la razón en una frase (criterios abajo, en CRITERIOS);
     3 · tarjetas por tema: año 1 → final de esta corrida y, si hay `base` (estado actual, misma semilla), barras «estado actual vs esta simulación»;
     4 · curvas en años 1–20 de los límites de game over que más se acercaron (+ interacciones), con bandas de corto / mediano / largo plazo,
         el estado actual punteado, el límite en rojo y la marca del game over;
     5 · la red de interacciones como «bola» (fauna y plantas en círculo por grupo, relaciones como cuerdas): hoy vs final;
     6 · lo que pasó, año por año (avisos del modelo, con icono por tipo y bueno / malo);
     7 · reglas de game over con sus fuentes y supuestos del informe.
   Nada se inventa aquí: todo sale de `hist` (ind() de cada semana), `base`, `go`, `eventos`, `reglas` y de data3d/simulaciones_datos.json (red biótica).
   Solo SVG en línea, sin librerías. Las curvas se promedian cada 4 semanas (1040 semanas → 260 puntos). Estilos con prefijo i2- (no chocan con #su-inf). */

const FIN = 1040, AÑO = 52, CADA = 4;
const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];

/* ---------- utilidades ---------- */
const NFC = [];
const nf = (v, d = 0) => v == null || !isFinite(v) ? '—' : (NFC[d] || (NFC[d] = new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }))).format(+v);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (h, k) => { if (!h) return null; let o = h; for (const p of k.split('.')) { if (o == null) return null; o = o[p]; } return typeof o === 'number' && isFinite(o) ? o : null; };
const añoDe = (w) => Math.max(1, Math.ceil(w / AÑO));
const min1 = (s) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const lista = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const SG = (d) => d > 0 ? '+' : d < 0 ? '−' : '';

/* ---------- indicadores por tema (se muestra un tema solo si existen sus campos) ----------
   dif: cómo se escribe el cambio · rel = % relativo · pts = puntos (valor × esc) · db = decibeles · abs = diferencia absoluta (u = unidad)
   clave: cuenta para el veredicto. */
const TEMAS = [
  { k: 'eco', n: 'Ecología', d: 'Especies, interacciones, polinizadores, humedales y árboles', items: [
    { k: 'fauna', n: 'Especies de fauna', f: (v, h) => `${nf(v)} de ${nf(h.fauna0)}`, sube: true, dif: 'abs', u: ['especie', 'especies'], clave: true, ayuda: 'Especies de la red biótica que siguen viviendo en algún lugar de Kennedy.' },
    { k: 'red', n: 'Interacciones entre especies', f: (v) => nf(v), sube: true, dif: 'rel', clave: true, ayuda: 'Relaciones de la red (quién come, poliniza o anida en quién) contadas en cada lugar donde ocurren.' },
    { k: 'poliniz', n: 'Polinizadores', f: (v) => nf(v), sube: true, dif: 'rel', clave: true, ayuda: 'Lugares ocupados por abejas, colibríes y cucaracheros.' },
    { k: 'pares', n: 'Territorio con fauna', f: (v) => nf(v), sube: true, dif: 'rel', ayuda: 'Pares especie × lugar ocupados en toda Kennedy.' },
    { k: 'humedalFuncional', n: 'Humedales que funcionan', f: (v) => nf(v) + ' %', sube: true, dif: 'pts', esc: 1, clave: true, ayuda: 'Área sin rellenar × calidad frente a la basura del borde (100 % = hoy). Game over si baja a 70 %.' },
    { k: 'humedalHa', n: 'Área de humedales', f: (v) => nf(v, 1) + ' ha', sube: true, dif: 'rel', ayuda: 'El Burro, La Vaca y Techo, más el borde restaurado.' },
    { k: 'arbolesPerdidos', n: 'Árboles perdidos en parques', f: (v) => nf(v * 100, 1) + ' %', sube: false, dif: 'pts', esc: 100, clave: true, ayuda: 'Talas por riesgo y por obras que se compensan fuera de Kennedy.' }] },
  { k: 'urb', n: 'Ambiente urbano', d: 'Ruido, tráfico y congestión, basura y ratas', items: [
    { k: 'ruidoDb', n: 'Ruido promedio de las calles', f: (v) => nf(v, 1) + ' dB', sube: false, dif: 'db', clave: true, ayuda: '+3 dB es el doble de energía sonora (game over).' },
    { k: 'trafico', n: 'Tráfico', f: (v) => nf(v * 100) + ' % de hoy', sube: false, dif: 'rel', clave: true, ayuda: 'Vehículos que circulan frente a hoy (100 %). Game over con 130 %.' },
    { k: 'congestion', n: 'Congestión', f: (v) => nf(v) + ' %', sube: false, dif: 'pts', esc: 1, ayuda: 'Tiempo extra de viaje frente a vía libre (TomTom: 69,9 % en 2025).' },
    { k: 'basuraT', n: 'Basura generada', f: (v) => nf(v) + ' t/día', sube: false, dif: 'rel', ayuda: 'Corabastos, plaza de flores y viviendas alrededor.' },
    { k: 'sinRecoger', n: 'Basura sin recoger', f: (v) => nf(v * 100) + ' %', sube: false, dif: 'pts', esc: 100, clave: true, ayuda: 'Fracción de la basura que termina en calles y bordes de humedales.' },
    { k: 'ratas', n: 'Ratas', f: (v, h) => '×' + nf(v / (h.ratas0 || 1), 1), sube: false, dif: 'rel', clave: true, ayuda: 'Veces las de hoy, cerca de Corabastos.' },
    { k: 'atropellos', n: 'Fauna atropellada', f: (v) => nf(v, v < 10 ? 1 : 0), sube: false, dif: 'rel', ayuda: 'Índice semanal de animales que mueren al cruzar vías.' }] },
  { k: 'com', n: 'Comida y economía circular', d: 'Comida en la zona peor servida, huertas y circularidad', items: [
    { k: 'comidaMin', n: 'Comida en la zona peor servida', f: (v) => nf(v * 100) + ' %', sube: true, dif: 'pts', esc: 100, clave: true, ayuda: '% de los alimentos que necesita el barrio peor servido. Game over por debajo de 80 %.' },
    { k: 'huertas', n: 'Huertas activas', f: (v) => nf(v), sube: true, dif: 'rel', clave: true, ayuda: 'Hogares que siembran + superficies de la red en huertas de 50 m².' },
    { k: 'comidaLocal', n: 'Gente que comería de las huertas', f: (v) => nf(v, v < 10 ? 1 : 0) + ' %', sube: true, dif: 'pts', esc: 1, ayuda: '% de la gente de Kennedy que se alimentaría solo con lo que producen las huertas.' },
    { k: 'residuos', n: 'Orgánicos sin tratar', f: (v) => nf(v * 100) + ' %', sube: false, dif: 'pts', esc: 100, soloSi: (H) => H.some(h => h.residuos > 0.005), ayuda: '% del almacenamiento de las composteras. Game over por encima de 100 %.' },
    { k: 'circular.indice', n: 'Índice de circularidad', f: (v) => v <= 1 ? nf(v * 100) + ' %' : nf(v, 2), sube: true, dif: 'pts', esc: 100, clave: true, ayuda: 'Qué parte de los orgánicos vuelve como compost.' },
    { k: 'circular.compostado_t_dia', n: 'Orgánicos compostados', f: (v) => nf(v, v < 10 ? 1 : 0) + ' t/día', sube: true, dif: 'rel', ayuda: 'Toneladas al día que se vuelven compost.' }] },
  { k: 'suelo', n: 'Suelo y sociedad', d: 'Especulación con el suelo y hogares en riesgo de desplazamiento', items: [
    { k: 'especulacion.indice', n: 'Especulación con el suelo', f: (v) => v <= 1 ? nf(v * 100) + ' %' : nf(v, 2), sube: false, dif: 'rel', clave: true, ayuda: 'Presión de precios del suelo alrededor de las intervenciones.' },
    { k: 'especulacion.hogaresRiesgo', n: 'Hogares en riesgo de desplazamiento', f: (v) => nf(v), sube: false, dif: 'rel', clave: true, ayuda: 'Hogares que podrían tener que irse por el alza del suelo.' }] }
];

/* ---------- reglas de game over: valor y «hoy» (los mismos VALOR de simulaciones12.js) ---------- */
const VAL = { fauna: (h) => h.fauna / Math.max(1, h.fauna0) * 100, habitat: (h) => h.pares / Math.max(1, h.ref ? h.ref.pares : h.pares0) * 100, abasto: (h) => h.comidaMin * 100,
  residuos: (h) => h.residuos * 100, ruido: (h) => h.ruidoDb - h.ruidoDb0, trafico: (h) => h.trafico, humedal: (h) => h.humedalFuncional };
const HOY = { fauna: 100, habitat: 100, abasto: 100, residuos: 0, ruido: 0, trafico: 1, humedal: 100 };
const UMB = { fauna: 90, habitat: 70, abasto: 80, residuos: 100, ruido: 3, trafico: 1.3, humedal: 70 };
const FMT_R = { ruido: (v) => SG(v) + nf(Math.abs(v), 1) + ' dB', trafico: (v) => nf(v, 2) };
const fmtR = (k, v) => (FMT_R[k] || ((x) => nf(x) + ' %'))(v);
const NOMBRE_R = { fauna: 'Especies de fauna (% del inicio)', habitat: 'Territorio con fauna (% del año 1)', humedal: 'Humedales que funcionan (% de hoy)', abasto: 'Comida en la zona peor servida (%)',
  residuos: 'Orgánicos sin tratar (% del almacenamiento)', ruido: 'Ruido de las calles (dB sobre hoy)', trafico: 'Tráfico (índice, 1 = hoy)' };
const ART = { fauna: 'la fauna', habitat: 'el territorio con fauna', humedal: 'el área funcional de los humedales', abasto: 'la comida en la zona peor servida', residuos: 'el almacenamiento de orgánicos', ruido: 'el ruido', trafico: 'el tráfico' };
const prox = (k, v, umbral) => { const h = HOY[k], u = umbral != null ? umbral : UMB[k]; if (v == null || u === h) return 0; return Math.max(0, Math.min(1.2, (v - h) / (u - h))); };

/* ---------- red biótica (para la «bola») ---------- */
const FAUNA = [['tingua', 'Tingua moteada', 'Tingua'], ['pato', 'Pato andino', 'Pato'], ['focha', 'Focha común', 'Focha'], ['garza', 'Garza blanca', 'Garza'], ['garzaNoc', 'Garza nocturna', 'Garza noct.'],
  ['monjita', 'Monjita bogotana', 'Monjita'], ['rana', 'Rana sabanera', 'Rana'], ['culebra', 'Serpiente sabanera', 'Serpiente'], ['curi', 'Curí', 'Curí'], ['copeton', 'Copetón', 'Copetón'],
  ['mirla', 'Mirla patiamarilla', 'Mirla'], ['colibri', 'Colibrí chillón', 'Colibrí'], ['torcaza', 'Torcaza', 'Torcaza'], ['cucarachero', 'Cucarachero', 'Cucarachero'], ['chamon', 'Chamón', 'Chamón'],
  ['cernicalo', 'Cernícalo', 'Cernícalo'], ['buho', 'Búho sabanero', 'Búho'], ['lagartija', 'Lagartija bogotana', 'Lagartija'], ['comadreja', 'Comadreja', 'Comadreja'],
  ['rata', 'Rata parda', 'Rata'], ['caracol', 'Caracol de jardín', 'Caracol'], ['abeja', 'Abeja de miel', 'Abeja'], ['lombriz', 'Lombriz roja', 'Lombriz']]; // = ESPECIES de sim_vida.js + las 4 de red_trofica.js (mismo orden)
const GRUPOS = [{ k: 'ave', n: 'Aves' }, { k: 'poli', n: 'Polinizadores' }, { k: 'mam', n: 'Mamíferos' }, { k: 'herp', n: 'Anfibios y reptiles' }, { k: 'inv', n: 'Otros invertebrados' }, { k: 'pla', n: 'Plantas' }];
let RED = null, RED_P = null;
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
    RED = { nodos, enl, floraHoy: nodos.filter(x => !x.fa && hoy[x.fi]).map(x => x.id), floraNuevas: nuevas.map(i => R.flora[i].id), soloBosque: soloBosque.map(i => R.flora[i].id), tipos: R.tipos };
    return RED;
  });
  RED_P.catch(() => { RED_P = null; });
  return RED_P;
}

/* ---------- iconos de los avisos (trazos de 16 px) ---------- */
const IC = {
  especies: 'M3 13c0-6 4-10 10-10 0 6-4 10-10 10zM3 13l6-6', polinizadores: 'M6 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3',
  huertas: 'M8 14V7M8 9C5 9 3 7 3 4c3 0 5 2 5 5zM8 7c0-3 2-5 5-5 0 3-2 5-5 5z', residuos: 'M2.5 4h11M6 4V2h4v2M4 4l1 10h6l1-10',
  corabastos: 'M2 14V6l6-4 6 4v8M5 14V9h6v5', ruido: 'M2 6h3l4-3v10l-4-3H2zM11 5.5c1.3 1.4 1.3 3.6 0 5M13 3.5c2.6 2.6 2.6 6.4 0 9',
  obra: 'M3 14V3h9M3 6l9-3M10 3v5M1.5 14h6', trafico: 'M2 11V8l2-4h8l2 4v3zM4.5 13v-2M11.5 13v-2M2 8h12', metro: 'M4 2h8v9H4zM4 7h8M5.5 14l1-3M10.5 14l-1-3',
  comida: 'M2 6h12l-2 8H4zM5 6l3-4 3 4', gameover: 'M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M5.5 5.5l5 5M10.5 5.5l-5 5', otro: 'M8 5v4M8 11v.5M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13'
};
const NOMBRE_T = { especies: 'Fauna', polinizadores: 'Polinizadores', huertas: 'Huertas', residuos: 'Basura y residuos', corabastos: 'Corabastos', ruido: 'Ruido', obra: 'Obra', trafico: 'Tráfico', metro: 'Metro', comida: 'Comida' };
const icono = (t, cls = '') => `<svg class="i2-ic ${cls}" viewBox="0 0 16 16" aria-hidden="true"><path d="${IC[t] || IC.otro}"/></svg>`;

/* ---------- estilos ---------- */
const CSS = `
.inf2 { --ink: #eef1f4; --ink2: rgba(238,241,244,.74); --mut: rgba(238,241,244,.52); --line: rgba(255,255,255,.13); --panel: rgba(255,255,255,.045); --panel2: rgba(255,255,255,.075);
  --bien: #8ee6a8; --mal: #ff8a80; --igual: rgba(238,241,244,.6); --okf: #22b357; --badf: #e0524f; --neuf: #9aa0a8; --acc: #ffcf7a; --ref: rgba(238,241,244,.62); --grid: rgba(255,255,255,.08);
  --band1: rgba(255,255,255,.035); --band2: rgba(255,255,255,.0); --lim: #ff6b6b; --barbg: rgba(255,255,255,.07); --top: rgba(26,29,36,.94);
  --g-ave: #3987e5; --g-poli: #d95926; --g-mam: #199e70; --g-herp: #c98500; --g-inv: #d55181; --g-pla: #0ca30c;
  color: var(--ink); font: 400 14px/1.45 Geist, system-ui, -apple-system, 'Segoe UI', sans-serif; }
.inf2 * { box-sizing: border-box; }
.inf2 .i2-top { position: sticky; top: -22px; z-index: 3; margin: -22px -26px 0; padding: 12px 26px; display: flex; align-items: center; gap: 10px; background: var(--top); border-bottom: 1px solid var(--line); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px 16px 0 0; }
.inf2 .i2-top .i2-k { flex: 1; font: 600 10.5px/1.2 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: inherit; font: 600 13px system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
.inf2 .i2-btn:hover { background: rgba(255,255,255,.14); } .inf2 .i2-btn.pri { background: rgba(255,176,70,.92); color: #1b1206; border-color: transparent; }
.inf2 .i2-hd { padding: 20px 0 6px; }
.inf2 .i2-sim { margin: 0; font: 500 12px/1.3 Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-tit { margin: 4px 0 0; font: 600 clamp(30px, 5vw, 44px)/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .01em; }
.inf2 .i2-preg { margin: 10px 0 0; font: 400 clamp(16px, 2.2vw, 19px)/1.4 Geist, system-ui, sans-serif; color: var(--ink); max-width: 62ch; }
.inf2 .i2-desc { margin: 6px 0 0; font-size: 13px; color: var(--ink2); max-width: 75ch; }
.inf2 .i2-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.inf2 .i2-chip { padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); font: 500 12px/1.3 Geist, system-ui, sans-serif; color: var(--ink2); }
.inf2 .i2-chip b { color: var(--ink); font-weight: 600; }
.inf2 .i2-sec { margin-top: 18px; padding: 18px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); }
.inf2 .i2-sh { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-bottom: 12px; }
.inf2 .i2-n { font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-st { margin: 0; font: 600 22px/1.1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .02em; width: 100%; }
.inf2 .i2-sd { margin: 0; font-size: 13px; color: var(--ink2); width: 100%; }
/* veredicto */
.inf2 .i2-ver { display: grid; grid-template-columns: auto 1fr; gap: 6px 22px; align-items: center; border-left: 4px solid var(--neuf); }
.inf2 .i2-ver.bien { border-left-color: var(--okf); background: linear-gradient(90deg, rgba(34,179,87,.16), var(--panel) 60%); }
.inf2 .i2-ver.mal { border-left-color: var(--badf); background: linear-gradient(90deg, rgba(224,82,79,.18), var(--panel) 60%); }
.inf2 .i2-ver.parte { border-left-color: #f0a83a; background: linear-gradient(90deg, rgba(240,168,58,.15), var(--panel) 60%); }
.inf2 .i2-vq { grid-column: 1 / -1; font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-vv { display: flex; align-items: center; gap: 12px; font: 700 clamp(52px, 9vw, 84px)/.9 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .01em; text-transform: uppercase; }
.inf2 .i2-vv svg { width: 46px; height: 46px; flex: none; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.inf2 .i2-ver.bien .i2-vv { color: var(--bien); } .inf2 .i2-ver.mal .i2-vv { color: var(--mal); } .inf2 .i2-ver.parte .i2-vv { color: #ffc56b; }
.inf2 .i2-vr { margin: 0; font: 500 clamp(15px, 1.9vw, 18px)/1.45 Geist, system-ui, sans-serif; }
.inf2 .i2-vr2 { margin: 6px 0 0; font-size: 13px; color: var(--ink2); }
.inf2 .i2-tiles { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.inf2 .i2-tile { padding: 10px 12px; border-radius: 10px; background: var(--panel2); border: 1px solid var(--line); }
.inf2 .i2-tile b { display: block; font: 600 34px/1 'Barlow Condensed', system-ui, sans-serif; }
.inf2 .i2-tile span { font-size: 12px; color: var(--ink2); }
.inf2 .i2-tile.bien b { color: var(--bien); } .inf2 .i2-tile.mal b { color: var(--mal); }
.inf2 details.i2-crit { grid-column: 1 / -1; margin-top: 8px; font-size: 12.5px; color: var(--ink2); }
.inf2 details.i2-crit summary { cursor: pointer; color: var(--ink); font-weight: 500; }
.inf2 details.i2-crit ol { margin: 6px 0 0; padding-left: 18px; }
/* tarjetas */
.inf2 .i2-tema { margin-top: 16px; } .inf2 .i2-tema:first-of-type { margin-top: 4px; }
.inf2 .i2-th { display: flex; align-items: baseline; gap: 10px; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.inf2 .i2-th b { font: 600 19px/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .03em; text-transform: uppercase; } .inf2 .i2-th span { font-size: 12px; color: var(--mut); }
.inf2 .i2-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 10px; }
.inf2 .i2-card { padding: 12px 14px; border-radius: 12px; background: var(--panel2); border: 1px solid var(--line); break-inside: avoid; }
.inf2 .i2-cn { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; font: 600 13.5px/1.25 Geist, system-ui, sans-serif; }
.inf2 .i2-tag { flex: none; font: 600 11px/1 Geist, system-ui, sans-serif; padding: 4px 7px; border-radius: 6px; background: rgba(255,255,255,.07); color: var(--igual); white-space: nowrap; }
.inf2 .i2-tag.bien { color: var(--bien); background: rgba(34,179,87,.14); } .inf2 .i2-tag.mal { color: var(--mal); background: rgba(224,82,79,.16); }
.inf2 .i2-ad { display: flex; align-items: flex-end; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.inf2 .i2-ad small, .inf2 .i2-vs small { display: block; font: 500 10.5px/1.2 Geist, system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--mut); }
.inf2 .i2-ad b { font: 600 25px/1.05 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .01em; white-space: nowrap; } .inf2 .i2-ad .i2-a0 b { color: var(--ink2); font-weight: 500; }
.inf2 .i2-arr { color: var(--mut); font-size: 18px; padding-bottom: 3px; }
.inf2 .i2-d { margin-left: auto; padding-bottom: 4px; font: 600 13px/1 Geist, system-ui, sans-serif; white-space: nowrap; }
.inf2 .bien { color: var(--bien); } .inf2 .mal { color: var(--mal); } .inf2 .igual { color: var(--igual); }
.inf2 .i2-vs { margin-top: 10px; padding-top: 9px; border-top: 1px dashed var(--line); }
.inf2 .i2-bar { display: grid; grid-template-columns: 96px 1fr auto; gap: 8px; align-items: center; margin-top: 5px; font-size: 12px; color: var(--ink2); }
.inf2 .i2-bar b { font: 600 13px/1 Geist, system-ui, sans-serif; color: var(--ink); min-width: 56px; text-align: right; font-variant-numeric: tabular-nums; }
.inf2 .i2-tr { height: 10px; border-radius: 3px; background: var(--barbg); overflow: hidden; }
.inf2 .i2-tr i { display: block; height: 100%; border-radius: 0 4px 4px 0; background: var(--neuf); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inf2 .i2-tr i.ref { background: repeating-linear-gradient(135deg, rgba(238,241,244,.42) 0 3px, rgba(238,241,244,.24) 3px 6px); }
.inf2 .i2-tr i.bien { background: var(--okf); } .inf2 .i2-tr i.mal { background: var(--badf); } .inf2 .i2-tr i.igual { background: var(--neuf); }
.inf2 .i2-vt { margin: 7px 0 0; font: 600 12.5px/1.35 Geist, system-ui, sans-serif; }
.inf2 .i2-ay { margin: 8px 0 0; font-size: 11.5px; line-height: 1.4; color: var(--mut); }
/* curvas */
.inf2 .i2-leg { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--ink2); margin-bottom: 10px; }
.inf2 .i2-leg span { display: inline-flex; align-items: center; gap: 6px; }
.inf2 .i2-leg i { display: inline-block; width: 22px; height: 0; border-top: 2px solid var(--acc); } .inf2 .i2-leg i.ref { border-top: 2px dashed var(--ref); } .inf2 .i2-leg i.lim { border-top: 2px dashed var(--lim); }
.inf2 .i2-leg i.go { width: 0; height: 12px; border-top: 0; border-left: 2px solid var(--lim); }
.inf2 .i2-leg i.band { width: 14px; height: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.06); }
.inf2 .i2-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 12px; }
.inf2 .i2-ch { position: relative; padding: 12px 12px 6px; border-radius: 12px; background: var(--panel2); border: 1px solid var(--line); break-inside: avoid; }
.inf2 .i2-cht { font: 600 13.5px/1.25 Geist, system-ui, sans-serif; } .inf2 .i2-chs { font-size: 11.5px; color: var(--mut); margin-top: 2px; }
.inf2 .i2-ch svg.i2-g { display: block; width: 100%; height: auto; margin-top: 6px; touch-action: pan-y; }
.inf2 .i2-tip { position: absolute; pointer-events: none; z-index: 2; padding: 7px 9px; border-radius: 8px; background: rgba(14,16,20,.94); border: 1px solid rgba(255,255,255,.18); font-size: 12px; line-height: 1.35; white-space: nowrap; display: none; }
.inf2 .i2-tip b { font-weight: 600; }
.inf2 svg .ax { font: 500 11px Geist, system-ui, sans-serif; fill: var(--mut); } .inf2 svg .axt { font: 600 10px Geist, system-ui, sans-serif; letter-spacing: .12em; fill: var(--mut); text-transform: uppercase; }
.inf2 svg .gr { stroke: var(--grid); stroke-width: 1; } .inf2 svg .bl { stroke: rgba(255,255,255,.22); stroke-width: 1; }
.inf2 svg .b1 { fill: var(--band1); } .inf2 svg .b2 { fill: var(--band2); } .inf2 svg .bsep { stroke: rgba(255,255,255,.12); stroke-dasharray: 2 3; }
.inf2 svg .ln { fill: none; stroke: var(--acc); stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }
.inf2 svg .lr { fill: none; stroke: var(--ref); stroke-width: 1.6; stroke-dasharray: 5 4; }
.inf2 svg .lim { stroke: var(--lim); stroke-width: 1.4; stroke-dasharray: 6 4; } .inf2 svg .limz { fill: rgba(255,107,107,.07); }
.inf2 svg .limt { font: 600 10.5px Geist, system-ui, sans-serif; fill: var(--lim); }
.inf2 svg .gol { stroke: var(--lim); stroke-width: 1.6; } .inf2 svg .got { font: 700 11px Geist, system-ui, sans-serif; fill: var(--lim); letter-spacing: .06em; }
.inf2 svg .dot { fill: var(--acc); stroke: #16191f; stroke-width: 2; } .inf2 svg .dotr { fill: #c9ccd1; stroke: #16191f; stroke-width: 2; }
.inf2 svg .val { font: 600 12px Geist, system-ui, sans-serif; fill: var(--ink); } .inf2 svg .valr { font: 500 11px Geist, system-ui, sans-serif; fill: var(--ink2); }
.inf2 svg .cr { stroke: rgba(255,255,255,.5); stroke-width: 1; }
/* red */
.inf2 .i2-balls { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.inf2 .i2-ball { padding: 12px; border-radius: 12px; background: var(--panel2); border: 1px solid var(--line); break-inside: avoid; }
.inf2 .i2-ball svg { display: block; width: 100%; height: auto; }
.inf2 svg .nl { font: 500 11px Geist, system-ui, sans-serif; fill: var(--ink2); } .inf2 svg .nl.fuera { fill: var(--mal); text-decoration: line-through; } .inf2 svg .nl.vuelve { fill: var(--bien); }
.inf2 svg .gl { font: 600 10px Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; fill: var(--mut); }
.inf2 svg .ch0 { fill: none; stroke: rgba(238,241,244,.16); stroke-width: .8; } .inf2 svg .chp { fill: none; stroke: var(--lim); stroke-width: 1.6; stroke-dasharray: 4 3; } .inf2 svg .chn { fill: none; stroke: #4fe08a; stroke-width: 1.8; }
.inf2 svg .nd { stroke: #16191f; stroke-width: 1.5; } .inf2 svg .nd.fuera { fill: none !important; stroke: var(--lim); stroke-width: 1.8; } .inf2 svg .nd.aun { fill: none !important; stroke: var(--mut); stroke-width: 1.2; }
.inf2 svg .ga { fill: none; stroke-width: 3; stroke-linecap: round; }
.inf2 .i2-bt { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font: 600 13.5px/1.25 Geist, system-ui, sans-serif; } .inf2 .i2-bt span { font: 500 12px Geist, system-ui, sans-serif; color: var(--ink2); }
.inf2 .i2-gleg { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 12px 0 0; font-size: 12px; color: var(--ink2); }
.inf2 .i2-gleg span { display: inline-flex; align-items: center; gap: 6px; } .inf2 .i2-gleg i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.inf2 .i2-gleg i.l { width: 22px; height: 0; border-radius: 0; border-top: 2px solid; }
.inf2 .i2-rs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 12px; }
.inf2 .i2-rs > div { padding: 10px 12px; border-radius: 10px; background: var(--panel2); border: 1px solid var(--line); font-size: 12.5px; color: var(--ink2); }
.inf2 .i2-rs b.big { display: block; font: 600 28px/1 'Barlow Condensed', system-ui, sans-serif; color: var(--ink); }
.inf2 .i2-nota { margin: 10px 0 0; font-size: 11.5px; color: var(--mut); line-height: 1.45; }
/* línea de tiempo */
.inf2 .i2-strip svg { display: block; width: 100%; height: auto; }
.inf2 .i2-fase { margin-top: 14px; } .inf2 .i2-fase > b { display: block; font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; color: var(--mut); margin-bottom: 6px; }
.inf2 .i2-ev { display: grid; grid-template-columns: 62px 30px 1fr; gap: 10px; align-items: start; padding: 9px 0; border-top: 1px solid var(--line); break-inside: avoid; }
.inf2 .i2-ev .i2-ea { font: 600 18px/1.1 'Barlow Condensed', system-ui, sans-serif; } .inf2 .i2-ev .i2-ea small { display: block; font: 500 10.5px Geist, system-ui, sans-serif; color: var(--mut); letter-spacing: .04em; }
.inf2 .i2-ev .i2-eb { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: rgba(255,255,255,.06); border: 1px solid var(--line); }
.inf2 .i2-ev.bien .i2-eb { border-color: rgba(142,230,168,.45); color: var(--bien); } .inf2 .i2-ev.mal .i2-eb { border-color: rgba(255,138,128,.45); color: var(--mal); }
.inf2 .i2-ev.go .i2-eb { background: rgba(224,82,79,.25); }
.inf2 .i2-ic { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.inf2 .i2-et { font: 600 13.5px/1.3 Geist, system-ui, sans-serif; } .inf2 .i2-et em { font-style: normal; font: 600 10.5px Geist, system-ui, sans-serif; letter-spacing: .06em; margin-left: 6px; white-space: nowrap; }
.inf2 .i2-ex { margin: 3px 0 0; font-size: 12.5px; color: var(--ink2); }
/* pie */
.inf2 .i2-reg { display: grid; gap: 8px; } .inf2 .i2-reg > div { padding: 10px 12px; border-radius: 10px; background: var(--panel2); border: 1px solid var(--line); font-size: 12.5px; break-inside: avoid; }
.inf2 .i2-reg > div.go { border-color: rgba(255,107,107,.6); }
.inf2 .i2-reg b { font-weight: 600; } .inf2 .i2-reg p { margin: 4px 0 0; font-size: 11.5px; color: var(--mut); overflow-wrap: anywhere; } .inf2 .i2-reg a { color: var(--ink2); }
.inf2 .i2-sup { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--ink2); } .inf2 .i2-sup li { margin: 4px 0; }
.inf2 .i2-pie { margin: 16px 0 2px; font-size: 11px; color: var(--mut); }
@media (max-width: 760px) {
  .inf2 .i2-top { top: -16px; margin: -16px -16px 0; padding: 10px 16px; }
  .inf2 .i2-sec { padding: 14px 12px; } .inf2 .i2-ver { grid-template-columns: 1fr; } .inf2 .i2-vv svg { width: 38px; height: 38px; }
  .inf2 .i2-tiles { gap: 6px; } .inf2 .i2-tile { padding: 8px; } .inf2 .i2-tile b { font-size: 28px; } .inf2 .i2-tile span { font-size: 11px; }
  .inf2 .i2-cards, .inf2 .i2-charts, .inf2 .i2-balls { grid-template-columns: 1fr; }
  .inf2 .i2-bar { grid-template-columns: 88px 1fr auto; } .inf2 .i2-ev { grid-template-columns: 52px 30px 1fr; gap: 8px; }
}
@media print {
  .inf2 { --ink: #111; --ink2: #333; --mut: #666; --line: #cfcfcf; --panel: #fff; --panel2: #fafafa; --bien: #0a7a2f; --mal: #b3261e; --igual: #555; --acc: #c26a00; --ref: #555; --grid: #e6e6e6;
    --band1: #f2f2f2; --lim: #c62828; --barbg: #eee; --okf: #2e9e55; --badf: #d64545; --neuf: #999; }
  .inf2 .i2-top { display: none; } .inf2 .i2-sec { break-inside: auto; backdrop-filter: none; } .inf2 .i2-ver { background: #fff !important; }
  .inf2 .i2-tit { color: #111; } .inf2 .i2-tr i.ref { background: repeating-linear-gradient(135deg, #999 0 3px, #ccc 3px 6px); }
  .inf2 svg .dot, .inf2 svg .dotr, .inf2 svg .nd { stroke: #fff; } .inf2 svg .ch0 { stroke: rgba(0,0,0,.14); } .inf2 svg .bl { stroke: #bbb; } .inf2 svg .cr { display: none; }
  .inf2 .i2-tip { display: none !important; } .inf2 .i2-ev .i2-eb { background: #fff; }
  .inf2 .i2-ch, .inf2 .i2-card, .inf2 .i2-ball, .inf2 .i2-ev { break-inside: avoid; }
}`;
function ponerCss() { if (document.getElementById('inf2-css')) return; const s = document.createElement('style'); s.id = 'inf2-css'; s.textContent = CSS; document.head.appendChild(s); }

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
function fraseVs(it, c, quien) { // «95 % más que el estado actual»
  if (!c) return '';
  if (c.igual) return `Casi igual que ${quien}`;
  const mas = c.d > 0 ? 'más' : 'menos';
  if (it.dif === 'pts') return `${nf(c.dd, c.dd < 10 ? 1 : 0)} puntos ${mas} que ${quien}`;
  if (it.dif === 'db') return `${nf(c.dd, 1)} dB ${mas} que ${quien}`;
  if (it.dif === 'abs') return `${nf(c.dd)} ${c.dd === 1 ? it.u[0] : it.u[1]} ${mas} que ${quien}`;
  return `${nf(c.dd, c.dd < 10 ? 1 : 0)} % ${mas} que ${quien}`;
}
const MARCA = { bien: '▲', mal: '▼', igual: '=' }, PALABRA = { bien: 'mejor', mal: 'peor', igual: 'casi igual' };

/* ---------- series: promedio cada CADA semanas ---------- */
function serie(H, fn, n = H.length) {
  const out = []; n = Math.min(n, H.length);
  for (let i = 0; i < n; i += CADA) { let s = 0, k = 0; const j1 = Math.min(n, i + CADA); for (let j = i; j < j1; j++) { const v = fn(H[j]); if (v != null && isFinite(v)) { s += v; k++; } } if (k) out.push([H[j1 - 1].sem || j1, s / k]); }
  if (n && out.length && out[out.length - 1][0] !== (H[n - 1].sem || n)) { const v = fn(H[n - 1]); if (v != null) out.push([H[n - 1].sem || n, v]); }
  return out;
}
function paso(lo, hi, n) { const r = (hi - lo) / n || 1, p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }

/* ---------- gráfica en años (ancho real en px: el texto no se encoge en el celular) ---------- */
function grafica(G, W) {
  const H = Math.round(Math.max(190, Math.min(250, W * 0.5))), L = 44, R = 62, T = 24, B = 30, pw = W - L - R, ph = H - T - B;
  const x = (w) => L + Math.max(0, Math.min(FIN, w)) / FIN * pw;
  const vs = G.s.map(p => p[1]).concat(G.r ? G.r.map(p => p[1]) : []); if (G.lim != null) vs.push(G.lim); if (G.cero) vs.push(0);
  let lo = Math.min(...vs), hi = Math.max(...vs); const pos = lo >= 0; if (hi - lo < 1e-9) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.1; lo -= pad; hi += pad; if (pos && lo < 0) lo = 0;
  const st = paso(lo, hi, 4); lo = Math.floor(lo / st) * st; if (pos && lo < 0) lo = 0; hi = Math.ceil(hi / st) * st;
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * ph, dec = st < 0.1 ? 2 : st < 1 ? 1 : 0;
  let s = `<svg class="i2-g" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(G.t)}">`;
  // bandas de plazo
  FASES.forEach((F, i) => { const x0 = x((F.a0 - 1) * AÑO), x1 = x(F.a1 * AÑO); s += `<rect class="${i % 2 ? 'b2' : 'b1'}" x="${x0}" y="${T}" width="${x1 - x0}" height="${ph}"/>`;
    if (i) s += `<line class="bsep" x1="${x0}" x2="${x0}" y1="${T - 14}" y2="${T + ph}"/>`;
    s += `<text class="axt" x="${(x0 + x1) / 2}" y="${T - 8}" text-anchor="middle">${F.n.split(' ')[0]}</text>`; });
  for (let v = lo; v <= hi + st * 1e-6; v += st) s += `<line class="gr" x1="${L}" x2="${L + pw}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v, dec)}</text>`;
  s += `<line class="bl" x1="${L}" x2="${L + pw}" y1="${T + ph}" y2="${T + ph}"/>`;
  for (const a of [1, 5, 10, 15, 20]) { const xa = x((a - 0.5) * AÑO); s += `<line class="bl" x1="${xa}" x2="${xa}" y1="${T + ph}" y2="${T + ph + 4}"/><text class="ax" x="${xa}" y="${T + ph + 16}" text-anchor="middle">${a}</text>`; }
  s += `<text class="axt" x="${L + pw}" y="${H - 2}" text-anchor="end">año</text>`;
  if (G.lim != null) { const yl = y(G.lim), malArriba = !G.sube; s += `<rect class="limz" x="${L}" y="${malArriba ? T : yl}" width="${pw}" height="${malArriba ? yl - T : T + ph - yl}"/><line class="lim" x1="${L}" x2="${L + pw}" y1="${yl}" y2="${yl}"/>`;
    s += `<text class="limt" x="${L + 6}" y="${malArriba ? yl - 5 : yl + 13}">Game over: ${esc(G.limTxt)}</text>`; }
  const path = (P) => P.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join('');
  if (G.r && G.r.length) { s += `<path class="lr" d="${path(G.r)}"/>`; const e = G.r[G.r.length - 1]; s += `<circle class="dotr" cx="${x(e[0])}" cy="${y(e[1])}" r="3.5"/>`; }
  s += `<path class="ln" d="${path(G.s)}"/>`;
  const e = G.s[G.s.length - 1];
  if (G.go) { const xg = x(G.go); s += `<line class="gol" x1="${xg}" x2="${xg}" y1="${T}" y2="${T + ph}"/><text class="got" x="${xg + (xg > L + pw * 0.75 ? -5 : 5)}" y="${T + 13}" text-anchor="${xg > L + pw * 0.75 ? 'end' : 'start'}">GAME OVER · AÑO ${añoDe(G.go)}</text>`; }
  s += `<circle class="dot" cx="${x(e[0])}" cy="${y(e[1])}" r="4.5"/>`;
  // valores finales (etiqueta directa) evitando que se monten
  let ye = y(e[1]) + 4, yr = G.r && G.r.length ? y(G.r[G.r.length - 1][1]) + 4 : null;
  if (yr != null && Math.abs(ye - yr) < 13) { if (ye <= yr) { ye -= (13 - (yr - ye)) / 2; yr = ye + 13; } else { yr -= (13 - (ye - yr)) / 2; ye = yr + 13; } }
  s += `<text class="val" x="${Math.min(W - 2, x(e[0]) + 8)}" y="${ye}">${esc(G.fy(e[1]))}</text>`;
  if (yr != null && G.r[G.r.length - 1][0] >= e[0] - 60) s += `<text class="valr" x="${x(G.r[G.r.length - 1][0]) + 8}" y="${yr}">${esc(G.fy(G.r[G.r.length - 1][1]))}</text>`;
  s += `<g class="i2-x" style="display:none"><line class="cr" y1="${T}" y2="${T + ph}"/><circle class="dot" r="4"/></g>`;
  return { svg: s + '</svg>', x, y, L, pw, T, ph, H };
}

/* ---------- la «bola» de interacciones ---------- */
function bola(RD, W, presF, presFl, modo, cambiosF) {
  const N = RD.nodos.length, full = W >= 420, lab = full ? 112 : 74, Rr = Math.max(70, (W - 2 * lab) / 2 - 6), cx = W / 2, cy = Rr + lab + 4, H = Math.round(cy * 2);
  // orden: por grupo; las plantas, según el ángulo medio de la fauna con la que se relacionan (menos cruces)
  const ord = []; for (const G of GRUPOS) if (G.k !== 'pla') RD.nodos.forEach((n, i) => { if (n.g === G.k) ord.push(i); });
  const posF = new Map(ord.map((i, k) => [i, k])); const pla = RD.nodos.map((n, i) => i).filter(i => RD.nodos[i].g === 'pla');
  const m = new Map(pla.map(i => [i, []])); for (const [a, b] of RD.enl) { if (m.has(a) && posF.has(b)) m.get(a).push(posF.get(b)); if (m.has(b) && posF.has(a)) m.get(b).push(posF.get(a)); }
  pla.sort((a, b) => { const ma = m.get(a), mb = m.get(b); const va = ma.length ? ma.reduce((s, v) => s + v, 0) / ma.length : 99, vb = mb.length ? mb.reduce((s, v) => s + v, 0) / mb.length : 99; return vb - va; });
  ord.push(...pla);
  // la fauna (con nombre) ocupa más ángulo que cada planta: WF ranuras por especie de fauna, 1 por planta
  const WF = 2.6, gap = 2.6, ngr = GRUPOS.filter(G => ord.some(i => RD.nodos[i].g === G.k)).length, nFa = ord.length - pla.length, paso1 = 2 * Math.PI / (nFa * WF + pla.length + ngr * gap);
  const ang = new Float64Array(N); let a = -Math.PI / 2 - paso1 * nFa * WF * 0.5, prev = null; const arcos = [];
  for (const i of ord) { const n = RD.nodos[i], g = n.g, w = n.fa ? WF : 1; if (prev !== null && g !== prev) a += paso1 * gap; a += paso1 * w / 2; if (g !== prev) arcos.push({ g, a0: a }); ang[i] = a; arcos[arcos.length - 1].a1 = a; a += paso1 * w / 2; prev = g; }
  const P = (i, r = Rr) => [cx + r * Math.cos(ang[i]), cy + r * Math.sin(ang[i])];
  const vivo = (i) => RD.nodos[i].fa ? presF.has(RD.nodos[i].id) : presFl.has(RD.nodos[i].id);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Red de interacciones ${modo === 'ini' ? 'al inicio' : 'al final'}">`;
  // arcos de grupo
  for (const A of arcos) { const r = Rr + 9, p0 = [cx + r * Math.cos(A.a0 - paso1 * .4), cy + r * Math.sin(A.a0 - paso1 * .4)], p1 = [cx + r * Math.cos(A.a1 + paso1 * .4), cy + r * Math.sin(A.a1 + paso1 * .4)], big = A.a1 - A.a0 > Math.PI ? 1 : 0;
    s += `<path class="ga" style="stroke:var(--g-${A.g})" d="M${p0[0].toFixed(1)},${p0[1].toFixed(1)}A${r},${r} 0 ${big} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)}"/>`;
    if (A.g === 'pla') { const am = (A.a0 + A.a1) / 2, rr = Rr + 22; s += `<text class="gl" x="${cx + rr * Math.cos(am)}" y="${cy + rr * Math.sin(am) + 4}" text-anchor="${Math.cos(am) < -0.2 ? 'end' : Math.cos(am) > 0.2 ? 'start' : 'middle'}">Plantas (${pla.length})</text>`; } }
  // cuerdas
  const cuerda = (i, j) => { const [x1, y1] = P(i, Rr - 5), [x2, y2] = P(j, Rr - 5), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, qx = cx + (mx - cx) * 0.18, qy = cy + (my - cy) * 0.18; return `M${x1.toFixed(1)},${y1.toFixed(1)}Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; };
  let c0 = '', cp = '', cn = '';
  for (const [i, j] of RD.enl) { const st = cambiosF.get(i + '|' + j); if (modo === 'ini') { if (st !== 'nueva') c0 += cuerda(i, j); } else if (st === 'perdida') cp += cuerda(i, j); else if (st === 'nueva') cn += cuerda(i, j); else if (vivo(i) && vivo(j)) c0 += cuerda(i, j); }
  s += `<path class="ch0" d="${c0}"/>` + (cp ? `<path class="chp" d="${cp}"/>` : '') + (cn ? `<path class="chn" d="${cn}"/>` : '');
  // nodos y nombres de la fauna
  for (const i of ord) { const n = RD.nodos[i], [x, y] = P(i), fuera = !vivo(i), cl = fuera ? (modo === 'fin' && (n.fa || !RD.floraNuevas.includes(n.id)) ? ' fuera' : ' aun') : '';
    const r = n.fa ? 4.6 : 2.8; s += `<circle class="nd${cl}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" style="fill:var(--g-${n.g})"><title>${esc(n.n)} · ${GRUPOS.find(G => G.k === n.g).n}${fuera ? (modo === 'fin' ? ' · ya no está en Kennedy' : ' · aún no está') : ''}</title></circle>`;
    if (n.fa) { const c = Math.cos(ang[i]), izq = c < 0, [lx, ly] = P(i, Rr + 16), rot = ang[i] * 180 / Math.PI + (izq ? 180 : 0);
      const cls = modo === 'fin' && !vivo(i) ? ' fuera' : (modo === 'fin' && cambiosF.get('v:' + n.id) ? ' vuelve' : '');
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
export function abrirInforme2({ cont, sim, def = {}, hist, base = null, reglas = [], go = null, eventos = [], extinciones = [], ind = [], semilla = 1, onCerrar = null }) {
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
  const grupo = def.grupo || (sim === 1 ? 'actual' : null);

  /* --- tarjetas y comparaciones --- */
  const temas = TEMAS.map(T => ({ ...T, items: T.items.map(IT).filter(it => get(L, it.k) != null && (!it.soloSi || it.soloSi(H)) && !(H.every(h => !get(h, it.k)) && (!B || B.every(h => !get(h, it.k))))) })).filter(T => T.items.length);
  const comps = []; // para el veredicto
  const tarjeta = (it) => {
    const a = get(A1, it.k), b = get(L, it.k), c = cambio(it, a, b);
    let vs = '', tag = c ? `<span class="i2-tag ${c.cls}">${MARCA[c.cls]} ${c.cls === 'igual' ? 'casi igual' : c.cls === 'bien' ? 'mejoró' : 'empeoró'}</span>` : '';
    if (B) { const vb = get(BC, it.k), vh = get(HC, it.k), cb = cambio(it, vb, vh);
      if (cb) { const mx = Math.max(Math.abs(vb), Math.abs(vh)) || 1, wb = Math.abs(vb) / mx * 100, wh = Math.abs(vh) / mx * 100;
        tag = `<span class="i2-tag ${cb.cls}">${MARCA[cb.cls]} ${PALABRA[cb.cls]}</span>`;
        vs = `<div class="i2-vs"><small>Frente al estado actual · año ${añoC}</small>
          <div class="i2-bar"><span>Estado actual</span><div class="i2-tr"><i class="ref" style="width:${wb.toFixed(1)}%"></i></div><b>${esc(it.f(vb, BC))}</b></div>
          <div class="i2-bar"><span>Esta simulación</span><div class="i2-tr"><i class="${cb.cls}" style="width:${wh.toFixed(1)}%"></i></div><b>${esc(it.f(vh, HC))}</b></div>
          <p class="i2-vt ${cb.cls}">${MARCA[cb.cls]} ${esc(fraseVs(it, cb, 'el estado actual'))}${cb.igual ? '' : ' · ' + PALABRA[cb.cls]}</p></div>`;
        if (it.clave) comps.push({ it, c: cb }); } }
    else if (it.clave && c) comps.push({ it, c });
    return `<div class="i2-card"><div class="i2-cn"><span>${esc(it.n)}</span>${tag}</div>
      <div class="i2-ad"><div class="i2-a0"><small>Año 1</small><b>${esc(it.f(a, A1))}</b></div><span class="i2-arr">→</span><div><small>Año ${añoDe(wFin)}${go ? ' · final' : ''}</small><b>${esc(it.f(b, L))}</b></div>${c ? `<span class="i2-d ${c.cls}" title="cambio desde el año 1">${MARCA[c.cls]} ${esc(c.txt)}</span>` : ''}</div>
      ${vs}${it.ayuda ? `<p class="i2-ay">${esc(it.ayuda)}</p>` : ''}</div>`;
  };
  const htmlTemas = temas.map(T => `<div class="i2-tema"><div class="i2-th"><b>${esc(T.n)}</b><span>${esc(T.d)}</span></div><div class="i2-cards">${T.items.map(tarjeta).join('')}</div></div>`).join('');

  /* --- reglas: valor final, máximo acercamiento --- */
  const RG = (reglas && reglas.length ? reglas : Object.keys(VAL).map(k => ({ k, n: k, umbral: UMB[k] }))).filter(r => VAL[r.k]);
  const estR = RG.map(r => { let mx = 0, wmx = 0; for (let i = 0; i < nH; i += 2) { const p = prox(r.k, VAL[r.k](H[i]), r.umbral); if (p > mx) { mx = p; wmx = H[i].sem; } }
    const vF = VAL[r.k](L); return { r, vF, pF: prox(r.k, vF, r.umbral), mx, wmx }; });
  const cerca = estR.filter(e => !go && e.pF >= 2 / 3).sort((a, b) => b.pF - a.pF);

  /* --- veredicto --- */
  const quien = B ? 'el estado actual' : 'el año 1', frente = B ? 'frente al estado actual' : 'frente al año 1';
  const mejor = comps.filter(x => x.c.cls === 'bien').sort((a, b) => b.c.dd - a.c.dd), peor = comps.filter(x => x.c.cls === 'mal').sort((a, b) => b.c.dd - a.c.dd), igual = comps.filter(x => x.c.cls === 'igual');
  const nom = (arr, k = 3) => lista(arr.slice(0, k).map(x => min1(x.it.n)));
  let V, razon, razon2 = '';
  if (go) { const R = RG.find(r => r.k === go.regla) || {};
    V = { t: 'No', cls: 'mal' }; razon = `Kennedy llegó a game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)}): ${go.motivo || R.n}.`;
    razon2 = `La regla «${R.n || go.regla}» se cumplió 4 semanas seguidas: valor ${fmtR(go.regla, go.valor)}, límite ${fmtR(go.regla, R.umbral != null ? R.umbral : UMB[go.regla])}.` + (mejor.length ? ` Aun así, ${frente} mejoró ${nom(mejor, 2)}.` : ''); }
  else { const ok = !cerca.length && mejor.length > peor.length;
    V = ok ? { t: 'Sí', cls: 'bien' } : { t: 'En parte', cls: 'parte' };
    const fin = nH >= FIN ? 'Llega a los 20 años sin game over' : `Llega al año ${añoDe(wFin)} sin game over`;
    razon = `${fin} y mejora ${mejor.length} de ${comps.length} indicadores clave ${frente}${mejor.length ? ' (' + nom(mejor) + ')' : ''}`;
    const pero = []; if (cerca.length) pero.push(cerca.map(e => `${ART[e.r.k] || (e.r.n || e.r.k).toLowerCase()} queda cerca de su límite (${fmtR(e.r.k, e.vF)}; game over en ${fmtR(e.r.k, e.r.umbral != null ? e.r.umbral : UMB[e.r.k])})`).join(' y '));
    if (peor.length) pero.push(`empeora ${nom(peor, 2)}`);
    razon += pero.length ? `, pero ${lista(pero)}.` : '.';
    if (!ok && !cerca.length) razon2 = 'Empeoran tantos indicadores clave como los que mejoran.'; }
  const icV = V.cls === 'bien' ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : V.cls === 'mal' ? '<path d="M6 6l12 12M18 6L6 18"/>' : '<path d="M5 12h14"/>';
  const htmlVer = `<div class="i2-sec i2-ver ${V.cls}"><div class="i2-vq">¿Fue sostenible?</div>
    <div class="i2-vv"><svg viewBox="0 0 24 24" aria-hidden="true">${icV}</svg>${V.t}</div>
    <div><p class="i2-vr">${esc(razon)}</p>${razon2 ? `<p class="i2-vr2">${esc(razon2)}</p>` : ''}</div>
    <div class="i2-tiles"><div class="i2-tile bien"><b>▲ ${mejor.length}</b><span>indicadores clave mejoran ${frente}</span></div>
      <div class="i2-tile mal"><b>▼ ${peor.length}</b><span>empeoran</span></div><div class="i2-tile"><b>= ${igual.length}</b><span>casi iguales</span></div></div>
    <details class="i2-crit"><summary>Cómo se decide el veredicto</summary><ol>
      <li><b>No</b>: se cumplió una regla de game over (cualquiera de las ${RG.length}, 4 semanas seguidas; ver al final).</li>
      <li><b>Sí</b>: no hubo game over, ningún indicador de las reglas terminó a 2/3 o más del camino entre hoy y su límite (el mismo umbral del aviso «Kennedy se acerca al game over»), y mejoran más indicadores clave de los que empeoran.</li>
      <li><b>En parte</b>: no hubo game over pero falla alguna de las otras dos condiciones.</li>
      <li>Indicadores clave: ${esc(lista(temas.flatMap(T => T.items.filter(i => i.clave).map(i => min1(i.n)))))}. Se comparan ${B ? `con el estado actual (simulación 1, misma semilla) en la misma semana (año ${añoC}${baseCorta ? ', cuando el estado actual llegó a game over' : ''})` : 'el año 1 con el final'}. «Casi igual» = menos de 2 % (0,5 puntos, 0,2 dB o ninguna especie).</li></ol></details></div>`;

  /* --- encabezado --- */
  const años = wFin / AÑO;
  const htmlHd = `<div class="i2-top"><span class="i2-k">Informe final · simulación ${esc(sim)}</span><button class="i2-btn" data-i2-imp>Imprimir / PDF</button><button class="i2-btn pri" data-i2-x>Cerrar</button></div>
    <div class="i2-hd"><p class="i2-sim">Simulación ${esc(sim)} de 12</p><p class="i2-tit">${esc(def.n || '')}</p>
      <p class="i2-preg">${esc(def.pregunta || '')}</p>${def.desc ? `<p class="i2-desc">${esc(def.desc)}</p>` : ''}
      <div class="i2-chips"><span class="i2-chip">Escenario: <b>${grupo === 'propuesta' ? 'propuesta de la tesis' : 'Kennedy sin la propuesta'}</b></span>
        <span class="i2-chip">Corrió <b>${nf(años, años % 1 ? 1 : 0)} de 20 años</b> (${nf(wFin)} semanas)${go ? ' · se detuvo por game over' : ''}</span>
        ${B ? `<span class="i2-chip">Comparada con <b>el estado actual</b> (simulación 1)</span>` : ''}<span class="i2-chip">Semilla <b>${esc(semilla)}</b></span></div></div>`;

  /* --- curvas: límites que más se acercaron (el del game over primero) + interacciones --- */
  const orden = estR.slice().sort((a, b) => (go && b.r.k === go.regla) - (go && a.r.k === go.regla) || b.mx - a.mx || a.r.k.localeCompare(b.r.k));
  const GR = orden.slice(0, 3).map(e => { const k = e.r.k, um = e.r.umbral != null ? e.r.umbral : UMB[k];
    return { t: NOMBRE_R[k] || e.r.n, sub: `Game over si ${e.r.txt || ''}. Llegó a ${nf(Math.min(1, e.mx) * 100)} % del camino hacia el límite (año ${añoDe(e.wmx || 1)}).`,
      fn: (h) => VAL[k](h), lim: um, limTxt: fmtR(k, um), sube: !(HOY[k] < um), fy: (v) => fmtR(k, v) }; });
  GR.push({ t: 'Interacciones entre especies', sub: 'Relaciones de la red que ocurren en cada lugar de Kennedy (más es mejor).', fn: (h) => h.red, sube: true, fy: (v) => nf(v), cero: true });
  const htmlGr = `<div class="i2-sec"><div class="i2-sh"><span class="i2-n">Cómo cambió en el tiempo</span><p class="i2-st">Los límites que más se acercaron, año por año</p></div>
    <div class="i2-leg"><span><i></i>Esta simulación</span>${B ? '<span><i class="ref"></i>Estado actual</span>' : ''}<span><i class="lim"></i>Límite de game over</span>${go ? '<span><i class="go"></i>Game over</span>' : ''}<span><i class="band"></i>Corto (1–5), mediano (6–10) y largo plazo (11–20)</span></div>
    <div class="i2-charts">${GR.map((g, i) => `<div class="i2-ch" data-i2-g="${i}"><div class="i2-cht">${esc(g.t)}</div><div class="i2-chs">${esc(g.sub)}</div><div data-i2-svg></div><div class="i2-tip"></div></div>`).join('')}</div></div>`;
  GR.forEach(g => { g.s = serie(H, g.fn); g.r = B ? serie(B, g.fn) : null; g.go = go ? go.sem : null; });

  /* --- red --- */
  const PF = presenciaFauna(H, extinciones);
  const htmlRed = `<div class="i2-sec"><div class="i2-sh"><span class="i2-n">Red de interacciones</span><p class="i2-st">Quién se relaciona con quién: al inicio y al final</p>
      <p class="i2-sd">Cada punto es una especie (fauna con nombre; plantas en verde) y cada curva una relación de la red biótica: depredación, herbivoría, polinización, dispersión de semillas, nido o refugio.</p></div>
    <div data-i2-red><p class="i2-nota">Cargando la red…</p></div></div>`;

  /* --- línea de tiempo --- */
  const EV = (eventos || []).filter(e => e && e.titulo).slice().sort((a, b) => a.sem - b.sem);
  const evRow = (e) => { const g = /^game over/i.test(e.titulo), cls = g ? 'mal go' : e.signo > 0 ? 'bien' : e.signo < 0 ? 'mal' : '', a = añoDe(e.sem);
    return `<div class="i2-ev ${cls}"><div class="i2-ea">Año ${a}<small>semana ${nf(e.sem)}</small></div><div class="i2-eb">${icono(g ? 'gameover' : e.tipo)}</div>
      <div><div class="i2-et">${esc(e.titulo)}<em class="${e.signo > 0 ? 'bien' : e.signo < 0 ? 'mal' : 'igual'}">${e.signo > 0 ? '▲ BUENO' : e.signo < 0 ? '▼ MALO' : ''}</em></div>${e.texto ? `<p class="i2-ex">${esc(e.texto)}</p>` : ''}</div></div>`; };
  const htmlEv = `<div class="i2-sec"><div class="i2-sh"><span class="i2-n">Lo que pasó, año por año</span><p class="i2-st">${EV.length ? `${EV.length} avisos del modelo · ${EV.filter(e => e.signo > 0).length} buenos y ${EV.filter(e => e.signo < 0).length} malos` : 'Sin avisos en esta corrida'}</p></div>
    <div class="i2-strip" data-i2-strip></div>
    ${FASES.map(F => { const es = EV.filter(e => { const a = añoDe(e.sem); return a >= F.a0 && a <= F.a1; }); return es.length ? `<div class="i2-fase"><b>${F.n} · años ${F.a0}–${F.a1}</b>${es.map(evRow).join('')}</div>` : ''; }).join('')}</div>`;

  /* --- pie: reglas y supuestos --- */
  const link = (t) => esc(t).replace(/https?:\/\/[^\s)<]+/g, (u) => { const m = u.match(/[.,;]+$/), uu = m ? u.slice(0, -m[0].length) : u; return `<a href="${uu}" target="_blank" rel="noopener">${uu}</a>${m ? m[0] : ''}`; });
  const htmlPie = `<div class="i2-sec"><div class="i2-sh"><span class="i2-n">Reglas de game over</span><p class="i2-st">Iguales para las 12 simulaciones: cualquiera cumplida 4 semanas seguidas termina la corrida</p></div>
    <div class="i2-reg">${RG.map(r => { const e = estR.find(x => x.r.k === r.k); return `<div class="${go && go.regla === r.k ? 'go' : ''}"><b>${esc(r.n)}</b>: game over si ${esc(r.txt || '')}.${e ? ` <span class="${go && go.regla === r.k ? 'mal' : e.pF >= 2 / 3 ? 'mal' : 'igual'}">Al final: ${esc(fmtR(r.k, e.vF))}${go && go.regla === r.k ? ' · se cumplió' : ''}.</span>` : ''}${r.fuente ? `<p>Fuente: ${link(r.fuente)}</p>` : ''}</div>`; }).join('')}</div>
    <div class="i2-sh" style="margin-top:16px"><span class="i2-n">Supuestos de este informe</span></div>
    <ul class="i2-sup">
      <li>Todo sale del modelo semanal (data3d/simulaciones12.js) con la semilla ${esc(semilla)}: la misma semilla da siempre el mismo resultado.</li>
      <li>«Año 1» es la semana 52: el modelo arranca por debajo de su equilibrio (la ocupación de la fauna se duplica en las primeras ~40 semanas en todas las simulaciones), así que la semana 1 exageraría los cambios.</li>
      ${B ? `<li>El estado actual es la simulación 1 con la misma semilla; se compara en la misma semana (año ${añoC})${baseCorta ? ', porque el estado actual se detuvo por game over' : ''}.</li>` : ''}
      <li>Las curvas promedian cada ${CADA} semanas; el punto final es el último valor.</li>
      <li>Red: ${PF.exacto ? '' : 'el modelo no informa qué especies faltaban al inicio; '}la presencia de la fauna se ${PF.volvieron.length || !Array.isArray(L.presentes) ? 'reconstruye con las extinciones de cada semana (si una especie vuelve, se toma la última que desapareció)' : 'toma del modelo'}. Plantas: censo de árboles SIGAU y bosque de Bavaria; las nativas de los módulos de huertas se suman cuando sube el conteo de flora del modelo. Una relación está activa si sus dos especies viven en Kennedy.</li>
    </ul><p class="i2-pie">Informe generado en el navegador a partir de ${nf(nH)} semanas simuladas.</p></div>`;

  cont.innerHTML = `<div class="inf2">${htmlHd}${htmlVer}<div class="i2-sec"><div class="i2-sh"><span class="i2-n">Antes y después</span><p class="i2-st">Año 1 → año ${añoDe(wFin)}${B ? ', y frente al estado actual' : ''}</p>
    <p class="i2-sd">${B ? 'Arriba, cómo cambió cada indicador en esta simulación. Abajo, la misma cifra en el estado actual (barra rayada) y en esta simulación (verde si es mejor, rojo si es peor).' : 'Cómo cambió cada indicador desde el año 1 hasta el final: verde si mejoró, rojo si empeoró.'}</p></div>${htmlTemas}</div>${htmlGr}${htmlRed}${htmlEv}${htmlPie}</div>`;
  const root = cont.firstElementChild;
  root.querySelector('[data-i2-imp]').onclick = () => window.print();
  root.querySelector('[data-i2-x]').onclick = () => { if (onCerrar) onCerrar(); else { const s = cont.closest('#su-inf'); if (s) s.classList.remove('on'); } };

  /* --- partes que dependen del ancho (se rehacen al cambiar de tamaño) --- */
  function pintarGraficas() {
    root.querySelectorAll('[data-i2-g]').forEach(fig => { const g = GR[+fig.dataset.i2G], box = fig.querySelector('[data-i2-svg]'), W = Math.max(260, Math.floor(box.clientWidth || 320));
      const R = grafica(g, W); box.innerHTML = R.svg; const svg = box.firstElementChild, cr = svg.querySelector('.i2-x'), ln = cr.firstElementChild, dt = cr.lastElementChild, tip = fig.querySelector('.i2-tip');
      const mover = (ev) => { const bb = svg.getBoundingClientRect(), px = (ev.clientX - bb.left) * (W / bb.width); const w = (px - R.L) / R.pw * FIN; if (w < 0 || w > FIN) { salir(); return; }
        let best = g.s[0]; for (const p of g.s) if (Math.abs(p[0] - w) < Math.abs(best[0] - w)) best = p;
        let rb = null; if (g.r) for (const p of g.r) if (!rb || Math.abs(p[0] - best[0]) < Math.abs(rb[0] - best[0])) rb = p; if (rb && Math.abs(rb[0] - best[0]) > 8) rb = null;
        const xx = R.x(best[0]); ln.setAttribute('x1', xx); ln.setAttribute('x2', xx); dt.setAttribute('cx', xx); dt.setAttribute('cy', R.y(best[1])); cr.style.display = '';
        tip.innerHTML = `<b>Año ${añoDe(best[0])}</b> · semana ${nf(best[0])}<br>Esta simulación: <b>${esc(g.fy(best[1]))}</b>${rb ? `<br>Estado actual: <b>${esc(g.fy(rb[1]))}</b>` : ''}`;
        tip.style.display = 'block'; const fx = svg.offsetLeft + xx * (bb.width / W), tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(fig.clientWidth - tw - 4, fx + 12 > fig.clientWidth - tw ? fx - tw - 12 : fx + 12)) + 'px'; tip.style.top = (svg.offsetTop + 8) + 'px'; };
      const salir = () => { cr.style.display = 'none'; tip.style.display = 'none'; };
      svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover); svg.addEventListener('pointerleave', salir); });
  }
  function pintarStrip() {
    const box = root.querySelector('[data-i2-strip]'); if (!box) return; const W = Math.max(260, Math.floor(box.clientWidth || 320)), Hs = 64, L0 = 8, pw = W - 16, x = (w) => L0 + Math.min(FIN, w) / FIN * pw;
    let s = `<svg viewBox="0 0 ${W} ${Hs}" width="${W}" height="${Hs}" role="img" aria-label="Avisos en los 20 años">`;
    FASES.forEach((F, i) => { const x0 = x((F.a0 - 1) * AÑO), x1 = x(F.a1 * AÑO); s += `<rect class="${i % 2 ? 'b2' : 'b1'}" x="${x0}" y="14" width="${x1 - x0}" height="30"/><text class="axt" x="${(x0 + x1) / 2}" y="10" text-anchor="middle">${W < 420 ? F.n.split(' ')[0] : F.n}</text>`; });
    s += `<line class="bl" x1="${L0}" x2="${L0 + pw}" y1="29" y2="29"/>`; if (wFin < FIN) s += `<line class="bsep" x1="${x(wFin)}" x2="${L0 + pw}" y1="29" y2="29" style="stroke-width:3"/>`;
    for (const a of [1, 5, 10, 15, 20]) s += `<text class="ax" x="${x((a - 0.5) * AÑO)}" y="58" text-anchor="middle">${a}</text>`;
    for (const e of EV) { const up = e.signo > 0; s += `<circle cx="${x(e.sem).toFixed(1)}" cy="${up ? 22 : 36}" r="4.5" style="fill:${up ? 'var(--okf)' : 'var(--badf)'};stroke:#16191f;stroke-width:1.5"><title>Año ${añoDe(e.sem)} · ${esc(e.titulo)}</title></circle>`; }
    if (go) s += `<line class="gol" x1="${x(go.sem)}" x2="${x(go.sem)}" y1="14" y2="44"/>`;
    box.innerHTML = s + '</svg>';
  }
  let RD = null;
  function pintarRed() {
    const box = root.querySelector('[data-i2-red]'); if (!box || !RD) return;
    const fl0 = new Set(RD.floraHoy), dF = (L.flora != null && H[0].flora != null) ? L.flora - H[0].flora : 0, flF = new Set(fl0);
    if (dF > 0) RD.floraNuevas.slice(0, dF).forEach(id => flF.add(id)); // nativas de los módulos de huertas
    if (dF < 0) RD.soloBosque.slice(0, -dF).forEach(id => flF.delete(id)); // tala del bosque de Bavaria
    const vivo0 = (n) => n.fa ? PF.ini.has(n.id) : fl0.has(n.id), vivoF = (n) => n.fa ? PF.fin.has(n.id) : flF.has(n.id);
    const camb = new Map(); let nP = 0, nN = 0, n0 = 0, nF = 0;
    for (const [i, j] of RD.enl) { const A = RD.nodos[i], Bn = RD.nodos[j], e0 = vivo0(A) && vivo0(Bn), eF = vivoF(A) && vivoF(Bn); if (e0) n0++; if (eF) nF++;
      if (e0 && !eF) { camb.set(i + '|' + j, 'perdida'); nP++; } else if (!e0 && eF) { camb.set(i + '|' + j, 'nueva'); nN++; } }
    for (const v of PF.volvieron) if (PF.fin.has(v.especie)) camb.set('v:' + v.especie, true);
    const W = Math.max(280, Math.floor((box.clientWidth || 600) / (box.clientWidth >= 640 ? 2 : 1)) - (box.clientWidth >= 640 ? 32 : 26));
    const fuera = FAUNA.filter(f => !PF.fin.has(f[0])), ultimaExt = (id) => { const x = PF.fuera.filter(e => e.especie === id).pop(); return x; };
    const volv = [...new Map(PF.volvieron.filter(v => PF.fin.has(v.especie)).map(v => [v.especie, v])).values()];
    const nueF = RD.floraNuevas.filter(id => flF.has(id) && !fl0.has(id)).map(id => RD.nodos.find(n => n.id === id).n);
    box.innerHTML = `<div class="i2-balls">
      <div class="i2-ball"><div class="i2-bt">Al inicio<span>${nf(n0)} relaciones activas</span></div>${bola(RD, W, PF.ini, fl0, 'ini', camb)}</div>
      <div class="i2-ball"><div class="i2-bt">Al final · año ${añoDe(wFin)}<span>${nf(nF)} relaciones activas</span></div>${bola(RD, W, PF.fin, flF, 'fin', camb)}</div></div>
      <div class="i2-gleg">${GRUPOS.map(G => `<span><i style="background:var(--g-${G.k})"></i>${G.n}</span>`).join('')}<span><i class="l" style="border-color:var(--lim);border-top-style:dashed"></i>Relación perdida</span><span><i class="l" style="border-color:#4fe08a"></i>Relación nueva</span></div>
      <div class="i2-rs"><div><b class="big mal">${nP ? '▼ ' + nf(nP) : '0'}</b>relaciones perdidas${fuera.length ? ' porque desapareció ' + esc(lista(fuera.map(f => f[1]))) : ''}</div>
        <div><b class="big bien">${nN ? '▲ ' + nf(nN) : '0'}</b>relaciones nuevas${nueF.length ? ' con ' + esc(lista(nueF)) + ' (planta nativa de las huertas)' : ''}</div>
        <div><b class="big">${nf(get(A1, 'red'))} → ${nf(get(L, 'red'))}</b>interacciones en todos los lugares (indicador del modelo, año 1 → final)</div></div>
      ${fuera.length || volv.length ? `<p class="i2-nota">${fuera.map(f => { const x = ultimaExt(f[0]); return `<b>${esc(f[1])}</b> desapareció de Kennedy${x ? ` en el año ${añoDe(x.sem)}${x.motivo ? ' (causa: ' + esc(x.motivo) + ')' : ''}${x.parche ? '; el último lugar fue ' + esc(x.parche) : ''}` : ''}.`; }).join(' ')} ${volv.map(v => `<b>${esc(v.nombre || v.especie)}</b> desapareció en el año ${añoDe(v.sem)} y volvió en el año ${añoDe(v.semVuelve)}.`).join(' ')}</p>` : '<p class="i2-nota">Ninguna especie desapareció de Kennedy en esta corrida.</p>'}
      <p class="i2-nota">El diagrama marca las relaciones que se pierden o aparecen cuando una especie sale o entra a Kennedy. El indicador de interacciones cuenta además cada relación en cada lugar donde ocurre, por eso puede subir aunque se pierda una especie.</p>`;
  }
  pintarGraficas(); pintarStrip();
  cargarRed().then(R => { RD = R; if (root.isConnected) pintarRed(); }).catch(e => { const b = root.querySelector('[data-i2-red]'); if (b) b.innerHTML = `<p class="i2-nota">No se pudo cargar la red biótica (${esc(e.message)}).</p>`; });

  if (OBS) OBS.disconnect();
  if (window.ResizeObserver) { let w0 = cont.clientWidth, tm = 0;
    OBS = new ResizeObserver(() => { const w = cont.clientWidth; if (!root.isConnected) { OBS.disconnect(); return; } if (Math.abs(w - w0) < 24 || !w) return; w0 = w; clearTimeout(tm); tm = setTimeout(() => { pintarGraficas(); pintarStrip(); pintarRed(); }, 120); });
    OBS.observe(cont); }
  const ms = performance.now() - t0;
  return { ms, veredicto: V.t, razon, mejoran: mejor.length, empeoran: peor.length };
}
