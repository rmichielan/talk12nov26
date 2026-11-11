/* Display slide 10. Every reveal is reconstructible from the seeded trace.
 * The first two candidate decisions are presenter-controlled, never timers.
 * Model samples are unchanged: no forced successful edges or geometric gaps.
 * Reveal map: 0 blank, 1 example, 2 upper triangle; 3/4 guided naive,
 * 5 automatic naive; 6 reset/order instruction, 7 permutation + first MH
 * candidate, 8 second MH candidate, 9 automatic MH, 10 closing question.
 */
const controller_10_bottleneck=IRGScenes.create(11,(root,d)=>{
  const graph=new IRGViz.Graph(root.querySelector('#graph11'),d.w);
  const host=root.querySelector('#matrix11');host.innerHTML='';
  return {root,d,graph,matrix:new IRGViz.Matrix(host),status:root.querySelector('#status11'),
    candidateIndices:d.mh.trace.map((e,i)=>e.kind==='candidate'?i:-1).filter(i=>i>=0)};
},(ctx,phase)=>{
  const {root,d,graph,matrix,status,candidateIndices}=ctx;
  const natural=d.w.map((_,i)=>i),intro=['0-1','1-8','4-8','2-5','6-8'];
  const codeLine=(name,line)=>root.querySelectorAll(`#${name}-code li`).forEach((el,i)=>el.classList.toggle('current',i===line));
  const mode=name=>{
    root.dataset.benchMode=name;
    for(const el of root.querySelectorAll('[data-bench-panel]')){
      const show=el.dataset.benchPanel===name;
      el.classList.toggle('active',show);el.inert=!show;
    }
  };
  matrix.selectCell();matrix.setUpper(phase>=2);matrix.paint({});graph.setEdges([]);
  root.dataset.running='false';delete root.dataset.currentCandidate;
  codeLine('naive',-1);codeLine('mh',-1);
  if(phase<6) mode('naive');else if(phase<=7)mode('sort');else if(phase<=9)mode('mh');else mode('question');
  // An empty natural-order matrix always precedes the sorting reveal.
  matrix.setOrder(phase>=8?d.mh.order:natural,false);

  function paintNaive(completed,pending=null){
    const states={},edges=[];
    for(const e of d.naive.trace.slice(0,completed)){
      states[e.key]=e.accepted?'edge':'reject';if(e.accepted)edges.push(e.key);
    }
    if(pending!==null){const e=d.naive.trace[pending];states[e.key]='query';matrix.selectCell(e.i,e.j);root.dataset.currentCandidate=e.key;}
    else {matrix.selectCell();delete root.dataset.currentCandidate;}
    matrix.paint(states);graph.setEdges(edges);
    root.dataset.resolved=String(completed);
    codeLine('naive',pending===null?-1:2);
    status.textContent=`${completed} of ${d.naive.trace.length} pairs tested; ${edges.length} edges`;
  }
  function paintMH(completed,pending=null,gapFraction=1){
    const states={},edges=[];let tested=0,skipped=0;
    for(const e of d.mh.trace.slice(0,completed)){
      for(const k of e.skipped){states[k]='skip';skipped++;}
      if(e.kind==='candidate'){states[e.key]=e.accepted?'edge':'reject';tested++;if(e.accepted)edges.push(e.key);}
    }
    if(pending!==null){
      const e=d.mh.trace[pending],take=Math.floor(e.skipped.length*gapFraction+1e-8);
      for(const k of e.skipped.slice(0,take)){states[k]='skip';skipped++;}
      if(e.kind==='candidate'&&gapFraction>=1){
        states[e.key]='query';matrix.selectCell(e.i,e.j);root.dataset.currentCandidate=e.key;codeLine('mh',6);
        status.textContent=`Geometric gap ${e.skipped.length}; candidate (${e.i+1},${e.j+1}); Bernoulli correction ${(e.p/e.q).toFixed(3)}`;
      }else{matrix.selectCell();delete root.dataset.currentCandidate;codeLine('mh',3);status.textContent=`Geometric skip: ${take} cells`;}
    }else{matrix.selectCell();delete root.dataset.currentCandidate;codeLine('mh',-1);status.textContent=`${tested} candidates tested; ${skipped} skipped; ${edges.length} edges`;}
    matrix.paint(states);graph.setEdges(edges);root.dataset.resolved=String(tested);
  }
  if(phase===0){status.textContent='Empty labelled graph and adjacency matrix';return;}
  if(phase===1){
    IRGScenes.play(3.6,f=>{
      const count=Math.min(intro.length,Math.floor(f*(intro.length+.4))),keys=intro.slice(0,count);
      graph.setEdges(keys);matrix.paint(Object.fromEntries(keys.map(k=>[k,'edge'])));
      status.textContent=`${count} edges and ${2*count} symmetric matrix entries`;
    });return;
  }
  if(phase===2){graph.setEdges(intro);matrix.paint(Object.fromEntries(intro.map(k=>[k,'edge'])));status.textContent='Only the upper triangle is needed';return;}
  if(phase===3){paintNaive(0,0);return;}
  if(phase===4){paintNaive(1,1);return;}
  if(phase===5){
    const start=2,n=d.naive.trace.length;root.dataset.running='true';
    IRGScenes.play(10.5,f=>{
      if(f>=1){paintNaive(n);root.dataset.running='false';return;}
      const progress=f*(n-start),idx=start+Math.floor(progress),fraction=progress%1;
      // Each visible candidate is questioned before its stored Bernoulli result.
      paintNaive(fraction<.64?idx:idx+1,fraction<.64?idx:null);
      if(fraction>=.64){const e=d.naive.trace[idx];matrix.selectCell(e.i,e.j);codeLine('naive',e.accepted?3:2);}
    });return;
  }
  if(phase===6){status.textContent='Reset: original vertex identifiers 1 through 10';return;}
  if(phase===7){
    // Flush only this once, before the permutation; no per-frame layout reads.
    matrix.svg.getBoundingClientRect();matrix.setOrder(d.mh.order,true);
    const first=candidateIndices[0];root.dataset.running='true';
    IRGScenes.play(1.65,f=>{
      const seconds=f*1.65;
      if(seconds<.90){mode('sort');matrix.paint({});status.textContent='Order row and column labels by decreasing weight';}
      else {mode('mh');if(first!==undefined)paintMH(first,first,Math.min(1,(seconds-.90)/.45));else paintMH(d.mh.trace.length);}
      if(f>=1)root.dataset.running='false';
    });return;
  }
  if(phase===8){
    matrix.setOrder(d.mh.order,false);
    const second=candidateIndices[1];
    if(second===undefined){paintMH(d.mh.trace.length);return;}
    root.dataset.running='true';
    IRGScenes.play(.55,f=>{paintMH(second,second,Math.min(1,f/.75));if(f>=1)root.dataset.running='false';});return;
  }
  if(phase===9){
    const n=d.mh.trace.length,start=candidateIndices.length>=2?candidateIndices[1]+1:n;
    root.dataset.running='true';
    IRGScenes.play(Math.max(3,(n-start)*.48),f=>{
      if(f>=1){paintMH(n);root.dataset.running='false';return;}
      const progress=f*(n-start),idx=start+Math.floor(progress),fraction=progress%1;
      if(idx>=n){paintMH(n);return;}
      if(fraction<.3)paintMH(idx,idx,fraction/.3);
      else if(fraction<.76)paintMH(idx,idx,1);
      else {paintMH(idx+1);const e=d.mh.trace[idx];if(e.kind==='candidate'){matrix.selectCell(e.i,e.j);codeLine('mh',e.accepted?7:8);}}
    });return;
  }
  matrix.setOrder(d.mh.order,false);paintMH(d.mh.trace.length);
});
