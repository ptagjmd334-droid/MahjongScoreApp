const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v111 loads the score-table hand entry module after M8',()=>{
  const index=read('index.html');
  assert(index.includes('MAKI v132'));
  assert(index.includes('window.MAKIDebugV123'));
  assert(index.includes('maki-v111-hand-entry.js?v=m7v132'));
  assert(index.indexOf('m8-v30.js?v=m7v132')<index.indexOf('maki-v111-hand-entry.js?v=m7v132'));
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
  assert(sw.includes('mahjong-score-app-m7-v132'));
  assert(sw.includes('./maki-v111-hand-entry.js'));
  assert(sw.includes('./m7-benchmark-v123.js'));
  assert(sw.includes('manifest.webmanifest?v=m7v132'));
  assert(manifest.includes('v=m7v132'));
});


test('v118 adds manual dora, aka-dora and ura-dora foundation for future camera input',()=>{
  const hand=read('maki-v111-hand-entry.js');
  const m8=read('m8-v22.js');
  assert(hand.includes('ドラ入力'));
  assert(hand.includes('赤ドラ'));
  assert(hand.includes('裏ドラ'));
  assert(hand.includes('window.MAKIV118Dora'));
  assert(hand.includes('applyDoraToRecommendation'));
  assert(hand.includes("kind==='ura'&&!winnerIsRiichi"));
  assert(hand.includes('ドラは役ではありません'));
  assert(m8.includes('m8BaseYakuBreakdownV118'));
  assert(m8.includes('MAKIV118Dora?.applyToRecommendation'));
});


test('v119 wires camera red-dora metadata and dora-indicator camera into v118 dora state',()=>{
  const hand=read('maki-v111-hand-entry.js');
  const camera=read('m7-camera-v36.js');
  assert(hand.includes('MAKI v132'));
  assert(hand.includes('maki-v119-dora-camera'));
  assert(hand.includes('window.MAKIV119DoraCamera'));
  assert(hand.includes('doraTileFromIndicatorRaw'));
  assert(hand.includes('runYoloTileDetectorDiagnostic'));
  assert(hand.includes('applyCameraHandMetaV119'));
  assert(camera.includes('MAKILastCameraHandMetaV119'));
  assert(camera.includes('m7v119RawLabel'));
  assert(camera.includes('M7V119PendingRawLabels'));
  assert(camera.includes("/^0[mps]$/"));
});


test('v120 repairs red-five suit confusion and visual aka metadata',()=>{
  const camera=read('m7-camera-v36.js');
  assert(camera.includes('repairRedFiveRecognition'));
  assert(camera.includes('redFiveContextSuit'));
  assert(camera.includes('redInkShareFromCanvas'));
  assert(camera.includes("r.redRepair=directSuit?'context-suit':'local-majority-suit'"));
  assert(camera.includes("r.redRepair='visual-red'"));
  assert(camera.includes("const groupKey=/^0[mps]$/.test(raw)?(r.label+'|'+raw):r.label"));
});


test('v122 correction picker preserves red-five metadata',()=>{
  const script=read('script.js');
  const ui=read('ui-fixes.js');
  assert(script.includes("RED_TILE_OPTIONS_M7V122"));
  assert(script.includes("{label:'赤5萬',tile:'5萬',raw:'0m'}"));
  assert(script.includes("{label:'赤5筒',tile:'5筒',raw:'0p'}"));
  assert(script.includes("{label:'赤5索',tile:'5索',raw:'0s'}"));
  assert(script.includes("tileButton.dataset.m7v119RawLabel=raw"));
  assert(script.includes("delete tileButton.dataset.m7v119RawLabel"));
  assert(ui.includes("m7v122-red-options"));
  assert(ui.includes("m7v122-red-tile"));
});
