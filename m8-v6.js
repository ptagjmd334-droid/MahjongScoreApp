// M8 v6: アガリUI位置補正 + 点数表の見切れ修正 + 判定翻数の点数表引き継ぎ
(() => {
  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape) and (max-height:500px){
      /* アガリ者・放銃者選択は実viewport中央に固定し、上下プレイヤーを隠さない */
      #agari-overlay.m8v6-player-pick{
        position:fixed!important;
        left:50vw!important;
        top:50dvh!important;
        transform:translate(-50%,-50%)!important;
        width:min(500px,48vw)!important;
        max-height:calc(100dvh - 180px)!important;
        zoom:1!important;
      }
      #agari-overlay.m8v6-player-pick .agari-flow-card{
        padding:10px 14px!important;
        max-height:none!important;
        overflow:visible!important;
      }
      #agari-overlay.m8v6-player-pick .agari-flow-top{margin-bottom:8px!important}
      #agari-overlay.m8v6-player-pick .agari-flow-content{gap:8px!important}
      #agari-overlay.m8v6-player-pick .selection-guide{font-size:17px!important}
      #agari-overlay.m8v6-player-pick .selection-subtext{font-size:12px!important}
      #agari-overlay.m8v6-player-pick .selected-winners{min-height:28px!important}
      #agari-overlay.m8v6-player-pick .agari-flow-actions{margin-top:2px!important}
      #agari-overlay.m8v6-player-pick .agari-flow-actions button{min-height:34px!important;padding:6px 10px!important}

      /* 点数表は古いzoom指定を打ち消し、実viewportの中央に縮小して完全表示 */
      #agari-overlay:has(.score-switch-table),
      #agari-overlay:has(.score-dual-grid){
        position:fixed!important;
        left:50vw!important;
        top:50dvh!important;
        width:min(720px,78vw)!important;
        max-height:none!important;
        zoom:1!important;
        transform:translate(-50%,-50%) scale(.76)!important;
        transform-origin:center center!important;
      }
      #agari-overlay:has(.score-switch-table) .agari-flow-card,
      #agari-overlay:has(.score-dual-grid) .agari-flow-card{
        max-height:none!important;
        overflow:visible!important;
        padding:8px 10px!important;
      }
      #agari-overlay:has(.score-switch-table) .agari-flow-actions{
        margin-top:6px!important;
        padding-bottom:4px!important;
      }
    }

    .m8v6-han-guide{margin:4px 0 7px;padding:6px 9px;border-radius:9px;background:#e8f4ff;color:#123;font-size:12px;font-weight:900;text-align:center}
    .m8v6-han-column{outline:2px solid #32a7ff!important;outline-offset:-2px;background:rgba(50,167,255,.12)!important}
  `;
  document.head.appendChild(style);

  function updateAgariOverlayMode(){
    const overlay=document.getElementById('agari-overlay');
    const title=document.getElementById('agari-flow-title')?.textContent?.trim()||'';
    if(!overlay)return;
    const playerPick = title.includes('人を選択') || title.includes('放銃者') || title.includes('アガった人');
    overlay.classList.toggle('m8v6-player-pick',playerPick);
  }

  const overlayObserver=new MutationObserver(()=>requestAnimationFrame(updateAgariOverlayMode));
  const agari=document.getElementById('agari-overlay');
  if(agari) overlayObserver.observe(agari,{childList:true,subtree:true,characterData:true,attributes:true});
  document.addEventListener('click',()=>setTimeout(updateAgariOverlayMode,0),true);
  updateAgariOverlayMode();

  function readSuggestedHan(){
    const text=document.querySelector('#m8-context-v5 .m8v5-han')?.textContent||'';
    const m=text.match(/(\d+)翻/);
    if(m){ window.m8SuggestedHanV6=Math.max(1,Number(m[1])); return; }
    if(text.includes('役満')) window.m8SuggestedHanV6='yakuman';
  }

  function decorateScoreTable(){
    readSuggestedHan();
    const root=document.querySelector('.score-switch-table');
    if(!root)return;
    root.querySelectorAll('.m8v6-han-column').forEach(el=>el.classList.remove('m8v6-han-column'));
    root.parentElement?.querySelector('.m8v6-han-guide')?.remove();
    const han=window.m8SuggestedHanV6;
    if(!han)return;

    const guide=document.createElement('div');
    guide.className='m8v6-han-guide';
    guide.textContent=han==='yakuman'?'M8判定：役満候補':'M8判定：'+han+'翻 → あとは符を選択';
    root.insertAdjacentElement('beforebegin',guide);

    if(typeof han!=='number'||han<1||han>4)return;
    root.querySelectorAll('table').forEach(table=>{
      const header=[...table.querySelectorAll('tr')].find(tr=>[...tr.children].some(c=>c.textContent.trim()===`${han}翻`));
      if(!header)return;
      const idx=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);
      if(idx<0)return;
      [...table.querySelectorAll('tr')].forEach(tr=>{
        if(tr.children[idx])tr.children[idx].classList.add('m8v6-han-column');
      });
    });
  }

  const docObserver=new MutationObserver(()=>{
    readSuggestedHan();
    if(document.querySelector('.score-switch-table')) requestAnimationFrame(decorateScoreTable);
  });
  docObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
})();