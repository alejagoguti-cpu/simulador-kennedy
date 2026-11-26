# Fuentes: bodegas de Corabastos, comida que llega a Kennedy, residuos, La Vaca y tráfico

Dossier para el rediseño de la simulación 01 (`docs/sim01_abastecimiento_v2.md`). Compilado el 26-nov-2026. Amplía `docs/fuentes_abastecimiento.md` y no repite lo que ese documento ya estableció: SIPSA 2025, 42 ha, 57 bodegas, demanda de Kennedy de unas 700 t/día y tope relativo del 11 %. Los datos para el código están en `data3d/bodegas_residuos_fuentes.json`.

Niveles de confianza:
- **alta**: dato oficial leído en el documento.
- **media**: fuente oficial secundaria, nota de prensa de una entidad o estudio contratado.
- **baja**: cálculo propio o supuesto, marcado [SUP].

---

## 1. Bodegas de Corabastos

### 1.1 Numeración y producto por bodega

| Dato | Valor | Año | Fuente | Confianza |
|---|---|---|---|---|
| Plano esquemático numerado (Figura 1) | Bodegas 1–26, 29 y 30, Aguacate, Bodega Popular, cuartos fríos, zona Martillo y puertas P1–P9 | 2012 | DANE, *Boletín trimestral Abastecimiento n.º 1*, p. 2 | alta |
| Granos y procesados | Bodegas 1–10; la 17 vende además insumos agrícolas | 2012 | DANE 2012, p. 3 | alta |
| Yuca, plátano y arracacha | 11 y 22 | 2012 | ídem | alta |
| Hortalizas y verduras (berenjena, tomate, cohombro, arveja, haba, zanahoria, cebolla larga, pimentón) | 12, 21, 23, 24 y 26 | 2012 | ídem | alta |
| Papa | 13, 14, 19 y 20. Papa y verduras: 15 y 18 | 2012 | ídem | alta |
| Frutas | 29 y 30 | 2012 | ídem | alta |
| «Aguacate» (aguacate, banano y plátano) | 31 y 32 | 2012 | ídem | alta |
| Bodega Popular | Minorista con todo tipo de productos | 2012 | ídem | alta |
| Sector granos según los horarios actuales | B1–B10, B16, B17 y B35. Frutas: B29, B30, B81 y B82. Papa: B13–15 y B18–20. Hortalizas: B21, B24, B25, B26, B11 y B22 Sur | 2026 | Corabastos, página *Horarios* | alta |
| B35 «Fomeque» | Sobre el lindero sur, pegada al humedal La Vaca. La alameda pasa «entre la Bodega 35 Fomeque y las Bodegas 17 y 5» | 2024 | SDP, Res. 1888 de 2024 (PRM Corabastos), pp. 9-10 y 38-39 de la resolución, en la Gaceta 1017 | alta |
| Códigos de bodega vigentes | 69 códigos: 1–27, 29–50, 55, 60–63, 70, 75, 76, 78, 79, 81–89 y 98 | 2024 | Corabastos, *Listado definitivo de representantes de bodega 2024-2025* | alta |
| Zonas de mayor generación de residuos | Zona de frutas y verduras al noroccidente, que incluye la Gran Bodega; lácteos y carnes en la zona de fríos | 2020 | Corabastos/Acosta Irreño, presentación PRyM, diapositiva 18 | media |

