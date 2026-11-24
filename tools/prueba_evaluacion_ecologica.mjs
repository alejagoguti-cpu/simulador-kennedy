import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../data3d/',import.meta.url)).replaceAll('\\','/').replace(/\/$/,''), cache=new Map();
async function get(file){file=file.split('?')[0];if(cache.has(file))return cache.get(file);const src=fs.readFileSync(file,'utf8');const m=new vm.SourceTextModule(src,{identifier:file,initializeImportMeta(meta){meta.url='file:///'+file;}});cache.set(file,m);await m.link((specifier,ref)=>get(path.resolve(path.dirname(ref.identifier),specifier).replaceAll('\\','/')));return m;}
const m=await get(root+'/simulaciones12.js');await m.evaluate();const M=m.namespace;
await M.cargarDatos(()=>JSON.parse(fs.readFileSync(root+'/simulaciones_datos.json','utf8')));



const histories=[];
for(const id of [1,2]){
const history=[];
const a=M.crear(id,1),b=M.crear(id,1);
for(let t=0;t<780;t++){M.paso(a);M.paso(b);const A=M.ind(a),B=M.ind(b);assert.equal(A.muertes.total,B.muertes.total);assert.equal(A.atropellos.total,B.atropellos.total);assert.ok(Number.isFinite(A.muertes.total));assert.equal(A.muertes.total,Object.values(A.muertes.porCausa).reduce((x,y)=>x+y,0));
assert.ok(A.evaluacion);assert.ok(A.evaluacion.paisaje.pc>=0&&A.evaluacion.paisaje.pc<=1);assert.equal(A.evaluacion.especies[2].disponible,false);assert.equal(A.evaluacion.nutrientes.nutrientesKg,null);assert.ok(A.evaluacion.paisaje.nucleo30<=A.evaluacion.paisaje.nucleo10);history.push(A);}
histories.push(history);
console.log(JSON.stringify({id,pc:M.ind(a).evaluacion.paisaje.pc,weeks:780,deterministic:true,causes:M.ind(a).muertes.porCausa}));
}

const {contenidoEco,CSS_EVALUACION,INDICADORES}=await import('../data3d/panel_evaluacion.js');
const html=contenidoEco(histories[1].at(-1),histories[1],histories[0],true,null,new Set(['supervivencia']));
assert.equal((html.match(/data-ind=/g)||[]).length,6);
assert.ok(!html.includes('NaN'));
assert.ok(html.includes('Choques acumulados')&&html.includes('Atropellos acumulados'));
assert.ok(html.includes('Shannon')&&html.includes('MacKenzie'));
assert.equal(INDICADORES.reduce((n,i)=>n+i.metrics.length,0),25);
console.log('PASS full histories, six sections, 25 charts, no missing data invented.');

