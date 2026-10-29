import { designClearance,materialDiameter } from '../compatibility/settings';
import { nodePart } from '../geometry/nodePart';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part,ThroughAttachment,PathAttachment } from '../../types/domain';
import { derivePathGeometry,pointAtDistance,clampEndpoint } from '../path/geometry';
import { throughPose,projectBoundsRelativeToHole,validateOccupancy } from '../attachment/through';
import { pointUseCount } from './pointCommands';
import { pointCompatibility,pathPositionCompatibility } from '../compatibility/check';
import { throughCompatibility } from '../compatibility/check';
export { resolvePoses as resolveThrough } from './resolvePoses';
import { resolvePoses as resolveThrough } from './resolvePoses';
export function attachThrough(aggregate:DesignAggregate,parts:Part[],input:ThroughAttachment,clearanceMm=designClearance(aggregate)){
 const node=aggregate.nodes.find(n=>n.id===input.nodeId),part=nodePart(aggregate,node,parts),hole=part?.throughHoles.find(h=>h.id===input.holeId),path=aggregate.paths.find(p=>p.id===input.pathId),material=parts.find(p=>p.id===path?.partId);
 if(!node||!part||!hole||!path||!material)throw new Error('パーツ・穴・Pathを選択してください');
 if(aggregate.throughAttachments.some(a=>a.nodeId===node.id)||aggregate.pathAttachments.some(a=>a.nodeId===node.id))throw new Error('すでにPathへ接続しています。先に接続を解除してください');
 const compatibility=throughCompatibility(hole.diameterMm??part.holeDiameterMm,materialDiameter(material),clearanceMm);
 if(compatibility.status==='incompatible')throw new Error(compatibility.reasons.join('。'));
 const next=resolveThrough({...aggregate,throughAttachments:[...aggregate.throughAttachments,input]},parts);
 return{aggregate:next,compatibility};
}
export function detachNode(aggregate:DesignAggregate,nodeId:string):DesignAggregate{return{...aggregate,pointAttachments:aggregate.pointAttachments.filter(a=>a.nodeAId!==nodeId&&a.nodeBId!==nodeId),throughAttachments:aggregate.throughAttachments.filter(a=>a.nodeId!==nodeId),pathAttachments:aggregate.pathAttachments.filter(a=>a.nodeId!==nodeId)};}
export function removeNode(aggregate:DesignAggregate,nodeId:string){const next=detachNode(aggregate,nodeId);return{...next,nodes:next.nodes.filter(n=>n.id!==nodeId),mirrorLinks:next.mirrorLinks.filter(l=>l.leftEntityId!==nodeId&&l.rightEntityId!==nodeId)};}
export function removePath(aggregate:DesignAggregate,pathId:string){return{...aggregate,paths:aggregate.paths.filter(p=>p.id!==pathId),throughAttachments:aggregate.throughAttachments.filter(a=>a.pathId!==pathId),pathAttachments:aggregate.pathAttachments.filter(a=>a.pathId!==pathId),mirrorLinks:aggregate.mirrorLinks.filter(l=>l.leftEntityId!==pathId&&l.rightEntityId!==pathId)};}
export function changePath(aggregate:DesignAggregate,parts:Part[],pathId:string,patch:Partial<DesignAggregate['paths'][number]>){const path=aggregate.paths.find(p=>p.id===pathId);if(!path)throw new Error('Pathが見つかりません');if(path.locked&&patch.locked!==false&&Object.keys(patch).some(k=>k!=='locked'&&k!=='zIndex'))throw new Error('Pathの固定を解除してください');let next={...path,...patch};if(patch.start)next=clampEndpoint(next,'start',patch.start);if(patch.end)next=clampEndpoint(next,'end',patch.end);if(path.shape!=='straight'&&next.shape!=='straight'&&Math.sign(path.end.x-path.start.x)!==Math.sign(next.end.x-next.start.x))throw new Error('上下方向の境界を跨ぐ端点変更はできません');return resolveThrough({...aggregate,paths:aggregate.paths.map(p=>p.id===pathId?next:p)},parts);}

export function attachPathAnchor(aggregate:DesignAggregate,parts:Part[],input:PathAttachment){
 const node=aggregate.nodes.find(n=>n.id===input.nodeId),part=nodePart(aggregate,node,parts),point=part?.connectionPoints.find(p=>p.id===input.pointId),path=aggregate.paths.find(p=>p.id===input.pathId),material=parts.find(p=>p.id===path?.partId),spec=material?.pathRenderSpec;
 if(!node||!part||!point||!path||!spec)throw new Error('パーツ・接続点・Pathを選択してください');
 if(aggregate.throughAttachments.some(a=>a.nodeId===node.id)||aggregate.pathAttachments.some(a=>a.nodeId===node.id))throw new Error('すでにPathへ接続しています');
 if(pointUseCount(aggregate,node.id,point.id)>=point.maxConnections)throw new Error('接続点の接続上限に達しています');
 let compatibility={status:'unknown' as 'unknown'|'compatible'|'incompatible',reasons:['Pathの接続寸法が不明です']};
 if(input.anchorKind==='position')compatibility=pathPositionCompatibility(part,point,material,designClearance(aggregate));
 if(input.anchorKind!=='position'){const start=input.anchorKind==='start',limit=start?spec.startMaxConnections:spec.endMaxConnections,port=start?spec.startPortType:spec.endPortType;if(aggregate.pathAttachments.filter(a=>a.pathId===path.id&&a.anchorKind===input.anchorKind).length>=limit)throw new Error('Path端点の接続上限に達しています');if(port)compatibility=pointCompatibility(point,{...point,type:port,localInnerDiameterMm:material?.innerDiameterMm,localThicknessMm:material?.thicknessMm},designClearance(aggregate));}
 if(compatibility.status==='incompatible')throw new Error(compatibility.reasons.join('。'));
 return{aggregate:resolveThrough({...aggregate,pathAttachments:[...aggregate.pathAttachments,input]},parts),compatibility};
}
