import type { DesignAggregate } from '../../types/aggregate';
import type { DesignNode,Part } from '../../types/domain';
import { normalizeDeg } from './transforms';
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
/** Node-local reflection is persisted independently of MirrorLink membership. */
export function nodeFlips(aggregate:DesignAggregate):Record<string,boolean>{
 const mirror=aggregate.design.editorConfig?.mirror;if(mirror===undefined)return {};
 if(!record(mirror)||mirror.version!==1||!record(mirror.nodeFlipX)||!record(mirror.groups))throw new Error('Mirror設定が不正です');
 const ids=new Set(aggregate.nodes.map(n=>n.id));for(const [id,flip] of Object.entries(mirror.nodeFlipX)){if(!ids.has(id)||typeof flip!=='boolean')throw new Error('Mirror反転設定に孤児または不正なNodeがあります');}
 return mirror.nodeFlipX as Record<string,boolean>;
}
export function isNodeFlipped(aggregate:DesignAggregate,nodeId:string){return nodeFlips(aggregate)[nodeId]===true;}
export function reflectPartGeometry(part:Part):Part{
 return {...part,connectionPoints:part.connectionPoints.map(p=>({...p,xNorm:1-p.xNorm,directionDeg:normalizeDeg(180-p.directionDeg)})),throughHoles:part.throughHoles.map(h=>({...h,entryXNorm:1-h.entryXNorm,exitXNorm:1-h.exitXNorm,axisDeg:normalizeDeg(180-h.axisDeg)}))};
}
export function nodePart(aggregate:DesignAggregate,node:DesignNode|undefined,parts:Part[]):Part|undefined{
 if(!node)return undefined;const part=parts.find(p=>p.id===node.partId);return part&&isNodeFlipped(aggregate,node.id)?reflectPartGeometry(part):part;
}
