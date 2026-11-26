/* ============ PROPUESTA COMÚN · MÁS FAUNA: BÚHOS EN LOS HUMEDALES Y ENJAMBRES DE POLINIZADORES SOBRE LAS CUBIERTAS CON HUERTA ============
   crearFauna({ T3, eco }) → { poner(sem), apagar(), info() } — lo maneja data3d/propuesta01_3d.js (activar), una vez por semana simulada.
   · BÚHOS (búho sabanero, Asio flammeus bogotensis, y currucutú): posados en lo alto de las copas de los árboles nuevos de los bordes de
     El Burro, La Vaca y Techo y del puente de fauna (data3d/ecoducto.js). Llegan cuando los árboles ya tienen copa: de 0 en el año 2 a 36
     en el año 8 [SUP: ritmo de llegada]. Escala de maqueta (×3, como la fauna de data3d/biotica.js) para que se lean desde la vista general.
   · POLINIZADORES: sobre cada cubierta con huerta hidropónica ya instalada (window.KEN_HIDRO de data3d/huertas_hidro.js: centros() y frac)
     un enjambre de abejas (y algunas mariposas) que gira entre los racks; más individuos por cubierta a medida que se instalan más huertas
     (26 → 66). También sobre el puente de fauna. [SUP: cantidades ilustrativas, no conteos]
   · RENDIMIENTO: una sola malla instanciada para todos los polinizadores, animada en la tarjeta de video (el procesador solo rehace la lista
     cuando la cámara se mueve ~40 m o cambia la semana); solo cubiertas a < 650 m del punto que se mira; los búhos, una malla de ≤ 48. */
