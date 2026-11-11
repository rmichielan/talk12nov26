  const controller_01_interests={
    init:()=>NetworkContinuity.init(),
    beforeAdvance:()=>NetworkContinuity.beforeAdvance(),
    beforeChange({oldPage,oldStep,nextPage,nextStep}){
      if(oldPage===2&&oldStep===0&&nextPage===2&&nextStep===1)NetworkContinuity.capture();
    },
    enter:ctx=>NetworkContinuity.enterOverview(ctx),
    leave:ctx=>NetworkContinuity.leave(ctx.nextPage),
    pauseChanged:p=>NetworkContinuity.pauseChanged(p),
    trigger:()=>NetworkContinuity.trigger()
  };
