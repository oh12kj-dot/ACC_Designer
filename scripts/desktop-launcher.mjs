import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {createHash} from 'node:crypto';
import {access,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {localNodeOptions} from './local-next-options.mjs';
import {verifyDesktopBuild} from './desktop-build.mjs';
import {startupPath,waitForWindow} from './desktop-startup.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function pipeName(directory) {
  return '\\\\.\\pipe\\acc-designer-' + createHash('sha256').update(resolve(directory).toLowerCase()).digest('hex').slice(0,24);
}
export async function acquireLauncherLock(directory) {
  const lock = createServer(socket => socket.end());
  await new Promise((resolve,reject) => { lock.once('error',reject); lock.listen(pipeName(directory),resolve); });
  return () => new Promise(resolve => lock.close(resolve));
}
export async function findBrowser() {
  const candidates = [
    join(process.env.ProgramFiles || 'C:\\Program Files','Google','Chrome','Application','chrome.exe'),
    join(process.env.LOCALAPPDATA || '', 'Google','Chrome','Application','chrome.exe'),
  ];
  for (const path of candidates) { try { await access(path); return path; } catch {} }
  throw new Error('Google Chrome が必要です。Edge は初回案内による終了動作が未対応のため使用しません。');
}
export async function launch({port=3000,profile=join(root,'.local','desktop-browser'),browser,env=process.env,onEvent=()=>{}}={}) {
  if (process.platform !== 'win32') throw new Error('Windows 専用です。');
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24 以降が必要です。');
  await access(join(root,'node_modules','next','package.json')).catch(() => { throw new Error('依存ファイルがありません。先に npm ci を実行してください。'); });
  await verifyDesktopBuild(root);
  browser ??= await findBrowser();
  const release = await acquireLauncherLock(root).catch(error => { if (error.code==='EADDRINUSE') throw new Error('ACC Designer は既に起動中です。'); throw error; });
  let server,window,shutdownAck=false,requested=false,startupError;
  try {
    await mkdir(profile,{recursive:true});
    server=spawn(process.execPath,[join(root,'scripts','desktop-server.mjs')],{
      cwd:root,windowsHide:true,stdio:['ignore','inherit','inherit','ipc'],
      env:{...env,NODE_ENV:'production',NODE_OPTIONS:localNodeOptions(env.NODE_OPTIONS),ACC_LOCAL_BIND:'127.0.0.1',ACC_DESKTOP_PORT:String(port)},
    });
    const exited = new Promise((resolve,reject) => { server.once('error',reject); server.once('exit',(code,signal) => resolve({code,signal})); });
    const requestStop=()=>{ if (!requested && server.connected) { requested=true;server.send({type:'shutdown'},()=>{}); } };
    server.on('message',message => { if(message.type==='stopped') shutdownAck=true; onEvent(message); });
    const ready = new Promise((resolve,reject) => {
      server.on('message',message => { if(message.type==='listening') resolve(message); if(message.type==='startup-error') { requested=true;startupError=new Error('サーバーを起動できません: '+message.error);reject(startupError); } });
      server.once('error',reject);
      server.once('exit',() => reject(new Error('サーバーを起動できません。ポートの使用状況と上のエラーを確認してください。')));
    });
    let primaryError;
    try {
      await ready;
      if(startupError)throw startupError;
      if(server.exitCode!==null)throw new Error('サーバーが終了したため専用画面を開けません。');
      // Installed Edge otherwise exits its bootstrap PID and relaunches a detached main process.
      const browserArgs=[`--user-data-dir=${profile}`,`--app=http://127.0.0.1:${port}${startupPath}`,'--no-first-run','--no-default-browser-check','--disable-background-mode'];
      if (/msedge\.exe$/i.test(browser)) browserArgs.push('--edge-skip-compat-layer-relaunch');
      const browserStarted=Date.now();
      window=spawn(browser,browserArgs,{windowsHide:false,stdio:'ignore'});
      onEvent({type:'browser',pid:window.pid,serverPid:server.pid});
      const browserExit=new Promise((resolve,reject)=>{window.once('error',reject);window.once('exit',(code)=>resolve(code));});
      const outcome=await waitForWindow(browserExit,exited,()=>console.error(startupError?.message??'サーバーが終了しました。専用画面を閉じてから再起動してください。'));
      if (!outcome.browser) throw startupError??new Error('サーバーが予期せず終了しました。専用画面を閉じてから再起動してください。');
      if (Date.now()-browserStarted < 1000) throw new Error('専用画面を維持できませんでした。残っている ACC Designer の専用画面を閉じて再起動してください。');
      if (outcome.code !== 0) throw new Error('ブラウザーの起動または終了に失敗しました。');
    } catch(error) { primaryError=error;throw error; }
    finally {
      requestStop();
      const timer=setTimeout(()=>console.error('終了処理を待っています。保存データの保護のため、このウィンドウは閉じずにお待ちください。'),30000);
      let result;try{result=await exited;}finally{clearTimeout(timer);}
      if (result.code!==0 || !shutdownAck) {
        if (primaryError) console.error('終了状態:',result.code,shutdownAck ? '終了処理済み' : '正常終了未確認');
        else throw startupError??new Error('正常終了を確認できませんでした。上のエラーを確認してください。');
      }
    }
    console.log('ACC Designer を停止しました。');
  } finally { await release(); }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  console.log('ACC Designer を起動しています。専用画面を閉じると自動停止します。');
  console.log('この起動ウィンドウは、アプリの終了まで閉じないでください。');
  try { await launch(); } catch(error) { console.error(error.message);process.exitCode=1; }
}
