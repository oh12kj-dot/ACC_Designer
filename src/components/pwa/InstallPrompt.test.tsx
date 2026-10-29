// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InstallPrompt from './InstallPrompt';

beforeEach(()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
function offer(prompt = vi.fn().mockResolvedValue(undefined), userChoice = Promise.resolve({ outcome: 'dismissed' })) {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice });
  act(() => { window.dispatchEvent(event); });
  return event;
}
it('reports rejection and never reuses a consumed install event', async () => {
  render(<InstallPrompt />);
  const event = offer(vi.fn().mockRejectedValue(new Error('failed')));
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('完了できません'));
  expect(screen.queryByRole('button')).toBeNull();
  expect(event.prompt).toHaveBeenCalledTimes(1);
  offer();
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('キャンセル'));
});
it('removes an outstanding offer when installed from the browser menu', () => {
  render(<InstallPrompt />); offer();
  act(() => { window.dispatchEvent(new Event('appinstalled')); });
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('追加しました');
});
it('preserves confirmed installation against an older pending dialog result', async () => {
  let finish!: (value: { outcome: string }) => void;
  const choice = new Promise<{ outcome: string }>(resolve => { finish = resolve; });
  render(<InstallPrompt />); const event = offer(undefined, choice);
  fireEvent.click(screen.getByRole('button'));
  act(() => { window.dispatchEvent(new Event('appinstalled')); });
  await act(async () => { finish({ outcome: 'dismissed' }); await choice; });
  expect(screen.getByRole('status').textContent).toContain('追加しました');
  expect(event.prompt).toHaveBeenCalledTimes(1);
});
it('retains a newer browser offer after an older dialog completes', async () => {
  let finish!: (value: { outcome: string }) => void;
  const choice = new Promise<{ outcome: string }>(resolve => { finish = resolve; });
  render(<InstallPrompt />); offer(undefined, choice);
  fireEvent.click(screen.getByRole('button'));
  const next = offer();
  expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  await act(async () => { finish({ outcome: 'dismissed' }); await choice; });
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(next.prompt).toHaveBeenCalledTimes(1));
});
it('provides a Safari install guide when no browser prompt is available',()=>{
  vi.spyOn(navigator,'userAgent','get').mockReturnValue('iPhone');
  render(<InstallPrompt/>);
  expect(screen.getByText(/iPhone・iPadではSafari/)).toBeTruthy();
  expect(screen.getByRole('link',{name:'Appleの操作案内'}).getAttribute('href')).toContain('support.apple.com');
  expect(screen.queryByRole('button')).toBeNull();
});
it('does not invite installation in an already standalone app',()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
  render(<InstallPrompt/>);offer();
  expect(screen.queryByText('端末への追加方法')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
});
