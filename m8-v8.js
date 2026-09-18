// M8 v8: UI安定化 + 点数表フラッシュ除去 + 符候補の自動計算
(() => {
  let lastTiles=[];
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      /* v7以前の動的scale変数を見た目から切り離し、1フレームだけ巨大化する現象を止める */
      #agari-overlay.m8v7-score{
        position:fixed!important;
        left:var(--m8v8-score-x,50vw)!important;
        top:var(--m8v8-score-y,50dvh)!important;
        transform:translate(-50%,-50%) scale(var(--m8v8-score-scale,.82))!important;
        transform-origin:center center!important;
        transition:none!important;
        zoom:1!important;
      }

      /* ロン/ツモ、アガリ者、放銃者などは実viewport中央へ。プレイヤー選択は小さくしすぎない */
      #agari-overlay:not(.hidden):not(.m8v7-score):not(:has(.score-switch-table)):not(:has(.score-dual-grid)){
        position:fixed!important;
        left:var(--m8v8-center-x,50vw)!important;
        top:var(--m8v8-center-y,50dvh)!important;
        transform:translate(-50%,-50%)!important;
        transform-origin:center center!important;
        zoom:1!important;
        max-height:calc(var(--m8v8-vh,100dvh) - 14px)!important;
      }
      #agari-overlay.m8v7-player-pick{
        width:min(500px,56vw)!important;
        max-height:none!important;
        overflow:visible!important;
      }
      #agari-overlay.m8v7-player-pick .agari-flow-card{
        padding:10px 13px!important;
        max-height:none!important;
        overflow:visible!important;
      }
      #agari-overlay.m8v7-player-pick .agari-flow-top{margin-bottom:6px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-top strong{font-size:20px!important}
      #agari-overlay.m8v7-player-pick .flow-cancel-button{padding:6px 9px!important;font-size:13px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-content{gap:6px!important}
      #agari-overlay.m8v7-player-pick .selection-guide{font-size:17px!important;line-height:1.2!important}
      #agari-overlay.m8v7-player-pick .selection-subtext{font-size:12px!important;line-height:1.2!important;margin:0!important}
      #agari-overlay.m8v7-player-pick .selected-winners{min-height:27px!important;gap:5px!important}
      #agari-overlay.m8v7-player-pick .winner-chip{padding:4px 8px!important;font-size:12px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-actions{margin-top:2px!important;gap:7px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-actions button{min-height:36px!important;padding:6px 10px!important;font-size:14px!important}

      /* 役判定結果はviewportそのものを外枠にして、スクロールアンカーで下に飛ばないようにする */
      #m8-result-v1{
        inset:auto!important;
        left:var(--m8v8-vx,0px)!important;
        top:var(--m8v8-vy,0px)!important;
        width:var(--m8v8-vw,100vw)!important;
        height:var(--m8v8-vh,100dvh)!important;
        padding:7px 10px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
      }
      #m8-result-v1 .m8-card{
        width:min(680px,92vw)!important;
        max-height:calc(var(--m8v8-vh,100dvh) - 14px)!important;
        overflow:auto!important;
        overflow-anchor:none!important;
        padding:11px 14px!important;
        border-radius:18px!important;
      }
      #m8-result-v1 h2{font-size:23px!important;margin:0 0 5px!important}
      #m8-result-v1 p{font-size:13px!important;line-height:1.25!important;margin:0 0 6px!important}
      #m8-result-v1 .m8-yaku-v4{margin:5px 0 7px!important;padding:7px 10px!important;font-size:13px!important}
      #m8-context-v5{margin:5px 0 7px!important;padding:6px 8px!important;border-radius:10px!important}
      #m8-context-v5 .m8v5-row{gap:5px!important;margin:3px 0!important}
      #m8-context-v5 .m8v5-label{min-width:58px!important;font-size:11px!important}
      #m8-context-v5 .m8v5-auto{font-size:11px!important}
      #m8-context-v5 .m8v5-chip{padding:4px 7px!important;font-size:11px!important}
      #m8-context-v5 .m8v5-extra{margin-top:5px!important;padding:5px 7px!important;font-size:11px!important}
      #m8-context-v5 .m8v5-han{margin-top:4px!important;font-size:12px!important}
      #m8-fu-start-v7{margin-top:5px!important;padding:6px 8px!important;border-radius:10px!important}
      #m8-fu-start-v7 .m8v7-fu-title{font-size:11px!important;margin-bottom:4px!important}
      #m8-fu-start-v7 .m8v7-win-tiles{gap:2px!important;flex-wrap:nowrap!important;overflow-x:auto!important;padding-bottom:2px!important}
      #m8-fu-start-v7 .m8v7-win-tile{width:28px!important;min-width:28px!important;height:34px!important;font-size:20px!important}
      #m8-fu-start-v7 .m8v7-fu-note{margin-top:4px!important;font-size:10px!important;line-height:1.25!important}
      #m8-result-v1 .m8-card>button{min-height:38px!important;padding:6px 10px!important;font-size:15px!important}
    }

    .m8v8-fu-row{outline:2px solid #f0b323!important;outline-offset:-2px;background:rgba(240,179,35,.10)!important}
    .m8v8-recommended-cell{outline:3px solid #39c97a!important;outline-offset:-3px;background:rgba(57,201,122,.20)!important}
    .m8v8-fu-detail{font-weight:900}
  `;
  document.head.appendChild(style);

  function vv(){
    const v=window.visualViewport;
    return {w:v?.width||document.documentElement.clientWidth||window.innerWidth,h:v?.height||document.documentElement.clientHeight||window.innerHeight,x:v?.offsetLeft||0,y:v?.offsetTop||0};
  }

  function setViewportVars(){
    const v=vv(),root=document.documentElement;
    root.style.setProperty('--m8v8-vx',`${v.x}px`);
    root.style.setProperty('--m8v8-vy',`${v.y}px`);
    root.style.setProperty('--m8v8-vw',`${v.w}px`);
    root.style.setProperty('--m8v8-vh',`${v.h}px`);
    root.style.setProperty('--m8v8-center-x',`${v.x+v.w/2}px`);
    root.style.setProperty('--m8v8-center-y',`${v.y+v.h/2}px`);
    root.style.setProperty('--m8v8-score-x',`${v.x+v.w/2}px`);
    root.style.setProperty('--m8v8-score-y',`${v.y+v.h/2}px`);
  }

  function fitScoreStable(){
    const overlay=document.getElementById('agari-overlay');
    if(!overlay||!overlay.querySelector('.score-switch-table,.score-dual-grid'))return;
    const v=vv(),card=overlay.querySelector('.agari-flow-card');
    const naturalH=Math.max(1,overlay.scrollHeight,card?.scrollHeight||0);
    const naturalW=Math.max(1,overlay.scrollWidth,card?.scrollWidth||0);
    const scale=Math.max(.70,Math.min(.98,(v.h-8)/naturalH,(v.w-12)/naturalW));
    document.documentElement.style.setProperty('--m8v8-score-scale',String(scale));
  }

  function stabilizeResult(){
    const card=document.querySelector('#m8-result-v1 .m8-card');
    if(!card)return;
    const note=[...card.querySelectorAll('small')].find(x=>x.textContent.includes('M8 v5'));
    if(note)note.textContent='※ M8 v8：対局情報と符候補の自動判定を接続中。確定できない条件だけ手動入力します。';
  }

  // OKを押す前に14枚を退避（旧処理がoverlayを消す前のcapture phase）
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.hand-result-ok-m7v5'))return;
    const root=document.getElementById('hand-result-overlay-m7v5');
    const ts=[...(root?.querySelectorAll('.hand-result-tile-m7v5')||[])].map(b=>b.dataset.tile).filter(Boolean);
    if(ts.length===14){lastTiles=ts.slice();window.m8LastTilesV8=lastTiles.slice();window.m8SuggestedFuV8=null;}
  },true);

  function activeContext(){
    const root=document.getElementById('m8-context-v5');
    if(!root)return {winner:null,type:null,menzen:null};
    return {
      winner:root.querySelector('[data-winner].active')?.dataset.winner||null,
      type:root.querySelector('[data-type].active')?.dataset.type||null,
      menzen:root.querySelector('[data-menzen].active')?root.querySelector('[data-menzen].active').dataset.menzen==='1':null
    };
  }

  function roundWind(){
    try{if(typeof gameState!=='undefined'&&gameState.roundWind)return gameState.roundWind;}catch(_){ }
    return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';
  }
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}

  function decompositions(tiles){
    const c=Array(34).fill(0);for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const result=[];
    function take(counts,melds){
      const i=counts.findIndex(n=>n>0);if(i<0){result.push(melds.slice());return;}
      if(counts[i]>=3){counts[i]-=3;take(counts,[...melds,{type:'triplet',i}]);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;take(counts,[...melds,{type:'sequence',i}]);counts[i]++;counts[i+1]++;counts[i+2]++;}
    }
    const out=[];
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;result.length=0;take(x,[]);result.forEach(ms=>{if(ms.length===4)out.push({pair:p,melds:ms});});}
    return out;
  }

  function valuePairFu(pairIndex,ctx){
    const t=tileOrder[pairIndex];let fu=0;
    if(['白','發','中'].includes(t))fu+=2;
    const sw=seatWind(ctx.winner),rw=roundWind();
    if(t===sw)fu+=2;if(t===rw)fu+=2;
    return fu;
  }

  function waitOptionsForDecomp(d,winningTile){
    const wi=tileIndex.get(winningTile);if(wi==null)return[];
    const opts=[];
    if(d.pair===wi)opts.push({wait:'単騎',target:'pair'});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)opts.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){
        const r=m.i%9;let wait='両面';
        if(wi===m.i+1)wait='嵌張';
        else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';
        opts.push({wait,target:'sequence',mi});
      }
    });
    return opts;
  }

  function tripletFu(index,closed){
    const t=tileOrder[index],yaochu=honors.has(t)||terminals.has(t);
    if(closed)return yaochu?8:4;
    return yaochu?4:2;
  }

  function fuCandidates(tiles,winningTile,ctx){
    if(!winningTile||ctx.menzen===null||!ctx.type||!ctx.winner)return [];
    const judged=window.judgeMahjongWinM8V4?.(tiles);
    if(!judged?.win)return[];
    if(judged.type==='七対子')return [25];
    if(judged.type==='国士無双')return [];
    const vals=new Set();
    decompositions(tiles).forEach(d=>{
      waitOptionsForDecomp(d,winningTile).forEach(opt=>{
        const pairFu=valuePairFu(d.pair,ctx);
        const waitFu=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfuShape=ctx.menzen&&allSeq&&pairFu===0&&opt.wait==='両面';
        if(pinfuShape&&ctx.type==='tsumo'){vals.add(20);return;}

        const base=20+(ctx.menzen&&ctx.type==='ron'?10:0)+(ctx.type==='tsumo'?2:0)+pairFu+waitFu;
        const triplets=d.melds.map((m,mi)=>({m,mi})).filter(x=>x.m.type==='triplet');
        if(ctx.menzen){
          let meldFu=0;
          triplets.forEach(({m,mi})=>{
            const ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
            meldFu+=tripletFu(m.i,!ronOpened);
          });
          let total=base+meldFu;
          if(!ctx.menzen&&total===20)total=30;
          vals.add(Math.ceil(total/10)*10);
        }else{
          // 副露ありではどの刻子が開いているか未取得。可能な最小〜最大を候補として残す。
          let min=base,max=base;
          triplets.forEach(({m})=>{min+=tripletFu(m.i,false);max+=tripletFu(m.i,true);});
          min=Math.max(30,Math.ceil(min/10)*10);max=Math.max(30,Math.ceil(max/10)*10);
          for(let n=min;n<=max;n+=10)vals.add(n);
        }
      });
    });
    return [...vals].sort((a,b)=>a-b);
  }

  function updateFuDetail(){
    const box=document.getElementById('m8-fu-start-v7');
    if(!box)return;
    const ts=(window.m8LastTilesV8||lastTiles||[]).slice();
    if(ts.length!==14)return;
    const ctx=activeContext();
    const winTile=window.m8WinningTileV7||box.querySelector('.m8v7-win-tile.active')?.dataset.tile||null;
    const vals=fuCandidates(ts,winTile,ctx);
    const note=box.querySelector('.m8v7-fu-note');if(!note)return;
    if(!winTile)return;
    const waits=(note.textContent.match(/待ち(?:候補)?：([^/]+)/)?.[1]||'').trim();
    if(!ctx.winner||!ctx.type||ctx.menzen===null){note.innerHTML=`和了牌：${winTile} / ${waits?`待ち候補：${waits} / `:''}<span class="m8v8-fu-detail">和了者・方法・門前/副露を選ぶと符候補を計算</span>`;return;}
    if(vals.length===1){window.m8SuggestedFuV8=vals[0];note.innerHTML=`和了牌：${winTile}${waits?` / 待ち候補：${waits}`:''} / <span class="m8v8-fu-detail">${vals[0]}符候補</span>`;}
    else if(vals.length>1){window.m8SuggestedFuV8=null;note.innerHTML=`和了牌：${winTile}${waits?` / 待ち候補：${waits}`:''} / <span class="m8v8-fu-detail">符候補：${vals.join('・')}符</span>`;}
    else{window.m8SuggestedFuV8=null;}
  }

  function decorateScoreRecommendation(){
    const root=document.querySelector('.score-switch-table');if(!root)return;
    const han=window.m8SuggestedHanV6,fu=window.m8SuggestedFuV8;
    root.querySelectorAll('.m8v8-fu-row,.m8v8-recommended-cell').forEach(el=>el.classList.remove('m8v8-fu-row','m8v8-recommended-cell'));
    if(typeof fu!=='number')return;
    root.querySelectorAll('table').forEach(table=>{
      const rows=[...table.querySelectorAll('tr')];
      const row=rows.find(r=>r.children[0]?.textContent.trim()===`${fu}符`);if(!row)return;
      [...row.children].forEach(c=>c.classList.add('m8v8-fu-row'));
      if(typeof han==='number'&&han>=1&&han<=4){
        const header=rows.find(r=>[...r.children].some(c=>c.textContent.trim()===`${han}翻`));
        if(!header)return;
        const idx=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);
        if(idx>=0&&row.children[idx])row.children[idx].classList.add('m8v8-recommended-cell');
      }
    });
  }

  let raf=0;
  function refresh(){
    cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
      setViewportVars();fitScoreStable();stabilizeResult();decorateScoreRecommendation();
    });
  }

  // v24 stability: 自分で付け外しするclass/文字変更を監視すると点数表で自己再発火するため、
  // DOM追加と手牌data-tile変更だけを監視する。UI操作時は下のclick handlerで明示更新する。
  const obs=new MutationObserver(muts=>{
    if(muts.some(m=>m.type==='childList'||(m.type==='attributes'&&m.attributeName==='data-tile')))refresh();
  });
  obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tile']});
  ['resize','orientationchange','pageshow'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  window.visualViewport?.addEventListener('scroll',refresh,{passive:true});

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.m8v7-win-tile'))setTimeout(()=>{updateFuDetail();refresh();},0);
    if(e.target.closest?.('#m8-context-v5 .m8v5-chip'))setTimeout(()=>{
      updateFuDetail();
      const card=document.querySelector('#m8-result-v1 .m8-card');if(card)card.scrollTop=0;
      refresh();
    },0);
  },true);

  setViewportVars();
})();