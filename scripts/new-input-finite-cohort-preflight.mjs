import{assertFiniteSourceMeaningEligible}from'./finite-source-meaning-holds.mjs';
// Shared mechanical gate snapshot. Not wired to a renderer or registration route.
import {readFile,readdir} from 'node:fs/promises';
import {isDeepStrictEqual as equal} from 'node:util';
import {sha256} from './lib/registration-work.mjs';
import {readJsonLines} from './read-jsonl.mjs';
import {loadTeardropRestrictions} from './teardrop-registration-guards.mjs';
import {loadMinimumSalePolicy,saleRegistrationDecision,saleSourceFromRow} from './minimum-sale-unit-guard.mjs';
import {loadNormalizedNewInputNegatives,negativeBlocksInput} from './new-input-negative-normalization.mjs';
import {finiteUnitHash,assertPreparationReadSet} from './new-input-finite-cohort-catalog.mjs';

const fail=m=>{throw Error('FINITE_PREFLIGHT_'+m);};
const h=o=>sha256(JSON.stringify(o));
const endpoint='http://127.0.0.1:3000/api/local/workspace';
const saleHash='cf0523f499718c34615dec1d49c79608c0b310bbfb37e1f099815593dfe8538b';
const sourceIndexes=new WeakMap(),hashIndexes=new WeakMap(),saleIndexes=new WeakMap();
function byId(rows,key){let keys=sourceIndexes.get(rows);if(!keys){keys=new Map();sourceIndexes.set(rows,keys);}if(!keys.has(key))keys.set(key,new Map(rows.map(r=>[r[key],r])));return keys.get(key);}
function contentHashIndex(values){
  let index=hashIndexes.get(values);if(index)return index;
  index=new Set();
  for(const v of values){
    const text=Buffer.isBuffer(v)?v.toString('utf8'):JSON.stringify(v);
    // Includes every 64-character window, preserving the former substring gate
    // even for an unexpectedly longer hexadecimal run.
    for(const run of text.matchAll(/[a-f0-9]{64,}/g))for(let i=0;i<=run[0].length-64;i++)index.add(run[0].slice(i,i+64));
  }
  hashIndexes.set(values,index);return index;
}
function representedSaleGroups(parts,policy){
  let policies=saleIndexes.get(parts);if(!policies){policies=new WeakMap();saleIndexes.set(parts,policies);}
  let result=policies.get(policy);if(result)return result;
  result={sources:new Set(),groups:new Set()};
  for(const p of parts){const id=saleSourceFromRow(p,policy);if(!id)continue;result.sources.add(id);const g=policy.byDraft.get(id);if(g)result.groups.add(g.id);}
  policies.set(policy,result);return result;
}

