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
    assert.equal(await page.$eval('#app-build-badge',e=>e.textContent.trim()),'M7 v51');
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
      const mapping=window.M7CameraV36.sourceRectForCover(1920,1080,932,430,{x:56,y:112,w:820,h:190});
      return {row,boxes,mapping};
    });
    assert(synthetic.row,'fixed-frame row locator failed '+JSON.stringify(synthetic));
    assert.equal(synthetic.boxes.length,14,'fixed-frame row must split into 14 tiles '+JSON.stringify(synthetic));
    assert(synthetic.row.w>560&&synthetic.row.h>80,'unexpected row geometry '+JSON.stringify(synthetic));
    assert(synthetic.mapping&&synthetic.mapping.w>1500&&synthetic.mapping.h>300,
      'object-fit cover mapping lost high-resolution source area '+JSON.stringify(synthetic));
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
      ctx.moveTo(34,24);ctx.lineTo(124,31);ctx.lineTo(139,164);ctx.lineTo(21,156);ctx.closePath();ctx.fill();
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
      'v49 perspective quad detection failed '+JSON.stringify(perspectiveRectification));
    assert(perspectiveRectification.geom&&perspectiveRectification.geom.faceH>perspectiveRectification.geom.faceW,
      'v49 perspective warp did not produce an upright tile '+JSON.stringify(perspectiveRectification));
    assert.equal(perspectiveRectification.kind,'perspective-direct-v1',
      'v49 perspective descriptor kind missing '+JSON.stringify(perspectiveRectification));

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
      let learned=0,rawSaved=0,diagLearned=0;
      if(result){
        const resultTiles=[...result.querySelectorAll('.hand-result-tile-m7v5')];
        if(resultTiles[0]){
          resultTiles[0].dataset.m7v39Suggestions=JSON.stringify(['1萬','2萬','3萬']);
          if(resultTiles[1])resultTiles[1].dataset.m7v39Suggestions=JSON.stringify(['4筒','5筒','6筒']);
          resultTiles[0].click();
          await new Promise(resolve=>setTimeout(resolve,70));
          const suggestionButtons=[...document.querySelectorAll('#tile-picker-m7v5 .m7v39-suggestions button')];
          window.__m7v39SuggestionCount=suggestionButtons.length;
          const picker=document.getElementById('tile-picker-m7v5');
          const normalChoice=picker?.querySelector('.tile-picker-grid-m7v5 button');
          normalChoice?.click();
          await new Promise(resolve=>setTimeout(resolve,110));
          window.__m7v42OwnerIndex=Number(picker?.dataset.m8v31Current);
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
            const lib=JSON.parse(localStorage.getItem('MahjongScoreApp_tile_templates_m7v48balanced24x36')||'{}');
            learned=Object.values(lib).reduce((n,list)=>n+(Array.isArray(list)&&list.length?1:0),0);
            rawSaved=(await window.M7CameraV36.loadTrainingSamples()).length;
            const diagLib=await window.M7CameraV36.buildInnerDiagnosticLibrary();
            diagLearned=Object.keys(diagLib).filter(label=>Array.isArray(diagLib[label])&&diagLib[label].length).length;
          }catch(_){}
        }
      }
      result?.remove();fake.remove();
      localStorage.removeItem('MahjongScoreApp_tile_templates_m7v48balanced24x36');
      const suggestionCount=window.__m7v39SuggestionCount||0;delete window.__m7v39SuggestionCount;
      const secondSuggestions=window.__m7v42SecondSuggestions||[];delete window.__m7v42SecondSuggestions;
      const ownerIndex=window.__m7v42OwnerIndex;delete window.__m7v42OwnerIndex;
      return {overlap,tiles,crops,note,diag,preview,learned,rawSaved,diagLearned,suggestionCount,secondSuggestions,ownerIndex};
    });
    assert.equal(shutter.overlap,false,'v36 shutter and cancel overlap '+JSON.stringify(shutter));
    assert.equal(shutter.tiles,14,'v36 shutter did not open 14 editable slots '+JSON.stringify(shutter));
    assert.equal(shutter.crops,14,'v36 did not use 14 high-resolution row crops '+JSON.stringify(shutter));
    assert(shutter.note.includes('初回学習'),'v52 first calibration explanation missing '+JSON.stringify(shutter));
    assert.equal(shutter.preview.backgroundSize,'contain','tile preview must show the full crop '+JSON.stringify(shutter));
    assert(shutter.preview.height<190,'tile preview should not stretch through the whole result card '+JSON.stringify(shutter));
    assert.equal(shutter.learned,14,'verified v52 calibration was not persisted before result close '+JSON.stringify(shutter));
    assert(shutter.rawSaved>=14,'verified tile images were not persisted to IndexedDB '+JSON.stringify(shutter));
    assert.equal(shutter.diagLearned,14,'v52 inner-crop diagnostic library did not rebuild from raw images '+JSON.stringify(shutter));
    assert.equal(shutter.suggestionCount,3,'top-3 quick suggestions missing '+JSON.stringify(shutter));
    assert.equal(shutter.ownerIndex,1,'continuous picker owner did not advance to tile 2 '+JSON.stringify(shutter));
    assert.deepEqual(shutter.secondSuggestions,['4筒','5筒','6筒'],'normal-grid advance kept stale suggestions '+JSON.stringify(shutter));
    const confidence=await page.evaluate(()=>{
      const api=window.M7CameraV36;
      const clear=api.confidentCandidate([{label:'A',distance:.11},{label:'B',distance:.24}]);
      const ambiguous=api.confidentCandidate([{label:'A',distance:.14},{label:'B',distance:.155}]);
      const far=api.confidentCandidate([{label:'A',distance:.25},{label:'B',distance:.40}]);
      return {clear:clear?.label||'',ambiguous:ambiguous?.label||'',far:far?.label||''};
    });
    assert.equal(confidence.clear,'A','clear candidate should be accepted '+JSON.stringify(confidence));
    assert.equal(confidence.ambiguous,'','ambiguous candidate must be withheld '+JSON.stringify(confidence));
    assert.equal(confidence.far,'','far candidate must be withheld '+JSON.stringify(confidence));
    assert(shutter.diag?.rowFound,'v36 diagnostics did not record the located row '+JSON.stringify(shutter));
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
