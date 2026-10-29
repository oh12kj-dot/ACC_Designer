import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function loadMinimumSalePolicy(registrySha256){
 const bytes=await readFile('src/data/kiwa-minimum-sale-units.json'),manifest=JSON.parse(bytes),actual=createHash('sha256').update(await readFile('.local/parts/parts.json')).digest('hex'),catalog=createHash('sha256').update(await readFile('.local/catalog/catalog.json')).digest('hex');
 if(![1,2].includes(manifest.version)||actual!==manifest.registrySha256||registrySha256&&registrySha256!==actual||catalog!==manifest.catalogSha256)throw Error('MINIMUM_SALE_POLICY_STALE');
 const byDraft=new Map(),byUrl=new Map();for(const g of manifest.groups)for(const m of g.members){if(byDraft.has(m.draftId))throw Error('MINIMUM_SALE_POLICY_DUPLICATE');byDraft.set(m.draftId,g);byUrl.set(m.sourceUrl,m.draftId);}
 return {manifest,byDraft,byUrl,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export function saleRegistrationDecision(draftId,policy){const g=policy.byDraft.get(draftId);if(!g)throw Error('MINIMUM_SALE_SOURCE_UNKNOWN');return g.members.find(m=>m.draftId===draftId)?.excludedReason?{allowed:false,reason:'OBSOLETE_SALE_UNIT_REJECTED'}:g.status==='hold'?{allowed:false,reason:'SALE_GROUP_IDENTITY_REVIEW_REQUIRED'}:g.status==='resolved'&&g.canonicalOfferDraftId!==draftId?{allowed:false,reason:'NON_MINIMUM_SALE_UNIT',canonicalOfferDraftId:g.canonicalOfferDraftId}:{allowed:true};}

export function saleSourceFromRow(row,policy){return row.metadata?.sourceDraftId??policy.byUrl.get(row.source_url);}
