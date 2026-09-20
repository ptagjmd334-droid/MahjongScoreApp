// M8 v19: 14枚の正本を画面DOMから取得 + アガリoverlayをbodyへportal + 点数表を3段固定レイアウト化
(() => {
  // v19以降がアガリoverlayの唯一のレイアウト担当。
  // 旧v18とのwidth/position競合を防ぐ。
  window.m8AgariLayoutOwnerV19Plus=true;
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;
  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v19';

  // v18でbody>#agari-overlay向けCSSを書いたのに、v10を外した結果overlayが#game-screen内に残り、
  // そのCSSが適用されていなかった。ここでbody直下へ戻して座標系とCSS対象を一本化する。
  if(overlay.parentElement!==document.body)document.body.appendChild(overlay);

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      body>#agari-overlay.m8v19-score{
        position:fixed!important;overflow:visible!important;zoom:1!important;
      }
      body>#agari-overlay.m8v19-score>.agari-flow-card{
        display:grid!important;
        grid-template-rows:auto minmax(0,1fr) auto!important;
        overflow:hidden!important;zoom:1!important;transform:none!important;
        padding:7px 10px!important;
      }
      body>#agari-overlay.m8v19-score>.agari-flow-card>.agari-flow-top{
        grid-row:1!important;min-height:0!important;margin-bottom:5px!important;
      }
      body>#agari-overlay.m8v19-score>.agari-flow-card>.agari-flow-content{
        grid-row:2!important;min-height:0!important;height:auto!important;max-height:none!important;
        overflow-y:scroll!important;overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;
        overscroll-behavior:contain!important;padding:0 2px 8px!important;
      }
      body>#agari-overlay.m8v19-score>.agari-flow-card>.agari-flow-actions.m8v19-score-footer{
        grid-row:3!important;position:relative!important;left:auto!important;right:auto!important;
        top:auto!important;bottom:auto!important;width:100%!important;display:flex!important;
        flex:none!important;margin:4px 0 0!important;padding:6px 0 max(4px,env(safe-area-inset-bottom))!important;
        background:#062f26!important;box-shadow:0 -5px 12px rgba(6,47,38,.78)!important;z-index:150!important;
      }
      body>#agari-overlay.m8v19-score>.agari-flow-card>.agari-flow-actions.m8v19-score-footer button{
        min-height:36px!important;padding:6px 9px!important;font-size:12px!important;
      }
      body>#agari-overlay.m8v19-pick>.agari-flow-card{
        padding:8px 12px!important;overflow:visible!important;
      }
      body>#agari-overlay.m8v19-pick .agari-flow-content{gap:6px!important}
      body>#agari-overlay.m8v19-pick .agari-flow-actions{gap:8px!important}
      body>#agari-overlay.m8v19-pick .agari-flow-actions button{min-height:38px!important;padding:7px 10px!important}
    }
  `;
  document.head.appendChild(style);

  function setI(el,p,v){if(el)el.style.setProperty(p,v,'important');}
  function appRect(){
    const game=document.getElementById('game-screen');
    const r=game?.getBoundingClientRect();
    if(r&&r.width>200&&r.height>120)return {left:r.left,top:r.top,width:r.width,height:r.height};
    const vv=window.visualViewport;
    return {left:vv?.offsetLeft||0,top:vv?.offsetTop||0,width:vv?.width||innerWidth,height:vv?.height||innerHeight};
  }
  function step(){try{return agariFlow?.step||'';}catch(_){return '';}}
  function isScore(){return !!overlay.querySelector('.score-switch-table,.score-dual-grid');}

  // 手牌14枚の正本を1つにする。
  // v18はwindow.m8LastTilesV8だけを見ており、この値が空だと、画面に14枚見えていても0枚扱いになっていた。
  function readTilesFromHandOverlay(){
    return [...(document.querySelectorAll('#hand-result-overlay-m7v5 .hand-result-tile-m7v5')||[])]
      .map(b=>b.dataset.tile).filter(Boolean);
  }
  function readTilesFromResult(){
    return [...(document.querySelectorAll('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile')||[])]
      .map(b=>b.dataset.tile).filter(Boolean);
  }
  function resultMenzen(){
    const b=document.querySelector('#m8-context-v5 [data-menzen].active');
    return b?(b.dataset.menzen==='1'):null;
  }
  function resultWin(){
    return document.querySelector('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile.active')?.dataset.tile
      ||window.m8WinningTileV7||null;
  }
  function saveHand(tiles){
    if(!Array.isArray(tiles)||tiles.length!==14)return false;
    const win=resultWin();
    const menzen=resultMenzen();
    window.m8LastTilesV8=tiles.slice();
    window.m8HandStateV18={tiles:tiles.slice(),win,menzen};
    window.m8HandStateV19={tiles:tiles.slice(),win,menzen};
    return true;
  }
  function syncHandFromVisibleUI(){
    const a=readTilesFromHandOverlay();
    if(a.length===14)saveHand(a);
    const b=readTilesFromResult();
    if(b.length===14)saveHand(b);

    // v18の誤った「0枚」表示を、実際に14枚読めた時点で打ち消す。
    const box=document.getElementById('m8v18-result-fu');
    if(box&&b.length===14&&/0枚|14枚ではありません/.test(box.textContent||'')){
      box.textContent='M8符：14枚取得済み。和了条件から符を計算します';
    }
  }

  // hand-resultが消える直前にも必ず保存。
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.hand-result-ok-m7v5')){
      const ts=readTilesFromHandOverlay();
      if(ts.length===14)saveHand(ts);
    }
    if(e.target.closest?.('.m8v7-win-tile')){
      setTimeout(()=>{
        const ts=readTilesFromResult();
        if(ts.length===14)saveHand(ts);
      },0);
    }
    setTimeout(refresh,0);
  },true);

  function ensureFooter(){
    if(!isScore())return;
    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(!card||!content)return;
    const inContent=content.querySelector(':scope > .agari-flow-actions');
    const old=[...card.children].filter(x=>x.classList?.contains('m8v19-score-footer'));
    if(inContent){
      old.forEach(x=>x.remove());
      inContent.classList.remove('m8v18-score-footer');
      inContent.classList.add('m8v19-score-footer');
      card.appendChild(inContent);
    }else if(old.length>1){
      old.slice(0,-1).forEach(x=>x.remove());
    }else{
      const v18=[...card.children].find(x=>x.classList?.contains('m8v18-score-footer'));
      if(v18){v18.classList.remove('m8v18-score-footer');v18.classList.add('m8v19-score-footer');}
    }
  }
  function removeDetachedFooterWhenNotScore(){
    if(isScore())return;
    overlay.querySelectorAll('.m8v19-score-footer,.m8v18-score-footer').forEach(x=>{
      if(x.parentElement===overlay.querySelector('.agari-flow-card'))x.remove();
    });
  }

  function layout(){
    if(overlay.classList.contains('hidden'))return;
    const a=appRect(),cx=a.left+a.width/2,cy=a.top+a.height/2;
    const s=step(),score=isScore(),pick=s==='winner'||s==='discarder';
    overlay.classList.toggle('m8v19-score',score);
    overlay.classList.toggle('m8v19-pick',pick&&!score);

    setI(overlay,'position','fixed');
    setI(overlay,'left',`${cx}px`);setI(overlay,'top',`${cy}px`);
    setI(overlay,'right','auto');setI(overlay,'bottom','auto');
    setI(overlay,'transform','translate(-50%,-50%)');setI(overlay,'transform-origin','center center');
    setI(overlay,'zoom','1');setI(overlay,'margin','0');

    const card=overlay.querySelector('.agari-flow-card');
    const content=overlay.querySelector('.agari-flow-content');
    if(score){
      // 大きさは維持しつつ、高さは画面内に固定。中身だけ縦スクロール。
      const w=Math.min(780,a.width*.88),h=Math.max(260,a.height-8);
      setI(overlay,'width',`${w}px`);setI(overlay,'max-height',`${h}px`);setI(overlay,'overflow','visible');
      setI(card,'width','100%');setI(card,'height',`${h}px`);setI(card,'max-height',`${h}px`);setI(card,'overflow','hidden');
      setI(content,'min-height','0');setI(content,'height','auto');setI(content,'max-height','none');setI(content,'overflow-y','scroll');
      ensureFooter();
      requestAnimationFrame(()=>{if(content)content.style.setProperty('overflow-y','scroll','important');});
    }else{
      removeDetachedFooterWhenNotScore();
      let w;
      if(pick)w=Math.min(510,a.width*.56);
      else if(s==='type')w=Math.min(620,a.width*.66);
      else w=Math.min(620,a.width*.68);
      setI(overlay,'width',`${w}px`);setI(overlay,'max-height',`${a.height-12}px`);setI(overlay,'overflow','visible');
      setI(card,'height','auto');setI(card,'max-height',`${a.height-12}px`);setI(card,'overflow','visible');
    }

    // 真中心を実測して1px以上なら補正。
    requestAnimationFrame(()=>{
      if(overlay.classList.contains('hidden'))return;
      const r=overlay.getBoundingClientRect();if(!r.width||!r.height)return;
      const dx=cx-(r.left+r.width/2),dy=cy-(r.top+r.height/2);
      overlay.dataset.m8v19CenterError=`${dx.toFixed(1)},${dy.toFixed(1)}`;
      if(Math.abs(dx)>1)setI(overlay,'left',`${cx+dx}px`);
      if(Math.abs(dy)>1)setI(overlay,'top',`${cy+dy}px`);
    });
  }

  let queued=false;
  function refresh(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      syncHandFromVisibleUI();
      layout();
    });
  }

  // v31: body内の「あらゆる子要素追加」でレイアウトを再実行すると、
  // score reviewのdetails展開/テキスト入力でも全体layoutと再装飾が多重実行される。
  // アガリ画面そのものが描画された場合だけ再計算する。補助パネル追加は無視する。
  const layoutRoots='.agari-flow-card,.agari-flow-content,.score-switch-table,.score-dual-grid,#hand-result-overlay-m7v5,#m8-result-v1';
  new MutationObserver(mutations=>{
    const isNewLayout=mutations.some(m=>[...m.addedNodes].some(n=>
      n.nodeType===1&&(n.matches?.(layoutRoots)||n.querySelector?.(layoutRoots))
    ));
    if(isNewLayout)refresh();
  }).observe(document.body,{childList:true,subtree:true});
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});

  syncHandFromVisibleUI();
  refresh();
})();
