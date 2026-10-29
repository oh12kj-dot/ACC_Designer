import { test,expect } from '@playwright/test';
import { build } from 'vite';
import { readFileSync } from 'node:fs';
let bundle:string;
test.beforeAll(async()=>{await build({configFile:false,logLevel:'silent',build:{outDir:'test-results/recovery-harness',emptyOutDir:false,lib:{entry:'src/services/recovery.ts',name:'RecoveryHarness',formats:['iife'],fileName:()=> 'recovery.js'}}});bundle=readFileSync('test-results/recovery-harness/recovery.js','utf8');});
test('actual IndexedDB keeps newest snapshot, isolates accounts and only clears acknowledged revisions',async({page})=>{await page.goto('/');await page.addScriptTag({content:bundle});const result=await page.evaluate(async()=>{
 const h=(window as unknown as {RecoveryHarness:{writeRecovery:(v:unknown)=>Promise<void>;readRecovery:(u:string,d:string)=>Promise<unknown>;clearRecovery:(u:string,d:string,r:number)=>Promise<void>;recoverable:(v:unknown,u:string,a:unknown)=>boolean}}).RecoveryHarness;
 const aggregate={design:{id:'fixture',revision:1,updatedAt:'2026-10-05T00:00:00Z'},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]};
 const old={key:'fixture-user:fixture',userId:'fixture-user',aggregate,expectedRevision:1,savedAt:'2026-10-06T00:00:00Z',cloudSavedAt:aggregate.design.updatedAt};const latest={...old,savedAt:'2026-10-07T00:00:00Z',aggregate:{...aggregate,design:{...aggregate.design,name:'latest'}}};
 await h.writeRecovery(latest);await h.writeRecovery(old);const read=await h.readRecovery('fixture-user','fixture');const hidden=await h.readRecovery('another-user','fixture');await h.clearRecovery('fixture-user','fixture',0);const retained=await h.readRecovery('fixture-user','fixture');const conflictCandidate=h.recoverable(read,'fixture-user',{...aggregate,design:{...aggregate.design,revision:2}});await h.clearRecovery('fixture-user','fixture',1);return{read,hidden,retained,conflictCandidate,cleared:await h.readRecovery('fixture-user','fixture')};
 });expect((result.read as {savedAt:string}).savedAt).toBe('2026-10-07T00:00:00Z');expect(result.hidden).toBeUndefined();expect(result.retained).toEqual(result.read);expect(result.conflictCandidate).toBe(true);expect(result.cleared).toBeUndefined();});
test('aborted IndexedDB writes and cleanup reject promptly and preserve the prior snapshot',async({page})=>{
 await page.goto('/');await page.addScriptTag({content:bundle});
 const result=await page.evaluate(async()=>{
  const h=(window as any).RecoveryHarness;
  const aggregate={design:{id:'abort-fixture',revision:1,updatedAt:'2026-10-05T00:00:00Z'},nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[]};
  const initial={key:'fixture-user:abort-fixture',userId:'fixture-user',aggregate,expectedRevision:1,savedAt:'2026-10-06T00:00:00Z',cloudSavedAt:aggregate.design.updatedAt};
  await h.writeRecovery(initial);
  async function abortDuring(method:'put'|'delete',operation:()=>Promise<void>){
   const original=IDBObjectStore.prototype[method];
   IDBObjectStore.prototype[method]=function(){this.transaction.abort();return undefined as any;};
   try{return await Promise.race([operation().then(()=> 'resolved',()=> 'rejected'),new Promise<string>(resolve=>setTimeout(()=>resolve('timeout'),2000))]);}
   finally{IDBObjectStore.prototype[method]=original;}
  }
  const write=await abortDuring('put',()=>h.writeRecovery({...initial,savedAt:'2026-10-07T00:00:00Z'}));
  const clear=await abortDuring('delete',()=>h.clearRecovery('fixture-user','abort-fixture',1));
  return{write,clear,retained:await h.readRecovery('fixture-user','abort-fixture')};
 });
 expect(result.write).toBe('rejected');expect(result.clear).toBe('rejected');
 expect(result.retained.savedAt).toBe('2026-10-06T00:00:00Z');
});
