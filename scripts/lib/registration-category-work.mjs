import{isDeepStrictEqual}from'node:util';import{sha256,sourceBinding,assertSemanticRule,assertReviewEnvelope}from'./registration-work.mjs';import{categoryBoxImageKey}from'../prepare-category-box.mjs';
export function categoryRuleFromSemantic(rule,registryHash,d,c){
 assertSemanticRule(rule,registryHash,d,c);if(!rule.family?.trim())throw Error('WORK_CATEGORY_FAMILY');
 return{draftId:d.id,productId:d.productId,name:d.name,family:rule.family,tag:rule.tag,description:d.description,bodyPrefix:d.description,bodyReviewed:true,category:d.category,labelKind:rule.labelKind};
}
export function assertCategoryWorkEntry(entry,registryHash,d,c,spec,images){
 if(spec?.photoRotationDegrees!==0)throw Error('WORK_CATEGORY_CANONICAL_ROTATION_UNSUPPORTED');
 const binding=assertSemanticRule(entry.semanticRule,registryHash,d,c),review=entry.originalReview,envelope=entry.reviewEnvelope;
 if(entry.draftId!==d.id||!spec||spec.recipe!=='kiwa-own-photo-category-box-v1'||!isDeepStrictEqual(envelope?.original,review)||review.family!==entry.semanticRule.family||spec.family!==review.family||review.sha256!==c.sha256||review.url!==c.url||spec.sourceCrop.sha256!==c.sha256||spec.sourceCrop.sourceWidth!==c.pixelWidth||spec.sourceCrop.sourceHeight!==c.pixelHeight||!isDeepStrictEqual(spec.sourceCrop.crop,review.crop)||spec.sourceCrop.reviewedAt!==review.reviewedAt||spec.sourceCrop.reviewedBy!==review.reviewedBy||spec.photoRotationDegrees!==review.rotationDegrees||spec.sourceCrop.coordinateConvention!==review.coordinateConvention)throw Error('WORK_CATEGORY_SPEC_REVIEW');
 assertReviewEnvelope(envelope,binding);
 if(envelope.specSha256!==sha256(JSON.stringify(spec))||envelope.imageKeySha256!==sha256(categoryBoxImageKey(c.sha256,spec)))throw Error('WORK_CATEGORY_KEY');
 if(images)for(const name of['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[name])||sha256(images[name])!==envelope.processed[name+'Sha256'])throw Error('WORK_CATEGORY_APPROVED_BYTES');
 return entry;
}
export function categoryWorkAssetKey(entry){return sha256(JSON.stringify({version:'registration-work-source-asset-v1',imageKeySha256:entry.reviewEnvelope.imageKeySha256,sourceBindingSha256:sha256(JSON.stringify(entry.reviewEnvelope.sourceBinding)),semanticRuleSha256:sha256(JSON.stringify(entry.semanticRule)),reviewEnvelopeSha256:sha256(JSON.stringify(entry.reviewEnvelope))}));}
export function bindCategoryWorkPrepared(prepared,entry){return{...prepared,transform:{...prepared.transform,workSemanticRuleSha256:sha256(JSON.stringify(entry.semanticRule)),workReviewEnvelope:entry.reviewEnvelope}};}
export async function verifyCategoryWorkAsset(asset,entry,readImage){
 const e=entry.reviewEnvelope;
 if(!asset||asset.content_hash!==e.processed.highSha256||asset.source_transform?.nominalImageKey!==categoryWorkAssetKey(entry)||asset.source_transform?.workSemanticRuleSha256!==sha256(JSON.stringify(entry.semanticRule))||!isDeepStrictEqual(asset.source_transform?.workReviewEnvelope,e))throw Error('WORK_CATEGORY_STORED_ASSET');
 for(const [k,path]of[['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||sha256(await readImage(path))!==e.processed[k+'Sha256'])throw Error('WORK_CATEGORY_STORED_BYTES');
}
