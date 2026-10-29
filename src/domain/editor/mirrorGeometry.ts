import type { DesignNode,DesignPath,MirrorPolicy } from '../../types/domain';
import { normalizeDeg } from '../geometry/transforms';
import { derivePathGeometry } from '../path/geometry';
function validAxis(axisX:number){if(!Number.isFinite(axisX))throw new Error('Mirror軸が不正です');}
export function mirrorNodeGeometry(node:DesignNode,flipped:boolean,axisX:number,policy:Exclude<MirrorPolicy,'manual'>){
 validAxis(axisX);if(policy!=='mirror_image'&&policy!=='keep_orientation')throw new Error('Mirror方針を選択してください');
 return {node:{...node,xMm:2*axisX-node.xMm,rotationDeg:normalizeDeg(-node.rotationDeg)},flipped:policy==='mirror_image'?!flipped:flipped};
}
export function mirrorPathGeometry(path:DesignPath,axisX:number):DesignPath{
 validAxis(axisX);const result={...path,start:{x:2*axisX-path.start.x,y:path.start.y},end:{x:2*axisX-path.end.x,y:path.end.y}};derivePathGeometry(result);return result;
}
