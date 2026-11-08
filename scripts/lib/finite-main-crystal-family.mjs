import assert from'node:assert/strict';import{sha256,stable,parseSaleAmount,compareAmount}from'../minimum-sale-units.mjs';
export function mainArticle(url){const name=new URL(url).pathname.split('/').at(-1);return /^(\d{8})_main(?:_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.(?:jpg|jpeg|png|webp)$/i.exec(name)?.[1];}
export function finiteMainFamilyProof(normal,bulk,normalGroup,bulkGroup){
 assert.equal(bulk.name.normalize('NFKC').replace(/^\[大袋\]\s*/,''),normal.name.normalize('NFKC'));
 assert.equal(bulk.handle,normal.handle+'-grs');assert.equal(bulk.description,normal.description);
 const article=mainArticle(normal.imageUrls[0]);assert.ok(article);assert.equal(mainArticle(bulk.imageUrls[0]),article);
 assert.equal(bulkGroup.members.length,1);assert.equal(bulkGroup.status,'hold');assert.equal(normalGroup.status,'resolved');
 assert.equal(bulkGroup.cleanup.length,0);assert.equal(normalGroup.cleanup.length,0);
 const offer=bulkGroup.members[0],canonical=normalGroup.members.find(o=>o.draftId===normalGroup.canonicalOfferDraftId);assert.ok(canonical);assert.ok(!offer.excludedReason);
 const a=parseSaleAmount(canonical.purchase.sourceText,{relocated:true}),b=parseSaleAmount(offer.purchase.sourceText);
 assert.ok(a.ok&&b.ok&&a.unit==='piece'&&b.unit==='piece');assert.ok(compareAmount(a,b)<0);
 const withoutPurchase=o=>o.options.filter(x=>x!==o.purchase.sourceText);assert.deepEqual(withoutPurchase(canonical),withoutPurchase(offer));
 assert.equal(canonical.productId,normal.id);assert.equal(offer.productId,bulk.id);assert.equal(normal.variants.find(v=>v.id===canonical.variantId)?.sku,canonical.sku);assert.equal(bulk.variants.find(v=>v.id===offer.variantId)?.sku,offer.sku);
 assert.equal(canonical.sku.slice(0,6),offer.sku);assert.equal(canonical.sku,article);
 return{kind:'finite-fourteen-main-crystal-family-v1',normalProductId:normal.id,bulkProductId:bulk.id,normalProductSha256:sha256(JSON.stringify(normal)),bulkProductSha256:sha256(JSON.stringify(bulk)),descriptionSha256:sha256(normal.description),articleCode:article,normalPhotoUrl:normal.imageUrls[0],bulkPhotoUrl:bulk.imageUrls[0],normalGroupSha256:sha256(stable(normalGroup)),bulkGroupSha256:sha256(stable(bulkGroup)),canonicalOfferDraftId:canonical.draftId,appendedSourceId:offer.draftId};
}
