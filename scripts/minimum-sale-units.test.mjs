import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSaleAmount,compareAmount,obsoleteSaleReason,crystalFamilyPairs,buildMinimumSaleManifest} from './minimum-sale-units.mjs';
import {loadMinimumSalePolicy,saleRegistrationDecision,saleSourceFromRow} from './minimum-sale-unit-guard.mjs';
test('shared worker policy accounts for all official sources and refuses every excluded offer',async()=>{
 const p=await loadMinimumSalePolicy();assert.equal(p.byDraft.size,27046);let obsolete=0,nonminimum=0;
 for(const [id,g] of p.byDraft){const offer=g.members.find(m=>m.draftId===id),d=saleRegistrationDecision(id,p);assert.equal(saleSourceFromRow({source_url:offer.sourceUrl},p),id);if(offer.excludedReason){assert.equal(d.allowed,false);assert.equal(d.reason,'OBSOLETE_SALE_UNIT_REJECTED');obsolete++;}else if(g.status==='resolved'&&id!==g.canonicalOfferDraftId||g.resolvedSubgroups?.some(s=>s.members.includes(id)&&id!==s.canonicalOfferDraftId)){assert.equal(d.allowed,false);nonminimum++;}}
 assert.equal(obsolete,2016);assert.equal(nonminimum,p.manifest.summary.noncanonicalVariants);
});
test('exact weight wins over approximate auxiliary count; aliases retain dimensional meaning',()=>{
 assert.equal(compareAmount(parseSaleAmount('2g（約71ヶ）'),parseSaleAmount('50g（中袋）')),-1);
 assert.equal(compareAmount(parseSaleAmount('1kg'),parseSaleAmount('1000g')),0);
 assert.equal(compareAmount(parseSaleAmount('4ケ'),parseSaleAmount('4個')),0);
 assert.throws(()=>compareAmount(parseSaleAmount('4本'),parseSaleAmount('4個')));
 for(const text of ['約71ヶ','1本 約38cm/約125ヶ(15インチ)','2ヶ(アイボリー)','2個セット','10cm','0g','2ヶ(旧品)'])assert.equal(parseSaleAmount(text).ok,false,text);
});
test('obsolete status is explicit own title/options, never description or a loose old-character match',()=>{
 for(const text of ['終息','旧品','切替待ち','切り替え待ち'])assert.ok(obsoleteSaleReason({name:'丸カン'},{options:['2ヶ('+text+')']}));
 assert.equal(obsoleteSaleReason({name:'古美金',description:'旧品は別売'},{options:['2ヶ']}),null);
});
const product=(id,name,options)=>({id,name,handle:id,description:'body',imageUrls:['https://example.com/12345678.jpg'],variants:options.map((o,i)=>({id:String(i),sku:id+i,options:o}))});
function input(products){return {catalog:{products},registry:{parts:products.flatMap(p=>p.variants.map(v=>({id:`kiwa:${p.id}:${v.id}`,productId:p.id,variantId:v.id,sku:v.sku,sourceUrl:`https://example.com/${p.id}/${v.id}`,purchase:{sourceText:v.options.at(-1)},price:100,currency:'JPY'})))}};}
test('color/size remain exact identity; obsolete minimum excluded without stripping physical options',()=>{
 const {catalog,registry}=input([product('1','丸カン',[['金','3mm','2ヶ(旧品)'],['金','3mm','4ヶ'],['金','3mm','10ヶ'],['銀','3mm','2ヶ'],['金','4mm','2ヶ']])]);
 const m=buildMinimumSaleManifest(catalog,registry,{parts:[]},{});assert.equal(m.summary.sources,5);assert.equal(m.groups.length,3);
 const g=m.groups.find(g=>g.status==='resolved');assert.equal(g.canonicalOfferDraftId,'kiwa:1:1');assert.ok(g.members[0].excludedReason);assert.equal(g.displayName,'丸カン / 金 / 3mm');
});
test('cross-product crystal requires complete title, handle, description and article identity',()=>{
 const a=product('1','貴和クリスタル #1000 クリスタル',[['2ヶ']]);const b={...product('2','[大袋] 貴和クリスタル #1000 クリスタル',[['50ヶ']]),handle:'1-grs'};
 assert.equal(crystalFamilyPairs([a,b]).length,1);
 for(const patch of [{handle:'1-grs-other'},{description:'different'},{imageUrls:['https://example.com/87654321.jpg']},{imageUrls:['https://example.com/12345678_main.jpg']},{imageUrls:['https://example.com/12345678_main_switching.jpg']},{name:'[大袋] 貴和クリスタル #1000 ローズ'}])assert.equal(crystalFamilyPairs([a,{...b,...patch}]).length,0);
});
