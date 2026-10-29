import {it,expect,vi} from 'vitest';
import {mkdtemp,mkdir,cp,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {LocalWorkspace} from './localWorkspace';
import {availableSalePolicy} from './minimumSaleUnits';
import {cordProducts,cordQuotes} from './cordProducts';
import {restoreWorkspaceBackup} from './restoreWorkspaceBackup';

it('fresh clone supports manual parts/designs and refuses incomplete sources or source-derived saves/restores',async()=>{
 const original=process.cwd(),root=await mkdtemp(join(tmpdir(),'acc-portable-'));
 await cp(join(original,'supabase','migrations'),join(root,'supabase','migrations'),{recursive:true});
 await mkdir(join(root,'src','data'),{recursive:true});
 await copyFile(join(original,'src','data','kiwa-minimum-sale-units.json'),join(root,'src','data','kiwa-minimum-sale-units.json'));
 const cwd=vi.spyOn(process,'cwd').mockReturnValue(root);let db:LocalWorkspace|undefined;
 try{
  expect(await availableSalePolicy()).toBeNull();expect(await cordProducts()).toEqual([]);expect(await cordQuotes([])).toEqual([]);
  const workspace=join(root,'workspace');db=await LocalWorkspace.open(workspace);
  const rpc=async(name:string,args:Record<string,unknown>={})=>db!.rpc(name,args,randomUUID()) as Promise<any>;
  const asset=await rpc('reserve_asset_upload'),bytes=await sharp({create:{width:8,height:4,channels:4,background:'red'}}).png().toBuffer();
  for(const path of asset.paths)await db.upload(path,bytes,'image/png');
  const payload={part:{name:'manual portable',category:'bead',geometry_kind:'node',import_source:'manual',width_mm:8,height_mm:4,image_asset_id:asset.id},image_asset:{id:asset.id,asset_kind:'part_main',content_hash:createHash('sha256').update(bytes).digest('hex'),original_path:asset.paths[0],normalized_high_path:asset.paths[1],normalized_medium_path:asset.paths[2],thumbnail_path:asset.paths[3],pixel_width:8,pixel_height:4,calibration_mm_per_px:1}};
  const partId=(await rpc('save_part_successor',{part_id:null,payload})).part_id;
  await rpc('save_part_successor',{part_id:partId,payload:{part:{notes:'saved on a fresh device'}}});
  expect((await rpc('get_part_aggregate',{part_id:partId})).part.notes).toBe('saved on a fresh device');
  expect((await db.readParts([partId])).length).toBe(1);expect((await db.select({table:'parts',columns:'*'}) as any[]).length).toBe(1);
  const designId=(await rpc('create_design',{input_name:'portable design',input_type:'necklace'})).id;
  await rpc('save_design_aggregate',{design_id:designId,expected_revision:0,payload:{design:{id:designId,name:'portable design',type:'necklace',canvas_config:{},editor_config:{}},nodes:[{id:randomUUID(),part_id:partId,x_mm:0,y_mm:0,rotation_deg:0,scale_x:1,scale_y:1,z_index:0,locked:false}],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]}});
  expect((await rpc('get_design_aggregate',{design_id:designId})).nodes.length).toBe(1);
  await expect(rpc('record_part_source_snapshot',{part_id:partId,snapshot:{source_url:'https://www.kiwaseisakujo.jp/products/1',fetched_at:new Date().toISOString(),parser_version:'fixture',status:'success'}})).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  const readKey=randomUUID();await db.rpc('get_design_aggregate',{design_id:designId},readKey);
  const cord={version:1,sourceDraftId:'kiwa:1:2',usedLengthMm:10};
  await db.db.query('update public.designs set editor_config=$1::jsonb where id=$2',[JSON.stringify({cordSpecification:cord}),designId]);
  await expect(rpc('get_design_aggregate',{design_id:designId})).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  await expect(db.rpc('get_design_aggregate',{design_id:designId},readKey)).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  await expect(rpc('save_design_aggregate',{design_id:designId,expected_revision:1,payload:{design:{id:designId,name:'portable design',type:'necklace',canvas_config:{},editor_config:{cordSpecification:cord}},nodes:[],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]}})).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  await db.db.query('update public.designs set editor_config=$1::jsonb where id=$2',['{}',designId]);
  const backup=await db.exportBackupSet(),source=join(workspace,'exports',backup.id+'.accbackup.ndjson'),restored=join(root,'restored');
  await restoreWorkspaceBackup(source,restored);const reopened=await LocalWorkspace.open(restored);
  try{expect((await reopened.readParts([partId])).length).toBe(1);}finally{await reopened.close();}
  for(const part of [{import_source:'kiwa_url'},{metadata:{sourceDraftId:'kiwa:1:2'}},{source_url:'https://www.kiwaseisakujo.jp/products/1'}]){
   await expect(rpc('save_part_successor',{part_id:partId,payload:{part}})).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  }
  await rpc('delete_design',{design_id:designId,expected_revision:1});
  await db.db.query('update public.parts set metadata=$1::jsonb where id=$2',[JSON.stringify({sourceDraftId:'kiwa:1:2'}),partId]);
  await expect(rpc('save_part_successor',{part_id:partId,payload:{part:{metadata:{},source_url:null,import_source:'manual'}}})).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  await expect(db.readParts([partId])).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  const official=await db.exportBackupSet();await expect(restoreWorkspaceBackup(join(workspace,'exports',official.id+'.accbackup.ndjson'),join(root,'refused'))).rejects.toThrow('CATALOG_SOURCES_REQUIRED');
  const legacy=await db.exportPackage(),target=join(root,'legacy');await mkdir(target);await writeFile(join(target,'identity.json'),JSON.stringify({version:1,id:db.owner}));
  const empty=await LocalWorkspace.open(target);
  try{await expect(empty.importPackage(legacy)).rejects.toThrow('CATALOG_SOURCES_REQUIRED');expect((await empty.db.query('select * from public.parts')).rows).toEqual([]);}finally{await empty.close();}
  await expect(readFile(join(root,'refused','identity.json'))).rejects.toMatchObject({code:'ENOENT'});
  await mkdir(join(root,'.local','parts'),{recursive:true});await writeFile(join(root,'.local','parts','parts.json'),'{}');
  await expect(availableSalePolicy()).rejects.toMatchObject({code:'ENOENT'});
  await mkdir(join(root,'.local','catalog'),{recursive:true});await writeFile(join(root,'.local','catalog','catalog.json'),'{}');
  await expect(availableSalePolicy()).rejects.toThrow('SALE_POLICY_SOURCE_CHANGED');
 }finally{await db?.close();cwd.mockRestore();await rm(root,{recursive:true,force:true});}
},60000);
