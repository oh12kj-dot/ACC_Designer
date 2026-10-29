import { describe,expect,it } from 'vitest';
import { alphaBounds,calibration,validateCrop } from './imageGeometry';
describe('Image normalization geometry',()=>{
  it('calibrates diagonal distance in source pixels',()=>expect(calibration({x:0,y:0},{x:3,y:4},10)).toBe(2));
  it('rejects coincident points and unknown scale',()=>{expect(()=>calibration({x:1,y:1},{x:1,y:1},10)).toThrow();expect(()=>calibration({x:0,y:0},{x:10,y:0},NaN)).toThrow();});
  it('accepts crop touching the exact bounds',()=>expect(()=>validateCrop({x:0,y:0,width:20,height:10},20,10)).not.toThrow());
  it('rejects crop overflow',()=>expect(()=>validateCrop({x:10,y:0,width:11,height:10},20,10)).toThrow());
  it('trims transparent margins without losing faint alpha',()=>{const data=new Uint8ClampedArray(4*4*4);data[(1*4+2)*4+3]=1;data[(2*4+3)*4+3]=255;expect(alphaBounds(data,4,4)).toEqual({x:2,y:1,width:2,height:2});});
  it('rejects empty transparent images',()=>expect(()=>alphaBounds(new Uint8ClampedArray(16),2,2)).toThrow());
});
