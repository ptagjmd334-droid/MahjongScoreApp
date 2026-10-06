// MAKI v133: detect a newly deployed build when the app is opened/resumed.
(()=>{
'use strict';
const VERSION='MAKI v133',CHECK_URL='./version.json',KEY='maki-last-notified-version';
function numberOf(v){const m=String(v||'').match(/v(\d+)/i);return m?Number(m[1]):0;}
function show(version){
 if(document.getElementById('maki-update-notice-v133'))return;
 const el=document.createElement('div');el.id='maki-update-notice-v133';el.setAttribute('role','status');
 el.style.cssText='position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:2147483646;background:#e9fff3;color:#123c2b;border:2px solid #1cbe72;border-radius:12px;padding:9px 14px;font:900 13px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28);';
 el.textContent=version+' に更新されました';document.body.appendChild(el);setTimeout(()=>el.remove(),7000);
 try{localStorage.setItem(KEY,version);}catch(_){}
}
async function check(){
 try{const r=await fetch(CHECK_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)return false;const x=await r.json(),latest=String(x.version||'');if(numberOf(latest)>numberOf(VERSION)){location.reload();return true;}
 const last=localStorage.getItem(KEY)||'';if(latest===VERSION&&last!==VERSION){show(VERSION);return true;}return false;}catch(_){return false;}
}
if(typeof window!=='undefined')window.MAKIV133Update=Object.freeze({VERSION,numberOf,check});
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});window.addEventListener('pageshow',check);}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,numberOf};
})();