// M8 v5: 対局情報（場風・自風・リーチ・ツモ・門前/副露）を役判定へ接続
(() => {
  let lastTiles = [];

  const style = document.createElement('style');
  style.textContent = `
    #m8-result-v1 .m8-card{max-height:88dvh;overflow:auto}
    #m8-context-v5{margin:10px 0 12px;padding:10px 12px;border-radius:14px;background:#f4f1e9;text-align:left}
    #m8-context-v5 .m8v5-row{display:flex;align-items:center;gap:7px;margin:6px 0;flex-wrap:wrap}
    #m8-context-v5 .m8v5-label{min-width:72px;font-size:13px;font-weight:800;color:#405047}
    #m8-context-v5 .m8v5-chip{border:1px solid #cfc9ba;background:#fff;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:800;color:#15241d}
    #m8-context-v5 .m8v5-chip.active{border-color:#078cff;background:#e8f4ff;box-shadow:0 0 0 2px rgba(7,140,255,.12)}
    #m8-context-v5 .m8v5-auto{font-size:13px;font-weight:800;color:#15241d}
    #m8-context-v5 .m8v5-extra{margin-top:8px;padding:8px 10px;border-radius:10px;background:#e9f5ed;font-size:14px;font-weight:800;text-align:center}
    #m8-context-v5 .m8v5-han{margin-top:7px;font-size:14px;font-weight:900;text-align:center}
  `;
  document.head.appendChild(style);

  function snapshotTiles(){
    const root = document.getElementById('hand-result-overlay-m7v5');
    if(!root) return;
    const tiles = [...root.querySelectorAll('.hand-result-tile-m7v5')]
      .map(b => b.dataset.tile)
      .filter(Boolean);
    if(tiles.length === 14) lastTiles = tiles.slice();
  }

  const handObserver = new MutationObserver(snapshotTiles);
  handObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-tile']});

  function safeRoundWind(){
    try{
      if(typeof gameState !== 'undefined' && gameState.roundWind) return gameState.roundWind;
    }catch(_){ }
    const text=document.querySelector('.round-info strong')?.textContent?.trim()||'';
    return ['東','南','西'].find(w=>text.startsWith(w)) || '東';
  }

  function playerName(pos){
    return document.getElementById(`game-name-${pos}`)?.textContent?.trim() || pos;
  }

  function seatWind(pos){
    return document.getElementById(`wind-${pos}`)?.textContent?.trim() || '';
  }

  function isRiichi(pos){
    try{
      return !!(typeof gameState !== 'undefined' && gameState.riichi && gameState.riichi[pos]);
    }catch(_){ return false; }
  }

  function inferredWinner(){
    try{
      if(typeof agariFlow !== 'undefined' && Array.isArray(agariFlow.winners) && agariFlow.winners.length===1){
        return agariFlow.winners[0];
      }
    }catch(_){ }
    return null;
  }

  function inferredType(){
    try{
      if(typeof agariFlow !== 'undefined' && (agariFlow.type==='ron'||agariFlow.type==='tsumo')) return agariFlow.type;
    }catch(_){ }
    return null;
  }

  function countTile(tile){
    return lastTiles.filter(t=>t===tile).length;
  }

  function contextualYaku(ctx){
    const out=[];
    if(!ctx.winner) return out;
    const sw=seatWind(ctx.winner);
    const rw=safeRoundWind();
    if(rw && countTile(rw)>=3) out.push(`場風 ${rw}`);
    if(sw && countTile(sw)>=3) out.push(`自風 ${sw}`);
    if(ctx.menzen && isRiichi(ctx.winner)) out.push('リーチ');
    if(ctx.menzen && ctx.type==='tsumo') out.push('門前清自摸和');
    return out;
  }

  function hanFor(name,menzen){
    if(name==='タンヤオ') return 1;
    if(name.startsWith('役牌 ')) return 1;
    if(name.startsWith('場風 ')||name.startsWith('自風 ')) return 1;
    if(name==='リーチ'||name==='門前清自摸和') return 1;
    if(name==='対々和'||name==='小三元'||name==='七対子') return 2;
    if(name==='混一色') return menzen?3:2;
    if(name==='清一色') return menzen?6:5;
    if(['国士無双','大三元','字一色'].includes(name)) return 'yakuman';
    return 0;
  }

  function renderContext(card){
    if(card.querySelector('#m8-context-v5')) return;
    const judged = window.judgeMahjongWinM8V4?.(lastTiles);
    if(!judged?.win) return;

    const ctx={
      winner: inferredWinner(),
      type: inferredType(),
      menzen: true
    };

    const panel=document.createElement('div');
    panel.id='m8-context-v5';
    const positions=['bottom','right','top','left'];
    const winnerButtons=positions.map(pos=>`<button type="button" class="m8v5-chip" data-winner="${pos}">${playerName(pos)}（${seatWind(pos)}）</button>`).join('');
    panel.innerHTML=`
      <div class="m8v5-row"><span class="m8v5-label">場風</span><span class="m8v5-auto">${safeRoundWind()}</span></div>
      <div class="m8v5-row"><span class="m8v5-label">和了者</span>${winnerButtons}</div>
      <div class="m8v5-row"><span class="m8v5-label">和了方法</span><button type="button" class="m8v5-chip" data-type="ron">ロン</button><button type="button" class="m8v5-chip" data-type="tsumo">ツモ</button></div>
      <div class="m8v5-row"><span class="m8v5-label">手牌状態</span><button type="button" class="m8v5-chip" data-menzen="1">門前</button><button type="button" class="m8v5-chip" data-menzen="0">副露あり</button></div>
      <div class="m8v5-extra">対局情報から追加できる役：和了者を選択してください</div>
      <div class="m8v5-han"></div>
    `;

    const note=[...card.querySelectorAll('p')].find(p=>p.textContent.includes('M8 v4'));
    if(note) note.before(panel); else card.querySelector('button')?.before(panel);
    if(note) note.innerHTML='<small>※ M8 v5：場風・自風・リーチ・ツモ・門前/副露を接続。翻数は現在判定できる役だけの暫定合計です。</small>';

    function refresh(){
      panel.querySelectorAll('[data-winner]').forEach(b=>b.classList.toggle('active',b.dataset.winner===ctx.winner));
      panel.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===ctx.type));
      panel.querySelectorAll('[data-menzen]').forEach(b=>b.classList.toggle('active',(b.dataset.menzen==='1')===ctx.menzen));

      const extra=contextualYaku(ctx);
      const extraBox=panel.querySelector('.m8v5-extra');
      if(!ctx.winner){
        extraBox.textContent='対局情報から追加できる役：和了者を選択してください';
      }else{
        const info=`${playerName(ctx.winner)}・自風${seatWind(ctx.winner)}${isRiichi(ctx.winner)?'・リーチ中':''}`;
        extraBox.textContent=extra.length?`対局情報から追加：${extra.join(' / ')}（${info}）`:`対局情報から追加役なし（${info}）`;
      }

      const all=[...(judged.yaku||[]),...extra];
      const yakuman=all.some(y=>hanFor(y,ctx.menzen)==='yakuman');
      const han=all.reduce((sum,y)=>{const n=hanFor(y,ctx.menzen);return sum+(typeof n==='number'?n:0);},0);
      panel.querySelector('.m8v5-han').textContent=yakuman?'現在の判定：役満':`現在判定できる範囲：${han}翻`;
    }

    panel.addEventListener('click',e=>{
      const w=e.target.closest('[data-winner]');
      const t=e.target.closest('[data-type]');
      const m=e.target.closest('[data-menzen]');
      if(w) ctx.winner=w.dataset.winner;
      if(t) ctx.type=t.dataset.type;
      if(m) ctx.menzen=m.dataset.menzen==='1';
      refresh();
    });

    refresh();
  }

  const resultObserver=new MutationObserver(()=>{
    const card=document.querySelector('#m8-result-v1 .m8-card');
    if(card) renderContext(card);
  });
  resultObserver.observe(document.body,{childList:true,subtree:true});
})();