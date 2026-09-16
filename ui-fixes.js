// ========================================
// MahjongScoreApp UI追加・改善用
// ========================================

console.log("ui-fixes.js loaded");
// ========================================
// Supabase クラウド接続 Ver.1
// ========================================

(() => {

  const SUPABASE_URL =
    "https://gkngipqhsnoskazlhhgp.supabase.co";

  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_F8-ypaE5GQQIQUSPgTnW3Q_QN6MAhei";


  function showCloudMessageV1(
    message,
    isError = false
  ) {

    const old = document.getElementById("cloud-status-message-v1");
    if (old) old.remove();

    const element = document.createElement("div");
    element.id = "cloud-status-message-v1";
    element.textContent = message;
    element.style.cssText = `position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:999999;padding:10px 16px;border-radius:999px;background:${isError ? "rgba(190,45,45,.95)" : "rgba(20,120,75,.95)"};color:white;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;`;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2500);
  }

  async function startSupabaseV1() {
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      window.mahjongSupabaseV1 = client;
      const {data:sessionData,error:sessionError} = await client.auth.getSession();
      if (sessionError) throw sessionError;
      let session = sessionData.session;
      if (!session) {
        const {data,error} = await client.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      if (!session || !session.user) throw new Error("匿名ユーザーを取得できませんでした。");
      window.mahjongCloudUserIdV1 = session.user.id;
      console.log("Supabase connected:",session.user.id);
      showCloudMessageV1("クラウド接続OK");
    } catch (error) {
      console.error("Supabase connection error:",error);
      showCloudMessageV1("クラウド接続エラー",true);
    }
  }

  function loadSupabaseLibraryV1() {
    if (window.supabase && typeof window.supabase.createClient === "function") { startSupabaseV1(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = startSupabaseV1;
    script.onerror = () => showCloudMessageV1("Supabase読込エラー",true);
    document.head.appendChild(script);
  }
  loadSupabaseLibraryV1();
})();

// ========================================
// M7 v6 牌修正ピッカー画像化
// Unicode麻雀牌を使うため追加画像ファイル不要・オフライン表示可能。
// ========================================
(() => {
  const glyphs = {
    '1萬':'🀇','2萬':'🀈','3萬':'🀉','4萬':'🀊','5萬':'🀋','6萬':'🀌','7萬':'🀍','8萬':'🀎','9萬':'🀏',
    '1筒':'🀙','2筒':'🀚','3筒':'🀛','4筒':'🀜','5筒':'🀝','6筒':'🀞','7筒':'🀟','8筒':'🀠','9筒':'🀡',
    '1索':'🀐','2索':'🀑','3索':'🀒','4索':'🀓','5索':'🀔','6索':'🀕','7索':'🀖','8索':'🀗','9索':'🀘',
    '東':'🀀','南':'🀁','西':'🀂','北':'🀃','白':'🀆','發':'🀅','中':'🀄'
  };

  const style = document.createElement('style');
  style.textContent = `
    #tile-picker-m7v5 .tile-picker-grid-m7v5 button{font-size:0!important;min-height:62px!important;padding:3px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden}
    #tile-picker-m7v5 .tile-picker-grid-m7v5 button::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:46px;line-height:1;color:#111}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]{font-size:0!important}
    #hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:42px;line-height:1;color:#111}
  `;
  document.head.appendChild(style);

  function decorate(root=document){
    root.querySelectorAll('#tile-picker-m7v5 .tile-picker-grid-m7v5 button').forEach(b=>{
      const name=b.textContent.trim();
      if(glyphs[name]){ b.dataset.tileName=name; b.dataset.tileGlyph=glyphs[name]; b.setAttribute('aria-label',name); }
    });
    root.querySelectorAll('#hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]').forEach(b=>{
      const name=b.dataset.tile;
      if(glyphs[name]) b.dataset.tileGlyph=glyphs[name];
    });
  }

  document.addEventListener('click',()=>setTimeout(()=>decorate(),0),true);
  new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true});
})();