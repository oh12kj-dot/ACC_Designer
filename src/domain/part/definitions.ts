import type { ConnectionPoint,ThroughHole } from '../../types/domain';
import { normalizeDeg } from '../geometry/transforms';
export function validateDefinitions(points:ConnectionPoint[],holes:ThroughHole[]){
 const ids=new Set<string>();
 const position=(...values:number[])=>{if(values.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('位置は0〜1の範囲で入力してください');};
 const dimension=(value:number|undefined)=>{if(value!==undefined&&(!Number.isFinite(value)||value<0))throw new Error('寸法は0以上の数値を入力してください');};
 for(const item of [...points,...holes]){if(!item.id||ids.has(item.id)||!item.name.trim())throw new Error('接続定義の名前・IDが不正です');ids.add(item.id);}
 return {connectionPoints:points.map(p=>{
  position(p.xNorm,p.yNorm);if(!p.type.trim()||!Number.isFinite(p.directionDeg)||!Number.isInteger(p.maxConnections)||p.maxConnections<0)throw new Error('接続点の種別・方向・上限が不正です');dimension(p.localInnerDiameterMm);dimension(p.localThicknessMm);
  return {...p,name:p.name.trim(),type:p.type.trim(),directionDeg:normalizeDeg(p.directionDeg)};
 }),throughHoles:holes.map(h=>{
  position(h.entryXNorm,h.entryYNorm,h.exitXNorm,h.exitYNorm);if(Math.hypot(h.entryXNorm-h.exitXNorm,h.entryYNorm-h.exitYNorm)<1e-9||!Number.isFinite(h.axisDeg))throw new Error('穴の入口と出口は離れた位置に指定してください');dimension(h.diameterMm);
  return {...h,name:h.name.trim(),axisDeg:normalizeDeg(h.axisDeg)};
 })};
}
