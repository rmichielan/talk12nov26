/* Shared, deliberately small SVG components for the algorithmic block. */
const IRGViz=(()=>{
 const colors=IRGModel.W.map(w=>WeightPalette.color(w));
 const text=(p,x,y,s,attrs={})=>{const t=E('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle',...attrs},p);t.textContent=s;return t;};
 class Graph{
  constructor(host,weights=IRGModel.W){if(!(host instanceof SVGElement))host.innerHTML='';this.svg=host instanceof SVGElement?host:E('svg',{viewBox:'0 0 530 420',class:'irg-graph',role:'img','aria-label':'Labelled ten-vertex graph'},host);this.svg.innerHTML='';this.edges=E('g',{},this.svg);this.nodes=E('g',{},this.svg);this.lines=new Map();this.circles=[];this.labels=[];IRGModel.pos.forEach(([x,y],i)=>{const g=E('g',{'data-vertex':i+1},this.nodes);const halo=E('circle',{cx:x,cy:y,r:31,fill:'#d99a55',opacity:0,class:'irg-node-halo'},g);const c=E('circle',{cx:x,cy:y,r:this.radius(weights[i]),fill:WeightPalette.color(weights[i]),stroke:'#fff','stroke-width':2.4},g);this.labels.push(text(g,x,y,i+1,{'class':'irg-vertex-label','font-size':21,fill:WeightPalette.label(weights[i]),'font-weight':750,'dominant-baseline':'central',stroke:'#efe8f9','stroke-width':1.25,'stroke-linejoin':'round','paint-order':'stroke fill'}));const title=E('title',{},g);title.textContent=`Vertex ${i+1}, weight ${weights[i]}`;this.circles.push({c,halo,title});});this.setWeights(weights);}
  radius(w){return Math.max(7.5,10*Math.sqrt(Math.max(0,w)));}
  setWeights(w,hot=-1){this.weights=[...w];this.circles.forEach(({c,halo,title},i)=>{title.textContent=`Vertex ${i+1}, weight ${w[i]}`;c.setAttribute('r',this.radius(w[i]));c.setAttribute('fill',WeightPalette.color(w[i]));c.dataset.weight=w[i];this.labels[i].setAttribute('fill',WeightPalette.label(w[i]));halo.setAttribute('r',this.radius(w[i])+9);halo.setAttribute('opacity',i===hot?'.22':'0');});}
  setEdges(keys,highlight={}){const wanted=new Set(keys);for(const[k,l]of this.lines)if(!wanted.has(k)){l.remove();this.lines.delete(k);}for(const k of wanted){let l=this.lines.get(k);if(!l){const[i,j]=IRGModel.pair(k),[x1,y1]=IRGModel.pos[i],[x2,y2]=IRGModel.pos[j];l=E('line',{x1,y1,x2,y2,'stroke-linecap':'round','data-edge':k},this.edges);this.lines.set(k,l);}const mode=highlight[k]||'normal';l.dataset.state=mode;const col=mode==='new'?'var(--irg-add, #159c7d)':mode==='remove'?'var(--irg-remove, #b83e4b)':mode==='focus'?'#cd853e':'#568692';l.setAttribute('stroke',col);l.setAttribute('stroke-width',mode==='normal'?2.6:5);l.setAttribute('opacity',mode==='normal'?.58:1);l.setAttribute('stroke-dasharray',mode==='remove'?'8 6':'none');}}
  highlightNodes(ids=[]){this.circles.forEach(({halo},i)=>halo.setAttribute('opacity',ids.includes(i)?.3:0));}
 }
 class Matrix{
  constructor(host){this.svg=E('svg',{viewBox:'0 0 560 560',class:'irg-matrix',role:'img','aria-label':'Adjacency matrix; original vertex labels follow row and column permutations'},host);this.cells=new Map();this.order=IRGModel.W.map((_,i)=>i);this.labels=[];this.upper=false;
   this.order.forEach(i=>{const r=text(this.svg,28,0,i+1,{'font-size':22,'font-weight':700,fill:'#36536b'}),c=text(this.svg,0,27,i+1,{'font-size':22,'font-weight':700,fill:'#36536b'});this.labels.push({r,c});});
   for(let i=0;i<10;i++)for(let j=0;j<10;j++){const g=E('g',{'data-pair':`${i}-${j}`,class:'matrix-cell'},this.svg),rect=E('rect',{x:0,y:0,width:43,height:43,rx:5,fill:i===j?'#e1e7eb':'#fff',stroke:'#ccdae1','stroke-width':1.1},g),mark=text(g,21.5,23,'',{'font-size':24,'font-weight':650,fill:'#738795'});const clock=E('g',{opacity:0},g);E('circle',{cx:21.5,cy:21.5,r:11,fill:'none',stroke:'#a8b8c1','stroke-width':1.5},clock);const hand=E('path',{d:'M21.5 13V21.5L27.5 25',fill:'none',stroke:'#7e939f','stroke-width':1.8,'stroke-linecap':'round'},clock);this.cells.set(`${i}-${j}`,{g,rect,mark,clock,hand,i,j});}
   this.pointerLayer=E('g',{'class':'matrix-pointers','aria-hidden':'true',opacity:0},this.svg);
   this.rowPointer=E('path',{d:'M -8 -8 L 4 0 L -8 8 Z',fill:'#af702c',stroke:'#fff','stroke-width':1.2},this.pointerLayer);
   this.columnPointer=E('path',{d:'M -8 -8 L 0 4 L 8 -8 Z',fill:'#af702c',stroke:'#fff','stroke-width':1.2},this.pointerLayer);
   this.selected=null;this.setOrder(this.order,false);
  }
  selectCell(i=null,j=null){
   this.selected=i===null||j===null?null:[i,j];
   this.pointerLayer.setAttribute('opacity',this.selected?1:0);
   if(!this.selected){delete this.svg.dataset.currentRow;delete this.svg.dataset.currentColumn;return;}
   const r=this.order.indexOf(i),c=this.order.indexOf(j);
   this.rowPointer.setAttribute('transform',`translate(50 ${79.5+r*47})`);
   this.columnPointer.setAttribute('transform',`translate(${79.5+c*47} 50)`);
   this.svg.dataset.currentRow=i+1;this.svg.dataset.currentColumn=j+1;
  }
  setOrder(order,animate=true){this.order=[...order];const rank=Object.fromEntries(order.map((id,i)=>[id,i]));for(const c of this.cells.values()){c.g.style.transition=animate?'transform 850ms cubic-bezier(.22,.7,.2,1), opacity 450ms':'none';c.g.style.transform=`translate(${58+rank[c.j]*47}px,${58+rank[c.i]*47}px)`;c.g.style.opacity=this.upper&&rank[c.i]>=rank[c.j]?(rank[c.i]===rank[c.j]?.12:.17):1;}this.labels.forEach(({r,c},id)=>{for(const e of[r,c])e.style.transition=animate?'transform 850ms cubic-bezier(.22,.7,.2,1)':'none';r.style.transform=`translateY(${79.5+rank[id]*47}px)`;c.style.transform=`translateX(${79.5+rank[id]*47}px)`;});}
  setUpper(upper){this.upper=upper;this.setOrder(this.order,false);}
  paint(states={},clockMode=false,t=0){for(const c of this.cells.values()){const k=IRGModel.key(c.i,c.j),state=states[k]||'empty';c.rect.setAttribute('fill',state==='edge'?'#d1eee4':state==='query'?'#fce6bf':c.i===c.j?'#e4eaee':'#fff');c.rect.setAttribute('stroke',state==='query'?'#b77c36':'#cbd9e1');    c.mark.textContent=state==='skip'||state==='reject'?'\u00d7':state==='query'?'?':state==='edge'?'\u2022':'';
    c.mark.setAttribute('fill',state==='edge'?'#168f74':state==='query'?'#9f641f':'#8897a0');if(clockMode)c.mark.textContent='';c.clock.setAttribute('opacity',clockMode&&c.i<c.j?1:0);c.hand.setAttribute('stroke',state==='query'?'#bd792c':'#7e939f');c.hand.setAttribute('transform',`rotate(${(t*360)%360} 21.5 21.5)`);}}
 }
 function bars(host,w=IRGModel.W){host.innerHTML='';const s=E('svg',{viewBox:'0 0 560 190',role:'img','aria-label':'Input weights, indexed from one to ten'},host);const max=Math.max(...w);w.forEach((v,i)=>{const h=100*v/max;E('rect',{x:25+i*52,y:132-h,width:32,height:h,rx:4,fill:WeightPalette.color(v)},s);text(s,41+i*52,116-h,v,{'font-size':22,fill:'#2a495b','font-weight':700});text(s,41+i*52,156,i+1,{'font-size':20,fill:'#4b6371'});});}
 function slots(host,w=IRGModel.W){host.innerHTML='';const L=IRGModel.sum(w),rows=[];for(let r=0;r<2;r++){const wrap=document.createElement('div');wrap.className='endpoint-slot';wrap.innerHTML=`<span class="slot-name">${r?'J':'I'}</span><div class="slot-window"><div class="slot-track"></div><div class="slot-pointer"></div></div><b class="slot-result">?</b>`;host.append(wrap);const strip=wrap.querySelector('.slot-track');w.forEach((x,i)=>{const el=document.createElement('div');el.className='slot-segment';el.style.width=(100*x/L)+'%';el.style.background=WeightPalette.color(x);el.style.color=WeightPalette.label(x);el.textContent=i+1;strip.append(el);});rows.push({pointer:wrap.querySelector('.slot-pointer'),track:strip,result:wrap.querySelector('.slot-result')});}
  const target=(id,u=.5)=>100*(IRGModel.sum(w.slice(0,id))+u*w[id])/L;
  return {
   select(row,id,u=.5){const entry=rows[row];entry.pointer.removeAttribute('data-driven');entry.pointer.style.left=target(id,u)+'%';entry.result.textContent=id+1;entry.track.animate?.([{transform:'translateX(12px)'},{transform:'translateX(-7px)'},{transform:'translateX(0)'}],{duration:360,easing:'ease-out'});},
   // Scrubbed by the scene clock: pausing, replay and backtracking are exact.
   // The endpoint is already sampled; this motion never determines its law.
   draw(row,id,progress,u=.5){const entry=rows[row],p=Math.max(0,Math.min(1,progress)),x=target(id,u);const ease=v=>v*v*(3-2*v);let cursor=p<.58?94*ease(p/.58):94+(x-94)*ease((p-.58)/.42);entry.pointer.dataset.driven='true';entry.pointer.style.transition='none';entry.pointer.style.left=cursor+'%';entry.track.style.transform=`translateX(${12*Math.sin(4*Math.PI*p)*(1-p)}px)`;entry.result.textContent=p>=1?id+1:'?';entry.result.parentElement.dataset.selected=p>=1?String(id+1):'';},
   idle(row){const entry=rows[row];entry.pointer.style.transition='none';entry.pointer.style.left='0%';entry.track.style.transform='none';entry.result.textContent='?';entry.result.parentElement.dataset.selected='';},
   reset(){rows.forEach((r,i)=>{r.track.getAnimations?.().forEach(a=>a.cancel());r.result.textContent='?';r.pointer.style.left='0%';r.pointer.style.removeProperty('transition');r.track.style.transform='none';delete r.pointer.dataset.driven;delete r.result.parentElement.dataset.selected;});}
  };
 }
 function clock(host){host.innerHTML='';const s=E('svg',{viewBox:'0 0 200 200',class:'big-clock','aria-label':'Global Poisson proposal clock'},host);E('circle',{cx:100,cy:100,r:78,fill:'#fff7eb',stroke:'#d99a50','stroke-width':4},s);for(let k=0;k<12;k++){const a=k*Math.PI/6;E('line',{x1:100+63*Math.sin(a),y1:100-63*Math.cos(a),x2:100+69*Math.sin(a),y2:100-69*Math.cos(a),stroke:'#c58a48','stroke-width':3},s);}const h=E('path',{d:'M100 45V100L134 116',fill:'none',stroke:'#a86626','stroke-width':5,'stroke-linecap':'round'},s);E('circle',{cx:100,cy:100,r:6,fill:'#a86626'},s);return{set(t,ring=false){h.setAttribute('transform',`rotate(${t*360} 100 100)`);s.classList.toggle('ringing',ring);}};}
 return {Graph,Matrix,bars,slots,clock,colors,text};
})();

