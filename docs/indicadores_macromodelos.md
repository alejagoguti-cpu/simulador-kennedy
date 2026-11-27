# Indicadores por macromodelo (tabla de la autora, 2026-11-25)

Todos se calculan EN VIVO desde la simulación y deben mostrar el cambio en el tiempo y la diferencia con / sin propuesta. Si una fórmula se puede representar mejor, se cambia y se documenta aquí el motivo.

## 1. Macromodelo ecocéntrico

| Indicador | Fórmula | Cómo se calcula | Fuente |
|---|---|---|---|
| Biodiversidad de Shannon | H' = −Σ pᵢ ln pᵢ | Individuos de cada especie / total; cada proporción × su logaritmo natural; se suma y se cambia el signo. | Índice de Shannon, documentado por el NIST. |
| Especies clave: abejas, colibríes y tinguas | (N_actual / N_inicial) × 100 | Individuos de cada especie al inicio y en cada semana; qué porcentaje permanece. | Variación porcentual, adaptación del proyecto. |
| Interacciones bióticas | I = Σ interacciones | Visitas de polinizadores a flores (y demás relaciones) registradas durante una semana. Se muestra con el diagrama circular de cuerdas de quién interactúa con quién. | Conteo de eventos, definición operativa del proyecto. |
| Área verde | A_v = A₁ + A₂ + … + Aₙ | Suma de los m² de todas las zonas verdes representadas. | Cálculo geométrico de superficies. |
| Conectividad ecológica | (parches conectados / parches totales) × 100 | Zonas verdes conectadas / total. | Indicador simplificado propio, inspirado en métricas de conectividad del paisaje (doi.org). |
| Fauna atropellada | A = Σ atropellamientos | Cada vez que un vehículo atropella un animal, se suma uno. | Conteo de eventos del simulador. |
| Ruido promedio | L_Aeq = 10 log₁₀( (Σ 10^(Lᵢ/10)) / n ) | Lecturas en dB(A) a escala energética, promedio, de vuelta a decibeles. | Nivel sonoro equivalente, FHWA e ISO 1996-1. |
| Bienestar de la fauna (nuevo) | Ligado al ruido: baja cuando el ruido sube | A más ruido (L_Aeq por encima de los umbrales de molestia para fauna), menor bienestar. La fórmula exacta se define con fuente y se muestra en «Ver fórmula». | Pedido de la autora; fuente a documentar. |

## 2. Macromodelo de circularidad de residuos

| Indicador | Fórmula | Cómo se calcula | Fuente |
|---|---|---|---|
| Saturación de residuos | (kg acumulados / capacidad máxima en kg) × 100 | Residuos almacenados / capacidad de las Estaciones Circulares. | Porcentaje de ocupación de capacidad, adaptado al proyecto. |
| Aprovechamiento de residuos | (kg aprovechados / kg generados) × 100 | Residuos recuperados / generados en el mismo periodo. | Tasa de desvío o aprovechamiento, metodología de la EPA. |

## 3. Macromodelo de comercio ecológico

| Indicador | Fórmula | Cómo se calcula | Fuente |
|---|---|---|---|
| Cobertura alimentaria | (kg recibidos / kg demandados) × 100 | Alimentos que recibió cada sector vs los que necesita; máximo 100 %. | Porcentaje de satisfacción de demanda, adaptado al proyecto. |
| Autonomía alimentaria | (kg locales consumidos / kg demandados) × 100 | Parte de la demanda cubierta con producción local. | Adaptación del concepto de autosuficiencia alimentaria de la FAO. |
| Accesibilidad a mercados | (habitantes cubiertos / habitantes totales) × 100 | Habitantes que llegan a un mercado en máximo 15 minutos según las rutas del modelo. | Indicador de cobertura poblacional, adaptado al proyecto. |
| Presión inmobiliaria | ((P_f − P_i) / P_i) × 100 | Precio final menos inicial, dividido por el inicial, × 100. | Variación porcentual, no un índice específico de especulación. |

## Cómo se calcula en el simulador (2026-11-25)

Funciones puras en `data3d/indicadores_macro.js` (las usa el tablero `data3d/panel_indicadores.js` y se verifican en node). Cada tarjeta del tablero tiene un botón «Ver fórmula» con la fórmula, sus términos, los valores de la semana (con y sin propuesta), el dato del modelo que usa, la fuente y qué estrategia de la propuesta lo mueve.