### 1.2 Áreas y capacidad física

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Área bruta | 422.747,65 m² | Res. SDP 1888/2024, cuadro de áreas (p. 26 de la resolución) | alta |
| Predios | Mercado Libre 35.128 m²; Bodega Reina 13.581 m²; Bodegas 1-2-3-4 20.711 m²; Lote 2 restante 333.726 m² | ídem | alta |
| Área ocupada por construcciones | **126.600 m²** (índice de ocupación 0,30). Propuesta: **144.147 m²** (0,34), es decir **+13,9 %** | PRyM 2020, diapositivas 51-52 | media |
| Bodegas tipo 1 | Área promedio de 400 m² y hasta 100 t (2.000 bultos de 50 kg). Predomina la papa. Densidad **0,25 t/m²** | DANE 2012, p. 1 | alta (dato) / baja (densidad, derivada) |
| Bodegas tipo 2 sin subdividir | 225 m² y hasta 50 t en bultos de 50 kg. Densidad **0,222 t/m²** | DANE 2012, pp. 1-2 | alta / baja |
| Bodegas tipo 2 con canastillas | Tomate o mango en canastillas de 25 kg: 37,5 t (**0,167 t/m²**). Fresa en canastillas de 10 kg: 15 t (0,067 t/m²) | DANE 2012, p. 2 | alta / baja |
| Cuartos fríos | Estibas de 60 cajas de 10 kg, unos 20 sitios por bodega: de 20 a 36 t | DANE 2012, p. 2 | alta |
| Naves del modelo | 37 naves que suman 80.555 m² de huella, el 64 % de lo construido según el PRyM | cálculo propio con `data3d/corabastos.json` (L×W) | alta |

**Ojo con las áreas del DANE.** Los «400 m²» y «225 m²» del DANE no pueden ser la nave completa, que en el modelo mide ~92 × 22 m ≈ 2.000 m². Corresponden a la unidad de bodega o local. Por eso se usan solo como **densidad** (t/m²).

### 1.3 Correspondencia con `data3d/corabastos.json`

Las naves del JSON no tienen identificador; se identifican por su índice en `naves`. Para asignar números se compararon las 5 columnas y las filas del plano DANE 2012 (Figura 1) con los centros de las naves:

| Columna (de oeste a este) | Plano DANE, de norte a sur | Índices de nave en el modelo |
|---|---|---|
| A | 29 (ancha, ocupa A y B), 25, 24, 23, 26 | 32 y 0 (B29), 16, 10, 25, 6 |
| B | 22, 21, 20, 19, 18 | 17, 11, 26, 23, 14 |
| C | 30 (ancha), 11, 12, 13, 14, 15, 16, 17 | 20, 18, 12, 4, 8, 15, 2, 30 |
| D | 10, 9, 8, 7, 6, 5 | 22, 21, 27, 7, 3, 29 |
| E | 1, 2, 3, 4 | 35, 36, 34, 28 |
| Otras | Aguacate (31-32) al oeste; Bodega Popular/Gran Bodega al norte; cuartos fríos al nororiente; servicios (Martillo, bancos, administración) al oriente | 24; 1 y 33; 31; 5, 9, 13 y 19 |

El conteo coincide en cada columna (5, 6, 8, 6 y 4 naves) y las filas quedan alineadas.

**Validación independiente.** La Res. 1888/2024 dice que la bodega 35 está junto a La Vaca, entre ella y las **bodegas 17 y 5**. En el modelo esas son las naves 30 y 29, a 53 m y 51 m del humedal (`dh`). Confianza del mapeo: **media**. La Gran Bodega o Bodega Popular (naves 1 y 33) podría ser hoy la B81/B82 de frutas, que aparece en *Horarios*; no se pudo confirmar (baja).

### 1.4 Recibo diario por bodega

Método: se toman las toneladas de 2025 por grupo (SIPSA): verduras 2.321,8 t/día, tubérculos 1.811,9, frutas 1.753,9 y otros 572,6. Los tubérculos se reparten en papa 54 %, criolla+yuca+arracacha 31 % y plátano 15 % (ACIDC 2022). Cada grupo se reparte **por área** entre las naves que lo manejan:

- Las bodegas 15 y 18 cuentan la mitad de su área como papa y la mitad como verdura.
- La Gran Bodega se reparte entre verduras y frutas en proporción a su tonelaje (57/43).
- El plátano se reparte entre las bodegas 11/22 y Aguacate.
- «Otros» (granos, procesados, cárnicos, lácteos) va a las bodegas de granos.

**Tope**: `área × densidad DANE`. **Ocupación en el pico**: `recibo × permanencia / tope`. Para los frescos la permanencia es de 1 día: según *Horarios*, llegan entre las 15:00 y las 20:00 (hortalizas, papa) o a las 4:00 (frutas) y se venden en la misma jornada. Para granos se usan 7 días [SUP].

