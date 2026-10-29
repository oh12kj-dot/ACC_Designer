import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {extractReviewedCzechCrop} from './prepare-czech-crop.mjs';
import {prepareBodyBox} from './prepare-body-box.mjs';
import {applyExternalAlphaRgba,externalAlphaPixels} from './external-alpha-regions.mjs';
export const externalAlphaRecipe='kiwa-own-photo-category-box-external-alpha-v1';
export const externalAlphaManifestId='toho-small-external-alpha-finite2-v1';
const hash=x=>createHash('sha256').update(x).digest('hex');
const pins=new Map([
 ['kiwa:8711092371748:46969809600804',{object:'f7a5d1f4b79d65e1c25883471d676af11b16c4d713f54fe3c682dea6d5a1dbdf',base:'49038e72ed6e1443d82eaeb56058b156a45d9ee283bd246f60a620708393c0e4',photo:'9e6489e231f5133fd0f48803b5cc05166d7e659439975a097d4635ab40894c6c'}],
 ['kiwa:8711100530980:46969834471716',{object:'13093fcafe459dcaa04692da48d3d0b240695cd8bbfa207bfdc216d8a2c758bb',base:'defed928af996d03d87f2ae7cfdf1a148ddf42b274ea7427d81f374d2d696a4c',photo:'bc605418f9848d27c130940dd83e2bf2ef27343644e1a39f81ca7fcfa90a1780'}]
]);
export const isExternalAlphaCandidate=id=>pins.has(id);
function fail(){throw Error('EXTERNAL_ALPHA_BINDING_OR_REVIEW_INVALID');}
const time=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)?Date.parse(value):NaN;
function baseOf(spec){const {draftId,manifestId,baseSpecSha256,externalAlphaReview,...base}=spec;return {...base,recipe:'kiwa-own-photo-category-box-v1'};}
export function validateExternalAlphaSpec(spec){
 const p=pins.get(spec?.draftId),r=spec?.externalAlphaReview,b=baseOf(spec??{});
 if(!p||spec.recipe!==externalAlphaRecipe||spec.manifestId!==externalAlphaManifestId||spec.baseSpecSha256!==p.base||hash(JSON.stringify(b))!==p.base||spec.sourceObjectSha256!==p.object||spec.sourceCrop?.sha256!==p.photo)fail();
 if(!r||r.version!=='reviewed-external-alpha-exclusion-v1'||r.reviewed!==true||!r.reviewedBy?.trim()||!(time(r.reviewedAt)>time(spec.sourceCrop.reviewedAt))||!r.reason?.trim()||r.sourceCropSha256!==hash(JSON.stringify(spec.sourceCrop)))fail();
 externalAlphaPixels(spec.sourceCrop.crop,r.protectedRoi,r.polygons);
 return spec;
}
export function nominalExternalAlpha(draft,base,capture,review,{registeredRecipe}={}){
 const p=pins.get(draft?.id);
 if(!p||hash(JSON.stringify(draft))!==p.object||hash(JSON.stringify(base))!==p.base||capture?.url!==draft.imageUrls[0]||capture.sha256!==p.photo||!capture.productIds?.includes(draft.productId)||capture.pixelWidth!==450||capture.pixelHeight!==450||registeredRecipe&&registeredRecipe!==externalAlphaRecipe)fail();
 return validateExternalAlphaSpec({...base,recipe:externalAlphaRecipe,draftId:draft.id,manifestId:externalAlphaManifestId,baseSpecSha256:p.base,externalAlphaReview:review});
}
export function externalAlphaImageKey(sha,spec){validateExternalAlphaSpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-external-alpha-photo-v1',sha256:sha,spec});}
export async function prepareExternalAlpha(original,spec){
 validateExternalAlphaSpec(spec);
 const cropped=await extractReviewedCzechCrop(original,spec.sourceCrop),{data,info}=await sharp(cropped).ensureAlpha().raw().toBuffer({resolveWithObject:true}),r=spec.externalAlphaReview;
 const masked=applyExternalAlphaRgba(data,spec.sourceCrop.crop,r.protectedRoi,r.polygons),png=await sharp(masked.data,{raw:info}).png().toBuffer(),result=await prepareBodyBox(png,spec),meta=await sharp(original).metadata();
 const originalMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[meta.format];if(!originalMime)fail();
 return {...result,originalMime,transform:{...result.transform,version:'nominal-external-alpha-photo-v1',sourceCrop:spec.sourceCrop,photoPose:spec.photoPose,photoOrientationReview:spec.photoOrientationReview,externalAlphaReview:r,externalAlphaReviewSha256:hash(JSON.stringify(r)),manifestId:spec.manifestId,sourceObjectSha256:spec.sourceObjectSha256,photoSha256:spec.sourceCrop.sha256,externalExclusionManuallyReviewed:true,processingOutlineUncertain:true}};
}
export function assertExternalAlphaApproval(approval,spec,high){
 validateExternalAlphaSpec(spec);
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>time(spec.externalAlphaReview.reviewedAt))||approval.keySha256!==hash(externalAlphaImageKey(spec.sourceCrop.sha256,spec))||!/^[a-f0-9]{64}$/.test(approval.highSha256)||high&&approval.highSha256!==hash(high))throw Error('EXTERNAL_ALPHA_PROCESSED_APPROVAL_REQUIRED');
}
