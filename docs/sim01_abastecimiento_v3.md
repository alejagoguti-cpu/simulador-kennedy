# Simulación 01 Abastecimiento — v3 (pedido de la autora, 2026-11-26)

## Panel izquierdo (al hacer clic en la simulación 01)
- Se mantienen los sliders que ya hay.
- Slider de **crecimiento poblacional**: su mínimo es la población actual de Kennedy (se muestra el número). Con los años se mueve solo (crece), pero también se puede mover a mano.
- Está **ligado a la demanda alimentaria**: si uno se mueve, el otro también. El mínimo de la demanda es la demanda actual.

## Datos iniciales
- Población de Kennedy: 1.034.838 habitantes.
- Referencia alimentaria por habitante: 0,951 kg diarios (mide abastecimiento per cápita, no consumo real observado).
- Demanda inicial estimada: 984 t diarias.
- Ingreso promedio a Corabastos: 6.460 t diarias.
- Capacidad de referencia de Corabastos: 14.000 t (procede de un documento técnico regional; es capacidad de referencia, no un límite diario certificado de despacho).

## Fórmulas
- Población simulada = Población inicial × factor de crecimiento.
- Demanda diaria = Población simulada × 0,951 kg.
- Déficit por sector = máx(0, demanda − alimentos efectivamente recibidos).
- Saturación de Corabastos = Toneladas almacenadas ÷ 14.000 × 100.
- Inventario final = Inventario inicial + ingresos − despachos − pérdidas.
- No confundir demanda con alimentos almacenados: el aumento poblacional no llena automáticamente Corabastos.

## Controles
- Slider de crecimiento poblacional que parte de la población inicial.
- La demanda aumenta automáticamente con la población.
- En ambos escenarios los mismos datos y condiciones de Corabastos; en la propuesta Corabastos se reduce 50 %, se agranda el humedal y crecen árboles.
- Con propuesta: slider de cantidad de huertas hidropónicas activas; su producción reduce la demanda no cubierta por la red existente.

## Gráficas (todas se actualizan con las mismas fórmulas al mover los sliders)
1. Población y demanda alimentaria.
2. Demanda frente a alimentos disponibles.
3. Capacidad ocupada de Corabastos.
4. Déficit alimentario por sector de Kennedy.
5. Comparación entre escenarios con y sin propuesta.

## Game over (límites iguales en ambos escenarios)
- Déficit alimentario: cobertura inferior al 80 % durante 4 semanas consecutivas.
- Saturación: inventario superior a 14.000 t durante 4 semanas consecutivas.
- Residuos: hoy «no se mira» → arreglarlo para que funcione y se vea bien.

## Vista con propuesta
- Edificios, vías y foto satelital en blanco y negro; todo lo demás (lo de la propuesta, árboles, huertas, humedal, fauna, etc.) en color.

## Textos
- No usar «plausible»: usar «sostenible».

## Implementación (2026-11-26)

### Fórmulas tal como están en el código (`data3d/simulaciones12.js`, bloque `AB01V3`, `ab01Paso`, `bodPaso`, `paso`)
Cada semana (flujos en t/día; inventario en t, semanas de 7 días):
- Población = 1.034.838 × (1 + crecimiento)^(semana/52). Si se mueve el deslizador «Población de Kennedy» en la semana s0: desde ahí = valor elegido × (1 + crecimiento)^((semana − s0)/52). El mínimo del deslizador es 1.034.838.
- Demanda de Kennedy = población × 0,951 kg × consumo (%) ÷ 1.000 (984 t/día al inicio). «Demanda alimentaria» y «Población» están ligadas: mover una mueve la otra.
- Recibido por zona = autoconsumo + mercados (con propuesta) + huertas hidropónicas (con propuesta) + lo que despacha Corabastos.
- Pedido a Corabastos L = resto de la región + lo que pide Kennedy. Resto en 2025 = 6.460 × (1 − 0,0155) − 984 = 5.376 t/día (equilibrio de 2025), creciendo con la misma tasa de población.
- Ingresos = mín(6.460 × «Ingreso a Corabastos», 6.460 × (1 + «Tope de ingreso diario»)) − lo que compran los mercados de la propuesta directo a productores. No crecen con la población.
- Pérdidas (semana) = 7 × k × inventario inicial; k = 0,0155 × 6.460 ÷ inventario de 2025 ≈ 0,0102 por día.
- Despachos = mín(7 × L, inventario inicial + 7 × ingresos − pérdidas).
- Inventario final = inventario inicial + 7 × ingresos − despachos − pérdidas. Inventario de 2025 = Σ recibo × días de permanencia de las 37 naves ≈ 9.860 t (70 % de 14.000).
- Saturación = inventario ÷ 14.000 × 100.
- Si lo pedido pasa lo disponible, todos los compradores reciben la misma fracción f = despachos ÷ (7 × L); dentro de Kennedy el faltante pesa más en las zonas lejos de Corabastos (como en v2).
- Sectores: los 8 de Kennedy (Juntas de Acción Comunal). Déficit = máx(0, demanda − recibido); cobertura = recibido ÷ demanda.
- Bodegas (solo para verlas): cada nave guarda su parte del inventario (recibo × permanencia ÷ Σ) y se llena frente a su tope. El game over usa el total frente a 14.000 t.
- Residuos (sin cambios de v2 salvo la referencia): R = 922 × 1,027^años + 0,19 × (comida que llega − 984); sin recoger = máx(0, R − 774 − tratados).

