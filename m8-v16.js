// M8 v16: v15ラグ解消 + カメラ確実停止 + アガリoverlay残骸除去 + 軽量な符再計算連携
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  document.getElementById('app-build-badge')?.replaceChildren(document.createTextNode('M8 v16'));

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      body>#agari-overlay.m8v16-nonscore:not(.hidden){
        position:fixed!important;left:50vw!important;top:50dvh!important;
        transform:translate(-50%,-50%)!important;transform-origin:center!important;
        height:auto!important;min-height:0!important;max-height:calc(100dvh - 12px)!important;
        overflow:visible!important;zoom:1!important;
      }
      body>#agari-overlay.m8v16-nonscore .agari-flow-card{
        max-height:calc(100dvh - 12px)!important;overflow:visible!important;
      }
      body>#agari-overlay.m8v16-score{
        position:fixed!important;left:50vw!important;top:50dvh!important;
        width:min(700px,80vw)!important;max-height:none!important;overflow:visible!important;
        transform:translate(-50%,-50%) scale(.76)!important;transform-origin:center!important;zoom:1!important;
      }
      body>#agari-overlay.m8v16-score .agari-flow-card{
        display:block!important;max-height:calc((100dvh - 10px)/.76)!important;
        overflow:hidden!important;padding:5px 8px!important;
      }
      body>#agari-overlay.m8v16-score .agari-flow-content{
        display:block!important;max-height:calc((100dvh - 82px)/.76)!important;
        overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;
        touch-action:pan-y!important;overscroll-behavior:contain!important;
      }
      body>#agari-overlay.m8v16-score .agari-flow-content>.agari-flow-actions{
        position:sticky!important;bottom:0!important;z-index:70!important;display:flex!important;
        margin:4px 0 0!important;padding:5px 0 max(3px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;box-shadow:0 -7px 13px rgba(6,47,38,.92)!important;
      }
    }
  `;
  document.head.appendChild(style);

  let cachedHand=null;
  let lastFuSignature='';
  let layoutQueued=false;

  function stopVisibleMedia(){
    document.querySelectorAll('video').forEach(v=>{
      const s=v.srcObject;
      if(s&&typeof s.getTracks==='function'){
        s.getTracks().forEach(t=>{try{t.stop();}catch(_){}});
        try{v.srcObject=null;}catch(_){}
      }
    });
    const cancel=document.querySelector('#realtime-hand-camera-m7v3 .realtime-hand-cancel-m7v3');
    if(cancel) try{cancel.click();}catch(_){}
  }

  // 手牌確認へ進む/結果確定/アプリが裏へ回る時はカメラを必ず止める。
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.hand-result-ok-m7v5,#m8-result-v1 .m8-card>button:last-child')) stopVisibleMedia();
  },true);
  window.addEventListener('pagehide',stopVisibleMedia,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopVisibleMedia();});

  function isScore(){return !!overlay.querySelector('.score-switch-table,.score-dual-grid');}
  function flowActive(){
    try{return !!(typeof agariFlow!=='undefined'&&agariFlow.active);}catch(_){return !overlay.classList.contains('hidden');}
  }
  function restoreFooter(){
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;
    const direct=[...card.children].filter(x=>x.classList?.contains('agari-flow-actions'));
    if(direct.length){
      const keep=direct.at(-1);direct.slice(0,-1).forEach(x=>x.remove());
      if(keep.parentElement!==content)content.appendChild(keep);
    }
  }
  function cleanLegacy(){
    ['m8v7-score','m8v10-score','m8v11-score','m8v13-score','m8v14-score','m8v15-score','m8v15-nonscore'].forEach(c=>overlay.classList.remove(c));
  }
  function applyLayout(){
    layoutQueued=false;
    const score=isScore();
    cleanLegacy();
    overlay.classList.toggle('m8v16-score',score);
    overlay.classList.toggle('m8v16-nonscore',!score);
    if(score)restoreFooter();
    else{
      const card=overlay.querySelector('.agari-flow-card');
      [...(card?.children||[])].filter(x=>x.classList?.contains('agari-flow-actions')).forEach(x=>x.remove());
      // 入力状態が終わっているのに古いoverlayだけ残ったケースを消す。
      if(!flowActive())overlay.classList.add('hidden');
    }
  }
  function queueLayout(){
    if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(applyLayout);
  }

  function captureHand(){
    const root=document.getElementById('m8-result-v1');if(!root)return;
    const tiles=Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];if(tiles.length!==14)return;
    const box=root.querySelector('#m8-fu-start-v7');
    const win=window.m8WinningTileV7||box?.querySelector('.m8v7-win-tile.active')?.dataset.tile||null;
    const m=root.querySelector('#m8-context-v5 [data-menzen].active');
    cachedHand={tiles,win,menzen:m?m.dataset.menzen==='1':true};
    window.m8CachedHandV16={tiles:tiles.slice(),win,menzen:cachedHand.menzen};
  }

  // v13の計算結果を、実際のロン/ツモ確定後の点数表へ渡す。
  function publishFuOnce(){
    if(!isScore())return;
    const source=(window.m8FuCandidatesV13||window.m8FuCandidatesV12||window.m8FuCandidatesV11||[]).map(Number).filter(Number.isFinite);
    let vals=[...new Set(source)].sort((a,b)=>a-b);
    const hand=cachedHand||window.m8CachedHandV16;
    const judged=hand?.tiles?window.judgeMahjongWinM8V4?.(hand.tiles):null;
    if(judged?.type==='七対子')vals=[25];
    if(judged?.type==='国士無双')vals=[];
    const sig=vals.join(',');
    if(sig===lastFuSignature)return;
    lastFuSignature=sig;
    window.m8FuCandidatesV16=vals.slice();
    window.m8FuCandidatesV11=vals.slice();
    if(vals.length===1){window.m8SuggestedFuV8=vals[0];window.m8SuggestedFuV11=vals[0];}
    else{window.m8SuggestedFuV8=null;window.m8SuggestedFuV11=null;}
    // 旧v11の推薦UIを1回だけ再評価させる（無限トグルはしない）。
    overlay.dataset.m8v16Fu=sig||'none';
  }

  function updateResultNote(){
    const root=document.getElementById('m8-result-v1');if(!root)return;
    [...root.querySelectorAll('small')].forEach(s=>{
      if(/M8 v[58]|接続中/.test(s.textContent||'')) s.textContent='※ 符は和了牌・手牌状態と、和了者・ロン/ツモを使って点数表で確定します。';
    });
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#m8-result-v1 .m8-card>button:last-child'))captureHand();
    setTimeout(()=>{queueLayout();publishFuOnce();updateResultNote();},0);
  },true);

  // DOM構造が変わった時だけ。class属性監視をやめ、v15の無限再描画を防止。
  new MutationObserver(()=>{
    queueLayout();
    requestAnimationFrame(()=>{publishFuOnce();updateResultNote();});
  }).observe(document.body,{childList:true,subtree:true});

  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,queueLayout,{passive:true}));
  updateResultNote();queueLayout();
})();
