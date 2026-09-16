// M8 v10: true viewport centering + all-player selection reliability + one-tap recommended score
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay) return;

  // Root cause fix: #agari-overlay used to live inside #game-screen, whose historical
  // viewport/transform patches made fixed 50% behave like an upper-shifted center on iPhone.
  // Portal it to body so coordinates are based on the actual visual viewport.
  if(overlay.parentElement!==document.body) document.body.appendChild(overlay);
  overlay.classList.add('m8v10-portal');

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      body>#agari-overlay.m8v10-portal{
        position:fixed!important;
        left:var(--m8v10-cx,50vw)!important;
        top:var(--m8v10-cy,50dvh)!important;
        transform:translate(-50%,-50%)!important;
        transform-origin:center center!important;
        zoom:1!important;
        height:auto!important;
        min-height:0!important;
        max-height:calc(var(--m8v10-vh,100dvh) - 12px)!important;
        z-index:100000!important;
        transition:none!important;
      }

      /* ロン/ツモ方法選択も本当の画面中央 */
      body>#agari-overlay.m8v10-type{
        width:min(900px,72vw)!important;
        overflow:visible!important;
      }

      /* アガリ者/放銃者選択。背景領域はタップを通し、4人全員のパネルを触れるようにする */
      body>#agari-overlay.m8v10-pick{
        width:min(540px,46vw)!important;
        height:auto!important;
        overflow:visible!important;
        pointer-events:none!important;
      }
      body>#agari-overlay.m8v10-pick .agari-flow-card{pointer-events:auto!important;padding:6px 10px!important;max-height:none!important;overflow:visible!important}
      body>#agari-overlay.m8v10-pick .agari-flow-top{margin:0 0 2px!important;min-height:28px!important}
      body>#agari-overlay.m8v10-pick .agari-flow-top strong{font-size:18px!important;line-height:1!important}
      body>#agari-overlay.m8v10-pick .flow-cancel-button{padding:4px 8px!important;font-size:11px!important}
      body>#agari-overlay.m8v10-pick .agari-flow-content{gap:2px!important}
      body>#agari-overlay.m8v10-pick .selection-guide{margin:0!important;font-size:14px!important;line-height:1.05!important}
      body>#agari-overlay.m8v10-pick .selection-subtext{font-size:10px!important;margin:0!important;line-height:1!important}
      body>#agari-overlay.m8v10-pick .selected-winners{min-height:20px!important;margin:0!important;gap:3px!important}
      body>#agari-overlay.m8v10-pick .winner-chip{padding:2px 6px!important;font-size:10px!important}
      body>#agari-overlay.m8v10-pick .agari-flow-actions{margin:2px 0 0!important;gap:5px!important}
      body>#agari-overlay.m8v10-pick .agari-flow-actions button{min-height:31px!important;padding:4px 8px!important;font-size:12px!important}

      /* v9で見た目が良かった点数表はサイズを維持し、本当のviewport中央だけに直す */
      body>#agari-overlay.m8v10-score{
        width:min(700px,80vw)!important;
        overflow:visible!important;
        transform:translate(-50%,-50%) scale(.82)!important;
      }

      /* それ以外のアガリ関連画面も実viewport中央 */
      body>#agari-overlay.m8v10-generic:not(.m8v10-score):not(.m8v10-pick){
        overflow:visible!important;
      }
    }

    .m8v10-auto-score{
      margin:2px 0 4px;padding:6px 9px;border:0;border-radius:9px;
      background:#dff5e8;color:#153d29;font-size:11px;font-weight:900;cursor:pointer;
    }
  `;
  document.head.appendChild(style);

  function getStep(){
    try{return typeof agariFlow!=='undefined'?(agariFlow.step||''):'';}catch(_){return '';}
  }

  function viewport(){
    const v=window.visualViewport;
    return {
      x:v?.offsetLeft||0,
      y:v?.offsetTop||0,
      w:v?.width||window.innerWidth||document.documentElement.clientWidth,
      h:v?.height||window.innerHeight||document.documentElement.clientHeight
    };
  }

  function applyTrueCenter(){
    const v=viewport();
    overlay.style.setProperty('--m8v10-cx',`${v.x+v.w/2}px`);
    overlay.style.setProperty('--m8v10-cy',`${v.y+v.h/2}px`);
    overlay.style.setProperty('--m8v10-vh',`${v.h}px`);
  }

  function refreshMode(){
    applyTrueCenter();
    const step=getStep();
    const score=!!overlay.querySelector('.score-switch-table,.score-dual-grid');
    const pick=step==='winner'||step==='discarder';
    const type=step==='type';
    overlay.classList.toggle('m8v10-score',score);
    overlay.classList.toggle('m8v10-pick',pick&&!score);
    overlay.classList.toggle('m8v10-type',type&&!score);
    overlay.classList.toggle('m8v10-generic',!score&&!pick&&!type);
  }

  // Capturing listener guarantees every player panel works in both ron and tsumo flows,
  // including taps on the riichi button area. Existing restrictions (e.g. discarder cannot
  // be a winner) remain inside the original handlers.
  document.addEventListener('click',e=>{
    const step=getStep();
    if(step!=='winner'&&step!=='discarder') return;
    const panel=e.target.closest?.('.player-panel');
    if(!panel) return;
    const position=panel.dataset.position;
    if(!position) return;

    if(step==='winner'&&typeof handleWinnerSelection==='function'){
      e.preventDefault();
      e.stopImmediatePropagation();
      handleWinnerSelection(position);
      setTimeout(refreshMode,0);
      return;
    }
    if(step==='discarder'&&typeof handleDiscarderSelection==='function'){
      e.preventDefault();
      e.stopImmediatePropagation();
      handleDiscarderSelection(position);
      setTimeout(refreshMode,0);
    }
  },true);

  // Add a one-tap handoff from M8's detected fu/han to the existing score-table button.
  function addAutoScoreButton(){
    const root=overlay.querySelector('.score-switch-table');
    if(!root) return;
    if(root.parentElement?.querySelector('.m8v10-auto-score')) return;

    const han=Number(window.m8SuggestedHanV9||window.m8SuggestedHanV6);
    const fu=Number(window.m8SuggestedFuV9||window.m8SuggestedFuV8||window.m8SuggestedFuV7);
    if(!Number.isFinite(han)||!Number.isFinite(fu)||han<1||han>4) return;

    for(const table of root.querySelectorAll('table')){
      const rows=[...table.querySelectorAll('tr')];
      const header=rows.find(tr=>[...tr.children].some(c=>c.textContent.trim()===`${han}翻`));
      if(!header) continue;
      const col=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);
      const row=rows.find(tr=>[...tr.children].some(c=>c.textContent.replace(/\s/g,'').includes(`${fu}符`)));
      if(col<0||!row||!row.children[col]) continue;
      const cell=row.children[col];
      const target=cell.querySelector('.score-cell,button')||cell;
      const b=document.createElement('button');
      b.type='button';
      b.className='m8v10-auto-score';
      b.textContent=`M8推奨 ${fu}符${han}翻を入力`;
      b.addEventListener('click',ev=>{
        ev.preventDefault();ev.stopPropagation();
        target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      });
      root.insertAdjacentElement('beforebegin',b);
      break;
    }
  }

  let queued=false;
  function refresh(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      refreshMode();
      addAutoScoreButton();
    });
  }

  new MutationObserver(refresh).observe(overlay,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(refresh,0),true);
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  window.visualViewport?.addEventListener('scroll',refresh,{passive:true});
  refresh();
})();