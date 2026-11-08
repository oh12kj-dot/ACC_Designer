import{decodeReviewChunk,type ReviewFileChunk}from'./supplierReviewArchive';
import{reviewLimits}from'./supplierReviewFiles';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
export const backupTables=['asset_uploads','part_image_assets','parts','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs','design_nodes','design_paths','design_point_attachments','design_through_attachments','design_path_attachments','design_mirror_links'] as const;
export const backupLimits={maxLineBytes:33554432,maxBlobBytes:20971520,maxRowsPerChunk:256};
export const backupExcluded=['.local/catalog','.local/parts','.local/calibration','credentials/sessions/locks/idempotency'] as const;
export const backupHash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
export const backupUuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v);
export const backupPath=(v:unknown,owner:string):v is string=>typeof v==='string'&&v.startsWith('users/'+owner+'/parts/')&&new RegExp('^users/'+owner+'/parts/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/(original|high\\.png|medium\\.png|thumbnail\\.png)$').test(v);
export type BackupHeader={format:'acc-workspace-backup-set';version:2|3;exportSetId:string;owner:string;migrationHash:string;tables:readonly string[];createdAt:string;scope:'full-domain-workspace';migrationStatus:'not_migrated';excluded:readonly string[];limits:typeof backupLimits};
export type BackupChunk={type:'rows';table:string;rows:Record<string,unknown>[]} | {type:'blob';path:string;mime:string;sha256:string;length:number;body:string} | ReviewFileChunk;
export type BackupFooter={exportSetId:string;headerSha256:string;chunkCount:number;chainSha256:string;counts:Record<string,number>;blobBytes:string;reviewBytes?:string;complete:true};
export const backupCounts=(version=2)=>Object.fromEntries([...backupTables,'storage.objects','local_blobs',...(version===3?['review_files']:[])].map(t=>[t,0]));
export const chainBackup=(chain:string,sequence:number,digest:string)=>backupHash(chain+'\n'+sequence+'\n'+digest);
export const backupLine=(kind:string,payload:unknown,sequence?:number)=>{const line=JSON.stringify({kind,...(sequence===undefined?{}:{sequence}),payload,sha256:backupHash(JSON.stringify(payload))})+'\n';if(Buffer.byteLength(line)>backupLimits.maxLineBytes)throw Error('BACKUP_LINE_TOO_LARGE');return line;};

