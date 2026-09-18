// M8 v18: 点数表を大きく・真中央 + 操作列を実フッター化 + 符計算の状態受け渡しを一本化
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v18';

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);

  let handState={tiles:[],win:null,menzen:null};
  let layoutQueued=false;
  let lastResultRoot=null;

  const style=document.createElement('style');
  style.textContent=`
    #m8v18-result-fu{
      margin-top:5px;padding:6px 8px;border-radius:9px;background:#eef8f1;color:#153d29;
      font-size:11px;font-weight:900;text-align:center;
    }
    #m8v18-score-fu{
      margin:4px 0 6px;padding:6px 8px;border-radius:9px;background:#fff4d8;color:#26392f;
      font-size:12px;font-weight:900;text-align:center;flex:none;
    }
    #m8v18-score-fu .m8v18-fu-buttons{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin-top:5px}
    #m8v18-score-fu button{min-width:68px;min-height:32px;padding:5px 9px;border:1px solid #c8a546;border-radius:8px;background:#fff;color:#173129;font-weight:900}
    #m8v18-score-fu button.active{background:#dff5e8;outline:3px solid #23c878;outline-offset:-2px}
    .m8v18-fu-row{outline:2px solid #f0b323!important;outline-offset:-2px!important;background:rgba(240,179,35,.10)!important}
    .m8v18-fu-cell{outline:3px solid #23c878!important;outline-offset:-3px!important;background:rgba(35,200,120,.20)!important}
    .m8v18-auto-score{display:block;width:100%;margin:3px 0 5px;padding:6px 9px;border:0;border-radius:9px;background:#dff5e8;color:#153d29;font-size:11px;font-weight:900}
    @media (orientation:landscape){
      body>#agari-overlay.m8v18-score{
        overflow:visible!important;zoom:1!important;
      }
      body>#agari-overlay.m8v18-score .agari-flow-card{
        display:flex!important;flex-direction:column!important;overflow:hidden!important;
        padding:7px 10px!important;zoom:1!important;transform:none!important;
      }
      body>#agari-overlay.m8v18-score .agari-flow-top{flex:none!important;margin-bottom:5px!important}
      body>#agari-overlay.m8v18-score .agari-flow-content{
        flex:1 1 auto!important;min-height:0!important;max-height:none!important;
        overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;
        touch-action:pan-y!important;overscroll-behavior:contain!important;padding-bottom:4px!important;
      }
      body>#agari-overlay.m8v18-score>.agari-flow-card>.agari-flow-actions.m8v18-score-footer{
        position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
        flex:none!important;display:flex!important;width:100%!important;margin:5px 0 0!important;
        padding:6px 0 max(4px,env(safe-area-inset-bottom))!important;background:#062f26!important;
        box-shadow:0 -5px 12px rgba(6,47,38,.72)!important;z-index:100!important;
      }
      body>#agari-overlay.m8v18-score>.agari-flow-card>.agari-flow-actions.m8v18-score-footer button{
        min-height:36px!important;padding:6px 9px!important;font-size:12px!important;
      }
    }
  `;
  document.head.appendChild(style);

  function setImportant(el,prop,value){if(el)el.style.setProperty(prop,value,'important');}

  function appRect(){
    const game=document.getElementById('game-screen');
    const r=game?.getBoundingClientRect();
    if(r&&r.width>200&&r.height>120)return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    const v=window.visualViewport;
    const left=v?.offsetLeft||0,top=v?.offsetTop||0;
    const width=v?.width||document.documentElement.clientWidth||window.innerWidth||844;
    const height=v?.height||document.documentElement.clientHeight||window.innerHeight||390;
    return {left,top,width,height,right:left+width,bottom:top+height};
  }

  function isScore(){return !!overlay.querySelector('.score-switch-table,.score-dual-grid');}

  function clearLegacyClasses(){
    ['m8v7-score','m8v7-player-pick','m8v10-score','m8v10-type','m8v10-pick','m8v10-generic','m8v11-score','m8v13-score','m8v14-score','m8v15-score','m8v15-nonscore','m8v16-score','m8v16-nonscore','m8v17-score','m8v17-nonscore'].forEach(c=>overlay.classList.remove(c));
  }

  function moveScoreFooter(){
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;
    const stale=[...card.children].filter(x=>x.classList?.contains('m8v18-score-footer'));
    const current=content.querySelector(':scope > .agari-flow-actions');
    if(current){
      stale.forEach(x=>x.remove());
      current.classList.add('m8v18-score-footer');
      card.appendChild(current);
    }else if(stale.length>1){
      stale.slice(0,-1).forEach(x=>x.remove());
    }
  }

  function cleanupScoreFooter(){
    const card=overlay.querySelector('.agari-flow-card');
    [...(card?.children||[])].filter(x=>x.classList?.contains('m8v18-score-footer')).forEach(x=>x.remove());
  }

  function centerAgari(){
    // v25: v19以降がアガリoverlayのレイアウト責務を持つ。
    // v18まで同時にwidth/positionを書き換えると、クリック方向によって最後に走った版が変わり幅が揺れる。
    if(window.m8AgariLayoutOwnerV19Plus)return;
    if(overlay.classList.contains('hidden'))return;
    const a=appRect(),cx=a.left+a.width/2,cy=a.top+a.height/2,score=isScore();
    clearLegacyClasses();
    overlay.classList.toggle('m8v18-score',score);
    overlay.classList.toggle('m8v18-nonscore',!score);

    setImportant(overlay,'position','fixed');
    setImportant(overlay,'left',`${cx}px`);setImportant(overlay,'top',`${cy}px`);
    setImportant(overlay,'right','auto');setImportant(overlay,'bottom','auto');
    setImportant(overlay,'margin','0');setImportant(overlay,'zoom','1');
    setImportant(overlay,'height','auto');setImportant(overlay,'min-height','0');
    setImportant(overlay,'transform','translate(-50%,-50%)');setImportant(overlay,'transform-origin','center center');

    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(score){
      // v17の0.76倍縮小が「小さい」直接原因。v18は縮小せず、本文だけスクロールさせる。
      const width=Math.min(780,a.width*.88);
      setImportant(overlay,'width',`${width}px`);setImportant(overlay,'max-height',`${a.height-10}px`);setImportant(overlay,'overflow','visible');
      setImportant(card,'width','100%');setImportant(card,'height',`${a.height-10}px`);setImportant(card,'max-height',`${a.height-10}px`);
      setImportant(content,'max-height','none');
      moveScoreFooter();
    }else{
      cleanupScoreFooter();
      const width=Math.min(680,a.width*.78);
      setImportant(overlay,'width',`${width}px`);setImportant(overlay,'max-height',`${a.height-12}px`);setImportant(overlay,'overflow','visible');
      setImportant(card,'height','auto');setImportant(card,'max-height',`${a.height-12}px`);setImportant(card,'overflow','visible');
    }

    // 実測値で真中心を検算して補正。data属性に誤差を残すので再発時も原因を追える。
    requestAnimationFrame(()=>{
      if(overlay.classList.contains('hidden'))return;
      const r=overlay.getBoundingClientRect();if(!r.width||!r.height)return;
      const dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2);
      overlay.dataset.m8v18CenterError=`${dx.toFixed(1)},${dy.toFixed(1)}`;
      if(Math.abs(dx)>1)setImportant(overlay,'left',`${cx+dx}px`);
      if(Math.abs(dy)>1)setImportant(overlay,'top',`${cy+dy}px`);
    });
  }

  function centerResult(){
    const root=document.getElementById('m8-result-v1');if(!root)return;
    const a=appRect(),cx=a.left+a.width/2,cy=a.top+a.height/2;
    setImportant(root,'position','fixed');setImportant(root,'inset','auto');
    setImportant(root,'left',`${a.left}px`);setImportant(root,'top',`${a.top}px`);
    setImportant(root,'width',`${a.width}px`);setImportant(root,'height',`${a.height}px`);
    setImportant(root,'margin','0');setImportant(root,'display','flex');
    setImportant(root,'align-items','center');setImportant(root,'justify-content','center');setImportant(root,'overflow','hidden');
    const card=root.querySelector('.m8-card');
    if(card){
      setImportant(card,'width',`${Math.min(720,a.width*.92)}px`);setImportant(card,'max-height',`${a.height-14}px`);
      setImportant(card,'margin','0');setImportant(card,'transform','none');
      requestAnimationFrame(()=>{
        const cr=card.getBoundingClientRect();const dx=cx-(cr.left+cr.width/2),dy=cy-(cr.top+cr.height/2);
        root.dataset.m8v18CenterError=`${dx.toFixed(1)},${dy.toFixed(1)}`;
        if(Math.abs(dx)>1||Math.abs(dy)>1)setImportant(card,'transform',`translate(${dx}px,${dy}px)`);
      });
    }
  }

  function stopMedia(){
    document.querySelectorAll('video').forEach(v=>{
      const s=v.srcObject;if(s&&typeof s.getTracks==='function')s.getTracks().forEach(t=>{try{t.stop();}catch(_){}});
      try{v.srcObject=null;}catch(_){}
    });
    document.getElementById('realtime-hand-camera-m7v3')?.remove();
  }

  function roundWind(){return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';}
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}

  function decompose(tiles){
    const c=Array(34).fill(0);for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const all=[];
    function take(counts,melds,out){
      const i=counts.findIndex(n=>n>0);if(i<0){out.push(melds.slice());return;}
      if(counts[i]>=3){counts[i]-=3;take(counts,[...melds,{type:'triplet',i}],out);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;take(counts,[...melds,{type:'sequence',i}],out);counts[i]++;counts[i+1]++;counts[i+2]++;}
    }
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;const out=[];take(x,[],out);out.forEach(ms=>{if(ms.length===4)all.push({pair:p,melds:ms});});}
    return all;
  }

  function waitOptions(d,win){
    const wi=tileIndex.get(win);if(wi==null)return[];const out=[];
    if(d.pair===wi)out.push({wait:'単騎',target:'pair'});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){const r=m.i%9;let wait='両面';if(wi===m.i+1)wait='嵌張';else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';out.push({wait,target:'sequence',mi});}
    });
    return out;
  }

  function pairFu(i,ctx){const t=tileOrder[i];let n=0;if(['白','發','中'].includes(t))n+=2;if(t===seatWind(ctx.winner))n+=2;if(t===roundWind())n+=2;return n;}
  function tripletFu(i,closed){const t=tileOrder[i],yaochu=honors.has(t)||terminals.has(t);return closed?(yaochu?8:4):(yaochu?4:2);}

  // 戻り値を values だけにせず、失敗理由を必ず持たせる。次回「符が出ない」が起きても原因を画面に出せる。
  function calculateFuDetailed(tiles,win,ctx){
    if(!Array.isArray(tiles)||tiles.length!==14)return {values:[],reason:`手牌が14枚ではありません（${Array.isArray(tiles)?tiles.length:0}枚）`};
    const judged=window.judgeMahjongWinM8V4?.(tiles);
    if(!judged?.win)return {values:[],reason:'14枚がアガリ形として分解できません'};
    if(judged.type==='七対子')return {values:[25],reason:'七対子25符固定'};
    if(judged.type==='国士無双')return {values:[],reason:'国士無双は符計算なし',noFu:true};
    if(!win)return {values:[],reason:'和了牌が保存されていません'};
    if(!ctx?.winner)return {values:[],reason:'和了者が未取得です'};
    if(!['ron','tsumo'].includes(ctx.type))return {values:[],reason:'ロン/ツモが未取得です'};
    if(ctx.menzen===null||ctx.menzen===undefined)return {values:[],reason:'門前/副露が未取得です'};

    const ds=decompose(tiles);
    if(!ds.length)return {values:[],reason:'4面子+1雀頭への分解候補がありません'};
    const vals=new Set();let waitCount=0;
    ds.forEach(d=>{
      const opts=waitOptions(d,win);waitCount+=opts.length;
      opts.forEach(opt=>{
        const pf=pairFu(d.pair,ctx),wf=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfuShape=ctx.menzen&&allSeq&&pf===0&&opt.wait==='両面';
        if(pinfuShape&&ctx.type==='tsumo'){vals.add(20);return;}
        const base=20+(ctx.menzen&&ctx.type==='ron'?10:0)+(ctx.type==='tsumo'?2:0)+pf+wf;
        const trips=d.melds.map((m,mi)=>({m,mi})).filter(x=>x.m.type==='triplet');
        if(ctx.menzen){
          let mf=0;
          trips.forEach(({m,mi})=>{const ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;mf+=tripletFu(m.i,!ronOpened);});
          vals.add(Math.ceil((base+mf)/10)*10);
        }else{
          // 現在の入力は「副露あり」だけで、どの面子を鳴いたかを保持していない。よって正確な1値ではなく可能範囲を返す。
          let min=base,max=base;trips.forEach(({m})=>{min+=tripletFu(m.i,false);max+=tripletFu(m.i,true);});
          min=Math.max(30,Math.ceil(min/10)*10);max=Math.max(30,Math.ceil(max/10)*10);
          for(let n=min;n<=max;n+=10)vals.add(n);
        }
      });
    });
    if(!waitCount)return {values:[],reason:`和了牌「${win}」を含む待ち形を分解できません`};
    const values=[...vals].sort((a,b)=>a-b);
    return values.length?{values,reason:`${ds.length}通りの面子分解・${waitCount}通りの待ちを評価`}:{values:[],reason:'符加算後の候補が0件です'};
  }

  function resultContext(){
    const root=document.getElementById('m8-context-v5');if(!root)return {winner:null,type:null,menzen:null};
    const m=root.querySelector('[data-menzen].active');
    return {winner:root.querySelector('[data-winner].active')?.dataset.winner||null,type:root.querySelector('[data-type].active')?.dataset.type||null,menzen:m?m.dataset.menzen==='1':null};
  }

  function syncHandState(){
    const result=document.getElementById('m8-result-v1');
    if(result&&result!==lastResultRoot){lastResultRoot=result;handState={tiles:[],win:null,menzen:null};}
    if(!result){lastResultRoot=null;return;}
    const tiles=Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
    if(tiles.length===14)handState.tiles=tiles;
    const activeWin=result.querySelector('#m8-fu-start-v7 .m8v7-win-tile.active')?.dataset.tile||window.m8WinningTileV7||null;
    handState.win=activeWin||null;
    const ctx=resultContext();if(ctx.menzen!==null)handState.menzen=ctx.menzen;
    window.m8HandStateV18={tiles:handState.tiles.slice(),win:handState.win,menzen:handState.menzen};
  }

  function effectiveHand(){
    const saved=window.m8HandStateV18;
    const tiles=(handState.tiles.length===14?handState.tiles:(Array.isArray(saved?.tiles)?saved.tiles:[])).slice();
    const win=handState.win||saved?.win||window.m8WinningTileV7||null;
    const menzen=handState.menzen??saved?.menzen??null;
    return {tiles,win,menzen};
  }

  function updateResultFu(){
    const root=document.getElementById('m8-result-v1');if(!root)return;
    syncHandState();
    const hand=effectiveHand(),ctx=resultContext();
    let box=root.querySelector('#m8v18-result-fu');
    if(!box){box=document.createElement('div');box.id='m8v18-result-fu';const fu=root.querySelector('#m8-fu-start-v7');(fu||root.querySelector('#m8-context-v5'))?.insertAdjacentElement('afterend',box);}
    if(!box)return;
    if(!hand.win){box.textContent='M8符：和了牌を選ぶと計算準備ができます';return;}
    const r=calculateFuDetailed(hand.tiles,hand.win,ctx);
    if(r.noFu){box.textContent='M8符：国士無双は符計算なし';return;}
    if(r.values.length===1){box.textContent=`M8符：${r.values[0]}符候補（${r.reason}）`;return;}
    if(r.values.length>1){box.textContent=`M8符候補：${r.values.join('・')}符（${r.reason}）`;return;}
    box.textContent=`M8符：まだ確定できません — ${r.reason}`;
  }

  function actualScoreContext(){
    let winner=null,type=null;try{winner=Array.isArray(agariFlow.winners)?(agariFlow.winners[agariFlow.currentWinnerIndex]||agariFlow.winners[0]||null):null;type=agariFlow.type||null;}catch(_){}
    const hand=effectiveHand();return {winner,type,menzen:hand.menzen};
  }

  function getHan(){const vals=[window.m8SuggestedHanV9,window.m8SuggestedHanV6];const v=vals.find(x=>Number.isFinite(Number(x)));return v==null?0:Number(v);}

  function findScoreCell(fu,han){
    const root=overlay.querySelector('.score-switch-table');if(!root)return null;
    for(const table of root.querySelectorAll('table')){
      const rows=[...table.querySelectorAll('tr')];const row=rows.find(r=>[...r.children].some(c=>c.textContent.replace(/\s/g,'')===`${fu}符`));if(!row)continue;
      if(han>=1&&han<=4){const header=rows.find(r=>[...r.children].some(c=>c.textContent.trim()===`${han}翻`));if(header){const idx=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);if(idx>=0&&row.children[idx])return {row,cell:row.children[idx]};}}
      return {row,cell:null};
    }
    return null;
  }

  function chooseFu(fu){
    window.m8SuggestedFuV18=fu;window.m8SuggestedFuV8=fu;
    overlay.querySelectorAll('.m8v18-fu-row,.m8v18-fu-cell').forEach(x=>x.classList.remove('m8v18-fu-row','m8v18-fu-cell'));
    overlay.querySelectorAll('#m8v18-score-fu button[data-fu]').forEach(b=>b.classList.toggle('active',Number(b.dataset.fu)===fu));
    overlay.querySelectorAll('.m8v10-auto-score').forEach(x=>x.remove());
    const han=getHan(),found=findScoreCell(fu,han);if(!found){overlay.querySelector('.m8v18-auto-score')?.remove();return;}
    [...found.row.children].forEach(c=>c.classList.add('m8v18-fu-row'));
    if(found.cell){
      found.cell.classList.add('m8v18-fu-cell');
      const target=found.cell.querySelector('.score-cell,button')||found.cell;
      const table=overlay.querySelector('.score-switch-table');
      let auto=overlay.querySelector('.m8v18-auto-score');
      if(!auto){auto=document.createElement('button');auto.type='button';auto.className='m8v18-auto-score';table?.insertAdjacentElement('beforebegin',auto);}
      const label=`M8推奨 ${fu}符${han?`${han}翻`:''}を入力`;
      if(auto.textContent!==label)auto.textContent=label;
      auto.onclick=e=>{e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));};
    }
  }

  function installScoreFu(){
    if(!isScore())return;
    const table=overlay.querySelector('.score-switch-table');if(!table)return;
    const hand=effectiveHand(),ctx=actualScoreContext(),r=calculateFuDetailed(hand.tiles,hand.win,ctx);
    let box=overlay.querySelector('#m8v18-score-fu');if(!box){box=document.createElement('div');box.id='m8v18-score-fu';table.insertAdjacentElement('beforebegin',box);}
    box.innerHTML='';
    if(r.noFu){box.textContent='M8符判定：国士無双は符計算なし';return;}
    if(!r.values.length){box.textContent=`M8符判定できず：${r.reason}`;return;}
    window.m8FuCandidatesV18=r.values.slice();
    if(r.values.length===1){box.textContent=`M8符判定：${r.values[0]}符（${r.reason}）`;chooseFu(r.values[0]);return;}
    box.innerHTML=`<div>M8符候補：${r.values.join('・')}符　該当する符を選択</div><div class="m8v18-fu-buttons"></div>`;
    const row=box.querySelector('.m8v18-fu-buttons');r.values.forEach(fu=>{const b=document.createElement('button');b.type='button';b.dataset.fu=String(fu);b.textContent=`${fu}符`;b.onclick=e=>{e.preventDefault();e.stopPropagation();chooseFu(fu);};row.appendChild(b);});
  }

  // v10を外す代わりに、上下左右どのパネルでも確実に和了者/放銃者を選べる処理だけ引き継ぐ。
  document.addEventListener('click',e=>{
    let step='';try{step=agariFlow.step||'';}catch(_){}
    if(step!=='winner'&&step!=='discarder')return;
    const panel=e.target.closest?.('.player-panel');if(!panel)return;const pos=panel.dataset.position;if(!pos)return;
    if(step==='winner'&&typeof handleWinnerSelection==='function'){e.preventDefault();e.stopImmediatePropagation();handleWinnerSelection(pos);setTimeout(queueRefresh,0);}
    else if(step==='discarder'&&typeof handleDiscarderSelection==='function'){e.preventDefault();e.stopImmediatePropagation();handleDiscarderSelection(pos);setTimeout(queueRefresh,0);}
  },true);

  // 代表手で符計算そのものを自己テスト。ユーザー画像に近い 111m 223344m 666p 77p・7pツモは40符。
  function selfTest(){
    const tests=[];
    const h=['1萬','1萬','1萬','2萬','2萬','3萬','3萬','4萬','4萬','6筒','6筒','6筒','7筒','7筒'];
    const a=calculateFuDetailed(h,'7筒',{winner:'bottom',type:'tsumo',menzen:true}).values;
    tests.push({name:'closed-tsumo-tanki-triplets',expected:40,actual:a});
    const b=calculateFuDetailed(h,'7筒',{winner:'bottom',type:'ron',menzen:true}).values;
    tests.push({name:'closed-ron-tanki-triplets',expected:50,actual:b});
    window.m8FuSelfTestV18=tests.map(t=>({...t,pass:t.actual.includes(t.expected)}));
    if(window.m8FuSelfTestV18.some(t=>!t.pass))console.error('M8 v18 fu self-test failed',window.m8FuSelfTestV18);
  }

  function refresh(){layoutQueued=false;syncHandState();centerResult();centerAgari();updateResultFu();installScoreFu();}
  function queueRefresh(){if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(refresh);}

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.hand-result-ok-m7v5'))stopMedia();
    if(e.target.closest?.('#m8-result-v1 .m8-card>button:last-child')){syncHandState();stopMedia();}
    setTimeout(queueRefresh,0);
  },true);
  window.addEventListener('pagehide',stopMedia,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopMedia();});
  // v24 stability: body全体のchildList監視は、下で自分が追加する符UI/推奨ボタンでも再発火し続ける。
  // 点数表そのものが新しく描画された時だけ更新し、自分の装飾追加は無視する。
  const scoreObserver=new MutationObserver(muts=>{
    const scoreAdded=muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(
      n.matches?.('.score-switch-table,.score-dual-grid')||n.querySelector?.('.score-switch-table,.score-dual-grid')
    )));
    if(scoreAdded)queueRefresh();
  });
  scoreObserver.observe(overlay,{childList:true,subtree:true});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,queueRefresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',queueRefresh,{passive:true});

  selfTest();queueRefresh();
})();