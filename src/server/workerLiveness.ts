import {readFile} from 'node:fs/promises';
/** Callers supply a fixed internal worker lock, never a request-selected path. */
export async function workerIsAlive(lockPath:string){
 let raw:string;try{raw=await readFile(lockPath,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return false;throw e;}
 const pid=Number(raw);if(!Number.isSafeInteger(pid)||pid<=0||pid>0x7fffffff)throw new Error('WORKER_LOCK_INVALID');
 try{process.kill(pid,0);return true;}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')return false;throw e;}
}
