import type {SharedImageCapture} from './sharedDiagramMapping';
export function crystalAxes(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;sizes:Record<string,{outerWidthMm:number;outerHeightMm:number}>}){
 const key=(text:string)=>{const m=/^(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm$/i.exec(text.normalize('NFKC'));if(m)return m.slice(1).map(Number).join('x');const single=/^(\d+(?:\.\d+)?)\s*mm$/i.exec(text.normalize('NFKC'));return single?String(Number(single[1])):undefined;};
 const label=key(input.sizeText);if(!recipe.productIds.includes(input.productId)||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!label||key(input.variant.sizeText)!==label)return;
 const dimensions=recipe.sizes[label];if(!dimensions)return;
 const capture=input.captures.filter(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url)).sort((a,b)=>a.url.localeCompare(b.url))[0];return capture?{capture,label,...dimensions}:undefined;
}
