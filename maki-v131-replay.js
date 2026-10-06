// MAKI v131: replay-ready benchmark package, dataset audit and one-tap ChatGPT share.
(()=>{
'use strict';
const VERSION='MAKI v131';
function api(){return window.MAKIV130Benchmark||window.MAKIV129Benchmark||window.MAKIV123Benchmark;}
function tileKey(x){return String(x||'').trim();}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function datasetAudit(rows){
 const seen=new Set(),tileCounts={},red5={m:0,p:0,s:0},hard={ '2萬':0,'4萬':0,'8萬':0};let confirmed=0,crops=0,duplicates=0;
 for(const r of rows||[]){if(r?.phase!=='confirmed'||!r.final)continue;confirmed++;
  const labels=r.final.labels||[],raw=r.final.rawLabels||[],imgs=r.images?.crops||[];
  for(let i=0;i<14;i++){const t=tileKey(labels[i]);if(t){tileCounts[t]=(tileCounts[t]||0)+1;if(t in hard)hard[t]++;}
   if(/^0[mps]$/.test(raw[i]||''))red5[raw[i][1]]++;
   const data=String(imgs.find(x=>Number(x?.index)===i)?.dataUrl||'');if(!data)continue;crops++;
   const k=hash(t+'|'+data.slice(-4096));if(seen.has(k))duplicates++;else seen.add(k);
  }
 }
 return {confirmedCases:confirmed,cropCount:crops,uniqueCropCount:seen.size,duplicateCropCount:duplicates,tileCounts,red5Counts:red5,hardClassCounts:hard};
}
function replayRows(rows){
 const confirmed=(rows||[]).filter(r=>r?.phase==='confirmed'&&r.final);
 const byVersion={};for(const r of confirmed)(byVersion[r.version]||(byVersion[r.version]=[])).push(r);
 const bench=api();const versions=Object.keys(byVersion).sort();
 return {mode:'saved-case-a-b',note:'同一端末に保存されたconfirmed caseを版別に同一指標で比較。rawGuideFrame/crop/ground truthをreplay-ready manifestとして同梱。',versions:versions.map(v=>({version:v,...(bench?.benchmarkMetricsForRows?.(byVersion[v])||{})}))};
}
function replayManifest(rows){return (rows||[]).filter(r=>r?.phase==='confirmed'&&r.final).map(r=>({id:r.id,version:r.version,createdAt:r.createdAt,groundTruth:r.final.labels||[],rawGuideFrame:r.images?.rawGuideFrame||'',crops:r.images?.crops||[],captureQuality:r.initial?.captureQuality||r.initial?.diagnostics?.captureQuality||null,diagnostics:r.initial?.diagnostics||{}}));}
async function buildPackage(){const b=api();if(!b?.listCases)throw new Error('benchmark-api-unavailable');const rows=await b.listCases();return {version:VERSION,exportedAt:Date.now(),summary:b.benchmarkSummaryPayload?.(rows)||null,replay:replayRows(rows),dataset:datasetAudit(rows),manifest:replayManifest(rows)};}
async function sharePackage(){const payload=await buildPackage(),name='MAKI_v131_replay_benchmark.json',json=JSON.stringify(payload),file=new File([json],name,{type:'application/json'});
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'MAKI v131 診断データ'});return payload;}
 const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return payload;
}
function mount(){const root=document.getElementById('hand-result-overlay-m7v5');const bar=root?.querySelector('.maki-v123-benchmark-ui');if(!bar||bar.querySelector('.maki-v131-share'))return;
 const btn=document.createElement('button');btn.type='button';btn.className='maki-v131-share';btn.textContent='ChatGPTに送る';btn.style.cssText='border:1px solid rgba(0,0,0,.18);border-radius:7px;background:#e9fff3;padding:5px 9px;font:900 10px/1.1 inherit;';
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const old=btn.textContent;btn.textContent='共有準備中…';sharePackage().then(()=>btn.textContent='共有しました').catch(()=>btn.textContent='共有できませんでした').finally(()=>setTimeout(()=>btn.textContent=old,1600));});bar.appendChild(btn);
}
if(typeof window!=='undefined'){window.MAKIV131Replay=Object.freeze({VERSION,datasetAudit,replayRows,replayManifest,buildPackage,sharePackage});}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,datasetAudit,replayRows,replayManifest};
if(typeof document!=='undefined'){new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})();