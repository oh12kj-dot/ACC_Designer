// @vitest-environment jsdom
import{useState}from'react';import{afterEach,expect,it,vi}from'vitest';
import{cleanup,fireEvent,render,screen}from'@testing-library/react';
import LayoutGuideControls from'./LayoutGuideControls';import type{LayoutGuide}from'../../domain/editor/layoutGuide';
const initial:LayoutGuide={enabled:true,snap:true,rotate:true,offset:0,shape:'u',width:180,drop:120,center:{x:150,y:350/3}};
function Controls({scope}:{scope:string}){const[guide,setGuide]=useState(initial);return <LayoutGuideControls guide={guide} onChange={setGuide} onCenter={()=>{}} onFit={()=>{}} storageKey={scope}/>;}
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
it('remembers length/dimensions per design and owner, derives length after width edits, and rejects invalid length',()=>{
 let view=render(<Controls scope="a:design1"/>);fireEvent.change(screen.getByLabelText('紐の長さ（ガイド沿い・mm）'),{target:{value:'400'}});fireEvent.click(screen.getByRole('button',{name:'紐の長さを適用'}));expect(screen.getByLabelText('ガイドに沿った実寸長さ').textContent).toContain('400.0 mm');
 const width=(screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value;view.unmount();view=render(<Controls scope="a:design1"/>);expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe(width);expect((screen.getByLabelText('紐の長さ（ガイド沿い・mm）')as HTMLInputElement).value).toBe('400');
 fireEvent.change(screen.getByLabelText('紐の長さ（ガイド沿い・mm）'),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'紐の長さを適用'}));expect(screen.getByRole('alert')).toBeTruthy();expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe(width);
 fireEvent.change(screen.getByLabelText('ガイドの幅（mm）'),{target:{value:'100'}});expect(screen.getByLabelText('ガイドに沿った実寸長さ').textContent).not.toContain('400.0 mm');view.unmount();
 view=render(<Controls scope="a:design2"/>);expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe('180');view.unmount();view=render(<Controls scope="b:design1"/>);expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe('180');
});
it('ignores corrupt storage and allows editing when storage is unavailable',()=>{
 localStorage.setItem('bad','{"version":1,"guide":{"shape":"x"}}');render(<Controls scope="bad"/>);expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe('180');vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('unavailable');});fireEvent.change(screen.getByLabelText('ガイドの幅（mm）'),{target:{value:'200'}});expect(screen.getByText('このブラウザーではガイド設定を記憶できません。')).toBeTruthy();expect((screen.getByLabelText('ガイドの幅（mm）')as HTMLInputElement).value).toBe('200');
});
