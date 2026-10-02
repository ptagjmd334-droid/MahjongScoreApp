const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'m7-benchmark-v123.js'),'utf8');
const api=require('../m7-benchmark-v123.js');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v124 benchmark module parses and exposes pure helpers',()=>{
  assert.doesNotThrow(()=>new Function(code));
  assert.equal(api.VERSION,'MAKI v129');
  assert.equal(api.MAX_CASES,50);
  assert.equal(api.rawLabelToTile('0m'),'5萬');
  assert.equal(api.rawLabelToTile('0p'),'5筒');
  assert.equal(api.rawLabelToTile('0s'),'5索');
  assert.equal(api.rawLabelToTile('3z'),'西');
});

test('v124 reconstructs a 15 to 14 selection and preserves raw red-five evidence',()=>{
  const boxes=Array.from({length:15},(_,i)=>({x:i*10,w:8,h:14,label:i===5?'0p':(i===8?'5m':'1m'),score:i===5?.91:.8}));
  const geometry={dropped:[{rawIndex:7}]};
  const slots=api.reconstructSelectedRaw({boxes},geometry,14);
  assert.equal(slots.length,14);
  assert.equal(slots[5].label,'0p');
  assert.equal(slots.some(x=>x?.rawIndex===7),false);
});

test('v124 accepted 14-box geometry does not invent missing slot zero from null',()=>{
  const boxes=Array.from({length:14},(_,i)=>({x:i*10,w:8,h:14,label:i===0?'1m':'2m',score:.8}));
  const slots=api.reconstructSelectedRaw({boxes},{missingIndex:null,droppedOverlapRawIndex:null,dropped:[]},14);
  assert.equal(slots.length,14);
  assert.equal(slots[0].rawIndex,0);
  assert.equal(slots[0].label,'1m');
  assert(slots.every(Boolean));
});

test('v124 classifies the observed red-five suit confusion without changing recognition',()=>{
  const boxes=Array.from({length:14},(_,i)=>({x:i*10,w:8,h:14,label:i===4?'0p':'1m',score:i===4?.91:.8,crossViewSupport:1,crossViewCount:1,crossViewShare:1}));
  const record={
    initial:{
      labels:['1萬','1萬','1萬','1萬','5萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],
      rawLabels:Array(14).fill(''),unresolved:0,
      diagnostics:{yoloDetector:{boxes},detectorGeometry:{},detectorAdoptionReason:'accepted'}
    },
    final:{
      labels:['1萬','1萬','1萬','1萬','5萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],
      rawLabels:Array(14).fill(''),correctedIndexes:[],autoWrongCorrectedIndexes:[],unresolvedFilledIndexes:[]
    }
  };
  const categories=api.classifyCase(record);
  assert(categories.includes('RED5_SUIT_CONFUSION_RAW'));
  assert(categories.includes('RED5_REPAIRED_OR_DISPLAY_SAFE'));
  assert(categories.includes('SUCCESS_14_14'));
});

test('v124 separates safe abstention from silent/high-confidence wrong corrections',()=>{
  const boxes=Array.from({length:14},(_,i)=>({x:i*10,w:8,h:14,label:i===2?'3z':i===5?'4m':'1m',score:i===2?.5:i===5?.82:.8}));
  const base={diagnostics:{yoloDetector:{boxes},detectorGeometry:{},detectorAdoptionReason:'subset-15-to-14'}};
  const safe={initial:{...base,labels:['1萬','1萬','','1萬','1萬','4萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],unresolved:1},final:{labels:['1萬','1萬','西','1萬','1萬','4萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],correctedIndexes:[2],unresolvedFilledIndexes:[2],autoWrongCorrectedIndexes:[]}};
  const safeCats=api.classifyCase(safe);
  assert(safeCats.includes('SAFE_ABSTENTION'));
  assert(safeCats.includes('SAFE_ABSTENTION_CONFIRMED'));
  assert(safeCats.includes('DETECTION_SUBSET'));

  const wrong={initial:{...base,labels:['1萬','1萬','西','1萬','1萬','4萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],unresolved:0},final:{labels:['1萬','1萬','西','1萬','1萬','8萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬','1萬'],correctedIndexes:[5],unresolvedFilledIndexes:[],autoWrongCorrectedIndexes:[5]}};
  const wrongCats=api.classifyCase(wrong);
  assert(wrongCats.includes('AUTO_WRONG_CORRECTED'));
  assert(wrongCats.includes('HIGH_CONFIDENCE_WRONG'));
});

test('v124 source includes raw-frame capture, IndexedDB retention and share/export controls',()=>{
  assert(code.includes("DB_NAME='maki-recognition-benchmark-v123'"));
  assert(code.includes("pendingCapture=captureGuideFrameForLog(shutter)"));
  assert(code.includes("rawGuideFrame:pendingCapture?.dataUrl"));
  assert(code.includes("maki-v123-share-case"));
  assert(code.includes("maki-v123-export-index"));
  assert(code.includes("maki-v124-copy-index"));
  assert(code.includes("copyIndexText"));
  assert(code.includes("maki:verified-hand"));
  assert(code.includes("navigator.share"));
  assert(code.includes("metadata-only"));
});

test('v124 index loads benchmark logger after camera but before ui owner',()=>{
  const index=read('index.html');
  assert(index.indexOf('m7-camera-v36.js')<index.indexOf('m7-benchmark-v123.js'));
  assert(index.indexOf('m7-benchmark-v123.js')<index.indexOf('ui-fixes.js'));
});
