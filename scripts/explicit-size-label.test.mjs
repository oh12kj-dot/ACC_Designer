import {test} from 'node:test';
import assert from 'node:assert/strict';
import {explicitSizeLabel as parse} from './lib/explicit-size-label.mjs';
test('named dimensions keep scope, approximate status and full raw label',()=>{
  assert.deepEqual(parse('線径0.35mm').partFields,{wire_diameter_mm:.35});
  const approx=parse('線径 約0.3mm');assert.deepEqual(approx.partFields,{});assert.equal(approx.measurements[0].approximate,true);
  assert.equal(parse('中(内径約3mm)').measurements[0].meaning,'published-inner-diameter-context-specific');
  assert.deepEqual(parse('内径約8×6mm').measurements.map(m=>m.valueMm),[8,6]);
  assert.deepEqual(parse('幅10mm/厚さ2mm').measurements.map(m=>m.valueMm),[10,2]);
  for(const label of ['外径2.5mm/内径1.5mm','外径2.5/内径1.5mm'])assert.deepEqual(parse(label).measurements.map(m=>m.valueMm),[2.5,1.5]);
});
test('partial matches, unlabeled axes, mixed inner labels and sale quantities stay unresolved',()=>{
  for(const label of ['線径約0.7mm/約2.5mm','線径0.35mm 幅約2mm','0.8×5mm(内径)','約5(内径)×6.5mm','20mm','1m(約330粒)','内径0mm','内径-2mm','内径2mmφ、65×6mm','幅約6mm 約13号'])assert.equal(parse(label),null,label);
});
