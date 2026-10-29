import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {digest} from './lib/reviewed-profile-checks.mjs';
import {readJsonLines} from './read-jsonl.mjs';
import * as b from './campaign-new-closed-loop-bridge.mjs';
const rb=await readFile('.local/parts/parts.json'),registry=JSON.parse(rb),captures=new Map();
for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
await b.assertCampaignBodyInputs(registry,digest(rb),captures);
const manifest=JSON.parse(await readFile('.local/calibration/nominal/campaign-new-closed-loop-adopted-v4.json'));b.assertCampaignBodyManifest(manifest);
const e=manifest.entries[0],s=e.spec,clone=structuredClone;

test('new method admits only exact frozen own source and cannot expand by scope edits',async()=>{
  const bytes=await readFile('.local/calibration/nominal/closed-loop-v4-scope.json'),scope=b.assertClosedLoopScopeBytes(bytes);
  assert.equal(scope.rows.length,1);assert.equal(scope.rows[0].draftId,e.draftId);assert.equal(b.isCampaignBodySource(e.draftId),true);assert.equal(b.isCampaignBodySource('kiwa:8710585057572:46968467259684'),false);
  assert.throws(()=>b.assertClosedLoopScopeBytes(Buffer.concat([bytes,Buffer.from(' ')])),/FINITE_SCOPE_BYTES/);
});
test('frozen opening/bridge/pixel review cannot change after processing approval',()=>{
  for(const mutate of [r=>r.foregroundReview.expectedOpenings=2,r=>r.foregroundReview.openings[0].backgroundSeed[0][0]++,r=>r.foregroundReview.openings[0].reviewedOpeningEnvelope[0][0]++,r=>r.foregroundReview.bridgeWitnesses[0][0][0]++,r=>r.sourceCrop.reviewedAt='2026-10-29T00:00:00Z']){
    const r=clone(e.originalReview);mutate(r.pixelSpec);assert.throws(()=>b.nominalCampaignBody(e.draft,e.rule,r,e.capture),/CLOSED_LOOP|FROZEN_PIXEL_OR_SOURCE_REVIEW/);
  }
});
test('source variant and archived/different-recipe source cannot be substituted',()=>{
  const r=clone(e.originalReview);r.sourceCorrespondenceReview.sku='foreign';assert.throws(()=>b.nominalCampaignBody(e.draft,e.rule,r,e.capture),/SCOPE_OR_CORRESPONDENCE/);
  assert.throws(()=>b.assertCampaignBodyExisting([{is_archived:true}]),/EXISTING_SOURCE/);
  const wrong=clone(s);wrong.recipe='kiwa-campaign-new-alternate-background-grabcut-v3';assert.throws(()=>b.validateCampaignBodySpec(wrong),/SPEC/);
});
test('warm prepared read reuses exact four approved bytes and native evidence without rerender',async()=>{
  const original=await readFile('.local/calibration/gallery/bytes/'+s.sourceCrop.sha256),p=await b.prepareCachedCampaignBody(original,s);
  b.assertCampaignBodyEntry(e,s,{original,...p});assert.ok(p.high.equals(p.medium));assert.equal(p.transform.imageAlphaOpenings,1);assert.equal(s.connectionReady,false);assert.equal(s.imageScaleVerified,false);
  const wrong=clone(e);wrong.reviewEnvelope.processed.nativeSha256='0'.repeat(64);assert.throws(()=>b.assertCampaignBodyEntry(wrong,s),/NATIVE_APPROVAL/);
});
test('native QA file must remain the exact approved native cutout',async()=>{
  const changed=clone(manifest);changed.entries[0].nativeFile=e.preparedFiles.high;b.assertCampaignBodyManifest(changed);
  try{await assert.rejects(b.prepareCachedCampaignBody(await readFile('.local/calibration/gallery/bytes/'+s.sourceCrop.sha256),s),/NATIVE_BYTES/);}finally{b.assertCampaignBodyManifest(manifest);}
});
test('Pearl override preserves old v2 behavior and v4 exception stays exact-source-only',()=>{
  const code="const m=await import('./scripts/campaign-body-dispatch.mjs');const id='"+e.draftId+"',v4={draftId:id,recipe:'kiwa-campaign-new-alternate-closed-loop-grabcut-v4'};process.stdout.write(JSON.stringify([m.isCampaignBodyPearlOverride(id,v4),m.isCampaignBodyPearlOverride('foreign',v4),m.isCampaignBodyPearlOverride(id,undefined),m.isCampaignBodyPearlOverride('foreign',{recipe:'kiwa-campaign-new-alternate-grabcut-v2'})]));";
  for(const mode of ['alternate-closed-loop-v4','alternate-background-v3']){
    const values=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{windowsHide:true,env:{...process.env,ACC_CAMPAIGN_BODY_VARIANT:mode},encoding:'utf8'}));assert.deepEqual(values,[mode==='alternate-closed-loop-v4',false,false,true]);
  }
});
