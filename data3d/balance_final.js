const HORIZONTE=780;
const grupos=[
 {n:'Ecocentrismo',regla:'habitat',local:'Pérdida',principal:'presencia',signo:1,falta:'Abundancias individuales para Shannon y balance hídrico volumétrico.',metricas:{presencia:'Presencia especie × parche (%)',riqueza:'Riqueza de fauna (especies)',red:'Interacciones potenciales (enlaces)',conectados:'Continuidad (%)',verde:'Superficie verde (ha)',atropellos:'Atropellos (eventos/semana)',ruido:'Ruido medio (dB)',incidencia:'Shannon por ocupación de parches (nats)'}},
 {n:'Circularidad de recursos',regla:'residuos',local:'Almacenamiento',principal:'saturacion',signo:-1,falta:'Concentraciones de nutrientes del compost.',metricas:{organicos:'Orgánicos generados (t/día)',tratados:'Tratados (t/día)',pendientes:'Pendientes (t)',capacidadAlmacen:'Almacenamiento disponible (t)',saturacion:'Saturación (%)',capTratamiento:'Capacidad de planta (t/día)',aprovechamiento:'Aprovechamiento (%)',compost:'Compost producido (t/día)',retorno:'Retorno a huertas (t/día)'}},
 {n:'Comercio ecológico',regla:'abasto',local:'Cobertura',principal:'cobertura',signo:1,falta:'Recorridos peatonales por origen y mercado para acceso en 15 minutos.',metricas:{produccion:'Producción (t/día)',demanda:'Demanda alimentaria (t/día)',cobertura:'Cobertura (%)',autonomia:'Autonomía directa (%)',acopio:'Excedente acopiado (t/día)',concentracion:'Participación de Corabastos (%)'}}];
