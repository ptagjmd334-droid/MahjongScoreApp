// MAKI v138: reliable OneSignal Web Push opt-in for the installed PWA.
(()=>{
'use strict';
const VERSION='MAKI v138';
const APP_ID='e83fdccd-24a1-485b-8140-81fbe61f9dda';
const HOME_URL='https://ptagjmd334-droid.github.io/MahjongScoreApp/';
const WORKER_PATH='onesignal/OneSignalSDKWorker.js';
const WORKER_SCOPE='/MahjongScoreApp/onesignal/';
let sdkReady=null;
let initError=null;
let loading=false;
let initTimer=null;
function standalone(){return !!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);}
function button(){return document.getElementById('maki-v134-push');}
function status(message){const b=button();if(b)b.textContent=message;}
async function refresh(){
 const b=button();if(!b)return;
 if(initError){status('通知を再接続');b.title=String(initError);return;}
 if(!sdkReady){status('通知を準備中');return;}
 try{
  const permitted=sdkReady.Notifications.permission;
  const subscription=sdkReady.User.PushSubscription;
  status(permitted&&subscription.optedIn&&subscription.id?'更新通知 ON':permitted?'通知登録を確認':'更新通知をON');
 }catch(error){status('通知登録を確認');console.warn('MAKI push state',error);}
}
function loadSdk(){
 mount();
 if(sdkReady||loading)return;
 loading=true;initError=null;refresh();
 const onFailure=error=>{
  if(sdkReady)return;
  initError=error||new Error('OneSignal initialization timed out');
  loading=false;
  clearTimeout(initTimer);
  console.warn('MAKI push init failed',initError);
  refresh();
 };
 initTimer=setTimeout(()=>onFailure(new Error('OneSignal SDK did not become ready within 15 seconds')),15000);
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 window.OneSignalDeferred.push(async function(OneSignal){
  try{
   await OneSignal.init({appId:APP_ID,serviceWorkerPath:WORKER_PATH,serviceWorkerParam:{scope:WORKER_SCOPE},notifyButton:{enable:false},allowLocalhostAsSecureOrigin:false});
   sdkReady=OneSignal;initError=null;loading=false;clearTimeout(initTimer);
   OneSignal.User.PushSubscription.addEventListener('change',refresh);
   refresh();
  }catch(error){onFailure(error);}
 });
 if(!document.querySelector('script[data-maki-onesignal]')){
  const script=document.createElement('script');
  script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
  script.async=true;
  script.dataset.makiOnesignal='1';
  script.onerror=()=>onFailure(new Error('OneSignal SDK network load failed'));
  document.head.appendChild(script);
 }
}
function mount(){
 if(button())return;
 const b=document.createElement('button');b.id='maki-v134-push';b.type='button';
 b.style.cssText='position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483000;border:1px solid rgba(255,255,255,.4);border-radius:999px;background:#123c2b;color:#fff;padding:7px 11px;font:800 11px/1.1 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,.25)';
 b.addEventListener('click',async()=>{
  if(!standalone()){alert('iPhoneではホーム画面のMAKIから開いて「更新通知をON」を押してください。');return;}
  if(!sdkReady){
   if(initError){loadSdk();status('通知を再接続中');}
   else status('通知を準備中');
   return;
  }
  b.disabled=true;
  try{
   await sdkReady.Notifications.requestPermission();
   if(!sdkReady.Notifications.permission){status('通知が許可されていません');return;}
   await sdkReady.User.PushSubscription.optIn();
   await refresh();
  }catch(error){status('通知登録を確認');b.title=String(error);console.warn('MAKI push subscription failed',error);}
  finally{b.disabled=false;}
 });
 document.body.appendChild(b);
 refresh();
}
if(typeof window!=='undefined'){window.MAKIV134Push=Object.freeze({VERSION,APP_ID,HOME_URL,WORKER_PATH,WORKER_SCOPE,standalone,loadSdk});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSdk,{once:true});else loadSdk();}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,APP_ID,HOME_URL,WORKER_PATH,WORKER_SCOPE};
})();
