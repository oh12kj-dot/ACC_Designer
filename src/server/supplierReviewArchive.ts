import {readFile,lstat,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {loadSupplierListingReview} from './supplierListingReview';
import {readReviewFile,reviewArchivePath,reviewLimits,assertReviewPath} from './supplierReviewFiles';

const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export type ReviewFileChunk={type:'review-file';path:string;encoding:'gzip';sha256:string;length:number;body:string;decodedLength:number;decodedSha256:string};
export function decodeReviewChunk(c:ReviewFileChunk){
 if(!reviewArchivePath(c.path)||c.encoding!=='gzip'||!Number.isSafeInteger(c.length)||c.length<=0||c.length>reviewLimits.maxEncodedBytes||!Number.isSafeInteger(c.decodedLength)||c.decodedLength<0||c.decodedLength>reviewLimits.maxFileBytes||typeof c.body!=='string'||! /^[a-f0-9]{64}$/.test(c.sha256)||! /^[a-f0-9]{64}$/.test(c.decodedSha256))throw Error('BACKUP_REVIEW_FILE');
 const packed=Buffer.from(c.body,'base64');if(packed.length!==c.length||packed.toString('base64')!==c.body||hash(packed)!==c.sha256)throw Error('BACKUP_REVIEW_HASH');
 const bytes=gunzipSync(packed,{maxOutputLength:reviewLimits.maxFileBytes});if(bytes.length!==c.decodedLength||hash(bytes)!==c.decodedSha256)throw Error('BACKUP_REVIEW_HASH');return bytes;
}
export async function captureReviewArchive(owner:string,workspace:string,registryPath=join(process.cwd(),'.local/parts/parts.json')){
 const root=join(workspace,'supplier-listing-review');try{await lstat(root);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
 const manifestBytes=await readReviewFile(root,'manifest.json'),manifest=JSON.parse(manifestBytes.toString()),files=new Map<string,Buffer>();if(!Array.isArray(manifest.files)||manifest.files.length>reviewLimits.maxFiles-3)throw Error('BACKUP_REVIEW_LIMIT');let totalBytes=0;
 for(const path of ['manifest.json','manifest.sha256',...manifest.files.map((f:{path:string})=>f.path)]){if(files.has(path))throw Error('BACKUP_REVIEW_DUPLICATE');const bytes=await readReviewFile(root,path,reviewLimits.maxTotalBytes-totalBytes);totalBytes+=bytes.length;files.set(path,bytes);}
 let binding:Buffer;
 try{binding=await readReviewFile(root,'portable-sources.json');}
 catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const registry=await readFile(registryPath);if(hash(registry)!==manifest.registrySha256)throw Error('BACKUP_REVIEW_REGISTRY');const drafts=new Map<string,unknown>(JSON.parse(registry.toString()).parts.map((d:{id:string})=>[d.id,d]));binding=Buffer.from(JSON.stringify({version:1,manifestSha256:hash(manifestBytes),sources:manifest.sources.map((s:{sourceDraftId:string})=>drafts.get(s.sourceDraftId))}));}
 files.set('portable-sources.json',binding);
 if(files.size>reviewLimits.maxFiles||[...files.values()].some(b=>b.length>reviewLimits.maxFileBytes)||[...files.values()].reduce((n,b)=>n+b.length,0)>reviewLimits.maxTotalBytes)throw Error('BACKUP_REVIEW_LIMIT');
 const chunks:ReviewFileChunk[]=[];for(const [path,bytes]of [...files].sort(([a],[b])=>a<b?-1:a>b?1:0)){const packed=gzipSync(bytes);const c:ReviewFileChunk={type:'review-file',path,encoding:'gzip',sha256:hash(packed),length:packed.length,body:packed.toString('base64'),decodedLength:bytes.length,decodedSha256:hash(bytes)};decodeReviewChunk(c);chunks.push(c);}
 // Verify the exact captured bundle, not a second filesystem read of its files.
 await validateReviewBundle(owner,files,registryPath);
 return chunks;
}
// The live reader validates these frozen bytes without reading mutable files.
export async function validateReviewBundle(owner:string,files:Map<string,Buffer>,registryPath?:string){
 const manifest=JSON.parse(files.get('manifest.json')?.toString()??'null');if(!manifest||manifest.workspaceId!==owner||!Array.isArray(manifest.files))throw Error('BACKUP_REVIEW_SCOPE');
 const expected=new Set(['manifest.json','manifest.sha256','portable-sources.json',...manifest.files.map((f:{path:string})=>f.path)]);
 if(files.size!==expected.size||[...files.keys()].some(p=>!expected.has(p)||!reviewArchivePath(p)))throw Error('BACKUP_REVIEW_CLOSURE');
 // The byte reader variant runs the same semantic validator without trusting paths.
 const index=await loadSupplierListingReview(owner,'',registryPath,files);if(!index.valid)throw Error('BACKUP_REVIEW_INVALID');
}
export async function stageReviewArchive(owner:string,workspace:string,chunks:ReviewFileChunk[]){
 if(!chunks.length)return;const files=new Map<string,Buffer>();for(const c of chunks){if(files.has(c.path))throw Error('BACKUP_REVIEW_DUPLICATE');files.set(c.path,decodeReviewChunk(c));}await validateReviewBundle(owner,files);
 const root=join(workspace,'supplier-listing-review');await assertReviewPath(workspace);await mkdir(root);const cleanup=async()=>{await assertReviewPath(root);await rm(root,{recursive:true});};try{await mkdir(join(root,'evidence'));await assertReviewPath(join(root,'evidence'));
 for(const [path,bytes]of files)await writeFile(join(root,path),bytes,{flag:'wx'});
 if(!(await loadSupplierListingReview(owner,workspace)).valid)throw Error('BACKUP_REVIEW_READBACK');return cleanup;
 }catch(error){await cleanup();throw error;}
}
