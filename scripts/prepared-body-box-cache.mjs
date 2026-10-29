import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {prepareBodyBox} from './prepare-body-box.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const renditions=['high','medium','thumbnail'];
export async function prepareCachedBodyBox(original,spec,sourceHash,{cacheRoot='.local/calibration/nominal/prepared-body-box',prepare=prepareBodyBox}={}){
 if(hash(original)!==sourceHash)throw Error('BODY_BOX_CACHE_SOURCE_MISMATCH');
 if(!['kiwa-crystal-body-box-v1','kiwa-czech-own-photo-body-box-v1'].includes(spec.recipe)||![spec.widthMm,spec.heightMm].every(n=>Number.isFinite(n)&&n>0&&n<=40)||![0,90].includes(spec.photoRotationDegrees))throw Error('BODY_BOX_CACHE_SPEC_INVALID');
 const binding=hash(JSON.stringify(spec)),key=JSON.stringify({version:1,sourceHash,binding});
 const file=join(cacheRoot,hash(key)+'.json');let bytes;
 try{bytes=await readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(bytes){
  try{const entry=JSON.parse(bytes),p=entry.payload;
   if(entry.version!==1||entry.key!==key||entry.payloadHash!==hash(JSON.stringify(p)))throw Error();
   if(!Number.isSafeInteger(p.width)||p.width<=0||!Number.isSafeInteger(p.height)||p.height<=0||!Number.isFinite(p.mmPerPx)||p.mmPerPx<=0||!p.transform||!['image/jpeg','image/png','image/webp'].includes(p.originalMime))throw Error();
   const result={...p};for(const name of renditions){if(typeof p[name]!=='string'||!p[name].length)throw Error();result[name]=Buffer.from(p[name],'base64');}return result;
  }catch{throw Error('BODY_BOX_PREPARED_CACHE_INVALID');}
 }
 const result=await prepare(original,spec),payload={...result};
 for(const name of renditions){if(!Buffer.isBuffer(result[name]))throw Error('BODY_BOX_CACHE_RENDITION_MISSING');payload[name]=result[name].toString('base64');}
 await mkdir(cacheRoot,{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';
 try{await writeFile(temp,JSON.stringify({version:1,key,payloadHash:hash(JSON.stringify(payload)),payload}),{flag:'wx'});await rename(temp,file);}finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}return result;
}
