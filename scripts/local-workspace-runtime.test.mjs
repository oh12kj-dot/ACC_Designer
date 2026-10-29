import {test} from 'node:test';import assert from 'node:assert/strict';
import {loadLocalWorkspaceRuntime,rewriteRuntimeImports} from './local-workspace-runtime.mjs';
test('offline runtime rewrites only its fixed dependency graph, including compact imports and domain modules',()=>{
 assert.equal(rewriteRuntimeImports('src/server/localWorkspace.ts',"import{a}from'./holeReferences';"),"import{a}from './holeReferences.mjs';");
 assert.equal(rewriteRuntimeImports('src/server/cordProducts.ts','import {validCordLength} from "../domain/editor/cord";'),'import {validCordLength} from "./cord.mjs";');
 assert.equal(rewriteRuntimeImports('src/server/holeReferences.ts',"import manifest from'../data/kiwa-reviewed-hole-diameters.json';"),"import manifest from './reviewedHoleDiameters.mjs';");
 for(const dependency of ['./unreviewed','../../outside','../data/untrusted.json'])assert.throws(()=>rewriteRuntimeImports('src/server/localWorkspace.ts',`import x from '${dependency}';`),/RESTORE_RUNTIME_DEPENDENCY/);
});
test('offline runtime loads the real restore closure and removes all generated files on disposal',async()=>{
 const runtime=await loadLocalWorkspaceRuntime();const directory=runtime.directory;
 try{assert.equal(typeof runtime.LocalWorkspace.open,'function');assert.equal(typeof runtime.restoreWorkspaceBackup,'function');assert.equal(typeof runtime.acquireWorkspacePublication,'function');}finally{await runtime.dispose();}
 await assert.rejects(lstat(directory),{code:'ENOENT'});
});
import {mkdtemp,mkdir,symlink,lstat,unlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
test('offline runtime refuses an ancestor .local junction before creating setup files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'acc-runtime-link-')),outside=join(root,'outside'),cwd=join(root,'caller'),alias=join(cwd,'.local');await mkdir(outside);await mkdir(cwd);await symlink(outside,alias,process.platform==='win32'?'junction':'dir');
 try{const script=`const {loadLocalWorkspaceRuntime}=await import(${JSON.stringify(pathToFileURL(resolve('scripts/local-workspace-runtime.mjs')).href)});await loadLocalWorkspaceRuntime();`,result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd,encoding:'utf8',windowsHide:true});assert.notEqual(result.status,0);assert.match(result.stderr,/WORKSPACE_PATH_LINK/);await assert.rejects(lstat(join(outside,'setup')),{code:'ENOENT'});}
 finally{await unlink(alias);if(root.startsWith(join(tmpdir(),'acc-runtime-link-')))await rm(root,{recursive:true,force:true});}
});
