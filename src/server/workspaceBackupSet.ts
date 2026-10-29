import type {PGlite,Transaction} from '@electric-sql/pglite';
import {mkdir,open,lstat,realpath,rename,unlink,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {backupTables,backupLimits,backupExcluded,backupHash,backupUuid,backupPath,backupCounts,backupLine,chainBackup,consumeBackup,readBackupHeader,type BackupHeader,type BackupChunk} from './workspaceBackupFormat';

type Row=Record<string,unknown>;
const tableSql=(table:string)=>table==='storage.objects'?'storage.objects':'public.'+table;
const keyColumn=(table:string)=>table==='part_user_state'?'part_id':'id';
async function eachRows(tx:Transaction,table:string,visit:(rows:Row[])=>Promise<void>){
 let after='';const key=keyColumn(table);
 for(;;){const rows=(await tx.query<{data:Row}>(`select row_to_json(t) as data from ${tableSql(table)} t ${after?`where ${key}>$1::uuid`:''} order by ${key} limit 256`,after?[after]:[])).rows.map(r=>r.data);if(!rows.length)break;await visit(rows);after=String(rows.at(-1)![key]);}
}
async function exportRoot(root:string){
 if((await lstat(root)).isSymbolicLink())throw Error('BACKUP_ROOT_LINK');const dir=join(resolve(root),'exports');await mkdir(dir,{recursive:true});
 const actual=await realpath(dir),expected=resolve(dir),same=process.platform==='win32'?actual.toLowerCase()===expected.toLowerCase():actual===expected;
 if((await lstat(dir)).isSymbolicLink()||!same)throw Error('BACKUP_ROOT_LINK');return dir;
}
export async function createBackupSet(db:PGlite,owner:string,root:string,signal?:AbortSignal){
 signal?.throwIfAborted();
 const dir=await exportRoot(root),id=randomUUID(),temp=join(dir,id+'.'+process.pid+'.tmp'),file=await open(temp,'wx');let bytes=0,closed=false;
 try{
  const write=async(line:string)=>{signal?.throwIfAborted();await file.writeFile(line);bytes+=Buffer.byteLength(line);};
  await db.transaction(async tx=>{
   const schema=(await tx.query<{migration_hash:string}>('select migration_hash from public.local_schema')).rows[0];
   const header:BackupHeader={format:'acc-workspace-backup-set',version:2,exportSetId:id,owner,migrationHash:schema.migration_hash,tables:backupTables,createdAt:new Date().toISOString(),scope:'full-domain-workspace',migrationStatus:'not_migrated',excluded:backupExcluded,limits:backupLimits};
   const headerHash=backupHash(JSON.stringify(header));let chain=headerHash,sequence=0,blobBytes=0n;const counts=backupCounts();await write(backupLine('header',header));
   const emit=async(payload:BackupChunk)=>{const line=backupLine('chunk',payload,sequence);await write(line);chain=chainBackup(chain,sequence++,backupHash(JSON.stringify(payload)));};
   const emitRows=async(table:string,rows:Row[]):Promise<void>=>{try{backupLine('chunk',{type:'rows',table,rows},sequence);}catch(e){if(rows.length===1)throw e;const mid=Math.floor(rows.length/2);await emitRows(table,rows.slice(0,mid));await emitRows(table,rows.slice(mid));return;}await emit({type:'rows',table,rows});counts[table]+=rows.length;};
   for(const table of [...backupTables,'storage.objects'])await eachRows(tx,table,rows=>emitRows(table,rows));
   let after='';for(;;){const b=(await tx.query<{path:string;body:Uint8Array;mime:string;sha256:string}>('select * from public.local_blobs where path>$1 order by path limit 1',[after])).rows[0];if(!b)break;
    if(!backupPath(b.path,owner)||b.body.length>backupLimits.maxBlobBytes||backupHash(b.body)!==b.sha256)throw Error('ASSET_INTEGRITY_FAILED');
    await emit({type:'blob',path:b.path,mime:b.mime,sha256:b.sha256,length:b.body.length,body:Buffer.from(b.body).toString('base64')});counts.local_blobs++;blobBytes+=BigInt(b.body.length);after=b.path;
   }
   await write(backupLine('footer',{exportSetId:id,headerSha256:headerHash,chunkCount:sequence,chainSha256:chain,counts,blobBytes:blobBytes.toString(),complete:true}));
  });
  signal?.throwIfAborted();await file.sync();await file.close();closed=true;signal?.throwIfAborted();await rename(temp,join(dir,id+'.accbackup.ndjson'));return{id,bytes};
 }catch(e){if(!closed)await file.close();await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});throw e;}
}
export async function cleanupAbandonedBackupSets(root:string,owner:string){
 try{await lstat(join(root,'exports'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return 0;throw e;}
 const dir=await exportRoot(root);let removed=0;
 for(const name of await readdir(dir)){
  const match=/^([a-f0-9-]{36})\.([1-9]\d*)\.tmp$/.exec(name);if(!match||!backupUuid(match[1])||!Number.isSafeInteger(Number(match[2])))continue;
  try{process.kill(Number(match[2]),0);continue;}catch(e){if((e as NodeJS.ErrnoException).code!=='ESRCH')continue;}
  const path=join(dir,name),info=await lstat(path);if(!info.isFile()||info.isSymbolicLink())continue;
  // Unknown/truncated headers remain untouched. Only a matching dead worker's private artifact is ours.
  let header;try{header=await readBackupHeader(path);}catch{continue;}
  if(header.owner!==owner||header.exportSetId!==match[1])continue;await unlink(path);removed++;
 }
 return removed;
}
export async function openBackupSet(root:string,owner:string,id:string){
 if(!backupUuid(id))throw Error('BACKUP_ID_INVALID');const path=join(await exportRoot(root),id+'.accbackup.ndjson');if(!(await lstat(path)).isFile()||(await lstat(path)).isSymbolicLink())throw Error('BACKUP_FILE_INVALID');
 const header=await readBackupHeader(path);if(header.owner!==owner||header.exportSetId!==id)throw Error('BACKUP_IDENTITY_INVALID');const file=await open(path,'r');return{file,size:(await file.stat()).size};
}
export async function importBackupSet(db:PGlite,owner:string,file:string,verifyAssets:(tx:Transaction,payload:unknown)=>Promise<void>,validateImported?:(tx:Transaction)=>Promise<void>){
 return db.transaction(async tx=>{
  for(const table of [...backupTables,'storage.objects','public.local_blobs']){const sql=table==='public.local_blobs'?table:tableSql(table);if((await tx.query(`select 1 from ${sql} limit 1`)).rows.length)throw Error('WORKSPACE_NOT_EMPTY');}
  const schema=(await tx.query<{migration_hash:string}>('select migration_hash from public.local_schema')).rows[0];
  await tx.exec('create temporary table acc_backup_rows(table_name text,key text,body jsonb,sha256 text,done boolean not null default false,primary key(table_name,key)) on commit drop');
  const columns=new Map<string,string[]>();for(const table of [...backupTables,'storage.objects']){const [schema,name]=tableSql(table).split('.');columns.set(table,(await tx.query<{column_name:string}>('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',[schema,name])).rows.map(r=>r.column_name).sort());}
  const consumed=await consumeBackup(file,{
   header:async h=>{if(h.owner!==owner||h.migrationHash!==schema.migration_hash)throw Error('WORKSPACE_SCHEMA_MISMATCH');},
   chunk:async c=>{
    if(c.type==='rows'){
     for(const row of c.rows)if(JSON.stringify(Object.keys(row).sort())!==JSON.stringify(columns.get(c.table)))throw Error('BACKUP_COLUMNS_INVALID');
     const values=c.rows.map(row=>({table_name:c.table,key:String(row[keyColumn(c.table)]),body:row,sha256:backupHash(JSON.stringify(row))}));
     await tx.query('insert into acc_backup_rows(table_name,key,body,sha256) select table_name,key,body,sha256 from jsonb_to_recordset($1::jsonb) as x(table_name text,key text,body jsonb,sha256 text)',[JSON.stringify(values)]);
    }else{
     const bytes=Buffer.from(c.body,'base64'),metadata=await sharp(bytes,{limitInputPixels:16777216,failOn:'warning'}).metadata();
     if(!['image/png','image/jpeg','image/webp'].includes(c.mime)||({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'} as Record<string,string>)[metadata.format??'']!==c.mime||!metadata.width||!metadata.height||metadata.pages&&metadata.pages>1)throw Error('INVALID_BACKUP_IMAGE');await sharp(bytes,{limitInputPixels:16777216,failOn:'warning'}).stats();
     await tx.query('insert into public.local_blobs values($1,$2,$3,$4)',[c.path,bytes,c.mime,c.sha256]);
    }
   }
  });
  const insert=async(table:string,rows:Row[])=>{if(rows.length)await tx.query(`insert into ${tableSql(table)} select * from jsonb_populate_recordset(null::${tableSql(table)},$1::jsonb)`,[JSON.stringify(rows)]);};
  const staged=async(table:string,visit:(rows:Row[])=>Promise<void>)=>{let after='';for(;;){const r=(await tx.query<{key:string;body:Row}>('select key,body from acc_backup_rows where table_name=$1 and key>$2 order by key limit 256',[table,after])).rows;if(!r.length)break;await visit(r.map(x=>x.body));after=r.at(-1)!.key;}};
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
  await staged('asset_uploads',async rows=>{const assets=(await tx.query<{key:string}>("select key from acc_backup_rows where table_name='part_image_assets' and key=any($1)",[rows.map(r=>String(r.id))])).rows;const ids=new Set(assets.map(a=>a.key));await insert('asset_uploads',rows.map(r=>ids.has(String(r.id))?{...r,state:'pending'}:r));});
  await staged('storage.objects',async rows=>{for(const r of rows)if(r.bucket_id!=='part-images'||!backupPath(r.name,owner))throw Error('BACKUP_OBJECT_INVALID');await insert('storage.objects',rows);});
  await staged('part_image_assets',rows=>insert('part_image_assets',rows));
  for(;;){const ready=(await tx.query<{key:string;body:Row}>("select key,body from acc_backup_rows b where table_name='parts' and not done and (body->>'supersedes_part_id' is null or exists(select 1 from public.parts p where p.id::text=b.body->>'supersedes_part_id')) order by key limit 256")).rows;if(!ready.length)break;await insert('parts',ready.map(r=>r.body));await tx.query("update acc_backup_rows set done=true where table_name='parts' and key=any($1)",[ready.map(r=>r.key)]);}
  if((await tx.query("select 1 from acc_backup_rows where table_name='parts' and not done limit 1")).rows.length)throw Error('BACKUP_SUCCESSOR_CYCLE');
  for(const table of backupTables.slice(3))await staged(table,rows=>insert(table,rows));
  if((await tx.query("select 1 from storage.objects o full join public.local_blobs b on b.path=o.name where o.id is null or b.path is null or o.bucket_id<>'part-images' limit 1")).rows.length)throw Error('BACKUP_IMAGE_INCOMPLETE');
  if((await tx.query("select 1 from storage.objects o left join public.asset_uploads u on u.id=split_part(o.name,'/',4)::uuid where u.id is null or u.user_id<>$1::uuid or not(o.name=any(u.paths)) limit 1",[owner])).rows.length)throw Error('BACKUP_RESERVATION_CLOSURE');
  if((await tx.query("select 1 from public.asset_uploads u where u.paths<>array['users/'||u.user_id||'/parts/'||u.id||'/original','users/'||u.user_id||'/parts/'||u.id||'/high.png','users/'||u.user_id||'/parts/'||u.id||'/medium.png','users/'||u.user_id||'/parts/'||u.id||'/thumbnail.png'] or (u.state='committed')<>exists(select 1 from public.part_image_assets a where a.id=u.id) or (u.state='cleaned' and exists(select 1 from storage.objects o where o.name=any(u.paths))) limit 1")).rows.length)throw Error('BACKUP_RESERVATION_STATE');
  if((await tx.query("select 1 from public.parts p join public.part_image_assets a on a.id=p.image_asset_id left join public.part_path_specs s on s.part_id=p.id where a.asset_kind<>'part_main' or (p.geometry_kind='path')<>(s.part_id is not null) limit 1")).rows.length)throw Error('BACKUP_PART_ASSET_INVALID');
  if((await tx.query("select 1 from public.part_path_specs s join public.part_image_assets a on a.id=s.segment_asset_id where a.asset_kind<>'path_segment' limit 1")).rows.length)throw Error('BACKUP_SEGMENT_ASSET_INVALID');
  await eachRows(tx,'part_image_assets',async rows=>{for(const asset of rows){const reservation=(await tx.query<{state:string;paths:string[]}>('select state,paths from public.asset_uploads where id=$1',[asset.id])).rows[0];if(!reservation||reservation.state!=='committed'||JSON.stringify(reservation.paths)!==JSON.stringify([asset.original_path,asset.normalized_high_path,asset.normalized_medium_path,asset.thumbnail_path]))throw Error('BACKUP_RESERVATION_INVALID');await verifyAssets(tx,{image_asset:asset});await tx.exec('reset role');}});
  await eachRows(tx,'designs',async rows=>{for(const design of rows){const snapshot=(await tx.query<{data:unknown}>('select public.get_design_aggregate($1) as data',[design.id])).rows[0].data;await tx.query('select public._validate_design_snapshot($1::jsonb)',[JSON.stringify(snapshot)]);}});
  for(const table of [...backupTables,'storage.objects']){
   let count=0;await eachRows(tx,table,async rows=>{const expected=(await tx.query<{key:string;sha256:string}>('select key,sha256 from acc_backup_rows where table_name=$1 and key=any($2)',[table,rows.map(r=>String(r[keyColumn(table)]))])).rows;const hashes=new Map(expected.map(r=>[r.key,r.sha256]));for(const row of rows)if(hashes.get(String(row[keyColumn(table)]))!==backupHash(JSON.stringify(row)))throw Error('BACKUP_ROUNDTRIP_MISMATCH');count+=rows.length;});if(count!==consumed.footer.counts[table])throw Error('BACKUP_ROUNDTRIP_MISMATCH');
  }
  await validateImported?.(tx);
  return {restored:true,exportSetId:consumed.header.exportSetId,counts:consumed.footer.counts};
 });
}
