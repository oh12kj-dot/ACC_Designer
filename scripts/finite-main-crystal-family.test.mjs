import{test}from'node:test';import assert from'node:assert/strict';import{finiteMainFamilyProof,mainArticle}from'./lib/finite-main-crystal-family.mjs';
test('finite article identity requires exact family evidence and strictly larger bulk count',()=>{
 const n={id:'normal',name:'貴和クリスタル #2100 赤',handle:'crystal',description:'identical full description',imageUrls:['https://example.com/63379907_main.jpg'],variants:[{id:'v1',sku:'63379907'}]},b={id:'bulk',name:'[大袋］貴和クリスタル #2100 赤',handle:'crystal-grs',description:n.description,imageUrls:['https://example.com/63379907_main_43494743-7948-4054-81e0-fc876b1c9cb8.jpg'],variants:[{id:'v2',sku:'633799'}]};
 const o1={draftId:'one',productId:'normal',variantId:'v1',sku:'63379907',options:['SS34','4ヶ'],purchase:{sourceText:'4ヶ'}},o2={draftId:'two',productId:'bulk',variantId:'v2',sku:'633799',options:['SS34','144ヶ'],purchase:{sourceText:'144ヶ'}};
 const g={status:'resolved',canonicalOfferDraftId:'one',members:[o1],cleanup:[]},h={status:'hold',members:[o2],cleanup:[]};
 assert.equal(finiteMainFamilyProof(n,b,g,h).articleCode,'63379907');
 for(const changed of [{...b,description:'different'},{...b,handle:'unrelated'},{...b,imageUrls:['https://example.com/63380002_main.jpg']}])assert.throws(()=>finiteMainFamilyProof(n,changed,g,h));
 assert.throws(()=>finiteMainFamilyProof(n,b,g,{...h,members:[{...o2,options:['SS39','144ヶ']}]}));
 assert.equal(mainArticle('https://example.com/63379907_main_other.jpg'),undefined);
});
