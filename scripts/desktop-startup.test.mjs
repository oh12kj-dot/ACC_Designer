import{test}from'node:test';import assert from'node:assert/strict';
import{spawn}from'node:child_process';import{randomUUID}from'node:crypto';
import{mkdir,writeFile,readFile,access,unlink}from'node:fs/promises';import{join,resolve}from'node:path';import{pathToFileURL}from'node:url';
import{startupPath,statusPath,waitForWindow}from'./desktop-startup.mjs';import{localNodeOptions}from'./local-next-options.mjs';

function run(mode,testId=randomUUID()){
 const events=[],waiters=new Set(),directory=resolve('.local/test-workspaces',testId);
 const child=spawn(process.execPath,['scripts/desktop-server.mjs'],{windowsHide:true,stdio:['ignore','ignore','pipe','ipc'],env:{...process.env,NODE_ENV:'production',ACC_LOCAL_BIND:'127.0.0.1',ACC_DESKTOP_PORT:'3421',ACC_LOCAL_WORKSPACE_TEST_ID:testId,ACC_DESKTOP_TEST_DELAY:mode,NODE_OPTIONS:localNodeOptions([process.env.NODE_OPTIONS,'--import='+pathToFileURL(resolve('scripts/fixtures/desktop-startup-delay.mjs')).href].filter(Boolean).join(' '))}});
 let stderr='';child.stderr.on('data',b=>stderr+=b);
 child.on('message',message=>{events.push(message);for(const waiter of waiters)if(message.type===waiter.type){clearTimeout(waiter.timer);waiters.delete(waiter);waiter.resolve(message);}});
 const exited=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{for(const waiter of waiters){clearTimeout(waiter.timer);waiter.reject(Error('Exit before '+waiter.type+': '+stderr));}resolve(code);});});
 const message=type=>events.find(e=>e.type===type)?Promise.resolve(events.find(e=>e.type===type)):new Promise((resolve,reject)=>{const waiter={type,resolve,reject};waiter.timer=setTimeout(()=>{waiters.delete(waiter);reject(Error('Timeout '+type+': '+stderr));},15000);waiters.add(waiter);});
 return{child,directory,events,message,exited,stop:()=>{if(child.connected)child.send({type:'shutdown'},()=>{});}};
}
async function checkLoading(){
 const page=await fetch('http://127.0.0.1:3421'+startupPath);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/default-src 'none'/);assert.match(await page.text(),/保存データを確認しています/);
 assert.deepEqual(await fetch('http://127.0.0.1:3421'+statusPath).then(r=>r.json()),{status:'loading'});
 for(const path of ['/','/api/local/workspace'])assert.equal((await fetch('http://127.0.0.1:3421'+path)).status,503);
}
test('listening shows a safe page before validation and early close drains initialization',async()=>{
 const session=run('init');try{
  await session.message('test-init-paused');await checkLoading();session.stop();assert.equal(await session.exited,0);
  assert.ok(!session.events.some(e=>e.type==='ready'));assert.ok(session.events.some(e=>e.type==='stopped'&&e.workspaceClosed));await assert.rejects(access(join(session.directory,'writer.lock')),{code:'ENOENT'});
  const {loadLocalWorkspaceRuntime}=await import('./local-workspace-runtime.mjs');const runtime=await loadLocalWorkspaceRuntime();try{const db=await runtime.LocalWorkspace.open(session.directory);await db.close();}finally{await runtime.dispose();}
 }finally{session.stop();await session.exited;}
});
test('close before the self-probe connects does not create a DB or send ready',async()=>{
 const session=run('probe');try{await session.message('test-probe-paused');await checkLoading();session.stop();assert.equal(await session.exited,0);assert.ok(!session.events.some(e=>e.type==='ready'));assert.ok(session.events.some(e=>e.type==='stopped'&&!e.workspaceClosed));await assert.rejects(access(join(session.directory,'writer.lock')),{code:'ENOENT'});}finally{session.stop();await session.exited;}
});
test('a stop requested at process startup never announces ready or retains a writer',async()=>{
 const session=run('none');session.stop();assert.equal(await session.exited,0);assert.ok(!session.events.some(e=>e.type==='ready'));assert.ok(session.events.some(e=>e.type==='stopped'));await assert.rejects(access(join(session.directory,'writer.lock')),{code:'ENOENT'});
});
test('audit failure cannot enable the app and closes its DB lock',async()=>{
 const session=run('audit-error');try{await session.message('startup-error');assert.equal(await session.exited,1);assert.ok(!session.events.some(e=>e.type==='ready'));await assert.rejects(access(join(session.directory,'writer.lock')),{code:'ENOENT'});}finally{session.stop();await session.exited;}
});
test('busy workspace keeps the other writer lock and never sends ready',async()=>{
 const testId=randomUUID(),directory=resolve('.local/test-workspaces',testId);await mkdir(directory,{recursive:true});await writeFile(join(directory,'writer.lock'),String(process.pid));
 const session=run('none',testId);try{await session.message('startup-error');assert.equal(await session.exited,1);assert.ok(!session.events.some(e=>e.type==='ready'));assert.equal(await readFile(join(directory,'writer.lock'),'utf8'),String(process.pid));}finally{session.stop();await session.exited;await unlink(join(directory,'writer.lock'));}
});
test('server failure retains window ownership until that window exits',async()=>{
 let close,finished=false,notices=0;const browser=new Promise(r=>close=r);
 const pending=waitForWindow(browser,Promise.resolve({code:1}),()=>notices++).then(result=>{finished=true;return result;});
 await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(notices,1);close(0);assert.deepEqual(await pending,{browser:false,code:1});
});
