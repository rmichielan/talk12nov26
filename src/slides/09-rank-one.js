
const controller_09_rank_one=IRGScenes.create(10,(root,d)=>{
 root.querySelector('#curve10').innerHTML='';const svg=E('svg',{viewBox:'0 0 360 205',role:'img','aria-label':'GRG below NR below CL, coinciding to first order near zero'},root.querySelector('#curve10'));
 E('path',{d:'M40 15V166H344',fill:'none',stroke:'#8299a7','stroke-width':1.5},svg);
 const axis=root.querySelector('#intensity-axis-symbol svg').cloneNode(true);axis.setAttribute('x','321');axis.setAttribute('y','172');axis.setAttribute('width','33');axis.setAttribute('height','23');axis.setAttribute('color','#476475');svg.append(axis);IRGViz.text(svg,18,22,'1',{'font-size':18,fill:'#476475'});IRGViz.text(svg,40,185,'0',{'font-size':18,fill:'#476475'});
 const zoom=E('rect',{x:40,y:130,width:48,height:36,rx:5,fill:'#f0d3a5',opacity:.0},svg);
 [['GRG','#8d76ac'],['NR','#c1843e'],['CL','#3e969c']].forEach(([model,color],k)=>{let points=[];for(let i=0;i<=120;i++){let z=2*i/120;points.push(`${40+z*150},${166-IRGModel.fn[model](z)*145}`);}E('polyline',{points:points.join(' '),fill:'none',stroke:color,'stroke-width':2.8},svg);IRGViz.text(svg,90+90*k,200,model,{'font-size':17,fill:color,'font-weight':700});});
 return{root,zoom};
},(c,s)=>{c.zoom.setAttribute('opacity',s===2?.75:0);c.root.querySelectorAll('[data-model-reveal]').forEach(el=>{el.inert=s===0;el.setAttribute('aria-hidden',String(s===0));});});
