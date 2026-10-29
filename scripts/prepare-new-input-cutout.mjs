import sharp from 'sharp';
import {createHash} from 'node:crypto';
export const newCutoutVersion='nominal-new-input-neutral-background-v1';
export const newCutoutParameters=Object.freeze({tileSize:16,minSamples:24,maxBackgroundSpread:24,maxTileVariation:48,minBackgroundChannel:190,maxBackgroundChroma:24,backgroundDistance:140,foregroundDistance:200,protectedContourBandPx:2});
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error('NEW_CUTOUT_'+m);};
const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];
const inPoly=(x,y,p)=>{let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const nearContour=(x,y,p,band)=>p.some((a,i)=>{const b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],n=dx*dx+dy*dy,t=n?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/n)):0;return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)<=band;});
function polygon(p,w,h){if(!Array.isArray(p)||p.length<3||p.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isSafeInteger(n))||v[0]<=1||v[1]<=1||v[0]>=w-2||v[1]>=h-2))fail('ROI');}
export function newCutoutSignature(sha,crop,widthMm,heightMm){return hash(JSON.stringify({sha256:sha,crop,rotation:0,widthMm,heightMm}));}
export function assertNewCutoutInput(spec,eligibility){
 if(!eligibility?.reviewed||eligibility.originalSha256!==spec?.sourceCrop?.sha256||eligibility.primarySha256===eligibility.originalSha256||eligibility.previouslyProcessed||eligibility.registered||eligibility.held||!eligibility.ownAssociationVerified||!eligibility.reviewedBy||!Number.isFinite(Date.parse(eligibility.reviewedAt)))fail('ELIGIBILITY');
 const signature=newCutoutSignature(spec.sourceCrop.sha256,spec.sourceCrop.crop,spec.widthMm,spec.heightMm),cropSignature=hash(JSON.stringify({sha256:spec.sourceCrop.sha256,crop:spec.sourceCrop.crop,rotation:0}));
 if(!Array.isArray(eligibility.failedOriginalHashes)||!Array.isArray(eligibility.failedCropSignatures)||!Array.isArray(eligibility.failedInputSignatures)||eligibility.failedOriginalHashes.includes(spec.sourceCrop.sha256)||eligibility.failedCropSignatures.includes(cropSignature)||eligibility.failedInputSignatures.includes(signature))fail('KNOWN_FAILED_INPUT');
 return signature;
}
export async function cutoutNativeRgba(input,{width,height,outer,core,contour,material}){
 if(material!=='opaque-coloured-high-contrast'||input.length!==width*height*4)fail('MATERIAL');
 polygon(outer,width,height);polygon(core,width,height);polygon(contour,width,height);
 const out=Buffer.from(input),protectedCore=new Uint8Array(width*height),roi=new Uint8Array(width*height),samples=[[],[],[]];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*width+x,a=input[p*4+3];if(a!==0&&a!==255)fail('TRANSLUCENT_INPUT');roi[p]=+inPoly(x+.5,y+.5,outer);protectedCore[p]=+inPoly(x+.5,y+.5,core);if(protectedCore[p]&&!roi[p])fail('CORE_OUTSIDE_ROI');}
 const tiles=[],P=newCutoutParameters;
 for(let ty=0;ty<height;ty+=P.tileSize)for(let tx=0;tx<width;tx+=P.tileSize){const tile=[[],[],[]];for(let y=ty;y<Math.min(height,ty+P.tileSize);y++)for(let x=tx;x<Math.min(width,tx+P.tileSize);x++){const p=y*width+x,i=p*4;if(roi[p]||!input[i+3])continue;for(let k=0;k<3;k++)tile[k].push(input[i+k]);}if(tile[0].length<P.minSamples)continue;const m=tile.map(v=>median(v)),spread=Math.max(...tile.map(v=>v[Math.floor(v.length*.9)]-v[Math.floor(v.length*.1)]));if(spread>P.maxBackgroundSpread||Math.min(...m)<P.minBackgroundChannel||Math.max(...m)-Math.min(...m)>P.maxBackgroundChroma)continue;tiles.push(m);for(let k=0;k<3;k++)samples[k].push(m[k]);}
 if(tiles.length<4||samples[0].length===0)fail('BACKGROUND_SAMPLES');
 const bg=samples.map(v=>median(v));if(tiles.some(t=>Math.max(...t.map((n,k)=>Math.abs(n-bg[k])))>P.maxTileVariation))fail('BACKGROUND_VARIATION');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(nearContour(x+.5,y+.5,contour,P.protectedContourBandPx)){const p=y*width+x,i=p*4;if(!roi[p]||input[i+3]!==255||Math.hypot(...bg.map((v,k)=>input[i+k]-v))<P.foregroundDistance)fail('CONTOUR_AMBIGUOUS');protectedCore[p]=1;}
 let coreCount=0,contrastingCore=0;for(let p=0;p<protectedCore.length;p++)if(protectedCore[p]){coreCount++;const i=p*4;if(input[i+3]!==255)fail('CORE_ALPHA');if(Math.hypot(...bg.map((v,k)=>input[i+k]-v))>=P.foregroundDistance)contrastingCore++;}if(coreCount<9||contrastingCore/coreCount<.5)fail('FOREGROUND_AMBIGUOUS');
 const border=[];for(let x=0;x<width;x++)border.push(x,(height-1)*width+x);for(let y=1;y<height-1;y++)border.push(y*width,y*width+width-1);
 for(const p of border){const i=p*4;if(input[i+3]&&Math.hypot(...bg.map((v,k)=>input[i+k]-v))>P.backgroundDistance)fail('BORDER_CONTAMINATED');}
 const visited=new Uint8Array(width*height),q=new Int32Array(width*height);let head=0,tail=0;
 const visit=p=>{if(visited[p]||protectedCore[p])return;visited[p]=1;const i=p*4,d=Math.hypot(...bg.map((v,k)=>input[i+k]-v));if(input[i+3]===0||d<=P.backgroundDistance){out[i+3]=0;q[tail++]=p;}else if(roi[p]&&d<P.foregroundDistance){out[i+3]=Math.round(255*(d-P.backgroundDistance)/(P.foregroundDistance-P.backgroundDistance));q[tail++]=p;}};
 for(const p of border)visit(p);while(head<tail){const p=q[head++],x=p%width,y=Math.floor(p/width);if(x)visit(p-1);if(x+1<width)visit(p+1);if(y)visit(p-width);if(y+1<height)visit(p+width);}
 let foreground=0;for(let p=0;p<width*height;p++){const i=p*4;for(let k=0;k<3;k++)if(out[i+k]!==input[i+k])fail('RGB_CHANGED');if(protectedCore[p]&&out[i+3]!==255)fail('CORE_CHANGED');if(out[i+3]){if(!roi[p])fail('UNREVIEWED_FOREGROUND');foreground++;}}
 if(!foreground||foreground===width*height)fail('NO_SEPARATION');
 return{data:out,backgroundRgb:bg,foregroundPixels:foreground,rgbUnchanged:true};
}
export async function prepareNominalNewInputCutout(original,spec){
 assertNewCutoutInput(spec,spec.eligibility);
 const r=spec.sourceCrop,c=r.crop,m=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata(),mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format];
 if(!mime||m.pages>1||hash(original)!==r.sha256||m.width!==r.sourceWidth||m.height!==r.sourceHeight||!r.reviewed||!r.reviewedBy||!Number.isFinite(Date.parse(r.reviewedAt))||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<8||c.height<8||c.left+c.width>m.width||c.top+c.height>m.height)fail('SOURCE');
 if(spec.photoRotationDegrees!==0||spec.algorithmVersion!==newCutoutVersion||JSON.stringify(spec.parameters)!==JSON.stringify(newCutoutParameters)||![spec.widthMm,spec.heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-6)||Math.max(spec.widthMm/spec.heightMm,spec.heightMm/spec.widthMm)>4)fail('SPEC');
 const roi=spec.foregroundReview;if(!roi?.reviewed||!roi.reviewedBy||!Number.isFinite(Date.parse(roi.reviewedAt))||roi.originalSha256!==r.sha256||JSON.stringify(roi.crop)!==JSON.stringify(c)||roi.enclosedHoles!==false)fail('FOREGROUND_REVIEW');
 const {data}=await sharp(original).extract(c).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cut=await cutoutNativeRgba(data,{width:c.width,height:c.height,outer:roi.outer,core:roi.core,contour:roi.contour,material:roi.material});
 const native=await sharp(cut.data,{raw:{width:c.width,height:c.height,channels:4}}).png().toBuffer();
 const alpha=await sharp(native).extractChannel(3).raw().toBuffer();let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(alpha[y*c.width+x]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 if(minX<=0||minY<=0||maxX>=c.width-1||maxY>=c.height-1)fail('FOREGROUND_TOUCHES_CROP');
 const gcd=(a,b)=>b?gcd(b,a%b):a,ticks=[spec.widthMm,spec.heightMm].map(n=>Math.round(n*40)),g=gcd(...ticks),base=ticks.map(n=>n/g),factor=Math.max(1,Math.floor(256/Math.max(...base))),[width,height]=base.map(n=>n*factor);
 const high=await sharp(native).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).resize(width,height,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer(),thumbnail=await sharp(high).resize(128,128,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
 return{originalMime:mime,high,medium:high,thumbnail,width,height,mmPerPx:spec.widthMm/width,transform:{version:newCutoutVersion,parameters:newCutoutParameters,sourceCrop:r,foregroundReview:roi,nativeCutoutSha256:hash(native),nativeRgbUnchanged:true,resample:'contain-rgb-interpolation-after-native-alpha-only',backgroundRgb:cut.backgroundRgb,imageScaleVerified:false,variantAppearanceVerified:false,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,connectionReady:false}};
}
