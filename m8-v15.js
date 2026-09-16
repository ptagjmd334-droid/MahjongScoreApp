// M8 v15: 非点数画面の中央固定 + 点数フッターDOM復元 + 実際の和了フローで符を再計算
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;

  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v15';

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      /* score以外は過去版のvisualViewport offsetに引っ張られず、必ず実画面中央 */
      body>#agari-overlay.m8v15-nonscore:not(.hidden){
        position:fixed!important;
        left:50vw!important;
        top:50dvh!important;
        transform:translate(-50%,-50%)!important;
        transform-origin:center center!important;
        height:auto!important;
        min-height:0!important;
        max-height:calc(100dvh - 12px)!important;
        overflow:visible!important;
        zoom:1!important;
      }
      body>#agari-overlay.m8v15-nonscore .agari-flow-card{
        max-height:calc(100dvh - 12px)!important;
        overflow:visible!important;
      }

      /* 点数表はv11の見やすい大きさに戻し、content内だけスクロール */
      body>#agari-overlay.m8v15-score{
        position:fixed!important;
        left:50vw!important;
        top:50dvh!important;
        width:min(700px,80vw)!important;
        max-height:none!important;
        overflow:visible!important;
        transform:translate(-50%,-50%) scale(.76)!important;
        transform-origin:center center!important;
        zoom:1!important;
      }
      body>#agari-overlay.m8v15-score .agari-flow-card{
        display:block!important;
        max-height:var(--m8v15-card-max,620px)!important;
        overflow:hidden!important;
        padding:5px 8px!important;
      }
      body>#agari-overlay.m8v15-score .agari-flow-top{
        position:relative!important;
        top:auto!important;
        z-index:20!important;
        margin-bottom:3px!important;
        background:#062f26!important;
      }
      body>#agari-overlay.m8v15-score .agari-flow-content{
        display:block!important;
        max-height:var(--m8v15-content-max,540px)!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        padding-bottom:0!important;
      }
      body>#agari-overlay.m8v15-score .agari-flow-content>.agari-flow-actions{
        position:sticky!important;
        left:auto!important;
        right:auto!important;
        bottom:0!important;
        z-index:60!important;
        display:flex!important;
        margin:4px 0 0!important;
        padding:5px 0 max(3px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;
        box-shadow:0 -7px 13px rgba(6,47,38,.92)!important;
      }
    }
  `;
  document.head.appendChild(style);

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);

  let cachedHand=null;

  function isScore(){return !!overlay.querySelector('.score-switch-table,.score-dual-grid');}
  function viewportHeight(){return document.documentElement.clientHeight||window.innerHeight||520;}

  function restoreFooterIntoContent(){
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;
    const direct=[...card.children].filter(x=>x.classList?.contains('agari-flow-actions'));
    if(direct.length){
      const keep=direct.at(-1);
      direct.slice(0,-1).forEach(x=>x.remove());
      if(keep.parentElement!==content)content.appendChild(keep);
      keep.classList.remove('m8v14-score-footer');
    }
  }

  function cleanupLegacyScoreClasses(){
    ['m8v7-score','m8v10-score','m8v11-score','m8v13-score','m8v14-score'].forEach(c=>overlay.classList.remove(c));
  }

  function applyLayout(){
    const score=isScore();
    if(score){
      overlay.classList.remove('m8v15-nonscore');
      overlay.classList.add('m8v15-score');
      restoreFooterIntoContent();
      const h=viewportHeight();
      // scale(.76)前の高さ。下部操作列を含めても実画面に収まる。
      overlay.style.setProperty('--m8v15-card-max',`${Math.max(420,(h-12)/.76)}px`);
      overlay.style.setProperty('--m8v15-content-max',`${Math.max(330,(h-72)/.76)}px`);
    }else{
      overlay.classList.remove('m8v15-score');
      overlay.classList.add('m8v15-nonscore');
      cleanupLegacyScoreClasses();
      // v13/v14がscore時にcard直下へ移した操作列は、非score画面では古い残骸なので削除。
      const card=overlay.querySelector('.agari-flow-card');
      if(card){
        [...card.children]
          .filter(x=>x.classList?.contains('agari-flow-actions'))
          .forEach(x=>x.remove());
      }
    }
  }

  function resultRoot(){return document.getElementById('m8-result-v1');}
  function captureResult(){
    const root=resultRoot();
    if(!root)return;
    const tiles=Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
    if(tiles.length!==14)return;
    const judged=window.judgeMahjongWinM8V4?.(tiles);
    const box=root.querySelector('#m8-fu-start-v7');
    const win=window.m8WinningTileV7||box?.querySelector('.m8v7-win-tile.active')?.dataset.tile||null;
    const m=root.querySelector('#m8-context-v5 [data-menzen].active');
    const menzen=m?m.dataset.menzen==='1':true;
    cachedHand={tiles,win,type:judged?.type||null,menzen};
    window.m8CachedHandV15={...cachedHand,tiles:tiles.slice()};
  }

  function decompositions(tiles){
    const c=Array(34).fill(0);
    for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const out=[];
    function take(counts,arr){
      const i=counts.findIndex(n=>n>0);
      if(i<0){out.push(arr.slice());return;}
      if(counts[i]>=3){counts[i]-=3;take(counts,[...arr,{type:'triplet',i}]);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;take(counts,[...arr,{type:'sequence',i}]);counts[i]++;counts[i+1]++;counts[i+2]++;}
    }
    const result=[];
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;const before=out.length;take(x,[]);for(let k=before;k<out.length;k++)if(out[k].length===4)result.push({pair:p,melds:out[k]});}
    return result;
  }
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}
  function roundWind(){return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';}
  function pairFu(i,winner){const t=tileOrder[i];let n=0;if(['白','發','中'].includes(t))n+=2;if(t===seatWind(winner))n+=2;if(t===roundWind())n+=2;return n;}
  function waitOptions(d,win){
    const wi=tileIndex.get(win);if(wi==null)return[];const out=[];
    if(d.pair===wi)out.push({wait:'単騎',target:'pair'});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){const r=m.i%9;let wait='両面';if(wi===m.i+1)wait='嵌張';else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';out.push({wait,target:'sequence',mi});}
    });
    return out;
  }
  function tripletFu(i,closed){const t=tileOrder[i],yaochu=honors.has(t)||terminals.has(t);return closed?(yaochu?8:4):(yaochu?4:2);}

  function calculateFuFromActualFlow(){
    const hand=cachedHand||window.m8CachedHandV15;
    if(!hand||!Array.isArray(hand.tiles)||hand.tiles.length!==14)return[];
    const judged=window.judgeMahjongWinM8V4?.(hand.tiles);
    if(!judged?.win)return[];
    if(judged.type==='七対子')return[25];
    if(judged.type==='国士無双')return[];
    if(!hand.win)return[];

    let winner=null,type=null;
    try{
      winner=Array.isArray(agariFlow?.winners)?agariFlow.winners[agariFlow.currentWinnerIndex||0]||agariFlow.winners[0]:null;
      type=agariFlow?.type||null;
    }catch(_){ }
    if(!winner||!['ron','tsumo'].includes(type))return[];
    const menzen=hand.menzen!==false;
    const vals=new Set();
    decompositions(hand.tiles).forEach(d=>{
      waitOptions(d,hand.win).forEach(opt=>{
        const pf=pairFu(d.pair,winner);
        const wf=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfu=menzen&&allSeq&&pf===0&&opt.wait==='両面';
        if(pinfu&&type==='tsumo'){vals.add(20);return;}
        const base=20+(menzen&&type==='ron'?10:0)+(type==='tsumo'?2:0)+pf+wf;
        const trips=d.melds.map((m,mi)=>({m,mi})).filter(x=>x.m.type==='triplet');
        if(menzen){
          let mf=0;
          trips.forEach(({m,mi})=>{const opened=type==='ron'&&opt.target==='triplet'&&opt.mi===mi;mf+=tripletFu(m.i,!opened);});
          vals.add(Math.ceil((base+mf)/10)*10);
        }else{
          let min=base,max=base;
          trips.forEach(({m})=>{min+=tripletFu(m.i,false);max+=tripletFu(m.i,true);});
          min=Math.max(30,Math.ceil(min/10)*10);max=Math.max(30,Math.ceil(max/10)*10);
          for(let n=min;n<=max;n+=10)vals.add(n);
        }
      });
    });
    return [...vals].sort((a,b)=>a-b);
  }

  function publishActualFu(){
    if(!isScore())return;
    const vals=calculateFuFromActualFlow();
    if(!vals.length)return;
    window.m8FuCandidatesV15=vals.slice();
    window.m8FuCandidatesV13=vals.slice();
    window.m8FuCandidatesV12=vals.slice();
    window.m8FuCandidatesV11=vals.slice();
    window.m8SuggestedFuV8=vals.length===1?vals[0]:null;
    window.m8SuggestedFuV11=vals.length===1?vals[0]:null;
    // 既存v11/v10の推薦UIを再評価させる。
    overlay.classList.toggle('m8v15-fu-ready',!overlay.classList.contains('m8v15-fu-ready'));
  }

  function updateResultNote(){
    const root=resultRoot();if(!root)return;
    [...root.querySelectorAll('small')].forEach(s=>{
      if(/M8 v[58]|接続中/.test(s.textContent||'')){
        s.textContent='※ 符は和了牌・手牌状態から候補を取り、和了者とロン/ツモ確定後に点数表で再計算します。';
      }
    });
  }

  document.addEventListener('click',e=>{
    const confirm=e.target.closest?.('#m8-result-v1 .m8-card>button:last-child');
    if(confirm)captureResult();
    setTimeout(()=>{applyLayout();publishActualFu();updateResultNote();},0);
  },true);

  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{
    applyLayout();
    publishActualFu();
    updateResultNote();
  }));
  obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,()=>requestAnimationFrame(applyLayout),{passive:true}));

  updateResultNote();
  applyLayout();
})();