import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJsonLines } from './read-jsonl.mjs';
import { digest } from './lib/reviewed-profile-checks.mjs';
import * as b from './campaign-new-background-bridge.mjs';
const rb=await readFile('.local/parts/parts.json'),registry=JSON.parse(rb),captures=new Map();
for await(const c of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(c.url,c);
await b.assertCampaignBodyInputs(registry,digest(rb),captures);
const manifest=JSON.parse(await readFile('.local/calibration/nominal/campaign-new-background-adopted-v3.json'));
b.assertCampaignBodyManifest(manifest);
const e=manifest.entries[0],s=e.spec,clone=structuredClone;

test('v3 has exact seven-source scope and immutable source-object scope bytes',async()=>{
 const bytes=await readFile('.local/calibration/nominal/background-v3-scope.json');
 const scope=b.assertBackgroundScopeBytes(bytes);assert.equal(scope.rows.length,7);
 for(const row of scope.rows)assert.equal(b.isCampaignBodySource(row.draftId),true);
 assert.equal(b.isCampaignBodySource('kiwa:9573309350180:49607362183460'),false);
 assert.throws(()=>b.assertBackgroundScopeBytes(Buffer.concat([bytes,Buffer.from(' ')])),/FINITE_SCOPE_BYTES/);
});
test('missing background review, unsupported material, noninteger/outside seed rejected',()=>{
 for(const mutate of [p=>p.foregroundReview.backgroundReviewed=false,p=>p.foregroundReview.material='translucent',
   p=>p.foregroundReview.background=[],p=>p.foregroundReview.background[0][0][0]=0,
   p=>p.foregroundReview.background[0][0][1]=1.5,p=>p.sourceCrop.reviewed=false]){
  const p=clone(s);mutate(p);assert.throws(()=>b.assertBackgroundReview(p),/BACKGROUND/);
 }
});
test('v3 background seed or prepared transform cannot be changed after processed approval',()=>{
 const changed=clone(s);changed.originalReview.pixelSpec.foregroundReview.background[0][0][0]++;
 assert.throws(()=>b.validateCampaignBodySpec(changed),/SPEC|APPROVAL/);
 for(const mutate of [x=>x.preparedTransform.foregroundReview.background[0][0][0]++,
   x=>x.preparedTransform.physicalWidthVerified=true]){
  const x=clone(e);mutate(x);assert.throws(()=>b.assertCampaignBodyEntry(x,s),/APPROVAL/);
 }
});
test('v2 recipe/manifest and other variant identity cannot enter v3',async()=>{
 const wrong=clone(s);wrong.recipe='kiwa-campaign-new-alternate-grabcut-v2';
 assert.throws(()=>b.validateCampaignBodySpec(wrong),/SPEC/);
 const r=clone(e.originalReview);r.sourceCorrespondenceReview.sku='foreign';
 assert.throws(()=>b.nominalCampaignBody(e.draft,e.rule,r,e.capture),/SCOPE_OR_CORRESPONDENCE/);
 const bytes=await readFile('.local/calibration/nominal/campaign-new-input-adopted-v2.json'),before=digest(bytes);
 assert.throws(()=>b.assertCampaignBodyManifest(JSON.parse(bytes)),/MANIFEST/);
 assert.equal(digest(await readFile('.local/calibration/nominal/campaign-new-input-adopted-v2.json')),before);
 b.assertCampaignBodyManifest(manifest);
});
test('warm v3 reads approved new files only; original and all processed hashes bound',async()=>{
 const original=await readFile('.local/calibration/gallery/bytes/'+s.sourceCrop.sha256),p=await b.prepareCachedCampaignBody(original,s);
 b.assertCampaignBodyEntry(e,s,{original,...p});assert.deepEqual(p.high,p.medium);
 const changedApproval=clone(e);changedApproval.reviewEnvelope.processed.highSha256='0'.repeat(64);
 assert.throws(()=>b.assertCampaignBodyEntry(changedApproval,s,{original,...p}),/APPROVED_BYTES/);
 const altered=Buffer.from(original);altered[0]^=1;
 await assert.rejects(b.prepareCachedCampaignBody(altered,s),/APPROVED_BYTES/);
});
test('new source asset key and pixel key use v3 while all geometry verification stays false',()=>{
 assert.equal(JSON.parse(b.campaignBodyImageKey(s.sourceCrop.sha256,s)).version,'kiwa-campaign-new-alternate-background-grabcut-v3');
 assert.match(b.campaignBodyAssetKey(e,s),/^[a-f0-9]{64}$/);
 for(const key of ['physicalWidthVerified','physicalHeightVerified','sizeAxisInterpretationVerified','imageScaleVerified','variantAppearanceVerified','connectionReady'])assert.equal(s[key],false);
 const payload=b.campaignBodyExpectedPayload(e.draft,s);
 assert.equal(payload.part.metadata.nominalPlacement.recipe,b.campaignBodyRecipe);
 assert.deepEqual(payload.part.metadata.publishedPurchase,e.draft.purchase);
});
