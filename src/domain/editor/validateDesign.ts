import {validateStudio} from './studio';
import { designClearance,materialDiameter } from '../compatibility/settings';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { nodePart,nodeFlips } from '../geometry/nodePart';
import { connectionPointWorld,normalizeDeg } from '../geometry/transforms';
import { derivePathGeometry } from '../path/geometry';
import { pointCompatibility,throughCompatibility,pathPositionCompatibility } from '../compatibility/check';
import { pointUseCount } from './pointCommands';
import { resolvePoses } from './resolvePoses';
import { validateMirrorStructure } from './validateMirror';
import { mirrorState } from './createMirror';
import { mirrorNodeGeometry,mirrorPathGeometry } from './mirrorGeometry';
const close=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-5;
const angleClose=(a:number,b:number)=>close(normalizeDeg(a-b+180),180);
function finite(values:number[]){if(!values.every(Number.isFinite))throw new Error('Designに非有限値があります');}
function compatible(status:string){if(status==='incompatible')throw new Error('寸法または接続種別が不適合です');}
/** Validate submitted poses, rather than silently repairing a malformed snapshot. */
export function validateDesignAggregate(a:DesignAggregate,parts:Part[]):void{
 validateStudio(a);
 const clearance=designClearance(a);const sections=[a.nodes,a.paths,a.pointAttachments,a.throughAttachments,a.pathAttachments,a.mirrorLinks];if(sections.some(s=>!Array.isArray(s)))throw new Error('Design全体のSnapshotが必要です');
 const ids=sections.flatMap(s=>s.map(e=>e.id));if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw new Error('Design Entity IDが不正または重複しています');
 validateMirrorStructure(a,parts);
 for(const n of a.nodes){finite([n.xMm,n.yMm,n.rotationDeg,n.scaleX,n.scaleY,n.zIndex]);const p=parts.find(p=>p.id===n.partId);if(!p||p.geometryKind!=='node'||!Number.isFinite(p.widthMm)||!Number.isFinite(p.heightMm)||!p.widthMm||!p.heightMm||p.widthMm<=0||p.heightMm<=0||n.scaleX<=0||n.scaleY<=0||!Number.isInteger(n.zIndex)||typeof n.locked!=='boolean')throw new Error('Nodeの実寸・配置が不正です');}
 for(const path of a.paths){finite([path.zIndex]);const p=parts.find(p=>p.id===path.partId);if(!p||p.geometryKind!=='path'||!p.pathRenderSpec||!Number.isInteger(path.zIndex)||typeof path.locked!=='boolean')throw new Error('Path Part・描画設定が不正です');const g=derivePathGeometry(path);if(Math.abs(g.arcLengthMm-path.physicalLengthMm)>Math.max(.5,path.physicalLengthMm*.005))throw new Error('Path弧長の誤差が許容範囲外です');}
 const pairs=new Set<string>(),bindings=new Set<string>();
 for(const attachment of a.pointAttachments){
  finite([attachment.relativeRotationDeg]);if(!['align_opposite','keep_rotation','manual'].includes(attachment.orientationMode)||attachment.nodeAId===attachment.nodeBId)throw new Error('Point接続の向き・Nodeが不正です');
  const na=a.nodes.find(n=>n.id===attachment.nodeAId),nb=a.nodes.find(n=>n.id===attachment.nodeBId),pa=nodePart(a,na,parts),pb=nodePart(a,nb,parts),ca=pa?.connectionPoints.find(p=>p.id===attachment.pointAId),cb=pb?.connectionPoints.find(p=>p.id===attachment.pointBId);if(!na||!nb||!pa||!pb||!ca||!cb)throw new Error('Point接続の定義がありません');
  const key=[na.id+':'+ca.id,nb.id+':'+cb.id].sort().join('|');if(pairs.has(key))throw new Error('Point接続が重複しています');pairs.add(key);compatible(pointCompatibility(ca,cb,clearance).status);
  const wa=connectionPointWorld(na,pa,ca),wb=connectionPointWorld(nb,pb,cb);if(!close(wa.position.x,wb.position.x)||!close(wa.position.y,wb.position.y)||attachment.orientationMode==='align_opposite'&&!angleClose(wb.directionDeg,wa.directionDeg+180+attachment.relativeRotationDeg))throw new Error('Point接続の位置・向きが一致しません');
 }
 for(const attachment of a.throughAttachments){
  if(bindings.has(attachment.nodeId)||typeof attachment.flip180!=='boolean'||typeof attachment.lockedToNeighbors!=='boolean'||!Number.isInteger(attachment.orderIndex))throw new Error('Through接続が重複または不正です');bindings.add(attachment.nodeId);finite([attachment.distanceMm]);
  const node=a.nodes.find(n=>n.id===attachment.nodeId),part=nodePart(a,node,parts),hole=part?.throughHoles.find(h=>h.id===attachment.holeId),path=a.paths.find(p=>p.id===attachment.pathId),material=parts.find(p=>p.id===path?.partId);if(!node||!part||!hole||!path||!material||attachment.distanceMm<0||attachment.distanceMm>path.physicalLengthMm)throw new Error('Through接続の定義・距離が不正です');compatible(throughCompatibility(hole.diameterMm??part.holeDiameterMm,materialDiameter(material),clearance).status);
 }
 for(const attachment of a.pathAttachments){
  if(bindings.has(attachment.nodeId)||!['world_down','path_normal','path_tangent','keep_rotation'].includes(attachment.orientationMode)||!['start','end','position'].includes(attachment.anchorKind))throw new Error('Path接続が重複または不正です');bindings.add(attachment.nodeId);finite([attachment.normalOffsetMm,attachment.rotationOffsetDeg]);
  const node=a.nodes.find(n=>n.id===attachment.nodeId),part=nodePart(a,node,parts),point=part?.connectionPoints.find(p=>p.id===attachment.pointId),path=a.paths.find(p=>p.id===attachment.pathId),material=parts.find(p=>p.id===path?.partId),spec=material?.pathRenderSpec;if(!node||!part||!point||!path||!spec)throw new Error('Path接続の定義がありません');
  if(attachment.anchorKind==='position'){if(attachment.distanceMm===undefined||!Number.isFinite(attachment.distanceMm)||attachment.distanceMm<0||attachment.distanceMm>path.physicalLengthMm)throw new Error('Path接続距離が範囲外です');compatible(pathPositionCompatibility(part,point,material!,clearance).status);}else{
   if(attachment.distanceMm!==undefined)throw new Error('端点接続に距離は指定できません');const start=attachment.anchorKind==='start',limit=start?spec.startMaxConnections:spec.endMaxConnections,port=start?spec.startPortType:spec.endPortType;if(a.pathAttachments.filter(x=>x.pathId===path.id&&x.anchorKind===attachment.anchorKind).length>limit)throw new Error('Path端点の接続上限を超えています');if(port)compatible(pointCompatibility(point,{...point,type:port,localInnerDiameterMm:material?.innerDiameterMm,localThicknessMm:material?.thicknessMm},clearance).status);
  }
 }
 for(const node of a.nodes){const part=nodePart(a,node,parts)!;for(const point of part.connectionPoints)if(pointUseCount(a,node.id,point.id)>point.maxConnections)throw new Error('接続点の接続上限を超えています');}
 const resolved=resolvePoses(a,parts);for(const n of a.nodes){const expected=resolved.nodes.find(x=>x.id===n.id)!;if(!close(n.xMm,expected.xMm)||!close(n.yMm,expected.yMm)||!angleClose(n.rotationDeg,expected.rotationDeg))throw new Error('保存PoseがPath拘束と一致しません');}
 const state=mirrorState(a),flips=nodeFlips(a),mapped=(kind:string,id:string)=>a.mirrorLinks.find(l=>l.entityType===kind&&l.leftEntityId===id)?.rightEntityId;
 for(const link of a.mirrorLinks){const group=state.groups[link.mirrorGroupId];
  if(link.entityType==='node'){const l=a.nodes.find(n=>n.id===link.leftEntityId)!,r=a.nodes.find(n=>n.id===link.rightEntityId)!,part=parts.find(p=>p.id===l.partId)!,policy=part.mirrorPolicy==='manual'?link.manualMirrorPolicy!:part.mirrorPolicy,expected=mirrorNodeGeometry(l,flips[l.id]===true,group.axisX,policy);if(!close(r.xMm,expected.node.xMm)||!close(r.yMm,l.yMm)||!angleClose(r.rotationDeg,expected.node.rotationDeg)||r.scaleX!==l.scaleX||r.scaleY!==l.scaleY||r.zIndex!==l.zIndex||r.locked!==l.locked||(flips[r.id]===true)!==expected.flipped)throw new Error('Mirror Nodeの姿勢・反転状態が一致しません');
  }else if(link.entityType==='path'){const l=a.paths.find(p=>p.id===link.leftEntityId)!,r=a.paths.find(p=>p.id===link.rightEntityId)!,expected=mirrorPathGeometry(l,group.axisX);if(!close(r.start.x,expected.start.x)||!close(r.start.y,l.start.y)||!close(r.end.x,expected.end.x)||!close(r.end.y,l.end.y)||r.partId!==l.partId||r.physicalLengthMm!==l.physicalLengthMm||r.shape!==l.shape||r.bendSide!==l.bendSide||r.zIndex!==l.zIndex||r.locked!==l.locked)throw new Error('Mirror Pathが一致しません');
  }else if(link.entityType==='point_attachment'){const l=a.pointAttachments.find(x=>x.id===link.leftEntityId)!,r=a.pointAttachments.find(x=>x.id===link.rightEntityId)!;if(r.nodeAId!==mapped('node',l.nodeAId)||r.nodeBId!==mapped('node',l.nodeBId)||r.pointAId!==l.pointAId||r.pointBId!==l.pointBId||r.orientationMode!==l.orientationMode||!close(r.relativeRotationDeg,-l.relativeRotationDeg))throw new Error('Mirror Point接続が一致しません');
  }else if(link.entityType==='through_attachment'){const l=a.throughAttachments.find(x=>x.id===link.leftEntityId)!,r=a.throughAttachments.find(x=>x.id===link.rightEntityId)!;if(r.nodeId!==mapped('node',l.nodeId)||r.pathId!==mapped('path',l.pathId)||r.holeId!==l.holeId||!close(r.distanceMm,l.distanceMm)||r.orderIndex!==l.orderIndex||r.flip180!==l.flip180||r.lockedToNeighbors!==l.lockedToNeighbors)throw new Error('Mirror Through接続が一致しません');
  }else{const l=a.pathAttachments.find(x=>x.id===link.leftEntityId)!,r=a.pathAttachments.find(x=>x.id===link.rightEntityId)!;if(r.nodeId!==mapped('node',l.nodeId)||r.pathId!==mapped('path',l.pathId)||r.pointId!==l.pointId||r.anchorKind!==l.anchorKind||r.distanceMm!==l.distanceMm||r.orientationMode!==l.orientationMode||!close(r.normalOffsetMm,-l.normalOffsetMm)||!close(r.rotationOffsetDeg,-l.rotationOffsetDeg))throw new Error('Mirror Path接続が一致しません');}
 }
}
