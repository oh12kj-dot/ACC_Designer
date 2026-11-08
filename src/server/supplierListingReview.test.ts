const ioFailure=vi.hoisted(()=>({path:''}));
vi.mock('node:fs/promises',async(importOriginal)=>{const actual=await importOriginal<typeof import('node:fs/promises')>();return{...actual,writeFile:async(...args:Parameters<typeof actual.writeFile>)=>{if(ioFailure.path&&String(args[0]).includes(ioFailure.path))throw Error('INJECTED_REVIEW_WRITE_FAILURE');return actual.writeFile(...args);}};});
import{reviewLimits}from'./supplierReviewFiles';
import{captureReviewArchive,stageReviewArchive,decodeReviewChunk}from'./supplierReviewArchive';
import{describe,it,expect,beforeEach,afterEach,vi}from'vitest';
import{mkdtemp,mkdir,writeFile,readFile,rm,rename,symlink,unlink}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{createHash}from'node:crypto';
import{loadSupplierListingReview,projectListingAggregate,projectListingRows,projectListingSource}from'./supplierListingReview';
import{listingBusiness,listingStable,listingBodyReview}from'../domain/supplierListingReviewBinding.mjs';
import{listingAssessmentBlocked}from'../domain/supplierListingReview';
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
let root:string,registry:string,manifest:any,aggregate:any;
async function publish(){const b=JSON.stringify(manifest);await writeFile(join(root,'supplier-listing-review/manifest.json'),b);await writeFile(join(root,'supplier-listing-review/manifest.sha256'),hash(b));}
beforeEach(async()=>{
 root=await mkdtemp(join(tmpdir(),'acc-listing-'));registry=join(root,'registry.json');await mkdir(join(root,'supplier-listing-review/evidence'),{recursive:true});
 const draft={id:'kiwa:1:2',productId:'1',variantId:'2',sku:'old',price:100,sizeText:'3mm',purchase:{sourceText:'10ヶ'},sourceUrl:'https://kiwaseisakujo.jp/products/test?variant=2'},rb=JSON.stringify({parts:[draft]});await writeFile(registry,rb);
 aggregate={part:{id:'p',user_id:'u',sku:'old',width_mm:3,metadata:{sourceDraftId:draft.id},image_asset_id:'a'},purchase_spec:{id:'s',part_id:'p',pack_quantity:10,unit_price:100},path_spec:null,connection_points:[],through_holes:[]};
 const receiptBody=JSON.stringify({products:[{id:1,variants:[{id:2,sku:'old',price:'200',option1:'3mm',option2:'10ヶ'}]}]}),entry={partId:'p',sourceDraftId:draft.id};
 const report=JSON.stringify({rows:[entry]});for(const[name,b]of[['page-1.json',receiptBody],['review.json',report]])await writeFile(join(root,'supplier-listing-review/evidence',name),b);
 const files=[{path:'evidence/page-1.json',sha256:hash(receiptBody)},{path:'evidence/review.json',sha256:hash(report)}],part={partId:'p',sourceDraftId:draft.id,baselineBusinessSha256:hash(listingStable(listingBusiness(aggregate))),reportEntrySha256:hash(listingStable(entry)),codes:['PRICE_CHANGED']};
 manifest={version:1,workspaceId:'u',registrySha256:hash(rb),baselinePartSetSha256:hash(listingStable([['p',part.baselineBusinessSha256]])),reviewReportSha256:hash(report),evidenceManifestSha256:hash(listingStable(files)),files,parts:[part],sources:[{sourceDraftId:draft.id,productId:'1',variantId:'2',sourceUrl:draft.sourceUrl,sourceObjectSha256:hash(JSON.stringify(draft)),codes:['PRICE_CHANGED'],receiptFile:'page-1.json',receipt:{status:200,sha256:hash(receiptBody),fetchedAt:'2026-11-06'}}]};await publish();
});
afterEach(async()=>{await rm(root,{recursive:true,force:true});});
describe('read-only supplier listing projection',()=>{
 it('binds the original used Part without mutating it or alias source',async()=>{const before=JSON.stringify(aggregate),index=await loadSupplierListingReview('u',root,registry);expect(index.valid).toBe(true);const review=projectListingAggregate(aggregate,index,'kiwa:1:2');expect(review).toMatchObject({partId:'p',binding:'verified',codes:['PRICE_CHANGED']});expect(listingAssessmentBlocked(review)).toBe(true);expect(JSON.stringify(aggregate)).toBe(before);expect(projectListingSource(index,'different').binding).toBe('unavailable');});
 it('rejects definition/source copying, while authority-only changes preserve binding',async()=>{const index=await loadSupplierListingReview('u',root,registry),changed=structuredClone(aggregate);changed.part.width_mm=4;expect(projectListingAggregate(changed,index)?.binding).toBe('stale');changed.part.width_mm=3;changed.part.is_archived=true;changed.part.updated_at='tomorrow';expect(projectListingAggregate(changed,index)?.binding).toBe('verified');changed.part.id='different';expect(projectListingAggregate(changed,index)?.binding).toBe('stale');});
 it('rejects a checksummed per-Part assessment that clears verified source holds',async()=>{manifest.parts[0].codes=[];await publish();const index=await loadSupplierListingReview('u',root,registry);expect(index.valid).toBe(false);expect(listingAssessmentBlocked(projectListingAggregate(aggregate,index))).toBe(true);});
 it('rejects semantic effects without matching frozen judgments',async()=>{manifest.sources[0].codes=['PRICE_CHANGED','PRODUCT_BODY_HTML_CHANGED'];manifest.sources[0].bodySemanticReview={status:'reviewed',effects:['descriptive']};manifest.parts[0].codes=manifest.sources[0].codes;await publish();expect((await loadSupplierListingReview('u',root,registry)).valid).toBe(false);});
 it('cannot replace a frozen physical-form judgment with descriptive effects',async()=>{
  const groups=JSON.stringify([{products:['1'],old:'old',new:'new'}]),semantic=JSON.stringify({summary:{inputSha256:hash(groups)},rows:[{group:0,productIds:['1'],oldVisibleTextSha256:hash('old'),currentVisibleTextSha256:hash('new'),review:{impact:['dimensions'],judgment:'形状変更'},reviewer:'test',reviewedAt:'2026-11-06'}]});
  const body=JSON.stringify({products:[{id:1,variants:[{id:2,sku:'old',price:'100',option1:'3mm',option2:'10ヶ'}]}]});
  for(const[name,b]of[['page-1.json',body],['body-semantic-review.json',semantic],['body-semantic-groups.json',groups]]){await writeFile(join(root,'supplier-listing-review/evidence',name),b);const f=manifest.files.find((f:any)=>f.path==='evidence/'+name);if(f)f.sha256=hash(b);else manifest.files.push({path:'evidence/'+name,sha256:hash(b)});}
  manifest.evidenceManifestSha256=hash(listingStable(manifest.files));const s=manifest.sources[0];s.receipt.sha256=hash(body);s.codes=['PRODUCT_BODY_HTML_CHANGED'];s.bodySemanticReview=listingBodyReview(JSON.parse(semantic),'1',hash(semantic),hash(groups));manifest.parts[0].codes=s.codes;await publish();
  const valid=await loadSupplierListingReview('u',root,registry);expect(valid.valid).toBe(true);expect(listingAssessmentBlocked(projectListingAggregate(aggregate,valid))).toBe(true);
  s.bodySemanticReview.effects=['descriptive'];await publish();expect((await loadSupplierListingReview('u',root,registry)).valid).toBe(false);
 });
 it('fails unavailable on missing corrupt foreign or contradictory evidence',async()=>{expect((await loadSupplierListingReview('foreign',root,registry)).valid).toBe(false);manifest.sources[0].codes=[];await publish();expect((await loadSupplierListingReview('u',root,registry)).valid).toBe(false);await writeFile(join(root,'supplier-listing-review/evidence/page-1.json'),'broken');expect((await loadSupplierListingReview('u',root,registry)).valid).toBe(false);await rm(join(root,'supplier-listing-review/manifest.json'));const index=await loadSupplierListingReview('u',root,registry);expect(projectListingAggregate(aggregate,index)?.binding).toBe('unavailable');expect(projectListingAggregate({part:{id:'manual'}},index)).toBeUndefined();});
 it('projects partial-column catalog reads using full business rows and no mutations',async()=>{const index=await loadSupplierListingReview('u',root,registry),queries:string[]=[],tx={query:async(sql:string)=>{queries.push(sql);return{rows:sql.includes('public.parts')?[{data:aggregate.part}]:sql.includes('part_purchase_specs')?[{data:aggregate.purchase_spec}]:[]};}};const result=await projectListingRows(tx,[{id:'p',metadata:aggregate.part.metadata}],index);expect(result[0].supplier_listing_review?.binding).toBe('verified');expect(Object.hasOwn(result[0],'sku')).toBe(false);expect(queries).toHaveLength(5);expect(queries.every(q=>q.startsWith('select '))).toBe(true);});
});

