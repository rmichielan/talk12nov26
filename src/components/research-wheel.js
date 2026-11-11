  // Single SVG geometry shared by the overview and the three section markers.
  // The complete wheel and every decorative element are static.
  const ResearchWheel=(()=>{
    const CX=240,CY=240;
    const palette={structure:'#78c8ce',inference:'#b5a0d9',generation:'#edbd95'};
    const defs=[
      {key:'structure',start:-88,end:28,label:'STRUCTURE & GEOMETRY'},
      {key:'inference',start:32,end:148,label:'INFERENCE & DETECTION'},
      {key:'generation',start:152,end:268,label:'GENERATION & DYNAMICS'}
    ];
    const polar=(r,deg)=>{const a=deg*Math.PI/180;return [CX+r*Math.cos(a),CY+r*Math.sin(a)];};
    const xy=pt=>pt.map(v=>v.toFixed(2)).join(' ');
    function wedge(start,end,outer=205,inner=111){
      return `M ${xy(polar(outer,start))} A ${outer} ${outer} 0 0 1 ${xy(polar(outer,end))} L ${xy(polar(inner,end))} A ${inner} ${inner} 0 0 0 ${xy(polar(inner,start))} Z`;
    }
    function textArc(s){
      const r=164;
      // The lower arc must run left-to-right; use the reversed path there.
      if(s.key==='inference')return `M ${xy(polar(r,s.end-12))} A ${r} ${r} 0 0 0 ${xy(polar(r,s.start+12))}`;
      if(s.key==='generation')return `M ${xy(polar(r,s.start+12))} A ${r} ${r} 0 0 1 ${xy(polar(r,s.end-12))}`;
      return `M ${xy(polar(r,s.start+12))} A ${r} ${r} 0 0 1 ${xy(polar(r,s.end-12))}`;
    }
    function main(){
      const parts=defs.map(s=>`<g class="rw-sector rw-${s.key}"><path class="rw-surface" d="${wedge(s.start,s.end)}" fill="${palette[s.key]}"/><path class="rw-label-arc" id="rw-path-${s.key}" d="${textArc(s)}"/><text class="rw-sector-label"><textPath href="#rw-path-${s.key}" startOffset="50%" text-anchor="middle">${s.label}</textPath></text></g>`).join('');
      return `<svg class="research-wheel rw-main" viewBox="0 0 480 480" role="img" aria-label="Three research directions: Structure and Geometry, Inference and Detection, Generation and Dynamics">${parts}<circle cx="240" cy="240" r="99" class="rw-center-disc"/><circle cx="240" cy="240" r="87" class="rw-center-guide"/><g class="rw-center-motif" aria-hidden="true"><path d="M213 237 236 212 263 241 237 266 213 237M236 212 271 217 263 241M237 266 209 270"/>${[[213,237],[236,212],[263,241],[237,266],[271,217],[209,270]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g></svg>`;
    }
    function mini(key){
      const selected=defs.find(item=>item.key===key);if(!selected)return '';
      // An always-complete, fixed wheel; just the selected direction has color.
      // Miniature labels are intentionally omitted because they would be illegible
      // from the back of a lecture theatre.
      const parts=defs.map(s=>`<path class="rw-mini-surface ${s.key===key?'is-selected':'is-muted'}" d="${wedge(s.start,s.end)}" fill="${s.key===key?palette[s.key]:'#dce6eb'}"/>`).join('');
      return `<svg class="rw-mini" viewBox="0 0 480 480" role="img" aria-label="Research directions; ${selected.label.toLowerCase()} highlighted">${parts}<circle cx="240" cy="240" r="99" fill="#f4f8fa" stroke="#c6dce2" stroke-width="3"/><circle cx="240" cy="240" r="9" fill="${palette[selected.key]}"/></svg>`;
    }
    function mount(){
      const wheel=document.querySelector('#research-wheel-slot');if(wheel)wheel.innerHTML=main();
      for(const marker of document.querySelectorAll('.sector-marker[data-sector]'))marker.innerHTML=mini(marker.dataset.sector);
    }
    return {mount};
  })();
