import {test}from'node:test';import assert from'node:assert/strict';
import{exactSaleLength,resolvePendingLengthGroups,exactFunctionalSet,resolvePendingFunctionalSets,nominalChainSaleClass,resolvePendingNominalChains,finiteMiscSaleAmount}from'./lib/pending-sale-length-resolution.mjs';
import{sha256}from'./minimum-sale-units.mjs';
test('exact length includes proven full single-package contents but not approximate or revision labels',()=>{
 assert.deepEqual(['1m','50cm','10cm'].map(x=>exactSaleLength(x).numerator),['1000','500','100']);
 assert.equal(exactSaleLength('1ヶ(50m)').wrappedSinglePackage,true);
 assert.equal(exactSaleLength('50m(リール巻)【取寄商品】').numerator,'50000');
 for(const s of ['約10cm','約10cm(7コマ)','10cm(9コマ)','1ヶ(10g)','2セット','0m','1m(old)','1m(大袋)_移動','2ヶ(50m)','50m(リール巻)未知'])assert.equal(exactSaleLength(s),null);
});
function fixture(){
 const variants=['1m','50cm'].map((text,i)=>({id:String(i+1),sku:'SKU'+i,options:['red',text]}));
 const product={id:'1',name:'コード',description:'コードを切って使用します。',variants};
 const parts=variants.map(v=>({id:'kiwa:1:'+v.id,productId:'1',variantId:v.id,sku:v.sku,sourceUrl:'https://example.com/'+v.id,purchase:{sourceText:v.options[1]},name:'code'}));
 const members=parts.map((d,i)=>({...d,draftId:d.id,options:variants[i].options,available:true}));
 return{policy:{summary:{noncanonicalVariants:0},groups:[{id:'group',status:'hold',holdReason:'QUANTITY_TEXT_NOT_EXCLUSIVELY_RECOGNIZED_PACK',members,cleanup:[]},{id:'untouched',status:'hold',members:[],cleanup:[]}]},registry:{parts},catalog:{products:[product]},pending:parts.map(d=>({draftId:d.id,sourceObjectSha256:sha256(JSON.stringify(d)),draft:d}))};
}
test('finite resolver preserves unrelated groups and rejects changed physical options and source hashes',()=>{
 const f=fixture();const r=resolvePendingLengthGroups(f.policy,f.registry,f.catalog,f.pending);assert.equal(r.resolved.length,1);assert.equal(r.resolved[0].canonicalOfferDraftId,'kiwa:1:2');assert.deepEqual(r.policy.groups[1],f.policy.groups[1]);assert.equal(f.policy.groups[0].status,'hold');
 assert.equal(resolvePendingLengthGroups(f.policy,f.registry,f.catalog,f.pending,new Set(['kiwa:1:1'])).resolved.length,0);
 const changed=fixture();changed.pending[0].sourceObjectSha256='changed';assert.throws(()=>resolvePendingLengthGroups(changed.policy,changed.registry,changed.catalog,changed.pending));
 const mixed=fixture();mixed.catalog.products[0].variants[1].options=['blue','50cm'];mixed.policy.groups[0].members[1].options=['blue','50cm'];assert.throws(()=>resolvePendingLengthGroups(mixed.policy,mixed.registry,mixed.catalog,mixed.pending));
});
test('functional sets require proven repeated clasp semantics and retain set quantity, never component count',()=>{
 const f=fixture();f.catalog.products[0].name='マンテル';f.catalog.products[0].description='アクセサリーの留め金具です。輪にバーを通して使用します。';
 for(const[i,d]of f.registry.parts.entries()){const text=i?'20セット(中袋）':'2セット';d.purchase.sourceText=text;f.catalog.products[0].variants[i].options[1]=text;f.policy.groups[0].members[i].purchase={...d.purchase};f.policy.groups[0].members[i].options=[...f.catalog.products[0].variants[i].options];f.pending[i]={draftId:d.id,sourceObjectSha256:sha256(JSON.stringify(d)),draft:d};}
 const r=resolvePendingFunctionalSets(f.policy,f.registry,f.catalog,f.pending);assert.equal(r.resolved.length,1);assert.equal(r.resolved[0].resolution.unitScope,'repeated-functional-set-not-individual-component');
 f.catalog.products[0].description='セット販売の商品です。';assert.equal(resolvePendingFunctionalSets(f.policy,f.registry,f.catalog,f.pending).resolved.length,0);
 for(const x of ['約2セット','2セット(old)','2セット(約4ヶ)','2ペア'])assert.equal(exactFunctionalSet(x),null);
});
test('nominal chain classes rank only the two published sale classes with explicit product proof',()=>{
 assert.equal(nominalChainSaleClass('約10cm(約7コマ)').auxiliaryPublishedAnnotation,'約7コマ');
 assert.equal(nominalChainSaleClass('約10cm').approximate,true);
 for(const text of ['10cm','約20cm','約1m','約10cm(old)','約10cm(7ヶ)','約10cm(0コマ)'])assert.equal(nominalChainSaleClass(text),null);
 const f=fixture();f.catalog.products[0].name='チェーン K-test';f.catalog.products[0].description='こちらの商品は量り売りです。';
 for(const[i,d]of f.registry.parts.entries()){const text=i?'約10cm(7コマ)':'1m';d.purchase.sourceText=text;f.catalog.products[0].variants[i].options[1]=text;f.policy.groups[0].members[i].purchase={...d.purchase};f.policy.groups[0].members[i].options=[...f.catalog.products[0].variants[i].options];f.pending[i]={draftId:d.id,sourceObjectSha256:sha256(JSON.stringify(d)),draft:d};}
 const r=resolvePendingNominalChains(f.policy,f.registry,f.catalog,f.pending);assert.equal(r.resolved.length,1);assert.equal(r.resolved[0].canonicalOfferDraftId,'kiwa:1:2');assert.equal(r.resolved[0].resolution.offers[1].amount.guaranteedPhysicalLengthComparison,false);
 f.catalog.products[0].description='写真をご覧ください。';assert.equal(resolvePendingNominalChains(f.policy,f.registry,f.catalog,f.pending).resolved.length,0);
});
test('misc rules are product-bound and preserve contents versus auxiliary count semantics',()=>{
 const seeds={id:'8710175752484',name:'ファルファーレ',description:'',tags:['チェコシードファルファーレ']};const a=finiteMiscSaleAmount('100g/約3300ヶ(大袋)',seeds);assert.equal(a.unit,'weight');assert.equal(a.numerator,'100');assert.equal(a.auxiliaryEstimatedCount,'3300');
 assert.equal(finiteMiscSaleAmount('100g/約3300ヶ(大袋)',{...seeds,id:'other'}),null);
 const resin={id:'8715172413732',name:'UV-LEDレジン',description:'透明樹脂液',variants:[]};assert.equal(finiteMiscSaleAmount('1ヶ(100g)',resin).unit,'weight');assert.equal(finiteMiscSaleAmount('2ヶ(100g)',resin),null);
 const crystal={id:'crystal',name:'貴和クリスタル #2100',description:'',variants:[{options:['144ヶ(大袋)_移動【取寄商品】']}]};assert.equal(finiteMiscSaleAmount('144ヶ(大袋)_移動【取寄商品】',crystal).numerator,'144');assert.equal(finiteMiscSaleAmount('4ヶ(old)',crystal),null);
 const cap={id:'8712218771748',name:'ドーム型キャップ',description:'10mm、12mm用は入り数が4ヶから2ヶに変更になりました。'};assert.equal(finiteMiscSaleAmount('4ヶ(old)',cap).numerator,'4');assert.equal(finiteMiscSaleAmount('4ヶ(old)',{...cap,description:'仕様変更'}),null);
});
