import{it,expect,vi}from'vitest';import{readFile}from'node:fs/promises';
const connection=vi.hoisted(()=>({boot:undefined as undefined|{workspaceId:string;token:string}}));
vi.mock('./localWorkspace',()=>({workspace:async()=>{const endpoint='http://127.0.0.1:3000/api/local/workspace';connection.boot??=await fetch(endpoint).then(r=>r.json());const boot=connection.boot!;return{owner:boot.workspaceId,select:async(query:unknown)=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query})});const j=await r.json();if(!r.ok||j.error)throw Error(JSON.stringify(j));return j.data;}};}}));
import{correspondences}from'./partCorrespondence';import{salePolicy}from'./minimumSaleUnits';
const claspScope=process.env.ACC_VERIFY_PUBLISHED_BODY_PHOTOS==='clasps',newRingScope=process.env.ACC_VERIFY_PUBLISHED_BODY_PHOTOS==='new-rings';
it.skipIf(!['1','clasps','new-rings'].includes(process.env.ACC_VERIFY_PUBLISHED_BODY_PHOTOS??''))('projects live BODY frames and their eligible sale siblings without physical verification claims',async()=>{
 const dir=claspScope?'.local/setup/clasp-photo-review-20261105':newRingScope?'.local/setup/new-ring-photo-review-20261105':'.local/setup/photo-review-20261105';
 const first=JSON.parse(await readFile(dir+'/first.json','utf8')),policy=await salePolicy();expect(first.verified).toHaveLength(claspScope?14:newRingScope?31:98);
 const ids=[...new Set<string>(first.verified.flatMap((r:{draftId:string})=>policy.groups.get(r.draftId)!.members.filter(o=>!o.excludedReason).map(o=>o.draftId)))];
 const result=await correspondences(ids);
 for(const r of first.verified){for(const o of policy.groups.get(r.draftId)!.members.filter(o=>!o.excludedReason)){
  const c=result.entries.get(o.draftId);expect(c,o.draftId).toMatchObject({partId:r.partId,placementMode:'published-nominal',placementMapped:true,connectionReady:false});expect(c?.appearanceNote).toContain('同一商品の代表写真');expect(c?.appearanceNote).toContain('線径との比率');expect(c?.appearanceNote).toContain('実寸・穴接続は未確認');if(claspScope){expect(c?.appearanceNote).toContain('概寸');expect(c?.appearanceNote).toContain('約');}
 }}
},120000);
