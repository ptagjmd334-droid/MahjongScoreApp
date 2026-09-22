// M8 v7: iPhone横画面のアガリUIを実viewportに収める + 符自動判定の土台
(() => {
  const glyphs=window.MAHJONG_TILE_GLYPHS_M7||{};
  let lastTiles=[];

  const style=document.createElement('style');
  style.textContent=`
    @media (orientation:landscape){
      /* プレイヤー選択中は上下のプレイヤーパネルの間だけを使う */
      #agari-overlay.m8v7-player-pick{
        position:fixed!important;
        left:var(--m8v7-pick-x,50%)!important;
        top:var(--m8v7-pick-y,50%)!important;
        width:min(500px,50vw)!important;
        max-height:none!important;
        overflow:visible!important;
        zoom:1!important;
        transform:translate(-50%,-50%) scale(var(--m8v7-pick-scale,1))!important;
        transform-origin:center center!important;
      }
      #agari-overlay.m8v7-player-pick .agari-flow-card{
        padding:7px 11px!important;
        max-height:none!important;
        overflow:visible!important;
      }
      #agari-overlay.m8v7-player-pick .agari-flow-top{margin-bottom:3px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-top strong{font-size:18px!important}
      #agari-overlay.m8v7-player-pick .flow-cancel-button{padding:5px 8px!important;font-size:12px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-content{gap:4px!important}
      #agari-overlay.m8v7-player-pick .selection-guide{font-size:15px!important;line-height:1.15!important}
      #agari-overlay.m8v7-player-pick .selection-subtext{font-size:10px!important;margin:0!important;line-height:1.1!important}
      #agari-overlay.m8v7-player-pick .selected-winners{min-height:23px!important;gap:4px!important}
      #agari-overlay.m8v7-player-pick .winner-chip{padding:3px 7px!important;font-size:11px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-actions{margin-top:1px!important;gap:5px!important}
      #agari-overlay.m8v7-player-pick .agari-flow-actions button{min-height:28px!important;padding:4px 8px!important;font-size:12px!important}

      /* 点数表は内容全体の実寸から自動縮小する。古い固定zoom/overflowを完全に無効化 */
      #agari-overlay.m8v7-score{
        position:fixed!important;
        left:var(--m8v7-score-x,50%)!important;
        top:var(--m8v7-score-y,50%)!important;
        width:min(720px,82vw)!important;
        max-height:none!important;
        overflow:visible!important;
        zoom:1!important;
        transform:translate(-50%,-50%) scale(var(--m8v7-score-scale,.72))!important;
        transform-origin:center center!important;
      }
      #agari-overlay.m8v7-score .agari-flow-card,
      #agari-overlay.m8v7-score .agari-flow-content,
      #agari-overlay.m8v7-score .score-switch-table{
        max-height:none!important;
        overflow:visible!important;
      }
      #agari-overlay.m8v7-score .agari-flow-card{padding:5px 8px!important}
      #agari-overlay.m8v7-score .agari-flow-top{margin-bottom:4px!important}
      #agari-overlay.m8v7-score .agari-flow-content{gap:5px!important}
      #agari-overlay.m8v7-score .score-switch-table{margin:1px 0!important}
      #agari-overlay.m8v7-score .score-switch-table table{border-spacing:2px!important}
      #agari-overlay.m8v7-score .score-switch-table th{height:16px!important;padding:0!important;font-size:9px!important}
      #agari-overlay.m8v7-score .score-switch-table .score-cell{min-height:24px!important;height:24px!important;padding:1px 3px!important;font-size:10px!important;line-height:1.05!important}
      #agari-overlay.m8v7-score .fu-switch-area{margin:2px 0!important}
      #agari-overlay.m8v7-score .fu-switch-button{min-height:26px!important;padding:3px 7px!important;font-size:10px!important}
      #agari-overlay.m8v7-score .limit-title{margin:2px 0!important;font-size:10px!important}
      #agari-overlay.m8v7-score .limit-grid{gap:3px!important;margin:1px 0!important}
      #agari-overlay.m8v7-score .limit-grid button{min-height:27px!important;padding:3px 6px!important;font-size:10px!important}
      #agari-overlay.m8v7-score .agari-flow-actions{margin-top:3px!important;padding-bottom:2px!important;gap:5px!important}
      #agari-overlay.m8v7-score .agari-flow-actions button{min-height:28px!important;padding:4px 8px!important;font-size:11px!important}
    }

    #m8-fu-start-v7{margin-top:8px;padding:9px 10px;border-radius:12px;background:#fff8df;border:1px solid #e2c66d;text-align:left}
    #m8-fu-start-v7 .m8v7-fu-title{font-size:13px;font-weight:900;margin-bottom:5px}
    #m8-fu-start-v7 .m8v7-win-tiles{display:flex;gap:3px;flex-wrap:wrap}
    #m8-fu-start-v7 .m8v7-win-tile{width:30px;height:38px;border:1px solid #c8b66f;border-radius:6px;background:#fff;font-size:23px;display:flex;align-items:center;justify-content:center;padding:0}
    #m8-fu-start-v7 .m8v7-win-tile.active{outline:3px solid #078cff;background:#eaf5ff}
    #m8-fu-start-v7 .m8v7-fu-note{margin-top:5px;font-size:12px;font-weight:800}
  `;
  document.head.appendChild(style);

  function vv(){
    const v=window.visualViewport;
    return {
      w:v?.width||document.documentElement.clientWidth||window.innerWidth,
      h:v?.height||document.documentElement.clientHeight||window.innerHeight,
      x:v?.offsetLeft||0,
      y:v?.offsetTop||0
    };
  }

  function captureTiles(){
    const root=document.getElementById('hand-result-overlay-m7v5');
    if(!root)return;
    const tiles=[...root.querySelectorAll('.hand-result-tile-m7v5')].map(b=>b.dataset.tile).filter(Boolean);
    if(tiles.length===14) lastTiles=tiles.slice();
  }

  function getAgariStep(){
    try{return typeof agariFlow!=='undefined'?(agariFlow.step||''):'';}catch(_){return '';}
  }

  function fitPlayerPick(){
    const overlay=document.getElementById('agari-overlay');
    if(!overlay||overlay.classList.contains('hidden'))return;
    const step=getAgariStep();
    const isPick=step==='winner'||step==='discarder';
    overlay.classList.toggle('m8v7-player-pick',isPick);
    if(!isPick)return;

    const view=vv();
    const topPanel=document.getElementById('panel-top')?.getBoundingClientRect();
    const bottomPanel=document.getElementById('panel-bottom')?.getBoundingClientRect();
    const gapTop=topPanel?Math.min(view.y+view.h-80,topPanel.bottom+8):view.y+115;
    const gapBottom=bottomPanel?Math.max(gapTop+80,bottomPanel.top-8):view.y+view.h-115;
    const centerY=(gapTop+gapBottom)/2;
    const availableH=Math.max(90,gapBottom-gapTop);

    overlay.style.setProperty('--m8v7-pick-x',`${view.x+view.w/2}px`);
    overlay.style.setProperty('--m8v7-pick-y',`${centerY}px`);
    overlay.style.setProperty('--m8v7-pick-scale','1');

    requestAnimationFrame(()=>{
      const naturalH=Math.max(1,overlay.scrollHeight,overlay.querySelector('.agari-flow-card')?.scrollHeight||0);
      const scale=Math.max(.62,Math.min(1,(availableH-4)/naturalH));
      overlay.style.setProperty('--m8v7-pick-scale',String(scale));
    });
  }

  function fitScore(){
    const overlay=document.getElementById('agari-overlay');
    if(!overlay)return;
    const isScore=!!overlay.querySelector('.score-switch-table,.score-dual-grid');
    overlay.classList.toggle('m8v7-score',isScore);
    if(!isScore)return;

    const view=vv();
    overlay.style.setProperty('--m8v7-score-x',`${view.x+view.w/2}px`);
    overlay.style.setProperty('--m8v7-score-y',`${view.y+view.h/2}px`);
    overlay.style.setProperty('--m8v7-score-scale','1');

    requestAnimationFrame(()=>{
      const card=overlay.querySelector('.agari-flow-card');
      const naturalH=Math.max(1,overlay.scrollHeight,card?.scrollHeight||0);
      const naturalW=Math.max(1,overlay.scrollWidth,card?.scrollWidth||0);
      const scale=Math.max(.5,Math.min(.96,(view.h-10)/naturalH,(view.w-18)/naturalW));
      overlay.style.setProperty('--m8v7-score-scale',String(scale));
      requestAnimationFrame(()=>{
        const r=overlay.getBoundingClientRect();
        let dx=0,dy=0;
        const l=view.x+5,t=view.y+5,rr=view.x+view.w-5,bb=view.y+view.h-5;
        if(r.left<l)dx=l-r.left;else if(r.right>rr)dx=rr-r.right;
        if(r.top<t)dy=t-r.top;else if(r.bottom>bb)dy=bb-r.bottom;
        if(dx)overlay.style.setProperty('--m8v7-score-x',`${view.x+view.w/2+dx}px`);
        if(dy)overlay.style.setProperty('--m8v7-score-y',`${view.y+view.h/2+dy}px`);
      });
    });
  }

  // v32: m8-v19 is the only agari-overlay layout owner.
  // Keep the v7 hand/wait evaluator, but never attach the legacy body-wide
  // layout observer or its scale-based score fitter; those fought the v19
  // scrollable card and could continually resize a restored score table.

  // ---------- 符自動判定の土台：和了牌と待ち形候補 ----------
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));

  function decompositions(tiles){
    const c=Array(34).fill(0);for(const t of tiles){const i=tileIndex.get(t);if(i==null)return[];c[i]++;}
    const out=[];
    function melds(counts,arr){
      if(out.length>80)return;
      const i=counts.findIndex(n=>n>0);
      if(i<0){out.push(arr.slice());return;}
      if(counts[i]>=3){counts[i]-=3;melds(counts,[...arr,{type:'triplet',i}]);counts[i]+=3;}
      if(i<27&&i%9<=6&&counts[i+1]>0&&counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;melds(counts,[...arr,{type:'sequence',i}]);counts[i]++;counts[i+1]++;counts[i+2]++;}
    }
    for(let p=0;p<34;p++)if(c[p]>=2){const x=c.slice();x[p]-=2;const before=out.length;melds(x,[]);for(let k=before;k<out.length;k++)out[k]={pair:p,melds:out[k]};}
    return out.filter(x=>x&&x.melds?.length===4);
  }

  function waitCandidates(tiles,winningTile){
    const wi=tileIndex.get(winningTile);if(wi==null)return[];
    const waits=new Set();
    decompositions(tiles).forEach(d=>{
      if(d.pair===wi)waits.add('単騎');
      d.melds.forEach(m=>{
        if(m.type==='triplet'&&m.i===wi)waits.add('双碰');
        if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){
          const r=m.i%9;
          if(wi===m.i+1)waits.add('嵌張');
          else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))waits.add('辺張');
          else waits.add('両面');
        }
      });
    });
    return [...waits];
  }

  function installFuStart(){
    const card=document.querySelector('#m8-result-v1 .m8-card');
    if(!card||card.querySelector('#m8-fu-start-v7')||lastTiles.length!==14)return;
    const judged=window.judgeMahjongWinM8V4?.(lastTiles);if(!judged?.win)return;
    const box=document.createElement('div');box.id='m8-fu-start-v7';
    if(judged.type==='七対子'){
      window.m8SuggestedFuV7=25;
      box.innerHTML='<div class="m8v7-fu-title">符の自動判定</div><div class="m8v7-fu-note">七対子なので 25符（固定）</div>';
    }else if(judged.type==='国士無双'){
      window.m8SuggestedFuV7=null;
      box.innerHTML='<div class="m8v7-fu-title">符の自動判定</div><div class="m8v7-fu-note">国士無双は役満のため符計算なし</div>';
    }else{
      box.innerHTML='<div class="m8v7-fu-title">符判定の準備：和了牌を選択</div><div class="m8v7-win-tiles"></div><div class="m8v7-fu-note">和了牌を選ぶと待ち形を判定します</div>';
      const row=box.querySelector('.m8v7-win-tiles');
      lastTiles.forEach((t,i)=>{const b=document.createElement('button');b.type='button';b.className='m8v7-win-tile';b.dataset.tile=t;b.dataset.i=String(i);b.textContent=glyphs[t]||t;b.setAttribute('aria-label',t);b.onclick=()=>{
        row.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');window.m8WinningTileV7=t;
        const waits=waitCandidates(lastTiles,t);const note=box.querySelector('.m8v7-fu-note');
        if(!waits.length){note.textContent=`和了牌：${t} / 待ち形を一意に判定できません`;window.m8WaitFuV7=null;}
        else{note.textContent=`和了牌：${t} / 待ち候補：${waits.join('・')}`;window.m8WaitFuV7=waits.every(w=>['単騎','嵌張','辺張'].includes(w))?2:(waits.every(w=>['両面','双碰'].includes(w))?0:null);}
      };row.appendChild(b);});
    }
    const context=card.querySelector('#m8-context-v5');
    if(context)context.insertAdjacentElement('afterend',box);else card.querySelector('button')?.before(box);
  }

  const tileObserver=new MutationObserver(()=>{captureTiles();installFuStart();});
  tileObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tile']});
  captureTiles();
})();