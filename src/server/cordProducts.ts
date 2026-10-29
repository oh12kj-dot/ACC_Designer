import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {salePolicy,availableSalePolicy,stableSaleRow} from './minimumSaleUnits';
import type {CordProduct,CordSpecification} from '../domain/editor/cord';
import {validCordLength} from '../domain/editor/cord';
import type {CordQuote} from '../domain/editor/cord';
import {validateStudio} from '../domain/editor/studio';
import {fromRow} from '../services/databaseMapping';
import type {DesignAggregate} from '../types/aggregate';
// Reviewed circular stringing families; neither flat cord widths nor hardware wire.
const families=new Set(['8714833494308','8714834903332','8714834608420','8714836017444','8714835394852','9559875748132','8714834280740','8714835755300','8714833920292','8714836279588','10791372554532']);
export function cordDiameter(size:string):number|null {
 const s=size.normalize('NFKC').trim();
 if(!/^(?:\d+号\()?\d+(?:\.\d+)?mm\)?(?:\/(?:\d+号強|H\d+))?$/.test(s))return null;
 const n=Number(s.match(/(\d+(?:\.\d+)?)mm/)?.[1]);return n>0&&n<=20?n:null;
}
export async function cordProducts():Promise<CordProduct[]>{const policy=await availableSalePolicy();if(!policy)return[];
 // Revalidate live bytes rather than accepting the process lifetime policy cache.
 const check=(bytes:Uint8Array,expected:string)=>{if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('紐の商品情報が更新されています。アプリを再起動して確認してください。');};
 check(await readFile(join(process.cwd(),'.local/parts/parts.json')),policy.manifest.registrySha256);
 check(await readFile(join(process.cwd(),'.local/catalog/catalog.json')),policy.manifest.catalogSha256);
 check(await readFile(join(process.cwd(),'src/data/kiwa-minimum-sale-units.json')),policy.sha256);
 return policy.drafts.flatMap(p=>{
 if(!families.has(p.productId))return[];const g=policy.groups.get(p.id),m=g?.members.find(m=>m.draftId===p.id),sub=g?.resolvedSubgroups?.find(s=>s.members.includes(p.id));
 if(!g||!m||m.excludedReason||g.status==='excluded'||(sub?sub.canonicalOfferDraftId!==p.id:g.status==='hold'||g.status==='resolved'&&g.canonicalOfferDraftId!==p.id))return[];
 const sourceSha256=createHash('sha256').update(stableSaleRow({p,policy:policy.sha256})).digest('hex');
 return[{sourceDraftId:p.id,title:p.name,sizeText:p.sizeText,sourceUrl:p.sourceUrl,sourceFetchedAt:p.sourceFetchedAt,sourceSha256,diameterMm:cordDiameter(p.sizeText),purchaseText:p.purchase.sourceText,available:p.available}];
 }).sort((a,b)=>a.title.split(' / ')[0].localeCompare(b.title.split(' / ')[0],'ja')||(a.diameterMm??Infinity)-(b.diameterMm??Infinity)||a.title.localeCompare(b.title,'ja'));}
export async function cordQuotes(products:CordProduct[]):Promise<CordQuote[]>{if(!products.length)return[];const policy=await salePolicy();return products.map(product=>{const p=policy.drafts.find(p=>p.id===product.sourceDraftId)!,t=String(p.purchase.sourceText).normalize('NFKC'),m=t.match(/^(?:1ヶ\()?([\d.]+)(mm|cm|m)\)?$/),n=m?Number(m[1])*({mm:1,cm:10,m:1000}[m[2]]!):NaN;return{sourceDraftId:p.id,sourceSha256:product.sourceSha256,saleLengthMm:!p.purchase.approximate&&Number.isFinite(n)&&n>0?n:null,price:typeof p.price==='number'&&Number.isFinite(p.price)&&p.price>=0?p.price:null,currency:p.currency??null};});}
export async function assertCordSave(tx:{query:Function;exec:Function},args:Record<string,any>){
 const next=args.payload?.design?.editor_config?.cordSpecification;
 const payload=args.payload,config=payload?.design?.editor_config;
 if(config?.cordLayoutV1||config?.visualAssembliesV1)validateStudio({design:{editorConfig:config},nodes:(payload.nodes??[]).map(fromRow),paths:[],pointAttachments:(payload.point_attachments??[]).map(fromRow),throughAttachments:(payload.through_attachments??[]).map(fromRow),pathAttachments:(payload.path_attachments??[]).map(fromRow),mirrorLinks:(payload.mirror_links??[]).map(fromRow)}as unknown as DesignAggregate);
 await tx.exec('reset role');let oldConfig;try{oldConfig=(await tx.query('select editor_config from public.designs where id=$1 and user_id=auth.uid() for update',[args.design_id])).rows[0]?.editor_config;}finally{await tx.exec('set local role authenticated');}
 const layoutChanged=!!config?.cordLayoutV1&&stableSaleRow(config.cordLayoutV1)!==stableSaleRow(oldConfig?.cordLayoutV1??null);
 if(!layoutChanged&&stableSaleRow(next??null)===stableSaleRow(oldConfig?.cordSpecification??null)||next==null)return;
 if(next.version!==1||!validCordLength(next.usedLengthMm))throw Error('紐の使用長さは0より大きいmmで指定してください（最大1000m）。');
 const product=(await cordProducts()).find(p=>p.sourceDraftId===next.sourceDraftId);
 const expected:CordSpecification|undefined=product?{...product,version:1,usedLengthMm:next.usedLengthMm}:undefined;
 if(!expected||stableSaleRow(next)!==stableSaleRow(expected))throw Error('紐の商品情報を確認できません。使用する紐を選び直してください。');
}
