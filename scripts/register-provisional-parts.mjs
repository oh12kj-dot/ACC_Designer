import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {loadMinimumSalePolicy,saleRegistrationDecision,saleSourceFromRow} from './minimum-sale-unit-guard.mjs';
import {provisionalPayload,provisionalRecipe} from './lib/provisional-registration.mjs';
const dir='.local/setup/provisional-20261103',manifestPath='.local/calibration/provisional/promotions.json';
await mkdir(dir,{recursive:true});await mkdir('.local/calibration/provisional',{recursive:true});
const lockPath=dir+'/writer.lock';
async function acquireLock(){try{return await open(lockPath,'wx');}catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await readFile(lockPath,'utf8'));if(!Number.isSafeInteger(pid)||pid<=0)throw Error('PROVISIONAL_LOCK_INVALID');try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH'){await unlink(lockPath);return acquireLock();}throw error;}throw Error('PROVISIONAL_WRITER_BUSY');}}
const lock=await acquireLock();await lock.writeFile(String(process.pid));
try{
const sha=x=>createHash('sha256').update(x).digest('hex');
const atomic=async(path,value)=>{const tmp=path+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(value));await rename(tmp,path);};
const registryBytes=await readFile('.local/parts/parts.json'),registry=JSON.parse(registryBytes),registryHash=sha(registryBytes),policy=await loadMinimumSalePolicy(registryHash),residual=JSON.parse(await readFile('.local/setup/registration-residual-20261102-deadline.json'));
assert.equal(residual.registrySha256,registryHash);
const endpoint='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(endpoint).then(r=>r.json());assert.ok(boot.workspaceId&&boot.token);
const call=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(j.error?.message??'PROVISIONAL_API');return j.data;};
const rpc=(name,args,key=randomUUID())=>call({action:'rpc',name,args,key}),select=table=>call({action:'select',query:{table,columns:'*'}});
const tables=['parts','part_image_assets','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs'];
async function snapshot(){const result={workspaceId:boot.workspaceId,registryHash,tables:{},designs:{}};for(const table of tables)result.tables[table]=await select(table);for(const d of result.tables.designs)result.designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});return result;}
let before;try{before=JSON.parse(await readFile(dir+'/before.json'));}catch(e){if(e.code!=='ENOENT')throw e;before=await snapshot();await atomic(dir+'/before.json',before);}assert.equal(before.workspaceId,boot.workspaceId);assert.equal(before.registryHash,registryHash);
const drafts=new Map(registry.parts.map(d=>[d.id,d])),sources=residual.rows.map(r=>{const d=drafts.get(r.draftId);assert.ok(d);assert.equal(sha(JSON.stringify(d)),r.sourceObjectSha256);return d;});
let manifest;try{manifest=JSON.parse(await readFile(manifestPath));}catch(e){if(e.code!=='ENOENT')throw e;manifest={version:1,recipe:provisionalRecipe,workspaceId:boot.workspaceId,registrySha256:registryHash,batchId:'provisional-20261103',registeredAt:new Date().toISOString(),promoted:[],preservedArchived:[]};}if(manifest.photoCorrection)throw Error('PLACEHOLDER_REGISTRATION_SUPERSEDED: use correct-provisional-product-photos.mjs');assert.equal(manifest.workspaceId,boot.workspaceId);assert.equal(manifest.registrySha256,registryHash);
const live=await select('parts'),bySource=new Map();for(const p of live){const id=saleSourceFromRow(p,policy);if(id){const a=bySource.get(id)??[];a.push(p);bySource.set(id,a);}}
const oldIds=new Set(before.tables.parts.map(p=>p.id));
let assetId=manifest.assetId,newAsset;
if(!assetId){const recovered=live.find(p=>p.metadata?.provisionalRegistration?.batchId===manifest.batchId);if(recovered)assetId=recovered.image_asset_id;}
if(!assetId){
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect x="8" y="8" width="240" height="240" rx="24" fill="#fef3c7" stroke="#b45309" stroke-width="6" stroke-dasharray="12 8"/><path d="M70 70h116v116H70zM70 70l116 116M186 70L70 186" fill="none" stroke="#b45309" stroke-width="5"/><text x="128" y="228" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#78350f">PLACEHOLDER</text></svg>');
 const image=await sharp(svg).png().toBuffer(),reserved=await rpc('reserve_asset_upload',{});assetId=reserved.id;
 for(const path of reserved.paths)await call({action:'upload',path,body:image.toString('base64'),mime:'image/png'});
 const [original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=reserved.paths;
 newAsset={id:assetId,asset_kind:'part_main',content_hash:sha(image),original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:256,pixel_height:256,calibration_mm_per_px:10/256,source_transform:{recipe:provisionalRecipe,imageReviewed:false,synthetic:true,physicalScale:false,layoutSizeSource:'fixed-placeholder-not-physical'}};
}
manifest.assetId=assetId;
manifest.pendingReferences??=[];let created=0,skipped=0;
for(const d of sources){
 const existing=bySource.get(d.id)??[];
 if(existing.length){const p=existing.find(p=>!p.is_archived)??existing[0];if(p.is_archived){if(!manifest.preservedArchived.includes(d.id))manifest.preservedArchived.push(d.id);skipped++;continue;}if(p.metadata?.provisionalRegistration?.batchId===manifest.batchId){if(!manifest.promoted.some(r=>r.draftId===d.id))manifest.promoted.push({draftId:d.id,partId:p.id,assetId:p.image_asset_id});}else assert.ok(oldIds.has(p.id),'Unexpected existing source');continue;}
 const decision=saleRegistrationDecision(d.id,policy);if(!decision.allowed){assert.equal(decision.reason,'SALE_GROUP_IDENTITY_REVIEW_REQUIRED');if(!manifest.pendingReferences.some(r=>r.draftId===d.id))manifest.pendingReferences.push({draftId:d.id,status:'needs_sale_unit_review',reason:decision.reason,sourceObjectSha256:sha(JSON.stringify(d)),draft:d});continue;}
 const payload=provisionalPayload(d,assetId,manifest.registeredAt,manifest.batchId);payload.part.metadata.provisionalRegistration.sourceObjectSha256=sha(JSON.stringify(d));payload.part.metadata.provisionalRegistration.imageReviewed=false;
 if(newAsset)payload.image_asset=newAsset;
 const keyBytes=createHash('sha256').update(manifest.batchId+':'+d.id).digest();keyBytes[6]=(keyBytes[6]&15)|64;keyBytes[8]=(keyBytes[8]&63)|128;const hex=keyBytes.subarray(0,16).toString('hex'),key=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
 const result=await rpc('save_part_successor',{part_id:null,payload},key);newAsset=undefined;
 const row=await rpc('get_part_aggregate',{part_id:result.part_id});assert.equal(row.part.metadata.sourceDraftId,d.id);assert.equal(row.part.metadata.provisionalRegistration.status,'needs_review');assert.equal(row.part.width_mm,10);assert.equal(row.connection_points.length,0);assert.equal(row.through_holes.length,0);
 bySource.set(d.id,[row.part]);manifest.promoted.push({draftId:d.id,partId:row.part.id,assetId});created++;
 if(created===1||created%100===0){await atomic(manifestPath,manifest);await atomic(dir+'/progress.json',{at:new Date().toISOString(),createdThisRun:created,totalProvisional:manifest.promoted.length,preservedArchived:manifest.preservedArchived.length});console.log(JSON.stringify({created,totalProvisional:manifest.promoted.length}));}
}
await atomic(manifestPath,manifest);
const after=await snapshot();for(const table of tables){const now=new Map(after.tables[table].map(r=>[r.id??r.part_id, r]));for(const prior of before.tables[table])assert.deepEqual(now.get(prior.id??prior.part_id),prior,'Preservation '+table);}
assert.deepEqual(after.designs,before.designs);assert.equal(sha(await readFile('.local/parts/parts.json')),registryHash);
const newParts=after.tables.parts.filter(p=>!oldIds.has(p.id));assert.equal(newParts.length,manifest.promoted.length);assert.equal(manifest.promoted.length+manifest.preservedArchived.length+manifest.pendingReferences.length,sources.length);
const coverage=[...manifest.promoted.map(r=>r.draftId),...manifest.pendingReferences.map(r=>r.draftId),...manifest.preservedArchived];assert.equal(new Set(coverage).size,sources.length);assert.deepEqual([...coverage].sort(),sources.map(d=>d.id).sort());
for(const r of manifest.pendingReferences){assert.equal(r.sourceObjectSha256,sha(JSON.stringify(drafts.get(r.draftId))));assert.deepEqual(r.draft,drafts.get(r.draftId));assert.equal(saleRegistrationDecision(r.draftId,policy).reason,r.reason);}
for(const entry of manifest.promoted){const p=after.tables.parts.find(p=>p.id===entry.partId),d=drafts.get(entry.draftId);assert.ok(p&&!p.is_archived);assert.deepEqual(p.metadata.provisionalRegistration.sourceObjectSha256,sha(JSON.stringify(d)));assert.equal(p.image_asset_id,assetId);assert.equal(p.metadata.nominalPlacement,undefined);const expected=provisionalPayload(d,assetId,manifest.registeredAt,manifest.batchId).part;for(const key of ['name','sku','source_name','source_url','category','geometry_kind','width_mm','height_mm','mirror_policy','notes','import_source','import_status'])assert.deepEqual(p[key]??undefined,expected[key]??undefined,'Full part '+key);assert.deepEqual([...p.tags].sort(),[...new Set(d.tags)].sort());assert.deepEqual(p.metadata.publishedPurchase,d.purchase);assert.deepEqual(p.metadata.publishedPrice,d.price);assert.equal(after.tables.part_purchase_specs.filter(s=>s.part_id===p.id).length,0);assert.equal(after.tables.part_path_specs.filter(s=>s.part_id===p.id).length,0);const ss=after.tables.part_source_snapshots.filter(s=>s.part_id===p.id);assert.equal(ss.length,1);assert.deepEqual(ss[0].raw_fields.sourceDraft,d);assert.equal(after.tables.part_connection_points.filter(s=>s.part_id===p.id).length,0);assert.equal(after.tables.part_through_holes.filter(s=>s.part_id===p.id).length,0);}
const asset=after.tables.part_image_assets.find(a=>a.id===assetId);for(const k of ['original_path','normalized_high_path','normalized_medium_path','thumbnail_path']){const r=await fetch(endpoint+'?image='+encodeURIComponent(asset[k]));assert.ok(r.ok);assert.equal(sha(Buffer.from(await r.arrayBuffer())),asset.content_hash);}
const proof={at:new Date().toISOString(),workspaceId:boot.workspaceId,createdThisRun:created,totalProvisional:manifest.promoted.length,preservedArchived:manifest.preservedArchived.length,referenceOnly:manifest.pendingReferences.length,sourceCoverage:sources.length,oldPartsPreserved:before.tables.parts.length,oldAssetsPreserved:before.tables.part_image_assets.length,designsPreserved:Object.keys(before.designs).length,fullPartAndSourceVerified:true,allOldRowsPreserved:true,registryUnchanged:true,fourImageApiHashesVerified:true,totalParts:after.tables.parts.length,totalAssets:after.tables.part_image_assets.length,cloudWrites:0};
await atomic(dir+(created?'/first-result.json':'/rerun-result.json'),proof);console.log(JSON.stringify(proof));

}finally{await lock.close();await unlink(lockPath);}
