import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readJsonLines} from './read-jsonl.mjs';
import {sha256,sourceBinding} from './lib/registration-work.mjs';
import {createFiniteCatalog,assertFiniteCatalog,assertFiniteCohortBundle,appendFiniteCohort,assertPreparationReadSet,assertFiniteSourceReentry,bindFiniteEligibility,completeFinitePixelSpec,finiteUnitHash,legacyScopeHash} from './new-input-finite-cohort-catalog.mjs';

const json=x=>Buffer.from(JSON.stringify(x));
const unitBytes=await readFile('.local/setup/bulk-cutout-unit-001.json'),unit=JSON.parse(unitBytes);
const registryBytes=await readFile('.local/parts/parts.json');
const pointer=JSON.parse(await readFile('.local/calibration/nominal/campaign-current.json'));
const planBytes=await readFile(pointer.planPath),captures=new Map();
for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
const bindings={unitSha256:finiteUnitHash,registrySha256:sha256(registryBytes),planSha256:sha256(planBytes),workspaceId:unit.workspaceId};
const review={reviewed:true,reviewedBy:'Synthetic binding test only',reviewedAt:'2026-10-29T00:00:00Z',reason:'Not an image/source approval'};
function fixture(){
  const u=unit.rows[0],p=u.unprocessedAlternateCandidates[0];
  const crop={left:0,top:0,width:20,height:20},seeds={outer:[[6,6],[16,6],[16,16],[6,16]],core:[[9,9],[12,9],[12,12],[9,12]],background:[[[3,3],[5,3],[5,5],[3,5]]]};
  const rendererSpec={algorithmVersion:'nominal-new-input-background-seeded-grabcut-v3',runtimeBindingSha256:sha256('synthetic runtime'),widthMm:15,heightMm:17,photoRotationDegrees:0,sourceCrop:{...review,url:p.url,sha256:p.sha256,sourceWidth:p.pixelWidth,sourceHeight:p.pixelHeight,crop,coordinateConvention:'unrotated-decoded-raster-integer-pixels'},foregroundReview:{...review,originalSha256:p.sha256,crop,...seeds,material:'opaque-coloured-high-contrast',enclosedHoles:false,exteriorBackgroundReviewed:true,backgroundReviewed:true,backgroundReason:'Synthetic background seed'}};
  const pixelPlan={version:1,rendererSpec,attempts:[{crop,boxes:[{widthMm:15,heightMm:17}],seeds}]};
  const d=JSON.parse(registryBytes).parts.find(d=>d.id===u.draftId),c=captures.get(p.url),alternate={...sourceBinding(d,c),galleryIndex:p.galleryIndex,finalUrl:c.finalUrl,fetchedAt:c.fetchedAt};
  const sourceMeaningReview={...structuredClone(review),meaning:'whole-product-body',bodyReviewed:true,bodyQuote:d.description,sourceObjectSha256:u.sourceObjectSha256,descriptionSha256:sha256(d.description),rawLabel:d.sizeText,dimensions:{widthMm:15,heightMm:17},dimensionEvidenceKind:'own-body-label-and-description',diagramSha256:null};
  const sourceCorrespondenceReview={...structuredClone(review),draftId:d.id,variantId:d.variantId,sku:d.sku,colourFinishQuote:d.name,alternatePhotoBindingSha256:sha256(json(alternate))};
  const row={draftId:u.draftId,sourceObjectSha256:u.sourceObjectSha256,primaryPhotoSha256:u.frozenPrimaryPhotoSha256,alternatePhotoSha256:p.sha256,galleryIndex:p.galleryIndex,alternateUrl:p.url,pixelPlanSha256:sha256(json(pixelPlan)),sourceMeaningReviewSha256:sha256(json(sourceMeaningReview)),sourceCorrespondenceReviewSha256:sha256(json(sourceCorrespondenceReview))};
  const scope={version:2,cohortId:'cohort-0001',...bindings,rows:[row]};
  const prep={version:2,cohortId:scope.cohortId,scopeSha256:sha256(json(scope)),frozenAt:'2026-10-29T00:00:00Z',photos:[{sha256:p.sha256,associations:unit.rows.filter(r=>r.unprocessedAlternateCandidates.some(c=>c.sha256===p.sha256)).map(r=>r.draftId===u.draftId?{draftId:r.draftId,disposition:'intended',reason:'Synthetic intended row',originalReview:structuredClone(review),pixelPlan,pixelPlanSha256:row.pixelPlanSha256,sourceMeaningReviewSha256:row.sourceMeaningReviewSha256,sourceCorrespondenceReviewSha256:row.sourceCorrespondenceReviewSha256}:{draftId:r.draftId,disposition:'not-intended',reason:'Not included in synthetic fixture'})}]};
  Object.assign(prep.photos[0].associations.find(a=>a.disposition==='intended'),{sourceMeaningReview,sourceCorrespondenceReview});
  return {scope,prep};
}
function bundle(f=fixture()){
  f.prep.scopeSha256=sha256(json(f.scope));
  return assertFiniteCohortBundle({scopeBytes:json(f.scope),preparePlanBytes:json(f.prep),unitBytes,registryBytes,planBytes,captures});
}
function preflightFixture(b){
  const row=b.scope.rows[0],a=b.preparePlan.photos.flatMap(p=>p.associations).find(a=>a.disposition==='intended');
  const readSet={version:1,bindings:{...b.bindings,guardsFingerprint:sha256('guards'),salePolicySha256:sha256('sale'),negativeBindings:[{path:'.local/calibration/nominal/campaign-body-negative-inputs.json',sha256:sha256('oldNegative')},{path:'.local/calibration/nominal/new-input-cutout-negative-inputs.json',sha256:sha256('newNegative')}],processingRuntime:[{path:'.ai/evidence/new-input-grabcut-runtime-v3.json',sha256:a.pixelPlan.rendererSpec.runtimeBindingSha256}]},sql:{allParts:0,allAssets:0,assetsSha256:sha256('[]')},prepared:[]};
  const eligibility={reviewed:true,reviewedAt:'2026-10-29T00:01:00Z',held:false,registered:false,previouslyProcessed:false,ownAssociationVerified:true,originalSha256:row.alternatePhotoSha256,primarySha256:row.primaryPhotoSha256,evidence:{unitSha256:b.bindings.unitSha256,registrySha256:b.bindings.registrySha256,planSha256:b.bindings.planSha256,negativeSha256:sha256('oldNegative'),newNegativeSha256:sha256('newNegative'),guardsFingerprint:sha256('guards'),salePolicySha256:sha256('sale'),preparedIndexSha256:sha256(json([])),assetMetadataSha256:sha256('[]'),allParts:0,allAssets:0,preflightReadSetSha256:sha256(json(readSet)),sqlWrites:0}};
  return {readSet,eligibility,readSetHash:sha256(json(readSet))};
}

