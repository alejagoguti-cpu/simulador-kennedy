# Rendimiento — pedido de la autora (2026-11-26)

«Que corra bien en cualquier computador, que no quede pesado.»

Restricción de la autora (memoria): nunca bajar la resolución (no borroso).

Plan:
1. Detectar el equipo (GPU, memoria, núcleos) + medir FPS los primeros segundos → nivel alto / medio / liviano.
2. Equipos débiles: menos árboles y fauna lejanos, sin sombras ni oclusión ambiental, menos teselas de Google a lo lejos (errorTarget), INEM y modelos pesados solo de cerca, menos carros — sin bajar la resolución de pantalla.
3. Todos: capas de la simulación (barras, residuos, mercados, tráfico) recalculadas una vez por semana simulada, menos llamadas de dibujo (instancing/merge), nada se dibuja fuera de vista o con la pestaña oculta.
4. Probar con la GPU Intel integrada y a 390 px (celular): fluidez y carga.

## Implementación (2026-11-26)

Restricción respetada: **la resolución (pixelRatio) nunca se baja**. Se quitó la «resolución adaptable» que bajaba al 85 % al mover la cámara (index.html): se veía borroso.

### Niveles de calidad · `data3d/calidad.js` (nuevo)
- Detección: nombre de la tarjeta (WEBGL_debug_renderer_info), núcleos y memoria. Dedicada → **alto**; integrada (Intel/AMD Graphics/Apple) → **medio**; celular, software o ≤ 4 núcleos / ≤ 4 GB → **liviano**.
- `window.KEN_CALIDAD` = { nivel, auto, cfg, fijar(n, aMano), on(fn), medir(fps, quieta, cpu) }. Selector discreto «Calidad» arriba a la derecha (Automática / Alta / Media / Liviana), recordado en localStorage `ken_calidad`; `?calidad=alta|media|liviana` lo fija por visita.
- Adaptable: con la cámara quieta, < 28 cuadros/s 4 s seguidos → baja UN nivel; > 55 cuadros/s 10 s → sube una sola vez. **No cuenta** los segundos con tareas largas (> 90 ms, p. ej. la precarga) ni aquellos en que el bucle de dibujo ocupa > 60 % del hilo (cuello de CPU). **Con tarjeta dedicada no baja sola** (la imagen de la autora en su RTX se queda en alta; ella puede escoger otro nivel).

| | alto (= como antes) | medio | liviano |
|---|---|---|---|
| Sombras | sí | no (y las láminas que solo reciben sombra se apagan) | no |
| Oclusión ambiental N8AO / SMAA | sí / sí | sí / sí | no / no (se conservan tono ACES y gradación) |
| Teselas Google: error objetivo · caché · procesos | 5 px · 1,8 GB · 6 | 7 px · 1 GB · 4 | 10 px · 0,6 GB · 3 |
| Árboles escaneados (radios · cupos) | ×1 · ×1 | ×0,75 · ×0,55 | ×0,55 · ×0,3 |
| Copas splat lejanas · se rehacen cada | 16 000 · 60 m | 11 000 · 90 m | 6 500 · 120 m |
| Parches nativos: modelo escaneado hasta | 300 m | 220 m | 150 m |
| INEM: piezas hasta | 1 200 m | 850 m | 550 m |
| Fauna (dibujo, no la simulación) | cada cuadro | cada 2 | cada 3 |
| Polinizadores (propuesta_fauna) | 14 000 | ×0,7 | ×0,4 |
| Edificios propios lejanos | todos | hasta 1,4 km + 2·altura | hasta 0,9 km + 1,5·altura (capa 2, no `.visible`) |
| Árboles del puente de fauna | todos | −15 % | −30 % |

### Para todos los niveles (misma imagen)
- Fauna (biotica.js): solo los animales visibles van a la malla (`count`); antes los escondidos se dibujaban con escala 0 → de 3,76 a 1,73 millones de triángulos por cuadro.
- Árboles (real3d.js): el recálculo LOD solo recorre los árboles dentro del radio de los modelos 3D, con claves en Float64Array (antes un par [i, d2] por cada árbol a 2,2 km, ~90 mil, y orden con comparador). Copas splat igual (arboles_splat.js).
- Bucle (index.html): sin `new Vector3` por cuadro; ficha de cámara (`tick`) 4 veces por segundo; limpio.js y sim_ui.js ya no recorren toda la escena con `getObjectByName` en cada cuadro / 2,5 veces por segundo; tablero.js mide el lienzo con ResizeObserver (antes `clientWidth` por cuadro = recálculo de diseño).
- parches_arboles.js: los 6 modelos escaneados se descargan y decodifican UNA vez para todos los parches; todos los módulos importan `?v=12` (había dos copias del módulo, v10 y v12).
- **Cambio a «Kennedy con propuesta»**: la precarga escondida de escenario.js nunca corría en la vista limpia (la de siempre) → todo se armaba al hacer clic (~9 s de página trabada). Ahora corre justo después de «Iniciar» (huertas de barrio, parches, mercados —su geometría sitio por sitio en ratos libres—, parque Corabastos, distrito Bavaria, hidroponía) y al final **calienta** los sombreadores (incluidas las sombras, que `compileAsync` no compila) con un dibujo escondido de 1×1.

