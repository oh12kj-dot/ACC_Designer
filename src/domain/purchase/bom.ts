import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { calculatePurchase } from './calculator';
export function billOfMaterials(aggregate:DesignAggregate,parts:Part[]){
 const ids=[...new Set([...aggregate.nodes.map(n=>n.partId),...aggregate.paths.map(p=>p.partId)])];
 const items=ids.map(partId=>{const part=parts.find(p=>p.id===partId);if(!part)throw new Error('BOMのパーツ定義が見つかりません');const count=aggregate.nodes.filter(n=>n.partId===partId).length,lengthMm=aggregate.paths.filter(p=>p.partId===partId).reduce((total,p)=>total+p.physicalLengthMm,0);const purchase=part.purchaseSpec?calculatePurchase(part.purchaseSpec,{count,lengthMm}):undefined;let weightG:number|null=null;
 if(part.weightG!==undefined&&Number.isFinite(part.weightG)&&part.weightG>=0){if(part.geometryKind==='node'&&part.purchaseSpec?.weightBasis==='per_piece')weightG=count*part.weightG;else if(part.geometryKind==='path'&&part.purchaseSpec?.weightBasis==='per_sale_length'&&part.purchaseSpec.weightBasisLengthMm&&part.purchaseSpec.weightBasisLengthMm>0)weightG=part.weightG*lengthMm/part.purchaseSpec.weightBasisLengthMm;}
 return{partId,name:part.name,count,lengthMm,purchaseUnits:purchase?.purchaseUnits??null,purchasePrice:purchase?.purchasePrice??null,weightG};});
 return{items,knownPriceTotal:items.reduce((sum,i)=>sum+(i.purchasePrice??0),0),unknownPriceItemCount:items.filter(i=>i.purchasePrice===null).length,knownWeightG:items.reduce((sum,i)=>sum+(i.weightG??0),0),unknownWeightItemCount:items.filter(i=>i.weightG===null).length};
}
