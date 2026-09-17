// M8 v20 loader: 重い自己再描画ループを避けた安定版を読み込む
(() => {
  const badge=document.getElementById('app-build-badge');
  if(badge)badge.textContent='M8 v20';
  if(document.querySelector('script[data-m8v20-stable]'))return;
  const s=document.createElement('script');
  s.src='m8-v20-stable.js?v=m8v20-stable1';
  s.async=false;
  s.dataset.m8v20Stable='1';
  document.body.appendChild(s);
})();