test('legacy fixed7 bytes remain pinned; binding catalog grants no wider source set',async()=>{
  assert.equal(sha256(await readFile('.local/calibration/nominal/background-v3-scope.json')),legacyScopeHash);
  const c=createFiniteCatalog(bindings);assert.equal(c.entries.length,1);
  assertFiniteCatalog(c,bindings);
  c.entries[0].scopeSha256=sha256('changed');assert.throws(()=>assertFiniteCatalog(c,bindings),/CATALOG/);
});
test('append is sequential, immutable prefix, hash chain and no mutable state',()=>{
  const c=createFiniteCatalog(bindings),next=appendFiniteCohort(c,bundle(),'2026-10-29T00:01:00Z');
  assert.equal(c.entries.length,1);assert.equal(next.entries.length,2);
  for(const mutate of [x=>x.entries[0].scopeSha256=sha256('changed'),x=>x.entries[1].previousEntrySha256=sha256('changed'),x=>x.entries[1].state='verified',x=>x.entries[1].scopePath='../scope.json']){
    const x=structuredClone(next);mutate(x);assert.throws(()=>assertFiniteCatalog(x,bindings,c),/CATALOG|PREFIX_CHANGED|ENTRY/);
  }
  assert.throws(()=>appendFiniteCohort(next,bundle(),'2026-10-29T00:02:00Z'),/SEQUENCE/);
});
test('scope is exact unit source, own variant/photo and review binding',()=>{
  bundle();
  for(const mutate of [f=>f.scope.rows[0].draftId='foreign',f=>f.scope.rows[0].alternatePhotoSha256=f.scope.rows[0].primaryPhotoSha256,f=>f.scope.rows[0].galleryIndex=0,f=>f.scope.rows[0].sourceObjectSha256=sha256('foreign'),f=>f.scope.rows[0].pixelPlanSha256=sha256('changed')]){
    const f=fixture();mutate(f);assert.throws(()=>bundle(f),/FINITE_COHORT_/);
  }
});
test('missing sibling, missing review and duplicate intended association fail closed',()=>{
  for(const mutate of [f=>f.prep.photos[0].associations.pop(),f=>f.prep.photos[0].associations.find(a=>a.disposition==='intended').originalReview.reviewed=false,f=>f.prep.photos[0].associations.push(f.prep.photos[0].associations[0])]){
    const f=fixture();mutate(f);assert.throws(()=>bundle(f),/MISSING_SIBLING|INTENDED_REVIEW|ASSOCIATIONS/);
  }
});
test('scope/source and whole unit/registry/plan bytes cannot change silently',()=>{
  const b=bundle(),args={scopeBytes:json(b.scope),preparePlanBytes:json(b.preparePlan),unitBytes,registryBytes,planBytes,captures};
  for(const k of ['unitBytes','registryBytes','planBytes'])assert.throws(()=>assertFiniteCohortBundle({...args,[k]:Buffer.concat([args[k],Buffer.from(' ')])}),/UNIT_BYTES|SCOPE/);
});
test('snapshot allows only declared exact newly prepared outputs; external changes rejected',()=>{
  const before={version:1,bindings:{unitSha256:finiteUnitHash,negativeSha256:sha256('negative')},sql:{partsSha256:sha256('oldParts'),assetsSha256:sha256('oldAssets')},prepared:[{path:'.local/setup/old-prepared.json',sha256:sha256('old')}]};
  const owned=[{path:'.local/setup/cohort-new-prepared.json',sha256:sha256('new')}];
  const live={...structuredClone(before),prepared:[...before.prepared,...owned]};
  assert.equal(assertPreparationReadSet(before,live,owned),true);
  for(const mutate of [x=>x.bindings.negativeSha256=sha256('changed'),x=>x.sql.assetsSha256=sha256('external'),x=>x.prepared[0].sha256=sha256('changed'),x=>x.prepared.push({path:'.local/setup/foreign-prepared.json',sha256:sha256('foreign')}),x=>x.prepared.pop()]){
    const x=structuredClone(live);mutate(x);assert.throws(()=>assertPreparationReadSet(before,x,owned),/READ_SET|PREPARED_CHANGED|OUTPUT_SET/);
  }
  assert.throws(()=>assertPreparationReadSet(before,live,[...owned,...owned]),/OUTPUT_SET/);
});

