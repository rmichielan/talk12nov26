/* Educational model layer for Block III. No DOM, timers, or presentation state.
 * Mathematical algorithms: D'Angelo & Michielan, supplied manuscript, Sections 2-5.
 * Floating-point demo, not a claim of an exact random-bit implementation.
 */
(function(global){
'use strict';
const W=Object.freeze([3,4,2,5,3,6,7,2,5,3]);
const pos=Object.freeze([[94,63],[251,42],[408,73],[468,192],[397,326],[241,366],[81,324],[43,187],[191,171],[323,220]].map(Object.freeze));
const sum=a=>a.reduce((s,x)=>s+x,0);
const key=(a,b)=>a<b?`${a}-${b}`:`${b}-${a}`;
const pair=k=>k.split('-').map(Number);
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
const exp=(r,rate)=>rate>0?-Math.log(1-r())/rate:Infinity;
const geo=(r,q)=>q<=0?Infinity:q>=1?0:Math.floor(Math.log(1-r())/Math.log1p(-q));
const fn={NR:z=>-Math.expm1(-z),GRG:z=>z/(1+z),CL:z=>Math.min(z,1)};
function alias(w){
 const n=w.length,L=sum(w);if(!n||L<=0)return {q:w.map(()=>0),a:w.map((_,i)=>i),states:[],L};
 const s=w.map(x=>n*x/L),q=Array(n).fill(1),a=w.map((_,i)=>i),lo=[],hi=[],cols=w.map((x,i)=>[{id:i,mass:n*x/L}]);
 const snap=()=>cols.map(c=>c.map(x=>({...x})));
 const states=[{cols:snap(),small:null,big:null}];
 s.forEach((x,i)=>(x<1-1e-12?lo:hi).push(i));
 while(lo.length&&hi.length){const l=lo.pop(),h=hi.pop(),amount=1-s[l];q[l]=Math.max(0,s[l]);a[l]=h;cols[l].push({id:h,mass:amount});cols[h][0].mass-=amount;s[h]-=amount;s[l]=1;states.push({cols:snap(),small:l,big:h,amount});(s[h]<1-1e-12?lo:hi).push(h);}
 return {q,a,states,L};
}
function drawAlias(tab,r){if(tab.L<=0)throw Error('Cannot sample zero mass');const col=Math.floor(r()*tab.q.length),u=r();return {id:u<tab.q[col]?col:tab.a[col],col,u};}
function poissonStream(w,seed,mult=1){
 const r=rng(seed),tab=alias(w),L=sum(w),events=[],edges=new Set();let t=exp(r,mult*L/2);
 while(t<=1){const ai=drawAlias(tab,r),aj=drawAlias(tab,r),i=ai.id,j=aj.id,k=key(i,j);let type=i===j?'loop':edges.has(k)?'duplicate':'new';if(i!==j)edges.add(k);events.push({t,i,j,key:k,type,ai,aj,thin:r()});t+=exp(r,mult*L/2);}
 return {events,edges,weights:[...w],L,tab};
}
function staticNaive(w,seed,model='CL'){
 const r=rng(seed),L=sum(w),trace=[],edges=new Set();for(let i=0;i<w.length;i++)for(let j=i+1;j<w.length;j++){const p=L?fn[model](w[i]*w[j]/L):0,accepted=r()<p,k=key(i,j);if(accepted)edges.add(k);trace.push({i,j,key:k,p,accepted});}return {trace,edges};
}
function millerHagberg(w,seed){
 const r=rng(seed),L=sum(w),order=w.map((_,i)=>i).sort((a,b)=>w[b]-w[a]||a-b),trace=[],edges=new Set();
 if(L<=0)return{order,trace,edges};
 for(let u=0;u<w.length-1;u++){let v=u+1;let q=Math.min(w[order[u]]*w[order[v]]/L,1);
  while(v<w.length&&q>0){const gap=geo(r,q),stop=Math.min(v+gap,w.length),skipped=[];for(let k=v;k<stop;k++)skipped.push(key(order[u],order[k]));
   if(v+gap>=w.length){trace.push({kind:'skip',row:u,skipped,q});break;}
   v+=gap;const i=order[u],j=order[v],p=Math.min(w[i]*w[j]/L,1),accepted=r()<p/q,k=key(i,j);if(accepted)edges.add(k);trace.push({kind:'candidate',i,j,key:k,row:u,column:v,skipped,q,p,accepted});q=p;v++;
  }
 }
 return {order,trace,edges};
}

function heavyPairs(w,threshold){
 const heap=w.map((_,i)=>i),pairs=[],visited={count:0};
 const down=i=>{for(;;){let best=i;const l=2*i+1,r=l+1;if(l<heap.length&&w[heap[l]]>w[heap[best]])best=l;if(r<heap.length&&w[heap[r]]>w[heap[best]])best=r;if(best===i)break;[heap[i],heap[best]]=[heap[best],heap[i]];i=best;}};
 for(let i=Math.floor(heap.length/2)-1;i>=0;i--)down(i);
 if(!heap.length)return{pairs,heap,visited:0};
 const partners=(k,a,emit)=>{if(k>=heap.length)return;visited.count++;const j=heap[k];if(a*w[j]<=threshold)return;emit(j);partners(2*k+1,a,emit);partners(2*k+2,a,emit);};
 partners(0,w[heap[0]],i=>partners(0,w[i],j=>{if(j>i)pairs.push([i,j]);}));
 return{pairs,heap,visited:visited.count};
}

function staticGeneral(w,seed,model,shared){
 const L=sum(w),C=model==='CL'?2:1,h=model==='CL'?.5:Infinity;
 const stream=shared&&C===1?shared:poissonStream(w,seed,C),r=rng(seed^0x7126ab),edges=new Set(),trace=[];
 for(const e of stream.events){const z=w[e.i]*w[e.j]/L,valid=e.i!==e.j&&z>0&&z<=h;const H=valid?(model==='NR'?z:model==='GRG'?Math.log1p(z):-Math.log1p(-z)):0;const prob=valid?H/(C*z):0;const accepted=e.i!==e.j&&z<=h&&e.thin<prob;if(accepted)edges.add(e.key);trace.push({...e,z,accepted,prob,phase:'proposals'});}
 const heavy=[];const enumeration=Number.isFinite(h)?heavyPairs(w,h*L):{pairs:[]};for(const [i,j] of enumeration.pairs){const z=w[i]*w[j]/L,accepted=r()<fn[model](z),k=key(i,j);if(accepted)edges.add(k);heavy.push({i,j,z,key:k,accepted});trace.push({i,j,z,key:k,accepted,phase:'heavy'});}
 return {trace,edges,heavy,C,h};
}
/* Genuine geometric deletion of the indexed edge array, scanned backwards.
   The visual trace is a record of the efficient construction, NOT a per-pair scan. */
function dynamicNR(initial,w,v,b,seed){
 const r=rng(seed),a=w[v],delta=b-a,L=sum(w),R=L-a,Lp=R+b,wp=[...w];wp[v]=b;
 const present=new Set(initial),trace=[],deleted=[],added=[];
 if(!delta||R<=0)return {trace,initial:new Set(initial),edges:present,weights:wp,oldWeights:[...w],delta,L,Lp,R,v,a,b,added,deleted,c:0,budget:0};
 const theta=delta>0?L/Lp:b*L/(a*Lp),c=1-theta;
 const B=[...present].filter(k=>delta>0||pair(k).includes(v));const initialArray=[...B];let k=B.length-1;
 while(k>=0&&c>0){const start=k,gap=geo(r,c),next=k-gap,skipped=[];for(let h=k;h>Math.max(next,-1);h--)skipped.push(B[h]);k=next;
  if(k<0){trace.push({phase:'delete',type:'skip',skipped,from:start,to:-1});break;}
  const edge=B[k],[i,j]=pair(edge),eligible=delta<0||!(i===v||j===v),z=w[i]*w[j]/L;
  const q=eligible?1-fn.NR(theta*z)/fn.NR(z):0,accepted=r()<q/c;
  trace.push({phase:'delete',type:'candidate',edge,i,j,key:edge,skipped,q,c,accepted,position:k});
  if(accepted){present.delete(edge);deleted.push(edge);B[k]=B[B.length-1];B.pop();}k--;
 }
 const ww=w.map((x,i)=>i===v?0:x),tab=alias(ww),budget=(delta>0?delta:Math.abs(delta)/2)*R*R/(L*Lp);let t=exp(r,budget);
 while(t<=1){const ai=delta>0?{id:v}:drawAlias(tab,r),aj=drawAlias(tab,r),i=ai.id,j=aj.id,edge=key(i,j),accepted=i!==j&&!present.has(edge);if(accepted){present.add(edge);added.push(edge);}trace.push({phase:'add',type:i===j?'loop':accepted?'new':'duplicate',t,i,j,key:edge,accepted,ai,aj});t+=exp(r,budget);}
 return {trace,initial:new Set(initial),edges:present,weights:wp,oldWeights:[...w],delta,L,Lp,R,v,a,b,added,deleted,c,theta,budget,initialArray};
}
function make(seed){
 const w=[...W],stream=poissonStream(w,seed^0x51e7),naive=staticNaive(w,seed^0x7aac),mh=millerHagberg(w,seed^0x42c1);
 const dynamic=dynamicNR(stream.edges,w,4,8,seed^0x1dd9);
 return {seed,w,L:sum(w),pos,stream,naive,mh,dynamic,alias:alias(w),grg:staticGeneral(w,seed^0x1243,'GRG',stream),cl:staticGeneral(w,seed^0x6ca3,'CL')};
}
const api={W,pos,sum,key,pair,rng,exp,geo,fn,alias,drawAlias,poissonStream,staticNaive,millerHagberg,staticGeneral,heavyPairs,dynamicNR,make};
if(typeof module!=='undefined'&&module.exports)module.exports=api;global.IRGModel=api;
})(typeof window!=='undefined'?window:globalThis);
