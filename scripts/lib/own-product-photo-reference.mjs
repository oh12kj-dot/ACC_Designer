import sharp from 'sharp';
import {createHash} from 'node:crypto';
export const photoReferenceRecipe='own-product-photo-reference-v1';
export const photoReferenceNotice='商品ごとの掲載写真で簡易登録。写真全体の縦横比を保持しています。単体の切抜き・背景透過・サイズ別外観・実寸・穴接続は要精査です。表示枠は実寸ではありません。';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function prepareOwnProductPhotoReference(original,capture,productId){
 if(!capture?.productIds?.includes(productId)||sha256(original)!==capture.sha256)throw Error('OWN_PHOTO_SOURCE_BINDING');
 const m=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const mime={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format];
 if(!mime||m.pages>1||m.width!==capture.pixelWidth||m.height!==capture.pixelHeight)throw Error('OWN_PHOTO_SOURCE_DIMENSIONS');
 // Preserve all of the source. This is a reference photo, never an adopted contour.
 const high=await sharp(original).resize(256,256,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
 const thumbnail=await sharp(high).resize(128,128).png().toBuffer();
 return{original,high,medium:high,thumbnail,width:256,height:256,mmPerPx:10/256,originalMime:mime,transform:{recipe:photoReferenceRecipe,productId,photoUrl:capture.url,photoSha256:capture.sha256,sourceWidth:m.width,sourceHeight:m.height,crop:null,resizeFit:'contain-entire-source',backgroundRemoved:false,imageReviewed:false,variantAppearanceVerified:false,physicalScale:false}};
}
