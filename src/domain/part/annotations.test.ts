import { describe,expect,it } from 'vitest';
import { normalizeAnnotations,type PointAnnotation,type HoleAnnotation } from './annotations';
const trim={x:10,y:20,width:40,height:60};
const point:PointAnnotation={id:'point',name:'loop',type:'loop',position:{x:30,y:26},directionDeg:-90,maxConnections:1};
const hole:HoleAnnotation={id:'hole',name:'bead',entry:{x:20,y:40},exit:{x:40,y:40}};
describe('annotation normalization',()=>{
  it('accounts for transparent trim and preserves missing diameter',()=>{
    const result=normalizeAnnotations([point],[hole],trim);
    expect(result.connectionPoints[0]).toMatchObject({xNorm:0.5,yNorm:0.1,directionDeg:270});
    expect(result.throughHoles[0]).toMatchObject({entryXNorm:0.25,exitXNorm:0.75,axisDeg:0});
    expect(result.throughHoles[0].diameterMm).toBeUndefined();
  });
  it('derives downward hole axis as clockwise 90 degrees',()=>expect(normalizeAnnotations([],[{...hole,exit:{x:20,y:60}}],trim).throughHoles[0].axisDeg).toBe(90));
  it('rejects geometry outside the final bounds',()=>expect(()=>normalizeAnnotations([{...point,position:{x:0,y:0}}],[],trim)).toThrow(/画像外/));
  it('rejects coincident holes, invalid diameter and capacity',()=>{
    expect(()=>normalizeAnnotations([],[{...hole,exit:hole.entry}],trim)).toThrow();
    expect(()=>normalizeAnnotations([],[{...hole,diameterMm:NaN}],trim)).toThrow();
    expect(()=>normalizeAnnotations([{...point,maxConnections:1.5}],[],trim)).toThrow();
  });
});
