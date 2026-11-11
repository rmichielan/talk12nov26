/* Fixed weight-to-colour scale. Never renormalise within a sample or a slide.
 * Base colours encode weights; event/selection highlights remain separate.
 * Values outside [1, 10] use the nearest endpoint of the visual scale only.
 */
(function(global){
  'use strict';
  const lo=[193,174,223], hi=[92,55,144];
  const rgb=w=>{const t=Math.max(0,Math.min(1,(Number(w)-1)/9));return lo.map((v,i)=>Math.round(v+(hi[i]-v)*t));};
  const color=w=>'#'+rgb(w).map(v=>v.toString(16).padStart(2,'0')).join('');
  const label=()=> '#241332';
  global.WeightPalette=Object.freeze({color,label,min:1,max:10});
})(typeof window!=='undefined'?window:globalThis);
