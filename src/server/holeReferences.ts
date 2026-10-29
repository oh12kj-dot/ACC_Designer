import{createHash}from'node:crypto';
import manifest from'../data/kiwa-reviewed-hole-diameters.json';
import type{HoleReference}from'../types/domain';
type Row=Record<string,any>;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function reviewedHoleIndex(drafts:Row[],registrySha256:string){
 const result=new Map<string,typeof manifest.entries[number]>();if(registrySha256!==manifest.registrySha256)return result;
 const byId=new Map(drafts.map(d=>[d.id,d]));
 for(const e of manifest.entries){const d=byId.get(e.sourceDraftId);if(!d||d.productId!==e.productId||d.variantId!==e.variantId||d.name!==e.partName||d.sizeText!==e.sizeText||d.sourceUrl!==e.sourceUrl||typeof d.description!=='string'||hash(d.description)!==e.descriptionSha256||!d.description.includes(e.quote)||result.has(e.sourceDraftId))continue;result.set(e.sourceDraftId,e);}
 return result;
}
export function projectHoleReference(part:Row,index:ReturnType<typeof reviewedHoleIndex>):HoleReference|undefined{
 const e=index.get(part.metadata?.sourceDraftId);if(!e||part.id!==e.partId||part.name!==e.partName||part.source_url!==e.sourceUrl)return;
 return{sourceDraftId:e.sourceDraftId,sourceUrl:e.sourceUrl,descriptionSha256:e.descriptionSha256,minMm:e.minMm,maxMm:e.maxMm,approximate:e.approximate,presence:'through',sizeText:e.sizeText,reviewedAt:e.reviewedAt};
}
