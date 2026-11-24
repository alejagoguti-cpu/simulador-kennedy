/* Diagramas del tablero: solo representan datos del modelo; no alteran la simulación.
   Referencias: https://www.visualcinnamon.com/resources/learning-data-visualization/
   Comparación temporal: https://observablehq.github.io/plot/marks/difference
   SVG accesible: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/title */
const ok = v => typeof v === 'number' && Number.isFinite(v);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => ok(v) ? v.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—';
const clamp = v => Math.max(0, Math.min(1, v));
const C = ['#a8e5b5', '#d4bcf5', '#8ad9e5', '#f2c680', '#f3a9bd'];
const D = [['integridad','Integridad'],['biodiversidad','Biodiversidad'],['abioticos','Agua y suelo'],['limites','No regresión'],['gobernanza','Gobernanza']];
const svg = (w,h,label,body,cls='eco-vis') => '<svg class="'+cls+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+esc(label)+'"><title>'+esc(label)+'</title>'+body+'</svg>';
const p = (cx,cy,r,a) => [cx+r*Math.cos(a),cy+r*Math.sin(a)];
const xy = a => a.map(v=>v.toFixed(2)).join(' ');
const arc = (cx,cy,r,start,sweep) => { const a=p(cx,cy,r,start), b=p(cx,cy,r,start+sweep/2), c=p(cx,cy,r,start+sweep); return 'M'+xy(a)+' A'+r+' '+r+' 0 0 1 '+xy(b)+' A'+r+' '+r+' 0 0 1 '+xy(c); };
const txt = (x,y,s,size=10,col='#c9d6d7',anchor='middle') => '<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+col+'" text-anchor="'+anchor+'">'+esc(s)+'</text>';
const estado = v => v >= 70 ? ['Sano','#a8e5b5'] : v >= 45 ? ['En riesgo','#f2c680'] : ['Crítico','#ff9d97'];

