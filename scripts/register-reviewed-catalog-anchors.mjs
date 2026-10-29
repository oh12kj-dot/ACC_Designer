import{readFile,writeFile,rename,open,unlink}from'node:fs/promises';
import{createHash,randomUUID}from'node:crypto';
import{isDeepStrictEqual as equal}from'node:util';
const root='.local/calibration/hole-anchor-expansion',ep='http://127.0.0.1:3000/api/local/workspace';
const mode=process.argv[2];if(!['--plan','--apply','--verify'].includes(mode))throw Error('MODE_REQUIRED');
const hash=b=>createHash('sha256').update(b).digest('hex'),json=async p=>JSON.parse(await readFile(p,'utf8'));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const rowHash=v=>hash(JSON.stringify(stable(v))),clean=p=>{const r={...p};delete r.selection_reference;return r;};
const atomic=async(p,v)=>{await writeFile(p+'.tmp',JSON.stringify(v));await rename(p+'.tmp',p);};
const exists=async p=>{try{await readFile(p);return true;}catch(e){if(e.code!=='ENOENT')throw e;return false;}};
const boot=await fetch(ep).then(r=>r.json());if(!boot.token||!boot.workspaceId)throw Error('BOOTSTRAP');
const call=async body=>{const r=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)}),j=await r.json();if(!r.ok||j.error)throw Error(JSON.stringify(j.error??j));return j.data;};
const select=table=>call({action:'select',query:{table,columns:'*'}}),rpc=(name,args,key=randomUUID())=>call({action:'rpc',name,args,key});
const image=async path=>{const r=await fetch(ep+'?image='+encodeURIComponent(path));if(!r.ok)throw Error('IMAGE_READ');return Buffer.from(await r.arrayBuffer());};
const key=s=>{const h=hash(s);return`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
const designs=async()=>{const out={};for(const d of await select('designs'))out[d.id]=await rpc('get_design_aggregate',{design_id:d.id});return out;};
// Explicitly reviewed marks only. Detector scores are never acceptance criteria.
const ranges='2-3,6,15-18,20,25-27,33,36-38,40,43,46-47,51,53-59,62-63,68,70-101,104-139,242-246,250-253,258-262,268-275,277-279,281-283,285-287,292,296,298-302,307,310,312-313,316-319,323-324,328-335,345-350,354-371,381-386,390-392,396-398,400-434,437-440,442-445,449-511,514-546,548-600,604-609,619-620,623-624,642-643,646,652-654';
const approved=new Set(ranges.split(',').flatMap(s=>{const[a,b]=s.split('-').map(Number);return Array.from({length:(b??a)-a+1},(_,i)=>a+i);}));
for(const i of[271,361,362,424,425,426,429,430,431,432])approved.delete(i);
if(mode==='--plan'){
 if(await exists(root+'/manifest.json'))throw Error('MANIFEST_EXISTS');
 const before=await json(root+'/before.json'),parts=(await select('parts')).map(clean),assets=await select('part_image_assets'),drafts=new Map((await json('.local/parts/parts.json')).parts.map(d=>[d.id,d]));
 const centers=await json(root+'/center-candidates.json'),centerIndex=await json(root+'/center-review-index.json'),uppers=await json(root+'/upper-white-detected.json');
 if(centers.length!==474||uppers.length!==686)throw Error('REVIEW_SCOPE');
 const sources=[...centers.map(e=>({id:e.part.id,kind:e.kind,phrase:e.phrase,x:.5,y:.5,review:centerIndex.find(r=>r.id===e.part.id)})),...uppers.filter(u=>approved.has(u.index)).map(u=>{if(!u.whiteCircle)throw Error('UNREVIEWED_POINT:'+u.index);return{id:u.partId,kind:'visible-upper-opening',phrase:'上の部分に通し穴が1つ開いているペンダントタイプのパーツです',x:u.whiteCircle.x/u.width,y:u.whiteCircle.y/u.height,review:u};})];
 const at=new Date().toISOString(),entries=[],pmap=new Map(parts.map(p=>[p.id,p])),amap=new Map(assets.map(a=>[a.id,a]));
 if(new Set(sources.map(e=>e.id)).size!==sources.length)throw Error('DUPLICATE');
 for(const s of sources){
  const p=pmap.get(s.id),old=before.parts.find(p=>p.id===s.id),a=amap.get(p?.image_asset_id),d=drafts.get(p?.metadata?.sourceDraftId),r=s.review;
  if(!p||!a||!d||p.is_archived||p.metadata.guideAnchor||!equal(p,clean(old))||r.assetId!==a.id||r.highSha256!==a.content_hash||!d.description.includes(s.phrase)&&s.kind!=='reviewed-side-photo-center')throw Error('REVIEW_BINDING:'+s.id);
  const photo=p.metadata.nominalPlacement.photoSha256;
  if(p.metadata.guideOrientation?.status==='no-through-hole'||hash(await image(a.normalized_high_path))!==a.content_hash||hash(await image(a.original_path))!==photo)throw Error('PHOTO_BINDING');
  const agg=await rpc('get_part_aggregate',{part_id:p.id});if(agg.through_holes.length||agg.connection_points.length)throw Error('FUNCTIONAL_GEOMETRY_PRESENT');
  const known=s.kind.startsWith('reviewed-');if(known&&p.metadata.guideOrientation?.status!=='reviewed-axis')throw Error('AXIS_NOT_REVIEWED');
  const anchor={version:1,status:'photo-estimate',referenceKind:s.kind==='visible-upper-opening'?'visible-opening':'source-central-projection',rotationMode:known?'reviewed-in-plane':'keep-current',xNorm:s.x,yNorm:s.y,imageAssetId:a.id,sourceDraftId:d.id,photoSha256:photo,evidenceText:s.kind==='visible-upper-opening'?'Own source states one upper through-hole; the visible opening and marked approximate photo position were individually reviewed. Physical passage axis, exact entry coordinates and calibration are not established.':'Own central-hole statement or explicit two-ended spherical-bead source and registered photo were reviewed. This is the central projection for layout, not a measured entry/exit or a new physical hole-axis assertion.',reviewedAt:at};
  entries.push({partId:p.id,part:p,asset:a,kind:s.kind,review:r,source:{draftId:d.id,url:d.sourceUrl??d.productUrl,descriptionSha256:hash(d.description),phrase:s.phrase},uncertainty:s.kind==='visible-upper-opening'?{normalizedRadius:.05,meaning:'visual estimate; not calibrated measurement'}:{meaning:'central projection only; physical entry and exit unresolved'},metadata:{...p.metadata,guideAnchor:anchor}});
 }
 const reviewFiles=['center-review-index.json',...Array.from({length:5},(_,i)=>`center-contact-${i}.png`),'upper-white-detected.json',...Array.from({length:7},(_,i)=>`upper-white-review-${i}.png`)],reviewHashes={};for(const f of reviewFiles)reviewHashes[f]=hash(await readFile(root+'/'+f));
 const deferredUpper=uppers.filter(u=>!approved.has(u.index)).map(u=>({partId:u.partId,index:u.index,reason:'No accepted unambiguous marked position in this photo review; absence of acceptance does not establish no hole.'}));
 await atomic(root+'/manifest.json',{version:1,owner:boot.workspaceId,at,registrySha256:hash(await readFile('.local/parts/parts.json')),parts,assets,entries,reviewHashes,approvedUpperIndices:[...approved],deferredUpper});
 console.log(JSON.stringify({planned:entries.length,central:474,visibleUpper:entries.length-474,deferredUpper:deferredUpper.length}));process.exit(0);
}
const manifest=await json(root+'/manifest.json'),sha=hash(await readFile(root+'/manifest.json'));
if(manifest.owner!==boot.workspaceId||manifest.registrySha256!==hash(await readFile('.local/parts/parts.json')))throw Error('SOURCE_CHANGED');
for(const[f,h]of Object.entries(manifest.reviewHashes))if(hash(await readFile(root+'/'+f))!==h)throw Error('REVIEW_CHANGED');
let journal=await exists(root+'/journal.json')?await json(root+'/journal.json'):{manifestSha256:sha,entries:[]};if(journal.manifestSha256!==sha)throw Error('JOURNAL_BINDING');
if(mode==='--apply'){
 if(journal.entries.length===manifest.entries.length){if(!await exists(root+'/verification.json'))throw Error('VERIFY_BEFORE_RERUN');await atomic(root+'/rerun.json',{at:new Date().toISOString(),changed:0,manifestSha256:sha});console.log('changed=0');process.exit(0);}
 const lock=await open(root+'/worker.lock','wx');try{await lock.writeFile(String(process.pid));if(!await exists(root+'/runtime-before.json'))await atomic(root+'/runtime-before.json',{at:new Date().toISOString(),designs:await designs()});let changed=0;
 for(const e of manifest.entries){if(journal.entries.some(j=>j.partId===e.partId))continue;
  const result=await rpc('save_part_successor',{part_id:e.partId,payload:{expected_part_sha256:rowHash(e.part),part:{metadata:e.metadata}}},key(sha+e.partId)),back=await rpc('get_part_aggregate',{part_id:result.part_id});
  if(!equal(back.part.metadata,e.metadata)||back.through_holes.length||back.connection_points.length)throw Error('READBACK');
  journal.entries.push({partId:e.partId,targetPartId:result.part_id,createdSuccessor:result.created_successor,verifiedAt:new Date().toISOString()});await atomic(root+'/journal.json',journal);changed++;if(changed%100===0)console.log('registered='+changed);
 }console.log(JSON.stringify({changed,total:journal.entries.length}));}finally{await lock.close();await unlink(root+'/worker.lock');}process.exit(0);
}
if(journal.entries.length!==manifest.entries.length)throw Error('INCOMPLETE');
const parts=(await select('parts')).map(clean),assets=await select('part_image_assets'),pmap=new Map(parts.map(p=>[p.id,p])),targets=new Set(manifest.entries.map(e=>e.partId));
if(!equal(assets,manifest.assets))throw Error('ASSET_ROWS_CHANGED');
if(parts.length!==manifest.parts.length+journal.entries.filter(j=>j.createdSuccessor).length||parts.filter(p=>!p.is_archived).length!==manifest.parts.filter(p=>!p.is_archived).length)throw Error('PART_COUNT_CHANGED');
for(const p of manifest.parts)if(!targets.has(p.id)&&!equal(pmap.get(p.id),p))throw Error('OTHER_PART_CHANGED');
for(const e of manifest.entries){const j=journal.entries.find(j=>j.partId===e.partId),p=pmap.get(j.targetPartId),back=await rpc('get_part_aggregate',{part_id:j.targetPartId});if(!p||p.is_archived||!equal(p.metadata,e.metadata)||back.through_holes.length||back.connection_points.length)throw Error('TARGET_INVALID');for(const k of Object.keys(e.part))if(!['id','created_at','updated_at','supersedes_part_id','metadata'].includes(k)&&!equal(p[k],e.part[k]))throw Error('FIELD_CHANGED:'+k);if(hash(await image(e.asset.normalized_high_path))!==e.asset.content_hash||hash(await image(e.asset.original_path))!==e.metadata.nominalPlacement.photoSha256)throw Error('PHOTO_CHANGED');if(j.createdSuccessor){const old=pmap.get(e.partId);if(!old?.is_archived)throw Error('PREDECESSOR');for(const k of Object.keys(e.part))if(!['is_archived','updated_at'].includes(k)&&!equal(old[k],e.part[k]))throw Error('PREDECESSOR_CHANGED');}}
const runtime=await json(root+'/runtime-before.json'),nowDesigns=await designs();if(!equal(runtime.designs,nowDesigns)){await atomic(root+'/design-drift.json',{at:new Date().toISOString(),before:runtime.designs,after:nowDesigns});throw Error('DESIGN_CHANGED_INSPECT_WITHOUT_RESTORE');}
const report={at:new Date().toISOString(),manifestSha256:sha,registered:manifest.entries.length,centralProjection:474,visibleUpper:manifest.entries.length-474,totalActiveAnchors:parts.filter(p=>!p.is_archived&&p.metadata?.guideAnchor).length,active:parts.filter(p=>!p.is_archived).length,totalParts:parts.length,assetsUnchanged:assets.length,otherPartsPreserved:true,designsUnchanged:Object.keys(nowDesigns).length,successors:journal.entries.filter(j=>j.createdSuccessor).length,functionalHolesAdded:0,physicalCalibration:false,deferredUpper:manifest.deferredUpper.length};
const dest=await exists(root+'/verification.json')?'last-verification.json':'verification.json';await atomic(root+'/'+dest,report);console.log(JSON.stringify(report));
