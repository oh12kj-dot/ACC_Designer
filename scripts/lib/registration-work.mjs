import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,rename,open,unlink,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
export const sha256=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error('REGISTRATION_WORK_'+code);};
export function labelGrammar(label){
 const text=label.normalize('NFKC').replace(/\s/g,'');
 if(/^(約)?H\d+(\.\d+)?×W\d+(\.\d+)?mm$/.test(text))return'published-H-W-pair';
 if(/^(約)?W\d+(\.\d+)?×H\d+(\.\d+)?mm$/.test(text))return'published-W-H-pair';
 if(/^(約)?\d+(\.\d+)?×\d+(\.\d+)?mm$/.test(text))return'unlabeled-pair';
 if(/^(約)?\d+(\.\d+)?mm$/.test(text))return'scalar';
 return'other';
}
export function sourceBinding(d,c){
 if(!d?.id||!c?.sha256||!d.imageUrls.includes(c.url)||!c.productIds?.includes(d.productId))fail('OWN_ASSOCIATION');
 return{draftId:d.id,sourceObjectSha256:sha256(JSON.stringify(d)),descriptionSha256:sha256(d.description),productId:d.productId,variantId:d.variantId,sku:d.sku,category:d.category,rawLabel:d.sizeText,labelGrammar:labelGrammar(d.sizeText),photoUrl:c.url,photoSha256:c.sha256,photoWidth:c.pixelWidth,photoHeight:c.pixelHeight};
}
export function buildInventory({registry,registrySha256,pending,summary,captures,guards}){
 if(summary.registrySha256!==registrySha256||summary.placementRemaining!==pending.length)fail('SNAPSHOT');
 const ds=new Map(registry.parts.map(d=>[d.id,d]));if(ds.size!==registry.parts.length||new Set(pending.map(r=>r.draftId)).size!==pending.length)fail('DUPLICATE');
 const rows=pending.map(r=>{const d=ds.get(r.draftId);if(!d)fail('UNKNOWN_SOURCE');const binding=sourceBinding(d,captures.get(d.imageUrls[0])),blocked=guards.get(d.id)??[],cohortKey=sha256(JSON.stringify([binding.descriptionSha256,d.category,[...d.tags].sort(),binding.labelGrammar]));return{...binding,cohortKey,primaryReason:r.reason,restrictions:blocked,state:blocked.length?'held':'untriaged',revision:0};});
 return{version:1,registrySha256,workspaceId:summary.workspaceId??null,sqlCheckedAt:summary.sqlCheckedAt,initialPendingCount:rows.length,rows};
}
const time=t=>typeof t==='string'&&Number.isFinite(Date.parse(t));
export function assertSemanticRule(rule,registrySha256,d,c){
 const binding=sourceBinding(d,c),member=rule?.members?.find(r=>r.draftId===d.id);
 if(!rule||rule.version!==1||rule.registrySha256!==registrySha256||rule.recipe!=='kiwa-own-photo-category-box-v1'||rule.meaning!=='whole-product-body'||rule.reviewed!==true||!rule.reviewedBy?.trim()||!time(rule.reviewedAt)||!rule.reason?.trim()||!rule.bodyQuote?.trim()||!d.description.includes(rule.bodyQuote)||rule.descriptionSha256!==binding.descriptionSha256||rule.category!==d.category||!['charm','other'].includes(d.category)||rule.labelKind!==binding.labelGrammar||!['scalar','unlabeled-pair','published-H-W-pair','published-W-H-pair'].includes(rule.labelKind)||!d.tags.includes(rule.tag)||!member||JSON.stringify(member)!==JSON.stringify(binding)||new Set(rule.members.map(m=>m.draftId)).size!==rule.members.length)fail('SEMANTIC_RULE');
 return binding;
}
export function assertReviewEnvelope(e,binding){
 if(!e||e.version!==1||JSON.stringify(e.sourceBinding)!==JSON.stringify(binding)||!e.specSha256?.match(/^[0-9a-f]{64}$/)||!e.imageKeySha256?.match(/^[0-9a-f]{64}$/))fail('REVIEW_BINDING');
 const a=e.original,p=e.processed;
 if(!a?.reviewed||!p?.reviewed||!a.reviewedBy?.trim()||!p.reviewedBy?.trim()||!time(a.reviewedAt)||!time(p.reviewedAt)||Date.parse(p.reviewedAt)<=Date.parse(a.reviewedAt)||a.sha256!==binding.photoSha256||p.originalSha256!==binding.photoSha256||p.specSha256!==e.specSha256||p.imageKeySha256!==e.imageKeySha256||!['high','medium','thumbnail'].every(k=>p[k+'Sha256']?.match(/^[0-9a-f]{64}$/)))fail('REVIEW_INCOMPLETE');
 return e;
}
const next={untriaged:'evidence_ready',evidence_ready:'semantic_reviewed',semantic_reviewed:'original_reviewed',original_reviewed:'processed_reviewed',processed_reviewed:'adopted',adopted:'queued',queued:'saved',saved:'verified'};
export function advanceRow(row,to,evidence={}){
 if(Object.keys(evidence).some(k=>k in sourceBindingKeys||['state','revision','restrictions','cohortKey','primaryReason'].includes(k)))fail('IMMUTABLE_BINDING');
 if(row.restrictions?.length||row.state==='held'||row.state==='stale'||next[row.state]!==to)fail('STATE_TRANSITION');
 if(to==='semantic_reviewed'&&!evidence.ruleSha256?.match(/^[0-9a-f]{64}$/))fail('RULE_REQUIRED');
 if(['processed_reviewed','adopted','queued'].includes(to))assertReviewEnvelope(evidence.reviewEnvelope??row.reviewEnvelope,Object.fromEntries(Object.keys(sourceBindingKeys).map(k=>[k,row[k]])));
 if(to==='saved'&&(!evidence.partId||!evidence.assetId))fail('SAVE_READBACK_REQUIRED');
 if(to==='verified'&&(!evidence.verificationSha256?.match(/^[0-9a-f]{64}$/)||evidence.rerunCreated!==0))fail('VERIFICATION_REQUIRED');
 return{...row,...evidence,state:to,revision:row.revision+1};
}
const sourceBindingKeys={draftId:1,sourceObjectSha256:1,descriptionSha256:1,productId:1,variantId:1,sku:1,category:1,rawLabel:1,labelGrammar:1,photoUrl:1,photoSha256:1,photoWidth:1,photoHeight:1};
export async function saveLedger(path,ledger,expectedHash=null){
 await mkdir(dirname(path),{recursive:true});const lock=await open(path+'.lock','wx');let temp;
 try{let old;try{old=await readFile(path);}catch(e){if(e.code!=='ENOENT')throw e;}if((old?sha256(old):null)!==expectedHash)fail('LEDGER_CONFLICT');temp=path+'.'+randomUUID()+'.tmp';const bytes=JSON.stringify(ledger,null,2);await writeFile(temp,bytes,{flag:'wx'});await rename(temp,path);return sha256(bytes);}finally{if(temp)await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});await lock.close();await unlink(path+'.lock');}
}
