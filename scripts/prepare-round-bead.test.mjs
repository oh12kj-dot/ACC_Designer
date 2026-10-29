import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {prepareRoundBead} from './prepare-round-bead.mjs';
test('selects the round bead bounds on black and white backgrounds without certifying scale',async()=>{
 for(const background of ['black','white']){const b=await sharp(Buffer.from(`<svg width="120" height="120"><rect width="120" height="120" fill="${background}"/><circle cx="60" cy="60" r="35" fill="blue"/></svg>`)).png().toBuffer();let selected;
 const p=await prepareRoundBead(b,4,async bytes=>{selected=await sharp(bytes).metadata();return{originalMime:'image/png',width:256,mmPerPx:4/256,transform:{imageScaleVerified:false}};});
 assert.equal(p.transform.sourceBackground,background);assert.ok(selected.width<90&&selected.height<90);assert.equal(p.transform.imageScaleVerified,false);assert.equal(p.width*p.mmPerPx,4);
 }
});
test('rejects elongated source bounds before the sphere preparation callback',async()=>{
 const b=await sharp(Buffer.from('<svg width="120" height="120"><rect width="120" height="120" fill="black"/><rect x="10" y="50" width="100" height="20" fill="blue"/></svg>')).png().toBuffer();
 await assert.rejects(prepareRoundBead(b,4,()=>{throw new Error('unexpected preparation');}),/ROUND_BEAD_PHOTO_REVIEW_REQUIRED/);
});
