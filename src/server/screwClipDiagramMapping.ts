import type {SharedImageCapture} from './sharedDiagramMapping';
export function screwClipDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;heightsMm:Record<string,number>}){
 const parse=(s:string)=>/^(\d+(?:\.\d+)?mm(?:\(小\))?)$/.exec(s.normalize('NFKC').replace(/\s/g,''));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m[1]!==v[1]||recipe.heightsMm[m[1]]===undefined)return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,dishSizeLabel:m[1],approximateClipHeightMm:recipe.heightsMm[m[1]]}:undefined;
}
