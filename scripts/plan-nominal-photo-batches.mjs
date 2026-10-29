// Discovery only: candidates are not approved dimensions, images, or Parts.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readJsonLines} from './read-jsonl.mjs';
const base='.local/calibration/nominal/';
const bytes=await readFile('.local/parts/parts.json');
const registry=JSON.parse(bytes),remaining=JSON.parse(await readFile(base+'remaining.json'));
const sha256=createHash('sha256').update(bytes).digest('hex');
if(sha256!==remaining.summary.registrySha256)throw Error('STALE_REMAINING_REGISTRY');
const ids=new Set(remaining.remaining.filter(r=>r.family==='catalog:charm:チャーム'||r.family==='catalog:other:アクリル').map(r=>r.draftId));
const captures=new Map();for await(const r of readJsonLines('.local/calibration/gallery/records.jsonl'))captures.set(r.url,r);
const candidates=[],holds=[],photos=new Map();
for(const draft of registry.parts){
 if(!ids.has(draft.id))continue;
 const label=draft.sizeText.normalize('NFKC').replace(/\s/g,'');
 let match=/^(約)?(\d+(?:\.\d+)?)(?:×(\d+(?:\.\d+)?))?mm$/.exec(label);
 let kind=match?.[3]?'unlabeled-pair':'scalar',values=match?[Number(match[2]),Number(match[3]??match[2])]:null;
 if(!match){
  match=/^(約)?H(\d+(?:\.\d+)?)×W(\d+(?:\.\d+)?)mm$/.exec(label);
  if(match){kind='published-H-W-pair';values=[Number(match[3]),Number(match[2])];}
  else{match=/^(約)?W(\d+(?:\.\d+)?)×H(\d+(?:\.\d+)?)mm$/.exec(label);if(match){kind='published-W-H-pair';values=[Number(match[2]),Number(match[3])];}}
 }
 if(!values||!values.every(v=>Number.isFinite(v)&&v>0&&v<=40&&Math.abs(v*40-Math.round(v*40))<1e-8)){holds.push({draftId:draft.id,reason:'LABEL_GRAMMAR_OR_BOUNDS_REVIEW_REQUIRED',publishedSizeText:draft.sizeText});continue;}
 const sourceUrl=draft.imageUrls[0],capture=captures.get(sourceUrl);
 if(!capture?.sha256||!capture.productIds?.includes(draft.productId)){holds.push({draftId:draft.id,reason:'OWN_SOURCE_ASSOCIATION_REQUIRED'});continue;}
 const candidate={draftId:draft.id,productId:draft.productId,name:draft.name,category:draft.category,tags:draft.tags,publishedSizeText:draft.sizeText,labelKind:kind,proposedLayoutBox:{widthMm:values[0],heightMm:values[1]},ownDescription:draft.description,sourceUrl,sourceSha256:capture.sha256,reviewed:false,physicalAxesVerified:false,photoScaleVerified:false};
 candidates.push(candidate);
 if(!photos.has(capture.sha256))photos.set(capture.sha256,{sha256:capture.sha256,sourceUrls:new Set(),draftIds:[],reviewed:false});
 const photo=photos.get(capture.sha256);photo.sourceUrls.add(sourceUrl);photo.draftIds.push(draft.id);
}
const summary={checkedAt:new Date().toISOString(),registrySha256:sha256,considered:ids.size,candidates:candidates.length,distinctPhotos:photos.size,held:holds.length,registered:0,scope:'Discovery only. Exact labels and own gallery associations; BODY meaning, category, single-object crop and photo pose require review. H/W is a proposed new branch, never legacy promotion.'};
if(candidates.length+holds.length!==ids.size)throw Error('INCOMPLETE_CANDIDATE_PARTITION');
await writeFile(base+'remaining-photo-batch-candidates.json',JSON.stringify({summary,candidates,photos:[...photos.values()].map(p=>({...p,sourceUrls:[...p.sourceUrls]})),holds},null,2));
console.log(JSON.stringify(summary));
