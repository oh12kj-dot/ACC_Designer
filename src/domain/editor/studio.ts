import type {DesignAggregate} from '../../types/aggregate';
import type {Part} from '../../types/domain';
import type {CordSpecification} from './cord';
import {layoutGeometry,type LayoutGuide} from './layoutGuide';
import {guideAnchorWorld} from './guideAnchor';
import {nearestDistance,pointAtDistance} from '../path/geometry';
import {automaticSpacingMm} from './placement';
export interface CordLayout {version:1;cordBinding:{sourceDraftId:string;sourceSha256:string;usedLengthMm:number};guide:Pick<LayoutGuide,'shape'|'width'|'drop'|'center'>;knotAllowanceMm:number;claspAllowanceMm:number;patternNodeIds:string[]}
export interface VisualAssembly {id:string;baseNodeId:string;decorationNodeIds:string[]}
export const cordLayout=(a:DesignAggregate)=>a.design.editorConfig?.cordLayoutV1 as CordLayout|undefined;
export const visualGroups=(a:DesignAggregate)=>(a.design.editorConfig?.visualAssembliesV1 as {version:1;groups:VisualAssembly[]}|undefined)?.groups??[];
export const groupIds=(g:VisualAssembly)=>[g.baseNodeId,...g.decorationNodeIds];
export function groupFor(a:DesignAggregate,id:string){return visualGroups(a).find(g=>groupIds(g).includes(id));}
export function boundCord(a:DesignAggregate){const l=cordLayout(a),c=a.design.editorConfig?.cordSpecification as CordSpecification|undefined;return !!l&&!!c&&l.cordBinding.sourceDraftId===c.sourceDraftId&&l.cordBinding.sourceSha256===c.sourceSha256&&l.cordBinding.usedLengthMm===c.usedLengthMm;}
const exact=(v:object,keys:string[])=>Object.keys(v).sort().join()===keys.sort().join();
export function validateStudio(a:DesignAggregate){
 const l=cordLayout(a),groups=visualGroups(a),nodes=new Set(a.nodes.map(n=>n.id));
 if(l){const c=a.design.editorConfig?.cordSpecification as CordSpecification|undefined,g=l.guide,b=l.cordBinding;
  if(!exact(l,['version','cordBinding','guide','knotAllowanceMm','claspAllowanceMm','patternNodeIds'])||l.version!==1||!c||!b||!exact(b,['sourceDraftId','sourceSha256','usedLengthMm'])||!boundCord(a)||!g||!exact(g,['shape','width','drop','center'])||!g.center||!exact(g.center,['x','y'])||!['u','v'].includes(g.shape)||![g.width,g.drop,g.center.x,g.center.y,l.knotAllowanceMm,l.claspAllowanceMm].every(Number.isFinite)||l.knotAllowanceMm<0||l.claspAllowanceMm<0||!Array.isArray(l.patternNodeIds)||new Set(l.patternNodeIds).size!==l.patternNodeIds.length||l.patternNodeIds.some(id=>!nodes.has(id)))throw Error('紐の配置設定・参照を確認してください');
  const geometry=layoutGeometry({...g,enabled:true,snap:true,rotate:true,offset:0});if(!geometry||geometry.arcLengthMm>10000||geometry.arcLengthMm>c.usedLengthMm-l.knotAllowanceMm-l.claspAllowanceMm+1e-5)throw Error('紐の長さが不足しています。結び代・留め具の確保分と配置範囲を確認してください');
 }
 const wrapper=a.design.editorConfig?.visualAssembliesV1 as any,seen=new Set<string>(),ids=new Set<string>();
 if(wrapper&&(!exact(wrapper,['version','groups'])||wrapper.version!==1||!Array.isArray(wrapper.groups)||wrapper.groups.length>100))throw Error('組み立てグループの形式が不正です');
 for(const group of groups){if(!exact(group,['id','baseNodeId','decorationNodeIds'])||typeof group.id!=='string'||!group.id||group.id.length>128||ids.has(group.id)||!Array.isArray(group.decorationNodeIds)||!group.decorationNodeIds.length||groupIds(group).length>100)throw Error('組み立てグループを確認してください');ids.add(group.id);
  for(const id of groupIds(group)){if(typeof id!=='string'||!nodes.has(id)||seen.has(id))throw Error('組み立て部品の参照が重複または欠損しています');seen.add(id);if(a.pointAttachments.some(e=>e.nodeAId===id||e.nodeBId===id)||a.throughAttachments.some(e=>e.nodeId===id)||a.pathAttachments.some(e=>e.nodeId===id)||a.mirrorLinks.some(e=>e.leftEntityId===id||e.rightEntityId===id))throw Error('実接続・左右連動のある部品は、先に表示グループを解除してください');}
 }
}
export function pruneStudio(a:DesignAggregate){const config={...a.design.editorConfig},ids=new Set(a.nodes.map(n=>n.id)),l=cordLayout(a);if(l)config.cordLayoutV1={...l,patternNodeIds:l.patternNodeIds.filter(id=>ids.has(id))};if(config.visualAssembliesV1)config.visualAssembliesV1={version:1,groups:visualGroups(a).filter(g=>groupIds(g).every(id=>ids.has(id)))};return {...a,design:{...a.design,editorConfig:config}};}
export function createVisualGroup(a:DesignAggregate,baseNodeId:string,decorationNodeIds:string[],id:string){const members=[baseNodeId,...decorationNodeIds];if(a.nodes.some(n=>members.includes(n.id)&&n.locked))throw Error('固定を解除してから組み立ててください');const base=a.nodes.find(n=>n.id===baseNodeId);if(!base)throw Error('台座を選んでください');const next={...a,nodes:a.nodes.map(n=>decorationNodeIds.includes(n.id)?{...n,xMm:base.xMm,yMm:base.yMm,zIndex:Math.max(...a.nodes.map(n=>n.zIndex))+1}:n),design:{...a.design,editorConfig:{...a.design.editorConfig,visualAssembliesV1:{version:1,groups:[...visualGroups(a),{id,baseNodeId,decorationNodeIds}]}}}};validateStudio(next);return next;}
export function duplicateVisualGroup(a:DesignAggregate,id:string,allocate:()=>string){const g=visualGroups(a).find(g=>g.id===id);if(!g)throw Error('グループを選んでください');validateStudio(a);const nodes=groupIds(g).map(id=>a.nodes.find(n=>n.id===id)!);if(nodes.some(n=>n.locked))throw Error('固定中のグループは複製できません');const map=new Map(nodes.map(n=>[n.id,allocate()]));const next={...a,nodes:[...a.nodes,...nodes.map(n=>({...n,id:map.get(n.id)!,xMm:n.xMm+10,yMm:n.yMm+10,zIndex:n.zIndex+1}))],design:{...a.design,editorConfig:{...a.design.editorConfig,visualAssembliesV1:{version:1,groups:[...visualGroups(a),{id:allocate(),baseNodeId:map.get(g.baseNodeId)!,decorationNodeIds:g.decorationNodeIds.map(id=>map.get(id)!)}]}}}};validateStudio(next);return next;}
export function cordBudget(a:DesignAggregate,parts:Part[]){const l=cordLayout(a),c=a.design.editorConfig?.cordSpecification as CordSpecification|undefined;if(!l||!c||!boundCord(a))return;
 const geometry=layoutGeometry({...l.guide,enabled:true,snap:true,rotate:true,offset:0});if(!geometry)return;
 const spans:labeledSpan[]=[];let unknown=false;
 for(const id of l.patternNodeIds){const n=a.nodes.find(n=>n.id===id),p=parts.find(p=>p.id===n?.partId);if(!n||!p){unknown=true;continue;}const anchor=guideAnchorWorld(p,{x:n.xMm,y:n.yMm},n.rotationDeg,n.scaleX,n.scaleY),near=nearestDistance(geometry,anchor),pose=pointAtDistance(geometry,near.distanceMm),angle=Math.atan2(pose.tangent.y,pose.tangent.x)*180/Math.PI,w=automaticSpacingMm({...p,widthMm:p.widthMm!*n.scaleX,heightMm:p.heightMm!*n.scaleY},n.rotationDeg-angle);if(w===undefined||near.distanceToPathMm>.2){unknown=true;continue;}spans.push({start:near.distanceMm-w/2,end:near.distanceMm+w/2});}
 spans.sort((a,b)=>a.start-b.start);let occupied=0,end=-Infinity,overlap=false,outside=false;for(const s of spans){if(s.start<-.1||s.end>geometry.arcLengthMm+.1)outside=true;if(s.start<end-.1)overlap=true;occupied+=Math.max(0,s.end-Math.max(end,s.start));end=Math.max(end,s.end);}
 const usable=c.usedLengthMm-l.knotAllowanceMm-l.claspAllowanceMm;return {usable,guideLength:geometry.arcLengthMm,remaining:usable-geometry.arcLengthMm,occupied:unknown?null:occupied,overlap,outside,unassociated:a.nodes.length-l.patternNodeIds.length};
}
interface labeledSpan {start:number;end:number}
