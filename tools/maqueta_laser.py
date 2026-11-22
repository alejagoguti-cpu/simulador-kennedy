# Maqueta de proyección de KENNEDY REACCIONA: archivos de corte láser (SVG en mm). Por defecto escala 1:20.000, tablero de 50 cm.
# El tablero es un recorte centrado del encuadre de TouchDesigner (instalacion/config.json: 13.960 x 7.852,5 m, 16:9, norte arriba):
# su altura es la del encuadre completo y su ancho 50 cm, así la proyección actual cae sobre la maqueta sin volver a exportar capas.
# Solo 2 piezas: base (MDF 6 mm) y Kennedy (MDF 3 mm) pegada encima. Luego imprimante blanco mate.
# Fuentes: instalacion/datos/limite_kennedy.csv (contorno), capa_agua.png y capa_parques.png (mismo encuadre),
#          instalacion/maqueta/fuentes/osm_calles_kennedy.json (calles de OpenStreetMap, Overpass, toda la localidad).
# Colores de cortadora láser: ROJO línea fina = cortar · AZUL línea fina = rayar · NEGRO relleno = grabar · GRIS relleno = grabar suave.
import csv, json, os, sys
import numpy as np
from shapely.geometry import Polygon, LineString, box
from shapely.ops import unary_union
from shapely.affinity import translate
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

RAIZ = os.path.join(os.path.dirname(__file__), '..')
D = os.path.join(RAIZ, 'instalacion', 'datos')
OUT = os.path.join(RAIZ, 'instalacion', 'maqueta'); os.makedirs(OUT, exist_ok=True)
CFG = json.load(open(os.path.join(RAIZ, 'instalacion', 'config.json'), encoding='utf-8'))
ESCALA = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
ANCHO_TABLERO = float(sys.argv[2]) if len(sys.argv) > 2 else 500.0  # mm
AN_M, AL_M = CFG['rectangulo']['ancho_m'], CFG['rectangulo']['alto_m']
LC = CFG['coordenadas']['LC']; CX, CZ = CFG['rectangulo']['centro_m']
W, H = AN_M * 1000 / ESCALA, AL_M * 1000 / ESCALA      # mm del encuadre completo de la proyección
OX = (W - ANCHO_TABLERO) / 2                               # el tablero es la franja central del encuadre
TW, TH = ANCHO_TABLERO, H
def uv(u, v): return (u * W - OX, v * H)
def modelo(x, y):  # marco MODELO del simulador -> mm del tablero
    xw, zw = x - LC[0], LC[1] - y
    return uv((xw - (CX - AN_M / 2)) / AN_M, (zw - (CZ - AL_M / 2)) / AL_M)
def latlng(lat, lng): return modelo((lng + 74.17) * 110957 + 5193.24, (lat - 4.63) * 110540 + 2090.06)

KEN = Polygon([uv(float(r['u']), float(r['v'])) for r in csv.DictReader(open(os.path.join(D, 'limite_kennedy.csv')))]).buffer(0)
assert KEN.bounds[0] > 0 and KEN.bounds[2] < TW, 'Kennedy no cabe en el ancho del tablero'

def poligonos_png(nombre, min_mm2):
    img = plt.imread(os.path.join(D, nombre)); a = img[..., 3] if img.shape[-1] == 4 else img[..., 0]
    ph, pw = a.shape; fig = plt.figure(); cs = plt.contour(np.pad(a, 1), levels=[0.5]); plt.close(fig); polys = []
    for path in cs.get_paths():
        for an in path.to_polygons():
            if len(an) < 4: continue
            p = Polygon([uv((x - 1) / pw, (y - 1) / ph) for x, y in an]).buffer(0)
            if p.area >= min_mm2: polys.append(p)
    return unary_union(polys) if polys else Polygon()
esc2 = (12500 / ESCALA) ** 2
AGUA = poligonos_png('capa_agua.png', 4.0 * esc2).intersection(KEN.buffer(-0.8))
PARQ = poligonos_png('capa_parques.png', 3.0 * esc2).intersection(KEN).difference(AGUA)

# calles (OSM): ancho grabado en mm según jerarquía (exagerado lo justo para que se lea y para que el láser lo haga)
ANCHO = {'motorway': 2.0, 'trunk': 2.0, 'primary': 1.8, 'secondary': 1.3, 'tertiary': 0.9,
         'motorway_link': 0.9, 'trunk_link': 0.9, 'primary_link': 0.9, 'secondary_link': 0.7, 'tertiary_link': 0.6,
         'unclassified': 0.5, 'residential': 0.5, 'living_street': 0.45, 'pedestrian': 0.45}
OSM = json.load(open(os.path.join(OUT, 'fuentes', 'osm_calles_kennedy.json'), encoding='utf-8'))
por_ancho = {}
for e in OSM['elements']:
    g = e.get('geometry'); a = ANCHO.get(e.get('tags', {}).get('highway'))
    if not g or not a or len(g) < 2: continue
    por_ancho.setdefault(a, []).append(LineString([latlng(p['lat'], p['lon']) for p in g]))
