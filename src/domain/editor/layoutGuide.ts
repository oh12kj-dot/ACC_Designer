import type {Vec2,Part} from '../../types/domain';
import type {DesignAggregate} from '../../types/aggregate';
import {nearestDistance,pointAtDistance,type PathGeometry} from '../path/geometry';
import {normalizeDeg} from '../geometry/transforms';
import {reviewedGuideAxis} from './reviewedGuideAxis';
import {guideAnchorWorld,centerAtGuideAnchor,reviewedGuideAnchor} from './guideAnchor';

export interface LayoutGuide {enabled:boolean;snap:boolean;rotate:boolean;offset:number;shape:'u'|'v';width:number;drop:number;center:Vec2}
export function defaultLayoutGuide():LayoutGuide{return{enabled:false,snap:true,rotate:true,offset:0,shape:'u',width:180,drop:120,center:{x:150,y:350/3}};}
export function layoutGeometry(g:LayoutGuide):PathGeometry|undefined{
 if(!g.enabled||![g.width,g.drop,g.center.x,g.center.y].every(Number.isFinite)||g.width<=0||g.drop<=0||g.width>10000||g.drop>10000)return;
 const count=g.shape==='v'?2:128;
 const points=Array.from({length:count+1},(_,i)=>{const t=i/count;return{x:g.center.x+g.width*(t-.5),y:g.center.y-g.drop/2+g.drop*(g.shape==='v'?1-Math.abs(2*t-1):4*t*(1-t))};});
 const cumulativeLengthMm=[0];for(let i=1;i<points.length;i++)cumulativeLengthMm.push(cumulativeLengthMm[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
 return{points,cumulativeLengthMm,arcLengthMm:cumulativeLengthMm.at(-1)!};
}
/** A display convention for unknown holes; never creates or verifies hole data. */
export function guideAxisDeg(part:Part,scaleX=1,scaleY=1):number|undefined{
 const holes=part.throughHoles??[];
 const axes=holes.map(h=>h.axisDeg);
 if(axes.some(a=>!Number.isFinite(a)))return;
 const reviewed=reviewedGuideAxis(part);
 if(!axes.length&&reviewed==='none')return;
 const axis=axes[0]??(typeof reviewed==='number'?reviewed:90);
 if(axes.some(a=>Math.abs(Math.sin((a-axis)*Math.PI/180))>1e-7))return;
 const t=axis*Math.PI/180;
 return Math.atan2(Math.sin(t)*scaleY,Math.cos(t)*scaleX)*180/Math.PI;
}
export function guideAngle(g:LayoutGuide,tangentDeg:number,angle:number,part?:Part,scaleX=1,scaleY=1){
 if(part&&reviewedGuideAnchor(part)?.rotationMode==='keep-current')return angle;
 const axis=part?guideAxisDeg(part,scaleX,scaleY):0;
 if(!g.rotate||axis===undefined)return angle;
 let base=tangentDeg-axis;
 // An axis is an unoriented line. Select its upright half-turn equivalent
 // using the transformed image top, before applying the user's explicit offset.
 const up=scaleY*Math.cos(base*Math.PI/180);
 const difference=(v:number)=>Math.abs(normalizeDeg(v-angle+180)-180);
 if(up< -1e-9||Math.abs(up)<=1e-9&&difference(base+180)<difference(base)-1e-9)base+=180;
 return normalizeDeg(base+g.offset);
}
export function guideLengthMm(g:LayoutGuide){return layoutGeometry({...g,enabled:true})?.arcLengthMm;}
/** Uniform scaling preserves the chosen shape/aspect. It never resizes placed material. */
export function resizeGuideLength(g:LayoutGuide,lengthMm:number):LayoutGuide{
 const current=guideLengthMm(g);
 if(!Number.isFinite(lengthMm)||lengthMm<=0||lengthMm>10000)throw Error('紐の長さは0より大きい10000mm以下の数にしてください');
 if(!current)throw Error('先にガイドの幅と下がりを正しく入力してください');
 const ratio=lengthMm/current,next={...g,width:g.width*ratio,drop:g.drop*ratio};
 if(!guideLengthMm(next))throw Error('この形状では長さを適用できません。幅・下がりを確認してください');
 return next;
}
/** Visual center/angle alignment only: never creates physical attachments or rewrites Part geometry. */
export function guidePose(g:LayoutGuide,geometry:PathGeometry|undefined,point:Vec2,angle:number,cssPxPerMm:number,part?:Part,scaleX=1,scaleY=1){
 if(!g.snap||!geometry||!Number.isFinite(cssPxPerMm)||cssPxPerMm<=0)return{point,angle,snapped:false};
 const near=nearestDistance(geometry,guideAnchorWorld(part,point,angle,scaleX,scaleY));if(near.distanceToPathMm*cssPxPerMm>12)return{point,angle,snapped:false};
 const pose=pointAtDistance(geometry,near.distanceMm);
 const finalAngle=guideAngle(g,Math.atan2(pose.tangent.y,pose.tangent.x)*180/Math.PI,angle,part,scaleX,scaleY);
 return{point:centerAtGuideAnchor(part,pose.position,finalAngle,scaleX,scaleY),anchor:pose.position,angle:finalAngle,snapped:true};
}
export function canGuideMove(a:DesignAggregate,id:string){
 const node=a.nodes.find(n=>n.id===id);return !(a.design?.editorConfig?.visualAssembliesV1 as {groups?:{baseNodeId:string;decorationNodeIds:string[]}[]}|undefined)?.groups?.some(g=>g.baseNodeId===id||g.decorationNodeIds.includes(id))&&!!node&&!node.locked&&!a.pointAttachments.some(e=>e.nodeAId===id||e.nodeBId===id)&&!a.throughAttachments.some(e=>e.nodeId===id)&&!a.pathAttachments.some(e=>e.nodeId===id)&&!a.mirrorLinks.some(e=>e.leftEntityId===id||e.rightEntityId===id);
}
