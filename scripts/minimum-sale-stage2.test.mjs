import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
import{stage2Refinement,sameProductDefinition,assertStage2Registry}from'./minimum-sale-stage2.mjs';import{parseSaleAmount,compareAmount}from'./minimum-sale-units.mjs';
const [prior,catalog,registry,live]=await Promise.all(['.local/calibration/minimum-sale-unit/manifest.json','.local/catalog/catalog.json','.local/parts/parts.json','.local/calibration/minimum-sale-unit/after.json'].map(async f=>JSON.parse(await readFile(f))));
const awaitBytes=await readFile('.local/parts/parts.json');
const refinement=stage2Refinement(prior,catalog,registry,live),drafts=new Map(registry.parts.map(d=>[d.id,d]));
const parse=id=>{const d=drafts.get(id);return refinement.parseOffer(d,parseSaleAmount(d.purchase.sourceText));};
test('frozen Stage2 input rejects a registry-only price or source-evidence change',async()=>{
 assert.doesNotThrow(()=>assertStage2Registry(awaitBytes,prior));
 for(const change of [{price:999999},{sourceFetchedAt:'2099-01-01T00:00:00Z'}]){const altered={...registry,parts:[...registry.parts]};const i=altered.parts.findIndex(d=>d.id==='kiwa:8710330450212:46967864262948');altered.parts[i]={...altered.parts[i],...change};assert.throws(()=>assertStage2Registry(JSON.stringify(altered),prior),/STAGE2_REVIEW_REGISTRY_CHANGED/);}
});
test('finite reviewed grammar resolves only 285 marker, 6 weight,159 pearl and4 functional set groups',()=>{
 const count={};for(const r of refinement.report.rules)count[r.kind]=(count[r.kind]??0)+1;assert.deepEqual(count,{'pearl-strand':159,'pack-marker':285,'slash-weight':6,'functional-clasp-set':4});
 for(const r of refinement.report.rules){const parsed=r.sources.map(parse);assert.ok(parsed.every(p=>p.ok));assert.equal(new Set(parsed.map(p=>p.unit)).size,1);}
 for(const r of refinement.report.held.filter(r=>r.offers)){const g=prior.groups.find(g=>g.id===r.groupId);assert.ok(g.members.some(o=>!parse(o.draftId).ok));}
});
test('strand class preserves approximate count/length and never compares by 1本 or exact auxiliary count',()=>{
 for(const r of refinement.report.rules.filter(r=>r.kind==='pearl-strand')){const parsed=r.sources.map(parse).sort(compareAmount);assert.equal(parsed[0].inchLabel,'15');assert.equal(parsed[1].inchLabel,'30');assert.equal(compareAmount(parsed[0],parsed[1]),-1);assert.equal(parsed[0].guaranteedCount,false);assert.equal(parsed[0].comparisonBasis,'finite-15-inch-before-30-inch-pack');}
});
test('unreviewed source, changed text, approximate weight, chain and unknown suffix do not gain a new interpretation',()=>{
 const r=refinement.report.rules.find(r=>r.kind==='pearl-strand'),d=drafts.get(r.sources[0]);
 assert.equal(refinement.parseOffer({...d,id:'kiwa:unreviewed:1'},parseSaleAmount(d.purchase.sourceText)).ok,false);
 for(const text of ['1本 約40cm/約100ヶ(16インチ)','1本 約38cm/約187ヶ(15インチ) 新仕様','約5g','100g/約3300ヶ(大袋)  別構成'])assert.equal(refinement.parseOffer({...d,purchase:{sourceText:text}},parseSaleAmount(text)).ok,false);
});
test('same-product subgroup compares every physical field, shared asset, complete child meanings and uncertainty flags',()=>{
 const g=prior.groups.find(g=>g.holdReason==='PHYSICAL_DEFINITION_CONFLICT:width_mm'),members=g.members.filter(o=>o.productId===g.members[0].productId),rows=live.parts.filter(p=>!p.is_archived&&members.some(o=>o.draftId===p.metadata?.sourceDraftId));
 assert.equal(sameProductDefinition(rows,drafts,live),true);
 for(const change of [p=>p.width_mm+=.01,p=>p.depth_mm=0,p=>p.category='other',p=>p.image_asset_id='different',p=>p.metadata.nominalPlacement.imageScaleVerified=true,p=>p.unknown_new_column=true]){const altered=rows.map(p=>structuredClone(p));change(altered[0]);assert.equal(sameProductDefinition(altered,drafts,live),false);}
 const child={...live,part_through_holes:[{id:'new-hole',part_id:rows[0].id}]};assert.equal(sameProductDefinition(rows,drafts,child),false);
});
test('conflicting cross-product member is never folded into a compatible same-product subgroup',()=>{
 const g=prior.groups.find(g=>g.holdReason==='PHYSICAL_DEFINITION_CONFLICT:category'),rows=live.parts.filter(p=>!p.is_archived&&g.members.some(o=>o.draftId===p.metadata?.sourceDraftId));assert.equal(sameProductDefinition(rows,drafts,live),false);
 const next=structuredClone(g);next.cleanup=[];refinement.refineGroup(next,rows,{referenced:new Set(),parents:new Set()});assert.equal(next.status,'hold');assert.equal(next.resolvedSubgroups.length,1);assert.equal(next.cleanup.length,1);assert.ok(next.resolvedSubgroups[0].members.every(id=>drafts.get(id).productId===next.resolvedSubgroups[0].productId));assert.ok(rows.some(p=>!next.resolvedSubgroups[0].members.includes(p.metadata.sourceDraftId)&&!next.cleanup.some(c=>c.partId===p.id)));
});
