import type {SharedImageCapture} from './sharedDiagramMapping';
export function wireDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;gauges:Record<string,number>}){
 const parse=(s:string)=>/^#(\d+)\(約(\d+(?:\.\d+)?)mm\)$/.exec(s.normalize('NFKC').replace(/\s/g,''));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m[1]!==v[1]||Number(m[2])!==Number(v[2])||recipe.gauges[m[1]]!==Number(m[2]))return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,gauge:m[1],approximateWireDiameterMm:Number(m[2])}:undefined;
}
