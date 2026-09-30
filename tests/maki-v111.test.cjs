const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v111 loads the score-table hand entry module after M8',()=>{
  const index=read('index.html');
  assert(index.includes('MAKI v118'));
  assert(index.includes('window.MAKIDebugV118'));
  assert(index.includes('maki-v111-hand-entry.js?v=m7v118'));
  assert(index.indexOf('m8-v30.js?v=m7v118')<index.indexOf('maki-v111-hand-entry.js?v=m7v118'));
});

test('v111 exposes camera and manual hand registration on the score screen',()=>{
  const code=read('maki-v111-hand-entry.js');
  assert(code.includes('手牌登録'));
  assert(code.includes('カメラで認識'));
  assert(code.includes('手動入力'));
  assert(code.includes("ctx.step!=='score'"));
  assert(code.includes("document.querySelector('#agari-overlay .score-switch-table')"));
  assert(code.includes("openSimpleGameMenuV1"));
  assert(code.includes("open-realtime-hand-camera-m7v3"));
});

test('manual hand input validates 14 tiles and bridges to the existing M8 source of truth',()=>{
  const code=read('maki-v111-hand-entry.js');
  assert(code.includes('Array.from({length:14}'));
  assert(code.includes("(counts[tile]||0)>=4"));
  assert(code.includes('acceptVerifiedHandM8V87'));
  assert(code.includes('maki:verified-hand'));
  assert(code.includes('hand-result-overlay-m7v5'));
  assert(code.includes('hand-result-tile-m7v5'));
});

test('winner and ron/tsumo already entered in agariFlow are reused instead of asked twice',()=>{
  const code=read('maki-v111-hand-entry.js');
  assert(code.includes('agariFlow.type'));
  assert(code.includes('agariFlow.winners'));
  assert(code.includes('agariFlow.discarder'));
  assert(code.includes("label!=='和了者'&&label!=='和了方法'"));
  assert(code.includes('対局入力から引継ぎ'));
  assert(code.includes('[data-winner]'));
  assert(code.includes('[data-type]'));
});

test('v111 service worker cache contains the new module',()=>{
  const sw=read('sw.js');
  const manifest=read('manifest.webmanifest');
  assert(sw.includes('mahjong-score-app-m7-v118'));
  assert(sw.includes('./maki-v111-hand-entry.js'));
  assert(sw.includes('manifest.webmanifest?v=m7v118'));
  assert(manifest.includes('v=m7v118'));
});
