/* ============ MERCADOS DE BARRIO EN LOS PARQUES (solo con la propuesta) ============
   Los 8 mercados de abastecimiento de data3d/carga.json (K.mercados) se ubican en el parque más cercano (data3d/parques.json, a menos de
   500 m y con área suficiente): dentro del polígono, en un claro cerca del borde que da a la calle, con el lado largo paralelo a ese borde.
   Cada mercado: piso duro de adoquín con sardinel, cubierta metálica a dos aguas de teja de zinc sobre pórticos de acero con canal,
   6+6 puestos bajo la cubierta y 4+4 puestos de toldo de lona en las bandas exteriores, 4 sombrillas, mesones de madera con huacales
   de tomate, papa, cebolla, zanahoria, plátano, mazorca, lechuga y naranja, canastas, bancas, estaciones de separación de residuos
   (verde orgánicos, blanco aprovechables, negro no aprovechables) y un aviso en los dos extremos.
   Todo se funde en una sola malla por material en todos los mercados: ~10 llamadas de dibujo en total.
   RED DE MERCADOS (data3d/mercados_red.js): con `sitios` (lista de {id, n, tipo: 'barrio'|'plaza', mx, my, a, s, parque}, en coordenadas del modelo)
   este módulo dibuja además PLAZOLETAS DE MERCADO de parque grande (piso duro de 72 x 44 m, dos naves de cubierta metálica, ~50 puestos de frutas y
   verduras, zona de carga y descarga con furgonetas, bancas y árboles). Cada sitio se construye una sola vez (geometría en caché) y solo se funden en
   la malla los que están abiertos: mostrar(ids) cambia cuáles. Sin `sitios` se comporta como antes (los 8 mercados de barrio, todos abiertos). */
