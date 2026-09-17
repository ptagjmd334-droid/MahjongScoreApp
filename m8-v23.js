// M8 v23: チャンタ/純チャン + 面子形から判定できる役満を追加
(() => {
  const badge=document.getElementById('app-build-badge');
  if(badge) badge.textContent='M8 v23';

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const winds=new Set(['東','南','西','北']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  const green=new Set(['2索','3索','4索','6索','8索','發']);
  let queued=false;

  const style=document.createElement('style');
  style.textContent=`
    #m8v23-extra{margin:5px 0 6px;padding:6px 8px;border-radius:9px;background:#fff5d8;color:#3b3217;font-size:11px;font-weight:900;text-align:center}
    #m8v23-extra.yakuman{background:#ffe8e8;color:#7b1f1f}
    #m8v23-extra .sub{display:block;margin-top:2px;font-size:9px;font-weight:700;opacity:.75}
  `;
  document.head.appendChild(style);

  function getTiles(){
    const saved=window.m8HandStateV19||window.m8HandStateV18;
    if(Array.isArray(saved?.tiles)&&saved.tiles.length===14)return saved.tiles.slice();
    const x=[...document.querySelectorAll('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile')].map(b=>b.dataset.tile).filter(Boolean);
    if(x.length===14)return x;
    return Array.isArray(window.m8LastTilesV8)?window.m8LastTilesV8.slice():[];
  }
  function getWin(){return document.querySelector('#m8-result-v1 #m8-fu-start-v7 .m8v7-win-tile.active')?.dataset.tile||window.m8HandStateV19?.win||window.m8HandStateV18?.win||window.m8WinningTileV7||null;}
  function ctx(){
    const r=document.getElementById('m8-context-v5'),m=r?.querySelector('[data-menzen].active');
    return{winner:r?.querySelector('[data-winner].active')?.dataset.winner||null,type:r?.querySelector('[data-type].active')?.dataset.type||null,menzen:m?m.dataset.menzen==='1':null};
  }
  function markedMap(){return new Map(Object.entries(window.m8MeldStateV21||{}).map(([t,k])=>[tileIndex.get(t),k]).filter(([i])=>i!=null));}

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
    const wi=tileIndex.get(win);if(wi==null)return[{target:null,mi:-1}];
    const out=[];if(d.pair===wi)out.push({target:'pair',mi:-1});
    d.melds.forEach((m,mi)=>{if(m.type==='triplet'&&m.i===wi)out.push({target:'triplet',mi});if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2)out.push({target:'sequence',mi});});
    return out.length?out:[{target:null,mi:-1}];
  }
  function decompCompatible(d,marked){const trips=new Set(d.melds.filter(m=>m.type==='triplet').map(m=>m.i));return [...marked.keys()].every(i=>trips.has(i));}
  function isTerminalIndex(i){return terminals.has(tileOrder[i]);}
  function isHonorIndex(i){return honors.has(tileOrder[i]);}
  function meldHasYaochu(m){
    if(m.type==='triplet')return isTerminalIndex(m.i)||isHonorIndex(m.i);
    const r=m.i%9;return r===0||r===6; // 123 / 789
  }
  function meldHasTerminalNoHonor(m){
    if(m.type==='triplet')return isTerminalIndex(m.i);
    const r=m.i%9;return r===0||r===6;
  }

  function normalExtras(d,c){
    const hasSeq=d.melds.some(m=>m.type==='sequence');
    if(!hasSeq)return[];
    const pairYaochu=isTerminalIndex(d.pair)||isHonorIndex(d.pair);
    const allYaochu=pairYaochu&&d.melds.every(meldHasYaochu);
    if(!allYaochu)return[];
    const pairTerminal=isTerminalIndex(d.pair);
    const noHonors=pairTerminal&&d.melds.every(m=>meldHasTerminalNoHonor(m));
    return noHonors?['純全帯么九']:['混全帯么九'];
  }
  function normalHan(name,menzen){if(name==='混全帯么九')return menzen?2:1;if(name==='純全帯么九')return menzen?3:2;return 0;}

  function independentYakuman(tiles,c){
    const out=[];
    if(tiles.every(t=>terminals.has(t)))out.push('清老頭');
    if(tiles.every(t=>green.has(t)))out.push('緑一色');
    if(c.menzen){
      const suits=new Set(tiles.filter(t=>!honors.has(t)).map(t=>t.slice(-1)));
      if(!tiles.some(t=>honors.has(t))&&suits.size===1){
        const suit=[...suits][0];const counts=Array(10).fill(0);
        tiles.forEach(t=>{if(t.endsWith(suit))counts[Number(t[0])]++;});
        const min=[0,3,1,1,1,1,1,1,1,3];
        if(counts.slice(1).reduce((a,b)=>a+b,0)===14&&min.slice(1).every((n,i)=>counts[i+1]>=n))out.push('九蓮宝燈');
      }
    }
    return out;
  }

  function decompYakuman(d,opt,c,marked){
    const out=[];
    const tripTiles=d.melds.filter(m=>m.type==='triplet').map(m=>tileOrder[m.i]);
    const windTrips=tripTiles.filter(t=>winds.has(t)).length;
    const pairTile=tileOrder[d.pair];
    if(windTrips===4)out.push('大四喜');
    else if(windTrips===3&&winds.has(pairTile))out.push('小四喜');

    const kanCount=[...marked.values()].filter(v=>v==='minkan'||v==='ankan').length;
    if(kanCount>=4)out.push('四槓子');

    let concealed=0;
    d.melds.forEach((m,mi)=>{
      if(m.type!=='triplet')return;
      const st=marked.get(m.i)||null;
      if(st==='pon'||st==='minkan')return;
      const ronOpened=c.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
      if(!ronOpened)concealed++;
    });
    if(concealed===4&&(c.type==='tsumo'||(c.type==='ron'&&opt.target!=='triplet')))out.push('四暗刻');
    return out;
  }

  function best(tiles,c){
    const marked=markedMap();let bestNormal={names:[],han:0},yakuman=new Set(independentYakuman(tiles,c));
    for(const d of decompose(tiles)){
      if(!decompCompatible(d,marked))continue;
      const normal=normalExtras(d,c);const han=normal.reduce((s,n)=>s+normalHan(n,c.menzen),0);
      if(han>bestNormal.han)bestNormal={names:normal,han};
      for(const opt of waitOptions(d,getWin()))decompYakuman(d,opt,c,marked).forEach(y=>yakuman.add(y));
    }
    return{normal:bestNormal,yakuman:[...yakuman]};
  }

  function readCurrentHan(panel){const t=panel.querySelector('.m8v5-han')?.textContent||'';const m=t.match(/(\d+)翻/);return m?Number(m[1]):0;}
  function baseHas(root,name){
    const base=root.querySelector('.m8-yaku-v4')?.textContent||'';
    const v22=document.getElementById('m8v22-extra-yaku')?.textContent||'';
    return base.includes(name)||v22.includes(name);
  }

  function refresh(){
    queued=false;const root=document.getElementById('m8-result-v1'),panel=document.getElementById('m8-context-v5');if(!root||!panel)return;
    const tiles=getTiles();if(tiles.length!==14)return;const c=ctx();if(c.menzen==null)return;
    const r=best(tiles,c);
    const normal=r.normal.names.filter(n=>!baseHas(root,n));
    const yakuman=r.yakuman.filter(n=>!baseHas(root,n));
    let box=document.getElementById('m8v23-extra');if(!box){box=document.createElement('div');box.id='m8v23-extra';document.getElementById('m8v22-extra-yaku')?.insertAdjacentElement('afterend',box);if(!box.isConnected)panel.querySelector('.m8v5-extra')?.before(box);}

    if(yakuman.length){
      box.className='yakuman';box.innerHTML=`追加役満判定：${yakuman.join(' / ')}<span class="sub">手牌形・和了方法・槓子内訳から判定</span>`;
      const hb=panel.querySelector('.m8v5-han');if(hb)hb.textContent='現在の判定：役満';
      window.m8SuggestedHanV23='yakuman';window.m8SuggestedHanV22=null;window.m8SuggestedHanV9=null;window.m8SuggestedHanV6='yakuman';
      return;
    }

    box.className='';box.innerHTML=normal.length?`追加役判定：${normal.join(' / ')}<span class="sub">チャンタ系は全ての面子・雀頭に么九牌が含まれるかで判定</span>`:'追加役判定：該当なし';
    if(normal.length){
      const cur=readCurrentHan(panel),add=normal.reduce((s,n)=>s+normalHan(n,c.menzen),0),total=cur+add;
      const hb=panel.querySelector('.m8v5-han');if(hb&&total>0)hb.textContent=`現在判定できる範囲：${total}翻`;
      window.m8SuggestedHanV23=total;window.m8SuggestedHanV22=total;window.m8SuggestedHanV9=total;window.m8SuggestedHanV6=total;
    }
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(refresh);}
  document.addEventListener('click',e=>{if(e.target.closest?.('#m8-result-v1,#agari-overlay'))setTimeout(queue,0);},true);
  new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.nodeType===1&&(n.id==='m8-result-v1'||n.querySelector?.('#m8-result-v1')))))setTimeout(queue,0);}).observe(document.body,{childList:true,subtree:true});
  queue();
})();
