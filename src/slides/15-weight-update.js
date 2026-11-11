
function paintDynamic(graph,dyn,count,hot=true){const shown=new Set(dyn.initial),marks={};for(const e of dyn.trace.slice(0,count)){if(e.phase==='delete'&&e.accepted)shown.delete(e.key);if(e.phase==='add'&&e.accepted)shown.add(e.key);}const last=dyn.trace[count-1];if(hot&&last?.accepted){marks[last.key]=last.phase==='delete'?'remove':'new';if(last.phase==='delete')shown.add(last.key);}graph.setEdges(shown,marks);return shown;}
/* A presentation-only grouping of the SAME sampled update.
 * Additions and deletions concern disjoint pair classes in this example.
 * The efficient algorithm still executes its original deletion-first trace.
 * No random values are drawn here and no intermediate picture is labelled as
 * a fresh sample from the target law.
 */
function paintGroupedUpdate(c,f){
 const dyn=c.d.dynamic;
 const highlighted=f<.65;
 const shown=new Set(highlighted?dyn.initial:dyn.edges),marks={};
 if(highlighted){
  dyn.added.forEach(k=>{shown.add(k);marks[k]='new';});
  dyn.deleted.forEach(k=>{shown.add(k);marks[k]='remove';});
 }
 c.graph.setEdges(shown,marks);
 c.root.dataset.updatePhase=highlighted?'changes':f<1?'settled':'complete';
 c.root.dataset.updateProgress=f.toFixed(5);
 c.root.dataset.updateRunning=String(f<1);
 if(!highlighted)c.graph.highlightNodes([]);
}
function playDynamic(c,seconds=5,resetNode=false){
 const dyn=c.d.dynamic;
 if(resetNode){
  c.graph.circles.forEach(({c})=>c.style.transition='none');
  c.graph.setWeights(dyn.oldWeights);
  c.graph.svg.getBoundingClientRect();
  c.graph.circles.forEach(({c})=>c.style.transition='');
 }
 c.graph.setWeights(dyn.weights,4);
 IRGScenes.play(seconds,f=>paintGroupedUpdate(c,f));
}
const controller_15_weight_update=IRGScenes.create(16,(root,d)=>{const c={root,d,graph:new IRGViz.Graph(root.querySelector('#graph16'),d.w)};root.querySelector('#update16').onclick=()=>{if(step===0)go(16,1);else playDynamic(c);};root.querySelector('#replay16').onclick=()=>playDynamic(c,5,true);return c;},(c,s,replay)=>{
 c.root.dataset.updatePhase='static';c.root.dataset.updateRunning='false';
 c.root.querySelector('#summary16').textContent=`For this seed: ${c.d.dynamic.added.length} edge addition${c.d.dynamic.added.length===1?'':'s'} and ${c.d.dynamic.deleted.length} deletion${c.d.dynamic.deleted.length===1?'':'s'}.`;
 if(s===0){c.graph.setWeights(c.d.w);c.graph.setEdges(c.d.stream.edges);c.graph.highlightNodes([4]);}else if(s===1&&!replay){c.graph.setWeights(c.d.dynamic.weights,4);c.graph.setEdges(c.d.stream.edges);c.graph.highlightNodes([4]);}else if(s===2||replay)playDynamic(c,5,replay);else{c.graph.setWeights(c.d.dynamic.weights);c.graph.setEdges(c.d.dynamic.edges);c.graph.highlightNodes([]);}
});
