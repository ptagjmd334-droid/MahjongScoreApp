'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const core=require('../m7-recognition-core.js');

test('template distance and conservative classification',()=>{
  const a=[0,0.1,-0.2,0.4],near=[0.01,0.11,-0.18,0.39],far=[1,1,1,1];
  assert(core.rmsDistance(a,near)<.03);
  assert(core.rmsDistance(a,far)>.5);
  const lib={'1萬':[near],'2萬':[far]};
  assert.equal(core.classify(a,lib,{threshold:.2,margin:.02}).label,'1萬');
  assert.equal(core.classify(a,{'1萬':[near],'2萬':[[0.02,.12,-.18,.39]]},{threshold:.2,margin:.05}),null);
});

test('96-cell tile matching tolerates a one-cell crop shift',()=>{
  const w=8,h=12;
  const base=Array(w*h).fill(0);
  for(let y=2;y<10;y++)for(let x=2;x<6;x++)base[y*w+x]=(x===2||x===5||y===2||y===9)?1:-.25;
  const shifted=Array(w*h).fill(0);
  for(let y=0;y<h;y++)for(let x=0;x<w-1;x++)shifted[y*w+x+1]=base[y*w+x];
  assert(core.rmsDistance(base,shifted)>.24);
  assert(core.shiftedRmsDistance(base,shifted,8,12,1)<.06);
  const ranked=core.rankLabels(shifted,{'correct':[base],'wrong':[Array(w*h).fill(.8)]});
  assert.equal(ranked[0].label,'correct');
});

test('robust ranking resists one accidental close template',()=>{
  const f=Array(216).fill(0);
  const close=Array(216).fill(.06),close2=Array(216).fill(.08);
  const accidental=Array(216).fill(.01),wrong2=Array(216).fill(.45);
  const lib={correct:[close,close2],wrong:[accidental,wrong2]};
  const nearest=core.rankLabels(f,lib);
  const robust=core.rankLabelsRobust(f,lib,{singlePenalty:.035,maxTemplates:3});
  assert.equal(nearest[0].label,'wrong');
  assert.equal(robust[0].label,'correct');
});

test('structured HOG color ink distance weights shape and color',()=>{
  const base={kind:'hog-color-ink-v1',hog:Array(432).fill(0),color:Array(72).fill(0),ink:Array(96).fill(0)};
  const same={kind:'hog-color-ink-v1',hog:Array(432).fill(.02),color:Array(72).fill(.01),ink:Array(96).fill(.02)};
  const shape={kind:'hog-color-ink-v1',hog:Array(432).fill(.35),color:Array(72).fill(.01),ink:Array(96).fill(.02)};
  const color={kind:'hog-color-ink-v1',hog:Array(432).fill(.02),color:Array(72).fill(.35),ink:Array(96).fill(.02)};
  assert(core.featureDistance(base,same)<core.featureDistance(base,shape));
  assert(core.featureDistance(base,same)<core.featureDistance(base,color));
  const ranked=core.rankLabelsRobust(same,{same:[base,base],shape:[shape,shape]},{singlePenalty:.035,maxTemplates:3});
  assert.equal(ranked[0].label,'same');
});

test('direct image distance tolerates small transform',()=>{
  const w=16,h=24;
  function feat(shiftX=0,circle=false){
    const gray=Array(w*h).fill(0),edge=Array(w*h).fill(0),red=Array(w*h).fill(0),green=Array(w*h).fill(0);
    for(let y=4;y<20;y++)for(let x=3;x<13;x++){
      const xx=x+shiftX;if(xx<0||xx>=w)continue;
      const on=circle?Math.abs(Math.hypot(x-8,y-12)-4)<1.2:(x===4||x===11||y===5||y===18);
      if(on)gray[y*w+xx]=.9;
    }
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const gx=gray[y*w+x+1]-gray[y*w+x-1],gy=gray[(y+1)*w+x]-gray[(y-1)*w+x];
      edge[y*w+x]=Math.min(1,Math.hypot(gx,gy));
    }
    return {kind:'direct-edge-v1',width:w,height:h,gray,edge,red,green};
  }
  const a=feat(0,false),shifted=feat(1,false),other=feat(0,true);
  const same=core.directImageDistance(a,shifted),different=core.directImageDistance(a,other);
  assert(Number.isFinite(same)&&Number.isFinite(different));
  assert(same<different,{same,different});
  const ranked=core.rankLabelsRobust(shifted,{correct:[a,a],wrong:[other,other]},{singlePenalty:.018,maxTemplates:3});
  assert.equal(ranked[0].label,'correct');
});

test('13/14 candidate position stability requires similar positions',()=>{
  const p=Array.from({length:14},(_,i)=>i/14);
  assert.equal(core.stableEnough(p,p.map(x=>x+.01)),true);
  assert.equal(core.stableEnough(p,p.map(x=>x+.08)),false);
  assert.equal(core.stableEnough(p.slice(0,12),p.slice(0,12)),false);
});

test('camera v36 is loaded before ui-fixes so verified clicks train the active camera module',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const name of ['script.js','m7-recognition-core.js','m7-camera-v36.js','ui-fixes.js'])assert(index.includes(name));
  assert(index.indexOf('script.js')<index.indexOf('m7-recognition-core.js'));
  assert(index.indexOf('m7-recognition-core.js')<index.indexOf('m7-camera-v36.js'));
  assert(index.indexOf('m7-camera-v36.js')<index.indexOf('ui-fixes.js'));
  assert(index.includes('M7 v43'));
});

test('legacy live detector and demo fill yield to the active camera owner',()=>{
  const script=fs.readFileSync(path.join(root,'script.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'ui-fixes.js'),'utf8');
  assert(script.includes('if(window.M7V33CameraOwner)return;'));
  assert(ui.includes('if(window.M7V33CameraOwner)return;'));
});

test('v36 camera avoids fixed bright-white threshold and closes camera when hidden',()=>{
  const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
  assert(camera.includes('neutral=(max-min)/(lum+1)'));
  assert(camera.includes("visibilitychange"));
  assert(camera.includes(".realtime-hand-cancel-m7v3')?.click()"));
});

test('all published JavaScript entrypoints parse',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const files=[...index.matchAll(/<script\s+src="([^"]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
  for(const name of files){
    const js=fs.readFileSync(path.join(root,name),'utf8');
    assert.doesNotThrow(()=>new vm.Script(js,{filename:name}),name+' syntax invalid');
  }
});
