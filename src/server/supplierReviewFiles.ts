import {lstat,realpath,readFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';

export const reviewLimits={maxFileBytes:128*1024*1024,maxEncodedBytes:20*1024*1024,maxFiles:4096,maxTotalBytes:512*1024*1024};
export const reviewEvidencePath=(path:unknown):path is string=>typeof path==='string'&&/^evidence\/(?:page-\d+|product-\d+(?:\.retry-1)?|review|body-semantic-review|body-semantic-groups|manufacturer-(?:miyuki-db|miyuki-legacy|miyuki-dp-dbc|toho-published|shindo-sic109|supplier-chain-width|supplier-chain-gauge|supplier-chain-size-label|supplier-component|supplier-pipe-inner-width|supplier-opening-size|supplier-variant-hole-table|supplier-tool-category|supplier-connector-guidance)-(?:plan|first|rerun))\.json$/.test(path);
export const reviewArchivePath=(path:unknown):path is string=>typeof path==='string'&&(['manifest.json','manifest.sha256','portable-sources.json'].includes(path)||reviewEvidencePath(path));
export async function assertReviewPath(path:string){
 let current=resolve(path);for(;;){const info=await lstat(current),actual=await realpath(current);if(info.isSymbolicLink()||(process.platform==='win32'?actual.toLowerCase()!==current.toLowerCase():actual!==current))throw Error('REVIEW_LINK');const parent=dirname(current);if(parent===current)return;current=parent;}
}
export async function readReviewFile(root:string,path:string,remainingBytes=reviewLimits.maxTotalBytes){
 if(!reviewArchivePath(path))throw Error('REVIEW_PATH');const file=join(root,path);await assertReviewPath(file);const info=await lstat(file);if(!info.isFile()||info.size>reviewLimits.maxFileBytes||info.size>remainingBytes)throw Error('REVIEW_SIZE');const bytes=await readFile(file);if(bytes.length!==info.size)throw Error('REVIEW_CHANGED');return bytes;
}
