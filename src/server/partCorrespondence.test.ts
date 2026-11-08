import {beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const mocks=vi.hoisted(()=>({read:vi.fn(),select:vi.fn(),groups:new Map()}));
vi.mock('node:fs/promises',()=>({readFile:mocks.read}));
vi.mock('./localWorkspace',()=>({workspace:async()=>({owner:'owner',select:mocks.select})}));
vi.mock('./minimumSaleUnits',()=>({salePolicy:async()=>({groups:mocks.groups}),availableSalePolicy:async()=>({groups:mocks.groups})}));
import {correspondences} from './partCorrespondence';
const legacy={min:1.7,max:1.8,approximate:true};
const tableRange={min:1.7,max:1.9,approximate:true};
beforeEach(()=>{
 mocks.groups.clear();
 const bytes=Buffer.from('{}'),hash=createHash('sha256').update(bytes).digest('hex');
 mocks.read.mockImplementation(async(path:string)=>{
  const p=path.replaceAll('\\','/');
  if(p.endsWith('/parts/parts.json'))return bytes;
  if(p.endsWith('/mapping/index.json'))return JSON.stringify({summary:{registrySha256:hash},entries:[{id:'draft',productId:'1',dimensionEvidence:{diameterRangeMm:legacy},galleryImages:[]}]});
  if(p.endsWith('/nominal/promotions.json'))return JSON.stringify({workspaceId:'owner',registrySha256:hash,promoted:[{draftId:'draft',partId:'part',assetId:'asset'}]});
  throw Object.assign(new Error('missing'),{code:'ENOENT'});
 });
 mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'draft',nominalPlacement:{diameterRangeMm:tableRange,imageScaleVerified:false}}}]:[{id:'asset',thumbnail_path:'thumb'}]);
});
it('shows the actual nominal interval even when older mapping has a narrower range',async()=>{
 const c=(await correspondences(['draft'])).entries.get('draft');
 expect(c?.diameterRangeMm).toEqual(tableRange);expect(c?.placementMode).toBe('published-nominal');expect(c?.connectionReady).toBe(false);
});
it('preserves the existing diagram interval for parts without nominal range metadata',async()=>{
 mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'draft'}}]:[{id:'asset',thumbnail_path:'thumb'}]);
 expect((await correspondences(['draft'])).entries.get('draft')?.diameterRangeMm).toEqual(legacy);
});
it('uses the saved sibling source interval for a resolved sale group',async()=>{
 mocks.groups.set('draft',{status:'resolved',members:[{draftId:'draft'},{draftId:'sibling'}]});
 mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'sibling',nominalPlacement:{diameterRangeMm:tableRange,imageScaleVerified:false}}}]:[{id:'asset',thumbnail_path:'thumb'}]);
 const c=(await correspondences(['draft'])).entries.get('draft');
 expect(c?.partId).toBe('part');expect(c?.diameterRangeMm).toEqual(tableRange);expect(c?.connectionReady).toBe(false);
});

it('separates provisional placeholders and reference-only sources from reviewed geometry',async()=>{
 const old=mocks.read.getMockImplementation()!;
 mocks.read.mockImplementation(async(path:string)=>path.replaceAll('\\','/').endsWith('/provisional/promotions.json')?JSON.stringify({workspaceId:'owner',registrySha256:createHash('sha256').update(Buffer.from('{}')).digest('hex'),promoted:[{draftId:'draft',partId:'part',assetId:'asset'}],pendingReferences:[]}):old(path));
 mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'draft',provisionalRegistration:{status:'needs_review'}}}]:[{id:'asset',thumbnail_path:'thumb'}]);
 const result=await correspondences(['draft']),c=result.entries.get('draft');expect(c).toMatchObject({placementMode:'provisional-placeholder',placementMapped:true,dimensionReviewed:false,connectionReady:false,partId:'part'});expect(c?.diameterRangeMm).toBeUndefined();expect(c?.appearanceNote).toContain('実寸ではありません');expect(result.summary?.registeredProvisionalParts).toBe(1);
 mocks.read.mockImplementation(async(path:string)=>path.replaceAll('\\','/').endsWith('/provisional/promotions.json')?JSON.stringify({workspaceId:'owner',registrySha256:createHash('sha256').update(Buffer.from('{}')).digest('hex'),promoted:[],pendingReferences:[{draftId:'draft'}]}):old(path));
 mocks.select.mockImplementation(async()=>[]);const reference=(await correspondences(['draft'])).entries.get('draft');expect(reference).toMatchObject({provisionalReferenceOnly:true,placementMapped:false});expect(reference?.partId).toBeUndefined();
});
it('rejects provisional manifests from another workspace',async()=>{const old=mocks.read.getMockImplementation()!;mocks.read.mockImplementation(async(path:string)=>path.replaceAll('\\','/').endsWith('/provisional/promotions.json')?JSON.stringify({workspaceId:'foreign',registrySha256:'wrong',promoted:[],pendingReferences:[]}):old(path));await expect(correspondences(['draft'])).rejects.toThrow('PROVISIONAL_MAPPING_STALE');});

it('labels an own-product photo reference separately from both the common placeholder and reviewed nominal images',async()=>{mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'draft',provisionalRegistration:{status:'needs_review',photoReference:{recipe:'own-product-photo-reference-v1'}}}}]:[{id:'asset',thumbnail_path:'thumb'}]);const c=(await correspondences(['draft'])).entries.get('draft');expect(c).toMatchObject({placementMode:'own-product-photo-reference',dimensionReviewed:false,connectionReady:false});expect(c?.appearanceNote).toContain('商品ごとの掲載写真');expect(c?.appearanceNote).toContain('単体の切抜き');expect(c?.appearanceNote).not.toContain('共通の仮表示');});

it('maps a resolved sale sibling to the canonical provisional photo without claiming reviewed geometry',async()=>{
 const old=mocks.read.getMockImplementation()!;
 mocks.groups.set('draft',{status:'resolved',canonicalOfferDraftId:'sibling',members:[{draftId:'draft'},{draftId:'sibling'}]});
 mocks.read.mockImplementation(async(path:string)=>path.replaceAll('\\','/').endsWith('/provisional/promotions.json')?JSON.stringify({workspaceId:'owner',registrySha256:createHash('sha256').update(Buffer.from('{}')).digest('hex'),promoted:[{draftId:'sibling',partId:'part',assetId:'asset'}],pendingReferences:[{draftId:'draft'}]}):old(path));
 mocks.select.mockImplementation(async({table}:{table:string})=>table==='parts'?[{id:'part',image_asset_id:'asset',metadata:{sourceDraftId:'sibling',provisionalRegistration:{status:'needs_review',photoReference:{recipe:'own-product-photo-reference-v1'}}}}]:[{id:'asset',thumbnail_path:'thumb'}]);
 const c=(await correspondences(['draft'])).entries.get('draft');
 expect(c).toMatchObject({partId:'part',placementMapped:true,placementMode:'own-product-photo-reference',reviewStatus:'provisional-needs-review',dimensionReviewed:false,connectionReady:false});
 expect(c?.provisionalReferenceOnly).not.toBe(true);expect(c?.appearanceNote).toContain('単体の切抜き');
});
