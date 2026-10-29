import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const registryBytes=await readFile('.local/parts/parts.json');
const registry=JSON.parse(registryBytes);
const index=JSON.parse(await readFile('.local/calibration/mapping/index.json'));
if(createHash('sha256').update(registryBytes).digest('hex')!==index.summary.registrySha256)throw Error('REGISTRY_CHANGED');
const drafts=new Map(registry.parts.map(p=>[p.id,p]));
const cutExceptions=JSON.parse(await readFile('.ai/evidence/2058-cut-family-exceptions.json'));
const cutsById=new Map(cutExceptions.cases.map(c=>[c.id,c.explicitCutFamily]));
const groups=new Map(), byProduct=new Map();
for(const e of index.entries){
 const d=drafts.get(e.id);if(!d)throw Error('UNKNOWN_ID');
 const name=d.name.normalize('NFKC');
 const crystal=/貴和クリスタル\s*#(\d+)(?!\d)/.exec(name);
 const key=crystal?'crystal:'+crystal[1]:'catalog:'+d.category+':'+name.split(' / ')[0].split(/[　]/)[0];
 if(!groups.has(key))groups.set(key,{key,groupingBasis:'Review scheduling only; shape equivalence unverified',variants:0,placementReady:0,dimensionPartial:0,unreviewed:0,connectionPending:0,ids:[],pendingReasons:{},publishedCutPartitions:{},shapeWarnings:[]});
 const g=groups.get(key);g.variants++;g.ids.push(e.id);g.connectionPending+=!e.connectionReady;
 const cut=cutsById.get(e.id);if(cut)g.publishedCutPartitions[cut]=(g.publishedCutPartitions[cut]??0)+1;
 const warnings=(d.description??'').split(/[。\n]/).filter(t=>/カットが異な|個体差|穴の形状が異な|形.*大きさ.*異な/.test(t));
 for(const text of warnings)if(!g.shapeWarnings.includes(text))g.shapeWarnings.push(text);
 if(e.placementReady)g.placementReady++;else if(e.dimensionEvidence)g.dimensionPartial++;else g.unreviewed++;
 for(const reason of e.pendingReasons)g.pendingReasons[reason]=(g.pendingReasons[reason]??0)+1;
 if(!byProduct.has(e.productId))byProduct.set(e.productId,[]);byProduct.get(e.productId).push(e);
}
const candidates=JSON.parse(await readFile('.local/calibration/mapping/diagram-candidates-final.json'));
const decisions=new Map(JSON.parse(await readFile('src/data/kiwa-diagram-review-decisions.json')).map(d=>[d.sha256,d]));
const queue=candidates.candidates.map(c=>{
 const entries=c.products.flatMap(p=>byProduct.get(p.productId)??[]).filter(e=>!e.dimensionEvidence&&!e.placementReady);
 return {sha256:c.sha256,unreviewedVariants:entries.length,productIds:c.products.map(p=>p.productId),variantIds:entries.map(e=>e.id),urls:c.urls,reviewStatus:decisions.get(c.sha256)?.status??'unverified-ocr-candidate',...(decisions.has(c.sha256)?{reviewDecision:decisions.get(c.sha256)}:{})};
}).filter(c=>c.unreviewedVariants).sort((a,b)=>b.unreviewedVariants-a.unreviewedVariants||a.sha256.localeCompare(b.sha256));
const covered=new Set(queue.flatMap(c=>c.variantIds));
const summary={checkedAt:new Date().toISOString(),registrySha256:index.summary.registrySha256,total:index.entries.length,groups:groups.size,placementReady:index.summary.placementEligibleVariants,dimensionPartial:index.summary.sharedDimensionOnlyVariants,dimensionUnreviewed:index.summary.unverifiedDimensionImageVariants,unreviewedWithOcrDiagramCandidate:covered.size,unreviewedWithoutShortlist:index.summary.unverifiedDimensionImageVariants-covered.size,connectionReady:index.summary.connectionReady,diagramReviewBatches:queue.length,scope:'Every variant assigned to a review group. OCR candidate coverage is not proof of dimensions or official-data sufficiency. Completion ETA remains unknown until placement and connection recipes are verified.'};
if(drafts.size!==summary.total||[...groups.values()].reduce((n,g)=>n+g.variants,0)!==27046)throw Error('PARTITION');
await mkdir('.local/calibration/batches',{recursive:true});
await writeFile('.local/calibration/batches/plan.json',JSON.stringify({summary,groups:[...groups.values()].sort((a,b)=>b.unreviewed-a.unreviewed),queue:queue.filter(c=>c.reviewStatus==='unverified-ocr-candidate'),reviewedUnresolved:queue.filter(c=>c.reviewStatus==='reviewed-unresolved')}));
await writeFile('.ai/evidence/calibration-batch-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
