  // Every continuing view uses identical latent-to-SVG coordinates. The model
  // never changes as a side effect of fitting a rectangle or advancing a slide.
  const NetworkStyle=Object.freeze({width:1100,height:860,edgeWidth:3.2,
    edgeOpacity:.62,sourceColor:'#397f8e',popColor:'#397f8e',geoColor:'#6486a2',
    nodeColor:'#337f8c',geometricRadius:9.4});
  const graphPoint=v=>({x:v.coverX,y:v.coverY});
  const attr=(el,name,value)=>{const text=String(value);if(el.getAttribute(name)!==text)el.setAttribute(name,text);};

  class NetworkView {
    constructor(svg){
      this.svg=svg;svg.replaceChildren();
      svg.setAttribute('viewBox','0 0 1100 860');
      svg.setAttribute('preserveAspectRatio','xMidYMid meet');
      this.base=E('g',{'class':'persistent-base'},svg);
      this.edgeLayer=E('g',{'class':'edges'},this.base);
      this.nodeLayer=E('g',{'class':'nodes'},this.base);
      const pairs=new Map();
      for(const list of [data.source,data.pop,data.geo])for(const [i,j]of list)pairs.set(pairKey(i,j),[i,j]);
      this.edges=[...pairs].map(([key,[i,j]])=>({key,i,j,el:E('line',{'data-edge':key,'stroke-linecap':'round'},this.edgeLayer)}));
      this.nodes=data.nodes.map(v=>{
        const g=E('g',{'data-id':v.id},this.nodeLayer);
        return {halo:E('circle',{fill:'url(#node-halo)'},g),core:E('circle',{'data-node':v.id,opacity:1},g)};
      });
      // Metadata lets detection highlight existing local edges without
      // rebuilding or changing the persistent graph.
      const local=v=>{const p=graphPoint(v);return ((p.x-760)/218)**2+((p.y-445)/184)**2<.8;};
      this.nodes.forEach(({core},i)=>{
        if(local(data.nodes[i]))core.classList.add('focus-local');
        if([3,16,35,50,70].includes(i))core.classList.add('focus-clique');
      });
      this.edges.forEach(({i,j,el})=>{
        if(local(data.nodes[i])&&local(data.nodes[j]))el.classList.add('focus-local');
      });
      this.annotation=null;
      this.state=this.target('source');this.paint(this.state);
    }
    target(mode){
      const pairs=mode==='pop'?data.pop:mode==='geo'?data.geo:data.source;
      const set=new Set(pairs.map(([i,j])=>pairKey(i,j)));
      const color=mode==='geo'?NetworkStyle.geoColor:NetworkStyle.nodeColor;
      return {nodes:data.nodes.map(v=>{
        const pt=mode==='pop'?{x:43+1014*data.popPos[v.id].x,y:43+774*data.popPos[v.id].y}:graphPoint(v);
        return {...pt,r:mode==='geo'?NetworkStyle.geometricRadius:v.r,color,halo:.025};
      }),edges:this.edges.map(e=>({opacity:set.has(e.key)?NetworkStyle.edgeOpacity:0,width:NetworkStyle.edgeWidth,color:mode==='geo'?NetworkStyle.geoColor:NetworkStyle.sourceColor}))};
    }
    captureCover(){
      // Read the visible disks, including any pulse already in progress.
      const cores=[...document.querySelectorAll('#base-network .nodes g')];
      const source=new Map([...document.querySelectorAll('#base-network .edges line')].map((el,k)=>[pairKey(...data.source[k]),el]));
      const state=this.target('source');
      cores.forEach((g,i)=>{
        const [halo,core]=g.querySelectorAll('circle');
        state.nodes[i].r=Number(core.getAttribute('r'));
        state.nodes[i].color=getComputedStyle(core).fill;
        state.nodes[i].halo=Math.min(.12,Number(halo.getAttribute('opacity')||0));
      });
      this.edges.forEach((e,k)=>{const el=source.get(e.key);if(!el)return;
        const css=getComputedStyle(el);state.edges[k]={opacity:Number(css.strokeOpacity),width:Number.parseFloat(css.strokeWidth),color:css.stroke};
      });
      this.paint(state);
    }
    paint(state){
      this.state=state;
      this.edges.forEach((edge,k)=>{
        const a=state.nodes[edge.i],b=state.nodes[edge.j],style=state.edges[k],el=edge.el;
        attr(el,'x1',a.x.toFixed(3));attr(el,'y1',a.y.toFixed(3));attr(el,'x2',b.x.toFixed(3));attr(el,'y2',b.y.toFixed(3));
        // Model membership is explicit: CSS spotlights must never reveal an edge
        // which is absent in the currently rendered graph.
        el.classList.toggle('edge-present',style.opacity>0.001);
        attr(el,'stroke',style.color);attr(el,'stroke-width',style.width.toFixed(3));attr(el,'stroke-opacity',style.opacity.toFixed(4));
      });
      this.nodes.forEach(({core,halo},i)=>{
        const n=state.nodes[i];
        for(const el of [core,halo]){attr(el,'cx',n.x.toFixed(3));attr(el,'cy',n.y.toFixed(3));}
        attr(core,'r',n.r.toFixed(3));attr(core,'fill',n.color);
        attr(halo,'r',(n.r*3.5).toFixed(3));attr(halo,'opacity',n.halo.toFixed(3));
      });
    }
    interpolate(from,to,t){
      const lerp=(a,b)=>a+(b-a)*t;
      this.paint({nodes:from.nodes.map((n,i)=>({x:lerp(n.x,to.nodes[i].x),y:lerp(n.y,to.nodes[i].y),r:lerp(n.r,to.nodes[i].r),halo:lerp(n.halo,to.nodes[i].halo),color:lerpColor(n.color,to.nodes[i].color,t)})),
        edges:from.edges.map((e,i)=>({width:lerp(e.width,to.edges[i].width),opacity:lerp(e.opacity,to.edges[i].opacity),color:lerpColor(e.color,to.edges[i].color,t)}))});
    }
    annotations(page){
      const key=String(page);
      if(this.annotation?.dataset.page===key)return;
      this.annotation?.remove();this.annotation=null;
      if(page!==3&&page!==4)return;
      this.annotation=page===3?makeStructureAnnotations():makeDetectionAnnotations();
      this.annotation.dataset.page=key;this.svg.appendChild(this.annotation);
    }
    snapshot(){return {nodeIds:this.nodes.map((_,i)=>i),nodes:this.state.nodes.map(n=>[n.x,n.y,n.r]),edges:this.edges.filter((e,i)=>this.state.edges[i].opacity>.01).map(e=>e.key)};}
  }