### Game over (iguales con y sin propuesta)
| Regla | Condición | Dónde se ve |
|---|---|---|
| `deficit` | un sector bajo 80 % de su demanda 4 semanas seguidas | panel izquierdo (Game over · Déficit), gráfica 4, informe |
| `saturacion` | inventario > 14.000 t 4 semanas seguidas | panel izquierdo (Saturación), medidor de barra sobre Corabastos, gráfica 3, informe |
| `residuosK` | 296 t/día sin recoger 4 semanas seguidas | panel izquierdo (Residuos), puntos de residuos en el mapa, informe |
Las 7 reglas generales del simulador siguen activas (con 2–3 %/año de crecimiento, con propuesta llega antes la de tráfico).

**Por qué «residuos no se veía».** La regla sí estaba en el modelo y en el informe (sin propuesta: semana 273 en v2). En el mapa solo se veía como un velo casi transparente sobre La Vaca, árboles pequeños y montones que solo salían por encima de 148 t/día; y en el panel no había ningún indicador de esa regla. Ahora: barra «Residuos» en el panel izquierdo con las semanas seguidas en falla (n/4), puntos naranja → rojos (uno por cada 2 t/día sin recoger) alrededor de La Vaca y de los puntos críticos, de tamaño fijo en pantalla, y la etiqueta «Residuos n %» (de 296).

### Fuentes y supuestos
- Datos de la autora: 1.034.838 hab, 0,951 kg/hab/día, 984 t/día, 6.460 t/día, 14.000 t.
- Pérdidas: 0,0155 t por t que entra (≈100 t/día de residuos de Corabastos, DANE 2012, p. 2; SIPSA 2025). [SUP] proporcionales a lo almacenado.
- Inventario inicial: recibo por nave × días de permanencia (docs/fuentes_bodegas_residuos.md §1.4; confianza baja).
- [SUP] Toda la demanda de Kennedy que no cubre la red se compra en Corabastos (el dossier estima ~700 de 1.100 t/día).
- [SUP] Huerta hidropónica = 50 m² × 6 kg/m²·año (valor del modelo de huertas, sin rendimiento verificado de hidroponía) = 0,82 kg/día. 50 huertas = 0,04 t/día: su efecto en la cobertura es despreciable.
- [SUP] Sin estacionalidad mensual (la autora da promedios).
- «Consumo por habitante» es el antiguo deslizador «Demanda de alimentos» (% de 0,951 kg). «Tope de ingreso diario» es el antiguo «Tope de Corabastos»: ahora limita lo que entra por día, no el almacenamiento.

### Resultados (Node, 780 semanas; semana en que se cumple cada regla 4 semanas seguidas, corriendo sin detenerse)
| Caso | Sin propuesta: déficit · saturación · residuos | Con propuesta: déficit · saturación · residuos |
|---|---|---|
| Por defecto (0,5 %/año) | — · — · 290 (año 6) | — · — · — (sostenible) |
| Población 2 %/año | 448 · — · 290 | 595 · — · — (tráfico general en 517) |
| Población 3 %/año | 301 · — · 290 | 400 · — · — (tráfico general en 385) |
| Ingreso 110 % | — · 5 · 286 | — · 5 · — |
| Ingreso 90 % | 666 · — · 324 | — · — · — |
| Población 1.400.000 desde la semana 104 | — · — · 193 | — · — · — |

Con propuesta y valores por defecto, márgenes a cada límite en los 15 años: sector peor servido 94,0 % (límite 80 %), inventario máximo 71 % de 14.000 t (límite 100 %), residuos sin recoger máximo 179 t/día (límite 296).

### Contradicción declarada: 14.000 t en los dos escenarios con Corabastos a la mitad
La autora pide los mismos límites en los dos escenarios y, a la vez, reducir Corabastos 50 % en la propuesta. Se dejó 14.000 t en ambos, como ella pide. Implicación: con propuesta el límite de saturación es generoso (con la mitad de las naves la capacidad física sería ~7.000 t); si se usara 7.000 t, el inventario de 2025 (≈9.860 t) ya estaría saturado desde la semana 1. Lo que compensa en la propuesta: los 12 mercados compran ~165–200 t/día directo a productores (no entran a Corabastos), las Estaciones Circulares tratan hasta 400 t/día de orgánicos y las huertas suman muy poco (0,04 t/día con 50). En el modelo la mitad física de Corabastos solo se dibuja; no cambia sus ingresos.

### 3D y panel
- `data3d/ab01_panel.js`: deslizadores ligados que se mueven solos, barras de game over, 5 gráficas en pestañas (1 población y demanda, 2 demanda y alimentos disponibles, 3 capacidad ocupada, 4 déficit por sector, 5 con frente a sin), alerta corta arriba al centro.
- `data3d/abasto_capas.js`: medidor de barra sobre Corabastos (inventario ÷ 14.000), puntos de residuos, etiquetas solo con porcentaje; con propuesta no dibuja las 18 naves quitadas.
- `data3d/propuesta01_3d.js` (nuevo): con propuesta, Corabastos al 50 % (las 18 naves más cercanas a La Vaca), La Vaca se agranda sobre las naves quitadas a menos de 120 m (crece del 30 % al 100 % entre los años 1 y 5), pradera con árboles nativos escaneados que se siembran entre los años 1 y 5 y crecen en 5; edificios, vías y foto satelital en blanco y negro; árboles, agua, huertas, mercados, fauna, medidores y carros en color.
- Se quitó el recorrido de las cubiertas (`data3d/cubiertas_foco.js` ya no se carga; el archivo sigue en el repositorio).
