/* Visualize the unchanged probability mass and the interval that changes.
 * These illustrative p,p' values are schematic, not the marginals of a
 * particular highlighted pair in the ten-vertex graph.
 */
function drawCouplingTrack(host,p,pp){
 host.innerHTML='';
 const svg=E('svg',{viewBox:'0 0 570 112'},host),x=22,width=492;
 const low=Math.min(p,pp),high=Math.max(p,pp);
 const eventColor=pp<p?'var(--irg-remove)':'var(--irg-add)';
 for(const [y,value,label] of [[28,p,'p'],[72,pp,'p′']]){
  E('rect',{x,y,width,height:22,rx:4,fill:'#e5ebef'},svg);
  E('rect',{x,y,width:width*low,height:22,fill:'var(--irg-keep)'},svg);
  if(value>low)E('rect',{x:x+width*low,y,width:width*(value-low),height:22,fill:eventColor,'data-probability-difference':true},svg);
  IRGViz.text(svg,545,y+11,label,{'font-size':22,fill:'#324e62'});
 }
 for(const p0 of [low,high])E('line',{x1:x+width*p0,x2:x+width*p0,y1:21,y2:100,stroke:eventColor,'stroke-width':1.3,'stroke-dasharray':'3 4',opacity:.65},svg);
 IRGViz.text(svg,x,12,'0',{'font-size':18,fill:'#526978'});
 IRGViz.text(svg,x+width,12,'1',{'font-size':18,fill:'#526978'});
}
const controller_16_coupling=IRGScenes.create(17,(root,d)=>{
 const c={root,d,graph:new IRGViz.Graph(root.querySelector('#graph17'),d.w),status:root.querySelector('#status17')};
 drawCouplingTrack(root.querySelector('#bernoulli17a'),.65,.4);
 drawCouplingTrack(root.querySelector('#bernoulli17b'),.35,.7);
 return c;
},(c,s)=>{
 const d=c.d.dynamic;
 if(s<2){
  c.graph.setWeights(d.oldWeights);c.graph.setEdges(d.initial);c.graph.highlightNodes([4]);
  c.status.textContent='The same starting sample; update of vertex 5.';
 }else if(s===2){
  const all=new Set([...d.initial,...d.edges]),marks={};
  d.added.forEach(k=>marks[k]='new');d.deleted.forEach(k=>marks[k]='remove');
  c.graph.setWeights(d.weights);c.graph.setEdges(all,marks);c.graph.highlightNodes([4]);
  c.status.textContent='Changes overlaid: green added; red dashed removed.';
 }else{
  c.graph.setWeights(d.weights);c.graph.setEdges(d.edges);c.graph.highlightNodes([]);
  c.status.textContent='Updated sample; removed edges are no longer present.';
 }
});
