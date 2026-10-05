const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const benchmark=require('../m7-benchmark-v123.js');
const logger=fs.readFileSync(path.join(root,'m7-benchmark-v123.js'),'utf8');

test('v129 adds direct learned-template safety verifier for 2/4/8 manzu',()=>{
  assert(camera.includes("const YOLO_V129_MANZU_MEMORY_LABELS=Object.freeze(['2萬','4萬','8萬'])"));
  assert(camera.includes('function v129TemplateDistanceSummary'));
  assert(camera.includes('function yoloV129Manzu248MemoryConflicts'));
  assert(camera.includes('yoloV129Manzu248MemoryConflictIndexes'));
  assert(camera.includes('alternateDistance'));
  assert(camera.includes('YOLO_V129_MEMORY_MIN_ADVANTAGE=.015'));
});

test('v129 memory verifier is part of the initial abstention set before generic legacy fallback',()=>{
  const pMemory=camera.indexOf('const v129Manzu248MemoryConflictIndexes=yoloV129Manzu248MemoryConflicts');
  const pInitial=camera.indexOf('const initialBlocked=[...new Set');
  const pPredict=camera.indexOf('legacyPredicted=predict(features');
  assert(pMemory>0&&pInitial>pMemory&&pPredict>pInitial);
  const line=camera.slice(pInitial,pInitial+900);
  assert(line.includes('v129Manzu248MemoryConflictIndexes'));
});

test('v129 benchmark summary computes precision, coverage, exact hands and confusion counts',()=>{
  const rows=[
    {
      phase:'confirmed',
      initial:{labels:['4萬','5萬','','8萬'],rawLabels:['','','',''],captureQuality:{recommendation:'ok'}},
      final:{labels:['8萬','5萬','2萬','8萬'],rawLabels:['','','',''],manualCorrectionCount:2}
    },
    {
      phase:'confirmed',
      initial:{labels:['1萬','2萬'],rawLabels:['',''],captureQuality:{recommendation:'retake'}},
      final:{labels:['1萬','2萬'],rawLabels:['',''],manualCorrectionCount:0}
    }
  ];
  const x=benchmark.benchmarkSummaryPayload(rows);
  assert.equal(x.version,'MAKI v130');
  assert.equal(x.confirmedCases,2);
  assert.equal(x.totalTiles,6);
  assert.equal(x.autoResolved,5);
  assert.equal(x.correctAuto,4);
  assert.equal(x.wrongAuto,1);
  assert.equal(x.safeAbstentions,1);
  assert.equal(x.topConfusions[0].pair,'4萬→8萬');
  assert.equal(x.topConfusions[0].count,1);
  assert(Math.abs(x.autoConfirmPrecision-.8)<1e-9);
  assert(Math.abs(x.autoConfirmCoverage-(5/6))<1e-9);
  assert.equal(x.qualityOkCases,1);
  assert.equal(x.qualityRetakeCases,1);
});

test('v129 logger exposes benchmark summary export UI',()=>{
  assert(logger.includes("summary.textContent='精度集計'"));
  assert(logger.includes('function benchmarkSummaryPayload'));
  assert(logger.includes('async function exportBenchmarkSummary'));
  assert(logger.includes("'MAKI_v130_benchmark_summary.json'"));
  assert(logger.includes('window.MAKIV129Benchmark=frozen'));
});
