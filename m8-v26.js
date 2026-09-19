// M8 v26: 画面中央の操作と4方向プレイヤー選択を分離
(() => {
 const overlay=document.getElementById('agari-overlay');
 const game=document.getElementById('game-screen');
 if(!overlay||!game)return;
 const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M8 v26';
 const style=document.createElement('style');
 style.textContent=`
 body>#agari-overlay.m8v26-select{
   pointer-events:none!important;
 }
 body>#agari-overlay.m8v26-select>.agari-flow-card{
   pointer-events:auto!important;
 }
 body>#agari-overlay.m8v26-select .agari-flow-actions{
   pointer-events:auto!important;
 }
 `;
 document.head.appendChild(style);
 function set(el,p,v){el?.style.setProperty(p,v,'important');}
 function step(){try{return agariFlow.step||'';}catch(_){return '';}}
 function update(){
   if(overlay.classList.contains('hidden')){overlay.classList.remove('m8v26-select');return;}
   const s=step(),pick=s==='winner'||s==='discarder';
   overlay.classList.toggle('m8v26-select',pick);
   if(!pick)return;
   const r=game.getBoundingClientRect(),vv=window.visualViewport;
   const left=vv?.offsetLeft||0,top=vv?.offsetTop||0;
   const w=vv?.width||innerWidth,h=vv?.height||innerHeight;
   const cx=Math.max(left+120,Math.min(left+w-120,r.left+r.width/2));
   const cy=top+h/2;
   // 上下のパネルと重ならないよう選択画面の高さを制限。
   const width=Math.min(510,w*.56),height=Math.min(154,h*.34);
   set(overlay,'position','fixed');set(overlay,'left',cx+'px');set(overlay,'top',cy+'px');
   set(overlay,'right','auto');set(overlay,'bottom','auto');
   set(overlay,'width',width+'px');set(overlay,'max-width',width+'px');
   set(overlay,'height','auto');set(overlay,'max-height',height+'px');
   set(overlay,'transform','translate(-50%,-50%)');set(overlay,'zoom','1');
   const card=overlay.querySelector('.agari-flow-card');
   set(card,'width','100%');set(card,'max-width','100%');
   set(card,'height','auto');set(card,'max-height',height+'px');
   set(card,'padding','5px 10px');set(card,'overflow-y','auto');
   const title=overlay.querySelector('.agari-flow-top');set(title,'margin-bottom','2px');
   const content=overlay.querySelector('.agari-flow-content');set(content,'gap','3px');
   overlay.querySelectorAll('.agari-flow-actions button').forEach(b=>{
     set(b,'min-height','30px');set(b,'padding','4px 8px');
   });
 }
 // clickの後にDOMが更新されたタイミングで1回だけ再配置する。
 document.addEventListener('click',()=>requestAnimationFrame(update),true);
 ['pageshow','resize','orientationchange'].forEach(e=>window.addEventListener(e,update,{passive:true}));
 window.visualViewport?.addEventListener('resize',update,{passive:true});
 update();
})();