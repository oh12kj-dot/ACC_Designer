import{assertFiniteSourceMeaningEligible}from'./finite-source-meaning-holds.mjs';
import{loadTerminalMachineFailure}from'./new-input-terminal-failure-loader.mjs';
import{loadNormalizedNewInputNegatives}from'./new-input-negative-normalization.mjs';
import{assertFiniteSourceReentry}from'./new-input-finite-cohort-catalog.mjs';
// Read-only adapter bindings for already prepared finite V3 cohorts. No renderer.
import{readFile}from'node:fs/promises';import{isDeepStrictEqual as equal}from'node:util';import{sha256}from'./lib/registration-work.mjs';import{assertFiniteCatalog,assertFiniteCohortBundle,completeFinitePixelSpec}from'./new-input-finite-cohort-catalog.mjs';
const root='.local/calibration/nominal/new-input-cohorts/',catalogPath='.local/calibration/nominal/new-input-finite-cohorts.json',fail=m=>{throw Error('FINITE_BRIDGE_'+m);};
export async function loadFiniteBridgeCatalog({unitBytes,registryBytes,planBytes,captures}){
 const files=[],get=async p=>{const b=await readFile(p);files.push({path:p,sha256:sha256(b)});return b;},unit=JSON.parse(unitBytes),bindings={unitSha256:sha256(unitBytes),registrySha256:sha256(registryBytes),planSha256:sha256(planBytes),workspaceId:unit.workspaceId},catalog=assertFiniteCatalog(JSON.parse(await get(catalogPath)),bindings),records=new Map(),negative=await loadNormalizedNewInputNegatives();
 for(const entry of catalog.entries.filter(e=>e.kind==='finite')){
  const scopeBytes=await get(entry.scopePath),preparePlanBytes=await get(entry.preparePlanPath);if(sha256(scopeBytes)!==entry.scopeSha256||sha256(preparePlanBytes)!==entry.preparePlanSha256)fail('CATALOG_BYTES');const bundle=assertFiniteCohortBundle({scopeBytes,preparePlanBytes,unitBytes,registryBytes,planBytes,captures});
  // Same-source terminal re-entry remains unsupported by this loader.
  for(const r of bundle.scope.rows){if(records.has(r.draftId)){const previous=records.get(r.draftId),closed=await loadTerminalMachineFailure(previous.entry,r.draftId,negative);assertFiniteSourceReentry({draftId:r.draftId,newOriginalSha256:r.alternatePhotoSha256,priorRows:[closed.priorRow],closures:new Map([[previous.entry.cohortId+':'+r.draftId,closed.closure]]),liveParts:[],liveAssets:[]});files.push(...closed.files);}records.set(r.draftId,{bundle,row:r,entry});}
  const dir=root+entry.cohortId;let outputBytes;try{outputBytes=await get(dir+'/output-ledger.json');}catch(e){if(e.code==='ENOENT')continue;throw e;}const output=JSON.parse(outputBytes);
  if(output.scopeSha256!==entry.scopeSha256||output.preparePlanSha256!==entry.preparePlanSha256||output.catalogPrefixEntrySha256!==sha256(JSON.stringify(entry)))fail('OUTPUT_SCOPE');
  let reviewBytes;try{reviewBytes=await get(dir+'/processed-review.json');}catch(e){if(e.code==='ENOENT')continue;throw e;}const review=JSON.parse(reviewBytes);
  // Older failed preparation-only cohorts do not confer adoption authority.
  if(!output.rows.some(r=>r.state==='prepared-unreviewed')||!Array.isArray(review.rows)||!review.rows.some(r=>r.photoAccepted===true))continue;
  const baselineBytes=await get(dir+'/preflight-read-set.json'),baseline=JSON.parse(baselineBytes);
  for(const path of Object.keys(baseline.readSet.bindings).filter(p=>p.startsWith('.local/')&&p!==catalogPath&&p!==entry.scopePath&&p!==entry.preparePlanPath)){const bytes=await get(path);if(sha256(bytes)!==baseline.readSet.bindings[path])fail('REENTRY_READ_SET_CHANGED');}
  if(!output.postPreparationReadSetVerifiedAt||baseline.readSetSha256!==output.preflightReadSetSha256||sha256(JSON.stringify(baseline.readSet))!==baseline.readSetSha256||review.cohortId!==entry.cohortId||review.scopeSha256!==entry.scopeSha256||review.preparePlanSha256!==entry.preparePlanSha256||review.outputLedgerSha256!==sha256(outputBytes))fail('PREPARATION_PROOF');
  const resultPath='.local/setup/new-input-'+entry.cohortId+'-prepared.json',resultBytes=await get(resultPath),result=JSON.parse(resultBytes),owned=output.ownedPreparedOutputs.find(p=>p.path===resultPath);if(!owned||owned.sha256!==sha256(resultBytes))fail('RESULT_BYTES');
  for(const row of output.rows.filter(r=>r.state==='prepared-unreviewed')){
   const r=records.get(row.draftId),bindingBytes=await get(row.eligibilityBindingPath),complete=completeFinitePixelSpec(bundle,bindingBytes,row.eligibilityBindingSha256,baseline.readSet),association=bundle.preparePlan.photos.flatMap(p=>p.associations).find(a=>a.draftId===row.draftId&&a.disposition==='intended'),q=review.rows.find(q=>q.draftId===row.draftId),frozen=result.rows.find(q=>q.draftId===row.draftId);
   if(!r||!association||!equal(row,frozen)||!equal(row.pixelSpec,complete.pixelSpec)||row.pixelSpecSha256!==complete.pixelSpecSha256||row.rendererKeySha256!==sha256(JSON.stringify({version:'kiwa-campaign-new-alternate-background-grabcut-v3',sha:row.pixelSpec.sourceCrop.sha256,spec:row.pixelSpec})))fail('FROZEN_PIXEL');
   if(!q?.photoAccepted)continue;
   const proof={version:1,cohortId:entry.cohortId,scopeSha256:entry.scopeSha256,preparePlanSha256:entry.preparePlanSha256,eligibilityBindingSha256:row.eligibilityBindingSha256,preflightReadSetSha256:baseline.readSetSha256,outputLedgerSha256:sha256(outputBytes),processedReviewSha256:sha256(reviewBytes),pixelSpecSha256:row.pixelSpecSha256,rendererKeySha256:row.rendererKeySha256};
   Object.assign(r,{outputRow:row,association,photoReview:q,proof});
  }
 }
 return{records,files};
}
export async function assertFiniteBridgeFilesCurrent(snapshot){for(const f of snapshot.files)if(sha256(await readFile(f.path))!==f.sha256)fail('READ_SET_CHANGED');}
export function assertFiniteBridgeOriginal(record,rule,review){
 assertFiniteSourceMeaningEligible(record?.row?.draftId);
 const r=record,o=r?.outputRow,q=r?.photoReview;if(!o||!q||!equal(review.finiteCohortBinding,r.proof)||!equal(rule,r.association.sourceMeaningReview)||!equal(review.sourceCorrespondenceReview,r.association.sourceCorrespondenceReview)||!equal(review.pixelSpec,o.pixelSpec)||review.reviewedBy!==o.pixelSpec.sourceCrop.reviewedBy||review.reviewedAt!==o.pixelSpec.sourceCrop.reviewedAt)fail('ORIGINAL_BINDING');
 if(!q.processedReviewed||!q.reviewedBy?.trim()||!q.reason?.trim()||!Number.isFinite(Date.parse(q.reviewedAt))||!equal(q.hashes,o.hashes)||q.pixelSpecSha256!==o.pixelSpecSha256||q.rendererKeySha256!==o.rendererKeySha256||q.preparedTransformSha256!==sha256(JSON.stringify(o.preparedTransform))||q.sourcePhotoSha256!==o.pixelSpec.sourceCrop.sha256||!equal(q.crop,o.pixelSpec.sourceCrop.crop)||Date.parse(q.reviewedAt)<=Date.parse(o.finishedAt))fail('PHOTO_REVIEW');
 return r;
}
export function assertFiniteBridgePrepared(record,entry){const o=record?.outputRow,q=record?.photoReview;if(!o||!q||!equal(entry.preparedFiles,o.paths)||!equal(entry.preparedTransform,o.preparedTransform)||entry.originalMime!==o.originalMime||entry.width!==o.width||entry.height!==o.height||entry.mmPerPx!==o.mmPerPx||['original','high','medium','thumbnail'].some(k=>entry.reviewEnvelope.processed[k+'Sha256']!==o.hashes[k])||entry.reviewEnvelope.processed.reviewedAt!==q.reviewedAt||entry.reviewEnvelope.processed.reviewedBy!==q.reviewedBy||entry.reviewEnvelope.processed.reason!==q.reason)fail('PREPARED_BINDING');}

