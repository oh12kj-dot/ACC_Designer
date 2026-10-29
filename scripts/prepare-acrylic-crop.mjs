import {prepareCzechCrop} from './prepare-czech-crop.mjs';
function explicitOrientation(spec){
 const present=Object.prototype.hasOwnProperty.call(spec,'photoOrientationReview'),r=spec.photoOrientationReview;
 if(!present){if(spec.photoOrientationChoice==='reviewed-explicit-own-photo-rotation-for-layout-only')throw Error('ACRYLIC_ORIENTATION_INVALID');return false;}
 if(!r||r.version!=='reviewed-acrylic-photo-pose-v1'||![0,90].includes(r.rotationDegrees)||r.rotationDegrees!==spec.photoRotationDegrees||typeof r.reason!=='string'||!r.reason.trim()||spec.photoOrientationChoice!=='reviewed-explicit-own-photo-rotation-for-layout-only'||!spec.sourceCrop.url||!spec.photoPose?.trim())throw Error('ACRYLIC_ORIENTATION_INVALID');
 return true;
}
export function acrylicCropImageKey(sha256,spec){const explicit=explicitOrientation(spec);return JSON.stringify({version:explicit?'nominal-acrylic-reviewed-crop-photo-v2':'nominal-acrylic-reviewed-crop-photo-v1',sha256,crop:spec.sourceCrop.crop,rotation:spec.photoRotationDegrees,widthMm:spec.widthMm,heightMm:spec.heightMm,...(explicit?{sourceCrop:spec.sourceCrop,family:spec.family,photoPose:spec.photoPose,photoOrientationReview:spec.photoOrientationReview}:{})});}
export async function prepareAcrylicCrop(original,spec){const explicit=explicitOrientation(spec),p=await prepareCzechCrop(original,spec);return {...p,transform:{...p.transform,version:explicit?'nominal-acrylic-reviewed-crop-photo-v2':'nominal-acrylic-reviewed-crop-photo-v1',...(explicit?{photoOrientationReview:{...spec.photoOrientationReview},photoOrientationChoice:spec.photoOrientationChoice}:{})}};}
