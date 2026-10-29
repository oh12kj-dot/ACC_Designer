import {it,expect} from 'vitest';
import table from '../data/kiwa-ppss-nominal-table.json';
import {nominalCrystalTable} from './crystalTableNominal';
it('preserves official PP intervals and the SS envelope with raw labels and cut uncertainty',()=>{
 const d={name:'貴和クリスタル ＃2058/＃2088 ローズ',sizeText:'SS5(F)'};
 expect(nominalCrystalTable(d,table)).toMatchObject({diameterRangeMm:{min:1.7,max:1.9,approximate:true},diameterMm:1.8,chartRows:['PP11','PP12'],chartRangeOrigin:'envelope-of-chart-PP-rows',publishedSizeLabel:'SS5(F)',actualCutIdentity:'unverified'});
 expect(nominalCrystalTable({...d,sizeText:'PP11'},table)?.diameterRangeMm).toEqual({min:1.7,max:1.8,approximate:true});
 expect(nominalCrystalTable({...d,sizeText:'SS29(unf)'},table)?.diameterRangeMm.max).toBe(6.32);
});
it('rejects nonround cuts, holders, explicit-mm conflicts, unknown suffixes and absent chart sizes',()=>{
 const d={name:'貴和クリスタル #1088 クリスタル',sizeText:'SS29'};
 for(const name of ['石座 #1088','貴和クリスタル #5328 クリスタル','貴和クリスタル #2058/#9999 色','貴和クリスタル #10880 色'])expect(nominalCrystalTable({...d,name},table)).toBeUndefined();
 for(const sizeText of ['SS29(7mm)','SS29/PP31','SS29(unknown)','SS29_old','SS51'])expect(nominalCrystalTable({...d,sizeText},table)).toBeUndefined();
 expect(table.ranges.SS3.rows).toEqual(['PP7','PP8']);expect(table.ranges.SS3.min).toBe(1.35);expect(table.ranges.SS48.max).toBe(11.3);
});
