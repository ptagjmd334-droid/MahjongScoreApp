// M7 v33: lightweight on-device recognition helpers (pure/testable).
(function(root){
  'use strict';
  function rmsDistance(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return Infinity;
    let s=0;
    for(let i=0;i<a.length;i++){const d=Number(a[i])-Number(b[i]);if(!Number.isFinite(d))return Infinity;s+=d*d;}
    return Math.sqrt(s/a.length);
  }

  function shiftedRmsDistance(a,b,width=8,height=12,maxShift=1){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length!==width*height)return rmsDistance(a,b);
    let best=Infinity;
    for(let dy=-maxShift;dy<=maxShift;dy++)for(let dx=-maxShift;dx<=maxShift;dx++){
      let s=0,n=0;
      const y0=Math.max(0,-dy),y1=Math.min(height,height-dy);
      const x0=Math.max(0,-dx),x1=Math.min(width,width-dx);
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const av=Number(a[y*width+x]),bv=Number(b[(y+dy)*width+(x+dx)]);
        if(!Number.isFinite(av)||!Number.isFinite(bv))return Infinity;
        const d=av-bv;s+=d*d;n++;
      }
      if(!n)continue;
      const penalty=(Math.abs(dx)+Math.abs(dy))*.012;
      best=Math.min(best,Math.sqrt(s/n)+penalty);
    }
    return best;
  }
  function shiftedGroupedRmsDistance(a,b,width,height,groups,maxShift=1){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||a.length!==width*height*groups)return rmsDistance(a,b);
    let best=Infinity;
    for(let dy=-maxShift;dy<=maxShift;dy++)for(let dx=-maxShift;dx<=maxShift;dx++){
      let s=0,n=0;
      const y0=Math.max(0,-dy),y1=Math.min(height,height-dy);
      const x0=Math.max(0,-dx),x1=Math.min(width,width-dx);
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let g=0;g<groups;g++){
        const ai=(y*width+x)*groups+g;
        const bi=((y+dy)*width+(x+dx))*groups+g;
        const av=Number(a[ai]),bv=Number(b[bi]);
        if(!Number.isFinite(av)||!Number.isFinite(bv))return Infinity;
        const d=av-bv;s+=d*d;n++;
      }
      if(!n)continue;
      const penalty=(Math.abs(dx)+Math.abs(dy))*.010;
      best=Math.min(best,Math.sqrt(s/n)+penalty);
    }
    return best;
  }

  function structuredFeatureDistance(a,b){
    if(!a||!b||a.kind!=='hog-color-ink-v1'||b.kind!=='hog-color-ink-v1')return Infinity;
    const hog=shiftedGroupedRmsDistance(a.hog,b.hog,6,9,8,1);
    const color=shiftedGroupedRmsDistance(a.color,b.color,4,6,3,1);
    const ink=shiftedRmsDistance(a.ink,b.ink,8,12,1);
    if(!Number.isFinite(hog)||!Number.isFinite(color)||!Number.isFinite(ink))return Infinity;
    return hog*.60+color*.25+ink*.15;
  }


  function bilinear(map,width,height,x,y){
    if(!Array.isArray(map)||x<0||y<0||x>width-1||y>height-1)return 0;
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1);
    const fx=x-x0,fy=y-y0;
    const a=Number(map[y0*width+x0])||0,b=Number(map[y0*width+x1])||0;
    const d=Number(map[y1*width+x0])||0,e=Number(map[y1*width+x1])||0;
    return (a*(1-fx)+b*fx)*(1-fy)+(d*(1-fx)+e*fx)*fy;
  }

  function directImageDistance(a,b){
    const directKinds=new Set(['direct-edge-v1','oriented-direct-v1','perspective-direct-v1']);
    if(!a||!b||!directKinds.has(a.kind)||a.kind!==b.kind)return Infinity;
    const width=Number(a.width)||0,height=Number(a.height)||0;
    if(width!==Number(b.width)||height!==Number(b.height)||width<4||height<4)return Infinity;
    const channels=['gray','edge','red','green'];
    for(const k of channels){
      if(!Array.isArray(a[k])||!Array.isArray(b[k])||a[k].length!==width*height||b[k].length!==width*height)return Infinity;
    }
    const cx=(width-1)/2,cy=(height-1)/2;
    const transforms=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)transforms.push({angle:0,scale:1,dx,dy});
    transforms.push({angle:-2*Math.PI/180,scale:1,dx:0,dy:0});
    transforms.push({angle:2*Math.PI/180,scale:1,dx:0,dy:0});
    transforms.push({angle:0,scale:.97,dx:0,dy:0});
    transforms.push({angle:0,scale:1.03,dx:0,dy:0});
    let best=Infinity;
    for(const t of transforms){
      const cos=Math.cos(t.angle),sin=Math.sin(t.angle);
      let sg=0,se=0,sr=0,sn=0,weightSum=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const ux=x-cx-t.dx,uy=y-cy-t.dy;
        const bx=(ux*cos+uy*sin)/t.scale+cx;
        const by=(-ux*sin+uy*cos)/t.scale+cy;
        const ag=Number(a.gray[y*width+x])||0,ae=Number(a.edge[y*width+x])||0;
        const ar=Number(a.red[y*width+x])||0,an=Number(a.green[y*width+x])||0;
        const bg=bilinear(b.gray,width,height,bx,by),be=bilinear(b.edge,width,height,bx,by);
        const br=bilinear(b.red,width,height,bx,by),bn=bilinear(b.green,width,height,bx,by);
        const w=.28+Math.max(ag,bg,ae,be,ar,br,an,bn);
        sg+=(ag-bg)*(ag-bg)*w;
        se+=(ae-be)*(ae-be)*w;
        sr+=((ar-br)*(ar-br)+(an-bn)*(an-bn))*.5*w;
        weightSum+=w;
      }
      if(!weightSum)continue;
      const gray=Math.sqrt(sg/weightSum);
      const edge=Math.sqrt(se/weightSum);
      const color=Math.sqrt(sr/weightSum);
      const penalty=(Math.abs(t.dx)+Math.abs(t.dy))*.004+Math.abs(t.angle)*.10+Math.abs(1-t.scale)*.18;
      const score=edge*.48+gray*.37+color*.15+penalty;
      if(score<best)best=score;
    }
    return best;
  }

  function featureDistance(a,b){
    if(a&&b&&['direct-edge-v1','oriented-direct-v1','perspective-direct-v1'].includes(a.kind)&&a.kind===b.kind){
      return directImageDistance(a,b);
    }
    if(a&&b&&a.kind==='hog-color-ink-v1'&&b.kind==='hog-color-ink-v1'){
      return structuredFeatureDistance(a,b);
    }
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){
      if(a.length===96)return shiftedRmsDistance(a,b,8,12,1);
      if(a.length===216)return shiftedRmsDistance(a,b,12,18,1);
    }
    return rmsDistance(a,b);
  }

  function rankLabelsRobust(feature,library,options={}){
    const out=[];
    const singlePenalty=Number.isFinite(options.singlePenalty)?options.singlePenalty:.035;
    const maxTemplates=Number.isFinite(options.maxTemplates)?Math.max(1,options.maxTemplates|0):3;
    if(!feature||!library||typeof library!=='object')return out;
    for(const [label,templates] of Object.entries(library)){
      if(!Array.isArray(templates)||!templates.length)continue;
      const distances=templates
        .map(t=>featureDistance(feature,t))
        .filter(Number.isFinite)
        .sort((a,b)=>a-b);
      if(!distances.length)continue;
      const take=Math.min(maxTemplates,distances.length);
      const chosen=distances.slice(0,take);
      const mean=chosen.reduce((s,v)=>s+v,0)/chosen.length;
      const score=distances.length===1?mean+singlePenalty:mean;
      out.push({
        label,
        distance:score,
        bestDistance:distances[0],
        sampleCount:distances.length,
        spread:chosen.length>1?chosen[chosen.length-1]-chosen[0]:0
      });
    }
    return out.sort((a,b)=>a.distance-b.distance);
  }


  function prototypeFeature(templates){
    if(!Array.isArray(templates)||!templates.length)return null;
    const first=templates.find(Boolean);if(!first)return null;
    const directKinds=new Set(['direct-edge-v1','oriented-direct-v1','perspective-direct-v1']);
    if(directKinds.has(first.kind)){
      const width=Number(first.width)||0,height=Number(first.height)||0,n=width*height;
      if(width<1||height<1)return null;
      const valid=templates.filter(t=>t&&t.kind===first.kind&&Number(t.width)===width&&Number(t.height)===height&&
        ['gray','edge','red','green'].every(k=>Array.isArray(t[k])&&t[k].length===n));
      if(!valid.length)return null;
      const out={kind:first.kind,width,height,gray:Array(n).fill(0),edge:Array(n).fill(0),red:Array(n).fill(0),green:Array(n).fill(0)};
      for(const t of valid)for(const k of ['gray','edge','red','green'])for(let i=0;i<n;i++)out[k][i]+=Number(t[k][i])||0;
      for(const k of ['gray','edge','red','green'])for(let i=0;i<n;i++)out[k][i]/=valid.length;
      return out;
    }
    if(Array.isArray(first)){
      const valid=templates.filter(t=>Array.isArray(t)&&t.length===first.length);
      if(!valid.length)return null;
      const out=Array(first.length).fill(0);
      for(const t of valid)for(let i=0;i<out.length;i++)out[i]+=Number(t[i])||0;
      for(let i=0;i<out.length;i++)out[i]/=valid.length;
      return out;
    }
    return first;
  }

  function pooledChannel(feature,key,cols,rows){
    const width=Number(feature?.width)||0,height=Number(feature?.height)||0;
    const src=feature?.[key];
    if(width<1||height<1||!Array.isArray(src)||src.length!==width*height)return null;
    const sum=Array(cols*rows).fill(0),count=Array(cols*rows).fill(0);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const gx=Math.min(cols-1,Math.floor(x*cols/width));
      const gy=Math.min(rows-1,Math.floor(y*rows/height));
      const gi=gy*cols+gx;
      sum[gi]+=Number(src[y*width+x])||0;count[gi]++;
    }
    return sum.map((v,i)=>count[i]?v/count[i]:0);
  }

  function pooledRms(a,b){
    if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return Infinity;
    let s=0;for(let i=0;i<a.length;i++){const d=(Number(a[i])||0)-(Number(b[i])||0);s+=d*d;}
    return Math.sqrt(s/a.length);
  }

  function structuralDistance(a,b){
    const directKinds=new Set(['direct-edge-v1','oriented-direct-v1','perspective-direct-v1']);
    if(!a||!b||!directKinds.has(a.kind)||a.kind!==b.kind)return featureDistance(a,b);
    if(Number(a.width)!==Number(b.width)||Number(a.height)!==Number(b.height))return Infinity;
    const oneScale=(cols,rows)=>{
      const ag=pooledChannel(a,'gray',cols,rows),bg=pooledChannel(b,'gray',cols,rows);
      const ae=pooledChannel(a,'edge',cols,rows),be=pooledChannel(b,'edge',cols,rows);
      const ar=pooledChannel(a,'red',cols,rows),br=pooledChannel(b,'red',cols,rows);
      const an=pooledChannel(a,'green',cols,rows),bn=pooledChannel(b,'green',cols,rows);
      if(!ag||!bg||!ae||!be||!ar||!br||!an||!bn)return Infinity;
      const gray=pooledRms(ag,bg),edge=pooledRms(ae,be);
      const color=Math.sqrt((pooledRms(ar,br)**2+pooledRms(an,bn)**2)/2);
      return edge*.44+gray*.40+color*.16;
    };
    const fine=oneScale(6,9),coarse=oneScale(3,5);
    if(!Number.isFinite(fine)||!Number.isFinite(coarse))return featureDistance(a,b);
    const rowA=pooledChannel(a,'gray',1,9),rowB=pooledChannel(b,'gray',1,9);
    const colA=pooledChannel(a,'gray',6,1),colB=pooledChannel(b,'gray',6,1);
    const proj=(pooledRms(rowA,rowB)+pooledRms(colA,colB))/2;
    return fine*.45+coarse*.38+proj*.17;
  }

  function templateStructuralConsensusDistance(feature,templates){
    if(!feature||!Array.isArray(templates)||!templates.length)return Infinity;
    const ds=templates.map(t=>structuralDistance(feature,t)).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!ds.length)return Infinity;
    if(ds.length===1)return ds[0]+.008;
    if(ds.length===2)return ds[0]*.65+ds[1]*.35;
    return ds[0]*.55+ds[1]*.30+ds[2]*.15;
  }

  function medoidFeature(templates){
    if(!Array.isArray(templates)||!templates.length)return null;
    const valid=templates.filter(Boolean);
    if(!valid.length)return null;
    if(valid.length===1)return valid[0];
    let best=valid[0],bestScore=Infinity;
    for(let i=0;i<valid.length;i++){
      let total=0,n=0;
      for(let j=0;j<valid.length;j++){
        if(i===j)continue;
        const d=featureDistance(valid[i],valid[j]);
        if(Number.isFinite(d)){total+=d;n++;}
      }
      const score=n?total/n:Infinity;
      if(score<bestScore){bestScore=score;best=valid[i];}
    }
    return best;
  }

  function templateConsensusDistance(feature,templates){
    if(!feature||!Array.isArray(templates)||!templates.length)return Infinity;
    const ds=templates.map(t=>featureDistance(feature,t)).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!ds.length)return Infinity;
    if(ds.length===1)return ds[0]+.012;
    if(ds.length===2)return ds[0]*.65+ds[1]*.35;
    return ds[0]*.55+ds[1]*.30+ds[2]*.15;
  }

  function rankLabelsBalanced(feature,library){
    const out=[];
    if(!feature||!library||typeof library!=='object')return out;
    for(const [label,templates] of Object.entries(library)){
      if(!Array.isArray(templates)||!templates.length)continue;
      const prototype=prototypeFeature(templates);
      const distance=featureDistance(feature,prototype);
      if(!Number.isFinite(distance))continue;
      const raw=templates.map(t=>featureDistance(feature,t)).filter(Number.isFinite).sort((a,b)=>a-b);
      out.push({
        label,
        distance,
        bestDistance:raw[0]??distance,
        sampleCount:templates.length,
        prototype:true
      });
    }
    return out.sort((a,b)=>a.distance-b.distance);
  }


  function tileFamily(label){
    const s=String(label||'').replace(/\s+/g,'');
    if(s.includes('萬'))return '萬';
    if(s.includes('筒'))return '筒';
    if(s.includes('索'))return '索';
    if(['東','南','西','北','白','發','発','中'].includes(s))return '字';
    return '';
  }

  function buildFamilyLibrary(library){
    const out={};
    if(!library||typeof library!=='object')return out;
    for(const [label,templates] of Object.entries(library)){
      const family=tileFamily(label);
      if(!family||!Array.isArray(templates)||!templates.length)continue;
      const labelPrototype=medoidFeature(templates);
      if(!labelPrototype)continue;
      (out[family]||(out[family]=[])).push(labelPrototype);
    }
    return out;
  }

  function rankFamiliesBalanced(feature,library){
    return rankLabelsBalanced(feature,buildFamilyLibrary(library)).map(x=>({...x,family:x.label}));
  }

  function rankLabelsHierarchical(feature,library){
    if(!feature||!library||typeof library!=='object')return [];
    const families=rankFamiliesBalanced(feature,library);
    if(!families.length)return rankLabelsBalanced(feature,library);
    const chosen=families[0],runner=families[1];
    const filtered={};
    for(const [label,templates] of Object.entries(library)){
      if(tileFamily(label)===chosen.label)filtered[label]=templates;
    }
    const labels=rankLabelsBalanced(feature,filtered);
    const familyGap=runner&&Number.isFinite(runner.distance)?runner.distance-chosen.distance:Infinity;
    const familyRatio=runner&&runner.distance>0?chosen.distance/runner.distance:0;
    return labels.map(x=>({
      ...x,
      family:chosen.label,
      familyDistance:chosen.distance,
      familyBestDistance:Number.isFinite(chosen.bestDistance)?chosen.bestDistance:chosen.distance,
      familyRunnerUpDistance:runner?.distance??Infinity,
      familyGap,
      familyRatio,
      familyRanked:families.slice(0,4).map(f=>({family:f.label,distance:f.distance}))
    }));
  }


  function familyDiscriminativeWeights(library){
    const byFamily={};
    if(!library||typeof library!=='object')return byFamily;
    for(const [label,templates] of Object.entries(library)){
      const family=tileFamily(label);
      if(!family||!Array.isArray(templates)||!templates.length)continue;
      const p=medoidFeature(templates);
      if(!p||!['direct-edge-v1','oriented-direct-v1','perspective-direct-v1'].includes(p.kind))continue;
      (byFamily[family]||(byFamily[family]=[])).push(p);
    }
    const out={};
    for(const [family,protos] of Object.entries(byFamily)){
      const first=protos[0],n=(Number(first.width)||0)*(Number(first.height)||0);
      if(protos.length<2||!n){out[family]=Array(n).fill(1);continue;}
      const score=Array(n).fill(0);
      for(let i=0;i<n;i++){
        let vg=0,ve=0,vr=0,vn=0;
        for(const [key,acc] of [['gray','g'],['edge','e'],['red','r'],['green','n']]){
          let mean=0;
          for(const p of protos)mean+=Number(p[key][i])||0;
          mean/=protos.length;
          let v=0;
          for(const p of protos){const d=(Number(p[key][i])||0)-mean;v+=d*d;}
          v/=protos.length;
          if(acc==='g')vg=v;else if(acc==='e')ve=v;else if(acc==='r')vr=v;else vn=v;
        }
        score[i]=ve*.52+vg*.30+(vr+vn)*.09;
      }
      const sorted=score.slice().sort((a,b)=>a-b);
      const ref=sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(sorted.length*.92)))]||Math.max(...score,1e-6);
      out[family]=score.map(v=>{
        const x=Math.max(0,Math.min(1,v/Math.max(ref,1e-7)));
        return .35+2.65*Math.sqrt(x);
      });
    }
    return out;
  }

  // v60: family-wide variance says "where labels in this suit differ at all".
  // For close labels such as 5/6/7/8-pin we also need the regions that make
  // each individual label unlike its same-family competitors.
  function labelDiscriminativeWeights(library){
    const prototypes={};
    for(const [label,templates] of Object.entries(library||{})){
      if(!Array.isArray(templates)||!templates.length)continue;
      const p=medoidFeature(templates);
      if(p&&['direct-edge-v1','oriented-direct-v1','perspective-direct-v1'].includes(p.kind))prototypes[label]=p;
    }
    const out={};
    for(const [label,target] of Object.entries(prototypes)){
      const family=tileFamily(label);
      const rivals=Object.entries(prototypes).filter(([other,p])=>
        other!==label&&tileFamily(other)===family&&p.kind===target.kind&&p.width===target.width&&p.height===target.height
      ).map(([,p])=>p);
      const n=(Number(target.width)||0)*(Number(target.height)||0);
      if(!n||!rivals.length){out[label]=Array(n).fill(1);continue;}
      const score=Array(n).fill(0);
      for(let i=0;i<n;i++){
        let total=0;
        for(const p of rivals){
          const dg=(Number(target.gray[i])||0)-(Number(p.gray[i])||0);
          const de=(Number(target.edge[i])||0)-(Number(p.edge[i])||0);
          const dr=(Number(target.red[i])||0)-(Number(p.red[i])||0);
          const dn=(Number(target.green[i])||0)-(Number(p.green[i])||0);
          total+=de*de*.54+dg*dg*.30+(dr*dr+dn*dn)*.08;
        }
        score[i]=total/rivals.length;
      }
      const sorted=score.slice().sort((a,b)=>a-b);
      const ref=sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(sorted.length*.90)))]||Math.max(...score,1e-7);
      out[label]=score.map(v=>{
        const x=Math.max(0,Math.min(1,v/Math.max(ref,1e-8)));
        return .28+3.72*Math.sqrt(x);
      });
    }
    return out;
  }

  function templateSpread(templates,prototype=null){
    if(!Array.isArray(templates)||templates.length<2)return 0;
    const p=prototype||prototypeFeature(templates);if(!p)return Infinity;
    const ds=templates.map(t=>featureDistance(t,p)).filter(Number.isFinite).sort((a,b)=>a-b);
    if(!ds.length)return Infinity;
    const mid=Math.floor(ds.length/2);
    return ds.length%2?ds[mid]:(ds[mid-1]+ds[mid])/2;
  }

  function weightedDirectImageDistance(a,b,weights){
    const directKinds=new Set(['direct-edge-v1','oriented-direct-v1','perspective-direct-v1']);
    if(!a||!b||!directKinds.has(a.kind)||a.kind!==b.kind)return featureDistance(a,b);
    const width=Number(a.width)||0,height=Number(a.height)||0,n=width*height;
    if(width!==Number(b.width)||height!==Number(b.height)||!Array.isArray(weights)||weights.length!==n)return directImageDistance(a,b);
    const channels=['gray','edge','red','green'];
    for(const k of channels)if(!Array.isArray(a[k])||!Array.isArray(b[k])||a[k].length!==n||b[k].length!==n)return directImageDistance(a,b);
    const cx=(width-1)/2,cy=(height-1)/2;
    const transforms=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)transforms.push({angle:0,scale:1,dx,dy});
    transforms.push({angle:-2*Math.PI/180,scale:1,dx:0,dy:0});
    transforms.push({angle:2*Math.PI/180,scale:1,dx:0,dy:0});
    transforms.push({angle:0,scale:.97,dx:0,dy:0});
    transforms.push({angle:0,scale:1.03,dx:0,dy:0});
    let best=Infinity;
    for(const t of transforms){
      const cos=Math.cos(t.angle),sin=Math.sin(t.angle);
      let sg=0,se=0,sr=0,weightSum=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const i=y*width+x;
        const ux=x-cx-t.dx,uy=y-cy-t.dy;
        const bx=(ux*cos+uy*sin)/t.scale+cx;
        const by=(-ux*sin+uy*cos)/t.scale+cy;
        const ag=Number(a.gray[i])||0,ae=Number(a.edge[i])||0;
        const ar=Number(a.red[i])||0,an=Number(a.green[i])||0;
        const bg=bilinear(b.gray,width,height,bx,by),be=bilinear(b.edge,width,height,bx,by);
        const br=bilinear(b.red,width,height,bx,by),bn=bilinear(b.green,width,height,bx,by);
        const ink=.28+Math.max(ag,bg,ae,be,ar,br,an,bn);
        const w=ink*(Number(weights[i])||1);
        sg+=(ag-bg)*(ag-bg)*w;
        se+=(ae-be)*(ae-be)*w;
        sr+=((ar-br)*(ar-br)+(an-bn)*(an-bn))*.5*w;
        weightSum+=w;
      }
      if(!weightSum)continue;
      const gray=Math.sqrt(sg/weightSum),edge=Math.sqrt(se/weightSum),color=Math.sqrt(sr/weightSum);
      const penalty=(Math.abs(t.dx)+Math.abs(t.dy))*.004+Math.abs(t.angle)*.10+Math.abs(1-t.scale)*.18;
      best=Math.min(best,edge*.50+gray*.36+color*.14+penalty);
    }
    return best;
  }

  function rankLabelsFamilyDiscriminative(feature,library,options={}){
    if(!feature||!library||typeof library!=='object')return [];
    const families=rankFamiliesBalanced(feature,library);
    const familyMap=new Map(families.map(f=>[f.label,f]));
    const minFamily=Number(families[0]?.distance);
    const runner=families[1];
    const familyGap=runner&&Number.isFinite(runner.distance)&&Number.isFinite(minFamily)?runner.distance-minFamily:Infinity;
    const familyRatio=runner&&runner.distance>0&&Number.isFinite(minFamily)?minFamily/runner.distance:0;
    const familyMaps=familyDiscriminativeWeights(library);
    const labelMaps=labelDiscriminativeWeights(library);
    const blend=Number.isFinite(options.blend)?Math.max(0,Math.min(1,options.blend)):.84;
    const labelBlend=Number.isFinite(options.labelBlend)?Math.max(0,Math.min(1,options.labelBlend)):.72;
    const templateBlend=Number.isFinite(options.templateBlend)?Math.max(0,Math.min(1,options.templateBlend)):.38;
    const shapeBlend=Number.isFinite(options.shapeBlend)?Math.max(0,Math.min(1,options.shapeBlend)):.60;
    const priorWeight=Number.isFinite(options.priorWeight)?Math.max(0,options.priorWeight):.26;
    const maxPenalty=Number.isFinite(options.maxPenalty)?Math.max(0,options.maxPenalty):.016;
    const out=[];
    for(const [label,templates] of Object.entries(library)){
      if(!Array.isArray(templates)||!templates.length)continue;
      // v63: arithmetic pixel averages blur slightly shifted glyphs. Use the
      // class medoid (a real captured template) as the representative, then
      // require support from the nearest 2-3 templates as a separate signal.
      const representative=medoidFeature(templates);if(!representative)continue;
      const family=tileFamily(label);
      const globalDistance=featureDistance(feature,representative);
      if(!Number.isFinite(globalDistance))continue;
      const familyWeightedDistance=weightedDirectImageDistance(feature,representative,familyMaps[family]||[]);
      const labelWeightedDistance=weightedDirectImageDistance(feature,representative,labelMaps[label]||familyMaps[family]||[]);
      if(!Number.isFinite(familyWeightedDistance)||!Number.isFinite(labelWeightedDistance))continue;
      const discriminativeDistance=labelWeightedDistance*labelBlend+familyWeightedDistance*(1-labelBlend);
      const f=familyMap.get(family);
      const familyDistance=Number.isFinite(f?.distance)?f.distance:minFamily;
      const rawPenalty=Number.isFinite(minFamily)&&Number.isFinite(familyDistance)?Math.max(0,familyDistance-minFamily)*priorWeight:0;
      const familyPenalty=Math.min(maxPenalty,rawPenalty);
      const representativeScore=discriminativeDistance*blend+globalDistance*(1-blend)+familyPenalty;
      const consensusDistance=templateConsensusDistance(feature,templates);
      const directScore=Number.isFinite(consensusDistance)
        ?representativeScore*(1-templateBlend)+consensusDistance*templateBlend
        :representativeScore;
      const structuralRepresentativeDistance=structuralDistance(feature,representative);
      const structuralConsensusDistance=templateStructuralConsensusDistance(feature,templates);
      const structuralScore=Number.isFinite(structuralConsensusDistance)
        ?structuralRepresentativeDistance*.56+structuralConsensusDistance*.44
        :structuralRepresentativeDistance;
      const distance=Number.isFinite(structuralScore)
        ?directScore*(1-shapeBlend)+structuralScore*shapeBlend
        :directScore;
      const raw=templates.map(t=>featureDistance(feature,t)).filter(Number.isFinite).sort((a,b)=>a-b);
      out.push({
        label,distance,bestDistance:raw[0]??globalDistance,sampleCount:templates.length,prototype:false,representative:'medoid',
        representativeDistance:globalDistance,templateConsensusDistance:consensusDistance,representativeScore,directScore,
        structuralRepresentativeDistance,structuralConsensusDistance,structuralScore,
        globalDistance,discriminativeDistance,labelWeightedDistance,familyWeightedDistance,
        templateSpread:templateSpread(templates,representative),
        family,familyDistance,familyPenalty,
        bestFamily:families[0]?.label||'',familyRunnerUpDistance:runner?.distance??Infinity,
        familyGap,familyRatio,
        familyRanked:families.slice(0,4).map(v=>({family:v.label,distance:v.distance}))
      });
    }
    const sorted=out.sort((a,b)=>a.distance-b.distance);
    for(const x of sorted){
      const sameRunner=sorted.find(y=>y.label!==x.label&&y.family===x.family);
      x.sameFamilyRunnerDistance=sameRunner?.distance??Infinity;
      x.sameFamilyGap=sameRunner&&Number.isFinite(sameRunner.distance)?sameRunner.distance-x.distance:Infinity;
      x.sameFamilyRatio=sameRunner&&sameRunner.distance>0?x.distance/sameRunner.distance:0;
    }
    return sorted;
  }

  function medianFinite(values){
    const a=(values||[]).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return Infinity;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }

  function combineViewRankings(viewRankings){
    const views=(viewRankings||[]).filter(v=>Array.isArray(v)&&v.length);
    if(!views.length)return [];
    if(views.length===1)return views[0].map(x=>({...x,viewTopVotes:1,viewCount:1,viewDistanceRange:0}));
    const labels=[...new Set(views.flatMap(v=>v.map(x=>x.label).filter(Boolean)))];
    const topVotes={};
    for(const v of views){
      const label=v[0]?.label;
      if(label)topVotes[label]=(topVotes[label]||0)+1;
    }
    const numericKeys=[
      'bestDistance','representativeDistance','templateConsensusDistance','representativeScore','directScore',
      'structuralRepresentativeDistance','structuralConsensusDistance','structuralScore',
      'globalDistance','discriminativeDistance','labelWeightedDistance','familyWeightedDistance',
      'templateSpread','familyDistance','familyPenalty','familyRunnerUpDistance','familyGap','familyRatio'
    ];
    const combined=[];
    for(const label of labels){
      const entries=views.map(v=>v.find(x=>x.label===label)).filter(Boolean);
      if(!entries.length)continue;
      const distances=entries.map(x=>x.distance).filter(Number.isFinite).sort((a,b)=>a-b);
      if(!distances.length)continue;
      const mid=medianFinite(distances);
      const range=distances[distances.length-1]-distances[0];
      const base=entries.slice().sort((a,b)=>Math.abs((a.distance??mid)-mid)-Math.abs((b.distance??mid)-mid))[0];
      const out={...base};
      out.distance=mid+Math.min(.018,range*.10);
      for(const key of numericKeys){
        const m=medianFinite(entries.map(x=>x[key]));
        if(Number.isFinite(m))out[key]=m;
      }
      out.viewTopVotes=topVotes[label]||0;
      out.viewCount=views.length;
      out.viewDistanceMedian=mid;
      out.viewDistanceRange=range;
      combined.push(out);
    }
    combined.sort((a,b)=>a.distance-b.distance);
    for(const x of combined){
      const sameRunner=combined.find(y=>y.label!==x.label&&y.family===x.family);
      x.sameFamilyRunnerDistance=sameRunner?.distance??Infinity;
      x.sameFamilyGap=sameRunner&&Number.isFinite(sameRunner.distance)?sameRunner.distance-x.distance:Infinity;
      x.sameFamilyRatio=sameRunner&&sameRunner.distance>0?x.distance/sameRunner.distance:0;
    }
    return combined;
  }

  function rankLabelsSoftHierarchical(feature,library,options={}){
    if(!feature||!library||typeof library!=='object')return [];
    const labels=rankLabelsBalanced(feature,library);
    const families=rankFamiliesBalanced(feature,library);
    if(!labels.length||!families.length)return labels;
    const familyMap=new Map(families.map(f=>[f.label,f]));
    const minFamily=Number(families[0].distance);
    const priorWeight=Number.isFinite(options.priorWeight)?Math.max(0,options.priorWeight):.18;
    const maxPenalty=Number.isFinite(options.maxPenalty)?Math.max(0,options.maxPenalty):.012;
    const runner=families[1];
    const familyGap=runner&&Number.isFinite(runner.distance)?runner.distance-minFamily:Infinity;
    const familyRatio=runner&&runner.distance>0?minFamily/runner.distance:0;
    return labels.map(x=>{
      const family=tileFamily(x.label);
      const f=familyMap.get(family);
      const familyDistance=Number.isFinite(f?.distance)?f.distance:minFamily;
      const familyPenalty=Math.min(maxPenalty,Math.max(0,familyDistance-minFamily)*priorWeight);
      return {
        ...x,
        globalDistance:x.distance,
        distance:x.distance+familyPenalty,
        family,
        familyDistance,
        familyPenalty,
        bestFamily:families[0].label,
        familyRunnerUpDistance:runner?.distance??Infinity,
        familyGap,
        familyRatio,
        familyRanked:families.slice(0,4).map(v=>({family:v.label,distance:v.distance}))
      };
    }).sort((a,b)=>a.distance-b.distance);
  }

  function rankLabels(feature,library){
    const out=[];
    if(!feature||!library||typeof library!=='object')return out;
    for(const [label,templates] of Object.entries(library)){
      if(!Array.isArray(templates)||!templates.length)continue;
      let best=Infinity;
      for(const template of templates){
        best=Math.min(best,featureDistance(feature,template));
      }
      if(Number.isFinite(best))out.push({label,distance:best});
    }
    return out.sort((a,b)=>a.distance-b.distance);
  }
  function classify(feature,library,options={}){
    const threshold=Number.isFinite(options.threshold)?options.threshold:.24;
    const margin=Number.isFinite(options.margin)?options.margin:.035;
    const ranked=rankLabels(feature,library);
    if(!ranked.length||ranked[0].distance>threshold)return null;
    if(ranked[1]&&ranked[1].distance-ranked[0].distance<margin)return null;
    return {...ranked[0],runnerUp:ranked[1]?.distance??Infinity};
  }
  function stableEnough(previous,current,maxShift=.035){
    if(!previous||!current||previous.length!==current.length||![13,14].includes(current.length))return false;
    let shift=0;
    for(let i=0;i<current.length;i++){
      const a=previous[i],b=current[i];
      if(!Number.isFinite(a)||!Number.isFinite(b))return false;
      shift+=Math.abs(a-b);
    }
    return shift/current.length<=maxShift;
  }
  const api=Object.freeze({rmsDistance,shiftedRmsDistance,shiftedGroupedRmsDistance,structuredFeatureDistance,directImageDistance,featureDistance,prototypeFeature,pooledChannel,structuralDistance,templateStructuralConsensusDistance,medoidFeature,templateConsensusDistance,medianFinite,combineViewRankings,rankLabels,rankLabelsRobust,rankLabelsBalanced,tileFamily,buildFamilyLibrary,rankFamiliesBalanced,rankLabelsHierarchical,rankLabelsSoftHierarchical,familyDiscriminativeWeights,labelDiscriminativeWeights,templateSpread,weightedDirectImageDistance,rankLabelsFamilyDiscriminative,classify,stableEnough});
  root.M7RecognitionCoreV33=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
