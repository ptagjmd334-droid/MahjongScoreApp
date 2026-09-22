// M7 v33: stable 13/14-tile live capture + conservative local learning.
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
    #realtime-hand-camera-m7v3 .m7v33-capture{
      position:absolute;right:14px;bottom:12px;z-index:9;border:0;border-radius:10px;
      padding:8px 12px;background:#17a765;color:white;font-weight:900
    }
    #realtime-hand-camera-m7v3 .realtime-hand-live-canvas-m7v4{display:none!important}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5.m7v33-crop{
      background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;
      color:#111
    }
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

  function detectCandidates(ctx,w,h){
    const image=ctx.getImageData(0,0,w,h),data=image.data;
    const mask=new Uint8Array(w*h);
    // Tile faces tend to be bright and relatively low-saturation. Keep this intentionally broad.
    for(let i=0,p=0;i<data.length;i+=4,p++){
      const r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b);
      const lum=(r*3+g*6+b)/10;
      if(lum>118&&(max-min)<112)mask[p]=1;
    }
    // Fill tiny horizontal gaps caused by printed markings.
    for(let y=1;y<h-1;y++)for(let x=2;x<w-2;x++){
      const p=y*w+x;
      if(!mask[p]&&mask[p-1]&&mask[p+1])mask[p]=1;
    }
    const seen=new Uint8Array(w*h),stack=[],boxes=[];
    const minPixels=Math.max(45,Math.floor(w*h*.0012));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const start=y*w+x;if(!mask[start]||seen[start])continue;
      seen[start]=1;stack.length=0;stack.push(start);
      let minX=x,maxX=x,minY=y,maxY=y,count=0;
      while(stack.length){
        const q=stack.pop(),qx=q%w,qy=(q/w)|0;count++;
        if(qx<minX)minX=qx;if(qx>maxX)maxX=qx;if(qy<minY)minY=qy;if(qy>maxY)maxY=qy;
        const ns=[q-1,q+1,q-w,q+w];
        for(const n of ns){if(n>=0&&n<mask.length&&mask[n]&&!seen[n]){seen[n]=1;stack.push(n);}}
      }
      if(count<minPixels)continue;
      const bw=maxX-minX+1,bh=maxY-minY+1,fill=count/(bw*bh);
      if(bh<h*.34||bh>h*.98||bw<w*.018||bw>w*.14)continue;
      if(bh/bw<1.0||bh/bw>3.1||fill<.28)continue;
      boxes.push({x:minX,y:minY,w:bw,h:bh,cx:(minX+bw/2)/w});
    }
    boxes.sort((a,b)=>a.x-b.x);
    // Prefer the most horizontally aligned row if reflections create extra components.
    if(boxes.length>14){
      const medY=[...boxes].map(b=>b.y+b.h/2).sort((a,b)=>a-b)[Math.floor(boxes.length/2)];
      boxes.sort((a,b)=>Math.abs((a.y+a.h/2)-medY)-Math.abs((b.y+b.h/2)-medY));
      boxes.splice(14);
      boxes.sort((a,b)=>a.x-b.x);
    }
    return boxes;
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
    const c=document.createElement('canvas');
    c.width=72;c.height=100;
    const o=c.getContext('2d');
    const px=Math.max(1,b.w*.04),py=Math.max(1,b.h*.03);
    o.drawImage(ctx.canvas,b.x-px,b.y-py,b.w+px*2,b.h+py*2,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.72);
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

  function showResult(ctx,boxes){
    if(state.captured)return;
    state.captured=true;
    stopLoop();
    const features=boxes.map(b=>featureFromBox(ctx,b));
    const crops=boxes.map(b=>cropDataUrl(ctx,b));
    state.pendingFeatures=features.slice(0,14);
    state.pendingCrops=crops.slice(0,14);
    window.M7V33PendingFeatures=state.pendingFeatures;
    const predicted=predict(state.pendingFeatures);
    while(predicted.length<14)predicted.push('');
    document.querySelector('#realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3')?.click();
    setTimeout(()=>{
      window.showHandResultM7V5?.(predicted.slice(0,14));
      const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      buttons.forEach((b,i)=>{
        const url=state.pendingCrops[i];
        if(url){b.classList.add('m7v33-crop');b.style.backgroundImage=`url("${url}")`;b.dataset.m7v33Index=String(i);}
      });
      const auto=predicted.filter(Boolean).length;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=`カメラで${boxes.length}枚を切り出し / 学習済み候補 ${auto}枚。? の牌だけタップして選択してください。修正内容は次回認識に学習されます。`;
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status&&auto<14)status.textContent=`${auto} / 14枚を自動候補化`;
    },80);
  }

  function attach(overlay){
    if(!overlay||overlay.dataset.m7v33Attached==='1')return;
    overlay.dataset.m7v33Attached='1';state.overlay=overlay;state.captured=false;state.previousXs=null;state.stable=0;
    const status=document.createElement('div');status.className='m7v33-status';status.textContent='牌候補を探しています…';overlay.appendChild(status);
    const capture=document.createElement('button');capture.type='button';capture.className='m7v33-capture';capture.textContent='この瞬間を確認';overlay.appendChild(capture);
    const video=overlay.querySelector('.realtime-hand-video-m7v3');
    const work=document.createElement('canvas');work.width=480;work.height=190;
    const ctx=work.getContext('2d',{willReadFrequently:true});
    let lastBoxes=[];
    capture.addEventListener('click',e=>{e.stopPropagation();if(lastBoxes.length)showResult(ctx,lastBoxes);});
    function tick(){
      if(!document.body.contains(overlay)||state.captured){stopLoop();return;}
      if(video?.readyState>=2&&video.videoWidth>0){
        ctx.drawImage(video,0,0,video.videoWidth,video.videoHeight,0,0,work.width,work.height);
        const boxes=detectCandidates(ctx,work.width,work.height);lastBoxes=boxes;
        const xs=boxes.map(b=>b.cx);
        if(core.stableEnough(state.previousXs,xs))state.stable++;else state.stable=0;
        state.previousXs=xs;
        const oldCount=overlay.querySelector('#realtime-hand-count-m7v3');if(oldCount)oldCount.textContent=`${boxes.length} / 14`;
        status.textContent=[13,14].includes(boxes.length)
          ? `候補${boxes.length}枚・安定 ${Math.min(4,state.stable)}/4`
          : `候補${boxes.length}枚 — 13〜14枚が枠内に入るよう調整`;
        if([13,14].includes(boxes.length)&&state.stable>=4){showResult(ctx,boxes);return;}
      }
      state.timer=setTimeout(tick,360);
    }
    state.timer=setTimeout(tick,250);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#open-realtime-hand-camera-m7v3')){
      setTimeout(()=>attach(document.getElementById('realtime-hand-camera-m7v3')),650);
    }
    if(e.target.closest?.('.realtime-hand-cancel-m7v3'))stopLoop();
  },true);
  window.addEventListener('pagehide',stopLoop,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopLoop();});

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

  window.M7CameraV33=Object.freeze({detectCandidates,featureFromBox,loadLibrary});
})();
