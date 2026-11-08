import test from 'node:test';import assert from 'node:assert/strict';
import {provisionalPayload} from './lib/provisional-registration.mjs';
test('provisional registration preserves source data without interpreting physical dimensions or purchase price',()=>{
 const d={id:'kiwa:1:2',name:'chain',category:'chain',sizeText:'0.5×100mm',tags:['original'],purchase:{unit:'length',lengthMm:1000},price:123,imageUrls:['https://example.com/photo'],sourceUrl:'https://example.com/item',sourceFetchedAt:'2026-11-03T00:00:00Z'};
 const p=provisionalPayload(d,'asset','2026-11-03T00:00:00Z','batch');
 assert.equal(p.part.width_mm,10);assert.equal(p.part.geometry_kind,'node');assert.equal(p.part.metadata.provisionalRegistration.physicalDimensionsVerified,false);assert.equal(p.part.metadata.nominalPlacement,undefined);assert.equal(p.purchase_spec,undefined);assert.equal(p.path_spec,undefined);assert.deepEqual(p.connection_points,[]);assert.deepEqual(p.through_holes,[]);assert.deepEqual(p.source_snapshots[0].raw_fields.sourceDraft,d);assert.deepEqual(p.part.tags,['original']);assert.equal(p.part.metadata.publishedPrice,123);
 assert.throws(()=>provisionalPayload({...d,id:'bad'},'asset','now','batch'),/PROVISIONAL_INPUT/);
});
