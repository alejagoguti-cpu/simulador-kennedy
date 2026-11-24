"""PLAN PARCIAL BAVARIA FÁBRICA tal como está aprobado -> data3d/plan_bavaria.json + data3d/plan_bavaria_datos.js

Fuente: Secretaría Distrital de Planeación, «Modificación Plan Parcial Bavaria Fábrica», Decreto Distrital 448 de 2023
(modifica el Decreto 364 de 2017). Plano 1/2 «Propuesta general del plan parcial — planteamiento urbano», escala 1:2500, oct. 2023
(https://www.sdp.gov.co/sites/default/files/bavaria_fabrica_plano_1.pdf) y Plano 2/2 (etapas de desarrollo).

Cada manzana (MZ-01 a MZ-22), parque (CP-01 a CP-10), zona de bosque que se conserva (CAPRP-01 a 05, «zona de arbolado denso y
continuo») y equipamiento (EQ-01, EQ-02) se calcó sobre el plano 1/2 (coordenadas de la imagen, abajo en V) y se llevó al marco del
modelo con una transformación afín ajustada a tres esquinas del predio (Av. Boyacá con Calle 7A, Calle 7A con Transversal 71B y
Av. Alsacia con Transversal 71B). Error esperado: unos 10 m. Las vías del plan (V-4, V-5, V-6, V-7, Av. Alsacia y las alamedas)
son el espacio que queda entre manzanas, parques y bosque, como en el plano.

Lo que el plano no fija se marca como supuesto: las alturas son «resultantes» en el decreto (no hay pisos por manzana), así que se
usan alturas típicas por tipo (VIS/VIP 12 pisos, T4 10, múltiple 8, comercio 4) y las viviendas salen del área construida
(14.000 en total, cifra del Distrito). El orden por años dentro de cada etapa es supuesto; las etapas 1 y 2 siguen el plano 2/2.

Árboles: se quitan solo los detectados (data3d/bavaria_arboles.json) que caen en manzanas, vías, alamedas y equipamientos.
Los que están en el bosque conservado (CAPRP) y en los parques (CP) se quedan, como en la modificación de 2023.

Uso: python tools/plan_bavaria_real.py"""
import json, math, os
from shapely.geometry import Polygon, MultiPolygon, Point, LineString, box
from shapely.ops import unary_union
from shapely.affinity import affine_transform

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = lambda f: json.load(open(os.path.join(RAIZ, 'data3d', f), encoding='utf8'))

# V (imagen del plano 1/2 girada al norte, 0,8 x) -> modelo (x este, y norte, m). Ajuste afín a tres esquinas del predio.
T = [0.700436812, 0.0342150777, 0.00911020170, -0.657462837, 8734.00756, 3637.61000]  # a, b, d, e, xoff, yoff (shapely)
def M(P): return affine_transform(Polygon(P), T)

# borde del plan (incluye el triángulo de la intersección Alsacia–Boyacá)
BORDE = [(954, 49), (1566, 1034), (546, 1906), (49, 1846), (58, 1666), (98, 1371), (225, 1038), (363, 798), (519, 558), (720, 333), (852, 176)]

