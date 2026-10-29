import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { dragComponent } from './dragComponent';
import { resolvePoses } from './resolvePoses';
const cp={id:'c',name:'c',type:'ring',xNorm:.5,yNorm:.5,directionDeg:0,maxConnections:2};
const parts=[{id:'bead',geometryKind:'node',widthMm:10,heightMm:4,connectionPoints:[cp],throughHoles:[{id:'h',entryXNorm:.2,exitXNorm:.4,entryYNorm:.5,exitYNorm:.5,axisDeg:0,diameterMm:1}]},{id:'wire',geometryKind:'path',connectionPoints:[],throughHoles:[]}] as Part[];
const base={design:{},nodes:[{id:'n',partId:'bead',xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false}],paths:[{id:'p',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight',zIndex:0,locked:false}],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
const through={id:'a',kind:'through' as const,nodeId:'n',holeId:'h',pathId:'p',distanceMm:30,orderIndex:0,lockedToNeighbors:false,flip180:false};
it('projects a through-bound node without free motion and rejects insufficient space atomically',()=>{
 const attached=resolvePoses({...base,throughAttachments:[through]},parts);
 const moved=dragComponent(attached,parts,'n',{x:60,y:40},{x:28,y:40});
 expect(moved.throughAttachments[0].distanceMm).toBe(60);expect(moved.nodes[0].xMm).toBe(62);expect(moved.nodes[0].yMm).toBe(0);
 expect(()=>dragComponent(attached,parts,'n',{x:-10,y:0},{x:0,y:0})).toThrow(/長さ/);expect(attached.throughAttachments[0].distanceMm).toBe(30);
});
it('propagates an anchor drag through the Point component even when dragging its dependent node',()=>{
 const linked={...base,nodes:[base.nodes[0],{...base.nodes[0],id:'b'}],pointAttachments:[{id:'j',kind:'point' as const,nodeAId:'n',nodeBId:'b',pointAId:'c',pointBId:'c',orientationMode:'keep_rotation' as const,relativeRotationDeg:0}],throughAttachments:[through]};
 const attached=resolvePoses(linked,parts),moved=dragComponent(attached,parts,'b',{x:70,y:30},{x:0,y:0});
 expect(moved.nodes[0].xMm).toBe(72);expect(moved.nodes[1].xMm).toBe(72);expect(moved.nodes[1].yMm).toBe(0);
});
it('allows position anchors and refuses endpoint, multiple, or locked component constraints',()=>{
 const anchor={id:'a',kind:'path' as const,nodeId:'n',pointId:'c',pathId:'p',anchorKind:'position' as const,distanceMm:30,normalOffsetMm:2,orientationMode:'keep_rotation' as const,rotationOffsetDeg:0};
 const attached=resolvePoses({...base,pathAttachments:[anchor]},parts),moved=dragComponent(attached,parts,'n',{x:55,y:20},{x:0,y:0});expect(moved.nodes[0].xMm).toBe(55);expect(moved.nodes[0].yMm).toBe(2);
 expect(()=>dragComponent({...base,pathAttachments:[{...anchor,anchorKind:'start',distanceMm:undefined}]},parts,'n',{x:5,y:0},{x:5,y:0})).toThrow(/端点/);
 expect(()=>dragComponent({...base,pathAttachments:[anchor],throughAttachments:[through]},parts,'n',{x:5,y:0},{x:5,y:0})).toThrow(/複数/);
 expect(()=>dragComponent({...attached,nodes:[{...attached.nodes[0],locked:true}]},parts,'n',{x:5,y:0},{x:5,y:0})).toThrow(/固定/);
});
