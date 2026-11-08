import {deleteOwnedDesign} from './deleteDesign';
import{loadSupplierListingReview,projectListingAggregate,projectListingRows,type ListingIndex}from'./supplierListingReview';
import {assertCordSave} from './cordProducts';
import {projectHoleReference} from './holeReferences';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { mkdir, open, readFile, readdir, lstat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {createBackupSet,openBackupSet,importBackupSet,cleanupAbandonedBackupSets} from './workspaceBackupSet';
import {acquireWorkspacePublication} from './workspacePublication';
import {availableSalePolicy as salePolicy,assertManualPart,assertSaleSave,projectSaleReference,cleanupSaleGroups} from './minimumSaleUnits';

const tables=['parts','part_image_assets','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs','asset_uploads'] as const;
const functions:Record<string,Record<string,string>>={
 delete_design:{design_id:'uuid',expected_revision:'bigint'},create_design:{input_name:'text',input_type:'text'},get_design_aggregate:{design_id:'uuid'},get_part_aggregate:{part_id:'uuid'},
 save_design_aggregate:{design_id:'uuid',expected_revision:'bigint',payload:'jsonb',force_overwrite:'boolean'},
 save_part_successor:{part_id:'uuid',payload:'jsonb'},archive_part:{part_id:'uuid'},remove_unreferenced_part:{part_id:'uuid'},
 reserve_asset_upload:{},claim_asset_cleanup:{asset_id:'uuid'},finish_asset_cleanup:{asset_id:'uuid'},
 set_part_user_state:{part_id:'uuid',is_favorite:'boolean',mark_used:'boolean'},record_part_source_snapshot:{part_id:'uuid',snapshot:'jsonb'},
};
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const portableTables=['asset_uploads','part_image_assets','parts','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs','design_nodes','design_paths','design_point_attachments','design_through_attachments','design_path_attachments','design_mirror_links'] as const;
type PortablePayload={version:1;owner:string;migrationHash:string;tables:Record<string,Record<string,unknown>[]>;objects:Record<string,unknown>[];blobs:{path:string;body:string;mime:string;sha256:string;length:number}[];migration:{status:'not_migrated';sourceWorkspaceId:string;ids:Record<string,{sourceId:string;targetId:null}[]>}};
export type WorkspacePackage={payload:PortablePayload;sha256:string};
export class LocalWorkspace {
 readonly db:PGlite;
 private constructor(readonly owner:string, db:PGlite,private release:()=>Promise<void>,readonly root:string){this.db=db;}
 static async open(root=join(process.cwd(),'.local','workspace')) {
  const publish=await acquireWorkspacePublication(root);try{await mkdir(root,{recursive:true});if((await lstat(root)).isSymbolicLink())throw new Error('WORKSPACE_LINK_REJECTED');}finally{await publish();}
  const lockPath=join(root,'writer.lock');
  const acquire=async():Promise<Awaited<ReturnType<typeof open>>>=>{
   try{return await open(lockPath,'wx');}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
    const pid=Number(await readFile(lockPath,'utf8'));if(!Number.isSafeInteger(pid)||pid<=0)throw new Error('WORKSPACE_LOCK_INVALID');
    try{process.kill(pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH'){
     const claimPath=join(root,'recovery.lock');let claim;try{claim=await open(claimPath,'wx');}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new Error('WORKSPACE_RECOVERY_BUSY');throw e;}
     try{await claim.writeFile(String(process.pid));const current=Number(await readFile(lockPath,'utf8'));if(!Number.isSafeInteger(current)||current<=0)throw new Error('WORKSPACE_LOCK_INVALID');
      try{process.kill(current,0);throw new Error('WORKSPACE_BUSY');}catch(e){if((e as NodeJS.ErrnoException).code!=='ESRCH')throw e;}
      await unlink(lockPath);return await acquire();
     }finally{await claim.close();await unlink(claimPath);}
    }throw e;}
    throw new Error('WORKSPACE_BUSY');
   }
  };
  const lock=await acquire();await lock.writeFile(String(process.pid));await lock.sync();
  let db:PGlite|undefined;
  try{
   // User-created workspace directories are runtime data, never build inputs.
   for(const name of ['database','identity.json'])try{if((await lstat(join(/* turbopackIgnore: true */ root,name))).isSymbolicLink())throw new Error('WORKSPACE_LINK_REJECTED');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   let owner:string;try{const identity=JSON.parse(await readFile(join(root,'identity.json'),'utf8'));if(identity.version!==1||!uuid(identity.id))throw new Error('WORKSPACE_IDENTITY_INVALID');owner=identity.id;}
   catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
    try{await lstat(join(root,'database'));throw new Error('WORKSPACE_IDENTITY_MISSING');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    owner=randomUUID();const file=await open(join(root,'identity.json'),'wx');try{await file.writeFile(JSON.stringify({version:1,id:owner}));await file.sync();}finally{await file.close();}
   }
   db=new PGlite(join(root,'database'));await db.waitReady;
   const initialized=(await db.query<{exists:boolean}>("select to_regclass('public.local_schema') is not null as exists")).rows[0].exists;
   const migrations=await migrationSources();
   if(!initialized)await db.transaction(async tx=>{
    await tx.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
     grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
     create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
     create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
     alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
     create table public.local_schema(version integer primary key,owner uuid not null,migration_hash text not null);
     create table public.local_blobs(path text primary key,body bytea not null,mime text not null,sha256 text not null);
     create table public.local_operations(key uuid primary key,digest text not null,result jsonb not null);`);
    await tx.query('insert into auth.users values($1)',[owner]);for(const source of migrations)await tx.exec(source.body);
    await tx.query('insert into public.local_schema values(1,$1,$2)',[owner,hash(JSON.stringify(migrations))]);
   });
   const schema=(await db.query<{owner:string;migration_hash:string}>('select * from public.local_schema')).rows;
   if(schema.length!==1||schema[0].owner!==owner||schema[0].migration_hash!==hash(JSON.stringify(migrations)))throw new Error('WORKSPACE_SCHEMA_MISMATCH');
   const instance=new LocalWorkspace(owner,db,async()=>{await lock.close();await unlink(lockPath);},root);await instance.auditIntegrity();await cleanupAbandonedBackupSets(root,owner);return instance;
  }catch(error){await db?.close();await lock.close();await unlink(lockPath);throw error;}
 }
 async close(){await this.db.close();await this.release();}
 async applyMinimumSaleUnits(expected:string){
  const policy=await salePolicy();if(!policy)throw Error('CATALOG_SOURCES_REQUIRED');if(expected!==policy.sha256)throw Error('SALE_POLICY_HASH_MISMATCH');
  if(hash(await readFile(join(process.cwd(),'.local/parts/parts.json')))!==policy.manifest.registrySha256||hash(await readFile(join(process.cwd(),'.local/catalog/catalog.json')))!==policy.manifest.catalogSha256)throw Error('SALE_POLICY_SOURCE_CHANGED');
  const result=await cleanupSaleGroups(this.db,policy,this.owner);if(result.changed)await this.auditIntegrity();return {...result,allImageBytesVerified:result.changed>0};
 }
 async readParts(ids:unknown){
  if(!Array.isArray(ids)||ids.length>256||ids.some(id=>!uuid(id))||new Set(ids).size!==ids.length)throw Error('INVALID_PART_BATCH');
  return this.actor(async tx=>{
   const rows=(await tx.query<{data:unknown}>('select public.get_part_aggregate(id) as data from unnest($1::uuid[]) as requested(id)',[ids])).rows;
   if(rows.some(row=>row.data===null))throw Error('NOT_FOUND');
   const policy=await salePolicy(),listing=await loadSupplierListingReview(this.owner,this.root);return rows.map(row=>projectLocalAggregate(row.data,policy,listing));
  });
 }
 async auditIntegrity(){
  const user=(await this.db.query<{id:string}>('select id from auth.users')).rows;if(user.length!==1||user[0].id!==this.owner)throw new Error('WORKSPACE_OWNER_CORRUPT');
  let after='';for(;;){
   const blobs=(await this.db.query<{path:string;header:Uint8Array;sha256:string;actual_hash:string;mime:string}>("select path,substring(body from 1 for 12) as header,mime,sha256,encode(sha256(body),'hex') as actual_hash from public.local_blobs where path>$1 order by path limit 128",[after])).rows;
   if(!blobs.length)break;
   for(const blob of blobs)if(!safeAssetPath(blob.path,this.owner)||blob.actual_hash!==blob.sha256||!raster(blob.header,blob.mime))throw Error('ASSET_INTEGRITY_FAILED');
   after=blobs[blobs.length-1].path;
  }
  if((await this.db.query("select 1 from storage.objects o full join public.local_blobs b on b.path=o.name where o.id is null or b.path is null or o.bucket_id<>'part-images' limit 1")).rows.length)throw Error('ASSET_INTEGRITY_FAILED');
  const assetQuery="select 1 from public.part_image_assets a where exists(select 1 from unnest(array[a.original_path,a.normalized_high_path,a.normalized_medium_path,a.thumbnail_path]) p where not exists(select 1 from public.local_blobs b where b.path=p)) or not exists(select 1 from public.local_blobs b where b.path=a.normalized_high_path and b.sha256=a.content_hash) limit 1";
  if((await this.db.query(assetQuery)).rows.length)throw Error('ASSET_INTEGRITY_FAILED');
 }
 async actor<T>(operation:(tx:Transaction)=>Promise<T>){return this.db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);await tx.exec('set local role authenticated');return operation(tx);});}
 async rpc(name:string,args:Record<string,unknown>,key:string){
  if(!Object.hasOwn(functions,name)||!uuid(key)||!args||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(functions[name],k)))throw new Error('INVALID_OPERATION');
  const digest=hash(JSON.stringify({name,args}));
  if(name==='record_part_source_snapshot'&&!await salePolicy())throw Error('CATALOG_SOURCES_REQUIRED');
  return this.db.transaction(async tx=>{
   const cached=(await tx.query<{digest:string;result:unknown}>('select digest,result from public.local_operations where key=$1',[key])).rows[0];
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);await tx.exec('set local role authenticated');
   if(cached){if(cached.digest!==digest)throw new Error('IDEMPOTENCY_CONFLICT');if(name==='get_design_aggregate')return projectLocalDesign((await tx.query<any>('select public.get_design_aggregate($1) as data',[args.design_id])).rows[0]?.data??null);if(name==='delete_design'){const row=(await tx.query('select id from public.designs where id=$1 and user_id=auth.uid()',[args.design_id])).rows[0];if(row)throw Error('DELETE_REPLAY_REJECTED');}if(name==='save_part_successor'){const id=(cached.result as any)?.part_id;const row=(await tx.query<any>('select * from public.parts where id=$1',[id])).rows[0];if(!row||row.is_archived)throw Error('PART_NO_LONGER_REGISTERED');await assertSaleSave(tx,{part_id:id,payload:{part:{}}});}if(name==='get_part_aggregate'){const row=(await tx.query<any>('select public.get_part_aggregate($1) as data',[args.part_id])).rows[0]?.data;return row?projectLocalAggregate(row,await salePolicy(),await loadSupplierListingReview(this.owner,this.root)):null;}return cached.result;}
   if(name==='save_design_aggregate')await assertCordSave(tx,args);
   if(name==='save_part_successor'){await assertSaleSave(tx,args);await this.verifyAssets(tx,args.payload);}
   const entries=Object.entries(args);const sql=`select to_jsonb(public.${name}(${entries.map(([k],i)=>`${k}=>$${i+1}::${functions[name][k]}`).join(',')})) as data`;
   const result=name==='delete_design'?await deleteOwnedDesign(tx,this.owner,args.design_id,args.expected_revision):(await tx.query<{data:unknown}>(sql,entries.map(([k,v])=>functions[name][k]==='jsonb'?JSON.stringify(v):v))).rows[0]?.data??null;
   await tx.exec('reset role');await tx.query('insert into public.local_operations values($1,$2,$3::jsonb)',[key,digest,JSON.stringify(result)]);if(name==='get_part_aggregate'&&result)return projectLocalAggregate(result,await salePolicy(),await loadSupplierListingReview(this.owner,this.root));if(name==='get_design_aggregate')return projectLocalDesign(result);return result;
  });
 }
 private async verifyAssets(tx:Transaction,payload:unknown){
  const p=payload as Record<string,Record<string,unknown>>;if(!p||typeof p!=='object')throw new Error('INVALID_PAYLOAD');
  for(const kind of ['image_asset','segment_asset'])if(p[kind]){
   const asset=p[kind];const paths=['original_path','normalized_high_path','normalized_medium_path','thumbnail_path'].map(k=>asset[k]);
   // Blobs are inaccessible to authenticated SQL; temporarily reset role only for integrity reads.
   await tx.exec('reset role');const blobs=(await tx.query<{path:string;body:Uint8Array;sha256:string}>('select path,body,sha256 from public.local_blobs where path=any($1)',[paths])).rows;await tx.exec('set local role authenticated');
   if(blobs.length!==4||blobs.some(b=>hash(b.body)!==b.sha256)||blobs.find(b=>b.path===asset.normalized_high_path)?.sha256!==asset.content_hash)throw new Error('ASSET_INTEGRITY_FAILED');
   const high=await sharp(blobs.find(b=>b.path===asset.normalized_high_path)!.body,{limitInputPixels:16777216}).metadata();
   if(high.width!==asset.pixel_width||high.height!==asset.pixel_height)throw new Error('ASSET_DIMENSIONS_MISMATCH');
  }
 }
 async select(input:{table:string;columns:string;filters?:{column:string;operator:string;value:unknown}[];order?:{column:string;ascending:boolean};single?:boolean}){
  if(!tables.includes(input.table as typeof tables[number]))throw new Error('TABLE_NOT_ALLOWED');
  return this.actor(async tx=>{
   const schema=(await tx.query<{column_name:string}>('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',['public',input.table])).rows.map(r=>r.column_name);
   const column=(v:string)=>{if(!schema.includes(v))throw new Error('COLUMN_NOT_ALLOWED');return `"${v}"`;};
   const cols=input.columns==='*'?'*':input.columns.split(',').map(column).join(',');const values:unknown[]=[];
   const clauses=(input.filters??[]).map(f=>{const c=column(f.column);if(!['eq','in'].includes(f.operator)||f.operator==='in'&&(!Array.isArray(f.value)||f.value.length>50000))throw new Error('INVALID_FILTER');values.push(f.value);return `${c}${f.operator==='in'?`=any($${values.length})`:`=$${values.length}`}`;});
   const rows=(await tx.query<{data:Record<string,unknown>}>(`select row_to_json(selected) as data from (select ${cols} from public.${input.table}${clauses.length?' where '+clauses.join(' and '):''}${input.order?' order by '+column(input.order.column)+(input.order.ascending?' asc':' desc'):''} limit 50000) selected`,values)).rows.map(r=>r.data);
   const policy=input.table==='parts'?await salePolicy():undefined;
   if(input.table==='parts'&&!policy){
    for(const row of (await tx.query<Record<string,unknown>>('select * from public.parts')).rows)assertManualPart(row);
    if((await tx.query('select 1 from public.part_source_snapshots limit 1')).rows.length)throw Error('CATALOG_SOURCES_REQUIRED');
   }
   let projected=input.table==='parts'&&(input.columns.includes('metadata')||input.columns==='*')?rows.map(row=>({...row,selection_reference:projectSaleReference(row,policy??null)})):rows;
   if(input.table==='parts'&&(input.columns.includes('metadata')||input.columns==='*'))projected=await projectListingRows(tx,projected,await loadSupplierListingReview(this.owner,this.root));
   if(input.single){if(projected.length!==1)throw new Error('NOT_FOUND');return projected[0];}return projected;
  });
 }
 async upload(path:string,body:Uint8Array,mime:string){
  if(!safeAssetPath(path,this.owner)||body.length===0||body.length>20*1024*1024||!raster(body,mime))throw new Error('INVALID_IMAGE');
  const image=sharp(body,{limitInputPixels:16777216,failOn:'warning'});const metadata=await image.metadata();if(!metadata.width||!metadata.height||metadata.pages&&metadata.pages>1||!['png','jpeg','webp'].includes(metadata.format??''))throw new Error('INVALID_IMAGE');await image.stats();
  return this.db.transaction(async tx=>{
   const prior=(await tx.query<{sha256:string;mime:string}>('select sha256,mime from public.local_blobs where path=$1',[path])).rows[0];if(prior){if(prior.sha256!==hash(body)||prior.mime!==mime)throw new Error('IMAGE_OVERWRITE_REJECTED');return;}
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);await tx.exec('set local role authenticated');
   await tx.query("insert into storage.objects(bucket_id,name) values('part-images',$1)",[path]);await tx.exec('reset role');
   await tx.query('insert into public.local_blobs values($1,$2,$3,$4)',[path,body,mime,hash(body)]);
  });
 }
 async image(path:string){
  if(!safeAssetPath(path,this.owner))throw new Error('INVALID_PATH');
  const allowed=await this.actor(tx=>tx.query('select id from storage.objects where name=$1 and bucket_id=$2',[path,'part-images']));if(!allowed.rows.length)throw new Error('NOT_FOUND');
  const blob=(await this.db.query<{body:Uint8Array;mime:string;sha256:string}>('select body,mime,sha256 from public.local_blobs where path=$1',[path])).rows[0];if(!blob||hash(blob.body)!==blob.sha256)throw new Error('ASSET_INTEGRITY_FAILED');return blob;
 }
 async remove(paths:string[]){
  if(!Array.isArray(paths)||paths.length>8||paths.some(p=>!safeAssetPath(p,this.owner)))throw new Error('INVALID_PATH');
  return this.db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);await tx.exec('set local role authenticated');const removed=(await tx.query<{name:string}>('delete from storage.objects where name=any($1) returning name',[paths])).rows;await tx.exec('reset role');await tx.query('delete from public.local_blobs where path=any($1)',[removed.map(r=>r.name)]);if(removed.length!==paths.length)throw new Error('CLEANUP_NOT_ALLOWED');});
 }
 async exportPackage():Promise<WorkspacePackage>{return this.db.transaction(tx=>this.portable(tx));}
 async exportBackupSet(signal?:AbortSignal){return createBackupSet(this.db,this.owner,this.root,signal);}
 async backupDownload(id:string){return openBackupSet(this.root,this.owner,id);}
 async importBackupSet(file:string){return importBackupSet(this.db,this.owner,file,(tx,payload)=>this.verifyAssets(tx,payload),tx=>this.assertPortableSources(tx),this.root);}
 private async assertPortableSources(tx:Transaction){
  if(await salePolicy())return;
  for(const row of (await tx.query<Record<string,unknown>>('select * from public.parts')).rows)assertManualPart(row);
  if((await tx.query('select 1 from public.part_source_snapshots limit 1')).rows.length||(await tx.query("select 1 from public.designs where editor_config->'cordSpecification' is not null and editor_config->'cordSpecification'<>'null'::jsonb limit 1")).rows.length)throw Error('CATALOG_SOURCES_REQUIRED');
 }
 private async portable(tx:Transaction):Promise<WorkspacePackage>{
  const size=(await tx.query<{size:string}>('select coalesce(sum(octet_length(body)),0)::text as size from public.local_blobs')).rows[0];if(Number(size.size)>90*1024*1024)throw new Error('EXPORT_TOO_LARGE');
  const data:Record<string,Record<string,unknown>[]>={};
  for(const table of portableTables)data[table]=(await tx.query<{data:Record<string,unknown>}>(`select row_to_json(t) as data from public.${table} t order by ${table==='part_user_state'?'part_id':'id'}`)).rows.map(r=>r.data);
  const objects=(await tx.query<{data:Record<string,unknown>}>('select row_to_json(t) as data from storage.objects t order by id')).rows.map(r=>r.data);
  const blobs=(await tx.query<{path:string;body:Uint8Array;mime:string;sha256:string}>('select * from public.local_blobs order by path')).rows.map(b=>{if(hash(b.body)!==b.sha256)throw new Error('ASSET_INTEGRITY_FAILED');return{...b,body:Buffer.from(b.body).toString('base64'),length:b.body.length};});
  const schema=(await tx.query<{migration_hash:string}>('select migration_hash from public.local_schema')).rows[0];
  const payload:PortablePayload={version:1,owner:this.owner,migrationHash:schema.migration_hash,tables:data,objects,blobs,migration:{status:'not_migrated',sourceWorkspaceId:this.owner,ids:Object.fromEntries(portableTables.map(table=>[table,data[table].map(row=>({sourceId:String(row.id??row.part_id),targetId:null}))]))}};
  const serialized=JSON.stringify(payload);if(Buffer.byteLength(serialized)>128*1024*1024)throw new Error('EXPORT_TOO_LARGE');return{payload,sha256:hash(serialized)};
 }
 async importPackage(packageData:WorkspacePackage){
  const p=packageData?.payload;
  if(!p||p.version!==1||p.owner!==this.owner||hash(JSON.stringify(p))!==packageData.sha256||Object.keys(p.tables??{}).sort().join()!==[...portableTables].sort().join())throw new Error('INVALID_BACKUP');
  if(Buffer.byteLength(JSON.stringify(p))>128*1024*1024)throw new Error('BACKUP_TOO_LARGE');
  return this.db.transaction(async tx=>{
   const current=await this.portable(tx);if(current.sha256===packageData.sha256)return{restored:false,unchanged:true};
   if(current.payload.migrationHash!==p.migrationHash)throw new Error('WORKSPACE_SCHEMA_MISMATCH');
   if(Object.values(current.payload.tables).some(rows=>rows.length)||current.payload.objects.length||current.payload.blobs.length)throw new Error('WORKSPACE_NOT_EMPTY');
   for(const table of portableTables){if(!Array.isArray(p.tables[table])||p.tables[table].length>50000)throw new Error('INVALID_BACKUP');
    for(const row of p.tables[table])if('user_id' in row&&row.user_id!==this.owner||!uuid(table==='part_user_state'?row.part_id:row.id))throw new Error('BACKUP_OWNERSHIP_INVALID');
   }
   for(const part of p.tables.parts){const asset=p.tables.part_image_assets.find(a=>a.id===part.image_asset_id);if(!asset||asset.asset_kind!=='part_main')throw new Error('BACKUP_PART_ASSET_INVALID');
    const spec=p.tables.part_path_specs.find(s=>s.part_id===part.id);if(part.geometry_kind==='path'&&!spec||part.geometry_kind==='node'&&spec)throw new Error('PATH_SPEC_REQUIRED');
   }
   const paths=new Set<string>();for(const blob of p.blobs){const bytes=Buffer.from(blob.body,'base64');if(bytes.toString('base64')!==blob.body||paths.has(blob.path)||!safeAssetPath(blob.path,this.owner)||bytes.length!==blob.length||hash(bytes)!==blob.sha256||bytes.length>20*1024*1024||!raster(bytes,blob.mime))throw new Error('INVALID_BACKUP_IMAGE');paths.add(blob.path);const image=sharp(bytes,{limitInputPixels:16777216,failOn:'warning'});await image.stats();await tx.query('insert into public.local_blobs values($1,$2,$3,$4)',[blob.path,bytes,blob.mime,blob.sha256]);}
   const insert=async(table:string,rows:Record<string,unknown>[])=>{if(rows.length)await tx.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(rows)]);};
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);
   await insert('public.asset_uploads',p.tables.asset_uploads.map(row=>p.tables.part_image_assets.some(asset=>asset.id===row.id)?{...row,state:'pending'}:row));
   for(const object of p.objects)if(object.bucket_id!=='part-images'||!paths.has(String(object.name)))throw new Error('BACKUP_OBJECT_INVALID');
   if(p.objects.length!==paths.size)throw new Error('BACKUP_IMAGE_INCOMPLETE');await insert('storage.objects',p.objects);
   // Revalidate historical assets through the normal reservation->committed trigger.
   await insert('public.part_image_assets',p.tables.part_image_assets);
   const remaining=[...p.tables.parts],inserted=new Set<string>();while(remaining.length){const index=remaining.findIndex(row=>row.supersedes_part_id===null||inserted.has(String(row.supersedes_part_id)));if(index<0)throw new Error('BACKUP_SUCCESSOR_CYCLE');const [row]=remaining.splice(index,1);await insert('public.parts',[row]);inserted.add(String(row.id));}
   for(const table of portableTables.slice(3))await insert('public.'+table,p.tables[table]);
   await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[this.owner]);
   for(const asset of p.tables.part_image_assets){const reservation=p.tables.asset_uploads.find(row=>row.id===asset.id);const paths=[asset.original_path,asset.normalized_high_path,asset.normalized_medium_path,asset.thumbnail_path];if(!reservation||reservation.state!=='committed'||JSON.stringify(reservation.paths)!==JSON.stringify(paths))throw new Error('BACKUP_RESERVATION_INVALID');await this.verifyAssets(tx,{image_asset:asset});await tx.exec('reset role');}
   await this.assertPortableSources(tx);
   for(const design of p.tables.designs){const snapshot=(await tx.query<{data:unknown}>('select public.get_design_aggregate($1) as data',[design.id])).rows[0].data;await tx.query('select public._validate_design_snapshot($1::jsonb)',[JSON.stringify(snapshot)]);}
   const restored=await this.portable(tx);if(restored.sha256!==packageData.sha256)throw new Error('BACKUP_ROUNDTRIP_MISMATCH');return{restored:true,unchanged:false};
  });
 }
}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
function safeAssetPath(path:unknown,owner:string):path is string{return typeof path==='string'&&new RegExp(`^users/${owner}/parts/[0-9a-f-]{36}/(original|high\\.png|medium\\.png|thumbnail\\.png)$`).test(path);}
function raster(b:Uint8Array,mime:string){const buf=Buffer.from(b);return mime==='image/png'&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||mime==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255||mime==='image/webp'&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP';}
async function migrationSources(){const dir=join(process.cwd(),'supabase','migrations');return Promise.all((await readdir(dir)).filter(f=>/^\d+_[a-z_]+\.sql$/.test(f)).sort().map(async name=>({name,body:await readFile(join(dir,name),'utf8')})));}
const global=globalThis as typeof globalThis&{localWorkspace?:Promise<LocalWorkspace>};
// Keep the one open DB/lock during Next dev reloads while refreshing its methods.
export function workspace(){const testId=process.env.ACC_LOCAL_WORKSPACE_TEST_ID;if(testId&&!uuid(testId))throw new Error('INVALID_TEST_WORKSPACE');const root=testId?join(/* turbopackIgnore: true */ process.cwd(),'.local','test-workspaces',testId):undefined;const current=global.localWorkspace??(global.localWorkspace=LocalWorkspace.open(root).catch(e=>{global.localWorkspace=undefined;throw e;}));return current.then(instance=>{if(Object.getPrototypeOf(instance)!==LocalWorkspace.prototype)Object.setPrototypeOf(instance,LocalWorkspace.prototype);return instance;});}

function projectLocalAggregate(data:any,policy:Awaited<ReturnType<typeof salePolicy>>,listing:ListingIndex){
 if(!policy&&data.source_snapshots?.length)throw Error('CATALOG_SOURCES_REQUIRED');
 const reference=projectSaleReference(data.part,policy);
 return {...data,selection_reference:reference,supplier_listing_review:projectListingAggregate(data,listing,reference?.offerDraftId),hole_reference:projectHoleReference(data.part,policy?.holeReferences??new Map())};
}

async function projectLocalDesign(data:any){if(data?.design?.editor_config?.cordSpecification!=null&&!await salePolicy())throw Error('CATALOG_SOURCES_REQUIRED');return data;}
