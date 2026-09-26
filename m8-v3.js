// M8 v3.1: 14枚連続入力 + 選択状況表示 + 基本役候補
(() => {
  const glyphs = window.MAHJONG_TILE_GLYPHS_M7 || {};
  const style=document.createElement('style');
  style.textContent=`
    #tile-picker-m7v5 .m8v31-selection-strip{display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:4px;margin:0 0 7px;flex:none}
    #tile-picker-m7v5 .m8v31-slot{height:38px;min-width:0;border:2px solid #d8d4ca;border-radius:7px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;overflow:hidden;padding:0}
    #tile-picker-m7v5 .m8v31-slot.current{border-color:#078cff;background:#eaf5ff;box-shadow:0 0 0 2px rgba(7,140,255,.18)}
    #tile-picker-m7v5 .m8v31-help{text-align:center;font-size:13px;font-weight:800;margin:-2px 0 6px;color:#33443d;flex:none}
    #m8-yaku-hint-v31{margin-top:12px;padding:10px;border-radius:12px;background:#eef7f1;font-size:14px;font-weight:700}
    @media (orientation:landscape) and (max-height:500px){
      #tile-picker-m7v5{
        padding:max(4px,env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important;
        align-items:center!important;overflow:hidden!important
      }
      #tile-picker-m7v5 .tile-picker-card-m7v5{
        width:min(930px,calc(100vw - max(12px,env(safe-area-inset-left)) - max(12px,env(safe-area-inset-right))))!important;
        height:calc(100dvh - max(8px,env(safe-area-inset-top)) - max(8px,env(safe-area-inset-bottom)))!important;
        max-height:none!important;min-height:0!important;gap:3px!important;padding:5px 7px!important;
        border-radius:12px!important;overflow:hidden!important
      }
      #tile-picker-m7v5 .tile-picker-title-m7v5{font-size:13px!important;line-height:1!important;flex:none}
      #tile-picker-m7v5 .m8v31-selection-strip{gap:3px;margin:0!important}
      #tile-picker-m7v5 .m8v31-slot{height:28px!important;border-width:2px;font-size:18px!important;border-radius:6px!important}
      #tile-picker-m7v5 .m8v31-help{font-size:10px!important;line-height:1.05!important;margin:0!important}
      #tile-picker-m7v5 .m7v57-photo-preview{
        min-height:36px!important;height:36px!important;margin:0!important;padding:2px 5px!important;gap:6px!important;
        border-radius:7px!important;flex:none!important
      }
      #tile-picker-m7v5 .m7v57-photo-preview img{width:30px!important;height:32px!important;border-radius:5px!important}
      #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy{font-size:10px!important;line-height:1.05!important}
      #tile-picker-m7v5 .m7v57-photo-preview .m7v57-copy small{font-size:8px!important;margin-top:0!important}
      #tile-picker-m7v5 .m7v39-suggestions{
        min-height:32px!important;margin:0!important;padding:2px 4px!important;border-radius:7px!important;
        display:flex!important;align-items:center!important;gap:4px!important;flex:none!important
      }
      #tile-picker-m7v5 .m7v39-suggestions b{display:inline!important;margin:0 4px 0 0!important;font-size:9px!important;white-space:nowrap}
      #tile-picker-m7v5 .m7v39-suggestions button{min-height:26px!important;height:26px!important;margin:0!important;padding:2px 7px!important;font-size:11px!important}
      #tile-picker-m7v5 .tile-picker-grid-m7v5{
        flex:1 1 auto!important;min-height:0!important;overflow:hidden!important;
        display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;
        grid-template-rows:repeat(3,minmax(0,1fr))!important;gap:3px!important
      }
      #tile-picker-m7v5 .tile-picker-grid-m7v5 button{
        min-width:0!important;min-height:0!important;height:auto!important;padding:1px!important;
        border-radius:5px!important;font-size:10px!important;line-height:1!important
      }
      #tile-picker-m7v5 .tile-picker-cancel-m7v5{
        min-height:28px!important;height:28px!important;padding:2px 8px!important;font-size:12px!important;line-height:1!important;flex:none!important
      }
    }
  `;
  document.head.appendChild(style);
  let current=0;
  function root(){return document.getElementById('hand-result-overlay-m7v5');}
  function slots(){return [...(root()?.querySelectorAll('.hand-result-tile-m7v5')||[])];}
  function refresh(){const r=root();if(!r)return;const s=slots(),n=s.filter(b=>b.dataset.tile).length;const st=r.querySelector('.hand-result-status-m7v5');if(st)st.textContent=n===14?'14枚確認済み ✓':`${n} / 14枚を確認済み`;const ok=r.querySelector('.hand-result-ok-m7v5');if(ok)ok.disabled=n!==14;}
  function redrawPicker(){const p=document.getElementById('tile-picker-m7v5');if(!p)return;const card=p.querySelector('.tile-picker-card-m7v5'),title=p.querySelector('.tile-picker-title-m7v5');if(!card||!title)return;p.querySelector('.m8v31-selection-strip')?.remove();p.querySelector('.m8v31-help')?.remove();title.textContent='手牌を連続入力';p.dataset.m8v31Current=String(current);const strip=document.createElement('div');strip.className='m8v31-selection-strip';slots().forEach((b,i)=>{const x=document.createElement('button');x.type='button';x.className='m8v31-slot'+(i===current?' current':'');x.textContent=b.dataset.tile?(glyphs[b.dataset.tile]||b.dataset.tile):String(i+1);x.onclick=e=>{e.preventDefault();e.stopPropagation();current=i;redrawPicker();};strip.appendChild(x);});const help=document.createElement('div');help.className='m8v31-help';help.textContent=`${current+1}枚目を選択中　選ぶと自動で次へ`;title.insertAdjacentElement('afterend',strip);strip.insertAdjacentElement('afterend',help);p.dispatchEvent(new CustomEvent('m8v31-current-change',{bubbles:true,detail:{index:current}}));}
  // 元のpickerは選択後に閉じるため、捕捉フェーズで選択を奪い、同じpickerを開いたまま更新する。
  document.addEventListener('click',e=>{const tile=e.target.closest?.('#tile-picker-m7v5 .tile-picker-grid-m7v5 button');if(!tile)return;const p=document.getElementById('tile-picker-m7v5');const s=slots();if(!p||!s[current])return;e.preventDefault();e.stopImmediatePropagation();const name=tile.dataset.tileName||tile.getAttribute('aria-label')||tile.textContent.trim();if(!name)return;s[current].dataset.tile=name;s[current].dataset.tileGlyph=glyphs[name]||'';s[current].textContent=name;s[current].setAttribute('aria-label',name);refresh();if(current<13)current++;redrawPicker();},true);
  // pickerが開いた瞬間だけ開始位置を取得する。以後titleを書き換えてもcurrentをリセットしない。
  new MutationObserver(()=>{const p=document.getElementById('tile-picker-m7v5');if(!p||p.dataset.m8v31==='1')return;p.dataset.m8v31='1';const t=p.querySelector('.tile-picker-title-m7v5')?.textContent||'';const m=t.match(/(\d+)枚目/);current=m?Math.max(0,Math.min(13,Number(m[1])-1)):0;redrawPicker();}).observe(document.body,{childList:true,subtree:true});

  function basicYaku(tiles){const out=[];const honors=new Set(['東','南','西','北','白','發','中']);const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);if(tiles.length!==14)return out;if(tiles.every(t=>!honors.has(t)&&!terminals.has(t)))out.push('タンヤオ候補');const c={};tiles.forEach(t=>c[t]=(c[t]||0)+1);['白','發','中'].forEach(t=>{if((c[t]||0)>=3)out.push(`${t}の役牌候補`);});return out;}
  document.addEventListener('click',e=>{const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;const r=root();if(!r)return;const ts=slots().map(b=>b.dataset.tile).filter(Boolean);if(ts.length!==14)return;const y=basicYaku(ts);window.lastBasicYakuHintsM8V31=y;setTimeout(()=>{const result=document.querySelector('#m8-result-v1 .m8-card');if(result&&!result.querySelector('#m8-yaku-hint-v31')){const d=document.createElement('div');d.id='m8-yaku-hint-v31';d.textContent=y.length?`基本役候補：${y.join(' / ')}`:'基本役候補：現時点では検出なし';result.insertBefore(d,result.querySelector('button'));}},0);},true);
})();