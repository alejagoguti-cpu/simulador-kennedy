# Fichas por obra y sistema de aguas lluvias de Bavaria (2026-11-26)

Responde a los puntos 2 y 3 de `docs/ronda_siguiente.md`. Convención: **[VER]** = respaldado por una fuente de la bibliografía que el agente leyó en el buscador (solo extractos, no los documentos completos); **[SUP]** = supuesto de diseño, de práctica general o del proyecto, sin fuente verificada aquí. El buscador no devolvió el texto de las normas ni cifras de lluvia por estación, así que las cifras clave son rangos con su supuesto declarado.

---

## A) Sistema de aguas lluvias de Bavaria

### A.1 Nombre correcto

**Sistema Urbano de Drenaje Sostenible (SUDS) de Bavaria: tren de captación y fitodepuración de aguas lluvias**, formado por jardines de lluvia y zanjas/biofiltros de captación (tipologías «menores», en calles y parques) que conducen a un **humedal artificial de flujo subsuperficial y superficial (humedal de fitodepuración)** como tipología «mayor».

Marco en Bogotá:
- La SDA y la EAAB distinguen SUDS «mayores» (los administra la EAAB) y «menores» (los administra quien tiene el espacio público o el predio privado); diseñar y aprobar un SUDS exige consultar a la EAAB y a la SDA [VER, doc. técnico SDA 2011].
- Norma técnica **NS-166** de la EAAB, «Criterios para diseño y construcción de SUDS» (2018) [VER, anexo SDP]; **Resolución Conjunta 01 de 2019 (SDA–SDP)** con lineamientos de SUDS [VER, anexo SDP]. El agente no pudo abrir el texto: la lista exacta de tipologías de NS-166 y el número de la resolución vigente (hay alguna de 2022 sin confirmar) deben verificarse en el Boletín Legal Ambiental de la SDA o en SISJUR antes de citarlos en la tesis.
- Guía nacional de SUDS del Ministerio de Vivienda (incluye «Jardín de lluvia») [VER, índice].
- Bavaria es un plan parcial (Decreto Distrital 448 de 2023): los SUDS del plan deben coordinarse con la EAAB. El humedal de fitodepuración con espejo de agua puede quedar clasificado como tipología mayor [SUP].

### A.2 Cómo funciona (en una línea por paso)

1. **Captura**: cubiertas, vías y andenes de las 22 manzanas vierten a franjas verdes.
2. **Pretratamiento**: franja filtrante, zanja de infiltración y **jardín de lluvia/biofiltro** bajo los árboles de calle y de alameda (retienen sedimento, hidrocarburos y metales; absorben el primer lavado).
3. **Conducción**: cunetas verdes y tubería al **tanque de ecualización** (el plan ya tiene `tanques` en `bavaria.json`).
4. **Fitodepuración**: humedal artificial del parque central CP-01 (tren de 6 celdas ya modelado en `humedal_bavaria3d.js`): sedimentador, eneas (Typha latifolia), juncos (Schoenoplectus californicus), celda de flotantes, laguna de pulimento y laguna de hábitat.
5. **Uso/salida**: riego de huertas, parques y árboles; rebose al sistema de drenaje.

### A.3 Componentes y plantas

| Componente | Nombre correcto | Plantas (clima de Bogotá, ~2.550 m, 14 °C) |
|---|---|---|
| Calle/alameda | Jardín de lluvia (biorretención) y zanja de infiltración con árbol | Juncus effusus, Carex spp., Cyperus (C. ligularis, C. luzulae) en el fondo; arbustos nativos de borde; árboles nativos de la propuesta. Lista final por validar con el Jardín Botánico (JBB) [SUP] |
| Pretratamiento | Franja filtrante / biofiltro | Gramíneas y ciperáceas nativas [SUP] |
| Humedal subsuperficial | Humedal artificial de flujo subsuperficial (lecho de grava) | Typha latifolia, Schoenoplectus californicus, Cyperus. Estas especies se usan en humedales de Cundinamarca y Bogotá [VER, Cogua / Escuela Colombiana / Cajicá]; Typha y Cyperus papyrus se usan en humedales subsuperficiales en Colombia [VER] |
| Humedal superficial | Humedal artificial de flujo superficial (agua libre con vegetación emergente) | Eneas, juncos y flor amarilla de orilla |
| Celda de flotantes | Pulimento con plantas flotantes | Lenteja de agua (Lemna minor) y buchón cucharita (Limnobium laevigatum), ambos nativos según el modelo. **Evitar el buchón de agua (Eichhornia crassipes)**: es invasor, solo se usa si está contenido [SUP] |
| Hábitat | Laguna de hábitat con orla | Vegetación nativa de borde para aves y polinizadores |

