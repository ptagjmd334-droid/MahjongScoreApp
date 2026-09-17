// M8 v21: カン符対応 + 古い符候補表示を整理
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M8 v21';

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  const meldState=new Map(); // tile -> pon | minkan | ankan
  let chiOnly=false,lastSig='',queued=false;

  const style=document.createElement('style');
  style.textContent=`
    #m8v21-meld-detail{margin:7px 0 3px;padding:8px 9px;border-radius:11px;background:#fff7df;border:1px solid #dfbf63}
    #m8v21-meld-detail .ttl{font-size:12px;font-weight:900;color:#26392f;margin-bottom:5px}
    #m8v21-meld-detail .help{font-size:10px;font-weight:700;color:#56625d;margin-top:6px;line-height:1.35}
    #m8v21-meld-detail .toprow{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    #m8v21-meld-detail .meldrow{display:grid;grid-template-columns:50px repeat(4,minmax(0,1fr));gap:5px;align-items:center;margin:4px 0}
    #m8v21-meld-detail .name{font-size:11px;font-weight:900;text-align:center}
    #m8v21-meld-detail button{border:1px solid #c9a64f;background:#fff;border-radius:999px;padding:6px 7px;font-size:10px;font-weight:900;color:#173129;min-height:31px}
    #m8v21-meld-detail button.active{border-color:#078cff;background:#e8f4ff;box-shadow:0 0 0 2px rgba(7,140,255,.13)}
    #m8v21-meld-detail .status{margin-top:6px;padding:5px 7px;border-radius:8px;background:#eef8f1;font-size:11px;font-weight:900;text-align:center;color:#153d29}
    #m8v21-score-fu{margin:4px 0 6px;padding:6px 8px;border-radius:9px;background:#e8f7ee;color:#153d29;font-size:12px;font-weight:900;text-align:center}
    .m8v21-fu-row{outline:2px solid #f0b323!important;outline-offset:-2px!important;background:rgba(240,179,35,.10)!important}
    .m8v21-fu-cell{outline:3px solid #23c878!important;outline-offset:-3px!important;background:rgba(35,200,120,.20)!important}
    .m8v21-auto{display:block;width:100%;margin:3px 0 5px;padding:6px 9px;border:0;border-radius:9px;background:#dff5e8;color:#153d29;font-size:11px;font-weight:900}
    #m8v20-open-detail.m8v21-hidden-old,#m8v18-result-fu.m8v21-hidden-old,#m8v20-score-fu.m8v21-hidden-old,#m8v18-score-fu.m8v21-hidden-old{display:none!important}
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
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;const out=[];take(x,[],out);out.forEach(ms=>{if(ms.length===4)all.push({pair:p,melds:ms});});}
    return all;
  }
  function waitOptions(d,win){const wi=tileIndex.get(win);if(wi==null)return[];const out=[];if(d.pair===wi)out.push({wait:'単騎',target:'pair'});d.melds.forEach((m,mi)=>{if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){const r=m.i%9;let wait='両面';if(wi===m.i+1)wait='嵌張';else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';out.push({wait,target:'sequence',mi});}});return out;}
  function pairFu(i,ctx){const t=tileOrder[i];let n=0;if(['白','發','中'].includes(t))n+=2;if(t===seatWind(ctx.winner))n+=2;if(t===roundWind())n+=2;return n;}
  function isYaochu(i){const t=tileOrder[i];return honors.has(t)||terminals.has(t);}
  function tripletFu(i,closed){return closed?(isYaochu(i)?8:4):(isYaochu(i)?4:2);}
  function kanFu(i,closed){return closed?(isYaochu(i)?32:16):(isYaochu(i)?16:8);}
  function judge(tiles){return window.judgeMahjongWinM8V4?.(tiles)||null;}
  function tripletCandidates(tiles){const s=new Set();decompose(tiles).forEach(d=>d.melds.filter(m=>m.type==='triplet').forEach(m=>s.add(tileOrder[m.i])));return [...s].sort((a,b)=>(tileIndex.get(a)||0)-(tileIndex.get(b)||0));}

  function calculate(tiles,win,ctx){
    if(!Array.isArray(tiles)||tiles.length!==14)return{values:[],reason:`手牌${Array.isArray(tiles)?tiles.length:0}枚`};
    const j=judge(tiles);if(!j?.win)return{values:[],reason:'アガリ形として分解できません'};
    if(j.type==='七対子')return{values:[25],reason:'七対子25符固定'};
    if(j.type==='国士無双')return{values:[],reason:'国士無双は符なし',noFu:true};
    if(!win)return{values:[],reason:'和了牌未選択'};
    if(!ctx?.winner||!['ron','tsumo'].includes(ctx.type))return{values:[],reason:'和了者またはロン/ツモ未取得'};
    if(ctx.menzen==null)return{values:[],reason:'門前/副露未取得'};
    if(ctx.menzen===false&&!chiOnly&&meldState.size===0)return{values:[],reason:'副露の内訳を選択してください'};
    if(ctx.menzen===true&&[...meldState.values()].some(v=>v==='pon'||v==='minkan'))return{values:[],reason:'門前ではポン・明カンを選べません'};

    const marked=new Map([...meldState].map(([t,v])=>[tileIndex.get(t),v]));
    const vals=new Set();let used=0;
    for(const d of decompose(tiles)){
      const tripIndices=new Set(d.melds.filter(m=>m.type==='triplet').map(m=>m.i));
      if([...marked.keys()].some(i=>i==null||!tripIndices.has(i)))continue;
      for(const opt of waitOptions(d,win)){
        used++;
        const pf=pairFu(d.pair,ctx),wf=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfuShape=ctx.menzen&&allSeq&&pf===0&&opt.wait==='両面'&&marked.size===0;
        if(pinfuShape&&ctx.type==='tsumo'){vals.add(20);continue;}
        let total=20+(ctx.menzen&&ctx.type==='ron'?10:0)+(ctx.type==='tsumo'?2:0)+pf+wf;
        d.melds.forEach((m,mi)=>{
          if(m.type!=='triplet')return;
          const st=marked.get(m.i)||null;
          if(st==='pon'){total+=tripletFu(m.i,false);return;}
          if(st==='minkan'){total+=kanFu(m.i,false);return;}
          if(st==='ankan'){total+=kanFu(m.i,true);return;}
          const ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
          total+=tripletFu(m.i,!ronOpened);
        });
        vals.add(ctx.menzen?Math.ceil(total/10)*10:Math.max(30,Math.ceil(total/10)*10));
      }
    }
    const values=[...vals].sort((a,b)=>a-b);return values.length?{values,reason:`副露/槓子内訳反映・${used}通り評価`}:{values:[],reason:'選択した面子内訳と両立する分解がありません'};
  }

  function resetIfNewHand(){const sig=getTiles().join('|');if(sig&&lastSig&&sig!==lastSig){meldState.clear();chiOnly=false;}if(sig)lastSig=sig;}
  function persist(){window.m8MeldStateV21=Object.fromEntries(meldState);window.m8ChiOnlyV21=chiOnly;}

  function renderDetail(){
    resetIfNewHand();
    const root=document.getElementById('m8-context-v5');if(!root)return;
    const ctx=resultCtx(),tiles=getTiles(),j=judge(tiles),cands=tripletCandidates(tiles);
    document.getElementById('m8v20-open-detail')?.classList.add('m8v21-hidden-old');
    let box=document.getElementById('m8v21-meld-detail');
    const needs=!!j?.win&&(ctx.menzen===false||cands.length>0);
    if(!needs){box?.remove();document.getElementById('m8v18-result-fu')?.classList.remove('m8v21-hidden-old');return;}
    if(!box){box=document.createElement('div');box.id='m8v21-meld-detail';root.querySelector('.m8v5-extra')?.before(box);}
    const old=document.getElementById('m8v18-result-fu');if(old)old.classList.add('m8v21-hidden-old');
    const rows=cands.map(t=>{
      const st=meldState.get(t)||'';
      const disabledOpen=ctx.menzen===true?' disabled':'';
      return `<div class="meldrow"><div class="name">${t}</div><button data-meld="${t}" data-kind="none" class="${st?'':'active'}">通常</button><button data-meld="${t}" data-kind="pon" class="${st==='pon'?'active':''}"${disabledOpen}>ポン</button><button data-meld="${t}" data-kind="minkan" class="${st==='minkan'?'active':''}"${disabledOpen}>明カン</button><button data-meld="${t}" data-kind="ankan" class="${st==='ankan'?'active':''}">暗カン</button></div>`;
    }).join('');
    box.innerHTML=`<div class="ttl">面子の内訳（符計算用）</div>${ctx.menzen===false?`<div class="toprow"><button data-chi-only class="${chiOnly?'active':''}">チーのみ / 鳴いた刻子なし</button></div>`:''}${rows||'<div class="status">刻子候補なし</div>'}<div class="help">カンは「14枚の論理手牌では刻子として入力し、ここで明カン/暗カンを指定」して符を加算します。暗カンだけなら門前扱いのままです。</div><div class="status" id="m8v21-result-status"></div>`;
    const st=box.querySelector('#m8v21-result-status');const r=calculate(tiles,getWin(),ctx);
    if(r.noFu)st.textContent='符計算なし';else if(r.values.length===1)st.textContent=`M8符：${r.values[0]}符（${r.reason}）`;else if(r.values.length>1)st.textContent=`M8符候補：${r.values.join('・')}符（${r.reason}）`;else st.textContent=`M8符：${r.reason}`;
  }

  function getHan(){const v=[window.m8SuggestedHanV9,window.m8SuggestedHanV6].find(x=>Number.isFinite(Number(x)));return v==null?0:Number(v);}
  function findCell(fu,han){const root=overlay.querySelector('.score-switch-table');if(!root)return null;for(const table of root.querySelectorAll('table')){const rows=[...table.querySelectorAll('tr')],row=rows.find(r=>[...r.children].some(c=>c.textContent.replace(/\s/g,'')===`${fu}符`));if(!row)continue;const h=rows.find(r=>[...r.children].some(c=>c.textContent.trim()===`${han}翻`)),idx=h?[...h.children].findIndex(c=>c.textContent.trim()===`${han}翻`):-1;return{row,cell:idx>=0?row.children[idx]:null};}return null;}
  function decorate(fu){overlay.querySelectorAll('.m8v21-fu-row,.m8v21-fu-cell').forEach(x=>x.classList.remove('m8v21-fu-row','m8v21-fu-cell'));overlay.querySelector('.m8v21-auto')?.remove();const han=getHan(),f=findCell(fu,han);if(!f)return;[...f.row.children].forEach(c=>c.classList.add('m8v21-fu-row'));if(f.cell){f.cell.classList.add('m8v21-fu-cell');const target=f.cell.querySelector('.score-cell,button')||f.cell,auto=document.createElement('button');auto.type='button';auto.className='m8v21-auto';auto.textContent=`M8推奨 ${fu}符${han?`${han}翻`:''}を入力`;auto.onclick=e=>{e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));};overlay.querySelector('.score-switch-table')?.insertAdjacentElement('beforebegin',auto);}}

  function renderScore(){
    if(!overlay.querySelector('.score-switch-table'))return;
    document.getElementById('m8v20-score-fu')?.classList.add('m8v21-hidden-old');document.getElementById('m8v18-score-fu')?.classList.add('m8v21-hidden-old');
    const ctx=scoreCtx(),r=calculate(getTiles(),getWin(),ctx);let box=document.getElementById('m8v21-score-fu');
    if(!box){box=document.createElement('div');box.id='m8v21-score-fu';overlay.querySelector('.score-switch-table')?.insertAdjacentElement('beforebegin',box);}
    if(r.noFu){box.textContent='M8符判定：国士無双は符計算なし';return;}
    if(r.values.length===1){const fu=r.values[0];window.m8SuggestedFuV21=fu;window.m8SuggestedFuV20=fu;window.m8SuggestedFuV18=fu;window.m8SuggestedFuV8=fu;box.textContent=`M8符判定：${fu}符（${r.reason}）`;decorate(fu);return;}
    if(r.values.length>1){box.textContent=`M8符候補：${r.values.join('・')}符（${r.reason}）`;return;}
    box.textContent=`M8符判定できず：${r.reason}`;
  }

  document.addEventListener('click',e=>{
    const chi=e.target.closest?.('[data-chi-only]'),b=e.target.closest?.('[data-meld][data-kind]');
    if(chi){chiOnly=!chiOnly;if(chiOnly)meldState.clear();persist();e.preventDefault();e.stopPropagation();queue();return;}
    if(b){const t=b.dataset.meld,k=b.dataset.kind;chiOnly=false;if(k==='none')meldState.delete(t);else meldState.set(t,k);persist();e.preventDefault();e.stopPropagation();queue();return;}
    setTimeout(queue,0);
  },true);

  function refresh(){queued=false;renderDetail();renderScore();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(refresh);}
  queue();
})();