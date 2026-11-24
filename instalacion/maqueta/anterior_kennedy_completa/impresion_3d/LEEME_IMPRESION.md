# Kennedy en relieve · impresión 3D · 1:15.300 · torres de 1 cm

Son **9 piezas STL** que, juntas, forman Kennedy de **48,9 × 50 cm** con los edificios en relieve. Es lo único que hay que fabricar.

- **Escala en planta:** 1:15.300, para que Kennedy mida 50 cm por el lado más largo.
- **Alturas:** reales **× 2,55**, para que una torre de 20 pisos (60 m) mida **1 cm**. Ningún edificio pasa de 1 cm: los 85 que miden más de 60 m (hasta 81 m) quedan en ese tope.
  - Una casa de 3 pisos queda de ~1,5 mm.
  - Lo más alto de la maqueta mide 13,2 mm, contando la placa de 3 mm.
- **Piezas:** se llaman por fila y columna. La fila A es el norte y la C el sur; la columna 1 es el oeste y la 3 el este. A1 es la esquina noroeste.
  - Cada pieza mide 17 × 17 cm o menos, así que caben en cualquier impresora con cama de 18 × 18 cm.
  - Ya vienen en milímetros y en posición: no hay que escalar ni rotar.
- **`Kennedy_maqueta.3dm`:** todas las piezas juntas para mirarlas en Rhino (una capa por pieza).

## Cómo imprimir (Bambu Studio, PrusaSlicer, Cura)
- **Material:** PLA **blanco mate**; no hay que pintarlo para proyectar.
- **Boquilla:** 0,4 mm, o 0,2 mm para más detalle.
- **Altura de capa:** 0,12–0,16 mm.
- **Soportes:** no lleva.
- **Relleno:** 10–15 %, con 2 perímetros.
- **Primera capa:** bien pegada; usa borde (brim) de 3–5 mm si la placa se levanta.

## Armado
1. Pega las 9 piezas sobre un tablero plano de unos 52 × 52 cm (MDF, cartón paja o foamboard). Empieza por B2, la del centro, y sigue con las de alrededor.
2. Si las uniones se notan con la luz, sella con masilla y pasa imprimante blanco mate en aerosol.
3. Proyecta recto desde arriba (unos 1,2–1,5 m). En TouchDesigner mueve las 4 esquinas de la proyección hasta que el contorno proyectado de Kennedy coincida con el borde de la maqueta.

La base de corte láser (`../1_base_MDF6mm.*`, 53 × 51,3 cm, misma escala) es **opcional**: trae rayadas la silueta y 4 cruces que ayudan a ubicar las piezas y a calibrar.

## Qué tiene el modelo
- **Terreno:** placa de 3 mm con la forma de Kennedy; los humedales y el río están hundidos 1,8 mm. Bogotá es plana, así que no hay desnivel que modelar.
- **Norte y centro:** huellas y alturas del simulador (`data3d/buildings.json`).
- **Sur:** el simulador no tiene datos ahí. Se usaron las huellas de Microsoft Global ML Building Footprints (2026-02-03, quadkey 032232112), que no traen altura, así que se supuso **9 m (3 pisos)** [SUPUESTO].
- **Simplificación para poder imprimir:** las casas pegadas de la misma altura se funden y se quitan los volúmenes de menos de 0,3 mm². Unos 430 edificios de forma muy compleja (de unos 15.000 volúmenes) se imprimen con su rectángulo envolvente o cortados en cuadritos de 2 mm, para que la pieza cierre; no se pierde ninguno.
- **Zona vacía al suroeste:** no hay edificios en ninguna de las dos fuentes; no se confirmó si es terreno abierto o un hueco en los datos.

## Regenerar
`python tools/maqueta_3d.py 15300 2.55 3 10` (escala, exageración, piezas por lado, tope de altura en mm).

La fuente de Microsoft no se sube al repositorio. Se descarga de:

https://minedbuildings.z5.web.core.windows.net/global-buildings/2026-02-03/global-buildings.geojsonl/RegionName=Colombia/quadkey=032232112/part-00130-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz