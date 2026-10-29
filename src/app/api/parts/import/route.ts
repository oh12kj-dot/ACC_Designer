import { authorizeImport,importBody,importError } from '../../../../server/importRequest';
import { downloadResource } from '../../../../server/publicResource';
import { parseKiwaHtml } from '../../../../server/kiwaParser';

export const runtime='nodejs';
export async function POST(request:Request){
  try{await authorizeImport(request);const {sourceUrl}=await importBody(request);const result=await downloadResource(sourceUrl,'html');
    return Response.json(parseKiwaHtml(result.body.toString('utf8'),result.url),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return importError(error);}
}
