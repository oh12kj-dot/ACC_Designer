import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {prepareCachedTeardrop} from './prepared-teardrop-cache.mjs';
import {prepareTeardropRange} from './prepare-teardrop-range.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
async function fixture(run){
 const cacheRoot=await mkdtemp('.local/calibration/nominal/teardrop-cache-test-');
 const original=await sharp({create:{width:450,height:450,channels:3,background:'white'}}).composite([{input:await sharp({create:{width:140,height:220,channels:3,background:'#6699aa'}}).png().toBuffer(),left:260,top:110}]).png().toBuffer();
 const spec={recipe:'kiwa-teardrop-published-hw-range-box-v1',layoutSizeChoice:'published-H-W-range-axis-midpoints-for-layout-only',candidateManifestSha256:'synthetic fixture',publishedBodyHeightRangeMm:{min:8,max:13},publishedBodyWidthRangeMm:{min:8,max:11},widthMm:9.5,heightMm:10.5,photoRotationDegrees:0,photoPose:'synthetic cache test only',photoOrientationReview:{version:'reviewed-teardrop-photo-pose-v1',rotationDegrees:0,reason:'fixture upright'},sourceCrop:{sha256:hash(original),sourceWidth:450,sourceHeight:450,crop:{left:230,top:0,width:220,height:450},reviewed:true,reviewedBy:'fixture',reviewedAt:'fixture',coordinateConvention:'unrotated-decoded-raster-integer-pixels'}};
 try{await run({original,spec,cacheRoot});}finally{for(const name of await readdir(cacheRoot))await unlink(cacheRoot+'/'+name);await rmdir(cacheRoot);}
}
test('reuses complete prepared bytes across independent calls without processing again',()=>fixture(async({original,spec,cacheRoot})=>{
 let calls=0;const prepare=async(...args)=>{calls++;return prepareTeardropRange(...args);};
 const first=await prepareCachedTeardrop(original,spec,{cacheRoot,prepare}),second=await prepareCachedTeardrop(original,spec,{cacheRoot,prepare});
 assert.equal(calls,1);assert.deepEqual(second,first);
}));
test('separates BOX and full review identity, refuses changed source bytes before processing',()=>fixture(async({original,spec,cacheRoot})=>{
 let calls=0;const prepare=async(...args)=>{calls++;return prepareTeardropRange(...args);};
 await prepareCachedTeardrop(original,spec,{cacheRoot,prepare});
 await prepareCachedTeardrop(original,{...spec,widthMm:7,heightMm:6.5},{cacheRoot,prepare});
 await prepareCachedTeardrop(original,{...spec,photoPose:'different explicit review'},{cacheRoot,prepare});
 assert.equal(calls,3);await assert.rejects(prepareCachedTeardrop(Buffer.from('changed source'),spec,{cacheRoot,prepare}),/SOURCE_MISMATCH/);assert.equal(calls,3);
}));
test('refuses corrupt prepared bytes or metadata without silently reprocessing',()=>fixture(async({original,spec,cacheRoot})=>{
 await prepareCachedTeardrop(original,spec,{cacheRoot});const file=cacheRoot+'/'+(await readdir(cacheRoot))[0],bytes=await readFile(file),entry=JSON.parse(bytes);
 entry.payload.high=Buffer.from('corrupt pixels').toString('base64');await writeFile(file,JSON.stringify(entry));
 const prepare=()=>{throw Error('MUST_NOT_REPROCESS');};await assert.rejects(prepareCachedTeardrop(original,spec,{cacheRoot,prepare}),/CACHE_INVALID/);
 const meta=JSON.parse(bytes);meta.payload.width++;await writeFile(file,JSON.stringify(meta));await assert.rejects(prepareCachedTeardrop(original,spec,{cacheRoot,prepare}),/CACHE_INVALID/);
 await writeFile(file,'interrupted JSON');await assert.rejects(prepareCachedTeardrop(original,spec,{cacheRoot,prepare}),/CACHE_INVALID/);
}));
