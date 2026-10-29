import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import sharp from 'sharp';
import {prepareCzechCrop} from './prepare-czech-crop.mjs';
export const pearlBodyRecipe='kiwa-own-photo-pearl-body-finite-v1';
export const pearlBodyManifestSha256='32d66c5f57bd9287f29735dad0e46c1553c37f69899e32356c7322453e1dbbad';
export const pearlBodyRegistrySha256='a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/pearl-body-finite.json',import.meta.url));
if(hash(bytes)!==pearlBodyManifestSha256)throw Error('PEARL_BODY_MANIFEST_CHANGED');
const frozen=JSON.parse(bytes),pins=new Map(frozen.rows.map(r=>[r.draft.id,r]));
if(pins.size!==98)throw Error('PEARL_BODY_FINITE_COUNT');
export const isPearlBodyCandidate=id=>pins.has(id);

const allowed=new Set(frozen.eligibleSourceIds);
export function pearlBodyLabel(d){
 const p=pins.get(d?.id);if(!p||!allowed.has(d.id)||hash(JSON.stringify(d))!==p.objectSha256)return undefined;
 const raw=d.sizeText.normalize('NFKC').replace(/\s/g,''),m=/^(約)?(\d+(?:\.\d+)?)(?:×(\d+(?:\.\d+)?))?mm$/.exec(raw);if(!m)return undefined;
 const w=+m[2],h=m[3]?+m[3]:w;if(![w,h].every(v=>v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8))return undefined;
 return {w,h,kind:m[3]?'pearl-body-pair':'pearl-body-scalar',approximate:!!m[1]};
}
export const isPearlBodyEligible=id=>!!pins.get(id)&&!!pearlBodyLabel(pins.get(id).draft);
if([...pins.values()].filter(p=>isPearlBodyEligible(p.draft.id)).length!==78)throw Error('PEARL_BODY_ELIGIBLE_COUNT');

