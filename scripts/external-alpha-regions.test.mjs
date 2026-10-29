import test from 'node:test';
import assert from 'node:assert/strict';
import {externalAlphaPixels,applyExternalAlphaRgba} from './external-alpha-regions.mjs';
const crop={left:100,top:200,width:20,height:20};
const body=[[108,208],[116,208],[116,216],[108,216]];
const corner=[[100,200],[104,200],[104,204],[100,204]];
test('native centers; only selected alpha changes, protected and other RGBA stay exact',()=>{
 const source=Buffer.alloc(20*20*4);for(let i=0;i<source.length;i++)source[i]=i%251;
 const before=Buffer.from(source),r=applyExternalAlphaRgba(source,crop,body,[corner]);
 assert.equal(r.excludedCount,16);assert.equal(r.protectedCount,64);assert.deepEqual(source,before);
 for(let p=0;p<400;p++)for(let c=0;c<4;c++)assert.equal(r.data[p*4+c],r.excluded[p]&&c===3?0:source[p*4+c]);
});
test('polygon order and repeated overlapping regions form the same union',()=>{
 const other=[[100,200],[106,200],[100,206]],a=externalAlphaPixels(crop,body,[corner,other]),b=externalAlphaPixels(crop,body,[other,corner,corner]);
 assert.deepEqual(a.excluded,b.excluded);
});
test('protection includes uncertain edge plus Chebyshev guard',()=>{
 const touching=[[100,200],[107,200],[107,207],[100,207]];
 assert.throws(()=>externalAlphaPixels(crop,body,[touching]),/PROTECTED_REGION_CONTACT/);
 assert.throws(()=>externalAlphaPixels(crop,body,[[[100,200],[120,200],[120,220],[100,220]]]),/PROTECTED_REGION_CONTACT/);
});
test('interior island without a four-neighbour route to outer edge is rejected',()=>{
 assert.throws(()=>externalAlphaPixels(crop,body,[[[101,201],[103,201],[103,203],[101,203]]]),/INTERIOR_COMPONENT/);
});
test('invalid polygons and empty or out-of-bounds inputs fail closed',()=>{
 const cases=[[],[[100.5,200],[104,200],[100,204]],[[99,200],[104,200],[100,204]],[[100,200],[104,204],[100,204],[104,200]],[[100,200],[104,200],[104,204],[100,204],[100,200]],[[100,200],[102,200],[104,200]]];
 for(const p of cases)assert.throws(()=>externalAlphaPixels(crop,body,[p]),/EXTERNAL_ALPHA_/);
 assert.throws(()=>externalAlphaPixels(crop,body,[]),/REGIONS/);
 assert.throws(()=>externalAlphaPixels({...crop,width:0},body,[corner]),/CROP/);
 assert.throws(()=>applyExternalAlphaRgba(Buffer.alloc(2),crop,body,[corner]),/RGBA/);
});
test('a diagonal-only connection does not rescue an interior excluded component',()=>{
 const island=[[102,202],[104,202],[104,204],[102,204]],edge=[[100,200],[102,200],[102,202],[100,202]];
 assert.throws(()=>externalAlphaPixels(crop,body,[island,edge]),/INTERIOR_COMPONENT/);
});
