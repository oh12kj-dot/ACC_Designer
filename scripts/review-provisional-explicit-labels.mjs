import {readFile, writeFile, mkdir, rename, readdir} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {loadTeardropRestrictions} from './teardrop-registration-guards.mjs';
import {explicitSizeLabel} from './lib/explicit-size-label.mjs';

const base = '.local/setup/precision-review-20261103';
const dir = base + '/explicit-labels';
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
const promoted = new Map(manifest.promoted.map(r=>[r.draftId,r]));
const guard = await loadTeardropRestrictions('.local/calibration/nominal');
const candidates = ledger.rows.filter(r=>!r.evidence && explicitSizeLabel(drafts.get(r.draftId).sizeText));
const held = candidates.filter(r=>guard.blocked.has(r.draftId));
const rows = candidates.filter(r=>!guard.blocked.has(r.draftId));
const captures = new Map();
for (const r of rows) {
  const d=drafts.get(r.draftId), p=promoted.get(r.draftId);
  assert.ok(p); assert.equal(p.partId,r.partId); assert.equal(sha(JSON.stringify(d)),r.sourceObjectSha256);
  Object.assign(r,explicitSizeLabel(d.sizeText));

}
for(const file of (await readdir('.local/catalog/evidence')).filter(f=>/^page-\d+\.json$/.test(f))) {
  const b=await readFile('.local/catalog/evidence/'+file); const page=JSON.parse(b);
  for(const p of page.products)captures.set(String(p.id),{file,sha256:sha(b),product:p});
}
for(const r of rows) {
  const d=drafts.get(r.draftId),c=captures.get(d.productId); assert.ok(c);
  const v=c.product.variants.find(v=>String(v.id)===d.variantId);
  assert.ok(v); assert.equal(v.sku,d.sku); assert.equal(v.option1,d.sizeText);
  assert.equal(d.sourceUrl,`https://kiwaseisakujo.jp/products/${c.product.handle}?variant=${d.variantId}`);
  r.labelEvidence={version:1,kind:'explicit-named-source-size-label-only',sourceDraftId:d.id,variantId:d.variantId,sku:d.sku,sourceUrl:d.sourceUrl,sourceObjectSha256:r.sourceObjectSha256,productCapture:{file:c.file,sha256:c.sha256},rawVariantTitle:v.title,rawLabel:d.sizeText,measurements:r.measurements};
}
const planPath=dir+'/plan.json';
const plan={registrySha256:sha(bytes),rows:rows.map(r=>({draftId:r.draftId,partId:r.partId,assetId:r.assetId,evidence:r.labelEvidence,partFields:r.partFields}))};
try {assert.deepEqual(JSON.parse(await readFile(planPath)),plan);}catch(e){if(e.code!=='ENOENT')throw e;await atomic(planPath,plan);}
const ep='http://127.0.0.1:3000/api/local/workspace';
const boot=await fetch(ep).then(r=>r.json()); assert.equal(boot.workspaceId,manifest.workspaceId);
const call=async body=>{const q=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}); const j=await q.json(); if(!q.ok||j.error)throw Error(JSON.stringify(j)); return j.data;};
const rpc=(name,args)=>call({action:'rpc',name,args,key:randomUUID()});
const select=table=>call({action:'select',query:{table,columns:'*'}});
const live={parts:await select('parts'),assets:await select('part_image_assets'),designs:{}};
for(const d of await select('designs'))live.designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});
const refs=new Set(); const visit=x=>{if(!x||typeof x!=='object')return; for(const[k,v]of Object.entries(x)){if((k==='part_id'||k==='partId')&&typeof v==='string')refs.add(v);else visit(v);}};visit(live.designs);
for(const r of rows)assert.ok(!refs.has(r.partId),'Referenced target requires successor planning');
for(const r of rows) {
  const p=live.parts.find(p=>p.id===r.partId); assert.ok(p);
  for(const[k,v]of Object.entries(r.partFields))assert.ok(p[k]==null||p[k]===v,'Existing native dimension conflict');
}
let before;try{before=JSON.parse(await readFile(dir+'/before.json'));}catch(e){if(e.code!=='ENOENT')throw e;before=live;await atomic(dir+'/before.json',before);}
assert.deepEqual(live.designs,before.designs);
const targetIds=new Set(rows.map(r=>r.partId));
assert.equal(live.parts.length,before.parts.length);
for(const old of before.parts)if(!targetIds.has(old.id))assert.deepEqual(live.parts.find(p=>p.id===old.id),old);
assert.deepEqual(live.assets,before.assets);
let changed=0; const verified=[];
for(const r of rows) {
  const d=drafts.get(r.draftId), e=r.labelEvidence, h=sha(JSON.stringify(e));
  const a=await rpc('get_part_aggregate',{part_id:r.partId});
  assert.equal(a.part.metadata.sourceDraftId,d.id); assert.ok(a.part.metadata.provisionalRegistration?.photoReference);
  assert.equal(a.part.is_archived,false); assert.equal(a.part.image_asset_id,r.assetId);
  const review={version:1,status:'published-label-verified-not-diagram-or-physical-calibration',evidenceSha256:h,evidence:e,measurements:r.measurements,scope:Object.keys(r.partFields),imageAndConnectionsReviewed:false};
  const existing=a.part.metadata.publishedLabelReview;
  if(existing?.evidenceSha256!==h || JSON.stringify(existing.measurements)!==JSON.stringify(r.measurements)) {
    const result=await rpc('save_part_successor',{part_id:r.partId,payload:{expected_part_sha256:sha(JSON.stringify(stable(a.part))),part:{...r.partFields,metadata:{...a.part.metadata,publishedLabelReview:{...review,reviewedAt:new Date().toISOString()}}},source_snapshots:[{source_url:d.sourceUrl,fetched_at:d.sourceFetchedAt,parser_version:'explicit-named-label-review-v1',raw_fields:{...review},status:'partial'}]}});
    assert.equal(result.part_id,r.partId); changed++;
  }
  const read=await rpc('get_part_aggregate',{part_id:r.partId});
  for(const[k,v]of Object.entries(a.part))if(!['metadata','updated_at',...Object.keys(r.partFields)].includes(k))assert.deepEqual(read.part[k],v,k);
  for(const[k,v]of Object.entries(r.partFields))assert.equal(read.part[k],v);
  for(const[k,v]of Object.entries(a.part.metadata))if(k!=='publishedLabelReview')assert.deepEqual(read.part.metadata[k],v);
  for(const[k,v]of Object.entries(review))assert.deepEqual(read.part.metadata.publishedLabelReview[k],v);
  for(const k of ['through_holes','connection_points','purchase_spec','path_spec'])assert.deepEqual(read[k],a[k]);
  r.status='explicit-label-semantics-confirmed-photo-pending'; r.confirmedFields=Object.keys(r.partFields); r.sourceLabelReview={evidenceSha256:h,evidence:e};
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
const proof={at:new Date().toISOString(),reviewScope:ledger.rows.length,priorPartialDimensionReviewed:335,candidates:candidates.length,existingHoldsPreserved:held.length,explicitSourceLabelsVerified:verified.length,changedThisRun:changed,nativeDimensionFieldsUpdated:verified.filter(r=>Object.keys(r.partFields).length).length,imagesChanged:0,physicalCalibrationCompleted:0,oldNonTargetPartsAssetsDesignsPreserved:true,registryUnchanged:true,verified};
await atomic(dir+(changed?'/first.json':'/rerun.json'),proof);
await atomic('.ai/evidence/precision-explicit-labels-20261104.json',proof);
console.log(JSON.stringify({...proof,verified:undefined}));
