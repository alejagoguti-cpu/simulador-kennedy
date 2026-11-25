const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const fmt=v=>finite(v)?v.toLocaleString('es-CO',Math.abs(v)>0&&Math.abs(v)<.01?{maximumSignificantDigits:3}:{maximumFractionDigits:3}):'Sin dato';
const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o?.evaluacion);
export const INDICADORES=[
{id:'diversidad',n:'01 · Diversidad por parche',formula:'H′ = −Σ pᵢ ln(pᵢ), pᵢ = nᵢ / Σ nᵢ. Con presencia binaria: Hinc = ln(S).',
 nota:'Se muestra H de incidencia y riqueza por parche. Hinc no estima equidad ni abundancia de individuos. Un parche vacío tiene riqueza 0 y H no definido.',
 fuente:'https://doi.org/10.1002/j.1538-7305.1948.tb01338.x',autor:'Shannon, 1948',
 metrics:[['diversidad.hIncidencia','H de incidencia medio','nats'],['diversidad.riquezaMedia','Riqueza media','especies/parche']]},
{id:'polinizacion',n:'02 · Polinización',formula:'L = Σ enlaces abeja–planta activos por parche. Se reutiliza el indicador de interacciones existente.',
 nota:'Los enlaces indican oportunidades de interacción. No equivalen a flores contadas, visitas observadas ni frutos producidos. La reproducción vegetal queda sin estimar: faltan tasas de visita y éxito reproductivo.',
 fuente:'https://www.ipbes.net/assessment-reports/pollinators',autor:'IPBES, 2016',
 metrics:[['polinizacion.interacciones','Enlaces abeja–planta','enlaces'],['polinizacion.plantas','Tipos de plantas asociados','tipos'],['polinizacion.lugares','Parches con abeja','parches'],['polinizacion.huertas','Huertas del modelo','módulos'],['polinizacion.red','Interacciones bióticas existentes','enlaces']]},
{id:'parches',n:'03 · Parches ecológicos',formula:'A = Σ aᵢ. División = 1 − Σ(aᵢ/A)². Núcleo circular(d) = Σ π·max(0,rᵢ−d)².',
 nota:'Superficies aproximadas por los círculos del modelo, sin disolver solapamientos. Núcleo a 10 y 30 m: análisis de sensibilidad, no bordes ecológicos calibrados. Para área núcleo real hacen falta polígonos y profundidad de borde por especie.',
 fuente:'https://fragstats.org/index.php/fragstats-metrics/patch-based-metrics/core-area-metrics/p1-core-area',autor:'FRAGSTATS · área núcleo',
 metrics:[['paisaje.cantidad','Parches activos','parches'],['paisaje.area','Superficie circular','ha'],['paisaje.division','División del hábitat','0–1'],['paisaje.nucleo10','Núcleo · borde de 10 m','ha'],['paisaje.nucleo30','Núcleo · borde de 30 m','ha']]},
{id:'conectividad',n:'04 · Conectividad funcional',formula:'PC = ΣᵢΣⱼ aᵢaⱼp*ᵢⱼ / Aᴸ². p*ᵢⱼ = máximo producto entre rutas; p*ᵢᵢ = 1.',
 nota:'PC del grafo completo del modelo, Aᴸ = 3.859 ha. Los pesos f combinan calidad, madurez y supervivencia vial; son supuestos del simulador, no probabilidades de dispersión calibradas por especie. Las rutas del índice no modifican automáticamente la mortalidad.',
 fuente:'https://doi.org/10.1016/j.landurbplan.2007.03.005',autor:'Saura y Pascual-Hortal, 2007',
 metrics:[['paisaje.pc','PC del modelo','0–1']]},
{id:'supervivencia',n:'05 · Persistencia y pérdidas',formula:'Persistencia = N₁₁/(N₁₁+N₁₀). Colonización = N₀₁/(N₀₀+N₀₁). Extinción local = N₁₀/(N₁₁+N₁₀).',
 nota:'Transiciones semanales de pares especie–parche con estado conocido. Los choques y atropellos son eventos de dispersantes simulados. Las pérdidas por ruido o hábitat son desapariciones locales: no deben sumarse e interpretarse como animales individuales muertos.',
 fuente:'https://doi.org/10.1890/02-3090',autor:'MacKenzie et al., 2003',
 metrics:[['supervivencia.persistencia','Persistencia semanal','0–1'],['supervivencia.colonizaciones','Colonizaciones esta semana','pares'],['supervivencia.extinciones','Extinciones locales esta semana','pares'],['supervivencia.colisiones','Choques acumulados','eventos simulados'],['supervivencia.atropellos','Atropellos acumulados','eventos simulados'],['supervivencia.perdidasRuido','Pérdidas locales por ruido','eventos'],['supervivencia.perdidasHabitat','Pérdidas locales por hábitat','eventos']]},
{id:'nutrientes',n:'06 · Ciclo de nutrientes',formula:'Fracción procesada = orgánicos procesados / orgánicos generados. Retorno = Σ flujos de tipo compost. Nutriente retornado = masa de compost × concentración × fracción disponible.',
 nota:'Se muestran toneladas de material del modelo. El N, P y K retornado queda sin dato: faltan concentraciones, pérdidas de proceso y disponibilidad. Procesar orgánicos no implica que toda su masa retorne a las huertas.',
 fuente:'https://www.fao.org/4/y5104e/y5104e00.htm',autor:'FAO · técnicas de compostaje',
 metrics:[['nutrientes.organicos','Orgánicos generados','t/día'],['nutrientes.procesados','Orgánicos procesados','t/día'],['nutrientes.retorno','Flujos de compost de retorno','t/día'],['nutrientes.fraccionProcesada','Fracción procesada','0–1'],['nutrientes.nutrientesKg','Nutrientes disponibles','kg/día']]}
];
export function curvaEco(H,B,path,prop){
 const a=H.map(h=>[Math.min(780,h.sem??0),get(h,path)]),b=B.map(h=>[Math.min(780,h.sem??0),get(h,path)]);
 const vals=a.concat(b).map(p=>p[1]).filter(finite);if(!vals.length)return '<p class="ee-vacio">Faltan datos para calcular esta serie.</p>';
 const lo=Math.min(...vals),hi=Math.max(...vals),pad=(hi-lo||Math.max(1,Math.abs(hi)*.1))*.1;
 const min=Math.max(0,lo-pad),max=hi+pad,X=t=>34+t/780*242,Y=v=>64-(v-min)/(max-min)*51;
 const line=arr=>{let on=false;return arr.map(([t,v])=>{if(!finite(v)){on=false;return '';}const p=(on?'L':'M')+X(t).toFixed(2)+' '+Y(v).toFixed(2);on=true;return p;}).join(' ');};
 const draw=(arr,color,dash)=>'<path d="'+line(arr)+'" fill="none" stroke="'+color+'" stroke-width="2" '+(dash?'stroke-dasharray="4 3"':'')+'/>';
 return '<svg viewBox="0 0 284 83" role="img" aria-label="Comparación temporal: lima con propuesta; línea discontinua sin propuesta. Horizonte 15 años."><title>'+esc(path)+'</title>'+
 [0,5,10,15].map(y=>'<line x1="'+X(y*52)+'" x2="'+X(y*52)+'" y1="10" y2="66" stroke="#a7c6bb" opacity=".13"/><text x="'+X(y*52)+'" y="79" text-anchor="middle">'+y+'</text>').join('')+
 '<text x="1" y="15">'+esc(fmt(hi))+'</text><text x="1" y="65">'+esc(fmt(lo))+'</text>'+
 draw(prop?b:a,'#f4c47f',true)+draw(prop?a:b,'#91e5bb',false)+'</svg>';
}
export function contenidoEco(I,H,B,prop,selected,open){
 const cards=INDICADORES.map(d=>'<section class="ee-card" data-ind="'+d.id+'" '+(selected===d.id?'':'hidden')+'><button class="ee-select" data-select="'+d.id+'" aria-pressed="'+(selected===d.id)+'">'+d.n+' <span>Ver en Kennedy ↗</span></button>'+
 d.metrics.map(([p,n,u])=>{const now=get(I,p),other=get(B.find(h=>h.sem===I.sem),p);return '<figure><figcaption><span>'+esc(n)+'</span><b>'+fmt(now)+' <small>'+esc(u)+'</small></b></figcaption>'+curvaEco(H,B,p,prop)+'<p class="ee-values">'+(prop?'Con':'Sin')+' propuesta: '+fmt(now)+(B.length?' · '+(prop?'Sin':'Con')+' propuesta: '+fmt(other):' · Comparación calculándose')+'</p></figure>';}).join('')+
 '<details data-detail="'+d.id+'" '+(open.has(d.id)?'open':'')+'><summary>Fórmula, datos y fuente científica</summary><p class="ee-formula">'+esc(d.formula)+'</p><p>'+esc(d.nota)+'</p><a href="'+d.fuente+'" target="_blank" rel="noopener noreferrer">'+esc(d.autor)+'</a></details></section>').join('');
 const species=(I.evaluacion?.especies||[]).map(s=>'<div class="ee-species"><b>'+esc(s.n||s.id)+'</b><span>'+esc(s.id==='abeja'?'Polinización':s.id==='mirla'?'Dispersión de semillas':'Conservación de hábitats')+'</span><p>'+ (s.disponible?fmt(s.ocupados)+' parches · '+fmt(s.colonizaciones)+' colonizaciones · '+fmt(s.extinciones)+' extinciones locales':esc(s.motivo))+'</p></div>').join('');
 const tiles=INDICADORES.map(d=>{
 const [path,label,unit]=d.metrics[0],value=get(I,path);
 const ratio=unit==='0–1'&&finite(value)&&value>=0&&value<=1;
 const ring=ratio?'<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="17" fill="none" stroke="#ffffff20" stroke-width="3"/><circle cx="21" cy="21" r="17" fill="none" stroke="#d5ff32" stroke-width="3" pathLength="100" stroke-dasharray="'+(value*100)+' 100" transform="rotate(-90 21 21)"/></svg>':'';
 return '<button class="ee-tile" data-select="'+d.id+'" aria-pressed="'+(selected===d.id)+'"><span class="ee-tile-name">'+esc(d.n.replace(/^\d+ · /,''))+'</span><span class="ee-kpi">'+ring+'<strong>'+fmt(value)+'</strong></span><span class="ee-unit">'+esc(unit)+'</span><span class="ee-tile-label">'+esc(label)+'</span></button>';
 }).join('');
 return '<header class="ee-intro"><span class="ee-eyebrow">KENNEDY / EVALUACIÓN</span><h5>Indicadores de respuesta</h5><p>Año '+fmt((I.sem||0)/52)+' <span>de 15</span> · '+(prop?'Con propuesta':'Sin propuesta')+'</p></header>'+
 '<div class="ee-tiles">'+tiles+'</div><p class="ee-hint">Selecciona un indicador para explorar sus datos y verlo en el territorio.</p>'+
 '<div class="ee-legend"><span><i class="ee-con"></i>Con propuesta</span><span><i class="ee-sin"></i>Sin propuesta</span></div>'+cards+
 '<details class="ee-causal" data-detail="causal" '+(open.has('causal')?'open':'')+'><summary>Relaciones del sistema</summary><ol class="ee-steps"><li>Huertas → recursos vegetales → interacciones → ocupación de parches</li><li>Hábitat y vías → conectividad del grafo</li><li>Tráfico y edificios → riesgo de atropellos y choques</li><li>Orgánicos → compost → huertas</li></ol><p>Reproducción vegetal, rutas alternativas y nutrientes disponibles: relaciones pendientes de calibrar.</p></details>'+
 '<details class="ee-focal" data-detail="focal" '+(open.has('focal')?'open':'')+'><summary>Especies focales</summary>'+species+'</details><button class="ee-clear">Quitar selección del mapa</button>';

}
export function crearPanelEvaluacion({T3}){
 let selected='supervivencia',group=null,host=null,last=null,signature='',open=new Set(),lastOther=null;
 const clear=()=>{if(group){group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});T3.scene.remove(group);group=null;}};
 function mapa(I){
  clear();if(!selected||!I?.evaluacion)return;
  const THREE=T3.THREE,e=I.evaluacion;group=new THREE.Group();group.name='evaluacion_ecocentrica';T3.scene.add(group);
  let points=selected==='polinizacion'?(e.especies.find(s=>s.id==='abeja')?.lugares||[]):selected==='supervivencia'?(I.muertes?.lista||[]):selected==='nutrientes'?(I.estaciones||[]).filter(s=>Number.isFinite(s.x)):e.diversidad.porParche;
  if(selected==='parches'||selected==='conectividad')points=e.paisaje?.parches||[];
  const color=selected==='supervivencia'?0xff927e:0x91e5bb,y=(T3.sueloY??.3)+2;
  for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;const r=Math.max(8,Math.min(55,p.r||18)),o=new THREE.Mesh(new THREE.RingGeometry(r,r+3,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:(()=>{if(!lastOther?.evaluacion)return color;const old=(selected==='parches'?lastOther.evaluacion.paisaje?.parches:lastOther.evaluacion.diversidad.porParche)?.find(q=>q.id===p.id);if(!old)return color;const delta=selected==='parches'?p.area-old.area:(p.riqueza??0)-(old.riqueza??0);return delta>0?0x91e5bb:delta<0?0xff927e:0xf4c47f;})(),transparent:true,opacity:.8,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));o.position.set(p.x,y,p.z);o.renderOrder=60;group.add(o);}
  if(selected==='conectividad'){const p=[];for(const l of e.paisaje?.enlaces||[])if(l.f>0)p.push(l.x1,y,l.z1,l.x2,y,l.z2);
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0x8ad9e5,transparent:true,opacity:.45,depthTest:false}));line.renderOrder=59;group.add(line);}
 }
 return {render(container,I,H,B,prop,run){
  if(signature!==run){selected='supervivencia';open.clear();clear();signature=run;}
  if(host)host.querySelectorAll('details[data-detail]').forEach(d=>{if(d.open)open.add(d.dataset.detail);else open.delete(d.dataset.detail);});
  const focus=host?.contains(document.activeElement)?document.activeElement.dataset.select:null;
  host=container;last=I;lastOther=B.find(h=>h.sem===I.sem)||null;container.innerHTML=contenidoEco(I,H,B,prop,selected,open);
  container.querySelectorAll('[data-select]').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.select;container.querySelectorAll('.ee-card').forEach(c=>c.hidden=c.dataset.ind!==selected);open.add(selected);container.querySelector('details[data-detail="'+selected+'"]').open=true;container.querySelectorAll('[data-select]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.select===selected?'true':'false'));mapa(last);});
  container.querySelector('.ee-clear').onclick=()=>{selected=null;clear();container.querySelectorAll('[data-select]').forEach(b=>b.setAttribute('aria-pressed','false'));};
  if(focus)container.querySelector('[data-select="'+focus+'"]')?.focus({preventScroll:true});
  if(selected)mapa(I);
 },clear};
}
export const CSS_EVALUACION = `
#su-tab .ee-causal svg{display:block;width:100%;height:auto}
#su-tab .ee-intro h5{font-size:13px;letter-spacing:.06em;margin:14px 0 7px}
#su-tab .ee-intro p,#su-tab .ee-intro small{font-size:10px;line-height:1.5;color:#c4d8cf}
#su-tab .ee-intro i{display:inline-block;width:15px;height:3px;margin:0 4px 3px}
#su-tab .ee-con{background:#91e5bb}#su-tab .ee-sin{background:#f4c47f}
#su-tab .ee-card{margin:12px 0;padding:11px;background:linear-gradient(150deg,#27453b44,#101d1b55);border:1px solid #9ac9af38;border-radius:16px 4px 16px 4px}
#su-tab .ee-select{width:100%;display:block;text-align:left;background:none;border:0;color:#f1f5ed;font:600 13px/1.5 system-ui;cursor:pointer;padding:0 0 8px}
#su-tab .ee-select span{display:block;color:#a9c9bb;font:400 9px system-ui}
#su-tab .ee-select[aria-pressed=true]{color:#91e5bb}
#su-tab .ee-select:focus-visible,#su-tab summary:focus-visible{outline:2px solid #f4c47f;outline-offset:3px}
#su-tab .ee-card figure{margin:10px 0 14px}
#su-tab .ee-card figcaption{display:flex;flex-wrap:wrap;gap:3px 8px;align-items:baseline;font:400 11px/1.4 system-ui}
#su-tab .ee-card figcaption b{font-size:14px;color:#f1f5ed}#su-tab .ee-card figcaption small{font-size:9px;font-weight:400}
#su-tab .ee-card svg{display:block;width:100%;height:auto;overflow:visible}
#su-tab .ee-card svg text{fill:#b7cfc2;font:8px system-ui}
#su-tab .ee-values{font:400 9px/1.5 system-ui;color:#b7cfc2;margin:0}
#su-tab details{font:400 11px/1.6 system-ui;color:#d5e4dc}
#su-tab summary{cursor:pointer;padding:6px 0;color:#e6efe8}
#su-tab details a{color:#a8dcf5}
#su-tab .ee-formula{font-family:ui-monospace,monospace;background:#091b1555;padding:8px;border-radius:8px}
#su-tab .ee-pendiente,#su-tab .ee-vacio{color:#f4c47f;font-size:10px}
#su-tab .ee-species{padding:7px 0;border-bottom:1px solid #ffffff1a}
#su-tab .ee-species b,#su-tab .ee-species span{display:block}
#su-tab .ee-clear{font:400 10px system-ui;color:#c4d8cf;border:1px solid #9ac9af38;border-radius:6px;background:#152a2266;padding:5px 8px;cursor:pointer;margin-top:6px}
`;
