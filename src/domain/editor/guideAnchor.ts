import type {Part,Vec2} from '../../types/domain';
import {rotate} from '../geometry/transforms';
import {reviewedGuideAxis} from './reviewedGuideAxis';
/** A photo-estimated visual target, not a functional or calibrated through-hole. */
export function reviewedGuideAnchor(part:Part){
 const a=part.metadata?.guideAnchor;
 const axis=reviewedGuideAxis(part);
 if(!a||a.version!==1||a.status!=='photo-estimate'||(axis==='none'||(typeof axis!=='number'&&a.rotationMode!=='keep-current'))||part.throughHoles?.length||a.imageAssetId!==part.imageAssetId||a.sourceDraftId!==part.metadata?.sourceDraftId||a.photoSha256!==part.metadata?.nominalPlacement?.photoSha256||!a.evidenceText||!a.reviewedAt||![a.xNorm,a.yNorm].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||![part.widthMm,part.heightMm].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0))return;
 return a;
}
export function guideAnchorOffset(part:Part|undefined,angle:number,scaleX=1,scaleY=1):Vec2{
 const a=part&&reviewedGuideAnchor(part);return a?rotate({x:(a.xNorm-.5)*part!.widthMm!*scaleX,y:(a.yNorm-.5)*part!.heightMm!*scaleY},angle):{x:0,y:0};
}
export function guideAnchorWorld(part:Part|undefined,center:Vec2,angle:number,scaleX=1,scaleY=1){const o=guideAnchorOffset(part,angle,scaleX,scaleY);return{x:center.x+o.x,y:center.y+o.y};}
export function centerAtGuideAnchor(part:Part|undefined,target:Vec2,angle:number,scaleX=1,scaleY=1){const o=guideAnchorOffset(part,angle,scaleX,scaleY);return{x:target.x-o.x,y:target.y-o.y};}
export function guideAnchorNotice(part:Part){const a=reviewedGuideAnchor(part);return a?(a.referenceKind==='source-central-projection'?'公式説明を基にした中央投影の目安に吸着します。穴の入口位置・実寸・接続は未確認です。':'穴の目安位置に吸着します。位置は写真・公式説明による目安で、実寸・接続は未確認です。')+(a.rotationMode==='keep-current'?'穴の向きは未確認のため、現在の回転角度を維持します。':''):undefined;}
