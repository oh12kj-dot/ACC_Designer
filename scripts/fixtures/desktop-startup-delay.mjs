// Test process only: retain the real DB initialization/validation after the delay.
import {PGlite} from '@electric-sql/pglite';
import {createRequire} from 'node:module';
const mode=process.env.ACC_DESKTOP_TEST_DELAY;
if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(process.env.ACC_LOCAL_WORKSPACE_TEST_ID??''))throw Error('TEST_WORKSPACE_REQUIRED');
if(mode==='probe'){
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/api/local/workspace')){
   process.send?.({type:'test-probe-paused'});
   await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,20000),abort=()=>{clearTimeout(timer);reject(options.signal.reason);};if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});});
  }
  return original(url,options);
 };
}else{
 const classes=new Set([PGlite,createRequire(import.meta.url)('@electric-sql/pglite').PGlite]);
 for(const Class of classes){const query=Class.prototype.query;let delayed=false;
  Class.prototype.query=async function(sql,...args){
   if(mode==='init'&&!delayed&&String(sql).includes("to_regclass('public.local_schema')")){delayed=true;process.send?.({type:'test-init-paused'});await new Promise(r=>setTimeout(r,2000));}
   if(mode==='audit-error'&&String(sql)==='select id from auth.users')throw Error('TEST_AUDIT_FAILED');
   return query.call(this,sql,...args);
  };
 }
}
