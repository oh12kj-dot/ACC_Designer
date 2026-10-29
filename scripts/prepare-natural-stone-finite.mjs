import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import sharp from 'sharp';
import {prepareCzechCrop} from './prepare-czech-crop.mjs';
export const naturalStoneRecipe='kiwa-own-photo-natural-stone-body-finite-v1';
export const naturalStoneManifestSha256='0e857fbb0efe6aa5cb4f8e0b8870ef5dc31645ac753bc39231b631feedf96a14';
export const naturalStoneRegistrySha256='a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/natural-stone-finite.json',import.meta.url));
if(hash(bytes)!==naturalStoneManifestSha256)throw Error('NATURAL_STONE_MANIFEST_CHANGED');
const frozen=JSON.parse(bytes),pins=new Map(frozen.rows.map(r=>[r.draft.id,r]));
if(pins.size!==113)throw Error('NATURAL_STONE_FINITE_COUNT');
export const isNaturalStoneCandidate=id=>pins.has(id);

const allowed=new Set(frozen.eligibleSourceIds);
export function naturalStoneLabel(d){
 const p=pins.get(d?.id);if(!p||!p.eligible||p.qualityHeld||!allowed.has(d.id)||hash(JSON.stringify(d))!==p.objectSha256||d.sizeText!==p.rawLabel)return undefined;
 const w=p.widthMm,h=p.heightMm;if(![w,h].every(v=>v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8))return undefined;
 const mid=r=>Array.isArray(r)&&r.length===2&&r.every(v=>Number.isFinite(v)&&v>0&&v<=40)&&r[0]<=r[1]?(r[0]+r[1])/2:NaN;
 if(p.publishedRanges){const r=p.publishedRanges;const ew=r.widthMm?mid(r.widthMm):mid(r.firstMm),eh=r.heightMm?mid(r.heightMm):mid(r.secondMm);if(ew!==w||eh!==h)return undefined;}
 else{const raw=/^約(\d+(?:\.\d+)?)mm/.exec(p.rawLabel);if(!raw||+raw[1]!==w||w!==h||![32,64].includes(p.facetCount))return undefined;}
 return {w,h,kind:p.labelKind,approximate:true};
}
export const isNaturalStoneEligible=id=>!!pins.get(id)&&!!naturalStoneLabel(pins.get(id).draft);
if([...pins.values()].filter(p=>isNaturalStoneEligible(p.draft.id)).length!==45)throw Error('NATURAL_STONE_ELIGIBLE_COUNT');

