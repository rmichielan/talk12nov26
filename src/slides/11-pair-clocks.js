
const controller_11_pair_clocks=IRGScenes.create(12,(root,d)=>{const graph=new IRGViz.Graph(root.querySelector('#graph12'),d.w);const host=root.querySelector('#matrix12');host.innerHTML='';const matrix=new IRGViz.Matrix(host);matrix.setUpper(true);return{root,d,graph,matrix,status:root.querySelector('#status12')};},(c,s)=>{
 const {d,graph,matrix,root,status}=c;
 const paint=t=>{const events=d.stream.events.filter(e=>e.t<=t&&e.i!==e.j),edges=new Set(events.map(e=>e.key)),last=events.at(-1),hot=last&&t-last.t<.035?last.key:null;const states=Object.fromEntries([...edges].map(k=>[k,'edge']));if(hot)states[hot]='query';graph.setEdges(edges,hot?{[hot]:'new'}:{});graph.highlightNodes(hot?[last.i,last.j]:[]);matrix.paint(states,true,t);root.querySelector('#time12 b').style.left=(100*t)+'%';root.querySelector('#time12 strong').textContent='t = '+t.toFixed(2);status.textContent=`${events.length} pair arrivals; ${edges.size} simple edges`;};
 if(s===0)paint(0);else if(s===1)IRGScenes.play(12,paint);else paint(1);
});
