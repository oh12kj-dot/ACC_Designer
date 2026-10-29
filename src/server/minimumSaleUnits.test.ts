import {afterAll,beforeAll,expect,it} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {LocalWorkspace} from './localWorkspace';
import {assertSaleSave,cleanupSaleGroups,saleRowHash,projectSaleReference} from './minimumSaleUnits';
let db:LocalWorkspace,root:string,asset:any,rows:any[],policy:any,designId:string;
it('rejects a stale optional Part edit hash while holding the Part row lock',async()=>{
 await expect(db.actor(tx=>assertSaleSave(tx,{part_id:rows[0].id,payload:{part:{},expected_part_sha256:'stale'}},policy))).rejects.toThrow('PART_EDIT_CONFLICT');
 await expect(db.actor(tx=>assertSaleSave(tx,{part_id:rows[0].id,payload:{part:{},expected_part_sha256:saleRowHash(rows[0])}},policy))).rejects.toThrow('SALE_GROUP_ALREADY_REGISTERED');
});
const sources=['kiwa:1:1','kiwa:1:2','kiwa:1:3','kiwa:1:4','kiwa:1:5'];
beforeAll(async()=>{
 root=await mkdtemp(join(tmpdir(),'acc-min-sale-'));db=await LocalWorkspace.open(root);
 const r:any=await db.rpc('reserve_asset_upload',{},randomUUID()),bytes=await sharp({create:{width:10,height:20,channels:4,background:'red'}}).png().toBuffer();
 for(const path of r.paths)await db.upload(path,bytes,'image/png');
 asset={id:r.id,asset_kind:'part_main',content_hash:createHash('sha256').update(bytes).digest('hex'),original_path:r.paths[0],normalized_high_path:r.paths[1],normalized_medium_path:r.paths[2],thumbnail_path:r.paths[3],pixel_width:10,pixel_height:20,calibration_mm_per_px:1};
 // Historical pre-policy duplicates created through unchanged SQL functions.
 for(let i=0;i<sources.length;i++)await db.actor(tx=>tx.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify({...(i===0?{image_asset:asset}:{}),part:{name:'fixture'+i,category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:r.id,metadata:{sourceDraftId:sources[i]}}})]));
 rows=(await db.db.query<any>('select to_jsonb(p) as data from public.parts p order by name')).rows.map(r=>r.data);
 designId=(await db.rpc('create_design',{input_name:'preserved',input_type:'necklace'},randomUUID()) as any).id;
 await db.rpc('save_design_aggregate',{design_id:designId,expected_revision:0,payload:{design:{id:designId,name:'preserved',type:'necklace',canvas_config:{},editor_config:{}},nodes:[{id:randomUUID(),part_id:rows[2].id,x_mm:1,y_mm:2,rotation_deg:0,scale_x:1,scale_y:1,z_index:0,locked:false}],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]}},randomUUID());
 await db.rpc('set_part_user_state',{part_id:rows[1].id,mark_used:true},randomUUID());
 // Another Part references an obsolete predecessor; it must be archived, never deleted.
 await db.db.query('update public.parts set supersedes_part_id=$1 where id=$2',[rows[3].id,rows[4].id]);
 rows=(await db.db.query<any>('select to_jsonb(p) as data from public.parts p order by name')).rows.map(r=>r.data);
 const members=sources.map((draftId,i)=>({draftId,sourceUrl:'https://example.com/'+i,purchase:{sourceText:i?'50g':'2g(約71ヶ)',estimatedCount:i?undefined:71},price:154,currency:'JPY',available:true,sourceFetchedAt:'2026-10-19',excludedReason:i===4?'OBSOLETE_OR_TRANSITION_OFFER':null}));
 const aggregateSha=(part:any)=>saleRowHash({part,children:Object.fromEntries(['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots'].map(t=>[t,[]]))});
 const group={id:'group1',status:'resolved',displayName:'丸カン / 金 / 3mm',members,canonicalOfferDraftId:sources[0],retainedPartId:rows[0].id,retainedPartSha256:saleRowHash(rows[0]),preservedParts:[{partId:rows[0].id,rowSha256:saleRowHash(rows[0]),aggregateSha256:aggregateSha(rows[0])}],cleanup:rows.slice(1).map(p=>({partId:p.id,rowSha256:saleRowHash(p),aggregateSha256:aggregateSha(p),archiveContentSha256:saleRowHash({...p,is_archived:false,updated_at:null}),action:'delete'}))};
 policy={manifest:{workspaceId:db.owner,groups:[group]},groups:new Map(sources.map(id=>[id,group])),byUrl:new Map(),bySku:new Map(),sha256:'fixture'};
},30000);
afterAll(async()=>{await db?.close();if(root)await rm(root,{recursive:true,force:true});});
it('rejects non-minimum, obsolete, missing official identity and source removal before writes',async()=>{
 await expect(db.actor(tx=>assertSaleSave(tx,{payload:{part:{metadata:{sourceDraftId:sources[1]}}}},policy))).rejects.toThrow('MINIMUM_SALE_UNIT_ONLY');
 await expect(db.actor(tx=>assertSaleSave(tx,{payload:{part:{metadata:{sourceDraftId:sources[4]}}}},policy))).rejects.toThrow('OBSOLETE_SALE_UNIT_REJECTED');
 await expect(db.actor(tx=>assertSaleSave(tx,{payload:{part:{import_source:'kiwa_url'}}},policy))).rejects.toThrow('SALE_SOURCE_IDENTITY_REQUIRED');
 await expect(db.actor(tx=>assertSaleSave(tx,{part_id:rows[0].id,payload:{part:{metadata:{}}}},policy))).rejects.toThrow('SALE_SOURCE_REMOVAL_OR_CHANGE_REJECTED');
});
it('projects minimum-offer price without changing stored name or historical purchase identity',()=>{
 const projection=projectSaleReference(rows[1],policy);expect(projection?.purchaseText).toBe('2g(約71ヶ)');expect(projection?.retainedSourceDraftId).toBe(sources[1]);expect(rows[1].name).toBe('fixture1');
});
it('projects only the resolved same-product subgroup while keeping the conflicting parent on hold',async()=>{
 const g={...policy.manifest.groups[0],status:'hold',canonicalOfferDraftId:null,resolvedSubgroups:[{id:'subgroup',displayName:'同一商品の丸カン',members:sources.slice(0,2),canonicalOfferDraftId:sources[0],retainedPartId:rows[0].id,scope:'same-product-subgroup'}]},held={...policy,groups:new Map(sources.map(id=>[id,g]))};
 expect(projectSaleReference(rows[0],held)).toMatchObject({displayName:'同一商品の丸カン',scope:'same-product-subgroup',offerDraftId:sources[0]});expect(projectSaleReference(rows[2],held)).toBeUndefined();
 await expect(db.actor(tx=>assertSaleSave(tx,{payload:{part:{metadata:{sourceDraftId:sources[0]}}}},held))).rejects.toThrow('SALE_GROUP_IDENTITY_REVIEW_REQUIRED');
});
it('rolls back all cleanup when any later target hash is stale',async()=>{
 const stale=structuredClone(policy.manifest);stale.groups[0].cleanup.at(-1).rowSha256='stale';
 await expect(cleanupSaleGroups(db.db,{...policy,manifest:stale},db.owner)).rejects.toThrow('SALE_CLEANUP_PART_CHANGED');
 expect((await db.db.query('select * from public.parts')).rows).toHaveLength(5);
});
it('fails closed on changed child evidence even when the Part row is unchanged',async()=>{
 const id=await db.rpc('record_part_source_snapshot',{part_id:rows[4].id,snapshot:{source_url:'https://example.com/new-evidence',fetched_at:'2026-10-19',parser_version:'test',raw_fields:{},status:'success'}},randomUUID());
 await expect(cleanupSaleGroups(db.db,policy,db.owner)).rejects.toThrow('SALE_CLEANUP_PART_CHANGED');
 expect((await db.db.query('select * from public.parts')).rows).toHaveLength(5);
 await db.db.query('delete from public.part_source_snapshots where id=$1',[id]);
});
it('deletes unreferenced duplicates, archives Design/successor references, keeps images/Design, retries with zero changes',async()=>{
 const before=await db.rpc('get_design_aggregate',{design_id:designId},randomUUID());
 const result=await cleanupSaleGroups(db.db,policy,db.owner);
 expect(result.deleted).toEqual([rows[4].id]);expect(result.archived).toEqual([rows[1].id,rows[2].id,rows[3].id]);expect(result.changed).toBe(4);
 expect(await db.rpc('get_design_aggregate',{design_id:designId},randomUUID())).toEqual(before);
 expect((await db.db.query('select * from public.part_image_assets')).rows).toHaveLength(1);await db.auditIntegrity();
 expect((await cleanupSaleGroups(db.db,policy,db.owner)).changed).toBe(0);
 await expect(db.actor(tx=>assertSaleSave(tx,{part_id:rows[0].id,payload:{part:{name:'valid edit'}}},policy))).resolves.toBeUndefined();
 await expect(db.actor(tx=>assertSaleSave(tx,{payload:{part:{metadata:{sourceDraftId:sources[0]}}}},policy))).rejects.toThrow('SALE_GROUP_ALREADY_REGISTERED');
});
it('serializes concurrent singleton registration and rejects the second active copy',async()=>{
 const source='kiwa:2:1',g={id:'singleton',status:'singleton',canonicalOfferDraftId:source,members:[{draftId:source,sourceUrl:'https://example.com/other'}]},single={...policy,groups:new Map([[source,g]]),byUrl:new Map(),bySku:new Map()};
 const save=()=>db.actor(async tx=>{const part={name:'new singleton',category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:asset.id,metadata:{sourceDraftId:source}};await assertSaleSave(tx,{payload:{part}},single);return tx.query('select public.save_part_successor(null,$1::jsonb)',[JSON.stringify({part})]);});
 const results=await Promise.allSettled([save(),save()]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.message).toBe('SALE_GROUP_ALREADY_REGISTERED');
});
