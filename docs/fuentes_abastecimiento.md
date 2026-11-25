# Fuentes para el escenario «01 Abastecimiento»

Dossier de cifras citables para la prueba de estrés «La demanda de comida crece y Corabastos tiene un tope». Compilado el 25-nov-2026. Cada cifra lleva la institución, el documento, el año, la URL y una confianza:

- **alta**: dato oficial primario, verificado en el documento.
- **media**: dato oficial secundario o de un estudio contratado por una entidad pública.
- **baja**: declaración de prensa o estimación propia. Cuando la estimación es mía, se muestra la cuenta.

Los archivos fuente de DANE-SIPSA se descargaron y se leyeron directamente (boletines PDF y anexos XLSX de enero a diciembre de 2025).

---

## 0. Qué supone hoy el modelo (revisión del código)

| # | Parámetro (nombre en código) | Valor actual | Unidad | Archivo:línea | ¿Cita fuente? |
|---|---|---|---|---|---|
| 1 | `POB_K` (población de Kennedy) | 1.034.000 | hab | data3d/sim_vida.js:24; data3d/viajes_mercados.js:28 («DANE 2024 aprox.») | Parcial: no da documento ni versión |
| 2 | `SUP.KG_PERS` (comida fresca que «necesita» cada persona) | 0,4 | kg/hab/día | data3d/sim_vida.js:53 («OMS») | Cita a la OMS, pero los 400 g de la OMS son una **recomendación de frutas y verduras sin papa**, no un consumo de frescos |
| 3 | `SUP.HOLGURA` (holgura del mayorista y las flotas) | 0,10 | fracción | data3d/sim_vida.js:54 | No, es [SUP] |
| 4 | `SUP.TAU_A` / `TAU_BC` (semanas que tarda la logística en reacomodarse) | 6 / 3 | semanas | data3d/sim_vida.js:55-56 | No, es [SUP] |
| 5 | `SUP.TOPE_MERC` (parte máxima de lo fresco que sale de los mercados de una zona) | 0,6 | fracción | data3d/sim_vida.js:58 | No, es [SUP] |
| 6 | `CAP_RED_TDIA` (suma de la capacidad de los 35 mercados) | ≈132 | t/día | data3d/sim_vida.js:79, de data3d/mercados_red.js:61 | No, es [SUP] |
| 7 | `CAP` por mercado (barrio / plazoleta) | 2.400 / 9.600 | kg/día de frutas y verduras | data3d/mercados_red.js:61 | No, es [SUP] |
| 8 | `puestos` por mercado (barrio / plazoleta) | 40 / 112 | puestos | data3d/mercados_red.js:69 | No, es diseño |
| 9 | Deslizador `coraTope` (tope de Corabastos sobre la demanda de hoy) | 22, rango 0–60 | % | data3d/simulaciones12.js:323 | No, es [SUP]: «ya trabaja con 10 % de holgura» |
| 10 | Tope por defecto en `pruebaIni` si `coraTope` falta | 15 | % | data3d/simulaciones12.js:603 (la línea 604 usa 22) | No, y **no coincide** con el 22 del deslizador |
| 11 | Deslizador `pobCrece` en el par 01 (crecimiento de la demanda) | 1,6, rango −1 a 3 | %/año | data3d/simulaciones12.js:318, 324 | No |
| 12 | Deslizador `P1.capAcopio` en el par 01 (capacidad de acopio de la red) | 600, máximo 900 (otros pares 200) | t/día | data3d/simulaciones12.js:309-310, 324 | No, es [SUP]: «ampliada desde 132» |
| 13 | `BASURA_SUP.CORA_T` (residuos de Corabastos) | 100 | t/día | data3d/simulaciones12.js:161, 181 | Sí (contextoganadero; OAB) |
| 14 | `MOD.SIN_CORA` (semana en que Corabastos deja de abastecer) | 52 | semana | data3d/simulaciones12.js:251 | Hipotético, marcado [SUP] |
| 15 | Aviso «Más del 94 % de lo que se vende en Bogotá entra por Corabastos» | 94 | % | data3d/simulaciones12.js:1256 | No. La frase está **mal enunciada** (ver §2) |
| 16 | Tráfico con propuesta en el par 01: hasta −25 % en 4 años | −25 | % | data3d/simulaciones12.js:464-465 | No, es [SUP] |
| 17 | `PAR.MADR` (parte de los viajes entre 2:00 y 6:00, hogares / tenderos) | 0,12 / 0,75 | fracción | data3d/viajes_mercados.js:31 | No, es [SUP] |
| 18 | `PAR.TASA_HOG`, `FR_COM_ALIM`, `TASA_COM` | 0,04 / 0,35 / 0,45 | viajes/día y fracciones | data3d/viajes_mercados.js:29-30 | No, es [SUP] |
| 19 | `PAR.KG_EQ` (compra de un hogar; un tendero lleva 4×) | 25 (100) | kg | data3d/viajes_mercados.js:41-42 | No, es [SUP] |
| 20 | `PAR.CAP_BAV` (acopio de Bavaria Común) | 80 | t/día | data3d/viajes_mercados.js:44 | No, es [SUP] |
| 21 | `PAR.FR` (parte de los vehículos cerca de Corabastos que son abastecimiento del barrio, carros / camiones) | 0,5 / 0,8 | fracción | data3d/viajes_mercados.js:46 | No, es [SUP] |
| 22 | Mecánica del tope | `tope = demanda_hoy × (1 + coraTope)`, porque `Kc = (1 + HOLGURA)·POB_K·KG_PERS·7` | kg/semana | data3d/sim_vida.js:192; simulaciones12.js:603 | — |

