import { nodePart } from '../geometry/nodePart';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part,DesignNode } from '../../types/domain';
import { propagatePose } from './pointCommands';
import { derivePathGeometry,pointAtDistance } from '../path/geometry';
import { throughPose,projectBoundsRelativeToHole,validateOccupancy } from '../attachment/through';
import { pathAnchorPose } from '../attachment/pathPose';
import { connectionPointWorld } from '../geometry/transforms';
export function resolvePoses(aggregate:DesignAggregate,parts:Part[]){let next=structuredClone(aggregate);const targets:{id:string;pose:DesignNode}[]=[];const geometries=new Map(next.paths.map(path=>[path.id,derivePathGeometry(path)]));
 for(const a of next.throughAttachments){const n=next.nodes.find(n=>n.id===a.nodeId),part=nodePart(next,n,parts),hole=part?.throughHoles.find(h=>h.id===a.holeId),path=next.paths.find(p=>p.id===a.pathId);if(!n||!part||!hole||!path)throw new Error('通し接続の定義が見つかりません');const g=geometries.get(path.id)!,sample=pointAtDistance(g,a.distanceMm/path.physicalLengthMm*g.arcLengthMm);targets.push({id:n.id,pose:throughPose(n,part,hole,sample.position,sample.tangent,a.flip180)});}
 for(const a of next.pathAttachments){const n=next.nodes.find(n=>n.id===a.nodeId),part=nodePart(next,n,parts),point=part?.connectionPoints.find(p=>p.id===a.pointId),path=next.paths.find(p=>p.id===a.pathId);if(!n||!part||!point||!path)throw new Error('Path接続の定義が見つかりません');targets.push({id:n.id,pose:pathAnchorPose(n,part,point,path,a,geometries.get(path.id)!)});}
 for(const target of targets){const n=next.nodes.find(n=>n.id===target.id)!;next=propagatePose(next,n,target.pose);}
 for(const target of targets){const n=next.nodes.find(n=>n.id===target.id)!;if(Math.hypot(n.xMm-target.pose.xMm,n.yMm-target.pose.yMm)>1e-5||Math.abs(n.rotationDeg-target.pose.rotationDeg)>1e-5)throw new Error('複数のPath拘束が両立しません');}
 for(const path of next.paths){const g=geometries.get(path.id)!,intervals=next.throughAttachments.filter(a=>a.pathId===path.id).map(a=>{const n=next.nodes.find(n=>n.id===a.nodeId)!,part=nodePart(next,n,parts)!,hole=part.throughHoles.find(h=>h.id===a.holeId)!,sample=pointAtDistance(g,a.distanceMm/path.physicalLengthMm*g.arcLengthMm),bounds=projectBoundsRelativeToHole(n,part,hole,sample.tangent);return{id:a.id,start:a.distanceMm-bounds.beforeMm,end:a.distanceMm+bounds.afterMm};});validateOccupancy(intervals,path.physicalLengthMm);}
 for(const a of next.pointAttachments){const na=next.nodes.find(n=>n.id===a.nodeAId),nb=next.nodes.find(n=>n.id===a.nodeBId),pa=nodePart(next,na,parts),pb=nodePart(next,nb,parts),ca=pa?.connectionPoints.find(p=>p.id===a.pointAId),cb=pb?.connectionPoints.find(p=>p.id===a.pointBId);if(!na||!nb||!pa||!pb||!ca||!cb)throw new Error('Point接続の定義が見つかりません');const wa=connectionPointWorld(na,pa,ca),wb=connectionPointWorld(nb,pb,cb);if(Math.hypot(wa.position.x-wb.position.x,wa.position.y-wb.position.y)>1e-5)throw new Error('Point接続が一致しません');}
 return next;
}
