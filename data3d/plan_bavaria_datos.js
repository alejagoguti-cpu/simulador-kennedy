/* Generado por tools/plan_bavaria_real.py: Plan Parcial Bavaria Fábrica (Decreto 448 de 2023) para el modelo semanal (escenario D). */
export const PLAN_BAV = {
  VIV_ETAPA: [1506, 1020, 2779, 4075, 1950, 272, 337, 549, 949, 565],            // viviendas que se terminan en el año 1..10 (14.000 en total: Alcaldía de Bogotá, modificación 2023)
  ARB_ETAPA: [99, 36, 185, 182, 238, 251, 91, 131, 170, 239],            // árboles del predio (data3d/bavaria_arboles.json) que caen en manzanas, vías, alamedas y equipamientos, por año
  ARB_TOT: 3250,                             // árboles detectados en el predio
  PERS_HOG: 2.76,                                    // personas por hogar en Kennedy (Observatorio de Hábitat Bogotá 2023, Sisbén IV)
  AUTOS_HOG: 0.31,                                   // autos por hogar en Bogotá (Encuesta de Movilidad 2023)
  AUTOS_KEN: 113604,                                 // autos en Kennedy (Encuesta de Movilidad 2023, vía Portafolio)
  CENTRO: [3977.7, 219.3] // centro del predio en el marco «mundo» (x este, z sur)
};
