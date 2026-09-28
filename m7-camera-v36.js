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
  const state={overlay:null,captured:false,pendingFeatures:[],pendingCrops:[],pendingTrainingImages:[],pendingBroken:[],diagnostics:null,predictionDebug:[],confidenceReasons:[],learnedLabelCount:0,librarySource:'',runtimeLibrary:null,storageDiagnostics:null,lastRecognitionMs:0,lastAuxViewsUsed:0,lastAuxFallbackCount:0,lastMicroRefined:0};
  const persistPromises=new WeakMap();
  const LEGACY_BOUNDARY_DIAGNOSTIC_LABEL='境界signal診断 / 局所再分割'; // M099/M101: stable legacy diagnostic markers; v78 no longer displays them.
  const LEGACY_CROP_DIAGNOSTIC_LABEL='crop品質fallback / 境界trim / 軸平行crop'; // stable v75-v84 diagnostic markers kept for source regressions.
  const LEGACY_YOLO_CLASS_UI_LABEL='YOLO牌種'; // stable v83-v84 source marker; v85 production status is simplified.
  const LEGACY_SAVE_CONFIRMATION_LABEL='保存完了を確認してから次へ進みます'; // stable calibration source marker; v85 copy is shorter.
  const LEGACY_YOLO_FASTPATH_MODE="detectorMode:'yolo11n-production-fastpath'"; // exact v85 source marker; v88 only improves production errors.
  const LEGACY_YOLO_DIAGNOSTIC_MODE="detectorMode:'yolo11n-diagnostic'"; // exact v78 source-regression marker; v79 production mode is separate.
  const LEGACY_YOLO_AXIS_MODE="detectorMode:'yolo11n-production-axis-aligned-crops'"; // exact v80/v81 source-regression marker; v82 adds subset selection.
  const LEGACY_YOLO_SUBSET_MODE="detectorMode:'yolo11n-production-axis-aligned-subset-crops'"; // exact v82 source-regression marker; v83 adds YOLO class recognition.
  const LEGACY_SUBSET_REASON_MARKER="reason:subsetUsed?'subset-'"; // exact v82 15→14 selector source-regression marker.
  const LEGACY_YOLO_PRIMARY_CLASS_MODE="detectorMode:'yolo11n-primary-class-hybrid'"; // exact v83 source-regression marker; v84 adds safe 13→14 recovery.
  const LEGACY_YOLO_RECOVER13_MODE="detectorMode:'yolo11n-primary-class-recover13'"; // exact v84 source-regression marker; v85 adds production fast-path/UI cleanup.
  const YOLO_CLASS_USE_THRESHOLD=.15;
  const LEGACY_YOLO_PRODUCTION_MODE="detectorMode:'yolo11n-production-crops'"; // exact v79 source-regression marker; v80 uses axis-aligned crops.
  const YOLO_MODEL_URL='https://cdn.jsdelivr.net/gh/nikmomo/Mahjong-YOLO@28ffceed232ad95fd019c47a6c51ae7c78791a0e/models/nano/mahjong-yolon-best.onnx';
  const ORT_VERSION='1.22.0';
  const ORT_SCRIPT_URL='https://cdn.jsdelivr.net/npm/onnxruntime-web@'+ORT_VERSION+'/dist/ort.min.js';
  const ORT_WASM_BASE='https://cdn.jsdelivr.net/npm/onnxruntime-web@'+ORT_VERSION+'/dist/';
  const YOLO_LABELS=Object.freeze([
    '1m','1p','1s','1z','2m','2p','2s','2z','3m','3p','3s','3z','4m','4p','4s','4z',
    '5m','5p','5s','5z','6m','6p','6s','6z','7m','7p','7s','7z','8m','8p','8s','9m','9p','9s','0m','0p','0s'
  ]);
  let ortRuntimePromise=null,detectorSessionPromise=null;

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

  function libraryLabels(lib){
    return Object.keys(lib||{}).filter(label=>Array.isArray(lib[label])&&lib[label].length);
  }

  function loadPrimaryLibrary(){
    try{
      const primary=JSON.parse(localStorage.getItem(LIB_KEY)||'{}');
      return primary&&typeof primary==='object'?primary:{};
    }catch(_){return {};}
  }

  function loadLibrary(){
    try{
      const primary=loadPrimaryLibrary();
      if(nonEmptyLibrary(primary))return primary;
      const backup=JSON.parse(localStorage.getItem(LIB_BACKUP_KEY)||'{}');
      if(backup&&typeof backup==='object'&&nonEmptyLibrary(backup)){
        try{localStorage.setItem(LIB_KEY,JSON.stringify(backup));}catch(_){}
        return backup;
      }
      return primary&&typeof primary==='object'?primary:{};
    }catch(_){return {};}
  }

  function activeLibrary(){
    const stored=loadLibrary();
    if(nonEmptyLibrary(stored))return stored;
    return nonEmptyLibrary(state.runtimeLibrary)?state.runtimeLibrary:stored;
  }

  function storageErrorCode(error){
    if(!error)return 'unknown';
    const name=String(error.name||'Error');
    const message=String(error.message||'').slice(0,120);
    return message?`${name}: ${message}`:name;
  }

  function obsoleteTemplateKeys(){
    const keys=[];
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||key===LIB_KEY||key===LIB_BACKUP_KEY)continue;
        if(key.startsWith('MahjongScoreApp_tile_templates_'))keys.push(key);
      }
    }catch(_){}
    return keys;
  }

  function removeObsoleteTemplateKeys(){
    const removed=[];
    for(const key of obsoleteTemplateKeys()){
      try{localStorage.removeItem(key);removed.push(key);}catch(_){}
    }
    return removed;
  }

  function saveLibraryDetailed(lib,{allowCleanup=true,allowBackupEviction=false}={}){
    const labels=libraryLabels(lib);
    const diag={
      ok:false,labels:labels.length,primaryVerified:false,backupSaved:false,metaSaved:false,
      cleanup:[],error:'',firstError:'',backupError:'',metaError:'',jsonChars:0,recovered:false
    };
    let json='';
    try{
      json=JSON.stringify(lib||{});
      diag.jsonChars=json.length;
    }catch(error){
      diag.error='serialize / '+storageErrorCode(error);
      state.storageDiagnostics=diag;
      return diag;
    }

    const tryPrimary=()=>{
      try{
        localStorage.setItem(LIB_KEY,json);
        const verify=loadPrimaryLibrary();
        const present=labels.every(label=>Array.isArray(verify[label])&&verify[label].length);
        if(!labels.length||!present)throw new Error('primary read-back mismatch');
        diag.primaryVerified=true;
        diag.error='';
        return true;
      }catch(error){
        if(!diag.firstError)diag.firstError=storageErrorCode(error);
        diag.error='primary / '+storageErrorCode(error);
        return false;
      }
    };

    if(!tryPrimary()&&allowCleanup){
      diag.cleanup.push(...removeObsoleteTemplateKeys());
      if(diag.cleanup.length&&tryPrimary())diag.recovered=true;
    }
    if(!diag.primaryVerified&&allowBackupEviction){
      try{
        if(localStorage.getItem(LIB_BACKUP_KEY)!=null){
          localStorage.removeItem(LIB_BACKUP_KEY);
          diag.cleanup.push(LIB_BACKUP_KEY);
        }
      }catch(_){}
      if(tryPrimary())diag.recovered=true;
    }
    if(!diag.primaryVerified){
      state.storageDiagnostics=diag;
      return diag;
    }

    try{
      localStorage.setItem(LIB_BACKUP_KEY,json);
      diag.backupSaved=localStorage.getItem(LIB_BACKUP_KEY)===json;
      if(!diag.backupSaved)diag.backupError='backup read-back mismatch';
    }catch(error){diag.backupError=storageErrorCode(error);}

    try{
      localStorage.setItem('MahjongScoreApp_tile_learning_meta1',JSON.stringify({
        schema:'stable1',labels:labels.length,updatedAt:Date.now(),primaryVerified:true,
        backupSaved:diag.backupSaved
      }));
      diag.metaSaved=true;
    }catch(error){diag.metaError=storageErrorCode(error);}

    diag.ok=true;
    state.storageDiagnostics=diag;
    return diag;
  }

  function saveLibrary(lib){
    const result=saveLibraryDetailed(lib);
    return result.ok?result.labels:0;
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
    const a=Math.abs(den)<1e-6?0:(n*sxy-sx*sy)/den;
    const b=(sy-a*sx)/n;
    let sq=0;
    for(const p of points){const d=p.y-(a*p.x+b);sq+=d*d;}
    return {a,b,rmse:Math.sqrt(sq/n),count:n};
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
    // v60: a projective warp is accepted only when all four fitted face edges are
    // supported by enough low-res evidence. Noisy glyph/background edges can jump
    // across the old hard threshold from one capture to the next.
    if(Math.min(l.count,r.count,t.count,bt.count)<4)return null;
    const fitResidual=Math.max(
      l.rmse/Math.max(1,uSpan),r.rmse/Math.max(1,uSpan),
      t.rmse/Math.max(1,vSpan),bt.rmse/Math.max(1,vSpan)
    );
    if(!Number.isFinite(fitResidual)||fitResidual>.055)return null;

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
    // Near-top-down captures often need only rotation normalization. Avoid turning
    // tiny, noisy corner differences into an unnecessary perspective warp.
    const perspectiveNeed=Math.max(tb-1,lr-1,horizontalDelta,verticalDelta,worstCorner);
    if(perspectiveNeed<.045)return null;
    Object.defineProperty(quad,'__m7v60Quality',{value:{fitResidual,perspectiveNeed},enumerable:false});
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



  function estimateBleedSafeShift(source,trimX=.12){
    const w=source?.width|0,h=source?.height|0;
    if(w<24||h<36)return {shiftX:0,side:'none',confidence:0};
    const ctx=source.getContext('2d',{willReadFrequently:true});
    const data=ctx.getImageData(0,0,w,h).data;
    const score=new Float64Array(w);
    const bands=[
      [Math.max(1,Math.floor(h*.06)),Math.min(h-1,Math.ceil(h*.26))],
      [Math.max(1,Math.floor(h*.74)),Math.min(h-1,Math.ceil(h*.94))]
    ];
    for(let x=1;x<w-1;x++){
      let sum=0,n=0;
      for(const [ya,yb] of bands){
        for(let y=ya;y<yb;y++){
          const il=(y*w+x-1)*4,ir=(y*w+x+1)*4;
          const ll=(data[il]*3+data[il+1]*6+data[il+2])/10;
          const lr=(data[ir]*3+data[ir+1]*6+data[ir+2])/10;
          sum+=Math.abs(lr-ll);n++;
        }
      }
      score[x]=n?sum/n:0;
    }
    const vals=Array.from(score.slice(1,w-1)).sort((a,b)=>a-b);
    const q=p=>vals[Math.max(0,Math.min(vals.length-1,Math.floor((vals.length-1)*p)))]||0;
    const median=q(.50),p90=q(.90),p97=q(.97);
    const threshold=median+Math.max(3.5,(p90-median)*.72);
    const search=(lo,hi)=>{
      let bx=-1,bv=-Infinity;
      for(let x=Math.max(2,Math.floor(lo));x<=Math.min(w-3,Math.ceil(hi));x++){
        if(score[x]>bv){bv=score[x];bx=x;}
      }
      return {x:bx,score:bv,strong:bx>=0&&bv>=threshold&&bv>=p97*.72};
    };
    const left=search(w*.06,w*.36),right=search(w*.64,w*.94);
    const base=w*trimX,cropW=w-2*base,maxStart=w-cropW;
    let targetStart=base,side='none',confidence=0;
    if(left.strong&&right.strong){
      const span=right.x-left.x;
      if(span>=w*.56&&span<=w*.90){
        const centered=(left.x+right.x-cropW)/2;
        targetStart=Math.max(0,Math.min(maxStart,centered));
        side='both';
        confidence=Math.min(1,Math.min(left.score,right.score)/Math.max(1,p97));
      }else if(left.score>right.score*1.12){
        targetStart=Math.max(0,Math.min(maxStart,left.x+w*.018));
        side='left';confidence=Math.min(1,left.score/Math.max(1,p97));
      }else if(right.score>left.score*1.12){
        targetStart=Math.max(0,Math.min(maxStart,right.x-w*.018-cropW));
        side='right';confidence=Math.min(1,right.score/Math.max(1,p97));
      }
    }else if(left.strong){
      targetStart=Math.max(0,Math.min(maxStart,left.x+w*.018));
      side='left';confidence=Math.min(1,left.score/Math.max(1,p97));
    }else if(right.strong){
      targetStart=Math.max(0,Math.min(maxStart,right.x-w*.018-cropW));
      side='right';confidence=Math.min(1,right.score/Math.max(1,p97));
    }
    let shiftX=(targetStart-base)/w;
    shiftX=Math.max(-.075,Math.min(.075,shiftX));
    if(Math.abs(shiftX)<.012){shiftX=0;side='none';}
    return {
      shiftX,
      side,
      confidence:Number.isFinite(confidence)?confidence:0,
      leftSeam:left.strong?left.x:null,
      rightSeam:right.strong?right.x:null
    };
  }

  function innerRecognitionCanvas(source,width=96,height=144,trimX=.12,trimY=.08,shiftX=0,shiftY=0){
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    const baseX=Math.max(0,Math.round(source.width*trimX));
    const baseY=Math.max(0,Math.round(source.height*trimY));
    const sw=Math.max(1,source.width-baseX*2),sh=Math.max(1,source.height-baseY*2);
    const maxX=Math.max(0,source.width-sw),maxY=Math.max(0,source.height-sh);
    const sx=Math.max(0,Math.min(maxX,Math.round(baseX+source.width*shiftX)));
    const sy=Math.max(0,Math.min(maxY,Math.round(baseY+source.height*shiftY)));
    o.drawImage(source,sx,sy,sw,sh,0,0,width,height);
    return out;
  }

  function safeInsetWindow(source,trimX=.12,bleedInfo=null,extra=0,bias=0){
    const w=Math.max(1,source?.width||1);
    const safe=bleedInfo||estimateBleedSafeShift(source,trimX);
    let left=trimX+extra+bias;
    let right=1-trimX-extra+bias;
    const margin=.024;
    const leftSeam=Number.isFinite(safe.leftSeam)?safe.leftSeam/w:null;
    const rightSeam=Number.isFinite(safe.rightSeam)?safe.rightSeam/w:null;

    // v72: do not move a fixed-width window toward the clean side. When a
    // neighboring-tile seam is visible, remove that contaminated side and
    // rescale the remaining center. This directly discards bleed instead of
    // carrying it along inside a shifted window.
    if(leftSeam!==null)left=Math.max(left,leftSeam+margin);
    if(rightSeam!==null)right=Math.min(right,rightSeam-margin);

    left=Math.max(.07,Math.min(.30,left));
    right=Math.max(.70,Math.min(.93,right));
    if(right-left<.54){
      const mid=Math.max(.35,Math.min(.65,(left+right)/2));
      left=Math.max(.07,mid-.27);
      right=Math.min(.93,mid+.27);
    }
    const applied=Math.abs(left-trimX)>.012||Math.abs(right-(1-trimX))>.012;
    return {left,right,applied,leftSeam,rightSeam,side:safe.side||'none',confidence:Number(safe.confidence)||0};
  }

  function innerRecognitionWindowCanvas(source,width=96,height=144,left=.12,right=.88,trimY=.08){
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    const sx=Math.max(0,Math.min(source.width-1,Math.round(source.width*left)));
    const ex=Math.max(sx+1,Math.min(source.width,Math.round(source.width*right)));
    const sy=Math.max(0,Math.round(source.height*trimY));
    const ey=Math.max(sy+1,Math.min(source.height,source.height-sy));
    o.drawImage(source,sx,sy,Math.max(1,ex-sx),Math.max(1,ey-sy),0,0,width,height);
    return out;
  }

  function innerFeatureFromCanonical(source){
    return descriptorFromCanvas(innerRecognitionCanvas(source,96,144));
  }

  function chooseRecognitionWindow(source,index=1,count=14,bleedInfo=null){
    const base={left:.12,right:.88,trimY:.08,reason:'base'};
    const candidates=[base];
    const seen=new Set(['.120:.880']);
    const canTrimLeft=index>0;
    const canTrimRight=index<count-1;
    const add=(left,right,reason)=>{
      left=Math.max(.08,Math.min(.30,left));
      right=Math.max(.70,Math.min(.92,right));
      if(right-left<.54)return;
      const key=`${left.toFixed(3)}:${right.toFixed(3)}`;if(seen.has(key))return;
      seen.add(key);candidates.push({left,right,trimY:.08,reason});
    };
    for(const extra of [.02,.04,.06]){
      if(canTrimLeft)add(.12+extra,.88,`left-${Math.round(extra*100)}`);
      if(canTrimRight)add(.12,.88-extra,`right-${Math.round(extra*100)}`);
    }
    if(canTrimLeft&&canTrimRight){
      add(.14,.86,'both-2');
      add(.16,.84,'both-4');
    }

    const safe=bleedInfo||estimateBleedSafeShift(source,.12);
    const seam=safeInsetWindow(source,.12,safe,0,0);
    let seamLeft=canTrimLeft?seam.left:.12;
    let seamRight=canTrimRight?seam.right:.88;
    if(seam.applied)add(seamLeft,seamRight,'seam-safe');

    const evaluate=win=>{
      const canvas=innerRecognitionWindowCanvas(source,96,144,win.left,win.right,win.trimY);
      return {win,canvas,quality:canvasCropQuality(canvas)};
    };
    const baseEval=evaluate(base);
    let best=baseEval;
    for(const win of candidates.slice(1)){
      const cand=evaluate(win),bq=baseEval.quality,q=cand.quality;
      const fixesBroken=bq.broken&&!q.broken&&q.score>=bq.score-.015;
      const bleedBetter=(q.edgeContamination||0)<=(bq.edgeContamination||0)-.10&&q.score>=bq.score-.015&&!q.broken;
      const scoreBetter=q.score>=bq.score+.018&&!q.broken&&(q.edgeContamination||0)<=(bq.edgeContamination||0)+.02;
      if(!(fixesBroken||bleedBetter||scoreBetter))continue;
      const rank=q.score-(q.edgeContamination||0)*.08-(q.broken?.25:0);
      const bestRank=best.quality.score-(best.quality.edgeContamination||0)*.08-(best.quality.broken?.25:0);
      if(best===baseEval||rank>bestRank+.004)best=cand;
    }
    const used=best!==baseEval;
    return {
      window:best.win,canvas:best.canvas,quality:best.quality,beforeQuality:baseEval.quality,
      used,fallback:candidates.length>1&&!used,reason:best.win.reason,
      trimLeft:Math.max(0,best.win.left-.12),trimRight:Math.max(0,.88-best.win.right),
      candidateCount:candidates.length
    };
  }

  function inferenceFeatureViews(source,selectedWindow=null){
    const base=selectedWindow||{left:.12,right:.88,trimY:.08};
    const width=base.right-base.left;
    const inset=Math.min(.015,Math.max(0,(width-.56)/4));
    const windows=[
      {left:base.left,right:base.right,trimY:.08},
      {left:base.left,right:base.right,trimY:.06},
      {left:base.left,right:base.right,trimY:.10},
      {left:base.left+inset,right:base.right,trimY:.08},
      {left:base.left,right:base.right-inset,trimY:.08}
    ];
    return windows.map(v=>descriptorFromCanvas(innerRecognitionWindowCanvas(source,96,144,v.left,v.right,v.trimY)));
  }

  function analyzeTileBox(ctx,b,index=1,count=14){
    const canonical=perspectiveFaceCanvas(ctx,b,96,144);
    const bleedInfo=estimateBleedSafeShift(canonical,.12);
    const chosen=chooseRecognitionWindow(canonical,index,count,bleedInfo);
    const recognition=chosen.canvas;
    const quality=chosen.quality;
    const trainingImage=canonical.toDataURL('image/jpeg',.92);
    return {
      feature:descriptorFromCanvas(recognition),
      inferenceFeatures:inferenceFeatureViews(canonical,chosen.window),
      crop:recognition.toDataURL('image/jpeg',.92),
      trainingImage,
      quality,
      qualityBefore:chosen.beforeQuality,
      cropBroken:quality.broken===true,
      qualityFallback:chosen.fallback===true,
      bleedShift:Number(bleedInfo.shiftX)||0,
      bleedSide:bleedInfo.side||'none',
      bleedConfidence:Number(bleedInfo.confidence)||0,
      bleedInsetApplied:chosen.used===true,
      bleedTrimLeft:Number(chosen.trimLeft)||0,
      bleedTrimRight:Number(chosen.trimRight)||0,
      cropTrimReason:chosen.reason||'base',
      cropCandidateCount:chosen.candidateCount||1,
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
      state.runtimeLibrary=existing;
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
        state.runtimeLibrary=lib;
        state.librarySource='raw';
        saveLibrary(lib);
        return lib;
      }
    }
    const legacy=loadLegacyLibrary();
    if(Object.keys(legacy).length){
      state.runtimeLibrary=legacy;
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

  function confidenceAssessment(ranked){
    if(!Array.isArray(ranked)||!ranked.length)return {candidate:null,reason:'no-candidate'};
    const best=ranked[0],second=ranked.find(x=>x.label!==best.label);
    if(!best||!Number.isFinite(best.distance))return {candidate:null,reason:'invalid-distance'};
    if(best.bestFamily&&best.family&&best.bestFamily!==best.family&&Number(best.familyGap)>.020){
      return {candidate:null,reason:'family-conflict'};
    }

    const viewCount=Number(best.viewCount)||1;
    const viewTopVotes=Number(best.viewTopVotes)||viewCount;
    if(viewCount>=3&&viewTopVotes<Math.ceil(viewCount/2))return {candidate:null,reason:'view-disagreement'};
    const bestRaw=Number.isFinite(best.bestDistance)?best.bestDistance:best.distance;
    const representativeDistance=Number.isFinite(best.representativeDistance)?best.representativeDistance:
      (Number.isFinite(best.globalDistance)?best.globalDistance:best.distance);
    const consensusDistance=Number.isFinite(best.templateConsensusDistance)?best.templateConsensusDistance:bestRaw;
    const structuralRepresentativeDistance=Number.isFinite(best.structuralRepresentativeDistance)?best.structuralRepresentativeDistance:Infinity;
    const structuralConsensusDistance=Number.isFinite(best.structuralConsensusDistance)?best.structuralConsensusDistance:Infinity;
    const directMultiSupport=(Number(best.sampleCount)||0)>=2&&consensusDistance<=.115&&bestRaw<=.100;
    const shapeMultiSupport=(Number(best.sampleCount)||0)>=2&&structuralConsensusDistance<=.095&&structuralRepresentativeDistance<=.115;
    // v64 lets coarse shape evidence rescue harmless pixel-level shifts, but only
    // when multiple learned examples agree. A single close template still cannot
    // bypass the conservative confidence gate.
    if(representativeDistance>.150&&!directMultiSupport&&!shapeMultiSupport)return {candidate:null,reason:'representative-distance'};
    if(consensusDistance>.145&&structuralConsensusDistance>.105)return {candidate:null,reason:'template-consensus'};
    if(bestRaw>.135&&structuralRepresentativeDistance>.115)return {candidate:null,reason:'template-distance'};

    const spread=Math.max(0,Number.isFinite(best.templateSpread)?best.templateSpread:0);
    const sameFamily=ranked.find(x=>x.label!==best.label&&x.family===best.family&&Number.isFinite(x.distance));
    const localRunner=sameFamily||second;
    if(!localRunner||!Number.isFinite(localRunner.distance)){
      const candidate=best.distance<=.105&&bestRaw<=.09&&spread<=.055?best:null;
      return {candidate,reason:candidate?'accepted':'single-class-quality'};
    }

    const runnerSpread=Math.max(0,Number.isFinite(localRunner.templateSpread)?localRunner.templateSpread:0);
    const localGap=localRunner.distance-best.distance;
    const localRatio=localRunner.distance>0?best.distance/localRunner.distance:1;
    const requiredLocalGap=Math.max(.010,Math.min(.026,.008+spread*.55+runnerSpread*.25));
    if(localGap<requiredLocalGap||localRatio>.84)return {candidate:null,reason:'same-family-margin'};

    if(second&&Number.isFinite(second.distance)){
      const globalGap=second.distance-best.distance;
      const globalRatio=second.distance>0?best.distance/second.distance:1;
      if(globalGap<.010||globalRatio>.86)return {candidate:null,reason:'global-margin'};
    }
    if(Number.isFinite(best.sameFamilyGap)&&best.sameFamilyGap<requiredLocalGap){
      return {candidate:null,reason:'same-family-margin'};
    }
    if(Number.isFinite(best.sameFamilyRatio)&&best.sameFamilyRatio>.84){
      return {candidate:null,reason:'same-family-margin'};
    }
    return {candidate:best,reason:'accepted'};
  }

  function confidentCandidate(ranked){
    return confidenceAssessment(ranked).candidate;
  }

  function confidenceReasonSummary(){
    const counts={};
    for(const reason of state.confidenceReasons||[]){
      if(!reason||reason==='accepted')continue;
      counts[reason]=(counts[reason]||0)+1;
    }
    const labels={
      'view-disagreement':'視点不一致',
      'representative-distance':'代表距離',
      'template-consensus':'実例合意',
      'template-distance':'実例距離',
      'same-family-margin':'同系差',
      'global-margin':'全体差',
      'family-conflict':'family競合',
      'single-class-quality':'単独品質',
      'no-candidate':'候補なし',
      'invalid-distance':'距離不正',
      'label-limit':'枚数制限',
      'crop-broken':'crop異常'
    };
    const parts=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${labels[k]||k}${v}`);
    return parts.length?parts.join('・'):'なし';
  }

  function predict(features,inferenceViews=[],brokenFlags=[]){
    const lib=activeLibrary(),used={},debug=[],reasons=[];
    const now=()=>((typeof performance!=='undefined'&&performance.now)?performance.now():Date.now());
    const started=now();
    const TOTAL_BUDGET_MS=7500;
    let auxViewsUsed=0,auxFallbackCount=0,microRefined=0;
    state.learnedLabelCount=Object.keys(lib).filter(label=>Array.isArray(lib[label])&&lib[label].length).length;
    const labels=features.map((feature,index)=>{
      if(brokenFlags[index]){debug[index]=[];reasons[index]='crop-broken';return '';}
      const views=Array.isArray(inferenceViews[index])&&inferenceViews[index].length?inferenceViews[index]:[feature];
      const rankings=[];
      for(const view of views){
        if(rankings.length>0&&now()-started>TOTAL_BUDGET_MS){auxFallbackCount++;break;}
        rankings.push(core.rankLabelsFastDiscriminative(view,lib,{labelBlend:.72,templateBlend:.38,shapeBlend:.60}));
        if(rankings.length>1)auxViewsUsed++;
      }
      if(!rankings.length){
        rankings.push(core.rankLabelsFastDiscriminative(feature,lib,{labelBlend:.72,templateBlend:.38,shapeBlend:.60}));
      }
      let ranked=core.combineViewRankings(rankings);

      // v70: v69 is fast (~2.3s) but loses three tiles versus v65. Reintroduce
      // only the cheapest useful part of the old transform search: integer
      // +/-1px alignment on the current Top4 candidates. Run it once on the
      // standard crop, not for every label/view.
      if(ranked.length&&now()-started<TOTAL_BUDGET_MS){
        const candidateLabels=ranked.slice(0,4).map(x=>x.label);
        const refined=core.rankCandidateLabelsMicroShift(views[0]||feature,lib,candidateLabels,{});
        if(refined.length){
          ranked=core.mergeCandidateRefinement(ranked,refined,.72);
          microRefined++;
        }
      }

      debug[index]=ranked.slice(0,3).map(x=>({
        label:x.label,
        family:x.family||core.tileFamily(x.label),
        distance:Number(x.distance.toFixed(4)),
        representativeDistance:Number.isFinite(x.representativeDistance)?Number(x.representativeDistance.toFixed(4)):null,
        templateConsensusDistance:Number.isFinite(x.templateConsensusDistance)?Number(x.templateConsensusDistance.toFixed(4)):null,
        structuralRepresentativeDistance:Number.isFinite(x.structuralRepresentativeDistance)?Number(x.structuralRepresentativeDistance.toFixed(4)):null,
        structuralConsensusDistance:Number.isFinite(x.structuralConsensusDistance)?Number(x.structuralConsensusDistance.toFixed(4)):null,
        structuralScore:Number.isFinite(x.structuralScore)?Number(x.structuralScore.toFixed(4)):null,
        sampleCount:Number(x.sampleCount)||0,
        discriminativeDistance:Number.isFinite(x.discriminativeDistance)?Number(x.discriminativeDistance.toFixed(4)):null,
        labelWeightedDistance:Number.isFinite(x.labelWeightedDistance)?Number(x.labelWeightedDistance.toFixed(4)):null,
        familyWeightedDistance:Number.isFinite(x.familyWeightedDistance)?Number(x.familyWeightedDistance.toFixed(4)):null,
        sameFamilyGap:Number.isFinite(x.sameFamilyGap)?Number(x.sameFamilyGap.toFixed(4)):null,
        sameFamilyRatio:Number.isFinite(x.sameFamilyRatio)?Number(x.sameFamilyRatio.toFixed(4)):null,
        viewTopVotes:Number(x.viewTopVotes)||0,
        viewCount:Number(x.viewCount)||rankings.length,
        viewDistanceRange:Number.isFinite(x.viewDistanceRange)?Number(x.viewDistanceRange.toFixed(4)):null,
        fastConsensusDistance:Number.isFinite(x.fastConsensusDistance)?Number(x.fastConsensusDistance.toFixed(4)):null,
        microShiftDistance:Number.isFinite(x.microShiftDistance)?Number(x.microShiftDistance.toFixed(4)):null
      }));
      const available=ranked.filter(x=>(used[x.label]||0)<4);
      if(!available.length){reasons[index]='label-limit';return '';}
      const assessment=confidenceAssessment(available);
      reasons[index]=assessment.reason;
      const accepted=assessment.candidate;
      if(!accepted)return '';
      used[accepted.label]=(used[accepted.label]||0)+1;
      return accepted.label;
    });
    state.predictionDebug=debug;
    state.confidenceReasons=reasons;
    state.lastAuxViewsUsed=auxViewsUsed;
    state.lastAuxFallbackCount=auxFallbackCount;
    state.lastMicroRefined=microRefined;
    const ended=now();
    state.lastRecognitionMs=Math.max(0,Math.round(ended-started));
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

  function boxCropQuality(ctx,b){
    if(!ctx||!b)return {score:0,broken:true,tileRatio:0,centerRatio:0,sideMin:0,woodRatio:1,edgeContamination:1};
    const cw=ctx.canvas.width|0,ch=ctx.canvas.height|0;
    const x0=Math.max(0,Math.floor(b.x)),y0=Math.max(0,Math.floor(b.y));
    const x1=Math.min(cw,Math.ceil(b.x+b.w)),y1=Math.min(ch,Math.ceil(b.y+b.h));
    const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);
    if(w<4||h<8)return {score:0,broken:true,tileRatio:0,centerRatio:0,sideMin:0,woodRatio:1,edgeContamination:1};
    const data=ctx.getImageData(x0,y0,w,h).data;
    const step=Math.max(1,Math.floor(Math.min(w,h)/42));
    let total=0,tile=0,wood=0,centerN=0,centerTile=0,leftN=0,leftTile=0,rightN=0,rightTile=0;
    let edgeLeftN=0,edgeLeftWood=0,edgeLeftDark=0,edgeRightN=0,edgeRightWood=0,edgeRightDark=0;
    for(let y=Math.floor(h*.08);y<h*.92;y+=step){
      for(let x=0;x<w;x+=step){
        const i=(y*w+x)*4,r=data[i],g=data[i+1],bl=data[i+2];
        const max=Math.max(r,g,bl),min=Math.min(r,g,bl),lum=(r*3+g*6+bl)/10;
        const neutral=(max-min)/(lum+1);
        const tileLike=lum>=70&&neutral<=.46;
        const woodLike=r>=g+8&&g>=bl+5&&r>=bl+17&&neutral>.16;
        const darkLike=lum<48;
        total++;if(tileLike)tile++;if(woodLike)wood++;
        const xf=x/Math.max(1,w-1);
        if(xf>=.20&&xf<=.80){centerN++;if(tileLike)centerTile++;}
        if(xf<=.28){leftN++;if(tileLike)leftTile++;}
        if(xf>=.72){rightN++;if(tileLike)rightTile++;}
        if(xf<=.16){edgeLeftN++;if(woodLike)edgeLeftWood++;if(darkLike)edgeLeftDark++;}
        if(xf>=.84){edgeRightN++;if(woodLike)edgeRightWood++;if(darkLike)edgeRightDark++;}
      }
    }
    const tileRatio=total?tile/total:0,woodRatio=total?wood/total:1;
    const centerRatio=centerN?centerTile/centerN:0,leftRatio=leftN?leftTile/leftN:0,rightRatio=rightN?rightTile/rightN:0;
    const sideMin=Math.min(leftRatio,rightRatio),sideMean=(leftRatio+rightRatio)/2;
    const leftEdgeWood=edgeLeftN?edgeLeftWood/edgeLeftN:0,rightEdgeWood=edgeRightN?edgeRightWood/edgeRightN:0;
    const leftEdgeDark=edgeLeftN?edgeLeftDark/edgeLeftN:0,rightEdgeDark=edgeRightN?edgeRightDark/edgeRightN:0;

    // v75: score vertical seam evidence only in thin top/bottom bands where tile
    // glyphs are rare. A strong internal seam near a side is a better neighbor-
    // bleed signal than dark ink in the center.
    const seamStrength=(lo,hi)=>{
      let best=0;
      const ya1=Math.max(1,Math.floor(h*.06)),yb1=Math.min(h-1,Math.ceil(h*.24));
      const ya2=Math.max(1,Math.floor(h*.76)),yb2=Math.min(h-1,Math.ceil(h*.94));
      for(let x=Math.max(2,Math.floor(lo));x<=Math.min(w-3,Math.ceil(hi));x++){
        let sum=0,n=0;
        for(const [ya,yb] of [[ya1,yb1],[ya2,yb2]]){
          for(let y=ya;y<yb;y++){
            const il=(y*w+x-1)*4,ir=(y*w+x+1)*4;
            const ll=(data[il]*3+data[il+1]*6+data[il+2])/10;
            const lr=(data[ir]*3+data[ir+1]*6+data[ir+2])/10;
            sum+=Math.abs(lr-ll);n++;
          }
        }
        if(n)best=Math.max(best,sum/n);
      }
      return Math.max(0,Math.min(1,best/46));
    };
    // Ignore the extreme outer 10%: a legitimate tile-face/table edge lives there.
    // Neighbor bleed is an *internal* seam that remains after the normal inner crop.
    const leftSeam=seamStrength(w*.10,w*.28),rightSeam=seamStrength(w*.72,w*.90);
    const leftContamination=Math.max(leftEdgeWood*.88+leftEdgeDark*.12,leftSeam*.74+leftEdgeWood*.26);
    const rightContamination=Math.max(rightEdgeWood*.88+rightEdgeDark*.12,rightSeam*.74+rightEdgeWood*.26);
    const edgeContamination=Math.max(leftContamination,rightContamination);

    let score=centerRatio*.41+sideMin*.20+sideMean*.11+tileRatio*.28-woodRatio*.22-edgeContamination*.20;
    score=Math.max(0,Math.min(1,score));
    const broken=centerRatio<.28||tileRatio<.24||sideMin<.08||woodRatio>.58||edgeContamination>.78;
    return {
      score,broken,tileRatio,centerRatio,sideMin,leftRatio,rightRatio,woodRatio,
      edgeContamination,leftContamination,rightContamination,leftEdgeWood,rightEdgeWood,leftSeam,rightSeam
    };
  }

  function canvasCropQuality(canvas){
    if(!canvas)return {score:0,broken:true,tileRatio:0,centerRatio:0,sideMin:0,woodRatio:1};
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    return boxCropQuality(ctx,{x:0,y:0,w:canvas.width,h:canvas.height});
  }

  function rowCropQuality(ctx,row,count=14){
    const boxes=splitRow(row,count);
    const qualities=boxes.map(b=>boxCropQuality(ctx,b));
    const scores=qualities.map(q=>q.score).sort((a,b)=>a-b);
    const mean=qualities.reduce((s,q)=>s+q.score,0)/Math.max(1,qualities.length);
    const median=scores[Math.floor(scores.length/2)]||0;
    const lower=scores[Math.floor(scores.length*.20)]||0;
    const endMean=qualities.length?((qualities[0]?.score||0)+(qualities[qualities.length-1]?.score||0))/2:0;
    const brokenCount=qualities.filter(q=>q.broken).length;
    const edgeMean=qualities.reduce((s,q)=>s+(q.edgeContamination||0),0)/Math.max(1,qualities.length);
    const edgeHighCount=qualities.filter(q=>(q.edgeContamination||0)>.58).length;
    const score=mean*.40+median*.22+lower*.18+endMean*.16-brokenCount*.045-edgeMean*.06-edgeHighCount*.012;
    return {score,mean,median,lower,endMean,brokenCount,edgeMean,edgeHighCount,qualities,boxes};
  }

  function selectRowByCropQuality(ctx,row,outerFit=null,gridFit=null,count=14){
    if(!ctx||!row)return {row,used:false,reason:'invalid',base:null,best:null,startDeltaPitch:0,pitchScale:1};
    const candidates=[],seen=new Set();
    const nominalPitch=row.w/count;
    const add=(candidate,reason)=>{
      if(!candidate||!Number.isFinite(candidate.x)||!Number.isFinite(candidate.w)||candidate.w<=0)return;
      const key=`${Math.round(candidate.x*10)}:${Math.round(candidate.w*10)}`;
      if(seen.has(key))return;seen.add(key);
      candidates.push({row:candidate,reason,quality:rowCropQuality(ctx,candidate,count)});
    };
    add(row,'base');
    if(outerFit?.used&&outerFit.row)add(outerFit.row,'outer-edge');

    // v75: v61's periodic grid is never trusted directly. It is only one
    // low-freedom candidate when both phase and pitch stay very close to the
    // located row, and crop quality still has veto power.
    if(gridFit?.used&&gridFit.row&&Math.abs(gridFit.offsetPitch||0)<=.10&&Math.abs((gridFit.pitchScale||1)-1)<=.015){
      add(gridFit.row,'periodic-candidate');
    }

    // Search only start + common pitch. Internal 13 boundaries never move
    // independently, avoiding the v37 seam-chasing failure.
    for(const startDelta of [-.10,-.05,.05,.10]){
      add({...row,x:row.x+nominalPitch*startDelta},'start-candidate');
    }
    for(const scale of [.988,.994,1.006,1.012]){
      add({...row,w:row.w*scale},'pitch-candidate');
    }
    for(const startDelta of [-.06,.06]){
      for(const scale of [.994,1.006]){
        add({...row,x:row.x+nominalPitch*startDelta,w:row.w*scale},'start-pitch-candidate');
      }
    }

    const base=candidates[0];
    let best=base;
    for(const cand of candidates.slice(1)){
      const bq=base.quality,cq=cand.quality;
      const fewerBroken=cq.brokenCount<bq.brokenCount&&cq.score>=bq.score-.010&&cq.edgeHighCount<=bq.edgeHighCount+1;
      const lessBleed=cq.edgeHighCount<bq.edgeHighCount&&cq.score>=bq.score-.010&&cq.brokenCount<=bq.brokenCount;
      const scoreBetter=cq.score>=bq.score+.020&&cq.brokenCount<=bq.brokenCount&&cq.edgeMean<=bq.edgeMean+.025;
      if(!(fewerBroken||lessBleed||scoreBetter))continue;
      const current=best.quality;
      const candRank=cq.score-cq.brokenCount*.06-cq.edgeHighCount*.018-cq.edgeMean*.04;
      const bestRank=current.score-current.brokenCount*.06-current.edgeHighCount*.018-current.edgeMean*.04;
      if(best===base||candRank>bestRank+.004)best=cand;
    }
    const used=best!==base;
    const pitch=best.row.w/count;
    return {
      row:best.row,used,reason:best.reason,
      base:base.quality,best:best.quality,
      scoreGain:best.quality.score-base.quality.score,
      brokenBefore:base.quality.brokenCount,brokenAfter:best.quality.brokenCount,
      edgeHighBefore:base.quality.edgeHighCount,edgeHighAfter:best.quality.edgeHighCount,
      startDeltaPitch:(best.row.x-row.x)/Math.max(1,nominalPitch),
      pitchScale:pitch/Math.max(1,nominalPitch)
    };
  }

  function rescueBrokenBox(ctx,b){
    const base=boxCropQuality(ctx,b);
    if(!base.broken&&base.score>=.42&&(base.edgeContamination||0)<.56)return {box:b,used:false,quality:base,before:base};
    let best={box:b,quality:base};
    for(const frac of [-.06,-.04,-.02,.02,.04,.06]){
      const maxX=Math.max(0,(ctx.canvas.width||0)-b.w);
      const candidate={...b,x:Math.max(0,Math.min(maxX,b.x+b.w*frac))};
      const q=boxCropQuality(ctx,candidate);
      const clearlyBetter=!q.broken&&base.broken&&q.score>=base.score-.01;
      const bleedBetter=(q.edgeContamination||0)<(base.edgeContamination||0)-.10&&q.score>=base.score-.012;
      const scoreBetter=q.score>=best.quality.score+.035;
      if(clearlyBetter||bleedBetter||scoreBetter)best={box:candidate,quality:q};
    }
    return {box:best.box,used:best.box!==b,quality:best.quality,before:base};
  }

  function tripletCropQuality(ctx,boxes,index){
    const ids=[index-1,index,index+1].filter(i=>i>=0&&i<boxes.length);
    const qualities=ids.map(i=>boxCropQuality(ctx,boxes[i]));
    return {
      score:qualities.reduce((s,q)=>s+q.score,0)/Math.max(1,qualities.length),
      brokenCount:qualities.filter(q=>q.broken).length,
      edgeMean:qualities.reduce((s,q)=>s+(q.edgeContamination||0),0)/Math.max(1,qualities.length),
      qualities
    };
  }

  function applyLocalBoundaryDelta(boxes,index,leftDelta=0,rightDelta=0){
    const out=boxes.map(b=>({...b}));
    const target=out[index];if(!target)return null;
    const minW=Math.max(4,target.w*.72);
    if(index===0)leftDelta=0;
    if(index===out.length-1)rightDelta=0;
    if(index>0){
      out[index-1].w+=leftDelta;
      target.x+=leftDelta;
      target.w-=leftDelta;
    }
    if(index<out.length-1){
      target.w+=rightDelta;
      out[index+1].x+=rightDelta;
      out[index+1].w-=rightDelta;
    }
    if(target.w<minW)return null;
    if(index>0&&out[index-1].w<minW)return null;
    if(index<out.length-1&&out[index+1].w<minW)return null;
    return out;
  }

  function rescueLocalBoundaries(ctx,boxes){
    let current=boxes.map(b=>({...b}));
    const debug=Array.from({length:boxes.length},()=>({used:false,leftPx:0,rightPx:0,beforeScore:null,afterScore:null}));
    let adoptedCount=0;
    for(let i=0;i<current.length;i++){
      const q=boxCropQuality(ctx,current[i]);
      const suspect=q.broken||q.score<.40||(q.edgeContamination||0)>.52;
      if(!suspect)continue;
      const pitch=current[i].w;
      const baseTriplet=tripletCropQuality(ctx,current,i);
      let bestBoxes=current,bestTriplet=baseTriplet,bestLeft=0,bestRight=0;
      const fractions=[-.06,-.04,-.02,.02,.04,.06];
      const candidates=[];
      if(i>0)for(const f of fractions)candidates.push([pitch*f,0]);
      if(i<current.length-1)for(const f of fractions)candidates.push([0,pitch*f]);
      for(const [dl,dr] of candidates){
        const next=applyLocalBoundaryDelta(current,i,dl,dr);if(!next)continue;
        const tq=tripletCropQuality(ctx,next,i);
        const fewerBroken=tq.brokenCount<baseTriplet.brokenCount&&tq.score>=baseTriplet.score-.010;
        const lessBleed=tq.edgeMean<=baseTriplet.edgeMean-.075&&tq.score>=baseTriplet.score-.012&&tq.brokenCount<=baseTriplet.brokenCount;
        const scoreBetter=tq.score>=baseTriplet.score+.030&&tq.brokenCount<=baseTriplet.brokenCount&&tq.edgeMean<=baseTriplet.edgeMean+.015;
        if(!(fewerBroken||lessBleed||scoreBetter))continue;
        const rank=tq.score-tq.brokenCount*.07-tq.edgeMean*.05;
        const bestRank=bestTriplet.score-bestTriplet.brokenCount*.07-bestTriplet.edgeMean*.05;
        if(bestBoxes===current||rank>bestRank+.004){
          bestBoxes=next;bestTriplet=tq;bestLeft=dl;bestRight=dr;
        }
      }
      if(bestBoxes!==current){
        debug[i]={used:true,leftPx:bestLeft,rightPx:bestRight,beforeScore:baseTriplet.score,afterScore:bestTriplet.score,
          beforeBroken:baseTriplet.brokenCount,afterBroken:bestTriplet.brokenCount,beforeEdge:baseTriplet.edgeMean,afterEdge:bestTriplet.edgeMean};
        current=bestBoxes;adoptedCount++;
      }
    }
    return {boxes:current,adoptedCount,debug};
  }


  function refineRowOuterEdges(ctx,row,count=14){
    if(!ctx||!row||!Number.isFinite(row.x)||!Number.isFinite(row.w)||row.w<=0||count<2){
      return {row,used:false,reason:'invalid'};
    }
    const cw=ctx.canvas.width|0,ch=ctx.canvas.height|0;
    const pitch=row.w/count;
    if(cw<40||ch<20||pitch<6)return {row,used:false,reason:'small'};
    const y0=Math.max(0,Math.floor(row.y)),y1=Math.min(ch,Math.ceil(row.y+row.h));
    const h=Math.max(1,y1-y0);
    const scanX0=Math.max(0,Math.floor(row.x-pitch*.40));
    const scanX1=Math.min(cw-1,Math.ceil(row.x+row.w+pitch*.40));
    if(scanX1-scanX0<count*5||h<12)return {row,used:false,reason:'range'};

    const data=ctx.getImageData(0,0,cw,ch).data;
    const raw=new Float64Array(cw);
    // v73 only looks at thin top/bottom bands where mahjong glyphs are rare.
    // This estimates the outer white-tile span without chasing repeated symbols.
    const bands=[
      [Math.max(y0+1,Math.floor(y0+h*.05)),Math.min(y1-1,Math.ceil(y0+h*.18))],
      [Math.max(y0+1,Math.floor(y0+h*.82)),Math.min(y1-1,Math.ceil(y0+h*.95))]
    ];
    for(let x=scanX0;x<=scanX1;x++){
      let tile=0,n=0;
      for(const [ya,yb] of bands){
        for(let y=ya;y<yb;y++){
          const i=(y*cw+x)*4,r=data[i],g=data[i+1],b=data[i+2];
          const max=Math.max(r,g,b),min=Math.min(r,g,b),lum=(r*3+g*6+b)/10;
          const neutral=(max-min)/(lum+1);
          if(lum>=72&&neutral<=.48)tile++;
          n++;
        }
      }
      raw[x]=n?tile/n:0;
    }
    const sm=smooth(raw,Math.max(1,Math.round(pitch*.045)));
    const threshold=.43;
    const gapLimit=Math.max(2,Math.round(pitch*.16));
    let best=null,start=-1,last=-1,gap=0,scoreSum=0,scoreN=0;
    const finish=()=>{
      if(start<0||last<start){start=-1;last=-1;gap=0;scoreSum=0;scoreN=0;return;}
      const width=last-start+1;
      const overlap=Math.max(0,Math.min(last,row.x+row.w)-Math.max(start,row.x));
      const overlapRatio=width?overlap/width:0;
      const scale=width/row.w;
      const mean=scoreN?scoreSum/scoreN:0;
      if(overlapRatio>.80&&scale>=.90&&scale<=1.05){
        const candidate={start,last,width,mean,overlapRatio,scale};
        if(!best||candidate.width>best.width||(candidate.width===best.width&&candidate.mean>best.mean))best=candidate;
      }
      start=-1;last=-1;gap=0;scoreSum=0;scoreN=0;
    };
    for(let x=scanX0;x<=scanX1;x++){
      const v=sm[x]||0;
      if(v>=threshold){
        if(start<0)start=x;
        last=x;gap=0;scoreSum+=v;scoreN++;
      }else if(start>=0){
        gap++;
        if(gap<=gapLimit){scoreSum+=v;scoreN++;}
        else finish();
      }
    }
    finish();
    if(!best)return {row,used:false,reason:'no-outer-span'};

    const pad=Math.max(1,pitch*.025);
    let left=Math.max(0,best.start-pad);
    let right=Math.min(cw,best.last+1+pad);
    const width=right-left;
    const scale=width/row.w;
    // Keep this correction deliberately low freedom: only outer endpoints move,
    // and reject large changes that could represent a different bright object.
    if(scale<.925||scale>1.025){
      return {row,used:false,reason:'outer-scale-guard',candidateScale:scale,mean:best.mean};
    }
    const refined={...row,x:left,w:width};
    const oldPitch=row.w/count,newPitch=width/count;
    const leftMove=(left-row.x)/oldPitch;
    const rightMove=(right-(row.x+row.w))/oldPitch;
    const meaningful=Math.abs(leftMove)>=.035||Math.abs(rightMove)>=.035||Math.abs(newPitch/oldPitch-1)>=.004;
    if(!meaningful)return {row,used:false,reason:'outer-no-change',candidateScale:scale,mean:best.mean};
    return {
      row:refined,used:true,reason:'outer-edge-span',
      leftMovePitch:leftMove,rightMovePitch:rightMove,
      pitchScale:newPitch/oldPitch,meanSupport:best.mean
    };
  }


  function fitGlobalRowGrid(ctx,row,count=14){
    if(!ctx||!row||!Number.isFinite(row.x)||!Number.isFinite(row.w)||row.w<=0||count<2){
      return {row,used:false,reason:'invalid'};
    }
    const cw=ctx.canvas.width|0,ch=ctx.canvas.height|0;
    const nominalPitch=row.w/count;
    if(cw<40||ch<20||nominalPitch<6)return {row,used:false,reason:'small'};
    const y0=Math.max(0,Math.floor(row.y)),y1=Math.min(ch,Math.ceil(row.y+row.h));
    const h=Math.max(1,y1-y0);
    const scanX0=Math.max(1,Math.floor(row.x-nominalPitch*.40));
    const scanX1=Math.min(cw-2,Math.ceil(row.x+row.w+nominalPitch*.40));
    if(scanX1-scanX0<count*5||h<10)return {row,used:false,reason:'range'};
    const data=ctx.getImageData(0,0,cw,ch).data;
    const evidence=new Float64Array(cw);
    const bands=[
      [Math.max(y0+1,Math.floor(y0+h*.08)),Math.min(y1-1,Math.ceil(y0+h*.30))],
      [Math.max(y0+1,Math.floor(y0+h*.70)),Math.min(y1-1,Math.ceil(y0+h*.92))]
    ];
    for(let x=scanX0;x<=scanX1;x++){
      let sum=0,n=0;
      for(const [ya,yb] of bands){
        for(let y=ya;y<yb;y++){
          const il=(y*cw+x-1)*4,ir=(y*cw+x+1)*4;
          const ll=(data[il]*3+data[il+1]*6+data[il+2])/10;
          const lr=(data[ir]*3+data[ir+1]*6+data[ir+2])/10;
          sum+=Math.abs(lr-ll);n++;
        }
      }
      evidence[x]=n?sum/n:0;
    }
    const values=[];
    for(let x=scanX0;x<=scanX1;x++)values.push(evidence[x]);
    values.sort((a,b)=>a-b);
    const q=(p)=>values[Math.max(0,Math.min(values.length-1,Math.floor((values.length-1)*p)))]||0;
    const base=q(.50),hi=q(.92),span=Math.max(2,hi-base);
    const normalized=new Float64Array(cw);
    for(let x=scanX0;x<=scanX1;x++)normalized[x]=Math.max(0,Math.min(2,(evidence[x]-base)/span));
    const supportAt=(x)=>{
      const xi=Math.round(x);
      let best=0;
      for(let d=-2;d<=2;d++){
        const xx=xi+d;
        if(xx>=scanX0&&xx<=scanX1)best=Math.max(best,normalized[xx]||0);
      }
      return best;
    };
    const gridScore=(start,pitch)=>{
      if(start<0||start+pitch*count>cw)return null;
      const supports=[];
      for(let i=1;i<count;i++)supports.push(supportAt(start+pitch*i));
      if(!supports.length)return null;
      const sorted=supports.slice().sort((a,b)=>a-b);
      const mean=supports.reduce((s,v)=>s+v,0)/supports.length;
      const median=sorted[Math.floor(sorted.length/2)]||0;
      const lower=sorted[Math.floor(sorted.length*.30)]||0;
      return {raw:mean*.46+median*.34+lower*.20,mean,median,lower};
    };
    const nominal=gridScore(row.x,nominalPitch)||{raw:0,mean:0,median:0,lower:0};
    let best={start:row.x,pitch:nominalPitch,...nominal,score:nominal.raw};
    for(let si=-8;si<=8;si++){
      const scale=1+si*.005;
      const pitch=nominalPitch*scale;
      for(let oi=-10;oi<=10;oi++){
        const offset=nominalPitch*(oi*.025);
        const start=row.x+offset;
        const g=gridScore(start,pitch);if(!g)continue;
        const penalty=Math.abs(offset/nominalPitch)*.08+Math.abs(scale-1)*1.25;
        const score=g.raw-penalty;
        if(score>best.score)best={start,pitch,...g,score};
      }
    }
    const gain=best.raw-nominal.raw;
    const enoughSupport=best.median>=.34&&best.lower>=.10;
    const meaningful=gain>=.055;
    if(!enoughSupport||!meaningful){
      return {row,used:false,reason:!enoughSupport?'weak-periodic-evidence':'no-gain',
        nominalScore:nominal.raw,bestScore:best.raw,gain};
    }
    const refined={...row,x:best.start,w:best.pitch*count};
    return {
      row:refined,used:true,reason:'periodic-grid',
      nominalScore:nominal.raw,bestScore:best.raw,gain,
      offsetPitch:(best.start-row.x)/nominalPitch,pitchScale:best.pitch/nominalPitch,
      medianSupport:best.median,lowerSupport:best.lower
    };
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

  // v78: diagnostic-only YOLO tile object detector.
  // It does NOT replace the current v75 crop/classification path yet.
  function detectorWindows(canvas,row){
    const cw=canvas?.width||0,ch=canvas?.height||0;
    if(cw<8||ch<8)return [];
    let base;
    if(row&&Number.isFinite(row.x)&&Number.isFinite(row.w)&&row.w>0){
      const py=Math.max(4,row.h*.20);
      const px=Math.max(2,row.w*.025);
      const x=Math.max(0,row.x-px),y=Math.max(0,row.y-py);
      const x2=Math.min(cw,row.x+row.w+px),y2=Math.min(ch,row.y+row.h+py);
      base={x,y,w:Math.max(1,x2-x),h:Math.max(1,y2-y)};
    }else{
      base={x:0,y:0,w:cw,h:ch};
    }
    const out=[{...base,kind:'full'}];
    if(base.w/base.h>=2.1){
      const frac=.44,starts=[0,.28,.56];
      for(let i=0;i<starts.length;i++){
        const x=base.x+base.w*starts[i];
        const right=Math.min(base.x+base.w,x+base.w*frac);
        out.push({x,y:base.y,w:Math.max(1,right-x),h:base.h,kind:'tile-'+(i+1)});
      }
    }
    return out;
  }

  function detectorIoU(a,b){
    const ax2=a.x+a.w,ay2=a.y+a.h,bx2=b.x+b.w,by2=b.y+b.h;
    const iw=Math.max(0,Math.min(ax2,bx2)-Math.max(a.x,b.x));
    const ih=Math.max(0,Math.min(ay2,by2)-Math.max(a.y,b.y));
    const inter=iw*ih,union=a.w*a.h+b.w*b.h-inter;
    return union>0?inter/union:0;
  }

  function detectorNms(detections,iouThreshold=.38){
    const pending=(Array.isArray(detections)?detections:[]).filter(d=>d&&d.w>0&&d.h>0&&Number.isFinite(d.score))
      .slice().sort((a,b)=>b.score-a.score);
    const kept=[];
    while(pending.length){
      const best=pending.shift();kept.push(best);
      for(let i=pending.length-1;i>=0;i--){
        const d=pending[i];
        const acx=best.x+best.w/2,acy=best.y+best.h/2,bcx=d.x+d.w/2,bcy=d.y+d.h/2;
        const sameCenter=Math.abs(acx-bcx)<Math.min(best.w,d.w)*.42&&Math.abs(acy-bcy)<Math.min(best.h,d.h)*.42;
        if(detectorIoU(best,d)>=iouThreshold||sameCenter)pending.splice(i,1);
      }
    }
    return kept;
  }

  function decodeYoloOutput(output,meta,threshold=.08){
    const data=output?.data,dims=(output?.dims||[]).map(Number);
    if(!data||dims.length!==3||!meta)return [];
    let channels=0,count=0,at=null;
    const expectedChannels=[4+YOLO_LABELS.length,5+YOLO_LABELS.length];
    if(expectedChannels.includes(dims[1])){
      channels=dims[1];count=dims[2];at=(ch,i)=>Number(data[ch*count+i])||0;
    }else if(expectedChannels.includes(dims[2])){
      count=dims[1];channels=dims[2];at=(ch,i)=>Number(data[i*channels+ch])||0;
    }else if(dims[1]<=dims[2]){
      channels=dims[1];count=dims[2];at=(ch,i)=>Number(data[ch*count+i])||0;
    }else{
      count=dims[1];channels=dims[2];at=(ch,i)=>Number(data[i*channels+ch])||0;
    }
    if(channels<8||count<1)return [];
    const hasObjectness=channels===5+YOLO_LABELS.length;
    const classStart=hasObjectness?5:4;
    const classCount=Math.min(YOLO_LABELS.length,channels-classStart);
    if(classCount<1)return [];
    const out=[];
    for(let i=0;i<count;i++){
      let cx=at(0,i),cy=at(1,i),bw=at(2,i),bh=at(3,i);
      if(!(bw>0&&bh>0))continue;
      if(bw<=2&&bh<=2){cx*=meta.size;cy*=meta.size;bw*=meta.size;bh*=meta.size;}
      let best=-1,bestScore=0;
      for(let k=0;k<classCount;k++){
        const s=at(classStart+k,i);
        if(s>bestScore){bestScore=s;best=k;}
      }
      if(hasObjectness)bestScore*=Math.max(0,at(4,i));
      if(best<0||bestScore<threshold)continue;
      const lx=(cx-bw/2-meta.padX)/meta.scale+meta.rect.x;
      const ty=(cy-bh/2-meta.padY)/meta.scale+meta.rect.y;
      const rx=(cx+bw/2-meta.padX)/meta.scale+meta.rect.x;
      const by=(cy+bh/2-meta.padY)/meta.scale+meta.rect.y;
      const x=Math.max(meta.rect.x,lx),y=Math.max(meta.rect.y,ty);
      const x2=Math.min(meta.rect.x+meta.rect.w,rx),y2=Math.min(meta.rect.y+meta.rect.h,by);
      const w=x2-x,h=y2-y;
      if(w<2||h<4)continue;
      out.push({x,y,w,h,score:bestScore,classId:best,label:YOLO_LABELS[best]||String(best),view:meta.kind||''});
    }
    return out;
  }

  function loadOrtRuntime(){
    if(window.ort?.InferenceSession)return Promise.resolve(window.ort);
    if(ortRuntimePromise)return ortRuntimePromise;
    ortRuntimePromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-m7v78-ort="1"]');
      const finish=()=>{
        if(!window.ort?.InferenceSession){reject(new Error('ort-global-missing'));return;}
        window.ort.env.wasm.wasmPaths=ORT_WASM_BASE;
        window.ort.env.wasm.numThreads=1;
        window.ort.env.wasm.proxy=false;
        resolve(window.ort);
      };
      if(existing){
        if(window.ort?.InferenceSession){finish();return;}
        existing.addEventListener('load',finish,{once:true});
        existing.addEventListener('error',()=>reject(new Error('ort-script-load-failed')),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=ORT_SCRIPT_URL;script.async=true;script.crossOrigin='anonymous';script.dataset.m7v78Ort='1';
      script.addEventListener('load',finish,{once:true});
      script.addEventListener('error',()=>reject(new Error('ort-script-load-failed')),{once:true});
      document.head.appendChild(script);
    }).catch(error=>{ortRuntimePromise=null;throw error;});
    return ortRuntimePromise;
  }

  function loadYoloDetectorSession(){
    if(detectorSessionPromise)return detectorSessionPromise;
    detectorSessionPromise=(async()=>{
      const ort=await loadOrtRuntime();
      return ort.InferenceSession.create(YOLO_MODEL_URL,{
        executionProviders:['wasm'],graphOptimizationLevel:'all',executionMode:'sequential'
      });
    })().catch(error=>{detectorSessionPromise=null;throw error;});
    return detectorSessionPromise;
  }

  function detectorLetterbox(source,rect,size=640){
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);
    const scale=Math.min(size/rect.w,size/rect.h);
    const dw=rect.w*scale,dh=rect.h*scale;
    const padX=(size-dw)/2,padY=(size-dh)/2;
    ctx.drawImage(source,rect.x,rect.y,rect.w,rect.h,padX,padY,dw,dh);
    const rgba=ctx.getImageData(0,0,size,size).data,n=size*size;
    const tensorData=new Float32Array(n*3);
    for(let p=0;p<n;p++){
      const i=p*4;tensorData[p]=rgba[i]/255;tensorData[n+p]=rgba[i+1]/255;tensorData[n*2+p]=rgba[i+2]/255;
    }
    return {tensorData,scale,padX,padY,rect,size,kind:rect.kind||''};
  }

  function filterDetectorRow(detections,row){
    if(!row||!row.w||!row.h)return detections;
    const pitch=row.w/14;
    return detections.filter(d=>{
      const cx=d.x+d.w/2,cy=d.y+d.h/2,aspect=d.h/Math.max(1,d.w);
      return cx>=row.x-pitch*.45&&cx<=row.x+row.w+pitch*.45&&
        cy>=row.y-row.h*.35&&cy<=row.y+row.h*1.35&&
        d.w>=pitch*.24&&d.w<=pitch*1.8&&d.h>=row.h*.34&&d.h<=row.h*1.75&&
        aspect>=.55&&aspect<=3.7;
    });
  }

  function renderDetectorDiagnostic(source,detections,elapsedMs,viewCount){
    const out=document.createElement('canvas');out.width=source.width;out.height=source.height;
    const ctx=out.getContext('2d');ctx.drawImage(source,0,0);
    const boxes=detections.slice().sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    const high=boxes.filter(x=>x.score>=.25).length;
    ctx.save();
    ctx.lineWidth=Math.max(2,source.width/520);
    ctx.font='bold '+Math.max(10,Math.round(source.width/92))+'px -apple-system,BlinkMacSystemFont,sans-serif';
    boxes.forEach((d,i)=>{
      ctx.strokeStyle=d.score>=.25?'rgba(25,220,110,.96)':'rgba(255,180,35,.96)';
      ctx.fillStyle='rgba(0,0,0,.72)';
      ctx.strokeRect(d.x,d.y,d.w,d.h);
      const label=(i+1)+' '+d.label+' '+d.score.toFixed(2);
      const tw=ctx.measureText(label).width+6,th=Math.max(13,source.width/75);
      ctx.fillRect(d.x,Math.max(0,d.y-th),tw,th);
      ctx.fillStyle='#fff';ctx.fillText(label,d.x+3,Math.max(10,d.y-2));
    });
    const title='v84 YOLO tile detector  boxes:'+boxes.length+'  >=.25:'+high+'  views:'+viewCount+'  '+Math.round(elapsedMs)+'ms';
    const th=Math.max(18,source.width/55);
    ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(0,0,Math.min(source.width,ctx.measureText(title).width+14),th);
    ctx.fillStyle='#fff';ctx.fillText(title,7,Math.max(12,th-5));
    ctx.restore();
    return {image:out.toDataURL('image/jpeg',.88),count:boxes.length,highCount:high,boxes};
  }

  async function runYoloTileDetectorDiagnostic(source,row){
    const started=(performance?.now?.()||Date.now());
    const ort=await loadOrtRuntime();
    const session=await loadYoloDetectorSession();
    const windows=detectorWindows(source,row);
    const all=[];
    for(const rect of windows){
      const prep=detectorLetterbox(source,rect,640);
      const tensor=new ort.Tensor('float32',prep.tensorData,[1,3,640,640]);
      const feeds={};feeds[session.inputNames[0]]=tensor;
      const outputs=await session.run(feeds);
      const output=outputs[session.outputNames[0]]||Object.values(outputs)[0];
      all.push(...decodeYoloOutput(output,prep,.08));
    }
    let merged=detectorNms(all,.36);
    merged=filterDetectorRow(merged,row);
    merged=detectorNms(merged,.32).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    if(merged.length>24)merged=merged.slice().sort((a,b)=>b.score-a.score).slice(0,24).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    const elapsed=(performance?.now?.()||Date.now())-started;
    const rendered=renderDetectorDiagnostic(source,merged,elapsed,windows.length);
    return {ok:true,count:rendered.count,highCount:rendered.highCount,elapsedMs:Math.round(elapsed),viewCount:windows.length,
      boxes:rendered.boxes.map(d=>({x:Number(d.x.toFixed(1)),y:Number(d.y.toFixed(1)),w:Number(d.w.toFixed(1)),h:Number(d.h.toFixed(1)),score:Number(d.score.toFixed(4)),label:d.label,view:d.view})),
      image:rendered.image,model:'Mahjong-YOLO yolo11n',threshold:.08};
  }

  function medianNumber(values){
    const list=(Array.isArray(values)?values:[]).filter(Number.isFinite).slice().sort((a,b)=>a-b);
    if(!list.length)return 0;
    const mid=Math.floor(list.length/2);
    return list.length%2?list[mid]:(list[mid-1]+list[mid])/2;
  }

  // v82 production guard: object detection may occasionally emit one or two
  // extra boxes. Select the most coherent 14-box row instead of rejecting the
  // whole capture, but only when the resulting geometry is unambiguous.
  function detectorGeometryEvaluation(input,row,count=14){
    const boxes=(Array.isArray(input)?input:[]).slice().sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    if(boxes.length!==count)return {valid:false,score:Infinity,reason:'count-'+boxes.length,stats:{count:boxes.length}};
    const widths=boxes.map(b=>b.w),heights=boxes.map(b=>b.h);
    const medW=medianNumber(widths),medH=medianNumber(heights);
    if(!(medW>5&&medH>8))return {valid:false,score:Infinity,reason:'box-small',stats:{count:boxes.length,medW,medH}};
    const highCount=boxes.filter(b=>b.score>=.25).length;
    const medScore=medianNumber(boxes.map(b=>b.score));
    if(highCount<count-2||medScore<.32){
      return {valid:false,score:Infinity,reason:'confidence',stats:{count:boxes.length,highCount,medScore,medW,medH}};
    }
    const widthCv=Math.sqrt(widths.reduce((s,v)=>s+(v-medW)*(v-medW),0)/widths.length)/medW;
    const heightCv=Math.sqrt(heights.reduce((s,v)=>s+(v-medH)*(v-medH),0)/heights.length)/medH;
    if(widthCv>.30||heightCv>.22){
      return {valid:false,score:Infinity,reason:'size-variance',stats:{count:boxes.length,highCount,medScore,widthCv,heightCv,medW,medH}};
    }
    const centers=boxes.map(b=>({x:b.x+b.w/2,y:b.y+b.h/2}));
    const gaps=centers.slice(1).map((p,i)=>p.x-centers[i].x);
    const medGap=medianNumber(gaps),minGap=Math.min(...gaps),maxGap=Math.max(...gaps);
    if(!(medGap>medW*.55&&minGap>medW*.42&&maxGap<medW*1.65)){
      return {valid:false,score:Infinity,reason:'x-spacing',stats:{count:boxes.length,highCount,medScore,medW,medH,medGap,minGap,maxGap,widthCv,heightCv}};
    }
    const gapCv=Math.sqrt(gaps.reduce((s,v)=>s+(v-medGap)*(v-medGap),0)/gaps.length)/Math.max(1,medGap);
    const meanI=(count-1)/2,meanX=centers.reduce((s,p)=>s+p.x,0)/count;
    let cov=0,varI=0;
    for(let i=0;i<count;i++){const di=i-meanI;cov+=di*(centers[i].x-meanX);varI+=di*di;}
    const pitch=varI>0?cov/varI:medGap;
    const intercept=meanX-pitch*meanI;
    const fitRms=Math.sqrt(centers.reduce((s,p,i)=>{const d=p.x-(intercept+pitch*i);return s+d*d;},0)/count);
    const fitResidualPitch=fitRms/Math.max(1,Math.abs(pitch));
    if(!(pitch>medW*.55)||fitResidualPitch>.18||gapCv>.30){
      return {valid:false,score:Infinity,reason:'row-fit',stats:{count:boxes.length,highCount,medScore,medW,medH,medGap,minGap,maxGap,gapCv,fitResidualPitch,widthCv,heightCv}};
    }
    const ys=centers.map(p=>p.y),ySpread=Math.max(...ys)-Math.min(...ys);
    if(ySpread>medH*.38){
      return {valid:false,score:Infinity,reason:'y-spread',stats:{count:boxes.length,highCount,medScore,medW,medH,medGap,ySpread,gapCv,fitResidualPitch,widthCv,heightCv}};
    }
    const medianAspect=medianNumber(boxes.map(b=>b.h/Math.max(1,b.w)));
    if(medianAspect<.85||medianAspect>2.9){
      return {valid:false,score:Infinity,reason:'aspect',stats:{count:boxes.length,highCount,medScore,medW,medH,medGap,ySpread,medianAspect,gapCv,fitResidualPitch,widthCv,heightCv}};
    }
    if(row?.w&&row?.h){
      const rowPitch=row.w/count;
      const first=centers[0].x,last=centers[centers.length-1].x;
      if(first<row.x-rowPitch*.70||last>row.x+row.w+rowPitch*.70){
        return {valid:false,score:Infinity,reason:'row-range',stats:{count:boxes.length,highCount,medScore,medW,medH,medGap,ySpread,medianAspect,gapCv,fitResidualPitch,widthCv,heightCv}};
      }
    }
    const lowCount=count-highCount;
    const score=
      fitResidualPitch*4.5+
      gapCv*2.8+
      widthCv*1.7+
      heightCv*1.4+
      (ySpread/Math.max(1,medH))*.55+
      lowCount*.025+
      Math.max(0,.70-medScore)*.08;
    return {
      valid:true,score,reason:'accepted',boxes,
      stats:{
        count:boxes.length,highCount,medScore:Number(medScore.toFixed(4)),
        medW:Number(medW.toFixed(2)),medH:Number(medH.toFixed(2)),medGap:Number(medGap.toFixed(2)),
        minGap:Number(minGap.toFixed(2)),maxGap:Number(maxGap.toFixed(2)),
        gapCv:Number(gapCv.toFixed(4)),fitResidualPitch:Number(fitResidualPitch.toFixed(4)),
        ySpread:Number(ySpread.toFixed(2)),medianAspect:Number(medianAspect.toFixed(3)),
        widthCv:Number(widthCv.toFixed(4)),heightCv:Number(heightCv.toFixed(4)),
        geometryScore:Number(score.toFixed(4))
      }
    };
  }

  function detectorSubsetCandidates(boxes,count=14){
    const n=boxes.length;
    if(n===count)return [boxes.slice()];
    if(n<count||n>count+2)return [];
    const needDrop=n-count,out=[],chosen=[];
    function chooseDrops(start,left){
      if(left===0){
        const drop=new Set(chosen);
        out.push(boxes.filter((_,i)=>!drop.has(i)));
        return;
      }
      for(let i=start;i<=n-left;i++){
        chosen.push(i);chooseDrops(i+1,left-1);chosen.pop();
      }
    }
    chooseDrops(0,needDrop);
    return out;
  }

  function detectorMissingSlotFit(boxes,missingIndex,count=14){
    const sorted=(Array.isArray(boxes)?boxes:[]).slice().sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    if(sorted.length!==count-1||missingIndex<0||missingIndex>=count)return null;
    const slots=[];for(let i=0;i<count;i++)if(i!==missingIndex)slots.push(i);
    const centers=sorted.map(b=>b.x+b.w/2);
    const meanI=slots.reduce((s,v)=>s+v,0)/slots.length;
    const meanX=centers.reduce((s,v)=>s+v,0)/centers.length;
    let cov=0,varI=0;
    for(let i=0;i<slots.length;i++){const di=slots[i]-meanI;cov+=di*(centers[i]-meanX);varI+=di*di;}
    const pitch=varI>0?cov/varI:0;
    if(!(pitch>1))return null;
    const intercept=meanX-pitch*meanI;
    const rms=Math.sqrt(centers.reduce((s,x,i)=>{const d=x-(intercept+pitch*slots[i]);return s+d*d;},0)/centers.length);
    return {missingIndex,pitch,intercept,fitResidualPitch:rms/Math.abs(pitch),expectedX:intercept+pitch*missingIndex};
  }

  function detectorRecoverThirteenCandidates(boxes,row,cw,ch,count=14){
    const sorted=(Array.isArray(boxes)?boxes:[]).slice().sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
    if(sorted.length!==count-1)return [];
    const medW=medianNumber(sorted.map(b=>b.w)),medH=medianNumber(sorted.map(b=>b.h));
    const medCy=medianNumber(sorted.map(b=>b.y+b.h/2));
    if(!(medW>5&&medH>8))return [];
    const out=[];

    // Case A: one detector box visibly spans two neighboring tiles.
    // Split only a clearly over-wide box; both children intentionally lose the
    // original class label because we cannot know which physical tile produced it.
    sorted.forEach((b,index)=>{
      const ratio=b.w/medW;
      if(ratio<1.48||ratio>2.45)return;
      const half=b.w/2;
      if(half<medW*.62||half>medW*1.28)return;
      const left={...b,w:half,label:'',classId:-1,score:0,synthetic:true,recovery:'split-wide',recoverySource:index};
      const right={...b,x:b.x+half,w:half,label:'',classId:-1,score:0,synthetic:true,recovery:'split-wide',recoverySource:index};
      const candidate=sorted.slice(0,index).concat([left,right],sorted.slice(index+1));
      const evaluated=detectorGeometryEvaluation(candidate,row,count);
      if(!evaluated.valid)return;
      out.push({
        type:'split-wide',missingIndex:null,fitResidualPitch:evaluated.stats?.fitResidualPitch??Infinity,
        score:evaluated.score+.025,boxes:evaluated.boxes,stats:{...evaluated.stats,wideRatio:Number(ratio.toFixed(3)),splitRawIndex:b.rawIndex}
      });
    });

    // Case B: exactly one slot is absent. Fit 13 observed centers to 14 integer
    // slots, insert one median-sized crop, and accept only a unique, tight fit.
    const fits=[];
    for(let missing=0;missing<count;missing++){
      const fit=detectorMissingSlotFit(sorted,missing,count);
      if(!fit||fit.fitResidualPitch>.16||fit.pitch<medW*.55||fit.pitch>medW*1.65)continue;
      const x=Math.max(0,Math.min(cw-medW,fit.expectedX-medW/2));
      const y=Math.max(0,Math.min(ch-medH,medCy-medH/2));
      const synthetic={
        x,y,w:medW,h:medH,score:0,label:'',classId:-1,view:'recovered',
        rawIndex:-1,synthetic:true,recovery:'missing-slot',missingIndex:missing
      };
      const candidate=sorted.concat(synthetic).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
      const evaluated=detectorGeometryEvaluation(candidate,row,count);
      if(!evaluated.valid)continue;
      let edgeResidualPitch=0;
      if(row?.w&&row?.h){
        const rowPitch=row.w/count;
        const cc=evaluated.boxes.map(b=>b.x+b.w/2).sort((a,b)=>a-b);
        const expectedFirst=row.x+rowPitch*.5,expectedLast=row.x+row.w-rowPitch*.5;
        edgeResidualPitch=(Math.abs(cc[0]-expectedFirst)+Math.abs(cc[cc.length-1]-expectedLast))/(2*Math.max(1,rowPitch));
        if(edgeResidualPitch>.45)continue;
      }
      fits.push({
        type:'missing-slot',missingIndex:missing,fitResidualPitch:fit.fitResidualPitch,
        edgeResidualPitch,
        score:evaluated.score+fit.fitResidualPitch*1.8+edgeResidualPitch*1.55+.035,
        boxes:evaluated.boxes,stats:{...evaluated.stats,missingIndex:missing,fitResidualPitch13:Number(fit.fitResidualPitch.toFixed(4)),edgeResidualPitch:Number(edgeResidualPitch.toFixed(4))}
      });
    }
    fits.sort((a,b)=>a.score-b.score);
    if(fits.length){
      const best=fits[0],second=fits[1]||null;
      const margin=second?second.score-best.score:Infinity;
      if(best.fitResidualPitch<=.095&&(!second||margin>=.055)){
        best.stats={...best.stats,recoveryMargin:Number.isFinite(margin)?Number(margin.toFixed(4)):null};
        out.push(best);
      }
    }
    return out.sort((a,b)=>a.score-b.score);
  }

  function selectDetectorProductionBoxes(result,source,row,count=14){
    const raw=(result?.boxes||[]).filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.w)&&Number.isFinite(b.h)&&Number.isFinite(b.score));
    const cw=source?.width||0,ch=source?.height||0;
    if(cw<20||ch<20)return {accepted:false,reason:'source-small',boxes:[],stats:{rawCount:raw.length}};
    if(raw.length<count-1||raw.length>count+2){
      return {accepted:false,reason:'count-'+raw.length,boxes:[],stats:{rawCount:raw.length}};
    }
    const normalized=raw.map((b,rawIndex)=>{
      const x=Math.max(0,Math.min(cw-1,b.x)),y=Math.max(0,Math.min(ch-1,b.y));
      const x2=Math.max(x+1,Math.min(cw,b.x+b.w)),y2=Math.max(y+1,Math.min(ch,b.y+b.h));
      return {...b,x,y,w:x2-x,h:y2-y,rawIndex};
    }).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));

    let evaluated=[],recovery=null;
    if(raw.length===count-1){
      const recovered=detectorRecoverThirteenCandidates(normalized,row,cw,ch,count);
      if(!recovered.length){
        return {accepted:false,reason:'recover-13-no-valid',boxes:[],stats:{rawCount:raw.length,candidateCount:0}};
      }
      recovery=recovered[0];
      evaluated=[{valid:true,score:recovery.score,reason:'accepted',boxes:recovery.boxes,stats:recovery.stats}];
    }else{
      evaluated=detectorSubsetCandidates(normalized,count)
        .map(boxes=>detectorGeometryEvaluation(boxes,row,count))
        .filter(x=>x.valid)
        .sort((a,b)=>a.score-b.score);
      if(!evaluated.length){
        return {accepted:false,reason:raw.length===count?'geometry':'subset-no-valid',boxes:[],stats:{rawCount:raw.length,candidateCount:detectorSubsetCandidates(normalized,count).length}};
      }
    }
    const best=evaluated[0],second=evaluated[1]||null;
    const margin=second?second.score-best.score:Infinity;
    if(raw.length>count&&second&&margin<.035){
      return {
        accepted:false,reason:'subset-ambiguous',boxes:[],
        stats:{rawCount:raw.length,candidateCount:evaluated.length,bestScore:Number(best.score.toFixed(4)),secondScore:Number(second.score.toFixed(4)),selectionMargin:Number(margin.toFixed(4))}
      };
    }
    const chosenRawIndices=new Set(best.boxes.map(b=>b.rawIndex));
    const dropped=normalized.filter(b=>!chosenRawIndices.has(b.rawIndex)).map(b=>({
      rawIndex:b.rawIndex,x:Number(b.x.toFixed(1)),y:Number(b.y.toFixed(1)),
      w:Number(b.w.toFixed(1)),h:Number(b.h.toFixed(1)),score:Number(b.score.toFixed(4)),label:b.label||''
    }));
    const safeBoxes=best.boxes.map((b,i)=>{
      const ix=Math.min(b.w*.025,2.5),iy=Math.min(b.h*.015,2.0);
      return {x:b.x+ix,y:b.y+iy,w:Math.max(2,b.w-ix*2),h:Math.max(4,b.h-iy*2),score:b.score,label:b.label,classId:b.classId,view:b.view,index:i,rawIndex:b.rawIndex,synthetic:b.synthetic===true,recovery:b.recovery||'',missingIndex:Number.isInteger(b.missingIndex)?b.missingIndex:null};
    });
    const subsetUsed=raw.length>count;
    const recoveryUsed=raw.length===count-1&&!!recovery;
    return {
      accepted:true,
      reason:recoveryUsed?'recover-13-to-14-'+recovery.type:(subsetUsed?'subset-'+raw.length+'-to-'+count:'accepted'),
      boxes:safeBoxes,
      stats:{
        ...best.stats,rawCount:raw.length,selectedCount:safeBoxes.length,
        subsetUsed,droppedCount:dropped.length,dropped,
        recoveryUsed,recoveryType:recovery?.type||'',missingIndex:Number.isInteger(recovery?.missingIndex)?recovery.missingIndex:null,
        syntheticCount:safeBoxes.filter(b=>b.synthetic).length,
        candidateCount:evaluated.length,
        secondScore:second?Number(second.score.toFixed(4)):null,
        selectionMargin:Number.isFinite(margin)?Number(margin.toFixed(4)):null
      }
    };
  }

  // v80: YOLO already isolated one physical tile. Do not run face-geometry
  // detection again here: glyphs inside a correct YOLO box can be mistaken for
  // a rotated/projective tile and visibly skew an otherwise good crop.
  function axisAlignedYoloFaceCanvas(ctx,b,width=96,height=144){
    const x0=Math.max(0,Math.floor(b.x)),y0=Math.max(0,Math.floor(b.y));
    const x1=Math.min(ctx.canvas.width,Math.ceil(b.x+b.w)),y1=Math.min(ctx.canvas.height,Math.ceil(b.y+b.h));
    const sw=Math.max(1,x1-x0),sh=Math.max(1,y1-y0);
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const o=out.getContext('2d',{willReadFrequently:true});
    o.fillStyle='#f4f1e8';o.fillRect(0,0,width,height);
    o.imageSmoothingEnabled=true;o.imageSmoothingQuality='high';
    o.drawImage(ctx.canvas,x0,y0,sw,sh,0,0,width,height);
    Object.defineProperty(out,'__m7v80YoloAxisAligned',{value:true,enumerable:false});
    out.__m7v46Perspective=false;
    return out;
  }

  function analyzeYoloTileBox(ctx,b,index=1,count=14){
    const canonical=axisAlignedYoloFaceCanvas(ctx,b,96,144);
    // Keep the recognition-window/classifier contract unchanged so v80 isolates
    // one variable: removing the second geometry/orientation pass after YOLO.
    const bleedInfo=estimateBleedSafeShift(canonical,.12);
    const chosen=chooseRecognitionWindow(canonical,index,count,bleedInfo);
    const recognition=chosen.canvas;
    const quality=chosen.quality;
    const trainingImage=canonical.toDataURL('image/jpeg',.92);
    return {
      feature:descriptorFromCanvas(recognition),
      inferenceFeatures:inferenceFeatureViews(canonical,chosen.window),
      crop:recognition.toDataURL('image/jpeg',.92),
      trainingImage,
      quality,
      qualityBefore:chosen.beforeQuality,
      cropBroken:quality.broken===true,
      qualityFallback:chosen.fallback===true,
      bleedShift:Number(bleedInfo.shiftX)||0,
      bleedSide:bleedInfo.side||'none',
      bleedConfidence:Number(bleedInfo.confidence)||0,
      bleedInsetApplied:chosen.used===true,
      bleedTrimLeft:Number(chosen.trimLeft)||0,
      bleedTrimRight:Number(chosen.trimRight)||0,
      cropTrimReason:chosen.reason||'base',
      cropCandidateCount:chosen.candidateCount||1,
      perspectiveUsed:false,
      yoloAxisAligned:true
    };
  }

  function yoloLabelToAppTile(rawLabel){
    const s=String(rawLabel||'').trim();
    const honor={'1z':'東','2z':'南','3z':'西','4z':'北','5z':'白','6z':'發','7z':'中'};
    if(honor[s])return honor[s];
    const m=s.match(/^([0-9])([mps])$/);
    if(!m)return '';
    const n=m[1]==='0'?5:Number(m[1]);
    if(!(n>=1&&n<=9))return '';
    const suit=m[2]==='m'?'萬':(m[2]==='p'?'筒':'索');
    return String(n)+suit;
  }

  function yoloRecognitionFromBoxes(boxes){
    return (Array.isArray(boxes)?boxes:[]).map((b,index)=>({
      index,
      rawLabel:String(b?.label||''),
      label:yoloLabelToAppTile(b?.label),
      score:Number(b?.score)||0
    }));
  }

  function chooseYoloPrimaryRecognition(yoloRecognition,legacyPredicted=[],detectorAdopted=false,threshold=YOLO_CLASS_USE_THRESHOLD){
    const yolo=Array.isArray(yoloRecognition)?yoloRecognition:[];
    const legacy=Array.isArray(legacyPredicted)?legacyPredicted:[];
    const labels=Array(14).fill(''),sources=Array(14).fill('unresolved');
    const candidates=[];
    if(detectorAdopted&&yolo.length===14){
      for(let i=0;i<14;i++){
        const r=yolo[i]||{};
        if(r.label&&Number(r.score)>=threshold)candidates.push({i,label:r.label,score:Number(r.score)});
      }
    }
    const byLabel={};
    for(const x of candidates)(byLabel[x.label]||(byLabel[x.label]=[])).push(x);
    const accepted=new Set();
    for(const list of Object.values(byLabel)){
      list.sort((a,b)=>b.score-a.score);
      for(const x of list.slice(0,4))accepted.add(x.i);
    }
    let yoloUsed=0,legacyUsed=0;
    for(let i=0;i<14;i++){
      if(accepted.has(i)){
        labels[i]=yolo[i].label;sources[i]='yolo';yoloUsed++;continue;
      }
      if(legacy[i]){
        labels[i]=legacy[i];sources[i]='legacy';legacyUsed++;
      }
    }
    return {labels,sources,yoloUsed,legacyUsed,unresolved:labels.filter(x=>!x).length,threshold};
  }

  function applyDetectorProductionCrops(highCanvas,baseAnalysis,detectorResult){
    const selected=selectDetectorProductionBoxes(detectorResult,highCanvas,baseAnalysis?.row||null,14);
    let displayResult=detectorResult||null;
    if(selected.accepted&&(selected.stats?.subsetUsed||selected.stats?.recoveryUsed)){
      const selectedRender=renderDetectorDiagnostic(highCanvas,selected.boxes,detectorResult?.elapsedMs||0,detectorResult?.viewCount||0);
      displayResult={
        ...(detectorResult||{}),
        rawCount:detectorResult?.count||selected.stats.rawCount||0,
        count:selectedRender.count,highCount:selectedRender.highCount,
        image:selectedRender.image,subsetSelected:selected.stats?.subsetUsed===true,
        recoveredMissing:selected.stats?.recoveryUsed===true,
        recoveryType:selected.stats?.recoveryType||'',
        syntheticCount:selected.stats?.syntheticCount||0,
        droppedCount:selected.stats.droppedCount||0
      };
    }
    const common={
      yoloDetectorResult:displayResult,
      detectorAdopted:selected.accepted===true,
      detectorAdoptionReason:selected.reason||'',
      detectorGeometry:selected.stats||null,
      yoloRecognition:selected.accepted?yoloRecognitionFromBoxes(selected.boxes):[]
    };
    if(!selected.accepted)return {...baseAnalysis,...common};
    const highCtx=highCanvas.getContext('2d',{willReadFrequently:true});
    const boxes=selected.boxes;
    const tileData=boxes.map((b,i)=>analyzeYoloTileBox(highCtx,b,i,14));
    const cropBroken=tileData.map(x=>x.cropBroken===true);
    const neutralLocal=Array.from({length:14},()=>({used:false,leftPx:0,rightPx:0,beforeScore:null,afterScore:null}));
    return {
      ...baseAnalysis,...common,boxes,
      features:tileData.map(x=>x.feature),
      inferenceViews:tileData.map(x=>x.inferenceFeatures),
      crops:tileData.map(x=>x.crop),
      trainingImages:tileData.map(x=>x.trainingImage),
      cropBroken,
      cropQualities:tileData.map((x,i)=>({
        score:Number((x.quality?.score||0).toFixed(4)),
        beforeScore:Number((x.qualityBefore?.score||0).toFixed(4)),
        broken:x.cropBroken===true,
        tileRatio:Number((x.quality?.tileRatio||0).toFixed(4)),
        centerRatio:Number((x.quality?.centerRatio||0).toFixed(4)),
        woodRatio:Number((x.quality?.woodRatio||0).toFixed(4)),
        edgeContamination:Number((x.quality?.edgeContamination||0).toFixed(4)),
        beforeEdgeContamination:Number((x.qualityBefore?.edgeContamination||0).toFixed(4)),
        leftTrim:Number((x.bleedTrimLeft||0).toFixed(4)),
        rightTrim:Number((x.bleedTrimRight||0).toFixed(4)),
        trimReason:x.cropTrimReason||'base',
        localBoundary:neutralLocal[i]
      })),
      cropQualityFallbackCount:tileData.filter(x=>x.qualityFallback===true).length,
      brokenCropCount:cropBroken.filter(Boolean).length,
      cropAbnormalCount:cropBroken.filter(Boolean).length,
      resplitAdoptedCount:0,
      localBoundaryDebug:neutralLocal,
      perspectiveCount:tileData.filter(x=>x.perspectiveUsed).length,
      bleedSafeCount:tileData.filter(x=>x.bleedInsetApplied===true).length,
      boundaryTrimCount:tileData.filter(x=>x.bleedInsetApplied===true).length,
      bleedShifts:tileData.map(x=>Number((x.bleedShift||0).toFixed(4))),
      bleedInsets:tileData.map(x=>({leftTrim:Number((x.bleedTrimLeft||0).toFixed(4)),rightTrim:Number((x.bleedTrimRight||0).toFixed(4)),reason:x.cropTrimReason||'base'}))
    };
  }

  function renderDetectorResult(root,result,adopted,reason=''){
    const wrap=mountDetectorDiagnostic(root),label=wrap.querySelector('.m7v78-detector-label');
    const body=wrap.querySelector('.m7v85-detector-body');
    if(!result?.ok){
      const code=result?.error||reason||'unknown';
      label.textContent='認識詳細：fallback';
      if(body){
        const msg=document.createElement('div');msg.className='maki-recognition-error-v88';
        msg.textContent=detectorFailureUserText(code,result);
        const tech=document.createElement('small');tech.textContent='詳細コード: '+code;
        body.append(msg,tech);
      }
      wrap.open=true;
      return;
    }
    const countText=(result.subsetSelected||result.recoveredMissing)&&result.rawCount?result.rawCount+'→'+result.count:result.count;
    label.textContent='認識詳細：'+countText+'牌 / '+result.elapsedMs+'ms';
    const recoveryText=adopted&&result.recoveredMissing?' / 不足1box補完('+((result.recoveryType||'').replace('missing-slot','空きslot').replace('split-wide','横長box分割'))+')':'';
    const meta=document.createElement('div');meta.className='m7v85-detector-meta';
    meta.textContent=(adopted?'YOLO分割 採用':'YOLO分割 fallback')+
      ' / confidence 0.25以上 '+result.highCount+' / '+result.viewCount+'視点'+
      (adopted&&result.subsetSelected?' / 余分'+(result.droppedCount||1)+'box除外':'')+
      recoveryText+(adopted?'':' / '+reason);
    body?.appendChild(meta);
    if(result.image){
      const img=document.createElement('img');img.src=result.image;img.alt='M7 v85 YOLO牌box';
      img.style.cssText='display:block;width:100%;max-height:104px;object-fit:contain;margin-top:4px;background:#111;border-radius:6px;';
      body?.appendChild(img);
    }
  }

  function detectorErrorCode(error){
    const raw=String(error?.message||error||'unknown');
    if(raw.includes('ort-script'))return raw;
    if(raw.includes('fetch')||raw.includes('Load model'))return 'model-load-failed';
    if(raw.includes('WebAssembly')||raw.includes('wasm'))return 'wasm-init-failed';
    return raw.slice(0,120);
  }

  function detectorFailureUserText(reason,result=null){
    const code=String(reason||result?.error||'unknown');
    if(code==='model-load-failed'||code.includes('ort-script')){
      return 'AIモデルを読み込めませんでした。通信状態を確認して「読み取り直す」を押してください。';
    }
    if(code==='wasm-init-failed'){
      return 'この端末でAI処理を開始できませんでした。ページを再読み込みして、もう一度撮影してください。';
    }
    if(/^count-\d+$/.test(code)){
      const n=Number(code.slice(6));
      if(n<14)return '14枚すべてが白枠内に入るよう、牌を重ねず横一列に並べて撮り直してください。';
      return '牌以外の物や重複検出が入りました。14枚だけを横一列にして撮り直してください。';
    }
    if(code==='recover-13-no-valid'){
      return '14枚のうち1枚以上を安定して分けられませんでした。牌同士を少し離し、14枚を横一列にして撮り直してください。';
    }
    if(code==='subset-ambiguous'||code==='subset-no-valid'){
      return '14枚の区切りを一意に決められませんでした。牌の重なりをなくして、横一列に並べ直してください。';
    }
    if(['geometry','x-spacing','y-spread','size-variance','row-range','aspect'].includes(code)){
      return '牌列の位置や間隔を確認できませんでした。14枚を同じ向きで、白枠の中央に横一列で置いてください。';
    }
    if(code==='source-small'||code==='row-too-small'){
      return '牌が小さすぎます。スマホを少し近づけて、14枚が白枠内に収まる距離で撮影してください。';
    }
    return '牌を安定して認識できませんでした。「読み取り直す」で再撮影するか、結果画面で手動修正してください。';
  }

  function mountDetectorDiagnostic(root){
    root.querySelector('.m7v76-boundary-diagnostic')?.remove();
    root.querySelector('.m7v78-detector-diagnostic')?.remove();
    const wrap=document.createElement('details');wrap.className='m7v78-detector-diagnostic m7v85-detector-details';
    wrap.style.cssText='margin:3px 8px 5px;padding:4px 7px;border:1px solid rgba(0,0,0,.14);border-radius:8px;background:#fff;color:#222;font:700 10px/1.25 -apple-system,BlinkMacSystemFont,sans-serif;';
    wrap.open=false;
    const label=document.createElement('summary');label.className='m7v78-detector-label';
    label.style.cssText='cursor:pointer;user-select:none;list-style-position:inside;padding:1px 0;';
    label.textContent='認識詳細';
    const body=document.createElement('div');body.className='m7v85-detector-body';
    body.style.cssText='padding-top:4px;font-weight:700;';
    wrap.append(label,body);
    root.querySelector('.hand-result-head-m7v5')?.insertAdjacentElement('afterend',wrap);
    return wrap;
  }

  function startDetectorDiagnostic(source,analysis,root){
    const wrap=mountDetectorDiagnostic(root),label=wrap.querySelector('.m7v78-detector-label'),body=wrap.querySelector('.m7v85-detector-body');
    label.textContent='認識詳細：読み込み中…';
    runYoloTileDetectorDiagnostic(source,analysis.row||null).then(result=>{
      if(!root.isConnected)return;
      label.textContent='認識詳細：'+result.count+'牌 / '+result.elapsedMs+'ms';
      const meta=document.createElement('div');meta.className='m7v85-detector-meta';
      meta.textContent='YOLO牌検出 '+result.count+'個 / confidence 0.25以上 '+result.highCount+'個 / '+result.viewCount+'視点';
      body?.appendChild(meta);
      const img=document.createElement('img');img.src=result.image;img.alt='M7 v85 YOLO牌検出box診断';
      img.style.cssText='display:block;width:100%;max-height:104px;object-fit:contain;margin-top:4px;background:#111;border-radius:6px;';
      body?.appendChild(img);
      if(window.M7V36LastDiagnostics)window.M7V36LastDiagnostics.yoloDetector={...result,image:undefined};
    }).catch(error=>{
      if(!root.isConnected)return;
      const code=detectorErrorCode(error);
      label.textContent='認識詳細：fallback';
      if(body){
        const msg=document.createElement('div');msg.className='maki-recognition-error-v88';msg.textContent=detectorFailureUserText(code);
        const tech=document.createElement('small');tech.textContent='詳細コード: '+code;
        body.append(msg,tech);
      }
      wrap.open=true;
      if(window.M7V36LastDiagnostics)window.M7V36LastDiagnostics.yoloDetector={ok:false,error:code};
    });
  }


  // v77 diagnostic only: require the same boundary evidence in BOTH the
  // top and bottom bands, plus vertical continuity. This still NEVER changes
  // row/crop geometry; it only tests whether classical boundary evidence is usable.
  function boundaryLikelihoodDiagnostics(ctx,row,count=14){
    if(!ctx||!row||!Number.isFinite(row.x)||!Number.isFinite(row.w)||row.w<=0){
      return {ok:false,reason:'invalid-row',clearNearCount:0,strongWideCount:0,peaks:[],image:null};
    }
    const cw=ctx.canvas.width|0,ch=ctx.canvas.height|0;
    const x0=Math.max(0,Math.floor(row.x)),y0=Math.max(0,Math.floor(row.y));
    const x1=Math.min(cw,Math.ceil(row.x+row.w)),y1=Math.min(ch,Math.ceil(row.y+row.h));
    const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);
    if(w<count*8||h<24)return {ok:false,reason:'row-too-small',clearNearCount:0,strongWideCount:0,peaks:[],image:null};
    const data=ctx.getImageData(x0,y0,w,h).data;
    const lum=(x,y)=>{
      x=Math.max(0,Math.min(w-1,x|0));y=Math.max(0,Math.min(h-1,y|0));
      const i=(y*w+x)*4;return (data[i]*3+data[i+1]*6+data[i+2])/10;
    };
    const tileLike=(x,y)=>{
      x=Math.max(0,Math.min(w-1,x|0));y=Math.max(0,Math.min(h-1,y|0));
      const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];
      const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(r*3+g*6+b)/10;
      return l>=82&&((max-min)/(l+1))<=.55;
    };
    const topBand=[Math.max(2,Math.floor(h*.07)),Math.max(3,Math.floor(h*.24))];
    const bottomBand=[Math.min(h-3,Math.floor(h*.76)),Math.min(h-2,Math.floor(h*.93))];
    const make=()=>new Float64Array(w);
    const tg=make(),td=make(),tl=make(),tp=make();
    const bg=make(),bd=make(),bl=make(),bp=make();
    const continuity=make();

    const measureBand=(x,band)=>{
      let gsum=0,dsum=0,strong=0,n=0,centerWhite=0,sideWhite=0;
      for(let y=band[0];y<band[1];y++){
        const l1=lum(x-1,y),r1=lum(x+1,y);
        const gv=Math.abs(r1-l1);gsum+=gv;if(gv>=18)strong++;
        const la=(lum(x-4,y)+lum(x-3,y)+lum(x-2,y))/3;
        const ra=(lum(x+2,y)+lum(x+3,y)+lum(x+4,y))/3;
        dsum+=Math.abs(ra-la);
        if(tileLike(x,y))centerWhite++;
        if(tileLike(x-5,y))sideWhite+=.5;
        if(tileLike(x+5,y))sideWhite+=.5;
        n++;
      }
      return {
        grad:n?gsum/n:0,disc:n?dsum/n:0,line:n?strong/n:0,
        gap:n?Math.max(0,(sideWhite-centerWhite)/n):0
      };
    };

    for(let x=5;x<w-5;x++){
      const t=measureBand(x,topBand),bot=measureBand(x,bottomBand);
      tg[x]=t.grad;td[x]=t.disc;tl[x]=t.line;tp[x]=t.gap;
      bg[x]=bot.grad;bd[x]=bot.disc;bl[x]=bot.line;bp[x]=bot.gap;
      let hits=0,n=0;
      for(let y=Math.max(2,Math.floor(h*.06));y<Math.min(h-2,Math.ceil(h*.94));y+=2){
        const gv=Math.abs(lum(x+1,y)-lum(x-1,y));
        if(gv>=15)hits++;
        n++;
      }
      continuity[x]=n?hits/n:0;
    }

    const normalize=(src,hiQ=.92)=>{
      const vals=[];
      for(let x=5;x<w-5;x++)vals.push(src[x]);
      vals.sort((a,b)=>a-b);
      const q=p=>vals[Math.max(0,Math.min(vals.length-1,Math.floor((vals.length-1)*p)))]||0;
      const lo=q(.50),hi=q(hiQ),span=Math.max(1e-6,hi-lo);
      const out=new Float64Array(w);
      for(let x=5;x<w-5;x++)out[x]=Math.max(0,Math.min(1.35,(src[x]-lo)/span));
      return out;
    };
    const ntg=normalize(tg),ntd=normalize(td),ntl=normalize(tl),ntp=normalize(tp,.88);
    const nbg=normalize(bg),nbd=normalize(bd),nbl=normalize(bl),nbp=normalize(bp,.88);
    const nc=normalize(continuity,.90);
    const raw=new Float64Array(w),dualSupport=new Float64Array(w);
    for(let x=5;x<w-5;x++){
      // Geometric mean/min makes a glyph visible in only one band score poorly.
      const dg=Math.sqrt(ntg[x]*nbg[x]);
      const dd=Math.sqrt(ntd[x]*nbd[x]);
      const dl=Math.min(ntl[x],nbl[x]);
      const dp=Math.sqrt(ntp[x]*nbp[x]);
      const topSupport=ntg[x]*.42+ntd[x]*.30+ntl[x]*.28;
      const bottomSupport=nbg[x]*.42+nbd[x]*.30+nbl[x]*.28;
      const concurrence=Math.min(1.2,Math.min(topSupport,bottomSupport));
      dualSupport[x]=concurrence;
      const imbalance=Math.min(1,Math.abs(topSupport-bottomSupport));
      raw[x]=(dg*.30+dd*.20+dl*.22+nc[x]*.22+dp*.06)*(0.60+Math.min(1,concurrence)*.40)-imbalance*.08;
    }
    const score=new Float64Array(w);
    for(let x=5;x<w-5;x++){
      let sum=0,weight=0;
      for(let d=-2;d<=2;d++){const ww=3-Math.abs(d);sum+=Math.max(0,raw[x+d])*ww;weight+=ww;}
      score[x]=weight?sum/weight:Math.max(0,raw[x]);
    }
    const pitch=w/count;
    const peakAt=(x)=>{
      const shoulder=Math.max(2,Math.round(pitch*.07));
      const local=(score[Math.max(5,x-shoulder)]+score[Math.min(w-6,x+shoulder)])/2;
      const prominence=Math.max(0,score[x]-local);
      return score[x]+Math.min(.22,prominence*.45);
    };
    const bestIn=(center,radius)=>{
      const lo=Math.max(5,Math.floor(center-radius)),hi=Math.min(w-6,Math.ceil(center+radius));
      let bx=Math.round(center),bs=-Infinity;
      for(let x=lo;x<=hi;x++){
        const v=peakAt(x);
        if(v>bs){bs=v;bx=x;}
      }
      return {
        x:bx,score:Number((Math.max(0,bs)).toFixed(4)),
        offsetPitch:Number(((bx-center)/pitch).toFixed(4)),
        concurrence:Number((dualSupport[bx]||0).toFixed(4)),
        continuity:Number((continuity[bx]||0).toFixed(4))
      };
    };
    const peaks=[];
    for(let i=1;i<count;i++){
      const expected=pitch*i;
      const near=bestIn(expected,pitch*.05);
      const wide=bestIn(expected,pitch*.16);
      peaks.push({
        index:i,expectedX:Number((x0+expected).toFixed(1)),
        nearX:Number((x0+near.x).toFixed(1)),nearScore:near.score,nearOffsetPitch:near.offsetPitch,
        nearConcurrence:near.concurrence,nearContinuity:near.continuity,
        peakX:Number((x0+wide.x).toFixed(1)),peakScore:wide.score,offsetPitch:wide.offsetPitch,
        concurrence:wide.concurrence,continuity:wide.continuity
      });
    }
    const isStrong=p=>p.peakScore>=.40&&p.concurrence>=.24&&p.continuity>=.10;
    const isNearStrong=p=>p.nearScore>=.40&&p.nearConcurrence>=.24&&p.nearContinuity>=.10;
    const clearNearCount=peaks.filter(isNearStrong).length;
    const strongWideCount=peaks.filter(isStrong).length;
    const strong=peaks.filter(isStrong);
    const meanAbsOffsetPitch=strong.length?strong.reduce((s,p)=>s+Math.abs(p.offsetPitch),0)/strong.length:0;
    const offsets=strong.map(p=>p.offsetPitch).sort((a,b)=>a-b);
    const commonOffsetPitch=offsets.length?offsets[Math.floor(offsets.length/2)]:0;

    const diag=document.createElement('canvas');diag.width=ctx.canvas.width;diag.height=ctx.canvas.height;
    const dctx=diag.getContext('2d');dctx.drawImage(ctx.canvas,0,0);
    dctx.save();dctx.lineWidth=1.5;
    dctx.strokeStyle='rgba(255,70,70,.92)';
    for(let i=1;i<count;i++){
      const x=x0+pitch*i;dctx.beginPath();dctx.moveTo(x,y0);dctx.lineTo(x,y1);dctx.stroke();
    }
    dctx.strokeStyle='rgba(40,220,255,.95)';
    for(const p of peaks){
      if(!isStrong(p))continue;
      dctx.beginPath();dctx.moveTo(p.peakX,y0);dctx.lineTo(p.peakX,y1);dctx.stroke();
    }
    const gh=Math.max(28,Math.round(h*.24)),gy=Math.max(0,y1-gh);
    dctx.fillStyle='rgba(0,0,0,.58)';dctx.fillRect(x0,gy,w,gh);
    dctx.strokeStyle='rgba(110,255,140,.95)';dctx.lineWidth=1.5;dctx.beginPath();
    for(let x=5;x<w-5;x++){
      const px=x0+x,py=gy+gh-3-Math.min(1,peakAt(x))*Math.max(8,gh-7);
      if(x===5)dctx.moveTo(px,py);else dctx.lineTo(px,py);
    }
    dctx.stroke();
    dctx.fillStyle='rgba(255,255,255,.96)';
    dctx.font='bold 10px -apple-system,BlinkMacSystemFont,sans-serif';
    dctx.fillText(`v77 dual-band signal  ±5%:${clearNearCount}/13  wide:${strongWideCount}/13  common:${commonOffsetPitch>=0?'+':''}${commonOffsetPitch.toFixed(3)} tile`,x0+5,gy+12);
    dctx.restore();

    return {
      ok:true,reason:'dual-band-continuity-diagnostic',clearNearCount,strongWideCount,
      meanAbsOffsetPitch:Number(meanAbsOffsetPitch.toFixed(4)),
      commonOffsetPitch:Number(commonOffsetPitch.toFixed(4)),
      pitch:Number(pitch.toFixed(3)),peaks,
      image:diag.toDataURL('image/jpeg',.88)
    };
  }

  function analyzeGuideCanvas(highCanvas){
    const highCtx=highCanvas.getContext('2d',{willReadFrequently:true});
    const low=document.createElement('canvas');
    low.width=Math.min(840,Math.max(420,highCanvas.width));
    low.height=Math.max(120,Math.round(highCanvas.height*(low.width/highCanvas.width)));
    const lowCtx=low.getContext('2d',{willReadFrequently:true});
    lowCtx.drawImage(highCanvas,0,0,low.width,low.height);
    const lowRow=locateTileRow(lowCtx);
    if(!lowRow)return {row:null,boxes:[],features:[],crops:[],trainingImages:[],perspectiveCount:0,gridUsed:false,gridFit:null,photo:highCanvas.toDataURL('image/jpeg',.80)};

    // v75: choose only among low-freedom row models (start + one common pitch).
    // v37-style independent seams remain disabled; v61 periodic evidence is only
    // a small, quality-gated candidate.
    const gridFit=fitGlobalRowGrid(lowCtx,lowRow,14);
    const outerFit=refineRowOuterEdges(lowCtx,lowRow,14);
    const qualityRow=selectRowByCropQuality(lowCtx,lowRow,outerFit,gridFit,14);
    const productionLowRow=qualityRow.row||lowRow;
    const boundarySignal=boundaryLikelihoodDiagnostics(lowCtx,productionLowRow,14);

    const sx=highCanvas.width/low.width,sy=highCanvas.height/low.height;
    const row={x:productionLowRow.x*sx,y:productionLowRow.y*sy,w:productionLowRow.w*sx,h:productionLowRow.h*sy};
    const initialBoxes=splitRow(row,14);

    // Only suspicious tiles may adjust a local boundary, and the adjacent
    // triplet must improve as a group before the change is adopted.
    const localRescue=rescueLocalBoundaries(highCtx,initialBoxes);
    const boxes=localRescue.boxes;
    const tileData=boxes.map((b,i)=>analyzeTileBox(highCtx,b,i,14));
    const cropBroken=tileData.map(x=>x.cropBroken===true);
    const rowStartDeltaPitch=Number.isFinite(qualityRow.startDeltaPitch)?qualityRow.startDeltaPitch:0;
    const rowPitchScale=Number.isFinite(qualityRow.pitchScale)?qualityRow.pitchScale:1;

    return {
      row,boxes,
      boundarySignal:{
        ok:boundarySignal.ok===true,reason:boundarySignal.reason||'',
        clearNearCount:boundarySignal.clearNearCount||0,strongWideCount:boundarySignal.strongWideCount||0,
        meanAbsOffsetPitch:boundarySignal.meanAbsOffsetPitch||0,commonOffsetPitch:boundarySignal.commonOffsetPitch||0,
        pitch:boundarySignal.pitch||0,peaks:boundarySignal.peaks||[]
      },
      boundaryDiagnosticImage:boundarySignal.image||null,
      features:tileData.map(x=>x.feature),
      inferenceViews:tileData.map(x=>x.inferenceFeatures),
      crops:tileData.map(x=>x.crop),
      trainingImages:tileData.map(x=>x.trainingImage),
      cropBroken,
      cropQualities:tileData.map((x,i)=>({
        score:Number((x.quality?.score||0).toFixed(4)),
        beforeScore:Number((x.qualityBefore?.score||0).toFixed(4)),
        broken:x.cropBroken===true,
        tileRatio:Number((x.quality?.tileRatio||0).toFixed(4)),
        centerRatio:Number((x.quality?.centerRatio||0).toFixed(4)),
        woodRatio:Number((x.quality?.woodRatio||0).toFixed(4)),
        edgeContamination:Number((x.quality?.edgeContamination||0).toFixed(4)),
        beforeEdgeContamination:Number((x.qualityBefore?.edgeContamination||0).toFixed(4)),
        leftTrim:Number((x.bleedTrimLeft||0).toFixed(4)),
        rightTrim:Number((x.bleedTrimRight||0).toFixed(4)),
        trimReason:x.cropTrimReason||'base',
        localBoundary:localRescue.debug?.[i]||null
      })),
      cropQualityFallbackCount:tileData.filter(x=>x.qualityFallback===true).length,
      brokenCropCount:cropBroken.filter(Boolean).length,
      cropAbnormalCount:cropBroken.filter(Boolean).length,
      resplitAdoptedCount:localRescue.adoptedCount||0,
      localBoundaryDebug:localRescue.debug||[],
      perspectiveCount:tileData.filter(x=>x.perspectiveUsed).length,
      bleedSafeCount:tileData.filter(x=>x.bleedInsetApplied===true).length,
      boundaryTrimCount:tileData.filter(x=>x.bleedInsetApplied===true).length,
      bleedShifts:tileData.map(x=>Number((x.bleedShift||0).toFixed(4))),
      bleedInsets:tileData.map(x=>({leftTrim:Number((x.bleedTrimLeft||0).toFixed(4)),rightTrim:Number((x.bleedTrimRight||0).toFixed(4)),reason:x.cropTrimReason||'base'})),
      gridUsed:qualityRow.reason==='periodic-candidate',
      gridCandidate:gridFit.used===true,
      outerFitUsed:qualityRow.reason==='outer-edge',
      rowCorrectionUsed:qualityRow.used===true,
      rowStartDeltaPitch,
      rowPitchScale,
      rowQuality:{
        reason:qualityRow.reason||'',
        scoreGain:Number.isFinite(qualityRow.scoreGain)?Number(qualityRow.scoreGain.toFixed(4)):null,
        brokenBefore:Number.isFinite(qualityRow.brokenBefore)?qualityRow.brokenBefore:null,
        brokenAfter:Number.isFinite(qualityRow.brokenAfter)?qualityRow.brokenAfter:null,
        edgeHighBefore:Number.isFinite(qualityRow.edgeHighBefore)?qualityRow.edgeHighBefore:null,
        edgeHighAfter:Number.isFinite(qualityRow.edgeHighAfter)?qualityRow.edgeHighAfter:null,
        startDeltaPitch:Number(rowStartDeltaPitch.toFixed(4)),
        pitchScale:Number(rowPitchScale.toFixed(5)),
        candidateOuter:outerFit.used===true,
        candidateGrid:gridFit.used===true
      },
      outerFit:{
        reason:outerFit.reason||'',
        leftMovePitch:Number.isFinite(outerFit.leftMovePitch)?Number(outerFit.leftMovePitch.toFixed(4)):null,
        rightMovePitch:Number.isFinite(outerFit.rightMovePitch)?Number(outerFit.rightMovePitch.toFixed(4)):null,
        pitchScale:Number.isFinite(outerFit.pitchScale)?Number(outerFit.pitchScale.toFixed(4)):null,
        meanSupport:Number.isFinite(outerFit.meanSupport)?Number(outerFit.meanSupport.toFixed(4)):null
      },
      gridFit:{
        reason:gridFit.reason||'',
        gain:Number.isFinite(gridFit.gain)?Number(gridFit.gain.toFixed(4)):null,
        offsetPitch:Number.isFinite(gridFit.offsetPitch)?Number(gridFit.offsetPitch.toFixed(4)):null,
        pitchScale:Number.isFinite(gridFit.pitchScale)?Number(gridFit.pitchScale.toFixed(4)):null,
        medianSupport:Number.isFinite(gridFit.medianSupport)?Number(gridFit.medianSupport.toFixed(4)):null
      },
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

  function shouldRunLegacyClassifier(primary,featureCount){
    return featureCount===14&&Number(primary?.unresolved||0)>0;
  }

  function resetLegacyPredictionStateForYolo(){
    state.predictionDebug=Array.from({length:14},()=>[]);
    state.confidenceReasons=Array(14).fill('yolo-primary');
    state.lastAuxViewsUsed=0;
    state.lastAuxFallbackCount=0;
    state.lastMicroRefined=0;
    state.lastRecognitionMs=0;
  }

  function showResult(analysis,detectorSource=null){
    const features=analysis.features||[],crops=analysis.crops||[],trainingImages=analysis.trainingImages||[];
    state.pendingFeatures=features.slice(0,14);
    state.pendingCrops=crops.slice(0,14);
    state.pendingTrainingImages=trainingImages.slice(0,14);
    state.pendingBroken=(analysis.cropBroken||[]).slice(0,14);
    window.M7V36PendingFeatures=state.pendingFeatures;
    const yoloFirst=chooseYoloPrimaryRecognition(analysis.yoloRecognition||[],[],analysis.detectorAdopted===true);
    let legacyPredicted=Array(14).fill('');
    let legacyClassifierRan=false;
    let primary=yoloFirst;
    if(shouldRunLegacyClassifier(yoloFirst,features.length)){
      legacyPredicted=predict(features,analysis.inferenceViews||[],state.pendingBroken);
      while(legacyPredicted.length<14)legacyPredicted.push('');
      primary=chooseYoloPrimaryRecognition(analysis.yoloRecognition||[],legacyPredicted,analysis.detectorAdopted===true);
      legacyClassifierRan=true;
    }else{
      resetLegacyPredictionStateForYolo();
    }
    const predicted=primary.labels.slice(0,14);
    analysis.yoloPrimary=primary;
    analysis.legacyClassifierRan=legacyClassifierRan;
    if(window.M7V36LastDiagnostics){
      window.M7V36LastDiagnostics.predictions=(state.predictionDebug||[]).map(x=>x.slice());
      window.M7V36LastDiagnostics.yoloPrimary={...primary,labels:primary.labels.slice(),sources:primary.sources.slice()};
      window.M7V36LastDiagnostics.legacyClassifierRan=legacyClassifierRan;
      window.M7V36LastDiagnostics.legacyRecognitionMs=state.lastRecognitionMs||0;
    }
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
      const firstCalibration=features.length===14&&learnedLabels===0&&primary.yoloUsed===0;
      const note=root.querySelector('.hand-result-note-m7v5');
      if(note)note.textContent=features.length===14
        ?(firstCalibration
          ?'この保存領域には学習データがありません。14枚を正しく指定してください。「この手牌で進む」を押した後、保存完了を確認してから次へ進みます。'
          :(primary.unresolved===0
            ?'14枚を自動認識しました。間違っている牌があれば、その牌をタップして修正してください。'
            :`自動認識できなかった牌が ${primary.unresolved} 枚あります。該当する牌をタップして確認・修正してください。`))
        :'白枠内から牌列を特定できませんでした。14枠を手動入力するか「読み取り直す」で再撮影してください。';
      if(analysis.yoloDetectorResult||analysis.detectorAdoptionReason){
        renderDetectorResult(root,analysis.yoloDetectorResult,analysis.detectorAdopted===true,analysis.detectorAdoptionReason||'');
      }else if(detectorSource){
        startDetectorDiagnostic(detectorSource,analysis,root);
      }
      const status=root.querySelector('.hand-result-status-m7v5');
      if(status)status.textContent=features.length===14
        ?(firstCalibration
          ?'初回学習：14枚を指定してください'
          :`自動認識 ${14-primary.unresolved}/14 / 要確認 ${primary.unresolved}枚${legacyClassifierRan?' / fallback使用':''}`)
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
      shutter.disabled=true;shutter.textContent='YOLOで14牌を分割中…';
      if(status?.querySelector('small'))status.querySelector('small').textContent='精度優先で牌そのものを検出しています。初回はモデル読込を含むため少し時間がかかります';
      await trainingReadyPromise;
      const baseAnalysis=analyzeGuideCanvas(capture.canvas);
      let detectorResult=null,analysis=baseAnalysis;
      try{
        detectorResult=await runYoloTileDetectorDiagnostic(capture.canvas,baseAnalysis.row||null);
        analysis=applyDetectorProductionCrops(capture.canvas,baseAnalysis,detectorResult);
      }catch(error){
        const code=detectorErrorCode(error);
        detectorResult={ok:false,error:code,count:0,highCount:0,elapsedMs:0,viewCount:0,boxes:[]};
        analysis={...baseAnalysis,yoloDetectorResult:detectorResult,detectorAdopted:false,detectorAdoptionReason:code,detectorGeometry:null};
      }
      state.diagnostics={
        sourceWidth:Math.round(capture.source.w),sourceHeight:Math.round(capture.source.h),
        rowFound:!!analysis.row,row:analysis.row?{...analysis.row}:null,
        gridUsed:analysis.gridUsed===true,gridCandidate:analysis.gridCandidate===true,gridFit:analysis.gridFit||null,
        outerFitUsed:analysis.outerFitUsed===true,outerFit:analysis.outerFit||null,rowQuality:analysis.rowQuality||null,
        rowCorrectionUsed:analysis.rowCorrectionUsed===true,rowStartDeltaPitch:analysis.rowStartDeltaPitch||0,rowPitchScale:analysis.rowPitchScale||1,
        cropQualityFallbackCount:analysis.cropQualityFallbackCount||0,brokenCropCount:analysis.brokenCropCount||0,
        boundaryTrimCount:analysis.boundaryTrimCount||0,resplitAdoptedCount:analysis.resplitAdoptedCount||0,
        localBoundaryDebug:analysis.localBoundaryDebug||[],cropQualities:analysis.cropQualities||[],boundarySignal:analysis.boundarySignal||null,
        detectorMode:'yolo11n-production-fastpath-v88',detectorAdopted:analysis.detectorAdopted===true,yoloAxisAligned:analysis.detectorAdopted===true,
        detectorAdoptionReason:analysis.detectorAdoptionReason||'',detectorGeometry:analysis.detectorGeometry||null,
        yoloDetector:analysis.yoloDetectorResult?{...analysis.yoloDetectorResult,image:undefined}:null,
        legacyClassifierRan:false,legacyRecognitionMs:0
      };
      window.M7V36LastDiagnostics=state.diagnostics;
      // Existing cancel owns the MediaStream and removes the camera overlay.
      overlay.querySelector('.realtime-hand-cancel-m7v3')?.click();
      showResult(analysis,null);
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

  function persistFailureText(result){
    const storage=result?.storage||state.storageDiagnostics||{};
    const parts=[result?.reason||'unknown'];
    if(storage?.error)parts.push(storage.error);
    if(storage?.firstError&&storage.firstError!==storage.error)parts.push('first='+storage.firstError);
    if(storage?.cleanup?.length)parts.push('cleanup='+storage.cleanup.length);
    return '保存失敗コード: '+parts.join(' / ');
  }

  function persistFailureUserText(result){
    const reason=String(result?.reason||'unknown');
    const storage=result?.storage||state.storageDiagnostics||{};
    const detail=String(storage?.error||storage?.firstError||'').toLowerCase();
    if(reason==='labels-incomplete')return '14枚すべての牌を確認・修正してから、もう一度「この手牌で進む」を押してください。';
    if(reason==='features-missing'||reason.startsWith('feature-invalid-'))return '認識データが不足しています。「読み取り直す」からもう一度撮影してください。';
    if(reason==='result-missing')return '結果画面を確認できませんでした。読み取り直してから、もう一度進んでください。';
    if(reason==='persist-exception')return '保存処理でエラーが発生しました。入力は残っているので、もう一度「この手牌で進む」を押してください。';
    if(reason==='durable-store-failed'||reason==='primary-readback-label-mismatch'||detail.includes('quota')){
      return '学習データを端末へ保存できませんでした。ブラウザの空き容量を確認してから、もう一度お試しください。入力した14枚は画面に残ります。';
    }
    if(reason==='raw-images-missing')return '学習用画像を保存できませんでした。入力は残っているので、読み取り直してから再度お試しください。';
    return '学習データを保存できませんでした。14枚の入力は残っているので、もう一度お試しください。';
  }

  async function persistVerifiedHand(root=document.getElementById('hand-result-overlay-m7v5')){
    if(!root)return {ok:false,reason:'result-missing',learned:0,rawSaved:false,rawVerified:false};
    if(persistPromises.has(root))return persistPromises.get(root);
    const promise=(async()=>{
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      const labels=buttons.map(b=>b.dataset.tile||'');
      if(buttons.length!==14||labels.some(x=>!x))return {ok:false,reason:'labels-incomplete',learned:0,rawSaved:false,rawVerified:false};
      if(state.pendingFeatures.length!==14)return {ok:false,reason:'features-missing',learned:0,rawSaved:false,rawVerified:false};

      const lib=activeLibrary(),raw=[];
      for(let i=0;i<14;i++){
        const label=labels[i],feature=state.pendingFeatures[i],imageDataUrl=state.pendingTrainingImages[i];
        if(!feature||feature.kind!==FEATURE_KIND)return {ok:false,reason:'feature-invalid-'+(i+1),learned:0,rawSaved:false,rawVerified:false};
        // v74: manual correction may still be used to continue the hand, but a
        // crop that failed the tile-face quality gate must never poison learning.
        if(state.pendingBroken[i])continue;
        const list=Array.isArray(lib[label])?lib[label]:[];
        if(!list.some(t=>core.featureDistance(feature,t)<.012)){
          list.unshift(feature);lib[label]=list.slice(0,MAX_TEMPLATES);
        }
        if(imageDataUrl)raw.push({label,imageDataUrl});
      }

      // IndexedDB raw images are the durable fallback. Save them first so a
      // localStorage quota/cache failure can never destroy this calibration.
      let rawSaved=false,rawVerified=false;
      if(raw.length){
        try{
          rawSaved=await saveTrainingBatch(raw);
          if(rawSaved){
            const rows=await loadTrainingSamples();
            const wanted=[...new Set(labels.filter((_,i)=>!state.pendingBroken[i]))];
            rawVerified=wanted.every(label=>rows.some(row=>row?.label===label&&row?.imageDataUrl));
          }
        }catch(_){rawSaved=false;rawVerified=false;}
      }

      // localStorage is now a fast cache, not a single point of failure.
      // Primary is verified directly; backup/meta failures do not invalidate
      // a verified primary. If raw IndexedDB is safe, stale backup may be
      // evicted to recover quota for the primary cache.
      const stable=saveLibraryDetailed(lib,{allowCleanup:true,allowBackupEviction:rawVerified});
      const verify=stable.primaryVerified?loadPrimaryLibrary():{};
      const learned=stable.primaryVerified?libraryLabels(verify).length:libraryLabels(lib).length;
      const allLabelsPresent=stable.primaryVerified&&[...new Set(labels)].every(label=>Array.isArray(verify[label])&&verify[label].length);

      if(stable.primaryVerified&&!allLabelsPresent){
        return {ok:false,reason:'primary-readback-label-mismatch',learned,rawSaved,rawVerified,storage:stable};
      }
      if(!stable.primaryVerified&&!rawVerified){
        return {ok:false,reason:raw.length?'durable-store-failed':'raw-images-missing',learned,rawSaved,rawVerified,storage:stable};
      }

      state.runtimeLibrary=lib;
      root.dataset.m7v59Persisted='1';
      state.librarySource=stable.primaryVerified?'stable':'raw';
      state.learnedLabelCount=learned;
      return {
        ok:true,reason:'',learned,rawSaved,rawVerified,storage:stable,
        storageMode:stable.primaryVerified?'stable'+(rawVerified?'+raw':''):'raw'
      };
    })();
    persistPromises.set(root,promise);
    return promise;
  }

  // Start persistence as soon as the verified-hand button is pressed.
  // ui-fixes waits for this exact promise before leaving the result screen.
  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    const status=root.querySelector('.hand-result-status-m7v5');
    if(status)status.textContent='学習データを保存中…';
    persistVerifiedHand(root).then(result=>{
      if(!result.ok&&root.isConnected){
        if(status)status.textContent='学習データの保存に失敗しました';
        const note=root.querySelector('.hand-result-note-m7v5');
        if(note)note.textContent=persistFailureUserText(result)+' '+persistFailureText(result);
      }
    });
  },true);

  window.M7CameraV36=Object.freeze({
    sourceRectForCover,locateTileRow,splitRow,boxCropQuality,canvasCropQuality,rowCropQuality,selectRowByCropQuality,rescueBrokenBox,tripletCropQuality,applyLocalBoundaryDelta,rescueLocalBoundaries,detectorWindows,detectorIoU,detectorNms,decodeYoloOutput,runYoloTileDetectorDiagnostic,detectorGeometryEvaluation,detectorSubsetCandidates,detectorMissingSlotFit,detectorRecoverThirteenCandidates,selectDetectorProductionBoxes,yoloLabelToAppTile,shouldRunLegacyClassifier,mountDetectorDiagnostic,yoloRecognitionFromBoxes,chooseYoloPrimaryRecognition,axisAlignedYoloFaceCanvas,analyzeYoloTileBox,applyDetectorProductionCrops,renderDetectorResult,detectorFailureUserText,boundaryLikelihoodDiagnostics,refineRowOuterEdges,fitGlobalRowGrid,splitRowBySeams,analyzeGuideCanvas,featureFromBox,tileFaceRect,descriptorFromCanvas,detectFaceGeometry,detectFaceQuad,canonicalizeCanvas,orientedFaceCanvas,perspectiveFaceCanvas,warpQuadToCanvas,trainingImageDataUrl,estimateBleedSafeShift,safeInsetWindow,chooseRecognitionWindow,innerRecognitionCanvas,innerRecognitionWindowCanvas,innerFeatureFromCanonical,inferenceFeatureViews,analyzeTileBox,loadTrainingSamples,rebuildLibraryFromTrainingImages,loadLibrary,activeLibrary,saveLibrary,saveLibraryDetailed,persistVerifiedHand,persistFailureText,persistFailureUserText,loadLegacyLibrary,legacyLibraryKeys,convertLegacyDirectFeature,cropResampleFeatureMap,confidenceAssessment,confidentCandidate,confidenceReasonSummary,renderPickerPhoto,renderPickerSuggestions,pickerCurrentIndex,schedulePickerSuggestionSync,attachPickerSuggestionObserver
  });
})();
