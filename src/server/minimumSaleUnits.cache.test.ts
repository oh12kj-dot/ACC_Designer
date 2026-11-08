import {beforeEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const mock=vi.hoisted(()=>({stamp:1,invalid:false,reads:0}));
vi.mock('node:fs/promises',()=>({
 stat:async()=>({mtimeMs:mock.stamp,size:100}),
 readFile:async(path:string)=>{
  if(path.endsWith('kiwa-minimum-sale-units.json')){mock.reads++;return Buffer.from(JSON.stringify({version:2,registrySha256:mock.invalid?'invalid':createHash('sha256').update('{"parts":[]}').digest('hex'),catalogSha256:createHash('sha256').update('{}').digest('hex'),summary:{sources:0},groups:[],revision:mock.stamp}));}
  return Buffer.from(path.replaceAll('\\','/').endsWith('/parts/parts.json')?'{"parts":[]}':'{}');
 }
}));
vi.mock('./holeReferences',()=>({reviewedHoleIndex:()=>new Map()}));
beforeEach(()=>{vi.resetModules();mock.stamp=1;mock.invalid=false;mock.reads=0;});
it('reloads an atomically replaced sale policy while reusing unchanged policy reads',async()=>{
 const {salePolicy}=await import('./minimumSaleUnits');const old=await salePolicy();
 expect(await salePolicy()).toBe(old);expect(mock.reads).toBe(1);
 mock.stamp=2;const current=await salePolicy();expect(current.sha256).not.toBe(old.sha256);expect(mock.reads).toBe(2);
});
it('rejects invalid replacement instead of serving stale adopted policy',async()=>{
 const {salePolicy}=await import('./minimumSaleUnits');await salePolicy();
 mock.stamp=2;mock.invalid=true;await expect(salePolicy()).rejects.toThrow('SALE_POLICY_SOURCE_CHANGED');
 mock.invalid=false;expect((await salePolicy()).manifest.version).toBe(2);
});