it('carries frozen review evidence and referenced sources to a clean workspace without a registry',async()=>{
 const chunks=await captureReviewArchive('u',root,registry);expect(chunks).not.toBeNull();
 const target=join(root,'restored');await mkdir(target);await stageReviewArchive('u',target,chunks!);
 const index=await loadSupplierListingReview('u',target,join(root,'missing-registry'));
 expect(index.valid).toBe(true);expect(projectListingAggregate(aggregate,index)).toEqual(projectListingAggregate(aggregate,await loadSupplierListingReview('u',root,registry)));
 const changed=structuredClone(aggregate);changed.part.width_mm=99;expect(projectListingAggregate(changed,index)?.binding).toBe('stale');
 const next=await captureReviewArchive('u',target,join(root,'missing-registry'));expect(next?.map(c=>[c.path,c.decodedSha256])).toEqual(chunks!.map(c=>[c.path,c.decodedSha256]));
 expect(chunks!.some(c=>c.path.includes('registry'))).toBe(false);
 const bad=JSON.parse((await readFile(join(target,'supplier-listing-review/portable-sources.json'))).toString());bad.sources[0].price=1;await writeFile(join(target,'supplier-listing-review/portable-sources.json'),JSON.stringify(bad));
 expect((await loadSupplierListingReview('u',target,registry)).valid).toBe(false);await expect(captureReviewArchive('u',target,registry)).rejects.toThrow('BACKUP_REVIEW_INVALID');
});
it('refuses corrupt, foreign, incomplete or extra portable files before staging',async()=>{
 const chunks=(await captureReviewArchive('u',root,registry))!,target=join(root,'invalid');await mkdir(target);
 await expect(stageReviewArchive('other',target,chunks)).rejects.toThrow();
 await expect(stageReviewArchive('u',target,chunks.filter(c=>c.path!=='portable-sources.json'))).rejects.toThrow();
 await expect(stageReviewArchive('u',target,[...chunks,chunks[0]])).rejects.toThrow();
 expect(()=>decodeReviewChunk({...chunks[0],decodedLength:1})).toThrow();
 await expect(readFile(join(target,'supplier-listing-review/manifest.json'))).rejects.toThrow();
});

