# Maqueta rectangular · Corabastos – Bavaria · impresión 3D

Rectángulo de **50 × 28,1 cm** (16:9, la proporción del proyector), norte arriba, a escala **1:9.600**.
- **Área:** 4,8 × 2,7 km.
- **Corabastos:** abajo a la izquierda, con sus naves.
- **Bavaria:** arriba a la derecha, con sus bodegas.
- **Entre los dos:** los barrios y las avenidas que los conectan.

## Piezas
6 piezas STL de **16,7 × 14,1 cm**, que caben en cualquier impresora:

| | Oeste | Centro | Este |
|---|---|---|---|
| **Norte** | `zoom_A1.stl` | `zoom_A2.stl` | `zoom_A3.stl` (Bavaria) |
| **Sur** | `zoom_B1.stl` (Corabastos) | `zoom_B2.stl` | `zoom_B3.stl` |

`Bavaria_Corabastos_maqueta.3dm` trae la maqueta completa para verla en Rhino (una capa por pieza).

## Alturas
- **Edificios:** altura real × 1,6, para que una torre de 20 pisos mida **1 cm**. Nada pasa de 1 cm.
- **Casas:** una de 3 pisos queda de ~1,5 mm.
- **Placa del terreno:** 3 mm. Los humedales y canales están hundidos 1,8 mm.
- **Lo más alto de la maqueta:** 13 mm.

## Cómo imprimir
- **Material:** PLA **blanco mate**, sin pintar.
- **Capa:** 0,12–0,16 mm.
- **Soportes:** no lleva.
- **Relleno:** 10–15 %.
- **Primera capa:** borde (brim) de 3–5 mm si la placa se levanta.

## Armado y proyección
1. Pega las 6 piezas sobre un tablero plano de unos 52 × 30 cm (A1-A2-A3 arriba, B1-B2-B3 abajo).
2. Proyecta recto desde arriba. Como la maqueta tiene la misma proporción del proyector (16:9), la imagen la cubre completa sin sobrantes.
3. En TouchDesigner ajusta las 4 esquinas de la proyección a las 4 esquinas de la maqueta.

La instalación ya está cambiada a este mismo encuadre:
- `instalacion/config.json` → `rectangulo`.
- Las capas de `instalacion/datos` se volvieron a exportar.

Los edificios proyectados caen exactamente sobre los impresos. El encuadre anterior, de toda Kennedy, quedó guardado en `rectangulo_kennedy_completa` y en `../anterior_kennedy_completa`.

## Datos
- **Fuente:** huellas y alturas reales de `data3d/buildings.json` del simulador. Son 93.947 edificios en el encuadre e incluyen las naves de Corabastos y las bodegas de Bavaria.
- **Simplificación para imprimir:** las casas pegadas de la misma altura se funden. Las formas muy complejas se imprimen con su rectángulo o en cuadritos de 2 mm, para que la pieza cierre; no se pierde ningún edificio.

## Regenerar
- Maqueta: `python tools/maqueta_zoom.py 500 1.6 3 2 10` (largo en mm, exageración, piezas en x, piezas en y, tope en mm).
- Capas de la instalación: `node tools/exportar_instalacion.mjs`.
