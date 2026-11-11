  function makeStructureAnnotations(){
    const root=E('g',{'class':'network-annotations'});
    for(const [id,ids,color]of [['hub-focus',data.hub,'#a36ccc'],['geo-focus',data.local,'#229f86']]){
      const layer=E('g',{id},root);if(ids.length!==3)continue;
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
        const a=graphPoint(data.nodes[ids[i]]),b=graphPoint(data.nodes[ids[j]]);
        E('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color,'stroke-width':6,'stroke-linecap':'round'},layer);
      }
      for(const i of ids){const v=data.nodes[i],p=graphPoint(v);
        E('circle',{cx:p.x,cy:p.y,r:v.r+4,fill:color,'fill-opacity':.13,stroke:color,'stroke-width':3.5},layer);
      }
    }
    return root;
  }
  const trigger_02_structure=()=>{
    if(step<1)go(3,1);
    for(const id of ['#hub-focus','#geo-focus'])if($(id)?.children.length){
      $(id).animate([{opacity:.2},{opacity:1},{opacity:.8}],{duration:1200});
    }
  };
  const controller_02_structure={
    init(){},
    enter({oldPage}){NetworkContinuity.enterSingle(3,oldPage);},
    beforeAdvance:()=>NetworkContinuity.beforeAdvance(),
    pauseChanged:p=>NetworkContinuity.pauseChanged(p),
    leave:ctx=>NetworkContinuity.leave(ctx.nextPage),
    trigger:trigger_02_structure
  };
