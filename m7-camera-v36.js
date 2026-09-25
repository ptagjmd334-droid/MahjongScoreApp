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

  const LIB_KEY='MahjongScoreApp_tile_templates_m7v33';
  const MAX_TEMPLATES=4;
  const state={overlay:null,captured:false,pendingFeatures:[],pendingCrops:[],diagnostics:null};

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
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v36-crop{
      background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;
      color:#111
    }
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v36-crop:not([data-tile])::after{
      content:'?';font-size:22px;font-weight:900;color:#b43;background:rgba(255,255,255,.78);
      border-radius:999px;padding:0 7px
    }
    #hand-result-overlay-m7v5 .m7v36-photo{
      width:100%;height:70px;max-height:23%;object-fit:contain;background:#272727;border-radius:8px;flex:none
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

  function featureFromBox(ctx,b){
    const out=document.createElement('canvas');out.width=32;out.height=48;
    const o=out.getContext('2d',{willReadFrequently:true});
    const padX=Math.max(1,b.w*.08),padY=Math.max(1,b.h*.06);
    o.drawImage(ctx.canvas,b.x+padX,b.y+padY,Math.max(1,b.w-padX*2),Math.max(1,b.h-padY*2),0,0,32,48);
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
    return c.toDataURL('image/jpeg',.82);
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

  function analyzeGuideCanvas(highCanvas){
    const highCtx=highCanvas.getContext('2d',{willReadFrequently:true});
    const low=document.createElement('canvas');
    low.width=Math.min(840,Math.max(420,highCanvas.width));
    low.height=Math.max(120,Math.round(highCanvas.height*(low.width/highCanvas.width)));
    const lowCtx=low.getContext('2d',{willReadFrequently:true});
    lowCtx.drawImage(highCanvas,0,0,low.width,low.height);
    const lowRow=locateTileRow(lowCtx);
    if(!lowRow)return {row:null,boxes:[],features:[],crops:[],photo:highCanvas.toDataURL('image/jpeg',.80)};
    const sx=highCanvas.width/low.width,sy=highCanvas.height/low.height;
    const row={x:lowRow.x*sx,y:lowRow.y*sy,w:lowRow.w*sx,h:lowRow.h*sy};
    const boxes=splitRow(row,14);
    return {
      row,boxes,
      features:boxes.map(b=>featureFromBox(highCtx,b)),
      crops:boxes.map(b=>cropDataUrl(highCtx,b)),
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
    const features=analysis.features||[],crops=analysis.crops||[];
    state.pendingFeatures=features.slice(0,14);
    state.pendingCrops=crops.slice(0,14);
    window.M7V36PendingFeatures=state.pendingFeatures;
    const predicted=features.length===14?predict(features):[];
    while(predicted.length<14)predicted.push('');
    setTimeout(()=>{
      window.showHandResultM7V5?.(predicted.slice(0,14));
      const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      buttons.forEach((b,i)=>{
        const url=state.pendingCrops[i];
        if(url){b.classList.add('m7v36-crop');b.style.backgroundImage=`url("${url}")`;b.dataset.m7v36Index=String(i);}
      });
      const auto=predicted.filter(Boolean).length;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=features.length===14
        ?`白枠内の手牌列を14枚に分割しました。自動候補 ${auto}枚。間違っている牌・?だけタップして修正してください。`
        :'白枠内から牌列を特定できませんでした。撮影画像を確認し、14枠を手動入力するか「読み取り直す」で再撮影してください。';
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status&&auto<14)status.textContent=features.length===14?`${auto} / 14枚を自動候補化`:'手動入力：0 / 14枚';
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
    shutter.addEventListener('click',e=>{
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

  // Learn only after all 14 labels were explicitly verified.
  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
    if(state.pendingFeatures.length!==14)return;
    const lib=loadLibrary();
    buttons.forEach((b,i)=>{
      const label=b.dataset.tile,feature=state.pendingFeatures[i];
      if(!label||!Array.isArray(feature))return;
      const list=Array.isArray(lib[label])?lib[label]:[];
      if(!list.some(t=>core.rmsDistance(feature,t)<.045)){
        list.unshift(feature);lib[label]=list.slice(0,MAX_TEMPLATES);
      }
    });
    saveLibrary(lib);
  },true);

  window.M7CameraV36=Object.freeze({
    sourceRectForCover,locateTileRow,splitRow,analyzeGuideCanvas,featureFromBox,loadLibrary
  });
})();
