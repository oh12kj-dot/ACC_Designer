import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {nominalExternalAlpha,externalAlphaImageKey,prepareExternalAlpha,assertExternalAlphaApproval,externalAlphaRecipe} from './prepare-external-alpha.mjs';
import {prepareCachedExternalAlpha} from './prepared-external-alpha-cache.mjs';
const fixtures=JSON.parse(await readFile(new URL('./fixtures/external-alpha-finite2.json',import.meta.url))),hash=x=>createHash('sha256').update(x).digest('hex');
// Validation fixtures only. These regions are NOT real-image review/adoption.
function review(b){const {left:x,top:y,width:w,height:h}=b.sourceCrop.crop;return {version:'reviewed-external-alpha-exclusion-v1',reviewed:true,reviewedBy:'unit fixture only',reviewedAt:'2026-10-25T08:30:00Z',reason:'synthetic validation fixture, not photo approval',sourceCropSha256:hash(JSON.stringify(b.sourceCrop)),protectedRoi:[[x+20,y+20],[x+w-5,y+20],[x+w-5,y+h-5],[x+20,y+h-5]],polygons:[[[x,y],[x+4,y],[x+4,y+4],[x,y+4]]]};}
const make=f=>nominalExternalAlpha(f.draft,f.base,f.capture,review(f.base));
test('exact two source/object/photo/base-review identities accepted; new recipe/key is distinct',()=>{
 for(const f of fixtures){const s=make(f);assert.equal(s.recipe,externalAlphaRecipe);assert.equal(s.sourceCrop.reviewedAt,f.base.sourceCrop.reviewedAt);assert.ok(externalAlphaImageKey(f.capture.sha256,s).includes('nominal-external-alpha-photo-v1'));}
});
test('mutated source, scope, association, crop, BOX and old review identity all reject',()=>{
 const f=fixtures[0],attempt=(d=f.draft,b=f.base,c=f.capture)=>nominalExternalAlpha(d,b,c,review(f.base));
 for(const d of [{...f.draft,id:'kiwa:other:other'},{...f.draft,name:f.draft.name+' '},{...f.draft,imageUrls:['https://example.com/not-own']}])assert.throws(()=>attempt(d));
 for(const b of [{...f.base,widthMm:2},{...f.base,sourceCrop:{...f.base.sourceCrop,crop:{...f.base.sourceCrop.crop,left:338}}},{...f.base,sourceCrop:{...f.base.sourceCrop,reviewedAt:'2026-10-25T00:00:00Z'}}])assert.throws(()=>attempt(f.draft,b));
 for(const c of [{...f.capture,sha256:'0'.repeat(64)},{...f.capture,productIds:[]},{...f.capture,pixelWidth:800},{...f.capture,url:'https://example.com/not-own'}])assert.throws(()=>attempt(f.draft,f.base,c));
 assert.throws(()=>nominalExternalAlpha(f.draft,f.base,f.capture,undefined));
 assert.throws(()=>nominalExternalAlpha(f.draft,f.base,f.capture,review(f.base),{registeredRecipe:'kiwa-own-photo-category-box-v1'}));
 // Same-recipe revalidation is for immutable readback, never image migration.
 assert.deepEqual(nominalExternalAlpha(f.draft,f.base,f.capture,review(f.base),{registeredRecipe:externalAlphaRecipe}),make(f));
});
test('mask review and processed approval are separate exact-key/hash gates',()=>{
 const f=fixtures[0],s=make(f),high=Buffer.from('test high bytes'),approval={reviewed:true,reviewedBy:'unit fixture',reviewedAt:'2026-10-25T08:31:00Z',keySha256:hash(externalAlphaImageKey(f.capture.sha256,s)),highSha256:hash(high)};
 assertExternalAlphaApproval(approval,s,high);assertExternalAlphaApproval(approval,s);
 for(const a of [undefined,{...approval,keySha256:'0'.repeat(64)},{...approval,highSha256:'0'.repeat(64)},{...approval,reviewed:false}])assert.throws(()=>assertExternalAlphaApproval(a,s,high));
 assert.throws(()=>externalAlphaImageKey('0'.repeat(64),s));
 assert.throws(()=>externalAlphaImageKey(f.capture.sha256,{...s,externalAlphaReview:{...s.externalAlphaReview,reviewed:false}}));
});
test('wrong original bytes fail before actual image processing',async()=>{
 await assert.rejects(prepareExternalAlpha(Buffer.from('not the source image'),make(fixtures[0])));
});
test('review provenance is strictly source crop then mask then processed image',()=>{
 const f=fixtures[0],r=review(f.base),s=make(f),high=Buffer.from('high'),a={reviewed:true,reviewedBy:'unit fixture',reviewedAt:r.reviewedAt,keySha256:hash(externalAlphaImageKey(f.capture.sha256,s)),highSha256:hash(high)};
 for(const t of [f.base.sourceCrop.reviewedAt,'2020-01-01T00:00:00.000Z'])assert.throws(()=>nominalExternalAlpha(f.draft,f.base,f.capture,{...r,reviewedAt:t}));
 for(const t of [f.base.sourceCrop.reviewedAt,r.reviewedAt,'2020-01-01T00:00:00.000Z'])assert.throws(()=>assertExternalAlphaApproval({...a,reviewedAt:t},s,high));
});
test('dedicated cache keeps full review identity, reuses bytes, rejects corruption and wrong original',async()=>{
 const f=fixtures[0],s=make(f),dir=await mkdtemp(join(tmpdir(),'external-alpha-cache-'));
 try{
  const original=await readFile('.local/calibration/gallery/bytes/'+f.capture.sha256);let calls=0;
  const prepare=async()=>{calls++;return {high:Buffer.from('high'),medium:Buffer.from('medium'),thumbnail:Buffer.from('thumb'),width:256,height:256,mmPerPx:1.5/256,originalMime:'image/jpeg',transform:{version:'fixture'}};};
  const opts={cacheRoot:dir,prepare},a=await prepareCachedExternalAlpha(original,s,opts),b=await prepareCachedExternalAlpha(original,s,opts);assert.equal(calls,1);assert.deepEqual(a,b);
  const changed={...s,externalAlphaReview:{...s.externalAlphaReview,reviewedAt:'2026-10-25T08:32:00Z'}};await prepareCachedExternalAlpha(original,changed,opts);assert.equal(calls,2);
  await assert.rejects(prepareCachedExternalAlpha(Buffer.from('wrong'),s,opts),/SOURCE_MISMATCH/);
  for(const file of await readdir(dir))await writeFile(join(dir,file),'{}');
  await assert.rejects(prepareCachedExternalAlpha(original,s,opts),/CACHE_INVALID/);assert.equal(calls,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
