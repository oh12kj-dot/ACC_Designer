import type {SharedImageCapture} from './sharedDiagramMapping';
export function claspDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;visuallyReviewedApproximateSizes:Record<string,number[]>}){
 const parse=(s:string)=>/^No\.(\d+)\(約(\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)mm\)$/i.exec(s.normalize('NFKC').replace(/\s/g,''));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m.slice(1).join(':')!==v.slice(1).join(':'))return;
 const dims=recipe.visuallyReviewedApproximateSizes[m[1]];if(!dims||dims[0]!==Number(m[2])||dims[1]!==Number(m[3]))return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,number:m[1],approximateHeightMm:dims[0],approximateWidthMm:dims[1]}:undefined;
}
