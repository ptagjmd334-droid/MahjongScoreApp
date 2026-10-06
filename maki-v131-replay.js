// MAKI v132: compact current-chat clipboard handoff, replay benchmark and dataset audit.
(()=>{
'use strict';
const VERSION='MAKI v132';
function api(){return window.MAKIV131Benchmark||window.MAKIV130Benchmark||window.MAKIV129Benchmark||window.MAKIV123Benchmark;}
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
function compactForChat(payload){
 const manifest=(payload.manifest||[]).map(x=>({id:x.id,version:x.version,createdAt:x.createdAt,groundTruth:x.groundTruth,captureQuality:x.captureQuality,diagnostics:x.diagnostics,crops:(x.crops||[]).map(c=>({index:c.index,hasImage:!!c.dataUrl})),hasRawGuideFrame:!!x.rawGuideFrame}));
 return {type:'MAKI_DIAGNOSTIC_FOR_CURRENT_CHAT',version:VERSION,instruction:'このデータをMAKI開発の診断として解析してください。',exportedAt:payload.exportedAt,summary:payload.summary,replay:payload.replay,dataset:payload.dataset,manifest};
}
async function copyForCurrentChat(){
 const payload=compactForChat(await buildPackage()),text=JSON.stringify(payload);
 if(!navigator.clipboard?.writeText)throw new Error('clipboard-unavailable');
 await navigator.clipboard.writeText(text);return {payload,textLength:text.length};
}
async function sharePackage(){return copyForCurrentChat();}
function mount(){const root=document.getElementById('hand-result-overlay-m7v5');const bar=root?.querySelector('.maki-v123-benchmark-ui');if(!bar||bar.querySelector('.maki-v132-chat-copy'))return;
 const btn=document.createElement('button');btn.type='button';btn.className='maki-v132-chat-copy';btn.textContent='このチャット用コピー';btn.style.cssText='border:1px solid rgba(0,0,0,.18);border-radius:7px;background:#e9fff3;padding:5px 9px;font:900 10px/1.1 inherit;';
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const old=btn.textContent;btn.textContent='コピー中…';copyForCurrentChat().then(()=>btn.textContent='コピー済み→このチャットに貼付').catch(()=>btn.textContent='コピー失敗').finally(()=>setTimeout(()=>btn.textContent=old,2200));});bar.appendChild(btn);
}
if(typeof window!=='undefined'){window.MAKIV132Replay=Object.freeze({VERSION,datasetAudit,replayRows,replayManifest,buildPackage,compactForChat,copyForCurrentChat,sharePackage});window.MAKIV131Replay=window.MAKIV132Replay;}
if(typeof module!=='undefined'&&module.exports)module.exports={VERSION,datasetAudit,replayRows,replayManifest,compactForChat};
if(typeof document!=='undefined'){new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})();