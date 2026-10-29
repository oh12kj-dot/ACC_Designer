import {describe,it,expect} from 'vitest';
import sharp from 'sharp';
import {nominalSphere,prepareNominalSphere,nominalAxes,prepareNominalAxes,nominalDiameterRange,nominalBall,nominalRoundPearl,nominalAdditionalSphere,prepareNominalAdditionalSphere} from './nominalPlacement';
describe('published nominal placement',()=>{
 it('extracts one object from a reviewed horizontal sphere pair and records the selection',async()=>{
  const pair=Buffer.from('<svg width="180" height="100"><rect width="180" height="100" fill="white"/><circle cx="45" cy="50" r="35" fill="red"/><circle cx="135" cy="50" r="35" fill="blue"/></svg>');
  const image=await prepareNominalAdditionalSphere(await sharp(pair).png().toBuffer(),6);
  expect(image.transform).toMatchObject({selection:'left-object-of-reviewed-horizontal-pair',imageScaleVerified:false,connectionReady:false});
  const stats=await sharp(image.high).stats();expect(stats.channels[0].mean).toBeGreaterThan(stats.channels[2].mean);
  expect(image.width*image.mmPerPx).toBe(6);
  const three=Buffer.from('<svg width="300" height="100"><rect width="300" height="100" fill="white"/><circle cx="45" cy="50" r="35" fill="red"/><circle cx="150" cy="50" r="35" fill="blue"/><circle cx="255" cy="50" r="35" fill="green"/></svg>');
  await expect(prepareNominalAdditionalSphere(await sharp(three).png().toBuffer(),6)).rejects.toThrow('NOMINAL_PHOTO_REVIEW_REQUIRED');
 });
 it('limits additional spherical families to official shape statements and keeps approximate labels',()=>{
  const d={name:'貴和クリスタル ＃5818 ホワイト',description:'真円形のパーツです',tags:[],sizeText:'4mm'};
  expect(nominalAdditionalSphere(d)?.diameterMm).toBe(4);
  expect(nominalAdditionalSphere({...d,name:'貴和クリスタル #5824'})).toBeUndefined();
  expect(nominalAdditionalSphere({...d,description:'片穴パーツ'})).toBeUndefined();
  expect(nominalAdditionalSphere({...d,sizeText:'4×6mm'})).toBeUndefined();
  expect(nominalAdditionalSphere({...d,name:'銅玉 ゴールド',description:'',tags:['メタルビーズ銅玉'],sizeText:'約18mm'})).toMatchObject({diameterMm:18,approximate:true,sizeLabel:'約18mm'});
 });
 it('uses only official round pearl classification and a strict bead-size label',()=>{
  const d={tags:['樹脂パール丸'],sizeText:'2.5mm'};expect(nominalRoundPearl(d)).toMatchObject({diameterMm:2.5,shapeBasis:'official-product-tag:樹脂パール丸'});
  expect(nominalRoundPearl({...d,tags:['樹脂パール']})).toBeUndefined();
  for(const sizeText of ['約6mm','4×6mm','38cm','30ヶ','8mm(底6mm)','31mm','0mm'])expect(nominalRoundPearl({...d,sizeText})).toBeUndefined();
 });
 it('uses only body diameter evidence bound to the exact ball variant',()=>{
  const d={id:'kiwa:1:2',variantId:'2',sku:'ABC',name:'銅玉 ゴールド'},e={kind:'official-ball-diameter-only',sourceDraftId:d.id,variantId:'2',sku:'ABC',publishedDiameterMm:8,approximate:true,diagramSha256:'a'.repeat(64),diagramUrl:'https://example.com/diagram'};
  expect(nominalBall(d,e)).toMatchObject({diameterMm:8,approximate:true});
  expect(nominalBall({...d,name:'TOHOプラビーズ 丸玉'},e)).toBeUndefined();expect(nominalBall({...d,variantId:'3'},e)).toBeUndefined();expect(nominalBall(d,{...e,kind:'official-coil-inner-label-only'})).toBeUndefined();expect(nominalBall(d,{...e,publishedDiameterMm:NaN})).toBeUndefined();
 });
 it('retains published diameter intervals and explicitly labels the layout midpoint',()=>{
  const d={id:'kiwa:1:2',variantId:'2',sku:'ABC'},e={kind:'official-crystal-diameter-range-only',sourceDraftId:d.id,variantId:'2',sku:'ABC',diameterRangeMm:{min:1.7,max:1.8,approximate:true},diagramSha256:'a'.repeat(64),diagramUrl:'https://example.com/diagram'};
  expect(nominalDiameterRange(d,e)).toMatchObject({diameterMm:1.75,diameterRangeMm:e.diameterRangeMm,sizeChoice:'midpoint-for-layout-only'});
  expect(nominalDiameterRange(d,{...e,diameterRangeMm:{min:6.1,max:6.3,approximate:true}})?.diameterMm).toBe(6.2);expect(nominalDiameterRange({...d,sku:'other'},e)).toBeUndefined();expect(nominalDiameterRange(d,{...e,diameterRangeMm:{min:2,max:1,approximate:true}})).toBeUndefined();expect(nominalDiameterRange(d,{...e,kind:'official-wire-gauge-approximate-only'})).toBeUndefined();
 });
 it('binds frontal axes to exact draft identity and keeps thickness out of the footprint',async()=>{
  const d={id:'kiwa:1:2',variantId:'2',sku:'ABC'},e={kind:'official-crystal-frontal-axes-only',sourceDraftId:d.id,variantId:'2',sku:'ABC',outerWidthMm:6,outerHeightMm:8,diagramSha256:'a'.repeat(64),diagramUrl:'https://example.com/diagram'};
  expect(nominalAxes(d,e)).toMatchObject({widthMm:6,heightMm:8});expect(nominalAxes({...d,name:'＃4809'},e)).toBeUndefined();expect(nominalAxes({...d,variantId:'3'},e)).toBeUndefined();expect(nominalAxes(d,{...e,kind:'official-end-cap-dimensions-only'})).toBeUndefined();
  const bytes=await sharp({create:{width:60,height:80,channels:4,background:'gray'}}).png().toBuffer();const image=await prepareNominalAxes(bytes,6,8);expect(image.width*image.mmPerPx).toBe(6);expect(image.height*image.mmPerPx).toBe(8);expect(image.transform.imageScaleVerified).toBe(false);
 });
 const draft={name:'貴和クリスタル ＃5810 ホワイト',description:'真円形のビーズです。',sizeText:'5mm(店舗限定)'};
 it('uses official sphere labels including store variants',()=>{expect(nominalSphere(draft)?.diameterMm).toBe(5);});
 it('does not interpret pack counts, PP, ranges, different cuts or missing shape as diameters',()=>{
  for(const sizeText of ['20ヶ','PP11','約4mm','4〜5mm','4x6mm','0mm'])expect(nominalSphere({...draft,sizeText})).toBeUndefined();
  expect(nominalSphere({...draft,name:'#58100'})).toBeUndefined();expect(nominalSphere({...draft,description:'他のビーズ'})).toBeUndefined();
 });
 it('records provisional scale and rejects non-sphere image bounds',async()=>{
  const circle=Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="white"/><circle cx="50" cy="50" r="35" fill="gray"/></svg>');
  const image=await prepareNominalSphere(await sharp(circle).png().toBuffer(),4);
  expect(image.width*image.mmPerPx).toBe(4);expect(image.transform.imageScaleVerified).toBe(false);expect(image.transform.connectionReady).toBe(false);
  const bar=Buffer.from('<svg width="100" height="100"><rect width="100" height="100" fill="white"/><rect x="10" y="40" width="80" height="20" fill="gray"/></svg>');
  await expect(prepareNominalSphere(await sharp(bar).png().toBuffer(),4)).rejects.toThrow('NOMINAL_PHOTO_REVIEW_REQUIRED');
 });
});
