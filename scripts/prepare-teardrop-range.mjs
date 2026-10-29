import {prepareCzechCrop} from './prepare-czech-crop.mjs';
export function teardropRangeImageKey(sha256,spec){
 const r=spec.photoOrientationReview;
 if(spec.recipe!=='kiwa-teardrop-published-hw-range-box-v1'||r?.version!=='reviewed-teardrop-photo-pose-v1'||![0,90].includes(r.rotationDegrees)||r.rotationDegrees!==spec.photoRotationDegrees||!r.reason?.trim()||!spec.photoPose?.trim()||spec.sourceCrop?.sha256!==sha256)throw Error('TEARDROP_REVIEW_INVALID');
 return JSON.stringify({version:'nominal-teardrop-range-crop-photo-v1',sha256,sourceCrop:spec.sourceCrop,rotation:spec.photoRotationDegrees,widthMm:spec.widthMm,heightMm:spec.heightMm,candidateManifestSha256:spec.candidateManifestSha256});
}
export async function prepareTeardropRange(original,spec){
 teardropRangeImageKey(spec.sourceCrop?.sha256,spec);
 const p=await prepareCzechCrop(original,spec);
 return {...p,transform:{...p.transform,version:'nominal-teardrop-range-crop-photo-v1',photoOrientationReview:spec.photoOrientationReview,photoPose:spec.photoPose,publishedBodyHeightRangeMm:spec.publishedBodyHeightRangeMm,publishedBodyWidthRangeMm:spec.publishedBodyWidthRangeMm,candidateManifestSha256:spec.candidateManifestSha256}};
}
