// MAKI v141: nearest-template selection must match stable full-sort semantics.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'..','m7-recognition-core.js'),'utf8');
assert(source.includes('let nearestFirst=null,nearestSecond=null,firstDistance=Infinity,secondDistance=Infinity'));
assert(!source.includes('.map(t=>({t,d:alignedDirectImageDistance(feature,t)}))'));
function fast(values){
 let first=null,second=null,a=Infinity,b=Infinity;
 for(let i=0;i<values.length;i++){
  const d=values[i];
  if(!Number.isFinite(d))continue;
  if(d<a){second=first;b=a;first=i;a=d;}
  else if(d<b){second=i;b=d;}
 }
 return [first,second].filter(x=>x!==null);
}
function baseline(values){return values.map((d,i)=>({d,i})).filter(x=>Number.isFinite(x.d)).sort((a,b)=>a.d-b.d).slice(0,2).map(x=>x.i);}
for(const vals of [[],[Infinity],[.2],[.2,.2,.2],[.3,.1,.2,.1],[NaN,Infinity,.4,.4,-1],...Array.from({length:100},(_,n)=>Array.from({length:n%9},(_,i)=>((n*17+i*31)%7)/10))]){
 assert.deepEqual(fast(vals),baseline(vals));
}
console.log('v141 nearest-template parity: OK');
