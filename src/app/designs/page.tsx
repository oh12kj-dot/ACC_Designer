'use client';

import Link from 'next/link';
import WorkspaceBackup from '../../components/parts/WorkspaceBackup';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Design } from '../../types/aggregate';
import { getWorkspaceClient as getBrowserSupabase,isLocalWorkspace } from '../../lib/supabase/client';
import { SupabaseDesignRepository } from '../../services/designRepository';

export default function DesignsPage() {
  const [renaming,setRenaming]=useState<{design:Design;name:string}>();
  const [deleting,setDeleting]=useState<string>();
  const [notice,setNotice]=useState('');
  const [ready,setReady]=useState(false);
  const [session,setSession]=useState<Session|null>(null);
  const [designs,setDesigns]=useState<Design[]>([]);
  const [error,setError]=useState('');
  const [unavailable,setUnavailable]=useState(false);
  const [busy,setBusy]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [type,setType]=useState<Design['type']>('necklace');
  const [creating,setCreating]=useState(false);
  const [fromHome,setFromHome]=useState(false);

  useEffect(()=>{
    const selected=new URLSearchParams(window.location.search).get('type');
    if(selected==='necklace'||selected==='earrings'){
      setType(selected);setFromHome(true);setCreating(true);
    }
  },[]);

  const load=useCallback(async()=>{
    const list=await new SupabaseDesignRepository(getBrowserSupabase()).list();
    setDesigns(list);
  },[]);

  useEffect(()=>{
    let active=true;
    let cleanup=()=>{};
    try {
      const client=getBrowserSupabase();
      const {data}=client.auth.onAuthStateChange((_event,current)=>{
        if (!active) return;
        setSession(current); setReady(true);
        if (!current) setDesigns([]);
      });
      cleanup=()=>data.subscription.unsubscribe();
      void client.auth.getSession().then(({data,error})=>{
        if (!active) return;
        if (error) setError('ログイン状態を確認できませんでした。');
        setSession(data.session);setReady(true);
      });
    } catch {
      setUnavailable(true);setReady(true);
    }
    return ()=>{active=false;cleanup();};
  },[]);

  useEffect(()=>{
    if (!session) return;
    let active=true;
    void new SupabaseDesignRepository(getBrowserSupabase()).list().then(list=>{
      if (active) setDesigns(list);
    }).catch(()=>{if(active)setError('デザイン一覧を読み込めませんでした。');});
    return ()=>{active=false;};
  },[session]);

  async function signIn(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      const {error}=await getBrowserSupabase().auth.signInWithPassword({email,password});
      if (error) throw error;
      setPassword('');
    } catch {setError('ログインできませんでした。メールアドレスとパスワードを確認してください。');}
    finally {setBusy(false);}
  }

  async function create(event:React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      await new SupabaseDesignRepository(getBrowserSupabase()).create({name:name.trim(),type});
      setName('');setCreating(false);await load();
    } catch {setError('デザインを作成できませんでした。接続状態を確認し、再度お試しください。');}
    finally {setBusy(false);}
  }

  async function removeDesign(design:Design){
    if(busy||deleting||!isLocalWorkspace())return;
    if(!window.confirm(`「${design.name}」を削除しますか？\nデザインと配置内容が削除されます。この操作は元に戻せません。`))return;
    setDeleting(design.id);setError('');setNotice('');
    try{await new SupabaseDesignRepository(getBrowserSupabase()).remove(design.id,design.revision);setDesigns(list=>list.filter(d=>d.id!==design.id));setNotice(`「${design.name}」を削除しました。`);}
    catch(e){const message=e instanceof Error?e.message:'';if(message.includes('REVISION_CONFLICT')||message.includes('DESIGN_NOT_FOUND')){setError('デザインが更新または削除されています。一覧を更新しました。内容を確認してから、もう一度操作してください。');try{await load();}catch{setError('一覧を更新できませんでした。画面を再読み込みしてください。');}}else setError('デザインを削除できませんでした。保存内容を確認してから再度お試しください。');}
    finally{setDeleting(undefined);}
  }

  async function renameDesign(event:React.FormEvent){
    event.preventDefault();if(!renaming||busy||deleting)return;setBusy(true);setError('');setNotice('');
    try{const updated=await new SupabaseDesignRepository(getBrowserSupabase()).rename(renaming.design.id,renaming.name,renaming.design.revision);setDesigns(list=>list.map(d=>d.id===updated.id?updated:d));setRenaming(undefined);setNotice('デザイン名を変更しました。');}
    catch(e){if(e instanceof Error&&(e.message.includes('REVISION_CONFLICT')||e.message.includes('DESIGN_NOT_FOUND'))){setError('デザインが更新または削除されています。一覧を更新しました。内容を確認してから、もう一度名前を変更してください。');setRenaming(undefined);try{await load();}catch{setError('一覧を更新できませんでした。再読み込みしてください。');}}else setError('名前を変更できませんでした。入力内容と接続状態を確認してください。');}
    finally{setBusy(false);}
  }

  async function signOut() {
    setBusy(true);setError('');
    try { const {error}=await getBrowserSupabase().auth.signOut();if(error)throw error; }
    catch {setError('ログアウトできませんでした。');}
    finally {setBusy(false);}
  }

  const field='mt-2 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3';
  return <main className="studio-designs mx-auto max-w-4xl px-6 py-12">
    <Link href="/" className="inline-flex min-h-11 items-center text-stone-600">← ホーム</Link>
    <h1 className="mt-4 text-3xl font-semibold">デザイン一覧</h1><p className="mt-3">{isLocalWorkspace()?'保存先: この端末（ログイン不要）':'保存先: Supabase'}</p>

    {notice&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    {!ready ? <p className="mt-8" role="status">読み込み中…</p> : unavailable ? <p className="mt-8 rounded-xl border border-stone-200 bg-white p-6">クラウド接続の準備中です。接続設定が完了するとログインとデザイン作成を利用できます。</p> : !session ?
      <form onSubmit={signIn} className="mt-8 max-w-md rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl">ログイン</h2>
        <p className="mt-2 text-sm text-stone-600">登録済みのアカウントでログインしてください。</p>
        <label className="mt-5 block">メールアドレス<input className={field} type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="mt-4 block">パスワード<input className={field} type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button disabled={busy} className="mt-6 min-h-11 rounded-lg bg-stone-800 px-6 text-white disabled:opacity-50">{busy?'処理中…':'ログイン'}</button>
      </form> : <>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="break-all text-sm text-stone-600">{session.user.email}</p>{!isLocalWorkspace()&&<button onClick={signOut} disabled={busy} className="min-h-11 rounded-lg border border-stone-300 px-4 disabled:opacity-50">ログアウト</button>}</div>
        <button className="studio-primary mt-5" aria-expanded={creating} onClick={()=>setCreating(v=>!v)}>{creating?'作成を閉じる':'＋ 新しいデザイン'}</button>
        {creating&&(<form id="new-design" onSubmit={create} className="mt-8 scroll-mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl">新しいデザイン</h2>
          <p className="mt-2 text-sm text-stone-600">名前を付けて作成し、保存済みデザインの「編集する」からパーツを配置できます。</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label>名前<input className={field} autoFocus={fromHome} required maxLength={200} value={name} onChange={e=>setName(e.target.value)} /></label><label>種類<select className={field} value={type} onChange={e=>setType(e.target.value as Design['type'])}><option value="necklace">ネックレス</option><option value="earrings">ピアス</option></select></label></div>
          <button disabled={busy || !name.trim()} className="mt-6 min-h-11 rounded-lg bg-stone-800 px-6 text-white disabled:opacity-50">{busy?'処理中…':'作成'}</button>
        </form>)}
        <section className="mt-8"><h2 className="text-xl">保存済みデザイン</h2>{designs.length===0?<p className="mt-4 text-stone-600">まだデザインがありません。</p>:<ul className="mt-4 grid gap-4 sm:grid-cols-2">{designs.map(design=><li key={design.id} className="rounded-xl border border-stone-200 bg-white p-6">{renaming?.design.id===design.id?<form onSubmit={renameDesign} className="design-rename-form"><label className="block text-sm font-medium">デザイン名<input aria-label="新しいデザイン名" autoFocus required maxLength={200} className={field} value={renaming.name} onChange={e=>setRenaming({...renaming,name:e.target.value})} disabled={busy}/></label><div className="mt-3 flex gap-2"><button className="studio-primary" disabled={busy||!renaming.name.trim()}>名前を保存</button><button type="button" className="design-secondary" disabled={busy} onClick={()=>setRenaming(undefined)}>キャンセル</button></div></form>:<h3 className="text-lg break-words">{design.name}</h3>}<p className="mt-2 text-sm text-stone-600">{design.type==='necklace'?'ネックレス':'ピアス'} · 更新 {new Date(design.updatedAt).toLocaleDateString('ja-JP')}</p><div className="mt-4 flex flex-wrap gap-3"><Link href={`/designs/${design.id}?backend=${isLocalWorkspace()?'local':'supabase'}`} className="studio-primary">編集する</Link><button type="button" className="design-secondary" aria-label={`「${design.name}」の名前を変更`} disabled={busy||!!deleting||!!renaming} onClick={()=>setRenaming({design,name:design.name})}>名前を変更</button>{isLocalWorkspace()&&<button type="button" className="design-delete" aria-label={`「${design.name}」を削除`} disabled={busy||!!deleting||!!renaming} onClick={()=>void removeDesign(design)}>{deleting===design.id?'削除中…':'削除'}</button>}</div></li>)}</ul>}</section>
      </>}
    <details className="mt-10 rounded-xl border p-4"><summary className="min-h-11 cursor-pointer">バックアップ・復元</summary><WorkspaceBackup/></details>
  </main>;
}
