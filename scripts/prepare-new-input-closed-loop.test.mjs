import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {closedLoopVersion,runtimePath,assertClosedLoopReview,seededClosedLoopNative,prepareNominalClosedLoop,assertRenderedTopology} from './prepare-new-input-closed-loop.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const poly=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
const meta={reviewed:true,reviewedBy:'Synthetic two-opening opaque fixture only',reviewedAt:'2026-10-29T01:49:00Z'};
function review(){return {...meta,material:'opaque-coloured-high-contrast',enclosedHoles:true,expectedOpenings:2,exteriorBackgroundReviewed:true,backgroundReviewed:true,backgroundReason:'Synthetic white exterior',bridgesReviewed:true,bridgeReason:'Synthetic red top and bottom bridges',outer:poly(6,6,90,90),core:poly(45,35,55,50),background:[poly(8,8,12,12)],bridgeWitnesses:[poly(28,25,72,29),poly(28,62,72,66)],openings:[{...meta,openingIndex:0,backgroundActuallyVisible:true,boundaryReviewed:true,reason:'Known synthetic white left opening',backgroundSeed:poly(32,38,38,50),reviewedOpeningEnvelope:poly(28,33,42,57)},{...meta,openingIndex:1,backgroundActuallyVisible:true,boundaryReviewed:true,reason:'Known synthetic white right opening',backgroundSeed:poly(62,38,68,50),reviewedOpeningEnvelope:poly(58,33,72,57)}]};}
function pixels(extra=false){const b=Buffer.alloc(96*96*4,255);for(let y=20;y<=80;y++)for(let x=20;x<=80;x++){if(y>=35&&y<=55&&(x>=30&&x<=40||x>=60&&x<=70)||extra&&x>=73&&x<=76&&y>=70&&y<=73)continue;const p=(y*96+x)*4;b[p]=160;b[p+1]=20;b[p+2]=35;}return b;}
async function fixture(){const original=await sharp(pixels(),{raw:{width:96,height:96,channels:4}}).png().toBuffer(),sha=hash(original),crop={left:0,top:0,width:96,height:96},r={...review(),originalSha256:sha,crop};return {original,spec:{algorithmVersion:closedLoopVersion,runtimeBindingSha256:hash(await readFile(runtimePath)),widthMm:20,heightMm:20,photoRotationDegrees:0,sourceCrop:{...meta,url:'fixture://two-opening',sha256:sha,sourceWidth:96,sourceHeight:96,crop,coordinateConvention:'unrotated-decoded-raster-integer-pixels'},foregroundReview:r,eligibility:{...meta,originalSha256:sha,primarySha256:hash('different primary'),registered:false,previouslyProcessed:false,held:false,ownAssociationVerified:true,failedOriginalHashes:[],failedCropSignatures:[],failedInputSignatures:[]}}};}

test('two actual seeded openings, deterministic worker and unchanged native RGB',async()=>{
  const rgba=pixels(),r=await seededClosedLoopNative(rgba,96,96,review());
  assert.equal(r.openings.length,2);assert.equal(r.data[(45*96+35)*4+3],0);assert.equal(r.data[(40*96+50)*4+3],255);
  for(let i=0;i<rgba.length;i++)if(i%4!==3)assert.equal(r.data[i],rgba[i]);
});
test('native/high/medium/thumbnail retain two openings and unverified geometry flags',async()=>{
  const f=await fixture(),p=await prepareNominalClosedLoop(f.original,f.spec);assert.ok(p.medium.equals(p.high));assert.equal(p.transform.imageAlphaOpenings,2);assert.equal(p.transform.connectionReady,false);assert.equal(p.transform.nativeRgbUnchanged,true);
  for(const [bytes,w,h] of [[p.native,96,96],[p.high,p.width,p.height],[p.thumbnail,128,128]])assert.equal(assertRenderedTopology(await sharp(bytes).ensureAlpha().raw().toBuffer(),w,h,2).holes,2);
});
test('unreviewed openings, unknown count, translucent material or absent bridge review rejected',()=>{
  for(const mutate of [r=>r.openings[0].reviewed=false,r=>r.expectedOpenings=0,r=>r.expectedOpenings=5,r=>r.material='translucent',r=>r.bridgesReviewed=false,r=>r.openings[0].backgroundSeed[0][0]=0]){const r=review();mutate(r);assert.throws(()=>assertClosedLoopReview(r,96,96),/CLOSED_LOOP_/);}
});
test('opening seed on foreground and unreviewed extra punchout fail closed',async()=>{
  const r=review();r.openings[0].backgroundSeed=r.core;await assert.rejects(seededClosedLoopNative(pixels(),96,96,r),/OPENING_SEED_CONFLICT/);
  await assert.rejects(seededClosedLoopNative(pixels(true),96,96,review()),/OPENING_COUNT/);
});
test('new route cannot reopen known failed input or primary by changing its method',async()=>{
  const f=await fixture();f.spec.eligibility.failedOriginalHashes=[f.spec.sourceCrop.sha256];await assert.rejects(prepareNominalClosedLoop(f.original,f.spec),/KNOWN_FAILED_INPUT/);
  f.spec.eligibility.failedOriginalHashes=[];f.spec.eligibility.primarySha256=f.spec.sourceCrop.sha256;await assert.rejects(prepareNominalClosedLoop(f.original,f.spec),/ELIGIBILITY/);
});
