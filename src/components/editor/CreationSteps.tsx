'use client';
import type{ReactNode}from'react';
export default function CreationSteps({necklace,step,onStep,lengthCaption,length,materials,completion}:{necklace:boolean;step:number;onStep:(step:number)=>void;lengthCaption?:string;length:ReactNode;materials:ReactNode;completion:ReactNode}){
 const steps=necklace?[[1,'長さ'],[2,'紐・留め具'],[3,'パーツ配置'],[4,'完成確認']] as const:[[3,'パーツ配置'],[4,'完成確認']] as const;
 return <section className="creation-workflow" aria-label="作成手順"><nav aria-label="デザインの作り方"><ol className="editor-steps guided-steps">{steps.map(([number,label])=><li key={number} aria-current={step===number?'step':undefined}><button type="button" aria-label={`${necklace?number:number-2} ${label}`} onClick={()=>onStep(number)} aria-current={step===number?'step':undefined}><span>{necklace?number:number-2}</span><strong>{label}</strong>{number===1&&lengthCaption&&<small>{lengthCaption}</small>}</button></li>)}</ol></nav>
 <div className="workflow-panel" id="workflow-panel" tabIndex={-1}>{step===1&&necklace&&<><h2>① 仕上がりの長さを確認</h2>{length}<button type="button" className="studio-primary" onClick={()=>onStep(2)}>次へ：紐・留め具</button></>}
 {step===2&&necklace&&<><h2>② 紐・留め具を選ぶ</h2><p>材料と太さを確認し、必要な留め具を選びます。未定の場合は後で戻って設定できます。</p>{materials}<button type="button" className="studio-primary" onClick={()=>onStep(3)}>次へ：パーツ配置</button></>}
 {step===3&&<div className="placement-step-intro"><div><h2>{necklace?'③':'①'} パーツを探して配置</h2><p>写真を選び、キャンバスで置く場所を決めます。配置したら完成前チェックへ進んでください。</p></div><button type="button" className="studio-primary" onClick={()=>onStep(4)}>完成前チェックへ</button></div>}
 {step===4&&<>{completion}<button type="button" className="design-secondary" onClick={()=>onStep(3)}>パーツ配置に戻る</button></>}
 </div></section>;
}
