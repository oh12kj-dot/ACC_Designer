import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const digestTeardrop=v=>createHash('sha256').update(v).digest('hex');
const collect=(v,set)=>{if(typeof v==='string'&&/^kiwa:\d+:\d+$/.test(v))set.add(v);else if(v&&typeof v==='object')for(const x of Object.values(v))collect(x,set);};
export async function loadTeardropRestrictions(root){
 const blocked=new Set(),files=(await readdir(root)).filter(f=>f.endsWith('-holds.json')||f==='placement-exclusions.json').sort(),hashes=[];
 if(!files.includes('placement-exclusions.json'))throw Error('TEARDROP_EXCLUSIONS_MISSING');
 for(const file of files){const bytes=await readFile(join(root,file)),hash=digestTeardrop(bytes);if(file==='placement-exclusions.json'&&hash!=='8d793645f45db0390918dd93955056fa472021718c27431c477e4e31fd5f91e8')throw Error('TEARDROP_EXCLUSIONS_CHANGED');collect(JSON.parse(bytes),blocked);hashes.push([file,hash]);}
 return {blocked,fingerprint:digestTeardrop(JSON.stringify(hashes))};
}
export function assertTeardropProcessedApproval(review,spec,imageKey,high){
 if(!review?.processedReviewed||review.processedKeySha256!==digestTeardrop(imageKey)||!review.processedImageSha256?.match(/^[a-f0-9]{64}$/)||high&&review.processedImageSha256!==digestTeardrop(high))throw Error('TEARDROP_PROCESSED_APPROVAL_MISMATCH');
 if(spec.recipe!=='kiwa-teardrop-published-hw-range-box-v1')throw Error('TEARDROP_RECIPE_MISMATCH');
}