### A.4 Parámetros de diseño

Parámetros respaldados:
- Humedal subsuperficial piloto en Cogua (Cundinamarca): profundidad efectiva 0,6 m, tiempo de retención hidráulica (TRH) 1,6 d, celda de 2 × 5,8 m [VER, Lara y Vera 2005]. Los autores señalan que no hay un criterio único de diseño; las ecuaciones se toman de Kadlec y Wallace [VER].
- La tesis de la Escuela Colombiana de Ingeniería (Gómez Chavarro 2021) tiene un capítulo de diseño hidráulico y TRH; sus valores no se leyeron [VER, solo índice].

Parámetros usados en el modelo (todos [SUP] hasta validar con NS-166 y la tesis anterior):

| Parámetro | Valor | Nota |
|---|---|---|
| Superficie del humedal / superficie impermeable que drena | 1,03 ha de tratamiento (huella 2,04 ha) / ~42,7 ha = **2,4 %** (huella: 4,8 %) | Orden de magnitud habitual de humedales de aguas lluvias (1–5 %) [SUP, conocimiento general, no verificado] |
| Jardines de lluvia y zanjas | 5–10 % del área impermeable que drenan a cada uno [SUP]; profundidad de almacenamiento 0,15–0,30 m; infiltración con suelo preparado | Rango de guías internacionales, no verificado aquí |
| Profundidad agua libre / lecho | 0,5 m / 0,6 m | Cogua 0,6 m [VER] |
| TRH | 1,6–4 d (subsuperficial / superficial) | Cogua 1,6 d [VER]; Sagittaria 3,5 d subsuperficial y 6,7 d libre [VER, DYNA] |
| Porosidad del lecho | 0,4 | [SUP] |
| Densidad de siembra | 4–6 plantas/m² | [SUP] |

### A.5 Volumen de agua lluvia captada (estimación con cálculo)

**Lluvia en Bogotá**: el buscador no devolvió un valor IDEAM de la estación INEM Kennedy (código 21206560). Lo encontrado: Kennedy y el occidente/suroccidente están entre las zonas más secas de Bogotá [VER, El Tiempo]; humedales del sur reciben 500–800 mm/año y la región ~794 mm [VER, Ramsar]; una fuente comercial da ~1.091 mm para Bogotá [VER, climate-data.org, baja confiabilidad]. **Se usa P = 800 mm/año** (caso base) con sensibilidad 600–1.000 mm. Hay que sustituirlo por la normal IDEAM 1981–2010 de la estación INEM Kennedy.

**Datos del sitio**: predio de Bavaria = **71,2 ha** (polígono `sitio` de `data3d/bavaria.json`, fórmula de Gauss; el plan parcial `plan_bavaria.json` trae el borde del plan, que es similar).

**Cálculo (caso base)**:

| Paso | Valor |
|---|---|
| Área impermeable A_imp = 60 % × 71,2 ha [SUP: cubiertas + vías + andenes de un plan de 14.000 viviendas] | 42,7 ha = 427.000 m² |
| Coeficiente de escorrentía C = 0,85 [SUP, superficie dura] | |
| Escorrentía = C × P × A_imp = 0,85 × 0,8 m × 427.000 m² | ≈ **290.000 m³/año** |
| Eficiencia de captura 80 % (primer lavado, rebose en tormentas extremas) [SUP] | ≈ **230.000 m³/año captados** |

Rango por lluvia: 600 mm → ~170.000; 1.000 mm → ~290.000 m³/año.

**¿Alcanza el humedal para tratarlo?** Volumen útil = 0,51 ha × 0,5 m (agua libre) + 0,51 ha × 0,6 m × 0,4 (lecho) ≈ 2.550 + 1.220 ≈ 3.800 m³. Con TRH de 4 d trata ≈ 950 m³/d ≈ 347.000 m³/año si opera continuo desde el tanque de ecualización; ese tanque almacena la lluvia y la entrega despacio. La capacidad (~347.000) supera lo captado (~230.000), así que el modelo puede reportar «m³ tratados/año = m³ captados» con el tope de capacidad [SUP]. El volumen de tanque necesario no se calculó.

**Fórmula para el modelo**: `V_captado(año) = C × P × A_imp(t) × η × fase_obra(t)`, con A_imp creciente según las manzanas construidas por año (`plan_bavaria.js`), y fase del humedal (obra años 2–3, agua 3–4, plantas 3–6, como en `humedal_bavaria3d.js`).

