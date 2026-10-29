import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapBounded} from './map-bounded.mjs';
test('caps concurrent jobs and returns every result in source order',async()=>{
 let active=0,peak=0;const seen=[];
 const results=await mapBounded([0,1,2,3,4,5,6],3,async n=>{
  active++;peak=Math.max(peak,active);seen.push(n);
  await new Promise(resolve=>setTimeout(resolve,n===0?20:2));active--;return n*2;
 });
 assert.equal(peak,3);assert.deepEqual(results,[0,2,4,6,8,10,12]);assert.equal(new Set(seen).size,7);
});
test('waits for started work and rejects if any validation fails',async()=>{
 let settled=0;let started=0;
 await assert.rejects(mapBounded([0,1,2,3,4],2,async n=>{
  started++;if(n===0)throw new Error('HASH_MISMATCH');
  await new Promise(resolve=>setTimeout(resolve,10));settled++;
 }),/HASH_MISMATCH/);
 assert.equal(started,2);assert.equal(settled,1);
});
test('rejects invalid limits and handles an empty collection',async()=>{
 for(const limit of [0,17,1.5,NaN])await assert.rejects(mapBounded([],limit,()=>{}),/INVALID_CONCURRENCY/);
 assert.deepEqual(await mapBounded([],8,()=>{}),[]);
});
