import assert from'node:assert/strict';
export const miyukiDbRecipe='miyuki-db11-family-reference-dimensions-v1';
export function miyukiDbDimensionPayload(draft,aggregate,refs,at){
 assert.ok(draft.tags.includes('MIYUKIデリカビーズ'));
 const name=draft.name.normalize('NFKC').split(' / ')[0];
 assert.match(name,/^MIYUKIデリカビーズ\s+DB(?:\d+(?:-\d+)?|22L)$/);
 if(name.endsWith('DB22L'))assert.ok(refs.some(r=>r.file==='miyuki-colorcodes.html'));
 assert.equal(draft.sizeText.normalize('NFKC').trim(),'約1.6mm');
 const p=aggregate.part;assert.equal(p.metadata.sourceDraftId,draft.id);assert.equal(p.sku,draft.sku);assert.ok(p.outer_diameter_mm===null||p.outer_diameter_mm===1.6);assert.equal(p.hole_diameter_mm,null);assert.deepEqual(aggregate.through_holes,[]);assert.deepEqual(aggregate.connection_points,[]);
 assert.ok(refs.length>=4&&refs.every(r=>r.sha256&&r.url&&r.fetchedAt));
 const review={version:1,recipe:miyukiDbRecipe,sourceDraftId:draft.id,productId:draft.productId,variantId:draft.variantId,sku:draft.sku,manufacturer:'MIYUKI',family:'Delica Beads DB',manufacturerSize:'11/0',outsideDiameterMm:1.6,axialLengthMm:1.3,holeDiameterMm:{min:.8,max:.85},approximate:true,scope:'manufacturer-family-reference',individualMeasurementVerified:false,functionalConnectionReady:false,coatingAndLotVariation:true,evidenceReferences:refs,reviewedAt:at};
 const note='メーカー系列参考寸法（MIYUKI DB 11/0）: 外径約1.6mm・軸方向長さ約1.3mm・穴径約0.80〜0.85mm。加工・ロットによる差があります。商品写真の実寸校正や穴位置・適合の確定値ではありません。';
 return{part:{outer_diameter_mm:1.6,metadata:{...p.metadata,manufacturerDimensionReview:review},notes:[p.notes,note].filter(Boolean).join('\n')},source_snapshots:[{source_url:refs[0].url,fetched_at:refs[0].fetchedAt,parser_version:miyukiDbRecipe,raw_fields:{manufacturerDimensionReview:review,sourceDraftId:draft.id},status:'partial'}]};
}
