import{readFile,writeFile,mkdir,rename,open,unlink}from'node:fs/promises';
import{randomUUID,createHash}from'node:crypto';import assert from'node:assert/strict';
import{readJsonLines}from'./read-jsonl.mjs';
import{prepareOwnProductPhotoReference,photoReferenceRecipe,photoReferenceNotice,sha256}from'./lib/own-product-photo-reference.mjs';
const dir='.local/setup/provisional-20261103',manifestPath='.local/calibration/provisional/promotions.json';
await mkdir(dir,{recursive:true});const lock=await open(dir+'/photo-correction.lock','wx');await lock.writeFile(String(process.pid));
try{
const atomic=async(path,value)=>{const tmp=path+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(value));await rename(tmp,path);};
const registryBytes=await readFile('.local/parts/parts.json'),registry=JSON.parse(registryBytes),manifest=JSON.parse(await readFile(manifestPath)),plan=JSON.parse(await readFile(dir+'/photo-correction-plan.json'));
assert.equal(sha256(registryBytes),plan.registrySha256);assert.equal(manifest.registrySha256,plan.registrySha256);assert.equal(plan.rows.length,7001);
const drafts=new Map(registry.parts.map(d=>[d.id,d])),captures=new Map();for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
const endpoint='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(endpoint).then(r=>r.json());assert.equal(boot.workspaceId,plan.workspaceId);
const call=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(j.error?.message??'PHOTO_CORRECTION_API');return j.data;};
const rpc=(name,args,key=randomUUID())=>call({action:'rpc',name,args,key}),select=table=>call({action:'select',query:{table,columns:'*'}});
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const rowHash=v=>sha256(JSON.stringify(stable(v))),keyFor=s=>{const b=createHash('sha256').update(s).digest();b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=b.subarray(0,16).toString('hex');return[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');};
const tables=['parts','part_image_assets','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs'];
async function snapshot(){const s={workspaceId:boot.workspaceId,tables:{},designs:{}};for(const t of tables)s.tables[t]=await select(t);for(const d of s.tables.designs)s.designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});return s;}
let before;try{before=JSON.parse(await readFile(dir+'/photo-correction-before.json'));}catch(e){if(e.code!=='ENOENT')throw e;before=await snapshot();await atomic(dir+'/photo-correction-before.json',before);}assert.equal(before.workspaceId,boot.workspaceId);
const controlled=new Set(plan.rows.map(r=>r.partId)),live=await select('parts'),bySource=new Map(live.filter(p=>!p.is_archived).map(p=>[p.metadata?.sourceDraftId,p]));
const assetByKey=new Map((await select('part_image_assets')).filter(a=>a.source_transform?.recipe===photoReferenceRecipe).map(a=>[a.source_transform.productId+':'+a.source_transform.photoSha256,a]));
manifest.photoCorrection??={version:1,recipe:photoReferenceRecipe,startedAt:new Date().toISOString(),corrected:[],supersededPlaceholderAssetId:manifest.assetId};
let changed=0,createdAssets=0;
for(const r of plan.rows){
 const draft=drafts.get(r.draftId),capture=captures.get(r.photoUrl);assert.equal(sha256(JSON.stringify(draft)),r.sourceHash);assert.equal(r.photoUrl,draft.imageUrls[0]);assert.equal(capture?.sha256,r.sha256);assert.ok(capture.productIds.includes(draft.productId));
 let part=bySource.get(r.draftId);assert.ok(part);assert.ok(controlled.has(part.id)||part.metadata?.provisionalRegistration?.photoReference?.recipe===photoReferenceRecipe);assert.equal(part.metadata.provisionalRegistration.sourceObjectSha256,r.sourceHash);
 let asset=assetByKey.get(r.productId+':'+r.sha256),newAsset;
 const already=part.metadata.provisionalRegistration.photoReference?.recipe===photoReferenceRecipe;
 if(already){assert.equal(part.metadata.provisionalRegistration.photoReference.sha256,r.sha256);assert.ok(asset&&asset.id===part.image_asset_id);}
 else{
  const aggregate=await rpc('get_part_aggregate',{part_id:part.id});part=aggregate.part;assert.ok(!part.is_archived);assert.equal(part.image_asset_id,manifest.photoCorrection.supersededPlaceholderAssetId);
  if(!asset){
   const original=await readFile('.local/calibration/gallery/bytes/'+r.sha256),images=await prepareOwnProductPhotoReference(original,capture,draft.productId),reservation=await rpc('reserve_asset_upload',{});
   for(const [i,k]of['original','high','medium','thumbnail'].entries())await call({action:'upload',path:reservation.paths[i],body:images[k].toString('base64'),mime:k==='original'?images.originalMime:'image/png'});
   const[original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=reservation.paths;
   asset={id:reservation.id,asset_kind:'part_main',content_hash:sha256(images.high),original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:256,pixel_height:256,calibration_mm_per_px:10/256,source_transform:images.transform};newAsset=asset;
  }
  const photoReference={recipe:photoReferenceRecipe,productId:draft.productId,url:r.photoUrl,sha256:r.sha256,sourceObjectSha256:r.sourceHash,backgroundRemoved:false,contourReviewed:false,variantAppearanceVerified:false};
  const metadata={...part.metadata,provisionalRegistration:{...part.metadata.provisionalRegistration,photoReference,imageStatus:'own-product-photo-reference',pending:['単体の切抜き・背景透過','本体寸法','サイズ別外観','画像尺度','接続位置・穴','購入単位・必要量']}};
  const payload={expected_part_sha256:rowHash(part),part:{image_asset_id:asset.id,notes:photoReferenceNotice,metadata},...(newAsset?{image_asset:newAsset}:{}),source_snapshots:[{source_url:draft.sourceUrl,fetched_at:draft.sourceFetchedAt,parser_version:photoReferenceRecipe,raw_fields:{sourceDraft:draft,photoReference,publishedSizeText:draft.sizeText,publishedPurchase:draft.purchase},status:'partial'}]};
  const result=await rpc('save_part_successor',{part_id:part.id,payload},keyFor('photo-correction-v1:'+r.draftId));
  assetByKey.set(r.productId+':'+r.sha256,asset);createdAssets+=newAsset?1:0;part={...part,id:result.part_id,image_asset_id:asset.id,metadata};bySource.set(r.draftId,part);changed++;
 }
 const entry=manifest.promoted.find(e=>e.draftId===r.draftId);assert.ok(entry);entry.partId=part.id;entry.assetId=part.image_asset_id;
 const receipt={draftId:r.draftId,partId:part.id,previousPartId:r.partId,assetId:part.image_asset_id,productId:r.productId,photoUrl:r.photoUrl,photoSha256:r.sha256};
 const i=manifest.photoCorrection.corrected.findIndex(e=>e.draftId===r.draftId);if(i<0)manifest.photoCorrection.corrected.push(receipt);else assert.deepEqual(manifest.photoCorrection.corrected[i],receipt);
 if(changed===1||changed&&changed%100===0){await atomic(manifestPath,manifest);await atomic(dir+'/photo-correction-progress.json',{at:new Date().toISOString(),changedThisRun:changed,corrected:manifest.photoCorrection.corrected.length,total:plan.rows.length,newAssetsThisRun:createdAssets});console.log(JSON.stringify({changed,corrected:manifest.photoCorrection.corrected.length,newAssets:createdAssets}));}
}
manifest.photoCorrection.completedAt??=new Date().toISOString();manifest.recipe='provisional-own-product-photo-v2';delete manifest.assetId;await atomic(manifestPath,manifest);
const after=await snapshot(),afterParts=new Map(after.tables.parts.map(p=>[p.id,p])),assets=new Map(after.tables.part_image_assets.map(a=>[a.id,a]));
const changedOldIds=new Set(manifest.photoCorrection.corrected.filter(r=>r.previousPartId!==r.partId).map(r=>r.previousPartId));
for(const t of tables){const now=new Map(after.tables[t].map(r=>[r.id??r.part_id,r]));for(const old of before.tables[t]){if(t==='parts'&&controlled.has(old.id)){const current=now.get(old.id);assert.ok(current);if(changedOldIds.has(old.id)){assert.equal(current.is_archived,true);}else{const strip=p=>{const q={...p};delete q.image_asset_id;delete q.notes;delete q.metadata;delete q.updated_at;return q;};assert.deepEqual(strip(current),strip(old));}continue;}assert.deepEqual(now.get(old.id??old.part_id),old,'Old preservation '+t);}}
assert.deepEqual(after.designs,before.designs);assert.equal(sha256(await readFile('.local/parts/parts.json')),plan.registrySha256);
assert.equal(manifest.photoCorrection.corrected.length,7001);let imageVerificationReceipt;
if(process.argv.includes('--reuse-verified-images')){assert.equal(changed,0);const bytes=await readFile(dir+'/photo-correction-first.json'),prior=JSON.parse(bytes);assert.equal(prior.changedThisRun,7001);assert.equal(prior.corrected,7001);assert.equal(prior.placeholderReferencesRemaining,0);assert.equal(prior.fourImagesPerAssetVerified,true);assert.equal(prior.totalParts,after.tables.parts.length);assert.equal(prior.totalAssets,after.tables.part_image_assets.length);imageVerificationReceipt={path:dir+'/photo-correction-first.json',sha256:sha256(bytes),verifiedAt:prior.at};}
let checkedAssets=new Set();
for(const r of manifest.photoCorrection.corrected){const p=afterParts.get(r.partId),a=assets.get(r.assetId),d=drafts.get(r.draftId);assert.ok(p&&!p.is_archived);assert.equal(p.metadata.sourceDraftId,r.draftId);assert.deepEqual(p.metadata.publishedPurchase,d.purchase);assert.equal(p.metadata.publishedPrice,d.price);assert.equal(p.metadata.provisionalRegistration.sourceObjectSha256,sha256(JSON.stringify(d)));assert.equal(p.image_asset_id,r.assetId);assert.notEqual(r.assetId,manifest.photoCorrection.supersededPlaceholderAssetId);assert.equal(a.source_transform.productId,d.productId);assert.equal(a.source_transform.photoSha256,r.photoSha256);assert.equal(p.metadata.provisionalRegistration.photoReference.sha256,r.photoSha256);const snapshots=after.tables.part_source_snapshots.filter(s=>s.part_id===p.id&&s.parser_version===photoReferenceRecipe);assert.equal(snapshots.length,1);assert.deepEqual(snapshots[0].raw_fields.sourceDraft,d);assert.equal(snapshots[0].raw_fields.photoReference.sha256,r.photoSha256);if(checkedAssets.has(a.id))continue;if(imageVerificationReceipt){checkedAssets.add(a.id);continue;}const expected=await prepareOwnProductPhotoReference(await readFile('.local/calibration/gallery/bytes/'+r.photoSha256),captures.get(r.photoUrl),d.productId);await Promise.all([['original_path','original'],['normalized_high_path','high'],['normalized_medium_path','medium'],['thumbnail_path','thumbnail']].map(async([k,render])=>{const q=await fetch(endpoint+'?image='+encodeURIComponent(a[k]));assert.ok(q.ok);assert.equal(sha256(Buffer.from(await q.arrayBuffer())),sha256(expected[render]),'Derived rendition '+k);}));checkedAssets.add(a.id);if(checkedAssets.size%500===0)console.log(JSON.stringify({verifiedAssets:checkedAssets.size}));}
const proof={at:new Date().toISOString(),...(imageVerificationReceipt?{imageVerificationReceipt}:{}),status:'own-product-photos-replaced-contour-and-dimensions-pending',changedThisRun:changed,corrected:7001,uniqueProductPhotoAssets:checkedAssets.size,createdAssetsThisRun:createdAssets,placeholderReferencesRemaining:after.tables.parts.filter(p=>!p.is_archived&&p.image_asset_id===manifest.photoCorrection.supersededPlaceholderAssetId).length,oldPartsAndAssetsPreserved:true,allDesignsPreserved:true,registryUnchanged:true,fourImagesPerAssetVerified:true,cloudWrites:0,totalParts:after.tables.parts.length,totalAssets:after.tables.part_image_assets.length};
await atomic(dir+(changed?'/photo-correction-first.json':'/photo-correction-rerun.json'),proof);console.log(JSON.stringify(proof));
}finally{await lock.close();await unlink(dir+'/photo-correction.lock');}
