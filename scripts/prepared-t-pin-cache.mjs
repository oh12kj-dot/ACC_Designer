import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {prepareTPin,tPinImageKey} from './prepare-t-pin-finite.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const renditions=['high','medium','thumbnail'];
export async function prepareCachedTPin(original,spec,{cacheRoot='.local/calibration/nominal/prepared-t-pin',prepare=prepareTPin}={}){
 const sourceHash=hash(original);
 if(sourceHash!==spec.sourceCrop?.sha256)throw Error('T_PIN_CACHE_SOURCE_MISMATCH');
 const imageKey=tPinImageKey(sourceHash,spec),binding=hash(JSON.stringify(spec));
 // This cache contains preparation only; processed-photo approval is checked separately.
 const file=join(cacheRoot,hash(JSON.stringify({imageKey,binding}))+'.json');
 let bytes;
 try{bytes=await readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(bytes){
  try{
   const entry=JSON.parse(bytes),p=entry.payload;
   if(entry.version!==1||entry.imageKey!==imageKey||entry.binding!==binding||entry.sourceHash!==sourceHash||entry.payloadHash!==hash(JSON.stringify(p)))throw Error();
   if(!Number.isSafeInteger(p.width)||p.width<=0||!Number.isSafeInteger(p.height)||p.height<=0||!Number.isFinite(p.mmPerPx)||p.mmPerPx<=0||!p.transform||!['image/jpeg','image/png','image/webp'].includes(p.originalMime))throw Error();
   const result={...p};
   for(const name of renditions){if(typeof p[name]!=='string'||!p[name].length)throw Error();result[name]=Buffer.from(p[name],'base64');}
   return result;
  }catch{throw Error('T_PIN_PREPARED_CACHE_INVALID');}
 }
 const result=await prepare(original,spec),payload={...result};
 for(const name of renditions){if(!Buffer.isBuffer(result[name]))throw Error('T_PIN_PREPARED_RENDITION_MISSING');payload[name]=result[name].toString('base64');}
 const entry={version:1,imageKey,binding,sourceHash,payloadHash:hash(JSON.stringify(payload)),payload};
 await mkdir(cacheRoot,{recursive:true});
 const temp=file+'.'+randomUUID()+'.tmp';
 try{await writeFile(temp,JSON.stringify(entry),{flag:'wx'});await rename(temp,file);}finally{await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
 return result;
}
