import {it,expect} from 'vitest';
import {nominalRoundBead} from './roundBeadNominal';
it('binds scalar bead size to explicit round-body description and exact round subfamily',()=>{
 const d={name:'チェコ ラウンド クリスタル',description:'両穴の丸玉ビーズです。',sizeText:'4mm'};
 expect(nominalRoundBead(d)).toMatchObject({diameterMm:4,shapeBasis:'official-product-description:丸玉ビーズです。'});
 expect(nominalRoundBead({...d,name:'天然石 ラウンド 水晶',sizeText:'約6mm'})?.approximate).toBe(true);
 for(const sizeText of ['4×6mm','穴径4mm','38cm','20ヶ','4mm_old','0mm','41mm'])expect(nominalRoundBead({...d,sizeText})).toBeUndefined();
 expect(nominalRoundBead({...d,name:'チェコ ドロップ'})).toBeUndefined();expect(nominalRoundBead({...d,description:'丸玉に使用できます。'})).toBeUndefined();
});
