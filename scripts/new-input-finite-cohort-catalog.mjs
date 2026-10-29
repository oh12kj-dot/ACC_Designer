// Staged foundation only: no renderer, bridge membership or SQL writer imports.
import {isDeepStrictEqual as equal} from 'node:util';
import {readFile} from 'node:fs/promises';
import {sha256, saveLedger,sourceBinding} from './lib/registration-work.mjs';

export const finiteUnitHash='395443093e7f71ed2db99044dc54bfc70dc324f3bf4d40b45395d21ee7708c47';
export const legacyScopeHash='0da497868c81950b1d4c3e3b621cd6d637c1a876cd07eaafec98dbdeee2ce670';
export const finiteCohortStage='preparation-registration-terminal-machine-failure-reentry';
const hashObject=o=>sha256(JSON.stringify(o));
const fail=code=>{throw Error('FINITE_COHORT_'+code);};
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const instant=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
const scopePath=s=>typeof s==='string'&&/^\.local\/calibration\/nominal\/new-input-cohorts\/cohort-\d{4}\/(scope|prepare-plan)\.json$/.test(s);
const unique=xs=>new Set(xs).size===xs.length;
const review=r=>r?.reviewed===true&&r.reviewedBy?.trim()&&instant(r.reviewedAt)&&r.reason?.trim();

export function createFiniteCatalog(bindings){
  if(!bindings||!equal(Object.keys(bindings).sort(),['planSha256','registrySha256','unitSha256','workspaceId'])||bindings.unitSha256!==finiteUnitHash||!hash(bindings.planSha256)||!hash(bindings.registrySha256)||!bindings.workspaceId?.trim())fail('BINDINGS');
  return {version:1,...bindings,entries:[{version:1,kind:'legacy',cohortId:'legacy-fixed7',scopePath:'.local/calibration/nominal/background-v3-scope.json',scopeSha256:legacyScopeHash,previousEntrySha256:null}]};
}

export function assertFiniteCatalog(catalog,bindings,prior=null){
  const initial=createFiniteCatalog(bindings);
  if(catalog?.version!==1||!equal(Object.fromEntries(Object.keys(bindings).map(k=>[k,catalog[k]])),bindings)||!Array.isArray(catalog.entries)||!equal(catalog.entries[0],initial.entries[0]))fail('CATALOG');
  if(prior&&(!equal(catalog.entries.slice(0,prior.entries.length),prior.entries)||catalog.entries.length<prior.entries.length))fail('PREFIX_CHANGED');
  for(let i=1;i<catalog.entries.length;i++){
    const e=catalog.entries[i];
    if(e?.version!==1||e.kind!=='finite'||e.cohortId!=='cohort-'+String(i).padStart(4,'0')||e.previousEntrySha256!==hashObject(catalog.entries[i-1])||!instant(e.createdAt)||!scopePath(e.scopePath)||!scopePath(e.preparePlanPath)||e.scopePath!==`.local/calibration/nominal/new-input-cohorts/${e.cohortId}/scope.json`||e.preparePlanPath!==`.local/calibration/nominal/new-input-cohorts/${e.cohortId}/prepare-plan.json`||!hash(e.scopeSha256)||!hash(e.preparePlanSha256)||Object.hasOwn(e,'state'))fail('ENTRY');
  }
  return catalog;
}

