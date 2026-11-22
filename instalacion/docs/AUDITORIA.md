# Auditoría técnica del simulador de Kennedy para «Kennedy Reacciona»

Alcance: `C:\Users\ACER\simulador-reloj` (three.js; `index.html` 3.739 líneas, `data3d/` 121 archivos + subcarpetas, `tools/`). Todo lo de abajo se verificó leyendo código y datos; las cifras de conteo salen de scripts que recorrieron los JSON. Cita `archivo:línea` (rutas relativas a `data3d/` salvo `index.html`).

Etiquetas: **CALC** = modelo que corre; **PRE** = dato o grabación precalculada que se reproduce; **SUP** = supuesto `[SUP]` declarado en el código; **VIS** = solo visual.

Hallazgos que cambian el plan (leer primero):
1. No hay WebSocket, OSC, BroadcastChannel ni EventSource en ningún `.js/.html` del simulador (búsqueda en todo el repo). Hay que añadir el puente.
2. `T3` (el objeto con casi todo el estado) es `let` de módulo en `index.html:647/1350`; NO es global. Lo que sí cuelga de `window` está en la P5.
3. Hay **tres marcos de coordenadas** (modelo, mundo, giro) más el de picos; ver sección final. Mezclarlos es el error más probable.
4. SUMO no corre aquí: son 1.500 s grabados en bucle (`traf/index.json`), y el «cierre de vía» existe en dos versiones distintas (P9).

---

## 1. Sistemas de simulación implementados

