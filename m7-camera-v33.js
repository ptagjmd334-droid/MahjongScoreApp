// M7 v36: fixed guide-frame shutter capture + post-capture row segmentation + conservative local learning.
// Uses the existing M7 camera/result UI but owns live detection when loaded.
(()=>{
  'use strict';
  window.M7V33CameraOwner=true;
  const core=window.M7RecognitionCoreV33;
  if(!core)return;

  const LIB_KEY='MahjongScoreApp_tile_templates_m7v33';
  const MAX_TEMPLATES=4;
  const glyphs=window.MAHJONG_TILE_GLYPHS_M7||{};
  const state={timer:null,overlay:null,previousXs:null,stable:0,captured:false,pendingFeatures:[],pendingCrops:[]};

  const style=document.createElement('style');
  style.textContent=`
    #realtime-hand-camera-m7v3 .m7v33-status{
      position:absolute;left:50%;bottom:54px;transform:translateX(-50%);
      z-index:8;background:rgba(0,0,0,.72);color:white;border-radius:999px;
      padding:6px 11px;font:800 12px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;
      pointer-events:none;white-space:nowrap
    }
    /* One horizontal action row: capture on the left, cancel on the right.
       Override the legacy right-aligned cancel explicitly for iPhone PWA. */
    #realtime-hand-camera-m7v3 .m7v33-capture{
      position:absolute;left:max(14px,env(safe-area-inset-left))!important;
      right:auto!important;bottom:max(12px,env(safe-area-inset-bottom))!important;
      z-index:10;min-height:44px;max-width:calc(50% - 26px);
      border:0;border-radius:10px;padding:8px 12px;
      background:#17a765;color:white;font-weight:900;font-size:14px
    }
    #realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3{
      right:max(14px,env(safe-area-inset-right))!important;
      left:auto!important;bottom:max(12px,env(safe-area-inset-bottom))!important;
      z-index:10;max-width:calc(50% - 26px);
    }
    #realtime-hand-camera-m7v3 .m7v33-status{
      bottom:calc(max(12px,env(safe-area-inset-bottom)) + 52px);
      max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis;
    }
    #realtime-hand-camera-m7v3 .realtime-hand-live-canvas-m7v4{display:none!important}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v33-crop{
      background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;
      color:#111
    }
    #hand-result-overlay-m7v5 .m7v35-full-photo{
      width:100%;height:64px;max-height:22%;object-fit:contain;
      background:#272727;border-radius:8px;flex:none
    }
    #hand-result-overlay-m7v5 .hand-result-tiles-m7v5{min-height:0}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v33-crop:not([data-tile])::after{
      content:'?';font-size:22px;font-weight:900;color:#b43;background:rgba(255,255,255,.72);
      border-radius:999px;padding:0 7px
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

  // v36: the user aligns the winning hand inside one fixed guide and presses the shutter.
  // We no longer require 13/14 separate live components before capture.
  style.textContent += [
    '#realtime-hand-camera-m7v3 .realtime-hand-guide-m7v3{padding:0!important;align-items:center!important;justify-content:center!important}',
    '#realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{width:min(86vw,1180px)!important;height:min(31vh,146px)!important;border-radius:16px!important}',
    '#realtime-hand-camera-m7v3 .m7v33-capture{left:50%!important;right:auto!important;bottom:max(10px,env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;min-width:92px!important;max-width:none!important;min-height:48px!important;border-radius:999px!important;padding:8px 20px!important;background:#17a765!important}',
    '#realtime-hand-camera-m7v3 .m7v33-status{bottom:calc(max(10px,env(safe-area-inset-bottom)) + 54px)!important}',
    '@media (orientation:landscape) and (max-height:500px){#realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{height:min(29vh,124px)!important}}'
  ].join('');

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

  function estimateTileRow(ctx){
    const w=ctx.canvas.width,h=ctx.canvas.height;
    if(!w||!h)return null;
    const rgba=ctx.getImageData(0,0,w,h).data;
    const mask=new Uint8Array(w*h),rows=new Float64Array(h);
    // White tile faces are comparatively neutral even when the whole scene is dim.
    // Use a chroma/luminance ratio instead of the old fixed RGB > 147 threshold.
    for(let y=0,p=0;y<h;y++){
      for(let x=0;x<w;x++,p++){
        const i=p*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b);
        const lum=(r*3+g*6+b)/10;
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

  function boxesForRow(row){
    if(!row)return [];
    return Array.from({length:14},(_,i)=>{
      const a=Math.round(row.x+row.w*i/14),b=Math.round(row.x+row.w*(i+1)/14);
      return {x:a,y:row.y,w:Math.max(1,b-a),h:row.h,cx:(a+(b-a)/2)};
    });
  }

  function manualGuideBoxes(ctx){
    return boxesForRow(estimateTileRow(ctx));
  }

  // Compatibility helper retained for existing diagnostics/tests. v36 capture does not
  // use per-tile live connected components anymore.
  function detectCandidates(ctx){
    return manualGuideBoxes(ctx).map(b=>({...b,cx:b.cx/ctx.canvas.width}));
  }

  function featureFromBox(ctx,b){
    const out=document.createElement('canvas');out.width=32;out.height=48;
    const o=out.getContext('2d',{willReadFrequently:true});
    const sx=Math.max(0,b.x),sy=Math.max(0,b.y);
    const sw=Math.max(1,Math.min(ctx.canvas.width-sx,b.w));
    const sh=Math.max(1,Math.min(ctx.canvas.height-sy,b.h));
    const padX=Math.max(1,sw*.07),padY=Math.max(1,sh*.05);
    o.drawImage(ctx.canvas,sx+padX,sy+padY,Math.max(1,sw-padX*2),Math.max(1,sh-padY*2),0,0,32,48);
    const data=o.getImageData(0,0,32,48).data,vals=[];
    for(let gy=0;gy<12;gy++)for(let gx=0;gx<8;gx++){
      let sum=0,n=0;
      for(let y=gy*4;y<gy*4+4;y++)for(let x=gx*4;x<gx*4+4;x++){
        const i=(y*32+x)*4;sum+=(data[i]*3+data[i+1]*6+data[i+2])/10;n++;
      }
      vals.push(sum/n);
    }
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((s,v)=>s+(v-mean)*(v-mean),0)/vals.length)||1;
    return vals.map(v=>(v-mean)/sd);
  }

  function cropDataUrl(ctx,b){
    const c=document.createElement('canvas');c.width=96;c.height=128;
    const o=c.getContext('2d');
    const px=Math.max(1,b.w*.035),py=Math.max(1,b.h*.025);
    const sx=Math.max(0,b.x-px),sy=Math.max(0,b.y-py);
    const x2=Math.min(ctx.canvas.width,b.x+b.w+px),y2=Math.min(ctx.canvas.height,b.y+b.h+py);
    o.drawImage(ctx.canvas,sx,sy,Math.max(1,x2-sx),Math.max(1,y2-sy),0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.78);
  }

  function predict(features){
    const lib=loadLibrary(),used={};
    return features.map(feature=>{
      const ranked=core.rankLabels(feature,lib);
      for(const item of ranked){
        if(item.distance>.24)break;
        if((used[item.label]||0)>=4)continue;
        const second=ranked.find(x=>x.label!==item.label);
        if(second&&second.distance-item.distance<.035)return '';
        used[item.label]=(used[item.label]||0)+1;
        return item.label;
      }
      return '';
    });
  }

  function stopLoop(){
    if(state.timer)clearTimeout(state.timer);
    state.timer=null;state.overlay=null;state.previousXs=null;state.stable=0;
  }

  function guideSourceRect(video,overlay){
    const ow=overlay.clientWidth||overlay.getBoundingClientRect().width;
    const oh=overlay.clientHeight||overlay.getBoundingClientRect().height;
    const sw=video.videoWidth||video.width||0,sh=video.videoHeight||video.height||0;
    if(!ow||!oh||!sw||!sh)return null;
    const scale=Math.max(ow/sw,oh/sh);
    const shownW=sw*scale,shownH=sh*scale;
    const offsetX=(ow-shownW)/2,offsetY=(oh-shownH)/2;
    const or=overlay.getBoundingClientRect();
    const guide=overlay.querySelector('.realtime-hand-guide-box-m7v3');
    const gr=guide?.getBoundingClientRect();
    if(!gr||!gr.width||!gr.height)return {sx:0,sy:0,sw,sh};
    let sx=(gr.left-or.left-offsetX)/scale;
    let sy=(gr.top-or.top-offsetY)/scale;
    let sx2=(gr.right-or.left-offsetX)/scale;
    let sy2=(gr.bottom-or.top-offsetY)/scale;
    sx=Math.max(0,Math.min(sw-1,sx));sy=Math.max(0,Math.min(sh-1,sy));
    sx2=Math.max(sx+1,Math.min(sw,sx2));sy2=Math.max(sy+1,Math.min(sh,sy2));
    return {sx,sy,sw:sx2-sx,sh:sy2-sy};
  }

  function captureGuideFrame(video,overlay){
    const src=guideSourceRect(video,overlay);
    if(!src)return null;
    const maxWidth=1600,ratio=Math.min(1,maxWidth/src.sw);
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(src.sw*ratio));
    c.height=Math.max(1,Math.round(src.sh*ratio));
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(video,src.sx,src.sy,src.sw,src.sh,0,0,c.width,c.height);
    return {canvas:c,ctx,sourceRect:src};
  }

  function analysisCopy(canvas){
    const maxWidth=760,ratio=Math.min(1,maxWidth/canvas.width);
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(canvas.width*ratio));
    c.height=Math.max(1,Math.round(canvas.height*ratio));
    const ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(canvas,0,0,c.width,c.height);
    return {canvas:c,ctx};
  }

  function mapRow(row,fromCanvas,toCanvas){
    if(!row)return null;
    const sx=toCanvas.width/fromCanvas.width,sy=toCanvas.height/fromCanvas.height;
    return {
      x:Math.max(0,Math.round(row.x*sx)),
      y:Math.max(0,Math.round(row.y*sy)),
      w:Math.max(1,Math.round(row.w*sx)),
      h:Math.max(1,Math.round(row.h*sy)),
      confidence:row.confidence
    };
  }

  function showResult(ctx,boxes,guidePhoto,rowFound){
    stopLoop();
    const features=boxes.length===14?boxes.map(b=>featureFromBox(ctx,b)):[];
    const crops=boxes.length===14?boxes.map(b=>cropDataUrl(ctx,b)):[];
    state.pendingFeatures=features.slice(0,14);
    state.pendingCrops=crops.slice(0,14);
    window.M7V33PendingFeatures=state.pendingFeatures;
    const predicted=features.length===14?predict(features):[];
    while(predicted.length<14)predicted.push('');
    document.querySelector('#realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3')?.click();
    setTimeout(()=>{
      window.showHandResultM7V5?.(predicted.slice(0,14));
      const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      if(!rowFound&&guidePhoto){
        const photo=document.createElement('img');
        photo.alt='撮影枠内の手牌。各牌の名前は下で手動指定してください';
        photo.src=guidePhoto;photo.className='m7v35-full-photo';
        root.querySelector('.hand-result-head-m7v5')?.insertAdjacentElement('afterend',photo);
      }
      buttons.forEach((b,i)=>{
        const url=state.pendingCrops[i];
        if(url){b.classList.add('m7v33-crop');b.style.backgroundImage='url("'+url+'")';b.dataset.m7v33Index=String(i);}
      });
      const auto=predicted.filter(Boolean).length;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=rowFound
        ?'撮影枠から牌列を特定して14枚に分けました。間違っている牌と ? の牌だけタップして修正してください。'
        :'撮影枠内の牌列を特定できませんでした。画像を確認し、下の14枠をタップして正しい牌を入力するか「読み取り直す」で撮影してください。';
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status)status.textContent=rowFound?(auto+' / 14枚を自動候補化'):'手動入力：0 / 14枚';
    },80);
  }

  function attach(overlay){
    if(!overlay||overlay.dataset.m7v33Attached==='1')return;
    overlay.dataset.m7v33Attached='1';state.overlay=overlay;state.captured=false;
    const oldCount=overlay.querySelector('#realtime-hand-count-m7v3');
    if(oldCount)oldCount.textContent='撮影';
    const title=overlay.querySelector('.realtime-hand-status-m7v3 b');
    if(title)title.textContent='14枚を白枠いっぱいに並べてください';
    const small=overlay.querySelector('.realtime-hand-status-m7v3 small');
    if(small)small.textContent='枚数カウントを待たず、位置が合ったら中央の「撮影」を押します';
    const status=document.createElement('div');
    status.className='m7v33-status';status.textContent='撮影後に牌列を解析します';overlay.appendChild(status);
    const capture=document.createElement('button');
    capture.type='button';capture.className='m7v33-capture';capture.textContent='撮影';overlay.appendChild(capture);
    const video=overlay.querySelector('.realtime-hand-video-m7v3');
    capture.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(state.captured)return;
      if(!video||video.readyState<2||!(video.videoWidth||video.width)){
        status.textContent='カメラの映像を準備中です。少し待って再度押してください';
        return;
      }
      state.captured=true;capture.disabled=true;status.textContent='撮影画像を解析中…';
      try{
        const shot=captureGuideFrame(video,overlay);
        if(!shot)throw new Error('guide capture failed');
        const analysis=analysisCopy(shot.canvas);
        const lowRow=estimateTileRow(analysis.ctx);
        const highRow=mapRow(lowRow,analysis.canvas,shot.canvas);
        const boxes=boxesForRow(highRow);
        const photo=shot.canvas.toDataURL('image/jpeg',.78);
        window.M7V36LastDebug={
          guide:[shot.canvas.width,shot.canvas.height],
          sourceRect:shot.sourceRect,
          row:highRow,
          rowFound:boxes.length===14
        };
        showResult(shot.ctx,boxes,photo,boxes.length===14);
      }catch(error){
        console.error('M7 v36 capture error',error);
        state.captured=false;capture.disabled=false;
        status.textContent='撮影画像を処理できませんでした。もう一度撮影してください';
      }
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#open-realtime-hand-camera-m7v3')){
      setTimeout(()=>attach(document.getElementById('realtime-hand-camera-m7v3')),650);
    }
    if(e.target.closest?.('.realtime-hand-cancel-m7v3'))stopLoop();
  },true);
  window.addEventListener('pagehide',stopLoop,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){
      document.querySelector('#realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3')?.click();
      stopLoop();
    }
  });

  // Learn only after the user has verified all 14 tile labels.
  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
    const lib=loadLibrary();
    buttons.forEach((b,i)=>{
      const label=b.dataset.tile,feature=state.pendingFeatures[i];
      if(!label||!Array.isArray(feature))return;
      const list=Array.isArray(lib[label])?lib[label]:[];
      // Avoid storing nearly identical templates repeatedly.
      if(!list.some(t=>core.rmsDistance(feature,t)<.045)){
        list.unshift(feature);
        lib[label]=list.slice(0,MAX_TEMPLATES);
      }
    });
    saveLibrary(lib);
  },true);

  const api=Object.freeze({detectCandidates,featureFromBox,loadLibrary,manualGuideBoxes,estimateTileRow,guideSourceRect,captureGuideFrame,boxesForRow});
  window.M7CameraV36=api;
  window.M7CameraV33=api;
})();
