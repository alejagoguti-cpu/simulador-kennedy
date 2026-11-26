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

## Implementación (2026-11-26)

Datos y fuentes: `docs/fuentes_bodegas_residuos.md` y `data3d/bodegas_residuos_fuentes.json`.

| Pieza | Dónde | Regla |
|---|---|---|
| Ocupación por bodega | `data3d/simulaciones12.js` (BOD01, `bodPaso`) | recibo 2025 × (t/día que llegan a Corabastos ÷ 6.460) × días de permanencia ÷ tope. Lo que no cabe en su nave no entra (baja lo que llega a las zonas). |
| Game over «bodegas» | `simulaciones12.js` (`paso`, REGLAS_AB01) | una nave al 100 % o más de su tope **4 semanas seguidas**. Se eligió la misma regla de 4 semanas de las demás: «se llena y no cabe más» sostenido un mes, no un pico de un día. El informe dice qué bodega fue. |
| Comida que llega | `simulaciones12.js` (`rcPaso`, todas las corridas) | demanda = frescos + otros canales (1.100 − 702 t/día, crecen igual); llega = frescos recibidos + otros canales. |
| Residuos de Kennedy | `rcPaso` | R = 922 × 1,027^años + 0,19 × (comida que llega − 1.100); sin recoger = R − 774 − orgánicos tratados en Estaciones Circulares. |
| Game over «residuosK» | `paso` | 296 t/día sin recoger **4 semanas seguidas** (el doble de los 148 de hoy; criterio de diseño). |
| La Vaca | `rcPaso`, `pruebaDespues`, `data3d/abasto_capas.js` | D = (sin recoger − 148) / 148, entre 0 y 1; árboles e interacciones × (1 − 0,5·D); en el par 01 el hábitat del parche La Vaca también × (1 − 0,5·D). |
| Congestión | `rcPaso`, `abasto_capas.js` | 0,62 + 0,033 × años (TomTom); velocidad del flujo ÷ (1 + nivel). |
| Panel izquierdo | `data3d/ab01_panel.js`, `data3d/sim_ui.js`, `data3d/limpio.js` | alerta (escenario ficticio), diagrama demanda / llega / límite de las bodegas, interruptores de capas; lista de simulaciones compacta. |
| Panel derecho | `data3d/indicadores_macro.js`, `data3d/panel_indicadores.js` | tarjetas «Comida que llega a Kennedy» (Comercio) y «Residuos de Kennedy» (Residuos). |
| Informe | `data3d/informe.js`, `data3d/conclusion_abasto.js` | game over por bodegas o residuos; tarjeta 1 comida y bodegas, tarjeta 2 residuos y La Vaca. |

**Estaciones Circulares con propuesta (decisión de la autora, 2026-11-26).** Con propuesta debe haber suficientes para que no haya game over de residuos con los valores por defecto. `EST01` en `simulaciones12.js`: 20 estaciones de 20 t/día de orgánicos, una en cada sitio de mercado de la propuesta (los mismos 20 de `AB01_SITIOS`), que abren una cada 36 semanas desde la semana 52 hasta la 736 (400 t/día en el año 15). 20 t/día es el tope de los Centros Integrados de Recuperación de Recursos descentralizados (UNESCAP y Waste Concern, Daca: el primero, de 1994, trataba 3 t/día; los posteriores hasta 20 t/día: https://www.unescap.org/sites/default/d8files/2.%20An%20inexpensive%20solution%20.pdf). Supuestos: el calendario y que la separación en la fuente alcanza lo que las estaciones reciben (400 t/día ≈ 56 % de los orgánicos del año 15). Lo tratado no pasa del 51,3 % orgánico de lo generado.

Resultados con los valores por defecto (`node correr01.mjs`):
- Sin propuesta: game over por residuos en la semana 273 (año 6), 304 t/día sin recoger.
- Con propuesta: lo sin recoger se queda entre 127 y 170 t/día en los 15 años (cerca de los 148 de hoy), sin game over de residuos. **Pero** llega a game over por la bodega Aguacate (B31-B32) en la semana 507 (julio del año 10): la red de mercados solo le quita a Corabastos parte del pedido de Kennedy, y la bodega se llena con el crecimiento de toda la región (0,5 %/año). Queda para decisión de la autora.
- Con «Crecimiento de la demanda» en 2 %/año: sin propuesta, game over por Aguacate en la semana 91; con propuesta, en la 143.
