// MAKI v111: score-table hand entry + reuse already-entered agari context.
(()=>{
  'use strict';

  const VERSION='MAKI v114';
  const TILES=[
    '1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬',
    '1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒',
    '1索','2索','3索','4索','5索','6索','7索','8索','9索',
    '東','南','西','北','白','發','中'
  ];
  const GROUPS=[
    ['萬子',TILES.slice(0,9)],
    ['筒子',TILES.slice(9,18)],
    ['索子',TILES.slice(18,27)],
    ['字牌',TILES.slice(27)]
  ];

  const badge=document.getElementById('app-build-badge');
  if(badge) badge.textContent=VERSION;

  window.MAKIHandEntryStateV111=window.MAKIHandEntryStateV111||null;
  window.MAKIHandEntryPendingV111=window.MAKIHandEntryPendingV111||null;

  const style=document.createElement('style');
  style.textContent=`
    #maki-hand-entry-v111{
      margin:4px 0 6px;padding:7px 9px;border:1px solid rgba(79,151,118,.55);
      border-radius:10px;background:#eaf7ef;color:#173b2a;flex:none
    }
    #maki-hand-entry-v111 .maki-v111-head{
      display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px
    }
    #maki-hand-entry-v111 .maki-v111-title{font-size:13px;font-weight:900}
    #maki-hand-entry-v111 .maki-v111-context{font-size:10px;font-weight:800;color:#547064;text-align:right}
    #maki-hand-entry-v111 .maki-v111-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #maki-hand-entry-v111 button{
      min-height:35px;border:0;border-radius:9px;padding:6px 8px;font-size:12px;font-weight:900
    }
    #maki-hand-entry-v111 .maki-v111-camera{background:#16885d;color:#fff}
    #maki-hand-entry-v111 .maki-v111-manual{background:#fff;color:#173b2a;border:1px solid #9fc8b2}
    #maki-hand-entry-v111 .maki-v111-status{
      margin-top:5px;font-size:10px;font-weight:800;text-align:center;color:#43685a
    }

    #maki-manual-hand-v111{
      position:fixed;inset:0;z-index:2147483300;background:rgba(0,0,0,.66);
      display:flex;align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))
    }
    #maki-manual-hand-v111 .maki-v111-card{
      width:min(1050px,96vw);max-height:94dvh;overflow:auto;background:#f7f3e9;color:#102019;
      border-radius:18px;padding:12px 14px;box-shadow:0 18px 55px rgba(0,0,0,.38)
    }
    #maki-manual-hand-v111 .maki-v111-manual-head{
      display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px
    }
    #maki-manual-hand-v111 h2{font-size:20px;margin:0}
    #maki-manual-hand-v111 .maki-v111-help{font-size:11px;color:#5d6c65;font-weight:700}
    #maki-manual-hand-v111 .maki-v111-close{
      min-height:34px;padding:5px 12px;border:0;border-radius:9px;background:#dde2df;color:#173b2a;font-weight:900
    }
    #maki-manual-hand-v111 .maki-v111-slots{
      display:grid;grid-template-columns:repeat(14,minmax(46px,1fr));gap:6px;margin:8px 0 10px
    }
    #maki-manual-hand-v111 .maki-v111-slot{
      min-width:0;min-height:72px;padding:4px;border:2px solid #d4c9aa;border-radius:12px;
      background:linear-gradient(180deg,#fff,#f6f2e7);color:#17241e;font-size:11px;font-weight:900;
      display:flex;align-items:center;justify-content:center;position:relative
    }
    #maki-manual-hand-v111 .maki-v111-slot.active{border-color:#078cff;box-shadow:0 0 0 3px rgba(7,140,255,.18)}
    #maki-manual-hand-v111 .maki-v111-slot.empty{color:#9b9587;background:#f2eee4}
    #maki-manual-hand-v111 .maki-v111-slot-index{font-size:18px;line-height:1;font-weight:900;opacity:.85}
    #maki-manual-hand-v111 .maki-v111-picker{
      display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:7px
    }
    #maki-manual-hand-v111 .maki-v111-group{
      padding:8px;border-radius:12px;background:#ece8de;border:1px solid #d7d0c1
    }
    #maki-manual-hand-v111 .maki-v111-group b{display:block;font-size:12px;margin-bottom:6px}
    #maki-manual-hand-v111 .maki-v111-tile-grid{
      display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px
    }
    #maki-manual-hand-v111 .maki-v111-tile{
      min-height:56px;padding:4px 2px;border:1px solid #c9c2b4;border-radius:10px;background:linear-gradient(180deg,#fff,#f6f2e7);
      color:#16261f;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center
    }
    #maki-manual-hand-v111 .maki-v111-tile:disabled{opacity:.34}
    #maki-manual-hand-v111 .maki-v111-face{
      width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;
      border-radius:8px;background:linear-gradient(180deg,#ffffff,#fbf7ed);border:1px solid rgba(186,176,150,.55);
      box-shadow:inset 0 -1px 0 rgba(0,0,0,.06);padding:3px 1px
    }
    #maki-manual-hand-v111 .maki-v111-slot .maki-v111-face{padding:5px 2px}
    #maki-manual-hand-v111 .maki-v111-face-rank{font-size:14px;line-height:1;font-weight:900}
    #maki-manual-hand-v111 .maki-v111-face-suit{font-size:23px;line-height:1.05;font-weight:900}
    #maki-manual-hand-v111 .maki-v111-face-label{font-size:9px;line-height:1;font-weight:800;opacity:.82}
    #maki-manual-hand-v111 .maki-v111-honor .maki-v111-face-main{font-size:28px;line-height:1.08;font-weight:900;margin:auto 0}
    #maki-manual-hand-v111 .maki-v111-suit-man .maki-v111-face-rank,#maki-manual-hand-v111 .maki-v111-suit-man .maki-v111-face-suit,#maki-manual-hand-v111 .maki-v111-honor-white .maki-v111-face-main{color:#c6382c}
    #maki-manual-hand-v111 .maki-v111-suit-pin .maki-v111-face-rank,#maki-manual-hand-v111 .maki-v111-suit-pin .maki-v111-face-suit,#maki-manual-hand-v111 .maki-v111-honor-east .maki-v111-face-main,#maki-manual-hand-v111 .maki-v111-honor-south .maki-v111-face-main,#maki-manual-hand-v111 .maki-v111-honor-west .maki-v111-face-main,#maki-manual-hand-v111 .maki-v111-honor-north .maki-v111-face-main{color:#1e2a24}
    #maki-manual-hand-v111 .maki-v111-suit-sou .maki-v111-face-rank,#maki-manual-hand-v111 .maki-v111-suit-sou .maki-v111-face-suit,#maki-manual-hand-v111 .maki-v111-honor-green .maki-v111-face-main{color:#15754e}
    #maki-manual-hand-v111 .maki-v111-honor-red .maki-v111-face-main{color:#c6382c}
    #maki-manual-hand-v111 .maki-v111-error{
      min-height:17px;margin:5px 0 0;color:#b33;font-size:11px;font-weight:900;text-align:center
    }
    #maki-manual-hand-v111 .maki-v111-footer{
      display:grid;grid-template-columns:1fr 1fr 1fr 1.6fr;gap:7px;margin-top:7px
    }
    #maki-manual-hand-v111 .maki-v111-footer button{
      min-height:36px;border:0;border-radius:9px;padding:5px 8px;font-size:11px;font-weight:900
    }
    #maki-manual-hand-v111 .maki-v111-undo{background:#e5e4df;color:#16261f}
    #maki-manual-hand-v111 .maki-v111-clear{background:#e5e4df;color:#16261f}
    #maki-manual-hand-v111 .maki-v111-cancel{background:#d6ddd9;color:#16261f}
    #maki-manual-hand-v111 .maki-v111-done{background:#1cbe72;color:#fff}
    #maki-manual-hand-v111 .maki-v111-done:disabled{background:#b8c7bf;color:#eef2f0}

    #m8-context-v5 .m8v5-row.maki-v111-auto-context [data-winner],
    #m8-context-v5 .m8v5-row.maki-v111-auto-context [data-type]{display:none!important}
    #m8-context-v5 .maki-v111-inherited{
      display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border-radius:999px;
      background:#dff4e8;color:#174b34;font-size:12px;font-weight:900
    }
    #m8-result-v1 .maki-v111-agari-context{
      margin:6px 0 8px;padding:7px 10px;border-radius:10px;background:#e9f7ef;
      color:#153d29;font-size:12px;font-weight:900;text-align:center
    }
    #agari-overlay .limit-button.maki-v111-limit-recommend{
      outline:3px solid #23c878!important;outline-offset:-3px!important;
      background:rgba(35,200,120,.20)!important;border-color:#23c878!important;color:#fff!important
    }

    @media (orientation:landscape) and (max-height:500px){
      #maki-hand-entry-v111{padding:5px 7px;margin:2px 0 4px}
      #maki-hand-entry-v111 .maki-v111-head{margin-bottom:3px}
      #maki-hand-entry-v111 button{min-height:31px;padding:4px 7px;font-size:11px}
      #maki-manual-hand-v111 .maki-v111-card{padding:8px 10px}
      #maki-manual-hand-v111 h2{font-size:17px}
      #maki-manual-hand-v111 .maki-v111-slots{margin:4px 0}
      #maki-manual-hand-v111 .maki-v111-slot{min-height:58px;font-size:10px}
      #maki-manual-hand-v111 .maki-v111-picker{gap:4px;margin-top:4px}
      #maki-manual-hand-v111 .maki-v111-group{padding:4px}
      #maki-manual-hand-v111 .maki-v111-tile{min-height:44px;font-size:9px}
      #maki-manual-hand-v111 .maki-v111-footer{margin-top:4px}
      #maki-manual-hand-v111 .maki-v111-footer button{min-height:31px}
    }
  `;
  document.head.appendChild(style);

  function safeAgari(){
    try{
      return {
        active:!!agariFlow.active,
        step:agariFlow.step||'',
        type:agariFlow.type||null,
        winners:Array.isArray(agariFlow.winners)?agariFlow.winners.slice():[],
        discarder:agariFlow.discarder||null,
        currentWinnerIndex:Number(agariFlow.currentWinnerIndex||0)
      };
    }catch(_){
      return {active:false,step:'',type:null,winners:[],discarder:null,currentWinnerIndex:0};
    }
  }

  function playerName(pos){
    if(!pos)return '';
    try{
      const x=currentPlayers?.[pos];
      if(x)return String(x);
    }catch(_){}
    return document.getElementById('game-name-'+pos)?.textContent?.trim()||pos;
  }

  function seatWind(pos){
    return document.getElementById('wind-'+pos)?.textContent?.trim()||'';
  }

  function roundSignature(){
    const round=document.querySelector('.round-info strong')?.textContent?.trim()||'';
    const honba=document.getElementById('honba-display')?.textContent?.trim()||'';
    const kyotaku=document.getElementById('kyotaku-display')?.textContent?.trim()||'';
    return round+'|'+honba+'|'+kyotaku;
  }

  function context(){
    const a=safeAgari();
    const winner=a.winners[a.currentWinnerIndex]||a.winners[0]||null;
    return {
      active:a.active,
      step:a.step,
      type:a.type,
      winner,
      discarder:a.discarder,
      currentWinnerIndex:a.currentWinnerIndex,
      round:roundSignature(),
      createdAt:Date.now()
    };
  }

  function sameContext(a,b){
    return !!(a&&b&&a.winner===b.winner&&a.type===b.type&&a.round===b.round&&a.currentWinnerIndex===b.currentWinnerIndex);
  }

  function contextText(ctx){
    if(!ctx?.winner)return '';
    const who=playerName(ctx.winner)+(seatWind(ctx.winner)?'（'+seatWind(ctx.winner)+'）':'');
    const type=ctx.type==='ron'?'ロン':ctx.type==='tsumo'?'ツモ':'';
    const discarder=ctx.type==='ron'&&ctx.discarder
      ?' / 放銃 '+playerName(ctx.discarder)+(seatWind(ctx.discarder)?'（'+seatWind(ctx.discarder)+'）':'')
      :'';
    return who+(type?' / '+type:'')+discarder;
  }

  function registeredFor(ctx){
    const saved=window.MAKIHandEntryStateV111;
    return sameContext(saved,ctx)&&Array.isArray(saved.tiles)&&saved.tiles.length===14?saved:null;
  }

  function mountScoreHandEntry(){
    const table=document.querySelector('#agari-overlay .score-switch-table');
    if(!table)return;
    const ctx=context();
    if(!ctx.active||ctx.step!=='score'||!ctx.winner)return;

    let panel=document.getElementById('maki-hand-entry-v111');
    if(!panel){
      panel=document.createElement('section');
      panel.id='maki-hand-entry-v111';
      panel.innerHTML=`
        <div class="maki-v111-head">
          <span class="maki-v111-title">手牌登録</span>
          <span class="maki-v111-context"></span>
        </div>
        <div class="maki-v111-actions">
          <button type="button" class="maki-v111-camera">📷 カメラで認識</button>
          <button type="button" class="maki-v111-manual">⌨️ 手動入力</button>
        </div>
        <div class="maki-v111-status">どちらかで14枚を登録すると、役・符判定へ進みます</div>
      `;
      table.insertAdjacentElement('beforebegin',panel);
      panel.querySelector('.maki-v111-camera').addEventListener('click',openCameraFromScore);
      panel.querySelector('.maki-v111-manual').addEventListener('click',openManualEntry);
    }

    panel.querySelector('.maki-v111-context').textContent=contextText(ctx);
    const saved=registeredFor(ctx);
    panel.querySelector('.maki-v111-status').textContent=saved
      ?((saved.source==='manual'?'手動':'カメラ')+'で14枚登録済み ✓　変更する場合は上のボタンから登録し直せます')
      :'どちらかで14枚を登録すると、役・符判定へ進みます';
  }

  function openCameraFromScore(){
    const ctx=context();
    if(!ctx.active||ctx.step!=='score'||!ctx.winner||!ctx.type){
      alert('和了者とロン/ツモを確定してから手牌を登録してください。');
      return;
    }
    window.MAKIHandEntryPendingV111={...ctx,source:'camera'};
    try{
      if(typeof openSimpleGameMenuV1!=='function')throw new Error('menu unavailable');
      openSimpleGameMenuV1();
      const button=document.getElementById('open-realtime-hand-camera-m7v3');
      if(!button)throw new Error('camera entry unavailable');
      button.click();
    }catch(_){
      window.MAKIHandEntryPendingV111=null;
      document.getElementById('simple-game-menu-v1')?.remove();
      alert('カメラを開けませんでした。もう一度お試しください。');
    }
  }

  function countsOf(values){
    const out={};
    values.filter(Boolean).forEach(t=>out[t]=(out[t]||0)+1);
    return out;
  }

  function tileFaceInfo(tile){
    if(!tile)return null;
    const suitMap={萬:{cls:'maki-v111-suit-man'},筒:{cls:'maki-v111-suit-pin'},索:{cls:'maki-v111-suit-sou'}};
    const honorMap={東:{cls:'maki-v111-honor maki-v111-honor-east'},南:{cls:'maki-v111-honor maki-v111-honor-south'},西:{cls:'maki-v111-honor maki-v111-honor-west'},北:{cls:'maki-v111-honor maki-v111-honor-north'},白:{cls:'maki-v111-honor maki-v111-honor-white'},發:{cls:'maki-v111-honor maki-v111-honor-green'},中:{cls:'maki-v111-honor maki-v111-honor-red'}};
    const m=String(tile).match(/^(\d)([萬筒索])$/);
    if(m)return {kind:'suit',cls:suitMap[m[2]].cls,rank:m[1],symbol:m[2],label:tile};
    if(honorMap[tile])return {kind:'honor',cls:honorMap[tile].cls,main:tile,label:tile};
    return {kind:'text',cls:'',main:String(tile),label:tile};
  }

  function tileFaceHTML(tile){
    const info=tileFaceInfo(tile);
    if(!info)return '';
    if(info.kind==='suit'){
      return `<span class="maki-v111-face ${info.cls}"><span class="maki-v111-face-rank">${info.rank}</span><span class="maki-v111-face-suit">${info.symbol}</span><span class="maki-v111-face-label">${info.label}</span></span>`;
    }
    if(info.kind==='honor'){
      return `<span class="maki-v111-face ${info.cls}"><span class="maki-v111-face-main">${info.main}</span><span class="maki-v111-face-label">${info.label}</span></span>`;
    }
    return `<span class="maki-v111-face"><span class="maki-v111-face-main">${info.main}</span><span class="maki-v111-face-label">${info.label}</span></span>`;
  }

  function openManualEntry(){
    const ctx=context();
    if(!ctx.active||ctx.step!=='score'||!ctx.winner||!ctx.type){
      alert('和了者とロン/ツモを確定してから手牌を登録してください。');
      return;
    }
    document.getElementById('maki-manual-hand-v111')?.remove();
    window.MAKIHandEntryPendingV111={...ctx,source:'manual'};

    const saved=registeredFor(ctx);
    const values=Array.from({length:14},(_,i)=>saved?.tiles?.[i]||'');
    let active=values.findIndex(x=>!x);
    if(active<0)active=13;

    const root=document.createElement('div');
    root.id='maki-manual-hand-v111';
    root.innerHTML=`
      <div class="maki-v111-card" role="dialog" aria-modal="true" aria-label="手牌を手動入力">
        <div class="maki-v111-manual-head">
          <div><h2>手牌を手動入力</h2><div class="maki-v111-help">14枚を順番に選択してください。入力済みの枠をタップすると、その位置だけ変更できます。</div></div>
          <button type="button" class="maki-v111-close">閉じる</button>
        </div>
        <div class="maki-v111-slots"></div>
        <div class="maki-v111-picker"></div>
        <div class="maki-v111-error" aria-live="polite"></div>
        <div class="maki-v111-footer">
          <button type="button" class="maki-v111-undo">1つ戻す</button>
          <button type="button" class="maki-v111-clear">全消去</button>
          <button type="button" class="maki-v111-cancel">キャンセル</button>
          <button type="button" class="maki-v111-done" disabled>この手牌で役・符判定へ</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const slots=root.querySelector('.maki-v111-slots');
    const picker=root.querySelector('.maki-v111-picker');
    const error=root.querySelector('.maki-v111-error');
    const done=root.querySelector('.maki-v111-done');

    for(let i=0;i<14;i++){
      const b=document.createElement('button');
      b.type='button';b.className='maki-v111-slot';b.dataset.index=String(i);
      b.addEventListener('click',()=>{active=i;render();});
      slots.appendChild(b);
    }

    for(const [name,tiles] of GROUPS){
      const box=document.createElement('section');box.className='maki-v111-group';
      const title=document.createElement('b');title.textContent=name;box.appendChild(title);
      const grid=document.createElement('div');grid.className='maki-v111-tile-grid';
      for(const tile of tiles){
        const b=document.createElement('button');b.type='button';b.className='maki-v111-tile';b.dataset.tile=tile;b.innerHTML=tileFaceHTML(tile);b.setAttribute('aria-label',tile);
        b.addEventListener('click',()=>{
          const counts=countsOf(values);
          const old=values[active];
          if(tile!==old&&(counts[tile]||0)>=4){
            error.textContent=tile+'は4枚までです。';return;
          }
          values[active]=tile;error.textContent='';
          const next=values.findIndex((x,i)=>!x&&i>active);
          if(next>=0)active=next;
          else{
            const first=values.findIndex(x=>!x);
            if(first>=0)active=first;
          }
          render();
        });
        grid.appendChild(b);
      }
      box.appendChild(grid);picker.appendChild(box);
    }

    function render(){
      const buttons=[...slots.querySelectorAll('.maki-v111-slot')];
      buttons.forEach((b,i)=>{
        b.innerHTML=values[i]?tileFaceHTML(values[i]):'<span class="maki-v111-slot-index">'+String(i+1)+'</span>';
        b.classList.toggle('empty',!values[i]);
        b.classList.toggle('active',i===active);
        b.setAttribute('aria-label',(i+1)+'枚目 '+(values[i]||'未入力'));
      });
      const counts=countsOf(values);
      root.querySelectorAll('.maki-v111-tile').forEach(b=>{
        const tile=b.dataset.tile;
        b.disabled=(counts[tile]||0)>=4&&values[active]!==tile;
      });
      const filled=values.filter(Boolean).length;
      done.disabled=filled!==14;
      done.textContent=filled===14?'この手牌で役・符判定へ':'あと'+(14-filled)+'枚';
    }

    function close(){
      root.remove();
    }

    root.querySelector('.maki-v111-close').onclick=close;
    root.querySelector('.maki-v111-cancel').onclick=close;
    root.querySelector('.maki-v111-clear').onclick=()=>{
      values.fill('');active=0;error.textContent='';render();
    };
    root.querySelector('.maki-v111-undo').onclick=()=>{
      let i=-1;
      for(let n=13;n>=0;n--)if(values[n]){i=n;break;}
      if(i>=0){values[i]='';active=i;error.textContent='';render();}
    };
    done.onclick=()=>{
      const tiles=values.slice();
      if(tiles.some(x=>!x))return;
      const counts=countsOf(tiles);
      const invalid=Object.entries(counts).find(([,n])=>n>4);
      if(invalid){error.textContent=invalid[0]+'が5枚以上あります。';return;}
      primeHandObserversAndPublish(tiles,root,error);
    };

    render();
  }

  function primeHandObserversAndPublish(tiles,manualRoot,error){
    document.getElementById('maki-v111-hand-prime')?.remove();
    const ghost=document.createElement('div');
    ghost.id='maki-v111-hand-prime';
    ghost.style.display='none';

    // Existing M8 v5/v19 observers read these established class names.
    const hand=document.createElement('div');
    hand.id='hand-result-overlay-m7v5';
    for(const tile of tiles){
      const b=document.createElement('button');
      b.className='hand-result-tile-m7v5';b.dataset.tile=tile;hand.appendChild(b);
    }
    ghost.appendChild(hand);
    document.body.appendChild(ghost);

    requestAnimationFrame(()=>{
      let result={ok:false,reason:'bridge-missing'};
      try{
        if(typeof window.acceptVerifiedHandM8V87==='function'){
          result=window.acceptVerifiedHandM8V87(tiles,{show:true})||{ok:true};
        }
      }catch(e){
        result={ok:false,reason:String(e?.message||e)};
      }
      if(result?.ok){
        manualRoot?.remove();
        setTimeout(()=>ghost.remove(),60);
      }else{
        ghost.remove();
        if(error)error.textContent='手牌を役・符判定へ渡せませんでした。14枚を確認してもう一度お試しください。';
      }
    });
  }

  function finiteSuggested(...vals){
    for(const v of vals){
      if(v===null||v===undefined||v==='')continue;
      if(v==='yakuman')return 'yakuman';
      const n=Number(v);
      if(Number.isFinite(n))return n;
    }
    return null;
  }

  function suggestedLimitKey(){
    const han=finiteSuggested(window.m8SuggestedHanV23,window.m8SuggestedHanV22,window.m8SuggestedHanV9,window.m8SuggestedHanV6);
    if(han==='yakuman')return 'yakuman';
    if(!Number.isFinite(Number(han)))return '';
    const n=Number(han);
    if(n>=13)return 'yakuman';
    if(n>=11)return 'sanbaiman';
    if(n>=8)return 'baiman';
    if(n>=6)return 'haneman';
    if(n>=5)return 'mangan';
    return '';
  }

  function decorateLimitRecommendation(){
    const root=document.getElementById('agari-overlay');
    if(!root)return;
    const key=suggestedLimitKey();
    root.querySelectorAll('.limit-button').forEach(btn=>{
      const hit=!!key&&btn.dataset.limit===key;
      btn.classList.toggle('maki-v111-limit-recommend',hit);
      if(hit)btn.setAttribute('aria-label',(btn.textContent||'').trim()+' M8推奨');
    });
  }

  window.addEventListener('maki:verified-hand',e=>{
    const tiles=Array.isArray(e.detail?.tiles)?e.detail.tiles.slice():[];
    const pending=window.MAKIHandEntryPendingV111;
    if(tiles.length!==14||!pending)return;
    if(Date.now()-Number(pending.createdAt||0)>5*60*1000){
      window.MAKIHandEntryPendingV111=null;return;
    }
    const now=context();
    if(!sameContext(pending,now))return;
    window.MAKIHandEntryStateV111={...pending,tiles,verifiedAt:Date.now()};
    window.MAKIHandEntryPendingV111=null;
    setTimeout(()=>{mountScoreHandEntry();decorateLimitRecommendation();},0);
  });

  function decorateM8Context(){
    const panel=document.getElementById('m8-context-v5');
    const card=document.querySelector('#m8-result-v1 .m8-card');
    if(!panel||!card)return;
    const ctx=context();
    if(!ctx.active||!ctx.winner||!ctx.type)return;

    const winnerButton=panel.querySelector('[data-winner="'+ctx.winner+'"]');
    if(winnerButton&&!winnerButton.classList.contains('active'))winnerButton.click();
    const typeButton=panel.querySelector('[data-type="'+ctx.type+'"]');
    if(typeButton&&!typeButton.classList.contains('active'))typeButton.click();

    for(const row of panel.querySelectorAll('.m8v5-row')){
      const label=row.querySelector('.m8v5-label')?.textContent?.trim();
      if(label!=='和了者'&&label!=='和了方法')continue;
      row.classList.add('maki-v111-auto-context');
      let inherited=row.querySelector('.maki-v111-inherited');
      if(!inherited){
        inherited=document.createElement('span');
        inherited.className='maki-v111-inherited';
        row.appendChild(inherited);
      }
      inherited.textContent=label==='和了者'
        ?playerName(ctx.winner)+(seatWind(ctx.winner)?'（'+seatWind(ctx.winner)+'）':'')+'　対局入力から引継ぎ'
        :(ctx.type==='ron'?'ロン':'ツモ')+'　対局入力から引継ぎ';
    }

    let summary=card.querySelector('.maki-v111-agari-context');
    if(!summary){
      summary=document.createElement('div');
      summary.className='maki-v111-agari-context';
      const anchor=panel;
      anchor.insertAdjacentElement('beforebegin',summary);
    }
    summary.textContent='入力済み情報を引継ぎ：'+contextText(ctx);
  }

  // renderScoreTable is the stable score-screen entry point. Wrap without changing
  // the scoring implementation itself.
  try{
    if(typeof renderScoreTable==='function'&&!window.MAKIV111RenderWrapped){
      const previous=renderScoreTable;
      renderScoreTable=function(...args){
        const result=previous.apply(this,args);
        requestAnimationFrame(()=>{mountScoreHandEntry();decorateLimitRecommendation();});
        return result;
      };
      window.MAKIV111RenderWrapped=true;
    }
  }catch(_){}

  const observer=new MutationObserver(mutations=>{
    let score=false,result=false;
    for(const m of mutations){
      for(const n of m.addedNodes){
        if(n.nodeType!==1)continue;
        if(n.matches?.('.score-switch-table')||n.querySelector?.('.score-switch-table'))score=true;
        if(n.matches?.('#m8-context-v5,#m8-result-v1')||n.querySelector?.('#m8-context-v5,#m8-result-v1'))result=true;
      }
    }
    if(score)requestAnimationFrame(()=>{mountScoreHandEntry();decorateLimitRecommendation();});
    if(result)setTimeout(decorateM8Context,0);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#agari-overlay'))setTimeout(()=>{mountScoreHandEntry();decorateLimitRecommendation();},0);
    if(e.target.closest?.('#m8-result-v1'))setTimeout(decorateM8Context,0);
  },true);

  window.addEventListener('pageshow',()=>{
    setTimeout(()=>{mountScoreHandEntry();decorateLimitRecommendation();},80);
    setTimeout(decorateM8Context,100);
  },{passive:true});

  window.MAKIV111=Object.freeze({
    mountScoreHandEntry,
    openManualEntry,
    decorateM8Context,
    decorateLimitRecommendation,
    suggestedLimitKey,
    context
  });

  mountScoreHandEntry();
  decorateLimitRecommendation();
  decorateM8Context();
})();
