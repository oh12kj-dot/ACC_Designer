import{randomUUID}from'node:crypto';
export async function registrationApi(){
 const endpoint='http://127.0.0.1:3000/api/local/workspace',boot=await fetch(endpoint).then(r=>r.json());
 if(!boot.workspaceId||!boot.token)throw Error('LOCAL_API_BOOT_FAILED');
 const call=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json','x-catalog-token':boot.token},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||j.error)throw Error(j.error?.message??JSON.stringify(j));return j.data;};
 const rpc=(name,args,key=randomUUID())=>call({action:'rpc',name,args,key}),select=table=>call({action:'select',query:{table,columns:'*'}});
 const tables=['parts','part_image_assets','part_purchase_specs','part_path_specs','part_connection_points','part_through_holes','part_source_snapshots','part_user_state','designs'];
 const snapshot=async()=>{const s={workspaceId:boot.workspaceId,tables:{},designs:{}};for(const t of tables)s.tables[t]=await select(t);for(const d of s.tables.designs)s.designs[d.id]=await rpc('get_design_aggregate',{design_id:d.id});return s;};
 return{endpoint,boot,call,rpc,select,snapshot};
}
