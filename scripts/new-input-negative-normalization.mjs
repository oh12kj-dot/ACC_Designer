import{readFile}from'node:fs/promises';import{createHash}from'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function normalizeOpaqueNegatives(entries,prepared){
 const lookup=new Map();for(const e of prepared){const s=e.spec;if(!s?.sourceCrop?.sha256||!s.sourceCrop.crop)continue;const signature=hash(JSON.stringify({renderer:'nominal-crystal-body-box-photo-v1',sha256:s.sourceCrop.sha256,crop:s.sourceCrop.crop,rotation:0,widthMm:s.widthMm,heightMm:s.heightMm}));lookup.set(signature,{draftId:e.draftId,sourcePhotoSha256:s.sourceCrop.sha256,crop:s.sourceCrop.crop,widthMm:s.widthMm,heightMm:s.heightMm});}
 return entries.map(n=>{if(!n.inputSignature||n.cropSignature||n.photoSha256||n.sourcePhotoSha256)return n;const recovered=lookup.get(n.inputSignature);if(!recovered)throw Error('NEW_INPUT_UNRESOLVED_OPAQUE_NEGATIVE');return{...n,...recovered,recoveredFromFrozenPrepared:true};});
}

export function negativeBlocksInput(n,sha256,crop,widthMm,heightMm){
 const hashes=[n.photoSha256,n.sourcePhotoSha256,n.hashes?.original].filter(Boolean),cropSignature=hash(JSON.stringify({sha256,crop,rotation:0})),legacy=hash(JSON.stringify({renderer:'nominal-crystal-body-box-photo-v1',sha256,crop,rotation:0,widthMm,heightMm})),plain=hash(JSON.stringify({sha256,crop,rotation:0,widthMm,heightMm}));
 if(n.cropSignature===cropSignature||n.inputSignature===legacy||n.inputSignature===plain)return true;
 if(!hashes.includes(sha256))return false;
 if(n.scope==='photo'||(!n.crop&&!n.cropSignature&&!n.inputSignature))return true;
 return !!n.crop&&JSON.stringify(n.crop)===JSON.stringify(crop);
}

export async function loadNormalizedNewInputNegatives(){const paths=['.local/calibration/nominal/campaign-body-negative-inputs.json','.local/calibration/nominal/new-input-cutout-negative-inputs.json','.local/setup/jump-ring-work-prepared/prepared.json','.local/setup/work-natural-prepared/prepared.json'],bytes=await Promise.all(paths.map(p=>readFile(p))),parsed=bytes.map(b=>JSON.parse(b)),entries=normalizeOpaqueNegatives([...parsed[0].entries,...parsed[1].entries],[...parsed[2].entries,...parsed[3].entries]),bindings=paths.map((p,i)=>({path:p,sha256:hash(bytes[i])}));return{entries,bindings,fingerprint:hash(JSON.stringify({entries,bindings}))};}
