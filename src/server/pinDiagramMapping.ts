import {sharedDiagramCapture,type SharedImageCapture} from './sharedDiagramMapping';
export function eyePinDiagramLength(input:Parameters<typeof pinDiagramDimensions>[0],recipe:{productIds:string[];sha256:string;lengthsMm:number[]}){
 if(!recipe.productIds.includes(input.productId))return;
 const match=/^(\d+(?:\.\d+)?)\s*[×xｘ]\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(input.sizeText.normalize('NFKC'));
 if(!match)return;
 const lengthMm=Number(match[2]);if(!recipe.lengthsMm.includes(lengthMm))return;
 const capture=sharedDiagramCapture({...input,reviewedHash:recipe.sha256,reviewedSize:`${Number(match[1])}x${lengthMm}`});
 return capture?{capture,lengthMm}:undefined;
}
export function pinDiagramDimensions(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;lengthsMm:number[];heads:Record<string,number>}){
 if(!recipe.productIds.includes(input.productId))return;
 const match=/^(\d+(?:\.\d+)?)\s*[×xｘ]\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(input.sizeText.normalize('NFKC'));
 if(!match)return;
 const wireDiameterMm=Number(match[1]),lengthMm=Number(match[2]),headDiameterMm=recipe.heads[String(wireDiameterMm)];
 if(headDiameterMm===undefined||!recipe.lengthsMm.includes(lengthMm))return;
 const capture=sharedDiagramCapture({...input,reviewedHash:recipe.sha256,reviewedSize:`${wireDiameterMm}x${lengthMm}`});
 if(!capture)return;
 return {capture,wireDiameterMm,lengthMm,headDiameter:{valueMm:headDiameterMm,approximate:true}};
}
