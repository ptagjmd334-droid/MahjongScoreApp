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
  function showCloudMessageV1(message,isError=false){document.getElementById("cloud-status-message-v1")?.remove();const element=document.createElement("div");element.id="cloud-status-message-v1";element.textContent=message;element.style.cssText=`position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:999999;padding:10px 16px;border-radius:999px;background:${isError?"rgba(190,45,45,.95)":"rgba(20,120,75,.95)"};color:white;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none;`;document.body.appendChild(element);setTimeout(()=>element.remove(),2500);}
  async function startSupabaseV1(){try{const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});window.mahjongSupabaseV1=client;const {data:sessionData,error:sessionError}=await client.auth.getSession();if(sessionError)throw sessionError;let session=sessionData.session;if(!session){const {data,error}=await client.auth.signInAnonymously();if(error)throw error;session=data.session;}if(!session||!session.user)throw new Error("匿名ユーザーを取得できませんでした。");window.mahjongCloudUserIdV1=session.user.id;console.log("Supabase connected:",session.user.id);showCloudMessageV1("クラウド接続OK");}catch(error){console.error("Supabase connection error:",error);showCloudMessageV1("クラウド接続エラー",true);}}
  function loadSupabaseLibraryV1(){if(window.supabase&&typeof window.supabase.createClient==="function"){startSupabaseV1();return;}const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";script.onload=startSupabaseV1;script.onerror=()=>showCloudMessageV1("Supabase読込エラー",true);document.head.appendChild(script);}loadSupabaseLibraryV1();
})();

// M7 牌表示画像化
(() => {
  const glyphs={'1萬':'🀇','2萬':'🀈','3萬':'🀉','4萬':'🀊','5萬':'🀋','6萬':'🀌','7萬':'🀍','8萬':'🀎','9萬':'🀏','1筒':'🀙','2筒':'🀚','3筒':'🀛','4筒':'🀜','5筒':'🀝','6筒':'🀞','7筒':'🀟','8筒':'🀠','9筒':'🀡','1索':'🀐','2索':'🀑','3索':'🀒','4索':'🀓','5索':'🀔','6索':'🀕','7索':'🀖','8索':'🀗','9索':'🀘','東':'🀀','南':'🀁','西':'🀂','北':'🀃','白':'🀆','發':'🀅','中':'🀄'};window.MAHJONG_TILE_GLYPHS_M7=glyphs;
  const style=document.createElement('style');style.textContent=`#tile-picker-m7v5 .tile-picker-grid-m7v5 button{font-size:0!important;min-height:62px!important;padding:3px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden}#tile-picker-m7v5 .tile-picker-grid-m7v5 button::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:46px;line-height:1;color:#111}#hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]{font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:2px!important}#hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]::before{content:attr(data-tile-glyph);font-family:"Apple Symbols","Noto Sans Symbols 2",sans-serif;font-size:44px;line-height:1;color:#111}`;document.head.appendChild(style);
  function decorate(root=document){root.querySelectorAll('#tile-picker-m7v5 .tile-picker-grid-m7v5 button').forEach(b=>{const name=b.dataset.tileName||b.textContent.trim();if(glyphs[name]){b.dataset.tileName=name;b.dataset.tileGlyph=glyphs[name];b.setAttribute('aria-label',name);}});root.querySelectorAll('#hand-result-overlay-m7v5 .hand-result-tile-m7v5[data-tile]').forEach(b=>{const name=b.dataset.tile;if(glyphs[name]){b.dataset.tileGlyph=glyphs[name];b.setAttribute('aria-label',name);}});}
  document.addEventListener('click',()=>setTimeout(()=>decorate(),0),true);new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true});
  const demo=['1萬','2萬','3萬','4萬','5筒','5筒','6筒','7筒','2索','3索','4索','東','東','中'];
  document.addEventListener('click',e=>{if(window.M7V33CameraOwner)return;const target=e.target.closest?.('.hand-result-head-m7v5');const root=document.getElementById('hand-result-overlay-m7v5');if(!target||!root)return;const buttons=[...root.querySelectorAll('.hand-result-tile-m7v5')];if(buttons.length!==14||buttons.some(b=>b.dataset.tile))return;buttons.forEach((b,i)=>{b.dataset.tile=demo[i];b.dataset.tileGlyph=glyphs[demo[i]];b.textContent=demo[i];b.setAttribute('aria-label',demo[i]);});const status=root.querySelector('.hand-result-status-m7v5');if(status)status.textContent='14枚確認済み ✓';const ok=root.querySelector('.hand-result-ok-m7v5');if(ok)ok.disabled=false;},true);
})();

