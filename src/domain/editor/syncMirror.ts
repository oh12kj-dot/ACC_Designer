import { validateMirrorStructure } from './validateMirror';
import type { DesignAggregate } from '../../types/aggregate';
import type { DesignNode,DesignPath,PointAttachment,ThroughAttachment,PathAttachment,MirrorLink,Part,MirrorPolicy } from '../../types/domain';
import { mirrorState,type MirrorState } from './createMirror';
import { mirrorNodeGeometry,mirrorPathGeometry } from './mirrorGeometry';
import { resolvePoses } from './resolvePoses';
type Kind=MirrorLink['entityType'];type Entity=DesignNode|DesignPath|PointAttachment|ThroughAttachment|PathAttachment;
type Collections=Record<Kind,Entity[]>;
const kinds:Kind[]=['node','path','point_attachment','through_attachment','path_attachment'];
const collections=(a:DesignAggregate):Collections=>({node:a.nodes,path:a.paths,point_attachment:a.pointAttachments,through_attachment:a.throughAttachments,path_attachment:a.pathAttachments});
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export interface MirrorEditScope {groupId:string;side:'left'|'right'}
/** Synchronization reads the original links, including links removed by primary deletion. */
export function syncMirror(before:DesignAggregate,primary:DesignAggregate,parts:Part[],scope?:MirrorEditScope,manual:Record<string,Exclude<MirrorPolicy,'manual'>>={},newId:()=>string=()=>crypto.randomUUID()):DesignAggregate{
 validateMirrorStructure(before,parts);
 if(before.design.editorConfig?.mirror===undefined)return primary;
 const state=mirrorState(before),next=structuredClone(primary),old=collections(before),current=collections(next),allIds=new Set(kinds.flatMap(kind=>current[kind].map(e=>e.id)));
 before.mirrorLinks.forEach(l=>allIds.add(l.id));Object.keys(state.groups).forEach(id=>allIds.add(id));
 const allocate=()=>{const id=newId();if(!id||allIds.has(id))throw new Error('Mirror IDが重複しています');allIds.add(id);return id;};
 const newState=next.design.editorConfig?.mirror as MirrorState|undefined;
 if(newState){state.nodeFlipX={...newState.nodeFlipX};for(const [id,group] of Object.entries(newState.groups))if(state.groups[id])state.groups[id].mode=group.mode;}
 let links=structuredClone(before.mirrorLinks);const mirroredNodes:DesignNode[]=[];
 const nodePolicy=(node:DesignNode,link?:MirrorLink)=>{const part=parts.find(p=>p.id===node.partId);if(!part)throw new Error('Partが見つかりません');const previous=before.nodes.find(n=>n.id===node.id),storedPolicy=previous?.partId===node.partId?link?.manualMirrorPolicy:undefined;const policy=part.mirrorPolicy==='manual'?(storedPolicy??manual[part.id]):part.mirrorPolicy;if(!policy)throw new Error(`${part.name}の画像反転方針を選択してください`);return policy;};
 const reflect=(kind:Kind,source:Entity,targetId:string,axis:number,map:(kind:Kind,id:string)=>string,link?:MirrorLink):Entity=>{
  if(kind==='node'){const n=source as DesignNode,policy=nodePolicy(n,link),result=mirrorNodeGeometry(n,state.nodeFlipX[n.id]===true,axis,policy);state.nodeFlipX[targetId]=result.flipped;const target={...result.node,id:targetId};mirroredNodes.push(target);if(link)link.manualMirrorPolicy=parts.find(p=>p.id===n.partId)?.mirrorPolicy==='manual'?policy:undefined;return target;}
  if(kind==='path')return{...mirrorPathGeometry(source as DesignPath,axis),id:targetId};
  if(kind==='point_attachment'){const a=source as PointAttachment;return{...a,id:targetId,nodeAId:map('node',a.nodeAId),nodeBId:map('node',a.nodeBId),relativeRotationDeg:-a.relativeRotationDeg};}
  if(kind==='through_attachment'){const a=source as ThroughAttachment;return{...a,id:targetId,nodeId:map('node',a.nodeId),pathId:map('path',a.pathId)};}const a=source as PathAttachment;return{...a,id:targetId,nodeId:map('node',a.nodeId),pathId:map('path',a.pathId),normalOffsetMm:-a.normalOffsetMm,rotationOffsetDeg:-a.rotationOffsetDeg};
 };
 for(const [groupId,group] of Object.entries(state.groups)){
  const groupLinks=before.mirrorLinks.filter(l=>l.mirrorGroupId===groupId);
  if(group.mode==='independent'){links=links.filter(l=>l.mirrorGroupId!==groupId);continue;}
  const edited=new Set<'left'|'right'>();
  for(const link of groupLinks)for(const side of ['left','right'] as const){const id=side==='left'?link.leftEntityId:link.rightEntityId;if(!equal(old[link.entityType].find(e=>e.id===id),current[link.entityType].find(e=>e.id===id))||link.entityType==='node'&&Boolean(mirrorState(before).nodeFlipX[id])!==Boolean(state.nodeFlipX[id]))edited.add(side);}
  const freshNodes=current.node.filter(n=>!old.node.some(o=>o.id===n.id)),freshPaths=current.path.filter(p=>!old.path.some(o=>o.id===p.id));
  if(scope?.groupId===groupId&&(freshNodes.length||freshPaths.length))edited.add(scope.side);
  const sideFor=(kind:'node'|'path',id:string)=>group.left[kind==='node'?'nodeIds':'pathIds'].includes(id)?'left':group.right[kind==='node'?'nodeIds':'pathIds'].includes(id)?'right':undefined;
  for(const kind of kinds.slice(2))for(const entity of current[kind].filter(e=>!old[kind].some(o=>o.id===e.id))){const a=entity as PointAttachment|ThroughAttachment|PathAttachment,side='nodeAId' in a?sideFor('node',a.nodeAId):sideFor('node',a.nodeId);if(side)edited.add(side);}
  if(edited.size>1)throw new Error('一つの操作でMirror左右両側を直接編集できません');if(!edited.size)continue;
  const side=[...edited][0],other=side==='left'?'right':'left';
  const map=(kind:Kind,id:string)=>{const link=links.find(l=>l.mirrorGroupId===groupId&&l.entityType===kind&&(side==='left'?l.leftEntityId:l.rightEntityId)===id);if(!link)throw new Error('Mirror対応のない部品へは接続できません');return side==='left'?link.rightEntityId:link.leftEntityId;};
  for(const kind of kinds){
   for(const originalLink of groupLinks.filter(l=>l.entityType===kind)){
    const link=links.find(l=>l.id===originalLink.id)!,sourceId=side==='left'?link.leftEntityId:link.rightEntityId,targetId=side==='left'?link.rightEntityId:link.leftEntityId,source=current[kind].find(e=>e.id===sourceId),previous=old[kind].find(e=>e.id===sourceId);
    if(!source){current[kind]=current[kind].filter(e=>e.id!==targetId);links=links.filter(l=>l.id!==link.id);continue;}
    if(equal(source,previous)&&!(kind==='node'&&Boolean(mirrorState(before).nodeFlipX[sourceId])!==Boolean(state.nodeFlipX[sourceId])))continue;
    const reflected=reflect(kind,source,targetId,group.axisX,map,link);current[kind]=current[kind].map(e=>e.id===targetId?reflected:e);
   }
   const fresh=current[kind].filter(e=>!old[kind].some(o=>o.id===e.id)&&!links.some(l=>l.entityType===kind&&(l.leftEntityId===e.id||l.rightEntityId===e.id)));
   for(const source of fresh){
    let belongs=false;if(kind==='node'||kind==='path')belongs=scope?.groupId===groupId&&scope.side===side;else{const a=source as PointAttachment|ThroughAttachment|PathAttachment;belongs='nodeAId' in a?sideFor('node',a.nodeAId)===side:sideFor('node',a.nodeId)===side;}
    if(!belongs)continue;const targetId=allocate(),link:MirrorLink={id:allocate(),mirrorGroupId:groupId,entityType:kind,leftEntityId:side==='left'?source.id:targetId,rightEntityId:side==='left'?targetId:source.id};
    links.push(link);const reflected=reflect(kind,source,targetId,group.axisX,map,link);current[kind].push(reflected);
    if(kind==='node'||kind==='path'){const key=kind==='node'?'nodeIds':'pathIds';group[side][key].push(source.id);group[other][key].push(targetId);}
   }
  }
 }
 const existingNodes=new Set(current.node.map(n=>n.id)),existingPaths=new Set(current.path.map(p=>p.id));
 for(const id of Object.keys(state.nodeFlipX))if(!existingNodes.has(id))delete state.nodeFlipX[id];
 for(const group of Object.values(state.groups))for(const side of [group.left,group.right]){side.nodeIds=side.nodeIds.filter(id=>existingNodes.has(id));side.pathIds=side.pathIds.filter(id=>existingPaths.has(id));}
 next.nodes=current.node as DesignNode[];next.paths=current.path as DesignPath[];next.pointAttachments=current.point_attachment as PointAttachment[];next.throughAttachments=current.through_attachment as ThroughAttachment[];next.pathAttachments=current.path_attachment as PathAttachment[];next.mirrorLinks=links;next.design.editorConfig={...next.design.editorConfig,mirror:state};
 validateMirrorStructure(next,parts);
 const resolved=resolvePoses(next,parts);for(const target of mirroredNodes){const actual=resolved.nodes.find(n=>n.id===target.id);if(actual&&(Math.hypot(actual.xMm-target.xMm,actual.yMm-target.yMm)>1e-5||Math.abs(actual.rotationDeg-target.rotationDeg)>1e-5))throw new Error('Mirror方針と接続拘束が両立しません');}
 return resolved;
}
