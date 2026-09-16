// M8 v13: 符候補を確実に算出 + 起家マーク右下 + 点数入力フッター固定
(() => {
  const overlay = document.getElementById('agari-overlay');
  if (!overlay) return;

  const badge = document.getElementById('app-build-badge');
  if (badge) badge.textContent = 'M8 v13';

  const style = document.createElement('style');
  style.textContent = `
    /* 起家マークは各プレイヤーから見た右下。親/和了/放銃マークとは別位置にする */
    .player-panel .starting-dealer-badge-v1{
      top:auto!important;
      left:auto!important;
      right:-11px!important;
      bottom:-11px!important;
      width:36px!important;
      height:28px!important;
      line-height:28px!important;
      border-radius:8px!important;
      font-size:16px!important;
      font-weight:900!important;
      z-index:35!important;
      background:linear-gradient(135deg,#ffb42e,#f07c00)!important;
      border:2px solid rgba(255,255,255,.96)!important;
      box-shadow:0 5px 12px rgba(0,0,0,.28)!important;
    }

    /* 点数表は、上=タイトル / 中=スクロール / 下=操作ボタン の3段固定 */
    @media (orientation:landscape){
      body>#agari-overlay.m8v13-score .agari-flow-card{
        display:grid!important;
        grid-template-rows:auto minmax(0,1fr) auto!important;
        height:var(--m8v11-card-max,520px)!important;
        max-height:var(--m8v11-card-max,520px)!important;
        overflow:hidden!important;
        padding:4px 7px 5px!important;
      }
      body>#agari-overlay.m8v13-score .agari-flow-top{
        position:relative!important;
        top:auto!important;
        z-index:30!important;
        margin:0 0 3px!important;
        background:#062f26!important;
      }
      body>#agari-overlay.m8v13-score .agari-flow-content{
        min-height:0!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        padding-bottom:5px!important;
      }
      body>#agari-overlay.m8v13-score .agari-flow-card>.agari-flow-actions{
        position:relative!important;
        inset:auto!important;
        z-index:40!important;
        flex:0 0 auto!important;
        margin:4px 0 0!important;
        padding:4px 0 max(2px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;
        box-shadow:0 -7px 13px rgba(6,47,38,.92)!important;
      }
    }

    #m8-fu-start-v7 .m8v13-fu-detail{
      font-weight:900;
      color:#153d29;
    }
  `;
  document.head.appendChild(style);

  // ---------- ① 符候補をv13側で確実に計算 ----------
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);

  function resultRoot(){ return document.getElementById('m8-result-v1'); }
  function getTiles(){
    const a=Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8:[];
    return a.length===14?a.slice():[];
  }
  function seatWind(pos){ return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':''; }
  function roundWind(){
    try{ if(typeof gameState!=='undefined'&&gameState.roundWind) return gameState.roundWind; }catch(_){ }
    return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';
  }
  function context(){
    const root=document.getElementById('m8-context-v5');
    let winner=root?.querySelector('[data-winner].active')?.dataset.winner||null;
    let type=root?.querySelector('[data-type].active')?.dataset.type||null;
    const m=root?.querySelector('[data-menzen].active');
    let menzen=m?m.dataset.menzen==='1':null;
    try{
      if(!winner&&typeof agariFlow!=='undefined'&&Array.isArray(agariFlow.winners)&&agariFlow.winners.length===1) winner=agariFlow.winners[0];
      if(!type&&typeof agariFlow!=='undefined'&&(agariFlow.type==='ron'||agariFlow.type==='tsumo')) type=agariFlow.type;
    }catch(_){ }
    if(menzen===null && root) menzen=true;
    return {winner,type,menzen};
  }

  function decompositions(tiles){
    const c=Array(34).fill(0);
    for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const result=[];
    function melds(counts,arr,out){
      const i=counts.findIndex(n=>n>0);
      if(i<0){out.push(arr.slice());return;}
      if(counts[i]>=3){counts[i]-=3;melds(counts,[...arr,{type:'triplet',i}],out);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){
        counts[i]--;counts[i+1]--;counts[i+2]--;
        melds(counts,[...arr,{type:'sequence',i}],out);
        counts[i]++;counts[i+1]++;counts[i+2]++;
      }
    }
    for(let p=0;p<34;p++) if(c[p]>=2){
      const x=c.slice();x[p]-=2;const out=[];melds(x,[],out);
      out.forEach(ms=>{if(ms.length===4)result.push({pair:p,melds:ms});});
    }
    return result;
  }

  function valuePairFu(pairIndex,ctx){
    const t=tileOrder[pairIndex];let fu=0;
    if(['白','發','中'].includes(t))fu+=2;
    const sw=seatWind(ctx.winner),rw=roundWind();
    if(t===sw)fu+=2;
    if(t===rw)fu+=2;
    return fu;
  }
  function waitOptions(d,win){
    const wi=tileIndex.get(win);if(wi==null)return[];
    const out=[];
    if(d.pair===wi)out.push({wait:'単騎',target:'pair'});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){
        const r=m.i%9;let wait='両面';
        if(wi===m.i+1)wait='嵌張';
        else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';
        out.push({wait,target:'sequence',mi});
      }
    });
    return out;
  }
  function tripletFu(index,closed){
    const t=tileOrder[index],yaochu=honors.has(t)||terminals.has(t);
    return closed?(yaochu?8:4):(yaochu?4:2);
  }
  function calculateFu(tiles,win,ctx){
    if(tiles.length!==14||!win||!ctx.winner||!ctx.type||ctx.menzen===null)return[];
    const judged=window.judgeMahjongWinM8V4?.(tiles);
    if(!judged?.win)return[];
    if(judged.type==='七対子')return[25];
    if(judged.type==='国士無双')return[];
    const vals=new Set();
    decompositions(tiles).forEach(d=>{
      waitOptions(d,win).forEach(opt=>{
        const pairFu=valuePairFu(d.pair,ctx);
        const waitFu=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfuShape=ctx.menzen&&allSeq&&pairFu===0&&opt.wait==='両面';
        if(pinfuShape&&ctx.type==='tsumo'){vals.add(20);return;}
        const base=20+(ctx.menzen&&ctx.type==='ron'?10:0)+(ctx.type==='tsumo'?2:0)+pairFu+waitFu;
        const trips=d.melds.map((m,mi)=>({m,mi})).filter(x=>x.m.type==='triplet');
        if(ctx.menzen){
          let meldFu=0;
          trips.forEach(({m,mi})=>{
            const ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
            meldFu+=tripletFu(m.i,!ronOpened);
          });
          vals.add(Math.ceil((base+meldFu)/10)*10);
        }else{
          let min=base,max=base;
          trips.forEach(({m})=>{min+=tripletFu(m.i,false);max+=tripletFu(m.i,true);});
          min=Math.max(30,Math.ceil(min/10)*10);
          max=Math.max(30,Math.ceil(max/10)*10);
          for(let n=min;n<=max;n+=10)vals.add(n);
        }
      });
    });
    return [...vals].sort((a,b)=>a-b);
  }

  function waitNames(tiles,win){
    const s=new Set();
    decompositions(tiles).forEach(d=>waitOptions(d,win).forEach(o=>s.add(o.wait)));
    return [...s];
  }

  function publishFu(){
    const root=resultRoot();
    const box=root?.querySelector('#m8-fu-start-v7');
    if(!box)return [];
    const tiles=getTiles();
    const win=window.m8WinningTileV7||box.querySelector('.m8v7-win-tile.active')?.dataset.tile||null;
    if(!win||tiles.length!==14)return[];
    const ctx=context();
    const vals=calculateFu(tiles,win,ctx);
    const waits=waitNames(tiles,win);
    window.m8FuCandidatesV13=vals.slice();
    window.m8FuCandidatesV12=vals.slice();
    window.m8FuCandidatesV11=vals.slice();
    if(vals.length===1) window.m8SuggestedFuV8=vals[0];
    else window.m8SuggestedFuV8=null;

    const note=box.querySelector('.m8v7-fu-note');
    if(note){
      const waitText=waits.length?` / 待ち候補：${waits.join('・')}`:'';
      if(vals.length===1){
        note.innerHTML=`和了牌：${win}${waitText} / <span class="m8v13-fu-detail">${vals[0]}符</span>`;
      }else if(vals.length>1){
        note.innerHTML=`和了牌：${win}${waitText} / <span class="m8v13-fu-detail">符候補：${vals.join('・')}符</span>`;
      }else if(!ctx.winner||!ctx.type||ctx.menzen===null){
        note.innerHTML=`和了牌：${win}${waitText} / <span class="m8v13-fu-detail">和了条件を確認すると符を計算します</span>`;
      }
    }
    return vals;
  }

  // ---------- ② 起家マーク位置 ----------
  function fixStartingDealerBadge(){
    document.querySelectorAll('.starting-dealer-badge-v1').forEach(b=>{
      b.style.top='auto';
      b.style.left='auto';
      b.style.right='-11px';
      b.style.bottom='-11px';
    });
  }

  // ---------- ③ 点数表の下部ボタンを本当のフッターにする ----------
  function fixScoreFooter(){
    const score=!!overlay.querySelector('.score-switch-table,.score-dual-grid');
    overlay.classList.toggle('m8v13-score',score);
    if(!score)return;
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;
    const fresh=content.querySelector('.agari-flow-actions');
    const direct=[...card.children].filter(x=>x.classList?.contains('agari-flow-actions'));
    if(fresh){
      direct.forEach(x=>x.remove());
      card.appendChild(fresh);
    }else if(direct.length>1){
      direct.slice(0,-1).forEach(x=>x.remove());
    }
  }

  let queued=false;
  function refresh(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      fixStartingDealerBadge();
      fixScoreFooter();
      if(resultRoot()&&window.m8WinningTileV7)publishFu();
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.m8v7-win-tile')||e.target.closest?.('#m8-context-v5 .m8v5-chip')){
      setTimeout(()=>{publishFu();refresh();},20);
    }
    if(e.target.closest?.('#m8-result-v1 .m8-card>button:last-child')) publishFu();
    setTimeout(refresh,0);
  },true);

  const obs=new MutationObserver(refresh);
  obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style','data-tile']});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  refresh();
})();
