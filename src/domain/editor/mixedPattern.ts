import type {DesignAggregate} from '../../types/aggregate';
import type {Part} from '../../types/domain';
import {automaticSpacingMm,proposePlacement,type Placement,type BatchGuide} from './placement';
import {guideAngle} from './layoutGuide';
import {centerAtGuideAnchor} from './guideAnchor';
import {nearestDistance,pointAtDistance} from '../path/geometry';
export function expandPattern(sequence:string[],repeat:number,symmetric:boolean,center?:string){if(!sequence.length||sequence.length>10||!Number.isInteger(repeat)||repeat<1||repeat>100)throw Error('配列には1〜10種類、繰り返しは1〜100回で指定してください');const arm=Array.from({length:repeat},()=>sequence).flat(),ids=symmetric?[...arm,...(center?[center]:[]),...arm.toReversed()]:[...arm,...(center?[center]:[])];if(ids.length>100)throw Error('配列全体を100個以下にしてください');return ids;}
export function proposeMixed(a:DesignAggregate,p:Placement,list:Part[],guide:BatchGuide){const g=guide.geometry;if(!g||!guide.settings.enabled)throw Error('混在配列には配置ガイド、または紐の配置範囲を設定してください');const ids=p.copyIds??[],count=list.length,manual=p.spacingMode==='manual',spacing=p.spacingMm??10;if(!count||count>100||list.some(p=>p.geometryKind!=='node'||p.isArchived)||ids.length!==count||new Set(ids).size!==count||ids.some(id=>!id||[...a.nodes,...a.paths].some(n=>n.id===id)))throw Error('配列パーツ・個数・IDを確認してください');if(manual&&(!Number.isFinite(spacing)||spacing<=0||spacing>10000))throw Error('間隔は0より大きい10000mm以下にしてください');
 const center=nearestDistance(g,p.point).distanceMm;
 const at=(d:number,part:Part)=>{const pose=pointAtDistance(g,Math.max(0,Math.min(g.arcLengthMm,d))),tangent=Math.atan2(pose.tangent.y,pose.tangent.x)*180/Math.PI,angle=guideAngle(guide.settings,tangent,p.rotationDeg,part),span=manual?spacing:automaticSpacingMm(part,angle-tangent);if(span===undefined||!Number.isFinite(span)||span<=0)throw Error('寸法が未確認のため、自動間隔は使えません。手動間隔を指定してください');return {point:centerAtGuideAnchor(part,pose.position,angle),angle,span};};
 let widths=list.map(part=>at(center,part).span),positions:number[]=[];
 for(let iteration=0;iteration<8;iteration++){let cursor=center-widths.reduce((n,w)=>n+w,0)/2;positions=widths.map(w=>{const d=cursor+w/2;cursor+=w;return d;});widths=list.map((part,i)=>at(positions[i],part).span);}
 if(positions[0]-widths[0]/2< -1e-5||positions.at(-1)!+widths.at(-1)!/2>g.arcLengthMm+1e-5)throw Error('配列が紐の配置範囲を超えています。位置・個数・間隔を調整してください');
 return list.reduce((next,part,i)=>{const pose=at(positions[i],part);return proposePlacement(next,{...p,id:ids[i],part,point:pose.point,rotationDeg:pose.angle});},a);
}
