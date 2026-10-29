import {it,expect,vi,afterEach} from 'vitest';
import {createLocalWorkspaceClient} from './localWorkspaceClient';
import {SupabasePartRepository} from './partRepository';
import type {SupabaseClient} from '@supabase/supabase-js';
afterEach(()=>vi.unstubAllGlobals());
it('uses bounded read-only local batches instead of one persisted RPC per library part',async()=>{
 const requests:any[]=[];
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init?:RequestInit)=>{
  if(!init?.body)return {ok:true,json:async()=>({owner:'local:fixture',token:'fixture'})};
  const body=JSON.parse(String(init.body));requests.push(body);
  return {json:async()=>({error:null,data:body.ids.map((id:string)=>({part:{id,name:id,is_archived:id==='0'},purchase_spec:{part_id:id,purchase_unit:'piece'},path_spec:null,connection_points:[],through_holes:[]}))})};
 }));
 const result=await new SupabasePartRepository(createLocalWorkspaceClient()).getMany(Array.from({length:257},(_,i)=>String(i)));
 expect(result).toHaveLength(257);expect(result[0].isArchived).toBe(true);
 expect(result[0].purchaseSpec).toMatchObject({partId:'0',purchaseUnit:'piece'});
 expect(requests.map(r=>[r.action,r.ids.length])).toEqual([['read-parts',256],['read-parts',1]]);
});
it('stops issuing additional cloud reads after navigation or account cancellation',async()=>{
 let current=true;const rpc=vi.fn(async(_name:string,{part_id}:{part_id:string})=>{current=false;return {error:null,data:{part:{id:part_id},connection_points:[],through_holes:[]}};});
 await new SupabasePartRepository({rpc} as unknown as SupabaseClient).getMany(Array.from({length:20},(_,i)=>String(i)),()=>current);
 expect(rpc).toHaveBeenCalledTimes(8);
});
