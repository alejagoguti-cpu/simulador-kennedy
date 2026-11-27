/* ============ CALIDAD SEGÚN EL EQUIPO (docs/rendimiento.md, «Implementación») ============
   Pedido de la autora: «que corra bien en cualquier computador». Restricción: NUNCA se baja la resolución (pixelRatio) — la imagen no se
   vuelve borrosa; se ahorra en lo demás.
   · Niveles: 'alto' (lo de siempre, tarjeta dedicada) · 'medio' (sin sombras; menos teselas lejanas, árboles escaneados en un radio menor)
     · 'liviano' (además sin oclusión ambiental ni SMAA —se conservan el tono y la gradación—, menos copas lejanas, fauna animada a menor ritmo).
   · Detección: nombre de la tarjeta gráfica (WEBGL_debug_renderer_info), núcleos (hardwareConcurrency) y memoria (deviceMemory).
   · Adaptable: si con la cámara quieta va a menos de 28 cuadros/s durante 4 s seguidos y el cuello es la TARJETA (no la CPU), baja UN nivel
     (solo si nadie lo escogió a mano);
     si después va holgado (> 55 cuadros/s 10 s seguidos) puede volver a subir UNA sola vez.
   · Selector discreto arriba a la derecha (sobre el tablero); lo escogido a mano se recuerda (localStorage 'ken_calidad').
   · ?calidad=alta | media | liviana (también ?calidad=baja = liviana) lo fija para esa visita.
   API: window.KEN_CALIDAD = { nivel, auto, gpu, motivo, fijar(n, aMano), on(fn), medir(fps, quieta), cfg } — cfg trae los números de cada nivel. */
export const NIVELES = ['alto', 'medio', 'liviano'];
export const CFG = {
  /* teselas de Google: error objetivo final (px; menor = más nítido), caché y procesos paralelos */
  alto: { err: 5, lruMB: 1843, parse: 6, sombras: true, ao: true, smaa: true, arbR: 1, arbCap: 1, splat: 16000, parcheCerca: 300, inem: 1200, faunaCada: 1, splatPaso: 60 },
  medio: { err: 7, lruMB: 1000, parse: 4, sombras: false, ao: true, smaa: true, arbR: 0.75, arbCap: 0.55, splat: 11000, parcheCerca: 220, inem: 850, faunaCada: 2, splatPaso: 90 },
  liviano: { err: 10, lruMB: 600, parse: 3, sombras: false, ao: false, smaa: false, arbR: 0.55, arbCap: 0.3, splat: 6500, parcheCerca: 150, inem: 550, faunaCada: 3, splatPaso: 120 }
};
const CLAVE = 'ken_calidad';
const leer = () => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
const guardar = (v) => { try { if (v) localStorage.setItem(CLAVE, v); else localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento: solo esta visita */ } };

