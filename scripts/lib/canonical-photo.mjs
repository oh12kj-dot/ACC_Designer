import sharp from 'sharp';
import {createHash} from 'node:crypto';
export const canonicalVersion='source-photo-orientation-v1';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function noThroughHoleReview(draft,evidence,imageAssetId,reviewedAt){
 if(!/^通し穴が開いていない(?:パーツです|為、)/.test(draft.description??'')||draft.id!==evidence.sourceDraftId||!evidence.photoSha256||!imageAssetId)return;
 return{version:1,status:'no-through-hole',imageAssetId,sourceDraftId:draft.id,photoSha256:evidence.photoSha256,descriptionSha256:sha256(draft.description),evidenceText:draft.description.split('。')[0],reviewedAt};
}
/** Undo only the explicitly recorded quarter turn; no detection, segmentation or size inference. */
export async function canonicalPhoto(images,evidence){
 if(evidence.photoRotationDegrees!==90)return{images,evidence};
 if(images.transform?.photoRotationDegrees!==90||!Number.isFinite(evidence.widthMm)||!Number.isFinite(evidence.heightMm)||evidence.widthMm<=0||evidence.heightMm<=0)throw Error('CANONICAL_POSE_EVIDENCE_MISMATCH');
 const rotated={};for(const name of ['high','medium','thumbnail'])rotated[name]=await sharp(images[name],{limitInputPixels:16777216}).rotate(270).png().toBuffer();
 const size=await sharp(rotated.high).metadata();
 const correction={version:canonicalVersion,inverseRotationDegrees:270,previousRotationDegrees:90,previousHighSha256:sha256(images.high),previousBox:{widthMm:evidence.widthMm,heightMm:evidence.heightMm},reference:'original-own-photo-pose; not physical-axis-certification'};
 return{images:{...images,...rotated,width:size.width,height:size.height,transform:{...images.transform,photoRotationDegrees:0,canonicalPhoto:correction}},evidence:{...evidence,widthMm:evidence.heightMm,heightMm:evidence.widthMm,photoRotationDegrees:0,canonicalPhoto:correction}};
}
