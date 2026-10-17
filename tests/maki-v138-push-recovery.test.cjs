const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
test('v138 OneSignal service worker has dedicated nested scope',()=>{
 const code=read('maki-v134-push.js');
 assert.match(code,/serviceWorkerPath:WORKER_PATH/);
 assert.match(code,/scope:WORKER_SCOPE/);
 assert.match(code,/WORKER_SCOPE='\\/MahjongScoreApp\\/onesignal\\/'/);
 assert.match(read('onesignal/OneSignalSDKWorker.js'),/OneSignalSDK\\.sw\\.js/);
 assert.match(read('sw.js'),/onesignal\\/OneSignalSDKWorker\\.js/);
});
test('v138 push button handles SDK failure, timeout and explicit retry',()=>{
 const code=read('maki-v134-push.js');
 assert.match(code,/function mount\\(\\)/);
 assert.match(code,/mount\\(\\);/);
 assert.match(code,/setTimeout\\(\\(\\)=>onFailure/);
 assert.match(code,/通知を再接続/);
 assert.match(code,/if\\(initError\\)\\{loadSdk\\(\\)/);
 assert.match(code,/PushSubscription\\.optedIn&&subscription\\.id/);
});
