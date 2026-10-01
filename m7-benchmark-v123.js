// MAKI v124: on-device recognition benchmark / error logger (v123 DB preserved).
// This module does NOT change recognition decisions. It records the exact
// camera result, detector diagnostics and the human-confirmed correction.
(()=>{
  'use strict';

  const VERSION='MAKI v125';
  const DB_NAME='maki-recognition-benchmark-v123';
  const DB_VERSION=1;
  const STORE='cases';
  const MAX_CASES=50;
  const CAPTURE_QUALITY=.90;
  let pendingCapture=null;
  let pendingMountTimer=0;
  const liveCases=new Map();

  function safeClone(value){
    try{return value==null?value:JSON.parse(JSON.stringify(value));}catch(_){return null;}
  }

  function rawLabelToTile(raw){
    const s=String(raw||'').trim();
    const honor={'1z':'東','2z':'南','3z':'西','4z':'北','5z':'白','6z':'發','7z':'中'};
    if(honor[s])return honor[s];
    const m=s.match(/^([0-9])([mps])$/);
    if(!m)return '';
    const n=m[1]==='0'?5:Number(m[1]);
    if(!(n>=1&&n<=9))return '';
    return String(n)+(m[2]==='m'?'萬':m[2]==='p'?'筒':'索');
  }

  function tileSuit(tile){
    const m=String(tile||'').match(/^5(萬|筒|索)$/);
    if(!m)return '';
    return m[1]==='萬'?'m':m[1]==='筒'?'p':'s';
  }

  function reconstructSelectedRaw(detector,geometry,targetCount=14){
    const raw=(detector?.boxes||[]).filter(b=>b&&Number.isFinite(Number(b.x))).map((b,rawIndex)=>({
      ...b,rawIndex:Number.isInteger(b.rawIndex)?b.rawIndex:rawIndex
    })).sort((a,b)=>(Number(a.x)||0)-(Number(b.x)||0));
    const stats=geometry||{};
    const dropped=new Set((stats.dropped||[]).map(x=>Number(x?.rawIndex)).filter(Number.isInteger));
    const droppedOverlap=stats.droppedOverlapRawIndex;
    if(droppedOverlap!==null&&droppedOverlap!==undefined&&droppedOverlap!==''&&Number.isInteger(Number(droppedOverlap)))dropped.add(Number(droppedOverlap));
    let selected=raw.filter(b=>!dropped.has(Number(b.rawIndex)));
    const missing=(Array.isArray(stats.missingIndexes)?stats.missingIndexes:[])
      .map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<targetCount).sort((a,b)=>a-b);
    const singleMissing=stats.missingIndex;
    if(!missing.length&&singleMissing!==null&&singleMissing!==undefined&&singleMissing!==''&&Number.isInteger(Number(singleMissing))){
      const x=Number(singleMissing);if(x>=0&&x<targetCount)missing.push(x);
    }
    const slots=[];
    let sourceIndex=0;
    for(let i=0;i<targetCount;i++){
      if(missing.includes(i))slots.push(null);
      else slots.push(selected[sourceIndex++]||null);
    }
    // Exact/subset cases normally have no synthetic slots.
    if(!missing.length&&selected.length>=targetCount)return selected.slice(0,targetCount);
    return slots;
  }

  function selectedRawEvidence(record){
    const detector=record?.initial?.diagnostics?.yoloDetector||{};
    const geometry=record?.initial?.diagnostics?.detectorGeometry||{};
    return reconstructSelectedRaw(detector,geometry,14).map((b,index)=>b?{
      index,
      rawLabel:String(b.label||''),
      tile:rawLabelToTile(b.label),
      score:Number(b.score)||0,
      runnerRawLabel:String(b.runnerLabel||''),
      runnerTile:rawLabelToTile(b.runnerLabel),
      runnerScore:Number(b.runnerScore)||0,
      classMargin:Number(b.classMargin)||0,
      crossViewSupport:Math.max(1,Number(b.crossViewSupport)||1),
      crossViewCount:Math.max(1,Number(b.crossViewCount)||1),
      crossViewShare:Number.isFinite(Number(b.crossViewShare))?Number(b.crossViewShare):1
    }:null);
  }

  function classifyCase(record){
    const categories=new Set();
    const initial=record?.initial||{};
    const final=record?.final||null;
    const reason=String(initial?.diagnostics?.detectorAdoptionReason||'');
    const unresolved=Number(initial.unresolved)||0;
    if(reason.startsWith('subset-'))categories.add('DETECTION_SUBSET');
    if(reason.startsWith('recover-'))categories.add('DETECTION_RECOVERY');
    if(unresolved>0)categories.add('SAFE_ABSTENTION');
    if(unresolved===0)categories.add('AUTO_14_14');

    const evidence=selectedRawEvidence(record);
    let rawRedSuitConflict=false;
    for(let i=0;i<14;i++){
      const e=evidence[i];if(!e||!/^0[mps]$/.test(e.rawLabel))continue;
      const reference=final?.labels?.[i]||initial.labels?.[i]||'';
      const expectedSuit=tileSuit(reference);
      const rawSuit=e.rawLabel[1];
      if(expectedSuit&&rawSuit!==expectedSuit)rawRedSuitConflict=true;
    }
    if(rawRedSuitConflict)categories.add('RED5_SUIT_CONFUSION_RAW');

    if(final){
      const corrected=Array.isArray(final.correctedIndexes)?final.correctedIndexes:[];
      const wrong=Array.isArray(final.autoWrongCorrectedIndexes)?final.autoWrongCorrectedIndexes:[];
      const filled=Array.isArray(final.unresolvedFilledIndexes)?final.unresolvedFilledIndexes:[];
      if(corrected.length)categories.add('MANUAL_CORRECTION');
      if(wrong.length)categories.add('AUTO_WRONG_CORRECTED');
      if(filled.length)categories.add('SAFE_ABSTENTION_CONFIRMED');
      for(const i of wrong){if((Number(evidence[i]?.score)||0)>=.50){categories.add('HIGH_CONFIDENCE_WRONG');break;}}
      if(!corrected.length&&unresolved===0)categories.add('SUCCESS_14_14');
      if(rawRedSuitConflict&&!wrong.length)categories.add('RED5_REPAIRED_OR_DISPLAY_SAFE');
    }
    return [...categories];
  }

  function openDb(){
    return new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(new Error('indexeddb-unavailable'));return;}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:'id'});
          store.createIndex('createdAt','createdAt',{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('indexeddb-open-failed'));
    });
  }

  async function withStore(mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
      let value;
      try{value=fn(store,tx);}catch(error){db.close();reject(error);return;}
      tx.oncomplete=()=>{db.close();resolve(value);};
      tx.onerror=()=>{const error=tx.error||new Error('indexeddb-transaction-failed');db.close();reject(error);};
      tx.onabort=()=>{const error=tx.error||new Error('indexeddb-transaction-aborted');db.close();reject(error);};
    });
  }

  async function getCase(id){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(id);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error||new Error('case-read-failed'));
      tx.oncomplete=()=>db.close();
    });
  }

  async function listCases(){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)));
      req.onerror=()=>reject(req.error||new Error('case-list-failed'));
      tx.oncomplete=()=>db.close();
    });
  }

  async function trimCases(){
    const rows=await listCases();
    const extra=rows.slice(MAX_CASES);
    if(!extra.length)return;
    await withStore('readwrite',store=>{extra.forEach(row=>store.delete(row.id));});
  }

  function metadataOnly(record){
    const copy=safeClone(record)||{};
    copy.images={
      detectorAnnotated:'',
      crops:[],
      rawGuideFrame:'',
      omittedDueToQuota:true
    };
    copy.storageMode='metadata-only';
    return copy;
  }

  async function saveCase(record){
    record.categories=classifyCase(record);
    try{
      await withStore('readwrite',store=>store.put(record));
      record.storageMode=record.storageMode||'full';
    }catch(error){
      const fallback=metadataOnly(record);
      await withStore('readwrite',store=>store.put(fallback));
      Object.assign(record,fallback);
    }
    trimCases().catch(()=>{});
    return record;
  }

  function captureGuideFrameForLog(shutter){
    try{
      const overlay=shutter?.closest?.('#realtime-hand-camera-m7v3')||document.getElementById('realtime-hand-camera-m7v3');
      const video=overlay?.querySelector('.realtime-hand-video-m7v3');
      const guide=overlay?.querySelector('.realtime-hand-guide-box-m7v3');
      const helper=window.M7CameraV36?.sourceRectForCover;
      if(!overlay||!video||!guide||typeof helper!=='function'||video.readyState<2||!video.videoWidth)return null;
      const vr=video.getBoundingClientRect(),gr=guide.getBoundingClientRect();
      const relative={x:gr.left-vr.left,y:gr.top-vr.top,w:gr.width,h:gr.height};
      const src=helper(video.videoWidth,video.videoHeight,vr.width,vr.height,relative);
      if(!src)return null;
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(src.w));canvas.height=Math.max(1,Math.round(src.h));
      canvas.getContext('2d').drawImage(video,src.x,src.y,src.w,src.h,0,0,canvas.width,canvas.height);
      return {dataUrl:canvas.toDataURL('image/jpeg',CAPTURE_QUALITY),width:canvas.width,height:canvas.height,capturedAt:Date.now()};
    }catch(_){return null;}
  }

  function backgroundDataUrl(button){
    const raw=String(button?.style?.backgroundImage||'');
    const m=raw.match(/^url\(["']?(data:image\/[^"')]+)["']?\)$/i);
    return m?m[1]:'';
  }

  function currentButtons(root){return [...(root?.querySelectorAll('.hand-result-tile-m7v5')||[])];}

  function rawLabelsFromButtons(buttons,labels){
    return buttons.map((b,i)=>{
      const raw=String(b.dataset.m7v119RawLabel||'');
      return raw&&rawLabelToTile(raw)===labels[i]?raw:'';
    });
  }

  function captureInitialRecord(root){
    const buttons=currentButtons(root);
    if(buttons.length!==14)return null;
    const labels=buttons.map(b=>String(b.dataset.tile||''));
    const diag=safeClone(window.M7V36LastDiagnostics||{})||{};
    const rawLabels=Array.isArray(window.M7V119PendingRawLabels)?window.M7V119PendingRawLabels.slice(0,14):rawLabelsFromButtons(buttons,labels);
    while(rawLabels.length<14)rawLabels.push('');
    const img=root.querySelector('.m7v85-detector-body img');
    const caseId='v123-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const primary=diag.yoloPrimary||{};
    const unresolved=Number(primary.unresolved)||labels.filter(x=>!x).length;
    const record={
      id:caseId,
      version:VERSION,
      createdAt:Date.now(),
      phase:'captured',
      storageMode:'full',
      initial:{
        labels:labels.slice(),
        rawLabels:rawLabels.slice(),
        unresolved,
        autoRecognized:14-unresolved,
        statusText:String(root.querySelector('.hand-result-status-m7v5')?.textContent||''),
        detailLabel:String(root.querySelector('.m7v78-detector-label')?.textContent||''),
        detailMeta:String(root.querySelector('.m7v85-detector-meta')?.textContent||''),
        classDiagnosticText:String(root.querySelector('.m7v95-class-diagnostic')?.textContent||''),
        diagnostics:diag
      },
      images:{
        rawGuideFrame:pendingCapture?.dataUrl||'',
        rawGuideWidth:Number(pendingCapture?.width)||0,
        rawGuideHeight:Number(pendingCapture?.height)||0,
        detectorAnnotated:String(img?.src||''),
        crops:buttons.map((b,index)=>({index,dataUrl:backgroundDataUrl(b)})).filter(x=>x.dataUrl)
      },
      final:null,
      categories:[]
    };
    record.initial.selectedRawEvidence=selectedRawEvidence(record);
    record.categories=classifyCase(record);
    root.dataset.makiV123CaseId=caseId;
    liveCases.set(caseId,record);
    pendingCapture=null;
    return record;
  }

  function finalStateFromRoot(root,record,labelsOverride=null){
    const buttons=currentButtons(root);
    const override=Array.isArray(labelsOverride)&&labelsOverride.length===14?labelsOverride.map(x=>String(x||'')):null;
    const labels=override||buttons.map(b=>String(b.dataset.tile||''));
    const rawLabels=rawLabelsFromButtons(buttons,labels);
    const initialLabels=record?.initial?.labels||Array(14).fill('');
    const initialRaw=record?.initial?.rawLabels||Array(14).fill('');
    const correctedIndexes=[],unresolvedFilledIndexes=[],autoWrongCorrectedIndexes=[],rawCorrectedIndexes=[];
    for(let i=0;i<14;i++){
      const labelChanged=labels[i]!==String(initialLabels[i]||'');
      const rawChanged=String(rawLabels[i]||'')!==String(initialRaw[i]||'');
      if(labelChanged||rawChanged)correctedIndexes.push(i);
      if(!initialLabels[i]&&labels[i])unresolvedFilledIndexes.push(i);
      if(initialLabels[i]&&labels[i]&&labels[i]!==initialLabels[i])autoWrongCorrectedIndexes.push(i);
      if(rawChanged)rawCorrectedIndexes.push(i);
    }
    return {
      confirmedAt:Date.now(),
      labels,rawLabels,
      correctedIndexes,unresolvedFilledIndexes,autoWrongCorrectedIndexes,rawCorrectedIndexes,
      manualCorrectionCount:correctedIndexes.length
    };
  }

  async function finalizeCase(root,labelsOverride=null){
    const id=String(root?.dataset?.makiV123CaseId||'');if(!id)return null;
    const record=liveCases.get(id)||await getCase(id);if(!record)return null;
    record.final=finalStateFromRoot(root,record,labelsOverride);
    record.phase='confirmed';
    record.categories=classifyCase(record);
    await saveCase(record);
    liveCases.set(id,record);
    updateLoggerUi(root,record);
    return record;
  }

  function makeLoggerUi(root,record){
    const body=root?.querySelector('.m7v85-detector-body');if(!body)return null;
    body.querySelector('.maki-v123-benchmark-ui')?.remove();
    const wrap=document.createElement('div');wrap.className='maki-v123-benchmark-ui';
    wrap.style.cssText='display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px;padding-top:5px;border-top:1px dashed rgba(0,0,0,.18);font:700 10px/1.25 -apple-system,BlinkMacSystemFont,sans-serif;';
    const status=document.createElement('span');status.className='maki-v123-benchmark-status';
    status.textContent='v124認識ログ：端末内へ保存中…';
    const share=document.createElement('button');share.type='button';share.className='maki-v123-share-case';share.textContent='このログを共有';
    const all=document.createElement('button');all.type='button';all.className='maki-v123-export-index';all.textContent='ログ一覧';
    const copy=document.createElement('button');copy.type='button';copy.className='maki-v124-copy-index';copy.textContent='JSON本文コピー';
    [share,all,copy].forEach(b=>b.style.cssText='border:1px solid rgba(0,0,0,.18);border-radius:7px;background:#fff;padding:4px 7px;font:800 10px/1.1 inherit;');
    wrap.append(status,share,all,copy);body.appendChild(wrap);
    share.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();exportCase(record.id).catch(()=>{});});
    all.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();exportIndex().catch(()=>{});});
    copy.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      copyIndexText().then(()=>{copy.textContent='コピー済み';setTimeout(()=>{copy.textContent='JSON本文コピー';},1300);}).catch(()=>{copy.textContent='コピー失敗';setTimeout(()=>{copy.textContent='JSON本文コピー';},1300);});
    });
    return wrap;
  }

  function updateLoggerUi(root,record){
    const status=root?.querySelector('.maki-v123-benchmark-status');if(!status)return;
    const cats=(record?.categories||[]).filter(x=>x!=='AUTO_14_14');
    status.textContent='v124認識ログ：保存済み'+(cats.length?' / '+cats.slice(0,3).join('・'):'');
  }

  async function mountResultLogger(){
    const root=document.getElementById('hand-result-overlay-m7v5');
    if(!root||root.dataset.makiV123Logged==='1')return;
    const buttons=currentButtons(root);if(buttons.length!==14)return;
    // Camera decorates crops and detector details shortly after the result root is created.
    if(!root.querySelector('.m7v78-detector-diagnostic'))return;
    root.dataset.makiV123Logged='1';
    const record=captureInitialRecord(root);if(!record)return;
    makeLoggerUi(root,record);
    try{await saveCase(record);updateLoggerUi(root,record);}catch(_){
      const status=root.querySelector('.maki-v123-benchmark-status');if(status)status.textContent='v124認識ログ：保存できませんでした';
    }
  }

  function scheduleMount(){
    clearTimeout(pendingMountTimer);
    pendingMountTimer=setTimeout(()=>{mountResultLogger().catch(()=>{});},180);
  }

  function sanitizeForIndex(record){
    return {
      id:record.id,version:record.version,createdAt:record.createdAt,phase:record.phase,storageMode:record.storageMode,
      categories:record.categories||[],
      initial:{
        labels:record.initial?.labels||[],rawLabels:record.initial?.rawLabels||[],unresolved:record.initial?.unresolved||0,
        autoRecognized:record.initial?.autoRecognized||0,statusText:record.initial?.statusText||'',detailLabel:record.initial?.detailLabel||'',
        detailMeta:record.initial?.detailMeta||'',classDiagnosticText:record.initial?.classDiagnosticText||'',
        selectedRawEvidence:record.initial?.selectedRawEvidence||[],diagnostics:record.initial?.diagnostics||{}
      },
      final:record.final||null
    };
  }

  async function shareJson(name,payload){
    const json=JSON.stringify(payload,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const file=new File([blob],name,{type:'application/json'});
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:name});return;
    }
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function exportCase(id){
    const record=await getCase(id);if(!record)throw new Error('case-not-found');
    return shareJson('MAKI_v125_case_'+id+'.json',record);
  }

  function benchmarkIndexPayload(rows){
    return {version:VERSION,exportedAt:Date.now(),count:rows.length,cases:rows.map(sanitizeForIndex)};
  }

  async function exportIndex(){
    const rows=await listCases();
    return shareJson('MAKI_v125_benchmark_index.json',benchmarkIndexPayload(rows));
  }

  async function copyIndexText(){
    const rows=await listCases();
    const payload=benchmarkIndexPayload(rows);
    const json=JSON.stringify(payload,null,2);
    if(navigator.clipboard?.writeText){
      try{await navigator.clipboard.writeText(json);return payload;}catch(_){}
    }
    window.prompt('JSON本文をコピーしてください',json);
    return payload;
  }

  async function clearCases(){await withStore('readwrite',store=>store.clear());}

  const api={
    VERSION,DB_NAME,STORE,MAX_CASES,rawLabelToTile,reconstructSelectedRaw,selectedRawEvidence,classifyCase,benchmarkIndexPayload,
    getCase,listCases,saveCase,exportCase,exportIndex,copyIndexText,clearCases
  };
  if(typeof window!=='undefined'){const frozen=Object.freeze(api);window.MAKIV125Benchmark=frozen;window.MAKIV124Benchmark=frozen;window.MAKIV123Benchmark=frozen;}
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;

  // Capture the unannotated guide frame before the camera owner handles the shutter click.
  document.addEventListener('click',e=>{
    const shutter=e.target.closest?.('.m7v36-shutter');
    if(shutter)pendingCapture=captureGuideFrameForLog(shutter);
  },true);

  // This listener is intentionally registered before ui-fixes.js. ui-fixes owns
  // navigation and stops the event, while v123 only records the human-confirmed truth.
  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    finalizeCase(root).catch(()=>{});
  },true);

  // v124 confirmation backup: ui-fixes publishes the verified 14 tiles before
  // removing the result overlay. Use that authoritative event as a second path
  // so a slow IndexedDB/share UI cannot leave a user-confirmed case as captured.
  window.addEventListener('maki:verified-hand',e=>{
    const tiles=Array.isArray(e.detail?.tiles)?e.detail.tiles.slice(0,14):[];
    if(tiles.length!==14)return;
    const root=document.getElementById('hand-result-overlay-m7v5');
    if(root)finalizeCase(root,tiles).catch(()=>{});
  });

  const observer=new MutationObserver(()=>scheduleMount());
  const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});scheduleMount();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();