const sat = (v) => Math.max(0, Math.min(1, v));
export function crearFauna({ T3, eco }) {
  const THREE = T3.THREE, Y0 = T3.sueloY != null ? T3.sueloY : 0.3;
  const G = new THREE.Group(); G.name = 'propuesta_fauna'; G.visible = false; T3.scene.add(G);
  const merge = (partes) => { // [geometría, color] → una geometría con color por vértice
    let n = 0; for (const [g] of partes) n += (g.index ? g.toNonIndexed() : g).attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), A = new Float32Array(n); let o = 0; const c = new THREE.Color();
    for (const [g0, col, ala] of partes) { const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); c.set(col).convertSRGBToLinear(); const p = g.attributes.position, nn = g.attributes.normal;
      for (let i = 0; i < p.count; i++, o++) { P.set([p.getX(i), p.getY(i), p.getZ(i)], o * 3); N.set([nn.getX(i), nn.getY(i), nn.getZ(i)], o * 3); C.set([c.r, c.g, c.b], o * 3); A[o] = ala || 0; } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aAla', new THREE.BufferAttribute(A, 1)); return g; };
  const E = (rx, ry, rz, x, y, z, seg = 10) => new THREE.SphereGeometry(1, seg, Math.max(6, seg - 2)).scale(rx, ry, rz).translate(x, y, z);

  /* ---------- búho posado (de pie, mirando a +x): cuerpo, pecho claro, disco facial, ojos amarillos, orejas cortas ---------- */
  const gBuho = merge([
    [E(0.13, 0.2, 0.12, 0, 0.2, 0), '#a8814b'], [E(0.07, 0.15, 0.09, 0.07, 0.19, 0), '#e6d3a8'], [E(0.04, 0.12, 0.1, -0.02, 0.18, 0.09), '#8a6638'], [E(0.04, 0.12, 0.1, -0.02, 0.18, -0.09), '#8a6638'],
    [E(0.115, 0.1, 0.115, 0.01, 0.42, 0), '#a8814b'], [E(0.03, 0.085, 0.095, 0.095, 0.415, 0), '#f1e4c6'],
    [E(0.022, 0.022, 0.022, 0.113, 0.43, 0.04, 8), '#f2c230'], [E(0.022, 0.022, 0.022, 0.113, 0.43, -0.04, 8), '#f2c230'],
    [E(0.011, 0.011, 0.011, 0.133, 0.432, 0.04, 6), '#141210'], [E(0.011, 0.011, 0.011, 0.133, 0.432, -0.04, 6), '#141210'],
    [new THREE.ConeGeometry(0.014, 0.04, 5).rotateZ(-Math.PI / 2).translate(0.125, 0.4, 0), '#3a3026'],
    [new THREE.ConeGeometry(0.02, 0.06, 5).translate(0.0, 0.52, 0.055), '#7a5a32'], [new THREE.ConeGeometry(0.02, 0.06, 5).translate(0.0, 0.52, -0.055), '#7a5a32'],
    [E(0.05, 0.08, 0.03, -0.1, 0.06, 0), '#8a6638'], [new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5).translate(0.03, 0.0, 0.035), '#c9a86a'], [new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5).translate(0.03, 0.0, -0.035), '#c9a86a']]);
  const matB = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  const MAXB = 48, imB = new THREE.InstancedMesh(gBuho, matB, MAXB); imB.count = 0; imB.castShadow = true; imB.frustumCulled = false; imB.instanceMatrix.setUsage(THREE.DynamicDrawUsage); imB.name = 'buhos'; G.add(imB);
  let perchas = null; // [{ x, y, z, rot, fase }]
  const elegirPerchas = () => { const A = eco && eco.arboles ? eco.arboles() : null; if (!A || !A.bordes.length) return null;
    const grandes = (L) => L.filter(t => t.h > 4.5); const B = grandes(A.bordes), P = grandes(A.puente), out = [], porHum = {};
    for (const t of B) (porHum[t.hum] = porHum[t.hum] || []).push(t);
    const hum = Object.values(porHum); let i = 0; // repartidos entre los humedales (cada uno con su parte), en orden fijo
    while (out.length < MAXB - 6 && hum.some(L => L.length)) { const L = hum[i++ % hum.length]; if (!L.length) continue; const k = Math.floor((out.length * 0.618 * 7919) % L.length); out.push(L.splice(k, 1)[0]); }
    for (let j = 0; j < 6 && P.length; j++) out.splice(j * 6, 0, P[Math.floor(j * P.length / 6)]); // los del puente, de primeros
    return out.slice(0, MAXB).map((t, j) => ({ t, rot: (j * 2.39) % 6.283, fase: j * 1.7 })); };
  let nBuhos = 0, años = 0;
  const ESC_B = 3.0, O = new THREE.Object3D();
  function ponerBuhos() { if (!perchas) perchas = elegirPerchas(); if (!perchas) { imB.count = 0; return; }
    const objetivo = Math.round(36 * sat((años - 2) / 6)); nBuhos = Math.min(perchas.length, objetivo + (años > 2.5 ? 4 : 0)); imB.count = nBuhos; }
  const moverBuhos = (tt) => { for (let i = 0; i < nBuhos; i++) { const p = perchas[i], t = p.t, f = Math.min(1, 0.3 + 0.7 * Math.max(0, años - 2) / 3.5); // copa (la altura del árbol crece con su edad)
      const gira = Math.sin(tt * 0.35 + p.fase) > 0.6 ? Math.sin(tt * 1.3 + p.fase) * 0.9 : 0; // de vez en cuando gira para mirar
      O.position.set(t.x, Y0 + (t.y || 0) + t.h * f * 0.93, t.z); O.rotation.set(0, p.rot + gira, 0); O.scale.setScalar(ESC_B); O.updateMatrix(); imB.setMatrixAt(i, O.matrix); }
    imB.instanceMatrix.needsUpdate = true; };

  /* ---------- polinizadores: una malla instanciada animada en el sombreador ---------- */
  const gAbeja = merge([[E(0.035, 0.03, 0.03, 0.025, 0, 0, 8), '#4a3418'], [E(0.06, 0.038, 0.038, -0.04, -0.004, 0, 8), '#e0a52c'], [E(0.012, 0.04, 0.04, -0.03, -0.004, 0, 6), '#1b1712'], [E(0.012, 0.04, 0.04, -0.06, -0.004, 0, 6), '#1b1712'], [E(0.022, 0.022, 0.024, 0.065, 0.004, 0, 6), '#1b1712'],
    [new THREE.PlaneGeometry(0.075, 0.035).rotateX(-Math.PI / 2).translate(0.0, 0.03, 0.045), '#eef3f8', 1], [new THREE.PlaneGeometry(0.075, 0.035).rotateX(-Math.PI / 2).translate(0.0, 0.03, -0.045), '#eef3f8', -1]]);
  const geo = new THREE.InstancedBufferGeometry(); for (const k of ['position', 'normal', 'color', 'aAla']) geo.setAttribute(k, gAbeja.attributes[k]);
  const MAXA = (innerWidth < 760 ? 4000 : 14000), aC = new Float32Array(MAXA * 3), aF = new Float32Array(MAXA * 4);
  geo.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3)); geo.setAttribute('aF', new THREE.InstancedBufferAttribute(aF, 4)); geo.instanceCount = 0;
  const UA = { uT: { value: 0 }, uEsc: { value: 3.0 }, uSol: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() } };
  const matA = new THREE.ShaderMaterial({ uniforms: UA, side: THREE.DoubleSide, vertexColors: true,
    vertexShader: `attribute vec3 aC; attribute vec4 aF; attribute float aAla; uniform float uT, uEsc; varying vec3 vC; varying vec3 vN;
      void main(){
        float fase = aF.x, r = aF.y, v = aF.z, tipo = aF.w; // tipo 0 abeja · 1 mariposa
        float t = uT * v + fase;
        vec3 p = aC + vec3(cos(t) * r + sin(t * 2.3 + fase) * r * 0.45, sin(t * 1.7 + fase) * 0.8 + sin(t * 4.1) * 0.25, sin(t * 1.3) * r + cos(t * 2.9 + fase) * r * 0.35);
        vec3 d = vec3(-sin(t) * r + cos(t * 2.3 + fase) * r * 1.03, 0.0, cos(t * 1.3) * r * 1.3 - sin(t * 2.9 + fase) * r * 1.0);
        float ang = atan(-d.z, d.x);
        vec3 q = position * (tipo > 0.5 ? vec3(0.8, 0.8, 1.0) : vec3(1.0));
        if (aAla != 0.0) { float ab = sin(uT * (tipo > 0.5 ? 9.0 : 70.0) + fase * 3.0) * (tipo > 0.5 ? 1.1 : 0.8); float s = sign(aAla); q.z *= (tipo > 0.5 ? 2.6 : 1.0); q.x *= (tipo > 0.5 ? 1.8 : 1.0);
          float y = q.y - 0.03, z = q.z; q.y = 0.03 + y * cos(ab) + abs(z) * sin(ab); q.z = s * abs(z) * cos(ab); }
        float c = cos(ang), s2 = sin(ang); q = vec3(q.x * c + q.z * s2, q.y, -q.x * s2 + q.z * c);
        vN = normalize(vec3(normal.x * c + normal.z * s2, normal.y, -normal.x * s2 + normal.z * c));
        vC = color; if (tipo > 0.5) vC = aAla != 0.0 ? (fract(fase * 7.13) < 0.5 ? vec3(0.85, 0.32, 0.05) : vec3(0.92, 0.92, 0.86)) : vec3(0.05);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + q * uEsc, 1.0);
      }`,
    fragmentShader: `uniform vec3 uSol; varying vec3 vC; varying vec3 vN;
      void main(){ float l = 0.55 + 0.6 * max(dot(normalize(vN), uSol), 0.0); gl_FragColor = vec4(vC * l * 1.25, 1.0);
        #include <colorspace_fragment>
      }` });
  const enj = new THREE.Mesh(geo, matA); enj.frustumCulled = false; enj.name = 'polinizadores'; G.add(enj);
  let nEnj = 0, nTechos = 0, ultC = new THREE.Vector3(1e9, 0, 0), ultFrac = -1;
  const hsh = (a) => { const h = Math.sin(a * 91.345) * 43758.5453; return h - Math.floor(h); };
  function ponerEnjambres(forzar) {
    const H = window.KEN_HIDRO, c = T3.orbit ? T3.orbit.target : T3.camera.position; const frac = H && H.grupo && H.grupo.visible ? (H.frac != null ? H.frac : 0) : 0;
    if (!forzar && c.distanceTo(ultC) < 40 && Math.abs(frac - ultFrac) < 0.002) return; ultC.copy(c); ultFrac = frac;
    let n = 0; const R2 = 650 * 650, porTecho = Math.round(26 + 40 * sat((H && H.instaladas || 0) / 300)); // más huertas instaladas → más polinizadores por cubierta
    const meter = (x, y, z, k, dispersa) => { for (let i = 0; i < k && n < MAXA; i++, n++) { const h = hsh(x * 0.37 + z * 0.11 + i * 1.618);
      aC[n * 3] = x + (hsh(h + 1) - 0.5) * dispersa; aC[n * 3 + 1] = y + 0.6 + hsh(h + 2) * 1.6; aC[n * 3 + 2] = z + (hsh(h + 3) - 0.5) * dispersa;
      const mar = hsh(h + 4) < 0.14; aF[n * 4] = h * 60; aF[n * 4 + 1] = (mar ? 2.2 : 1.1) + hsh(h + 5) * 2.2; aF[n * 4 + 2] = (mar ? 0.25 : 0.55) + hsh(h + 6) * 0.5; aF[n * 4 + 3] = mar ? 1 : 0; } };
    nTechos = 0;
    if (H && H.centros && frac > 0) for (const [ce, ord] of H.centros()) { if (!ce || ord > frac) continue; const dx = ce[0] - c.x, dz = ce[2] - c.z; if (dx * dx + dz * dz > R2) continue; nTechos++; meter(ce[0], ce[1], ce[2], porTecho, 9); if (n >= MAXA) break; }
    // sobre el puente de fauna (flores de los arbustos del borde) cuando ya tiene cubierta verde
    if (eco && eco.puente && años > 2) { const p = eco.puente; if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < R2) for (let k = 0; k < 10; k++) { const a = k * 2.39, r = 8 + (k % 4) * 9; meter(p.x + Math.cos(a) * r, Y0 + 9.5, p.z + Math.sin(a) * r, Math.round(10 + 20 * sat((años - 2) / 4)), 10); } }
    nEnj = n; geo.instanceCount = n; geo.attributes.aC.needsUpdate = true; geo.attributes.aF.needsUpdate = true; }

  let activo = false, raf = 0; const T0 = performance.now(); let tCam = 0;
  const cuadro = () => { raf = activo ? requestAnimationFrame(cuadro) : 0; if (!activo) return; const tt = (performance.now() - T0) / 1000; UA.uT.value = tt;
    const cp = T3.camera.position; enj.visible = nEnj > 0 && cp.y < 1400; // de muy lejos los insectos no se distinguen
    if (nBuhos) moverBuhos(tt);
    if (tt - tCam > 0.5) { tCam = tt; ponerEnjambres(false); } };
  return {
    grupo: G,
    poner(sem) { años = (sem || 0) / 52; const nuevo = !activo; activo = true; G.visible = true; ponerBuhos(); ponerEnjambres(true); if (nuevo && !raf) cuadro(); },
    apagar() { activo = false; G.visible = false; },
    info() { return { activo, buhos: nBuhos, perchas: perchas ? perchas.length : 0, polinizadores: nEnj, cubiertasConEnjambre: nTechos, hidroFrac: window.KEN_HIDRO ? window.KEN_HIDRO.frac : null }; }
  };
}
