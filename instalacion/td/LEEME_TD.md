# KENNEDY REACCIONA · proyecto TouchDesigner (nivel 1)

Archivo: `instalacion/td/KennedyReacciona.toe` (TouchDesigner 2025.33230). Construido y verificado con TDMCP.
Red: `/project1/KENNEDY_REACCIONA` (atajo `parent.Kr`).

**Encuadre: TODA la localidad de Kennedy** (límite OSM `data3d/kennedy.json`), 13.960 × 7.852,5 m en 16:9, norte arriba; fuera del límite no se proyecta (máscara). Maqueta a 1:8.000 → la localidad ocupa ~94 × 96 cm.

## Qué funciona (verificado en TouchDesigner)

| Componente | Contenido | Estado |
|---|---|---|
| c01_DATOS | `datos` (módulo Python): carga `instalacion/datos/` (vehiculos.npy, red_vial.csv, meta.json) | funciona |
| c02_GEOMETRIA | capas fijas del 3D del simulador como imágenes (`img_edificios` 243.538 edificios, `img_parques` 996, `img_agua` 47 cuerpos de agua, `img_arboles` 119.886, `img_colegios_huertas`, `img_kennedy_mascara`) → `glsl_territorio` (colores: verde ecología, azul agua, violeta colegios, blanco tenue edificios, contorno ámbar); `script_red` → `null_red` (29.881 tramos de la red vial del simulador), `geo_red`, `cam_ortho` (cámara ortográfica cenital, 16 × 9 unidades = 1.600 × 900 m) | funciona |
| c03_MOVILIDAD | `script_vehiculos` → `null_vehiculos` (tx, ty, color por velocidad, vel), `geo_vehiculos` (instancing de puntos), `mat_vehiculo` (aditivo) | funciona |
| c09_VISUALIZACION | `render_red`, `render_veh`, estela por feedback, `fondo_negro`, `comp_final` → `null_vis`. `web_proyeccion` = respaldo web (apagado: el Web Render bloquea TouchDesigner en este equipo) | funciona |
| c10_PROJECTION_MAPPING | `select_vis`, `glsl_cuadricula` (cuadrícula 100/500 m, borde y cruz), `switch_modo`, `cornerpin_maqueta` (4 esquinas), `null_salida`, `ventana_proyector` | funciona (la ventana no se ha probado con un proyector real) |
| c11_CONTROLES | reloj: `tasa` → `speed_reloj` → `null_reloj` (segundos de simulación); `pulsos` (reiniciar, abrir/cerrar proyector) | funciona |
| c04–c08, c12 | vacíos: ruido, ecología, sintaxis, intervenciones, escenarios, indicadores (niveles 2 y 3) | pendiente |

## Controles (parámetros de KENNEDY_REACCIONA)
- Página **Controles**: Modo del proyector (Presentación / Cuadrícula / Calibración), Pausa, Velocidad (×), Hora de inicio, Reiniciar, capas Movilidad y Red vial, Demanda por hora, Estela, Tamaño del punto, Intensidad de la red.
- Página **Calibracion**: las 4 esquinas (fracción 0–1, origen abajo a la izquierda), Pantalla del proyector, Abrir/Cerrar salida.

## Origen de cada cosa que se ve (no se inventa nada)
- **Vehículos**: REPRODUCCIÓN de la grabación SUMO del simulador (`data3d/traf`, 1.500 s, en bucle). No se re-simula. Se omite el arranque (0–300 s, cuando la red se llena) y se reproduce el régimen estable (85–100 vehículos en el encuadre).
- **Color**: velocidad grabada (<1, 1–5, 5–10, >10 m/s).
- **Cantidad por hora**: perfil horario de demanda del simulador (ESTIMADO, perfil típico de Bogotá; la grabación es de hora pico = 100 %).
- **Estela**: rastro visual de las posiciones anteriores de cada vehículo (solo sobre su trayectoria grabada); recurso visual, no un dato.
- **Red vial**: `data3d/net.json` del simulador.

## Limitaciones conocidas
- Licencia No Comercial: resolución máxima 1280 × 1280 → la salida es 1280 × 720 y la ventana la escala al proyector.
- La grabación SUMO tiene hasta 2.581 vehículos a la vez en Kennedy; se omite el arranque (0–300 s).
- El sur de Kennedy no tiene edificios en los datos del simulador (allí el 3D usa la malla de Google, que no es geometría exportable): esa zona se ve con vías, parques, agua y árboles.
- La consola web (`instalacion/consola.html`) aún no controla TouchDesigner (pendiente: leer el relé desde TD).

## Regenerar los datos
`node tools/exportar_instalacion.mjs` (lee `instalacion/config.json`; si cambia el encuadre, vuelve a exportar).

## Efectos visuales (página «Espectaculo») — NO son datos
- **Resplandor (bloom)**: brillo alrededor de lo que ya está dibujado (vehículos, ruido, sintaxis, agua). No cambia ningún valor.
- **Pulso de agua y parques**: el brillo de esas capas oscila lentamente («respira»). Recurso visual.
- **Barrido de luz**: una franja que recorre Kennedy de oeste a este cada N segundos. Recurso visual.
- **Revelar capas desde Bavaria**: al cambiar de capa temática, la nueva aparece en un círculo que crece desde el predio de Bavaria. Recurso visual.
- **Estela de los vehículos**: rastro de sus posiciones grabadas anteriores (solo sobre su trayectoria SUMO).
Estos efectos usan un reloj visual aparte (`c11_CONTROLES/null_tvisual`), no el reloj de la simulación.