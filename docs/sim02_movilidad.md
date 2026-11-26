# Simulación 02 Movilidad — pedido de la autora (2026-11-25)

Por ahora SOLO «sin propuesta» (la autora dirá después cómo es con propuesta). El inicio del mensaje llegó cortado («…odo, haces que haya más transporte»).

- Cuando se cierra una vía: más transporte → se ven muchas más personas y muchos más carros por todas partes (sobre todo en las vías alternas que reciben el desvío).
- Más tráfico → más ruido (calculado desde el tráfico del modelo).
- El ruido baja el bienestar de la fauna de forma progresiva; cuando el bienestar cruza un umbral, los animales empiezan a morir (varios), y se ven menos animales. Las muertes aparecen en la franja de eventos.
- El cierre hace que no lleguen (o lleguen menos) alimentos a Corabastos: rutas de camiones cortadas o más largas → menos toneladas → baja la cobertura alimentaria de los sectores.
- Todo calculado por el modelo, con fuentes o supuestos marcados.

## Recorrido de tres vistas (2026-11-26) · data3d/recorrido_movilidad.js

Se abre al escoger «02 Movilidad». 1 Territorio (gris, destellan solo la Av. de las Américas, la Av. Primero de Mayo y Corabastos) →
2 Intervención (corte A–A' con lo que trae OSM, el paro bloquea la vía y los carros quedan quietos en fila: ilustración) →
3 Simulación (variables + indicadores; cada cambio corre el modelo hasta el fin del cierre y pasa el valor a la simulación principal).
Corte: tools/movilidad_corte_datos.mjs → data3d/movilidad_corte.json.

Corrección del modelo: la «Av. Calle 6» ya no es vía de desvío (en OSM es la misma Av. de las Américas); la parte del tráfico que se va
por la Primero de Mayo es el deslizador «desvioMayo» [SUP, 50 %]. Pendiente: el modelo reparte el cierre en 3 fases (regla de obra);
un paro corta de una vez.
