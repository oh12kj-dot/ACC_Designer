import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { moveComponent,attachPoint } from './pointCommands';
const aggregate={design:{editorConfig:{}},nodes:[{id:'a',partId:'p',xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,locked:false},{id:'b',partId:'q',xMm:20,yMm:20,rotationDeg:0,scaleX:1,scaleY:1,locked:false}],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[]} as unknown as DesignAggregate;
const point={id:'c',name:'c',type:'loop',xNorm:1,yNorm:.5,directionDeg:0,maxConnections:1};const parts=[{id:'p',geometryKind:'node',widthMm:10,heightMm:10,connectionPoints:[point]},{id:'q',geometryKind:'node',widthMm:10,heightMm:10,connectionPoints:[{...point,type:'ring'}]}] as Part[];
it('snaps opposite points and moves/rotates the entire component in one transaction',()=>{const result=attachPoint(aggregate,parts,{id:'j',kind:'point',nodeAId:'a',nodeBId:'b',pointAId:'c',pointBId:'c',orientationMode:'align_opposite',relativeRotationDeg:0});expect(result.aggregate.nodes[1].rotationDeg).toBe(180);expect(result.aggregate.nodes[1].xMm).toBeCloseTo(10);const moved=moveComponent(result.aggregate,'a',{xMm:5,yMm:5,rotationDeg:90});expect(moved.nodes[1].xMm).toBeCloseTo(5);expect(moved.nodes[1].yMm).toBeCloseTo(15);expect(moved.nodes[1].rotationDeg).toBe(270);expect(aggregate.pointAttachments).toHaveLength(0);});
it('rejects exceeded capacity and anchored component movement',()=>{const result=attachPoint(aggregate,parts,{id:'j',kind:'point',nodeAId:'a',nodeBId:'b',pointAId:'c',pointBId:'c',orientationMode:'align_opposite',relativeRotationDeg:0}).aggregate;expect(()=>attachPoint(result,parts,{...result.pointAttachments[0],id:'j2'})).toThrow(/上限/);expect(()=>moveComponent({...result,pathAttachments:[{nodeId:'b'}] as DesignAggregate['pathAttachments']},'a',{xMm:10})).toThrow(/拘束/);});

it('keeps rotation or applies an explicit opposite-direction offset while coinciding connection points',()=>{
 const attachment={id:'j',kind:'point' as const,nodeAId:'a',nodeBId:'b',pointAId:'c',pointBId:'c',relativeRotationDeg:30};
 const kept=attachPoint(aggregate,parts,{...attachment,orientationMode:'keep_rotation'}).aggregate;
 expect(kept.nodes[1].rotationDeg).toBe(0);expect(kept.nodes[1].xMm).toBeCloseTo(0);expect(kept.nodes[1].yMm).toBeCloseTo(0);
 const offset=attachPoint(aggregate,parts,{...attachment,orientationMode:'align_opposite'}).aggregate;
 expect(offset.nodes[1].rotationDeg).toBe(210);expect(offset.nodes[1].xMm+5*Math.cos(210*Math.PI/180)).toBeCloseTo(5);expect(offset.nodes[1].yMm+5*Math.sin(210*Math.PI/180)).toBeCloseTo(0);
});
