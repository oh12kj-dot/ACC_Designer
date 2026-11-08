import {mkdir,mkdtemp,readFile,writeFile,unlink,rmdir,lstat,realpath} from 'node:fs/promises';
import {resolve,join,dirname,posix} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
// Fixed local backend modules; no running server or Next build is required by restore.
const modules=new Map([
 ['src/server/workspaceBackupFormat.ts','workspaceBackupFormat.mjs'],
 ['src/server/workspaceBackupSet.ts','workspaceBackupSet.mjs'],
 ['src/server/workspacePublication.ts','workspacePublication.mjs'],
 ['src/server/minimumSaleUnits.ts','minimumSaleUnits.mjs'],
 ['src/server/localWorkspace.ts','localWorkspace.mjs'],
 ['src/server/restoreWorkspaceBackup.ts','restoreWorkspaceBackup.mjs'],
 ['src/server/deleteDesign.ts','deleteDesign.mjs'],
 ['src/server/cordProducts.ts','cordProducts.mjs'],
 ['src/server/holeReferences.ts','holeReferences.mjs'],
 ['src/server/supplierReviewFiles.ts','supplierReviewFiles.mjs'],
 ['src/server/supplierReviewArchive.ts','supplierReviewArchive.mjs'],
 ['src/server/supplierListingReview.ts','supplierListingReview.mjs'],
 ['src/domain/supplierListingReview.ts','supplierListingReviewDomain.mjs'],
 ['src/domain/supplierListingReviewBinding.mjs','supplierListingReviewBinding.mjs'],
 ['src/domain/editor/cord.ts','cord.mjs'],
 ['src/domain/editor/studio.ts','studio.mjs'],
 ['src/domain/editor/layoutGuide.ts','layoutGuide.mjs'],
 ['src/domain/editor/guideAnchor.ts','guideAnchor.mjs'],
 ['src/domain/editor/reviewedGuideAxis.ts','reviewedGuideAxis.mjs'],
 ['src/domain/editor/placement.ts','placement.mjs'],
 ['src/domain/path/geometry.ts','pathGeometry.mjs'],
 ['src/domain/geometry/transforms.ts','transforms.mjs'],
 ['src/services/databaseMapping.ts','databaseMapping.mjs'],
 ['src/data/kiwa-reviewed-hole-diameters.json','reviewedHoleDiameters.mjs'],
]);
export function rewriteRuntimeImports(file,source){
 if(!modules.has(file))throw Error('RESTORE_RUNTIME_DEPENDENCY');
 return source.replace(/\bfrom\s*(['"])(\.[^'"]+)\1/g,(_,quote,specifier)=>{
  const dependency=posix.normalize(posix.join(posix.dirname(file),specifier+(posix.extname(specifier)?'':'.ts'))),target=modules.get(dependency);
  if(!target)throw Error('RESTORE_RUNTIME_DEPENDENCY');
  return 'from '+quote+'./'+target+quote;
 });
}
export async function loadLocalWorkspaceRuntime(){
 let current=resolve('.local/setup');for(;;){try{const info=await lstat(current),actual=await realpath(current);if(info.isSymbolicLink()||(process.platform==='win32'?actual.toLowerCase()!==current.toLowerCase():actual!==current))throw Error('WORKSPACE_PATH_LINK');break;}catch(e){if(e.code!=='ENOENT')throw e;current=dirname(current);}}
 await mkdir('.local/setup',{recursive:true});const root=await mkdtemp(resolve('.local/setup/restore-runtime-'));
 const written=[];
 const dispose=async()=>{for(const file of written)await unlink(file);await rmdir(root);};
 try{for(const [input,output] of modules){const raw=await readFile(input,'utf8'),source=input.endsWith('.json')?'export default JSON.parse('+JSON.stringify(raw)+');':rewriteRuntimeImports(input,stripTypeScriptTypes(raw,{mode:'transform'}));const file=join(root,output);await writeFile(file,source);written.push(file);}
  return{...await import(pathToFileURL(join(root,'localWorkspace.mjs')).href),...await import(pathToFileURL(join(root,'restoreWorkspaceBackup.mjs')).href),...await import(pathToFileURL(join(root,'workspacePublication.mjs')).href),directory:root,dispose};
 }catch(e){await dispose();throw e;}
}
