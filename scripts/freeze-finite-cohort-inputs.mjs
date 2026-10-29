import{assertFiniteSourceMeaningEligible}from'./finite-source-meaning-holds.mjs';
// Generic V3 finite-data builder, no pixels or SQL writes. It never infers a
// photograph/body review: exact reviewed source rows must be supplied explicitly.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readJsonLines} from './read-jsonl.mjs';
import {sha256,sourceBinding} from './lib/registration-work.mjs';
import {campaignBodyDimensions} from './campaign-body-bridge.mjs';
import {createFiniteCatalog,assertFiniteCohortBundle,appendFiniteCohort,saveFiniteCatalogAppend} from './new-input-finite-cohort-catalog.mjs';
const json=x=>Buffer.from(JSON.stringify(x,null,2));
export async function freezeFiniteCohortInputs(reviewPath){
  if(!/^\.local\/setup\/[a-z0-9-]+\.json$/.test(reviewPath))throw Error('FINITE_FREEZE_PATH');
  const reviewed=JSON.parse(await readFile(reviewPath)),cohortId=reviewed.cohortId;
  if(reviewed.version!==1||!reviewed.reviewed||!reviewed.reviewedBy?.trim()||!Number.isFinite(Date.parse(reviewed.reviewedAt))||!/^cohort-\d{4}$/.test(cohortId)||!Array.isArray(reviewed.rows)||!reviewed.rows.length||reviewed.rows.length>1000||new Set(reviewed.rows.map(r=>r.draftId)).size!==reviewed.rows.length)throw Error('FINITE_FREEZE_REVIEW');
  for(const row of reviewed.rows)assertFiniteSourceMeaningEligible(row.draftId);
  const ub=await readFile('.local/setup/bulk-cutout-unit-001.json'),unit=JSON.parse(ub),rb=await readFile('.local/parts/parts.json'),registry=JSON.parse(rb),pointer=JSON.parse(await readFile('.local/calibration/nominal/campaign-current.json')),pb=await readFile(pointer.planPath),captures=new Map();
  for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
  const rows=[],photos=[];const runtimeSha=sha256(await readFile('.ai/evidence/new-input-grabcut-runtime-v3.json'));
  for(const sha of new Set(reviewed.rows.map(r=>r.photoSha256))){
    const associations=[];
    for(const u of unit.rows.filter(u=>u.unprocessedAlternateCandidates.some(p=>p.sha256===sha))){
      const r=reviewed.rows.find(r=>r.draftId===u.draftId&&r.photoSha256===sha);
      if(!r){associations.push({draftId:u.draftId,disposition:'not-intended',reason:'No exact source/native/crop review supplied for this association; no crop or processing is planned.'});continue;}
      const d=registry.parts.find(d=>d.id===r.draftId),candidate=u.unprocessedAlternateCandidates.find(p=>p.sha256===sha),c=captures.get(candidate.url),primary=captures.get(d.imageUrls[0]),first=sourceBinding(d,primary),alternate={...sourceBinding(d,c),galleryIndex:candidate.galleryIndex,finalUrl:c.finalUrl,fetchedAt:c.fetchedAt},dims=campaignBodyDimensions(d),meta={reviewed:true,reviewedBy:reviewed.reviewedBy,reviewedAt:reviewed.reviewedAt,reason:r.reason};
      const sourceMeaningReview={...meta,meaning:'whole-product-body',bodyReviewed:true,bodyQuote:r.bodyQuote,sourceObjectSha256:first.sourceObjectSha256,descriptionSha256:first.descriptionSha256,rawLabel:d.sizeText,dimensions:dims,dimensionEvidenceKind:'own-body-label-and-description',diagramSha256:null},sourceCorrespondenceReview={...meta,draftId:d.id,variantId:d.variantId,sku:d.sku,colourFinishQuote:r.colourFinishQuote,alternatePhotoBindingSha256:sha256(JSON.stringify(alternate))},seeds={outer:r.outer,core:r.core,background:r.background};
      const rendererSpec={algorithmVersion:'nominal-new-input-background-seeded-grabcut-v3',runtimeBindingSha256:runtimeSha,widthMm:dims.widthMm,heightMm:dims.heightMm,photoRotationDegrees:0,sourceCrop:{url:c.url,sha256:sha,sourceWidth:c.pixelWidth,sourceHeight:c.pixelHeight,crop:r.crop,reviewed:true,reviewedBy:meta.reviewedBy,reviewedAt:meta.reviewedAt,coordinateConvention:'unrotated-decoded-raster-integer-pixels'},foregroundReview:{...meta,originalSha256:sha,crop:r.crop,...seeds,material:r.material,boundaryReviewed:r.boundaryReviewed===true,enclosedHoles:false,exteriorBackgroundReviewed:true,backgroundReviewed:true,backgroundReason:r.backgroundReason}},pixelPlan={version:1,rendererSpec,attempts:[{crop:r.crop,boxes:[{widthMm:dims.widthMm,heightMm:dims.heightMm}],seeds}]},pixelPlanSha256=sha256(JSON.stringify(pixelPlan)),sourceMeaningReviewSha256=sha256(JSON.stringify(sourceMeaningReview)),sourceCorrespondenceReviewSha256=sha256(JSON.stringify(sourceCorrespondenceReview));
      rows.push({draftId:d.id,sourceObjectSha256:u.sourceObjectSha256,primaryPhotoSha256:u.frozenPrimaryPhotoSha256,alternatePhotoSha256:sha,galleryIndex:candidate.galleryIndex,alternateUrl:candidate.url,pixelPlanSha256,sourceMeaningReviewSha256,sourceCorrespondenceReviewSha256});
      associations.push({draftId:d.id,disposition:'intended',reason:r.reason,originalReview:meta,pixelPlan,pixelPlanSha256,sourceMeaningReview,sourceMeaningReviewSha256,sourceCorrespondenceReview,sourceCorrespondenceReviewSha256});
    }
    photos.push({sha256:sha,associations});
  }
  if(rows.length!==reviewed.rows.length)throw Error('FINITE_FREEZE_SOURCE_SET');
  const bindings={unitSha256:sha256(ub),registrySha256:sha256(rb),planSha256:sha256(pb),workspaceId:unit.workspaceId},scope={version:2,cohortId,...bindings,rows},scopeBytes=json(scope),preparePlan={version:2,cohortId,scopeSha256:sha256(scopeBytes),frozenAt:new Date().toISOString(),photos},preparePlanBytes=json(preparePlan),bundle=assertFiniteCohortBundle({scopeBytes,preparePlanBytes,unitBytes:ub,registryBytes:rb,planBytes:pb,captures});
  const dir='.local/calibration/nominal/new-input-cohorts/'+cohortId;await mkdir(dir,{recursive:true});await writeFile(dir+'/scope.json',scopeBytes,{flag:'wx'});await writeFile(dir+'/prepare-plan.json',preparePlanBytes,{flag:'wx'});
  const path='.local/calibration/nominal/new-input-finite-cohorts.json',old=await readFile(path),catalog=JSON.parse(old);await saveFiniteCatalogAppend(path,appendFiniteCohort(catalog,bundle,new Date().toISOString()),bindings,old);
  return {cohortId,intended:rows.length,originals:photos.length,imagesProcessed:0,adopted:0,sqlWrites:0};
}
