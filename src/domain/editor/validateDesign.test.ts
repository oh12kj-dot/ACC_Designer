import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { validateDesignAggregate } from './validateDesign';
import { resolvePoses } from './resolvePoses';
import { createMirror } from './createMirror';
const cp={id:'c',name:'center',type:'ring',xNorm:.5,yNorm:.5,directionDeg:0,maxConnections:3};
const parts=[{id:'bead',name:'Bead',geometryKind:'node',widthMm:10,heightMm:4,mirrorPolicy:'mirror_image',connectionPoints:[cp],throughHoles:[{id:'h',name:'h',entryXNorm:.2,exitXNorm:.4,entryYNorm:.5,exitYNorm:.5,axisDeg:0,diameterMm:1}]},{id:'wire',geometryKind:'path',wireDiameterMm:.5,connectionPoints:[],throughHoles:[],pathRenderSpec:{renderMode:'solid_stroke',nominalDiameterMm:.5,opacity:1,startPortType:'ring',endPortType:'ring',startMaxConnections:1,endMaxConnections:1}}] as Part[];
const node={partId:'bead',xMm:0,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false};
const raw={design:{editorConfig:{}},nodes:[{...node,id:'n'},{...node,id:'b'},{...node,id:'anchor'}],paths:[{id:'p',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight',zIndex:0,locked:false}],pointAttachments:[{id:'point',kind:'point',nodeAId:'n',nodeBId:'b',pointAId:'c',pointBId:'c',orientationMode:'keep_rotation',relativeRotationDeg:0}],throughAttachments:[{id:'through',kind:'through',nodeId:'n',holeId:'h',pathId:'p',distanceMm:30,orderIndex:0,lockedToNeighbors:false,flip180:false}],pathAttachments:[{id:'anchor-attachment',kind:'path',nodeId:'anchor',pointId:'c',pathId:'p',anchorKind:'position',distanceMm:70,normalOffsetMm:2,orientationMode:'keep_rotation',rotationOffsetDeg:0}],mirrorLinks:[]} as unknown as DesignAggregate;
function valid(){return resolvePoses(raw,parts);}
it('accepts a complete connected snapshot and its mirrored structure without changing either',()=>{
 const a=valid(),copy=structuredClone(a);validateDesignAggregate(a,parts);expect(a).toEqual(copy);let i=0;const mirrored=createMirror(a,parts,{nodeId:'n'},120,{},()=>`id-${++i}`);validateDesignAggregate(mirrored,parts);
});
it('rejects submitted poses rather than silently fixing them',()=>{
 const a=valid();a.nodes[2].xMm+=1;const copy=structuredClone(a);expect(()=>validateDesignAggregate(a,parts)).toThrow(/Pose/);expect(a).toEqual(copy);
});
it('rejects duplicate bindings, missing references, capacity violations and known incompatibility',()=>{
 const a=valid();expect(()=>validateDesignAggregate({...a,throughAttachments:[...a.throughAttachments,{...a.throughAttachments[0],id:'duplicate'}]},parts)).toThrow(/重複/);
 expect(()=>validateDesignAggregate({...a,pointAttachments:a.pointAttachments.map(x=>({...x,pointBId:'missing'}))},parts)).toThrow(/定義/);
 expect(()=>validateDesignAggregate(a,[{...parts[0],connectionPoints:[{...cp,maxConnections:0}]},parts[1]])).toThrow(/上限/);
 expect(()=>validateDesignAggregate(a,[{...parts[0],connectionPoints:[{...cp,localInnerDiameterMm:1,localThicknessMm:2}]},parts[1]])).toThrow(/不適合/);
});
it('rejects nonfinite, invalid scales, mismatched Path length and non-opposite Point orientation',()=>{
 const a=valid();expect(()=>validateDesignAggregate({...a,nodes:a.nodes.map(n=>({...n,scaleX:-1}))},parts)).toThrow(/Node/);
 expect(()=>validateDesignAggregate({...a,nodes:a.nodes.map(n=>({...n,xMm:NaN}))},parts)).toThrow(/非有限/);
 expect(()=>validateDesignAggregate({...a,paths:a.paths.map(p=>({...p,physicalLengthMm:120}))},parts)).toThrow(/物理長/);
 expect(()=>validateDesignAggregate({...a,pointAttachments:a.pointAttachments.map(x=>({...x,orientationMode:'align_opposite'}))},parts)).toThrow(/向き/);
});
it('rejects mirrored geometry or reflection flags that differ from their recorded correspondence',()=>{
 let i=0;const a=createMirror(valid(),parts,{nodeId:'n'},120,{},()=>`id-${++i}`),freeLink=a.mirrorLinks.find(l=>l.entityType==='node'&&l.leftEntityId==='b')!;
 const invalid={...a,nodes:a.nodes.map(n=>n.id===freeLink.rightEntityId?{...n,zIndex:2}:n)};expect(()=>validateDesignAggregate(invalid,parts)).toThrow(/Mirror Node/);
 const badState=structuredClone(a);const mirror=badState.design.editorConfig.mirror as {nodeFlipX:Record<string,boolean>};mirror.nodeFlipX[freeLink.rightEntityId]=false;expect(()=>validateDesignAggregate(badState,parts)).toThrow(/Mirror Node/);
});
