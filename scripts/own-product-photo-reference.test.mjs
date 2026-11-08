import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import{prepareOwnProductPhotoReference,sha256}from'./lib/own-product-photo-reference.mjs';
test('different product images remain different and cannot borrow a foreign product association',async()=>{
 const make=async color=>sharp({create:{width:120,height:60,channels:3,background:color}}).png().toBuffer();
 const red=await make('#ff0000'),blue=await make('#0000ff'),capture=b=>({url:'https://example.test/photo',productIds:['1'],sha256:sha256(b),pixelWidth:120,pixelHeight:60});
 const a=await prepareOwnProductPhotoReference(red,capture(red),'1'),b=await prepareOwnProductPhotoReference(blue,capture(blue),'1');
 assert.notEqual(sha256(a.high),sha256(b.high));assert.deepEqual(a.original,red);assert.equal(a.transform.crop,null);assert.equal(a.transform.backgroundRemoved,false);assert.equal(a.transform.physicalScale,false);
 await assert.rejects(prepareOwnProductPhotoReference(red,capture(red),'2'),/OWN_PHOTO_SOURCE_BINDING/);
 await assert.rejects(prepareOwnProductPhotoReference(blue,capture(red),'1'),/OWN_PHOTO_SOURCE_BINDING/);
});
