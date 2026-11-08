import type {DesignAggregate} from '../../types/aggregate';
import type {Part,Vec2,DesignPath,DesignNode} from '../../types/domain';
import {derivePathGeometry} from '../path/geometry';
import {nearestDistance,pointAtDistance,type PathGeometry} from '../path/geometry';
import {guidePose,guideAngle,type LayoutGuide} from './layoutGuide';
import {normalizeDeg} from '../geometry/transforms';
import {centerAtGuideAnchor} from './guideAnchor';

export interface Placement {id:string;part:Part;point:Vec2;rotationDeg:number;length:number;shape:DesignPath['shape'];shallow:boolean;count?:number;spacingMm?:number;spacingMode?:'auto'|'manual';copyIds?:string[];pattern?:Part[]}
export interface BatchGuide {settings:LayoutGuide;geometry:PathGeometry|undefined;cssPxPerMm:number;allowSnap?:boolean}
/** Nominal body-box span along a direction, not measured photo or physical contact. */
export function automaticSpacingMm(part:Part,relativeAngleDeg=0):number|undefined{
 if(part.metadata?.provisionalRegistration)return undefined;
 const w=part.widthMm,h=part.heightMm;if(!w||!h||![w,h,relativeAngleDeg].every(Number.isFinite)||w<=0||h<=0)return;
 const t=relativeAngleDeg*Math.PI/180;return Math.abs(w*Math.cos(t))+Math.abs(h*Math.sin(t));
}
export function proposeBatch(a:DesignAggregate,p:Placement,guide?:BatchGuide):DesignAggregate{
 const count=p.count??1,ids=p.copyIds??[p.id],mode=p.spacingMode??(p.spacingMm===undefined?'auto':'manual');
 if(!Number.isInteger(count)||count<1||count>100)throw Error('配置する個数は1〜100個の整数にしてください');
 if(mode!=='auto'&&mode!=='manual')throw Error('間隔の決め方を確認してください');
 const manual=p.spacingMm??10;
 if(mode==='manual'&&(!Number.isFinite(manual)||manual<=0||manual>10000))throw Error('中心間隔は0より大きい10000mm以下の数にしてください');
 if(p.part.geometryKind==='path'&&count!==1)throw Error('チェーン・ひもは1本ずつ配置してください');
 const used=new Set([a.design.id,...a.nodes.map(n=>n.id),...a.paths.map(n=>n.id),...a.pointAttachments.map(n=>n.id),...a.throughAttachments.map(n=>n.id),...a.pathAttachments.map(n=>n.id),...a.mirrorLinks.map(n=>n.id)]);
 if(ids.length!==count||ids[0]!==p.id||new Set(ids).size!==count||ids.some(id=>!id||used.has(id)))throw Error('配置するパーツのIDが重複しています');
 if(count===1){const pose=p.part.geometryKind==='node'&&guide&&guide.allowSnap!==false?guidePose(guide.settings,guide.geometry,p.point,p.rotationDeg,guide.cssPxPerMm,p.part):undefined;return proposePlacement(a,pose?.snapped?{...p,point:pose.point,rotationDeg:pose.angle}:p);}
 const span=(angle:number)=>{const value=automaticSpacingMm(p.part,angle);if(value===undefined||value>10000)throw Error('登録サイズが未確認です。間隔を手動で指定してください');return value;};
 const projected=guide&&guide.allowSnap!==false?guidePose(guide.settings,guide.geometry,p.point,p.rotationDeg,guide.cssPxPerMm,p.part):undefined,along=projected?.snapped&&guide?.geometry;
 let distance=along?nearestDistance(along,projected!.anchor??projected!.point).distanceMm:0;
 const at=(d:number)=>{const pose=along?pointAtDistance(along,Math.min(along.arcLengthMm,d)):undefined,tangent=pose?Math.atan2(pose.tangent.y,pose.tangent.x)*180/Math.PI:p.rotationDeg,angle=pose?guideAngle(guide!.settings,tangent,p.rotationDeg,p.part):p.rotationDeg;return{pose,tangent,angle};};
 const proposals:Placement[]=[];let previous=at(distance),rowDistance=0;
 for(let i=0;i<count;i++){
  if(i){
   if(along){let increment=mode==='manual'?manual:span(previous.angle-previous.tangent);
    // Bounded fixed-point estimate of the adjacent projected half-widths on the curve.
    if(mode==='auto')for(let iteration=0;iteration<6;iteration++){const candidate=at(distance+increment);increment=(span(previous.angle-previous.tangent)+span(candidate.angle-candidate.tangent))/2;}
    distance+=increment;if(distance>along.arcLengthMm+1e-7)throw Error('ガイドの残りの長さが不足しています。個数・間隔・開始位置を調整してください');
   }else rowDistance+=mode==='manual'?manual:span(0);
  }
  const current=at(distance),theta=p.rotationDeg*Math.PI/180,point=current.pose?centerAtGuideAnchor(p.part,current.pose.position,current.angle):{x:p.point.x+rowDistance*Math.cos(theta),y:p.point.y+rowDistance*Math.sin(theta)};
  proposals.push({...p,id:ids[i],point,rotationDeg:current.angle});previous=current;
 }
 return proposals.reduce((next,proposal)=>proposePlacement(next,proposal),a);
}
/** A transient proposal only. The editor commits this through its existing validated history command. */
export function proposePlacement(a:DesignAggregate,p:Placement):DesignAggregate{
 if(!Number.isFinite(p.point.x)||!Number.isFinite(p.point.y)||!Number.isFinite(p.rotationDeg))throw Error('配置位置を確認してください');
 const zIndex=Math.max(0,...a.nodes.map(n=>n.zIndex),...a.paths.map(n=>n.zIndex))+1;
 if(p.part.geometryKind==='path'){
  const path:DesignPath={id:p.id,partId:p.part.id,start:{...p.point},end:{x:p.point.x+p.length*(p.shape==='straight'?1:p.shallow?.95:.7),y:p.point.y},physicalLengthMm:p.length,shape:p.shape,bendSide:p.shape==='straight'?undefined:1,zIndex,locked:false};
  derivePathGeometry(path);return {...a,paths:[...a.paths,path]};
 }
 const node:DesignNode={id:p.id,partId:p.part.id,xMm:p.point.x,yMm:p.point.y,rotationDeg:p.rotationDeg,scaleX:1,scaleY:1,zIndex,locked:false};
 return {...a,nodes:[...a.nodes,node]};
}