| Indicador | Dato del modelo (`simulaciones12.js`) | Diagrama |
|---|---|---|
| Interacciones bióticas | `evaluacion.territorio.red` (interacciones locales); encuentros en vivo `window.KEN_ENC` (biotica.js) | Diagrama de cuerdas en vivo (#tb-cuerda de tablero.js), leyenda por tipo con su conteo, línea con / sin |
| Shannon H′ | `biodiversidad.shannonArea` (nuevo) | Línea de 15 años con / sin |
| Especies clave | `biodiversidad.areaEsp.abeja / colibri / tingua` (nuevo) frente a la semana 52 | Tres anillos (100 % = año 1) + anillo punteado de la otra corrida |
| Área verde | `evaluacion.territorio.verde` (ha; × 10.000 = m²) | Área de 15 años |
| Conectividad | `verde.resumen.nConectados / nParches` | Medidor semicircular + mapa de parches y enlaces + línea |
| Fauna atropellada | `atropellos.total`, `atropellos.porAño` | Contador + columnas por año con / sin |
| Ruido L_Aeq | `ruidoLAeq` (nuevo, energético) | Medidor dB(A) con bandas + línea |
| Bienestar de la fauna | `avesRuido.bienestarFauna`, `avesRuido.dbAves` (nuevos) | Curva dosis-respuesta con el punto con / sin + línea |
| Saturación | `evaluacion.territorio.saturacion`, `.estaciones[]` | Tanques por Estación Circular + línea |
| Aprovechamiento | `evaluacion.territorio.tratados / organicos` | Barras apiladas (aprovechado · relleno · sin recoger) con / sin + línea |
| Cobertura alimentaria | `evaluacion.territorio.sectores[].valor` (tope 100) | Franja de calor de los 134 sectores con / sin |
| Autonomía alimentaria | `evaluacion.territorio.autonomia` | Anillo 0–100 % + línea |
| Accesibilidad a mercados | `evaluacion.territorio.sectores` (x, z, demanda) + Corabastos + Plaza Distrital de Kennedy (`AB01.PLAZA_KEN`) + `abasto.mercados` activos | Mapa de sectores cubiertos / no cubiertos + línea |
| Presión inmobiliaria | `especulacion.indice` (semana 1 = Pᵢ) | Línea de 15 años con / sin |

## Cambios de fórmula

1. **Shannon H′**: antes pᵢ = parches ocupados por la especie / total. Contar parches iguala un módulo de huerta en cubierta (0,1 ha) con un humedal de 18 ha, y con la propuesta (que suma decenas de módulos pequeños que colonizan las aves generalistas) el índice bajaba por un artefacto de conteo. Ahora pᵢ = Aᵢ / ΣA con Aᵢ = hectáreas ocupadas por la especie i. El modelo no cuenta individuos: con igual densidad por especie, los individuos son proporcionales al área ocupada. Campo nuevo `biodiversidad.shannonArea`; el `shannon` viejo se conserva.
2. **Especies clave**: N = hectáreas ocupadas por abeja de miel, colibrí chillón y tingua moteada; N_inicial = las de la semana 52 (fin del año 1), porque el modelo duplica la ocupación en las primeras ~40 semanas mientras se asienta (`REF` de simulaciones12.js).
3. **Ruido promedio**: el tablero usaba `ruidoDb`, promedio ARITMÉTICO de las celdas de vía. La fórmula de la tabla es energética (ISO 1996-1): `ruidoLAeq = 10·log10(Σ 10^(Lᵢ/10) / n)` sobre las mismas celdas. Da ~6,5 dB más (lo dominan las vías fuertes). `ruidoDb` se conserva para las reglas y avisos.
4. **Bienestar de la fauna (nuevo)**: B = Σ aₚ·b(Lₚ) / Σ aₚ, aₚ = aves (especie × parche) en el parche p, Lₚ = ruido del parche (su vía principal más cercana, `dbParche`). b(L) = 1 hasta 50 dB(A), lineal hasta 0 en 75 dB(A). Fuente: Shannon et al. 2016, Biological Reviews 91: 982–1005 (efectos desde ~40 dB(A), 20 % de los estudios bajo 50 dB(A)). 75 dB(A) es supuesto [SUP] (borde de vía principal; Reijnen et al. 1996). Solo aves: en el modelo el ruido no afecta a abejas ni anfibios. Campo nuevo `avesRuido.bienestarFauna` (la curva vieja 50–70 dB de `bienestar` se conserva).
5. **Accesibilidad a mercados (nuevo)**: % de la población (peso = demanda de cada sector de 500 m) cuyo centro queda a ≤ 865 m en línea recta de un mercado abierto: 15 min a pie a 4,5 km/h = 1.125 m por la red / circuidad 1,3 (Levinson y El-Geneidy 2009). Mercados: Corabastos, la Plaza Distrital de Kennedy (existe en las dos corridas) y los mercados de barrio de la propuesta ya abiertos.
6. **Saturación**: solo aplica donde hay Estaciones Circulares (con propuesta). Sin propuesta lo recogido va al relleno Doña Juana y la tarjeta muestra «—».
7. **Presión inmobiliaria**: (P_f − P_i)/P_i × 100 con P = `especulacion.indice` y P_i el de la semana 1.

## Mecanismos de la propuesta agregados (solo corridas con propuesta; «sin propuesta» no cambia)

Constantes en `PROP_SUP` de `simulaciones12.js`. Son obras con calendario, no descuentos por etiqueta (respetan la revisión ecológica que quitó los descuentos activados solo por `E.prop`).

- **Pasos de fauna con cerramiento (E5 Corredor biótico)**: en las vías principales que cortan las rutas de dispersión entre parches; se construyen de la semana 52 a la 260 (años 2–5) y reducen la mortalidad al cruzar 54 % (Rytwinski et al. 2016, PLoS ONE 11: e0166941). Supervivencia = e^(−c·Q·(1 − 0,54·fase)). Mueve atropellos, conectividad y destinos alcanzables.
- **Calles verdes y pacificadas (E5 + calles verdes entre módulos + E9 Manzanas del Cuidado)**: [SUP] 30 % de las calles a 30 km/h y con franjas verdes, construidas de la semana 52 a la 416 (años 2–8), −3 dB cada una (`MITIGA_DB`, EEA 2010). Se combina con el deslizador «mitiga» del par 02: mit = 1 − (1 − deslizador)·(1 − 0,30·fase). Mueve el ruido, el bienestar de la fauna y la colonización de las aves (el factor de tráfico que recibe la red trófica).
- Ya existían y no se tocaron: mercados de barrio por fases (accesibilidad, cobertura), módulos de huerta (área verde, autonomía, especies clave), Estaciones Circulares (aprovechamiento), protección del suelo (presión), desmonte de Corabastos (bordes liberados).

## Mecanismos de la propuesta (obras del 3D en el modelo, 2026-11-26)

Todo lo que «Kennedy con propuesta» construye en el 3D entra al modelo con los mismos datos y calendarios. Los datos se precalculan en `data3d/propuesta_obras.json` con `node tools/propuesta_obras_datos.mjs` (mismas funciones y archivos que el 3D; marco = mundo del simulador, el de `PARCHES`). El modelo los carga en `cargarDatos` (navegador, node y workers) y los aplica en `obrasPaso` / `obrasAve` de `simulaciones12.js` (`OBRA_SUP`). Solo en las corridas con propuesta (ids pares y 14): las corridas sin propuesta dan resultados idénticos. Si el JSON no carga, la corrida con propuesta sigue sin estas obras.

Regla común (la del modelo, no una paralela): la extinción y la colonización dependen de √área (sim_vida.js) y la pérdida de humedal ya se aplica como √(área/área inicial) sobre el factor de hábitat. Una obra que agrega ΔA ha a un corredor verde de área A usa la misma regla: **xObra = √(1 + ΔA(t)/A)**, que multiplica `E.xH` (todas las especies de ese corredor en la red trófica). Madurez de un árbol: g(dt) = 0 antes de sembrar, e₀ + (1 − e₀)·mín(1, dt/adulto) después; una cohorte sembrada entre a₀ y a₁ años usa el promedio de 5 árboles.

| Obra | Dato (propuesta_obras.json) | Indicador | Fórmula | Calendario | Fuente / [SUP] |
|---|---|---|---|---|---|
| 1 · Puente de fauna sobre la Av. Ciudad de Cali (El Burro) | 1,01 ha (tablero 0,90 + taludes 0,11), centro (1.864, −549) | Hábitat y presencia (El Burro), interacciones, Shannon, especies clave, área verde, conectividad | ΔA_Burro += 1,01 × smoothstep(1,3; 3; año); nodo «Puente de fauna» en la red verde unido a El Burro (tipo paso de fauna); área en `biodiversidad.areaEsp` y Shannon por área | obra año 1, cubierta verde años 1,3–3 (ecoducto.js) | ecoducto.js. [SUP] el modelo tiene El Burro como un solo corredor verde: el «enlace entre mitades» se representa como área + nodo y enlace en la red verde; la mortalidad al cruzar ya la baja `PROP_SUP.PASO_RED` (no se cuenta dos veces) |
| 2 · Árboles de borde de los humedales | 3.770 árboles (3.927 en el archivo × 0,96 que el 3D omite): El Burro 1.719 (copa 8,1 ha), La Vaca 1.175 (4,8 ha), Techo 876 (4,0 ha) | Hábitat (los tres humedales), carbono | ΔA_h += copa_h × g, e₀ = 0,3, adulto 3,5 años; copa también en `ciclos.detalle.copaHa` | siembra años 0,5–4 (ecoducto.js) | [SUP] copa = disco de 6,5 / 5 / 3,6 m según estrato (punto lejano de parches_arboles.js), unión en rejilla de 2 m; [SUP] la copa junto al humedal cuenta como área de hábitat del humedal (el modelo no separa franjas). No se suma al área verde (está en el borde ya verde) |
| 3 · Calles verdes | 11.953 árboles en 165,7 km de vías principales y secundarias (fase 1: 3.386; fase 2: 8.567); copa adulta 96 ha; 18 pares de zonas verdes unidos por filas de árboles | Conectividad, bienestar de la fauna, carbono | enlace «calle verde» entre p y q con f = madurez de la calle más tardía del camino × mín(1, calidad/0,4); conectividad del marco ecocéntrico cuando f = 1; ruido para la fauna en la zona verde p: ΔL_p = 1 dB × Σ (fracción de árboles de calle a 100 m que son de fase 2) × g; para las aves además la zona de efecto con Q × 10^(−ΔL/10) | fase 1 semanas 52–416 (= `PROP_SUP.MIT`, que ya baja 3 dB), fase 2 416–676, adulto 3,5 años | calles_verdes3d.js. [SUP] brecha 50 m y pares ≤ 2.000 m (alcance del grupo «árbol»): las aves de bosque urbano evitan cruzar claros de decenas de metros y usan calles arboladas como corredores (Tremblay y St. Clair 2009, J. Appl. Ecol. 46: 1314–1322; Fernández-Juricic 2000, Conserv. Biol. 14: 513–521). [SUP] 1 dB por fila de árboles (Van Renterghem et al. 2015, Applied Acoustics 92: 86–101: una fila atenúa del orden de 1 dB o menos). El ruido de las calles (L_Aeq) no cambia por los árboles. La copa de calles no se suma al área verde (está sobre andenes) |
| 4 · Huertas de parque (KEN_HBAR) | 51 huertas de parque | (ya en el modelo) | Son los mismos 51 módulos «Huertas de parque (n)» de sim_red_datos.js (51 = 51): ya son hábitat, flora nativa, producción y área verde. No se agregan otra vez | modelo: se activan con la superficie montada (3 años, con promotores); 3D: años 0,5–6 | Diferencia de calendario declarada (no se cambió sim_vida.js) |
| 5 · Huertas hidropónicas en cubiertas | par 01: `huertasAuto(sem)` (2.132 cubiertas × 50 m² hasta la semana 754) | Autonomía, huertas, especies clave (abeja), carbono | excedente sobre las cubiertas que el modelo ya monta: ΔA_cub = máx(0, n × 50 m² − 4,9 ha × supF); xObra de los módulos de cubierta = √(1 + ΔA_cub / 4,8 ha); autonomía = (autoconsumo + producción hidropónica) / demanda | el de huertasAuto | Pares 02–06 y 14: las cubiertas ya están en el modelo (escenario C, `P1.sup × supF`), no se agregan |
| 6 · La Vaca ampliada en el predio de Corabastos | por franja (año 5): sendero 1,68, barrera de árboles 7,76, pradera húmeda 4,46, juncos 2,57, agua 4,26 ha, repartidas por la semana en que se quita la nave de cada celda (AB01_DESMONTE) | Hábitat (La Vaca), humedales (ha y área funcional), área verde, Shannon, tinguas, carbono | húmedo = Σ_k (pradera + juncos + agua)_k × clamp((año − sem_k/52 − 0,6)/4); barrera = Σ_k barrera_k × g (siembra 0,75–2,25 años después, e₀ 0,35, adulto 3,5); extra = máx(0, húmedo − borde que ya restaura sim_vida.js); ΔA_Vaca = extra + barrera + copa de borde; humedalHa y área funcional += extra; nodo «Humedal La Vaca ampliado» = húmedo + barrera − bordes liberados de sim_vida.js | naves quitadas semanas 52–416; cada celda: 0,6 años de obra y 4 de crecimiento | propuesta01_3d.js (armarCampo, mismas fórmulas y ruido) |
| 7 · Humedal artificial de Bavaria (fitodepuración) | 1,03 ha en 6 celdas (agua 0,51, vegetación 0,51), huella 2,04 ha, centro (4.076, 195) | Hábitat (Bosque de Bavaria), humedales, área verde, carbono | A(t) = 0,51 × clamp(año − 3) + 0,51 × clamp((año − 3)/3); ΔA_Bosque de Bavaria += A; humedalHa y área funcional += A; nodo «Humedal artificial de Bavaria» | obra años 2–3, agua 3–4, plantas 3–6 | humedal_bavaria3d.js (generarCampo con bavaria_arboles.json). El modelo no tiene un humedal en Bavaria: se suma al corredor verde más cercano (el bosque, a 140 m), así que no da hábitat a las aves acuáticas |
| 8 · Árboles nuevos de parques | 1.684 árboles nativos en 56 grupos de parques (copa 7,2 ha) + anillo de 70 en el Parque Cayetano Cañizares (0,42 ha); la barrera de La Vaca va en la obra 6 | Calidad de los parques (hábitat de todos los parques), carbono | P3.arboles = 0,4 + copa nueva(t) / 172 ha de parques del modelo; en el par 04 la mayor entre esto y el +0,2 de su prueba (son los mismos árboles) | grupos: siembra años 1–4, adulto 5 años (e₀ 0,2); anillo: 1–2,5, adulto 3,5 | parches_arboles.js calcularParches, propuesta01_3d.js. [SUP] densidad de árboles ≈ fracción de copa |

Efectos que salen solos de la dinámica (no se suman a mano): más hábitat → más ocupación especie × corredor verde → más interacciones locales, Shannon por área, especies clave, riqueza; y también más dispersantes terrestres que cruzan vías → **más atropellos** que la propuesta sin obras (sigue habiendo menos que sin propuesta).

Pendiente (fuera de lo permitido en esta tarea): los corredores de calle verde no cambian la colonización de la red trófica, porque su núcleo de dispersión está en `red_trofica.js` (compartido con las corridas sin propuesta); hoy solo entran en la conectividad.

### Verificación (node, semilla 1, valores por defecto) — sin / con antes de las obras / con ahora

Corridas sin propuesta (1, 3, 5, 7, 9, 11, 13): indicadores idénticos antes y después (JSON comparado). Tabla de Corabastos del par 01 sin cambios (con: 35·34·38·44·58·60·58·58; sin: 35·37·40·43·50·58·120·120, residuos en la semana 285). Game over: iguales en las 12 (el 05 con propuesta sigue terminando por tráfico en la semana 739: ninguna obra cambia el tráfico).

Par 01 (ids 1 / 2):

| Indicador | Año 1 | Año 5 | Año 10 | Año 15 |
|---|---|---|---|---|
| Interacciones | 3.158 / 3.910 / 3.910 | 3.280 / 6.354 / 6.394 | 3.101 / 6.313 / 6.448 | 3.023 / 6.349 / 6.618 |
| Shannon H′ (área) | 2,904 / 2,902 / 2,902 | 2,898 / 2,889 / 2,912 | 2,845 / 2,870 / 2,912 | 2,708 / 2,837 / 2,886 |
| Especies clave (%) | 100 / 100 / 100 | 99 / 103 / 107 | 101 / 106 / 116 | 96 / 103 / 114 |
| Área verde (ha) | 215,7 / 217,4 / 217,4 | 214,3 / 236,3 / 240,7 | 212,5 / 245,3 / 260,0 | 211,7 / 246,6 / 264,1 |
| Conectividad (%) | 28,6 / 21,6 / 21,6 | 28,6 / 76,6 / 77,5 | 28,6 / 80,5 / 81,3 | 28,6 / 80,5 / 81,3 |
| Atropellos (acum.) | 188 / 188 / 188 | 2.083 / 1.954 / 1.965 | 5.000 / 4.487 / 4.650 | 7.667 / 6.932 / 7.365 |
| Bienestar de la fauna (%) | 69,5 / 69,4 / 69,4 | 68,6 / 68,7 / 68,9 | 67,4 / 69,3 / 69,4 | 65,7 / 67,6 / 68,0 |
| Autonomía (%) | 0 / 0 / 0,01 | 0 / 0 / 0,06 | 0 / 0 / 0,12 | 0 / 0 / 0,17 |
| Área funcional de humedales (%) | 98,0 / 98,5 / 98,5 | 88,1 / 103,1 / 109,5 | 75,3 / 107,9 / 129,6 | 53,1 / 102,4 / 125,1 |

Par 04 (ids 7 / 8):

| Indicador | Año 1 | Año 5 | Año 10 | Año 15 |
|---|---|---|---|---|
| Interacciones | 3.158 / 3.917 / 3.917 | 3.267 / 6.296 / 6.407 | 3.174 / 6.411 / 6.433 | 3.103 / 6.312 / 6.556 |
| Shannon H′ (área) | 2,904 / 2,902 / 2,902 | 2,884 / 2,887 / 2,917 | 2,888 / 2,894 / 2,927 | 2,704 / 2,782 / 2,893 |
| Especies clave (%) | 100 / 100 / 100 | 99 / 104 / 110 | 102 / 107 / 120 | 97 / 104 / 116 |
| Área verde (ha) | 215,7 / 217,4 / 217,4 | 205,0 / 225,2 / 231,5 | 203,1 / 234,0 / 250,7 | 202,6 / 235,8 / 254,7 |
| Conectividad (%) | 28,6 / 21,6 / 21,6 | 28,6 / 78,6 / 79,5 | 28,6 / 79,5 / 80,3 | 28,6 / 79,7 / 80,5 |
| Atropellos (acum.) | 188 / 188 / 188 | 2.084 / 1.889 / 1.916 | 4.952 / 4.086 / 4.370 | 7.571 / 6.271 / 6.891 |
| Bienestar de la fauna (%) | 69,6 / 69,5 / 69,5 | 69,1 / 69,3 / 69,3 | 68,2 / 70,1 / 70,2 | 66,9 / 69,0 / 69,1 |
| Especies de fauna presentes | 23 / 23 / 23 | 23 / 23 / 23 | 23 / 23 / 23 | 21 / 22 / 23 |

## Verificación en node (semilla 1, valores por defecto) — año 1 (semana 52) → año 15 (semana 780)

| Indicador | 13 Kennedy sin propuesta | 14 Kennedy con propuesta |
|---|---|---|
| Interacciones | 3.158 → 3.104 | 3.910 → 6.282 |
| Shannon H′ (área) | 2,90 → 2,73 | 2,90 → 2,80 |
| Especies clave (promedio) | 100 → 96 % | 100 → 103 % |
| Área verde | 216 → 212 ha | 217 → 245 ha |
| Conectividad | 28,6 → 28,6 % | 21,6 → 79,7 % |
| Fauna atropellada (acumulada) | 188 → 7.886 | 188 → 6.604 |
| Ruido L_Aeq | 67,5 → 68,5 dB(A) | 67,5 → 67,4 dB(A) |
| Bienestar de la fauna | 69,5 → 65,7 % | 69,5 → 67,4 % |
| Aprovechamiento | 0 → 0 % | 0,04 → 5,2 % |
| Cobertura alimentaria | 100 → 100 % | 100 → 100 % |
| Autonomía alimentaria | 0,00 → 0,00 % | 0,09 → 0,52 % |
| Accesibilidad a mercados | 18,1 → 17,6 % | 23,9 → 82,8 % |
| Presión inmobiliaria | 0,2 → 5,6 % | 0,0 → 2,9 % |

Game over: ninguna corrida con propuesta termina en game over (antes tampoco); la sim. 3 (Movilidad sin propuesta) sigue terminando en «abasto» en la semana 108, sin cambios.
