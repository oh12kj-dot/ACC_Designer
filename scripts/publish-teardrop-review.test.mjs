import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {publishTeardropReview} from './publish-teardrop-review.mjs';
import {teardropRangeImageKey} from './prepare-teardrop-range.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const spec={recipe:'kiwa-teardrop-published-hw-range-box-v1',widthMm:9.5,heightMm:10.5,photoRotationDegrees:0,photoPose:'synthetic fixture',photoOrientationReview:{version:'reviewed-teardrop-photo-pose-v1',rotationDegrees:0,reason:'synthetic upright'},sourceCrop:{sha256:hash('synthetic source')}};
const row=draftId=>({draftId,spec,result:{high:Buffer.from('synthetic prepared bytes '+draftId)},highSha256:hash('synthetic prepared bytes '+draftId),keySha256:hash(teardropRangeImageKey(spec.sourceCrop.sha256,spec)),processedReviewed:true});
async function fixture(run){const outputRoot=await mkdtemp('.local/calibration/nominal/teardrop-package-test-');try{await run(outputRoot);}finally{for(const dir of await readdir(outputRoot)){const path=join(outputRoot,dir);for(const file of await readdir(path))await unlink(join(path,file));await rmdir(path);}await rmdir(outputRoot);}}
const input=outputRoot=>({outputRoot,prepared:[row('A'),row('B')],skipped:[],registrySha256:'synthetic registry'});
test('same complete package is reused and never grants processed approval',()=>fixture(async root=>{
 const first=await publishTeardropReview(input(root)),before=await readFile(join(first.output,'prepared.json'));
 const second=await publishTeardropReview(input(root));assert.equal(second.output,first.output);assert.equal(second.reused,true);assert.deepEqual(await readFile(join(second.output,'prepared.json')),before);
 const manifest=JSON.parse(before);assert.ok(manifest.prepared.every(p=>p.processedReviewed===false));assert.equal(manifest.prepared[0].filename,'0.png');
}));
test('changed hold membership gets a different immutable directory without replacing index0',()=>fixture(async root=>{
 const before=await publishTeardropReview(input(root)),after=await publishTeardropReview({...input(root),prepared:[row('B')],skipped:[{draftId:'A',reason:'held'}]});
 assert.notEqual(after.output,before.output);assert.equal(JSON.parse(await readFile(join(before.output,'prepared.json'))).prepared[0].draftId,'A');assert.equal(JSON.parse(await readFile(join(after.output,'prepared.json'))).prepared[0].draftId,'B');
 assert.equal((await readFile(join(before.output,'0.png'))).toString(),'synthetic prepared bytes A');
}));
test('rejects changed pixels, manifest and incoming hash without overwriting the package',()=>fixture(async root=>{
 const p=await publishTeardropReview(input(root)),file=join(p.output,'0.png');await writeFile(file,'tampered');await assert.rejects(publishTeardropReview(input(root)),/PACKAGE_CHANGED/);assert.equal((await readFile(file)).toString(),'tampered');
 await writeFile(file,row('A').result.high);const manifest=join(p.output,'prepared.json');await writeFile(manifest,'tampered JSON');await assert.rejects(publishTeardropReview(input(root)),/PACKAGE_CHANGED/);
 await assert.rejects(publishTeardropReview({...input(root),prepared:[{...row('A'),highSha256:'bad'}]}),/OUTPUT_HASH/);
}));
test('concurrent publication exposes one complete package and removes only its own staging files',()=>fixture(async root=>{
 const [a,b]=await Promise.all([publishTeardropReview(input(root)),publishTeardropReview(input(root))]);assert.equal(a.output,b.output);assert.equal([a,b].filter(x=>x.reused).length,1);assert.equal((await readdir(root)).length,1);const m=JSON.parse(await readFile(join(a.output,'prepared.json')));for(const r of m.prepared)assert.equal(hash(await readFile(join(a.output,r.filename))),r.highSha256);
}));
