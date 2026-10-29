import type {SharedImageCapture} from './sharedDiagramMapping';
export function ballDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;diametersMm:number[];diagramApproximate?:boolean;approximateHoleDiametersMm?:Record<string,number>}){
 const parse=(s:string)=>/^(約)?(\d+(?:\.\d+)?)mm$/.exec(s.normalize('NFKC').replace(/\s/g,''));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m[1]!==v[1]||m[2]!==v[2]||!recipe.diametersMm.includes(Number(m[2])))return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,publishedDiameterMm:Number(m[2]),approximate:!!m[1],diagramApproximate:recipe.diagramApproximate===true,...(recipe.approximateHoleDiametersMm?.[m[2]]!==undefined?{approximateHoleDiameterMm:recipe.approximateHoleDiametersMm[m[2]]}:{})}:undefined;
}
