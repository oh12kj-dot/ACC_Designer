import{test}from'node:test';import assert from'node:assert/strict';import{publishedBodyFrame as frame}from'./lib/published-body-photo.mjs';
const d={id:'a',variantId:'v',sku:'s',sourceUrl:'https://example.com',category:'jump_ring'},base={sourceDraftId:'a',variantId:'v',sku:'s',sourceUrl:'https://example.com'};
test('only published outer BODY values become nominal frames, retaining approximate clasp meaning',()=>{
 assert.deepEqual(frame(d,{...base,kind:'official-stainless-ring-dimensions-only',outerDiameterMm:4,wireDiameterMm:.6,approximateInnerDiameterMm:2.8}),{widthMm:4,heightMm:4,approximate:false,layoutSizeChoice:'published-body-frame-representative-photo-only'});
 assert.equal(frame({...d,category:'clasp'},{...base,kind:'official-clasp-number-approximate-only',approximateWidthMm:10,approximateHeightMm:19}).approximate,true);
 for(const kind of ['official-coil-inner-label-only','official-eye-pin-length-only','official-ball-diameter-only'])assert.throws(()=>frame(d,{...base,kind,publishedInnerDiameterMm:5,lengthMm:20,publishedDiameterMm:6}));
 assert.throws(()=>frame(d,{...base,sku:'foreign',kind:'official-stainless-ring-dimensions-only',outerDiameterMm:4}));
 assert.throws(()=>frame(d,{...base,kind:'official-oval-diagram-dimensions-only',outerWidthMm:0,outerHeightMm:4}));
});