// Full semantic/photographic acceptance remains the existing source and image review.
// This validator binds its exact reviewed inputs; syntax alone never grants membership.
export function assertFiniteCohortBundle({scopeBytes,preparePlanBytes,unitBytes,registryBytes,planBytes,captures}){
  if(sha256(unitBytes)!==finiteUnitHash)fail('UNIT_BYTES');
  const unit=JSON.parse(unitBytes),registry=JSON.parse(registryBytes),scope=JSON.parse(scopeBytes),prep=JSON.parse(preparePlanBytes);
  if(scope?.version!==2||!/^cohort-\d{4}$/.test(scope.cohortId)||scope.unitSha256!==finiteUnitHash||scope.registrySha256!==sha256(registryBytes)||scope.registrySha256!==unit.registrySha256||scope.planSha256!==sha256(planBytes)||scope.planSha256!==unit.planSha256||scope.workspaceId!==unit.workspaceId||!Array.isArray(scope.rows)||!scope.rows.length||scope.rows.length>1000||!unique(scope.rows.map(r=>r.draftId)))fail('SCOPE');
  const plan=JSON.parse(planBytes);
  if(plan.workspaceId!==unit.workspaceId||prep.version!==2||prep.cohortId!==scope.cohortId||prep.scopeSha256!==sha256(scopeBytes)||!instant(prep.frozenAt)||!Array.isArray(prep.photos)||!unique(prep.photos.map(p=>p.sha256)))fail('PREPARE_PLAN');
  const drafts=new Map(registry.parts.map(d=>[d.id,d])),sources=new Map(unit.rows.map(r=>[r.draftId,r]));
  const intended=new Map();
  for(const photo of prep.photos){
    if(!hash(photo.sha256)||!Array.isArray(photo.associations)||!unique(photo.associations.map(a=>a.draftId)))fail('ASSOCIATIONS');
    const related=unit.rows.filter(r=>r.unprocessedAlternateCandidates.some(c=>c.sha256===photo.sha256)).map(r=>r.draftId).sort();
    if(!equal(photo.associations.map(a=>a.draftId).sort(),related))fail('MISSING_SIBLING');
    for(const a of photo.associations){
      if(!['intended','ineligible','not-intended'].includes(a.disposition)||!a.reason?.trim())fail('DISPOSITION');
      if(a.disposition==='intended'){
        if(intended.has(a.draftId)||!hash(a.pixelPlanSha256)||!hash(a.sourceMeaningReviewSha256)||!hash(a.sourceCorrespondenceReviewSha256)||!review(a.originalReview))fail('INTENDED_REVIEW');
        assertFinitePixelPlan(a.pixelPlan,a.pixelPlanSha256);
        intended.set(a.draftId,{photoSha256:photo.sha256,...a});
      }
    }
  }
  if(!equal([...intended.keys()].sort(),scope.rows.map(r=>r.draftId).sort()))fail('INTENDED_SET');
  for(const row of scope.rows){
    const u=sources.get(row.draftId),d=drafts.get(row.draftId),a=intended.get(row.draftId),c=captures.get(row.alternateUrl),primary=captures.get(d?.imageUrls[0]);
    const member=u?.unprocessedAlternateCandidates.find(p=>p.sha256===row.alternatePhotoSha256&&p.url===row.alternateUrl&&p.galleryIndex===row.galleryIndex);
    if(!u||!d||!member||row.sourceObjectSha256!==u.sourceObjectSha256||row.sourceObjectSha256!==hashObject(d)||row.primaryPhotoSha256!==u.frozenPrimaryPhotoSha256||row.primaryPhotoSha256!==primary?.sha256||row.alternatePhotoSha256===row.primaryPhotoSha256||a.photoSha256!==row.alternatePhotoSha256||d.imageUrls[row.galleryIndex]!==row.alternateUrl||c?.sha256!==row.alternatePhotoSha256||!c.productIds?.includes(d.productId)||!Number.isSafeInteger(row.galleryIndex)||row.galleryIndex<1)fail('OWN_SOURCE');
    if(['pixelPlanSha256','sourceMeaningReviewSha256','sourceCorrespondenceReviewSha256'].some(k=>!hash(row[k])||row[k]!==a[k]))fail('REVIEW_BINDING');
    const s=a.pixelPlan.rendererSpec;
    if(s.sourceCrop.sha256!==row.alternatePhotoSha256||s.sourceCrop.url!==row.alternateUrl||s.sourceCrop.sourceWidth!==c.pixelWidth||s.sourceCrop.sourceHeight!==c.pixelHeight)fail('PIXEL_SOURCE');
    const m=a.sourceMeaningReview,q=a.sourceCorrespondenceReview;
    if(!review(m)||hashObject(m)!==row.sourceMeaningReviewSha256||m.meaning!=='whole-product-body'||m.bodyReviewed!==true||!m.bodyQuote?.trim()||!d.description.includes(m.bodyQuote)||m.sourceObjectSha256!==row.sourceObjectSha256||m.descriptionSha256!==sha256(d.description)||m.rawLabel!==d.sizeText||m.dimensions?.widthMm!==s.widthMm||m.dimensions?.heightMm!==s.heightMm||m.dimensionEvidenceKind!=='own-body-label-and-description'||m.diagramSha256!==null)fail('SOURCE_MEANING');
    const alternate={...sourceBinding(d,c),galleryIndex:row.galleryIndex,finalUrl:c.finalUrl,fetchedAt:c.fetchedAt};
    if(!primary.productIds?.includes(d.productId)||!c.finalUrl?.trim()||!instant(c.fetchedAt)||!review(q)||hashObject(q)!==row.sourceCorrespondenceReviewSha256||q.draftId!==d.id||q.variantId!==d.variantId||q.sku!==d.sku||!q.colourFinishQuote?.trim()||!d.name.includes(q.colourFinishQuote)||q.alternatePhotoBindingSha256!==hashObject(alternate))fail('SOURCE_CORRESPONDENCE');
    if([m.reviewedAt,q.reviewedAt,a.originalReview.reviewedAt,s.sourceCrop.reviewedAt,s.foregroundReview.reviewedAt].some(t=>Date.parse(t)>Date.parse(prep.frozenAt))||s.sourceCrop.reviewedAt!==a.originalReview.reviewedAt)fail('REVIEW_CHRONOLOGY');
  }
  return {scope,preparePlan:prep,bindings:{unitSha256:finiteUnitHash,registrySha256:sha256(registryBytes),planSha256:sha256(planBytes),workspaceId:unit.workspaceId},scopeSha256:sha256(scopeBytes),preparePlanSha256:sha256(preparePlanBytes)};
}

