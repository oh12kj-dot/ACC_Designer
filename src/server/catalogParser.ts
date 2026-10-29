import { load } from 'cheerio';
import type { CatalogProduct } from '../types/catalog';
import { validateRemoteUrl } from './publicResource';
const text=(v:unknown,limit=2000)=>typeof v==='string'?v.slice(0,limit):'';
const id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):typeof v==='string'&&/^\d{1,20}$/.test(v)?v:undefined;
function image(v:unknown){try{const url=validateRemoteUrl(text(v),'image');if(url.hostname!=='cdn.shopify.com'&&url.hostname!=='kiwaseisakujo.jp')return;return url.href;}catch{return;}}
export function parseCatalogPage(value:unknown,fetchedAt=new Date().toISOString()):CatalogProduct[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {products?:unknown}).products))throw new Error('商品一覧の形式が変わりました');
 const products=(value as {products:unknown[]}).products;if(products.length>250)throw new Error('商品一覧が上限を超えました');
 return products.map(raw=>{
  const p=raw as Record<string,unknown>;const productId=id(p.id),handle=text(p.handle,200);if(!productId||!handle||!/^[a-zA-Z0-9_-]+$/.test(handle)||!text(p.title))throw new Error('商品識別情報が不正です');
  if(!Array.isArray(p.variants)||!Array.isArray(p.images))throw new Error('商品バリエーションが不正です');
  return {id:productId,name:text(p.title),handle,sourceUrl:`https://kiwaseisakujo.jp/products/${handle}`,description:load(text(p.body_html,100000)).text().slice(0,12000),tags:Array.isArray(p.tags)?p.tags.map(v=>text(v,200)).filter(Boolean).slice(0,100):[],productType:text(p.product_type),imageUrls:[...new Set(p.images.map(v=>image((v as {src?:unknown})?.src)).filter((v):v is string=>!!v))].slice(0,30),fetchedAt,sourceUpdatedAt:text(p.updated_at)||undefined,variants:p.variants.map(v=>{const variant=v as Record<string,unknown>,variantId=id(variant.id);if(!variantId)throw new Error('バリエーションIDが不正です');const price=typeof variant.price==='string'&&/^\d+(?:\.\d+)?$/.test(variant.price)?Number(variant.price):undefined;return{id:variantId,title:text(variant.title),sku:text(variant.sku)||undefined,price:price!==undefined&&Number.isFinite(price)?price:undefined,available:variant.available===true,options:[variant.option1,variant.option2,variant.option3].map(v=>text(v)).filter(Boolean),imageUrl:image((variant.featured_image as {src?:unknown}|null)?.src)};})};
 });
}
/** Longest matching Allow/Disallow rule wins; specific agent groups override wildcard. */
export function robotsAllows(robots:string,path:string,agent='AccessoryDesigner'):boolean{
 const groups:{agents:string[];rules:{allow:boolean;pattern:string}[]}[]=[];let group:typeof groups[number]|undefined;let hadRule=false;
 for(const line of robots.split(/\r?\n/)){const m=line.split('#')[0].trim().match(/^([^:]+):\s*(.*)$/);if(!m)continue;const key=m[1].toLowerCase(),value=m[2].trim();if(key==='user-agent'){if(!group||hadRule){group={agents:[],rules:[]};groups.push(group);hadRule=false;}group.agents.push(value.toLowerCase());}else if(group&&(key==='allow'||key==='disallow')){hadRule=true;if(value)group.rules.push({allow:key==='allow',pattern:value});}}
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a)));const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));let best=-1,allowed=true;
 for(const rule of selected.flatMap(g=>g.rules)){const escaped=rule.pattern.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');if(new RegExp('^'+escaped).test(path)){const length=rule.pattern.replace(/[*$]/g,'').length;if(length>best||length===best&&rule.allow){best=length;allowed=rule.allow;}}}return allowed;
}
