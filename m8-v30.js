// M8 v31: compact, stable score table + last 3 real-table comparisons. No subtree observer.
(()=>{
 const overlay=document.getElementById('agari-overlay');if(!overlay)return;
 const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M7 v38';
 const KEY='MahjongScoreApp_last_comparison_v30';
 const HISTORY_KEY='MahjongScoreApp_comparison_history_v31';
 const css=document.createElement('style');
 css.textContent=[
 '#game-screen .player-panel .starting-dealer-badge-v1{top:auto!important;bottom:-9px!important;right:-9px!important;left:auto!important}',
 'body>#agari-overlay.m8v30-type{position:fixed!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(620px,66vw)!important;max-width:min(620px,66vw)!important;height:auto!important;max-height:80dvh!important;zoom:1!important}',
 'body>#agari-overlay.m8v30-type>.agari-flow-card{width:100%!important;max-width:100%!important;height:auto!important;max-height:80dvh!important;overflow-y:auto!important}',
 '#m8v30-review{margin:4px 0 7px;padding:6px 9px;border-radius:7px;background:#e9f7ef;color:#153d29;font-size:11px;flex:none}',
 '#m8v30-review summary{font-weight:900;cursor:pointer}',
 '#m8v30-review button{min-height:30px;padding:5px 8px;background:#176a4a;color:#fff;border:0;border-radius:6px;font-weight:800;font-size:11px;margin:4px}',
 '#m8v30-review input{width:65px;min-width:0;padding:4px;border-radius:5px;border:1px solid #96bca6;background:white;color:#173b2a}',
 '#m8v30-review label{display:inline-flex;gap:4px;align-items:center;margin:4px}',
 '#m8v30-result{font-weight:800;overflow-wrap:anywhere;margin:4px}',
 '#m8v30-fallback{display:none;width:100%;min-height:40px;font-size:11px}',
 // v31: keep score inputs useful after a draft restore; avoid six stacked recommendation banners.
 'body>#agari-overlay.m8v19-score{zoom:1!important;max-height:calc(100dvh - 8px)!important}',
 'body>#agari-overlay.m8v19-score>.agari-flow-card{display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;max-height:calc(100dvh - 8px)!important;overflow:hidden!important}',
 'body>#agari-overlay.m8v19-score>.agari-flow-card>.agari-flow-content{min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch!important}',
 'body>#agari-overlay.m8v19-score .agari-flow-content>#m8v18-score-fu,body>#agari-overlay.m8v19-score .agari-flow-content>.m8v18-auto-score{display:none!important}',
 'body>#agari-overlay.m8v19-score .agari-flow-content>#m8v21-score-fu{font-size:11px!important;padding:4px 7px!important;margin:2px 0 3px!important}',
 'body>#agari-overlay.m8v19-score .agari-flow-content>#m8v25-score-summary{font-size:11px!important;padding:4px 7px!important;margin:2px 0 3px!important}',
 'body>#agari-overlay.m8v19-score .agari-flow-content>.m8v21-auto{font-size:11px!important;min-height:27px!important;padding:3px 6px!important;margin:2px 0!important}',
 'body>#agari-overlay.m8v19-score #m8v30-review{font-size:11px!important;padding:4px 7px!important;margin:2px 0 4px!important}',
 'body>#agari-overlay.m8v19-score .score-switch-table{margin:2px 0!important;flex:none!important}',
 'body>#agari-overlay.m8v19-score .agari-flow-actions.m8v19-score-footer{grid-row:3!important;position:relative!important;bottom:auto!important;flex:none!important}'

 ].join('\n');document.head.appendChild(css);
 const finite=(...vals)=>{for(const v of vals){if(v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v)))return Number(v);}return null;};
 function facts(){
  const hand=window.m8HandStateV19||window.m8HandStateV18||{};
  const tiles=Array.isArray(hand.tiles)&&hand.tiles.length===14?hand.tiles.slice():
    Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
  const raw=[window.m8SuggestedHanV23,window.m8SuggestedHanV22,window.m8SuggestedHanV9,window.m8SuggestedHanV6].find(x=>x!==null&&x!==undefined&&x!=='');
  let type='未取得',winner='未取得';
  try{type=agariFlow.type==='ron'?'ロン':agariFlow.type==='tsumo'?'ツモ':'未取得';
      winner=agariFlow.winners?.[agariFlow.currentWinnerIndex]||agariFlow.winners?.[0]||'未取得';}catch(_){}
  return {tiles,win:hand.win||window.m8WinningTileV7||'未指定',
   menzen:hand.menzen===true?'門前':hand.menzen===false?'副露あり':'未確定',
   fu:finite(window.m8SuggestedFuV21,window.m8SuggestedFuV20,window.m8SuggestedFuV18,window.m8SuggestedFuV8),
   han:raw==='yakuman'?'役満':finite(raw),type,winner};
 }
 function header(f){return '手牌'+f.tiles.length+'枚 / 和了牌 '+f.win+' / '+f.menzen+
   ' / '+(f.fu??'未確定')+'符 / '+(f.han??'未確定')+'翻 / '+f.type+' / 和了者 '+f.winner;}
 function showCopy(root,result,report){
  const output=root.querySelector('#m8v30-fallback');
  function fallback(){output.value=report;output.style.display='block';output.focus();output.select();result.textContent='下の文章をコピーしてください';}
  if(!navigator.clipboard?.writeText){fallback();return;}
  navigator.clipboard.writeText(report).then(()=>{result.textContent+='（コピーしました）';output.style.display='none';}).catch(fallback);
 }
 function mountFields(root){
  if(root.querySelector('#m8v30-fields'))return;
  const body=document.createElement('div');body.id='m8v30-fields';
  const info=document.createElement('div');info.id='m8v30-info';info.textContent=header(facts());
  const fuLabel=document.createElement('label');fuLabel.textContent='実卓の符';
  const fu=document.createElement('input');fu.type='number';fu.min='20';fu.max='110';fu.inputMode='numeric';fu.placeholder='40';fuLabel.append(fu);
  const hanLabel=document.createElement('label');hanLabel.textContent='実卓の翻';
  const han=document.createElement('input');han.type='number';han.min='1';han.max='13';han.inputMode='numeric';han.placeholder='2';hanLabel.append(han);
  const current=document.createElement('button');current.type='button';current.textContent='判定情報をコピー';
  const compare=document.createElement('button');compare.type='button';compare.textContent='比較して保存・コピー';
  const previous=document.createElement('button');previous.type='button';previous.textContent='前回の結果';
  const history=document.createElement('button');history.type='button';history.textContent='直近3件の履歴';
  const memo=document.createElement('textarea');memo.id='m8v30-memo';memo.placeholder='実卓で気づいたこと（任意）';memo.style.cssText='display:block;width:100%;height:35px;font-size:11px;margin:4px 0;background:white;color:#173b2a';
  const result=document.createElement('div');result.id='m8v30-result';
  const output=document.createElement('textarea');output.readOnly=true;output.id='m8v30-fallback';
  body.append(info,fuLabel,hanLabel,memo,current,compare,previous,history,result,output);root.append(body);
  current.addEventListener('click',e=>{e.stopPropagation();const f=facts();result.textContent='判定情報';showCopy(root,result,[header(f),'手牌：'+f.tiles.join(' '),'メモ：'+(memo.value.trim()||'なし')].join('\n'));});
  compare.addEventListener('click',e=>{
   e.stopPropagation();
   const a=fu.value.trim(),b=han.value.trim(),f=facts();
   if(!a&&!b){result.textContent='符または翻を入力してください';return;}
   const valid=(v,min,max)=>v===''?null:Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):NaN;
   const fv=valid(a,20,110),hv=valid(b,1,13);
   if(Number.isNaN(fv)||Number.isNaN(hv)){result.textContent='符20～110、翻1～13の整数を入力してください';return;}
   const labels=[];
   if(fv!==null)labels.push(f.fu===null?'符：アプリ未確定':f.fu===fv?'符：一致':'符：差あり（アプリ'+f.fu+'符 / 実卓'+fv+'符）');
   if(hv!==null)labels.push(f.han===null?'翻：アプリ未確定':f.han===hv?'翻：一致':'翻：差あり（アプリ'+f.han+'翻 / 実卓'+hv+'翻）');
   const report=['麻雀対局管理アプリ M8 v31 実卓照合',header(f),'手牌：'+f.tiles.join(' '),
     '実卓：'+(fv??'未入力')+'符 / '+(hv??'未入力')+'翻','比較：'+labels.join(' / '),'メモ：'+(memo.value.trim()||'なし')].join('\n');
   try{
     const savedAt=new Date().toISOString();
     localStorage.setItem(KEY,JSON.stringify({text:report,savedAt}));
     let old=[];try{old=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(_){}
     const list=[{text:report,savedAt},...(Array.isArray(old)?old:[])].slice(0,3);
     localStorage.setItem(HISTORY_KEY,JSON.stringify(list));
   }catch(_){}
   result.textContent=labels.join(' / ')+'（前回の結果として保存）';
   showCopy(root,result,report);
  });
  history.addEventListener('click',e=>{
    e.stopPropagation();
    let items=[];try{items=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(_){}
    if(!Array.isArray(items)||!items.length){
      result.textContent='保存した履歴はまだありません';return;
    }
    const listing=items.slice(0,3).map((entry,i)=>{
      const date=entry?.savedAt?new Date(entry.savedAt).toLocaleString('ja-JP'):'日時不明';
      return '【'+(i+1)+'件目 '+date+'】\n'+(entry?.text||'');
    }).join('\n\n');
    result.textContent='直近'+Math.min(3,items.length)+'件の履歴';
    showCopy(root,result,listing);
  });
  previous.addEventListener('click',e=>{
   e.stopPropagation();
   let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){}
   if(!saved?.text){result.textContent='前回の記録はありません';return;}
   result.textContent='前回の記録：'+saved.text.replace(/\n/g,' / ');
   showCopy(root,result,saved.text);
  });
 }
 function ensureReview(){
  if(overlay.classList.contains('hidden'))return;
  const table=overlay.querySelector('.score-switch-table');
  if(!table)return;
  if(overlay.querySelector('#m8v30-review'))return;
  const review=document.createElement('details');review.id='m8v30-review';
  const summary=document.createElement('summary');summary.textContent='判定情報・実卓採点を確認';review.append(summary);
  table.insertAdjacentElement('beforebegin',review);
  review.addEventListener('toggle',()=>{if(!review.open)return;mountFields(review);
    const info=review.querySelector('#m8v30-info');if(info)info.textContent=header(facts());});
 }
 function refreshType(){
  let active=false;
  try{active=!overlay.classList.contains('hidden')&&agariFlow.step==='type';}catch(_){}
  if(overlay.classList.contains('m8v30-type')!==active)overlay.classList.toggle('m8v30-type',active);
 }
 // Only observe the overlay's own visibility class, never descendants or the review's DOM.
 new MutationObserver(()=>refreshType()).observe(overlay,{attributes:true,attributeFilter:['class']});
 document.addEventListener('click',e=>{
  if(e.target.closest?.('#agari-overlay,#game-screen,#draft-continue-button-v1'))setTimeout(ensureReview,0);
  requestAnimationFrame(refreshType);
 },true);
 window.addEventListener('pageshow',()=>{refreshType();setTimeout(ensureReview,60);},{passive:true});
 refreshType();ensureReview();
})();