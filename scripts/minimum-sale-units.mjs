import {createHash} from 'node:crypto';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const stable=value=>JSON.stringify(sort(value));
function sort(value){return Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sort(value[k])])):value;}
export function obsoleteSaleReason(product,variant){const text=[product.name,...variant.options].join(' / ').normalize('NFKC');return /終息|旧品|切[替換](?:え)?待ち|切り[替換]え待ち/.test(text)?'OBSOLETE_OR_TRANSITION_OFFER':null;}
export function parseSaleAmount(raw,{relocated=false}={}){
 let text=raw.normalize('NFKC').trim();
 if(relocated)text=text.replace(/\(大袋\)_移動(?=【取寄商品】|$)/,'(大袋)');
 const m=/^([0-9]+(?:\.[0-9]+)?)\s*(ヶ|ケ|個|粒|本|ペア|kg|g)((?:\((?:小袋|中袋|大袋)\)|【取寄商品】|\(約[0-9,]+(?:ヶ|ケ|個|粒|本)\))*)$/.exec(text);
 if(!m)return {ok:false,reason:'QUANTITY_TEXT_NOT_EXCLUSIVELY_RECOGNIZED_PACK'};
 const unit=['ヶ','ケ','個','粒'].includes(m[2])?'piece':m[2]==='本'?'stick':m[2]==='ペア'?'pair':'weight';
 if(unit!=='weight'&&(m[1].includes('.')||m[3].includes('約')))return {ok:false,reason:'NONEXACT_COUNT'};
 const decimals=m[1].split('.')[1]?.length??0;
 const numerator=BigInt(m[1].replace('.',''))*(m[2]==='kg'?1000n:1n),denominator=10n**BigInt(decimals);
 if(numerator<=0n)return {ok:false,reason:'NONPOSITIVE_QUANTITY'};
 return {ok:true,unit,numerator:String(numerator),denominator:String(denominator),raw,auxiliaryEstimatedCount:/\(約([0-9,]+)(?:ヶ|ケ|個|粒|本)\)/.exec(m[3])?.[1]};
}
export function compareAmount(a,b){if(a.unit!==b.unit)throw Error('INCOMPARABLE_UNITS');const d=BigInt(a.numerator)*BigInt(b.denominator)-BigInt(b.numerator)*BigInt(a.denominator);return d<0n?-1:d>0n?1:0;}
const normalizeName=s=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
const article=url=>{try{return /^(\d{8})(?:_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.(?:jpg|jpeg|png|webp)$/i.exec(new URL(url).pathname.split('/').at(-1))?.[1];}catch{return undefined;}};
export function crystalFamilyPairs(products){
 const names=new Map();for(const p of products){const name=normalizeName(p.name);names.set(name,[...(names.get(name)??[]),p]);}
 const pairs=[];
 for(const bulk of products){const title=normalizeName(bulk.name);if(!/^\[大袋\]\s*貴和クリスタル\s/.test(title))continue;
  const matches=names.get(title.replace(/^\[大袋\]\s*/,''));if(matches?.length!==1)continue;const normal=matches[0];
  const code=article(normal.imageUrls[0]);
  if(bulk.handle!==normal.handle+'-grs'||bulk.description!==normal.description||!code||article(bulk.imageUrls[0])!==code)continue;
  pairs.push({normalId:normal.id,bulkId:bulk.id,name:normal.name,normalHandle:normal.handle,bulkHandle:bulk.handle,articleCode:code,descriptionSha256:sha256(normal.description),firstPhotoUrls:[normal.imageUrls[0],bulk.imageUrls[0]]});
 }
 return pairs;
}
export const aggregateTables=['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots'];
export function aggregateHash(live,part){return sha256(stable({part,children:Object.fromEntries(aggregateTables.map(table=>[table,(live[table]??[]).filter(r=>r.part_id===part.id).sort((a,b)=>stable(a).localeCompare(stable(b)))]))}));}
const physical=['geometry_kind','category','width_mm','height_mm','depth_mm','weight_g','hole_diameter_mm','wire_diameter_mm','pin_diameter_mm','inner_diameter_mm','outer_diameter_mm','opening_width_mm','thickness_mm','color','material'];
export function buildMinimumSaleManifest(catalog,registry,live,{catalogSha256,registrySha256,snapshotSha256,refinement}){
 const drafts=new Map(registry.parts.map(d=>[d.id,d]));if(drafts.size!==registry.parts.length)throw Error('DUPLICATE_SOURCE');
 const pairs=crystalFamilyPairs(catalog.products),families=new Map();for(const p of pairs){families.set(p.normalId,p);families.set(p.bulkId,p);}
 const normalNames=new Set(catalog.products.map(p=>normalizeName(p.name)));const unprovenBulk=new Set(catalog.products.filter(p=>/^\[大袋\]\s*貴和クリスタル\s/.test(normalizeName(p.name))&&!families.has(p.id)&&normalNames.has(normalizeName(p.name).replace(/^\[大袋\]\s*/,''))).map(p=>p.id));
 const groups=new Map(),seen=new Set();
 for(const product of catalog.products)for(const variant of product.variants){
  const id=`kiwa:${product.id}:${variant.id}`,d=drafts.get(id);if(!d||seen.has(id)||d.productId!==product.id||d.variantId!==variant.id||d.sku!==variant.sku)throw Error('SOURCE_IDENTITY_MISMATCH');seen.add(id);
  const indices=variant.options.flatMap((o,i)=>o===d.purchase.sourceText?[i]:[]),index=indices.length===1?indices[0]:-1;
  const family=families.get(product.id),others=variant.options.map((o,i)=>i===index?null:o);
  const identity=index<0?['unresolved',id]:[family?.normalId??product.id,index,others];
  const key=stable(identity);let group=groups.get(key);
  if(!group){const name=family?.name??product.name;group={id:'msu:'+sha256(key),identity,displayName:[name,...others.filter(o=>o!==null&&o!=='-'&&o!=='Default Title')].join(' / '),members:[],family:family??null};groups.set(key,group);}
  const parsed=index<0?{ok:false,reason:'PURCHASE_OPTION_NOT_UNIQUE'}:parseSaleAmount(d.purchase.sourceText,{relocated:!!family});
  group.members.push({draftId:id,productId:product.id,variantId:variant.id,sku:d.sku,sourceUrl:d.sourceUrl,options:variant.options,excludedReason:obsoleteSaleReason(product,variant),purchase:d.purchase,price:d.price??null,currency:d.currency??null,available:d.available===true,sourceFetchedAt:d.sourceFetchedAt,parse:refinement?.parseOffer(d,parsed)??parsed});
 }
 if(seen.size!==drafts.size)throw Error('INCOMPLETE_SOURCE_PARTITION');
 const liveBySource=new Map();for(const p of live.parts??[]){if(p.is_archived)continue;const id=p.metadata?.sourceDraftId;if(!id)continue;liveBySource.set(id,[...(liveBySource.get(id)??[]),p]);}
 const referenced=new Set([...(live.designAggregates??[]).flatMap(a=>[...a.nodes,...a.paths].map(n=>n.part_id)),...(live.part_user_state??[]).map(p=>p.part_id)]),parents=new Set((live.parts??[]).map(p=>p.supersedes_part_id).filter(Boolean));
 for(const group of groups.values()){
  const rows=group.members.filter(r=>!r.excludedReason),units=new Set(rows.map(r=>r.parse.unit));
  group.status=rows.length===0?'excluded':rows.length===1?'singleton':rows.every(r=>r.parse.ok)&&units.size===1?'resolved':'hold';
  if(rows.length&&rows.some(r=>unprovenBulk.has(r.productId))){group.status='hold';group.holdReason='CROSS_PRODUCT_IDENTITY_REVIEW_REQUIRED';}
  if(group.status==='hold'&&!group.holdReason)group.holdReason=rows.find(r=>!r.parse.ok)?.parse.reason??'INCOMPARABLE_SALE_UNITS';
  const active=rows.flatMap(r=>liveBySource.get(r.draftId)??[]);
  const obsolete=group.members.filter(r=>r.excludedReason).flatMap(r=>liveBySource.get(r.draftId)??[]);
  if(group.status==='resolved')for(const field of physical){const values=new Set(active.map(p=>p[field]).filter(v=>v!==null&&v!==undefined).map(stable));if(values.size>1){group.status='hold';group.holdReason='PHYSICAL_DEFINITION_CONFLICT:'+field;break;}}
  if(group.status==='resolved'){
   const ordered=[...rows].sort((a,b)=>compareAmount(a.parse,b.parse)||Number(b.available)-Number(a.available)||(a.draftId<b.draftId?-1:1));
   group.canonicalOfferDraftId=ordered[0].draftId;
   const ranked=[...active].sort((a,b)=>Number(!!a.metadata?.nominalPlacement)-Number(!!b.metadata?.nominalPlacement)||Number(b.metadata?.sourceDraftId===group.canonicalOfferDraftId)-Number(a.metadata?.sourceDraftId===group.canonicalOfferDraftId)||(a.id<b.id?-1:1));
   const retained=ranked[0];group.retainedPartId=retained?.id??null;group.retainedSourceDraftId=retained?.metadata?.sourceDraftId??null;
   group.retainedPartSha256=retained?sha256(stable(retained)):null;
   group.cleanup=ranked.slice(1).map(p=>({partId:p.id,sourceDraftId:p.metadata.sourceDraftId,rowSha256:sha256(stable(p)),aggregateSha256:aggregateHash(live,p),archiveContentSha256:sha256(stable({...p,is_archived:false,updated_at:null})),action:referenced.has(p.id)||parents.has(p.id)?'archive':'delete'}));
  }else{group.canonicalOfferDraftId=rows.length===1?rows[0].draftId:null;group.cleanup=[];}
  group.cleanup.push(...obsolete.map(p=>({partId:p.id,sourceDraftId:p.metadata.sourceDraftId,rowSha256:sha256(stable(p)),aggregateSha256:aggregateHash(live,p),archiveContentSha256:sha256(stable({...p,is_archived:false,updated_at:null})),action:referenced.has(p.id)||parents.has(p.id)?'archive':'delete'})));
  refinement?.refineGroup(group,active,{live,referenced,parents});
  const removed=new Set(group.cleanup.map(p=>p.partId));group.preservedParts=active.filter(p=>!removed.has(p.id)).map(p=>({partId:p.id,rowSha256:sha256(stable(p)),aggregateSha256:aggregateHash(live,p)}));
 }
 const values=[...groups.values()];const summary={sources:seen.size,physicalGroups:values.length,resolvedGroups:values.filter(g=>g.status==='resolved').length,holdGroups:values.filter(g=>g.status==='hold').length,bulkProductPairs:pairs.length,obsoleteVariants:values.flatMap(g=>g.members).filter(m=>m.excludedReason).length,resolvedSubgroups:values.reduce((n,g)=>n+(g.resolvedSubgroups?.length??0),0),noncanonicalVariants:values.filter(g=>g.status==='resolved').reduce((n,g)=>n+g.members.filter(m=>!m.excludedReason).length-1,0)+values.flatMap(g=>g.resolvedSubgroups??[]).reduce((n,s)=>n+s.members.length-1,0),deletePlanned:values.flatMap(g=>g.cleanup).filter(p=>p.action==='delete').length,archivePlanned:values.flatMap(g=>g.cleanup).filter(p=>p.action==='archive').length};
 return {version:1,parserVersion:'minimum-sale-unit-v1',createdAt:new Date().toISOString(),registrySha256,catalogSha256,snapshotSha256,workspaceId:live.owner,summary,groups:values};
}
