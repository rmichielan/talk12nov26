// Pure scientific graph derivations; no DOM or presentation state.
// All computations depend only on the input GIRG topology and the seed.
(function(){
  'use strict';
  const mkRand=s=>{let a=s>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function nodeLayoutForce(nodes,edges,rand){
    // Seeded, bounded stress layout in the spirit of Kamada-Kawai.
    // Graph-theoretic shortest path distances set spring lengths;
    // weak long-range repulsion spreads disconnected components.
    const n=nodes.length,INF=999,dist=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:INF));
    for(const [i,j] of edges){dist[i][j]=1;dist[j][i]=1;}
    for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      const via=dist[i][k]+dist[k][j];if(via<dist[i][j])dist[i][j]=via;
    }
    const x=nodes.map(()=>.5+(rand()-.5)*.49),y=nodes.map(()=>.5+(rand()-.5)*.49);
    const vx=Array(n).fill(0),vy=Array(n).fill(0);
    for(let it=0;it<155;it++){
      vx.fill(0);vy.fill(0);
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
        const dx=x[i]-x[j],dy=y[i]-y[j],r=Math.max(.008,Math.hypot(dx,dy));
        const distance=dist[i][j],unreachable=distance>=INF;
        const ideal=unreachable?.47:(.115+Math.min(4,distance-1)*.09);
        const strength=unreachable?.0025:.20/(distance*distance);
        // Gradient of a stress potential (distance vs desired length).
        let force=strength*(r-ideal);
        if(r<.048)force-=.005*(.048-r)/r;
        const fx=force*dx/r,fy=force*dy/r;
        vx[i]-=fx;vy[i]-=fy;vx[j]+=fx;vy[j]+=fy;
      }
      const rate=.17*(1-it/155)+.055;
      for(let i=0;i<n;i++){
        x[i]+=clamp(vx[i]*rate,-.022,.022);
        y[i]+=clamp(vy[i]*rate,-.022,.022);
        // A soft, non-saturating centering force instead of hard clipping.
        x[i]+=(.5-x[i])*.0017;y[i]+=(.5-y[i])*.0017;
      }
    }
    const xmin=Math.min(...x),xmax=Math.max(...x),ymin=Math.min(...y),ymax=Math.max(...y);
    const xr=Math.max(.001,xmax-xmin),yr=Math.max(.001,ymax-ymin);
    return nodes.map((v,i)=>({x:.11+.78*(x[i]-xmin)/xr,y:.12+.76*(y[i]-ymin)/yr}));
  }
  function derive(coverGraph,seed){
    const rand=mkRand((seed^0xa9bd2167)>>>0),cover=coverGraph.vertices,n=cover.length;
    const nodes=cover.map(v=>({id:v.id,x:v.latentX,y:v.latentY,coverX:v.x,coverY:v.y,
      coverWeight:v.weight,w:v.weight,r:v.r,isHub:v.isHub}));
    const L=nodes.reduce((a,b)=>a+b.w,0),pop=[],geo=[];
    const tau=coverGraph.model.tau,dimension=coverGraph.model.dimension;
    // A fixed geometric radius gives a standard RGG sample, conditional only
    // on the shared uniform positions (no data-dependent radius tuning).
    const originalEdges=coverGraph.edges.map(e=>[Math.min(e.source,e.target),Math.max(e.source,e.target)]);
    const radius=0.135;
    // Hard-boundary unit square: Euclidean metric with no periodic wrap-around.
    const squareDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const a=nodes[i],b=nodes[j],dist=squareDistance(a,b);
      if(rand()<Math.min(1,a.w*b.w/L))pop.push([i,j]);
      if(dist<=radius)geo.push([i,j]);
    }
    const forcePos=nodeLayoutForce(nodes,pop,mkRand((seed^0x8472ad11)>>>0));
    const popPos=forcePos.map(p=>({x:p.x,y:p.y}));
    // Find genuine triangles of the GIRG for the later conceptual example.
    // Do not add any edges to the underlying graph to force a triangle.
    const adj=Array.from({length:n},()=>new Set());
    for(const[i,j] of originalEdges){adj[i].add(j);adj[j].add(i);}
    const triangles=[];
    for(let i=0;i<n;i++)for(const j of adj[i])if(j>i){
      for(const k of adj[i])if(k>j&&adj[j].has(k)){
        const ids=[i,j,k],vs=ids.map(id=>nodes[id]);
        const weights=vs.reduce((s,v)=>s+Math.log(v.w),0);
        const extent=Math.max(squareDistance(vs[0],vs[1]),squareDistance(vs[0],vs[2]),squareDistance(vs[1],vs[2]));
        triangles.push({ids,weights,extent});
      }
    }
    // Maximum product of three weights among *existing* GIRG triangles.
    const hubTri=[...triangles].sort((a,b)=>b.weights-a.weights)[0];
    // Among other genuine triangles, minimize the largest pairwise distance.
    // One or zero triangles: never invent a second highlighted triangle.
    const localTri=[...triangles].filter(t=>!hubTri||t.ids.join(',')!==hubTri.ids.join(','))
      .sort((a,b)=>a.extent-b.extent)[0];
    const hub=hubTri?.ids||[],local=localTri?.ids||[];
    return {nodes,pop,geo,mix:originalEdges,girg:originalEdges,source:originalEdges,
      hub,local,popPos,tau,dimension,radius,model:coverGraph.model,triangles:triangles.length};
  }


  window.ScientificModel=Object.freeze({derive});
})();
