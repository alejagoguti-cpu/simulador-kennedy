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