// M7 v7.2 iPhone表示安定化 + 読み取り直し導線
(() => {
  const style=document.createElement('style');style.textContent=`@supports(height:100dvh){html,body{height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}#game-screen.screen.active{height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}.agari-overlay:not(.hidden){height:100dvh!important;max-height:100dvh!important;overflow:hidden!important}}`;document.head.appendChild(style);
  function normalizeV72(){const h=document.documentElement.clientHeight||window.innerHeight;const w=document.documentElement.clientWidth||window.innerWidth;if(w>h&&w>0&&h>0){document.documentElement.style.setProperty('--app-width-v25',`${w}px`);document.documentElement.style.setProperty('--app-height-v25',`${h}px`);}window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0;}
  ['pageshow','resize','orientationchange'].forEach(name=>window.addEventListener(name,()=>{requestAnimationFrame(normalizeV72);setTimeout(normalizeV72,120);setTimeout(normalizeV72,500);},{passive:true}));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){requestAnimationFrame(normalizeV72);setTimeout(normalizeV72,150);}});
  document.addEventListener('click',e=>{const back=e.target.closest?.('.hand-result-back-m7v5');if(!back)return;e.preventDefault();e.stopImmediatePropagation();document.getElementById('hand-result-overlay-m7v5')?.remove();if(typeof openSimpleGameMenuV1==='function')openSimpleGameMenuV1();requestAnimationFrame(()=>{const camera=document.getElementById('open-realtime-hand-camera-m7v3');if(camera)camera.click();else if(typeof closeSimpleGameMenuV1==='function')closeSimpleGameMenuV1();});},true);
})();

