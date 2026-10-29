'use client';
const button='min-h-11 rounded border border-stone-300 bg-white px-3 disabled:opacity-50';
export default function SelectionActions({name,locked,busy,canRotate,nominal,anchor,onMove,onRotate,onDelete,onShape}:{name:string;locked:boolean;busy:boolean;canRotate:boolean;nominal:boolean;anchor:{x:number;y:number};onMove:(x:number,y:number)=>void;onRotate:(angle:number)=>void;onDelete:()=>void;onShape?:()=>void}){
 return <section aria-label="選択パーツの操作" className="z-10 m-2 rounded-lg border border-sky-200 bg-white/95 p-2 shadow lg:absolute lg:m-0 lg:w-[280px]" style={{left:`clamp(8px, ${anchor.x/9}%, calc(100% - 288px))`,top:`clamp(8px, ${anchor.y/7}% + 20px, calc(100% - 210px))`}}>
  <p className="break-words text-sm font-medium">選択中: {name}</p><p className="text-xs text-stone-600">{locked?'固定中です。詳細操作で固定を解除できます。':'ドラッグで移動 · 矢印は1mmずつ移動'}</p>
  <fieldset disabled={busy||locked} className="mt-2 flex flex-wrap gap-1">
   <legend className="sr-only">位置と向き</legend>
   <button className={button} aria-label="左へ1mm" onClick={()=>onMove(-1,0)}>←</button><button className={button} aria-label="上へ1mm" onClick={()=>onMove(0,-1)}>↑</button><button className={button} aria-label="下へ1mm" onClick={()=>onMove(0,1)}>↓</button><button className={button} aria-label="右へ1mm" onClick={()=>onMove(1,0)}>→</button>
   {canRotate&&<><button className={button} onClick={()=>onRotate(-15)}>左に15°回転</button><button className={button} onClick={()=>onRotate(15)}>右に15°回転</button></>}
   {onShape&&<button className={button} onClick={onShape}>両端をドラッグして編集</button>}
   <button className={`${button} text-red-700`} onClick={onDelete}>選択した素材を削除</button>
  </fieldset>
  {nominal&&<p className="mt-1 text-xs text-amber-800">接続位置・穴は未登録です。写真の位置合わせとして配置します。</p>}
 </section>;
}
