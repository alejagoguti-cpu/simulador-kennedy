import {curvaEco} from './panel_evaluacion.js?v=6';
const groups=[
 ['Ecocentrismo',[
 ['red','Interacciones bióticas','enlaces','Pares activos según presencia y alcance de la red trófica. La red interactiva existente muestra relaciones posibles. Faltan eventos fechados para estimar visitas, dispersiones o capturas por semana.'],
 ['riqueza','Composición de fauna','especies','S = especies con presencia en al menos un corredor verde. Cada barra cuenta corredores verdes ocupados por especie. Para Shannon de individuos faltan abundancias.'],
 ['conectados','Continuidad del hábitat','%','100 × corredores verdes del mayor componente / corredores verdes activos. El componente usa corredores funcionales del modelo. Los desplazamientos mostrados por la prueba de fragmentación son orígenes inferidos, no trayectorias verificadas.'],
 ['atropellos','Atropellos','eventos/semana','Conteo semanal de eventos del modelo por especie y vía. La localización corresponde al cruce simulado.'],
 ['verde','Agua y humedal El Burro','ha verdes','Superficie verde del modelo. Balance requerido: cambio de almacenamiento = entradas − salidas. Faltan precipitación, infiltración, evaporación, escorrentía y niveles semanales para cerrar el balance del humedal.']]],
 ['Circularidad de recursos',[
 ['aprovechamiento','Recogida y tratamiento','%','100 × masa orgánica tratada en planta / orgánicos generados en la semana. La planta puede procesar existencias anteriores.'],
 ['compost','Maduración y retorno','t/día','Compost = 0,5 × (masa madura − sustrato desviado). El retorno es el flujo que el modelo asigna a huertas. Faltan concentraciones para cuantificar nutrientes.'],
 ['saturacion','Estaciones y almacenamiento','%','100 × pendientes / capacidad de almacenamiento. Las estaciones reparten el inventario y la capacidad de planta por igual. El excedente rechazado regresa a la cola del relleno.']]],
 ['Comercio ecológico y abastecimiento distribuido',[
 ['autonomia','Autonomía alimentaria','%','100 × consumo atribuido directamente a huertas / demanda total. El origen de los alimentos mezclados en los mercados no se puede separar.'],
 ['cobertura','Cobertura por sector','%','100 × alimentos recibidos / demanda. Los mercados informan entregas y capacidad, sin demanda propia asignada.'],
 ['produccion','Producción y distribución','t/día','Producción = superficie sembrada × rendimiento semanal × calidad. La cosecha se reparte entre autoconsumo, merma y excedente. No hay cosecha medida por huerta individual.'],
 ['concentracion','Dependencia de Corabastos','%','100 × entregas de Corabastos / total recibido. La red muestra rutas de distribución modeladas.'],
 ['acceso','Acceso a quince minutos','%','100 × población con recorrido peatonal ≤15 minutos / población total. Sin matriz de tiempos por origen y mercado sobre la red peatonal. No se sustituyen recorridos por radios.']]]];
