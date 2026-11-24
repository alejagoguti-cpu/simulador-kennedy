/* ============ PLAN PARCIAL BAVARIA FÁBRICA en 3D, como está aprobado, construido por años (escenario D) ============
   Datos: data3d/plan_bavaria.json (tools/plan_bavaria_real.py), calcado del plano oficial de la modificación aprobada por el
   Decreto Distrital 448 de 2023 (SDP, plano 1/2 «Propuesta general», 1:2500, y plano 2/2 «Etapas de desarrollo»):
   - 22 manzanas (MZ-01 a MZ-22: comercio, múltiple, vivienda VIS, VIP y tipo 4, dotacional), 2 equipamientos (EQ-01, EQ-02)
   - parques CP-01 a CP-10 (CP-01, el parque central de 5,6 ha) y el bosque que se conserva (CAPRP-01 a 05, «zona de arbolado denso y continuo»)
   - vías (calzada y andén) y alamedas: el espacio que queda entre manzanas, parques y bosque, como en el plano
   Cada cosa se construye en su año (1–10): las vías y el andén aparecen al empezar el año, los edificios suben piso a piso durante el año
   (obra gris) y al terminar toman su material; los árboles nuevos de andenes y alamedas se siembran cuando termina la manzana.
   Supuestos (el decreto no los fija): alturas por tipo (VIS/VIP 12 pisos, tipo 4 10, múltiple 8, comercio y equipamiento 4) y el orden
   por años dentro de cada etapa. Se ve solo cuando el escenario activo es el del plan parcial (window.KEN_PLANBAV.ver). */
import { RELOJ } from './reloj.js?v=5';

export async function iniciarPlanBavaria({ T3 }) {
  const THREE = T3.THREE, P = await (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/plan_bavaria.json?v=2');
  const PISO = 3.0, ETAPAS = 10;
  const W = (p) => T3.lw(p[0], p[1]); // modelo (x este, y norte) -> mundo (x, z)
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const forma = (q) => { const s = new THREE.Shape(q.o.map(p => { const w = W(p); return new THREE.Vector2(w[0], -w[1]); }));
    for (const h of q.h || []) s.holes.push(new THREE.Path(h.map(p => { const w = W(p); return new THREE.Vector2(w[0], -w[1]); }))); return s; };

  /* edificios resaltados en AMARILLO SUAVE (pedido de la autora: «resalta los edificios como en un amarillo suave»), con un poco de luz
     propia para que se despeguen del suelo oscuro; en obra, el mismo amarillo más apagado */
  const AMA = (c, e, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r, emissive: e, emissiveIntensity: 1 });
  const mats = {
    ladrillo: AMA(0xf1dd9c, 0x2a2208, 0.85),
    blanco: AMA(0xf6e7b4, 0x2a2208, 0.7),
    vidrio: AMA(0xeedfae, 0x241e08, 0.5),
    obra: AMA(0xc9bd93, 0x16130a, 0.9)
  };
  /* fachada dibujada en la tarjeta gráfica (sin texturas): ventanas por piso (3 m) y por módulo (3,3 m), placa de entrepiso, primer piso
     de locales con vidrio corrido y cubierta gris. De lejos se promedia (sin moiré). Ladrillo con variación de tono por tramo.
     En obra: losas a la vista y vanos abiertos (oscuros), sin vidrio. */
  const uY0 = { value: 0.3 };
  const fachada = (m, tipo) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uY0 = uY0;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vIH;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vIH = fract(sin(dot(floor(vWP.xz / 22.0), vec2(12.9898, 78.233))) * 43758.5453); // tono por tramo de edificio`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying float vIH; uniform float uY0;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float gWin = 0.0;
          { vec3 n = normalize(vWN); float yy = vWP.y - uY0;
            ${tipo === 'ladrillo' ? 'diffuseColor.rgb *= 0.86 + 0.24 * vIH;' : 'diffuseColor.rgb *= 0.95 + 0.07 * vIH;'}
            if (n.y > 0.5) { diffuseColor.rgb *= 0.9 + 0.06 * vIH; } /* cubierta: el mismo amarillo suave (desde arriba es lo que más se ve) */
            else if (n.y > -0.5) {
              vec2 tg = normalize(vec2(-n.z, n.x)); float hh = dot(vWP.xz, tg);
              float bay = hh / 3.3, fl = yy / 3.0; vec2 w = fwidth(vec2(bay, fl)); float fx = fract(bay), fy = fract(fl);
              float lod = 1.0 - smoothstep(0.25, 0.7, max(w.x, w.y));
              bool pb = yy < 3.6;
              float x0 = pb ? 0.06 : ${tipo === 'vidrio' ? '0.08' : '0.2'}, x1 = pb ? 0.94 : ${tipo === 'vidrio' ? '0.92' : '0.8'}, y0 = pb ? 0.04 : ${tipo === 'vidrio' ? '0.12' : '0.3'}, y1 = pb ? 0.88 : ${tipo === 'vidrio' ? '0.9' : '0.84'};
              float fyy = pb ? yy / 3.6 : fy;
              float win = smoothstep(x0 - w.x, x0 + w.x, fx) * (1.0 - smoothstep(x1 - w.x, x1 + w.x, fx)) * smoothstep(y0 - w.y, y0 + w.y, fyy) * (1.0 - smoothstep(y1 - w.y, y1 + w.y, fyy));
              float losa = pb ? 0.0 : 1.0 - smoothstep(0.0, 0.07 + w.y, fy);
              win = mix((x1 - x0) * (y1 - y0), win, lod); losa = mix(0.07, losa, lod);
              float hv = fract(sin(dot(floor(vec2(bay, fl)), vec2(17.1, 113.7))) * 43758.5);
              ${tipo === 'obra'
                ? 'vec3 vano = vec3(0.05, 0.05, 0.055); diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.35 * losa), vano, win * 0.9);'
                : 'vec3 vid = mix(vec3(0.10, 0.13, 0.16), vec3(0.38, 0.47, 0.56), 0.25 + 0.45 * hv) ; diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.18 * losa), vid, win); gWin = win;'}
            }
          }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.12, gWin);');
    };
    m.customProgramCacheKey = () => 'fachadaPlanBav3_' + tipo;
  };
  if (T3.env) Object.values(mats).forEach(m => { m.envMap = T3.env; m.envMapIntensity = 0.8; });
  for (const k in mats) fachada(mats[k], k);

  /* ---------- edificios: un volumen por manzana (anillo con patio o macizo), extruido a su altura ---------- */
  const raiz = new THREE.Group(); raiz.name = 'plan_parcial'; raiz.visible = false; T3.scene.add(raiz);
  const EDIF = P.edificios.map(e => {
    const alto = e.pisos * PISO, g = new THREE.ExtrudeGeometry(e.p.map(forma), { depth: alto, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mats.obra); m.castShadow = true; m.receiveShadow = true; m.visible = false; raiz.add(m);
    return { e, m, alto };
  });

  /* ---------- suelo del plan: calzada, andén, alameda, lote (antejardín) y patio, parques; cada capa aparece en su año ---------- */
  const suelo = (color, rough, dy, ro) => new THREE.MeshStandardMaterial({ color, roughness: rough, polygonOffset: true, polygonOffsetFactor: -1 - ro, polygonOffsetUnits: -2 - ro, emissive: new THREE.Color(color).multiplyScalar(0.12) });
  const mS = { calzada: suelo(0x4b4e52, 0.95, 0, 1), anden: suelo(0xbdb8ae, 0.9, 0, 2), alameda: suelo(0xb9b3a4, 0.9, 0, 2), lote: suelo(0x8f8a7f, 0.95, 0, 3), patio: suelo(0xa8a396, 0.95, 0, 4), parque: suelo(0x9c978a, 0.95, 0, 3) }; // patios y parques en concreto (sin verde: pedido de la autora)
  /* TODO el suelo del plan del MISMO color que las vías del simulador (pedido de la autora: el plan se veía raro con tantos grises):
     color de la calzada (T3.viasMallas[2]: tinte × promedio de su textura); mientras no esté, el gris de la calzada del plan */
  const ponerColorSuelo = (c) => { for (const k in mS) { mS[k].color.copy(c); mS[k].emissive.copy(c).multiplyScalar(0.12); } };
  ponerColorSuelo(new THREE.Color(0x4b4e52));
  { let n = 0; const iv = setInterval(() => { const V = T3.viasMallas, m = V && V[2] && V[2].material; if (++n > 80) clearInterval(iv); if (!m) return;
      const img = m.map && m.map.image; if (m.map && !(img && img.width)) return; // textura aún cargando
      const c = m.color.clone();
      if (img) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 8; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } const k = 64 * 255; c.multiply(new THREE.Color().setRGB(r / k, gg / k, b / k, THREE.SRGBColorSpace)); } catch (e) { /* textura de otro origen: solo el tinte */ } }
      ponerColorSuelo(c); /* se sigue leyendo ~40 s: la vista limpia oscurece las vías después de cargar */ }, 500); }
  const capas = []; // { mesh, anio, dy }
  const capa = (polys, mat, anio, dy, ro) => {
    if (!polys || !polys.length) return;
    const g = new THREE.ShapeGeometry(polys.map(forma)); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = false; m.renderOrder = ro; m.visible = false; raiz.add(m); capas.push({ m, anio, dy }); // sin sombra recibida: el suelo de la foto de Google (recortado) la proyectaría encima
  };
  for (const c of P.calzadas) capa(c.p, mS.calzada, c.anio, 0.22, 1);
  for (const c of P.andenes) capa(c.p, mS.anden, c.anio, 0.30, 2);
  for (const c of P.alamedas) capa(c.p, mS.alameda, c.anio, 0.30, 2);
  for (const z of P.zonas) {
    if (z.tipo === 'cp') capa(z.p, mS.parque, z.anio, 0.26, 3);
    else if (z.tipo !== 'bosque' && z.tipo !== 'verde') capa(z.p, mS.lote, z.anio, 0.34, 3);
  }
  for (const { e } of EDIF) if (e.patio && e.patio.length) capa(e.patio, mS.patio, e.anio, 0.40, 4);
  // línea de eje blanca discontinua: se omite (las calzadas del plan salen del espacio entre manzanas, sin eje dibujado)

  /* ---------- árboles nuevos (andenes y alamedas): urapanes jóvenes que se siembran al terminar la manzana y crecen ---------- */
  const NA = P.arboles_nuevos.length;
  const gTr = new THREE.CylinderGeometry(0.16, 0.22, 1, 5); gTr.translate(0, 0.5, 0);
  const gCo = new THREE.IcosahedronGeometry(1, 1);
  const imTr = new THREE.InstancedMesh(gTr, new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.9 }), NA);
  const imCo = new THREE.InstancedMesh(gCo, new THREE.MeshStandardMaterial({ color: 0x4f7a35, roughness: 0.85, flatShading: true }), NA);
  for (const im of [imTr, imCo]) { im.count = 0; im.castShadow = true; im.frustumCulled = false; raiz.add(im); }
  const AW = P.arboles_nuevos.map(([x, y, a], i) => { const w = W([x, y]); const s = Math.sin(i * 91.7) * 43758.5; return { x: w[0], z: w[1], a, r: s - Math.floor(s) }; });

  /* ---------- máscara de la malla de Google: en lo que el plan construye o pavimenta se recorta lo que la foto 3D levanta ----------
     (árboles y bodegas). Lienzo de 2 m por píxel sobre el plan: el canal rojo guarda el año (x 20); 0 = no se toca (bosque CAPRP). */
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const p of P.borde) { const w = W(p); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[1]); z1 = Math.max(z1, w[1]); }
  x0 -= 10; z0 -= 10; x1 += 10; z1 += 10;
  const CW = Math.ceil((x1 - x0) / 2), CH = Math.ceil((z1 - z0) / 2), cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#000'; cx.fillRect(0, 0, CW, CH);
  const pintarPoly = (q, a) => { cx.fillStyle = `rgb(${a * 20},0,0)`; cx.beginPath();
    for (const r of [q.o, ...(q.h || [])]) r.forEach((p, i) => { const w = W(p), u = (w[0] - x0) / 2, v = (w[1] - z0) / 2; i ? cx.lineTo(u, v) : cx.moveTo(u, v); });
    cx.fill('evenodd'); };
  // primero lo de años tardíos y encima lo temprano (en un borde compartido manda el año menor)
  const todo = [];
  for (const z of P.zonas) if (z.tipo !== 'bosque') for (const q of z.p) todo.push([q, z.anio]);
  for (const c of [...P.calzadas, ...P.andenes, ...P.alamedas]) for (const q of c.p) todo.push([q, c.anio]);
  todo.sort((a, b) => b[1] - a[1]).forEach(([q, a]) => pintarPoly(q, a));
  const px = cx.getImageData(0, 0, CW, CH).data;
  const anioEn = (x, z) => { const u = Math.floor((x - x0) / 2), v = Math.floor((z - z0) / 2); if (u < 0 || v < 0 || u >= CW || v >= CH) return 0; return Math.round(px[(v * CW + u) * 4] / 20); };
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false;

  let visible = false, ultimo = '', maskOk = false;
  const pintar = () => {
    const años = RELOJ.sem / 52 * 2; // el plan se construye al doble de ritmo (10 etapas en 5 años): pedido de la autora para verlo terminado
    const clave = visible + '|' + Math.round(años * 52); if (clave === ultimo) return; ultimo = clave;
    raiz.visible = visible; uY0.value = y0();
    if (visible) {
      for (const { e, m, alto } of EDIF) {
        const prog = Math.max(0, Math.min(1, años - (e.anio - 1))); // 0 antes de su año, sube durante su año, 1 al terminar
        m.visible = prog > 0; if (!m.visible) continue;
        const h = Math.max(PISO, Math.ceil(prog * alto / PISO) * PISO);
        m.scale.y = h / alto; m.position.y = y0(); m.material = prog < 1 ? mats.obra : mats[e.mat];
      }
      for (const c of capas) { c.m.visible = años > c.anio - 1; c.m.position.y = y0() + c.dy; }
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(); let n = 0;
      for (const t of AW) {
        const g = años - t.a; if (g <= 0) continue; // se siembra al terminar su año
        const k = Math.min(1, 0.45 + 0.55 * Math.min(1, g / 4)), alt = (5.5 + 2.5 * t.r) * k, cop = (1.9 + 0.8 * t.r) * k;
        V.set(t.x, y0(), t.z); S.set(1, alt * 0.55, 1); M.compose(V, Q, S); imTr.setMatrixAt(n, M);
        V.set(t.x, y0() + alt * 0.62, t.z); S.set(cop, cop * 1.15, cop); M.compose(V, Q, S); imCo.setMatrixAt(n, M); n++;
      }
      imTr.count = imCo.count = n; imTr.instanceMatrix.needsUpdate = imCo.instanceMatrix.needsUpdate = true;
    }
    const mu = T3.maskU; // malla de Google: en lo ya empezado se recorta lo que levanta (árboles y bodegas de la foto 3D)
    if (mu && mu.uPlanTex) {
      if (!maskOk) { maskOk = true; mu.uPlanTex.value = tex; mu.uPlanBox.value.set(x0, z0, 1 / (CW * 2), 1 / (CH * 2)); }
      mu.uPlanOn.value = visible ? años + 1 : 0;
    }
  };
  RELOJ.alDibujar(pintar);

  /* ---------- demolición y tala por año (solo escenario D) ----------
     Al empezar el año de una zona del plan se bajan los árboles del predio que caen en lo que se construye o pavimenta (data3d/real3d.js:
     T3.trees.plan), las bodegas y edificios viejos (data3d/bavaria.js: userData.demol) y las pilastras y columnas de las naves en esqueleto.
     Los árboles del bosque conservado (CAPRP) y de los parques (CP) se quedan.
     Al escoger D (o al cambiar de escenario) el estado se pone de una vez; solo las etapas que se cruzan con el reloj corriendo se animan:
     los árboles caen y se encogen uno tras otro, los edificios bajan hasta el suelo con una nube de polvo. La animación va con RELOJ.tAnim. */
  const DUR_ARB = 1.8, DUR_EDIF = 2.6, RETRASO_EDIF = 0.5, VIDA_POLVO = 3.4;
  const arbPorEtapa = []; // etapa -> índices (de data3d/bavaria_arboles.json) de los árboles que se talan
  (P.arboles_quitados || []).forEach((k, i) => { if (k > 0) (arbPorEtapa[k] = arbPorEtapa[k] || []).push(i); });
  const fase = new Array(ETAPAS + 1).fill(0), t0 = new Array(ETAPAS + 1).fill(0), polvoHecho = new Array(ETAPAS + 1).fill(false), okA = new Array(ETAPAS + 1).fill(false), okE = new Array(ETAPAS + 1).fill(false); // okA/okE: árboles y edificios ya puestos (pueden cargarse después del escenario); fase: 0 en pie · 1 cayendo · 2 demolido
  let sincro = false, sucio = false, ultRep = 0, cuadro = 0;
  const hh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }; // azar determinista
  const suave = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  // nube de polvo: puntos suaves que suben, se abren y se desvanecen (cola circular de partículas)
  const NP = 1400, pP = new Float32Array(NP * 3), pA = new Float32Array(NP), pS = new Float32Array(NP), pV = new Float32Array(NP * 3), pN = new Float32Array(NP), pT = new Float32Array(NP).fill(-1e9), pS0 = new Float32Array(NP);
  const gP = new THREE.BufferGeometry(); gP.setAttribute('position', new THREE.BufferAttribute(pP, 3)); gP.setAttribute('aA', new THREE.BufferAttribute(pA, 1)); gP.setAttribute('aS', new THREE.BufferAttribute(pS, 1));
  const mP = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uEsc: { value: 800 } },
    vertexShader: 'attribute float aA; attribute float aS; varying float vA; uniform float uEsc; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aS * uEsc / -mv.z, 0.0, 160.0); }',
    fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r2 = dot(d, d) * 4.0; if (r2 > 1.0 || vA <= 0.003) discard; gl_FragColor = vec4(0.52, 0.47, 0.41, vA * exp(-r2 * 2.2)); }' });
  const polvo = new THREE.Points(gP, mP); polvo.frustumCulled = false; polvo.renderOrder = 6; polvo.visible = false; T3.scene.add(polvo);
  let kP = 0, pAct = 0;
  const soltar = (x, z, alto, n, e, rad = 0) => { for (let j = 0; j < n; j++) { const k = kP, s = hh(e * 977 + x * 0.37 + z * 0.91 + j * 13.3); kP = (kP + 1) % NP; const a = hh(s * 91 + j) * 6.283;
    const ro = Math.sqrt(hh(s * 61 + j)) * rad, ao = hh(s * 67 + j) * 6.283; // nace repartida sobre la huella del edificio
    pP[k * 3] = x + Math.cos(ao) * ro; pP[k * 3 + 1] = y0() + 1 + hh(s * 71 + j) * alto; pP[k * 3 + 2] = z + Math.sin(ao) * ro; pV[k * 3] = Math.cos(a) * (1.2 + hh(s * 17 + j) * 2.6); pV[k * 3 + 1] = 1.5 + hh(s * 29 + j) * 3.2; pV[k * 3 + 2] = Math.sin(a) * (1.2 + hh(s * 31 + j) * 2.6); pS0[k] = 6 + hh(s * 43 + j) * 8; pT[k] = 0; pN[k] = 1; } pAct = 1; };
  const moverPolvo = (dt) => {
    if (!pAct) return; let vivo = 0;
    for (let k = 0; k < NP; k++) { if (pT[k] < 0) continue; pT[k] += dt; const u = pT[k] / VIDA_POLVO; if (u >= 1) { pT[k] = -1e9; pA[k] = 0; pS[k] = 0; continue; } vivo++;
      pP[k * 3] += pV[k * 3] * dt; pP[k * 3 + 1] += pV[k * 3 + 1] * dt; pP[k * 3 + 2] += pV[k * 3 + 2] * dt; const fr = Math.exp(-0.9 * dt); pV[k * 3] *= fr; pV[k * 3 + 1] *= fr; pV[k * 3 + 2] *= fr;
      pS[k] = pS0[k] * (0.5 + 1.1 * Math.sqrt(u)); pA[k] = 0.5 * (1 - u) * Math.min(1, u * 8); }
    for (const a of ['position', 'aA', 'aS']) gP.attributes[a].needsUpdate = true; if (!vivo) { pAct = 0; polvo.visible = false; }
  };
  const ponerEscalaArb = (e, dt) => { // árboles de la etapa e: cada uno cae en su turno dentro de DUR_ARB (dt < 0: todos en pie, dt = Infinity: todos talados)
    const tr = T3.trees && T3.trees.plan; if (!tr) return false; const L = arbPorEtapa[e] || [];
    for (const i of L) tr.poner(i, dt === Infinity ? 0 : dt < 0 ? 1 : 1 - suave((dt - 0.6 * DUR_ARB * hh(i * 7.7 + e)) / (0.4 * DUR_ARB)));
    sucio = true; return true;
  };
  const ponerEscalaEdif = (e, f) => { // edificios y esqueletos de la etapa e: f = 1 en pie · 0 en el suelo
    const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; if (!dm) return false;
    for (const q of dm.edificios) if (q.etapa === e) { q.g.scale.y = Math.max(1e-3, f); q.g.visible = f > 0.004; }
    dm.ponerEsq(e, f); return true;
  };
  /* árboles de cualquier capa (no solo los del predio) que caen en lo que el plan construye o pavimenta: se quitan cuando ese año ya
     está demolido (fase 2) y vuelven al salir del escenario. Se calcula una sola vez, cuando los árboles ya cargaron. */
  let enCalle = null;
  const aplicarCalles = () => {
    const pos = T3.trees && T3.trees.pos; if (!pos || !pos.OC) return false;
    if (!enCalle) { enCalle = []; for (let k = 0; k < pos.X.length; k++) { const a = anioEn(pos.X[k], pos.Z[k]); if (a) enCalle.push([k, a]); } }
    for (const [k, e] of enCalle) if (fase[e] !== 1) pos.OC[k] = visible && fase[e] === 2 ? 0 : 1;
    return true;
  };
  const emitirPolvo = (e) => {
    const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; if (!dm) return;
    for (const q of dm.edificios) if (q.etapa === e) soltar(q.cx, q.cz, Math.min(q.h, 18), Math.max(10, Math.min(60, Math.round(q.r * 1.2))), e + q.ie, q.r * 0.8);
    for (const [x, z] of (dm.puntosEsq[e] || []).slice(0, 40)) soltar(x, z, 6, 3, e, 4);
    polvo.visible = true;
  };
  const demoler = () => {
    const años = RELOJ.sem / 52, tA = RELOJ.tAnim, anima = sincro && RELOJ.corriendo && visible, ms = ++cuadro; // ms: contador de cuadros (repintar los árboles cada 6 cuadros)
    let fin = false;
    for (let e = 1; e <= ETAPAS; e++) {
      const on = visible && años > e - 1;
      if (!on) { if (fase[e] !== 0) { ponerEscalaArb(e, -1); ponerEscalaEdif(e, 1); fase[e] = 0; polvoHecho[e] = false; okA[e] = okE[e] = false; fin = true; } continue; }
      if (fase[e] === 0) { if (anima) { fase[e] = 1; t0[e] = tA; polvoHecho[e] = false; fin = true; } else { okA[e] = ponerEscalaArb(e, Infinity); okE[e] = ponerEscalaEdif(e, 0); fase[e] = 2; fin = true; } }
      if (fase[e] === 2) { if (!okA[e]) { okA[e] = ponerEscalaArb(e, Infinity); fin = fin || okA[e]; } if (!okE[e]) okE[e] = ponerEscalaEdif(e, 0); }
      if (fase[e] === 1) {
        const dt = tA - t0[e];
        ponerEscalaArb(e, dt); ponerEscalaEdif(e, 1 - suave((dt - RETRASO_EDIF) / DUR_EDIF));
        if (!polvoHecho[e] && dt >= RETRASO_EDIF) { polvoHecho[e] = true; emitirPolvo(e); }
        if (dt >= RETRASO_EDIF + DUR_EDIF && dt >= DUR_ARB || !RELOJ.corriendo) { okA[e] = ponerEscalaArb(e, Infinity); okE[e] = ponerEscalaEdif(e, 0); fase[e] = 2; fin = true; }
      }
    }
    if (pAct) { mP.uniforms.uEsc.value = T3.renderer.domElement.height / (2 * Math.tan(T3.camera.fov * Math.PI / 360)); moverPolvo(Math.min(0.1, RELOJ.dtAnim || 0)); }
    if (fin || (!enCalle && visible)) { const nuevo = !enCalle; if (aplicarCalles()) { sucio = true; if (nuevo) fin = true; } }
    if (sucio && (fin || ms - ultRep >= 6)) { sucio = false; ultRep = ms; const tr = T3.trees && T3.trees.plan; if (tr) tr.repintar(); if (fin && T3.arbolesSplat && T3.arbolesSplat.invalidar) T3.arbolesSplat.invalidar(); }
  };
  RELOJ.alDibujar(demoler);
  const api = {
    ver(on) { visible = !!on; ultimo = ''; pintar(); sincro = false; demoler(); sincro = true; if (!visible) { polvo.visible = false; pAct = 0; pT.fill(-1e9); } }, // al escoger D (o salir) el estado se pone de golpe, sin animación
    get visible() { return visible; },
    // resumen del avance para paneles y para el modelo: viviendas terminadas, árboles quitados y sembrados, personas (viviendas × personas por hogar)
    avance(años) { let viv = 0, man = 0; for (const m of P.manzanas) if (años >= m.etapa) { viv += m.viviendas; man++; }
      let arb = 0; for (let e = 0; e < P.arboles_quitados_por_etapa.length; e++) if (años >= e + 1) arb += P.arboles_quitados_por_etapa[e];
      const sembrados = P.arboles_nuevos.filter(a => años > a[2]).length;
      return { viviendas: viv, manzanas: man, totalManzanas: P.manzanas.length, arboles: arb, sembrados, totalViviendas: P.total_viviendas }; },
    datos: P,
    anioEn,
    centro: [(x0 + x1) / 2, (z0 + z1) / 2], // centro del plan en el marco mundo (x, z)
    mirar(dx = -380, dy = 320, dz = 420, ox = 0, oz = 0) { const cx0 = (x0 + x1) / 2 + ox, cz0 = (z0 + z1) / 2 + oz; T3.camera.position.set(cx0 + dx, dy, cz0 + dz); if (T3.orbit) { T3.orbit.target.set(cx0, 0, cz0); T3.orbit.update(); } }, // vista del plan (pruebas y enlaces)
    // etapas ya demolidas / talas aplicadas (pruebas): { arboles: [por etapa], edificios: [por etapa] }
    demolicion() { const dm = T3.bavaria && T3.bavaria.userData && T3.bavaria.userData.demol; const edif = {}, arb = {}; if (dm) for (const q of dm.edificios) (edif[q.etapa] = edif[q.etapa] || []).push(q.ie); for (const e in arbPorEtapa) arb[e] = arbPorEtapa[e].length; return { edificiosPorEtapa: edif, etapasEsqueleto: dm ? dm.etapasEsq : [], arbolesPorEtapa: arb, fase: fase.slice() }; }
  };
  window.KEN_PLANBAV = api;
  return api;
}