// Only content hashes are persisted. The workspace token never leaves this call.
export async function captureFiniteGateState(extraBindings=[]){
  if(!Array.isArray(extraBindings)||extraBindings.some(p=>!/^\.local\/calibration\/nominal\/(?:new-input-cohorts\/cohort-\d{4}\/(?:scope|prepare-plan|output-ledger|progress-journal)\.json|new-input-cohorts\/closures\/[a-f0-9]{64}\.json|new-input-finite-cohorts\.json|new-input-negative-proofs\/[a-f0-9]{64}\.json)$/.test(p)&&!/^\.local\/setup\/new-input-cohort-\d{4}-prepared\.json$/.test(p)))fail('BINDING_PATH');
  const ub=await readFile('.local/setup/bulk-cutout-unit-001.json');if(sha256(ub)!==finiteUnitHash)fail('UNIT');
  const unit=JSON.parse(ub),rb=await readFile('.local/parts/parts.json'),registry=JSON.parse(rb),pointerBytes=await readFile('.local/calibration/nominal/campaign-current.json'),pointer=JSON.parse(pointerBytes),pb=await readFile(pointer.planPath),plan=JSON.parse(pb),lb=await readFile(plan.ledgerPath),ledger=JSON.parse(lb);
  if(sha256(rb)!==unit.registrySha256||sha256(pb)!==unit.planSha256||pointer.planSha256!==unit.planSha256||plan.workspaceId!==unit.workspaceId)fail('PLAN_REGISTRY');
  const guards=await loadTeardropRestrictions('.local/calibration/nominal'),salePolicy=await loadMinimumSalePolicy(unit.registrySha256),negative=await loadNormalizedNewInputNegatives();
  if(salePolicy.sha256!==saleHash)fail('SALE_POLICY');
  const galleryBytes=await readFile('.local/calibration/gallery/records.jsonl'),captures=new Map();
  for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
  if(sha256(await readFile('.local/calibration/gallery/records.jsonl'))!==sha256(galleryBytes))fail('GALLERY_CHANGED_DURING_READ');
  const prepared=[],preparedContents=[];
  for(const file of (await readdir('.local/setup',{recursive:true})).sort()){
    if(!file.endsWith('.json')||!file.toLowerCase().includes('prepared'))continue;
    const path='.local/setup/'+file.replaceAll('\\','/'),bytes=await readFile(path);prepared.push({path,sha256:sha256(bytes)});preparedContents.push(bytes);
  }
  const boot=await fetch(endpoint).then(r=>r.json());if(boot.workspaceId!==unit.workspaceId)fail('WORKSPACE');
  const select=async table=>{const x=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query:{table,columns:'*'}})}).then(r=>r.json());if(x.error||!Array.isArray(x.data))fail('SQL_READ');return x.data;};
  const [parts,assets]=await Promise.all([select('parts'),select('part_image_assets')]);
  const bindings={unitSha256:sha256(ub),registrySha256:sha256(rb),pointerSha256:sha256(pointerBytes),planSha256:sha256(pb),ledgerSha256:sha256(lb),gallerySha256:sha256(galleryBytes),guardsFingerprint:guards.fingerprint,salePolicySha256:salePolicy.sha256,negativeFingerprint:negative.fingerprint,negativeBindings:negative.bindings,workspaceId:boot.workspaceId};
  bindings.minimumSaleCatalogSha256=salePolicy.manifest.catalogSha256;
  bindings.processingRuntime=[];
  for(const p of ['.ai/evidence/new-input-grabcut-runtime-v3.json','scripts/prepare-new-input-grabcut-background.mjs','scripts/new-input-grabcut-background.py'])bindings.processingRuntime.push({path:p,sha256:sha256(await readFile(p))});
  bindings.negativeHistoryProofs=[];
  for(const file of (await readdir('.local/calibration/nominal/new-input-negative-proofs')).sort()){
    if(!file.endsWith('.json'))continue;
    const path='.local/calibration/nominal/new-input-negative-proofs/'+file,bytes=await readFile(path),p=JSON.parse(bytes);
    if(p.fingerprint!==h({entries:p.entries,bindings:p.bindings})||file!==p.fingerprint+'.json'||!equal(p.entries,negative.entries.slice(0,p.entries.length)))fail('NEGATIVE_HISTORY');
    bindings.negativeHistoryProofs.push({path,sha256:sha256(bytes)});
  }
  for(const p of extraBindings)bindings[p]=sha256(await readFile(p));
  const readSet={version:1,bindings,sql:{partsSha256:h(parts),assetsSha256:h(assets),allParts:parts.length,allAssets:assets.length},prepared};
  return {unit,registry,plan,ledger,captures,guards,salePolicy,negative,parts,assets,preparedContents,readSet,inputBytes:{unitBytes:ub,registryBytes:rb,planBytes:pb}};
}

