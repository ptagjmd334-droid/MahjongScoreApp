// M8 scoring core: pure, testable rules shared by the on-screen yaku/fu evaluators.
// These helpers do NOT declare a hand winning, certify a yaku, or modify game state.
(function(root){
  'use strict';
  function sequencePairYaku(starts, menzen){
    if(!menzen||!Array.isArray(starts)||starts.length<2)return [];
    const counts=new Map();
    for(const start of starts){
      if(!Number.isInteger(start)||start<0||start>26||start%9>6)return [];
      counts.set(start,(counts.get(start)||0)+1);
    }
    const pairs=[...counts.values()].reduce((sum,n)=>sum+Math.floor(n/2),0);
    if(starts.length===4&&pairs>=2)return ['二盃口'];
    return pairs>=1?['一盃口']:[];
  }
  function roundFu(total,menzen){
    if(!Number.isFinite(total)||total<20)return null;
    const rounded=Math.ceil(total/10)*10;
    // Standard open hands may not score 20 fu; pinfu tsumo is dealt with separately.
    return menzen?rounded:Math.max(30,rounded);
  }
  function tripletFu(yaochu,closed){
    return closed?(yaochu?8:4):(yaochu?4:2);
  }
  function kanFu(yaochu,closed){
    return closed?(yaochu?32:16):(yaochu?16:8);
  }
  const api=Object.freeze({sequencePairYaku,roundFu,tripletFu,kanFu});
  root.M8ScoringCoreV32=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
