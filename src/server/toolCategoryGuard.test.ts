import {it,expect} from 'vitest';
import {assertSaleSave} from './minimumSaleUnits';

it('keeps an existing category review usable when only JSON key order changes',async()=>{
 const review={recipe:'supplier-tool-category-review-v1',reason:'storage',version:1},old={id:'p',category:'other',metadata:{supplierCategoryReview:review}},queries:string[]=[];
 const tx={exec:async()=>{},query:async(sql:string)=>{queries.push(sql);return{rows:sql.includes('select to_jsonb')?[{data:old}]:[{referenced:true}]};}};
 await expect(assertSaleSave(tx,{part_id:'p',payload:{part:{notes:'ordinary edit',metadata:{supplierCategoryReview:{version:1,reason:'storage',recipe:review.recipe}}}}},{groups:new Map()} as any)).resolves.toBeUndefined();
 expect(queries.some(sql=>sql.includes('design_nodes'))).toBe(false);
});

it('rejects new review metadata on a referenced Part and admits the same correction when unused',async()=>{
 const old={id:'p',category:'bead',metadata:{}},args={part_id:'p',payload:{part:{category:'other',metadata:{supplierCategoryReview:{recipe:'supplier-tool-category-review-v1'}}}}};
 let referenced=true;const tx={exec:async()=>{},query:async(sql:string)=>({rows:sql.includes('select to_jsonb')?[{data:old}]:referenced?[{reference:true}]:[]})};
 await expect(assertSaleSave(tx,args,{groups:new Map()} as any)).rejects.toThrow('CATEGORY_CORRECTION_REFERENCED_PART');referenced=false;
 await expect(assertSaleSave(tx,args,{groups:new Map()} as any)).resolves.toBeUndefined();
 expect(old).toEqual({id:'p',category:'bead',metadata:{}});
});
