import type { DesignNode,Part,ThroughHole,Vec2 } from '../../types/domain';
import { normalizeDeg,rotate } from '../geometry/transforms';
export function throughPose(node:DesignNode,part:Part,hole:ThroughHole,position:Vec2,tangent:Vec2,flip180:boolean):DesignNode{
 if(part.geometryKind!=='node'||!part.widthMm||!part.heightMm)throw new Error('実寸のあるNode Partが必要です');
 const rotationDeg=normalizeDeg(Math.atan2(tangent.y,tangent.x)*180/Math.PI-hole.axisDeg+(flip180?180:0));
 const offset=rotate({x:((hole.entryXNorm+hole.exitXNorm)/2-.5)*part.widthMm*node.scaleX,y:((hole.entryYNorm+hole.exitYNorm)/2-.5)*part.heightMm*node.scaleY},rotationDeg);
 return{...node,rotationDeg,xMm:position.x-offset.x,yMm:position.y-offset.y};
}
export function projectBoundsRelativeToHole(node:DesignNode,part:Part,hole:ThroughHole,tangent:Vec2){
 if(!part.widthMm||!part.heightMm)throw new Error('実寸が必要です');
 const hx=(hole.entryXNorm+hole.exitXNorm)/2,hy=(hole.entryYNorm+hole.exitYNorm)/2;
 const projected=[...[0,1].flatMap(x=>[0,1].map(y=>{const p=rotate({x:(x-hx)*part.widthMm!*node.scaleX,y:(y-hy)*part.heightMm!*node.scaleY},node.rotationDeg);return p.x*tangent.x+p.y*tangent.y;}))];
 return{beforeMm:-Math.min(...projected),afterMm:Math.max(...projected)};
}
export interface OccupiedInterval {id:string;start:number;end:number}
export function validateOccupancy(intervals:OccupiedInterval[],physicalLengthMm:number,allowedOverlapMm=0){
 if(!Number.isFinite(physicalLengthMm)||physicalLengthMm<=0||!Number.isFinite(allowedOverlapMm)||allowedOverlapMm<0)throw new Error('占有範囲が不正です');
 const sorted=[...intervals].sort((a,b)=>a.start-b.start);let previousEnd=-Infinity;
 for(const interval of sorted){if(![interval.start,interval.end].every(Number.isFinite)||interval.start>interval.end)throw new Error('占有区間が不正です');if(interval.start< -1e-7||interval.end>physicalLengthMm+1e-7)throw new Error(`Pathの長さが不足しています（${Math.max(-interval.start,interval.end-physicalLengthMm).toFixed(2)} mm）`);if(previousEnd-interval.start>allowedOverlapMm+1e-7)throw new Error('Path上のパーツが重なっています');previousEnd=Math.max(previousEnd,interval.end);}
}
