import {writeFile,rename} from 'node:fs/promises';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Windows readers may briefly prevent replacement. Never remove the destination.
export async function writeAtomicJson(file,value,io={writeFile,rename,pause}){
 const temporary=file+'.tmp';
 await io.writeFile(temporary,JSON.stringify(value));
 for(let attempt=0;;attempt++){
  try{await io.rename(temporary,file);return;}
  catch(error){if(!['EPERM','EBUSY'].includes(error.code)||attempt>=5)throw error;await io.pause(50*2**attempt);}
 }
}
