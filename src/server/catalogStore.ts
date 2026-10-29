import { mkdir,readFile,writeFile,rename,open,unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { CatalogState } from '../types/catalog';
import { downloadResource,ResourceError } from './publicResource';
import { parseCatalogPage,robotsAllows } from './catalogParser';
const root=join(process.cwd(),'.local','catalog'),file=join(root,'catalog.json');
const empty=():CatalogState=>({version:1,products:[],nextPage:1,pages:0,status:'idle',nextRequestAt:0});
export async function readCatalog():Promise<CatalogState>{try{const data=JSON.parse(await readFile(file,'utf8')) as CatalogState;if(data.version!==1||!Array.isArray(data.products))throw new Error('カタログ形式が不正です');return data;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return empty();throw e;}}
async function save(state:CatalogState){await mkdir(root,{recursive:true});const temp=join(root,`catalog-${crypto.randomUUID()}.tmp`);await writeFile(temp,JSON.stringify(state));await rename(temp,file);}
const shared=globalThis as typeof globalThis&{catalogQueue?:Promise<unknown>};
export async function catalogCommand(command:'step'|'pause'|'refresh'|'start'|'halt',failure?:{error:unknown;url:string;phase:string}){
 const previous=shared.catalogQueue??Promise.resolve();const next=previous.catch(()=>{}).then(async()=>{
  await mkdir(root,{recursive:true});const lock=await writerLock();try{const state=await readCatalog();if(command==='halt'&&failure){applyFailure(state,failure.error,failure.url,failure.phase);await save(state);return state;}if(command==='start'){if(state.status!=='complete'){state.status='running';state.startedAt??=new Date().toISOString();}await save(state);return state;}if(command==='pause'){state.status='paused';await save(state);return state;}if(command==='refresh'){state.nextPage=1;state.pages=0;state.seenIds=[];state.status='paused';state.message='既存の商品を保持し、先頭から再取得します';await save(state);return state;}if(['complete','paused','error'].includes(state.status)||Date.now()<state.nextRequestAt)return state;
  const url=`https://kiwaseisakujo.jp/collections/all-item/products.json?limit=250&page=${state.nextPage}`;
  try{
   const robots=await catalogDownload('https://kiwaseisakujo.jp/robots.txt','text');if(!/user-agent\s*:/i.test(robots.body.toString('utf8')))throw new Error('取得ルールを解釈できません');if(!robotsAllows(robots.body.toString('utf8'),new URL(url).pathname+new URL(url).search))throw new Error('サイトの取得ルールにより停止しました');
   if(state.nextPage===1){const policy=await catalogDownload('https://kiwaseisakujo.jp/agents.md','text');if(!policy.body.toString('utf8').includes('/collections/{handle}/products.json'))throw new Error('公開カタログの取得案内を確認できません');const storefront=await catalogDownload('https://kiwaseisakujo.jp/collections/all-item','html');const currency=storefront.body.toString('utf8').match(/Shopify\.currency\s*=\s*\{\s*"active":"([A-Z]{3})"/);state.currency=currency?.[1];state.currencySource=currency?'https://kiwaseisakujo.jp/collections/all-item':undefined;await mkdir(join(root,'evidence'),{recursive:true});await writeFile(join(root,'evidence','robots.txt'),robots.body);await writeFile(join(root,'evidence','agents.md'),policy.body);await writeFile(join(root,'evidence','currency.txt'),currency?.[0]??'unknown');}
   const response=await catalogDownload(url,'json'),page=parseCatalogPage(JSON.parse(response.body.toString('utf8')));
   const existing=new Map(state.products.map(p=>[p.id,p]));const seen=new Set(state.seenIds??[]),novel=page.filter(p=>!seen.has(p.id)).length;
   if(page.length===250&&state.nextPage>1&&novel===0)throw new Error('ページが進んでいません。全件取得とせず停止しました');
   page.forEach(p=>{existing.set(p.id,p);seen.add(p.id);});state.seenIds=[...seen];const {createHash}=await import('node:crypto');state.lastPageHash=createHash('sha256').update(response.body).digest('hex');state.lastPageUrl=response.url;state.parserVersion='kiwa-catalog-v1';await mkdir(join(root,'evidence'),{recursive:true});await writeFile(join(root,'evidence',`page-${state.nextPage}.json`),response.body);state.products=[...existing.values()];state.pages++;state.nextPage++;state.status=page.length<250?'complete':'running';state.message=undefined;state.failure=undefined;state.updatedAt=new Date().toISOString();state.nextRequestAt=Date.now()+2000;
  }catch(e){state.status='error';applyFailure(state,e,url,'catalog');}
  await save(state);return state;}finally{await lock.close();await unlink(join(root,'writer.lock'));}
 });shared.catalogQueue=next;return next;
}
export async function catalogImage(productId:string,index:number,variantId?:string){
 const state=await readCatalog(),p=state.products.find(p=>p.id===productId);if(!p)throw new Error('PRODUCT_NOT_FOUND');const imageUrl=variantId?p.variants.find(v=>v.id===variantId)?.imageUrl??p.imageUrls[0]:p.imageUrls[index];if(!imageUrl)throw new Error('IMAGE_NOT_FOUND');
 const {createHash}=await import('node:crypto');const key=createHash('sha256').update(imageUrl).digest('hex'),folder=join(root,'images'),path=join(folder,key+'.json');
 try{const stored=JSON.parse(await readFile(path,'utf8'));return{body:Buffer.from(stored.body,'base64'),contentType:stored.contentType as string};}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 let result;try{result=await catalogDownload(imageUrl,'image');}catch(error){if(!(error instanceof Error&&error.message==='COLLECTION_HALTED'))await catalogCommand('halt',{error,url:imageUrl,phase:'image'});throw error;}await mkdir(folder,{recursive:true});const temp=path+'.'+crypto.randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({body:result.body.toString('base64'),contentType:result.contentType}));await rename(temp,path);return result;
}

const network=globalThis as typeof globalThis&{catalogNetwork?:Promise<unknown>;catalogLastRequest?:number};
async function catalogDownload(url:string,kind:'text'|'json'|'html'|'image'){const job=(network.catalogNetwork??Promise.resolve()).catch(()=>{}).then(async()=>{const delay=Math.max(0,(network.catalogLastRequest??0)+1200-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));const state=await readCatalog();if(kind==='image'&&(['paused','error'].includes(state.status)||Date.now()<state.failure?.retryAt!))throw new Error('COLLECTION_HALTED');network.catalogLastRequest=Date.now();return downloadResource(url,kind);});network.catalogNetwork=job;return job;}

async function writerLock(){const path=join(root,'writer.lock');try{const lock=await open(path,'wx');await lock.writeFile(String(process.pid));return lock;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const owner=Number(await readFile(path,'utf8'));if(!Number.isInteger(owner)||owner<=0)throw new Error('ロックの内容を確認してください');try{process.kill(owner,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH'){await unlink(path);return writerLock();}throw e;}throw new Error('別の収集処理が動作中です');}}

function applyFailure(state:CatalogState,error:unknown,url:string,phase:string){const status=error instanceof ResourceError?error.status:undefined;const retryAt=Math.max(Date.now()+60000,error instanceof ResourceError?error.retryAt??0:0);state.status='error';state.message=(error instanceof Error?error.message:'取得失敗')+(status?` (HTTP ${status})`:'');state.nextRequestAt=retryAt;state.failure={url,phase,status,retryAt};}
