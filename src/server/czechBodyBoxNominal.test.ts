import {describe,it,expect} from 'vitest';
import {nominalCzechBodyBox} from './czechBodyBoxNominal';
const round={name:'チェコ ラウンド　ジェット / 約4mm / 50ヶ',description:'プレスによって成型加工されたビーズです。',sizeText:'約4mm',tags:['チェコラウンド']};
describe('Czech own photo provisional BOX',()=>{
 it('keeps approximate scalar labels out of diameter and preserves pair order',()=>{
  const a=nominalCzechBodyBox(round);expect(a).toMatchObject({widthMm:4,heightMm:4,approximate:true,physicalWidthVerified:false});expect(a).not.toHaveProperty('diameterMm');
  expect(nominalCzechBodyBox({...round,name:'チェコ ボタンカット　クリスタル / 3×5mm / 10ヶ',sizeText:'3×5mm',description:'熱加工でカットに丸みを持たせたファイヤーポリッシュです。',tags:['チェコボタンカット']})).toMatchObject({widthMm:3,heightMm:5,photoRotationDegrees:90,physicalHeightVerified:false});
  expect(nominalCzechBodyBox({...round,name:'チェコ シズク横穴　クリスタル / 約4×6mm / 30ヶ',sizeText:'約4×6mm',tags:['チェコシズク横穴']})).toMatchObject({widthMm:4,heightMm:6,publishedBodySizePairMm:[4,6],photoRotationDegrees:0,approximate:true});
 });
 it('rejects unknown labels, different families/tags and other size context',()=>{
  for(const sizeText of ['4mm(new)','約4-6mm','0mm','41mm','4×6mm','4mm(穴径)','4.01mm'])expect(nominalCzechBodyBox({...round,sizeText})).toBeUndefined();
  expect(nominalCzechBodyBox({...round,tags:['チェコメロン・パンプキン']})).toBeUndefined();
  expect(nominalCzechBodyBox({...round,description:'穴径は0.8mmです。'})).toBeUndefined();
  expect(nominalCzechBodyBox({...round,name:'チェコ ファイヤーポリッシュ ファム　クリスタル / 4mm / 10ヶ',tags:['チェコファイヤーポリッシュ'],description:'熱加工でカットに丸みを持たせたファイヤーポリッシュです。'})).toBeUndefined();
  expect(nominalCzechBodyBox({...round,name:'チェコ ダガー　クリスタル / 4mm / 10ヶ',tags:['チェコダガー']})).toBeUndefined();
 });
});
