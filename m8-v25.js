// M8 v25: 和了者/放銃者選択幅の固定 + 役/翻/符→点数表の総合ガイド
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;

  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v25';

  const style=document.createElement('style');
  style.textContent=`
    #m8v25-score-summary{
      margin:4px 0 6px;
      padding:7px 10px;
      border-radius:9px;
      background:#e9f7ef;
      color:#153d29;
      font-size:12px;
      font-weight:900;
      text-align:center;
      flex:none;
    }
  `;
  document.head.appendChild(style);

  function setI(el,prop,value){
    if(el)el.style.setProperty(prop,value,'important');
  }

  function gameRect(){
    const game=document.getElementById('game-screen');
    const r=game?.getBoundingClientRect();
    if(r&&r.width>200&&r.height>120){
      return {left:r.left,top:r.top,width:r.width,height:r.height};
    }
    const vv=window.visualViewport;
    return {
      left:vv?.offsetLeft||0,
      top:vv?.offsetTop||0,
      width:vv?.width||window.innerWidth,
      height:vv?.height||window.innerHeight
    };
  }

  function step(){
    try{return agariFlow?.step||'';}catch(_){return '';}
  }

  function isScore(){
    return !!overlay.querySelector('.score-switch-table,.score-dual-grid');
  }

  // v19の「正しい短い幅」を、選んだ席方向に関係なく最後に再適用する。
  // 上下のプレイヤー選択時だけv18の広い幅が勝つ競合を再発させない。
  function normalizePlayerPick(){
    if(overlay.classList.contains('hidden')||isScore())return;
    const s=step();
    if(s!=='winner'&&s!=='discarder')return;

    const a=gameRect();
    const cx=a.left+a.width/2;
    const cy=a.top+a.height/2;
    const width=Math.min(510,a.width*.56);

    setI(overlay,'position','fixed');
    setI(overlay,'left',`${cx}px`);
    setI(overlay,'top',`${cy}px`);
    setI(overlay,'right','auto');
    setI(overlay,'bottom','auto');
    setI(overlay,'width',`${width}px`);
    setI(overlay,'max-width',`${width}px`);
    setI(overlay,'transform','translate(-50%,-50%)');
    setI(overlay,'transform-origin','center center');
    setI(overlay,'margin','0');
    setI(overlay,'zoom','1');

    const card=overlay.querySelector('.agari-flow-card');
    if(card){
      setI(card,'width','100%');
      setI(card,'max-width','100%');
      setI(card,'height','auto');
      setI(card,'max-height',`${a.height-12}px`);
      setI(card,'overflow','visible');
    }
  }

  function finiteNumber(values){
    for(const value of values){
      const n=Number(value);
      if(Number.isFinite(n))return n;
    }
    return null;
  }

  // 以前から予定していた「役・翻・符→最終点数表」のつながりを
  // 点数表上で1行にまとめ、どの推奨を使っているか分かるようにする。
  function updateScoreSummary(){
    const table=overlay.querySelector('.score-switch-table');
    const old=overlay.querySelector('#m8v25-score-summary');

    if(!table){
      old?.remove();
      return;
    }

    const yakuman=window.m8SuggestedHanV23==='yakuman'||window.m8SuggestedHanV6==='yakuman';
    const han=finiteNumber([
      window.m8SuggestedHanV23,
      window.m8SuggestedHanV22,
      window.m8SuggestedHanV9,
      window.m8SuggestedHanV6
    ]);
    const fu=finiteNumber([
      window.m8SuggestedFuV21,
      window.m8SuggestedFuV20,
      window.m8SuggestedFuV18,
      window.m8SuggestedFuV8,
      window.m8SuggestedFuV7
    ]);

    let text='';
    if(yakuman){
      text='M8総合判定：役満 → 役満欄を使用';
    }else if(han&&fu){
      text=`M8総合判定：${fu}符 ${han}翻 → 緑枠が推奨点数`;
    }else if(han){
      text=`M8総合判定：${han}翻 → 符を確定すると推奨点数を表示`;
    }else{
      old?.remove();
      return;
    }

    let box=old;
    if(!box){
      box=document.createElement('div');
      box.id='m8v25-score-summary';
      table.insertAdjacentElement('beforebegin',box);
    }
    if(box.textContent!==text)box.textContent=text;
  }

  function refresh(){
    normalizePlayerPick();
    updateScoreSummary();
  }

  document.addEventListener('click',()=>{
    // クリック処理でwinner/discarderや点数表DOMが更新された後に1回だけ再適用。
    requestAnimationFrame(refresh);
    setTimeout(refresh,60);
  },true);

  ['pageshow','resize','orientationchange'].forEach(ev=>{
    window.addEventListener(ev,refresh,{passive:true});
  });
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});

  refresh();
})();