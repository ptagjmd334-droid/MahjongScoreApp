// MAKI v137: OneSignal Web Push opt-in for the installed PWA.
(()=>{
'use strict';
const VERSION='MAKI v136';
const APP_ID='e83fdccd-24a1-485b-8140-81fbe61f9dda';
let sdkReady=null;
const HOME_URL='https://ptagjmd334-droid.github.io/MahjongScoreApp/';
function standalone(){return !!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);}
function loadSdk(){
 mount();
 if(window.OneSignalDeferred)return;
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 const s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.defer=true;document.head.appendChild(s);
 window.OneSignalDeferred.push(async function(OneSignal){
  try { await OneSignal.init({appId:APP_ID,serviceWorkerPath:'OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/MahjongScoreApp/'},notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false}); sdkReady=OneSignal; await refresh(); }
  catch(error){ const b=document.getElementById('maki-v134-push'); if(b){b.textContent='通知設定を確認';b.title=String(error);} console.warn('MAKI push init failed',error); }
 });
}
async function refresh(){const b=document.getElementById('maki-v134-push');if(!b)return;try{const p=sdkReady?.Notifications.permission;const subscribed=sdkReady?.User.PushSubscription.optedIn;b.textContent=p&&subscribed?'更新通知 ON':p?'通知登録を確認':'更新通知をON';}catch(_){b.textContent='通知設定を確認';}}
function mount(){
 if(document.getElementById('maki-v134-push'))return;
 const b=document.createElement('button');b.id='maki-v134-push';b.type='button';
 b.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483000;border:1px solid rgba(255,255,255,.4);border-radius:999px;background:#123c2b;color:#fff;padding:7px 11px;font:800 11px/1.1 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.25)';
 b.addEventListener('click',async()=>{if(!standalone()){alert('iPhoneではホーム画面のMAKIから開いて「更新通知をON」を押してください。');return;}b.disabled=true;try{if(!sdkReady){b.textContent='通知の準備中';return;}await sdkReady.Notifications.requestPermission();await sdkReady.User.PushSubscription.optIn();await refresh();}catch(error){b.textContent='通知設定を確認';console.warn('MAKI push subscription failed',error);}finally{b.disabled=false;}});
 document.body.appendChild(b);refresh();
}
if(typeof window!=='undefined'){window.MAKIV134Push=Object.freeze({VERSION,APP_ID,HOME_URL,standalone,loadSdk});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSdk,{once:true});else loadSdk();}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,APP_ID,HOME_URL};
})();