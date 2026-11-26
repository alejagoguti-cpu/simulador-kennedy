# Simulación 01 Abastecimiento — v5 (correcciones de la autora, 2026-11-26)

## Vehículos
- Con propuesta: los camiones/carros morados que antes iban a Corabastos ahora van a los distintos mercados (por eso hay menos trancón alrededor de Corabastos); unos pocos siguen yendo a Corabastos.

## Panel izquierdo — que se entienda sin tocar nada
- La población de Kennedy crece sola con el tiempo de la simulación (no hay que moverla al inicio).
- Con propuesta: las barritas de los mercados NO se llenan (la carga se reparte).
- Corabastos: al inicio alto y, con propuesta, va bajando de a poco a medida que se abren más mercados.
- Con el tiempo se abren más y más mercados en Kennedy y los carros empiezan a ir hacia allá.
- «Ingreso a Corabastos»: se mueve solo (ligado a la demanda alimentaria) pero se puede controlar; mostrar el número (t/día) ahí mismo.
- Mostrar cuál es el límite de Corabastos; ese límite NO cambia al mover las huertas hidropónicas.
- Al mover «Huertas hidropónicas» se ven más o menos huertas en el mapa; al mover «Cantidad de mercados» se ponen o quitan mercados en zonas.
- «Autoconsumo»: la autora no entiende qué es → explicarlo en una línea o renombrarlo con algo claro.
- En el bloque Game over no decir «Saturación» ni «tope»: usar «Límite de abastecimiento de Corabastos» (o similar claro).
- «Consumo por habitante» se queda como está.
- Botón «Fórmula» para que la gente sepa cómo se calcula (variables y gráficas).
- Gráficas del panel izquierdo (población, «demanda vs alimentos disponibles», etc.): que se entiendan y se vean mejor, con los colores de la autora (paleta URBIA), no colores feos.

## Alerta de arriba
- No en negro: con degradé; ponerla hasta arriba de la pantalla.
- No debe tapar la franja de eventos (atropellos, etc.): moverla.

## Panel derecho
- Los diagramas siguen feos: cambiarlos, mejorar la estética, que se entiendan.
- Hacer el panel más chico (tapa casi todo).

## Color
- El verde limón un poquito más verde, más parecido al de URBIA, sin exagerar.

## Veredicto
- Solo «Sostenible» o «No sostenible» (no «Sostenible con condiciones»).
- Revisar que los resultados den estadísticas reales y contundentes.

## Implementación (2026-11-26)

### Modelo de Corabastos (`data3d/simulaciones12.js`, `ab01Paso`)
Estructura de la autora sin cambios: inventario final = inicial + ingresos − despachos − pérdidas; límite = inventario ÷ 14.000 t (fijo, no depende de huertas ni mercados).

| Pieza | v4 | v5 |
|---|---|---|
| Capacidad de un mercado | 17 t/día (lo que vende hoy la Plaza de Kennedy: 131 puestos ocupados) tomado como tope → las barritas se llenaban | **28 t/día** = 215 puestos × 0,13 t (Contraloría 2025). Carga normal hasta **80 %** [SUP de diseño; la Plaza trabaja hoy al 61 %]; solo en un faltante de Corabastos llega a 100 % |
| Acopio regional | — | [SUP de la propuesta, **pide aprobación**] cada mercado abierto también es punto de acopio: con la capacidad libre, hasta 70 %, compra directo a productores para tenderos de fuera de Kennedy; eso sale del pedido del resto de la región a Corabastos |
| Apertura de mercados | uno cada 8 semanas (36 en 5,5 años) | repartidos hasta la semana 700 (año 13,5): con 44 por defecto, uno cada ~16 semanas. Primero el Parque Cayetano Cañizares (canchas al sur de Corabastos) y el Parque Portal de las Américas (conjunto de vivienda junto a las Américas) |
| Mercados por defecto | 36 | **44** (máx. 50) |
| Congestión que frena la salida | la de la ciudad (TomTom, 0,62 + 0,033 × años) | junto a Corabastos: nivel de base × camiones que llegan ÷ los de 2025. Base sin propuesta = la de la ciudad; con propuesta = la de 2025 [SUP de la propuesta, el mismo de `factorTraf`: los viajes que se van a los mercados no suman la subida de la ciudad en los accesos de Corabastos] |
| Cola en Corabastos | — | [SUP, pedido de la autora «sin propuesta se llena»] permanencia × (1 − ρ0) ÷ (1 − ρ), ρ = inventario ÷ 14.000 (cola M/M/1: la espera crece cuanto más llena está). Si ingreso × permanencia pasa ≈ 38,5 % de 14.000 t no hay equilibrio y el inventario se dispara |
| Lo que nadie pide | se quedaba (el inventario se congelaba y la barra no podía bajar) | si sobra, los mayoristas piden menos a la región esa semana (el inventario baja hacia su equilibrio); tope físico 120 % de 14.000 t |
| Game over el mismo día | déficit antes que saturación | primero «Límite de abastecimiento de Corabastos» (el déficit es su consecuencia: la central llena no despacha) |

