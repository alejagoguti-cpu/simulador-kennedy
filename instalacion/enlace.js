// Enlace consola <-> proyección, sin dependencias.
//  · relé local (instalacion/relay.mjs): POST /estado, POST /telemetria, GET /eventos (Server-Sent Events)
//  · BroadcastChannel 'kennedy-reacciona' (respaldo cuando ambas páginas están en el mismo navegador)
// Los mensajes llevan un id; quien recibe descarta los repetidos (pueden llegar por los dos caminos).
// Parámetros de URL: ?canal=auto|rele|bc  ?rele=http://host:8787
const P = new URLSearchParams(location.search);

export function baseRele() {
  if (P.get('rele')) return P.get('rele').replace(/\/$/, '');
  if (location.port === '8787' || location.protocol === 'http:') {
    if (location.port === '8787') return location.origin;
    return 'http://127.0.0.1:8787';
  }
  return null; // página servida por https (GitHub Pages): el navegador bloquea http://127.0.0.1 -> solo BroadcastChannel
}

export function crearEnlace({ escuchar = ['orden'], alMensaje, alCambiarEstado } = {}) {
  const canal = P.get('canal') || 'auto';
  const usaRele = canal !== 'bc', usaBC = canal !== 'rele' && 'BroadcastChannel' in window;
  const base = usaRele ? baseRele() : null;
  const vistos = new Set(), cola = [];
  const est = { rele: false, bc: usaBC, base, canal, recibidos: { rele: 0, bc: 0 } };
  const avisar = () => { if (alCambiarEstado) alCambiarEstado({ ...est }); };

  function recibir(evento, m, via) {
    if (!m || !escuchar.includes(evento)) return;
    if (m.id) { if (vistos.has(m.id)) return; vistos.add(m.id); cola.push(m.id); if (cola.length > 400) vistos.delete(cola.shift()); }
    est.recibidos[via]++;
    alMensaje(evento, m, via);
  }

  let es = null;
  if (base) {
    try {
      es = new EventSource(base + '/eventos');
      es.onopen = () => { est.rele = true; avisar(); };
      es.onerror = () => { if (est.rele) { est.rele = false; avisar(); } };
      for (const ev of ['orden', 'telemetria']) es.addEventListener(ev, (e) => { try { recibir(ev, JSON.parse(e.data), 'rele'); } catch { } });
    } catch { es = null; }
  }
  let bc = null;
  if (usaBC) {
    bc = new BroadcastChannel('kennedy-reacciona');
    bc.onmessage = (e) => { const d = e.data; if (d && d.evento) recibir(d.evento, d.m, 'bc'); };
  }

  let n = 0;
  const nuevoId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7) + '-' + (n++);
  function enviar(evento, m) {
    m = { ...m, id: m.id || nuevoId() };
    vistos.add(m.id); cola.push(m.id); if (cola.length > 400) vistos.delete(cola.shift()); // no recibir el propio
    if (bc) bc.postMessage({ evento, m });
    if (base && (est.rele || evento === 'orden')) {
      fetch(base + (evento === 'orden' ? '/estado' : '/telemetria'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m), keepalive: true })
        .catch(() => { if (est.rele) { est.rele = false; avisar(); } });
    }
    return m.id;
  }
  async function ajustesGuardados() {
    if (!base) return null;
    try { const r = await fetch(base + '/estado'); return r.ok ? await r.json() : null; } catch { return null; }
  }
  setTimeout(avisar, 0);
  return { enviar, estado: () => ({ ...est }), ajustesGuardados };
}
