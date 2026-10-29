import {expect,it} from 'vitest';
import {proposePlacement,proposeBatch,automaticSpacingMm,type Placement} from './placement';
import {layoutGeometry} from './layoutGuide';
import type {DesignAggregate} from '../../types/aggregate';
import type {Part} from '../../types/domain';
const a={design:{},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]} as unknown as DesignAggregate;
const part={id:'p',geometryKind:'path'} as Part;
const p:Placement={id:'new',part,point:{x:37,y:24},rotationDeg:0,length:200,shape:'u',shallow:false};
it('anchors a path at the requested start without changing physical length, shape or input',()=>{
 const result=proposePlacement(a,p);expect(result.paths[0]).toMatchObject({start:{x:37,y:24},end:{x:177,y:24},physicalLengthMm:200,shape:'u',bendSide:1});expect(a.paths).toEqual([]);expect(result.pointAttachments).toBe(a.pointAttachments);
 const straight=proposePlacement(a,{...p,shape:'straight'});expect(straight.paths[0].end).toEqual({x:237,y:24});
});
it('rejects invalid path lengths and nonfinite positions before committing',()=>{
 expect(()=>proposePlacement(a,{...p,length:-1})).toThrow();expect(()=>proposePlacement(a,{...p,length:NaN})).toThrow();expect(()=>proposePlacement(a,{...p,point:{x:Infinity,y:0}})).toThrow();
});
const nodePart={id:'bead',geometryKind:'node'} as Part;
it('creates 100 distinct row copies with center spacing and leaves the input unchanged',()=>{
 const result=proposeBatch(a,{...p,part:nodePart,count:100,spacingMm:5,copyIds:Array.from({length:100},(_,i)=>i?'copy'+i:p.id)});expect(result.nodes).toHaveLength(100);expect(new Set(result.nodes.map(n=>n.id)).size).toBe(100);expect(result.nodes.at(-1)!.xMm).toBe(37+495);expect(a.nodes).toEqual([]);expect(result.pointAttachments).toEqual([]);
});
it('lays copies along guide arc distance and rejects overflow before producing a partial batch',()=>{
 const settings={enabled:true,snap:true,rotate:true,offset:0,shape:'v' as const,width:100,drop:50,center:{x:100,y:100}},geometry=layoutGeometry(settings)!;
 const batch={...p,part:nodePart,point:{x:50,y:75},count:3,spacingMm:10,copyIds:[p.id,'b','c']};const result=proposeBatch(a,batch,{settings,geometry,cssPxPerMm:3});expect(result.nodes[1].xMm).toBeCloseTo(50+10/Math.sqrt(2));expect(result.nodes[1].rotationDeg).toBe(315);
 expect(()=>proposeBatch(a,{...batch,spacingMm:100},{settings,geometry,cssPxPerMm:3})).toThrow(/不足/);expect(a.nodes).toEqual([]);
});
it('rejects count, spacing, duplicate IDs, reused IDs and multi-path requests',()=>{
 for(const count of [0,101,1.5,NaN])expect(()=>proposeBatch(a,{...p,part:nodePart,count})).toThrow();expect(()=>proposeBatch(a,{...p,part:nodePart,spacingMm:0})).toThrow();expect(()=>proposeBatch(a,{...p,part:nodePart,count:2,copyIds:[p.id,p.id]})).toThrow(/ID/);expect(()=>proposeBatch({...a,nodes:[{id:p.id}] as DesignAggregate['nodes']},{...p,part:nodePart})).toThrow(/ID/);expect(()=>proposeBatch(a,{...p,count:2,copyIds:[p.id,'b']})).toThrow(/1本/);
});

it('uses registered small-bead dimensions automatically and retains manual center spacing',()=>{
 const bead={...nodePart,widthMm:3,heightMm:3},batch={...p,part:bead,count:3,copyIds:[p.id,'b','c']};
 const automatic=proposeBatch(a,batch);expect(automatic.nodes.map(n=>n.xMm)).toEqual([37,40,43]);expect(automatic.nodes.map(n=>n.yMm)).toEqual([24,24,24]);
 expect(proposeBatch(a,{...batch,spacingMode:'manual',spacingMm:10}).nodes.map(n=>n.xMm)).toEqual([37,47,57]);expect(a.nodes).toEqual([]);
 expect(automaticSpacingMm({...bead,widthMm:3,heightMm:6},90)).toBeCloseTo(6);expect(automaticSpacingMm({...bead,widthMm:NaN})).toBeUndefined();
});
it('uses rotated projected dimensions on a guide, rejecting missing sizes and overflow atomically',()=>{
 const settings={enabled:true,snap:true,rotate:true,offset:0,shape:'v' as const,width:100,drop:50,center:{x:100,y:100}},geometry=layoutGeometry(settings)!,batch={...p,part:{...nodePart,widthMm:3,heightMm:6},point:{x:50,y:75},count:3,copyIds:[p.id,'b','c']};
 const result=proposeBatch(a,batch,{settings,geometry,cssPxPerMm:3});expect(Math.hypot(result.nodes[1].xMm-result.nodes[0].xMm,result.nodes[1].yMm-result.nodes[0].yMm)).toBeCloseTo(6);expect(result.nodes[1].rotationDeg).toBe(315);
 expect(()=>proposeBatch(a,{...batch,part:nodePart})).toThrow(/手動/);expect(proposeBatch(a,{...batch,part:nodePart,spacingMode:'manual',spacingMm:3}).nodes).toHaveLength(3);
 expect(()=>proposeBatch(a,{...batch,count:100,copyIds:Array.from({length:100},(_,i)=>i?'n'+i:p.id)},{settings,geometry,cssPxPerMm:3})).toThrow(/不足/);expect(a.nodes).toEqual([]);
});

it('uses the registered hole axis for every batch member and keeps spacing along that axis',()=>{
 const settings={enabled:true,snap:true,rotate:true,offset:0,shape:'v' as const,width:100,drop:50,center:{x:100,y:100}},geometry=layoutGeometry(settings)!;
 for(const axisDeg of [0,90]){
 const bead={...nodePart,widthMm:3,heightMm:6,throughHoles:[{axisDeg}]} as Part;
 const result=proposeBatch(a,{...p,part:bead,point:{x:50,y:75},count:3,copyIds:[p.id,'b','c']},{settings,geometry,cssPxPerMm:3});
 expect(result.nodes.every(n=>Math.abs(n.rotationDeg-(axisDeg===0?45:315))<1e-6)).toBe(true);
 expect(Math.hypot(result.nodes[1].xMm-result.nodes[0].xMm,result.nodes[1].yMm-result.nodes[0].yMm)).toBeCloseTo(axisDeg===0?3:6);
 expect(result.throughAttachments).toEqual([]);
 }
});
