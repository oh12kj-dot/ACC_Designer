import type{DesignAggregate}from'../../types/aggregate';import type{Part}from'../../types/domain';
import{validateDesignAggregate}from'./validateDesign';import{necklaceSetup}from'./necklaceSetup';
import{designClearance,materialDiameter}from'../compatibility/settings';
import{throughCompatibility,pointCompatibility,pathPositionCompatibility}from'../compatibility/check';
import{mountingAssessment}from'./mounting';import{nodePart}from'../geometry/nodePart';
import{billOfMaterials}from'../purchase/bom';import{cordBudget,type CordLayout}from'./studio';import type{CordSpecification}from'./cord';
export interface CheckTarget{kind:'node'|'path';id:string}
export interface CompletionIssue{id:string;level:'problem'|'review';title:string;detail:string;target?:CheckTarget;step:1|2|3}
function assessed(check:()=>{status:string;reasons:string[]}){try{return check();}catch(e){return{status:'incompatible',reasons:[e instanceof Error?e.message:'寸法の入力値を確認してください。']};}}
export function completionCheck(a:DesignAggregate,parts:Part[]){
 const issues:CompletionIssue[]=[],add=(issue:CompletionIssue)=>issues.push(issue),cord=a.design.editorConfig?.cordSpecification as CordSpecification|undefined;let clearance:number;
 try{clearance=designClearance(a);}catch(e){return{issues:[{id:'clearance',level:'problem' as const,title:'接続の余裕寸法を確認してください',detail:e instanceof Error?e.message:'設定が不正です。',step:3 as const}],quantities:[],problems:1,reviews:0};}
 const required=[...a.nodes.map(n=>({kind:'node' as const,id:n.id,partId:n.partId})),...a.paths.map(p=>({kind:'path' as const,id:p.id,partId:p.partId}))];
 for(const item of required)if(!parts.some(p=>p.id===item.partId))add({id:'missing-'+item.id,level:'problem',title:'パーツ情報を読み込めません',detail:'再読み込みして、使用中のパーツを確認してください。',target:item,step:3});
 try{validateDesignAggregate(a,parts);}catch(e){add({id:'structure',level:'problem',title:'配置・接続の設定を確認してください',detail:e instanceof Error?e.message:'保存内容の整合性を確認できません。',step:3});}
 if(!required.length)add({id:'empty',level:'review',title:'まだパーツが配置されていません',detail:'パーツを選び、キャンバスに配置してください。',step:3});
 if(a.design.type==='necklace'){
  if(!necklaceSetup(a.design))add({id:'length',level:'review',title:'仕上がりの目標長さが未設定です',detail:'①で目標を設定してください。実際の材料長とは別です。',step:1});
  if(!cord&&!a.paths.some(p=>['wire','string','cord','thread','chain'].includes(parts.find(x=>x.id===p.partId)?.category??'')))add({id:'cord',level:'review',title:'紐・チェーンが未選択です',detail:'②で使用する材料と太さを確認してください。',step:2});
  if(!required.some(e=>parts.find(p=>p.id===e.partId)?.category==='clasp'))add({id:'clasp',level:'review',title:'留め具・端の仕上げを確認してください',detail:'留め具を使う場合は配置してください。使わない場合も結び方・着脱方法の確認が必要です。',step:2});
 }
 const report=(id:string,title:string,r:{status:string;reasons:string[]},target:CheckTarget)=>{if(r.status!=='compatible')add({id,level:r.status==='incompatible'?'problem':'review',title,detail:r.reasons.join(' '),target,step:3});};
 for(const n of a.nodes){const p=nodePart(a,n,parts);if(!p)continue;const target={kind:'node' as const,id:n.id};
  if(p.metadata?.nominalPlacement?.imageScaleVerified===false)add({id:'scale-'+n.id,level:'review',title:p.name+'：画像の実寸は未確認です',detail:'掲載寸法による目安配置です。製作前に実物の大きさを確認してください。',target,step:3});
  const through=a.throughAttachments.find(e=>e.nodeId===n.id),pathAttach=a.pathAttachments.find(e=>e.nodeId===n.id),point=a.pointAttachments.some(e=>e.nodeAId===n.id||e.nodeBId===n.id);
  if(!through&&!pathAttach&&!point){add({id:'loose-'+n.id,level:'review',title:p.name+'：実接続が未設定です',detail:'見た目の配置・表示グループは接続の確認を意味しません。通す・接続する・接着する方法を確認してください。',target,step:3});
   if(cord){const check=mountingAssessment(p,{mode:'through',diameter:cord.diameterMm==null?'':String(cord.diameterMm)},clearance);if(check.blocked||check.warning)add({id:'cord-fit-'+n.id,level:'review',title:p.name+'：選択中の紐に通す場合の確認',detail:check.text+' 直接通す想定でない場合は、別の取り付け方を確認してください。',target,step:3});}
  }
 }
 for(const e of a.throughAttachments){const n=a.nodes.find(n=>n.id===e.nodeId),p=nodePart(a,n,parts),path=a.paths.find(p=>p.id===e.pathId),material=parts.find(p=>p.id===path?.partId),hole=p?.throughHoles.find(h=>h.id===e.holeId);if(!n||!p||!material||!hole)continue;report('through-'+e.id,p.name+'：穴径と紐の太さ',assessed(()=>throughCompatibility(hole.diameterMm??p.holeDiameterMm,materialDiameter(material),clearance)),{kind:'node',id:n.id});}
 for(const e of a.pointAttachments){const na=a.nodes.find(n=>n.id===e.nodeAId),nb=a.nodes.find(n=>n.id===e.nodeBId),pa=nodePart(a,na,parts),pb=nodePart(a,nb,parts),ca=pa?.connectionPoints.find(p=>p.id===e.pointAId),cb=pb?.connectionPoints.find(p=>p.id===e.pointBId);if(ca&&cb)report('point-'+e.id,(pb?.name??'パーツ')+'：接続部の寸法・種別',assessed(()=>pointCompatibility(ca,cb,clearance)),{kind:'node',id:e.nodeBId});}
 for(const e of a.pathAttachments){const n=a.nodes.find(n=>n.id===e.nodeId),p=nodePart(a,n,parts),point=p?.connectionPoints.find(c=>c.id===e.pointId),path=a.paths.find(p=>p.id===e.pathId),material=parts.find(p=>p.id===path?.partId),spec=material?.pathRenderSpec;if(!p||!point||!material||!spec)continue;const port=e.anchorKind==='start'?spec.startPortType:spec.endPortType;report('path-'+e.id,p.name+'：材料との接続',assessed(()=>e.anchorKind==='position'?pathPositionCompatibility(p,point,material,clearance):port?pointCompatibility(point,{...point,type:port,localInnerDiameterMm:material.innerDiameterMm,localThicknessMm:material.thicknessMm},clearance):{status:'unknown',reasons:['材料の端点の接続種別が未確認です。']}),{kind:'node',id:e.nodeId});}
 let budget:ReturnType<typeof cordBudget>;try{budget=cordBudget(a,parts);}catch{add({id:'budget-invalid',level:'problem',title:'紐の配置設定を確認してください',detail:'配列と紐の参照を確認できません。',step:3});}if(budget){const layout=a.design.editorConfig.cordLayoutV1 as CordLayout;
  if(budget.remaining<-.1||budget.outside||budget.overlap)add({id:'budget',level:'problem',title:'紐の配置範囲・重なりを確認してください',detail:`使用可能 ${budget.usable.toFixed(1)} mm／配置範囲 ${budget.guideLength.toFixed(1)} mm。${budget.outside?'範囲外のパーツがあります。':''}${budget.overlap?'パーツの重なりがあります。':''}`,target:layout.patternNodeIds[0]?{kind:'node',id:layout.patternNodeIds[0]}:undefined,step:3});
  if(budget.occupied===null)add({id:'budget-unknown',level:'review',title:'配列の使用幅を確認できません',detail:'配置と実寸を確認してください。',step:3});
 }
 let quantities:ReturnType<typeof billOfMaterials>['items']=[];if(required.every(e=>parts.some(p=>p.id===e.partId))){try{quantities=billOfMaterials(a,parts).items;}catch(e){add({id:'purchase',level:'review',title:'購入量を計算できません',detail:e instanceof Error?e.message:'購入条件を確認してください。',step:3});}}
 for(const item of quantities)if(item.purchaseUnits===null)add({id:'quantity-'+item.partId,level:'review',title:item.name+'：購入単位が未確認です',detail:'配置済みの使用量は分かりますが、購入すべき袋数・販売単位数を計算できません。',target:required.find(e=>e.partId===item.partId),step:3});
 return{issues,quantities,problems:issues.filter(i=>i.level==='problem').length,reviews:issues.filter(i=>i.level==='review').length};
}
