// MAKI v118: manual dora / ura-dora / aka-dora input and scoring integration.
(()=>{
  'use strict';

  const BONUS_NAMES=new Set(['ドラ','裏ドラ','赤ドラ']);
  const MAX_BONUS=20;
  let applying=false;
  let baseRecommendation=null;

  function safeContext(){
    try{
      const c=window.MAKIV111?.context?.();
      if(c)return c;
    }catch(_){}
    try{
      const winner=Array.isArray(agariFlow?.winners)?agariFlow.winners[agariFlow.currentWinnerIndex||0]:null;
      return {
        active:!!agariFlow?.active,
        step:agariFlow?.step||'',
        type:agariFlow?.type||null,
        winner,
        currentWinnerIndex:Number(agariFlow?.currentWinnerIndex||0),
        round:(document.querySelector('.round-info strong')?.textContent||'')+'|'+
          (document.getElementById('honba-display')?.textContent||'')+'|'+
          (document.getElementById('kyotaku-display')?.textContent||'')
      };
    }catch(_){
      return {active:false,step:'',type:null,winner:null,currentWinnerIndex:0,round:''};
    }
  }

  function contextKey(){
    const c=safeContext();
    if(!c.active||c.step!=='score'||!c.winner)return '';
    return [c.round||'',c.winner||'',c.type||'',Number(c.currentWinnerIndex||0)].join('|');
  }

  function ensureState(){
    const key=contextKey();
    let s=window.MAKIDoraStateV118;
    if(!s||s.key!==key){
      s={key,dora:0,ura:0,aka:0,updatedAt:Date.now()};
      window.MAKIDoraStateV118=s;
    }
    for(const k of ['dora','ura','aka']){
      const n=Number(s[k]);
      s[k]=Number.isFinite(n)?Math.max(0,Math.min(MAX_BONUS,Math.trunc(n))):0;
    }
    return s;
  }

  function isBonusItem(item){
    return BONUS_NAMES.has(String(item?.name||''));
  }

  function stripBonus(state){
    if(!state||!Array.isArray(state.items))return null;
    const items=state.items.filter(x=>!isBonusItem(x)).map(x=>({...x}));
    const yakuman=state.yakuman===true||state.han==='yakuman';
    const itemHan=items.reduce((s,x)=>{
      const n=Number(x.han);
      return s+(Number.isFinite(n)?n:0);
    },0);
    let han=itemHan;
    if(!yakuman&&han===0){
      const raw=Number(state.baseHan);
      if(Number.isFinite(raw)&&raw>=0)han=raw;
    }
    return {han:yakuman?'yakuman':han,yakuman,items,updatedAt:Date.now()};
  }

  function bonusItems(state){
    const out=[];
    if(state.dora>0)out.push({name:'ドラ',han:state.dora});
    if(state.ura>0)out.push({name:'裏ドラ',han:state.ura});
    if(state.aka>0)out.push({name:'赤ドラ',han:state.aka});
    return out;
  }

  function setLegacyHan(value){
    window.m8SuggestedHanV23=value;
    window.m8SuggestedHanV22=value==='yakuman'?null:value;
    window.m8SuggestedHanV9=value==='yakuman'?null:value;
    window.m8SuggestedHanV6=value;
  }

  function renderAnalysis(canonical,baseHan,bonusHan){
    const panel=document.getElementById('m8-context-v5');
    if(!panel)return;
    window.M8V22?.renderBreakdown?.(panel,canonical);
    const hanBox=panel.querySelector('.m8v5-han');
    if(!hanBox)return;
    if(canonical.yakuman){
      hanBox.textContent='現在の判定：役満（ドラは加算しません）';
    }else if(canonical.validYaku===false&&bonusHan>0){
      hanBox.textContent='現在の判定：役なし（ドラ'+bonusHan+'翻 / ドラだけではアガリ不可）';
    }else if(bonusHan>0){
      hanBox.textContent='現在判定できる範囲：'+canonical.han+'翻（役'+baseHan+'＋ドラ'+bonusHan+'）';
    }else{
      hanBox.textContent=baseHan>0?'現在判定できる範囲：'+baseHan+'翻':'現在判定できる範囲：0翻';
    }
  }

  function applyDora(base=baseRecommendation){
    if(applying||!base)return null;
    const s=ensureState();
    const clean=stripBonus(base)||base;
    const baseHan=clean.yakuman?0:Number(clean.han||0);
    const bonuses=bonusItems(s);
    const bonusHan=bonuses.reduce((sum,x)=>sum+Number(x.han||0),0);
    const validYaku=clean.yakuman||clean.items.some(x=>Number.isFinite(Number(x.han))&&Number(x.han)>0);

    const canonical=clean.yakuman
      ?{
          han:'yakuman',yakuman:true,
          items:clean.items.map(x=>({...x})),
          validYaku:true,baseHan:'yakuman',bonusHan:0,
          dora:{dora:s.dora,ura:s.ura,aka:s.aka},
          source:'maki-v118-dora',updatedAt:Date.now()
        }
      :{
          han:baseHan+bonusHan,yakuman:false,
          items:[...clean.items.map(x=>({...x})),...bonuses],
          validYaku,baseHan,bonusHan,
          dora:{dora:s.dora,ura:s.ura,aka:s.aka},
          source:'maki-v118-dora',updatedAt:Date.now()
        };

    applying=true;
    try{
      window.m8YakuBreakdownV116=canonical;
      if(canonical.yakuman)setLegacyHan('yakuman');
      else if(validYaku)setLegacyHan(canonical.han||null);
      else setLegacyHan(null);
      renderAnalysis(canonical,baseHan,bonusHan);
      window.dispatchEvent(new CustomEvent('maki:m8-recommendation-changed',{detail:canonical}));
    }finally{
      applying=false;
    }
    renderPanel();
    return canonical;
  }

  function setCount(kind,next){
    if(!['dora','ura','aka'].includes(kind))return;
    const s=ensureState();
    s[kind]=Math.max(0,Math.min(MAX_BONUS,Math.trunc(Number(next)||0)));
    s.updatedAt=Date.now();
    if(!baseRecommendation){
      const current=stripBonus(window.m8YakuBreakdownV116);
      if(current)baseRecommendation=current;
    }
    applyDora(baseRecommendation);
    renderPanel();
  }

  function changeCount(kind,delta){
    const s=ensureState();
    setCount(kind,Number(s[kind]||0)+Number(delta||0));
  }

  const style=document.createElement('style');
  style.textContent=`
    #maki-dora-v118{margin:4px 0 6px;padding:6px 8px;border:1px solid #d4ad48;border-radius:10px;background:#fff7df;color:#3a2b0c;flex:none}
    #maki-dora-v118 .maki-v118-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}
    #maki-dora-v118 .maki-v118-title{font-size:13px;font-weight:900}
    #maki-dora-v118 .maki-v118-note{font-size:9px;font-weight:800;color:#7b6740}
    #maki-dora-v118 .maki-v118-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    #maki-dora-v118 .maki-v118-counter{display:grid;grid-template-columns:auto 30px 1fr 30px;align-items:center;gap:4px;min-height:34px;padding:3px 5px;border-radius:8px;background:#fff;border:1px solid #decf9f}
    #maki-dora-v118 .maki-v118-label{font-size:10px;font-weight:900;white-space:nowrap}
    #maki-dora-v118 .maki-v118-value{font-size:18px;font-weight:900;text-align:center}
    #maki-dora-v118 button{min-height:27px;border:0;border-radius:7px;background:#ece5cf;color:#35280b;font-size:17px;font-weight:900;padding:0}
    #maki-dora-v118 button:disabled{opacity:.35}
    #maki-dora-v118 .maki-v118-status{margin-top:4px;font-size:10px;font-weight:900;text-align:center;color:#6a5117}
    @media (orientation:landscape) and (max-height:500px){
      #maki-dora-v118{margin:2px 0 4px;padding:4px 6px}
      #maki-dora-v118 .maki-v118-head{margin-bottom:3px}
      #maki-dora-v118 .maki-v118-counter{min-height:29px}
      #maki-dora-v118 button{min-height:24px}
      #maki-dora-v118 .maki-v118-status{margin-top:2px;font-size:9px}
    }
  `;
  document.head.appendChild(style);

  function panelMarkup(){
    return `
      <div class="maki-v118-head">
        <span class="maki-v118-title">ドラ入力</span>
        <span class="maki-v118-note">枚数を入力 / 裏ドラはリーチ時のみ</span>
      </div>
      <div class="maki-v118-grid">
        <div class="maki-v118-counter" data-kind="dora">
          <span class="maki-v118-label">ドラ</span>
          <button type="button" data-delta="-1" aria-label="ドラを1枚減らす">−</button>
          <span class="maki-v118-value" data-value="dora">0</span>
          <button type="button" data-delta="1" aria-label="ドラを1枚増やす">＋</button>
        </div>
        <div class="maki-v118-counter" data-kind="ura">
          <span class="maki-v118-label">裏ドラ</span>
          <button type="button" data-delta="-1" aria-label="裏ドラを1枚減らす">−</button>
          <span class="maki-v118-value" data-value="ura">0</span>
          <button type="button" data-delta="1" aria-label="裏ドラを1枚増やす">＋</button>
        </div>
        <div class="maki-v118-counter" data-kind="aka">
          <span class="maki-v118-label">赤ドラ</span>
          <button type="button" data-delta="-1" aria-label="赤ドラを1枚減らす">−</button>
          <span class="maki-v118-value" data-value="aka">0</span>
          <button type="button" data-delta="1" aria-label="赤ドラを1枚増やす">＋</button>
        </div>
      </div>
      <div class="maki-v118-status">ドラなし</div>
    `;
  }

  function mountPanel(){
    const table=document.querySelector('#agari-overlay .score-switch-table');
    const key=contextKey();
    if(!table||!key){
      document.getElementById('maki-dora-v118')?.remove();
      return;
    }
    ensureState();
    let panel=document.getElementById('maki-dora-v118');
    if(!panel){
      panel=document.createElement('section');
      panel.id='maki-dora-v118';
      panel.innerHTML=panelMarkup();
      const hand=document.getElementById('maki-hand-entry-v111');
      if(hand)hand.insertAdjacentElement('afterend',panel);
      else table.insertAdjacentElement('beforebegin',panel);
      panel.addEventListener('click',e=>{
        const b=e.target.closest('button[data-delta]');
        if(!b)return;
        const counter=b.closest('[data-kind]');
        changeCount(counter?.dataset.kind,Number(b.dataset.delta||0));
      });
    }
    renderPanel();
  }

  function renderPanel(){
    const panel=document.getElementById('maki-dora-v118');
    if(!panel)return;
    const s=ensureState();
    for(const kind of ['dora','ura','aka']){
      const value=panel.querySelector('[data-value="'+kind+'"]');
      if(value)value.textContent=String(s[kind]);
      const minus=panel.querySelector('[data-kind="'+kind+'"] button[data-delta="-1"]');
      if(minus)minus.disabled=s[kind]<=0;
    }
    const total=s.dora+s.ura+s.aka;
    const status=panel.querySelector('.maki-v118-status');
    const current=window.m8YakuBreakdownV116;
    if(current?.yakuman){
      status.textContent=total?'入力 '+total+'枚 / 役満時はドラを翻数へ加算しません':'ドラなし / 役満時はドラを翻数へ加算しません';
    }else if(total&&current?.validYaku===false){
      status.textContent='ドラ合計 +'+total+'翻 / ※ドラだけではアガリ役になりません';
    }else{
      status.textContent=total?'ドラ合計 +'+total+'翻（ドラ'+s.dora+'・裏'+s.ura+'・赤'+s.aka+'）':'ドラなし';
    }
  }

  window.addEventListener('maki:m8-recommendation-changed',e=>{
    const detail=e.detail;
    if(applying||detail?.source==='maki-v118-dora')return;
    const clean=stripBonus(detail||window.m8YakuBreakdownV116);
    if(!clean)return;
    baseRecommendation=clean;
    applyDora(clean);
  });

  const observer=new MutationObserver(mutations=>{
    let score=false,result=false;
    for(const m of mutations){
      for(const n of m.addedNodes){
        if(n.nodeType!==1)continue;
        if(n.matches?.('.score-switch-table,#maki-hand-entry-v111')||n.querySelector?.('.score-switch-table,#maki-hand-entry-v111'))score=true;
        if(n.matches?.('#m8-result-v1,#m8-context-v5')||n.querySelector?.('#m8-result-v1,#m8-context-v5'))result=true;
      }
    }
    if(score)requestAnimationFrame(mountPanel);
    if(result&&window.m8YakuBreakdownV116){
      const clean=stripBonus(window.m8YakuBreakdownV116);
      if(clean){baseRecommendation=clean;setTimeout(()=>applyDora(clean),0);}
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#agari-overlay'))setTimeout(mountPanel,0);
  },true);
  window.addEventListener('pageshow',()=>setTimeout(mountPanel,100),{passive:true});

  window.MAKIV118=Object.freeze({
    mountPanel,applyDora,setCount,changeCount,stripBonus,contextKey,
    getState:()=>({...ensureState()})
  });
  mountPanel();
})();
