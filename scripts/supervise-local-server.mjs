// Adopt a known running server; restart only after its process exits.
// Never deletes or takes over the workspace writer lock.
import {spawn} from 'node:child_process';
import {open,writeFile,unlink} from 'node:fs/promises';
import {createConnection} from 'node:net';
const adopted=Number(process.argv[2]);
if(!Number.isSafeInteger(adopted)||adopted<=0)throw Error('Existing server PID required');
const path='.local/calibration/nominal/server-supervisor.lock';
const lock=await open(path,'wx');await lock.writeFile(String(process.pid));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
const listening=()=>new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port:3000});let done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value);};socket.on('connect',()=>finish(true));socket.on('error',()=>finish(false));socket.setTimeout(2000,()=>finish(false));});
const state=extra=>writeFile('.local/calibration/nominal/server-supervisor-state.json',JSON.stringify({checkedAt:new Date().toISOString(),supervisorPid:process.pid,...extra},null,2));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let stopping=false,child,resolveStop;
const stopped=new Promise(resolve=>{resolveStop=resolve;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;child?.unref();resolveStop({stopped:true});});
try{
 await state({serverPid:adopted,status:'adopted',restartCount:0});
 while(!stopping&&alive(adopted))await sleep(15000);
 let restarts=0;
 while(!stopping){
  // Another server may already have restored service. Do not launch a second writer.
  if(await listening()){await state({status:'external-server-listening',restartCount:restarts});await sleep(15000);continue;}
  await sleep(Math.min(30000,1000*2**Math.min(restarts,5)));
  if(stopping||await listening())continue;
  child=spawn(process.execPath,['scripts/local-next.mjs','start'],{stdio:'inherit',windowsHide:true});
  restarts++;await state({status:'restarted',wrapperPid:child.pid,restartCount:restarts});
  const result=await Promise.race([stopped,new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));})]);
  if(result.stopped)break;
  await state({status:'exited',restartCount:restarts,lastExit:result});
 }
}finally{await lock.close();await unlink(path);}
