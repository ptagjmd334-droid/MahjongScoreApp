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

test('class-balanced ranking removes template-count advantage',()=>{
  const w=4,h=4,n=w*h;
  const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
  const query=feat(0);
  const many=[feat(0),feat(.1),feat(.1),feat(.8),feat(.8)];
  const one=[feat(.2)];
  const old=core.rankLabelsRobust(query,{many,one},{singlePenalty:.018,maxTemplates:3});
  const balanced=core.rankLabelsBalanced(query,{many,one});
  assert.equal(old[0].label,'many','legacy ranking should expose the sample-count advantage in this fixture');
  assert.equal(balanced[0].label,'one','balanced ranking must compare one class prototype per label');
  assert.equal(balanced.find(x=>x.label==='many').sampleCount,5);
  assert.equal(balanced.find(x=>x.label==='one').sampleCount,1);
});

test('soft family prior can recover a strong label even when family1 is wrong',()=>{
  const w=4,h=4,n=w*h;
  const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
  const query=feat(0);
  const lib={
    '1萬':[feat(.10)],'2萬':[feat(.10)],'3萬':[feat(.10)],
    '5筒':[feat(.02)],'6筒':[feat(.80)],'8筒':[feat(.80)]
  };
  assert.equal(core.rankFamiliesBalanced(query,lib)[0].label,'萬','fixture must make family stage prefer 萬');
  const soft=core.rankLabelsSoftHierarchical(query,lib,{priorWeight:.18,maxPenalty:.012});
  assert.equal(soft[0].label,'5筒','soft prior must not hard-exclude the globally strong 筒 candidate');
  assert.equal(soft[0].family,'筒');
  assert.equal(soft[0].bestFamily,'萬');
});

test('soft family prior nudges a close global race toward a clearly stronger family',()=>{
  const w=4,h=4,n=w*h;
  const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
  const query=feat(0);
  const lib={
    '1萬':[feat(.08)],'2萬':[feat(.08)],'3萬':[feat(.08)],
    '5筒':[feat(.075)],'6筒':[feat(.35)],'8筒':[feat(.35)]
  };
  assert.equal(core.rankLabelsBalanced(query,lib)[0].label,'5筒','fixture needs a slight global 筒 lead');
  assert.equal(core.rankFamiliesBalanced(query,lib)[0].label,'萬','family evidence should clearly prefer 萬');
  const soft=core.rankLabelsSoftHierarchical(query,lib,{priorWeight:.18,maxPenalty:.012});
  assert.equal(soft[0].label,'1萬','family prior should break only the close race');
});

test('family discriminative map emphasizes pixels that separate labels',()=>{
  const w=6,h=6,n=w*h;
  const feat=(top)=>{
    const gray=Array(n).fill(.15),edge=Array(n).fill(.05),red=Array(n).fill(0),green=Array(n).fill(0);
    for(let x=0;x<w;x++){gray[x]=top;edge[x]=top;}
    return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
  };
  const lib={'1萬':[feat(.1)],'2萬':[feat(.9)]};
  const weights=core.familyDiscriminativeWeights(lib)['萬'];
  assert.equal(weights.length,n);
  const top=weights.slice(0,w).reduce((s,v)=>s+v,0)/w;
  const bottom=weights.slice(w).reduce((s,v)=>s+v,0)/(n-w);
  assert(top>bottom*2,{top,bottom});
  const ranked=core.rankLabelsFamilyDiscriminative(feat(.82),lib,{blend:.84,priorWeight:.26,maxPenalty:.016});
  assert.equal(ranked[0].label,'2萬');
  assert(Number.isFinite(ranked[0].discriminativeDistance));
});

test('v60 label-specific map and template spread expose same-family evidence',()=>{
  const w=6,h=6,n=w*h;
  const feat=(left,right,jitter=0)=>{
    const gray=Array(n).fill(.10),edge=Array(n).fill(.03),red=Array(n).fill(0),green=Array(n).fill(0);
    for(let y=1;y<5;y++){
      gray[y*w+1]=left+jitter;edge[y*w+1]=left+jitter;
      gray[y*w+4]=right+jitter;edge[y*w+4]=right+jitter;
    }
    return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
  };
  const lib={
    '5筒':[feat(.85,.15),feat(.82,.16)],
    '6筒':[feat(.15,.85),feat(.17,.82)],
    '7筒':[feat(.55,.55),feat(.53,.57)]
  };
  const maps=core.labelDiscriminativeWeights(lib);
  assert.equal(maps['5筒'].length,n);
  assert(maps['5筒'][2*w+1]>maps['5筒'][2*w+2],
    'label map should emphasize pixels that distinguish 5筒 from same-family rivals');
  assert(core.templateSpread(lib['5筒'])>0,'multi-template class should expose non-zero spread');
  assert.equal(core.templateSpread([lib['5筒'][0]]),0,'single-template class spread should be zero');
  const ranked=core.rankLabelsFamilyDiscriminative(feat(.80,.18),lib,{blend:.84,labelBlend:.72,priorWeight:.26,maxPenalty:.016});
  assert.equal(ranked[0].label,'5筒');
  assert(Number.isFinite(ranked[0].templateSpread));
  assert(Number.isFinite(ranked[0].sameFamilyGap));
});

