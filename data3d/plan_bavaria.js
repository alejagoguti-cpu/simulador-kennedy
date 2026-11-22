/* ============ PLAN PARCIAL FÁBRICA BAVARIA en 3D, construido por etapas (escenario «Plan parcial») ============
   Datos: data3d/plan_bavaria.json (tools/plan_bavaria_build.mjs): 37 manzanas cerradas con patio (ladrillo / blanco) y torres sobre la
   Av. Boyacá, 14.300 viviendas, parque central y bosque denso conservados (Decreto 364 de 2017, modificación 2023; imágenes de Metrovivienda 2017).
   Cada manzana se construye en su año (etapa 1–10): aparece la obra (gris), sube piso a piso durante el año y al terminar toma su material.
   Geometría ESQUEMÁTICA: la forma exacta de cada edificio no está publicada; la retícula, las alturas (6–10 pisos y torres de 20) y el
   reparto siguen las imágenes del plan. Se ve solo cuando el escenario activo es el del plan parcial (window.KEN_PLANBAV.ver). */
import { RELOJ } from './reloj.js?v=5';

export async function iniciarPlanBavaria({ T3 }) {
  const THREE = T3.THREE, P = await (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/plan_bavaria.json?v=1');
  const { BW, BD, ANILLO } = P.dims, ang = P.angulo, PISO = 3.0;
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const mats = {
    ladrillo: new THREE.MeshStandardMaterial({ color: 0xb4643f, roughness: 0.85 }),
    blanco: new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.7 }),
    obra: new THREE.MeshStandardMaterial({ color: 0x8f949a, roughness: 0.9, transparent: true, opacity: 0.85 })
  };
  // piezas: cada manzana = 4 barras del anillo (o 1 torre de 30 x 30 m)
  const piezas = [];
  for (const m of P.manzanas) {
    const [x, z] = T3.lw(m.c[0], m.c[1]), a = -ang; // el modelo tiene y al norte; el mundo z al sur: el ángulo cambia de signo
    const alto = m.pisos * PISO;
    const partes = m.torre ? [[0, 0, 30, 30]] : [[0, -(BD - ANILLO) / 2, BW, ANILLO], [0, (BD - ANILLO) / 2, BW, ANILLO], [-(BW - ANILLO) / 2, 0, ANILLO, BD - 2 * ANILLO], [(BW - ANILLO) / 2, 0, ANILLO, BD - 2 * ANILLO]];
    for (const [du, dv, w, d] of partes) {
      const px = x + du * Math.cos(a) - dv * Math.sin(a), pz = z + du * Math.sin(a) + dv * Math.cos(a);
      piezas.push({ x: px, z: pz, w, d, a, alto, etapa: m.etapa, mat: m.material });
    }
  }
  const mk = (mat) => { const im = new THREE.InstancedMesh(box, mat, piezas.length); im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; T3.scene.add(im); return im; };
  const IM = { ladrillo: mk(mats.ladrillo), blanco: mk(mats.blanco), obra: mk(mats.obra) };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), V = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let visible = false, ultimo = '';
  const y0 = () => (T3.sueloY != null ? T3.sueloY : 0.3);
  const pintar = () => {
    const años = RELOJ.sem / 52; // años transcurridos del modelo
    const clave = visible + '|' + Math.round(años * 52); if (clave === ultimo) return; ultimo = clave;
    const n = { ladrillo: 0, blanco: 0, obra: 0 };
    if (visible) for (const p of piezas) {
      const prog = Math.max(0, Math.min(1, años - (p.etapa - 1))); // 0 antes de su año, sube durante su año, 1 al terminar
      if (prog <= 0) continue;
      const k = prog < 1 ? 'obra' : p.mat, alto = Math.max(PISO, Math.ceil(prog * p.alto / PISO) * PISO);
      Q.setFromAxisAngle(Y, -p.a); V.set(p.x, y0(), p.z); S.set(p.w, alto, p.d); M.compose(V, Q, S); IM[k].setMatrixAt(n[k]++, M);
    }
    for (const k in IM) { IM[k].count = n[k]; IM[k].instanceMatrix.needsUpdate = true; IM[k].visible = visible; }
  };
  RELOJ.alDibujar(pintar);
  const api = {
    ver(on) { visible = !!on; ultimo = ''; pintar(); },
    get visible() { return visible; },
    // resumen del avance para paneles y para el modelo: viviendas terminadas, árboles quitados, personas (viviendas × personas por hogar)
    avance(años) { let viv = 0, man = 0; for (const m of P.manzanas) if (años >= m.etapa) { viv += m.viviendas; man++; }
      let arb = 0; for (let e = 0; e < P.arboles_quitados_por_etapa.length; e++) if (años >= e + 1) arb += P.arboles_quitados_por_etapa[e];
      return { viviendas: viv, manzanas: man, totalManzanas: P.manzanas.length, arboles: arb, totalViviendas: P.total_viviendas }; },
    datos: P
  };
  window.KEN_PLANBAV = api;
  return api;
}
