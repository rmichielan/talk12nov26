/* One seeded proposal trace, two presentation speeds.
 * Reveal 1: one waiting time, then slow independent endpoint draws; hold.
 * Reveal 2: all remaining waiting times, with simultaneous endpoint animations.
 * Pacing stretches events for teaching; the sampled construction times are unchanged.
 */
const controller_12_one_clock=IRGScenes.create(13,(root,d)=>{
 const graph=new IRGViz.Graph(root.querySelector('#graph13'),d.w);
 const clock=IRGViz.clock(root.querySelector('#clock13'));
 const slots=IRGViz.slots(root.querySelector('#slots13'),d.w);
 const many=root.querySelector('#many13');many.innerHTML='';
 for(let i=0;i<45;i++){
  const s=E('svg',{viewBox:'0 0 40 40'},many);
  E('circle',{cx:20,cy:20,r:15,fill:'#fff',stroke:'#c5a374','stroke-width':2},s);
  E('path',{d:'M20 9V20L28 25',fill:'none',stroke:'#b08042','stroke-width':2},s);
 }
 return {root,d,graph,clock,slots,status:root.querySelector('#status13'),fusion:null,dispose(){this.fusion?.remove();}};
},(c,s)=>{
 const {d,graph,clock,slots,status,root}=c,events=d.stream.events;
 const clamp01=x=>Math.max(0,Math.min(1,x));
 c.fusion?.remove();c.fusion=null;slots.reset();clock.set(0);graph.highlightNodes([]);
 root.dataset.arrivals='0';root.dataset.streamMode=s===1?'guided':s===2?'automatic':'static';root.dataset.running='false';
 const edgesUntil=count=>new Set(events.slice(0,count).filter(e=>e.i!==e.j).map(e=>e.key));
 const setClock=t=>{clock.set(t);root.dataset.constructionTime=t.toFixed(8);};
 const settle=count=>{
  const e=events[count-1];graph.setEdges(edgesUntil(count));graph.highlightNodes([]);root.dataset.arrivals=count;
  if(e){setClock(e.t);slots.draw(0,e.i,1);slots.draw(1,e.j,1);}
 };
 const explain=e=>e.type==='loop'?'Loop: discard.':e.type==='duplicate'?'Repeated pair: keep the existing edge.':'Insert the edge.';
 if(s===0){graph.setEdges(d.stream.edges);status.textContent='The same pair clocks, plus auxiliary loop proposals.';return;}
 if(s>=3){graph.setEdges(d.stream.edges);setClock(1);root.dataset.arrivals=events.length;status.textContent=`${events.length} proposals; ${d.stream.edges.size} simple edges.`;return;}
 if(events.length===0){graph.setEdges([]);setClock(1);status.textContent='No proposals in this realisation.';return;}
 root.dataset.running='true';
 if(s===1){
  graph.setEdges([]);
  const e=events[0],fusion=root.querySelector('#many13').cloneNode(true);fusion.removeAttribute('id');fusion.classList.add('fusion-clocks');root.querySelector('.irg-clock-mechanism').append(fusion);c.fusion=fusion;
  IRGScenes.play(6.8,f=>{
   const elapsed=f*6.8,waiting=clamp01((elapsed-.6)/2.3),drawI=clamp01((elapsed-3.25)/1.35),drawJ=clamp01((elapsed-4.75)/1.35);
   const fusionProgress=clamp01(elapsed/.65);
   fusion.style.opacity=String(1-fusionProgress);fusion.style.transform=`scale(${1-.75*fusionProgress})`;fusion.style.transformOrigin='50% 22%';
   if(elapsed<2.9){setClock(e.t*waiting);slots.idle(0);slots.idle(1);graph.setEdges([]);graph.highlightNodes([]);status.textContent='Waiting for the first proposal.';root.dataset.phase='waiting';}
   else {
    clock.set(e.t,elapsed<3.25);root.dataset.constructionTime=e.t.toFixed(8);root.dataset.phase=elapsed<3.25?'ring':elapsed<4.75?'draw-i':elapsed<6.1?'draw-j':'hold';
    if(elapsed<3.25){slots.idle(0);slots.idle(1);status.textContent=`t = ${e.t.toFixed(3)}: the clock rings.`;}
    else {slots.draw(0,e.i,drawI);if(elapsed<4.75){slots.idle(1);status.textContent='Draw the first endpoint from the weighted distribution.';}else{slots.draw(1,e.j,drawJ);status.textContent='Independently draw the second endpoint from the same distribution.';}}
    graph.highlightNodes(elapsed<4.6?[]:elapsed<6.1?[e.i]:[e.i,e.j]);
    if(elapsed>=6.1){graph.setEdges(edgesUntil(1),e.i!==e.j?{[e.key]:'new'}:{});root.dataset.arrivals=1;status.textContent=`(${e.i+1}, ${e.j+1}). ${explain(e)}`;}
   }
   if(f===1){settle(1);root.dataset.phase='hold';root.dataset.running='false';fusion.style.display='none';}
  });
  return;
 }
 // Reveal 2 begins with the first event completed, never resamples it.
 settle(1);
 let at=0;const schedule=[];
 for(let i=1;i<events.length;i++){
  const wait=Math.max(.2,Math.min(1.35,9*(events[i].t-events[i-1].t)));
  schedule.push({i,start:at,wait,end:at+wait+.7});at+=wait+.7;
 }
 const tail=Math.max(.35,Math.min(1.1,9*(1-events.at(-1).t))),duration=at+tail;
 IRGScenes.play(duration,f=>{
  const elapsed=f*duration,item=schedule.find(x=>elapsed<x.end);
  if(!item){settle(events.length);setClock(events.at(-1).t+(1-events.at(-1).t)*clamp01((elapsed-at)/tail));root.dataset.phase='complete';status.textContent=`${events.length} proposals; ${d.stream.edges.size} edges. Same final graph.`;}
  else {
   const e=events[item.i],prev=events[item.i-1],local=elapsed-item.start;
   graph.setEdges(edgesUntil(item.i));root.dataset.arrivals=item.i;
   if(local<item.wait){setClock(prev.t+(e.t-prev.t)*local/item.wait);slots.draw(0,prev.i,1);slots.draw(1,prev.j,1);graph.highlightNodes([]);root.dataset.phase='waiting';status.textContent=`t = ${(+root.dataset.constructionTime).toFixed(3)}`;}
   else{
    const progress=clamp01((local-item.wait-.1)/.42);clock.set(e.t,progress<.3);root.dataset.constructionTime=e.t.toFixed(8);slots.draw(0,e.i,progress);slots.draw(1,e.j,progress);root.dataset.phase='draw-both';
    status.textContent=`t = ${e.t.toFixed(3)}: draw two independent endpoints.`;
    if(progress===1){graph.setEdges(edgesUntil(item.i+1),e.i!==e.j?{[e.key]:'new'}:{});graph.highlightNodes([e.i,e.j]);root.dataset.arrivals=item.i+1;status.textContent=`(${e.i+1}, ${e.j+1}). ${explain(e)}`;}
   }
  }
  if(f===1){settle(events.length);setClock(1);root.dataset.running='false';}
 });
});
