import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {registrationApi} from './lib/local-registration-api.mjs';
import {sha256} from './minimum-sale-units.mjs';

// Read-only contact sheets. Producing a sheet never records a visual judgment.
const root='.local/setup/all-part-visual-review-20261107';
const source='.local/setup/all-parts-review-20261106';
await mkdir(root+'/images',{recursive:true});await mkdir(root+'/sheets',{recursive:true});
const snapshotBytes=await readFile(source+'/current-snapshot.json');
const snapshot=JSON.parse(snapshotBytes),ledger=JSON.parse(await readFile(source+'/review-ledger.json'));
const assets=new Map(snapshot.tables.part_image_assets.map(a=>[a.id,a]));
const reviews=new Map(ledger.rows.map(r=>[r.partId,r]));
const receipts=new Map((await readFile(source+'/asset-integrity-effective.jsonl','utf8')).trim().split('\n').map(JSON.parse).map(r=>[r.assetId,r]));
const groups=new Map();
for(const p of snapshot.tables.parts.filter(p=>!p.is_archived).sort((a,b)=>(a.category+'|'+a.name+'|'+a.id).localeCompare(b.category+'|'+b.name+'|'+b.id))){
 const r=reviews.get(p.id);assert.ok(r);
 if(r.image.evidence.visualReviewThisRun.kind!=='not-performed'&&!r.image.evidence.visualReviewThisRun.evidence?.startsWith('../all-part-visual-review-20261107/'))continue;
 const a=assets.get(p.image_asset_id),receipt=receipts.get(a.id);assert.ok(receipt);assert.deepEqual(receipt.issues,[]);
 const key=receipt.images.original.sha256+':'+receipt.images.high.sha256;
 if(!groups.has(key))groups.set(key,{number:groups.size+1,key,originalSha256:receipt.images.original.sha256,highSha256:receipt.images.high.sha256,assetIds:[],parts:[],originalPath:a.original_path,highPath:a.normalized_high_path});
 const g=groups.get(key);if(!g.assetIds.includes(a.id))g.assetIds.push(a.id);
 g.parts.push({id:p.id,assetId:a.id,name:p.name,sku:p.sku,category:p.category,sourceDraftId:r.sourceDraftId,sourceSizeText:r.dimensions.evidence?.sourceSizeText??null,sourceUrl:r.source?.evidence?.sourceUrl??null,widthMm:p.width_mm,heightMm:p.height_mm,geometryKind:p.geometry_kind,priorReview:r.image.evidence.priorReviewBinding});
}
let queue={version:1,snapshotSha256:sha256(snapshotBytes),activeParts:ledger.summary.activeParts,unreviewedParts:[...groups.values()].reduce((n,g)=>n+g.parts.length,0),groups:[...groups.values()],sheetsGeneratedAreNotApprovals:true};
const queuePath=root+'/queue.json';
try{const pinned=JSON.parse(await readFile(queuePath,'utf8'));const live=new Map(snapshot.tables.parts.filter(p=>!p.is_archived).map(p=>[p.id,p]));assert.equal(pinned.activeParts,live.size);for(const group of pinned.groups)for(const row of group.parts){const p=live.get(row.id);assert.ok(p);assert.equal(p.image_asset_id,row.assetId);assert.equal(p.metadata.sourceDraftId,row.sourceDraftId);const receipt=receipts.get(p.image_asset_id);assert.equal(receipt.images.original.sha256,group.originalSha256);assert.equal(receipt.images.high.sha256,group.highSha256);}queue=pinned;}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(queuePath,JSON.stringify(queue),{flag:'wx'});}
const queueBytes=JSON.stringify(queue);
const mode=process.argv[4];assert.ok(mode===undefined||mode==='tools');const selectedQueue=mode==='tools'?queue.groups.filter(g=>g.parts.some(p=>new URL(p.sourceUrl).pathname.startsWith('/products/g-tools-adhesives-cases-'))):queue.groups;
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??1);assert.ok(Number.isSafeInteger(start)&&start>=0&&Number.isSafeInteger(count)&&count>0&&count<=64);
const api=await registrationApi();assert.equal(api.boot.workspaceId,snapshot.workspaceId);
async function bytes(path,hash){const file=root+'/images/'+hash;try{const b=await readFile(file);assert.equal(sha256(b),hash);return b;}catch(e){if(e.code!=='ENOENT')throw e;}const response=await fetch(api.endpoint+'?image='+encodeURIComponent(path),{signal:AbortSignal.timeout(45000)});assert.ok(response.ok);const b=Buffer.from(await response.arrayBuffer());assert.equal(sha256(b),hash);await writeFile(file,b,{flag:'wx'});return b;}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(let sheet=start;sheet<start+count;sheet++){
 const selected=selectedQueue.slice(sheet*16,sheet*16+16);if(!selected.length)break;
 const layers=[];
 for(let i=0;i<selected.length;i++){
  const g=selected[i],x=(i%4)*480,y=Math.floor(i/4)*320;
  const original=await bytes(g.originalPath,g.originalSha256),high=await bytes(g.highPath,g.highSha256);
  for(const [b,left]of [[original,x+4],[high,x+244]])layers.push({input:await sharp(b).resize(232,232,{fit:'contain',background:'#dedede'}).flatten({background:'#dedede'}).png().toBuffer(),left,top:y+3});
  const names=[...new Set(g.parts.map(p=>p.name))],sizes=[...new Set(g.parts.map(p=>p.sourceSizeText).filter(Boolean))];
  const lines=[`${g.number}: original | high; ${g.parts.length} Part`,...names.join(' / ').match(/.{1,37}/gu)?.slice(0,2)??[],sizes.join(' / ').slice(0,70)];
  layers.push({input:Buffer.from(`<svg width="480" height="80"><rect width="480" height="80" fill="white"/>${lines.map((t,j)=>`<text x="5" y="${15+j*18}" font-size="13" font-family="Meiryo">${esc(t)}</text>`).join('')}</svg>`),left:x,top:y+238});
 }
 const path=root+'/sheets/'+(mode==='tools'?'tool-role-':'')+String(sheet).padStart(4,'0')+'.png';await sharp({create:{width:1920,height:Math.ceil(selected.length/4)*320,channels:3,background:'#777'}}).composite(layers).png().toFile(path);
 await writeFile(path+'.json',JSON.stringify({queueSha256:sha256(queueBytes),sheet,groups:selected.map(g=>({number:g.number,key:g.key,partIds:g.parts.map(p=>p.id)})),sheetSha256:sha256(await readFile(path)),domainWrites:0,visualApproval:false}));
 console.log(JSON.stringify({sheet,path,groups:selected.length,parts:selected.reduce((n,g)=>n+g.parts.length,0),domainWrites:0,visualApproval:false}));
}
