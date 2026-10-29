import type { DesignAggregate } from '../../types/aggregate';
import type { Part,PointAttachment,ThroughAttachment,Vec2 } from '../../types/domain';
import { nodePart } from '../geometry/nodePart';
import { connectionPointWorld,throughHoleWorld } from '../geometry/transforms';
import { derivePathGeometry,nearestDistance,pointAtDistance } from '../path/geometry';
import { attachThrough } from './throughCommands';
import { designClearance,materialDiameter } from '../compatibility/settings';
import { throughCompatibility } from '../compatibility/check';
import { component,attachPoint } from './pointCommands';
import { pointCompatibility } from '../compatibility/check';
export interface SnapCandidate { attachment:PointAttachment|ThroughAttachment; position:Vec2; distance:number; status:'compatible'|'unknown'|'incompatible'; reason:string; aggregate?:DesignAggregate }
/** Preview from the dragged pose; never mutate history before explicit confirmation. */
export function nearestPointSnap(a:DesignAggregate,parts:Part[],nodeId:string,zoom:number):SnapCandidate|undefined {
 const node=a.nodes.find(n=>n.id===nodeId),part=nodePart(a,node,parts);if(!node||!part)return;
 const ids=component(a,nodeId),threshold=Math.max(1,Math.min(5,12/zoom));let nearest:SnapCandidate|undefined;
 for(const target of a.nodes){if(ids.has(target.id))continue;const tp=nodePart(a,target,parts);if(!tp)continue;
  for(const from of part.connectionPoints)for(const to of tp.connectionPoints){const pos=connectionPointWorld(target,tp,to).position,own=connectionPointWorld(node,part,from).position,distance=Math.hypot(pos.x-own.x,pos.y-own.y);if(distance>threshold||nearest&&distance>=nearest.distance)continue;
   const attachment:PointAttachment={id:crypto.randomUUID(),kind:'point',nodeAId:target.id,pointAId:to.id,nodeBId:nodeId,pointBId:from.id,orientationMode:'align_opposite',relativeRotationDeg:0},compatibility=pointCompatibility(to,from,designClearance(a));
   nearest={attachment,position:pos,distance,status:compatibility.status,reason:compatibility.reasons.join('。')};
   try{nearest.aggregate=attachPoint(a,parts,attachment).aggregate;}catch(e){nearest.status='incompatible';nearest.reason=e instanceof Error?e.message:'接続できません';}
  }
 }
 return nearest;
}
export function nearestThroughSnap(a:DesignAggregate,parts:Part[],nodeId:string,zoom:number):SnapCandidate|undefined{
 const node=a.nodes.find(n=>n.id===nodeId),part=nodePart(a,node,parts);if(!node||!part||a.throughAttachments.some(e=>e.nodeId===nodeId)||a.pathAttachments.some(e=>e.nodeId===nodeId))return;
 const threshold=Math.max(1,Math.min(5,12/zoom));let nearest:SnapCandidate|undefined;
 for(const path of a.paths){const material=parts.find(p=>p.id===path.partId);if(!material)continue;const geometry=derivePathGeometry(path);
  for(const hole of part.throughHoles){const world=throughHoleWorld(node,part,hole),center={x:(world.entry.x+world.exit.x)/2,y:(world.entry.y+world.exit.y)/2},projection=nearestDistance(geometry,center);if(projection.distanceToPathMm>threshold||nearest&&projection.distanceToPathMm>=nearest.distance)continue;
   const attachment:ThroughAttachment={id:crypto.randomUUID(),kind:'through',nodeId,holeId:hole.id,pathId:path.id,distanceMm:projection.distanceMm/geometry.arcLengthMm*path.physicalLengthMm,orderIndex:a.throughAttachments.filter(e=>e.pathId===path.id).length,lockedToNeighbors:false,flip180:false},compatibility=throughCompatibility(hole.diameterMm??part.holeDiameterMm,materialDiameter(material),designClearance(a));
   nearest={attachment,position:pointAtDistance(geometry,projection.distanceMm).position,distance:projection.distanceToPathMm,status:compatibility.status,reason:compatibility.reasons.join('。')};
   try{nearest.aggregate=attachThrough(a,parts,attachment).aggregate;}catch(e){nearest.status='incompatible';nearest.reason=e instanceof Error?e.message:'通せません';}
  }
 }return nearest;
}
export function nearestSnap(a:DesignAggregate,parts:Part[],nodeId:string,zoom:number){const point=nearestPointSnap(a,parts,nodeId,zoom),through=nearestThroughSnap(a,parts,nodeId,zoom);return point&&(!through||point.distance<=through.distance)?point:through;}
