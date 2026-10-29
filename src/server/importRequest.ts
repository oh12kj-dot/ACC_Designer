import { createClient } from '@supabase/supabase-js';
import { ResourceError } from './publicResource';

export async function authorizeImport(request:Request):Promise<void> {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new ResourceError('CLOUD_NOT_CONFIGURED');
  const authorization=request.headers.get('authorization');
  if(!authorization?.startsWith('Bearer ')||authorization.length>8192)throw new ResourceError('AUTH_REQUIRED');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser(authorization.slice(7));
  if(error||!data.user)throw new ResourceError('AUTH_REQUIRED');
}
export async function importBody(request:Request):Promise<{sourceUrl:string}> {
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ResourceError('INVALID_REQUEST');
  const reader=request.body?.getReader();if(!reader)throw new ResourceError('INVALID_REQUEST');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new ResourceError('INVALID_REQUEST');}chunks.push(value);}}finally{reader.releaseLock();}
  let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ResourceError('INVALID_REQUEST');}
  const url=value&&typeof value==='object'?(value as Record<string,unknown>).sourceUrl:undefined;
  if(typeof url!=='string'||url.length>2048)throw new ResourceError('INVALID_REQUEST');return{sourceUrl:url};
}
export function importError(error:unknown):Response {
  const code=error instanceof ResourceError?error.code:'FETCH_FAILED';
  const status=code==='CLOUD_NOT_CONFIGURED'?503:code==='AUTH_REQUIRED'?401:400;
  return Response.json({errorCode:code},{status,headers:{'Cache-Control':'no-store'}});
}
