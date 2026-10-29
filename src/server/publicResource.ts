import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

export class ResourceError extends Error {
  constructor(public readonly code:string,public readonly status?:number,public readonly retryAt?:number){super(code);this.name='ResourceError';}
}
export function validateRemoteUrl(value:string,kind:'html'|'image'|'json'|'text'):URL {
  let url:URL;try{url=new URL(value);}catch{throw new ResourceError('INVALID_URL');}
  if(value.length>2048||url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))throw new ResourceError('INVALID_URL');
  const host=url.hostname.toLowerCase();
  if(kind!=='image'&&host!=='kiwaseisakujo.jp'&&!host.endsWith('.kiwaseisakujo.jp'))throw new ResourceError('DOMAIN_NOT_ALLOWED');
  if(isIP(host.replace(/^\[|\]$/g,''))||host==='localhost'||host.endsWith('.localhost'))throw new ResourceError('HOST_NOT_ALLOWED');
  url.hash='';return url;
}
export function publicAddress(address:string):boolean {
  try{const parsed=ipaddr.process(address);if(parsed.range()!=='unicast')return false;
    // Do not accept IPv6 outside global unicast, including future/reserved space.
    if(parsed.kind()==='ipv6')return parsed.match(ipaddr.parse('2000::'),3);
    return true;
  }catch{return false;}
}
export async function resolvePublicHost(hostname:string):Promise<{address:string;family:4|6}> {
  const addresses=await lookup(hostname,{all:true,verbatim:true});
  if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new ResourceError('PRIVATE_ADDRESS');
  const selected=addresses.find(a=>a.family===4)??addresses[0];return{address:selected.address,family:selected.family as 4|6};
}

interface Resource {url:string;body:Buffer;contentType:string}
interface ResponseBody {status:number;location?:string;body:Buffer;contentType:string}
export async function downloadResource(value:string,kind:'html'|'image'|'json'|'text'):Promise<Resource> {
  const deadline=Date.now()+10000;const limit=kind==='image'?20*1024*1024:kind==='json'?10*1024*1024:5*1024*1024;
  let url=validateRemoteUrl(value,kind);
  for(let redirects=0;redirects<=3;redirects++){
    const remaining=deadline-Date.now();if(remaining<=0)throw new ResourceError('TIMEOUT');
    let timer:ReturnType<typeof setTimeout>|undefined;
    let activeRequest:ReturnType<typeof request>|undefined;
    try{
      // A total deadline includes DNS, TLS and streamed response. No proxy or unvalidated re-resolution.
      const hop=async():Promise<ResponseBody>=>{
        const address=await resolvePublicHost(url.hostname);
        if(Date.now()>=deadline)throw new ResourceError('TIMEOUT');
        return new Promise((resolve,reject)=>{
          const req=request(url,{agent:false,family:address.family,lookup:(_host,_options,callback)=>callback(null,address.address,address.family),headers:{Accept:kind==='html'?'text/html':kind==='json'?'application/json':kind==='text'?'text/plain':'image/png,image/jpeg,image/webp','Accept-Encoding':'identity','User-Agent':'AccessoryDesigner/0.1 (user-requested import)'}},response=>{
            const status=response.statusCode??0,contentType=(response.headers['content-type']??'').split(';')[0].trim().toLowerCase();
            if([301,302,303,307,308].includes(status)){response.destroy();resolve({status,location:response.headers.location,body:Buffer.alloc(0),contentType});return;}
            if(status<200||status>=300){response.destroy();reject(new ResourceError('HTTP_ERROR',status,retryDeadline(response.headers['retry-after'])));return;}
            if((kind==='html'&&!['text/html','application/xhtml+xml'].includes(contentType))||(kind==='json'&&!['application/json'].includes(contentType))||(kind==='text'&&!['text/plain','text/markdown'].includes(contentType))||(kind==='image'&&!['image/png','image/jpeg','image/webp'].includes(contentType))){response.destroy();reject(new ResourceError('CONTENT_TYPE'));return;}
            if(response.headers['content-encoding']&&response.headers['content-encoding']!=='identity'){response.destroy();reject(new ResourceError('CONTENT_ENCODING'));return;}
            if(Number(response.headers['content-length']??0)>limit){response.destroy();reject(new ResourceError('TOO_LARGE'));return;}
            const chunks:Buffer[]=[];let size=0;
            response.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>limit){req.destroy(new ResourceError('TOO_LARGE'));return;}chunks.push(chunk);});
            response.on('error',reject);response.on('end',()=>resolve({status,body:Buffer.concat(chunks),contentType}));
          });
          activeRequest=req;req.on('error',reject);req.setTimeout(Math.max(1,deadline-Date.now()),()=>req.destroy(new ResourceError('TIMEOUT')));
          timer=setTimeout(()=>req.destroy(new ResourceError('TIMEOUT')),Math.max(1,deadline-Date.now()));req.end();
        });
      };
      let totalTimer:ReturnType<typeof setTimeout>|undefined;
      const response=await Promise.race([hop(),new Promise<never>((_resolve,reject)=>{totalTimer=setTimeout(()=>{activeRequest?.destroy(new ResourceError('TIMEOUT'));reject(new ResourceError('TIMEOUT'));},remaining);})]).finally(()=>{if(totalTimer)clearTimeout(totalTimer);});
      if(response.location){if(redirects===3)throw new ResourceError('TOO_MANY_REDIRECTS');url=validateRemoteUrl(new URL(response.location,url).href,kind);continue;}
      if([301,302,303,307,308].includes(response.status))throw new ResourceError('INVALID_REDIRECT');
      return{url:url.href,body:response.body,contentType:response.contentType};
    }finally{if(timer)clearTimeout(timer);}
  }
  throw new ResourceError('TOO_MANY_REDIRECTS');
}

export function retryDeadline(value:string|string[]|undefined,now=Date.now()):number|undefined{if(Array.isArray(value))value=value[0];if(!value)return;const time=/^\d+$/.test(value)?now+Number(value)*1000:Date.parse(value);return Number.isFinite(time)&&time>=now?time:undefined;}
