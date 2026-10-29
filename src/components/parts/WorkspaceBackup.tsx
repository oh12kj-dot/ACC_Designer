'use client';
import { useState } from 'react';
import { isLocalWorkspace } from '../../lib/supabase/client';
export default function WorkspaceBackup(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 if(!isLocalWorkspace())return null;
 async function operation(action:'export-set'|'import',file?:File){setBusy(true);setMessage(action==='export-set'?'バックアップを準備しています。保存内容が多い場合は時間がかかります。':'');try{
  if(file&&file.size>128*1024*1024)throw new Error('バックアップは128MBまでです');
  const bootstrap=await fetch('/api/local/workspace',{cache:'no-store'}).then(r=>r.json());if(!bootstrap.token)throw new Error('端末保存に接続できません');
  const response=await fetch('/api/local/workspace',{method:'POST',headers:{'Content-Type':'application/json','x-catalog-token':bootstrap.token},body:JSON.stringify({action,...(file?{package:JSON.parse(await file.text())}:{})})});const result=await response.json();if(!response.ok||result.error)throw new Error(result.error?.message??'バックアップ操作に失敗しました');
  if(action==='export-set'){if(!/^[0-9a-f-]{36}$/.test(result.data?.id)||result.data.url!=='/api/local/workspace?backup='+result.data.id)throw new Error('バックアップの保存先を確認できません');const link=document.createElement('a');link.href=result.data.url;link.download='accessory-workspace-'+new Date().toISOString().slice(0,10)+'.accbackup.ndjson';document.body.appendChild(link);link.click();link.remove();setMessage('バックアップを用意しました。ブラウザーのダウンロードを確認してください。収集カタログは含まれません。');}
  else setMessage(result.data.unchanged?'現在の保存内容と一致しています。変更はありません。':'バックアップを復元しました。画面を再読み込みしてください。');
 }catch(e){setMessage(e instanceof Error?e.message:'バックアップ操作に失敗しました');}finally{setBusy(false);}}
 return <section className="mt-8 rounded-xl border bg-white p-5"><h2 className="text-xl">端末保存のバックアップ</h2><p className="mt-3 text-sm">保存済みパーツ、元画像、デザインを、容量に応じて小分けに処理し、1つのファイルへ書き出します。収集カタログ・登録候補・画像審査の作業ファイルは別途保持してください。大きいバックアップはアプリを停止して復元ツールから復元します。既存の保存内容は上書きしません。</p><button disabled={busy} className="mt-4 min-h-11 rounded border px-4 disabled:opacity-50" onClick={()=>void operation('export-set')}>バックアップを書き出す</button><label className="mt-4 block">以前の小さいバックアップを確認・復元<input className="mt-2 block" type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void operation('import',file);e.target.value='';}}/></label>{message&&<p role="status" className="mt-3">{message}</p>}</section>;
}
