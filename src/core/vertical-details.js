/* Optional vertical details: Down enters; Up returns to the exact parent reveal.
 * Right / Space / Enter advance the detail, then continue to the next main slide.
 * Left steps back inside the detail; PageDown is the explicit skip shortcut.
 */
const AsideNav=(()=>{
 let active=null,parentStep=0,current=0,aliasView=null;
 function alias(s){
  if(!aliasView)aliasView=new AliasConstruction.View($('#aside-alias'),IRGScenes.get());
  if(s===0)aliasView.initial();else if(s===1)aliasView.first();else if(s===2)aliasView.rest();else aliasView.sample();
 }
 function ebus(s){const root=$('#aside-ebus'),host=root.querySelector('#ebus-buckets'),d=IRGScenes.get(),w=s>=2?d.dynamic.weights:d.w;const previous=new Map([...host.querySelectorAll('.bucket-chip')].map(e=>[e.dataset.id,e.getBoundingClientRect()]));host.innerHTML='';for(let e=0;e<4;e++){const row=document.createElement('div');row.className='bucket-row';row.innerHTML=`<div class="bucket-label">[${2**e}, ${2**(e+1)})</div><div class="bucket-nodes"></div>`;const items=row.querySelector('.bucket-nodes');w.forEach((x,i)=>{if(x>=2**e&&x<2**(e+1)){const chip=document.createElement('div');chip.className='bucket-chip'+(s>=2&&i===4?' hot':'');chip.style.background=WeightPalette.color(x);chip.style.color=WeightPalette.label(x);chip.textContent=i+1;chip.dataset.id=i;chip.title=`vertex ${i+1}, weight ${x}`;items.append(chip);}});host.append(row);}for(const chip of host.querySelectorAll('.bucket-chip')){const old=previous.get(chip.dataset.id);if(old){const now=chip.getBoundingClientRect(),scale=Viewport.scale;chip.animate?.([{transform:`translate(${(old.x-now.x)/scale}px,${(old.y-now.y)/scale}px)`},{transform:'translate(0,0)'}],{duration:600,easing:'ease-in-out'});}}root.querySelector('#ebus-status').textContent=s<2?'Circles show vertex identifiers, grouped by current weight.':'Vertex 5 moves from [2,4) to [8,16).';
  if(s===1){const chips=host.querySelectorAll('.bucket-chip');IRGScenes.play(4,f=>{chips.forEach(x=>x.classList.remove('hot'));chips[Math.min(chips.length-1,Math.floor(f*chips.length))]?.classList.add('hot');});}
 }
 function render(){if(!active)return;const root=$('#aside-'+active);root.dataset.step=current;IRGScenes.stop();IRGScenes.phases(root,current);(active==='alias'?alias:ebus)(current);$('#counter').textContent=(active==='alias'?'12.1':'17.1')+' / '+slideCount;}
 function open(name){if(!['alias','ebus'].includes(name)||active===name)return;const parent=name==='alias'?13:18;if(slide!==parent)go(parent,slideMeta(parent).reveals);IRGScenes.stop();parentStep=step;active=name;current=0;document.body.dataset.aside=name;document.querySelector(`.stage[data-slide="${slide}"]`)?.classList.remove('is-active');const root=$('#aside-'+name);root.classList.add('is-active');root.inert=false;root.setAttribute('aria-hidden','false');render();}
 function close(resume=true){if(!active)return;IRGScenes.stop();const root=$('#aside-'+active);root.classList.remove('is-active');root.inert=true;root.setAttribute('aria-hidden','true');active=null;delete document.body.dataset.aside;const parent=document.querySelector(`.stage[data-slide="${slide}"]`);parent?.classList.add('is-active');if(resume){step=parentStep;$('#counter').textContent=String(slide-1).padStart(2,'0')+' / '+String(slideCount).padStart(2,'0');}}
 function nextDetail(){
  if(!active)return;
  if(current<3){current++;render();}
  else{const nextPage=slide+1;close(false);go(nextPage,0);}
 }
 document.querySelectorAll('[data-open-aside]').forEach(b=>b.onclick=()=>open(b.dataset.openAside));document.querySelectorAll('[data-close-aside]').forEach(b=>b.onclick=()=>close());
 return{open,close,restore(saved){if(!saved?.active)return;open(saved.active);current=saved.current;render();},next:nextDetail,prev(){if(current>0){current--;render();}else close();},trigger:render,get active(){return active;},state:()=>({active,current,parent:slide,parentStep}),reset(){aliasView=null;}};
})();
