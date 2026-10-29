import type {SharedImageCapture} from './sharedDiagramMapping';
export function crystalDiagramRange(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;ranges:Record<string,number[]>}){
 const label=input.sizeText.normalize('NFKC').trim();
 if(!recipe.productIds.includes(input.productId)||! /^(PP|SS)\d+$/.test(label)||input.variant.id!==input.variantId||input.variant.sku!==input.sku||input.variant.sizeText.normalize('NFKC').trim()!==label)return;
 const range=recipe.ranges[label];if(!range||range.length!==2||range[0]<=0||range[1]<range[0])return;
 const capture=input.captures.filter(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url)).sort((a,b)=>a.url.localeCompare(b.url))[0];
 return capture?{capture,label,diameterRangeMm:{min:range[0],max:range[1],approximate:true}}:undefined;
}
