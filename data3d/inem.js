/* ============ SECTOR INEM KENNEDY · modelo 3D oficial de Bogotá (IDECA / SDP, visor 3D, CityEngine) ============
   ~5.900 construcciones con fachadas fotográficas por lote, convertidas de 'Inem Kennedy.3ws' (tools/inem_3ws.py).
   Se carga después de lo principal (25 MB) para no demorar la apertura. En su caja se quitan las cajas genéricas propias. */
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export async function iniciarInem({ THREE, T3, OX, OZ, Y0 = 0.3 }) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gl = await new GLTFLoader().loadAsync('data3d/inem/inem.glb');
  const g = gl.scene; g.position.set(OX, Y0, OZ); g.name = 'inem-kennedy';
  g.traverse(o => { if (!o.isMesh) return; o.castShadow = false; o.receiveShadow = true; /* rendimiento: ~900 materiales; sin sombra propia y con descarte fuera de cámara */
    const m = o.material; m.side = THREE.DoubleSide; if (m.map) { m.map.anisotropy = 8; m.emissiveMap = m.map; m.emissive = new THREE.Color(1, 1, 1); m.emissiveIntensity = 0.55; m.color.setScalar(0.72); } m.roughness = 1; m.metalness = 0; o.geometry.computeVertexNormals(); m.needsUpdate = true; /* la foto de la fachada ya trae su luz: luz propia alta para que las caras en sombra no queden negras */ });
  T3.scene.add(g); T3.inem = g;
  /* RENDIMIENTO: son ~900 piezas con fachada propia (900 dibujos por cuadro). De lejos el sector se ve diminuto: más allá de 1,2 km de la cámara
     (700 m con tarjeta gráfica integrada) las piezas no se dibujan. Se apaga un grupo interno: la visibilidad de g la siguen manejando los escenarios. */
  const dentro = new THREE.Group(); dentro.name = 'inem-piezas'; while (g.children.length) dentro.add(g.children[0]); g.add(dentro);
  const caja = new THREE.Box3().setFromObject(g), esf = caja.getBoundingSphere(new THREE.Sphere()), LIM0 = esf.radius; /* + 1.200 m (alto), 850 (medio), 550 (liviano): data3d/calidad.js, en vivo */
  setInterval(() => { const c = T3.camera; if (!c) return; const v = c.position.distanceTo(esf.center) < LIM0 + (window.KEN_CALIDAD ? window.KEN_CALIDAD.cfg.inem : 1200); if (dentro.visible !== v) dentro.visible = v; }, 400);
  fusionar({ THREE, T3, g, dentro }).catch(e => console.warn('INEM · fusión de piezas (quedan las piezas sueltas):', e));
  return g;
}

/* FUSIÓN EN POCAS MALLAS (rendimiento 2026-11-27: el INEM eran 901 llamadas de dibujo por cuadro, más de un tercio de toda la escena).
   Cada pieza tiene su foto de fachada y 595 la repiten a lo largo del muro (coordenadas de textura hasta 8), así que no sirve un atlas.
   Se usan ARREGLOS DE TEXTURAS de WebGL2 (sampler2DArray): las fotos se agrupan por tamaño llevado a la potencia de 2 de arriba (agrandar no quita
   nitidez; 22 grupos), cada grupo es un arreglo con repetición, mipmaps y anisotropía 8, y todas sus piezas una sola malla con la capa por vértice.
   901 → ~22 llamadas. Se arma grupo por grupo en ratos libres; mientras tanto se ven las piezas sueltas de siempre. Sin WebGL2 no se toca nada. */