| Nave (idx) | Bodega | Grupo | Área m² | Recibe t/día | Tope t | Ocupación 2025 | Crecimiento hasta llenarse |
|---|---|---|---|---|---|---|---|
| 24 | Aguacate (31-32) | aguacate, banano y plátano | 816 | 125,1 | 136 | 0,92 | **+8,7 %** |
| 18 | B11 | raíces y plátano | 2.013 | 391,9 | 447 | 0,88 | +14,0 % |
| 17 | B22 | raíces y plátano | 2.034 | 396,0 | 452 | 0,88 | +14,2 % |
| 6, 10, 11, 12, 16, 25 | B26, B24, B21, B12, B25, B23 | hortalizas | ≈2.000 c/u | 249–263 | 330–348 | 0,75 | +32,6 % |
| 2, 3, 7, 21, 22, 27, 28, 29, 30, 34, 35, 36 | B16, B6, B7, B9, B10, B8, B4, B5, B17, B3, B1, B2 | granos y otros | ≈2.000 c/u | 46–50 | 442–473 | 0,73 | +36 % |
| 1, 33 | Gran Bodega / Popular | frutas y verduras (mixto) | 6.076 / 1.365 | 690,4 / 155,1 | 1.015 / 228 | 0,68 | +47 % |
| 0, 32, 20, 31 | B29 (dos naves), B30, cuartos fríos | frutas | 4.453 / 3.752 / 4.112 / 1.664 | 433,9 / 365,6 / 400,7 / 162,1 | 744 / 627 / 687 / 278 | 0,58 | +71,5 % |
| 14, 15 | B18, B15 | papa y verduras | 2.081 / 2.002 | 232,8 / 223,9 | 434 / 417 | 0,54 | +86 % |
| 4, 8, 23, 26 | B13, B14, B19, B20 | papa | ≈1.990 | 193–196 | 493–501 | 0,39 | +156 % |
| 5, 9, 13, 19 | servicios | no alimentario | — | — | — | — | — |

Totales: **6.460 t/día** y 14.944 t de tope. La ocupación global es de 0,66.

**Control de coherencia.** La primera bodega se llena con +8,7 % y las de raíces con +14 %. Eso coincide con el tope relativo central del 11 % (rango 5–25 %) del dossier anterior. Corabastos no tiene datos por bodega: el reparto es **baja**.

---

## 2. Comida que llega a Kennedy

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Medición oficial de t/día que entran a la localidad 8 | **No existe** (no se encontró en SDDE, PMASAB ni DANE) | — | vacío |
| Comida que llega, todos los canales | 1.080.742 × 1,02 kg/hab/día = **≈1.100 t/día** | RAPE 2020 y SED 2024 (ver dossier anterior) | media |
| Vía Corabastos | 6.460 × 0,85 = 5.491 t/día. Repartido entre 7,93 M habitantes: × 0,1363 = **748**. Entre 8,97 M (con municipios vecinos): **662**. Valor central **700 t/día** | cálculo propio | baja |
| Otros canales (supermercados con centro de distribución propio, plazas, mercados campesinos) | 1.100 − 700 = **≈400 t/día**. Corabastos tendría el 64 % (rango 52–68 %; el 52 % es su parte de todo lo que entra a Bogotá) | cálculo propio | baja |
| Canal de compra de los hogares | Tienda de barrio 29 % y supermercado 23 % como lugar preferido en Bogotá (Fenalco, año no indicado) | CLADEA, citado por buscador; no verificado | baja |

**Regla propuesta.** `comida_llega(t) = 1.100 × min(1, oferta(t)/demanda(t))`. Hoy se supone llega = demanda. Cuando las bodegas se saturan, la parte de Corabastos (0,64) deja de crecer.

---

## 3. Residuos

