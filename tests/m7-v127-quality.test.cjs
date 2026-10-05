const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const benchmark=require('../m7-benchmark-v123.js');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('v127 camera exposes capture quality diagnostics and compact result UI',()=>{
  assert(camera.includes('const CAPTURE_QUALITY_THRESHOLDS_M7V127=Object.freeze'));
  assert(camera.includes('function captureQualityDiagnosticsM7V127'));
  assert(camera.includes('function renderCaptureQualityM7V127'));
  assert(camera.includes("'blur','ブレ・ピンぼけ'"));
  assert(camera.includes("'too-dark','暗すぎ'"));
  assert(camera.includes("'too-bright','明るすぎ'"));
  assert(camera.includes("'tile-small','牌が小さすぎ'"));
  assert(camera.includes("'geometry','牌列の検出が不安定'"));
  assert(camera.includes("title.textContent=retry?'撮り直し推奨':'撮影品質 OK'"));
});

test('v127 quality is attached to camera diagnostics without blocking recognition',()=>{
  assert(camera.includes('analysis.captureQuality=captureQualityDiagnosticsM7V127(capture.canvas,analysis)'));
  assert(camera.includes('captureQuality:analysis.captureQuality'));
  assert(camera.includes('renderCaptureQualityM7V127(root,analysis.captureQuality'));
  assert.equal(camera.includes("if(analysis.captureQuality?.recommendation==='retake')return"),false);
});

test('v127 benchmark classifies retake-recommended captures for later correlation',()=>{
  const record={
    initial:{
      labels:Array(14).fill('1萬'),unresolved:0,
      captureQuality:{recommendation:'retake',issues:['blur']},
      diagnostics:{detectorAdoptionReason:'accepted',yoloDetector:{boxes:[]},detectorGeometry:{}}
    },
    final:null
  };
  const categories=benchmark.classifyCase(record);
  assert(categories.includes('QUALITY_RETAKE_RECOMMENDED'));
});

test('v127 build/cache markers are current',()=>{
  assert(index.includes('MAKI v130'));
  assert(index.includes('v=m7v130'));
  assert(sw.includes('mahjong-score-app-m7-v130'));
  assert.doesNotThrow(()=>new Function(sw));
});
