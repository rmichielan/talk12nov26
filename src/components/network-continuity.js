  // Persistent SVG views: the top copy becomes the single graph of slides 3/4.
  // Neither a slide change nor a resize regenerates nodes, edges or positions.
  const NetworkContinuity=(()=>{
    let first=null,second=null,epoch=0,raf=null,animations=[],busy=false,
        pendingAdvance=false,captured=null,model=0;
    const overlay=()=>$('#split-overlay'),a=()=>$('#split-original'),b=()=>$('#split-copy');
    const ease=t=>t*t*(3-2*t);
    const place=(el,r)=>Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transform:'none'});
    const areas=()=>({top:Viewport.contentRect($('#popnet')),bottom:Viewport.contentRect($('#geonet'))});
    const target=page=>Viewport.contentRect($(page===4?'#detectnet':'#mergednet'));
    const visible=()=>{overlay().style.visibility='visible';overlay().style.opacity='1';};
    function cancel(){
      epoch++;
      // Commit the *current* visual positions before cancelling transforms.
      const rectangles=[a(),b()].map(el=>el?.style.width?Viewport.rect(el):null);
      animations.forEach(animation=>animation.cancel());animations=[];
      if(raf!==null)cancelAnimationFrame(raf);raf=null;
      rectangles.forEach((r,i)=>{if(r)place(i?b():a(),r);});
      busy=false;pendingAdvance=false;
      $('#slide').dataset.graphTransition='idle';
    }
    function hide(){cancel();overlay().style.visibility='hidden';overlay().style.opacity='0';$('#slide').dataset.handoff='none';}
    function init(){
      cancel();
      first=new NetworkView(a());second=new NetworkView(b());
      model=0;captured=null;overlay().style.visibility='hidden';
    }
    function move(el,from,to,duration){
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){place(el,to);return;}
      place(el,from);const s=to.width/from.width;
      const animation=el.animate([
        {transform:'translate(0px,0px) scale(1)'},
        {transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${s})`}
      ],{duration,easing:'cubic-bezier(.23,.75,.22,1)',fill:'forwards'});
      animations.push(animation);if(paused)animation.pause();
    }
    function run(duration,paint,complete){
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){
        busy=false;paint(1,1);complete?.();$('#slide').dataset.graphTransition='idle';return;
      }
      const token=epoch;busy=true;
      let elapsed=0,last=null;
      function frame(now){
        if(token!==epoch)return;
        const dt=last===null?0:Math.min(100,Math.max(0,now-last));last=now;
        if(!paused&&!document.hidden)elapsed+=dt;
        const t=duration?Math.min(1,elapsed/duration):1;paint(ease(t),t);
        if(t<1){raf=requestAnimationFrame(frame);return;}
        raf=null;const advance=pendingAdvance;pendingAdvance=false;busy=false;
        complete?.();if(!busy)$('#slide').dataset.graphTransition='idle';
        if(advance)next();
      }
      raf=requestAnimationFrame(frame);
    }
    function commit(el,rect){
      animations.filter(animation=>animation.effect?.target===el).forEach(animation=>animation.cancel());
      animations=animations.filter(animation=>animation.effect?.target!==el);place(el,rect);
    }
    function capture(){captured=Viewport.contentRect($('#network'));}
    function split(){
      const initial=captured||Viewport.contentRect($('#network'));cancel();
      first.annotations(0);second.annotations(0);first.captureCover();second.paint(first.state);
      visible();a().style.opacity='1';b().style.opacity='1';
      const {top,bottom}=areas();
      $('#slide').dataset.handoff='running';$('#slide').dataset.splitPhase='separating';
      $('#slide').dataset.graphTransition='splitting';
      move(a(),initial,top,1000);move(b(),initial,bottom,1000);
      run(1000,()=>{},()=>{
        commit(a(),top);commit(b(),bottom);model=0;captured=null;
        $('#slide').dataset.splitPhase='separated';$('#slide').dataset.handoff='framed';
        // Frames and labels appear only after the two copies have arrived.
        run(500,()=>{},()=>{$('#slide').dataset.handoff='done';morph(1);});
      });
    }
    function settleCards(value=0){
      cancel();visible();first.annotations(0);second.annotations(0);
      const {top,bottom}=areas();place(a(),top);place(b(),bottom);
      a().style.opacity='1';b().style.opacity='1';
      first.paint(first.target(value?'pop':'source'));second.paint(second.target(value?'geo':'source'));model=value;
      $('#slide').dataset.handoff='done';$('#slide').dataset.splitPhase='separated';
    }
    function morph(value){
      cancel();visible();
      const fromA=first.state,fromB=second.state;
      const toA=first.target(value?'pop':'source'),toB=second.target(value?'geo':'source');
      const start=model;$('#slide').dataset.graphTransition='model-morph';
      run(600,(t)=>{model=start+(value-start)*t;first.interpolate(fromA,toA,t);second.interpolate(fromB,toB,t);},()=>{model=value;});
    }
    function enterSingle(page,oldPage){
      // Slide changes are scene cuts, not a travelling panel. The SAME SVG and
      // underlying graph survive, but appear immediately at the new location.
      // Only *within* slide 2 do the two SVG copies physically separate.
      const wasOverview=oldPage===2;
      const previous=first.state;
      cancel();visible();
      first.annotations(0);second.annotations(0);
      place(a(),target(page));
      b().style.opacity='0';a().style.opacity='1';
      const source=first.target('source');
      if(wasOverview && page===3 && model>0.001){
        first.paint(source);
        model=0;
        first.annotations(page);
        return;
      }
      first.paint(source);model=0;first.annotations(page);
    }
    function enterOverview({oldPage,oldStep}){
      if(step===0){hide();captured=null;return;}
      // Reverse page navigation also cuts to the destination; no slide-to-slide
      // network translation. Both card views are restored from the graph data.
      if(oldPage===3||oldPage===4){settleCards(step===2?1:0);return;}
      if(step===1&&oldPage===2&&oldStep===0){split();return;}
      if(step===2&&oldPage===2&&oldStep===1){
        if(overlay().style.visibility!=='visible')settleCards(0);
        $('#slide').dataset.handoff='done';if(model<1)morph(1);return;
      }
      if(step===1&&oldPage===2&&oldStep===2){morph(0);return;}
      settleCards(step===2?1:0);
    }
    function beforeAdvance(){if(busy){pendingAdvance=true;return false;}return true;}
    function pauseChanged(value){for(const animation of animations){if(value)animation.pause();else animation.play();}}
    function leave(nextPage){if(![2,3,4].includes(nextPage))hide();}
    function trigger(){
      if(busy)return;
      if(step===0)go(2,1);
      else if(step===1){capture();split();}
      else{
        morph(0);const token=epoch;
        waitPresentation(1550,()=>token===epoch&&slide===2&&step===2).then(ok=>{if(ok)morph(1);});
      }
    }
    return {init,capture,enterOverview,enterSingle,beforeAdvance,pauseChanged,leave,hide,trigger,
      snapshot:()=>({busy,model,first:first?.snapshot(),second:second?.snapshot(),ids:[a(),b()].map(el=>el?.id)})};
  })();