Los archivos data3d/corabastos.js, data3d/corabastos.json, data3d/reparto.js y data3d/abasto_contenedor.js solo dibujan: naves, volumen proporcional a t/día y la etiqueta «X % de su tope». No traen parámetros de oferta propios. data3d/simulaciones_datos.json no tiene campos de abasto.

---

## 1. Vehículos que entran a Corabastos

### 1.1 Vehículos de abastecimiento: los que traen carga (DANE-SIPSA, 2025)

SIPSA_A publica cada mes en su anexo (hoja 4) el número de vehículos que ingresan con alimentos a cada mercado mayorista:

- **livianos**: motos, automóviles, camperos y camionetas.
- **pesados**: camiones 350, 650, turbo liviana y turbo pesada, doble troques y tractomulas.

Totales de 2025 (suma de los 12 anexos mensuales, cálculo propio):

| Indicador Corabastos 2025 | Valor | Fuente | Confianza |
|---|---|---|---|
| Vehículos con carga que ingresaron en el año | 379.598 | DANE-SIPSA, anexos ene–dic 2025, hoja 4 | alta |
| Promedio diario | **1.040 veh/día** (379.598 / 365) | cálculo propio | alta |
| Pesados | 346.643, es decir **949,7/día (91,3 %)** | ídem | alta |
| Livianos | 32.955, es decir **90,3/día (8,7 %)** | ídem | alta |
| Rango mensual | 981 (nov) a 1.097 (feb) veh/día | ídem | alta |
| Toneladas por vehículo | **6,21 t/veh** (2.357.973 t / 379.598 veh) | cálculo propio | alta |
| Comparación, dic-2025: Paloquemao / Las Flores / Samper Mendoza | 1.859 / 2.105 / 698 veh/mes | anexo dic-2025, hoja 4 | alta |

### 1.2 Todos los vehículos (compradores, carros y motos incluidos)

| Indicador | Valor | Año | Fuente | Confianza |
|---|---|---|---|---|
| Ingreso vehicular anual (todas las categorías) | 4.184.854 veh/año, es decir **≈11.465 veh/día** (2015: 3.971.407) | 2016 | Corabastos, Informe de gestión 2016, p. 53 (dato de la concesionaria Covial S.A.) | media |
| Composición | 39 % automóviles (1,7 M); 1,6 M «camiones de 2 a 5 t» de los compradores | 2017 | SDDE-FAO 2018, Línea base PMAAB, citada en el DTS de logística de la Gobernación de Cundinamarca y la Región Metropolitana (2022), p. 46 | media |
| Categorías de peaje de Covial | Cat. 1: tractocamión de 6 t en adelante, más de 2 ejes. Cat. 2: camión de 3 a 6 t, 2 ejes. Cat. 3: camión de 1 a 3 t. Cat. 4: campero o camioneta hasta 1 t. Cat. 5: autos y motos | 2012 | Corabastos, Informe de gestión 2012, p. 53 | media |
| Vehículos/día en días ordinarios / pico | >11.500 / 12.800, de ellos ~1.500 camiones | 2025 | El Nuevo Siglo (16-jul-2025), cita al subgerente comercial M. Cedeño | baja |
| Vehículos/día | 12.000; 250.000 personas/día | 2012 | DANE, Boletín trimestral de abastecimiento n.º 1 (jul–sep 2012), p. 1 | media |
| Personas/día | ≈100.000 | 2026 | Corabastos, Estudios previos (Anexo 3, 30-jun-2026), p. 3 | media |

**Lectura.** Unos **1.000 vehículos de carga/día** traen la comida (SIPSA). Otros **≈10.000 vehículos/día** son compradores, transportadores de última milla y visitantes. El modelo de data3d/viajes_mercados.js trata justamente este segundo grupo (tenderos y hogares). Con eso sus órdenes de magnitud se pueden contrastar con el dato de ≈11.500 vehículos/día en total.

### 1.3 Tipos de vehículo y carga útil

| Fuente | Dato | Confianza |
|---|---|---|
| SDM, *Caracterizar el transporte de carga en Bogotá y los municipios aledaños* (Contrato 2019-1816, Consorcio ICOVÍAS-TPD, 2020), Etapa V, aforo «Av. Agoberto Mejía x Corabastos» | 6:30–7:30: C2P 199, C2G 20, C3 4, ≥C4 1. 10:00–11:00: C2P 215, C2G 28, C3 12, ≥C4 12. Suma de las dos horas: **C2P 84,3 %, C2G 9,8 %, C3 3,3 %, ≥C4 2,6 %** (cálculo propio) | media (solo dos horas diurnas) |
| SDM 2020, Resumen ejecutivo, p. 36 | Parque del nodo Corabastos: C2G 30,5 % y medios alternativos (motocarro, bicicarga, etc.) 28,5 %. **Capacidad promedio 6,6 t/vehículo**. 0,91 vehículos por establecimiento | media |
| SDM 2020, Resumen ejecutivo, pp. 37 y 45 | Viajes de abastecimiento del nodo Corabastos: ≈40 % en medios alternativos y 25 % en C2G. 26,7 viajes/mes por establecimiento en distribución, de ellos 17,3 en medios alternativos | media |
| MinTransporte, Resolución 4100 de 2004, art. 8 (modificada por la Res. 1782 de 2009) | Peso bruto vehicular máximo: camión de 2 ejes 16.000 kg (17.000 desde la Res. 1782/2009); de 3 ejes (doble troque) 28.000 kg; 3S2 48.000 kg; 3S3 52.000 kg | alta (es un límite, no una carga) |
| SDM 2014, citada en el DTS de logística (2022), p. 14 | Descargue manual de hasta 270 min en un C2G y 214 min en un C2P; el 92 % de los descargues es manual | media |

