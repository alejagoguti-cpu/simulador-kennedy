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
| Cola en Corabastos | — | **Regla del modelo (decisión de la autora): cuando no hay dónde poner la comida, la mercancía sale más lento y Corabastos se llena.** Ya no es [SUP]. v5 original: permanencia × (1 − ρ0) ÷ (1 − ρ); recalibrada en v5.1 (abajo) con β = 0,5 |
| Lo que nadie pide | se quedaba (el inventario se congelaba y la barra no podía bajar) | si sobra, los mayoristas piden menos a la región esa semana (el inventario baja hacia su equilibrio); tope físico 120 % de 14.000 t |
| Game over el mismo día | déficit antes que saturación | primero «Límite de abastecimiento de Corabastos» (el déficit es su consecuencia: la central llena no despacha) |

**Reconciliación con v4 («los ingresos crecen con lo pedido»).** Sigue igual: ingreso = «Ingreso» × pedido ÷ (1 − 0,0155). Lo que cambia con propuesta es el pedido: baja la parte de Kennedy (mercados a pie, huertas) y la del resto de la región (acopio regional de los mercados). Sin el acopio regional ni la congestión de 2025 junto a Corabastos, con propuesta la barra sube (35 → 47 % en v4): con datos, Kennedy es solo 15 % de lo que entra a Corabastos.

**Contradicción declarada (no se esconde).** Que sin propuesta Corabastos se llene y con propuesta baje a 30 % depende de la regla de la cola (ahora decisión de la autora, v5.1) y de un supuesto que sigue siendo [SUP] de la propuesta: la congestión de 2025 junto a Corabastos con propuesta. Solo con los datos (v4), sin propuesta llegaba a 50 % en 15 años y el game over era por residuos (año 6). (La versión original v5 llenaba Corabastos en el año 4; la tabla de «Resultados» de abajo es de esa versión: la vigente está en v5.1.)

