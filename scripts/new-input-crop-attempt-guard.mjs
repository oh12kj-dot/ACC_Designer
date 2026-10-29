// Per-cohort failure guard. Persisted negatives and finite eligibility remain mandatory.
// BOX, renderer/review versions and seed changes cannot make a failed native crop new.
export function nativeCropAttemptKey(spec) {
  const source = spec?.sourceCrop, crop = source?.crop;
  if (!/^[a-f0-9]{64}$/.test(source?.sha256 ?? '') || spec.photoRotationDegrees !== 0 ||
      !crop || !['left', 'top', 'width', 'height'].every(k => Number.isSafeInteger(crop[k])) ||
      crop.left < 0 || crop.top < 0 || crop.width < 8 || crop.height < 8) {
    throw Error('NEW_INPUT_CROP_ATTEMPT_INVALID');
  }
  return JSON.stringify([source.sha256, crop.left, crop.top, crop.width, crop.height, 0]);
}

export function createNativeCropAttemptGuard() {
  const failures = new Map(), active = new Map();
  return {
    async run(spec, operation) {
      const key = nativeCropAttemptKey(spec);
      if (typeof operation !== 'function') throw Error('NEW_INPUT_CROP_ATTEMPT_OPERATION');
      // Serialize aliases of one native crop, including different BODY frames.
      while (active.has(key)) await active.get(key);
      if (failures.has(key)) {
        const error = Error('NEW_INPUT_CROP_PRIOR_FAILURE_NO_RETRY');
        error.priorFailure = failures.get(key);
        error.processingExecuted = false;
        throw error;
      }
      const task = Promise.resolve().then(operation).catch(error => {
        failures.set(key, String(error?.message ?? error));
        throw error;
      });
      const settled = task.then(() => undefined, () => undefined);
      active.set(key, settled);
      try { return await task; }
      finally { if (active.get(key) === settled) active.delete(key); }
    }
  };
}