// Mechanical eligibility only. BODY/source correspondence and native/processed
// image approval remain separate and mandatory; no SQL or pixel work occurs here.
export function evaluateFiniteEligibility(state,row,pixelPlan,originalBytes,reviewedAt){
  assertFiniteSourceMeaningEligible(row.draftId);
  const r=byId(state.unit.rows,'draftId').get(row.draftId),d=byId(state.registry.parts,'id').get(row.draftId),f=byId(state.ledger.rows,'draftId').get(row.draftId),s=pixelPlan.rendererSpec,crop=s.sourceCrop.crop,photo=r?.unprocessedAlternateCandidates.find(p=>p.sha256===row.alternatePhotoSha256&&p.url===row.alternateUrl&&p.galleryIndex===row.galleryIndex);
  if(!r||!d||!photo||h(d)!==r.sourceObjectSha256||row.sourceObjectSha256!==r.sourceObjectSha256||!f||f.sourceObjectSha256!==r.sourceObjectSha256||f.photoSha256!==r.frozenPrimaryPhotoSha256||!Array.isArray(f.restrictions)||f.restrictions.length||row.primaryPhotoSha256!==f.photoSha256||row.alternatePhotoSha256===f.photoSha256)fail('FROZEN_BINDING');
  if(state.guards.blocked.has(d.id))fail('HELD');
  const sale=saleRegistrationDecision(d.id,state.salePolicy),group=state.salePolicy.byDraft.get(d.id);
  if(!sale.allowed||!group)fail('SALE');
  const represented=representedSaleGroups(state.parts,state.salePolicy);if(represented.sources.has(d.id)||represented.groups.has(group.id))fail('EXISTING_SOURCE_OR_SALE_GROUP');
  const c=state.captures.get(row.alternateUrl),primary=state.captures.get(d.imageUrls[0]);
  if(!c||c.sha256!==row.alternatePhotoSha256||!c.productIds?.includes(d.productId)||d.imageUrls[row.galleryIndex]!==c.url||primary?.sha256!==f.photoSha256||s.sourceCrop.sha256!==c.sha256||s.sourceCrop.url!==c.url||s.sourceCrop.sourceWidth!==c.pixelWidth||s.sourceCrop.sourceHeight!==c.pixelHeight)fail('OWN_CAPTURE');
  if(!Buffer.isBuffer(originalBytes)||sha256(originalBytes)!==c.sha256)fail('ORIGINAL_BYTES');
  if(contentHashIndex(state.assets).has(c.sha256))fail('REGISTERED_PHOTO');
  if(contentHashIndex(state.preparedContents).has(c.sha256))fail('PREVIOUSLY_PREPARED');
  if(state.negative.entries.some(n=>negativeBlocksInput(n,c.sha256,crop,s.widthMm,s.heightMm)))fail('KNOWN_FAILED');
  if(!Number.isFinite(Date.parse(reviewedAt)))fail('REVIEW_TIME');
  const neg=state.negative,oldBinding=neg.bindings.find(b=>b.path==='.local/calibration/nominal/campaign-body-negative-inputs.json'),newBinding=neg.bindings.find(b=>b.path==='.local/calibration/nominal/new-input-cutout-negative-inputs.json');if(!oldBinding||!newBinding)fail('NEGATIVE_BINDINGS');
  const failedOriginalHashes=[...new Set(neg.entries.filter(n=>n.scope==='photo'||!n.crop&&!n.cropSignature&&!n.inputSignature).flatMap(n=>[n.photoSha256,n.sourcePhotoSha256,n.hashes?.original].filter(Boolean)))];
  const failedCropSignatures=neg.entries.flatMap(n=>n.cropSignature?[n.cropSignature]:n.crop&&[n.photoSha256,n.sourcePhotoSha256,n.hashes?.original].find(Boolean)?[h({sha256:[n.photoSha256,n.sourcePhotoSha256,n.hashes?.original].find(Boolean),crop:n.crop,rotation:0})]:[]);
  return {reviewed:true,originalSha256:c.sha256,primarySha256:f.photoSha256,previouslyProcessed:false,registered:false,held:false,ownAssociationVerified:true,reviewedBy:'Finite cohort shared mechanical preflight; not image approval',reviewedAt,failedOriginalHashes,failedCropSignatures,failedInputSignatures:[],evidence:{unitSha256:state.readSet.bindings.unitSha256,registrySha256:state.readSet.bindings.registrySha256,planSha256:state.readSet.bindings.planSha256,negativeSha256:oldBinding.sha256,newNegativeSha256:newBinding.sha256,guardsFingerprint:state.guards.fingerprint,salePolicySha256:state.salePolicy.sha256,preparedIndexSha256:h(state.readSet.prepared),assetMetadataSha256:state.readSet.sql.assetsSha256,allParts:state.parts.length,allAssets:state.assets.length,preflightReadSetSha256:h(state.readSet),sqlWrites:0}};
}

export async function assertFiniteGateSnapshotCurrent(before,extraBindings=[],ownedPreparedOutputs=[]){
  const live=await captureFiniteGateState(extraBindings);
  assertPreparationReadSet(before.readSet,live.readSet,ownedPreparedOutputs);
  return live;
}
