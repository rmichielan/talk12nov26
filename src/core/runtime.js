
  const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
  const E=(tag,attrs={},p)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);p?.appendChild(e);return e;};
  const mkRand=s=>{let a=s>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pairKey=(i,j)=>i<j?i+'-'+j:j+'-'+i;
  const queryArgs=new URLSearchParams(location.search);
  const MAX_SEED=10000,DEFAULT_SEED=6040;
  const parseSeed=value=>{
    if(!/^\d+$/.test(String(value??'')))return null;
    const n=Number(value);return Number.isSafeInteger(n)&&n>=0&&n<=MAX_SEED?n:null;
  };
  let seed=parseSeed(queryArgs.get('seed'))??DEFAULT_SEED;
  const valid=(v,min,max,def)=>{const n=Number(v);return v!==null&&Number.isFinite(n)&&n>=min&&n<=max?n:def;};
  let tau=valid(queryArgs.get('tau'),2.05,3.5,2.7),C=valid(queryArgs.get('C'),.05,3,.72);
  const net=new ScientificNetwork($('#network'),{seed,tau,C});net.start();window.coverNetwork=net;
  let slide=1,step=0,paused=false,data;
  // All network scenes share one seeded zero-temperature GIRG realization.
  // The slide-2 Chung–Lu and RGG samples reuse precisely its weights and
  // latent positions; only the edge-sampling mechanism is changed.
  // Mathematical model lives in graph-model.js; presentation logic starts here.
  const nodesAndEdges=()=>ScientificModel.derive(net.getTopology(),seed);
