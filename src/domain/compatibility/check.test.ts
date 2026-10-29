import { it,expect } from 'vitest';
import { throughCompatibility,pointCompatibility } from './check';
it('keeps missing dimensions unknown and clearance boundary inclusive',()=>{expect(throughCompatibility(undefined,.3).status).toBe('unknown');expect(throughCompatibility(.35,.3).status).toBe('compatible');expect(throughCompatibility(.349,.3).status).toBe('incompatible');});
it('does not infer an allowed unregistered point pair',()=>{const p={id:'p',name:'p',type:'loop',xNorm:0,yNorm:0,directionDeg:0,maxConnections:1};expect(pointCompatibility(p,p).status).toBe('unknown');expect(pointCompatibility({...p,type:'pin_end'},{...p,type:'hole'}).status).toBe('incompatible');});

it('rejects a known incompatible side even when the other side is unknown',()=>{
 const ring={id:'ring',name:'ring',type:'ring',xNorm:0,yNorm:0,directionDeg:0,maxConnections:1,localInnerDiameterMm:1};
 const loop={...ring,id:'loop',type:'loop',localInnerDiameterMm:undefined,localThicknessMm:2};
 expect(pointCompatibility(ring,loop).status).toBe('incompatible');
 expect(pointCompatibility(loop,ring).status).toBe('incompatible');
 expect(pointCompatibility(ring,{...loop,localThicknessMm:.5}).status).toBe('unknown');
 expect(pointCompatibility({...ring,localThicknessMm:.5},{...loop,localInnerDiameterMm:1,localThicknessMm:.5}).status).toBe('compatible');
});