const time=x=>typeof x==='string'?Date.parse(x):NaN;
const fail=()=>{throw Error('NATURAL_STONE_BINDING_OR_REVIEW_INVALID');};
export function assertNaturalStoneSourceHash(sha){if(sha!==frozen.sourceFileSha256)fail();}
export async function assertNaturalStoneInputs(registry,registryHash,captures){
 if(registryHash!==naturalStoneRegistrySha256)fail();assertNaturalStoneSourceHash(hash(await readFile('.local/setup/natural-stone-next-source-candidates.json')));
 const byId=new Map(registry.parts.map(d=>[d.id,d]));
 for(const p of pins.values()){
  const d=byId.get(p.draft.id),c=captures.get(p.draft.imageUrls[0]);
  if(!d||hash(JSON.stringify(d))!==p.objectSha256||c?.sha256!==p.capture.sha256||c.url!==p.capture.url||c.pixelWidth!==p.capture.pixelWidth||c.pixelHeight!==p.capture.pixelHeight||!isDeepStrictEqual(c.productIds,p.capture.productIds)||!c.productIds?.includes(d.productId))fail();
  const raw=await readFile('.local/calibration/gallery/bytes/'+c.sha256),decoded=await sharp(raw).metadata();if(hash(raw)!==c.sha256||decoded.width!==p.capture.pixelWidth||decoded.height!==p.capture.pixelHeight)fail();
 }
}
export function nominalNaturalStone(draft,rule,review,capture){
 const p=pins.get(draft?.id);if(!p||!isNaturalStoneEligible(draft.id)||hash(JSON.stringify(draft))!==p.objectSha256||draft.category!=='other'||draft.sizeText!==p.draft.sizeText||draft.sourceUrl!==p.draft.sourceUrl||capture?.sha256!==p.capture.sha256||capture.url!==p.capture.url||capture.pixelWidth!==p.capture.pixelWidth||capture.pixelHeight!==p.capture.pixelHeight||!isDeepStrictEqual(capture.productIds,p.capture.productIds)||!capture.productIds?.includes(draft.productId))fail();
 if(!rule||rule.draftId!==draft.id||rule.description!==draft.description||rule.name!==draft.name||rule.bodyReviewed!==true||rule.meaning!=='whole-product-body'||!rule.bodyPrefix?.trim()||!draft.description.startsWith(rule.bodyPrefix)||!draft.tags.includes(rule.tag)||!rule.family?.trim()||!rule.reviewedBy?.trim()||!Number.isFinite(time(rule.reviewedAt))||!rule.reason?.trim()||rule.sourceObjectSha256!==p.objectSha256||rule.rawLabel!==draft.sizeText)fail();
 const r=review,c=r?.crop;if(!r||r.family!==rule.family||r.url!==capture.url||r.sha256!==capture.sha256||r.reviewed!==true||!r.reviewedBy?.trim()||!Number.isFinite(time(r.reviewedAt))||!r.photoPose?.trim()||!r.rotationReason?.trim()||r.rotationDegrees!==0||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||r.sourceWidth!==capture.pixelWidth||r.sourceHeight!==capture.pixelHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.sourceWidth||c.top+c.height>r.sourceHeight)fail();
 const label=naturalStoneLabel(draft);if(!label)fail();const {w,h,kind,approximate}=label;

 return {recipe:naturalStoneRecipe,draftId:draft.id,manifestSha256:naturalStoneManifestSha256,sourceObjectSha256:p.objectSha256,category:'other',family:rule.family,sourceRule:rule,originalReview:r,publishedSizeLabel:draft.sizeText,publishedSizeLabelKind:kind,publishedSizeValuesMm:[w,h],publishedSizeOrder:p.axisInterpretation,publishedBodyRanges:p.publishedRanges??null,publishedFacetCount:p.facetCount??null,naturalVariationUnverified:true,sourceDimensionMeaningReason:p.reason,approximate,widthMm:w,heightMm:h,layoutSizeChoice:p.layoutSizeChoice,photoRotationDegrees:r.rotationDegrees,photoPose:r.photoPose,sourceCrop:{url:r.url,sha256:r.sha256,sourceWidth:r.sourceWidth,sourceHeight:r.sourceHeight,crop:r.crop,reviewed:true,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt,coordinateConvention:r.coordinateConvention},shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false,imageScaleVerified:false,connectionReady:false};
}
export function validateNaturalStoneSpec(spec){const p=pins.get(spec?.draftId);if(!p)fail();const expected=nominalNaturalStone(p.draft,spec.sourceRule,spec.originalReview,p.capture);if(JSON.stringify(expected)!==JSON.stringify(spec))fail();return spec;}
export function naturalStoneImageKey(sha,spec){validateNaturalStoneSpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-natural-stone-reviewed-crop-v1',sha,spec});}
export function assertNaturalStoneApproval(approval,spec,images){
 validateNaturalStoneSpec(spec);const keyHash=hash(naturalStoneImageKey(spec.sourceCrop.sha256,spec));
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>Math.max(time(spec.sourceRule.reviewedAt),time(spec.sourceCrop.reviewedAt)))||approval.specSha256!==hash(JSON.stringify(spec))||approval.imageKeySha256!==keyHash||approval.finalImageKey!==keyHash||approval.originalSha256!==spec.sourceCrop.sha256||!['high','medium','thumbnail'].every(k=>/^[0-9a-f]{64}$/.test(approval[k+'Sha256'])))throw Error('NATURAL_STONE_PROCESSED_APPROVAL_INVALID');
 if(images)for(const k of ['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[k])||hash(images[k])!==approval[k+'Sha256'])throw Error('NATURAL_STONE_APPROVED_BYTES_MISMATCH');
}
export async function verifyNaturalStoneAsset(asset,spec,approval,readImage){
 assertNaturalStoneApproval(approval,spec);
 if(!asset||asset.content_hash!==approval.highSha256||asset.source_transform?.nominalImageKey!==approval.finalImageKey||asset.source_transform?.photoSha256!==approval.originalSha256||asset.source_transform?.version!=='nominal-natural-stone-reviewed-crop-v1'||!isDeepStrictEqual(asset.source_transform.processedApproval,approval))throw Error('NATURAL_STONE_STORED_ASSET_MISMATCH');
 for(const [name,path]of [['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||hash(await readImage(path))!==approval[name+'Sha256'])throw Error('NATURAL_STONE_STORED_ASSET_BYTES_MISMATCH');
}
export async function prepareNaturalStone(original,spec){validateNaturalStoneSpec(spec);const result=await prepareCzechCrop(original,spec);return {...result,transform:{...result.transform,version:'nominal-natural-stone-reviewed-crop-v1',sourceObjectSha256:spec.sourceObjectSha256,manifestSha256:naturalStoneManifestSha256}};}

export function assertNaturalStoneExistingRows(rows){
 if(rows.length>1||rows.some(p=>p.is_archived||p.metadata?.nominalPlacement?.recipe!==naturalStoneRecipe))throw Error('NATURAL_STONE_EXISTING_SOURCE_CONFLICT');
}
export function assertNaturalStoneCommitScope(currentWorkspace,initialWorkspace,approvedWorkspace,currentManifestHash,initialManifestHash){
 if(!currentWorkspace||currentWorkspace!==initialWorkspace||currentWorkspace!==approvedWorkspace||currentManifestHash!==initialManifestHash)throw Error('NATURAL_STONE_COMMIT_SCOPE_CHANGED');
}
export function assertNaturalStonePartReadback(aggregate,draft,evidence,payload){
 const p=aggregate?.part,m=p?.metadata;
 if(!Array.isArray(aggregate?.through_holes)||!Array.isArray(aggregate?.connection_points)||!p||p.notes!==naturalStoneExpectedNotes(draft,evidence)||p.is_archived||p.width_mm!==evidence.widthMm||p.height_mm!==evidence.heightMm||aggregate.through_holes?.length||aggregate.connection_points?.length||p.category!=='other'||p.name!==draft.name||p.sku!==draft.sku||p.source_url!==draft.sourceUrl||!isDeepStrictEqual([...(p.tags??[])].sort(),[...draft.tags].sort())||m?.sourceDraftId!==draft.id||!isDeepStrictEqual(m.nominalPlacement,evidence)||!isDeepStrictEqual(m.publishedPurchase,draft.purchase)||m.publishedPrice!==draft.price||m.publishedCurrency!==draft.currency)throw Error('NATURAL_STONE_PART_READBACK_MISMATCH');
 const expected=payload.purchase_spec,actual=aggregate.purchase_spec;
 if(expected){if(!actual||Object.entries(expected).some(([k,v])=>!isDeepStrictEqual(actual[k],v)))throw Error('NATURAL_STONE_PURCHASE_READBACK_MISMATCH');}
 else if(actual!=null)throw Error('NATURAL_STONE_INVENTED_PURCHASE_SPEC');
}

export function naturalStoneExpectedPayload(draft,evidence){const payload={part:{notes:naturalStoneExpectedNotes(draft,evidence),metadata:{sourceDraftId:draft.id,nominalPlacement:evidence}}};const p=draft.purchase;if(draft.currency==='JPY'&&p?.unit==='piece'&&Number.isSafeInteger(p.quantity)&&p.quantity>0&&!p.approximate)payload.purchase_spec={sale_mode:p.quantity===1?'piece':'pack',pack_quantity:p.quantity===1?null:p.quantity,minimum_units:1,unit_price:draft.price??null,currency:'JPY'};return payload;}
export function naturalStoneFullEvidence(draft,spec){return {...spec,sourceDraftId:draft.id,variantId:draft.variantId,sku:draft.sku,sourceUrl:draft.sourceUrl,sourceFetchedAt:draft.sourceFetchedAt,registrySha256:naturalStoneRegistrySha256,photoUrl:spec.sourceCrop.url,photoSha256:spec.sourceCrop.sha256,imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false};}

export function naturalStoneNotice(spec){validateNaturalStoneSpec(spec);return ' 掲載概寸「'+spec.publishedSizeLabel+'」から仮配置枠（幅'+spec.widthMm+'mm・高さ'+spec.heightMm+'mm）を選択しています。'+(spec.publishedBodyRanges?'範囲は各軸の算術中点を配置の目安にしたもので、同じ個体で同時に成立する保証はありません。':'')+'天然石の個体差、実寸、掲載軸と写真の対応、画像尺度、サイズ別外観、穴径・接続位置は未確認です。';}

export function naturalStoneExpectedNotes(draft,evidence){const p=pins.get(draft?.id);if(!p)fail();const spec=nominalNaturalStone(draft,evidence.sourceRule,evidence.originalReview,p.capture);return '掲載サイズで配置できます。商品写真を目安の輪郭に加工しています。画像尺度・サイズ別の外観・接続位置・穴径は未確認です。'+naturalStoneNotice(spec);}
