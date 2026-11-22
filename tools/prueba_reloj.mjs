/* ============ PRUEBAS DEL RELOJ UNIVERSAL (fase 2: salto «+2 h» y determinismo) ============
   Corre en Chrome sin ventana (headless) contra la maqueta servida en local e imprime PASA/FALLA por criterio.

   USO
     1) Servir el repo:   python -m http.server 8780          (desde la carpeta del repo)
     2) Correr:           node tools/prueba_reloj.mjs [url_base] [carpeta_capturas] [criterios]
          url_base          por defecto http://127.0.0.1:8780/index.html
          carpeta_capturas  por defecto tools/prueba_reloj_out (capturas sal_*.jpg y resultado.json)
          criterios         por defecto «c,d,a,b,m» (c es solo estático: grep, no abre Chrome; m = capturas en celular)
        Variables: CHROME (ruta de chrome.exe), PUERTO (depuración, 9381 por defecto).
     Tarda ~15-25 min (cinco cargas de la maqueta; la corrida dibujada de 2 h es la más larga).

   QUÉ PRUEBA (todas parten del MISMO estado inicial: ?reloj=quieto deja el reloj en T0 hasta que cargó todo —sistemas registrados y
   toda la grabación de tráfico— y se arranca en pausa con «Con la propuesta»; en todas hay una entrada programada: volver a «Kennedy hoy»
   en T0 + 900 s, que se aplica con RELOJ.programar justo antes de ese paso en cualquier modo)
     a) SALTO vs. DIBUJADO: hash de estado (RELOJ.hash(), por sistema) en T0+600, T0+1200 y T0+8400 con saltos sin dibujo
        (saltar(600), saltar(600) y el botón «+2 h» = 7200 pasos) contra una corrida DIBUJADA (60× hasta 600 = prueba corta de 10 min a 60×,
        600× hasta 1200 y 3600× hasta 8400; RELOJ.detenerEn la para justo en esos t).
     b) CAMBIOS DE VELOCIDAD: 1× → 3600× → pausa → 60× dibujando, hasta T0+1200: mismo hash que sin cambios.
     d) CANCELAR: un salto «+2 h» cancelado a los pocos segundos queda en un paso entero; la corrida dibujada pasa por ese mismo t y da el
        mismo hash (cancelar = haber corrido hasta ahí).
     e) ESCALA DEL MODELO (semanas): N semanas (SEMANAS, 260 = 5 años por defecto) de sim_vida dan el mismo hash a 52 semanas por segundo,
        a 1 → 13 → pausa → 4 → 52 con el día cambiando de velocidad y en pausa, de un tirón (avanzarSemanas) y con las reglas corridas
        directo sin reloj. Desde que el modelo tiene su propia escala (semanas), sim_vida ya no entra en el hash del día (RELOJ.hash):
        en a, b y d el modelo está quieto en la semana 0 (?reloj=quieto no lo arranca), así que esas pruebas comparan lo mismo que antes.
     m) solo capturas del control en tamaño de celular (390×844).
     c) RELOJES PROPIOS: grep de requestAnimationFrame, performance.now, Date.now, new Date, setInterval y Math.random en data3d/*.js e
        index.html; cada archivo con usos tiene que estar clasificado abajo (USOS) y no puede tener más usos que los revisados.
   Los sistemas con dependeCamara (su lógica mira la cámara) no entran en el hash: se informan aparte. */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] || 'http://127.0.0.1:8780/index.html';
const OUT = process.argv[3] || join(REPO, 'tools', 'prueba_reloj_out');
const CRIT = (process.argv[4] || 'c,d,a,b,e,m').split(',');
const CH = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const T0 = 6 * 3600 + 30 * 60, ENTRADA_T = T0 + 900, CORTO = !!process.env.CORTO; // CORTO=1: solo los 10 min (diagnóstico rápido)
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const resultado = {}; const linea = (k, ok, txt) => { resultado[k] = { ok, txt }; console.log(`${ok ? 'PASA ' : 'FALLA'} · ${k} · ${txt}`); };

