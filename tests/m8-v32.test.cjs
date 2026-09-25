'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const core=require('../m8-scoring-core.js');

test('one identical sequence pair is iipeikou even with only 3 sequences',()=>{
 assert.deepEqual(core.sequencePairYaku([0,0,9],true),['一盃口']);
 assert.deepEqual(core.sequencePairYaku([0,0,9],false),[]);
 assert.deepEqual(core.sequencePairYaku([0,1,9,12],true),[]);
});
test('two sequence pairs are ryanpeikou only with four sequences',()=>{
 assert.deepEqual(core.sequencePairYaku([0,0,9,9],true),['二盃口']);
 assert.deepEqual(core.sequencePairYaku([0,0,0,0],true),['二盃口']);
 assert.deepEqual(core.sequencePairYaku([0,0,9],true),['一盃口']);
});
test('triplet and kan fu distinguish open/closed and terminal/honor',()=>{
 assert.equal(core.tripletFu(false,false),2);
 assert.equal(core.tripletFu(false,true),4);
 assert.equal(core.tripletFu(true,false),4);
 assert.equal(core.tripletFu(true,true),8);
 assert.equal(core.kanFu(false,false),8);
 assert.equal(core.kanFu(false,true),16);
 assert.equal(core.kanFu(true,false),16);
 assert.equal(core.kanFu(true,true),32);
});
test('fu is rounded up and open hand has 30fu minimum',()=>{
 assert.equal(core.roundFu(32,true),40);
 assert.equal(core.roundFu(32,false),40);
 assert.equal(core.roundFu(20,false),30);
 assert.equal(core.roundFu(20,true),20);
 assert.equal(core.roundFu(NaN,true),null);
});
test('all JavaScript app entrypoints parse',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const files=[...index.matchAll(/<script\s+src="([^"]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
 assert(files.length>=15);
 for(const name of files){
   const js=fs.readFileSync(path.join(root,name),'utf8');
   assert.doesNotThrow(()=>new vm.Script(js,{filename:name}),name+' syntax invalid');
 }
});
test('score core loads before actual M8 fu and yaku evaluators',()=>{
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const order=['m8-scoring-core.js','m8-v21.js','m8-v22.js'];
 assert(order.every(x=>index.includes(x)));
 assert(index.indexOf(order[0])<index.indexOf(order[1]));
 assert(index.indexOf(order[1])<index.indexOf(order[2]));
 assert(index.includes('M8 v32')||index.includes('M7 v33')||index.includes('M7 v34')||index.includes('M7 v35')||index.includes('M7 v36')||index.includes('M7 v37')||index.includes('M7 v38'));
});
test('legacy layout/score observer loops cannot be reattached',()=>{
 const v6=fs.readFileSync(path.join(root,'m8-v6.js'),'utf8');
 const v7=fs.readFileSync(path.join(root,'m8-v7.js'),'utf8');
 const v9=fs.readFileSync(path.join(root,'m8-v9.js'),'utf8');
 assert(!v6.includes("root.parentElement?.querySelector('.m8v6-han-guide')?.remove()"));
 assert(!v6.includes("docObserver.observe(document.body,{childList:true,subtree:true,characterData:true})"));
 assert(!v7.includes("layoutObserver.observe(document.body"));
 assert(!v7.includes("captureTiles();refreshLayouts();"));
 assert(!v9.includes("overlay.classList.toggle('m8v9-score',score)"));
 assert(!v9.includes("new MutationObserver(refresh).observe(document.body"));
});
test('scoring details do not change actual state or break v31 rollback',()=>{
 const v21=fs.readFileSync(path.join(root,'m8-v21.js'),'utf8');
 const v22=fs.readFileSync(path.join(root,'m8-v22.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(v21.includes("window.M8ScoringCoreV32?.roundFu"));
 assert(v21.includes("parts.push('合計'+total+'符 → '+fu+'符')"));
 assert(v22.includes("window.M8ScoringCoreV32?.sequencePairYaku"));
 assert(!app.includes('m8-v27.js?v='));
 assert(!app.includes('m8-v28.js?v='));
 assert(!app.includes('m8-v29.js?v='));
});
