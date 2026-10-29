import {it,expect} from 'vitest';
import {mapOfficialSize} from './officialDimensionMapping';
it('maps only explicitly declared size axes, with units and approximation retained',()=>{
 const result=mapOfficialSize('約2×0.5cm','<p>サイズ表記は内径×幅になります。</p>');expect(result.status).toBe('explicit-axis-order');expect(result.measurements.map(m=>[m.meaning,m.valuesMm[0],m.approximate])).toEqual([['inner_diameter',20,true],['width',5,true]]);
});
it('does not apply dimensions of an accessory to the product or guess an axis',()=>{
 expect(mapOfficialSize('3×5mm','内径2mmの丸カンが使えます。').status).toBe('unresolved');expect(mapOfficialSize('3×5mm','サイズ表記は幅×高さです。サイズ表記は高さ×幅です。').reason).toBe('CONFLICTING_SIZE_AXIS_ORDERS');expect(mapOfficialSize('3mm','サイズ表記は幅×高さです。').status).toBe('unresolved');
});
