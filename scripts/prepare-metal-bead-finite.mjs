import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {prepareCzechCrop} from './prepare-czech-crop.mjs';
export const metalBeadRecipe='kiwa-own-photo-metal-bead-finite-v1';
export const metalBeadManifestSha256='b8eb0d2c948db96cf763b61b35e74b731cc07230a2a640f0bfe3e69c6e8a3fad';
export const metalBeadRegistrySha256='a4032127881c8dc19fd32877f80c0c76b6eab6b22dac9550fd5b5d05d933f7db';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/metal-bead-finite.json',import.meta.url));
if(hash(bytes)!==metalBeadManifestSha256)throw Error('METAL_BEAD_MANIFEST_CHANGED');
const frozen=JSON.parse(bytes),pins=new Map(frozen.rows.map(r=>[r.draft.id,r]));
if(pins.size!==57)throw Error('METAL_BEAD_FINITE_COUNT');
export const isMetalBeadCandidate=id=>pins.has(id);

// Exact raw labels are parsed only after immutable full-object binding.
const codeProducts=new Set(['8711731151140','8711731511588','8711732134180','8711731708196','8711732756772']);
const holeProducts=new Set(['8715217338660','8715217240356','8715216617764','8715216519460','8715216879908','8715216781604','8715217600804','8715217469732','8715217109284','8715216978212']);
export function metalBeadLabel(d){
 let m,w,h,kind,sizeCode,character,publishedHoleText;
 if(codeProducts.has(d.productId)&&(m=/^([56])\(約([23])×([23])mm\)$/.exec(d.sizeText))&&((m[1]==='5'&&m[2]==='2'&&m[3]==='2')||(m[1]==='6'&&m[2]==='3'&&m[3]==='3'))){w=+m[2];h=+m[3];kind='metal-bead-code-pair';sizeCode=m[1];}
 else if(d.productId==='9227452547364'&&(m=/^([B-Z]|&|#|ハート|スター)：約7×8mm$/.exec(d.sizeText))){w=7;h=8;kind='metal-bead-initial-pair';character=m[1];}
 else if(holeProducts.has(d.productId)&&(m=/^約(11|13|14|14.5)×(7|9|10)mm\/φ約(1.0|1.3)mm$/.exec(d.sizeText))){w=+m[1];h=+m[2];kind='metal-bead-body-pair-hole';publishedHoleText='φ約'+m[3]+'mm';}
 else return undefined;
 if(![w,h].every(v=>v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8))return undefined;
 return {w,h,kind,sizeCode,character,publishedHoleText};
}
export const isMetalBeadEligible=id=>!!pins.get(id)&&!!metalBeadLabel(pins.get(id).draft);
if([...pins.values()].filter(p=>isMetalBeadEligible(p.draft.id)).length!==49)throw Error('METAL_BEAD_ELIGIBLE_COUNT');

const time=x=>typeof x==='string'?Date.parse(x):NaN;
const fail=()=>{throw Error('METAL_BEAD_BINDING_OR_REVIEW_INVALID');};
export async function assertMetalBeadInputs(registry,registryHash,captures){
 if(registryHash!==metalBeadRegistrySha256)fail();
 const byId=new Map(registry.parts.map(d=>[d.id,d]));
 for(const p of pins.values()){
  const d=byId.get(p.draft.id),c=captures.get(p.draft.imageUrls[0]);
  if(!d||hash(JSON.stringify(d))!==p.objectSha256||c?.sha256!==p.capture.sha256||c.url!==p.capture.url||!c.productIds?.includes(d.productId)||hash(await readFile('.local/calibration/gallery/bytes/'+c.sha256))!==c.sha256)fail();
 }
}
export function nominalMetalBead(draft,rule,review,capture){
 const p=pins.get(draft?.id);if(!p||!isMetalBeadEligible(draft.id)||hash(JSON.stringify(draft))!==p.objectSha256||draft.category!=='bead'||draft.sizeText!==p.draft.sizeText||draft.sourceUrl!==p.draft.sourceUrl||capture?.sha256!==p.capture.sha256||capture.url!==p.capture.url||!capture.productIds?.includes(draft.productId))fail();
 if(!rule||rule.draftId!==draft.id||rule.description!==draft.description||rule.name!==draft.name||rule.bodyReviewed!==true||rule.meaning!=='whole-product-body'||!rule.bodyPrefix?.trim()||!draft.description.startsWith(rule.bodyPrefix)||!draft.tags.includes(rule.tag)||!rule.family?.trim()||!rule.reviewedBy?.trim()||!Number.isFinite(time(rule.reviewedAt))||!rule.reason?.trim())fail();
 const r=review,c=r?.crop;if(!r||r.family!==rule.family||r.url!==capture.url||r.sha256!==capture.sha256||r.reviewed!==true||!r.reviewedBy?.trim()||!Number.isFinite(time(r.reviewedAt))||!r.photoPose?.trim()||!r.rotationReason?.trim()||r.rotationDegrees!==0||r.coordinateConvention!=='unrotated-decoded-raster-integer-pixels'||r.sourceWidth!==capture.pixelWidth||r.sourceHeight!==capture.pixelHeight||!c||!['left','top','width','height'].every(k=>Number.isSafeInteger(c[k]))||c.left<0||c.top<0||c.width<=0||c.height<=0||c.left+c.width>r.sourceWidth||c.top+c.height>r.sourceHeight)fail();
 const label=metalBeadLabel(draft);if(!label)fail();const {w,h,kind,sizeCode,character,publishedHoleText}=label;

 return {recipe:metalBeadRecipe,draftId:draft.id,manifestSha256:metalBeadManifestSha256,sourceObjectSha256:p.objectSha256,category:'bead',family:rule.family,sourceRule:rule,originalReview:r,publishedSizeLabel:draft.sizeText,publishedSizeLabelKind:kind,publishedSizeValuesMm:[w,h],publishedSizeOrder:'source-first-to-box-width-second-to-box-height',...(sizeCode?{publishedSizeCode:sizeCode}:{}),...(character?{variantCharacter:character}:{}),...(publishedHoleText?{publishedHoleText}:{}),approximate:true,widthMm:w,heightMm:h,layoutSizeChoice:'published-body-size-pair-box-for-layout-only',photoRotationDegrees:r.rotationDegrees,photoPose:r.photoPose,sourceCrop:{url:r.url,sha256:r.sha256,sourceWidth:r.sourceWidth,sourceHeight:r.sourceHeight,crop:r.crop,reviewed:true,reviewedBy:r.reviewedBy,reviewedAt:r.reviewedAt,coordinateConvention:r.coordinateConvention},shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false,imageScaleVerified:false,connectionReady:false};
}
export function validateMetalBeadSpec(spec){const p=pins.get(spec?.draftId);if(!p)fail();const expected=nominalMetalBead(p.draft,spec.sourceRule,spec.originalReview,p.capture);if(JSON.stringify(expected)!==JSON.stringify(spec))fail();return spec;}
export function metalBeadImageKey(sha,spec){validateMetalBeadSpec(spec);if(sha!==spec.sourceCrop.sha256)fail();return JSON.stringify({version:'nominal-metal-bead-reviewed-crop-v1',sha,spec});}
export function assertMetalBeadApproval(approval,spec,images){
 validateMetalBeadSpec(spec);const keyHash=hash(metalBeadImageKey(spec.sourceCrop.sha256,spec));
 if(!approval||approval.reviewed!==true||!approval.reviewedBy?.trim()||!(time(approval.reviewedAt)>Math.max(time(spec.sourceRule.reviewedAt),time(spec.sourceCrop.reviewedAt)))||approval.specSha256!==hash(JSON.stringify(spec))||approval.imageKeySha256!==keyHash||approval.finalImageKey!==keyHash||approval.originalSha256!==spec.sourceCrop.sha256||!['high','medium','thumbnail'].every(k=>/^[0-9a-f]{64}$/.test(approval[k+'Sha256'])))throw Error('METAL_BEAD_PROCESSED_APPROVAL_INVALID');
 if(images)for(const k of ['original','high','medium','thumbnail'])if(!Buffer.isBuffer(images[k])||hash(images[k])!==approval[k+'Sha256'])throw Error('METAL_BEAD_APPROVED_BYTES_MISMATCH');
}
export async function verifyMetalBeadAsset(asset,spec,approval,readImage){
 assertMetalBeadApproval(approval,spec);
 if(!asset||asset.content_hash!==approval.highSha256||asset.source_transform?.nominalImageKey!==approval.finalImageKey||asset.source_transform?.photoSha256!==approval.originalSha256||asset.source_transform?.version!=='nominal-metal-bead-reviewed-crop-v1'||!isDeepStrictEqual(asset.source_transform.processedApproval,approval))throw Error('METAL_BEAD_STORED_ASSET_MISMATCH');
 for(const [name,path]of [['original',asset.original_path],['high',asset.normalized_high_path],['medium',asset.normalized_medium_path],['thumbnail',asset.thumbnail_path]])if(!path||hash(await readImage(path))!==approval[name+'Sha256'])throw Error('METAL_BEAD_STORED_ASSET_BYTES_MISMATCH');
}
export async function prepareMetalBead(original,spec){validateMetalBeadSpec(spec);const result=await prepareCzechCrop(original,spec);return {...result,transform:{...result.transform,version:'nominal-metal-bead-reviewed-crop-v1',sourceObjectSha256:spec.sourceObjectSha256,manifestSha256:metalBeadManifestSha256}};}

export function assertMetalBeadExistingRows(rows){
 if(rows.length>1||rows.some(p=>p.is_archived||p.metadata?.nominalPlacement?.recipe!==metalBeadRecipe))throw Error('METAL_BEAD_EXISTING_SOURCE_CONFLICT');
}
export function assertMetalBeadCommitScope(currentWorkspace,initialWorkspace,approvedWorkspace,currentManifestHash,initialManifestHash){
 if(!currentWorkspace||currentWorkspace!==initialWorkspace||currentWorkspace!==approvedWorkspace||currentManifestHash!==initialManifestHash)throw Error('METAL_BEAD_COMMIT_SCOPE_CHANGED');
}
export function assertMetalBeadPartReadback(aggregate,draft,evidence,payload){
 const p=aggregate?.part,m=p?.metadata;
 if(!p||p.is_archived||p.category!=='bead'||p.name!==draft.name||p.sku!==draft.sku||p.source_url!==draft.sourceUrl||!isDeepStrictEqual([...(p.tags??[])].sort(),[...draft.tags].sort())||m?.sourceDraftId!==draft.id||!isDeepStrictEqual(m.nominalPlacement,evidence)||!isDeepStrictEqual(m.publishedPurchase,draft.purchase)||m.publishedPrice!==draft.price||m.publishedCurrency!==draft.currency)throw Error('METAL_BEAD_PART_READBACK_MISMATCH');
 const expected=payload.purchase_spec,actual=aggregate.purchase_spec;
 if(expected){if(!actual||Object.entries(expected).some(([k,v])=>!isDeepStrictEqual(actual[k],v)))throw Error('METAL_BEAD_PURCHASE_READBACK_MISMATCH');}
 else if(actual!=null)throw Error('METAL_BEAD_INVENTED_PURCHASE_SPEC');
}
