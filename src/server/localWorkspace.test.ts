import { afterAll,beforeAll,expect,it } from 'vitest';
import { mkdtemp,rm,readFile,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash,randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { LocalWorkspace } from './localWorkspace';
let root:string,db:LocalWorkspace,partId:string,designId:string,paths:string[],payload:Record<string,unknown>;
const rpc=(name:string,args:Record<string,unknown>={},key=randomUUID())=>db.rpc(name,args,key) as Promise<any>;
beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),'acc-local-'));db=await LocalWorkspace.open(root);},30000);
afterAll(async()=>{await db?.close();await rm(root,{recursive:true,force:true});});
it('excludes a second writer while the first is live',async()=>{await expect(LocalWorkspace.open(root)).rejects.toThrow('WORKSPACE_BUSY');});
it('retains immutable real raster bytes and uses SQL calibration constraints',async()=>{
 const r=await rpc('reserve_asset_upload');paths=r.paths;const bytes=await sharp({create:{width:10,height:20,channels:4,background:{r:100,g:0,b:0,alpha:1}}}).png().toBuffer();
 for(const path of paths)await db.upload(path,bytes,'image/png');
 payload={image_asset:{id:r.id,asset_kind:'part_main',content_hash:createHash('sha256').update(bytes).digest('hex'),original_path:paths[0],normalized_high_path:paths[1],normalized_medium_path:paths[2],thumbnail_path:paths[3],pixel_width:10,pixel_height:20,calibration_mm_per_px:1},part:{name:'Controlled measured fixture',category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:r.id}};
 partId=(await rpc('save_part_successor',{part_id:null,payload})).part_id;
 await db.upload(paths[0],bytes,'image/png');const other=await sharp({create:{width:10,height:20,channels:4,background:{r:0,g:100,b:0,alpha:1}}}).png().toBuffer();await expect(db.upload(paths[0],other,'image/png')).rejects.toThrow('IMAGE_OVERWRITE_REJECTED');expect(Buffer.from((await db.image(paths[0])).body)).toEqual(bytes);
 await expect(db.remove(paths)).rejects.toThrow('CLEANUP_NOT_ALLOWED');
});
it('does not replay a cached successful save for a Part deleted by cleanup',async()=>{
 const key=randomUUID(),args={part_id:null,payload:{part:{name:'Temporary node',category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:(payload.part as any).image_asset_id}}};
 const result=await rpc('save_part_successor',args,key);await rpc('remove_unreferenced_part',{part_id:result.part_id});await expect(rpc('save_part_successor',args,key)).rejects.toThrow('PART_NO_LONGER_REGISTERED');
});
it('serializes revisions, rejects stale saves and retains referenced Part via successor',async()=>{
 designId=(await rpc('create_design',{input_name:'Local fixture',input_type:'necklace'})).id;
 const snapshot={design:{id:designId,name:'Local fixture',type:'necklace',canvas_config:{},editor_config:{}},nodes:[{id:randomUUID(),part_id:partId,x_mm:10,y_mm:10,rotation_deg:0,scale_x:1,scale_y:1,z_index:0,locked:false}],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]};
 const key=randomUUID();const saved=await rpc('save_design_aggregate',{design_id:designId,expected_revision:0,payload:snapshot},key);expect(saved.revision).toBe(1);
 expect(await rpc('save_design_aggregate',{design_id:designId,expected_revision:0,payload:snapshot},key)).toEqual(saved);
 await expect(rpc('save_design_aggregate',{design_id:designId,expected_revision:0,payload:snapshot})).rejects.toThrow('REVISION_CONFLICT');
 const successor=await rpc('save_part_successor',{part_id:partId,payload:{part:{name:'Successor fixture'}}});expect(successor.created_successor).toBe(true);expect(successor.part_id).not.toBe(partId);
 expect((await rpc('get_design_aggregate',{design_id:designId})).nodes[0].part_id).toBe(partId);
});
it('reads full Part batches in order without recording read operations, including archived references',async()=>{
 const current=(await db.select({table:'parts',columns:'id',filters:[{column:'is_archived',operator:'eq',value:false}]})) as {id:string}[];
 const ids=[partId,...current.map(p=>p.id)].filter((id,index,all)=>all.indexOf(id)===index);
 const before=(await db.db.query('select count(*) as n from public.local_operations')).rows;
 const batch=await db.readParts(ids) as any[];
 expect(batch.map(row=>row.part.id)).toEqual(ids);
 expect(batch[0].part.is_archived).toBe(true);
 for(let i=0;i<ids.length;i++)expect(batch[i]).toEqual((await db.actor(tx=>tx.query<{data:unknown}>('select public.get_part_aggregate($1) as data',[ids[i]]))).rows[0].data);
 expect((await db.db.query('select count(*) as n from public.local_operations')).rows).toEqual(before);
 await expect(db.readParts([randomUUID()])).rejects.toThrow('NOT_FOUND');
 await expect(db.readParts([partId,partId])).rejects.toThrow('INVALID_PART_BATCH');
 await expect(db.readParts(Array.from({length:257},()=>randomUUID()))).rejects.toThrow('INVALID_PART_BATCH');
 await expect(db.readParts(['bad-id'])).rejects.toThrow('INVALID_PART_BATCH');
});
it('rejects unsafe queries, forged images and mismatched retry keys',async()=>{
 await expect(db.select({table:'auth.users',columns:'*'})).rejects.toThrow();await expect(db.select({table:'parts',columns:'id;drop table parts'})).rejects.toThrow();
 await expect(db.image('../../identity.json')).rejects.toThrow('INVALID_PATH');await expect(db.upload(paths[0],new Uint8Array([1]),'image/png')).rejects.toThrow('INVALID_IMAGE');
 const key=randomUUID();await rpc('get_part_aggregate',{part_id:partId},key);await expect(rpc('get_part_aggregate',{part_id:randomUUID()},key)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
});
it('reopens the disk database with identical identity, references and images',async()=>{
 const owner=db.owner,original=Buffer.from((await db.image(paths[0])).body);await db.close();db=await LocalWorkspace.open(root);expect(db.owner).toBe(owner);expect((await rpc('get_design_aggregate',{design_id:designId})).design.revision).toBe(1);expect(Buffer.from((await db.image(paths[0])).body)).toEqual(original);expect(JSON.parse(await readFile(join(root,'identity.json'),'utf8')).id).toBe(owner);
});
it('round-trips a complete hashed portable package to an empty same-identity workspace',async()=>{
 const backup=await db.exportPackage();expect(backup.payload.migration.status).toBe('not_migrated');expect(await db.importPackage(backup)).toEqual({restored:false,unchanged:true});
 const fresh=await mkdtemp(join(tmpdir(),'acc-restore-'));await writeFile(join(fresh,'identity.json'),JSON.stringify({version:1,id:db.owner}));const restore=await LocalWorkspace.open(fresh);
 try{const corrupt=structuredClone(backup);corrupt.payload.blobs[0].body='AAAA';corrupt.sha256=createHash('sha256').update(JSON.stringify(corrupt.payload)).digest('hex');await expect(restore.importPackage(corrupt)).rejects.toThrow();expect((await restore.exportPackage()).payload.tables.parts).toHaveLength(0);
  const missingSpec=structuredClone(backup);for(const p of missingSpec.payload.tables.parts)p.geometry_kind='path';missingSpec.sha256=createHash('sha256').update(JSON.stringify(missingSpec.payload)).digest('hex');await expect(restore.importPackage(missingSpec)).rejects.toThrow('PATH_SPEC_REQUIRED');expect((await restore.exportPackage()).payload.tables.parts).toHaveLength(0);
  expect(await restore.importPackage(backup)).toEqual({restored:true,unchanged:false});expect((await restore.exportPackage()).sha256).toBe(backup.sha256);
 }finally{await restore.close();await rm(fresh,{recursive:true,force:true});}
});
it('fails startup on acknowledged image corruption without resetting records',async()=>{
 const fresh=await mkdtemp(join(tmpdir(),'acc-corrupt-'));await writeFile(join(fresh,'identity.json'),JSON.stringify({version:1,id:db.owner}));const copy=await LocalWorkspace.open(fresh);await copy.importPackage(await db.exportPackage());await copy.db.query("update public.local_blobs set sha256='tampered' where path=$1",[paths[0]]);await copy.close();try{await expect(LocalWorkspace.open(fresh)).rejects.toThrow('ASSET_INTEGRITY_FAILED');expect(JSON.parse(await readFile(join(fresh,'identity.json'),'utf8')).id).toBe(db.owner);}finally{await rm(fresh,{recursive:true,force:true});}
});
it('checks full image bytes with native SHA256 while returning only bounded headers, and still rejects forged raster bytes',async()=>{
 const original=Buffer.from((await db.image(paths[0])).body);
 const nodeHash=createHash('sha256').update(original).digest('hex');
 const result=(await db.db.query<{sha:string;header:Uint8Array}>("select encode(sha256($1::bytea),'hex') as sha,substring($1::bytea from 1 for 12) as header",[original])).rows[0];
 expect(result.sha).toBe(nodeHash);expect(Buffer.from(result.header)).toEqual(original.subarray(0,12));
 try{
  await db.db.query("update public.local_blobs set body=body||decode('00','hex') where path=$1",[paths[0]]);
  await expect(db.auditIntegrity()).rejects.toThrow('ASSET_INTEGRITY_FAILED');
  const fake=Buffer.from('not a raster image');
  await db.db.query('update public.local_blobs set body=$1,sha256=$2 where path=$3',[fake,createHash('sha256').update(fake).digest('hex'),paths[0]]);
  await expect(db.auditIntegrity()).rejects.toThrow('ASSET_INTEGRITY_FAILED');
 }finally{await db.db.query('update public.local_blobs set body=$1,sha256=$2 where path=$3',[original,nodeHash,paths[0]]);}
 await expect(db.auditIntegrity()).resolves.toBeUndefined();
});
it('only one contender can recover a dead writer lock',async()=>{
 const fresh=await mkdtemp(join(tmpdir(),'acc-stale-lock-'));await writeFile(join(fresh,'writer.lock'),'2147483647');let winner:LocalWorkspace|undefined;
 try{const results=await Promise.allSettled([LocalWorkspace.open(fresh),LocalWorkspace.open(fresh)]);const opened=results.filter(r=>r.status==='fulfilled');expect(opened).toHaveLength(1);winner=(opened[0] as PromiseFulfilledResult<LocalWorkspace>).value;expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);}finally{await winner?.close();await rm(fresh,{recursive:true,force:true});}
},30000);

