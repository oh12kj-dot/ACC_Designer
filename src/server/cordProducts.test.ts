import {it,expect,vi} from 'vitest';
const source=vi.hoisted(()=>({changed:false}));
vi.mock('node:fs/promises',async importOriginal=>{const actual=await importOriginal<typeof import('node:fs/promises')>();return {...actual,readFile:async(...args:any[])=>{const result=await (actual.readFile as (...a:any[])=>Promise<any>)(...args);return source.changed&&String(args[0]).replaceAll('\\','/').endsWith('.local/parts/parts.json')?Buffer.concat([result,Buffer.from(' ')]):result;}};});
import {cordDiameter,cordProducts,assertCordSave,cordQuotes} from './cordProducts';
it('reads only policy eligible reviewed material variants, with packaging duplicates held',async()=>{
 const products=await cordProducts();expect(products.length).toBeGreaterThan(10);
 expect(products.find(p=>p.sourceDraftId==='kiwa:8714834608420:46995916063012')?.diameterMm).toBe(.23);
 expect(products.some(p=>p.sourceDraftId==='kiwa:8714833494308:46995915342116')).toBe(false);
 expect(products.some(p=>p.title.includes('ジョイント'))).toBe(false);
 expect(products.find(p=>p.title.includes('オペロン'))?.diameterMm).toBeNull();
});
it('never converts gauges, widths, ranges or multi dimensional sizes into diameter',()=>{
 expect(cordDiameter('2号(0.23mm)')).toBe(.23);expect(cordDiameter('0.29mm/3号強')).toBe(.29);
 for(const s of ['2号','約0.3～0.5ｍｍ','幅2mm','2×3mm','0mm','約0.5mm'])expect(cordDiameter(s)).toBeNull();
});
it('rejects client source and diameter tampering, invalid lengths and changed stale snapshots',async()=>{
 const product=(await cordProducts())[0],spec={...product,version:1,usedLengthMm:450};
 const tx={exec:vi.fn(),query:vi.fn(async()=>({rows:[{editor_config:{unrelated:'keep'}}]}))};
 const args=(s:unknown)=>({design_id:'d',payload:{design:{editor_config:{cordSpecification:s}}}});
 await expect(assertCordSave(tx,args(spec))).resolves.toBeUndefined();
 for(const patch of [{diameterMm:99},{sourceUrl:'https://example.com'},{sourceSha256:'stale'},{usedLengthMm:0},{usedLengthMm:-1},{usedLengthMm:Infinity},{usedLengthMm:'400'}])await expect(assertCordSave(tx,args({...spec,...patch}))).rejects.toThrow();
 tx.query.mockResolvedValue({rows:[{editor_config:{cordSpecification:{...spec,sourceSha256:'stale'}}}]} as any);
 await expect(assertCordSave(tx,args({...spec,sourceSha256:'stale'}))).resolves.toBeUndefined();
 await expect(assertCordSave(tx,args({...spec,sourceSha256:'stale',usedLengthMm:500}))).rejects.toThrow();
 await expect(assertCordSave(tx,args(undefined))).resolves.toBeUndefined();
});

it('fails closed when registry bytes change while the policy remains cached',async()=>{
 await cordProducts();source.changed=true;
 try{await expect(cordProducts()).rejects.toThrow('商品情報が更新');}finally{source.changed=false;}
});

it('projects a source bound package length and price for the actual minimum sale offer',async()=>{
 const products=await cordProducts(),q=(await cordQuotes(products)).find(q=>q.sourceDraftId==='kiwa:8714834608420:46995916063012');expect(q).toMatchObject({saleLengthMm:20000,price:528,currency:'JPY'});expect(q?.sourceSha256).toBe(products.find(p=>p.sourceDraftId===q?.sourceDraftId)?.sourceSha256);
});
