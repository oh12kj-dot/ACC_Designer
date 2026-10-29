import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readJsonLines} from './read-jsonl.mjs';
import {loadTeardropSelector,planReviewedTeardrops,prepareReviewedTeardrops} from './prepare-reviewed-teardrop.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const root='.local/calibration/nominal/',manifestBytes=await readFile(root+'teardrop-range-candidate-manifest.json'),registryBytes=await readFile('.local/parts/parts.json'),selector=await loadTeardropSelector(),allReviews=JSON.parse(await readFile(root+'teardrop-range-image-decisions.json'));
const review=allReviews.find(r=>r.draftId==='kiwa:8711032996132:46969670795556'),captures=new Map();
for await(const r of readJsonLines('.local/calibration/gallery/records.jsonl'))if(r.url===review.url)captures.set(r.url,r);
const input={manifestBytes,registryBytes,reviews:[review],captures,blocked:new Set(),registeredIds:new Set(),selector};
test('plans a finite own-source review without granting processed approval',()=>{
 const p=planReviewedTeardrops(input);assert.equal(p.ready.length,1);assert.equal(p.ready[0].spec.category,'bead');assert.deepEqual(p.ready[0].spec.sourceCrop.crop,review.crop);
});
test('separate processed approval preserves the exact preparation identity for registration reuse',()=>{
 const raw=planReviewedTeardrops({...input,reviews:[{...review,processedReviewed:false}]}),approved=planReviewedTeardrops({...input,reviews:[{...review,processedReviewed:true}]});
 assert.deepEqual(raw.ready,approved.ready);
});
test('skips registered including archived source IDs and finite holds before preparation',async()=>{
 for(const key of ['registeredIds','blocked']){const p=planReviewedTeardrops({...input,[key]:new Set([review.draftId])});assert.equal(p.ready.length,0);assert.equal(p.skipped.length,1);const rows=await prepareReviewedTeardrops(p,{loadOriginal:()=>{throw Error('MUST_NOT_READ_OR_REPROCESS');}});assert.deepEqual(rows,[]);}
});
test('refuses duplicate, outside scope, mutated registry/manifest and wrong own capture',()=>{
 assert.throws(()=>planReviewedTeardrops({...input,reviews:[review,review]}),/REVIEW_IDS/);
 assert.throws(()=>planReviewedTeardrops({...input,reviews:[{...review,draftId:'kiwa:1:2'}]}),/OUTSIDE_SCOPE/);
 assert.throws(()=>planReviewedTeardrops({...input,manifestBytes:Buffer.from('{}')}),/MANIFEST_HASH/);
 assert.throws(()=>planReviewedTeardrops({...input,registryBytes:Buffer.from('{}')}),/REGISTRY_HASH/);
 assert.throws(()=>planReviewedTeardrops({...input,captures:new Map([[review.url,{...captures.get(review.url),productIds:['other']} ]])}),/RAW_REVIEW_INVALID/);
});
test('binds prepared output hashes but always requires separate processed visual review',async()=>{
 const p=planReviewedTeardrops(input),original=await readFile('.local/calibration/gallery/bytes/'+review.sha256);let calls=0;
 const rows=await prepareReviewedTeardrops(p,{loadOriginal:async()=>original,prepare:async()=>{calls++;return{high:Buffer.from('synthetic output only; not a photo approval')};}});
 assert.equal(calls,1);assert.equal(rows[0].processedReviewed,false);assert.equal(rows[0].highSha256,hash(rows[0].result.high));assert.match(rows[0].keySha256,/^[a-f0-9]{64}$/);
 await assert.rejects(prepareReviewedTeardrops(p,{loadOriginal:async()=>Buffer.from('changed source'),prepare:()=>{throw Error('MUST_NOT_PROCESS');}}),/SOURCE_HASH/);
});
