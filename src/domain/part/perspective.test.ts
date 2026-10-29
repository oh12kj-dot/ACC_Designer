import { describe,expect,it } from 'vitest';
import { inverseHomography,project,validatePerspective,warpPixels,type Quad } from './perspective';

describe('four-point perspective',()=>{
  const corners:Quad=[{x:10,y:20},{x:90,y:10},{x:80,y:80},{x:20,y:90}];
  it('maps all four nonrectangular corners and a finite interior',()=>{
    const matrix=inverseHomography(corners);
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}].forEach((p,i)=>{const actual=project(matrix,p.x,p.y);expect(actual.x).toBeCloseTo(corners[i].x);expect(actual.y).toBeCloseTo(corners[i].y);});
    const center=project(matrix,0.5,0.5);expect(center.x).toBeGreaterThan(20);expect(center.x).toBeLessThan(80);
  });
  it('rejects self-intersection, duplicate corners, wrong order and out-of-bounds points',()=>{
    for(const invalid of [[corners[0],corners[2],corners[1],corners[3]],[corners[0],corners[0],corners[2],corners[3]],[corners[0],corners[3],corners[2],corners[1]],[{x:-1,y:1},...corners.slice(1)]])expect(()=>validatePerspective({corners:invalid as Quad,width:50,height:50},100,100)).toThrow();
  });
  it('preserves exact pixels for an identity rectangle',()=>{
    const data=new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);
    expect(warpPixels(data,2,2,{corners:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],width:2,height:2})).toEqual(data);
  });
  it('interpolates premultiplied alpha without leaking transparent RGB',()=>{
    const data=new Uint8ClampedArray([255,0,0,255,0,255,0,0,255,0,0,255,0,255,0,0]);
    const output=warpPixels(data,2,2,{corners:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],width:3,height:2});
    expect([...output.slice(4,8)]).toEqual([255,0,0,128]);
  });
  it('rejects zero-size output and singular homography',()=>{
    expect(()=>validatePerspective({corners,width:0,height:10},100,100)).toThrow();
    expect(()=>inverseHomography([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}])).toThrow();
  });
});
