import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {mkdtemp,rm,readFile,writeFile,readdir,lstat,mkdir,symlink,open} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import sharp from 'sharp';
import {LocalWorkspace} from './localWorkspace';
import {cleanupAbandonedBackupSets} from './workspaceBackupSet';
import {restoreWorkspaceBackup} from './restoreWorkspaceBackup';
import {consumeBackup,backupHash,backupLine,chainBackup,backupCounts} from './workspaceBackupFormat';
let root:string,db:LocalWorkspace,archive:string,owner:string,part:string,design:string,pendingId:string;
const rpc=(name:string,args:Record<string,unknown>={})=>db.rpc(name,args,randomUUID()) as Promise<any>;
beforeAll(async()=>{
 root=await mkdtemp(join(tmpdir(),'acc-backup-set-'));db=await LocalWorkspace.open(join(root,'source'));owner=db.owner;
 const bytes=await sharp({create:{width:10,height:20,channels:4,background:'#557799'}}).png().toBuffer();
 const asset=async(kind:string)=>{const r=await rpc('reserve_asset_upload');for(const path of r.paths)await db.upload(path,bytes,'image/png');return{id:r.id,asset_kind:kind,content_hash:backupHash(bytes),original_path:r.paths[0],normalized_high_path:r.paths[1],normalized_medium_path:r.paths[2],thumbnail_path:r.paths[3],pixel_width:10,pixel_height:20,calibration_mm_per_px:1};};
 const main=await asset('part_main');part=(await rpc('save_part_successor',{part_id:null,payload:{image_asset:main,part:{name:'Backup controlled bead',category:'bead',geometry_kind:'node',width_mm:10,height_mm:20,image_asset_id:main.id},source_snapshots:[{source_url:'https://example.com/fixture',fetched_at:new Date().toISOString(),parser_version:'fixture',raw_fields:{fixture:true},status:'partial'}]}})).part_id;
 await rpc('set_part_user_state',{part_id:part,is_favorite:true,mark_used:true});design=(await rpc('create_design',{input_name:'Backup controlled design',input_type:'necklace'})).id;
 await rpc('save_design_aggregate',{design_id:design,expected_revision:0,payload:{design:{id:design,name:'Backup controlled design',type:'necklace',canvas_config:{},editor_config:{}},nodes:[{id:randomUUID(),part_id:part,x_mm:1,y_mm:2,rotation_deg:0,scale_x:1,scale_y:1,z_index:0,locked:false}],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]}});
 await rpc('save_part_successor',{part_id:part,payload:{part:{name:'Backup successor'}}});
 const pathMain=await asset('part_main'),segment=await asset('path_segment');await rpc('save_part_successor',{part_id:null,payload:{image_asset:pathMain,segment_asset:segment,part:{name:'Backup texture wire',category:'wire',geometry_kind:'path',image_asset_id:pathMain.id},path_spec:{render_mode:'stroke_texture',segment_asset_id:segment.id,nominal_diameter_mm:1,opacity:1,texture_overlap_mm:0,start_max_connections:0,end_max_connections:0}}});
 const pending=await rpc('reserve_asset_upload');pendingId=pending.id;await db.upload(pending.paths[0],bytes,'image/png');
 const result=await db.exportBackupSet();archive=join(db.root,'exports',result.id+'.accbackup.ndjson');
},60000);
afterAll(async()=>{await db?.close();if(root&&root.startsWith(join(tmpdir(),'acc-backup-set-')))await rm(root,{recursive:true,force:true});});
it('restores an entire semantic set with archived successor, nonempty Design, user state, source and segment bytes',async()=>{
 const expected=await db.exportPackage(),target=join(root,'restored');await restoreWorkspaceBackup(archive,target);const restored=await LocalWorkspace.open(target);
 try{expect((await restored.exportPackage()).sha256).toBe(expected.sha256);expect((await restored.rpc('get_design_aggregate',{design_id:design},randomUUID()) as any).nodes[0].part_id).toBe(part);await restored.auditIntegrity();}finally{await restored.close();}
 await expect(restoreWorkspaceBackup(archive,target)).rejects.toThrow('WORKSPACE_EXISTS');
},60000);
it('fails chunk corruption, missing/reordered/footer/trailing data without publishing a workspace',async()=>{
 const lines=(await readFile(archive,'utf8')).trimEnd().split('\n');const variants=[lines.slice(0,-1),[lines[0],lines[2],lines[1],...lines.slice(3)],[...lines,lines[0]],[...lines.slice(0,2),lines[1],...lines.slice(2)],lines.map((line,i)=>i===1?line.replace('"sha256":"','"sha256":"0'):line)];
 for(const [i,variant]of variants.entries()){const input=join(root,'bad-'+i+'.ndjson'),target=join(root,'bad-target-'+i);await writeFile(input,variant.join('\n')+'\n');await expect(restoreWorkspaceBackup(input,target)).rejects.toThrow();await expect(lstat(target)).rejects.toMatchObject({code:'ENOENT'});}
},60000);
it('checks domain closure even when an altered file has fully recomputed chunk and footer hashes',async()=>{
 const records=(await readFile(archive,'utf8')).trimEnd().split('\n').map(x=>JSON.parse(x));let chain=records[0].sha256;
 for(const r of records)if(r.kind==='chunk'){if(r.payload.type==='rows'&&r.payload.table==='parts')for(const p of r.payload.rows)p.geometry_kind='path';r.sha256=backupHash(JSON.stringify(r.payload));chain=chainBackup(chain,r.sequence,r.sha256);}
 const footer=records.at(-1);footer.payload.chainSha256=chain;footer.sha256=backupHash(JSON.stringify(footer.payload));const input=join(root,'forged.ndjson');await writeFile(input,records.map(r=>JSON.stringify(r)+'\n').join(''));
 const target=join(root,'rollback');await mkdir(target);await writeFile(join(target,'identity.json'),JSON.stringify({version:1,id:owner}));const empty=await LocalWorkspace.open(target);
 try{await expect(empty.importBackupSet(input)).rejects.toThrow();expect((await empty.exportPackage()).payload.tables.parts).toHaveLength(0);expect((await empty.exportPackage()).payload.blobs).toHaveLength(0);}finally{await empty.close();}
},60000);
it('validates UUID download identity and refuses linked export roots',async()=>{
 await expect(db.backupDownload('../identity.json')).rejects.toThrow('BACKUP_ID_INVALID');const id=archive.split(/[\\/]/).at(-1)!.split('.')[0],download=await db.backupDownload(id);expect(download.size).toBe((await lstat(archive)).size);await download.file.close();
 const linked=join(root,'linked'),outside=join(root,'outside');await mkdir(linked);await mkdir(outside);await symlink(outside,join(linked,'exports'),process.platform==='win32'?'junction':'dir');await expect(LocalWorkspace.open(linked)).rejects.toThrow('BACKUP_ROOT_LINK');
},30000);
it('records bounded chunks and excludes credentials, tokens and source filesystem collections',async()=>{
 let chunks=0;const result=await consumeBackup(archive,{header:async h=>{expect(h.excluded).toContain('.local/parts');expect(h.migrationStatus).toBe('not_migrated');},chunk:async c=>{chunks++;if(c.type==='rows')expect(c.rows.length).toBeLessThanOrEqual(256);}});expect(result.footer.chunkCount).toBe(chunks);expect(result.footer.counts.local_blobs).toBe(13);expect(result.footer.counts.parts).toBe(3);expect(await readdir(join(db.root,'exports'))).toHaveLength(1);
});
it('rejects orphan objects and committed reservations without assets even with valid recomputed integrity',async()=>{
 for(const mode of ['orphan-object','committed-without-asset']){
  const records=(await readFile(archive,'utf8')).trimEnd().split('\n').map(x=>JSON.parse(x)),counts=backupCounts();let sequence=0,chain=records[0].sha256,blobBytes=0n;
  for(const r of records)if(r.kind==='chunk'){
   if(r.payload.type==='rows'){if(r.payload.table==='asset_uploads'){if(mode==='orphan-object')r.payload.rows=r.payload.rows.filter((row:any)=>row.id!==pendingId);else for(const row of r.payload.rows)if(row.id===pendingId)row.state='committed';}counts[r.payload.table]+=r.payload.rows.length;}else{counts.local_blobs++;blobBytes+=BigInt(r.payload.length);}r.sequence=sequence;r.sha256=backupHash(JSON.stringify(r.payload));chain=chainBackup(chain,sequence++,r.sha256);
  }
  const f=records.at(-1);Object.assign(f.payload,{counts,chunkCount:sequence,chainSha256:chain,blobBytes:blobBytes.toString()});f.sha256=backupHash(JSON.stringify(f.payload));const input=join(root,mode+'.ndjson');await writeFile(input,records.map(r=>JSON.stringify(r)+'\n').join(''));
  const target=join(root,mode+'-target');await expect(restoreWorkspaceBackup(input,target)).rejects.toThrow('BACKUP_RESERVATION');await expect(lstat(target)).rejects.toMatchObject({code:'ENOENT'});
 }
},60000);
it('rejects an ancestor junction before creating a workspace outside its lexical root',async()=>{
 const outside=join(root,'ancestor-outside'),alias=join(root,'ancestor-alias');await mkdir(outside);await symlink(outside,alias,process.platform==='win32'?'junction':'dir');await expect(restoreWorkspaceBackup(archive,join(alias,'workspace'))).rejects.toThrow('WORKSPACE_PATH_LINK');await expect(lstat(join(outside,'workspace'))).rejects.toMatchObject({code:'ENOENT'});
});
it('does not publish incomplete artifacts after disk failure or cancellation and releases its transaction',async()=>{
 const probe=await open(join(root,'prototype-probe'),'wx'),prototype=Object.getPrototypeOf(probe),original=prototype.writeFile;await probe.close();
 const before=await readdir(join(db.root,'exports'));
 for(const mode of ['disk','cancel']){const abort=new AbortController(),spy=vi.spyOn(prototype,'writeFile');
  if(mode==='disk')spy.mockRejectedValueOnce(Object.assign(Error('CONTROLLED_DISK_FULL'),{code:'ENOSPC'}));else spy.mockImplementationOnce(async function(this:any,...args:any[]){const result=await original.apply(this,args);abort.abort();return result;});
  try{await expect(db.exportBackupSet(abort.signal)).rejects.toThrow();}finally{spy.mockRestore();}
  expect(await readdir(join(db.root,'exports'))).toEqual(before);expect((await db.select({table:'designs',columns:'id'}) as any[]).length).toBe(1);
 }
});
it('cleans only identified dead-worker temporary backups and preserves live and completed files',async()=>{
 const id=archive.split(/[\\/]/).at(-1)!.split('.')[0],dir=join(db.root,'exports'),dead=join(dir,id+'.2147483647.tmp'),live=join(dir,id+'.'+process.pid+'.tmp'),unknown=join(dir,'unknown.tmp');
 expect(()=>process.kill(2147483647,0)).toThrow();const bytes=await readFile(archive);await writeFile(dead,bytes);await writeFile(live,bytes);await writeFile(unknown,'unknown user file');
 try{expect(await cleanupAbandonedBackupSets(db.root,owner)).toBe(1);await expect(lstat(dead)).rejects.toMatchObject({code:'ENOENT'});expect((await readFile(live)).equals(bytes)).toBe(true);expect((await readFile(archive)).equals(bytes)).toBe(true);expect((await readFile(unknown,'utf8'))).toBe('unknown user file');}finally{await rm(live,{force:true});await rm(unknown,{force:true});}
});
it('restores both v2 and legacy v1 through the offline CLI using the existing isolated test-root switch',async()=>{
 const legacy=await db.exportPackage(),old=join(root,'legacy.json');await writeFile(old,JSON.stringify(legacy));
 for(const source of [archive,old]){const id=randomUUID(),target=resolve('.local/test-workspaces',id),env={...process.env,ACC_LOCAL_WORKSPACE_TEST_ID:id};
  try{const result=await promisify(execFile)(process.execPath,['scripts/restore-local-workspace.mjs',source],{cwd:process.cwd(),env,windowsHide:true});expect(result.stdout).toContain('Restored and verified');const restored=await LocalWorkspace.open(target);try{expect((await restored.exportPackage()).sha256).toBe(legacy.sha256);}finally{await restored.close();}await expect(promisify(execFile)(process.execPath,['scripts/restore-local-workspace.mjs',source],{cwd:process.cwd(),env,windowsHide:true})).rejects.toThrow('WORKSPACE_EXISTS');}
  finally{if(target===resolve('.local/test-workspaces',id))await rm(target,{recursive:true,force:true});}
 }
},60000);
it('preserves a target that appears after staging and never publishes over it',async()=>{
 const target=join(root,'publication-race'),original=LocalWorkspace.open.bind(LocalWorkspace),spy=vi.spyOn(LocalWorkspace,'open').mockImplementationOnce(async(...args)=>{const staged=await original(...args);await mkdir(target);await writeFile(join(target,'keep.txt'),'user-owned target');return staged;});
 try{await expect(restoreWorkspaceBackup(archive,target)).rejects.toThrow('WORKSPACE_EXISTS');expect(await readFile(join(target,'keep.txt'),'utf8')).toBe('user-owned target');}finally{spy.mockRestore();}
},30000);
it('streams and restores more than50000 rows and more than128MiB without the legacy whole-package limit',async()=>{
 await db.db.query("insert into public.part_source_snapshots(id,part_id,source_url,fetched_at,parser_version,raw_fields,status) select gen_random_uuid(),$1,'https://example.com/bounded-fixture',now(),'capacity-fixture','{}'::jsonb,'partial' from generate_series(1,50001)",[part]);
 const noise=await sharp(randomBytes(1024*1024*3),{raw:{width:1024,height:1024,channels:3}}).png().toBuffer();
 for(let i=0;i<8;i++){const r=await rpc('reserve_asset_upload');for(const p of r.paths)await db.upload(p,noise,'image/png');const a={id:r.id,asset_kind:'part_main',content_hash:backupHash(noise),original_path:r.paths[0],normalized_high_path:r.paths[1],normalized_medium_path:r.paths[2],thumbnail_path:r.paths[3],pixel_width:1024,pixel_height:1024,calibration_mm_per_px:.001};await rpc('save_part_successor',{part_id:null,payload:{image_asset:a,part:{name:'Capacity fixture '+i,category:'bead',geometry_kind:'node',width_mm:1.024,height_mm:1.024,image_asset_id:r.id}}});}
 await expect(db.exportPackage()).rejects.toThrow('EXPORT_TOO_LARGE');const result=await db.exportBackupSet(),file=join(db.root,'exports',result.id+'.accbackup.ndjson');expect(result.bytes).toBeGreaterThan(128*1024*1024);
 const digest=async(path:string)=>{const h=createHash('sha256');const proof=await consumeBackup(path,{header:async()=>{},chunk:async c=>{h.update(JSON.stringify(c));}});return{hash:h.digest('hex'),proof};};
 const before=await digest(file);expect(before.proof.footer.counts.part_source_snapshots).toBe(50002);expect(BigInt(before.proof.footer.blobBytes)).toBeGreaterThan(BigInt(90*1024*1024));
 const target=join(root,'capacity-restored');await restoreWorkspaceBackup(file,target);const restored=await LocalWorkspace.open(target);
 try{const next=await restored.exportBackupSet(),after=await digest(join(target,'exports',next.id+'.accbackup.ndjson'));expect(after.hash).toBe(before.hash);expect(after.proof.footer.counts).toEqual(before.proof.footer.counts);}finally{await restored.close();}
},240000);
