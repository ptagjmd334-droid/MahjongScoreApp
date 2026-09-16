// M8 v11: 点数表の見切れ対策 + スクロール + 通常形の複数符候補選択
(() => {
  const overlay=document.getElementById('agari-overlay');
  if(!overlay)return;

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      body>#agari-overlay.m8v11-score{
        position:fixed!important;
        left:var(--m8v11-cx,50vw)!important;
        top:var(--m8v11-cy,50dvh)!important;
        width:min(700px,80vw)!important;
        max-height:none!important;
        overflow:visible!important;
        transform:translate(-50%,-50%) scale(var(--m8v11-scale,.78))!important;
        transform-origin:center center!important;
        zoom:1!important;
        transition:none!important;
      }
      body>#agari-overlay.m8v11-score .agari-flow-card{
        max-height:var(--m8v11-card-max,520px)!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        padding-bottom:8px!important;
      }
      body>#agari-overlay.m8v11-score .agari-flow-top{
        position:sticky!important;
        top:0!important;
        z-index:20!important;
        background:#062f26!important;
        padding-top:2px!important;
      }
      body>#agari-overlay.m8v11-score .agari-flow-actions{
        position:sticky!important;
        bottom:0!important;
        z-index:20!important;
        background:#062f26!important;
        padding-top:4px!important;
        padding-bottom:2px!important;
      }
    }
    .m8v11-fu-choice{margin:3px 0 5px;padding:5px 7px;border-radius:9px;background:#fff4d8;color:#26392f;font-size:11px;font-weight:900;text-align:center}
    .m8v11-fu-choice-row{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-top:4px}
    .m8v11-fu-choice button{min-width:64px;min-height:30px;padding:4px 9px;border:1px solid #c8a546;border-radius:8px;background:white;color:#173129;font-weight:900}
    .m8v11-fu-choice button.active{background:#dff5e8;outline:3px solid #23c878;outline-offset:-2px}
    .m8v11-cell{outline:3px solid #23c878!important;outline-offset:-3px!important;background:rgba(35,200,120,.18)!important}
    .m8v11-auto{display:block;width:100%;margin:3px 0 5px;padding:6px 9px;border:0;border-radius:9px;background:#dff5e8;color:#153d29;font-size:11px;font-weight:900}
  `;
  document.head.appendChild(style);

  function vv(){
    const v=window.visualViewport;
    return {x:v?.offsetLeft||0,y:v?.offsetTop||0,w:v?.width||window.innerWidth,h:v?.height||window.innerHeight};
  }

  function isScore(){return !!overlay.querySelector('.score-switch-table,.score-dual-grid');}

  function fitScore(){
    const score=isScore();
    overlay.classList.toggle('m8v11-score',score);
    if(!score)return;
    const v=vv();
    const scale=.76;
    overlay.style.setProperty('--m8v11-cx',`${v.x+v.w/2}px`);
    overlay.style.setProperty('--m8v11-cy',`${v.y+v.h/2}px`);
    overlay.style.setProperty('--m8v11-scale',String(scale));
    overlay.style.setProperty('--m8v11-card-max',`${Math.max(300,(v.h-10)/scale)}px`);
  }

  // 結果画面を閉じる直前に、通常形で一意に決まらなかった符候補も保持する。
  document.addEventListener('click',e=>{
    const root=e.target.closest?.('#m8-result-v1');
    if(!root)return;
    const confirm=e.target.closest?.('#m8-result-v1 .m8-card>button:last-child');
    if(!confirm)return;
    const detail=root.querySelector('.m8v8-fu-detail')?.textContent||'';
    const vals=[...detail.matchAll(/(\d+)符/g)].map(m=>Number(m[1])).filter(n=>Number.isFinite(n));
    const unique=[...new Set(vals)];
    if(unique.length)window.m8FuCandidatesV11=unique;
    else if(Number.isFinite(Number(window.m8SuggestedFuV8)))window.m8FuCandidatesV11=[Number(window.m8SuggestedFuV8)];
    else window.m8FuCandidatesV11=[];
  },true);

  function getHan(){
    const vals=[window.m8SuggestedHanV9,window.m8SuggestedHanV6];
    return Number(vals.find(v=>Number.isFinite(Number(v)))||0);
  }

  function findCell(fu,han){
    const root=overlay.querySelector('.score-switch-table');if(!root)return null;
    for(const table of root.querySelectorAll('table')){
      const rows=[...table.querySelectorAll('tr')];
      const header=rows.find(tr=>[...tr.children].some(c=>c.textContent.trim()===`${han}翻`));
      if(!header)continue;
      const col=[...header.children].findIndex(c=>c.textContent.trim()===`${han}翻`);
      const row=rows.find(tr=>[...tr.children].some(c=>c.textContent.replace(/\s/g,'').includes(`${fu}符`)));
      if(col>=0&&row?.children[col])return row.children[col];
    }
    return null;
  }

  function applyFuChoice(fu){
    window.m8SuggestedFuV11=fu;
    const han=getHan();
    overlay.querySelectorAll('.m8v11-cell').forEach(x=>x.classList.remove('m8v11-cell'));
    overlay.querySelectorAll('.m8v11-auto').forEach(x=>x.remove());
    overlay.querySelectorAll('.m8v11-fu-choice button').forEach(b=>b.classList.toggle('active',Number(b.dataset.fu)===fu));
    if(!han||han>4)return;
    const cell=findCell(fu,han);if(!cell)return;
    cell.classList.add('m8v11-cell');
    const target=cell.querySelector('.score-cell,button')||cell;
    const root=overlay.querySelector('.score-switch-table');
    const auto=document.createElement('button');auto.type='button';auto.className='m8v11-auto';auto.textContent=`M8推奨 ${fu}符${han}翻を入力`;
    auto.onclick=e=>{e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));};
    root?.insertAdjacentElement('beforebegin',auto);
  }

  function installFuChoice(){
    const root=overlay.querySelector('.score-switch-table');if(!root)return;
    if(root.parentElement?.querySelector('.m8v11-fu-choice'))return;
    const fixed=[window.m8SuggestedFuV8,window.m8SuggestedFuV7].map(Number).find(Number.isFinite);
    const candidates=(window.m8FuCandidatesV11||[]).map(Number).filter(Number.isFinite);
    if(Number.isFinite(fixed)){window.m8SuggestedFuV11=fixed;applyFuChoice(fixed);return;}
    if(candidates.length<=1)return;
    const box=document.createElement('div');box.className='m8v11-fu-choice';box.innerHTML='<div>通常形は符候補が複数あります。該当する符を選択</div><div class="m8v11-fu-choice-row"></div>';
    const row=box.querySelector('.m8v11-fu-choice-row');
    candidates.forEach(fu=>{const b=document.createElement('button');b.type='button';b.dataset.fu=String(fu);b.textContent=`${fu}符`;b.onclick=e=>{e.preventDefault();e.stopPropagation();applyFuChoice(fu);};row.appendChild(b);});
    root.insertAdjacentElement('beforebegin',box);
  }

  let queued=false;
  function refresh(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;fitScore();installFuChoice();if(Number.isFinite(Number(window.m8SuggestedFuV11)))applyFuChoice(Number(window.m8SuggestedFuV11));});
  }
  new MutationObserver(refresh).observe(overlay,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(refresh,0),true);
  ['pageshow','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,refresh,{passive:true}));
  window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  window.visualViewport?.addEventListener('scroll',refresh,{passive:true});
  refresh();
})();