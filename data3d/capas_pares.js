/* ============ CAPAS DE LOS PARES · lo visible de las 6 parejas de simulaciones (sin / con la propuesta) ============
   window.KEN_PARES = { poner(capa, I), quitar(), capa }
   · capa: 'abasto' | 'residuos' | 'biodiversidad' | 'suelo' | 'gobernanza' (la pareja 02 · Movilidad usa cierre_gradual.js y el
     flujo de carros: aquí no hay nada). I = el objeto de ind() de la semana (data3d/simulaciones12.js); se leen sus campos
     I.abasto, I.estaciones/I.recorridos, I.fragmento/I.corredores/I.refugios/I.desplazamientos, I.suelo, I.gobernanza (marco MUNDO x,z).
   · Cada capa vive en un THREE.Group con su nombre exacto ('abasto', ...) para que KEN_FOCO.on('abasto') la deje en color.
   · Se arma la primera vez que se pide; poner() de otra capa apaga las demás con un fundido. Entre semanas todo se interpola (0,9 s):
     alturas, anchos, densidad de partículas y fases de los corredores.
   · Rendimiento: nada se crea por cuadro. Arcos y partículas se mueven en el shader (tiempo de animación del reloj universal,
     RELOJ.tAnim: se detienen en pausa); las alturas de los volúmenes (InstancedMesh) solo se reescriben durante la transición;
     las etiquetas de vidrio (DOM) solo tocan su estilo cuando cambian de lugar. Un dibujo por tipo de pieza.
   Lectura:
   · abasto: nodos como volúmenes (alto ∝ t/día; Corabastos ámbar, mercados azul, acopio violeta, huertas verde; cerrados en gris),
     rutas como arcos con partículas (ancho y densidad ∝ t/día), lectura del déficit sobre Corabastos.
   · residuos: Estación Circular (volumen bajo) con medidor de llenado tratado/capacidad y anillo rojo que crece con lo acumulado;
     recorridos de recolección con partículas.
   · biodiversidad: parche perdido rayado en gris con borde discontinuo, corredores verdes que crecen con su fase (franja + copas),
     refugios (pilares hexagonales verdes), desplazamientos de especies como arcos amarillos.
   · suelo: celdas de 500 m por estado (permanece neutra, cambia naranja, desplazada roja) con columna ∝ presión; espacios
     protegidos con anillo verde e ícono.
   · gobernanza: cada barrio como medidor (vidrio = necesidad, relleno = asignado, color por cobertura); con asambleas: red
     federada hacia un nodo común; sin asambleas: un nodo central con radios; equipamientos que aparecen; lectura de equidad. */

const DUR = 0.9, FADE = 0.6;
const COL = {
  corabastos: '#f2a65a', mercado: '#5aa9ff', acopio: '#c792ea', huerta: '#7ddc8a', gris: '#5a6066',
  residuo: '#d9a35b', estacion: '#c5ccd0', vidrio: '#a9e3dd', ok: '#4fd1c5', medio: '#f6c75c', mal: '#ff6b6b',
  verde: '#5fcf7a', especie: '#f6d55c', perdido: '#e07a5f',
  permanece: '#cdd5da', cambia: '#f4a259', desplazada: '#ff5a5f', protegido: '#7ddc8a',
  oro: '#e9c46a', central: '#9db4cf', flujo: '#4fd1c5'
};
const EQUIP = { salon: '#e9c46a', 'salón': '#e9c46a', estacion: '#4fd1c5', 'estación': '#4fd1c5', parque: '#7ddc8a', huerta: '#9be27a', mercado: '#5aa9ff', salud: '#ff8fa3', educacion: '#5aa9ff', 'educación': '#5aa9ff', cultura: '#c792ea', deporte: '#4fd1c5', abasto: '#7ddc8a', cuidado: '#f6d55c' };
const NOMBRE_TIPO = { corabastos: 'Corabastos', mercado: 'Mercado', acopio: 'Centro de acopio', huerta: 'Huerta' };

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '–' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const suave = (k) => k * k * (3 - 2 * k);
const xz = (p) => (p ? (Array.isArray(p) ? [num(p[0]), num(p[1])] : [num(p.x), num(p.z)]) : null);