test('frozen pixel plan excludes eligibility and tampered seeds/BOX cannot pass its hash',()=>{
  const f=fixture();assert.equal(Object.hasOwn(f.prep.photos[0].associations[0].pixelPlan.rendererSpec,'eligibility'),false);
  for(const mutate of [p=>p.rendererSpec.eligibility={},p=>p.rendererSpec.widthMm=14,p=>p.rendererSpec.foregroundReview.core[0][0]++,p=>p.attempts.push(p.attempts[0])]){
    const x=fixture();mutate(x.prep.photos[0].associations.find(a=>a.disposition==='intended').pixelPlan);assert.throws(()=>bundle(x),/PIXEL_PLAN/);
  }
});

test('preflight binding projects a new pixelSpec without changing the frozen plan',()=>{
  const b=bundle(),row=b.scope.rows[0],before=sha256(json(b.preparePlan));
  const {eligibility,readSet,readSetHash}=preflightFixture(b);
  const binding=bindFiniteEligibility(b,row.draftId,eligibility,readSetHash,'2026-10-29T00:01:01Z',readSet),bytes=json(binding);
  const result=completeFinitePixelSpec(b,bytes,sha256(bytes),readSet);
  assert.deepEqual(result.pixelSpec.eligibility,eligibility);assert.equal(before,sha256(json(b.preparePlan)));
  assert.equal(Object.keys(result.pixelSpec).at(-1),'eligibility');
  const changed=structuredClone(binding);changed.boundAt='2026-10-29T00:01:02Z';assert.throws(()=>completeFinitePixelSpec(b,json(changed),sha256(bytes),readSet),/BINDING_BYTES/);
  changed.cohortId='cohort-9999';assert.throws(()=>completeFinitePixelSpec(b,json(changed),sha256(json(changed)),readSet),/BINDING/);
  assert.throws(()=>bindFiniteEligibility(b,row.draftId,{...eligibility,registered:true},readSetHash,binding.boundAt,readSet),/ELIGIBILITY_BINDING/);
});

