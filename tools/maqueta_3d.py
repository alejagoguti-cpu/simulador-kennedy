# Maqueta de proyección de Kennedy EN RELIEVE para impresión 3D (STL en mm). Por defecto 1:15.300 (Kennedy de 50 cm), alturas x3, 9 piezas.
# Uso: python tools/maqueta_3d.py [escala] [exageración] [piezas por lado]
# Encaja con la proyección de TouchDesigner y con la base de corte láser (instalacion/maqueta/1_base_MDF6mm.*: la silueta rayada marca dónde va).
#   Terreno: placa con la forma de Kennedy de 3 mm (Bogotá es plana: el desnivel real de Kennedy, ~15 m, sería 0,75 mm aun exagerado, no se usa);
#            humedales y río hundidos 1,8 mm (la placa queda de 1,2 mm ahí).
#   Edificios: huellas reales extruidas con su altura × EXAGERACION (3 por defecto). Fuentes:
#     · norte y centro: data3d/buildings.json del simulador (huella y altura h);
#     · sur (donde el simulador no tiene datos, y_modelo < CORTE_Y): Microsoft Global ML Building Footprints (2026-02-03, quadkey 032232112),
#       sin altura publicada -> 9 m (3 pisos, la casa típica del sur de Kennedy) [SUPUESTO].
#   Para que se pueda imprimir con boquilla de 0,4 mm, las casas pegadas de la misma altura se funden en una sola pieza (como se ven en la realidad)
#   y se quitan detalles de menos de 0,3 mm².
import csv, gzip, json, os, sys
import numpy as np
from shapely.geometry import Polygon, box, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree
import trimesh

RAIZ = os.path.join(os.path.dirname(__file__), '..')
D = os.path.join(RAIZ, 'instalacion', 'datos'); MQ = os.path.join(RAIZ, 'instalacion', 'maqueta')
OUT = os.path.join(MQ, 'impresion_3d'); os.makedirs(OUT, exist_ok=True)
CFG = json.load(open(os.path.join(RAIZ, 'instalacion', 'config.json'), encoding='utf-8'))
ESCALA = int(sys.argv[1]) if len(sys.argv) > 1 else 15300           # 1:15.300 -> Kennedy de 50 cm por el lado más largo
EXAGERACION = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0     # x3: lo justo para que las casas se impriman (~1,8 mm)
NPZ = int(sys.argv[3]) if len(sys.argv) > 3 else 3                 # piezas por lado (3 x 3 = 9 piezas de ~17 cm)
ANCHO_TABLERO = 530.0
PLACA, AGUA_FONDO, CORTE_Y = 3.0, 1.2, 600.0
H_MIN, H_MAX, H_SUR = 1.0, 20.0, 9.0      # mm mínimo / máximo de un edificio impreso; altura supuesta (m) en el sur
AN_M, AL_M = CFG['rectangulo']['ancho_m'], CFG['rectangulo']['alto_m']
LC = CFG['coordenadas']['LC']; CX, CZ = CFG['rectangulo']['centro_m']
W, H = AN_M * 1000 / ESCALA, AL_M * 1000 / ESCALA; OX = (W - ANCHO_TABLERO) / 2; TH = H
def uv(u, v): return (u * W - OX, v * H)
def modelo(x, y):
    xw, zw = x - LC[0], LC[1] - y
    return uv((xw - (CX - AN_M / 2)) / AN_M, (zw - (CZ - AL_M / 2)) / AL_M)
def latlng_a_modelo(lat, lng): return ((lng + 74.17) * 110957 + 5193.24, (lat - 4.63) * 110540 + 2090.06)
mm_por_m = 1000 / ESCALA * EXAGERACION

