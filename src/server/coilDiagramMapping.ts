import type {SharedImageCapture} from './sharedDiagramMapping';
export function coilDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;labels:string[]}){
 const key=(t:string)=>{const m=/^(\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)mm\(内径\)$/.exec(t.normalize('NFKC').replace(/\s/g,''));return m?m.slice(1).map(Number).join('x'):undefined;};const label=key(input.sizeText);
 if(!recipe.productIds.includes(input.productId)||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!label||key(input.variant.sizeText)!==label||!recipe.labels.includes(label))return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,label,publishedInnerDiameterMm:Number(label.split('x')[1])}:undefined;
}
