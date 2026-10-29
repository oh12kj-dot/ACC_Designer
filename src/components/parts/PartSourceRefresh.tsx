'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { Part } from '../../types/domain';
import { getWorkspaceClient as getBrowserSupabase } from '../../lib/supabase/client';
import { SupabasePartRepository } from '../../services/partRepository';
import { candidateSnapshot,type ImportedPartCandidate } from '../../domain/part/importCandidate';
import { toRow } from '../../services/databaseMapping';
import ImportCandidatePanel from './ImportCandidatePanel';

export default function PartSourceRefresh({partId}:{partId:string}){
  const [part,setPart]=useState<Part>();const [candidate,setCandidate]=useState<ImportedPartCandidate>();const [name,setName]=useState('');const [sku,setSku]=useState('');const [price,setPrice]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('読み込み中…');
  useEffect(()=>{let active=true;void(async()=>{try{const value=await new SupabasePartRepository(getBrowserSupabase()).get(partId);if(active){setPart(value);setName(value.name);setSku(value.sku??'');setPrice(value.purchaseSpec?.unitPrice===undefined?'':String(value.purchaseSpec.unitPrice));setMessage('');}}catch{if(active)setMessage('パーツを読み込めませんでした。接続とログインを確認してください。');}})();return()=>{active=false;};},[partId]);
  async function record(next:ImportedPartCandidate){
    const {error}=await getBrowserSupabase().rpc('record_part_source_snapshot',{part_id:part?.id??partId,snapshot:toRow(candidateSnapshot(next))});if(error)throw error;
  }
  async function apply(){if(!part||!candidate)return;setBusy(true);try{
    const parsedPrice=price.trim()===''?undefined:Number(price);if(parsedPrice!==undefined&&(!Number.isFinite(parsedPrice)||parsedPrice<0))throw new Error('価格が不正です');
    const result=await new SupabasePartRepository(getBrowserSupabase()).save(part.id,{part:{name:name.trim(),sku:sku.trim(),sourceUrl:candidate.sourceUrl,sourceCheckedAt:candidate.fetchedAt,importSource:'kiwa_url',importStatus:candidate.status==='success'?'imported':'partial'},purchaseSpec:part.purchaseSpec?{...part.purchaseSpec,unitPrice:parsedPrice}:undefined});
    setMessage(result.createdSuccessor?'後継パーツを作成しました。既存デザインのパーツ・画像・価格は維持されています。':'確認した商品情報を保存しました。');setCandidate(undefined);
    const value=await new SupabasePartRepository(getBrowserSupabase()).get(result.partId);setPart(value);
  }catch(e){setMessage(e instanceof Error?e.message:'反映できませんでした');}finally{setBusy(false);}}
  const field='mt-2 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3';
  return <main className="mx-auto max-w-4xl px-5 py-10"><Link href="/parts" className="inline-flex min-h-11 items-center">← パーツ一覧</Link><h1 className="mt-4 text-3xl font-semibold">商品情報の再取得</h1>{message&&<p className="mt-4" role="status">{message}</p>}{part&&<>
    <h2 className="mt-4 text-xl">{part.name}</h2><ImportCandidatePanel disabled={busy} key={part.id} initialUrl={part.sourceUrl} current={{name:part.name,sku:part.sku,unitPrice:part.purchaseSpec?.unitPrice,currency:part.purchaseSpec?.currency}} onCandidate={record} onApply={next=>{setCandidate(next);setName(next.name??part.name);setSku(next.sku??part.sku??'');setPrice(next.currency==='JPY'&&next.unitPrice!==undefined?String(next.unitPrice):part.purchaseSpec?.unitPrice===undefined?'':String(part.purchaseSpec.unitPrice));}}/>
    {candidate&&<section className="mt-6 rounded-xl border border-stone-200 bg-white p-5"><h2 className="text-xl">保存前の確認</h2><p className="mt-2 text-sm">画像・実寸・販売単位は変更しません。参照済みパーツは後継として保存します。</p><label className="mt-3 block">更新する商品名<input disabled={busy} className={field} value={name} onChange={e=>setName(e.target.value)}/></label><label className="mt-3 block">更新する商品番号<input disabled={busy} className={field} value={sku} onChange={e=>setSku(e.target.value)}/></label><label className="mt-3 block">更新する価格（円・不明なら空欄）<input disabled={busy||!part.purchaseSpec} className={field} type="number" min="0" step="any" value={price} onChange={e=>setPrice(e.target.value)}/></label><button disabled={busy||!name.trim()} className="mt-4 min-h-11 rounded-lg bg-stone-800 px-4 text-white disabled:opacity-50" onClick={()=>void apply()}>確認した変更を保存</button></section>}
  </>}</main>;
}
