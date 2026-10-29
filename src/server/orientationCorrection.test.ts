import{it,expect}from'vitest';import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{randomUUID,createHash}from'node:crypto';import sharp from'sharp';import{LocalWorkspace}from'./localWorkspace';import{saleRowHash}from'./minimumSaleUnits';
it('corrects an unused Part, preserves a referenced predecessor and recovers the same saved operation after a lost journal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'acc-orientation-')),db=await LocalWorkspace.open(root);const rpc=(n:string,a:Record<string,unknown>,k=randomUUID())=>db.rpc(n,a,k) as Promise<any>;
 try{
 const original=await sharp({create:{width:8,height:4,channels:4,background:'red'}}).png().toBuffer();
 const asset=async(b:Buffer)=>{const r=await rpc('reserve_asset_upload',{}),m=await sharp(b).metadata();for(let i=0;i<4;i++)await db.upload(r.paths[i],i?b:original,'image/png');return{id:r.id,asset_kind:'part_main',content_hash:createHash('sha256').update(b).digest('hex'),original_path:r.paths[0],normalized_high_path:r.paths[1],normalized_medium_path:r.paths[2],thumbnail_path:r.paths[3],pixel_width:m.width,pixel_height:m.height,calibration_mm_per_px:.5};};
 const first=await asset(original),created=await rpc('save_part_successor',{part_id:null,payload:{part:{name:'orientation fixture',category:'bead',geometry_kind:'node',width_mm:4,height_mm:2,image_asset_id:first.id},image_asset:first}}),id=created.part_id;
 let old=(await rpc('get_part_aggregate',{part_id:id})).part;
 const unused=await rpc('save_part_successor',{part_id:id,payload:{expected_part_sha256:saleRowHash(old),part:{notes:'unused correction'}}});expect(unused.part_id).toBe(id);expect(unused.created_successor).toBe(false);
 const design=(await rpc('create_design',{input_name:'preserved',input_type:'necklace'})).id;
 await rpc('save_design_aggregate',{design_id:design,expected_revision:0,payload:{design:{id:design,name:'preserved',type:'necklace',canvas_config:{},editor_config:{}},nodes:[{id:randomUUID(),part_id:id,x_mm:12,y_mm:23,rotation_deg:31,scale_x:1,scale_y:1,z_index:0,locked:false}],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]}});
 const before=await rpc('get_design_aggregate',{design_id:design});old=(await rpc('get_part_aggregate',{part_id:id})).part;
 const next=await asset(await sharp(original).rotate(270).png().toBuffer()),args={part_id:id,payload:{expected_part_sha256:saleRowHash(old),part:{width_mm:2,height_mm:4,image_asset_id:next.id},image_asset:next}},key=randomUUID();
 const result=await rpc('save_part_successor',args,key);expect(result.created_successor).toBe(true);expect(result.part_id).not.toBe(id);expect(await rpc('save_part_successor',args,key)).toEqual(result);expect(await rpc('get_design_aggregate',{design_id:design})).toEqual(before);
 const archived=await rpc('get_part_aggregate',{part_id:id});expect(archived.part.image_asset_id).toBe(first.id);expect(archived.part.is_archived).toBe(true);expect(Buffer.from((await db.image(first.normalized_high_path)).body)).toEqual(original);
 const corrected=(await rpc('get_part_aggregate',{part_id:result.part_id})).part;expect(corrected.width_mm).toBe(2);expect(corrected.height_mm).toBe(4);
 await expect(rpc('save_part_successor',{part_id:result.part_id,payload:{expected_part_sha256:saleRowHash(old),part:{notes:'stale'}}})).rejects.toThrow('PART_EDIT_CONFLICT');
 }finally{await db.close();await rm(root,{recursive:true,force:true});}
 // Includes PGlite startup and disk-backed image/transaction round trips.
},30000);
