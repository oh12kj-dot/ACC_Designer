import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
import {readJsonLines} from './read-jsonl.mjs';
import {loadTeardropRestrictions} from './teardrop-registration-guards.mjs';
import {prepareCachedTeardrop} from './prepared-teardrop-cache.mjs';
import {teardropRangeImageKey} from './prepare-teardrop-range.mjs';
import {publishTeardropReview} from './publish-teardrop-review.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
export async function loadTeardropSelector(){
 const code=stripTypeScriptTypes(await readFile('src/server/teardropRangeNominal.ts','utf8'),{mode:'transform'});
 return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
export function planReviewedTeardrops({manifestBytes,registryBytes,reviews,captures,blocked,registeredIds,selector}){
 if(hash(manifestBytes)!==selector.teardropManifestHash)throw Error('TEARDROP_MANIFEST_HASH');
 const manifest=JSON.parse(manifestBytes);
 if(hash(registryBytes)!==manifest.sourceInputs.registry.sha256)throw Error('TEARDROP_REGISTRY_HASH');
 if(!Array.isArray(reviews)||new Set(reviews.map(r=>r.draftId)).size!==reviews.length)throw Error('TEARDROP_REVIEW_IDS');
 const drafts=new Map(JSON.parse(registryBytes).parts.map(d=>[d.id,d])),candidates=new Map(manifest.candidates.map(c=>[c.sourceDraftId,c]));
 const ready=[],skipped=[];
 for(const review of reviews){
  if(!candidates.has(review.draftId))throw Error('TEARDROP_REVIEW_OUTSIDE_SCOPE');
  if(registeredIds.has(review.draftId)){skipped.push({draftId:review.draftId,reason:'already-registered-no-reprocessing'});continue;}
  if(blocked.has(review.draftId)||review.blocked){skipped.push({draftId:review.draftId,reason:'finite-hold-or-exclusion'});continue;}
  const spec=selector.nominalTeardropRange(drafts.get(review.draftId),candidates.get(review.draftId),review,captures.get(review.url),selector.teardropManifestHash);
  if(!spec)throw Error('TEARDROP_RAW_REVIEW_INVALID '+review.draftId);
  ready.push({draftId:review.draftId,spec});
 }
 return {ready,skipped};
}
export async function prepareReviewedTeardrops(plan,{loadOriginal,prepare=prepareCachedTeardrop}={}){
 const prepared=[];
 for(const {draftId,spec} of plan.ready){
  const original=await loadOriginal(spec.sourceCrop.sha256);
  if(hash(original)!==spec.sourceCrop.sha256)throw Error('TEARDROP_SOURCE_HASH');
  const result=await prepare(original,spec),imageKey=teardropRangeImageKey(spec.sourceCrop.sha256,spec);
  prepared.push({draftId,spec,result,keySha256:hash(imageKey),highSha256:hash(result.high),processedReviewed:false});
 }
 return prepared;
}
async function main(){
 const args=process.argv.slice(2),checkOnly=args.includes('--check-only');
 const positional=args.filter(x=>x!=='--check-only');
 if(positional.length!==1||positional[0].startsWith('--'))throw Error('Usage: node scripts/prepare-reviewed-teardrop.mjs <raw-review-json> [--check-only]. No SQL registration.');
 const root=resolve('.local/calibration/nominal'),registryBytes=await readFile('.local/parts/parts.json'),selector=await loadTeardropSelector(),manifestBytes=await readFile(join(root,'teardrop-range-candidate-manifest.json'));
 const reviews=JSON.parse(await readFile(positional[0])),restrictions=await loadTeardropRestrictions(root);
 if(!Array.isArray(reviews))throw Error('TEARDROP_REVIEW_IDS');
 const endpoint='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(endpoint).then(r=>r.json());
 if(boot.workspaceId!=='af3aed9f-240b-4021-a01e-40521f03adb6'||!boot.token)throw Error('TEARDROP_WORKSPACE_IDENTITY');
 const response=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query:{table:'parts',columns:'metadata,is_archived'}})}).then(r=>r.json());
 if(response.error||!Array.isArray(response.data))throw Error('TEARDROP_REGISTERED_READ_FAILED');
 // Read every row, including archived Parts, rather than relying on an older promotion file.
 const registeredIds=new Set(response.data.map(p=>p.metadata?.sourceDraftId??p.metadata?.nominalPlacement?.sourceDraftId));
 const captures=new Map(),urls=new Set(reviews.map(r=>r.url));for await(const r of readJsonLines('.local/calibration/gallery/records.jsonl'))if(urls.has(r.url))captures.set(r.url,r);
 const plan=planReviewedTeardrops({manifestBytes,registryBytes,reviews,captures,blocked:restrictions.blocked,registeredIds,selector});
 if(checkOnly){console.log(JSON.stringify({activeParts:response.data.filter(p=>!p.is_archived).length,ready:plan.ready.length,skipped:plan.skipped,prepared:0,sqlWrites:0}));return;}
 const current=await loadTeardropRestrictions(root);if(current.fingerprint!==restrictions.fingerprint)throw Error('TEARDROP_RESTRICTIONS_CHANGED');
 const prepared=await prepareReviewedTeardrops(plan,{loadOriginal:sha=>readFile('.local/calibration/gallery/bytes/'+sha)});
 // An isolated review package never changes the global approval manifest.
 const publication=await publishTeardropReview({prepared,skipped:plan.skipped,registrySha256:hash(registryBytes),outputRoot:join(root,'review-packages')});
 console.log(JSON.stringify({...publication,prepared:prepared.length,skipped:plan.skipped.length,sqlWrites:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
