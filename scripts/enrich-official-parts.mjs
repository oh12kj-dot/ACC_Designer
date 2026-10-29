import {readFile,writeFile,mkdir,rename,open,unlink,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve('.local/calibration/details');await mkdir(root,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const atomic=async(file,data)=>{await writeFile(file+'.tmp',JSON.stringify(data));await rename(file+'.tmp',file);};
let lock;try{lock=await open(join(root,'worker.lock'),'wx');await lock.writeFile(String(process.pid));}catch{throw new Error('DETAIL_WORKER_LOCKED');}
try{
for(const [source,target] of [['publicResource.ts','resource.mjs'],['catalogParser.ts','parser.mjs']])await writeFile(join(root,target),stripTypeScriptTypes(await readFile('src/server/'+source,'utf8'),{mode:'transform'}).replace("'./publicResource'","'./resource.mjs'"));
const {downloadResource}=await import(pathToFileURL(join(root,'resource.mjs'))),{robotsAllows}=await import(pathToFileURL(join(root,'parser.mjs')));
const bytes=await readFile('.local/parts/parts.json'),registry=JSON.parse(bytes),catalog=JSON.parse(await readFile('.local/catalog/catalog.json'));
let state;try{state=JSON.parse(await readFile(join(root,'checkpoint.json')));}catch(e){if(e.code!=='ENOENT')throw e;state={version:1,registrySha256:hash(bytes),products:{}};}
if(state.registrySha256!==hash(bytes))throw new Error('DETAIL_BASELINE_CHANGED');
let last=0,robots='';const fetchSource=async(url,kind)=>{const delay=Math.max(0,last+1500-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));if(robots&&!robotsAllows(robots,new URL(url).pathname))throw new Error('ROBOTS_DENIED');last=Date.now();return downloadResource(url,kind);};
const checkpoint=async()=>{state.checkedAt=new Date().toISOString();state.completedProducts=Object.keys(state.products).length;state.totalProducts=catalog.products.length;state.completedVariants=registry.parts.filter(p=>state.products[p.productId]).length;state.pendingVariants=registry.parts.length-state.completedVariants;await atomic(join(root,'checkpoint.json'),state);};
try{
const r=await fetchSource('https://kiwaseisakujo.jp/robots.txt','text');robots=r.body.toString();if(!/user-agent\s*:/i.test(robots))throw new Error('INVALID_ROBOTS');await writeFile(join(root,'robots.txt'),r.body);
const policy=await fetchSource('https://kiwaseisakujo.jp/agents.md','text');if(!policy.body.toString().includes('/products/{handle}.json'))throw new Error('SOURCE_PERMISSION_UNVERIFIED');await writeFile(join(root,'agents.md'),policy.body);state.policy={checkedAt:new Date().toISOString(),robotsSha256:hash(r.body),agentsSha256:hash(policy.body)};delete state.halted;
await checkpoint();
for(const p of catalog.products){try{await access(join(root,'stop'));state.stopped={at:new Date().toISOString(),reason:'operator_requested'};await checkpoint();break;}catch(e){if(e.code!=='ENOENT')throw e;}if(state.products[p.id]){const prior=state.products[p.id];if(hash(await readFile(join(root,prior.file)))!==prior.sha256)throw new Error('DETAIL_CAPTURE_CORRUPT');continue;}
const url=new URL(p.sourceUrl);if(url.origin!=='https://kiwaseisakujo.jp'||!/^\/products\/[a-zA-Z0-9_-]+$/.test(url.pathname))throw new Error('DETAIL_URL_INVALID');url.search='';url.pathname+='.json';
const response=await fetchSource(url.href,'json'),body=JSON.parse(response.body);if(String(body.product?.id)!==p.id||!Array.isArray(body.product.variants)||!Array.isArray(body.product.images))throw new Error('PRODUCT_MISMATCH_OR_GUARD');
const file=p.id+'.json';await writeFile(join(root,file),response.body);state.products[p.id]={file,url:url.href,finalUrl:response.url,sha256:hash(response.body),fetchedAt:new Date().toISOString(),variants:body.product.variants.length};await checkpoint();if(state.completedProducts%25===0)console.log(JSON.stringify({products:state.completedProducts,total:state.totalProducts,variants:state.completedVariants}));
}
}catch(e){state.halted={error:e.code??e.message,httpStatus:e.status,at:new Date().toISOString()};await checkpoint();console.error(JSON.stringify(state.halted));process.exitCode=1;}
console.log(JSON.stringify({completedProducts:state.completedProducts,completedVariants:state.completedVariants,pendingVariants:state.pendingVariants,halted:state.halted}));
}finally{await lock.close();await unlink(join(root,'worker.lock'));}
