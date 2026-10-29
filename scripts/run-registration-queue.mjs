// Serial worker supervisor. Only exact batch selectors enter the existing guarded writer.
import{readFile,writeFile,open,unlink,mkdir}from'node:fs/promises';import{resolve,join}from'node:path';import{spawn}from'node:child_process';import{sha256,saveLedger}from'./lib/registration-work.mjs';
import{fileURLToPath}from'node:url';
export function workerResult(log,batch){
 const candidates=log.split(/\r?\n/).filter(l=>l.startsWith('{')).map(l=>{try{return JSON.parse(l);}catch{return null;}}),r=candidates.findLast(r=>r?.version===1&&r.batchSha256===batch.sha256&&Number.isSafeInteger(r.created));
 if(!r||r.batchSize!==batch.count||r.registered!==batch.count||r.workspaceId!==batch.workspaceId||r.registrySha256!==batch.registrySha256||!r.protectedPartsUnchanged||!r.designTablesUnchanged||!r.registryUnchanged)throw Error('QUEUE_WORKER_RESULT_INVALID');return r;
}
export function assertQueueDefinition(q){if(q.version!==1||!q.workspaceId||!q.registrySha256?.match(/^[0-9a-f]{64}$/)||!Array.isArray(q.batches)||!q.batches.length||new Set(q.batches.map(b=>b.id)).size!==q.batches.length||q.batches.some(b=>!b.id?.match(/^[a-z0-9-]+$/)||!b.file||!b.sha256?.match(/^[0-9a-f]{64}$/)))throw Error('QUEUE_DEFINITION_INVALID');}
export async function runQueue(file,dir){
 const definition=await readFile(file),q=JSON.parse(definition);assertQueueDefinition(q);await mkdir(dir,{recursive:true});const lock=await open(join(dir,'queue.lock'),'wx'),statePath=join(dir,'state.json');let state={version:1,definitionSha256:sha256(definition),batches:{}};try{
 let old;try{old=await readFile(statePath);}catch(e){if(e.code!=='ENOENT')throw e;}if(old){state=JSON.parse(old);if(state.definitionSha256!==sha256(definition))throw Error('QUEUE_DEFINITION_CHANGED');}
 let stateHash=old?sha256(old):null;const persist=async()=>{stateHash=await saveLedger(statePath,state,stateHash);};
 for(const b of q.batches){if(sha256(await readFile(file))!==state.definitionSha256)throw Error('QUEUE_DEFINITION_CHANGED');const bytes=await readFile(b.file),selector=JSON.parse(bytes);if(sha256(bytes)!==b.sha256||selector.registrySha256!==q.registrySha256||selector.workspaceId!==q.workspaceId||!Array.isArray(selector.draftIds)||!selector.draftIds.length||selector.draftIds.length>250||new Set(selector.draftIds).size!==selector.draftIds.length)throw Error('QUEUE_BATCH_CHANGED');
  const item=state.batches[b.id]??{phase:'ready',attempts:[]};state.batches[b.id]=item;if(item.phase==='verified')continue;
  for(const phase of['registration','idempotency']){
   if(item[phase])continue;
   const proof=join(dir,b.id+'-'+phase+'.json');let recoveredProof;try{recoveredProof=await readFile(proof,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}if(recoveredProof){const result=workerResult(JSON.stringify(JSON.parse(recoveredProof)),{sha256:b.sha256,count:selector.draftIds.length,workspaceId:q.workspaceId,registrySha256:q.registrySha256});if(phase==='idempotency'&&result.created!==0)throw Error('QUEUE_RECOVERY_RERUN_NONZERO');item[phase]={proof,result};item.phase='completed-'+phase;await persist();continue;}
   const logPath=join(dir,b.id+'-'+phase+'-'+item.attempts.length+'.log'),log=await open(logPath,'wx');item.phase='running-'+phase;item.attempts.push({phase,logPath,startedAt:new Date().toISOString()});await persist();let code;
   try{code=await new Promise((done,reject)=>{const child=spawn(process.execPath,['scripts/register-nominal-parts.mjs','--register','--batch',resolve(b.file)],{cwd:process.cwd(),stdio:['ignore',log.fd,log.fd],windowsHide:true});child.once('error',reject);child.once('close',done);});}finally{await log.close();}
   item.attempts.at(-1).exitCode=code;item.attempts.at(-1).endedAt=new Date().toISOString();if(code!==0){item.phase='failed-'+phase;await persist();throw Error('QUEUE_WORKER_FAILED '+logPath);}
   const result=workerResult(await readFile(logPath,'utf8'),{sha256:b.sha256,count:selector.draftIds.length,workspaceId:q.workspaceId,registrySha256:q.registrySha256});
   if(phase==='idempotency'&&result.created!==0){item.phase='failed-idempotency';await persist();throw Error('QUEUE_RERUN_CREATED_PARTS');}
   await writeFile(proof,JSON.stringify(result,null,2),{flag:'wx'});item[phase]={proof,result};item.phase='completed-'+phase;await persist();
  }
  item.phase='verified';await persist();
 }
 console.log(JSON.stringify({statePath,completed:Object.values(state.batches).filter(b=>b.phase==='verified').length,createdInCompletedRuns:Object.values(state.batches).reduce((n,b)=>n+(b.registration?.result.created??0),0),creationAccountingComplete:!Object.values(state.batches).flatMap(b=>b.attempts).some(a=>a.exitCode!==0),interruptedAttempts:Object.values(state.batches).flatMap(b=>b.attempts).filter(a=>a.exitCode!==0).length}));
 }finally{await lock.close();await unlink(join(dir,'queue.lock'));}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){if(!process.argv[2]||!process.argv[3])throw Error('Usage: node scripts/run-registration-queue.mjs queue.json evidence-directory');await runQueue(process.argv[2],process.argv[3]);}
