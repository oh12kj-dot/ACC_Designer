import { readFile, writeFile } from 'node:fs/promises';
import { sha256 } from './minimum-sale-units.mjs';

// Published sale units only. Never infer item counts from mass or strands.
const dir = '.local/setup/all-parts-review-20261106';
const snapshot = JSON.parse(await readFile(dir + '/current-snapshot.json'));
const registryBytes = await readFile('.local/parts/parts.json');
const drafts = new Map(JSON.parse(registryBytes).parts.map(d => [d.id, d]));
const specs = new Map(snapshot.tables.part_purchase_specs.map(s => [s.part_id, s]));
const rows = [];
for (const part of snapshot.tables.parts.filter(p => !p.is_archived)) {
  const d = drafts.get(part.metadata?.sourceDraftId), s = specs.get(part.id);
  const issues = [], supported = [], pending = [];
  if (!d) throw Error('MISSING_SOURCE:' + part.id);
  const text = d.purchase?.sourceText ?? '';
  if (s) {
    if (s.unit_price !== d.price || s.currency !== d.currency) issues.push('NATIVE_PRICE_OR_CURRENCY_VERSUS_RETAINED_SOURCE');
    else supported.push('PUBLISHED_OFFER_PRICE_AND_CURRENCY');
    const count = text.match(/^(\d+)(?:ヶ|個|コ|本|ペア|セット)((?:(?:\(大袋\)|\(中袋\)|_移動|【取寄商品】|\(ネット発売無し\)|\(発売なし\)|\(RC\)|\(2色 各2ヶ）)|\s)*)$/u);
    const length = text.match(/^(?:1[ヶ本]\()?([\d.]+)(cm|m)\)?$/u);
    if (s.sale_mode === 'pack' && count && !d.purchase.approximate) {
      if (s.pack_quantity !== Number(count[1])) issues.push('NATIVE_PACK_QUANTITY_VERSUS_EXACT_PUBLISHED_COUNT');
      else supported.push('EXACT_PUBLISHED_PACK_COUNT');
    } else if (s.sale_mode === 'piece' && count && Number(count[1]) === 1 && !d.purchase.approximate) {
      supported.push('EXACT_ONE_PUBLISHED_SALE_ITEM');
    } else if (s.sale_mode === 'length' && length && !d.purchase.approximate) {
      const mm = Number(length[1]) * (length[2] === 'm' ? 1000 : 10);
      if (s.sale_length_mm !== mm) issues.push('NATIVE_SALE_LENGTH_VERSUS_EXACT_PUBLISHED_LENGTH');
      else supported.push('EXACT_PUBLISHED_SALE_LENGTH');
    } else if (s.sale_mode === 'length' && d.purchase?.unit === 'length' && !d.purchase.approximate && d.purchase.lengthMm === s.sale_length_mm) {
      supported.push('EXACT_PUBLISHED_SALE_LENGTH_WITH_ADDITIONAL_LITERAL');
    } else pending.push('NATIVE_SALE_MODE_REQUIRES_PRODUCT_SPECIFIC_SEMANTIC_REVIEW');
    if (s.minimum_units !== 1) pending.push('MINIMUM_PURCHASE_MULTIPLIER_REQUIRES_SEPARATE_EVIDENCE');
    if (s.weight_basis !== null || s.weight_basis_length_mm !== null) pending.push('WEIGHT_BASIS_REQUIRES_SEPARATE_EVIDENCE');
    if (/ネット発売無し|発売なし|_移動/u.test(text)) pending.push('PUBLISHED_AVAILABILITY_QUALIFIER_REQUIRES_CURRENT_SUPPLIER_CHECK');
    if (/2色 各2ヶ/u.test(text)) pending.push('TWO_COLOUR_ASSORTMENT_NOT_SINGLE_COLOUR_FULFILMENT');
  } else pending.push('NO_NATIVE_PURCHASE_CONVERSION');
  if (/2色各5個ずつ入っています/u.test(d.description ?? '')) pending.push('TWO_COLOUR_ASSORTMENT_NOT_SINGLE_COLOUR_FULFILMENT');
  if (part.metadata?.wirePathReview) pending.push('SCHEMATIC_PATH_HAS_NO_VERIFIED_PURCHASE_LENGTH');
  rows.push({ partId: part.id, sourceDraftId: d.id, sourceObjectSha256: sha256(JSON.stringify(d)), publishedText: text, publishedPrice: d.price,
    nativeSpecId: s?.id ?? null, supported, pending, issues, physicalQuantityVerified: false, consumptionVerified: false });
}
const summary = { at: new Date().toISOString(), activeParts: rows.length, nativeSpecs: rows.filter(r => r.nativeSpecId).length,
  nativePublishedTermsMatched: rows.filter(r => r.nativeSpecId && r.pending.length === 0 && r.issues.length === 0).length,
  productSpecificReviewRequired: rows.filter(r => r.nativeSpecId && r.pending.length > 0).length,
  conflictingParts: rows.filter(r => r.issues.length > 0).length, registrySha256: sha256(registryBytes), domainWrites: 0,
  physicalQuantityVerifications: 0, consumptionVerifications: 0 };
await writeFile(dir + '/purchase-semantics-review.json', JSON.stringify({ summary, rows }));
console.log(JSON.stringify(summary));
console.log(JSON.stringify(rows.filter(r => r.issues.length || r.nativeSpecId && r.pending.length).slice(0, 12)));
