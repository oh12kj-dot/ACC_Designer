import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export interface GalleryProgress {status:string;totalImages:number;completedImages:number;pendingImages:number;totalVariants:number;checkedAt:string;failure?:{reason:string;httpStatus?:number}}
export interface OcrProgress {status:string;processedUniqueImages:number;candidateVariants:number;checkedAt:string;failure?:{reason:string}}
export async function readOcrProgress():Promise<OcrProgress|undefined>{
 let state;try{state=JSON.parse(await readFile(join(process.cwd(),'.local','calibration','ocr','state.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
 const registry=await readFile(join(process.cwd(),'.local','parts','parts.json'));if(createHash('sha256').update(registry).digest('hex')!==state.registrySha256)throw new Error('OCR_BASELINE_CHANGED');
 if(!['processing','stopped','halted','waiting-for-gallery','ocr-discovery-complete'].includes(state.status)||!Number.isSafeInteger(state.processedUniqueImages)||state.processedUniqueImages<0||!Number.isSafeInteger(state.candidateVariants)||state.candidateVariants<0||state.candidateVariants>JSON.parse(registry.toString()).parts.length)throw new Error('OCR_PROGRESS_INVALID');
 let status=state.status;if(status==='processing'){try{process.kill(state.workerPid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')status='interrupted';else throw e;}}
 return{status,processedUniqueImages:state.processedUniqueImages,candidateVariants:state.candidateVariants,checkedAt:state.checkedAt,failure:state.failure};
}
export async function readGalleryProgress():Promise<GalleryProgress|undefined>{
 let state;try{state=JSON.parse(await readFile(join(process.cwd(),'.local','calibration','gallery','state.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
 const registry=await readFile(join(process.cwd(),'.local','parts','parts.json'));if(createHash('sha256').update(registry).digest('hex')!==state.registrySha256)throw new Error('GALLERY_BASELINE_CHANGED');
 if(!['processing','stopped','halted','discovery-complete'].includes(state.status)||!Number.isSafeInteger(state.totalImages)||!Number.isSafeInteger(state.completedImages)||state.completedImages<0||state.completedImages>state.totalImages||state.pendingImages!==state.totalImages-state.completedImages)throw new Error('GALLERY_PROGRESS_INVALID');
 let status=state.status;if(status==='processing'){try{process.kill(state.workerPid,0);}catch(e){if((e as NodeJS.ErrnoException).code==='ESRCH')status='interrupted';else throw e;}}
 return{status,totalImages:state.totalImages,completedImages:state.completedImages,pendingImages:state.pendingImages,totalVariants:state.totalVariants,checkedAt:state.checkedAt,failure:state.failure};
}