/* ---------- c) inventario de relojes propios (estático) ---------- */
// archivo -> [usos revisados (máximo), categoría, nota]. Categorías permitidas: interfaz, cámara, carga, cosmético, medición, juego, otra página, sin uso.
const USOS = {
  'index.html': [39, 'interfaz/cámara/carga', 'bucle maestro flight (único rAF de la maqueta), dt de la cámara WASD, revisión de GPU, sombras/AO al mover la cámara, resolución adaptable (fps), espera de carga de teselas y módulos, tour (setInterval de vuelos de cámara), portada (Math.random de la silueta), pasto (Math.random al construir), tecla R (POI al azar)'],
  'reloj.js': [6, 'medición', 'ahoraMs (presupuesto por cuadro y medición), cederCuadro del salto (rAF para pintar la barra)'],
  'alivio_cali.js': [1, 'interfaz', 'refresco del texto de la etiqueta cada 0,7 s'],
  'bavaria_distrito.js': [65, 'cosmético/cámara', 'texturas procedurales, plantas cercanas, vuelo de cámara, ocultar detalle lejano (rAF de dibujo)'],
  'lamina17.js': [8, 'otra página', 'lámina 17: bucle de la página que mueve la cámara del simulador (iframe) y sus capas'],
  'lamina17_avance.js': [8, 'otra página', 'lámina 17 (avance): bucle de la página y sus capas'],
  'lamina17_rapida.js': [3, 'otra página', 'lámina 17 rápida: sin simulador'],
  'bavaria_plan.js': [8, 'cosmético', 'figuras ilustrativas del plan (azar al construir), pulso del resaltado'],
  'bavaria_pres.js': [2, 'otra página', 'presentación de Bavaria (bavaria.html): su propio bucle, no la maqueta'],
  'biotica.js': [6, 'interfaz', 'repintado de chips (1,5 s), bola de la red de una especie (canvas del panel), «ver en el territorio» elige un individuo al azar'],
  'cambio_50.js': [2, 'interfaz', 'comparar inicio ↔ ahora: espera unos cuadros (rAF) para que el 3D se dibuje antes de tomar la foto; la lógica solo lee RELOJ.sem'],
  'canchas.js': [6, 'cosmético', 'grano de texturas'],
  'capas_escenario.js': [7, 'interfaz/cámara/carga', 'vuelo de cámara, conteo de la grabación por porciones de 5 ms, repintado de paneles'],
  'cielo.js': [1, 'comentario', 'solo menciona requestAnimationFrame'],
  'colegios_red.js': [33, 'cosmético/cámara', 'texturas procedurales, vuelo de cámara'],
  'conjuntos.js': [10, 'cosmético', 'texturas'],
  'corabastos_parque.js': [1, 'cosmético', 'oculta las naves quitadas'],
  'corabastos_plan.js': [7, 'cosmético', 'figuras ilustrativas del plan'],
  'escenario.js': [4, 'cámara/carga', 'vuelo de cámara, limpieza de módulos que cargan tarde'],
  'escenarios_sim.js': [8, 'interfaz/cámara/cosmético', 'paneles a ~4 Hz, vuelo de cámara, espera de la huerta de barrio, fase de partículas (ocultas)'],
  'estrategias.js': [8, 'cosmético/cámara/carga', 'textura, vuelo de cámara; espera a que carguen todos los edificios antes de armar las huertas hidropónicas (Date.now + setTimeout, no toca la lógica)'],
  'modo_simple.js': [4, 'interfaz', 'vuelo de cámara (rAF, performance.now), cola de la bienvenida (setInterval) y anillos de luz; solo leen el modelo, no entran en su lógica'],
  'giro_sim.js': [10, 'interfaz', 'paneles de agentes y flujo (1-2 s), clic corto, bucle propio SOLO sin maqueta (giro sobre render)'],
  'huertas_barrio.js': [2, 'cosmético', 'apoyo de plantas en la malla y LOD'],
  'huertas_hidro.js': [12, 'cosmético/cámara', 'texturas de hojas, recálculo de plantas visibles (enjambre dependeCamara, fuera del hash)'],
  'huerta_circular.js': [1, 'cámara', 'LOD por distancia'],
  'indicadores.js': [5, 'interfaz', 'medición del cálculo y transición suave del mapa'],
  'mejora_tour.js': [3, 'interfaz/carga', 'botones y medición del recorrido'],
  'mercados_barrio.js': [1, 'cosmético', 'apoyo en la malla'],
  'pajaro.js': [57, 'juego', 'modo pájaro / VR: vuelo del jugador, su propio juego; no avanza la simulación'],
  'parches_arboles.js': [3, 'cámara/cosmético', 'opacidad según la altura de la cámara, apoyo en la malla'],
  'plan_maestro.js': [4, 'otra página', 'plan-maestro.html'],
  'propuesta.js': [2, 'interfaz', 'cronómetro del seguimiento, elegir a quién seguir'],
  'real3d.js': [7, 'cámara/sin uso', 'LOD de árboles por cámara; buildWaterBirds no se usa'],
  'red_gobernanza.js': [3, 'interfaz', 'animación del panel'],
  'red_produccion.js': [4, 'cámara', 'vuelo de cámara'],
  'ruido_cierre.js': [1, 'interfaz', 'repintado del mapa de ruido a 10 Hz'],
  'seguir.js': [3, 'interfaz/cámara', 'placa inventada, seguir un agente'],
  'simulador.js': [6, 'interfaz', 'HUD tipo God\u2019s Eye: hora real del sensor, cronómetro del seguimiento'],
  'tablero.js': [3, 'interfaz', 'repintado a 2 Hz, nube de puntos'],
  'tintal.js': [8, 'cosmético', 'texturas, luz de la malla'],
  'ui_sobrio.js': [1, 'interfaz', 'acomodo de la interfaz al cargar'],
  'vehiculos.js': [4, 'cosmético', 'color y variante de cada carro dibujado, tiempo del cuadro'],
  'vision.js': [2, 'carga', 'bordes por porciones de 12 ms']
};
function criterioC() {
  const RE = /requestAnimationFrame|performance\.now|Date\.now|new Date\b|setInterval|Math\.random/g;
  const archivos = [['index.html', join(REPO, 'index.html')], ...readdirSync(join(REPO, 'data3d')).filter(f => f.endsWith('.js')).map(f => [f, join(REPO, 'data3d', f)])];
  const mal = [], tabla = [];
  for (const [n, p] of archivos) { const k = (readFileSync(p, 'utf8').match(RE) || []).length; if (!k) continue; const u = USOS[n];
    if (!u) mal.push(`${n}: ${k} usos sin clasificar`); else if (k > u[0]) mal.push(`${n}: ${k} usos (revisados ${u[0]})`); tabla.push({ archivo: n, usos: k, categoria: u ? u[1] : '?' }); }
  resultado.inventario = tabla;
  linea('c · relojes propios', !mal.length, mal.length ? mal.join('; ') : `${tabla.length} archivos, ${tabla.reduce((s, x) => s + x.usos, 0)} usos, todos de interfaz/cámara/carga/cosmético/medición; ninguno en la lógica`);
}

