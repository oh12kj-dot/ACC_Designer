import { validateMirrorStructure } from './validateMirror';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part,MirrorLink,MirrorPolicy } from '../../types/domain';
import { isNodeFlipped,nodeFlips } from '../geometry/nodePart';
import { mirrorNodeGeometry,mirrorPathGeometry } from './mirrorGeometry';
import { resolvePoses } from './resolvePoses';
export interface MirrorSide {nodeIds:string[];pathIds:string[]}
export interface MirrorGroup {axisX:number;mode:'linked'|'independent';left:MirrorSide;right:MirrorSide}
export interface MirrorState {version:1;nodeFlipX:Record<string,boolean>;groups:Record<string,MirrorGroup>}
export function mirrorState(aggregate:DesignAggregate):MirrorState{
 const flips=nodeFlips(aggregate),stored=aggregate.design.editorConfig?.mirror;
 return stored===undefined?{version:1,nodeFlipX:flips,groups:{}}:structuredClone(stored) as MirrorState;
}
/** Clone the entire attachment-connected structure; no attachments are silently dropped. */
export function createMirror(aggregate:DesignAggregate,parts:Part[],seed:{nodeId?:string;pathId?:string;nodeIds?:string[];pathIds?:string[]},axisX:number,manual:Record<string,Exclude<MirrorPolicy,'manual'>>={},newId:()=>string=()=>crypto.randomUUID()):DesignAggregate{
 validateMirrorStructure(aggregate,parts);
 if(!Number.isFinite(axisX))throw new Error('Mirror軸が不正です');
 const nodes=new Set<string>(seed.nodeIds??[]),paths=new Set<string>(seed.pathIds??[]);if(seed.nodeId)nodes.add(seed.nodeId);if(seed.pathId)paths.add(seed.pathId);
 if(!nodes.size&&!paths.size||[...nodes].some(id=>!aggregate.nodes.some(n=>n.id===id))||[...paths].some(id=>!aggregate.paths.some(p=>p.id===id)))throw new Error('複製する構造を選択してください');
 let changed=true;while(changed){const size=nodes.size+paths.size;for(const a of aggregate.pointAttachments)if(nodes.has(a.nodeAId)||nodes.has(a.nodeBId)){nodes.add(a.nodeAId);nodes.add(a.nodeBId);}for(const a of [...aggregate.throughAttachments,...aggregate.pathAttachments])if(nodes.has(a.nodeId)||paths.has(a.pathId)){nodes.add(a.nodeId);paths.add(a.pathId);}changed=size!==nodes.size+paths.size;}
 const state=mirrorState(aggregate);for(const group of Object.values(state.groups))for(const side of [group.left,group.right])if(side.nodeIds.some(id=>nodes.has(id))||side.pathIds.some(id=>paths.has(id)))throw new Error('この構造は既にMirrorグループに含まれています');
 const sourceNodes=aggregate.nodes.filter(n=>nodes.has(n.id)),sourcePaths=aggregate.paths.filter(p=>paths.has(p.id));
 const sourcePoint=aggregate.pointAttachments.filter(a=>nodes.has(a.nodeAId)&&nodes.has(a.nodeBId)),sourceThrough=aggregate.throughAttachments.filter(a=>nodes.has(a.nodeId)&&paths.has(a.pathId)),sourceAnchor=aggregate.pathAttachments.filter(a=>nodes.has(a.nodeId)&&paths.has(a.pathId));
 const sources=[...sourceNodes,...sourcePaths,...sourcePoint,...sourceThrough,...sourceAnchor];
 if(new Set(sources.map(e=>e.id)).size!==sources.length)throw new Error('Mirror元Entity IDが重複しています');
 const usedIds=new Set([...aggregate.nodes,...aggregate.paths,...aggregate.pointAttachments,...aggregate.throughAttachments,...aggregate.pathAttachments,...aggregate.mirrorLinks].map(e=>e.id));Object.keys(state.groups).forEach(id=>usedIds.add(id));
 const allocate=()=>{const id=newId();if(!id||usedIds.has(id))throw new Error('Mirror IDが重複しています');usedIds.add(id);return id;};
 const ids=new Map(sources.map(entity=>[entity.id,allocate()])),groupId=allocate(),links:MirrorLink[]=[];
 const link=(entityType:MirrorLink['entityType'],id:string,policy?:Exclude<MirrorPolicy,'manual'>)=>{links.push({id:allocate(),mirrorGroupId:groupId,entityType,leftEntityId:id,rightEntityId:ids.get(id)!,...(policy?{manualMirrorPolicy:policy}:{})});};
 const clonedNodes=sourceNodes.map(node=>{const part=parts.find(p=>p.id===node.partId);if(!part)throw new Error('Partが見つかりません');const policy=part.mirrorPolicy==='manual'?manual[part.id]:part.mirrorPolicy;if(!policy)throw new Error(`${part.name}の画像反転方針を選択してください`);const result=mirrorNodeGeometry(node,isNodeFlipped(aggregate,node.id),axisX,policy);const id=ids.get(node.id)!;state.nodeFlipX[id]=result.flipped;link('node',node.id,part.mirrorPolicy==='manual'?policy:undefined);return{...result.node,id};});
 const clonedPaths=sourcePaths.map(path=>{link('path',path.id);return{...mirrorPathGeometry(path,axisX),id:ids.get(path.id)!};});
 const clonedPoint=sourcePoint.map(a=>{link('point_attachment',a.id);return{...a,id:ids.get(a.id)!,nodeAId:ids.get(a.nodeAId)!,nodeBId:ids.get(a.nodeBId)!,relativeRotationDeg:-a.relativeRotationDeg};});
 const clonedThrough=sourceThrough.map(a=>{link('through_attachment',a.id);return{...a,id:ids.get(a.id)!,nodeId:ids.get(a.nodeId)!,pathId:ids.get(a.pathId)!};});
 const clonedAnchor=sourceAnchor.map(a=>{link('path_attachment',a.id);return{...a,id:ids.get(a.id)!,nodeId:ids.get(a.nodeId)!,pathId:ids.get(a.pathId)!,normalOffsetMm:-a.normalOffsetMm,rotationOffsetDeg:-a.rotationOffsetDeg};});
 state.groups[groupId]={axisX,mode:'linked',left:{nodeIds:[...nodes],pathIds:[...paths]},right:{nodeIds:clonedNodes.map(n=>n.id),pathIds:clonedPaths.map(p=>p.id)}};
 const next={...aggregate,design:{...aggregate.design,editorConfig:{...aggregate.design.editorConfig,mirror:state}},nodes:[...aggregate.nodes,...clonedNodes],paths:[...aggregate.paths,...clonedPaths],pointAttachments:[...aggregate.pointAttachments,...clonedPoint],throughAttachments:[...aggregate.throughAttachments,...clonedThrough],pathAttachments:[...aggregate.pathAttachments,...clonedAnchor],mirrorLinks:[...aggregate.mirrorLinks,...links]};
 validateMirrorStructure(next,parts);
 const resolved=resolvePoses(next,parts);for(const mirrored of clonedNodes){const actual=resolved.nodes.find(n=>n.id===mirrored.id)!;if(Math.hypot(actual.xMm-mirrored.xMm,actual.yMm-mirrored.yMm)>1e-5||Math.abs(actual.rotationDeg-mirrored.rotationDeg)>1e-5)throw new Error('Mirror方針と接続拘束が両立しません。接続解除または画像反転方針の変更が必要です');}
 return resolved;
}
export function makeMirrorIndependent(aggregate:DesignAggregate,groupId:string):DesignAggregate{
 const state=mirrorState(aggregate),group=state.groups[groupId];if(!group)throw new Error('Mirrorグループが見つかりません');group.mode='independent';return{...aggregate,design:{...aggregate.design,editorConfig:{...aggregate.design.editorConfig,mirror:state}},mirrorLinks:aggregate.mirrorLinks.filter(l=>l.mirrorGroupId!==groupId)};
}

