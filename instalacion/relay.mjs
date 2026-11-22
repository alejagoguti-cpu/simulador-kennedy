// KENNEDY REACCIONA · relé local mínimo (Node puro, sin dependencias).
//   node instalacion/relay.mjs            -> http://127.0.0.1:8787
//   PUERTO=8790 HOST=0.0.0.0 node ...     -> otro puerto / visible en la red local (proyector en otro equipo)
// Sirve la carpeta del repo (así ../data3d/ funciona igual que en GitHub Pages) y reenvía mensajes:
//   POST /estado      consola -> proyección (órdenes: {tipo:'ajustes', parche} o {tipo:'accion', ...})
//   POST /telemetria  proyección -> consola (indicadores, hora, fps, calibración)
//   GET  /eventos     Server-Sent Events con ambos canales (event: orden | telemetria)
//   GET  /estado      últimos ajustes acumulados (JSON)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const PUERTO = +(process.env.PUERTO || 8787), HOST = process.env.HOST || '127.0.0.1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const clientes = new Set();
let ajustes = {}, ultimaTelemetria = null;

function emitir(evento, datos) {
  const txt = `event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const r of clientes) r.write(txt);
}
function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let b = ''; req.setEncoding('utf8');
    req.on('data', (c) => { b += c; if (b.length > 1e6) { mal(new Error('cuerpo muy grande')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { mal(e); } });
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname === '/eventos') {
    res.writeHead(200, { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1500\n\n');
    res.write(`event: orden\ndata: ${JSON.stringify({ tipo: 'ajustes', parche: ajustes, inicial: true })}\n\n`);
    if (ultimaTelemetria) res.write(`event: telemetria\ndata: ${JSON.stringify(ultimaTelemetria)}\n\n`);
    clientes.add(res);
    req.on('close', () => clientes.delete(res));
    return;
  }
  if (url.pathname === '/estado' && req.method === 'GET') { res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' }); return res.end(JSON.stringify(ajustes)); }
  if ((url.pathname === '/estado' || url.pathname === '/telemetria') && req.method === 'POST') {
    try {
      const m = await leerCuerpo(req);
      if (url.pathname === '/estado') {
        if (m.tipo === 'ajustes' && m.parche && typeof m.parche === 'object') Object.assign(ajustes, m.parche);
        emitir('orden', m);
      } else { ultimaTelemetria = m; emitir('telemetria', m); }
      res.writeHead(204, CORS); return res.end();
    } catch (e) { res.writeHead(400, CORS); return res.end(String(e.message)); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, CORS); return res.end(); }

  // archivos estáticos del repo
  let ruta = decodeURIComponent(url.pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const abs = normalize(join(RAIZ, ruta));
  if (abs !== RAIZ && !abs.startsWith(RAIZ + sep)) { res.writeHead(403, CORS); return res.end(); }
  try {
    const s = await stat(abs);
    if (s.isDirectory()) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); }
    const datos = await readFile(abs);
    res.writeHead(200, { ...CORS, 'Content-Type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : datos);
  } catch { res.writeHead(404, CORS); res.end('no existe'); }
});

setInterval(() => { for (const r of clientes) r.write(': latido\n\n'); }, 15000);
servidor.listen(PUERTO, HOST, () => {
  console.log(`Kennedy Reacciona · relé en http://${HOST}:${PUERTO}/`);
  console.log(`  proyección: http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PUERTO}/instalacion/proyeccion.html`);
  console.log(`  consola:    http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PUERTO}/instalacion/consola.html`);
});