**Carga útil por tipo.** No se encontró una tabla oficial de carga útil para Corabastos. Se propone la siguiente, calibrada para que el promedio ponderado coincida con lo observado:

| Tipo (SIPSA / SDM) | Carga útil supuesta | Participación en los vehículos de abastecimiento | Base |
|---|---|---|---|
| Liviano: camioneta, campero, motocarro | 0,8 t | 8,7 % | SIPSA 2025 (participación); carga [SUP] |
| C2P: camión «350», «650», turbo, NHR/NPR | 5 t | 77,0 % (= 91,3 % × 84,3 %) | SDM 2020 × SIPSA 2025; carga [SUP] (entre los 3,5 t del «350» y los 6,5 t del «650») |
| C2G: camión sencillo grande | 9 t | 8,9 % (91,3 % × 9,8 %) | ídem |
| C3: doble troque | 17 t | 3,0 % | ídem (PBV 28 t − tara ≈ 11 t) |
| ≥C4: minimula o tractomula | 30 t | 2,4 % | ídem (PBV 48–52 t) |
| **Promedio ponderado** | **0,087·0,8 + 0,770·5 + 0,089·9 + 0,030·17 + 0,024·30 = 5,95 t** | — | Se contrasta con los **6,21 t/veh de SIPSA 2025** y los **6,6 t/veh de la SDM 2020**: la diferencia es del 4 % al 10 % |

---

## 2. Toneladas: cuánto entra a Corabastos

### 2.1 Serie oficial DANE-SIPSA de 2025 (anexos mensuales, hoja 2)

| Mes 2025 | t/mes | t/día | Vehículos/día |
|---|---|---|---|
| Ene | 206.293 | 6.655 | 1.096 |
| Feb | 187.595 | 6.700 | 1.097 |
| Mar | 199.220 | 6.426 | 1.055 |
| Abr | 194.395 | 6.480 | 1.057 |
| May | 209.540 | 6.759 | 1.075 |
| Jun | 187.221 | 6.241 | 1.014 |
| Jul | 211.999 | **6.839** (máximo) | 1.069 |
| Ago | 195.054 | 6.292 | 1.001 |
| Sep | 189.925 | 6.331 | 1.015 |
| Oct | 199.987 | 6.451 | 1.036 |
| Nov | 182.919 | 6.097 (mínimo) | 981 |
| Dic | 193.823 | 6.252 | 987 |
| **Año** | **2.357.973** | **6.460** | **1.040** |

Grupos de alimentos en 2025, suma anual (cálculo propio):

| Grupo | t/año | Participación |
|---|---|---|
| Verduras y hortalizas | 847.458 | 35,9 % |
| Tubérculos, raíces y plátanos | 661.339 | 28,0 % |
| Frutas | 640.179 | 27,1 % |
| Otros grupos (carnes, granos y cereales, lácteos y huevos, pescados, procesados) | 208.997 | 8,9 % |

Confianza: **alta**. Fuente: DANE, SIPSA_A, boletín técnico y anexo de cada mes de 2025. Corabastos movió el 30,35 % de todo el abastecimiento de los 32 mercados mayoristas de SIPSA en dic-2025.

### 2.2 Serie histórica: Corabastos no crece

| Año | t/año | t/día | Fuente | Confianza |
|---|---|---|---|---|
| 2017 | ≈2,1 M | ≈5.750 | Datos de Corabastos en SDDE-FAO 2018 (DTS logística, p. 46) | media |
| 2018 | 2.367.666 | 6.487 | Corabastos, Informe de gestión 2018, p. 4 | media |
| 2021 | 2.198.118 (94,3 % de lo que entra a los mayoristas de Bogotá) | 6.022 | SIPSA 2021 en el DTS logística, p. 40 | media-alta |
| 2025 | 2.357.973 | 6.460 | SIPSA, anexos 2025 | alta |

**Lectura.** De 2018 a 2025 el volumen de Corabastos queda plano, en ≈2,2–2,4 Mt/año. En cambio, SDDE-FAO (2018) proyectaba que la demanda de la central crecería +4,3 %, +4,5 %, +3,9 %, +3,5 % y +3,1 % al año entre 2018 y 2022. La meseta es coherente con una central cerca de su capacidad (ver §4), aunque también puede reflejar que parte de la demanda se fue a otros canales. Es evidencia **indirecta**.

**Cifras «institucionales» más altas.** Corabastos y la prensa dan 10.500–14.000 t/día: el Informe de gestión 2016 habla de «operaciones comerciales que superan en promedio las 12.000 toneladas diarias», y SDDE-FAO 2018 cita una «capacidad» de 14.000 t. Esas cifras son operaciones comerciales autodeclaradas y no ingresos medidos. Para el modelo se recomienda la serie SIPSA y expresar el tope en términos **relativos**.

