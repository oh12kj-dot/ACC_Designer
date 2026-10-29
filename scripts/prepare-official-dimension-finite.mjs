import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {prepareCzechCrop} from './prepare-czech-crop.mjs';
import {isArchived4809Successor,partition4809Rows} from './archived4809-successors.mjs';
export const officialPhotoRecipe='kiwa-official-dimension-own-photo-finite-v1';
export const officialPhotoManifestSha256='9a27629b98598879be6e1aa4c831202794fed330de2f19aad536c3e85a13e1d4';
export const officialPhotoRegistrySha256='a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/official-dimension-finite.json',import.meta.url));
if(hash(bytes)!==officialPhotoManifestSha256)throw Error('OFFICIAL_PHOTO_MANIFEST_CHANGED');
const frozen=JSON.parse(bytes),pins=new Map(frozen.rows.map(r=>[r.draft.id,r]));
if(pins.size!==41)throw Error('OFFICIAL_PHOTO_FINITE_COUNT');
export const isOfficialPhotoCandidate=id=>pins.has(id);


// Dimensions originate from the immutable official mapping record, never photo bounds.
export function officialPhotoDimensions(d){
 const p=pins.get(d?.id),e=p?.dimensionEvidence;if(!p||p.held||!e||e.sourceDraftId!==d.id||e.variantId!==d.variantId||e.sku!==d.sku||e.sourceUrl!==d.sourceUrl)return undefined;
 let w,h,kind;
 if(e.kind==='official-crystal-frontal-axes-only'&&d.category==='other'&&['13×12mm','8×7.5mm'].includes(d.sizeText)){w=e.outerWidthMm;h=e.outerHeightMm;kind=e.kind;const expected=d.sizeText==='13×12mm'?[12,13]:[7.5,8];if(w!==expected[0]||h!==expected[1])return undefined;}
 else if(e.kind==='official-ball-diameter-only'&&d.category==='bead'&&['4mm','6mm','8mm'].includes(d.sizeText)&&e.publishedDiameterMm===Number(d.sizeText.slice(0,-2))){w=h=e.publishedDiameterMm;kind=e.kind;}
 else return undefined;
 if(![w,h].every(v=>Number.isFinite(v)&&v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8))return undefined;
 return {w,h,kind,diagramSha256:e.diagramSha256,diagramUrl:e.diagramUrl};
}
export const isOfficialPhotoEligible=id=>!!pins.get(id)&&!!officialPhotoDimensions(pins.get(id).draft);
if([...pins.values()].filter(p=>isOfficialPhotoEligible(p.draft.id)).length!==38)throw Error('OFFICIAL_PHOTO_ELIGIBLE_COUNT');
const time=x=>typeof x==='string'?Date.parse(x):NaN;
const fail=()=>{throw Error('OFFICIAL_PHOTO_BINDING_OR_REVIEW_INVALID');};
export async function assertOfficialPhotoInputs(registry,registryHash,captures){
 if(registryHash!==officialPhotoRegistrySha256)fail();
 const byId=new Map(registry.parts.map(d=>[d.id,d])),mapping=new Map(JSON.parse(await readFile('.local/calibration/mapping/index.json')).entries.map(e=>[e.id,e.dimensionEvidence]));
 for(const p of pins.values()){
  const d=byId.get(p.draft.id),c=captures.get(p.draft.imageUrls[0]);
  const e=p.dimensionEvidence,diagram=captures.get(e.diagramUrl);if(!isDeepStrictEqual(mapping.get(p.draft.id),e)||e.sourceUrl!==p.draft.sourceUrl||!p.draft.imageUrls.includes(e.diagramUrl)||diagram?.sha256!==e.diagramSha256||!diagram.productIds?.includes(p.draft.productId)||hash(await readFile('.local/calibration/gallery/bytes/'+e.diagramSha256))!==e.diagramSha256)fail();
  if(!d||hash(JSON.stringify(d))!==p.objectSha256||c?.sha256!==p.capture.sha256||c.url!==p.capture.url||!c.productIds?.includes(d.productId)||hash(await readFile('.local/calibration/gallery/bytes/'+c.sha256))!==c.sha256)fail();
 }
}
export function nominalOfficialPhoto(draft,rule,review,capture){
 const p=pins.get(draft?.id);if(!p||!isOfficialPhotoEligible(draft.id)||hash(JSON.stringify(draft))!==p.objectSha256||draft.category!==p.draft.category||draft.sizeText!==p.draft.sizeText||draft.sourceUrl!==p.draft.sourceUrl||capture?.sha256!==p.capture.sha256||capture.url!==p.capture.url||!capture.productIds?.includes(draft.productId))fail();
 if(!rule||rule.draftId!==draft.id||rule.description!==draft.description||rule.name!==draft.name||rule.bodyReviewed!==true||rule.meaning!=='existing-official-body-dimensions'||!rule.bodyPrefix?.trim()||!draft.description.startsWith(rule.bodyPrefix)||!draft.tags.includes(rule.tag)||!rule.family?.trim()||!rule.reviewedBy?.trim()||!Number.isFinite(time(rule.reviewedAt))||!rule.reason?.trim())fail();
 const dims=officialPhotoDimensions(draft),meaning=rule.sourceMeaningReview,association=review?.sourceCorrespondenceReview,e=p.dimensionEvidence;
 if(!dims||!meaning||meaning.reviewed!==true||meaning.draftId!==draft.id||meaning.variantId!==draft.variantId||meaning.sku!==draft.sku||meaning.sourceObjectSha256!==p.objectSha256||meaning.dimensionEvidenceSha256!==hash(JSON.stringify(e))||meaning.diagramSha256!==e.diagramSha256||meaning.diagramUrl!==e.diagramUrl||meaning.sourceLabel!==draft.sizeText||meaning.sourceUrl!==draft.sourceUrl||meaning.kind!==dims.kind||meaning.diagramLabel!==(e.label??draft.sizeText)||meaning.widthMm!==dims.w||meaning.heightMm!==dims.h||!meaning.reviewedBy?.trim()||!Number.isFinite(time(meaning.reviewedAt))||!meaning.reason?.trim())fail();
 if(!association||association.reviewed!==true||association.draftId!==draft.id||association.variantId!==draft.variantId||association.sku!==draft.sku||association.sourceObjectSha256!==p.objectSha256||association.sourceName!==draft.name||association.sourceUrl!==draft.sourceUrl||association.photoSha256!==capture.sha256||association.photoUrl!==capture.url||association.conclusion!=='own-variant-representative-visible-color-reviewed-finish-and-size-appearance-unverified'||!association.reviewedBy?.trim()||!Number.isFinite(time(association.reviewedAt))||!association.reason?.trim())fail();
 const r=review,c=r?.crop;if(!r||r.family!==rule.family||r.url!==capture.url||r.sha256!==capture.sha256||r.reviewed!==true||!r.reviewedBy?.trim()||!Number.isFinite(time(r.reviewedAt))||!r.photoPose?.trim()||!r.rotationReason?.trim()||r.rotationDegrees!==0||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||r.sourceWidth!==capture.pixelWidth||r.sourceHeight!==capture.pixelHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.sourceWidth||c.top+c.height>r.sourceHeight)fail();
 const label=officialPhotoDimensions(draft);if(!label)fail();const {w,h,kind,diagramSha256,diagramUrl}=label;

 return {recipe:officialPhotoRecipe,draftId:draft.id,manifestSha256:officialPhotoManifestSha256,sourceObjectSha256:p.objectSha256,category:draft.category,family:rule.family,sourceRule:rule,originalReview:r,publishedSizeLabel:draft.sizeText,publishedSizeLabelKind:kind,publishedSizeValuesMm:[w,h],publishedSizeOrder:kind==='official-crystal-frontal-axes-only'?'official-diagram-width-height-not-label-order':'official-published-diameter-to-equal-layout-axes',diagramSha256,diagramUrl,sourceDimensionEvidence:p.dimensionEvidence,dimensionEvidenceSha256:hash(JSON.stringify(p.dimensionEvidence)),approximate:!!(p.dimensionEvidence.approximate||p.dimensionEvidence.diagramApproximate),widthMm:w,heightMm:h,layoutSizeChoice:kind==='official-ball-diameter-only'?'published-body-diameter-square-box-for-layout-only':'published-body-size-pair-box-for-layout-only',photoRotationDegrees:r.rotationDegrees,photoPose:r.photoPose,sourceCrop:{url:r.url,sha256:r.sha256,sourceWidth:r.sourceWidth,sourceHeight:r.sourceHeight,crop:r.crop,reviewed:true,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt,coordinateConvention:r.coordinateConvention},shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false};
}
export function validateOfficialPhotoSpec(spec){const p=pins.get(spec?.draftId);if(!p)fail();const expected=nominalOfficialPhoto(p.draft,spec.sourceRule,spec.originalReview,p.capture);if(JSON.stringify(expected)!==JSON.stringify(spec))fail();return spec;}
export function officialPhotoImageKey(sha,spec){validateOfficialPhotoSpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-official-dimension-reviewed-crop-v1',sha,spec});}
export function assertOfficialPhotoApproval(approval,spec,images){
 validateOfficialPhotoSpec(spec);const keyHash=hash(officialPhotoImageKey(spec.sourceCrop.sha256,spec));
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>Math.max(time(spec.sourceRule.reviewedAt),time(spec.sourceCrop.reviewedAt),time(spec.sourceRule.sourceMeaningReview.reviewedAt),time(spec.originalReview.sourceCorrespondenceReview.reviewedAt)))||approval.specSha256!==hash(JSON.stringify(spec))||approval.imageKeySha256!==keyHash||approval.finalImageKey!==keyHash||approval.originalSha256!==spec.sourceCrop.sha256||!['high','medium','thumbnail'].every(k=>/^[0-9a-f]{64}$/.test(approval[k+'Sha256'])))throw Error('OFFICIAL_PHOTO_PROCESSED_APPROVAL_INVALID');
 if(images)for(const k of ['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[k])||hash(images[k])!==approval[k+'Sha256'])throw Error('OFFICIAL_PHOTO_APPROVED_BYTES_MISMATCH');
}
export async function verifyOfficialPhotoAsset(asset,spec,approval,readImage){
 assertOfficialPhotoApproval(approval,spec);
 if(!asset||Object.entries(officialPhotoProvenance(spec)).some(([k,v])=>asset.source_transform?.[k]!==v)||asset.source_transform?.processedReviewSha256!==hash(JSON.stringify(approval))||asset.content_hash!==approval.highSha256||asset.source_transform?.nominalImageKey!==approval.finalImageKey||asset.source_transform?.photoSha256!==approval.originalSha256||asset.source_transform?.version!=='nominal-official-dimension-reviewed-crop-v1'||!isDeepStrictEqual(asset.source_transform.processedApproval,approval))throw Error('OFFICIAL_PHOTO_STORED_ASSET_MISMATCH');
 for(const [name,path]of [['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||hash(await readImage(path))!==approval[name+'Sha256'])throw Error('OFFICIAL_PHOTO_STORED_ASSET_BYTES_MISMATCH');
}
export async function prepareOfficialPhoto(original,spec){validateOfficialPhotoSpec(spec);const result=await prepareCzechCrop(original,spec);return {...result,transform:{...result.transform,version:'nominal-official-dimension-reviewed-crop-v1',...officialPhotoProvenance(spec)}};}

export function assertOfficialPhotoExistingRows(rows,sourceId){
 if(isArchived4809Successor(sourceId)){partition4809Rows(rows,sourceId);return;}
 if(rows.length>1||rows.some(p=>p.is_archived||p.metadata?.nominalPlacement?.recipe!==officialPhotoRecipe))throw Error('OFFICIAL_PHOTO_EXISTING_SOURCE_CONFLICT');
}
export function assertOfficialPhotoCommitScope(currentWorkspace,initialWorkspace,approvedWorkspace,currentManifestHash,initialManifestHash){
 if(!currentWorkspace||currentWorkspace!==initialWorkspace||currentWorkspace!==approvedWorkspace||currentManifestHash!==initialManifestHash)throw Error('OFFICIAL_PHOTO_COMMIT_SCOPE_CHANGED');
}
export function assertOfficialPhotoPartReadback(aggregate,draft,evidence,payload){
 const p=aggregate?.part,m=p?.metadata;
 if(!p||p.is_archived||p.category!==draft.category||p.name!==draft.name||p.sku!==draft.sku||p.source_url!==draft.sourceUrl||!isDeepStrictEqual([...(p.tags??[])].sort(),[...draft.tags].sort())||m?.sourceDraftId!==draft.id||!isDeepStrictEqual(m.nominalPlacement,evidence)||!isDeepStrictEqual(m.publishedPurchase,draft.purchase)||m.publishedPrice!==draft.price||m.publishedCurrency!==draft.currency)throw Error('OFFICIAL_PHOTO_PART_READBACK_MISMATCH');
 const expected=payload.purchase_spec,actual=aggregate.purchase_spec;
 if(expected){if(!actual||Object.entries(expected).some(([k,v])=>!isDeepStrictEqual(actual[k],v)))throw Error('OFFICIAL_PHOTO_PURCHASE_READBACK_MISMATCH');}
 else if(actual!=null)throw Error('OFFICIAL_PHOTO_INVENTED_PURCHASE_SPEC');
}

export function officialPhotoProvenance(spec){validateOfficialPhotoSpec(spec);return{registrySha256:officialPhotoRegistrySha256,manifestSha256:officialPhotoManifestSha256,sourceObjectSha256:spec.sourceObjectSha256,diagramSha256:spec.diagramSha256,dimensionEvidenceSha256:spec.dimensionEvidenceSha256,sourceMeaningReviewSha256:hash(JSON.stringify(spec.sourceRule.sourceMeaningReview)),originalReviewSha256:hash(JSON.stringify(spec.originalReview)),sourceCorrespondenceReviewSha256:hash(JSON.stringify(spec.originalReview.sourceCorrespondenceReview)),specSha256:hash(JSON.stringify(spec))};}
export function assertOfficialPhotoRecoveredAggregate(aggregate,draft,spec){
 const evidence={...spec,sourceDraftId:draft.id,variantId:draft.variantId,sku:draft.sku,sourceUrl:draft.sourceUrl,sourceFetchedAt:draft.sourceFetchedAt,registrySha256:officialPhotoRegistrySha256,photoUrl:spec.sourceCrop.url,photoSha256:spec.sourceCrop.sha256,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false};
 const payload={};if(draft.currency==='JPY'&&draft.purchase.unit==='piece'&&Number.isSafeInteger(draft.purchase.quantity)&&draft.purchase.quantity>0&&!draft.purchase.approximate)payload.purchase_spec={sale_mode:draft.purchase.quantity===1?'piece':'pack',pack_quantity:draft.purchase.quantity===1?null:draft.purchase.quantity,minimum_units:1,unit_price:draft.price??null,currency:'JPY'};
 assertOfficialPhotoPartReadback(aggregate,draft,evidence,payload);
 if(aggregate.part.width_mm!==spec.widthMm||aggregate.part.height_mm!==spec.heightMm||!Array.isArray(aggregate.through_holes)||!Array.isArray(aggregate.connection_points)||aggregate.through_holes.length||aggregate.connection_points.length)throw Error('OFFICIAL_PHOTO_RECOVERY_AGGREGATE_MISMATCH');
}
export function assertOfficialPhotoManifest(m){
 if(!m||m.manifestSha256!==officialPhotoManifestSha256||m.registrySha256!==officialPhotoRegistrySha256||m.workspaceId!=='af3aed9f-240b-4021-a01e-40521f03adb6'||!Array.isArray(m.entries)||!Array.isArray(m.dispositions)||m.dispositions.length!==41||new Set(m.dispositions.map(r=>r.draftId)).size!==41||new Set(m.entries.map(e=>e.draftId)).size!==m.entries.length)throw Error('OFFICIAL_PHOTO_DISPOSITION_MANIFEST_INVALID');
 const entries=new Set(m.entries.map(e=>e.draftId));for(const r of m.dispositions){const p=pins.get(r.draftId);if(!p||r.sourceObjectSha256!==p.objectSha256||!['held-frozen','archived-existing-policy-pending','photo-pending','source-pending','adopted'].includes(r.status)||!r.reason?.trim()||p.held&&r.status!=='held-frozen'||entries.has(r.draftId)!==(r.status==='adopted'))throw Error('OFFICIAL_PHOTO_DISPOSITION_MANIFEST_INVALID');}
 if([...entries].some(id=>!isOfficialPhotoEligible(id)))throw Error('OFFICIAL_PHOTO_DISPOSITION_MANIFEST_INVALID');
}