### A.6 Beneficios de biodiversidad

- Los SUDS vegetados pueden diseñarse para polinizadores, pero la planta debe cumplir su función hidráulica [VER, MPCA Minnesota].
- Más especies de plantas y más hojarasca en cuencas de biorretención se asociaron a más biodiversidad de invertebrados (estudio de 12 cuencas) [VER, MPCA].
- La evidencia de aves es **débil**: guías prácticas dicen que las plantas nativas dan hábitat a aves y polinizadores, pero no se encontraron conteos cuantitativos; una revisión de 2025 dice que la biodiversidad de la biorretención ha recibido poca atención [VER, MPCA; MDPI 2025]. Los humedales que reciben escorrentía igualaron la biodiversidad de los que no [VER, revisión sueca citada por MPCA].
- Consecuencia para el modelo: el efecto sobre aves acuáticas y polinizadores debe presentarse como **supuesto/hipótesis**. El modelo hoy suma el humedal al corredor «Bosque de Bavaria», no a un humedal propio, y por eso no da hábitat a aves acuáticas (ver `indicadores_macromodelos.md`, obra 7). Hallazgo útil: la «ficha» debería decirlo.

### A.7 Qué hace falta para integrarlo (sin editar código aquí)

1. Agregar jardines de lluvia/biofiltros al pie de los árboles de calle de Bavaria (datos: `bavaria_arboles.json`, calles del plan). Se ven como franjas hundidas con vegetación densa y agua tras la lluvia.
2. Conectar visualmente (cauce/canal verde) las franjas con el humedal existente.
3. Contar «interacciones» de los polinizadores que usan estas plantas dentro de `evaluacion.territorio.red`, con las mismas reglas de polinización que el resto.

---

## B) Fichas por obra (pestaña Estrategias)

Plantilla de cada ficha: **Propósito** (1 línea), **Métricas** (cálculo del modelo, «con propuesta menos sin propuesta» o antes/después de la obra), **Diagrama** y **Datos del modelo**. Paleta: violeta #7d6bff, lima #c9f27a, turquesa #4fd1c5, coral #f2694a. Regla de color: lima = ganancia/bueno, coral = pérdida/riesgo, violeta = la propuesta, turquesa = agua/flujo; gris para «sin propuesta».

Método común del «aporte de cada obra»: correr el modelo con todas las obras y con una obra apagada (`OBRA_SUP` por obra) y reportar la diferencia en cada indicador (contribución marginal). Es costoso (una corrida por obra); alternativa barata: usar los ΔA y calendarios ya precalculados en `data3d/propuesta_obras.json` y repartir el cambio por área aportada. Falta confirmar con el desarrollador cuál se implementa; se recomienda la contribución marginal con la semilla fija, 8 corridas por par.

