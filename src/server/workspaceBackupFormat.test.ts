import {it,expect} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {backupTables,backupLimits,backupExcluded,backupCounts,backupHash,backupLine,chainBackup,consumeBackup} from './workspaceBackupFormat';
const owner=randomUUID(),id=randomUUID(),header={format:'acc-workspace-backup-set',version:2,exportSetId:id,owner,migrationHash:'a'.repeat(64),tables:backupTables,createdAt:'2026-10-16T00:00:00.000Z',scope:'full-domain-workspace',migrationStatus:'not_migrated',excluded:backupExcluded,limits:backupLimits};
const blob={type:'blob',path:`users/${owner}/parts/${randomUUID()}/original`,mime:'image/png',sha256:backupHash('f'),length:1,body:Buffer.from('f').toString('base64')};
function file(chunks:any[]=[],h:any=header,change:any={}){let chain=backupHash(JSON.stringify(h)),sequence=0,blobBytes=0n,reviewBytes=0n;const counts=backupCounts(h.version),lines=[backupLine('header',h)];for(const c of chunks){lines.push(backupLine('chunk',c,sequence));chain=chainBackup(chain,sequence++,backupHash(JSON.stringify(c)));if(c.type==='rows')counts[c.table]=(counts[c.table]??0)+c.rows.length;else if(c.type==='review-file'){counts.review_files++;reviewBytes+=BigInt(c.decodedLength);}else{counts.local_blobs++;blobBytes+=BigInt(c.length);}}lines.push(backupLine('footer',{exportSetId:id,headerSha256:backupHash(JSON.stringify(h)),chunkCount:sequence,chainSha256:chain,counts,blobBytes:blobBytes.toString(),...(h.version===3?{reviewBytes:reviewBytes.toString()}:{}),complete:true,...change}));return lines.join('');}
async function check(content:string|Buffer){const root=await mkdtemp(join(tmpdir(),'acc-backup-format-'));try{const path=join(root,'fixture.ndjson');await writeFile(path,content);return await consumeBackup(path,{header:async()=>{},chunk:async()=>{}});}finally{if(root.startsWith(join(tmpdir(),'acc-backup-format-')))await rm(root,{recursive:true,force:true});}}
it('accepts an empty complete set and validates an ordered chunk chain',async()=>{expect((await check(file())).footer.chunkCount).toBe(0);expect((await check(file([blob]))).footer.counts.local_blobs).toBe(1);});
it('rejects unsupported header limits, tables, owners and undeclared schema fields',async()=>{for(const h of [{...header,version:4},{...header,owner:'other'},{...header,tables:[...backupTables].reverse()},{...header,limits:{...backupLimits,maxBlobBytes:999999999}},{...header,sql:'select 1'}])await expect(check(file([],h))).rejects.toThrow();});
it('rejects noncanonical base64, wrong length, unsafe path, unknown MIME and blob hash',async()=>{for(const b of [{...blob,body:'Zg'},{...blob,length:2},{...blob,path:'../outside'},{...blob,mime:'text/html'},{...blob,sha256:'0'.repeat(64)}])await expect(check(file([b]))).rejects.toThrow();});
it('rejects duplicate, foreign-owner, reversed and unknown row groups',async()=>{const a={id:'00000000-0000-4000-8000-000000000001',user_id:owner},b={...a,id:'00000000-0000-4000-8000-000000000002'};for(const c of [{type:'rows',table:'parts',rows:[a,a]},{type:'rows',table:'parts',rows:[b,a]},{type:'rows',table:'parts',rows:[{...a,user_id:randomUUID()}]},{type:'rows',table:'arbitrary_sql',rows:[a]}])await expect(check(file([c]))).rejects.toThrow();});
it('rejects oversized lines, invalid UTF8, missing LF, CRLF and altered footer accounting',async()=>{
 await expect(check(Buffer.alloc(backupLimits.maxLineBytes+1,32))).rejects.toThrow('BACKUP_LINE_TOO_LARGE');await expect(check(Buffer.from([255,10]))).rejects.toThrow();await expect(check(file().trimEnd())).rejects.toThrow('BACKUP_TRUNCATED_LINE');await expect(check(file().replaceAll('\n','\r\n'))).rejects.toThrow('BACKUP_ENCODING_INVALID');for(const change of [{complete:false},{blobBytes:'99'},{chunkCount:1},{chainSha256:'b'.repeat(64)}])await expect(check(file([],header,change))).rejects.toThrow('BACKUP_FOOTER_INVALID');
});

const reviewChunk=(path='manifest.json',text='{}')=>{const bytes=Buffer.from(text),packed=gzipSync(bytes);return{type:'review-file',path,encoding:'gzip',sha256:backupHash(packed),length:packed.length,body:packed.toString('base64'),decodedLength:bytes.length,decodedSha256:backupHash(bytes)};};
it('accepts bounded v3 review files only after blobs and accounts for decoded bytes',async()=>{
 const h={...header,version:3},c=reviewChunk();const result=await check(file([blob,c],h));expect(result.footer.counts.review_files).toBe(1);expect(result.footer.reviewBytes).toBe('2');
 await expect(check(file([c]))).rejects.toThrow();await expect(check(file([],h))).rejects.toThrow();
 for(const chunks of [[c,c],[c,blob],[reviewChunk('manifest.sha256'),c],[reviewChunk('../outside')],[reviewChunk('evidence/arbitrary.json')],[{...c,body:c.body.slice(0,-1)}],[{...c,decodedLength:3}],[{...c,decodedSha256:'a'.repeat(64)}],[{...c,encoding:'plain'}]])await expect(check(file(chunks,h))).rejects.toThrow();
 await expect(check(file([c],h,{reviewBytes:'3'}))).rejects.toThrow('BACKUP_FOOTER_INVALID');
});
