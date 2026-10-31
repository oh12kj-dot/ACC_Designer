import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyDesktopBuild} from './desktop-build.mjs';

test('desktop preflight rejects the observed old build and missing production files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'acc-build-check-'));
 const json=async(path,value)=>{await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),JSON.stringify(value));};
 try{
  await json('node_modules/next/package.json',{version:'16.4.3'});
  await json('.next/diagnostics/framework.json',{name:'Next.js',version:'16.3.8'});
  await writeFile(join(root,'.next','BUILD_ID'),'retained-old-build');
  await assert.rejects(verifyDesktopBuild(root),error=>error.message.includes('初回セットアップ.bat')&&error.cause.message==='BUILD_VERSION_MISMATCH');
  await json('.next/diagnostics/framework.json',{name:'Next.js',version:'16.4.3'});
  await json('.next/required-server-files.json',{files:['.next/BUILD_ID','.next/server/preview-props.json']});
  await assert.rejects(verifyDesktopBuild(root),error=>error.cause.code==='ENOENT');
  await json('.next/server/preview-props.json',{});await verifyDesktopBuild(root);
  await json('.next/required-server-files.json',{files:['.next/BUILD_ID','.next/routes-manifest.json']});
  await assert.rejects(verifyDesktopBuild(root),error=>error.cause.code==='ENOENT');
  await json('.next/routes-manifest.json',{});await verifyDesktopBuild(root);
  await json('.next/required-server-files.json',{files:['../outside.json']});
  await assert.rejects(verifyDesktopBuild(root),error=>error.cause.message==='BUILD_PATH_INVALID');
  await unlink(join(root,'.next','BUILD_ID'));await assert.rejects(verifyDesktopBuild(root));
 }finally{await rm(root,{recursive:true,force:true});}
});
