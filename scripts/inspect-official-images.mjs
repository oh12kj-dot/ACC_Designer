import {readFile,writeFile,mkdir,rename,open,unlink,access,appendFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {writeAtomicJson} from './atomic-json.mjs';
const root=resolve('.local/calibration/gallery');await mkdir(root,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const atomic=writeAtomicJson;
const source=JSON.parse(await readFile('.local/calibration/mapping/review-queue.json'));
const registry=await readFile('.local/parts/parts.json');if(hash(registry)!==source.registrySha256)throw new Error('GALLERY_BASELINE_CHANGED');
const images=new Map();for(const product of source.products)for(const image of product.images){const url=new URL(image.url);if(url.protocol!=='https:'||!['cdn.shopify.com','kiwaseisakujo.jp'].includes(url.hostname))throw new Error('GALLERY_SOURCE_NOT_ALLOWED');const existing=images.get(url.href)??{url:url.href,key:hash(url.href),productIds:[]};if(!existing.productIds.includes(product.productId))existing.productIds.push(product.productId);images.set(url.href,existing);}
await atomic(join(root,'queue.json'),{version:1,registrySha256:source.registrySha256,images:[...images.values()]});
if(!process.argv.includes('--run')){console.log(JSON.stringify({products:source.products.length,variants:JSON.parse(registry).parts.length,uniqueImages:images.size,status:'planned'}));process.exit(0);}
let lock;try{lock=await open(join(root,'worker.lock'),'wx');await lock.writeFile(String(process.pid));}catch{throw new Error('GALLERY_WORKER_LOCKED');}
let stop=false;process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
const state={version:1,registrySha256:source.registrySha256,totalImages:images.size,totalProducts:source.products.length,totalVariants:JSON.parse(registry).parts.length,completedImages:0,pendingImages:images.size,downloadedBytes:0,status:'processing',workerPid:process.pid,startedAt:new Date().toISOString(),readiness:'Image decoding is discovery only; no calibration or connection certificate is issued.'};
const records=new Map();let lines='';try{lines=await readFile(join(root,'records.jsonl'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}for(const line of lines.split('\n').filter(Boolean)){const record=JSON.parse(line);if(records.has(record.url))throw new Error('GALLERY_DUPLICATE_RECORD');records.set(record.url,record);}
const saveState=async()=>{state.completedImages=records.size;state.pendingImages=state.totalImages-state.completedImages;state.checkedAt=new Date().toISOString();await atomic(join(root,'state.json'),state);};
try{
await mkdir(join(root,'bytes'),{recursive:true});
await writeFile(join(root,'resource.mjs'),stripTypeScriptTypes(await readFile('src/server/publicResource.ts','utf8'),{mode:'transform'}));await writeFile(join(root,'parser.mjs'),stripTypeScriptTypes(await readFile('src/server/catalogParser.ts','utf8'),{mode:'transform'}).replace("'./publicResource'","'./resource.mjs'"));
await writeFile(join(root,'retry.mjs'),stripTypeScriptTypes(await readFile('src/server/retryOfficialResource.ts','utf8'),{mode:'transform'}));const {retryOfficialTimeout}=await import(pathToFileURL(join(root,'retry.mjs')));
const {downloadResource}=await import(pathToFileURL(join(root,'resource.mjs'))),{robotsAllows}=await import(pathToFileURL(join(root,'parser.mjs')));let last=0,robots='';
const fetchSource=async(url,kind)=>{const delay=Math.max(0,last+1500-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));if(robots&&new URL(url).hostname==='kiwaseisakujo.jp'&&!robotsAllows(robots,new URL(url).pathname))throw new Error('ROBOTS_DENIED');last=Date.now();return downloadResource(url,kind);};
const r=await fetchSource('https://kiwaseisakujo.jp/robots.txt','text');robots=r.body.toString();if(!/user-agent\s*:/i.test(robots))throw new Error('INVALID_ROBOTS');const policy=await fetchSource('https://kiwaseisakujo.jp/agents.md','text');if(!policy.body.toString().includes('/products/{handle}.json'))throw new Error('SOURCE_PERMISSION_UNVERIFIED');await writeFile(join(root,'robots.txt'),r.body);await writeFile(join(root,'agents.md'),policy.body);state.policy={checkedAt:new Date().toISOString(),robotsSha256:hash(r.body),agentsSha256:hash(policy.body)};
for(const record of records.values()){if(!images.has(record.url))throw new Error('GALLERY_RECORD_OUTSIDE_BASELINE');const bytes=await readFile(join(root,'bytes',record.sha256));if(hash(bytes)!==record.sha256)throw new Error('GALLERY_CAPTURE_CORRUPT');state.downloadedBytes+=bytes.length;}
await saveState();
for(const image of images.values()){
 try{await access(join(root,'stop'));stop=true;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(stop){state.status='stopped';break;}if(records.has(image.url))continue;
 if(state.downloadedBytes>=4*1024**3){state.status='halted';state.failure={reason:'GALLERY_STORAGE_BUDGET_REACHED',limitBytes:4*1024**3};break;}
 const response=await retryOfficialTimeout(()=>fetchSource(image.url,'image'),{onRetry:async(attempt,delayMs)=>{state.lastTransientRetry={url:image.url,attempt,delayMs,at:new Date().toISOString()};await saveState();}});const meta=await sharp(response.body,{limitInputPixels:40_000_000}).metadata();if(!meta.width||!meta.height||!['png','jpeg','webp'].includes(meta.format))throw new Error('GALLERY_IMAGE_INVALID');
 const digest=hash(response.body),file=join(root,'bytes',digest);try{const output=await open(file,'wx');try{await output.writeFile(response.body);await output.sync();}finally{await output.close();}}catch(e){if(e.code!=='EEXIST')throw e;if(hash(await readFile(file))!==digest)throw new Error('GALLERY_CAPTURE_CORRUPT');}
 const record={url:image.url,finalUrl:response.url,fetchedAt:new Date().toISOString(),sha256:digest,bytes:response.body.length,mime:response.contentType,pixelWidth:meta.width,pixelHeight:meta.height,productIds:image.productIds,status:'pending_dimension_region_review'};
 await appendFile(join(root,'records.jsonl'),JSON.stringify(record)+'\n');records.set(image.url,record);state.downloadedBytes+=response.body.length;await saveState();if(records.size%25===0)console.log(JSON.stringify({images:records.size,total:images.size,bytes:state.downloadedBytes}));
}
if(state.pendingImages===0)state.status='discovery-complete';
}catch(e){state.status='halted';state.failure={reason:e.code??e.message,httpStatus:e.status,syscall:e.syscall,path:e.path,destination:e.dest,message:e.message,at:new Date().toISOString()};console.error(JSON.stringify({...state.failure,stack:e.stack}));process.exitCode=1;}
finally{await saveState();await lock.close();await unlink(join(root,'worker.lock'));console.log(JSON.stringify(state));}
