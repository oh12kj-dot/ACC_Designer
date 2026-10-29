import { assertLocalCatalog,catalogToken } from '../../../../server/localCatalogAccess';
import { workspace } from '../../../../server/localWorkspace';
import {Readable} from 'node:stream';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){try{assertLocalCatalog(request);assertBinding();const db=await workspace();const params=new URL(request.url).searchParams,path=params.get('image'),backup=params.get('backup');if(path&&backup)throw Error('INVALID_RESOURCE');if(backup){const download=await db.backupDownload(backup);return new Response(Readable.toWeb(download.file.createReadStream()) as ReadableStream<Uint8Array>,{headers:{...headers,'Content-Type':'application/x-ndjson','Content-Length':String(download.size),'Content-Disposition':`attachment; filename="accessory-workspace-${backup}.accbackup.ndjson"`}});}if(path){const image=await db.image(path);return new Response(new Uint8Array(image.body),{headers:{...headers,'Content-Type':image.mime}});}return Response.json({kind:'local',owner:`local:${db.owner}`,workspaceId:db.owner,token:catalogToken()},{headers});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 assertLocalCatalog(request,true);assertBinding();const bytes=await boundedBody(request,129*1024*1024);const data=JSON.parse(new TextDecoder().decode(bytes));const db=await workspace();let result:unknown;
 if(data.action==='rpc')result=await db.rpc(data.name,data.args,data.key);
 else if(data.action==='select')result=await db.select(data.query);
 else if(data.action==='read-parts')result=await db.readParts(data.ids);
 else if(data.action==='cleanup-minimum-sale-units')result=await db.applyMinimumSaleUnits(data.manifestSha256);
 else if(data.action==='upload')result=await db.upload(data.path,Buffer.from(data.body,'base64'),data.mime);
 else if(data.action==='remove')result=await db.remove(data.paths);
 else if(data.action==='export')result=await db.exportPackage();
 else if(data.action==='export-set'){if(Object.keys(data).length!==1)throw Error('INVALID_OPERATION');const exported=await db.exportBackupSet(request.signal);result={...exported,url:'/api/local/workspace?backup='+exported.id};}
 else if(data.action==='import')result=await db.importPackage(data.package);
 else throw new Error('OPERATION_NOT_ALLOWED');
 return Response.json({data:result??null,error:null},{headers});
 }catch(e){return failure(e);}}
function failure(e:unknown){return Response.json({data:null,error:{code:'LOCAL_WORKSPACE_ERROR',message:e instanceof Error?e.message:'端末保存に失敗しました'}},{status:400,headers});}
async function boundedBody(request:Request,limit:number){const reader=request.body?.getReader();if(!reader)throw new Error('BODY_REQUIRED');const chunks:Uint8Array[]=[];let length=0;try{for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>limit){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(next.value);}return Buffer.concat(chunks);}finally{reader.releaseLock();}}

function assertBinding(){if(process.env.ACC_LOCAL_BIND!=='127.0.0.1')throw new Error('LOCAL_LISTENER_REQUIRED: npm run dev/startで起動してください');}
