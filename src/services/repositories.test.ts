import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignAggregate } from '../types/aggregate';
import { fromRow, safeRevision, toRow } from './databaseMapping';
import { SupabaseDesignRepository } from './designRepository';
import { SupabasePartRepository } from './partRepository';

function fakeClient(response: unknown = {data:{revision:2,saved_at:'2026-10-05T03:00:00Z'},error:null}) {
  const rpc=vi.fn().mockResolvedValue(response);
  return {rpc,client:{rpc} as unknown as SupabaseClient};
}
const aggregate: DesignAggregate = {
  design:{id:'design',name:'test',type:'necklace',canvasConfig:{custom_key:true},editorConfig:{},revision:1,createdAt:'created',updatedAt:'updated'},
  nodes:[],paths:[],pointAttachments:[],throughAttachments:[],pathAttachments:[],mirrorLinks:[],
};

describe('RPC Repository contract', () => {
  it('saves all snapshot sections with one RPC and never automatically overwrites', async () => {
    const {rpc,client}=fakeClient();
    expect(await new SupabaseDesignRepository(client).save(aggregate,1)).toEqual({revision:2,savedAt:'2026-10-05T03:00:00Z'});
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name,args]=rpc.mock.calls[0];
    expect(name).toBe('save_design_aggregate');
    expect(args.force_overwrite).toBe(false);
    expect(args.payload).toMatchObject({design:{canvas_config:{custom_key:true}},nodes:[],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]});
  });
  it('reports conflict without retry or mutation of local data', async () => {
    const {rpc,client}=fakeClient({data:null,error:{code:'40001',message:'REVISION_CONFLICT'}});
    await expect(new SupabaseDesignRepository(client).save(aggregate,1)).rejects.toMatchObject({code:'40001',message:'REVISION_CONFLICT'});
    expect(rpc).toHaveBeenCalledTimes(1); expect(aggregate.design.revision).toBe(1);
  });
  it('preserves omitted specs and explicit null removal in Part updates', async () => {
    const {rpc,client}=fakeClient({data:{part_id:'next',created_successor:true},error:null});
    await new SupabasePartRepository(client).save('old',{part:{name:'new'},purchaseSpec:null});
    expect(rpc.mock.calls[0]).toEqual(['save_part_successor',{part_id:'old',payload:{part:{name:'new'},purchase_spec:null}}]);
  });
  it('maps row names without rewriting nested user JSON or missing price semantics', () => {
    expect(toRow({flip180:true,sourceTransform:{customKey:1},unitPrice:undefined})).toEqual({flip_180:true,source_transform:{customKey:1}});
    expect(fromRow({flip_180:true,unit_price:null,raw_fields:{source_label:'x'}})).toEqual({flip180:true,unitPrice:undefined,rawFields:{source_label:'x'}});
  });
  it.each([NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1,'9007199254740993'])('rejects unsafe revisions %s', revision=>expect(()=>safeRevision(revision)).toThrow());
  it('maps paths into domain coordinates and supplies attachment discriminants', async () => {
    const {client}=fakeClient({data:{design:toRow(aggregate.design),nodes:[],paths:[{id:'path',part_id:'part',physical_length_mm:10,shape:'straight',start_x_mm:0,start_y_mm:0,end_x_mm:10,end_y_mm:0,z_index:0,locked:false}],point_attachments:[],through_attachments:[{flip_180:true}],path_attachments:[],mirror_links:[]},error:null});
    const loaded=await new SupabaseDesignRepository(client).get('design');
    expect(loaded.paths[0].start).toEqual({x:0,y:0});
    expect(loaded.paths[0].end).toEqual({x:10,y:0});
    expect(loaded.throughAttachments[0]).toMatchObject({kind:'through',flip180:true});
  });
});

it('renames only the design name via the complete snapshot and expected revision',async()=>{
 const {client}=fakeClient(),repo=new SupabaseDesignRepository(client);vi.spyOn(repo,'get').mockResolvedValue(aggregate);const save=vi.spyOn(repo,'save').mockResolvedValue({revision:2,savedAt:'now'});
 expect(await repo.rename('design','  新しい名前  ',1)).toMatchObject({name:'新しい名前',revision:2});expect(save).toHaveBeenCalledWith({...aggregate,design:{...aggregate.design,name:'新しい名前'}},1);expect(aggregate.design.name).toBe('test');
 save.mockClear();await expect(repo.rename('design','更新',0)).rejects.toThrow('REVISION_CONFLICT');expect(save).not.toHaveBeenCalled();await expect(repo.rename('design','  ',1)).rejects.toThrow('名前');
});
it('validates delete revisions and only accepts confirmed RPC success',async()=>{const {rpc,client}=fakeClient({data:true,error:null});await new SupabaseDesignRepository(client).remove('d',3);expect(rpc).toHaveBeenCalledWith('delete_design',{design_id:'d',expected_revision:3});rpc.mockResolvedValue({data:null,error:null});await expect(new SupabaseDesignRepository(client).remove('d',3)).rejects.toThrow('削除');});
