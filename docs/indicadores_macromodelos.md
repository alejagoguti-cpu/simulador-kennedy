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
