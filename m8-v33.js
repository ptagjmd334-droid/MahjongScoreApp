// M8 v33: everyday scoring has one primary action; verification tools remain folded.
(()=>{
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v33';
  const css=document.createElement('style');
  css.id='m8v33-simple-score-style';
  css.textContent=[
    // Hide duplicate *explanations*, never the score table, selected result or its green suggested action.
    'body>#agari-overlay.m8v19-score .m8v6-han-guide,body>#agari-overlay.m8v19-score .m8v9-guide,body>#agari-overlay.m8v19-score #m8v25-score-summary,body>#agari-overlay.m8v19-score #m8v21-score-fu,body>#agari-overlay.m8v19-score #m8v18-score-fu,body>#agari-overlay.m8v19-score .m8v18-auto-score{display:none!important}',
    'body>#agari-overlay.m8v19-score #m8v33-quickhelp{flex:none;margin:2px 0 4px;padding:6px 9px;border-radius:8px;background:#e8f7ee;color:#153d29;font:800 12px/1.3 -apple-system,BlinkMacSystemFont,sans-serif;text-align:center}',
    'body>#agari-overlay.m8v19-score .m8v21-auto{display:block!important;min-height:38px!important;padding:7px 10px!important;font-size:13px!important;margin:3px 0 5px!important;background:#d5fbe3!important}',
    'body>#agari-overlay.m8v19-score #m8v30-review{background:rgba(240,253,247,.95);padding:4px 8px!important;margin:2px 0 5px!important}',
    'body>#agari-overlay.m8v19-score #m8v30-review summary{font-size:11px!important;font-weight:750!important}',
    'body>#agari-overlay.m8v19-score .agari-flow-content{gap:5px!important}',
    'body>#agari-overlay.m8v19-score .score-selected-summary{font-size:12px!important;margin:2px 0!important}',
    // The scoring review can open into its existing scroll body without growing the card/footer.
    'body>#agari-overlay.m8v19-score #m8v30-review[open]{flex:none!important}'
  ].join('\n');
  document.head.appendChild(css);

  function refresh(){
    if(overlay.classList.contains('hidden'))return;
    const table=overlay.querySelector('.score-switch-table');
    if(!table)return;
    const content=overlay.querySelector('.agari-flow-content');
    if(!content)return;
    const existing=content.querySelector('#m8v33-quickhelp');
    let note=existing;
    if(!note){
      note=document.createElement('div');
      note.id='m8v33-quickhelp';
      const guide=content.querySelector('.m8v21-auto');
      (guide||table).insertAdjacentElement('beforebegin',note);
    }
    const hasRecommendation=!!content.querySelector('.m8v21-auto');
    const help=hasRecommendation
      ? '① 下の「M8推奨」を押す　→　② 点数を確認して「次へ」'
      : '符・翻を選び、下の点数表から点数を選択（または「点数を直接入力」）';
    if(note.textContent!==help)note.textContent=help;
    const details=content.querySelector('#m8v30-review > summary');
    if(details&&details.textContent!=='判定の詳細・実卓での検証（任意）')
      details.textContent='判定の詳細・実卓での検証（任意）';
  }
  // Existing score widgets are recreated on user navigation: run once *after* core click handlers.
  // No MutationObserver, no recursive DOM/style updates or periodic polling.
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#agari-overlay,#game-screen,#draft-continue-button-v1'))
      setTimeout(refresh,80);
  },true);
  window.addEventListener('pageshow',()=>setTimeout(refresh,80),{passive:true});
  refresh();
})();