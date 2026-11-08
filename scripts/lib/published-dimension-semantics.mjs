import assert from 'node:assert/strict';

// Published dimensions retain their scope. They never calibrate the photo box.
export function publishedMeasurements(e) {
  const rows = [];
  const add = (meaning, field, approximate = false) => {
    assert.ok(Number.isFinite(e[field]) && e[field] > 0, `Invalid ${field}`);
    rows.push({meaning, valueMm: e[field], approximate});
  };
  const partFields = {};
  switch (e.kind) {
    case 'official-eye-pin-length-only': add('shaft-length-below-eye', 'lengthMm'); break;
    case 'official-clasp-number-approximate-only':
      add('overall-height', 'approximateHeightMm', true); add('overall-width', 'approximateWidthMm', true); break;
    case 'official-design-pin-approximate-only':
      add('head-ball-diameter', 'approximateHeadDiameterMm', true); break;
    case 'official-screw-clip-dimensions-only': add('lower-clip-height', 'approximateClipHeightMm', true); break;
    case 'official-spring-ring-main-diameter-only': add('main-ring-diameter-excluding-lever-and-attached-eye', 'mainRingDiameterMm', !!e.approximate); break;
    case 'official-stainless-ring-dimensions-only':
      add('outer-diameter', 'outerDiameterMm'); add('wire-diameter', 'wireDiameterMm');
      add('inner-diameter', 'approximateInnerDiameterMm', true);
      assert.ok(e.outerDiameterMm > 2 * e.wireDiameterMm);
      partFields.outer_diameter_mm = e.outerDiameterMm; partFields.wire_diameter_mm = e.wireDiameterMm; break;
    case 'official-end-cap-dimensions-only':
      add('tube-inner-diameter-not-eye-hole', 'innerDiameterMm', !!e.innerDiameterApproximate);
      add('overall-height-including-eye', 'approximateOverallHeightMm', true); break;
    case 'official-coil-inner-label-only': add('published-ring-inner-diameter-label', 'publishedInnerDiameterMm'); break;
    case 'official-wire-gauge-approximate-only': add('wire-diameter', 'approximateWireDiameterMm', true); break;
    case 'official-bead-size-label-only': add('published-size-axis-unconfirmed', 'publishedSizeMm'); break;
    case 'official-oval-diagram-dimensions-only':
      add('outer-width', 'outerWidthMm'); add('outer-height', 'outerHeightMm');
      add('wire-diameter', 'wireDiameterMm'); add('inner-height', 'approximateInnerHeightMm', true);
      assert.ok(e.outerWidthMm > 2 * e.wireDiameterMm && e.outerHeightMm > 2 * e.wireDiameterMm);
      partFields.wire_diameter_mm = e.wireDiameterMm; break;
    case 'official-snap-clasp-widths-only': add('front-body-width', 'bodyWidthMm'); add('front-total-width-including-eyes', 'totalWidthMm'); break;
    case 'official-ball-diameter-only':
      add('ball-diameter', 'publishedDiameterMm', !!e.approximate); add('hole-diameter-position-unconfirmed', 'approximateHoleDiameterMm', true); break;
    case 'official-cup-chain-stone-width-only': add('stone-width-not-chain-pitch-or-length', 'approximateStoneWidthMm', true); break;
    default: throw Error(`Unsupported evidence: ${e.kind}`);
  }
  return {measurements: rows, partFields};
}