it('persists source bound cord usage and reloads it without changing parts or unrelated config',async()=>{
 const {cordProducts}=await import('./cordProducts');const product=(await cordProducts())[0];
 const id=(await rpc('create_design',{input_name:'Cord usage fixture',input_type:'necklace'})).id;
 const a=await rpc('get_design_aggregate',{design_id:id});a.design.editor_config={compatibility:{clearanceMm:.1},cordSpecification:{...product,version:1,usedLengthMm:450}};
 const saved=await rpc('save_design_aggregate',{design_id:id,expected_revision:0,payload:a});expect(saved.revision).toBe(1);
 const read=await rpc('get_design_aggregate',{design_id:id});expect(read.design.editor_config).toEqual(a.design.editor_config);expect(read.paths).toHaveLength(0);
 read.design.editor_config.cordSpecification.diameterMm=100;
 await expect(rpc('save_design_aggregate',{design_id:id,expected_revision:1,payload:read})).rejects.toThrow('紐の商品情報');
 expect((await rpc('get_design_aggregate',{design_id:id})).design.revision).toBe(1);
});

it('persists cord layout and visual assemblies, rejecting invented references and physical conflicts',async()=>{
 const {cordProducts}=await import('./cordProducts');const product=(await cordProducts())[0];
 const id=(await rpc('create_design',{input_name:'Studio fixture',input_type:'necklace'})).id;
 const a=await rpc('get_design_aggregate',{design_id:id}),nid1=randomUUID(),nid2=randomUUID();
 const active=await db.select({table:'parts',columns:'*',filters:[{column:'is_archived',operator:'eq',value:false}]})as any[];const pid=active.find(p=>p.geometry_kind==='node').id;
 a.nodes=[nid1,nid2].map((id,i)=>({id,part_id:pid,x_mm:100,y_mm:100,rotation_deg:0,scale_x:1,scale_y:1,z_index:i,locked:false}));
 a.design.editor_config={cordSpecification:{...product,version:1,usedLengthMm:450},cordLayoutV1:{version:1,cordBinding:{sourceDraftId:product.sourceDraftId,sourceSha256:product.sourceSha256,usedLengthMm:450},guide:{shape:'u',width:100,drop:50,center:{x:150,y:100}},knotAllowanceMm:20,claspAllowanceMm:10,patternNodeIds:[]},visualAssembliesV1:{version:1,groups:[{id:randomUUID(),baseNodeId:nid1,decorationNodeIds:[nid2]}]}};
 await rpc('save_design_aggregate',{design_id:id,expected_revision:0,payload:a});
 const read=await rpc('get_design_aggregate',{design_id:id});expect(read.design.editor_config).toEqual(a.design.editor_config);expect(read.nodes).toHaveLength(2);expect(read.paths).toHaveLength(0);expect(read.point_attachments).toHaveLength(0);
 read.design.editor_config.cordLayoutV1.patternNodeIds=[randomUUID()];
 await expect(rpc('save_design_aggregate',{design_id:id,expected_revision:1,payload:read})).rejects.toThrow('参照');
 read.design.editor_config.cordLayoutV1.patternNodeIds=[];read.design.editor_config.visualAssembliesV1.groups[0].decorationNodeIds=[nid1];
 await expect(rpc('save_design_aggregate',{design_id:id,expected_revision:1,payload:read})).rejects.toThrow('重複');
 expect((await rpc('get_design_aggregate',{design_id:id})).design.revision).toBe(1);
});

