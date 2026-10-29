import type {RegisteredPartDraft} from '../types/registeredPart';

const families:Record<string,{tag:string;context:string;pair:boolean;landscape?:boolean}>={
 'チェコ ファイヤーポリッシュ':{tag:'チェコファイヤーポリッシュ',context:'熱加工でカットに丸みを持たせたファイヤーポリッシュです。',pair:false},
 'チェコ シズク横穴':{tag:'チェコシズク横穴',context:'プレスによって成型加工されたビーズです。',pair:true},
 'チェコ メロン':{tag:'チェコメロン・パンプキン',context:'プレスによって成型加工されたビーズです。',pair:false},
 'チェコ ラウンド':{tag:'チェコラウンド',context:'プレスによって成型加工されたビーズです。',pair:false},
"チェコ ピコノ":{"tag":"チェコピコノ","context":"プレスによって成型加工されたビーズです。","pair":false},
"チェコ ファイヤーポリッシュ ファム":{"tag":"チェコファイヤーポリッシュファム","context":"熱加工でカットに丸みを持たせたファイヤーポリッシュです。","pair":true},
"チェコ パンプキン":{"tag":"チェコメロン・パンプキン","context":"プレスによって成型加工されたビーズです。","pair":false},
"チェコ ファイヤーポリッシュ 3面カット":{"tag":"チェコファイヤーポリッシュ3面カット","context":"熱加工でカットに丸みを持たせたファイヤーポリッシュです。","pair":false},
"チェコ スター":{"tag":"チェコスター","context":"プレスによって成型加工されたビーズです。","pair":false},
"チェコ ファイヤーポリッシュ ナゲットカット":{"tag":"チェコファイヤーポリッシュナゲットカット","context":"熱加工でカットに丸みを持たせたファイヤーポリッシュです。","pair":false},
"チェコ キューブ":{"tag":"チェコキューブ","context":"プレスによって成型加工されたビーズです。","pair":true},
"チェコ フラットパンプキン":{"tag":"チェコフラットパンプキン","context":"プレスによって成型加工されたビーズです。","pair":true,"landscape":true},
"チェコ ハートライン2":{"tag":"チェコハートライン2","context":"プレスによって成型加工されたビーズです。","pair":true},
"チェコ フラワー3":{"tag":"チェコフラワー3","context":"プレスによって成型加工されたビーズです。","pair":false},
"チェコ ボタンカット":{"tag":"チェコボタンカット","context":"熱加工でカットに丸みを持たせたファイヤーポリッシュです。","pair":true,"landscape":true},
"チェコ ピンチ":{"tag":"チェコピンチ","context":"プレスによって成型加工されたビーズです。","pair":true},
"チェコ ハートフラワー":{"tag":"チェコハートフラワー","context":"プレスによって成型加工されたビーズです。","pair":false},
"チェコ 5弁花3":{"tag":"チェコ5弁花3","context":"プレスによって成型加工されたビーズです。","pair":false},
};
export function czechBodyBoxFamily(name:string){return name.normalize('NFKC').split(' / ')[0].replace(/\s+[^\s]+$/,'');}
export function nominalCzechBodyBox(draft:Pick<RegisteredPartDraft,'name'|'description'|'sizeText'|'tags'>){
 const family=czechBodyBoxFamily(draft.name),rule=families[family];
 if(!rule||!draft.tags.some(t=>t.normalize('NFKC')===rule.tag)||!draft.description.startsWith(rule.context))return undefined;
 const label=draft.sizeText.normalize('NFKC').replace(/\s/g,''),m=(rule.pair?/^(約)?(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)mm$/:/^(約)?(\d+(?:\.\d+)?)mm$/).exec(label);
 if(!m)return undefined;
 const widthMm=Number(m[2]),heightMm=rule.pair?Number(m[3]):widthMm;
 if(![widthMm,heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40&&Math.abs(n*40-Math.round(n*40))<1e-8))return undefined;
 return{recipe:'kiwa-czech-own-photo-body-box-v1',family,publishedSizeLabel:draft.sizeText,approximate:!!m[1],...(rule.pair?{publishedBodySizePairMm:[widthMm,heightMm],publishedSizeOrder:'source-first-to-box-width-second-to-box-height'}:{publishedBodySizeMm:widthMm}),widthMm,heightMm,layoutSizeChoice:rule.pair?'published-body-size-pair-box-for-layout-only':'published-body-size-square-box-for-layout-only',photoRotationDegrees:rule.pair&&(rule.landscape?widthMm<heightMm:widthMm>heightMm)?90:0,photoOrientationChoice:rule.pair?(rule.landscape?'reviewed-landscape-own-photo-aligned-to-box-by-layout-assumption':'reviewed-portrait-own-photo-aligned-to-box-by-layout-assumption'):'reviewed-own-photo-original-orientation',shapeReferenceKind:'own-product-photographed-projection-only-not-dimension-evidence',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,variantCutAppearanceVerified:false};
}
