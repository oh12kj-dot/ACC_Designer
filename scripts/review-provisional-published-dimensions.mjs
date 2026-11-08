import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadTeardropRestrictions} from './teardrop-registration-guards.mjs';
import {publishedMeasurements} from './lib/published-dimension-semantics.mjs';

const base = '.local/setup/precision-review-20261103';
const dir = base + '/published-semantics';
await mkdir(dir, {recursive:true});
const sha = x => createHash('sha256').update(x).digest('hex');
const atomic = async (p,x) => {await writeFile(p+'.tmp',JSON.stringify(x)); await rename(p+'.tmp',p);};
const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x==='object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])) : x;
const bytes = await readFile('.local/parts/parts.json');
const manifest = JSON.parse(await readFile('.local/calibration/provisional/promotions.json'));
const ledger = JSON.parse(await readFile(base+'/ledger.json'));
const index = JSON.parse(await readFile('.local/calibration/mapping/index.json'));
assert.equal(sha(bytes),manifest.registrySha256);
assert.equal(ledger.registrySha256,manifest.registrySha256);
assert.equal(index.summary.registrySha256,manifest.registrySha256);
const drafts = new Map(JSON.parse(bytes).parts.map(d=>[d.id,d]));
const ix = new Map(index.entries.map(e=>[e.id,e]));
const promoted = new Map(manifest.promoted.map(r=>[r.draftId,r]));
const guard = await loadTeardropRestrictions('.local/calibration/nominal');
const candidates = ledger.rows.filter(r=>r.evidence && r.evidence.kind!=='official-shared-diagram-dimensions-only');
const held = candidates.filter(r=>guard.blocked.has(r.draftId));
const rows = candidates.filter(r=>!guard.blocked.has(r.draftId));
const captures = new Map();
for (const r of rows) {
  const d=drafts.get(r.draftId), e=r.evidence, p=promoted.get(r.draftId);
  assert.ok(p); assert.equal(p.partId,r.partId); assert.equal(sha(JSON.stringify(d)),r.sourceObjectSha256);
  assert.deepEqual(e,ix.get(d.id).certificate??ix.get(d.id).dimensionEvidence);
  for(const [a,b] of [['sourceDraftId','id'],['variantId','variantId'],['sku','sku'],['sourceUrl','sourceUrl']]) assert.equal(e[a],d[b]);
  assert.ok(d.imageUrls.includes(e.diagramUrl));
  assert.equal(sha(await readFile('.local/calibration/gallery/bytes/'+e.diagramSha256)),e.diagramSha256);
  const pc=e.productCapture; assert.match(pc.file,/^page-\d+\.json$/);
  if(!captures.has(pc.file)) {const b=await readFile('.local/catalog/evidence/'+pc.file); captures.set(pc.file,{hash:sha(b),products:JSON.parse(b).products});}
  const capture=captures.get(pc.file); assert.equal(capture.hash,pc.sha256);
  const product=capture.products.find(p=>String(p.id)===d.productId);
  const variant=product?.variants.find(v=>String(v.id)===d.variantId);
  assert.ok(variant); assert.equal(variant.sku,d.sku); assert.equal(variant.option1,d.sizeText);
  // The coil diagram's number is inner diameter only because the exact variant says so.
  if(e.kind==='official-coil-inner-label-only') assert.match(d.sizeText,/内径/);
  Object.assign(r,publishedMeasurements(e));
}
const ep='http://127.0.0.1:3000/api/local/workspace';
const boot=await fetch(ep).then(r=>r.json()); assert.equal(boot.workspaceId,manifest.workspaceId);
const call=async body=>{const q=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}); const j=await q.json(); if(!q.ok||j.error)throw Error(JSON.stringify(j)); return j.data;};
const rpc=(name,args)=>call({action:'rpc',name,args,key:randomUUID()});
const select=table=>call({action:'select',query:{table,columns:'*'}});
const live={parts:await select('parts'),assets:await select('part_image_assets'),designs:{}};
for(const d of await select('designs'))live.designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});
const refs=new Set(); const visit=x=>{if(!x||typeof x!=='object')return; for(const[k,v]of Object.entries(x)){if((k==='part_id'||k==='partId')&&typeof v==='string')refs.add(v);else visit(v);}};visit(live.designs);
for(const r of rows)assert.ok(!refs.has(r.partId),'Referenced target requires successor planning');
let before;try{before=JSON.parse(await readFile(dir+'/before.json'));}catch(e){if(e.code!=='ENOENT')throw e;before=live;await atomic(dir+'/before.json',before);}
assert.deepEqual(live.designs,before.designs);
const targetIds=new Set(rows.map(r=>r.partId));
assert.equal(live.parts.length,before.parts.length);
for(const old of before.parts)if(!targetIds.has(old.id))assert.deepEqual(live.parts.find(p=>p.id===old.id),old);
assert.deepEqual(live.assets,before.assets);
let changed=0; const verified=[];
for(const r of rows) {
  const d=drafts.get(r.draftId), e=r.evidence, h=sha(JSON.stringify(e));
  const a=await rpc('get_part_aggregate',{part_id:r.partId});
  assert.equal(a.part.metadata.sourceDraftId,d.id); assert.ok(a.part.metadata.provisionalRegistration?.photoReference);
  assert.equal(a.part.is_archived,false); assert.equal(a.part.image_asset_id,r.assetId);
  const review={version:1,status:'published-source-verified-not-physical-calibration',evidenceSha256:h,evidence:e,measurements:r.measurements,scope:Object.keys(r.partFields),imageAndConnectionsReviewed:false};
  const existing=a.part.metadata.publishedDimensionReview;
  if(existing?.evidenceSha256!==h || JSON.stringify(existing.measurements)!==JSON.stringify(r.measurements)) {
    const result=await rpc('save_part_successor',{part_id:r.partId,payload:{expected_part_sha256:sha(JSON.stringify(stable(a.part))),part:{...r.partFields,metadata:{...a.part.metadata,publishedDimensionReview:{...review,reviewedAt:new Date().toISOString()}}},source_snapshots:[{source_url:d.sourceUrl,fetched_at:d.sourceFetchedAt,parser_version:'published-dimension-semantics-review-v1',raw_fields:{...review},status:'partial'}]}});
    assert.equal(result.part_id,r.partId); changed++;
  }
  const read=await rpc('get_part_aggregate',{part_id:r.partId});
  for(const[k,v]of Object.entries(a.part))if(!['metadata','updated_at',...Object.keys(r.partFields)].includes(k))assert.deepEqual(read.part[k],v,k);
  for(const[k,v]of Object.entries(r.partFields))assert.equal(read.part[k],v);
  for(const[k,v]of Object.entries(a.part.metadata))if(k!=='publishedDimensionReview')assert.deepEqual(read.part.metadata[k],v);
  for(const[k,v]of Object.entries(review))assert.deepEqual(read.part.metadata.publishedDimensionReview[k],v);
  for(const k of ['through_holes','connection_points','purchase_spec','path_spec'])assert.deepEqual(read[k],a[k]);
  r.status='published-dimension-semantics-confirmed-photo-pending'; r.confirmedFields=Object.keys(r.partFields);
  verified.push({draftId:r.draftId,partId:r.partId,evidenceSha256:h,measurements:r.measurements,partFields:r.partFields});
  if(verified.length%50===0)console.log(JSON.stringify({verified:verified.length,changed}));
}
const after=await select('parts');assert.equal(after.length,before.parts.length);
for(const old of before.parts)if(!targetIds.has(old.id))assert.deepEqual(after.find(p=>p.id===old.id),old);
assert.deepEqual(await select('part_image_assets'),before.assets);
const designIds=(await select('designs')).map(d=>d.id).sort(); assert.deepEqual(designIds,Object.keys(before.designs).sort());
for(const[id,d]of Object.entries(before.designs))assert.deepEqual(await rpc('get_design_aggregate',{design_id:id}),d);
assert.equal(sha(await readFile('.local/parts/parts.json')),manifest.registrySha256);
for(const r of held)r.status='existing-hold-preserved';
await atomic(base+'/ledger.json',{...ledger,at:new Date().toISOString()});
const proof={at:new Date().toISOString(),reviewScope:ledger.rows.length,priorRingReviewed:59,candidates:candidates.length,existingHoldsPreserved:held.length,dimensionSemanticsVerified:verified.length,changedThisRun:changed,nativeDimensionFieldsUpdated:verified.filter(r=>Object.keys(r.partFields).length).length,imagesChanged:0,physicalCalibrationCompleted:0,oldNonTargetPartsAssetsDesignsPreserved:true,registryUnchanged:true,verified};
await atomic(dir+(changed?'/first.json':'/rerun.json'),proof);
await atomic('.ai/evidence/precision-published-semantics-20261104.json',proof);
console.log(JSON.stringify({...proof,verified:undefined}));