// Only exact approved siblings in one immutable cohort may share an original.
// Return prior sibling owners for live full Part/Asset/API/snapshot verification.
export function assertFiniteBridgePhotoAssets(entries,parts,assets){
 const prior=new Map(),ownRows=new Map(entries.map(e=>[e.draftId,parts.filter(p=>p.metadata?.sourceDraftId===e.draftId)]));
 const sameCohort=(a,b)=>{const x=a.spec.originalReview?.finiteCohortBinding,y=b.spec.originalReview?.finiteCohortBinding;return x?.version===1&&y?.version===1&&x.cohortId===y.cohortId&&x.scopeSha256===y.scopeSha256&&x.preparePlanSha256===y.preparePlanSha256;};
 const owns=(e,a)=>{const own=ownRows.get(e.draftId);return own.length===1&&!own[0].is_archived&&own[0].image_asset_id===a.id&&own[0].metadata?.nominalPlacement?.recipe==='kiwa-campaign-new-alternate-background-grabcut-v3'&&a.content_hash===e.reviewEnvelope.processed.highSha256&&equal(a.source_transform?.reviewEnvelope,e.reviewEnvelope);};
 for(const e of entries){const sha=e.spec.sourceCrop.sha256,own=ownRows.get(e.draftId);if(own.some(p=>p.is_archived||!equal(p.metadata?.nominalPlacement?.originalReview?.finiteCohortBinding,e.spec.originalReview.finiteCohortBinding)||p.metadata?.nominalPlacement?.sourceCrop?.sha256!==sha))fail('LIVE_SOURCE_SPEC_CONFLICT');
  for(const a of assets.filter(a=>JSON.stringify(a).includes(sha))){const owners=entries.filter(s=>s.spec.sourceCrop.sha256===sha&&owns(s,a));if(owners.length!==1)fail('LIVE_PHOTO_ASSET_CONFLICT');const owner=owners[0];if(owner.draftId!==e.draftId){if(!sameCohort(e,owner))fail('FOREIGN_COHORT_PHOTO');prior.set(a.id,{entry:owner,part:ownRows.get(owner.draftId)[0],asset:a});}}
 }return[...prior.values()];
}
