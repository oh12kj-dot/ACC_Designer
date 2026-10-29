import { it,expect } from 'vitest';
import type { Part } from '../../types/domain';
import type { DesignAggregate } from '../../types/aggregate';
import { attachPoint,setManualPointAngle } from './pointCommands';
import { nearestPointSnap } from './snap';
import { changePart } from './changePart';
import { createMirror } from './createMirror';
import { validateDesignAggregate } from './validateDesign';
import { pathPositionCompatibility } from '../compatibility/check';
const cp={id:'c',name:'Port',type:'ring',xNorm:.5,yNorm:0,directionDeg:270,maxConnections:2,localInnerDiameterMm:4,localThicknessMm:1};
const parts=[{id:'p',name:'Ring',geometryKind:'node',category:'jump_ring',widthMm:10,heightMm:10,mirrorPolicy:'mirror_image',tags:[],imageAssetId:'asset',connectionPoints:[cp],throughHoles:[],isArchived:false},{id:'q',name:'New ring',geometryKind:'node',category:'jump_ring',widthMm:20,heightMm:20,mirrorPolicy:'mirror_image',tags:[],imageAssetId:'asset',connectionPoints:[{...cp,id:'new'}],throughHoles:[],isArchived:false}] as Part[];
function fixture():DesignAggregate{return {design:{id:'d',editorConfig:{}},nodes:[{id:'a',partId:'p',xMm:30,yMm:30,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false},{id:'b',partId:'p',xMm:60,yMm:30,rotationDeg:0,scaleX:1,scaleY:1,zIndex:1,locked:false}],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;}
const edge={id:'edge',kind:'point' as const,nodeAId:'a',pointAId:'c',nodeBId:'b',pointBId:'c',orientationMode:'align_opposite' as const,relativeRotationDeg:0};
it('requires explicit successor definition mappings and preserves all original references on rejection',()=>{
 const a=attachPoint(fixture(),parts,edge).aggregate,original=structuredClone(a);
 expect(()=>changePart(a,parts,'b','q',{points:{},holes:{}})).toThrow(/対応/);
 expect(a).toEqual(original);
 const changed=changePart(a,parts,'b','q',{points:{c:'new'},holes:{}});validateDesignAggregate(changed,parts);
 expect(changed.nodes.find(n=>n.id==='b')?.partId).toBe('q');expect(changed.pointAttachments[0]).toMatchObject({id:'edge',pointBId:'new'});expect(changed.nodes[0].partId).toBe('p');expect(a).toEqual(original);
});
it('changes Part from either linked side atomically and undo can use the original complete snapshot',()=>{
 const a=createMirror(attachPoint(fixture(),parts,edge).aggregate,parts,{nodeId:'a'},100);
 const link=a.mirrorLinks.find(l=>l.entityType==='node'&&l.leftEntityId==='b')!;
 for(const id of [link.leftEntityId,link.rightEntityId]){const changed=changePart(a,parts,id,'q',{points:{c:'new'},holes:{}});validateDesignAggregate(changed,parts);expect(changed.nodes.filter(n=>n.partId==='q')).toHaveLength(2);expect(changed.mirrorLinks.map(l=>l.id)).toEqual(a.mirrorLinks.map(l=>l.id));}
});
it('rejects a replacement whose capacity or dimensions are incompatible without silently detaching',()=>{
 const a=attachPoint(fixture(),parts,edge).aggregate;
 const incompatible={...parts[1],connectionPoints:[{...cp,id:'new',localInnerDiameterMm:.1}]};
 expect(()=>changePart(a,[parts[0],incompatible],'b','q',{points:{c:'new'},holes:{}})).toThrow(/不適合/);
 expect(a.pointAttachments).toEqual([edge]);
});
it('keeps manual angle edits connected, records the angle, and rejects anchored moving branches',()=>{
 const a=attachPoint(fixture(),parts,edge).aggregate,changed=setManualPointAngle(a,parts,'edge',45);validateDesignAggregate(changed,parts);
 expect(changed.nodes[1].rotationDeg).toBe(45);expect(changed.pointAttachments[0].orientationMode).toBe('manual');expect(changed.pointAttachments[0].relativeRotationDeg).toBe(225);
 expect(()=>setManualPointAngle({...a,pathAttachments:[{nodeId:'b'}] as DesignAggregate['pathAttachments']},parts,'edge',45)).toThrow(/拘束/);
});
it('snap uses screen threshold, excludes its own component and previews capacity failures',()=>{
 const a=fixture();a.nodes[1].xMm=32;
 expect(nearestPointSnap(a,parts,'b',3)?.status).toBe('compatible');expect(nearestPointSnap(a,parts,'b',8)).toBeUndefined();
 const blocked=[{...parts[0],connectionPoints:[{...cp,maxConnections:0}]}];expect(nearestPointSnap(a,blocked,'b',3)?.status).toBe('incompatible');
 const connected=attachPoint(a,parts,edge).aggregate;expect(nearestPointSnap(connected,parts,'b',3)).toBeUndefined();expect(a.pointAttachments).toEqual([]);
});
it('position compatibility rejects known impossibilities and never certifies incomplete chain envelope data',()=>{
 const ring={...parts[0],openingWidthMm:2},chain={category:'chain',thicknessMm:1} as Part;
 expect(pathPositionCompatibility(ring,cp,chain).status).toBe('unknown');
 expect(pathPositionCompatibility({...ring,openingWidthMm:0},cp,chain).status).toBe('incompatible');
 expect(pathPositionCompatibility(ring,{...cp,localInnerDiameterMm:1},chain).status).toBe('incompatible');
 expect(pathPositionCompatibility(ring,{...cp,localInnerDiameterMm:undefined},{...chain,thicknessMm:undefined}).status).toBe('unknown');
});