async function* lines(file:string){
 let fragments:Buffer[]=[],size=0;
 for await(const raw of createReadStream(file,{highWaterMark:65536})){
  const chunk=Buffer.from(raw);let start=0,end;
  while((end=chunk.indexOf(10,start))>=0){const part=chunk.subarray(start,end);size+=part.length;if(size+1>backupLimits.maxLineBytes)throw Error('BACKUP_LINE_TOO_LARGE');fragments.push(part);yield new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(fragments,size));fragments=[];size=0;start=end+1;}
  if(start<chunk.length){const part=chunk.subarray(start);size+=part.length;if(size+1>backupLimits.maxLineBytes)throw Error('BACKUP_LINE_TOO_LARGE');fragments.push(part);}
 }
 if(size)throw Error('BACKUP_TRUNCATED_LINE');
}
function finiteJson(value:unknown,depth=0):void{if(depth>64)throw Error('BACKUP_JSON_DEPTH');if(typeof value==='number'&&!Number.isFinite(value))throw Error('BACKUP_NUMBER_INVALID');if(value&&typeof value==='object')for(const v of Object.values(value))finiteJson(v,depth+1);}
const exactKeys=(value:unknown,keys:string[])=>!!value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());
export function validateBackupHeader(h:BackupHeader){
 if(!exactKeys(h,['format','version','exportSetId','owner','migrationHash','tables','createdAt','scope','migrationStatus','excluded','limits'])||h.format!=='acc-workspace-backup-set'||![2,3].includes(h.version)||!backupUuid(h.owner)||!backupUuid(h.exportSetId)||!/^[a-f0-9]{64}$/.test(h.migrationHash)||h.scope!=='full-domain-workspace'||h.migrationStatus!=='not_migrated'||JSON.stringify(h.tables)!==JSON.stringify(backupTables)||JSON.stringify(h.excluded)!==JSON.stringify(backupExcluded)||JSON.stringify(h.limits)!==JSON.stringify(backupLimits)||!Number.isFinite(Date.parse(h.createdAt))||new Date(h.createdAt).toISOString()!==h.createdAt)throw Error('BACKUP_HEADER_INVALID');
}
export async function readBackupHeader(file:string){for await(const line of lines(file)){const r=JSON.parse(line);if(r.kind!=='header'||r.sha256!==backupHash(JSON.stringify(r.payload)))throw Error('BACKUP_HEADER_INVALID');validateBackupHeader(r.payload);return r.payload as BackupHeader;}throw Error('BACKUP_HEADER_MISSING');}
export async function consumeBackup(file:string,handlers:{header:(h:BackupHeader)=>Promise<void>;chunk:(c:BackupChunk)=>Promise<void>}){
 let header:BackupHeader|undefined,headerHash='',chain='',sequence=0,footer:BackupFooter|undefined,phase=0,lastKey='',blobBytes=0n,reviewBytes=0n;let reviewCount=0;let counts=backupCounts();const order=[...backupTables,'storage.objects','local_blobs','review_files'];
 for await(const line of lines(file)){
  if(footer)throw Error('BACKUP_TRAILING_DATA');if(!line)throw Error('BACKUP_EMPTY_LINE');const r=JSON.parse(line);finiteJson(r);if(JSON.stringify(r)!==line)throw Error('BACKUP_ENCODING_INVALID');if(!exactKeys(r,r.kind==='chunk'?['kind','sequence','payload','sha256']:['kind','payload','sha256']))throw Error('BACKUP_RECORD_INVALID');
  if(r.sha256!==backupHash(JSON.stringify(r.payload)))throw Error('BACKUP_RECORD_HASH');
  if(!header){if(r.kind!=='header')throw Error('BACKUP_HEADER_MISSING');validateBackupHeader(r.payload);header=r.payload;headerHash=chain=r.sha256;counts=backupCounts(header!.version);await handlers.header(header!);continue;}
  if(r.kind==='footer'){
   const p=r.payload as BackupFooter;
   if(!exactKeys(p,['exportSetId','headerSha256','chunkCount','chainSha256','counts','blobBytes','complete',...(header.version===3?['reviewBytes']:[])])||p.exportSetId!==header.exportSetId||p.headerSha256!==headerHash||p.chunkCount!==sequence||p.chainSha256!==chain||JSON.stringify(p.counts)!==JSON.stringify(counts)||p.blobBytes!==blobBytes.toString()||p.complete!==true||header.version===3&&(p.reviewBytes!==reviewBytes.toString()||reviewCount===0))throw Error('BACKUP_FOOTER_INVALID');footer=p;continue;
  }
  if(r.kind!=='chunk'||r.sequence!==sequence)throw Error('BACKUP_SEQUENCE_INVALID');const c=r.payload as BackupChunk;
  const table=c.type==='review-file'&&header.version===3?'review_files':c.type==='blob'?'local_blobs':c.type==='rows'?c.table:'';const next=order.indexOf(table as typeof order[number]);if(next<phase||next<0)throw Error('BACKUP_TABLE_ORDER');if(next>phase){phase=next;lastKey='';}
  if(c.type==='rows'){
   if(!exactKeys(c,['type','table','rows'])||!Array.isArray(c.rows)||!c.rows.length||c.rows.length>backupLimits.maxRowsPerChunk)throw Error('BACKUP_ROWS_INVALID');
   for(const row of c.rows){if(!row||typeof row!=='object'||Array.isArray(row))throw Error('BACKUP_ROW_INVALID');const key=row[table==='part_user_state'?'part_id':'id'];if(!backupUuid(key)||key<=lastKey||'user_id'in row&&row.user_id!==header.owner)throw Error('BACKUP_ROW_IDENTITY');lastKey=key;counts[table]++;if(!Number.isSafeInteger(counts[table]))throw Error('BACKUP_COUNT_INVALID');}
  }else if(c.type==='review-file'){
   if(!exactKeys(c,['type','path','encoding','sha256','length','body','decodedLength','decodedSha256'])||c.path<=lastKey)throw Error('BACKUP_REVIEW_ORDER');decodeReviewChunk(c);reviewCount++;reviewBytes+=BigInt(c.decodedLength);if(reviewCount>reviewLimits.maxFiles||reviewBytes>BigInt(reviewLimits.maxTotalBytes))throw Error('BACKUP_REVIEW_LIMIT');counts.review_files++;lastKey=c.path;
  }else{
   if(!exactKeys(c,['type','path','mime','sha256','length','body'])||!['image/png','image/jpeg','image/webp'].includes(c.mime)||!backupPath(c.path,header.owner)||c.path<=lastKey||!Number.isSafeInteger(c.length)||c.length<=0||c.length>backupLimits.maxBlobBytes||typeof c.body!=='string'||!/^[a-f0-9]{64}$/.test(c.sha256))throw Error('BACKUP_BLOB_INVALID');
   const bytes=Buffer.from(c.body,'base64');if(bytes.length!==c.length||bytes.toString('base64')!==c.body||backupHash(bytes)!==c.sha256)throw Error('BACKUP_BLOB_HASH');lastKey=c.path;counts.local_blobs++;blobBytes+=BigInt(c.length);
  }
  await handlers.chunk(c);chain=chainBackup(chain,sequence++,r.sha256);
 }
 if(!header||!footer)throw Error('BACKUP_INCOMPLETE');return {header,footer};
}
