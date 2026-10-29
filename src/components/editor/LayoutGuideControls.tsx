'use client';
import {useEffect,useState} from 'react';
import {guideLengthMm,resizeGuideLength,type LayoutGuide} from '../../domain/editor/layoutGuide';
import {readGuidePreference,saveGuidePreference} from '../../services/editorPreferences';
const input='min-h-11 rounded border border-stone-300 px-2';
export default function LayoutGuideControls({guide,onChange,onCenter,onFit,storageKey,geometryLocked=false}:{guide:LayoutGuide;onChange:(value:LayoutGuide)=>void;onCenter:()=>void;onFit:()=>void;storageKey?:string;geometryLocked?:boolean}){
 const length=guideLengthMm(guide),[lengthInput,setLengthInput]=useState(''),[error,setError]=useState(''),[restoredKey,setRestoredKey]=useState<string>(),[storageError,setStorageError]=useState(false);
 useEffect(()=>{const saved=readGuidePreference(storageKey);if(saved)onChange(saved);setRestoredKey(storageKey);},[storageKey]);
 useEffect(()=>{if(storageKey&&restoredKey===storageKey)setStorageError(!saveGuidePreference(storageKey,guide));},[storageKey,restoredKey,guide]);
 useEffect(()=>{setLengthInput(length===undefined?'':String(Number(length.toFixed(2))));setError('');},[length]);
 function applyLength(){try{onChange(resizeGuideLength(guide,Number(lengthInput)));setError('');}catch(e){setError((e as Error).message);}}
 return <section aria-label="形状ガイド" className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3">
  <h2 className="font-medium">ネックレスの形状ガイド</h2><p className="text-xs text-stone-600">紐に沿ってパーツを並べる配置用ガイドです。材料一覧には追加しません。設定はこのブラウザーで、デザインごとに記憶します。</p>
  {geometryLocked&&<p className="mt-2 text-xs">保存した紐の配置範囲を表示しています。形・幅の変更は、先に「紐の配置範囲」を解除してから再設定してください。</p>}<div className="mt-2 flex flex-wrap items-center gap-3">
   <label>紐の長さ（ガイド沿い・mm）<input className={`${input} ml-2 w-28`} disabled={geometryLocked} type="number" min="0.1" max="10000" step="1" value={lengthInput} onChange={e=>setLengthInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyLength();}}}/></label>
   <button className={input} disabled={geometryLocked} onClick={applyLength}>紐の長さを適用</button>
   <span aria-label="ガイドに沿った実寸長さ">{length===undefined?'長さ未設定':`${length.toFixed(1)} mm（${(length/10).toFixed(1)} cm）`}</span>
  </div>
  <p className="text-xs text-stone-600">ガイドの端から端までの長さです。留め具・結び代は含みません。適用すると形の比率を保って幅・下がりを調整します。配置済みのパーツは移動しません。</p>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {storageError&&<p role="status" className="text-sm text-amber-900">このブラウザーではガイド設定を記憶できません。</p>}
  <div className="mt-2 flex flex-wrap items-center gap-3">
   <label className="inline-flex min-h-11 items-center gap-1"><input type="checkbox" disabled={geometryLocked} checked={guide.enabled} onChange={e=>onChange({...guide,enabled:e.target.checked})}/>ガイドを表示</label>
   <label>ガイドの形<select className={`${input} ml-2`} disabled={geometryLocked} value={guide.shape} onChange={e=>onChange({...guide,shape:e.target.value as 'u'|'v'})}><option value="u">U字</option><option value="v">V字（トップ構成の目安）</option></select></label>
   <label>ガイドの幅（mm）<input className={`${input} ml-2 w-24`} disabled={geometryLocked} type="number" min="1" step="1" value={Number.isFinite(guide.width)&&guide.width?Number(guide.width.toFixed(2)):''} onChange={e=>onChange({...guide,width:Number(e.target.value)})}/></label>
   <label>ガイドの下がり（mm）<input className={`${input} ml-2 w-24`} disabled={geometryLocked} type="number" min="1" step="1" value={Number.isFinite(guide.drop)&&guide.drop?Number(guide.drop.toFixed(2)):''} onChange={e=>onChange({...guide,drop:Number(e.target.value)})}/></label>
   <button className={input} disabled={geometryLocked} onClick={onCenter}>ガイドを画面中央へ</button><button className={input} disabled={!guide.enabled||guide.width<=0||guide.drop<=0} onClick={onFit}>ガイド全体を表示</button>
  </div>
  {guide.shape==='v'&&<p className="my-2 text-sm text-amber-900">V字はトップや接続部品を使う構成の目安です。チェーンがこの鋭い角度で自然に垂れることを保証するものではありません。</p>}
  <div className="flex flex-wrap items-center gap-3">
   <label className="inline-flex min-h-11 items-center gap-1"><input type="checkbox" checked={guide.snap} onChange={e=>onChange({...guide,snap:e.target.checked})}/>近くでガイドに吸着</label>
   <label className="inline-flex min-h-11 items-center gap-1"><input type="checkbox" checked={guide.rotate} onChange={e=>onChange({...guide,rotate:e.target.checked})}/>向きも自動調整</label>
   <label>写真の向き補正（°）<input className={`${input} ml-2 w-24`} type="number" step="15" value={guide.offset} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))onChange({...guide,offset:n});}}/></label>
  </div>
  <p className="text-xs text-stone-600">新しいパーツと未接続・未固定のパーツが対象です。登録された穴の軸を紐に沿わせます。穴の向きが未確認の場合は写真の上↔下を仮の基準にします。異なる軸の穴が複数ある場合は手動調整してください。実際の接続は作成しません。</p>
  {guide.enabled&&(guide.width<=0||guide.drop<=0)&&<p role="status" className="text-sm text-red-700">幅と下がりに正の数を入力してください。</p>}
 </section>;
}