KEN = Polygon([uv(float(r['u']), float(r['v'])) for r in csv.DictReader(open(os.path.join(D, 'limite_kennedy.csv')))]).buffer(0)
# agua: la misma de los archivos de corte (contornos de capa_agua.png)
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
img = plt.imread(os.path.join(D, 'capa_agua.png')); a = img[..., 3]; ph, pw = a.shape
fig = plt.figure(); cs = plt.contour(np.pad(a, 1), levels=[0.5]); plt.close(fig)
AGUA = unary_union([p for path in cs.get_paths() for an in path.to_polygons() if len(an) > 3
                    for p in [Polygon([uv((x - 1) / pw, (y - 1) / ph) for x, y in an]).buffer(0)] if p.area > 1.6]).intersection(KEN.buffer(-0.8))
SUELO = KEN.difference(AGUA)

# ---------- edificios ----------
ed = []  # (polígono en mm, altura en m, fuente)
for e in json.load(open(os.path.join(RAIZ, 'data3d', 'buildings.json'), encoding='utf-8')):
    p = e.get('pts') or []
    if len(p) < 3 or sum(q[1] for q in p) / len(p) < CORTE_Y: continue
    g = Polygon([modelo(x, y) for x, y in p]).buffer(0)
    if not g.is_empty: ed.append((g, float(e.get('h') or 6), 's'))
n_sim = len(ed)
kx0, ky0, kx1, ky1 = KEN.bounds
with gzip.open(os.path.join(MQ, 'fuentes', 'ms_032232112.csv.gz'), 'rt', encoding='utf-8') as f:
    for linea in f:
        j = json.loads(linea); c = j['geometry']['coordinates'][0]
        lng, lat = c[0]
        if not (4.585 < lat < 4.672 and -74.195 < lng < -74.11): continue
        P = [latlng_a_modelo(la, ln) for ln, la in c]
        if sum(q[1] for q in P) / len(P) >= CORTE_Y: continue
        g = Polygon([modelo(x, y) for x, y in P]).buffer(0)
        if g.is_empty or not (kx0 <= g.centroid.x <= kx1 and ky0 <= g.centroid.y <= ky1): continue
        hm = j['properties'].get('height', -1); ed.append((g, hm if hm and hm > 0 else H_SUR, 'm'))
n_ms = len(ed) - n_sim
# solo dentro de Kennedy y fuera del agua
arbol = STRtree([g for g, _, _ in ed]); dentro = set(arbol.query(SUELO.buffer(-0.2), predicate='intersects').tolist())
ed = [ed[i] for i in sorted(dentro)]
# bandas de altura impresa (0,6 mm) -> unión de casas pegadas por banda
bandas = {}
for g, hm, _ in ed:
    hmm = min(H_MAX, max(H_MIN, hm * mm_por_m)); b = round(hmm / 0.6) * 0.6
    bandas.setdefault(b, []).append(g)
GEO = {}
for b, gs in sorted(bandas.items()):
    u = unary_union([g.buffer(0.12, join_style=2) for g in gs]).buffer(-0.12, join_style=2).intersection(SUELO.buffer(-0.15)).simplify(0.06)
    GEO[b] = [p for p in getattr(u, 'geoms', [u]) if p.geom_type == 'Polygon' and p.area >= 0.3]

# ---------- piezas (NPZ x NPZ) ----------
xs = np.linspace(kx0 - 1, kx1 + 1, NPZ + 1); ys = np.linspace(ky0 - 1, ky1 + 1, NPZ + 1)
FIL = 'ABCDEFGH'  # fila de norte a sur (A = norte), columna de oeste a este (1 = oeste): pieza A1 = esquina noroeste
PIEZAS = {f'{FIL[r]}{c + 1}': box(xs[c], ys[r], xs[c + 1], ys[r + 1]) for r in range(NPZ) for c in range(NPZ)}
def extruir(g, z0, z1, mallas):
    for p in getattr(g, 'geoms', [g]):
        if p.is_empty or p.geom_type != 'Polygon' or p.area < 0.05: continue
        # tablero: y hacia abajo; impresión: y hacia arriba (norte = +y)
        q = Polygon([(x, TH - y) for x, y in p.exterior.coords], [[(x, TH - y) for x, y in i.coords] for i in p.interiors])
        if not q.is_valid: q = q.buffer(0)
        for qq in getattr(q, 'geoms', [q]):
            if qq.geom_type != 'Polygon' or qq.is_empty: continue
            m = trimesh.creation.extrude_polygon(qq, z1 - z0, engine='earcut'); m.apply_translation((0, 0, z0)); mallas.append(m)