| # | Obra | Propósito (1 línea) | Métricas que reporta el modelo | Diagrama recomendado | Datos que necesita |
|---|---|---|---|---|---|
| 1 | Puente de fauna (Av. Ciudad de Cali, El Burro) | Reconectar las dos mitades del humedal El Burro y bajar atropellos | Hectáreas de hábitat sumadas (1,01 ha); atropellos evitados en el año 15; conectividad aportada (puntos %); especies que lo cruzan | Mapa mínimo con el puente como puente violeta entre dos parches y un contador de atropellos evitados (columnas coral con/sin) | `ΔA_Burro` (propuesta_obras.json), `PROP_SUP.PASO_RED` (54 %), `atropellos.porAño` con/sin, `verde.resumen.nConectados/nParches`, nodo «Puente de fauna» |
| 2 | Árboles en vías (calles verdes) | Unir parches con filas de árboles y bajar el ruido para la fauna | Árboles (11.953), km de calle (165,7), copa adulta (96 ha), pares de zonas verdes unidos (18), conectividad aportada, bienestar de la fauna (puntos %), dB mitigados, CO2 (si el modelo trae `ciclos.detalle`) | Mapa de parches con enlaces lima entre los 18 pares que se activan por año + línea de conectividad con/sin | `calles_verdes3d` info, enlaces «calle verde» y su madurez `f`, `verde.resumen`, `avesRuido.bienestarFauna`, `MITIGA_DB` |
| 3 | Árboles en bordes de humedales | Dar hábitat de borde y copa a El Burro, La Vaca y Techo | 3.770 árboles; copa por humedal (8,1 / 4,8 / 4,0 ha); ΔA de hábitat por humedal; especies clave (% vs año 1); interacciones sumadas | Tres anillos concéntricos (uno por humedal) con el área de copa que crece por año, color lima; interacciones en una barra aparte | `copaHa` y `ΔA_h` por humedal (g(dt) con e₀ 0,3 y adulto 3,5 años), `biodiversidad.areaEsp`, `evaluacion.territorio.red` |
| 4 | Huertas en techos (hidropónicas, 2.132 cubiertas × 50 m²) | Producir alimento local y dar flores a las abejas | m² de huerta (por año); t comida/día (o kg/día) y % de demanda cubierta (autonomía); abejas (% vs año 1); interacciones de polinizadores | Pila de barras por año: producción hidropónica + autoconsumo (lima) contra demanda (línea punteada violeta) | `huertasAuto(sem)`, `P1.sup × supF`, `evaluacion.territorio.autonomia`, `areaEsp.abeja`. Nota: autonomía en el par 01 es ~0,17 % al año 15 (muy baja): mostrarlo tal cual, sin adornar |
| 5 | Huertas en parques (51 módulos) | Sumar hábitat, flora nativa y producción en parques | 51 módulos; ha verdes sumadas; t comida/día; especies clave; interacciones | Misma línea de barras que techos con otro color (turquesa) y un mapa de puntos de los 51 módulos activados | Módulos «Huertas de parque (n)» de `sim_red_datos.js`, `evaluacion.territorio.verde`, calendario de activación (3 años) |
| 6 | Mercados de barrio | Acercar la comida a los habitantes (≤ 15 min a pie) | % de población con mercado a ≤ 865 m; sectores nuevos cubiertos; t comida distribuida/día; cobertura alimentaria | Mapa de los 134 sectores: cubiertos (lima) / no cubiertos (coral) con el anillo de cada mercado (violeta) | `abasto.mercados` activos, `evaluacion.territorio.sectores` (x, z, demanda), `AB01.PLAZA_KEN`, Corabastos |
| 7 | Estaciones Circulares | Tratar los residuos orgánicos cerca de donde se generan | t residuos tratados/día; % de aprovechamiento; saturación por estación; kg que ya no van a Doña Juana | Tanques por estación (nivel de llenado, coral si pasa de 85 %) + barra apilada aprovechado/relleno/sin recoger | `evaluacion.territorio.saturacion`, `.estaciones[]`, `.tratados`, `.organicos` |
| 8 | Corabastos / La Vaca ampliada | Liberar la nave y restaurar el humedal; mantener el abasto | ha de humedal ampliado (agua 4,26, juncos 2,57, pradera 4,46, barrera 7,76, sendero 1,68 al año 5); área funcional de humedales (%); tinguas (% vs año 1); abasto de Corabastos | Mapa del predio por celdas que pasan de nave (gris) a humedal (turquesa) por año + anillo de tingua | `AB01_DESMONTE`, franjas de propuesta_obras.json, `humedalHa`, `areaEsp.tingua`, tabla del par 01 de Corabastos |
| 9 | Humedal + aguas lluvias de Bavaria | Captar y fitodepurar la lluvia del plan (sección A) y dar hábitat | m³ de agua lluvia captada/año y tratada/año; ha de humedal (0,51 agua + 0,51 plantas); área verde; plantas y especies atraídas; interacciones sumadas (marcar [SUP]) | Esquema de flujo turquesa de izquierda a derecha: techos/calles → jardines de lluvia → tanque → 6 celdas del humedal → riego/rebose, con el caudal en m³ sobre cada flecha | `A(t)` de la obra 7, `A_imp(t)` de `plan_bavaria.js` (manzanas por año), P (800 mm [SUP]), fórmula A.5, `humedal_bavaria3d.js area()` |
| 10 | Ciclorrutas de Bavaria | Moverse en bicicleta dentro del plan sin carro | km de ciclorruta; viviendas a ≤ 300 m de una ciclorruta [SUP]; conexión a las ciclorrutas de la ciudad; (futuro) viajes en bici y CO2 evitado | Línea del plan (violeta) con la ciclorruta resaltada (lima) y las manzanas por distancia; barra de km por año de obra | Trazado nuevo: hay que definirlo sobre las vías y alamedas de `plan_bavaria.json` (aún no existe en el modelo; el modelo de Kennedy no tiene bicicleta, así que la ficha solo puede reportar km y cobertura, no «viajes») |

### Observaciones para el desarrollador

