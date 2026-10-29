import {expect,it} from 'vitest';
import {layoutGeometry,guidePose,guideAxisDeg,guideAngle,canGuideMove,guideLengthMm,resizeGuideLength,type LayoutGuide} from './layoutGuide';
import type {DesignAggregate} from '../../types/aggregate';
const g:LayoutGuide={enabled:true,snap:true,rotate:true,offset:0,shape:'v',width:100,drop:50,center:{x:100,y:100}};
it('sets endpoint-to-endpoint real length for both shapes without changing aspect or center',()=>{
 for(const shape of ['u','v'] as const){const start={...g,shape,enabled:false},next=resizeGuideLength(start,400);expect(guideLengthMm(next)).toBeCloseTo(400,8);expect(next.width/next.drop).toBeCloseTo(2,8);expect(next.center).toEqual(start.center);expect(next.enabled).toBe(false);expect(guideLengthMm({...next,width:next.width/2})).toBeLessThan(400);}
 for(const value of [0,-1,NaN,Infinity,10001])expect(()=>resizeGuideLength(g,value)).toThrow();
 expect(()=>resizeGuideLength({...g,width:0},400)).toThrow();
});
it('keeps the image top upright on either side while preserving the hole axis line',()=>{
 const vertical={throughHoles:[{axisDeg:90}]} as unknown as import('../../types/domain').Part;
 expect(guideAngle(g,45,0,vertical)).toBe(315);
 expect(guideAngle(g,-45,0,vertical)).toBe(45);
 expect(guideAngle({...g,offset:180},-45,0,vertical)).toBe(225);
 expect(guideAngle(g,-45,0,vertical,1,-1)).toBe(225);
 const horizontal={...vertical,throughHoles:[{axisDeg:0}]} as typeof vertical;
 expect(guideAngle(g,45,0,horizontal)).toBe(45);expect(guideAngle(g,-45,0,horizontal)).toBe(315);
});
it('retains axis parallelism and upright image top for transformed axes, endpoints and curves',()=>{
 for(const axis of [0,30,90])for(const sx of [1,-1])for(const sy of [1,-1])for(const tangent of [-90,-70,-45,0,45,70,90]){
  const part={throughHoles:[{axisDeg:axis}]} as unknown as import('../../types/domain').Part,angle=guideAngle(g,tangent,17,part,sx,sy),transformed=guideAxisDeg(part,sx,sy)!;
  expect(Math.abs(Math.sin((angle+transformed-tangent)*Math.PI/180))).toBeLessThan(1e-8);expect(-sy*Math.cos(angle*Math.PI/180)).toBeLessThanOrEqual(1e-8);expect(guideAngle(g,tangent,angle,part,sx,sy)).toBeCloseTo(angle,8);
 }
});
it('projects a nearby point and aligns the image horizontal direction, with a CSS-pixel threshold',()=>{
 const geometry=layoutGeometry(g)!;expect(geometry.points).toEqual([{x:50,y:75},{x:100,y:125},{x:150,y:75}]);
 const pose=guidePose(g,geometry,{x:76,y:99},7,3);expect(pose.point.x).toBeCloseTo(75);expect(pose.point.y).toBeCloseTo(100);expect(pose.angle).toBe(45);
 expect(guidePose(g,geometry,{x:76,y:99},7,20).snapped).toBe(false);expect(guidePose({...g,rotate:false},geometry,{x:76,y:99},7,3).angle).toBe(7);
 expect(guidePose({...g,offset:90},geometry,{x:76,y:99},0,3).angle).toBe(135);
});
it('does not snap when disabled, far away or given invalid geometry',()=>{
 expect(layoutGeometry({...g,width:0})).toBeUndefined();expect(layoutGeometry({...g,drop:Infinity})).toBeUndefined();expect(layoutGeometry({...g,width:1e100})).toBeUndefined();
 expect(guidePose({...g,snap:false},layoutGeometry(g),{x:75,y:100},30,3).snapped).toBe(false);expect(guidePose(g,layoutGeometry(g),{x:0,y:0},30,3).snapped).toBe(false);
 const u=layoutGeometry({...g,shape:'u'})!;expect(u.points[64]).toEqual({x:100,y:125});
});
it('excludes locked, physically connected, anchored and mirrored nodes from guide movement',()=>{
 const a={nodes:[{id:'n',locked:false}],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
 expect(canGuideMove(a,'n')).toBe(true);expect(canGuideMove(a,'missing')).toBe(false);
 for(const patch of [{nodes:[{id:'n',locked:true}]},{pointAttachments:[{nodeAId:'n'}]},{throughAttachments:[{nodeId:'n'}]},{pathAttachments:[{nodeId:'n'}]},{mirrorLinks:[{leftEntityId:'n'}]}])expect(canGuideMove({...a,...patch} as DesignAggregate,'n')).toBe(false);
});

it('aligns registered axes and falls back to vertical without inventing holes',()=>{
 const geometry=layoutGeometry(g)!,part={throughHoles:[]} as unknown as import('../../types/domain').Part;
 expect(guidePose(g,geometry,{x:75,y:100},0,3,part).angle).toBe(315);
 const horizontal={...part,throughHoles:[{axisDeg:0}]} as typeof part;
 expect(guidePose(g,geometry,{x:75,y:100},0,3,horizontal).angle).toBe(45);
 const diagonal={...part,throughHoles:[{axisDeg:30},{axisDeg:210}]} as typeof part;
 expect(guidePose(g,geometry,{x:75,y:100},0,3,diagonal).angle).toBeCloseTo(15);
 expect(guideAxisDeg(diagonal,-1,1)).toBeCloseTo(150);
 const ambiguous={...part,throughHoles:[{axisDeg:0},{axisDeg:90}]} as typeof part;
 expect(guidePose(g,geometry,{x:75,y:100},12,3,ambiguous).angle).toBe(12);
 expect(guidePose({...g,rotate:false},geometry,{x:75,y:100},12,3,part).angle).toBe(12);
 expect(part.throughHoles).toEqual([]);
});
