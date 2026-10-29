import { readGalleryProgress,readOcrProgress } from '../../../server/galleryProgress';
import { correspondences } from '../../../server/partCorrespondence';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assertLocalCatalog } from '../../../server/localCatalogAccess';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const headers={'Cache-Control':'no-store'};try{assertLocalCatalog(request);const summary=JSON.parse(await readFile(join(process.cwd(),'.local','calibration','summary.json'),'utf8'));const registry=await readFile(join(process.cwd(),'.local','parts','parts.json'));if(createHash('sha256').update(registry).digest('hex')!==summary.registrySha256)throw new Error('CALIBRATION_AUDIT_STALE');const audit=JSON.parse(await readFile(join(process.cwd(),'.local','calibration','audit.json'),'utf8'));const ids=new URL(request.url).searchParams.getAll('id');if(ids.length>48)throw new Error('TOO_MANY_IDS');const entries=audit.entries??audit.parts??[];const mapping=await correspondences(ids);return Response.json({summary,mappingSummary:mapping.summary,gallerySummary:await readGalleryProgress(),ocrSummary:await readOcrProgress(),entries:entries.filter((p:{id:string})=>ids.includes(p.id))},{headers});}catch(e){return Response.json({error:e instanceof Error?e.message:'校正状況を読み込めません'},{status:400,headers});}}
