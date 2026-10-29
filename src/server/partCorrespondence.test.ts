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
