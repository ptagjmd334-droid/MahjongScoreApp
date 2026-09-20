// M8 v29: 実卓の採点結果とM8推奨値を比較する検証メモ。
// v27/v28の判定情報パネル内だけに追加。対局点数・符/翻の計算処理には触れない。
(() => {
  const overlay = document.getElementById('agari-overlay');
  if (!overlay) return;
  const badge = document.getElementById('app-build-badge');
  if (badge) badge.textContent = 'M8 v29';

  const style = document.createElement('style');
  style.textContent = `
    #m8v29-check {margin:7px 0 0;padding:7px;border:1px solid #9ac9b0;
      border-radius:8px;background:#f6fff9;color:#183e2c;font-size:11px}
    #m8v29-check .m8v29-title {font-weight:900;margin-bottom:4px}
    #m8v29-check .m8v29-row {display:flex;flex-wrap:wrap;align-items:center;gap:6px}
    #m8v29-check label {display:inline-flex;align-items:center;gap:3px;font-weight:800}
    #m8v29-check input {width:66px;max-width:100%;min-width:0;height:30px;border:1px solid #b3ccc0;
      border-radius:6px;padding:3px 5px;font-size:13px;color:#183e2c;background:white}
    #m8v29-check textarea {display:block;width:100%;min-height:34px;max-height:65px;
      border:1px solid #b3ccc0;border-radius:6px;padding:4px 6px;
      margin:6px 0;font-size:12px;resize:vertical;background:white;color:#183e2c}
    #m8v29-check button {min-height:30px;border:0;border-radius:7px;padding:4px 9px;
      background:#176a4a;color:white;font-size:11px;font-weight:900}
    #m8v29-result {font-weight:800;overflow-wrap:anywhere;margin-top:5px}
    #m8v29-export {display:none;width:100%;min-height:65px;max-height:90px}
  `;
  document.head.appendChild(style);

  function finite(...values) {
    for (const x of values) {
      if (x !== null && x !== undefined && x !== '' && Number.isFinite(Number(x))) return Number(x);
    }
    return null;
  }
  function measured() {
    const hanValue=[window.m8SuggestedHanV23,window.m8SuggestedHanV22,
      window.m8SuggestedHanV9,window.m8SuggestedHanV6].find(v=>v!==null&&v!==undefined&&v!=='');
    return {
      fu:finite(window.m8SuggestedFuV21,window.m8SuggestedFuV20,window.m8SuggestedFuV18,window.m8SuggestedFuV8),
      han:hanValue==='yakuman'?'役満':finite(hanValue),
      tiles:(window.m8HandStateV19?.tiles||window.m8HandStateV18?.tiles||window.m8LastTilesV8||[]).slice(),
      win:window.m8HandStateV19?.win||window.m8HandStateV18?.win||window.m8WinningTileV7||null
    };
  }
  function mount() {
    const panel=overlay.querySelector('#m8v27-input-review');
    if (!panel || !panel.open) return;
    if (panel.querySelector('#m8v29-check')) return;
    const box=document.createElement('section');
    box.id='m8v29-check';
    const title=document.createElement('div');title.className='m8v29-title';
    title.textContent='実卓の採点と比較（任意）';
    const row=document.createElement('div');row.className='m8v29-row';
    const fuLabel=document.createElement('label');
    fuLabel.textContent='実際の符';
    const fu=document.createElement('input');fu.type='number';fu.min='20';fu.max='110';fu.step='1';
    fu.placeholder='例 40';fu.id='m8v29-actual-fu';fu.inputMode='numeric';fuLabel.append(fu);
    const hanLabel=document.createElement('label');hanLabel.textContent='実際の翻';
    const han=document.createElement('input');han.type='number';han.min='1';han.max='13';han.step='1';
    han.placeholder='例 2';han.id='m8v29-actual-han';han.inputMode='numeric';hanLabel.append(han);
    row.append(fuLabel,hanLabel);
    const memo=document.createElement('textarea');memo.id='m8v29-memo';
    memo.placeholder='違い・実際の牌姿・気づいたこと（任意）';
    const check=document.createElement('button');check.type='button';
    check.textContent='結果を比較してコピー';check.id='m8v29-check-copy';
    const result=document.createElement('div');result.id='m8v29-result';
    result.setAttribute('aria-live','polite');
    const exportArea=document.createElement('textarea');exportArea.id='m8v29-export';
    exportArea.readOnly=true;
    box.append(title,row,memo,check,result,exportArea);
    panel.appendChild(box);

    check.addEventListener('click', async e=>{
      e.stopPropagation();
      const known=measured(),expectedFu=fu.value.trim(),expectedHan=han.value.trim();
      if(!expectedFu&&!expectedHan){
        result.textContent='実際の符か翻を入力してください（両方でも可）';
        return;
      }
      const issues=[];
      const valid=(input,min,max)=>input===''?null:(Number.isInteger(Number(input))&&Number(input)>=min&&Number(input)<=max?Number(input):NaN);
      const vf=valid(expectedFu,20,110),vh=valid(expectedHan,1,13);
      if(Number.isNaN(vf)||Number.isNaN(vh)){
        result.textContent='符は20～110、翻は1～13の整数で入力してください';
        return;
      }
      if(vf!==null){
        issues.push(known.fu===null?'符：アプリ側が未確定':known.fu===vf?'符：一致':`符：差あり（アプリ ${known.fu}符 / 実卓 ${vf}符）`);
      }
      if(vh!==null){
        issues.push(known.han===null?'翻：アプリ側が未確定':known.han===vh?'翻：一致':`翻：差あり（アプリ ${known.han}翻 / 実卓 ${vh}翻）`);
      }
      result.textContent=issues.join(' / ');
      const report=[
        '麻雀対局管理アプリ M8 v29 実卓照合メモ',
        '手牌：'+known.tiles.join(' ')+'（'+known.tiles.length+'枚）',
        '和了牌：'+(known.win||'未指定'),
        'アプリ判定：'+(known.fu??'未確定')+'符 / '+(known.han??'未確定')+'翻',
        '実卓の採点：'+(vf??'未入力')+'符 / '+(vh??'未入力')+'翻',
        '比較：'+issues.join(' / '),
        'メモ：'+(memo.value.trim()||'なし')
      ].join('\n');
      try {
        if(!navigator.clipboard?.writeText)throw new Error('no clipboard');
        await navigator.clipboard.writeText(report);
        result.textContent=issues.join(' / ')+' — コピーしました';
        exportArea.style.display='none';
      } catch (_) {
        exportArea.value=report;
        exportArea.style.display='block';
        exportArea.focus();exportArea.select();
        result.textContent=issues.join(' / ')+' — 下の文章をコピーしてください';
      }
    });
  }
  // 既存の判定情報パネルを開いた操作時だけ作成。MutationObserverや周期処理は使わない。
  overlay.addEventListener('toggle',e=>{
    if(e.target?.id==='m8v27-input-review'&&e.target.open)mount();
  },true);
  overlay.addEventListener('click',e=>{
    if(e.target.closest?.('#m8v27-input-review > summary'))requestAnimationFrame(mount);
  },true);
  mount();
})();