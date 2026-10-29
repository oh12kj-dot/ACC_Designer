'use client';
import {automaticSpacingMm} from '../../domain/editor/placement';
import type {Placement} from '../../domain/editor/placement';
export default function BatchPlacementControls({placement,onChange}:{placement:Placement;onChange:(value:Placement)=>void}){
 const mode=placement.spacingMode??(placement.spacingMm===undefined?'auto':'manual'),automatic=automaticSpacingMm(placement.part);
 function countChanged(value:string){const count=Number(value),old=placement.copyIds??[placement.id];const amount=Number.isInteger(count)&&count>=1&&count<=100?count:1;const ids=Array.from({length:amount},(_,i)=>old[i]??crypto.randomUUID());onChange({...placement,count,copyIds:ids});}
 return <div className="my-2 flex flex-wrap items-center gap-3 text-sm">
  <label>配置する個数<input className="ml-2 min-h-11 w-20 rounded border bg-white px-2" type="number" min="1" max="100" step="1" disabled={placement.part.geometryKind==='path'} value={placement.count??1} onChange={e=>countChanged(e.target.value)}/></label>
  {placement.part.geometryKind==='node'?<><label>間隔の決め方<select className="ml-2 min-h-11 rounded border bg-white px-2" value={mode} onChange={e=>onChange({...placement,spacingMode:e.target.value as 'auto'|'manual',spacingMm:e.target.value==='manual'?(automatic??10):undefined})}><option value="auto">サイズに合わせる</option><option value="manual">中心間隔を指定</option></select></label>
   {mode==='manual'?<label>中心間隔（mm）<input className="ml-2 min-h-11 w-24 rounded border bg-white px-2" type="number" min="0.01" max="10000" step="any" value={placement.spacingMm??10} onChange={e=>onChange({...placement,spacingMm:Number(e.target.value)})}/></label>:<span className="text-xs">{automatic?`登録幅 ${Number(automatic.toFixed(2))}mm を基準に並べます`:'サイズ未確認：複数配置の間隔を手動指定してください'}</span>}
   <p className="text-xs">自動間隔は登録サイズを基準に詰めて並べます。写真の余白や形状により見た目は異なります。ガイドの近くでは線に沿って並びます。</p></>:<p className="text-xs">チェーン・ひもは1本ずつ配置します。</p>}
 </div>;
}
