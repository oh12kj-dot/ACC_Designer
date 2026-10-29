import { describe,it,expect } from 'vitest';
import { derivePathGeometry,pointAtDistance,nearestDistance,clampEndpoint } from './geometry';
import type { DesignPath } from '../../types/domain';
const path:DesignPath={id:'p',partId:'m',start:{x:10,y:20},end:{x:90,y:40},physicalLengthMm:120,shape:'u',bendSide:1,zIndex:0,locked:false};
describe('physical Path geometry',()=>{
 it.each(['u','v'] as const)('maintains %s physical length and mirror-side direction',shape=>{const p={...path,shape};const g=derivePathGeometry(p);expect(g.arcLengthMm).toBeCloseTo(120,4);expect(g.points[0]).toEqual(p.start);expect(g.points.at(-1)).toEqual(p.end);const m=derivePathGeometry({...p,start:{x:-p.start.x,y:p.start.y},end:{x:-p.end.x,y:p.end.y}});g.points.forEach((point,i)=>{expect(m.points[i].x).toBeCloseTo(-point.x,6);expect(m.points[i].y).toBeCloseTo(point.y,6);});});
 it('samples monotonic arc distance and projects back to the same position',()=>{const g=derivePathGeometry(path);const p=pointAtDistance(g,53);expect(Math.hypot(p.tangent.x,p.tangent.y)).toBeCloseTo(1);expect(nearestDistance(g,p.position).distanceMm).toBeCloseTo(53);expect(()=>pointAtDistance(g,-1)).toThrow();});
 it('clamps endpoint without modifying physical length',()=>{const p=clampEndpoint(path,'end',{x:500,y:20});expect(Math.hypot(p.end.x-p.start.x,p.end.y-p.start.y)).toBeCloseTo(120);expect(p.physicalLengthMm).toBe(120);});
 it('keeps straight length exact and rejects impossible length',()=>{const p={...path,shape:'straight' as const,end:{x:130,y:20}};expect(derivePathGeometry(p).arcLengthMm).toBe(120);expect(()=>derivePathGeometry({...path,physicalLengthMm:1})).toThrow();});
});
