import Link from 'next/link';
export default function StudioNav(){return <header className="studio-nav"><div className="studio-nav-inner">
 <Link href="/" className="studio-brand" aria-label="アクセサリーデザイナー ホーム"><svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><path d="M8 10c0 25 24 25 24 0" stroke="currentColor" strokeWidth="1.4"/><circle cx="20" cy="29" r="5" fill="currentColor"/><path d="m20 8 2 4-2 4-2-4z" fill="#b4925a"/></svg><span>ACC <span className="brand-light">DESIGNER</span><small>アクセサリーをつくる、小さなアトリエ</small></span></Link>
 <nav aria-label="メインナビゲーション"><Link href="/designs">デザイン</Link><Link href="/parts">パーツ管理</Link><Link href="/parts/catalog" className="nav-library">パーツライブラリ <span aria-hidden="true">↗</span></Link></nav>
 </div></header>;}
