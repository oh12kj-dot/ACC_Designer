import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {nominalBodySize} from '../.local/calibration/nominal/body-size.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const registryBytes=await readFile('.local/parts/parts.json'),registry=JSON.parse(registryBytes);
const ep='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(ep).then(r=>r.json());
const select=async table=>{const r=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query:{table,columns:'*'}})}).then(r=>r.json());if(r.error)throw new Error(r.error.message);return r.data;};
const parts=await select('parts'),assets=new Map((await select('part_image_assets')).map(a=>[a.id,a]));
const drafts=new Map(registry.parts.map(p=>[p.id,p]));
const photos=new Set(JSON.parse(await readFile('.local/calibration/nominal/body-size-image-decisions.json')).filter(p=>!p.blocked).map(p=>p.sha256));
const promoted=[],byCut={};
for(const p of parts.filter(p=>!p.is_archived&&p.metadata?.nominalPlacement?.recipe==='kiwa-bead-body-size-layout-v1')){
 const e=p.metadata.nominalPlacement,spec=nominalBodySize(drafts.get(e.sourceDraftId)),a=assets.get(p.image_asset_id),t=a?.source_transform;
 if(!spec||!photos.has(e.photoSha256)||t?.version!=='nominal-body-size-box-photo-v1'||t.resizeFit!=='contain-with-transparent-padding'||'diameterMm' in e)throw new Error('BODY_IDENTITY_OR_IMAGE_MISMATCH');
 for(const [k,v] of Object.entries(spec))if(!isDeepStrictEqual(e[k],v))throw new Error('BODY_REFERENCE_MISMATCH:'+k);
 for(const k of ['sizeAxisInterpretationVerified','physicalWidthVerified','physicalHeightVerified'])if(e[k]!==false||t[k]!==false)throw new Error('BODY_CONFIDENCE_MISMATCH');
 if(p.width_mm!==spec.publishedBodySizeMm||p.height_mm!==spec.publishedBodySizeMm||!p.notes?.includes('サイズが表す軸は未確認'))throw new Error('BODY_LAYOUT_OR_NOTICE_MISMATCH');
 byCut[e.cut]=(byCut[e.cut]??0)+1;
 promoted.push({draftId:e.sourceDraftId,partId:p.id,assetId:p.image_asset_id,photoSha256:e.photoSha256,cut:e.cut,publishedBodySizeMm:e.publishedBodySizeMm,layoutSizeChoice:e.layoutSizeChoice});
}
const result={version:1,checkedAt:new Date().toISOString(),workspaceId:boot.workspaceId,registrySha256:digest(registryBytes),promoted,registered:promoted.length,byCut,placementMode:'published-nominal',connectionReady:0,physicalAxesVerified:false};
await writeFile('.local/calibration/nominal/body-size-promotions.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({registered:result.registered,byCut}));
