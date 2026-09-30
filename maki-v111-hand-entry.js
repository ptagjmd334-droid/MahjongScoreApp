// MAKI v111: score-table hand entry + reuse already-entered agari context.
(()=>{
  'use strict';

  const VERSION='MAKI v121';
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

    #maki-hand-entry-v111 .maki-v118-dora{
      margin-top:6px;padding:6px;border-radius:9px;background:#fffdf4;border:1px solid #d8c98a
    }
    #maki-hand-entry-v111 .maki-v118-dora-head{
      display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px
    }
    #maki-hand-entry-v111 .maki-v118-dora-title{font-size:11px;font-weight:900;color:#463d16}
    #maki-hand-entry-v111 .maki-v118-dora-total{font-size:10px;font-weight:900;color:#795f00}
    #maki-hand-entry-v111 .maki-v118-dora-grid{
      display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px
    }
    #maki-hand-entry-v111 .maki-v118-dora-counter{
      display:grid;grid-template-columns:minmax(44px,1fr) 30px 32px 30px;align-items:center;gap:2px;
      min-width:0;padding:3px;border-radius:8px;background:#f4f0df
    }
    #maki-hand-entry-v111 .maki-v118-dora-label{
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:900;text-align:center
    }
    #maki-hand-entry-v111 .maki-v118-dora-counter button{
      min-height:28px!important;padding:2px!important;border-radius:7px!important;background:#fff!important;
      border:1px solid #cdbd79!important;color:#2b301f!important;font-size:16px!important;line-height:1!important
    }
    #maki-hand-entry-v111 .maki-v118-dora-value{
      display:flex;align-items:center;justify-content:center;min-height:28px;border-radius:7px;
      background:#fff;color:#18251e;font-size:14px;font-weight:900
    }
    #maki-hand-entry-v111 .maki-v118-dora-counter.disabled{opacity:.48}
    #maki-hand-entry-v111 .maki-v118-dora-note{
      margin-top:4px;font-size:9px;font-weight:800;text-align:center;color:#746b46
    }

    #maki-hand-entry-v111 .maki-v119-dora-camera{
      min-height:26px!important;padding:3px 8px!important;border:1px solid #cdbd79!important;
      border-radius:8px!important;background:#fff!important;color:#3c4a35!important;font-size:10px!important
    }
    #maki-hand-entry-v111 .maki-v119-indicators{
      margin-top:4px;display:flex;align-items:center;justify-content:center;gap:5px;min-height:18px;
      font-size:9px;font-weight:900;color:#625a36;text-align:center;flex-wrap:wrap
    }
    #maki-hand-entry-v111 .maki-v119-clear-indicators{
      min-height:20px!important;padding:2px 6px!important;border-radius:7px!important;
      background:#eee8d6!important;color:#655f44!important;font-size:9px!important
    }
    #maki-dora-camera-v119{
      position:fixed;inset:0;z-index:2147483400;background:#000;color:#fff;overflow:hidden
    }
    #maki-dora-camera-v119 video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    #maki-dora-camera-v119 .maki-v119-dora-shade{
      position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none
    }
    #maki-dora-camera-v119 .maki-v119-dora-guide{
      width:min(28vw,210px);height:min(58vh,260px);border:4px solid #fff;border-radius:18px;
      box-shadow:0 0 0 9999px rgba(0,0,0,.42)
    }
    #maki-dora-camera-v119 .maki-v119-dora-status{
      position:absolute;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);
      width:min(620px,80vw);padding:7px 12px;border-radius:999px;background:rgba(0,0,0,.72);
      text-align:center;font-size:12px;font-weight:900
    }
    #maki-dora-camera-v119 .maki-v119-dora-actions{
      position:absolute;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));
      display:flex;justify-content:center;gap:10px
    }
    #maki-dora-camera-v119 button{
      min-height:42px;border:0;border-radius:11px;padding:7px 15px;font-size:13px;font-weight:900
    }
    #maki-dora-camera-v119 .maki-v119-dora-capture,
    #maki-dora-camera-v119 .maki-v119-dora-accept{background:#19ad6d;color:#fff}
    #maki-dora-camera-v119 .maki-v119-dora-cancel,
    #maki-dora-camera-v119 .maki-v119-dora-retry{background:#e5e5e5;color:#17231d}
    #maki-dora-camera-v119 .maki-v119-dora-result{
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;
      width:min(520px,84vw);padding:18px;border-radius:18px;background:#f7f3e9;color:#153227;
      text-align:center;box-shadow:0 12px 45px rgba(0,0,0,.45)
    }
    #maki-dora-camera-v119 .maki-v119-dora-result strong{display:block;font-size:22px;margin-bottom:6px}
    #maki-dora-camera-v119 .maki-v119-dora-result small{display:block;font-weight:800;color:#59685f;margin-bottom:12px}
    #maki-dora-camera-v119 .maki-v119-dora-result .row{display:flex;gap:8px;justify-content:center}

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
      display:grid;grid-template-columns:repeat(14,minmax(36px,1fr));gap:4px;margin:4px 0 3px
    }
    #maki-manual-hand-v111 .maki-v111-slot{
      min-width:0;height:45px;padding:2px;border:2px solid #d4c9aa;border-radius:8px;
      background:#fff;color:#17241e;font-weight:900;display:flex;align-items:center;justify-content:center
    }
    #maki-manual-hand-v111 .maki-v111-slot.active{border-color:#078cff;box-shadow:0 0 0 2px rgba(7,140,255,.18)}
    #maki-manual-hand-v111 .maki-v111-slot.empty{color:#078cff;background:#fafafa}
    #maki-manual-hand-v111 .maki-v111-slot-index{font-size:19px;line-height:1;font-weight:800}
    #maki-manual-hand-v111 .maki-v111-picker{
      display:grid;grid-template-columns:1fr;gap:3px;margin-top:3px
    }
    #maki-manual-hand-v111 .maki-v111-group{
      display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:5px;
      padding:3px 5px;border-radius:8px;background:#ece8de;border:1px solid #d7d0c1
    }
    #maki-manual-hand-v111 .maki-v111-group b{
      display:block;margin:0;text-align:center;font-size:11px;white-space:nowrap
    }
    #maki-manual-hand-v111 .maki-v111-tile-grid{
      display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:4px
    }
    #maki-manual-hand-v111 .maki-v111-tile{
      height:45px;min-height:45px;padding:1px;border:1px solid #c9c2b4;border-radius:7px;background:#fff;
      color:#16261f;font-weight:900;display:flex;align-items:center;justify-content:center;overflow:hidden
    }
    #maki-manual-hand-v111 .maki-v111-tile:disabled{opacity:.34}
    #maki-manual-hand-v111 .maki-v111-face{
      width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px
    }
    #maki-manual-hand-v111 .maki-v111-glyph{
      display:block;font-family:"Apple Symbols","Noto Sans Symbols 2","Segoe UI Symbol",sans-serif;
      font-size:31px;line-height:1;transform:translateY(-1px)
    }
    #maki-manual-hand-v111 .maki-v111-slot .maki-v111-glyph{font-size:30px}
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
      #maki-hand-entry-v111 .maki-v118-dora{margin-top:3px;padding:4px}
      #maki-hand-entry-v111 .maki-v118-dora-head{margin-bottom:2px}
      #maki-hand-entry-v111 .maki-v118-dora-counter{grid-template-columns:minmax(38px,1fr) 27px 29px 27px;padding:2px}
      #maki-hand-entry-v111 .maki-v118-dora-counter button{min-height:25px!important}
      #maki-hand-entry-v111 .maki-v118-dora-value{min-height:25px}
      #maki-hand-entry-v111 .maki-v118-dora-note{margin-top:2px;font-size:8px}
      #maki-manual-hand-v111 .maki-v111-card{padding:7px 9px;max-height:calc(100dvh - 8px);overflow:hidden}
      #maki-manual-hand-v111 h2{font-size:16px}
      #maki-manual-hand-v111 .maki-v111-help{font-size:10px}
      #maki-manual-hand-v111 .maki-v111-manual-head{margin-bottom:2px}
      #maki-manual-hand-v111 .maki-v111-slots{margin:2px 0}
      #maki-manual-hand-v111 .maki-v111-slot{height:39px;min-height:39px}
      #maki-manual-hand-v111 .maki-v111-picker{gap:2px;margin-top:2px}
      #maki-manual-hand-v111 .maki-v111-group{padding:2px 4px}
      #maki-manual-hand-v111 .maki-v111-tile{height:39px;min-height:39px}
      #maki-manual-hand-v111 .maki-v111-glyph{font-size:27px}
      #maki-manual-hand-v111 .maki-v111-slot .maki-v111-glyph{font-size:26px}
      #maki-manual-hand-v111 .maki-v111-error{min-height:12px;margin:1px 0 0;font-size:9px}
      #maki-manual-hand-v111 .maki-v111-footer{margin-top:2px}
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

  window.MAKIDoraStatesV118=window.MAKIDoraStatesV118||{};

  function doraContextKey(ctx=context()){
    if(!ctx?.active||!ctx.winner||!ctx.type)return '';
    return [ctx.round,ctx.type,ctx.winner,ctx.currentWinnerIndex].join('|');
  }

  function winnerIsRiichi(ctx=context()){
    if(!ctx?.winner)return false;
    try{return !!gameState?.riichi?.[ctx.winner];}catch(_){return false;}
  }

  function doraStateFor(ctx=context(),create=true){
    const key=doraContextKey(ctx);
    if(!key)return {dora:0,aka:0,ura:0,key:''};
    let state=window.MAKIDoraStatesV118[key];
    if(!state&&create){
      state={dora:0,aka:0,ura:0,key,ctx:{winner:ctx.winner,type:ctx.type,round:ctx.round,currentWinnerIndex:ctx.currentWinnerIndex},updatedAt:Date.now()};
      window.MAKIDoraStatesV118[key]=state;
    }
    return state||{dora:0,aka:0,ura:0,key};
  }

  function normalizedDoraCount(value){
    const n=Math.floor(Number(value)||0);
    return Math.max(0,Math.min(99,n));
  }

  function effectiveDoraState(ctx=context()){
    const raw=doraStateFor(ctx,false);
    return {
      dora:normalizedDoraCount(raw.dora),
      aka:normalizedDoraCount(raw.aka),
      ura:winnerIsRiichi(ctx)?normalizedDoraCount(raw.ura):0,
      riichi:winnerIsRiichi(ctx)
    };
  }

  function applyDoraToRecommendation(base){
    const src=base||{};
    const copied={
      han:src.yakuman?'yakuman':Number(src.han||0),
      yakuman:!!src.yakuman,
      items:(src.items||[]).map(x=>({...x}))
    };
    const d=effectiveDoraState();
    if(copied.yakuman){
      return {...copied,dora:d,bonusHan:0};
    }
    const baseHan=Number(copied.han||0);
    if(!(baseHan>0)){
      return {...copied,han:baseHan,dora:d,bonusHan:0,noYakuBonusSuppressed:(d.dora+d.aka+d.ura)>0};
    }
    const bonusItems=[];
    if(d.dora>0)bonusItems.push({name:'ドラ',han:d.dora,bonus:true});
    if(d.aka>0)bonusItems.push({name:'赤ドラ',han:d.aka,bonus:true});
    if(d.ura>0)bonusItems.push({name:'裏ドラ',han:d.ura,bonus:true});
    const bonusHan=bonusItems.reduce((s,x)=>s+x.han,0);
    return {...copied,han:baseHan+bonusHan,items:[...copied.items,...bonusItems],dora:d,bonusHan,baseHan};
  }

  function invalidateScoreSelectionForDoraChange(){
    try{
      if(agariFlow?.active&&agariFlow.step==='score'){
        agariFlow.currentScoreSelection=null;
        const next=document.getElementById('score-next-button');
        if(next)next.disabled=true;
        document.querySelectorAll('#agari-overlay .score-cell.selected,#agari-overlay .limit-button.selected')
          .forEach(x=>x.classList.remove('selected'));
        const summary=document.querySelector('#agari-overlay .score-selected-summary');
        if(summary)summary.textContent='ドラ変更後の推奨点数を選び直してください';
      }
    }catch(_){}
  }

  function refreshRecommendationForDora(){
    const ctx=context();
    if(!registeredFor(ctx))return;
    const base=window.m8BaseYakuBreakdownV118;
    if(base&&window.M8V22?.publishRecommendation){
      window.M8V22.publishRecommendation(document.getElementById('m8-context-v5'),base);
    }else{
      window.dispatchEvent(new CustomEvent('maki:dora-changed',{detail:{...effectiveDoraState(ctx)}}));
      requestAnimationFrame(decorateLimitRecommendation);
    }
  }

  function setDoraCount(kind,value,ctx=context()){
    if(!['dora','aka','ura'].includes(kind))return false;
    if(kind==='ura'&&!winnerIsRiichi(ctx))value=0;
    const state=doraStateFor(ctx,true);
    state[kind]=normalizedDoraCount(value);
    state.updatedAt=Date.now();
    invalidateScoreSelectionForDoraChange();
    renderDoraControls();
    refreshRecommendationForDora();
    return true;
  }

  function adjustDora(kind,delta){
    const ctx=context(),state=doraStateFor(ctx,true);
    return setDoraCount(kind,normalizedDoraCount(state[kind])+Number(delta||0),ctx);
  }

  window.MAKIDoraIndicatorStatesV119=window.MAKIDoraIndicatorStatesV119||{};

  function indicatorStateFor(ctx=context(),create=true){
    const key=doraContextKey(ctx);
    if(!key)return {key:'',rawLabels:[]};
    let state=window.MAKIDoraIndicatorStatesV119[key];
    if(!state&&create){
      state={key,rawLabels:[],updatedAt:Date.now()};
      window.MAKIDoraIndicatorStatesV119[key]=state;
    }
    return state||{key,rawLabels:[]};
  }

  function appTileFromRawYolo(raw){
    return window.M7CameraV36?.yoloLabelToAppTile?.(raw)||'';
  }

  function doraTileFromIndicatorRaw(raw){
    const tile=appTileFromRawYolo(raw);
    if(!tile)return '';
    const honorNext={東:'南',南:'西',西:'北',北:'東',白:'發',發:'中',中:'白'};
    if(honorNext[tile])return honorNext[tile];
    const m=tile.match(/^([1-9])(萬|筒|索)$/);
    if(!m)return '';
    const n=Number(m[1]);
    return String(n===9?1:n+1)+m[2];
  }

  function indicatorPairs(ctx=context()){
    return (indicatorStateFor(ctx,false).rawLabels||[]).map(raw=>({
      raw,
      indicator:appTileFromRawYolo(raw),
      dora:doraTileFromIndicatorRaw(raw)
    })).filter(x=>x.indicator&&x.dora);
  }

  function countDoraFromIndicators(tiles,ctx=context()){
    if(!Array.isArray(tiles)||tiles.length!==14)return 0;
    const counts=countsOf(tiles);
    return indicatorPairs(ctx).reduce((sum,x)=>sum+(counts[x.dora]||0),0);
  }

  function syncIndicatorDoraCount(ctx=context(),tiles=null){
    const pairs=indicatorPairs(ctx);
    if(!pairs.length)return;
    const saved=Array.isArray(tiles)?tiles:registeredFor(ctx)?.tiles;
    if(!Array.isArray(saved)||saved.length!==14)return;
    setDoraCount('dora',countDoraFromIndicators(saved,ctx),ctx);
  }

  function applyCameraHandMetaV119(ctx,tiles,meta){
    if(!meta||Date.now()-Number(meta.createdAt||0)>2*60*1000)return false;
    if(!Array.isArray(meta.tiles)||meta.tiles.length!==14||meta.tiles.some((t,i)=>t!==tiles[i]))return false;
    setDoraCount('aka',normalizedDoraCount(meta.redCount),ctx);
    syncIndicatorDoraCount(ctx,tiles);
    return true;
  }

  function addDoraIndicatorRaw(raw,ctx=context()){
    const indicator=appTileFromRawYolo(raw),dora=doraTileFromIndicatorRaw(raw);
    if(!indicator||!dora)return false;
    const state=indicatorStateFor(ctx,true);
    if(state.rawLabels.length>=5)return false;
    state.rawLabels.push(String(raw));
    state.updatedAt=Date.now();
    syncIndicatorDoraCount(ctx);
    renderDoraControls();
    return true;
  }

  function clearDoraIndicators(ctx=context()){
    const state=indicatorStateFor(ctx,true);
    state.rawLabels=[];
    state.updatedAt=Date.now();
    setDoraCount('dora',0,ctx);
    renderDoraControls();
  }

  function stopDoraCameraV119(root){
    const video=root?.querySelector('video');
    try{video?.srcObject?.getTracks?.().forEach(t=>t.stop());}catch(_){}
    if(video)video.srcObject=null;
  }

  function captureDoraGuideFrameV119(video,guide){
    if(!video||video.readyState<2||!video.videoWidth)return null;
    const vr=video.getBoundingClientRect(),gr=guide.getBoundingClientRect();
    const rel={x:gr.left-vr.left,y:gr.top-vr.top,w:gr.width,h:gr.height};
    let src=window.M7CameraV36?.sourceRectForCover?.(video.videoWidth,video.videoHeight,vr.width,vr.height,rel);
    if(!src){
      const ratio=Math.min(video.videoWidth/video.videoHeight,1);
      const w=video.videoWidth*.36,h=video.videoHeight*.78;
      src={x:(video.videoWidth-w)/2,y:(video.videoHeight-h)/2,w,h};
    }
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(src.w));canvas.height=Math.max(1,Math.round(src.h));
    canvas.getContext('2d',{willReadFrequently:true}).drawImage(video,src.x,src.y,src.w,src.h,0,0,canvas.width,canvas.height);
    return canvas;
  }

  async function recognizeDoraIndicatorCanvasV119(canvas){
    const detector=window.M7CameraV36?.runYoloTileDetectorDiagnostic;
    if(typeof detector!=='function')return {ok:false,reason:'detector-unavailable'};
    let result;
    try{result=await detector(canvas,null);}catch(e){return {ok:false,reason:String(e?.message||e)};}
    const boxes=(result?.boxes||[]).filter(b=>b?.label&&Number(b.score)>=.12).sort((a,b)=>Number(b.score)-Number(a.score));
    if(!boxes.length)return {ok:false,reason:'no-tile'};
    const best=boxes[0],indicator=appTileFromRawYolo(best.label),dora=doraTileFromIndicatorRaw(best.label);
    if(!indicator||!dora)return {ok:false,reason:'unknown-label'};
    return {
      ok:true,rawLabel:String(best.label),indicator,dora,
      score:Number(best.score)||0,runner:String(best.runnerLabel||''),
      margin:Number(best.classMargin)||0
    };
  }

  async function openDoraIndicatorCamera(){
    const ctx=context();
    if(!ctx.active||ctx.step!=='score'||!ctx.winner)return;
    document.getElementById('maki-dora-camera-v119')?.remove();
    const root=document.createElement('div');root.id='maki-dora-camera-v119';
    root.innerHTML=`
      <video autoplay playsinline muted></video>
      <div class="maki-v119-dora-shade"><div class="maki-v119-dora-guide"></div></div>
      <div class="maki-v119-dora-status">ドラ表示牌を白枠に1枚だけ入れてください</div>
      <div class="maki-v119-dora-actions">
        <button type="button" class="maki-v119-dora-capture">撮影して認識</button>
        <button type="button" class="maki-v119-dora-cancel">キャンセル</button>
      </div>
    `;
    document.body.appendChild(root);
    const video=root.querySelector('video'),status=root.querySelector('.maki-v119-dora-status');
    const capture=root.querySelector('.maki-v119-dora-capture');
    const close=()=>{stopDoraCameraV119(root);root.remove();};
    root.querySelector('.maki-v119-dora-cancel').onclick=close;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false
      });
      if(!root.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
      video.srcObject=stream;await video.play().catch(()=>{});
    }catch(_){
      status.textContent='カメラを開けませんでした';
      capture.disabled=true;return;
    }
    capture.onclick=async()=>{
      const canvas=captureDoraGuideFrameV119(video,root.querySelector('.maki-v119-dora-guide'));
      if(!canvas){status.textContent='映像を取得できませんでした';return;}
      capture.disabled=true;status.textContent='ドラ表示牌を認識中…';
      const rec=await recognizeDoraIndicatorCanvasV119(canvas);
      if(!root.isConnected)return;
      if(!rec.ok){
        status.textContent='表示牌を認識できませんでした。位置を合わせて再撮影してください';
        capture.disabled=false;return;
      }
      stopDoraCameraV119(root);
      root.querySelector('.maki-v119-dora-actions').style.display='none';
      const box=document.createElement('div');box.className='maki-v119-dora-result';
      box.innerHTML=`
        <strong>表示牌 ${rec.indicator} → ドラ ${rec.dora}</strong>
        <small>認識信頼度 ${Math.round(rec.score*100)}%。間違っていれば撮り直してください。</small>
        <div class="row">
          <button type="button" class="maki-v119-dora-accept">この表示牌を追加</button>
          <button type="button" class="maki-v119-dora-retry">撮り直す</button>
        </div>
      `;
      root.appendChild(box);
      box.querySelector('.maki-v119-dora-accept').onclick=()=>{
        addDoraIndicatorRaw(rec.rawLabel,ctx);root.remove();
      };
      box.querySelector('.maki-v119-dora-retry').onclick=()=>{root.remove();openDoraIndicatorCamera();};
    };
  }

  function renderDoraControls(){
    const panel=document.getElementById('maki-hand-entry-v111');
    if(!panel)return;
    const ctx=context(),state=doraStateFor(ctx,true),effective=effectiveDoraState(ctx),riichi=effective.riichi;
    for(const kind of ['dora','aka','ura']){
      const row=panel.querySelector('.maki-v118-dora-counter[data-kind="'+kind+'"]');
      if(!row)continue;
      const disabled=kind==='ura'&&!riichi;
      row.classList.toggle('disabled',disabled);
      row.querySelector('.maki-v118-dora-value').textContent=String(kind==='ura'&&!riichi?0:normalizedDoraCount(state[kind]));
      row.querySelectorAll('button').forEach(b=>b.disabled=disabled);
    }
    const total=effective.dora+effective.aka+effective.ura;
    const totalEl=panel.querySelector('.maki-v118-dora-total');
    if(totalEl)totalEl.textContent=total?('合計 +'+total+'翻'):'合計 0翻';
    const note=panel.querySelector('.maki-v118-dora-note');
    if(note)note.textContent=riichi
      ?'ドラは役ではありません。裏ドラも加算します。'
      :'ドラは役ではありません。裏ドラはリーチ時のみ入力できます。';
    const indicatorBox=panel.querySelector('.maki-v119-indicators');
    if(indicatorBox){
      const pairs=indicatorPairs(ctx);
      indicatorBox.innerHTML=pairs.length
        ?'<span>表示牌: '+pairs.map(x=>x.indicator+'→'+x.dora).join(' / ')+'</span><button type="button" class="maki-v119-clear-indicators">表示牌を消去</button>'
        :'<span>表示牌カメラ未入力</span>';
      indicatorBox.querySelector('.maki-v119-clear-indicators')?.addEventListener('click',()=>clearDoraIndicators(ctx));
    }
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
        <div class="maki-v118-dora" aria-label="ドラ入力">
          <div class="maki-v118-dora-head">
            <span class="maki-v118-dora-title">ドラ入力</span>
            <button type="button" class="maki-v119-dora-camera">📷 表示牌</button>
            <span class="maki-v118-dora-total">合計 0翻</span>
          </div>
          <div class="maki-v118-dora-grid">
            <div class="maki-v118-dora-counter" data-kind="dora">
              <span class="maki-v118-dora-label">ドラ</span><button type="button" data-dora-step="-1">−</button><strong class="maki-v118-dora-value">0</strong><button type="button" data-dora-step="1">＋</button>
            </div>
            <div class="maki-v118-dora-counter" data-kind="aka">
              <span class="maki-v118-dora-label">赤ドラ</span><button type="button" data-dora-step="-1">−</button><strong class="maki-v118-dora-value">0</strong><button type="button" data-dora-step="1">＋</button>
            </div>
            <div class="maki-v118-dora-counter" data-kind="ura">
              <span class="maki-v118-dora-label">裏ドラ</span><button type="button" data-dora-step="-1">−</button><strong class="maki-v118-dora-value">0</strong><button type="button" data-dora-step="1">＋</button>
            </div>
          </div>
          <div class="maki-v118-dora-note"></div>
          <div class="maki-v119-indicators"></div>
        </div>
      `;
      table.insertAdjacentElement('beforebegin',panel);
      panel.querySelector('.maki-v111-camera').addEventListener('click',openCameraFromScore);
      panel.querySelector('.maki-v111-manual').addEventListener('click',openManualEntry);
      panel.querySelector('.maki-v119-dora-camera').addEventListener('click',openDoraIndicatorCamera);
      panel.querySelectorAll('[data-dora-step]').forEach(button=>{
        button.addEventListener('click',()=>{
          const row=button.closest('.maki-v118-dora-counter');
          adjustDora(row?.dataset.kind,Number(button.dataset.doraStep||0));
        });
      });
    }

    panel.querySelector('.maki-v111-context').textContent=contextText(ctx);
    renderDoraControls();
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

  const TILE_GLYPHS={
    '東':'🀀','南':'🀁','西':'🀂','北':'🀃','中':'🀄','發':'🀅','白':'🀆',
    '1萬':'🀇','2萬':'🀈','3萬':'🀉','4萬':'🀊','5萬':'🀋','6萬':'🀌','7萬':'🀍','8萬':'🀎','9萬':'🀏',
    '1索':'🀐','2索':'🀑','3索':'🀒','4索':'🀓','5索':'🀔','6索':'🀕','7索':'🀖','8索':'🀗','9索':'🀘',
    '1筒':'🀙','2筒':'🀚','3筒':'🀛','4筒':'🀜','5筒':'🀝','6筒':'🀞','7筒':'🀟','8筒':'🀠','9筒':'🀡'
  };

  function tileFaceHTML(tile){
    const glyph=TILE_GLYPHS[tile]||String(tile||'');
    return `<span class="maki-v111-face"><span class="maki-v111-glyph" aria-hidden="true">${glyph}</span></span>`;
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
          <div><h2>手牌を連続入力</h2><div class="maki-v111-help">選ぶと自動で次へ。上の1〜14をタップすると、その位置だけ変更できます。</div></div>
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
      const box=document.createElement('section');box.className='maki-v111-group';box.dataset.group=name;
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
    const canonical=window.m8YakuBreakdownV116;
    let han=null;
    if(canonical&&Array.isArray(canonical.items)){
      han=canonical.yakuman?'yakuman':Number(canonical.han);
    }else{
      han=finiteSuggested(window.m8SuggestedHanV23,window.m8SuggestedHanV22,window.m8SuggestedHanV9,window.m8SuggestedHanV6);
    }
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
      else btn.removeAttribute('aria-label');
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
    if(pending.source==='camera'){
      const meta=window.MAKILastCameraHandMetaV119;
      applyCameraHandMetaV119(now,tiles,meta);
      window.MAKILastCameraHandMetaV119=null;
    }else{
      syncIndicatorDoraCount(now,tiles);
    }
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

  document.getElementById('agari-button')?.addEventListener('click',()=>{
    window.MAKIDoraStatesV118={};
    window.MAKIDoraIndicatorStatesV119={};
    window.MAKILastCameraHandMetaV119=null;
    window.m8BaseYakuBreakdownV118=null;
  });

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

  window.addEventListener('maki:m8-recommendation-changed',()=>{
    requestAnimationFrame(decorateLimitRecommendation);
  });

  window.addEventListener('pageshow',()=>{
    setTimeout(()=>{mountScoreHandEntry();decorateLimitRecommendation();},80);
    setTimeout(decorateM8Context,100);
  },{passive:true});

  window.MAKIV119DoraCamera=Object.freeze({
    indicatorState:indicatorStateFor,
    doraTileFromIndicatorRaw,
    countDoraFromIndicators,
    addIndicatorRaw:addDoraIndicatorRaw,
    clearIndicators:clearDoraIndicators,
    applyCameraHandMeta:applyCameraHandMetaV119,
    recognizeIndicatorCanvas:recognizeDoraIndicatorCanvasV119,
    openIndicatorCamera:openDoraIndicatorCamera
  });

  window.MAKIV118Dora=Object.freeze({
    contextKey:doraContextKey,
    state:doraStateFor,
    effective:effectiveDoraState,
    setCount:setDoraCount,
    adjust:adjustDora,
    applyToRecommendation:applyDoraToRecommendation,
    render:renderDoraControls
  });

  window.MAKIV111=Object.freeze({
    mountScoreHandEntry,
    openManualEntry,
    decorateM8Context,
    decorateLimitRecommendation,
    suggestedLimitKey,
    context,
    renderDoraControls
  });

  mountScoreHandEntry();
  decorateLimitRecommendation();
  decorateM8Context();
})();
