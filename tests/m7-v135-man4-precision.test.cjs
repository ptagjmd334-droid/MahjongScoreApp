const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));

test('v135 adds benchmark-driven medium-confidence 4-man precision guard',()=>{
  assert(camera.includes('function yoloV135ManzuFourPrecisionConflicts'));
  assert(camera.includes('YOLO_V135_MAN4_MAX_UNVERIFIED_SCORE=.88'));
  assert(camera.includes('YOLO_V135_MAN4_OWN_MAX_DISTANCE=.095'));
  assert(camera.includes("String(r.label||'')!=='4萬'"));
  assert(camera.includes('v135ManzuFourPrecisionConflictIndexes'));
  const pGuard=camera.indexOf('const v135ManzuFourPrecisionConflictIndexes=yoloV135ManzuFourPrecisionConflicts');
  const pBlocked=camera.indexOf('const initialBlocked=[...new Set',pGuard);
  assert(pGuard>0&&pBlocked>pGuard);
  assert(camera.slice(pBlocked,pBlocked+900).includes('v135ManzuFourPrecisionConflictIndexes'));
});

test('v135 keeps strong/high-confidence 4-man outside the new guard and requires positive template evidence for medium confidence',()=>{
  assert(camera.includes('score>YOLO_V135_MAN4_MAX_UNVERIFIED_SCORE)continue'));
  assert(camera.includes("v129TemplateDistanceSummary(feature,'4萬',lib)"));
  assert(camera.includes('own.samples>=YOLO_V135_MAN4_OWN_MIN_SAMPLES'));
  assert(camera.includes('own.score<=YOLO_V135_MAN4_OWN_MAX_DISTANCE'));
});

test('v135 public version wiring is consistent',()=>{
  assert.equal(version.version,'MAKI v135');
  assert.equal(version.build,135);
  assert(index.includes('MAKI v135'));
  assert(index.includes('?v=m7v135'));
  assert(index.includes('maki-v135-final-badge'));
});
