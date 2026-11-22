/* Generado por tools/plan_bavaria_build.mjs: Plan Parcial Fábrica Bavaria para el modelo semanal (escenario D). */
export const PLAN_BAV = {
  VIV_ETAPA: [1254,1305,1426,1341,1599,1702,1134,1754,1599,1186],            // viviendas que se terminan en el año 1..10 (14.300 en total: El Espectador; Distrito «más de 14.000»)
  ARB_ETAPA: [87,106,118,54,75,107,65,72,112,44],            // árboles del predio (data3d/bavaria_arboles.json) que caen dentro de manzanas, por año
  ARB_TOT: 3250,                             // árboles detectados en el predio
  PERS_HOG: 2.76,                                    // personas por hogar en Kennedy (Observatorio de Hábitat Bogotá 2023, Sisbén IV)
  AUTOS_HOG: 0.31,                                   // autos por hogar en Bogotá (Encuesta de Movilidad 2023)
  AUTOS_KEN: 113604,                                 // autos en Kennedy (Encuesta de Movilidad 2023, vía Portafolio)
  CENTRO: [3977.7, 219.3] // centro del predio en el marco «mundo» (x este, z sur)
};