export function detectar(gl) {
  let gpu = '';
  try { const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { gpu = ''; }
  const nucleos = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 8;
  const movil = /Android|iPhone|iPad|iPod|Mobile|OculusBrowser|Quest/i.test(navigator.userAgent);
  const software = /SwiftShader|llvmpipe|Microsoft Basic|Software/i.test(gpu);
  const dedicada = /NVIDIA|GeForce|RTX|GTX|Quadro|Radeon RX|Radeon Pro|Arc A|Apple M\d (Pro|Max|Ultra)/i.test(gpu);
  const integrada = /Intel|UHD|Iris|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d|Apple|Mali|Adreno|PowerVR/i.test(gpu);
  let nivel = 'alto', motivo = 'tarjeta dedicada';
  if (software || movil || mem <= 4 || nucleos <= 4) { nivel = 'liviano'; motivo = software ? 'sin aceleración gráfica' : movil ? 'celular o gafas' : 'poca memoria o pocos núcleos'; }
  else if (integrada && !dedicada) { nivel = 'medio'; motivo = 'tarjeta integrada'; }
  else if (!gpu) { nivel = 'medio'; motivo = 'tarjeta desconocida'; }
  return { nivel, motivo, gpu, nucleos, mem };
}

export function iniciarCalidad(gl) {
  const d = detectar(gl), q = location.search.match(/[?&]calidad=(alta|alto|media|medio|liviana|liviano|baja)\b/);
  const norm = (v) => ({ alta: 'alto', alto: 'alto', media: 'medio', medio: 'medio', liviana: 'liviano', liviano: 'liviano', baja: 'liviano' }[v] || null);
  const url = q ? norm(q[1]) : null, guardado = norm(leer());
  const fns = []; let ultLarga = 0;
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 90) ultLarga = performance.now(); }).observe({ type: 'longtask' }); } catch (e) { /* navegador sin longtask */ }
  const K = window.KEN_CALIDAD = {
    nivel: url || guardado || d.nivel, auto: !url && !guardado, gpu: d.gpu, motivo: url ? 'escogido en la dirección' : guardado ? 'escogido a mano' : d.motivo,
    get cfg() { return CFG[K.nivel]; },
    fijar(n, aMano) { if (!CFG[n]) return; if (aMano) { K.auto = false; guardar(n); K.motivo = 'escogido a mano'; } if (n === K.nivel) { pintar(); return; } K.nivel = n; console.info('[calidad] nivel', n, '(' + K.motivo + ')'); fns.forEach(f => { try { f(n, CFG[n]); } catch (e) { console.warn('calidad:', e); } }); pintar(); },
    automatico() { guardar(null); K.auto = true; K.motivo = d.motivo; K.fijar(d.nivel); },
    on(fn) { fns.push(fn); },
    /* lo llama el bucle de index.html una vez por segundo con los cuadros/s medidos y si la cámara está quieta */
    lentos: 0, holgados: 0, subidas: 0,
    /* cpu: fracción del segundo que el bucle de dibujo ocupó el hilo principal. Si la lentitud es de la CPU (simulación, tráfico…), bajar la
       calidad gráfica no la arregla y solo empeora la imagen: con cpu > 0,6 no se cuenta como segundo lento */
    medir(fps, quieta, cpu = 0) { if (!K.auto || !quieta) { K.lentos = 0; K.holgados = 0; return; } K.cpu = cpu;
      if (fps < 28 && cpu > 0.6) { K.lentos = 0; return; }
      /* tareas largas fuera del dibujo (armar capas, la precarga de la propuesta, recalcular la simulación) no son culpa de la tarjeta */
      if (performance.now() - ultLarga < 1500) { K.lentos = 0; return; }
      /* tarjeta dedicada: NO baja sola (la imagen de la autora, en su RTX, se queda en alta). Medido en la RTX 4050 (docs/rendimiento.md):
         alta ~23 · media ~30 · liviana ~32 cuadros/s en La Vaca; quien quiera más fluidez la escoge en el selector «Calidad» */
      if (d.motivo === 'tarjeta dedicada') { K.lentos = 0; return; }
      const umbral = 28;
      K.lentos = fps < umbral ? K.lentos + 1 : 0; K.holgados = fps > 55 ? K.holgados + 1 : 0;
      const i = NIVELES.indexOf(K.nivel);
      if (K.lentos >= 4 && i < 2) { K.lentos = 0; K.motivo = 'bajado solo (' + Math.round(fps) + ' cuadros/s)'; K.fijar(NIVELES[i + 1]); }
      else if (K.holgados >= 10 && i > 0 && K.subidas < 1) { K.holgados = 0; K.subidas++; K.motivo = 'subido solo (' + Math.round(fps) + ' cuadros/s)'; K.fijar(NIVELES[i - 1]); } }
  };
  /* selector discreto (vidrio, como los demás paneles) */
  let sel = null;
  function pintar() { if (!sel) return; sel.value = K.auto ? 'auto' : K.nivel; const o = sel.querySelector('option[value=auto]'); if (o) o.textContent = 'Automática · ' + ({ alto: 'alta', medio: 'media', liviano: 'liviana' })[K.nivel]; sel.title = 'Calidad gráfica: ' + K.motivo + (K.gpu ? ' · ' + K.gpu.replace(/^ANGLE \(|\)$/g, '').slice(0, 80) : '') + '. Nunca baja la resolución.'; }
  const montar = () => {
    if (document.getElementById('ken-calidad')) return;
    const st = document.createElement('style'); st.textContent = `#ken-calidad{position:fixed;right:16px;top:18px;z-index:40;display:flex;align-items:center;gap:6px;padding:3px 4px 3px 9px;border-radius:999px;background:rgba(20,24,30,.55);border:1px solid rgba(255,255,255,.12);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:rgba(235,240,244,.72);font:500 10px/1 Geist,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase}
      #ken-calidad select{appearance:none;-webkit-appearance:none;border:0;border-radius:999px;padding:4px 9px;background:rgba(255,255,255,.08);color:#eef1f4;font:500 10.5px/1 Geist,system-ui,sans-serif;cursor:pointer}
      #ken-calidad select:focus-visible{outline:1px solid #cfff5e}#ken-calidad option{color:#111}
      @media (max-width:760px){#ken-calidad{top:calc(env(safe-area-inset-top) + 8px);right:8px;padding-left:7px}#ken-calidad span{display:none}}`;
    document.head.appendChild(st);
    const box = document.createElement('label'); box.id = 'ken-calidad'; box.innerHTML = '<span>Calidad</span><select aria-label="Calidad gráfica"><option value="auto">Automática</option><option value="alto">Alta</option><option value="medio">Media</option><option value="liviano">Liviana</option></select>';
    document.body.appendChild(box); sel = box.querySelector('select');
    sel.addEventListener('change', () => { if (sel.value === 'auto') K.automatico(); else K.fijar(sel.value, true); });
    pintar();
  };
  if (document.body) montar(); else addEventListener('DOMContentLoaded', montar);
  console.info('[calidad] nivel', K.nivel, '·', K.motivo, '·', d.gpu);
  return K;
}
