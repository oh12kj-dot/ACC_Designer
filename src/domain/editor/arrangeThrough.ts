import { nodePart } from '../geometry/nodePart';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { throughPose,projectBoundsRelativeToHole } from '../attachment/through';
import { resolvePoses } from './resolvePoses';
export function arrangeThrough(aggregate:DesignAggregate,parts:Part[],pathId:string,gapMm:number,orderedIds?:string[]){
 if(!Number.isFinite(gapMm)||gapMm<0)throw new Error('隙間は0以上の数値を入力してください');const path=aggregate.paths.find(p=>p.id===pathId);if(!path)throw new Error('Pathが見つかりません');
 const attachments=aggregate.throughAttachments.filter(a=>a.pathId===pathId).sort((a,b)=>a.distanceMm-b.distanceMm);
 if(orderedIds){if(orderedIds.length!==attachments.length||new Set(orderedIds).size!==attachments.length||orderedIds.some(id=>!attachments.some(a=>a.id===id)))throw new Error('並び順が不正です');attachments.sort((a,b)=>orderedIds.indexOf(a.id)-orderedIds.indexOf(b.id));}
 let cursor=0;const updates=new Map<string,{distanceMm:number;orderIndex:number}>();
 attachments.forEach((a,i)=>{const n=aggregate.nodes.find(n=>n.id===a.nodeId),part=nodePart(aggregate,n,parts),hole=part?.throughHoles.find(h=>h.id===a.holeId);if(!n||!part||!hole)throw new Error('通し配置のパーツが見つかりません');const pose=throughPose(n,part,hole,{x:0,y:0},{x:1,y:0},a.flip180),bounds=projectBoundsRelativeToHole(pose,part,hole,{x:1,y:0});updates.set(a.id,{distanceMm:cursor+bounds.beforeMm,orderIndex:i});cursor+=bounds.beforeMm+bounds.afterMm+(i<attachments.length-1?gapMm:0);});
 if(cursor>path.physicalLengthMm+1e-7)throw new Error(`自動整列には${(cursor-path.physicalLengthMm).toFixed(2)} mm不足しています`);
 return resolvePoses({...aggregate,throughAttachments:aggregate.throughAttachments.map(a=>updates.has(a.id)?{...a,...updates.get(a.id)!}:a)},parts);
}
export function reorderThrough(aggregate:DesignAggregate,parts:Part[],attachmentId:string,direction:-1|1,gapMm:number){const attachment=aggregate.throughAttachments.find(a=>a.id===attachmentId);if(!attachment)throw new Error('通し配置が見つかりません');const ids=aggregate.throughAttachments.filter(a=>a.pathId===attachment.pathId).sort((a,b)=>a.distanceMm-b.distanceMm).map(a=>a.id),index=ids.indexOf(attachmentId),target=index+direction;if(target<0||target>=ids.length)return aggregate;[ids[index],ids[target]]=[ids[target],ids[index]];return arrangeThrough(aggregate,parts,attachment.pathId,gapMm,ids);}
