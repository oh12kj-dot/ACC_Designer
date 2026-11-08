import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {registrationApi} from './lib/local-registration-api.mjs';
import {sha256} from './minimum-sale-units.mjs';
import {toolCategoryPayload,toolCategoryRecipe,assertToolTargetsUnreferenced} from './lib/tool-category-review.mjs';

const dir='.local/setup/supplier-dimensions-20261107/tool-category';await mkdir(dir,{recursive:true});
const api=await registrationApi(),before=await api.snapshot(),registryBytes=await readFile('.local/parts/parts.json'),drafts=new Map(JSON.parse(registryBytes).parts.map(d=>[d.id,d]));
const family=before.tables.parts.filter(p=>!p.is_archived&&drafts.has(p.metadata.sourceDraftId)&&new URL(drafts.get(p.metadata.sourceDraftId).sourceUrl).pathname.startsWith('/products/g-tools-adhesives-cases-'));
assert.equal(family.length,105);const candidates=family.filter(p=>p.category!=='other');assert.equal(candidates.length,9);assertToolTargetsUnreferenced(before.designs,candidates.map(p=>p.id));
const aggregates=await api.call({action:'read-parts',ids:candidates.map(p=>p.id)}),byId=new Map(aggregates.map(a=>[a.part.id,a])),rows=[],refs=[],at=new Date().toISOString();
for(const p of candidates){
 const d=drafts.get(p.metadata.sourceDraftId),a=byId.get(p.id);assert.equal(a.supplier_listing_review.binding,'verified');
 const url=new URL(d.sourceUrl);url.search='';url.pathname+='.js';const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);assert.equal(response.url,url.href);const bytes=Buffer.from(await response.arrayBuffer()),file='product-'+d.productId+'.json';await writeFile(dir+'/'+file,bytes,{flag:'wx'});
 const product=JSON.parse(bytes),$=load(product.description??product.body_html??''),visibleText=$.root().text().replace(/\s+/g,' ').trim(),ref={url:url.href,file,sha256:sha256(bytes),status:200,fetchedAt:new Date().toISOString()};
 const payload=toolCategoryPayload(d,a,{...product,visibleText},ref,at);refs.push(ref);rows.push({partId:p.id,draftId:d.id,operationKey:randomUUID(),beforeAggregate:a,payload});
}
const fixed=await Promise.all(['.local/parts/parts.json','.local/catalog/catalog.json','src/data/kiwa-minimum-sale-units.json','.local/calibration/provisional/promotions.json','.local/calibration/nominal/promotions.json'].map(async path=>({path,sha256:sha256(await readFile(path))})));
await copyFile('.local/setup/precision-review-20261103/ledger.json',dir+'/ledger.before.json');await copyFile('.local/workspace/supplier-listing-review/manifest.json',dir+'/listing-manifest.before.json');await writeFile(dir+'/before.json',JSON.stringify(before),{flag:'wx'});
await writeFile(dir+'/plan.json',JSON.stringify({at,profile:{id:'supplier-tool-category',recipe:toolCategoryRecipe},workspaceId:before.workspaceId,rows,fixed,manufacturerReferences:refs,listingManifestSha256:sha256(await readFile(dir+'/listing-manifest.before.json')),familyParts:family.map(p=>({id:p.id,category:p.category,sourceDraftId:p.metadata.sourceDraftId})),noArchiveOrSuccessorAllowed:true}),{flag:'wx'});
console.log(JSON.stringify({familyParts:family.length,plannedParts:rows.length,domainWrites:0}));
