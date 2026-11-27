/* ============ RED DE MERCADOS: mercados de barrio y plazoletas de mercado en parques grandes (solo con la propuesta) ============
   TIPOS
   · Mercado de barrio: cubierta de zinc, 40 puestos (dos hileras bajo cubierta + toldos), bodega con cuarto frío y 2 bahías, en parques vecinales (los 8 de data3d/carga.json + 4 más hacia Bavaria; data3d/mercados_barrio.js).
   · Plazoleta de mercado: en los parques grandes de Kennedy (OpenStreetMap/IDRD, data3d/parques.json); piso duro, dos naves de 60 m, calle de toldos, ~112 puestos, 2 bodegas con cuarto frío y 4 bahías
     de frutas y verduras, zona de carga y descarga con furgonetas, bancas y árboles (también en data3d/mercados_barrio.js, que dibuja ambos tipos).
   UBICACIÓN: calculada fuera de línea con el mismo método de los mercados de barrio (claro sin copas del censo de árboles, canchas, edificios, agua ni huertas;
     lado largo paralelo al borde del parque); los parques son los de mayor área real dentro del límite de Kennedy que no tenían ya un mercado.
   APERTURA EN EL TIEMPO [SUP]: orden = distancia al centro de acopio (Bavaria Común) × 1,35 si es plazoleta (cuesta más montarla, por eso a igual distancia
     abre primero el de barrio); así la red crece hacia afuera igual que las huertas. El i-ésimo de M abre en t = 0,5 + 9,5·((i+0,5)/M)^0,9 años (todos antes del
     año 10, como las huertas: la curva es algo más rápida al principio). Solo cuenta si el escenario es «proyecto» y si la fracción de la propuesta
     (T3.bio.ESTADO.proFrac) ya llegó a la cuota del mercado: si la red colapsa (proFrac baja) los últimos en abrir se cierran primero.
   RED: cintas sobre el terreno (con flujo animado de la fuente al mercado) que unen cada mercado abierto con Bavaria Común y con sus 2 huertas abiertas más cercanas;
     al abrir, pulso de luz (data3d/resaltes.js), un faro de luz y la etiqueta «Mercado abierto · nombre · año N».
   API (para el modelo de viajes): export MERCADOS (todos), mercadosAbiertos() y window.KEN_MERCADOS = { abiertos, todos }.
   Dibujo: 10 mallas de los mercados (una por material) + 1 de la red + 2 instanciadas de marcas = ~13 llamadas, nada por cuadro más que un uniforme. */
import { RELOJ } from './reloj.js?v=5';

