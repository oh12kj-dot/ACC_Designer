import {expect,it} from 'vitest';
import {validateDefinitions} from './definitions';
const point={id:'p',name:' point ',type:'generic',xNorm:0,yNorm:1,directionDeg:-90,maxConnections:0,localInnerDiameterMm:0};
const hole={id:'h',name:'hole',entryXNorm:0,entryYNorm:.5,exitXNorm:1,exitYNorm:.5,axisDeg:360};
it('preserves boundary positions, zero capacity and explicit zero dimensions while normalizing angles',()=>{
 const result=validateDefinitions([point],[hole]);expect(result.connectionPoints[0]).toMatchObject({name:'point',directionDeg:270,localInnerDiameterMm:0,maxConnections:0});expect(result.throughHoles[0].axisDeg).toBe(0);expect(result.throughHoles[0].diameterMm).toBeUndefined();
});
it('rejects malformed coordinates, capacities, dimensions, duplicate identities and degenerate holes',()=>{
 for(const patch of [{xNorm:NaN},{yNorm:1.1},{directionDeg:Infinity},{maxConnections:.5},{localInnerDiameterMm:-1},{name:' '},{type:''}])expect(()=>validateDefinitions([{...point,...patch}],[])).toThrow();
 expect(()=>validateDefinitions([point],[{...hole,id:'p'}])).toThrow();expect(()=>validateDefinitions([],[{...hole,exitXNorm:0}])).toThrow();
 expect(()=>validateDefinitions([],[{...hole,diameterMm:NaN}])).toThrow();
});
