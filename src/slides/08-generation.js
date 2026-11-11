
const controller_08_generation=IRGScenes.create(9,(root,d)=>{const graph=new IRGViz.Graph(root.querySelector('#graph9'),d.w);graph.setEdges(d.stream.edges);return{root,d,graph};},()=>{});
