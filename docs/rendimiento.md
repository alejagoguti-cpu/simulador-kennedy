# Rendimiento — pedido de la autora (2026-11-26)

«Que corra bien en cualquier computador, que no quede pesado.»

Restricción de la autora (memoria): nunca bajar la resolución (no borroso).

Plan:
1. Detectar el equipo (GPU, memoria, núcleos) + medir FPS los primeros segundos → nivel alto / medio / liviano.
2. Equipos débiles: menos árboles y fauna lejanos, sin sombras ni oclusión ambiental, menos teselas de Google a lo lejos (errorTarget), INEM y modelos pesados solo de cerca, menos carros — sin bajar la resolución de pantalla.
3. Todos: capas de la simulación (barras, residuos, mercados, tráfico) recalculadas una vez por semana simulada, menos llamadas de dibujo (instancing/merge), nada se dibuja fuera de vista o con la pestaña oculta.
4. Probar con la GPU Intel integrada y a 390 px (celular): fluidez y carga.