it('deletes only owned design geometry, rejects stale revision, and never replays a deleted snapshot',async()=>{
 const id=(await rpc('create_design',{input_name:'Delete fixture',input_type:'necklace'})).id,other=(await rpc('create_design',{input_name:'Keep fixture',input_type:'necklace'})).id;
 const a=await rpc('get_design_aggregate',{design_id:id});const active=await db.select({table:'parts',columns:'*',filters:[{column:'is_archived',operator:'eq',value:false}]})as any[];
 a.nodes=[{id:randomUUID(),part_id:active.find(p=>p.geometry_kind==='node').id,x_mm:10,y_mm:20,rotation_deg:0,scale_x:1,scale_y:1,z_index:0,locked:false}];
 await rpc('save_design_aggregate',{design_id:id,expected_revision:0,payload:a});const key=randomUUID();await rpc('get_design_aggregate',{design_id:id},key);
 const protectedBefore=(await db.db.query('select (select count(*) from public.parts) as parts,(select count(*) from public.part_image_assets) as assets')).rows;
 await expect(rpc('delete_design',{design_id:id,expected_revision:0})).rejects.toThrow('REVISION_CONFLICT');await expect(rpc('delete_design',{design_id:id,expected_revision:-1})).rejects.toThrow('INVALID_REVISION');
 const deletionKey=randomUUID();expect(await rpc('delete_design',{design_id:id,expected_revision:1},deletionKey)).toBe(true);expect(await rpc('delete_design',{design_id:id,expected_revision:1},deletionKey)).toBe(true);
 expect(await rpc('get_design_aggregate',{design_id:id},key)).toBeNull();expect((await db.db.query('select id from public.design_nodes where design_id=$1',[id])).rows).toEqual([]);expect((await rpc('get_design_aggregate',{design_id:other})).design.id).toBe(other);
 expect((await db.db.query('select (select count(*) from public.parts) as parts,(select count(*) from public.part_image_assets) as assets')).rows).toEqual(protectedBefore);
 await db.db.query('insert into public.designs(id,user_id,name,type)values($1,$2,$3,$4)',[id,db.owner,'Restored fixture','necklace']);await expect(rpc('delete_design',{design_id:id,expected_revision:1},deletionKey)).rejects.toThrow('DELETE_REPLAY_REJECTED');
 const foreign=randomUUID();await db.db.query('insert into auth.users(id)values($1)',[foreign]);const foreignId=randomUUID();await db.db.query('insert into public.designs(id,user_id,name,type)values($1,$2,$3,$4)',[foreignId,foreign,'Foreign fixture','necklace']);await expect(rpc('delete_design',{design_id:foreignId,expected_revision:0})).rejects.toThrow('DESIGN_NOT_FOUND');expect((await db.db.query('select id from public.designs where id=$1',[foreignId])).rows).toHaveLength(1);
});
