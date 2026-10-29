import { randomBytes,timingSafeEqual } from 'node:crypto';
const runtime=globalThis as typeof globalThis&{catalogToken?:string};
export function catalogToken(){return runtime.catalogToken??(runtime.catalogToken=randomBytes(32).toString('hex'));}
export function assertLocalCatalog(request:Request,mutation=false){
 const url=new URL(request.url);const authority=request.headers.get('host')??url.host;const served=new URL(`${url.protocol}//${authority}`),host=served.hostname.replace(/^\[|\]$/g,'');if(!['localhost','127.0.0.1','::1'].includes(host))throw new Error('LOCAL_ONLY');
 const origin=request.headers.get('origin');if(origin&&origin!==served.origin)throw new Error('ORIGIN_REJECTED');
 if(mutation&&(!origin||!validToken(request.headers.get('x-catalog-token'))))throw new Error('ORIGIN_REQUIRED');
 if(request.headers.get('sec-fetch-site')==='cross-site')throw new Error('ORIGIN_REJECTED');
}

function validToken(value:string|null){const expected=catalogToken();return !!value&&value.length===expected.length&&timingSafeEqual(Buffer.from(value),Buffer.from(expected));}