// The first staged implementation accepts one frozen attempt per intended source.
// Multiple planned attempts need an explicit executor before they can be accepted.
export function assertFinitePixelPlan(pixelPlan,expectedHash){
  const p=pixelPlan,s=p?.rendererSpec,c=s?.sourceCrop?.crop,r=s?.foregroundReview;
  if(p?.version!==1||hashObject(p)!==expectedHash||!s||Object.hasOwn(s,'eligibility')||s.algorithmVersion!=='nominal-new-input-background-seeded-grabcut-v3'||!hash(s.runtimeBindingSha256)||s.photoRotationDegrees!==0||![s.widthMm,s.heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-6)||Math.max(s.widthMm/s.heightMm,s.heightMm/s.widthMm)>4||!c||!review({...s.sourceCrop,reason:'source crop review'})||!review({...r,reason:r?.reason??'foreground review'})||r.enclosedHoles!==false||r.backgroundReviewed!==true||!r.backgroundReason?.trim()||!r.exteriorBackgroundReviewed||!Array.isArray(p.attempts)||p.attempts.length!==1)fail('PIXEL_PLAN');
  const a=p.attempts[0];
  if(!equal(a,{crop:c,boxes:[{widthMm:s.widthMm,heightMm:s.heightMm}],seeds:{outer:r.outer,core:r.core,background:r.background}}))fail('ATTEMPT');
  if(['left','top','width','height'].some(k=>!Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<8||c.height<8||c.left+c.width>s.sourceCrop.sourceWidth||c.top+c.height>s.sourceCrop.sourceHeight||r.originalSha256!==s.sourceCrop.sha256||!equal(r.crop,c)||!['opaque-coloured-high-contrast','opaque-white-clear-contour'].includes(r.material)||r.material==='opaque-white-clear-contour'&&(!r.boundaryReviewed||!r.reason?.trim()))fail('PIXEL_REVIEW');
  if(!Array.isArray(r.background)||r.background.length<1||r.background.length>16||[r.outer,r.core,...r.background].some(poly=>!Array.isArray(poly)||poly.length<3||poly.length>16||poly.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isSafeInteger(n))||v[0]<=1||v[1]<=1||v[0]>=c.width-2||v[1]>=c.height-2)))fail('PIXEL_SEEDS');
  return p;
}

function intendedAssociation(bundle,id){
  const row=bundle.scope.rows.find(r=>r.draftId===id),a=bundle.preparePlan.photos.flatMap(p=>p.associations).find(a=>a.draftId===id&&a.disposition==='intended');
  if(!row||!a||row.pixelPlanSha256!==a.pixelPlanSha256)fail('BINDING_SOURCE');
  assertFinitePixelPlan(a.pixelPlan,a.pixelPlanSha256);
  return {row,association:a};
}

