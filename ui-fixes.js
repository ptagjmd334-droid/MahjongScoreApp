// ========================================
// MahjongScoreApp UI追加・改善用
// ========================================

console.log("ui-fixes.js loaded");
// ========================================
// Supabase クラウド接続 Ver.1
// ========================================

(() => {
  const SUPABASE_URL = "https://gkngipqhsnoskazlhhgp.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_F8-ypaE5GQQIQUSPgTnW3Q_QN6MAhei";
  function showCloudMessageV1(message,isError=false){
    document.getElementById("cloud-status-message-v1")?.remove();
    const element=document.createElement("div"); element.id="cloud-status-message-v1"; element.textContent=message;
    element.style.cssText=`position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:999999;padding:10px 16px;border-radius:999px;background:${isError?"rgba(190,45,45,.95)":"rgba(20,120,75,.95)"};color:white;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;`;
    document.body.appendChild(element); setTimeout(()=>element.remove(),2500);
  }
  async function startSupabaseV1(){
    try{
      const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}); window.mahjongSupabaseV1=client;
      const {data:sessionData,error:sessionError}=await client.auth.getSession(); if(sessionError)throw sessionError; let session=sessionData.session;
      if(!session){const {data,error}=await client.auth.signInAnonymously();if(error)throw error;session=data.session;}
      if(!session||!session.user)throw new Error("匿名ユーザーを取得できませんでした。"); window.mahjongCloudUserIdV1=session.user.id; console.log("Supabase connected:",session.user.id); showCloudMessageV1("クラウド接続OK");
    }catch(error){console.error("Supabase connection error:",error);showCloudMessageV1("クラウド接続エラー",true);}
  }
  function loadSupabaseLibraryV1(){if(window.supabase&&typeof window.supabase.createClient==="function"){startSupabaseV1();return;}const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";script.onload=startSupabaseV1;script.onerror=()=>showCloudMessageV1("Supabase読込エラー",true);document.head.appendChild(script);}
  loadSupabaseLibraryV1();
})();

// ========================================
// M7 v6-v7 牌表示画像化
// ========================================
(() => {
  const glyphs={
    '1萬':'🀇','2萬':'🀈','3萬':'🀉','4萬':'🀊','5萬':'🀋','6萬':'🀌','7萬':'🀍','8萬':'🀎','9萬':'🀏',
    '1筒':'🀙','2筒':'🀚','3筒':'🀛','4筒':'🀜','5筒':'🀝','6筒':'🀞','7筒':'🀟','8筒':'🀠','9筒':'🀡',
    '1索':'🀐','2索':'🀑','3索':'🀒','4索':'🀓','5索':'🀔','6索':'🀕','7索':'🀖','8索':'🀗','9索':'🀘',
    '東':'🀀','南':'🀁','西':'🀂','北':'🀃','白':'🀆','發':'🀅','中':'🀄'
  };
  window.MAHJONG_TILE_GLYPHS_M7=glyphs;
  const style=document.createElement('style');
  style.textContent=`
    #tile-picker-m7v5 .tile-picker-grid-m7v5 button{font-size:0!important;min-height:62px!important;padding:3px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden}
    #tile-picker-m7v5 .tile-picker-grid-m7v5 button::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:46px;line-height:1;color:#111}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]{font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:2px!important}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:44px;line-height:1;color:#111}
  `;document.head.appendChild(style);
  function decorate(root=document){
    root.querySelectorAll('#tile-picker-m7v5 .tile-picker-grid-m7v5 button').forEach(b=>{const name=b.dataset.tileName||b.textContent.trim();if(glyphs[name]){b.dataset.tileName=name;b.dataset.tileGlyph=glyphs[name];b.setAttribute('aria-label',name);}});
    root.querySelectorAll('#hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]').forEach(b=>{const name=b.dataset.tile;if(glyphs[name]){b.dataset.tileGlyph=glyphs[name];b.setAttribute('aria-label',name);}});
  }
  document.addEventListener('click',()=>setTimeout(()=>decorate(),0),true);
  new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true});

  const demo=['1萬','2萬','3萬','4萬','5筒','5筒','6筒','7筒','2索','3索','4索','東','東','中'];
  document.addEventListener('click',e=>{
    const target=e.target.closest?.('.hand-result-head-m7v5');
    const root=document.getElementById('hand-result-overlay-m7v5');
    if(!target||!root) return;
    const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];
    if(buttons.length!==14||buttons.some(b=>b.dataset.tile)) return;
    buttons.forEach((b,i)=>{b.dataset.tile=demo[i];b.dataset.tileGlyph=glyphs[demo[i]];b.textContent=demo[i];b.setAttribute('aria-label',demo[i]);});
    const status=root.querySelector('.hand-result-status-m7v5');if(status)status.textContent='14枚確認済み ✓';
    const ok=root.querySelector('.hand-result-ok-m7v5');if(ok)ok.disabled=false;
  },true);
})();

