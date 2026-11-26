# Simulación 01 Abastecimiento — v4 (correcciones de la autora, 2026-11-26)

## Barra de Corabastos
- Barra horizontal tipo «carga» con un pin encima (sobre Corabastos) y el tope marcado en rojo.
- La simulación corre en años: la barra debe ir SUBIENDO con los años (no vaciarse).
- Sin propuesta: sube hasta ~60 % y varía según dónde llega más.
- Con propuesta: Corabastos recibe menos (los mercados reparten) → la barra llega ~30–40 %.
- La autora no entendió por qué hubo game over en el año 6 sin que subiera la barra: el motivo del game over (qué regla) debe verse claro.

## Residuos
- Como cuadraditos más pequeños, que se mueven y aumentan cada vez más con los años.

## Tráfico tipo Waze
- Las vías se colorean según el tráfico (verde → rojo) y se mueve en tiempo real, al ritmo de la simulación (no imagen quieta). En ambos escenarios.

## Blanco y negro
- También sin propuesta: edificios y fondo en blanco y negro, menos lo indicado (árboles, agua, elementos de la simulación, carros, medidores, especies).

## Vehículos morados (con propuesta)
- Pocos vehículos morados que van a Bavaria y a los puntos de abastecimiento / mercados.

## Especies
- Las especies y sus interacciones deben verse en ambos escenarios (hoy no se ven).

## Mercados barriales (con propuesta)
- Muchos más: en parques, bajo Corabastos, donde hay muchas huertas en techos, donde hay edificios altos. Cada uno con su barrita de llenado.

## Humedal La Vaca (con propuesta) — «quedó horrible»
- Quitar las bodegas está bien, pero dar forma al humedal: nada de verde de bodega dentro del humedal.
- Un ECOTONO (transición) entre el humedal y la zona de mercado/Corabastos.
- Humedal un poco más grande y una barrera de muchos árboles entre Corabastos y el humedal.

## Huertas en parques (con propuesta)
- Volver a poner las huertas en parques que tenía antes, resaltándolas en verde de a poco (efímeras, chéveres).
- Más árboles en la propuesta.

## Implementación — modelo de Corabastos, game over, residuos, tráfico, vehículos morados, especies y mercados (2026-11-26)

### Por qué la barra bajaba y qué cambió en el modelo
En v3 los ingresos a Corabastos eran fijos (6.460 t/día) mientras el pedido crecía con la población; las pérdidas eran proporcionales al inventario. Con más pedido que ingreso, el inventario solo podía bajar: la barra se vaciaba. Que la barra suba exige que entre más de lo que sale, así que se cambiaron dos supuestos, manteniendo la estructura de la autora (inventario final = inventario inicial + ingresos − despachos − pérdidas; saturación = inventario ÷ 14.000):

| Pieza | v3 | v4 (`ab01Paso`, `data3d/simulaciones12.js`) |
|---|---|---|
| Inventario de 2025 | Σ recibo × permanencia ≈ 9.860 t (70 %) | **la mitad** ≈ 4.930 t (**35 %**): cada lote se vende de a poco durante su permanencia, en promedio queda la mitad [SUP] |
| Ingresos | 6.460 × «Ingreso» (fijos) − compras directas de los mercados | «Ingreso» × lo que le piden ÷ (1 − 0,0155), con tope diario: la región manda lo que la ciudad compra (6.460 t/día en 2025) [SUP]. Lo que compran los mercados y las huertas ya no está en el pedido |
| Lo que sale | mín(pedido, disponible) | inventario ÷ permanencia (salida de primer orden, ley de Little), sin pasar del pedido: lo que nadie pide se queda |
| Permanencia | — | 0,76 días en 2025 (4.930 ÷ 6.460) × (1 + congestión) ÷ 1,62; congestión = 0,62 + 0,033 × años (TomTom 2020–2025, la misma de la capa de tráfico). Con más trancón la mercancía tarda más en salir [SUP: proporcional al tiempo de viaje] |
| Pérdidas | 0,0102 × inventario por día | 0,0155 de lo que sale (≈100 t/día en 2025, DANE 2012) |

**Contradicción con v3.** La autora pidió en v3 «no confundir demanda con alimentos almacenados: el aumento poblacional no llena automáticamente Corabastos». Para que la barra suba (v4) los ingresos tienen que crecer con lo que se pide; lo que llena la central no es la demanda sola sino que la mercancía sale más despacio (congestión). Se cambió el texto del deslizador «Ingreso a Corabastos».

**Contradicción con la meta de la barra (no se forzó).** Con datos: sin propuesta la barra va de 35 % a **50 %** en 15 años (la autora pidió ~60 %); con propuesta llega a **47 %** (pidió 30–40 %). Kennedy pide ~984 t/día de las 6.460 que entran (15 %): aunque los 36 mercados compren directo ~380 t/día, Corabastos solo recibe ~5 % menos. Para que la barra con propuesta quede en 30–40 % Corabastos tendría que recibir ~25 % menos (≈1.700 t/día), más que toda la comida de Kennedy: solo se lograría con centrales satélite para toda la región (SDDE-FAO 2018 las recomienda), que no son parte de la propuesta de Kennedy. Se deja para que la autora decida.