const fmt=v=>Number.isFinite(v)?v.toLocaleString('es-CO',{maximumFractionDigits:2}):'Sin dato';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const at=h=>h?.evaluacion?.territorio||{};
const bars=rows=>{const max=Math.max(1,...rows.map(r=>r[1]).filter(Number.isFinite));return rows.map(([label,v,unit])=>'<div class="st-row"><span>'+esc(label)+'</span><b>'+fmt(v)+' '+esc(unit||'')+'</b><meter min="0" max="'+max+'" value="'+(v||0)+'"></meter></div>').join('')};
export function seguimiento(root,I,H,B,prop,T3){
 const open=new Set([...root.querySelectorAll('details[open]')].map(d=>d.dataset.key));
 const t=at(I), other=B.find(h=>h.sem===I.sem), points=[];
 const marker=(p,label)=>{if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))return esc(label);points.push(p);return '<button type="button" data-site="'+(points.length-1)+'">'+esc(label)+' ↗</button>'};
 const flows=list=>network(list)+(list||[]).map(f=>'<p>'+marker(f.de,f.de.n||'Origen')+' → '+marker(f.a,f.a.n||'Destino')+' · '+fmt(f.t_dia)+' t/día</p>').join('');
 function graphic(key){
 if(key==='riqueza')return bars(t.especies.map(s=>[s.n,s.valor,'corredores verdes']))+'<label>Ubicar especie <select data-spec><option value="">Escoger especie</option>'+t.especies.map((s,i)=>'<option value="'+i+'">'+esc(s.n)+'</option>').join('')+'</select></label><div data-parches></div>';
 if(key==='red')return '<p>Explora las especies en la red biótica del panel derecho.</p>';
 if(key==='conectados')return bars(t.especies.map(s=>[s.n,s.alcanzables,'destinos potenciales']))+'<small>Destinos con hábitat activo y peso de dispersión positivo desde corredores verdes ocupados, según grupo de movilidad y supervivencia vial terrestre.</small>'+(I.desplazamientos||[]).map(p=>'<p>'+esc(p.especie)+' · '+marker(p.de,'Origen inferido')+' → '+marker(p.a,'Colonización')+'</p>').join('')+bars([['Hábitat',I.evaluacion.paisaje?.area,'ha'],['Corredores verdes activos',I.evaluacion.paisaje?.cantidad,'']]);
 if(key==='atropellos'){
 const eventos=H.flatMap(h=>at(h).eventos||[]),pagina=Math.min(root.pagina||0,Math.max(0,Math.ceil(eventos.length/8)-1));
 const rows=eventos.slice(Math.max(0,eventos.length-(pagina+1)*8),eventos.length-pagina*8).reverse().map(p=>'<p>'+marker(p,p.nombre+' · '+p.via)+' · sem. '+p.sem+' · '+fmt(p.vehDia)+' veh/día</p>') .join('');return (rows||'<p>Sin atropellos registrados.</p>')+(eventos.length>8?'<div class="st-pages"><button data-page="-1" '+(pagina===0?'disabled':'')+'>Más recientes</button><button data-page="1" '+((pagina+1)*8>=eventos.length?'disabled':'')+'>Anteriores</button></div>':'');}
 if(key==='verde')return '<p>Lluvia → infiltración, escorrentía y almacenamiento</p>'+ (I.evaluacion.diversidad.porParche.filter(p=>/burro/i.test(p.n)).map(p=>marker(p,p.n)).join(' '));
 if(key==='aprovechamiento')return bars([['Generados',t.organicos,'t/día'],['Recolectados',t.recolectados,'t/día'],['Tratados en planta',t.tratados,'t/día']])+'<p>Existencia pendiente: '+fmt(t.pendientes)+' t</p>';
 if(key==='compost')return bars([['Entrada madura',t.madura,'t/día'],['Desvío a sustrato',t.sustrato,'t/día'],['Compost obtenido',t.compost,'t/día'],['Retorno asignado',t.retorno,'t/día']])+flows(I.circular?.flujos.filter(f=>f.tipo!=='alimentos'));
 if(key==='saturacion')return t.estaciones.map(p=>'<p>'+marker(p,p.n)+' · '+fmt(p.valor)+' %</p>').join('')||'<p>Sin desglose de estaciones en esta prueba.</p>';
 if(key==='cobertura')return t.sectores.map(p=>'<p>'+marker(p,p.n)+' · '+fmt(p.valor)+' % · demanda '+fmt(p.demanda)+' t/día</p>').join('')+ (I.abasto?.mercados||[]).map(p=>'<p>'+marker(p,p.n)+' · entregados '+fmt(p.t_dia)+' t/día</p>').join('');
 if(key==='produccion'||key==='autonomia')return bars([['Producción',t.produccion,'t/día'],['Autoconsumo',t.autoconsumo,'t/día'],['Excedente acopiado',t.acopio,'t/día']])+flows(I.circular?.flujos.filter(f=>f.tipo==='alimentos'));
 if(key==='concentracion')return flows(I.abasto?.rutas);
 return '';
 }
 function network(list){
  if(!list?.length)return '';
  const nodes=list.flatMap(f=>[f.de,f.a]),xs=nodes.map(p=>p.x),zs=nodes.map(p=>p.z);
  const minX=Math.min(...xs),minZ=Math.min(...zs),scale=Math.min(238/(Math.max(...xs)-minX||1),105/(Math.max(...zs)-minZ||1)),max=Math.max(...list.map(f=>f.t_dia),.001);
  const X=p=>14+(p.x-minX)*scale,Y=p=>12+(p.z-minZ)*scale;
  return '<svg viewBox="0 0 270 132" role="img" aria-label="Rutas modeladas; grosor proporcional a toneladas por día">'+list.map(f=>'<path d="M'+X(f.de)+' '+Y(f.de)+' Q'+((X(f.de)+X(f.a))/2)+' '+Math.min(Y(f.de),Y(f.a))+' '+X(f.a)+' '+Y(f.a)+'" fill="none" stroke="'+(f.tipo==='compost'?'#d5ff32':'#9bd2c5')+'" opacity=".8" stroke-width="'+(1+5*f.t_dia/max)+'"/><circle cx="'+X(f.a)+'" cy="'+Y(f.a)+'" r="3" fill="#e8edda"/>').join('')+'</svg>';
 }
 const categoria=root.categoria??0;
 const tabs='<nav class="st-tabs" aria-label="Enfoque">'+['Ecología','Recursos','Alimentos'].map((n,i)=>'<button type="button" data-cat="'+i+'" aria-pressed="'+(categoria===i)+'">'+n+'</button>').join('')+'</nav>';
 const sections=()=>[groups[categoria]].map(([name,items])=>items.filter(([k])=>k!=='atropellos').map(([key,label,unit,formula])=>'<details data-key="'+key+'" '+(open.has(key)?'open':'')+'><summary>'+label+' <b>'+fmt(t[key])+' '+unit+'</b></summary><div></div></details>').join('')).join('');
 const confirmed=open.has('alertas')?H.flatMap(h=>(at(h).alertas||[]).filter(a=>a.semanas===4)):[];
 const alarms=[...(t.alertas||[])].sort((a,b)=>b.semanas-a.semanas);
 root.innerHTML='<header class="st-heading"><h3>Indicadores</h3><small>Semana '+I.sem+'</small></header><details class="st-road" data-key="atropellos" '+(open.has('atropellos')?'open':'')+'><summary><span>Fauna atropellada</span><strong>'+fmt(I.atropellos?.total)+'</strong><small>'+fmt(t.atropellos)+' esta semana · Ver en mapa ↗</small></summary><div></div></details>'+tabs+sections()+'<details data-key="alertas" '+(open.has('alertas')?'open':'')+'><summary>Condiciones críticas · '+alarms.length+' locales</summary><p>Umbrales de prueba del proyecto. Cuatro semanas consecutivas confirman la condición en la misma ubicación.</p>'+alarms.map(p=>'<p>'+marker(p,p.n)+' · '+esc(p.indicador)+' · '+(p.semanas>=4?'Colapso local':'Alerta local')+' · semanas '+p.inicio+'–'+I.sem+'</p>').join('')+'<details><summary>Historial de condiciones confirmadas</summary>'+confirmed.map(p=>'<p>'+marker(p,p.n)+' · '+esc(p.indicador)+' · semana '+p.sem+'</p>').join('')+'</details><p>'+ (t.gameOver?'Game Over · Kennedy · '+esc(t.gameOver.motivo)+' · semana '+t.gameOver.sem:'Sin Game Over distrital')+'</p></details>';
 const fill=d=>{const item=groups.flatMap(g=>g[1]).find(i=>i[0]===d.dataset.key);if(!item||!d.open)return;const [k,n,u,formula]=item;if(k==='atropellos'){d.querySelector('div').innerHTML=graphic(k);return;}d.querySelector('div').innerHTML=graphic(k)+'<p>Primera semana: '+fmt(at(H[0])[k])+' '+u+' · actual: '+fmt(t[k])+' '+u+'</p><p>Con propuesta: '+fmt((prop?t:at(other))[k])+' · Sin propuesta: '+fmt((prop?at(other):t)[k])+'</p>'+curvaEco(H,B,'territorio.'+k,prop)+'<details><summary>Método y fuente</summary><p>'+esc(formula)+'</p><small>Modelo semanal · sim_vida y simulaciones12</small></details>';};
 root.querySelectorAll('details').forEach(d=>{fill(d);d.ontoggle=()=>{if(d.dataset.key==='alertas' && d.open && !open.has('alertas')){seguimiento(root,I,H,B,prop,T3);return}if(d.open&&!d.querySelector('div')?.innerHTML)fill(d)}});
 root.onchange=e=>{if(!e.target.matches('[data-spec]'))return;const s=t.especies[e.target.value];root.querySelector('[data-parches]').innerHTML=(s?.lugares||[]).map(i=>{const p=I.evaluacion.diversidad.porParche[i];return marker(p,p.n)}).join(' ')};
 root.onclick=e=>{
 const category=e.target.closest('[data-cat]'),page=e.target.closest('[data-page]');
 if(category||page){if(category)root.categoria=+category.dataset.cat;if(page)root.pagina=Math.max(0,(root.pagina||0)+Number(page.dataset.page));seguimiento(root,I,H,B,prop,T3);return;}
 const btn=e.target.closest('[data-site]');if(!btn||!T3.orbit)return;const p=points[+btn.dataset.site];
 if(!root.mark){const g=new T3.THREE.RingGeometry(19,23,32);g.rotateX(-Math.PI/2);root.mark=new T3.THREE.Mesh(g,new T3.THREE.MeshBasicMaterial({color:0xd5ff32,depthTest:false,side:T3.THREE.DoubleSide}));root.mark.renderOrder=75;T3.scene.add(root.mark);const observer=new MutationObserver(()=>{if(!root.isConnected){T3.scene.remove(root.mark);root.mark.geometry.dispose();root.mark.material.dispose();observer.disconnect();}});observer.observe(root.parentNode,{childList:true});}
 root.mark.position.set(p.x,(T3.sueloY||0)+2,p.z);
 const dest=T3.orbit.target.clone().set(p.x,T3.sueloY||0,p.z);T3.camera.position.add(dest.clone().sub(T3.orbit.target));T3.orbit.target.copy(dest);T3.orbit.update();};
}