export function assertEligibilityReadSetEvidence(eligibility,readSet,preflightReadSetSha256){
  const b=readSet?.bindings,q=readSet?.sql,old=b?.negativeBindings?.find(x=>x.path==='.local/calibration/nominal/campaign-body-negative-inputs.json'),recent=b?.negativeBindings?.find(x=>x.path==='.local/calibration/nominal/new-input-cutout-negative-inputs.json');
  if(readSet?.version!==1||hashObject(readSet)!==preflightReadSetSha256||!old||!recent||!Array.isArray(readSet.prepared)||!Number.isSafeInteger(q?.allParts)||q.allParts<0||!Number.isSafeInteger(q?.allAssets)||q.allAssets<0)fail('READ_SET_EVIDENCE');
  const expected={unitSha256:b.unitSha256,registrySha256:b.registrySha256,planSha256:b.planSha256,negativeSha256:old.sha256,newNegativeSha256:recent.sha256,guardsFingerprint:b.guardsFingerprint,salePolicySha256:b.salePolicySha256,preparedIndexSha256:hashObject(readSet.prepared),assetMetadataSha256:q.assetsSha256,allParts:q.allParts,allAssets:q.allAssets,preflightReadSetSha256,sqlWrites:0};
  if(!equal(eligibility?.evidence,expected))fail('READ_SET_EVIDENCE');
}

export function bindFiniteEligibility(bundle,draftId,eligibility,preflightReadSetSha256,boundAt,readSet){
  const {row,association}=intendedAssociation(bundle,draftId),e=eligibility;
  if(!hash(preflightReadSetSha256)||!instant(boundAt)||!instant(e?.reviewedAt)||Date.parse(boundAt)<Date.parse(e.reviewedAt)||Date.parse(e.reviewedAt)<Date.parse(association.originalReview.reviewedAt)||e.reviewed!==true||e.held!==false||e.registered!==false||e.previouslyProcessed!==false||e.ownAssociationVerified!==true||e.originalSha256!==row.alternatePhotoSha256||e.primarySha256!==row.primaryPhotoSha256||e.evidence?.unitSha256!==bundle.bindings.unitSha256||e.evidence.registrySha256!==bundle.bindings.registrySha256||e.evidence.planSha256!==bundle.bindings.planSha256)fail('ELIGIBILITY_BINDING');
  assertEligibilityReadSetEvidence(e,readSet,preflightReadSetSha256);
  if(readSet.bindings.processingRuntime?.find(r=>r.path==='.ai/evidence/new-input-grabcut-runtime-v3.json')?.sha256!==association.pixelPlan.rendererSpec.runtimeBindingSha256)fail('READ_SET_RUNTIME');
  return {version:1,cohortId:bundle.scope.cohortId,scopeSha256:bundle.scopeSha256,preparePlanSha256:bundle.preparePlanSha256,draftId,pixelPlanSha256:row.pixelPlanSha256,preflightReadSetSha256,eligibility:structuredClone(e),boundAt};
}

export function completeFinitePixelSpec(bundle,bindingBytes,expectedBindingSha256,readSet){
  if(sha256(bindingBytes)!==expectedBindingSha256)fail('BINDING_BYTES');
  const b=JSON.parse(bindingBytes),expected=bindFiniteEligibility(bundle,b.draftId,b.eligibility,b.preflightReadSetSha256,b.boundAt,readSet);
  if(!equal(b,expected))fail('BINDING');
  const {association}=intendedAssociation(bundle,b.draftId);
  const pixelSpec={...association.pixelPlan.rendererSpec,eligibility:b.eligibility};
  return {pixelSpec,pixelSpecSha256:hashObject(pixelSpec),eligibilityBindingSha256:expectedBindingSha256};
}

