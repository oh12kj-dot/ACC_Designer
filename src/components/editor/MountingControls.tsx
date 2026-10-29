'use client';
import{useEffect,useState}from'react';import{defaultMounting,type MountingSettings}from'../../domain/editor/mounting';
export default function MountingControls({value,onChange,storageKey,clearance,productSelected=false}:{value:MountingSettings;onChange:(v:MountingSettings)=>void;storageKey:string;clearance:number;productSelected?:boolean}){
 const[failed,setFailed]=useState(false);
 useEffect(()=>{let next=defaultMounting();try{const r=JSON.parse(localStorage.getItem(storageKey)??'null');if(r?.version===1&&['all','through','glue'].includes(r.mode)&&typeof r.diameter==='string'&&r.diameter.length<64)next={mode:r.mode,diameter:r.diameter};}catch{}onChange(next);},[storageKey]);
 function change(next:MountingSettings){onChange(next);try{localStorage.setItem(storageKey,JSON.stringify({version:1,...next}));setFailed(false);}catch{setFailed(true);}}
 return <details className="picker-color-details mt-2"><summary className="min-h-11 cursor-pointer content-center text-xs">取り付け方・紐の太さ{value.mode==='through'?'：直接通す':value.mode==='glue'?'：台座へ貼り付ける':''}</summary>
  <label className="mt-2 block text-xs">取り付け方<select aria-label="取り付け方" className="min-h-11 w-full border px-2" value={value.mode} onChange={e=>change({...value,mode:e.target.value as MountingSettings['mode']})}><option value="all">指定せず探す</option><option value="through">紐に直接通す</option><option value="glue">台座へ貼り付ける</option></select></label>
  {value.mode==='through'&&<><label className="mt-2 block text-xs">{productSelected?'選んだ商品の太さ（mm）':'その他の紐の太さ（mm・手入力）'}<input aria-label="紐の太さ（mm）" readOnly={productSelected} className="min-h-11 w-full border px-2" type="number" min="0.01" step="0.01" value={value.diameter} onChange={e=>change({...value,diameter:e.target.value})}/></label>{productSelected&&!value.diameter&&<p className="text-xs">商品の径は未確認です。</p>}<p className="mt-2 text-xs">円形の紐を1本通す条件で比較します。径の余裕は{clearance}mm。穴径不足・通し穴なしは選択不可、未確認品は注意付きで選べます。掲載値による目安で、実物の通過保証ではありません。</p></>}
  {value.mode==='glue'&&<p className="mt-2 text-xs">穴なしも選べます。穴のある台座などへ接着する構成の目安です。台座や接着剤の適合は未確認で、接続・台座の自動追加は行いません。</p>}
  {failed&&<p role="status" className="text-xs">このブラウザーでは取り付け設定を記憶できません。</p>}
 </details>;
}
