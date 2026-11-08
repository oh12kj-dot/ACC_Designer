// Explicit read-only acceptance check against the user's running local workspace.
import{it,expect,vi}from'vitest';import{readFile}from'node:fs/promises';
const connection=vi.hoisted(()=>({boot:undefined as undefined|{workspaceId:string;token:string}}));
vi.mock('./localWorkspace',()=>({workspace:async()=>{
 const endpoint='http://127.0.0.1:3000/api/local/workspace';
 connection.boot??=await fetch(endpoint).then(r=>r.json());const boot=connection.boot!;
 return{owner:boot.workspaceId,select:async(query:unknown)=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query})});const j=await r.json();if(!r.ok||j.error)throw Error(JSON.stringify(j));return j.data;}};
}}));
import{correspondences}from'./partCorrespondence';
import{salePolicy}from'./minimumSaleUnits';
it.skipIf(process.env.ACC_VERIFY_PENDING_SALES!=='1')('reads all newly resolved canonical and sibling mappings from actual local API data',async()=>{
 const m=JSON.parse(await readFile('.local/calibration/provisional/promotions.json','utf8'));
 const refs=m.resolvedSaleReferences as {draftId:string;partId:string;canonicalOfferDraftId:string;purchase:unknown}[];
 expect(refs.length).toBeGreaterThan(800);const policy=await salePolicy();
 const result=await correspondences(refs.map(r=>r.draftId));
 for(const r of refs){
  expect(result.entries.get(r.draftId),r.draftId).toMatchObject({partId:r.partId,placementMode:'own-product-photo-reference',placementMapped:true,dimensionReviewed:false,connectionReady:false,reviewStatus:'provisional-needs-review'});
  expect(result.entries.get(r.draftId)?.provisionalReferenceOnly).not.toBe(true);
  const g=policy.groups.get(r.draftId)!;expect(g.status).toBe('resolved');expect(g.canonicalOfferDraftId).toBe(r.canonicalOfferDraftId);expect(g.members.find(o=>o.draftId===r.draftId)?.purchase).toEqual(r.purchase);
 }
 expect(m.pendingReferences).toHaveLength(8);
},120000);
