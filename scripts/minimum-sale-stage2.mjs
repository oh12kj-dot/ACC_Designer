import {stable,sha256,parseSaleAmount,compareAmount,aggregateHash} from './minimum-sale-units.mjs';
const same=(a,b)=>stable(a)===stable(b),without=(value,keys)=>Object.fromEntries(Object.entries(value).filter(([k])=>!keys.includes(k)));
export function assertStage2Registry(bytes,prior){if(sha256(bytes)!==prior.registrySha256)throw Error('STAGE2_REVIEW_REGISTRY_CHANGED');}
const strand=/^1本 約(38|76)cm\/(約?)([1-9][0-9]*)ヶ\((15|30)インチ\)$/;
const slash=/^([1-9][0-9]*(?:\.[0-9]+)?)g\/約([1-9][0-9]*)ヶ\(大袋\)$/;
const setIds=new Set(['8716611485988','8716611780900','8716610732324','8716611125540']);
const nominalKeys=new Set(['sku','recipe','photoUrl','sourceUrl','variantId','diagramUrl','diameterMm','sizeChoice','photoSha256','diagramSha256','sourceDraftId','registrySha256','connectionReady','diameterRangeMm','sourceFetchedAt','imageScaleVerified','publishedSizeLabel','variantAppearanceVerified','widthMm','heightMm','axisApproximate','diagramApproximate']);
const sourceKeys=['sku','sourceUrl','variantId','sourceDraftId'];
const partKeys=new Set('id user_id name sku source_name source_url category geometry_kind sub_category color material width_mm height_mm depth_mm weight_g hole_diameter_mm wire_diameter_mm pin_diameter_mm inner_diameter_mm outer_diameter_mm opening_width_mm thickness_mm image_asset_id mirror_policy tags notes is_archived supersedes_part_id source_checked_at import_source import_status metadata created_at updated_at'.split(' '));
function markerAmount(raw){const text=raw.normalize('NFKC').trim().replace(/\(大袋\)_移動(?= ?【取寄商品】|$)/,'(大袋)').replace(/ 【取寄商品】$/,'【取寄商品】');return parseSaleAmount(text);}
function finiteParse(raw,kind){
 if(kind==='pack-marker')return {...markerAmount(raw),raw,refinementRule:kind};
 if(kind==='slash-weight'){const m=slash.exec(raw.normalize('NFKC').trim());return m?{...parseSaleAmount(m[1]+'g(約'+m[2]+'ヶ)(大袋)'),raw,refinementRule:kind}:parseSaleAmount(raw);}
 if(kind==='pearl-strand'){const m=strand.exec(raw.normalize('NFKC').trim());if(!m||(m[1]==='38')!==(m[4]==='15'))return {ok:false,reason:'STRAND_PACK_CLASS_NOT_PROVEN'};return {ok:true,unit:'pearl-strand-pack-class',numerator:m[4]==='15'?'1':'2',denominator:'1',raw,refinementRule:kind,comparisonBasis:'finite-15-inch-before-30-inch-pack',nominalLengthCm:m[1],inchLabel:m[4],auxiliaryEstimatedCount:m[3],declaredApproximate:m[2]==='約',guaranteedCount:false};}
 if(kind==='functional-clasp-set'){const m=/^([1-9][0-9]*)セット(?:\(中袋\))?$/.exec(raw.normalize('NFKC').trim());return m?{ok:true,unit:'functional-clasp-set',numerator:m[1],denominator:'1',raw,refinementRule:kind}:{ok:false,reason:'CLASP_SET_PACK_NOT_PROVEN'};}
 return parseSaleAmount(raw);
}
export function sameProductDefinition(rows,drafts,live){
 if(rows.length<2)return false;let expected;
 for(const p of rows){const d=drafts.get(p.metadata?.sourceDraftId),n=p.metadata?.nominalPlacement;if(!d||p.name!==d.name||p.sku!==d.sku||p.source_url!==d.sourceUrl||!n||!['kiwa-crystal-range-nominal-v1','kiwa-frontal-axes-nominal-v1'].includes(n.recipe)||Object.keys(p).some(k=>!partKeys.has(k))||Object.keys(n).some(k=>!nominalKeys.has(k)))return false;
  if(!same(Object.keys(p.metadata).sort(),['nominalPlacement','publishedCurrency','publishedPrice','publishedPurchase','sourceDraftId'])||p.metadata.publishedPrice!==d.price||p.metadata.publishedCurrency!==d.currency||!same(p.metadata.publishedPurchase,d.purchase)||n.sourceDraftId!==d.id||n.variantId!==d.variantId||n.sku!==d.sku||n.sourceUrl!==d.sourceUrl||n.sourceFetchedAt!==d.sourceFetchedAt||!d.imageUrls.includes(n.photoUrl)||n.connectionReady!==false||n.imageScaleVerified!==false||n.variantAppearanceVerified!==false)return false;
  if(['part_path_specs','part_connection_points','part_through_holes'].some(t=>(live[t]??[]).some(r=>r.part_id===p.id)))return false;
  const purchase=(live.part_purchase_specs??[]).filter(r=>r.part_id===p.id),snapshots=(live.part_source_snapshots??[]).filter(r=>r.part_id===p.id);if(purchase.length!==1||snapshots.length!==1)return false;
  const s=purchase[0],snap=snapshots[0];if(s.unit_price!==d.price||s.currency!==d.currency||s.minimum_units!==1||s.sale_length_mm!==null||s.weight_basis!==null||s.weight_basis_length_mm!==null||!same(s.metadata,{})||d.purchase.unit!=='piece'||s.pack_quantity!==(d.purchase.quantity===1?null:d.purchase.quantity)||s.sale_mode!==(d.purchase.quantity===1?'piece':'pack'))return false;
  const allowedPurchase=['id','part_id','sale_mode','pack_quantity','sale_length_mm','minimum_units','unit_price','currency','weight_basis','weight_basis_length_mm','metadata'];if(Object.keys(s).some(k=>!allowedPurchase.includes(k)))return false;
  if(!same(Object.keys(snap).sort(),['error_code','fetched_at','id','parser_version','part_id','raw_fields','source_url','status'])||snap.source_url!==d.sourceUrl||snap.parser_version!=='kiwa-nominal-v1'||snap.status!=='partial'||snap.error_code!==null||Date.parse(snap.fetched_at)!==Date.parse(n.sourceFetchedAt)||!same(snap.raw_fields,{evidence:n,publishedPurchase:d.purchase,publishedSizeText:d.sizeText}))return false;
  const semantic={part:without(p,['id','name','sku','source_url','metadata','created_at','updated_at']),nominal:without(n,sourceKeys),purchase:without(s,['id','part_id','sale_mode','pack_quantity','unit_price']),snapshot:without(snap,['id','part_id','source_url','raw_fields']),publishedSizeText:d.sizeText};
  if(expected&&!same(expected,semantic))return false;expected=semantic;
 }
 return true;
}
export function stage2Refinement(prior,catalog,registry,live){
 const drafts=new Map(registry.parts.map(d=>[d.id,d])),products=new Map(catalog.products.map(p=>[p.id,p])),rules=new Map(),report={rules:[],subgroups:[],held:[]};
 const active=live.parts.filter(p=>!p.is_archived),activeBySource=new Map(active.map(p=>[p.metadata?.sourceDraftId,p]));
 const priorGroups=new Map(prior.groups.map(g=>[g.id,g]));
 for(const g of prior.groups){const members=g.members.filter(o=>!o.excludedReason),rows=members.map(o=>activeBySource.get(o.draftId)).filter(Boolean);if(g.status!=='hold'||rows.length<2)continue;
  const text=members.map(o=>o.purchase.sourceText),singleProduct=new Set(members.map(o=>o.productId)).size===1,p=products.get(members[0].productId);let kind;
  if(g.holdReason==='QUANTITY_TEXT_NOT_EXCLUSIVELY_RECOGNIZED_PACK'){
   if((singleProduct||g.family)&&text.some(t=>t.includes('_移動'))&&text.every(t=>markerAmount(t).ok))kind='pack-marker';
   else if(singleProduct&&p.tags.includes('チェコシードファルファーレ')&&text.some(t=>slash.test(t))&&text.every(t=>{const result=finiteParse(t,'slash-weight');return result.ok&&result.unit==='weight';}))kind='slash-weight';
   else if(singleProduct&&p.tags.includes('樹脂パール丸')&&/パール|塗装による穴の目詰まり|表面のマット加工/.test(p.description)&&text.every(t=>strand.test(t))&&new Set(text.map(t=>strand.exec(t)[4])).size===2&&rows.every(r=>r.metadata?.nominalPlacement?.recipe==='kiwa-round-pearl-nominal-v1'&&r.geometry_kind==='node'&&r.width_mm===r.height_mm&&r.width_mm===rows[0].width_mm))kind='pearl-strand';
   else if(singleProduct&&setIds.has(p.id)&&p.description.includes('マグネット')&&p.description.includes('留め金具')&&text.length===2&&text.includes('1セット')&&text.includes('10セット(中袋)'))kind='functional-clasp-set';
  }
  if(!kind){if(g.holdReason==='QUANTITY_TEXT_NOT_EXCLUSIVELY_RECOGNIZED_PACK')report.held.push({groupId:g.id,reason:'UNPROVEN_PACK_OR_REVISION',offers:text});continue;}
  const record={groupId:g.id,kind,sources:members.map(o=>o.draftId),offers:text,products:[...new Set(members.map(o=>o.productId))].map(id=>({productId:id,descriptionSha256:sha256(products.get(id).description),tagsSha256:sha256(stable(products.get(id).tags))})),partAggregates:rows.map(p=>({partId:p.id,sha256:aggregateHash(live,p)}))};report.rules.push(record);for(const offer of members)rules.set(offer.draftId,record);
 }
 return {report,parseOffer(d,parsed){const rule=rules.get(d.id);if(!rule)return parsed;if(rule.offers[rule.sources.indexOf(d.id)]!==d.purchase.sourceText)return {ok:false,reason:'FINITE_SOURCE_TEXT_CHANGED'};return finiteParse(d.purchase.sourceText,rule.kind);},refineGroup(g,rows,{referenced,parents}){
  const original=priorGroups.get(g.id);if(!original?.holdReason?.startsWith('PHYSICAL_DEFINITION_CONFLICT:')||g.status!=='hold')return;
  const productIds=[...new Set(g.members.filter(o=>!o.excludedReason).map(o=>o.productId))];g.resolvedSubgroups=[];
  for(const productId of productIds){const members=g.members.filter(o=>!o.excludedReason&&o.productId===productId),partRows=rows.filter(p=>members.some(o=>o.draftId===p.metadata?.sourceDraftId));if(partRows.length<2)continue;
   const offers=members.map(o=>({...o,parse:markerAmount(o.purchase.sourceText)}));if(!offers.every(o=>o.parse.ok)||new Set(offers.map(o=>o.parse.unit)).size!==1||!sameProductDefinition(partRows,drafts,live)){report.held.push({groupId:g.id,productId,reason:'SUBGROUP_AGGREGATE_NOT_PROVEN'});continue;}
   offers.sort((a,b)=>compareAmount(a.parse,b.parse)||Number(b.available)-Number(a.available)||a.draftId.localeCompare(b.draftId));const canonicalOfferDraftId=offers[0].draftId;
   partRows.sort((a,b)=>Number(!!a.metadata?.nominalPlacement)-Number(!!b.metadata?.nominalPlacement)||Number(b.metadata?.sourceDraftId===canonicalOfferDraftId)-Number(a.metadata?.sourceDraftId===canonicalOfferDraftId)||(a.id<b.id?-1:1));
   const subgroup={id:g.id+':product:'+productId,productId,displayName:g.displayName,canonicalOfferDraftId,members:members.map(o=>o.draftId),retainedPartId:partRows[0].id,scope:'same-product-subgroup'};g.resolvedSubgroups.push(subgroup);report.subgroups.push(subgroup);
   for(const p of partRows.slice(1))g.cleanup.push({partId:p.id,sourceDraftId:p.metadata.sourceDraftId,rowSha256:sha256(stable(p)),aggregateSha256:aggregateHash(live,p),archiveContentSha256:sha256(stable({...p,is_archived:false,updated_at:null})),action:referenced.has(p.id)||parents.has(p.id)?'archive':'delete'});
  }
 }};
}
