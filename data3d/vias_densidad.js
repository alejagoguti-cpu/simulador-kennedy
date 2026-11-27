/* ============ VÍAS QUE MIDEN LOS CARROS (v5.2, pedido de la autora 2026-11-26: «colores de las vías realistas, que midan de verdad la
   cantidad de carros en cada vía») — las 6 simulaciones ============
   window.KEN_VIAS = { ver(on), extra(id, fn), medir(x, z, r), info() }
   QUÉ SE MIDE: la DENSIDAD de vehículos de cada tramo de vía, contando los vehículos que de verdad se dibujan en el mapa:
     · los carros, motos y camiones de la simulación de tráfico (grabación SUMO, T3.TRAF.vis: posición de cada vehículo en el cuadro; ya
       incluye cuántos salen según la hora y el factor de tráfico del modelo semanal, KEN_TRAF_F);
     · los vehículos propios de cada simulación que se registran con extra(id, fn) (en la 01: camiones que llegan o hacen fila en Corabastos y
       carros morados que van a los mercados, abasto_capas.js).
   CÓMO: todas las vías de data3d/net.json (arterias, intermedias y locales) se cortan en tramos de ≤ 60 m. Cada 0,6 s cada vehículo se asigna al tramo más cercano
   (rejilla espacial de 30 m; a menos de medio ancho de la vía + 4 m). Densidad k = vehículos del tramo ÷ (largo en km × carriles), con
   carriles = ancho ÷ 3,5 m (el mismo ancho con que se dibujan: arterias 15 m → 4 carriles, intermedias 10 m → 3, locales 6 m → 2; los dos sentidos juntos). Las calles locales solo se pintan cuando tienen vehículos.
   Se suaviza en el tiempo (constante de 4 s) para que no titile con cada semáforo.
   COLOR: k ÷ 28 veh/km/carril. 28 veh/km/carril ≈ 45 vehículos livianos/milla/carril, la densidad del límite del nivel de servicio E/F
   (capacidad: ≈ 2.000 veh/h/carril a ≈ 72 km/h; Highway Capacity Manual, TRB 2016, tablas de nivel de servicio por densidad: A ≤ 7, B ≤ 11,
   C ≤ 16, D ≤ 22, E ≤ 28 veh/km/carril). Verde = niveles A–C (k < 16, fluido), amarillo = D–E (16–28, denso), carmesí = F (≥ 28, trancón).
   Las mismas bandas bien separadas de antes (verde puro hasta 0,52, paso corto a amarillo en 0,6, amarillo hasta 0,8, carmesí en 1,0).
   [SUP declarados] los vehículos del mapa son una muestra de la grabación SUMO (hasta 3 copias desfasadas en hora pico): la densidad medida es
   la de lo que se ve, no un aforo; motos y camiones cuentan como 1 vehículo. */
import { RELOJ } from './reloj.js?v=5';

export const KC = 28;                    // veh/km/carril: límite del nivel de servicio E/F (HCM 2016)
export const LOS = [[7, 'A'], [11, 'B'], [16, 'C'], [22, 'D'], [28, 'E'], [Infinity, 'F']];
export const nivelLOS = (k) => LOS.find(l => k <= l[0])[1];
const ANCHO = { major: 15, mid: 10, local: 6 }, TRAMO = 60, CEL = 30, CADA = 0.6, TAU = 4, VENTANA = 150;

