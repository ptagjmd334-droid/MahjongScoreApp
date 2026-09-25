// M7 v33: lightweight on-device recognition helpers (pure/testable).
(function(root){
  'use strict';
  function rmsDistance(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return Infinity;
    let s=0;
    for(let i=0;i<a.length;i++){const d=Number(a[i])-Number(b[i]);if(!Number.isFinite(d))return Infinity;s+=d*d;}
    return Math.sqrt(s/a.length);
  }

  function shiftedRmsDistance(a,b,width=8,height=12,maxShift=1){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length!==width*height)return rmsDistance(a,b);
    let best=Infinity;
    for(let dy=-maxShift;dy<=maxShift;dy++)for(let dx=-maxShift;dx<=maxShift;dx++){
      let s=0,n=0;
      const y0=Math.max(0,-dy),y1=Math.min(height,height-dy);
      const x0=Math.max(0,-dx),x1=Math.min(width,width-dx);
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const av=Number(a[y*width+x]),bv=Number(b[(y+dy)*width+(x+dx)]);
        if(!Number.isFinite(av)||!Number.isFinite(bv))return Infinity;
        const d=av-bv;s+=d*d;n++;
      }
      if(!n)continue;
      const penalty=(Math.abs(dx)+Math.abs(dy))*.012;
      best=Math.min(best,Math.sqrt(s/n)+penalty);
    }
    return best;
  }
  function rankLabels(feature,library){
    const out=[];
    if(!feature||!library||typeof library!=='object')return out;
    for(const [label,templates] of Object.entries(library)){
      if(!Array.isArray(templates)||!templates.length)continue;
      let best=Infinity;
      for(const template of templates){
        let distance;
        if(feature.length===96&&template.length===96)distance=shiftedRmsDistance(feature,template,8,12,1);
        else if(feature.length===216&&template.length===216)distance=shiftedRmsDistance(feature,template,12,18,1);
        else distance=rmsDistance(feature,template);
        best=Math.min(best,distance);
      }
      if(Number.isFinite(best))out.push({label,distance:best});
    }
    return out.sort((a,b)=>a.distance-b.distance);
  }
  function classify(feature,library,options={}){
    const threshold=Number.isFinite(options.threshold)?options.threshold:.24;
    const margin=Number.isFinite(options.margin)?options.margin:.035;
    const ranked=rankLabels(feature,library);
    if(!ranked.length||ranked[0].distance>threshold)return null;
    if(ranked[1]&&ranked[1].distance-ranked[0].distance<margin)return null;
    return {...ranked[0],runnerUp:ranked[1]?.distance??Infinity};
  }
  function stableEnough(previous,current,maxShift=.035){
    if(!previous||!current||previous.length!==current.length||![13,14].includes(current.length))return false;
    let shift=0;
    for(let i=0;i<current.length;i++){
      const a=previous[i],b=current[i];
      if(!Number.isFinite(a)||!Number.isFinite(b))return false;
      shift+=Math.abs(a-b);
    }
    return shift/current.length<=maxShift;
  }
  const api=Object.freeze({rmsDistance,shiftedRmsDistance,rankLabels,classify,stableEnough});
  root.M7RecognitionCoreV33=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