| Dato | Valor | Año | Fuente | Confianza |
|---|---|---|---|---|
| Bogotá, toneladas dispuestas | 6.062,03 t/día (2023) y **6.364,12 t/día** (2024), +4,98 %. Bogotá es el 18,70 % del país | 2024 | Superservicios, *Informe Nacional de Disposición Final 2024*, pp. 23 y 28-29 | alta |
| Bogotá, generación anual | 2,29 Mt (2024) y 2,42 Mt (2025): **+5,7 %** | 2026 | UAESP, nota en bogota.gov.co (17-abr-2026) | media-alta |
| Bogotá, 1.er trimestre de 2026 | **6.769 t/día**: 5.680 del servicio ordinario y 1.089 de puntos críticos y arrojo clandestino. +5,5 % entre 2024 y 2026; 351.666 t de puntos críticos en 2025 | 2026 | UAESP (bogota.gov.co; El Espectador, 17-abr-2026) | media-alta |
| Parte orgánica de lo que llega a Doña Juana | **51,3 %** | 2022 | La República (10-mar-2022), cita a UAESP y DNP | media |
| Kennedy, per cápita | 6.769 / 7,93 M = **0,854 kg/hab/día**. Solo servicio ordinario: 0,716 | 2026 | cálculo propio | baja |
| Kennedy, toneladas | 1.080.742 × 0,854 = **922 t/día**: 774 ordinarias y 148 en puntos críticos. Orgánico: 922 × 0,513 = **473 t/día** | 2026 | cálculo propio | baja |
| Corabastos | ≈100 t/día. 15 % aprovechado por recicladores y 75 % a Doña Juana. Coeficiente: 100 / 6.460 = **0,0155 t por t que entra** | 2012 / 2025 | DANE 2012, p. 2; SIPSA 2025 | media |
| Corrección al dossier anterior | Los 80,4 t/día de orgánicos de 2017 son 80,4 / 5.750 = **1,4 %** del ingreso, no «≈6 %» | — | cálculo propio | — |
| Desperdicio de alimentos | **19 %** de los alimentos disponibles para el consumidor (1.050 Mt en 2022: hogares 631, servicios de comida 290, comercio 131). Hogares: 79 kg/hab/año | 2024 | UNEP, *Food Waste Index Report 2024* (UN News, 27-mar-2024) | alta |

**Proyección propuesta.** `R(t) = 922 × 1,027^t + 0,19 × (C(t) − 1.100)` en t/día, donde C(t) es la comida que llega a Kennedy.
- 2,7 %/año es la tasa UAESP 2024–2026 (5,5 % en dos años). Para un escenario alto se usa 5,7 % (2024→2025).
- 0,19 es la parte marginal que se desperdicia de cada tonelada adicional de comida (UNEP).
- El promedio de Kennedy, residuo total sobre comida, es 922 / 1.100 = 0,84, pero incluye empaques y residuos no alimentarios. Por eso no sirve como coeficiente marginal.

---

## 4. Game over de residuos y humedal La Vaca

| Dato | Valor | Fuente | Confianza |
|---|---|---|---|
| Puntos críticos activos en Kennedy | **71**, la localidad con más puntos activos. Estrategia «4x3» para llevarlos a cero | Alcaldía de Bogotá, 5-nov-2025 | alta (71) / media (ranking, según prensa) |
| Doña Juana | No figura entre los 6 rellenos regionales con vida útil vencida a dic-2024. La UAESP plantea extenderla unos 37 años | Superservicios 2024, Tabla 8, p. 47; bogota.gov.co «37 años más de vida útil» | media |
| Área de La Vaca | Sector Norte **5,72 ha**, junto al cerramiento sur de Corabastos. Sector Sur **2,24 ha**. Total **7,96 ha** | SDA/EAAB, *Plan de Manejo Humedal La Vaca*, p. 1 | alta |
| Estado | «los humedales de Kennedy los más degradados y con mayor pérdida de extensión de toda la ciudad, especialmente el humedal de la Vaca». Todo el humedal se trata como área de recuperación | ídem, pp. 3 y 7 | alta |
| Norma | PMA aprobado por la Res. SDA 7473 de 2009 y actualizado por la Res. 2925 de 2023. El PRM de Corabastos obliga a crear una alameda y una plazoleta de 2.297,71 m² de transición con el humedal | Res. SDP 1888/2024 | alta |
| Residuos retirados del humedal | **732 t de residuos sólidos y 125 t de escombros (RCD) desde 2020**. 4.500 m² de espejo de agua recuperados; 100 árboles sembrados por la EAAB | Alcaldía de Bogotá, 20-mar-2025 | media |
| Recuperación en 2024 | 576 m² recuperados y más de 27 m³ de escombros y basura retirados | SDA, 23-sep-2024 | media |

