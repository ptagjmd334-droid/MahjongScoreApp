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
 assert(index.includes('M8 v32')||index.includes('M7 v33')||index.includes('M7 v34')||index.includes('M7 v35')||index.includes('M7 v36')||index.includes('M7 v37')||index.includes('M7 v38')||index.includes('M7 v39')||index.includes('M7 v40')||index.includes('M7 v41')||index.includes('M7 v42')||index.includes('M7 v43')||index.includes('M7 v44')||index.includes('M7 v45')||index.includes('M7 v46')||index.includes('M7 v47')||index.includes('M7 v48')||index.includes('M7 v49')||index.includes('M7 v50')||index.includes('M7 v51')||index.includes('M7 v52')||index.includes('M7 v53')||index.includes('M7 v54')||index.includes('M7 v55')||index.includes('M7 v56')||index.includes('M7 v57')||index.includes('M7 v58')||index.includes('M7 v59')||index.includes('M7 v60')||index.includes('M7 v61')||index.includes('M7 v62')||index.includes('M7 v63')||index.includes('M7 v64')||index.includes('M7 v65')||index.includes('M7 v66')||index.includes('M7 v67')||index.includes('M7 v68')||index.includes('M7 v69')||index.includes('M7 v70')||index.includes('M7 v71')||index.includes('M7 v72')||index.includes('M7 v73')||index.includes('M7 v74')||index.includes('M7 v75')||index.includes('M7 v76')||index.includes('M7 v77')||index.includes('M7 v78')||index.includes('M7 v79')||index.includes('M7 v80')||index.includes('M7 v82')||index.includes('M7 v83')||index.includes('M7 v84')||index.includes('M7 v85')||index.includes('M7 v86')||index.includes('M7 v87')||index.includes('M7 v88')||index.includes('MAKI v89')||index.includes('MAKI v90')||index.includes('MAKI v91')||index.includes('MAKI v92')||index.includes('MAKI v93')||index.includes('MAKI v94')||index.includes('MAKI v95')||index.includes('MAKI v96')||index.includes('MAKI v97')||index.includes('MAKI v98')||index.includes('MAKI v99')||index.includes('MAKI v100')||index.includes('MAKI v101')||index.includes('MAKI v102')||index.includes('MAKI v103')||index.includes('MAKI v104')||index.includes('MAKI v105')||index.includes('MAKI v106')||index.includes('MAKI v107')||index.includes('MAKI v108')||index.includes('MAKI v109')||index.includes('MAKI v110')||index.includes('MAKI v111')||index.includes('MAKI v112')||index.includes('MAKI v113')||index.includes('MAKI v114')||index.includes('MAKI v115')||index.includes('MAKI v116')||index.includes('MAKI v117')||index.includes('MAKI v118')||index.includes('MAKI v119')||index.includes('MAKI v120')||index.includes('MAKI v121')||index.includes('MAKI v122')||index.includes('MAKI v123')||index.includes('MAKI v124')||index.includes('MAKI v128'));
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
