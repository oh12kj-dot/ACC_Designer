import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createLocalWorkspaceClient } from '../../services/localWorkspaceClient';

let client: SupabaseClient | undefined;
let localClient:SupabaseClient|undefined;
export function isLocalWorkspace(){return !process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;}
export function getWorkspaceClient():SupabaseClient{
 if(typeof window==='undefined')throw new Error('Workspace clientはブラウザ専用です');
 const expected=new URLSearchParams(window.location.search).get('backend');if(expected&&expected!==(isLocalWorkspace()?'local':'supabase'))throw new Error('保存先が異なります。接続設定を確認してください');
 return isLocalWorkspace()?(localClient??=createLocalWorkspaceClient()):getBrowserSupabase();
}
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') throw new Error('ブラウザ用Supabase clientはサーバーでは使用できません');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase接続情報が設定されていません');
  client ??= createClient(url,key);
  return client;
}
