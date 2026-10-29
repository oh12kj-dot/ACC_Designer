import type {RegisteredPartDraft} from '../types/registeredPart';
type Table={sourceUrl:string;sha256:string;scopeUrl:string;scopeCaptureSha256:string;ranges:Record<string,{min:number;max:number;rows:string[];origin:string}>};
const cuts=['1028','1088','1122','2000','2028','2058','2088','2038HF','2078HF'];
export function nominalCrystalTable(draft:Pick<RegisteredPartDraft,'name'|'sizeText'>,table:Table) {
 const name=draft.name.normalize('NFKC');
 const title=/^(?:\[大袋\])?貴和クリスタル\s+([^\s]+)(?:\s|$)/.exec(name)?.[1];
 const declared=title?.split('/');if(!declared?.length||declared.some(c=>!c.startsWith('#')||!cuts.includes(c.slice(1))))return undefined;
 const label=draft.sizeText.normalize('NFKC').replace(/\s/g,'');
 const match=/^((?:PP|SS)\d+)((?:\([^()]+\))*)$/.exec(label);if(!match)return undefined;
 const annotations=[...match[2].matchAll(/\(([^()]+)\)/g)].map(m=>m[1]);
 if(annotations.some(a=>!['F','unf','RC','店舗限定'].includes(a)&&!(a.startsWith('#')&&cuts.includes(a.slice(1)))))return undefined;
 const range=table.ranges[match[1]];
 if(!range||![range.min,range.max].every(n=>Number.isFinite(n)&&n>0&&n<=40)||range.max<range.min||!range.rows.length)return undefined;
 return{recipe:'kiwa-round-crystal-table-nominal-v1',diameterMm:Number(((range.min+range.max)/2).toFixed(4)),diameterRangeMm:{min:range.min,max:range.max,approximate:true},publishedSizeLabel:draft.sizeText,sizeChoice:'midpoint-for-layout-only',chartLabel:match[1],chartRows:range.rows,chartRangeOrigin:range.origin,referenceTableUrl:table.sourceUrl,referenceTableSha256:table.sha256,referenceScopeUrl:table.scopeUrl,referenceScopeCaptureSha256:table.scopeCaptureSha256,declaredCutTokens:declared,actualCutIdentity:'unverified',shapeBasis:'round-frontal-projection-of-allowed-crystal-cuts'};
}
