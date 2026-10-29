import {mkdir,readFile,writeFile,rename,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {teardropRangeImageKey} from './prepare-teardrop-range.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

export async function publishTeardropReview({prepared,skipped,registrySha256,outputRoot}){
 const rows=prepared.map((p,i)=>{
  if(hash(p.result.high)!==p.highSha256||hash(teardropRangeImageKey(p.spec.sourceCrop.sha256,p.spec))!==p.keySha256)throw Error('TEARDROP_REVIEW_OUTPUT_HASH');
  return {draftId:p.draftId,spec:p.spec,keySha256:p.keySha256,highSha256:p.highSha256,processedReviewed:false,filename:i+'.png'};
 });
 if(new Set(rows.map(r=>r.draftId)).size!==rows.length)throw Error('TEARDROP_REVIEW_OUTPUT_DUPLICATE');
 // Effective rows and exclusions are part of the identity: index 0 can never switch products in-place.
 const manifest={version:1,registrySha256,prepared:rows,skipped,approval:'PROCESSED_VISUAL_REVIEW_REQUIRED',sqlWrites:0},bytes=JSON.stringify(manifest,null,2),output=join(outputRoot,hash(bytes));
 const verify=async()=>{
  let existing;try{existing=await readFile(join(output,'prepared.json'),'utf8');}catch(e){if(e.code==='ENOENT')return false;throw e;}
  if(existing!==bytes)throw Error('TEARDROP_REVIEW_PACKAGE_CHANGED');
  for(const row of rows){let image;try{image=await readFile(join(output,row.filename));}catch{throw Error('TEARDROP_REVIEW_PACKAGE_CHANGED');}if(hash(image)!==row.highSha256)throw Error('TEARDROP_REVIEW_PACKAGE_CHANGED');}
  return true;
 };
 if(await verify())return {output,reused:true};
 await mkdir(outputRoot,{recursive:true});
 const stage=join(outputRoot,'.stage-'+randomUUID()),written=[];await mkdir(stage);
 try{
  for(const [i,p]of prepared.entries()){const file=join(stage,rows[i].filename);written.push(file);await writeFile(file,p.result.high,{flag:'wx'});}
  const file=join(stage,'prepared.json');written.push(file);await writeFile(file,bytes,{flag:'wx'});
  try{await rename(stage,output);}catch(error){if(!await verify())throw error;return {output,reused:true};}
  return {output,reused:false};
 }finally{
  // Only remove the exact temporary files created above; never recurse into a package.
  for(const file of written)await unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await rmdir(stage).catch(e=>{if(e.code!=='ENOENT')throw e;});
 }
}