### 2.3 Qué parte del abastecimiento de Bogotá pasa por Corabastos

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Corabastos entre los 4 mayoristas de Bogotá que monitorea SIPSA | 94,3 % (2021); **94,6 %** en dic-2025 (193.823 / 204.801 t, cálculo propio) | SIPSA | alta |
| Alimentos que entraron a Bogotá en 2020, todos los canales | **4,55 Mt/año**; 72,4 % de la Región Central; 41 % de Cundinamarca; Bogotá se autoabastece en 4,5 % | DTS logística (2022), pp. 11-12 | media |
| Participación aproximada de Corabastos en todo lo que entra a Bogotá | 2,36 / 4,55 ≈ **52 %** | estimación propia (años distintos: 2025 / 2020) | baja |
| Parte del volumen de Corabastos que se queda en la ciudad | 85 %; el 15 % (≈2.181 t/día según Corabastos) sale a otras regiones | Corabastos, en el DTS logística, p. 14 | media |
| Plazas distritales (19, IPES) frente a Corabastos | 10.163–10.629 t/mes en 2024, es decir el **5,1–5,7 %** del volumen de Corabastos | Contraloría de Bogotá (2025), con datos del IPES 2024, p. 33 | media-alta |
| Plazas públicas en 2018 | 6.512 t/mes, el 3,5 % de lo que entra a Corabastos | IPES 2018, citado en el DTS logística, p. 15 | media |

**Corrección para el aviso de simulaciones12.js:1256.** El 94 % es la parte de Corabastos **entre las centrales mayoristas de Bogotá que monitorea SIPSA**, no «de lo que se vende en Bogotá». Una frase defendible: «Corabastos recibe el 94 % de lo que entra a las centrales mayoristas de Bogotá (DANE-SIPSA 2025) y cerca de la mitad de todos los alimentos que entran a la ciudad».

---

## 3. Franjas horarias

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Operación | 24 horas los 7 días; cierra el 1 de enero, jueves y viernes santo y el 25 de diciembre. Tiene 9 puertas: P1, solo entrada sobre la Av. Américas, cierra de 2:00 a 3:00; P2 y P4 son salida 24 h; P3, P6, P7 y P8 abren de 4:00 a 16:00; P5, solo entrada, de 0:00 a 15:00 | DANE, Boletín trimestral jul–sep 2012, pp. 2-3 | media (2012) |
| Venta al público | 1:00 a 18:00; despeje de plataforma de 0:00 a 1:00 | Corabastos, página «Horarios» (consultada nov-2026) | alta |
| Ingreso de granos, frutas, papa negra, aguacate, plátano, tomate guiso y cebolla cabezona | Ingreso 4:00–5:00 (sector granos B1–B10, B16, B17, B35; B29–30, B81–82; B31–32; B11, B12). Papa en B13–15 y B18–20: ingreso 20:00, venta de 20:00 a 3:00. B21, B23, B24: ingreso 12:00 | ídem | alta |
| Ingreso de hortalizas, cebolla larga, zanahoria, papa criolla, arveja, yuca, arracacha y mazorca | Ingreso 15:00–19:00; venta de 19:30 a 0:40. B-22 Sur: ingreso 19:00, venta de 1:00 a 4:00 | ídem | alta |
| Horarios de comercialización en 2012 | 5:00–14:00: frutas, hortalizas, plátano, granos y procesados. 14:00–22:00: hortalizas. 20:00–4:00: frutas, hortalizas, tubérculos y raíces | DANE 2012, Tabla 1 | media |
| Compradores mayoristas | Llegan sobre todo entre 1:00 y 2:00 | Prensa (alerta.com.co) | baja |
| Restricción distrital a la carga | Vehículos de más de 8.500 kg en la **Zona 1**: lunes a viernes de 6:00 a 8:00 y de 17:00 a 20:00 (art. 487). Vehículos de más de 20 años: mismas franjas y sábados de 5:00 a 21:00 (art. 489). La V-7 residencial no admite más de 2 ejes (art. 491) | Decreto 652 de 2025, arts. 485-502, resumen de la SDM | alta en las franjas; **no verificado si Corabastos queda dentro de la Zona 1** |
| Perfil horario de camiones en los cordones de Bogotá | Crece desde las 0:00; pico entre 5:30 y 6:30 antes de la restricción; caída; meseta de 9:45 a 13:15; máximo entre 15:00 y 16:00 | SDM 2020, Etapa V, p. 23 | media |

**Perfil propio de llegada de toneladas.** No hay un perfil horario observado de llegadas a Corabastos (vacío de información). Como aproximación se cruzan los horarios oficiales por bodega (página «Horarios») con la mezcla de grupos de SIPSA 2025. Dentro de los tubérculos se usan las proporciones de la demanda ACIDC 2022: papa 54 %, criolla + yuca + arracacha 31 %, plátano 15 %.

| Franja de ingreso | Qué llega | Parte de las toneladas (cálculo) |
|---|---|---|
| 12:00–20:00 | Hortalizas y verduras (35,9 %) más criolla, yuca y arracacha (28,0 % × 0,31) | **44,6 %** |
| 20:00–24:00 | Papa negra (28,0 % × 0,54) | **15,1 %** |
| 04:00–06:00 | Frutas (27,1 %), plátano (28,0 % × 0,15) y granos o procesados (8,9 %) | **40,2 %** |

La salida de compradores y tenderos se concentra entre 1:00 y 6:00, y la venta sigue hasta las 18:00. El `PAR.MADR.com = 0,75` (2:00–6:00) del modelo es plausible, pero sigue siendo [SUP]: no hay conteo publicado.

---

