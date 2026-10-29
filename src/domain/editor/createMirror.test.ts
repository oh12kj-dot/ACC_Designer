import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { createMirror,makeMirrorIndependent,mirrorState,relinkMirror } from './createMirror';
import { resolvePoses } from './resolvePoses';
import { createHistory,commit,undo,redo } from './history';
import { nodePart } from '../geometry/nodePart';
const point={id:'c',name:'c',type:'ring',xNorm:.5,yNorm:.5,directionDeg:0,maxConnections:3};
const parts=[{id:'bead',name:'Bead',geometryKind:'node',widthMm:10,heightMm:4,mirrorPolicy:'mirror_image',connectionPoints:[point],throughHoles:[{id:'h',name:'h',entryXNorm:.2,exitXNorm:.4,entryYNorm:.5,exitYNorm:.5,axisDeg:0}]},{id:'wire',geometryKind:'path',connectionPoints:[],throughHoles:[]}] as Part[];
const node={partId:'bead',xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false};
const base={design:{editorConfig:{}},nodes:[{...node,id:'n'},{...node,id:'b'},{...node,id:'anchor'}],paths:[{id:'p',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight',zIndex:0,locked:false}],pointAttachments:[{id:'point',kind:'point',nodeAId:'n',nodeBId:'b',pointAId:'c',pointBId:'c',orientationMode:'keep_rotation',relativeRotationDeg:0}],throughAttachments:[{id:'through',kind:'through',nodeId:'n',holeId:'h',pathId:'p',distanceMm:30,orderIndex:0,lockedToNeighbors:false,flip180:false}],pathAttachments:[{id:'anchor-attachment',kind:'path',nodeId:'anchor',pointId:'c',pathId:'p',anchorKind:'position',distanceMm:70,normalOffsetMm:2,orientationMode:'keep_rotation',rotationOffsetDeg:0}],mirrorLinks:[]} as unknown as DesignAggregate;
function ids(){let n=0;return()=>`new-${++n}`;}
it('clones all five entity types and connected structure with new IDs in a single undoable snapshot',()=>{
 const source=resolvePoses(base,parts),next=createMirror(source,parts,{nodeId:'b'},120,{},ids());
 expect(next.nodes).toHaveLength(6);expect(next.paths).toHaveLength(2);expect(next.mirrorLinks).toHaveLength(7);expect(new Set(next.mirrorLinks.map(l=>l.entityType)).size).toBe(5);
 for(const link of next.mirrorLinks.filter(l=>l.entityType==='node')){const a=source.nodes.find(n=>n.id===link.leftEntityId)!,b=next.nodes.find(n=>n.id===link.rightEntityId)!;expect(b.xMm).toBeCloseTo(240-a.xMm);expect(b.yMm).toBeCloseTo(a.yMm);expect(mirrorState(next).nodeFlipX[b.id]).toBe(true);}
 const cloned=next.pathAttachments[1];expect(cloned.normalOffsetMm).toBe(-2);expect(cloned.pointId).toBe('c');expect(next.throughAttachments[1].holeId).toBe('h');expect(next.throughAttachments[1].distanceMm).toBe(30);
 const history=commit(createHistory(source),next);expect(history.past).toHaveLength(1);expect(undo(history).present).toEqual(source);expect(redo(undo(history)).present).toEqual(next);expect(base.nodes).toHaveLength(3);
});
it('retains independent image/geometry state without links, including a serialization round trip',()=>{
 const next=createMirror(resolvePoses(base,parts),parts,{pathId:'p'},120,{},ids()),groupId=Object.keys(mirrorState(next).groups)[0],independent=makeMirrorIndependent(next,groupId),loaded=JSON.parse(JSON.stringify(independent)) as DesignAggregate;
 expect(loaded.mirrorLinks).toEqual([]);expect(mirrorState(loaded).groups[groupId].mode).toBe('independent');const cloned=loaded.nodes[3];expect(nodePart(loaded,cloned,parts)?.throughHoles[0].entryXNorm).toBe(.8);expect(loaded.nodes).toEqual(next.nodes);
});
it('requires manual policy and rejects incompatible keep-orientation constraints without changing the source',()=>{
 const source=resolvePoses(base,parts),manualParts=[{...parts[0],mirrorPolicy:'manual' as const},parts[1]];expect(()=>createMirror(source,manualParts,{nodeId:'n'},120,{},ids())).toThrow(/方針/);
 expect(()=>createMirror(source,manualParts,{nodeId:'n'},120,{bead:'keep_orientation'},ids())).toThrow(/両立/);expect(source.mirrorLinks).toEqual([]);
 expect(createMirror(source,manualParts,{nodeId:'n'},120,{bead:'mirror_image'},ids()).mirrorLinks.filter(l=>l.entityType==='node').every(l=>l.manualMirrorPolicy==='mirror_image')).toBe(true);
});
it('rejects duplicate IDs, invalid axis and structures already in a mirror group',()=>{
 const source=resolvePoses(base,parts);expect(()=>createMirror(source,parts,{nodeId:'n'},NaN,{},ids())).toThrow(/軸/);expect(()=>createMirror(source,parts,{nodeId:'n'},120,{},()=> 'same')).toThrow(/重複/);
 const next=createMirror(source,parts,{nodeId:'n'},120,{},ids());expect(()=>createMirror(next,parts,{nodeId:'n'},120,{},ids())).toThrow(/既に/);
});

it.each(['left','right'] as const)('relinks by preserving the explicit %s side and regenerating the opposite side without merging',side=>{
 const linked=createMirror(resolvePoses(base,parts),parts,{nodeId:'n'},120,{},ids()),groupId=Object.keys(mirrorState(linked).groups)[0],independent=makeMirrorIndependent(linked,groupId),group=mirrorState(independent).groups[groupId],sourceIds=group[side].nodeIds,targetIds=group[side==='left'?'right':'left'].nodeIds;
 const changed={...independent,nodes:independent.nodes.map(n=>targetIds.includes(n.id)?{...n,zIndex:99}:n)};let counter=100;
 const result=relinkMirror(changed,parts,groupId,side,{},()=>`regenerated-${++counter}`);
 expect(result.nodes).toHaveLength(6);expect(result.nodes.filter(n=>sourceIds.includes(n.id))).toEqual(independent.nodes.filter(n=>sourceIds.includes(n.id)));expect(result.nodes.some(n=>targetIds.includes(n.id))).toBe(false);expect(result.nodes.some(n=>n.zIndex===99)).toBe(false);expect(result.mirrorLinks).toHaveLength(7);expect(mirrorState(result).groups[groupId]).toBeUndefined();expect(Object.values(mirrorState(result).groups)[0].mode).toBe('linked');expect(changed.nodes.some(n=>n.zIndex===99)).toBe(true);
});
