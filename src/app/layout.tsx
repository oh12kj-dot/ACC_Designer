import type { Metadata, Viewport } from 'next';
import './globals.css';
import StudioNav from '../components/StudioNav';
import InstallPrompt from '../components/pwa/InstallPrompt';

export const metadata: Metadata = {
  title: 'アクセサリーデザイナー',
  description: '実寸と実在パーツで組み立てるアクセサリーデザイン',
  appleWebApp: {capable:true,title:'アクセサリー',statusBarStyle:'default'},
  icons: {apple:'/icons/icon-192.png'},
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#f6f5f0' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><StudioNav/>{children}<InstallPrompt/></body></html>;
}
