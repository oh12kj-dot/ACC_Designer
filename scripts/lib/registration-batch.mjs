import {readFile} from 'node:fs/promises';import{sha256}from'./registration-work.mjs';
export async function loadRegistrationBatch(path,registry,registrySha256){
 const bytes=await readFile(path),data=JSON.parse(bytes);
 if(data.version!==1||data.registrySha256!==registrySha256||typeof data.workspaceId!=='string'||!data.workspaceId||!Array.isArray(data.draftIds)||!data.draftIds.length||data.draftIds.length>250||new Set(data.draftIds).size!==data.draftIds.length)throw Error('REGISTRATION_BATCH_INVALID');
 const known=new Set(registry.parts.map(d=>d.id));if(data.draftIds.some(id=>!known.has(id)))throw Error('REGISTRATION_BATCH_UNKNOWN_SOURCE');
 return{path,sha256:sha256(bytes),data,ids:new Set(data.draftIds)};
}
export async function assertRegistrationBatchCurrent(batch,workspaceId){if(!batch)return;if(batch.data.workspaceId!==workspaceId||sha256(await readFile(batch.path))!==batch.sha256)throw Error('REGISTRATION_BATCH_SCOPE_CHANGED');}
