import {ringSizeKey} from './diagramCalibration';
export interface SharedImageCapture {url:string;sha256:string;productIds:string[];fetchedAt:string;finalUrl:string}
export function sharedDiagramCapture(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];reviewedHash:string;reviewedSize:string;captures:SharedImageCapture[]}){
 if(input.variant.id!==input.variantId||input.variant.sku!==input.sku||ringSizeKey(input.sizeText)!==input.reviewedSize||ringSizeKey(input.variant.sizeText)!==input.reviewedSize)return;
 const found=input.captures.filter(c=>c.sha256===input.reviewedHash&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));
 return found.sort((a,b)=>a.url.localeCompare(b.url))[0];
}
