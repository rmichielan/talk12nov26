  function syncCoverAnimation(){
    // Do not keep a 60 fps requestAnimationFrame loop running off-screen.
    // The SVG remains mounted, so slide-2 handoff can still clone it exactly.
    const active=(slide===1 || controllerFor(slide)?.coverAnimation?.(step))&&!paused&&!document.hidden;
    net.setPaused(!active);
    if(active)net.start();else net.stop();
  }

  function drawAll() {
    data = nodesAndEdges();
    if(typeof AsideNav!=="undefined") AsideNav.reset();
    for (const scene of Object.values(sceneControllers)) scene.init?.();
    $("#seedinfo").textContent = `seed ${seed} · τ ${tau.toFixed(2)} · C ${C.toFixed(2)}`;
  }

  function go(page, nextStep = 0) {
    if(AsideNav.active) AsideNav.close(false);
    IRGScenes.stop();
    triggerGeneration++;
    const oldPage = slide;
    const oldStep = step;
    const requestedPage = clamp(page, 1, slideCount);
    const requestedStep = clamp(nextStep, 0, slideMeta(requestedPage).reveals);
    controllerFor(oldPage)?.beforeChange?.({oldPage, oldStep, nextPage:requestedPage, nextStep:requestedStep});
    slide = clamp(page, 1, slideCount);
    step = clamp(nextStep, 0, slideMeta(slide).reveals);

    const slideElement = $("#slide");
    slideElement.dataset.page = slide;
    slideElement.dataset.step = step;
    for (const stage of document.querySelectorAll(".stage")) {
      stage.dataset.step = step;
      const active = Number(stage.dataset.slide) === slide;
      stage.classList.toggle("is-active", active);
      stage.setAttribute("aria-hidden", String(!active));
      stage.inert = !active;
    }

    $("#counter").textContent =
      String(slide - 1).padStart(2, "0") + " / " + String(slideCount).padStart(2, "0");
    if (oldPage !== slide) {
      controllerFor(oldPage)?.leave?.({ nextPage: slide, nextStep: step });
    }
    controllerFor(slide)?.enter?.({ oldPage, oldStep, step });
    syncCoverAnimation();
    timeline();

    try {
      const url = new URL(location.href);
      url.searchParams.set("seed", seed);
      url.searchParams.set("tau", String(tau));
      url.searchParams.set("C", String(C));
      url.hash = `slide-${slide}-${step}`;
      history.replaceState(null, "", url);
    } catch (error) {
      // The deck remains navigable if the browser blocks history updates.
    }
  }

  function next() {
    if(AsideNav.active){AsideNav.next();return;}
    if (controllerFor(slide)?.beforeAdvance?.() === false) return;
    if (step < slideMeta(slide).reveals) go(slide, step + 1);
    else if (slide < slideCount) go(slide + 1, 0);
  }

  function prev() {
    if(AsideNav.active){AsideNav.prev();return;}
    if (step > 0) go(slide, step - 1);
    else if (slide > 1) go(slide - 1, slideMeta(slide - 1).reveals);
  }

  function getSeed() {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      const range = MAX_SEED + 1;
      const limit = Math.floor(4294967296 / range) * range;
      do {
        crypto.getRandomValues(values);
      } while (values[0] >= limit);
      return values[0] % range;
    }
    const value = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    return Math.floor((value / 4294967296) * (MAX_SEED + 1));
  }

  function reroll(replay = false) {
    const optionalState = AsideNav.state();
    if (!replay) {
      let nextSeed;
      do {
        nextSeed = getSeed();
      } while (nextSeed === seed);
      seed = nextSeed;
    }
    net.reseed(seed);
    drawAll();
    go(slide, step);
    AsideNav.restore(optionalState);
  }

  let triggerGeneration = 0;
  /* @CONTROLLER_REGISTRY@ */
  const controllerFor = id => sceneControllers[slideMeta(id)?.key];

  function trigger() {
    if(AsideNav.active){AsideNav.trigger();return;}
    controllerFor(slide)?.trigger?.();
  }

  $("#back").addEventListener("click", prev);
  $("#forward").addEventListener("click", next);
  $("#reseed").addEventListener("click", () => reroll());
  $("#trigger").addEventListener("click", trigger);

  const paramPanel = $("#network-parameters");

  function updateSliderReadout(inputId, outputId, digits) {
    const input = $(inputId);
    const output = $(outputId);
    output.textContent = Number(input.value).toFixed(digits);
  }

  $("#tau-input").addEventListener("input", () =>
    updateSliderReadout("#tau-input", "#tau-value", 2)
  );
  $("#c-input").addEventListener("input", () =>
    updateSliderReadout("#c-input", "#c-value", 2)
  );

  let focusBeforeSettings = null;
  const setPanel = open => {
    if(open) focusBeforeSettings = document.activeElement;
    paramPanel.classList.toggle("visible", open);
    paramPanel.setAttribute("aria-hidden", open ? "false" : "true");
    paramPanel.inert = !open;
    if (open) {
      paramPanel.dataset.irg=String(slide>=9);
      paramPanel.querySelector(".parameter-caption").textContent=slide>=9?"Block III: fixed ten weights. Seed changes all example traces; tau and C belong to Block I.":"Zero-temperature GIRG / non-periodic square / d = 2";
      $("#tau-input").disabled=slide>=9; $("#c-input").disabled=slide>=9;
      $("#tau-input").value = tau.toFixed(2);
      $("#c-input").value = C.toFixed(2);
      $("#seed-input").value = String(seed);
      updateSliderReadout("#tau-input", "#tau-value", 2);
      updateSliderReadout("#c-input", "#c-value", 2);
      setTimeout(()=>{if(paramPanel.classList.contains("visible"))$(slide>=9 ? "#seed-input" : "#tau-input").focus({preventScroll:true});},220);
    } else if(paramPanel.contains(document.activeElement)) {
      const target = focusBeforeSettings instanceof HTMLElement && !paramPanel.contains(focusBeforeSettings) ? focusBeforeSettings : $("#slide");
      if(target === document.body) $("#slide").focus({preventScroll:true});
      else target.focus({preventScroll:true});
    }
  };

  let statusTimer=null;
  function showParameterStatus(){
    const status=$("#parameter-status");
    if(!status)return;
    status.textContent=slide>=9?`Example updated | seed ${seed} | ${IRGScenes.get().stream.edges.size} NR edges`:`Network updated · seed ${seed} · τ ${tau.toFixed(2)} · C ${C.toFixed(2)} · ${data.source.length} edges`;
    status.classList.add('visible');
    if(statusTimer)clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>status.classList.remove('visible'),2800);
  }

  $("#params-close").addEventListener("click", () => setPanel(false));
  $("#parameter-form").addEventListener("submit", event => {
    event.preventDefault();
    const optionalState = AsideNav.state();
    const nextTau = Number($("#tau-input").value);
    const nextC = Number($("#c-input").value);
    const requestedSeed = parseSeed($("#seed-input").value);
    if (
      !Number.isFinite(nextTau) ||
      nextTau < 2.05 ||
      nextTau > 3.5 ||
      !Number.isFinite(nextC) ||
      nextC < 0.05 ||
      nextC > 3 ||
      requestedSeed === null
    ) {
      $("#parameter-error").textContent =
        "Enter a valid seed (0–10000) and permitted parameter values.";
      return;
    }

    $("#parameter-error").textContent = "";
    tau = nextTau;
    C = nextC;
    seed = requestedSeed;
    net.options.tau = tau;
    net.options.C = C;
    // Applying settings is an atomic rebuild of model and the persistent SVGs.
    // It works from any slide/reveal (including a transition in progress).
    net.reseed(seed);
    drawAll();
    go(slide, step);
    AsideNav.restore(optionalState);
    setPanel(false);
    showParameterStatus();
  });

  window.addEventListener("resize", () => controllerFor(slide)?.resize?.());
  $("#help").addEventListener("click", () => $("#helpbox").classList.toggle("visible"));
  $("#pause").addEventListener("click", () => {
    paused = !paused;
    $("#pause").textContent = paused ? "PLAY" : "PAUSE";
    $("#slide").dataset.paused = paused ? "true" : "false";
    controllerFor(slide)?.pauseChanged?.(paused || document.hidden);
    IRGScenes.pauseVisuals(!!(paused || document.hidden));
    syncCoverAnimation();
    timeline();
  });

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (key === "escape") {
      setPanel(false);
      $("#helpbox").classList.remove("visible");
      return;
    }
    // The Y shortcut also closes the panel while a slider is focused.
    // Do not steal ordinary text input keystrokes from future form fields.
    const textEditing=event.target?.tagName==='TEXTAREA' ||
      (event.target?.tagName==='INPUT' && ['text','search','email','password','url'].includes(event.target.type));
    if (key === "y" && !textEditing) {
      event.preventDefault();
      setPanel(!paramPanel.classList.contains("visible"));
      return;
    }
    if (event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (paramPanel.classList.contains("visible")) return;

    if (key === "arrowdown") {
      event.preventDefault();
      if(slide===13) AsideNav.open("alias");
      else if(slide===18) AsideNav.open("ebus");
    } else if (key === "arrowup") {
      event.preventDefault(); AsideNav.close();
    } else if (key === "r") {
      event.preventDefault();
      reroll(event.shiftKey);
    } else if (key === "t") {
      event.preventDefault();
      trigger();
    } else if (key === "arrowright" || key === " " || key === "enter") {
      event.preventDefault();
      next();
    } else if (key === "arrowleft") {
      event.preventDefault();
      prev();
    } else if (key === "pagedown") {
      event.preventDefault();
      go(slide + 1);
    } else if (key === "pageup") {
      event.preventDefault();
      go(slide - 1);
    } else if (key === "p") {
      $("#pause").click();
    } else if (key === "f") {
      event.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    } else if (key === "h" || key === "?") {
      $("#help").click();
    }
  });

  document.addEventListener("visibilitychange", () => {
    controllerFor(slide)?.pauseChanged?.(paused || document.hidden);
    IRGScenes.pauseVisuals(!!(paused || document.hidden));
    syncCoverAnimation();
    timeline();
  });

  ResearchWheel.mount();
  drawAll();
  const initialHash = location.hash.match(/^#slide-(\d+)-(\d+)$/);
  go(initialHash ? Number(initialHash[1]) : 1, initialHash ? Number(initialHash[2]) : 0);
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) $("#pause").click();

  window.talk = {
    go,
    next,
    prev,
    trigger,
    reroll,
    setParameters: (nextTau, nextC) => {
      tau = nextTau;
      C = nextC;
      net.options.tau = tau;
      net.options.C = C;
      reroll(true);
    },
    temporal: {
      advance: advanceTemporal,
      state: () =>
        temporal
          ? {
              now: temporal.now,
              present: temporal.present.size,
              added: temporal.added,
              removed: temporal.removed,
              changed: temporal.changed,
              weights: temporal.nodes.map(vertex => vertex.w),
              stopped: temporal.stopped,
              clock: {
                minGap: 0.8,
                maxGap: 2.5,
                meanGap: 1.5,
                duration: 30,
                rate: temporal.clockRate,
              },
              upcoming: temporal.nextEvent,
              events: temporal.events.map(({ time, type }) => ({ time, type })),
            }
          : null,
    },
    irg: {finish:()=>IRGScenes.finish(), data:()=>{const d=IRGScenes.get();return {seed:d.seed,weights:d.w,L:d.L,events:d.stream.events,edges:[...d.stream.edges],dynamic:{added:d.dynamic.added,deleted:d.dynamic.deleted,edges:[...d.dynamic.edges],weights:d.dynamic.weights,trace:d.dynamic.trace},mh:{order:d.mh.order,trace:d.mh.trace,edges:[...d.mh.edges]}};}, aside:AsideNav},
    networkSnapshot: () => NetworkContinuity.snapshot(),
    viewport: () => ({scale:Viewport.scale,width:Viewport.width,height:Viewport.height}),
    state: () => ({
      slide,
      step,
      seed,
      n: data.nodes.length,
      m: data.source.length,
      popEdges: data.pop.length,
      rggEdges: data.geo.length,
      triangles: data.triangles,
      hub: data.hub,
      local: data.local,
      tau: data.tau,
      dimension: data.dimension,
      model: data.model,
    }),
  };
