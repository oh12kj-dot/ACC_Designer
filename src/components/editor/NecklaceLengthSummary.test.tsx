// @vitest-environment jsdom
import{it,expect,vi,afterEach}from'vitest';import{render,screen,fireEvent,cleanup}from'@testing-library/react';
import NecklaceLengthSummary from'./NecklaceLengthSummary';import{makeNecklaceSetup}from'../../domain/editor/necklaceSetup';
afterEach(cleanup);
it('shows the target separately from the guide and applies an explicit length change',()=>{
 const apply=vi.fn();render(<NecklaceLengthSummary setup={makeNecklaceSetup('45','finished-target')} guideCm={40} busy={false} geometryLocked={false} onApply={apply}/>);
 expect(screen.getByText('仕上がりの目標 45 cm')).toBeTruthy();expect(screen.getByText('配置ガイド 40 cm')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'長さを変更'}));fireEvent.change(screen.getByLabelText('長さを選ぶ'),{target:{value:'50'}});fireEvent.click(screen.getByRole('button',{name:'長さを適用'}));expect(apply).toHaveBeenCalledWith(makeNecklaceSetup('50','finished-target'),true);
});
it('never resizes a bound guide and cancellation does not write',()=>{
 const apply=vi.fn();render(<NecklaceLengthSummary guideCm={45} busy={false} geometryLocked={true} onApply={apply}/>);fireEvent.click(screen.getByRole('button',{name:'目標の長さを設定'}));expect(screen.queryByRole('checkbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'キャンセル'}));expect(apply).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'目標の長さを設定'}));fireEvent.click(screen.getByRole('button',{name:'長さを適用'}));expect(apply).toHaveBeenCalledWith(makeNecklaceSetup('45','finished-target'),false);
});
