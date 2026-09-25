// M7 v36: fixed-frame shutter capture + post-capture row analysis.
// The live camera no longer requires 13/14 individual candidates before capture.
// Low-resolution analysis locates the row; high-resolution source pixels are used for tile crops.
(()=>{
  'use strict';
  window.M7V36CameraOwner=true;
  // Legacy M7 hooks and ui-fixes already yield to this flag name.
  window.M7V33CameraOwner=true;
  const core=window.M7RecognitionCoreV33;
  if(!core)return;

  const LIB_KEY='MahjongScoreApp_tile_templates_m7v45oriented1';
  const TRAINING_DB='MahjongScoreAppM7Training';
  const TRAINING_STORE='samples';
  const FEATURE_KIND='oriented-direct-v1';
  const MAX_TEMPLATES=5;
  const MAX_IMAGES_PER_LABEL=10;
  const state={overlay:null,captured:false,pendingFeatures:[],pendingCrops:[],pendingTrainingImages:[],diagnostics:null,predictionDebug:[],learnedLabelCount:0};

  const style=document.createElement('style');
  style.textContent=`
    #realtime-hand-camera-m7v3 .realtime-hand-guide-m7v3{
      padding:0!important;align-items:center!important;justify-content:center!important
    }
    #realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{
      position:relative;width:min(86vw,1180px)!important;height:min(31vh,146px)!important;
      border:4px solid rgba(255,255,255,.97)!important;border-radius:18px!important;
      box-shadow:0 0 0 9999px rgba(0,0,0,.28)!important
    }
    #realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3::before{
      content:'14枚を横一列に入れる';position:absolute;left:14px;top:10px;
      padding:4px 9px;border-radius:999px;background:rgba(0,0,0,.66);color:#fff;
      font:800 12px/1.2 -apple-system,BlinkMacSystemFont,sans-serif
    }
    #realtime-hand-camera-m7v3 .realtime-hand-status-m7v3{
      min-width:min(560px,76vw)!important
    }
    #realtime-hand-camera-m7v3 #realtime-hand-count-m7v3{display:none!important}
    #realtime-hand-camera-m7v3 .realtime-hand-status-m7v3 small{
      grid-column:1/-1!important;font-size:11px!important
    }
    #realtime-hand-camera-m7v3 .m7v36-shutter{
      position:absolute;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);
      z-index:10;min-width:118px;min-height:46px;padding:8px 20px;border:0;border-radius:999px;
      background:#17a765;color:white;font-size:15px;font-weight:900;
      box-shadow:0 5px 18px rgba(0,0,0,.28)
    }
    #realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3{
      right:max(16px,env(safe-area-inset-right))!important;left:auto!important;
      bottom:max(12px,env(safe-area-inset-bottom))!important;z-index:10
    }
    #hand-result-overlay-m7v5 .hand-result-tiles-m7v5{
      align-items:center!important
    }
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v36-crop{
      position:relative!important;height:min(36vh,170px)!important;min-height:112px!important;
      background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;
      background-color:#e7dfd0!important;color:#111
    }
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v36-crop:not([data-tile])::after{
      content:'?';position:absolute;right:3px;top:3px;z-index:3;
      font-size:12px;font-weight:900;line-height:1;color:#b43;background:rgba(255,255,255,.86);
      border-radius:999px;padding:3px 5px
    }
    #hand-result-overlay-m7v5 .m7v45-top1{
      position:absolute;left:2px;right:2px;bottom:2px;z-index:2;
      padding:2px 1px;border-radius:4px;background:rgba(0,0,0,.68);color:#fff;
      font-size:9px;line-height:1.15;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      pointer-events:none
    }
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile] .m7v45-top1{display:none!important}
    #hand-result-overlay-m7v5 .m7v36-photo{
      width:100%;height:70px;max-height:23%;object-fit:contain;background:#272727;border-radius:8px;flex:none
    }
    #tile-picker-m7v5 .m7v39-suggestions{
      margin:6px 0 8px;padding:7px;border-radius:9px;background:#eef7ff
    }
    #tile-picker-m7v5 .m7v39-suggestions b{
      display:block;margin-bottom:5px;font-size:12px;color:#245
    }
    #tile-picker-m7v5 .m7v39-suggestions button{
      margin-right:6px;min-height:34px;padding:5px 10px;border:1px solid #9cc7eb;border-radius:8px;background:white;font-weight:800
    }
    @media (orientation:landscape) and (max-height:500px){
      #realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{height:min(29vh,124px)!important}
      #realtime-hand-camera-m7v3 .m7v36-shutter{min-height:40px}
    }
  `;
  document.head.appendChild(style);

  function loadLibrary(){
    try{
      const x=JSON.parse(localStorage.getItem(LIB_KEY)||'{}');
      return x&&typeof x==='object'?x:{};
    }catch(_){return {};}
  }
  function saveLibrary(lib){
    try{localStorage.setItem(LIB_KEY,JSON.stringify(lib));}catch(_){}
  }


  function openTrainingDb(){
    return new Promise(resolve=>{
      if(!('indexedDB' in window)){resolve(null);return;}
      let req;
      try{req=indexedDB.open(TRAINING_DB,1);}catch(_){resolve(null);return;}
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(TRAINING_STORE)){
          const store=db.createObjectStore(TRAINING_STORE,{keyPath:'id',autoIncrement:true});
          store.createIndex('label','label',{unique:false});
          store.createIndex('createdAt','createdAt',{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>resolve(null);
      req.onblocked=()=>resolve(null);
    });
  }

  async function loadTrainingSamples(){
    const db=await openTrainingDb();if(!db)return [];
    return new Promise(resolve=>{
      let tx;
      try{tx=db.transaction(TRAINING_STORE,'readonly');}catch(_){db.close();resolve([]);return;}
      const req=tx.objectStore(TRAINING_STORE).getAll();
      req.onsuccess=()=>resolve(Array.isArray(req.result)?req.result:[]);
      req.onerror=()=>resolve([]);
      tx.oncomplete=()=>db.close();
      tx.onabort=()=>db.close();
    });
  }

  async function saveTrainingBatch(records){
    const valid=(Array.isArray(records)?records:[]).filter(x=>x&&x.label&&x.imageDataUrl);
    if(!valid.length)return false;
    const db=await openTrainingDb();if(!db)return false;
    const written=await new Promise(resolve=>{
      let tx;
      try{tx=db.transaction(TRAINING_STORE,'readwrite');}catch(_){db.close();resolve(false);return;}
      const store=tx.objectStore(TRAINING_STORE);
      const now=Date.now();
      valid.forEach((r,i)=>store.add({
        label:r.label,
        imageDataUrl:r.imageDataUrl,
        createdAt:now+i,
        featureKind:FEATURE_KIND
      }));
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    });
    if(!written){db.close();return false;}
    const labels=[...new Set(valid.map(x=>x.label))];
    await new Promise(resolve=>{
      let tx;
      try{tx=db.transaction(TRAINING_STORE,'readwrite');}catch(_){db.close();resolve();return;}
      const store=tx.objectStore(TRAINING_STORE),index=store.index('label');
      let pending=labels.length;
      if(!pending){resolve();return;}
      labels.forEach(label=>{
        const req=index.getAll(IDBKeyRange.only(label));
        req.onsuccess=()=>{
          const rows=(req.result||[]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
          rows.slice(MAX_IMAGES_PER_LABEL).forEach(row=>store.delete(row.id));
          if(--pending===0)resolve();
        };
        req.onerror=()=>{if(--pending===0)resolve();};
      });
      tx.oncomplete=()=>resolve();
      tx.onabort=()=>resolve();
    });
    db.close();
    return true;
  }

  function tileFaceRect(ctx,b){
    const x0=Math.max(0,Math.round(b.x)),y0=Math.max(0,Math.round(b.y));
    const x1=Math.min(ctx.canvas.width,Math.round(b.x+b.w));
    const y1=Math.min(ctx.canvas.height,Math.round(b.y+b.h));
    const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);
    const data=ctx.getImageData(x0,y0,w,h).data;
    const cols=new Float64Array(w),rows=new Float64Array(h);
    for(let y=0,p=0;y<h;y++){
      for(let x=0;x<w;x++,p++){
        const i=p*4,r=data[i],g=data[i+1],bl=data[i+2];
        const max=Math.max(r,g,bl),min=Math.min(r,g,bl),lum=(r*3+g*6+bl)/10;
        const neutral=(max-min)/(lum+1);
        if(lum>=82&&neutral<=.58){cols[x]++;rows[y]++;}
      }
    }
    const colCut=Math.max(2,h*.24),rowCut=Math.max(2,w*.26);
    let lx=-1,rx=-1,ty=-1,by=-1;
    for(let x=0;x<w;x++)if(cols[x]>=colCut){if(lx<0)lx=x;rx=x;}
    for(let y=0;y<h;y++)if(rows[y]>=rowCut){if(ty<0)ty=y;by=y;}
    if(lx<0||ty<0||rx-lx<w*.45||by-ty<h*.32)return {x:x0,y:y0,w,h};
    const padX=Math.max(1,(rx-lx+1)*.04),padY=Math.max(1,(by-ty+1)*.04);
    const sx=Math.max(x0,x0+lx-padX),sy=Math.max(y0,y0+ty-padY);
    const ex=Math.min(x1,x0+rx+1+padX),ey=Math.min(y1,y0+by+1+padY);
    return {x:sx,y:sy,w:Math.max(1,ex-sx),h:Math.max(1,ey-sy)};
  }

  function normalizedFaceCanvas(ctx,b,width=48,height=72){
    const face=tileFaceRect(ctx,b);
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    const padX=Math.max(1,face.w*.035),padY=Math.max(1,face.h*.035);
    const srcW=Math.max(1,face.w-padX*2),srcH=Math.max(1,face.h-padY*2);
    const scale=Math.min(width/srcW,height/srcH);
    const dw=srcW*scale,dh=srcH*scale,dx=(width-dw)/2,dy=(height-dh)/2;
    o.drawImage(ctx.canvas,face.x+padX,face.y+padY,srcW,srcH,dx,dy,dw,dh);
    return out;
  }

  function detectFaceGeometry(source){
    const w=source.width|0,h=source.height|0;
    if(w<8||h<8)return null;
    const ctx=source.getContext('2d',{willReadFrequently:true});
    const data=ctx.getImageData(0,0,w,h).data;

    function geometryFromMask(mask){
      const visited=new Uint8Array(w*h),stack=[];
      let bestPixels=null,bestScore=0;
      const minArea=Math.max(24,Math.round(w*h*.07));
      for(let p=0;p<w*h;p++){
        if(!mask[p]||visited[p])continue;
        stack.length=0;stack.push(p);visited[p]=1;
        const pixels=[];let sx=0,sy=0;
        while(stack.length){
          const q=stack.pop(),x=q%w,y=(q/w)|0;
          pixels.push(q);sx+=x;sy+=y;
          if(x>0){const n=q-1;if(mask[n]&&!visited[n]){visited[n]=1;stack.push(n);}}
          if(x<w-1){const n=q+1;if(mask[n]&&!visited[n]){visited[n]=1;stack.push(n);}}
          if(y>0){const n=q-w;if(mask[n]&&!visited[n]){visited[n]=1;stack.push(n);}}
          if(y<h-1){const n=q+w;if(mask[n]&&!visited[n]){visited[n]=1;stack.push(n);}}
        }
        if(pixels.length<minArea)continue;
        const cx=sx/pixels.length,cy=sy/pixels.length;
        const dx=(cx-(w-1)/2)/(w*.5),dy=(cy-(h-1)/2)/(h*.5);
        const centerPenalty=Math.min(.75,Math.hypot(dx,dy)*.58);
        const score=pixels.length*(1-centerPenalty);
        if(score>bestScore){bestScore=score;bestPixels=pixels;}
      }
      if(!bestPixels?.length)return null;
      let sx=0,sy=0;
      for(const p of bestPixels){sx+=p%w;sy+=(p/w)|0;}
      const cx=sx/bestPixels.length,cy=sy/bestPixels.length;
      let cxx=0,cyy=0,cxy=0;
      for(const p of bestPixels){
        const dx=(p%w)-cx,dy=((p/w)|0)-cy;
        cxx+=dx*dx;cyy+=dy*dy;cxy+=dx*dy;
      }
      cxx/=bestPixels.length;cyy/=bestPixels.length;cxy/=bestPixels.length;
      let theta=.5*Math.atan2(2*cxy,cxx-cyy);
      if(Math.sin(theta)<0)theta+=Math.PI;
      const sin=Math.sin(theta),cos=Math.cos(theta),us=[],vs=[];
      for(const p of bestPixels){
        const dx=(p%w)-cx,dy=((p/w)|0)-cy;
        us.push(sin*dx-cos*dy);
        vs.push(cos*dx+sin*dy);
      }
      us.sort((a,b)=>a-b);vs.sort((a,b)=>a-b);
      const lo=Math.floor(bestPixels.length*.006),hi=Math.max(lo+1,Math.ceil(bestPixels.length*.994)-1);
      const minU=us[lo],maxU=us[Math.min(us.length-1,hi)],minV=vs[lo],maxV=vs[Math.min(vs.length-1,hi)];
      const faceW=maxU-minU,faceH=maxV-minV;
      if(!(faceW>w*.25&&faceH>h*.25))return null;
      const aspect=faceH/faceW,fill=bestPixels.length/Math.max(1,faceW*faceH);
      if(!(aspect>.82&&aspect<2.7&&fill>.18))return null;
      return {cx,cy,theta,faceW,faceH,fill,area:bestPixels.length};
    }

    // First try foreground-vs-border contrast. This also works on v43/v44 images,
    // whose corners are the synthetic beige normalization background.
    const corner=Math.max(2,Math.round(Math.min(w,h)*.09));
    let br=0,bg=0,bb=0,bn=0;
    const addCorner=(x0,y0)=>{
      for(let y=y0;y<Math.min(h,y0+corner);y++)for(let x=x0;x<Math.min(w,x0+corner);x++){
        const i=(y*w+x)*4;br+=data[i];bg+=data[i+1];bb+=data[i+2];bn++;
      }
    };
    addCorner(0,0);addCorner(Math.max(0,w-corner),0);addCorner(0,Math.max(0,h-corner));addCorner(Math.max(0,w-corner),Math.max(0,h-corner));
    br/=Math.max(1,bn);bg/=Math.max(1,bn);bb/=Math.max(1,bn);
    const contrastMask=new Uint8Array(w*h);
    for(let p=0;p<w*h;p++){
      const i=p*4,dr=data[i]-br,dg=data[i+1]-bg,db=data[i+2]-bb;
      const diff=Math.sqrt(dr*dr+dg*dg+db*db);
      if(diff>=24)contrastMask[p]=1;
    }
    const contrastGeom=geometryFromMask(contrastMask);
    if(contrastGeom&&contrastGeom.area<w*h*.93)return contrastGeom;

    // Fallback for scenes where border color is not stable: bright, low-chroma tile face.
    const neutralMask=new Uint8Array(w*h);
    for(let p=0;p<w*h;p++){
      const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
      const max=Math.max(r,g,b),min=Math.min(r,g,b),lum=(r*3+g*6+b)/10;
      const neutral=(max-min)/(lum+1);
      if(lum>=72&&neutral<=.48)neutralMask[p]=1;
    }
    return geometryFromMask(neutralMask);
  }

  function canonicalizeCanvas(source,width=64,height=96){
    const geom=detectFaceGeometry(source);
    if(!geom)return null;
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    const sin=Math.sin(geom.theta),cos=Math.cos(geom.theta);
    const sx=width/(geom.faceW*1.08),sy=height/(geom.faceH*1.08);
    const a=sx*sin,c=-sx*cos,b=sy*cos,d=sy*sin;
    const e=width/2-a*geom.cx-c*geom.cy,f=height/2-b*geom.cx-d*geom.cy;
    o.setTransform(a,b,c,d,e,f);
    o.imageSmoothingEnabled=true;o.imageSmoothingQuality='high';
    o.drawImage(source,0,0);
    o.setTransform(1,0,0,1,0,0);
    return out;
  }

  function orientedFaceCanvas(ctx,b,width=64,height=96){
    const x0=Math.max(0,Math.floor(b.x)),y0=Math.max(0,Math.floor(b.y));
    const x1=Math.min(ctx.canvas.width,Math.ceil(b.x+b.w)),y1=Math.min(ctx.canvas.height,Math.ceil(b.y+b.h));
    const sw=Math.max(1,x1-x0),sh=Math.max(1,y1-y0);
    const src=document.createElement('canvas');src.width=sw;src.height=sh;
    src.getContext('2d',{willReadFrequently:true}).drawImage(ctx.canvas,x0,y0,sw,sh,0,0,sw,sh);
    const oriented=canonicalizeCanvas(src,width,height);
    if(oriented)return oriented;
    return normalizedFaceCanvas(ctx,b,width,height);
  }

  function descriptorFromCanvas(source){
    const width=16,height=24;
    const c=document.createElement('canvas');c.width=width;c.height=height;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#f4f1e8';ctx.fillRect(0,0,width,height);
    ctx.drawImage(source,0,0,width,height);
    const data=ctx.getImageData(0,0,width,height).data;
    const lums=[],gray=Array(width*height).fill(0),red=Array(width*height).fill(0),green=Array(width*height).fill(0);
    for(let p=0;p<width*height;p++){
      const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
      const lum=(r*3+g*6+b)/10;
      const max=Math.max(r,g,b),min=Math.min(r,g,b);
      if(max-min<46)lums.push(lum);
    }
    lums.sort((a,b)=>a-b);
    const bg=lums.length?lums[Math.min(lums.length-1,Math.floor(lums.length*.88))]:235;
    const denom=Math.max(75,bg*.74);
    for(let p=0;p<width*height;p++){
      const i=p*4,r=data[i],g=data[i+1],b=data[i+2],lum=(r*3+g*6+b)/10;
      gray[p]=Math.round(Math.min(1,Math.max(0,(bg-lum)/denom))*10000)/10000;
      red[p]=Math.round(Math.min(1,Math.max(0,(r-Math.max(g,b))/150))*10000)/10000;
      green[p]=Math.round(Math.min(1,Math.max(0,(g-Math.max(r,b))/150))*10000)/10000;
    }
    const edge=Array(width*height).fill(0);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const gx=gray[y*width+x+1]-gray[y*width+x-1];
      const gy=gray[(y+1)*width+x]-gray[(y-1)*width+x];
      edge[y*width+x]=Math.round(Math.min(1,Math.hypot(gx,gy)/1.35)*10000)/10000;
    }
    return {kind:FEATURE_KIND,width,height,gray,edge,red,green};
  }

  function featureFromBox(ctx,b){
    return descriptorFromCanvas(orientedFaceCanvas(ctx,b,64,96));
  }

  function trainingImageDataUrl(ctx,b){
    return orientedFaceCanvas(ctx,b,96,144).toDataURL('image/jpeg',.90);
  }


  function analyzeTileBox(ctx,b){
    const canonical=orientedFaceCanvas(ctx,b,96,144);
    const imageDataUrl=canonical.toDataURL('image/jpeg',.90);
    return {
      feature:descriptorFromCanvas(canonical),
      crop:imageDataUrl,
      trainingImage:imageDataUrl
    };
  }

  function featureFromDataUrl(url){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas');c.width=96;c.height=144;
        const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#f4f1e8';x.fillRect(0,0,c.width,c.height);
        x.drawImage(img,0,0,c.width,c.height);
        const canonical=canonicalizeCanvas(c,64,96)||c;
        resolve(descriptorFromCanvas(canonical));
      };
      img.onerror=()=>resolve(null);
      img.src=url;
    });
  }

  async function rebuildLibraryFromTrainingImages(){
    const existing=loadLibrary();
    if(Object.values(existing).some(list=>Array.isArray(list)&&list.length))return existing;
    const rows=(await loadTrainingSamples()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(!rows.length)return existing;
    const lib={};
    for(const row of rows){
      if(!row?.label||!row?.imageDataUrl)continue;
      const feature=await featureFromDataUrl(row.imageDataUrl);
      if(!feature)continue;
      const list=Array.isArray(lib[row.label])?lib[row.label]:[];
      if(!list.some(t=>core.featureDistance(feature,t)<.012)){
        list.push(feature);lib[row.label]=list.slice(0,MAX_TEMPLATES);
      }
    }
    saveLibrary(lib);
    return lib;
  }

  const trainingReadyPromise=rebuildLibraryFromTrainingImages().catch(()=>loadLibrary());

  function cropDataUrl(ctx,b){
    return orientedFaceCanvas(ctx,b,96,144).toDataURL('image/jpeg',.90);
  }

  function confidentCandidate(ranked){
    if(!Array.isArray(ranked)||!ranked.length)return null;
    const best=ranked[0],second=ranked.find(x=>x.label!==best.label);
    if(!best||!Number.isFinite(best.distance))return null;
    // False positives are worse than leaving a tile as "?". v38 real-shuffle test
    // produced 8 auto candidates but only 4 were correct, so v39 is precision-first.
    const bestRaw=Number.isFinite(best.bestDistance)?best.bestDistance:best.distance;
    if(best.distance>.145||bestRaw>.12)return null;
    if(!second||!Number.isFinite(second.distance)){
      return best.distance<=.105&&bestRaw<=.09?best:null;
    }
    const gap=second.distance-best.distance;
    const ratio=second.distance>0?best.distance/second.distance:1;
    if(gap<.018||ratio>.74)return null;
    return best;
  }

  function predict(features){
    const lib=loadLibrary(),used={},debug=[];
    state.learnedLabelCount=Object.keys(lib).filter(label=>Array.isArray(lib[label])&&lib[label].length).length;
    const labels=features.map((feature,index)=>{
      const ranked=core.rankLabelsRobust(feature,lib,{singlePenalty:.018,maxTemplates:3});
      debug[index]=ranked.slice(0,3).map(x=>({label:x.label,distance:Number(x.distance.toFixed(4))}));
      const available=ranked.filter(x=>(used[x.label]||0)<4);
      const accepted=confidentCandidate(available);
      if(!accepted)return '';
      used[accepted.label]=(used[accepted.label]||0)+1;
      return accepted.label;
    });
    state.predictionDebug=debug;
    return labels;
  }

  function resultButtons(){
    return [...document.querySelectorAll('#hand-result-overlay-m7v5 .hand-result-tile-m7v5')];
  }

  function suggestionsForResultIndex(index){
    const b=resultButtons()[index];
    if(!b)return [];
    const raw=b.dataset?.m7v39Suggestions;
    if(!raw)return [];
    try{
      const x=JSON.parse(raw);
      return Array.isArray(x)?x.filter(Boolean).slice(0,3):[];
    }catch(_){return [];}
  }

  function pickerCurrentIndex(picker,fallback=0){
    if(!picker)return fallback;
    const owner=Number(picker.dataset.m8v31Current);
    if(Number.isInteger(owner)&&owner>=0&&owner<14)return owner;
    const help=picker.querySelector('.m8v31-help')?.textContent||'';
    const hm=help.match(/(\d+)\s*枚目を選択中/);
    if(hm){
      const n=Number(hm[1])-1;
      if(Number.isInteger(n)&&n>=0&&n<14)return n;
    }
    const text=picker.textContent||'';
    const m=text.match(/(\d+)\s*枚目を(?:選択中|修正)/);
    if(m){
      const n=Number(m[1])-1;
      if(Number.isInteger(n)&&n>=0&&n<14)return n;
    }
    const stored=Number(picker.dataset.m7v40Index);
    return Number.isInteger(stored)&&stored>=0&&stored<14?stored:fallback;
  }

  function renderPickerSuggestions(index){
    const picker=document.getElementById('tile-picker-m7v5');
    const grid=picker?.querySelector('.tile-picker-grid-m7v5');
    if(!picker||!grid||!Number.isInteger(index)||index<0||index>=14)return;
    picker.dataset.m7v40Index=String(index);
    picker.dataset.m7v41RenderedIndex=String(index);
    picker.querySelector('.m7v39-suggestions')?.remove();
    const suggestions=suggestionsForResultIndex(index);
    if(!suggestions.length)return;
    const box=document.createElement('div');box.className='m7v39-suggestions';box.dataset.m7v41Index=String(index);
    const title=document.createElement('b');title.textContent='候補（参考・左から1位→3位）';box.appendChild(title);
    suggestions.forEach(name=>{
      const b=document.createElement('button');b.type='button';b.textContent=name;
      b.onclick=()=>{
        const target=[...grid.querySelectorAll('button')].find(x=>(x.dataset.tileName||x.textContent.trim())===name);
        target?.click();
        schedulePickerSuggestionSync(Math.min(13,index+1));
      };
      box.appendChild(b);
    });
    grid.insertAdjacentElement('beforebegin',box);
  }

  function syncPickerSuggestions(fallbackIndex=0){
    const picker=document.getElementById('tile-picker-m7v5');if(!picker)return;
    const current=pickerCurrentIndex(picker,fallbackIndex);
    const rendered=Number(picker.dataset.m7v41RenderedIndex);
    const box=picker.querySelector('.m7v39-suggestions');
    if(current!==rendered||!box||Number(box.dataset.m7v41Index)!==current){
      renderPickerSuggestions(current);
    }
  }

  function schedulePickerSuggestionSync(fallbackIndex=0){
    [0,35,90,170,300].forEach(delay=>setTimeout(()=>syncPickerSuggestions(fallbackIndex),delay));
  }

  function attachPickerSuggestionObserver(picker){
    if(!picker||picker.dataset.m7v41Observer==='1')return;
    picker.dataset.m7v41Observer='1';
    const help=picker.querySelector('.m8v31-help');
    if(help&&typeof MutationObserver!=='undefined'){
      const observer=new MutationObserver(()=>schedulePickerSuggestionSync(pickerCurrentIndex(picker,0)));
      observer.observe(help,{childList:true,characterData:true,subtree:true});
      picker.__m7v41Observer=observer;
    }
  }

  function decorateTilePicker(tileButton){
    const buttons=resultButtons(),index=buttons.indexOf(tileButton);
    if(index<0)return;
    const picker=document.getElementById('tile-picker-m7v5');
    if(picker){
      picker.dataset.m7v40Index=String(index);
      attachPickerSuggestionObserver(picker);
    }
    renderPickerSuggestions(index);
  }

  function sourceRectForCover(videoW,videoH,viewW,viewH,guide){
    if(!(videoW>0&&videoH>0&&viewW>0&&viewH>0&&guide))return null;
    const scale=Math.max(viewW/videoW,viewH/videoH);
    const renderedW=videoW*scale,renderedH=videoH*scale;
    const offsetX=(viewW-renderedW)/2,offsetY=(viewH-renderedH)/2;
    let x=(guide.x-offsetX)/scale,y=(guide.y-offsetY)/scale;
    let w=guide.w/scale,h=guide.h/scale;
    const x2=Math.min(videoW,x+w),y2=Math.min(videoH,y+h);
    x=Math.max(0,x);y=Math.max(0,y);
    w=Math.max(1,x2-x);h=Math.max(1,y2-y);
    return {x,y,w,h};
  }

  // Locate one long, bright, low-chroma horizontal tile row.
  // This deliberately treats touching tiles as one row instead of requiring 14 connected components.
  function smooth(values,radius){
    const out=new Float64Array(values.length),r=Math.max(0,radius|0);
    let sum=0,left=0,right=-1;
    for(let i=0;i<values.length;i++){
      const wantRight=Math.min(values.length-1,i+r);
      while(right<wantRight)sum+=values[++right];
      const wantLeft=Math.max(0,i-r);
      while(left<wantLeft)sum-=values[left++];
      out[i]=sum/Math.max(1,right-left+1);
    }
    return out;
  }

  function locateTileRow(ctx){
    const w=ctx.canvas.width,h=ctx.canvas.height;
    if(!(w>20&&h>20))return null;
    const data=ctx.getImageData(0,0,w,h).data;
    const mask=new Uint8Array(w*h),rows=new Float64Array(h);
    for(let y=0,p=0;y<h;y++){
      for(let x=0;x<w;x++,p++){
        const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b),lum=(r*3+g*6+b)/10;
        const neutral=(max-min)/(lum+1);
        if(lum>=68&&neutral<=.48){mask[p]=1;rows[y]++;}
      }
    }
    const rowSmooth=smooth(rows,Math.max(1,Math.round(h*.018)));
    let peakY=0,peak=0;
    for(let y=0;y<h;y++)if(rowSmooth[y]>peak){peak=rowSmooth[y];peakY=y;}
    if(peak<w*.18)return null;
    const rowCut=Math.max(w*.095,peak*.42);
    let y1=peakY,y2=peakY;
    while(y1>0&&rowSmooth[y1-1]>=rowCut)y1--;
    while(y2<h-1&&rowSmooth[y2+1]>=rowCut)y2++;
    const padY=Math.max(2,Math.round(h*.075));
    y1=Math.max(0,y1-padY);y2=Math.min(h-1,y2+padY);
    const bandH=y2-y1+1;
    if(bandH<h*.18||bandH>h*.98)return null;
    const cols=new Float64Array(w);
    for(let x=0;x<w;x++){
      let n=0;
      for(let y=y1;y<=y2;y++)n+=mask[y*w+x];
      cols[x]=n;
    }
    const colSmooth=smooth(cols,Math.max(1,Math.round(w*.003)));
    const colCut=Math.max(2,bandH*.16);
    const gapLimit=Math.max(4,Math.round(w*.025));
    let best=null,start=-1,last=-1,gap=0;
    function finish(){
      if(start<0||last<start)return;
      const width=last-start+1;
      if(!best||width>best.w)best={x:start,w:width};
      start=-1;last=-1;gap=0;
    }
    for(let x=0;x<w;x++){
      if(colSmooth[x]>=colCut){
        if(start<0)start=x;
        last=x;gap=0;
      }else if(start>=0){
        gap++;
        if(gap>gapLimit)finish();
      }
    }
    finish();
    if(!best||best.w<w*.45)return null;
    const padX=Math.max(2,Math.round(w*.012));
    const x=Math.max(0,best.x-padX),x2=Math.min(w,best.x+best.w+padX);
    return {x,y:y1,w:x2-x,h:bandH,confidence:Math.min(1,peak/w)};
  }

  function splitRow(row,count=14){
    if(!row||!Number.isFinite(row.x)||!Number.isFinite(row.w)||row.w<=0)return [];
    return Array.from({length:count},(_,i)=>{
      const x1=Math.round(row.x+row.w*i/count),x2=Math.round(row.x+row.w*(i+1)/count);
      return {x:x1,y:Math.round(row.y),w:Math.max(1,x2-x1),h:Math.max(1,Math.round(row.h))};
    });
  }


  function splitRowBySeams(ctx,row,count=14){
    if(!ctx||!row||!Number.isFinite(row.x)||!Number.isFinite(row.w)||row.w<=0)return splitRow(row,count);
    const x0=Math.max(0,Math.round(row.x)),y0=Math.max(0,Math.round(row.y));
    const x1=Math.min(ctx.canvas.width,Math.round(row.x+row.w));
    const y1=Math.min(ctx.canvas.height,Math.round(row.y+row.h));
    const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);
    if(w<count*8||h<12)return splitRow(row,count);
    const data=ctx.getImageData(x0,y0,w,h).data;
    const score=new Float64Array(w);
    const ys=Math.max(1,Math.round(h*.08)),ye=Math.min(h-1,Math.round(h*.92));
    for(let x=1;x<w-1;x++){
      let edge=0,white=0,n=0;
      for(let y=ys;y<ye;y++){
        const i=(y*w+x)*4,il=(y*w+x-1)*4,ir=(y*w+x+1)*4;
        const lum=(data[i]*3+data[i+1]*6+data[i+2])/10;
        const lumL=(data[il]*3+data[il+1]*6+data[il+2])/10;
        const lumR=(data[ir]*3+data[ir+1]*6+data[ir+2])/10;
        const max=Math.max(data[i],data[i+1],data[i+2]),min=Math.min(data[i],data[i+1],data[i+2]);
        const neutral=(max-min)/(lum+1);
        if(lum>=76&&neutral<=.62)white++;
        edge+=Math.abs(lumR-lumL);n++;
      }
      const whiteRatio=n?white/n:0;
      score[x]=(n?edge/n:0)*.7+(1-whiteRatio)*22;
    }
    const smoothScore=smooth(score,Math.max(1,Math.round(w*.002)));
    const pitch=w/count;
    const boundaries=[0];
    let previous=0;
    for(let i=1;i<count;i++){
      const expected=pitch*i;
      const radius=Math.max(4,pitch*.28);
      let lo=Math.max(previous+pitch*.58,expected-radius);
      let hi=Math.min(w-(count-i)*pitch*.58,expected+radius);
      lo=Math.max(1,Math.floor(lo));hi=Math.min(w-2,Math.ceil(hi));
      let bestX=Math.round(expected),best=-Infinity;
      for(let x=lo;x<=hi;x++){
        const distancePenalty=Math.abs(x-expected)/pitch*4.5;
        const v=smoothScore[x]-distancePenalty;
        if(v>best){best=v;bestX=x;}
      }
      boundaries.push(bestX);previous=bestX;
    }
    boundaries.push(w);
    const boxes=[];
    for(let i=0;i<count;i++){
      const a=x0+boundaries[i],b=x0+boundaries[i+1];
      boxes.push({x:a,y:y0,w:Math.max(1,b-a),h});
    }
    return boxes;
  }

  function analyzeGuideCanvas(highCanvas){
    const highCtx=highCanvas.getContext('2d',{willReadFrequently:true});
    const low=document.createElement('canvas');
    low.width=Math.min(840,Math.max(420,highCanvas.width));
    low.height=Math.max(120,Math.round(highCanvas.height*(low.width/highCanvas.width)));
    const lowCtx=low.getContext('2d',{willReadFrequently:true});
    lowCtx.drawImage(highCanvas,0,0,low.width,low.height);
    const lowRow=locateTileRow(lowCtx);
    if(!lowRow)return {row:null,boxes:[],features:[],crops:[],trainingImages:[],photo:highCanvas.toDataURL('image/jpeg',.80)};
    const sx=highCanvas.width/low.width,sy=highCanvas.height/low.height;
    const row={x:lowRow.x*sx,y:lowRow.y*sy,w:lowRow.w*sx,h:lowRow.h*sy};
    const boxes=splitRow(row,14);
    const tileData=boxes.map(b=>analyzeTileBox(highCtx,b));
    return {
      row,boxes,
      features:tileData.map(x=>x.feature),
      crops:tileData.map(x=>x.crop),
      trainingImages:tileData.map(x=>x.trainingImage),
      photo:highCanvas.toDataURL('image/jpeg',.80)
    };
  }

  function captureGuideFrame(video,overlay){
    const guide=overlay.querySelector('.realtime-hand-guide-box-m7v3');
    if(!guide||!video||video.readyState<2||!video.videoWidth)return null;
    const vr=video.getBoundingClientRect(),gr=guide.getBoundingClientRect();
    const relative={x:gr.left-vr.left,y:gr.top-vr.top,w:gr.width,h:gr.height};
    const src=sourceRectForCover(video.videoWidth,video.videoHeight,vr.width,vr.height,relative);
    if(!src)return null;
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(src.w));c.height=Math.max(1,Math.round(src.h));
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,src.x,src.y,src.w,src.h,0,0,c.width,c.height);
    return {canvas:c,source:src};
  }

  function stopLocalState(){
    state.overlay=null;state.captured=false;
  }

  function showResult(analysis){
    const features=analysis.features||[],crops=analysis.crops||[],trainingImages=analysis.trainingImages||[];
    state.pendingFeatures=features.slice(0,14);
    state.pendingCrops=crops.slice(0,14);
    state.pendingTrainingImages=trainingImages.slice(0,14);
    window.M7V36PendingFeatures=state.pendingFeatures;
    const predicted=features.length===14?predict(features):[];
    while(predicted.length<14)predicted.push('');
    if(window.M7V36LastDiagnostics)window.M7V36LastDiagnostics.predictions=(state.predictionDebug||[]).map(x=>x.slice());
    setTimeout(()=>{
      window.showHandResultM7V5?.(predicted.slice(0,14));
      const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      buttons.forEach((b,i)=>{
        const url=state.pendingCrops[i];
        if(url){b.classList.add('m7v36-crop');b.style.backgroundImage=`url("${url}")`;b.dataset.m7v36Index=String(i);}
        const suggestions=(state.predictionDebug?.[i]||[]).map(x=>x.label).filter(Boolean);
        if(suggestions.length){
          b.dataset.m7v39Suggestions=JSON.stringify(suggestions.slice(0,3));
          const badge=document.createElement('span');badge.className='m7v45-top1';badge.textContent=`1位 ${suggestions[0]}`;b.appendChild(badge);
        }
      });
      const auto=predicted.filter(Boolean).length;
      const learnedLabels=Object.keys(loadLibrary()).filter(label=>Array.isArray(loadLibrary()[label])&&loadLibrary()[label].length).length;
      const firstCalibration=features.length===14&&learnedLabels===0;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=features.length===14
        ?(firstCalibration
          ?'保存済みの牌画像がないため、M7 v45の初回学習が必要です。14枚を正しく指定してください。確定後は牌画像も端末内に保存します。'
          :`白枠内の手牌列を14枚に分割しました。高信頼候補 ${auto}枚。各枠の下に1位候補を表示しています。精度評価はこの1位候補を基準にします。`)
        :'白枠内から牌列を特定できませんでした。撮影画像を確認し、14枠を手動入力するか「読み取り直す」で再撮影してください。';
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status&&auto<14)status.textContent=features.length===14
        ?(firstCalibration?'初回学習：14枚を指定してください':`学習済み ${learnedLabels}種類 / 高信頼 ${auto}枚`)
        :'手動入力：0 / 14枚';
      if(features.length!==14&&analysis.photo){
        const img=document.createElement('img');img.className='m7v36-photo';img.alt='白枠内を撮影した画像';img.src=analysis.photo;
        root.querySelector('.hand-result-head-m7v5')?.insertAdjacentElement('afterend',img);
      }
    },90);
  }

  function attach(overlay){
    if(!overlay||overlay.dataset.m7v36Attached==='1')return;
    overlay.dataset.m7v36Attached='1';state.overlay=overlay;state.captured=false;
    const status=overlay.querySelector('.realtime-hand-status-m7v3');
    if(status){
      const b=status.querySelector('b');if(b)b.textContent='14枚を白枠に入れて撮影してください';
      const small=status.querySelector('small');if(small)small.textContent='リアルタイム枚数判定は不要です。シャッター後に白枠内だけを解析します';
    }
    const shutter=document.createElement('button');shutter.type='button';shutter.className='m7v36-shutter';shutter.textContent='撮影して読み取る';
    overlay.appendChild(shutter);
    const video=overlay.querySelector('.realtime-hand-video-m7v3');
    shutter.addEventListener('click',async e=>{
      e.preventDefault();e.stopPropagation();
      if(state.captured)return;
      if(!video||video.readyState<2||!video.videoWidth){
        if(status?.querySelector('small'))status.querySelector('small').textContent='カメラ映像を準備中です。少し待ってからもう一度押してください';
        return;
      }
      const capture=captureGuideFrame(video,overlay);
      if(!capture){
        if(status?.querySelector('small'))status.querySelector('small').textContent='撮影範囲を取得できませんでした。もう一度お試しください';
        return;
      }
      state.captured=true;
      await trainingReadyPromise;
      const analysis=analyzeGuideCanvas(capture.canvas);
      state.diagnostics={
        sourceWidth:Math.round(capture.source.w),sourceHeight:Math.round(capture.source.h),
        rowFound:!!analysis.row,row:analysis.row?{...analysis.row}:null
      };
      window.M7V36LastDiagnostics=state.diagnostics;
      // Existing cancel owns the MediaStream and removes the camera overlay.
      overlay.querySelector('.realtime-hand-cancel-m7v3')?.click();
      showResult(analysis);
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#open-realtime-hand-camera-m7v3')){
      setTimeout(()=>attach(document.getElementById('realtime-hand-camera-m7v3')),650);
    }
    if(e.target.closest?.('.realtime-hand-cancel-m7v3'))stopLocalState();
  },true);
  window.addEventListener('pagehide',stopLocalState,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      document.querySelector('#realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3')?.click();
      stopLocalState();
    }
  });

  document.addEventListener('m8v31-current-change',e=>{
    const index=Number(e.detail?.index);
    if(Number.isInteger(index)&&index>=0&&index<14)renderPickerSuggestions(index);
  });

  document.addEventListener('click',e=>{
    const tile=e.target.closest?.('.hand-result-tile-m7v5');
    if(tile){
      setTimeout(()=>decorateTilePicker(tile),0);
      return;
    }
    const picker=e.target.closest?.('#tile-picker-m7v5');
    if(picker){
      attachPickerSuggestionObserver(picker);
      const before=pickerCurrentIndex(picker,0);
      schedulePickerSuggestionSync(Math.min(13,before+1));
    }
  });

  // Learn only after all 14 labels were explicitly verified.
  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
    if(state.pendingFeatures.length!==14)return;
    const lib=loadLibrary(),raw=[];
    buttons.forEach((b,i)=>{
      const label=b.dataset.tile,feature=state.pendingFeatures[i],imageDataUrl=state.pendingTrainingImages[i];
      if(!label||!feature||feature.kind!==FEATURE_KIND)return;
      const list=Array.isArray(lib[label])?lib[label]:[];
      if(!list.some(t=>core.featureDistance(feature,t)<.012)){
        list.unshift(feature);lib[label]=list.slice(0,MAX_TEMPLATES);
      }
      if(imageDataUrl)raw.push({label,imageDataUrl});
    });
    saveLibrary(lib);
    if(raw.length)saveTrainingBatch(raw).catch(()=>{});
  },true);

  window.M7CameraV36=Object.freeze({
    sourceRectForCover,locateTileRow,splitRow,splitRowBySeams,analyzeGuideCanvas,featureFromBox,tileFaceRect,descriptorFromCanvas,detectFaceGeometry,canonicalizeCanvas,orientedFaceCanvas,trainingImageDataUrl,analyzeTileBox,loadTrainingSamples,rebuildLibraryFromTrainingImages,loadLibrary,confidentCandidate,renderPickerSuggestions,pickerCurrentIndex,schedulePickerSuggestionSync,attachPickerSuggestionObserver
  });
})();
