import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { nodePart } from '../geometry/nodePart';
import { pointSnapPose } from '../attachment/pointPose';
import { syncMirror } from './syncMirror';
import { resolvePoses } from './resolvePoses';
import { validateDesignAggregate } from './validateDesign';
import { component } from './pointCommands';
export interface DefinitionMapping { points:Record<string,string>; holes:Record<string,string> }
export function usedDefinitions(a:DesignAggregate,nodeId:string){return {points:[...new Set([...a.pointAttachments.flatMap(e=>e.nodeAId===nodeId?[e.pointAId]:e.nodeBId===nodeId?[e.pointBId]:[]),...a.pathAttachments.filter(e=>e.nodeId===nodeId).map(e=>e.pointId)])],holes:[...new Set(a.throughAttachments.filter(e=>e.nodeId===nodeId).map(e=>e.holeId))]};}
/** Explicit definition mapping, all-or-nothing, including linked mirror validation. */
export function changePart(a:DesignAggregate,parts:Part[],entityId:string,partId:string,mapping:DefinitionMapping,manual:Record<string,'mirror_image'|'keep_orientation'>={}){
 const replacement=parts.find(p=>p.id===partId),node=a.nodes.find(n=>n.id===entityId),path=a.paths.find(p=>p.id===entityId);if(!replacement||replacement.isArchived||!node&&!path)throw new Error('差し替え先を選択してください');if((node??path)!.locked)throw new Error('固定を解除してください');
 if(replacement.geometryKind!==(node?'node':'path'))throw new Error('同じ形状のパーツを選択してください');let next=structuredClone(a);
 if(node){const used=usedDefinitions(a,node.id);for(const id of used.points)if(!replacement.connectionPoints.some(p=>p.id===mapping.points[id]))throw new Error('使用中の接続点の対応を選択してください');for(const id of used.holes)if(!replacement.throughHoles.some(h=>h.id===mapping.holes[id]))throw new Error('使用中の貫通穴の対応を選択してください');
  next.nodes=next.nodes.map(n=>n.id===entityId?{...n,partId}:n);
  next.pointAttachments=next.pointAttachments.map(e=>({...e,pointAId:e.nodeAId===entityId?mapping.points[e.pointAId]:e.pointAId,pointBId:e.nodeBId===entityId?mapping.points[e.pointBId]:e.pointBId}));next.pathAttachments=next.pathAttachments.map(e=>e.nodeId===entityId?{...e,pointId:mapping.points[e.pointId]}:e);next.throughAttachments=next.throughAttachments.map(e=>e.nodeId===entityId?{...e,holeId:mapping.holes[e.holeId]}:e);
  const ids=component(next,node.id),anchors=[...next.pathAttachments,...next.throughAttachments].filter(e=>ids.has(e.nodeId)),root=anchors[0]?.nodeId??next.nodes.find(n=>ids.has(n.id)&&n.locked)?.id??node.id;
  // Resolve only anchors first; reflow the graph with the new local point geometry.
  const anchored=resolvePoses({...next,pointAttachments:next.pointAttachments.filter(e=>!ids.has(e.nodeAId))},parts);next.nodes=anchored.nodes;
  const visited=new Set([root]),queue=[root];while(queue.length){const hostId=queue.shift()!;for(const edge of next.pointAttachments){const forward=edge.nodeAId===hostId,other=forward?edge.nodeBId:edge.nodeAId;if(!forward&&edge.nodeBId!==hostId||visited.has(other))continue;const host=next.nodes.find(n=>n.id===hostId)!,moving=next.nodes.find(n=>n.id===other)!,hp=nodePart(next,host,parts)!,mp=nodePart(next,moving,parts)!,cp=hp.connectionPoints.find(p=>p.id===(forward?edge.pointAId:edge.pointBId))!,tp=mp.connectionPoints.find(p=>p.id===(forward?edge.pointBId:edge.pointAId))!;
    const posed=pointSnapPose(host,hp,cp,moving,mp,tp,edge.orientationMode,forward?edge.relativeRotationDeg:-edge.relativeRotationDeg);if(moving.locked&&(Math.hypot(posed.xMm-moving.xMm,posed.yMm-moving.yMm)>1e-5||Math.abs(posed.rotationDeg-moving.rotationDeg)>1e-5))throw new Error('固定部品の接続位置が変わります');next.nodes=next.nodes.map(n=>n.id===other?posed:n);visited.add(other);queue.push(other);
  }}
 }else next.paths=next.paths.map(p=>p.id===entityId?{...p,partId}:p);
 next=syncMirror(a,next,parts,undefined,manual);next=resolvePoses(next,parts);validateDesignAggregate(next,parts);return next;
}