CALLES = unary_union([unary_union(ls).buffer(a / 2, cap_style=1, join_style=1, resolution=4) for a, ls in por_ancho.items()])
CALLES = CALLES.intersection(KEN.buffer(-0.3)).difference(AGUA).simplify(0.03)
PARQ = PARQ.difference(CALLES)

def anillos(g):
    for p in getattr(g, 'geoms', [g]):
        if p.is_empty or p.geom_type != 'Polygon': continue
        yield p.exterior.coords
        for i in p.interiors: yield i.coords
def d_poly(g): return ' '.join('M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in c) + ' Z' for c in anillos(g))
def svg(nombre, capas, titulo):
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW:.1f}mm" height="{TH:.1f}mm" viewBox="0 0 {TW:.2f} {TH:.2f}">', f'<title>{titulo}</title>']
    for idc, d, estilo in capas: s.append(f'<g id="{idc}"><path d="{d}" {estilo}/></g>')
    s.append('</svg>'); open(os.path.join(OUT, nombre), 'w', encoding='utf-8').write('\n'.join(s))
CORTE = 'fill="none" stroke="#FF0000" stroke-width="0.1"'
RAYA = 'fill="none" stroke="#0000FF" stroke-width="0.1"'
M = 8  # mm: cruces de calibración, 8 mm adentro de cada esquina
CR = [(M, M), (TW - M, M), (M, TH - M), (TW - M, TH - M)]
cruces = ' '.join(f'M{x-5:.2f},{y:.2f} L{x+5:.2f},{y:.2f} M{x:.2f},{y-5:.2f} L{x:.2f},{y+5:.2f}' for x, y in CR)
for f in os.listdir(OUT):
    if f.endswith(('.svg', '.png')): os.remove(os.path.join(OUT, f))
svg('1_base_MDF6mm.svg', [('cortar', d_poly(box(0, 0, TW, TH)), CORTE), ('rayar_cruces_y_silueta', cruces + ' ' + d_poly(KEN), RAYA)],
    f'Base de la maqueta Kennedy 1:{ESCALA} - MDF 6 mm')
svg('2_kennedy_MDF3mm.svg', [('grabar_suave_parques', d_poly(PARQ), 'fill="#999999" stroke="none"'),
                             ('grabar_calles', d_poly(CALLES), 'fill="#000000" stroke="none"'),
                             ('cortar_contorno_y_agua', d_poly(KEN) + ' ' + d_poly(AGUA), CORTE)],
    f'Pieza de Kennedy 1:{ESCALA} - MDF 3 mm')

# vista previa (como queda pintada de blanco, con luz rasante)
fig, ax = plt.subplots(figsize=(TW / 40, TH / 40), dpi=200); ax.set_xlim(-6, TW + 6); ax.set_ylim(TH + 6, -6); ax.set_aspect('equal'); ax.axis('off')
fig.patch.set_facecolor('#1e1e1e'); ax.add_patch(plt.Rectangle((0, 0), TW, TH, color='#e4e1dc'))
def pinta(g, c, z):
    for p in getattr(g, 'geoms', [g]):
        if p.is_empty or p.geom_type != 'Polygon': continue
        ax.fill(*p.exterior.xy, color=c, zorder=z, lw=0)
        for i in p.interiors: ax.fill(*i.xy, color='#f7f6f3' if z > 1 else '#e4e1dc', zorder=z, lw=0)
pinta(KEN.buffer(0.6).difference(KEN), '#b9b5ae', 1); pinta(KEN, '#f7f6f3', 1); pinta(PARQ, '#dcd9d3', 2); pinta(CALLES, '#8d8a85', 3); pinta(AGUA, '#e4e1dc', 4)
for x, y in CR: ax.plot([x - 5, x + 5], [y, y], color='#3b5bdb', lw=0.6); ax.plot([x, x], [y - 5, y + 5], color='#3b5bdb', lw=0.6)
fig.savefig(os.path.join(OUT, 'vista_previa.png'), facecolor=fig.get_facecolor(), bbox_inches='tight'); plt.close(fig)
x0, y0, x1, y1 = KEN.bounds
# posición de las cruces en el encuadre de TouchDesigner (0-1), para ajustar las esquinas de la proyección
cr_uv = [[round((x + OX) / W, 4), round(y / H, 4)] for x, y in CR]
info = {'escala': ESCALA, 'tablero_mm': [round(TW, 1), round(TH, 1)], 'kennedy_mm': [round(x1 - x0, 1), round(y1 - y0, 1)],
        'cruces_uv_en_encuadre_TD': cr_uv, 'tablero_uv_en_encuadre_TD': [round(OX / W, 4), 0, round((OX + TW) / W, 4), 1],
        'calles_osm': sum(len(v) for v in por_ancho.values()), 'agua_huecos': len(getattr(AGUA, 'geoms', [AGUA]))}
json.dump(info, open(os.path.join(OUT, 'medidas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(json.dumps(info, ensure_ascii=False))