**Umbral propuesto (game over).** La recolección ordinaria de Kennedy queda fija en 774 t/día. Lo que la excede termina en puntos críticos. Hoy esos puntos reciben 148 t/día, el 16 %, igual que en Bogotá (1.089 / 6.769). El juego termina cuando lo no recolectado se **duplica**: **296 t/día**, lo que equivale a generar 1.070 t/día (+16 %).
- Con +2,7 %/año se alcanza en ln(1,16)/ln(1,027) ≈ **5,6 años** sin propuesta.
- Solo con más comida harían falta 148 / 0,19 = 779 t/día adicionales (+71 %).
- El factor 2× es [SUP]. Doña Juana no sirve de umbral: el relleno no vence dentro del horizonte de 15 años.

**Regla de degradación de La Vaca** [SUP en la forma y en el 0,5]:
- `D = clamp((noRecolectado − 148) / (296 − 148), 0, 1)`.
- Árboles e interacciones bióticas en La Vaca = base × (1 − 0,5·D).
- Aporte de residuos al humedal = 0,45 t/día × noRecolectado/148. El 0,45 sale de 857 t / (5,2 años × 365).

Naves a menos de 120 m del humedal: 6 (B26), 24 (Aguacate), 29 (B5), 30 (B17), 14 (B18), 25 (B23), 3 (B6) y 2 (B16).

---

## 5. Tráfico

| Dato | Valor | Año | Fuente | Confianza |
|---|---|---|---|---|
| Nivel de congestión en Bogotá | **69,6 %**, +7,7 pp frente a 2024. 10 km en **31 min 45 s** (+1 min 54 s). 15,4 km/h en hora pico (−1 km/h) | 2025 | TomTom Traffic Index, Bogotá (cifras obtenidas por el buscador; la página no cargó) | media |
| 2024 (derivado) | 61,9 %; 29 min 51 s por 10 km; 16,4 km/h | 2024 | cálculo propio a partir de lo anterior | media |
| 2020 | 53 %; 3.ª ciudad del mundo | 2020 | La República (2021), TomTom 2020 (año de pandemia) | media |
| Corredores de la SDM | 14 corredores: 28,7 km/h tras el pico y placa extendido. Día típico de 2023: ≈23 km/h. Los métodos no son comparables entre sí | 2022–2023 | prensa de la SDM (bogota.gov.co, La República) | baja |
| Carga de Corabastos | 1.040 vehículos/día con 6,21 t/veh (en el dossier anterior) | 2025 | SIPSA | alta |
| Estudio de tránsito del PRM | Aprobado por la SDM (oficios SI-20212246757951 de 2021 y SI-202222405360311 de 2022). Exige maniobras dentro del predio, «sin generar colas sobre las vías». El número de cupos no se pudo extraer del PDF | 2024 | Res. 1888/2024 | alta |

**Trayectoria propuesta.**
- `nivel(t) = 0,62 + 0,033·t`, con t en años desde el inicio. Arranca en el nivel de 2024 y sube 3,3 pp/año: (69,6 − 53)/5 entre 2020 y 2025. Para un escenario alto se usan 7,7 pp/año.
- Factor de tiempo de viaje = 1 + nivel.
- Camiones de abasto = recibo total / 6,21.

---

## Parámetros propuestos para el modelo