| Sistema | Archivo:línea | Tipo | Qué hace de verdad |
|---|---|---|---|
| Reloj universal `SimClock` | `reloj.js:1-47, 71, 299` | CALC | Paso fijo DT=1 s; tope 3600 pasos y 6 ms de lógica por cuadro (`reloj.js:71`); determinista por semilla; `+2 h` corre la lógica real sin dibujar. Sin DOM, corre en Node/Worker. |
| Modelo semanal A/B/C | `sim_vida.js:1-19, 180` | CALC | Regla de paso semanal con semilla; 52 semanas/año, población 1.034.000 (`sim_vida.js:23`). Sin año final; historia submuestreada. |
| 3 reglas de game over | `sim_vida.js:166-177, 343-344` | CALC | Hábitat (especies ≤70 % del inicio), Abastecimiento (alguna zona <80 %), Residuos (pendiente > almacenamiento); 4 semanas seguidas. Mismas reglas en A, B y C. |
| Cierre de vía (modelo semanal) | `sim_vida.js:44, 70-71, 210-219` | CALC sobre PRE | Un evento al azar, `pAño 0,3` y 1-6 semanas **[SUP]**. Aplica un factor f precalculado por zona y fuente (`sim_red_datos.js` `CIERRES`, 5 vías); recuperación exponencial con τ. |
| Tráfico SUMO | `traf/c00..c14.bin`, `traf/index.json`; lectura `index.html:2467-2495, 2565-2645` | PRE | 1.500 pasos de 1 s, 4.202 vehículos, máx. 2.581 simultáneos, escala 5 (`traf/index.json`). Se repite en bucle y hasta 3 copias desfasadas 487 s (`index.html:2571, 2617`). Lo leen: `index.html` (dibujo), `capas_escenario.js:120-131` (flujo para ruido), `ruido_cierre.js:87-96` (desvíos), `trafico_crece.js`. |
| Tráfico que crece (escenario A) | `trafico_crece.js:1-9` | CALC sobre PRE | Réplicas desfasadas de la misma grabación en proporción a +1,5 %/año carros, 0 % motos y camiones (**SUP**). |
| Ruido | `capas_escenario.js:47-149` | CALC sobre PRE + SUP | dB(A) por celda de 16 m de vía; ver P9. |
| Cierre de vía (visual) | `ruido_cierre.js:1-6, 79-125` | CALC (Dijkstra real) | Quita la vía de `net.json` y desvía por calles vecinas los MISMOS vehículos grabados; «ilustrativo», no re-simula. |
| Viajes de abastecimiento | `viajes_mercados.js:1-30` | CALC | Demanda por zonas de 500 m, destino abierto más cercano por red, Dijkstra por destino, flujo por tramo y vehículos-km, hoy vs propuesta. 33 parámetros/`[SUP]`. |
| Biótica | `biotica.js:1-12` | CALC | ABM de aves y polinizadores (Couzin, valor marginal) sobre la red `biotica.json`; flora anclada a `trees.json`. Corre en paso del reloj. |
| Sintaxis espacial (DepthmapX) | `giro_sim.js:1-12`; `tools/bavaria_pres_datos.py`, `tools/sintaxis_proyecto_build.js` | PRE | Análisis angular de segmentos **reimplementado** en Python (no es DepthmapX); NAIN n, NAIN 800 m, NACH. `giro_sim.js` solo los consume y mueve agentes por probabilidad proporcional (Hillier). |
| Red de mercados | `mercados_red.js:1-19, 83` | CALC (calendario) + VIS | 35 sitios (26 barrio, 9 plazoleta) abren año 0,5-10 según proFrac; ubicación precalculada. |
| Corabastos parque / La Vaca | `corabastos_parque.js:1-9` | CALC (cuándo) + VIS | Cuándo desmonta bodegas lo decide `sim_vida.js` (regla DESMONTE, 26 sem de obra); lo demás es dibujo. |
| Huertas de barrio | `huertas_barrio.js:1-6` | VIS | Ubicaciones PRE (`tools/huertas_barrio_build.py`); las abre el modelo semanal. |
| Hidroponía y polinizadores | `huertas_hidro.js:1-12` | VIS | Instancias sobre techos; visitas de fauna como arcos. |
| Distrito Bavaria Común (NBIC) | `bavaria_distrito.js:1-13, 32-45` | VIS + PRE | 13 entradas de programa (12 edificios + huertas); sintaxis «después» precalculada. |
| Plan E1 Bavaria | `bavaria_plan.js:1-9` | VIS | Programa arquitectónico, agentes y arcos. Declara «hipótesis de diseño». |
| Propuesta (agentes God's Eye) | `propuesta.js:1-15`, `propuesta.json` | CALC (día) | Compradores, camiones, bicicargas, regla de costo Corabastos vs mercado; nodos exportados de Unreal. Sistema paralelo al semanal. |
| Estrategias E1-E9 | `estrategias.js:1-8`, `estrategias.json` | VIS + PRE | Ubicaciones desde shapefile de lotes; E2, E6, E7, E9 no tienen ubicación única. |
| Indicadores 3D (picos) | `indicadores.js:1-8` | PRE | 12 superficies de picos (SE, EPO, IC, PA, OC, CO, CCL, PM, CV + 3 de 2020). |
| Evaluar (Monte Carlo) | `sim_vida_worker.js:1-8`, `vida_evaluar.js:1-4` | CALC | 30 corridas con semillas 1..30 en Web Worker. |

## 2. Variables que cambian en el tiempo

| Variable | Ritmo | Dónde | Tipo |
|---|---|---|---|
| `RELOJ.t` (s simulados), minuto del día, día, semana, año | 1 s por paso; ×1/60/600/3600/máx (`reloj.js:45`) | `reloj.js:42-47` | CALC |
| Semana del modelo `SIMST.t` | 1, 4, 13, 26 o 52 sem/s real (`reloj.js:46`); 520 sem = 10 años (`sim_modelos.js:5`) | `sim_vida.js` | CALC |
| Hogares activos con huerta, promotores, superficie | semanal | `sim_vida.js:227-237` | CALC |
| Dependencia de Corabastos, zona mínima abastecida (`zMin`), kg a Bavaria/mercados | semanal | `sim_vida.js:273-283, 337` | CALC |
| Orgánicos pendientes vs almacenamiento | semanal | `sim_vida.js:337` | CALC |
| Aves (`B`), humedal (`W`), especies con presencia (`esp`) | semanal | `sim_vida.js:337` | CALC |
| Cierre activo (vía, semana k de n) | semanal | `sim_vida.js:341` | CALC + azar con semilla |
| Posición de vehículos | 1 s grabado, interpolado por cuadro | `index.html:2610-2645` | PRE |
| Fauna, aves, peatones, agentes | paso del reloj, 1 s | `biotica.js`, `giro_sim.js` | CALC |
| Mercados abiertos | continuo vs semana del modelo | `mercados_red.js:10-12` | CALC |
| Nivel de ruido (dB) | se rehace al mover un control o cambiar nº de árboles | `capas_escenario.js:90, 130` | CALC |
| Cielo y luz | minuto del día | `cielo.js` | VIS |

La escala del día NO simula los 604.800 s de cada semana: muestra «un día típico» leyendo el estado semanal (`reloj.js:37-40`).

## 3. Cálculo vs representación visual

| Es cálculo | Es solo visual |
|---|---|
| `sim_vida.js` completo (abasto, residuos, hábitat, cierre, reglas) | `huertas_barrio.js`, `huertas_hidro.js`, `huertas_techo.js` (dibujan lo que el modelo dice) |
| `viajes_mercados.js` (Dijkstra, flujos, vehículos-km) | `bavaria_plan.js`, `bavaria_distrito.js` (volúmenes, arcos, gente) |
| Modelo de ruido (rejilla + factores de energía) | `bavaria.js`, `corabastos.js`, `tintal.js`, `conjuntos.js` (edificios propios) |
| `ruido_cierre.js` Dijkstra de desvíos | Capa Google fotorrealista, árboles, cielo |
| `biotica.js` (ABM), `giro_sim.js` (movimiento natural) | Etiquetas y pulsos de `estrategias.js` |
| Puntaje de picos: NO es cálculo, es PRE | Colores e interfaz glass |

Ojo: los mapas de color de sintaxis y los picos son pintura de datos precalculados, no de un modelo vivo.

## 4. Información espacial reutilizable

| Capa | Archivo (tamaño) | Formato y marco |
|---|---|---|
| Red vial | `net.json` (811 KB) | `{offset:[0,0], bbox:[0,0,10682.66,6323.8], edges:[[clase,[[x,y],…]],…]}`; 19.037 aristas; clases `local` 15.609, `mid` 2.778, `major` 650. Marco MODELO. **Sin nombre, sentido ni velocidad por arista.** |
| Edificios (huellas) | `buildings.json` (37,7 MB) | `[{pts:[[x,y]…cerrado], h}]`; 243.538; marco MODELO |
| Edificios binarios | `edif/index.json` + `edif/c_*.bin` (55 archivos, 9,6 MB) | Celdas de 1 km, cuantización 0,25 m, `X0=-2000,Y0=-3000,Q=4` (`tools/edif_build.py:4`); se decodifican con `decodificarEdificios` |
| Usos del suelo | `usos_edif.json` (1,1 MB) | `{código:[i,j,…]}` celdas de 2 m del centroide, 7 clases (1 residencial 80.872 … 7: 12) (`usos_suelo.js:7-10` nombres) |
| Manzanas | **No existe capa de manzanas.** Solo huellas, parques y red. | n/a |
| Parques | `parques.json` (885 KB) | `[{nombre,tipo,pts}]`; 996; MODELO |
| Humedales y agua | `water_bodies.json` (170 KB) | `[{nombre,tipo,pts}]`; 47; MODELO |
| Colegios | `colegios.json` (136 KB) | `{colegios:[{n,c,a,poly}]}`; 74; **MUNDO** (`colegios_red.js:3`) |
| Mercados | `sim_red_datos.js` `MERCADOS` (35) | `{id,n,tipo,x,z,cap,desde}` MUNDO |
| Parches de hábitat | `sim_red_datos.js` `PARCHES` (71) | `{id,n,t,x,z,ha,k}` MUNDO |
| Zonas de demanda | `sim_red_datos.js` `ZONAS` (134) | `[x,z,población]` MUNDO, celdas de 500 m |
| Huertas de barrio | `huertas_barrio.json` (672 KB) | 56 sitios, módulos `{c,a,l,w}` MUNDO |
| Árboles | `trees.json` (2,7 MB) | `{sp:[…], t:[[x,y,altura?,idEsp]…]}`; 119.886; MODELO |
| Sintaxis hoy | `giro_sim.json` (2,1 MB) | nodos y calles con `i`, `c` en percentil 0-1; marco GIRO |
| Sintaxis antes/después | `bavaria_sx.json` (3,5 MB) | 37.987 segmentos `{p,n,k,a:[3],b:[3]}` MODELO; `n=1` marca 20 pasajes nuevos |
| Sintaxis propuesta (resumen) | `sintaxis_proyecto.json` (2,4 KB) | 61 cambios de percentil + 20 calles nuevas, sobre `giro_sim.json` |
| Indicadores picos | `indicadores/*.json` (10,7 MB) | mallas cuantizadas 16 bit con `b` bbox; marco PICOS (rota -28,1°, offset 1692,-588; `indicadores/index.json`) |
| Tráfico | `traf/*.bin` (13,5 MB) | `RTF1`, uint16 pasos + float t0, posiciones por trozo de 100 s; coordenadas MODELO ×5 |

**Bavaria (verificado en `bavaria.json`, `bavaria_pres.json`, `plan_maestro.json`):**
- Polígono del predio: `bavaria.json.sitio` (46 vértices; OSM way 1529762990), 71,2 ha, centroide (9318,98; 2942,64) modelo. Marco MODELO.
- Edificios: `bavaria.json.edif` 29 huellas con estilo (esqueleto, ladrillo, oficina, blanco, silos) y altura; 2 tanques; zonas `patio`, `huerto`, `compost` (rectángulos); 3.250 árboles en `bavaria_arboles.json`.
- Programa del Distrito de Tecnologías Convergentes (NBIC) en `bavaria_distrito.js:32-45`: escuela de agricultura urbana, Lab suelos y semillas (Bio), Taller de sensores (Nano), Centro de datos (Info), Lab de aprendizaje (Cogno), Nave de encuentro, Casa de polinizadores, Poscosecha, Mercado de productores, Incubadora, Cocina laboratorio, Mirador/estación del clima, Huertas de enseñanza. Cada uno apunta al índice `e` de `bavaria.json.edif`. Son **hipótesis de diseño**, con m² y personas **[SUP]**.
- Red de datos y sensores: `bavaria_distrito.js:599-632`; 25 pasajes peatonales (20 en `bavaria_sx.json n=1`); no coinciden los números en el código («20» y «25» aparecen ambos).
- Para proyectar: `bavaria_pres.json` ya trae `sitio`, `edif` con programa, árboles, contexto <1,2 km y sintaxis.

## 5. Qué se puede comunicar con TouchDesigner

Hoy: nada sale del navegador. Hay que añadir un emisor (WebSocket o `fetch` periódico a un servidor local) en el bucle maestro. Estado ya disponible en `window`:

| Global | Archivo:línea | Contenido útil |
|---|---|---|
| `KEN_RELOJ` | `reloj.js:300` | `t`, `minutoDia`, `dia`, `sem`, `vel`, `corriendo`, `hash()`, `hashModelo()` |
| `KEN_ESIM` | `escenario.js:167` | `.R` (series S1/S2/S3 por escenario A/B/C), estado de reglas |
| `KEN_ESC` | `escenario.js:257` | `.e` ('hoy'/'proyecto'), `.poner()` para cambiar escenario |
| `KEN_MERCADOS` | `mercados_red.js:83` | `abiertos()`, `todos` |
| `KEN_VIAJES` | `escenario.js:172` | viajes y flujos por tramo |
| `KEN_BAV`, `KEN_PCORA`, `KEN_PARCHES`, `KEN_HBAR`, `KEN_RED`, `KEN_CALI`, `KEN_RPROD`, `KEN_VACA` | `escenario.js:129-176`, `escenarios_sim.js:325` | objetos de capa (mezclan estado y mallas three) |
| `KEN_IND` | `indicadores.js:185` | `resumen()`, cobertura |

Entradas ya modeladas como `RELOJ.entrada/manejar/programar` (`reloj.js:30-33`): una acción (cierre, cambio de escenario) puede inyectarse **reproduciblemente**. Es el sitio natural para un comando desde TouchDesigner.

Plan realista: un solo objeto JSON de estado por semana (`o` de `sim_vida.js:333-341`) + `RELOJ` + lista de vehículos visibles cada 1 s (`TRAF.visPaso`, `index.html:2565`) por WebSocket 30-60 Hz hacia TD. `T3.ruidoMod`, `T3.alivio`, `T3.bio.ESTADO` solo son legibles dentro del módulo o exponiéndolos en `window`.

## 6. Datos exportables directamente

| Para | Archivo | Tamaño | Nota |
|---|---|---|---|
| Fondo vial | `net.json` | 811 KB | Polilíneas; clases para grosor |
| Huellas | `buildings.json` | 37,7 MB | Filtrar al rectángulo del proyecto (~4.100 huellas, ver final) |
| Bavaria | `bavaria.json` / `bavaria_pres.json` | 6,8 KB / 3,3 MB | Predio, edificios, programa |
| Sintaxis | `bavaria_sx.json`, `bavaria_distrito_sx.json` | 3,5 MB, 337 KB | antes/después por segmento |
| Tráfico | `traf/c*.bin` | 13,5 MB | Hay que decodificar el formato `RTF1` (`tools/traf_build.py:1-25`) |
| Escenarios | `sim_red_datos.js` (generado) | 201 KB | Costos zona→fuente, cierres |
| Indicadores | `indicadores/*.json` | 10,7 MB | Rejillas cuantizadas |
| Árboles | `trees.json`, `bavaria_arboles.json` | 2,7 MB, 88 KB | |
| Series A/B/C | **no hay export**; salen de ejecutar `sim_vida.js` en Node (no toca DOM) | ~ | Ver P9 |

No hay un solo archivo de «resultados de escenarios» listos; las series se generan al correr el modelo.

## 7. Indicadores para comparar escenarios

| Indicador | Cálculo | Archivo |
|---|---|---|
| Abastecimiento: zona peor abastecida `zMin` y nº de zonas <80/90 % | CALC | `sim_vida.js:273-274, 337` |
| Dependencia de Corabastos, kg por Corabastos / Bavaria / mercados | CALC | `sim_vida.js:337` |
| Orgánicos pendientes / almacenamiento; tratados; km de camión | CALC | `sim_vida.js:333-336` |
| Especies con presencia (`esp` vs `esp0`), riqueza, integridad humedal | CALC | `sim_vida.js:337` |
| Semanas de colapso y causa; % de corridas que colapsan; supervivencia | CALC (Monte Carlo) | `sim_vida.js:343-344, 376-` |
| Semanas de recuperación tras cierre | CALC | `sim_vida.js:345-346` |
| Tiempo de resolución de solicitudes (B vs C) | CALC [SUP] | `sim_vida.js:323-326` |
| Viajes a Corabastos hoy vs propuesta, vehículos-km | CALC [SUP] | `viajes_mercados.js:1-30` |
| Ruido medio, % por banda, dB en entorno de Corabastos | CALC [SUP] | `capas_escenario.js:113, 147` |
| Tabla «hoy → propuesta» en el panel (huertas, tráfico, compost, humedal) | CALC | `capas_escenario.js:232-244` |
| Sintaxis: integración y elección hoy vs después de 25 pasajes | PRE | `bavaria_sx.json`, `bavaria_distrito_sx.json` (`resumen.antes_600m` vs `despues_600m`) |
| 9 indicadores territoriales (SE, EPO, IC, PA…) | PRE | `indicadores/*.json` (misma fuente picos, sin cambio por escenario) |

Hallazgo: los indicadores de picos no cambian con A/B/C; son línea base.

## 8. Qué corre en tiempo real en el navegador y a qué costo

| Tarea | Costo medido o declarado |
|---|---|
| Reloj: lógica | máx. 6 ms/cuadro y 3600 pasos (`reloj.js:71`); sin espiral de la muerte |
| Modelo semanal | «< 1 ms por semana» (`reloj.js:33-35`); una corrida de 10 años ≈ 520 pasos |
| Tráfico | hasta 2.581 × 3 copias = 7.743 vehículos instanciados (`index.html:2617`); trozos pedidos 25 s antes (`:2611`) |
| Flujo para ruido | recorre los 1.500 pasos por trozos de 5 ms (`capas_escenario.js:122-126`); luego sliders en milisegundos |
| Cierre visual | requiere bajar TODA la grabación (`ruido_cierre.js:121`) y Dijkstra por vehículo |
| Carga inicial | `edif/` por celdas, `buildings.json` 37,7 MB, splats 80+22 MB opcionales |
| Modos de ahorro | `?liviano=1`, `?medio=1`, `?maqueta=1`, `?vista=google` (`index.html:929-938`) |

Las medidas de FPS **no se midieron aquí**; solo hay límites de diseño en el código.

## 9. Qué necesita resultados precalculados

| Pregunta | Respuesta verificada |
|---|---|
| ¿SUMO re-simula? | **No.** Solo lectura de `traf/*.bin` (grabación de 1.499 s). Cambiar demanda = quitar/añadir réplicas desfasadas de la misma grabación (`trafico_crece.js`, `alivio_cali.js`). |
| Cierre en `sim_vida`: ¿recalcula rutas? | **No.** Usa `CIERRES` de `sim_red_datos.js`: factor f = costo normal / costo con vía cerrada, por zona y fuente, calculado fuera (`tools/sim_red_datos_build.mjs`). El modelo solo alarga costos (`fe()` en `sim_vida.js:219`) y compensa con τ. Vías: Américas, Boyacá, Cali, Primero de Mayo, Agoberto Mejía. |
| Cierre visual (`ruido_cierre.js`) | **Sí recalcula rutas** (Dijkstra sobre `net.json`) pero solo para vehículos ya grabados; 6 vías «críticas» por índice de arista (`ruido_cierre.js:17-18`). No alimenta `sim_vida`. |
| Ruido: ¿posiciones de vehículos o flujo por vía? | **Híbrido.** El nivel de hoy sale del conteo de posiciones SUMO por celda de 16 m, suavizado, con camión = 4 carros, ±(-8/+5) dB sobre referencia por clase de vía 60/68/74 dB **[SUP]** (`capas_escenario.js:102-129`). El cambio con la propuesta son factores de energía supuestos (alivio Corabastos, viajes cortos 35 %, vegetación 50 %). No es acústica de propagación. |
| Sintaxis: ¿hoy vs propuesta precalculadas? | **Sí, ambas.** Python offline (`tools/bavaria_pres_datos.py`); `NAIN n` con 1.500 fuentes muestreadas; radio 800 m aproximado. Cambiar los pasajes exige re-ejecutar Python. |
| Series A/B/C | Se calculan en vivo (rápido) o en Worker; para proyección conviene **grabarlas a JSON** y reproducirlas. |
| Árboles `parches_arboles`, mercados, huertas | Ubicaciones PRE con scripts de `tools/`. |

## 10. Demasiado complejo para una semana

| Ítem | Por qué |
|---|---|
| Re-simular SUMO con cierre o escenario | No hay red SUMO (`.net.xml`) ni rutas en el repo; solo la grabación. |
| Recalcular sintaxis en vivo | Python con grafo de TODA Kennedy; minutos por corrida. |
| Acústica real | El modelo es de factores; no hay propagación ni edificios como pantallas. |
| Reproducir los 12 sistemas visuales en TD | El 3D usa Google Photorealistic + modelos propios; en cenital ortográfico no hace falta. |
| Sincronizar 7.743 vehículos a 60 Hz en OSC | Bien en WebSocket binario; mal en OSC. Reducir al rectángulo (miles a cientos). |
| Mapear el predio físico a la maqueta | Depende de la calibración del proyector (homografía), no del código. |
| Unificar los tres marcos de coordenadas en todos los archivos | Posible, pero hay que probar capa por capa (ver sección final). |

Alcanzable en una semana: emisor WebSocket del estado semanal y del reloj, export a JSON de A/B/C, extracción del rectángulo de geometrías, y reproducción de vehículos del bucle de 1.500 s.

---

## Datos para la proyección cenital

### Marcos y fórmula exacta a metros planos
- **Modelo** (x este, y norte, metros): `net.json`, `buildings.json`, `edif/*.bin`, `trees.json`, `parques.json`, `water_bodies.json`, `corabastos.json`, `bavaria*.json`, `bavaria_sx.json`, tráfico (`xs` ya en estas unidades tras dividir por 5, `tools/traf_build.py:8`).
- **Mundo** (x este, z sur, metros; el que usa three.js): `index.html:958-959`:
  `LC = {x: 5341.33, y: 3161.9}`, `lw(x, y) = [x - 5341.33, 3161.9 - y]`. Mundo: `colegios.json`, `huertas_barrio.json`, `sim_red_datos.js` (ZONAS, MERCADOS, PARCHES), `propuesta.json`, `BAVC=[4136, 96]` (`mercados_red.js:19`), Corabastos `[1132.1, 948.6]` (`viajes_mercados.js:25`).
- **Giro** (origen en humedal El Burro): `mundo = giro + (2095.67, -109.06)` (`tools/sintaxis_proyecto_build.js:5-6`): `giro_sim.json`, `sintaxis_proyecto.json`.
- **Picos**: `mundo.x = X*cos(r) - zz*sin(r) + 1692`, `mundo.z = X*sin(r) + zz*cos(r) - 588`, con `zz = -Y`, `r = -28,1°` (`indicadores.js:15-16`, `indicadores/index.json`).

Metros planos (modelo → mapa cenital, norte arriba, origen en el centro C del encuadre):
```
X_m = x_modelo - Cx
Y_m = y_modelo - Cy          (norte positivo)
```
Con centro de Bavaria `C = (9319.0, 2942.6)` (`bavaria_pres.json.centro`). Mundo → modelo: `x = xw + 5341.33`, `y = 3161.9 - zw`. En three.js, cámara ortográfica con `up = (0,0,-1)` mirando a `-Y` pone el norte arriba (mismo patrón de `pajaro.js:1030`).

Modelo → lat/lon (`tools/bavaria_build.py:18-19`): `MX = 111320*cos(4.63°) ≈ 110957`, `MY = 110540`, `x = (lon+74.17)*MX + 5193.24`, `y = (lat-4.63)*MY + 2090.06`; en Bavaria da ≈ 4,6377 N, -74,1328 O (calculado). El marco de `giro` usa otro origen (`tools/kennedy_sim_datos.py:20-22`): no mezclar. **Las unidades del modelo son metros** por construcción de esas fórmulas; no verifiqué la deriva frente a un mapa externo.

### Extensión útil alrededor de Bavaria
- Predio: bbox modelo x 8831,5-9866,3, y 2389,5-3553,4 (1.035 × 1.164 m); mundo x 3490,2-4524,9, z -391,5-772,4.
- **No cabe** en un rectángulo 1,6 × 0,9 km alineado a ejes (1.164 m > 900 m en N-S).
- Rotado θ = 1,108 rad (63,5°; = `angulo` 2,6789 - π/2 de `bavaria_pres.json`), el predio ocupa u ∈ [-681, 615] y v ∈ [-477, 339] respecto a C: 1.296 × 816 m. Entra en 1.600 × 900 si se **desplaza el centro** a `(9366, 2882)` (modelo) = mundo `(4024,7; 279,7)` (cálculo propio). Con `u = dx·cosθ + dy·sinθ`, `v = -dx·sinθ + dy·cosθ`.

### Qué hay dentro de ~1,6 × 0,9 km centrado en el centroide
Conteos reales sobre los datos (rectángulo alineado a ejes N-S / E-O: E-O 1.600, N-S 900; entre paréntesis rotado θ=1,108 y mismo centro):

| Geometría | Alineado | Rotado |
|---|---|---|
| Huellas de edificios (`buildings.json`) | 5.398 | 4.109 |
| Aristas de red: total / local / mid / major | 736 (609/79/48) | 731 (558/84/89) |
| Árboles `trees.json` | 4.133 | 3.899 |
| Parques `parques.json` | 17 | 11 |
| Cuerpos de agua / humedales | 0 | 0 |
| Colegios | 3 (Colegio Maroni, IED Eloísa Garzón, Mimositos) | 2 |
| Mercados de la red | 2 (Lote recuperado 08, Castilla) | 1 |
| Segmentos de sintaxis (`bavaria_sx.json`) | 706 | 630 |
| Módulos de huertas de barrio | 0 de 21 (1 sitio, Villa Alsacia Lote 1) | n/d |
| Parches del modelo semanal | 3: Bosque de Bavaria, Cubiertas compartidas 8, Huerta central de Bavaria (B) | n/d |

Humedales más cercanos (por centro del parche): Techo ≈ 1.282 m, El Burro ≈ 1.910 m, La Vaca ≈ 3.352 m. El cuerpo de agua más cercano es un canal (Los Ángeles de Castilla, ≈ 1.058 m). **No hay humedales dentro del encuadre**: la capa ecología debe apoyarse en bosque de Bavaria, árboles y parques.

### Cobertura de tráfico SUMO
No se verificó cuántos vehículos recorren el rectángulo: requiere decodificar `RTF1`. Sí se sabe que `net.json` tiene 89 aristas `major` dentro del encuadre rotado. Hacer ese conteo es el primer paso antes de fijar la capa de movilidad.

### Advertencias de coordenadas
- `BAVC=[4136,96]` mundo ≈ modelo (9477,3066), a ~43 m de la zona `compost`; `mejora_tour.js:13` y `escenarios_sim.js:58` usan `KEN_BAV.compost` o `[4185.7, 28.9]`: tres puntos «centro de Bavaria» distintos. Elegir uno y fijarlo.
- `sim_red_datos.js` dice «zonas de 500 m» pero los parámetros de cierre (`CIERRES`) indexan zona×fuente, no aristas de `net.json`: no se puede pintar el cierre del modelo semanal sobre la red sin un mapeo adicional.
- `traf/index.json` y el comentario de `index.html:2467` dicen 3,4 MB; el directorio real pesa 13,5 MB.
