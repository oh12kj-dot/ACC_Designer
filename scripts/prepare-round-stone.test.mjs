import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {prepareRoundStone} from './prepare-round-stone.mjs';
test('extracts the top stone of reviewed triples and preserves single photos',async()=>{
 const image=await sharp(Buffer.from('<svg width="200" height="200"><rect width="200" height="200" fill="white"/><circle cx="100" cy="50" r="25" fill="blue"/><circle cx="55" cy="130" r="25" fill="red"/><circle cx="145" cy="130" r="25" fill="red"/></svg>')).png().toBuffer();
 let selected;
 const prepare=async bytes=>{selected=bytes;return {transform:{imageScaleVerified:false},width:256};};
 const p=await prepareRoundStone(image,4,prepare);
 assert.equal(p.transform.selection,'top-frontal-stone-of-reviewed-triple');
 const {data,info}=await sharp(selected).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=info.channels)assert.ok(!(data[i]>200&&data[i+1]<80&&data[i+2]<80),'bottom red stones must not appear');
 const single=await sharp({create:{width:80,height:80,channels:3,background:'blue'}}).png().toBuffer();
 assert.equal((await prepareRoundStone(single,4,prepare)).transform.selection,'reviewed-single-frontal-stone');
});
test('rejects a third separated row of stones',async()=>{
 const image=await sharp(Buffer.from('<svg width="100" height="200"><rect width="100" height="200" fill="white"/><circle cx="50" cy="30" r="20" fill="blue"/><circle cx="50" cy="100" r="20" fill="red"/><circle cx="50" cy="170" r="20" fill="green"/></svg>')).png().toBuffer();
 await assert.rejects(prepareRoundStone(image,4,async()=>({transform:{}})),/ROUND_STONE_PHOTO_REVIEW_REQUIRED/);
});
