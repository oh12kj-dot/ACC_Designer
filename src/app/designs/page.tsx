'use client';

import Link from 'next/link';
import DesignThumbnail from '../../components/editor/DesignThumbnail';
import{DesignDuplicator,PendingDuplicationError}from '../../services/designDuplication';
import type{DesignAggregate}from '../../types/aggregate';
import {useRouter} from 'next/navigation';
import WorkspaceBackup from '../../components/parts/WorkspaceBackup';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Design } from '../../types/aggregate';
import { getWorkspaceClient as getBrowserSupabase,isLocalWorkspace } from '../../lib/supabase/client';
import { SupabaseDesignRepository,DesignCreationPendingError,type PendingDesignCreation } from '../../services/designRepository';
import {findDesigns,type DesignFilter,type DesignSort} from '../../domain/editor/designDiscovery';
import {lengthCaption,makeNecklaceSetup,necklaceSetup,type NecklaceSetup} from '../../domain/editor/necklaceSetup';
import NecklaceLengthFields from '../../components/editor/NecklaceLengthFields';

export default function DesignsPage() {
  const router=useRouter();
  const[pendingDuplicate,setPendingDuplicate]=useState<DesignAggregate>();
  const owner=useRef<string|undefined>(undefined);
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
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<DesignFilter>('all');
  const [sort,setSort]=useState<DesignSort>('updated');
  const [listLoading,setListLoading]=useState(true);
  const [listFailed,setListFailed]=useState(false);
  const [lengthCm,setLengthCm]=useState('45');
  const [lengthBasis,setLengthBasis]=useState<NecklaceSetup['lengthBasis']>('finished-target');
  const [pendingCreation,setPendingCreation]=useState<PendingDesignCreation>();

  useEffect(()=>{
    const selected=new URLSearchParams(window.location.search).get('type');
    if(selected==='necklace'||selected==='earrings'){
      setType(selected);setFromHome(true);setCreating(true);
    }
  },[]);
  useEffect(()=>{
    if(creating&&session){const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;document.getElementById('new-design')?.scrollIntoView?.({block:'start',behavior:reduced?'auto':'smooth'});}
  },[creating,session?.user.id]);

  const load=useCallback(async()=>{
    const requestedOwner=owner.current;
    setListLoading(true);setListFailed(false);
    try{const list=await new SupabaseDesignRepository(getBrowserSupabase()).list();if(owner.current===requestedOwner)setDesigns(list);}
    catch(error){if(owner.current===requestedOwner)setListFailed(true);throw error;}
    finally{if(owner.current===requestedOwner)setListLoading(false);}
  },[]);

  useEffect(()=>{
    let active=true;
    let authVersion=0;
    let cleanup=()=>{};
    const applySession=(current:Session|null)=>{
      const id=current?.user.id;
      if(owner.current!==id){setDesigns([]);setRenaming(undefined);setDeleting(undefined);setPendingCreation(undefined);setPendingDuplicate(undefined);setName('');setPassword('');setNotice('');setError('');setBusy(false);setQuery('');setFilter('all');setListFailed(false);setListLoading(!!current);}
      owner.current=id;setSession(current);setReady(true);
    };
    try {
      const client=getBrowserSupabase();
      const {data}=client.auth.onAuthStateChange((_event,current)=>{
        if (!active) return;
        authVersion++;applySession(current);
      });
      cleanup=()=>data.subscription.unsubscribe();
      const version=authVersion;
      void client.auth.getSession().then(({data,error})=>{
        if (!active||version!==authVersion) return;
        applySession(data.session);
        if (error) setError('ログイン状態を確認できませんでした。');
      }).catch(()=>{if(active&&version===authVersion){applySession(null);setError('保存先に接続できませんでした。画面を再読み込みしてください。');}});
    } catch {
      setUnavailable(true);setReady(true);
    }
    return ()=>{active=false;owner.current=undefined;cleanup();};
  },[]);

  useEffect(()=>{
    if (!session) return;
    setListLoading(true);setListFailed(false);
    let active=true;
    void new SupabaseDesignRepository(getBrowserSupabase()).list().then(list=>{
      if (active&&owner.current===session.user.id) setDesigns(list);
    }).catch(()=>{if(active&&owner.current===session.user.id){setListFailed(true);setError('デザイン一覧を読み込めませんでした。');}}).finally(()=>{if(active&&owner.current===session.user.id)setListLoading(false);});
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
    event.preventDefault();if(busy||pendingDuplicate)return;setBusy(true);setError('');
    const requestedOwner=owner.current;
    try {
      const repository=new SupabaseDesignRepository(getBrowserSupabase());
      const result=pendingCreation?await repository.resumeCreation(pendingCreation):await repository.create({name:name.trim(),type,setup:type==='necklace'?makeNecklaceSetup(lengthCm,lengthBasis):undefined});
      if(owner.current!==requestedOwner)return;
      setPendingCreation(undefined);setName('');setCreating(false);router.push(`/designs/${result.design.id}?backend=${isLocalWorkspace()?'local':'supabase'}`);
    } catch(error){if(owner.current!==requestedOwner)return;if(error instanceof DesignCreationPendingError){setPendingCreation(error.pending);setError('デザインは作成済みです。初期設定を確認できなかったため、同じデザインで再試行してください。');}else setError('デザインを作成できませんでした。入力内容と接続状態を確認してください。');}
    finally {if(owner.current===requestedOwner)setBusy(false);}
  }

  async function duplicateDesign(sourceId?:string){
    if(busy||deleting||renaming||pendingCreation)return;const requestedOwner=owner.current;setBusy(true);setError('');setNotice('');
    try{const duplicator=new DesignDuplicator(new SupabaseDesignRepository(getBrowserSupabase()),()=>owner.current===requestedOwner);const result=pendingDuplicate?await duplicator.resume(pendingDuplicate):await duplicator.start(sourceId!);if(owner.current!==requestedOwner)return;setPendingDuplicate(undefined);router.push(`/designs/${result.design.id}?backend=${isLocalWorkspace()?'local':'supabase'}`);}
    catch(error){if(owner.current!==requestedOwner)return;if(error instanceof PendingDuplicationError){setPendingDuplicate(error.snapshot);setError('複製先は作成済みです。保存の確認ができなかったため、同じ複製先で再試行してください。');}else setError('複製できませんでした。元のデザインは変更していません。接続と保存内容を確認してください。');}
    finally{if(owner.current===requestedOwner)setBusy(false);}
  }
  async function removeDesign(design:Design){
    if(busy||deleting||!isLocalWorkspace())return;
    if(!window.confirm(`「${design.name}」を削除しますか？\nデザインと配置内容が削除されます。この操作は元に戻せません。`))return;
    const requestedOwner=owner.current;setDeleting(design.id);setError('');setNotice('');
    try{await new SupabaseDesignRepository(getBrowserSupabase()).remove(design.id,design.revision);if(owner.current!==requestedOwner)return;setDesigns(list=>list.filter(d=>d.id!==design.id));setNotice(`「${design.name}」を削除しました。`);}
    catch(e){if(owner.current!==requestedOwner)return;const message=e instanceof Error?e.message:'';if(message.includes('REVISION_CONFLICT')||message.includes('DESIGN_NOT_FOUND')){setError('デザインが更新または削除されています。一覧を更新しました。内容を確認してから、もう一度操作してください。');try{await load();}catch{if(owner.current===requestedOwner)setError('一覧を更新できませんでした。画面を再読み込みしてください。');}}else setError('デザインを削除できませんでした。保存内容を確認してから再度お試しください。');}
    finally{if(owner.current===requestedOwner)setDeleting(undefined);}
  }

  async function renameDesign(event:React.FormEvent){
    event.preventDefault();if(!renaming||busy||deleting)return;setBusy(true);setError('');setNotice('');
    const requestedOwner=owner.current;
    try{const updated=await new SupabaseDesignRepository(getBrowserSupabase()).rename(renaming.design.id,renaming.name,renaming.design.revision);if(owner.current!==requestedOwner)return;setDesigns(list=>list.map(d=>d.id===updated.id?updated:d));setRenaming(undefined);setNotice('デザイン名を変更しました。');}
    catch(e){if(owner.current!==requestedOwner)return;if(e instanceof Error&&(e.message.includes('REVISION_CONFLICT')||e.message.includes('DESIGN_NOT_FOUND'))){setError('デザインが更新または削除されています。一覧を更新しました。内容を確認してから、もう一度名前を変更してください。');setRenaming(undefined);try{await load();}catch{if(owner.current===requestedOwner)setError('一覧を更新できませんでした。再読み込みしてください。');}}else setError('名前を変更できませんでした。入力内容と接続状態を確認してください。');}
    finally{if(owner.current===requestedOwner)setBusy(false);}
  }

  async function signOut() {
    setBusy(true);setError('');
    try { const {error}=await getBrowserSupabase().auth.signOut();if(error)throw error; }
    catch {setError('ログアウトできませんでした。');}
    finally {setBusy(false);}
  }

  const field='mt-2 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3';
  const visibleDesigns=findDesigns(designs,query,filter,sort);
  let lengthError='';if(type==='necklace')try{makeNecklaceSetup(lengthCm,lengthBasis);}catch(error){lengthError=(error as Error).message;}
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
        <button className="studio-primary mt-5" aria-expanded={creating} disabled={busy||!!pendingCreation} onClick={()=>setCreating(v=>!v)}>{creating?'作成を閉じる':'＋ 新しいデザイン'}</button>
        {creating&&(<form id="new-design" onSubmit={create} className="mt-8 scroll-mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl">新しいデザイン</h2>
          <p className="mt-2 text-sm text-stone-600">種類と長さを選び、名前を付けたら編集をはじめられます。長さは後から変更できます。</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label>名前<input className={field} autoFocus={fromHome} disabled={busy||!!pendingCreation} placeholder="例：春のパールネックレス" required maxLength={200} value={name} onChange={e=>setName(e.target.value)} /></label><label>種類<select className={field} disabled={busy||!!pendingCreation} value={type} onChange={e=>setType(e.target.value as Design['type'])}><option value="necklace">ネックレス</option><option value="earrings">ピアス</option></select></label></div>
          {type==='necklace'&&<NecklaceLengthFields cm={lengthCm} basis={lengthBasis} onLength={setLengthCm} onBasis={setLengthBasis} disabled={busy||!!pendingCreation}/>}
          {lengthError&&<p role="alert" className="mt-3 text-red-800">{lengthError}</p>}
          <div className="creation-actions"><button disabled={busy||!!pendingDuplicate||!name.trim()||!!lengthError} className="studio-primary">{busy?'準備しています…':pendingCreation?'同じデザインで再試行':'作成して編集をはじめる'}</button>
          {pendingCreation&&<><Link className="design-secondary" href={`/designs/${pendingCreation.id}?backend=${isLocalWorkspace()?'local':'supabase'}`}>作成済みのデザインを開く</Link><button type="button" disabled={busy} onClick={()=>{setPendingCreation(undefined);setCreating(false);void load().catch(()=>setError('一覧を読み込めませんでした。'));}}>一覧で確認する</button></>}</div>
        </form>)}
        {pendingDuplicate&&<section className="duplication-pending" aria-label="複製の保存確認"><p>「{pendingDuplicate.design.name}」の保存を確認してください。再試行で別のコピーは作成しません。</p><button className="studio-primary" disabled={busy} onClick={()=>void duplicateDesign()}>同じ複製先で再試行</button><Link className="design-secondary" href={`/designs/${pendingDuplicate.design.id}?backend=${isLocalWorkspace()?'local':'supabase'}`}>複製先を開いて確認</Link><button className="design-secondary" disabled={busy} onClick={()=>{setPendingDuplicate(undefined);void load().catch(()=>setError('一覧を読み込めませんでした。'));}}>一覧で確認する</button></section>}<section className="mt-8" aria-label="保存済みデザイン"><div className="design-list-heading"><h2 className="text-xl">保存済みデザイン</h2><span>{visibleDesigns.length} / {designs.length} 件</span></div>
        <div className="design-discovery"><label>デザインを検索<input type="search" placeholder="名前で探す" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>種類で絞り込み<select value={filter} onChange={e=>setFilter(e.target.value as DesignFilter)}><option value="all">すべて</option><option value="necklace">ネックレス</option><option value="earrings">ピアス</option></select></label><label>並び順<select value={sort} onChange={e=>setSort(e.target.value as DesignSort)}><option value="updated">更新が新しい順</option><option value="name">名前順</option></select></label></div>
        {listLoading&&<p className="mt-4" role="status">{designs.length?'一覧を更新しています…':'デザインを読み込んでいます…'}</p>}
        {listFailed&&<button className="design-secondary mt-3" disabled={listLoading} onClick={()=>{setError('');void load().catch(()=>setError('デザイン一覧を読み込めませんでした。'));}}>一覧を再読み込み</button>}
        {designs.length===0?(listLoading||listFailed?null:<div className="design-empty"><h3>最初のデザインを作りましょう</h3><p>種類と長さを選ぶところからはじめられます。</p><button className="studio-primary" onClick={()=>setCreating(true)}>最初のデザインを作る</button></div>):visibleDesigns.length===0?<div className="design-empty"><h3>条件に合うデザインがありません</h3><button className="design-secondary" onClick={()=>{setQuery('');setFilter('all');}}>検索条件をクリア</button></div>:<ul className="mt-4 grid gap-4 sm:grid-cols-2">{visibleDesigns.map(design=><li key={design.id} className="design-project-card rounded-xl border border-stone-200 bg-white p-6"><DesignThumbnail key={session.user.id+design.id} ownerId={session.user.id} design={design}/>{renaming?.design.id===design.id?<form onSubmit={renameDesign} className="design-rename-form"><label className="block text-sm font-medium">デザイン名<input aria-label="新しいデザイン名" autoFocus required maxLength={200} className={field} value={renaming.name} onChange={e=>setRenaming({...renaming,name:e.target.value})} disabled={busy}/></label><div className="mt-3 flex gap-2"><button className="studio-primary" disabled={busy||!renaming.name.trim()}>名前を保存</button><button type="button" className="design-secondary" disabled={busy} onClick={()=>setRenaming(undefined)}>キャンセル</button></div></form>:<h3 className="text-lg break-words">{design.name}</h3>}<p className="mt-2 text-sm text-stone-600">{design.type==='necklace'?'ネックレス':'ピアス'} · 更新 {Number.isFinite(Date.parse(design.updatedAt))?new Date(design.updatedAt).toLocaleDateString('ja-JP'):'日時未確認'}</p>{necklaceSetup(design)&&<p className="design-length-badge">{lengthCaption(necklaceSetup(design)!)}</p>}<div className="mt-4 flex flex-wrap gap-3"><Link href={`/designs/${design.id}?backend=${isLocalWorkspace()?'local':'supabase'}`} className="studio-primary">編集する</Link><button type="button" className="design-secondary" aria-label={`「${design.name}」を複製`} disabled={busy||!!deleting||!!renaming||!!pendingCreation||!!pendingDuplicate} onClick={()=>void duplicateDesign(design.id)}>複製して編集</button><button type="button" className="design-secondary" aria-label={`「${design.name}」の名前を変更`} disabled={busy||!!deleting||!!renaming} onClick={()=>setRenaming({design,name:design.name})}>名前を変更</button>{isLocalWorkspace()&&<button type="button" className="design-delete" aria-label={`「${design.name}」を削除`} disabled={busy||!!deleting||!!renaming} onClick={()=>void removeDesign(design)}>{deleting===design.id?'削除中…':'削除'}</button>}</div></li>)}</ul>}</section>
      </>}
    <details className="mt-10 rounded-xl border p-4"><summary className="min-h-11 cursor-pointer">バックアップ・復元</summary><WorkspaceBackup/></details>
  </main>;
}
