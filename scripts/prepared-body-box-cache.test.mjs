import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {prepareBodyBox} from './prepare-body-box.mjs';
import {prepareCachedBodyBox} from './prepared-body-box-cache.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const spec={recipe:'kiwa-czech-own-photo-body-box-v1',widthMm:3,heightMm:3,photoRotationDegrees:0,layoutSizeChoice:'published-body-size-square-box-for-layout-only'};
async function fixture(t){const cacheRoot=await mkdtemp(join(tmpdir(),'acc-body-cache-'));t.after(()=>rm(cacheRoot,{recursive:true,force:true}));const original=await sharp({create:{width:180,height:180,channels:3,background:'white'}}).composite([{input:await sharp({create:{width:95,height:120,channels:3,background:'#2a647a'}}).png().toBuffer(),left:40,top:25}]).png().toBuffer();return{original,cacheRoot};}
test('cold and warm cached bytes preserve the existing body-box renderer exactly',async t=>{const {original,cacheRoot}=await fixture(t),expected=await prepareBodyBox(original,spec);const cold=await prepareCachedBodyBox(original,spec,hash(original),{cacheRoot});const warm=await prepareCachedBodyBox(original,spec,hash(original),{cacheRoot,prepare:()=>{throw Error('MUST_NOT_REPROCESS');}});for(const p of [cold,warm]){for(const k of ['high','medium','thumbnail'])assert.deepEqual(p[k],expected[k]);assert.deepEqual(p.transform,expected.transform);assert.equal(p.mmPerPx,expected.mmPerPx);}});
test('wrong source and unsupported recipe fail before rendering',async t=>{const {original,cacheRoot}=await fixture(t),prepare=()=>{throw Error('UNEXPECTED_RENDER');};await assert.rejects(prepareCachedBodyBox(original,spec,'0'.repeat(64),{cacheRoot,prepare}),/SOURCE_MISMATCH/);await assert.rejects(prepareCachedBodyBox(original,{...spec,recipe:'unknown'},hash(original),{cacheRoot,prepare}),/SPEC_INVALID/);assert.equal((await readdir(cacheRoot)).length,0);});
test('a changed size is a distinct full-spec binding with the correct scale',async t=>{const {original,cacheRoot}=await fixture(t);await prepareCachedBodyBox(original,spec,hash(original),{cacheRoot});const bigger=await prepareCachedBodyBox(original,{...spec,widthMm:4,heightMm:4},hash(original),{cacheRoot});assert.equal((await readdir(cacheRoot)).length,2);assert.equal(bigger.mmPerPx,4/bigger.width);});
test('damaged cached payload fails closed and never re-renders',async t=>{const {original,cacheRoot}=await fixture(t);await prepareCachedBodyBox(original,spec,hash(original),{cacheRoot});const file=join(cacheRoot,(await readdir(cacheRoot))[0]),entry=JSON.parse(await readFile(file));entry.payload.high='AA==';await writeFile(file,JSON.stringify(entry));await assert.rejects(prepareCachedBodyBox(original,spec,hash(original),{cacheRoot,prepare:()=>{throw Error('NO_FALLBACK');}}),/CACHE_INVALID/);});
