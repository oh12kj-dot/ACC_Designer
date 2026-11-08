import{readFile,writeFile,mkdir,rename,open,unlink}from'node:fs/promises';import assert from'node:assert/strict';
import{sha256,stable}from'./minimum-sale-units.mjs';import{finiteMainFamilyProof}from'./lib/finite-main-crystal-family.mjs';import{registrationApi}from'./lib/local-registration-api.mjs';import{readJsonLines}from'./read-jsonl.mjs';
const dir='.local/setup/pending-main-families-20261105',pp='src/data/kiwa-minimum-sale-units.json',mp='.local/calibration/provisional/promotions.json';await mkdir(dir,{recursive:true});const lock=await open(dir+'/writer.lock','wx');
try{
const atomic=async(p,x)=>{await writeFile(p+'.tmp',JSON.stringify(x));await rename(p+'.tmp',p);};
const api=await registrationApi(),rb=await readFile('.local/parts/parts.json'),cb=await readFile('.local/catalog/catalog.json'),catalog=JSON.parse(cb),ds=new Map(JSON.parse(rb).parts.map(d=>[d.id,d]));
let plan,before;
try{plan=JSON.parse(await readFile(dir+'/plan.json'));before=JSON.parse(await readFile(dir+'/before.json'));}catch(e){
 if(e.code!=='ENOENT')throw e;
 const pb=await readFile(pp),mb=await readFile(mp),policy=JSON.parse(pb),m=JSON.parse(mb);assert.equal(m.registrySha256,sha256(rb));assert.equal(m.workspaceId,api.boot.workspaceId);
 before=await api.snapshot();const ids=new Set(m.pendingReferences.map(r=>r.draftId)),jobs=[];
 const captures=new Map();for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
 for(const g of policy.groups.filter(g=>g.holdReason==='CROSS_PRODUCT_IDENTITY_REVIEW_REQUIRED'&&g.members.some(o=>ids.has(o.draftId)))){
  const bulk=catalog.products.find(p=>p.id===g.members[0].productId),normalCandidates=catalog.products.filter(p=>p.name.normalize('NFKC')===bulk.name.normalize('NFKC').replace(/^\[大袋\]\s*/,''));assert.equal(normalCandidates.length,1);const normal=normalCandidates[0];
  const normalGroups=policy.groups.filter(x=>x.status==='resolved'&&x.members.some(o=>o.productId===normal.id));assert.equal(normalGroups.length,1);const ng=normalGroups[0],proof=finiteMainFamilyProof(normal,bulk,ng,g);
  const row=before.tables.parts.find(p=>!p.is_archived&&p.metadata?.sourceDraftId===ng.canonicalOfferDraftId);assert.ok(row?.metadata?.provisionalRegistration?.photoReference);
  const c=captures.get(proof.bulkPhotoUrl);assert.ok(c?.productIds.includes(bulk.id));assert.equal(sha256(await readFile('.local/calibration/gallery/bytes/'+c.sha256)),c.sha256);
  const d=ds.get(proof.appendedSourceId),pending=m.pendingReferences.find(r=>r.draftId===d.id);assert.ok(pending);assert.equal(pending.sourceObjectSha256,sha256(JSON.stringify(d)));assert.deepEqual(pending.draft,d);
  jobs.push({normalGroupId:ng.id,bulkGroupId:g.id,partId:row.id,sourceId:d.id,sourceObjectSha256:pending.sourceObjectSha256,proof:{...proof,bulkPhotoSha256:c.sha256},normalBefore:ng,bulkBefore:g});
 }
 assert.equal(jobs.length,14);const out=structuredClone(policy),removed=new Set(jobs.map(j=>j.bulkGroupId));out.finiteMergedSaleGroups??=[];
 for(const j of jobs){const ng=out.groups.find(g=>g.id===j.normalGroupId);ng.members.push(structuredClone(j.bulkBefore.members[0]));ng.finiteMainFamilyResolution=j.proof;out.finiteMergedSaleGroups.push(j);}
 out.groups=out.groups.filter(g=>!removed.has(g.id));out.summary.physicalGroups=out.groups.length;out.summary.holdGroups=out.groups.filter(g=>g.status==='hold').length;out.summary.resolvedGroups=out.groups.filter(g=>g.status==='resolved').length;out.summary.noncanonicalVariants+=14;out.summary.bulkProductPairs+=14;
 const all=out.groups.flatMap(g=>g.members.map(o=>o.draftId)),allIds=new Set(all);assert.equal(all.length,ds.size);assert.equal(allIds.size,ds.size);for(const id of ds.keys())assert.ok(allIds.has(id));
 const targets=new Set(jobs.flatMap(j=>[j.normalGroupId,j.bulkGroupId]));for(const old of policy.groups)if(!targets.has(old.id))assert.deepEqual(out.groups.find(g=>g.id===old.id),old);
 assert.equal(out.summary.physicalGroups,policy.summary.physicalGroups-14);assert.equal(out.summary.holdGroups,policy.summary.holdGroups-14);assert.equal(out.summary.resolvedGroups,policy.summary.resolvedGroups);
 plan={workspaceId:api.boot.workspaceId,registrySha256:sha256(rb),catalogSha256:sha256(cb),beforePolicySha256:sha256(pb),candidatePolicySha256:sha256(JSON.stringify(out)),jobs};
 await writeFile(dir+'/policy.before.json',pb,{flag:'wx'});await writeFile(dir+'/promotions.before.json',mb,{flag:'wx'});await atomic(dir+'/before.json',before);await atomic(dir+'/policy.candidate.json',out);await atomic(dir+'/plan.json',plan);
}
assert.equal(api.boot.workspaceId,plan.workspaceId);assert.equal(sha256(rb),plan.registrySha256);assert.equal(sha256(cb),plan.catalogSha256);
const current=await readFile(pp);let policyChanged=false;if(sha256(current)===plan.beforePolicySha256){const candidate=JSON.parse(await readFile(dir+'/policy.candidate.json'));assert.equal(sha256(JSON.stringify(candidate)),plan.candidatePolicySha256);await atomic(pp,candidate);policyChanged=true;}else assert.equal(sha256(current),plan.candidatePolicySha256);
const m=JSON.parse(await readFile(mp));let mapped=0;
for(const j of plan.jobs){const a=await api.rpc('get_part_aggregate',{part_id:j.partId});assert.equal(a.part.metadata.sourceDraftId,j.proof.canonicalOfferDraftId);assert.equal(a.part.is_archived,false);assert.equal(a.selection_reference?.offerDraftId,j.proof.canonicalOfferDraftId);
 const d=ds.get(j.sourceId);assert.equal(sha256(JSON.stringify(d)),j.sourceObjectSha256);const ref={draftId:d.id,canonicalOfferDraftId:j.proof.canonicalOfferDraftId,partId:j.partId,groupId:j.normalGroupId,sourceObjectSha256:j.sourceObjectSha256,purchase:d.purchase,status:'resolved-sale-reference',familyProof:j.proof};
 const prior=m.resolvedSaleReferences.find(r=>r.draftId===d.id);if(prior)assert.deepEqual(prior,ref);else{m.resolvedSaleReferences.push(ref);mapped++;}m.pendingReferences=m.pendingReferences.filter(r=>r.draftId!==d.id);
}
await atomic(mp,m);const after=await api.snapshot();for(const[t,old]of Object.entries(before.tables))assert.deepEqual(after.tables[t],old,'PRESERVE_'+t);assert.deepEqual(after.designs,before.designs);
assert.equal(sha256(await readFile('.local/parts/parts.json')),plan.registrySha256);assert.equal(sha256(await readFile('.local/catalog/catalog.json')),plan.catalogSha256);
const proof={at:new Date().toISOString(),policyChangedThisRun:policyChanged,newSaleReferencesThisRun:mapped,verifiedReferences:14,pendingSources:m.pendingReferences.length,newParts:0,newAssets:0,oldAllRowsAndDesignsPreserved:true,sourcePartitionPreserved:true,registryCatalogUnchanged:true,totalParts:after.tables.parts.length,totalAssets:after.tables.part_image_assets.length};await atomic(dir+(mapped?'/first.json':'/rerun.json'),proof);console.log(JSON.stringify(proof));
}finally{await lock.close();await unlink(dir+'/writer.lock');}