async function fusionar({ THREE, T3, g, dentro }) {
  const r = T3.renderer; if (!r || !r.capabilities || !r.capabilities.isWebGL2) return;
  const libre = () => new Promise(res => (window.requestIdleCallback ? requestIdleCallback(() => res(), { timeout: 400 }) : setTimeout(res, 50)));
  const p2 = (v) => 1 << Math.ceil(Math.log2(Math.max(1, v)));
  g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), rel = new THREE.Matrix4();
  const grupos = new Map();
  dentro.traverse(o => { if (!o.isMesh || Array.isArray(o.material)) return; const img = o.material.map && o.material.map.image; if (!img || !img.width) return;
    const w = p2(img.width), h = p2(img.height), k = w + 'x' + h; let G = grupos.get(k); if (!G) grupos.set(k, G = { w, h, capas: new Map(), piezas: [] });
    if (!G.capas.has(img)) G.capas.set(img, G.capas.size); G.piezas.push(o); });
  const blanco = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blanco.needsUpdate = true; /* solo para que el sombreador traiga las coordenadas de textura (USE_MAP) */
  const lienzo = new OffscreenCanvas(8, 8), ctx = lienzo.getContext('2d', { willReadFrequently: true });
  for (const G of grupos.values()) {
    await libre();
    const { w, h } = G, n = G.capas.size, datos = new Uint8Array(w * h * 4 * n);
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
    for (const [img, i] of G.capas) { ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); datos.set(ctx.getImageData(0, 0, w, h).data, i * w * h * 4); }
    const tex = new THREE.DataArrayTexture(datos, w, h, n); tex.format = THREE.RGBAFormat; tex.type = THREE.UnsignedByteType; tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.anisotropy = 8; tex.needsUpdate = true;
    tex.onUpdate = () => { tex.image.data = null; }; /* ya está en la tarjeta: se suelta la copia en memoria (~370 MB entre todos los grupos) */
    await libre();
    const geos = [];
    for (const o of G.piezas) { const s = o.geometry, ge = new THREE.BufferGeometry(); rel.multiplyMatrices(inv, o.matrixWorld);
      for (const a of ['position', 'normal', 'uv']) if (s.attributes[a]) ge.setAttribute(a, s.attributes[a].clone());
      if (!ge.attributes.normal || !ge.attributes.uv) continue;
      const nv = ge.attributes.position.count; ge.setIndex(s.index ? s.index.clone() : new THREE.BufferAttribute(nv > 65535 ? Uint32Array.from({ length: nv }, (_, i) => i) : Uint16Array.from({ length: nv }, (_, i) => i), 1));
      ge.applyMatrix4(rel); ge.setAttribute('aCapa', new THREE.BufferAttribute(new Float32Array(nv).fill(G.capas.get(o.material.map.image)), 1)); geos.push(ge); }
    if (!geos.length) continue;
    const geo = mergeGeometries(geos); geos.forEach(x => x.dispose()); if (!geo) continue; geo.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ map: blanco, color: new THREE.Color().setScalar(0.72), emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 1, metalness: 0, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uCapas = { value: tex };
      sh.vertexShader = 'attribute float aCapa;\nvarying float vCapa;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCapa = aCapa;');
      sh.fragmentShader = 'uniform highp sampler2DArray uCapas;\nvarying float vCapa;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = texture( uCapas, vec3( vMapUv, floor( vCapa + 0.5 ) ) );\ndiffuseColor *= sampledDiffuseColor;')
        .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= sampledDiffuseColor.rgb; /* la foto ya trae su luz (como emissiveMap = map) */'); };
    mat.customProgramCacheKey = () => 'inem-capas-v1';
    const malla = new THREE.Mesh(geo, mat); malla.name = 'inem-' + w + 'x' + h; malla.castShadow = false; malla.receiveShadow = true;
    dentro.add(malla); if (window.KEN_INEM_LISTO) window.KEN_INEM_LISTO(); /* gris01.js: recorte del terreno liberado en Corabastos sobre los materiales nuevos */
    for (const o of G.piezas) o.parent && o.parent.remove(o);
    const viejas = G.piezas; setTimeout(() => { for (const o of viejas) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }, 8000); /* se sueltan después: si otro módulo está compilando la escena (compileAsync), soltar un material en medio rompe three (program.isReady de undefined) */
  }
  T3.inemFusionado = { grupos: grupos.size, mallas: dentro.children.length };
}
