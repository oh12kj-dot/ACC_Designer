import { assertLocalCatalog } from '../../../../server/localCatalogAccess';
import { catalogImage } from '../../../../server/catalogStore';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{assertLocalCatalog(request);const q=new URL(request.url).searchParams;const {body,contentType}=await catalogImage(q.get('id')??'',Number(q.get('index'))||0,q.get('variant')??undefined);return new Response(new Uint8Array(body),{headers:{'Content-Type':contentType,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return new Response('画像を取得できません',{status:404,headers:{'Cache-Control':'no-store'}});}}
