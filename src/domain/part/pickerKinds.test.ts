import{expect,it}from'vitest';import{pickerKind}from'./pickerKinds';import{pickerIdentity}from'./picker';import type{Part}from'../../types/domain';
it('uses the product family rather than colour or size, and never changes original categories',()=>{
 const p={id:'p',name:'貴和クリスタル ＃5328　ローズ / 4mm',sourceUrl:'https://kiwaseisakujo.jp/products/p',category:'gem',geometryKind:'node'} as Part;
 expect(pickerKind(pickerIdentity(p)).id).toBe('crystal-cut');expect(p.category).toBe('gem');
 expect(pickerKind(pickerIdentity({...p,name:'樹脂パール　ローズ / 4mm'})).id).toBe('resin-pearl');
 expect(pickerKind(pickerIdentity({...p,name:'オリジナル',category:'other'})).id).toBe('unclassified');
});
