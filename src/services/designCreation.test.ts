import{it,expect,vi}from'vitest';import type{SupabaseClient}from'@supabase/supabase-js';
import{SupabaseDesignRepository,DesignCreationPendingError}from'./designRepository';import{makeNecklaceSetup}from'../domain/editor/necklaceSetup';
const setup=makeNecklaceSetup('45','finished-target');
function record(revision=0,editor_config={}){return{design:{id:'created',name:'My necklace',type:'necklace',revision,canvas_config:{},editor_config,created_at:'2026-10-31',updated_at:'2026-10-31'},nodes:[],paths:[],point_attachments:[],through_attachments:[],path_attachments:[],mirror_links:[]};}
function client(){let data=record(),failSave=false;const rpc=vi.fn(async(name:string)=>{
 if(name==='create_design')return{data:{id:'created'},error:null};if(name==='get_design_aggregate')return{data,error:null};
 if(name==='save_design_aggregate')return failSave?{data:null,error:{code:'NETWORK_ERROR',message:'lost reply'}}:{data:{revision:1,saved_at:'2026-10-31'},error:null};throw Error(name);
 });return{rpc,repository:new SupabaseDesignRepository({rpc}as unknown as SupabaseClient),setData:(value:ReturnType<typeof record>)=>data=value,setFailure:(value:boolean)=>failSave=value};}
it('validates before creation and saves the selected length without a schema change or force overwrite',async()=>{
 const c=client();await expect(c.repository.create({name:' ',type:'necklace',setup})).rejects.toThrow();expect(c.rpc).not.toHaveBeenCalled();
 const a=await c.repository.create({name:' My necklace ',type:'necklace',setup});expect(a.design.editorConfig.necklaceSetupV1).toEqual(setup);expect(a.design.revision).toBe(1);
 expect(c.rpc.mock.calls.map(c=>c[0])).toEqual(['create_design','get_design_aggregate','save_design_aggregate']);
 const args=(c.rpc.mock.calls as unknown as [string,any][])[2][1];expect(args.expected_revision).toBe(0);expect(args.force_overwrite).toBe(false);expect(args.payload.design.editor_config.necklaceSetupV1).toEqual(setup);
});
it('retains a created ID after setup failure and retries that design without a second create',async()=>{
 const c=client();c.setFailure(true);let pending;
 try{await c.repository.create({name:'My necklace',type:'necklace',setup});}catch(error){expect(error).toBeInstanceOf(DesignCreationPendingError);pending=(error as DesignCreationPendingError).pending;}
 expect(pending?.id).toBe('created');c.setFailure(false);await c.repository.resumeCreation(pending!);expect(c.rpc.mock.calls.filter(c=>c[0]==='create_design')).toHaveLength(1);
});
it('reconciles a lost save reply without rewriting and never overwrites a changed design',async()=>{
 const c=client(),pending={id:'created',name:'My necklace',type:'necklace' as const,setup};
 c.setData(record(4,{necklaceSetupV1:setup}));expect((await c.repository.resumeCreation(pending)).design.revision).toBe(4);expect(c.rpc.mock.calls.filter(c=>c[0]==='save_design_aggregate')).toHaveLength(0);
 c.setData(record(1,{necklaceSetupV1:makeNecklaceSetup('50','layout')}));await expect(c.repository.resumeCreation(pending)).rejects.toBeInstanceOf(DesignCreationPendingError);expect(c.rpc.mock.calls.filter(c=>c[0]==='save_design_aggregate')).toHaveLength(0);
});
it('leaves earrings creation unchanged and does not accept necklace settings for earrings',async()=>{
 const c=client();await expect(c.repository.create({name:'earrings',type:'earrings',setup})).rejects.toThrow();expect(c.rpc).not.toHaveBeenCalled();
 const r=record();r.design.type='earrings';c.setData(r);await c.repository.create({name:'earrings',type:'earrings'});expect(c.rpc.mock.calls.map(c=>c[0])).toEqual(['create_design','get_design_aggregate']);
});
it('does not navigate or try a setup save when the creation reply has no ID',async()=>{
 const rpc=vi.fn(async()=>({data:{},error:null})),repository=new SupabaseDesignRepository({rpc}as unknown as SupabaseClient);
 await expect(repository.create({name:'My necklace',type:'necklace',setup})).rejects.toMatchObject({code:'INVALID_RESPONSE'});expect(rpc).toHaveBeenCalledTimes(1);
});
