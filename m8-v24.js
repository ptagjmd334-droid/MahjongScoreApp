// M8 v24: 点数表安定化 + M8入力状態の復旧保持
(() => {
  const badge=document.getElementById('app-build-badge');
  if(badge) badge.textContent='M8 v24';

  const AUX_KEY='MahjongScoreApp_m8_draft_v24';
  const CORE_KEY='MahjongScoreApp_draft_v1';

  function agariActive(){
    try{return typeof agariFlow!=='undefined'&&!!agariFlow.active;}catch(_){return false;}
  }
  function coreSignature(){
    try{
      return {
        agariType:agariFlow?.type||null,
        winners:Array.isArray(agariFlow?.winners)?[...agariFlow.winners]:[],
        discarder:agariFlow?.discarder||null,
        currentWinnerIndex:Number(agariFlow?.currentWinnerIndex||0)
      };
    }catch(_){
      return {agariType:null,winners:[],discarder:null,currentWinnerIndex:0};
    }
  }
  function firstFinite(values){
    for(const v of values){
      const n=Number(v);
      if(Number.isFinite(n))return n;
    }
    return null;
  }
  function currentAux(){
    if(!agariActive())return null;
    const h=window.m8HandStateV19||window.m8HandStateV18||{};
    const tiles=Array.isArray(h.tiles)&&h.tiles.length===14
      ? h.tiles.slice()
      : (Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[]);
    const win=h.win||window.m8WinningTileV7||null;
    const menzen=(h.menzen===true||h.menzen===false)?h.menzen:null;
    const meldState={...(window.m8MeldStateV21||{})};
    const fu=firstFinite([
      window.m8SuggestedFuV21,
      window.m8SuggestedFuV20,
      window.m8SuggestedFuV18,
      window.m8SuggestedFuV8,
      window.m8SuggestedFuV7
    ]);
    const han=firstFinite([
      window.m8SuggestedHanV23,
      window.m8SuggestedHanV22,
      window.m8SuggestedHanV9,
      window.m8SuggestedHanV6
    ]);
    return {
      version:24,
      savedAt:new Date().toISOString(),
      ...coreSignature(),
      tiles,win,menzen,meldState,fu,han
    };
  }
  function persistAux(){
    const data=currentAux();
    if(!data)return;
    try{localStorage.setItem(AUX_KEY,JSON.stringify(data));}catch(_){}
  }
  function removeAux(){
    try{localStorage.removeItem(AUX_KEY);}catch(_){}
  }
  function readJSON(key){
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(_){return null;}
  }
  function sameArray(a,b){
    return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]);
  }
  function matchesCore(aux,core){
    if(!aux||aux.version!==24||!core||core.type!=='agari'||!core.data)return false;
    const d=core.data;
    return (aux.agariType||null)===(d.agariType||null)
      && sameArray(aux.winners||[],Array.isArray(d.winners)?d.winners:[])
      && (aux.discarder||null)===(d.discarder||null)
      && Number(aux.currentWinnerIndex||0)===Number(d.currentWinnerIndex||0);
  }
  function restoreGlobals(){
    const aux=readJSON(AUX_KEY),core=readJSON(CORE_KEY);
    if(!matchesCore(aux,core))return false;

    const tiles=Array.isArray(aux.tiles)&&aux.tiles.length===14?aux.tiles.slice():[];
    if(tiles.length===14)window.m8LastTilesV8=tiles.slice();
    if(aux.win)window.m8WinningTileV7=aux.win;

    const hand={tiles:tiles.slice(),win:aux.win||null,menzen:(aux.menzen===true||aux.menzen===false)?aux.menzen:null};
    window.m8HandStateV18={...hand,tiles:hand.tiles.slice()};
    window.m8HandStateV19={...hand,tiles:hand.tiles.slice()};
    window.m8MeldStateV21={...(aux.meldState||{})};

    if(Number.isFinite(Number(aux.fu))){
      const fu=Number(aux.fu);
      window.m8SuggestedFuV21=fu;
      window.m8SuggestedFuV20=fu;
      window.m8SuggestedFuV18=fu;
      window.m8SuggestedFuV8=fu;
    }
    if(Number.isFinite(Number(aux.han))){
      const han=Number(aux.han);
      window.m8SuggestedHanV23=han;
      window.m8SuggestedHanV22=han;
      window.m8SuggestedHanV9=han;
      window.m8SuggestedHanV6=han;
    }
    return true;
  }
  function refreshAfterRestore(){
    // 既存パッチの「resize時再装飾」を1回だけ呼び、青/橙/緑のガイドを復元する。
    setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#draft-continue-button-v1')){
      restoreGlobals();
      refreshAfterRestore();
      return;
    }

    // 各UIのclick処理が終わった後の状態を保存する。
    setTimeout(()=>{
      if(agariActive())persistAux();
      else if(e.target.closest?.('#agari-cancel-button,.draft-discard-button,[id^="home-new-match"]'))removeAux();
    },0);
  },true);

  window.addEventListener('beforeunload',persistAux,{passive:true});
  window.addEventListener('pagehide',persistAux,{passive:true});

  // 点数確定後など、アガリ入力が終わったら古い補助データを残さない。
  document.addEventListener('click',()=>setTimeout(()=>{
    if(!agariActive()){
      const core=readJSON(CORE_KEY);
      if(!core||core.type!=='agari')removeAux();
    }
  },40),false);

  window.m8PersistDraftV24=persistAux;
  window.m8RestoreDraftV24=restoreGlobals;
})();
