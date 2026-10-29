import {ocrSnapshotComplete} from './ocr-completion.mjs';
import {readJsonLines} from './read-jsonl.mjs';
import {readFile,writeFile,mkdir,rename,open,unlink,appendFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
import {writeAtomicJson} from './atomic-json.mjs';
const root=resolve('.local/calibration/ocr'),gallery=resolve('.local/calibration/gallery');await mkdir(join(root,'models'),{recursive:true});
await writeFile(join(root,'candidates.mjs'),stripTypeScriptTypes(await readFile('src/server/ocrCandidates.ts','utf8'),{mode:'transform'}));
const {groupGalleryRecords,ocrContainsVariantSize}=await import(pathToFileURL(join(root,'candidates.mjs')));
await writeFile(join(root,'liveness.mjs'),stripTypeScriptTypes(await readFile('src/server/workerLiveness.ts','utf8'),{mode:'transform'}));const {workerIsAlive}=await import(pathToFileURL(join(root,'liveness.mjs')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const atomic=writeAtomicJson;
const completeLines=text=>text.split('\n').slice(0,-1).filter(Boolean).map(line=>JSON.parse(line));
const queue=JSON.parse(await readFile('.local/calibration/mapping/review-queue.json')),registry=await readFile('.local/parts/parts.json');if(hash(registry)!==queue.registrySha256)throw new Error('OCR_BASELINE_CHANGED');
const products=new Map(queue.products.map(p=>[p.productId,p]));
let lock;try{lock=await open(join(root,'worker.lock'),'wx');await lock.writeFile(String(process.pid));}catch{throw new Error('OCR_WORKER_LOCKED');}
let worker,stop=false;process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
const done=new Map(),variants=new Set();const state={version:1,registrySha256:queue.registrySha256,status:'processing',workerPid:process.pid,processedUniqueImages:0,candidateVariants:0,startedAt:new Date().toISOString(),readiness:'OCR labels and boxes are unverified candidates. No Part or calibration certificate is created.'};
const productIndex=new Map();
const indexProposal=async record=>{for(const productId of record.productIds){const matches=record.candidateVariants.filter(v=>v.productId===productId);if(!matches.length)continue;const entries=productIndex.get(productId)??new Map();entries.set(record.imageSha256,{imageSha256:record.imageSha256,urls:record.urls??[record.url],candidateVariants:matches,verified:false});productIndex.set(productId,entries);await atomic(join(root,'products',productId+'.json'),{version:1,registrySha256:queue.registrySha256,productId,entries:[...entries.values()]});}};
const save=async()=>{state.checkedAt=new Date().toISOString();state.processedUniqueImages=done.size;state.candidateVariants=variants.size;await atomic(join(root,'state.json'),state);};
try{
await mkdir(join(root,'results'),{recursive:true});await mkdir(join(root,'products'),{recursive:true});
try{for await(const record of readJsonLines(join(root,'records.jsonl'))){if(record.registrySha256!==queue.registrySha256)throw new Error('OCR_RECORD_BASELINE_CHANGED');done.set(record.imageSha256,record.associationHash??hash(JSON.stringify({productIds:[...record.productIds].sort(),urls:[record.url]})));for(const match of record.candidateVariants)variants.add(match.id);await indexProposal(record);}}catch(e){if(e.code!=='ENOENT')throw e;}
await save();worker=await createWorker(['eng','jpn'],1,{cachePath:join(root,'models')});await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,user_defined_dpi:'300'});
state.models={eng:hash(await readFile(join(root,'models','eng.traineddata'))),jpn:hash(await readFile(join(root,'models','jpn.traineddata')))};
while(!stop){
try{await access(join(root,'stop'));stop=true;}catch(e){if(e.code!=='ENOENT')throw e;}if(stop)break;
let records=[];try{records=completeLines(await readFile(join(gallery,'records.jsonl'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const record of groupGalleryRecords(records)){if(stop)break;const associationHash=hash(JSON.stringify({productIds:record.productIds,urls:record.urls}));if(done.get(record.sha256)===associationHash)continue;
try{await access(join(root,'stop'));stop=true;break;}catch(e){if(e.code!=='ENOENT')throw e;}
const original=await readFile(join(gallery,'bytes',record.sha256));if(hash(original)!==record.sha256)throw new Error('OCR_CAPTURE_CORRUPT');
const {data:input,info}=await sharp(original,{limitInputPixels:40_000_000}).flatten({background:'#fff'}).resize({width:Math.min(1600,record.pixelWidth*2),height:Math.min(1600,record.pixelHeight*2),fit:'inside'}).png().toBuffer({resolveWithObject:true});
let result;const resultFile=join(root,'results',record.sha256+'.json');try{result=JSON.parse(await readFile(resultFile,'utf8'));if(result.imageSha256!==record.sha256)throw new Error('OCR_RESULT_HASH_MISMATCH');}catch(e){if(e.code!=='ENOENT')throw e;const raw=await worker.recognize(input,{}, {text:true,blocks:true});result={imageSha256:record.sha256,text:raw.data.text,confidence:raw.data.confidence,blocks:raw.data.blocks};await atomic(resultFile,result);}
const text=result.text,matches=[];
for(const productId of record.productIds){const product=products.get(productId);if(!product)throw new Error('OCR_PRODUCT_OUTSIDE_BASELINE');for(const v of product.variants){if(ocrContainsVariantSize(text,v.sizeText)){matches.push({id:v.id,productId,variantId:v.variantId,sizeText:v.sizeText,basis:'ocr-size-label-candidate',verified:false});variants.add(v.id);}}}
const proposal={version:1,registrySha256:queue.registrySha256,imageSha256:record.sha256,url:record.url,urls:record.urls,associationHash,productIds:record.productIds,processedAt:new Date().toISOString(),engine:'tesseract.js-7.0.0-eng+jpn',transform:{inputWidth:record.pixelWidth,inputHeight:record.pixelHeight,ocrWidth:info.width,ocrHeight:info.height,scaleX:info.width/record.pixelWidth,scaleY:info.height/record.pixelHeight},text,confidence:result.confidence,blocks:result.blocks,candidateVariants:matches,status:'unverified_ocr_proposal'};
await appendFile(join(root,'records.jsonl'),JSON.stringify(proposal)+'\n',{flush:true});done.set(record.sha256,associationHash);await indexProposal(proposal);await save();if(done.size%25===0)console.log(JSON.stringify({images:done.size,candidateVariants:variants.size}));
}
let progress;try{progress=JSON.parse(await readFile(join(gallery,'state.json')));}catch(e){if(e.code!=='ENOENT')throw e;}
if(progress&&!await workerIsAlive(join(gallery,'worker.lock'))){if(progress.status==='discovery-complete'&&!ocrSnapshotComplete(records.length,progress))continue;state.status=progress.status==='discovery-complete'?'ocr-discovery-complete':'waiting-for-gallery';break;}
await new Promise(r=>setTimeout(r,2000));
}
if(stop)state.status='stopped';
}catch(e){state.status='halted';state.failure={reason:e.code??e.message,at:new Date().toISOString()};console.error(JSON.stringify(state.failure));process.exitCode=1;}
finally{if(worker)await worker.terminate();await save();await lock.close();await unlink(join(root,'worker.lock'));console.log(JSON.stringify(state));}
