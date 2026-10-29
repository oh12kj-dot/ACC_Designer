import type {SharedImageCapture} from './sharedDiagramMapping';
export function cupChainDiagram(input:{productId:string;variantId:string;sku?:string;sizeText:string;variant:{id:string;sku?:string;sizeText:string};galleryUrls:string[];captures:SharedImageCapture[]},recipe:{productIds:string[];sha256:string;widthsMm:Record<string,number>}){
 const parse=(s:string)=>/^(PP11|#\d+)\(約(\d+(?:\.\d+)?)mm\)$/i.exec(s.normalize('NFKC').replace(/\s/g,''));const m=parse(input.sizeText),v=parse(input.variant.sizeText);
 if(!m||!v||input.variant.id!==input.variantId||input.variant.sku!==input.sku||!recipe.productIds.includes(input.productId)||m.slice(1).join(':')!==v.slice(1).join(':'))return;
 const dims=recipe.widthsMm[m[1]];if(dims===undefined||dims!==Number(m[2]))return;
 const capture=input.captures.find(c=>c.sha256===recipe.sha256&&c.productIds.includes(input.productId)&&input.galleryUrls.includes(c.url));return capture?{capture,chainSizeToken:m[1],approximateStoneWidthMm:dims}:undefined;
}
