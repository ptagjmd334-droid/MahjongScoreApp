// M8 v22: 面子分解を使った役判定拡張 + 翻数を点数表へ接続
(() => {
  const badge=document.getElementById('app-build-badge');
  if(badge) badge.textContent='M8 v22';

  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const tileIndex=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  const yakumanNames=['国士無双','大三元','字一色','小四喜','大四喜','清老頭','四暗刻','四槓子','緑一色','九蓮宝燈','天和','地和'];
  let queued=false,lastRoot=null;

  const style=document.createElement('style');
  style.textContent=`
    #m8v22-extra-yaku{margin:5px 0 6px;padding:6px 8px;border-radius:9px;background:#eef7f1;color:#173129;font-size:11px;font-weight:900;text-align:center}
    #m8v22-extra-yaku .sub{display:block;margin-top:2px;font-size:9px;font-weight:700;color:#526159}
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
    const r=document.getElementById('m8-context-v5');
    const m=r?.querySelector('[data-menzen].active');
    return{
      winner:r?.querySelector('[data-winner].active')?.dataset.winner||null,
      type:r?.querySelector('[data-type].active')?.dataset.type||null,
      menzen:m?m.dataset.menzen==='1':null
    };
  }
  function seatWind(pos){return pos?document.getElementById(`wind-${pos}`)?.textContent?.trim()||'':'';}
  function roundWind(){return (document.querySelector('.round-info strong')?.textContent||'東').trim().charAt(0)||'東';}
  function isRiichi(pos){try{return !!(typeof gameState!=='undefined'&&gameState.riichi&&gameState.riichi[pos]);}catch(_){return false;}}

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
    const wi=tileIndex.get(win);if(wi==null)return[{wait:null,target:null,mi:-1}];
    const out=[];
    if(d.pair===wi)out.push({wait:'単騎',target:'pair',mi:-1});
    d.melds.forEach((m,mi)=>{
      if(m.type==='triplet'&&m.i===wi)out.push({wait:'双碰',target:'triplet',mi});
      if(m.type==='sequence'&&wi>=m.i&&wi<=m.i+2){const r=m.i%9;let wait='両面';if(wi===m.i+1)wait='嵌張';else if((r===0&&wi===m.i+2)||(r===6&&wi===m.i))wait='辺張';out.push({wait,target:'sequence',mi});}
    });
    return out.length?out:[{wait:null,target:null,mi:-1}];
  }
  function valuePair(i,c){const t=tileOrder[i];return ['白','發','中'].includes(t)||t===seatWind(c.winner)||t===roundWind();}
  function seqKey(i){return `${Math.floor(i/9)}:${i%9}`;}
  function seqStarts(d){return d.melds.filter(m=>m.type==='sequence').map(m=>m.i);}
  function tripStarts(d){return d.melds.filter(m=>m.type==='triplet').map(m=>m.i);}
  function markedMap(){return new Map(Object.entries(window.m8MeldStateV21||{}).map(([t,k])=>[tileIndex.get(t),k]).filter(([i])=>i!=null));}
  function decompCompatible(d,marked){const trips=new Set(tripStarts(d));return [...marked.keys()].every(i=>trips.has(i));}

  function extrasFor(d,opt,c,tiles,marked){
    const names=[];
    const seqs=seqStarts(d),trips=tripStarts(d);
    const seqSet=new Set(seqs.map(seqKey));
    const hasHonor=tiles.some(t=>honors.has(t));
    const allYaochu=tiles.every(t=>honors.has(t)||terminals.has(t));
    const allHonor=tiles.every(t=>honors.has(t));
    const allTerminal=tiles.every(t=>terminals.has(t));

    // 平和：門前・全順子・役牌でない雀頭・両面待ち
    if(c.menzen&&seqs.length===4&&!valuePair(d.pair,c)&&opt.wait==='両面')names.push('平和');

    // One pure, unit-tested implementation shared across all shape candidates.
    const sequenceYaku=window.M8ScoringCoreV32?.sequencePairYaku(seqs,c.menzen)||[];
    names.push(...sequenceYaku);

    // 三色同順
    for(let r=0;r<=6;r++)if([0,1,2].every(s=>seqSet.has(`${s}:${r}`))){names.push('三色同順');break;}

    // 一気通貫
    for(let s=0;s<3;s++)if([0,3,6].every(r=>seqSet.has(`${s}:${r}`))){names.push('一気通貫');break;}

    // 三色同刻
    const tripSet=new Set(trips);
    for(let r=0;r<9;r++)if([r,9+r,18+r].every(i=>tripSet.has(i))){names.push('三色同刻');break;}

    // 三暗刻：ポン/明カンは開き、ロンで完成した刻子も暗刻に数えない。暗カンは暗刻扱い。
    let concealedTrip=0;
    d.melds.forEach((m,mi)=>{
      if(m.type!=='triplet')return;
      const st=marked.get(m.i)||null;
      if(st==='pon'||st==='minkan')return;
      const ronOpened=c.type==='ron'&&opt.target==='triplet'&&opt.mi===mi;
      if(!ronOpened)concealedTrip++;
    });
    if(concealedTrip>=3)names.push('三暗刻');

    // 三槓子
    const kanCount=[...marked.values()].filter(v=>v==='minkan'||v==='ankan').length;
    if(kanCount>=3)names.push('三槓子');

    // 混老頭（字一色/清老頭は役満側を優先）
    if(allYaochu&&!allHonor&&!allTerminal)names.push('混老頭');

    return [...new Set(names)];
  }

  function extraHan(name,menzen){
    if(['平和','一盃口'].includes(name))return 1;
    if(name==='二盃口')return 3;
    if(name==='三色同順'||name==='一気通貫')return menzen?2:1;
    if(['三色同刻','三暗刻','三槓子','混老頭'].includes(name))return 2;
    return 0;
  }
  function baseHanFor(name,menzen){
    if(name==='タンヤオ'||name==='断么九')return 1;
    if(name.startsWith('役牌 ')||name.startsWith('場風 ')||name.startsWith('自風 '))return 1;
    if(name==='リーチ'||name==='門前清自摸和')return 1;
    if(['対々和','小三元','七対子','三暗刻','三槓子','三色同刻','混老頭'].includes(name))return 2;
    if(name==='混一色')return menzen?3:2;
    if(name==='清一色')return menzen?6:5;
    if(name==='平和'||name==='一盃口')return 1;
    if(name==='二盃口')return 3;
    if(name==='三色同順'||name==='一気通貫')return menzen?2:1;
    return 0;
  }

  function existingYaku(tiles,c){
    const j=window.judgeMahjongWinM8V4?.(tiles);const y=[...(j?.yaku||[])];
    if(c.winner){
      const sw=seatWind(c.winner),rw=roundWind(),count=t=>tiles.filter(x=>x===t).length;
      if(rw&&count(rw)>=3)y.push(`場風 ${rw}`);
      if(sw&&count(sw)>=3)y.push(`自風 ${sw}`);
      if(c.menzen&&isRiichi(c.winner))y.push('リーチ');
      if(c.menzen&&c.type==='tsumo')y.push('門前清自摸和');
    }
    return [...new Set(y)];
  }

  function bestExtras(tiles,c){
    const marked=markedMap();let best={names:[],han:0};
    for(const d of decompose(tiles)){
      if(!decompCompatible(d,marked))continue;
      for(const opt of waitOptions(d,getWin())){
        const names=extrasFor(d,opt,c,tiles,marked);const han=names.reduce((s,n)=>s+extraHan(n,c.menzen),0);
        if(han>best.han||(han===best.han&&names.length>best.names.length))best={names,han};
      }
    }
    return best;
  }

  function refresh(){
    queued=false;
    const root=document.getElementById('m8-result-v1'),panel=document.getElementById('m8-context-v5');
    if(!root||!panel)return;
    if(root!==lastRoot){lastRoot=root;}
    const tiles=getTiles();if(tiles.length!==14)return;
    const c=ctx();if(c.menzen==null)return;
    const existing=existingYaku(tiles,c);
    const baseYakuman=existing.some(y=>yakumanNames.some(k=>y.includes(k)));
    const best=bestExtras(tiles,c);
    const extras=best.names.filter(n=>!existing.includes(n));

    let box=document.getElementById('m8v22-extra-yaku');
    if(!box){box=document.createElement('div');box.id='m8v22-extra-yaku';panel.querySelector('.m8v5-extra')?.before(box);}
    box.innerHTML=extras.length?`追加役判定：${extras.join(' / ')}<span class="sub">面子分解のうち翻数が最大になる成立形を採用</span>`:'追加役判定：該当なし';

    if(baseYakuman)return;
    const all=[...existing,...extras];
    const han=all.reduce((s,n)=>s+baseHanFor(n,c.menzen),0);
    const hanBox=panel.querySelector('.m8v5-han');
    if(hanBox&&han>0)hanBox.textContent=`現在判定できる範囲：${han}翻`;
    if(han>0){window.m8SuggestedHanV22=han;window.m8SuggestedHanV9=han;window.m8SuggestedHanV6=han;}
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(refresh);}

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#m8-result-v1,#agari-overlay'))setTimeout(queue,0);
  },true);
  const obs=new MutationObserver(muts=>{
    if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==='m8-result-v1'||n.querySelector?.('#m8-result-v1')))))setTimeout(queue,0);
  });
  obs.observe(document.body,{childList:true,subtree:true});
  queue();
})();
