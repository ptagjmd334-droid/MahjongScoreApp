const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const m8=fs.readFileSync(path.join(root,'m8-v3.js'),'utf8');
const script=fs.readFileSync(path.join(root,'script.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('v126 continuous owner intercepts both normal and red-five picker buttons',()=>{
  assert(m8.includes('#tile-picker-m7v5 .tile-picker-grid-m7v5 button,#tile-picker-m7v5 .m7v122-red-options button'));
  assert(m8.includes('function applyContinuousChoiceM8V32'));
  assert(m8.includes('window.M7V126ResultPicker||window.M7V125ResultPicker||window.M7V122ResultPicker'));
  assert(m8.includes("const RED_TILE_BY_RAW_M8V32=Object.freeze({'0m':'5萬','0p':'5筒','0s':'5索'})"));
});

test('v126 continuous owner applies red metadata to current slot via the canonical picker API',()=>{
  assert(m8.includes("pickerApi.applyChoice(target,choice.label,choice.tile,choice.raw)"));
  assert(m8.includes('if(current<13)current++'));
  assert(script.includes('window.M7V126ResultPicker=Object.freeze'));
  assert(script.includes('window.M7V125ResultPicker=window.M7V126ResultPicker'));
});

test('v126 build marker and cache key are current',()=>{
  assert(index.includes('MAKI v131'));
  assert(index.includes('v=m7v131'));
});
