import{assertTerminalReentries}from'./new-input-terminal-failure-loader.mjs';
// Binds inputs only. Image execution and registration remain separate gates.
import {readFile,writeFile,open,unlink} from 'node:fs/promises';
import {sha256} from './lib/registration-work.mjs';
import {assertFiniteCatalog,assertFiniteCohortBundle,bindFiniteEligibility,completeFinitePixelSpec,legacyScopeHash} from './new-input-finite-cohort-catalog.mjs';
import {captureFiniteGateState,evaluateFiniteEligibility,assertFiniteGateSnapshotCurrent} from './new-input-finite-cohort-preflight.mjs';
const root='.local/calibration/nominal/new-input-cohorts',catalogPath='.local/calibration/nominal/new-input-finite-cohorts.json';
const fail=m=>{throw Error('BEGIN_FINITE_COHORT_'+m);};
const json=o=>Buffer.from(JSON.stringify(o,null,2));

export async function beginFiniteCohortPreparation(cohortId){
  if(!/^cohort-\d{4}$/.test(cohortId))fail('ID');
  const dir=root+'/'+cohortId,scopePath=dir+'/scope.json',preparePlanPath=dir+'/prepare-plan.json',lockPath=root+'/preparation.lock';
  const lock=await open(lockPath,'wx');
  try{
    await lock.writeFile(String(process.pid));
    try{await readFile('.local/calibration/nominal/worker.lock');fail('REGISTRATION_WRITER_ACTIVE');}catch(e){if(e.code!=='ENOENT')throw e;}
    // Re-entry requires the still-to-be-connected immutable closure/output loader.
    // Refuse it here rather than infer terminal failure from a mutable journal.
    let state=await captureFiniteGateState([catalogPath,scopePath,preparePlanPath]);
    const scopeBytes=await readFile(scopePath),preparePlanBytes=await readFile(preparePlanPath),bundle=assertFiniteCohortBundle({scopeBytes,preparePlanBytes,...state.inputBytes,captures:state.captures});
    const cb=await readFile(catalogPath),catalog=assertFiniteCatalog(JSON.parse(cb),bundle.bindings),entry=catalog.entries.find(e=>e.cohortId===cohortId);
    if(!entry||entry.scopeSha256!==sha256(scopeBytes)||entry.preparePlanSha256!==sha256(preparePlanBytes)||entry.scopePath!==scopePath||entry.preparePlanPath!==preparePlanPath)fail('CATALOG_BINDING');
    const selectedIds=new Set(bundle.scope.rows.map(r=>r.draftId)),selectedPhotos=new Set(bundle.scope.rows.map(r=>r.alternatePhotoSha256));
    for(const previous of catalog.entries){
      if(previous.cohortId===cohortId)continue;
      const bytes=await readFile(previous.scopePath);
      if(sha256(bytes)!==previous.scopeSha256||previous.kind==='legacy'&&previous.scopeSha256!==legacyScopeHash)fail('PRIOR_SCOPE_BYTES');
      const prior=JSON.parse(bytes);
      // Same-source prior attempts require immutable terminal receipts below.
      if(prior.rows.some(r=>selectedPhotos.has(r.alternatePhotoSha256)))fail('OTHER_COHORT_ORIGINAL');
    }
    const reentries=await assertTerminalReentries({catalog,currentCohortId:cohortId,scope:bundle.scope,negative:state.negative,parts:state.parts,assets:state.assets});if(reentries.files.length){state=await captureFiniteGateState([catalogPath,scopePath,preparePlanPath,...reentries.files.map(f=>f.path)]);if(reentries.files.some(f=>state.readSet.bindings[f.path]!==f.sha256))fail('REENTRY_READ_SET_CHANGED');await assertTerminalReentries({catalog,currentCohortId:cohortId,scope:bundle.scope,negative:state.negative,parts:state.parts,assets:state.assets});}
    const inputs=[],originals=new Map(),at=new Date().toISOString(),preflightReadSetSha256=sha256(JSON.stringify(state.readSet));
    for(const row of bundle.scope.rows){
      const a=bundle.preparePlan.photos.flatMap(p=>p.associations).find(a=>a.draftId===row.draftId&&a.disposition==='intended');
      let original=originals.get(row.alternatePhotoSha256);if(!original){original=await readFile('.local/calibration/gallery/bytes/'+row.alternatePhotoSha256);originals.set(row.alternatePhotoSha256,original);}
      const eligibility=evaluateFiniteEligibility(state,row,a.pixelPlan,original,at),binding=bindFiniteEligibility(bundle,row.draftId,eligibility,preflightReadSetSha256,new Date().toISOString(),state.readSet),bindingBytes=json(binding),complete=completeFinitePixelSpec(bundle,bindingBytes,sha256(bindingBytes),state.readSet);
      const key=sha256(JSON.stringify({version:'kiwa-campaign-new-alternate-background-grabcut-v3',sha:row.alternatePhotoSha256,spec:complete.pixelSpec}));
      inputs.push({draftId:row.draftId,state:'bound',eligibilityBindingPath:dir+'/source-'+sha256(row.draftId)+'-eligibility.json',eligibilityBindingSha256:sha256(bindingBytes),bindingBytes,pixelSpec:complete.pixelSpec,pixelSpecSha256:complete.pixelSpecSha256,rendererKeySha256:key});
    }
    await assertFiniteGateSnapshotCurrent(state,[catalogPath,scopePath,preparePlanPath,...reentries.files.map(f=>f.path)]);
    // No binding file is published until every intended source and the complete
    // unchanged read-set have passed. Existing runs cannot be overwritten/resumed.
    await writeFile(dir+'/preflight-read-set.json',json({version:1,cohortId,readSet:state.readSet,readSetSha256:preflightReadSetSha256}),{flag:'wx'});
    for(const input of inputs)await writeFile(input.eligibilityBindingPath,input.bindingBytes,{flag:'wx'});
    const output={version:1,cohortId,scopeSha256:bundle.scopeSha256,preparePlanSha256:bundle.preparePlanSha256,catalogPrefixEntrySha256:sha256(JSON.stringify(entry)),preflightReadSetSha256,boundAt:new Date().toISOString(),rows:inputs.map(({bindingBytes,...r})=>r),ownedPreparedOutputs:[],imagesProcessed:0,adopted:0,sqlWrites:0};
    await writeFile(dir+'/output-ledger.json',json(output),{flag:'wx'});
    return output;
  }finally{await lock.close();await unlink(lockPath);}
}
