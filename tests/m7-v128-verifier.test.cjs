const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const benchmark=require('../m7-benchmark-v123.js');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('v128 adds 4萬↔8萬 sequence and learned-template second-stage verifiers',()=>{
  assert(camera.includes('function yoloV128Manzu48SequenceConflicts'));
  assert(camera.includes('function yoloV128Manzu48TemplateConflicts'));
  assert(camera.includes("rank===4&&Math.max(...left)>=6&&Math.max(...right)>=8"));
  assert(camera.includes("yl==='4萬'&&ll==='8萬'"));
  assert(camera.includes("yl==='8萬'&&ll==='4萬'"));
  assert(camera.includes('yoloV128Manzu48SequenceConflictIndexes'));
  assert(camera.includes('yoloV128Manzu48TemplateConflictIndexes'));
});

test('v128 strengthens red-five suit repair with local majority while preserving raw evidence',()=>{
  assert(camera.includes('function redFiveLocalMajoritySuitV128'));
  assert(camera.includes("r.redRepair=directSuit?'context-suit':'local-majority-suit'"));
  assert(camera.includes("r.rawOriginalLabel=String(r.rawOriginalLabel||raw)"));
  assert(camera.includes("r.redRepair==='context-suit'||r.redRepair==='local-majority-suit'"));
});

test('v128 corrected crop export contains only user-corrected confirmed crop samples',()=>{
  const rows=[{
    id:'case-1',phase:'confirmed',createdAt:123,categories:['AUTO_WRONG_CORRECTED'],
    initial:{
      labels:['4萬','5萬'],rawLabels:['',''],
      selectedRawEvidence:[
        {rawLabel:'4m',tile:'4萬',score:.82,runnerRawLabel:'',runnerTile:'',runnerScore:0,classMargin:.82,crossViewShare:1},
        {rawLabel:'0p',tile:'5筒',score:.63,runnerRawLabel:'',runnerTile:'',runnerScore:0,classMargin:.63,crossViewShare:1}
      ],
      captureQuality:{recommendation:'ok',sharpness:61.9}
    },
    final:{
      labels:['8萬','5萬'],rawLabels:['','0m'],
      correctedIndexes:[0,1],autoWrongCorrectedIndexes:[0],rawCorrectedIndexes:[1]
    },
    images:{crops:[{index:0,dataUrl:'data:image/jpeg;base64,AAA'},{index:1,dataUrl:'data:image/jpeg;base64,BBB'}]}
  },{
    id:'case-2',phase:'captured',initial:{labels:['4萬']},images:{crops:[{index:0,dataUrl:'data:image/jpeg;base64,CCC'}]}
  }];
  const payload=benchmark.correctedCropExportPayload(rows);
  assert.equal(payload.version,'MAKI v134');
  assert.equal(payload.count,2);
  assert.equal(payload.samples[0].predictedLabel,'4萬');
  assert.equal(payload.samples[0].correctLabel,'8萬');
  assert.equal(payload.samples[0].kind,'label-correction');
  assert.equal(payload.samples[1].correctRawLabel,'0m');
  assert.equal(payload.samples[1].kind,'red-metadata-correction');
  assert(payload.samples.every(x=>x.imageDataUrl.startsWith('data:image/jpeg')));
});

test('v128 corrected-crop export API remains available under v130 copy UI',()=>{
  const logger=fs.readFileSync(path.join(root,'m7-benchmark-v123.js'),'utf8');
  assert(logger.includes("training.textContent='修正crop準備中'"));
  assert(logger.includes("training.textContent=copyCache.cropsJson?'修正cropコピー'"));
  assert(logger.includes("'MAKI_v134_corrected_crops.json'"));
  assert(logger.includes("'MAKI_v134_benchmark_index.json'"));
  assert(logger.includes('window.MAKIV128Benchmark=frozen'));
});

test('v128 build/cache markers are current',()=>{
  assert(index.includes('MAKI v134'));
  assert(index.includes('v=m7v134'));
  assert(sw.includes('mahjong-score-app-m7-v134'));
  assert.doesNotThrow(()=>new Function(sw));
});
