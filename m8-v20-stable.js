// M8 v20 stable: 副露の内訳を入力して開いた手の符を確定する
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M8 v20';
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  const state={mode:null,openTriplets:new Set()};
  let queued=false,lastHandSignature='';

  const style=document.createElement('style');
  style.textContent=`
    #m8v20-open-detail{margin:7px 0 3px;padding:8px 9px;border-radius:11px;background:#fff7df;border:1px solid #dfbf63}
    #m8v20-open-detail .m8v20-title{font-size:12px;font-weight:900;color:#26392f;margin-bottom:5px}
    #m8v20-open-detail .m8v20-help{font-size:10px;font-weight:700;color:#56625d;margin-top:5px;line-height:1.35}
    #m8v20-open-detail .m8v20-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    #m8v20-open-detail button{border:1px solid #c9a64f;background:#fff;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;color:#173129}
    #m8v20-open-detail button.active{border-color:#078cff;background:#e8f4ff;box-shadow:0 0 0 2px rgba(7,140,255,.13)}
    #m8v20-open-detail .m8v20-status{margin-top:6px;padding:5px 7px;border-radius:8px;background:#eef8f1;font-size:11px;font-weight:900;text-align:center;color:#153d29}
    #m8v20-score-fu{margin:4px 0 6px;padding:6px 8px;border-radius:9px;background:#e8f7ee;color:#153d29;font-size:12px;font-weight:900;text-align:center}
    .m8v20-fu-row{outline:2px solid #f0b323!important;outline-offset:-2px!important;background:rgba(240,179,35,.10)!important}
    .m8v20-fu-cell{outline:3px solid #23c878!important;outline-offset:-3px!important;background:rgba(35,200,120,.20)!important}
    .m8v20-auto{display:block;width:100%;margin:3px 0 5px;padding:6px 9px;border:0;border-radius:9px;background:#dff5e8;color:#153d29;font-size:11px;font-weight:900}
  `;document.head.appendChild(style);

  function getTiles(){
    const saved=window.m8HandStateV19||window.m8HandStateV18;
    if(Array.isArray(saved?.tiles)&&saved.tiles.length===14)return saved.tiles.slice();
    const x=[...document.querySelectorAll('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile')].map(b=>b.dataset.tile).filter(Boolean);
    if(x.length===14)return x;
    return Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
  }
  function getWin(){return document.querySelector('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile.active')?.dataset.tile||window.m8HandStateV19?.win||window.m8HandStateV18?.win||window.m8WinningTileV7||null;}
  function resultCtx(){const r=document.getElementById('m8-context-v5'),m=r?.querySelector('[data-menzen].active');return{winner:r?.querySelector('[data-winner].active')?.dataset.winner||null,type:r?.querySelector('[data-type].active')?.dataset.type||null,menzen:m?m.dataset.menzen==='1':null};}
  function scoreCtx(){let winner=null,type=null;try{winner=Array.isArray(agariFlow.winners)?(agariFlow.winners[agariFlow.currentWinnerIndex]||agariFlow.winners[0]||null):null;type=agariFlow.type||null;}catch(_){}const menzen=window.m8HandStateV19?.menzen??window.m8HandStateV18?.menzen??resultCtx().menzen;return{winner,type,menzen};}
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}
  function roundWind(){return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';}

  function decompose(tiles){
    const c=Array(34).fill(0);for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const all=[];
    function take(counts,melds,out){const i=counts.findIndex(n=>n>0);if(i<0){out.push(melds.slice());return;}if(counts[i]>=3){counts[i]-=3;take(counts,[...melds,{type:'triplet',i}],out);counts[i]+=3;}if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;take(counts,[...melds,{type:'sequence',i}],out);counts[i]++;counts[i+1]++;counts[i+2]++;}}
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;const out=[];take(x,[],out);out.forEach(ms=>{if(ms.length===4)all.push({pair:p,melds:ms});});}return all;
  }
  function waitOptions(d,win){const wi=tileIndex.get(win);if(wi==null)return[];const out=[];if(d.pair===wi)out.push({wait:'単騎',target:'pair'});d.melds.forEach((m,mi)=>{if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){const r=m.i%9;let wait='両面';if(wi===m.i+1)wait='嵌張';else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';out.push({wait,target:'sequence',mi});}});return out;}
  function pairFu(i,ctx){const t=tileOrder[i];let n=0;if(['白','發','中'].includes(t))n+=2;if(t===seatWind(ctx.winner))n+=2;if(t===roundWind())n+=2;return n;}
  function tripletFu(i,closed){const t=tileOrder[i],yaochu=honors.has(t)||terminals.has(t);return closed?(yaochu?8:4):(yaochu?4:2);}
  function judge(tiles){return window.judgeMahjongWinM8V4?.(tiles)||null;}
  function tripletCandidates(tiles){const s=new Set();decompose(tiles).forEach(d=>d.melds.filter(m=>m.type==='triplet').forEach(m=>s.add(tileOrder[m.i])));return [...s].sort((a,b)=>(tileIndex.get(a)||0)-(tileIndex.get(b)||0));}

  function exactOpenFu(tiles,win,ctx){
    if(!Array.isArray(tiles)||tiles.length!==14)return{values:[],reason:`手牌${Array.isArray(tiles)?tiles.length:0}枚`};
    const j=judge(tiles);if(!j?.win)return{values:[],reason:'アガリ形として分解できません'};
    if(j.type==='七対子')return{values:[25],reason:'七対子25符固定'};
    if(j.type==='国士無双')return{values:[],reason:'国士無双は符なし',noFu:true};
    if(!win)return{values:[],reason:'和了牌未選択'};
    if(!ctx?.winner||!['ron','tsumo'].includes(ctx.type))return{values:[],reason:'和了者またはロン/ツモ未取得'};
    if(ctx.menzen!==false)return{values:[],reason:'副露手ではありません'};
    if(state.mode===null)return{values:[],reason:'副露の内訳を選択してください'};
    const openIdx=new Set([...state.openTriplets].map(t=>tileIndex.get(t)).filter(i=>i!=null)),vals=new Set();let used=0;
    for(const d of decompose(tiles)){
      const tripIndices=new Set(d.melds.filter(m=>m.type==='triplet').map(m=>m.i));if([...openIdx].some(i=>!tripIndices.has(i)))continue;
      for(const opt of waitOptions(d,win)){
        used++;const pf=pairFu(d.pair,ctx),wf=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;let total=20+(ctx.type==='tsumo'?2:0)+pf+wf;
        d.melds.forEach((m,mi)=>{if(m.type!=='triplet')return;const selectedOpen=openIdx.has(m.i),ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;total+=tripletFu(m.i,!(selectedOpen||ronOpened));});
        vals.add(Math.max(30,Math.ceil(total/10)*10));
      }
    }
    const values=[...vals].sort((a,b)=>a-b);return values.length?{values,reason:`副露内訳反映・${used}通り評価`}:{values:[],reason:'選択したポンと両立する面子分解がありません'};
  }

  function resetForNewHand(){const sig=getTiles().join('|');if(sig&&lastHandSignature&&sig!==lastHandSignature){state.mode=null;state.openTriplets.clear();window.m8OpenModeV20=null;window.m8OpenTripletsV20=[];}if(sig)lastHandSignature=sig;}
  function setMenzen(m){for(const k of ['m8HandStateV18','m8HandStateV19'])if(window[k])window[k]={...window[k],menzen:m};}

  function renderOpenDetail(){
    resetForNewHand();const root=document.getElementById('m8-context-v5');if(!root)return;const ctx=resultCtx();let box=document.getElementById('m8v20-open-detail');
    if(ctx.menzen!==false){box?.remove();if(ctx.menzen===true){state.mode=null;state.openTriplets.clear();window.m8OpenModeV20=null;window.m8OpenTripletsV20=[];}return;}
    const tiles=getTiles(),j=judge(tiles);if(!box){box=document.createElement('div');box.id='m8v20-open-detail';root.querySelector('.m8v5-extra')?.before(box);}
    if(!j?.win){if(box.dataset.view!=='nohand'){box.dataset.view='nohand';box.innerHTML='<div class="m8v20-title">副露の内訳（符計算用）</div><div class="m8v20-status">手牌を取得すると候補を表示します</div>';}return;}
    if(j.type==='七対子'||j.type==='国士無双'){const v=`invalid-${j.type}`;if(box.dataset.view!==v){box.dataset.view=v;box.innerHTML=`<div class="m8v20-title">副露の内訳（符計算用）</div><div class="m8v20-status">${j.type}は副露できない形です</div>`;}return;}
    const candidates=tripletCandidates(tiles),view=`${tiles.join(',')}|${candidates.join(',')}|${state.mode}|${[...state.openTriplets].sort().join(',')}`;
    if(box.dataset.view!==view){
      box.dataset.view=view;box.innerHTML=`<div class="m8v20-title">副露の内訳（符計算用）</div><div class="m8v20-row"><button type="button" data-open-mode="chi-only">チーのみ / 鳴いた刻子なし</button>${candidates.map(t=>`<button type="button" data-open-triplet="${t}">${t}ポン</button>`).join('')}</div><div class="m8v20-help">ポンした刻子だけ選択（複数可）。チーは符が付かないので「チーのみ」で十分です。※カンは14枚入力では物理牌数が増えるため次段階で対応。</div><div class="m8v20-status"></div>`;
    }
    box.querySelector('[data-open-mode="chi-only"]')?.classList.toggle('active',state.mode==='chi-only');box.querySelectorAll('[data-open-triplet]').forEach(b=>b.classList.toggle('active',state.openTriplets.has(b.dataset.openTriplet)));
    const st=box.querySelector('.m8v20-status');if(!st)return;const r=exactOpenFu(tiles,getWin(),ctx);if(r.noFu)st.textContent='符計算なし';else if(r.values.length===1)st.textContent=`副露符：${r.values[0]}符（${r.reason}）`;else if(r.values.length>1)st.textContent=`副露符候補：${r.values.join('・')}符（${r.reason}）`;else st.textContent=state.mode===null?'副露の内訳を選択してください':`副露符：${r.reason}`;
  }

  function getHan(){const v=[window.m8SuggestedHanV9,window.m8SuggestedHanV6].find(x=>Number.isFinite(Number(x)));return v==null?0:Number(v);}
  function findCell(fu,han){const root=overlay.querySelector('.score-switch-table');if(!root)return null;for(const table of root.querySelectorAll('table')){const rows=[...table.querySelectorAll('tr')],row=rows.find(r=>[...r.children].some(c=>c.textContent.replace(/\s/g,'')===`${fu}符`));if(!row)continue;const h=rows.find(r=>[...r.children].some(c=>c.textContent.trim()===`${han}翻`)),idx=h?[...h.children].findIndex(c=>c.textContent.trim()===`${han}翻`):-1;return{row,cell:idx>=0?row.children[idx]:null};}return null;}
  function decorate(fu){overlay.querySelectorAll('.m8v20-fu-row,.m8v20-fu-cell').forEach(x=>x.classList.remove('m8v20-fu-row','m8v20-fu-cell'));overlay.querySelector('.m8v20-auto')?.remove();const han=getHan(),f=findCell(fu,han);if(!f)return;[...f.row.children].forEach(c=>c.classList.add('m8v20-fu-row'));if(f.cell){f.cell.classList.add('m8v20-fu-cell');const target=f.cell.querySelector('.score-cell,button')||f.cell,auto=document.createElement('button');auto.type='button';auto.className='m8v20-auto';auto.textContent=`M8推奨 ${fu}符${han?`${han}翻`:''}を入力`;auto.onclick=e=>{e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));};overlay.querySelector('.score-switch-table')?.insertAdjacentElement('beforebegin',auto);}}
  function renderScore(){
    if(!overlay.querySelector('.score-switch-table'))return;const ctx=scoreCtx();if(ctx.menzen!==false)return;const r=exactOpenFu(getTiles(),getWin(),ctx);let box=document.getElementById('m8v20-score-fu');if(!box){box=document.createElement('div');box.id='m8v20-score-fu';overlay.querySelector('.score-switch-table')?.insertAdjacentElement('beforebegin',box);}const old=document.getElementById('m8v18-score-fu');if(old)old.style.setProperty('display','none','important');
    if(r.noFu){box.textContent='M8副露符：符計算なし';return;}if(r.values.length===1){const fu=r.values[0];window.m8SuggestedFuV20=fu;window.m8SuggestedFuV18=fu;window.m8SuggestedFuV8=fu;box.textContent=`M8副露符：${fu}符（${r.reason}）`;decorate(fu);return;}if(r.values.length>1){box.textContent=`M8副露符候補：${r.values.join('・')}符（${r.reason}）`;return;}box.textContent=`M8副露符：${r.reason}`;
  }

  document.addEventListener('click',e=>{
    const mode=e.target.closest?.('[data-open-mode="chi-only"]'),tri=e.target.closest?.('[data-open-triplet]');
    if(mode){state.mode='chi-only';state.openTriplets.clear();window.m8OpenModeV20=state.mode;window.m8OpenTripletsV20=[];e.preventDefault();e.stopPropagation();queue();return;}
    if(tri){const t=tri.dataset.openTriplet;state.mode='triplets';if(state.openTriplets.has(t))state.openTriplets.delete(t);else state.openTriplets.add(t);if(!state.openTriplets.size)state.mode=null;window.m8OpenModeV20=state.mode;window.m8OpenTripletsV20=[...state.openTriplets];e.preventDefault();e.stopPropagation();queue();return;}
    if(e.target.closest?.('#m8-context-v5 [data-menzen]'))setTimeout(()=>{setMenzen(resultCtx().menzen);queue();},0);else setTimeout(queue,0);
  },true);

  function refresh(){queued=false;renderOpenDetail();renderScore();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(refresh);}

  // DOM監視はしない。v15で起きた自己更新→MutationObserver再発火のループを避け、ユーザー操作の直後だけ更新する。
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,queue,{passive:true}));
  setTimeout(queue,0);setTimeout(queue,250);

  function selfTest(){const tiles=['1萬','1萬','1萬','2萬','3萬','4萬','4萬','5萬','6萬','7筒','8筒','9筒','5索','5索'],ctx={winner:'bottom',type:'tsumo',menzen:false};state.mode='triplets';state.openTriplets=new Set(['1萬']);const a=exactOpenFu(tiles,'5索',ctx).values;state.mode='chi-only';state.openTriplets.clear();const b=exactOpenFu(tiles,'5索',ctx).values;state.mode=null;state.openTriplets.clear();window.m8V20SelfTest={openPon:a,chiOnly:b,pass:a.includes(30)&&b.includes(40)};}
  selfTest();
})();