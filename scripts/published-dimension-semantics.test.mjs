import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publishedMeasurements as map} from './lib/published-dimension-semantics.mjs';
test('inner labels, subcomponents and approximate values cannot become calibrated body dimensions', () => {
  for (const e of [
    {kind:'official-coil-inner-label-only',publishedInnerDiameterMm:5},
    {kind:'official-eye-pin-length-only',lengthMm:20},
    {kind:'official-cup-chain-stone-width-only',approximateStoneWidthMm:2},
    {kind:'official-wire-gauge-approximate-only',approximateWireDiameterMm:.6},
    {kind:'official-end-cap-dimensions-only',innerDiameterMm:1.7,approximateOverallHeightMm:7}
  ]) assert.deepEqual(map(e).partFields, {});
  assert.equal(map({kind:'official-wire-gauge-approximate-only',approximateWireDiameterMm:.6}).measurements[0].approximate,true);
});
test('only exact ring fields enter native columns and invalid geometry fails closed', () => {
  assert.deepEqual(map({kind:'official-stainless-ring-dimensions-only',outerDiameterMm:4,wireDiameterMm:.6,approximateInnerDiameterMm:2.8}).partFields,{outer_diameter_mm:4,wire_diameter_mm:.6});
  assert.throws(()=>map({kind:'official-stainless-ring-dimensions-only',outerDiameterMm:1,wireDiameterMm:.6,approximateInnerDiameterMm:2.8}));
  assert.throws(()=>map({kind:'unknown',lengthMm:20}));
  assert.throws(()=>map({kind:'official-eye-pin-length-only',lengthMm:NaN}));
});
