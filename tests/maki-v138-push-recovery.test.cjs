const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('v138 OneSignal service worker has dedicated nested scope',()=>{
 const code=read('maki-v134-push.js');
 assert(code.includes('serviceWorkerPath:WORKER_PATH'));
 assert(code.includes('scope:WORKER_SCOPE'));
 assert(code.includes("WORKER_SCOPE='/MahjongScoreApp/onesignal/'"));
 assert(read('onesignal/OneSignalSDKWorker.js').includes('OneSignalSDK.sw.js'));
 assert(read('sw.js').includes('./onesignal/OneSignalSDKWorker.js'));
});
test('v138 push button handles SDK failure, timeout and explicit retry',()=>{
 const code=read('maki-v134-push.js');
 assert(code.includes('function mount()'));
 assert(code.includes('mount();'));
 assert(code.includes('setTimeout(()=>onFailure'));
 assert(code.includes('通知を再接続'));
 assert(code.includes('if(initError){loadSdk()'));
 assert(code.includes('subscription.optedIn&&subscription.id'));
});