**Reconciliación con v4 («los ingresos crecen con lo pedido»).** Sigue igual: ingreso = «Ingreso» × pedido ÷ (1 − 0,0155). Lo que cambia con propuesta es el pedido: baja la parte de Kennedy (mercados a pie, huertas) y la del resto de la región (acopio regional de los mercados). Sin el acopio regional ni la congestión de 2025 junto a Corabastos, con propuesta la barra sube (35 → 47 % en v4): con datos, Kennedy es solo 15 % de lo que entra a Corabastos.

**Contradicción declarada (no se esconde).** Que sin propuesta Corabastos se llene en el año 4 y con propuesta baje a 30 % sale de dos supuestos de diseño, no de datos medidos: la cola M/M/1 y el umbral que crea (≈38,5 %), y la congestión de 2025 junto a Corabastos con propuesta. Solo con los datos (v4), sin propuesta llegaba a 50 % en 15 años y el game over era por residuos (año 6). La autora debe aprobar estos supuestos.

### Panel izquierdo (`data3d/ab01_panel.js`)
- Población y demanda se mueven solas (0,5 %/año); se pueden arrastrar.
- «Ingreso a Corabastos» se mueve solo (ingreso de la semana ÷ 6.460) y muestra sus t/día; al arrastrarlo, factor nuevo = factor × posición elegida ÷ posición actual. Debajo: «Límite de Corabastos: 14.000 t» (fijo).
- «Autoconsumo» → **«Comida que producen los hogares»**: % de la demanda que las familias cultivan en casa y no compran (patios, materas). Se dejó porque es la única palanca de producción propia sin propuesta y es distinta de las huertas hidropónicas de la propuesta (que solo existen con propuesta).
- Game over: «Déficit alimentario · sector», «Límite de abastecimiento de Corabastos · % de 14.000 t», «Residuos sin recoger · t/día de 296».
- Botón **ƒx Fórmulas**: todas las variables y las 5 gráficas con los valores de la semana.
- Gráficas (paleta URBIA, una pregunta cada una, valor rotulado al final): 1 ¿Cuánta gente hay que alimentar? · 2 ¿Alcanza la comida? (demanda coral punteada, disponibles turquesa, franja coral = déficit) · 3 ¿Se acerca Corabastos a su límite? (esta corrida, la otra punteada, límite dorado) · 4 ¿Qué sector recibe menos? · 5 ¿Qué cambia con la propuesta?
- Alerta arriba con degradé violeta → coral, justo debajo del selector de escenario; la franja de eventos se corre debajo de la alerta.

