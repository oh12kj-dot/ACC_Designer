/** Retry the same protected request only for a bounded transient deadline failure. */
export async function retryOfficialTimeout<T>(operation:()=>Promise<T>,options:{wait?:(ms:number)=>Promise<void>;onRetry?:(attempt:number,delayMs:number)=>Promise<void>}={}){
 for(let attempt=1;attempt<=3;attempt++){
  try{return await operation();}catch(error){if((error as {code?:string})?.code!=='TIMEOUT'||attempt===3)throw error;const delayMs=attempt===1?5000:15000;await options.onRetry?.(attempt,delayMs);await (options.wait??(ms=>new Promise<void>(resolve=>setTimeout(resolve,ms))))(delayMs);}
 }
 throw new Error('RETRY_EXHAUSTED');
}