### Panel izquierdo (`data3d/ab01_panel.js`)
- Población y demanda se mueven solas (0,5 %/año); se pueden arrastrar.
- «Ingreso a Corabastos» se mueve solo (ingreso de la semana ÷ 6.460) y muestra sus t/día; al arrastrarlo, factor nuevo = factor × posición elegida ÷ posición actual. Debajo: «Límite de Corabastos: 14.000 t» (fijo).
- «Autoconsumo» → **«Comida que producen los hogares»**: % de la demanda que las familias cultivan en casa y no compran (patios, materas). Se dejó porque es la única palanca de producción propia sin propuesta y es distinta de las huertas hidropónicas de la propuesta (que solo existen con propuesta).
- Game over: «Déficit alimentario · sector», «Límite de abastecimiento de Corabastos · % de 14.000 t», «Residuos sin recoger · t/día de 296».
- Botón **ƒx Fórmulas**: todas las variables y las 5 gráficas con los valores de la semana.
- Gráficas (paleta URBIA, una pregunta cada una, valor rotulado al final): 1 ¿Cuánta gente hay que alimentar? · 2 ¿Alcanza la comida? (demanda coral punteada, disponibles turquesa, franja coral = déficit) · 3 ¿Se acerca Corabastos a su límite? (esta corrida, la otra punteada, límite dorado) · 4 ¿Qué sector recibe menos? · 5 ¿Qué cambia con la propuesta?
- Alerta arriba con degradé (v5.2: violeta URBIA #304ffe → turquesa #4fd1c5; antes violeta → coral), justo debajo del selector de escenario; la franja de eventos se corre debajo de la alerta.

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

## v5.1 Recalibración (2026-11-26): Corabastos se llena más adelante

**Decisión de la autora:** Corabastos debe llenarse más adelante porque no hay dónde poner la comida; no se deja como supuesto. En v5 sin propuesta llegaba al límite en el año 4.

**Regla del modelo (decisión de la autora): cuando no hay dónde poner la comida, la mercancía sale más lento y Corabastos se llena.** Fórmula (`ab01Paso`, `AB01V3.COLA_B`):

- permanencia = 0,76 días × (1 + congestión junto a Corabastos) ÷ 1,62 × **cola**
- cola = 1 + β × [(1 − ρ0) ÷ (1 − ρ) − 1], con ρ = inventario ÷ 14.000, ρ0 = 0,35 (nivel de 2025: cola = 1) y **β = 0,5**
- inventario final = inventario inicial + ingresos − despachos − pérdidas (sin cambios); límite 14.000 t (sin cambios)

Cambio: se agregó β (antes 1, la cola completa M/M/1). Con β = 0,5 la cola crece a la mitad de velocidad; no se inventaron datos nuevos ni se tocó la estructura. β no es un dato medido: es el valor que calibra el momento en que se llena (ver escaneo). Se mantiene la forma de cola porque describe lo que dice la regla (cuanto más llena, más tarda en salir); el momento exacto del límite depende de β.

Escaneo de β (por defecto, sin propuesta, semana del límite de Corabastos): 1,0 → 206 (año 4) · 0,8 → 311 · 0,7 → 378 · 0,6 → 457 · 0,55 → 502 · **0,5 → 552 (año 10,6)** · 0,3 → no se llena en 15 años (64 % al año 15). Elegido 0,5.

### Resultados v5.1 (Node, `correr01v5.mjs`; % = inventario ÷ 14.000 al final de cada año; ≥ 100 % = límite superado y barra tope 120 %)

| Caso | Sin: año 0 · 1 · 3 · 5 · 8 · 10 · 12 · 15 | Sin: Límite de Corabastos (4 semanas sobre 14.000 t) | Sin: primer game over | Con: año 0 · 1 · 3 · 5 · 8 · 10 · 12 · 15 | Con: game over |
|---|---|---|---|---|---|
| **Por defecto** (0,5 %/año, 44 mercados) | 35 · 37 · 40 · 43 · 50 · 58 · 120 · 120 | semana 552 (año 10,6) | **residuos, semana 285 (año 5,5)** | 35 · 35 · 34 · 34 · 33 · 32 · 31 · 32 | ninguno (Sostenible) |
| Población 0 %/año | 35 · 36 · 38 · 41 · 44 · 47 · 51 · 63 | no se llena en 15 años | residuos, semana 294 | 35 · 34 · 33 · 32 · 30 · 29 · 28 · 27 | ninguno |
| Población 1 %/año | 35 · 37 · 41 · 46 · 62 · 120 · 120 · 120 | semana 431 | residuos, semana 276 | 35 · 35 · 35 · 35 · 35 · 36 · 36 · 37 | tráfico general, semana 739 |
| Población 2 %/año (estrés) | 35 · 38 · 44 · 54 · 120 · 120 · 120 · 120 | semana 326 | residuos, semana 259 | 35 · 36 · 37 · 39 · 42 · 44 · 44 · 44 | tráfico general, semana 517 |
| Población 3 %/año (estrés) | 35 · 39 · 47 · 56 · 120 · 120 · 120 · 120 | semana 326 | residuos, semana 256 | 35 · 36 · 40 · 44 · 44 · 44 · 44 · 44 | tráfico general, semana 385 |
| Consumo 120 % | 37 · 39 · 42 · 47 · 57 · 120 · 120 · 120 | semana 458 | residuos, semana 216 | 37 · 37 · 36 · 36 · 35 · 34 · 33 · 34 | ninguno |
| Ingreso 90 % | 31 · 30 · 32 · 34 · 38 · 41 · 44 · 51 | no se llena en 15 años | residuos, semana 319 | 30 · 29 · 28 · 28 · 27 · 27 · 26 · 26 | ninguno |
| Ingreso 110 % | 40 · 45 · 50 · 56 · 120 · 120 · 120 · 120 | semana 326 | residuos, semana 285 | 40 · 42 · 41 · 41 · 39 · 38 · 38 · 38 | ninguno |
| 20 mercados (con) | (igual a por defecto) | semana 552 | residuos, semana 285 | 35 · 35 · 35 · 35 · 35 · 35 · 36 · 36 | ninguno |
| 50 mercados (con) | (igual a por defecto) | semana 552 | residuos, semana 285 | 35 · 35 · 34 · 33 · 32 · 31 · 31 · 30 | ninguno |

(Años 3, 5 y 8 del caso por defecto: 40, 43 y 50 %; la barra sube cada año.)

Márgenes con propuesta y valores por defecto: Corabastos máximo 35 % (límite 100 %), sector que menos recibe 100 % (límite 80 %); la barra baja de 35 % a 31–32 %. Con propuesta siguen en «Sostenible» el consumo 120 %, ingreso 90 y 110 %, 20 y 50 mercados y población 0 %; con población ≥ 1 %/año sube el tráfico general (game over de tráfico, no de Corabastos).

**Pendiente para la autora:** con los valores por defecto sin propuesta el primer game over es **«Residuos sin recoger» en la semana 285 (año 5,5)**, antes que el límite de Corabastos (semana 552, año 10,6). Los residuos no se cambiaron. Si la intención es que lo que termine la simulación sin propuesta sea Corabastos lleno, hay que decidir qué hacer con la regla de residuos (922 × 1,027^años + 0,19 × (comida que llega − 1.100) − 774 recogidas; límite 296 t/día).

## Pendiente v5.2 (pedido de la autora, 2026-11-26)
- Con propuesta, las bodegas de Corabastos se quitan de a poco con los años, no de una vez.
- Las barras de los mercados de barrio nunca pasan del 70 %.
- Corabastos con propuesta en ~50–60 %, no vacío (antes pidió 30–40 %: se toma lo último).
- Colores de las vías realistas: que midan de verdad la cantidad de carros en cada vía (densidad de vehículos), no un nivel general.
- Las huertas en los techos no se ven: el deslizador «Huertas hidropónicas activas» quedó en 50 de 2.132 cubiertas. Deben verse instalándose con los años.
- Al lado del % de cada mercado, un ícono de mercado (SVG, no emoji).
- Ya hecho por el coordinador: vías debajo de los carros (desplazamiento de profundidad mínimo), opacidad 0,65, verde y amarillo bien separados.

## v5.2 Implementación (2026-11-26)

Pedido de la autora (lista «Pendiente v5.2» de arriba) más los pedidos del coordinador del mismo día. Lo que es supuesto va marcado [SUP].

### 1 · Corabastos se desmonta de a poco (modelo y 3D con el mismo calendario)
- Las mismas 18 naves de siempre (la mitad de 37, las más cercanas a La Vaca: campo `dh` de corabastos.json = `BOD01.NAVES[i][7]`) se quitan **una por una entre la semana 52 (año 1) y la 416 (año 8)**, ≈ 2,5 por año, la más cercana a La Vaca primero [SUP: calendario]. Modelo: `AB01_DESMONTE` / `desPaso` (simulaciones12.js). 3D: `semQuita01` (abasto_capas.js), la misma fórmula 52 + k × 364 ÷ 17.
- **En el modelo:** la capacidad de Corabastos = 14.000 t × (tope de las naves que quedan ÷ tope de las 37) (topes de BOD01: área × densidad, DANE 2012). Al final 50,7 % → **7.103 t**. El % de la barra y el game over de «Límite de abastecimiento» se miden contra esa capacidad (sin propuesta sigue 14.000 t). El inventario se reparte entre las naves que quedan (sus líquidos suben). La regla de la cola (β = 0,5) sigue midiendo ρ contra las 14.000 t de referencia: si se mide contra la capacidad que queda, con propuesta la cola se dispara y Corabastos se llena en el año 5 (probado: game over semana 264). **Decisión de la autora pendiente:** antes se pidió «el límite no cambia»; ahora cambia con propuesta porque las naves se quitan (con las huertas sigue sin cambiar).
- **En el 3D (propuesta01_3d.js):** cada celda del terreno liberado guarda la semana de la nave quitada más cercana (con ruido, para que el frente no sea recto). La malla de Google solo se recorta donde ya se quitó la nave; antes se ven la foto y el volumen gris de la nave. El agua, la pradera, los juncos y los árboles crecen en cada celda desde su semana (obra 0,6 años, agua y pradera en 4 años, árboles sembrados en 1,5 años y adultos 3,5 años después) [SUP]. Con la capa Bodegas, las naves de vidrio desaparecen con el mismo calendario (`U.nQuit`).

### 2 · Barras de los mercados ≤ 70 %
- `MERC_UMAX` 0,8 → **0,7**: un mercado vende a Kennedy hasta 70 % de 28 t/día (19,6 t/día; la Plaza de Kennedy hoy vende 17, 61 %), **también en un faltante de Corabastos** (la 2ª vuelta ya no llega a 100 %).
- `MERC_UREG` 0,7 → **0,55** [SUP de la propuesta]: el acopio regional llena hasta 55 %; la barra = Kennedy + acopio, así queda entre 55 y 70 % según lo que compra cada barrio (promedio 70 % al abrir la Plaza, 58 % al año 15; máximo 70 %).
- Ícono de mercado (puesto con toldo, SVG en línea) al lado del % (abasto_contenedor.js).

### 3 · Corabastos con propuesta ≈ 50–60 %
Dos cambios, los dos ya documentados como supuestos de la propuesta: (a) el desmonte del punto 1 (la misma mercancía en la mitad de las naves) y (b) la congestión de base junto a Corabastos con propuesta baja hasta −25 % a medida que abren los mercados: 0,62 × (1 − 0,25 × fracción abierta), el mismo supuesto de `factorTraf` y de los colores de las vías, que antes no entraba en la permanencia. Sin (b) quedaba en 62–66 %. El acopio regional casi no mueve la barra (escaneo 0–0,7: ±2 puntos).

Tabla (Node, `sel.mjs`; % = inventario ÷ capacidad al final de cada año; sin propuesta = ÷ 14.000):

| Caso | Sin: año 0 · 1 · 3 · 5 · 8 · 10 · 12 · 15 | Sin: primer game over | Con: año 0 · 1 · 3 · 5 · 8 · 10 · 12 · 15 | Con: game over |
|---|---|---|---|---|
| **Por defecto** | 35 · 37 · 40 · 43 · 50 · 58 · 120 · 120 (sin cambios) | residuos, semana 285 (Corabastos 552) | **35 · 34 · 38 · 44 · 58 · 60 · 58 · 58** | ninguno (Sostenible) |
| Población 0 %/año | 35 · 36 · 38 · 41 · 44 · 47 · 51 · 63 | residuos, 294 | 35 · 34 · 37 · 42 · 54 · 55 · 52 · 50 | ninguno |
| Población 1 %/año | 35 · 37 · 41 · 46 · 62 · 120 · 120 · 120 | residuos, 276 | 35 · 35 · 39 · 46 · 62 · 66 · 65 · 66 | tráfico, 739 (igual que v5.1) |
| Población 2 %/año | 35 · 38 · 44 · 54 · 120 · … | residuos, 259 | 35 · 35 · 41 · 51 · 73 · 77 · 75 · 73 | tráfico, 517 (igual) |
| Población 3 %/año | 35 · 39 · 47 · 56 · 120 · … | residuos, 256 | 35 · 36 · 44 · 56 · 74 · 77 · 75 · 73 | tráfico, 385 (igual) |
| Consumo 120 % | 37 · 39 · 42 · 47 · 57 · 120 · … | residuos, 216 | 37 · 37 · 40 · 46 · 61 · 63 · 61 · 61 | ninguno |
| Ingreso 90 % | 31 · 30 · 32 · 34 · 38 · 41 · 44 · 51 | residuos, 319 | 30 · 29 · 32 · 37 · 49 · 50 · 49 · 49 | ninguno |
| Ingreso 110 % | 40 · 45 · 50 · 56 · 120 · … | residuos, 285 | 40 · 42 · 46 · 53 · 69 · 71 · 68 · 68 | ninguno |
| 20 mercados | (igual a por defecto) | residuos, 285 | 35 · 35 · 39 · 45 · 61 · 64 · 64 · 63 | ninguno |
| 50 mercados | (igual a por defecto) | residuos, 285 | 35 · 35 · 38 · 43 · 57 · 58 · 57 · 56 | ninguno |

Sin propuesta no cambió nada (sigue primero el game over de residuos en la semana 285, como pidió la autora). Con propuesta la barra sube de 35 % mientras se quitan las naves (años 1–8) y se queda en 56–60 %.

### 4 · Vías que miden los carros (las 6 simulaciones) — `data3d/vias_densidad.js`
- Se cuentan los vehículos que de verdad se dibujan: los de la grabación SUMO (`T3.TRAF.vis`, ya con la hora del día y el factor de tráfico del modelo `KEN_TRAF_F`) y, en la 01, los camiones que llegan o hacen fila en Corabastos y los morados (abasto_capas.js los registra con `KEN_VIAS.extra`).
- Todas las vías de net.json (arterias, intermedias y locales) en tramos de ≤ 60 m; cada 0,6 s cada vehículo va al tramo más cercano (rejilla de 30 m, a menos de medio ancho + 4 m). **k = vehículos ÷ (km × carriles)**, carriles = ancho dibujado ÷ 3,5 m (arterias 4, intermedias 3, locales 2; los dos sentidos). Suavizado en el tiempo (4 s) y el color pasa suave de una medición a la otra (sin saltos).
- **Color = k ÷ 28 veh/km/carril**: 28 ≈ 45 vehículos livianos/milla/carril = límite de los niveles de servicio E/F (capacidad ≈ 2.000 veh/h/carril a ≈ 72 km/h; Highway Capacity Manual, TRB 2016: A ≤ 7, B ≤ 11, C ≤ 16, D ≤ 22, E ≤ 28 veh/km/carril). Verde = A–C (< 16), amarillo = D–E (16–28), carmesí = F (≥ 28), con las bandas bien separadas de antes. Las calles locales solo se pintan si tienen vehículos.
- Sin titilar: la cinta va 0,28 m sobre el asfalto propio (antes quedaba casi coplanar con el asfalto y las rayas), por debajo de la carrocería de los carros, sin escribir profundidad.
- Etiqueta junto a Corabastos: densidad medida en las vías a ≤ 900 m (veh/km/carril y nivel de servicio). Convenciones explica cómo se mide.
- [SUP] los vehículos del mapa son una muestra de la grabación SUMO (hasta 3 copias en hora pico): es la densidad de lo que se ve, no un aforo; motos y camiones cuentan como 1.

### 5 · Huertas en las cubiertas que se instalan con los años
- «Huertas hidropónicas activas» está en **auto** por defecto: `huertasAuto(sem)` = 2.132 × semana ÷ 754 → ≈ 147 en el año 1, 735 en el 5, 1.470 en el 10, 2.132 en el 15 (primero las más altas, el orden de huertas_hidro.js) [SUP: calendario lineal]. Al moverlo queda fijo; el botón «Auto» lo devuelve. La producción del modelo usa el mismo número que se ve (U.nH → KEN_HIDRO.fraccion), y los enjambres de polinizadores siguen las cubiertas instaladas (propuesta_fauna.js lee KEN_HIDRO.frac).

### 6 · Alerta de arriba
Degradé violeta URBIA → turquesa (#304ffe → #3d8fe6 → #4fd1c5) en ab01_panel.js y sim_panel.js, con sombra de texto para que el blanco se lea sobre el turquesa.

### 7 · Lo que se agregó con propuesta (pedidos del coordinador)
- **Calles verdes** (`data3d/calles_verdes3d.js`): ≈ 11.800 árboles nativos (modelos escaneados de parches_arboles.js) en andenes y separadores de 165,7 km de arterias e intermedias; primero el 30 % de la longitud más cerca de parques y humedales entre las semanas 52 y 416 (el mismo 30 % de calles verdes de PROP_SUP en el modelo), luego el resto hasta la semana 676; adultos 3,5 años después [SUP]. Nunca sobre la calzada, cruces (14 m), glorietas, puentes ni agua; menos árboles con KEN_CALIDAD 'liviano'.
- **Humedal artificial de fitodepuración en Bavaria** (`data3d/humedal_bavaria3d.js`): 6 celdas en serie (sedimentador, eneas, juncos, plantas flotantes, pulimento y laguna de hábitat) con canal en meandro: 1,03 ha de celdas (0,51 agua, 0,51 vegetación) en una huella de 2,04 ha en el parque central CP-01 del plan; obra años 2–3, agua 3–4, plantas 3–6; llegan garzas, tinguas, patos, monjitas, polinizadores y libélulas con los años [SUP: calendario y cantidades]. Agua opaca. Está en la lista de obras (`humedal_bavaria`).
- **Agua siempre opaca**: el agua de La Vaca de la capa Residuos ya no es un velo transparente: es agua opaca con ondas que se pone café con la degradación D.
- **Precarga**: la propuesta 3D (campo del humedal en trozos de ≤ 8 ms, juncos, árboles, calles verdes, humedal de Bavaria) se arma escondida apenas se escoge una simulación después de «Iniciar»; al pasar a «con propuesta» solo se prende.