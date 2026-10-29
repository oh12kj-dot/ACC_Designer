/** Local RPC implementation; intentionally does not change the portable schema hash. */
export async function deleteOwnedDesign(tx:{query:Function;exec:Function},owner:string,id:unknown,revision:unknown){
 if(typeof id!=='string'||!Number.isSafeInteger(revision)||Number(revision)<0)throw Error('INVALID_REVISION');
 await tx.exec('reset role');
 const row=(await tx.query('select revision from public.designs where id=$1 and user_id=$2 for update',[id,owner])).rows[0];
 if(!row)throw Error('DESIGN_NOT_FOUND');
 if(Number(row.revision)!==revision)throw Error('REVISION_CONFLICT');
 const result=await tx.query('delete from public.designs where id=$1 and user_id=$2 returning id',[id,owner]);
 if(result.rows.length!==1)throw Error('DESIGN_NOT_FOUND');
 return true;
}
