import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {nominalRoundBead} from '../.local/calibration/nominal/round-bead.mjs';
const registryBytes=await readFile('.local/parts/parts.json'),drafts=new Map(JSON.parse(registryBytes).parts.map(p=>[p.id,p]));
const ep='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(ep).then(r=>r.json());
const select=async table=>{const r=await fetch(ep,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify({action:'select',query:{table,columns:'*'}})}).then(r=>r.json());if(r.error)throw new Error(r.error.message);return r.data;};
const parts=await select('parts'),assets=new Map((await select('part_image_assets')).map(a=>[a.id,a]));
const decisions=JSON.parse(await readFile('.local/calibration/nominal/round-bead-image-decisions.json')),photos=new Map(decisions.filter(d=>!d.blocked).map(d=>[d.sha256,d]));
const promoted=[],byFamily={};
for(const p of parts.filter(p=>!p.is_archived&&p.metadata?.nominalPlacement?.recipe==='kiwa-round-bead-nominal-v1')){
 const e=p.metadata.nominalPlacement,d=drafts.get(e.sourceDraftId),spec=nominalRoundBead(d),a=assets.get(p.image_asset_id),t=a?.source_transform,review=photos.get(e.photoSha256);
 if(!spec||!review||t?.version!=='nominal-reviewed-round-bead-v1'||t.sourceBackground!==review.transform.sourceBackground||t.publishedDiameterMm!==spec.diameterMm||p.width_mm!==spec.diameterMm||p.height_mm!==spec.diameterMm)throw new Error('ROUND_BEAD_IDENTITY_OR_LAYOUT_MISMATCH');
 for(const [k,v] of Object.entries(spec))if(!isDeepStrictEqual(e[k],v))throw new Error('ROUND_BEAD_SPEC_MISMATCH:'+k);
 for(const k of ['imageScaleVerified','variantAppearanceVerified','connectionReady'])if(e[k]!==false||t[k]!==false)throw new Error('ROUND_BEAD_CONFIDENCE_MISMATCH');
 const family=d.name.startsWith('チェコ')?'CzechRound':'NaturalRound';byFamily[family]=(byFamily[family]??0)+1;
 promoted.push({draftId:e.sourceDraftId,partId:p.id,assetId:p.image_asset_id,photoSha256:e.photoSha256,diameterMm:spec.diameterMm});
}
const result={checkedAt:new Date().toISOString(),workspaceId:boot.workspaceId,registrySha256:createHash('sha256').update(registryBytes).digest('hex'),registered:promoted.length,byFamily,promoted,connectionReady:0,scaleVerified:false};
await writeFile('.local/calibration/nominal/round-bead-promotions.json',JSON.stringify(result,null,2));console.log(JSON.stringify({registered:result.registered,byFamily}));
