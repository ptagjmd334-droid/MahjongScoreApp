// M8 v12: 通常形の和了牌選択を必須化 + 複数符候補の取りこぼし修正
(() => {
  function resultRoot(){ return document.getElementById('m8-result-v1'); }

  function isStandardResult(root){
    const text=root?.textContent||'';
    return text.includes('成立形：通常形');
  }

  function parseFuCandidates(){
    const root=resultRoot();
    if(!root)return [];
    const detail=root.querySelector('.m8v8-fu-detail')?.textContent||'';
    // 例: 「符候補：30・40符」でも 30 と 40 の両方を拾う。
    const nums=(detail.match(/\d+/g)||[]).map(Number).filter(n=>Number.isFinite(n));
    const unique=[...new Set(nums)].sort((a,b)=>a-b);
    if(unique.length){
      window.m8FuCandidatesV12=unique;
      window.m8FuCandidatesV11=unique.slice();
      return unique;
    }
    const fixed=Number(window.m8SuggestedFuV8 ?? window.m8SuggestedFuV7);
    if(Number.isFinite(fixed)){
      window.m8FuCandidatesV12=[fixed];
      window.m8FuCandidatesV11=[fixed];
      return [fixed];
    }
    return [];
  }

  function showRequired(root){
    const box=root?.querySelector('#m8-fu-start-v7');
    if(!box)return;
    let warn=box.querySelector('.m8v12-required');
    if(!warn){
      warn=document.createElement('div');
      warn.className='m8v12-required';
      warn.style.cssText='margin-top:6px;padding:6px 8px;border-radius:8px;background:#ffe5e5;color:#8a1f1f;font-size:12px;font-weight:900;text-align:center';
      box.appendChild(warn);
    }
    warn.textContent='通常形は和了牌の選択が必須です。上の牌から和了牌を1枚選んでください。';
    box.scrollIntoView({block:'nearest',behavior:'smooth'});
  }

  function markSelectionReady(){
    const root=resultRoot();
    if(!root)return;
    const warn=root.querySelector('.m8v12-required');
    if(warn && window.m8WinningTileV7)warn.remove();
    parseFuCandidates();
  }

  // 結果画面の「確認」を押す直前に、通常形なら和了牌選択を必須にする。
  document.addEventListener('click',e=>{
    const root=e.target.closest?.('#m8-result-v1');
    if(!root)return;

    if(e.target.closest?.('.m8v7-win-tile')){
      setTimeout(markSelectionReady,0);
      return;
    }

    const confirm=e.target.closest?.('#m8-result-v1 .m8-card>button:last-child');
    if(!confirm)return;

    if(isStandardResult(root) && !window.m8WinningTileV7 && !root.querySelector('.m8v7-win-tile.active')){
      e.preventDefault();
      e.stopImmediatePropagation();
      showRequired(root);
      return;
    }

    parseFuCandidates();
  },true);

  // v31: v8の符候補の変更は結果画面内だけ監視すればよい。
  // body全体のcharacterData監視はscore reviewの文章更新/入力まで毎回解析し、iPhoneでの過剰処理になる。
  const observer=new MutationObserver(()=>parseFuCandidates());
  let observedResult=null;
  function observeFuResult(root){
    if(root===observedResult)return;
    observer.disconnect();observedResult=root;
    if(root)observer.observe(root,{childList:true,subtree:true,characterData:true});
  }

  // 画面遷移で前回の通常形の和了牌が残らないよう、新しい結果画面生成時に初期化。
  let lastResult=null;
  const resetObserver=new MutationObserver(()=>{
    const r=resultRoot();
    observeFuResult(r);
    if(r && r!==lastResult){
      lastResult=r;
      window.m8WinningTileV7=null;
      window.m8FuCandidatesV12=[];
      window.m8FuCandidatesV11=[];
      setTimeout(parseFuCandidates,0);
    }
    if(!r)lastResult=null;
  });
  resetObserver.observe(document.body,{childList:true,subtree:true});
  observeFuResult(resultRoot());
})();
