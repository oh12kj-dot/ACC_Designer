'use client';
import { useEffect, useState } from 'react';
import type { ImportedPartCandidate } from '../../domain/part/importCandidate';
import { fetchImportCandidate,fetchImportImage } from '../../services/partImportService';

export interface CandidateFields {name?:string;sku?:string;unitPrice?:number;currency?:string}
export default function ImportCandidatePanel({initialUrl='',current,onApply,onImage,onCandidate,disabled=false}: {
  disabled?:boolean;initialUrl?:string;current:CandidateFields;onApply:(candidate:ImportedPartCandidate)=>void;
  onImage?:(file:File)=>Promise<void>;onCandidate?:(candidate:ImportedPartCandidate)=>Promise<void>;
}){
  const [url,setUrl]=useState(initialUrl);const [candidate,setCandidate]=useState<ImportedPartCandidate>();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const [interactive,setInteractive]=useState(false);
  useEffect(()=>setInteractive(true),[]);
  async function fetchCandidate(){setBusy(true);setMessage('');try{const next=await fetchImportCandidate(url);setCandidate(next);if(onCandidate)await onCandidate(next);if(next.status==='failed')setMessage('候補を取得できませんでした。商品情報と画像を手動で登録できます。');}catch{setMessage('取得結果を記録できませんでした。手動登録を続けられます。');}finally{setBusy(false);}}
  async function image(sourceUrl:string){if(!onImage)return;setBusy(true);setMessage('');try{await onImage(await fetchImportImage(sourceUrl));}catch(e){setMessage(e instanceof Error?e.message:'画像を取得できませんでした。ローカル画像を選択してください。');}finally{setBusy(false);}}
  const input='mt-2 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3';
  return <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl">貴和製作所の商品URLから候補取得</h2><p className="mt-2 text-sm leading-6 text-stone-600">取得内容を確認し、必要な値だけ登録フォームへ反映してください。取得・再取得だけでは保存済みパーツは変わりません。</p>
    <label className="mt-4 block">取込元の商品URL<input className={input} type="url" value={url} onChange={e=>setUrl(e.target.value)} disabled={!interactive||busy||disabled}/></label>
    <button type="button" disabled={!interactive||busy||disabled||!url.trim()} className="mt-3 min-h-11 rounded-lg border border-stone-300 px-4 disabled:opacity-50" onClick={()=>void fetchCandidate()}>{busy?'取得中…':candidate?'商品情報を再取得':'商品情報の候補を取得'}</button>
    {message&&<p className="mt-3 text-sm" role="status">{message}</p>}
    {candidate&&<div className="mt-4"><p className="text-sm">取得状態: {candidate.status==='success'?'取得':candidate.status==='partial'?'一部取得':'取得失敗'} / 取得日時: {candidate.fetchedAt}</p>
      {candidate.status!=='failed'&&<>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">項目</th><th className="p-2">現在の値</th><th className="p-2">取得候補</th></tr></thead><tbody>{([['商品名','name'],['商品番号','sku'],['販売単位価格','unitPrice'],['通貨','currency']] as const).map(([label,key])=><tr key={key} className="border-t border-stone-100"><th className="p-2">{label}</th><td className="break-all p-2">{current[key]??'不明'}</td><td className="break-all p-2">{candidate[key]??'未取得'}</td></tr>)}</tbody></table></div>
        <p className="mt-2 text-sm">販売単位: {candidate.packageText??'未取得'} / サイズ表記: {candidate.dimensionsText??'未取得'}</p>
        <p className="mt-2 text-sm text-stone-600">入数・実寸は表記を確認して手動入力してください。価格は円と確認できた候補だけ反映します。</p>
        <button type="button" disabled={busy||disabled} className="mt-3 min-h-11 rounded-lg bg-stone-800 px-4 text-white disabled:opacity-50" onClick={()=>onApply(candidate)}>確認した候補をフォームへ反映</button>
        {onImage&&candidate.imageUrls.map((imageUrl,index)=><div key={imageUrl} className="mt-3"><p className="break-all text-xs text-stone-500">画像候補 {index+1}: {imageUrl}</p><button type="button" disabled={busy||disabled} className="mt-2 min-h-11 rounded-lg border border-stone-300 px-4 disabled:opacity-50" onClick={()=>void image(imageUrl)}>この画像候補を取り込む</button></div>)}
      </>}
    </div>}
  </section>;
}