## 4. Capacidad de Corabastos

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Área total | 420.000 m² (**42 ha**): 59 % vías y 137.000 m² construidos | SDDE-FAO 2018 (DTS logística, p. 46); Corabastos, Informe de gestión 2016, p. 14 | alta |
| Bodegas | 57 bodegas de venta y almacenaje según Corabastos (web, citado en 2018). En 2012 el DANE contaba 32: 6 de tipo 1 (≈400 m², hasta 100 t) y 26 de tipo 2 (≈225 m², hasta 50 t) | DTS logística, p. 46; DANE 2012, p. 1 | media (las dos cifras no son comparables: conteos distintos) |
| Almacenamiento estático en las 32 bodegas de 2012 | 6 × 100 + 26 × 50 = **1.900 t** | cálculo propio con los datos del DANE 2012 | baja |
| Comerciantes | ≈6.000 arrendatarios | DANE 2012 | media |
| Intensidad frente a otras centrales | **333 t/ha/día** (Mercamadrid 30,9; Rungis 20,1; CEDA México 80,7). **310 veh/ha** (Mercamadrid 77; CEDA 159). 4,3 visitantes/ha | SDDE-FAO 2018, Tabla 11 (DTS logística, p. 48) | media |
| Diagnóstico de saturación | Con una ocupación del 100 %, la capacidad instalada «debió incrementarse a partir de 2018», y con 95 % desde 2019; con 80–90 % no requeriría obras hasta 2022. Concluye que hay que ampliar la central o crear centrales satélite. También señala la «limitada capacidad de mercados de distribución mayorista para la manipulación de una creciente cantidad de alimentos… posibilidades de expansión reducidas» | SDDE-FAO 2018 (DTS logística, pp. 14 y 47-49) | media |
| Punta mensual observada en 2025 | Julio: 6.839 t/día, **+5,9 %** sobre el promedio anual | SIPSA 2025, cálculo propio | alta |
| Residuos | ≈100 t/día (DANE 2012). En 2017: 80,4 t/día de orgánicos (≈6 % del ingreso), de los que se recuperan 1,53 t/día | DANE 2012; SDDE-FAO 2018 | media |
| Patios y parqueo de camiones | **No se encontró** el número de cupos | — | vacío |

**Cómo traducir esto a `coraTope`.** El modelo hace `tope = demanda_hoy × (1 + coraTope)`. Hay tres bases para fijarlo:

1. La punta mensual que ya alcanza la central: **+6 %** sobre el promedio.
2. La holgura que implica la ocupación del escenario SDDE-FAO: 1/0,9 − 1 = **+11 %** con 90 %, y 1/0,8 − 1 = **+25 %** con 80 %.
3. La meseta de 2018–2025, que dice que la central no ha crecido en 7 años.

Un valor central defendible es **+11 %** (ocupación del 90 %), con un rango de 5 % a 25 %. El 22 % actual está dentro del rango, pero en el lado holgado.

---

## 5. Demanda de alimentos

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Consumo de alimentos de Bogotá en 2020 | **2.880.034 t/año** para 7.743.955 hab | Plan de Abastecimiento Alimentario de la RAPE Región Central, Tabla 3 del DTS de comercialización (Gobernación de Cundinamarca, 2022), p. 11 | media |
| Per cápita total | 2.880.034 / 7.743.955 = 0,372 t/año = **1,02 kg/hab/día** | cálculo propio | media |
| Demanda agropecuaria de Bogotá (subconjunto Pareto del 80 %) | 1.313.784 t/año, es decir 0,45 kg/hab/día. Composición regional: frutas 33,0 %, verduras 23,3 %, tubérculos y plátano 18,3 %, cárnicos 15,7 %, lácteos 8,2 %, huevo 1,5 % | ACIDC 2022, en el DTS de comercialización, pp. 9-10 | media |
| Frescos que Corabastos deja en la ciudad | 6.460 × 0,85 = 5.491 t/día. Entre los 7,93 M hab de Bogotá: **0,69 kg/hab/día**. Entre los ≈8,97 M hab de Bogotá más conurbados: **0,61 kg/hab/día** | cálculo propio (SIPSA 2025; Corabastos 85 %; poblaciones SED 2024 y RAPE 2020) | baja-media |
| Población de Kennedy, DANE-SDP con ajuste COVID | 2024: **1.078.895**; 2025: 1.080.598; **2026: 1.080.742**; 2027: 1.080.037; 2028: 1.078.789 (13,6 % de Bogotá) | SED, Boletín estadístico Localidad Kennedy 2024, Tabla 2 (proyecciones DANE-SDP, CNPV 2018 ajustado por efecto Covid) | alta |
| Población de Kennedy, DANE sin ajuste | 2012: 992.398; 2017: 1.009.665; 2022: 1.034.283; 2024: 1.037.929 | SDS, ASIS Kennedy 2024 (Observatorio de Salud de Bogotá) | alta |
| Crecimiento | 2017–2022: +0,48 %/año (DANE). 2020–2024: +0,75 %/año (SDP ajustada). **2024–2028: ≈0,0 %/año** (SDP ajustada). Crecimiento natural en 2022: 4 por mil | cálculos propios sobre las fuentes anteriores | alta |
| Demanda de Kennedy, todos los alimentos | 1.080.742 × 1,02 = **≈1.100 t/día** | estimación propia | media-baja |
| Demanda de Kennedy de frescos vía Corabastos | 1.080.742 × 0,61–0,69 = **≈660–750 t/día** (valor central 0,65 kg, es decir ≈700 t/día) | estimación propia | baja-media |
| Hoy en el modelo | 1.034.000 × 0,4 = 414 t/día | `POB_K × KG_PERS` | — |

**Lectura.** El 1,6 %/año del deslizador del par 01 no tiene respaldo en las proyecciones oficiales: Kennedy está estancada en ≈1,08 M de habitantes hasta 2028. Para que la prueba de estrés tenga sentido, la presión debe venir explícitamente de otras fuentes:

