import type { ConnectionPoint,ThroughHole } from '../../types/domain';
import type { Crop,PixelPoint } from './imageGeometry';
import { normalizeDeg } from '../geometry/transforms';

export interface PointAnnotation {id:string;name:string;type:string;position:PixelPoint;directionDeg:number;maxConnections:number;localInnerDiameterMm?:number;localThicknessMm?:number}
export interface HoleAnnotation {id:string;name:string;entry:PixelPoint;exit:PixelPoint;diameterMm?:number}
function normalized(point:PixelPoint,trim:Crop){
  const x=(point.x-trim.x)/trim.width,y=(point.y-trim.y)/trim.height;
  if(![x,y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error('接続点・穴の位置が透明余白除去後の画像外です。位置を修正してください');
  return{x,y};
}
export function normalizeAnnotations(points:PointAnnotation[],holes:HoleAnnotation[],trim:Crop):{connectionPoints:ConnectionPoint[];throughHoles:ThroughHole[]} {
  return{
    connectionPoints:points.map(point=>{
      if(!point.name.trim()||!point.type.trim()||!Number.isInteger(point.maxConnections)||point.maxConnections<0)throw new Error('接続点の名前・種別・上限が不正です');
      for(const value of [point.localInnerDiameterMm,point.localThicknessMm])if(value!==undefined&&(!Number.isFinite(value)||value<0))throw new Error('接続部の内径・厚みは0以上の数値を入力してください');
      const p=normalized(point.position,trim);
      return{id:point.id,name:point.name.trim(),type:point.type,xNorm:p.x,yNorm:p.y,directionDeg:normalizeDeg(point.directionDeg),maxConnections:point.maxConnections,localInnerDiameterMm:point.localInnerDiameterMm,localThicknessMm:point.localThicknessMm};
    }),
    throughHoles:holes.map(hole=>{
      if(!hole.name.trim()||Math.hypot(hole.exit.x-hole.entry.x,hole.exit.y-hole.entry.y)<1)throw new Error('穴の名前と離れた入口・出口を指定してください');
      if(hole.diameterMm!==undefined&&(!Number.isFinite(hole.diameterMm)||hole.diameterMm<0))throw new Error('穴径が不正です');
      const entry=normalized(hole.entry,trim),exit=normalized(hole.exit,trim);
      return{id:hole.id,name:hole.name.trim(),entryXNorm:entry.x,entryYNorm:entry.y,exitXNorm:exit.x,exitYNorm:exit.y,diameterMm:hole.diameterMm,axisDeg:normalizeDeg(Math.atan2(hole.exit.y-hole.entry.y,hole.exit.x-hole.entry.x)*180/Math.PI)};
    }),
  };
}
