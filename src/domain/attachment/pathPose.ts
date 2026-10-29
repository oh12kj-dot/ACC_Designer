import type { DesignNode,Part,ConnectionPoint,PathAttachment,DesignPath } from '../../types/domain';
import { derivePathGeometry,pointAtDistance,type PathGeometry } from '../path/geometry';
import { connectionPointWorld,normalizeDeg } from '../geometry/transforms';
export function pathAnchorPose(node:DesignNode,part:Part,point:ConnectionPoint,path:DesignPath,attachment:PathAttachment,geometry:PathGeometry=derivePathGeometry(path)):DesignNode{
 const distance=attachment.anchorKind==='start'?0:attachment.anchorKind==='end'?path.physicalLengthMm:attachment.distanceMm;
 if(distance===undefined||!Number.isFinite(distance)||distance<0||distance>path.physicalLengthMm||!Number.isFinite(attachment.normalOffsetMm)||!Number.isFinite(attachment.rotationOffsetDeg))throw new Error('Path接続の距離・向きが不正です');
 if(attachment.anchorKind!=='position'&&attachment.distanceMm!==undefined)throw new Error('端点接続には距離を指定できません');
 const sample=pointAtDistance(geometry,distance/path.physicalLengthMm*geometry.arcLengthMm),tangentDeg=Math.atan2(sample.tangent.y,sample.tangent.x)*180/Math.PI;
 const position={x:sample.position.x-sample.tangent.y*attachment.normalOffsetMm,y:sample.position.y+sample.tangent.x*attachment.normalOffsetMm};
 const body=attachment.orientationMode==='world_down'?90:attachment.orientationMode==='path_tangent'?tangentDeg:tangentDeg+90*(attachment.normalOffsetMm<0?-1:1);
 const posed={...node,rotationDeg:attachment.orientationMode==='keep_rotation'?node.rotationDeg:normalizeDeg(body+180-point.directionDeg+attachment.rotationOffsetDeg)};const world=connectionPointWorld(posed,part,point);
 return{...posed,xMm:posed.xMm+position.x-world.position.x,yMm:posed.yMm+position.y-world.position.y};
}
