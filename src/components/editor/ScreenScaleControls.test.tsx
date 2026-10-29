// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,act} from '@testing-library/react';
import ScreenScaleControls from './ScreenScaleControls';
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
it('restores the ruler value and matching calibration, but never revives invalidated calibration on reload',()=>{
 let width=900;const canvas=document.createElement('canvas');canvas.width=900;vi.spyOn(canvas,'getBoundingClientRect').mockImplementation(()=>({width}as DOMRect));const props={canvasRef:{current:canvas},zoom:4,onZoom:vi.fn(),storageKey:'screen:a'};
 let view=render(<ScreenScaleControls {...props}/>);fireEvent.change(screen.getByLabelText('定規で測った線の長さ（mm）'),{target:{value:'50'}});fireEvent.click(screen.getByRole('button',{name:'計測値を適用して100%表示'}));view.unmount();view=render(<ScreenScaleControls {...props}/>);expect((screen.getByLabelText('定規で測った線の長さ（mm）')as HTMLInputElement).value).toBe('50');expect(screen.getByText('実寸100%（定規で調整済み）')).toBeTruthy();
 act(()=>{width=600;window.dispatchEvent(new Event('resize'));});view.unmount();width=900;view=render(<ScreenScaleControls {...props}/>);expect(screen.getByText(/画面条件が変わりました/)).toBeTruthy();expect((screen.getByLabelText('定規で測った線の長さ（mm）')as HTMLInputElement).value).toBe('50');expect((screen.getByRole('button',{name:'実寸100%に戻す'})as HTMLButtonElement).disabled).toBe(true);view.unmount();view=render(<ScreenScaleControls {...props} storageKey="screen:b"/>);expect((screen.getByLabelText('定規で測った線の長さ（mm）')as HTMLInputElement).value).toBe('');
});
it('never labels default zoom as actual size, validates measurement and invalidates calibration permanently on resize',()=>{
 let width=900;const canvas=document.createElement('canvas');canvas.width=900;vi.spyOn(canvas,'getBoundingClientRect').mockImplementation(()=>({width} as DOMRect));const ref={current:canvas},onZoom=vi.fn();const props={canvasRef:ref,zoom:3,onZoom};const view=render(<ScreenScaleControls {...props}/>);
 expect(screen.getByText(/実寸表示は未調整/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'計測値を適用して100%表示'}));expect(onZoom).not.toHaveBeenCalled();expect(screen.getByRole('alert')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('定規で測った線の長さ（mm）'),{target:{value:'50'}});fireEvent.click(screen.getByRole('button',{name:'計測値を適用して100%表示'}));expect(onZoom).toHaveBeenLastCalledWith(4);view.rerender(<ScreenScaleControls {...props} zoom={4}/>);expect(screen.getByText('実寸100%（定規で調整済み）')).toBeTruthy();
 view.rerender(<ScreenScaleControls {...props} zoom={2}/>);expect(screen.getByText('実寸に対して 50.0%')).toBeTruthy();
 act(()=>{width=600;window.dispatchEvent(new Event('resize'));});expect(screen.getByText(/画面条件が変わりました/)).toBeTruthy();act(()=>{width=900;window.dispatchEvent(new Event('resize'));});expect(screen.getByRole('button',{name:'実寸100%に戻す'}).hasAttribute('disabled')).toBe(true);
});

it('provides visible plus/minus and actual-size controls without needing the advanced editor section',()=>{
 const onZoom=vi.fn(),canvas=document.createElement('canvas');canvas.width=900;vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({width:900}as DOMRect);
 render(<ScreenScaleControls canvasRef={{current:canvas}} zoom={3} onZoom={onZoom}/>);
 fireEvent.click(screen.getByRole('button',{name:'拡大'}));expect(onZoom).toHaveBeenLastCalledWith(3.75);fireEvent.click(screen.getByRole('button',{name:'縮小'}));expect(onZoom).toHaveBeenLastCalledWith(2.4);
 expect(screen.getByRole('button',{name:'実寸100%に戻す'}).closest('details')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'実寸を調整'}));expect(screen.getByLabelText('定規で測った線の長さ（mm）').closest('details')?.open).toBe(true);
});

it('restores actual-size default and uses actual100percent as displayed1x without resetting manual zoom',()=>{
 const canvas=document.createElement('canvas');canvas.width=900;vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({width:900}as DOMRect);const props={canvasRef:{current:canvas},zoom:4,onZoom:vi.fn(),storageKey:'actual-default'};
 let view=render(<ScreenScaleControls {...props}/>);expect(screen.getByLabelText('編集倍率').textContent).toContain('未調整');fireEvent.change(screen.getByLabelText('定規で測った線の長さ（mm）'),{target:{value:'50'}});fireEvent.click(screen.getByRole('button',{name:'計測値を適用して100%表示'}));expect(screen.getByLabelText('編集倍率').getAttribute('data-display-scale')).toBe('1');view.unmount();props.onZoom.mockClear();
 view=render(<ScreenScaleControls {...props} zoom={3}/>);expect(props.onZoom).toHaveBeenCalledTimes(1);expect(props.onZoom).toHaveBeenLastCalledWith(4);view.rerender(<ScreenScaleControls {...props} zoom={4}/>);expect(screen.getByLabelText('編集倍率').textContent).toContain('1倍');view.rerender(<ScreenScaleControls {...props} zoom={5}/>);expect(screen.getByLabelText('編集倍率').textContent).toContain('1.25倍');expect(props.onZoom).toHaveBeenCalledTimes(1);view.rerender(<ScreenScaleControls {...props} zoom={2}/>);expect(screen.getByLabelText('編集倍率').textContent).toContain('0.5倍');
});
