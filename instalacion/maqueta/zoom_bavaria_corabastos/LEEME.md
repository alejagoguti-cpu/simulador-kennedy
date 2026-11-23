# Maqueta rectangular · Corabastos – Bavaria · impresión 3D

Rectángulo de **50 × 28,1 cm** (16:9, la proporción del proyector), norte arriba, a escala **1:13.600**.
- **Área:** 6,8 × 3,8 km, con el norte hasta el río. El 90 % queda dentro de Kennedy. La franja oeste (Bosa) y la esquina noreste quedan fuera: se imprimen igual, pero la proyección las deja oscuras.
- **Corabastos:** centro-izquierda, con sus naves.
- **Bavaria:** arriba a la derecha, con sus bodegas.
- **Entre los dos:** los barrios y las avenidas que los conectan.

## Piezas
4 piezas STL de **25 × 14,1 cm**, para impresora con cama de 25 cm (Bambu X1 / P1S / A1, Prusa MK4…):

| | Oeste | Este |
|---|---|---|
| **Norte** | `zoom_A1.stl` | `zoom_A2.stl` (Bavaria) |
| **Sur** | `zoom_B1.stl` (Corabastos) | `zoom_B2.stl` |

El lado de 25 cm ocupa toda la cama. Ponla en diagonal o **sin borde (brim)**; si la placa se levanta, usa pegamento en barra en la cama. Si la impresora no alcanza, se generan 6 piezas de 16,7 × 14,1 cm con `python tools/maqueta_zoom.py 500 2.27 3 2 10 6800`.
`Bavaria_Corabastos_maqueta.3dm` trae la maqueta completa para verla en Rhino (una capa por pieza).

## Alturas
- **Edificios:** altura real × 2,27, para que una torre de 20 pisos mida **1 cm**. Nada pasa de 1 cm.
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
1. Pega las 4 piezas sobre un tablero plano de unos 52 × 30 cm (A1-A2 arriba, B1-B2 abajo).
2. Proyecta recto desde arriba. Como la maqueta tiene la misma proporción del proyector (16:9), la imagen la cubre completa sin sobrantes.
3. En TouchDesigner ajusta las 4 esquinas de la proyección a las 4 esquinas de la maqueta.

La instalación ya está cambiada a este mismo encuadre:
- `instalacion/config.json` → `rectangulo`.
- Las capas de `instalacion/datos` se volvieron a exportar.

Los edificios proyectados caen exactamente sobre los impresos. El encuadre anterior, de toda Kennedy, quedó guardado en `rectangulo_kennedy_completa` y en `../anterior_kennedy_completa`.

## Datos
- **Fuente:** huellas y alturas reales de `data3d/buildings.json` del simulador. Son 203.456 edificios en el encuadre e incluyen las naves de Corabastos y las bodegas de Bavaria.
- **Simplificación para imprimir:** las casas pegadas de la misma altura se funden. Las formas muy complejas se imprimen con su rectángulo o en cuadritos de 2 mm, para que la pieza cierre; no se pierde ningún edificio.

## Regenerar
- Maqueta: `python tools/maqueta_zoom.py 500 2.27 2 2 10 6800` (largo en mm, exageración, piezas en x, piezas en y, tope en mm, ancho real en m).
- Capas de la instalación: `node tools/exportar_instalacion.mjs`.
