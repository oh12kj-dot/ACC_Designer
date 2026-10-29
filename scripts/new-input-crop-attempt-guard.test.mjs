import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeCropAttemptGuard, nativeCropAttemptKey } from './new-input-crop-attempt-guard.mjs';
import { createNewInputCohortPreparer } from './prepare-new-input-cohort.mjs';

const spec = (extra = {}) => ({ sourceCrop: { sha256: 'a'.repeat(64),
  crop: { left: 10, top: 20, width: 100, height: 110 } }, photoRotationDegrees: 0,
  widthMm: 2, heightMm: 2.5, ...extra });

test('one failure blocks aliases with changed BOX, version, seeds and review identity', async () => {
  const guard = createNativeCropAttemptGuard(); let calls = 0;
  const first = spec(), before = JSON.stringify(first);
  await assert.rejects(guard.run(first, () => { calls++; throw Error('ROI_BOUNDARY'); }), /ROI_BOUNDARY/);
  for (let i = 0; i < 4; i++) await assert.rejects(guard.run(spec({ widthMm: i + 3,
    heightMm: i + 4, algorithmVersion: 'different-' + i, foregroundReview: { core: [[i, i]] },
    reviewedAt: new Date().toISOString() }), () => { calls++; }), error =>
      error.message === 'NEW_INPUT_CROP_PRIOR_FAILURE_NO_RETRY' &&
      error.priorFailure === 'ROI_BOUNDARY' && error.processingExecuted === false);
  assert.equal(calls, 1); assert.equal(JSON.stringify(first), before);
});

test('concurrent aliases wait for the first failure without starting another operation', async () => {
  const guard = createNativeCropAttemptGuard(); let calls = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const first = guard.run(spec(), async () => { calls++; await barrier; throw Error('TOPOLOGY'); });
  const second = guard.run(spec({ widthMm: 5 }), () => { calls++; });
  release();
  const results = await Promise.allSettled([first, second]);
  assert.equal(calls, 1); assert.equal(results[0].reason.message, 'TOPOLOGY');
  assert.equal(results[1].reason.message, 'NEW_INPUT_CROP_PRIOR_FAILURE_NO_RETRY');
});

test('different original or native crop is independent; no source-wide quality hold', async () => {
  const guard = createNativeCropAttemptGuard();
  await assert.rejects(guard.run(spec(), () => { throw Error('FAIL'); }));
  assert.equal(await guard.run(spec({ sourceCrop: { sha256: 'b'.repeat(64), crop: spec().sourceCrop.crop } }), () => 7), 7);
  assert.equal(await guard.run(spec({ sourceCrop: { ...spec().sourceCrop,
    crop: { ...spec().sourceCrop.crop, left: 11 } } }), () => 8), 8);
});

test('successful preparation permits other BODY frames without changing returned payload', async () => {
  const guard = createNativeCropAttemptGuard(), output = { high: Buffer.from('frozen bytes') };
  assert.equal(await guard.run(spec(), () => output), output);
  assert.equal(await guard.run(spec({ widthMm: 3, heightMm: 3.5 }), () => output), output);
});

test('canonical crop key ignores property ordering and rejects invalid coordinates/rotation', async () => {
  assert.equal(nativeCropAttemptKey(spec()), nativeCropAttemptKey(spec({ sourceCrop: {
    sha256: 'a'.repeat(64), crop: { height: 110, width: 100, top: 20, left: 10 } } })));
  const guard = createNativeCropAttemptGuard(); let calls = 0;
  for (const bad of [spec({ photoRotationDegrees: 90 }), spec({ sourceCrop: { sha256: 'bad' } }),
    spec({ sourceCrop: { ...spec().sourceCrop, crop: { left: 0.5, top: 0, width: 100, height: 100 } } })]) {
    await assert.rejects(guard.run(bad, () => { calls++; }), /ATTEMPT_INVALID/);
  }
  assert.equal(calls, 0);
});

test('cohort renderer adapter blocks four BOX aliases after one invocation; successful bytes pass through', async () => {
  const original = Buffer.from('synthetic untouched input'), before = Buffer.from(original);
  let calls = 0;
  const prepare = createNewInputCohortPreparer((bytes, input) => {
    calls++; assert.equal(bytes, original); assert.equal(input.sourceCrop.sha256, 'a'.repeat(64));
    throw Error('NEW_GRABCUT_WORKER_ROI_BOUNDARY');
  });
  const results = [];
  for (const widthMm of [2, 3, 3.5, 4.5, 5]) {
    try { await prepare(original, spec({ widthMm })); }
    catch (error) { results.push(error); }
  }
  assert.equal(calls, 1); assert.equal(results.length, 5);
  assert.equal(results.filter(e => e.processingExecuted === false).length, 4);
  assert.deepEqual(original, before);
  const frozen = { high: Buffer.from('already calculated payload') };
  assert.equal(await createNewInputCohortPreparer(() => frozen)(original, spec()), frozen);
});
