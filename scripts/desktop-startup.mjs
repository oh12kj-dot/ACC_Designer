import {randomBytes} from 'node:crypto';
export const startupPath='/__acc_desktop_start';
export const statusPath='/__acc_desktop_status';

// Only the desktop server serves this page. No DB token or shutdown HTTP API.
export function serveStartup(req,res,status){
 if(req.url!==startupPath&&req.url!==statusPath)return false;
 if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end();return true;}
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(req.url===statusPath){res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({status}));return true;}
 const nonce=randomBytes(18).toString('base64');
 res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`});
 res.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACC Designer</title>
<style nonce="${nonce}">body{margin:0;background:#f6f5f0;color:#333b36;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center}main{padding:36px;max-width:460px}h1{font-size:26px;font-weight:500;letter-spacing:.06em}p{line-height:1.8}progress{width:100%;height:5px;accent-color:#748776}.note{font-size:14px;color:#66706a}</style>
<main><h1>ACC Designer</h1><p id="message" role="status" aria-live="polite">保存データを確認しています…</p><progress id="progress" aria-label="起動の準備中"></progress><p id="note" class="note">準備ができると自動的に画面が切り替わります。</p></main>
<script nonce="${nonce}">const fail=()=>{document.getElementById('message').textContent='起動できませんでした。';document.getElementById('note').textContent='この画面を閉じて、起動ウィンドウの案内を確認してください。';document.getElementById('progress').hidden=true;};async function poll(){try{const r=await fetch('${statusPath}',{cache:'no-store'});if(!r.ok)throw Error();const s=await r.json();if(s.status==='ready'){location.replace('/');return;}if(s.status!=='loading'){fail();return;}setTimeout(poll,250);}catch{fail();}}poll();</script></html>`);
 return true;
}

// Retain launcher ownership until its own window is gone, including server failure.
export async function waitForWindow(browserExit,serverExit,onServerExit){
 const outcome=await Promise.race([browserExit.then(code=>({browser:true,code})),serverExit.then(result=>({browser:false,...result}))]);
 if(!outcome.browser){onServerExit();await browserExit;}
 return outcome;
}
