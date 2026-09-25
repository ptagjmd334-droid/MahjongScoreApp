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
    const synthetic=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=190;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,480,190);
      ctx.fillStyle='#f4f1e8';
      for(let i=0;i<14;i++)ctx.fillRect(5+i*34,58,26,72);
      const boxes=window.M7CameraV36.detectCandidates(ctx,480,190);
      return boxes.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,cx:b.cx}));
    });
    assert.equal(synthetic.length,14,'synthetic 14-tile row not segmented: '+JSON.stringify(synthetic));
    // Reproduce iPhone regression: a row of touching tiles can produce zero candidates.
    // The manual capture must still open 14 editable slots, with capture/cancel non-overlapping.
    const manual=await page.evaluate(async()=>{
      const fake=document.createElement('div');
      fake.id='realtime-hand-camera-m7v3';
      fake.className='realtime-hand-camera-m7v3';
      const guideWrap=document.createElement('div');guideWrap.className='realtime-hand-guide-m7v3';
      const guideBox=document.createElement('div');guideBox.className='realtime-hand-guide-box-m7v3';
      guideWrap.appendChild(guideBox);
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=190;
      canvas.className='realtime-hand-video-m7v3';
      const ctx=canvas.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,480,190);
      Object.defineProperty(canvas,'readyState',{value:4});
      Object.defineProperty(canvas,'videoWidth',{value:480});
      Object.defineProperty(canvas,'videoHeight',{value:190});
      const count=document.createElement('span');count.id='realtime-hand-count-m7v3';count.textContent='0 / 14';
      const cancel=document.createElement('button');cancel.className='realtime-hand-cancel-m7v3';cancel.textContent='キャンセル';
      cancel.onclick=()=>fake.remove();
      fake.append(canvas,guideWrap,count,cancel);document.body.append(fake);
      const original=document.createElement('button');original.id='open-realtime-hand-camera-m7v3';
      document.body.append(original);original.click();original.remove();
      await new Promise(resolve=>setTimeout(resolve,950));
      const capture=fake.querySelector('.m7v33-capture');
      if(!capture)return {error:'capture button missing'};
      const rect=capture.getBoundingClientRect(),other=cancel.getBoundingClientRect();
      const overlap=!(rect.right<=other.left||other.right<=rect.left||
        rect.bottom<=other.top||other.bottom<=rect.top);
      capture.click();
      await new Promise(resolve=>setTimeout(resolve,160));
      const result=document.getElementById('hand-result-overlay-m7v5');
      const countTiles=result?.querySelectorAll('.hand-result-tile-m7v5').length||0;
      const empty=result?.querySelectorAll('.hand-result-tile-m7v5:not([data-tile])').length||0;
      const note=result?.querySelector('.hand-result-note-m7v5')?.textContent||'';
      result?.remove();fake.remove();
      return {overlap,countTiles,empty,note};
    });
    assert.equal(manual.overlap,false,'camera capture and cancel overlap '+JSON.stringify(manual));
    assert.equal(manual.countTiles,14,'0-candidate capture did not open manual review '+JSON.stringify(manual));
    assert.equal(manual.empty,14,'manual review must not fabricate recognition '+JSON.stringify(manual));
    assert(manual.note.includes('撮影枠内'),'guide-photo fallback explanation missing '+JSON.stringify(manual));
    // v36 must locate a touching tile row even when the scene is dimmer than the old fixed RGB threshold.
    const crop=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=480;canvas.height=190;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#6d4930';ctx.fillRect(0,0,480,190);
      ctx.fillStyle='#85847f';ctx.fillRect(72,58,336,42);
      ctx.fillStyle='#252525';
      for(let i=0;i<14;i++){
        ctx.fillRect(79+i*24,70,2,13);
        ctx.fillRect(83+i*24,77,4,5);
      }
      const row=window.M7CameraV36.estimateTileRow(ctx);
      const boxes=window.M7CameraV36.manualGuideBoxes(ctx);
      return {row,boxes};
    });
    assert(crop.row&&crop.row.x>60&&crop.row.x<85&&crop.row.y>45&&crop.row.y<67,
      'tile row not located '+JSON.stringify(crop));
    assert.equal(crop.boxes.length,14,'tile row should create 14 aligned slots '+JSON.stringify(crop));
    assert(crop.boxes.every(b=>b.y>45&&b.h<70&&b.w>10),
      'manual previews include background instead of tiles '+JSON.stringify(crop));
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
    console.log('PASS: M7 v36 fixed-frame shutter/row segmentation + landscape agari/score/review flow');
    console.log('Score geometry:',JSON.stringify(score),'DOM nodes:',initial,'to',after);
    console.log('Type overlay geometry:',JSON.stringify(location));
    console.log('Browser pageerrors (not all fatal):',errors.slice(0,3).join(' | ')||'none');
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
