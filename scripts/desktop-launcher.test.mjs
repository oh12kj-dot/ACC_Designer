import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acquireLauncherLock,pipeName,root,findBrowser} from './desktop-launcher.mjs';
import {launch} from './desktop-launcher.mjs';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';

test('desktop lock rejects a second owner and is reusable after normal release',async()=>{
 const directory=root+'-launcher-test';
 const release=await acquireLauncherLock(directory);
 try { await assert.rejects(acquireLauncherLock(directory),{code:'EADDRINUSE'}); }
 finally { await release(); }
 const again=await acquireLauncherLock(directory);await again();
 assert.equal(pipeName(directory),pipeName(directory.toUpperCase()));
 assert.notEqual(pipeName(directory),pipeName(directory+'-other'));
});
test('desktop browser discovery finds an installed executable',async()=>{
 assert.match(await findBrowser(),/\\chrome\.exe$/);
});
test('occupied port never attaches to or stops an unrelated listener',async()=>{
 const listener=createServer(socket=>socket.end());
 await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));
 try{await assert.rejects(launch({port:listener.address().port,env:{...process.env,ACC_LOCAL_WORKSPACE_TEST_ID:randomUUID()}}),/サーバーを起動できません/);assert.ok(listener.listening);}
 finally{await new Promise(resolve=>listener.close(resolve));}
});
test('browser spawn failure closes only the owned server',async()=>{
 const events=[];
 await assert.rejects(launch({port:3418,browser:join(root,'missing-browser.exe'),env:{...process.env,ACC_LOCAL_WORKSPACE_TEST_ID:randomUUID()},onEvent:e=>events.push(e)}),/ENOENT/);
 assert.ok(events.some(e=>e.type==='stopped'&&e.workspaceClosed));
});