- la densificación y los planes parciales (el Plan Parcial Bavaria suma ≈14.300 viviendas);
- el crecimiento de la región que también compra en Corabastos: Soacha, Mosquera y otros;
- el estancamiento de la oferta de la central.

Se propone mostrar el deslizador como «crecimiento de la demanda» con valor por defecto **0,5 %/año** (tendencia DANE 2017–2022) y dejar hasta 2–3 %/año como escenario de estrés declarado.

---

## 6. Alternativas: plazas, mercados y nodos

| Lugar | Localidad | Dirección | Área | Puestos (ocupados) | Volumen | Fuente | Confianza |
|---|---|---|---|---|---|---|---|
| PDM Kennedy | Kennedy | Calle 42 Sur #78M-50 | 2.296,65 m² | 215 (131; 61 %) | ≈17 t/día (estimación: 131 × 0,13 t/puesto) | Contraloría de Bogotá 2025, p. 25; IPES. Renovada en nov-2024 por más de $1.500 millones | media (volumen baja) |
| PDM Trinidad Galán | Puente Aranda (vecina) | Cra 60 #5-00 | 3.679,8 m² | 185 (134; 72 %) | ≈17 t/día (estimación) | Contraloría 2025, pp. 24-25 | media (volumen baja) |
| PDM Las Ferias | Engativá | — | 4.852,16 m² | 251 | — | Contraloría 2025 | media |
| Las 19 PDM del IPES | 12 localidades | — | — | 3.637 (2.632; 72 %) | **10.163–10.629 t/mes en 2024, ≈340 t/día** | Contraloría 2025, pp. 25 y 33-34 (IPES 2024) | media-alta |
| Paloquemao (mayorista-plaza) | Los Mártires | — | — | — | 3.730 t/mes (dic-2025), ≈120 t/día; 1.859 veh/mes | SIPSA dic-2025 | alta |
| Plaza Samper Mendoza | Los Mártires | — | 7.378 m² | — | 2.837 t/mes (dic-2025), ≈92 t/día | SIPSA; Contraloría | alta |
| Plaza Las Flores | — | — | — | — | 4.411 t/mes (dic-2025), ≈142 t/día | SIPSA | alta |

**Rendimiento por puesto (estimación propia).** Las PDM mueven 10.400 t/mes. Entre 30,4 días y 2.632 puestos ocupados, salen **≈0,13 t/puesto/día** (130 kg). Este promedio incluye puestos de comidas y misceláneos, así que el de los puestos de fruver sería mayor. El modelo usa 60 kg/puesto (mercado de barrio: 2.400 kg con 40 puestos) y 86 kg/puesto (plazoleta: 9.600 kg con 112 puestos). Son valores **conservadores y del mismo orden** que el dato observado.

**Escala de la red de la propuesta.**

- `CAP_RED_TDIA` ≈ 132 t/día para 35 mercados equivale a ≈0,4 veces todas las PDM de Bogotá. Es plausible.
- El valor del par 01, **600 t/día (máximo 900)**, es **1,8 veces todo el sistema distrital de plazas** y más del 80 % de la demanda estimada de frescos de Kennedy. Es difícil de defender como valor por defecto.

**Mercados campesinos y plataformas del PMASAB.** El Decreto 315 de 2006 (PMASAB) definió nodos logísticos urbanos; la fuente confirmada nombra **Usme** y **Corabastos**. No se encontraron cifras de volumen de los mercados campesinos ni de nodos operando en Kennedy (vacío).

---

## Parámetros propuestos para el modelo

