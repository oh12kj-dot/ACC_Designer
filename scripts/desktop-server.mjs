import next from 'next';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {serveStartup} from './desktop-startup.mjs';

// This entry point is private to the launcher. Never expose shutdown over HTTP.
if (!process.send || process.env.ACC_LOCAL_BIND !== '127.0.0.1') throw new Error('DESKTOP_IPC_REQUIRED');
const port = Number(process.env.ACC_DESKTOP_PORT || 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('INVALID_PORT');
const app = next({dev:false, dir:process.cwd(), hostname:'127.0.0.1', port});
const active = new Set();
let stopping = false, shutdownPromise, startupTask=Promise.resolve(), state='loading', startupFailed=false;
const probeToken=randomBytes(32).toString('hex'),probeAbort=new AbortController();
const server = createServer((req,res) => {
  if (stopping) { res.writeHead(503, {'Connection':'close'}); res.end(); return; }
  if(serveStartup(req,res,state))return;
  const ownProbe=req.method==='GET'&&req.url==='/api/local/workspace'&&req.headers['x-acc-desktop-probe']===probeToken;
  if(state!=='ready'&&!ownProbe){res.writeHead(503,{'Cache-Control':'no-store','Retry-After':'1'});res.end('保存データを確認しています。');return;}
  const response = new Promise(resolve => { res.once('finish',resolve); res.once('close',resolve); });
  const work = Promise.resolve().then(() => app.getRequestHandler()(req,res)).catch(error => {
    console.error(error); if (!res.headersSent) res.writeHead(500); res.end();
  });
  const pending = Promise.allSettled([work,response]);
  active.add(pending); pending.finally(() => active.delete(pending));
});
function report(message) { if (process.connected) process.send(message); }
function shutdown() {
  return shutdownPromise ??= (async () => {
    stopping = true;
    probeAbort.abort();
    // start() never awaits shutdown: no cycle, including close during prepare/listen.
    await startupTask;
    const closed = new Promise((resolve,reject) => {
      if (!server.listening) return resolve();
      server.close(error => error ? reject(error) : resolve());
      server.closeIdleConnections();
    });
    await Promise.all([...active]);
    server.closeIdleConnections();
    await closed;
    const workspace = await globalThis.localWorkspace;
    if (workspace) {
      await workspace.close();
      const root = process.env.ACC_LOCAL_WORKSPACE_TEST_ID
        ? join(process.cwd(),'.local','test-workspaces',process.env.ACC_LOCAL_WORKSPACE_TEST_ID)
        : join(process.cwd(),'.local','workspace');
      try { await readFile(join(root,'writer.lock')); throw new Error('DESKTOP_DB_LOCK_NOT_RELEASED'); }
      catch(error) { if (error.code !== 'ENOENT') throw error; }
    }
    await app.close();
    report({type:'stopped', workspaceClosed:Boolean(workspace), pid:process.pid});
    if (process.connected) process.disconnect();
  })().catch(error => { console.error('終了処理に失敗しました:',error); report({type:'shutdown-error',error:error.message}); process.exitCode=1; });
}
process.on('message',message => { if (message?.type === 'shutdown') void shutdown(); });
process.on('disconnect',() => void shutdown());
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,() => void shutdown());
async function start(){
  await app.prepare();
  if (!stopping) {
    await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
    if(stopping)return;
    report({type:'listening',pid:process.pid,port});
    // The bootstrap window can open now. Keep the actual app gated until this
    // probe validates the DB and the shared workspace which this process closes.
    if(stopping)return;
    const probe=await fetch(`http://127.0.0.1:${port}/api/local/workspace`,{headers:{'x-acc-desktop-probe':probeToken},signal:probeAbort.signal});
    if (!probe.ok) throw new Error('保存先を開けません。他の ACC Designer が起動していないか確認してください。');
    await probe.arrayBuffer();
    if (!globalThis.localWorkspace) throw new Error('DESKTOP_WORKSPACE_PROCESS_MISMATCH');
    if(stopping)return;
    state='ready';
    report({type:'ready',pid:process.pid,port});
  }
}
startupTask=start().catch(error=>{
 if(stopping)return;
 state='error';startupFailed=true;report({type:'startup-error',error:error.message});console.error('起動に失敗しました:',error.message);process.exitCode=1;
});
startupTask.then(()=>{if(startupFailed)void shutdown();});
