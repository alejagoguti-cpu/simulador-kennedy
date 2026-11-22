# Kennedy en relieve · impresión 3D · 1:20.000

Son 4 piezas STL que, juntas, forman Kennedy en **37 × 38 cm** con los edificios en relieve. Van sobre la base de 50 × 39,3 cm, que es la de corte láser (`../1_base_MDF6mm.svg` o `.dxf`): la silueta rayada en la base marca dónde van las piezas, y así la proyección de TouchDesigner cae encima con solo ajustar las 4 esquinas.

| Pieza | Medidas (mm) |
|---|---|
| `kennedy_A_noroeste.stl` | 187 × 191 × 25 |
| `kennedy_B_noreste.stl` | 187 × 191 × 25 |
| `kennedy_C_suroeste.stl` | 184 × 187 × 10 |
| `kennedy_D_sureste.stl` | 165 × 191 × 25 |

Caben en cualquier impresora con cama de 200 × 200 mm o más. Ya vienen en milímetros y en posición: no hay que escalar ni rotar.

## Cómo imprimir (Bambu Studio, PrusaSlicer, Cura)
- **Material:** PLA **blanco mate**, que sirve para proyectar sin pintar.
- **Boquilla:** 0,4 mm. Con 0,2 mm salen más nítidas las casas pequeñas, pero tarda más.
- **Altura de capa:** 0,12–0,16 mm.
- **Soportes:** no lleva, todo es vertical.
- **Relleno:** 10–15 %, con 2 perímetros.
- **Primera capa:** que quede bien pegada, porque la placa es grande y delgada (3 mm). Usa borde (brim) de 3–5 mm si se levanta en las esquinas.
- **Tiempo:** el programa de impresión te dice el tiempo exacto de cada pieza.

## Armado
1. Quita el borde (brim) y lija suave los cantos de unión de las piezas.
2. Pega las 4 piezas sobre la base siguiendo la silueta rayada. Empieza por A, luego B, C y D, con pegante de contacto o cianoacrilato en gel.
3. Si las uniones se notan con la proyección, sella con masilla y pasa una mano de imprimante blanco mate en aerosol a toda la maqueta.

## Qué tiene el modelo
- **Terreno:** placa de 3 mm con la forma de Kennedy; los humedales y el río están hundidos 1,8 mm. Bogotá es plana: el desnivel real de Kennedy no se nota a esta escala, así que no se usa.
- **Edificios:** su altura real **× 6**, para que se lean. Una casa de 3 pisos queda de unos 3 mm y las torres llegan a 22 mm.
  - **Norte y centro:** huellas y alturas del simulador (`data3d/buildings.json`).
  - **Sur:** el simulador no tiene datos ahí. Se usaron las huellas de Microsoft Global ML Building Footprints (publicación 2026-02-03, quadkey 032232112), que no traen altura, así que se supuso **9 m (3 pisos)** para todas [SUPUESTO].
- **Simplificación para poder imprimir:**
  - las casas pegadas de la misma altura se funden en una sola pieza;
  - se quitan los detalles de menos de 0,3 mm²;
  - se quitaron 164 volúmenes diminutos que no cerraban (de más de 20.000).
- **Zona vacía al suroeste:** no hay edificios en ninguna de las dos fuentes de datos. Puede ser terreno abierto o un hueco de los datos; no se confirmó.

## Rhino
No hace falta. Si quieres retocar algo, importa los STL (Archivo > Importar) en milímetros: ya vienen en su posición.

## Regenerar
Ejecuta `python tools/maqueta_3d.py` (escala, exageración y alturas al inicio del archivo).

La fuente de Microsoft (`fuentes/ms_032232112.csv.gz`, 47 MB) no se sube al repositorio. Se descarga de:

https://minedbuildings.z5.web.core.windows.net/global-buildings/2026-02-03/global-buildings.geojsonl/RegionName=Colombia/quadkey=032232112/part-00130-4feead82-d499-422b-94cb-c036c212127a.c000.csv.gz
