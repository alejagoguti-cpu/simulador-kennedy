/* ============ DEGRADACIÓN VISIBLE · humedales que se encogen y árboles de parque que desaparecen (20 años simulados) ============
   window.KEN_DEGRADA = { poner({ humedales, humedalFuncional, arbolesPerdidos, basuraHumedal }), ver(on) }
   Lo alimenta el modelo semanal (data3d/simulaciones12.js, ind(s)): humedales [{id, nombre, x, z, ha, ha0, calidad}], arbolesPerdidos (0-1)
   y los puntos de basura con fuente 'humedal' [{x, z, acumulada}].

   HUMEDALES (El Burro, La Vaca, Techo; forma de data3d/water_bodies.json):
   · por cada polígono se arma una vez un mapa (256×256) con la distancia al borde y un «frente»: el borde que mira al punto de basura
     (al barrio) se rellena primero. El área rellenada es la fracción (1 − ha/ha0)·1,3 del espejo de agua (cuantiles del mapa: el área
     dibujada es proporcional a la pérdida real); encima avanza una franja manchada de basura y vegetación muerta de ancho
     proporcional a (1 − calidad), y todo el humedal se pardea un poco al bajar la calidad.
   · la lámina de agua del simulador (T3.waterMesh) se recorta de verdad donde hay relleno y se enturbia con (1 − calidad).
   · en la orilla del frente se acumulan montículos y bolsas de basura (cantidad ∝ t acumuladas en ese borde).
   ÁRBOLES (real3d.js, T3.trees): árboles dentro de parques (data3d/parques.json) y del borde de los humedales; se pierde la fracción
     arbolesPerdidos, elegida por hash y prefiriendo los del borde del parque (junto a la calle) y el frente sucio del humedal.
     Cada uno cae y se encoge en ~1 s al cruzar su umbral y vuelve a crecer si la fracción baja. No se rehace geometría: se escalan
     las matrices de instancia de los modelos que ya dibuja real3d.js (cerca, medio y siluetas). Ya caído, el árbol queda marcado con
     T3.trees.pos.OC = 0,999 (real3d.js lo saca de las siluetas lejanas sin recalcular nada aquí) y en su lugar queda un tocón con un claro
     de tierra; ver(false) lo devuelve todo como estaba.
   Rendimiento: nada al importar; todo se arma en el primer poner() (por partes, sin bloquear); por cuadro solo trabaja durante
   las transiciones (sin asignar memoria). Todo cuelga de un THREE.Group 'degradacion' (KEN_FOCO.on('degradacion')). */

const RM = 600, D0 = 40, DR = 200;         // codificación del mapa: r en [0, RM] m · d (distancia firmada al borde) en [−D0, DR − D0] m
const TEX = 256, ATL = 512, MAXP = 4;      // resolución de cada polígono y del atlas (2×2 polígonos)
const AMP_REL = 1.3, AMP_MAN = 0.55;       // relleno dibujado = 1,3 × área perdida; franja manchada = 0,55 × (1 − calidad) del área
const MAXB = 1400, MAXM = 60;              // bolsas y montículos por humedal (tope)

const GLSL_RUIDO = `
  float dgH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float dgN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(dgH(i), dgH(i + vec2(1.0, 0.0)), f.x), mix(dgH(i + vec2(0.0, 1.0)), dgH(i + vec2(1.0, 1.0)), f.x), f.y); }
  float dgF(vec2 p){ return 0.5 * dgN(p) + 0.3 * dgN(p * 2.13 + 7.1) + 0.2 * dgN(p * 4.7 + 3.3); }
  vec2 dgMapa(sampler2D t, int j, vec2 q){ vec2 o = vec2(float(j - 2 * (j / 2)), float(j / 2)) * 0.5;
    vec2 g = textureLod(t, o + (0.5 + clamp(q, 0.0, 1.0) * ${(TEX - 1).toFixed(1)}) / ${ATL.toFixed(1)}, 0.0).rg; return vec2(g.r * ${RM.toFixed(1)}, g.g * ${DR.toFixed(1)} - ${D0.toFixed(1)}); }
`;

