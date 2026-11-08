import{test}from'node:test';import assert from'node:assert/strict';import sharp from'sharp';import{removeReviewedWhiteVoid,removeReviewedBackgroundVoids}from'./lib/reviewed-background-void.mjs';
test('reviewed background seed removes only the enclosed white component, without altering any RGB or metal',async()=>{
 const b=await sharp(Buffer.from('<svg width="40" height="40"><rect width="40" height="40" fill="white"/><circle cx="20" cy="20" r="14" fill="black"/><circle cx="20" cy="20" r="9" fill="white"/></svg>')).png().toBuffer(),review={seed:[20,20],backgroundVoidReviewed:true,reviewedBy:'fixture',reviewedAt:'2026-11-05'};
 const r=await removeReviewedWhiteVoid(b,review);const out=await sharp(r.high).ensureAlpha().raw().toBuffer();assert.equal(out[(20*40+20)*4+3],0);assert.equal(out[(20*40+7)*4+3],255);
 await assert.rejects(removeReviewedWhiteVoid(b,{...review,seed:[7,20]}),/VOID_SEED_NOT_OPAQUE_WHITE/);
 await assert.rejects(removeReviewedWhiteVoid(b,{...review,seed:[2,2]}),/VOID_COMPONENT_REACHED_FRAME_EDGE/);
 await assert.rejects(removeReviewedWhiteVoid(b,{...review,backgroundVoidReviewed:false}));
});
test('two reviewed voids remain distinct and preserve white metal highlights outside their masks',async()=>{
 const b=await sharp(Buffer.from('<svg width="80" height="80"><rect width="80" height="80" fill="black"/><circle cx="25" cy="25" r="10" fill="white"/><circle cx="55" cy="55" r="10" fill="white"/><rect x="5" y="60" width="15" height="5" fill="white"/></svg>')).png().toBuffer();
 const review=seed=>({seed,backgroundVoidReviewed:true,reviewedBy:'fixture',reviewedAt:'2026-11-05'}),r=await removeReviewedBackgroundVoids(b,[review([25,25]),review([55,55])]),raw=await sharp(r.high).ensureAlpha().raw().toBuffer();
 assert.equal(raw[(25*80+25)*4+3],0);assert.equal(raw[(55*80+55)*4+3],0);assert.equal(raw[(62*80+10)*4+3],255);
 await assert.rejects(removeReviewedBackgroundVoids(b,[review([25,25]),review([26,26])]),/COMPONENTS_NOT_DISTINCT/);
 await assert.rejects(removeReviewedBackgroundVoids(b,[review([25,25]),review([40,40])]),/REGION_NOT_WHITE/);
 const pixelData=await sharp(b).ensureAlpha().raw().toBuffer();pixelData[(55*80+55)*4+3]=128;const partial=await sharp(pixelData,{raw:{width:80,height:80,channels:4}}).png().toBuffer();await assert.rejects(removeReviewedBackgroundVoids(partial,[review([25,25]),review([55,55])]),/UNREVIEWED_PARTIAL_ALPHA/);
 const again=await removeReviewedBackgroundVoids(r.high,[review([25,25]),review([55,55])]);assert.equal(again.removedPixels,0);
});
