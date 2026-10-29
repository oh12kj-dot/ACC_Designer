import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256} from './lib/registration-work.mjs';
import {captureFiniteGateState,evaluateFiniteEligibility} from './new-input-finite-cohort-preflight.mjs';

// Live reads only, same authoritative local inputs as the existing gate. No
// renderer/registration imports or photo/source approvals are made by this test.
const observed=await captureFiniteGateState();
// Mechanical unit fixtures stay independent of the live candidate becoming
// prepared/rejected/registered. They are never passed to a renderer or writer.
const id='kiwa:1:2',original=Buffer.from('synthetic mechanical gate fixture; not an image'),primarySha=sha256('primary fixture');
const draft={id,productId:'1',variantId:'2',name:'Synthetic bead',sizeText:'1.5mm',imageUrls:['https://fixture.invalid/primary','https://fixture.invalid/alternate']};
const photo={sha256:sha256(original),url:draft.imageUrls[1],galleryIndex:1,pixelWidth:20,pixelHeight:20};
const u={draftId:id,sourceObjectSha256:sha256(JSON.stringify(draft)),frozenPrimaryPhotoSha256:primarySha,unprocessedAlternateCandidates:[photo]};
const group={id:'fixture-group',status:'resolved',canonicalOfferDraftId:id,members:[{draftId:id},{draftId:'kiwa:1:3'}]};
const state={unit:{rows:[u]},registry:{parts:[draft]},ledger:{rows:[{draftId:id,sourceObjectSha256:u.sourceObjectSha256,photoSha256:primarySha,restrictions:[]}]},captures:new Map([[draft.imageUrls[0],{sha256:primarySha}],[photo.url,{url:photo.url,sha256:photo.sha256,pixelWidth:20,pixelHeight:20,productIds:['1']}]]),guards:{blocked:new Set(),fingerprint:sha256('holds')},salePolicy:{sha256:sha256('sale'),byDraft:new Map([[id,group],['kiwa:1:3',group]]),byUrl:new Map()},negative:{entries:[],bindings:[{path:'.local/calibration/nominal/campaign-body-negative-inputs.json',sha256:sha256('old negative')},{path:'.local/calibration/nominal/new-input-cutout-negative-inputs.json',sha256:sha256('new negative')}]},parts:[],assets:[],preparedContents:[],readSet:{version:1,bindings:{unitSha256:observed.readSet.bindings.unitSha256,registrySha256:sha256('fixture registry'),planSha256:sha256('fixture plan')},sql:{assetsSha256:sha256('[]')},prepared:[]}};
const row={draftId:id,sourceObjectSha256:u.sourceObjectSha256,primaryPhotoSha256:u.frozenPrimaryPhotoSha256,alternatePhotoSha256:photo.sha256,alternateUrl:photo.url,galleryIndex:photo.galleryIndex};
const crop={left:0,top:0,width:20,height:20};
const plan={rendererSpec:{widthMm:1.5,heightMm:1.5,sourceCrop:{sha256:photo.sha256,url:photo.url,sourceWidth:photo.pixelWidth,sourceHeight:photo.pixelHeight,crop}}};
const run=(s=state,r=row,p=plan,b=original)=>evaluateFiniteEligibility(s,r,p,b,'2026-10-29T01:12:00Z');

test('one shared snapshot retains file/SQL/prepared/runtime/negative-prefix evidence without pixels or SQL writes',()=>{
  const e=run();assert.equal(e.evidence.sqlWrites,0);assert.equal(e.evidence.allParts,state.parts.length);assert.equal(e.evidence.allAssets,state.assets.length);
  assert.equal(e.evidence.preflightReadSetSha256,sha256(JSON.stringify(state.readSet)));
  assert.equal(observed.readSet.bindings.processingRuntime.length,3);assert.ok(observed.readSet.bindings.negativeHistoryProofs.length>0);
  assert.ok(observed.readSet.prepared.length>0);assert.equal(e.registered,false);assert.equal(e.previouslyProcessed,false);
});
test('held source and existing source or same physical sale group are rejected',()=>{
  assert.throws(()=>run({...state,guards:{...state.guards,blocked:new Set([id])}}),/HELD/);
  assert.throws(()=>run({...state,parts:[...state.parts,{metadata:{sourceDraftId:id}}]}),/EXISTING_SOURCE_OR_SALE_GROUP/);
  const g=state.salePolicy.byDraft.get(id),other=g.members.find(m=>m.draftId!==id);
  if(other)assert.throws(()=>run({...state,parts:[...state.parts,{metadata:{sourceDraftId:other.draftId}}]}),/EXISTING_SOURCE_OR_SALE_GROUP/);
});
test('registered or previously prepared original cannot enter a new cohort',()=>{
  assert.throws(()=>run({...state,assets:[...state.assets,{source_transform:{photoSha256:photo.sha256}}]}),/REGISTERED_PHOTO/);
  assert.throws(()=>run({...state,preparedContents:[...state.preparedContents,Buffer.from(photo.sha256)]}),/PREVIOUSLY_PREPARED/);
  assert.throws(()=>run({...state,assets:[{unexpectedLongRun:'a'+photo.sha256+'b'}]}),/REGISTERED_PHOTO/);
  assert.throws(()=>run({...state,preparedContents:[Buffer.from('a'+photo.sha256+'b')]}),/PREVIOUSLY_PREPARED/);
});
test('known crop stays prohibited across changed BODY BOX; original-level negatives reject other crops',()=>{
  const negative={...state.negative,entries:[...state.negative.entries,{photoSha256:photo.sha256,crop}]};
  assert.throws(()=>run({...state,negative},row,{rendererSpec:{...plan.rendererSpec,widthMm:2,heightMm:2}}),/KNOWN_FAILED/);
  assert.throws(()=>run({...state,negative:{...negative,entries:[{photoSha256:photo.sha256,scope:'photo'}]}}),/KNOWN_FAILED/);
});
test('foreign own association, original byte changes and source-object drift are rejected',()=>{
  assert.throws(()=>run(state,{...row,galleryIndex:0}),/FROZEN_BINDING|OWN_CAPTURE/);
  assert.throws(()=>run(state,row,plan,Buffer.from('not original')),/ORIGINAL_BYTES/);
  const registry={...state.registry,parts:state.registry.parts.map(d=>d.id===id?{...d,sizeText:'2mm'}:d)};
  assert.throws(()=>run({...state,registry}),/FROZEN_BINDING/);
});
