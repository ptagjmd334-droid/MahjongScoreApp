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
    assert.equal(await page.$eval('#app-build-badge',e=>e.textContent.trim()),'M7 v36');
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
      return {rect,featureLength:feat.length};
    });
    assert(faceNorm.rect.w<120&&faceNorm.rect.h<140&&faceNorm.rect.y>20,
      'tile face normalization did not remove row background '+JSON.stringify(faceNorm));
    assert.equal(faceNorm.featureLength,96,'normalized feature vector changed unexpectedly '+JSON.stringify(faceNorm));
    const seamSplit=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=980;canvas.height=220;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#6f482d';ctx.fillRect(0,0,980,220);
      const widths=[61,65,60,66,63,64,62,67,61,65,64,63,66,63];
      let x=46;const starts=[];
      for(let i=0;i<14;i++){
        starts.push(x);
        const w=widths[i];
        ctx.fillStyle='#d4d3cc';ctx.fillRect(x,58,w,112);
        ctx.fillStyle='#252525';
        ctx.fillRect(x+Math.round(w*.36),82,5,54);
        ctx.fillRect(x+Math.round(w*.55),102,Math.max(6,Math.round(w*.16)),9);
        x+=w+3+(i%3===0?2:0);
      }
      const row={x:42,y:50,w:x-39,h:128};
      const boxes=window.M7CameraV36.splitRowBySeams(ctx,row,14);
      return {starts,boxes:boxes.map(b=>({x:b.x,w:b.w}))};
    });
    assert.equal(seamSplit.boxes.length,14,'adaptive seam split lost tiles '+JSON.stringify(seamSplit));
    const boundaryErrors=seamSplit.boxes.slice(1).map((b,i)=>Math.abs(b.x-seamSplit.starts[i+1]));
    assert(Math.max(...boundaryErrors)<16,'adaptive seams drifted away from physical tile boundaries '+JSON.stringify({boundaryErrors,seamSplit}));

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
      await new Promise(resolve=>setTimeout(resolve,220));
      const result=document.getElementById('hand-result-overlay-m7v5');
      const tiles=result?.querySelectorAll('.hand-result-tile-m7v5').length||0;
      const crops=result?.querySelectorAll('.hand-result-tile-m7v5.m7v36-crop').length||0;
      const note=result?.querySelector('.hand-result-note-m7v5')?.textContent||'';
      const firstCrop=result?.querySelector('.hand-result-tile-m7v5.m7v36-crop');
      const cropStyle=firstCrop?getComputedStyle(firstCrop):null;
      const preview={backgroundSize:cropStyle?.backgroundSize||'',height:firstCrop?.getBoundingClientRect().height||0};
      const diag=window.M7V36LastDiagnostics||null;
      let learned=0;
      if(result){
        const resultTiles=[...result.querySelectorAll('.hand-result-tile-m7v5')];
        resultTiles.forEach((b,i)=>b.dataset.tile='test-'+i);
        const ok=result.querySelector('.hand-result-ok-m7v5');
        if(ok){
          ok.disabled=false;
          ok.onclick=()=>result.remove();
          ok.click();
          await new Promise(resolve=>setTimeout(resolve,40));
          try{
            const lib=JSON.parse(localStorage.getItem('MahjongScoreApp_tile_templates_m7v36face1')||'{}');
            learned=Object.values(lib).reduce((n,list)=>n+(Array.isArray(list)&&list.length?1:0),0);
          }catch(_){}
        }
      }
      result?.remove();fake.remove();
      localStorage.removeItem('MahjongScoreApp_tile_templates_m7v36face1');
      return {overlap,tiles,crops,note,diag,preview,learned};
    });
    assert.equal(shutter.overlap,false,'v36 shutter and cancel overlap '+JSON.stringify(shutter));
    assert.equal(shutter.tiles,14,'v36 shutter did not open 14 editable slots '+JSON.stringify(shutter));
    assert.equal(shutter.crops,14,'v36 did not use 14 high-resolution row crops '+JSON.stringify(shutter));
    assert(shutter.note.includes('初回学習'),'v36 first calibration explanation missing '+JSON.stringify(shutter));
    assert.equal(shutter.preview.backgroundSize,'contain','tile preview must show the full crop '+JSON.stringify(shutter));
    assert(shutter.preview.height<190,'tile preview should not stretch through the whole result card '+JSON.stringify(shutter));
    assert.equal(shutter.learned,14,'verified first calibration was not persisted before result close '+JSON.stringify(shutter));
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
