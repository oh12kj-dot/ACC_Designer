import sharp from 'sharp';
import type { RegisteredPartDraft } from '../types/registeredPart';

/** Published nominal sizes support layout; they never certify image scale or holes. */
export function nominalSphere(draft: Pick<RegisteredPartDraft,'name'|'description'|'sizeText'>) {
 const name=draft.name.normalize('NFKC'),size=draft.sizeText.normalize('NFKC').replace(/\s/g,'');
 if(!/#5810(?!\d)/.test(name)||!draft.description.includes('真円形のビーズ'))return undefined;
 const match=size.match(/^(2|3|4|5|6|8|10|12)mm(?:\(店舗限定\))?$/);
 return match?{recipe:'kiwa-5810-nominal-v1',diameterMm:Number(match[1]),sizeLabel:draft.sizeText}:undefined;
}

export const nominalPlacementNote='掲載サイズで配置できます。商品写真を目安の輪郭に加工しています。画像尺度・サイズ別の外観・接続位置・穴径は未確認です。';

export function nominalAdditionalSphere(draft:Pick<RegisteredPartDraft,'name'|'description'|'tags'|'sizeText'>) {
 const name=draft.name.normalize('NFKC');
 const cut=/#(5818|5809)(?!\d)/.exec(name)?.[1];
 const shapeBasis=cut&&draft.description.includes('真円形')?`official-${cut}-description:真円形`
  :draft.tags.includes('コットンパール丸玉')?'official-product-tag:コットンパール丸玉'
  :/^銅玉\s/.test(name)&&draft.tags.includes('メタルビーズ銅玉')?'official-product-tag:メタルビーズ銅玉':undefined;
 if(!shapeBasis)return undefined;
 const match=draft.sizeText.normalize('NFKC').replace(/\s/g,'').match(/^(約)?(\d+(?:\.\d+)?)mm(?:\(店舗限定\))?$/);
 const diameterMm=match?Number(match[2]):0;if(!Number.isFinite(diameterMm)||diameterMm<=0||diameterMm>40)return undefined;
 return{recipe:'kiwa-additional-sphere-nominal-v1',diameterMm,sizeLabel:draft.sizeText,approximate:!!match?.[1],shapeBasis};
}

export function nominalRoundPearl(draft:Pick<RegisteredPartDraft,'tags'|'sizeText'>) {
 // Official round-pearl classification distinguishes the bead size from the strand's sale length.
 if(!draft.tags.includes('樹脂パール丸'))return undefined;
 const match=draft.sizeText.normalize('NFKC').replace(/\s/g,'').match(/^(\d+(?:\.\d+)?)mm$/);
 const diameterMm=match?Number(match[1]):0;if(!Number.isFinite(diameterMm)||diameterMm<=0||diameterMm>30)return undefined;
 return{recipe:'kiwa-round-pearl-nominal-v1',diameterMm,sizeLabel:draft.sizeText,shapeBasis:'official-product-tag:樹脂パール丸'};
}

export function nominalBall(draft:Pick<RegisteredPartDraft,'id'|'variantId'|'sku'>&{name?:string},evidence?:{kind:string;sourceDraftId:string;variantId:string;sku?:string;publishedDiameterMm?:number;approximate?:boolean;diagramSha256:string;diagramUrl:string}) {
 // Only these representative photos were checked as single spherical objects.
 if(!/^(銅玉\s|コットンパール 丸玉\s)/.test(draft.name??''))return undefined;
 if(evidence?.kind!=='official-ball-diameter-only'||evidence.sourceDraftId!==draft.id||evidence.variantId!==draft.variantId||evidence.sku!==draft.sku)return undefined;
 const diameterMm=evidence.publishedDiameterMm;if(!diameterMm||!Number.isFinite(diameterMm)||diameterMm<=0||diameterMm>40)return undefined;
 return{recipe:'kiwa-ball-nominal-v1',diameterMm,approximate:evidence.approximate??false,diagramSha256:evidence.diagramSha256,diagramUrl:evidence.diagramUrl};
}

export function nominalDiameterRange(draft:Pick<RegisteredPartDraft,'id'|'variantId'|'sku'>,evidence?:{kind:string;sourceDraftId:string;variantId:string;sku?:string;label?:string;diameterRangeMm?:{min:number;max:number;approximate:boolean};diagramSha256:string;diagramUrl:string}) {
 if(evidence?.kind!=='official-crystal-diameter-range-only'||evidence.sourceDraftId!==draft.id||evidence.variantId!==draft.variantId||evidence.sku!==draft.sku)return undefined;
 const range=evidence.diameterRangeMm;if(!range||![range.min,range.max].every(n=>Number.isFinite(n)&&n>0&&n<=40)||range.min>range.max)return undefined;
 return{recipe:'kiwa-crystal-range-nominal-v1',diameterMm:Number(((range.min+range.max)/2).toFixed(4)),diameterRangeMm:{...range},publishedSizeLabel:evidence.label??null,sizeChoice:'midpoint-for-layout-only',diagramSha256:evidence.diagramSha256,diagramUrl:evidence.diagramUrl};
}

export function nominalAxes(draft:Pick<RegisteredPartDraft,'id'|'variantId'|'sku'>&{name?:string},evidence?:{kind:string;sourceDraftId:string;variantId:string;sku?:string;outerWidthMm?:number;outerHeightMm?:number;diagramSha256:string;diagramUrl:string;axisApproximate?:unknown;diagramApproximate?:boolean}) {
 // The #4809 representative gallery includes multiple objects; a single-object recipe is pending.
 if(/#4809(?!\d)/.test(draft.name?.normalize('NFKC')??''))return undefined;
 if(evidence?.kind!=='official-crystal-frontal-axes-only'||evidence.sourceDraftId!==draft.id||evidence.variantId!==draft.variantId||evidence.sku!==draft.sku)return undefined;
 const widthMm=evidence.outerWidthMm,heightMm=evidence.outerHeightMm;
 if(!widthMm||!heightMm||![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-8))return undefined;
 return{recipe:'kiwa-frontal-axes-nominal-v1',widthMm,heightMm,diagramSha256:evidence.diagramSha256,diagramUrl:evidence.diagramUrl,axisApproximate:evidence.axisApproximate??null,diagramApproximate:evidence.diagramApproximate??false};
}

/** Fits the product's representative photograph to published frontal axes, not measured image endpoints. */
export async function prepareNominalAxes(original:Buffer,widthMm:number,heightMm:number) {
 if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-8))throw new Error('NOMINAL_AXES_INVALID');
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const originalMime=meta.format==='jpeg'?'image/jpeg':meta.format==='png'?'image/png':meta.format==='webp'?'image/webp':undefined;
 if(!originalMime||!meta.width||!meta.height||meta.pages&&meta.pages>1)throw new Error('NOMINAL_IMAGE_INVALID');
 const trimmed=await sharp(original).flatten({background:'#ffffff'}).trim({background:'#ffffff',threshold:12}).png().toBuffer();
 const bounds=await sharp(trimmed).metadata();if(!bounds.width||!bounds.height||Math.min(bounds.width/meta.width,bounds.height/meta.height)<.2)throw new Error('NOMINAL_PHOTO_REVIEW_REQUIRED');
 const width=Math.round(widthMm*40),height=Math.round(heightMm*40);
 const {data,info}=await sharp(trimmed).resize(width,height,{fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4)if(data[i]>=250&&data[i+1]>=250&&data[i+2]>=250)data[i+3]=0;
 const high=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer(),medium=await sharp(high).resize({width:512,height:512,fit:'inside',withoutEnlargement:true}).png().toBuffer(),thumbnail=await sharp(high).resize({width:128,height:128,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 return{originalMime,high,medium,thumbnail,width,height,mmPerPx:1/40,transform:{version:'nominal-frontal-photo-v1',placementMode:'published-nominal',publishedWidthMm:widthMm,publishedHeightMm:heightMm,trimThreshold:12,trimWidth:bounds.width,trimHeight:bounds.height,whiteMaskThreshold:250,projection:'provisional-fit-to-frontal-axes',imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false}};
}

export async function prepareNominalSphere(original:Buffer,diameterMm:number) {
 if(!Number.isFinite(diameterMm)||diameterMm<=0||diameterMm>100)throw new Error('NOMINAL_SIZE_INVALID');
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const originalMime=meta.format==='jpeg'?'image/jpeg':meta.format==='png'?'image/png':meta.format==='webp'?'image/webp':undefined;
 if(!originalMime||!meta.width||!meta.height||meta.pages&&meta.pages>1)throw new Error('NOMINAL_IMAGE_INVALID');
 // White-background trim and a circular silhouette are a provisional layout aid.
 // Neither operation identifies measured endpoints; provenance records this distinction.
 const trim=await sharp(original).flatten({background:'#ffffff'}).trim({background:'#ffffff',threshold:12}).png().toBuffer();
 const bounds=await sharp(trim).metadata();
 if(!bounds.width||!bounds.height||Math.max(bounds.width/bounds.height,bounds.height/bounds.width)>1.35||Math.min(bounds.width/meta.width,bounds.height/meta.height)<.25)throw new Error('NOMINAL_PHOTO_REVIEW_REQUIRED');
 const width=256,height=256;
 const mask=Buffer.from('<svg width="256" height="256"><circle cx="128" cy="128" r="128" fill="white"/></svg>');
 const high=await sharp(trim).resize(width,height,{fit:'fill'}).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const medium=high,thumbnail=await sharp(high).resize(128,128).png().toBuffer();
 return {originalMime,high,medium,thumbnail,width,height,mmPerPx:diameterMm/width,transform:{version:'nominal-sphere-photo-v1',placementMode:'published-nominal',publishedDiameterMm:diameterMm,trimThreshold:12,trimWidth:bounds.width,trimHeight:bounds.height,silhouette:'provisional-circle',imageScaleVerified:false,variantAppearanceVerified:false,connectionReady:false}};
}

/** Reviewed additional-sphere galleries show a single bead or a horizontal front/back pair. */
export async function prepareNominalAdditionalSphere(original:Buffer,diameterMm:number) {
 const meta=await sharp(original,{limitInputPixels:16777216,failOn:'warning'}).metadata();
 const originalMime=meta.format==='jpeg'?'image/jpeg':meta.format==='png'?'image/png':meta.format==='webp'?'image/webp':undefined;
 if(!originalMime||!meta.width||!meta.height||meta.pages&&meta.pages>1)throw new Error('NOMINAL_IMAGE_INVALID');
 const trimmed=await sharp(original).flatten({background:'#ffffff'}).trim({background:'#ffffff',threshold:12}).png().toBuffer();
 const bounds=await sharp(trimmed).metadata();if(!bounds.width||!bounds.height)throw new Error('NOMINAL_PHOTO_REVIEW_REQUIRED');
 if(bounds.width/bounds.height<=1.35)return prepareNominalSphere(original,diameterMm);
 if(bounds.width/bounds.height<1.6||bounds.width/bounds.height>2.5)throw new Error('NOMINAL_PHOTO_REVIEW_REQUIRED');
 const region={left:0,top:0,width:Math.floor(bounds.width/2),height:bounds.height};
 const cropped=await sharp(trimmed).extract(region).png().toBuffer();
 const prepared=await prepareNominalSphere(cropped,diameterMm);
 return{...prepared,originalMime,transform:{...prepared.transform,version:'nominal-reviewed-front-back-pair-v1',sourceTrimWidth:bounds.width,sourceTrimHeight:bounds.height,selectedRegionAfterWhiteTrim:region,selection:'left-object-of-reviewed-horizontal-pair'}};
}
