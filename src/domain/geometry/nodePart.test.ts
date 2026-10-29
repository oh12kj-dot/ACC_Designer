import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part,DesignNode } from '../../types/domain';
import { nodePart,nodeFlips,reflectPartGeometry } from './nodePart';
import { connectionPointWorld,throughHoleWorld,normalizeDeg } from './transforms';
import { mirrorNodeGeometry,mirrorPathGeometry } from '../editor/mirrorGeometry';
import { derivePathGeometry } from '../path/geometry';
import { resolvePoses } from '../editor/resolvePoses';
const part={id:'part',geometryKind:'node',widthMm:10,heightMm:8,mirrorPolicy:'mirror_image',connectionPoints:[{id:'c',xNorm:.2,yNorm:.3,directionDeg:35}],throughHoles:[{id:'h',entryXNorm:.1,exitXNorm:.4,entryYNorm:.3,exitYNorm:.3,axisDeg:0}]} as Part;
const node={id:'n',partId:'part',xMm:23,yMm:31,rotationDeg:47,scaleX:1.2,scaleY:.8,zIndex:0,locked:false} as DesignNode;
const aggregate={design:{editorConfig:{mirror:{version:1,nodeFlipX:{n:true},groups:{}}}},nodes:[node],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
it.each([false,true])('reflects asymmetric ports and hole endpoints in world space from flip=%s',flipped=>{
 const source=flipped?reflectPartGeometry(part):part,mirrored=mirrorNodeGeometry(node,flipped,50,'mirror_image'),target=mirrored.flipped?reflectPartGeometry(part):part;
 const a=connectionPointWorld(node,source,source.connectionPoints[0]),b=connectionPointWorld(mirrored.node,target,target.connectionPoints[0]);expect(b.position.x).toBeCloseTo(100-a.position.x);expect(b.position.y).toBeCloseTo(a.position.y);expect(b.directionDeg).toBeCloseTo(normalizeDeg(180-a.directionDeg));
 const ha=throughHoleWorld(node,source,source.throughHoles[0]),hb=throughHoleWorld(mirrored.node,target,target.throughHoles[0]);expect(hb.entry.x).toBeCloseTo(100-ha.entry.x);expect(hb.exit.x).toBeCloseTo(100-ha.exit.x);expect(hb.entry.y).toBeCloseTo(ha.entry.y);expect(hb.axisDeg).toBeCloseTo(normalizeDeg(180-ha.axisDeg));
 const twice=mirrorNodeGeometry(mirrored.node,mirrored.flipped,50,'mirror_image');expect(twice.node).toEqual(node);expect(twice.flipped).toBe(flipped);
});
it('keeps reflection after links are removed and never mutates Part master definitions',()=>{
 const adapted=nodePart(aggregate,node,[part])!;expect(adapted.connectionPoints[0].xNorm).toBe(.8);expect(part.connectionPoints[0].xNorm).toBe(.2);expect(adapted.throughHoles[0].entryXNorm).toBe(.9);expect(nodePart({...aggregate,mirrorLinks:[]},node,[part])).toEqual(adapted);
 const kept=mirrorNodeGeometry(node,true,50,'keep_orientation');expect(kept.flipped).toBe(true);
});
it('rejects orphan, non-boolean, and unsupported reflection state',()=>{
 for(const mirror of [{version:1,nodeFlipX:{ghost:true},groups:{}},{version:1,nodeFlipX:{n:1},groups:{}},{version:2,nodeFlipX:{n:true},groups:{}}])expect(()=>nodeFlips({...aggregate,design:{...aggregate.design,editorConfig:{mirror}}})).toThrow();
 expect(()=>mirrorNodeGeometry(node,false,NaN,'mirror_image')).toThrow();
});
it('resolves a mirrored off-center through hole with the same distance and reflected pose',()=>{
 const straight={id:'p',partId:'wire',start:{x:0,y:0},end:{x:100,y:0},physicalLengthMm:100,shape:'straight' as const,zIndex:0,locked:false};
 const source=resolvePoses({...aggregate,design:{...aggregate.design,editorConfig:{}},nodes:[{...node,scaleX:1,scaleY:1}],paths:[straight],throughAttachments:[{id:'a',kind:'through',nodeId:'n',holeId:'h',pathId:'p',distanceMm:30,orderIndex:0,flip180:false,lockedToNeighbors:false}]},[part]);
 const mirrored=mirrorNodeGeometry(source.nodes[0],false,120,'mirror_image');const target=resolvePoses({...source,design:aggregate.design,nodes:[mirrored.node],paths:[mirrorPathGeometry(straight,120)]},[part]);
 expect(target.nodes[0].xMm).toBeCloseTo(240-source.nodes[0].xMm);expect(target.nodes[0].yMm).toBeCloseTo(source.nodes[0].yMm);expect(target.nodes[0].rotationDeg).toBe(mirrored.node.rotationDeg);expect(target.throughAttachments[0].distanceMm).toBe(30);
});
it.each(['u','v'] as const)('reflects every nonvertical %s sample while retaining bendSide and length',shape=>{
 const path={id:'p',partId:'wire',start:{x:10,y:20},end:{x:70,y:40},physicalLengthMm:100,shape,bendSide:1 as const,zIndex:0,locked:false};const a=derivePathGeometry(path),mirrored=mirrorPathGeometry(path,50),b=derivePathGeometry(mirrored);expect(mirrored.bendSide).toBe(1);expect(mirrored.physicalLengthMm).toBe(100);a.points.forEach((point,i)=>{expect(b.points[i].x).toBeCloseTo(100-point.x);expect(b.points[i].y).toBeCloseTo(point.y);});expect(mirrorPathGeometry(mirrored,50)).toEqual(path);
});
