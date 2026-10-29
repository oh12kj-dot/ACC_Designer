import {expect,it} from 'vitest';
import {colorFamilies,pickerColorFamilies} from './colorFamilies';
import {pickerColorGroup} from './picker';
it('puts named shades in broad searchable families without treating a gold finish as pink',()=>{
 const samples:Record<string,string>={'ライトアメジスト':'purple','アメジストAB':'purple','サファイヤ':'blue','モンタナ':'blue','ローズ':'red','シャム':'red','エメラルド':'green','ジョンキル':'orange','ジェット':'dark','クリーム':'clear','クリスタル':'clear','スモークトパーズ':'brown','ピンクゴールド':'gold','AG':'gold','AR':'silver'};
 for(const [name,family]of Object.entries(samples))expect(pickerColorFamilies(pickerColorGroup(name)),name).toContain(family);
 expect(pickerColorFamilies('ピンクゴールド')).toEqual(['gold']);expect(pickerColorFamilies('スモークトパーズ')).toEqual(['brown']);
});
it('keeps unknown and missing names reachable, supports multiple hues and preserves the source',()=>{
 expect(pickerColorFamilies('独自色123')).toEqual(['other']);expect(pickerColorFamilies('')).toEqual(['unspecified']);expect(pickerColorFamilies('ミックス')).toEqual(['multi']);
 expect(pickerColorFamilies('ブルー/ホワイト')).toEqual(['blue']);
 expect(pickerColorFamilies('クリスタルゴールド')).not.toContain('gold');
 const ids=new Set(colorFamilies.map(([id])=>id));for(const name of ['','未知','虹','レッド','アメジスト','AG']){const families=pickerColorFamilies(name);expect(families.length).toBeGreaterThan(0);expect(families.every(f=>ids.has(f))).toBe(true);}
});

it('treats clear as transparency, giving named hues priority over white or clear markers',()=>{
 for(const [name,family]of [['クリアエメラルド','green'],['クリアブルー','blue'],['クリアラベンダー','purple'],['クリアプラム','purple'],['クリアネイビー','blue'],['クリアライム','green'],['クリアべっ甲','brown'],['クリアピンク/ホワイト','red'],['ホワイトオパールブルーAB','blue'],['クリームローズ','red']])expect(pickerColorFamilies(name),name).toEqual([family]);
 for(const name of ['クリア','スノークリア','透明','無色','クリア/ホワイト','ホワイト','クリーム','アイボリー','キスカ','クリスタルAB'])expect(pickerColorFamilies(name),name).toEqual(['clear']);
 expect(pickerColorFamilies('クリア独自色123')).toEqual(['other']);
});
