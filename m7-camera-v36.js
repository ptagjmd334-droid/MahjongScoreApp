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

  const LIB_KEY='MahjongScoreApp_tile_templates_stable1';
  const LIB_BACKUP_KEY='MahjongScoreApp_tile_templates_stable1_backup';
  const LEGACY_LIB_KEYS=[
    'MahjongScoreApp_tile_templates_m7v53innercrop1',
    'MahjongScoreApp_tile_templates_m7v48balanced24x36',
    'MahjongScoreApp_tile_templates_m7v47migration1',
    'MahjongScoreApp_tile_templates_m7v46perspective1',
    'MahjongScoreApp_tile_templates_m7v45oriented1',
    'MahjongScoreApp_tile_templates_m7v44direct1'
  ];
  const TRAINING_DB='MahjongScoreAppM7Training';
  const TRAINING_STORE='samples';
  const FEATURE_KIND='perspective-direct-v1';
  const MAX_TEMPLATES=5;
  const MAX_IMAGES_PER_LABEL=10;
  const state={overlay:null,captured:false,pendingFeatures:[],pendingCrops:[],pendingTrainingImages:[],diagnostics:null,predictionDebug:[],learnedLabelCount:0,librarySource:''};

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
    #hand-result-overlay-m7v5 .m7v53-top1{
      position:absolute;left:2px;right:2px;bottom:2px;z-index:2;
      padding:2px 1px;border-radius:4px;background:rgba(0,0,0,.72);color:#fff;
      font-size:9px;line-height:1.15;font-weight:800;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      pointer-events:none
    }
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile] .m7v53-top1{display:none!important}
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
    #tile-picker-m7v5 .m7v57-photo-preview{
      display:flex;align-items:center;justify-content:center;gap:10px;min-height:74px;
      margin:0;padding:6px 10px;border-radius:10px;background:#eee8db;border:1px solid #d8d1c3
    }
    #tile-picker-m7v5 .m7v57-photo-preview img{
      width:58px;height:72px;object-fit:contain;border-radius:7px;background:#d9d3c7;
      box-shadow:0 1px 4px rgba(0,0,0,.16)
    }
    #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy{
      font-size:13px;font-weight:800;line-height:1.35;color:#24352e;text-align:left
    }
    #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy small{
      display:block;margin-top:2px;font-size:11px;font-weight:700;color:#64706a
    }
    @media (orientation:landscape) and (max-height:500px){
      #tile-picker-m7v5 .m7v57-photo-preview{min-height:54px;padding:3px 8px}
      #tile-picker-m7v5 .m7v57-photo-preview img{width:42px;height:50px}
      #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy{font-size:11px}
      #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy small{font-size:9px}
    }
    @media (orientation:landscape) and (max-height:500px){
      #realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{height:min(29vh,124px)!important}
      #realtime-hand-camera-m7v3 .m7v36-shutter{min-height:40px}
    }
  `;
  document.head.appendChild(style);

  function nonEmptyLibrary(x){
    return !!(x&&typeof x==='object'&&Object.values(x).some(list=>Array.isArray(list)&&list.length));
  }

  function loadLibrary(){
    try{
      const primary=JSON.parse(localStorage.getItem(LIB_KEY)||'{}');
      if(primary&&typeof primary==='object'&&nonEmptyLibrary(primary))return primary;
      const backup=JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)||'{}');
      if(backup&&typeof backup==='object'&&nonEmptyLibrary(backup)){
        try{localStorage.setItem(LIB_KEY,JSON.stringify(backup));}catch(_){}
        return backup;
      }
      return primary&&typeof primary==='object'?primary:{};
    }catch(_){return {};}
  }
  function saveLibrary(lib){
    try{
      const json=JSON.stringify(lib||{});
      localStorage.setItem(LIB_KEY,json);
      localStorage.setItem(LIB_BACKUP_KEY,json);
      const labels=Object.keys(lib||{}).filter(label=>Array.isArray(lib[label])&&lib[label].length);
      localStorage.setItem('MahjongScoreApp_tile_learning_meta1',JSON.stringify({
        schema:'stable1',labels:labels.length,updatedAt:Date.now()
      }));
      return labels.length;
    }catch(_){return 0;}
  }


  function resampleFeatureMap(src,srcW,srcH,dstW,dstH){
    if(!Array.isArray(src)||src.length!==srcW*srcH)return null;
    const out=Array(dstW*dstH).fill(0);
    for(let y=0;y<dstH;y++)for(let x=0;x<dstW;x++){
      const sx=(x+.5)*srcW/dstW-.5,sy=(y+.5)*srcH/dstH-.5;
      const x0=Math.max(0,Math.min(srcW-1,Math.floor(sx))),y0=Math.max(0,Math.min(srcH-1,Math.floor(sy)));
      const x1=Math.max(0,Math.min(srcW-1,x0+1)),y1=Math.max(0,Math.min(srcH-1,y0+1));
      const fx=Math.max(0,Math.min(1,sx-x0)),fy=Math.max(0,Math.min(1,sy-y0));
      const a=Number(src[y0*srcW+x0])||0,b=Number(src[y0*srcW+x1])||0;
      const d=Number(src[y1*srcW+x0])||0,e=Number(src[y1*srcW+x1])||0;
      out[y*dstW+x]=(a*(1-fx)+b*fx)*(1-fy)+(d*(1-fx)+e*fx)*fy;
    }
    return out;
  }

  function cropResampleFeatureMap(src,srcW,srcH,dstW,dstH,trimX=.12,trimY=.08){
    if(!Array.isArray(src)||src.length!==srcW*srcH)return null;
    const out=Array(dstW*dstH).fill(0);
    const x0=srcW*trimX,y0=srcH*trimY;
    const spanW=srcW*(1-trimX*2),spanH=srcH*(1-trimY*2);
    for(let y=0;y<dstH;y++)for(let x=0;x<dstW;x++){
      const sx=x0+(x+.5)*spanW/dstW-.5;
      const sy=y0+(y+.5)*spanH/dstH-.5;
      const ax=Math.max(0,Math.min(srcW-1,Math.floor(sx))),ay=Math.max(0,Math.min(srcH-1,Math.floor(sy)));
      const bx=Math.max(0,Math.min(srcW-1,ax+1)),by=Math.max(0,Math.min(srcH-1,ay+1));
      const fx=Math.max(0,Math.min(1,sx-ax)),fy=Math.max(0,Math.min(1,sy-ay));
      const p00=Number(src[ay*srcW+ax])||0,p10=Number(src[ay*srcW+bx])||0;
      const p01=Number(src[by*srcW+ax])||0,p11=Number(src[by*srcW+bx])||0;
      out[y*dstW+x]=(p00*(1-fx)+p10*fx)*(1-fy)+(p01*(1-fx)+p11*fx)*fy;
    }
    return out;
  }

  function convertLegacyDirectFeature(t,applyInnerCrop=false){
    if(!t||!Array.isArray(t.gray)||!Array.isArray(t.edge)||!Array.isArray(t.red)||!Array.isArray(t.green))return null;
    const srcW=Number(t.width)||0,srcH=Number(t.height)||0,dstW=24,dstH=36;
    if(srcW<2||srcH<2)return null;
    const map=applyInnerCrop?cropResampleFeatureMap:resampleFeatureMap;
    const gray=map(t.gray,srcW,srcH,dstW,dstH);
    const edge=map(t.edge,srcW,srcH,dstW,dstH);
    const red=map(t.red,srcW,srcH,dstW,dstH);
    const green=map(t.green,srcW,srcH,dstW,dstH);
    if(!gray||!edge||!red||!green)return null;
    return {kind:FEATURE_KIND,width:dstW,height:dstH,gray,edge,red,green};
  }

  function legacyLibraryKeys(){
    const keys=LEGACY_LIB_KEYS.slice();
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||key===LIB_KEY||key===LIB_BACKUP_KEY||!key.startsWith('MahjongScoreApp_tile_templates_'))continue;
        if(!keys.includes(key))keys.push(key);
      }
    }catch(_){}
    return keys;
  }

  function librarySourceName(key){
    const m=String(key||'').match(/m7v(\d+)/i);
    return m?('v'+m[1]):'legacy';
  }

  function loadLegacyLibrary(){
    for(const key of legacyLibraryKeys()){
      if(key===LIB_KEY)continue;
      try{
        const raw=JSON.parse(localStorage.getItem(key)||'{}');
        if(!raw||typeof raw!=='object')continue;
        const labels=Object.keys(raw).filter(label=>Array.isArray(raw[label])&&raw[label].length);
        if(!labels.length)continue;
        const applyInnerCrop=!key.includes('m7v53innercrop');
        const lib={};
        for(const label of labels){
          const converted=[];
          for(const t of raw[label]){
            const next=convertLegacyDirectFeature(t,applyInnerCrop);
            if(!next)continue;
            converted.push(next);
            if(converted.length>=MAX_TEMPLATES)break;
          }
          if(converted.length)lib[label]=converted;
        }
        if(Object.keys(lib).length){
          state.librarySource=librarySourceName(key)+(applyInnerCrop?'-inner換算':'');
          return lib;
        }
      }catch(_){}
    }
    return {};
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
      const result={cx,cy,theta,faceW,faceH,fill,area:bestPixels.length};
      Object.defineProperty(result,'pixels',{value:bestPixels,enumerable:false});
      return result;
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

  function quantileSorted(values,q){
    if(!values.length)return NaN;
    const p=Math.max(0,Math.min(values.length-1,(values.length-1)*q));
    const i=Math.floor(p),f=p-i;
    return values[i]*(1-f)+(values[Math.min(values.length-1,i+1)]??values[i])*f;
  }

  function linearFit(points){
    if(!Array.isArray(points)||points.length<3)return null;
    let sx=0,sy=0,sxx=0,sxy=0;
    for(const p of points){sx+=p.x;sy+=p.y;sxx+=p.x*p.x;sxy+=p.x*p.y;}
    const n=points.length,den=n*sxx-sx*sx;
    if(Math.abs(den)<1e-6)return {a:0,b:sy/n};
    const a=(n*sxy-sx*sy)/den;
    return {a,b:(sy-a*sx)/n};
  }

  function detectFaceQuad(source){
    const geom=detectFaceGeometry(source);
    const pixels=geom?.pixels;
    const w=source.width|0,h=source.height|0;
    if(!geom||!pixels?.length||w<8||h<8)return null;
    const sin=Math.sin(geom.theta),cos=Math.cos(geom.theta),pts=[];
    for(const p of pixels){
      const dx=(p%w)-geom.cx,dy=((p/w)|0)-geom.cy;
      pts.push({u:sin*dx-cos*dy,v:cos*dx+sin*dy});
    }
    const us=pts.map(p=>p.u).sort((a,b)=>a-b),vs=pts.map(p=>p.v).sort((a,b)=>a-b);
    const uMin=quantileSorted(us,.02),uMax=quantileSorted(us,.98);
    const vMin=quantileSorted(vs,.02),vMax=quantileSorted(vs,.98);
    if(!Number.isFinite(uMin+uMax+vMin+vMax))return null;
    const uSpan=uMax-uMin,vSpan=vMax-vMin;
    if(uSpan<4||vSpan<6)return null;

    const leftPts=[],rightPts=[],binsV=8;
    for(let bi=0;bi<binsV;bi++){
      const a=vMin+vSpan*(.10+.80*bi/binsV),b=vMin+vSpan*(.10+.80*(bi+1)/binsV);
      const band=pts.filter(p=>p.v>=a&&p.v<b).map(p=>p.u).sort((x,y)=>x-y);
      if(band.length<6)continue;
      leftPts.push({x:(a+b)/2,y:quantileSorted(band,.035)});
      rightPts.push({x:(a+b)/2,y:quantileSorted(band,.965)});
    }
    const topPts=[],bottomPts=[],binsU=6;
    for(let bi=0;bi<binsU;bi++){
      const a=uMin+uSpan*(.12+.76*bi/binsU),b=uMin+uSpan*(.12+.76*(bi+1)/binsU);
      const band=pts.filter(p=>p.u>=a&&p.u<b).map(p=>p.v).sort((x,y)=>x-y);
      if(band.length<6)continue;
      topPts.push({x:(a+b)/2,y:quantileSorted(band,.035)});
      bottomPts.push({x:(a+b)/2,y:quantileSorted(band,.965)});
    }
    const l=linearFit(leftPts),r=linearFit(rightPts),t=linearFit(topPts),bt=linearFit(bottomPts);
    if(!l||!r||!t||!bt)return null;

    // left/right: u=a*v+b. top/bottom: v=a*u+b.
    function intersect(side,edge){
      const den=1-edge.a*side.a;
      if(Math.abs(den)<.25)return null;
      const v=(edge.a*side.b+edge.b)/den;
      return {u:side.a*v+side.b,v};
    }
    const uv=[intersect(l,t),intersect(r,t),intersect(r,bt),intersect(l,bt)];
    if(uv.some(p=>!p||!Number.isFinite(p.u)||!Number.isFinite(p.v)))return null;
    function toXY(p){
      return {x:geom.cx+sin*p.u+cos*p.v,y:geom.cy-cos*p.u+sin*p.v};
    }
    let quad=uv.map(toXY);
    const center=quad.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0});
    quad=quad.map(p=>({
      x:Math.max(0,Math.min(w-1,center.x+(p.x-center.x)*1.015)),
      y:Math.max(0,Math.min(h-1,center.y+(p.y-center.y)*1.015))
    }));
    function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
    function dir(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
    function parallelDelta(a,b){
      let d=Math.abs(a-b)%Math.PI;
      if(d>Math.PI/2)d=Math.PI-d;
      return d;
    }
    function cornerCos(a,b,c){
      const ux=a.x-b.x,uy=a.y-b.y,vx=c.x-b.x,vy=c.y-b.y;
      const den=Math.hypot(ux,uy)*Math.hypot(vx,vy);
      return den>1e-6?Math.abs((ux*vx+uy*vy)/den):1;
    }
    const top=dist(quad[0],quad[1]),right=dist(quad[1],quad[2]),bottom=dist(quad[3],quad[2]),left=dist(quad[0],quad[3]);
    const avgW=(top+bottom)/2,avgH=(left+right)/2,aspect=avgH/Math.max(1,avgW);
    let area=0;for(let i=0;i<4;i++){const a=quad[i],b=quad[(i+1)%4];area+=a.x*b.y-b.x*a.y;}area=Math.abs(area)/2;
    const tb=Math.max(top,bottom)/Math.max(1,Math.min(top,bottom));
    const lr=Math.max(left,right)/Math.max(1,Math.min(left,right));
    const horizontalDelta=parallelDelta(dir(quad[0],quad[1]),dir(quad[3],quad[2]));
    const verticalDelta=parallelDelta(dir(quad[0],quad[3]),dir(quad[1],quad[2]));
    const worstCorner=Math.max(
      cornerCos(quad[1],quad[0],quad[3]),cornerCos(quad[0],quad[1],quad[2]),
      cornerCos(quad[1],quad[2],quad[3]),cornerCos(quad[2],quad[3],quad[0])
    );
    // The app asks for a near-top-down row. Extreme trapezoids here are usually
    // glyph/background edges being mistaken for tile corners, which creates the
    // visibly slanted crops seen on iPhone. Reject them and use rotation-only
    // canonicalization instead of forcing a bad projective warp.
    if(area<w*h*.30||avgW<w*.32||avgH<h*.38||aspect<1.00||aspect>1.95)return null;
    if(tb>1.22||lr>1.22||horizontalDelta>.16||verticalDelta>.16||worstCorner>.30)return null;
    return quad;
  }

  function solveLinearSystem(A,b){
    const n=b.length,M=A.map((row,i)=>row.slice().concat(b[i]));
    for(let col=0;col<n;col++){
      let pivot=col;
      for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[pivot][col]))pivot=r;
      if(Math.abs(M[pivot][col])<1e-9)return null;
      if(pivot!==col){const tmp=M[col];M[col]=M[pivot];M[pivot]=tmp;}
      const d=M[col][col];for(let j=col;j<=n;j++)M[col][j]/=d;
      for(let r=0;r<n;r++){
        if(r===col)continue;
        const f=M[r][col];if(Math.abs(f)<1e-12)continue;
        for(let j=col;j<=n;j++)M[r][j]-=f*M[col][j];
      }
    }
    return M.map(row=>row[n]);
  }

  function homographyFromQuad(dst,src){
    const A=[],b=[];
    for(let i=0;i<4;i++){
      const u=dst[i].x,v=dst[i].y,x=src[i].x,y=src[i].y;
      A.push([u,v,1,0,0,0,-x*u,-x*v]);b.push(x);
      A.push([0,0,0,u,v,1,-y*u,-y*v]);b.push(y);
    }
    return solveLinearSystem(A,b);
  }

  function warpQuadToCanvas(source,quad,width=64,height=96){
    if(!Array.isArray(quad)||quad.length!==4)return null;
    const mx=Math.max(1,width*.035),my=Math.max(1,height*.035);
    const dst=[
      {x:mx,y:my},{x:width-1-mx,y:my},
      {x:width-1-mx,y:height-1-my},{x:mx,y:height-1-my}
    ];
    const H=homographyFromQuad(dst,quad);if(!H)return null;
    const sw=source.width|0,sh=source.height|0;
    const sctx=source.getContext('2d',{willReadFrequently:true});
    const srcData=sctx.getImageData(0,0,sw,sh).data;
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    const img=o.createImageData(width,height),d=img.data;
    function sample(x,y,ch){
      if(x<0||y<0||x>sw-1||y>sh-1)return ch===3?255:244;
      const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(sw-1,x0+1),y1=Math.min(sh-1,y0+1);
      const fx=x-x0,fy=y-y0;
      const i00=(y0*sw+x0)*4+ch,i10=(y0*sw+x1)*4+ch,i01=(y1*sw+x0)*4+ch,i11=(y1*sw+x1)*4+ch;
      return (srcData[i00]*(1-fx)+srcData[i10]*fx)*(1-fy)+(srcData[i01]*(1-fx)+srcData[i11]*fx)*fy;
    }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const di=(y*width+x)*4;
      if(x<mx||x>width-1-mx||y<my||y>height-1-my){
        d[di]=244;d[di+1]=241;d[di+2]=232;d[di+3]=255;continue;
      }
      const den=H[6]*x+H[7]*y+1;
      if(Math.abs(den)<1e-9){d[di]=244;d[di+1]=241;d[di+2]=232;d[di+3]=255;continue;}
      const sx=(H[0]*x+H[1]*y+H[2])/den,sy=(H[3]*x+H[4]*y+H[5])/den;
      d[di]=sample(sx,sy,0);d[di+1]=sample(sx,sy,1);d[di+2]=sample(sx,sy,2);d[di+3]=255;
    }
    o.putImageData(img,0,0);
    out.__m7v46Perspective=true;
    return out;
  }

  function perspectiveFaceCanvas(ctx,b,width=64,height=96){
    const x0=Math.max(0,Math.floor(b.x)),y0=Math.max(0,Math.floor(b.y));
    const x1=Math.min(ctx.canvas.width,Math.ceil(b.x+b.w)),y1=Math.min(ctx.canvas.height,Math.ceil(b.y+b.h));
    const sw=Math.max(1,x1-x0),sh=Math.max(1,y1-y0);
    const src=document.createElement('canvas');src.width=sw;src.height=sh;
    src.getContext('2d',{willReadFrequently:true}).drawImage(ctx.canvas,x0,y0,sw,sh,0,0,sw,sh);
    const quad=detectFaceQuad(src);
    const warped=quad?warpQuadToCanvas(src,quad,width,height):null;
    if(warped)return warped;
    const oriented=canonicalizeCanvas(src,width,height);
    if(oriented){oriented.__m7v46Perspective=false;return oriented;}
    const fallback=normalizedFaceCanvas(ctx,b,width,height);fallback.__m7v46Perspective=false;return fallback;
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
    const width=24,height=36;
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
    return innerFeatureFromCanonical(perspectiveFaceCanvas(ctx,b,96,144));
  }

  function trainingImageDataUrl(ctx,b){
    return perspectiveFaceCanvas(ctx,b,96,144).toDataURL('image/jpeg',.90);
  }



  function innerRecognitionCanvas(source,width=96,height=144,trimX=.12,trimY=.08){
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    const sx=Math.max(0,Math.round(source.width*trimX));
    const sy=Math.max(0,Math.round(source.height*trimY));
    const sw=Math.max(1,source.width-sx*2),sh=Math.max(1,source.height-sy*2);
    o.drawImage(source,sx,sy,sw,sh,0,0,width,height);
    return out;
  }

  function innerFeatureFromCanonical(source){
    return descriptorFromCanvas(innerRecognitionCanvas(source,96,144));
  }

  function analyzeTileBox(ctx,b){
    const canonical=perspectiveFaceCanvas(ctx,b,96,144);
    const recognition=innerRecognitionCanvas(canonical,96,144);
    const trainingImage=canonical.toDataURL('image/jpeg',.92);
    return {
      feature:descriptorFromCanvas(recognition),
      crop:recognition.toDataURL('image/jpeg',.92),
      trainingImage,
      perspectiveUsed:canonical.__m7v46Perspective===true
    };
  }

  function featureFromDataUrl(url){
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas');c.width=96;c.height=144;
        const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#f4f1e8';x.fillRect(0,0,c.width,c.height);
        x.drawImage(img,0,0,c.width,c.height);
        const canonical=perspectiveFaceCanvas(x,{x:0,y:0,w:c.width,h:c.height},96,144);
        resolve(innerFeatureFromCanonical(canonical));
      };
      img.onerror=()=>resolve(null);
      img.src=url;
    });
  }

  async function rebuildLibraryFromTrainingImages(){
    const existing=loadLibrary();
    if(Object.values(existing).some(list=>Array.isArray(list)&&list.length)){
      state.librarySource='stable';
      return existing;
    }
    const rows=(await loadTrainingSamples()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(rows.length){
      const selected=[],perLabel={};
      for(const row of rows){
        if(!row?.label||!row?.imageDataUrl)continue;
        const n=perLabel[row.label]||0;
        if(n>=MAX_TEMPLATES)continue;
        perLabel[row.label]=n+1;selected.push(row);
      }
      const decoded=await Promise.all(selected.map(async row=>({row,feature:await featureFromDataUrl(row.imageDataUrl)})));
      const lib={};
      for(const {row,feature} of decoded){
        if(!feature)continue;
        const list=Array.isArray(lib[row.label])?lib[row.label]:[];
        if(!list.some(t=>core.featureDistance(feature,t)<.012)){
          list.push(feature);lib[row.label]=list.slice(0,MAX_TEMPLATES);
        }
      }
      if(Object.keys(lib).length){
        state.librarySource='raw';
        saveLibrary(lib);
        return lib;
      }
    }
    const legacy=loadLegacyLibrary();
    if(Object.keys(legacy).length){
      saveLibrary(legacy);
      return legacy;
    }
    state.librarySource='';
    return existing;
  }

  const trainingReadyPromise=rebuildLibraryFromTrainingImages().catch(()=>loadLibrary());

  function cropDataUrl(ctx,b){
    return perspectiveFaceCanvas(ctx,b,96,144).toDataURL('image/jpeg',.90);
  }

  function confidentCandidate(ranked){
    if(!Array.isArray(ranked)||!ranked.length)return null;
    const best=ranked[0],second=ranked.find(x=>x.label!==best.label);
    if(!best||!Number.isFinite(best.distance))return null;
    // v51 keeps every label recoverable. Family remains soft, while ranking
    // emphasizes pixels that distinguish labels inside the same family.
    // For auto-fill only, stay conservative when a strong family signal disagrees
    // with the winning label; the Top1 suggestion itself is still shown.
    if(best.bestFamily&&best.family&&best.bestFamily!==best.family&&Number(best.familyGap)>.020)return null;
    // False positives are worse than leaving a tile as "?".
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
      const ranked=core.rankLabelsFamilyDiscriminative(feature,lib,{blend:.84,priorWeight:.26,maxPenalty:.016});
      debug[index]=ranked.slice(0,3).map(x=>({
        label:x.label,
        family:x.family||core.tileFamily(x.label),
        distance:Number(x.distance.toFixed(4)),
        globalDistance:Number.isFinite(x.globalDistance)?Number(x.globalDistance.toFixed(4)):null,
        discriminativeDistance:Number.isFinite(x.discriminativeDistance)?Number(x.discriminativeDistance.toFixed(4)):null,
        familyDistance:Number.isFinite(x.familyDistance)?Number(x.familyDistance.toFixed(4)):null,
        familyPenalty:Number.isFinite(x.familyPenalty)?Number(x.familyPenalty.toFixed(4)):null,
        bestFamily:x.bestFamily||'',
        familyGap:Number.isFinite(x.familyGap)?Number(x.familyGap.toFixed(4)):null
      }));
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

  function renderPickerPhoto(index){
    const picker=document.getElementById('tile-picker-m7v5');
    const grid=picker?.querySelector('.tile-picker-grid-m7v5');
    if(!picker||!grid||!Number.isInteger(index)||index<0||index>=14)return;
    picker.querySelector('.m7v57-photo-preview')?.remove();
    const url=state.pendingCrops[index];
    if(!url)return;
    const box=document.createElement('div');box.className='m7v57-photo-preview';box.dataset.m7v57Index=String(index);
    const img=document.createElement('img');img.src=url;img.alt=`撮影した${index+1}枚目`;
    const copy=document.createElement('div');copy.className='m7v57-copy';
    copy.innerHTML=`撮影した ${index+1} 枚目<small>この画像を見ながら牌を選んでください</small>`;
    box.append(img,copy);
    grid.insertAdjacentElement('beforebegin',box);
  }

  function renderPickerSuggestions(index){
    const picker=document.getElementById('tile-picker-m7v5');
    const grid=picker?.querySelector('.tile-picker-grid-m7v5');
    if(!picker||!grid||!Number.isInteger(index)||index<0||index>=14)return;
    picker.dataset.m7v40Index=String(index);
    picker.dataset.m7v41RenderedIndex=String(index);
    picker.querySelector('.m7v39-suggestions')?.remove();
    renderPickerPhoto(index);
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
    if(!lowRow)return {row:null,boxes:[],features:[],crops:[],trainingImages:[],perspectiveCount:0,photo:highCanvas.toDataURL('image/jpeg',.80)};
    const sx=highCanvas.width/low.width,sy=highCanvas.height/low.height;
    const row={x:lowRow.x*sx,y:lowRow.y*sy,w:lowRow.w*sx,h:lowRow.h*sy};
    const boxes=splitRow(row,14);
    const tileData=boxes.map(b=>analyzeTileBox(highCtx,b));
    return {
      row,boxes,
      features:tileData.map(x=>x.feature),
      crops:tileData.map(x=>x.crop),
      trainingImages:tileData.map(x=>x.trainingImage),
      perspectiveCount:tileData.filter(x=>x.perspectiveUsed).length,
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
          const badge=document.createElement('span');badge.className='m7v53-top1';badge.textContent=`1位 ${suggestions[0]}`;b.appendChild(badge);
        }
      });
      const auto=predicted.filter(Boolean).length;
      const learnedLabels=Object.keys(loadLibrary()).filter(label=>Array.isArray(loadLibrary()[label])&&loadLibrary()[label].length).length;
      const firstCalibration=features.length===14&&learnedLabels===0;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=features.length===14
        ?(firstCalibration
          ?'この保存領域には学習データがありません。撮影回数では学習されません。今回だけ14枚を正しく指定して「この手牌で進む」まで確定してください。確定後は安定保存キー＋バックアップへ保存します。'
          :`精度優先版です。内側cropを維持しつつ、強すぎる台形補正は拒否して回転補正へ戻します。表示画像も実際に認識へ使った内側cropです。高信頼候補 ${auto}枚。`)
        :'白枠内から牌列を特定できませんでした。撮影画像を確認し、14枠を手動入力するか「読み取り直す」で再撮影してください。';
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status&&auto<14)status.textContent=features.length===14
        ?(firstCalibration?'初回学習：14枚を指定してください':`学習済み ${learnedLabels}種類${state.librarySource?` / 元:${state.librarySource}`:''} / 安定保存 / 精度優先 / 射影採用 ${analysis.perspectiveCount||0}/14 / 高信頼 ${auto}枚`)
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
    sourceRectForCover,locateTileRow,splitRow,splitRowBySeams,analyzeGuideCanvas,featureFromBox,tileFaceRect,descriptorFromCanvas,detectFaceGeometry,detectFaceQuad,canonicalizeCanvas,orientedFaceCanvas,perspectiveFaceCanvas,warpQuadToCanvas,trainingImageDataUrl,innerRecognitionCanvas,innerFeatureFromCanonical,analyzeTileBox,loadTrainingSamples,rebuildLibraryFromTrainingImages,loadLibrary,saveLibrary,loadLegacyLibrary,legacyLibraryKeys,convertLegacyDirectFeature,cropResampleFeatureMap,confidentCandidate,renderPickerPhoto,renderPickerSuggestions,pickerCurrentIndex,schedulePickerSuggestionSync,attachPickerSuggestionObserver
  });
})();
