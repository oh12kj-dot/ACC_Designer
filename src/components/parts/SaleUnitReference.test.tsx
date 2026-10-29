// @vitest-environment jsdom
import{it,expect,afterEach}from'vitest';import{render,screen,cleanup}from'@testing-library/react';import SaleUnitReference from'./SaleUnitReference';
afterEach(cleanup);
it('labels a subgroup price as belonging to the same product, not the whole unresolved family',()=>{
 render(<SaleUnitReference offer={{displayName:'パール',offerDraftId:'kiwa:1:1',retainedSourceDraftId:'kiwa:1:1',sourceUrl:'https://example.com/source',purchaseText:'1本 約38cm/約187ヶ(15インチ)',price:154,currency:'JPY',available:true,sourceFetchedAt:'2026-10-19',status:'minimum-sale-unit-reference',scope:'same-product-subgroup',approximateCount:187}}/>);
 expect(screen.getByText(/同一商品内の最小販売単位の参考価格: ¥154/)).toBeTruthy();expect(screen.getByText(/1本 約38cm\/約187ヶ\(15インチ\)/)).toBeTruthy();expect(screen.getByText(/確定入数・1個価格ではありません/)).toBeTruthy();
});
