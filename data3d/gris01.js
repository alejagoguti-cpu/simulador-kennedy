/* ============ BLANCO Y NEGRO DE LA SIMULACIÓN 01 (los dos escenarios; v4 de la autora, 2026-11-26) ============
   gris01(T3, on): edificios, vías y la foto de Google en blanco y negro; lo demás sigue en color: árboles (los propios y los de la foto),
   agua y humedales, fauna, huertas, mercados, medidores, residuos, carros y las vías coloreadas por tráfico (esas son mallas aparte, no se tocan).
   · Malla de Google: uniforme uGrisV del sombreador de recorte (index.html). Desatura todo MENOS lo verde de la foto (árboles, prados, cerros),
     que se detecta por color (verde claramente por encima de rojo y azul), así los árboles reales de la foto quedan en color.
   · Edificios y vías del modelo: una uniforme propia (uGris01) al final del sombreador de SUS materiales (T3.matEdif, T3.matTecho, T3.suelo,
     T3.viasMallas), no de toda la escena. Al salir se devuelve todo como estaba. */
const GR = { value: 0 };
/* además, con propuesta, los edificios y vías del modelo dentro del terreno liberado de Corabastos (el humedal) no se dibujan. Sin texturas
   (esos materiales ya llegan al tope de 16 unidades de textura con las sombras): el terreno liberado es «dentro del predio de Corabastos y
   fuera de la envolvente de las naves que quedan», dos polígonos en uniformes (los pone data3d/propuesta01_3d.js en HOYO). */
const NP = 40, NH = 24;
class V2 { constructor() { this.x = 0; this.y = 0; } toArray(a = [], o = 0) { a[o] = this.x; a[o + 1] = this.y; return a; } } // lo mínimo que pide three.js para un arreglo de vec2
export const HOYO = { on: { value: 0 }, P: { value: Array.from({ length: NP }, () => new V2()) }, nP: { value: 0 }, H: { value: Array.from({ length: NH }, () => new V2()) }, nH: { value: 0 } };
const GLSL_HOYO = `varying vec3 vWH01; uniform float uHoyo01; uniform vec2 uHP01[${NP}]; uniform int uHPn01; uniform vec2 uHH01[${NH}]; uniform int uHHn01;
bool dentroP01(vec2 p) { bool c = false; for (int i = 0; i < ${NP - 1}; i++) { if (i >= uHPn01 - 1) break; vec2 a = uHP01[i], b = uHP01[i + 1]; if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
bool dentroH01(vec2 p) { bool c = false; for (int i = 0; i < ${NH - 1}; i++) { if (i >= uHHn01 - 1) break; vec2 a = uHH01[i], b = uHH01[i + 1]; if ((a.y > p.y) != (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
`;
/* conGris = false: solo el recorte del terreno liberado, sin blanco y negro (modelo oficial del sector INEM, data3d/inem.js: su caja cubre la mitad
   oriental de Corabastos y sus bodegas quedaban como techos blancos flotando sobre el humedal; pedido de la autora 2026-11-27) */
function parchar(m, conGris = true) {
  if (!m || m.userData._gris01 || m.isRawShaderMaterial || m.glslVersion === '300 es') return;
  m.userData._gris01 = true; const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
  m.onBeforeCompile = function (sh, r) { if (prev) prev.call(this, sh, r); sh.uniforms.uGris01 = GR; let fs = sh.fragmentShader, k = fs.lastIndexOf('}'); if (k < 0) return;
    const gris = conGris ? '\n  { float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(l), uGris01); }\n' : '\n';
    const fm = fs.indexOf('void main()');
    if (fm >= 0 && sh.vertexShader.includes('#include <project_vertex>')) {
      Object.assign(sh.uniforms, { uHoyo01: HOYO.on, uHP01: HOYO.P, uHPn01: HOYO.nP, uHH01: HOYO.H, uHHn01: HOYO.nH });
      sh.vertexShader = 'varying vec3 vWH01;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 wh = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwh = instanceMatrix * wh;\n#endif\nvWH01 = (modelMatrix * wh).xyz; }');
      const ab = fs.indexOf('{', fm) + 1;
      sh.fragmentShader = 'uniform float uGris01;\n' + fs.slice(0, fm) + GLSL_HOYO + fs.slice(fm, ab) + '\n  if (uHoyo01 > 0.5 && dentroP01(vWH01.xz) && !dentroH01(vWH01.xz)) discard;\n' + fs.slice(ab, k) + gris + fs.slice(k);
      return; }
    sh.fragmentShader = 'uniform float uGris01;\n' + fs.slice(0, k) + gris + fs.slice(k); };
  m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(this) : '') + (conGris ? '|gris01' : '|hoyo01'); };
  m.needsUpdate = true;
}
/* propuesta01_3d.js: hoyo(P, H) con los polígonos en el mundo (x, z); hoyo(null) lo apaga */
export function hoyo01(T3, P, H) {
  if (!P) { HOYO.on.value = 0; return; }
  P = P.concat([P[0]]); H = H.concat([H[0]]); // cerrados: el último vértice repite el primero (índices constantes en GLSL)
  P.slice(0, NP).forEach((p, i) => { HOYO.P.value[i].x = p[0]; HOYO.P.value[i].y = p[1]; }); HOYO.nP.value = Math.min(NP, P.length);
  H.slice(0, NH).forEach((p, i) => { HOYO.H.value[i].x = p[0]; HOYO.H.value[i].y = p[1]; }); HOYO.nH.value = Math.min(NH, H.length);
  HOYO.on.value = 1; materiales(T3).forEach(m => parchar(m));
  inem(T3);
}
/* el modelo INEM carga tarde (25 MB): si aún no está, se reintenta mientras el recorte siga prendido */
let inemT = 0;
function inem(T3) { if (!T3.inem) { if (!inemT) inemT = setTimeout(() => { inemT = 0; if (HOYO.on.value) inem(T3); }, 2000); return; }
  T3.inem.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => parchar(m, false)); }); }
function materiales(T3) { const L = []; if (T3.matEdif) L.push(T3.matEdif); if (T3.matTecho) L.push(...Object.values(T3.matTecho)); if (T3.suelo) for (const k of ['via', 'acera', 'piso']) if (T3.suelo[k]) L.push(T3.suelo[k]);
  for (const m of T3.viasMallas || []) if (m && m.material) L.push(...(Array.isArray(m.material) ? m.material : [m.material])); return L.filter(m => m && m.isMaterial); }
let ON = false;
export function gris01(T3, on) {
  on = !!on; if (on === ON || !T3) return; ON = on;
  if (on) materiales(T3).forEach(m => parchar(m));
  GR.value = on ? 1 : 0;
  if (T3.maskU && T3.maskU.uGrisV) T3.maskU.uGrisV.value = on ? 1 : 0;
}
export const gris01Activo = () => ON;
