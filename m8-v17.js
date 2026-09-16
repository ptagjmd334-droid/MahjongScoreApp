// M8 v17: 実描画領域の真中心へ固定 + 実アガリ条件で符を再計算 + 旧レイアウト競合を整理
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v17';

  const style=document.createElement('style');
  style.textContent=`
    .player-panel .starting-dealer-badge-v1{
      top:auto!important;left:auto!important;right:-11px!important;bottom:-11px!important;
      width:36px!important;height:28px!important;line-height:28px!important;border-radius:8px!important;
      font-size:16px!important;font-weight:900!important;z-index:35!important;
      background:linear-gradient(135deg,#ffb42e,#f07c00)!important;
      border:2px solid rgba(255,255,255,.96)!important;box-shadow:0 5px 12px rgba(0,0,0,.28)!important;
    }
    #m8v17-fu-box{
      margin:3px 0 5px;padding:5px 7px;border-radius:9px;background:#fff4d8;color:#26392f;
      font-size:11px;font-weight:900;text-align:center;
    }
    #m8v17-fu-box .m8v17-fu-buttons{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-top:4px}
    #m8v17-fu-box button{min-width:62px;min-height:29px;padding:4px 8px;border:1px solid #c8a546;border-radius:8px;background:#fff;color:#173129;font-weight:900}
    #m8v17-fu-box button.active{background:#dff5e8;outline:3px solid #23c878;outline-offset:-2px}
    .m8v17-fu-row{outline:2px solid #f0b323!important;outline-offset:-2px!important;background:rgba(240,179,35,.10)!important}
    .m8v17-fu-cell{outline:3px solid #23c878!important;outline-offset:-3px!important;background:rgba(35,200,120,.20)!important}
    .m8v17-auto-score{display:block;width:100%;margin:3px 0 5px;padding:6px 9px;border:0;border-radius:9px;background:#dff5e8;color:#153d29;font-size:11px;font-weight:900}
    @media (orientation:landscape){
      body>#agari-overlay .agari-flow-card{transform:none!important;zoom:1!important}
      body>#agari-overlay.m8v17-score .agari-flow-card{
        display:block!important;overflow:hidden!important;padding:5px 8px!important;
      }
      body>#agari-overlay.m8v17-score .agari-flow-content{
        display:block!important;overflow-y:auto!important;overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior:contain!important;
      }
      body>#agari-overlay.m8v17-score .agari-flow-content>.agari-flow-actions{
        position:sticky!important;bottom:0!important;z-index:80!important;display:flex!important;
        margin:4px 0 0!important;padding:5px 0 max(3px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;box-shadow:0 -7px 13px rgba(6,47,38,.92)!important;
      }
    }
  `;
  document.head.appendChild(style);

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  let cachedHand=null;
  let layoutQueued=false;

  function setImportant(el,prop,value){ if(el) el.style.setProperty(prop,value,'important'); }

  // iOSホーム画面版では 100vw/50vw が実際の横画面描画幅と一致しないことがある。
  // そこで、実際に全画面表示されている game-screen の getBoundingClientRect() を座標の正本にする。
  function appRect(){
    const game=document.getElementById('game-screen');
    const r=game?.getBoundingClientRect();
    if(r&&r.width>200&&r.height>120){
      return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    }
    const v=window.visualViewport;
    const left=v?.offsetLeft||0,top=v?.offsetTop||0;
    const width=v?.width||document.documentElement.clientWidth||window.innerWidth||844;
    const height=v?.height||document.documentElement.clientHeight||window.innerHeight||390;
    return {left,top,width,height,right:left+width,bottom:top+height};
  }

  function isScoreScreen(){ return !!overlay.querySelector('.score-switch-table,.score-dual-grid'); }

  function clearLegacyLayoutClasses(){
    ['m8v7-score','m8v7-player-pick','m8v10-score','m8v10-type','m8v10-pick','m8v10-generic','m8v11-score','m8v13-score','m8v14-score','m8v15-score','m8v15-nonscore','m8v16-score','m8v16-nonscore'].forEach(c=>overlay.classList.remove(c));
  }

  function centerAgariOverlay(){
    if(overlay.classList.contains('hidden'))return;
    const a=appRect();
    const cx=a.left+a.width/2,cy=a.top+a.height/2;
    const score=isScoreScreen();
    clearLegacyLayoutClasses();
    overlay.classList.toggle('m8v17-score',score);
    overlay.classList.toggle('m8v17-nonscore',!score);

    setImportant(overlay,'position','fixed');
    setImportant(overlay,'left',`${cx}px`);
    setImportant(overlay,'top',`${cy}px`);
    setImportant(overlay,'right','auto');
    setImportant(overlay,'bottom','auto');
    setImportant(overlay,'margin','0');
    setImportant(overlay,'zoom','1');
    setImportant(overlay,'height','auto');
    setImportant(overlay,'min-height','0');
    setImportant(overlay,'overflow','visible');

    if(score){
      const scale=.76;
      const width=Math.min(700,a.width*.80);
      setImportant(overlay,'width',`${width}px`);
      setImportant(overlay,'max-height','none');
      setImportant(overlay,'transform',`translate(-50%,-50%) scale(${scale})`);
      setImportant(overlay,'transform-origin','center center');
      const card=overlay.querySelector('.agari-flow-card');
      const content=overlay.querySelector('.agari-flow-content');
      setImportant(card,'max-height',`${Math.max(420,(a.height-10)/scale)}px`);
      setImportant(content,'max-height',`${Math.max(330,(a.height-76)/scale)}px`);
    }else{
      const width=Math.min(540,a.width*.54);
      setImportant(overlay,'width',`${width}px`);
      setImportant(overlay,'max-height',`${a.height-12}px`);
      setImportant(overlay,'transform','translate(-50%,-50%)');
      setImportant(overlay,'transform-origin','center center');
      const card=overlay.querySelector('.agari-flow-card');
      setImportant(card,'max-height',`${a.height-12}px`);
      setImportant(card,'overflow','visible');
    }

    // 1フレーム後に実測して、CSS/zoom/古いパッチの影響が残っていても真中心へ補正する。
    requestAnimationFrame(()=>{
      if(overlay.classList.contains('hidden'))return;
      const r=overlay.getBoundingClientRect();
      if(!r.width||!r.height)return;
      const dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2);
      overlay.dataset.m8v17CenterError=`${dx.toFixed(1)},${dy.toFixed(1)}`;
      if(Math.abs(dx)>1)setImportant(overlay,'left',`${cx+dx}px`);
      if(Math.abs(dy)>1)setImportant(overlay,'top',`${cy+dy}px`);
    });
  }

  function centerResultModal(){
    const root=document.getElementById('m8-result-v1');
    if(!root)return;
    const a=appRect(),cx=a.left+a.width/2,cy=a.top+a.height/2;
    setImportant(root,'position','fixed');
    setImportant(root,'inset','auto');
    setImportant(root,'left',`${a.left}px`);
    setImportant(root,'top',`${a.top}px`);
    setImportant(root,'right','auto');
    setImportant(root,'bottom','auto');
    setImportant(root,'width',`${a.width}px`);
    setImportant(root,'height',`${a.height}px`);
    setImportant(root,'margin','0');
    setImportant(root,'padding','7px 10px');
    setImportant(root,'display','flex');
    setImportant(root,'align-items','center');
    setImportant(root,'justify-content','center');
    setImportant(root,'overflow','hidden');
    const card=root.querySelector('.m8-card');
    if(card){
      setImportant(card,'width',`${Math.min(680,a.width*.92)}px`);
      setImportant(card,'max-height',`${a.height-14}px`);
      setImportant(card,'margin','0');
      setImportant(card,'transform','none');
      requestAnimationFrame(()=>{
        const cr=card.getBoundingClientRect();
        const dx=cx-(cr.left+cr.width/2),dy=cy-(cr.top+cr.height/2);
        root.dataset.m8v17CenterError=`${dx.toFixed(1)},${dy.toFixed(1)}`;
        if(Math.abs(dx)>1||Math.abs(dy)>1)setImportant(card,'transform',`translate(${dx}px,${dy}px)`);
      });
    }
  }

  function stopVisibleMedia(){
    document.querySelectorAll('video').forEach(v=>{
      const s=v.srcObject;
      if(s&&typeof s.getTracks==='function')s.getTracks().forEach(t=>{try{t.stop();}catch(_){}});
      try{v.srcObject=null;}catch(_){}
    });
    document.getElementById('realtime-hand-camera-m7v3')?.remove();
  }

  function roundWind(){return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';}
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}

  function decompositions(tiles){
    const c=Array(34).fill(0);
    for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const result=[];
    function take(counts,melds,out){
      const i=counts.findIndex(n=>n>0);
      if(i<0){out.push(melds.slice());return;}
      if(counts[i]>=3){counts[i]-=3;take(counts,[...melds,{type:'triplet',i}],out);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){
        counts[i]--;counts[i+1]--;counts[i+2]--;
        take(counts,[...melds,{type:'sequence',i}],out);
        counts[i]++;counts[i+1]++;counts[i+2]++;
      }
    }
    const all=[];
    for(let p=0;p<34;p++)if(c[p]>=2){
      const x=c.slice();x[p]-=2;const melds=[];take(x,[],melds);
      melds.forEach(ms=>{if(ms.length===4)all.push({pair:p,melds:ms});});
    }
    return all;
  }

  function waitOptions(d,win){
    const wi=tileIndex.get(win);if(wi==null)return[];
    const out=[];
    if(d.pair===wi)out.push({wait:'単騎',target:'pair'});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){
        const r=m.i%9;let wait='両面';
        if(wi===m.i+1)wait='嵌張';
        else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';
        out.push({wait,target:'sequence',mi});
      }
    });
    return out;
  }

  function pairFu(pairIndex,ctx){
    const t=tileOrder[pairIndex];let fu=0;
    if(['白','發','中'].includes(t))fu+=2;
    if(t===seatWind(ctx.winner))fu+=2;
    if(t===roundWind())fu+=2;
    return fu;
  }

  function tripletFu(index,closed){
    const t=tileOrder[index],yaochu=honors.has(t)||terminals.has(t);
    return closed?(yaochu?8:4):(yaochu?4:2);
  }

  function calculateFu(tiles,win,ctx){
    if(!Array.isArray(tiles)||tiles.length!==14||!win||!ctx?.winner||!['ron','tsumo'].includes(ctx.type)||ctx.menzen===null)return[];
    const judged=window.judgeMahjongWinM8V4?.(tiles);
    if(!judged?.win)return[];
    if(judged.type==='七対子')return[25];
    if(judged.type==='国士無双')return[];
    const vals=new Set();
    decompositions(tiles).forEach(d=>{
      waitOptions(d,win).forEach(opt=>{
        const pf=pairFu(d.pair,ctx);
        const wf=['単騎','嵌張','辺張'].includes(opt.wait)?2:0;
        const allSeq=d.melds.every(m=>m.type==='sequence');
        const pinfuShape=ctx.menzen&&allSeq&&pf===0&&opt.wait==='両面';
        if(pinfuShape&&ctx.type==='tsumo'){vals.add(20);return;}
        const base=20+(ctx.menzen&&ctx.type==='ron'?10:0)+(ctx.type==='tsumo'?2:0)+pf+wf;
        const trips=d.melds.map((m,mi)=>({m,mi})).filter(x=>x.m.type==='triplet');
        if(ctx.menzen){
          let mf=0;
          trips.forEach(({m,mi})=>{
            const ronOpened=ctx.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
            mf+=tripletFu(m.i,!ronOpened);
          });
          vals.add(Math.ceil((base+mf)/10)*10);
        }else{
          // 現段階では鳴いた面子の内訳を保持していないため、開閉の可能範囲を候補として出す。
          let min=base,max=base;
          trips.forEach(({m})=>{min+=tripletFu(m.i,false);max+=tripletFu(m.i,true);});
          min=Math.max(30,Math.ceil(min/10)*10);max=Math.max(30,Math.ceil(max/10)*10);
          for(let n=min;n<=max;n+=10)vals.add(n);
        }
      });
    });
    return [...vals].sort((a,b)=>a-b);
  }

  function resultContext(){
    const root=document.getElementById('m8-context-v5');
    if(!root)return {winner:null,type:null,menzen:null};
    const m=root.querySelector('[data-menzen].active');
    return {
      winner:root.querySelector('[data-winner].active')?.dataset.winner||null,
      type:root.querySelector('[data-type].active')?.dataset.type||null,
      menzen:m?m.dataset.menzen==='1':null
    };
  }

  function currentHandFromResult(){
    const root=document.getElementById('m8-result-v1');
    const box=root?.querySelector('#m8-fu-start-v7');
    const tiles=Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
    const win=window.m8WinningTileV7||box?.querySelector('.m8v7-win-tile.active')?.dataset.tile||null;
    return {tiles,win};
  }

  function updateResultFu(){
    const root=document.getElementById('m8-result-v1');if(!root)return;
    const {tiles,win}=currentHandFromResult();if(tiles.length!==14)return;
    const judged=window.judgeMahjongWinM8V4?.(tiles);if(!judged?.win)return;
    const box=root.querySelector('#m8-fu-start-v7');const note=box?.querySelector('.m8v7-fu-note');if(!note)return;
    if(judged.type==='七対子'){note.innerHTML='七対子なので <span class="m8v8-fu-detail">25符（固定）</span>';return;}
    if(judged.type==='国士無双'){note.innerHTML='国士無双は役満のため符計算なし';return;}
    if(!win)return;
    const ctx=resultContext();
    const vals=calculateFu(tiles,win,ctx);
    const waitText=(note.textContent.match(/待ち(?:候補)?：([^/]+)/)?.[1]||'').trim();
    if(!ctx.winner||!ctx.type||ctx.menzen===null){
      note.innerHTML=`和了牌：${win}${waitText?` / 待ち候補：${waitText}`:''} / <span class="m8v8-fu-detail">和了者・ロン/ツモ・門前/副露が揃うと符候補を表示</span>`;
      return;
    }
    if(vals.length===1){
      window.m8SuggestedFuV8=vals[0];window.m8FuCandidatesV17=vals.slice();
      note.innerHTML=`和了牌：${win}${waitText?` / 待ち候補：${waitText}`:''} / <span class="m8v8-fu-detail">${vals[0]}符候補</span>`;
    }else if(vals.length>1){
      window.m8SuggestedFuV8=null;window.m8FuCandidatesV17=vals.slice();
      note.innerHTML=`和了牌：${win}${waitText?` / 待ち候補：${waitText}`:''} / <span class="m8v8-fu-detail">符候補：${vals.join('・')}符</span>`;
    }else{
      note.innerHTML=`和了牌：${win}${waitText?` / 待ち候補：${waitText}`:''} / <span class="m8v8-fu-detail">符候補を算出できません</span>`;
    }
  }

  function captureHandBeforeConfirm(){
    const {tiles,win}=currentHandFromResult();
    if(tiles.length!==14)return;
    const ctx=resultContext();
    cachedHand={tiles,win,menzen:ctx.menzen};
    window.m8CachedHandV17={tiles:tiles.slice(),win,menzen:ctx.menzen};
  }

  function actualScoreContext(){
    let winner=null,type=null;
    try{
      winner=Array.isArray(agariFlow.winners)?(agariFlow.winners[agariFlow.currentWinnerIndex]||agariFlow.winners[0]||null):null;
      type=agariFlow.type||null;
    }catch(_){ }
    const h=cachedHand||window.m8CachedHandV17;
    return {winner,type,menzen:h?.menzen??true};
  }

  function getHan(){
    const vals=[window.m8SuggestedHanV9,window.m8SuggestedHanV6];
    const v=vals.find(x=>Number.isFinite(Number(x)));
    return v==null?0:Number(v);
  }

  function findScoreCell(fu,han){
    const root=overlay.querySelector('.score-switch-table');if(!root)return null;
    for(const table of root.querySelectorAll('table')){
      const rows=[...table.querySelectorAll('tr')];
      const row=rows.find(r=>r.children[0]?.textContent.replace(/\s/g,'')===`${fu}符`||[...r.children].some(c=>c.textContent.replace(/\s/g,'')===`${fu}符`));
      if(!row)continue;
      if(han>=1&&han<=4){
        const header=rows.find(r=>[...r.children].some(c=>c.textContent.trim()===`${han}翻`));
        if(header){
          const idx=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);
          if(idx>=0&&row.children[idx])return {row,cell:row.children[idx]};
        }
      }
      return {row,cell:null};
    }
    return null;
  }

  function chooseFu(fu){
    window.m8SuggestedFuV17=fu;
    window.m8SuggestedFuV11=fu;
    window.m8SuggestedFuV8=fu;
    overlay.querySelectorAll('.m8v17-fu-row,.m8v17-fu-cell').forEach(x=>x.classList.remove('m8v17-fu-row','m8v17-fu-cell'));
    overlay.querySelectorAll('#m8v17-fu-box button[data-fu]').forEach(b=>b.classList.toggle('active',Number(b.dataset.fu)===fu));
    overlay.querySelectorAll('.m8v17-auto-score,.m8v10-auto-score').forEach(x=>x.remove());
    const han=getHan();
    const found=findScoreCell(fu,han);if(!found)return;
    [...found.row.children].forEach(c=>c.classList.add('m8v17-fu-row'));
    if(found.cell){
      found.cell.classList.add('m8v17-fu-cell');
      const target=found.cell.querySelector('.score-cell,button')||found.cell;
      const root=overlay.querySelector('.score-switch-table');
      const auto=document.createElement('button');auto.type='button';auto.className='m8v17-auto-score';auto.textContent=`M8推奨 ${fu}符${han}翻を入力`;
      auto.onclick=e=>{e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));};
      root?.insertAdjacentElement('beforebegin',auto);
    }
  }

  function installScoreFu(){
    if(!isScoreScreen())return;
    const table=overlay.querySelector('.score-switch-table');if(!table)return;
    const hand=cachedHand||window.m8CachedHandV17;
    if(!hand?.tiles||hand.tiles.length!==14)return;
    const judged=window.judgeMahjongWinM8V4?.(hand.tiles);if(!judged?.win)return;
    const ctx=actualScoreContext();
    let vals=calculateFu(hand.tiles,hand.win,ctx);
    if(judged.type==='七対子')vals=[25];
    if(judged.type==='国士無双')vals=[];
    window.m8FuCandidatesV17=vals.slice();
    window.m8FuCandidatesV12=vals.slice();
    window.m8FuCandidatesV11=vals.slice();

    let box=overlay.querySelector('#m8v17-fu-box');
    if(!box){box=document.createElement('div');box.id='m8v17-fu-box';table.insertAdjacentElement('beforebegin',box);}
    box.innerHTML='';

    if(judged.type==='国士無双'){
      box.textContent='M8符判定：国士無双は役満のため符計算なし';
      return;
    }
    if(!ctx.winner||!ctx.type){box.textContent='M8符判定：和了者・ロン/ツモの取得待ち';return;}
    if(judged.type.startsWith('通常形')&&!hand.win){box.textContent='M8符判定：和了牌が未選択です';return;}
    if(!vals.length){box.textContent='M8符判定：手牌・和了牌・和了条件から符候補を算出できません';return;}

    if(vals.length===1){
      box.textContent=`M8符判定：${vals[0]}符`;
      chooseFu(vals[0]);
      return;
    }

    box.innerHTML=`<div>M8符候補：${vals.join('・')}符　該当する符を選択</div><div class="m8v17-fu-buttons"></div>`;
    const row=box.querySelector('.m8v17-fu-buttons');
    vals.forEach(fu=>{
      const b=document.createElement('button');b.type='button';b.dataset.fu=String(fu);b.textContent=`${fu}符`;
      b.onclick=e=>{e.preventDefault();e.stopPropagation();chooseFu(fu);};row.appendChild(b);
    });
  }

  function fixStartingDealerBadge(){
    document.querySelectorAll('.starting-dealer-badge-v1').forEach(b=>{
      setImportant(b,'top','auto');setImportant(b,'left','auto');setImportant(b,'right','-11px');setImportant(b,'bottom','-11px');
    });
  }

  function refreshAll(){
    layoutQueued=false;
    centerResultModal();
    centerAgariOverlay();
    updateResultFu();
    installScoreFu();
    fixStartingDealerBadge();
  }
  function queueRefresh(){if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(refreshAll);}

  document.addEventListener('click',e=>{
    if(e.target.closest?.('.hand-result-ok-m7v5'))stopVisibleMedia();
    if(e.target.closest?.('#m8-result-v1 .m8-card>button:last-child')){captureHandBeforeConfirm();stopVisibleMedia();}
    setTimeout(queueRefresh,0);
  },true);
  window.addEventListener('pagehide',stopVisibleMedia,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopVisibleMedia();});

  // DOM構造変化だけ監視。自分でclass/styleを書き換えても再発火しないためループしない。
  new MutationObserver(queueRefresh).observe(document.body,{childList:true,subtree:true});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,queueRefresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',queueRefresh,{passive:true});
  queueRefresh();
})();
