import {expect,it} from 'vitest';
import {calibratedZoom,screenScalePercent} from './screenScale';
it('converts measured CSS reference length into actual-size zoom across responsive canvas widths',()=>{
 const a=calibratedZoom(50,900),b=calibratedZoom(50,300);expect(a.zoom).toBe(4);expect(b.zoom).toBe(12);expect(screenScalePercent(12,300,4)).toBe(100);expect(screenScalePercent(6,300,4)).toBe(50);
});
it('rejects missing/invalid measurements and zoom outside the supported range',()=>{
 for(const m of [0,-1,NaN,Infinity])expect(()=>calibratedZoom(m,900)).toThrow();expect(()=>calibratedZoom(50,0)).toThrow();expect(()=>calibratedZoom(1,100)).toThrow();
});