const LC = { x: 5341.33, y: 3161.9 }; // mismo marco que lw() de index.html: mundo = [x - LC.x, LC.y - y]
const BAVC = [4136, 96];              // Bavaria Común en el mundo (centro de acopio)
const lwc = (x, y) => [x - LC.x, LC.y - y];
/* sitios (coordenadas del modelo [mx, my], ángulo del lado largo, escala, parque): los 8 de barrio ya existentes + 4 de barrio nuevos + 9 plazoletas */
const BASE = [
  ['barrio', 'Biblioteca El Tintal', 6946.4, 3559.6, 2.4229, 0.7, 'Biblioteca El Tintal (parque metropolitano)'],
  ['barrio', 'Castilla', 8567.8, 3160.0, 0.4721, 0.5, 'Castilla (parque zonal)'],
  ['barrio', 'Ciudad Urbisa I', 8376.2, 3846.9, 1.1016, 1.0, 'Ciudad Urbisa I y II Sector - Castilla Real (2 Sector) (parque vecinal)'],
  ['barrio', 'Rincón de los Ángeles', 7795.6, 2316.6, 1.6821, 0.5, 'Rincon De Los Angeles (parque vecinal)'],
  ['barrio', 'La Magdalena II', 6541.4, 4941.2, -2.2081, 0.5, 'La Magdalena Etapa II (parque vecinal)'],
  ['barrio', 'Patio Bonito II', 6319.0, 3276.0, 0.8197, 0.6, 'Patio Bonito II Sector (parque vecinal)'],
  ['barrio', 'Ciudad Urbisa II', 8260.2, 3712.9, -2.3534, 1.0, 'Ciudad Urbisa I y II Sector - Castilla Real (2 Sector) (parque vecinal)'],
  ['barrio', 'Otero de Francisco', 7266.3, 4006.7, -0.7694, 1.0, 'Otero de Francisco (parque vecinal)'],
  ['barrio', 'La Fayette', 9469.7, 3995.5, -1.576, 0.5, 'La Fayette (parque vecinal)'],
  ['barrio', 'El Recodo y Petaluma', 10477.2, 3016.6, 0.6316, 0.7, 'El Recodo y Petaluma (parque vecinal)'],
  ['barrio', 'El Rincón (parque oriental)', 8019.8, 2483.4, -3.0638, 0.8, 'Urbanización El Rincón de los Ángeles (parque vecinal)'],
  ['barrio', 'Visión de Colombia', 9155.4, 4566.2, 2.3825, 0.4, 'Visión de Colombia (parque vecinal)'],
  ['plazoleta', 'Timiza', 6842.6, -399.1, -3.0307, 1.0, 'Parque metropolitano Timiza'],
  ['plazoleta', 'Mundo Aventura', 8899.6, 1217.8, -1.4634, 0.9, 'Parque metropolitano Mundo Aventura (Las Américas)'],
  ['plazoleta', 'Las Margaritas', 4587.2, 1455.5, -1.4038, 0.35, 'Parque zonal Las Margaritas (Gilma Jiménez)'],
  ['plazoleta', 'Marsella', 9949.8, 2166.4, 1.9518, 1.0, 'Parque Marsella Sector Norte (Pinos de Marsella)'],
  ['plazoleta', 'La Igualdad', 9931.0, 1911.9, 1.6604, 0.3, 'Parque zonal La Igualdad'],
  ['plazoleta', 'Carvajal', 8615.1, 284.6, 0.1637, 0.4, 'Parque vecinal Carvajal'],
  ['plazoleta', 'Floralia', 9234.0, -327.7, -0.2591, 1.0, 'Parque vecinal Floralia I Sector'],
  ['plazoleta', 'El Carmelo - Gran Britalia', 4367.2, 665.9, 0.9689, 0.3, 'Parque vecinal El Carmelo (Favidi) y Gran Britalia'],
  ['plazoleta', 'Bertha Hernández de Ospina', 4528.3, 22.6, -0.7762, 0.5, 'Parque vecinal Bertha Hernández de Ospina'],
  // MERCADOS EN LOTES VACÍOS REALES (14): polígonos OSM landuse=construction|brownfield|meadow dentro de Kennedy (tools/cache/kennedy_osm.json), de 1.100 m² o más y forma compacta; el rectángulo del mercado queda
  // a 7 m o más de toda vía de net.json y a 25 m o más de cualquier intersección, sin tocar edificios, copas del censo, canchas, agua, parques, huertas ni mercados; mínimo 500 m entre mercados; la bodega mira a la calle más cercana.
  ['barrio', 'Lote recuperado 01', 4746.6, 4590.2, -0.2822, 1.0, 'Lote vacío (OSM construction 1567706460)'],
  ['barrio', 'Lote recuperado 02', 8734.5, -1628.9, 0.5696, 1.0, 'Lote vacío (OSM construction 1446413983)'],
  ['barrio', 'Lote recuperado 03', 7190.6, 722.3, 2.9594, 1.0, 'Lote vacío (OSM construction 1318223728)'],
  ['barrio', 'Lote recuperado 04', 5598.2, 1251.4, -2.1087, 1.0, 'Lote vacío (OSM construction 1318206770)'],
  ['barrio', 'Lote recuperado 05', 6292.4, 484.9, -0.1857, 0.8, 'Lote vacío (OSM construction 1318223727)'],
  ['barrio', 'Lote recuperado 06', 6855.3, 2665.8, -0.7751, 1.0, 'Lote vacío (OSM construction 320051680)'],
  ['barrio', 'Lote recuperado 07', 5419.6, 379.4, 0.9468, 1.0, 'Lote vacío (OSM meadow 641331647)'],
  ['barrio', 'Lote recuperado 08', 9425.9, 3280.4, -1.1005, 0.5, 'Lote vacío (OSM brownfield 26696903)'],
  ['barrio', 'Lote recuperado 09', 5844.1, 4815.2, 2.7091, 1.0, 'Lote vacío (OSM construction 1567706450)'],
  ['barrio', 'Lote recuperado 10', 7144.0, 4617.1, -0.6236, 1.0, 'Lote vacío (OSM construction 962454347)'],
  ['barrio', 'Lote recuperado 11', 7023.1, 5261.6, 0.0168, 1.0, 'Lote vacío (OSM construction 1567706455)'],
  ['barrio', 'Lote recuperado 12', 7823.2, 4162.8, 0.8151, 0.8, 'Lote vacío (OSM meadow 411105334)'],
  ['barrio', 'Lote recuperado 13', 5256.0, 4673.8, -0.0276, 1.0, 'Lote vacío (OSM construction 1567706458)'],
  ['barrio', 'Lote recuperado 14', 8448.4, 799.6, -2.4029, 1.0, 'Lote vacío (OSM construction 1145845064)']
];
const CAP = { barrio: 2400, plazoleta: 9600 }; // kg de frutas y verduras por día a escala 1 (40 y ~112 puestos: mercados AMPLIADOS ×2, con bodega más grande; probado ×1/×2/×3/×5: camiones de madrugada a Corabastos −15/−24/−27/−31 %, desde ×2 rinde poco); baja con la escala del sitio
const A_TOTAL = 10;                              // años hasta que la red está completa