# zonas calcadas del plano (V). tipo: com, mul, vis, vip, t4, dot, eq, cp, bosque, verde
Z = {
  'MZ-22': ('dot', 2351.10, [(705, 392), (800, 405), (800, 455), (700, 440)]),
  'MZ-01': ('com', 8191.40, [(835, 415), (880, 412), (915, 440), (918, 535), (880, 522), (835, 478)]),
  'MZ-15': ('t4', 10107.78, [(1000, 495), (1075, 490), (1125, 560), (1050, 655), (985, 600)]),
  'MZ-04': ('mul', 8611.87, [(600, 505), (668, 520), (650, 648), (575, 615), (560, 590)]),
  'MZ-09': ('vis', 11728.92, [(668, 668), (735, 548), (808, 550), (860, 585), (778, 712)]),
  'MZ-12': ('vip', 17292.52, [(808, 740), (893, 617), (990, 680), (1032, 715), (978, 812), (925, 826), (840, 800)]),
  'MZ-05': ('mul', 8663.51, [(450, 800), (535, 652), (605, 688), (530, 825), (490, 823)]),
  'MZ-10': ('vis', 11888.31, [(615, 712), (735, 760), (650, 910), (548, 885)]),
  'MZ-16': ('t4', 12249.84, [(680, 945), (730, 830), (820, 828), (858, 862), (770, 1005)]),
  'MZ-18': ('t4', 12976.07, [(978, 885), (1005, 840), (1095, 885), (1170, 830), (1205, 862), (1205, 925), (1125, 1005), (1085, 1000), (1060, 955)]),
  'MZ-06': ('mul', 9773.90, [(370, 1045), (408, 868), (478, 890), (440, 1000), (420, 1045)]),
  'MZ-11': ('vis', 13041.15, [(425, 1100), (505, 925), (590, 982), (570, 1020), (540, 1100)]),
  'MZ-17': ('t4', 13629.69, [(600, 1110), (650, 1005), (740, 1050), (680, 1180), (610, 1150)]),
  'MZ-19': ('t4', 17344.79, [(1030, 1188), (1090, 1110), (1240, 905), (1305, 965), (1131, 1188)]),
  'MZ-07': ('mul', 5807.42, [(268, 1185), (290, 1100), (368, 1108), (352, 1188)]),
  'MZ-13': ('t4', 13098.68, [(370, 1335), (375, 1195), (495, 1195), (435, 1365)]),
  'MZ-02': ('com', 21344.52, [(478, 1382), (532, 1238), (645, 1300), (700, 1330), (735, 1385)]),
  'MZ-08': ('mul', 5806.77, [(200, 1385), (272, 1385), (240, 1525), (175, 1520)]),
  'MZ-14': ('t4', 10204.28, [(272, 1520), (310, 1385), (365, 1395), (365, 1565)]),
  'MZ-03': ('com', 7770.49, [(408, 1612), (440, 1470), (475, 1465), (545, 1530), (430, 1600)]),
  'MZ-20': ('t4', 9201.44, [(650, 1590), (660, 1500), (770, 1425), (825, 1480), (690, 1595)]),
  'MZ-21': ('t4', 9172.68, [(300, 1755), (320, 1610), (378, 1640), (365, 1775)]),
  'EQ-01': ('eq', 18392.92, [(1215, 750), (1265, 690), (1330, 780), (1430, 960), (1305, 965), (1240, 900)]),
  'EQ-02': ('eq', 29824.31, [(100, 1700), (305, 1700), (330, 1770), (470, 1880), (100, 1880)]),
  'CP-01': ('cp', 56533.21, [(770, 1008), (858, 865), (978, 885), (1060, 955), (1085, 1000), (1110, 1045), (920, 1230), (780, 1385), (745, 1360), (655, 1265)]),
  'CP-02': ('cp', 8083.35, [(910, 1290), (960, 1240), (1110, 1430), (1063, 1477)]),
  'CP-03': ('cp', 8140.32, [(960, 1240), (1016, 1186), (1174, 1382), (1110, 1430)]),
  'CP-04': ('cp', 4526.56, [(150, 1325), (195, 1330), (165, 1520), (120, 1515)]),
  'CP-05': ('cp', 2684.84, [(950, 830), (1000, 840), (985, 880), (940, 870)]),
  'CP-06': ('cp', 21742.30, [(720, 385), (790, 325), (870, 300), (930, 330), (1000, 335), (1090, 355), (1110, 400), (1060, 420), (950, 430), (915, 440), (880, 412), (835, 415), (800, 405), (705, 392)]),
  'CP-07': ('cp', 3288.20, [(625, 460), (700, 440), (600, 505), (560, 590), (545, 580)]),
  'CP-08': ('cp', 4236.67, [(540, 630), (560, 640), (470, 810), (450, 800)]),
  'CP-09': ('cp', 4509.60, [(320, 860), (345, 870), (290, 1010), (268, 1000)]),
  'CP-10': ('cp', 2018.32, [(250, 1080), (275, 1085), (255, 1180), (232, 1175)]),
  'CAPRP-01': ('bosque', 18971.10, [(1075, 490), (1175, 480), (1240, 580), (1265, 690), (1215, 750), (1160, 770), (1100, 735), (1050, 700), (1050, 655), (1125, 560)]),
  'CAPRP-02': ('bosque', 7806.31, [(1040, 745), (1157, 811), (1098, 897), (985, 820)]),
  'CAPRP-03': ('bosque', 33157.98, [(1305, 965), (1430, 960), (1566, 1034), (1174, 1382), (1080, 1265), (1131, 1188)]),
  'CAPRP-04': ('bosque', 62340.06, [(546, 1906), (480, 1880), (440, 1760), (430, 1660), (470, 1630), (650, 1590), (690, 1595), (825, 1480), (910, 1290), (1063, 1477)]),
  'CAPRP-05': ('bosque', 20374.85, [(100, 1580), (375, 1585), (320, 1610), (300, 1700), (100, 1700)]),
  'GLORIETA': ('verde', 0, [(860, 190), (940, 90), (985, 160), (980, 290), (900, 300), (860, 250)]),  # isla verde de la intersección Alsacia–Boyacá
}
# alamedas (peatonales, V): eje y ancho en m
ALAMEDAS = [
  ([(705, 520), (660, 620), (600, 745), (465, 950), (400, 1100), (360, 1200), (268, 1470)], 10),   # AL-01 a AL-04
  ([(395, 820), (770, 1020)], 22),                             # ZV-03 a ZV-06 + AL-06 hacia el parque CP-01
  ([(960, 640), (1240, 880)], 12),                             # AL-09
  ([(985, 1265), (1140, 1455)], 10),                           # AL-14 (entre CP-02 y CP-03)
]
# etapas (plano 2/2): la etapa 2 es la franja de la Av. Boyacá; el resto es la etapa 1 (con el parque principal, compromiso del promotor)
ETAPA2 = {'MZ-22', 'MZ-04', 'MZ-05', 'MZ-06', 'MZ-07', 'MZ-08', 'MZ-14', 'MZ-21', 'EQ-02', 'CP-04', 'CP-07', 'CP-08', 'CP-09', 'CP-10', 'CAPRP-05'}
# alturas supuestas por tipo (pisos) y material
PISOS = {'vis': 12, 'vip': 12, 't4': 10, 'mul': 8, 'com': 4, 'dot': 4, 'eq': 4}
MAT = {'vis': 'blanco', 'vip': 'blanco', 't4': 'ladrillo', 'mul': 'ladrillo', 'com': 'vidrio', 'dot': 'blanco', 'eq': 'blanco'}

