# Maqueta RECTANGULAR (16:9, como el proyector) con zoom sobre Corabastos y Bavaria, para impresión 3D (STL en mm).
# Uso: python tools/maqueta_zoom.py [largo_mm=500] [exageración=1.6] [piezas_x=3] [piezas_y=2] [tope_mm=10]
# Encuadre (marco MODELO del simulador): Corabastos (data3d/corabastos.json, x 5.895–6.796, y 1.826–2.522) y Bavaria (data3d/bavaria.json,
# x 8.831–9.866, y 2.389–3.553) con ~350 m de margen, en 16:9 norte arriba: 4.800 x 2.700 m centrado en (7.880,5 ; 2.689,5).
# Terreno: placa rectangular de 3 mm; humedales y canales hundidos 1,8 mm (capa_agua.png de la instalación).
# Edificios: data3d/buildings.json (huella y altura reales; incluye las naves de Corabastos y las bodegas de Bavaria), altura × exageración,
# con tope (torres de 20 pisos = 1 cm). Casas pegadas de la misma altura se funden; formas que no cierran -> rectángulo o cuadritos de 2 mm.
import csv, gc, json, os, sys
import numpy as np
import shapely
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
import trimesh
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

RAIZ = os.path.join(os.path.dirname(__file__), '..'); D = os.path.join(RAIZ, 'instalacion', 'datos')
OUT = os.path.join(RAIZ, 'instalacion', 'maqueta', 'zoom_bavaria_corabastos'); os.makedirs(OUT, exist_ok=True)
CFG = json.load(open(os.path.join(RAIZ, 'instalacion', 'config.json'), encoding='utf-8'))
a = sys.argv[1:] + [None] * 5
LARGO = float(a[0] or 500); EXAG = float(a[1] or 1.6); NX = int(a[2] or 3); NY = int(a[3] or 2); H_MAX = float(a[4] or 10)
CXm, CYm, ANm, ALm = 7880.5, 2689.5, 4800.0, 2700.0     # encuadre en metros, marco MODELO
ESC = ANm * 1000 / LARGO                                 # 1:9.600 con 50 cm
TW, TH = LARGO, ALm * 1000 / ESC
PLACA, AGUA_FONDO, H_MIN, BANDA = 3.0, 1.2, 1.0, 0.5
mm_m = 1000 / ESC * EXAG
def mm(x, y): return ((x - (CXm - ANm / 2)) * 1000 / ESC, ((CYm + ALm / 2) - y) * 1000 / ESC)   # y del tablero hacia abajo
MARCO = box(0, 0, TW, TH)

# agua: contornos de la máscara de la instalación (encuadre de toda Kennedy) -> modelo -> mm
LC = CFG['coordenadas']['LC']; R = CFG['rectangulo']
img = plt.imread(os.path.join(D, 'capa_agua.png')); al = img[..., 3]; ph, pw = al.shape
fig = plt.figure(); cs = plt.contour(np.pad(al, 1), levels=[0.5]); plt.close(fig)
def uv_a_mm(u, v):
    xw = R['centro_m'][0] - R['ancho_m'] / 2 + u * R['ancho_m']; zw = R['centro_m'][1] - R['alto_m'] / 2 + v * R['alto_m']
    return mm(xw + LC[0], LC[1] - zw)
AGUA = unary_union([p for path in cs.get_paths() for an in path.to_polygons() if len(an) > 3
                    for p in [Polygon([uv_a_mm((x - 1) / pw, (y - 1) / ph) for x, y in an]).buffer(0)] if p.area > 1.0]).intersection(MARCO.buffer(-0.5))
SUELO = MARCO.difference(AGUA)

# edificios
x0m, x1m, y0m, y1m = CXm - ANm / 2, CXm + ANm / 2, CYm - ALm / 2, CYm + ALm / 2
bandas = {}; n_ed = 0
for e in json.load(open(os.path.join(RAIZ, 'data3d', 'buildings.json'), encoding='utf-8')):
    p = e.get('pts') or []
    if len(p) < 3: continue
    cx = sum(q[0] for q in p) / len(p); cy = sum(q[1] for q in p) / len(p)
    if not (x0m - 50 < cx < x1m + 50 and y0m - 50 < cy < y1m + 50): continue
    g = Polygon([mm(x, y) for x, y in p]).buffer(0)
    if g.is_empty: continue
    hmm = min(H_MAX, max(H_MIN, float(e.get('h') or 6) * mm_m)); b = round(round(hmm / BANDA) * BANDA, 2)
    bandas.setdefault(b, []).append(g); n_ed += 1
