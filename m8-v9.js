// M8 v9: アガリUI位置/余白修正 + 役判定結果の見切れ対策 + 推奨点数セル強調
(() => {
  const style=document.createElement('style');
  style.textContent=`
  @media (orientation:landscape){
    /* ① アガリ者/放銃者選択：上下プレイヤーを隠さない細い中央帯 */
    #agari-overlay.m8v9-pick{position:fixed!important;left:50%!important;top:50%!important;width:min(520px,58vw)!important;max-height:none!important;overflow:visible!important;transform:translate(-50%,-50%)!important;transform-origin:center!important;zoom:1!important}
    #agari-overlay.m8v9-pick .agari-flow-card{padding:5px 9px!important;max-height:none!important;overflow:visible!important;border-radius:14px!important}
    #agari-overlay.m8v9-pick .agari-flow-top{margin:0 0 2px!important;min-height:26px!important}
    #agari-overlay.m8v9-pick .agari-flow-top strong{font-size:17px!important;line-height:1!important}
    #agari-overlay.m8v9-pick .flow-cancel-button{padding:4px 7px!important;font-size:11px!important}
    #agari-overlay.m8v9-pick .agari-flow-content{gap:2px!important}
    #agari-overlay.m8v9-pick .selection-guide{margin:0!important;font-size:14px!important;line-height:1.1!important}
    #agari-overlay.m8v9-pick .selection-subtext{display:none!important}
    #agari-overlay.m8v9-pick .selected-winners{min-height:20px!important;gap:3px!important;margin:0!important}
    #agari-overlay.m8v9-pick .winner-chip{padding:2px 6px!important;font-size:10px!important}
    #agari-overlay.m8v9-pick .agari-flow-actions{margin:1px 0 0!important;gap:5px!important}
    #agari-overlay.m8v9-pick .agari-flow-actions button{min-height:30px!important;padding:4px 8px!important;font-size:12px!important}

    /* ② 点数表：上余白を削り、全体を上へ。下部操作は34pxを確保 */
    #agari-overlay.m8v9-score{position:fixed!important;left:50%!important;top:46.5%!important;width:min(700px,80vw)!important;max-height:none!important;overflow:visible!important;transform:translate(-50%,-50%) scale(.82)!important;transform-origin:center!important;zoom:1!important;transition:none!important}
    #agari-overlay.m8v9-score .agari-flow-card{padding:3px 7px 5px!important;max-height:none!important;overflow:visible!important}
    #agari-overlay.m8v9-score .agari-flow-top{margin:0!important;min-height:27px!important}
    #agari-overlay.m8v9-score .agari-flow-top strong{font-size:18px!important;line-height:1!important}
    #agari-overlay.m8v9-score .flow-cancel-button{padding:4px 7px!important;font-size:11px!important}
    #agari-overlay.m8v9-score .agari-flow-content{gap:2px!important}
    #agari-overlay.m8v9-score .agari-flow-content>p{margin:0!important;line-height:1.05!important}
    #agari-overlay.m8v9-score .score-switch-table{margin:0!important}
    #agari-overlay.m8v9-score .score-switch-table table{border-spacing:2px!important}
    #agari-overlay.m8v9-score .score-switch-table th{height:16px!important;padding:0!important;font-size:9px!important}
    #agari-overlay.m8v9-score .score-switch-table .score-cell{min-height:26px!important;height:26px!important;padding:1px 3px!important;font-size:10px!important;line-height:1.05!important}
    #agari-overlay.m8v9-score .fu-switch-area{margin:2px 0!important}
    #agari-overlay.m8v9-score .fu-switch-button{min-height:28px!important;padding:3px 8px!important;font-size:10px!important}
    #agari-overlay.m8v9-score .limit-title{margin:1px 0!important;font-size:10px!important;line-height:1!important}
    #agari-overlay.m8v9-score .limit-grid{gap:3px!important;margin:1px 0!important}
    #agari-overlay.m8v9-score .limit-grid button{min-height:29px!important;padding:3px 6px!important;font-size:10px!important}
    #agari-overlay.m8v9-score .agari-flow-actions{margin:3px 0 0!important;padding:0!important;gap:5px!important}
    #agari-overlay.m8v9-score .agari-flow-actions button{min-height:34px!important;padding:5px 8px!important;font-size:11px!important}

    /* ③ 役判定後：上端から配置し、確認ボタンは常時押せる */
    #m8-result-v1{align-items:flex-start!important;justify-content:center!important;padding:4px 8px!important;overflow:hidden!important}
    #m8-result-v1 .m8-card{width:min(760px,95vw)!important;max-height:calc(100dvh - 8px)!important;overflow:auto!important;margin:0 auto!important;padding:8px 13px 5px!important;border-radius:16px!important;overscroll-behavior:contain!important}
    #m8-result-v1 .m8-card h2{font-size:22px!important;margin:0 0 3px!important;line-height:1.05!important}
    #m8-result-v1 .m8-card>p{font-size:12px!important;margin:2px 0 5px!important;line-height:1.2!important}
    #m8-result-v1 .m8-yaku-v4{margin:5px 0!important;padding:7px 9px!important;font-size:13px!important}
    #m8-context-v5{margin:5px 0!important;padding:5px 8px!important}
    #m8-context-v5 .m8v5-row{margin:3px 0!important;gap:5px!important}
    #m8-context-v5 .m8v5-label{min-width:58px!important;font-size:11px!important}
    #m8-context-v5 .m8v5-chip{padding:4px 7px!important;font-size:11px!important}
    #m8-context-v5 .m8v5-auto{font-size:11px!important}
    #m8-context-v5 .m8v5-extra{margin-top:4px!important;padding:5px 7px!important;font-size:11px!important}
    #m8-context-v5 .m8v5-han{margin-top:4px!important;font-size:12px!important}
    #m8-result-v1 [id^="m8-fu-start-"]{margin:5px 0!important;padding:6px 8px!important}
    #m8-result-v1 [id^="m8-fu-start-"] .m8v7-win-tiles{gap:2px!important;flex-wrap:nowrap!important;overflow-x:auto!important;padding-bottom:2px!important}
    #m8-result-v1 [id^="m8-fu-start-"] .m8v7-win-tile{flex:0 0 26px!important;width:26px!important;height:33px!important;font-size:19px!important}
    #m8-result-v1 [id^="m8-fu-start-"] .m8v7-fu-note{margin-top:3px!important;font-size:10px!important}
    #m8-result-v1 .m8-card small{font-size:9px!important;line-height:1.15!important}
    #m8-result-v1 .m8-card>button:last-child{position:sticky!important;bottom:0!important;z-index:4!important;min-height:40px!important;margin-top:5px!important;background:#e7e7e7!important;box-shadow:0 -5px 12px rgba(247,243,233,.92)!important}
  }
  .m8v9-recommended{outline:3px solid #23c878!important;outline-offset:-3px!important;box-shadow:0 0 0 2px rgba(35,200,120,.22)!important;background:rgba(35,200,120,.18)!important}
  .m8v9-guide{margin:2px 0 4px;padding:5px 8px;border-radius:8px;background:#eaf8f0;color:#153d29;font-size:11px;font-weight:900;text-align:center}
  `;
  document.head.appendChild(style);

  function agariStep(){try{return typeof agariFlow!=='undefined'?(agariFlow.step||''):'';}catch(_){return '';}}
  function refreshAgariLayout(){
    const overlay=document.getElementById('agari-overlay');if(!overlay)return;
    const score=!!overlay.querySelector('.score-switch-table,.score-dual-grid');
    const step=agariStep();
    // v32: v19 owns the overlay layout; do not re-apply old v9 transform/scale.
    overlay.classList.remove('m8v9-pick','m8v9-score');
  }

  function captureRecommendation(){
    const hanText=document.querySelector('#m8-context-v5 .m8v5-han')?.textContent||'';
    const hm=hanText.match(/(\d+)翻/);if(hm)window.m8SuggestedHanV9=Number(hm[1]);
    const fuRaw=window.m8SuggestedFuV8??window.m8SuggestedFuV7;
    if(Number.isFinite(Number(fuRaw)))window.m8SuggestedFuV9=Number(fuRaw);
  }

  function decorateRecommendedCell(){
    const root=document.querySelector('.score-switch-table');if(!root)return;
    const han=Number(window.m8SuggestedHanV9||window.m8SuggestedHanV6);
    const fu=Number(window.m8SuggestedFuV9||window.m8SuggestedFuV8||window.m8SuggestedFuV7);
    let target=null;
    if(Number.isFinite(han)&&Number.isFinite(fu)&&han>=1&&han<=4){
      for(const table of root.querySelectorAll('table')){
        const rows=[...table.querySelectorAll('tr')];
        const header=rows.find(tr=>[...tr.children].some(c=>c.textContent.trim()===`${han}翻`));if(!header)continue;
        const col=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);if(col<0)continue;
        const row=rows.find(tr=>[...tr.children].some(c=>c.textContent.replace(/\s/g,'').includes(`${fu}符`)));
        if(row?.children[col]){target=row.children[col];break;}
      }
    }
    root.querySelectorAll('.m8v9-recommended').forEach(x=>{if(x!==target)x.classList.remove('m8v9-recommended');});
    if(target&&!target.classList.contains('m8v9-recommended'))target.classList.add('m8v9-recommended');

    const parent=root.parentElement;let guide=parent?.querySelector('.m8v9-guide')||null;
    if(target){
      const text=`M8推奨：${fu}符 ${han}翻（緑枠）`;
      if(!guide){guide=document.createElement('div');guide.className='m8v9-guide';root.insertAdjacentElement('beforebegin',guide);}
      if(guide.textContent!==text)guide.textContent=text;
    }else if(guide){guide.remove();}
  }

  let scheduled=false;
  function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refreshAgariLayout();captureRecommendation();decorateRecommendedCell();});}
  // Recompute when a score table or result is mounted, and after explicit interactions.
  // Do not watch arbitrary childList/characterData changes caused by our own badges.
  new MutationObserver(mutations=>{
    if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(
      n.matches?.('.score-switch-table,#m8-result-v1')||
      n.querySelector?.('.score-switch-table,#m8-result-v1')
    ))))refresh();
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(refresh,0),true);
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  refresh();
})();