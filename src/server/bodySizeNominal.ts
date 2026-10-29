import type {RegisteredPartDraft} from '../types/registeredPart';
export function nominalBodySize(draft:Pick<RegisteredPartDraft,'name'|'description'|'sizeText'|'tags'>){
 const cut=/^(?:\[大袋\])?貴和クリスタル\s+#(5000|5328)(?:\s|$)/.exec(draft.name.normalize('NFKC'))?.[1];
 const bodySentence='ビーズと呼ばれる通し穴の開いているパーツです。';
 const materialNotice=cut==='5000'&&draft.name.normalize('NFKC').startsWith('貴和クリスタル #5000 RCペリドット /')&&draft.description.startsWith('※素材変更により商品名、価格が変更になりました。')&&draft.description.includes(bodySentence);
 if(!cut||!draft.description.startsWith(bodySentence)&&!materialNotice)return undefined;
 if(!draft.tags.some(t=>t.normalize('NFKC')===`#${cut}`||t.normalize('NFKC')===`#${cut}大袋`))return undefined;
 const sizeLabel=draft.sizeText.normalize('NFKC').replace(/\s/g,'');
 const parseLabel=cut==='5328'&&sizeLabel==='3mm(RC)'?'3mm':sizeLabel;
 const m=/^(約)?(\d+(?:\.\d+)?)mm(?:\(店舗限定\))?$/.exec(parseLabel);
 const size=m?Number(m[2]):0;if(!Number.isFinite(size)||size<=0||size>40)return undefined;
 return{recipe:'kiwa-bead-body-size-layout-v1',cut,publishedBodySizeMm:size,publishedSizeLabel:draft.sizeText,approximate:!!m?.[1],widthMm:size,heightMm:size,layoutSizeChoice:'published-body-size-square-box-for-layout-only',sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false,shapeReferenceKind:'official-cut-projection-only-not-dimension-evidence',shapeReferenceSha256:cut==='5000'?'986e22d9088e08f03740ab942de0dc80d6859ce9b3a8707d85d1643a0b9a7f5b':'e897f13166ec995625ff48749665f1b58eec1a966efea4bc7adc19a5e19b2f28',shapeReferenceSourceUrl:cut==='5000'?'https://kiwaseisakujo.jp/products/g-kiwacrystals-kc5000-0a-014':'https://kiwaseisakujo.jp/products/g-kiwacrystals-kc5000-0f-122',shapeReferenceProductId:cut==='5000'?'8709558599972':'8709616369956',shapeReferenceUrl:cut==='5000'?'https://cdn.shopify.com/s/files/1/0758/6503/0948/files/5000_cut_c9217545-ba45-4ae8-a88a-da2ed439dd19.jpg?v=1694477294':'https://cdn.shopify.com/s/files/1/0758/6503/0948/files/5328_cut_9e264add-4f1d-4a6c-b635-26371e2aecbd.jpg?v=1694478409',shapeReferenceRegion:cut==='5000'?'side and axial projections':'lower pair labelled #5328',variantCutAppearanceVerified:false};
}
