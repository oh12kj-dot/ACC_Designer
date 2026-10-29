// Explicit operator command for the finite, user-authorized cleanup. Never a registration worker.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {stable,sha256,aggregateHash} from './minimum-sale-units.mjs';
const phase=process.argv.find(a=>a.startsWith('--phase='))?.slice(8)??'phase1';if(!/^phase[1-9][0-9]*$/.test(phase))throw Error('INVALID_CLEANUP_PHASE');const folder='.local/calibration/minimum-sale-unit'+(phase==='phase1'?'':'/'+phase),evidenceFile='.ai/evidence/minimum-sale-unit-'+(phase==='phase1'?'':phase+'-')+'cleanup.json',endpoint='http://127.0.0.1:3000/api/local/workspace';
const bytes=await readFile('src/data/kiwa-minimum-sale-units.json'),manifest=JSON.parse(bytes),manifestSha256=sha256(bytes);
if((manifest.phase??'phase1')!==phase)throw Error('CLEANUP_PHASE_MISMATCH');
const boot=await fetch(endpoint).then(r=>r.json());if(boot.workspaceId!==manifest.workspaceId)throw Error('WORKSPACE_MISMATCH');
const call=async body=>{const response=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)});const result=await response.json();if(!response.ok||result.error)throw Error(JSON.stringify(result));return result.data;};
const select=table=>call({action:'select',query:{table,columns:'*'}});
const snapshot=async()=>{const result={checkedAt:new Date().toISOString(),owner:boot.workspaceId};for(const table of ['parts','part_image_assets','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs'])result[table]=await select(table);result.parts=result.parts.map(({selection_reference,...row})=>row);result.designAggregates=[];for(const d of result.designs)result.designAggregates.push(await call({action:'rpc',name:'get_design_aggregate',args:{design_id:d.id},key:randomUUID()}));return result;};
const before=await snapshot(),byId=new Map(before.parts.map(p=>[p.id,p]));
for(const g of manifest.groups.filter(g=>g.cleanup.length))for(const p of [...g.preservedParts,...g.cleanup]){const row=byId.get(p.partId);if(!row||sha256(stable(row))!==p.rowSha256||aggregateHash(before,row)!==p.aggregateSha256)throw Error('PRE_EXECUTION_AGGREGATE_CHANGED:'+p.partId);}
await writeFile(folder+'/pre-execution.json',JSON.stringify(before),{flag:'wx'});
const first=await call({action:'cleanup-minimum-sale-units',manifestSha256});
await writeFile(folder+'/first-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),...first},null,2),{flag:'wx'});
const after=await snapshot(),afterById=new Map(after.parts.map(p=>[p.id,p])),deleted=new Set(first.deleted),archived=new Set(first.archived);
const planned=new Set(manifest.groups.flatMap(g=>g.cleanup.map(p=>p.partId)));
if(first.changed!==planned.size||[...deleted,...archived].some(id=>!planned.has(id))||first.changed!==deleted.size+archived.size||!first.allImageBytesVerified)throw Error('PLAN_RESULT_MISMATCH');
for(const old of before.parts){const current=afterById.get(old.id);if(deleted.has(old.id)){if(current)throw Error('DELETE_READBACK');continue;}if(!current)throw Error('UNPLANNED_DELETE');if(archived.has(old.id)){if(!current.is_archived||stable({...current,is_archived:false,updated_at:null})!==stable({...old,is_archived:false,updated_at:null}))throw Error('ARCHIVE_READBACK');}else if(stable(current)!==stable(old))throw Error('UNPLANNED_PART_CHANGE');}
if(after.parts.length!==before.parts.length-deleted.size)throw Error('PART_COUNT');
const tableHash=rows=>sha256(stable([...rows].sort((a,b)=>stable(a).localeCompare(stable(b)))));
for(const table of ['part_image_assets','part_user_state','designs','designAggregates'])if(tableHash(before[table])!==tableHash(after[table]))throw Error('PROTECTED_READBACK:'+table);
for(const table of ['part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots'])if(tableHash(before[table].filter(r=>!deleted.has(r.part_id)))!==tableHash(after[table]))throw Error('CHILD_READBACK:'+table);
const hashes={};for(const name of ['registry','catalog']){const path=name==='registry'?'.local/parts/parts.json':'.local/catalog/catalog.json';hashes[name]=sha256(await readFile(path));if(hashes[name]!==manifest[name+'Sha256'])throw Error('SOURCE_CHANGED');}
await writeFile(folder+'/after.json',JSON.stringify(after),{flag:'wx'});
const summary={checkedAt:new Date().toISOString(),manifestSha256,beforeActive:before.parts.filter(p=>!p.is_archived).length,afterActive:after.parts.filter(p=>!p.is_archived).length,deleted:deleted.size,archived:archived.size,parts:after.parts.length,assets:after.part_image_assets.length,designs:after.designs.length,protectedState:first.protectedState,allImageBytesVerified:first.allImageBytesVerified,hashes,verified:true};
await mkdir('.ai/evidence',{recursive:true});await writeFile(evidenceFile,JSON.stringify(summary,null,2));
const retry=await call({action:'cleanup-minimum-sale-units',manifestSha256});if(retry.changed!==0||stable(retry.protectedState)!==stable(first.protectedState))throw Error('RETRY_CHANGED');
summary.retryChanged=retry.changed;summary.retryVerifiedAt=new Date().toISOString();await writeFile(evidenceFile,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