borde = M(BORDE)
zon = {}
usado = Polygon()
# prioridad: manzanas y equipamientos > parques > bosque > verde (así no se pisan)
orden = sorted(Z, key=lambda k: {'com': 0, 'mul': 0, 'vis': 0, 'vip': 0, 't4': 0, 'dot': 0, 'eq': 1, 'cp': 2, 'bosque': 3, 'verde': 4}[Z[k][0]])
orig = {k: M(Z[k][2]).buffer(0).intersection(borde) for k in Z}
# lo calcado sigue el borde interior de la línea del plano (queda corto): manzanas, equipamientos y parques crecen hasta 5 m
# para acercarse al área oficial del cuadro de áreas (x 0,9: el predio del modelo es un poco menor que el área bruta del decreto)
for k in orden:
    t, a, P = Z[k]
    otros = unary_union([orig[j] for j in Z if j != k])
    g = orig[k].difference(usado)
    if a > 0 and t not in ('bosque', 'verde'):
        lo, hi = 0.0, 5.0
        for _ in range(12):
            d = (lo + hi) / 2
            gg = orig[k].buffer(d, join_style=2).intersection(borde).difference(otros).difference(usado)
            if gg.area < a * 0.9: lo = d
            else: hi = d
        g = orig[k].buffer(lo, join_style=2).intersection(borde).difference(otros).difference(usado).union(g)
    if g.is_empty: continue
    zon[k] = g; usado = usado.union(g)
alam = unary_union([affine_transform(LineString(L), T).buffer(w / 2, cap_style=2) for L, w in ALAMEDAS]).intersection(borde).difference(usado)
usado = usado.union(alam)
vias = borde.difference(usado).buffer(-2.0).buffer(2.0)  # lo que queda entre manzanas, parques y bosque: calzadas y andenes del plan

# años: etapa 1 en los años 1 a 6 (del parque CP-01 hacia afuera), etapa 2 en los años 6 a 10 (de norte a sur)
cp1 = zon['CP-01'].centroid
e1 = sorted([k for k in zon if k not in ETAPA2 and Z[k][0] not in ('bosque', 'verde')], key=lambda k: zon[k].centroid.distance(cp1))
e2 = sorted([k for k in zon if k in ETAPA2 and Z[k][0] not in ('bosque', 'verde')], key=lambda k: -zon[k].centroid.y)
ANIO = {}
for i, k in enumerate(e1): ANIO[k] = 1 + int(i / len(e1) * 6)
for i, k in enumerate(e2): ANIO[k] = 6 + int(i / len(e2) * 5)
for k in zon:
    if k not in ANIO: ANIO[k] = 1  # bosque y verde: existen desde el principio (no se construyen)
ANIO['CP-01'] = 1

def anio_cercano(p):
    best, d0 = 1, 1e9
    for k, g in zon.items():
        if Z[k][0] in ('bosque', 'verde'): continue
        d = g.distance(p)
        if d < d0: d0, best = d, ANIO[k]
    return best

