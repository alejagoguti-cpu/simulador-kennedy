/* ============ KENNEDY A LOS 50 AÑOS: QUÉ CAMBIA Y DE QUÉ VARIABLE SALE ============
   Hace VISIBLE en el 3D cómo cambia Kennedy entre el año 0 y el año 50 en cada escenario (A hoy · B Bavaria central · C red de mercados).
   Todo sale del estado REAL del modelo semanal (window.KEN_ESIM.vida.S[e].o, data3d/sim_vida.js) y del reloj universal (RELOJ.sem):
   nada se inventa; lo que no tiene fuente va marcado [SUP] y se muestra como hipótesis.

   CAMBIO                                   VARIABLE DEL MODELO / FUENTE
   · Árboles de los parches crecen          fracción sembrada = hogares con huerta / objetivo del escenario (o.act / o.N); cada árbol se siembra
                                            cuando esa fracción llega a su orden k y crece con la edad: altura adulta = ESPECIES[sp].alto
                                            (parches_arboles.js). Curva de crecimiento: [SUP] tiempo característico 6 años, 95 % a los ~18 años
                                            (La Vaca usa ~5 años a «árbol grande»: humedal_vaca.js; mismo orden de magnitud).
   · Bodegas de Corabastos desmontadas      o.cora.desm / o.cora.rest / o.cora.borde / o.cora.mad (sim_vida.js · DESMONTE): balizas ámbar (obra)
     y borde restaurado                     y verdes (borde restaurado) + pulso al cambiar de fase.
   · Cubiertas con huerta nuevas            KEN_HIDRO.frac (data3d/huertas_hidro.js: las cubiertas se abren según hogares con huerta): baliza
                                            que crece desde el techo durante el año siguiente a su apertura.
   · Borde del humedal El Burro             o.hum = integridad del humedal (sim_vida.js: W, 0-100 %): la franja de orilla va de pajiza (poca)
                                            a verde viva (mucha). En A baja o se mantiene según el modelo; no se fuerza a favor de la propuesta.
   · Más carros en A (y en todos)           crecimiento(t) de sim_vida.js · TRAFICO: carros +1,5 %/año (SDH 2025: parque de Bogotá +1,24 %/año
                                            2020-24) y motos 0 %/año (OAB-RDA 2019-24). Réplicas de la grabación SUMO: trafico_crece.js.
   · Mercados, huertas de barrio, fauna     ya los dibujan mercados_red.js, huertas_barrio.js y biotica; aquí se listan con su número del año.
   NO MODELADO (sin dato georreferenciado): densificación por el POT (Decreto 555 de 2021) y crecimiento de la población de Kennedy; el modelo
   usa población fija (sim_vida.js · POB_K = 1.034.000, DANE 2024). Las proyecciones DANE-SDP 2018-2035 por localidad son una fuente oficial
   (https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion/proyecciones-de-poblacion-bogota)
   pero este módulo no las dibuja: no hay manzana por manzana que lo respalde.
   Animaciones solo cosméticas (RELOJ.tAnim); la lógica solo mira RELOJ.sem. Sin azar. */
import { RELOJ } from './reloj.js?v=5';
import { SIMST } from './sim_modelos.js?v=7';
import { crecimiento } from './sim_vida.js?v=7';
import { añoActual } from './tope_anos.js?v=3';

const TAU = 6, ADULTO = 20; // [SUP] años: tiempo característico de crecimiento y edad en que el árbol llega al ~95 % de su altura
const AÑO = 52, W0_HUM = 55, AVES0 = 900, ACT0 = 120; // valores iniciales del modelo (sim_vida.js: W0 = 0,55 · s.B = 900 · A0 = 120)
const fmt = (n, d = 0) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NOM = { A: 'A · Estado actual', B: 'B · Bavaria central', C: 'C · red de mercados' };