export const MERCADOS = (() => {
  const L = BASE.map((b, i) => { const w = lwc(b[2], b[3]); return { tipo: b[0], n: b[1], mx: b[2], my: b[3], a: b[4], s: b[5], parque: b[6], x: w[0], z: w[1], d: Math.hypot(w[0] - BAVC[0], w[1] - BAVC[1]), k: i }; });
  L.forEach(m => { m.score = m.d * (m.tipo === 'plazoleta' ? 1.35 : 1); });
  L.sort((p, q) => p.score - q.score || p.k - q.k);
  const M = L.length;
  return L.map((m, i) => { const cuota = (i + 0.5) / M, t = 0.5 + (A_TOTAL - 0.5) * Math.pow(cuota, 0.9), desde = Math.round(t * 52), puestos = m.tipo === 'plazoleta' ? 112 : 40;
    return { id: 'M' + String(i + 1).padStart(2, '0'), n: m.n, tipo: m.tipo, parque: m.parque, x: Math.round(m.x * 10) / 10, z: Math.round(m.z * 10) / 10, mx: m.mx, my: m.my, a: m.a, s: m.s,
      puestos, cap: Math.round(CAP[m.tipo] * (0.6 + 0.4 * m.s) / 50) * 50, desde, anio: Math.floor(desde / 52) + 1, cuota, distBavaria: Math.round(m.d) }; });
})();

/* ¿cuáles están abiertos ahora? semana del modelo del reloj universal (RELOJ.semana: 0 = semana 1 del año 1), escenario «proyecto» y fracción de la propuesta */
function proFrac() { const T3 = typeof window !== 'undefined' ? window.KEN3D : null; const B = T3 && T3.bio && T3.bio.ESTADO; return B && typeof B.proFrac === 'number' ? B.proFrac : null; }
function enProyecto() { const T3 = typeof window !== 'undefined' ? window.KEN3D : null; return !!T3 && T3.escenario === 'proyecto'; }
function abiertoAhora(m, sem, pf) { return sem >= m.desde && (pf == null || pf >= Math.min(0.95, m.cuota * 0.6)); }
export function mercadosAbiertos() {
  if (!enProyecto()) return [];
  const sem = RELOJ.semana, pf = proFrac();
  return MERCADOS.filter(m => abiertoAhora(m, sem, pf)).map(m => ({ id: m.id, n: m.n, tipo: m.tipo, x: m.x, z: m.z, cap: m.cap, desde: m.desde }));
}
if (typeof window !== 'undefined') window.KEN_MERCADOS = { abiertos: mercadosAbiertos, todos: MERCADOS };

