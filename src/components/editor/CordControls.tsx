'use client';
import {useEffect,useState} from 'react';
import {matchingCord,validCordLength,type CordProduct,type CordSpecification} from '../../domain/editor/cord';
export default function CordControls({value,products,loading,busy,onChange,onGuide}:{value?:CordSpecification;products:CordProduct[];loading:boolean;busy:boolean;onChange:(v:CordSpecification|undefined)=>void;onGuide:(mm:number)=>void}){
 const [selected,setSelected]=useState(''),[length,setLength]=useState('400'),[unit,setUnit]=useState('mm');
 useEffect(()=>{setSelected(value?.sourceDraftId??'');setLength(String(value?.usedLengthMm??400));setUnit('mm');},[value]);
 const product=products.find(p=>p.sourceDraftId===selected),mm=Number(length)*(unit==='cm'?10:1),current=matchingCord(value,products);
 return <details className="picker-color-details mt-2" open={value?undefined:true}><summary className="min-h-11 cursor-pointer content-center text-sm">使用する紐・使用長さ{value?`：${value.usedLengthMm/10}cm`:''}</summary>
 <fieldset disabled={busy||loading} className="py-2">
 <label className="block text-xs">紐の商品・サイズ<select aria-label="紐の商品・サイズ" className="mt-1 min-h-11 w-full border px-2" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">商品を選んでください</option>{value&&!products.some(p=>p.sourceDraftId===value.sourceDraftId)&&<option value={value.sourceDraftId}>{value.title}（情報の再確認が必要）</option>}{products.map(p=><option key={p.sourceDraftId} value={p.sourceDraftId}>{p.title}{!p.available?'（掲載時在庫なし）':''}</option>)}</select></label>
 <p className="mt-2 text-xs">{loading?'商品を読み込み中…':product?`商品の太さ：${product.diameterMm===null?'径未確認（掲載サイズ：'+product.sizeText+'）':product.diameterMm+'mm'}`:'掲載情報を照合できたテグス・ゴム糸・ナイロンコートワイヤーから選べます。'}</p>
 {product&&<a className="text-xs underline" href={product.sourceUrl} target="_blank" rel="noreferrer">公式の商品情報</a>}
 <div className="mt-2 flex gap-2"><label className="min-w-0 flex-1 text-xs">使用する長さ<input aria-label="紐の使用長さ" className="mt-1 min-h-11 w-full border px-2" type="number" min="0" step="any" value={length} onChange={e=>setLength(e.target.value)}/></label><label className="text-xs">単位<select aria-label="紐の長さの単位" className="mt-1 min-h-11 border px-2" value={unit} onChange={e=>{const next=e.target.value;setLength(String(Number(length)*(unit==='cm'?10:1)/(next==='cm'?10:1)));setUnit(next);}}><option>mm</option><option>cm</option></select></label></div>
 <p className="mt-1 text-xs">{validCordLength(mm)?`${mm}mm ＝ ${mm/10}cm`:'0より大きい長さを指定してください（最大1000m）。'}</p>
 <button type="button" className="mt-2 min-h-11 rounded-lg border px-3 text-sm" disabled={!product||!validCordLength(mm)} onClick={()=>product&&onChange({...product,version:1,usedLengthMm:mm})}>この紐・長さを使う</button>
 {value&&<><p className="mt-2 text-xs">設定済み：{value.title}／{value.usedLengthMm}mm（{value.usedLengthMm/10}cm）</p>{!current&&!loading&&<p role="status" className="mt-1 text-xs text-amber-800">保存時の商品情報を再確認できません。太さは未確認として扱います。商品を選び直してください。</p>}<button type="button" className="mt-2 min-h-11 rounded-lg border px-3 text-xs" onClick={()=>onGuide(value.usedLengthMm)}>この長さを配置ガイドに反映</button><button type="button" className="ml-2 mt-2 min-h-11 border px-2 text-xs" onClick={()=>onChange(undefined)}>紐の設定を解除</button></>}
 <p className="mt-2 text-xs">商品と使用長さは「保存」でデザインに記録します。「紐の配置範囲・結び代」を設定する場合は、確保分を含む切る長さを指定してください。材料・見積もり欄で紐の購入額を別に確認できます。実際の接続は自動追加しません。</p>
 </fieldset></details>;
}
