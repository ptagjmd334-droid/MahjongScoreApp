// MAKI v135: OneSignal Web Push opt-in for the installed PWA.
(()=>{
'use strict';
const VERSION='MAKI v135';
const APP_ID='e83fdccd-24a1-485b-8140-81fbe61f9dda';
const HOME_URL='https://ptagjmd334-droid.github.io/MahjongScoreApp/';
function standalone(){return !!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);}
function loadSdk(){
 if(window.OneSignalDeferred)return;
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 const s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.defer=true;document.head.appendChild(s);
 window.OneSignalDeferred.push(async function(OneSignal){
  await OneSignal.init({appId:APP_ID,serviceWorkerPath:'OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/MahjongScoreApp/'},notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false});
  mount(OneSignal);
 });
}
function mount(OneSignal){
 if(document.getElementById('maki-v134-push'))return;
 const b=document.createElement('button');b.id='maki-v134-push';b.type='button';
 b.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(58px,calc(env(safe-area-inset-bottom) + 58px));z-index:2147483000;border:1px solid rgba(255,255,255,.4);border-radius:999px;background:#123c2b;color:#fff;padding:7px 11px;font:800 11px/1.1 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.25)';
 async function refresh(){try{const p=OneSignal.Notifications.permission;b.textContent=p?'更新通知 ON':'更新通知をON';}catch(_){b.textContent='更新通知をON';}}
 b.addEventListener('click',async()=>{if(!standalone()){alert('iPhoneではホーム画面のMAKIから開いて「更新通知をON」を押してください。');return;}b.disabled=true;try{await OneSignal.Notifications.requestPermission();await OneSignal.User.PushSubscription.optIn();await refresh();}catch(_){b.textContent='通知設定を確認';}finally{b.disabled=false;}});
 document.body.appendChild(b);refresh();
}
if(typeof window!=='undefined'){window.MAKIV134Push=Object.freeze({VERSION,APP_ID,HOME_URL,standalone,loadSdk});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSdk,{once:true});else loadSdk();}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,APP_ID,HOME_URL};
})();