const keys=grupos.flatMap(g=>Object.keys(g.metricas));
const numero=v=>Number.isFinite(v)?v.toLocaleString('es-CO',{maximumFractionDigits:2}):'Sin dato';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fecha=w=>'semana '+w+' · año '+Math.ceil(w/52);
function resumen({sim,def,H,go,semilla,parametros,definiciones}){
 const otra=definiciones.find(s=>s.par===def.par&&s.id!==sim);
 const externos=Object.fromEntries(Object.entries(parametros).filter(([k])=>otra?.sliders?.some(s=>s.k===k)).sort(([a],[b])=>a.localeCompare(b)));
 const firma=JSON.stringify([def.par,semilla,externos,HORIZONTE,1]);
 const colapsos=[],serie=H.map(h=>{
 const t=h.evaluacion.territorio;
 for(const p of t.alertas)if(p.semanas===4)colapsos.push({sem:h.sem,inicio:p.inicio,n:p.n,x:p.x,z:p.z,indicador:p.indicador,valor:p.valor,especies:p.afectadas});
 const row={sem:h.sem};for(const k of keys)row[k]=t[k]??null;
 row.ruido=h.ruidoDb;row.incidencia=h.biodiversidad?.shannon??null;return row;});
 const fin=H.at(-1);
 return {id:firma+'|'+sim,firma,sim,par:def.par,propuesta:!!def.propuesta,n:def.n,semilla,parametros,externos,horizonte:HORIZONTE,sem:fin.sem,go,contexto:{sectoresCriticos:fin.evaluacion.territorio.sectores.filter(s=>s.valor<80).map(s=>s.n),estaciones:fin.evaluacion.territorio.estaciones.filter(s=>s.valor>100).map(s=>s.n)},colapsos,serie,mercados:(fin.abasto?.mercados||[]).map(p=>({n:p.n,t:p.t_dia})),alertas:fin.evaluacion.territorio.alertas.map(p=>({n:p.n,indicador:p.indicador,semanas:p.semanas,valor:p.valor})),guardado:Date.now()};
}
function estado(r,g){
 if(r.go?.regla===g.regla)return 'Game Over general';
 if(r.colapsos.some(p=>p.indicador.startsWith(g.local)))return 'Colapso localizado registrado';
 if(r.serie.some(p=>Number.isFinite(p[g.principal])&&(g.regla==='habitat'?p.presencia<=70:g.regla==='residuos'?p.saturacion>100:p.cobertura<80)))return 'Umbral distrital alcanzado durante el periodo';
 if(r.alertas.some(p=>p.indicador.startsWith(g.local)))return 'Alerta local activa';
 const ult=r.serie.slice(-39);
 if(ult.length<39)return 'No concluyente: periodo corto';
 const medias=[0,13,26].map(i=>{const a=ult.slice(i,i+13).map(p=>p[g.principal]);return a.every(Number.isFinite)?g.signo*a.reduce((v,n)=>v+n,0)/13:null;});
 if(medias.some(v=>v===null))return 'No concluyente: datos incompletos';
 if(medias[0]>medias[1]+1e-6&&medias[1]>medias[2]+1e-6)return 'Deterioro progresivo del indicador principal';
 return r.sem===HORIZONTE?'Función principal mantenida durante el horizonte':'No concluyente: horizonte incompleto';
}
function causas(r){
 if(!r.go)return '';
 const ult=r.serie.slice(-4),g=grupos.find(g=>g.regla===r.go.regla);
 const secuencia=ult.map(p=>numero(p[g.principal])+' %').join(' → ');
 const x=ult.at(-1);
 if(g.regla==='abasto')return 'Demanda de '+numero(x.demanda)+' t/día; producción de '+numero(x.produccion)+' t/día. Sectores deficitarios al cierre: '+(r.contexto.sectoresCriticos.join(', ')||'sin desglose')+'. Cobertura: '+secuencia;
 if(g.regla==='residuos')return 'Inventario pendiente: '+numero(x.pendientes)+' t para '+numero(x.capacidadAlmacen)+' t de almacenamiento. Plantas por encima de su capacidad: '+(r.contexto.estaciones.join(', ')||'ninguna identificada')+'. Saturación distrital: '+secuencia;
 return 'Presencia especie × parche frente al inicio: '+secuencia+'. El registro local identifica los hábitats y las especies ausentes.';
}
function comparar(a,b){
 const w=Math.min(a.sem,b.sem),base=a.serie.find(p=>p.sem===w),prop=b.serie.find(p=>p.sem===w);
 const lugar=r=>new Set(r.colapsos.filter(p=>p.sem<=w).map(p=>p.indicador+' · '+p.n));
 const A=lugar(a),B=lugar(b);
 return ['Comparación hasta '+fecha(w),...grupos.map(g=>g.n+' · '+g.metricas[g.principal]+': sin '+numero(base[g.principal])+', con '+numero(prop[g.principal])+', diferencia '+numero(prop[g.principal]-base[g.principal])),
 ...grupos.map(g=>{const delta=(prop[g.principal]-base[g.principal])*g.signo;return g.n+': '+(Math.abs(delta)<1e-6?'sin diferencia medible':delta>0?'menor presión sobre el umbral':'mayor presión sobre el umbral')+' en la última semana común.';}),
 'Primer colapso local: sin '+(a.colapsos[0]?fecha(a.colapsos[0].sem):'ninguno en la ejecución')+' / con '+(b.colapsos[0]?fecha(b.colapsos[0].sem):'ninguno en la ejecución'),
 'Game Over: sin '+(a.go?fecha(a.go.sem):'ninguno en la ejecución')+' / con '+(b.go?fecha(b.go.sem):'ninguno en la ejecución'),
 'Colapsos solo sin propuesta: '+([...A].filter(x=>!B.has(x)).join(', ')||'ninguno')+'.',
 'Colapsos solo con propuesta: '+([...B].filter(x=>!A.has(x)).join(', ')||'ninguno')+'.'];
}
async function archivo(r){
 const db=await new Promise((res,rej)=>{const op=indexedDB.open('bavaria-informes-v1',1);op.onupgradeneeded=()=>op.result.createObjectStore('corridas',{keyPath:'id'});op.onsuccess=()=>res(op.result);op.onerror=()=>rej(op.error);});
 try{return await new Promise((res,rej)=>{const tx=db.transaction('corridas','readwrite'),s=tx.objectStore('corridas');if(r.sem===HORIZONTE||r.go)s.put(r);const q=s.getAll();tx.oncomplete=()=>res(q.result);tx.onerror=tx.onabort=()=>rej(tx.error);});}finally{db.close()}
}
function descargar(data,nombre,tipo){const url=URL.createObjectURL(new Blob([data],{type:tipo})),a=document.createElement('a');a.href=url;a.download=nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function trayectoria(rows,k){
 const vs=rows.map(p=>p[k]).filter(Number.isFinite);if(!vs.length)return 'Sin dato';
 const lo=Math.min(...vs),hi=Math.max(...vs);
 return '<svg viewBox="0 0 300 56" role="img" aria-label="Serie semanal"><path stroke="#add65d" stroke-width="1.6" fill="none" d="'+rows.filter(p=>Number.isFinite(p[k])).map((p,i)=>(i?'L':'M')+(3+294*(p.sem-1)/Math.max(1,rows.at(-1).sem-1)).toFixed(1)+' '+(50-44*(p[k]-lo)/(hi-lo||1)).toFixed(1)).join(' ')+'"/></svg>';
}
export async function adjuntarBalance(root,args){
 const r=resumen(args),section=document.createElement('section');section.className='i2-sec';root.insertBefore(section,root.children[1]||null);
 section.innerHTML='<h2>Balance de sostenibilidad</h2><p>'+safe(r.n)+' · '+(r.propuesta?'Con Bavaria Común':'Sin propuesta')+' · '+fecha(r.sem)+' · semilla '+r.semilla+'</p><p>Umbrales de prueba: cobertura &lt;80 %, almacenamiento &gt;100 % o pérdida de presencia ≥30 %. Una a tres semanas dan alerta. Cuatro consecutivas en el mismo lugar confirman colapso local. Cuatro consecutivas en el agregado de Kennedy terminan la corrida.</p>'+
 (r.go?'<p><b>Game Over · Kennedy</b> · '+safe(r.go.motivo)+' · '+fecha(r.go.sem)+' · valor '+numero(r.go.valor)+' %. Incumplimiento desde la semana '+(r.go.sem-3)+'. '+safe(causas(r))+'</p>':'')+
 '<p>Primer colapso local: '+(r.colapsos[0]?safe(r.colapsos[0].n)+' · '+fecha(r.colapsos[0].sem):'ninguno registrado')+'</p>'+
 grupos.map(g=>'<h3>'+g.n+' · '+estado(r,g)+'</h3><p>'+safe(g.metricas[g.principal])+': '+numero(r.serie[0][g.principal])+' → '+numero(r.serie.at(-1)[g.principal])+'. Falta para la evaluación completa: '+g.falta+'</p>').join('')+
 '<p>Parámetros para revisar según la función afectada: '+grupos.filter(g=>/Colapso|Game Over|Deterioro|Umbral|Alerta/.test(estado(r,g))).map(g=>g.regla==='abasto'?'demanda y capacidad de entrega por sector':g.regla==='residuos'?'inventario pendiente, recogida y capacidad de planta':'calidad de hábitat y ocupación inicial por especie').join(' · ')+(grupos.every(g=>!/Colapso|Game Over|Deterioro|Umbral|Alerta/.test(estado(r,g)))?'sin señal crítica en estas reglas.':'.')+'</p>'+
 '<p>El deterioro se señala cuando empeoran tres medias consecutivas de 13 semanas del indicador principal. La conclusión se limita a las funciones medidas.</p>'+
 '<label>Trayectoria semanal <select>'+grupos.map(g=>'<optgroup label="'+g.n+'">'+Object.entries(g.metricas).map(([k,n])=>'<option value="'+k+'">'+n+'</option>').join('')+'</optgroup>').join('')+'</select></label><div data-curva></div><label>Semana <input type="range" min="1" max="'+r.sem+'" value="'+r.sem+'"></label> <output></output>'+
 '<details><summary>Colapsos locales y territorio</summary>'+r.colapsos.map(p=>'<p>'+fecha(p.sem)+' · '+safe(p.n)+' · '+safe(p.indicador)+' · '+numero(p.valor)+' %'+(p.especies?.length?' · ausentes: '+safe(p.especies.join(', ')):'')+'</p>').join('')+'</details>'+
 '<details><summary>Distribución final por mercado</summary>'+r.mercados.map(p=>'<p>'+safe(p.n)+' · '+numero(p.t)+' t/día</p>').join('')+'</details>'+
 '<details><summary>Configuración utilizada</summary>'+Object.entries(r.parametros).map(([k,v])=>'<p>'+safe(k)+' = '+numero(v)+'</p>').join('')+'</details><button data-json>Descargar datos y configuración</button> <button data-pdf>Descargar PDF</button><div data-pares></div>';
 const select=section.querySelector('select'),slider=section.querySelector('input'),output=section.querySelector('output');
 const leer=()=>{const p=r.serie.find(v=>v.sem===+slider.value);output.textContent='Semana '+slider.value+' · '+numero(p?.[select.value]);};
 select.onchange=()=>{section.querySelector('[data-curva]').innerHTML=trayectoria(r.serie,select.value);leer()};slider.oninput=leer;select.onchange();
 section.querySelector('[data-json]').onclick=()=>descargar(JSON.stringify(r),'kennedy-sim-'+r.sim+'.json','application/json');
 let conclusiones=[];
 section.querySelector('[data-pdf]').onclick=()=>pdf('Bavaria Comun - simulacion '+r.sim,[r],conclusiones);
 const box=section.querySelector('[data-pares]');
 try{const all=await archivo(r),other=all.find(p=>p.firma===r.firma&&p.propuesta!==r.propuesta);
 if(other){conclusiones=r.propuesta?comparar(other,r):comparar(r,other);}
 box.innerHTML='<h3>Comparación con la pareja</h3>'+ (conclusiones.length?conclusiones.map(p=>'<p>'+safe(p)+'</p>').join(''):'Falta una ejecución finalizada de la pareja con la misma semilla y configuración compartida.');
 const pares=[];for(let par=1;par<=6;par++){const candidatas=all.filter(p=>p.par===par&&!p.propuesta).sort((a,b)=>b.guardado-a.guardado);for(const a of candidatas){const b=all.find(p=>p.firma===a.firma&&p.propuesta);if(b){pares.push([a,b]);break;}}}
 box.insertAdjacentHTML('beforeend','<p>Pares completos guardados en este navegador: '+pares.length+' de 6.</p>');
 if(pares.length===6){const general=pares.flatMap(([a,b])=>['Par '+a.par,...comparar(a,b)]);box.insertAdjacentHTML('beforeend','<details><summary>Informe general de los seis pares</summary>'+general.map(p=>'<p>'+safe(p)+'</p>').join('')+'</details><button data-general>Descargar informe general PDF</button>');box.querySelector('[data-general]').onclick=()=>pdf('Bavaria Comun - seis pares',pares.flat(),general);}
 }catch{box.textContent='Almacenamiento local no disponible. Puedes descargar los resultados de esta ejecución.'}
}
function pdf(titulo,runs,comparaciones){
 const pages=[];let commands='',y=775;
 const clean=s=>String(s).replace(/×/g,'x').replace(/→/g,' a ').replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/[–—]/g,'-');
 const hex=s=>Array.from(clean(s),c=>Math.min(255,c.charCodeAt(0)).toString(16).padStart(2,'0')).join('');
 function page(){if(commands)pages.push(commands);commands='0.14 0.18 0.15 rg 0 790 595 52 re f\nBT /F 14 Tf 0.85 1 0.3 rg 36 811 Td <'+hex(titulo)+'> Tj ET\n';y=768;}
 function line(s,size=10){for(const part of clean(s).match(/.{1,87}(?:\s|$)|.{1,87}/g)||['']){if(y<55)page();commands+='BT /F '+size+' Tf 0.13 0.17 0.14 rg 36 '+y+' Td <'+hex(part)+'> Tj ET\n';y-=size+5;}}
 function chart(rows,k){const vs=rows.map(p=>p[k]).filter(Number.isFinite);if(!vs.length)return;if(y<112)page();const lo=Math.min(...vs),hi=Math.max(...vs);commands+='0.26 0.42 0.12 RG 1 w\n';let pen=false;
 for(const p of rows){if(!Number.isFinite(p[k])){pen=false;continue;}commands+=(36+503*(p.sem-1)/Math.max(1,rows.at(-1).sem-1)).toFixed(2)+' '+(y-40+37*(p[k]-lo)/(hi-lo||1)).toFixed(2)+(pen?' l\n':' m\n');pen=true;}commands+='S\n';y-=53;line('Semanas 1-'+rows.at(-1).sem+'   |   min. '+numero(lo)+'   max. '+numero(hi),8);}
 page();
 for(const r of runs){line('Prueba '+r.sim+' - '+r.n,15);line((r.propuesta?'Con Bavaria Comun':'Sin propuesta')+' | '+fecha(r.sem)+' | semilla '+r.semilla);
 line(r.go?'Game Over en Kennedy: '+r.go.motivo+' ('+numero(r.go.valor)+' %)':'Sin Game Over durante el periodo observado.');
 if(r.go)line(causas(r));
 line('Umbrales de prueba, 4 semanas consecutivas: cobertura <80 %, almacenamiento >100 %, presencia <=70 % del inicio. El agregado de Kennedy define el cierre general.');
 for(const g of grupos){line(g.n+': '+estado(r,g),12);line('Informacion faltante: '+g.falta);for(const [k,n] of Object.entries(g.metricas)){line(n+' | semana 1: '+numero(r.serie[0][k])+' | final: '+numero(r.serie.at(-1)[k]));chart(r.serie,k);}}
 line('Incidentes territoriales',13);for(const p of r.colapsos)line(fecha(p.sem)+' | '+p.n+' | '+p.indicador+' | '+numero(p.valor)+' % '+(p.especies||[]).join(', '));
 line('Mercados: toneladas por dia',12);for(const m of r.mercados)line(m.n+': '+numero(m.t));
 line('Configuracion para repetir la prueba',12);for(const [k,v] of Object.entries(r.parametros))line(k+' = '+v);
 }
 for(const s of comparaciones)line(s);pages.push(commands);
 const objs=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(4+2*i)+' 0 R').join(' ')+'] >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
 pages.forEach((p,i)=>{objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F 3 0 R >> >> /Contents '+(5+2*i)+' 0 R >>','<< /Length '+p.length+' >>\nstream\n'+p+'endstream');});
 let file='%PDF-1.4\n';const offsets=[0];objs.forEach((o,i)=>{offsets.push(file.length);file+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const start=file.length;
 file+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 descargar(file,titulo+'.pdf','application/pdf');
}