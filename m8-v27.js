// M8 v27: method opening is centered immediately; starting dealer badge stays at lower-right.
(()=>{
 const overlay=document.getElementById('agari-overlay');
 if(!overlay)return;
 const badge=document.getElementById('app-build-badge');if(badge)badge.textContent='M8 v27';
 const style=document.createElement('style');
 style.textContent=`
 #game-screen .player-panel .starting-dealer-badge-v1{
 top:auto!important;bottom:-9px!important;right:-9px!important;left:auto!important;
 }
 body>#agari-overlay.m8v27-method{
 position:fixed!important;left:50%!important;top:50%!important;
 right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;
 width:min(510px,56vw)!important;max-width:min(510px,56vw)!important;
 height:auto!important;max-height:80dvh!important;zoom:1!important;
 pointer-events:auto!important;
 }
 body>#agari-overlay.m8v27-method>.agari-flow-card{
 width:100%!important;max-width:100%!important;height:auto!important;
 max-height:80dvh!important;overflow-y:auto!important;
 }
 `;
 document.head.appendChild(style);
 const method=()=>{try{return agariFlow.step==='method';}catch(_){return false;}};
 function refresh(){
  const active=!overlay.classList.contains('hidden')&&method();
  overlay.classList.toggle('m8v27-method',active);
  if(active){
   overlay.style.setProperty('top','50%','important');
   overlay.style.setProperty('left','50%','important');
   overlay.style.setProperty('transform','translate(-50%,-50%)','important');
  }
 }
 // Observe visibility and flow content mutations: opening via game buttons can happen
 // after capture-phase click callbacks, so click-only positioning misses first render.
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;pending=true;
  requestAnimationFrame(()=>{pending=false;refresh();});
 });
 observer.observe(overlay,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('click',()=>requestAnimationFrame(refresh),true);
 window.addEventListener('pageshow',refresh);
 refresh();
})();