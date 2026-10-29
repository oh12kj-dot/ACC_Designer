import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {assertNewCutoutInput} from './prepare-new-input-cutout.mjs';
export const closedLoopVersion='nominal-new-input-closed-loop-grabcut-v4';
export const runtimePath='.ai/evidence/new-input-grabcut-runtime-v4.json';
const hash=b=>createHash('sha256').update(b).digest('hex'),fail=m=>{throw Error('CLOSED_LOOP_'+m);};
const reviewed=r=>r?.reviewed===true&&r.reviewedBy?.trim()&&Number.isFinite(Date.parse(r.reviewedAt));
export function assertClosedLoopReview(r,width,height){
  if(!reviewed(r)||r.enclosedHoles!==true||!['opaque-coloured-high-contrast','opaque-white-clear-contour'].includes(r.material)||r.material==='opaque-white-clear-contour'&&(!r.boundaryReviewed||!r.reason?.trim())||!r.exteriorBackgroundReviewed||!r.backgroundReviewed||!r.backgroundReason?.trim()||!r.bridgesReviewed||!r.bridgeReason?.trim()||!Number.isSafeInteger(r.expectedOpenings)||r.expectedOpenings<1||r.expectedOpenings>4||!Array.isArray(r.openings)||r.openings.length!==r.expectedOpenings||!Array.isArray(r.background)||r.background.length<1||r.background.length>16||!Array.isArray(r.bridgeWitnesses)||r.bridgeWitnesses.length<1||r.bridgeWitnesses.length>16)fail('REVIEW');
  const polygons=[r.outer,r.core,...r.background,...r.bridgeWitnesses];
  for(let i=0;i<r.openings.length;i++){
    const o=r.openings[i];if(!reviewed(o)||o.openingIndex!==i||!o.backgroundActuallyVisible||!o.boundaryReviewed||!o.reason?.trim())fail('OPENING_REVIEW');
    polygons.push(o.backgroundSeed,o.reviewedOpeningEnvelope);
  }
  if(polygons.some(p=>!Array.isArray(p)||p.length<3||p.length>16||p.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isSafeInteger(n))||v[0]<=1||v[1]<=1||v[0]>=width-2||v[1]>=height-2)))fail('POLYGON');
}

export function assertRenderedTopology(rgba,width,height,expected){
  if(!Buffer.isBuffer(rgba)||rgba.length!==width*height*4)fail('RENDERED_BYTES');
  const fg=new Uint8Array(width*height);for(let i=0;i<fg.length;i++)fg[i]=+(rgba[i*4+3]>=128);
  const seen=new Uint8Array(fg.length),queue=new Int32Array(fg.length);let components=0,holes=0;
  for(let i=0;i<fg.length;i++){
    if(seen[i])continue;const colour=fg[i];let start=0,end=1,touches=false;queue[0]=i;seen[i]=1;
    while(start<end){const p=queue[start++],x=p%width,y=Math.floor(p/width);if(x===0||y===0||x===width-1||y===height-1)touches=true;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(dx===0&&dy===0||!colour&&Math.abs(dx)+Math.abs(dy)!==1)continue;
        const nx=x+dx,ny=y+dy,n=ny*width+nx;if(nx<0||ny<0||nx>=width||ny>=height||seen[n]||fg[n]!==colour)continue;seen[n]=1;queue[end++]=n;
      }
    }
    if(colour)components++;else if(!touches)holes++;
  }
  if(components!==1||holes!==expected)fail('RENDERED_TOPOLOGY');
  return {components,holes,alphaThreshold:128};
}

