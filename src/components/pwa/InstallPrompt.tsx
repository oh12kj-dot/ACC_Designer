'use client';
import { useEffect, useRef, useState } from 'react';
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export default function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const alreadyInstalled = displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(alreadyInstalled);
    setIsAppleMobile(/iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const displayChanged = () => setStandalone(displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    displayMode.addEventListener('change', displayChanged);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        if (mounted.current) setMessage('端末へのアプリ準備を完了できませんでした');
      });
    }
    const install = (e: Event) => {
      e.preventDefault(); generation.current++;
      if (displayMode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true) return;
      setEvent(e as InstallEvent); setMessage('');
    };
    const installed = () => {
      generation.current++; setEvent(undefined);
      setStandalone(true);
      setMessage('アプリを端末に追加しました');
    };
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installed);
    return () => {
      mounted.current = false; generation.current++;
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('appinstalled', installed);
      displayMode.removeEventListener('change', displayChanged);
    };
  }, []);

  async function addToDevice() {
    if (!event || inFlight.current) return;
    const currentGeneration = generation.current;
    inFlight.current = true; setBusy(true); setMessage('');
    // Each browser event is consumed once, even if the dialog fails or is dismissed.
    setEvent(undefined);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (mounted.current && generation.current === currentGeneration && choice.outcome === 'dismissed') {
        setMessage('端末への追加をキャンセルしました');
      }
    } catch {
      if (mounted.current && generation.current === currentGeneration) {
        setMessage('端末への追加を完了できませんでした。ブラウザーのメニューから追加をお試しください。');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <>
    {event && !standalone && <button disabled={busy} className="mx-6 my-3 min-h-11 rounded-lg border px-4 disabled:opacity-50" onClick={() => { void addToDevice(); }}>アプリを端末に追加</button>}
    {!event && !standalone && <details className="mx-6 my-3 max-w-xl rounded-lg border border-stone-200 bg-white px-4 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center">端末への追加方法</summary>
      {isAppleMobile ? <p className="pb-3 leading-7">iPhone・iPadではSafariで開き、共有メニューの「ホーム画面に追加」を選びます。「ウェブアプリとして開く」が表示される場合はオンにして追加してください。<a href="https://support.apple.com/ja-jp/guide/iphone/iphea86e5236/ios" target="_blank" rel="noreferrer" className="ml-2 underline">Appleの操作案内</a></p> : <p className="pb-3 leading-7">ブラウザーのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。追加メニューの表示はブラウザーによって異なります。</p>}
      <p className="pb-3 leading-7 text-stone-600">端末へ追加しても、デザインの保存・読込にはネットワーク接続が必要です。開いている編集の未保存データは端末内の復旧候補から確認できます。</p>
    </details>}
    {message && <p role="status" className="mx-6 text-sm">{message}</p>}
  </>;
}
