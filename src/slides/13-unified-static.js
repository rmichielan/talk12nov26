const controller_13_unified_static=IRGScenes.create(14,(root,d)=>({root,d,graph:new IRGViz.Graph(root.querySelector('#graph14'),d.w),status:root.querySelector('#status14')}),(c,s)=>{
 c.root.dataset.running='false';c.graph.highlightNodes([]);
 if(s===2){
  // A static partition illustration, not a sampled CL realisation.
  const pairs=c.d.cl.heavy.map(e=>e.key),highlight=Object.fromEntries(pairs.map(k=>[k,'focus']));
  c.graph.setEdges(pairs,highlight);
  for(const line of c.graph.lines.values()){line.setAttribute('stroke-dasharray','7 6');line.dataset.candidate='true';}
  c.status.textContent=`${pairs.length} high-intensity pairs (candidates, not sampled edges).`;
  return;
 }
 const info=s===0?{trace:c.d.stream.events.map(e=>({...e,accepted:e.i!==e.j,phase:'proposals'})),edges:c.d.stream.edges}:s===1?c.d.grg:c.d.cl;
 c.graph.setEdges([]);c.root.dataset.running='true';
 const paint=f=>{
  const n=Math.min(info.trace.length,Math.floor(f*(info.trace.length+1))),events=info.trace.slice(0,n),edges=new Set(events.filter(e=>e.accepted).map(e=>e.key)),last=events.at(-1);
  c.graph.setEdges(edges,last?.accepted?{[last.key]:'new'}:{});c.graph.highlightNodes(last?[last.i,last.j]:[]);
  c.root.dataset.proposalsShown=n;
  c.status.textContent=last?`${last.phase==='heavy'?'Direct high-pair trial':'Proposal'} ${n}: ${last.i===last.j?'loop':last.accepted?'accepted':'rejected'} | ${edges.size} edges`:'Ready to sample';
  if(f===1){c.graph.highlightNodes([]);c.graph.setEdges(info.edges);c.root.dataset.running='false';c.status.textContent=`${s===0?'NR':s===1?'GRG':'CL'}: ${info.edges.size} edges`;}
 };
 // CL runs only while its unified algorithm is visible (reveal 3).
 IRGScenes.play(s===3?10:8,paint);
});
