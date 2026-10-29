import { spawn } from 'node:child_process';
import { join } from 'node:path';
const state=globalThis as typeof globalThis&{catalogWorker?:ReturnType<typeof spawn>};
export function startCatalogWorker(origin:string,token:string){if(state.catalogWorker&&!state.catalogWorker.killed&&state.catalogWorker.exitCode===null)return;const child=spawn(process.execPath,[join(process.cwd(),'scripts','collect-kiwa.mjs'),origin,token,String(process.pid)],{windowsHide:true,stdio:'ignore'});state.catalogWorker=child;child.on('exit',()=>{if(state.catalogWorker===child)state.catalogWorker=undefined;});child.on('error',()=>{if(state.catalogWorker===child)state.catalogWorker=undefined;});}

export function catalogWorkerActive(){return !!state.catalogWorker&&!state.catalogWorker.killed&&state.catalogWorker.exitCode===null;}
