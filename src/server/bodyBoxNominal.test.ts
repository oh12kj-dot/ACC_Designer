import {it,expect} from 'vitest';
import {nominalBodyBox} from './bodyBoxNominal';
import {nominalLayoutNotice,nominalBodyPairNotice} from '../domain/nominalNotice';
const ref={cut:'4228',shapeReferenceSha256:'a'.repeat(64),shapeReferenceUrl:'https://example.com/shape',shapeReferenceProductId:'1',shapeReferenceSourceUrl:'https://example.com/product',shapeReferenceRegion:'left projection',referenceUse:'shape only'};
const refs={'4228':ref,'4428':{...ref,cut:'4428'}},d={name:'貴和クリスタル ＃4228 クリスタル',description:'通し穴が開いていないパーツです。',tags:['＃4228'],sizeText:'8×4mm'};
it('keeps source pair order and visible unverified axes while choosing a provisional photograph orientation',()=>{
 for(const [cut,sizeText,w,h] of [['4162','10×5.5mm',10,5.5],['4327','30×20mm',30,20],['4470','8mm(店舗限定)',8,8],['4127','30×22mm',30,22],['4460','18mm',18,18],['4627','27×18.5mm',27,18.5],['4610','14×10mm',14,10],['4501','7×3mm',7,3],['4499','10mm',10,10],['4699','6×6.9mm',6,6.9],['4799','6×6.1mm',6,6.1],['4527','8×6mm',8,6],['4884','5.5×5mm',5.5,5],['4815','6×5.3mm',6,5.3],['4595','12×6mm',12,6],['4745','5mm',5,5],['4483','8mm',8,8],['4744','6mm',6,6],['4683','7.8×8.7mm',7.8,8.7],['4706','12mm',12,12],['4322','10×5mm',10,5],['4929','14×10.5mm',14,10.5],['4600','8×6mm',8,6],['4933','19mm',19,19],['4142','14×11mm',14,11]] as const){const r={...refs,[cut]:{...ref,cut}},x={...d,name:'貴和クリスタル ＃'+cut,tags:['＃'+cut],sizeText};expect(nominalBodyBox(x,r)).toMatchObject({widthMm:w,heightMm:h,physicalWidthVerified:false,photoRotationDegrees:['4884','4815'].includes(cut)?0:cut==='4699'?90:w>h?90:0});expect(nominalBodyBox({...x,name:'石座 ＃'+cut+'用'},r)).toBeUndefined();}
 const p=nominalBodyBox(d,refs);expect(p).toMatchObject({widthMm:8,heightMm:4,publishedBodySizePairMm:[8,4],photoRotationDegrees:90,physicalWidthVerified:false,sizeAxisInterpretationVerified:false});expect(p).not.toHaveProperty('diameterMm');expect(nominalLayoutNotice({nominalPlacement:p})).toBe(nominalBodyPairNotice);
 expect(nominalBodyBox({...d,sizeText:'4×2.9mm'},refs)?.heightMm).toBe(2.9);expect(nominalBodyBox({...d,sizeText:'4×8mm'},refs)).toMatchObject({widthMm:4,heightMm:8,photoRotationDegrees:0});
 expect(nominalBodyBox({...d,name:'[大袋］貴和クリスタル ＃4228 クリスタル',tags:['＃4228大袋'],sizeText:'8×4mm(店舗限定)'},refs)).toMatchObject({publishedSizeLabel:'8×4mm(店舗限定)',widthMm:8,heightMm:4});
 expect(nominalBodyBox({...d,name:'貴和クリスタル ＃4428 クリスタル',tags:['＃4428'],sizeText:'6mm'},refs)).toMatchObject({publishedBodySizeMm:6,widthMm:6,heightMm:6});
});
it('rejects fitting dimensions, other variants in body text, unknown suffixes and cut mismatches',()=>{
 for(const sizeText of ['8mm','8×4mm(RC)','8x4mm','穴径8×4mm','0×4mm','41×4mm','8×4×2mm','8×4cm','PP14'])expect(nominalBodyBox({...d,sizeText},refs)).toBeUndefined();
 for(const overrides of [{name:'石座 ＃4228用'},{tags:['＃4320']},{description:'＃4228に使用できます。'},{description:'通し穴が開いていないパーツです。8×4mmのサイズもあります。',sizeText:'不明'},{name:'貴和クリスタル ＃5601'}])expect(nominalBodyBox({...d,...overrides},refs)).toBeUndefined();
});
