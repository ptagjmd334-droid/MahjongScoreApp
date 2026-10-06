const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8');
const camera=fs.readFileSync(path.join(root,'m7-camera-v36.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'ui-fixes.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('v125 enforces red metadata only on matching red fives',()=>{
  assert(script.includes("const RED_RAW_BY_TILE_M7V125=Object.freeze({'5萬':'0m','5筒':'0p','5索':'0s'})"));
  assert(script.includes('function sanitizeRedTileStateM7V125'));
  assert(script.includes("delete tileButton.dataset.m7v119RawLabel"));
  assert(script.includes("delete tileButton.dataset.m7v122Red"));
  assert(script.includes("tileButton.classList.remove('m7v122-red-tile')"));
  assert(script.includes('window.M7V126ResultPicker=Object.freeze'));
  assert(script.includes('window.M7V125ResultPicker=window.M7V126ResultPicker'));
});

test('v125 manual correction always routes through red-state sanitizer',()=>{
  const start=script.indexOf('function applyTileChoiceM7V122');
  const end=script.indexOf('function openTilePickerM7V5',start);
  const body=script.slice(start,end);
  assert(body.includes('sanitizeRedTileStateM7V125(tileButton)'));
  assert(body.includes('else delete tileButton.dataset.m7v119RawLabel'));
});

test('v125 camera and UI boundaries defensively sanitize stale red state',()=>{
  assert(camera.includes('window.M7V125ResultPicker?.sanitizeRedState?.(b)'));
  assert(ui.includes('window.M7V125ResultPicker?.sanitizeRedState?.(b)'));
});

test('v125 build marker and cache key are current',()=>{
  assert(index.includes('MAKI v135'));
  assert(index.includes('v=m7v135'));
});
