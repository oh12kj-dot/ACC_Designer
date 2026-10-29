import type { DesignAggregate } from '../../types/aggregate';
import type { Part,Vec2 } from '../../types/domain';
import { component,moveComponent } from './pointCommands';
import { derivePathGeometry,nearestDistance } from '../path/geometry';
import { resolvePoses } from './resolvePoses';
/** Pointer previews use one original snapshot; only PointerUp commits history. */
export function dragComponent(aggregate:DesignAggregate,parts:Part[],nodeId:string,pointer:Vec2,delta:Vec2):DesignAggregate{
 if(![pointer.x,pointer.y,delta.x,delta.y].every(Number.isFinite))throw new Error('移動位置が不正です');
 const node=aggregate.nodes.find(n=>n.id===nodeId);if(!node)throw new Error('Nodeが見つかりません');
 const ids=component(aggregate,nodeId);if(aggregate.nodes.some(n=>ids.has(n.id)&&n.locked))throw new Error('接続部品が固定されています');
 const through=aggregate.throughAttachments.filter(a=>ids.has(a.nodeId)),anchors=aggregate.pathAttachments.filter(a=>ids.has(a.nodeId));
 if(anchors.some(a=>a.anchorKind!=='position'))throw new Error('端点に接続された部品は接続解除またはPath移動が必要です');
 const constraints=[...through,...anchors];if(constraints.length>1)throw new Error('複数のPath拘束がある部品は自由移動できません');
 if(!constraints.length)return moveComponent(aggregate,nodeId,{xMm:node.xMm+delta.x,yMm:node.yMm+delta.y});
 const constraint=constraints[0],path=aggregate.paths.find(p=>p.id===constraint.pathId);if(!path)throw new Error('接続先のPathが見つかりません');
 const geometry=derivePathGeometry(path),projection=nearestDistance(geometry,pointer),distanceMm=projection.distanceMm/geometry.arcLengthMm*path.physicalLengthMm;
 return resolvePoses({...aggregate,throughAttachments:aggregate.throughAttachments.map(a=>a.id===constraint.id?{...a,distanceMm}:a),pathAttachments:aggregate.pathAttachments.map(a=>a.id===constraint.id?{...a,distanceMm}:a)},parts);
}