export function crearViasDensidad({ T3 }) {
  if (window.KEN_VIAS) return window.KEN_VIAS;
  const THREE = T3.THREE, lw = T3.lw;
  const grupo = new THREE.Group(); grupo.name = 'vias_densidad'; grupo.visible = false; T3.scene.add(grupo);
  const VS = `attribute float aS; attribute float aC0; attribute float aC1; attribute float aL; uniform float uT; uniform float uMix; varying float vS; varying float vC; varying float vL;
    void main(){ vC = mix(aC0, aC1, uMix); vL = aL; vS = aS - uT * 26.0 / (1.0 + vC); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`; /* v5.2: el color pasa suave de una medición a la siguiente (uMix 0 → 1 en 0,6 s): sin saltos */
  const FS = `uniform float uOp; varying float vS; varying float vC; varying float vL;
    void main(){ vec3 g = vec3(0.10,0.85,0.30), a = vec3(1.0,0.86,0.08), r = vec3(0.62,0.0,0.14); /* verde fluido · amarillo · carmesí de trancón */
      vec3 col = vC < 0.6 ? mix(g, a, smoothstep(0.52, 0.6, vC)) : mix(a, r, smoothstep(0.8, 1.0, vC));
      float per = 40.0 + 30.0 / (1.0 + vC); float f = fract(vS / per); float raya = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.5, 0.6, f));
      gl_FragColor = vec4(col * (0.82 + 0.18 * raya), uOp * (vL > 0.5 ? smoothstep(0.03, 0.12, vC) : 1.0)); }`; /* calles locales: solo se pintan si tienen vehículos */
  const V = { listo: false, mesh: null, n: 0, L: null, car: null, k: null, kS: null, cnt: null, F: 2.4, kVeh: 0, vTr: null, aC: null, grid: new Map(), extras: new Map(), t: 0, ult: 0, medidos: 0 };
  function armar() { const N = T3.net; if (!N || !N.edges) return false;
    const P = [], S = [], C = [], LL = [], ix = [], vTr = [], Ls = [], cars = [], tip = [], mx = [], mz = [], ml = []; let nv = 0, nt = 0;
    const meter = (t, ax, az, bx, bz, hw) => { const l = Math.hypot(bx - ax, bz - az), pasos = Math.max(1, Math.ceil(l / (CEL * 0.5))), vistas = new Set();
      for (let k = 0; k <= pasos; k++) { const x = ax + (bx - ax) * k / pasos, z = az + (bz - az) * k / pasos, key = Math.floor(x / CEL) * 100003 + Math.floor(z / CEL);
        if (vistas.has(key)) continue; vistas.add(key); let c = V.grid.get(key); if (!c) V.grid.set(key, c = []); c.push(t, ax, az, bx, bz, hw * hw); } };
    for (const [tipo, p] of N.edges) { if (!ANCHO[tipo] || p.length < 2) continue; const loc = tipo === 'local';
      const w = p.map(([x, z]) => lw(x, z)), an = ANCHO[tipo], hw = an / 2 + 4, carr = Math.max(1, Math.round(an / 3.5)); let Ltot = 0;
      for (let i = 1; i < w.length; i++) Ltot += Math.hypot(w[i][0] - w[i - 1][0], w[i][1] - w[i - 1][1]); if (Ltot < 30) continue;
      const nT = Math.max(1, Math.round(Ltot / TRAMO)), lT = Ltot / nT, t0 = nt; nt += nT; for (let k = 0; k < nT; k++) { Ls.push(lT); cars.push(carr); tip.push(loc ? 2 : tipo === 'mid' ? 1 : 0); mx.push(0); mz.push(0); ml.push(0); }
      const ancho = tipo === 'major' ? 9 : tipo === 'mid' ? 6 : 3;
      for (const lado of (loc ? [1] : [1, -1])) { let s = 0; /* calles locales: una sola cinta centrada */
        for (let i = 1; i < w.length; i++) { const [x0, z0] = w[i - 1], [x1, z1] = w[i], l = Math.hypot(x1 - x0, z1 - z0); if (l < 0.5) continue;
          const tr = t0 + Math.min(nT - 1, Math.floor((s + l / 2) / lT)); if (lado > 0) { meter(tr, x0, z0, x1, z1, hw); mx[tr] += (x0 + x1) / 2 * l; mz[tr] += (z0 + z1) / 2 * l; ml[tr] += l; }
          const ux = (x1 - x0) / l, uz = (z1 - z0) / l, nx = -uz * lado, nz = ux * lado, o0 = loc ? -ancho : ancho * 0.15, o1 = ancho * 1.15, sa = lado > 0 ? s : Ltot - s, sb = lado > 0 ? s + l : Ltot - s - l;
          P.push(x0 + nx * o0, 0, z0 + nz * o0, x0 + nx * o1, 0, z0 + nz * o1, x1 + nx * o0, 0, z1 + nz * o0, x1 + nx * o1, 0, z1 + nz * o1);
          S.push(sa, sa, sb, sb); C.push(0, 0, 0, 0); LL.push(loc, loc, loc, loc); vTr.push(tr, tr, tr, tr); ix.push(nv, nv + 1, nv + 2, nv + 1, nv + 3, nv + 2); nv += 4; s += l; } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
    const aC = new THREE.Float32BufferAttribute(C, 1), aC0 = new THREE.Float32BufferAttribute(C.slice(), 1); aC.setUsage(THREE.DynamicDrawUsage); aC0.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aC1', aC); g.setAttribute('aC0', aC0); g.setAttribute('aL', new THREE.Float32BufferAttribute(LL.map(Number), 1));
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(ix, 1) : new THREE.Uint16BufferAttribute(ix, 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { uT: { value: 0 }, uOp: { value: 0.65 }, uMix: { value: 1 } }, transparent: true, depthWrite: false, depthTest: true,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8, side: THREE.DoubleSide, toneMapped: false });
    /* v5.2 SIN TITILAR: la cinta va 0,28 m SOBRE el asfalto propio (vías a 0,62 m, rayas a 0,64 m: antes quedaba casi coplanar y peleaba la
       profundidad) y por debajo de la carrocería de los carros (≈ 0,6 m sobre el asfalto): los carros la tapan; no escribe profundidad */
    const mesh = new THREE.Mesh(g, mat); mesh.position.y = 0.12; mesh.renderOrder = 2; mesh.frustumCulled = false; grupo.add(mesh);
    Object.assign(V, { listo: true, mesh, n: nt, L: Float32Array.from(Ls), car: Uint8Array.from(cars), k: new Float32Array(nt), kS: new Float32Array(nt), cnt: new Uint16Array(nt), vTr: Uint32Array.from(vTr), aC, aC0, tMed: 0 });
    /* v5.3 VENTANA: el conteo de un tramo de 60 m es ruido (1 carro = 4–16 veh/km/carril). Cada tramo mide la densidad de la ventana de VENTANA m a su
       alrededor, con los tramos del mismo tipo de vía (arteria con arteria, local con local): carros de la ventana ÷ (km × carriles de la ventana) */
    const nb = new Map(), R2 = VENTANA * VENTANA, CV = VENTANA; const kc = (x, z) => Math.floor(x / CV) * 100003 + Math.floor(z / CV);
    for (let t = 0; t < nt; t++) { if (ml[t] > 0) { mx[t] /= ml[t]; mz[t] /= ml[t]; } else { mx[t] = mz[t] = 1e9; } const key = kc(mx[t], mz[t]); let a = nb.get(key); if (!a) nb.set(key, a = []); a.push(t); }
    V.mx = Float32Array.from(mx); V.mz = Float32Array.from(mz); /* centros de tramo para las zonas de cada simulación (KEN_VIAS_ZONAS) */
    const off = new Int32Array(nt + 1), lst = []; for (let t = 0; t < nt; t++) { off[t] = lst.length; if (mx[t] > 1e8) { lst.push(t); continue; } const cx = Math.floor(mx[t] / CV), cz = Math.floor(mz[t] / CV);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = nb.get((cx + i) * 100003 + cz + j); if (!a) continue; for (const u of a) if (tip[u] === tip[t] && (mx[u] - mx[t]) ** 2 + (mz[u] - mz[t]) ** 2 <= R2) lst.push(u); } }
    off[nt] = lst.length; V.off = off; V.lst = Int32Array.from(lst); V.cw = new Float32Array(nt); V.lk = new Float32Array(nt);
    for (let t = 0; t < nt; t++) { let s = 0; for (let q = off[t]; q < off[t + 1]; q++) { const u = V.lst[q]; s += V.L[u] * V.car[u] / 1000; } V.lk[t] = s; }
    return true; }
  /* asigna un vehículo (x, z) al tramo más cercano */
  function contar(x, z) { const c = V.grid.get(Math.floor(x / CEL) * 100003 + Math.floor(z / CEL)); if (!c) return; let mejor = -1, md = Infinity;
    for (let q = 0; q < c.length; q += 6) { const ax = c[q + 1], az = c[q + 2], dx = c[q + 3] - ax, dz = c[q + 4] - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = x - ax - t * dx, ez = z - az - t * dz, d = ex * ex + ez * ez;
      if (d < c[q + 5] && d < md) { md = d; mejor = c[q]; } }
    if (mejor >= 0 && V.cnt[mejor] < 65535) V.cnt[mejor]++; }
  function medirAhora(dt) { V.cnt.fill(0); let n = 0;
    const TV = T3.TRAF && T3.TRAF.vis; if (TV) for (let i = 0; i < TV.n; i++) { contar(TV.x[i], TV.z[i]); n++; }
    for (const fn of V.extras.values()) { let e = null; try { e = fn(); } catch (err) { e = null; } if (e) for (let i = 0; i < e.n; i++) { contar(e.x[i], e.z[i]); n++; } }
    const a = 1 - Math.exp(-dt / TAU), primera = !V.medidos;
    let snk = 0, sn = 0;
    for (let t = 0; t < V.n; t++) { let c = 0; for (let q = V.off[t]; q < V.off[t + 1]; q++) c += V.cnt[V.lst[q]]; V.cw[t] = c; }
    for (let t = 0; t < V.n; t++) { const k0 = V.cw[t] / V.lk[t]; snk += V.cnt[t] * k0; sn += V.cnt[t]; const k = k0 * V.F * zonaF(t); V.k[t] = k; V.kS[t] = primera ? k : V.kS[t] + (k - V.kS[t]) * a; }
    V.kVeh = sn ? snk / sn : 0; /* densidad (sin escalar) que vive el vehículo medio: se usa para calibrar F */
    const arr = V.aC.array, a0 = V.aC0.array, mx = V.mesh.material.uniforms.uMix.value; for (let v = 0; v < arr.length; v++) { a0[v] = a0[v] + (arr[v] - a0[v]) * mx; arr[v] = V.kS[V.vTr[v]] / KC; }
    V.aC.needsUpdate = true; V.aC0.needsUpdate = true; V.mesh.material.uniforms.uMix.value = 0; V.tMed = performance.now() / 1000; V.medidos++; V.vehiculos = n; }
  RELOJ.alDibujar(() => { if (!grupo.visible || !V.listo) return; const ahora = performance.now() / 1000;
    V.mesh.position.y = (T3.viaY != null ? T3.viaY : (T3.sueloY != null ? T3.sueloY : 0.3) + 0.3) + 0.28; V.mesh.material.uniforms.uT.value = RELOJ.tAnim || 0;
    V.mesh.material.uniforms.uMix.value = Math.min(1, (ahora - V.tMed) / CADA);
    if (ahora - V.ult >= CADA) { const dt = V.ult ? Math.min(3, ahora - V.ult) : CADA; V.ult = ahora; medirAhora(dt); } });
  /* 2026-11-27 (la autora: «las vías deben cambiar con cada simulación y cada año»): la densidad medida se multiplica por
     · window.KEN_VIAS_ZONAS = { grupo: [{ x, z, r, f }] }: zonas que fija cada simulación (botaderos de la 03 que bloquean calles, carros nuevos del plan parcial
       en la 05): factor f en el centro que baja a 1 en el radio r. */
  function zonaF(t) { let f = 1; /* el tráfico del modelo (KEN_TRAF_F) ya cambia cuántos carros se dibujan: no se cuenta dos veces */ const Z = window.KEN_VIAS_ZONAS; if (!Z || !V.mx) return f;
    const x = V.mx[t], z = V.mz[t]; for (const g in Z) for (const q of Z[g] || []) { const d = Math.hypot(x - q.x, z - q.z); if (d < q.r) f *= 1 + (q.f - 1) * (1 - d / q.r); } return f; }
  const api = window.KEN_VIAS = { grupo, get F() { return V.F; }, set F(v) { V.F = v; }, get kVeh() { return V.kVeh; },
    ver(on) { on = !!on; if (on && !V.listo && !armar()) return; grupo.visible = on; if (!on) { V.ult = 0; V.medidos = 0; } },
    extra(id, fn) { if (fn) V.extras.set(id, fn); else V.extras.delete(id); },
    /* densidad media (veh/km/carril) de los tramos a menos de r m de (x, z), ponderada por largo */
    medir(x, z, r = 600) { if (!V.listo || !V.medidos) return null; const mk = Math.round(x) + ',' + Math.round(z) + ',' + r; if (V.mc && V.mc.n === V.medidos && V.mc.k === mk) return V.mc.v; /* v5.3 memoria: se mide una vez por medición, no en cada cuadro */
      const rr = this.medir0(x, z, r); V.mc = { n: V.medidos, k: mk, v: rr }; return rr; },
    get zona() { return V.zona; },
    medir0(x, z, r) { let s = 0, w = 0, za = 0, zr = 0, zy = 0; const r2 = r * r, vistos = new Set();
      for (const [key, c] of V.grid) { const cx = Math.floor(key / 100003) * CEL, cz = (key % 100003) * CEL; if ((cx - x) ** 2 + (cz - z) ** 2 > r2 * 1.5) continue;
        for (let q = 0; q < c.length; q += 6) { const t = c[q]; if (vistos.has(t)) continue; const mx = (c[q + 1] + c[q + 3]) / 2, mz = (c[q + 2] + c[q + 4]) / 2; if ((mx - x) ** 2 + (mz - z) ** 2 > r2) continue; vistos.add(t); s += V.kS[t] * V.L[t]; w += V.L[t]; if (V.car[t] >= 3) { za += V.L[t]; if (V.kS[t] >= 0.9 * KC) zr += V.L[t]; else if (V.kS[t] >= 0.56 * KC) zy += V.L[t]; } } }
      V.zona = za ? { amarillo: +(zy / za).toFixed(3), carmesi: +(zr / za).toFixed(3), kmArterias: +(za / 1000).toFixed(1) } : null; /* arterias e intermedias del radio: parte en amarillo y en carmesí */
      return w ? s / w : null; },
    info() { if (!V.listo) return { listo: false }; let v = 0, a = 0, r = 0, Lt = 0; for (let t = 0; t < V.n; t++) { const c = V.kS[t] / KC, L = V.L[t]; Lt += L; if (c < 0.56) v += L; else if (c < 0.9) a += L; else r += L; }
      return { listo: true, visible: grupo.visible, tramos: V.n, medidos: V.medidos, vehiculos: V.vehiculos || 0, km: +(Lt / 1000).toFixed(1), verde: +(v / Lt).toFixed(3), amarillo: +(a / Lt).toFixed(3), carmesi: +(r / Lt).toFixed(3), kmax: +Math.max(...V.kS).toFixed(1) }; } };
  return api;
}