| Parámetro (archivo:línea) | Actual | Propuesto | Fuente o derivación | Confianza |
|---|---|---|---|---|
| `POB_K` (sim_vida.js:24, viajes_mercados.js:28) | 1.034.000 | **1.080.742** (2026, DANE-SDP con ajuste COVID); 1.037.929 si se prefiere la serie DANE sin ajuste | SED 2024, Tabla 2; SDS ASIS 2024 | alta |
| `SUP.KG_PERS` (sim_vida.js:53) | 0,4 «OMS» | **0,65 kg/hab/día** de frescos vía Corabastos (rango 0,61–0,69). Si se mantiene 0,4, rotularlo «mínimo OMS de frutas y verduras, sin papa» y no como consumo | SIPSA 2025 × 0,85 / población (§5) | baja-media |
| Demanda total (texto o UI) | — | 1,02 kg/hab/día, ≈1.100 t/día en Kennedy | RAPE 2020 | media |
| `coraTope` (simulaciones12.js:323) | 22 % (rango 0–60) | **11 %** (rango 5–25); y alinear el respaldo de la línea 603 (15) con el deslizador | SDDE-FAO 2018 (ocupación 80–100 %); punta SIPSA +5,9 % | media |
| `SUP.HOLGURA` (sim_vida.js:54) | 0,10 | 0,06: la punta mensual observada sobre el promedio es 5,9 % | SIPSA 2025 | media |
| `pobCrece` en el par 01 (simulaciones12.js:324) | 1,6 %/año | **0,5 %/año** por defecto (rango −0,5 a 3, con «estrés» como etiqueta); la SDP 2024–2028 da ≈0 % | DANE/SDS 2017–2022; SED 2024 | alta |
| `P1.capAcopio` en el par 01 (simulaciones12.js:324) | 600 (máx. 900) t/día | **≈130–200 t/día** por defecto (máx. 340 = todas las PDM de Bogotá) | Contraloría/IPES 2024 | media |
| `CAP` por puesto (mercados_red.js:61) | 60–86 kg/puesto/día | Se mantiene; citar las ≈130 kg/puesto/día de las PDM como techo observado | Contraloría/IPES 2024 | media |
| Vehículos de abastecimiento hoy | (no existe) | **1.040 veh/día**: 950 pesados y 90 livianos; 6,21 t/veh | SIPSA 2025 | alta |
| Mezcla de camiones (viajes_mercados.js / vehiculos.js) | furgón, estacas, carro (visual) | C2P 84 %, C2G 10 %, C3 3 %, ≥C4 3 % de los camiones; ≈40 % de los viajes de abastecimiento del nodo en medios alternativos | SDM 2020 | media |
| Vehículos totales/día a Corabastos | (no existe) | ≈11.500 (todos los tipos) | Corabastos-Covial 2016; prensa 2025 | media |
| Franjas de ingreso de carga | (no existe) | 12–20 h: 44,6 %; 20–24 h: 15,1 %; 4–6 h: 40,2 % de las t | Horarios de Corabastos × grupos SIPSA (§3) | baja |
| `PAR.MADR.com` (viajes_mercados.js:31) | 0,75 | Se mantiene [SUP]; la venta abre a la 1:00 y los mayoristas llegan entre 1:00 y 2:00 | Corabastos, Horarios | baja |
| Aviso del 94 % (simulaciones12.js:1256) | «94 % de lo que se vende en Bogotá» | «94 % de lo que entra a las centrales mayoristas de Bogotá; ≈la mitad de todo lo que entra a la ciudad» | SIPSA; DTS 2022 | alta / baja |
| `BASURA_SUP.CORA_T` (simulaciones12.js:181) | 100 t/día | Se mantiene; añadir las citas DANE 2012 (≈100 t/día) y SDDE-FAO 2018 (80,4 t/día orgánicos) | — | media |
| `PAR.CAP_BAV` (viajes_mercados.js:44) | 80 t/día | Se mantiene, pero comparar: es ≈0,7 veces Paloquemao (≈120 t/día) | SIPSA | baja |

---

## Supuestos y límites

1. **Qué cubre SIPSA_A.** Mide los alimentos de su canasta que entran a cada mercado, con muestreo no probabilístico (ficha metodológica del anexo). Sub-registra carnes, abarrotes e industria que llegan por otros canales. Por eso las 6.460 t/día son un piso del movimiento real de alimentos de Corabastos, y la diferencia con las 10.500–14.000 t/día que declara la central no se puede resolver con datos públicos.
2. **Vehículos SIPSA frente a vehículos Covial.** Los ≈1.040 vehículos/día de SIPSA son los de abastecimiento con producto. Los ≈11.500/día de Covial incluyen compradores, autos y motos.
3. **Carga útil por tipo.** Es supuesta, calibrada para reproducir las t/veh observadas. La mezcla de camiones viene de **dos horas de aforo diurno** (SDM 2020) y puede no representar la madrugada.
4. **Zona 1.** No se verificó con el mapa oficial si Corabastos está dentro de la Zona 1 de restricción de carga del Decreto 652 de 2025.
5. **Proyección de población.** Hay dos series oficiales, DANE sin ajuste (1,038 M en 2024) y DANE-SDP ajustada por COVID (1,079 M en 2024). La diferencia es del 4 %. Usar una y decirlo.
6. **Per cápita de frescos.** Reparte lo que Corabastos deja en la ciudad entre toda la población servida. Supone que Kennedy compra como el promedio y no separa lo que llega por supermercados con centros de distribución propios.
7. **«Tope» de Corabastos.** No existe una cifra oficial de capacidad máxima en t/día. El tope se infiere de la saturación espacial (SDDE-FAO 2018), la meseta 2018–2025 y la punta mensual. Es una **inferencia**, y en la sustentación debe presentarse así.
8. **Volumen de las plazas por puesto.** Es un promedio de las 19 PDM. No hay volumen publicado por plaza: los ≈17 t/día de la PDM Kennedy son una estimación.
9. **Vacíos.** No se encontraron:
   - un perfil horario observado de llegadas a Corabastos;
   - los cupos de patio o parqueo de camiones;
   - el número actual de comerciantes;
   - el volumen de los mercados campesinos;
   - la ubicación y operación de nodos o plataformas del PMASAB en Kennedy;
   - las coordenadas oficiales de las plazas. Se pueden sacar del conjunto de datos «Plazas de Mercado Distritales» de Datos Abiertos Bogotá.

---

## Bibliografía

Alcaldía Mayor de Bogotá. (2006). *Decreto 315 de 2006, por el cual se adopta el Plan Maestro de Abastecimiento de Alimentos y Seguridad Alimentaria para Bogotá*. https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=21063

Alcaldía Mayor de Bogotá. (2024, 2 de noviembre). *Distrito renueva la Plaza Distrital de Mercado Kennedy de Bogotá*. https://bogota.gov.co/mi-ciudad/desarrollo-economico/distrito-renueva-la-plaza-distrital-de-mercado-kennedy-de-bogota

Contraloría de Bogotá. (2025). *Informe: situación de las plazas de mercado en Bogotá D.C.* https://www.contraloriabogota.gov.co/sites/default/files/2025-05/Informe%20situaci%C3%B3n%20plazas%20de%20mercado%20en%20Bogot%C3%A1%20D,C.pdf

Corporación de Abastos de Bogotá – Corabastos. (2013). *Informe de gestión 2012*. https://corabastos.com.co/sites/default/files/2020-07/0i3Informe_2013.pdf

