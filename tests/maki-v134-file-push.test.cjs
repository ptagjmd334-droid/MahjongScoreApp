const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('v134 diagnostic direct download',()=>{const s=read('maki-v131-replay.js');assert.match(s,/MAKI v135/);assert.match(s,/MAKI_v135_diagnostic/);assert.match(s,/download=name/);});
test('v134 push integration',()=>{const s=read('maki-v134-push.js');assert.match(s,/e83fdccd-24a1-485b-8140-81fbe61f9dda/);assert.match(s,/MahjongScoreApp/);assert.match(s,/requestPermission/);assert.match(read('index.html'),/maki-v134-push/);});
