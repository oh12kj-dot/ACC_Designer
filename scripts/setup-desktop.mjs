import {spawn} from 'node:child_process';
import {findBrowser,root} from './desktop-launcher.mjs';

async function npm(command){
 const child=spawn('cmd.exe',['/d','/s','/c',`npm.cmd ${command}`],{cwd:root,stdio:'inherit',windowsHide:true});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 if(code!==0)throw new Error(`${command} に失敗しました。表示されたエラーを確認してください。`);
}
try{
 if(process.platform!=='win32')throw new Error('このセットアップは Windows 専用です。');
 if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node.js 24 以降をインストールしてください。');
 await findBrowser();
 console.log('必要なファイルをインストールし、起動用アプリを作成します。数分かかる場合があります。');
 await npm('ci');await npm('run build');
 console.log('セットアップが完了しました。ACC_Designer.bat をダブルクリックして起動してください。');
}catch(error){console.error(error.message);process.exitCode=1;}
