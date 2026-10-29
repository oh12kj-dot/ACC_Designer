import {expect,it} from 'vitest';
import {deleteSelection} from './deleteSelection';
import {createMirror,makeMirrorIndependent} from './createMirror';
import {syncMirror} from './syncMirror';
import {createHistory,commit,undo} from './history';
import type {Part} from '../../types/domain';
import type {DesignAggregate} from '../../types/aggregate';
const parts=[{id:'bead',name:'Bead',category:'bead',tags:[],isArchived:false,imageAssetId:'asset',mirrorPolicy:'mirror_image',geometryKind:'node',widthMm:4,heightMm:4,connectionPoints:[],throughHoles:[]}] as Part[];
const node={id:'n',partId:'bead',xMm:20,yMm:20,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false};
const base={design:{editorConfig:{}},nodes:[node],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
function mirrored(){let n=0;return createMirror(base,parts,{nodeId:'n'},100,{},()=>`new-${++n}`);}
it('deletes both selected linked sides using the old synchronization and undoes atomically',()=>{
 const a=mirrored(),next=syncMirror(a,deleteSelection(a,a.nodes.map(n=>n.id),[]),parts);expect(next.nodes).toEqual([]);expect(next.mirrorLinks).toEqual([]);expect(undo(commit(createHistory(a),next)).present).toEqual(a);expect(a.nodes).toHaveLength(2);
});
it('deletes a selected right-side node and its linked partner, preserving independent counterparts',()=>{
 const a=mirrored(),right=a.nodes[1].id;expect(syncMirror(a,deleteSelection(a,[right],[]),parts).nodes).toEqual([]);const independent=makeMirrorIndependent(a,a.mirrorLinks[0].mirrorGroupId);expect(syncMirror(independent,deleteSelection(independent,[right],[]),parts).nodes.map(n=>n.id)).toEqual(['n']);
});
it('rejects all requested deletes if any requested or linked counterpart is locked',()=>{
 const a=mirrored();a.nodes[1].locked=true;expect(()=>deleteSelection(a,['n'],[])).toThrow(/固定/);expect(a.nodes).toHaveLength(2);expect(()=>deleteSelection(base,['missing'],[])).toThrow(/見つかりません/);
});
it('deletes a mixed node/path selection and removes their attachments while preserving other nodes',()=>{
 const a={...base,nodes:[node,{...node,id:'other'}],paths:[{id:'path',locked:false}],throughAttachments:[{id:'join',nodeId:'other',pathId:'path'}]} as unknown as DesignAggregate;
 const next=deleteSelection(a,['n'],['path']);expect(next.nodes.map(n=>n.id)).toEqual(['other']);expect(next.paths).toEqual([]);expect(next.throughAttachments).toEqual([]);expect(a.throughAttachments).toHaveLength(1);
});
