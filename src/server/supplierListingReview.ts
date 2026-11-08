import{readReviewFile,reviewEvidencePath,reviewLimits}from'./supplierReviewFiles';
import{readFile,lstat}from'node:fs/promises';
import{join}from'node:path';
import{createHash}from'node:crypto';
import{listingBusiness,listingStable,listingHttpCode,listingBodyReview}from'../domain/supplierListingReviewBinding.mjs';
import type{SupplierListingAssessment}from'../domain/supplierListingReview';
type Row=Record<string,any>;
const hash=(x:string|Uint8Array)=>createHash('sha256').update(x).digest('hex');
export type ListingIndex={valid:boolean;parts:Map<string,Row>;sources:Map<string,Row>};
const unavailable=(source:string,partId?:string,status:'unavailable'|'stale'='unavailable'):SupplierListingAssessment=>({version:1,recipe:'supplier-listing-drift-v1',status,binding:status,partId,sourceDraftId:source,codes:['CURRENT_FETCH_UNRESOLVED']});
export async function loadSupplierListingReview(owner:string,workspaceRoot:string,registryPath=join(process.cwd(),'.local/parts/parts.json'),bundle?:Map<string,Buffer>):Promise<ListingIndex>{
 try{
  const root=join(workspaceRoot,'supplier-listing-review');if(!bundle&&(await lstat(root)).isSymbolicLink())throw Error('REVIEW_LINK');let readBytes=0;const read=async(path:string)=>{const bytes=bundle?bundle.get(path):await readReviewFile(root,path,reviewLimits.maxTotalBytes-readBytes);if(!bytes)throw Error('REVIEW_MISSING_FILE');readBytes+=bytes.length;if(readBytes>reviewLimits.maxTotalBytes)throw Error('REVIEW_TOTAL_SIZE');return bytes;};
  const bytes=await read('manifest.json');if(hash(bytes)!==(await read('manifest.sha256')).toString().trim())throw Error('REVIEW_HASH');
  const m=JSON.parse(bytes.toString());if(m.version!==1||m.workspaceId!==owner||!Array.isArray(m.parts)||!Array.isArray(m.sources)||!Array.isArray(m.files))throw Error('REVIEW_SCOPE');if(m.files.length>reviewLimits.maxFiles-3)throw Error('REVIEW_FILE_COUNT');
  let sourceObjects:Row[];
  try{if(!bundle)await lstat(join(root,'portable-sources.json'));const binding=JSON.parse((await read('portable-sources.json')).toString());if(binding.version!==1||binding.manifestSha256!==hash(bytes)||!Array.isArray(binding.sources)||binding.sources.length!==m.sources.length)throw Error('REVIEW_PORTABLE_BINDING');sourceObjects=binding.sources;if(new Set(sourceObjects.map(d=>d.id)).size!==sourceObjects.length)throw Error('REVIEW_PORTABLE_DUPLICATE');}
  catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const registry=await readFile(registryPath);if(hash(registry)!==m.registrySha256)throw Error('REVIEW_REGISTRY');sourceObjects=JSON.parse(registry.toString()).parts;}

  if(hash(listingStable(m.files))!==m.evidenceManifestSha256||hash(listingStable(m.parts.map((p:Row)=>[p.partId,p.baselineBusinessSha256]).sort()))!==m.baselinePartSetSha256)throw Error('REVIEW_SET');
  const verified=new Map<string,Buffer>();for(const f of m.files){if(!reviewEvidencePath(f.path)||verified.has(f.path))throw Error('REVIEW_PATH');const b=await read(f.path);if(hash(b)!==f.sha256)throw Error('REVIEW_EVIDENCE');verified.set(f.path,b);}
  const report=verified.get('evidence/review.json');if(!report||hash(report)!==m.reviewReportSha256)throw Error('REVIEW_REPORT');
  const reportParts=new Map(JSON.parse(report.toString()).rows.map((r:Row)=>[r.partId,r]));
  const drafts=new Map(sourceObjects.map((d:Row)=>[d.id,d]));
  const semanticBytes=verified.get('evidence/body-semantic-review.json'),groupBytes=verified.get('evidence/body-semantic-groups.json');
  const semantic=semanticBytes?JSON.parse(semanticBytes.toString()):undefined;
  if(semantic&&(!groupBytes||semantic.summary.inputSha256!==hash(groupBytes)))throw Error('REVIEW_SEMANTIC_INPUT');
  if(semantic){const groups=JSON.parse(groupBytes!.toString());for(const r of semantic.rows){const g=groups[r.group];if(!g||listingStable(g.products)!==listingStable(r.productIds)||hash(g.old)!==r.oldVisibleTextSha256||hash(g.new)!==r.currentVisibleTextSha256)throw Error('REVIEW_SEMANTIC_GROUP');}}
  for(const s of m.sources)if(s.codes.includes('PRODUCT_BODY_HTML_CHANGED')){
   const expected=listingBodyReview(semantic,s.productId,semanticBytes?hash(semanticBytes):'',groupBytes?hash(groupBytes):'');
   if(listingStable(s.bodySemanticReview)!==listingStable(expected))throw Error('REVIEW_SEMANTIC_BINDING');
  }
  const parsedReceipts=new Map<string,Row>();const receiptHashes=new Map(m.files.map((f:Row)=>[f.path,f.sha256]));
  const sources=new Map<string,Row>();for(const s of m.sources){const d=drafts.get(s.sourceDraftId) as Row|undefined;if(sources.has(s.sourceDraftId)||!d||hash(JSON.stringify(d))!==s.sourceObjectSha256||d.sourceUrl!==s.sourceUrl||d.productId!==s.productId||d.variantId!==s.variantId)throw Error('REVIEW_SOURCE');if(s.receiptFile){const path='evidence/'+s.receiptFile,b=verified.get(path);if(!b||receiptHashes.get(path)!==s.receipt?.sha256)throw Error('REVIEW_RECEIPT');if(s.receipt.status===200){let json=parsedReceipts.get(path);if(!json){json=JSON.parse(b.toString()) as Row;parsedReceipts.set(path,json);}const p=json.product??json.products?.find((p:Row)=>String(p.id)===s.productId);if(!p||String(p.id)!==s.productId)throw Error('REVIEW_PRODUCT');const v=p.variants.find((v:Row)=>String(v.id)===s.variantId);if(!v&&!s.codes.includes('CURRENT_VARIANT_NOT_LISTED'))throw Error('REVIEW_VARIANT');if(v){for(const [code,changed] of [['SKU_CHANGED',v.sku!==d.sku],['PRICE_CHANGED',Number(v.price)!==d.price],['SIZE_LABEL_CHANGED',(v.option1??'')!==(d.sizeText??'')],['PURCHASE_LABEL_CHANGED',(v.option2??'')!==(d.purchase?.sourceText??'')]] as const)if(s.codes.includes(code)!==changed)throw Error('REVIEW_TERMS');}if(s.codes.some((c:string)=>['CURRENT_PRODUCT_ENDPOINT_404','CURRENT_FETCH_UNRESOLVED'].includes(c)))throw Error('REVIEW_HTTP');}else if(!s.codes.includes(listingHttpCode(s.receipt.status)))throw Error('REVIEW_HTTP');}else if(!s.codes.includes('CURRENT_FETCH_UNRESOLVED'))throw Error('REVIEW_MISSING_RECEIPT');sources.set(s.sourceDraftId,s);}
  const parts=new Map<string,Row>();for(const p of m.parts){const r=reportParts.get(p.partId) as Row|undefined,source=sources.get(p.sourceDraftId);if(parts.has(p.partId)||!r||hash(listingStable(r))!==p.reportEntrySha256||!source||r.sourceDraftId!==p.sourceDraftId)throw Error('REVIEW_ENTRY');const expected=[...new Set([...source.codes,...(r.changes??[]).filter((c:string)=>c.startsWith('REFERENCE_IMAGE_'))])].sort();if(listingStable(p.codes)!==listingStable(expected))throw Error('REVIEW_PART_CODES');parts.set(p.partId,p);}
  return{valid:true,parts,sources};
 }catch{return{valid:false,parts:new Map(),sources:new Map()};}
}
export function projectListingSource(index:ListingIndex,sourceId:string):SupplierListingAssessment{
 const s=index.sources.get(sourceId);if(!index.valid||!s)return unavailable(sourceId);
 return{version:1,recipe:'supplier-listing-drift-v1',status:s.codes.length?'needs-review':'compared-unchanged',binding:'verified',sourceDraftId:sourceId,sourceUrl:s.sourceUrl,checkedAt:s.receipt?.fetchedAt,codes:s.codes,bodyEffects:s.bodySemanticReview?.effects,observed:s.observed??undefined};
}
export function projectListingAggregate(data:Row,index:ListingIndex,offerDraftId?:string):SupplierListingAssessment|undefined{
 const p=data.part,source=p.metadata?.sourceDraftId;if(!source?.startsWith('kiwa:')&&p.import_source!=='kiwa_url')return;
 if(!index.valid)return unavailable(source??'',p.id);
 const entry=index.parts.get(p.id);if(!entry||entry.sourceDraftId!==source||hash(listingStable(listingBusiness(data)))!==entry.baselineBusinessSha256)return unavailable(source??'',p.id,'stale');
 const sourceAssessment=projectListingSource(index,source);
 const result={...sourceAssessment,partId:p.id,codes:[...new Set([...sourceAssessment.codes,...entry.codes])]};
 if(offerDraftId)result.offer=projectListingSource(index,offerDraftId);
 return result;
}
export async function projectListingRows(tx:{query:Function},rows:Row[],index:ListingIndex){
 if(!rows.length)return rows;
 const ids=rows.map(r=>r.id),full=(await tx.query('select row_to_json(p) as data from public.parts p where id=any($1::uuid[])',[ids])).rows.map((r:Row)=>r.data) as Row[];
 const tables=['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes'];
 const values:Row[][]=[];for(const table of tables)values.push((await tx.query('select row_to_json(t) as data from public.'+table+' t where part_id=any($1::uuid[])',[ids])).rows.map((r:Row)=>r.data));
 const grouped=values.map(rs=>{const map=new Map<string,Row[]>();for(const r of rs)map.set(r.part_id,[...(map.get(r.part_id)??[]),r]);return map;});
 const parts=new Map(full.map(p=>[p.id,p]));
 return rows.map(row=>({...row,supplier_listing_review:projectListingAggregate({part:parts.get(row.id),purchase_spec:grouped[0].get(row.id)?.[0]??null,path_spec:grouped[1].get(row.id)?.[0]??null,connection_points:grouped[2].get(row.id)??[],through_holes:grouped[3].get(row.id)??[]},index,row.selection_reference?.offerDraftId)}));
}