for v in os.listdir(OUT):
    if v.endswith(('.stl', '.3dm')): os.remove(os.path.join(OUT, v))
resumen = {}
for nombre, caja in PIEZAS.items():
    mallas = []
    extruir(KEN.intersection(caja), 0, AGUA_FONDO, mallas)
    extruir(SUELO.intersection(caja), AGUA_FONDO - 0.01, PLACA, mallas)
    nb = 0
    for b, polys in GEO.items():
        sel = [p.intersection(caja) for p in polys if p.intersects(caja)]
        nb += len(sel); extruir(unary_union(sel) if sel else Polygon(), PLACA - 0.05, PLACA + b, mallas)
    M = trimesh.util.concatenate(mallas); M.merge_vertices()
    cu = M.split(only_watertight=False); ok = []
    for c in cu:
        if not c.is_watertight: trimesh.repair.fill_holes(c)
        if c.is_watertight: ok.append(c)
    M = trimesh.util.concatenate(ok); M.export(os.path.join(OUT, f'kennedy_{nombre}.stl'))
    bx = M.bounds; resumen[nombre] = {'mm': [round(bx[1][0] - bx[0][0], 1), round(bx[1][1] - bx[0][1], 1), round(bx[1][2], 1)], 'triangulos': len(M.faces), 'volumenes_edificio': nb, 'cuerpos_descartados': len(cu) - len(ok)}
print(json.dumps({'edificios_simulador': n_sim, 'edificios_microsoft_sur': n_ms, 'usados': len(ed), 'bandas_mm': sorted(GEO), 'piezas': resumen}, ensure_ascii=False, indent=1))

# vista previa: planta coloreada por altura (para revisar cobertura antes de imprimir)
fig, ax = plt.subplots(figsize=(10, 10), dpi=160); ax.set_aspect('equal'); ax.axis('off'); fig.patch.set_facecolor('#151515')
def pinta(g, c):
    for p in getattr(g, 'geoms', [g]):
        if p.geom_type == 'Polygon' and not p.is_empty: ax.fill(*p.exterior.xy, color=c, lw=0)
pinta(KEN, '#3a3a3a'); pinta(AGUA, '#1d2a33')
cm = plt.get_cmap('magma')
for b, polys in GEO.items():
    for p in polys: ax.fill(*p.exterior.xy, color=cm(0.25 + 0.75 * min(1, b / 12)), lw=0)
ax.set_xlim(kx0 - 3, kx1 + 3); ax.set_ylim(ky1 + 3, ky0 - 3)
fig.savefig(os.path.join(OUT, 'vista_previa_alturas.png'), facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(fig)

# archivo de Rhino con todas las piezas (una capa por pieza), en mm, para mirar o retocar
import rhino3dm as r3
F3 = r3.File3dm(); F3.Settings.ModelUnitSystem = r3.UnitSystem.Millimeters
for nombre in PIEZAS:
    tm = trimesh.load(os.path.join(OUT, f'kennedy_{nombre}.stl')); tm.unmerge_vertices(); mh = r3.Mesh()  # vértices propios por cara: sombreado plano en Rhino
    for v in tm.vertices: mh.Vertices.Add(float(v[0]), float(v[1]), float(v[2]))
    for a3, b3, c3 in tm.faces: mh.Faces.AddFace(int(a3), int(b3), int(c3))
    mh.Normals.ComputeNormals(); mh.Compact()
    Ly = r3.Layer(); Ly.Name = 'Pieza ' + nombre; Ly.Color = (235, 235, 235, 255); li = F3.Layers.Add(Ly)
    at = r3.ObjectAttributes(); at.LayerIndex = li; at.Name = Ly.Name; F3.Objects.AddMesh(mh, at)
F3.Write(os.path.join(OUT, 'Kennedy_maqueta.3dm'), 8)