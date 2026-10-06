'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json',
  '.png':'image/png'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const target=path.resolve(root,rel);
  if(!target.startsWith(root+path.sep)&&target!==path.join(root,'index.html')){
    res.writeHead(403);return res.end();
  }
  fs.readFile(target,(err,bytes)=>{
    if(err){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
    res.end(bytes);
  });
});
(async()=>{
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port=server.address().port;
    const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
    browser=await puppeteer.launch({executablePath:chrome,headless:true,
      args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-networking']});
    const page=await browser.newPage();
    await page.setViewport({width:932,height:430,deviceScaleFactor:1,isMobile:true,hasTouch:true});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#go-confirm-button',{timeout:12000});
    assert.equal(await page.$eval('#app-build-badge',e=>e.textContent.trim()),'MAKI v131');
    assert.equal(await page.$eval('#app-build-badge',e=>e.hidden),false,'v130 build badge should be visible during development');
    assert(await page.evaluate(()=>!!window.M7V36CameraOwner),'v98 camera owner must bootstrap');
    assert(await page.evaluate(()=>!!window.MAKIV130Benchmark),'v130 recognition benchmark logger must bootstrap');
    await page.evaluate(()=>{
      const overlay=document.createElement('div');
      overlay.id='realtime-hand-camera-m7v3';
      overlay.innerHTML='<video class="realtime-hand-video-m7v3"></video><div class="realtime-hand-guide-m7v3"><div class="realtime-hand-guide-box-m7v3"></div></div><div class="realtime-hand-status-m7v3"><b></b><span id="realtime-hand-count-m7v3"></span><small></small></div><button class="realtime-hand-cancel-m7v3"></button>';
      document.body.appendChild(overlay);
      document.getElementById('open-realtime-hand-camera-m7v3')?.click();
    });
    const v89DebugBadge=await page.evaluate(()=>{
      history.replaceState({},'',location.pathname+'?debug=1');
      const enabled=window.MAKIDebugV89?.apply?.();
      const hidden=document.getElementById('app-build-badge')?.hidden;
      history.replaceState({},'',location.pathname);
      window.MAKIDebugV89?.apply?.();
      return {enabled,hidden};
    });
    assert.equal(v89DebugBadge.enabled,true,'v89 debug query should enable build badge '+JSON.stringify(v89DebugBadge));
    assert.equal(v89DebugBadge.hidden,false,'v89 debug build badge stayed hidden '+JSON.stringify(v89DebugBadge));
    const m8BridgeV87=await page.evaluate(()=>{
      const hand=['1萬','1萬','1萬','2萬','3萬','4萬','2筒','3筒','4筒','6索','7索','8索','東','東'];
      window.m8WinningTileV7='9萬';window.m8SuggestedFuV21=50;window.m8SuggestedHanV23=3;
      window.m8MeldStateV21={'1萬':'pon'};window.m8CachedHandV15={tiles:['old']};
      let eventTiles=null;
      const onHand=e=>{eventTiles=e.detail?.tiles?.slice()||null;};
      window.addEventListener('maki:verified-hand',onHand,{once:true});
      const accepted=window.acceptVerifiedHandM8V87(hand,{show:true});
      const title=document.querySelector('#m8-result-v1 h2')?.textContent||'';
      const state={
        accepted:accepted.ok===true,
        sameLast:Array.isArray(window.m8LastTilesV8)&&window.m8LastTilesV8.join('|')===hand.join('|'),
        same18:Array.isArray(window.m8HandStateV18?.tiles)&&window.m8HandStateV18.tiles.join('|')===hand.join('|'),
        same19:Array.isArray(window.m8HandStateV19?.tiles)&&window.m8HandStateV19.tiles.join('|')===hand.join('|'),
        win:window.m8WinningTileV7,fu:window.m8SuggestedFuV21,han:window.m8SuggestedHanV23,
        meldKeys:Object.keys(window.m8MeldStateV21||{}).length,cached:window.m8CachedHandV15,
        eventSame:Array.isArray(eventTiles)&&eventTiles.join('|')===hand.join('|'),
        title
      };
      const before=window.m8LastTilesV8.slice();
      const invalid=window.acceptVerifiedHandM8V87(hand.slice(0,13),{show:false});
      state.invalidRejected=invalid.ok===false;
      state.invalidKept=window.m8LastTilesV8.join('|')===before.join('|');
      document.getElementById('m8-result-v1')?.remove();
      return state;
    });
    assert.equal(m8BridgeV87.accepted,true,'v87 verified hand bridge rejected a valid 14-tile hand '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.sameLast,true,'v87 did not publish m8LastTilesV8 '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.same18,true,'v87 did not publish m8HandStateV18 '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.same19,true,'v87 did not publish m8HandStateV19 '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.win,null,'v87 kept a stale winning tile '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.fu,null,'v87 kept stale fu '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.han,null,'v87 kept stale han '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.meldKeys,0,'v87 kept stale meld state '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.cached,null,'v87 kept stale cached hand '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.eventSame,true,'v87 verified-hand event missing/wrong '+JSON.stringify(m8BridgeV87));
    assert(m8BridgeV87.title.includes('アガリ形です'),'v87 did not open M8 analysis for a valid winning hand '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.invalidRejected,true,'v87 accepted a 13-tile hand into M8 state '+JSON.stringify(m8BridgeV87));
    assert.equal(m8BridgeV87.invalidKept,true,'v87 invalid hand mutated the last valid M8 hand '+JSON.stringify(m8BridgeV87));

    const v88FriendlyErrors=await page.evaluate(()=>{
      const camera=window.M7CameraV36;
      return {
        model:camera.detectorFailureUserText('model-load-failed'),
        count13:camera.detectorFailureUserText('count-13'),
        count17:camera.detectorFailureUserText('count-17'),
        ambiguous:camera.detectorFailureUserText('subset-ambiguous'),
        quota:camera.persistFailureUserText({reason:'durable-store-failed',storage:{error:'QuotaExceededError'}}),
        incomplete:camera.persistFailureUserText({reason:'labels-incomplete'}),
        invalid:window.MAKIV88?.verifiedHandFailureText({reason:'invalid-tiles'})||'',
        tooMany:window.MAKIV88?.verifiedHandFailureText({reason:'too-many-5筒'})||''
      };
    });
    assert(v88FriendlyErrors.model.includes('通信状態'),'v88 model failure is not actionable '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.count13.includes('14枚'),'v88 count-13 guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.count17.includes('14枚だけ'),'v88 excess detection guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.ambiguous.includes('横一列'),'v88 ambiguous guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.quota.includes('空き容量'),'v88 quota guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.incomplete.includes('14枚すべて'),'v88 incomplete save guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.invalid.includes('14枚すべて'),'v88 M8 invalid-hand guidance missing '+JSON.stringify(v88FriendlyErrors));
    assert(v88FriendlyErrors.tooMany.includes('最大4枚'),'v88 M8 duplicate guidance missing '+JSON.stringify(v88FriendlyErrors));

    const duplicateGuard=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const mk=(group,scores,values)=>{
        const yolo=Array.from({length:14},(_,i)=>({label:'東',score:.9}));
        const features=Array.from({length:14},()=>Array(4).fill(0));
        group.forEach((idx,j)=>{yolo[idx]={label:'4萬',score:scores[j]};features[idx]=Array(4).fill(values[j]);});
        return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
      };
      return {
        farPair:mk([3,7],[.9,.3],[0,1]),
        coherentTriple:mk([3,6,7],[.90,.88,.86],[0,.03,.05]),
        oneOutlier:mk([3,6,7],[.90,.88,.40],[0,.02,1]),
        incoherentWeakTriple:mk([3,6,7],[.92,.56,.34],[0,1,-1]),
        incoherentStrongTriple:mk([3,6,7],[.92,.90,.89],[0,1,-1])
      };
    });
    assert.deepEqual(duplicateGuard.farPair,[7],'v96 should challenge only the weaker member of a wildly inconsistent same-label pair '+JSON.stringify(duplicateGuard));
    assert.deepEqual(duplicateGuard.coherentTriple,[],'v92 must keep a coherent triplet '+JSON.stringify(duplicateGuard));
    assert.deepEqual(duplicateGuard.oneOutlier,[7],'v92 should challenge only the weak visual outlier '+JSON.stringify(duplicateGuard));
    assert.deepEqual(duplicateGuard.incoherentWeakTriple,[7],'v97 should challenge only the weakest member of an incoherent weak 3+ duplicate group '+JSON.stringify(duplicateGuard));
    assert.deepEqual(duplicateGuard.incoherentStrongTriple,[],'v92 should not overrule uniformly strong YOLO labels on appearance alone '+JSON.stringify(duplicateGuard));

    const v97StrongNorth=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1萬',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[11]={label:'北',score:.94,classMargin:.94};
      yolo[12]={label:'北',score:.84,classMargin:.84};
      yolo[13]={label:'北',score:.90,classMargin:.90};
      features[11]=[0,0,0,0];features[12]=[1,1,1,1];features[13]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v97StrongNorth,[],'v97 must keep a strong 北北北 group even when crop appearance varies '+JSON.stringify(v97StrongNorth));

    const v99NorthTriplet=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1筒',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[11]={label:'北',score:.89,classMargin:.89};
      yolo[12]={label:'北',score:.65,classMargin:.65};
      yolo[13]={label:'北',score:.86,classMargin:.86};
      features[11]=[0,0,0,0];features[12]=[1,1,1,1];features[13]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v99NorthTriplet,[],'v99 must preserve a confident 北北北 triplet with one medium-score member '+JSON.stringify(v99NorthTriplet));

    const v130BenchmarkCopy=await page.evaluate(async()=>{
      const api=window.MAKIV130Benchmark;
      const rows=[
        {version:'MAKI v128',phase:'confirmed',initial:{labels:['4萬'],rawLabels:[''],captureQuality:{recommendation:'ok'}},final:{labels:['8萬'],rawLabels:[''],manualCorrectionCount:1}},
        {version:'MAKI v129',phase:'confirmed',initial:{labels:['8萬'],rawLabels:[''],captureQuality:{recommendation:'ok'}},final:{labels:['8萬'],rawLabels:[''],manualCorrectionCount:0}}
      ];
      const summary=api.benchmarkSummaryPayload(rows);
      return {versions:summary.perVersion.map(x=>({version:x.version,wrongAuto:x.wrongAuto,precision:x.autoConfirmPrecision})),hasCopy:typeof api.copyBenchmarkSummaryText==='function'&&typeof api.copyCorrectedCropsText==='function'};
    });
    assert.equal(v130BenchmarkCopy.hasCopy,true,'v130 direct-copy APIs must bootstrap '+JSON.stringify(v130BenchmarkCopy));
    assert.deepEqual(v130BenchmarkCopy.versions.map(x=>x.version),['MAKI v128','MAKI v129'],
      'v130 benchmark summary must keep comparable version buckets '+JSON.stringify(v130BenchmarkCopy));
    assert.equal(v130BenchmarkCopy.versions[0].wrongAuto,1,'v130 v128 bucket should preserve the observed wrong auto decision '+JSON.stringify(v130BenchmarkCopy));
    assert.equal(v130BenchmarkCopy.versions[1].wrongAuto,0,'v130 v129 bucket should preserve the correct auto decision '+JSON.stringify(v130BenchmarkCopy));

    const v129ManzuMemory=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const previous=api.loadLibrary();
      api.saveLibrary({
        '2萬':[[.50,.50,.50,.50],[.52,.52,.52,.52]],
        '4萬':[[1,1,1,1],[.98,.98,.98,.98]],
        '8萬':[[0,0,0,0],[.02,.02,.02,.02],[.01,.01,.01,.01]]
      });
      const yolo=Array.from({length:14},()=>({label:'東',score:.9}));
      const features=Array.from({length:14},()=>[.3,.3,.3,.3]);
      yolo[3]={label:'4萬',score:.88};features[3]=[.01,.01,.01,.01];
      yolo[4]={label:'4萬',score:.88};features[4]=[.99,.99,.99,.99];
      const conflicts=api.yoloV129Manzu248MemoryConflicts(yolo,features,true);
      const evidence={bad:yolo[3].v129MemoryVerifier,good:yolo[4].v129MemoryVerifier};
      if(previous&&Object.keys(previous).length)api.saveLibrary(previous);
      else{
        localStorage.removeItem('MahjongScoreApp_tile_templates_stable1');
        localStorage.removeItem('MahjongScoreApp_tile_templates_stable1_backup');
      }
      return {conflicts,evidence};
    });
    assert.deepEqual(v129ManzuMemory.conflicts,[3],
      'v129 learned verifier should abstain only when learned 8萬 evidence clearly beats YOLO 4萬 '+JSON.stringify(v129ManzuMemory));
    assert.equal(v129ManzuMemory.evidence.bad.alternateLabel,'8萬','v129 alternate evidence should identify 8萬 '+JSON.stringify(v129ManzuMemory));
    assert.equal(v129ManzuMemory.evidence.good.conflict,false,'v129 must keep a crop that matches learned 4萬 '+JSON.stringify(v129ManzuMemory));

    const v100SortedSuit=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const make=ranks=>[
        ...ranks.map(r=>({label:r+'萬',score:.9,classMargin:.8})),
        ...Array.from({length:14-ranks.length},()=>({label:'東',score:.9,classMargin:.8}))
      ];
      return {
        wrong:api.yoloSortedSuitOrderConflicts(make([1,2,3,4,5,6,7,4,9]),true),
        correct:api.yoloSortedSuitOrderConflicts(make([1,2,3,4,5,6,7,8,9]),true)
      };
    });
    assert.deepEqual(v100SortedSuit.wrong,[7],'v100 must block the isolated duplicated-rank inversion in a long sorted suit run '+JSON.stringify(v100SortedSuit));
    assert.deepEqual(v100SortedSuit.correct,[],'v100 must keep a correctly sorted complete suit run '+JSON.stringify(v100SortedSuit));

    const v101TapGuard=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const riichi=document.querySelector('.riichi-button');
      if(!riichi)return {ok:false,reason:'no-riichi'};
      let count=0;
      riichi.addEventListener('click',()=>count++);
      const shieldFn=api.armCameraTapShield;
      if(typeof shieldFn!=='function')return {ok:false,reason:'no-shield'};
      shieldFn(500);
      riichi.click();
      const shield=document.getElementById('m7v101-camera-tap-shield');
      return {ok:true,count,shield:!!shield,guard:Number(window.MAKICameraTapGuardUntilV101)||0};
    });
    assert(v101TapGuard.ok,'v101 tap guard must be available '+JSON.stringify(v101TapGuard));
    assert.equal(v101TapGuard.count,0,'v101 recent camera guard must swallow riichi click-through '+JSON.stringify(v101TapGuard));
    assert(v101TapGuard.shield&&v101TapGuard.guard>Date.now(),'v101 shield/guard must be armed '+JSON.stringify(v101TapGuard));

    const v102WestTriplet=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1索',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[9]={label:'西',score:.58,classMargin:.58};
      yolo[10]={label:'西',score:.49,classMargin:.49};
      yolo[11]={label:'西',score:.55,classMargin:.55};
      features[9]=[0,0,0,0];features[10]=[1,1,1,1];features[11]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v102WestTriplet,[],'v102 must keep the observed 西西西 0.58/0.49/0.55 triplet '+JSON.stringify(v102WestTriplet));

    const v103WestTriplet=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1索',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[9]={label:'西',score:.57,classMargin:.57};
      yolo[10]={label:'西',score:.42,classMargin:.42};
      yolo[11]={label:'西',score:.55,classMargin:.55};
      features[9]=[0,0,0,0];features[10]=[1,1,1,1];features[11]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v103WestTriplet,[],'v103 must keep the second observed 西西西 0.57/0.42/0.55 triplet '+JSON.stringify(v103WestTriplet));

    const v104HonorPair=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1索',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[12]={label:'中',score:.82,classMargin:.82};
      yolo[13]={label:'中',score:.79,classMargin:.79};
      features[12]=[0,0,0,0];features[13]=[2,2,2,2];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v104HonorPair,[],'v104 must preserve strong contiguous 中中 even under perspective-driven crop mismatch '+JSON.stringify(v104HonorPair));

    const v105WestTriplet=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1索',score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[9]={label:'西',score:.81,classMargin:.81};
      yolo[10]={label:'西',score:.36,classMargin:.36};
      yolo[11]={label:'西',score:.67,classMargin:.67};
      features[9]=[0,0,0,0];features[10]=[1,1,1,1];features[11]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v105WestTriplet,[],'v105 must keep the observed 西西西 0.81/0.36/0.67 triplet when two anchors are strong '+JSON.stringify(v105WestTriplet));

    const v106RandomHonorPair=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({label:(i%2?'1索':'2筒'),score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[8]={label:'北',score:.92,classMargin:.92};
      yolo[12]={label:'北',score:.58,classMargin:.58};
      features[8]=[0,0,0,0];features[12]=[2,2,2,2];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v106RandomHonorPair,[],'v106 must keep non-adjacent legal 北北 0.92/0.58 in shuffled hands '+JSON.stringify(v106RandomHonorPair));

    const v106EqualHonorPair=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({label:(i%2?'1索':'2筒'),score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[1]={label:'北',score:.86,classMargin:.86};
      yolo[5]={label:'北',score:.86,classMargin:.86};
      features[1]=[0,0,0,0];features[5]=[2,2,2,2];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v106EqualHonorPair,[],'v106 must never reject both equal-confidence legal duplicate honors from appearance mismatch alone '+JSON.stringify(v106EqualHonorPair));


    const v109StrongNumberPair=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({label:(i%2?'1萬':'2筒'),score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[12]={label:'7索',score:.90,classMargin:.90};
      yolo[13]={label:'7索',score:.85,classMargin:.85};
      features[12]=[0,0,0,0];
      features[13]=[2,2,2,2];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v109StrongNumberPair,[],'v109 must keep the observed strong 7索7索 pair despite crop-feature mismatch '+JSON.stringify(v109StrongNumberPair));

    const v109WeakMismatchStillBlocked=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({label:(i%2?'1萬':'2筒'),score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[12]={label:'7索',score:.90,classMargin:.90};
      yolo[13]={label:'7索',score:.40,classMargin:.20};
      features[12]=[0,0,0,0];
      features[13]=[2,2,2,2];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v109WeakMismatchStillBlocked,[13],'v109 must still challenge a genuinely weak far-mismatch duplicate '+JSON.stringify(v109WeakMismatchStillBlocked));

    const v106RandomHonorTriplet=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({label:(i%2?'1索':'2筒'),score:.9,classMargin:.8}));
      const features=Array.from({length:14},()=>Array(4).fill(0));
      yolo[1]={label:'西',score:.81,classMargin:.81};
      yolo[6]={label:'西',score:.36,classMargin:.36};
      yolo[11]={label:'西',score:.67,classMargin:.67};
      features[1]=[0,0,0,0];features[6]=[1,1,1,1];features[11]=[-1,-1,-1,-1];
      return api.yoloDuplicateVisualConflicts(yolo,features,true,.15,.145,.22);
    });
    assert.deepEqual(v106RandomHonorTriplet,[],'v106 must protect non-adjacent legal 西西西 in shuffled hands '+JSON.stringify(v106RandomHonorTriplet));

    const v108WhiteRun=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      labels[9]='白';sources[9]='yolo';
      labels[12]='7索';sources[12]='yolo';
      labels[13]='7索';sources[13]='yolo';
      const primary={labels,sources,yoloUsed:3,legacyUsed:0,unresolved:11};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0}));
      yolo[9]={label:'白',score:.29,classMargin:.29};
      yolo[10]={label:'',score:0,classMargin:0};
      yolo[11]={label:'白',score:.13,classMargin:.13};
      yolo[12]={label:'7索',score:.90,classMargin:.90};
      yolo[13]={label:'7索',score:.86,classMargin:.86};
      const features=Array.from({length:14},(_,i)=>[2+i,2+i,2+i,2+i]);
      features[9]=[0,0,0,0];
      features[10]=[.01,0,.01,0];
      features[11]=[.02,.01,0,.01];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.equal(v108WhiteRun.labels[9],'白','v108 accepted white anchor should remain unchanged '+JSON.stringify(v108WhiteRun));
    assert.equal(v108WhiteRun.labels[10],'白','v108 should recover the synthetic blank slot as white '+JSON.stringify(v108WhiteRun));
    assert.equal(v108WhiteRun.labels[11],'白','v108 should recover the observed low-score neighboring blank tile as white '+JSON.stringify(v108WhiteRun));
    assert.deepEqual(v108WhiteRun.whiteRecoveredIndexes,[10,11],'v108 should recover exactly two white slots '+JSON.stringify(v108WhiteRun));

    const v108WhiteSafety=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      labels[9]='白';sources[9]='yolo';
      const primary={labels,sources,yoloUsed:1,legacyUsed:0,unresolved:13};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0}));
      yolo[9]={label:'白',score:.43,classMargin:.43};
      yolo[10]={label:'2索',score:.14,classMargin:.14};
      const features=Array.from({length:14},()=>[3,3,3,3]);
      features[9]=[0,0,0,0];
      features[10]=[2,2,2,2];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.equal(v108WhiteSafety.labels[10],'','v108 must leave a visually different weak tile unresolved '+JSON.stringify(v108WhiteSafety));


    const v110RecoverTwelve=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const count=14,pitch=50,w=42,h=70,x0=100,y=40;
      const missing=new Set([10,11]);
      const boxes=[];
      for(let i=0;i<count;i++){
        if(missing.has(i))continue;
        boxes.push({
          x:x0+i*pitch-w/2,y,w,h,
          score:i===9?.09:.86,
          label:i===9?'5z':(i>=12?'7s':'1m'),
          classId:0,view:'full'
        });
      }
      const source={width:900,height:180};
      return api.selectDetectorProductionBoxes({boxes},source,null,14);
    });
    assert.equal(v110RecoverTwelve.accepted,true,'v110 should recover two adjacent missing slots '+JSON.stringify(v110RecoverTwelve));
    assert.equal(v110RecoverTwelve.boxes.length,14,'v110 recovered result must contain 14 boxes '+JSON.stringify(v110RecoverTwelve));
    assert.equal(v110RecoverTwelve.stats.syntheticCount,2,'v110 should insert exactly two synthetic boxes '+JSON.stringify(v110RecoverTwelve));
    assert.deepEqual(v110RecoverTwelve.stats.missingIndexes,[10,11],'v110 should recover the actual adjacent blank slots '+JSON.stringify(v110RecoverTwelve));

    const v110WeakWhiteAnchor=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      labels[12]='7索';sources[12]='yolo';
      labels[13]='7索';sources[13]='yolo';
      const primary={labels,sources,yoloUsed:2,legacyUsed:0,unresolved:12};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0,synthetic:false}));
      yolo[9]={label:'白',score:.09,classMargin:.09,synthetic:false};
      yolo[10]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[11]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[12]={label:'7索',score:.90,classMargin:.90,synthetic:false};
      yolo[13]={label:'7索',score:.84,classMargin:.84,synthetic:false};
      const features=Array.from({length:14},(_,i)=>[3+i,3+i,3+i,3+i]);
      features[9]=[0,0,0,0];
      features[10]=[.01,0,.01,0];
      features[11]=[.02,.01,0,.01];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.deepEqual(v110WeakWhiteAnchor.labels.slice(9,12),['白','白','白'],'v110 should promote the observed 0.09 white and recover its two adjacent synthetic white tiles '+JSON.stringify(v110WeakWhiteAnchor));
    assert.deepEqual(v110WeakWhiteAnchor.whiteWeakAnchorIndexes,[9],'v110 should record the weak white anchor '+JSON.stringify(v110WeakWhiteAnchor));
    assert.deepEqual(v110WeakWhiteAnchor.whiteRecoveredIndexes,[10,11],'v110 should recover exactly the two synthetic neighbors '+JSON.stringify(v110WeakWhiteAnchor));

    const v110WeakWhiteSafety=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      const primary={labels,sources,yoloUsed:0,legacyUsed:0,unresolved:14};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0,synthetic:false}));
      yolo[9]={label:'白',score:.09,classMargin:.09,synthetic:false};
      yolo[10]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[11]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      const features=Array.from({length:14},()=>[4,4,4,4]);
      features[9]=[0,0,0,0];
      features[10]=[2,2,2,2];
      features[11]=[2,2,2,2];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.deepEqual(v110WeakWhiteSafety.labels.slice(9,12),['','',''],'v110 must not promote a weak white when synthetic crops are visually different '+JSON.stringify(v110WeakWhiteSafety));

    const v112RecoverThirteenHybrid=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const count=14,pitch=50,w=42,h=70,x0=100,y=40;
      const missing=new Set([10,11]);
      const boxes=[];
      for(let i=0;i<count;i++){
        if(missing.has(i))continue;
        boxes.push({
          x:x0+i*pitch-w/2,y,w,h,
          score:i===9?.17:.86,
          label:i===9?'5z':(i>=12?'7s':((i+1)+'m')),
          classId:0,view:'full',rawIndex:i
        });
      }
      // A spurious low-confidence box between 4m and 5m makes rawCount=13.
      // The old one-missing path cannot make this a valid 14-slot geometry.
      boxes.push({
        x:x0+4.28*pitch-w/2,y,w,h,
        score:.11,label:'4m',classId:0,view:'full',rawIndex:99
      });
      const source={width:900,height:180};
      const direct=api.detectorRecoverThirteenLowExtraCandidates(boxes,null,source.width,source.height,14);
      const selected=api.selectDetectorProductionBoxes({boxes},source,null,14);
      return {
        directCount:direct.length,
        directType:direct[0]?.type||'',
        accepted:selected.accepted,
        reason:selected.reason,
        recoveryType:selected.stats?.recoveryType||'',
        missing:selected.stats?.missingIndexes||[],
        synthetic:selected.stats?.syntheticCount||0,
        dropped:selected.stats?.dropped||[],
        labels:selected.boxes.map(b=>b.label||''),
        scores:selected.boxes.map(b=>Number(b.score)||0)
      };
    });
    assert.equal(v112RecoverThirteenHybrid.directCount,1,'v112 should find one unique low-extra recovery '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.directType,'drop-low-missing-slot-2','v112 recovery type mismatch '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.accepted,true,'v112 should recover screenshot-like 13 raw boxes '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.recoveryType,'drop-low-missing-slot-2','v112 selected recovery type mismatch '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.deepEqual(v112RecoverThirteenHybrid.missing,[10,11],'v112 should recover the two adjacent white slots '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.synthetic,2,'v112 should insert exactly two synthetic boxes '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.dropped.length,1,'v112 should drop exactly one low-confidence extra box '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.dropped[0].score,.11,'v112 should drop the spurious low-confidence box '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.dropped[0].label,'4m','v112 should drop the spurious 4m box '+JSON.stringify(v112RecoverThirteenHybrid));
    assert.equal(v112RecoverThirteenHybrid.labels[9],'5z','v112 should preserve the observed 0.17 white anchor '+JSON.stringify(v112RecoverThirteenHybrid));

    const v112MediumWhiteAnchor=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      labels[9]='白';sources[9]='yolo';
      labels[12]='7索';sources[12]='yolo';
      labels[13]='7索';sources[13]='yolo';
      const primary={labels,sources,yoloUsed:3,legacyUsed:0,unresolved:11};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0,synthetic:false}));
      yolo[9]={label:'白',score:.17,classMargin:.17,synthetic:false};
      yolo[10]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[11]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[12]={label:'7索',score:.83,classMargin:.83,synthetic:false};
      yolo[13]={label:'7索',score:.86,classMargin:.86,synthetic:false};
      const features=Array.from({length:14},(_,i)=>[5+i,5+i,5+i,5+i]);
      features[9]=[0,0,0,0];
      features[10]=[.01,0,.01,0];
      features[11]=[.02,.01,0,.01];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.deepEqual(v112MediumWhiteAnchor.labels.slice(9,12),['白','白','白'],'v112 should use the observed 0.17 white only in a matching synthetic 3-run '+JSON.stringify(v112MediumWhiteAnchor));
    assert.deepEqual(v112MediumWhiteAnchor.whiteContextAnchorIndexes,[9],'v112 should record the context-only medium white anchor '+JSON.stringify(v112MediumWhiteAnchor));
    assert.deepEqual(v112MediumWhiteAnchor.whiteRecoveredIndexes,[10,11],'v112 should recover exactly the two matching synthetic whites '+JSON.stringify(v112MediumWhiteAnchor));

    const v112MediumWhiteSafety=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const labels=Array(14).fill('');
      const sources=Array(14).fill('unresolved');
      labels[9]='白';sources[9]='yolo';
      const primary={labels,sources,yoloUsed:1,legacyUsed:0,unresolved:13};
      const yolo=Array.from({length:14},()=>({label:'',score:0,classMargin:0,synthetic:false}));
      yolo[9]={label:'白',score:.17,classMargin:.17,synthetic:false};
      yolo[10]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      yolo[11]={label:'',score:0,classMargin:0,synthetic:true,recovery:'missing-slot-2'};
      const features=Array.from({length:14},()=>[6,6,6,6]);
      features[9]=[0,0,0,0];
      features[10]=[2,2,2,2];
      features[11]=[2,2,2,2];
      return api.recoverWhiteDragonGaps(primary,yolo,features,true);
    });
    assert.deepEqual(v112MediumWhiteSafety.labels.slice(9,12),['白','',''],'v112 must not expand a 0.17 white into visually different synthetic crops '+JSON.stringify(v112MediumWhiteSafety));

    const v113FourteenDuplicateMissing=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const count=14,pitch=50,w=42,h=70,x0=100,y=40;
      const boxes=[];
      const labelFor=i=>{
        if(i<=5)return (i+1)+'m';
        if(i===6)return '7p';
        if(i===7)return '8p';
        if(i===8)return '9p';
        if(i===9||i===10)return '5z';
        if(i>=12)return '7s';
        return '';
      };
      for(let i=0;i<count;i++){
        if(i===11)continue; // third white is missed
        let score=.86;
        if(i===4)score=.24; // exercise the screenshot-like 12/14 high-count edge
        if(i===9)score=.35;
        if(i===10)score=.19;
        boxes.push({
          x:x0+i*pitch-w/2,y,w,h,score,label:labelFor(i),
          classId:0,view:'full',crossViewCount:2,crossViewSupport:2,crossViewShare:1,crossViewMargin:1
        });
      }
      // YOLO double-detects 9p with a strongly overlapping second box.
      boxes.push({
        x:x0+8*pitch-w/2+9,y,w,h,
        score:.90,label:'9p',classId:0,view:'tile-2',
        crossViewCount:2,crossViewSupport:2,crossViewShare:1,crossViewMargin:1
      });
      const source={width:900,height:180};
      const direct=api.detectorRecoverFourteenDuplicateMissingCandidates(boxes,null,source.width,source.height,14);
      const selected=api.selectDetectorProductionBoxes({boxes},source,null,14);
      const yolo=selected.accepted?api.yoloRecognitionFromBoxes(selected.boxes):[];
      const primaryLabels=yolo.map(r=>r.label&&r.score>=.15?r.label:'');
      const primary={
        labels:primaryLabels,
        sources:primaryLabels.map(x=>x?'yolo':'unresolved'),
        yoloUsed:primaryLabels.filter(Boolean).length,
        legacyUsed:0,
        unresolved:primaryLabels.filter(x=>!x).length
      };
      const features=Array.from({length:14},(_,i)=>[10+i,10+i,10+i,10+i]);
      features[9]=[0,0,0,0];
      features[10]=[.01,0,.01,0];
      features[11]=[.02,.01,0,.01];
      const white=selected.accepted?api.recoverWhiteDragonGaps(primary,yolo,features,true):null;
      return {
        directCount:direct.length,
        directType:direct[0]?.type||'',
        accepted:selected.accepted,
        reason:selected.reason,
        recoveryType:selected.stats?.recoveryType||'',
        missing:selected.stats?.missingIndexes||[],
        synthetic:selected.stats?.syntheticCount||0,
        dropped:selected.stats?.dropped||[],
        rawHigh:selected.stats?.rawHighCount,
        subsetHigh:selected.stats?.subsetHighCount,
        labels:selected.boxes.map(b=>b.label||''),
        whiteLabels:white?.labels?.slice(9,12)||[],
        whiteRecovered:white?.whiteRecoveredIndexes||[]
      };
    });
    assert.equal(v113FourteenDuplicateMissing.directCount,1,'v113 should find one duplicate+missing repair '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.directType,'drop-overlap-missing-slot','v113 direct recovery type mismatch '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.accepted,true,'v113 should accept the repaired 14-box layout '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.reason,'recover-14-to-14-drop-overlap-missing-slot','v113 should expose 14-to-14 repair reason '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.recoveryType,'drop-overlap-missing-slot','v113 selected recovery type mismatch '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.deepEqual(v113FourteenDuplicateMissing.missing,[11],'v113 should restore the missing third white slot '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.synthetic,1,'v113 should insert one synthetic box '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.dropped.length,1,'v113 should remove exactly one duplicate box '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.equal(v113FourteenDuplicateMissing.dropped[0].label,'9p','v113 should remove the overlapping duplicate 9p '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.deepEqual(v113FourteenDuplicateMissing.whiteLabels,['白','白','白'],'v113 repaired geometry should feed white-white-white recovery '+JSON.stringify(v113FourteenDuplicateMissing));
    assert.deepEqual(v113FourteenDuplicateMissing.whiteRecovered,[11],'v113 should recover only the synthetic third white '+JSON.stringify(v113FourteenDuplicateMissing));

    const v97Consensus=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const base={x:10,y:10,w:20,h:30};
      const c=api.detectorConsensusCluster([
        {...base,label:'8m',score:.82,runnerLabel:'4m',runnerScore:.08,classMargin:.74,view:'full'},
        {...base,label:'8m',score:.78,runnerLabel:'4m',runnerScore:.10,classMargin:.68,view:'tile-2'},
        {...base,label:'8m',score:.74,runnerLabel:'4m',runnerScore:.11,classMargin:.63,view:'tile-3'},
        {...base,label:'4m',score:.91,runnerLabel:'8m',runnerScore:.05,classMargin:.86,view:'tile-1'}
      ]);
      const subsetCount=api.detectorSubsetCandidates(Array.from({length:17},(_,i)=>({x:i*10,y:0,w:8,h:16,score:.9,label:'1m'})),14).length;
      return {label:c.label,support:c.crossViewSupport,count:c.crossViewCount,share:c.crossViewShare,runner:c.crossViewRunnerLabel,subsetCount};
    });
    assert.equal(v97Consensus.label,'8m','v97 cross-view voting should beat one high-confidence disagreeing window '+JSON.stringify(v97Consensus));
    assert(v97Consensus.support>=3&&v97Consensus.count>=4,'v97 cross-view support metadata missing '+JSON.stringify(v97Consensus));
    assert.equal(v97Consensus.runner,'4m','v97 cross-view runner should expose disagreement '+JSON.stringify(v97Consensus));
    assert.equal(v97Consensus.subsetCount,680,'v97 must support safe 17-to-14 subset search '+JSON.stringify(v97Consensus));

    const conservativeVerifier=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const run=(label,score,runnerLabel,runnerScore,classMargin,legacyLabel)=>{
        const yolo=Array.from({length:14},()=>({label:'東',score:.9,runnerLabel:'南',runnerScore:.1,classMargin:.8}));
        const legacy=Array(14).fill('');
        yolo[1]={label,score,runnerLabel,runnerScore,classMargin};
        legacy[1]=legacyLabel;
        return api.yoloLegacyLabelConflicts(yolo,legacy,true);
      };
      return {
        strongSame:run('4萬',.92,'9萬',.10,.82,'2萬'),
        ambiguousSame:run('4萬',.55,'2萬',.43,.12,'2萬'),
        strongCross:run('西',.91,'北',.12,.79,'3萬'),
        ambiguousCross:run('西',.33,'3萬',.27,.06,'3萬')
      };
    });
    assert.deepEqual(conservativeVerifier.strongSame,[],'v96 must keep a strong same-family YOLO result '+JSON.stringify(conservativeVerifier));
    assert.deepEqual(conservativeVerifier.ambiguousSame,[1],'v96 should use legacy as tie-breaker for ambiguous same-family YOLO '+JSON.stringify(conservativeVerifier));
    assert.deepEqual(conservativeVerifier.strongCross,[],'v96 must keep strong honor YOLO despite legacy cross-family guess '+JSON.stringify(conservativeVerifier));
    assert.deepEqual(conservativeVerifier.ambiguousCross,[1],'v96 should stop ambiguous cross-family YOLO disagreement '+JSON.stringify(conservativeVerifier));

    const v95Ambiguity=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'東',score:.8,runnerLabel:'南',runnerScore:.2,classMargin:.6}));
      const legacy=Array(14).fill('');
      const debug=Array.from({length:14},()=>[]);
      yolo[3]={label:'南',score:.31,runnerLabel:'發',runnerScore:.27,classMargin:.04};
      debug[3]=[{label:'發'}];
      yolo[4]={label:'5萬',score:.75,runnerLabel:'5筒',runnerScore:.70,classMargin:.05};
      legacy[4]='5萬';
      return api.yoloClassAmbiguityConflicts(yolo,legacy,debug,true);
    });
    assert.deepEqual(v95Ambiguity,[3],'v95 should stop low-margin unconfirmed YOLO but keep legacy-confirmed label '+JSON.stringify(v95Ambiguity));

    const v124Safety=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const base=()=>Array.from({length:14},()=>({label:'東',rawLabel:'1z',score:.9,runnerLabel:'南',runnerRawLabel:'2z',runnerScore:.05,classMargin:.85,crossViewShare:.9,crossViewSupport:8,crossViewCount:9,crossViewRunnerLabel:'南',crossViewMargin:.85}));
      const correct4=base();correct4[4]={label:'4萬',rawLabel:'4m',score:.91,runnerLabel:'5筒',runnerRawLabel:'0p',runnerScore:.01,classMargin:.90,crossViewShare:.95,crossViewSupport:20,crossViewCount:24,crossViewRunnerLabel:'5筒',crossViewMargin:.90};
      const wrong8=base();wrong8[4]={label:'4萬',rawLabel:'4m',score:.815,runnerLabel:'8萬',runnerRawLabel:'8m',runnerScore:.5233,classMargin:.2917,crossViewShare:.643,crossViewSupport:26,crossViewCount:37,crossViewRunnerLabel:'8萬',crossViewMargin:.2917};
      const wrong2=base();wrong2[4]={label:'4萬',rawLabel:'4m',score:.7099,runnerLabel:'2萬',runnerRawLabel:'2m',runnerScore:.6809,classMargin:.029,crossViewShare:.4934,crossViewSupport:14,crossViewCount:29,crossViewRunnerLabel:'2萬',crossViewMargin:.029};
      const strong4=base();strong4[4]={label:'4萬',rawLabel:'4m',score:.9,runnerLabel:'8萬',runnerRawLabel:'8m',runnerScore:.2,classMargin:.70,crossViewShare:.88,crossViewSupport:20,crossViewCount:22,crossViewRunnerLabel:'8萬',crossViewMargin:.70};

      const redMan=base();
      redMan[0]={label:'5筒',rawLabel:'0p',rawOriginalLabel:'0p',score:.79,runnerLabel:'5萬',runnerRawLabel:'5m',runnerScore:.01,classMargin:.78,crossViewShare:.92,crossViewSupport:17,crossViewCount:23,crossViewRunnerLabel:'5萬',crossViewMargin:.78};
      redMan[1]={label:'3萬',rawLabel:'3m',score:.8};redMan[2]={label:'5萬',rawLabel:'5m',score:.8};redMan[3]={label:'6萬',rawLabel:'6m',score:.8};
      const redPin=base();
      redPin[0]={label:'5筒',rawLabel:'0p',rawOriginalLabel:'0p',score:.79};redPin[1]={label:'3筒',rawLabel:'3p',score:.8};redPin[2]={label:'5筒',rawLabel:'5p',score:.8};redPin[3]={label:'6筒',rawLabel:'6p',score:.8};
      const repaired=redMan.map(x=>({...x}));repaired[0]={...repaired[0],label:'5萬',rawLabel:'0m',rawOriginalLabel:'0p',redRepair:'context-suit'};
      return {
        correct4:api.yoloV124ManzuFourConflicts(correct4,true),
        wrong8:api.yoloV124ManzuFourConflicts(wrong8,true),
        wrong2:api.yoloV124ManzuFourConflicts(wrong2,true),
        strong4:api.yoloV124ManzuFourConflicts(strong4,true),
        redMan:api.yoloV124RedFiveSuitConflicts(redMan,true),
        redPin:api.yoloV124RedFiveSuitConflicts(redPin,true),
        repaired:api.yoloV124RedFiveSuitConflicts(repaired,true)
      };
    });
    assert.deepEqual(v124Safety.correct4,[],'v124 must keep a clearly separated real 4萬 '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.wrong8,[4],'v124 should abstain on benchmark-like 4萬→8萬 confusion '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.wrong2,[4],'v124 should abstain on benchmark-like 4萬→2萬 confusion '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.strong4,[],'v124 should not block a strongly separated 4萬 merely because 8萬 is runner-up '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.redMan,[0],'v124 should stop raw 0p when local evidence strongly says manzu '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.redPin,[],'v124 should keep coherent raw red 5-pin '+JSON.stringify(v124Safety));
    assert.deepEqual(v124Safety.repaired,[],'v124 should keep an already context-repaired red five '+JSON.stringify(v124Safety));

    const v95NearDuplicate=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},()=>({label:'1萬',score:.9,classMargin:.5}));
      const features=Array.from({length:14},(_,i)=>Array(4).fill(i));
      yolo[12]={label:'南',score:.42,classMargin:.08};
      yolo[13]={label:'發',score:.78,classMargin:.25};
      features[12]=[0,0,0,0];features[13]=[0.01,0.01,0.01,0.01];
      return api.yoloNearDuplicateLabelConflicts(yolo,features,true,.105,.06);
    });
    assert.deepEqual(v95NearDuplicate,[12],'v95 should challenge the weaker label on visually near-identical honor tiles '+JSON.stringify(v95NearDuplicate));

    const v90VisibleLabels=await page.evaluate(()=>{
      const hand=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','東','東','東','發','發'];
      window.showHandResultM7V5(hand);
      const root=document.getElementById('hand-result-overlay-m7v5');
      const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      buttons.forEach((b,i)=>{b.classList.add('m7v36-crop');b.style.backgroundImage='linear-gradient(#ddd,#ddd)';});
      const labels=buttons.map(b=>getComputedStyle(b,'::before').content.replace(/^["']|["']$/g,''));
      const aria=buttons.map(b=>b.getAttribute('aria-label'));
      const judge=window.judgeMahjongWinM8V4(hand);
      root.remove();
      return {labels,aria,judge};
    });
    assert.deepEqual(v90VisibleLabels.labels,['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','東','東','東','發','發'],'v90 visible recognition labels mismatch '+JSON.stringify(v90VisibleLabels));
    assert.deepEqual(v90VisibleLabels.aria,v90VisibleLabels.labels,'v90 result aria labels mismatch '+JSON.stringify(v90VisibleLabels));
    assert.equal(v90VisibleLabels.judge?.win,true,'reference hand 123/456/789m + 東東東 + 發發 must be a winning hand '+JSON.stringify(v90VisibleLabels));
    assert.equal(await page.title(),'MAKI｜麻雀対局管理');
    assert.equal(await page.$eval('.setup-header h1',e=>e.textContent.trim()),'MAKI');
    const manifestBrand=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
    assert.equal(manifestBrand.name,'MAKI');
    assert.equal(manifestBrand.short_name,'MAKI');
    assert.equal(manifestBrand.id,'./');
    assert(manifestBrand.icons.every(x=>String(x.src).includes('v=m7v131')),'v109 manifest icons must use fresh cache keys '+JSON.stringify(manifestBrand.icons));
    assert.equal(await page.$eval('meta[name="apple-mobile-web-app-title"]',e=>e.content),'MAKI');
    assert.equal(await page.$eval('meta[name="application-name"]',e=>e.content),'MAKI');
    assert((await page.$eval('link[rel="apple-touch-icon"]',e=>e.getAttribute('href'))).includes('v=m7v131'));
    for(const size of [180,192,512]){
      const p=path.join(root,'icon-'+size+'.png');
      assert(fs.existsSync(p),'MAKI icon missing '+p);
      const bytes=fs.readFileSync(p);
      assert(bytes.length>1000,'MAKI icon looks empty/suspicious '+p);
      assert.equal(bytes.toString('ascii',1,4),'PNG','MAKI icon is not PNG '+p);
      assert.equal(bytes.readUInt32BE(16),size,'MAKI icon width mismatch '+p);
      assert.equal(bytes.readUInt32BE(20),size,'MAKI icon height mismatch '+p);
    }

    const v81HeaderLayout=await page.evaluate(()=>{
      window.showHandResultM7V5?.(Array(14).fill(''));
      const root=document.getElementById('hand-result-overlay-m7v5');
      const card=root?.querySelector('.hand-result-card-m7v5');
      const head=root?.querySelector('.hand-result-head-m7v5');
      const left=head?.querySelector(':scope > div');
      const title=left?.querySelector('b');
      const status=root?.querySelector('.hand-result-status-m7v5');
      if(status)status.textContent='学習済み 11種類 / 元:stable / 安定保存 / 精度優先 / YOLO分割 採用 / 軸平行crop 14/14 / 射影採用 0/14 / 高信頼 0枚';
      const cr=card?.getBoundingClientRect(),hr=head?.getBoundingClientRect(),lr=left?.getBoundingClientRect(),tr=title?.getBoundingClientRect(),sr=status?.getBoundingClientRect();
      const css=status?getComputedStyle(status):null;
      root?.remove();
      return {
        cardLeft:cr?.left??0,cardRight:cr?.right??0,
        headHeight:hr?.height??999,
        leftWidth:lr?.width??0,titleWidth:tr?.width??0,
        statusLeft:sr?.left??0,statusRight:sr?.right??999,statusWidth:sr?.width??0,
        whiteSpace:css?.whiteSpace||''
      };
    });
    assert(v81HeaderLayout.leftWidth>=175,'v81 title column collapsed '+JSON.stringify(v81HeaderLayout));
    assert(v81HeaderLayout.titleWidth>=150,'v81 Japanese title became near-vertical '+JSON.stringify(v81HeaderLayout));
    assert(v81HeaderLayout.statusWidth>=300,'v81 diagnostics status did not receive remaining width '+JSON.stringify(v81HeaderLayout));
    assert(v81HeaderLayout.statusRight<=v81HeaderLayout.cardRight+2,'v81 diagnostics overflowed result card '+JSON.stringify(v81HeaderLayout));
    assert(v81HeaderLayout.headHeight<90,'v81 header wrapped into excessive height '+JSON.stringify(v81HeaderLayout));
    assert.notEqual(v81HeaderLayout.whiteSpace,'nowrap','v81 diagnostics still force nowrap '+JSON.stringify(v81HeaderLayout));

    // v36 analyzes one long row after the shutter instead of requiring 14 live connected components.
    const synthetic=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=840;canvas.height=260;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#6d4930';ctx.fillRect(0,0,840,260);
      ctx.fillStyle='#85847f';ctx.fillRect(86,78,668,112);
      ctx.fillStyle='#222';
      for(let i=0;i<14;i++){
        const x=94+i*47.7;ctx.fillRect(Math.round(x),105,3,42);ctx.fillRect(Math.round(x+9),122,7,12);
      }
      const row=window.M7CameraV36.locateTileRow(ctx);
      const boxes=window.M7CameraV36.splitRow(row,14);
      const grid=window.M7CameraV36.fitGlobalRowGrid(ctx,row,14);
      const mapping=window.M7CameraV36.sourceRectForCover(1920,1080,932,430,{x:56,y:112,w:820,h:190});
      return {row,boxes,grid,mapping};
    });
    assert(synthetic.row,'fixed-frame row locator failed '+JSON.stringify(synthetic));
    assert.equal(synthetic.boxes.length,14,'fixed-frame row must split into 14 tiles '+JSON.stringify(synthetic));
    assert(synthetic.row.w>560&&synthetic.row.h>80,'unexpected row geometry '+JSON.stringify(synthetic));
    if(synthetic.grid?.used){
      assert(Math.abs(synthetic.grid.offsetPitch||0)<.08&&Math.abs((synthetic.grid.pitchScale||1)-1)<.025,
        'v61 global grid chased repeated glyph edges instead of row geometry '+JSON.stringify(synthetic.grid));
    }
    assert(synthetic.mapping&&synthetic.mapping.w>1500&&synthetic.mapping.h>300,
      'object-fit cover mapping lost high-resolution source area '+JSON.stringify(synthetic));

    const outerEdge=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=840;canvas.height=260;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#70472b';ctx.fillRect(0,0,840,260);
      const start=108,pitch=44,top=76,height=112;
      // One contiguous 14-tile white row with small dark separators.
      ctx.fillStyle='#d9d6cc';ctx.fillRect(start,top,pitch*14,height);
      ctx.fillStyle='#7f725f';
      for(let i=1;i<14;i++)ctx.fillRect(start+i*pitch-1,top,2,height);
      // Deliberately over-wide/noisy row: equal splitting this would drift.
      const noisy={x:start-12,y:68,w:pitch*14+24,h:128};
      const fit=window.M7CameraV36.refineRowOuterEdges(ctx,noisy,14);
      return {
        used:fit.used,reason:fit.reason,
        beforeLeft:Math.abs(noisy.x-start),
        afterLeft:Math.abs((fit.row?.x??noisy.x)-start),
        beforePitch:Math.abs(noisy.w/14-pitch),
        afterPitch:Math.abs((fit.row?.w??noisy.w)/14-pitch),
        pitchScale:fit.pitchScale??null
      };
    });
    assert(outerEdge.used,'v76 outer-edge fit did not engage '+JSON.stringify(outerEdge));
    assert(outerEdge.afterLeft<outerEdge.beforeLeft,'v76 outer-edge fit did not improve row start '+JSON.stringify(outerEdge));
    assert(outerEdge.afterPitch<outerEdge.beforePitch,'v76 outer-edge fit did not improve row pitch '+JSON.stringify(outerEdge));

    const boundarySignalApi=await page.evaluate(()=>({
      fn:typeof window.M7CameraV36?.boundaryLikelihoodDiagnostics,
      analyze:String(window.M7CameraV36?.analyzeGuideCanvas||'').includes('boundarySignal')
    }));
    assert.equal(boundarySignalApi.fn,'function','v76 boundary diagnostic helper missing '+JSON.stringify(boundarySignalApi));
    assert.equal(boundarySignalApi.analyze,true,'v76 analyzeGuideCanvas is not wired to boundary diagnostic '+JSON.stringify(boundarySignalApi));

    const dualBandDiagnostic=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const c=document.createElement('canvas');c.width=840;c.height=260;
      const x=c.getContext('2d');x.fillStyle='#765033';x.fillRect(0,0,840,260);
      const row={x:70,y:62,w:700,h:126},p=row.w/14;
      for(let i=0;i<14;i++){
        x.fillStyle='#dedbd2';x.fillRect(row.x+i*p,row.y,p-1,row.h);
        // Dark glyph only in the middle; should not beat the full-height seam.
        x.fillStyle='#171717';x.fillRect(row.x+i*p+p*.48,row.y+44,3,38);
        if(i>0){x.fillStyle='#5f5b55';x.fillRect(row.x+i*p-1,row.y+3,2,row.h-6);}
      }
      return api.boundaryLikelihoodDiagnostics(x,row,14);
    });
    assert(dualBandDiagnostic.clearNearCount>=10,
      'v77 dual-band diagnostic failed to recover synthetic seams '+JSON.stringify(dualBandDiagnostic));
    assert(dualBandDiagnostic.strongWideCount>=11,
      'v77 wide dual-band diagnostic is too weak '+JSON.stringify(dualBandDiagnostic));

    const v78DetectorPure=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const canvas=document.createElement('canvas');canvas.width=980;canvas.height=180;
      const row={x:70,y:28,w:840,h:124};
      const windows=api.detectorWindows(canvas,row);
      const size=640,count=4,channels=41,data=new Float32Array(channels*count);
      const set=(ch,i,v)=>{data[ch*count+i]=v;};
      // Two overlapping predictions for tile A and one separate tile B.
      set(0,0,120);set(1,0,320);set(2,0,70);set(3,0,150);set(4,0,.90);
      set(0,1,123);set(1,1,322);set(2,1,72);set(3,1,148);set(4,1,.82);
      set(0,2,310);set(1,2,320);set(2,2,68);set(3,2,152);set(5,2,.88);
      set(0,3,500);set(1,3,320);set(2,3,60);set(3,3,130);set(6,3,.02);
      const meta={size,scale:1,padX:0,padY:0,rect:{x:0,y:0,w:640,h:640},kind:'test'};
      const decoded=api.decodeYoloOutput({dims:[1,channels,count],data},meta,.08);
      const nms=api.detectorNms(decoded,.36);
      return {windowCount:windows.length,kinds:windows.map(x=>x.kind),decoded:decoded.length,nms:nms.length,labels:nms.map(x=>x.label),iou:api.detectorIoU(decoded[0],decoded[1])};
    });
    assert.equal(v78DetectorPure.windowCount,4,'v78 should use full + three overlapping row views '+JSON.stringify(v78DetectorPure));
    assert.equal(v78DetectorPure.decoded,3,'v78 decoder threshold/layout mismatch '+JSON.stringify(v78DetectorPure));
    assert.equal(v78DetectorPure.nms,2,'v78 class-agnostic NMS did not merge duplicate boxes '+JSON.stringify(v78DetectorPure));
    assert(v78DetectorPure.iou>.7,'v78 synthetic duplicate IoU unexpectedly low '+JSON.stringify(v78DetectorPure));

    const v79ProductionGuard=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=240;
      const row={x:80,y:50,w:840,h:140},boxes=[];
      for(let i=0;i<14;i++)boxes.push({x:82+i*60,y:55+(i%3-1)*2,w:56+(i%2),h:128+(i%2)*2,score:.72+i*.01,label:'1m'});
      const good=api.selectDetectorProductionBoxes({ok:true,boxes},canvas,row,14);
      const missing=api.selectDetectorProductionBoxes({ok:true,boxes:boxes.slice(0,13)},canvas,row,14);
      const chaotic=boxes.map((b,i)=>({...b,x:i===7?b.x+45:b.x}));
      const bad=api.selectDetectorProductionBoxes({ok:true,boxes:chaotic},canvas,row,14);
      return {good:good.accepted,goodCount:good.boxes.length,missing:missing.accepted,missingReason:missing.reason,bad:bad.accepted,badReason:bad.reason};
    });
    assert.equal(v79ProductionGuard.good,true,'v79 should accept clean 14-box geometry '+JSON.stringify(v79ProductionGuard));
    assert.equal(v79ProductionGuard.goodCount,14,'v79 accepted crop count mismatch '+JSON.stringify(v79ProductionGuard));
    assert.equal(v79ProductionGuard.missing,true,'v84 should recover a clean single missing slot from 13 detections '+JSON.stringify(v79ProductionGuard));
    assert.equal(v79ProductionGuard.bad,false,'v79 must reject duplicated/chaotic spacing '+JSON.stringify(v79ProductionGuard));

    const v82SubsetSelection=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=240;
      const row={x:80,y:50,w:840,h:140},real=[];
      for(let i=0;i<14;i++)real.push({x:82+i*60,y:55+(i%3-1)*2,w:56+(i%2),h:128+(i%2)*2,score:.72+i*.01,label:'1m'});
      const extra={x:82+6*60+40,y:58,w:15,h:122,score:.19,label:'5s'};
      const fifteen=real.concat(extra).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2));
      const selected=api.selectDetectorProductionBoxes({ok:true,boxes:fifteen},canvas,row,14);
      const ambiguousExtra={...real[6],x:real[6].x+1,score:real[6].score+.002,label:'7s'};
      const ambiguous=api.selectDetectorProductionBoxes({ok:true,boxes:real.concat(ambiguousExtra).sort((a,b)=>(a.x+a.w/2)-(b.x+b.w/2))},canvas,row,14);
      return {
        accepted:selected.accepted,reason:selected.reason,count:selected.boxes.length,
        rawCount:selected.stats?.rawCount,droppedCount:selected.stats?.droppedCount,
        droppedWidth:selected.stats?.dropped?.[0]?.w||0,margin:selected.stats?.selectionMargin,
        ambiguousAccepted:ambiguous.accepted,ambiguousReason:ambiguous.reason
      };
    });
    assert.equal(v82SubsetSelection.accepted,true,'v82 should recover 14 tiles from one narrow extra box '+JSON.stringify(v82SubsetSelection));
    assert.equal(v82SubsetSelection.count,14,'v82 selected subset must contain 14 boxes '+JSON.stringify(v82SubsetSelection));
    assert.equal(v82SubsetSelection.rawCount,15,'v82 raw count diagnostics lost 15-box input '+JSON.stringify(v82SubsetSelection));
    assert.equal(v82SubsetSelection.droppedCount,1,'v82 should drop exactly one extra box '+JSON.stringify(v82SubsetSelection));
    assert(v82SubsetSelection.droppedWidth<30,'v82 did not remove the synthetic narrow false box '+JSON.stringify(v82SubsetSelection));
    assert.equal(v82SubsetSelection.ambiguousAccepted,false,'v82 must fallback when two 14-box subsets are too similar '+JSON.stringify(v82SubsetSelection));

    const v84Recover13=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=240;
      const row={x:80,y:50,w:840,h:140},real=[];
      for(let i=0;i<14;i++)real.push({x:82+i*60,y:55+(i%3-1)*2,w:56+(i%2),h:128+(i%2)*2,score:.74,label:'1m'});
      const missing=real.filter((_,i)=>i!==9);
      const gap=api.selectDetectorProductionBoxes({ok:true,boxes:missing},canvas,row,14);
      const merged=real.slice(0,12).concat([{
        x:real[12].x,y:real[12].y,w:(real[13].x+real[13].w)-real[12].x,h:129,score:.78,label:'4z'
      }]);
      const split=api.selectDetectorProductionBoxes({ok:true,boxes:merged},canvas,row,14);
      const chaotic=missing.map((b,i)=>({...b,x:b.x+(i>6?28:0)}));
      const bad=api.selectDetectorProductionBoxes({ok:true,boxes:chaotic},canvas,row,14);
      return {
        gap:{accepted:gap.accepted,reason:gap.reason,count:gap.boxes.length,synthetic:gap.stats?.syntheticCount,type:gap.stats?.recoveryType,missing:gap.stats?.missingIndex},
        split:{accepted:split.accepted,reason:split.reason,count:split.boxes.length,synthetic:split.stats?.syntheticCount,type:split.stats?.recoveryType},
        bad:{accepted:bad.accepted,reason:bad.reason}
      };
    });
    assert.equal(v84Recover13.gap.accepted,true,'v84 should recover one clean missing slot '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.gap.count,14,'v84 missing-slot recovery must output 14 boxes '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.gap.type,'missing-slot','v84 chose wrong recovery type for a simple gap '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.gap.synthetic,1,'v84 simple gap should synthesize exactly one box '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.split.accepted,true,'v84 should split one clear double-width detection '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.split.count,14,'v84 split-wide recovery must output 14 boxes '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.split.type,'split-wide','v84 chose wrong recovery type for a merged double box '+JSON.stringify(v84Recover13));
    assert.equal(v84Recover13.bad.accepted,false,'v84 must reject a geometrically ambiguous/bad 13-box row '+JSON.stringify(v84Recover13));

    const v80AxisAligned=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const c=document.createElement('canvas');c.width=120;c.height=180;
      const x=c.getContext('2d',{willReadFrequently:true});
      x.fillStyle='rgb(245,245,235)';x.fillRect(0,0,120,180);
      x.fillStyle='rgb(230,20,20)';x.fillRect(10,15,18,150);
      x.fillStyle='rgb(20,40,230)';x.fillRect(92,15,18,150);
      const out=api.axisAlignedYoloFaceCanvas(x,{x:10,y:15,w:100,h:150},96,144);
      const o=out.getContext('2d').getImageData(0,0,96,144).data;
      const avg=(xa,xb,ch)=>{
        let sum=0,n=0;
        for(let y=12;y<132;y++)for(let xx=xa;xx<xb;xx++){sum+=o[(y*96+xx)*4+ch];n++;}
        return sum/n;
      };
      return {
        leftRed:avg(0,16,0),leftBlue:avg(0,16,2),
        rightRed:avg(80,96,0),rightBlue:avg(80,96,2),
        axis:out.__m7v80YoloAxisAligned===true,
        perspective:out.__m7v46Perspective===true
      };
    });
    assert.equal(v80AxisAligned.axis,true,'v80 axis-aligned marker missing '+JSON.stringify(v80AxisAligned));
    assert.equal(v80AxisAligned.perspective,false,'v80 YOLO crop must not mark perspective '+JSON.stringify(v80AxisAligned));
    assert(v80AxisAligned.leftRed>v80AxisAligned.leftBlue+80,'v80 left/right orientation changed '+JSON.stringify(v80AxisAligned));
    assert(v80AxisAligned.rightBlue>v80AxisAligned.rightRed+80,'v80 right/left orientation changed '+JSON.stringify(v80AxisAligned));

    const v83YoloClass=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const mapped=['1m','5p','3z','0s','7z','6z'].map(api.yoloLabelToAppTile);
      const yolo=Array.from({length:14},(_,i)=>({index:i,rawLabel:'9p',label:'9筒',score:.80}));
      yolo[0]={index:0,rawLabel:'1m',label:'1萬',score:.80};
      yolo[1]={index:1,rawLabel:'5p',label:'5筒',score:.18};
      yolo[2]={index:2,rawLabel:'3z',label:'西',score:.14};
      // Five 9p claims total; only four strongest may stay YOLO.
      const legacy=Array(14).fill('9索');legacy[2]='西';
      const chosen=api.chooseYoloPrimaryRecognition(yolo,legacy,true,.15);
      return {mapped,labels:chosen.labels,sources:chosen.sources,yoloUsed:chosen.yoloUsed,legacyUsed:chosen.legacyUsed,unresolved:chosen.unresolved};
    });
    assert.deepEqual(v83YoloClass.mapped,['1萬','5筒','西','5索','中','發'],'v83 YOLO label mapping mismatch '+JSON.stringify(v83YoloClass));
    assert.equal(v83YoloClass.labels[1],'5筒','v83 .18 confidence should use YOLO at .15 threshold '+JSON.stringify(v83YoloClass));
    assert.equal(v83YoloClass.sources[2],'legacy','v83 low-confidence YOLO should fallback to legacy '+JSON.stringify(v83YoloClass));
    assert(v83YoloClass.yoloUsed<=6,'v83 max-four guard should force excess repeated labels to legacy '+JSON.stringify(v83YoloClass));

    const v85ProductionFastPath=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const yolo=Array.from({length:14},(_,i)=>({index:i,label:(i<4?'1萬':String((i%9)+1)+'筒'),rawLabel:'',score:.82}));
      const complete=api.chooseYoloPrimaryRecognition(yolo,[],true,.15);
      const low=yolo.map((x,i)=>i===5?{...x,score:.10}:x);
      const incomplete=api.chooseYoloPrimaryRecognition(low,[],true,.15);
      const root=document.createElement('div');
      root.innerHTML='<div class="hand-result-head-m7v5"></div>';
      document.body.appendChild(root);
      const details=api.mountDetectorDiagnostic(root);
      const result={
        completeRun:api.shouldRunLegacyClassifier(complete,14),
        incompleteRun:api.shouldRunLegacyClassifier(incomplete,14),
        fallbackRun:api.shouldRunLegacyClassifier(api.chooseYoloPrimaryRecognition([],[],false,.15),14),
        tag:details.tagName,open:details.open,
        summary:details.querySelector('.m7v78-detector-label')?.textContent||''
      };
      root.remove();
      return result;
    });
    assert.equal(v85ProductionFastPath.completeRun,false,'v85 must skip legacy classifier when YOLO resolves all 14 '+JSON.stringify(v85ProductionFastPath));
    assert.equal(v85ProductionFastPath.incompleteRun,true,'v85 must keep legacy fallback for unresolved YOLO '+JSON.stringify(v85ProductionFastPath));
    assert.equal(v85ProductionFastPath.fallbackRun,true,'v85 must keep legacy classifier when YOLO is not adopted '+JSON.stringify(v85ProductionFastPath));
    assert.equal(v85ProductionFastPath.tag,'DETAILS','v85 detector diagnostics should use native details '+JSON.stringify(v85ProductionFastPath));
    assert.equal(v85ProductionFastPath.open,false,'v85 detector diagnostics should be collapsed by default '+JSON.stringify(v85ProductionFastPath));

    const cropQuality=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=220;canvas.height=150;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#7a4d2d';ctx.fillRect(0,0,220,150);
      ctx.fillStyle='#d8d6cf';ctx.fillRect(20,18,82,116);
      ctx.fillStyle='#1a1a1a';ctx.fillRect(54,50,9,45);
      const good=window.M7CameraV36.boxCropQuality(ctx,{x:16,y:12,w:90,h:124});
      const bad=window.M7CameraV36.boxCropQuality(ctx,{x:128,y:12,w:82,h:124});
      return {good,bad};
    });
    assert(cropQuality.good.score>cropQuality.bad.score+.20,
      'v76 crop quality does not prefer a tile face over table '+JSON.stringify(cropQuality));
    assert.equal(cropQuality.good.broken,false,'v76 marked synthetic tile as broken '+JSON.stringify(cropQuality));
    assert.equal(cropQuality.bad.broken,true,'v76 failed to reject table-only crop '+JSON.stringify(cropQuality));

    const trimQuality=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const make=(side)=>{
        const c=document.createElement('canvas');c.width=96;c.height=144;
        const x=c.getContext('2d');x.fillStyle='#dedbd2';x.fillRect(0,0,96,144);
        x.fillStyle='#171717';x.fillRect(43,42,9,62);
        if(side==='left'){x.fillStyle='#7b4d2f';x.fillRect(0,0,24,144);}
        if(side==='right'){x.fillStyle='#7b4d2f';x.fillRect(72,0,24,144);}
        return c;
      };
      const left=api.chooseRecognitionWindow(make('left'),6,14);
      const right=api.chooseRecognitionWindow(make('right'),6,14);
      const normal=api.chooseRecognitionWindow(make('none'),6,14);
      return {
        left:{used:left.used,lt:left.trimLeft,rt:left.trimRight,before:left.beforeQuality.edgeContamination,after:left.quality.edgeContamination},
        right:{used:right.used,lt:right.trimLeft,rt:right.trimRight,before:right.beforeQuality.edgeContamination,after:right.quality.edgeContamination},
        normal:{used:normal.used,lt:normal.trimLeft,rt:normal.trimRight}
      };
    });
    assert(trimQuality.left.used&&trimQuality.left.lt>0&&trimQuality.left.after<trimQuality.left.before,
      'v76 left neighbor bleed was not removed by a quality-improving trim '+JSON.stringify(trimQuality));
    assert(trimQuality.right.used&&trimQuality.right.rt>0&&trimQuality.right.after<trimQuality.right.before,
      'v76 right neighbor bleed was not removed by a quality-improving trim '+JSON.stringify(trimQuality));
    assert.equal(trimQuality.normal.used,false,'v76 trimmed a clean crop without quality evidence '+JSON.stringify(trimQuality));

    const localBoundary=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const c=document.createElement('canvas');c.width=220;c.height=150;
      const x=c.getContext('2d');x.fillStyle='#74482c';x.fillRect(0,0,220,150);
      x.fillStyle='#dedbd2';x.fillRect(20,18,180,114);
      x.fillStyle='#171717';x.fillRect(48,54,6,44);x.fillRect(108,54,6,44);x.fillRect(168,54,6,44);
      // A narrow wood strip just inside the middle tile's left edge makes only
      // that local boundary suspicious.
      x.fillStyle='#74482c';x.fillRect(75,18,5,114);
      const boxes=[{x:20,y:18,w:60,h:114},{x:80,y:18,w:60,h:114},{x:140,y:18,w:60,h:114}];
      const before=api.tripletCropQuality(x,boxes,1);
      const rescue=api.rescueLocalBoundaries(x,boxes);
      const after=api.tripletCropQuality(x,rescue.boxes,1);
      return {used:rescue.adoptedCount,before,after,debug:rescue.debug};
    });
    if(localBoundary.used){
      assert(localBoundary.after.brokenCount<=localBoundary.before.brokenCount,
        'v76 local boundary rescue increased broken neighbors '+JSON.stringify(localBoundary));
      assert(localBoundary.after.score>=localBoundary.before.score-.012,
        'v76 local boundary rescue damaged triplet quality '+JSON.stringify(localBoundary));
    }

    const weakFallback=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=840;c.height=260;
      const x=c.getContext('2d');x.fillStyle='#d9d6cc';x.fillRect(100,75,602,112);
      const row={x:100,y:75,w:602,h:112};
      const selected=window.M7CameraV36.selectRowByCropQuality(x,row,null,null,14);
      return {used:selected.used,start:selected.startDeltaPitch,pitch:selected.pitchScale};
    });
    assert.equal(weakFallback.used,false,'v76 changed a clean row without evidence '+JSON.stringify(weakFallback));

    const qualityRow=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=840;canvas.height=260;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#70472b';ctx.fillRect(0,0,840,260);
      const start=110,pitch=43,top=74,height=114;
      ctx.fillStyle='#d8d6cf';ctx.fillRect(start,top,pitch*14,height);
      ctx.fillStyle='#1a1a1a';
      for(let i=0;i<14;i++)ctx.fillRect(start+i*pitch+18,110,5,38);
      const noisy={x:start-5,y:68,w:pitch*14+18,h:128};
      const outer=window.M7CameraV36.refineRowOuterEdges(ctx,noisy,14);
      const grid=window.M7CameraV36.fitGlobalRowGrid(ctx,noisy,14);
      const selected=window.M7CameraV36.selectRowByCropQuality(ctx,noisy,outer,grid,14);
      return {
        used:selected.used,reason:selected.reason,
        before:selected.base?.score,after:selected.best?.score,
        brokenBefore:selected.brokenBefore,brokenAfter:selected.brokenAfter,
        row:selected.row
      };
    });
    assert(qualityRow.after>=qualityRow.before-.012,
      'v76 selected a lower-quality row without broken-count benefit '+JSON.stringify(qualityRow));
    assert(qualityRow.brokenAfter<=qualityRow.brokenBefore,
      'v76 row quality selection increased broken crops '+JSON.stringify(qualityRow));

    const globalGrid=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=840;canvas.height=260;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#70472b';ctx.fillRect(0,0,840,260);
      const start=108,pitch=44;
      for(let i=0;i<14;i++){
        const x=start+i*pitch;
        ctx.fillStyle='#d9d6cc';ctx.fillRect(x,76,pitch-2,112);
        ctx.fillStyle='#222';ctx.fillRect(x+14,112+(i%3)*3,5,42);
        ctx.fillRect(x+25,128,8,13);
      }
      const noisyRow={x:start-10,y:68,w:pitch*14+18,h:128};
      const fit=window.M7CameraV36.fitGlobalRowGrid(ctx,noisyRow,14);
      return {
        used:fit.used,reason:fit.reason,
        beforeX:Math.abs(noisyRow.x-start),afterX:Math.abs((fit.row?.x??noisyRow.x)-start),
        beforePitch:Math.abs(noisyRow.w/14-pitch),afterPitch:Math.abs((fit.row?.w??noisyRow.w)/14-pitch),
        gain:fit.gain??0
      };
    });
    assert(globalGrid.used,'v61 global periodic grid did not engage '+JSON.stringify(globalGrid));
    assert(globalGrid.afterX<globalGrid.beforeX,'v61 grid did not improve row phase '+JSON.stringify(globalGrid));
    assert(globalGrid.afterPitch<globalGrid.beforePitch,'v61 grid did not improve pitch '+JSON.stringify(globalGrid));
    assert(globalGrid.gain>.05,'v61 grid evidence gain too small '+JSON.stringify(globalGrid));
    const faceNorm=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=140;canvas.height=180;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#80542f';ctx.fillRect(0,0,140,180);
      ctx.fillStyle='#d7d4ca';ctx.fillRect(24,46,92,86);
      ctx.fillStyle='#161616';ctx.fillRect(51,68,10,42);ctx.fillRect(74,82,24,10);
      const rect=window.M7CameraV36.tileFaceRect(ctx,{x:0,y:0,w:140,h:180});
      const feat=window.M7CameraV36.featureFromBox(ctx,{x:0,y:0,w:140,h:180});
      return {rect,kind:feat.kind,width:feat.width,height:feat.height,gray:feat.gray.length,edge:feat.edge.length,red:feat.red.length,green:feat.green.length};
    });
    assert(faceNorm.rect.w<120&&faceNorm.rect.h<140&&faceNorm.rect.y>20,
      'tile face normalization did not remove row background '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.kind,'perspective-direct-v1','v50 descriptor kind missing '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.width,24,'v50 descriptor width changed unexpectedly '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.height,36,'v50 descriptor height changed unexpectedly '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.gray,864,'v48 gray map size changed unexpectedly '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.edge,864,'v48 edge map size changed unexpectedly '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.red,864,'v48 red map size changed unexpectedly '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.green,864,'v48 green map size changed unexpectedly '+JSON.stringify(faceNorm));
    const descriptorRobustness=await page.evaluate(()=>{
      function make(bg,face,ink,variant){
        const canvas=document.createElement('canvas');canvas.width=140;canvas.height=180;
        const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,140,180);
        ctx.fillStyle=face;ctx.fillRect(24,46,92,86);
        ctx.fillStyle=ink;
        if(variant==='same'){ctx.fillRect(51,68,10,42);ctx.fillRect(74,82,24,10);}
        else{ctx.beginPath();ctx.arc(70,89,22,0,Math.PI*2);ctx.fill();}
        return window.M7CameraV36.featureFromBox(ctx,{x:0,y:0,w:140,h:180});
      }
      const a=make('#80542f','#dedbd0','#181818','same');
      const b=make('#5d3823','#aaa79e','#202020','same');
      const other=make('#80542f','#dedbd0','#181818','other');
      const core=window.M7RecognitionCoreV33;
      const red=make('#80542f','#dedbd0','#b62020','same');
      const green=make('#80542f','#dedbd0','#188a45','same');
      return {
        same:core.featureDistance(a,b),
        different:core.featureDistance(a,other),
        redGreen:core.featureDistance(red,green)
      };
    });
    assert(descriptorRobustness.same<descriptorRobustness.different,
      'v49 perspective matcher is not more stable to lighting than to a different symbol '+JSON.stringify(descriptorRobustness));
    assert(descriptorRobustness.redGreen>0,
      'v49 color maps failed to distinguish red and green ink '+JSON.stringify(descriptorRobustness));
    const orientationRobustness=await page.evaluate(()=>{
      function make(rot=0,variant='same'){
        const source=document.createElement('canvas');source.width=100;source.height=140;
        const s=source.getContext('2d');s.fillStyle='#80542f';s.fillRect(0,0,100,140);
        s.fillStyle='#ddd9cf';s.fillRect(22,18,56,104);
        s.fillStyle='#171717';
        if(variant==='same'){s.fillRect(42,38,9,58);s.fillRect(51,65,18,8);}
        else{s.beginPath();s.arc(50,70,18,0,Math.PI*2);s.fill();}
        if(!rot)return source;
        const out=document.createElement('canvas');out.width=120;out.height=160;
        const o=out.getContext('2d');o.fillStyle='#80542f';o.fillRect(0,0,120,160);
        o.translate(60,80);o.rotate(rot*Math.PI/180);o.drawImage(source,-50,-70);return out;
      }
      const api=window.M7CameraV36,core=window.M7RecognitionCoreV33;
      const a=api.descriptorFromCanvas(api.canonicalizeCanvas(make(0,'same'),64,96));
      const tilted=api.descriptorFromCanvas(api.canonicalizeCanvas(make(6,'same'),64,96));
      const different=api.descriptorFromCanvas(api.canonicalizeCanvas(make(0,'other'),64,96));
      return {same:core.featureDistance(a,tilted),different:core.featureDistance(a,different)};
    });
    assert(orientationRobustness.same<orientationRobustness.different,
      'v49 orientation normalization did not stabilize the same tile '+JSON.stringify(orientationRobustness));

    const perspectiveRectification=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=160;canvas.height=190;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#7b5032';ctx.fillRect(0,0,160,190);
      ctx.fillStyle='#dedbd0';ctx.beginPath();
      ctx.moveTo(30,24);ctx.lineTo(126,28);ctx.lineTo(132,164);ctx.lineTo(25,160);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#151515';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(64,55);ctx.lineTo(70,132);ctx.stroke();
      ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(70,91);ctx.lineTo(105,94);ctx.stroke();
      const api=window.M7CameraV36;
      const quad=api.detectFaceQuad(canvas);
      const warped=quad?api.warpQuadToCanvas(canvas,quad,64,96):null;
      const geom=warped?api.detectFaceGeometry(warped):null;
      const feat=warped?api.descriptorFromCanvas(warped):null;
      return {quad,geom:geom?{faceW:geom.faceW,faceH:geom.faceH,fill:geom.fill}:null,kind:feat?.kind||''};
    });
    assert(perspectiveRectification.quad&&perspectiveRectification.quad.length===4,
      'v55 mild perspective quad detection failed '+JSON.stringify(perspectiveRectification));
    assert(perspectiveRectification.geom&&perspectiveRectification.geom.faceH>perspectiveRectification.geom.faceW,
      'v55 mild perspective warp did not produce an upright tile '+JSON.stringify(perspectiveRectification));
    assert.equal(perspectiveRectification.kind,'perspective-direct-v1',
      'v55 perspective descriptor kind missing '+JSON.stringify(perspectiveRectification));

    const legacyMigration=await page.evaluate(()=>{
      const n=16*24;
      const old={
        '5筒':[{
          kind:'oriented-direct-v1',width:16,height:24,
          gray:Array(n).fill(.1),edge:Array(n).fill(.2),red:Array(n).fill(0),green:Array(n).fill(0)
        }]
      };
      localStorage.setItem('MahjongScoreApp_tile_templates_m7v45oriented1',JSON.stringify(old));
      const migrated=window.M7CameraV36.loadLegacyLibrary();
      localStorage.removeItem('MahjongScoreApp_tile_templates_m7v45oriented1');
      return {labels:Object.keys(migrated),kind:migrated['5筒']?.[0]?.kind||'',width:migrated['5筒']?.[0]?.width||0,height:migrated['5筒']?.[0]?.height||0};
    });
    assert.deepEqual(legacyMigration.labels,['5筒'],'v49 did not recover the v45 learning library '+JSON.stringify(legacyMigration));
    assert.equal(legacyMigration.kind,'perspective-direct-v1','v49 legacy feature kind was not converted '+JSON.stringify(legacyMigration));
    assert.equal(legacyMigration.width,24,'v49 legacy feature was not upsampled to 24px '+JSON.stringify(legacyMigration));
    assert.equal(legacyMigration.height,36,'v49 legacy feature was not upsampled to 36px '+JSON.stringify(legacyMigration));

    const balancedRanking=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=4,h=4,n=w*h;
      const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
      const query=feat(0),many=[feat(0),feat(.1),feat(.1),feat(.8),feat(.8)],one=[feat(.2)];
      return {
        old:core.rankLabelsRobust(query,{many,one},{singlePenalty:.018,maxTemplates:3})[0]?.label||'',
        balanced:core.rankLabelsBalanced(query,{many,one})[0]?.label||''
      };
    });
    assert.equal(balancedRanking.old,'many','v49 fixture no longer demonstrates old template-count bias '+JSON.stringify(balancedRanking));
    assert.equal(balancedRanking.balanced,'one','v49 balanced ranking still favors template-count chance '+JSON.stringify(balancedRanking));

    const familyFirst=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=4,h=4,n=w*h;
      const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
      const query=feat(0),lib={
        '1萬':[feat(.10)],'2萬':[feat(.10)],'3萬':[feat(.10)],
        '5筒':[feat(.02)],'6筒':[feat(.80)],'8筒':[feat(.80)]
      };
      return {
        global:core.rankLabelsBalanced(query,lib)[0]?.label||'',
        family:core.rankFamiliesBalanced(query,lib)[0]?.label||'',
        hierarchical:core.rankLabelsHierarchical(query,lib)[0]?.label||''
      };
    });
    assert.equal(familyFirst.global,'5筒','v49 family fixture no longer exposes cross-family global error '+JSON.stringify(familyFirst));
    assert.equal(familyFirst.family,'萬','v49 family stage chose the wrong family '+JSON.stringify(familyFirst));
    assert.equal(familyFirst.hierarchical,'1萬','v49 hierarchical label stage escaped the chosen family '+JSON.stringify(familyFirst));

    const familyDiscriminative=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=6,h=6,n=w*h;
      const feat=top=>{
        const gray=Array(n).fill(.15),edge=Array(n).fill(.05),red=Array(n).fill(0),green=Array(n).fill(0);
        for(let x=0;x<w;x++){gray[x]=top;edge[x]=top;}
        return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
      };
      const lib={'1萬':[feat(.1)],'2萬':[feat(.9)]};
      const weights=core.familyDiscriminativeWeights(lib)['萬'];
      return {
        top:weights.slice(0,w).reduce((s,v)=>s+v,0)/w,
        bottom:weights.slice(w).reduce((s,v)=>s+v,0)/(n-w),
        label:core.rankLabelsFamilyDiscriminative(feat(.82),lib,{blend:.84,priorWeight:.26,maxPenalty:.016})[0]?.label||''
      };
    });
    assert(familyDiscriminative.top>familyDiscriminative.bottom*2,
      'v51 did not emphasize within-family discriminative pixels '+JSON.stringify(familyDiscriminative));
    assert.equal(familyDiscriminative.label,'2萬',
      'v51 discriminative ranking chose the wrong label '+JSON.stringify(familyDiscriminative));

    // Simulate a landscape camera frame and verify shutter -> post-capture 14 editable previews.
    const shutter=await page.evaluate(async()=>{
      // Earlier bootstrap coverage may leave a camera overlay alive depending on
      // headless getUserMedia timing. Start this fixture from one known overlay.
      document.getElementById('realtime-hand-camera-m7v3')?.remove();
      const fake=document.createElement('div');
      fake.id='realtime-hand-camera-m7v3';fake.className='realtime-hand-camera-m7v3';
      const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
      canvas.className='realtime-hand-video-m7v3';
      canvas.style.width='100%';canvas.style.height='100%';canvas.style.objectFit='cover';
      const ctx=canvas.getContext('2d');ctx.fillStyle='#6d4930';ctx.fillRect(0,0,1920,1080);
      ctx.fillStyle='#85847f';ctx.fillRect(210,470,1500,145);
      ctx.fillStyle='#222';
      for(let i=0;i<14;i++){const x=230+i*105;ctx.fillRect(x,500,6,55);ctx.fillRect(x+18,525,13,17);}
      Object.defineProperty(canvas,'readyState',{value:4});
      Object.defineProperty(canvas,'videoWidth',{value:1920});
      Object.defineProperty(canvas,'videoHeight',{value:1080});
      const guide=document.createElement('div');guide.className='realtime-hand-guide-m7v3';
      guide.innerHTML='<div class="realtime-hand-guide-box-m7v3"></div>';
      const status=document.createElement('div');status.className='realtime-hand-status-m7v3';
      status.innerHTML='<b>test</b><span id="realtime-hand-count-m7v3">0 / 14</span><small>test</small>';
      const cancel=document.createElement('button');cancel.className='realtime-hand-cancel-m7v3';cancel.textContent='キャンセル';
      cancel.onclick=()=>fake.remove();
      fake.append(canvas,guide,status,cancel);document.body.append(fake);
      const trigger=document.createElement('button');trigger.id='open-realtime-hand-camera-m7v3';
      document.body.append(trigger);trigger.click();trigger.remove();
      await new Promise(resolve=>setTimeout(resolve,900));
      const button=fake.querySelector('.m7v36-shutter');
      if(!button)return {error:'v36 shutter missing'};
      const a=button.getBoundingClientRect(),b=cancel.getBoundingClientRect();
      const overlap=!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
      button.click();
      let result=null;
      for(let i=0;i<30&&!result;i++){
        await new Promise(resolve=>setTimeout(resolve,100));
        result=document.getElementById('hand-result-overlay-m7v5');
      }
      const tiles=result?.querySelectorAll('.hand-result-tile-m7v5').length||0;
      const crops=result?.querySelectorAll('.hand-result-tile-m7v5.m7v36-crop').length||0;
      const note=result?.querySelector('.hand-result-note-m7v5')?.textContent||'';
      const firstCrop=result?.querySelector('.hand-result-tile-m7v5.m7v36-crop');
      const cropStyle=firstCrop?getComputedStyle(firstCrop):null;
      const preview={backgroundSize:cropStyle?.backgroundSize||'',height:firstCrop?.getBoundingClientRect().height||0};
      const diag=window.M7V36LastDiagnostics||null;
      let learned=0,rawSaved=0,firstPreviewSrc='',secondPreviewSrc='',pickerLayout=null;
      if(result){
        const resultTiles=[...result.querySelectorAll('.hand-result-tile-m7v5')];
        if(resultTiles[0]){
          resultTiles[0].dataset.m7v39Suggestions=JSON.stringify(['1萬','2萬','3萬']);
          if(resultTiles[1])resultTiles[1].dataset.m7v39Suggestions=JSON.stringify(['4筒','5筒','6筒']);
          resultTiles[0].click();
          await new Promise(resolve=>setTimeout(resolve,70));
          firstPreviewSrc=document.querySelector('#tile-picker-m7v5 .m7v57-photo-preview img')?.src||'';
          const suggestionButtons=[...document.querySelectorAll('#tile-picker-m7v5 .m7v39-suggestions button')];
          window.__m7v39SuggestionCount=suggestionButtons.length;
          const picker=document.getElementById('tile-picker-m7v5');
          if(picker){
            const card=picker.querySelector('.tile-picker-card-m7v5');
            const grid=picker.querySelector('.tile-picker-grid-m7v5');
            const close=picker.querySelector('.tile-picker-cancel-m7v5');
            const cr=card?.getBoundingClientRect(),gr=grid?.getBoundingClientRect(),xr=close?.getBoundingClientRect();
            const vh=window.visualViewport?.height||innerHeight;
            pickerLayout={
              cardTop:cr?.top??-999,cardBottom:cr?.bottom??999,closeBottom:xr?.bottom??999,viewportHeight:vh,
              tileCount:grid?.querySelectorAll('button').length||0,
              gridOverflowY:grid?getComputedStyle(grid).overflowY:'',
              gridClientHeight:grid?.clientHeight||0,gridScrollHeight:grid?.scrollHeight||0,
              gridBottom:gr?.bottom??999,
              tileNames:[...grid.querySelectorAll('button')].map(b=>b.textContent.trim())
            };
          }
          const normalChoice=picker?.querySelector('.tile-picker-grid-m7v5 button');
          normalChoice?.click();
          await new Promise(resolve=>setTimeout(resolve,110));
          window.__m7v42OwnerIndex=Number(picker?.dataset.m8v31Current);
          secondPreviewSrc=document.querySelector('#tile-picker-m7v5 .m7v57-photo-preview img')?.src||'';
          const secondTexts=[...document.querySelectorAll('#tile-picker-m7v5 .m7v39-suggestions button')].map(b=>b.textContent.trim());
          window.__m7v42SecondSuggestions=secondTexts;
          document.querySelector('#tile-picker-m7v5 .tile-picker-cancel-m7v5')?.click();
        }
        resultTiles.forEach((b,i)=>b.dataset.tile='test-'+i);
        const ok=result.querySelector('.hand-result-ok-m7v5');
        if(ok){
          ok.disabled=false;
          ok.onclick=()=>result.remove();
          ok.click();
          await new Promise(resolve=>setTimeout(resolve,180));
          try{
            const lib=JSON.parse(localStorage.getItem('MahjongScoreApp_tile_templates_stable1')||'{}');
            learned=Object.values(lib).reduce((n,list)=>n+(Array.isArray(list)&&list.length?1:0),0);
            rawSaved=(await window.M7CameraV36.loadTrainingSamples()).length;
          }catch(_){}
        }
      }
      result?.remove();fake.remove();
      localStorage.removeItem('MahjongScoreApp_tile_templates_stable1');
      localStorage.removeItem('MahjongScoreApp_tile_templates_stable1_backup');
      const rebuiltFromRaw=await window.M7CameraV36.rebuildLibraryFromTrainingImages();
      const rawRecovered=Object.keys(rebuiltFromRaw||{}).filter(label=>Array.isArray(rebuiltFromRaw[label])&&rebuiltFromRaw[label].length).length;
      const suggestionCount=window.__m7v39SuggestionCount||0;delete window.__m7v39SuggestionCount;
      const secondSuggestions=window.__m7v42SecondSuggestions||[];delete window.__m7v42SecondSuggestions;
      const ownerIndex=window.__m7v42OwnerIndex;delete window.__m7v42OwnerIndex;
      return {overlap,tiles,crops,note,diag,preview,learned,rawSaved,rawRecovered,firstPreviewSrc,secondPreviewSrc,suggestionCount,secondSuggestions,ownerIndex,pickerLayout};
    });
    assert.equal(shutter.overlap,false,'v36 shutter and cancel overlap '+JSON.stringify(shutter));
    assert.equal(shutter.tiles,14,'v36 shutter did not open 14 editable slots '+JSON.stringify(shutter));
    assert.equal(shutter.crops,14,'v36 did not use 14 high-resolution row crops '+JSON.stringify(shutter));
    assert(shutter.note.includes('保存完了を確認'),'v58 blocking calibration explanation missing '+JSON.stringify(shutter));
    assert.equal(shutter.preview.backgroundSize,'contain','tile preview must show the full crop '+JSON.stringify(shutter));
    assert(shutter.preview.height<190,'tile preview should not stretch through the whole result card '+JSON.stringify(shutter));
    assert.equal(shutter.learned,14,'verified v58 calibration was not persisted before result transition '+JSON.stringify(shutter));
    assert(shutter.rawSaved>=14,'verified tile images were not persisted to IndexedDB '+JSON.stringify(shutter));
    assert.equal(shutter.rawRecovered,14,'v59 could not rebuild all learned labels from IndexedDB after localStorage cache removal '+JSON.stringify(shutter));
    assert(shutter.firstPreviewSrc.startsWith('data:image/'),'v57 photographed tile preview missing '+JSON.stringify(shutter));
    assert(shutter.secondPreviewSrc.startsWith('data:image/'),'v57 photographed tile preview did not follow picker '+JSON.stringify(shutter));
    assert.notEqual(shutter.firstPreviewSrc,shutter.secondPreviewSrc,'v57 photographed tile preview stayed on tile 1 '+JSON.stringify(shutter));
    assert.equal(shutter.suggestionCount,3,'top-3 quick suggestions missing '+JSON.stringify(shutter));
    assert.equal(shutter.ownerIndex,1,'continuous picker owner did not advance to tile 2 '+JSON.stringify(shutter));
    assert.deepEqual(shutter.secondSuggestions,['4筒','5筒','6筒'],'normal-grid advance kept stale suggestions '+JSON.stringify(shutter));
    assert(shutter.pickerLayout,'v60 picker layout diagnostics missing '+JSON.stringify(shutter));
    assert(shutter.pickerLayout.cardTop>=-1&&shutter.pickerLayout.cardBottom<=shutter.pickerLayout.viewportHeight+1,
      'v60 continuous picker card is outside landscape viewport '+JSON.stringify(shutter.pickerLayout));
    assert(shutter.pickerLayout.closeBottom<=shutter.pickerLayout.viewportHeight+1,
      'v60 close button is cut off '+JSON.stringify(shutter.pickerLayout));
    assert.equal(shutter.pickerLayout.tileCount,34,'v60 picker must keep all 34 tile options visible '+JSON.stringify(shutter.pickerLayout));
    assert.equal(shutter.pickerLayout.gridOverflowY,'hidden','v60 tile list must not require inner scrolling '+JSON.stringify(shutter.pickerLayout));
    assert(shutter.pickerLayout.gridScrollHeight<=shutter.pickerLayout.gridClientHeight+1,
      'v60 tile grid still scrolls in iPhone-sized landscape viewport '+JSON.stringify(shutter.pickerLayout));
    assert.deepEqual(shutter.pickerLayout.tileNames.slice(0,12),
      ['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','東','南','西'],
      'v62 first row must keep manzu positions and group honors on right '+JSON.stringify(shutter.pickerLayout.tileNames));
    assert.deepEqual(shutter.pickerLayout.tileNames.slice(12,24),
      ['1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','北','白','發'],
      'v62 pinzu must sit directly below manzu '+JSON.stringify(shutter.pickerLayout.tileNames));
    assert.deepEqual(shutter.pickerLayout.tileNames.slice(24,34),
      ['1索','2索','3索','4索','5索','6索','7索','8索','9索','中'],
      'v62 souzu must sit directly below pinzu '+JSON.stringify(shutter.pickerLayout.tileNames));

    const v122RedCorrection=await page.evaluate(async()=>{
      window.showHandResultM7V5?.(Array(14).fill(''));
      const root=document.getElementById('hand-result-overlay-m7v5');
      const first=root?.querySelector('.hand-result-tile-m7v5');
      first?.click();
      await new Promise(resolve=>setTimeout(resolve,80));
      const picker=document.getElementById('tile-picker-m7v5');
      const redButtons=[...picker.querySelectorAll('.m7v122-red-options button')];
      const redNames=redButtons.map(b=>b.dataset.tileName||b.textContent.trim());
      const redSou=redButtons.find(b=>b.dataset.m7v122RawLabel==='0s');
      redSou?.click();
      await new Promise(resolve=>setTimeout(resolve,80));
      const afterRed={
        tile:first?.dataset.tile||'',
        raw:first?.dataset.m7v119RawLabel||'',
        red:first?.dataset.m7v122Red||'',
        aria:first?.getAttribute('aria-label')||'',
        redClass:first?.classList.contains('m7v122-red-tile')||false
      };
      window.M7V122ResultPicker?.applyChoice?.(first,'5索','5索','');
      await new Promise(resolve=>setTimeout(resolve,30));
      const afterNormal={
        tile:first?.dataset.tile||'',
        raw:first?.dataset.m7v119RawLabel||'',
        red:first?.dataset.m7v122Red||'',
        aria:first?.getAttribute('aria-label')||'',
        redClass:first?.classList.contains('m7v122-red-tile')||false
      };
      root?.remove();
      document.getElementById('tile-picker-m7v5')?.remove();
      return {redNames,afterRed,afterNormal};
    });
    assert.deepEqual(v122RedCorrection.redNames,['赤5萬','赤5筒','赤5索'],
      'v122 correction picker must expose all three red fives '+JSON.stringify(v122RedCorrection));
    assert.deepEqual(v122RedCorrection.afterRed,{tile:'5索',raw:'0s',red:'1',aria:'赤5索',redClass:true},
      'v122 red 5-sou correction must preserve aka metadata while scoring as 5索 '+JSON.stringify(v122RedCorrection));
    assert.deepEqual(v122RedCorrection.afterNormal,{tile:'5索',raw:'',red:'',aria:'5索',redClass:false},
      'v122 choosing ordinary 5-sou must clear stale aka metadata '+JSON.stringify(v122RedCorrection));
    const v128Verifier=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const mk=labels=>labels.map(label=>({label,rawLabel:({'1萬':'1m','2萬':'2m','3萬':'3m','4萬':'4m','5萬':'5m','6萬':'6m','7萬':'7m','8萬':'8m','9萬':'9m'})[label]||'',score:.82,classMargin:.82,crossViewShare:1,crossViewSupport:1,crossViewCount:1}));
      const bad=mk(['1萬','2萬','3萬','4萬','5萬','5萬','5萬','5萬','6萬','7萬','4萬','4萬','8萬','9萬']);
      const clean=mk(['1萬','2萬','3萬','4萬','5萬','5萬','5萬','5萬','6萬','7萬','8萬','8萬','8萬','9萬']);
      const reverse=mk(['1萬','2萬','3萬','8萬','5萬','5萬','6萬','7萬','8萬','8萬','8萬','9萬','9萬','9萬']);
      const legacy=Array(14).fill('');legacy[10]='8萬';
      const debug=Array.from({length:14},()=>[]);
      debug[10]=[{label:'8萬',sampleCount:3,distance:.05,templateConsensusDistance:.08,viewTopVotes:4,viewCount:5}];
      const unrelated=legacy.slice();unrelated[10]='7萬';
      const redMan=mk(['5萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','9萬','9萬','9萬','9萬','9萬','9萬']);
      redMan[0]={label:'5筒',rawLabel:'0p',score:.72,classMargin:.72,crossViewShare:1,crossViewSupport:1,crossViewCount:1};
      const redPin=mk(['5筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','9筒','9筒','9筒','9筒','9筒','9筒']);
      redPin[0]={label:'5筒',rawLabel:'0p',score:.72,classMargin:.72,crossViewShare:1,crossViewSupport:1,crossViewCount:1};
      const repairedMan=api.repairRedFiveRecognition(redMan,Array(14).fill(0),true);
      const repairedPin=api.repairRedFiveRecognition(redPin,Array(14).fill(0),true);
      return {
        sequenceBad:api.yoloV128Manzu48SequenceConflicts(bad,true),
        sequenceClean:api.yoloV128Manzu48SequenceConflicts(clean,true),
        sequenceReverse:api.yoloV128Manzu48SequenceConflicts(reverse,true),
        template:api.yoloV128Manzu48TemplateConflicts(bad,legacy,debug,true),
        unrelated:api.yoloV128Manzu48TemplateConflicts(bad,unrelated,debug,true),
        redMan:{label:repairedMan[0].label,raw:repairedMan[0].rawLabel,original:repairedMan[0].rawOriginalLabel,repair:repairedMan[0].redRepair},
        redPin:{label:repairedPin[0].label,raw:repairedPin[0].rawLabel,repair:repairedPin[0].redRepair||''}
      };
    });
    assert.deepEqual(v128Verifier.sequenceBad,[10,11],'v128 must stop the repeated high-confidence 8萬→4萬 block seen on iPhone '+JSON.stringify(v128Verifier));
    assert.deepEqual(v128Verifier.sequenceClean,[],'v128 must keep a correctly sorted manzu run '+JSON.stringify(v128Verifier));
    assert(v128Verifier.sequenceReverse.includes(3),'v128 should symmetrically challenge a suspicious 8萬 in the 4萬 zone '+JSON.stringify(v128Verifier));
    assert.deepEqual(v128Verifier.template,[10],'v128 learned-template verifier should override a strong 4萬 YOLO when corrected 8萬 samples strongly agree '+JSON.stringify(v128Verifier));
    assert.deepEqual(v128Verifier.unrelated,[],'v128 template verifier must stay scoped to 4萬↔8萬 '+JSON.stringify(v128Verifier));
    assert.deepEqual(v128Verifier.redMan,{label:'5萬',raw:'0m',original:'0p',repair:'local-majority-suit'},
      'v128 should repair raw red5-pin to red5-man from strong local manzu evidence '+JSON.stringify(v128Verifier));
    assert.equal(v128Verifier.redPin.raw,'0p','v128 must keep a coherent red5-pin '+JSON.stringify(v128Verifier));

    const v127CaptureQuality=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const makeGood=()=>{
        const c=document.createElement('canvas');c.width=600;c.height=200;
        const x=c.getContext('2d');x.fillStyle='#7b5638';x.fillRect(0,0,600,200);
        const start=30,w=38,gap=3,top=30,h=125;
        for(let i=0;i<14;i++){
          x.fillStyle='#e7e4da';x.fillRect(start+i*(w+gap),top,w,h);
          x.fillStyle='#171717';x.fillRect(start+i*(w+gap)+15,65,6,55);
          x.fillStyle='#a32222';x.fillRect(start+i*(w+gap)+12,125,12,5);
        }
        return c;
      };
      const analysis={detectorAdopted:true,features:Array(14).fill({}),brokenCropCount:0,row:{x:30,y:30,w:570,h:125},detectorGeometry:{stats:{medH:125}}};
      const good=api.captureQualityDiagnosticsM7V127(makeGood(),analysis);
      const dark=document.createElement('canvas');dark.width=600;dark.height=200;dark.getContext('2d').fillRect(0,0,600,200);
      const darkQ=api.captureQualityDiagnosticsM7V127(dark,analysis);
      const small=api.captureQualityDiagnosticsM7V127(makeGood(),{...analysis,detectorGeometry:{stats:{medH:18}}});
      const geometry=api.captureQualityDiagnosticsM7V127(makeGood(),{detectorAdopted:false,features:Array(9).fill({}),brokenCropCount:4,row:null,detectorGeometry:null});
      const root=document.createElement('div');root.innerHTML='<div class="hand-result-head-m7v5"></div>';document.body.appendChild(root);
      api.renderCaptureQualityM7V127(root,darkQ);
      const rendered={text:root.querySelector('.m7v127-capture-quality')?.textContent||'',recommendation:root.querySelector('.m7v127-capture-quality')?.dataset.recommendation||''};
      root.remove();
      return {good,dark:darkQ,small,geometry,rendered};
    });
    assert.equal(v127CaptureQuality.good.recommendation,'ok','v127 should keep a clear synthetic capture usable '+JSON.stringify(v127CaptureQuality));
    assert(v127CaptureQuality.dark.issues.includes('blur')&&v127CaptureQuality.dark.issues.includes('too-dark'),
      'v127 should diagnose a dark featureless frame '+JSON.stringify(v127CaptureQuality));
    assert(v127CaptureQuality.small.issues.includes('tile-small'),'v127 should diagnose tiles that are too small '+JSON.stringify(v127CaptureQuality));
    assert(v127CaptureQuality.geometry.issues.includes('geometry'),'v127 should diagnose unstable tile-row geometry '+JSON.stringify(v127CaptureQuality));
    assert.equal(v127CaptureQuality.rendered.recommendation,'retake','v127 result quality UI should expose retake recommendation '+JSON.stringify(v127CaptureQuality));
    assert(v127CaptureQuality.rendered.text.includes('撮り直し推奨'),'v127 retake copy missing '+JSON.stringify(v127CaptureQuality));

    const v126ContinuousRed=await page.evaluate(async()=>{
      const initial=['3萬','8萬','2萬','9萬','1萬','4萬','6萬','5萬','5萬','4萬','7萬','4萬','7萬','7索'];
      window.showHandResultM7V5?.(initial);
      const root=document.getElementById('hand-result-overlay-m7v5');
      const slots=[...root.querySelectorAll('.hand-result-tile-m7v5')];
      slots[9]?.click();
      await new Promise(resolve=>setTimeout(resolve,90));
      const picker=document.getElementById('tile-picker-m7v5');
      const grid=()=>[...picker.querySelectorAll('.tile-picker-grid-m7v5 button')];
      const chooseNormal=name=>grid().find(b=>(b.dataset.tileName||b.textContent.trim())===name)?.click();
      chooseNormal('5萬');
      await new Promise(resolve=>setTimeout(resolve,30));
      chooseNormal('5萬');
      await new Promise(resolve=>setTimeout(resolve,30));
      chooseNormal('8萬');
      await new Promise(resolve=>setTimeout(resolve,30));
      picker.querySelectorAll('.m8v31-slot')[13]?.click();
      await new Promise(resolve=>setTimeout(resolve,30));
      picker.querySelector('.m7v122-red-options button[data-m7v122-raw-label="0m"]')?.click();
      await new Promise(resolve=>setTimeout(resolve,70));
      const snap=i=>({
        tile:slots[i].dataset.tile||'',raw:slots[i].dataset.m7v119RawLabel||'',red:slots[i].dataset.m7v122Red||'',
        redClass:slots[i].classList.contains('m7v122-red-tile'),aria:slots[i].getAttribute('aria-label')||''
      });
      const result={firstEdited:snap(9),lastEdited:snap(13),owner:Number(picker?.dataset.m8v31Current),pickerAlive:!!document.getElementById('tile-picker-m7v5')};
      root.remove();document.getElementById('tile-picker-m7v5')?.remove();
      return result;
    });
    assert.deepEqual(v126ContinuousRed.firstEdited,{tile:'5萬',raw:'',red:'',redClass:false,aria:'5萬'},
      'v126 red-five click must not jump back to the first consecutively edited slot '+JSON.stringify(v126ContinuousRed));
    assert.deepEqual(v126ContinuousRed.lastEdited,{tile:'5萬',raw:'0m',red:'1',redClass:true,aria:'赤5萬'},
      'v126 final red-five correction must land on the currently selected slot '+JSON.stringify(v126ContinuousRed));
    assert.equal(v126ContinuousRed.owner,13,'v126 continuous picker must keep the current owner on the final slot '+JSON.stringify(v126ContinuousRed));
    assert.equal(v126ContinuousRed.pickerAlive,true,'v126 red-five selection should stay inside continuous-input mode '+JSON.stringify(v126ContinuousRed));
    const v125RedInvariant=await page.evaluate(()=>{
      const make=(tile,raw,red=true)=>{
        const b=document.createElement('button');
        b.dataset.tile=tile;
        if(raw)b.dataset.m7v119RawLabel=raw;
        if(red)b.dataset.m7v122Red='1';
        if(red)b.classList.add('m7v122-red-tile');
        return b;
      };
      const staleOne=make('1萬','0m',true);
      window.M7V125ResultPicker?.sanitizeRedState?.(staleOne);
      const mismatchFive=make('5萬','0p',true);
      window.M7V125ResultPicker?.sanitizeRedState?.(mismatchFive);
      const validFive=make('5萬','0m',false);
      window.M7V125ResultPicker?.sanitizeRedState?.(validFive);
      const manual=make('5萬','0m',true);
      window.M7V125ResultPicker?.applyChoice?.(manual,'1萬','1萬','');
      const snap=b=>({
        tile:b.dataset.tile||'',raw:b.dataset.m7v119RawLabel||'',red:b.dataset.m7v122Red||'',
        redClass:b.classList.contains('m7v122-red-tile'),aria:b.getAttribute('aria-label')||''
      });
      return {staleOne:snap(staleOne),mismatchFive:snap(mismatchFive),validFive:snap(validFive),manual:snap(manual)};
    });
    assert.deepEqual(v125RedInvariant.staleOne,{tile:'1萬',raw:'',red:'',redClass:false,aria:'1萬'},
      'v125 must never allow an impossible red 1萬 marker '+JSON.stringify(v125RedInvariant));
    assert.deepEqual(v125RedInvariant.mismatchFive,{tile:'5萬',raw:'',red:'',redClass:false,aria:'5萬'},
      'v125 must clear a red raw suit that does not match the displayed five '+JSON.stringify(v125RedInvariant));
    assert.deepEqual(v125RedInvariant.validFive,{tile:'5萬',raw:'0m',red:'1',redClass:true,aria:'赤5萬'},
      'v125 must preserve a valid matching red five '+JSON.stringify(v125RedInvariant));
    assert.deepEqual(v125RedInvariant.manual,{tile:'1萬',raw:'',red:'',redClass:false,aria:'1萬'},
      'v125 manual correction from red five to 1萬 must clear all red metadata '+JSON.stringify(v125RedInvariant));
    const structural=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=24,h=36,n=w*h;
      const make=(horizontal,shift=0)=>{
        const gray=Array(n).fill(0),edge=Array(n).fill(0),red=Array(n).fill(0),green=Array(n).fill(0);
        if(horizontal){
          for(let y=17;y<20;y++)for(let x=4;x<20;x++)gray[y*w+x]=edge[y*w+x]=1;
        }else{
          for(let y=7;y<29;y++)for(let x=10+shift;x<13+shift;x++)gray[y*w+x]=edge[y*w+x]=1;
        }
        return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
      };
      const a=make(false,0),shift=make(false,1),other=make(true,0);
      return {same:core.structuralDistance(a,shift),different:core.structuralDistance(a,other)};
    });
    assert(structural.same<structural.different,'v64 structural distance lost shift robustness '+JSON.stringify(structural));
    const inferenceViews=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=96;c.height=144;
      const x=c.getContext('2d');x.fillStyle='#eee9dc';x.fillRect(0,0,96,144);
      x.fillStyle='#111';x.fillRect(42,30,10,82);
      const views=window.M7CameraV36.inferenceFeatureViews(c);
      return views.map(v=>({kind:v.kind,width:v.width,height:v.height,n:v.gray.length}));
    });
    assert.equal(inferenceViews.length,5,'v73 keeps five nearby inference crops '+JSON.stringify(inferenceViews));
    assert(inferenceViews.every(v=>v.kind==='perspective-direct-v1'&&v.width===24&&v.height===36&&v.n===864),
      'v73 inference crops changed feature schema '+JSON.stringify(inferenceViews));
    const bleedSafe=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=96;c.height=144;
      const x=c.getContext('2d');x.fillStyle='#eee9dc';x.fillRect(0,0,96,144);
      // Simulate a neighboring tile occupying the left edge with a full-height seam.
      x.fillStyle='#786a5a';x.fillRect(0,0,24,144);
      x.fillStyle='#111';x.fillRect(43,36,10,72);
      const info=window.M7CameraV36.estimateBleedSafeShift(c,.12);
      const safe=window.M7CameraV36.safeInsetWindow(c,.12,info);
      const out=window.M7CameraV36.innerRecognitionWindowCanvas(c,96,144,safe.left,safe.right,.08);
      const p=out.getContext('2d').getImageData(0,72,1,1).data;
      return {info,safe,leftPixel:[p[0],p[1],p[2]]};
    });
    assert(bleedSafe.safe.applied,'v73 did not activate asymmetric inset for left neighbor bleed '+JSON.stringify(bleedSafe));
    assert(bleedSafe.safe.left>.20,'v73 did not trim past the left-side seam '+JSON.stringify(bleedSafe));
    assert(bleedSafe.safe.right>.80,'v73 over-trimmed the clean right side '+JSON.stringify(bleedSafe));
    assert(bleedSafe.leftPixel[0]>180,'v73 output still starts inside the simulated dark neighboring tile '+JSON.stringify(bleedSafe));
    const fastVote=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33;
      const base=[
        {label:'5筒',distance:.100,family:'筒'},
        {label:'8筒',distance:.103,family:'筒'},
        {label:'7筒',distance:.130,family:'筒'}
      ];
      const aux=[
        [{label:'8筒',distance:.05,family:'筒'},{label:'5筒',distance:.08,family:'筒'}],
        [{label:'8筒',distance:.06,family:'筒'},{label:'5筒',distance:.09,family:'筒'}],
        [{label:'8筒',distance:.07,family:'筒'},{label:'5筒',distance:.08,family:'筒'}],
        [{label:'5筒',distance:.06,family:'筒'},{label:'8筒',distance:.07,family:'筒'}]
      ];
      const ranked=core.applyViewVoteConsensus(base,aux,{candidateLimit:3,votePenalty:.006});
      return {top:ranked[0]?.label,votes:ranked[0]?.viewTopVotes,count:ranked[0]?.viewCount,base:ranked[0]?.baseDistance};
    });
    assert.equal(fastVote.top,'8筒','v73 auxiliary majority did not break a close race '+JSON.stringify(fastVote));
    assert.equal(fastVote.count,5,'v73 lost five-view vote count '+JSON.stringify(fastVote));
    const fastFull=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=24,h=36,n=w*h;
      const mk=(left)=>({
        kind:'perspective-direct-v1',width:w,height:h,
        gray:Array.from({length:n},(_,i)=>left?((i%w)<12?1:0):((i%w)>=12?1:0)),
        edge:Array.from({length:n},(_,i)=>left?((i%w)===11?1:0):((i%w)===12?1:0)),
        red:Array(n).fill(0),green:Array(n).fill(0)
      });
      const lib={'5筒':[mk(true),mk(true)],'8筒':[mk(false),mk(false)]};
      const ranked=core.rankLabelsFastDiscriminative(mk(true),lib,{});
      return {top:ranked[0]?.label,score:ranked[0]?.distance};
    });
    assert.equal(fastFull.top,'5筒','v73 fast full-label scorer lost the correct label '+JSON.stringify(fastFull));
    const micro=await page.evaluate(()=>{
      const core=window.M7RecognitionCoreV33,w=24,h=36,n=w*h;
      const mk=(offset)=>{
        const gray=Array(n).fill(0),edge=Array(n).fill(0),red=Array(n).fill(0),green=Array(n).fill(0);
        for(let y=8;y<28;y++){const x=8+offset;if(x>=0&&x<w){gray[y*w+x]=1;edge[y*w+x]=1;}}
        return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
      };
      const lib={'5索':[mk(0),mk(0)],'6索':[mk(3),mk(3)]};
      const q=mk(1);
      const ranked=core.rankCandidateLabelsMicroShift(q,lib,['5索','6索'],{});
      return {top:ranked[0]?.label,aligned:core.alignedDirectImageDistance(q,lib['5索'][0]),shifted:core.integerShiftDirectImageDistance(q,lib['5索'][0])};
    });
    assert.equal(micro.top,'5索','v73 micro-shift candidate refinement chose the wrong label '+JSON.stringify(micro));
    assert(micro.shifted<micro.aligned,'v73 micro-shift did not improve a one-pixel offset '+JSON.stringify(micro));

    const confidence=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const clear=api.confidentCandidate([{label:'A',distance:.11},{label:'B',distance:.24}]);
      const ambiguousAssessment=api.confidenceAssessment([{label:'A',distance:.09,family:'萬'},{label:'B',distance:.10,family:'萬'}]);
      const ambiguous=ambiguousAssessment.candidate;
      const farAssessment=api.confidenceAssessment([{label:'A',distance:.25,representativeDistance:.25,templateConsensusDistance:.09,bestDistance:.08,sampleCount:1},{label:'B',distance:.40,bestDistance:.09}]);
      const far=farAssessment.candidate;
      const rawFarAssessment=api.confidenceAssessment([{label:'A',distance:.10,representativeDistance:.10,templateConsensusDistance:.16,structuralRepresentativeDistance:.14,structuralConsensusDistance:.13,bestDistance:.14,sampleCount:3},{label:'B',distance:.24,bestDistance:.15}]);
      const rawFar=rawFarAssessment.candidate;
      const supportedAssessment=api.confidenceAssessment([
        {label:'A',distance:.11,representativeDistance:.17,templateConsensusDistance:.09,bestDistance:.08,sampleCount:3,family:'萬',sameFamilyGap:.08,sameFamilyRatio:.55},
        {label:'B',distance:.24,representativeDistance:.24,templateConsensusDistance:.20,bestDistance:.18,sampleCount:3,family:'萬'}
      ]);
      const viewDisagreeAssessment=api.confidenceAssessment([
        {label:'A',distance:.08,representativeDistance:.08,templateConsensusDistance:.08,bestDistance:.07,sampleCount:3,family:'萬',sameFamilyGap:.08,sameFamilyRatio:.50,viewCount:5,viewTopVotes:2},
        {label:'B',distance:.20,representativeDistance:.20,templateConsensusDistance:.18,bestDistance:.17,sampleCount:3,family:'萬'}
      ]);
      return {clear:clear?.label||'',ambiguous:ambiguous?.label||'',far:far?.label||'',rawFar:rawFar?.label||'',
        supported:supportedAssessment.candidate?.label||'',viewDisagree:viewDisagreeAssessment.candidate?.label||'',
        ambiguousReason:ambiguousAssessment.reason,farReason:farAssessment.reason,rawFarReason:rawFarAssessment.reason,
        supportedReason:supportedAssessment.reason,viewDisagreeReason:viewDisagreeAssessment.reason};
    });
    assert.equal(confidence.clear,'A','clear candidate should be accepted '+JSON.stringify(confidence));
    assert.equal(confidence.ambiguous,'','ambiguous candidate must be withheld '+JSON.stringify(confidence));
    assert.equal(confidence.ambiguousReason,'same-family-margin','v63 must explain same-family ambiguity '+JSON.stringify(confidence));
    assert.equal(confidence.far,'','far candidate must be withheld '+JSON.stringify(confidence));
    assert.equal(confidence.farReason,'representative-distance','v63 must reject a far representative without multi-template support '+JSON.stringify(confidence));
    assert.equal(confidence.rawFar,'','weak direct and structural consensus must still reject '+JSON.stringify(confidence));
    assert.equal(confidence.rawFarReason,'template-consensus','v63 must reject weak multi-template consensus '+JSON.stringify(confidence));
    assert.equal(confidence.supported,'A','v63 repeated nearby templates should support a real representative even when the representative alone is farther '+JSON.stringify(confidence));
    assert.equal(confidence.supportedReason,'accepted','v64 supported candidate should pass confidence '+JSON.stringify(confidence));
    assert.equal(confidence.viewDisagree,'','v73 must not auto-confirm when fewer than half of nearby crops agree '+JSON.stringify(confidence));
    assert.equal(confidence.viewDisagreeReason,'view-disagreement','v70 must explain crop-view disagreement '+JSON.stringify(confidence));
    assert(shutter.diag?.rowFound,'v36 diagnostics did not record the located row '+JSON.stringify(shutter));
    assert.equal(shutter.diag?.gridUsed,false,'v62 must not apply the v61 global-grid candidate to production crops '+JSON.stringify(shutter.diag));
    const innerApi=await page.evaluate(()=>{
      const c=document.createElement('canvas');c.width=100;c.height=100;
      const x=c.getContext('2d');x.fillStyle='#f00';x.fillRect(0,0,100,100);x.fillStyle='#111';x.fillRect(12,8,76,84);
      const out=window.M7CameraV36.innerRecognitionCanvas(c,96,144);
      const p=out.getContext('2d').getImageData(0,0,1,1).data;
      return {width:out.width,height:out.height,pixel:[p[0],p[1],p[2]]};
    });
    assert.equal(innerApi.width,96,'v54 inner crop width changed '+JSON.stringify(innerApi));
    assert.equal(innerApi.height,144,'v54 inner crop height changed '+JSON.stringify(innerApi));
    assert(innerApi.pixel[0]<160&&innerApi.pixel[1]<40,'v54 inner crop did not substantially remove the synthetic red outer edge '+JSON.stringify(innerApi));
    const legacyRecovery=await page.evaluate(()=>{
      const n=24*36;
      const mk=(fn)=>Array.from({length:n},(_,i)=>fn(i%24,Math.floor(i/24)));
      const old={'5筒':[{
        kind:'perspective-direct-v1',width:24,height:36,
        gray:mk((x,y)=>(x+y)/60),edge:mk((x,y)=>x/24),
        red:mk((x,y)=>y/36),green:Array(n).fill(0)
      }]};
      const key='MahjongScoreApp_tile_templates_m7v48balanced24x36';
      localStorage.setItem(key,JSON.stringify(old));
      const lib=window.M7CameraV36.loadLegacyLibrary();
      localStorage.removeItem(key);
      const f=lib['5筒']?.[0];
      return {labels:Object.keys(lib),kind:f?.kind||'',width:f?.width||0,height:f?.height||0};
    });
    assert.deepEqual(legacyRecovery.labels,['5筒'],'v54 did not recover the v48/v52 library '+JSON.stringify(legacyRecovery));
    assert.equal(legacyRecovery.kind,'perspective-direct-v1','v54 recovered wrong feature kind '+JSON.stringify(legacyRecovery));
    assert.equal(legacyRecovery.width,24,'v54 recovered wrong feature width '+JSON.stringify(legacyRecovery));
    assert.equal(legacyRecovery.height,36,'v54 recovered wrong feature height '+JSON.stringify(legacyRecovery));
    const stableStorage=await page.evaluate(()=>{
      const n=24*36;
      const feat={kind:'perspective-direct-v1',width:24,height:36,
        gray:Array(n).fill(.2),edge:Array(n).fill(.1),red:Array(n).fill(0),green:Array(n).fill(0)};
      const saved=window.M7CameraV36.saveLibrary({'東':[feat]});
      const primary=localStorage.getItem('MahjongScoreApp_tile_templates_stable1');
      const backup=localStorage.getItem('MahjongScoreApp_tile_templates_stable1_backup');
      localStorage.removeItem('MahjongScoreApp_tile_templates_stable1');
      const restored=window.M7CameraV36.loadLibrary();
      return {saved,hasPrimary:!!primary,hasBackup:!!backup,restored:Object.keys(restored)};
    });
    assert.equal(stableStorage.saved,1,'v56 stable library save did not report one learned class '+JSON.stringify(stableStorage));
    assert(stableStorage.hasPrimary&&stableStorage.hasBackup,'v56 did not write primary and backup learning stores '+JSON.stringify(stableStorage));
    assert.deepEqual(stableStorage.restored,['東'],'v56 did not restore the learning library from backup '+JSON.stringify(stableStorage));
    const backupFailure=await page.evaluate(()=>{
      const n=24*36;
      const feat={kind:'perspective-direct-v1',width:24,height:36,
        gray:Array(n).fill(.3),edge:Array(n).fill(.1),red:Array(n).fill(0),green:Array(n).fill(0)};
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='MahjongScoreApp_tile_templates_stable1_backup')throw new DOMException('simulated backup quota','QuotaExceededError');
        return original.call(this,key,value);
      };
      let result;
      try{result=window.M7CameraV36.saveLibraryDetailed({'南':[feat]},{allowCleanup:false});}
      finally{Storage.prototype.setItem=original;}
      const primary=JSON.parse(localStorage.getItem('MahjongScoreApp_tile_templates_stable1')||'{}');
      return {ok:result.ok,primaryVerified:result.primaryVerified,backupSaved:result.backupSaved,labels:Object.keys(primary)};
    });
    assert.equal(backupFailure.ok,true,'v59 incorrectly blocks on backup-only failure '+JSON.stringify(backupFailure));
    assert.equal(backupFailure.primaryVerified,true,'v59 primary read-back failed in backup-only fixture '+JSON.stringify(backupFailure));
    assert.equal(backupFailure.backupSaved,false,'v59 backup failure fixture did not trigger '+JSON.stringify(backupFailure));
    assert.deepEqual(backupFailure.labels,['南'],'v59 primary cache was not retained when backup failed '+JSON.stringify(backupFailure));
    // Reload after the isolated camera/calibration probe so the remaining game-flow smoke test
    // starts from a pristine setup screen.
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('#go-confirm-button',{timeout:12000});
    await page.click('#go-confirm-button');
    await page.waitForSelector('#start-game-button',{visible:true,timeout:8000});
    await page.click('#start-game-button');
    await page.waitForSelector('#agari-button',{visible:true,timeout:8000});
    await page.click('#agari-button');
    await page.waitForSelector('#select-ron-button',{visible:true,timeout:8000});
    const location=await page.$eval('#agari-overlay',e=>{
      const r=e.getBoundingClientRect();
      return {cx:r.left+r.width/2,cy:r.top+r.height/2,width:r.width,height:r.height};
    });
    assert(Math.abs(location.cx-466)<115,'type dialog x drift '+JSON.stringify(location));
    assert(Math.abs(location.cy-215)<115,'type dialog y drift '+JSON.stringify(location));
    await page.click('#select-ron-button');
    await page.waitForSelector('#winner-next-button',{visible:true,timeout:8000});
    await page.click('#panel-top');
    assert.equal(await page.$eval('#winner-next-button',e=>e.disabled),false);
    await page.click('#winner-next-button');
    await page.waitForSelector('#agari-overlay',{visible:true,timeout:8000});
    // Verify that reviewing the score table never triggers a runaway DOM reinsertion loop.
    await page.waitForFunction(()=>document.getElementById('agari-flow-title')?.textContent?.includes('放銃者'),{timeout:7000});
    await page.click('#panel-right');
    assert.equal(await page.$eval('#discarder-next-button',e=>e.disabled),false);
    await page.click('#discarder-next-button');
    await page.waitForSelector('#agari-overlay .score-switch-table',{visible:true,timeout:9000});
    await page.waitForSelector('#maki-hand-entry-v111',{visible:true,timeout:5000});
    const v111Entry=await page.$eval('#maki-hand-entry-v111',e=>({
      camera:e.querySelector('.maki-v111-camera')?.textContent?.trim(),
      manual:e.querySelector('.maki-v111-manual')?.textContent?.trim(),
      context:e.querySelector('.maki-v111-context')?.textContent?.trim()
    }));
    assert(v111Entry.camera?.includes('カメラで認識'),'v111 camera entry missing '+JSON.stringify(v111Entry));
    assert(v111Entry.manual?.includes('手動入力'),'v111 manual entry missing '+JSON.stringify(v111Entry));
    assert(v111Entry.context?.includes('ロン'),'v111 did not retain ron context '+JSON.stringify(v111Entry));

    const v118DoraUI=await page.$eval('#maki-hand-entry-v111',e=>({
      counters:e.querySelectorAll('.maki-v118-dora-counter').length,
      labels:[...e.querySelectorAll('.maki-v118-dora-label')].map(x=>x.textContent.trim()),
      uraDisabled:[...e.querySelectorAll('.maki-v118-dora-counter[data-kind="ura"] button')].every(x=>x.disabled),
      note:e.querySelector('.maki-v118-dora-note')?.textContent||''
    }));
    assert.equal(v118DoraUI.counters,3,'v118 needs three dora counters '+JSON.stringify(v118DoraUI));
    assert.deepEqual(v118DoraUI.labels,['ドラ','赤ドラ','裏ドラ'],'v118 dora labels mismatch '+JSON.stringify(v118DoraUI));
    assert.equal(v118DoraUI.uraDisabled,true,'v118 ura-dora must be disabled for a non-riichi winner '+JSON.stringify(v118DoraUI));
    assert(v118DoraUI.note.includes('ドラは役ではありません'),'v118 dora rule note missing '+JSON.stringify(v118DoraUI));

    await page.click('#maki-hand-entry-v111 .maki-v118-dora-counter[data-kind="dora"] [data-dora-step="1"]');
    await page.click('#maki-hand-entry-v111 .maki-v118-dora-counter[data-kind="dora"] [data-dora-step="1"]');
    await page.click('#maki-hand-entry-v111 .maki-v118-dora-counter[data-kind="aka"] [data-dora-step="1"]');
    const v118DoraCounts=await page.$eval('#maki-hand-entry-v111',e=>({
      dora:e.querySelector('.maki-v118-dora-counter[data-kind="dora"] .maki-v118-dora-value')?.textContent,
      aka:e.querySelector('.maki-v118-dora-counter[data-kind="aka"] .maki-v118-dora-value')?.textContent,
      ura:e.querySelector('.maki-v118-dora-counter[data-kind="ura"] .maki-v118-dora-value')?.textContent,
      total:e.querySelector('.maki-v118-dora-total')?.textContent
    }));
    assert.deepEqual(v118DoraCounts,{dora:'2',aka:'1',ura:'0',total:'合計 +3翻'},'v118 manual dora counters failed '+JSON.stringify(v118DoraCounts));

    const v118DoraScoring=await page.evaluate(async()=>{
      let panel=document.getElementById('m8-context-v5');
      let fixture=null;
      if(!panel){
        fixture=document.createElement('div');
        fixture.id='m8-context-v5';
        fixture.innerHTML='<div class="m8v5-han"></div>';
        document.body.appendChild(fixture);
        panel=fixture;
      }
      window.M8V22?.publishRecommendation?.(panel,{
        yakuman:false,
        han:4,
        items:[{name:'清一色',han:4}]
      });
      await new Promise(requestAnimationFrame);
      await new Promise(resolve=>setTimeout(resolve,50));
      const withYaku={
        state:window.m8YakuBreakdownV116,
        green:[...document.querySelectorAll('#agari-overlay .limit-button.maki-v111-limit-recommend')].map(x=>x.dataset.limit),
        summary:document.getElementById('m8v25-score-summary')?.textContent||''
      };
      window.M8V22?.publishRecommendation?.(panel,{yakuman:false,han:0,items:[]});
      await new Promise(requestAnimationFrame);
      await new Promise(resolve=>setTimeout(resolve,50));
      const noYaku={
        state:window.m8YakuBreakdownV116,
        green:[...document.querySelectorAll('#agari-overlay .limit-button.maki-v111-limit-recommend')].map(x=>x.dataset.limit)
      };
      window.MAKIV118Dora?.setCount?.('dora',0);
      window.MAKIV118Dora?.setCount?.('aka',0);
      window.MAKIV118Dora?.setCount?.('ura',0);
      fixture?.remove();
      document.getElementById('m8v116-han-breakdown')?.remove();
      return {withYaku,noYaku};
    });
    assert.equal(v118DoraScoring.withYaku.state?.han,7,'v118 dora must add to existing yaku han '+JSON.stringify(v118DoraScoring));
    assert(v118DoraScoring.withYaku.state?.items?.some(x=>x.name==='ドラ'&&x.han===2),'v118 dora item missing '+JSON.stringify(v118DoraScoring));
    assert(v118DoraScoring.withYaku.state?.items?.some(x=>x.name==='赤ドラ'&&x.han===1),'v118 aka-dora item missing '+JSON.stringify(v118DoraScoring));
    assert.deepEqual(v118DoraScoring.withYaku.green,['haneman'],'v118 4+3 han should recommend haneman '+JSON.stringify(v118DoraScoring));
    assert(v118DoraScoring.withYaku.summary.includes('ドラ 2翻')&&v118DoraScoring.withYaku.summary.includes('赤ドラ 1翻'),'v118 score summary must explain dora '+JSON.stringify(v118DoraScoring));
    assert.equal(v118DoraScoring.noYaku.state?.han,0,'v118 dora alone must not create a valid yaku '+JSON.stringify(v118DoraScoring));
    assert.deepEqual(v118DoraScoring.noYaku.green,[],'v118 dora-only hand must not recommend a limit '+JSON.stringify(v118DoraScoring));

    const v119CameraDora=await page.evaluate(()=>{
      const api=window.MAKIV119DoraCamera;
      const yolo=window.M7CameraV36?.yoloRecognitionFromBoxes?.([
        {label:'0m',score:.92},{label:'0p',score:.91},{label:'0s',score:.90}
      ])||[];
      const maps={
        fourM:api?.doraTileFromIndicatorRaw?.('4m')||'',
        nineP:api?.doraTileFromIndicatorRaw?.('9p')||'',
        north:api?.doraTileFromIndicatorRaw?.('4z')||'',
        redDragon:api?.doraTileFromIndicatorRaw?.('7z')||'',
        redFive:api?.doraTileFromIndicatorRaw?.('0s')||''
      };
      const ctx=window.MAKIV111?.context?.();
      const hand=['5萬','5萬','1萬','2萬','3萬','4萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','東'];
      window.MAKIHandEntryStateV111={...ctx,tiles:hand.slice(),source:'camera',verifiedAt:Date.now()};
      window.MAKIDoraIndicatorStatesV119={};
      api?.addIndicatorRaw?.('4m',ctx);
      const before=window.MAKIV118Dora?.effective?.(ctx);
      api?.applyCameraHandMeta?.(ctx,hand,{
        tiles:hand.slice(),rawLabels:['0m','','','','','','','','','','','','',''],
        redCount:1,createdAt:Date.now()
      });
      const after=window.MAKIV118Dora?.effective?.(ctx);
      const indicators=api?.indicatorState?.(ctx,false)?.rawLabels?.slice()||[];
      api?.clearIndicators?.(ctx);
      window.MAKIV118Dora?.setCount?.('aka',0,ctx);
      return {maps,yolo:yolo.map(x=>({raw:x.rawLabel,label:x.label})),before,after,indicators};
    });
    assert.deepEqual(v119CameraDora.maps,{fourM:'5萬',nineP:'1筒',north:'東',redDragon:'白',redFive:'6索'},
      'v119 dora-indicator next-tile mapping failed '+JSON.stringify(v119CameraDora));
    assert.deepEqual(v119CameraDora.yolo,[
      {raw:'0m',label:'5萬'},{raw:'0p',label:'5筒'},{raw:'0s',label:'5索'}
    ],'v119 must preserve red-five raw labels while normalizing hand tiles '+JSON.stringify(v119CameraDora));
    assert.deepEqual(v119CameraDora.indicators,['4m'],'v119 indicator state did not retain scanned display tile '+JSON.stringify(v119CameraDora));
    assert.equal(v119CameraDora.before?.dora,2,'v119 4m indicator should count both 5m tiles as dora '+JSON.stringify(v119CameraDora));
    assert.equal(v119CameraDora.after?.dora,2,'v119 camera dora count changed unexpectedly '+JSON.stringify(v119CameraDora));
    assert.equal(v119CameraDora.after?.aka,1,'v119 camera red-five metadata must set aka-dora count '+JSON.stringify(v119CameraDora));
    assert.equal(await page.evaluate(()=>!!document.querySelector('#maki-hand-entry-v111 .maki-v119-dora-camera')),true,
      'v119 dora indicator camera button missing');

    const v120RedRepair=await page.evaluate(()=>{
      const camera=window.M7CameraV36;
      const raws=['3p','4p','0s','4m','5m','6m','3s','4s','5s','5p','5p','5p','5s','5s'];
      const yolo=camera.yoloRecognitionFromBoxes(raws.map((label,i)=>({label,score:i===8 ? .41 : (i===11 ? .63 : .85),classMargin:.6,crossViewCount:1,crossViewSupport:1,crossViewShare:1,crossViewMargin:1})));
      const redShares=Array(14).fill(.10);redShares[2]=.70;redShares[8]=.48;
      const repaired=camera.repairRedFiveRecognition(yolo,redShares,true);
      return repaired.map(x=>({raw:x.rawLabel,label:x.label,repair:x.redRepair||'',red:Number(x.redInkShare||0)}));
    });
    assert.equal(v120RedRepair[2].raw,'0p','v120 must repair screenshot-like red 5-pin misread as 0s '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[2].label,'5筒','v120 repaired red 5-pin must remain app tile 5筒 '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[2].repair,'context-suit','v120 red 5-pin context repair marker missing '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[8].raw,'0s','v120 visually-red 5-sou must become aka raw label '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[8].label,'5索','v120 visually-red 5-sou must keep app tile 5索 '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[8].repair,'visual-red','v120 visual red marker missing '+JSON.stringify(v120RedRepair));
    assert.equal(v120RedRepair[10].raw,'5p','v120 ordinary 5-pin must not be promoted to aka '+JSON.stringify(v120RedRepair));

    const v121RedInkRuntime=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');
      canvas.width=120;canvas.height=180;
      const x=canvas.getContext('2d',{willReadFrequently:true});
      x.fillStyle='#eee';x.fillRect(0,0,120,180);
      x.fillStyle='#222';x.fillRect(42,30,8,100);
      x.fillStyle='#c33';x.fillRect(64,58,12,56);
      const tile=window.M7CameraV36.analyzeYoloTileBox(x,{x:8,y:8,w:104,h:164},0,14);
      return {red:Number(tile.redInkShare),feature:!!tile.feature};
    });
    assert.equal(Number.isFinite(v121RedInkRuntime.red),true,'v121 redInkShare must exist at runtime '+JSON.stringify(v121RedInkRuntime));
    assert.equal(v121RedInkRuntime.feature,true,'v121 YOLO crop feature missing '+JSON.stringify(v121RedInkRuntime));
    await page.click('#maki-hand-entry-v111 .maki-v111-manual');
    await page.waitForSelector('#maki-manual-hand-v111',{visible:true,timeout:4000});
    assert.equal(await page.evaluate(()=>document.querySelectorAll('#maki-manual-hand-v111 .maki-v111-slot').length),14,'v111 manual entry must have 14 slots');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('#maki-manual-hand-v111 .maki-v111-tile').length),34,'v111 manual entry must offer 34 tile types');
    const v115ManualUI=await page.evaluate(()=>{
      const root=document.getElementById('maki-manual-hand-v111');
      const card=root?.querySelector('.maki-v111-card');
      const groups=[...root.querySelectorAll('.maki-v111-group')];
      return {
        faces:root.querySelectorAll('.maki-v111-tile .maki-v111-face').length,
        glyphs:root.querySelectorAll('.maki-v111-tile .maki-v111-glyph').length,
        groups:groups.length,
        groupCounts:groups.map(g=>g.querySelectorAll('.maki-v111-tile').length),
        groupTop:groups.map(g=>Math.round(g.getBoundingClientRect().top)),
        cardHeight:Math.round(card.getBoundingClientRect().height),
        cardBottom:Math.round(card.getBoundingClientRect().bottom),
        viewport:window.innerHeight,
        firstText:root.querySelector('.maki-v111-tile .maki-v111-glyph')?.textContent||''
      };
    });
    assert.equal(v115ManualUI.faces,34,'v115 manual choices must render as tile faces '+JSON.stringify(v115ManualUI));
    assert.equal(v115ManualUI.glyphs,34,'v115 manual choices must use mahjong glyphs '+JSON.stringify(v115ManualUI));
    assert.deepEqual(v115ManualUI.groupCounts,[9,9,9,7],'v115 manual rows must be 9/9/9/7 '+JSON.stringify(v115ManualUI));
    assert.equal(v115ManualUI.groups,4,'v115 manual input needs four horizontal rows '+JSON.stringify(v115ManualUI));
    assert(v115ManualUI.cardBottom<=v115ManualUI.viewport+1,'v115 manual input must fit one landscape screen '+JSON.stringify(v115ManualUI));
    assert(v115ManualUI.cardHeight<=430,'v115 manual input is too tall '+JSON.stringify(v115ManualUI));
    assert(v115ManualUI.firstText.length>0,'v115 mahjong glyph missing '+JSON.stringify(v115ManualUI));
    await page.click('#maki-manual-hand-v111 .maki-v111-cancel');
    await page.waitForFunction(()=>!document.getElementById('maki-manual-hand-v111'),{timeout:3000});

    const kokushi=['1萬','9萬','1筒','9筒','1索','9索','東','南','西','北','白','發','中','1萬'];
    const v117KokushiOpen=await page.evaluate(hand=>{
      const accepted=window.acceptVerifiedHandM8V87(hand,{show:true});
      return {ok:accepted?.ok===true};
    },kokushi);
    assert.equal(v117KokushiOpen.ok,true,'v117 kokushi fixture was rejected '+JSON.stringify(v117KokushiOpen));
    await page.waitForSelector('#m8-result-v1',{visible:true,timeout:4000});
    await page.waitForSelector('#m8-result-confirm-v117',{visible:true,timeout:4000});
    await page.waitForFunction(()=>document.querySelector('#m8v18-result-fu')?.textContent?.includes('和了牌の選択不要'),{timeout:4000});
    const v117KokushiBefore=await page.evaluate(()=>({
      pickerCount:document.querySelectorAll('#m8-result-v1 .m8v7-win-tile').length,
      fuText:document.querySelector('#m8v18-result-fu')?.textContent||'',
      help:document.querySelector('#m8-result-v1 .m8-card>p small')?.textContent||''
    }));
    assert.equal(v117KokushiBefore.pickerCount,0,'v117 kokushi should not require a winning-tile picker '+JSON.stringify(v117KokushiBefore));
    assert(v117KokushiBefore.fuText.includes('符計算なし'),'v117 kokushi fu status is contradictory '+JSON.stringify(v117KokushiBefore));
    assert(v117KokushiBefore.help.includes('確認')&&v117KokushiBefore.help.includes('和了牌'),'v117 kokushi UI must explain how to continue '+JSON.stringify(v117KokushiBefore));

    await page.click('#m8-result-confirm-v117');
    await page.waitForFunction(()=>!document.getElementById('m8-result-v1'),{timeout:4000});
    await page.waitForFunction(()=>{
      try{return agariFlow.currentScoreSelection?.limitKey==='yakuman';}catch(_){return false;}
    },{timeout:4000});
    const v117KokushiAfter=await page.evaluate(()=>({
      selected:(()=>{try{return agariFlow.currentScoreSelection?.limitKey||null;}catch(_){return null;}})(),
      nextDisabled:document.getElementById('score-next-button')?.disabled,
      green:[...document.querySelectorAll('#agari-overlay .limit-button.maki-v111-limit-recommend')].map(x=>x.dataset.limit),
      canonical:window.m8YakuBreakdownV116
    }));
    assert.equal(v117KokushiAfter.selected,'yakuman','v117 kokushi confirm did not select yakuman score '+JSON.stringify(v117KokushiAfter));
    assert.equal(v117KokushiAfter.nextDisabled,false,'v117 kokushi confirm left score Next disabled '+JSON.stringify(v117KokushiAfter));
    assert.deepEqual(v117KokushiAfter.green,['yakuman'],'v117 kokushi must recommend only yakuman '+JSON.stringify(v117KokushiAfter));
    assert.equal(v117KokushiAfter.canonical?.items?.[0]?.name,'国士無双','v117 kokushi canonical yaku missing '+JSON.stringify(v117KokushiAfter));
    const v116Breakdown=await page.evaluate(async()=>{
      let panel=document.getElementById('m8-context-v5');
      let fixture=null;
      if(!panel){
        fixture=document.createElement('div');
        fixture.id='m8-context-v5';
        fixture.innerHTML='<div class="m8v5-han"></div>';
        document.body.appendChild(fixture);
        panel=fixture;
      }
      window.M8V22?.publishRecommendation?.(panel,{
        yakuman:false,
        han:9,
        items:[
          {name:'清一色',han:6},
          {name:'三暗刻',han:2},
          {name:'門前清自摸和',han:1}
        ]
      });
      await new Promise(requestAnimationFrame);
      const out={
        text:document.getElementById('m8v116-han-breakdown')?.textContent||'',
        state:window.m8YakuBreakdownV116
      };
      fixture?.remove();
      document.getElementById('m8v116-han-breakdown')?.remove();
      return out;
    });
    assert(v116Breakdown.text.includes('清一色 6翻'),'v116 result breakdown must show yaku + han '+JSON.stringify(v116Breakdown));
    assert(v116Breakdown.text.includes('三暗刻 2翻'),'v116 result breakdown missing 三暗刻 '+JSON.stringify(v116Breakdown));
    assert(v116Breakdown.text.includes('門前清自摸和 1翻'),'v116 result breakdown missing tsumo '+JSON.stringify(v116Breakdown));
    assert(v116Breakdown.text.includes('9翻'),'v116 result breakdown total missing '+JSON.stringify(v116Breakdown));

    const v116StaleYakuman=await page.evaluate(async()=>{
      // Reproduce the v115 report: the current hand is 7 han, but an old v23/v6
      // global still says yakuman. The canonical current-hand state must win.
      window.m8YakuBreakdownV116={
        han:7,
        yakuman:false,
        items:[{name:'清一色',han:6},{name:'門前清自摸和',han:1}],
        updatedAt:Date.now()
      };
      window.m8SuggestedHanV23='yakuman';
      window.m8SuggestedHanV6='yakuman';
      window.m8SuggestedHanV22=7;
      window.m8SuggestedHanV9=7;
      window.dispatchEvent(new CustomEvent('maki:m8-recommendation-changed',{detail:window.m8YakuBreakdownV116}));
      await new Promise(requestAnimationFrame);
      await new Promise(resolve=>setTimeout(resolve,80));
      return {
        key:window.MAKIV111?.suggestedLimitKey?.()||'',
        active:[...document.querySelectorAll('#agari-overlay .limit-button.maki-v111-limit-recommend')].map(x=>x.dataset.limit),
        summary:document.getElementById('m8v25-score-summary')?.textContent||''
      };
    });
    assert.equal(v116StaleYakuman.key,'haneman','v116 stale yakuman must not override a current 7-han hand '+JSON.stringify(v116StaleYakuman));
    assert.deepEqual(v116StaleYakuman.active,['haneman'],'v116 7-han hand must highlight haneman, not yakuman '+JSON.stringify(v116StaleYakuman));
    assert(v116StaleYakuman.summary.includes('7翻'),'v116 score summary must explain current han '+JSON.stringify(v116StaleYakuman));
    assert(v116StaleYakuman.summary.includes('清一色 6翻'),'v116 score summary must include yaku breakdown '+JSON.stringify(v116StaleYakuman));
    assert(!v116StaleYakuman.summary.includes('役満 →'),'v116 score summary kept stale yakuman copy '+JSON.stringify(v116StaleYakuman));

    const v116Yakuman=await page.evaluate(async()=>{
      window.m8YakuBreakdownV116={
        han:'yakuman',
        yakuman:true,
        items:[{name:'九蓮宝燈',han:'yakuman'}],
        updatedAt:Date.now()
      };
      window.dispatchEvent(new CustomEvent('maki:m8-recommendation-changed',{detail:window.m8YakuBreakdownV116}));
      await new Promise(requestAnimationFrame);
      return {
        active:[...document.querySelectorAll('#agari-overlay .limit-button.maki-v111-limit-recommend')].map(x=>x.dataset.limit),
        summary:document.getElementById('m8v25-score-summary')?.textContent||''
      };
    });
    assert.deepEqual(v116Yakuman.active,['yakuman'],'v116 current yakuman must still highlight yakuman '+JSON.stringify(v116Yakuman));
    assert(v116Yakuman.summary.includes('九蓮宝燈（役満）'),'v116 yakuman summary should name the yakuman '+JSON.stringify(v116Yakuman));
    const v115NineGates=await page.evaluate(()=>{
      const pure=['1萬','1萬','1萬','2萬','3萬','4萬','5萬','5萬','6萬','7萬','8萬','9萬','9萬','9萬'];
      const ordinary=['1萬','1萬','1萬','1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','9萬','9萬'];
      return {
        pure:window.M8V23?.detectNineGates?.(pure,{menzen:true},'5萬')||null,
        ordinary:window.M8V23?.detectNineGates?.(ordinary,{menzen:true},'2萬')||null,
        openRejected:window.M8V23?.detectNineGates?.(pure,{menzen:false},'5萬')||null
      };
    });
    assert.equal(v115NineGates.pure,'純正九蓮宝燈','v115 must classify pure Nine Gates as yakuman '+JSON.stringify(v115NineGates));
    assert.equal(v115NineGates.ordinary,'九蓮宝燈','v115 must classify ordinary Nine Gates as yakuman '+JSON.stringify(v115NineGates));
    assert.equal(v115NineGates.openRejected,null,'v115 must reject open Nine Gates '+JSON.stringify(v115NineGates));
    await page.waitForSelector('#m8v30-review',{visible:true,timeout:4000});
    const score=await page.$eval('#agari-overlay',e=>{
      const card=e.querySelector('.agari-flow-card');
      const rect=e.getBoundingClientRect(),inside=card?.getBoundingClientRect();
      return {width:rect.width,height:rect.height,cardHeight:inside?.height,review:!!e.querySelector('#m8v30-review')};
    });
    assert(score.cardHeight<=430,'score panel overflows landscape viewport '+JSON.stringify(score));
    assert(score.review,'score review not mounted');
    await page.click('#m8v30-review > summary');
    await page.waitForSelector('#m8v30-fields',{visible:true,timeout:4000});
    await page.type('#m8v30-review input[type="number"]','40');
    const initial=await page.evaluate(()=>document.querySelectorAll('*').length);
    await new Promise(resolve=>setTimeout(resolve,2200));
    const after=await page.evaluate(()=>document.querySelectorAll('*').length);
    assert(after-initial<100,'runaway DOM growth during score review '+initial+' -> '+after);
    await page.click('#m8v30-review > summary');
    await page.click('#m8v30-review > summary');
    await page.waitForSelector('#m8v30-fields',{visible:true,timeout:3000});
    assert.equal(errors.filter(x=>/Maximum call stack|out of memory|is not defined/i.test(x)).length,0,
      'fatal browser JS errors: '+errors.join('\n'));
    console.log('PASS: synthetic 14-tile camera segmentation + landscape agari/score/review flow');
    console.log('Score geometry:',JSON.stringify(score),'DOM nodes:',initial,'to',after);
    console.log('Type overlay geometry:',JSON.stringify(location));
    console.log('Browser pageerrors (not all fatal):',errors.slice(0,3).join(' | ')||'none');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
