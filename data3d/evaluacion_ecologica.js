// Métricas puras: no generan abundancias, especies ni resultados.
// PC: Saura & Pascual-Hortal (2007), doi:10.1016/j.landurbplan.2007.03.005.
// Transiciones: MacKenzie et al. (2003), doi:10.1890/02-3090.
export function shannon(abundancias) {
  if (!Array.isArray(abundancias) || abundancias.some(n => !Number.isFinite(n) || n < 0)) return null;
  const total = abundancias.reduce((a,b)=>a+b,0);
  return total ? -abundancias.reduce((h,n)=>n ? h+(n/total)*Math.log(n/total):h,0) : null;
}
export function transiciones(antes,ahora) {
  if (!antes || !ahora || antes.length !== ahora.length) throw Error('Estados incompatibles');
  let persistencias=0,colonizaciones=0,extinciones=0,vacios=0;
  for(let i=0;i<antes.length;i++) {
    if(antes[i]) {if(ahora[i])persistencias++;else extinciones++;}
    else {vacios++;if(ahora[i])colonizaciones++;}
  }
  const ocupados=persistencias+extinciones;
  return {persistencias,colonizaciones,extinciones,
    persistencia:ocupados?persistencias/ocupados:null,
    colonizacion:vacios?colonizaciones/vacios:null,
    extincion:ocupados?extinciones/ocupados:null};
}
export function probabilidadConectividad(parches,enlaces,areaPaisaje) {
  if(!(areaPaisaje>0))return null;
  const n=parches.length,ids=new Map(parches.map((p,i)=>[p.id,i]));
  if(ids.size!==n || parches.some(p=>!Number.isFinite(p.area)||p.area<0))throw Error('Parches inválidos');
  const P=Array.from({length:n},()=>new Float64Array(n));
  for(let i=0;i<n;i++)P[i][i]=1;
  for(const e of enlaces) {
    const i=ids.get(e.a),j=ids.get(e.b);
    if(i==null||j==null||!Number.isFinite(e.probabilidad)||e.probabilidad<0||e.probabilidad>1)throw Error('Enlace inválido');
    P[i][j]=Math.max(P[i][j],e.probabilidad);
    if(!e.dirigido)P[j][i]=Math.max(P[j][i],e.probabilidad);
  }
  // Máximo producto de probabilidades entre cada pareja; incluye rutas indirectas.
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)if(P[i][k])for(let j=0;j<n;j++)P[i][j]=Math.max(P[i][j],P[i][k]*P[k][j]);
  let suma=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)suma+=parches[i].area*parches[j].area*P[i][j];
  return suma/(areaPaisaje*areaPaisaje);
}
export function balanceCompost(circular) {
  if(!circular)return null;
  const retorno=(circular.flujos||[]).filter(f=>f.tipo==='compost').reduce((s,f)=>s+f.t_dia,0);
  return {organicos:circular.organicos_t_dia,procesados:circular.compostado_t_dia,retorno,
    fraccionProcesada:circular.organicos_t_dia>0?circular.compostado_t_dia/circular.organicos_t_dia:null,
    nutrientesKg:null,nota:'El modelo informa masa de material; faltan concentraciones de N, P y K.'};
}

export function redCompleta(parches,enlaces,areaPaisaje=3859) {
  const activos=parches.filter(p=>p.r>0), ids=new Set(activos.map(p=>p.id));
  const areas=activos.map(p=>({id:p.id,area:Math.PI*p.r*p.r/1e4}));
  const links=enlaces.filter(e=>ids.has(e.a)&&ids.has(e.b)).map(e=>({a:e.a,b:e.b,probabilidad:Math.max(0,Math.min(1,e.f))}));
  const area=areas.reduce((s,p)=>s+p.area,0);
  return {cantidad:activos.length,area,pc:probabilidadConectividad(areas,links,areaPaisaje),
    nucleo10:activos.reduce((s,p)=>s+Math.PI*Math.max(0,p.r-10)**2/1e4,0),
    nucleo30:activos.reduce((s,p)=>s+Math.PI*Math.max(0,p.r-30)**2/1e4,0),
    division:area?1-areas.reduce((s,p)=>s+(p.area/area)**2,0):null,
    parches:activos.map(p=>({id:p.id,n:p.n,x:p.x,z:p.z,r:p.r,area:Math.PI*p.r*p.r/1e4})),
    enlaces:enlaces.filter(e=>ids.has(e.a)&&ids.has(e.b)).map(e=>({x1:e.x1,z1:e.z1,x2:e.x2,z2:e.z2,f:e.f}))};
}
export function evaluarEstado(E,I,RED,PARCHES) {
  const N=PARCHES.length,occ=E.s.occ,prev=E.prev,porParche=[];
  for(let p=0;p<N;p++){
    let riqueza=0;for(let i=0;i<RED.NFA;i++)riqueza+=occ[i*N+p]?1:0;
    porParche.push({id:PARCHES[p].id,n:PARCHES[p].n,x:PARCHES[p].x,z:PARCHES[p].z,riqueza,
      hIncidencia:riqueza?Math.log(riqueza):null,shannonAbundancia:null});
  }
  const tr=transiciones(prev,occ),c=I.muertes&&I.muertes.porCausa||{};
  const especies=['abeja','mirla'].map(id=>{const i=RED.FI[id];if(i==null)return {id,disponible:false};
    const a=prev.slice(i*N,(i+1)*N),b=occ.slice(i*N,(i+1)*N);
    return {id,n:RED.FAUNA[i].n,disponible:true,...transiciones(a,b),ocupados:b.reduce((s,n)=>s+n,0),
      lugares:porParche.filter((p,j)=>b[j])};});
  especies.push({id:'cucarachero_pantano',n:'Cucarachero de pantano',disponible:false,
    motivo:'El inventario tiene un cucarachero genérico de hábitat arbolado; no confirma Cistothorus apolinari.'});
  const valid=porParche.filter(p=>p.hIncidencia!=null);
  return {sem:I.sem,diversidad:{hIncidencia:valid.length?valid.reduce((s,p)=>s+p.hIncidencia,0)/valid.length:null,
      riquezaMedia:porParche.reduce((s,p)=>s+p.riqueza,0)/N,porParche},
    polinizacion:{interacciones:I.abeja?I.abeja.interacciones:null,plantas:I.abeja?I.abeja.plantas.length:null,
      lugares:I.abeja?I.abeja.parches:null,huertas:I.huertas,red:I.red,reproduccionVegetal:null},
    paisaje:E.evaluacionRed||null,supervivencia:{...tr,colisiones:c.colision??null,atropellos:c.atropello??null,
      perdidasRuido:c.ruido??null,perdidasHabitat:c.hambre_habitat??null},
    nutrientes:balanceCompost(I.circular),especies};
}
