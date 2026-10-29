import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { createMirror,makeMirrorIndependent,mirrorState } from './createMirror';
import { syncMirror } from './syncMirror';
import { moveComponent,attachPoint } from './pointCommands';
import { changePath,removeNode,removePath } from './throughCommands';
import { resolvePoses } from './resolvePoses';
import { createHistory,commit,undo,redo } from './history';
const point={id:'c',name:'c',type:'ring',xNorm:.5,yNorm:.5,directionDeg:0,maxConnections:3};
const parts=[{id:'bead',name:'Bead',geometryKind:'node',widthMm:10,heightMm:4,mirrorPolicy:'mirror_image',connectionPoints:[point],throughHoles:[{id:'h',name:'h',entryXNorm:.2,exitXNorm:.4,entryYNorm:.5,exitYNorm:.5,axisDeg:0}]},{id:'other',name:'Other',geometryKind:'node',widthMm:8,heightMm:4,mirrorPolicy:'keep_orientation',connectionPoints:[point],throughHoles:[]},{id:'wire',geometryKind:'path',connectionPoints:[],throughHoles:[]}] as Part[];
const node={id:'n',partId:'bead',xMm:20,yMm:20,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false};
const base={design:{editorConfig:{}},nodes:[node],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
function ids(){let n=0;return()=>`new-${++n}`;}function mirrored(){return createMirror(base,parts,{nodeId:'n'},100,{},ids());}
it.each(['left','right'] as const)('synchronizes move/rotation from %s with one undoable snapshot',side=>{
 const before=mirrored(),link=before.mirrorLinks[0],id=side==='left'?link.leftEntityId:link.rightEntityId,primary=moveComponent(before,id,{xMm:50,yMm:40,rotationDeg:35});const next=syncMirror(before,primary,parts);
 const source=next.nodes.find(n=>n.id===id)!,target=next.nodes.find(n=>n.id!==id)!;expect(target.xMm).toBe(200-source.xMm);expect(target.yMm).toBe(40);expect(target.rotationDeg).toBe(325);expect(before.nodes[0]).toEqual(node);
 const history=commit(createHistory(before),next);expect(history.past).toHaveLength(1);expect(undo(history).present).toEqual(before);expect(redo(undo(history)).present).toEqual(next);
});
it('mirrors Part and z-order changes while preserving positive scales and policy-dependent reflection',()=>{
 const before=mirrored(),primary={...before,nodes:before.nodes.map(n=>n.id==='n'?{...n,partId:'other',zIndex:12}:n)},next=syncMirror(before,primary,parts);
 expect(next.nodes[1].partId).toBe('other');expect(next.nodes[1].zIndex).toBe(12);expect(next.nodes[1].scaleX).toBe(1);expect(mirrorState(next).nodeFlipX[next.nodes[1].id]).toBe(false);
});
it('deletes counterparts using original links and removes orphan reflection state',()=>{
 const before=mirrored(),next=syncMirror(before,removeNode(before,'n'),parts);expect(next.nodes).toEqual([]);expect(next.mirrorLinks).toEqual([]);expect(mirrorState(next).nodeFlipX).toEqual({});expect(Object.values(mirrorState(next).groups)[0].left.nodeIds).toEqual([]);
});
it('clones scoped additions and their Point attachment with remapped entity IDs',()=>{
 const before=mirrored(),groupId=Object.keys(mirrorState(before).groups)[0],added={...before,nodes:[...before.nodes,{...node,id:'extra',xMm:60}]};let counter=100;
 const next=syncMirror(before,added,parts,{groupId,side:'left'},{},()=>`add-${++counter}`);expect(next.nodes).toHaveLength(4);expect(next.mirrorLinks.filter(l=>l.entityType==='node')).toHaveLength(2);
 const connected=attachPoint(next,parts,{id:'join',kind:'point',nodeAId:'n',nodeBId:'extra',pointAId:'c',pointBId:'c',orientationMode:'align_opposite',relativeRotationDeg:0}).aggregate,paired=syncMirror(next,connected,parts,undefined,{},()=>`add-${++counter}`);
 expect(paired.pointAttachments).toHaveLength(2);const joinLink=paired.mirrorLinks.find(l=>l.entityType==='point_attachment')!;expect(paired.pointAttachments.find(a=>a.id===joinLink.rightEntityId)?.nodeAId).toBe(before.nodes[1].id);expect(before.nodes).toHaveLength(2);
 const detached={...paired,pointAttachments:paired.pointAttachments.filter(a=>a.id!=='join')};expect(syncMirror(paired,detached,parts).pointAttachments).toEqual([]);
});
it('synchronizes Path changes and all through poses and removes both attachments on Path deletion',()=>{
 const raw={...base,paths:[{id:'p',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight' as const,zIndex:0,locked:false}],throughAttachments:[{id:'t',kind:'through' as const,nodeId:'n',holeId:'h',pathId:'p',distanceMm:30,orderIndex:0,flip180:false,lockedToNeighbors:false}]};
 const before=createMirror(resolvePoses(raw,parts),parts,{nodeId:'n'},150,{},ids()),changed=changePath(before,parts,'p',{start:{x:10,y:10},end:{x:110,y:10}}),next=syncMirror(before,changed,parts);
 expect(next.paths[1].start).toEqual({x:290,y:10});expect(next.nodes[0].xMm+next.nodes[1].xMm).toBeCloseTo(300);expect(next.nodes[1].yMm).toBe(10);
 const deleted=syncMirror(next,removePath(next,'p'),parts);expect(deleted.paths).toEqual([]);expect(deleted.throughAttachments).toEqual([]);expect(deleted.nodes).toHaveLength(2);
});
it('rejects direct edits to both sides and cross-group attachments without mutating the original',()=>{
 const before=mirrored(),both={...before,nodes:before.nodes.map(n=>({...n,yMm:40}))};expect(()=>syncMirror(before,both,parts)).toThrow(/両側/);expect(before.nodes[0].yMm).toBe(20);
 const primary={...before,nodes:[...before.nodes,{...node,id:'unpaired'}],pointAttachments:[{id:'bad',kind:'point' as const,nodeAId:'n',nodeBId:'unpaired',pointAId:'c',pointBId:'c',orientationMode:'keep_rotation' as const,relativeRotationDeg:0}]};expect(()=>syncMirror(before,primary,parts)).toThrow(/対応/);
});
it('keeps independent edits on their own side without restoring links',()=>{
 const before=mirrored(),groupId=Object.keys(mirrorState(before).groups)[0],independent=makeMirrorIndependent(before,groupId),primary=moveComponent(independent,'n',{xMm:25}),next=syncMirror(independent,primary,parts);expect(next.nodes[0].xMm).toBe(25);expect(next.nodes[1].xMm).toBe(180);expect(next.mirrorLinks).toEqual([]);
});

it('preserves the recorded manual policy during ordinary edits and asks again when Part identity changes',()=>{
 const manualParts=[{...parts[0],mirrorPolicy:'manual' as const},{...parts[1],mirrorPolicy:'manual' as const},parts[2]],before=createMirror(base,manualParts,{nodeId:'n'},100,{bead:'mirror_image'},ids()),primary=moveComponent(before,'n',{rotationDeg:30});
 const next=syncMirror(before,primary,manualParts,undefined,{bead:'keep_orientation'});expect(next.mirrorLinks[0].manualMirrorPolicy).toBe('mirror_image');expect(mirrorState(next).nodeFlipX[next.nodes[1].id]).toBe(true);expect(before.mirrorLinks[0].manualMirrorPolicy).toBe('mirror_image');
 const changed={...before,nodes:before.nodes.map(n=>n.id==='n'?{...n,partId:'other'}:n)};expect(()=>syncMirror(before,changed,manualParts)).toThrow(/方針/);expect(before.nodes[0].partId).toBe('bead');
});
