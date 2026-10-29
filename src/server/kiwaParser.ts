import { load } from 'cheerio';
import type { ImportedPartCandidate } from '../domain/part/importCandidate';
import { validateRemoteUrl } from './publicResource';

export function parseKiwaHtml(html:string,sourceUrl:string,fetchedAt=new Date().toISOString()):ImportedPartCandidate {
  const $=load(html);const products:Record<string,unknown>[]=[];
  function visit(value:unknown){if(Array.isArray(value)){value.forEach(visit);return;}if(!value||typeof value!=='object')return;
    const record=value as Record<string,unknown>,type=record['@type'];if(type==='Product'||Array.isArray(type)&&type.includes('Product'))products.push(record);
    if(record['@graph'])visit(record['@graph']);
  }
  $('script[type="application/ld+json"]').each((_i,node)=>{try{visit(JSON.parse($(node).text()));}catch{}});
  const product=products[0]??{};
  const text=(value:unknown):string|undefined=>typeof value==='string'&&value.trim()?value.trim().slice(0,2000):undefined;
  const meta=(key:string)=>text($(`meta[property="${key}"],meta[name="${key}"]`).first().attr('content'));
  const offers=Array.isArray(product.offers)?product.offers[0]:product.offers;
  const offer=offers&&typeof offers==='object'?offers as Record<string,unknown>:{};
  const priceRaw=offer.price??offer.lowPrice??meta('product:price:amount');
  const price=typeof priceRaw==='number'?priceRaw:typeof priceRaw==='string'&&/^\d+(?:\.\d+)?$/.test(priceRaw.trim())?Number(priceRaw):undefined;
  const imageRaw=product.image??meta('og:image');const images=Array.isArray(imageRaw)?imageRaw:[imageRaw];const imageUrls:string[]=[];
  for(const image of images){const value=text(image&&typeof image==='object'?(image as Record<string,unknown>).url:image);if(!value)continue;try{imageUrls.push(validateRemoteUrl(new URL(value,sourceUrl).href,'image').href);}catch{}}
  const label=(names:string[])=>{
    let result:string|undefined;
    $('dt,th').each((_i,node)=>{if(result)return;const heading=$(node).text().trim().replace(/[:：\s]/g,'');if(names.includes(heading)){const sibling=$(node).next('dd,td').text();result=text(sibling);}});return result;
  };
  const name=text(product.name)??meta('og:title')??text($('h1').first().text());
  const sku=text(product.sku)??text(product.mpn)??label(['商品番号','品番','SKU']);
  const currency=text(offer.priceCurrency)??meta('product:price:currency');
  const packageText=label(['入数','内容量','販売単位']);const dimensionsText=label(['サイズ','寸法']);
  const candidate:ImportedPartCandidate={sourceUrl,fetchedAt,name,sku,unitPrice:price!==undefined&&Number.isFinite(price)&&price>=0?price:undefined,currency,packageText,dimensionsText,imageUrls:[...new Set(imageUrls)].slice(0,12),categoryHints:text(product.category)?[text(product.category)!]:[],rawFields:{product,priceRaw,packageText,dimensionsText},status:'partial',parserVersion:'kiwa-v1'};
  candidate.status=candidate.name&&candidate.sku&&candidate.unitPrice!==undefined&&candidate.currency==='JPY'&&candidate.imageUrls.length?'success':'partial';
  return candidate;
}
