import { stripTypeScriptTypes } from 'node:module';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve,join } from 'node:path';
// Bounded official-source pattern probe. This is not an all-product detail crawl or calibration.
const folder=resolve('.local/calibration/official-evidence');await mkdir(folder,{recursive:true});
for(const [source,target] of [['publicResource.ts','public-resource.mjs'],['catalogParser.ts','catalog-parser.mjs']]){
 const raw=await readFile('src/server/'+source,'utf8');await writeFile(join(folder,target),stripTypeScriptTypes(raw,{mode:'transform'}).replace("'./publicResource'","'./public-resource.mjs'"));
}
const {downloadResource}=await import(pathToFileURL(join(folder,'public-resource.mjs')));const {robotsAllows}=await import(pathToFileURL(join(folder,'catalog-parser.mjs')));
const catalog=JSON.parse(await readFile('.local/catalog/catalog.json','utf8'));const evidence=[];let robots='',last=0;
async function fetchOfficial(url,kind,name){const delay=Math.max(0,last+1200-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));if(robots&&!robotsAllows(robots,new URL(url).pathname))throw new Error('ROBOTS_DENIED');last=Date.now();const response=await downloadResource(url,kind);await writeFile(join(folder,name),response.body);const record={url:response.url,file:name,bytes:response.body.length,sha256:createHash('sha256').update(response.body).digest('hex'),fetchedAt:new Date().toISOString()};evidence.push(record);return response.body.toString('utf8');}
try{
 robots=await fetchOfficial('https://kiwaseisakujo.jp/robots.txt','text','robots.txt');if(!/user-agent\s*:/i.test(robots))throw new Error('INVALID_ROBOTS');
 const policy=await fetchOfficial('https://kiwaseisakujo.jp/agents.md','text','agents.md');if(!policy.includes('/products/{handle}.json'))throw new Error('PRODUCT_JSON_PERMISSION_UNVERIFIED');
 for(const product of catalog.products.slice(0,3)){const handle=new URL(product.sourceUrl).pathname.split('/').at(-1);if(!/^[a-zA-Z0-9_-]+$/.test(handle))throw new Error('INVALID_HANDLE');const body=JSON.parse(await fetchOfficial(product.sourceUrl+'.json','json',product.id+'.json'));if(String(body.product?.id)!==product.id||!Array.isArray(body.product.variants))throw new Error('PRODUCT_MISMATCH_OR_GUARD');evidence.at(-1).productId=product.id;evidence.at(-1).variants=body.product.variants.length;}
}catch(error){evidence.push({status:'halted',error:error.code??error.message,httpStatus:error.status,at:new Date().toISOString()});}
await writeFile(join(folder,'manifest.json'),JSON.stringify({version:1,scope:'Three-product public JSON pattern probe; no calibration certificates issued',evidence},null,2));console.log(JSON.stringify(evidence,null,2));if(evidence.at(-1)?.status==='halted')process.exitCode=1;
