// M8 v28: 点数表で判定内容の不足チェックと、実卓テスト報告のワンタップコピー
// 既存のv27「判定に使った情報を確認」の内側だけを拡張。点数計算・対局データは変更しない。
(() => {
  const overlay = document.getElementById('agari-overlay');
  if (!overlay) return;
  const badge = document.getElementById('app-build-badge');
  if (badge) badge.textContent = 'M8 v28';

  const css = document.createElement('style');
  css.textContent = `
    #m8v28-review-tools {margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    #m8v28-review-tools button {min-height:29px;padding:5px 9px;border:0;border-radius:7px;
      background:#176a4a;color:white;font-weight:800;font-size:11px}
    #m8v28-review-status {font-size:11px;font-weight:800;overflow-wrap:anywhere}
    #m8v28-review-status.warn {color:#9c5300}
  `;
  document.head.appendChild(css);

  function validNumber(...values) {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    return null;
  }

  function facts() {
    const hand = window.m8HandStateV19 || window.m8HandStateV18 || {};
    const tiles = (Array.isArray(hand.tiles) && hand.tiles.length === 14)
      ? hand.tiles.slice()
      : (Array.isArray(window.m8LastTilesV8) ? window.m8LastTilesV8.slice() : []);
    const win = hand.win || window.m8WinningTileV7 || null;
    const menzen = hand.menzen === true ? '門前' : hand.menzen === false ? '副露あり' : '未確定';
    const fu = validNumber(window.m8SuggestedFuV21, window.m8SuggestedFuV20,
      window.m8SuggestedFuV18, window.m8SuggestedFuV8);
    const rawHan = [window.m8SuggestedHanV23, window.m8SuggestedHanV22,
      window.m8SuggestedHanV9, window.m8SuggestedHanV6].find(x => x !== null && x !== undefined && x !== '');
    const yakuman = rawHan === 'yakuman';
    const han = yakuman ? null : validNumber(window.m8SuggestedHanV23,
      window.m8SuggestedHanV22, window.m8SuggestedHanV9, window.m8SuggestedHanV6);
    const meld = Object.entries(window.m8MeldStateV21 || {})
      .filter(([,kind]) => kind && kind !== 'none')
      .map(([tile,kind]) => tile + '：' + kind);
    let type = '未取得', winner = '未取得';
    try {
      type = agariFlow.type === 'ron' ? 'ロン' : agariFlow.type === 'tsumo' ? 'ツモ' : '未取得';
      winner = Array.isArray(agariFlow.winners)
        ? (agariFlow.winners[agariFlow.currentWinnerIndex] || agariFlow.winners[0] || '未取得')
        : '未取得';
    } catch (_) {}

    const issues = [];
    if (tiles.length !== 14) issues.push('手牌が14枚ではありません');
    if (!win || !tiles.includes(win)) issues.push('和了牌が未指定または手牌と不一致');
    if (menzen === '未確定') issues.push('門前/副露が未確定');
    if (type === '未取得' || winner === '未取得') issues.push('和了方法または和了者が未取得');
    if (!yakuman && (han === null || han <= 0)) issues.push('翻数が未確定（役なしの可能性）');
    if (!yakuman && fu === null) issues.push('符が未確定');
    return {tiles,win,menzen,fu,han,yakuman,meld,type,winner,issues};
  }

  function report() {
    const f = facts();
    const version = badge?.textContent?.trim() || 'M8 v28';
    return [
      '麻雀対局管理アプリ・実卓テスト報告 (' + version + ')',
      '和了方法：' + f.type + ' / 和了者の位置：' + f.winner,
      '手牌：' + f.tiles.join(' ') + '（' + f.tiles.length + '枚）',
      '和了牌：' + (f.win || '未指定'),
      '手牌状態：' + f.menzen,
      '面子指定：' + (f.meld.join(' / ') || '指定なし'),
      '判定：' + (f.yakuman ? '役満' : (f.fu ?? '未確定') + '符・' + (f.han ?? '未確定') + '翻'),
      '要確認：' + (f.issues.join(' / ') || '入力項目は取得済み'),
      '症状：'
    ].join('\n');
  }

  function mountIfOpen() {
    const review = overlay.querySelector('#m8v27-input-review');
    if (!review || !review.open) return;
    let tools = review.querySelector('#m8v28-review-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.id = 'm8v28-review-tools';
      const status = document.createElement('span');
      status.id = 'm8v28-review-status';
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'm8v28-copy-button';
      button.textContent = '判定情報をコピー';
      button.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        const data = report();
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
          await navigator.clipboard.writeText(data);
          status.textContent = 'コピーしました。必要なら症状を追記して送ってね';
        } catch (_) {
          // iOS PWAでclipboardが使えないときも、テキストを選んでコピーできるようにする。
          let textarea = review.querySelector('#m8v28-fallback-text');
          if (!textarea) {
            textarea = document.createElement('textarea');
            textarea.id = 'm8v28-fallback-text';
            textarea.setAttribute('readonly','');
            textarea.style.cssText = 'display:block;width:100%;min-height:70px;font-size:12px;margin-top:5px';
            tools.insertAdjacentElement('afterend',textarea);
          }
          textarea.value = data;
          textarea.focus();
          textarea.select();
          status.textContent = '下の文章を長押ししてコピーしてください';
        }
      });
      tools.append(status,button);
      review.appendChild(tools);
    }
    const f = facts();
    const status = tools.querySelector('#m8v28-review-status');
    if (status && !/^コピーしました|^下の文章/.test(status.textContent || '')) {
      const msg = f.issues.length ? '要確認：' + f.issues.join('・') : '入力データ取得済み（点数の正確性は別途確認）';
      if (status.textContent !== msg) status.textContent = msg;
      status.classList.toggle('warn',f.issues.length > 0);
    }
  }

  // 常時監視はしない。詳細欄を開いた実際の操作で一度だけ生成する。
  overlay.addEventListener('toggle',e=>{
    if (e.target?.id === 'm8v27-input-review' && e.target.open) mountIfOpen();
  },true);
  overlay.addEventListener('click',e=>{
    if (e.target.closest?.('#m8v27-input-review > summary')) {
      requestAnimationFrame(mountIfOpen);
    }
  },true);
  mountIfOpen();
})();