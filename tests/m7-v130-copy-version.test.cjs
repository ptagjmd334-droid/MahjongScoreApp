const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const logger=fs.readFileSync(path.join(root,'m7-benchmark-v123.js'),'utf8');
const benchmark=require('../m7-benchmark-v123.js');

function row(version,predicted,truth,unresolved=0,corrections=0){
  const labels=predicted.slice();
  while(labels.length<14)labels.push('');
  const final=truth.slice();
  while(final.length<14)final.push('');
  return {
    version,phase:'confirmed',
    initial:{labels,rawLabels:Array(14).fill(''),unresolved,captureQuality:{recommendation:'ok'}},
    final:{labels:final,rawLabels:Array(14).fill(''),manualCorrectionCount:corrections}
  };
}

test('v130 benchmark summary includes per-version offline comparison',()=>{
  const rows=[
    row('MAKI v128',['4萬','8萬'],['8萬','8萬'],0,1),
    row('MAKI v128',['4萬','8萬'],['8萬','8萬'],0,1),
    row('MAKI v129',['8萬','8萬'],['8萬','8萬'],0,0)
  ];
  const x=benchmark.benchmarkSummaryPayload(rows);
  assert.equal(x.version,'MAKI v133');
  assert.equal(x.perVersion.length,2);
  const v128=x.perVersion.find(v=>v.version==='MAKI v128');
  const v129=x.perVersion.find(v=>v.version==='MAKI v129');
  assert(v128&&v129);
  assert.equal(v128.wrongAuto,2);
  assert.equal(v129.wrongAuto,0);
  assert.equal(v129.autoConfirmPrecision,1);
  assert(v128.autoConfirmPrecision<1);
});

test('v130 result UI defaults corrected-crop and summary actions to clipboard copy',()=>{
  assert(logger.includes("training.textContent='修正crop準備中'"));
  assert(logger.includes("summary.textContent='精度集計準備中'"));
  assert(logger.includes("training.textContent=copyCache.cropsJson?'修正cropコピー'"));
  assert(logger.includes("summary.textContent=copyCache.summaryJson?'精度集計コピー'"));
  assert(logger.includes("copyPreparedJson('crops')"));
  assert(logger.includes("copyPreparedJson('summary')"));
  assert.equal(logger.includes("training.addEventListener('click',e=>{\n      e.preventDefault();e.stopPropagation();\n      exportCorrectedCrops()"),false);
});

test('v130 warms copy payloads before tap so iPhone clipboard write starts inside the gesture',()=>{
  assert(logger.includes('function warmCopyCache()'));
  assert(logger.includes('warmCopyCache().then(setReady)'));
  assert(logger.includes('function copyPreparedJson(kind)'));
  assert(logger.includes('navigator.clipboard?.writeText'));
  assert(logger.includes("throw new Error('copy-not-ready')"));
  assert(logger.includes('copyCache.cropsJson=JSON.stringify(cropsPayload)'));
});

test('v130 keeps file export APIs as fallback but exposes direct-copy APIs',()=>{
  assert.equal(typeof benchmark.exportCorrectedCrops,'function');
  assert.equal(typeof benchmark.exportBenchmarkSummary,'function');
  assert.equal(typeof benchmark.copyCorrectedCropsText,'function');
  assert.equal(typeof benchmark.copyBenchmarkSummaryText,'function');
  assert.equal(typeof benchmark.refreshCopyCache,'function');
});