export async function iniciarCambio50({ T3 }) {
  const THREE = T3.THREE;
  const año = () => añoActual(RELOJ); // mismo conteo que la barra del modo simple: semana 1300 = año 26
  const escAct = () => (window.KEN_ESIM && window.KEN_ESIM.esc) || (T3.escenario === 'proyecto' ? (SIMST.esc || 'C') : 'A');
  const VIDA = () => { const E = window.KEN_ESIM; return E && E.vida && E.vida.S ? E.vida : null; };

  /* ---------------- historia de la fracción sembrada (por escenario, del modelo) ---------------- */
  const HIST = { B: { w: [0], g: [0] }, C: { w: [0], g: [0] } };
  const fracSembrada = (e, o) => Math.max(0.03, Math.min(1, o.act / Math.max(1, o.N)));
  const empujar = (e, w, g) => { const H = HIST[e], ult = H.g[H.g.length - 1]; if (g > ult + 0.004) { H.w.push(w); H.g.push(g); } };
  const semSembrado = (e, k) => { const H = HIST[e]; if (!H || k > H.g[H.g.length - 1] + 1e-9) return null; let lo = 0, hi = H.g.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (H.g[m] >= k) hi = m; else lo = m + 1; } return H.w[lo]; };
  const factorEdad = (k) => { const e = escAct(); if (e === 'A') return 0; const w = semSembrado(e, k); if (w == null) return 0; const edad = Math.max(0, RELOJ.sem - w) / AÑO;
    return Math.min(1, 0.12 + 0.88 * (1 - Math.exp(-edad / TAU)) / (1 - Math.exp(-ADULTO / TAU))); };
  let parchesOk = false, ultAñoParches = -1, ultEscParches = '';
  const actualizarArboles = (forzar) => { const P = window.KEN_PARCHES; if (!P || !P.edad) return; const a = año(), e = escAct();
    if (!parchesOk) { parchesOk = true; forzar = true; } if (!forzar && a === ultAñoParches && e === ultEscParches && RELOJ.sem % 13 !== 0) return;
    ultAñoParches = a; ultEscParches = e; P.edad(factorEdad); };

  /* ---------------- baliza: columna de luz que crece desde el suelo (instancias, un solo draw call) ---------------- */
  const MAXB = 160, U = { uT: { value: 0 } };
  const gB = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, 0.5, 0);
  const aT0 = new Float32Array(MAXB).fill(-1e4), aCol = new Float32Array(MAXB * 3);
  gB.setAttribute('aT0', new THREE.InstancedBufferAttribute(aT0, 1)); gB.setAttribute('aCol', new THREE.InstancedBufferAttribute(aCol, 3));
  const mB = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `attribute float aT0; attribute vec3 aCol; varying vec3 vC; varying float vH, vG; uniform float uT;
      void main(){ vC = aCol; vH = position.y; float g = clamp((uT - aT0) / 2.5, 0.0, 1.0); g = 1.0 - pow(1.0 - g, 3.0); vG = g;
        vec3 p = position; p.y *= g; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying vec3 vC; varying float vH, vG; uniform float uT; void main(){ float a = (1.0 - vH) * 0.55 + 0.08; a *= 0.75 + 0.25 * sin(uT * 2.2 + vH * 6.0); gl_FragColor = vec4(vC, a * vG);
      #include <colorspace_fragment>
    }` });
  const balizas = new THREE.InstancedMesh(gB, mB, MAXB); balizas.frustumCulled = false; balizas.renderOrder = 15; balizas.count = 0; T3.scene.add(balizas);
  const OB = new THREE.Object3D(); const cAmbar = new THREE.Color('#ffb347'), cVerde = new THREE.Color('#7dff9a'), cLima = new THREE.Color('#d6ff5e');
  let lista = [], suciaB = true; // {x,y,z,r,h,c,t0}
  const nacidos = new Set();
  const ponerBalizas = () => { suciaB = false; const n = Math.min(MAXB, lista.length);
    for (let i = 0; i < n; i++) { const b = lista[i]; OB.position.set(b.x, b.y, b.z); OB.rotation.set(0, 0, 0); OB.scale.set(b.r, b.h, b.r); OB.updateMatrix(); balizas.setMatrixAt(i, OB.matrix);
      aCol[i * 3] = b.c.r; aCol[i * 3 + 1] = b.c.g; aCol[i * 3 + 2] = b.c.b; aT0[i] = b.t0; }
    balizas.count = n; balizas.instanceMatrix.needsUpdate = true; gB.attributes.aCol.needsUpdate = true; gB.attributes.aT0.needsUpdate = true; };

  /* ---------------- franja de orilla del humedal El Burro (verde según la integridad del modelo) ---------------- */
  let banda = null;
  const lw = (x, y) => [x - 5341.33, 3161.9 - y]; // marco del mundo (el mismo de humedal_vaca.js)
  try { const W = await fetch('data3d/water_bodies.json').then(r => r.json()); const B = W.find(w => w.nombre === 'Humedal El Burro');
    if (B && B.pts && B.pts.length > 20) { let P = [], u = null; for (const p of B.pts) { const q = lw(p[0], p[1]); if (!u || Math.hypot(q[0] - u[0], q[1] - u[1]) > 14) { P.push(q); u = q; } }
      const ar = (Q) => { let a = 0; for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) a += Q[j][0] * Q[i][1] - Q[i][0] * Q[j][1]; return a / 2; };
      const s = Math.sign(ar(P)) || 1, n = P.length, D = 34, O2 = [];
      for (let i = 0; i < n; i++) { const a = P[(i + n - 1) % n], b = P[i], c = P[(i + 1) % n]; let e1x = b[0] - a[0], e1z = b[1] - a[1], e2x = c[0] - b[0], e2z = c[1] - b[1]; const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1; e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
        let nx = (e1z + e2z) * s, nz = -(e1x + e2x) * s; const ln = Math.hypot(nx, nz) || 1; nx /= ln; nz /= ln; const cm = Math.max(0.5, nx * e1z * s - nz * e1x * s); O2.push([b[0] + nx * D / cm, b[1] + nz * D / cm]); }
      const sh = new THREE.Shape(O2.map(p => new THREE.Vector2(p[0], -p[1]))), hole = new THREE.Path(P.map(p => new THREE.Vector2(p[0], -p[1]))); sh.holes.push(hole);
      const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
      banda = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8a7a4a, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      banda.position.y = (T3.sueloY != null ? T3.sueloY : 0.3) + 0.9; banda.renderOrder = 3; banda.name = 'orilla_burro'; T3.scene.add(banda); } } catch (e) { console.warn('cambio_50 · orilla del humedal:', e); }
  const cSeca = new THREE.Color('#a8955a'), cViva = new THREE.Color('#37c24f'), cTmp = new THREE.Color();
  const pintarOrilla = (hum) => { if (!banda) return; const u = Math.max(0, Math.min(1, (hum - 15) / 70)); cTmp.copy(cSeca).lerp(cViva, u); banda.material.color.copy(cTmp); banda.material.opacity = 0.5 + 0.2 * u; };

  /* ---------------- lectura del estado real ---------------- */
  function estado() {
    const V = VIDA(); if (!V) return null; const e = escAct(), sv = V.S[e], o = sv && sv.o; if (!o || o.act == null) return null; const H = sv.H, G = crecimiento(RELOJ.sem), HI = window.KEN_HIDRO, PC = window.KEN_PCORA, PA = window.KEN_PARCHES, VA = window.KEN_VACA;
    const cub = e === 'A' || !HI ? 0 : Math.round(HI.techos * HI.frac), cub0 = e === 'A' || !HI ? 0 : Math.round(HI.techos * 0.03);
    const sem = fracSembrada(e === 'A' ? 'B' : e, o), arb = e === 'A' || !PA ? 0 : Math.round(PA.n * (HIST[e] ? HIST[e].g[HIST[e].g.length - 1] : sem));
    const extra = T3.creceTrafico && T3.creceTrafico.activo ? T3.creceTrafico.n : 0;
    return { e, o, sv, t: RELOJ.sem, año: año(), cub, cub0, arb, G, extra, vacaHa: VA && VA.ESTADO && VA.ESTADO.on ? VA.ESTADO.ha : 0, vacaArb: VA && VA.ESTADO && VA.ESTADO.on ? VA.ESTADO.arboles : 0,
      a0: { act: H && H.act.length ? H.act[0] : ACT0, dep: H && H.dep.length ? H.dep[0] : o.dep, esp: H && H.esp.length ? H.esp[0] : o.esp0 }, cora: o.cora, PC }; }
  const fila = (n, v0, v1, buena, unidad = '', d = 0, nota = '') => ({ n, v0, v1, buena, unidad, d, nota });
  function filas(s) { const { e, o } = s, R = [];
    R.push(fila('Hogares con huerta', s.a0.act, o.act, 1, '', 0, 'o.act'));
    if (e !== 'A') { R.push(fila('Cubiertas con huerta', s.cub0, s.cub, 1, '', 0, 'KEN_HIDRO.frac × techos')); R.push(fila('Árboles nativos de los parches', 0, s.arb, 1, '', 0, 'o.act / o.N')); }
    if (e === 'C') R.push(fila('Mercados de la red abiertos', 0, o.nodos, 1, ' de 35', 0, 'o.nodos'));
    if (e !== 'A') { R.push(fila('Bodegas de Corabastos desmontadas', 0, s.cora.desm, 1, ' de ' + s.cora.total, 0, 'o.cora.desm')); R.push(fila('Borde de humedal restaurado', 0, s.cora.borde / 1e4, 1, ' ha', 1, 'o.cora.borde')); }
    R.push(fila('Integridad del humedal El Burro', W0_HUM, o.hum, 1, ' %', 0, 'o.hum'));
    R.push(fila('Aves en el humedal', AVES0, o.aves, 1, '', 0, 'o.aves'));
    R.push(fila('Especies de fauna con presencia', s.a0.esp, o.esp, 1, '', 0, 'o.esp'));
    R.push(fila('Dependencia de Corabastos', s.a0.dep * 100, o.dep * 100, -1, ' %', 0, 'o.dep'));
    R.push(fila('Parque de carros (todos los escenarios)', 100, s.G.car * 100, -1, ' %', 0, 'crecimiento(t) · +1,5 %/año [SDH 2025]'));
    return R; }

  /* ---------------- interfaz: pastilla + panel (vidrio, sans) ---------------- */
  if (!document.getElementById('c50-css')) { const st = document.createElement('style'); st.id = 'c50-css'; st.textContent = `
    #c50-pill{position:fixed;right:12px;bottom:12px;z-index:32;display:none;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(14,20,18,.76);color:#e9efe6;border:1px solid rgba(190,230,170,.28);backdrop-filter:blur(6px);font:500 12px/1.2 Geist,system-ui,Arial,sans-serif;cursor:pointer}
    #c50-pill b{font:600 14px/1 "Barlow Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#cfff5e}
    #c50-pan{position:fixed;right:12px;bottom:56px;z-index:33;display:none;width:min(360px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;padding:10px 12px 12px;border-radius:8px;background:rgba(14,20,18,.84);color:#e9efe6;border:1px solid rgba(190,230,170,.24);backdrop-filter:blur(8px);font:500 12px/1.35 Geist,system-ui,Arial,sans-serif}
    #c50-pan h5{margin:0 0 6px;font:600 15px/1.1 "Barlow Condensed","Arial Narrow",Arial,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#cfff5e}
    #c50-pan h5 span{display:block;font:500 11px/1.3 Geist,system-ui,Arial,sans-serif;letter-spacing:0;text-transform:none;color:#9fb0a6;margin-top:2px}
    #c50-pan table{width:100%;border-collapse:collapse}#c50-pan td{padding:3px 0;border-top:1px solid rgba(255,255,255,.07);vertical-align:baseline}
    #c50-pan td:first-child{color:#c7d3cc;padding-right:6px}#c50-pan td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}#c50-pan td.n small{color:#8d9a92}
    #c50-pan .up{color:#8be28b}#c50-pan .dn{color:#ff9b8a}#c50-pan .ig{color:#c7d3cc}
    #c50-pan button{margin-top:9px;width:100%;padding:8px 10px;border-radius:6px;border:1px solid rgba(207,255,94,.5);background:rgba(207,255,94,.12);color:#e9f7c7;font:600 13px/1 Geist,system-ui,Arial,sans-serif;cursor:pointer}
    #c50-pan details{margin-top:8px;color:#9fb0a6;font-size:11px}#c50-pan details p{margin:4px 0}
    #c50-nuevo{position:fixed;left:50%;top:118px;transform:translateX(-50%);z-index:31;display:flex;flex-direction:column;gap:5px;align-items:center;pointer-events:none;max-width:calc(100vw - 24px)}
    #c50-nuevo div{padding:6px 13px;border-radius:999px;background:rgba(14,20,18,.82);color:#f2f6ee;border:1px solid rgba(207,255,94,.5);font:500 13px/1.2 Geist,system-ui,Arial,sans-serif;opacity:0;transform:translateY(-6px);transition:opacity .4s,transform .4s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100vw - 24px)}
    #c50-nuevo div.on{opacity:1;transform:none}#c50-nuevo em{font-style:normal;color:#cfff5e;font-weight:600}
    #c50-cmp{position:fixed;inset:0;z-index:60;display:none;background:#0b100d;touch-action:none;user-select:none;-webkit-user-select:none;font:500 13px/1.2 Geist,system-ui,Arial,sans-serif;color:#fff}
    #c50-cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none}
    #c50-cmp .l{position:absolute;top:0;bottom:0;width:0;border-left:2px solid #cfff5e;pointer-events:none}
    #c50-cmp .l i{position:absolute;top:50%;left:-17px;width:32px;height:32px;margin-top:-16px;border-radius:50%;background:rgba(14,20,18,.85);border:2px solid #cfff5e}
    #c50-cmp .t{position:absolute;top:14px;padding:6px 12px;border-radius:999px;background:rgba(14,20,18,.82);border:1px solid rgba(207,255,94,.5);pointer-events:none}
    #c50-cmp .t.a{left:14px}#c50-cmp .t.b{right:14px}
    #c50-cmp .x{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);padding:8px 16px;border-radius:999px;background:rgba(14,20,18,.85);border:1px solid rgba(207,255,94,.5);color:#fff;font:600 13px Geist,system-ui,Arial,sans-serif;cursor:pointer}
    #c50-cmp .w{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(11,16,13,.78);font-size:15px}
    @media(max-width:640px){#c50-pill{right:10px;top:14px;bottom:auto;padding:8px 11px}#c50-pill .t{display:none}#c50-pan{right:10px;left:10px;width:auto;top:58px;bottom:auto;max-height:calc(100vh - 150px)}#c50-nuevo{top:58px}#c50-nuevo div{font-size:11.5px;padding:5px 11px}}`; document.head.appendChild(st); }
  const mk = (tag, id) => { let e = document.getElementById(id); if (!e) { e = document.createElement(tag); e.id = id; document.body.appendChild(e); } return e; };
  const pill = mk('button', 'c50-pill'), pan = mk('div', 'c50-pan'), nuevo = mk('div', 'c50-nuevo'), cmp = mk('div', 'c50-cmp');
  pill.type = 'button'; pill.setAttribute('aria-expanded', 'false'); nuevo.setAttribute('role', 'status'); nuevo.setAttribute('aria-live', 'polite');
  let abierto = false, ultTexto = '';
  const pintarPanel = () => { const s = estado(); if (!s) return;
    pill.style.display = T3.escenario === 'proyecto' || true ? 'inline-flex' : 'none';
    pill.innerHTML = `<b>Año ${s.año}</b> <span class="t">qué cambió desde el inicio</span>`;
    if (!abierto) return;
    const R = filas(s), cel = (r) => { const d = r.v1 - r.v0, ok = Math.abs(d) < Math.pow(10, -r.d) * 0.5 ? 'ig' : (d * r.buena > 0 ? 'up' : 'dn');
      return `<tr><td>${esc(r.n)}</td><td class="n"><small>${fmt(r.v0, r.d)}</small> → <b class="${ok}">${fmt(r.v1, r.d)}${esc(r.unidad)}</b></td></tr>`; };
    const html = `<h5>Kennedy en el año ${s.año} frente al inicio<span>${NOM[s.e]} · semana ${s.t + 1} · semilla ${SIMST.semilla || 1}</span></h5><table>${R.map(cel).join('')}</table>
      <button type="button" data-cmp>Comparar inicio ↔ año ${s.año} (cortina)</button>
      <details><summary>De dónde sale cada cambio</summary>${R.map(r => `<p><b>${esc(r.n)}</b>: ${esc(r.nota)}</p>`).join('')}
      <p><b>Árboles que crecen</b>: edad desde que la fracción sembrada del modelo llega a su turno; curva [SUP] tiempo característico ${TAU} años (hipótesis, como los ~5 años de La Vaca).</p>
      <p><b>Orilla de El Burro</b>: color por la integridad del modelo (pajiza poca, verde viva mucha).</p>
      <p><b>Carros</b>: +1,5 %/año (SDH 2025, parque de Bogotá +1,24 %/año 2020-24); motos 0 % (OAB-RDA 2019-24).</p>
      <p><b>No modelado</b>: densificación del POT (Decreto 555 de 2021) y crecimiento de la población de Kennedy (población fija 1.034.000, DANE 2024).</p></details>`;
    if (html !== ultTexto) { ultTexto = html; pan.innerHTML = html; } };
  pill.addEventListener('click', () => { abierto = !abierto; pan.style.display = abierto ? 'block' : 'none'; pill.setAttribute('aria-expanded', String(abierto)); ultTexto = ''; pintarPanel(); });
  pan.addEventListener('click', (ev) => { if (ev.target.closest('[data-cmp]')) comparar(); });

  /* ---------------- etiquetas «nuevo: …» ---------------- */
  const pend = new Map(); let ultFlush = -1e9, ultMsg = [];
  const aviso = (clave, html) => { pend.set(clave, html); };
  const mostrar = (html) => { const d = document.createElement('div'); d.innerHTML = html; nuevo.appendChild(d); void d.offsetWidth; d.classList.add('on'); const t0 = RELOJ.tAnim; ultMsg.push({ d, t0 });
    while (nuevo.children.length > 3) nuevo.removeChild(nuevo.firstChild); };
  const barrer = (ahora) => { for (let i = ultMsg.length - 1; i >= 0; i--) { const m = ultMsg[i]; if (!m.d.parentNode) { ultMsg.splice(i, 1); continue; } if (ahora - m.t0 > 5) { m.d.classList.remove('on'); setTimeout(() => m.d.remove(), 450); ultMsg.splice(i, 1); } } };

  /* ---------------- el modelo semanal: detectar lo que cambió ---------------- */
  const prev = { e: '', desm: 0, rest: 0, cub: 0, act: 0, año: -1, hum: null, extra: 0 };
  let suspendido = false, pulsos = null;
  const pulso = (x, z, r) => { if (!pulsos) import('./resaltes.js?v=4').then(m => { pulsos = m.resaltes(T3); pulsos.pulso(x, (T3.sueloY != null ? T3.sueloY : 0.3), z, r); }).catch(() => {}); else pulsos.pulso(x, (T3.sueloY != null ? T3.sueloY : 0.3), z, r); };
  const idHidro = new Map(); // techo -> semana en que se abrió (para la baliza del primer año)
  let ultFrac = -1, ultEscB = '';
  let sembrada = false; // ya se tomó la primera lectura del modelo (KEN_ESIM puede cargar después de este módulo)
  function porSemana(w) {
    const V = VIDA(); if (!V) return; sembrada = true; for (const e of ['B', 'C']) { const o = V.S[e] && V.S[e].o; if (o && o.act != null) empujar(e, w, fracSembrada(e, o)); }
    const s = estado(); if (!s) return; actualizarArboles(false); pintarOrilla(s.o.hum);
    const e = s.e, o = s.o, c = s.cora, PC = s.PC, HI = window.KEN_HIDRO, a = s.año;
    const mismo = prev.e === e; const base = mismo && prev.año >= 0;
    // balizas de Corabastos: ámbar = en obra, verde = borde restaurado
    const L = [];
    if (e !== 'A' && PC && PC.parques && T3.escenario === 'proyecto') PC.parques.forEach((P, i) => { if (i < c.desm) L.push({ x: P.centro[0], y: (T3.sueloY != null ? T3.sueloY : 0.3), z: P.centro[1], r: i < c.rest ? 14 : 10, h: i < c.rest ? 95 : 70, c: i < c.rest ? cVerde : cAmbar, t0: RELOJ.tAnim - 99, id: 'c' + i + (i < c.rest ? 'v' : 'a') }); });
    // balizas de cubiertas con huerta nuevas (el año siguiente a su apertura)
    if (HI && HI.centros && HI.grupo && HI.grupo.visible && e !== 'A') { const fr = HI.frac; if (ultEscB !== e || fr < ultFrac - 1e-6) { idHidro.clear(); ultEscB = e; ultFrac = fr; }
      else if (fr > ultFrac + 1e-6) { const nuevos = []; for (const [cn, ord] of HI.centros()) if (ord > ultFrac && ord <= fr) nuevos.push(cn); nuevos.slice(0, 60).forEach((cn, k) => { idHidro.set(Math.round(cn[0]) + ',' + Math.round(cn[2]), { w, cn }); }); ultFrac = fr; }
      for (const [k, v] of idHidro) { if (w - v.w > AÑO) { idHidro.delete(k); continue; } const naci = nacidos.has(k); L.push({ x: v.cn[0], y: v.cn[1] + 1, z: v.cn[2], r: 6, h: 38, c: cLima, t0: naci ? RELOJ.tAnim - 99 : RELOJ.tAnim, id: 'h' + k }); nacidos.add(k); } }
    else if (e === 'A') { idHidro.clear(); ultFrac = -1; }
    const idsViejos = new Map(lista.map(b => [b.id, b])); lista = L.slice(0, MAXB).map(b => { const v = idsViejos.get(b.id); if (v) b.t0 = v.t0; else if (b.t0 < RELOJ.tAnim - 50) b.t0 = RELOJ.tAnim; return b; }); suciaB = true;
    // avisos
    if (!suspendido && base && !RELOJ.saltando) {
      if (c.desm > prev.desm && e !== 'A') { aviso('desm', `<em>nuevo:</em> bodega de Corabastos desmontada (${c.desm} de ${c.total})`); const P = PC && PC.parques && PC.parques[c.desm - 1]; if (P) pulso(P.centro[0], P.centro[1], 130); }
      if (c.rest > prev.rest && e !== 'A') { aviso('rest', `<em>nuevo:</em> borde de humedal restaurado en Corabastos (+${fmt(c.borde / 1e4, 1)} ha en total)`); const P = PC && PC.parques && PC.parques[c.rest - 1]; if (P) pulso(P.centro[0], P.centro[1], 160); }
      if (s.cub - prev.cub >= 8 && e !== 'A') aviso('cub', `<em>nuevo:</em> +${fmt(s.cub - prev.cub)} cubiertas con huerta · ${fmt(s.cub)} en total`);
      if (Math.floor(o.act / 500) > Math.floor(prev.act / 500) && e !== 'A') aviso('act', `<em>nuevo:</em> ${fmt(Math.floor(o.act / 500) * 500)} hogares con huerta`);
      if (a !== prev.año) { if (prev.hum != null && Math.abs(o.hum - prev.hum) >= 1.5) aviso('hum', `Humedal El Burro: integridad ${fmt(o.hum)} % (${o.hum >= prev.hum ? '+' : '−'}${fmt(Math.abs(o.hum - prev.hum), 1)} en el año)`);
        if (e === 'A' && s.G.car > 1) aviso('car', `<em>año ${a}:</em> parque de carros ${fmt((s.G.car - 1) * 100)} % mayor que hoy${s.extra ? ' · ' + fmt(s.extra) + ' vehículos de más en la calle' : ''}`);
        prev.hum = o.hum; }
    } else if (a !== prev.año) prev.hum = o.hum;
    Object.assign(prev, { e, desm: c.desm, rest: c.rest, cub: s.cub, act: o.act, año: a, extra: s.extra });
    if (!mismo) { pend.clear(); }
    suciaPan = true;
  }
  let suciaPan = true, tPan = -1;
  RELOJ.registrar({ nombre: 'cambio_50', orden: 95, onSemana: porSemana,
    reiniciar: () => { for (const e of ['B', 'C']) HIST[e] = { w: [0], g: [0] }; lista = []; idHidro.clear(); nacidos.clear(); suciaB = true; ultFrac = -1; Object.assign(prev, { e: '', desm: 0, rest: 0, cub: 0, act: 0, año: -1, hum: null, extra: 0 }); parchesOk = false; ultAñoParches = -1; sembrada = false; },
    hash: () => { let h = 0x811c9dc5; for (const e of ['B', 'C']) { const H = HIST[e]; h = Math.imul(h ^ H.g.length, 0x01000193) >>> 0; h = Math.imul(h ^ (Math.round(H.g[H.g.length - 1] * 1e4) | 0), 0x01000193) >>> 0; } return h >>> 0; } }, { ponerAlDia: false });

  RELOJ.alDibujar((info) => {
    U.uT.value = info.tAnim; barrer(info.tAnim); if (!sembrada && VIDA()) porSemana(RELOJ.sem);
    if (banda) banda.visible = !!VIDA();
    if (suciaB) { balizas.visible = true; ponerBalizas(); }
    if (pend.size && info.tAnim - ultFlush > 3.2) { ultFlush = info.tAnim; const it = [...pend.values()].slice(0, 2); pend.clear(); it.forEach(mostrar); }
    if (suciaPan && info.tAnim - tPan > 0.5) { tPan = info.tAnim; suciaPan = false; pintarPanel(); }
    if (T3.escenario !== 'proyecto' && !abierto) pill.style.display = VIDA() ? 'inline-flex' : 'none';
    actualizarArboles(false);
  });

  /* ---------------- comparar año 0 ↔ ahora (cortina) ---------------- */
  let ocupado = false;
  const foto = () => { if (T3.composer) T3.composer.render(); else T3.renderer.render(T3.scene, T3.camera); return T3.renderer.domElement.toDataURL('image/jpeg', 0.85); };
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));
  const cuadros = (n) => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  async function comparar() {
    if (ocupado) return; const sem = RELOJ.sem, a = Math.floor(sem / AÑO) + 1; if (sem < AÑO) { aviso('cmp', 'Aún es el primer año: deja correr el tiempo y vuelve a comparar'); return; }
    ocupado = true; suspendido = true; const pausa0 = RELOJ.pausaSem; RELOJ.pausarAños(true); pan.style.display = 'none'; abierto = false; pill.setAttribute('aria-expanded', 'false');
    try {
      await cuadros(2); const ahora = foto(), e = escAct();
      RELOJ.reiniciarModelo(); await cuadros(3); await esperar(900); await cuadros(3); const cero = foto();
      cmp.innerHTML = `<img alt="Kennedy ahora" src="${ahora}"><img class="c" alt="Kennedy al inicio" src="${cero}" style="clip-path:inset(0 50% 0 0)"><div class="l" style="left:50%"><i></i></div><span class="t a">Inicio · año 1</span><span class="t b">Año ${a} · ${esc(NOM[e])}</span><button class="x" type="button">Cerrar y seguir</button><div class="w">Volviendo al año ${a}…</div>`;
      cmp.style.display = 'block';
      await cuadros(2); // la cortina ya tapa el 3D: ahora se vuelve a la semana de antes sin que se vea
      const ms = RELOJ.avanzarSemanas(sem).ms; await cuadros(2); void ms;
      const w = cmp.querySelector('.w'); if (w) w.remove();
      const img0 = cmp.querySelector('img.c'), lin = cmp.querySelector('.l'); let arr = false;
      const mover = (x) => { const p = Math.max(0, Math.min(100, x / innerWidth * 100)); img0.style.clipPath = `inset(0 ${100 - p}% 0 0)`; lin.style.left = p + '%'; };
      cmp.onpointerdown = (ev) => { if (ev.target.closest('.x')) return; arr = true; mover(ev.clientX); try { cmp.setPointerCapture(ev.pointerId); } catch (e2) { /* sin captura */ } };
      cmp.onpointermove = (ev) => { if (arr) mover(ev.clientX); }; cmp.onpointerup = () => { arr = false; };
      const cerrar = () => { cmp.style.display = 'none'; cmp.innerHTML = ''; document.removeEventListener('keydown', tecla); if (!pausa0) RELOJ.pausarAños(false); ocupado = false; suspendido = false; };
      const tecla = (ev) => { if (ev.key === 'Escape') cerrar(); }; document.addEventListener('keydown', tecla);
      cmp.querySelector('.x').onclick = cerrar;
    } catch (e) { console.warn('cambio_50 · comparar:', e); cmp.style.display = 'none'; ocupado = false; suspendido = false; if (!pausa0) RELOJ.pausarAños(false); }
  }

  // primera pasada con el estado de ahora (si la página abre ya con años corridos)
  porSemana(RELOJ.sem); actualizarArboles(true);
  const api = { estado, filas: () => { const s = estado(); return s ? filas(s) : null; }, comparar, factorEdad, balizas, banda, HIST, get lista() { return lista; } };
  window.KEN_C50 = api; return api;
}
