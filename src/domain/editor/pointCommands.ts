import {visualGroups,groupIds} from './studio';
import { designClearance } from '../compatibility/settings';
import { nodePart } from '../geometry/nodePart';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part,DesignNode,PointAttachment } from '../../types/domain';
import { rotate,normalizeDeg,connectionPointWorld } from '../geometry/transforms';
import { pointSnapPose } from '../attachment/pointPose';
import { pointCompatibility } from '../compatibility/check';
export function component(aggregate:DesignAggregate,nodeId:string){const found=new Set([nodeId]);let changed=true;while(changed){changed=false;for(const g of visualGroups(aggregate)){const ids=groupIds(g);if(ids.some(id=>found.has(id)))for(const id of ids)if(!found.has(id)){found.add(id);changed=true;}}for(const a of aggregate.pointAttachments){if(found.has(a.nodeAId)&&!found.has(a.nodeBId)){found.add(a.nodeBId);changed=true;}if(found.has(a.nodeBId)&&!found.has(a.nodeAId)){found.add(a.nodeAId);changed=true;}}}return found;}
export function anchored(aggregate:DesignAggregate,ids:Set<string>){return aggregate.throughAttachments.filter(a=>ids.has(a.nodeId)).length+aggregate.pathAttachments.filter(a=>ids.has(a.nodeId)).length;}
export function propagatePose(aggregate:DesignAggregate,source:DesignNode,target:DesignNode):DesignAggregate{const ids=component(aggregate,source.id),angle=target.rotationDeg-source.rotationDeg;return{...aggregate,nodes:aggregate.nodes.map(n=>{if(!ids.has(n.id))return n;const delta=rotate({x:n.xMm-source.xMm,y:n.yMm-source.yMm},angle);return{...n,xMm:target.xMm+delta.x,yMm:target.yMm+delta.y,rotationDeg:normalizeDeg(n.rotationDeg+angle)};})};}
export function moveComponent(aggregate:DesignAggregate,nodeId:string,target:Partial<DesignNode>){const node=aggregate.nodes.find(n=>n.id===nodeId);if(!node)throw new Error('Nodeが見つかりません');const ids=component(aggregate,nodeId);if(anchored(aggregate,ids))throw new Error('Pathに拘束された接続部品は自由移動・回転できません。接続解除またはPath編集を使用してください');if(aggregate.nodes.some(n=>ids.has(n.id)&&n.locked))throw new Error('接続部品が固定されています');return propagatePose(aggregate,node,{...node,...target});}
export function pointUseCount(aggregate:DesignAggregate,nodeId:string,pointId:string){return aggregate.pointAttachments.filter(a=>(a.nodeAId===nodeId&&a.pointAId===pointId)||(a.nodeBId===nodeId&&a.pointBId===pointId)).length+aggregate.pathAttachments.filter(a=>a.nodeId===nodeId&&a.pointId===pointId).length;}
export function attachPoint(aggregate:DesignAggregate,parts:Part[],attachment:PointAttachment){
 const a=aggregate.nodes.find(n=>n.id===attachment.nodeAId),b=aggregate.nodes.find(n=>n.id===attachment.nodeBId),pa=nodePart(aggregate,a,parts),pb=nodePart(aggregate,b,parts),pointA=pa?.connectionPoints.find(p=>p.id===attachment.pointAId),pointB=pb?.connectionPoints.find(p=>p.id===attachment.pointBId);
 if(!a||!b||!pa||!pb||!pointA||!pointB||a.id===b.id)throw new Error('異なる2つのパーツと接続点を選んでください');
 if(pointUseCount(aggregate,a.id,pointA.id)>=pointA.maxConnections||pointUseCount(aggregate,b.id,pointB.id)>=pointB.maxConnections)throw new Error('接続点の接続上限に達しています');
 const compatibility=pointCompatibility(pointA,pointB,designClearance(aggregate));if(compatibility.status==='incompatible')throw new Error(compatibility.reasons.join('。'));
 const pose=pointSnapPose(a,pa,pointA,b,pb,pointB,attachment.orientationMode,attachment.relativeRotationDeg),ids=component(aggregate,b.id);
 if(ids.has(a.id)){const wa=connectionPointWorld(a,pa,pointA),wb=connectionPointWorld(b,pb,pointB);if(Math.hypot(wa.position.x-wb.position.x,wa.position.y-wb.position.y)>1e-5||Math.abs(normalizeDeg(pose.rotationDeg-b.rotationDeg))>1e-5)throw new Error('閉じた接続グラフの位置・向きが一致しません');}
 else if(anchored(aggregate,ids)||aggregate.nodes.some(n=>ids.has(n.id)&&n.locked))throw new Error('移動する側の部品が固定またはPathに拘束されています');
 const next=ids.has(a.id)?aggregate:propagatePose(aggregate,b,pose);return{aggregate:{...next,pointAttachments:[...next.pointAttachments,attachment]},compatibility};
}
export function setManualPointAngle(aggregate:DesignAggregate,parts:Part[],attachmentId:string,rotationDeg:number){
 const edge=aggregate.pointAttachments.find(a=>a.id===attachmentId);if(!edge||!Number.isFinite(rotationDeg))throw new Error('接続と確定角を確認してください');
 const detached={...aggregate,pointAttachments:aggregate.pointAttachments.filter(a=>a.id!==edge.id)},ids=component(detached,edge.nodeBId);if(ids.has(edge.nodeAId))throw new Error('閉じた接続グラフの確定角は変更できません');
 const moved=moveComponent(detached,edge.nodeBId,{rotationDeg:normalizeDeg(rotationDeg)}),a=moved.nodes.find(n=>n.id===edge.nodeAId)!,b=moved.nodes.find(n=>n.id===edge.nodeBId)!,pa=nodePart(moved,a,parts)!,pb=nodePart(moved,b,parts)!,ca=pa.connectionPoints.find(p=>p.id===edge.pointAId)!,cb=pb.connectionPoints.find(p=>p.id===edge.pointBId)!;
 const relativeRotationDeg=normalizeDeg(connectionPointWorld(b,pb,cb).directionDeg-connectionPointWorld(a,pa,ca).directionDeg-180);
 return attachPoint(moved,parts,{...edge,orientationMode:'manual',relativeRotationDeg}).aggregate;
}
