import { prepareNominalNewInputGrabcut } from './prepare-new-input-grabcut.mjs';
import { createNativeCropAttemptGuard } from './new-input-crop-attempt-guard.mjs';
export { newGrabcutVersion, runtimePath } from './prepare-new-input-grabcut.mjs';

// Create once after freezing all original reviews, then reuse for the whole cohort.
// This does not replace persistent negatives, source gates or processed-image review.
export function createNewInputCohortPreparer(prepare = prepareNominalNewInputGrabcut) {
  if (typeof prepare !== 'function') throw Error('NEW_INPUT_COHORT_PREPARER');
  const guard = createNativeCropAttemptGuard();
  return (original, spec) => guard.run(spec, () => prepare(original, spec));
}
