# Maqueta de proyección · Kennedy 1:20.000

Tablero de **50 × 39,3 cm**. Kennedy ocupa unos **37 × 38 cm** en el centro. Son solo 2 piezas de corte láser, pegadas y pintadas de blanco.

## Archivos para el taller de corte láser

| Archivo | Material | Qué hace la máquina |
|---|---|---|
| `1_base_MDF6mm.svg` | MDF 6 mm | **corta** el rectángulo (rojo) y **raya** 4 cruces de calibración y la silueta de Kennedy (azul) |
| `2_kennedy_MDF3mm.svg` | MDF 3 mm | **corta** el contorno y los humedales/río (rojo), **graba** las calles (negro) y **graba suave** los parques (gris) |

Al taller dile:
- rojo = cortar,
- azul = rayar,
- negro = grabado raster,
- gris = grabado suave.

Las medidas ya vienen en milímetros; no hay que escalar nada. Ninguna pieza pasa de 50 × 40 cm.

## Armado (1 tarde)
1. **Lija suave** (grano 220) las dos piezas y quita el hollín del corte con un trapo húmedo.
2. **Pega** la pieza de Kennedy sobre la base, haciendo coincidir la silueta rayada. Usa pegante de madera en capa fina y pon peso encima 1 hora.
3. **Pinta** con imprimante en aerosol **blanco mate**, 2 o 3 capas delgadas a 25 cm de distancia.
   - Nada de colores ni brillo: el color lo pone la proyección.
   - Los huecos de humedales y río quedan como un escalón de 3 mm, y así se leen solos.
4. Deja secar y retoca con pincel si alguna calle grabada quedó tapada.

## Proyector
- **Brillo:** 3.000 lúmenes o más, en un cuarto oscuro.
- **Posición:** apuntando **recto hacia abajo**. Con un proyector común (relación de tiro 1,2–1,5) queda a unos **85 cm–1,1 m** sobre la maqueta. Un brazo de trípode o una repisa sirven.
- **Qué cae sobre la maqueta:** la imagen de TouchDesigner es 16:9 y la maqueta ocupa la franja central (del 14,2 % al 85,8 % del ancho). El resto cae fuera, sobre la mesa, y la máscara de Kennedy lo deja negro.

## Calibración en TouchDesigner
1. Proyecta la vista con el contorno de Kennedy.
2. En el nodo de ajuste de esquinas (corner pin), mueve las 4 esquinas hasta que el contorno proyectado caiga sobre el borde de la pieza.
3. Las cruces rayadas de la base están en estas posiciones del encuadre (0–1):
   - (0,153 ; 0,020)
   - (0,847 ; 0,020)
   - (0,153 ; 0,980)
   - (0,847 ; 0,980)

   Sirven de referencia fija.

## De dónde salen los datos
- **Contorno, agua y parques:** son los mismos de la instalación (`instalacion/datos`).
- **Calles:** OpenStreetMap, 10.410 vías de toda la localidad, descargadas con Overpass el 22-11-2026 (`fuentes/osm_calles_kennedy.json`).
  - Coinciden con la red vial que proyecta TouchDesigner: diferencia mediana de 4 m, que son 0,2 mm en la maqueta.
  - Los anchos están exagerados lo justo para que se lean: avenidas de 1,3 a 2 mm, calles de barrio de 0,5 mm.

Para regenerar los archivos: `python tools/maqueta_laser.py 20000 500` (escala y ancho del tablero en mm).
