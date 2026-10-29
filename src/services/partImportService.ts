import { getBrowserSupabase } from '../lib/supabase/client';
import { failedCandidate,type ImportedPartCandidate } from '../domain/part/importCandidate';

export async function fetchImportCandidate(sourceUrl:string):Promise<ImportedPartCandidate> {
  try{const {data}=await getBrowserSupabase().auth.getSession();if(!data.session)return failedCandidate(sourceUrl,'AUTH_REQUIRED');
    const response=await fetch('/api/parts/import',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({sourceUrl})});
    const result=await response.json();if(!response.ok)return failedCandidate(sourceUrl,result.errorCode??'FETCH_FAILED');return result as ImportedPartCandidate;
  }catch{return failedCandidate(sourceUrl,'CLOUD_UNAVAILABLE');}
}
export async function fetchImportImage(sourceUrl:string):Promise<File> {
  const {data}=await getBrowserSupabase().auth.getSession();if(!data.session)throw new Error('画像取得にはログインが必要です');
  const response=await fetch('/api/parts/import-image',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({sourceUrl})});
  if(!response.ok)throw new Error('画像を取得できませんでした。ローカル画像を選択してください。');
  const blob=await response.blob();return new File([blob],'imported-part',{type:blob.type});
}
