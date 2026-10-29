import type { DesignPath,Vec2 } from '../../types/domain';
export interface PathGeometry {points:Vec2[];cumulativeLengthMm:number[];arcLengthMm:number}
const dist=(a:Vec2,b:Vec2)=>Math.hypot(b.x-a.x,b.y-a.y);
function table(points:Vec2[]):PathGeometry{const cumulativeLengthMm=[0];for(let i=1;i<points.length;i++)cumulativeLengthMm.push(cumulativeLengthMm[i-1]+dist(points[i-1],points[i]));return{points,cumulativeLengthMm,arcLengthMm:cumulativeLengthMm.at(-1)!};}
export function derivePathGeometry(path:DesignPath):PathGeometry{
 const {start:a,end:b,physicalLengthMm:length,shape}=path;const dx=b.x-a.x,dy=b.y-a.y,chord=dist(a,b);
 if(![a.x,a.y,b.x,b.y,length].every(Number.isFinite)||length<=0||chord<=1e-9||chord>length+1e-7)throw new Error('Pathの端点と物理長が不正です');
 if(shape==='straight'){if(Math.abs(chord-length)>1e-7)throw new Error('直線の端点間距離は物理長と一致させてください');return table([a,b]);}
 if(shape!=='u'&&shape!=='v')throw new Error('Path形状が不正です');
 if(path.bendSide!==1&&path.bendSide!==-1)throw new Error('曲がる方向が必要です');
 if(Math.abs(dx)<1e-7)throw new Error('垂直U/Vの扱いは設計確認中です');
 const side=path.bendSide*Math.sign(dx),normal={x:-dy/chord*side,y:dx/chord*side};
 const middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 if(shape==='v'){const offset=Math.sqrt(Math.max(0,length*length-chord*chord))/2;return table([a,{x:middle.x+offset*normal.x,y:middle.y+offset*normal.y},b]);}
 function curve(sag:number){const points:Vec2[]=[];for(let i=0;i<=256;i++){const t=i/256;const offset=4*sag*t*(1-t);points.push({x:a.x+dx*t+normal.x*offset,y:a.y+dy*t+normal.y*offset});}points[0]=a;points[256]=b;return table(points);}
 let low=0,high=length,result=curve(0);for(let i=0;i<32;i++){const sag=(low+high)/2;result=curve(sag);if(Math.abs(result.arcLengthMm-length)<=Math.max(1e-6,length*1e-8))return result;if(result.arcLengthMm<length)low=sag;else high=sag;}
 if(Math.abs(result.arcLengthMm-length)>Math.max(.5,length*.005))throw new Error('Path長さを解決できませんでした');return result;
}
export function pointAtDistance(geometry:PathGeometry,distanceMm:number){
 if(!Number.isFinite(distanceMm)||distanceMm<0||distanceMm>geometry.arcLengthMm+1e-6)throw new Error('Path上の距離が範囲外です');
 const distance=Math.min(distanceMm,geometry.arcLengthMm);let low=1,high=geometry.points.length-1;while(low<high){const mid=(low+high)>>1;if(geometry.cumulativeLengthMm[mid]<distance)low=mid+1;else high=mid;}
 const i=low,a=geometry.points[i-1],b=geometry.points[i],segment=dist(a,b),t=segment?(distance-geometry.cumulativeLengthMm[i-1])/segment:0;
 return{position:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},tangent:{x:(b.x-a.x)/segment,y:(b.y-a.y)/segment}};
}
export function nearestDistance(geometry:PathGeometry,point:Vec2){let best=Infinity,distanceMm=0;for(let i=1;i<geometry.points.length;i++){const a=geometry.points[i-1],b=geometry.points[i],dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/squared));const error=Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);if(error<best){best=error;distanceMm=geometry.cumulativeLengthMm[i-1]+t*Math.sqrt(squared);}}return{distanceMm,distanceToPathMm:best};}
export function clampEndpoint(path:DesignPath,endpoint:'start'|'end',target:Vec2):DesignPath{const fixed=endpoint==='start'?path.end:path.start;const dx=target.x-fixed.x,dy=target.y-fixed.y,c=Math.hypot(dx,dy);if(c<1e-9)throw new Error('端点を重ねられません');const scale=path.shape==='straight'||c>path.physicalLengthMm?path.physicalLengthMm/c:1;const next={...path,[endpoint]:{x:fixed.x+dx*scale,y:fixed.y+dy*scale}};derivePathGeometry(next);return next;}