SUELO_IN = SUELO.buffer(-0.15); GEO = {}
for b, gs in sorted(bandas.items()):
    celdas = {}
    for g in gs: c = g.centroid; celdas.setdefault((int(c.x // 40), int(c.y // 40)), []).append(g)
    partes = [unary_union([g.buffer(0.12, join_style=2) for g in L]).buffer(-0.12, join_style=2) for L in celdas.values()]
    u = unary_union(partes).intersection(SUELO_IN).simplify(0.05); del partes, celdas; gc.collect()
    GEO[b] = [p for p in getattr(u, 'geoms', [u]) if p.geom_type == 'Polygon' and p.area >= 0.25]

# extrusión robusta (y del tablero -> y de impresión hacia arriba: norte = +y)
CNT = {'aprox': 0}
def ext(q, z0, z1):
    m = trimesh.creation.extrude_polygon(shapely.geometry.polygon.orient(q), z1 - z0, engine='earcut'); m.apply_translation((0, 0, z0))
    if not m.is_watertight: trimesh.repair.fill_holes(m)
    return m if m.is_watertight else None
def extruir(g, z0, z1, mallas):
    for p in getattr(g, 'geoms', [g]):
        if p.is_empty or p.geom_type != 'Polygon' or p.area < 0.05: continue
        q = Polygon([(x, TH - y) for x, y in p.exterior.coords], [[(x, TH - y) for x, y in i.coords] for i in p.interiors]).buffer(0)
        for qq in getattr(q, 'geoms', [q]):
            if qq.geom_type != 'Polygon' or qq.is_empty: continue
            m = ext(qq, z0, z1)
            if m is not None: mallas.append(m); continue
            CNT['aprox'] += 1
            lim = qq.buffer(-0.03, join_style=2).buffer(0.03, join_style=2).simplify(0.02)
            for q2 in getattr(lim, 'geoms', [lim]):
                if q2.geom_type != 'Polygon' or q2.area < 0.05: continue
                m2 = ext(q2, z0, z1)
                if m2 is not None: mallas.append(m2); continue
                rr = q2.minimum_rotated_rectangle
                if rr.area <= 1.25 * q2.area:
                    m3 = ext(rr, z0, z1)
                    if m3 is not None: mallas.append(m3); continue
                bx0, by0, bx1, by1 = q2.bounds
                for gx in np.arange(bx0, bx1, 2.0):
                    for gy in np.arange(by0, by1, 2.0):
                        cel = q2.intersection(box(gx, gy, gx + 2.0, gy + 2.0))
                        for q4 in getattr(cel, 'geoms', [cel]):
                            if q4.geom_type == 'Polygon' and q4.area >= 0.02:
                                m4 = ext(q4, z0, z1)
                                if m4 is not None: mallas.append(m4)

for v in os.listdir(OUT):
    if v.endswith(('.stl', '.3dm')): os.remove(os.path.join(OUT, v))
xs = np.linspace(0, TW, NX + 1); ys = np.linspace(0, TH, NY + 1); FIL = 'ABCDEFGH'
PIEZAS = {f'{FIL[r]}{c + 1}': box(xs[c], ys[r], xs[c + 1], ys[r + 1]) for r in range(NY) for c in range(NX)}
res = {}
for nombre, caja in PIEZAS.items():
    mallas = []; CNT['aprox'] = 0
    extruir(caja, 0, AGUA_FONDO, mallas)
    extruir(SUELO.intersection(caja), AGUA_FONDO - 0.01, PLACA, mallas)
    for b, polys in GEO.items():
        sel = [p.intersection(caja) for p in polys if p.intersects(caja)]
        if sel: extruir(unary_union(sel), PLACA - 0.05, PLACA + b, mallas)
    M = trimesh.util.concatenate(mallas); M.export(os.path.join(OUT, f'zoom_{nombre}.stl'))
    bx = M.bounds; res[nombre] = {'mm': [round(bx[1][0] - bx[0][0], 1), round(bx[1][1] - bx[0][1], 1), round(bx[1][2], 1)], 'triangulos': len(M.faces), 'aproximados': CNT['aprox']}

# Rhino (una capa por pieza, sombreado plano)
import rhino3dm as r3
F3 = r3.File3dm(); F3.Settings.ModelUnitSystem = r3.UnitSystem.Millimeters
for nombre in PIEZAS:
    tm = trimesh.load(os.path.join(OUT, f'zoom_{nombre}.stl')); tm.unmerge_vertices(); mh = r3.Mesh()
    for v in tm.vertices: mh.Vertices.Add(float(v[0]), float(v[1]), float(v[2]))
    for p1, p2, p3 in tm.faces: mh.Faces.AddFace(int(p1), int(p2), int(p3))
    mh.Normals.ComputeNormals(); Ly = r3.Layer(); Ly.Name = 'Pieza ' + nombre; Ly.Color = (235, 235, 235, 255); li = F3.Layers.Add(Ly)
    at = r3.ObjectAttributes(); at.LayerIndex = li; at.Name = Ly.Name; F3.Objects.AddMesh(mh, at)
F3.Write(os.path.join(OUT, 'Bavaria_Corabastos_maqueta.3dm'), 8)
print(json.dumps({'escala': round(ESC), 'tablero_mm': [round(TW, 1), round(TH, 1)], 'exageracion': EXAG, 'edificios': n_ed,
                  'encuadre_modelo_m': [x0m, y0m, x1m, y1m], 'piezas': res}, ensure_ascii=False, indent=1))