/* ---------- la capa 3D: mercados, red, marcas, etiqueta y leyenda ---------- */
export async function crearRedMercados({ T3, cj }) {
  const THREE = T3.THREE;
  const sitios = MERCADOS.map(m => ({ id: m.id, n: m.n, tipo: m.tipo === 'plazoleta' ? 'plaza' : 'barrio', mx: m.mx, my: m.my, a: m.a, s: m.s, parque: m.parque }));
  const { crearMercados } = await import('./mercados_barrio.js?v=6');
  const dib = await crearMercados({ T3, cj, sitios });
  const grupo = new THREE.Group(); grupo.name = 'red-mercados'; grupo.visible = false; T3.scene.add(grupo);
  const POR = new Map(MERCADOS.map(m => [m.id, m]));
  let HU = [], visible = false, sembrado = false;
  // huertas de parque (mismo orden que usa data3d/huertas_barrio.js: de Bavaria hacia afuera) para unir los mercados con las abiertas
  try { const D = await cj('data3d/huertas_barrio.json?v=3'); HU = D.huertas.filter(h => h.tipo === 'parque').map(h => h.c).sort((a, b) => Math.hypot(a[0] - BAVC[0], a[1] - BAVC[1]) - Math.hypot(b[0] - BAVC[0], b[1] - BAVC[1])); } catch (e) { console.warn('red de mercados · huertas:', e); }
  let fHuertas = null; // fracción de huertas abiertas que fija escenarios_sim.js: se lee del propio llamado a KEN_HBAR.fraccion
  const engancharHuertas = () => { const H = window.KEN_HBAR; if (!H || !H.fraccion || H.fraccion._red) return !!(H && H.fraccion); const f0 = H.fraccion; const f1 = (f) => { fHuertas = f; return f0.call(H, f); }; f1._red = true; H.fraccion = f1; return true; };
  const nHuertas = () => { const f = fHuertas != null ? fHuertas : (proFrac() || 0); return Math.round(Math.max(0, Math.min(1, f)) * HU.length); };

  /* ----- red: cintas con flujo (una sola malla) ----- */
  const U = { uT: { value: 0 } };
  const matRed = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: `attribute vec2 aSide; attribute vec3 aInfo; attribute float aKind; uniform float uT; varying float vU, vS, vD, vP, vK;
      void main(){ vec4 wp = vec4(position, 1.0); float d = distance(cameraPosition, position); float k = clamp(d / 700.0, 1.0, 6.0); wp.xz += aSide * aInfo.y * 1.3 * k * (aKind > 1.5 ? 1.4 : 1.0);
        vU = aInfo.x; vS = aInfo.y; vD = d; vP = (uT - aInfo.z) * 380.0 - aInfo.x; vK = aKind; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform float uT; varying float vU, vS, vD, vP, vK;
      void main(){ if (vP < 0.0) discard; float borde = smoothstep(1.0, 0.45, abs(vS)); float f = fract(vU / 46.0 - uT * 0.4); float dash = smoothstep(0.0, 0.08, f) * smoothstep(0.52, 0.3, f);
        float frente = exp(-vP / 26.0); float cerca = mix(0.06, 1.0, smoothstep(50.0, 1100.0, vD)); float a = borde * (0.2 + 0.5 * dash + 0.7 * frente) * cerca * smoothstep(0.0, 14.0, vP);
        vec3 c = vK < 0.5 ? vec3(1.0, 0.82, 0.45) : (vK < 1.5 ? vec3(0.62, 0.95, 0.52) : vec3(1.0, 0.7, 0.35)); c = mix(c, vec3(1.0), frente * 0.6);
        gl_FragColor = vec4(c, clamp(a, 0.0, 0.95));
        #include <colorspace_fragment>
      }` });
  let malla = null; const nacimiento = new Map(); let uT0 = 0;
  const bez = (a, b, off) => { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [mx - dz / l * off, mz + dx / l * off]; };
  const h01 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
  const armarRed = (ab, nh) => {
    if (malla) { grupo.remove(malla); malla.geometry.dispose(); malla = null; }
    const pos = [], side = [], info = [], kind = [], idx = []; const Y = (T3.sueloY != null ? T3.sueloY : 0.35) + 1.4; let nv = 0, nAr = 0;
    const arista = (clave, A, B, k) => { const dx = B[0] - A[0], dz = B[1] - A[1], L = Math.hypot(dx, dz); if (L < 30) return; const c = bez(A, B, L * 0.06 * (h01(clave) - 0.5) * 2), n = Math.max(4, Math.min(140, Math.ceil(L / 28)));
      if (!nacimiento.has(clave)) nacimiento.set(clave, sembrado ? U.uT.value : -1e4); const t0 = nacimiento.get(clave); nAr++;
      let acum = 0, px = A[0], pz = A[1];
      for (let i = 0; i <= n; i++) { const t = i / n, w = 1 - t, x = w * w * A[0] + 2 * w * t * c[0] + t * t * B[0], z = w * w * A[1] + 2 * w * t * c[1] + t * t * B[1];
        if (i) acum += Math.hypot(x - px, z - pz); px = x; pz = z;
        let tx = 2 * w * (c[0] - A[0]) + 2 * t * (B[0] - c[0]), tz = 2 * w * (c[1] - A[1]) + 2 * t * (B[1] - c[1]); const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        for (const s of [-1, 1]) { pos.push(x, Y, z); side.push(-tz, tx); info.push(acum, s, t0); kind.push(k); }
        if (i) { const a = nv - 2, b0 = nv; idx.push(a, a + 1, b0, a + 1, b0 + 1, b0); } nv += 2; } };
    const aT = ab.length; for (const m of ab) { const P = [m.x, m.z], k = m.tipo === 'plazoleta' ? 2 : 0;
      arista(m.id + '>B', BAVC, P, k);
      const cerca = []; for (let i = 0; i < nh && i < HU.length; i++) cerca.push([Math.hypot(HU[i][0] - P[0], HU[i][1] - P[1]), i]); cerca.sort((p, q) => p[0] - q[0]);
      for (const [, i] of cerca.slice(0, 2)) arista(m.id + '>h' + i, HU[i], P, 1); }
    if (!idx.length) { malla = null; return { aristas: 0 }; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 2)); g.setAttribute('aInfo', new THREE.Float32BufferAttribute(info, 3)); g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1)); g.setIndex(idx);
    malla = new THREE.Mesh(g, matRed); malla.visible = false; /* la usuaria pidió quitar las líneas rectas (no son caminos reales); las rutas reales van por las calles en viajes_mercados.js */ malla.frustumCulled = false; malla.renderOrder = 12; grupo.add(malla); return { aristas: nAr, vertices: nv }; };

  /* ----- marcas: aro en el suelo y faro de luz sobre cada mercado abierto (instanciados; crecen con la distancia para verse desde arriba) ----- */
  const MAXM = MERCADOS.length;
  const aColA = new Float32Array(MAXM * 3), aColB = new Float32Array(MAXM * 3);
  const gR = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), gB = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true).translate(0, 0.5, 0);
  gR.setAttribute('aCol', new THREE.InstancedBufferAttribute(aColA, 3)); gB.setAttribute('aCol', new THREE.InstancedBufferAttribute(aColB, 3));
  const escala = `vec3 ctr = instanceMatrix[3].xyz; float d = distance(cameraPosition, ctr);`;
  const matAro = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aCol; varying vec2 vU; varying vec3 vC; varying float vD; void main(){ vU = uv; vC = aCol; ${escala} float k = clamp(d / 650.0, 1.0, 7.0); vD = d; vec4 w = instanceMatrix * vec4(position, 1.0); w.xyz = ctr + (w.xyz - ctr) * vec3(k, 1.0, k); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; varying vec2 vU; varying vec3 vC; varying float vD; void main(){ float r = length(vU - 0.5) * 2.0; if (r > 1.0) discard; float aro = smoothstep(0.1, 0.0, abs(r - 0.9)); float pulso = 0.78 + 0.22 * sin(uT * 2.0 + r * 5.0);
      float a = (aro * 0.75 + smoothstep(0.9, 0.0, r) * 0.1) * pulso * mix(0.35, 1.0, smoothstep(60.0, 600.0, vD)); gl_FragColor = vec4(vC, a);
      #include <colorspace_fragment>
    }` });
  const matFaro = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCol; varying float vH; varying vec3 vC; varying float vD; void main(){ vH = position.y; vC = aCol; ${escala} float k = clamp(d / 650.0, 1.0, 7.0); vD = d; vec4 w = instanceMatrix * vec4(position, 1.0); w.xz = ctr.xz + (w.xz - ctr.xz) * k; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uT; varying float vH; varying vec3 vC; varying float vD; void main(){ float a = pow(1.0 - vH, 1.6) * 0.34 * (0.85 + 0.15 * sin(uT * 1.6 + vH * 8.0)) * mix(0.05, 1.0, smoothstep(60.0, 900.0, vD)); gl_FragColor = vec4(vC, a);
      #include <colorspace_fragment>
    }` });
  const aros = new THREE.InstancedMesh(gR, matAro, MAXM), faros = new THREE.InstancedMesh(gB, matFaro, MAXM);
  for (const im of [aros, faros]) { im.frustumCulled = false; im.count = 0; grupo.add(im); } aros.renderOrder = 13; faros.renderOrder = 11;
  const O = new THREE.Object3D(), CB = new THREE.Color('#ffc86a'), CP = new THREE.Color('#9be88a');
  const marcas = (ab) => { ab.forEach((m, i) => { const L = dib.lista.find(q => q.id === m.id), y = (L && L.y != null ? L.y : (T3.sueloY != null ? T3.sueloY : 0.35)) + 0.5, pl = m.tipo === 'plazoleta', r = pl ? 52 : 30, h = pl ? 120 : 75;
      O.position.set(m.x, y, m.z); O.rotation.set(0, 0, 0); O.scale.set(r, 1, r); O.updateMatrix(); aros.setMatrixAt(i, O.matrix); O.scale.set(pl ? 1.6 : 1.1, h, pl ? 1.6 : 1.1); O.updateMatrix(); faros.setMatrixAt(i, O.matrix);
      const c = pl ? CP : CB; aColA.set([c.r, c.g, c.b], i * 3); aColB.set([c.r, c.g, c.b], i * 3); });
    aros.count = faros.count = ab.length; aros.instanceMatrix.needsUpdate = faros.instanceMatrix.needsUpdate = true; gR.attributes.aCol.needsUpdate = gB.attributes.aCol.needsUpdate = true; };

  /* ----- etiqueta de apertura y leyenda (DOM discreto, responsive) ----- */
  if (!document.getElementById('mercred-css')) { const st = document.createElement('style'); st.id = 'mercred-css'; st.textContent = `
    #mercred-ley{position:fixed;left:12px;bottom:12px;z-index:30;display:none;max-width:min(330px,calc(100vw - 24px));padding:7px 11px 8px;border-radius:7px;background:rgba(14,20,18,.74);color:#e9efe6;border:1px solid rgba(190,230,170,.22);backdrop-filter:blur(6px);font:500 12px/1.3 Geist,system-ui,Arial,sans-serif;pointer-events:none}
    #mercred-ley b{font:600 14px/1.1 "Barlow Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#ffd98a;display:block;margin-bottom:2px}
    #mercred-ley i{display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 4px 0 8px;vertical-align:baseline}#mercred-ley i:first-of-type{margin-left:0}
    #mercred-aviso{position:fixed;left:50%;top:76px;transform:translate(-50%,-6px);z-index:31;display:none;max-width:calc(100vw - 24px);padding:7px 14px;border-radius:999px;background:rgba(14,20,18,.82);color:#f2f6ee;border:1px solid rgba(255,214,130,.45);font:500 13px/1.2 Geist,system-ui,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none}
    #mercred-aviso.on{opacity:1;transform:translate(-50%,0)}#mercred-aviso em{font-style:normal;color:#ffd98a}
    @media(max-width:640px){#mercred-ley{left:8px;bottom:78px;font-size:11px;padding:6px 9px}#mercred-aviso{top:auto;bottom:128px;font-size:12px;padding:6px 11px}}`; document.head.appendChild(st); }
  const mk = (id) => { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; document.body.appendChild(e); } return e; };
  const elLey = mk('mercred-ley'), elAviso = mk('mercred-aviso'); elLey.setAttribute('role', 'status'); elAviso.setAttribute('aria-live', 'polite');
  const cola = []; let mostrando = false;
  const siguiente = () => { const t = cola.shift(); if (!t) { mostrando = false; elAviso.classList.remove('on'); setTimeout(() => { if (!mostrando) elAviso.style.display = 'none'; }, 400); return; }
    mostrando = true; elAviso.innerHTML = t; elAviso.style.display = 'block'; void elAviso.offsetWidth; elAviso.classList.add('on'); setTimeout(siguiente, 3600); };
  const avisar = (t) => { if (cola.length > 3) cola.shift(); cola.push(t); if (!mostrando) siguiente(); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const leyenda = (ab) => { const nb = ab.filter(m => m.tipo === 'barrio').length, np = ab.length - nb, tb = MERCADOS.filter(m => m.tipo === 'barrio').length, tp = MERCADOS.length - tb;
    elLey.innerHTML = `<b>Red de mercados</b>${ab.length} abiertos de ${MERCADOS.length} · <i style="background:#ffc86a"></i>${nb}/${tb} de barrio <i style="background:#9be88a"></i>${np}/${tp} plazoletas<br><span style="color:#bfe3d4">Bodega con cuarto frío: recibe a cualquier hora</span>`;
    elLey.style.display = visible ? 'block' : 'none'; };

  /* ----- estado: qué está abierto ahora; solo se rehace lo que cambió ----- */
  let abiertosIds = '', abPrev = new Set(), ultClave = '', nHAnt = -1;
  const refrescar = (forzar) => {
    if (!visible) return; const sem = RELOJ.semana, pf = proFrac(); engancharHuertas(); const nh = nHuertas();
    const clave = sem + '|' + (pf == null ? '-' : pf.toFixed(2)) + '|' + nh + '|' + T3.escenario; if (!forzar && clave === ultClave) return; ultClave = clave;
    const ab = MERCADOS.filter(m => abiertoAhora(m, sem, pf)), ids = ab.map(m => m.id).join(',');
    if (ids !== abiertosIds) {
      const nuevos = ab.filter(m => !abPrev.has(m.id)); abiertosIds = ids; abPrev = new Set(ab.map(m => m.id));
      dib.mostrar(ab.map(m => m.id)); marcas(ab); leyenda(ab);
      if (sembrado && nuevos.length && !RELOJ.saltando) {
        import('./resaltes.js?v=4').then(mm => { const R = mm.resaltes(T3); nuevos.slice(0, 12).forEach(m => { const L = dib.lista.find(q => q.id === m.id); R.pulso(m.x, (L && L.y != null ? L.y : 0.4), m.z, m.tipo === 'plazoleta' ? 150 : 100); }); }).catch(() => {});
        if (nuevos.length <= 2) nuevos.forEach(m => avisar(`<em>Mercado abierto</em> · ${esc(m.n)} · año ${m.anio}`)); else avisar(`<em>${nuevos.length} mercados abiertos</em> · año ${RELOJ.año}`);
      }
      armarRed(ab, nh); nHAnt = nh;
    } else if (nh !== nHAnt) { armarRed(ab, nh); nHAnt = nh; }
    sembrado = true; };
  RELOJ.alDibujar((info) => { U.uT.value = info.tAnim; if (visible) refrescar(false); });
  const apagar = () => { cola.length = 0; mostrando = false; elAviso.classList.remove('on'); elAviso.style.display = 'none'; elLey.style.display = 'none'; };

  return {
    grupo, dib, MERCADOS,
    stats: () => ({ ...dib.stats(), mercados: MERCADOS.length, abiertos: abPrev.size, huertasAbiertas: nHuertas() }),
    get lista() { return dib.lista; },
    abiertos: mercadosAbiertos,
    ver(on) { visible = !!on; grupo.visible = visible; dib.ver(visible);
      if (visible) { sembrado = false; ultClave = ''; abiertosIds = '\u0000'; refrescar(true); } else { apagar(); sembrado = false; abiertosIds = ''; abPrev = new Set(); dib.mostrar([]); aros.count = faros.count = 0; if (malla) { grupo.remove(malla); malla.geometry.dispose(); malla = null; } nacimiento.clear(); } },
    refrescar: () => refrescar(true),
    precalentar: () => (dib.precalentar ? dib.precalentar() : null), /* geometría de los sitios armada escondida (data3d/escenario.js, precarga) */
    quitar() { apagar(); dib.quitar && dib.quitar(); T3.scene.remove(grupo); }
  };
}
