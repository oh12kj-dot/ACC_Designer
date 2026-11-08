import{test}from'node:test';import assert from'node:assert/strict';import{selectedHoleTable,variantHolePayload}from'./variant-hole-table.mjs';
test('selects the actual size row rather than the general published range',()=>{const text='穴のサイズは約0.7〜1mmです。＜穴のサイズ＞4mm…約0.7mm6mm・8mm…約0.8mm10mm、12mm…約1mm',d={name:'プレシオサパール MAXIMA 片穴 クリーム',sizeText:'10mm',description:text};assert.equal(selectedHoleTable(d,text).holeMm,1);assert.equal(selectedHoleTable({...d,sizeText:'8mm'},text).holeMm,.8);assert.throws(()=>selectedHoleTable({...d,sizeText:'11mm'},text));});

test('rejects a reference that conflicts with a native hole diameter without changing the aggregate',()=>{
 const text='＜穴のサイズ＞4mm…約0.7mm6mm・8mm…約0.8mm10mm、12mm…約1mm';
 const d={id:'kiwa:1:2',sku:'s',name:'プレシオサパール MAXIMA 片穴 クリーム',sizeText:'10mm',description:text};
 const a={part:{sku:'s',metadata:{sourceDraftId:d.id},hole_diameter_mm:.8}},before=structuredClone(a);
 assert.throws(()=>variantHolePayload(d,a,text,{},'2026-11-07'),/EXISTING_NATIVE_HOLE_CONFLICT/);
 assert.deepEqual(a,before);
 a.part.hole_diameter_mm=1;
 assert.equal(variantHolePayload(d,a,text,{},'2026-11-07').part.metadata.supplierOpeningSizeReview.minMm,1);
 a.part.hole_diameter_mm=null;
 assert.equal(variantHolePayload(d,a,text,{},'2026-11-07').part.metadata.supplierOpeningSizeReview.presence,'blind');
 assert.throws(()=>selectedHoleTable(d,text.replace('約1mm','約2mm')));
});
