import assert from 'node:assert/strict';
import {publishedCategory} from '../../src/domain/part/publishedSpecs.ts';
import {sha256} from '../minimum-sale-units.mjs';

export const toolCategoryRecipe='supplier-tool-category-review-v1';
const roles=new Map([
 ['g-tools-adhesives-cases-cases-001','中が見えるのでパーツや作品の収納に最適です。'],
 ['g-tools-adhesives-cases-cases-002','中が見えるのでパーツや作品の収納に最適です。'],
 ['g-tools-adhesives-cases-cases-003','中が見えるのでパーツや作品の収納に最適です。'],
 ['g-tools-adhesives-cases-cases-011','ビーズワークなどの作業に便利なマットです。'],
 ['g-tools-adhesives-cases-cases-012','パーツが転がったり無くなったりすることを防ぐことができます。'],
 ['g-tools-adhesives-cases-cases-018','丸カン・Cカンの収納におすすめのパーツケースです。'],
 ['g-tools-adhesives-cases-cases-020','Tピン、9ピンの収納におすすめのパーツケースです。'],
 ['g-tools-adhesives-cases-giftwrapping-018','ギフト用のボックスです。'],
 ['g-tools-adhesives-cases-giftwrapping-019','ギフト用のボックスです。'],
]);
export function toolCategoryPayload(d,a,current,receipt,at){
 assert.equal(publishedCategory(d.name,d.sourceUrl).category,'other');
 const url=new URL(d.sourceUrl),phrase=roles.get(url.pathname.slice('/products/'.length));assert.ok(phrase,'FINITE_TOOL_ROLE_REQUIRED');
 assert.equal(a.part.metadata.sourceDraftId,d.id);assert.equal(a.part.sku,d.sku);assert.ok(['bead','eye_pin','jump_ring','pearl'].includes(a.part.category));assert.ok(!a.part.metadata.supplierCategoryReview);
 assert.equal(String(current.id),d.productId);const variant=current.variants.find(v=>String(v.id)===d.variantId);assert.ok(variant,'CURRENT_VARIANT_REQUIRED');assert.equal(variant.sku,d.sku,'CURRENT_SKU_CONFLICT');assert.equal(variant.option1,d.sizeText,'CURRENT_SIZE_CONFLICT');
 assert.ok(d.description.includes(phrase)&&current.visibleText.includes(phrase),'TOOL_ROLE_BODY_CONFLICT');
 const review={version:1,recipe:toolCategoryRecipe,sourceDraftId:d.id,sourceObjectSha256:sha256(JSON.stringify(d)),productId:d.productId,variantId:d.variantId,sku:d.sku,sourceUrl:d.sourceUrl,originalImportedCategory:d.category,originalCategoryBasis:d.categoryBasis,previousDomainCategory:a.part.category,correctedCategory:'other',supplierTaxonomy:'tools-storage-packaging',roleEvidenceQuote:phrase,evidenceReferences:[receipt],physicalFactsGenerated:false,placementEligibilityChanged:false,reviewedAt:at};
 return{part:{category:'other',metadata:{...a.part.metadata,supplierCategoryReview:review}},source_snapshots:[{source_url:d.sourceUrl,fetched_at:receipt.fetchedAt,parser_version:toolCategoryRecipe,raw_fields:{supplierCategoryReview:review},status:'partial'}]};
}
export function assertToolTargetsUnreferenced(designs,ids){
 const targets=new Set(ids);function visit(value){if(!value||typeof value!=='object')return;for(const[key,child]of Object.entries(value)){if(['part_id','partId'].includes(key))assert.ok(!targets.has(child),'CATEGORY_CORRECTION_REFERENCED_PART');else visit(child);}}visit(designs);
}
