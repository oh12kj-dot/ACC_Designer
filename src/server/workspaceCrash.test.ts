import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readdir,unlink,rmdir,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {LocalWorkspace} from './localWorkspace';
import {restoreWorkspaceBackup} from './restoreWorkspaceBackup';

it('recovers a dead writer after hard termination: committed data persists and an open transaction rolls back',async()=>{
 const root=await mkdtemp(join(tmpdir(),'acc-hard-stop-')),runtimes:string[]=[];
 try{for(const mode of ['before','after']){
  const target=join(root,mode),program=`import {loadLocalWorkspaceRuntime} from ${JSON.stringify(pathToFileURL(resolve('scripts/local-workspace-runtime.mjs')).href)};const r=await loadLocalWorkspaceRuntime();const d=await r.LocalWorkspace.open(process.argv[1]);setInterval(()=>{},1000);const ready=()=>console.log(JSON.stringify({ready:true,runtime:r.directory}));if(process.argv[2]==='before'){await d.actor(async tx=>{await tx.query('select public.create_design($1,$2)',['Uncommitted controlled fixture','necklace']);ready();await new Promise(()=>{});});}else{await d.rpc('create_design',{input_name:'Committed controlled fixture',input_type:'necklace'},crypto.randomUUID());ready();}`;
  const child=spawn(process.execPath,['--input-type=module','-e',program,target,mode],{stdio:['ignore','pipe','pipe'],windowsHide:true});let stderr='';child.stderr.on('data',b=>{stderr+=b.toString();});
  try{const ready=await new Promise<{runtime:string}>((done,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('CHILD_TIMEOUT '+stderr)),30000);child.once('exit',code=>{clearTimeout(timer);reject(Error('CHILD_EXIT '+code+' '+stderr));});child.stdout.on('data',b=>{text+=b.toString();for(const line of text.split('\n'))if(line.startsWith('{')){try{const value=JSON.parse(line);if(value.ready){clearTimeout(timer);done(value);}}catch{}}});});runtimes.push(ready.runtime);const exited=new Promise<void>(done=>child.once('exit',()=>done()));child.kill('SIGKILL');await exited;}finally{if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');}
  const reopened=await LocalWorkspace.open(target);try{const rows=await reopened.select({table:'designs',columns:'id,name'});expect((rows as any[]).length).toBe(mode==='after'?1:0);await reopened.auditIntegrity();}finally{await reopened.close();}
 }}finally{
  for(const directory of runtimes)if(directory.startsWith(resolve('.local/setup/restore-runtime-'))){for(const file of await readdir(directory))await unlink(join(directory,file));await rmdir(directory);}
  if(root.startsWith(join(tmpdir(),'acc-hard-stop-')))await rm(root,{recursive:true,force:true});
 }
},90000);
it('a crash before restore publication leaves the target absent and permits a clean retry',async()=>{
 const root=await mkdtemp(join(tmpdir(),'acc-restore-crash-')),source=await LocalWorkspace.open(join(root,'source')),target=join(root,'target');let directory:string|undefined,child:ReturnType<typeof spawn>|undefined;
 try{
  const exported=await source.exportBackupSet(),file=join(source.root,'exports',exported.id+'.accbackup.ndjson'),program=`import {loadLocalWorkspaceRuntime} from ${JSON.stringify(pathToFileURL(resolve('scripts/local-workspace-runtime.mjs')).href)};const r=await loadLocalWorkspaceRuntime();setInterval(()=>{},1000);const close=r.LocalWorkspace.prototype.close;r.LocalWorkspace.prototype.close=async function(){if(this.root.includes('restore-staging')){console.log(JSON.stringify({ready:true,runtime:r.directory}));await new Promise(()=>{});}return close.call(this);};await r.restoreWorkspaceBackup(process.argv[1],process.argv[2]);`;
  child=spawn(process.execPath,['--input-type=module','-e',program,file,target],{stdio:['ignore','pipe','pipe'],windowsHide:true});let stderr='';child.stderr!.on('data',b=>stderr+=b.toString());directory=await new Promise<string>((done,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('RESTORE_CHILD_TIMEOUT '+stderr)),30000);child!.once('exit',code=>{clearTimeout(timer);reject(Error('RESTORE_CHILD_EXIT '+code+' '+stderr));});child!.stdout!.on('data',b=>{text+=b.toString();for(const line of text.split('\n'))if(line.startsWith('{')){try{const value=JSON.parse(line);if(value.ready){clearTimeout(timer);done(value.runtime);}}catch{}}});});
  const exited=new Promise<void>(done=>child!.once('exit',()=>done()));child.kill('SIGKILL');await exited;await expect(lstat(target)).rejects.toMatchObject({code:'ENOENT'});await restoreWorkspaceBackup(file,target);const restored=await LocalWorkspace.open(target);try{expect(restored.owner).toBe(source.owner);await restored.auditIntegrity();}finally{await restored.close();}
 }finally{if(child&&child.exitCode===null&&!child.killed)child.kill('SIGKILL');await source.close();if(directory?.startsWith(resolve('.local/setup/restore-runtime-'))){for(const file of await readdir(directory))await unlink(join(directory,file));await rmdir(directory);}if(root.startsWith(join(tmpdir(),'acc-restore-crash-')))await rm(root,{recursive:true,force:true});}
},90000);