export function florEco(E, B) {
  if (!E) return '<p class="eco-nota">Esperando datos del modelo.</p>';
  const cx=150,cy=113,base=31,span=50, idx=ok(E.indice)?Math.round(E.indice*100):null;
  const [word,color]=idx==null?['Sin dato','#c9d6d7']:estado(idx);
  const petal=(a,q)=>{const r=base+span*q, s=p(cx,cy,base,a-.23), e=p(cx,cy,base,a+.23), tip=p(cx,cy,r,a), l=p(cx,cy,base+span*q*.7,a-.37), rr=p(cx,cy,base+span*q*.7,a+.37);return 'M'+xy(s)+' Q'+xy(l)+' '+xy(tip)+' Q'+xy(rr)+' '+xy(e)+' Z';};
  const pos=[[150,12],[249,68],[222,218],[78,218],[51,68]];
  let body=[.5,1].map(q=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+(base+span*q)+'" fill="none" stroke="#b8d2ca" stroke-opacity=".12" stroke-dasharray="2 5"/>').join('');
  D.forEach(([k,label],i)=>{
    const a=-Math.PI/2+i*Math.PI*2/5, value=ok(E[k])?E[k]:null, b=B&&ok(B[k])?B[k]:null, [lx,ly]=pos[i];
    body+='<g><title>'+esc(label+': '+(value==null?'sin dato':num(value*100)+' de 100')+(b==null?'':'; sin propuesta '+num(b*100)))+'</title><path d="'+petal(a,1)+'" fill="'+C[i]+'" fill-opacity=".05" stroke="'+C[i]+'" stroke-opacity=".25"/>';
    if(value!=null) {
      const dot=p(cx,cy,base+span*clamp(value),a);
      body+='<path d="'+petal(a,clamp(value))+'" fill="'+C[i]+'" fill-opacity=".4" stroke="'+C[i]+'" stroke-width="1.2"/><circle cx="'+dot[0]+'" cy="'+dot[1]+'" r="2.8" fill="'+C[i]+'"/>';
    }
    if(b!=null) {const [x,y]=p(cx,cy,base+span*clamp(b),a);body+='<path d="M'+x+' '+(y-4)+' l4 4 -4 4 -4 -4 Z" fill="#172725" stroke="#fff" stroke-width="1.2"/>';}
    body+=txt(lx,ly,label,9.5)+txt(lx,ly+14,value==null?'—':num(value*100),12,C[i])+'</g>';
  });
  body+='<circle cx="'+cx+'" cy="'+cy+'" r="29" fill="#142523" stroke="#bed6ce" stroke-opacity=".25"/>'+txt(cx,cy+5,idx==null?'—':idx,24,'#f0f5ed')+txt(cx,cy+18,'/ 100',8);
  return '<div class="eco-flor-head"><span>Estado del ecosistema</span><b style="color:'+color+'">'+word+'</b></div>'+svg(300,240,'Índice ecocéntrico '+(idx==null?'sin dato':idx+' de 100')+'. '+D.map(([k,n])=>n+': '+(ok(E[k])?num(E[k]*100):'sin dato')).join('; '),body,'eco-flor')+'<p class="eco-nota">Cada pétalo: 0 en su base → 100 en el borde.'+(B?' ◇ Sin propuesta, misma semana.':'')+'</p>';
}
function ring(cx,cy,r,value,color) {
  const q=ok(value)?clamp(value):0;
  return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-opacity=".14" stroke-width="5"/>'+(q>0?'<path d="'+arc(cx,cy,r,-Math.PI/2,q*Math.PI*2)+'" fill="none" stroke="'+color+'" stroke-width="5"/>':'');
}
export function datoEco(k,I,v) {
  if(!ok(v)) return '<p class="eco-nota">Sin datos</p>';
  if(k==='biodiv' && I.biodiversidad && I.biodiversidad.gruposFuncionales) {
    const groups=Object.entries(I.biodiversidad.gruposFuncionales), names={polinizadores:'Poliniz.',dispersores:'Dispers.',depredadores:'Depred.',descomponedores:'Descomp.'};
    const body=groups.map(([key,g],i)=>{const x=20+i*39, q=g.total>0?g.presentes/g.total:null;return '<g><title>'+esc(key+': '+g.presentes+' de '+g.total+' especies')+'</title>'+ring(x,23,13,q,C[i%5])+txt(x,26,g.total>0?g.presentes+'/'+g.total:'—',7.5)+txt(x,48,names[key]||key,7.5)+'</g>';}).join('');
    return svg(160,55,'Especies presentes por grupo funcional; los grupos pueden compartir especies',body)+'<p class="eco-nota">Especies presentes / posibles por función.</p>';
  }
  if(k==='ciclos' && I.ciclos && I.ciclos.ref) {
    const c=I.ciclos, r=c.ref, ratios=[r.carbono>0?c.carbono/r.carbono:null,c.nutrientes/.5,r.agua>0?c.agua/r.agua:null,r.suelo>0?c.suelo/r.suelo:null], labels=['Carbono','Nutrientes','Agua','Suelo'];
    return svg(160,55,'Componentes del índice de ciclos, normalizados de 0 a 100',ratios.map((v,i)=>{const x=20+i*39;return ring(x,23,13,v,C[i])+txt(x,26,ok(v)?Math.round(clamp(v)*100):'—',8)+txt(x,48,labels[i],7.5);}).join(''))+'<p class="eco-nota">0–100 · referencia del modelo.</p>';
  }
  if(k==='corredores'||k==='ruido'||k==='ciclos') {
    const color=k==='ruido'?C[1]:k==='ciclos'?C[2]:C[0], label=k==='corredores'?'Continuidad de la red':k==='ruido'?'Bienestar acústico':'Ciclos del territorio';
    let body=ring(80,33,23,v/100,color);
    for(let i=0;i<20;i++){const a=-Math.PI/2+i*Math.PI/10, [x,y]=p(80,33,31,a);body+='<circle cx="'+x+'" cy="'+y+'" r="1" fill="'+color+'" opacity=".45"/>';}
    body+=txt(80,36,'/ 100',9);
    return svg(160,70,label+': '+num(v)+' de 100',body);
  }
  if(k==='muertes') {
    const causes=Object.entries(I.muertes&&I.muertes.porCausa||{}).filter(([,v])=>ok(v)&&v>0), sum=causes.reduce((s,[,v])=>s+v,0), cols={colision:'#ff9d97',atropello:'#f2c680',ruido:'#d4bcf5',hambre_habitat:'#8ad9e5'};
    let body='<circle cx="80" cy="39" r="26" fill="none" stroke="#c9d6d7" stroke-opacity=".12" stroke-width="9"/>', off=0, L=2*Math.PI*26;
    for(const [k,n] of causes){body+='<path d="'+arc(80,39,26,-Math.PI/2+off/sum*Math.PI*2,n/sum*Math.PI*2)+'" fill="none" stroke="'+(cols[k]||'#bbc9c2')+'" stroke-width="9"><title>'+esc(k+': '+n)+'</title></path>';off+=n;}
    body+=txt(80,37,sum?'Causas':'Sin causas',9)+txt(80,49,sum?'del total':'registradas',8);
    return svg(160,78,'Distribución de las muertes registradas por causa',body);
  }
  // Conteos y toneladas: unidades agrupadas, nunca una falsa escala porcentual.
  const unit=Math.max(1,Math.ceil(Math.max(0,v)/24)), count=Math.min(24,Math.ceil(Math.max(0,v)/unit)), color=k==='residuos'?C[3]:k==='abejas'?C[3]:C[0];
  let body='';
  for(let i=0;i<count;i++){const row=Math.floor(i/8), x=9+(i%8)*19+(row%2)*4, y=12+row*15, fraction=clamp((v-i*unit)/unit);
    if(k==='abejas'){const points=Array.from({length:6},(_,j)=>xy(p(x,y,6,j*Math.PI/3))).join(' ');body+='<polygon points="'+points+'" fill="'+color+'" fill-opacity="'+(.18+.7*fraction)+'" stroke="'+color+'" stroke-width=".6"/>';}
    else if(k==='parches')body+='<path d="M'+(x-6)+' '+(y+5)+' Q'+(x-9)+' '+(y-7)+' '+(x+6)+' '+(y-5)+' Q'+(x+9)+' '+(y+7)+' '+(x-6)+' '+(y+5)+'" fill="'+color+'" fill-opacity="'+(.18+.7*fraction)+'"/>';
    else body+='<rect x="'+(x-6)+'" y="'+(y-5)+'" width="'+(12*fraction)+'" height="10" rx="2" fill="'+color+'" opacity=".75"/>';
  }
  if(!count)body=txt(80,30,'Sin registros todavía',9);
  const u=k==='residuos'?'t':k==='abejas'?'lugares':'parches';
  return svg(160,53,num(v)+' '+u+'. Cada símbolo representa hasta '+unit+' '+u,body)+'<p class="eco-nota">1 símbolo ≈ '+num(unit)+' '+u+'</p>';
}
export function cintaEco(a,b,v0,mejor,fin) {
  const W=160,H=54,left=25,right=157,top=8,bottom=40;
  const vals=a.concat(b,ok(v0)?[v0]:[]).filter(ok);
  if(!vals.length)return '<p class="eco-nota">Esperando historia.</p>';
  let lo=Math.min(...vals),hi=Math.max(...vals); const pad=(hi-lo||Math.max(1,Math.abs(hi)*.1))*.15; lo-=pad;hi+=pad;
  const X=i=>left+i*4/Math.max(4,fin)*(right-left), Y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top), ref=i=>b.length?(ok(b[i])?b[i]:null):(ok(v0)?v0:null);
  const path=arr=>{let s='',run=false;arr.forEach((v,i)=>{if(!ok(v)){run=false;return;}s+=(run?' L':' M')+X(i).toFixed(2)+' '+Y(v).toFixed(2);run=true;});return s;};
  let body='';
  const area=(x0,x1,v1,v2,r1,r2)=>{const good=((v1-r1)+(v2-r2))*mejor>=0;return '<path d="M'+x0+' '+Y(v1)+' L'+x1+' '+Y(v2)+' L'+x1+' '+Y(r2)+' L'+x0+' '+Y(r1)+' Z" fill="'+(good?'#a8e5b5':'#ff9d97')+'" fill-opacity=".27"/>';};
  for(let i=1;i<a.length;i++){const v1=a[i-1],v2=a[i],r1=ref(i-1),r2=ref(i);if(![v1,v2,r1,r2].every(ok))continue;
    const d1=v1-r1,d2=v2-r2,x0=X(i-1),x1=X(i);
    if(d1*d2<0){const t=d1/(d1-d2),x=x0+(x1-x0)*t,v=v1+(v2-v1)*t;body+=area(x0,x,v1,v,r1,v)+area(x,x1,v,v2,v,r2);}
    else body+=area(x0,x1,v1,v2,r1,r2);
  }
  const reference=b.length?b:a.map(()=>ok(v0)?v0:null);
  for(const year of [5,10,15,20].filter(y=>y*52<=fin)){const x=X(year*52/4);body+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+bottom+'" stroke="#c9d6d7" stroke-opacity=".1"/>';}
  body+='<path d="'+path(reference)+'" fill="none" stroke="#dce5df" stroke-opacity=".65" stroke-width="1" stroke-dasharray="3 3"/><path d="'+path(a)+'" fill="none" stroke="#e4eee4" stroke-width="1.5" stroke-linejoin="round"/>';
  let last=-1;for(let i=a.length-1;i>=0;i--)if(ok(a[i])){last=i;break;}
  if(last>=0)body+='<circle cx="'+X(last)+'" cy="'+Y(a[last])+'" r="2.5" fill="#f2c680"/>';
  body+=txt(1,12,num(hi),6.5,'#b9c7c3','start')+txt(1,40,num(lo),6.5,'#b9c7c3','start');
  body+=txt(left,52,'0',7,'#b9c7c3','start')+txt(right,52,num(fin/52)+' años',7,'#b9c7c3','end');
  return svg(W,H,'Evolución temporal. Línea continua: escenario actual. Punteada: '+(b.length?'sin propuesta':'año 1')+'. Verde: mejora; coral: empeora. Escala vertical propia de este indicador.',body,'eco-cinta');
}
export const ESTILO_ECO = `
  #su-tab .eco-flor { display:block; width:100%; height:auto; max-height:240px; overflow:visible; font-family:system-ui,sans-serif; }
  #su-tab .eco-flor-head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; margin:7px 0 0; font-size:11px; }
  #su-tab .eco-flor-head b { font-size:12px; font-weight:600; }
  #su-tab .eco-nota { color:#b9c7c3; font:400 9px/1.45 system-ui,sans-serif; margin:2px 0 5px; }
  #su-tab .eco-vis { display:block; width:100%; height:70px; margin:5px 0 0; font-family:system-ui,sans-serif; }
  #su-tab .eco-cinta { display:block; width:100%; height:54px; margin-top:5px; font-family:system-ui,sans-serif; }
  #su-tab .tb3-grid { gap:8px; }
  #su-tab .tb3-t { background:linear-gradient(155deg,rgba(151,196,171,.07),rgba(11,28,25,.28)); border-color:rgba(183,218,204,.16); border-radius:18px 5px 18px 5px; padding:10px; overflow:hidden; }
  #su-tab .tb3-t:hover { background:rgba(151,196,171,.13); border-color:rgba(183,218,204,.4); }
  #su-tab .tb3-t:focus-visible { outline:2px solid #f2c680; outline-offset:-2px; }
  #su-tab .tb3-t::before { display:none; }
  #su-tab .tb3-h span { white-space:normal; overflow:visible; font-size:11px; line-height:1.35; opacity:1; }
  #su-tab .tb3-t > b { font-family:system-ui,sans-serif; font-size:23px; font-weight:500; letter-spacing:-.05em; margin:5px 0; }
  #su-tab .tb3-t > small { color:#c9d6d7; opacity:1; font-size:9px; }
  #su-tab .tb3-st { display:block; }
  #su-tab .tb3-st span { display:block; line-height:1.5; margin-top:3px; }
  #su-tab .eco-key { display:flex; flex-wrap:wrap; gap:4px 10px; font:400 9px/1.5 system-ui,sans-serif; color:#c9d6d7; margin:5px 0 8px; }
  #su-tab .eco-key i { display:inline-block; width:9px; height:5px; margin-right:3px; }
  #su-tab .tb2-cl { line-height:1.45; opacity:1; }
  @media (max-width:360px) { #su-tab .tb3-grid { grid-template-columns:1fr; } }
`;
