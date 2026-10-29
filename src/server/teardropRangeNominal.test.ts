import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import {nominalTeardropRange,teardropManifestHash,type TeardropCandidate,type TeardropReview} from './teardropRangeNominal';
import {nominalLayoutNotice} from '../domain/nominalNotice';
import type {RegisteredPartDraft} from '../types/registeredPart';
const manifest=JSON.parse(readFileSync('.local/calibration/nominal/teardrop-range-candidate-manifest.json','utf8'));
const candidate=manifest.candidates[0] as TeardropCandidate,draft=candidate.original;
const photo=manifest.candidates[0].ownGalleryCaptures[0];
const review:TeardropReview={draftId:draft.id,family:draft.name.split(' / ')[0],url:photo.url,sha256:photo.sourceBytesSha256,sourceWidth:450,sourceHeight:450,crop:{left:230,top:0,width:220,height:450},reviewed:true,bodyReviewed:true,processedReviewed:false,reviewedBy:'unit fixture only',reviewedAt:'2026-10-16',photoPose:'complete right front',coordinateConvention:'unrotated-decoded-raster-integer-pixels',rotationDegrees:0,rotationReason:'keep original front upright'};
const wanted=new Set(manifest.candidates.map((c:typeof manifest.candidates[0])=>c.ownGalleryCaptures[0].url));
const records=new Map();
for(const line of readFileSync('.local/calibration/gallery/records.jsonl','utf8').split('\n')){if(!line.trim())continue;const r=JSON.parse(line);if(wanted.has(r.url))records.set(r.url,r);}
const capture=records.get(review.url);
const select=(d=draft,c=candidate,r=review,p=capture,h=teardropManifestHash)=>nominalTeardropRange(d,c,r,p,h);
describe('finite teardrop BODY ranges',()=>{
 it('binds inventory bytes',()=>expect(createHash('sha256').update(readFileSync('.local/calibration/nominal/teardrop-range-candidate-manifest.json')).digest('hex')).toBe(teardropManifestHash));
 it('preserves all120 identities and rejects mixed assortments',()=>{for(const c of manifest.candidates){const d=c.original as RegisteredPartDraft,p=c.ownGalleryCaptures[0],r={...review,draftId:d.id,url:p.url,sha256:p.sourceBytesSha256},s=select(d,c,r,records.get(r.url));if(/ランダム|配分|種類入っています/.test(d.description)){expect(s).toBeUndefined();continue;}const mini=d.sizeText.startsWith('ミニ');expect(s).toMatchObject({category:'bead',widthMm:mini?7:9.5,heightMm:mini?6.5:10.5,publishedSizeLabel:d.sizeText,publishedWidthWasScalar:mini,connectionReady:false,physicalWidthVerified:false});expect(s).not.toHaveProperty('diameterMm');}});
 it.each(['id','productId','variantId','sku','name','category','sourceUrl','description','tags','imageUrls','sizeText'] as const)('rejects changed own %s',key=>{const d=structuredClone(draft);Object.assign(d,{[key]:Array.isArray(d[key])?['changed']:'changed'});expect(select(d)).toBeUndefined();});
 it('rejects forged candidates outside the finite set',()=>{const d={...draft,id:'kiwa:1:2'};const c={...candidate,sourceDraftId:d.id,original:d,originalObjectSha256:createHash('sha256').update(JSON.stringify(d)).digest('hex')};expect(select(d,c,{...review,draftId:d.id})).toBeUndefined();});
 it('rejects unrelated source and unreviewed or invalid crop',()=>{expect(select(draft,candidate,review,{...capture,productIds:['other']})).toBeUndefined();expect(select(draft,candidate,{...review,sha256:'0'.repeat(64)})).toBeUndefined();expect(select(draft,candidate,{...review,reviewed:false})).toBeUndefined();expect(select(draft,candidate,{...review,bodyReviewed:false})).toBeUndefined();expect(select(draft,candidate,{...review,crop:{left:440,top:0,width:20,height:450}})).toBeUndefined();expect(select(draft,candidate,review,capture,'changed')).toBeUndefined();expect(select(draft,candidate,{...review,sha256:'0'.repeat(64)},{...capture,sha256:'0'.repeat(64)})).toBeUndefined();expect(select(draft,candidate,review,{...capture,newField:'changed record'})).toBeUndefined();});
 it('shows actual ranges and layout choices without a square-body notice',()=>{const s=select()!;expect(nominalLayoutNotice({nominalPlacement:s})).toContain('H8〜13mm、W8〜11mm');expect(nominalLayoutNotice({nominalPlacement:s})).toContain('幅9.5mm・高さ10.5mm');expect(nominalLayoutNotice({nominalPlacement:s})).toContain('未確認');});
});
