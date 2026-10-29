import{test}from'node:test';import assert from'node:assert/strict';import sharp from'sharp';import{canonicalPhoto,sha256,noThroughHoleReview}from'./lib/canonical-photo.mjs';
test('future registrations distinguish explicit own no-hole text from references to other parts',()=>{
 const draft={id:'d',description:'通し穴が開いていないパーツです。専用の石座へ留めます。'},evidence={sourceDraftId:'d',photoSha256:'photo'};
 assert.equal(noThroughHoleReview(draft,evidence,'asset','now').status,'no-through-hole');assert.equal(noThroughHoleReview({...draft,description:'通し穴が開いていない別のパーツに使います。'},evidence,'asset','now'),undefined);
 assert.equal(noThroughHoleReview({...draft,description:'別の通し穴が開いていないパーツに使います。'},evidence,'asset','now'),undefined);assert.equal(noThroughHoleReview(draft,{...evidence,sourceDraftId:'other'},'asset','now'),undefined);
});
test('inverse turn preserves pixels, original bytes and mm per pixel while swapping only the box axes',async()=>{
 const raw=Buffer.from([255,0,0,255,0,255,0,255,0,0,255,255,255,255,0,255,0,255,255,255,255,0,255,255]);
 const high=await sharp(raw,{raw:{width:3,height:2,channels:4}}).png().toBuffer(),original=Buffer.from('unchanged original');const images={original,high,medium:high,thumbnail:high,width:3,height:2,mmPerPx:.5,transform:{photoRotationDegrees:90}},evidence={photoRotationDegrees:90,widthMm:1.5,heightMm:1,publishedSizeOrder:'original'};
 const result=await canonicalPhoto(images,evidence);assert.equal(result.images.original,original);assert.equal(result.images.mmPerPx,.5);assert.equal(result.images.width,2);assert.equal(result.images.height,3);assert.equal(result.evidence.widthMm,1);assert.equal(result.evidence.heightMm,1.5);assert.equal(result.evidence.publishedSizeOrder,'original');assert.equal(evidence.photoRotationDegrees,90);
 const back=await sharp(result.images.high).rotate(90).raw().toBuffer();assert.deepEqual(back,raw);assert.equal(result.images.transform.canonicalPhoto.previousHighSha256,sha256(high));
 assert.equal((await canonicalPhoto(result.images,result.evidence)).images,result.images);
 await assert.rejects(canonicalPhoto({...images,transform:{photoRotationDegrees:0}},evidence),/MISMATCH/);
});
