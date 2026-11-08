import{readFile,writeFile,rename,open,unlink}from'node:fs/promises';
import{randomUUID,createHash}from'node:crypto';import assert from'node:assert/strict';
import{readJsonLines}from'./read-jsonl.mjs';import{sha256,stable}from'./minimum-sale-units.mjs';
import{registrationApi}from'./lib/local-registration-api.mjs';
import{prepareOwnProductPhotoReference,photoReferenceRecipe,photoReferenceNotice}from'./lib/own-product-photo-reference.mjs';
const dir='.local/setup/final-pin-pack-tiers-20261105',mp='.local/calibration/provisional/promotions.json',pp='src/data/kiwa-minimum-sale-units.json';
const lock=await open(dir+'/writer.lock','wx');await lock.writeFile(String(process.pid));
try{
const atomic=async(p,x)=>{await writeFile(p+'.tmp',typeof x==='string'?x:JSON.stringify(x));await rename(p+'.tmp',p);};
const plan=JSON.parse(await readFile(dir+'/plan.json')),before=JSON.parse(await readFile(dir+'/before.json'));
const rb=await readFile('.local/parts/parts.json'),cb=await readFile('.local/catalog/catalog.json');
assert.equal(sha256(rb),plan.registrySha256);assert.equal(sha256(cb),plan.catalogSha256);
const drafts=new Map(JSON.parse(rb).parts.map(d=>[d.id,d])),candidate=await readFile(dir+'/policy.candidate.json');assert.equal(sha256(candidate),plan.candidatePolicySha256);
assert.equal(plan.resolved.length,4);const evidence=JSON.parse(await readFile(dir+'/live-source-evidence.json'));assert.equal(sha256(JSON.stringify(evidence)),plan.externalEvidenceSha256);for(const c of evidence.captures)assert.equal(sha256(await readFile(c.path)),c.sha256);const currentPolicy=await readFile(pp);if(sha256(currentPolicy)===plan.policySha256)await atomic(pp,candidate.toString());else assert.equal(sha256(currentPolicy),plan.candidatePolicySha256);
const policy=JSON.parse(candidate),groups=new Map(policy.groups.map(g=>[g.id,g]));
const api=await registrationApi();assert.equal(api.boot.workspaceId,plan.workspaceId);
const captures=new Map();for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
const initialParts=await api.select('parts'),bySource=new Map(initialParts.filter(p=>!p.is_archived).map(p=>[p.metadata?.sourceDraftId,p]));
const oldIds=new Set(before.tables.parts.map(p=>p.id));
let manifest=JSON.parse(await readFile(mp));manifest.resolvedSaleReferences??=[];
const assetByKey=new Map((await api.select('part_image_assets')).filter(a=>a.source_transform?.recipe===photoReferenceRecipe).map(a=>[a.source_transform.productId+':'+a.source_transform.photoSha256,a]));
const verifiedAssets=new Set(),verified=[],receipts=[];let created=0,newAssets=0;
const keyFor=s=>{const b=createHash('sha256').update(s).digest();b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=b.subarray(0,16).toString('hex');return[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');};
async function imagesFor(d){const c=captures.get(d.imageUrls[0]);assert.ok(c?.productIds.includes(d.productId));const images=await prepareOwnProductPhotoReference(await readFile('.local/calibration/gallery/bytes/'+c.sha256),c,d.productId);return{c,images};}
// Verify policy activation without writing: neither held nor nonminimum offers may pass.
const firstGroup=groups.get(plan.resolved[0].groupId),nonminimum=firstGroup.members.find(o=>!o.excludedReason&&o.draftId!==firstGroup.canonicalOfferDraftId);
const held=policy.groups.find(g=>g.status==='hold'&&g.members.some(o=>!o.excludedReason));
for(const[source,message]of[[nonminimum.draftId,'MINIMUM_SALE_UNIT_ONLY'],...(held?[[held.members.find(o=>!o.excludedReason).draftId,'SALE_GROUP_IDENTITY_REVIEW_REQUIRED']]:[])]){
 const d=drafts.get(source);await assert.rejects(api.rpc('save_part_successor',{part_id:null,payload:{part:{name:d.name,category:d.category,geometry_kind:'node',width_mm:10,height_mm:10,image_asset_id:before.tables.part_image_assets[0].id,source_url:d.sourceUrl,sku:d.sku,import_source:'kiwa_url',metadata:{sourceDraftId:d.id}}}}),e=>String(e.message).includes(message));
}
for(const job of plan.resolved){
 const g=groups.get(job.groupId),d=drafts.get(g.canonicalOfferDraftId),pin=job.resolution.offers.find(o=>o.draftId===d.id);
 assert.equal(sha256(JSON.stringify(d)),pin.sourceObjectSha256);assert.equal(g.status,'resolved');assert.equal(g.cleanup.length,0);
 const{c,images}=await imagesFor(d);let asset=assetByKey.get(d.productId+':'+c.sha256),newAsset;
 let part=bySource.get(d.id);
 if(!part){
  if(!asset){const r=await api.rpc('reserve_asset_upload',{});for(const[i,k]of['original','high','medium','thumbnail'].entries())await api.call({action:'upload',path:r.paths[i],body:images[k].toString('base64'),mime:k==='original'?images.originalMime:'image/png'});const[original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=r.paths;asset={id:r.id,asset_kind:'part_main',content_hash:sha256(images.high),original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:256,pixel_height:256,calibration_mm_per_px:10/256,source_transform:images.transform};newAsset=asset;}
  const photoReference={recipe:photoReferenceRecipe,productId:d.productId,url:c.url,sha256:c.sha256,sourceObjectSha256:pin.sourceObjectSha256,backgroundRemoved:false,contourReviewed:false,variantAppearanceVerified:false};
  const amount=g.members.find(o=>o.draftId===d.id).parse,lengthMm=Number(amount.numerator)/Number(amount.denominator);assert.ok(lengthMm>0&&Number.isFinite(lengthMm));
  const provisionalRegistration={version:1,recipe:'provisional-own-product-photo-v2',status:'needs_review',batchId:dir.split('/').at(-1),registeredAt:new Date().toISOString(),sourceObjectSha256:pin.sourceObjectSha256,photoReference,imageStatus:'own-product-photo-reference',layoutSizeSource:'technical-reference-box-not-physical',layoutWidthMm:10,layoutHeightMm:10,imageScaleVerified:false,connectionReady:false,physicalDimensionsVerified:false,sourceImageUrls:d.imageUrls,publishedSizeText:d.sizeText,saleUnitReviewed:true,saleUnitReviewScope:'published-pack-tier-only',salePhysicalQuantityComparisonVerified:false,pending:['本数と重量の対応・実入り数','単体の切抜き・背景透過','本体寸法','サイズ別外観','画像尺度','接続位置・穴']};
  const payload={part:{name:d.name,sku:d.sku,source_name:d.sourceName,source_url:d.sourceUrl,category:d.category,geometry_kind:'node',width_mm:10,height_mm:10,mirror_policy:'keep_orientation',tags:d.tags,notes:photoReferenceNotice+' 販売は通常袋を中袋より優先する掲載クラスで選択。本数と重量の対応・実入り数は未確認です。',import_source:'kiwa_url',import_status:'partial',image_asset_id:asset.id,metadata:{sourceDraftId:d.id,provisionalRegistration,publishedPurchase:d.purchase,publishedPrice:d.price,publishedCurrency:d.currency,publishedSaleResolution:{groupId:g.id,resolution:job.resolution}}},...(amount.unit==='length-mm'?{purchase_spec:{sale_mode:'length',sale_length_mm:lengthMm,minimum_units:1,unit_price:d.price,currency:d.currency}}:{}),connection_points:[],through_holes:[],source_snapshots:[{source_url:d.sourceUrl,fetched_at:d.sourceFetchedAt,parser_version:job.resolution.kind+'-photo-v1',raw_fields:{sourceDraft:d,photoReference,saleResolution:job.resolution},status:'partial'}],...(newAsset?{image_asset:newAsset}:{})};
  const r=await api.rpc('save_part_successor',{part_id:null,payload},keyFor('pending-sale-lengths-v1:'+d.id));part=(await api.rpc('get_part_aggregate',{part_id:r.part_id})).part;bySource.set(d.id,part);assetByKey.set(d.productId+':'+c.sha256,asset);created++;newAssets+=newAsset?1:0;
 }
 assert.ok(!oldIds.has(part.id));assert.equal(part.metadata.sourceDraftId,d.id);assert.equal(part.is_archived,false);assert.equal(part.image_asset_id,asset.id);
 const a=await api.rpc('get_part_aggregate',{part_id:part.id});assert.deepEqual(a.part.metadata.publishedPurchase,d.purchase);assert.equal(a.part.metadata.publishedPrice,d.price);assert.deepEqual(a.part.metadata.publishedSaleResolution.resolution,job.resolution);assert.equal(a.part.metadata.provisionalRegistration.photoReference.sha256,c.sha256);assert.equal(a.part.metadata.provisionalRegistration.saleUnitReviewScope,'published-pack-tier-only');assert.equal(a.part.metadata.provisionalRegistration.salePhysicalQuantityComparisonVerified,false);assert.equal(a.part.metadata.publishedSaleResolution.resolution.guaranteedPhysicalQuantityComparison,false);assert.ok(a.part.notes.includes('実入り数は未確認'));assert.equal(a.part.width_mm,10);assert.equal(a.part.height_mm,10);assert.equal(a.through_holes.length,0);assert.equal(a.connection_points.length,0);
 const amount=g.members.find(o=>o.draftId===d.id).parse;if(amount.unit==='length-mm'){assert.equal(a.purchase_spec.sale_length_mm,Number(amount.numerator)/Number(amount.denominator));assert.equal(a.purchase_spec.unit_price,d.price);}else assert.equal(a.purchase_spec,null);
 if(!verifiedAssets.has(asset.id)){
  assert.equal(asset.source_transform.productId,d.productId);assert.equal(asset.source_transform.photoSha256,c.sha256);
  for(const[k,image]of[['original_path','original'],['normalized_high_path','high'],['normalized_medium_path','medium'],['thumbnail_path','thumbnail']]){const r=await fetch(api.endpoint+'?image='+encodeURIComponent(asset[k]));assert.ok(r.ok);assert.equal(sha256(Buffer.from(await r.arrayBuffer())),sha256(images[image]));}
  verifiedAssets.add(asset.id);
 }
 const promotion={draftId:d.id,partId:part.id,assetId:asset.id};const prior=manifest.promoted.find(r=>r.draftId===d.id);if(prior)assert.deepEqual(prior,promotion);else manifest.promoted.push(promotion);
 for(const id of job.sourceIds){const source=drafts.get(id),ref={draftId:id,canonicalOfferDraftId:d.id,partId:part.id,groupId:g.id,sourceObjectSha256:sha256(JSON.stringify(source)),purchase:source.purchase,status:id===d.id?'canonical-registered':'resolved-sale-reference'};const old=manifest.resolvedSaleReferences.find(r=>r.draftId===id);if(old)assert.deepEqual(old,ref);else manifest.resolvedSaleReferences.push(ref);}
 const resolvedIds=new Set(job.sourceIds);manifest.pendingReferences=manifest.pendingReferences.filter(r=>!resolvedIds.has(r.draftId));
 verified.push({groupId:g.id,sourceIds:job.sourceIds,partId:part.id,canonicalOfferDraftId:d.id,assetId:asset.id});
 if(verified.length%25===0){await atomic(mp,manifest);await atomic(dir+'/progress.json',{at:new Date().toISOString(),verifiedGroups:verified.length,createdThisRun:created,pendingReferences:manifest.pendingReferences.length});console.log(JSON.stringify({verified:verified.length,created,pending:manifest.pendingReferences.length}));}
}
await atomic(mp,manifest);
const after=await api.snapshot();for(const[t,oldRows]of Object.entries(before.tables)){const now=new Map(after.tables[t].map(r=>[r.id??r.part_id,r]));for(const old of oldRows)assert.deepEqual(now.get(old.id??old.part_id),old,'OLD_'+t);}
assert.deepEqual(after.designs,before.designs);assert.equal(after.tables.parts.length-before.tables.parts.length,plan.resolved.length);
assert.equal(sha256(await readFile(pp)),plan.candidatePolicySha256);assert.equal(sha256(await readFile('.local/parts/parts.json')),plan.registrySha256);assert.equal(sha256(await readFile('.local/catalog/catalog.json')),plan.catalogSha256);
const proof={at:new Date().toISOString(),createdThisRun:created,newAssetsThisRun:newAssets,newPartsTotal:after.tables.parts.length-before.tables.parts.length,resolvedSources:verified.reduce((n,r)=>n+r.sourceIds.length,0),pendingSources:manifest.pendingReferences.length,verifiedProductPhotoAssets:verifiedAssets.size,fourImagesPerAssetVerified:true,oldAllRowsAndDesignsPreserved:true,registryCatalogUnchanged:true,policySha256:plan.candidatePolicySha256,totalParts:after.tables.parts.length,totalAssets:after.tables.part_image_assets.length,fullyReviewedSources:0,cloudWrites:0,verified};
await atomic(dir+(created?'/first.json':'/rerun.json'),proof);console.log(JSON.stringify({...proof,verified:undefined}));
}finally{await lock.close();await unlink(dir+'/writer.lock');}
