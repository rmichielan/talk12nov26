  // One truncated exponential clock has support [0.8, 2.5] and mean 1.5 seconds.
  // Each tick independently selects one of the three event types uniformly.
  // The temporal graph is a separate illustrative
  // soft-kernel Markov process, not a zero-temperature GIRG equilibrium law.
  // Add: choose an absent pair with probability proportional to K_ij.
  // Remove: choose a currently present pair uniformly.
  // Weight: choose a vertex uniformly, double its weight, and couple incident
  // edges to the resulting increase in their connection probabilities.
  let temporal=null,temporalRaf=null,temporalLast=null;
  const temporalEnd=30,flashDuration=.5,eventMinGap=.8,eventMaxGap=2.5,eventMeanGap=1.5;
  const gapRange=eventMaxGap-eventMinGap;
  const truncatedExponentialMean=rate=>
    eventMinGap+1/rate-gapRange/Math.expm1(rate*gapRange);
  let lowRate=0,highRate=10;
  for(let i=0;i<60;i++){
    const midRate=(lowRate+highRate)/2;
    if(truncatedExponentialMean(midRate)>eventMeanGap)lowRate=midRate;
    else highRate=midRate;
  }
  const clockRate=(lowRate+highRate)/2;
  const nextEventGap=rng=>{
    const lowerSurvival=Math.exp(-clockRate*eventMinGap);
    const upperSurvival=Math.exp(-clockRate*eventMaxGap);
    return -Math.log(lowerSurvival-rng()*(lowerSurvival-upperSurvival))/clockRate;
  };
  const nextEventType=rng=>{
    return ['add','remove','weight'][Math.floor(rng()*3)];
  };
  const temporalNodeRadius=w=>clamp(4.8+2.1*Math.sqrt(Math.max(0,w)),5.8,22);
  const temporalKernel=(a,b,L)=>{
    const d2=(a.x-b.x)**2+(a.y-b.y)**2;
    const ratio=L*d2/Math.max(1e-9,C*a.w*b.w);
    return 1/(1+Math.pow(ratio,1.4));
  };
  function drawTime(){
    const svg=$('#timenet');svg.replaceChildren();svg.setAttribute('viewBox','0 0 840 480');svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const pos=v=>({x:30+780*v.x,y:25+422*v.y});
    const layer=E('g',{'class':'temporal-edges'},svg),vertices=E('g',{'class':'temporal-vertices'},svg);
    const rng=mkRand((seed^0xd7542311)>>>0);
    const nodes=data.nodes.map(v=>({id:v.id,x:v.x,y:v.y,w:v.w}));
    const initialWeightSum=nodes.reduce((sum,v)=>sum+v.w,0);
    const allPairs=[],byVertex=Array.from({length:nodes.length},()=>[]);
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const pair={i,j,key:pairKey(i,j)};allPairs.push(pair);byVertex[i].push(pair);byVertex[j].push(pair);
    }
    const present=new Map();
    for(const[i,j]of data.mix){const a=pos(nodes[i]),b=pos(nodes[j]);
      const el=E('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,'class':'temporal-edge'},layer);
      present.set(pairKey(i,j),{i,j,el});
    }
    const nodeElements=nodes.map(v=>{const pt=pos(v);return E('circle',{cx:pt.x,cy:pt.y,r:temporalNodeRadius(v.w),'class':'temporal-network-node'},vertices);});
    temporal={rng,svg,pos,layer,vertices,nodeElements,present,allPairs,byVertex,nodes,initialWeightSum,clockRate,now:0,settleTime:0,
      nextEvent:nextEventGap(rng),
      events:[],flashes:[],weightTweens:[],lastType:null,added:0,removed:0,changed:0,stopped:false};
    $('#timeline-track').querySelectorAll('.timeline-event').forEach(el=>el.remove());
    $('#timeline-start').textContent='0 s';$('#timeline-end').textContent=temporalEnd+' s';
    drawTimeAxis();
  }
  function temporalMakeEdge(t,pair,highlight,when){
    const a=t.pos(t.nodes[pair.i]),b=t.pos(t.nodes[pair.j]);
    const el=E('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,'class':'temporal-edge'+(highlight?' adding':'')},t.layer);
    const edge={i:pair.i,j:pair.j,el};t.present.set(pair.key,edge);
    if(highlight)t.flashes.push({type:'add',edge,until:when+flashDuration});
  }
  function temporalDeleteEdge(t,key,highlight,when){
    const edge=t.present.get(key);if(!edge)return;
    t.present.delete(key);
    if(highlight){edge.el.classList.add('removing');t.flashes.push({type:'remove',edge,until:when+flashDuration});}
    else edge.el.remove();
  }
  function retireTemporalFlashes(at){
    const t=temporal;
    t.flashes=t.flashes.filter(f=>{
      if(f.until>at)return true;
      if(f.type==='add')f.edge.el.classList.remove('adding');
      else if(f.type==='remove')f.edge.el.remove();
      else if(f.type==='weight')t.nodeElements[f.id].classList.remove('changing');
      return false;
    });
    t.weightTweens=t.weightTweens.filter(tw=>{
      const frac=clamp((at-tw.when)/flashDuration,0,1),v=frac*frac*(3-2*frac);
      t.nodeElements[tw.id].setAttribute('r',(tw.r0+(tw.r1-tw.r0)*v).toFixed(3));
      return frac<1;
    });
  }
  function temporalRecord(type,when){
    const t=temporal,marker=document.createElement('span');
    marker.className='timeline-event '+(type==='add'?'add':type==='remove'?'remove':'weight');
    marker.setAttribute('aria-label',(type==='add'?'New link':type==='remove'?'Delete link':'Change vertex weight')+' at t='+when.toFixed(2)+'s');
    marker.style.left=(100*when/temporalEnd).toFixed(4)+'%';
    marker.title=marker.getAttribute('aria-label');
    $('#timeline-track').appendChild(marker);
    t.events.push({time:when,type,marker});t.lastType=type;
  }
  function temporalEvent(type,when){
    const t=temporal;retireTemporalFlashes(when);
    // Keep the clock moving even at the empty or complete graph boundary.
    if((type==='remove'&&!t.present.size)||(type==='add'&&t.present.size===t.allPairs.length))type='weight';
    let done=false;
    if(type==='add'){
      const L=t.initialWeightSum;
      let total=0;
      for(const pair of t.allPairs)if(!t.present.has(pair.key))total+=temporalKernel(t.nodes[pair.i],t.nodes[pair.j],L);
      if(total>0){
        let draw=t.rng()*total,picked=null;
        for(const pair of t.allPairs)if(!t.present.has(pair.key)){
          draw-=temporalKernel(t.nodes[pair.i],t.nodes[pair.j],L);
          if(draw<=0){picked=pair;break;}
        }
        if(picked){temporalMakeEdge(t,picked,true,when);done=true;t.added++;}
      }
    }else if(type==='remove'){
      if(t.present.size){const idx=Math.floor(t.rng()*t.present.size),key=[...t.present.keys()][idx];
        temporalDeleteEdge(t,key,true,when);t.removed++;done=true;}
    }else if(type==='weight'){
      const id=Math.floor(t.rng()*t.nodes.length),node=t.nodes[id];
      const newWeight=node.w*2;
      // Freeze kernel normalization at initial weight sum: changing one vertex
      // then changes only connection probabilities of its incident pairs.
      const L=t.initialWeightSum;
      const before=t.byVertex[id].map(p=>temporalKernel(t.nodes[p.i],t.nodes[p.j],L));
      node.w=newWeight;
      const pairs=t.byVertex[id];
      for(let k=0;k<pairs.length;k++){
        const pair=pairs[k],p0=before[k],p1=temporalKernel(t.nodes[pair.i],t.nodes[pair.j],L),present=t.present.has(pair.key);
        // A doubled weight raises all incident connection probabilities.
        if(!present&&p1>p0&&t.rng()<(p1-p0)/Math.max(1e-9,1-p0))temporalMakeEdge(t,pair,false,when);
      }
      const circle=t.nodeElements[id];
      const oldRadius=Number(circle.getAttribute('r')),newRadius=temporalNodeRadius(newWeight);
      circle.classList.add('changing');
      t.flashes.push({type:'weight',id,until:when+flashDuration});
      t.weightTweens.push({id,r0:oldRadius,r1:newRadius,when});
      t.changed++;done=true;
    }
    if(done)temporalRecord(type,when);
    else if(type!=='weight')temporalEvent('weight',when);
  }
  function advanceTemporal(dt){
    const t=temporal;if(!t||dt<=0||t.stopped)return;
    const target=Math.min(temporalEnd,t.now+dt);
    let safety=0;
    while(t.nextEvent<=target&&safety++<200){
      const when=t.nextEvent;
      temporalEvent(nextEventType(t.rng),when);
      t.nextEvent=when+nextEventGap(t.rng);
    }
    t.now=target;retireTemporalFlashes(target);drawTimeAxis();
    if(target>=temporalEnd){t.stopped=true;$('#time-status').textContent='COMPLETE · PRESS T TO RESTART';}
  }
  function drawTimeAxis(){
    if(!temporal)return;
    const t=temporal.now;
    $('#time-cursor').style.left=(100*t/temporalEnd).toFixed(3)+'%';
    $('#time-current').textContent='t = '+t.toFixed(1)+' s';
    if(!temporal.stopped)$('#time-status').textContent='CLOCK · MEAN 1.5 s · INTERVAL 0.8–2.5 s';
  }
  function temporalFrame(now){
    if(slide!==5||paused||document.hidden){temporalRaf=null;return;}
    const elapsed=Math.min(100,Math.max(0,now-(temporalLast??now)));
    temporalLast=now;
    if(!temporal.stopped)advanceTemporal(elapsed*.001);
    else{
      temporal.settleTime+=elapsed*.001;
      retireTemporalFlashes(temporalEnd+temporal.settleTime);
    }
    if(temporal.stopped&&!temporal.flashes.length&&!temporal.weightTweens.length){temporalRaf=null;return;}
    temporalRaf=requestAnimationFrame(temporalFrame);
  }
  function timeline(){
    if(temporalRaf!==null){cancelAnimationFrame(temporalRaf);temporalRaf=null;}
    temporalLast=null;
    if(slide===5&&!paused&&!document.hidden&&(!temporal?.stopped||temporal?.flashes.length||temporal?.weightTweens.length))temporalRaf=requestAnimationFrame(temporalFrame);
  }
  function restartTemporal(){drawTime();timeline();}
  const trigger_04_dynamics=()=>restartTemporal();

  const controller_04_dynamics={
    init:drawTime,
    enter({oldPage}){if(oldPage!==5)drawTime();},
    trigger:trigger_04_dynamics
  };