### Mediciones (Playwright, 1600×900, pixelRatio 1 en todas; La Vaca = vista fija sobre La Vaca y Corabastos; sim 01 = con propuesta, semana 416)
FPS media · p50 / p95 del cuadro (ms) · dibujos por cuadro · millones de triángulos por cuadro.

| Equipo · nivel | Iniciar | Vista inicial | La Vaca | Sim 01 pausada | Sim 01 corriendo |
|---|---|---|---|---|---|
| RTX 4050 · ANTES | 26 s | 19,7 · 50/67 · 2.282 · 18,8 | 21,2 · 50/67 · 2.377 · 18,8 | 13,6 · 67/117 · 2.693 · 21,8 | 21,0 · 50/67 · 2.704 · 22,0 |
| RTX 4050 · alto (después) | 23 s | 15,7* · 50/100 · 2.247 · 16,7 | 22,9 · 50/50 · 2.458 · 17,0 | 15,6 · 67/83 · 2.705 · 21,5 | 22,9 · 50/50 · 2.705 · 21,8 |
| RTX 4050 · medio | — | — | 30,4 · 33/50 · 1.225 · 15,8 | — | — |
| RTX 4050 · liviano | 25 s | 18,0* · 50/83 · 1.053 · 16,0 | 28,3–32 · 33/50 · 1.086 · 16,1 | 17,8 · 50/83 · 1.292 · 20,4 | 30,8–33 · 33/50 · 1.302 · 20,8 |
| Intel UHD · ANTES | 41 s | 7,7 · 133/217 · 1.290 · 16,8 | 7,1 · 133/267 · 1.479 · 18,7 | 5,8 · 183/300 · 1.718 · 21,3 | 5,6 · 183/217 · 1.750 · 21,1 |
| Intel UHD · automático (medio → liviano) | 45 s | 2,5* | 10,1 · 100/117 · 1.174 · 16,2 | 7,8 · 117/183 · 1.285 · 20,5 | 7,7 · 133/150 · 1.285 · 20,1 |
| Intel UHD · liviano | 47 s | 1,7* | 11,1 · 83/100 · 1.075 · 16,2 | 7,4 · 133/217 · 1.285 · 20,1 | 7,7 · 133/150 · 1.286 · 20,2 |
| RTX · CPU ×4 · ANTES | 28 s | 2,2 · 450/633 | 2,2 · 433/667 | 1,1 · 817/1883 | 2,5 · 417/500 |
| RTX · CPU ×4 · alto (después) | 25 s | 1,2* | 1,8 · 550/1233 | 1,2 · 916/1183 | 2,0 · 517/633 |

\* La «vista inicial» se mide justo cuando corre la precarga de la propuesta (tareas largas de 1–14 s en Intel): es el costo que antes se pagaba al hacer clic. ANTES en la RTX ya incluía el viejo descenso automático (sin oclusión ambiental desde el segundo ~20).
Las corridas comparten la máquina con las de otro agente: ±10 % de ruido.

**Cambio a «Kennedy con propuesta» (RTX, vista inicial, 74 s después de abrir):** antes 23 cuadros > 100 ms en los 10 s siguientes, el peor de 1.483 ms y ~3 s trabados en los primeros 3 s (huertas de barrio 1,3 s, mercados 1,1 s, hidroponía 0,7 s, distrito Bavaria 0,7 s, ~12 sombreadores 1–1,4 s). Después: el peor cuadro 150–283 ms, 0–6 sombreadores nuevos (ShaderMaterial creados al prender), sin armado.

### Lo que sigue pesando (no se tocó aquí)
- La CPU es el cuello en todas: ~50 ms de hilo principal por cuadro con la simulación (updateTraffic/rumboCarro de index.html, biotica, alivio_cali.enCali, vehiculos.js, giro_sim). Bajar la calidad gráfica en la RTX sube de ~23 a ~31 cuadros/s; más allá hay que aligerar la lógica.
- Triángulos: ~16–21 millones aun en liviano: edificios propios (185 mallas, 4,5 M, con sombra), huertas hidropónicas (2 M), vehículos (1,9 M), torres con balcones (1,4 M), modelos de árboles L0 (arbolpeq 78 mil triángulos por copia).
- Memoria: el montón de JS llega a 3,3–4 GB y sigue creciendo ~20 MB/s; en dos corridas la RTX perdió el contexto WebGL (GL_OUT_OF_MEMORY) con la propuesta completa armada.
