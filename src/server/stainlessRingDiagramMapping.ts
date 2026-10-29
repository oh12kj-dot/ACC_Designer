import type {SharedImageCapture} from './sharedDiagramMapping';
export function stainlessRingDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;innerDiametersMm:Record<string,number>}){
 const parse=(s:string)=>/^(\d+(?:\.\d+)?[×x]\d+(?:\.\d+)?mm)$/.exec(s.normalize('NFKC').replace(/\s/g,'').replace('x','×'));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m[1]!==v[1]||recipe.innerDiametersMm[m[1]]===undefined)return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,sizeLabel:m[1],wireDiameterMm:Number(m[1].split("×")[0]),outerDiameterMm:Number(m[1].split("×")[1].replace("mm","")),approximateInnerDiameterMm:recipe.innerDiametersMm[m[1]]}:undefined;
}
