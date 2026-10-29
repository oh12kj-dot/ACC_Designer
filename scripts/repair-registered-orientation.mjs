import{readFile,writeFile,mkdir,rename,open,unlink}from'node:fs/promises';
import{randomUUID}from'node:crypto';import{isDeepStrictEqual}from'node:util';import sharp from'sharp';
import{canonicalPhoto,canonicalVersion,sha256}from'./lib/canonical-photo.mjs';
const root='.local/calibration/orientation-audit',endpoint='http://127.0.0.1:3000/api/local/workspace';
const mode=process.argv[2];if(!['--plan','--apply','--verify'].includes(mode))throw Error('Specify --plan, --apply or --verify');
const boot=await fetch(endpoint).then(r=>r.json());if(!boot.token||!boot.workspaceId)throw Error('LOCAL_BOOTSTRAP');
const call=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(j.error?.message??'API_FAILED');return j.data;};
const select=table=>call({action:'select',query:{table,columns:'*'}});
const rpc=(name,args,key=randomUUID())=>call({action:'rpc',name,args,key});
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const atomic=async(file,value)=>{await writeFile(file+'.tmp',JSON.stringify(value,null,2));await rename(file+'.tmp',file);};
const image=async path=>{const r=await fetch(endpoint+'?image='+encodeURIComponent(path));if(!r.ok)throw Error('IMAGE_FAILED');return Buffer.from(await r.arrayBuffer());};
const clean=p=>{const c={...p};delete c.selection_reference;return c;};
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const rowHash=v=>sha256(JSON.stringify(stable(v)));
if(sha256(await readFile(root+'/horizontal-review.json'))!=='57c46732a55eab26e6d2f638139e762da1fb2ce3e38bcf9b3738c00a95d29ad2'||sha256(await readFile(root+'/horizontal-review.png'))!=='0707d20793df9d3c129c07047c8970dbdcb2e6d0f66674263b655d87078d6366')throw Error('HORIZONTAL_REVIEW_CHANGED');
const key=s=>{const h=sha256(s);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
await mkdir(root,{recursive:true});
if(mode==='--plan'){
 try{await readFile(root+'/manifest.json');throw Error('MANIFEST_ALREADY_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
 const parts=await select('parts'),assets=await select('part_image_assets'),holes=await select('part_through_holes'),points=await select('part_connection_points'),drafts=(await json('.local/parts/parts.json')).parts,byDraft=new Map(drafts.map(d=>[d.id,d])),byAsset=new Map(assets.map(a=>[a.id,a]));
 const reviewedHorizontal=await json(root+'/horizontal-review.json'),horizontalIds=new Set(reviewedHorizontal.map(p=>p.id));
 // The finite 32 own photos were reviewed in horizontal-review.png; no name/family inference.
 if(horizontalIds.size!==32)throw Error('HORIZONTAL_REVIEW_SCOPE');
 const entries=[],at=new Date().toISOString();
 for(const projected of parts){const p=clean(projected),n=p.metadata?.nominalPlacement,d=byDraft.get(p.metadata?.sourceDraftId);if(p.is_archived||!n||!d)continue;
  const rotated=n.photoRotationDegrees===90;
  const noHole=d.description.startsWith('通し穴が開いていない');
  const horizontal=horizontalIds.has(p.id);
  if(!rotated&&!noHole&&!horizontal)continue;
  const asset=byAsset.get(p.image_asset_id);if(!asset||asset.source_transform.photoSha256!==n.photoSha256||d.id!==n.sourceDraftId||!d.imageUrls.includes(n.photoUrl))throw Error('SOURCE_BINDING:'+p.id);
  if(rotated&&(asset.source_transform.photoRotationDegrees!==90||p.width_mm!==n.widthMm||p.height_mm!==n.heightMm))throw Error('POSE_BINDING:'+p.id);
  if(horizontal&&!isDeepStrictEqual(clean(reviewedHorizontal.find(r=>r.id===p.id)),p))throw Error('REVIEW_PART_CHANGED');
  if(holes.some(h=>h.part_id===p.id)||points.some(h=>h.part_id===p.id))throw Error('FUNCTIONAL_GEOMETRY_PRESENT:'+p.id);
  let review;
  if(noHole||horizontal){const evidenceText=noHole?d.description.split('。')[0]:d.description.split('。').find(t=>t.includes('横穴'));if(!evidenceText)throw Error('OWN_HOLE_TEXT');review={version:1,status:noHole?'no-through-hole':'reviewed-axis',...(horizontal?{axisDeg:0}:{}),imageAssetId:p.image_asset_id,sourceDraftId:d.id,photoSha256:n.photoSha256,descriptionSha256:sha256(d.description),evidenceText,reviewedAt:at};}
  const entry={partId:p.id,part:p,asset,rotate:rotated,review};
  if(rotated){
   const dir=root+'/prepared/'+p.id;await mkdir(dir,{recursive:true});
   const original=await image(asset.original_path);if(sha256(original)!==n.photoSha256)throw Error('ORIGINAL_HASH');
   const high=await image(asset.normalized_high_path);if(sha256(high)!==asset.content_hash)throw Error('HIGH_HASH');
   const old={original,high,medium:await image(asset.normalized_medium_path),thumbnail:await image(asset.thumbnail_path),mmPerPx:asset.calibration_mm_per_px,transform:asset.source_transform};
   const corrected=await canonicalPhoto(old,n);entry.evidence=corrected.evidence;entry.prepared={width:corrected.images.width,height:corrected.images.height,transform:corrected.images.transform,oldHashes:Object.fromEntries(['original','high','medium','thumbnail'].map(k=>[k,sha256(old[k])])),hashes:{}};
   for(const name of['original','high','medium','thumbnail']){await writeFile(dir+'/'+name,corrected.images[name]);entry.prepared.hashes[name]=sha256(corrected.images[name]);}
   entry.prepared.originalMime='image/'+(await sharp(original).metadata()).format.replace('jpg','jpeg');
  }
  entries.push(entry);if(entries.length%100===0)console.log('prepared',entries.length);
 }
 const designs={};for(const d of await select('designs'))designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});
 const manifest={version:1,canonicalVersion,owner:boot.workspaceId,at,registrySha256:sha256(await readFile('.local/parts/parts.json')),assets,parts:parts.map(clean),designs,entries};
 await atomic(root+'/manifest.json',manifest);console.log(JSON.stringify({planned:entries.length,rotated:entries.filter(e=>e.rotate).length,reviewedAxis:entries.filter(e=>e.review?.status==='reviewed-axis').length,noThroughHole:entries.filter(e=>e.review?.status==='no-through-hole').length}));
 process.exit(0);
}
const manifest=await json(root+'/manifest.json'),manifestHash=sha256(await readFile(root+'/manifest.json'));
if(manifest.owner!==boot.workspaceId||manifest.canonicalVersion!==canonicalVersion||manifest.registrySha256!==sha256(await readFile('.local/parts/parts.json')))throw Error('MANIFEST_BINDING');
let journal;try{journal=await json(root+'/journal.json');}catch(e){if(e.code!=='ENOENT')throw e;journal={manifestHash,entries:[]};}if(journal.manifestHash!==manifestHash)throw Error('JOURNAL_BINDING');
if(mode==='--apply'){
 const lock=await open(root+'/worker.lock','wx');await lock.writeFile(String(process.pid));
 try{
 const current=new Map((await select('parts')).map(p=>[p.id,clean(p)]));
 const currentAssets=new Map((await select('part_image_assets')).map(a=>[a.id,a]));for(const a of manifest.assets)if(!isDeepStrictEqual(currentAssets.get(a.id),a))throw Error('ASSET_CHANGED');
 await mkdir(root+'/operations',{recursive:true});let changed=0,recovered=0;
 for(const e of manifest.entries){if(journal.entries.some(j=>j.partId===e.partId))continue;
  let operation;try{operation=await json(root+'/operations/'+e.partId+'.json');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(operation&&operation.manifestHash!==manifestHash)throw Error('OPERATION_BINDING');
  if(!operation){
   if(!isDeepStrictEqual(current.get(e.partId),e.part))throw Error('PART_CHANGED:'+e.partId);
   const latest=clean((await rpc('get_part_aggregate',{part_id:e.partId})).part);if(!isDeepStrictEqual(latest,e.part))throw Error('PART_CHANGED:'+e.partId);
  }
  let assetId=e.part.image_asset_id,asset;
  if(e.rotate){const reserve=await rpc('reserve_asset_upload',{},key(manifestHash+e.partId+':reserve'));assetId=reserve.id;
   for(const[i,name]of['original','high','medium','thumbnail'].entries()){const b=await readFile(root+'/prepared/'+e.partId+'/'+name);if(sha256(b)!==e.prepared.hashes[name])throw Error('PREPARED_HASH');await call({action:'upload',path:reserve.paths[i],body:b.toString('base64'),mime:name==='original'?e.prepared.originalMime:'image/png'});}
   const[original_path,normalized_high_path,normalized_medium_path,thumbnail_path]=reserve.paths;
   asset={id:reserve.id,asset_kind:'part_main',content_hash:e.prepared.hashes.high,original_path,normalized_high_path,normalized_medium_path,thumbnail_path,pixel_width:e.prepared.width,pixel_height:e.prepared.height,calibration_mm_per_px:e.asset.calibration_mm_per_px,source_transform:{...e.prepared.transform,canonicalManifestSha256:manifestHash,previousAssetId:e.asset.id}};
  }
  const metadata={...e.part.metadata,...(e.rotate?{nominalPlacement:e.evidence}:{}),...(e.review?{guideOrientation:{...e.review,imageAssetId:assetId}}:{})};
  const payload={expected_part_sha256:rowHash(e.part),part:{metadata,...(e.rotate?{image_asset_id:assetId,width_mm:e.evidence.widthMm,height_mm:e.evidence.heightMm}:{})},...(asset?{image_asset:asset}:{})};
  if(operation&&!isDeepStrictEqual(operation.payload,payload))throw Error('OPERATION_PAYLOAD_CHANGED');
  if(!operation)await atomic(root+'/operations/'+e.partId+'.json',{manifestHash,payload});
  const result=await rpc('save_part_successor',{part_id:e.partId,payload},key(manifestHash+e.partId+':save'));
  const readback=await rpc('get_part_aggregate',{part_id:result.part_id});if(!isDeepStrictEqual(readback.part.metadata,metadata)||readback.part.image_asset_id!==assetId||readback.through_holes.length||readback.connection_points.length)throw Error('READBACK');
  journal.entries.push({partId:e.partId,targetPartId:result.part_id,assetId,createdSuccessor:result.created_successor,verifiedAt:new Date().toISOString()});await atomic(root+'/journal.json',journal);if(operation)recovered++;else changed++;if((changed+recovered)%100===0)console.log('corrected',changed,'/',manifest.entries.length);
 }
 console.log(JSON.stringify({changed,recovered,total:journal.entries.length,successors:journal.entries.filter(j=>j.createdSuccessor).length}));
 }finally{await lock.close();await unlink(root+'/worker.lock');}
}else{
 if(journal.entries.length!==manifest.entries.length)throw Error('INCOMPLETE');
 const parts=await select('parts'),assets=await select('part_image_assets'),byId=new Map(parts.map(p=>[p.id,p])),byAsset=new Map(assets.map(a=>[a.id,a]));
 const targets=new Set(manifest.entries.map(e=>e.partId));for(const p of manifest.parts)if(!targets.has(p.id)&&!isDeepStrictEqual(clean(byId.get(p.id)),p))throw Error('UNRELATED_PART_CHANGED');
 const designChanges=[];for(const[id,before]of Object.entries(manifest.designs)){const after=await rpc('get_design_aggregate',{design_id:id});if(!isDeepStrictEqual(after,before)){if(after.design.revision===before.design.revision)throw Error('DESIGN_CHANGED_WITHOUT_REVISION');designChanges.push({id,beforeRevision:before.design.revision,afterRevision:after.design.revision});}}
 for(const old of manifest.assets)if(!isDeepStrictEqual(byAsset.get(old.id),old))throw Error('OLD_ASSET_CHANGED');
 let checked=0;for(const e of manifest.entries){const j=journal.entries.find(j=>j.partId===e.partId),p=byId.get(j.targetPartId);if(!p||p.is_archived||p.image_asset_id!==j.assetId)throw Error('TARGET_MISSING');
  const old=e.part,allowed=new Set(['metadata','image_asset_id','width_mm','height_mm','updated_at','id','supersedes_part_id','created_at']);for(const k of Object.keys(old))if(!allowed.has(k)&&!isDeepStrictEqual(p[k],old[k]))throw Error('PART_FIELD_CHANGED:'+k);
  const operation=await json(root+'/operations/'+e.partId+'.json');if(!isDeepStrictEqual(p.metadata,operation.payload.part.metadata)||p.width_mm!==(e.rotate?e.evidence.widthMm:old.width_mm)||p.height_mm!==(e.rotate?e.evidence.heightMm:old.height_mm))throw Error('METADATA_OR_BOX_CHANGED');
  if(j.createdSuccessor){const archived=byId.get(old.id);if(!archived?.is_archived)throw Error('SUCCESSOR');for(const k of Object.keys(old))if(!['is_archived','updated_at'].includes(k)&&!isDeepStrictEqual(archived[k],old[k]))throw Error('ARCHIVED_CHANGED:'+k);}
  if(e.rotate){const a=byAsset.get(j.assetId);for(const [name,path]of Object.entries({original:'original_path',high:'normalized_high_path',medium:'normalized_medium_path',thumbnail:'thumbnail_path'})){if(sha256(await image(a[path]))!==e.prepared.hashes[name]||sha256(await image(e.asset[path]))!==e.prepared.oldHashes[name])throw Error('IMAGE_HASH_CHANGED');}for(const[k,v]of Object.entries(operation.payload.image_asset))if(!isDeepStrictEqual(a[k],v))throw Error('ASSET_TRANSFORM_CHANGED');}
  checked++;if(checked%250===0)console.log('verified',checked);
 }
 const report={at:new Date().toISOString(),manifestHash,checked,rotated:manifest.entries.filter(e=>e.rotate).length,reviewedAxes:manifest.entries.filter(e=>e.review?.status==='reviewed-axis').length,noThroughHole:manifest.entries.filter(e=>e.review?.status==='no-through-hole').length,oldAssetsPreserved:manifest.assets.length,designChanges,successors:journal.entries.filter(e=>e.createdSuccessor).length,active:parts.filter(p=>!p.is_archived).length};
 await atomic(root+'/verification.json',report);console.log(JSON.stringify(report));
}