test('same source reentry needs immutable terminal closure and a different fresh original',()=>{
  const draftId='test-source',old=sha256('old'),fresh=sha256('fresh');
  const p={draftId,cohortId:'cohort-0001',scopeSha256:sha256('scope'),preparePlanSha256:sha256('plan'),alternatePhotoSha256:old,cropSignatures:[sha256('crop')],preparedOutputs:[]};
  const receipt={version:1,state:'terminal-failure',cohortId:p.cohortId,draftId,scopeSha256:p.scopeSha256,preparePlanSha256:p.preparePlanSha256,originalSha256:old,cropSignatures:p.cropSignatures,preparedOutputs:[],negativeFingerprint:sha256('negative'),negativeHistoryPrefixSha256:sha256('prefix'),reason:'Synthetic failure',closedAt:'2026-10-29T00:00:00Z',adopted:false,registered:false,resumable:false,liveSourceParts:0,liveSourceAssets:0};
  const bytes=json(receipt),closures=new Map([[p.cohortId+':'+draftId,{bytes,sha256:sha256(bytes)}]]);
  const args={draftId,newOriginalSha256:fresh,priorRows:[p],closures,liveParts:[],liveAssets:[]};
  assert.equal(assertFiniteSourceReentry(args),true);
  assert.throws(()=>assertFiniteSourceReentry({...args,newOriginalSha256:old}),/REENTRY_ORIGINAL/);
  assert.throws(()=>assertFiniteSourceReentry({...args,closures:new Map()}),/CLOSURE_BYTES/);
  assert.throws(()=>assertFiniteSourceReentry({...args,liveParts:[{metadata:{sourceDraftId:draftId}}]}),/REENTRY_LIVE/);
  assert.throws(()=>assertFiniteSourceReentry({...args,occupiedOriginals:[fresh]}),/REENTRY_LIVE/);
  const bad=json({...receipt,resumable:true});assert.throws(()=>assertFiniteSourceReentry({...args,closures:new Map([[p.cohortId+':'+draftId,{bytes:bad,sha256:sha256(bad)}]])}),/TERMINAL_CLOSURE/);
});

test('a rehashed false meaning or foreign SKU review still cannot authorize preparation',()=>{
  for(const [field,mutation] of [['sourceMeaningReview',r=>r.bodyReviewed=false],['sourceMeaningReview',r=>r.bodyQuote='fabricated body quote'],['sourceCorrespondenceReview',r=>r.sku='foreign']]){
    const f=fixture(),a=f.prep.photos[0].associations.find(a=>a.disposition==='intended');mutation(a[field]);a[field+'Sha256']=sha256(json(a[field]));f.scope.rows[0][field+'Sha256']=a[field+'Sha256'];assert.throws(()=>bundle(f),/SOURCE_MEANING|SOURCE_CORRESPONDENCE/);
  }
});

test('inner eligibility evidence must agree with the full shared read-set even after rehashing sidecars',()=>{
  const b=bundle(),{readSet,eligibility,readSetHash}=preflightFixture(b),id=b.scope.rows[0].draftId;
  const good=bindFiniteEligibility(b,id,eligibility,readSetHash,'2026-10-29T00:01:01Z',readSet);
  for(const field of ['preflightReadSetSha256','negativeSha256','newNegativeSha256','guardsFingerprint','salePolicySha256','preparedIndexSha256','assetMetadataSha256','allParts','allAssets','sqlWrites']){
    const e=structuredClone(eligibility);e.evidence[field]=typeof e.evidence[field]==='number'?1:sha256('contradictory');
    assert.throws(()=>bindFiniteEligibility(b,id,e,readSetHash,'2026-10-29T00:01:01Z',readSet),/READ_SET_EVIDENCE/);
    const bytes=json({...good,eligibility:e});assert.throws(()=>completeFinitePixelSpec(b,bytes,sha256(bytes),readSet),/READ_SET_EVIDENCE/);
  }
});