const time=x=>typeof x==='string'?Date.parse(x):NaN;
const fail=()=>{throw Error('PEARL_BODY_BINDING_OR_REVIEW_INVALID');};
export async function assertPearlBodyInputs(registry,registryHash,captures){
 if(registryHash!==pearlBodyRegistrySha256)fail();
 const byId=new Map(registry.parts.map(d=>[d.id,d]));
 for(const p of pins.values()){
  const d=byId.get(p.draft.id),c=captures.get(p.draft.imageUrls[0]);
  if(!d||hash(JSON.stringify(d))!==p.objectSha256||c?.sha256!==p.capture.sha256||c.url!==p.capture.url||c.pixelWidth!==p.capture.pixelWidth||c.pixelHeight!==p.capture.pixelHeight||!isDeepStrictEqual(c.productIds,p.capture.productIds)||!c.productIds?.includes(d.productId))fail();
  const raw=await readFile('.local/calibration/gallery/bytes/'+c.sha256),decoded=await sharp(raw).metadata();if(hash(raw)!==c.sha256||decoded.width!==p.capture.pixelWidth||decoded.height!==p.capture.pixelHeight)fail();
 }
}
export function nominalPearlBody(draft,rule,review,capture){
 const p=pins.get(draft?.id);if(!p||!isPearlBodyEligible(draft.id)||hash(JSON.stringify(draft))!==p.objectSha256||draft.category!=='pearl'||draft.sizeText!==p.draft.sizeText||draft.sourceUrl!==p.draft.sourceUrl||capture?.sha256!==p.capture.sha256||capture.url!==p.capture.url||capture.pixelWidth!==p.capture.pixelWidth||capture.pixelHeight!==p.capture.pixelHeight||!isDeepStrictEqual(capture.productIds,p.capture.productIds)||!capture.productIds?.includes(draft.productId))fail();
 if(!rule||rule.draftId!==draft.id||rule.description!==draft.description||rule.name!==draft.name||rule.bodyReviewed!==true||rule.meaning!=='whole-product-body'||!rule.bodyPrefix?.trim()||!draft.description.startsWith(rule.bodyPrefix)||!draft.tags.includes(rule.tag)||!rule.family?.trim()||!rule.reviewedBy?.trim()||!Number.isFinite(time(rule.reviewedAt))||!rule.reason?.trim()||rule.sourceObjectSha256!==p.objectSha256||rule.rawLabel!==draft.sizeText)fail();
 const r=review,c=r?.crop;if(!r||r.family!==rule.family||r.url!==capture.url||r.sha256!==capture.sha256||r.reviewed!==true||!r.reviewedBy?.trim()||!Number.isFinite(time(r.reviewedAt))||!r.photoPose?.trim()||!r.rotationReason?.trim()||r.rotationDegrees!==0||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||r.sourceWidth!==capture.pixelWidth||r.sourceHeight!==capture.pixelHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.sourceWidth||c.top+c.height>r.sourceHeight)fail();
 const label=pearlBodyLabel(draft);if(!label)fail();const {w,h,kind,approximate}=label;

 return {recipe:pearlBodyRecipe,draftId:draft.id,manifestSha256:pearlBodyManifestSha256,sourceObjectSha256:p.objectSha256,category:'pearl',family:rule.family,sourceRule:rule,originalReview:r,publishedSizeLabel:draft.sizeText,publishedSizeLabelKind:kind,publishedSizeValuesMm:[w,h],publishedSizeOrder:'source-first-to-box-width-second-to-box-height',approximate,widthMm:w,heightMm:h,layoutSizeChoice:kind==='pearl-body-pair'?'published-body-size-pair-box-for-layout-only':'published-body-size-square-box-for-layout-only',photoRotationDegrees:r.rotationDegrees,photoPose:r.photoPose,sourceCrop:{url:r.url,sha256:r.sha256,sourceWidth:r.sourceWidth,sourceHeight:r.sourceHeight,crop:r.crop,reviewed:true,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt,coordinateConvention:r.coordinateConvention},shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false,imageScaleVerified:false,connectionReady:false};
}
export function validatePearlBodySpec(spec){const p=pins.get(spec?.draftId);if(!p)fail();const expected=nominalPearlBody(p.draft,spec.sourceRule,spec.originalReview,p.capture);if(JSON.stringify(expected)!==JSON.stringify(spec))fail();return spec;}
export function pearlBodyImageKey(sha,spec){validatePearlBodySpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-pearl-body-reviewed-crop-v1',sha,spec});}
export function assertPearlBodyApproval(approval,spec,images){
 validatePearlBodySpec(spec);const keyHash=hash(pearlBodyImageKey(spec.sourceCrop.sha256,spec));
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>Math.max(time(spec.sourceRule.reviewedAt),time(spec.sourceCrop.reviewedAt)))||approval.specSha256!==hash(JSON.stringify(spec))||approval.imageKeySha256!==keyHash||approval.finalImageKey!==keyHash||approval.originalSha256!==spec.sourceCrop.sha256||!['high','medium','thumbnail'].every(k=>/^[0-9a-f]{64}$/.test(approval[k+'Sha256'])))throw Error('PEARL_BODY_PROCESSED_APPROVAL_INVALID');
 if(images)for(const k of ['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[k])||hash(images[k])!==approval[k+'Sha256'])throw Error('PEARL_BODY_APPROVED_BYTES_MISMATCH');
}
export async function verifyPearlBodyAsset(asset,spec,approval,readImage){
 assertPearlBodyApproval(approval,spec);
 if(!asset||asset.content_hash!==approval.highSha256||asset.source_transform?.nominalImageKey!==approval.finalImageKey||asset.source_transform?.photoSha256!==approval.originalSha256||asset.source_transform?.version!=='nominal-pearl-body-reviewed-crop-v1'||!isDeepStrictEqual(asset.source_transform.processedApproval,approval))throw Error('PEARL_BODY_STORED_ASSET_MISMATCH');
 for(const [name,path]of [['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||hash(await readImage(path))!==approval[name+'Sha256'])throw Error('PEARL_BODY_STORED_ASSET_BYTES_MISMATCH');
}
export async function preparePearlBody(original,spec){validatePearlBodySpec(spec);const result=await prepareCzechCrop(original,spec);return {...result,transform:{...result.transform,version:'nominal-pearl-body-reviewed-crop-v1',sourceObjectSha256:spec.sourceObjectSha256,manifestSha256:pearlBodyManifestSha256}};}

export function assertPearlBodyExistingRows(rows){
 if(rows.length>1||rows.some(p=>p.is_archived||p.metadata?.nominalPlacement?.recipe!==pearlBodyRecipe))throw Error('PEARL_BODY_EXISTING_SOURCE_CONFLICT');
}
export function assertPearlBodyCommitScope(currentWorkspace,initialWorkspace,approvedWorkspace,currentManifestHash,initialManifestHash){
 if(!currentWorkspace||currentWorkspace!==initialWorkspace||currentWorkspace!==approvedWorkspace||currentManifestHash!==initialManifestHash)throw Error('PEARL_BODY_COMMIT_SCOPE_CHANGED');
}
export function assertPearlBodyPartReadback(aggregate,draft,evidence,payload){
 const p=aggregate?.part,m=p?.metadata;
 if(!p||p.is_archived||p.width_mm!==evidence.widthMm||p.height_mm!==evidence.heightMm||aggregate.through_holes?.length||aggregate.connection_points?.length||p.category!=='pearl'||p.name!==draft.name||p.sku!==draft.sku||p.source_url!==draft.sourceUrl||!isDeepStrictEqual([...(p.tags??[])].sort(),[...draft.tags].sort())||m?.sourceDraftId!==draft.id||!isDeepStrictEqual(m.nominalPlacement,evidence)||!isDeepStrictEqual(m.publishedPurchase,draft.purchase)||m.publishedPrice!==draft.price||m.publishedCurrency!==draft.currency)throw Error('PEARL_BODY_PART_READBACK_MISMATCH');
 const expected=payload.purchase_spec,actual=aggregate.purchase_spec;
 if(expected){if(!actual||Object.entries(expected).some(([k,v])=>!isDeepStrictEqual(actual[k],v)))throw Error('PEARL_BODY_PURCHASE_READBACK_MISMATCH');}
 else if(actual!=null)throw Error('PEARL_BODY_INVENTED_PURCHASE_SPEC');
}

export function pearlBodyExpectedPayload(draft,evidence){const payload={part:{metadata:{sourceDraftId:draft.id,nominalPlacement:evidence}}};const p=draft.purchase;if(draft.currency==='JPY'&&p?.unit==='piece'&&Number.isSafeInteger(p.quantity)&&p.quantity>0&&!p.approximate)payload.purchase_spec={sale_mode:p.quantity===1?'piece':'pack',pack_quantity:p.quantity===1?null:p.quantity,minimum_units:1,unit_price:draft.price??null,currency:'JPY'};return payload;}
export function pearlBodyFullEvidence(draft,spec){return {...spec,sourceDraftId:draft.id,variantId:draft.variantId,sku:draft.sku,sourceUrl:draft.sourceUrl,sourceFetchedAt:draft.sourceFetchedAt,registrySha256:pearlBodyRegistrySha256,photoUrl:spec.sourceCrop.url,photoSha256:spec.sourceCrop.sha256,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false};}
