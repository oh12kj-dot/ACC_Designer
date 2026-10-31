import {access,readFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';

// BUILD_ID alone can survive a dependency upgrade or an incomplete build.
export async function verifyDesktopBuild(directory){
 try{
  const built=JSON.parse(await readFile(join(directory,'.next','diagnostics','framework.json'),'utf8'));
  const installed=JSON.parse(await readFile(join(directory,'node_modules','next','package.json'),'utf8'));
  if(built.name!=='Next.js'||built.version!==installed.version)throw Error('BUILD_VERSION_MISMATCH');
  if(!(await readFile(join(directory,'.next','BUILD_ID'),'utf8')).trim())throw Error('BUILD_ID_EMPTY');
  const manifest=JSON.parse(await readFile(join(directory,'.next','required-server-files.json'),'utf8'));
  if(!Array.isArray(manifest.files)||!manifest.files.length)throw Error('BUILD_MANIFEST_INVALID');
  const output=resolve(directory,'.next');
  for(const file of manifest.files){
   if(typeof file!=='string')throw Error('BUILD_MANIFEST_INVALID');
   const path=resolve(directory,file.replaceAll('\\','/')),within=relative(output,path);
   if(!within||within==='..'||within.startsWith('..\\')||within.startsWith('../')||isAbsolute(within))throw Error('BUILD_PATH_INVALID');
   await access(path);
  }
  // This file is newly required by the installed Next 16.4 production server.
  await access(join(output,'server','preview-props.json'));
 }catch(error){
  throw new Error('起動用ビルドが不足しているか、アプリ本体と一致しません。「初回セットアップ.bat」を実行してから起動してください。',{cause:error});
 }
}
