/* A scrub-able Walker--Vose construction. All masses come from IRGModel.alias;
 * the animation only moves them, and never changes the sampling distribution.
 */
const AliasConstruction=(()=>{
 const startX=60,pitch=62,width=42,bottom=270,unit=110;
 const xc=i=>startX+i*pitch+width/2;
 const fraction=x=>Number(x.toFixed(4)).toString();
 class View{
  constructor(root,data){
   this.root=root;this.d=data;this.status=root.querySelector('#alias-status');
   const host=root.querySelector('#alias-columns');host.innerHTML='';
   this.svg=E('svg',{viewBox:'0 0 700 460',role:'img','aria-label':'Alias table construction: mass transfers, acceptance cutoffs q and alias indices A'},host);
   this.bars=E('g',{},this.svg);this.travel=E('g',{},this.svg);this.array=E('g',{},this.svg);
   E('line',{x1:48,y1:bottom-unit,x2:674,y2:bottom-unit,stroke:'#8a9da8','stroke-width':1.5,'stroke-dasharray':'5 5'},this.svg);
   IRGViz.text(this.svg,27,bottom-unit,'1',{'font-size':21,fill:'#516e7c'});
   this.symbol('i',10,288);this.symbol('q',7,337);this.symbol('a',7,387);
   E('line',{x1:8,y1:317,x2:682,y2:317,stroke:'#cddae3','stroke-width':1.4},this.svg);
   E('line',{x1:8,y1:372,x2:682,y2:372,stroke:'#e0e7ec','stroke-width':1},this.svg);
   this.cells=data.w.map((_,i)=>{
    IRGViz.text(this.svg,xc(i),299,i+1,{'font-size':22,fill:'#334c63','font-weight':700});
    const box=E('rect',{x:xc(i)-26,y:327,width:52,height:90,rx:6,fill:'#f8fafb',stroke:'#d6e0e7'},this.array);
    return{box,q:IRGViz.text(this.array,xc(i),349,'-',{'font-size':22,fill:'#3b5366','font-weight':650,'data-alias-q':i+1}),a:IRGViz.text(this.array,xc(i),399,'-',{'font-size':22,fill:'#3b5366','font-weight':650,'data-alias-a':i+1})};
   });
   this.cursor=E('circle',{cx:0,cy:0,r:7,fill:'#233d50',stroke:'#fff','stroke-width':2,opacity:0},this.svg);
   this.columnSelection=E('rect',{x:0,y:bottom-unit,width:width+8,height:unit+8,rx:5,fill:'none',stroke:'#b47b33','stroke-width':3,opacity:0},this.svg);
  }
  symbol(id,x,y){const source=this.root.querySelector(`#alias-${id}-symbol svg`);if(!source)return;const s=source.cloneNode(true);s.setAttribute('x',x);s.setAttribute('y',y);s.setAttribute('width','34');s.setAttribute('height','27');s.setAttribute('color','#2e4b61');this.svg.append(s);}
  box(parent,i,height,offset,id,attrs={}){
   if(height<1e-9)return;
   E('rect',{x:startX+i*pitch,y:bottom-unit*(offset+height),width,height:unit*height,fill:WeightPalette.color(this.d.w[id]),stroke:'#f3edfa','stroke-width':1.1,'data-mass':height,'data-owner':id+1,'data-column':i+1,...attrs},parent);
   if(height*unit>18)IRGViz.text(parent,xc(i),bottom-unit*(offset+height/2),id+1,{'font-size':18,fill:WeightPalette.label(this.d.w[id]),'font-weight':700});
  }
  paint(stateIndex,highlight=null,overrideCols=null,finished=false){
   this.bars.replaceChildren();this.travel.replaceChildren();this.cursor.setAttribute('opacity',0);this.columnSelection.setAttribute('opacity',0);
   const states=this.d.alias.states,cols=overrideCols||states[stateIndex].cols,closed=new Set(states.slice(1,stateIndex+1).map(s=>s.small));
   if(finished)this.d.w.forEach((_,i)=>closed.add(i));
   cols.forEach((column,i)=>{
    E('rect',{x:startX+i*pitch-2,y:bottom-unit-2,width:width+4,height:unit+4,rx:3,fill:'#fff',stroke:closed.has(i)?'#7d9f92':'#cddbe2','stroke-width':1.6},this.bars);
    let off=0;for(const p of column){this.box(this.bars,i,p.mass,off,p.id);off+=p.mass;}
    if(highlight?.includes(i))E('rect',{x:startX+i*pitch-4,y:bottom-unit*Math.max(1,off)-4,width:width+8,height:unit*Math.max(1,off)+8,rx:4,fill:'none',stroke:'#b7813d','stroke-width':2.5},this.bars);
    const cell=this.cells[i];cell.q.textContent=closed.has(i)?fraction(this.d.alias.q[i]):'\u2014';cell.a.textContent=closed.has(i)?this.d.alias.a[i]+1:'\u2014';cell.box.setAttribute('fill',highlight?.includes(i)?'#fff0d9':closed.has(i)?'#eef5f0':'#f8fafb');
   });
   delete this.root.dataset.sampleColumn;delete this.root.dataset.sampleOutput;
   this.root.dataset.aliasFinalised=closed.size;
   this.root.dataset.aliasStep=stateIndex;
  }
  transfer(index,progress){
   const states=this.d.alias.states,to=states[index],from=states[index-1],p=Math.max(0,Math.min(1,progress)),l=to.small,h=to.big,amount=to.amount;
   if(p>=1){this.paint(index,[l],null,index===states.length-1);this.status.textContent=`Column ${h+1} supplies column ${l+1}. Record its cutoff and alias.`;this.root.dataset.transferProgress='1';return;}
   const cols=from.cols.map(c=>c.map(x=>({...x})));cols[h][0].mass-=amount;
   this.paint(index-1,[l,h],cols);
   const sourceHeight=from.cols[h].reduce((s,x)=>s+x.mass,0),targetHeight=from.cols[l].reduce((s,x)=>s+x.mass,0);
   const ease=p*p*(3-2*p),x0=startX+h*pitch,x1=startX+l*pitch,y0=bottom-unit*sourceHeight,y1=bottom-unit*(targetHeight+amount);
   const x=x0+(x1-x0)*ease,y=y0+(y1-y0)*ease-70*Math.sin(Math.PI*ease);
   const packet=E('g',{'class':'alias-transfer','data-source':h+1,'data-target':l+1,'data-mass':amount,'data-owner':h+1,transform:`translate(${x} ${y})`},this.travel);
   E('rect',{x:0,y:0,width,height:unit*amount,fill:WeightPalette.color(this.d.w[h]),stroke:'#a97433','stroke-width':2.4,rx:2},packet);
   IRGViz.text(packet,width/2,unit*amount/2,h+1,{'font-size':18,fill:WeightPalette.label(this.d.w[h]),'font-weight':750});
   this.status.textContent=`Move mass ${fraction(amount)} from column ${h+1} to column ${l+1}.`;
   this.root.dataset.transferProgress=String(p);
  }
  initial(){this.paint(0);this.status.textContent='Column heights are the normalised weights; the dashed line is 1.';this.root.dataset.aliasPhase='initial';this.root.dataset.running='false';}
  first(){
   this.root.dataset.aliasPhase='first-transfer';this.root.dataset.running='true';
   IRGScenes.play(2.0,f=>{this.transfer(1,Math.max(0,Math.min(1,(f-.12)/.75)));if(f===1){this.root.dataset.running='false';this.root.dataset.aliasPhase='first-hold';}});
  }
  rest(){
   const count=this.d.alias.states.length-1,remaining=count-1;this.root.dataset.aliasPhase='construction';this.root.dataset.running='true';
   IRGScenes.play(Math.max(1,remaining*0.8),f=>{
    if(f===1){this.paint(count,null,null,true);this.status.textContent='All ten columns have height 1. The tables q and A are ready.';this.root.dataset.aliasPhase='complete';this.root.dataset.running='false';return;}
    const z=f*remaining,index=2+Math.floor(z),part=z-Math.floor(z);this.transfer(index,Math.max(0,Math.min(1,(part-.08)/.8)));
   });
  }
  sample(){
   const last=this.d.alias.states.length-1,r=IRGModel.rng(seed^0xa115),draws=Array.from({length:4},()=>IRGModel.drawAlias(this.d.alias,r));this.root.dataset.aliasPhase='sampling';this.root.dataset.running='true';
   IRGScenes.play(7.6,f=>{
    const z=Math.min(3.99999,f*4),a=draws[Math.floor(z)],phase=f===1?1:z-Math.floor(z);this.paint(last,null,null,true);
    this.columnSelection.setAttribute('x',startX+a.col*pitch-4);this.columnSelection.setAttribute('y',bottom-unit-4);this.columnSelection.setAttribute('opacity',1);
    if(phase>.28){this.cursor.setAttribute('cx',xc(a.col));this.cursor.setAttribute('cy',bottom-unit*a.u);this.cursor.setAttribute('opacity',1);}
    this.status.textContent=phase<.28?`Choose column ${a.col+1} uniformly.`:phase<.6?`Test a uniform height against cutoff ${fraction(this.d.alias.q[a.col])}.`:`Output vertex ${a.id+1}: ${a.id===a.col?'own part':'alias part'}.`;
    this.root.dataset.sampleColumn=a.col+1;this.root.dataset.sampleOutput=phase>=.6?a.id+1:'';
    if(f===1)this.root.dataset.running='false';
   });
  }
 }
 return{View};
})();