// ========================================
// M7 v7.2 iPhone表示安定化 + 読み取り直し導線
// ========================================
(() => {
  const style=document.createElement('style');
  style.textContent=`
    @supports(height:100dvh){
      html,body{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}
      #game-screen.screen.active{height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}
      .agari-overlay:not(.hidden){height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}
    }
  `;
  document.head.appendChild(style);

  function normalizeV72(){
    const h=document.documentElement.clientHeight||window.innerHeight;
    const w=document.documentElement.clientWidth||window.innerWidth;
    if(w>h&&w>0&&h>0){
      document.documentElement.style.setProperty('--app-width-v25',`${w}px`);
      document.documentElement.style.setProperty('--app-height-v25',`${h}px`);
    }
    window.scrollTo(0,0);
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  }
  ['pageshow','resize','orientationchange'].forEach(name=>window.addEventListener(name,()=>{
    requestAnimationFrame(normalizeV72);setTimeout(normalizeV72,120);setTimeout(normalizeV72,500);
  },{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){requestAnimationFrame(normalizeV72);setTimeout(normalizeV72,150);}});

  document.addEventListener('click',e=>{
    const back=e.target.closest?.('.hand-result-back-m7v5');
    if(!back) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.getElementById('hand-result-overlay-m7v5')?.remove();
    if(typeof openSimpleGameMenuV1==='function') openSimpleGameMenuV1();
    requestAnimationFrame(()=>{
      const camera=document.getElementById('open-realtime-hand-camera-m7v3');
      if(camera) camera.click();
      else if(typeof closeSimpleGameMenuV1==='function') closeSimpleGameMenuV1();
    });
  },true);
})();

// ========================================
// M8 v1 基本アガリ形判定
// 14枚が「4面子+1雀頭」になるかを判定する。
// 七対子・国士無双・役判定は次工程。
// ========================================
(() => {
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const index=new Map(tileOrder.map((t,i)=>[t,i]));
  function canMeld(counts){
    let i=counts.findIndex(n=>n>0);
    if(i<0) return true;
    if(counts[i]>=3){counts[i]-=3;if(canMeld(counts)){counts[i]+=3;return true;}counts[i]+=3;}
    if(i<27 && i%9<=6 && counts[i+1]>0 && counts[i+2]>0){counts[i]--;counts[i+1]--;counts[i+2]--;if(canMeld(counts)){counts[i]++;counts[i+1]++;counts[i+2]++;return true;}counts[i]++;counts[i+1]++;counts[i+2]++;}
    return false;
  }
  function isStandardWin(tiles){
    if(tiles.length!==14) return false;
    const counts=Array(34).fill(0);
    for(const t of tiles){const i=index.get(t);if(i==null)return false;counts[i]++;if(counts[i]>4)return false;}
    for(let i=0;i<34;i++) if(counts[i]>=2){counts[i]-=2;const ok=canMeld(counts);counts[i]+=2;if(ok)return true;}
    return false;
  }
  window.isStandardMahjongWinM8V1=isStandardWin;

  const style=document.createElement('style');
  style.textContent=`#m8-result-v1{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px}#m8-result-v1 .m8-card{width:min(620px,88vw);background:#f7f3e9;color:#102019;border-radius:22px;padding:24px;text-align:center;box-shadow:0 18px 55px rgba(0,0,0,.35)}#m8-result-v1 h2{font-size:28px;margin:0 0 10px}#m8-result-v1 p{font-size:16px;margin:0 0 18px}#m8-result-v1 button{width:100%;min-height:52px;border:0;border-radius:14px;font-size:18px;font-weight:800;background:#e7e7e7;color:#111}`;
  document.head.appendChild(style);

  function showResult(tiles){
    document.getElementById('m8-result-v1')?.remove();
    const win=isStandardWin(tiles);
    const root=document.createElement('div');root.id='m8-result-v1';
    root.innerHTML=`<div class="m8-card"><h2>${win?'アガリ形です ✓':'まだアガリ形ではありません'}</h2><p>${win?'4面子＋1雀頭として成立しています。':'4面子＋1雀頭の形としては成立していません。'}<br><small>※ M8 v1は基本形のみ判定。七対子・国士・役判定は未対応です。</small></p><button type="button">確認</button></div>`;
    root.querySelector('button').onclick=()=>root.remove();document.body.appendChild(root);
  }

  document.addEventListener('click',e=>{
    const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;
    const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;
    const tiles=[...root.querySelectorAll('.hand-result-tile-m7v5')].map(b=>b.dataset.tile).filter(Boolean);
    if(tiles.length!==14)return;
    e.preventDefault();e.stopImmediatePropagation();
    root.remove();showResult(tiles);
  },true);
})();