test('v64 medoid/template consensus and structural shape distance remain available',()=>{
  const w=4,h=4,n=w*h;
  const feat=v=>({kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(v),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)});
  const templates=[feat(.10),feat(.11),feat(.90)];
  const medoid=core.medoidFeature(templates);
  assert.equal(medoid,templates[1],'medoid should select the central real capture, not synthesize an average');
  const q=feat(.105);
  const consensus=core.templateConsensusDistance(q,templates);
  assert(Number.isFinite(consensus));
  assert(consensus<core.featureDistance(q,templates[2]),'consensus must favor repeated nearby captures over an outlier');
  const single=core.templateConsensusDistance(q,[feat(.10)]);
  assert(single>core.featureDistance(q,feat(.10)),'single-template classes must keep a small support penalty');
});

test('v64 structural distance is more tolerant to a one-pixel shift than to a different shape',()=>{
  const w=24,h=36,n=w*h;
  const make=(kind,shift=0)=>{
    const gray=Array(n).fill(0),edge=Array(n).fill(0),red=Array(n).fill(0),green=Array(n).fill(0);
    if(kind==='vertical'){
      for(let y=7;y<29;y++)for(let x=10+shift;x<13+shift;x++)gray[y*w+x]=edge[y*w+x]=1;
    }else{
      for(let y=17;y<20;y++)for(let x=4;x<20;x++)gray[y*w+x]=edge[y*w+x]=1;
    }
    return {kind:'perspective-direct-v1',width:w,height:h,gray,edge,red,green};
  };
  const a=make('vertical',0),shifted=make('vertical',1),other=make('horizontal',0);
  const same=core.structuralDistance(a,shifted),different=core.structuralDistance(a,other);
  assert(Number.isFinite(same)&&Number.isFinite(different));
  assert(same<different,'structural descriptor should preserve shape identity across a one-pixel shift');
  const consensus=core.templateStructuralConsensusDistance(shifted,[a,make('vertical',-1),other]);
  assert(consensus<core.structuralDistance(shifted,other),'structural consensus should favor repeated same-shape samples');
});

test('v65 multi-view rank consensus ignores one bad crop and tracks view votes',()=>{
  const mk=(a,b)=>[
    {label:'5筒',distance:a,family:'筒',representativeDistance:a,templateConsensusDistance:a,bestDistance:a,sampleCount:3},
    {label:'8筒',distance:b,family:'筒',representativeDistance:b,templateConsensusDistance:b,bestDistance:b,sampleCount:3}
  ];
  const noisy=mk(.15,.07).sort((a,b)=>a.distance-b.distance);
  const combined=core.combineViewRankings([
    mk(.08,.13),
    mk(.09,.12),
    noisy,
    mk(.085,.125),
    mk(.095,.115)
  ]);
  assert.equal(combined[0].label,'5筒','four agreeing crops should beat one noisy crop');
  assert.equal(combined[0].viewTopVotes,4);
  assert.equal(combined[0].viewCount,5);
  assert(Number.isFinite(combined[0].viewDistanceRange));
});

test('tile family mapping covers suits, honors and red fives',()=>{
  assert.equal(core.tileFamily('3萬'),'萬');
  assert.equal(core.tileFamily('赤5筒'),'筒');
  assert.equal(core.tileFamily('7索'),'索');
  for(const h of ['東','南','西','北','白','發','発','中'])assert.equal(core.tileFamily(h),'字');
});