// A closure must be independently loaded from immutable evidence by the future
// catalog loader. A mutable journal 'failed' flag is deliberately insufficient.
export function assertFiniteSourceReentry({draftId,newOriginalSha256,priorRows,closures,liveParts,liveAssets,occupiedOriginals=[]}){
  if(!hash(newOriginalSha256)||!Array.isArray(priorRows)||!Array.isArray(liveParts)||!Array.isArray(liveAssets)||occupiedOriginals.includes(newOriginalSha256)||liveParts.some(p=>(p.metadata?.sourceDraftId??p.metadata?.nominalPlacement?.sourceDraftId)===draftId)||liveAssets.some(a=>JSON.stringify(a).includes(draftId)||JSON.stringify(a).includes(newOriginalSha256)))fail('REENTRY_LIVE');
  for(const p of priorRows){
    if(p.draftId!==draftId||p.alternatePhotoSha256===newOriginalSha256)fail('REENTRY_ORIGINAL');
    const stored=closures.get(p.cohortId+':'+draftId);
    if(!stored||sha256(stored.bytes)!==stored.sha256)fail('CLOSURE_BYTES');
    const c=JSON.parse(stored.bytes);
    if(c.version!==1||c.state!=='terminal-failure'||c.cohortId!==p.cohortId||c.draftId!==draftId||c.scopeSha256!==p.scopeSha256||c.preparePlanSha256!==p.preparePlanSha256||c.originalSha256!==p.alternatePhotoSha256||!c.reason?.trim()||!instant(c.closedAt)||!equal(c.cropSignatures,p.cropSignatures)||!Array.isArray(c.cropSignatures)||!c.cropSignatures.length||c.cropSignatures.some(s=>!hash(s))||!hash(c.negativeFingerprint)||!hash(c.negativeHistoryPrefixSha256)||!equal(c.preparedOutputs,p.preparedOutputs)||c.adopted!==false||c.registered!==false||c.resumable!==false||c.liveSourceParts!==0||c.liveSourceAssets!==0)fail('TERMINAL_CLOSURE');
  }
  return true;
}

export function appendFiniteCohort(catalog,bundle,createdAt){
  assertFiniteCatalog(catalog,bundle.bindings);
  const id='cohort-'+String(catalog.entries.length).padStart(4,'0');
  if(bundle.scope.cohortId!==id||!instant(createdAt))fail('SEQUENCE');
  const next=structuredClone(catalog);
  next.entries.push({version:1,kind:'finite',cohortId:id,scopePath:`.local/calibration/nominal/new-input-cohorts/${id}/scope.json`,scopeSha256:bundle.scopeSha256,preparePlanPath:`.local/calibration/nominal/new-input-cohorts/${id}/prepare-plan.json`,preparePlanSha256:bundle.preparePlanSha256,previousEntrySha256:hashObject(catalog.entries.at(-1)),createdAt});
  return assertFiniteCatalog(next,bundle.bindings,catalog);
}

// One append per CAS. A concurrently changed catalog cannot be overwritten.
export async function saveFiniteCatalogAppend(path,next,bindings,expectedBytes){
  const previous=JSON.parse(expectedBytes);
  assertFiniteCatalog(previous,bindings);
  assertFiniteCatalog(next,bindings,previous);
  if(next.entries.length!==previous.entries.length+1)fail('APPEND_COUNT');
  const e=next.entries.at(-1);
  if(sha256(await readFile(e.scopePath))!==e.scopeSha256||sha256(await readFile(e.preparePlanPath))!==e.preparePlanSha256)fail('BUNDLE_BYTES');
  return saveLedger(path,next,sha256(expectedBytes));
}

export function assertPreparationReadSet(before,live,ownedOutputs=[]){
  if(before?.version!==1||live?.version!==1||!equal(before.bindings,live.bindings)||!equal(before.sql,live.sql)||!Array.isArray(before.prepared)||!Array.isArray(live.prepared)||!Array.isArray(ownedOutputs))fail('READ_SET');
  for(const x of [...before.prepared,...live.prepared,...ownedOutputs])if(!x.path?.startsWith('.local/setup/')||x.path.includes('..')||!hash(x.sha256))fail('PREPARED_BINDING');
  const base=new Map(before.prepared.map(x=>[x.path,x.sha256])),outputs=new Map(ownedOutputs.map(x=>[x.path,x.sha256]));
  if(base.size!==before.prepared.length||outputs.size!==ownedOutputs.length||live.prepared.length!==base.size+outputs.size||ownedOutputs.some(x=>base.has(x.path)))fail('OUTPUT_SET');
  const expected=new Map([...base,...outputs]);
  if(new Set(live.prepared.map(x=>x.path)).size!==live.prepared.length||live.prepared.some(x=>expected.get(x.path)!==x.sha256))fail('PREPARED_CHANGED');
  return true;
}
