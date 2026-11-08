import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {sha256} from './minimum-sale-units.mjs';
import {listingBusiness,listingStable,listingHttpCode,listingBodyReview} from '../src/domain/supplierListingReviewBinding.mjs';
const base='.local/setup/all-parts-review-20261106',root='.local/workspace/supplier-listing-review';
const bytes=await readFile('.local/parts/parts.json'),drafts=JSON.parse(bytes).parts;
const snapshot=JSON.parse(await readFile(base+'/current-snapshot.json'));
assert.equal(JSON.parse(await readFile('.local/workspace/identity.json')).id,snapshot.workspaceId);
const reportBytes=await readFile(base+'/current-supplier/review.json'),report=JSON.parse(reportBytes);
assert.equal(report.summary.unresolvedProductReads,0);
const semanticBytes=await readFile(base+'/current-supplier/body-semantic-review.json'),semantic=JSON.parse(semanticBytes);
const groupsBytes=await readFile(base+'/current-supplier/body-semantic-groups.json');
assert.equal(sha256(groupsBytes),semantic.summary.inputSha256);
const current=new Map(),old=new Map();
for(const f of(await readdir(base+'/current-supplier')).filter(f=>/^page-\d+\.json$/.test(f))){const rb=await readFile(base+'/current-supplier/'+f),receipt=JSON.parse(await readFile(base+'/current-supplier/'+f+'.receipt.json'));assert.equal(sha256(rb),receipt.sha256);for(const p of JSON.parse(rb).products)current.set(String(p.id),{product:p,receipt:{file:f,...receipt}});}
for(const f of(await readdir('.local/catalog/evidence')).filter(f=>/^page-\d+\.json$/.test(f)))for(const p of JSON.parse(await readFile('.local/catalog/evidence/'+f)).products)old.set(String(p.id),p);
const missing=new Map(report.missingReceipts.map(r=>[r.productId,r]));
const sourceEntries=drafts.map(d=>{
 const c=current.get(d.productId),v=c?.product.variants.find(v=>String(v.id)===d.variantId),codes=[];
 let receipt=c?.receipt??missing.get(d.productId);
 if(receipt&&!receipt.file)receipt={...receipt,file:report.receipts.find(r=>r.url===receipt.url&&r.sha256===receipt.sha256&&r.fetchedAt===receipt.fetchedAt)?.file};
 const http=listingHttpCode(receipt?.status??0,!!v);if(http)codes.push(http);
 if(c&&v){if(v.sku!==d.sku)codes.push('SKU_CHANGED');if(Number(v.price)!==d.price)codes.push('PRICE_CHANGED');if((v.option1??'')!==(d.sizeText??''))codes.push('SIZE_LABEL_CHANGED');if((v.option2??'')!==(d.purchase?.sourceText??''))codes.push('PURCHASE_LABEL_CHANGED');if(!old.has(d.productId)||(old.get(d.productId).body_html??'')!==(c.product.body_html??''))codes.push('PRODUCT_BODY_HTML_CHANGED');}
 return{sourceDraftId:d.id,productId:d.productId,variantId:d.variantId,sourceUrl:d.sourceUrl,sourceObjectSha256:sha256(JSON.stringify(d)),receiptFile:receipt?.file??null,receipt:receipt?{url:receipt.url,finalUrl:receipt.finalUrl,fetchedAt:receipt.fetchedAt,status:receipt.status,sha256:receipt.sha256}:null,codes:codes.sort(),bodySemanticReview:codes.includes('PRODUCT_BODY_HTML_CHANGED')?listingBodyReview(semantic,d.productId,sha256(semanticBytes),sha256(groupsBytes)):null,observed:v?{sku:v.sku,price:v.price,option1:v.option1,option2:v.option2,available:v.available??null}:null};
});
const sourceMap=new Map(sourceEntries.map(r=>[r.sourceDraftId,r]));
const byPart=new Map(report.rows.map(r=>[r.partId,r]));
const child=(table,id)=>snapshot.tables[table].filter(r=>r.part_id===id);
const purchases=new Map(snapshot.tables.part_purchase_specs.map(r=>[r.part_id,r]));
const paths=new Map(snapshot.tables.part_path_specs.map(r=>[r.part_id,r]));
const parts=snapshot.tables.parts.filter(p=>!p.is_archived).map(p=>{
 const entry=byPart.get(p.id),source=sourceMap.get(entry.sourceDraftId);assert.ok(source);
 const codes=[...source.codes,...entry.changes.filter(c=>c.startsWith('REFERENCE_IMAGE_'))].sort();
 const aggregate={part:p,purchase_spec:purchases.get(p.id)??null,path_spec:paths.get(p.id)??null,connection_points:child('part_connection_points',p.id),through_holes:child('part_through_holes',p.id)};
 return{partId:p.id,sourceDraftId:source.sourceDraftId,baselineBusinessSha256:sha256(listingStable(listingBusiness(aggregate))),baselineRowSha256:sha256(listingStable(p)),reportEntrySha256:sha256(listingStable(entry)),codes:[...new Set(codes)]};
});
assert.equal(parts.length,19611);
await mkdir(root+'/evidence',{recursive:true});
const files=[];
for(const filename of[...new Set(sourceEntries.map(s=>s.receiptFile).filter(Boolean))]){assert.match(filename,/^(page-\d+|product-\d+(?:\.retry-1)?)\.json$/);const b=await readFile(base+'/current-supplier/'+filename);const source=sourceEntries.find(s=>s.receiptFile===filename);assert.equal(sha256(b),source.receipt.sha256);await copyFile(base+'/current-supplier/'+filename,root+'/evidence/'+filename);files.push({path:'evidence/'+filename,sha256:sha256(b)});}
for(const[name,b]of[['review.json',reportBytes],['body-semantic-review.json',semanticBytes],['body-semantic-groups.json',groupsBytes]]){await writeFile(root+'/evidence/'+name,b);files.push({path:'evidence/'+name,sha256:sha256(b)});}
const payload={version:1,workspaceId:snapshot.workspaceId,registrySha256:sha256(bytes),baselinePartSetSha256:sha256(listingStable(parts.map(p=>[p.partId,p.baselineBusinessSha256]).sort())),reviewReportSha256:sha256(reportBytes),evidenceManifestSha256:sha256(listingStable(files)),files,parts,sources:sourceEntries,createdAt:new Date().toISOString(),producer:'supplier-listing-review-v1'};
const result=JSON.stringify(payload);await writeFile(root+'/manifest.json',result);await writeFile(root+'/manifest.sha256',sha256(result));
console.log(JSON.stringify({partEntries:parts.length,sourceEntries:sourceEntries.length,flaggedParts:parts.filter(p=>p.codes.length).length,evidenceFiles:files.length,manifestBytes:Buffer.byteLength(result),manifestSha256:sha256(result),domainWrites:0}));
