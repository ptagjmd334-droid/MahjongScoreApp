// M8 v3: 14枚を連続入力できる牌選択UI
(() => {
  const glyphs = window.MAHJONG_TILE_GLYPHS_M7 || {};

  const style = document.createElement('style');
  style.textContent = `
    #tile-picker-m7v5 .m8v3-selection-strip{display:grid;grid-template-columns:repeat(14,1fr);gap:4px;margin:0 0 10px}
    #tile-picker-m7v5 .m8v3-selection-slot{height:42px;border:2px solid #d8d4ca;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:29px;line-height:1;color:#111;overflow:hidden}
    #tile-picker-m7v5 .m8v3-selection-slot.current{border-color:#078cff;box-shadow:0 0 0 2px rgba(7,140,255,.18);background:#eef7ff}
    #tile-picker-m7v5 .m8v3-selection-slot.done{background:#f7f4eb}
    #tile-picker-m7v5 .m8v3-help{text-align:center;font-size:13px;font-weight:700;margin:-4px 0 8px;color:#33443d}
    #tile-picker-m7v5 .tile-picker-grid-m7v5 button.m8v3-picked{outline:3px solid #078cff;outline-offset:-3px;background:#eaf5ff!important}
  `;
  document.head.appendChild(style);

  function getRoot(){ return document.getElementById('hand-result-overlay-m7v5'); }
  function getSlots(){ return [...(getRoot()?.querySelectorAll('.hand-result-tile-m7v5') || [])]; }
  function getCurrentIndex(picker){
    const text = picker?.querySelector('.tile-picker-title-m7v5')?.textContent || '';
    const m = text.match(/(\d+)枚目/);
    return m ? Math.max(0, Number(m[1]) - 1) : 0;
  }
  function refreshMainStatus(){
    const root=getRoot(); if(!root)return;
    const slots=getSlots(); const n=slots.filter(b=>b.dataset.tile).length;
    const status=root.querySelector('.hand-result-status-m7v5');
    if(status) status.textContent=n===14?'14枚確認済み ✓':`${n} / 14枚を確認済み`;
    const ok=root.querySelector('.hand-result-ok-m7v5'); if(ok)ok.disabled=n!==14;
  }
  function decoratePicker(){
    const picker=document.getElementById('tile-picker-m7v5');
    if(!picker || picker.dataset.m8v3==='1') return;
    picker.dataset.m8v3='1';
    const card=picker.querySelector('.tile-picker-card-m7v5');
    const grid=picker.querySelector('.tile-picker-grid-m7v5');
    const title=picker.querySelector('.tile-picker-title-m7v5');
    if(!card||!grid||!title)return;
    const current=getCurrentIndex(picker);
    title.textContent='手牌を連続入力';
    const strip=document.createElement('div'); strip.className='m8v3-selection-strip';
    getSlots().forEach((slot,i)=>{
      const s=document.createElement('div');
      s.className='m8v3-selection-slot'+(slot.dataset.tile?' done':'')+(i===current?' current':'');
      s.textContent=slot.dataset.tile ? (glyphs[slot.dataset.tile] || slot.dataset.tile) : String(i+1);
      strip.appendChild(s);
    });
    const help=document.createElement('div'); help.className='m8v3-help'; help.textContent=`${current+1}枚目を選択中　→ 選ぶと自動で次の牌へ`;
    title.insertAdjacentElement('afterend',strip); strip.insertAdjacentElement('afterend',help);
    grid.querySelectorAll('button').forEach(b=>{
      const name=b.dataset.tileName || b.getAttribute('aria-label') || b.textContent.trim();
      if(name && getSlots()[current]?.dataset.tile===name) b.classList.add('m8v3-picked');
    });
  }

  new MutationObserver(decoratePicker).observe(document.body,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    const tile=e.target.closest?.('#tile-picker-m7v5 .tile-picker-grid-m7v5 button');
    if(!tile)return;
    const picker=document.getElementById('tile-picker-m7v5');
    if(!picker)return;
    e.preventDefault(); e.stopImmediatePropagation();
    const slots=getSlots(); const current=getCurrentIndex(picker);
    const name=tile.dataset.tileName || tile.getAttribute('aria-label') || tile.textContent.trim();
    if(!slots[current] || !name)return;
    slots[current].dataset.tile=name;
    slots[current].dataset.tileGlyph=glyphs[name] || '';
    slots[current].textContent=name;
    slots[current].setAttribute('aria-label',name);
    refreshMainStatus();
    picker.remove();
    const next=current+1;
    if(next<14){ requestAnimationFrame(()=>slots[next]?.click()); }
  },true);
})();