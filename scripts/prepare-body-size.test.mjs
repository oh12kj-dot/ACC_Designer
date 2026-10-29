import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {prepareBodySize} from './prepare-body-size.mjs';
test('preserves non-circular aspect and internal white highlights inside a square layout box',async()=>{
 const input=await sharp(Buffer.from('<svg width="160" height="160"><rect width="160" height="160" fill="white"/><rect x="20" y="30" width="120" height="100" fill="blue"/><circle cx="80" cy="80" r="10" fill="white"/></svg>')).png().toBuffer();
 const p=await prepareBodySize(input,4);const {data,info}=await sharp(p.high).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(p.transform.resizeFit,'contain-with-transparent-padding');assert.equal(p.transform.physicalHeightVerified,false);assert.equal(p.width*p.mmPerPx,4);
 assert.equal(data[(128*info.width+128)*4+3],255,'internal highlight must remain');assert.equal(data[3],0,'outside padding must be transparent');
});
test('rejects unexpected elongated bounds instead of fabricating a square physical body',async()=>{
 const input=await sharp(Buffer.from('<svg width="160" height="160"><rect width="160" height="160" fill="white"/><rect x="10" y="60" width="140" height="20" fill="blue"/></svg>')).png().toBuffer();
 await assert.rejects(prepareBodySize(input,4),/BODY_PHOTO_REVIEW_REQUIRED/);
});