1. **No se puede reportar un indicador que el modelo no calcula.** Ciclorrutas y aguas lluvias hoy no tienen indicador en el modelo: la ficha tiene que decir «km» y «m³» calculados por geometría y fórmula, no «efecto en la biodiversidad».
2. **Las interacciones por obra no se pueden separar solo con lo existente**; se obtienen con la contribución marginal (corrida con y sin la obra). Es más fiel a lo que pide la autora («aporte de cada obra calculado por el modelo»).
3. Las fichas 4 y 5 (huertas) tienen un aporte pequeño a la autonomía (0,17 %). Es un resultado del modelo; no inflarlo.
4. Diagramas: un solo estilo para todos (mínimo texto, números grandes en Geist/Barlow Condensed, anillos y barras), con el mapa pequeño de la obra al lado y un botón «ver fórmula» como en el tablero.

---

## C) Bibliografía

Todas se consultaron solo mediante el buscador (extractos), salvo que se indique otra cosa. Verificar antes de citar en la tesis.

1. SDA Bogotá. «Sistemas urbanos de drenaje sostenible» (documento técnico, 2011). https://predios.ambientebogota.gov.co/documents/10184/411743/Sistemas+urbanos+de+drenaje+sostenible.pdf/0f65e19e-31a2-4d4f-bb45-3e240bd7a620
2. SDP Bogotá, anexo 13 (cita NS-166 de 2018 y la Resolución Conjunta 01 de 2019 SDA–SDP). https://www.sdp.gov.co/sites/default/files/anexo13_0.pdf
3. Ministerio de Vivienda. Guía de SUDS (incluye «Jardín de lluvia»). https://www.minvivienda.gov.co/sites/default/files/documentos/4040_1_2.9_2022_2_04_-guia-suds_v.0.pdf
4. Lara y Vera (2005). Humedal artificial de flujo subsuperficial en Cogua, Cundinamarca. Revista Ingeniería, Univ. Javeriana. https://revistas.javeriana.edu.co/index.php/iyu/article/download/901/501
5. Gómez Chavarro, C. I. (2021). Diseño de humedales artificiales. Escuela Colombiana de Ingeniería. https://repositorio.escuelaing.edu.co/bitstream/handle/001/1378/G%C3%B3mez%20Chavarro,%20Camilo%20Iv%C3%A1n-2021.pdf?sequence=2
6. DYNA (Univ. Nacional de Colombia), humedales con Sagittaria latifolia (TRH). https://revistas.unal.edu.co/index.php/dyna/article/view/105263/91839
7. Ramsar / SDA, régimen hídrico de humedales de Bogotá (500–800 mm en el sur). https://rsis.ramsar.org/RISapp/files/3446365/documents/CO2404_lit190124.docx
8. El Tiempo. Zonas donde más llueve en Bogotá (Kennedy entre las más secas). https://www.eltiempo.com/vida/medio-ambiente/lluvias-en-bogota-estas-son-las-zonas-donde-mas-llueve-en-la-capital-819764
9. climate-data.org, Bogotá (~1.091 mm; fuente comercial, baja confiabilidad). https://es.climate-data.org/location/5115/
10. IDEAM. Normales climatológicas 1981–2010 y estación INEM Kennedy (21206560), a consultar. https://visualizador.ideam.gov.co/CatalogoObjetos/maps-gallery/download/3469
11. Minnesota Pollution Control Agency. Biodiversidad e infraestructura verde de aguas lluvias. https://stormwater.pca.state.mn.us/Wildlife_habitat_and_biodiversity_benefits_of_Green_Stormwater_Infrastructure
12. MPCA. Prácticas de aguas lluvias amigables con polinizadores. https://stormwater.pca.state.mn.us/Pollinator_friendly_Best_Management_Practices_for_stormwater_management
13. Revisión sistemática de biorretención (MDPI, 2025). https://www.mdpi.com/2073-445x/14/4/736
14. Kadlec, R. H. y Wallace, S. D. (2009). *Treatment Wetlands*, 2.ª ed. CRC Press (citada por Lara y Vera; no consultada).

Pendientes de verificación: texto de NS-166 y de la resolución distrital vigente de SUDS; precipitación normal de INEM Kennedy; m²/m² impermeable y TRH recomendados por la EAAB.

## Decisión de la autora (2026-11-26)
- NO usar jardines de lluvia. El sistema de Bavaria queda: captación por biofiltros/zanjas de infiltración en calles y parques → humedal artificial de fitodepuración (6 celdas) integrado con árboles y plantas. Todo lo demás de este documento se mantiene.
