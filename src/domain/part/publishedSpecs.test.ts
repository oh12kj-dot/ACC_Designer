import { expect,it } from 'vitest';
import { publishedMeasurements,publishedPurchase,publishedCategory } from './publishedSpecs';
it('exact counts and sale lengths remain separate from approximate pack counts, weight and pairs',()=>{expect(publishedPurchase('20ヶ(中袋)')).toMatchObject({unit:'piece',quantity:20,approximate:false});expect(publishedPurchase('2g(約110ヶ)')).toEqual({sourceText:'2g(約110ヶ)',unit:'weight',weightG:2,estimatedCount:110,approximate:true});expect(publishedPurchase('1m')).toMatchObject({unit:'length',lengthMm:1000});expect(publishedPurchase('1ペア')).toMatchObject({unit:'pair',quantity:1});expect(publishedPurchase('1本 約38cm/約187ヶ')).not.toHaveProperty('lengthMm');expect(publishedPurchase('20ヶまたは10ヶ')).not.toHaveProperty('quantity');});
it('preserves unlabeled axes and supplier codes; only explicit labels establish dimensions',()=>{expect(publishedMeasurements('0.6×3mm')).toEqual([{sourceText:'0.6x3mm',valuesMm:[.6,3],meaning:'unassigned',approximate:false}]);expect(publishedMeasurements('PP4')).toEqual([]);expect(publishedMeasurements('外径1.5mm')[0]).toMatchObject({meaning:'outer_diameter',valuesMm:[1.5]});expect(publishedMeasurements('約12×6mm')[0]).toMatchObject({approximate:true,meaning:'unassigned'});expect(publishedMeasurements('線径0mm')).toEqual([]);});

it('uses the official tools taxonomy before component words without applying a title blacklist',()=>{
 const url='https://kiwaseisakujo.jp/products/g-tools-adhesives-cases-cases-020?variant=46996106084644';
 for(const name of ['KIWAオリジナルビーズトレイ','パーツケース(Tピン・9ピン用)','パーツケース(丸カン用)','紙箱 パールホワイト'])expect(publishedCategory(name,url)).toMatchObject({category:'other',basis:'仕入先の工具・収納・包装用品区分による分類（形状の保証なし）'});
 expect(publishedCategory('ビーズトレイ').category).toBe('bead');
 for(const bad of [url.replace('kiwaseisakujo.jp','kiwaseisakujo.jp.example.com'),url.replace('/products/','/unrelated/products/'),url.replace('g-tools-adhesives-cases-','g-tools-adhesives-casesfake-'),url.replace('https:','http:'),'not-a-url'])expect(publishedCategory('ビーズ',bad).category).toBe('bead');
 expect(publishedCategory('工具モチーフ チャーム','https://kiwaseisakujo.jp/products/g-charms-tools-001').category).toBe('charm');
 expect(publishedCategory('丸カン','https://kiwaseisakujo.jp/products/g-metalfittings-rings-001').category).toBe('jump_ring');
});
