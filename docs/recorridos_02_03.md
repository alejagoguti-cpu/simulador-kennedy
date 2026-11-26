# Recorridos de movilidad y residuos

## Movilidad (simulaciones 3 y 4)

Tres vistas: territorio en gris con corredores destacados; corte A–A' y 3D de la avenida; variables con reproducción semanal del cierre. En la simulación 4 aparece un puente peatonal sobre las dos calzadas. Su ubicación se ancla al corte de OpenStreetMap, pero la forma, altura, apoyos y accesos son ilustrativos. El puente no altera por sí mismo los indicadores del modelo.

La reproducción usa la misma semilla y los deslizadores de la corrida principal. Se detiene en el primer game over y muestra la semana y la causa. El modelo sigue calculando tráfico, ruido, abastecimiento y fauna a partir de las reglas de `simulaciones12.js`.

## Residuos (simulaciones 5 y 6)

Tres vistas: puntos de la red en el territorio; corte y volumen 3D esquemáticos; variables y reproducción de 780 semanas (15 años). En la simulación 6, las 35 Estaciones Circulares de `sim_red_datos.js` aparecen progresivamente según `MERCADOS[].desde`. En la simulación 5, el contador de estaciones permanece en cero. Los indicadores de orgánicos, compost y fracción sin recoger provienen del modelo semanal.

La reproducción se detiene en el primer game over que arroje el modelo. Con la semilla y los valores predeterminados actuales, la simulación 5 llega al umbral de área funcional de humedales en la semana 677; la 6 no alcanza ningún umbral durante los 15 años. Cambiar las variables puede adelantar, retrasar o evitar ese resultado.

## Kennedy sin propuesta

La interfaz ahora detiene la corrida base 13 y abre el informe de game over cuando se cumple cualquiera de las siete reglas definidas por el modelo durante cuatro semanas. Con los valores predeterminados, la regla de humedales se cumple en la semana 630. Ese momento cambia con la recolección y las otras variables; no es una fecha fija.
