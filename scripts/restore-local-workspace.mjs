import {readFile,mkdir,writeFile,lstat,rename,rm,realpath} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {loadLocalWorkspaceRuntime} from './local-workspace-runtime.mjs';
const input=process.argv[2];if(!input||process.argv.length!==3)throw Error('npm run workspace:restore -- <backup.json | backup.accbackup.ndjson>');
const testId=process.env.ACC_LOCAL_WORKSPACE_TEST_ID;if(testId&&!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(testId))throw Error('INVALID_TEST_WORKSPACE');
const target=resolve(testId?'.local/test-workspaces/'+testId:'.local/workspace');const absent=async()=>{try{await lstat(target);throw Error('WORKSPACE_EXISTS: existing data is never overwritten');}catch(e){if(e.code!=='ENOENT')throw e;}};await absent();
const runtime=await loadLocalWorkspaceRuntime();
try{
 if(input.endsWith('.accbackup.ndjson')){await runtime.restoreWorkspaceBackup(input,target);console.log('Restored and verified: '+target);}
 else{
  if((await lstat(input)).size>128*1024*1024)throw Error('BACKUP_TOO_LARGE');const data=JSON.parse(await readFile(input,'utf8'));
  if(data?.payload?.version!==1||!/^[0-9a-f-]{36}$/.test(data.payload.owner)||createHash('sha256').update(JSON.stringify(data.payload)).digest('hex')!==data.sha256)throw Error('INVALID_BACKUP');
  const release=await runtime.acquireWorkspacePublication(target);let workspace,stage;
  try{
   await absent();const parent=resolve('.local/restore-staging');await mkdir(parent,{recursive:true});if((await lstat(parent)).isSymbolicLink())throw Error('INVALID_STAGE');stage=join(parent,randomUUID());await mkdir(stage);await writeFile(join(stage,'identity.json'),JSON.stringify({version:1,id:data.payload.owner}));
   workspace=await runtime.LocalWorkspace.open(stage);await workspace.importPackage(data);await workspace.auditIntegrity();await workspace.close();workspace=undefined;await absent();await rename(stage,target);stage=undefined;console.log('Restored and verified: '+target);
  }finally{
   try{await workspace?.close();if(stage){const parent=resolve('.local/restore-staging');if(relative(parent,stage).includes('..')||(await lstat(stage)).isSymbolicLink()||(await realpath(stage)).toLowerCase()!==stage.toLowerCase())throw Error('INVALID_STAGE');await rm(stage,{recursive:true,force:true});}}finally{await release();}
  }
 }
}finally{await runtime.dispose();}
