import { authorizeImport,importBody,importError } from '../../../../server/importRequest';
import { downloadResource } from '../../../../server/publicResource';

export const runtime='nodejs';
export async function POST(request:Request){
  try{await authorizeImport(request);const {sourceUrl}=await importBody(request);const result=await downloadResource(sourceUrl,'image');
    return new Response(new Uint8Array(result.body),{headers:{'Content-Type':result.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch(error){return importError(error);}
}
