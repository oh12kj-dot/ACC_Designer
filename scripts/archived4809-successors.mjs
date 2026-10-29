import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';import{isDeepStrictEqual}from'node:util';
const hash=x=>createHash('sha256').update(x).digest('hex');
const bytes=await readFile(new URL('./fixtures/archived4809-successors.json',import.meta.url));
export const archived4809PolicySha256='c74b44ed8c3172d16987eac63c352e86162c9532d62c6e0d45808a1aeff4e915';
if(hash(bytes)!==archived4809PolicySha256)throw Error('ARCHIVED4809_POLICY_CHANGED');
const fixture=JSON.parse(bytes),scope=new Map(fixture.rows.map(r=>[r.sourceId,r]));
if(scope.size!==20||new Set(fixture.rows.map(r=>r.oldPartId)).size!==20)throw Error('ARCHIVED4809_COUNT');
export const isArchived4809Successor=id=>scope.has(id);
export function isProtected4809Legacy(row){return scope.get(row?.metadata?.sourceDraftId)?.oldPartId===row?.id;}
export async function assert4809PolicyInputs(workspaceId){if(workspaceId!==fixture.workspaceId||hash(await readFile('.local/setup/archived4809-successor-proposal.json'))!==fixture.proposalSha256)throw Error('ARCHIVED4809_SCOPE_CHANGED');}
export function partition4809Rows(rows,sourceId){
 const binding=scope.get(sourceId);if(!binding)throw Error('ARCHIVED4809_OUTSIDE_SCOPE');
 const legacy=rows.filter(p=>p.id===binding.oldPartId),active=rows.filter(p=>p.id!==binding.oldPartId);
 if(legacy.length!==1||!isDeepStrictEqual(legacy[0],binding.legacyRow)||active.length>1||active.some(p=>p.is_archived||p.metadata?.sourceDraftId!==sourceId||p.source_url!==binding.legacyRow.source_url||p.metadata?.nominalPlacement?.recipe!=='kiwa-official-dimension-own-photo-finite-v1'))throw Error('ARCHIVED4809_EXISTING_SOURCE_CONFLICT');
 return{legacy:legacy[0],active:active[0]};
}
