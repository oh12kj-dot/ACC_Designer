// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import WorkspaceBackup from './WorkspaceBackup';
vi.mock('../../lib/supabase/client',()=>({isLocalWorkspace:()=>true}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
const id='a0000000-0000-4000-8000-000000000001';
it('uses a native download link without fetching or parsing the large archive in browser memory',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce({json:async()=>({token:'fixture-token'})}).mockResolvedValueOnce({ok:true,json:async()=>({data:{id,url:'/api/local/workspace?backup='+id,bytes:200000000}})});vi.stubGlobal('fetch',fetch);const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 render(<WorkspaceBackup/>);fireEvent.click(screen.getByRole('button',{name:'バックアップを書き出す'}));await waitFor(()=>expect(click).toHaveBeenCalledOnce());expect(fetch).toHaveBeenCalledTimes(2);expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({action:'export-set'});expect((click.mock.instances[0] as HTMLAnchorElement).getAttribute('href')).toBe('/api/local/workspace?backup='+id);expect(screen.getByRole('status').textContent).toContain('ダウンロードを確認');
});
it('shows preparation failure and refuses a substituted download URL',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({json:async()=>({token:'fixture-token'})}).mockResolvedValueOnce({ok:true,json:async()=>({data:{id,url:'https://example.com/foreign'}})}));const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});render(<WorkspaceBackup/>);const button=screen.getByRole('button',{name:'バックアップを書き出す'});fireEvent.click(button);await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('保存先を確認できません'));expect(click).not.toHaveBeenCalled();expect(button.hasAttribute('disabled')).toBe(false);
});
