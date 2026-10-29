import { describe,it,expect } from 'vitest';
import { parsePhysicalFields } from './physicalFields';
import { normalizeAnnotations } from './annotations';
describe('physical missingness and connection dimensions',()=>{
 it('preserves unknown fields and explicit zero separately',()=>{expect(parsePhysicalFields({depthMm:' ',weightG:'0',thicknessMm:'0.25'})).toEqual({weightG:0,thicknessMm:0.25});});
 it('rejects negative and nonfinite dimensions',()=>{for(const value of ['-1','Infinity','NaN'])expect(()=>parsePhysicalFields({innerDiameterMm:value})).toThrow();});
 it('preserves local dimensions while rejecting invalid values',()=>{
 const point={id:'p',name:'loop',type:'loop',position:{x:5,y:5},directionDeg:270,maxConnections:1,localInnerDiameterMm:1.2,localThicknessMm:0};
 const normalize=(p:typeof point)=>normalizeAnnotations([p],[],{x:0,y:0,width:10,height:10});
 expect(normalize(point).connectionPoints[0]).toMatchObject({localInnerDiameterMm:1.2,localThicknessMm:0});
 expect(()=>normalize({...point,localThicknessMm:-1})).toThrow();expect(()=>normalize({...point,localInnerDiameterMm:NaN})).toThrow();
 });
});
