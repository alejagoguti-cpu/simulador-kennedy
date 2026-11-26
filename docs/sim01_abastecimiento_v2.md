# Simulación 01 Abastecimiento — rediseño pedido por la autora (2026-11-26)

## Panel izquierdo
- Los nombres de las 6 simulaciones más chicos / compactos (ocupan mucho espacio).
- Al hacer clic en una se despliegan TODAS sus variables modificables, ahí mismo.
- Al abrir la 01 aparece un aviso pequeño tipo videojuego: «ALERTA · Está subiendo la demanda alimentaria en Kennedy» con una causa ficticia (marcada como escenario ficticio).
- Se elige con propuesta o sin propuesta.
- En el panel izquierdo, un diagrama de demanda que muestra cómo sube: comida que se necesita ahora, comida que está llegando, y los límites de las bodegas.

## Sin propuesta — capa «Bodegas»
- Las bodegas de Corabastos se vuelven transparentes; dentro de cada una sube un líquido que pasa a rojo a medida que se acerca a su límite.
- Se llenan de forma desigual según lo que recibe cada bodega (investigar qué recibe cada bodega y cuánto puede almacenar → tope por bodega).
- Game over cuando se llenan y no cabe más.

## Variables con datos investigados
- Cuánta comida llega actualmente a Kennedy: variable que siempre corre en el simulador.
- Panel derecho: diagrama «comida que llega vs demanda de Kennedy».

## Capa «Residuos»
- Investigar cuántos residuos se generan hoy y proyectar: más comida que entra → más residuos con los años.
- Game over de residuos (definir el umbral con criterio y fuente).
- Con muchos residuos se degradan los humedales, sobre todo La Vaca: se quitan árboles y bajan las interacciones bióticas allí.

## Capa «Tráfico»
- Animada, no una foto estática: la congestión cambia en el tiempo y va empeorando a lo largo de los años (no tan alta al inicio).
