import {expect,it} from 'vitest';
import {nominalBodySize} from './bodySizeNominal';
import {nominalLayoutNotice,nominalBodySizeNotice} from '../domain/nominalNotice';
const d={name:'貴和クリスタル ＃5328 クリスタル',description:'ビーズと呼ばれる通し穴の開いているパーツです。',tags:['＃5328'],sizeText:'2.5mm'};
it('uses scalar BODY size only for a provisional layout box, never as a measured diameter',()=>{
 const p=nominalBodySize(d);expect(p).toMatchObject({publishedBodySizeMm:2.5,widthMm:2.5,heightMm:2.5,sizeAxisInterpretationVerified:false,physicalWidthVerified:false,physicalHeightVerified:false});expect(p).not.toHaveProperty('diameterMm');
 expect(nominalLayoutNotice({nominalPlacement:p})).toBe(nominalBodySizeNotice);expect(nominalLayoutNotice({nominalPlacement:{recipe:'other'}})).toBeUndefined();
});
it('rejects hole dimensions, composite labels, other cuts, unknown suffixes and missing BODY context',()=>{
 for(const sizeText of ['穴径2.5mm','4×6mm','PP14','6mm_old','0mm','41mm'])expect(nominalBodySize({...d,sizeText})).toBeUndefined();
 expect(nominalBodySize({...d,name:'貴和クリスタル ＃53280'})).toBeUndefined();expect(nominalBodySize({...d,description:'石座に使用できます。'})).toBeUndefined();expect(nominalBodySize({...d,tags:['＃5301']})).toBeUndefined();
 expect(nominalBodySize({...d,name:'[大袋］貴和クリスタル ＃5000 白',tags:['＃5000大袋'],sizeText:'約4mm'})?.approximate).toBe(true);
});
it('preserves RC material labels and accepts only the reviewed material notice before BODY context',()=>{
 expect(nominalBodySize({...d,sizeText:'3mm(RC)'})).toMatchObject({publishedBodySizeMm:3,publishedSizeLabel:'3mm(RC)'});
 expect(nominalBodySize({...d,sizeText:'4mm(RC)'})).toBeUndefined();
 const p={...d,name:'貴和クリスタル ＃5000 RCペリドット / 4mm / 10ヶ',tags:['＃5000'],sizeText:'4mm',description:'※素材変更により商品名、価格が変更になりました。4mm(2025年9月10日)ビーズと呼ばれる通し穴の開いているパーツです。'};
 expect(nominalBodySize(p)?.publishedBodySizeMm).toBe(4);
 expect(nominalBodySize({...p,name:'貴和クリスタル ＃5000 他の色 / 4mm / 10ヶ'})).toBeUndefined();expect(nominalBodySize({...p,description:'※素材変更により商品名、価格が変更になりました。適合サイズ4mm'})).toBeUndefined();
});
