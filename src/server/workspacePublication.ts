import {mkdir,open,readFile,unlink,lstat,realpath} from 'node:fs/promises';
import {dirname,basename,resolve,join} from 'node:path';
export async function assertCanonicalWorkspacePath(path:string){
 let current=resolve(path);for(;;){try{const info=await lstat(current),actual=await realpath(current),expected=resolve(current);if(info.isSymbolicLink()||(process.platform==='win32'?actual.toLowerCase()!==expected.toLowerCase():actual!==expected))throw Error('WORKSPACE_PATH_LINK');return;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const parent=dirname(current);if(parent===current)throw e;current=parent;}}
}
export async function acquireWorkspacePublication(root:string){
 await assertCanonicalWorkspacePath(root);const parent=dirname(resolve(root));await mkdir(parent,{recursive:true});await assertCanonicalWorkspacePath(parent);const path=join(parent,basename(root)+'.publication.lock');
 const dead=(pid:number)=>{if(!Number.isSafeInteger(pid)||pid<=0)throw Error('WORKSPACE_PUBLICATION_LOCK_INVALID');try{process.kill(pid,0);return false;}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')return true;throw e;}};
 const acquire=async()=>open(path,'wx');let file;
 try{file=await acquire();}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(!dead(Number(await readFile(path,'utf8'))))throw Error('WORKSPACE_PUBLICATION_BUSY');
  let recovery;try{recovery=await open(path+'.recovery','wx');}catch{throw Error('WORKSPACE_PUBLICATION_BUSY');}
  try{if(!dead(Number(await readFile(path,'utf8'))))throw Error('WORKSPACE_PUBLICATION_BUSY');await unlink(path);file=await acquire();}finally{await recovery.close();await unlink(path+'.recovery');}
 }
 try{await file.writeFile(String(process.pid));await file.sync();}catch(e){await file.close();await unlink(path);throw e;}return async()=>{try{await file.close();}finally{await unlink(path);}};
}
