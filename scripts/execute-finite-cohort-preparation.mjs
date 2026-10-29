// Executes only already-bound, immutable fresh inputs. Never adopts or writes SQL.
import {readFile,writeFile,open,unlink} from 'node:fs/promises';
import sharp from 'sharp';
import {sha256,saveLedger} from './lib/registration-work.mjs';
import {completeFinitePixelSpec} from './new-input-finite-cohort-catalog.mjs';
import {assertFiniteCohortBundle,assertFiniteCatalog} from './new-input-finite-cohort-catalog.mjs';
import {captureFiniteGateState,assertFiniteGateSnapshotCurrent} from './new-input-finite-cohort-preflight.mjs';
import {prepareNominalNewInputGrabcut} from './prepare-new-input-grabcut-background.mjs';
import {createNewInputCohortPreparer} from './prepare-new-input-cohort.mjs';

const root='.local/calibration/nominal/new-input-cohorts',catalogPath='.local/calibration/nominal/new-input-finite-cohorts.json';
const json=o=>Buffer.from(JSON.stringify(o,null,2)),fail=m=>{throw Error('EXECUTE_FINITE_COHORT_'+m);};
export async function executeFiniteCohortPreparation(cohortId){
  if(!/^cohort-\d{4}$/.test(cohortId))fail('ID');
  const dir=root+'/'+cohortId,scopePath=dir+'/scope.json',preparePlanPath=dir+'/prepare-plan.json',outputPath=dir+'/output-ledger.json',lockPath=root+'/preparation.lock',extra=[catalogPath,scopePath,preparePlanPath];
  const lock=await open(lockPath,'wx');
  try{
    await lock.writeFile(String(process.pid));
    try{await readFile('.local/calibration/nominal/worker.lock');fail('REGISTRATION_WRITER_ACTIVE');}catch(e){if(e.code!=='ENOENT')throw e;}
    let bytes=await readFile(outputPath);const ledger=JSON.parse(bytes);
    if(ledger.version!==1||ledger.cohortId!==cohortId||ledger.rows.some(r=>r.state!=='bound')||ledger.imagesProcessed!==0||ledger.ownedPreparedOutputs.length)fail('NO_UNPROVEN_RESUME_OR_REEXECUTION');
    const baseline=JSON.parse(await readFile(dir+'/preflight-read-set.json'));
    if(baseline.cohortId!==cohortId||baseline.readSetSha256!==ledger.preflightReadSetSha256||sha256(JSON.stringify(baseline.readSet))!==ledger.preflightReadSetSha256)fail('READ_SET_BINDING');
    for(const p of Object.keys(baseline.readSet.bindings).filter(p=>p.startsWith('.local/')&&!extra.includes(p)))extra.push(p);
    const state=await captureFiniteGateState(extra),scopeBytes=await readFile(scopePath),preparePlanBytes=await readFile(preparePlanPath),bundle=assertFiniteCohortBundle({scopeBytes,preparePlanBytes,...state.inputBytes,captures:state.captures}),catalog=assertFiniteCatalog(JSON.parse(await readFile(catalogPath)),bundle.bindings),entry=catalog.entries.find(e=>e.cohortId===cohortId);
    if(bundle.scopeSha256!==ledger.scopeSha256||bundle.preparePlanSha256!==ledger.preparePlanSha256||!entry||entry.scopeSha256!==bundle.scopeSha256||entry.preparePlanSha256!==bundle.preparePlanSha256||sha256(JSON.stringify(entry))!==ledger.catalogPrefixEntrySha256||ledger.rows.length!==bundle.scope.rows.length||new Set(ledger.rows.map(r=>r.draftId)).size!==ledger.rows.length)fail('SCOPE_BINDING');
    await assertFiniteGateSnapshotCurrent({readSet:baseline.readSet},extra);
    for(const r of ledger.rows){
      const bindingBytes=await readFile(r.eligibilityBindingPath),complete=completeFinitePixelSpec(bundle,bindingBytes,r.eligibilityBindingSha256,baseline.readSet);
      if(complete.pixelSpecSha256!==r.pixelSpecSha256||sha256(JSON.stringify(r.pixelSpec))!==complete.pixelSpecSha256||r.rendererKeySha256!==sha256(JSON.stringify({version:'kiwa-campaign-new-alternate-background-grabcut-v3',sha:r.pixelSpec.sourceCrop.sha256,spec:r.pixelSpec})))fail('PIXEL_BINDING');
      const b=JSON.parse(bindingBytes);if(b.preflightReadSetSha256!==ledger.preflightReadSetSha256)fail('ELIGIBILITY_READ_SET');
    }
    const commit=async()=>{await saveLedger(outputPath,ledger,sha256(bytes));bytes=await readFile(outputPath);};
    // A pre-execution immutable reservation is visible to the old freshness gate,
    // including after a crash. Partial attempts can never silently be rerendered.
    const attemptPath='.local/setup/new-input-'+cohortId+'-attempt-prepared.json',attemptBytes=json({version:1,cohortId,scopeSha256:bundle.scopeSha256,preparePlanSha256:bundle.preparePlanSha256,boundRows:ledger.rows,imagesProcessed:0,adopted:0,sqlWrites:0});
    await writeFile(attemptPath,attemptBytes,{flag:'wx'});ledger.ownedPreparedOutputs.push({path:attemptPath,sha256:sha256(attemptBytes)});await commit();
    const prepare=createNewInputCohortPreparer(prepareNominalNewInputGrabcut),originals=new Map();
    for(const r of ledger.rows){
      r.state='processing';r.startedAt=new Date().toISOString();await commit();
      const spec=r.pixelSpec;let original=originals.get(spec.sourceCrop.sha256);if(!original){original=await readFile('.local/calibration/gallery/bytes/'+spec.sourceCrop.sha256);originals.set(spec.sourceCrop.sha256,original);}
      let p;
      try{p=await prepare(original,spec);}catch(e){r.state=e.processingExecuted===false?'skipped-prior-failure':'failed';r.processingExecuted=e.processingExecuted!==false;r.failureReason=e.message;r.priorFailure=e.priorFailure??null;r.repeatProhibited=true;r.finishedAt=new Date().toISOString();if(r.processingExecuted)ledger.imagesProcessed++;await commit();continue;}
      const stem='.local/setup/new-input-'+cohortId+'-'+sha256(r.draftId);r.paths={};
      for(const key of ['high','medium','thumbnail']){r.paths[key]=stem+'-'+key+'.png';await writeFile(r.paths[key],p[key],{flag:'wx'});}
      r.greyPath=stem+'-grey.png';await writeFile(r.greyPath,await sharp(p.high).flatten({background:'#888888'}).png().toBuffer(),{flag:'wx'});
      Object.assign(r,{state:'prepared-unreviewed',processingExecuted:true,hashes:{original:sha256(original),high:sha256(p.high),medium:sha256(p.medium),thumbnail:sha256(p.thumbnail)},originalMime:p.originalMime,preparedTransform:p.transform,width:p.width,height:p.height,mmPerPx:p.mmPerPx,processedApproved:false,finishedAt:new Date().toISOString()});
      ledger.imagesProcessed++;await commit();
    }
    const resultPath='.local/setup/new-input-'+cohortId+'-prepared.json',resultBytes=json({version:1,cohortId,scopeSha256:bundle.scopeSha256,preparePlanSha256:bundle.preparePlanSha256,rows:ledger.rows,imagesProcessed:ledger.imagesProcessed,adopted:0,sqlWrites:0});
    await writeFile(resultPath,resultBytes,{flag:'wx'});ledger.ownedPreparedOutputs.push({path:resultPath,sha256:sha256(resultBytes)});ledger.preparationFinishedAt=new Date().toISOString();await commit();
    await assertFiniteGateSnapshotCurrent({readSet:baseline.readSet},extra,ledger.ownedPreparedOutputs);
    ledger.postPreparationReadSetVerifiedAt=new Date().toISOString();await commit();
    return {cohortId,prepared:ledger.rows.filter(r=>r.state==='prepared-unreviewed').length,imagesProcessed:ledger.imagesProcessed,skipped:ledger.rows.filter(r=>r.state==='skipped-prior-failure').length,adopted:0,sqlWrites:0,resultPath};
  }finally{await lock.close();await unlink(lockPath);}
}
