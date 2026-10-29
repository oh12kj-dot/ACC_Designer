import sharp from'sharp';import{createHash}from'node:crypto';import{prepareBodyBox}from'./prepare-body-box.mjs';
export function czechCropImageKey(sha256,spec){return JSON.stringify({version:'nominal-czech-reviewed-crop-photo-v2',sha256,crop:spec.sourceCrop.crop,rotation:spec.photoRotationDegrees,widthMm:spec.widthMm,heightMm:spec.heightMm});}
export async function extractReviewedCzechCrop(original,review){
 const m=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata(),c=review?.crop;
 if(!review?.reviewed||!review.reviewedBy||!review.reviewedAt||review.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||createHash('sha256').update(original).digest('hex')!==review.sha256||m.width!==review.sourceWidth||m.height!==review.sourceHeight||m.pages>1||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>m.width||c.top+c.height>m.height)throw Error('CZECH_CROP_REVIEW_INVALID');
 return sharp(original).extract(c).png().toBuffer();
}
export async function prepareCzechCrop(original,spec){const cropped=await extractReviewedCzechCrop(original,spec.sourceCrop),p=await prepareBodyBox(cropped,spec),m=await sharp(original).metadata(),originalMime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format];if(!originalMime)throw Error('CZECH_CROP_SOURCE_FORMAT_INVALID');return{...p,originalMime,transform:{...p.transform,version:'nominal-czech-reviewed-crop-photo-v2',sourceCrop:spec.sourceCrop}};}