### Mapa
- `abasto_capas.js`: pin y barra de Corabastos más pequeños (140 m / 260 m); etiqueta «de su límite de 14.000 t». Vías tipo Waze: la superficie de la vía pintada (verde 0,4 · ámbar 0,7 · carmesí ≥ 1,0), sin rayas blancas; las arterias × 1,12 y las intermedias × 0,92 [SUP visual]; junto a Corabastos manda su congestión (U.cC); con propuesta, a medida que abren los mercados, la subida de la ciudad desde 2025 deja de sumarse (× (1 − fracción abierta)) y el tráfico baja hasta −25 % (supuesto de `factorTraf`): sin propuesta las vías pasan a ámbar y carmesí; con propuesta quedan casi verdes con arterias en ámbar. Camiones rosados que llegan a Corabastos: 20 × ingreso ÷ 6.460 × cola (máx. 60); con cola una parte espera en fila. Morados: carros nuevos de la propuesta a los mercados y a Bavaria Común (pocos). Huertas hidropónicas en cubiertas = deslizador (KEN_HIDRO_FIJA).
- `abasto_contenedor.js`: cada mercado abierto con una barra vertical que se llena desde abajo y su % encima.
- `propuesta01_3d.js`: ~70 árboles nativos alrededor del mercado del Parque Cayetano Cañizares [SUP: forma y cantidad].
- La Vaca (sin propuesta): los árboles se pierden con D = (sin recoger − 148) ÷ 148, hasta 50 % (v3); el árbol perdido queda como tronco seco oscuro.

### Veredicto
Binario en `conclusion_abasto.js` e `informe.js`: **No sostenible** = game over; **Sostenible** = 15 años sin game over. Se quitó «Sostenible con condiciones».

### Resultados (Node, 780 semanas; % = inventario ÷ 14.000 al final de cada año)
| Caso | Sin: año 0 · 1 · 3 · 5 · 10 · 15 | Sin: game over | Con: año 0 · 1 · 3 · 5 · 10 · 15 | Con: game over | Veredicto sin / con |
|---|---|---|---|---|---|
| Por defecto (0,5 %/año, 44 mercados) | 35 · 38 · 45 · 120 · 120 · 120 | Límite de Corabastos, semana 206 (año 4) | 35 · 34 · 33 · 33 · 31 · 30 | ninguno | No sostenible / **Sostenible** |
| Población 0 %/año | 35 · 37 · 41 · 52 · 120 · 120 | Límite, semana 275 | 35 · 34 · 32 · 31 · 27 · 25 | ninguno | No / Sostenible |
| Población 1 %/año | 35 · 38 · 54 · 120 | Límite, semana 167 | 35 · 35 · 35 · 35 · 36 · 38 | tráfico general, semana 739 | No / No |
| Población 2 %/año (estrés) | 35 · 40 · 120 | Límite, semana 124 | 35 · 36 · 39 · 43 · 120 | Límite, semana 367 | No / No |
| Población 3 %/año (estrés) | 35 · 41 · 120 | Límite, semana 100 | 35 · 37 · 44 · 120 | Límite, semana 204 | No / No |
| Ingreso 110 % | 40 · 120 | Límite, semana 14 | 40 · 120 | Límite, semana 16 | No / No |
| Ingreso 90 % | 31 · 28 · 31 · 34 · 117 | residuos, semana 319 | 30 · 27 · 26 · 26 · 24 · 24 | ninguno | No / Sostenible |
| 20 mercados | (igual) | Límite, semana 206 | 35 · 35 · 35 · 35 · 36 · 37 | ninguno | No / Sostenible |
| 50 mercados | (igual) | Límite, semana 206 | 35 · 34 · 33 · 32 · 30 · 29 | ninguno | No / Sostenible |
| Consumo 120 % | 37 · 43 · 120 | Límite, semana 121 | 37 · 38 · 37 · 36 · 34 · 33 | ninguno | No / Sostenible |

Con propuesta y valores por defecto, márgenes en los 15 años: sector que menos recibe 100 % (límite 80 %), Corabastos máximo 35 % (límite 100 %), residuos sin recoger máximo ≈188 t/día (límite 296). Mercados: uso máximo 80 %, promedio 71–80 %; mueven 448 t/día de Kennedy al año 15 más el acopio regional; ingreso a Corabastos 6.434 → 6.069 t/día (sin propuesta 6.461 → 6.585 t/día antes de llenarse).