# vías y alamedas partidas en celdas de 40 m: cada celda se construye el año de la manzana o parque más cercano
def por_anio(G):
    x0, y0, x1, y1 = G.bounds; out = {}
    x = x0
    while x < x1:
        y = y0
        while y < y1:
            c = box(x, y, x + 40, y + 40).intersection(G)
            if not c.is_empty and c.area > 1:
                a = anio_cercano(c.centroid); out.setdefault(a, []).append(c)
            y += 40
        x += 40
    return {a: unary_union(v) for a, v in out.items()}
viasA, alamA = por_anio(vias), por_anio(alam)
# andén de 3,5 m junto a manzanas, equipamientos y parques; el resto de la vía es calzada
bordeLotes = unary_union([g for k, g in zon.items() if Z[k][0] not in ('bosque', 'verde')]).buffer(3.5, join_style=2)
andenA = {a: g.intersection(bordeLotes) for a, g in viasA.items()}
calzA = {a: g.difference(bordeLotes) for a, g in viasA.items()}

def polys(g):
    if g.is_empty: return []
    gs = [g] if g.geom_type == 'Polygon' else [q for q in getattr(g, 'geoms', []) if q.geom_type == 'Polygon']
    r = lambda cs: [[round(x, 1), round(y, 1)] for x, y in list(cs)[:-1]]
    return [{'o': r(q.exterior.coords), 'h': [r(i.coords) for i in q.interiors if Polygon(i).area > 4]} for q in gs if q.area > 2]

# edificios: manzana cerrada con patio (anillo de 13 m tras 3 m de antejardín); comercio y equipamientos macizos
edif, viv_tot_raw = [], 0
for k, g in zon.items():
    t = Z[k][0]
    if t not in PISOS: continue
    out = g.buffer(-3.0, join_style=2)
    if t in ('com', 'dot', 'eq'):
        hue = out.buffer(-8.0, join_style=2) if t == 'eq' else out
        fp = hue; patio = None
    else:
        inn = out.buffer(-13.0, join_style=2)
        fp = out.difference(inn) if inn.area > 150 else out
        patio = inn if inn.area > 150 else None
    if fp.is_empty: continue
    pisos = PISOS[t]
    m2 = fp.area * pisos
    viv = m2 * 0.82 / (55 if t in ('vis', 'vip') else 72) if t in ('vis', 'vip', 't4', 'mul') else 0
    if t == 'mul': viv *= 0.6  # múltiple: parte comercio y oficinas
    viv_tot_raw += viv
    edif.append({'id': k, 'tipo': t, 'pisos': pisos, 'mat': MAT[t], 'anio': ANIO[k], 'p': polys(fp), 'patio': polys(patio) if patio is not None else [], 'viv': viv, 'area_lote': round(g.area), 'area_oficial': Z[k][1]})
VIV = 14000  # «más de 14.000 viviendas» (Alcaldía de Bogotá, modificación 2023)
for e in edif: e['viviendas'] = round(e.pop('viv') * VIV / viv_tot_raw)

# árboles detectados: se quitan los que caen en lo que se construye o se pavimenta
TA = D('bavaria_arboles.json')['arboles']
limpia = []  # [(geom, año)]
for k, g in zon.items():
    if Z[k][0] in ('bosque', 'cp', 'verde'): continue
    limpia.append((g, ANIO[k]))
for a, g in viasA.items(): limpia.append((g, a))
for a, g in alamA.items(): limpia.append((g, a))
from shapely.prepared import prep
LP = [(prep(g), a) for g, a in limpia]
quita = []
for t in TA:
    p = Point(t[0], t[1]); q = 0
    for pg, a in LP:
        if pg.contains(p): q = a; break
    quita.append(q)
porAnio = [sum(1 for q in quita if q == e + 1) for e in range(10)]

