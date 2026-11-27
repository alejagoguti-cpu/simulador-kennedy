/* ============ FICHAS DE LAS OBRAS DE LA PROPUESTA (pestaña Estrategias del tablero) ============
   crearFichas() → { tiene(id), esqueleto(id), actualizar(el, id, ctx) } — lo usa data3d/panel_indicadores.js.
   Cada ficha responde «¿qué hizo esta obra?» con 3–4 cifras grandes, una línea de tiempo de 15 años (barras; la del año en curso en lima, lo que
   falta en tenue) y, cuando el modelo lo calcula, «con propuesta | sin propuesta». Todo se recalcula con la semana simulada:
   · cifras físicas (ha, árboles, km, m³): calendarios de data3d/propuesta_obras.json (tools/propuesta_obras_datos.mjs), de data3d/bavaria_suds.js y de las obras 3D;
   · cifras del modelo (atropellos, conectividad, autonomía, tratados, acceso…): la corrida con propuesta (R.hist) menos la misma semana sin propuesta (R.ecoBase);
   · INTERACCIONES y ESPECIES CLAVE POR OBRA: el modelo no separa el aporte de cada obra (haría falta una corrida con y sin cada una). Se REPARTE el
     cambio total («con − sin») según el área de hábitat que cada obra suma en esa semana (mismo ΔA de propuesta_obras.json) y se rotula «reparto por área, estimado».
   Colores: violeta #7d6bff = con propuesta · coral #f2694a = sin propuesta · lima #c9f27a = ganancia · turquesa #4fd1c5 = agua. */
