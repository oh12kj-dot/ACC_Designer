'use client';
import { useRef } from 'react';
import type { ConnectionPoint,ThroughHole } from '../../types/domain';
import { normalizeDeg } from '../../domain/geometry/transforms';
export default function DefinitionOverlay({url,points,holes,onPoints,onHoles,disabled}:{url:string;points:ConnectionPoint[];holes:ThroughHole[];onPoints:(p:ConnectionPoint[])=>void;onHoles:(h:ThroughHole[])=>void;disabled:boolean}){
 const handle=useRef<{id:string;kind:'point'|'entry'|'exit'}|undefined>(undefined);
 return <div className="mt-4 max-w-md"><div className="relative"><img src={url} crossOrigin="anonymous" alt="接続位置を編集するパーツ画像" className="block w-full"/><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{touchAction:'none'}} aria-label="接続位置の編集" onPointerMove={e=>{if(!handle.current||disabled)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height)),h=handle.current;
  if(h.kind==='point')onPoints(points.map(p=>p.id===h.id?{...p,xNorm:x,yNorm:y}:p));else onHoles(holes.map(p=>{if(p.id!==h.id)return p;const next={...p,...(h.kind==='entry'?{entryXNorm:x,entryYNorm:y}:{exitXNorm:x,exitYNorm:y})};return{...next,axisDeg:normalizeDeg(Math.atan2((next.exitYNorm-next.entryYNorm)*r.height,(next.exitXNorm-next.entryXNorm)*r.width)*180/Math.PI)};}));
 }} onPointerUp={()=>{handle.current=undefined;}} onPointerCancel={()=>{handle.current=undefined;}}>
 {points.map(p=><g key={p.id}><circle cx={p.xNorm*100} cy={p.yNorm*100} r="3" fill="#0284c7" stroke="white" strokeWidth=".5" onPointerDown={e=>{if(disabled)return;handle.current={id:p.id,kind:'point'};e.currentTarget.setPointerCapture(e.pointerId);}}/><text x={p.xNorm*100+3} y={p.yNorm*100+3} fontSize="4">{p.name}</text></g>)}
 {holes.map(h=><g key={h.id}><line x1={h.entryXNorm*100} y1={h.entryYNorm*100} x2={h.exitXNorm*100} y2={h.exitYNorm*100} stroke="#16a34a" strokeWidth="1"/>{(['entry','exit'] as const).map(kind=><circle key={kind} cx={h[kind==='entry'?'entryXNorm':'exitXNorm']*100} cy={h[kind==='entry'?'entryYNorm':'exitYNorm']*100} r="3" fill="#16a34a" stroke="white" strokeWidth=".5" onPointerDown={e=>{if(disabled)return;handle.current={id:h.id,kind};e.currentTarget.setPointerCapture(e.pointerId);}}/>)}</g>)}
 </svg></div><p className="mt-2 text-sm">青い接続点・緑の穴の端をドラッグして位置を調整できます。</p></div>;
}