/* ---------- Chrome ---------- */
async function abrir(nombre, { ancho = 1440, alto = 900, movil = false } = {}) {
  const port = +(process.env.PUERTO || 9381) + Math.floor(Math.random() * 40), dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const ch = spawn(CH, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${ancho},${alto}`, '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
  let tabs; for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); } }
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(), logs = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 300)); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: movil ? 2 : 1, mobile: movil });
  const ev = async (js) => { const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(nombre + ': ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result ? r.result.value : r; };
  const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }); writeFileSync(join(OUT, n + '.jpg'), Buffer.from(r.data, 'base64')); console.log('   captura', join(OUT, n + '.jpg')); };
  await send('Page.navigate', { url: BASE + (BASE.includes('?') ? '&' : '?') + 'reloj=quieto' });
  for (let s = 0; s < 240; s++) { await sleep(1000); try { if (await ev(`document.getElementById('loader').classList.contains('hidden') && !!window.KEN3D && !!window.KEN_RELOJ`)) break; } catch {} }
  await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Saltar/.test(x.textContent)); if(b) b.click(); return 1})()`);
  // listo = sistemas principales registrados y lista estable 20 s; toda la grabación de tráfico bajada; «Con la propuesta» puesta
  await ev(`new Promise(r=>{const R=KEN_RELOJ, faltan=['biotica','giro_sim','aves','tablero','trafico_flujo','sim_vida','alivio_cali'];let firma='',desde=Date.now();const i=setInterval(()=>{const n=R.sistemas.map(s=>s.nombre).join(',');if(n!==firma){firma=n;desde=Date.now();} if(faltan.every(x=>n.split(',').includes(x))&&window.KEN_ESC&&Date.now()-desde>20000){clearInterval(i);r(1)}},500);setTimeout(()=>{clearInterval(i);r(0)},240000)})`);
  await ev(`(async()=>{KEN_ESC.poner('proyecto'); const TR=KEN3D.TRAF; const n=Math.ceil(TR.NS/TR.chunk); await Promise.all(Array.from({length:n},(_,k)=>TR.pedirTrozo(k))); let f=0; for(let s=0;s<TR.NS;s++) if(!TR.steps[s]) f++; return f})()`);
  await sleep(15000); // lo que carga con «Con la propuesta» (huertas, torres, parches…)
  const info = await ev(`(()=>{const R=KEN_RELOJ; R.pausar(true); R.arrancar(true); R.programar(${ENTRADA_T},'escenario','hoy'); return {t:R.t, sistemas:R.sistemas.map(s=>s.nombre+(s.dependeCamara?'*':'')), esc:KEN_ESC.e}})()`);
  console.log(`[${nombre}] t=${info.t} escenario=${info.esc} sistemas: ${info.sistemas.join(', ')}`);
  // contador de cuadros dibujados (para comprobar que la corrida dibujada sí dibujó y el salto no)
  await ev(`(()=>{window.__dib=0; KEN_RELOJ.alDibujar(()=>{window.__dib++}); return 1})()`);
  return { ev, shot, info, logs, cerrar: () => { ws.close(); ch.kill(); } };
}
const hashJS = `(()=>{const h=KEN_RELOJ.hash(); return {t:h.t, h:h.h, sistemas:h.sistemas, excluidos:h.excluidos, sinHash:h.sinHash, esc:KEN_ESC.e, entradas:KEN_RELOJ.entradas.filter(e=>!/vel|pausa/.test(e.tipo)).map(e=>e.t+':'+e.tipo)}})()`;
// corre dibujando a una velocidad hasta tDest (detenerEn) y devuelve el hash
const correrHasta = (P, tDest, vel, presupuesto = 14) => P.ev(`new Promise(r=>{const R=KEN_RELOJ; R.presupuestoMs=${presupuesto}; const d0=window.__dib, m0=performance.now(); R.detenerEn=${tDest}; R.ponerVel(${vel}); const i=setInterval(()=>{ if(R.pausa && R.t===${tDest}){ clearInterval(i); R.presupuestoMs=14; const h=${hashJS}; h.cuadros=window.__dib-d0; h.ms=Math.round(performance.now()-m0); r(h);} },100); })`);
const difSis = (A, B) => Object.keys({ ...A.sistemas, ...B.sistemas }).filter(k => A.sistemas[k] !== B.sistemas[k]).map(k => `${k} ${A.sistemas[k]}≠${B.sistemas[k]}`);
const cmp = (nombre, A, B, extra = '') => { const d = difSis(A, B), ok = A.t === B.t && A.h === B.h && !d.length;
  linea(nombre, ok, `t=${A.t} · ${A.h} vs ${B.h}${d.length ? ' · difieren: ' + d.join(', ') : ''}${extra}`); };

