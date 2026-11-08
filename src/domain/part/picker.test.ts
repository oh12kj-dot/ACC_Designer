import {expect,it} from 'vitest';
import type {Part} from '../../types/domain';
import {pickerIdentity,comparePickerEntries,pickerColorGroup} from './picker';
const part=(id:string,extra:Partial<Part>={})=>({id,name:'ビーズ / 71ヶ',widthMm:4,heightMm:4,...extra}) as Part;
it('orders the same family by longest then shortest body axis, with unknown sizes last',()=>{
 const a=[part('ten',{widthMm:7,heightMm:10}),part('four'),part('two',{widthMm:2,heightMm:2}),part('unknown',{widthMm:undefined,heightMm:undefined}),part('narrow',{widthMm:3,heightMm:4})];
 expect(a.map(pickerIdentity).sort(comparePickerEntries).map(e=>e.part.id)).toEqual(['two','narrow','four','ten','unknown']);
 expect(a[0].widthMm).toBe(7);
});
it('groups Kiwa types across colours before ordering sizes and does not use quantities or holes',()=>{
 const sourceUrl='https://kiwaseisakujo.jp/products/bead?variant=1';
 const a=[part('red10',{name:'ビーズ　赤 / 10mm / 1ヶ',sourceUrl,widthMm:10,heightMm:10}),part('gold2',{name:'ビーズ　ゴールド / 2mm / 71ヶ',sourceUrl,widthMm:2,heightMm:2,holeDiameterMm:1}),part('red4',{name:'ビーズ　赤 / 4mm / 100ヶ',sourceUrl})];
 expect(a.map(pickerIdentity).sort(comparePickerEntries).map(e=>e.part.id)).toEqual(['gold2','red4','red10']);
 expect(pickerIdentity(a[0]).color).toBe('赤');
});
it('prefers explicit colours, preserves finish suffixes and never guesses colours of manual names',()=>{
 const imported=part('a',{name:'丸カン　ピンクゴールド/F / 3mm / 71ヶ',sourceUrl:'https://kiwaseisakujo.jp/products/ring'});
 expect(pickerIdentity(imported).color).toBe('ピンクゴールド');expect(pickerIdentity(imported).publishedColor).toBe('ピンクゴールド/F');
 expect(pickerIdentity({...imported,color:'青'}).color).toBe('青');
 expect(pickerIdentity(part('b',{name:'手作り　赤い花'})).color).toBe('');
 expect(pickerIdentity(part('c',{widthMm:NaN,heightMm:-1})).dimensions).toEqual([]);
});

it('groups only known finishing suffixes, keeping genuine two-colour and unknown labels',()=>{
 for(const c of ['アメジスト/G','アメジスト/S','アメジスト/F','アメジスト/Ｆ','アメジスト/unf','アメジスト/F・unf'])expect(pickerColorGroup(c)).toBe('アメジスト');
 expect(pickerColorGroup('Lt.アメジスト/G')).toBe('ライトアメジスト');expect(pickerColorGroup('ライトアメジスト/S')).toBe('ライトアメジスト');
 expect(pickerColorGroup('AG')).toBe('金古美（アンティークゴールド）');expect(pickerColorGroup('AR')).toBe('銀古美（アンティークシルバー）');expect(pickerColorGroup('金古美')).toBe(pickerColorGroup('AG'));
 for(const c of ['ブルー/ホワイト','アメジスト/レインボームーンストーン','アメジスト/XYZ','アメジストAB'])expect(pickerColorGroup(c)).toBe(c);
 expect(pickerColorGroup('アメジスト/G【アウトレット】')).toBe('アメジスト');expect(pickerColorGroup('')).toBe('');
});

it('does not sort a provisional drawing box as a physical 10mm size',()=>{const p=part('placeholder',{widthMm:10,heightMm:10,metadata:{provisionalRegistration:{version:1,recipe:'provisional-placeholder-v1',status:'needs_review',layoutSizeSource:'fixed-placeholder-not-physical',physicalDimensionsVerified:false,imageScaleVerified:false,connectionReady:false,sourceImageUrls:[],publishedSizeText:'100cm',pending:[]}}});expect(pickerIdentity(p).dimensions).toEqual([]);});
