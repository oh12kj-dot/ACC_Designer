import {loadMinimumSalePolicy} from './minimum-sale-unit-guard.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const base='.local/calibration/nominal/';
const digest=v=>createHash('sha256').update(v).digest('hex');
const bytes=await readFile('.local/parts/parts.json');
const drafts=JSON.parse(bytes).parts;
const exclusions=JSON.parse(await readFile(base+'placement-exclusions.json'));
const remaining=JSON.parse(await readFile(base+'remaining.json'));
if(exclusions.registrySha256!==digest(bytes)||remaining.summary.registrySha256!==digest(bytes))throw Error('STALE_REGISTRY');
const byId=new Map(drafts.map(d=>[d.id,d]));
const excluded=new Set();
for(const e of exclusions.rows){
  const d=byId.get(e.draftId);
  if(!d||excluded.has(e.draftId)||d.productId!==e.productId||d.variantId!==e.variantId||d.name!==e.name||d.sourceUrl!==e.sourceUrl||digest(d.description)!==e.descriptionSha256||!isDeepStrictEqual(d.tags,e.tags)||e.placementRequired!==false||e.officialMappingRequired!==true)throw Error('INVALID_EXCLUSION_IDENTITY');
  excluded.add(e.draftId);
}
const salePolicy=await loadMinimumSalePolicy(digest(bytes));
const rawPending=new Map(remaining.remaining.map(e=>[e.draftId,e]));
const obsolete=new Set(),packaging=new Set();
for(const g of salePolicy.manifest.groups)for(const m of g.members){if(m.excludedReason)obsolete.add(m.draftId);else if(g.status==='resolved'&&g.canonicalOfferDraftId!==m.draftId)packaging.add(m.draftId);}
for(const g of salePolicy.manifest.groups)for(const subgroup of g.resolvedSubgroups??[])for(const id of subgroup.members)if(id!==subgroup.canonicalOfferDraftId)packaging.add(id);
const desired=drafts.filter(d=>!excluded.has(d.id)&&!obsolete.has(d.id)&&!packaging.has(d.id));
const pending=[];let placementRegistered=0;
for(const d of desired){const g=salePolicy.byDraft.get(d.id);const subgroup=g.resolvedSubgroups?.find(s=>s.members.includes(d.id));const represented=subgroup?subgroup.members.some(id=>!rawPending.has(id)):g.status==='resolved'?g.members.some(m=>!m.excludedReason&&!rawPending.has(m.draftId)):!rawPending.has(d.id);if(represented)placementRegistered++;else{const row=rawPending.get(d.id);if(!row)throw Error('SALE_SCOPE_MISSING_SOURCE');pending.push(row);}}
const placementTarget=desired.length,allExcluded=new Set([...excluded,...obsolete,...packaging]);
if(placementRegistered+pending.length!==placementTarget||placementTarget+allExcluded.size!==27046)throw Error('PARTITION');
const summary={checkedAt:new Date().toISOString(),sqlCheckedAt:remaining.summary.checkedAt,registrySha256:digest(bytes),officialMappingTarget:27046,placementTarget,placementRegistered,placementRemaining:pending.length,placementExcluded:allExcluded.size,kitToolExcluded:excluded.size,obsoleteVariants:obsolete.size,nonMinimumSaleVariants:packaging.size,rawRegistered:remaining.summary.registered,rawRemaining:remaining.summary.remaining,exclusionManifestSha256:digest(await readFile(base+'placement-exclusions.json')),minimumSaleManifestSha256:salePolicy.sha256,scope:'All 27046 official sources preserved. Only minimum sale offers represent resolved physical groups; obsolete offers excluded. Source identity and saved designs unchanged.'};
const pendingIds=new Set(pending.map(e=>e.draftId));
const pendingById=new Map(pending.map(row=>[row.draftId,row]));
const groups=remaining.groups.map(g=>({...g,ids:g.ids.filter(id=>pendingIds.has(id))})).filter(g=>g.ids.length).map(g=>{
  const reasons={};
  for(const id of g.ids){const reason=pendingById.get(id).reason;reasons[reason]=(reasons[reason]??0)+1;}
  return {...g,variants:g.ids.length,products:new Set(g.ids.map(id=>byId.get(id).productId)).size,reasons};
});
if(groups.some(g=>Object.values(g.reasons).reduce((a,b)=>a+b,0)!==g.variants))throw Error('GROUP_REASON_PARTITION');
await writeFile(base+'placement-scope.json',JSON.stringify({summary,groups,remaining:pending,excluded:exclusions.rows},null,2));
await writeFile('.ai/evidence/placement-scope-summary.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