# árboles nuevos del plan: en los andenes junto a cada manzana (cada 11 m) y a los dos lados de las alamedas (cada 9 m)
nuevos = []
ocup = unary_union([g for k, g in zon.items() if Z[k][0] not in ('verde',)])
def sembrar(linea, paso, anio):
    L = linea.length; n = int(L // paso)
    for i in range(n):
        p = linea.interpolate((i + 0.5) * paso)
        if borde.buffer(-4).contains(p) and not ocup.contains(p): nuevos.append([round(p.x, 1), round(p.y, 1), anio])
for k, g in zon.items():
    if Z[k][0] not in PISOS: continue
    r = g.buffer(2.2, join_style=2)
    for q in ([r] if r.geom_type == 'Polygon' else r.geoms): sembrar(q.exterior, 11, ANIO[k])
for L, w in ALAMEDAS:
    ln = affine_transform(LineString(L), T)
    for s in (1, -1):
        o = ln.parallel_offset(w / 2 - 1.5, 'left' if s > 0 else 'right')
        for q in ([o] if o.geom_type == 'LineString' else getattr(o, 'geoms', [])):
            for i in range(int(q.length // 9)):
                p = q.interpolate((i + 0.5) * 9)
                if borde.contains(p): nuevos.append([round(p.x, 1), round(p.y, 1), anio_cercano(p)])

out = {
  'fuente': 'Plan Parcial Bavaria Fábrica, modificación aprobada por el Decreto Distrital 448 de 2023 (SDP, plano 1/2 «Propuesta general», 1:2500, y plano 2/2 «Etapas»). Manzanas, parques, bosque conservado y equipamientos calcados del plano y llevados al predio (error ~10 m); vías = espacio entre ellos. Alturas y orden por años: supuestos (el decreto deja la altura «resultante»). 14.000 viviendas (Alcaldía de Bogotá).',
  'borde': polys(borde)[0]['o'],
  'edificios': edif,
  'zonas': [{'id': k, 'tipo': Z[k][0], 'anio': ANIO[k], 'area_oficial': Z[k][1], 'area': round(g.area), 'p': polys(g)} for k, g in zon.items()],
  'calzadas': [{'anio': a, 'p': polys(g)} for a, g in sorted(calzA.items())],
  'andenes': [{'anio': a, 'p': polys(g)} for a, g in sorted(andenA.items())],
  # todo lo que hay dentro del plan con su año: ahí se demuelen las bodegas viejas (bosque y verde: año 1)
  'demoler': [{'anio': ANIO[k], 'p': [q['o'] for q in polys(g)]} for k, g in zon.items()] + [{'anio': a, 'p': [q['o'] for q in polys(g)]} for a, g in list(viasA.items()) + list(alamA.items())],
  'alamedas': [{'anio': a, 'p': polys(g)} for a, g in sorted(alamA.items())],
  'arboles_quitados': quita, 'arboles_quitados_por_etapa': porAnio,
  'arboles_nuevos': nuevos,
  'total_viviendas': sum(e['viviendas'] for e in edif),
  'manzanas': [{'id': e['id'], 'etapa': e['anio'], 'viviendas': e['viviendas'], 'tipo': e['tipo']} for e in edif]  # resumen (paneles y modelo)
}
json.dump(out, open(os.path.join(RAIZ, 'data3d', 'plan_bavaria.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
vivE = [sum(e['viviendas'] for e in edif if e['anio'] == a + 1) for a in range(10)]
BAVm, LCm = [9319, 2942.6], [5341.33, 3161.9]
open(os.path.join(RAIZ, 'data3d', 'plan_bavaria_datos.js'), 'w', encoding='utf8').write(f"""/* Generado por tools/plan_bavaria_real.py: Plan Parcial Bavaria Fábrica (Decreto 448 de 2023) para el modelo semanal (escenario D). */
export const PLAN_BAV = {{
  VIV_ETAPA: {json.dumps(vivE)},            // viviendas que se terminan en el año 1..10 (14.000 en total: Alcaldía de Bogotá, modificación 2023)
  ARB_ETAPA: {json.dumps(porAnio)},            // árboles del predio (data3d/bavaria_arboles.json) que caen en manzanas, vías, alamedas y equipamientos, por año
  ARB_TOT: {len(TA)},                             // árboles detectados en el predio
  PERS_HOG: 2.76,                                    // personas por hogar en Kennedy (Observatorio de Hábitat Bogotá 2023, Sisbén IV)
  AUTOS_HOG: 0.31,                                   // autos por hogar en Bogotá (Encuesta de Movilidad 2023)
  AUTOS_KEN: 113604,                                 // autos en Kennedy (Encuesta de Movilidad 2023, vía Portafolio)
  CENTRO: [{BAVm[0] - LCm[0]:.1f}, {LCm[1] - BAVm[1]:.1f}] // centro del predio en el marco «mundo» (x este, z sur)
}};
""")
print('zonas', len(zon), 'edificios', len(edif), 'viviendas', out['total_viviendas'], 'por año', vivE)
print('árboles quitados', sum(porAnio), 'de', len(TA), porAnio, 'nuevos', len(nuevos))
print('área plan', round(borde.area), 'vías', round(vias.area), 'alamedas', round(alam.area))
for k, g in zon.items(): print(f"  {k:9s} {Z[k][0]:6s} año {ANIO[k]:2d}  área {g.area:8.0f}  oficial {Z[k][1]:8.0f}  ratio {g.area / Z[k][1] if Z[k][1] else 0:.2f}")
