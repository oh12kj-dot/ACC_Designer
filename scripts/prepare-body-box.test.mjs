import {test} from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {prepareBodyBox} from './prepare-body-box.mjs';
test('rotates a portrait projection into a pair box without stretching its aspect',async()=>{
 const b=await sharp(Buffer.from('<svg width="120" height="120"><rect width="120" height="120" fill="white"/><rect x="40" y="30" width="40" height="60" fill="blue"/><circle cx="60" cy="60" r="8" fill="white"/></svg>')).png().toBuffer();
 const p=await prepareBodyBox(b,{widthMm:8,heightMm:4,photoRotationDegrees:90,layoutSizeChoice:'published-body-size-pair-box-for-layout-only'});assert.equal(p.width*p.mmPerPx,8);assert.equal(p.height*p.mmPerPx,4);
 const {data,info}=await sharp(p.high).raw().toBuffer({resolveWithObject:true});let min=info.width,max=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){min=Math.min(min,x);max=Math.max(max,x);}
 assert.ok(Math.abs((max-min+1)/info.height-1.5)<.05);assert.equal(data[3],0);const c=(Math.floor(info.height/2)*info.width+Math.floor(info.width/2))*4;assert.equal(data[c+3],255);assert.equal(data[c],255);assert.equal(p.transform.physicalWidthVerified,false);
});
test('represents decimal label ratios with one uniform mm per pixel',async()=>{
 const b=await sharp({create:{width:120,height:120,channels:3,background:'blue'}}).png().toBuffer(),p=await prepareBodyBox(b,{widthMm:4,heightMm:2.9,photoRotationDegrees:0,layoutSizeChoice:'published-body-size-pair-box-for-layout-only'});
 assert.ok(Math.abs(p.height*p.mmPerPx-2.9)<1e-9);assert.equal(p.width*p.mmPerPx,4);
});