| Parámetro | Valor | Derivación | Confianza |
|---|---|---|---|
| Recibo por bodega (37 naves) | Tabla del §1.4; JSON `bodegas[].recibe_t_dia` | SIPSA 2025 por grupo × área | baja |
| Tope por bodega | `area_m2 × densidad`: 0,25 (papa), 0,222 (bultos), 0,167 (canastilla) t/m². Total 14.944 t | DANE 2012 | baja |
| Ocupación inicial por bodega | 0,39–0,92; global 0,66 | permanencia de 1 día en frescos (Horarios), 7 días en granos [SUP] | baja |
| Ampliación física máxima (con propuesta) | +13,9 % de área construida | PRyM 2020 | media |
| Comida que llega a Kennedy | 1.100 t/día (700 vía Corabastos, 400 por otros canales) | RAPE 2020, SIPSA 2025 | media / baja |
| Residuos de Kennedy | 922 t/día (0,854 kg/hab/día); 51,3 % orgánico; crecimiento 2,7 %/año (5,7 % alto); coeficiente 0,19 t/t de comida; Corabastos 0,0155 t/t | UAESP 2026, Superservicios 2024, UNEP 2024 | baja-media |
| Game over de residuos | 296 t/día sin recolectar (generación de 1.070 t/día) | 2 × puntos críticos actuales [SUP] | baja |
| Degradación de La Vaca | D de 0 a 1; árboles e interacciones × (1 − 0,5·D); 7,96 ha | PMA La Vaca; EAAB 2025 | alta (área) / baja (regla) |
| Congestión | 0,62 + 0,033·t (alto: 0,077·t) | TomTom 2020–2025 | media / baja |

## Supuestos y límites

1. **Mapeo de naves.** Se basa en el esquema del DANE de 2012. Desde entonces hay bodegas nuevas (Reina, Fomeque B35, B81 y B82). Conviene verificarlo con Corabastos.
2. **Tonelaje por bodega.** No existe un dato oficial por bodega. El reparto por área supone igual intensidad dentro de cada grupo. SIPSA mide de forma incompleta carnes, abarrotes y lo que se vende desde los camiones y plataformas.
3. **Densidad DANE.** Viene de un local lleno a capacidad máxima y se aplica a toda la nave, pasillos incluidos. Por eso el tope está sobreestimado y la ocupación subestimada. La relación entre bodegas se mantiene.
4. **Residuos de Kennedy.** Se reparten por población desde el total de Bogotá: no se encontró una serie de toneladas por localidad (UAESP). Incluye una fracción de los residuos de grandes generadores.
5. **Umbral 2× y regla de La Vaca.** Son criterios de diseño. No hay una relación dosis-respuesta publicada entre toneladas de residuos y pérdida de árboles en el humedal.
6. **TomTom.** Mide toda la ciudad, no los corredores de Kennedy. La metodología cambió entre ediciones, así que 2020 (año de pandemia) se usa solo como referencia de tendencia.
7. **No encontrado.** Plano oficial actual de bodegas con productos; capacidad de almacenamiento por bodega; cupos de cargue y descargue; caracterización oficial reciente de residuos (contrato UAESP 501/2021); toneladas por localidad.

## Bibliografía

Alcaldía Mayor de Bogotá. (2024, 23 de septiembre). *Se recuperaron 576 metros cuadrados en la Reserva Distrital de Humedal La Vaca*. https://bogota.gov.co/en/node/221348

Alcaldía Mayor de Bogotá. (2025, 20 de marzo). *Distrito interviene y recupera el Humedal La Vaca sector sur en Kennedy*. https://bogota.gov.co/en/node/247374

Alcaldía Mayor de Bogotá. (2025, 5 de noviembre). *Nueva estrategia en Kennedy busca erradicar puntos críticos de residuos*. https://bogota.gov.co/mi-ciudad/gobierno/estrategia-en-bogota-busca-erradicar-puntos-criticos-de-residuos

Alcaldía Mayor de Bogotá – UAESP. (2026, 17 de abril). *Aumenta la producción de residuos sólidos en Bogotá: UAESP*. https://bogota.gov.co/mi-ciudad/habitat/aumenta-la-produccion-de-residuos-solidos-en-bogota-segun-uaesp

