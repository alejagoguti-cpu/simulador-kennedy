// Composición URBIA sobre los controles existentes; no altera el modelo.
if(document.documentElement.classList.contains('limpio')){
 const dock=document.createElement('div');dock.id='urbia-response';document.body.append(dock);
 const hero=document.createElement('section');hero.id='urbia-context';
 hero.innerHTML='<span class="ur-kicker">LABORATORIO TERRITORIAL / KENNEDY</span><h1>Relaciones<br><em>ecológicas</em></h1><p>Explora cómo cambia el territorio con la propuesta arquitectónica durante 15 años.</p><div class="ur-purpose"><span>↗</span><div><b>Objetivo</b><p>Comparar los escenarios y observar si sus relaciones se sostienen en el tiempo.</p></div></div>';
 document.body.append(hero);
 const nav=document.createElement('div');nav.id='urbia-nav';nav.innerHTML='<span>KENNEDY 3D</span><b>PRUEBAS</b><span>HORIZONTE · 15 AÑOS</span>';document.body.append(nav);
 const network=document.createElement('button');network.id='urbia-network';network.textContent='Red biótica ↗';network.setAttribute('aria-expanded','false');network.setAttribute('aria-controls','lp-der');network.onclick=()=>{const on=document.body.classList.toggle('ur-network-open');network.setAttribute('aria-expanded',String(on));};document.body.append(network);
 const refresh=()=>{
 const bar=document.querySelector('#lp-anos .tit');
 if(bar&&bar.textContent!=='Escoge una simulación')hero.querySelector('h1').innerHTML='Prueba del<br><em></em>',hero.querySelector('em').textContent=bar.textContent;
 const esc=document.getElementById('lp-esc');
 if(esc&&!esc.dataset.urbia){esc.dataset.urbia='true';esc.setAttribute('aria-label','Escenarios de comparación');
 const a=esc.querySelector('[data-e="hoy"]'),b=esc.querySelector('[data-e="con"]');
 if(a)a.innerHTML='<span class="ur-scenario-icon">◉</span><span><b>Sin propuesta</b><small>Configuración actual de Kennedy</small></span>';
 if(b)b.innerHTML='<span class="ur-scenario-icon">⌁</span><span><b>Con propuesta</b><small>Intervención arquitectónica</small></span>';
 }
 };refresh();setInterval(refresh,1000);
}