/* ---------- corridas ---------- */
const H = {};
try {
  if (CRIT.includes('c')) criterioC();
  if (CRIT.includes('m')) { // solo capturas en celular (390×844): control, progreso y cancelado (el modo celular carga otra maqueta: no se compara)
    const P = await abrir('celular', { ancho: 390, alto: 844, movil: true });
    await P.shot('sal_movil_control');
    await P.ev(`(document.getElementById('rt-salto').click(), 1)`); await sleep(6000); await P.shot('sal_movil_progreso');
    await P.ev(`(document.getElementById('rs-x').click(), 1)`);
    await P.ev(`new Promise(r=>{const i=setInterval(()=>{if(!KEN_RELOJ.saltando){clearInterval(i);r(1)}},100)})`); await sleep(1500);
    await P.shot('sal_movil_cancelado'); resultado.excepciones_celular = P.logs.slice(0, 10); P.cerrar();
  }
  if (CRIT.includes('d')) { // salto «+2 h» cancelado a los 6 s (mismo tamaño que las demás corridas)
    const P = await abrir('cancelar');
    await P.ev(`(document.getElementById('rt-salto').click(), 1)`); await sleep(6000);
    const d0 = await P.ev('window.__dib');
    await P.ev(`(document.getElementById('rs-x').click(), 1)`);
    await P.ev(`new Promise(r=>{const i=setInterval(()=>{if(!KEN_RELOJ.saltando){clearInterval(i);r(1)}},100)})`); await sleep(1500);
    await P.shot('sal_cancelado');
    const J = await P.ev(`(()=>{const J=KEN_RELOJ.ultimoSalto; return {desde:J.desde,t:J.t,pasos:J.pasos,cancelado:J.cancelado,ms:Math.round(J.ms)}})()`);
    H.cancel = await P.ev(hashJS); H.cancel.salto = J; H.cancel.cuadrosDurante = d0;
    console.log('   salto cancelado:', JSON.stringify(J));
    P.logs.length && console.log('   ' + P.logs.slice(0, 5).join('\n   ')); resultado.excepciones_cancelar = P.logs.slice(0, 10); P.cerrar();
  }
  if (CRIT.includes('a') || CRIT.includes('b')) {
    // 1) saltos sin dibujo
    const P = await abrir('salto');
    await P.shot('sal_control');
    const s1 = await P.ev(`KEN_RELOJ.saltar(600).then(J=>({ms:Math.round(J.ms)}))`); H.s600 = await P.ev(hashJS);
    if (!CORTO) {
    const s2 = await P.ev(`KEN_RELOJ.saltar(600).then(J=>({ms:Math.round(J.ms)}))`); H.s1200 = await P.ev(hashJS);
    const d0 = await P.ev('window.__dib');
    await P.ev(`(document.getElementById('rt-salto').click(), 1)`); await sleep(5000); await P.shot('sal_progreso');
    const J = await P.ev(`new Promise(r=>{const i=setInterval(()=>{if(!KEN_RELOJ.saltando){clearInterval(i);const J=KEN_RELOJ.ultimoSalto;r({pasos:J.pasos,ms:Math.round(J.ms),msTotal:Math.round(J.msTotal),msPrep:Math.round(J.msPrep),avisos:J.avisos})}},200)})`);
    const dSalto = await P.ev('window.__dib') - d0;
    H.s8400 = await P.ev(hashJS); H.s8400.salto = J; H.s8400.cuadrosDuranteSalto = dSalto;
    await sleep(2500); await P.shot('sal_resultado');
    console.log(`   saltos: 600 → ${s1.ms} ms · 600 → ${s2.ms} ms · +2 h → ${J.ms} ms de lógica (${J.msTotal} ms en total, ${dSalto} cuadros dibujados durante el salto)`);
    }
    resultado.excepciones_salto = P.logs.slice(0, 10); P.logs.length && console.log('   ' + P.logs.slice(0, 5).join('\n   ')); P.cerrar();
  }
  if (CRIT.includes('a')) { // 2) corrida dibujada
    const P = await abrir('dibujada');
    const marcas = CORTO ? [[T0 + 600, 60]] : [[T0 + 600, 60], [T0 + 1200, 600], [T0 + 8400, 3600]];
    if (H.cancel && H.cancel.t > T0 && H.cancel.t < T0 + 8400) marcas.push([H.cancel.t, 0]);
    marcas.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < marcas.length; i++) { const [t, v] = marcas[i], vel = v || (marcas.find(m => m[0] > t && m[1]) || [0, 3600])[1];
      H['d' + (t - T0)] = await correrHasta(P, t, vel, vel >= 3600 ? 250 : vel >= 600 ? 60 : 14);
      console.log(`   dibujada hasta T0+${t - T0} a ${vel}×: ${H['d' + (t - T0)].cuadros} cuadros, ${H['d' + (t - T0)].ms} ms`); }
    resultado.excepciones_dibujada = P.logs.slice(0, 10); P.logs.length && console.log('   ' + P.logs.slice(0, 5).join('\n   ')); P.cerrar();
    cmp('a · 10 min: salto vs. dibujado a 60×', H.s600, H.d600, ` · ${H.d600.cuadros} cuadros dibujados`);
    if (!CORTO) {
    cmp('a · 20 min: salto vs. dibujado a 600×', H.s1200, H.d1200);
    cmp('a · +2 h (botón) vs. dibujado a 3600×', H.s8400, H.d8400, ` · el salto dibujó ${H.s8400.cuadrosDuranteSalto} cuadros; la corrida dibujada ${H.d8400.cuadros}`);
    if (H.cancel) { const c = H['d' + (H.cancel.t - T0)]; if (c) cmp('d · cancelar deja el estado de un paso entero', H.cancel, c, ` · canceló tras ${H.cancel.salto.pasos} pasos`); else linea('d · cancelar', Number.isInteger(H.cancel.t), 'sin punto de comparación'); }
    }
  }
  if (CRIT.includes('e')) { // 4) escala del MODELO (semanas): mismo hash de sim_vida a cualquier velocidad de años, con pausas y con el día corriendo
    const P = await abrir('modelo');
    const N = +(process.env.SEMANAS || 260); // 5 años
    const esperar = `new Promise(r=>{const R=KEN_RELOJ; const i=setInterval(()=>{ if(R.pausaSem && R.sem===${N}){ clearInterval(i); const h=R.hashModelo(); r({sem:h.sem, h:h.sistemas.sim_vida, ms:Math.round(performance.now()-window.__m0), dia:R.t}); } },50); })`;
    // referencia sin reloj: las reglas de sim_vida corridas directo, N semanas, misma semilla y mismos parámetros (mismo módulo de la página)
    H.mRef = await P.ev(`(async()=>{const V=await import('./data3d/sim_vida.js?v=5'), Mo=await import('./data3d/sim_modelos.js?v=6'); const seed=Mo.SIMST.semilla||1; const S={A:V.crear('A',seed),B:V.crear('B',seed),C:V.crear('C',seed)};
      while(S.A.t<${N}){V.paso(S.A,Mo.PAR);V.paso(S.B,Mo.PAR);V.paso(S.C,Mo.PAR);}
      let h=0x811c9dc5; for(const k of 'ABC'){const o=S[k].o; h=Math.imul((h^(S[k].t|0))>>>0,0x01000193)>>>0; for(const q of ['act','dep','pers','aves','hum','relleno','zMin','pend','esp']) h=Math.imul((h^(Math.round((o[q]||0)*1000)|0))>>>0,0x01000193)>>>0;} return {sem:${N}, h:h>>>0}})()`);
    // A) 52 semanas por segundo, el día a 600×
    H.mA = await P.ev(`(()=>{const R=KEN_RELOJ; R.reiniciarModelo(); window.__m0=performance.now(); R.detenerSemEn=${N}; R.ponerVel(600); R.ponerVelAños(52); return 1})()`).then(() => P.ev(esperar));
    // B) 1 → 13 → pausa → 4 → 52 semanas por segundo; el día cambia de 1× a 3600× y se pausa a la mitad
    H.mB = await P.ev(`(async()=>{const R=KEN_RELOJ, w=(ms)=>new Promise(q=>setTimeout(q,ms)); R.reiniciarModelo(); window.__m0=performance.now(); R.detenerSemEn=${N}; R.ponerVel(1); R.ponerVelAños(1); await w(2500); const a=R.sem;
      R.ponerVelAños(13); R.ponerVel(3600); await w(2000); const b=R.sem; R.pausarAños(true); R.pausar(true); await w(1500); const c=R.sem; R.ponerVelAños(4); R.ponerVel(60); await w(2000); const d=R.sem; R.ponerVelAños(52); window.__tramos=[a,b,c,d]; return 1})()`).then(() => P.ev(esperar));
    H.mB.tramos = await P.ev('window.__tramos');
    // C) de un tirón, sin esperar (avanzarSemanas)
    H.mC = await P.ev(`(()=>{const R=KEN_RELOJ; R.pausarAños(true); R.reiniciarModelo(); window.__m0=performance.now(); R.avanzarSemanas(${N}); const h=R.hashModelo(); return {sem:h.sem, h:h.sistemas.sim_vida, ms:Math.round(performance.now()-window.__m0)}})()`);
    console.log(`   modelo: ${N} semanas · A (52/s) ${H.mA.ms} ms · B (1→13→pausa→4→52, semanas en los cambios ${H.mB.tramos.join(', ')}) ${H.mB.ms} ms · C de un tirón ${H.mC.ms} ms`);
    resultado.excepciones_modelo = P.logs.slice(0, 10); P.cerrar();
    const cmpM = (n, A, B) => linea(n, A.sem === B.sem && A.h === B.h, `semana ${A.sem} · ${A.h} vs ${B.h}`);
    cmpM('e · modelo: 52 sem/s vs. reglas corridas sin reloj', H.mA, H.mRef);
    cmpM('e · modelo: 1→13→pausa→4→52 sem/s (día cambiando) vs. 52 sem/s', H.mB, H.mA);
    cmpM('e · modelo: de un tirón (avanzarSemanas) vs. 52 sem/s', H.mC, H.mA);
  }
  if (CRIT.includes('b')) { // 3) cambios de velocidad
    const P = await abrir('velocidades');
    H.v1200 = await P.ev(`new Promise(async r=>{const R=KEN_RELOJ, w=(ms)=>new Promise(q=>setTimeout(q,ms)); R.detenerEn=${T0 + 1200}; R.ponerVel(1); await w(5000); const a=R.t; R.ponerVel(3600); await w(3000); const b=R.t; R.pausar(true); await w(3000); const c=R.t; R.ponerVel(60);
      const i=setInterval(()=>{ if(R.pausa && R.t===${T0 + 1200}){ clearInterval(i); const h=${hashJS}; h.tramos=[a,b,c]; r(h);} },100); })`);
    console.log('   cambios de velocidad en t =', H.v1200.tramos.map(x => 'T0+' + (x - T0)).join(', '));
    resultado.excepciones_velocidades = P.logs.slice(0, 10); P.cerrar();
    cmp('b · 1× → 3600× → pausa → 60× vs. sin cambios (saltos)', H.v1200, H.s1200);
    if (H.d1200) cmp('b · 1× → 3600× → pausa → 60× vs. sin cambios (dibujada)', H.v1200, H.d1200);
  }
  const exc = ['excepciones_celular', 'excepciones_cancelar', 'excepciones_salto', 'excepciones_dibujada', 'excepciones_velocidades', 'excepciones_modelo'].flatMap(k => resultado[k] || []);
  linea('página sin excepciones', !exc.length, exc.length ? exc.slice(0, 3).join(' | ') : 'ninguna excepción en las corridas');
} catch (e) { linea('ejecución', false, String(e && e.stack || e)); }
resultado.hashes = H;
writeFileSync(join(OUT, 'resultado.json'), JSON.stringify(resultado, null, 1));
console.log('\nresultado:', join(OUT, 'resultado.json'));
process.exit(Object.values(resultado).some(x => x && x.ok === false) ? 1 : 0);
