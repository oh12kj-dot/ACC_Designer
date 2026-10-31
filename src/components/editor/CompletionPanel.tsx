'use client';
import{useMemo}from'react';import type{DesignAggregate}from'../../types/aggregate';import type{Part}from'../../types/domain';
import{completionCheck,type CheckTarget}from'../../domain/editor/completionCheck';
export default function CompletionPanel({aggregate,parts,pending,onTarget,onStep}:{aggregate:DesignAggregate;parts:Part[];pending:boolean;onTarget:(target:CheckTarget)=>void;onStep:(step:number)=>void}){
 const report=useMemo(()=>completionCheck(aggregate,parts),[aggregate,parts]);
 return <section aria-label="完成前チェック" className="completion-panel"><h2>{aggregate.design.type==='necklace'?'④':'②'} 完成前チェック</h2><p role="status">問題あり {report.problems} 件 · 要確認 {report.reviews} 件{pending?' · 確定前の配置があります':''}</p><p className="length-help">現在の編集内容を確認しています。未確認を合格にせず、実物の組み立て・着用の確認は別に必要です。</p>
 {pending&&<p className="check-problem">配置プレビューは集計に含まれません。③で配置を確定するか、キャンセルしてください。<button onClick={()=>onStep(3)}>配置へ戻る</button></p>}
 {report.issues.length?<ul className="completion-issues">{report.issues.map(issue=><li key={issue.id} className={issue.level==='problem'?'check-problem':'check-review'}><strong>{issue.level==='problem'?'問題あり':'要確認'} · {issue.title}</strong><p>{issue.detail}</p><button type="button" onClick={()=>issue.target?onTarget(issue.target):onStep(issue.step)}>{issue.target?'該当パーツを確認':'設定・配置を確認'}</button></li>)}</ul>:<p>このチェックで見つかった項目はありません。実物の適合・強度・仕上がりを保証する判定ではありません。</p>}
 <h3>必要数量・購入量</h3><p className="length-help">配置済みの使用量と購入すべき販売単位数です。在庫の有無・不足数は判定していません。</p>
 {report.quantities.length?<div className="completion-quantity-scroll"><table><thead><tr><th>パーツ</th><th>使用量</th><th>購入単位数</th><th>確認</th></tr></thead><tbody>{report.quantities.map(item=>{const n=aggregate.nodes.find(n=>n.partId===item.partId),p=aggregate.paths.find(p=>p.partId===item.partId);return <tr key={item.partId}><td>{item.name}</td><td>{item.lengthMm?`${item.lengthMm.toFixed(1)} mm`:`${item.count} 個`}</td><td>{item.purchaseUnits??'条件未確認'}</td><td><button type="button" aria-label={`${item.name}の使用箇所を確認`} onClick={()=>onTarget(n?{kind:'node',id:n.id}:{kind:'path',id:p!.id})}>使用箇所</button></td></tr>;})}</tbody></table></div>:<p>配置すると必要数量を表示します。</p>}
 </section>;
}