/** Re-link regenerates the opposite side from the explicit chosen source, without merging. */
export function relinkMirror(aggregate:DesignAggregate,parts:Part[],groupId:string,sourceSide:'left'|'right',manual:Record<string,Exclude<MirrorPolicy,'manual'>>={},newId:()=>string=()=>crypto.randomUUID()):DesignAggregate{
 validateMirrorStructure(aggregate,parts);const state=mirrorState(aggregate),group=state.groups[groupId];if(!group||group.mode!=='independent')throw new Error('独立編集中のグループを選択してください');
 const source=group[sourceSide],target=group[sourceSide==='left'?'right':'left'];if(!source.nodeIds.length&&!source.pathIds.length)throw new Error('基準側の構造がありません');
 const deleteNodes=new Set(target.nodeIds),deletePaths=new Set(target.pathIds);
 // Cross-side external connections cannot survive opposite-side replacement.
 for(const a of aggregate.pointAttachments)if(deleteNodes.has(a.nodeAId)!==deleteNodes.has(a.nodeBId))throw new Error('再生成側と外部のPoint接続を先に解除してください');
 for(const a of [...aggregate.throughAttachments,...aggregate.pathAttachments])if(deleteNodes.has(a.nodeId)!==deletePaths.has(a.pathId))throw new Error('再生成側と外部のPath接続を先に解除してください');
 delete state.groups[groupId];for(const id of deleteNodes)delete state.nodeFlipX[id];
 const base={...aggregate,design:{...aggregate.design,editorConfig:{...aggregate.design.editorConfig,mirror:state}},nodes:aggregate.nodes.filter(n=>!deleteNodes.has(n.id)),paths:aggregate.paths.filter(p=>!deletePaths.has(p.id)),pointAttachments:aggregate.pointAttachments.filter(a=>!deleteNodes.has(a.nodeAId)&&!deleteNodes.has(a.nodeBId)),throughAttachments:aggregate.throughAttachments.filter(a=>!deleteNodes.has(a.nodeId)&&!deletePaths.has(a.pathId)),pathAttachments:aggregate.pathAttachments.filter(a=>!deleteNodes.has(a.nodeId)&&!deletePaths.has(a.pathId)),mirrorLinks:aggregate.mirrorLinks.filter(l=>l.mirrorGroupId!==groupId)};
 return createMirror(base,parts,{nodeIds:source.nodeIds,pathIds:source.pathIds},group.axisX,manual,newId);
}