it('preserves empty HTTP404 evidence as an endpoint warning through portable staging',async()=>{
 const empty='';await writeFile(join(root,'supplier-listing-review/evidence/page-1.json'),empty);manifest.files[0].sha256=hash(empty);manifest.evidenceManifestSha256=hash(listingStable(manifest.files));manifest.sources[0].receipt.status=404;manifest.sources[0].receipt.sha256=hash(empty);manifest.sources[0].codes=['CURRENT_PRODUCT_ENDPOINT_404'];manifest.parts[0].codes=['CURRENT_PRODUCT_ENDPOINT_404'];await publish();
 const chunks=(await captureReviewArchive('u',root,registry))!,target=join(root,'empty404');await mkdir(target);await stageReviewArchive('u',target,chunks);
 const index=await loadSupplierListingReview('u',target,join(root,'absent'));expect(index.valid).toBe(true);const assessment=projectListingAggregate(aggregate,index);expect(assessment?.codes).toEqual(['CURRENT_PRODUCT_ENDPOINT_404']);expect(listingAssessmentBlocked(assessment)).toBe(true);
});
it('rejects linked evidence and enforces file count and byte budgets before capture',async()=>{
 const count=reviewLimits.maxFiles,total=reviewLimits.maxTotalBytes;
 try{reviewLimits.maxFiles=4;await expect(captureReviewArchive('u',root,registry)).rejects.toThrow('BACKUP_REVIEW_LIMIT');reviewLimits.maxFiles=count;reviewLimits.maxTotalBytes=1;await expect(captureReviewArchive('u',root,registry)).rejects.toThrow('REVIEW_SIZE');}finally{reviewLimits.maxFiles=count;reviewLimits.maxTotalBytes=total;}
 const evidence=join(root,'supplier-listing-review/evidence'),outside=join(root,'outside');await rename(evidence,outside);await symlink(outside,evidence,process.platform==='win32'?'junction':'dir');try{expect((await loadSupplierListingReview('u',root,registry)).valid).toBe(false);await expect(captureReviewArchive('u',root,registry)).rejects.toThrow('REVIEW_LINK');}finally{await unlink(evidence);await rename(outside,evidence);}
});

it('removes only its own partial sidecar after a write failure so staging can retry',async()=>{
 const chunks=(await captureReviewArchive('u',root,registry))!,target=join(root,'write-failure');await mkdir(target);await writeFile(join(target,'keep.txt'),'preserve');
 try{ioFailure.path='write-failure';await expect(stageReviewArchive('u',target,chunks)).rejects.toThrow('INJECTED_REVIEW_WRITE_FAILURE');}finally{ioFailure.path='';}
 await expect(readFile(join(target,'supplier-listing-review/manifest.json'))).rejects.toThrow();expect(await readFile(join(target,'keep.txt'),'utf8')).toBe('preserve');await stageReviewArchive('u',target,chunks);expect((await loadSupplierListingReview('u',target,join(root,'missing'))).valid).toBe(true);
 await expect(stageReviewArchive('u',target,chunks)).rejects.toMatchObject({code:'EEXIST'});expect((await loadSupplierListingReview('u',target,join(root,'missing'))).valid).toBe(true);
});
