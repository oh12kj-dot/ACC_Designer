import { describe,expect,it,vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AssetService,type PreparedImages } from './assetService';

const images:PreparedImages={original:new Blob(['original'],{type:'image/png'}),high:new Blob(['high'],{type:'image/png'}),medium:new Blob(['medium'],{type:'image/png'}),thumbnail:new Blob(['thumb'],{type:'image/png'}),width:20,height:40,mmPerPx:0.1,transform:{crop:{x:0}}};
function fixture(saveFails=false,committed=false){
  const upload=vi.fn().mockResolvedValue({error:null});const remove=vi.fn().mockResolvedValue({error:null});const createSignedUrl=vi.fn().mockResolvedValue({data:{signedUrl:'signed'},error:null});
  const rpc=vi.fn(async(name:string)=>{
    if(name==='reserve_asset_upload')return{data:{id:'asset',paths:['o','h','m','t']},error:null};
    if(name==='save_part_successor')return saveFails?{data:null,error:{message:'connection lost'}}:{data:{part_id:'part',created_successor:false},error:null};
    if(name==='claim_asset_cleanup')return{data:committed?[]:['o','h','m','t'],error:null};
    return{data:null,error:null};
  });
  const client={rpc,storage:{from:()=>({upload,remove,createSignedUrl})}} as unknown as SupabaseClient;
  return{client,rpc,upload,remove,createSignedUrl};
}
describe('Asset upload orchestration',()=>{
  it('uploads four immutable paths and commits Asset with Part in one RPC',async()=>{
    const f=fixture();await new AssetService(f.client).savePart(images,{part:{name:'test'}});
    expect(f.upload).toHaveBeenCalledTimes(4);expect(f.upload.mock.calls.every(call=>call[2].upsert===false)).toBe(true);
    const commit=f.rpc.mock.calls.find(call=>call[0]==='save_part_successor')!;
    // RPC mock signature widened only for inspection of the real call payload.
    const payload=(commit as unknown as [string,{payload:{image_asset:{content_hash:string;id:string};part:{image_asset_id:string}}}])[1].payload;
    expect(payload.image_asset.content_hash).toMatch(/^[a-f0-9]{64}$/);expect(payload.part.image_asset_id).toBe(payload.image_asset.id);
    expect(f.remove).not.toHaveBeenCalled();
  });
  it('cleans pending uploads after failed Part commit',async()=>{
    const f=fixture(true);await expect(new AssetService(f.client).savePart(images,{part:{name:'test'}})).rejects.toThrow('connection lost');
    expect(f.remove).toHaveBeenCalledWith(['o','h','m','t']);expect(f.rpc.mock.calls.map(call=>call[0])).toContain('finish_asset_cleanup');
  });
  it('never deletes a committed upload after a lost save response',async()=>{
    const f=fixture(true,true);await expect(new AssetService(f.client).savePart(images,{part:{name:'test'}})).rejects.toThrow();expect(f.remove).not.toHaveBeenCalled();
  });
  it('uploads and commits two image sets atomically for textured Path and cleans both on failure',async()=>{
    const f=fixture(true);let reservation=0;f.rpc.mockImplementation(async(name:string)=>{if(name==='reserve_asset_upload'){reservation++;return{data:{id:`asset-${reservation}`,paths:['o','h','m','t'].map(p=>`${p}${reservation}`)},error:null};}if(name==='save_part_successor')return{data:null,error:{message:'connection lost'}};if(name==='claim_asset_cleanup')return{data:['o','h','m','t'],error:null};return{data:null,error:null};});
    await expect(new AssetService(f.client).savePart(images,{part:{name:'texture'},pathSpec:{renderMode:'stroke_texture',nominalDiameterMm:1,opacity:1,textureOverlapMm:0,startMaxConnections:0,endMaxConnections:0}},null,images)).rejects.toThrow('connection lost');expect(f.upload).toHaveBeenCalledTimes(8);expect(f.remove).toHaveBeenCalledTimes(2);
    const call=f.rpc.mock.calls.find(c=>c[0]==='save_part_successor') as unknown as [string,{payload:{segment_asset:{id:string;asset_kind:string};path_spec:{segment_asset_id:string}}}];expect(call[1].payload.segment_asset.asset_kind).toBe('path_segment');expect(call[1].payload.path_spec.segment_asset_id).toBe(call[1].payload.segment_asset.id);
  });
  it('caches signed URL until before expiration',async()=>{
    const f=fixture();const service=new AssetService(f.client);await service.signedUrl('path');await service.signedUrl('path');
    expect(f.createSignedUrl).toHaveBeenCalledTimes(1);expect(f.createSignedUrl).toHaveBeenCalledWith('path',3600);
  });
});
