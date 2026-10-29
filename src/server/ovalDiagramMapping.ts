import type {SharedImageCapture} from './sharedDiagramMapping';
export function ovalSizeKey(text:string){const m=/^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(text.normalize('NFKC'));return m?m.slice(1).map(Number).join('x'):undefined;}
export function ovalDiagramCapture(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];regions:{sizeKey:string;sha256:string;wireDiameterMm:number;outerWidthMm:number;outerHeightMm:number;approximateInnerHeightMm:number}[]}){
 if(!recipe.productIds.includes(input.productId)||input.variant.id!==input.variantId||input.variant.sku!==input.sku)return;
 const key=ovalSizeKey(input.sizeText),region=recipe.regions.find(r=>r.sizeKey===key);if(!region||ovalSizeKey(input.variant.sizeText)!==key)return;
 const capture=input.captures.filter(c=>c.sha256===region.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url)).sort((a,b)=>a.url.localeCompare(b.url))[0];
 return capture?{region,capture}:undefined;
}