Corporación de Abastos de Bogotá – Corabastos. (2017). *Informe de gestión 2016: «Moderna, eficiente y competitiva»*. https://www.corabastos.com.co/sites/default/files/2020-07/InformedeGestionGerencia2016.pdf

Corporación de Abastos de Bogotá – Corabastos. (2019). *Informe de gestión 2018*. https://www.corabastos.com.co/sites/default/files/2020-07/InformeGestion2018.pdf

Corporación de Abastos de Bogotá – Corabastos. (2026a). *Horarios*. Recuperado el 25 de noviembre de 2026, de https://corabastos.com.co/horarios/

Corporación de Abastos de Bogotá – Corabastos. (2026b). *Anexo 3: Estudios previos (30 de junio de 2026)*. https://corabastos.com.co/wp-content/uploads/2026/06/ANEXO-3-ESTUDIOS_PREVIOS_30-JUN_-V.F.pdf

Departamento Administrativo Nacional de Estadística – DANE. (2012). *Boletín trimestral Abastecimiento de alimentos n.º 1: Características de las instalaciones y el abastecimiento en Corabastos (julio a septiembre de 2012)*. https://www.dane.gov.co/files/investigaciones/agropecuario/sipsa/bol_abas_jul_sep12.pdf

Departamento Administrativo Nacional de Estadística – DANE. (2025–2026). *SIPSA – Componente Abastecimiento de Alimentos (SIPSA_A): boletines técnicos y anexos, enero a diciembre de 2025*. Por ejemplo, https://www.dane.gov.co/files/operaciones/SIPSA/bol-SIPSAabastecimiento-dic2025.pdf y https://www.dane.gov.co/files/operaciones/SIPSA/anex-SIPSAabastecimiento-dic2025.xlsx. Los anexos de mayo a julio usan el prefijo `anex-SIPSAbastecimiento-`.

El Nuevo Siglo. (2025, 16 de julio). *Más de 11.500 toneladas de comida llegan a diario a Corabastos, Bogotá*. https://www.elnuevosiglo.com.co/nacion/mas-de-11500-toneladas-de-comida-llegan-diario-corabastos

Gobernación de Cundinamarca, Secretaría de Integración Regional. (2022). *Documento técnico de soporte: identificación del hecho metropolitano logística y distribución de alimentos* [Región Metropolitana Bogotá-Cundinamarca]. https://regionmetropolitana.gov.co/sites/default/files/archivos/publicaciones/2024-12-24/4.-identificacin.-logstica-y-distribucin-de-alimentos.pdf

Gobernación de Cundinamarca. (2022). *Documento técnico de soporte: identificación del hecho comercialización agropecuaria y productiva* [Región Metropolitana Bogotá-Cundinamarca]. https://regionmetropolitana.gov.co/sites/default/files/archivos/publicaciones/2024-12-24/1.-identificacin.-abastecimiento-y-comercializacin-agropecuaria.pdf

Ministerio de Transporte. (2004). *Resolución 4100 de 2004, por la cual se adoptan los límites de pesos y dimensiones en los vehículos de transporte terrestre automotor de carga* (art. 8 modificado por la Res. 1782 de 2009). https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=15600

Región Metropolitana Bogotá-Cundinamarca. (2025). *Informe de seguimiento: Observatorio de Dinámicas Metropolitanas y Regionales, seguridad alimentaria*. https://regionmetropolitana.gov.co/sites/default/files/archivos/publicaciones/2025-02-06/informe-seguridad-alimentaria.pdf

Secretaría de Educación del Distrito. (2024). *Boletín estadístico Localidad Kennedy 2024*. https://www.educacionbogota.edu.co/portal_institucional/sites/default/files/inline-files/2022/08%20Boleti%CC%81n%20Kennedy%202024.pdf

Secretaría Distrital de Movilidad – SDM. (2020). *Caracterizar el transporte de carga en Bogotá y los municipios aledaños, Contrato 2019-1816: Etapa V, Volumen y encuesta origen-destino*. https://www.simur.gov.co/sites/simur.gov.co/files/2024-12-24/biblioteca/20241224-919-737.pdf

Secretaría Distrital de Movilidad – SDM. (2020). *Caracterizar el transporte de carga en Bogotá y los municipios aledaños: Etapa VI, Resumen ejecutivo de resultados*. https://observatorio.movilidadbogota.gov.co/sites/default/files/2025-09/Resumen%20ejecutivo%20de%20resultados%20Caracterizaci%C3%B3n%20de%20carga.pdf

Secretaría Distrital de Movilidad – SDM. (s. f.). *¿Cuáles son las áreas y horarios de restricción de circulación de vehículos de transporte de carga en el Distrito Capital?* (Decreto 652 de 2025, arts. 485-502). https://www.movilidadbogota.gov.co/preguntas-frecuentes/cuales-son-las-areas-y-horarios-de-restriccion-de-circulacion-de-vehiculos-de

Secretaría Distrital de Salud – Observatorio de Salud de Bogotá. (2025). *Análisis de condiciones, calidad de vida, salud y enfermedad (ASIS): Localidad Kennedy 2024*. https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2026/01/8.-ASIS_Kennedy_2024.pdf

SDDE y FAO. (2018). *Línea base para la reformulación del Plan Maestro de Abastecimiento de Alimentos de Bogotá de acuerdo con las dimensiones de Seguridad Alimentaria y Nutricional* (citado en Gobernación de Cundinamarca, 2022; no se consultó el original).
