import {mkdir,lstat,writeFile,rename,rm,realpath} from 'node:fs/promises';
import {join,resolve,dirname,relative} from 'node:path';
import {randomUUID} from 'node:crypto';
import {LocalWorkspace} from './localWorkspace';
import {readBackupHeader} from './workspaceBackupFormat';
import {acquireWorkspacePublication,assertCanonicalWorkspacePath} from './workspacePublication';
async function absent(path:string){try{await lstat(path);throw Error('WORKSPACE_EXISTS');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
// target is trusted CLI/test configuration, never a browser-selected path.
export async function restoreWorkspaceBackup(source:string,target=resolve('.local/workspace')){
 target=resolve(target);const release=await acquireWorkspacePublication(target);let stage:string|undefined,db:LocalWorkspace|undefined;
 try{
  await absent(target);const header=await readBackupHeader(source),parent=resolve(dirname(target),'restore-staging');await assertCanonicalWorkspacePath(parent);await mkdir(parent,{recursive:true});await assertCanonicalWorkspacePath(parent);
  const id=randomUUID();stage=join(parent,id);await mkdir(stage);await writeFile(join(stage,'identity.json'),JSON.stringify({version:1,id:header.owner}),{flag:'wx'});
  db=await LocalWorkspace.open(stage);const result=await db.importBackupSet(source);await db.auditIntegrity();await db.close();db=undefined;await absent(target);await assertCanonicalWorkspacePath(target);await rename(stage,target);stage=undefined;return result;
 }finally{
  try{await db?.close();
   if(stage){const parent=resolve(dirname(target),'restore-staging'),actual=await realpath(stage);if(relative(parent,resolve(stage)).includes('..')||relative(parent,resolve(stage)).includes('/')||relative(parent,resolve(stage)).includes('\\')||(await lstat(stage)).isSymbolicLink()||actual.toLowerCase()!==resolve(stage).toLowerCase())throw Error('RESTORE_CLEANUP_PATH');await rm(stage,{recursive:true,force:true});}
  }finally{await release();}
 }
}