// Each scene gets a single animation clock. Waiting for hidden tabs is not
// charged to simulated time; T replays the same event trace, R changes its seed.
const IRGScenes=(()=>{
 let example,sceneRun=null;const pausedVisuals=new Set();
 function pauseVisuals(value){if(value){for(const el of document.querySelectorAll('.irg-stage'))for(const a of el.getAnimations({subtree:true})){if(a.playState==='running'){a.pause();pausedVisuals.add(a);}}}else{for(const a of pausedVisuals)if(a.playState==='paused')a.play();pausedVisuals.clear();}}
 function get(){if(!example||example.seed!==seed)example=IRGModel.make(seed);return example;}
 function stop(){if(sceneRun?.raf)cancelAnimationFrame(sceneRun.raf);sceneRun=null;}
 function play(seconds,paint,done){stop();const run={elapsed:0,last:null,raf:0,paint,seconds};sceneRun=run;paint(0);function tick(now){if(sceneRun!==run)return;if(!paused&&!document.hidden){if(run.last!==null)run.elapsed+=Math.min((now-run.last)/1000,.08);paint(Math.min(run.elapsed/seconds,1));}run.last=now;if(run.elapsed<seconds)run.raf=requestAnimationFrame(tick);else{sceneRun=null;done?.();}}run.raf=requestAnimationFrame(tick);}
 function source(n){return document.querySelector(`#s${n}`);}
 function finish(){const r=sceneRun;if(!r)return;if(r.raf)cancelAnimationFrame(r.raf);r.paint(1);sceneRun=null;}
 function phases(root,st){root.querySelectorAll('[data-panel]').forEach(p=>{const show=p.dataset.panel.split(',').includes(String(st));p.classList.toggle('active',show);p.inert=!show;});}
 function create(n,setup,render){let ctx;return {init(){if(ctx?.dispose)ctx.dispose();ctx=setup(source(n),get());},enter({step:st}){stop();phases(source(n),st);render(ctx,st,false);},leave(){stop();},trigger(){stop();render(ctx,step,true);},pauseChanged(){},get context(){return ctx;}};}
 return{get,stop,play,finish,phases,create,pauseVisuals,get run(){return sceneRun;}};
})();
