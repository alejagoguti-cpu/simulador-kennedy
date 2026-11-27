/* ============ MARCA DE LOS CARROS MORADOS (con propuesta, simulaciones 01–06; pedido de la autora 2026-11-27) ============
   «Que se vea que los carros morados van hacia los mercados nuevos»: los carros solos se pierden en la vista alta. Cada carro morado lleva
   un punto morado brillante de tamaño fijo en pantalla (se ve desde la vista principal y de cerca no tapa el carro) y una estela corta
   detrás, en el sentido en que va: hacia el mercado. La usan abasto_capas.js (01), mov02_capa.js (02) y propuesta_flujos.js (03–06).
   API: const M = crearMarcasMorados({ T3, max }); por cuadro M.inicio(); M.poner(x, y, z, ruta, s) por carro (ruta {P, S} hacia el mercado, s = m recorridos); M.fin();
   M.ver(bool). */
import * as THREE from 'three';
const ESTELA = 9, PASO = 10; /* puntos de estela detrás de cada carro y separación (m) */
export function crearMarcasMorados({ T3, max = 40 }) {
  const N = max * (ESTELA + 1), pos = new Float32Array(N * 3), a = new Float32Array(N);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aK', new THREE.BufferAttribute(a, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uPx: { value: (window.devicePixelRatio || 1) } },
    vertexShader: 'attribute float aK; uniform float uPx; varying float vK; void main(){ vK = aK; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (aK > 0.99 ? 17.0 : mix(4.0, 11.0, aK)); }',
    /* cabeza: disco morado con centro claro y anillo oscuro (se despega de la foto clara); estela: puntos morados que se apagan hacia atrás */
    fragmentShader: 'varying float vK; void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard; vec3 mor = vec3(0.64, 0.11, 1.0);' +
      ' if (vK > 0.99) { vec3 c = r < 0.38 ? vec3(0.97, 0.9, 1.0) : r < 0.78 ? mor : vec3(0.1, 0.03, 0.16); gl_FragColor = vec4(c, 1.0 - smoothstep(0.92, 1.0, r)); return; }' +
      ' gl_FragColor = vec4(mor, (1.0 - smoothstep(0.55, 1.0, r)) * (0.3 + 0.7 * vK)); }' });
  const pts = new THREE.Points(g, mat); pts.name = 'morados_marca'; pts.frustumCulled = false; pts.renderOrder = 30; T3.scene.add(pts);
  let n = 0;
  return {
    inicio() { n = 0; },
    /* r = ruta { P: [[x, z]…], S: largo acumulado } en el sentido de marcha, s = metros recorridos: la estela sigue la calle hacia atrás */
    poner(x, y, z, r, s, lat = 1.8) { if (n + ESTELA + 1 > N || (T3.enCierre && T3.enCierre(x, z))) return; const yy = y + 4;
      pos[n * 3] = x; pos[n * 3 + 1] = yy; pos[n * 3 + 2] = z; a[n] = 1; n++;
      for (let k = 1; k <= ESTELA; k++) { const sk = s - PASO * k; if (sk < 0) break; let i = 0, j = r.S.length - 1; while (j - i > 1) { const m = (i + j) >> 1; if (r.S[m] < sk) i = m; else j = m; }
        const f = (sk - r.S[i]) / Math.max(1e-6, r.S[j] - r.S[i]), ex = r.P[j][0] - r.P[i][0], ez = r.P[j][1] - r.P[i][1], l = Math.hypot(ex, ez) || 1;
        pos[n * 3] = r.P[i][0] + ex * f - ez / l * lat; pos[n * 3 + 1] = yy; pos[n * 3 + 2] = r.P[i][1] + ez * f + ex / l * lat; a[n] = 0.85 * (1 - k / (ESTELA + 1)); n++; } },
    fin() { g.setDrawRange(0, n); g.attributes.position.needsUpdate = true; g.attributes.aK.needsUpdate = true; mat.uniforms.uPx.value = window.devicePixelRatio || 1; pts.visible = n > 0; },
    ver(on) { pts.visible = !!on && n > 0; if (!on) { n = 0; g.setDrawRange(0, 0); } },
    get n() { return n; }
  };
}
