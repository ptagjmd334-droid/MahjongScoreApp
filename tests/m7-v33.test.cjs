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
  assert(index.includes('M7 v36'));
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