Alcaldía Mayor de Bogotá. (s. f.). *37 años más de vida útil tendrá el relleno sanitario Doña Juana*. https://bogota.gov.co/asi-vamos/obras/se-podra-extender-la-vida-util-del-relleno-dona-juana

Corporación de Abastos de Bogotá – Corabastos. (2020). *Plan de Regularización y Manejo: presentación* [Acosta Irreño & Asociados]. https://corabastos.com.co/sites/default/files/2020-09/PRyMPRESENTACION.pdf

Corporación de Abastos de Bogotá – Corabastos. (2024). *Listado definitivo representantes de bodega 2024-2025*. https://corabastos.com.co/wp-content/uploads/2024/08/Listado-de-Representantes-de-Bodega-2024-2025.pdf

Corporación de Abastos de Bogotá – Corabastos. (2026). *Horarios*. Recuperado el 26 de noviembre de 2026, de https://corabastos.com.co/horarios/

Departamento Administrativo Nacional de Estadística – DANE. (2012). *Boletín trimestral Abastecimiento de alimentos n.º 1: características de las instalaciones y el abastecimiento en Corabastos*. https://www.dane.gov.co/files/investigaciones/agropecuario/sipsa/bol_abas_jul_sep12.pdf

DANE. (2026). *SIPSA_A, anexos mensuales 2025*. https://www.dane.gov.co/files/operaciones/SIPSA/anex-SIPSAabastecimiento-dic2025.xlsx

El Espectador. (2026, 17 de abril). *Generación de basura en Bogotá creció 5,5 % entre 2024 y 2026, según reporte de la UAESP*. https://www.elespectador.com/bogota/generacion-de-basura-en-bogota-crecio-55-entre-2024-y-2026-segun-reporte-de-la-uaesp/

La República. (2021). *Bogotá es la tercera ciudad en el mundo con mayor tráfico de acuerdo con el ranking de TomTom para 2020*. https://www.larepublica.co/globoeconomia/bogota-es-la-tercera-ciudad-en-el-mundo-con-mayor-trafico-de-acuerdo-con-el-ranking-de-tomtom-para-2020-3112048

Rodríguez, D. P. (2022, 10 de marzo). Bogotá desperdicia 52 % de alimentos provenientes de residuos según estudios. *La República*. https://www.larepublica.co/responsabilidad-social/bogota-desperdicia-52-de-alimentos-provenientes-de-residuos-segun-estudios-3319085

Secretaría Distrital de Ambiente y EAAB. (2009). *Plan de Manejo Humedal La Vaca* [resumen; aprobado por la Res. SDA 7473 de 2009]. https://www.ambientebogota.gov.co/documents/10184/423705/Plan+La+Vaca.pdf/b13faa0d-55ff-4316-8a0e-6794175f6a48

Secretaría Distrital de Planeación. (2024). *Resolución 1888 del 26 de noviembre de 2024, por la cual se adopta el Plan de Regularización y Manejo de Corabastos*. Gaceta de Urbanismo y Construcción n.º 1017. https://www.sdp.gov.co/sites/default/files/gacetas/gaceta_1017_diciembre_11_2024.pdf. Plano: https://sistemas002.sdp.gov.co/sites/default/files/241126_3-2024-40325_res_1888_prm_corabastos_plano.pdf

Superintendencia de Servicios Públicos Domiciliarios. (2025). *Informe Nacional de Disposición Final de Residuos Sólidos en Colombia 2024*. https://superservicios.gov.co/sites/default/files/2025-12/Informe-Nacional-de-Disposicion-Final-de-Residuos-Solidos-en-Combia-2024.pdf

TomTom. (2026). *TomTom Traffic Index: Bogotá*. https://www.tomtom.com/traffic-index/city/bogota/

United Nations Environment Programme. (2024). *Food Waste Index Report 2024*. https://www.unep.org/resources/publication/unep-food-waste-index-report-2024. Resumen en UN News: https://news.un.org/en/node/1148036
