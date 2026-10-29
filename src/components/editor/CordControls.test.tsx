// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import CordControls from './CordControls';
import type {CordProduct} from '../../domain/editor/cord';
afterEach(cleanup);
const product:CordProduct={sourceDraftId:'kiwa:1:2',title:'テグス / 2号(0.23mm)',sizeText:'2号(0.23mm)',sourceUrl:'https://kiwaseisakujo.jp/products/test',sourceFetchedAt:'2026-10-01',sourceSha256:'hash',diameterMm:.23,purchaseText:'50m',available:true};
it('selects an actual product and stores a real length with reversible cm conversion',()=>{
 const change=vi.fn(),guide=vi.fn();render(<CordControls products={[product]} loading={false} busy={false} onChange={change} onGuide={guide}/>);
 fireEvent.change(screen.getByLabelText('紐の商品・サイズ'),{target:{value:product.sourceDraftId}});
 expect(screen.getByText('商品の太さ：0.23mm')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('紐の長さの単位'),{target:{value:'cm'}});expect((screen.getByLabelText('紐の使用長さ') as HTMLInputElement).value).toBe('40');
 fireEvent.change(screen.getByLabelText('紐の使用長さ'),{target:{value:'45'}});fireEvent.click(screen.getByText('この紐・長さを使う'));
 expect(change).toHaveBeenCalledWith({...product,version:1,usedLengthMm:450});expect(guide).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('紐の使用長さ'),{target:{value:'0'}});expect(screen.getByText('この紐・長さを使う').hasAttribute('disabled')).toBe(true);
});
it('does not treat stale product diameter as currently confirmed',()=>{
 render(<CordControls value={{...product,version:1,usedLengthMm:450,sourceSha256:'stale'}} products={[product]} loading={false} busy={false} onChange={vi.fn()} onGuide={vi.fn()}/>);
 expect(screen.getByRole('status',{hidden:true}).textContent).toContain('未確認');
});
