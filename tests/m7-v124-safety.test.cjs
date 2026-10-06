const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const benchmark=fs.readFileSync(path.join(root,'m7-benchmark-v123.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('v124 adds benchmark-driven 4m confusion abstention without relabeling',()=>{
  assert(camera.includes('function yoloV124ManzuFourConflicts'));
  assert(camera.includes("r.label||'')!=='4萬'"));
  assert(camera.includes("runners.has('2萬')"));
  assert(camera.includes("runners.has('8萬')"));
  assert(camera.includes('YOLO_V124_MAN4_RUNNER_MARGIN=.50'));
  assert(camera.includes('YOLO_V124_MAN4_CROSS_SHARE=.75'));
  assert(camera.includes('...v124ManzuFourConflictIndexes'));
});

test('v124 preserves raw red-five class and adds local suit-conflict abstention',()=>{
  assert(camera.includes('r.rawOriginalLabel=String(r.rawOriginalLabel||raw)'));
  assert(camera.includes('function yoloV124RedFiveSuitConflicts'));
  assert(camera.includes("if(r.redRepair==='context-suit'||r.redRepair==='local-majority-suit')continue"));
  assert(camera.includes('YOLO_V124_RED_LOCAL_MIN_SUPPORT=2'));
  assert(camera.includes('...v124RedFiveSuitConflictIndexes'));
});

test('v124 diagnostics expose both new safety guards',()=>{
  assert(camera.includes('analysis.yoloV124ManzuFourConflictIndexes'));
  assert(camera.includes('analysis.yoloV124RedFiveSuitConflictIndexes'));
  assert(camera.includes('window.M7V36LastDiagnostics.yoloV124ManzuFourConflictIndexes'));
  assert(camera.includes('window.M7V36LastDiagnostics.yoloV124RedFiveSuitConflictIndexes'));
});

test('v124 benchmark fixes null slot reconstruction and improves confirmed capture/share UX',()=>{
  assert(benchmark.includes("const VERSION='MAKI v134'"));
  assert(benchmark.includes("singleMissing!==null&&singleMissing!==undefined&&singleMissing!==''"));
  assert(benchmark.includes("droppedOverlap!==null&&droppedOverlap!==undefined&&droppedOverlap!==''"));
  assert(benchmark.includes("window.addEventListener('maki:verified-hand'"));
  assert(benchmark.includes("copy.className='maki-v124-copy-index'"));
  assert(benchmark.includes("copy.textContent='JSON本文コピー'"));
  assert(benchmark.includes("'MAKI_v134_benchmark_index.json'"));
  assert(benchmark.includes('window.MAKIV124Benchmark=frozen'));
});

test('v124 build/cache version is visible and benchmark remains loaded before ui owner',()=>{
  assert(index.includes('MAKI v134'));
  assert(index.includes('v=m7v134'));
  assert.equal(index.includes('\\n  <script'),false,'index must not ship a literal backslash-n between script tags');
  assert.doesNotThrow(()=>new Function(sw));
  assert(sw.includes('mahjong-score-app-m7-v134'));
  assert.equal(sw.includes('\\n  "./maki-v111-hand-entry.js"'),false,'service worker must not contain a literal backslash-n token');
  assert(index.indexOf('m7-camera-v36.js')<index.indexOf('m7-benchmark-v123.js'));
  assert(index.indexOf('m7-benchmark-v123.js')<index.indexOf('ui-fixes.js'));
});