export async function crearMercados({ T3, cj, sitios = null }) {
  const THREE = T3.THREE;
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  const carga = sitios ? null : await cj('data3d/carga.json');
  const MER = (carga && carga.mercados) || [];
  const grupo = new THREE.Group(); grupo.name = 'mercados-barrio'; grupo.visible = false; T3.scene.add(grupo);
  const ANIS = Math.min(8, T3.renderer.capabilities.getMaxAnisotropy ? T3.renderer.capabilities.getMaxAnisotropy() : 4);
  let sem = 11; const rnd = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
  const lienzo = (w, h, f, rep = true) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; f(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANIS; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

  /* ---------- 1. ubicación: parque más cercano con claro suficiente ----------
     Calculada fuera de línea con los datos del modelo (parques.json, trees.json, canchas.json, buildings.json, water_bodies.json y las huertas efímeras de huertas_barrio.json): para cada
     mercado, el parque más cercano (a menos de 500 m del punto de carga.json, 1.500 m² o más) con un claro de 32x24 m (o 26x19 m) sin copas de
     árboles del censo, canchas, edificios ni agua, cerca del borde del parque y con el lado largo paralelo a ese borde (el lado de la calle).
     Cada fila: [x, y en coordenadas del modelo (T3.lw las pasa al mundo), ángulo del lado largo, escala, parque]. Si un mercado no tiene fila
     queda en su punto original. */
  const SITIOS = [
    [6946.4, 3553.6, 2.4229, 1, "Biblioteca El Tintal (parque metropolitano)"],
    [8573.8, 3166, 0.4721, 0.8, "Castilla (parque zonal)"],
    [8370.2, 3858.9, 1.1016, 1, "Ciudad Urbisa I y II Sector - Castilla Real (2 Sector) (parque vecinal)"],
    [7789.6, 2316.6, 1.6821, 0.8, "Rincon De Los Angeles (parque vecinal)"],
    [6541.4, 4941.2, -2.2081, 0.8, "La Magdalena Etapa II (parque vecinal)"],
    [6325, 3270, 0.8197, 0.8, "Patio Bonito II Sector (parque vecinal)"],
    [8266.2, 3700.9, -2.3534, 1, "Ciudad Urbisa I y II Sector - Castilla Real (2 Sector) (parque vecinal)"],
    [7266.3, 4006.7, -0.7694, 1, "Otero de Francisco (parque vecinal)"]
  ];
  const SIT = sitios ? sitios.map((r, i) => { const w = T3.lw(r.mx, r.my), plaza = r.tipo === 'plaza';
      return { id: r.id != null ? r.id : i, n: r.n, tipo: plaza ? 'plaza' : 'barrio', x: w[0], z: w[1], a: r.a || 0, s: r.s || 1, parque: r.parque || null, y: null, ok: false, abierto: false, geo: null, hu: plaza ? 51 : 26, hv: plaza ? 22 : 12 }; })
    : MER.map((m, i) => { const r = SITIOS[i]; const w = T3.lw((r ? r[0] : m.p[0]), (r ? r[1] : m.p[1]));
      return { id: i, n: m.n || ('Mercado de barrio ' + (i + 1)), tipo: 'barrio', x: w[0], z: w[1], a: r ? r[2] : 0, s: r ? r[3] : 1, parque: r ? r[4] : null, y: null, ok: false, abierto: true, geo: null, hu: 26, hv: 12 }; });
  const HU = 26, HV = 12; // medio largo y medio ancho de la huella de barrio (piso incluido, 52 x 24 m, ~40 puestos); la plazoleta usa S.hu x S.hv = 51 x 22 (102 x 44 m, ~112 puestos)
  /* ---------- 2. texturas procedurales ---------- */
  const texAdo = lienzo(256, 256, (g, w, h) => { // adoquín de concreto 20x10 cm en hiladas trabadas; la textura cubre 1,6 m
    g.fillStyle = '#4a4742'; g.fillRect(0, 0, w, h); const pw = 32, ph = 16;
    for (let r = 0; r < h / ph; r++) for (let c = -1; c < w / pw + 1; c++) { const x = c * pw + (r % 2) * pw / 2, v = rnd(), gr = 138 + rnd() * 34;
      g.fillStyle = v < 0.18 ? `rgb(${gr + 22},${gr - 18},${gr - 34})` : v < 0.3 ? `rgb(${gr - 30},${gr - 26},${gr - 24})` : `rgb(${gr},${gr - 3},${gr - 8})`; g.fillRect(x + 1, r * ph + 1, pw - 2, ph - 2);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 1, r * ph + 1, pw - 2, 2); }
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '30,28,24' : '200,195,180'},${0.05 + rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } });
  const texMad = lienzo(512, 512, (g, w, h) => { // tablas de ~12 cm con veta, juntas y clavos; cubre 1 m
    for (let k = 0; k < 8; k++) { const y = k * 64, b = rnd(); g.fillStyle = `rgb(${150 + b * 36},${112 + b * 26},${72 + b * 18})`; g.fillRect(0, y, w, 64);
      for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(${70 + rnd() * 30},${44 + rnd() * 20},22,${0.12 + rnd() * 0.25})`; g.lineWidth = 1 + rnd(); const yy = y + 3 + rnd() * 58; g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(150, yy + 4 * (rnd() - 0.5), 350, yy + 5 * (rnd() - 0.5), w, yy + 2 * (rnd() - 0.5)); g.stroke(); }
      if (rnd() < 0.5) { const nx = rnd() * w, ny = y + 14 + rnd() * 36; g.fillStyle = 'rgba(60,36,16,.55)'; g.beginPath(); g.ellipse(nx, ny, 5, 3, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(35,20,8,.75)'; g.fillRect(0, y, w, 2); }
    g.fillStyle = 'rgba(0,0,0,.1)'; for (let i = 0; i < 300; i++) g.fillRect(rnd() * w, rnd() * h, 2, 1); });
  const texZinc = lienzo(128, 128, (g, w, h) => { // teja de zinc ondulada: la onda se repite cada 25 cm (texturas de 0,5 m con dos ondas)
    for (let x = 0; x < w; x++) { const f = 0.5 + 0.5 * Math.sin(x / w * Math.PI * 4); const v = Math.round(206 + f * 28); g.fillStyle = `rgb(${v - 4},${v},${v - 2})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '90,72,52' : '240,240,235'},${0.04 + rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 1, 3 + rnd() * 18); } });
  const texLona = lienzo(128, 8, (g, w, h) => { // franjas de lona de 22 cm (una clara y una apenas más oscura) con trama
    for (let x = 0; x < w; x++) { const franja = Math.floor(x / (w / 2)); g.fillStyle = franja ? 'rgb(208,204,198)' : 'rgb(255,252,246)'; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 1, 1); } });
  const TIPOS = ['tomate', 'papa', 'cebolla', 'zanahoria', 'platano', 'mazorca', 'lechuga', 'naranja', 'mango', 'papaya', 'pina', 'aguacate']; // los de barrio usan los 8 primeros; la plazoleta, además, mango, papaya, piña y aguacate
  const TIPOS_FRUTA = ['platano', 'naranja', 'mango', 'papaya', 'pina', 'aguacate', 'tomate', 'naranja', 'platano', 'mango'], TIPOS_VERDURA = ['tomate', 'papa', 'cebolla', 'zanahoria', 'mazorca', 'lechuga', 'papa', 'cebolla'];
  const bola = (g, x, y, r, col, sx = 1) => { const q = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05); q.addColorStop(0, col[1]); q.addColorStop(0.65, col[0]); q.addColorStop(1, col[2]);
    g.fillStyle = q; g.beginPath(); g.ellipse(x, y, r * sx, r, 0, 0, 7); g.fill(); };
  const texFruta = lienzo(2048, 1536, (g) => {
    TIPOS.forEach((tp, k) => { const ox = (k % 4) * 512, oy = Math.floor(k / 4) * 512; g.save(); g.beginPath(); g.rect(ox, oy, 512, 512); g.clip(); g.translate(ox, oy);
      g.fillStyle = tp === 'lechuga' ? '#2f5a1f' : tp === 'platano' ? '#5b4a1a' : tp === 'pina' ? '#5a4416' : tp === 'aguacate' ? '#2c3a1a' : '#3a2a1c'; g.fillRect(0, 0, 512, 512);
      const items = []; const N = tp === 'tomate' || tp === 'naranja' ? 430 : tp === 'papa' || tp === 'cebolla' ? 340 : tp === 'lechuga' ? 90 : tp === 'mango' ? 230 : tp === 'aguacate' ? 280 : tp === 'papaya' ? 120 : tp === 'pina' ? 80 : 170; for (let i = 0; i < N; i++) items.push([rnd() * 560 - 24, rnd() * 560 - 24, rnd()]); items.sort((a, b) => a[1] - b[1]);
      for (const [x, y, v] of items) {
        if (tp === 'mango') { const c = v < 0.45 ? ['#d99a2b', '#f3c553', '#8f5f0e'] : v < 0.8 ? ['#cf7a22', '#f0a043', '#86480c'] : ['#8aa23a', '#bdd25f', '#566a1c']; bola(g, x, y, 19 + v * 4, c, 1.12); g.fillStyle = 'rgba(190,40,20,.35)'; g.beginPath(); g.ellipse(x + 6, y - 5, 9, 7, 0.4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(x - 7, y - 8, 5, 3, -0.5, 0, 7); g.fill(); }
        else if (tp === 'aguacate') { const c = v < 0.5 ? ['#35501f', '#5e8236', '#17250c'] : ['#3d3a20', '#6b6a38', '#1b180c']; bola(g, x, y + 3, 16 + v * 3, c, 0.92); bola(g, x, y - 9, 11 + v * 2, c, 0.9); g.fillStyle = 'rgba(0,0,0,.25)'; for (let n = 0; n < 7; n++) g.fillRect(x - 11 + rnd() * 22, y - 12 + rnd() * 26, 1.6, 1.6); }
        else if (tp === 'papaya') { g.save(); g.translate(x, y); g.scale(0.7, 0.7); g.rotate(-0.6 + v * 1.2); const q = g.createLinearGradient(0, -22, 0, 22); q.addColorStop(0, '#f3b04a'); q.addColorStop(0.5, '#e8892a'); q.addColorStop(1, '#a8571a'); g.fillStyle = q; g.beginPath(); g.moveTo(-58, 0); g.quadraticCurveTo(-46, -26, 6, -23); g.quadraticCurveTo(44, -21, 62, -4); g.quadraticCurveTo(66, 2, 60, 7); g.quadraticCurveTo(40, 22, 6, 24); g.quadraticCurveTo(-46, 26, -58, 0); g.fill(); g.strokeStyle = 'rgba(110,150,40,.55)'; g.lineWidth = 3; for (let n = 0; n < 3; n++) { g.beginPath(); g.moveTo(-44 + n * 4, -14 + n * 14); g.quadraticCurveTo(6, -18 + n * 15, 54, -3 + n * 6); g.stroke(); } g.fillStyle = '#5b7a2a'; g.fillRect(-64, -4, 8, 8); g.restore(); }
        else if (tp === 'pina') { bola(g, x, y + 4, 25 + v * 4, v < 0.5 ? ['#c98a1f', '#eab94b', '#7a4a0a'] : ['#b9791a', '#dba43e', '#6b3f08'], 0.82); g.strokeStyle = 'rgba(90,50,5,.55)'; g.lineWidth = 1.4; for (let n = -3; n <= 3; n++) { g.beginPath(); g.moveTo(x + n * 7 - 14, y - 22); g.lineTo(x + n * 7 + 14, y + 30); g.moveTo(x + n * 7 + 14, y - 22); g.lineTo(x + n * 7 - 14, y + 30); g.stroke(); }
          g.fillStyle = '#4c7a2a'; for (let n = 0; n < 9; n++) { const a = -2.2 + n * 0.55; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + Math.cos(a) * 11, y - 20 + Math.sin(a) * 30 - 6); g.lineTo(x + Math.cos(a + 0.35) * 5, y - 18); g.fill(); } }
        else if (tp === 'tomate') { const c = v < 0.55 ? ['#bf2f1b', '#e8573a', '#7a1a10'] : v < 0.85 ? ['#cf3a20', '#f2704a', '#8a2012'] : ['#d9622a', '#f29a5a', '#92411a']; bola(g, x, y, 16 + v * 4, c); g.fillStyle = '#3f6b2a'; g.beginPath(); g.arc(x, y - 11, 4, 0, 7); g.fill(); }
        else if (tp === 'naranja') { const c = v < 0.5 ? ['#e08516', '#f7ad4a', '#9a5208'] : ['#ec9a22', '#ffc766', '#a35c0b']; bola(g, x, y, 17 + v * 3, c); g.fillStyle = 'rgba(120,60,0,.35)'; for (let n = 0; n < 6; n++) g.fillRect(x - 12 + rnd() * 22, y - 12 + rnd() * 22, 1.5, 1.5); }
        else if (tp === 'papa') { const c = v < 0.4 ? ['#b58b5e', '#d9b98c', '#6e4e30'] : v < 0.75 ? ['#a67a4d', '#cfae80', '#664528'] : ['#c4a273', '#e6cb9f', '#7c5c3a']; bola(g, x, y, 15 + v * 5, c, 1.2); g.fillStyle = 'rgba(70,45,25,.7)'; for (let n = 0; n < 3; n++) g.fillRect(x - 12 + rnd() * 24, y - 8 + rnd() * 16, 2.5, 2); }
        else if (tp === 'cebolla') { const c = v < 0.6 ? ['#8c3a4d', '#c26f7f', '#4e1a2a'] : ['#c9944f', '#ecc684', '#7d5224']; bola(g, x, y, 15 + v * 4, c); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 18); g.quadraticCurveTo(x - 9, y, x, y + 18); g.stroke(); g.fillStyle = '#7e8a4a'; g.fillRect(x - 1.5, y - 28, 3, 9); }
        else if (tp === 'zanahoria') { g.save(); g.translate(x, y); g.scale(0.62, 0.62); g.rotate(-0.45 + v * 0.9 + (v > 0.5 ? 0 : 0)); const q = g.createLinearGradient(0, -9, 0, 9); q.addColorStop(0, '#f08a2a'); q.addColorStop(0.5, '#ee7a18'); q.addColorStop(1, '#b4560c'); g.fillStyle = q; g.beginPath(); g.moveTo(-62, -2); g.lineTo(44, -12); g.quadraticCurveTo(54, 0, 44, 12); g.lineTo(-62, 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,50,0,.35)'; g.lineWidth = 1; for (let n = 0; n < 5; n++) { g.beginPath(); g.moveTo(-50 + n * 22, -9); g.lineTo(-50 + n * 22, 9); g.stroke(); } g.fillStyle = '#3f7a28'; g.fillRect(44, -6, 18, 12); g.restore(); }
        else if (tp === 'platano') { g.save(); g.translate(x, y); g.scale(0.62, 0.62); g.rotate(-0.6 + v * 1.2); const verde = v < 0.28; g.lineCap = 'round'; g.strokeStyle = verde ? '#8aa83a' : '#e6bd2a'; g.lineWidth = 27; g.beginPath(); g.moveTo(-70, 12); g.quadraticCurveTo(0, -26, 70, 12); g.stroke(); g.strokeStyle = verde ? '#a6c24c' : '#f6d54a'; g.lineWidth = 9; g.beginPath(); g.moveTo(-62, 8); g.quadraticCurveTo(0, -30, 62, 8); g.stroke(); g.fillStyle = '#4a3a14'; g.beginPath(); g.arc(-72, 13, 6, 0, 7); g.arc(72, 13, 6, 0, 7); g.fill(); if (v > 0.6) { g.fillStyle = 'rgba(90,60,10,.5)'; for (let n = 0; n < 6; n++) g.fillRect(-50 + rnd() * 100, -6 + rnd() * 14, 2, 2); } g.restore(); }
        else if (tp === 'mazorca') { g.save(); g.translate(x, y); g.scale(0.62, 0.62); g.rotate(-0.7 + v * 1.4); const q = g.createLinearGradient(0, -15, 0, 15); q.addColorStop(0, '#f2cf48'); q.addColorStop(1, '#c79a1e'); g.fillStyle = q; g.beginPath(); g.moveTo(-58, 0); g.quadraticCurveTo(-50, -17, 10, -17); g.quadraticCurveTo(52, -12, 58, 0); g.quadraticCurveTo(52, 12, 10, 17); g.quadraticCurveTo(-50, 17, -58, 0); g.fill(); g.fillStyle = 'rgba(150,100,10,.55)'; for (let i = -50; i < 50; i += 7) for (let j = -12; j <= 12; j += 7) g.fillRect(i, j, 2.5, 2.5); g.fillStyle = '#6a8f33'; g.beginPath(); g.moveTo(-66, 0); g.quadraticCurveTo(-30, -26, 10, -12); g.quadraticCurveTo(-30, -2, -66, 0); g.fill(); g.restore(); }
        else if (tp === 'lechuga') { const c0 = v < 0.5 ? ['#74b83c', '#b6e070', '#3f7a22'] : ['#5fa22e', '#a2d466', '#2f6a1c']; for (let n = 0; n < 3; n++) bola(g, x + (n - 1) * 5, y + (n - 1) * 3, 40 - n * 8, c0); g.strokeStyle = 'rgba(235,250,200,.4)'; g.lineWidth = 2; for (let n = 0; n < 8; n++) { const a = n * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke(); } }
      }
      g.restore(); });
  });
  texFruta.wrapS = texFruta.wrapT = THREE.ClampToEdgeWrapping;
  const texCartel = lienzo(1024, 192, (g, w, h) => {
    g.fillStyle = '#1f4a34'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e7dfc8'; g.lineWidth = 5; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#efe6cc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 78px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; g.fillText('MERCADO CAMPESINO DE BARRIO', w / 2, 82);
    g.fillStyle = '#c8d98a'; g.font = '400 36px Arial, sans-serif'; g.fillText('Productores locales  ·  frutas, verduras y tubérculos frescos', w / 2, 150); }, false);
  const texCartelP = lienzo(1024, 192, (g, w, h) => {
    g.fillStyle = '#7a2e1c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f1e2c0'; g.lineWidth = 5; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#f6ead0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 74px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; g.fillText('PLAZOLETA DE MERCADO', w / 2, 80);
    g.fillStyle = '#f2c46a'; g.font = '400 36px Arial, sans-serif'; g.fillText('Frutas y verduras del campo  ·  de la huerta al parque', w / 2, 148); }, false);
  const texBod = lienzo(1024, 384, (g, w, h) => { // atlas de rótulos de la bodega: arriba el letrero del recibo 24 h, abajo la placa del cuarto frío
    g.fillStyle = '#2b3236'; g.fillRect(0, 0, w, 192); g.fillStyle = '#e3bd22'; g.fillRect(0, 0, 18, 192); g.fillStyle = '#d8dedb'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '600 92px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; g.fillText('BODEGA  ·  RECIBO 24 H', 50, 82); g.fillStyle = '#9fb3ad'; g.font = '400 36px Arial, sans-serif'; g.fillText('Cuarto frío  ·  descargue a cualquier hora', 52, 152);
    g.fillStyle = '#e9efee'; g.fillRect(0, 192, w, 192); g.fillStyle = '#1c5fa8'; g.fillRect(0, 192, w, 22); g.fillStyle = '#243038'; g.textAlign = 'center';
    g.font = '600 96px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; g.fillText('CUARTO FRÍO', w / 2, 290); g.font = '500 44px Arial, sans-serif'; g.fillText('Cadena de frío  ·  2 a 6 °C', w / 2, 352); }, false);
  const texConc = lienzo(256, 256, (g, w, h) => { // concreto con juntas cada 1,6 m y manchas
    g.fillStyle = '#9d9a93'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,58,52' : '225,222,210'},${0.03 + rnd() * 0.09})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
    g.strokeStyle = 'rgba(40,38,34,.55)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); });

  /* ---------- 3. materiales (uno por tipo; vertexColors para variar el color de cada pieza) ---------- */
  const mat = (ex) => new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, envMap: T3.env || null, envMapIntensity: 1.0, ...ex }); // con el mapa de entorno del cielo, bajo la cubierta también llega luz difusa
  const MATS = {
    ado: mat({ map: texAdo, roughness: 0.96 }), mad: mat({ map: texMad, roughness: 0.88 }), met: mat({ roughness: 0.55, metalness: 0.2 }),
    teja: mat({ map: texZinc, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide }), lona: mat({ map: texLona, roughness: 0.92, side: THREE.DoubleSide }),
    plas: mat({ roughness: 0.62 }), fruta: mat({ map: texFruta, roughness: 0.7 }), cartel: mat({ map: texCartel, roughness: 0.6, side: THREE.DoubleSide }),
    cartelP: mat({ map: texCartelP, roughness: 0.6, side: THREE.DoubleSide }), conc: mat({ map: texConc, roughness: 0.95 }), hoja: mat({ roughness: 0.88, side: THREE.DoubleSide }), vidrio: mat({ roughness: 0.12, metalness: 0.5 }),
    bod: mat({ map: texBod, roughness: 0.55, side: THREE.DoubleSide }), luz: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
  };
  const SOMBRA = { bod: [1, 0], luz: [0, 0],mad: [1, 1], met: [1, 0], teja: [1, 1], lona: [1, 0], plas: [1, 1], ado: [0, 1], fruta: [0, 1], cartel: [1, 0], cartelP: [1, 0], conc: [1, 1], hoja: [1, 1], vidrio: [0, 0] };
  const LONAS = ['#a9573c', '#6d7b40', '#c49a3b', '#3f6c76', '#d5c9ae', '#7e4141', '#4e6d56', '#8f6a3a'];

  /* ---------- 4. piezas: cada una se transforma al mundo y se acumula por material ---------- */
  let ACC = {}; let M0 = new THREE.Matrix4();
  const _e = new THREE.Euler(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
  const _c = new THREE.Color();
  const poner = (key, g0, color, x, y, z, rx = 0, ry = 0, rz = 0, esc = 0) => {
    const g = g0.index ? g0.toNonIndexed() : g0; const P = g.attributes.position, N = g.attributes.normal;
    if (esc) { const U = new Float32Array(P.count * 2); for (let i = 0; i < P.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
      if (ay >= ax && ay >= az) { U[i * 2] = P.getX(i) / esc; U[i * 2 + 1] = P.getZ(i) / esc; } else if (ax >= az) { U[i * 2] = P.getZ(i) / esc; U[i * 2 + 1] = P.getY(i) / esc; } else { U[i * 2] = P.getX(i) / esc; U[i * 2 + 1] = P.getY(i) / esc; } }
      g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); }
    _c.set(color); const C = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { C[i * 3] = _c.r; C[i * 3 + 1] = _c.g; C[i * 3 + 2] = _c.b; } g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    _q.setFromEuler(_e.set(rx, ry, rz)); _m.compose(_p.set(x, y, z), _q, _s.set(1, 1, 1)); g.applyMatrix4(_m); g.applyMatrix4(M0);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && k !== 'color') g.deleteAttribute(k);
    (ACC[key] = ACC[key] || []).push(g); };
  const caja = (key, w, h, d, x, y, z, color, esc = 1, rx = 0, ry = 0, rz = 0) => poner(key, new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz, esc);
  const cil = (key, rt, rb, h, seg, x, y, z, color, esc = 1, rx = 0, ry = 0, rz = 0) => poner(key, new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz, esc);
  let MS = [12, 5]; // segmentos de los montones de fruta (la plazoleta, con más de 50 puestos, usa menos)
  // montón de producto sobre un huacal: media esfera aplastada con relieve; el atlas de frutas da el color y la forma de cada tipo
  const monton = (tipo, sx, sy, sz, x, y, z, ry = 0) => {
    const g = new THREE.SphereGeometry(1, MS[0], MS[1], 0, Math.PI * 2, 0, Math.PI / 2), P = g.attributes.position, U = g.attributes.uv, k = TIPOS.indexOf(tipo), c = k % 4, r = Math.floor(k / 4);
    for (let i = 0; i < P.count; i++) { const px = P.getX(i), pz = P.getZ(i), py = P.getY(i); const rr = Math.hypot(px, pz); const b = (Math.sin(px * 17 + pz * 11) * Math.cos(pz * 19 - px * 7)) * 0.07 * (1 - rr * 0.6) * (py > 0.05 ? 1 : 0); P.setY(i, py * (1 + b) + (rr < 0.97 ? 0 : 0)); U.setXY(i, (c + 0.5 + px * 0.49) / 4, 1 - (r + 0.5 + pz * 0.49) / 3); }
    g.computeVertexNormals(); g.scale(sx, sy, sz); poner('fruta', g, '#ffffff', x, y, z, 0, ry, 0); };
  // huacal sin rotación propia: paredes en el marco del puesto (los puestos solo giran 0 o PI, no hace falta más)
  const huacalSimple = (w, h, d, x, y, z, tipo) => {
    const col = '#c4a070'; caja('mad', w, h, d, x, y + h / 2, z, col, 0.8);
    caja('mad', w + 0.03, 0.025, d + 0.03, x, y + h - 0.012, z, '#b08b5c', 0.8); // borde superior
    caja('mad', w + 0.03, 0.025, d + 0.03, x, y + 0.012, z, '#a98550', 0.8); // zuncho inferior
    if (tipo) monton(tipo, w * 0.47, h * 0.55, d * 0.47, x, y + h - 0.02, z); };
  const mesa = (x, z, w, d, hy) => { // mesón de madera con patas y travesaño
    caja('mad', w, 0.05, d, x, hy, z, '#d7b383', 1);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) caja('mad', 0.06, hy, 0.06, x + dx * (w / 2 - 0.08), hy / 2, z + dz * (d / 2 - 0.08), '#a98456', 1);
    caja('mad', w - 0.2, 0.04, 0.05, x, 0.3, z - d / 2 + 0.08, '#a98456', 1); caja('mad', w - 0.2, 0.04, 0.05, x, 0.3, z + d / 2 - 0.08, '#a98456', 1); };
  let kt = 0;
  const puesto = (u, vc, sg, toldo, ic) => { // sg = +1/-1 lado del mercado: el cliente se acerca desde el pasillo (sg*) o desde afuera
    const hy = 0.07 + 0.86, w = toldo ? 2.9 : 2.5, d = 0.95, front = toldo ? 1 : -1; // el frente del mesón mira al cliente
    mesa(u, vc, w, d, hy);
    caja('lona', w, 0.46, 0.015, u, hy - 0.28, vc + sg * front * (d / 2 + 0.005) * 1, LONAS[(ic + 3) % LONAS.length], 0.44); // faldón de lona del mesón
    for (let c = 0; c < 3; c++) huacalSimple(0.66, 0.22, 0.4, u - w / 3 + c * w / 3, hy + 0.025, vc + sg * front * 0.18, TIPOS[(kt++ + ic) % 8]);
    // repisa trasera con huacales más pequeños
    caja('mad', w - 0.1, 0.04, 0.4, u, hy + 0.3, vc - sg * front * 0.27, '#a98456', 1);
    for (const dx of [-1, 1]) caja('mad', 0.05, 0.3, 0.05, u + dx * (w / 2 - 0.15), hy + 0.15, vc - sg * front * 0.4, '#a98456', 1);
    for (let c = 0; c < 3; c++) huacalSimple(0.5, 0.18, 0.32, u - w / 3 + c * w / 3, hy + 0.32, vc - sg * front * 0.27, TIPOS[(kt++ + ic + 4) % 8]);
    if (ic % 2 === 0) { // canastas de mimbre en el piso junto al puesto
      for (const dx of [-0.9, 0.9]) { cil('mad', 0.26, 0.2, 0.3, 10, u + dx * w / 2 * 0.62, 0.07 + 0.15, vc + sg * front * (d / 2 + 0.38), '#b6894a', 0.5); monton(TIPOS[(ic + (dx > 0 ? 2 : 5)) % 8], 0.25, 0.14, 0.25, u + dx * w / 2 * 0.62, 0.07 + 0.29, vc + sg * front * (d / 2 + 0.38)); } }
    if (toldo) { // toldo de lona inclinado sobre postes de tubo metálico
      const lc = LONAS[ic % LONAS.length], vb = vc - sg * 1.25, vf = vc + sg * 1.45, yb = 2.7, yf = 2.15, L = Math.hypot(vf - vb, yb - yf), ang = Math.atan2(yb - yf, Math.abs(vf - vb));
      for (const dx of [-1, 1]) { cil('met', 0.025, 0.025, yb, 6, u + dx * 1.5, 0.07 + yb / 2, vb, '#5b6460', 0.5); cil('met', 0.025, 0.025, yf, 6, u + dx * 1.5, 0.07 + yf / 2, vf, '#5b6460', 0.5); }
      caja('lona', 3.2, 0.02, L, u, 0.07 + (yb + yf) / 2 + 0.01, (vb + vf) / 2, lc, 0.44, sg * ang, 0, 0);
      caja('lona', 3.2, 0.24, 0.015, u, 0.07 + yf - 0.11, vf, lc, 0.44);
      cil('met', 0.012, 0.012, 3.2, 5, u, 0.07 + (yb + yf) / 2 - 0.04 + 0.0, (vb + vf) / 2, '#5b6460', 0.5, 0, 0, Math.PI / 2); }
  };
  const sombrilla = (u, v, ic) => {
    const col = LONAS[ic % LONAS.length];
    cil('met', 0.02, 0.025, 2.4, 6, u, 0.07 + 1.2, v, '#6a716d', 0.5);
    poner('lona', new THREE.ConeGeometry(1.45, 0.42, 10, 1, true), col, u, 0.07 + 2.4 + 0.1, v, 0, 0.3, 0, 0.44);
    mesa(u, v, 1.5, 0.8, 0.07 + 0.82);
    for (let c = 0; c < 2; c++) huacalSimple(0.58, 0.2, 0.36, u - 0.36 + c * 0.72, 0.07 + 0.845, v, TIPOS[(ic * 2 + c + 1) % 8]);
  };
  const banca = (u, v, sg) => {
    caja('mad', 1.7, 0.05, 0.42, u, 0.07 + 0.45, v, '#bf9b66', 1); caja('mad', 1.7, 0.36, 0.04, u, 0.07 + 0.72, v + sg * 0.19, '#bf9b66', 1, -sg * 0.12);
    for (const dx of [-0.7, 0.7]) { caja('met', 0.05, 0.45, 0.05, u + dx, 0.07 + 0.225, v - sg * 0.15, '#3b423f', 0.5); caja('met', 0.05, 0.45, 0.05, u + dx, 0.07 + 0.225, v + sg * 0.15, '#3b423f', 0.5); } };
  const canecas = (u, v) => { [['#2f7d3a', 0], ['#e6e6df', 1], ['#26292c', 2]].forEach(([c, i]) => { const x = u, z = v + (i - 1) * 0.62;
    cil('plas', 0.26, 0.21, 0.9, 12, x, 0.07 + 0.45, z, c, 0.5); cil('plas', 0.28, 0.28, 0.06, 12, x, 0.07 + 0.93, z, c, 0.5); caja('plas', 0.04, 0.04, 0.22, x, 0.07 + 0.97, z, '#202326', 0.5); });
    caja('plas', 0.04, 1.5, 1.9, u - 0.34, 0.07 + 0.75, v, '#d9d4c4', 0.5); // tablero con las tres categorías
    caja('plas', 0.045, 0.4, 0.6, u - 0.35, 0.07 + 1.28, v - 0.62, '#2f7d3a', 0.5); caja('plas', 0.045, 0.4, 0.6, u - 0.35, 0.07 + 1.28, v, '#cfd2cc', 0.5); caja('plas', 0.045, 0.4, 0.6, u - 0.35, 0.07 + 1.28, v + 0.62, '#26292c', 0.5); };

  /* ---------- 4a. MÓDULO DE BODEGA con cuarto frío (recibo 24 h): junto a la zona de carga de cada mercado ----------
     Podio de concreto a la altura del andén (1,05 m), bodega de bloque repellado con cubierta de lámina bajo antepecho, cuarto frío de panel sándwich blanco con unidad condensadora en el techo,
     puerta enrollable con guías y cajón, nivelador, topes de caucho, lámparas de muelle y el letrero «Bodega · recibo 24 h». c = {vf, n, D, ap, pw, c0, c1, h0, h1, ub, bw, fill}:
     vf = v de la cara del podio, n = sentido (+1/-1) hacia afuera de la cara, D = fondo, ap = andén que sale de la cara, pw = repisa frente a las puertas, c0..c1 = cuarto frío, h0..h1 = bodega, ub/bw = centro y ancho de la bahía. */
  const rotulo = (w, h, sup, u, y, v, ry) => { const g = new THREE.PlaneGeometry(w, h), U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setY(i, sup ? 0.5 + U.getY(i) * 0.5 : U.getY(i) * 0.5); poner('bod', g, '#ffffff', u, y, v, 0, ry, 0, 0); };
  const bodega = (c) => {
    const { vf, n, D, pw, c0, c1, h0, h1, fill, bays } = c, V = (b) => vf - n * b, VF = V(pw), P = 1.05, YF = 0.07 + P, HH = 4.0, ry = n > 0 ? 0 : Math.PI;
    const u0 = c0, u1 = h1, uc = (u0 + u1) / 2, vm = V((pw + D) / 2), dm = D - pw;
    caja('conc', u1 - u0, P, D, uc, 0.07 + P / 2, V(D / 2), '#b3afa5', 1.6); // podio a la altura del andén
    if (fill) caja('conc', fill[1] - fill[0], P, 0.3, (fill[0] + fill[1]) / 2, 0.07 + P / 2, V(-0.15), '#bdb9ae', 1.6); // empata con el andén de la zona de carga
    for (const { ub, bw, ap = 0, apw, plat } of bays) { // por bahía: andén (si sale de la cara), topes de caucho, nivelador y línea amarilla
      if (ap > 0) caja('conc', apw, P, ap, ub, 0.07 + P / 2, V(-ap / 2), '#bdb9ae', 1.6);
      const fb = plat ? -0.3 : -ap, vb = V(fb);
      if (!plat) { for (const sg of [-1, 1]) caja('plas', 0.5, 0.46, 0.14, ub + sg * (bw / 2 + 0.2), YF - 0.36, vb + n * 0.07, '#17181a', 0.5); caja('plas', bw + 1.0, 0.02, 0.12, ub, YF + 0.01, V(fb + 0.1), '#e3bd22', 0.5); }
      caja('met', bw - 0.5, 0.03, pw - fb, ub, YF + 0.015, V((pw + fb) / 2), '#7b8280', 0.5); }
    // bodega: bloque repellado, zócalo, columnas de esquina, antepecho y cubierta de lámina
    const hl = h1 - h0, hc = (h0 + h1) / 2;
    caja('plas', hl, HH, dm, hc, YF + HH / 2, vm, '#ece1ca', 0.5); caja('plas', hl + 0.06, 0.5, dm + 0.06, hc, YF + 0.25, vm, '#8c8576', 0.5);
    caja('conc', hl + 0.14, 0.08, dm + 0.14, hc, YF + HH + 0.04, vm, '#cbc5b8', 1.6);
    caja('teja', hl + 0.3, 0.05, dm + 0.45, hc, YF + HH + 0.2, vm + n * 0.1, '#cfd3cf', 0.5, n * 0.05, 0, 0); for (const sg of [-1, 1]) caja('met', 0.05, 0.14, dm + 0.4, hc + sg * (hl / 2 + 0.15), YF + HH + 0.12, vm + n * 0.1, '#6a716d', 0.5, n * 0.05, 0, 0); // cubierta de lámina con remates laterales
    for (const u of [h0 + 0.12, h1 - 0.12]) caja('conc', 0.26, HH, 0.1, u, YF + HH / 2, VF + n * 0.05, '#dccfb6', 1.6);
    caja('met', hl + 0.1, 0.1, 0.12, hc, YF + HH - 0.1, VF + n * 0.08, '#6a716d', 0.5); // canal
    cil('met', 0.045, 0.045, HH - 0.15, 8, h1 - 0.35, YF + (HH - 0.15) / 2, VF + n * 0.14, '#6a716d', 0.5); // bajante
    caja('met', 0.04, 0.5, 1.4, h1 + 0.02, YF + 3.0, V(pw + dm * 0.5), '#59615d', 0.5); for (let k = 0; k < 4; k++) caja('met', 0.05, 0.025, 1.36, h1 + 0.04, YF + 2.82 + k * 0.12, V(pw + dm * 0.5), '#8d9290', 0.5); // rejilla de ventilación
    // bahía: puerta enrollable de lámina con ranuras, guías, cajón del rollo y sello inferior
    const dh = 2.9; for (const { ub, bw } of bays) {
    caja('met', bw, dh, 0.06, ub, YF + dh / 2, VF + n * 0.03, '#cdd2d4', 0.5);
    for (let k = 1; k < 10; k++) caja('met', bw, 0.022, 0.075, ub, YF + k * 0.29, VF + n * 0.035, '#9aa0a2', 0.5);
    for (const sg of [-1, 1]) caja('met', 0.16, dh + 0.1, 0.14, ub + sg * (bw / 2 + 0.08), YF + (dh + 0.1) / 2, VF + n * 0.07, '#5f6663', 0.5);
    caja('met', bw + 0.4, 0.42, 0.3, ub, YF + dh + 0.2, VF + n * 0.15, '#7d8583', 0.5); caja('plas', bw, 0.09, 0.08, ub, YF + 0.045, VF + n * 0.04, '#17181a', 0.5);
    caja('plas', 0.12, 0.3, 0.05, ub + bw / 2 - 0.5, YF + 1.0, VF + n * 0.08, '#e3bd22', 0.5); // manija de la puerta
    for (const sg of [-1, 1]) { const ul = ub + sg * (bw / 2 + 0.55), yl = YF + dh + 0.1; // lámparas de muelle: brazo con cabeza luminosa
      caja('met', 0.05, 0.05, 0.62, ul, yl, VF + n * 0.31, '#454b48', 0.5); caja('met', 0.05, 0.3, 0.05, ul, yl - 0.12, VF + n * 0.02, '#454b48', 0.5); caja('luz', 0.34, 0.07, 0.2, ul, yl - 0.07, VF + n * 0.6, '#fff0bf', 0.5); caja('plas', 0.38, 0.05, 0.24, ul, yl + 0.0, VF + n * 0.6, '#2b2e30', 0.5); } }
    rotulo(2.6, 0.487, true, (h0 + h1) / 2, YF + 3.6, VF + n * 0.035, ry); // letrero discreto «Bodega · recibo 24 h»
    // cuarto frío: panel sándwich blanco, zócalo de acero, juntas de panel, puerta aislada, placa y unidad condensadora
    const cw = c1 - c0, cc = (c0 + c1) / 2, CH = 4.6;
    caja('plas', cw, CH, dm, cc, YF + CH / 2, vm, '#f1f3f1', 0.5); caja('met', cw + 0.05, 0.28, dm + 0.05, cc, YF + 0.14, vm, '#98a09e', 0.5); caja('met', cw + 0.08, 0.06, dm + 0.08, cc, YF + CH + 0.03, vm, '#aab1af', 0.5);
    for (let k = 1; k < cw; k++) { caja('plas', 0.014, CH - 0.35, 0.012, c0 + k, YF + 0.28 + (CH - 0.35) / 2, VF + n * 0.006, '#c7ccca', 0.5); }
    for (let k = 1; k < dm; k += 1) caja('plas', 0.012, CH - 0.35, 0.014, c0 - 0.006, YF + 0.28 + (CH - 0.35) / 2, V(pw + k), '#c7ccca', 0.5);
    caja('plas', cw, 0.22, 0.02, cc, YF + 3.45, VF + n * 0.012, '#1c5fa8', 0.5); rotulo(1.9, 0.355, false, cc, YF + 3.0, VF + n * 0.02, ry);
    caja('met', 1.3, 2.3, 0.05, cc, YF + 1.2, VF + n * 0.025, '#b4bab9', 0.5); caja('plas', 1.1, 2.1, 0.09, cc, YF + 1.15, VF + n * 0.05, '#e6e9e7', 0.5);
    caja('met', 0.05, 0.55, 0.07, cc + 0.4, YF + 1.1, VF + n * 0.13, '#8a9190', 0.5); for (const y of [0.45, 1.7]) caja('met', 0.07, 0.16, 0.06, cc - 0.58, YF + y, VF + n * 0.1, '#8a9190', 0.5);
    caja('luz', 0.2, 0.1, 0.02, cc + 0.0, YF + 2.38, VF + n * 0.1, '#8fe39a', 0.5); caja('plas', 1.1, 0.26, 0.05, cc, YF + 0.16, VF + n * 0.07, '#17181a', 0.5); // visor de temperatura y burlete
    const ty = YF + CH + 0.06; for (const uu of cw > 5.5 ? [cc - cw * 0.22, cc + cw * 0.22] : [cc]) { caja('met', 1.9, 0.14, 1.3, uu, ty + 0.07, vm, '#5f6663', 0.5); caja('met', 1.8, 0.78, 1.2, uu, ty + 0.14 + 0.39, vm, '#dfe3e2', 0.5); // unidades condensadoras en el techo
      for (const sg of [-1, 1]) { cil('met', 0.4, 0.4, 0.04, 16, uu + sg * 0.45, ty + 0.94, vm, '#2a2d2f', 0.5); cil('met', 0.16, 0.16, 0.05, 10, uu + sg * 0.45, ty + 0.96, vm, '#565c5a', 0.5); } }
    caja('met', 0.08, 0.08, dm * 0.6, c0 + 0.3, ty + 0.3, vm, '#b87333', 0.5); cil('met', 0.04, 0.04, CH, 8, c0 + 0.06, YF + CH / 2, V(pw + 0.4), '#b87333', 0.5); // línea de refrigerante
  };

  const mercado = (S) => {
    const cu =Math.cos(S.a), su = Math.sin(S.a);
    M0.compose(new THREE.Vector3(S.x, S.y, S.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -S.a, 0)), new THREE.Vector3(S.s, S.s, S.s));
    kt = 0;
    // piso duro: losa de adoquín con sardinel claro; se hunde 0,3 m para sentarse en terrenos con pendiente
    caja('ado', 2 * HU, 0.4, 2 * HV, 0, 0.07 - 0.2, 0, '#e6e1d8', 1.6);
    for (const [w, d, x, z] of [[2 * HU + 0.3, 0.16, 0, -HV], [2 * HU + 0.3, 0.16, 0, HV], [0.16, 2 * HV, -HU, 0], [0.16, 2 * HV, HU, 0]]) caja('plas', w, 0.2, d, x, 0.07 + 0.04, z, '#b9b5ab', 0.5);
    // cubierta: 5 pórticos de acero (columnas, tirante, cabios y pendolón), correas y dos aguas de teja de zinc con cumbrera y canales
    const ST = '#59615d', FI = 0.262; let ic = 0;
    for (const fu of [-20, -15, -10, -5, 0, 5, 10, 15, 20]) {
      for (const sg of [-1, 1]) { caja('met', 0.16, 3.1, 0.16, fu, 0.07 + 1.55, sg * 5, ST, 0.5); caja('met', 0.1, 0.22, 0.6, fu, 0.07 + 3.0, sg * 5, ST, 0.5); // columna y cartela
        const L = Math.hypot(5.6, 1.5); caja('met', 0.08, 0.13, L, fu, 0.07 + 3.0 + 0.75 - 0.08, sg * 2.8, ST, 0.5, sg * FI, 0, 0); }
      caja('met', 0.07, 0.12, 10.2, fu, 0.07 + 3.0 - 0.02, 0, ST, 0.5); caja('met', 0.06, 1.3, 0.06, fu, 0.07 + 3.0 + 0.62, 0, ST, 0.5);
      for (const sg of [-1, 1]) caja('met', 0.04, 0.04, 3.1, fu, 0.07 + 3.0 + 0.25, sg * 1.25, ST, 0.5, sg * 0.38, 0, 0); // tornapuntas
    }
    for (const v of [-5.4, -2.8, 0, 2.8, 5.4]) caja('met', 45, 0.06, 0.08, 0, 0.07 + 4.5 - Math.abs(v) * 0.268 + 0.02, v, ST, 0.5);
    for (const sg of [-1, 1]) { caja('teja', 45.2, 0.045, Math.hypot(5.6, 1.5), 0, 0.07 + 3.75 + 0.14, sg * 2.8, '#cfd3cf', 0.5, sg * FI, 0, 0);
      caja('met', 45.4, 0.12, 0.14, 0, 0.07 + 2.95, sg * 5.65, '#6a716d', 0.5); // canal
      for (const du of [-20.5, -10.5, 0, 10.5, 20.5]) cil('met', 0.045, 0.045, 3.0, 8, du, 0.07 + 1.5, sg * 5.75, '#6a716d', 0.5); } // bajantes
    caja('met', 45.4, 0.05, 0.46, 0, 0.07 + 4.64, 0, '#7a8280', 0.5); // cumbrera
    // avisos en los dos extremos
    for (const sg of [-1, 1]) { poner('cartel', new THREE.PlaneGeometry(4.4, 0.83), '#ffffff', sg * 22.115, 0.07 + 3.28, 0, 0, sg * Math.PI / 2, 0, 0); poner('cartel', new THREE.PlaneGeometry(4.4, 0.83), '#ffffff', sg * 22.025, 0.07 + 3.28, 0, 0, -sg * Math.PI / 2, 0, 0); // aviso legible por las dos caras
      caja('mad', 0.07, 0.95, 4.5, sg * 22.07, 0.07 + 3.28, 0, '#7a5a38', 1); for (const dv of [-2, 2]) caja('met', 0.07, 3.3, 0.07, sg * 22.1, 0.07 + 1.65, dv, ST, 0.5); }
    // puestos bajo la cubierta (pasillo central de 3 m: 14 por hilera = 28) y puestos de toldo por fuera (8 al lado -v; 4 al lado +v, donde la bodega ocupa el resto) = 40
    for (const sg of [-1, 1]) for (let k = 0; k < 14; k++) puesto(-19.5 + k * 3, sg * 3.7, sg, false, ic++);
    for (const sg of [-1, 1]) for (let k = 0; k < (sg > 0 ? 4 : 8); k++) puesto(-15.75 + k * 4.5, sg * 8.6, sg, true, ic++);
    [[-24.2, -2.3], [-24.2, 2.3], [24.2, -2.3]].forEach(([u, v], i) => sombrilla(u, v, ic++ + i));
    for (const [u, v, sg] of [[-6.5, 10.7, 1], [-6.5, -10.7, -1], [6.5, -10.7, -1], [-18, 10.7, 1], [-18, -10.7, -1], [18, -10.7, -1]]) banca(u, v, sg);
    bodega({ vf: 11.9, n: 1, D: 4.3, pw: 0.6, c0: 6.6, c1: 12.6, h0: 12.6, h1: 25.4, bays: [{ ub: 16.2, bw: 2.8 }, { ub: 21.8, bw: 2.8 }] }); // bodega con cuarto frío y 2 bahías en el borde de la calle
    canecas(24.8, -7); canecas(-24.8, 7);
    // pilas de huacales vacíos y sacos de papa junto a los puestos de las esquinas
    for (const [u, v] of [[-24.3, -9.6], [-24.3, 9.6]]) { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) caja('mad', 0.6, 0.22, 0.4, u + j * 0.64, 0.07 + 0.11 + i * 0.22, v, '#c4a070', 0.8);
      for (let i = 0; i < 4; i++) caja('plas', 0.55, 0.2 + (i % 2) * 0.04, 0.38, u + 0.5 * (i % 2), 0.07 + 0.11 + (i >> 1) * 0.2, v + 0.55 + (i % 2) * 0.1, i % 2 ? '#b99b6a' : '#c8aa78', 0.5, 0, i * 0.3, 0); }
  };

  /* ---------- 4b. PLAZOLETA DE MERCADO (parque grande): huella 72 x 44 m, u = largo (hacia la zona de carga en +u), v = ancho ----------
     Entrada con portal y aviso al oeste (-u); dos naves de cubierta metálica a dos aguas (30 x 10 m, 20 puestos cada una, de frutas a un lado y de verduras al otro),
     calle central con 12 puestos de toldo, 4 puestos de sombrilla y 3 carretillas; al este una losa con bahías pintadas, tres vehículos (furgón, camión de estacas
     y camioneta) frente a un andén de carga de 1 m con bordillos de caucho y marquesina, huacales y sacos; perímetro con bancas, estaciones de residuos, farolas y árboles. */
  const ST_ = '#59615d', FI_ = 0.262; let npP = 0;
  const huacalP = (w, h, d, x, y, z, tipo) => { caja('mad', w, h, d, x, y + h / 2, z, '#c4a070', 0.8); caja('mad', w + 0.03, 0.025, d + 0.03, x, y + h - 0.012, z, '#b08b5c', 0.8); if (tipo) monton(tipo, w * 0.47, h * 0.62, d * 0.47, x, y + h - 0.02, z); };
  const puestoP = (u, vc, sg, toldo, ic, lista) => { // sg = lado donde queda el cliente (-sg si no hay toldo); lista = productos del puesto
    const hy = 0.07 + 0.86, w = toldo ? 2.9 : 2.5, d = 0.95, front = toldo ? 1 : -1, fz = sg * front, L = lista.length; npP++;
    caja('mad', w, 0.05, d, u, hy, vc, '#d7b383', 1);
    for (const dx of [-1, 1]) caja('mad', 0.05, hy, d - 0.12, u + dx * (w / 2 - 0.1), hy / 2, vc, '#a98456', 1);
    caja('mad', w - 0.2, 0.04, d - 0.12, u, 0.3, vc, '#a98456', 1);
    caja('lona', w, 0.46, 0.015, u, hy - 0.28, vc + fz * (d / 2 + 0.005), LONAS[(ic + 3) % LONAS.length], 0.44);
    for (let c = 0; c < 3; c++) huacalP(0.66, 0.22, 0.4, u - w / 3 + c * w / 3, hy + 0.025, vc + fz * 0.18, lista[(ic + c * 2) % L]);
    caja('mad', w - 0.1, 0.04, 0.4, u, hy + 0.3, vc - fz * 0.27, '#a98456', 1);
    for (const dx of [-1, 1]) caja('mad', 0.05, 0.3, 0.05, u + dx * (w / 2 - 0.15), hy + 0.15, vc - fz * 0.4, '#a98456', 1);
    for (let c = 0; c < 3; c++) huacalP(0.5, 0.18, 0.32, u - w / 3 + c * w / 3, hy + 0.32, vc - fz * 0.27, lista[(ic + c * 3 + 1) % L]);
    if (ic % 3 === 0) for (const dx of [-0.9, 0.9]) { cil('mad', 0.26, 0.2, 0.3, 10, u + dx * w / 2 * 0.62, 0.07 + 0.15, vc + fz * (d / 2 + 0.38), '#b6894a', 0.5); monton(lista[(ic + (dx > 0 ? 1 : 4)) % L], 0.25, 0.14, 0.25, u + dx * w / 2 * 0.62, 0.07 + 0.29, vc + fz * (d / 2 + 0.38)); }
    if (toldo) {
      const lc = LONAS[ic % LONAS.length], vb = vc - sg * 1.25, vf = vc + sg * 1.45, yb = 2.7, yf = 2.15, Lt = Math.hypot(vf - vb, yb - yf), ang = Math.atan2(yb - yf, Math.abs(vf - vb));
      for (const dx of [-1, 1]) { cil('met', 0.025, 0.025, yb, 6, u + dx * 1.5, 0.07 + yb / 2, vb, '#5b6460', 0.5); cil('met', 0.025, 0.025, yf, 6, u + dx * 1.5, 0.07 + yf / 2, vf, '#5b6460', 0.5); }
      caja('lona', 3.2, 0.02, Lt, u, 0.07 + (yb + yf) / 2 + 0.01, (vb + vf) / 2, lc, 0.44, sg * ang, 0, 0);
      caja('lona', 3.2, 0.24, 0.015, u, 0.07 + yf - 0.11, vf, lc, 0.44); }
  };
  const sombrillaP = (u, v, ic, lista) => { npP++;
    cil('met', 0.02, 0.025, 2.4, 6, u, 0.07 + 1.2, v, '#6a716d', 0.5); poner('lona', new THREE.ConeGeometry(1.5, 0.42, 10, 1, true), LONAS[ic % LONAS.length], u, 0.07 + 2.5, v, 0, 0.3, 0, 0.44);
    mesa(u, v, 1.6, 0.8, 0.07 + 0.82); for (let c = 0; c < 3; c++) huacalP(0.5, 0.2, 0.34, u - 0.52 + c * 0.52, 0.07 + 0.845, v, lista[(ic + c) % lista.length]); };
  const nave = (vh, us) => { // nave de pórticos de acero con cubierta de zinc a dos aguas (10 m de ancho)
    const L = us[us.length - 1] - us[0], uc = (us[0] + us[us.length - 1]) / 2;
    for (const fu of us) {
      for (const sg of [-1, 1]) { caja('met', 0.16, 3.1, 0.16, fu, 0.07 + 1.55, vh + sg * 5, ST_, 0.5); caja('met', 0.1, 0.22, 0.6, fu, 0.07 + 3.0, vh + sg * 5, ST_, 0.5);
        caja('met', 0.08, 0.13, Math.hypot(5.6, 1.5), fu, 0.07 + 3.0 + 0.75 - 0.08, vh + sg * 2.8, ST_, 0.5, sg * FI_, 0, 0); caja('met', 0.04, 0.04, 3.1, fu, 0.07 + 3.0 + 0.25, vh + sg * 1.25, ST_, 0.5, sg * 0.38, 0, 0); }
      caja('met', 0.07, 0.12, 10.2, fu, 0.07 + 3.0 - 0.02, vh, ST_, 0.5); caja('met', 0.06, 1.3, 0.06, fu, 0.07 + 3.0 + 0.62, vh, ST_, 0.5); }
    for (const v of [-5.4, -2.8, 0, 2.8, 5.4]) caja('met', L + 0.4, 0.06, 0.08, uc, 0.07 + 4.5 - Math.abs(v) * 0.268 + 0.02, vh + v, ST_, 0.5);
    for (const sg of [-1, 1]) { caja('teja', L + 0.4, 0.045, Math.hypot(5.6, 1.5), uc, 0.07 + 3.75 + 0.14, vh + sg * 2.8, '#cfd3cf', 0.5, sg * FI_, 0, 0); caja('met', L + 0.6, 0.12, 0.14, uc, 0.07 + 2.95, vh + sg * 5.65, '#6a716d', 0.5);
      for (const du of [us[0] - 0.3, us[us.length - 1] + 0.3]) cil('met', 0.045, 0.045, 3.0, 8, du, 0.07 + 1.5, vh + sg * 5.75, '#6a716d', 0.5); }
    caja('met', L + 0.6, 0.05, 0.46, uc, 0.07 + 4.64, vh, '#7a8280', 0.5);
    caja('conc', L + 1.5, 0.03, 11.4, uc, 0.07 + 0.015, vh, '#d4d0c6', 1.6); // losa de concreto bajo la nave
  };
  const rueda = (u, v, r = 0.36) => { cil('plas', r, r, 0.24, 14, u, 0.07 + r, v, '#1b1c1e', 0.5, Math.PI / 2, 0, 0); cil('met', r * 0.55, r * 0.55, 0.26, 10, u, 0.07 + r, v, '#a9adaa', 0.5, Math.PI / 2, 0, 0); };
  const ruedasDe = (us, v, r) => { for (const uu of us) for (const sg of [-1, 1]) rueda(uu, v + sg * 0.98, r); };
  const cabina = (ur, v, cu, col, alto = 1.62) => { // cabina de vehículo comercial; ur = extremo posterior (+u), el frente mira a -u
    const uf = ur - cu; caja('plas', cu, alto, 2.0, uf + cu / 2, 0.07 + 0.55 + alto / 2, v, col, 0.5); caja('plas', 0.9, 0.78, 1.94, uf - 0.45, 0.07 + 0.55 + 0.39, v, col, 0.5);
    caja('vidrio', 0.03, alto * 0.42, 1.78, uf + 0.14 - 0.008, 0.07 + 0.55 + alto * 0.68, v, '#202c36', 1, 0, 0, -0.3); caja('vidrio', cu * 0.55, alto * 0.36, 2.03, uf + cu * 0.58, 0.07 + 0.55 + alto * 0.68, v, '#232f39', 1);
    caja('plas', 0.14, 0.34, 2.05, uf - 0.95, 0.07 + 0.44, v, '#292b2d', 0.5); for (const sg of [-1, 1]) caja('plas', 0.05, 0.16, 0.3, uf - 0.9, 0.07 + 0.75, v + sg * 0.75, '#f3eed8', 0.5); };
  const furgon = (ur, v) => { // furgón blanco de techo alto
    caja('plas', 3.7, 2.1, 2.1, ur - 1.85, 0.07 + 0.62 + 1.05, v, '#f1f0ec', 0.5); caja('plas', 5.6, 0.45, 1.9, ur - 2.5, 0.07 + 0.45, v, '#33373a', 0.5);
    caja('plas', 0.02, 1.3, 1.9, ur + 0.004, 0.07 + 1.4, v, '#e3e2dd', 0.5); caja('met', 0.04, 0.05, 1.9, ur + 0.02, 0.07 + 0.95, v, '#8d9290', 0.5); // puerta trasera
    caja('plas', 3.5, 0.16, 0.03, ur - 1.85, 0.07 + 1.35, v + 1.06, '#3d7a3c', 0.5); caja('plas', 3.5, 0.16, 0.03, ur - 1.85, 0.07 + 1.35, v - 1.06, '#3d7a3c', 0.5); // franja verde
    cabina(ur - 3.7, v, 1.95, '#f1f0ec'); ruedasDe([ur - 0.85, ur - 4.2], v, 0.36);
    for (const sg of [-1, 1]) caja('plas', 0.03, 0.34, 0.1, ur + 0.01, 0.07 + 0.75, v + sg * 0.9, '#b01f1f', 0.5); };
  const camion = (ur, v) => { // camión de estacas azul cargado de huacales y costales
    caja('plas', 4.4, 0.16, 2.3, ur - 2.2, 0.07 + 0.92, v, '#4a3c2c', 0.5); caja('plas', 6.4, 0.4, 1.9, ur - 2.8, 0.07 + 0.55, v, '#2b2e30', 0.5);
    for (const sg of [-1, 1]) { caja('mad', 4.4, 0.55, 0.05, ur - 2.2, 0.07 + 1.27, v + sg * 1.14, '#8b6a44', 1); for (let k = 0; k <= 4; k++) caja('met', 0.07, 1.0, 0.07, ur - 4.2 + k * 1.0, 0.07 + 1.35, v + sg * 1.16, '#3d4240', 0.5); }
    caja('mad', 0.05, 0.55, 2.3, ur - 4.43, 0.07 + 1.27, v, '#8b6a44', 1); caja('mad', 0.05, 0.4, 2.3, ur - 0.01, 0.07 + 1.2, v, '#8b6a44', 1);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) if (!(i === 3 && k === 1)) huacalP(0.62, 0.3, 0.42, ur - 3.8 + i * 0.95, 0.07 + 1.0 + k * 0.3, v - 0.7 + j * 0.7, TIPOS_FRUTA[(i + j + k * 2) % TIPOS_FRUTA.length]);
    for (let i = 0; i < 4; i++) caja('plas', 0.55, 0.28, 0.9, ur - 0.8 - (i % 2) * 0.1, 0.07 + 1.13 + (i >> 1) * 0.28, v - 0.5 + (i % 2) * 0.9, i % 2 ? '#b99b6a' : '#c8aa78', 0.5, 0, i * 0.4, 0); // costales
    cabina(ur - 4.5, v, 1.7, '#2f5f8a', 1.7); ruedasDe([ur - 0.9, ur - 4.1], v, 0.42); caja('plas', 0.03, 0.2, 1.9, ur + 0.02, 0.07 + 0.8, v, '#b8b8b2', 0.5); };
  const camioneta = (ur, v) => { // camioneta de platón con frutas
    caja('plas', 2.6, 0.14, 1.9, ur - 1.3, 0.07 + 0.78, v, '#4a3c2c', 0.5); caja('plas', 4.6, 0.38, 1.8, ur - 2.2, 0.07 + 0.5, v, '#2b2e30', 0.5);
    for (const sg of [-1, 1]) caja('plas', 2.6, 0.46, 0.05, ur - 1.3, 0.07 + 1.04, v + sg * 0.95, '#b9a46a', 0.5); caja('plas', 0.05, 0.46, 1.9, ur - 2.6, 0.07 + 1.04, v, '#b9a46a', 0.5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) huacalP(0.6, 0.3, 0.42, ur - 2.15 + i * 0.7, 0.07 + 0.85, v - 0.62 + j * 0.62, ['platano', 'naranja', 'mango', 'papaya'][(i + j) % 4]);
    cabina(ur - 2.7, v, 1.9, '#9b2d20', 1.45); ruedasDe([ur - 0.55, ur - 3.2], v, 0.38); };
  const carretilla = (u, v, ang, tipo) => { // carretilla de mano con huacales
    const c = Math.cos(ang), s = Math.sin(ang), W = (a, b) => [u + a * c - b * s, v + a * s + b * c];
    let p = W(0, 0); caja('met', 1.5, 0.05, 0.8, p[0], 0.07 + 0.42, p[1], '#59615d', 0.5, 0, -ang, 0); p = W(-0.15, 0); caja('met', 0.9, 0.04, 0.8, p[0], 0.07 + 0.2, p[1], '#59615d', 0.5, 0, -ang, 0);
    for (const sg of [-1, 1]) { p = W(0.05, sg * 0.42); cil('plas', 0.23, 0.23, 0.07, 12, p[0], 0.07 + 0.23, p[1], '#1b1c1e', 0.5, Math.PI / 2, -ang, 0); p = W(-0.95, sg * 0.34); caja('met', 1.1, 0.03, 0.03, p[0], 0.07 + 0.72, p[1], '#59615d', 0.5, 0, -ang, -0.25); }
    for (let i = 0; i < 2; i++) { p = W(-0.3 + i * 0.62, 0); huacalP(0.58, 0.3, 0.72, p[0], 0.07 + 0.45, p[1], tipo); } };
  const farola = (u, v) => { cil('met', 0.07, 0.1, 5.8, 8, u, 0.07 + 2.9, v, '#4a514e', 0.5); caja('met', 1.1, 0.06, 0.1, u + 0.45, 0.07 + 5.75, v, '#4a514e', 0.5); caja('plas', 0.6, 0.12, 0.28, u + 0.95, 0.07 + 5.7, v, '#e8e4cf', 0.5); };
  const arbolP = (u, v, h, r, ic) => { // árbol de parque: tronco y copa de lóbulos irregulares en varios verdes
    cil('mad', 0.13, 0.2, h, 7, u, 0.07 + h / 2, v, '#5a4330', 1); cil('plas', 0.9, 1.0, 0.12, 12, u, 0.07 + 0.06, v, '#7d7466', 0.5);
    const VERDES = ['#456f30', '#587f37', '#37602a', '#668d3f', '#4e7733', '#7a9a48'];
    for (let k = 0; k < 8; k++) { const a = k * 2.4 + ic, rr = k ? r * (0.5 + 0.25 * ((k * 7) % 3) / 2) : 0, rad = r * (k ? 0.5 : 0.72) * (0.85 + rnd() * 0.3), alt = k ? 0.25 * r + (k % 3) * 0.45 * r * 0.6 : 0.5 * r;
      const g = new THREE.SphereGeometry(1, 10, 7), P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + 0.16 * Math.sin(x * 5.1 + ic + k) * Math.cos(z * 4.7 + k) + 0.09 * Math.sin(y * 6.3 + k * 2) + 0.05 * Math.sin((x + z) * 11); P.setXYZ(i, x * n, y * n * 0.78, z * n); }
      g.computeVertexNormals(); g.scale(rad, rad, rad); poner('hoja', g, VERDES[(ic + k * 5) % VERDES.length], u + Math.cos(a) * rr, 0.07 + h + alt - 0.1 * r, v + Math.sin(a) * rr, 0, 0, 0, 0); } };
  const pilaCajas = (u, v, ry = 0) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) caja('mad', 0.6, 0.22, 0.4, u + j * 0.64, 0.07 + 0.11 + i * 0.22, v, '#c4a070', 0.8, 0, ry, 0);
    for (let i = 0; i < 4; i++) caja('plas', 0.55, 0.2 + (i % 2) * 0.04, 0.38, u + 0.5 * (i % 2), 0.07 + 0.11 + (i >> 1) * 0.2, v + 0.55 + (i % 2) * 0.1, i % 2 ? '#b99b6a' : '#c8aa78', 0.5, 0, i * 0.3, 0); };
  const plazoleta = (S) => {
    const PHU = 51, PHV = 22, UC = -15; npP = 0; MS = [8, 3]; sem = 31 + (S.id | 0) * 7; // huella 102 x 44 m: u de -66 a 36, centrada en S.x,S.z (el origen local va 15 m al este del centro)
    M0.compose(new THREE.Vector3(S.x - UC * Math.cos(S.a) * S.s, S.y, S.z - UC * Math.sin(S.a) * S.s), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -S.a, 0)), new THREE.Vector3(S.s, S.s, S.s));
    caja('ado', 2 * PHU, 0.4, 2 * PHV, UC, 0.07 - 0.2, 0, '#e2ddd3', 1.6);
    for (const [w, d, x, z] of [[2 * PHU + 0.3, 0.16, UC, -PHV], [2 * PHU + 0.3, 0.16, UC, PHV], [0.16, 2 * PHV, UC - PHU, 0], [0.16, 2 * PHV, UC + PHU, 0]]) caja('plas', w, 0.2, d, x, 0.07 + 0.04, z, '#b9b5ab', 0.5);
    const US = []; for (let u = -50; u <= 10; u += 5) US.push(u); nave(-10.5, US); nave(10.5, US); // dos naves de 60 m
    let ic = 0;
    for (let k = 0; k < 20; k++) { const u = -48.5 + k * 3;
      puestoP(u, -10.5 - 3.7, -1, false, ic++, TIPOS_FRUTA); puestoP(u, -10.5 + 3.7, 1, false, ic++, TIPOS_FRUTA); // nave de frutas
      puestoP(u, 10.5 - 3.7, -1, false, ic++, ic % 3 ? TIPOS_VERDURA : TIPOS_FRUTA); puestoP(u, 10.5 + 3.7, 1, false, ic++, TIPOS_VERDURA); } // nave de verduras y hortalizas
    for (let k = 0; k < 12; k++) { const u = -45 + k * 4.5; puestoP(u, -2.6, 1, true, ic++, TIPOS_FRUTA); puestoP(u, 2.6, -1, true, ic++, k % 2 ? TIPOS_VERDURA : TIPOS_FRUTA); } // calle central, con toldos de lona
    [[-56, -5], [-56, 5], [-56, -13], [-56, 13], [-61, -9], [-61, 9], [-61, -16], [-61, 16]].forEach(([u, v], i) => sombrillaP(u, v, ic++ + i, TIPOS_FRUTA));
    carretilla(-24, 0.8, 0.15, 'naranja'); carretilla(-44, -0.8, 0.1, 'tomate'); carretilla(13, -4, -0.4, 'platano'); carretilla(12.6, 5.2, 0.3, 'papaya');
    // portal de entrada con el aviso a dos caras
    for (const dv of [-4.6, 4.6]) { caja('met', 0.16, 5.0, 0.16, -64, 0.07 + 2.5, dv, ST_, 0.5); }
    caja('mad', 0.09, 1.65, 9.6, -64, 0.07 + 4.35, 0, '#6a4a30', 1);
    for (const sg of [-1, 1]) poner('cartelP', new THREE.PlaneGeometry(8.4, 1.575), '#ffffff', sg * 0.053 - 64, 0.07 + 4.35, 0, 0, sg * Math.PI / 2, 0, 0);
    // zona de carga y descarga: losa con bahías pintadas, andén de 1 m con bordillos de caucho y marquesina
    caja('conc', 17, 0.03, 31, 22.5, 0.07 + 0.015, 0, '#cfcbc1', 1.6);
    for (const v of [-15, -5, 5, 15]) caja('plas', 13, 0.012, 0.12, 21.5, 0.07 + 0.033, v, '#e3bd22', 0.5); for (const [u, v] of [[15, -10], [15, 0], [15, 10]]) caja('plas', 0.12, 0.012, 9.8, u, 0.07 + 0.033, v, '#e3bd22', 0.5);
    caja('conc', 5, 1.05, 31, 33.5, 0.07 + 0.525, 0, '#bdb9ae', 1.6); caja('plas', 0.14, 0.02, 31, 31.07, 0.07 + 1.07, 0, '#e3bd22', 0.5);
    for (const v of [-12, -6, 0, 6, 12]) caja('plas', 0.22, 0.34, 0.55, 30.9, 0.07 + 0.62, v, '#222426', 0.5);
    for (const dv of [-14.8, -4.8, 4.8, 14.8]) cil('met', 0.07, 0.07, 3.95, 8, 35.6, 0.07 + 1.05 + 1.97, dv, ST_, 0.5);
    caja('met', 5.4, 0.1, 31.4, 33.4, 0.07 + 1.05 + 4.0, 0, '#7a8280', 0.5, 0, 0, 0.04); caja('met', 5.4, 0.06, 0.1, 33.4, 0.07 + 1.05 + 3.93, 15.8, ST_, 0.5);
    furgon(29.5, -10); camion(29.7, 0); camioneta(29.4, 10);
    for (const [u, v] of [[34.5, -9], [34.5, 9]]) pilaCajas(u, v, 0.1); // huacales vacíos y costales sobre el andén
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) huacalP(0.62, 0.3, 0.42, 33.2 + j * 0.66, 0.07 + 1.05 + 0.15 + (i % 2) * 0.3, -3.2 + i * 0.7 - (i % 2) * 0.0, TIPOS_FRUTA[(i + j) % TIPOS_FRUTA.length]);
    // dos módulos de bodega con cuarto frío (uno a cada lado de la losa de carga): cada uno con 2 bahías (una con andén sobre la losa y otra sobre el andén de carga) = 4 bahías; reciben a cualquier hora
    for (const n of [-1, 1]) bodega({ vf: -n * 15.8, n, D: 5.5, pw: 0.7, c0: 20.4, c1: 27.2, h0: 27.2, h1: 35.6, fill: [31, 35.6], bays: [{ ub: 29.4, bw: 3.0, ap: 1.0, apw: 3.3 }, { ub: 33.5, bw: 3.0, plat: true }] });
    // perímetro: bancas, residuos, farolas y árboles
    for (const sg of [-1, 1]) { for (const u of [-58, -44, -28, -14, 0, 14]) banca(u, sg * 18.4, sg); for (const u of [-62, -48, -33, -16, 2]) arbolP(u, sg * 20, 3.2 + rnd() * 0.8, 2.0 + rnd() * 0.5, (ic++ + (sg > 0 ? 3 : 0)));
      farola(-63, sg * 19); farola(-33, sg * 19); farola(18, sg * 19); }
    canecas(-30.4, -17); canecas(-30.4, 17); canecas(-60.4, -17.5); canecas(-60.4, 17.5); canecas(14.8, -17.2); canecas(14.8, 17.2);
    S.puestos = npP; MS = [12, 5];
  };

  /* ---------- 5. armado: una malla por material con los sitios abiertos (cada sitio se construye una vez y queda en caché) ---------- */
  const MESH = {};
  const grupoMallas = new THREE.Group(); grupoMallas.name = 'mercados-mallas'; grupo.add(grupoMallas);
  const limpiar = () => { for (const k in MESH) { grupoMallas.remove(MESH[k]); MESH[k].geometry.dispose(); delete MESH[k]; } };
  let stats = { llamadas: 0, triangulos: 0, abiertos: 0 };
  const soltar = (S) => { const i = SIT.indexOf(S); if (i >= 0 && i < enAcu) acuCortar(i); if (S.geo) for (const k in S.geo) S.geo[k].dispose(); S.geo = null; };
  const construir = (S) => { // la geometría del sitio, ya en coordenadas del mundo y agrupada por material
    ACC = {}; if (S.y == null) S.y = (T3.sueloY != null ? T3.sueloY : 0.35) + 0.02;
    if (S.tipo === 'plaza') plazoleta(S); else mercado(S);
    S.geo = {}; for (const k in ACC) { const g = mergeGeometries(ACC[k]); for (const x of ACC[k]) x.dispose(); if (g) S.geo[k] = g; } ACC = {}; };
  /* rendimiento (52 semanas por segundo): los abiertos son siempre los PRIMEROS de la lista (abren en orden y, si la red se encoge, cierran
     los últimos), así que cada sitio se copia una sola vez, en orden, al final de una malla por material que solo crece, y abrir o cerrar
     mercados solo cambia cuántos vértices se dibujan (drawRange): las mismas mallas, en el mismo orden y con los mismos vértices que fundir los
     abiertos cada vez, sin rehacer ni volver a subir la geometría. Si alguna vez los abiertos no son los primeros, se funde como antes. */
  const ACU = {}; let enAcu = 0; // ACU[k] = { n vértices usados, cap, at {nombre: BufferAttribute}, fin[i] = vértices al terminar el sitio i, geo, mesh, caja }
  const _caja = new THREE.Box3();
  const acuCortar = (i) => { for (const k in ACU) { const A = ACU[k]; A.n = i ? A.fin[i - 1] : 0; A.fin.length = i; } enAcu = Math.min(enAcu, i); };
  const acuGeo = (A) => { const g = new THREE.BufferGeometry(); for (const nom in A.at) g.setAttribute(nom, A.at[nom]); g.boundingBox = A.caja.clone(); g.boundingSphere = A.caja.getBoundingSphere(new THREE.Sphere());
    if (A.geo) A.geo.dispose(); A.geo = g; if (A.mesh) A.mesh.geometry = g; };
  const acuAgregar = (S) => { // copia el sitio S (ya construido) al final de las mallas acumuladas; false si sus atributos no encajan
    for (const k in S.geo) { const g = S.geo[k], A = ACU[k]; if (g.index) return false; for (const nom in g.attributes) { const v = g.attributes[nom]; if (!(v.array instanceof Float32Array) || v.normalized || v.isInterleavedBufferAttribute) return false; } if (A) { const nn = Object.keys(g.attributes); if (nn.length !== Object.keys(A.at).length || nn.some(nom => !A.at[nom] || A.at[nom].itemSize !== g.attributes[nom].itemSize)) return false; } }
    const i = enAcu;
    for (const k in S.geo) { const g = S.geo[k], m = g.attributes.position.count; let A = ACU[k];
      if (!A) { A = ACU[k] = { n: 0, cap: 0, at: {}, fin: new Array(i).fill(0), geo: null, mesh: null, caja: new THREE.Box3() }; for (const nom in g.attributes) A.at[nom] = new THREE.BufferAttribute(new Float32Array(0), g.attributes[nom].itemSize); }
      if (A.n + m > A.cap) { const cap = Math.max(A.n + m, Math.ceil(A.cap * 1.6)); for (const nom in A.at) { const v = A.at[nom], a = new Float32Array(cap * v.itemSize); a.set(v.array.subarray(0, A.n * v.itemSize)); A.at[nom] = new THREE.BufferAttribute(a, v.itemSize); } A.cap = cap; A.nueva = true; }
      for (const nom in A.at) { const v = A.at[nom]; v.array.set(g.attributes[nom].array, A.n * v.itemSize); if (!A.nueva) { if (v.addUpdateRange) v.addUpdateRange(A.n * v.itemSize, m * v.itemSize); v.needsUpdate = true; } }
      if (!g.boundingBox) g.computeBoundingBox(); A.caja.union(_caja.copy(g.boundingBox)); A.n += m;
      if (A.nueva || !A.geo) { A.nueva = false; acuGeo(A); } else { A.geo.boundingBox.copy(A.caja); A.caja.getBoundingSphere(A.geo.boundingSphere); } }
    for (const k in ACU) ACU[k].fin[i] = ACU[k].n; enAcu = i + 1; return true; };
  const acuVer = (p) => { // dibuja los p primeros sitios
    limpiar(); stats = { llamadas: 0, triangulos: 0, abiertos: p };
    for (const k of Object.keys(ACU)) { const A = ACU[k], c = p ? A.fin[p - 1] : 0;
      if (!A.mesh) { const m = new THREE.Mesh(A.geo, MATS[k]); m.castShadow = !!SOMBRA[k][0]; m.receiveShadow = !!SOMBRA[k][1]; m.name = 'mercados-' + k; A.mesh = m; grupoMallas.add(m); }
      A.geo.setDrawRange(0, c); A.mesh.visible = c > 0; if (c > 0) { stats.llamadas++; stats.triangulos += c / 3; } } };
  const armar = () => {
    let p = 0; while (p < SIT.length && SIT[p].abierto) p++;
    let prefijo = true; for (let i = p; i < SIT.length; i++) if (SIT[i].abierto) { prefijo = false; break; }
    if (prefijo) { let ok = true; for (let i = enAcu; i < p && ok; i++) { const S = SIT[i]; if (!S.geo) construir(S); ok = acuAgregar(S); } if (ok) { acuVer(p); return; } }
    for (const k in ACU) if (ACU[k].mesh) ACU[k].mesh.visible = false; // respaldo: fundir los abiertos (como antes)
    limpiar(); const por = {}; let ab = 0;
    for (const S of SIT) { if (!S.abierto) continue; ab++; if (!S.geo) construir(S); for (const k in S.geo) (por[k] = por[k] || []).push(S.geo[k]); }
    stats = { llamadas: 0, triangulos: 0, abiertos: ab };
    for (const k in por) { const g = por[k].length === 1 ? por[k][0].clone() : mergeGeometries(por[k]); if (!g) continue; const m = new THREE.Mesh(g, MATS[k]); m.castShadow = !!SOMBRA[k][0]; m.receiveShadow = !!SOMBRA[k][1]; m.name = 'mercados-' + k; MESH[k] = m; grupoMallas.add(m); stats.llamadas++; stats.triangulos += g.attributes.position.count / 3; } };
  armar();

  /* ---------- 6. apoyar cada mercado en el suelo real de la foto aérea (como las huertas de barrio) ---------- */
  const rc = new THREE.Raycaster(), ab = new THREE.Vector3(0, -1, 0), P0 = new THREE.Vector3(); rc.firstHitOnly = true; let ultDy = null;
  const apoyar = () => {
    const tl = T3.tiles; if (!tl || !tl.group || !grupo.visible) return; const st = tl.stats; if (st && st.downloading + st.parsing > 6) return;
    if (T3.tilesDy !== ultDy) { for (const S of SIT) S.ok = false; ultDy = T3.tilesDy; }
    const t = T3.orbit ? T3.orbit.target : T3.camera.position; let cambio = false;
    for (const S of SIT) { if (S.ok || !S.parque || !S.abierto) continue; if (Math.hypot(S.x - t.x, S.z - t.z) > 650) continue;
      const base = (T3.sueloY != null ? T3.sueloY : 0.35) + 0.02, ys = [], c = Math.cos(S.a), n = Math.sin(S.a);
      for (const [u, v] of [[-0.9, -0.9], [0, -0.9], [0.9, -0.9], [-0.9, 0], [0, 0], [0.9, 0], [-0.9, 0.9], [0, 0.9], [0.9, 0.9]]) { const px = S.x + (u * S.hu * c - v * S.hv * n) * S.s, pz = S.z + (u * S.hu * n + v * S.hv * c) * S.s;
        rc.set(P0.set(px, base + 150, pz), ab); const h = rc.intersectObject(tl.group, true)[0]; if (h && Math.abs(h.point.y - base) < 30) ys.push(h.point.y); }
      if (ys.length < 4) continue; ys.sort((a, b) => a - b); const y = ys[Math.floor(ys.length * 0.5)] - 0.02; S.ok = true; if (S.y == null || Math.abs(S.y - y) > 0.12) { S.y = y; soltar(S); cambio = true; } }
    if (cambio) armar(); };
  const timer = setInterval(apoyar, 1600);

  // mostrar(ids): ids = lista (o Set) de los id abiertos; null = todos. Solo se vuelve a armar la malla si cambia el conjunto.
  const mostrar = (ids) => { const set = ids == null ? null : new Set(ids); let cambio = false;
    for (const S of SIT) { const v = set ? set.has(S.id) : true; if (S.abierto !== v) { S.abierto = v; cambio = true; if (!v) S.ok = false; } }
    if (cambio) { armar(); if (grupo.visible) apoyar(); } return cambio; };

  return {
    grupo, stats: () => stats, mostrar,
    /* RENDIMIENTO (2026-11-26): arma la geometría de cada sitio escondida, uno por rato libre, después de «Iniciar»; al prender la propuesta
       armar() ya solo copia (antes construir() de todos los sitios trababa ~1,4 s el clic de «Kennedy con propuesta») */
    precalentar() { return new Promise(res => { let i = 0; const ocio = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 120 }) : (f) => setTimeout(f, 30);
      const uno = (dl) => { while (i < SIT.length) { const S = SIT[i++]; if (!S.geo) { construir(S); if (!dl || dl.timeRemaining() < 8) break; } } if (i < SIT.length) { ocio(uno); return; }
        /* y se copian en orden a las mallas acumuladas (sin dibujar nada: drawRange 0), así existen sus mallas y materiales para precompilar */
        if (!SIT.some(S => S.abierto)) { for (let k = enAcu; k < SIT.length; k++) if (!acuAgregar(SIT[k])) break; acuVer(0); }
        res(); }; ocio(uno); }); },
    lista: SIT.map(S => ({ get id() { return S.id; }, get n() { return S.n; }, get tipo() { return S.tipo; }, get x() { return S.x; }, get z() { return S.z; }, get a() { return S.a; }, s: S.s, parque: S.parque, get y() { return S.y; }, get abierto() { return S.abierto; }, get puestos() { return S.puestos || 40; } })),
    ver(on) { grupo.visible = !!on; if (on) apoyar(); },
    quitar() { clearInterval(timer); limpiar(); for (const S of SIT) soltar(S); T3.scene.remove(grupo); }
  };
}
