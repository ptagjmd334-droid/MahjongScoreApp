// M8 v27: method opening is centered immediately; starting dealer badge stays at lower-right.
(()=>{
 const overlay=document.getElementById('agari-overlay');
 if(!overlay)return;
 const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M8 v27';
 const style=document.createElement('style');
 style.textContent=`
 #game-screen .player-panel .starting-dealer-badge-v1{
 top:auto!important;bottom:-9px!important;right:-9px!important;left:auto!important;
 }
 body>#agari-overlay.m8v27-method{
 position:fixed!important;left:50%!important;top:50%!important;
 right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;
 width:min(510px,56vw)!important;max-width:min(510px,56vw)!important;
 height:auto!important;max-height:80dvh!important;zoom:1!important;
 pointer-events:auto!important;
 }
 body>#agari-overlay.m8v27-method>.agari-flow-card{
 width:100%!important;max-width:100%!important;height:auto!important;
 max-height:80dvh!important;overflow-y:auto!important;
 }
 `;
 document.head.appendChild(style);
 const method=()=>{try{return agariFlow.step==='method';}catch(_){return false;}};
 function refresh(){
  const active=!overlay.classList.contains('hidden')&&method();
  overlay.classList.toggle('m8v27-method',active);
  if(active){
   overlay.style.setProperty('top','50%','important');
   overlay.style.setProperty('left','50%','important');
   overlay.style.setProperty('transform','translate(-50%,-50%)','important');
  }
 }
 // v27 next feature: 点数表で「判定に使った入力内容」を展開表示できる。
 // 装飾は1回生成、値が変わった時だけtextを更新し、監視の自己再発火を防ぐ。
 function finite(...values){
  for(const v of values){if(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))return Number(v);}
  return null;
 }
 function showScoringInputs(){
  const table=overlay.querySelector('.score-switch-table');
  const existing=overlay.querySelector('#m8v27-input-review');
  if(!table){existing?.remove();return;}
  const hand=window.m8HandStateV19||window.m8HandStateV18||{};
  const tiles=Array.isArray(hand.tiles)?hand.tiles:window.m8LastTilesV8;
  const n=Array.isArray(tiles)?tiles.length:0;
  const win=hand.win||window.m8WinningTileV7||'未指定';
  const menzen=hand.menzen===true?'門前':hand.menzen===false?'副露あり':'未確定';
  const han=finite(window.m8SuggestedHanV23,window.m8SuggestedHanV22,window.m8SuggestedHanV9,window.m8SuggestedHanV6);
  const fu=finite(window.m8SuggestedFuV21,window.m8SuggestedFuV20,window.m8SuggestedFuV18,window.m8SuggestedFuV8);
  const meld=window.m8MeldStateV21||{};
  const meldText=Object.entries(meld).filter(([,v])=>v&&v!=='none').map(([k,v])=>k+'：'+v).join(' / ')||'指定なし';
  const label='手牌'+n+'枚 / 和了牌 '+win+' / '+menzen+' / '+(fu??'未確定')+'符 / '+(han??'未確定')+'翻 / 面子：'+meldText;
  let review=existing;
  if(!review){
   review=document.createElement('details');
   review.id='m8v27-input-review';
   review.style.cssText='margin:4px 0 6px;padding:5px 9px;border-radius:8px;background:#eef7f2;color:#163c2b;font-size:11px;flex:none';
   const summary=document.createElement('summary');
   summary.textContent='判定に使った情報を確認';
   summary.style.cssText='cursor:pointer;font-weight:800';
   const detail=document.createElement('div');detail.className='m8v27-review-value';
   detail.style.cssText='padding:4px 0 0;overflow-wrap:anywhere';
   review.append(summary,detail);
   table.insertAdjacentElement('beforebegin',review);
  }
  const value=review.querySelector('.m8v27-review-value');
  if(value&&value.textContent!==label)value.textContent=label;
 }
 // Observe visibility and flow content mutations: opening via game buttons can happen
 // after capture-phase click callbacks, so click-only positioning misses first render.
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{pending=false;refresh();showScoringInputs();});
 });
 observer.observe(overlay,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('click',()=>requestAnimationFrame(()=>{refresh();showScoringInputs();}),true);
 window.addEventListener('pageshow',refresh);
 refresh();showScoringInputs();
})();