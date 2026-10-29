import type { DesignPath } from '../types/domain';
import { derivePathGeometry,pointAtDistance } from '../domain/path/geometry';
export function segmentPlacements(path:DesignPath,image:{width:number;height:number},segmentLengthMm:number,overlapMm:number){
 if(!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<=0||image.height<=0)throw new Error('区間画像の寸法が不正です');
 if(!Number.isFinite(segmentLengthMm)||segmentLengthMm<=0||!Number.isFinite(overlapMm)||overlapMm<0||overlapMm>=segmentLengthMm)throw new Error('区間長と重なりを確認してください。重なりは区間長未満です');
 const step=segmentLengthMm-overlapMm;if(Math.ceil(path.physicalLengthMm/step)>10000)throw new Error('反復数が多すぎます。区間長または重なりを調整してください');const geometry=derivePathGeometry(path);
 const placements=[];for(let distance=0;distance<path.physicalLengthMm;distance+=step){const length=Math.min(segmentLengthMm,path.physicalLengthMm-distance),sample=pointAtDistance(geometry,(distance+length/2)/path.physicalLengthMm*geometry.arcLengthMm);const height=image.height/image.width*segmentLengthMm;placements.push({position:sample.position,angle:Math.atan2(sample.tangent.y,sample.tangent.x),length,height,sourceWidth:image.width*length/segmentLengthMm});}
 return placements;
}

export function drawSegmentPath(ctx:CanvasRenderingContext2D,path:DesignPath,image:HTMLImageElement,segmentLengthMm:number,overlapMm:number){for(const tile of segmentPlacements(path,image,segmentLengthMm,overlapMm)){ctx.save();ctx.translate(tile.position.x,tile.position.y);ctx.rotate(tile.angle);ctx.drawImage(image,0,0,tile.sourceWidth,image.height,-tile.length/2,-tile.height/2,tile.length,tile.height);ctx.restore();}}
