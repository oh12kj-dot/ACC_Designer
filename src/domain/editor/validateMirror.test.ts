import { it,expect } from 'vitest';
import type { DesignAggregate } from '../../types/aggregate';
import type { Part } from '../../types/domain';
import { createMirror,mirrorState } from './createMirror';
import { validateMirrorStructure } from './validateMirror';
const part={id:'p',name:'p',category:'bead',tags:[],isArchived:false,imageAssetId:'asset',mirrorPolicy:'mirror_image',geometryKind:'node',widthMm:10,heightMm:10,connectionPoints:[],throughHoles:[]} as Part;
const source={design:{editorConfig:{}},nodes:[{id:'n',partId:'p',xMm:20,yMm:0,rotationDeg:0,scaleX:1,scaleY:1,zIndex:0,locked:false}],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
function linked(){let i=0;return createMirror(source,[part],{nodeId:'n'},100,{},()=>`id-${++i}`);}
it('rejects missing/duplicate correspondence and orphan or duplicate group membership',()=>{
 const next=linked(),groupId=Object.keys(mirrorState(next).groups)[0];expect(()=>validateMirrorStructure({...next,mirrorLinks:[]},[part])).toThrow(/欠落/);expect(()=>validateMirrorStructure({...next,mirrorLinks:[...next.mirrorLinks,{...next.mirrorLinks[0],id:'duplicate'}]},[part])).toThrow(/重複/);
 for(const ids of [['ghost'],['n','n']]){const state=mirrorState(next);state.groups[groupId].left.nodeIds=ids;expect(()=>validateMirrorStructure({...next,design:{...next.design,editorConfig:{mirror:state}}})).toThrow();}
 expect(()=>validateMirrorStructure({...next,design:{...next.design,editorConfig:{}}})).toThrow(/設定/);
});
it('rejects incompatible part identity, absent manual policy, and independent links',()=>{
 const next=linked();expect(()=>validateMirrorStructure({...next,nodes:next.nodes.map((n,i)=>i?{...n,partId:'other'}:n)},[part])).toThrow(/Part/);
 expect(()=>validateMirrorStructure(next,[{...part,mirrorPolicy:'manual'}])).toThrow(/方針/);const state=mirrorState(next);Object.values(state.groups)[0].mode='independent';expect(()=>validateMirrorStructure({...next,design:{...next.design,editorConfig:{mirror:state}}})).toThrow(/対応/);
});

it('rejects cross-side and partially owned attachments even in independent groups',()=>{
 const next=linked(),state=mirrorState(next);Object.values(state.groups)[0].mode='independent';
 const independent={...next,design:{...next.design,editorConfig:{mirror:state}},mirrorLinks:[]};
 const attachment={id:'cross',nodeAId:next.nodes[0].id,nodeBId:next.nodes[1].id};
 expect(()=>validateMirrorStructure({...independent,pointAttachments:[attachment]} as unknown as DesignAggregate)).toThrow(/跨ぐ/);
 expect(()=>validateMirrorStructure({...independent,nodes:[...next.nodes,{...next.nodes[0],id:'outside'}],pointAttachments:[{...attachment,nodeBId:'outside'}]} as unknown as DesignAggregate)).toThrow(/跨ぐ/);
});