test('perspective direct descriptor stays supported',()=>{
  const w=16,h=24,n=w*h;
  const a={kind:'perspective-direct-v1',width:w,height:h,gray:Array(n).fill(0),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)};
  const b={...a,gray:Array(n).fill(.05),edge:Array(n).fill(.02),red:Array(n).fill(0),green:Array(n).fill(0)};
  assert(Number.isFinite(core.featureDistance(a,b)));
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
  assert(index.includes('M7 v65'));
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

test('v65 preserves stable learning and adds five-view crop consensus',()=>{
  const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
  assert(camera.includes("MahjongScoreApp_tile_templates_stable1"));
  assert(camera.includes("MahjongScoreApp_tile_templates_stable1_backup"));
  assert(camera.includes("MahjongScoreApp_tile_templates_m7v53innercrop1"));
  assert(camera.includes("MahjongScoreApp_tile_templates_m7v48balanced24x36"));
  assert(camera.includes('legacyLibraryKeys'));
  assert(camera.includes('cropResampleFeatureMap'));
  assert(camera.includes('tb>1.22||lr>1.22'));
  assert(camera.includes('horizontalDelta>.16||verticalDelta>.16||worstCorner>.30'));
  assert(camera.includes('fitResidual>.055'));
  assert(camera.includes('perspectiveNeed<.045'));
  assert(camera.includes('templateSpread'));
  assert(camera.includes('sameFamilyGap'));
  assert(camera.includes('requiredLocalGap'));
  const coreSource=fs.readFileSync(path.join(root,'m7-recognition-core.js'),'utf8');
  assert(coreSource.includes('function medoidFeature'));
  assert(coreSource.includes('function templateConsensusDistance'));
  assert(coreSource.includes('function structuralDistance'));
  assert(coreSource.includes('function templateStructuralConsensusDistance'));
  assert(coreSource.includes('function combineViewRankings'));
  assert(coreSource.includes('shapeBlend'));
  assert(coreSource.includes('representativeScore*(1-templateBlend)+consensusDistance*templateBlend'));
  assert(camera.includes('function fitGlobalRowGrid'));
  assert(camera.includes('const gridFit=fitGlobalRowGrid(lowCtx,lowRow,14)'));
  assert(camera.includes("reason:'periodic-grid'"));
  assert(camera.includes("reason:'same-family-margin'"));
  assert(camera.includes('confidenceReasonSummary'));
  assert(camera.includes('function inferenceFeatureViews'));
  assert(camera.includes('core.combineViewRankings(viewRankings)'));
  assert(camera.includes("reason:'view-disagreement'"));
  assert(camera.includes("reason:'representative-distance'"));
  assert(camera.includes("reason:'template-consensus'"));
  assert(camera.includes("reason:'template-distance'"));
  assert(camera.includes('gridCandidate:gridFit.used===true'));
  assert(camera.includes('gridUsed:false'));
  assert(camera.includes('const row={x:lowRow.x*sx,y:lowRow.y*sy,w:lowRow.w*sx,h:lowRow.h*sy}'));
  const picker=fs.readFileSync(path.join(root,'m8-v3.js'),'utf8');
  assert(picker.includes('100dvh'));
  assert(picker.includes('grid-template-columns:repeat(12,minmax(0,1fr))'));
  assert(picker.includes('grid-template-rows:repeat(3,minmax(0,1fr))'));
  assert(camera.includes('crop:recognition.toDataURL'));
  assert(camera.includes('feature:descriptorFromCanvas(recognition)'));
  assert(camera.includes("applyInnerCrop=!key.includes('m7v53innercrop')"));
  assert(camera.includes("badge.className='m7v53-top1'"));
  assert(camera.includes('innerRecognitionCanvas'));
  assert(camera.includes('innerFeatureFromCanonical'));
  assert(camera.includes('resolve(innerFeatureFromCanonical(canonical))'));
  assert(camera.includes('Promise.all(selected.map'));
  assert(!camera.includes('diagnosticReadyPromise'));
  assert(!camera.includes('buildInnerDiagnosticLibrary'));
  assert(camera.includes('canonicalizeCanvas'));
  assert(camera.includes('detectFaceQuad'));
  assert(camera.includes('warpQuadToCanvas'));
  assert(camera.includes('perspectiveFaceCanvas'));
  assert(camera.includes('const width=24,height=36'));
  assert(camera.includes('core.rankLabelsFamilyDiscriminative(view,lib'));
  assert(camera.includes("rawSaved=await saveTrainingBatch(raw)"));
  assert(camera.includes("MahjongScoreApp_tile_learning_meta1"));
  assert(camera.includes('m7v57-photo-preview'));
  assert(camera.includes('renderPickerPhoto(index)'));
  assert(camera.includes('保存完了を確認してから次へ進みます'));
  assert(camera.includes('async function persistVerifiedHand'));
  assert(camera.includes("reason:raw.length?'durable-store-failed':'raw-images-missing'"));
  assert(camera.includes("status.textContent='学習データを保存中…'"));
  assert(camera.includes("localStorage.setItem(LIB_BACKUP_KEY,json)"));
  assert(camera.includes('saveLibraryDetailed'));
  assert(camera.includes('activeLibrary'));
  assert(camera.includes('rawVerified'));
  assert(camera.includes('allowBackupEviction'));
  assert(camera.includes("storageMode:stable.primaryVerified?'stable'+(rawVerified?'+raw':''):'raw'"));
  assert(camera.includes('保存失敗コード:'));
  assert(camera.includes("},true);"));
  const ui=fs.readFileSync(path.join(root,'ui-fixes.js'),'utf8');
  assert(ui.includes("await window.M7CameraV36.persistVerifiedHand(root)"));
  assert(ui.includes("学習データの保存に失敗しました"));
  assert(ui.includes("if(!saved?.ok)"));
});

test('all published JavaScript entrypoints parse',()=>{
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const files=[...index.matchAll(/<script\s+src="([^"]+\.js)(?:\?[^"]*)?"/g)].map(m=>m[1]);
  for(const name of files){
    const js=fs.readFileSync(path.join(root,name),'utf8');
    assert.doesNotThrow(()=>new vm.Script(js,{filename:name}),name+' syntax invalid');
  }
});
