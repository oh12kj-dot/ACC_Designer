import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolCategoryPayload,assertToolTargetsUnreferenced} from './tool-category-review.mjs';

test('requires exact identity and positive role evidence without changing physical or source data',()=>{
 const d={id:'kiwa:1:2',productId:'1',variantId:'2',sku:'s',name:'ビーズマット',sourceUrl:'https://kiwaseisakujo.jp/products/g-tools-adhesives-cases-cases-011?variant=2',category:'bead',categoryBasis:'old',sizeText:'30cm',description:'ビーズワークなどの作業に便利なマットです。'};
 const a={part:{category:'bead',sku:'s',metadata:{sourceDraftId:d.id,keep:'unchanged'}}},current={id:1,variants:[{id:2,sku:'s',option1:'30cm'}],visibleText:d.description},before=structuredClone({d,a});
 const payload=toolCategoryPayload(d,a,current,{},'2026-11-07');assert.equal(payload.part.category,'other');assert.equal(payload.part.metadata.keep,'unchanged');assert.deepEqual(Object.keys(payload.part).sort(),['category','metadata']);assert.equal(payload.part.metadata.supplierCategoryReview.physicalFactsGenerated,false);assert.deepEqual({d,a},before);
 assert.throws(()=>toolCategoryPayload(d,a,{...current,variants:[]},{},''),/CURRENT_VARIANT_REQUIRED/);
 assert.throws(()=>toolCategoryPayload(d,a,{...current,variants:[{id:2,sku:'changed',option1:'30cm'}]},{},''),/CURRENT_SKU_CONFLICT/);
 assert.throws(()=>toolCategoryPayload(d,a,{...current,visibleText:'beads'},{},''),/TOOL_ROLE_BODY_CONFLICT/);
 assert.throws(()=>toolCategoryPayload({...d,sourceUrl:d.sourceUrl.replace('kiwaseisakujo.jp','example.com')},a,current,{},''));
 assertToolTargetsUnreferenced({x:{nodes:[{part_id:'unrelated'}]}},['p']);
 assert.throws(()=>assertToolTargetsUnreferenced({x:{nodes:[{part_id:'p'}]}},['p']),/CATEGORY_CORRECTION_REFERENCED_PART/);
 assert.throws(()=>assertToolTargetsUnreferenced({x:{paths:[{partId:'p'}]}},['p']),/CATEGORY_CORRECTION_REFERENCED_PART/);
});
