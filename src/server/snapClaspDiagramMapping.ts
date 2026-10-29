import type {SharedImageCapture} from './sharedDiagramMapping';
export function snapClaspDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;sizes:Record<string,{bodyWidthMm:number;totalWidthMm:number}>}){
 const parse=(s:string)=>/^([小大]\(\d+[×x]\d+mm\))$/.exec(s.normalize('NFKC').replace(/\s/g,'').replace('x','×'));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m[1]!==v[1]||recipe.sizes[m[1]]===undefined)return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,sizeLabel:m[1],...recipe.sizes[m[1]]}:undefined;
}
