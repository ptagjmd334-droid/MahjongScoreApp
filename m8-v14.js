// M8 v14: 点数入力フッターの画面またぎ残留を修正 + 点数表スクロール初期位置を安定化
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;

  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v14';

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      body>#agari-overlay.m8v14-score .agari-flow-card{
        display:grid!important;
        grid-template-rows:auto minmax(0,1fr) auto!important;
        height:min(520px,calc(100dvh - 10px))!important;
        max-height:calc(100dvh - 10px)!important;
        overflow:hidden!important;
        padding:4px 7px 5px!important;
      }
      body>#agari-overlay.m8v14-score .agari-flow-content{
        grid-row:2!important;
        min-height:0!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        padding-bottom:5px!important;
      }
      body>#agari-overlay.m8v14-score .agari-flow-card>.agari-flow-actions{
        grid-row:3!important;
        position:relative!important;
        inset:auto!important;
        z-index:50!important;
        display:flex!important;
        flex:0 0 auto!important;
        margin:4px 0 0!important;
        padding:4px 0 max(2px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;
        box-shadow:0 -7px 13px rgba(6,47,38,.92)!important;
      }
      body>#agari-overlay:not(.m8v14-score) .agari-flow-card>.m8v14-score-footer{
        display:none!important;
      }
    }
  `;
  document.head.appendChild(style);

  let lastScoreSignature='';

  function isScoreScreen(){
    return !!overlay.querySelector('.score-switch-table,.score-dual-grid');
  }

  function directFooters(card){
    return [...card.children].filter(el=>el.classList?.contains('agari-flow-actions'));
  }

  function cleanupOutsideScore(card){
    overlay.classList.remove('m8v14-score');
    directFooters(card).forEach(el=>el.remove());
  }

  function installScoreFooter(card,content){
    overlay.classList.add('m8v14-score');

    const inside=content.querySelector('.agari-flow-actions');
    const direct=directFooters(card);

    if(inside){
      direct.forEach(el=>el.remove());
      inside.classList.add('m8v14-score-footer');
      card.appendChild(inside);
    }else{
      const keep=direct.at(-1)||null;
      direct.slice(0,-1).forEach(el=>el.remove());
      keep?.classList.add('m8v14-score-footer');
    }

    // 新しい点数表（別の和了者を含む）を開いた時だけ表の先頭に戻す。
    const title=document.getElementById('agari-flow-title')?.textContent||'';
    const who=content.querySelector('.score-target-name,.score-winner-name')?.textContent||'';
    const signature=`${title}|${who}|${content.querySelectorAll('.score-cell').length}`;
    if(signature!==lastScoreSignature){
      lastScoreSignature=signature;
      content.scrollTop=0;
    }
  }

  function refresh(){
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;

    if(isScoreScreen()) installScoreFooter(card,content);
    else {
      lastScoreSignature='';
      cleanupOutsideScore(card);
    }
  }

  // 画面切替直後に、前の点数表フッターがロン/ツモ等へ残るのを即座に除去する。
  document.addEventListener('click',()=>setTimeout(refresh,0),true);
  const obs=new MutationObserver(()=>requestAnimationFrame(refresh));
  obs.observe(overlay,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  refresh();
})();
