  function makeDetectionAnnotations(){
    const root=E('g',{'class':'network-annotations'});
    const h=E('g',{id:'hyper-layer'},root);
    for(const r of [110,205,300])E('circle',{cx:550,cy:430,r,fill:'none',stroke:'#9b72c9','stroke-width':4.8,'stroke-opacity':.75,'stroke-dasharray':'12 10'},h);
    const l=E('g',{id:'local-layer'},root);
    const cx=760,cy=445,rx=218,ry=184;
    E('ellipse',{cx,cy,rx,ry,fill:'#9777c5','fill-opacity':.14,stroke:'#9875c7','stroke-width':5,'stroke-dasharray':'10 9'},l);
    // Draw ONLY existing local GIRG edges. Highlighting cannot invent topology.
    const isLocal=v=>{const p=graphPoint(v);return ((p.x-cx)/rx)**2+((p.y-cy)/ry)**2<.8;};
    for(const [i,j] of data.source){
      if(!isLocal(data.nodes[i])||!isLocal(data.nodes[j]))continue;
      const a=graphPoint(data.nodes[i]),b=graphPoint(data.nodes[j]);
      E('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#9062ba','stroke-width':6.5,'stroke-opacity':.91,'stroke-linecap':'round'},l);
    }
    for(const v of data.nodes){const p=graphPoint(v);
      if(isLocal(v)){
        E('circle',{cx:p.x,cy:p.y,r:v.r+8,fill:'#9869c5','fill-opacity':.13,stroke:'#9869c5','stroke-opacity':.9,'stroke-width':2.8},l);
      }
    }
    // Conceptual planted overlay, never inserted into the base GIRG topology.
    const c=E('g',{id:'clique-layer'},root),ids=[3,16,35,50,70].filter(i=>i<data.nodes.length);
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      const a=graphPoint(data.nodes[ids[i]]),b=graphPoint(data.nodes[ids[j]]);
      E('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#a176cf','stroke-width':8,'stroke-linecap':'round','stroke-opacity':.98},c);
    }
    for(const id of ids){const v=data.nodes[id],p=graphPoint(v);E('circle',{cx:p.x,cy:p.y,r:v.r+6.5,fill:'#a87acd',stroke:'#fff','stroke-width':3},c);}
    return root;
  }
  const trigger_03_detection=()=>{
    if(step<2)go(4,step+1);
    else $('#clique-layer')?.animate([{opacity:.2},{opacity:1},{opacity:.65}],{duration:1200});
  };
  const controller_03_detection={init(){},
    enter({oldPage}){NetworkContinuity.enterSingle(4,oldPage);},
    beforeAdvance:()=>NetworkContinuity.beforeAdvance(),
    pauseChanged:p=>NetworkContinuity.pauseChanged(p),
    leave:ctx=>NetworkContinuity.leave(ctx.nextPage),
    trigger:trigger_03_detection
  };
