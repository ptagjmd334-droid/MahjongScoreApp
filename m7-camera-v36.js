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
      padding:27vh 6vw 28vh!important
    }
    #realtime-hand-camera-m7v3 .realtime-hand-guide-box-m7v3{
      position:relative;border:4px solid rgba(255,255,255,.97)!important;border-radius:18px!important;
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
      position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));
      z-index:10;min-width:180px;min-height:46px;padding:8px 18px;border:0;border-radius:999px;
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
      #realtime-hand-camera-m7v3 .realtime-hand-guide-m7v3{padding:26vh 6vw 30vh!important}
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
    o.drawImage(ctx.canvas,Math.max(0,b.x-px),Math.max(0,b.y-py),
      Math.min(ctx.canvas.width-b.x+px,b.w+px*2),Math.min(ctx.canvas.height-b.y+py,b.h+py*2),
      0,0,c.width,c.height);
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
  function locateTileRow(ctx){
    const w=ctx.canvas.width,h=ctx.canvas.height;
    if(!(w>20&&h>20))return null;
    const data=ctx.getImageData(0,0,w,h).data;
    const mask=new Uint8Array(w*h),rows=new Int32Array(h);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const p=y*w+x,i=p*4,r=data[i],g=data[i+1],b=data[i+2];
        const max=Math.max(r,g,b),min=Math.min(r,g,b),lum=(r*3+g*6+b)/10;
        if(lum>132&&(max-min)<105){mask[p]=1;rows[y]++;}
      }
    }
    const rowThreshold=Math.max(8,Math.round(w*.22));
    let runs=[],start=-1;
    for(let y=0;y<=h;y++){
      const active=y<h&&rows[y]>=rowThreshold;
      if(active&&start<0)start=y;
      if(!active&&start>=0){
        const end=y,bandH=end-start;
        let score=0;for(let yy=start;yy<end;yy++)score+=rows[yy];
        runs.push({y:start,h:bandH,score});start=-1;
      }
    }
    runs=runs.filter(r=>r.h>=Math.max(8,Math.round(h*.12))&&r.h<=h*.90);
    runs.sort((a,b)=>b.score-a.score);
    const band=runs[0];if(!band)return null;

    const cols=new Int32Array(w);
    for(let x=0;x<w;x++)for(let y=band.y;y<band.y+band.h;y++)cols[x]+=mask[y*w+x];
    const colThreshold=Math.max(3,Math.round(band.h*.20));
    const active=[];for(let x=0;x<w;x++)if(cols[x]>=colThreshold)active.push(x);
    if(active.length<w*.32)return null;

    // Join small gaps produced by glyphs or tiny spaces between tiles.
    const groups=[];let g=null;const gapLimit=Math.max(4,Math.round(w*.025));
    for(const x of active){
      if(!g||x-g.end>gapLimit){g={start:x,end:x,count:1};groups.push(g);}
      else{g.end=x;g.count++;}
    }
    groups.sort((a,b)=>(b.end-b.start)-(a.end-a.start));
    const best=groups[0];if(!best||best.end-best.start<w*.48)return null;
    const px=Math.max(2,Math.round(w*.008)),py=Math.max(2,Math.round(h*.05));
    const x=Math.max(0,best.start-px),x2=Math.min(w,best.end+px+1);
    const y=Math.max(0,band.y-py),y2=Math.min(h,band.y+band.h+py);
    if(x2-x<w*.50||y2-y<h*.10)return null;
    return {x,y,w:x2-x,h:y2-y};
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
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopLocalState();});

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
