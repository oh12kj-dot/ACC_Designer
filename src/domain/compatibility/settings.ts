import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
export function designClearance(a:DesignAggregate):number{const value=(a.design.editorConfig?.compatibility as {clearanceMm?:number}|undefined)?.clearanceMm??.05;if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('クリアランスは0以上の有限値を入力してください');return value;}
export function materialDiameter(part:Part):number|undefined{return part.category==='eye_pin'||part.category==='head_pin'?part.pinDiameterMm??part.pathRenderSpec?.nominalDiameterMm:part.wireDiameterMm??part.pathRenderSpec?.nominalDiameterMm;}
