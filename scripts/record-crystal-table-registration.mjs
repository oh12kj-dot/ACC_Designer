import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {nominalCrystalTable} from '../.local/calibration/nominal/crystal-table.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const registryBytes=await readFile('.local/parts/parts.json'),registry=JSON.parse(registryBytes);
const table=JSON.parse(await readFile('src/data/kiwa-ppss-nominal-table.json'));
const ep='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(ep).then(r=>r.json());
const select=async name=>{const r=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query:{table:name,columns:'*'}})}).then(r=>r.json());if(r.error)throw new Error(r.error.message);return r.data;};
const parts=await select('parts'),assets=new Map((await select('part_image_assets')).map(a=>[a.id,a]));
const drafts=new Map(registry.parts.map(p=>[p.id,p]));
const photos=new Set(JSON.parse(await readFile('.local/calibration/nominal/table-image-decisions.json')).filter(p=>!p.blocked).map(p=>p.sha256));
const promoted=[];
for(const p of parts.filter(p=>!p.is_archived&&p.metadata?.nominalPlacement?.recipe==='kiwa-round-crystal-table-nominal-v1')){
 const e=p.metadata.nominalPlacement,spec=nominalCrystalTable(drafts.get(e.sourceDraftId),table),a=assets.get(p.image_asset_id);
 if(!spec||!photos.has(e.photoSha256)||a?.source_transform?.version!=='nominal-round-stone-photo-v1')throw new Error('TABLE_IDENTITY_OR_IMAGE_MISMATCH');
 for(const [k,v] of Object.entries(spec))if(!isDeepStrictEqual(e[k],v))throw new Error('TABLE_REFERENCE_MISMATCH');
 promoted.push({draftId:e.sourceDraftId,partId:p.id,assetId:p.image_asset_id,photoSha256:e.photoSha256,chartLabel:e.chartLabel,chartRows:e.chartRows,diameterRangeMm:e.diameterRangeMm});
}
const result={version:1,checkedAt:new Date().toISOString(),workspaceId:boot.workspaceId,registrySha256:digest(registryBytes),reference:table,promoted,registered:promoted.length,existing47PartPolicy:'preserved by registration verification',placementMode:'published-nominal',connectionReady:0};
await writeFile('.local/calibration/nominal/crystal-table-promotions.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({registered:promoted.length,referenceTableSha256:table.sha256}));
