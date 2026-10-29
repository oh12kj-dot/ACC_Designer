import {reviewedHoleIndex} from './holeReferences';
import {readFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export interface SaleOffer {draftId:string;excludedReason?:string|null;sourceUrl:string;sku?:string;purchase:{sourceText:string;unit:string;quantity?:number;weightG?:number;estimatedCount?:number;approximate:boolean};price:number|null;currency:string|null;available:boolean;sourceFetchedAt:string;options:string[];productId:string;variantId:string;parse:{ok:boolean;unit?:string}}
export interface SaleGroup {id:string;status:'resolved'|'hold'|'singleton'|'excluded';displayName:string;canonicalOfferDraftId:string|null;holdReason?:string;members:SaleOffer[];retainedPartId?:string|null;retainedSourceDraftId?:string|null;retainedPartSha256?:string|null;resolvedSubgroups?:{id:string;displayName:string;members:string[];canonicalOfferDraftId:string;retainedPartId:string;scope:'same-product-subgroup'}[];preservedParts?:{partId:string;rowSha256:string;aggregateSha256?:string}[];cleanup:{partId:string;sourceDraftId:string;rowSha256:string;aggregateSha256?:string;archiveContentSha256:string;action:'delete'|'archive'}[]}
export interface SaleReference {displayName:string;offerDraftId:string;sourceUrl:string;purchaseText:string;price:number|null;currency:string|null;available:boolean;sourceFetchedAt:string;retainedSourceDraftId:string;status:'minimum-sale-unit-reference';scope?:'same-product-subgroup';approximateCount?:number}
type Row=Record<string,any>;
type Manifest={version:number;registrySha256:string;catalogSha256:string;workspaceId:string;summary:Record<string,number>;groups:SaleGroup[]};
let cached:Promise<Awaited<ReturnType<typeof load>>>|undefined;
async function load(){const bytes=await readFile(join(process.cwd(),'src/data/kiwa-minimum-sale-units.json'));const manifest=JSON.parse(bytes.toString()) as Manifest;if(![1,2].includes(manifest.version))throw Error('SALE_POLICY_VERSION');const registryBytes=await readFile(join(process.cwd(),'.local/parts/parts.json')),catalogBytes=await readFile(join(process.cwd(),'.local/catalog/catalog.json'));if(saleBytesHash(registryBytes)!==manifest.registrySha256||saleBytesHash(catalogBytes)!==manifest.catalogSha256)throw Error('SALE_POLICY_SOURCE_CHANGED');const drafts=JSON.parse(registryBytes.toString()).parts as Row[],expected=new Set<string>(drafts.map((p:Row)=>p.id));const groups=new Map<string,SaleGroup>(),byUrl=new Map<string,string>(),bySku=new Map<string,string[]>();for(const g of manifest.groups){for(const offer of g.members){if(!expected.delete(offer.draftId))throw Error('SALE_POLICY_UNKNOWN_OR_DUPLICATE_SOURCE');if(groups.has(offer.draftId))throw Error('SALE_POLICY_DUPLICATE_SOURCE');groups.set(offer.draftId,g);byUrl.set(offer.sourceUrl,offer.draftId);if(offer.sku)bySku.set(offer.sku,[...(bySku.get(offer.sku)??[]),offer.draftId]);}}if(expected.size||groups.size!==manifest.summary.sources)throw Error('SALE_POLICY_INCOMPLETE');const registryStat=await stat(join(process.cwd(),'.local/parts/parts.json')),catalogStat=await stat(join(process.cwd(),'.local/catalog/catalog.json'));return {manifest,drafts,groups,byUrl,bySku,holeReferences:reviewedHoleIndex(drafts,saleBytesHash(registryBytes)),sourceStamp:[registryStat.mtimeMs,registryStat.size,catalogStat.mtimeMs,catalogStat.size].join(':'),sha256:createHash('sha256').update(bytes).digest('hex')};}
const saleBytesHash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export function salePolicy(){return cached??=load().catch(error=>{cached=undefined;throw error;});}
// Only a completely fresh clone may work without the private source pair.
// A partial copy or any integrity/read error must retain the strict failure.
export async function availableSalePolicy(){
 const present=await Promise.all(['.local/parts/parts.json','.local/catalog/catalog.json'].map(async path=>{
  try{await stat(join(process.cwd(),path));return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}
 }));
 if(present.every(value=>!value))return null;
 return salePolicy();
}
export function assertManualPart(part:Row){
 if(part.import_source&&part.import_source!=='manual'||part.source_url||part.metadata?.sourceDraftId||part.source_checked_at)throw Error('CATALOG_SOURCES_REQUIRED');
}
export function stableSaleRow(value:any):string{return JSON.stringify(sort(value));}
function sort(value:any):any{return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])])):value;}
export function saleRowHash(row:unknown){return createHash('sha256').update(stableSaleRow(row)).digest('hex');}
export function saleOfferEligibility(source:string,policy:Awaited<ReturnType<typeof salePolicy>>){const g=policy.groups.get(source);if(!g)return {allowed:false,message:'登録対象の照合が必要です。'};if(g.members.find(m=>m.draftId===source)?.excludedReason)return {allowed:false,message:'終息・旧品・切替待ちの商品は登録しません。'};if(g.status==='hold')return {allowed:false,message:'同一性・販売単位の確認待ちのため登録できません。'};if(g.status==='resolved'&&g.canonicalOfferDraftId!==source)return {allowed:false,message:'入数違いのため登録しません。最小販売単位を選択してください。'};return {allowed:true};}
export function sourceFromPart(part:Row,policy:Awaited<ReturnType<typeof salePolicy>>):string|undefined{
 const declared=part.metadata?.sourceDraftId as string|undefined;
 const url=typeof part.source_url==='string'?policy.byUrl.get(part.source_url):undefined;
 if(declared&&url&&declared!==url)throw Error('SALE_SOURCE_IDENTITY_MISMATCH');
 const source=declared??url;
 if(source){const offer=policy.groups.get(source)?.members.find(o=>o.draftId===source);if(offer?.sku&&part.sku&&offer.sku!==part.sku)throw Error('SALE_SOURCE_SKU_MISMATCH');if(offer&&part.source_url){const expected=new URL(offer.sourceUrl),actual=new URL(part.source_url);if(expected.origin!==actual.origin||expected.pathname!==actual.pathname||actual.searchParams.has('variant')&&actual.searchParams.get('variant')!==offer.variantId)throw Error('SALE_SOURCE_URL_MISMATCH');}return source;}
 if(part.import_source==='kiwa_url'&&typeof part.sku==='string'){
  const ids=policy.bySku.get(part.sku);if(ids?.length===1)return ids[0];
 }
 return undefined;
}
export function projectSaleReference(part:Row,policy:Awaited<ReturnType<typeof salePolicy>>|null):SaleReference|undefined{
 if(!policy){assertManualPart(part);return undefined;}
 const source=sourceFromPart(part,policy);if(!source)return undefined;const group=policy.groups.get(source);if(!group)return undefined;const subgroup=group.resolvedSubgroups?.find(s=>s.members.includes(source));if(group.status!=='resolved'&&!subgroup)return undefined;const offer=group.members.find(o=>o.draftId===(subgroup?.canonicalOfferDraftId??group.canonicalOfferDraftId));if(!offer)throw Error('SALE_POLICY_CANONICAL_MISSING');
 return {displayName:subgroup?.displayName??group.displayName,scope:subgroup?.scope,offerDraftId:offer.draftId,sourceUrl:offer.sourceUrl,purchaseText:offer.purchase.sourceText,price:offer.price,currency:offer.currency,available:offer.available,sourceFetchedAt:offer.sourceFetchedAt,retainedSourceDraftId:source,status:'minimum-sale-unit-reference',approximateCount:offer.purchase.estimatedCount};
}
export async function assertSaleSave(tx:{query:Function;exec:Function},args:Row,providedPolicy?:Awaited<ReturnType<typeof salePolicy>>){
 const policy=providedPolicy??await availableSalePolicy();const payload=args.payload as Row;if(!payload?.part)return;
 await tx.exec('reset role');try{
 const old=args.part_id?(await tx.query('select to_jsonb(p) as data from public.parts p where id=$1 and user_id=auth.uid() for update',[args.part_id])).rows[0]?.data as Row|undefined:undefined;
   if(Object.hasOwn(payload,'expected_part_sha256')&&(!old||typeof payload.expected_part_sha256!=='string'||saleRowHash(old)!==payload.expected_part_sha256))throw Error('PART_EDIT_CONFLICT');
   const incoming=payload.part,effective={...old,...incoming};
 if(!policy){
  if(old)assertManualPart(old);assertManualPart(incoming);assertManualPart(effective);
  if(payload.source_snapshots?.length||old&&(await tx.query('select 1 from public.part_source_snapshots where part_id=$1 limit 1',[old.id])).rows.length)throw Error('CATALOG_SOURCES_REQUIRED');
  return;
 }
 const oldSource=old?sourceFromPart(old,policy):undefined;
 if(old&&oldSource&&policy.groups.has(oldSource)&&(Object.hasOwn(incoming,'metadata')&&incoming.metadata?.sourceDraftId!==old.metadata?.sourceDraftId||Object.hasOwn(incoming,'source_url')&&incoming.source_url!==old.source_url||Object.hasOwn(incoming,'sku')&&incoming.sku!==old.sku))throw Error('SALE_SOURCE_REMOVAL_OR_CHANGE_REJECTED');
 const source=sourceFromPart(effective,policy);
 const official=effective.import_source==='kiwa_url'||/^kiwa:\d+:\d+$/.test(effective.metadata?.sourceDraftId??'')||typeof effective.source_url==='string'&&/^https:\/\/(?:www\.)?kiwaseisakujo\.jp\//.test(effective.source_url);
 if(!source){if(official)throw Error('SALE_SOURCE_IDENTITY_REQUIRED');return;}
 const group=policy.groups.get(source);if(!group){if(official)throw Error('SALE_SOURCE_NOT_IN_FINITE_MANIFEST');return;}
 if(!providedPolicy){const r=await stat(join(process.cwd(),'.local/parts/parts.json')),c=await stat(join(process.cwd(),'.local/catalog/catalog.json'));if([r.mtimeMs,r.size,c.mtimeMs,c.size].join(':')!==policy.sourceStamp)throw Error('SALE_POLICY_SOURCE_CHANGED');}
 if(group.members.find(m=>m.draftId===source)?.excludedReason)throw Error('OBSOLETE_SALE_UNIT_REJECTED');
 
 const memberIds=group.members.map(o=>o.draftId),urls=group.members.map(o=>o.sourceUrl);
 const active=(await tx.query("select * from public.parts where user_id=auth.uid() and not is_archived and (metadata->>'sourceDraftId'=any($1::text[]) or source_url=any($2::text[])) for update",[memberIds,urls])).rows as Row[];
 if(old){if(group.status==='hold'){return;}if(active.some(p=>p.id!==old.id))throw Error('SALE_GROUP_ALREADY_REGISTERED');return;}
 if(group.status==='hold')throw Error('SALE_GROUP_IDENTITY_REVIEW_REQUIRED');
 if(source!==group.canonicalOfferDraftId)throw Error('MINIMUM_SALE_UNIT_ONLY');
 if(active.length)throw Error('SALE_GROUP_ALREADY_REGISTERED');
 }finally{await tx.exec('set local role authenticated');}
}
export async function cleanupSaleGroups(db:{transaction:Function},policy:Awaited<ReturnType<typeof salePolicy>>,owner:string){
 if(policy.manifest.workspaceId!==owner)throw Error('SALE_CLEANUP_WORKSPACE_MISMATCH');
 return db.transaction(async(tx:{query:Function;exec:Function})=>{
  const protectedState=async()=>{await tx.exec('reset role');const result:Record<string,unknown>={};for(const table of ['part_image_assets','part_user_state','asset_uploads','designs','design_nodes','design_paths','design_point_attachments','design_through_attachments','design_path_attachments','design_mirror_links'])result[table]=(await tx.query(`select count(*)::int as count,encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]'),'UTF8')),'hex') as sha256 from public.${table} t`)).rows[0];result.blobs=(await tx.query("select count(*)::int as count,encode(sha256(convert_to(coalesce(string_agg(path||':'||mime||':'||sha256||':'||octet_length(body)::text,E'\\n' order by path),''),'UTF8')),'hex') as sha256 from public.local_blobs")).rows[0];return result;};
  const before=await protectedState();
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);await tx.exec('set local role authenticated');
  const plans=policy.manifest.groups.filter(g=>g.cleanup.length),ids=plans.flatMap(g=>[g.retainedPartId!,...g.cleanup.map(c=>c.partId)]);
  await tx.exec('reset role');const current=(await tx.query('select to_jsonb(p) as data from public.parts p where user_id=auth.uid() for update')).rows.map((r:Row)=>r.data) as Row[],byId=new Map(current.map(p=>[p.id,p]));
  const activeByGroup=new Map<string,string[]>();for(const row of current){if(row.is_archived)continue;const source=sourceFromPart(row,policy),group=source?policy.groups.get(source):undefined;if(group)activeByGroup.set(group.id,[...(activeByGroup.get(group.id)??[]),row.id]);}
  const references=new Set<string>((await tx.query('select part_id from public.design_nodes union select part_id from public.design_paths union select part_id from public.part_user_state union select supersedes_part_id as part_id from public.parts where supersedes_part_id is not null')).rows.map((r:Row)=>r.part_id));
  const childTables=['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots'];const children:Record<string,Row[]>={};for(const table of childTables)children[table]=(await tx.query(`select to_jsonb(t) as data from public.${table} t`)).rows.map((r:Row)=>r.data);
  const aggregateHash=(part:Row)=>saleRowHash({part,children:Object.fromEntries(childTables.map(table=>[table,children[table].filter(r=>r.part_id===part.id).sort((a,b)=>stableSaleRow(a).localeCompare(stableSaleRow(b)))]))});
  const deleted:string[]=[],archived:string[]=[],unchanged:string[]=[];
  for(const group of plans){
   const expectedIds=new Set([...(group.preservedParts??[]).map(p=>p.partId),...group.cleanup.map(c=>c.partId)]);if((activeByGroup.get(group.id)??[]).some(id=>!expectedIds.has(id)))throw Error('SALE_CLEANUP_UNPLANNED_PART');
   for(const expected of group.preservedParts??[]){const row=byId.get(expected.partId);if(!row||row.is_archived||saleRowHash(row)!==expected.rowSha256||expected.aggregateSha256&&aggregateHash(row)!==expected.aggregateSha256)throw Error('SALE_SURVIVOR_CHANGED');}
   for(const item of group.cleanup){const row=byId.get(item.partId);if(!row){unchanged.push(item.partId);continue;}
    if(row.is_archived){if(saleRowHash({...row,is_archived:false,updated_at:null})!==item.archiveContentSha256)throw Error('SALE_ARCHIVED_IDENTITY_CHANGED');unchanged.push(item.partId);continue;}
    if(saleRowHash(row)!==item.rowSha256||item.aggregateSha256&&aggregateHash(row)!==item.aggregateSha256||row.user_id!==owner)throw Error('SALE_CLEANUP_PART_CHANGED');
    await tx.exec('set local role authenticated');if(references.has(item.partId)){await tx.query('select public.archive_part($1)',[item.partId]);archived.push(item.partId);}
    else{await tx.query('select public.remove_unreferenced_part($1)',[item.partId]);deleted.push(item.partId);}
    await tx.exec('reset role');
   }
  }
  const after=await protectedState();if(stableSaleRow(before)!==stableSaleRow(after))throw Error('SALE_CLEANUP_PROTECTED_STATE_CHANGED');
  return {manifestSha256:policy.sha256,deleted,archived,unchanged,changed:deleted.length+archived.length,protectedState:after};
 });
}