export function crearDegradacion({ T3, RELOJ }) {
  if (window.KEN_DEGRADA && window.KEN_DEGRADA._T3 === T3) return window.KEN_DEGRADA;
  const THREE = T3.THREE;
  let grupo = null, listo = false, armando = null, visible = true, pend = null;
  const H = [];            // humedales: { nombre, x, z, polis: [...], q: Float32Array (cuantiles de r), cur/tgt {D, W, C, A} }
  const POL = [];          // polígonos: { h, box: [x0, z0, sx, sz], uni, mesh }
  let atlas = null, uAgua = null, aguaMat = null;
  const st = { ms: 0, msMax: 0, cuadros: 0, arboles: 0, elegibles: 0, mallas: 0, anim: 0 };

  /* ---------------------------------------------------------------- utilidades ---------------------------------------------------------------- */
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/humedal|de |el |la /g, '').trim();
  const cargar = (u) => (window.cargarJSON ? window.cargarJSON(u) : fetch(u).then(r => r.json()));
  const ceder = () => new Promise(r => setTimeout(r, 0));
  const lw = (x, y) => (T3.lw ? T3.lw(x, y) : [x - 5341.33, 3161.9 - y]);
  const Y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);

  /* ---------------------------------------------------------------- mapa de un polígono ----------------------------------------------------------------
     d: distancia firmada al borde (+ dentro) · s: posición en el frente (0 = borde que mira a la basura) · w = peso del frente
     r = d / w (dentro) o 2,5·|d| / w (fuera): se rellena todo lo que tiene r < D; el frente (w alto) se llena primero. */
  function mapaPoligono(P, ux, uz) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, p0 = 1e9, p1 = -1e9;
    for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); const pr = x * ux + z * uz; p0 = Math.min(p0, pr); p1 = Math.max(p1, pr); }
    const M = 45; x0 -= M; z0 -= M; x1 += M; z1 += M;
    const sx = x1 - x0, sz = z1 - z0, cx = sx / TEX, cz = sz / TEX, n = TEX * TEX;
    const ins = new Uint8Array(n), xs = [];
    for (let j = 0; j < TEX; j++) { // relleno por filas (scanline)
      const z = z0 + (j + 0.5) * cz; xs.length = 0;
      for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const A = P[a], B = P[b]; if ((A[1] > z) !== (B[1] > z)) xs.push(A[0] + (z - A[1]) / (B[1] - A[1]) * (B[0] - A[0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil((xs[k] - x0) / cx - 0.5)), i1 = Math.min(TEX - 1, Math.floor((xs[k + 1] - x0) / cx - 0.5)); for (let i = i0; i <= i1; i++) ins[j * TEX + i] = 1; }
    }
    // distancia al borde: chaflán de dos pasadas (hacia afuera y hacia adentro)
    const cd = Math.hypot(cx, cz), dist = (dentro) => { const D = new Float32Array(n);
      for (let k = 0; k < n; k++) D[k] = ins[k] === dentro ? 1e9 : 0;
      for (let j = 0; j < TEX; j++) for (let i = 0; i < TEX; i++) { const k = j * TEX + i; let v = D[k]; if (v === 0) continue;
        if (i > 0) v = Math.min(v, D[k - 1] + cx); if (j > 0) { v = Math.min(v, D[k - TEX] + cz); if (i > 0) v = Math.min(v, D[k - TEX - 1] + cd); if (i < TEX - 1) v = Math.min(v, D[k - TEX + 1] + cd); } D[k] = v; }
      for (let j = TEX - 1; j >= 0; j--) for (let i = TEX - 1; i >= 0; i--) { const k = j * TEX + i; let v = D[k]; if (v === 0) continue;
        if (i < TEX - 1) v = Math.min(v, D[k + 1] + cx); if (j < TEX - 1) { v = Math.min(v, D[k + TEX] + cz); if (i < TEX - 1) v = Math.min(v, D[k + TEX + 1] + cd); if (i > 0) v = Math.min(v, D[k + TEX - 1] + cd); } D[k] = v; }
      return D; };
    const dIn = dist(1), dOut = dist(0);
    const R = new Float32Array(n), Dd = new Float32Array(n), rg = new Uint8Array(n * 2);
    for (let j = 0; j < TEX; j++) for (let i = 0; i < TEX; i++) {
      const k = j * TEX + i, x = x0 + (i + 0.5) * cx, z = z0 + (j + 0.5) * cz;
      const d = ins[k] ? dIn[k] - 0.5 * Math.min(cx, cz) : -(dOut[k] - 0.5 * Math.min(cx, cz));
      const s = (x * ux + z * uz - p0) / Math.max(1, p1 - p0), w = 0.07 + 0.93 * Math.max(0, Math.min(1, 1 - s * 1.2));
      const r = (d >= 0 ? d : -d * 2.5) / w;
      R[k] = r; Dd[k] = d;
      rg[k * 2] = Math.round(255 * Math.min(1, r / RM)); rg[k * 2 + 1] = Math.round(255 * Math.max(0, Math.min(1, (d + D0) / DR)));
    }
    return { box: [x0, z0, sx, sz], cx, cz, R, Dd, ins, rg };
  }

  /* ---------------------------------------------------------------- materiales ---------------------------------------------------------------- */
  // la malla de Google tiene relieve y vegetación de 1-4 m sobre el suelo: la capa se adelanta unos metros hacia la cámara A LO LARGO DEL RAYO DE VISTA
  // (misma posición en pantalla, solo cambia la profundidad), así no se hunde bajo la foto 3D y los edificios y árboles de verdad la siguen tapando
  const ADELANTA = (m) => `#include <project_vertex>
        mvPosition.xyz -= normalize(mvPosition.xyz) * min(${m.toFixed(1)}, 0.04 * length(mvPosition.xyz)); gl_Position = projectionMatrix * mvPosition;`;
  function materialCapa(uni) { // relleno, franja manchada y pardeo: sin luz (como la malla de Google, que es foto), con niebla y color del mapa
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uni);
      sh.vertexShader = 'uniform sampler2D uDgTex; uniform vec4 uDgBox; uniform vec4 uDgP; uniform int uDgJ; varying vec2 vDgW;\n' + GLSL_RUIDO + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { vDgW = transformed.xz; vec2 t = dgMapa(uDgTex, uDgJ, (transformed.xz - uDgBox.xy) / uDgBox.zw);
          float nv = dgF(transformed.xz * 0.03), rr = t.x * (0.72 + 0.56 * nv);
          float rel = 1.0 - smoothstep(uDgP.x - 4.0, uDgP.x + 4.0, rr);
          transformed.y += rel * (0.8 + 1.2 * dgN(transformed.xz * 0.09)) * step(0.5, uDgP.x); }`).replace('#include <project_vertex>', ADELANTA(9));
      sh.fragmentShader = 'uniform sampler2D uDgTex; uniform vec4 uDgBox; uniform vec4 uDgP; uniform int uDgJ; varying vec2 vDgW;\n' + GLSL_RUIDO + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec2 t = dgMapa(uDgTex, uDgJ, (vDgW - uDgBox.xy) / uDgBox.zw);
          float n = dgF(vDgW * 0.03), n2 = dgF(vDgW * 0.11 + 5.0), n3 = dgN(vDgW * 0.45 + 2.0);
          float rr = t.x * (0.72 + 0.56 * n);
          float rel = (1.0 - smoothstep(uDgP.x - 2.0, uDgP.x + 2.0, rr)) * step(0.5, uDgP.x);
          float bm = uDgP.x + uDgP.y, rm = rr * (0.9 + 0.2 * n2);
          float man = (1.0 - smoothstep(bm - 5.0, bm + 5.0, rm)) * step(0.5, uDgP.y);
          float orilla = smoothstep(bm - 16.0, bm - 2.0, rm) * man;            // barro húmedo y negro en el frente de la mancha
          float dentro = smoothstep(-3.0, 3.0, t.y), fuera = smoothstep(-34.0, -10.0, t.y);
          float velo = dentro * uDgP.z * 0.32;                                   // todo el humedal se pardea al bajar la calidad
          // basura menuda (plástico blanco, azul, rojo, negro): solo de cerca, de lejos se promedia en un gris sucio
          vec2 cel = floor(vDgW * 0.7); float hb = dgH(cel), hc = dgH(cel + 17.3);
          float px = length(fwidth(vDgW)), cerca = 1.0 - smoothstep(0.5, 1.4, px);
          float dens = rel * 0.13 + man * 0.05 * uDgP.z;
          vec3 cb = hc < 0.35 ? vec3(0.85, 0.85, 0.82) : hc < 0.55 ? vec3(0.22, 0.38, 0.62) : hc < 0.7 ? vec3(0.62, 0.16, 0.12) : vec3(0.08, 0.08, 0.08);
          // relleno: tierra y escombro claros y secos, con un borde de barro húmedo donde toca el agua
          vec3 tierra = mix(vec3(0.64, 0.58, 0.48), vec3(0.50, 0.45, 0.37), n2);
          tierra = mix(tierra, vec3(0.74, 0.70, 0.62), smoothstep(0.6, 0.9, n3)) * (0.86 + 0.26 * dgN(vDgW * 1.3));
          tierra = mix(tierra, vec3(0.20, 0.17, 0.12), smoothstep(uDgP.x - 7.0, uDgP.x - 0.5, rr) * 0.85);
          // franja manchada: vegetación muerta y barro con lixiviado, más negra en su frente
          vec3 muerta = mix(vec3(0.46, 0.40, 0.26), vec3(0.33, 0.28, 0.18), n3);
          muerta = mix(muerta, vec3(0.13, 0.11, 0.075), orilla * 0.75);
          vec3 c = mix(vec3(0.40, 0.35, 0.22), muerta, man);
          c = mix(c, tierra, rel);
          c = mix(c, mix(vec3(0.5, 0.48, 0.44), cb, cerca), step(1.0 - dens, hb));
          float a = max(max(velo, man * 0.8), rel) * fuera;
          if (a < 0.01) discard;
          diffuseColor.rgb = pow(c, vec3(2.2)); diffuseColor.a = a; }`);
    };
    m.customProgramCacheKey = () => 'degradacion-capa-v1';
    return m;
  }

  function parcharAgua() { // el espejo de agua del simulador se recorta donde hay relleno y se enturbia con la calidad
    const w = T3.waterMesh; if (!w || !w.material || w.material === aguaMat) return;
    const m = w.material; if (m.userData.degrada) { aguaMat = m; return; }
    const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      Object.assign(sh.uniforms, uAgua);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDgA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDgA = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      const cuerpo = `
        if (uDgOn > 0.5) { for (int j = 0; j < ${MAXP}; j++) { vec4 b = uDgBox[j]; if (b.z <= 0.0) continue; vec2 q = (vDgA.xz - b.xy) / b.zw;
          if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
          vec2 t = dgMapa(uDgTex, j, q); vec4 P = uDgP[j]; float rr = t.x * (0.72 + 0.56 * dgF(vDgA.xz * 0.03));
          if (P.x > 0.5 && rr < P.x + 1.0) discard;                                           // relleno: ya no hay agua
          float tu = P.z * (0.6 + 0.4 * (1.0 - smoothstep(P.x, P.x + P.y + 150.0, rr)));      // turbia, más cerca del frente sucio
          dgTurb = max(dgTurb, clamp(tu * 1.7, 0.0, 0.9)); } }`;
      const pars = 'varying vec3 vDgA; uniform float uDgOn; uniform sampler2D uDgTex; uniform vec4 uDgBox[' + MAXP + ']; uniform vec4 uDgP[' + MAXP + '];\n' + GLSL_RUIDO;
      if (sh.fragmentShader.includes('#include <opaque_fragment>')) {
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + pars)
          .replace('#include <opaque_fragment>', `{ float dgTurb = 0.0; ${cuerpo} outgoingLight = mix(outgoingLight, vec3(0.085, 0.068, 0.030), dgTurb); }\n#include <opaque_fragment>`);
      } else if (sh.fragmentShader.includes('gl_FragColor = vec4(col')) { // agua sencilla (ShaderMaterial de index.html)
        sh.fragmentShader = pars + sh.fragmentShader.replace(/gl_FragColor = vec4\(col, ([0-9.]+)\);/, `{ float dgTurb = 0.0; ${cuerpo} col = mix(col, vec3(0.085, 0.068, 0.030), dgTurb); }\ngl_FragColor = vec4(col, $1);`);
        sh.vertexShader = sh.vertexShader.replace('void main(){', 'varying vec3 vDgA;\nvoid main(){ vDgA = (modelMatrix * vec4(position, 1.0)).xyz;');
      }
    };
    m.customProgramCacheKey = () => key0() + '|degrada1';
    m.userData.degrada = true; m.needsUpdate = true; aguaMat = m;
  }

  /* ---------------------------------------------------------------- humedales ---------------------------------------------------------------- */
  async function armarHumedales(datos) {
    const W = await cargar('data3d/water_bodies.json').catch(() => []);
    const cuerpos = (W || []).filter(w => /humedal/i.test(w.tipo || w.nombre || '') && w.pts && w.pts.length > 4).map(w => {
      const P = w.pts.map(p => lw(p[0], p[1])); if (Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1) P.pop();
      let cx = 0, cz = 0; for (const p of P) { cx += p[0]; cz += p[1]; } return { n: norm(w.nombre), P, cx: cx / P.length, cz: cz / P.length }; });
    const bas = datos.basuraHumedal || [];
    atlas = new THREE.DataTexture(new Uint8Array(ATL * ATL * 2), ATL, ATL, THREE.RGFormat, THREE.UnsignedByteType);
    atlas.minFilter = atlas.magFilter = THREE.LinearFilter; atlas.generateMipmaps = false; atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
    uAgua = { uDgOn: { value: 1 }, uDgTex: { value: atlas }, uDgBox: { value: Array.from({ length: MAXP }, () => new THREE.Vector4(0, 0, 0, 0)) }, uDgP: { value: Array.from({ length: MAXP }, () => new THREE.Vector4()) } };
    const bolsaG = new THREE.IcosahedronGeometry(0.5, 0), monG = new THREE.IcosahedronGeometry(1, 1);
    { const p = monG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.75 + 0.5 * hash(Math.round(x * 50) * 7 + Math.round(y * 50) * 13 + Math.round(z * 50) * 29); p.setXYZ(i, x * k, Math.max(0, y) * k, z * k); } monG.computeVertexNormals(); }
    const bolsaM = new THREE.MeshLambertMaterial({ color: 0xffffff }), monM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    for (const m of [bolsaM, monM]) { m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', ADELANTA(3.5)); }; m.customProgramCacheKey = () => 'degradacion-basura-v1'; }
    const o3 = new THREE.Object3D(), col = new THREE.Color();
    for (const h of datos.humedales || []) {
      const nh = norm(h.nombre);
      let mios = cuerpos.filter(c => c.n && c.n === nh);
      if (!mios.length) { const c = cuerpos.map(c => [c, Math.hypot(c.cx - h.x, c.cz - h.z)]).sort((a, b) => a[1] - b[1])[0]; if (c && c[1] < 700) mios = cuerpos.filter(q => q.n === c[0].n); }
      if (!mios.length || POL.length + mios.length > MAXP) continue;
      const b = bas.length ? bas.map(p => [p, Math.hypot(p.x - h.x, p.z - h.z)]).sort((a, c) => a[1] - c[1])[0][0] : null;
      let ux = b ? h.x - b.x : -h.x, uz = b ? h.z - b.z : -h.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; // del punto de basura hacia el centro
      const HU = { nombre: h.nombre, x: h.x, z: h.z, polis: [], bx: b ? b.x : h.x - ux * 150, bz: b ? b.z : h.z - uz * 150, cur: { D: 0, W: 0, C: 0, A: 0 }, tgt: { D: 0, W: 0, C: 0, A: 0 }, bolsas: null, mont: null };
      const rs = [];
      for (const c of mios) {
        const mp = mapaPoligono(c.P, ux, uz), j = POL.length, ox = (j & 1) * TEX, oy = (j >> 1) * TEX;
        for (let r = 0; r < TEX; r++) atlas.image.data.set(mp.rg.subarray(r * TEX * 2, (r + 1) * TEX * 2), ((oy + r) * ATL + ox) * 2);
        for (let k = 0; k < mp.R.length; k++) if (mp.ins[k]) rs.push(mp.R[k]);
        const uni = { uDgTex: { value: atlas }, uDgBox: { value: new THREE.Vector4(...mp.box) }, uDgP: { value: new THREE.Vector4() }, uDgJ: { value: j } };
        const [x0, z0, sx, sz] = mp.box, g = new THREE.PlaneGeometry(sx, sz, Math.min(200, Math.ceil(sx / 5)), Math.min(200, Math.ceil(sz / 5)));
        g.rotateX(-Math.PI / 2); g.translate(x0 + sx / 2, 0, z0 + sz / 2); g.deleteAttribute('uv');
        const mesh = new THREE.Mesh(g, materialCapa(uni)); mesh.position.y = Y0() + 1.25; mesh.renderOrder = 5; mesh.frustumCulled = true; mesh.receiveShadow = true; mesh.name = 'degradacion_' + norm(h.nombre).replace(/\s+/g, '_');
        grupo.add(mesh); uAgua.uDgBox.value[j].set(...mp.box);
        const P = { h: HU, box: mp.box, uni, mesh, mp }; POL.push(P); HU.polis.push(P);
        await ceder();
      }
      rs.sort((a, c) => a - c); HU.q = new Float32Array(101); for (let k = 0; k <= 100; k++) HU.q[k] = rs.length ? rs[Math.min(rs.length - 1, Math.floor(k / 100 * (rs.length - 1)))] : 0;
      // basura en la orilla del frente: celdas de la orilla (−4 m < d < 14 m) ordenadas por distancia al punto de basura; al crecer la cantidad avanza por la orilla
      const cel = [];
      for (const P of HU.polis) { const { box, cx, cz, Dd } = P.mp; for (let j = 0; j < TEX; j += 1) for (let i = 0; i < TEX; i += 1) { const d = Dd[j * TEX + i]; if (d > -4 && d < 14) { const x = box[0] + (i + 0.5) * cx, z = box[1] + (j + 0.5) * cz; cel.push([x, z, Math.hypot(x - HU.bx, z - HU.bz) * (0.85 + 0.3 * hash(i * 31 + j * 57))]); } } }
      cel.sort((a, c) => a[2] - c[2]);
      const nb = Math.min(MAXB, cel.length * 2), nm = Math.min(MAXM, cel.length);
      const bols = new THREE.InstancedMesh(bolsaG, bolsaM, Math.max(1, nb)), mont = new THREE.InstancedMesh(monG, monM, Math.max(1, nm));
      const yb = Y0() + 2.0;
      for (let k = 0; k < nb; k++) { const c = cel[Math.floor(k / 2)], s = 0.7 + hash(k * 3 + 1) * 0.8, hc = hash(k * 7 + 2);
        o3.position.set(c[0] + (hash(k * 5) - 0.5) * 4, yb + s * 0.25 + hash(k * 11) * 0.5, c[1] + (hash(k * 9 + 4) - 0.5) * 4); o3.rotation.set(hash(k) * 3, hash(k * 2) * 6.28, hash(k * 4) * 3); o3.scale.set(s * 1.25, s * 0.75, s); o3.updateMatrix(); bols.setMatrixAt(k, o3.matrix);
        col.setRGB(...(hc < 0.45 ? [0.035, 0.035, 0.04] : hc < 0.7 ? [0.62, 0.62, 0.6] : hc < 0.82 ? [0.18, 0.3, 0.48] : hc < 0.92 ? [0.12, 0.22, 0.12] : [0.5, 0.42, 0.3])); bols.setColorAt(k, col); }
      for (let k = 0; k < nm; k++) { const c = cel[Math.min(cel.length - 1, Math.floor(k * cel.length / Math.max(1, nm) * 0.3))], s = 3.5 + hash(k * 13 + 3) * 4.5;
        o3.position.set(c[0] + (hash(k * 17) - 0.5) * 6, yb - 0.6, c[1] + (hash(k * 19) - 0.5) * 6); o3.rotation.set(0, hash(k * 23) * 6.28, 0); o3.scale.set(s * (0.8 + hash(k * 29) * 0.5), s * (0.22 + hash(k * 31) * 0.16), s); o3.updateMatrix(); mont.setMatrixAt(k, o3.matrix);
        const g = 0.75 + hash(k * 37) * 0.35, hc = hash(k * 41); col.setRGB(...(hc < 0.5 ? [0.42 * g, 0.39 * g, 0.35 * g] : hc < 0.8 ? [0.3 * g, 0.27 * g, 0.22 * g] : [0.5 * g, 0.5 * g, 0.48 * g])); mont.setColorAt(k, col); }
      bols.count = 0; mont.count = 0; bols.castShadow = mont.castShadow = true; bols.receiveShadow = mont.receiveShadow = true; bols.name = 'degradacion_basura'; mont.name = 'degradacion_monticulos';
      grupo.add(bols, mont); HU.bolsas = bols; HU.mont = mont; HU.nb = nb; HU.nm = nm;
      H.push(HU);
    }
    atlas.needsUpdate = true;
    parcharAgua();
  }

  /* ---------------------------------------------------------------- árboles ---------------------------------------------------------------- */
  const A = { ok: false, NE: 0, EI: null, X32: null, Z32: null, TH: null, PHI: null, F: null, MODO: null, T0: null, ORIG: null, ORIGOK: null,
    TAB: null, MASK: 0, act: null, nAct: 0, nPerd: 0, frac: 0, fracT: 0, mallas: [], cand: [], envuelto: false, toc: null, forzar: false, tForzar: 0 };
  const clave = (x, z) => (Math.imul((x * 2 + 0.5) | 0, 73856093) ^ Math.imul((z * 2 + 0.5) | 0, 19349663)) & A.MASK;
  function buscar(x, z) { let h = clave(x, z); for (;;) { const v = A.TAB[h]; if (v === 0) return -1; const e = v - 1; if (A.X32[e] === x && A.Z32[e] === z) return e; h = (h + 1) & A.MASK; } }

  async function armarArboles() {
    const tr = T3.trees, pos = tr && tr.pos; if (!pos || !pos.X) return;
    const { X, Z, Hh } = pos, N = X.length;
    // cubetas de 64 m para no recorrer todos los árboles por cada parque
    let bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9; for (let i = 0; i < N; i++) { bx0 = Math.min(bx0, X[i]); bx1 = Math.max(bx1, X[i]); bz0 = Math.min(bz0, Z[i]); bz1 = Math.max(bz1, Z[i]); }
    const CB = 64, nx = Math.ceil((bx1 - bx0) / CB) + 1, nz = Math.ceil((bz1 - bz0) / CB) + 1, cab = new Int32Array(nx * nz).fill(-1), sig = new Int32Array(N);
    for (let i = 0; i < N; i++) { const c = Math.floor((Z[i] - bz0) / CB) * nx + Math.floor((X[i] - bx0) / CB); sig[i] = cab[c]; cab[c] = i; }
    const puntaje = new Float32Array(N).fill(-1);
    const PQ = await cargar('data3d/parques.json').catch(() => []); await ceder();
    let t0 = performance.now();
    for (const p of PQ || []) {
      if (!p.pts || p.pts.length < 3 || /humedal/i.test(p.tipo || '')) continue;
      const v = p.pts.map(q => lw(q[0], q[1])); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      if (x1 < bx0 || x0 > bx1 || z1 < bz0 || z0 > bz1) continue;
      for (let cz = Math.max(0, Math.floor((z0 - bz0) / CB)); cz <= Math.min(nz - 1, Math.floor((z1 - bz0) / CB)); cz++) for (let cx = Math.max(0, Math.floor((x0 - bx0) / CB)); cx <= Math.min(nx - 1, Math.floor((x1 - bx0) / CB)); cx++)
        for (let i = cab[cz * nx + cx]; i >= 0; i = sig[i]) {
          const x = X[i], z = Z[i]; if (x < x0 || x > x1 || z < z0 || z > z1 || Hh[i] >= 18) continue;
          let dentro = false, dm = 1e9;
          for (let a = 0, b = v.length - 1; a < v.length; b = a++) { const A_ = v[a], B_ = v[b];
            if (((A_[1] > z) !== (B_[1] > z)) && (x < (B_[0] - A_[0]) * (z - A_[1]) / (B_[1] - A_[1]) + A_[0])) dentro = !dentro;
            const dx = B_[0] - A_[0], dz = B_[1] - A_[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - A_[0]) * dx + (z - A_[1]) * dz) / l2)), q = Math.hypot(x - A_[0] - t * dx, z - A_[1] - t * dz); if (q < dm) dm = q; }
          if (dentro) puntaje[i] = 0.55 * hash(i * 0.731 + 3) + 0.45 * Math.min(1, dm / 30); // junto a la calle (borde del parque) se pierde primero
        }
      if (performance.now() - t0 > 12) { await ceder(); t0 = performance.now(); }
    }
    // borde de los humedales (hasta 45 m afuera): el frente sucio primero
    for (const P of POL) { const { box, cx, cz, R, Dd } = P.mp, [x0, z0, sx, sz] = box;
      for (let c2 = Math.max(0, Math.floor((z0 - bz0) / CB)); c2 <= Math.min(nz - 1, Math.floor((z0 + sz - bz0) / CB)); c2++) for (let c1 = Math.max(0, Math.floor((x0 - bx0) / CB)); c1 <= Math.min(nx - 1, Math.floor((x0 + sx - bx0) / CB)); c1++)
        for (let i = cab[c2 * nx + c1]; i >= 0; i = sig[i]) { const qi = Math.floor((X[i] - x0) / cx), qj = Math.floor((Z[i] - z0) / cz); if (qi < 0 || qj < 0 || qi >= TEX || qj >= TEX || Hh[i] >= 18) continue;
          const k = qj * TEX + qi; if (Dd[k] > -45) { const s = 0.5 * hash(i * 0.731 + 3) + 0.5 * Math.min(1, R[k] / 260); puntaje[i] = puntaje[i] < 0 ? s : Math.min(puntaje[i], s); } } }
    await ceder();
    const lista = []; for (let i = 0; i < N; i++) if (puntaje[i] >= 0) lista.push(i);
    const NE = lista.length; if (!NE) return;
    lista.sort((a, b) => puntaje[a] - puntaje[b]);
    A.NE = NE; A.EI = Int32Array.from(lista); A.X32 = new Float32Array(NE); A.Z32 = new Float32Array(NE); A.TH = new Float32Array(NE); A.PHI = new Float32Array(NE);
    A.F = new Float32Array(NE).fill(1); A.MODO = new Uint8Array(NE); A.T0 = new Float32Array(NE); A.ORIG = new Float32Array(NE * 16); A.ORIGOK = new Uint8Array(NE); A.act = new Int32Array(NE);
    let tam = 1; while (tam < NE * 2) tam <<= 1; A.TAB = new Int32Array(tam); A.MASK = tam - 1;
    for (let e = 0; e < NE; e++) { const i = lista[e]; A.X32[e] = Math.fround(X[i]); A.Z32[e] = Math.fround(Z[i]); A.TH[e] = (e + 0.5) / NE; A.PHI[e] = hash(i * 1.37 + 11) * Math.PI * 2;
      let h = clave(A.X32[e], A.Z32[e]); while (A.TAB[h] !== 0) h = (h + 1) & A.MASK; A.TAB[h] = e + 1; }
    st.elegibles = NE; st.arboles = N;
    // donde cae un árbol queda el tocón y un claro de tierra pelada (la malla de Google tiene sus propios árboles: así se lee la pérdida)
    const tocG = new THREE.CircleGeometry(1, 14); tocG.rotateX(-Math.PI / 2); tocG.deleteAttribute('uv'); tocG.deleteAttribute('normal');
    const tocM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    tocM.onBeforeCompile = (sh) => {
      sh.vertexShader = 'varying vec2 vTc; varying vec2 vTi;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTc = position.xz; vTi = instanceMatrix[3].xz;').replace('#include <project_vertex>', ADELANTA(2.5));
      sh.fragmentShader = 'varying vec2 vTc; varying vec2 vTi;\n' + GLSL_RUIDO + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { float r = length(vTc), n = dgF(vTc * 2.2 + vTi * 0.37);
          float a = 1.0 - smoothstep(0.45, 1.0, r + (n - 0.5) * 0.5);
          vec3 c = mix(vec3(0.50, 0.43, 0.33), vec3(0.38, 0.32, 0.24), dgN(vTc * 6.0 + vTi));
          c = mix(c, vec3(0.62, 0.48, 0.30), smoothstep(0.13, 0.1, r));            // cara del corte
          c = mix(c, vec3(0.30, 0.20, 0.12), smoothstep(0.05, 0.03, abs(r - 0.075)) * 0.8); // anillos
          c = mix(c, vec3(0.16, 0.11, 0.07), smoothstep(0.12, 0.135, r) * smoothstep(0.17, 0.14, r)); // corteza
          if (a < 0.01) discard; diffuseColor.rgb = pow(c, vec3(2.2)); diffuseColor.a = a * 0.92; }`);
    };
    tocM.customProgramCacheKey = () => 'degradacion-tocon-v1';
    const toc = new THREE.InstancedMesh(tocG, tocM, NE), o3 = new THREE.Object3D();
    for (let e = 0; e < NE; e++) { const i = lista[e], s = 1.9 + hash(i * 0.91 + 5) * 1.2; o3.position.set(X[i], Y0() + 0.05, Z[i]); o3.rotation.set(0, hash(i * 0.37) * 6.28, 0); o3.scale.set(s, 1, s); o3.updateMatrix(); toc.setMatrixAt(e, o3.matrix); }
    toc.count = 0; toc.frustumCulled = false; toc.renderOrder = 4; toc.name = 'degradacion_tocones'; grupo.add(toc); A.toc = toc;
    // mallas instanciadas de árboles que dibuja real3d.js (cerca, medio, siluetas): se reconocen porque su primera instancia está en la base de un árbol
    for (const o of T3.scene.children) if (o.isInstancedMesh && o.instanceColor) A.cand.push(o);
    clasificar();
    if (!A.envuelto) { const orig = tr.update; tr.update = function (cam, force) { const r = orig.call(this, cam, force); if (A.ok && visible && listo) { const t = performance.now(); revisar(); const ms = performance.now() - t; st.msRev = Math.max(st.msRev || 0, ms); } return r; }; A.envuelto = true; }
    A.ok = true;
  }
  function clasificar() {
    const pos = T3.trees.pos, X = pos.X, Z = pos.Z, N = X.length;
    for (let c = A.cand.length - 1; c >= 0; c--) { const m = A.cand[c]; if (m.count <= 0) continue; A.cand.splice(c, 1);
      const a = m.instanceMatrix.array, x = a[12], y = a[13], z = a[14]; let es = false;
      if (y === 0) for (let i = 0; i < N; i++) if (Math.fround(X[i]) === x && Math.fround(Z[i]) === z) { es = true; break; }
      if (!es) continue;
      const M = { m, fwd: new Int32Array(m.instanceMatrix.count).fill(-1), rev: new Int32Array(A.NE).fill(-1), n: 0, ver: -1, rangos: 0, grande: !!(m.material && m.material.isMeshBasicMaterial), pase: -1 };
      A.mallas.push(M); remapear(M);
    }
    st.mallas = A.mallas.length;
  }
  // tras un recálculo de real3d.js: quién es quién en la malla, matriz original y se vuelve a aplicar la pérdida
  function remapear(M) {
    const m = M.m, a = m.instanceMatrix.array, fwd = M.fwd, rev = M.rev;
    for (let k = 0; k < M.n; k++) { const e = fwd[k]; if (e >= 0) { rev[e] = -1; fwd[k] = -1; } }
    M.n = m.count; let toca = false;
    // las copas vistas desde arriba (techos) repiten exactamente las siluetas: si su gemela ya se mapeó en este cuadro, se copia su mapa
    let G = null; if (M.grande) for (const Q of A.mallas) if (Q !== M && Q.grande && Q.pase === tFrame && Q.n === M.n && M.n > 0) { const b = Q.m.instanceMatrix.array; if (b[12] === a[12] && b[14] === a[14] && b[16 * (M.n - 1) + 12] === a[16 * (M.n - 1) + 12]) { G = Q; break; } }
    M.pase = tFrame;
    for (let k = 0; k < M.n; k++) { const o = k * 16; let e;
      if (G) { e = G.fwd[k]; if (e < 0) continue; } else { if (a[o + 13] !== 0) continue; e = buscar(a[o + 12], a[o + 14]); if (e < 0) continue; }
      fwd[k] = e; rev[e] = k;
      if (!A.ORIGOK[e]) { const O = A.ORIG, b = e * 16; for (let q = 0; q < 16; q++) O[b + q] = a[o + q]; A.ORIGOK[e] = 1; } // la matriz original de un árbol no cambia (misma en cerca, medio y siluetas)
      if (A.F[e] < 1 || A.MODO[e]) { escribir(a, o, e); toca = true; } }
    if (m.instanceMatrix.clearUpdateRanges) m.instanceMatrix.clearUpdateRanges(); // real3d.js reescribió todo: se sube completa (nunca solo los tramos de este módulo)
    if (toca) m.instanceMatrix.needsUpdate = true;
    M.ver = m.instanceMatrix.version; M.rangos = 0; M.toca = false;
  }
  /* después de cada update de real3d.js (mismo cuadro, antes de dibujar). Los árboles ya perdidos llevan OC = 0,999 (real3d.js los saca de las
     siluetas lejanas y los sigue poniendo cerca, donde se escalan a cero): sin árboles cayendo o creciendo solo hay que rehacer el mapa de las
     mallas cercanas (pocas instancias); el de las siluetas (~95 mil) espera a que haga falta. */
  function revisar() {
    if (A.cand.length) clasificar();
    const nada = A.nPerd === 0 && A.nAct === 0;
    for (const M of A.mallas) if (M.m.instanceMatrix.version !== M.ver || M.sucia) {
      if (nada || (M.grande && A.nAct === 0)) { if (M.m.instanceMatrix.clearUpdateRanges) M.m.instanceMatrix.clearUpdateRanges(); M.sucia = true; continue; }
      M.sucia = false; remapear(M);
    }
  }
  // matriz del árbol e con su estado: cae (gira sobre la base hacia PHI) y se encoge; al volver crece derecho desde el suelo
  const R3 = new Float32Array(9);
  function escribir(a, o, e) {
    const O = A.ORIG, b = e * 16; let s = A.F[e], ang = 0;
    if (A.MODO[e] === 1) { const u = 1 - s; ang = 1.5 * Math.min(1, u / 0.7) ** 2; s = u < 0.55 ? 1 : 1 - ((u - 0.55) / 0.45) ** 1.5; }
    if (s <= 0.001) { for (let q = 0; q < 12; q++) a[o + q] = 0; a[o + 12] = O[b + 12]; a[o + 13] = O[b + 13]; a[o + 14] = O[b + 14]; a[o + 15] = 1; return; }
    if (ang === 0) { for (let q = 0; q < 12; q++) a[o + q] = (q % 4 === 3 ? O[b + q] : O[b + q] * s); a[o + 12] = O[b + 12]; a[o + 13] = O[b + 13]; a[o + 14] = O[b + 14]; a[o + 15] = O[b + 15]; return; }
    const ph = A.PHI[e], kx = Math.cos(ph), kz = Math.sin(ph), c = Math.cos(ang), sn = Math.sin(ang), t = 1 - c; // giro sobre el eje horizontal (kx, 0, kz)
    R3[0] = t * kx * kx + c; R3[1] = sn * kz; R3[2] = t * kx * kz;
    R3[3] = -sn * kz; R3[4] = c; R3[5] = sn * kx;
    R3[6] = t * kx * kz; R3[7] = -sn * kx; R3[8] = t * kz * kz + c;
    for (let col = 0; col < 3; col++) { const x = O[b + col * 4], y = O[b + col * 4 + 1], z = O[b + col * 4 + 2];
      a[o + col * 4] = s * (R3[0] * x + R3[3] * y + R3[6] * z); a[o + col * 4 + 1] = s * (R3[1] * x + R3[4] * y + R3[7] * z); a[o + col * 4 + 2] = s * (R3[2] * x + R3[5] * y + R3[8] * z); a[o + col * 4 + 3] = 0; }
    a[o + 12] = O[b + 12]; a[o + 13] = O[b + 13]; a[o + 14] = O[b + 14]; a[o + 15] = 1;
  }
  function escribirArbol(e) {
    if (!A.ORIGOK[e]) return;
    for (const M of A.mallas) { const k = M.rev[e]; if (k < 0) continue; const at = M.m.instanceMatrix; escribir(at.array, k * 16, e);
      if (M.rangos >= 0 && at.addUpdateRange && M.rangos < 48) { at.addUpdateRange(k * 16, 16); M.rangos++; } else M.rangos = -1; M.toca = true; }
  }
  function cerrarCuadro() {
    for (const M of A.mallas) if (M.toca) { const at = M.m.instanceMatrix; if (M.rangos < 0 && at.clearUpdateRanges) at.clearUpdateRanges(); at.needsUpdate = true; M.ver = at.version; M.toca = false; M.rangos = 0; }
  }
  function moverFraccion(ahora) { // los árboles que cruzan su umbral empiezan a caer (o a crecer); si son muchos a la vez, escalonados
    const n = Math.max(0, Math.min(A.NE, Math.round(A.frac * A.NE)));
    if (n === A.nPerd) return;
    const tot = Math.abs(n - A.nPerd), e0 = Math.min(n, A.nPerd), e1 = Math.max(n, A.nPerd);
    /* salto grande (cambio de simulación, primer poner a mitad de camino): solo caen o crecen animados los árboles 3D cercanos; las siluetas
       lejanas cambian de una vez (subir 90 mil matrices en cada cuadro de la animación sería un tirón) */
    const salto = tot > 200;
    if (salto) for (const M of A.mallas) if (M.sucia || M.m.instanceMatrix.version !== M.ver) { M.sucia = false; remapear(M); }
    let nAnim = tot; if (salto) { nAnim = 0; for (let e = e0; e < e1; e++) if (A.MODO[e] || enCerca(e)) nAnim++; }
    const esc = nAnim > 40 ? Math.min(1500, nAnim * 2) : 0;
    let k = 0;
    const paso = (e, modo) => {
      if (salto && !A.MODO[e] && !enCerca(e)) { saltar(e, modo); return; }
      iniciar(e, modo, ahora + (esc ? esc * k / nAnim : 0)); k++;
    };
    if (n > A.nPerd) for (let e = A.nPerd; e < n; e++) paso(e, 1);
    else for (let e = A.nPerd - 1; e >= n; e--) paso(e, 2);
    A.nPerd = n; if (A.toc) A.toc.count = n; // tocones: los primeros n del orden de pérdida
  }
  const OCP = 0.999; // marca de «perdido» en real3d.js (T3.trees.pos.OC): fuera de las siluetas lejanas, pero sigue en las mallas cercanas
  function enCerca(e) { for (const M of A.mallas) if (!M.grande && M.rev[e] >= 0) return true; return false; }
  function saltar(e, modo) { // sin animación: queda perdido (o de vuelta) en este mismo cuadro
    const OC = T3.trees.pos.OC, i = A.EI[e];
    if (modo === 1) { A.F[e] = 0; if (OC[i] === 1) OC[i] = OCP; escribirArbol(e); }
    else { A.F[e] = 1; if (OC[i] === OCP) OC[i] = 1; let esta = false; for (const M of A.mallas) if (M.rev[e] >= 0) { esta = true; break; } if (esta) escribirArbol(e); else A.forzar = true; }
  }
  function iniciar(e, modo, t) {
    if (modo === 2) { const OC = T3.trees.pos.OC, i = A.EI[e]; if (OC[i] === OCP) { OC[i] = 1; let esta = false; for (const M of A.mallas) if (M.rev[e] >= 0) { esta = true; break; } if (!esta) A.forzar = true; } }
    if (A.MODO[e] === 0) A.act[A.nAct++] = e;
    if (A.MODO[e] && A.MODO[e] !== modo) t = Math.min(t, performance.now()); // da la vuelta a mitad de camino
    A.MODO[e] = modo; A.T0[e] = t;
  }
  function animarArboles(ahora) {
    for (let k = 0; k < A.nAct; k++) {
      const e = A.act[k], modo = A.MODO[e], u = (ahora - A.T0[e]) / (modo === 1 ? 1100 : 1300);
      if (u < 0) continue;
      if (modo === 1) A.F[e] = Math.max(0, Math.min(A.F[e], 1 - u)); else A.F[e] = Math.min(1, Math.max(A.F[e], u < 1 ? 1 - (1 - u) ** 3 : 1));
      const fin = modo === 1 ? A.F[e] <= 0 : A.F[e] >= 1;
      if (fin) { A.MODO[e] = 0; A.act[k] = A.act[--A.nAct]; k--; if (modo === 1) { const OC = T3.trees.pos.OC, i = A.EI[e]; if (OC[i] === 1) OC[i] = OCP; } }
      escribirArbol(e);
    }
    st.anim = A.nAct;
  }
  function restaurarArboles(on) { // ver(false): todos los árboles vuelven a su matriz original y a las siluetas; ver(true): se vuelve a aplicar la pérdida
    if (!A.ok) return;
    const OC = T3.trees.pos.OC; let cambia = false;
    for (let e = 0; e < A.NE; e++) { const i = A.EI[e];
      if (!on && OC[i] === OCP) { OC[i] = 1; cambia = true; } else if (on && A.F[e] <= 0 && !A.MODO[e] && OC[i] === 1) { OC[i] = OCP; cambia = true; } }
    for (const M of A.mallas) { const a = M.m.instanceMatrix.array; let toca = false;
      if (M.sucia || M.m.instanceMatrix.version !== M.ver) { if (on) { M.sucia = false; remapear(M); } else M.sucia = true; continue; } // mapa viejo: no se escribe a ciegas
      for (let k = 0; k < M.n; k++) { const e = M.fwd[k]; if (e < 0 || !A.ORIGOK[e] || (A.F[e] >= 1 && !A.MODO[e])) continue; const o = k * 16;
        if (on) escribir(a, o, e); else for (let q = 0; q < 16; q++) a[o + q] = A.ORIG[e * 16 + q]; toca = true; }
      if (toca) { if (M.m.instanceMatrix.clearUpdateRanges) M.m.instanceMatrix.clearUpdateRanges(); M.m.instanceMatrix.needsUpdate = true; } M.ver = M.m.instanceMatrix.version; }
    if (cambia) A.forzar = true; // las siluetas lejanas se rehacen una vez (real3d.js las filtra por OC)
  }
  function forzarArboles(ahora) { // un recálculo de real3d.js (una vez, y como mucho cada 1,5 s) para que entren o salgan de las siluetas lejanas
    if (!A.forzar || ahora - (A.tForzar || 0) < 3000) return;
    A.forzar = false; A.tForzar = ahora; const tr = T3.trees;
    if (tr && tr.plan && tr.plan.repintar) tr.plan.repintar();
  }

  /* ---------------------------------------------------------------- valores y transiciones ---------------------------------------------------------------- */
  const cuantil = (q, f) => { if (f <= 0) return 0; const x = Math.min(100, f * 100), i = Math.floor(x), t = x - i; return q[i] + (q[Math.min(100, i + 1)] - q[i]) * t; };
  function aplicarObjetivos(d) {
    for (const HU of H) {
      const h = (d.humedales || []).find(q => norm(q.nombre) === norm(HU.nombre)) || (d.humedales || []).find(q => Math.hypot(q.x - HU.x, q.z - HU.z) < 300);
      if (h) { const perd = Math.max(0, 1 - h.ha / (h.ha0 || h.ha || 1)), cont = Math.max(0, Math.min(1, 1 - (h.calidad != null ? h.calidad : 1)));
        const fr = Math.min(0.85, perd * AMP_REL), fm = Math.min(0.95, fr + cont * AMP_MAN);
        HU.tgt.D = cuantil(HU.q, fr); HU.tgt.W = Math.max(0, cuantil(HU.q, fm) - HU.tgt.D); HU.tgt.C = cont; }
      const b = (d.basuraHumedal || []).map(p => [p, Math.hypot(p.x - HU.bx, p.z - HU.bz)]).sort((a, c) => a[1] - c[1])[0];
      if (b && b[1] < 400) HU.tgt.A = Math.max(0, b[0].acumulada || 0);
    }
    if (d.arbolesPerdidos != null) A.fracT = Math.max(0, Math.min(1, d.arbolesPerdidos));
    tween = true;
  }
  let tween = false, tPrev = 0, tFrame = -1;
  function pintarHumedal(HU) {
    for (const P of HU.polis) { P.uni.uDgP.value.set(HU.cur.D, HU.cur.W, HU.cur.C, 0); const j = POL.indexOf(P); uAgua.uDgP.value[j].set(HU.cur.D, HU.cur.W, HU.cur.C, 0); }
    if (HU.bolsas) { HU.bolsas.count = Math.min(HU.nb, Math.round(HU.cur.A * 2.4)); HU.mont.count = Math.min(HU.nm, Math.round(HU.cur.A / 9)); }
  }
  function tick() {
    if (!listo || !visible) return;
    const ft = document.timeline ? document.timeline.currentTime : performance.now(); if (ft === tFrame) return; tFrame = ft;
    if (A.forzar) forzarArboles(performance.now());
    if (!tween && A.nAct === 0) { if (aguaMat !== (T3.waterMesh && T3.waterMesh.material)) parcharAgua(); return; }
    const t0 = performance.now(), dt = Math.min(0.1, tPrev ? (t0 - tPrev) / 1000 : 0.016); tPrev = t0;
    if (tween) {
      const k = 1 - Math.exp(-dt / 0.45); let sigue = false;
      for (const HU of H) { let cambia = false;
        for (const c of ['D', 'W', 'C', 'A']) { const d = HU.tgt[c] - HU.cur[c], eps = c === 'C' ? 1e-3 : c === 'A' ? 0.2 : 0.05; if (Math.abs(d) > eps) { HU.cur[c] += d * k; sigue = true; cambia = true; } else if (d !== 0) { HU.cur[c] = HU.tgt[c]; cambia = true; } }
        if (cambia) pintarHumedal(HU); }
      if (A.ok) { const d = A.fracT - A.frac; // salto grande: de una vez (los cercanos igual caen escalonados); salto chico: suave
        if (Math.abs(d) * A.NE > 300 || Math.abs(d) <= 1e-4) A.frac = A.fracT; else { A.frac += d * k; sigue = true; }
        moverFraccion(t0); cerrarCuadro(); }
      tween = sigue;
    }
    if (A.ok && A.nAct) { for (const M of A.mallas) if (M.sucia || M.m.instanceMatrix.version !== M.ver) { M.sucia = false; remapear(M); } animarArboles(t0); cerrarCuadro(); }
    if (!tween && A.nAct === 0) tPrev = 0;
    const ms = performance.now() - t0; st.ms = ms; st.msMax = Math.max(st.msMax, ms); st.cuadros++;
  }

  async function armar(d) {
    grupo = new THREE.Group(); grupo.name = 'degradacion'; T3.scene.add(grupo);
    await armarHumedales(d);
    try { await armarArboles(); } catch (e) { console.warn('degradación · árboles:', e); }
    if (RELOJ && RELOJ.alDibujar) RELOJ.alDibujar(tick); else { const bucle = () => { tick(); requestAnimationFrame(bucle); }; requestAnimationFrame(bucle); }
    listo = true;
  }

  const api = {
    _T3: T3, estado: st, get _arboles() { return A; }, // depuración desde la consola
    poner(d) {
      if (!d) return;
      pend = d;
      if (!armando) armando = armar(d).then(() => { aplicarObjetivos(pend); if (!visible) api.ver(false); }).catch(e => console.warn('degradación:', e));
      else if (listo) aplicarObjetivos(d);
      return armando;
    },
    ver(on) {
      on = !!on; if (on === visible) return; visible = on;
      if (grupo) grupo.visible = on;
      if (uAgua) uAgua.uDgOn.value = on ? 1 : 0;
      restaurarArboles(on);
      if (!on && A.forzar) { A.forzar = false; A.tForzar = 0; if (T3.trees && T3.trees.plan) T3.trees.plan.repintar(); }
      if (on) { tween = true; tPrev = 0; }
    }
  };
  window.KEN_DEGRADA = api;
  return api;
}
