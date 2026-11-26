# Escenario 01: verificación de datos previa a la implementación

Consulta realizada el 25 de noviembre de 2026. El archivo
`data3d/escenario01_construcciones.geojson` se regenera con
`node tools/escenario01_catastro.mjs`.

## Resultado geográfico

- Límite administrativo: capa oficial **Localidad** de Catastro/IDECA,
  código 08 (Kennedy).
- Construcciones: capa oficial **Construcción** de Catastro/IDECA.
- Criterio: `CONNPISOS >= 15`, con el centro de la geometría dentro del límite
  de Kennedy. La consulta espacial devolvió 124 registros geométricos;
  corresponden a 77 identificadores `CONCODIGO` únicos y 40 lotes.
- El archivo guarda los 77 candidatos y sus polígonos, identificadores,
  coordenadas y número de pisos. No afirma que sean 72 edificios separados:
  varios bloques de construcción pueden pertenecer al mismo lote. En la escena
  se eligen hasta 50 construcciones con cubierta modelada a menos de 18 m del
  centro catastral, dando prioridad a las de 15 pisos. El cruce se puede
  inspeccionar en `KEN_T3.hidroCatastro` desde la consola. En la prueba local
  cargaron 45 cubiertas.

## Datos aún sin verificación

- `CONALTURA` devolvió únicamente valores entre -2 y 0 para estos registros.
  El campo se describe como altura, pero esos valores no acreditan la altura
  métrica real de construcciones de 16 pisos o más. Se deja `alturaRealM: null`.
- La huella catastral no documenta circulación, cuartos técnicos, evacuación,
  capacidad estructural ni uso efectivo de la cubierta. Se dejan nulas la
  superficie de cubierta habilitable y la capacidad de módulos.
- No se han incorporado rendimientos verificados para papa aeropónica,
  zanahoria en sustrato profundo ni cohombro con tutorado. No debe derivarse
  producción de una cifra supuesta de autoconsumo.
- La imagen aportada muestra torres blancas de cultivo en una cubierta con
  pasillos, depósitos y un invernadero. El render usa torres blancas de 2,10 m
  sobre depósitos circulares de 0,78 m × 0,38 m, separados por pasillos.
  Es referencia visual, no prueba de
  viabilidad estructural de una cubierta concreta.
- El recorrido tiene tres vistas: panorama gris con cubiertas verdes, corte y
  acercamiento a una cubierta de exactamente 15 pisos, y controles con
  indicadores de abastecimiento sobre el panorama. El edificio elegido es el
  más cercano al punto de Corabastos entre los verificados con exactamente
  15 pisos: 1,46 km; no se presenta como contiguo.
- La tercera vista recalcula 520 semanas con el motor existente, permite
  recorrer los 10 años y muestra su condición de game over cuando ocurre.
  El número de cubiertas verdes que aparece con el deslizador de autoconsumo
  es una visualización proporcional de ese supuesto, no un cálculo de
  producción ni de capacidad de cubierta.

## Estado del código existente

El par 01 en `data3d/simulaciones12.js` ya compara dos escenarios y calcula
demanda, abastecimiento, cobertura por zona y una condición crítica de cuatro
semanas. Su autoconsumo procede de un deslizador, sin ciclo de cultivo ni
capacidad de módulos. `data3d/huertas_hidro.js` dibuja huertas de forma
  procedimental y aleatoria sobre muchos techos. Ahora E8 usa solo el cruce
  espacial con los identificadores catastrales; la altura de la malla 3D es
  ilustrativa y no se declara como medida oficial. El horizonte general del motor es 780 semanas,
por lo que el escenario 01 solicitado debe aislarse en 520 semanas sin cambiar
los demás pares.

## Fuentes

- [Catastro/IDECA: Construcción](https://datosabiertos.bogota.gov.co/dataset/construccion)
- [Catastro/IDECA: Localidad](https://datosabiertos.bogota.gov.co/dataset/localidad-bogota-d-c)
- [IDECA: Modelo Digital de Superficie urbano](https://datosabiertos.bogota.gov.co/dataset/modelo-digital-de-superficie-zona-urbana-de-bogota)
- [IDECA: Modelo Digital de Terreno urbano](https://datosabiertos.bogota.gov.co/dataset/modelo-digital-de-terreno-de-la-zona-urbana-de-bogota)
