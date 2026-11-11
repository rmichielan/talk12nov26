  // An illustrative G(n,1/2) sample. Both panels share vertices and all
  // background edges; the right adds precisely the missing clique edges.
  function drawPlantedCliquePanels(){
    const left=$('#er-baseline'),right=$('#er-planted');
    if(!left||!right)return;
    left.replaceChildren();right.replaceChildren();
    const rng=mkRand((seed^0xc7135a42)>>>0),n=19;
    const pos=Array.from({length:n},(_,i)=>({x:28+365*(.07+.86*rng()),y:22+240*(.08+.84*rng())}));
    const planted=[1,5,9,13,17], members=new Set(planted);
    const pairKey=(a,b)=>a<b?a+'-'+b:b+'-'+a;
    const base=new Set();
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(rng()<.5)base.add(pairKey(i,j));
    for(const [svg,plantedGraph] of [[left,false],[right,true]]){
      const ed=E('g',{'class':'clique-baseline-edges'},svg),pl=E('g',{'class':'clique-planted-edges'},svg),verts=E('g',{'class':'clique-baseline-vertices'},svg),selectedNodes=E('g',{'class':'clique-selected-vertices'},svg);
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
        const key=pairKey(i,j),signal=plantedGraph&&members.has(i)&&members.has(j);
        if(!base.has(key)&&!signal)continue;
        const p=pos[i],q=pos[j];
        // Planted edges are overlaid on top of the unchanged background sample.
        if(base.has(key))E('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y},ed);
        if(signal)E('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y},pl);
      }
      for(let i=0;i<n;i++){
        const p=pos[i],selected=plantedGraph&&members.has(i);
        E('circle',{cx:p.x,cy:p.y,r:6.1,'class':'clique-ordinary'},verts);
        if(selected)E('circle',{cx:p.x,cy:p.y,r:7.8,'class':'clique-member'},selectedNodes);
      }
    }
  }
  const controller_06_planted_clique={init:drawPlantedCliquePanels,trigger(){}};