// ========================================
// M8 v4 アガリ形 + 手牌だけで確定できる基本役判定
// 通常形 / 七対子 / 国士無双
// タンヤオ / 役牌(白發中) / 対々和 / 混一色 / 清一色 / 小三元 / 大三元
// ========================================
(() => {
  const tileOrder=['1萬','2萬','3萬','4萬','5萬','6萬','7萬','8萬','9萬','1筒','2筒','3筒','4筒','5筒','6筒','7筒','8筒','9筒','1索','2索','3索','4索','5索','6索','7索','8索','9索','東','南','西','北','白','發','中'];
  const index=new Map(tileOrder.map((t,i)=>[t,i]));
  const honors=new Set(['東','南','西','北','白','發','中']);
  const terminals=new Set(['1萬','9萬','1筒','9筒','1索','9索']);
  function countsOf(tiles){if(tiles.length!==14)return null;const c=Array(34).fill(0);for(const t of tiles){const i=index.get(t);if(i==null)return null;c[i]++;if(c[i]>4)return null;}return c;}
  function canMeld(c){const i=c.findIndex(n=>n>0);if(i<0)return true;if(c[i]>=3){c[i]-=3;if(canMeld(c)){c[i]+=3;return true;}c[i]+=3;}if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;if(canMeld(c)){c[i]++;c[i+1]++;c[i+2]++;return true;}c[i]++;c[i+1]++;c[i+2]++;}return false;}
  function standard(c){for(let i=0;i<34;i++)if(c[i]>=2){c[i]-=2;const ok=canMeld(c);c[i]+=2;if(ok)return true;}return false;}
  function chiitoitsu(c){return c.filter(n=>n===2).length===7;}
  function kokushi(c){const yaochu=[0,8,9,17,18,26,27,28,29,30,31,32,33];return yaochu.every(i=>c[i]>=1)&&yaochu.some(i=>c[i]>=2)&&c.reduce((s,n,i)=>s+(yaochu.includes(i)?0:n),0)===0;}
  function allTriplets(c){for(let pair=0;pair<34;pair++){if(c[pair]<2)continue;const x=c.slice();x[pair]-=2;if(x.every(n=>n%3===0))return true;}return false;}
  function detectYaku(tiles,c,type){
    const y=[];
    if(type==='国士無双')return ['国士無双'];
    if(type==='七対子')y.push('七対子');
    const allSimple=tiles.every(t=>!honors.has(t)&&!terminals.has(t));if(allSimple)y.push('タンヤオ');
    const dragonTriplets=['白','發','中'].filter(t=>c[index.get(t)]>=3);dragonTriplets.forEach(t=>y.push(`役牌 ${t}`));
    const dragonPairs=['白','發','中'].filter(t=>c[index.get(t)]===2);
    if(dragonTriplets.length===3)y.push('大三元');else if(dragonTriplets.length===2&&dragonPairs.length===1)y.push('小三元');
    if(type.startsWith('通常形')&&allTriplets(c))y.push('対々和');
    const suits=new Set();let hasHonor=false;
    tiles.forEach(t=>{if(honors.has(t)){hasHonor=true;return;}if(t.endsWith('萬'))suits.add('萬');else if(t.endsWith('筒'))suits.add('筒');else if(t.endsWith('索'))suits.add('索');});
    if(suits.size===1&&!hasHonor)y.push('清一色');else if(suits.size===1&&hasHonor)y.push('混一色');else if(suits.size===0&&hasHonor)y.push('字一色');
    return [...new Set(y)];
  }
  function judge(tiles){const c=countsOf(tiles);if(!c)return {win:false,type:null,yaku:[]};let type=null;if(kokushi(c))type='国士無双';else if(chiitoitsu(c))type='七対子';else if(standard(c))type='通常形（4面子＋1雀頭）';if(!type)return {win:false,type:null,yaku:[]};return {win:true,type,yaku:detectYaku(tiles,c,type)};}
  window.judgeMahjongWinM8V2=judge;window.judgeMahjongWinM8V4=judge;
  const style=document.createElement('style');style.textContent=`#m8-result-v1{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px}#m8-result-v1 .m8-card{width:min(650px,88vw);background:#f7f3e9;color:#102019;border-radius:22px;padding:22px;text-align:center;box-shadow:0 18px 55px rgba(0,0,0,.35)}#m8-result-v1 h2{font-size:28px;margin:0 0 8px}#m8-result-v1 p{font-size:16px;margin:0 0 12px}#m8-result-v1 .m8-yaku-v4{margin:10px 0 14px;padding:11px 14px;border-radius:13px;background:#e9f5ed;font-size:16px;font-weight:800}#m8-result-v1 .m8-yaku-v4.none{background:#f1efe9;font-weight:700}#m8-result-v1 button{width:100%;min-height:52px;border:0;border-radius:14px;font-size:18px;font-weight:800;background:#e7e7e7;color:#111}`;document.head.appendChild(style);
  function showResult(tiles){document.getElementById('m8-result-v1')?.remove();const r=judge(tiles);const root=document.createElement('div');root.id='m8-result-v1';const yakuText=r.win?(r.yaku.length?`判定できた役：${r.yaku.join(' / ')}`:'手牌だけで確定できる役は未検出'):'役判定はアガリ形成立後に行います';root.innerHTML=`<div class="m8-card"><h2>${r.win?'アガリ形です ✓':'まだアガリ形ではありません'}</h2><p>${r.win?`成立形：${r.type}`:'通常形・七対子・国士無双のいずれにも成立していません。'}</p><div class="m8-yaku-v4${r.win&&r.yaku.length?'':' none'}">${yakuText}</div><p><small>※ M8 v4：手牌だけで確定できる基本役まで判定。場風・自風・リーチ・ツモ・門前/副露などは次工程で接続します。</small></p><button type="button">確認</button></div>`;root.querySelector('button').onclick=()=>root.remove();document.body.appendChild(root);}
  document.addEventListener('click',e=>{const ok=e.target.closest?.('.hand-result-ok-m7v5');if(!ok)return;const root=document.getElementById('hand-result-overlay-m7v5');if(!root)return;const tiles=[...root.querySelectorAll('.hand-result-tile-m7v5')].map(b=>b.dataset.tile).filter(Boolean);if(tiles.length!==14)return;e.preventDefault();e.stopImmediatePropagation();root.remove();showResult(tiles);},true);
})();