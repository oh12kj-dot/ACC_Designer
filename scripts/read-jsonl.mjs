import {createReadStream} from 'node:fs';
import {open} from 'node:fs/promises';
import {createInterface} from 'node:readline';
export async function* readJsonLines(path){
 const handle=await open(path,'r');try{const {size}=await handle.stat();if(size){const last=Buffer.alloc(1);await handle.read(last,0,1,size-1);if(last[0]!==10)throw new Error('OCR_JOURNAL_INCOMPLETE');}}finally{await handle.close();}
 const stream=createReadStream(path,{encoding:'utf8'});const lines=createInterface({input:stream,crlfDelay:Infinity});try{for await(const line of lines){if(line)yield JSON.parse(line);}}finally{lines.close();stream.destroy();}
}