import { valor, clavePct, T } from './indicadores_macro.js?v=2';
const sat = (v) => Math.max(0, Math.min(1, v)), sm = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '—' : v.toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d }));
const sg = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (v > 0.0005 ? '+' : v < -0.0005 ? '−' : '±') + fmt(Math.abs(v), d));
const gMad = (dt, e0, ad) => (dt <= 0 ? 0 : e0 + (1 - e0) * Math.min(1, dt / ad)); // madurez de un árbol (propuesta_obras.json: e₀ y años hasta adulto)
const gCoh = (y, a0, a1, e0, ad) => { let s = 0; for (let i = 0; i < 5; i++) s += gMad(y - (a0 + (a1 - a0) * (i + 0.5) / 5), e0, ad); return s / 5; };
let OB = null; (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/propuesta_obras.json').then(j => { OB = j; }).catch(() => {});
const PROP = () => window.KEN_PROP01 || null, BR = () => window.KEN_BAV_RED || null;
const CSS = `.fi{margin:8px 0 2px;padding:10px 10px 8px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);display:grid;gap:9px}
.fi[hidden]{display:none}
.fi .fk{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px}
.fi .fk>div{display:grid;gap:1px;padding:7px 8px;border-radius:10px;background:rgba(255,255,255,.05);border-left:3px solid var(--c,#7d6bff)}
.fi .fk b{font:500 19px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.02em;color:var(--pi-ink,#f4f3ef);font-variant-numeric:tabular-nums}
.fi .fk b small{font:400 10px var(--ui-mono,monospace);color:var(--ui-tx3,#a5ae9f);margin-left:3px;letter-spacing:0}
.fi .fk span{font:400 10.5px/1.25 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.fi .fk .g b{color:#c9f27a}.fi .fk .p b{color:#f2694a}
.fi svg.fs{width:100%;height:auto;display:block}
.fi .fl{font:500 9.5px var(--ui-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f);margin:0}
.fi .cs{display:grid;gap:4px}.fi .cs>div{display:grid;grid-template-columns:76px 1fr 52px;align-items:center;gap:6px;font:400 10.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.fi .cs i{display:block;height:7px;border-radius:4px;min-width:2px}
.fi .cs em{font:500 10.5px var(--ui-mono,monospace);font-style:normal;text-align:right;color:var(--pi-ink,#f4f3ef)}
.fi .fn{margin:0;font-size:10px;line-height:1.4;color:var(--ui-tx3,#a5ae9f)}
.pi-est .fx{all:unset;box-sizing:border-box;flex:none;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;cursor:pointer;color:var(--ui-tx3,#a5ae9f);transition:transform .2s}
.pi-est .fx[aria-expanded=true]{transform:rotate(180deg);color:var(--pi-ink,#f4f3ef)}.pi-est .fx:focus-visible{outline:1px solid var(--pi-v2,#a69bff);outline-offset:2px}`;
export function crearFichas() {
  if (!document.getElementById('fi-css')) { const s = document.createElement('style'); s.id = 'fi-css'; s.textContent = CSS; document.head.appendChild(s); }
  const sumaCopa = () => { const P = OB && OB.bordes && OB.bordes.porParche; return P ? Object.values(P).reduce((a, p) => a + (p.copaHa || p.copa || 0), 0) : 16.9; };
  /* ---- calendarios físicos por año y (fin del año y) ---- */
  const CAL = {
    puente: (y) => 1.01 * sm(1.3, 3, y),
    bordes: (y) => sumaCopa() * gCoh(y, 0.5, 4, 0.3, 3.5),
    bordesN: (y) => 3770 * sat((y - 0.5) / 3.5),
    callesN: (y) => 3386 * sat((y - 1) / 7) + 8567 * sat((y - 8) / 5),
    parquesN: (y) => 1684 * sat((y - 1) / 3),
    vaca: (y) => { const W = OB && OB.vaca; if (!W) return 0; let s = 0; for (let k = 0; k < W.semanas.length; k++) { const a = W.semanas[k] / 52, g = sat((y - a - 0.6) / 4); for (const b of ['pradera', 'juncos', 'agua', 'barrera']) s += (W.bandas[b][k] || 0) * W.totales[b] * g; } return s; },
    hbav: (y) => 0.51 * sat(y - 3) + 0.51 * sat((y - 3) / 3),
    huertasP: (y) => 51 * sat((y - 0.5) / 5.5)
  };
  /* ---- reparto por área de lo que el modelo suma en total ---- */
  const pesos = (y) => ({ puente: CAL.puente(y), bordes: CAL.bordes(y), vaca: CAL.vaca(y), parques: 7.16 * gCoh(y, 1, 4, 0.2, 5), bavaria: CAL.hbav(y), techos: 10.66 * sat(y / 14.5) * 0.5 });
  const parte = (k, y, tot) => { const w = pesos(y), s = Object.values(w).reduce((a, b) => a + b, 0); return s > 0 && tot != null ? tot * w[k] / s : null; };
  const dif = (k, c, I, Bk) => { const a = valor(k, I, c.CA), b = Bk ? valor(k, Bk, c.CB) : null; return a != null && b != null ? a - b : null; };
  const serieH = (c, f) => Array.from({ length: 15 }, (_, i) => { const j = (i + 1) * 52 - 1; return j < c.H.length ? f(c.H[j]) : null; });
  const serieC = (f) => Array.from({ length: 15 }, (_, i) => f(i + 1));
  const kpi = (v, u, l, cl) => `<div class="${cl || ''}"><b>${v}${u ? `<small>${u}</small>` : ''}</b><span>${l}</span></div>`;
  const barras = (S, col, u, año, d = 0) => { const W = 300, H = 62, n = 15, bw = W / n, mx = Math.max(1e-9, ...S.filter(v => v != null)); let o = `<svg class="fs" viewBox="0 0 ${W} ${H + 12}" role="img" aria-label="Línea de tiempo de 15 años">`;
    S.forEach((v, i) => { const h = v == null ? 0 : Math.max(1, v / mx * H), x = i * bw + 1.5, ya = i + 1 === año, fut = v == null || i + 1 > año; o += `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${(bw - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${ya ? '#c9f27a' : col}" opacity="${fut ? 0.28 : 0.9}"><title>Año ${i + 1}: ${fmt(v, d)} ${u}</title></rect>`;
      if ((i + 1) % 5 === 0 || i === 0) o += `<text x="${(x + (bw - 3) / 2).toFixed(1)}" y="${H + 10}" text-anchor="middle" font-size="8.5" fill="#a5ae9f" font-family="monospace">${i + 1}</text>`; });
    return o + '</svg>'; };
  const par = (l, con, sin, u, d = 0) => { const m = Math.max(1e-9, Math.abs(con || 0), Math.abs(sin || 0)); return `<div><span>${l}</span><span style="display:grid;gap:3px"><i style="width:${Math.max(2, Math.abs(con || 0) / m * 100)}%;background:#7d6bff"></i><i style="width:${Math.max(2, Math.abs(sin || 0) / m * 100)}%;background:#f2694a"></i></span><em>${fmt(con, d)}<br><span style="color:#f2694a">${fmt(sin, d)}</span></em></div>`; };
  const cs = (L) => `<p class="fl">Con propuesta <span style="color:#7d6bff">■</span> · sin propuesta <span style="color:#f2694a">■</span></p><div class="cs">${L.join('')}</div>`;
  const ref = (c, I) => { const s = [I.sem]; return s; };
  /* ---- una función por obra: devuelve el HTML de la ficha ---- */
  const F = {
    O2(c, I, Bk, y) { const e = OB && OB.ecoducto, at = valor('atrop', I, c.CA), at0 = Bk ? valor('atrop', Bk, c.CB) : null;
      return [[kpi(fmt(CAL.puente(y), 2), 'ha', 'hábitat sumado a El Burro (de ' + fmt(e ? e.ha : 1.01, 2) + ' ha)', 'g'), kpi(fmt(at0 != null && at != null ? at0 - at : null), 'anim.', 'atropellos evitados (pasos de fauna, incl. el puente)', 'g'), kpi(sg(dif('conect', c, I, Bk), 0), 'pts', 'conectividad con propuesta (puente + calles + bordes)'), kpi(sg(parte('puente', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)')],
        barras(serieC(CAL.puente), '#f97316', 'ha', Math.ceil(y), 2), cs([par('Atropellos', at, at0, '', 0), par('Conectividad %', valor('conect', I, c.CA), Bk ? valor('conect', Bk, c.CB) : null, '', 0)]), 'Hábitat: cubierta verde del ecoducto (años 1,3–3). Atropellos y conectividad: cifras del modelo para el conjunto de pasos de fauna y corredores.']; },
    O8(c, I, Bk, y) { return [[kpi(fmt(CAL.callesN(y)), '', 'árboles sembrados en vías (de 11.953)', 'g'), kpi(fmt(165.7 * CAL.callesN(y) / 11953, 1), 'km', 'de calle con arbolado (de 165,7)', 'g'), kpi(fmt(18 * sat((y - 1.5) / 7), 0), '', 'pares de zonas verdes unidos por filas de árboles (de 18)'), kpi(sg(dif('bienestar', c, I, Bk), 1), 'pts', 'bienestar de la fauna con propuesta (calles pacificadas)')],
        barras(serieC(CAL.callesN), '#34d399', 'árboles', Math.ceil(y)), cs([par('Bienestar %', valor('bienestar', I, c.CA), Bk ? valor('bienestar', Bk, c.CB) : null, '', 0), par('Ruido dB(A)', valor('ruido', I, c.CA), Bk ? valor('ruido', Bk, c.CB) : null, '', 1)]), 'Fase 1 años 1–8, fase 2 años 8–13; copa adulta 96 ha. El ruido y el bienestar cuentan también la pacificación de calles (30 km/h).']; },
    O9(c, I, Bk, y) { return [[kpi(fmt(CAL.bordesN(y)), '', 'árboles de borde sembrados (de 3.770)', 'g'), kpi(fmt(CAL.bordes(y), 1), 'ha', 'copa que suma hábitat a El Burro, La Vaca y Techo', 'g'), kpi(sg(parte('bordes', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)'), kpi(fmt(clavePct(I, 'buho', c.CA) != null ? clavePct(I, 'buho', c.CA) : null, 0), '%', 'búho sabanero vs año 1')],
        barras(serieC(CAL.bordes), '#34d399', 'ha de copa', Math.ceil(y), 1), cs([par('Interacciones', valor('inter', I, c.CA), Bk ? valor('inter', Bk, c.CB) : null, '', 0)]), 'La copa junto al humedal se cuenta como hábitat del humedal [supuesto del modelo].']; },
    O5(c, I, Bk, y) { const t = T(I), p = Bk ? T(Bk) : {};
      return [[kpi(fmt(t.produccion, 2), 't/día', 'comida producida en cubiertas (hidroponía)', 'g'), kpi(fmt(t.autonomia, 2), '%', 'autonomía alimentaria con propuesta (tal cual, es pequeña)', 'p'), kpi(fmt(clavePct(I, 'abeja', c.CA), 0), '%', 'abejas vs año 1'), kpi(sg(parte('techos', y, dif('inter', c, I, Bk)), 0), '', 'interacciones (reparto por área, estimado)')],
        barras(serieH(c, (X) => T(X).autonomia), '#22d3ee', '% de autonomía', Math.ceil(y), 2), cs([par('Autonomía %', t.autonomia, p.autonomia, '', 2), par('Producción t/día', t.produccion, p.produccion, '', 2)]), '2.132 cubiertas × 50 m². El aporte a la autonomía es muy pequeño frente a la demanda de Kennedy: es el resultado del modelo, sin adornar.']; },
    O6(c, I, Bk, y) { const t = T(I), p = Bk ? T(Bk) : {};
      return [[kpi(fmt(CAL.huertasP(y), 0), '', 'huertas de parque abiertas (de 51)', 'g'), kpi(sg(dif('verde', c, I, Bk), 1), 'ha', 'área verde con propuesta (todas las obras)'), kpi(sg(parte('parques', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)'), kpi(fmt(clavePct(I, 'colibri', c.CA), 0), '%', 'colibríes vs año 1')],
        barras(serieC(CAL.huertasP), '#84cc16', 'huertas', Math.ceil(y)), cs([par('Área verde ha', t.verde, p.verde, '', 1)]), 'Son los 51 módulos que el modelo ya cuenta como hábitat, flora nativa y producción.']; },
    O3(c, I, Bk, y) { const M = window.KEN_MERCADOS && window.KEN_MERCADOS.todos, a = valor('acceso', I, c.CA), a0 = Bk ? valor('acceso', Bk, c.CB) : null;
      return [[kpi(fmt(M ? M.length : null), '', 'mercados de barrio en el mapa', 'g'), kpi(fmt(a, 0), '%', 'de la población a ≤ 15 min a pie de un mercado', 'g'), kpi(sg(a != null && a0 != null ? a - a0 : null, 0), 'pts', 'accesibilidad frente a sin propuesta'), kpi(fmt(valor('cobertura', I, c.CA), 1), '%', 'cobertura alimentaria')],
        barras(serieH(c, (X) => valor('acceso', X, c.CA)), '#facc15', '% con acceso', Math.ceil(y)), cs([par('Accesibilidad %', a, a0, '', 0), par('Cobertura %', valor('cobertura', I, c.CA), Bk ? valor('cobertura', Bk, c.CB) : null, '', 1)]), 'Mercado a ≤ 865 m (15 min a 75 m/min, circuito 1,3).']; },
    O4(c, I, Bk, y) { const t = T(I), p = Bk ? T(Bk) : {};
      return [[kpi(fmt(t.tratados, 1), 't/día', 'residuos orgánicos tratados', 'g'), kpi(fmt(t.aprovechamiento, 1), '%', 'aprovechamiento (sin propuesta: ' + fmt(p.aprovechamiento, 1) + ' %)', 'g'), kpi(fmt(t.saturacion, 0), '%', 'saturación de las estaciones', t.saturacion > 85 ? 'p' : ''), kpi(fmt(t.organicos, 0), 't/día', 'orgánicos que genera Kennedy')],
        barras(serieH(c, (X) => T(X).tratados), '#a78bfa', 't/día tratadas', Math.ceil(y), 1), cs([par('Tratados t/día', t.tratados, p.tratados, '', 1), par('Aprovech. %', t.aprovechamiento, p.aprovechamiento, '', 1)]), 'Capacidad de tratamiento ' + fmt(t.capTratamiento, 1) + ' t/día frente a lo que se genera: el modelo lo muestra tal cual.']; },
    O1(c, I, Bk, y) { const hh = valor('clave', I, c.CA); return [[kpi(fmt(CAL.vaca(y), 1), 'ha', 'humedal, pradera, juncos y barrera ya restaurados (de 19 ha)', 'g'), kpi(sg(I.humedalHa != null && Bk ? I.humedalHa - Bk.humedalHa : null, 1), 'ha', 'humedal total frente a sin propuesta', 'g'), kpi(fmt(clavePct(I, 'tingua', c.CA), 0), '%', 'tingua vs año 1'), kpi(sg(parte('vaca', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)')],
        barras(serieC(CAL.vaca), '#fb923c', 'ha', Math.ceil(y), 1), cs([par('Humedal ha', I.humedalHa, Bk ? Bk.humedalHa : null, '', 1), par('Tinguas % año 1', clavePct(I, 'tingua', c.CA), Bk ? clavePct(Bk, 'tingua', c.CB) : null, '', 0)]), 'Corabastos queda al 50 %: las bodegas se quitan de a poco (años 1–8) y cada celda crece desde que se libera.']; },
    O10(c, I, Bk, y) { const B = BR(), r = B && B.cifras ? B.cifras() : null, hb = window.KEN_HUMEDAL_BAV, hi = hb && hb.info ? hb.info() : null, bio = window.KEN_T3 && window.KEN_T3.bio, ag = bio && bio.AG ? bio.AG.filter(a => a.h && a.h.humBav && a.vis) : [], esp = new Set(ag.map(a => a.e)).size;
      return [[kpi(fmt(r ? r.captadoM3Anio : null), 'm³/año', 'agua lluvia captada y tratada (supuesto: lluvia 800 mm, C 0,85, η 80 %)', 'g'), kpi(fmt(r ? r.captadoAcumM3 : null), 'm³', 'acumulado desde el inicio'), kpi(fmt(CAL.hbav(y), 2), 'ha', 'humedal artificial de 6 celdas (de 1,03 ha)', 'g'), kpi(fmt(r ? r.kmSuds : null, 1), 'km', 'de biofiltros y zanjas de infiltración'), kpi(fmt(esp), '', 'especies de fauna que ya llegaron (' + fmt(ag.length) + ' individuos)', 'g'), kpi(sg(parte('bavaria', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)')],
        barras(serieC((yy) => (B && B.tasaEn ? B.tasaEn(yy) : 0)), '#4fd1c5', 'm³/año', Math.ceil(y)), cs([par('Impermeable ha', r ? r.aImpHa : null, null, '', 1)]).replace(/<p class="fl">.*?<\/p>/, '<p class="fl">Área impermeable que drena al humedal (ha)</p>'), 'Biofiltros → tubería → 6 celdas (sedimentador, eneas, juncos, lenteja de agua, pulimento, hábitat). Sin jardines de lluvia. Área impermeable calculada con la geometría del plan; lluvia, C y η son supuestos. Tope de capacidad: ' + fmt(r ? r.capacidadM3Anio : null) + ' m³/año.']; },
    O11(c, I, Bk, y) { const B = BR(), r = B && B.cifras ? B.cifras() : null, i = B && B.info ? B.info() : null;
      return [[kpi(fmt(r ? r.kmCiclo : null, 1), 'km', 'de ciclorruta construidos (de ' + fmt(r ? r.kmCicloTotal : null, 1) + ')', 'g'), kpi(fmt(i ? i.ciclistas : null), '', 'ciclistas en el mapa (ilustrativos)'), kpi('—', '', 'viajes en bici y CO₂ evitado: el modelo de Kennedy no tiene bicicleta; no se estiman')],
        barras(serieC(OBKM), '#c9f27a', 'km', Math.ceil(y), 1), '', 'Carril bidireccional segregado sobre los ejes de calles y alamedas del plan parcial, al lado opuesto del biofiltro. No hay datos de ciclorrutas existentes en el repositorio: el empalme con la red de la ciudad queda por definir.']; },
    O7(c, I, Bk, y) { const n = OB && OB.parques ? OB.parques.n : 1684; return [[kpi(fmt(CAL.parquesN(y)), '', 'árboles nativos sembrados en parques (de ' + fmt(n) + ')', 'g'), kpi(fmt(7.16 * gCoh(y, 1, 4, 0.2, 5), 1), 'ha', 'de copa en parques', 'g'), kpi(sg(parte('parques', y, dif('inter', c, I, Bk)), 0), '', 'interacciones sumadas (reparto por área, estimado)')],
        barras(serieC(CAL.parquesN), '#34d399', 'árboles', Math.ceil(y)), '', 'Corredores verdes en 56 grupos de parques; adultos a los 5 años.']; }
  };
  const OBKM = (y) => { const B = BR(); return B && B.kmAcum ? B.kmAcum(y) : 0; };
  return {
    tiene: (id) => !!F[id],
    esqueleto: (id) => `<div class="fi" data-f="${id}" hidden></div>`,
    actualizar(el, id, c) { if (!F[id] || !c || !c.I) return; const I = c.I, y = I.sem / 52, Bk = c.Bk || (c.B && c.B.length ? c.B[Math.min(I.sem, c.B.length) - 1] : null);
      try { const [k, grafico, comp, nota] = F[id](c, I, Bk, y); el.innerHTML = `<div class="fk">${k.join('')}</div><p class="fl">Qué ha hecho · 15 años (año en curso en lima)</p>${grafico}${comp || ''}<p class="fn">${nota}</p>`; } catch (e) { el.innerHTML = '<p class="fn">Calculando…</p>'; console.warn('ficha', id, e); } }
  };
}
