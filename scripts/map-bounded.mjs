/** Read-only jobs with bounded concurrency and stable result ordering. */
export async function mapBounded(items, concurrency, job) {
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>16)throw new Error('INVALID_CONCURRENCY');
 const results=new Array(items.length);let cursor=0,failure;
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(!failure){const index=cursor++;if(index>=items.length)return;
   try{results[index]=await job(items[index],index);}catch(error){failure??={error};}
  }
 }));
 if(failure)throw failure.error;
 return results;
}