export async function seededClosedLoopNative(rgba,width,height,review){
  assertClosedLoopReview(review,width,height);
  const runtimeBytes=await readFile(runtimePath),runtime=JSON.parse(runtimeBytes),script='scripts/new-input-grabcut-closed-loop.py',scriptBytes=await readFile(script),scriptKey=Object.keys(runtime.files).find(k=>k.replaceAll('\\','/').endsWith('/'+script));
  if(!scriptKey||runtime.files[scriptKey]!==hash(scriptBytes))fail('SCRIPT_CHANGED');
  const request={runtime,rgba:rgba.toString('base64'),width,height,outer:review.outer,core:review.core,background:review.background,openings:review.openings,bridgeWitnesses:review.bridgeWitnesses,expectedOpenings:review.expectedOpenings,iterations:5,seed:0,threads:1};
  const run=()=>new Promise((resolve,reject)=>{
    const child=spawn(runtime.executable,[script],{windowsHide:true,stdio:['pipe','pipe','pipe']}),chunks=[],errors=[];let length=0,settled=false;
    const finish=(e,r)=>{if(settled)return;settled=true;clearTimeout(timer);e?reject(e):resolve(r);};
    const timer=setTimeout(()=>{child.kill();finish(Error('CLOSED_LOOP_TIMEOUT'));},60000);
    child.on('error',e=>finish(e));child.stdout.on('data',b=>{length+=b.length;if(length>24000000){child.kill();finish(Error('CLOSED_LOOP_OUTPUT_LIMIT'));}else chunks.push(b);});child.stderr.on('data',b=>errors.push(b));
    child.on('close',code=>{if(code!==0)return finish(Error('CLOSED_LOOP_WORKER_'+Buffer.concat(errors).toString().slice(-1200)));try{finish(null,JSON.parse(Buffer.concat(chunks)));}catch(e){finish(e);}});
    child.stdin.on('error',e=>finish(e));child.stdin.end(JSON.stringify(request));
  });
  const result=await run(),second=await run();if(JSON.stringify(result)!==JSON.stringify(second))fail('NONDETERMINISTIC');
  const alpha=Buffer.from(result.alpha,'base64');if(alpha.length!==width*height||hash(alpha)!==result.alphaSha256||result.inputRgbaSha256!==hash(rgba)||result.components!==1||result.holes!==review.expectedOpenings||result.openings?.length!==review.expectedOpenings||alpha.some(n=>n!==0&&n!==255))fail('MASK_RESULT');
  const native=Buffer.from(rgba);for(let i=0;i<alpha.length;i++){native[i*4+3]=alpha[i];for(let k=0;k<3;k++)if(native[i*4+k]!==rgba[i*4+k])fail('RGB_CHANGED');}
  assertRenderedTopology(native,width,height,review.expectedOpenings);
  return {data:native,alphaSha256:hash(alpha),runtimeBindingSha256:hash(runtimeBytes),foregroundPixels:result.foregroundPixels,openings:result.openings,rgbUnchanged:true};
}

export async function prepareNominalClosedLoop(original,spec){
  assertNewCutoutInput(spec,spec.eligibility);
  const r=spec.sourceCrop,c=r.crop,review=spec.foregroundReview,m=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata(),mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format];
  if(!mime||m.pages>1||hash(original)!==r.sha256||m.width!==r.sourceWidth||m.height!==r.sourceHeight||!reviewed(r)||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<8||c.height<8||c.left+c.width>m.width||c.top+c.height>m.height)fail('SOURCE');
  if(spec.algorithmVersion!==closedLoopVersion||spec.runtimeBindingSha256!==hash(await readFile(runtimePath))||spec.photoRotationDegrees!==0||![spec.widthMm,spec.heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-6)||Math.max(spec.widthMm/spec.heightMm,spec.heightMm/spec.widthMm)>4||review.originalSha256!==r.sha256||JSON.stringify(review.crop)!==JSON.stringify(c))fail('SPEC');
  const rgba=await sharp(original).extract(c).ensureAlpha().raw().toBuffer(),cut=await seededClosedLoopNative(rgba,c.width,c.height,review);
  let minX=c.width,minY=c.height,maxX=-1,maxY=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(cut.data[(y*c.width+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(minX<1||minY<1||maxX>=c.width-1||maxY>=c.height-1)fail('BOUNDS');
  const native=await sharp(cut.data,{raw:{width:c.width,height:c.height,channels:4}}).png().toBuffer(),gcd=(a,b)=>b?gcd(b,a%b):a,ticks=[spec.widthMm,spec.heightMm].map(n=>Math.round(n*40)),g=gcd(...ticks),base=ticks.map(n=>n/g),factor=Math.max(1,Math.floor(256/Math.max(...base))),[width,height]=base.map(n=>n*factor);
  const high=await sharp(native).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).resize(width,height,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer(),thumbnail=await sharp(high).resize(128,128,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  for(const [b,w,h] of [[high,width,height],[thumbnail,128,128]])assertRenderedTopology(await sharp(b).ensureAlpha().raw().toBuffer(),w,h,review.expectedOpenings);
  return {originalMime:mime,native,high,medium:high,thumbnail,width,height,mmPerPx:spec.widthMm/width,transform:{version:closedLoopVersion,runtimeBindingSha256:cut.runtimeBindingSha256,sourceCrop:r,foregroundReview:review,nativeCutoutSha256:hash(native),nativeAlphaSha256:cut.alphaSha256,nativeRgbUnchanged:true,imageAlphaOpenings:review.expectedOpenings,openingTopology:cut.openings,iterations:5,seed:0,threads:1,resizeFit:'contain-rgb-interpolation-after-native-alpha-only',imageScaleVerified:false,variantAppearanceVerified:false,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,connectionReady:false}};
}
