/* Reproduce la selección catastral del escenario 01 desde las capas oficiales de IDECA.
   Solo registra atributos observados. Los datos de cubierta y la altura métrica
   quedan nulos si la fuente no los acredita. */
import { writeFile } from 'node:fs/promises';

const LOCALIDAD = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/ordenamientoterritorial/localidad/MapServer/0/query';
const CONSTRUCCION = 'https://serviciosgis.catastrobogota.gov.co/arcgis/rest/services/catastro/construccion/MapServer/0/query';

async function query(url, params) {
  const body = new URLSearchParams({ ...params, f: 'json' });
  const response = await fetch(url, { method: 'POST', body });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

function inside(point, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
        point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

function center(ring) {
  const points = ring.slice(0, -1);
  return [points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length];
}

const boundary = await query(LOCALIDAD, {
  where: "LOCNOMBRE='KENNEDY'", outFields: 'LOCCODIGO,LOCNOMBRE',
  returnGeometry: 'true', outSR: '4326'
});
if (boundary.features.length !== 1) throw new Error('No se obtuvo el límite oficial de Kennedy');
const rings = boundary.features[0].geometry.rings;
const constructions = await query(CONSTRUCCION, {
  where: 'CONNPISOS >= 15', geometry: JSON.stringify(boundary.features[0].geometry),
  geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
  outFields: 'OBJECTID,CONCODIGO,CONNPISOS,LOTECODIGO,CONALTURA',
  returnGeometry: 'true', outSR: '4326'
});

const groups = new Map();
for (const feature of constructions.features) {
  const attr = feature.attributes;
  if (!(attr.CONNPISOS >= 15) || !feature.geometry?.rings?.length) continue;
  const validRings = feature.geometry.rings.filter(ring => rings.some(boundaryRing => inside(center(ring), boundaryRing)));
  if (!validRings.length) continue;
  const key = attr.CONCODIGO;
  if (!groups.has(key)) groups.set(key, { ...attr, rings: [] });
  const group = groups.get(key);
  group.CONNPISOS = Math.max(group.CONNPISOS, attr.CONNPISOS);
  group.rings.push(...validRings);
}

const features = [...groups.values()].sort((a, b) => a.CONCODIGO.localeCompare(b.CONCODIGO)).map(item => {
  const point = center(item.rings[0]);
  return { type: 'Feature', id: item.CONCODIGO,
    properties: {
      identificadorCatastral: item.CONCODIGO,
      codigoLote: item.LOTECODIGO,
      localidad: 'KENNEDY', sectorTerritorial: null,
      longitud: point[0], latitud: point[1], pisos: item.CONNPISOS,
      alturaRealM: null, superficieCubiertaM2: null,
      superficiePotencialM2: null, capacidadModulos: null,
      estadoActivacion: false,
      verificacion: 'Pisos y polígono: Catastro Distrital. Altura métrica y cubierta habilitable: pendientes de fuente y revisión técnica.'
    },
    geometry: { type: 'MultiPolygon', coordinates: item.rings.map(ring => [ring]) }
  };
});

const output = {
  type: 'FeatureCollection',
  metadata: {
    localidad: 'Kennedy', codigoLocalidad: boundary.features[0].attributes.LOCCODIGO,
    criterio: 'CONNPISOS >= 15 y centro del polígono dentro del límite oficial',
    capaConstrucciones: CONSTRUCCION.replace('/query', ''),
    capaLocalidad: LOCALIDAD.replace('/query', ''),
    construccionesCandidatas: features.length,
    advertencia: 'CONALTURA contiene valores entre -2 y 0 en las consultas realizadas y no acredita altura real. Tampoco se verificaron instalaciones, circulación o capacidad portante de las cubiertas.'
  }, features
};
await writeFile(new URL('../data3d/escenario01_construcciones.geojson', import.meta.url), JSON.stringify(output));
console.log(`${features.length} construcciones catastrales con 15 pisos o más dentro de Kennedy`);
