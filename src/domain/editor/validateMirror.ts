import type { DesignAggregate } from '../../types/aggregate';
import type { MirrorLink,Part } from '../../types/domain';
import { nodeFlips } from '../geometry/nodePart';
import type { MirrorState } from './createMirror';
export function validateMirrorStructure(aggregate:DesignAggregate,parts?:Part[]):void{
 nodeFlips(aggregate);const state=aggregate.design.editorConfig?.mirror as MirrorState|undefined;if(!state){if(aggregate.mirrorLinks.length)throw new Error('Mirror軸・所属設定がありません');return;}
 const ownership=new Map<string,{groupId:string;side:'left'|'right'}>();
 for(const [groupId,group] of Object.entries(state.groups)){
  if(!group||typeof group!=='object'||!Number.isFinite(group.axisX)||!['linked','independent'].includes(group.mode))throw new Error('Mirrorグループ設定が不正です');
  for(const side of ['left','right'] as const)for(const kind of ['node','path'] as const){const ids=group[side]?.[kind==='node'?'nodeIds':'pathIds'];if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('Mirror所属IDが不正です');for(const id of ids){const key=kind+':'+id;if(ownership.has(key)||(kind==='node'?aggregate.nodes:aggregate.paths).every(e=>e.id!==id))throw new Error('Mirror所属が重複または孤児です');ownership.set(key,{groupId,side});}}
 }
 const owner=(kind:MirrorLink['entityType'],id:string)=>{
  if(kind==='node'||kind==='path')return ownership.get(kind+':'+id);
  const attachment=kind==='point_attachment'?aggregate.pointAttachments.find(a=>a.id===id):kind==='through_attachment'?aggregate.throughAttachments.find(a=>a.id===id):aggregate.pathAttachments.find(a=>a.id===id);if(!attachment)return undefined;
  const refs='nodeAId' in attachment?[['node',attachment.nodeAId],['node',attachment.nodeBId]]:[['node',attachment.nodeId],['path',attachment.pathId]];
  const owners=refs.map(([kind,id])=>ownership.get(kind+':'+id)),first=owners.find(o=>o);if(first&&owners.some(o=>!o||o.groupId!==first.groupId||o.side!==first.side))throw new Error('Mirrorの左右・グループを跨ぐ接続はできません');
  return first;
 };
 const used=new Set<string>(),linkIds=new Set<string>();
 for(const link of aggregate.mirrorLinks){
  if(linkIds.has(link.id))throw new Error('MirrorLink IDが重複しています');linkIds.add(link.id);
  const group=state.groups[link.mirrorGroupId],left=owner(link.entityType,link.leftEntityId),right=owner(link.entityType,link.rightEntityId);
  if(!group||group.mode!=='linked'||!left||!right||left.groupId!==link.mirrorGroupId||right.groupId!==link.mirrorGroupId||left.side!=='left'||right.side!=='right')throw new Error('MirrorLinkの所属・対応が不正です');
  for(const id of [link.leftEntityId,link.rightEntityId]){const key=link.entityType+':'+id;if(used.has(key))throw new Error('Mirror Entityの対応が重複しています');used.add(key);}
  if(link.entityType==='node'&&parts){const leftNode=aggregate.nodes.find(n=>n.id===link.leftEntityId)!,rightNode=aggregate.nodes.find(n=>n.id===link.rightEntityId)!,part=parts.find(p=>p.id===leftNode.partId);if(!part||leftNode.partId!==rightNode.partId)throw new Error('Mirror左右のPartが一致しません');if(part.mirrorPolicy==='manual'&&!['keep_orientation','mirror_image'].includes(link.manualMirrorPolicy??''))throw new Error('手動Mirror方針がありません');}
 }
 const entities:[MirrorLink['entityType'],{id:string}[]][]=[['node',aggregate.nodes],['path',aggregate.paths],['point_attachment',aggregate.pointAttachments],['through_attachment',aggregate.throughAttachments],['path_attachment',aggregate.pathAttachments]];
 for(const [kind,items] of entities)for(const entity of items){const membership=owner(kind,entity.id);if(membership&&state.groups[membership.groupId].mode==='linked'&&!used.has(kind+':'+entity.id))throw new Error('Linked構造にMirror対応が欠落しています');}
}
