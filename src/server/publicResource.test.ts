import { EventEmitter } from 'node:events';
import { beforeEach,describe,expect,it,vi } from 'vitest';
const f=vi.hoisted(()=>({lookup:vi.fn(),request:vi.fn()}));
vi.mock('node:dns/promises',()=>({lookup:f.lookup}));vi.mock('node:https',()=>({request:f.request}));
import { downloadResource } from './publicResource';

function response(status:number,headers:Record<string,string>,chunks:Buffer[]=[]){
  f.request.mockImplementationOnce((_url,options,callback)=>{
    const req=new EventEmitter() as EventEmitter&{end:()=>void;setTimeout:()=>void;destroy:(error?:Error)=>void};
    req.setTimeout=()=>{};req.destroy=(error)=>{if(error)req.emit('error',error);};
    req.end=()=>{queueMicrotask(()=>{const res=new EventEmitter() as EventEmitter&{statusCode:number;headers:Record<string,string>;destroy:()=>void};res.statusCode=status;res.headers=headers;res.destroy=()=>{};callback(res);chunks.forEach(chunk=>res.emit('data',chunk));res.emit('end');});};
    return req;
  });
}
beforeEach(()=>{vi.clearAllMocks();f.lookup.mockResolvedValue([{address:'8.8.8.8',family:4}]);});
describe('validated and pinned download',()=>{
  it('destroys a continuously open request at the total deadline',async()=>{
    vi.useFakeTimers();
    const req=new EventEmitter() as EventEmitter&{end:()=>void;setTimeout:()=>void;destroy:ReturnType<typeof vi.fn>};
    req.end=()=>{};req.setTimeout=()=>{};req.destroy=vi.fn((error?:Error)=>{if(error)req.emit('error',error);});f.request.mockReturnValueOnce(req);
    try{const pending=expect(downloadResource('https://kiwaseisakujo.jp/x','html')).rejects.toThrow('TIMEOUT');await vi.advanceTimersByTimeAsync(10001);await pending;expect(req.destroy).toHaveBeenCalled();}finally{vi.useRealTimers();}
  });
  it('pins DNS selection in the actual request options',async()=>{
    response(200,{'content-type':'text/html'},[Buffer.from('ok')]);const result=await downloadResource('https://kiwaseisakujo.jp/x','html');expect(result.body.toString()).toBe('ok');
    const options=f.request.mock.calls[0][1];const callback=vi.fn();options.lookup('ignored',{all:false},callback);expect(callback).toHaveBeenCalledWith(null,'8.8.8.8',4);expect(options.agent).toBe(false);expect(options.family).toBe(4);
  });
  it('rejects mixed public/private DNS before HTTPS',async()=>{
    f.lookup.mockResolvedValue([{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]);await expect(downloadResource('https://kiwaseisakujo.jp/x','html')).rejects.toThrow('PRIVATE_ADDRESS');expect(f.request).not.toHaveBeenCalled();
  });
  it('revalidates redirect host before following it',async()=>{
    response(302,{location:'https://evil.test/secret'});await expect(downloadResource('https://kiwaseisakujo.jp/x','html')).rejects.toThrow('DOMAIN_NOT_ALLOWED');expect(f.request).toHaveBeenCalledTimes(1);
  });
  it('rechecks DNS on image redirect',async()=>{
    f.lookup.mockResolvedValueOnce([{address:'8.8.8.8',family:4}]).mockResolvedValueOnce([{address:'10.0.0.1',family:4}]);response(302,{location:'https://other.example.com/x'});await expect(downloadResource('https://image.example.com/x','image')).rejects.toThrow('PRIVATE_ADDRESS');expect(f.request).toHaveBeenCalledTimes(1);
  });
  it('rejects advertised and streamed oversize and inappropriate MIME',async()=>{
    response(200,{'content-type':'text/html','content-length':'6000000'});await expect(downloadResource('https://kiwaseisakujo.jp/x','html')).rejects.toThrow('TOO_LARGE');
    response(200,{'content-type':'text/html'},[Buffer.alloc(5*1024*1024+1)]);await expect(downloadResource('https://kiwaseisakujo.jp/x','html')).rejects.toThrow('TOO_LARGE');
    response(200,{'content-type':'text/html'});await expect(downloadResource('https://images.example.com/x','image')).rejects.toThrow('CONTENT_TYPE');
  });
});