export function crearCapasPares({ T3, RELOJ } = {}) {
  T3 = T3 || window.KEN_T3; RELOJ = RELOJ || window.KEN_RELOJ;
  if (window.KEN_PARES && window.KEN_PARES._T3 === T3) return window.KEN_PARES;
  const THREE = T3.THREE;
  const Y0 = T3.sueloY != null ? T3.sueloY : 0.3, YV = (T3.viaY != null ? T3.viaY : 0.62) + 1.2;
  const RES = { value: new THREE.Vector2(1, 1) }, PR = { value: 1 };
  const CAPAS = {}, LISTA = [];
  let actual = null, caja = null;
  const tmpC = new THREE.Color();
  const color = (h, k = 1) => { tmpC.set(h); return [tmpC.r * k, tmpC.g * k, tmpC.b * k]; };

  /* ---------- materiales ---------- */
  function matSolido(L) { // volúmenes: estándar, con un poco de luz propia del color de cada instancia (se leen en la noche y en el foco)
    const m = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0 });
    m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * 0.32;\n#endif'); };
    m.userData.op = 1; L.mats.push(m); return m;
  }
  function matVidrio(L) {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0, transparent: true, opacity: 0, depthWrite: false });
    m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * 0.25;\n#endif'); };
    m.userData.op = 0.32; L.mats.push(m); return m;
  }
  // planos sobre el suelo (celdas, anillos): instanciados, color e intensidad por instancia, encima de la malla (sin prueba de profundidad)
  function matPlano(L, modo) {
    return new THREE.ShaderMaterial({
      uniforms: { uK: L.U.uK, uMix: L.U.uMix, uT: L.U.uT }, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      blending: modo === 'anillo' ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec2 aAl; attribute float aPul; uniform float uK, uMix, uT; varying vec3 vC; varying float vA; varying vec2 vUv;
        void main(){ vUv = uv; vC = instanceColor; float p = aPul > 0.5 ? 0.6 + 0.4 * sin(uT * 3.0 + instanceMatrix[3].x * 0.01) : 1.0;
          vA = mix(aAl.x, aAl.y, uMix) * uK * p; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: modo === 'celda'
        ? `varying vec3 vC; varying float vA; varying vec2 vUv; void main(){ vec2 q = abs(vUv - 0.5) * 2.0; float e = max(q.x, q.y);
            float borde = smoothstep(0.9, 0.95, e) * (1.0 - smoothstep(0.985, 1.0, e)); float a = vA * (0.55 + 1.6 * borde); if (a < 0.003) discard; gl_FragColor = vec4(vC, min(a, 0.9)); }`
        : `varying vec3 vC; varying float vA; varying vec2 vUv; void main(){ if (vA < 0.003) discard; gl_FragColor = vec4(vC * vA, 1.0); }`
    });
  }

  /* ---------- piezas ---------- */
  // instancias con escala animada (alturas que crecen y bajan entre semanas): matrices solo se reescriben mientras dura la mezcla
  function Inst(L, geo, mat, max, ro, opc = {}) {
    if (opc.alfa) { geo.setAttribute('aAl', new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2)); geo.setAttribute('aPul', new THREE.InstancedBufferAttribute(new Float32Array(max), 1)); }
    const mesh = new THREE.InstancedMesh(geo, mat, max); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = ro;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    const P = new Float32Array(max * 3), S0 = new Float32Array(max * 3), S1 = new Float32Array(max * 3);
    const AL = opc.alfa ? geo.attributes.aAl.array : null, PU = opc.alfa ? geo.attributes.aPul.array : null;
    let usados = 0; L.g.add(mesh);
    const I = {
      mesh,
      set(lista) { const m = L.m, n = Math.min(lista.length, max), tope = Math.max(usados, n), C = mesh.instanceColor.array;
        for (let i = 0; i < tope; i++) { const it = i < n ? lista[i] : null, o = i * 3;
          for (let k = 0; k < 3; k++) { S0[o + k] += (S1[o + k] - S0[o + k]) * m; S1[o + k] = it ? it.s[k] : 0; }
          if (AL) { AL[i * 2] += (AL[i * 2 + 1] - AL[i * 2]) * m; AL[i * 2 + 1] = it ? (it.al != null ? it.al : 1) : 0; PU[i] = it && it.pul ? 1 : 0; }
          if (it) { P[o] = it.x; P[o + 1] = it.y; P[o + 2] = it.z; C[o] = it.col[0]; C[o + 1] = it.col[1]; C[o + 2] = it.col[2]; } }
        usados = tope; mesh.count = tope; mesh.instanceColor.needsUpdate = true;
        if (AL) { geo.attributes.aAl.needsUpdate = true; geo.attributes.aPul.needsUpdate = true; } },
      upd(m) { const e = mesh.instanceMatrix.array;
        for (let i = 0; i < usados; i++) { const o = i * 3, q = i * 16;
          e[q] = S0[o] + (S1[o] - S0[o]) * m; e[q + 1] = 0; e[q + 2] = 0; e[q + 3] = 0;
          e[q + 4] = 0; e[q + 5] = Math.max(1e-4, S0[o + 1] + (S1[o + 1] - S0[o + 1]) * m); e[q + 6] = 0; e[q + 7] = 0;
          e[q + 8] = 0; e[q + 9] = 0; e[q + 10] = S0[o + 2] + (S1[o + 2] - S0[o + 2]) * m; e[q + 11] = 0;
          e[q + 12] = P[o]; e[q + 13] = P[o + 1]; e[q + 14] = P[o + 2]; e[q + 15] = 1; }
        mesh.instanceMatrix.needsUpdate = true; }
    };
    L.prims.push(I); return I;
  }

  // arcos con grosor real en pantalla (cinta orientada a la cámara) + partículas que los recorren; todo se mueve en el shader
  function Arcos(L, max, { S = 22, P = 18, vel = 70 } = {}) {
    const nv = max * (S + 1) * 2, A = new Float32Array(nv * 3), B = new Float32Array(nv * 3), Q = new Float32Array(nv * 4), W = new Float32Array(nv * 2), C = new Float32Array(nv * 3);
    const idx = new Uint32Array(max * S * 6);
    for (let r = 0; r < max; r++) for (let s = 0; s <= S; s++) for (let k = 0; k < 2; k++) { const v = (r * (S + 1) + s) * 2 + k; Q[v * 4] = s / S; Q[v * 4 + 1] = k ? 1 : -1; }
    for (let r = 0, j = 0; r < max; r++) for (let s = 0; s < S; s++) { const a = (r * (S + 1) + s) * 2; idx[j++] = a; idx[j++] = a + 1; idx[j++] = a + 2; idx[j++] = a + 1; idx[j++] = a + 3; idx[j++] = a + 2; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(A, 3)); g.setAttribute('aB', new THREE.BufferAttribute(B, 3)); g.setAttribute('aP', new THREE.BufferAttribute(Q, 4));
    g.setAttribute('aW', new THREE.BufferAttribute(W, 2)); g.setAttribute('aC', new THREE.BufferAttribute(C, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.setDrawRange(0, 0);
    const U = { uK: L.U.uK, uMix: L.U.uMix, uT: L.U.uT, uRes: RES, uVel: { value: vel } };
    const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aB; attribute vec4 aP; attribute vec2 aW; attribute vec3 aC; uniform float uMix; uniform vec2 uRes;
        varying vec3 vC; varying vec2 vQ; varying float vL, vS, vW;
        vec3 arco(float u){ vec3 p = mix(position, aB, u); p.y += 4.0 * aP.z * u * (1.0 - u); return p; }
        vec4 pr(float u){ return projectionMatrix * modelViewMatrix * vec4(arco(clamp(u, 0.0, 1.0)), 1.0); }
        void main(){ float w = mix(aW.x, aW.y, uMix), u = aP.x; vec4 c0 = pr(u), c1 = pr(u + 0.012), cm = pr(u - 0.012);
          vec2 d = (c1.xy / max(c1.w, 1e-3) - cm.xy / max(cm.w, 1e-3)) * uRes; d = dot(d, d) > 1e-8 ? normalize(d) : vec2(1.0, 0.0);
          c0.xy += vec2(-d.y, d.x) * aP.y * (w + 1.5) / uRes * c0.w; gl_Position = c0;
          vC = aC; vQ = vec2(u, aP.y); vL = length(aB.xz - position.xz); vS = aP.w; vW = w; }`,
      fragmentShader: `uniform float uK, uT, uVel; varying vec3 vC; varying vec2 vQ; varying float vL, vS, vW;
        void main(){ if (vW < 0.05) discard; float e = abs(vQ.y), core = 1.0 - smoothstep(0.45, 1.0, e);
          float f = fract((vQ.x * vL - uT * uVel) / 110.0 + vS), flow = 0.5 + 0.5 * smoothstep(0.0, 0.3, f) * (1.0 - smoothstep(0.55, 1.0, f));
          vec3 c = mix(vC, vec3(1.0), 0.28 * (1.0 - e) * flow); float a = core * flow * clamp(0.3 + vW / 6.0, 0.3, 0.95) * uK * min(1.0, vW); if (a < 0.004) discard; gl_FragColor = vec4(c, a); }` });
    const cinta = new THREE.Mesh(g, m); cinta.frustumCulled = false; cinta.renderOrder = 8; L.g.add(cinta);
    // partículas
    const np = max * P, pA = new Float32Array(np * 3), pB = new Float32Array(np * 3), pR = new Float32Array(np * 4), pD = new Float32Array(np * 2), pC = new Float32Array(np * 3);
    for (let r = 0; r < max; r++) for (let k = 0; k < P; k++) { const i = r * P + k; pR[i * 4] = (k + 0.5) / P; pR[i * 4 + 1] = (k * 0.61803 + r * 0.137) % 1; }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pA, 3)); pg.setAttribute('aB', new THREE.BufferAttribute(pB, 3)); pg.setAttribute('aR', new THREE.BufferAttribute(pR, 4));
    pg.setAttribute('aD', new THREE.BufferAttribute(pD, 2)); pg.setAttribute('aC', new THREE.BufferAttribute(pC, 3)); pg.setDrawRange(0, 0);
    const pm = new THREE.ShaderMaterial({ uniforms: { uK: L.U.uK, uMix: L.U.uMix, uT: L.U.uT, uVel: U.uVel, uPR: PR }, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aB; attribute vec4 aR; attribute vec2 aD; attribute vec3 aC; uniform float uMix, uT, uVel, uPR; varying vec3 vC; varying float vA;
        void main(){ float dens = mix(aD.x, aD.y, uMix), on = step(aR.x, dens); float L = max(length(aB.xz - position.xz), 60.0);
          float u = fract(aR.y + uT * uVel / L); vec3 p = mix(position, aB, u); p.y += 4.0 * aR.z * u * (1.0 - u);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = on > 0.5 ? projectionMatrix * mv : vec4(2.0, 2.0, 2.0, 1.0);
          gl_PointSize = on * clamp(aR.w * 12000.0 / -mv.z, 3.2, 10.0) * uPR; vC = aC; vA = smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.95, 1.0, u)); }`,
      fragmentShader: `uniform float uK; varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard;
          gl_FragColor = vec4(mix(vec3(1.0), vC, 0.45) * smoothstep(0.5, 0.12, r) * vA * uK, 1.0); }` });
    const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 9; L.g.add(pts);
    let usados = 0;
    const R = {
      // lista: [{ a:[x,z], b:[x,z], w (px), d (0–1 densidad), col:[r,g,b], ya, yb, hk }]
      set(lista) { const mm = L.m, n = Math.min(lista.length, max), tope = Math.max(usados, n);
        for (let r = 0; r < tope; r++) { const it = r < n ? lista[r] : null;
          let ax, ay, az, bx, by, bz, h = 0;
          if (it) { ax = it.a[0]; az = it.a[1]; bx = it.b[0]; bz = it.b[1]; ay = YV + (it.ya || 0); by = YV + (it.yb || 0);
            const Ln = Math.hypot(bx - ax, bz - az); h = Math.min(320, Math.max(30, Ln * 0.15)) * (it.hk || 1); }
          for (let s = 0; s <= S; s++) for (let k = 0; k < 2; k++) { const v = (r * (S + 1) + s) * 2 + k;
            W[v * 2] += (W[v * 2 + 1] - W[v * 2]) * mm; W[v * 2 + 1] = it ? it.w : 0;
            if (it) { A[v * 3] = ax; A[v * 3 + 1] = ay; A[v * 3 + 2] = az; B[v * 3] = bx; B[v * 3 + 1] = by; B[v * 3 + 2] = bz; Q[v * 4 + 2] = h; Q[v * 4 + 3] = (r * 0.371) % 1; C.set(it.col, v * 3); } }
          for (let k = 0; k < P; k++) { const i = r * P + k;
            pD[i * 2] += (pD[i * 2 + 1] - pD[i * 2]) * mm; pD[i * 2 + 1] = it ? it.d : 0;
            if (it) { pA[i * 3] = ax; pA[i * 3 + 1] = ay; pA[i * 3 + 2] = az; pB[i * 3] = bx; pB[i * 3 + 1] = by; pB[i * 3 + 2] = bz; pR[i * 4 + 2] = h; pR[i * 4 + 3] = 0.7 + Math.min(0.7, it.w / 8); pC.set(it.col, i * 3); } } }
        usados = tope; g.setDrawRange(0, tope * S * 6); pg.setDrawRange(0, tope * P);
        for (const k of ['position', 'aB', 'aP', 'aW', 'aC']) g.attributes[k].needsUpdate = true;
        for (const k of ['position', 'aB', 'aR', 'aD', 'aC']) pg.attributes[k].needsUpdate = true; }
    };
    return R;
  }

  /* ---------- etiquetas de vidrio (mismo estilo que las de los paneles y basura.js) ---------- */
  function cajaEtq() {
    if (caja) return caja;
    if (!document.getElementById('pares-css')) { const s = document.createElement('style'); s.id = 'pares-css'; s.textContent = `
#pares-etq{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
#pares-etq .pe{position:absolute;left:0;top:0;transform-origin:50% 100%;will-change:transform,opacity;white-space:nowrap;padding:5px 10px 6px;border-radius:10px;visibility:hidden;opacity:0;
  background:var(--ui-glass,linear-gradient(160deg,rgba(38,42,50,.55),rgba(8,10,14,.66)));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));
  -webkit-backdrop-filter:var(--ui-glass-fx,blur(14px));backdrop-filter:var(--ui-glass-fx,blur(14px));box-shadow:0 8px 22px rgba(0,0,0,.3);color:#eef1f2;
  font:400 11px/1.3 var(--ui-sans,Inter,system-ui,sans-serif)}
#pares-etq .pe b{display:flex;align-items:center;gap:6px;font-weight:600;font-size:11.5px;letter-spacing:.01em;color:#fff}
#pares-etq .pe b i{width:7px;height:7px;border-radius:50%;flex:none;background:var(--acc,#fff);box-shadow:0 0 6px var(--acc,#fff)}
#pares-etq .pe span{display:block;font-variant-numeric:tabular-nums;color:#c9d0d4}
#pares-etq .pe em{display:none;font:500 9px/1 var(--ui-mono,'JetBrains Mono',monospace);font-style:normal;letter-spacing:.16em;text-transform:uppercase;color:#9aa2a7;margin-bottom:4px}
#pares-etq .pe.big{padding:7px 12px 8px}
#pares-etq .pe.big em{display:block}
#pares-etq .pe.big b{font-size:19px;font-weight:600;color:var(--acc,#fff);font-variant-numeric:tabular-nums}
#pares-etq .pe.big b i{display:none}
#pares-etq .pe::after{content:'';position:absolute;left:50%;top:100%;width:1px;height:14px;background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,0))}
@media(max-width:760px){#pares-etq .pe{font-size:10px;padding:4px 8px}#pares-etq .pe b{font-size:10.5px}#pares-etq .pe.big b{font-size:15px}#pares-etq .pe.chica{display:none}}`; document.head.appendChild(s); }
    caja = document.createElement('div'); caja.id = 'pares-etq'; caja.setAttribute('aria-hidden', 'true'); document.body.appendChild(caja); return caja;
  }
  // lista: [{ id, x, y, z, t (título), s (detalle), acc (color), k (antetítulo: lectura grande), chica (se oculta en celular) }]
  function etiquetas(L, lista) {
    cajaEtq(); const m = L.m, prev = new Map(L.etq.map(e => [e.id, e]));
    // sin encimarse: se descarta la que cae a menos de 260 m de otra ya puesta (el orden de la lista es la prioridad)
    const ok = []; for (const it of lista) { if (!isFinite(it.x) || !isFinite(it.z)) continue; if (ok.some(o => (o.x - it.x) ** 2 + (o.z - it.z) ** 2 < 260 * 260)) continue; ok.push(it); } lista = ok;
    L.etq = lista.map(it => { let e = prev.get(it.id); prev.delete(it.id);
      if (!e) { const el = document.createElement('div'); el.className = 'pe'; el.innerHTML = '<em></em><b><i></i><u style="text-decoration:none"></u></b><span></span>'; caja.appendChild(el);
        e = { id: it.id, el, em: el.firstChild, u: el.children[1].lastChild, sp: el.lastChild, y0: it.y, y1: it.y, op: -1, sx: -1e9, sy: -1e9, sc: -1, cls: '', acc: '' }; }
      else { e.y0 += (e.y1 - e.y0) * m; e.y1 = it.y; }
      e.x = it.x; e.z = it.z;
      const cls = 'pe' + (it.k ? ' big' : '') + (it.chica ? ' chica' : ''); if (cls !== e.cls) { e.cls = cls; e.el.className = cls; }
      if (e.u.textContent !== it.t) e.u.textContent = it.t;
      const s = it.s || ''; if (e.sp.textContent !== s) { e.sp.textContent = s; e.sp.style.display = s ? '' : 'none'; }
      const k = it.k || ''; if (e.em.textContent !== k) e.em.textContent = k;
      if (it.acc !== e.acc) { e.acc = it.acc; e.el.style.setProperty('--acc', it.acc || '#fff'); }
      return e; });
    for (const e of prev.values()) e.el.remove();
  }
  function moverEtq(L) {
    if (!L.etq.length) return;
    const cam = T3.camera, Wd = innerWidth, Ht = innerHeight, cp = cam.position, mi = cam.matrixWorldInverse.elements, pm = cam.projectionMatrix.elements, m = L.m, vis = L.U.uK.value;
    for (const e of L.etq) {
      const x = e.x, y = e.y0 + (e.y1 - e.y0) * m, z = e.z;
      const vx = mi[0] * x + mi[4] * y + mi[8] * z + mi[12], vy = mi[1] * x + mi[5] * y + mi[9] * z + mi[13], vz = mi[2] * x + mi[6] * y + mi[10] * z + mi[14];
      const cw = pm[3] * vx + pm[7] * vy + pm[11] * vz + pm[15], cx = (pm[0] * vx + pm[4] * vy + pm[8] * vz + pm[12]) / cw, cy = (pm[1] * vx + pm[5] * vy + pm[9] * vz + pm[13]) / cw;
      const d = Math.hypot(x - cp.x, y - cp.y, z - cp.z);
      let op = vz < 0 && Math.abs(cx) < 1.05 && Math.abs(cy) < 1.05 ? Math.max(0, Math.min(1, (9000 - d) / 2500)) * vis : 0;
      op *= Math.max(0, Math.min(1, (1.05 - Math.abs(cx)) * 6)) * Math.max(0, Math.min(1, (1.05 - Math.abs(cy)) * 6));
      const sx = Math.round((cx * 0.5 + 0.5) * Wd), sy = Math.round((0.5 - cy * 0.5) * Ht - 14), sc = Math.round(Math.max(0.7, Math.min(1, 2200 / d)) * 100) / 100, o = Math.round(op * 50) / 50;
      if (o !== e.op) { e.op = o; e.el.style.opacity = String(o); e.el.style.visibility = o > 0 ? 'visible' : 'hidden'; }
      if (o > 0 && (sx !== e.sx || sy !== e.sy || sc !== e.sc)) { e.sx = sx; e.sy = sy; e.sc = sc; e.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-100%) scale(${sc})`; }
    }
  }

  /* ---------- armazón de una capa ---------- */
  function nuevaCapa(nombre) {
    const g = new THREE.Group(); g.name = nombre; g.visible = false; T3.scene.add(g);
    const L = { nombre, g, U: { uK: { value: 0 }, uMix: { value: 1 }, uT: { value: 0 } }, vis: 0, meta: 0, mix: 1, m: 1, etq: [], prims: [], mats: [], ref: {}, alMezclar: null, set: null };
    L.refMax = (k, v, min = 1e-6) => (L.ref[k] = Math.max(L.ref[k] || min, v || 0));
    CAPAS[nombre] = L; LISTA.push(L); return L;
  }
  const geoCil = (seg = 28) => new THREE.CylinderGeometry(1, 1, 1, seg, 1).translate(0, 0.5, 0);
  const geoCaja = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const geoPlano = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const geoAnillo = (a = 0.86) => new THREE.RingGeometry(a, 1, 72).rotateX(-Math.PI / 2);
  const cerca = (lista, x, z) => { let b = null, bd = Infinity; for (const n of lista) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = n; } } return b; };
  const centro = (lista) => { let x = 0, z = 0; for (const p of lista) { x += p.x; z += p.z; } return lista.length ? [x / lista.length, z / lista.length] : [2000, 900]; };

  /* ============ 01 · ABASTO ============ */
  function armarAbasto() {
    const L = nuevaCapa('abasto'), MAXN = 96, MAXR = 220;
    const cols = Inst(L, geoCil(), matSolido(L), MAXN, 4);
    const anillos = Inst(L, geoAnillo(0.8), matPlano(L, 'anillo'), MAXN, 3, { alfa: true });
    const arcos = Arcos(L, MAXR, { vel: 80 });
    L.set = (I) => {
      const A = I && I.abasto; if (!A) { cols.set([]); anillos.set([]); arcos.set([]); etiquetas(L, []); return; }
      const nodos = (A.nodos || []).filter(n => n && isFinite(n.x) && isFinite(n.z)).slice(0, MAXN);
      const tm = L.refMax('n', Math.max(0, ...nodos.map(n => num(n.t_dia))), 1);
      const lc = [], la = [], top = new Map();
      for (const n of nodos) { const t = Math.max(0, num(n.t_dia)), f = Math.sqrt(t / tm), act = n.activo !== false && t > 0;
        const r = 16 + 30 * f, h = act ? 16 + 300 * f : 9, c = act ? (COL[n.tipo] || COL.mercado) : COL.gris;
        lc.push({ x: n.x, y: Y0, z: n.z, s: [r, h, r], col: color(c, act ? 1 : 0.7) });
        la.push({ x: n.x, y: YV, z: n.z, s: [r * 2.1, 1, r * 2.1], col: color(c), al: act ? 0.75 : 0.18 });
        top.set(n, Y0 + h); }
      cols.set(lc); anillos.set(la);
      const rutas = (A.rutas || []).filter(r => r && r.de && r.a), tr = L.refMax('r', Math.max(0, ...rutas.map(r => num(r.t_dia))), 1);
      arcos.set(rutas.slice(0, MAXR).map(r => { const a = xz(r.de), b = xz(r.a), t = Math.max(0, num(r.t_dia)), f = Math.sqrt(t / tr), o = cerca(nodos, a[0], a[1]);
        return { a, b, w: t > 0 ? 1.1 + 5.5 * f : 0, d: t > 0 ? 0.12 + 0.88 * f : 0, col: color(o ? (COL[o.tipo] || COL.mercado) : COL.mercado), ya: 4, yb: 4 }; }));
      // lecturas: déficit sobre Corabastos (o el nodo mayor) y los tres nodos activos que más mueven
      const orden = nodos.slice().sort((p, q) => num(q.t_dia) - num(p.t_dia));
      const cora = nodos.find(n => n.tipo === 'corabastos') || orden[0], def = Math.max(0, Math.min(1, num(A.deficit)));
      const accD = def < 0.1 ? COL.huerta : def < 0.25 ? COL.medio : COL.mal, E = [];
      if (cora) E.push({ id: 'def', x: cora.x, z: cora.z, y: (top.get(cora) || Y0) + 30, k: 'Déficit de abasto', t: fmt(def * 100) + ' %', acc: accD,
        s: `${cora.n || NOMBRE_TIPO[cora.tipo] || 'Nodo'} · ${cora.activo === false ? 'sin operar' : fmt(num(cora.t_dia)) + ' t/día'}` });
      for (const n of orden.filter(n => n !== cora && n.activo !== false && num(n.t_dia) > 0).slice(0, 3))
        E.push({ id: 'n:' + (n.n || n.x + ',' + n.z), x: n.x, z: n.z, y: (top.get(n) || Y0) + 20, t: n.n || NOMBRE_TIPO[n.tipo] || 'Nodo', s: `${NOMBRE_TIPO[n.tipo] || ''} · ${fmt(num(n.t_dia))} t/día`, acc: COL[n.tipo] || COL.mercado, chica: true });
      const cerr = nodos.filter(n => n.activo === false);
      if (cerr.length) { const c = cerr[0]; E.push({ id: 'cerr', x: c.x, z: c.z, y: Y0 + 40, t: cerr.length === 1 ? (c.n || 'Nodo cerrado') : `${cerr.length} nodos sin operar`, s: cerr.length === 1 ? 'sin operar' : (c.n || '') + (cerr.length > 1 ? ' y otros' : ''), acc: COL.gris, chica: true }); }
      etiquetas(L, E);
    };
    return L;
  }

  /* ============ 03 · RESIDUOS ============ */
  function armarResiduos() {
    const L = nuevaCapa('residuos'), MAXE = 32, MAXR = 240;
    const est = Inst(L, geoCil(40), matSolido(L), MAXE, 4);
    const tapa = Inst(L, geoCil(40), matSolido(L), MAXE, 4);
    const lleno = Inst(L, geoCil(24), matSolido(L), MAXE, 4);
    const tubo = Inst(L, geoCil(24), matVidrio(L), MAXE, 5);
    const rebose = Inst(L, geoAnillo(0.93), matPlano(L, 'anillo'), MAXE, 3, { alfa: true }), mancha = Inst(L, new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2), matPlano(L, 'anillo'), MAXE, 2, { alfa: true });
    const base = Inst(L, geoAnillo(0.9), matPlano(L, 'anillo'), MAXE, 3, { alfa: true });
    const arcos = Arcos(L, MAXR, { vel: 60 });
    const HG = 110, OFF = 70;
    L.set = (I) => {
      const ES = ((I && I.estaciones) || []).filter(e => e && isFinite(e.x) && isFinite(e.z)).slice(0, MAXE);
      const ra = L.refMax('acum', Math.max(0, ...ES.map(e => num(e.acumulado_t))), 500);
      const le = [], lt = [], ll = [], lu = [], lr = [], lm = [], lb = [], E = [];
      ES.sort((a, b) => (b.tipo === 'relleno') - (a.tipo === 'relleno') || num(b.acumulado_t) - num(a.acumulado_t) || num(b.cap_t_dia) - num(a.cap_t_dia));
      for (const e of ES) { const cap = Math.max(1e-6, num(e.cap_t_dia)), tr = Math.max(0, num(e.tratado_t_dia)), f = Math.min(1, tr / cap), ac = Math.max(0, num(e.acumulado_t));
        const c = ac > 1 && f >= 0.98 ? COL.mal : f > 0.85 ? COL.medio : COL.ok;
        const rel = e.tipo === 'relleno';
        le.push({ x: e.x, y: Y0, z: e.z, s: rel ? [90, 14, 90] : [46, 24, 46], col: color(rel ? '#8a7a66' : COL.estacion, 0.9) });
        lt.push({ x: e.x, y: Y0 + (rel ? 14 : 24), z: e.z, s: rel ? [0, 0, 0] : [34, 3, 34], col: color(COL.ok, 0.55) });
        ll.push({ x: e.x + OFF, y: Y0, z: e.z, s: [17, Math.max(2, HG * f), 17], col: color(c) });
        lu.push({ x: e.x + OFF, y: Y0, z: e.z, s: [22, HG, 22], col: color(COL.vidrio) });
        const ro = ac > 1 ? 70 + 300 * Math.sqrt(ac / ra) : 70;
        lr.push({ x: e.x, y: YV, z: e.z, s: [ro, 1, ro], col: color(COL.mal), al: ac > 1 ? 0.75 : 0, pul: true });
        lm.push({ x: e.x, y: YV - 0.2, z: e.z, s: [ro, 1, ro], col: color(COL.mal), al: ac > 1 ? 0.1 : 0 });
        lb.push({ x: e.x, y: YV, z: e.z, s: [62, 1, 62], col: color(COL.ok), al: 0.55 });
        E.push({ id: 'e:' + (e.n || e.x + ',' + e.z), x: e.x + OFF / 2, z: e.z, y: Y0 + HG + 24, t: e.n || 'Estación Circular', acc: c, chica: E.length >= 4,
          s: `${fmt(tr, tr < 10 ? 1 : 0)} de ${fmt(cap, cap < 10 ? 1 : 0)} t/día tratadas` + (ac > 1 ? ` · ${fmt(ac)} t acumuladas` : '') }); }
      est.set(le); tapa.set(lt); lleno.set(ll); tubo.set(lu); rebose.set(lr); mancha.set(lm); base.set(lb);
      const RC = ((I && I.recorridos) || []).filter(r => r && r.de && r.a), tm = L.refMax('r', Math.max(0, ...RC.map(r => num(r.t_dia))), 1);
      arcos.set(RC.slice(0, MAXR).map(r => { const t = Math.max(0, num(r.t_dia)), f = Math.sqrt(t / tm);
        return { a: xz(r.de), b: xz(r.a), w: t > 0 ? 1.6 + 4.4 * f : 0, d: t > 0 ? 0.25 + 0.75 * f : 0, col: color(COL.residuo), hk: 0.8 }; }));
      etiquetas(L, E.slice(0, 10));
    };
    return L;
  }

  /* ============ 04 · BIODIVERSIDAD ============ */
  function armarBio() {
    const L = nuevaCapa('biodiversidad'), MAXF = 40, MAXD = 80, MAXT = 8000, ANCHO = 44;
    // parche perdido: disco rayado gris con borde discontinuo
    const disco = new THREE.Mesh(new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: { uK: L.U.uK, uR: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      vertexShader: 'varying vec2 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uK, uR; varying vec2 vW; varying vec2 vUv; void main(){ vec2 q = (vUv - 0.5) * 2.0; float rr = length(q);
        float raya = smoothstep(0.42, 0.58, abs(fract((vW.x + vW.y) / 26.0) - 0.5) * 2.0);
        float px = 16.0 / max(uR, 1.0), borde = smoothstep(1.0 - px * 1.2, 1.0 - px, rr) * (1.0 - smoothstep(1.0 - px * 0.1, 1.0, rr));
        float dash = step(0.35, fract(atan(q.y, q.x) * uR / 60.0));
        vec3 c = mix(vec3(0.74, 0.75, 0.76), vec3(0.1, 0.11, 0.12), raya); float a = mix(0.5, 0.82, raya);
        c = mix(c, vec3(0.878, 0.478, 0.373), borde * dash); a = max(a, borde * dash * 0.95);
        gl_FragColor = vec4(c, a * uK); }` }));
    disco.renderOrder = 2; disco.frustumCulled = false; disco.visible = false; L.g.add(disco);
    let r0 = 0, r1 = 0;
    // corredores: franja verde que crece con su fase
    const cMat = new THREE.ShaderMaterial({ uniforms: { uK: L.U.uK, uMix: L.U.uMix, uT: L.U.uT }, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      vertexShader: 'attribute vec4 aU; varying vec4 vU; varying float vF; uniform float uMix; void main(){ vU = aU; vF = mix(aU.z, aU.w, uMix); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uK, uT; varying vec4 vU; varying float vF; void main(){ float u = vU.x, s = abs(vU.y);
        float on = 1.0 - smoothstep(vF - 0.004, vF + 0.004, u); float resto = 1.0 - on;
        float tip = exp(-abs(u - vF) * 60.0) * step(0.001, vF) * step(vF, 0.999);
        float veta = 0.5 + 0.5 * sin(u * 900.0 + s * 9.0);
        vec3 c = mix(vec3(0.17, 0.52, 0.27), vec3(0.42, 0.82, 0.45), smoothstep(0.55, 1.0, s) * 0.8 + veta * 0.15);
        c = mix(c, vec3(0.85, 1.0, 0.7), tip * 0.8);
        float a = on * (0.62 + 0.25 * smoothstep(0.7, 1.0, s)) + resto * 0.14 * step(0.5, fract(u * 160.0)) * (1.0 - smoothstep(0.8, 1.0, s)) + tip * 0.4;
        gl_FragColor = vec4(resto > 0.5 ? vec3(0.55, 0.75, 0.55) : c, a * uK); }` });
    const cGeo = new THREE.BufferGeometry(); const cinta = new THREE.Mesh(cGeo, cMat); cinta.renderOrder = 3; cinta.frustumCulled = false; L.g.add(cinta);
    // copas a lo largo de los corredores (aparecen cuando la fase las alcanza)
    const tGeo = new THREE.IcosahedronGeometry(1, 1).scale(1, 0.85, 1);
    const aTU = new THREE.InstancedBufferAttribute(new Float32Array(MAXT * 3), 3); tGeo.setAttribute('aTU', aTU);
    const tMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, transparent: true, opacity: 0 }); tMat.userData.op = 1; L.mats.push(tMat);
    tMat.onBeforeCompile = (s) => { s.uniforms.uMix = L.U.uMix;
      s.vertexShader = 'attribute vec3 aTU; uniform float uMix;\n' + s.vertexShader.replace('#include <begin_vertex>', 'float fT = mix(aTU.y, aTU.z, uMix); float kAp = clamp((fT - aTU.x) * 40.0, 0.0, 1.0);\nvec3 transformed = vec3(position) * kAp;');
      s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance += vColor * 0.18;\n#endif'); };
    const copas = new THREE.InstancedMesh(tGeo, tMat, MAXT); copas.count = 0; copas.frustumCulled = false; copas.renderOrder = 4;
    copas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXT * 3), 3); L.g.add(copas);
    let clave = '', corrU = [], vCorr = [];
    const fases = new Float32Array(64 * 2);
    function geoCorredores(CS) {
      const pos = [], au = [], ind = []; let base = 0, nt = 0; corrU = []; vCorr = [];
      const M = new THREE.Matrix4(), col = new THREE.Color(); let semilla = 7; const rnd = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
      CS.forEach((c, ci) => { const P = (c.puntos || []).map(xz).filter(p => p && isFinite(p[0]) && isFinite(p[1])); if (P.length < 2) { corrU.push(null); return; }
        const d = [0]; for (let i = 1; i < P.length; i++) d.push(d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const Lt = Math.max(1, d[d.length - 1]);
        for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
          for (const s of [-1, 1]) { pos.push(P[i][0] - tz * s * ANCHO / 2, YV + 0.5, P[i][1] + tx * s * ANCHO / 2); au.push(d[i] / Lt, s, 0, 0); vCorr.push(ci); } }
        for (let i = 0; i < P.length - 1; i++) { const a = base + i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        base += P.length * 2;
        // copas sueltas a lo largo de la franja (separación y tamaño irregulares, verdes oscuros naturales)
        const t0 = nt;
        for (let s = 6; s < Lt && nt < MAXT; s += 9 + rnd() * 10) { let i = 1; while (i < d.length - 1 && d[i] < s) i++; const k = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]);
          const x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, z = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k, tx = (P[i][0] - P[i - 1][0]) / Math.max(1e-6, d[i] - d[i - 1]), tz = (P[i][1] - P[i - 1][1]) / Math.max(1e-6, d[i] - d[i - 1]);
          const o = (rnd() * 2 - 1) * ANCHO * 0.42, r = 3.2 + rnd() * rnd() * 5.5;
          M.makeScale(r, r * (0.8 + rnd() * 0.5), r).setPosition(x - tz * o, Y0 + r * 1.15 + 2, z + tx * o); copas.setMatrixAt(nt, M);
          col.setHSL(0.24 + rnd() * 0.1, 0.3 + rnd() * 0.22, 0.15 + rnd() * 0.12); copas.setColorAt(nt, col); aTU.array[nt * 3] = s / Lt; nt++; }
        corrU.push([t0, nt]); });
      cGeo.dispose(); cGeo.deleteAttribute('position'); cGeo.deleteAttribute('aU');
      cGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cGeo.setAttribute('aU', new THREE.Float32BufferAttribute(au, 4)); cGeo.setIndex(ind);
      cGeo.attributes.position.needsUpdate = true;
      copas.count = nt; copas.instanceMatrix.needsUpdate = true; copas.instanceColor.needsUpdate = true; aTU.needsUpdate = true;
      fases.fill(0);
    }
    const refu = Inst(L, geoCil(6), matSolido(L), MAXF, 4), refuA = Inst(L, geoAnillo(0.84), matPlano(L, 'anillo'), MAXF, 3, { alfa: true });
    const arcos = Arcos(L, MAXD, { vel: 55, P: 10 });
    L.alMezclar = (m) => { disco.scale.setScalar(Math.max(1e-3, r0 + (r1 - r0) * m)); disco.material.uniforms.uR.value = disco.scale.x; disco.visible = disco.scale.x > 1; };
    L.set = (I) => {
      const m = L.m, E = [];
      // parche perdido
      const F = I && I.fragmento; r0 = r0 + (r1 - r0) * m;
      if (F && isFinite(F.x) && isFinite(F.z)) { r1 = Math.max(90, Math.sqrt(Math.max(0, num(F.haPerdidas)) * 1e4 / Math.PI)); disco.position.set(F.x, YV, F.z);
        E.push({ id: 'frag', x: F.x, z: F.z, y: YV + 150, k: 'Corredor verde perdido', t: F.nombre || F.parche || 'Corredor verde', acc: COL.perdido,
          s: `${fmt(num(F.haPerdidas), num(F.haPerdidas) < 10 ? 1 : 0)} ha perdidas` + (F.desde != null ? ` · desde la semana ${fmt(num(F.desde))}` : '') }); }
      else r1 = 0;
      L.alMezclar(0);
      // corredores
      const CS = ((I && I.corredores) || []).slice(0, 64);
      const k = CS.map(c => { const p = c.puntos || []; return p.length + ':' + (p[0] ? xz(p[0]).join(',') : '') + ':' + (p.length ? xz(p[p.length - 1]).join(',') : ''); }).join('|');
      if (k !== clave) { clave = k; geoCorredores(CS); }
      const au = cGeo.attributes.aU;
      CS.forEach((c, ci) => { const f = Math.max(0, Math.min(1, num(c.fase))); fases[ci * 2] += (fases[ci * 2 + 1] - fases[ci * 2]) * m; fases[ci * 2 + 1] = f; });
      if (au) { const a = au.array; // aU = (u a lo largo, lado, fase antes, fase ahora)
        for (let v = 0; v < vCorr.length; v++) { const ci = vCorr[v]; a[v * 4 + 2] = fases[ci * 2]; a[v * 4 + 3] = fases[ci * 2 + 1]; }
        au.needsUpdate = true; }
      for (let ci = 0; ci < corrU.length; ci++) { const rg = corrU[ci]; if (!rg) continue; for (let t = rg[0]; t < rg[1]; t++) { aTU.array[t * 3 + 1] = fases[ci * 2]; aTU.array[t * 3 + 2] = fases[ci * 2 + 1]; } }
      aTU.needsUpdate = true;
      const cmax = CS.reduce((b, c, i) => (num(c.fase) > (b ? num(b.fase) : -1) ? c : b), null);
      if (cmax && num(cmax.fase) > 0.02) { const P = (cmax.puntos || []).map(xz), j = Math.min(P.length - 1, Math.floor((P.length - 1) * Math.min(1, num(cmax.fase)) * 0.5));
        if (P[j]) E.push({ id: 'corr', x: P[j][0], z: P[j][1], y: YV + 40, t: CS.length > 1 ? `${CS.length} corredores ecológicos` : 'Corredor ecológico', acc: COL.verde,
          s: `${fmt(CS.reduce((s, c) => s + Math.min(1, num(c.fase)), 0) / Math.max(1, CS.length) * 100)} % construidos` }); }
      // refugios
      const RF = ((I && I.refugios) || []).filter(r => r && isFinite(r.x) && isFinite(r.z)).slice(0, MAXF);
      refu.set(RF.map(r => ({ x: r.x, y: Y0, z: r.z, s: [20, 46, 20], col: color(COL.verde) })));
      refuA.set(RF.map(r => ({ x: r.x, y: YV, z: r.z, s: [64, 1, 64], col: color(COL.verde), al: 0.7 })));
      RF.slice(0, 4).forEach((r, i) => E.push({ id: 'rf:' + (r.n || i), x: r.x, z: r.z, y: Y0 + 70, t: typeof r.n === 'string' ? r.n : 'Refugio de fauna', s: typeof r.n === 'number' ? `${fmt(r.n)} especies` : 'refugio', acc: COL.verde, chica: true }));
      // desplazamientos de especies
      const DS = ((I && I.desplazamientos) || []).filter(d => d && d.de && d.a).slice(0, MAXD);
      arcos.set(DS.map(d => ({ a: xz(d.de), b: xz(d.a), w: 2, d: 0.55, col: color(COL.especie), hk: 1.5, ya: 6, yb: 6 })));
      const vistos = new Set();
      for (const d of DS) { if (vistos.size >= 3) break; if (vistos.has(d.especie)) continue; vistos.add(d.especie); const b = xz(d.a);
        E.push({ id: 'sp:' + d.especie, x: b[0], z: b[1], y: YV + 30, t: d.especie || 'Especie', s: 'se desplaza', acc: COL.especie, chica: true }); }
      etiquetas(L, E);
    };
    return L;
  }

  /* ============ 05 · SUELO ============ */
  function armarSuelo() {
    const L = nuevaCapa('suelo'), MAXZ = 480, MAXP = 80;
    const celdas = Inst(L, geoPlano(), matPlano(L, 'celda'), MAXZ, 2, { alfa: true });
    const cols = Inst(L, geoCil(16), matSolido(L), MAXZ, 4);
    const prot = Inst(L, geoAnillo(0.82), matPlano(L, 'anillo'), MAXP, 3, { alfa: true }), pres = Inst(L, geoAnillo(0.9), matPlano(L, 'anillo'), MAXZ, 3, { alfa: true });
    // ícono de espacio protegido (hoja dentro de un círculo verde), un solo dibujo para todos
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const q = cv.getContext('2d');
    q.fillStyle = '#7ddc8a'; q.beginPath(); q.arc(48, 48, 40, 0, 7); q.fill(); q.lineWidth = 5; q.strokeStyle = 'rgba(10,20,12,.85)'; q.stroke();
    q.fillStyle = '#0d1a10'; q.beginPath(); q.moveTo(30, 66); q.bezierCurveTo(26, 36, 50, 24, 70, 26); q.bezierCurveTo(72, 48, 60, 70, 30, 66); q.fill();
    q.strokeStyle = '#7ddc8a'; q.lineWidth = 3.5; q.beginPath(); q.moveTo(30, 66); q.quadraticCurveTo(46, 50, 62, 34); q.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const ip = new Float32Array(MAXP * 3), ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.BufferAttribute(ip, 3)); ig.setDrawRange(0, 0);
    const icon = new THREE.Points(ig, new THREE.ShaderMaterial({ uniforms: { uK: L.U.uK, uMap: { value: tex }, uPR: PR }, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      vertexShader: 'uniform float uPR; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 22.0 * uPR; }',
      fragmentShader: 'uniform sampler2D uMap; uniform float uK; void main(){ vec4 c = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)); gl_FragColor = vec4(c.rgb, c.a * uK); }' }));
    icon.renderOrder = 9; icon.frustumCulled = false; L.g.add(icon);
    const AL = { permanece: 0.13, cambia: 0.3, desplazada: 0.4 };
    L.set = (I) => {
      const S = I && I.suelo, Z = ((S && S.zonas) || []).filter(z => z && isFinite(z.x) && isFinite(z.z)).slice(0, MAXZ);
      const pm = L.refMax('p', Math.max(0, ...Z.map(z => num(z.presion))), 1);
      // lado de la celda: 0,9 × la mediana de la distancia al vecino más cercano (zonas de 500 m o centros de barrio)
      const dv = Z.map(a => { let b = Infinity; for (const o of Z) if (o !== a) b = Math.min(b, Math.max(Math.abs(o.x - a.x), Math.abs(o.z - a.z))); return b; }).filter(isFinite).sort((a, b) => a - b);
      const LADO = Math.max(160, Math.min(520, (dv.length ? dv[dv.length >> 1] : 500) * 0.92));
      celdas.set(Z.map(z => ({ x: z.x, y: YV - 0.4, z: z.z, s: [LADO, 1, LADO], col: color(COL[z.estado] || COL.permanece), al: AL[z.estado] != null ? AL[z.estado] : 0.13 })));
      // anillo de presión en todas las celdas (también en las que permanecen): radio ∝ presión
      pres.set(Z.map(z => { const p = Math.max(0, num(z.presion)) / pm; return { x: z.x, y: YV, z: z.z, s: [Math.max(1, LADO * 0.44 * p), 1, Math.max(1, LADO * 0.44 * p)], col: color(COL[z.estado] || COL.permanece), al: p > 0.02 ? 0.8 : 0 }; }));
      cols.set(Z.map(z => { const p = Math.max(0, num(z.presion)) / pm, c = COL[z.estado] || COL.permanece; const pe = z.estado === 'permanece' || !COL[z.estado]; return { x: z.x, y: Y0, z: z.z, s: pe ? [0, 0, 0] : [18, 8 + 320 * p, 18], col: color(c) }; }));
      const PR_ = ((S && S.protegidos) || []).filter(p => p && isFinite(p.x) && isFinite(p.z)).slice(0, MAXP);
      prot.set(PR_.map(p => ({ x: p.x, y: YV, z: p.z, s: [110, 1, 110], col: color(COL.protegido), al: 0.85 })));
      PR_.forEach((p, i) => { ip[i * 3] = p.x; ip[i * 3 + 1] = YV + 30; ip[i * 3 + 2] = p.z; }); ig.setDrawRange(0, PR_.length); ig.attributes.position.needsUpdate = true;
      const E = [], nD = Z.filter(z => z.estado === 'desplazada').length, nC = Z.filter(z => z.estado === 'cambia').length;
      if (Z.length) { const top = Z.slice().sort((a, b) => num(b.presion) - num(a.presion)); const t0 = top[0];
        E.push({ id: 'res', x: t0.x, z: t0.z, y: Y0 + 8 + 320 * Math.max(0, num(t0.presion)) / pm + 30, k: 'Presión sobre el suelo', t: `${fmt(nD)} desplazadas`, acc: nD ? COL.desplazada : COL.permanece,
          s: `${fmt(nC)} cambian de uso · ${fmt(PR_.length)} espacios protegidos` });
        for (const z of top.slice(1).filter(z => z.estado !== 'permanece').slice(0, 2))
          E.push({ id: 'z:' + z.x + ',' + z.z, x: z.x, z: z.z, y: Y0 + 8 + 320 * Math.max(0, num(z.presion)) / pm + 20, t: z.estado === 'desplazada' ? 'Hogares desplazados' : 'Cambia de uso', acc: COL[z.estado], chica: true,
            s: `${z.uso ? z.uso + ' · ' : ''}presión ${fmt(num(z.presion) * (pm <= 1.0001 ? 100 : 1))}${pm <= 1.0001 ? ' %' : ''}` }); }
      PR_.slice(0, 3).forEach((p, i) => E.push({ id: 'p:' + (p.n || i), x: p.x, z: p.z, y: YV + 60, t: p.n || 'Espacio protegido', s: 'protegido', acc: COL.protegido, chica: true }));
      etiquetas(L, E);
    };
    return L;
  }

  /* ============ 06 · GOBERNANZA ============ */
  function armarGob() {
    const L = nuevaCapa('gobernanza'), MAXB = 64, MAXA = 120, MAXQ = 80, H = 300;
    const necesita = Inst(L, geoCil(28), matVidrio(L), MAXB, 5), recibe = Inst(L, geoCil(28), matSolido(L), MAXB, 4);
    const prio = Inst(L, geoAnillo(0.93), matPlano(L, 'anillo'), MAXB, 3, { alfa: true });
    const asam = Inst(L, geoCil(20), matSolido(L), MAXA, 4), hub = Inst(L, geoCil(36), matSolido(L), 2, 4), hubA = Inst(L, geoAnillo(0.9), matPlano(L, 'anillo'), 2, 3, { alfa: true });
    const equip = Inst(L, geoCaja(), matSolido(L), MAXQ, 4);
    const arcos = Arcos(L, MAXA * 2 + MAXB, { vel: 60, P: 14 });
    L.set = (I) => {
      const G = I && I.gobernanza;
      const B = ((G && G.barrios) || []).filter(b => b && isFinite(b.x) && isFinite(b.z)).slice(0, MAXB);
      const AS = ((G && G.asambleas) || []).filter(a => a && isFinite(a.x) && isFinite(a.z)).slice(0, MAXA), con = AS.some(a => a.activa !== false); // sin propuesta: no hay asambleas o ninguna decide
      const nm = L.refMax('n', Math.max(0, ...B.map(b => Math.max(num(b.necesidad), num(b.asignado)))), 1), pr = Math.max(1, ...B.map(b => num(b.prioridad)));
      // prioridad: si son rangos enteros (1 = primero) se invierte; si es 0–1, se usa tal cual
      const rango = B.length > 0 && B.every(b => Number.isInteger(b.prioridad) && b.prioridad >= 1), peso = (b) => (rango ? (pr - num(b.prioridad) + 1) / pr : num(b.prioridad) / pr);
      const cob = (b) => num(b.asignado) / Math.max(1e-6, num(b.necesidad)), cc = (f) => (f >= 0.95 ? COL.huerta : f >= 0.7 ? COL.medio : COL.mal);
      necesita.set(B.map(b => ({ x: b.x, y: Y0, z: b.z, s: [42, Math.max(4, H * num(b.necesidad) / nm), 42], col: color('#d5dde2') })));
      recibe.set(B.map(b => ({ x: b.x, y: Y0, z: b.z, s: [33, Math.max(2, H * num(b.asignado) / nm), 33], col: color(cc(cob(b))) })));
      prio.set(B.map(b => ({ x: b.x, y: YV, z: b.z, s: [76, 1, 76], col: color('#ffffff'), al: 0.08 + 0.45 * peso(b) })));
      const [hx, hz] = con ? centro(AS) : centro(B), hc = con ? COL.oro : COL.central, hH = con ? 150 : 230;
      hub.set([{ x: hx, y: Y0, z: hz, s: [con ? 44 : 52, hH, con ? 44 : 52], col: color(hc) }]);
      hubA.set([{ x: hx, y: YV, z: hz, s: [150, 1, 150], col: color(hc), al: 0.8, pul: true }]);
      asam.set(AS.map(a => ({ x: a.x, y: Y0, z: a.z, s: [17, a.activa === false ? 10 : 36, 17], col: color(a.activa === false ? COL.gris : COL.oro, a.activa === false ? 0.7 : 1) })));
      const am = L.refMax('a', Math.max(0, ...B.map(b => num(b.asignado))), 1), R = [];
      if (con) {
        for (const a of AS) R.push({ a: [a.x, a.z], b: [hx, hz], w: a.activa === false ? 0 : 1.8, d: a.activa === false ? 0 : 0.35, col: color(COL.oro), ya: 36, yb: hH, hk: 0.7 });
        for (const a of AS) { let o = null, od = Infinity; for (const b of AS) { if (b === a) continue; const d = (a.x - b.x) ** 2 + (a.z - b.z) ** 2; if (d < od) { od = d; o = b; } }
          if (o) R.push({ a: [a.x, a.z], b: [o.x, o.z], w: a.activa === false || o.activa === false ? 0 : 1, d: 0, col: color(COL.oro, 0.8), ya: 36, yb: 36, hk: 0.5 }); }
        for (const b of B) { const f = num(b.asignado) / am; R.push({ a: [hx, hz], b: [b.x, b.z], w: f > 0 ? 0.8 + 2.4 * f : 0, d: f > 0 ? 0.15 + 0.6 * f : 0, col: color(COL.flujo), ya: hH, yb: 10, hk: 0.6 }); }
      } else {
        for (const b of B) { const f = num(b.asignado) / am; R.push({ a: [hx, hz], b: [b.x, b.z], w: f > 0 ? 1 + 3.5 * f : 0.6, d: f > 0 ? 0.15 + 0.7 * f : 0, col: color(COL.central), ya: hH, yb: 10, hk: 0.8 }); }
      }
      arcos.set(R);
      const EQ = ((G && G.equipamientos) || []).filter(e => e && isFinite(e.x) && isFinite(e.z)).slice(0, MAXQ);
      equip.set(EQ.map(e => ({ x: e.x, y: Y0, z: e.z, s: [38, 28, 38], col: color(EQUIP[String(e.tipo || '').toLowerCase()] || '#e0e0e0') })));
      // lecturas
      const eq = Math.max(0, Math.min(1, num(G && G.equidad))), dec = G ? (Array.isArray(G.decisiones) ? G.decisiones.length : num(G.decisiones)) : 0, act = AS.filter(a => a.activa !== false).length, E = [];
      if (G) E.push({ id: 'eq', x: hx, z: hz, y: Y0 + hH + 30, k: 'Equidad en la asignación', t: fmt(eq, 2), acc: eq >= 0.75 ? COL.huerta : eq >= 0.5 ? COL.medio : COL.mal,
        s: con ? `Federación de asambleas · ${fmt(act)} de ${fmt(AS.length)} activas · ${fmt(dec)} decisiones` : (AS.length ? `Coordinación central · ${fmt(AS.length)} juntas sin decisión` : 'Coordinación central · sin asambleas barriales') });
      for (const b of B.slice().sort((p, q) => peso(q) - peso(p)).slice(0, 3))
        E.push({ id: 'b:' + (b.n || b.x), x: b.x, z: b.z, y: Y0 + Math.max(H * num(b.necesidad), H * num(b.asignado)) / nm + 24, t: b.n || 'Barrio', acc: cc(cob(b)), chica: true,
          s: `recibe ${fmt(Math.min(999, cob(b) * 100))} % de lo que necesita` + (rango ? ` · prioridad ${b.prioridad}` : '') });
      if (EQ.length) { const e = EQ[EQ.length - 1]; E.push({ id: 'eqp', x: e.x, z: e.z, y: Y0 + 60, t: `${fmt(EQ.length)} equipamientos habilitados`, s: e.n || e.tipo || '', acc: EQUIP[String(e.tipo || '').toLowerCase()] || '#e0e0e0', chica: true }); }
      etiquetas(L, E);
    };
    return L;
  }

  const ARMAR = { abasto: armarAbasto, residuos: armarResiduos, biodiversidad: armarBio, suelo: armarSuelo, gobernanza: armarGob };

  /* ---------- un cuadro ---------- */
  function cuadro(info) {
    let alguna = false; for (let i = 0; i < LISTA.length; i++) if (LISTA[i].vis > 0 || LISTA[i].meta > 0) { alguna = true; break; }
    if (!alguna) return;
    const dt = info && info.dtReal ? info.dtReal : 0.016, tA = (info && info.tAnim) || RELOJ.tAnim || 0;
    T3.renderer.getSize(RES.value); PR.value = T3.renderer.getPixelRatio();
    for (let i = 0; i < LISTA.length; i++) { const L = LISTA[i];
      if (L.vis === 0 && L.meta === 0) continue;
      if (L.vis !== L.meta) { L.vis = L.meta > L.vis ? Math.min(L.meta, L.vis + dt / FADE) : Math.max(L.meta, L.vis - dt / FADE); const k = suave(L.vis); L.U.uK.value = k;
        for (const m of L.mats) m.opacity = m.userData.op * k;
        L.g.visible = L.vis > 0.001; if (!L.g.visible) { for (const e of L.etq) if (e.op !== 0) { e.op = 0; e.el.style.opacity = '0'; e.el.style.visibility = 'hidden'; } continue; } }
      if (L.mix < 1) { L.mix = Math.min(1, L.mix + dt / DUR); L.m = suave(L.mix); L.U.uMix.value = L.m; for (const p of L.prims) p.upd(L.m); if (L.alMezclar) L.alMezclar(L.m); }
      L.U.uT.value = tA;
      moverEtq(L);
    }
  }
  RELOJ.alDibujar(cuadro);

  const API = {
    _T3: T3, _cuadro: cuadro,
    get capa() { return actual; },
    poner(capa, I) {
      if (!ARMAR[capa]) { API.quitar(); return false; }
      const L = CAPAS[capa] || ARMAR[capa]();
      try { L.set(I || {}); } catch (e) { console.warn('KEN_PARES · ' + capa + ':', e); }
      L.mix = 0; L.m = 0; L.U.uMix.value = 0; for (const p of L.prims) p.upd(0); if (L.alMezclar) L.alMezclar(0);
      L.meta = 1; actual = capa;
      for (const o of LISTA) if (o !== L) o.meta = 0;
      return true;
    },
    quitar() { for (const o of LISTA) o.meta = 0; actual = null; }
  };
  window.KEN_PARES = API;
  return API;
}