### Resultados (Node, 780 semanas, corriendo sin detenerse; % = inventario ÷ 14.000 al final de cada año)
| Caso | Año 0 · 1 · 5 · 10 · 15 sin | sin: game over | Año 0 · 1 · 5 · 10 · 15 con | con: game over |
|---|---|---|---|---|
| Por defecto (0,5 %/año, 36 mercados) | 35 · 36 · 40 · 45 · 50 | residuos, semana 285 (año 6) | 35 · 36 · 38 · 42 · 47 | ninguno (sostenible) |
| Población 2 %/año | 35 · 37 · 43 · 47 · 51 | residuos 259 | 35 · 36 · 41 · 47 · 51 | tráfico general 517 |
| Población 3 %/año | 35 · 37 · 43 · 47 · 51 | residuos 256 (déficit 457) | 35 · 36 · 43 · 47 · 51 | tráfico general 385 |
| Ingreso 110 % | se llena | saturación, semana 6 | se llena | saturación, semana 6 |
| Ingreso 90 % | 32 · 33 · 36 · 40 · 45 | residuos 319 | 32 · 32 · 34 · 38 · 42 | ninguno |
| 12 mercados (v3) | — | — | 35 · 36 · 39 · 43 · 48 | ninguno |

Con 2–3 %/año la barra se aplana en ~51 % porque los ingresos topan en 6.460 × 1,11 («Tope de ingreso diario») y aparece el déficit.

### Game over: la causa se ve
- `data3d/ab01_panel.js` `gameOver(g)`: la franja de arriba se pone roja: «Game over · año N · Residuos sin recoger · 297 t/día (máx. 296) · 4 semanas seguidas» (o «Déficit alimentario · sector · %» / «Corabastos saturado · % de 14.000 t» / la regla general que sea). En el panel izquierdo el título pasa a «Game over: <regla>» y la fila de esa regla titila en rojo.
- `data3d/sim_ui.js`: en la 01 el informe se abre 4 s después, para que primero se vea la causa. El game over del año 6 que vio la autora era el de **residuos** (no el de saturación): por eso la barra de Corabastos no subía.

### Mapa
- **Barra de carga de Corabastos** (`abasto_capas.js`): horizontal, sobre un pin clavado en el centro de Corabastos, siempre de frente a la cámara; se llena de izquierda a derecha (verde → ámbar 90 % → rojo); remate rojo = 14.000 t; llega hasta 120 %.
- **Residuos**: cuadraditos de 4,5 px que se mueven (vaivén de 6 m al ritmo del reloj); uno por cada t/día sin recoger (antes uno por cada 2): hoy 148, game over 296. Un solo objeto `Points`.
- **Tráfico tipo Waze**: las vías «major» y «mid» de `net.json` pintadas por congestión (verde → ámbar → rojo) con rayas que corren por cada carril en su sentido al ritmo de `RELOJ.tAnim` (se detienen en pausa), en los dos escenarios. Congestión de cada vía = nivel de la ciudad (TomTom) × [SUP] 0,8 lejos de Corabastos → 1,25 junto a ella (e^(−d/900 m)) × [SUP] hora: hasta +35 % cerca de Corabastos en la franja con más camiones (franjas de ingreso × SIPSA) y −17 % fuera de franja. Rapidez de las rayas ∝ 1 / (1 + congestión). Una malla y un sombreador; se dibuja encima de la malla de Google.
- **Vehículos morados** (con propuesta, capa Tráfico): uno por cada 3 mercados abiertos (máx. 14), van y vuelven entre Bavaria Común y los mercados por el camino más corto de la red vial. Escala visual declarada, no un aforo.
- **Mercados**: `AB01.MERC_MAX` 20 → 50, por defecto 12 → **36**, abre uno cada 8 semanas (antes 13). 17 sitios nuevos (`AB_EXTRA`): 14 parques de más de 1 ha (`parques.json`), 2 grupos de torres de 15+ pisos del catastro (`escenario01_construcciones.geojson`, donde van primero las huertas en cubiertas; los demás grupos ya tenían un sitio a menos de 300 m) y el sur de Corabastos (más el Parque Cayetano Cañizares, también al sur). Cada uno 17 t/día (Contraloría 2025) y su radio de compra a pie de 1 km (cobertura por zona como en v3). Cada mercado lleva una barrita horizontal de llenado sobre un pin (`abasto_contenedor.js`).
  - **Contradicción**: 36 × 17 = 612 t/día de capacidad en Kennedy, 1,8 veces lo que mueven las 19 plazas distritales de Bogotá (≈342 t/día). Lo usado en la corrida por defecto es ~380 t/día al año 15.
- **Especies**: en la 01 `aplicarHistoria` (sim_ui.js) apagaba el grupo `biotica` (fauna 3D y líneas de interacción) cada 0,4 s porque no estaba en las capas de la historia 01. Se agregó; ahora se ven con y sin propuesta.
- **Convenciones** (`limpio.js`): barra de Corabastos, barrita de mercado, cuadritos de residuos, vías por congestión y vehículos de Bavaria Común; textos más cortos.
- `conclusion_abasto.js` (`evaluar`) usa las mismas fórmulas v4.
