import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {prepareCzechCrop} from './prepare-czech-crop.mjs';
export const otherHwRecipe='kiwa-own-photo-other-hw-finite-v1';
export const otherHwManifestSha256='10838872a673118d9d918d8eabe6a2bd8627a2f1625f0d19964cee5e7153a4e7';
export const otherHwRegistrySha256='a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/other-hw-finite.json',import.meta.url));
if(hash(bytes)!==otherHwManifestSha256)throw Error('OTHER_HW_MANIFEST_CHANGED');
const frozen=JSON.parse(bytes),pins=new Map(frozen.rows.map(r=>[r.draft.id,r]));
if(pins.size!==108)throw Error('OTHER_HW_FINITE_COUNT');
export const isOtherHwCandidate=id=>pins.has(id);
const time=x=>typeof x==='string'?Date.parse(x):NaN;
const fail=()=>{throw Error('OTHER_HW_BINDING_OR_REVIEW_INVALID');};
export async function assertOtherHwInputs(registry,registryHash,captures){
 if(registryHash!==otherHwRegistrySha256)fail();
 const byId=new Map(registry.parts.map(d=>[d.id,d]));
 for(const p of pins.values()){
  const d=byId.get(p.draft.id),c=captures.get(p.draft.imageUrls[0]);
  if(!d||hash(JSON.stringify(d))!==p.objectSha256||c?.sha256!==p.capture.sha256||c.url!==p.capture.url||!c.productIds?.includes(d.productId)||hash(await readFile('.local/calibration/gallery/bytes/'+c.sha256))!==c.sha256)fail();
 }
}
export function nominalOtherHw(draft,rule,review,capture){
 const p=pins.get(draft?.id);if(!p||hash(JSON.stringify(draft))!==p.objectSha256||draft.category!=='other'||draft.sizeText!==p.draft.sizeText||draft.sourceUrl!==p.draft.sourceUrl||capture?.sha256!==p.capture.sha256||capture.url!==p.capture.url||!capture.productIds?.includes(draft.productId))fail();
 if(!rule||rule.draftId!==draft.id||rule.description!==draft.description||rule.name!==draft.name||rule.bodyReviewed!==true||rule.meaning!=='whole-product-body'||!rule.bodyPrefix?.trim()||!draft.description.startsWith(rule.bodyPrefix)||!draft.tags.includes(rule.tag)||!rule.family?.trim()||!rule.reviewedBy?.trim()||!Number.isFinite(time(rule.reviewedAt))||!rule.reason?.trim())fail();
 const r=review,c=r?.crop;if(!r||r.family!==rule.family||r.url!==capture.url||r.sha256!==capture.sha256||r.reviewed!==true||!r.reviewedBy?.trim()||!Number.isFinite(time(r.reviewedAt))||!r.photoPose?.trim()||!r.rotationReason?.trim()||r.rotationDegrees!==0||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||r.sourceWidth!==capture.pixelWidth||r.sourceHeight!==capture.pixelHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.sourceWidth||c.top+c.height>r.sourceHeight)fail();
 const m=/^(約)?H(\d+(?:\.\d+)?)×W(\d+(?:\.\d+)?)mm$/.exec(draft.sizeText.normalize('NFKC').replace(/\s/g,''));
 if(!m)fail();const h=Number(m[2]),w=Number(m[3]);if(![h,w].every(v=>v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8))fail();
 return {recipe:otherHwRecipe,draftId:draft.id,manifestSha256:otherHwManifestSha256,sourceObjectSha256:p.objectSha256,category:'other',family:rule.family,sourceRule:rule,originalReview:r,publishedSizeLabel:draft.sizeText,publishedSizeLabelKind:'other-finite-H-W-pair',publishedSizeValuesMm:[h,w],publishedSizeOrder:'source-H-to-box-height-W-to-box-width',approximate:!!m[1],widthMm:w,heightMm:h,layoutSizeChoice:'published-body-size-pair-box-for-layout-only',photoRotationDegrees:r.rotationDegrees,photoPose:r.photoPose,sourceCrop:{url:r.url,sha256:r.sha256,sourceWidth:r.sourceWidth,sourceHeight:r.sourceHeight,crop:r.crop,reviewed:true,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt,coordinateConvention:r.coordinateConvention},shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false,imageScaleVerified:false,connectionReady:false};
}
export function validateOtherHwSpec(spec){const p=pins.get(spec?.draftId);if(!p)fail();const expected=nominalOtherHw(p.draft,spec.sourceRule,spec.originalReview,p.capture);if(JSON.stringify(expected)!==JSON.stringify(spec))fail();return spec;}
export function otherHwImageKey(sha,spec){validateOtherHwSpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-other-hw-reviewed-crop-v1',sha,spec});}
export function assertOtherHwApproval(approval,spec,images){
 validateOtherHwSpec(spec);const keyHash=hash(otherHwImageKey(spec.sourceCrop.sha256,spec));
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>Math.max(time(spec.sourceRule.reviewedAt),time(spec.sourceCrop.reviewedAt)))||approval.specSha256!==hash(JSON.stringify(spec))||approval.imageKeySha256!==keyHash||approval.finalImageKey!==keyHash||approval.originalSha256!==spec.sourceCrop.sha256||!['high','medium','thumbnail'].every(k=>/^[0-9a-f]{64}$/.test(approval[k+'Sha256'])))throw Error('OTHER_HW_PROCESSED_APPROVAL_INVALID');
 if(images)for(const k of ['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[k])||hash(images[k])!==approval[k+'Sha256'])throw Error('OTHER_HW_APPROVED_BYTES_MISMATCH');
}
export async function verifyOtherHwAsset(asset,spec,approval,readImage){
 assertOtherHwApproval(approval,spec);
 if(!asset||asset.content_hash!==approval.highSha256||asset.source_transform?.nominalImageKey!==approval.finalImageKey||asset.source_transform?.photoSha256!==approval.originalSha256||asset.source_transform?.version!=='nominal-other-hw-reviewed-crop-v1'||!isDeepStrictEqual(asset.source_transform.processedApproval,approval))throw Error('OTHER_HW_STORED_ASSET_MISMATCH');
 for(const [name,path]of [['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||hash(await readImage(path))!==approval[name+'Sha256'])throw Error('OTHER_HW_STORED_ASSET_BYTES_MISMATCH');
}
export async function prepareOtherHw(original,spec){validateOtherHwSpec(spec);const result=await prepareCzechCrop(original,spec);return {...result,transform:{...result.transform,version:'nominal-other-hw-reviewed-crop-v1',sourceObjectSha256:spec.sourceObjectSha256,manifestSha256:otherHwManifestSha256}};}
